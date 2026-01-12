import React, { useState, useEffect } from 'react';
import { useStore } from '../store/StoreContext';
import { Role, HospitalResource } from '../types';
import { PlusIcon, TrashIcon, EditIcon, CalendarIcon, UserIcon, StethoscopeIcon, SparklesIcon, CheckIcon, SettingsIcon, SearchIcon, DownloadIcon, XIcon, BedIcon, ActivityIcon } from '../components/Icons';
import { generateDoctorBio } from '../services/geminiService';
import { supabase } from '../lib/supabaseClient';

const AdminDashboard: React.FC = () => {
  const {
    doctors, addDoctor, updateDoctor, deleteDoctor,
    appointments, allUsers, approveAppointment, cancelAppointment, deleteAppointment,
    currentUser, deleteUser,
    resourceRequests, markResourceAsPaid, cancelResourceRequest,
    hospitalResources, addHospitalResource, updateHospitalResource, deleteHospitalResource
  } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'doctors' | 'patients' | 'bookings' | 'resources' | 'profile'>('overview');

  // 🔥 Supabase realtime sync — auto refresh UI when DB changes
  useEffect(() => {
    const channel = supabase.channel('public-table-changes');

    const subscribeTable = (tableName: string) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => {
          console.log(`${tableName} changed — refreshing UI`);
          window.location.reload();
        }
      );
    };

    subscribeTable('profiles');
    subscribeTable('appointments');
    subscribeTable('resources');

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Search States
  const [doctorSearch, setDoctorSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  // --- Doctor Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('');
  const [newDocBio, setNewDocBio] = useState('');
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [originalDocName, setOriginalDocName] = useState<string | null>(null);


  // --- Resource Modal State ---
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [editingResId, setEditingResId] = useState<string | null>(null);
  const [newResName, setNewResName] = useState('');
  const [newResType, setNewResType] = useState('Bed');
  const [newResPrice, setNewResPrice] = useState(0);
  const [newResStock, setNewResStock] = useState(0);

  // Doctor Handlers
  const handleGenerateBio = async () => {
    if (!newDocName || !newDocSpecialty) return;
    setIsGeneratingBio(true);
    const bio = await generateDoctorBio(newDocName, newDocSpecialty);
    setNewDocBio(bio);
    setIsGeneratingBio(false);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDocName || !newDocSpecialty) {
      alert('Please provide name and specialty.');
      return;
    }

    const id = editingDocId ?? crypto.randomUUID?.() ?? ('doc_' + Math.random().toString(36).slice(2, 10));

    const doctorPayload = {
      id,
      name: newDocName,
      specialty: newDocSpecialty,
      bio: newDocBio || '',
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(newDocName)}&background=random`,
      experience: 5,
      availableDays: ['Mon', 'Wed', 'Fri'],
      timeSlots: ['09:00', '10:00', '11:00']
    };

    try {
      if (editingDocId) {
        try {
          console.log('Attempting to update doctor. id:', id, 'payloadName:', doctorPayload.name, 'originalName:', originalDocName);

          // 1) Try to find the row by id first
          const { data: foundById, error: findByIdErr } = await supabase
            .from('doctors')
            .select('id')
            .eq('id', id)
            .maybeSingle();

          if (findByIdErr) {
            console.warn('Error while searching doctor by id:', findByIdErr);
          }

          let targetId: any = foundById?.id ?? null;

          // 2) If not found by id, try fallback by original name (only if we have it)
          if (!targetId && originalDocName) {
            console.warn('No doctor found by id. Trying fallback lookup by original name:', originalDocName);
            const { data: foundByName, error: findByNameErr } = await supabase
              .from('doctors')
              .select('id,name')
              .eq('name', originalDocName)
              .maybeSingle();

            if (findByNameErr) {
              console.warn('Error while searching doctor by name:', findByNameErr);
            }

            if (foundByName && foundByName.id) {
              targetId = foundByName.id;
              console.warn('Fallback found doctor row with id:', targetId);
            }
          }

          if (!targetId) {
            console.error('No matching doctor row found in DB for id or name. Aborting update.', { id, originalDocName });
            alert('Could not find the doctor row in database. Check console for details.');
            return;
          }

          // 3) Perform update by confirmed targetId and request returned row
          const { data: updatedRows, error: updateError } = await supabase
            .from('doctors')
            .update({
              name: doctorPayload.name,
              specialty: doctorPayload.specialty,
              bio: doctorPayload.bio,
              image: doctorPayload.image,
              experience: doctorPayload.experience,
              available_days: doctorPayload.availableDays,
              time_slots: doctorPayload.timeSlots
            })
            .eq('id', targetId)
            .select();

          if (updateError) {
            console.error('Supabase update doctor error:', updateError);
            alert('Failed to update doctor in database: ' + updateError.message);
            return;
          }

          if (!updatedRows || (Array.isArray(updatedRows) && updatedRows.length === 0)) {
            console.warn('Update returned no rows even after targeting id. Check permissions/returning settings.', { targetId, updatedRows });
            alert('Update completed but DB returned no rows. See console for details.');
            return;
          }

          const updated = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows;

          // 4) Update local store with canonical DB values
          updateDoctor({
            id: updated.id,
            name: updated.name,
            specialty: updated.specialty,
            bio: updated.bio,
            image: updated.image,
            experience: updated.experience,
            availableDays: updated.available_days || doctorPayload.availableDays,
            timeSlots: updated.time_slots || doctorPayload.timeSlots
          });

          alert(`Doctor "${updated.name}" updated successfully.`);
        } catch (err) {
          console.error('Unexpected error updating doctor:', err);
          alert('Something went wrong while updating doctor. See console.');
        }
      }
      else {
        const { error: insertError } = await supabase
          .from('doctors')
          .insert([{
            id: doctorPayload.id,
            name: doctorPayload.name,
            specialty: doctorPayload.specialty,
            bio: doctorPayload.bio,
            image: doctorPayload.image,
            experience: doctorPayload.experience,
            available_days: doctorPayload.availableDays,
            time_slots: doctorPayload.timeSlots
          }]);

        if (insertError) {
          console.error('Supabase insert doctor error:', insertError);
          alert('Failed to save new doctor in database: ' + insertError.message);
          return;
        }

        addDoctor({
          id: doctorPayload.id,
          name: doctorPayload.name,
          specialty: doctorPayload.specialty,
          bio: doctorPayload.bio,
          image: doctorPayload.image,
          experience: doctorPayload.experience,
          availableDays: doctorPayload.availableDays,
          timeSlots: doctorPayload.timeSlots
        });
      }

      closeDoctorModal();
    } catch (err) {
      console.error('Unexpected error saving doctor:', err);
      alert('Something went wrong while saving doctor. Check console.');
    }
  };




  const handleEditClick = (doc: any) => {
    setEditingDocId(doc.id);
    setOriginalDocName(doc.name);    // <- NEW: keep original name
    setNewDocName(doc.name);
    setNewDocSpecialty(doc.specialty);
    setNewDocBio(doc.bio);
    setIsModalOpen(true);
  };


  const closeDoctorModal = () => {
    setIsModalOpen(false);
    setEditingDocId(null);
    setNewDocName('');
    setNewDocSpecialty('');
    setNewDocBio('');
  };

  // Resource Handlers
  const handleEditResourceClick = (res: HospitalResource) => {
    setEditingResId(res.id);
    setNewResName(res.name);
    setNewResType(res.type);
    setNewResPrice(res.price);
    setNewResStock(res.totalStock);
    setIsResourceModalOpen(true);
  };

  const handleDeleteResource = (id: string, name: string) => {
    // Removed setTimeout to ensure the confirm dialog is part of the user interaction stack
    if (window.confirm(`Are you sure you want to remove "${name}" from the inventory?`)) {
      deleteHospitalResource(id);
    }
  };

  const handleSaveResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingResId) {
      updateHospitalResource({
        id: editingResId,
        name: newResName,
        type: newResType,
        price: Number(newResPrice),
        totalStock: Number(newResStock)
      });
    } else {
      addHospitalResource({
        name: newResName,
        type: newResType,
        price: Number(newResPrice),
        totalStock: Number(newResStock)
      });
    }
    closeResourceModal();
  };

  const closeResourceModal = () => {
    setIsResourceModalOpen(false);
    setEditingResId(null);
    setNewResName('');
    setNewResType('Bed');
    setNewResPrice(0);
    setNewResStock(0);
  };

  const handleDeletePatient = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete patient "${name}"? This action cannot be undone.`)) {
      return;
    }

    // find this user in local store to get their email
    const user = allUsers.find(u => u.id === id);
    if (!user || !user.email) {
      alert('Could not find this patient\'s email in local records.');
      return;
    }

    try {
      // delete from Supabase by email (not id)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('email', user.email);

      if (error) {
        console.error('Supabase delete patient error:', error);
        alert('Failed to delete patient from database: ' + error.message);
        return;
      }

      // if DB delete succeeded, remove from local store
      deleteUser(id);
    } catch (err) {
      console.error(err);
      alert('Something went wrong while deleting patient from database.');
    }
  };


  const handleDeleteDoctor = async (id: string, name: string) => {
  if (!window.confirm(`Are you sure you want to delete doctor "${name}"? This action cannot be undone.`)) {
    return;
  }

  try {
    console.log('Attempting to delete doctor. id:', id, 'name:', name);

    // 1) Try delete by ID first
    let { count, error: deleteByIdError } = await (async () => {
      const res = await supabase
        .from('doctors')
        .delete()
        .eq('id', id)
        .select(); // returns deleted rows if successful
      return { count: Array.isArray(res.data) ? res.data.length : (res.data ? 1 : 0), error: res.error, data: res.data };
    })();

    if (deleteByIdError) {
      console.warn('Delete by id returned error:', deleteByIdError);
    }

    // If deleted by id (one or more rows returned), update local store and finish
    if (!deleteByIdError && count > 0) {
      deleteDoctor(id);
      alert(`Doctor "${name}" deleted from database and UI.`);
      return;
    }

    // 2) Fallback: try delete by name (useful if id mismatch)
    const { data: deleteByNameData, error: deleteByNameError } = await supabase
      .from('doctors')
      .delete()
      .eq('name', name)
      .select();

    if (deleteByNameError) {
      console.warn('Delete by name returned error:', deleteByNameError);
    }

    if (!deleteByNameError && Array.isArray(deleteByNameData) && deleteByNameData.length > 0) {
      // If we deleted rows by name, remove the local item(s). We prefer to remove by id if id exists.
      deleteDoctor(id);
      alert(`Doctor "${name}" deleted from database (matched by name) and removed from UI.`);
      return;
    }

    // 3) If we reach here, DB deletion didn't remove any rows (either not present or blocked)
    //    - Remove from local store anyway so UI no longer shows the doctor.
    console.warn('Doctor not found in DB by id or name. Removing only from local store.', { id, name, deleteByIdError, deleteByNameError });
    deleteDoctor(id);
    alert(`Doctor "${name}" was not found in database, but has been removed from the UI/local store.`);

  } catch (err) {
    console.error('Unexpected error while deleting doctor:', err);
    // In case of unexpected crash, still attempt to remove from local store to keep UI clean
    try {
      deleteDoctor(id);
      alert(`An error occurred while attempting DB deletion. Doctor removed from UI/local store. See console for details.`);
    } catch (e) {
      console.error('Also failed to remove from local store:', e);
      alert('Failed to delete doctor. See console for details.');
    }
  }
};



  const handleDownloadCSV = () => {
    const patients = allUsers.filter(u => u.role === Role.PATIENT);
    const headers = ['Name', 'Email', 'Phone', 'Address'];
    const csvContent = [
      headers.join(','),
      ...patients.map(p => {
        const escape = (str: string | undefined) => `"${(str || '').replace(/"/g, '""')}"`;
        return [escape(p.name), escape(p.email), escape(p.phone), escape(p.address)].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'MediCore_Patients_List.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderOverview = () => {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Patients</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-1">{allUsers.filter(u => u.role === Role.PATIENT).length}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><UserIcon /></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Active Doctors</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-1">{doctors.length}</h3>
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-green-600"><StethoscopeIcon /></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Bookings</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-1">{appointments.length}</h3>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600"><CalendarIcon /></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Health */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 overflow-hidden relative">
            <div className="flex justify-between items-center mb-8 relative z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Live Hospital Activity</h3>
                <p className="text-sm text-gray-500">Real-time system monitoring</p>
              </div>
              <span className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100 animate-pulse">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                SYSTEM ACTIVE
              </span>
            </div>
            <div className="relative z-10">
              <div className="group bg-gray-900 p-8 rounded-xl shadow-inner relative overflow-hidden flex flex-col justify-center min-h-[160px]">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
                </div>
                <div className="flex items-end h-24 w-full relative">
                  <svg className="w-full h-full" viewBox="0 0 300 50" preserveAspectRatio="none">
                    <path d="M0,25 L20,25 L25,10 L30,40 L35,25 L50,25 L55,5 L60,45 L65,25 L100,25 L105,15 L110,35 L115,25 L150,25 L155,10 L160,40 L165,25 L200,25 L205,5 L210,45 L215,25 L300,25"
                      fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]"
                    />
                  </svg>
                  <div className="absolute top-0 bottom-0 w-12 bg-gradient-to-r from-transparent to-green-900/50 animate-scan left-0 blur-sm"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Resource Inventory Manager */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Resource Inventory</h3>
                <p className="text-sm text-gray-500">Manage beds, oxygen, and equipment</p>
              </div>
              <button
                onClick={() => {
                  setEditingResId(null);
                  setNewResName('');
                  setNewResType('Bed');
                  setNewResPrice(0);
                  setNewResStock(0);
                  setIsResourceModalOpen(true);
                }}
                className="p-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
              {hospitalResources.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No resources added.</p>
              ) : (
                hospitalResources.map(res => {
                  // count only approved / paid requests — do not count pending or cancelled
                  const occupied = resourceRequests.filter(req => req.type === res.name && req.status === 'paid').length;

                  const percentage = Math.min(100, Math.round((occupied / res.totalStock) * 100));

                  return (
                    <div key={res.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`p-2 rounded-lg ${res.type === 'Oxygen' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                            {res.type === 'Oxygen' ? <ActivityIcon className="w-4 h-4" /> : <BedIcon className="w-4 h-4" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 text-sm">{res.name}</h4>
                            <p className="text-xs text-gray-500">₹{res.price}/day</p>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditResourceClick(res);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteResource(res.id, res.name);
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-20 relative cursor-pointer group"
                            title="Delete Resource"
                          >
                            <TrashIcon className="w-4 h-4 pointer-events-none group-hover:text-red-500" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium text-gray-600">
                          <span>Occupied: {occupied}</span>
                          <span>Total: {res.totalStock}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${percentage > 80 ? 'bg-red-500' : 'bg-primary-500'}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-right text-xs text-gray-400">{percentage}% Full</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDoctors = () => {
    const filteredDoctors = doctors.filter(doc =>
      doc.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(doctorSearch.toLowerCase())
    );

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-bold text-gray-800">Manage Doctors</h2>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="text-gray-400 w-4 h-4" />
              </div>
              <input
                type="text"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                placeholder="Search doctors..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
            <button
              onClick={() => {
                setEditingDocId(null);
                setNewDocName('');
                setNewDocSpecialty('');
                setNewDocBio('');
                setIsModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-md whitespace-nowrap"
            >
              <PlusIcon className="w-4 h-4" /> <span>Add Doctor</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map(doc => (
              <div key={doc.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col group hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <img src={doc.image} alt={doc.name} className="w-12 h-12 rounded-full object-cover group-hover:scale-105 transition-transform" />
                    <div>
                      <h3 className="font-bold text-gray-800">{doc.name}</h3>
                      <p className="text-xs text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded-full inline-block">{doc.specialty}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-4 flex-grow">{doc.bio}</p>
                <div className="mt-auto pt-4 border-t border-gray-50 flex justify-end space-x-2">
                  <button
                    onClick={() => handleEditClick(doc)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDoctor(doc.id, doc.name, doc.specialty)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>


                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-10 text-gray-400">
              No doctors found matching "{doctorSearch}"
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPatients = () => {
    const filteredPatients = allUsers
      .filter(u => u.role === Role.PATIENT)
      .filter(user =>
        user.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
        user.email.toLowerCase().includes(patientSearch.toLowerCase()) ||
        (user.phone && user.phone.includes(patientSearch))
      );

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-bold text-gray-800">Patient Records</h2>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="text-gray-400 w-4 h-4" />
              </div>
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search patients..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              <DownloadIcon className="w-4 h-4" /> <span>Download CSV</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Patient Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Address</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPatients.length > 0 ? (
                filteredPatients.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.phone || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.address || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeletePatient(user.id, user.name)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Patient"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderBookings = () => (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Appointment Requests</h2>
      {appointments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500">No appointments found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Doctor</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Date & Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appointments.map(appt => (
                <tr key={appt.id}>
                  <td className="px-6 py-4 text-sm text-gray-800">{appt.doctorName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{appt.patientName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{appt.date} at {appt.time}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${appt.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                      appt.status === 'completed' ? 'bg-green-50 text-green-700' :
                        appt.status === 'upcoming' ? 'bg-blue-50 text-blue-700' :
                          'bg-yellow-100 text-yellow-800'
                      }`}>
                      {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {appt.status === 'pending' && (
                        <>
                          <button
                            onClick={() => approveAppointment(appt.id)}
                            className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                            title="Approve"
                          >
                            <CheckIcon className="w-3 h-3" /> <span>Approve</span>
                          </button>
                          <button
                            onClick={() => cancelAppointment(appt.id)}
                            className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors"
                            title="Decline"
                          >
                            <XIcon className="w-3 h-3" /> <span>Decline</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={async () => {
                          if (!window.confirm('Are you sure you want to permanently delete this appointment record?')) {
                            return;
                          }

                          // 1️⃣ Delete from Supabase
                          try {
                            const { error } = await supabase
                              .from('appointments')
                              .delete()
                              .match({
                                doctor_name: appt.doctorName,
                                appointment_date: appt.date,
                                appointment_time: appt.time
                              });

                            if (error) {
                              console.error('Supabase delete appointment error:', error);
                              alert('Failed to delete appointment from database: ' + error.message);
                              return;
                            }

                            // 2️⃣ Delete from local store (existing behavior)
                            deleteAppointment(appt.id);
                          } catch (err) {
                            console.error(err);
                            alert('Something went wrong while deleting appointment from database.');
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                        title="Delete Record"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderResourceRequests = () => (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Resource Requests (Beds & Oxygen)</h2>
      {resourceRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
          <BedIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500">No resource requests found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Price</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Payment Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {resourceRequests.map(req => (
                <tr key={req.id} className={req.status === 'cancelled' ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{req.patientName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{req.type}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{req.date}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-800">₹{req.price}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${req.status === 'paid' ? 'bg-green-100 text-green-800' :
                      req.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                      {req.status === 'pending' ? 'Pending' : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {req.status === 'pending' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('resources')
                                .update({ status: 'paid' })
                                .match({
                                  patient_name: req.patientName,
                                  resource_selected: req.type,
                                  date: req.date,
                                  price: req.price,
                                  status: 'pending'
                                });

                              if (error) {
                                console.error('Supabase markResourceAsPaid error:', error);
                                alert('Failed to update resource status in database: ' + error.message);
                                return;
                              }

                              // update local state (existing logic)
                              markResourceAsPaid(req.id);
                            } catch (err) {
                              console.error(err);
                              alert('Something went wrong while updating database.');
                            }
                          }}

                          className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                          title="Mark as Paid"
                        >
                          <CheckIcon className="w-3 h-3" /> <span>Mark as Paid</span>
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('resources')
                                .update({ status: 'cancelled' })
                                .match({
                                  patient_name: req.patientName,
                                  resource_selected: req.type,
                                  date: req.date,
                                  price: req.price,
                                  status: 'pending'
                                });

                              if (error) {
                                console.error('Supabase cancelResourceRequest error:', error);
                                alert('Failed to update resource status in database: ' + error.message);
                                return;
                              }

                              // update local state (existing logic)
                              cancelResourceRequest(req.id);
                            } catch (err) {
                              console.error(err);
                              alert('Something went wrong while updating database.');
                            }
                          }}

                          className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors"
                          title="Cancel Request"
                        >
                          <XIcon className="w-3 h-3" /> <span>Cancel Request</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="max-w-3xl mx-auto animate-fade-in bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-6">My Profile</h2>
      <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 mb-8">
        <div className="relative">
          <img
            src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.name}&background=random`}
            alt="Profile"
            className="w-32 h-32 rounded-full object-cover border-4 border-primary-50 shadow-md"
          />
          <div className="absolute bottom-1 right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white"></div>
        </div>
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-bold text-gray-900">{currentUser?.name}</h2>
          <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-700">
              {currentUser?.role}
            </span>
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
              ID: {currentUser?.id}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-800 font-medium flex items-center">
            <span className="bg-white p-2 rounded-lg mr-3 shadow-sm"><UserIcon className="w-4 h-4 text-gray-400" /></span>
            {currentUser?.email}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-800 font-medium flex items-center">
            <span className="bg-white p-2 rounded-lg mr-3 shadow-sm"><PlusIcon className="w-4 h-4 text-gray-400 rotate-45" /></span>
            {currentUser?.phone || 'Not provided'}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">System Access</label>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-600 text-sm">
            As an administrator, you have full access to manage doctors, view patient records, and approve appointment requests.
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Welcome back, Administrator.</p>
        </div>
        <div className="flex space-x-2 bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-w-full">
          {(['overview', 'doctors', 'patients', 'bookings', 'resources', 'profile'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab === 'profile' && <SettingsIcon className="inline-block w-4 h-4 mr-1 -mt-0.5" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'doctors' && renderDoctors()}
      {activeTab === 'patients' && renderPatients()}
      {activeTab === 'bookings' && renderBookings()}
      {activeTab === 'resources' && renderResourceRequests()}
      {activeTab === 'profile' && renderProfile()}

      {/* Add/Edit Doctor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{editingDocId ? 'Edit Doctor' : 'Add New Doctor'}</h3>
            <form onSubmit={handleSaveDoctor} className="space-y-4">
              <input
                type="text"
                placeholder="Doctor Name"
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                value={newDocName}
                onChange={e => setNewDocName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Specialty (e.g., Cardiology)"
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                value={newDocSpecialty}
                onChange={e => setNewDocSpecialty(e.target.value)}
                required
              />
              <div className="relative">
                <textarea
                  placeholder="Bio"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none h-24 resize-none"
                  value={newDocBio}
                  onChange={e => setNewDocBio(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleGenerateBio}
                  disabled={isGeneratingBio || !newDocName}
                  className="absolute bottom-2 right-2 text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-md flex items-center space-x-1 hover:bg-primary-200 disabled:opacity-50"
                >
                  <SparklesIcon className="w-3 h-3" /> <span>{isGeneratingBio ? 'Generating...' : 'AI Generate'}</span>
                </button>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeDoctorModal}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/30"
                >
                  {editingDocId ? 'Save Changes' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Resource Modal */}
      {isResourceModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{editingResId ? 'Edit Resource' : 'Add New Resource'}</h3>
            <form onSubmit={handleSaveResource} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resource Name</label>
                <input
                  type="text"
                  placeholder="e.g. ICU Bed, Ventilator"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  value={newResName}
                  onChange={e => setNewResName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newResType}
                    onChange={e => setNewResType(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="Bed">Bed</option>
                    <option value="Oxygen">Oxygen</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Stock</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    value={newResStock}
                    onChange={e => setNewResStock(parseInt(e.target.value))}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Day (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 5000"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  value={newResPrice}
                  onChange={e => setNewResPrice(parseInt(e.target.value))}
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeResourceModal}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/30"
                >
                  {editingResId ? 'Save Changes' : 'Add Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
