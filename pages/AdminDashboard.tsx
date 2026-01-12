
import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { Role } from '../types';
import { PlusIcon, TrashIcon, EditIcon, CalendarIcon, UserIcon, StethoscopeIcon, SparklesIcon, CheckIcon, SettingsIcon, SearchIcon, DownloadIcon, XIcon } from '../components/Icons';
import { generateDoctorBio } from '../services/geminiService';

const AdminDashboard: React.FC = () => {
  const { doctors, addDoctor, updateDoctor, deleteDoctor, appointments, allUsers, approveAppointment, cancelAppointment, deleteAppointment, currentUser, deleteUser } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'doctors' | 'patients' | 'bookings' | 'profile'>('overview');

  // Search States
  const [doctorSearch, setDoctorSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  // --- Add/Edit Doctor Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('');
  const [newDocBio, setNewDocBio] = useState('');
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);

  const handleGenerateBio = async () => {
    if (!newDocName || !newDocSpecialty) return;
    setIsGeneratingBio(true);
    const bio = await generateDoctorBio(newDocName, newDocSpecialty);
    setNewDocBio(bio);
    setIsGeneratingBio(false);
  };

  const handleSaveDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingDocId) {
      // Edit Mode
      const existingDoc = doctors.find(d => d.id === editingDocId);
      if (existingDoc) {
        updateDoctor({
          ...existingDoc,
          name: newDocName,
          specialty: newDocSpecialty,
          bio: newDocBio
        });
      }
    } else {
      // Add Mode
      addDoctor({
        name: newDocName,
        specialty: newDocSpecialty,
        bio: newDocBio,
        image: `https://ui-avatars.com/api/?name=${newDocName}&background=random`,
        experience: 5,
        availableDays: ['Mon', 'Wed', 'Fri'],
        timeSlots: ['09:00', '10:00', '11:00']
      });
    }

    closeModal();
  };

  const handleEditClick = (doc: any) => {
    setEditingDocId(doc.id);
    setNewDocName(doc.name);
    setNewDocSpecialty(doc.specialty);
    setNewDocBio(doc.bio);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDocId(null);
    setNewDocName('');
    setNewDocSpecialty('');
    setNewDocBio('');
  };

  const handleDeletePatient = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete patient "${name}"? This action cannot be undone.`)) {
      deleteUser(id);
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 overflow-hidden relative">
        <div className="flex justify-between items-center mb-8 relative z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Live Hospital Activity</h3>
            <p className="text-sm text-gray-500">Real-time system monitoring and health status</p>
          </div>
          <span className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100 animate-pulse">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            SYSTEM ACTIVE
          </span>
        </div>

        {/* System Monitor */}
        <div className="relative z-10">
          {/* Card - ECG / System Health */}
          <div className="group bg-gray-900 p-8 rounded-xl shadow-inner relative overflow-hidden flex flex-col justify-center min-h-[160px]">
              {/* Background Lines */}
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
              </div>
              
              {/* ECG SVG */}
              <div className="flex items-end h-24 w-full relative">
                  <svg className="w-full h-full" viewBox="0 0 300 50" preserveAspectRatio="none">
                    <path d="M0,25 L20,25 L25,10 L30,40 L35,25 L50,25 L55,5 L60,45 L65,25 L100,25 L105,15 L110,35 L115,25 L150,25 L155,10 L160,40 L165,25 L200,25 L205,5 L210,45 L215,25 L300,25" 
                          fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                          className="drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]"
                    />
                  </svg>
                  {/* Scanline overlay */}
                  <div className="absolute top-0 bottom-0 w-12 bg-gradient-to-r from-transparent to-green-900/50 animate-scan left-0 blur-sm"></div>
              </div>
              
              <div className="flex justify-between items-center mt-6 border-t border-gray-800 pt-4">
                <span className="text-green-400 font-mono text-sm flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                  SERVER LOAD: OPTIMAL
                </span>
                <span className="text-gray-500 font-mono text-sm">V.2.4.0</span>
              </div>
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
                    onClick={() => deleteDoctor(doc.id)}
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
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        appt.status === 'cancelled' ? 'bg-red-50 text-red-700' : 
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
                       onClick={() => {
                         if(window.confirm('Are you sure you want to permanently delete this appointment record?')) {
                           deleteAppointment(appt.id);
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
               <span className="bg-white p-2 rounded-lg mr-3 shadow-sm"><UserIcon className="w-4 h-4 text-gray-400"/></span>
               {currentUser?.email}
            </div>
         </div>
         <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-800 font-medium flex items-center">
              <span className="bg-white p-2 rounded-lg mr-3 shadow-sm"><PlusIcon className="w-4 h-4 text-gray-400 rotate-45"/></span>
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
            {(['overview', 'doctors', 'patients', 'bookings', 'profile'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'profile' && <SettingsIcon className="inline-block w-4 h-4 mr-1 -mt-0.5"/>}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
         </div>
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'doctors' && renderDoctors()}
      {activeTab === 'patients' && renderPatients()}
      {activeTab === 'bookings' && renderBookings()}
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
                   onClick={closeModal}
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
    </div>
  );
};

export default AdminDashboard;
