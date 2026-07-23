import { useState, useEffect } from 'react';
import { Patient } from '../types';
import { Link } from 'react-router-dom';
import { Plus, Search, User, Phone } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    birth_date: ''
  });

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients');
      const data = await res.json();
      setPatients(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchPatients(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, clinic_id: 1 })
    });
    setShowForm(false);
    setFormData({ name: '', phone: '', email: '', cpf: '', birth_date: '' });
    fetchPatients();
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="flex justify-between items-center w-full sm:w-auto">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Pacientes</h2>
            <p className="text-sm md:text-base text-gray-500 mt-1 md:mt-2">Gestão de prontuários e histórico</p>
          </div>
          <div className="sm:hidden">
            <NotificationBell />
          </div>
        </div>
        <div className="flex items-center space-x-3 md:space-x-4 w-full sm:w-auto">
          <div className="hidden sm:block">
            <NotificationBell />
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl transition-colors font-medium text-sm md:text-base"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span>Novo Paciente</span>
          </button>
        </div>
      </header>

      {showForm && (
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 md:mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Cadastrar Paciente</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input required type="text" className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone (Whatsapp)</label>
              <input required type="text" placeholder="Ex: 11999999999" className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input type="email" className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input type="text" className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
              <input type="date" className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} />
            </div>
            <div className="md:col-span-2 flex justify-end mt-2">
              <button type="submit" className="w-full md:w-auto bg-gray-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors">
                Salvar Paciente
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <div className="relative max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar pacientes..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <ul className="divide-y divide-gray-50">
          {patients.map(p => (
            <li key={p.id}>
              <Link to={`/patients/${p.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50/50 transition-colors gap-3">
                <div className="flex items-center space-x-3 md:space-x-4">
                  <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                    <User className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm md:text-base font-semibold text-gray-900 truncate">{p.name}</h4>
                    <p className="text-xs md:text-sm text-gray-500 truncate">{p.email || 'Sem e-mail'} <span className="hidden sm:inline">•</span><span className="sm:hidden"><br/></span> {p.cpf || 'Sem CPF'}</p>
                  </div>
                </div>
                <div className="flex items-center text-xs md:text-sm text-gray-500 sm:justify-end pl-13 sm:pl-0">
                  <div className="flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span>{p.phone}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
