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
  patient_id: number | null;
  patient_name?: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  payment_method: string;
  status: 'paid' | 'pending';
  date: string;
  created_at: string;
  
  // Advanced fields
  category?: string;
  cost_center?: string;
  responsible?: string;
  apportionment?: string; // JSON array of cost centers/portions
  installments?: string;
  account_card?: string;
  due_date?: string;
  competency_date?: string;
}

export interface Wallet {
  id: number;
  name: string;
  type: string;
  balance: number;
  bank_name?: string;
  created_at?: string;
}

export interface CreditCard {
  id: number;
  name: string;
  invoice_amount: number;
  available_limit: number;
  created_at?: string;
}

export interface Package {
  id: number;
  patient_id: number;
  name: string;
  total_sessions: number;
  used_sessions: number;
  created_at: string;
}

export interface CatalogItem {
  id: number;
  type: 'service' | 'product';
  name: string;
  description: string;
  unit_price: number;
  unit_type: string; // 'unidade', 'ml', 'sessão'
  stock?: number;
  created_at: string;
}

export interface BudgetItem {
  id: number;
  budget_id: number;
  item_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  name?: string;
  type?: string;
  unit_type?: string;
}

export interface Budget {
  id: number;
  patient_id: number;
  total_amount: number;
  status: 'draft' | 'approved' | 'rejected';
  notes: string;
  created_at: string;
  items?: BudgetItem[];
}

