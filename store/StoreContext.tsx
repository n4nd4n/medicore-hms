
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Doctor, Appointment, Role, ResourceRequest, HospitalResource } from '../types';

// --- Initial Mock Data ---
const MOCK_DOCTORS: Doctor[] = [
  {
    id: 'd1',
    name: 'Dr. Sarah Jenkins',
    specialty: 'Cardiology',
    bio: 'Top-rated cardiologist with over 15 years of experience in heart health.',
    image: 'https://picsum.photos/seed/doc1/200/200',
    experience: 15,
    availableDays: ['Mon', 'Wed', 'Fri'],
    timeSlots: ['09:00', '10:00', '11:00', '14:00']
  },
  {
    id: 'd2',
    name: 'Dr. Michael Chen',
    specialty: 'Pediatrics',
    bio: 'Compassionate pediatrician loved by kids and trusted by parents.',
    image: 'https://picsum.photos/seed/doc2/200/200',
    experience: 8,
    availableDays: ['Tue', 'Thu', 'Sat'],
    timeSlots: ['09:00', '10:30', '13:00', '15:30']
  },
  {
    id: 'd3',
    name: 'Dr. Emily Stone',
    specialty: 'Dermatology',
    bio: 'Expert in skin care, acne treatment, and cosmetic procedures.',
    image: 'https://picsum.photos/seed/doc3/200/200',
    experience: 12,
    availableDays: ['Mon', 'Tue', 'Thu', 'Fri'],
    timeSlots: ['10:00', '11:00', '14:00', '16:00']
  },
  {
    id: 'd4',
    name: 'Dr. James Wilson',
    specialty: 'Neurology',
    bio: 'Specializes in treating disorders of the nervous system with advanced therapies.',
    image: 'https://picsum.photos/seed/doc4/200/200',
    experience: 20,
    availableDays: ['Mon', 'Thu'],
    timeSlots: ['11:00', '13:00', '15:00']
  },
  {
    id: 'd5',
    name: 'Dr. Linda Martinez',
    specialty: 'Orthopedics',
    bio: 'Expert in bone, joint, and muscle health, helping you move without pain.',
    image: 'https://picsum.photos/seed/doc5/200/200',
    experience: 10,
    availableDays: ['Tue', 'Wed', 'Fri'],
    timeSlots: ['09:00', '12:00', '16:00']
  },
  {
    id: 'd6',
    name: 'Dr. Robert Kim',
    specialty: 'General Surgery',
    bio: 'Skilled surgeon dedicated to providing safe and effective surgical procedures.',
    image: 'https://picsum.photos/seed/doc6/200/200',
    experience: 14,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    timeSlots: ['08:00', '10:00', '14:00']
  },
  {
    id: 'd7',
    name: 'Dr. Susan Lee',
    specialty: 'Psychiatry',
    bio: 'Empathetic psychiatrist helping patients achieve mental wellness and balance.',
    image: 'https://picsum.photos/seed/doc7/200/200',
    experience: 9,
    availableDays: ['Mon', 'Wed', 'Thu'],
    timeSlots: ['10:00', '11:30', '14:00']
  },
  {
    id: 'd8',
    name: 'Dr. David Patel',
    specialty: 'Ophthalmology',
    bio: 'Vision care specialist focused on eye health and corrective surgeries.',
    image: 'https://picsum.photos/seed/doc8/200/200',
    experience: 18,
    availableDays: ['Tue', 'Thu', 'Fri'],
    timeSlots: ['09:00', '11:00', '15:00']
  },
  {
    id: 'd9',
    name: 'Dr. Olivia Brown',
    specialty: 'Oncology',
    bio: 'Dedicated oncologist providing comprehensive cancer care and support.',
    image: 'https://picsum.photos/seed/doc9/200/200',
    experience: 22,
    availableDays: ['Mon', 'Tue', 'Wed'],
    timeSlots: ['08:30', '12:00', '14:30']
  },
  {
    id: 'd10',
    name: 'Dr. William Davis',
    specialty: 'ENT',
    bio: 'Specialist in Ear, Nose, and Throat conditions for both adults and children.',
    image: 'https://picsum.photos/seed/doc10/200/200',
    experience: 11,
    availableDays: ['Wed', 'Thu', 'Fri'],
    timeSlots: ['09:30', '13:00', '16:30']
  }
];

const MOCK_RESOURCES: HospitalResource[] = [
  { id: 'r1', name: 'ICU Bed', type: 'Bed', price: 5000, totalStock: 10 },
  { id: 'r2', name: 'General Bed', type: 'Bed', price: 1500, totalStock: 40 },
  { id: 'r3', name: 'Oxygen Cylinder', type: 'Oxygen', price: 800, totalStock: 100 },
];

const MOCK_ADMIN: User = {
  id: 'admin1',
  name: 'Super Admin',
  email: 'admin@medicore.com',
  password: 'admin',
  role: Role.ADMIN,
  avatar: 'https://picsum.photos/seed/admin/100/100'
};

// --- Context Interface ---
interface StoreContextType {
  currentUser: User | null;
  login: (email: string, pass: string) => boolean;
  signup: (user: Omit<User, 'id'>) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  deleteAccount: () => void;
  deleteUser: (id: string) => void;

  doctors: Doctor[];
  addDoctor: (doc: Omit<Doctor, 'id'>) => void;
  updateDoctor: (doc: Doctor) => void;
  deleteDoctor: (id: string) => void;

