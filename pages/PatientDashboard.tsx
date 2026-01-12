
import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { Doctor, Appointment } from '../types';
import { CalendarIcon, StethoscopeIcon, TrashIcon, SettingsIcon, SparklesIcon, MapPinIcon, EditIcon, PhoneIcon, BedIcon, ActivityIcon, ArrowLeftIcon } from '../components/Icons';
import { askHealthAssistant } from '../services/geminiService';
import { supabase } from '../lib/supabaseClient';

const PatientDashboard: React.FC = () => {
  const { currentUser, doctors, appointments, bookAppointment, cancelAppointment, deleteAccount, updateUser, bookResource, resourceRequests, cancelResourceRequest, hospitalResources } = useStore();
  const [activeTab, setActiveTab] = useState<'book' | 'history' | 'resources' | 'settings' | 'assistant'>('book');
  
  // Booking State
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Resource Booking State
  const [resourceDate, setResourceDate] = useState('');

  // AI Chat State
  const [chatQuery, setChatQuery] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const handleBook = async () => {
  if (selectedDoc && selectedDate && selectedTime && currentUser) {

    // 1️⃣ Local booking (keeps your UI same as before)
    bookAppointment({
      patientId: currentUser.id,
      patientName: currentUser.name,
      doctorId: selectedDoc.id,
      doctorName: selectedDoc.name,
      date: selectedDate,
      time: selectedTime,
      notes: 'Online booking'
    });

    // 2️⃣ Save appointment to Supabase
    try {
      const { error } = await supabase.from('appointments').insert({
        patient_id: currentUser.id,          // uuid
        patient_email: currentUser.email,    // NEW
        doctor_name: selectedDoc.name,
        appointment_date: selectedDate,
        appointment_time: selectedTime
      });

      if (error) {
        console.error('Supabase appointments error:', error);
        alert(error.message);  // show real error
      } else {
        alert('Appointment requested! Waiting for admin approval.');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong while saving to database.');
    }

    setActiveTab('history');
    setSelectedDoc(null);
  }
};

const handleResourceBook = async (type: string, price: number) => {
  if (!currentUser) return;
  if (!resourceDate) {
    alert('Please select a date for the reservation.');
    return;
  }

  // 1️⃣ Local booking (existing behavior)
  bookResource({
    patientId: currentUser.id,
    patientName: currentUser.name,
    type,
    price,
    date: resourceDate
  });

  // 2️⃣ Save resource booking to Supabase
  try {
    const { error } = await supabase.from('resources').insert({
      patient_id: currentUser.id,
      patient_email: currentUser.email,
      patient_name: currentUser.name,
      resource_selected: type,
      date: resourceDate,
      time: new Date().toLocaleTimeString('en-IN'),
      price,
      status: 'pending'   // 👈 NEW
    });


    if (error) {
      console.error('Supabase resources error:', error);
      alert('Request saved locally but failed to save in database: ' + error.message);
    } else {
      // 3️⃣ Your custom success alert
      const message = `✅ Request submitted.\n📌 Please pay at hospital billing desk to confirm your booking.`;
      alert(message);
      setResourceDate('');
      setActiveTab('history');
    }
  } catch (err) {
    console.error(err);
    alert('Something went wrong while saving resource booking to database.');
  }
};


  const handleAiQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery) return;
    setIsChatting(true);
    const res = await askHealthAssistant(chatQuery);
    setChatResponse(res);
    setIsChatting(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file && currentUser) {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const avatarData = reader.result as string;

      // 1️⃣ Update in local store (UI will change immediately)
      updateUser({
        ...currentUser,
        avatar: avatarData
      });

      // 2️⃣ Save avatar in Supabase "profiles" table
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarData })
          .eq('email', currentUser.email);

        if (error) {
          console.error(error);
          alert('Profile photo updated locally, but failed to save in database.');
        }
      } catch (err) {
        console.error(err);
        alert('Something went wrong while saving your profile photo.');
      }
    };
    reader.readAsDataURL(file);
  }
};

  const renderBooking = () => {
    // Step 3: Booking Form (Date & Time)
    if (selectedDoc) {
        return (
            <div className="animate-fade-in">
                <button 
                  onClick={() => setSelectedDoc(null)} 
                  className="mb-6 flex items-center text-primary-600 font-medium hover:underline transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back to Doctors
                </button>

                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-lg max-w-2xl mx-auto">
                    <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-gray-100">
                        <img src={selectedDoc.image} alt={selectedDoc.name} className="w-16 h-16 rounded-full object-cover shadow-sm" />
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">{selectedDoc.name}</h3>
                            <p className="text-primary-600 font-medium">{selectedDoc.specialty}</p>
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-gray-800 mb-4">Select Appointment Time</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                            <input 
                                type="date" 
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Time</label>
                            <select 
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                                onChange={(e) => setSelectedTime(e.target.value)}
                            >
                                <option value="">-- Select Slot --</option>
                                {selectedDoc.timeSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                            </select>
                        </div>
                    </div>
                    <button 
                        onClick={handleBook}
                        disabled={!selectedDate || !selectedTime}
                        className="mt-8 w-full py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 transform hover:-translate-y-0.5"
                    >
                        Confirm Appointment
                    </button>
                </div>
            </div>
        );
    }

    // Step 2: Doctor Selection
    if (selectedSpecialty) {
        const filteredDocs = doctors.filter(d => d.specialty === selectedSpecialty);
        return (
            <div className="animate-fade-in">
                <div className="flex items-center mb-6">
                    <button 
                      onClick={() => setSelectedSpecialty(null)} 
                      className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                      title="Back to Specialties"
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{selectedSpecialty} Specialists</h2>
                      <p className="text-gray-500 text-sm">Select a doctor to proceed</p>
                    </div>
                </div>
                
                {filteredDocs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {filteredDocs.map(doc => (
                          <div 
                              key={doc.id} 
                              onClick={() => setSelectedDoc(doc)}
                              className="cursor-pointer bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all transform hover:-translate-y-1 group"
                          >
                              <div className="flex items-center space-x-4 mb-4">
                                  <img src={doc.image} alt={doc.name} className="w-14 h-14 rounded-full object-cover shadow-sm group-hover:ring-2 group-hover:ring-primary-500 transition-all" />
                                  <div>
                                      <h3 className="font-bold text-gray-900 group-hover:text-primary-700 transition-colors">{doc.name}</h3>
                                      <p className="text-xs text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded-full inline-block">{doc.specialty}</p>
                                  </div>
                              </div>
                              <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{doc.bio}</p>
                              <div className="flex flex-wrap gap-2">
                                  {doc.availableDays.slice(0, 3).map(day => (
                                      <span key={day} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md font-medium border border-gray-100">{day}</span>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                     <p className="text-gray-500">No doctors found for this specialty.</p>
                  </div>
                )}
            </div>
        );
    }

    // Step 1: Specialty Selection
    const specialties = Array.from(new Set(doctors.map(d => d.specialty))).sort();
    return (
        <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Find a Specialist</h2>
            <p className="text-gray-500 mb-8">Select a department to view available doctors</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {specialties.map(spec => (
                    <div 
                        key={spec} 
                        onClick={() => setSelectedSpecialty(spec)} 
                        className="cursor-pointer bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-300 hover:bg-primary-50/30 transition-all group flex flex-col items-center text-center"
                    >
                        <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 mb-4 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-300">
                             <StethoscopeIcon className="w-7 h-7" />
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg group-hover:text-primary-800 transition-colors">{spec}</h3>
                        <p className="text-xs text-gray-500 mt-1">{doctors.filter(d => d.specialty === spec).length} Doctors</p>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  const renderHistory = () => {
    const myAppts = appointments.filter(a => a.patientId === currentUser?.id);
    const myResources = resourceRequests.filter(r => r.patientId === currentUser?.id);

    return (
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Doctor Appointments</h2>
          {myAppts.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-300">
               <CalendarIcon className="mx-auto h-10 w-10 text-gray-300 mb-2" />
               <p className="text-gray-500 text-sm">No doctor appointments found.</p>
            </div>
          ) : (
            <div className="grid gap-4">
               {myAppts.map(appt => (
                 <div key={appt.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div>
                      <h4 className="font-bold text-gray-800 text-lg">{appt.doctorName}</h4>
                      <p className="text-sm text-gray-500">{appt.date} at {appt.time}</p>
                      <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                        appt.status === 'cancelled' ? 'bg-red-50 text-red-600' : 
                        appt.status === 'completed' ? 'bg-green-50 text-green-600' : 
                        appt.status === 'upcoming' ? 'bg-blue-50 text-blue-700' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                      </span>
                   </div>
                   {appt.status !== 'cancelled' && (
                     <button 
                        onClick={() => cancelAppointment(appt.id)}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors w-full md:w-auto"
                     >
                       Cancel
                     </button>
                   )}
                 </div>
               ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Resource Requests</h2>
          {myResources.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-300">
               <BedIcon className="mx-auto h-10 w-10 text-gray-300 mb-2" />
               <p className="text-gray-500 text-sm">No resource requests found.</p>
            </div>
          ) : (
            <div className="grid gap-4">
               {myResources.map(req => (
                 <div key={req.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div>
                      <h4 className="font-bold text-gray-800 text-lg">{req.type}</h4>
                      <p className="text-sm text-gray-500">Date: {req.date} • Charges: ₹{req.price}</p>
                      <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                        req.status === 'paid' ? 'bg-green-50 text-green-600' : 
                        req.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {req.status === 'paid' ? 'Confirmed (Paid)' : 
                         req.status === 'cancelled' ? 'Declined/Cancelled' : 
                         'Pending Payment'}
                      </span>
                   </div>
                   {req.status === 'pending' && (
                     <button 
                        onClick={() => cancelResourceRequest(req.id)}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors w-full md:w-auto"
                     >
                       Cancel Request
                     </button>
                   )}
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderResources = () => {
    return (
      <div className="animate-fade-in space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Hospital Resources</h2>
          <p className="text-gray-500">Book Beds and Oxygen cylinders for your admission.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
           <label className="block text-sm font-medium text-gray-700 mb-2">Select Date needed:</label>
           <input 
              type="date" 
              value={resourceDate}
              onChange={(e) => setResourceDate(e.target.value)}
              className="w-full md:w-1/3 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
           />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {hospitalResources.map(res => {
            const isOxygen = res.type === 'Oxygen';
            const colorClass = isOxygen ? 'green' : res.name.includes('ICU') ? 'red' : 'blue';
            const bgClass = isOxygen ? 'bg-green-50' : res.name.includes('ICU') ? 'bg-red-50' : 'bg-blue-50';
            const textClass = isOxygen ? 'text-green-600' : res.name.includes('ICU') ? 'text-red-600' : 'text-blue-600';
            const hoverClass = isOxygen ? 'group-hover:bg-green-600' : res.name.includes('ICU') ? 'group-hover:bg-red-600' : 'group-hover:bg-blue-600';
            const borderClass = isOxygen ? 'border-green-500' : res.name.includes('ICU') ? 'border-red-500' : 'border-blue-500';

            return (
              <div key={res.id} className={`bg-white p-6 rounded-2xl shadow-lg border-t-4 ${borderClass} hover:shadow-xl transition-all group`}>
                 <div className={`${bgClass} w-12 h-12 rounded-full flex items-center justify-center mb-4 ${hoverClass} group-hover:text-white transition-all`}>
                    {isOxygen ? <ActivityIcon className={`${textClass} w-6 h-6 group-hover:text-white`} /> : <BedIcon className={`${textClass} w-6 h-6 group-hover:text-white`} />}
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">{res.name}</h3>
                 <p className="text-gray-500 text-sm mb-4">Total Capacity: {res.totalStock}</p>
                 <p className="text-2xl font-bold text-primary-600 mb-6">₹{res.price} <span className="text-sm text-gray-400 font-normal">/ day</span></p>
                 <button
                   onClick={() => handleResourceBook(res.name, res.price)}
                   className="w-full py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                 >
                   Book Now
                 </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAssistant = () => (
    <div className="animate-fade-in max-w-2xl mx-auto">
       <div className="text-center mb-8">
          <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <SparklesIcon className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">AI Health Assistant</h2>
          <p className="text-gray-500">Ask general wellness questions</p>
       </div>

       <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 h-64 overflow-y-auto bg-gray-50/50">
             {!chatResponse ? (
               <p className="text-center text-gray-400 italic mt-10">"How can I improve my sleep?"</p>
             ) : (
               <div className="bg-primary-50 p-4 rounded-xl rounded-tl-none text-gray-800 text-sm leading-relaxed border border-primary-100">
                  <strong className="block text-primary-700 mb-1">Assistant:</strong>
                  {chatResponse}
               </div>
             )}
          </div>
          <div className="p-4 bg-white border-t border-gray-100">
             <form onSubmit={handleAiQuery} className="relative">
               <input
                 type="text"
                 value={chatQuery}
                 onChange={(e) => setChatQuery(e.target.value)}
                 placeholder="Type your health question..."
                 className="w-full pl-4 pr-24 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
               />
               <button 
                type="submit"
                disabled={isChatting || !chatQuery}
                className="absolute right-2 top-2 bottom-2 px-4 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
               >
                 {isChatting ? '...' : 'Send'}
               </button>
             </form>
          </div>
       </div>
       <p className="text-xs text-gray-400 text-center mt-4">Disclaimer: AI responses are for informational purposes only and do not constitute medical advice.</p>
    </div>
  );

  const renderSettings = () => (
    <div className="animate-fade-in max-w-xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Account Settings</h2>

      {/* Avatar Upload */}
      <div className="flex flex-col items-center mb-8">
         <div className="relative group">
            <img 
              src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.name}&background=random`} 
              alt="Profile" 
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg bg-gray-100"
            />
            <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2.5 rounded-full cursor-pointer hover:bg-primary-700 transition-all shadow-md hover:scale-110">
               <EditIcon className="w-5 h-5" />
               <input 
                 type="file" 
                 accept="image/*" 
                 className="hidden" 
                 onChange={handleAvatarChange}
               />
            </label>
         </div>
         <p className="mt-3 text-sm text-gray-500 font-medium">Tap the pencil to update your photo</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
         <h3 className="font-medium text-gray-700 mb-4">Profile Details</h3>
         <div className="space-y-4">
           <div>
             <label className="block text-sm text-gray-500 mb-1">Full Name</label>
             <input 
                type="text" 
                value={currentUser?.name} 
                disabled 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
             />
           </div>
           <div>
             <label className="block text-sm text-gray-500 mb-1">Email</label>
             <input 
                type="text" 
                value={currentUser?.email} 
                disabled 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
             />
           </div>
           {currentUser?.phone && (
             <div>
                <label className="block text-sm text-gray-500 mb-1">Phone</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PhoneIcon className="text-gray-400 w-5 h-5" />
                  </div>
                  <input 
                      type="text" 
                      value={currentUser?.phone} 
                      disabled 
                      className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                  />
                </div>
             </div>
           )}
           {currentUser?.address && (
             <div>
                <label className="block text-sm text-gray-500 mb-1">Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPinIcon className="text-gray-400 w-5 h-5" />
                  </div>
                  <input 
                      type="text" 
                      value={currentUser?.address} 
                      disabled 
                      className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                  />
                </div>
             </div>
           )}
         </div>
      </div>

      <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
        <h3 className="font-bold text-red-700 mb-2">Danger Zone</h3>
        <p className="text-sm text-red-600 mb-4">Once you delete your account, there is no going back. All your appointments will be cancelled.</p>
        <button 
          onClick={() => {
            if(window.confirm('Are you sure you want to delete your account?')) {
              deleteAccount();
            }
          }}
          className="px-4 py-2 bg-white border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-600 hover:text-white transition-colors"
        >
          Delete My Account
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
         <div>
           <h1 className="text-3xl font-bold text-gray-900">Hello, {currentUser?.name.split(' ')[0]}</h1>
           <p className="text-gray-500">How can we help you today?</p>
         </div>
         <div className="flex space-x-2 bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-w-full">
            {[
              { id: 'book', label: 'Book Appointment', icon: <StethoscopeIcon className="w-4 h-4 mr-2"/> },
              { id: 'history', label: 'My Bookings', icon: <CalendarIcon className="w-4 h-4 mr-2"/> },
              { id: 'resources', label: 'Resources', icon: <BedIcon className="w-4 h-4 mr-2"/> },
              { id: 'assistant', label: 'AI Assistant', icon: <SparklesIcon className="w-4 h-4 mr-2"/> },
              { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4 mr-2"/> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                   setActiveTab(tab.id as any);
                   // Reset selections when changing tabs
                   setSelectedSpecialty(null);
                   setSelectedDoc(null);
                }}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
         </div>
      </div>

      {activeTab === 'book' && renderBooking()}
      {activeTab === 'history' && renderHistory()}
      {activeTab === 'resources' && renderResources()}
      {activeTab === 'assistant' && renderAssistant()}
      {activeTab === 'settings' && renderSettings()}
    </div>
  );
};

export default PatientDashboard;
