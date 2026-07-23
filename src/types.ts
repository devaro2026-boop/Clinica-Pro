export interface Clinic {
  id: number;
  name: string;
}

export interface Patient {
  id: number;
  clinic_id: number;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  birth_date: string;
  created_at: string;
}

export interface Appointment {
  id: number;
  clinic_id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  date: string;
  time: string;
  description: string;
  status: string;
  created_at: string;
}

export interface Anamnesis {
  id: number;
  patient_id: number;
  content: string;
  created_at: string;
}

export interface Photo {
  id: number;
  patient_id: number;
  type: string;
  url: string;
  date: string;
  created_at: string;
}

export interface ConsentForm {
  id: number;
  patient_id: number;
  title: string;
  signature_base64: string;
  pdf_url: string;
  created_at: string;
}

export interface FinancialRecord {
  id: number;
  clinic_id: number;
  patient_id: number;
  patient_name?: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  payment_method: string;
  status: 'paid' | 'pending';
  date: string;
  created_at: string;
}

export interface Package {
  id: number;
  patient_id: number;
  name: string;
  total_sessions: number;
  used_sessions: number;
  created_at: string;
}
