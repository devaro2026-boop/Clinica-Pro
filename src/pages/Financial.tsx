import { useState, useEffect } from 'react';
import { FinancialRecord, Patient } from '../types';
import { Plus, ArrowDownCircle, ArrowUpCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';
import NotificationBell from '../components/NotificationBell';

export default function Financial() {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: '',
    description: '',
    amount: '',
    type: 'income',
    payment_method: 'Cartão de Crédito',
    status: 'paid',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchData = async () => {
    try {
      const [fRes, pRes] = await Promise.all([
        fetch('/api/financial'),
        fetch('/api/patients')
      ]);
      setRecords(await fRes.json());
      setPatients(await pRes.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/financial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, patient_id: Number(formData.patient_id) || null })
    });
    setShowForm(false);
    fetchData();
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/financial/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, payment_method: records.find(r => r.id === id)?.payment_method })
    });
    fetchData();
  };

  const totalIncome = records.filter(r => r.type === 'income' && r.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Financeiro</h2>
          <p className="text-gray-500 mt-2">Controle de receitas e recebimentos</p>
        </div>
        <div className="flex items-center space-x-4">
          <NotificationBell />
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
             <ArrowUpCircle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Receitas Pagas</p>
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}
            </p>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paciente (Opcional)</label>
              <select className="w-full p-2.5 border border-gray-300 rounded-xl outline-none bg-white" value={formData.patient_id} onChange={e => setFormData({...formData, patient_id: e.target.value})}>
                <option value="">Nenhum</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input required type="text" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
              <input required type="number" step="0.01" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
              <select className="w-full p-2.5 border border-gray-300 rounded-xl outline-none bg-white" value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})}>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Boleto">Boleto</option>
                <option value="Pix">Pix</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="w-full p-2.5 border border-gray-300 rounded-xl outline-none bg-white" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors">
                Salvar Lançamento
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 font-semibold text-gray-600 text-sm">Data</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Descrição</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Paciente</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Forma Pgto</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Valor</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 text-gray-500">{r.date}</td>
                  <td className="p-4 font-medium text-gray-900">{r.description}</td>
                  <td className="p-4 text-gray-500">{r.patient_name || '-'}</td>
                  <td className="p-4 text-gray-500">{r.payment_method}</td>
                  <td className="p-4 font-semibold text-gray-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.amount)}
                  </td>
                  <td className="p-4">
                    {r.status === 'paid' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-green-100 text-green-800">
                        Pago
                      </span>
                    ) : (
                      <button 
                        onClick={() => updateStatus(r.id, 'paid')}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                        title="Marcar como Pago"
                      >
                        Pendente
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">Nenhum lançamento encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
