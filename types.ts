
export enum Role {
  ADMIN = 'ADMIN',
  PATIENT = 'PATIENT'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  password?: string; // In a real app, this would be hashed.
  avatar?: string;
  phone?: string;
  address?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  image: string;
  experience: number; // years
  availableDays: string[]; // e.g., ["Mon", "Wed", "Fri"]
  timeSlots: string[]; // e.g., ["09:00", "10:00"]
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  status: 'pending' | 'upcoming' | 'completed' | 'cancelled';
  notes?: string;
}

export interface HospitalResource {
  id: string;
  name: string;
  type: string;
  price: number;
  totalStock: number;
}

export interface ResourceRequest {
  id: string;
  patientId: string;
  patientName: string;
  type: string; // Changed from literal union to string to support dynamic resources
  price: number;
  date: string;
  status: 'pending' | 'paid' | 'cancelled';
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  doctors: Doctor[];
  appointments: Appointment[];
  resourceRequests: ResourceRequest[];
  hospitalResources: HospitalResource[];
}
