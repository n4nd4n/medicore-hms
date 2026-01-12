
import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { Doctor, Appointment } from '../types';
import { CalendarIcon, StethoscopeIcon, TrashIcon, SettingsIcon, SparklesIcon, MapPinIcon, EditIcon, PhoneIcon } from '../components/Icons';
import { askHealthAssistant } from '../services/geminiService';
import { supabase } from '../lib/supabaseClient';


const PatientDashboard: React.FC = () => {
  const { currentUser, doctors, appointments, bookAppointment, cancelAppointment, deleteAccount, updateUser } = useStore();
  const [activeTab, setActiveTab] = useState<'book' | 'history' | 'settings' | 'assistant'>('book');
  
  // Booking State
  const [selectedDoc, setSelectedDoc] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

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


  const renderBooking = () => (
    <div className="animate-fade-in">
       <h2 className="text-2xl font-bold text-gray-800 mb-6">Find a Specialist</h2>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {doctors.map(doc => (
           <div 
              key={doc.id} 
              onClick={() => setSelectedDoc(doc)}
              className={`cursor-pointer p-5 rounded-2xl border transition-all ${selectedDoc?.id === doc.id ? 'border-primary-500 ring-2 ring-primary-500 ring-offset-2 bg-primary-50/50' : 'border-gray-100 bg-white hover:shadow-lg'}`}
           >
             <div className="flex items-center space-x-4 mb-3">
               <img src={doc.image} alt={doc.name} className="w-14 h-14 rounded-full object-cover shadow-sm" />
               <div>
                 <h3 className="font-bold text-gray-900">{doc.name}</h3>
                 <p className="text-sm text-primary-600 font-medium">{doc.specialty}</p>
               </div>
             </div>
             <p className="text-sm text-gray-500 line-clamp-2 mb-3">{doc.bio}</p>
             <div className="flex flex-wrap gap-2">
               {doc.availableDays.slice(0,3).map(day => (
                 <span key={day} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">{day}</span>
               ))}
             </div>
           </div>
         ))}
       </div>

       {selectedDoc && (
         <div className="mt-8 bg-white p-8 rounded-2xl border border-gray-100 shadow-lg animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Book with {selectedDoc.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                 <input 
                    type="date" 
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    onChange={(e) => setSelectedDate(e.target.value)}
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">Select Time</label>
                 <select 
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
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
              className="mt-6 w-full py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/20"
            >
              Confirm Appointment
            </button>
         </div>
       )}
    </div>
  );

  const renderHistory = () => {
    const myAppts = appointments.filter(a => a.patientId === currentUser?.id);
    return (
      <div className="space-y-4 animate-fade-in">
        <h2 className="text-xl font-bold text-gray-800 mb-4">My Appointments</h2>
        {myAppts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
             <CalendarIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
             <p className="text-gray-500">No appointments found.</p>
          </div>
        ) : (
          <div className="grid gap-4">
             {myAppts.map(appt => (
               <div key={appt.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
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
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                   >
                     Cancel
                   </button>
                 )}
               </div>
             ))}
          </div>
        )}
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
              { id: 'assistant', label: 'AI Assistant', icon: <SparklesIcon className="w-4 h-4 mr-2"/> },
              { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4 mr-2"/> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
      {activeTab === 'assistant' && renderAssistant()}
      {activeTab === 'settings' && renderSettings()}
    </div>
  );
};

export default PatientDashboard;
