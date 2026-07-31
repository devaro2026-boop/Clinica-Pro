import { useState, useEffect, useRef } from 'react';
import { FinancialRecord, Patient } from '../types';
import { Plus, ArrowDownCircle, ArrowUpCircle, Edit3, Trash2, Download, Upload, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import NotificationBell from '../components/NotificationBell';

export default function Financial() {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense' | 'pending'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const payload = { ...formData, patient_id: Number(formData.patient_id) || null };
    if (editingId) {
      await fetch(`/api/financial/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch('/api/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    setShowForm(false);
    setEditingId(null);
    setFormData({
      patient_id: '', description: '', amount: '', type: 'income',
      payment_method: 'Cartão de Crédito', status: 'paid', date: format(new Date(), 'yyyy-MM-dd')
    });
    fetchData();
  };

  const handleEdit = (r: FinancialRecord) => {
    setFormData({
      patient_id: r.patient_id ? String(r.patient_id) : '',
      description: r.description,
      amount: String(r.amount),
      type: r.type,
      payment_method: r.payment_method,
      status: r.status,
      date: r.date
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
      await fetch(`/api/financial/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const updateStatus = async (id: number, status: string) => {
    const rec = records.find(r => r.id === id);
    if (!rec) return;
    await fetch(`/api/financial/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rec, status })
    });
    fetchData();
  };

  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/backup');
      const backupData = await res.json();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-estetica-salao-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erro ao gerar backup.');
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Atenção: A restauração substituirá todos os dados atuais pelos dados do backup. Deseja continuar?')) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json)
        });
        if (res.ok) {
          alert('Backup restaurado com sucesso!');
          fetchData();
        } else {
          alert('Erro ao restaurar backup.');
        }
      } catch (err) {
        alert('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredRecords = records.filter(r => {
    if (activeTab === 'income') return r.type === 'income';
    if (activeTab === 'expense') return r.type === 'expense';
    if (activeTab === 'pending') return r.status === 'pending';
    return true;
  });

  const totalIncomePaid = records.filter(r => r.type === 'income' && r.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpensePaid = records.filter(r => r.type === 'expense' && r.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
  const totalPendingReceive = records.filter(r => r.type === 'income' && r.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
  const totalPendingPay = records.filter(r => r.type === 'expense' && r.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
  const netBalance = totalIncomePaid - totalExpensePaid;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="flex justify-between items-center w-full sm:w-auto">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Financeiro & Caixa</h2>
            <p className="text-sm md:text-base text-gray-500 mt-1 md:mt-2">Contas a pagar, receber, fluxo de caixa e backup</p>
          </div>
          <div className="sm:hidden">
            <NotificationBell />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full sm:w-auto">
          <button
            onClick={handleExportBackup}
            className="flex items-center space-x-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-xl text-xs md:text-sm font-medium transition-colors shadow-sm"
            title="Exportar Backup dos Dados"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span>Backup</span>
          </button>
          
          <label className="flex items-center space-x-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-xl text-xs md:text-sm font-medium transition-colors shadow-sm cursor-pointer" title="Restaurar Backup">
            <Upload className="w-4 h-4 text-gray-500" />
            <span>Restaurar</span>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
          </label>

          <button 
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) {
                setEditingId(null);
                setFormData({
                  patient_id: '', description: '', amount: '', type: 'income',
                  payment_method: 'Cartão de Crédito', status: 'paid', date: format(new Date(), 'yyyy-MM-dd')
                });
              }
            }}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors font-medium text-xs md:text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
          
          <div className="hidden sm:block">
            <NotificationBell />
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 md:mb-8">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
             <ArrowUpCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Receitas Recebidas</p>
            <p className="text-lg font-bold text-gray-900 truncate">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncomePaid)}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
             <ArrowDownCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Despesas Pagas</p>
            <p className="text-lg font-bold text-gray-900 truncate">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpensePaid)}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
             <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Saldo em Caixa</p>
            <p className={`text-lg font-bold truncate ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netBalance)}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
             <ArrowUpCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">A Receber (Pendente)</p>
            <p className="text-lg font-bold text-yellow-600 truncate">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendingReceive)}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
             <ArrowDownCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">A Pagar (Pendente)</p>
            <p className="text-lg font-bold text-orange-600 truncate">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendingPay)}
            </p>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{editingId ? 'Editar Lançamento' : 'Novo Lançamento (Receita ou Despesa)'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select className="w-full p-2.5 border border-gray-300 rounded-xl outline-none bg-white text-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="income">Receita (Contas a Receber)</option>
                <option value="expense">Despesa (Contas a Pagar)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input required type="text" placeholder="Ex: Venda de Produto / Aluguel" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none text-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
              <input required type="number" step="0.01" placeholder="0.00" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none text-sm" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente / Fornecedor (Opcional)</label>
              <select className="w-full p-2.5 border border-gray-300 rounded-xl outline-none bg-white text-sm" value={formData.patient_id} onChange={e => setFormData({...formData, patient_id: e.target.value})}>
                <option value="">Nenhum</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
              <select className="w-full p-2.5 border border-gray-300 rounded-xl outline-none bg-white text-sm" value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})}>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Boleto">Boleto</option>
                <option value="Pix">Pix</option>
                <option value="Transferência">Transferência</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="w-full p-2.5 border border-gray-300 rounded-xl outline-none bg-white text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="paid">Pago / Recebido</option>
                <option value="pending">Pendente (A Pagar / Receber)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input required type="date" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm shadow-sm">
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-gray-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
        >
          Todos os Lançamentos ({records.length})
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'income' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
        >
          Receitas ({records.filter(r => r.type === 'income').length})
        </button>
        <button
          onClick={() => setActiveTab('expense')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'expense' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
        >
          Despesas ({records.filter(r => r.type === 'expense').length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
        >
          Pendentes ({records.filter(r => r.status === 'pending').length})
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
            <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm border-b border-gray-100">
              <tr>
                <th className="p-3 md:p-4 font-semibold text-gray-600 text-xs md:text-sm">Tipo</th>
                <th className="p-3 md:p-4 font-semibold text-gray-600 text-xs md:text-sm">Data</th>
                <th className="p-3 md:p-4 font-semibold text-gray-600 text-xs md:text-sm">Descrição</th>
                <th className="p-3 md:p-4 font-semibold text-gray-600 text-xs md:text-sm">Cliente / Fornecedor</th>
                <th className="p-3 md:p-4 font-semibold text-gray-600 text-xs md:text-sm">Forma Pgto</th>
                <th className="p-3 md:p-4 font-semibold text-gray-600 text-xs md:text-sm">Valor</th>
                <th className="p-3 md:p-4 font-semibold text-gray-600 text-xs md:text-sm">Status</th>
                <th className="p-3 md:p-4 font-semibold text-gray-600 text-xs md:text-sm text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs md:text-sm">
              {filteredRecords.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    {r.type === 'income' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-700">
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        <span>Receita</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-700">
                        <ArrowDownCircle className="w-3.5 h-3.5" />
                        <span>Despesa</span>
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-gray-500">{r.date}</td>
                  <td className="p-4 font-medium text-gray-900">{r.description}</td>
                  <td className="p-4 text-gray-500">{r.patient_name || '-'}</td>
                  <td className="p-4 text-gray-500">{r.payment_method}</td>
                  <td className={`p-4 font-semibold ${r.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {r.type === 'income' ? '+ ' : '- '}
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
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors cursor-pointer"
                        title="Clique para marcar como pago"
                      >
                        Pendente (Quitar)
                      </button>
                    )}
                  </td>
                  <td className="p-4 text-right flex justify-end space-x-2">
                    <button onClick={() => handleEdit(r)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">Nenhum lançamento encontrado nesta categoria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