  appointments: Appointment[];
  bookAppointment: (appt: Omit<Appointment, 'id' | 'status'>) => void;
  cancelAppointment: (id: string) => void;
  deleteAppointment: (id: string) => void;
  approveAppointment: (id: string) => void;

  resourceRequests: ResourceRequest[];
  bookResource: (request: Omit<ResourceRequest, 'id' | 'status'>) => void;
  markResourceAsPaid: (id: string) => void;
  cancelResourceRequest: (id: string) => void;

  hospitalResources: HospitalResource[];
  addHospitalResource: (res: Omit<HospitalResource, 'id'>) => void;
  updateHospitalResource: (res: HospitalResource) => void;
  deleteHospitalResource: (id: string) => void;
  
  allUsers: User[]; // For admin to view patients
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('users');
    return saved ? JSON.parse(saved) : [MOCK_ADMIN];
  });

  const [doctors, setDoctors] = useState<Doctor[]>(() => {
    const saved = localStorage.getItem('doctors');
    return saved ? JSON.parse(saved) : MOCK_DOCTORS;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('appointments');
    return saved ? JSON.parse(saved) : [];
  });

  const [resourceRequests, setResourceRequests] = useState<ResourceRequest[]>(() => {
    const saved = localStorage.getItem('resourceRequests');
    return saved ? JSON.parse(saved) : [];
  });

  const [hospitalResources, setHospitalResources] = useState<HospitalResource[]>(() => {
    const saved = localStorage.getItem('hospitalResources');
    return saved ? JSON.parse(saved) : MOCK_RESOURCES;
  });

  // Persistence Effects
  useEffect(() => localStorage.setItem('currentUser', JSON.stringify(currentUser)), [currentUser]);
  useEffect(() => localStorage.setItem('users', JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem('doctors', JSON.stringify(doctors)), [doctors]);
  useEffect(() => localStorage.setItem('appointments', JSON.stringify(appointments)), [appointments]);
  useEffect(() => localStorage.setItem('resourceRequests', JSON.stringify(resourceRequests)), [resourceRequests]);
  useEffect(() => localStorage.setItem('hospitalResources', JSON.stringify(hospitalResources)), [hospitalResources]);

  // Auth Actions
  const login = (email: string, pass: string) => {
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const signup = (userData: Omit<User, 'id'>) => {
    const newUser: User = { ...userData, id: Math.random().toString(36).substr(2, 9) };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
  };

  const logout = () => {
    setCurrentUser(null);
    // Clear only current user from storage, keep data
    localStorage.removeItem('currentUser');
  };

  const updateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const deleteAccount = () => {
    if (!currentUser) return;
    setUsers(prev => prev.filter(u => u.id !== currentUser.id));
    // Also cancel their appointments
    setAppointments(prev => prev.map(a => a.patientId === currentUser.id ? { ...a, status: 'cancelled' } : a));
    logout();
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    setAppointments(prev => prev.map(a => a.patientId === id ? { ...a, status: 'cancelled' } : a));
  };

  // Doctor Actions
  const addDoctor = (docData: Omit<Doctor, 'id'>) => {
    const newDoc: Doctor = { ...docData, id: Math.random().toString(36).substr(2, 9) };
    setDoctors(prev => [...prev, newDoc]);
  };

  const updateDoctor = (doc: Doctor) => {
    setDoctors(prev => prev.map(d => d.id === doc.id ? doc : d));
  };

  const deleteDoctor = (id: string) => {
    setDoctors(prev => prev.filter(d => d.id !== id));
  };

  // Appointment Actions
  const bookAppointment = (apptData: Omit<Appointment, 'id' | 'status'>) => {
    const newAppt: Appointment = {
      ...apptData,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending' // Default to pending
    };
    setAppointments(prev => [...prev, newAppt]);
  };

  const cancelAppointment = (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
  };

  const deleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const approveAppointment = (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'upcoming' } : a));
  };

  // Resource Requests Actions
  const bookResource = (request: Omit<ResourceRequest, 'id' | 'status'>) => {
    const newRequest: ResourceRequest = {
      ...request,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending'
    };
    setResourceRequests(prev => [...prev, newRequest]);
  };

  const markResourceAsPaid = (id: string) => {
    setResourceRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'paid' } : r));
  };

  const cancelResourceRequest = (id: string) => {
    setResourceRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
  };

  // Hospital Resource Inventory Actions
  const addHospitalResource = (res: Omit<HospitalResource, 'id'>) => {
    const newRes = { ...res, id: Math.random().toString(36).substr(2, 9) };
    setHospitalResources(prev => [...prev, newRes]);
  };

  const updateHospitalResource = (res: HospitalResource) => {
    setHospitalResources(prev => prev.map(r => r.id === res.id ? res : r));
  };

  const deleteHospitalResource = (id: string) => {
    setHospitalResources(prev => prev.filter(r => r.id !== id));
  };

  return (
    <StoreContext.Provider value={{
      currentUser,
      login,
      signup,
      logout,
      updateUser,
      deleteAccount,
      deleteUser,
      doctors,
      addDoctor,
      updateDoctor,
      deleteDoctor,
      appointments,
      bookAppointment,
      cancelAppointment,
      deleteAppointment,
      approveAppointment,
      resourceRequests,
      bookResource,
      markResourceAsPaid,
      cancelResourceRequest,
      hospitalResources,
      addHospitalResource,
      updateHospitalResource,
      deleteHospitalResource,
      allUsers: users
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
