// FluxSalud Types

export interface Office {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: string;
  user_id?: string;
  office_id?: string;
  full_name: string;
  specialty?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  office?: Office;
}

export interface Schedule {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_active: boolean;
  created_at: string;
}

export interface ScheduleBlock {
  id: string;
  doctor_id: string;
  start_datetime: string;
  end_datetime: string;
  reason?: string;
  created_by?: string;
  created_at: string;
}

export type AppointmentType = 'presencial' | 'virtual';
export type AppointmentStatus = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

export interface Appointment {
  id: string;
  doctor_id: string;
  office_id?: string;
  patient_id?: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  reason: string;
  notes?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  type: AppointmentType;
  status: AppointmentStatus;
  confirmation_token?: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
  doctor?: Doctor;
  office?: Office;
  patient?: Patient;
}

export type AppRole = 'medico' | 'asistente' | 'admin';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  doctor_id?: string;
  created_at: string;
}

export interface UserDoctorAssignment {
  id: string;
  user_id: string;
  doctor_id: string;
  created_at: string;
  created_by?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface BookingFormData {
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  reason: string;
  notes?: string;
  doctor_id: string;
  office_id?: string;
  appointment_date: string;
  start_time: string;
  duration: number;
  type: AppointmentType;
}

// Patient types
export interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PatientFile {
  id: string;
  patient_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  description?: string;
  uploaded_by?: string;
  created_at: string;
}

// Payment types
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'otro';

export interface Payment {
  id: string;
  patient_id: string;
  appointment_id?: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference?: string;
  receipt_url?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  appointment?: Appointment;
}
