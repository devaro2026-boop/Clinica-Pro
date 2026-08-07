import { useState, useEffect, useRef } from 'react';
import { FinancialRecord, Patient, Wallet, CreditCard } from '../types';
import { 
  Plus, ArrowDownCircle, ArrowUpCircle, Edit3, Trash2, Download, Upload, Wallet as WalletIcon, 
  CreditCard as CreditCardIcon, Check, MoreVertical, AlertTriangle, Calendar, ChevronDown, Info, 
  HelpCircle, Sliders, DollarSign, RefreshCw 
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import NotificationBell from '../components/NotificationBell';
import TransactionFormModal from '../components/TransactionFormModal';
import ReconciliationModal from '../components/ReconciliationModal';

export default function Financial() {
  const [activeTab, setActiveTab] = useState<'fluxo' | 'carteiras' | 'cartoes'>('fluxo');
  
  // Data States
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  
  // Form/Modal States
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [activeReconciliationWallet, setActiveReconciliationWallet] = useState<Wallet | null>(null);
  
  // CRUD state for Wallets
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState('conta corrente');
  const [walletBalance, setWalletBalance] = useState('');

  // CRUD state for Credit Cards
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [cardName, setCardName] = useState('');
  const [cardInvoice, setCardInvoice] = useState('');
  const [cardLimit, setCardLimit] = useState('');

  // Dropdown menu states
  const [activeWalletMenu, setActiveWalletMenu] = useState<number | null>(null);
  const [activeCardMenu, setActiveCardMenu] = useState<number | null>(null);

  // Cash Flow ledger filter tab
  const [ledgerSubTab, setLedgerSubTab] = useState<'all' | 'income' | 'expense' | 'pending'>('all');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all financial dashboard data
  const fetchData = async () => {
    try {
      const [fRes, pRes, wRes, cRes] = await Promise.all([
        fetch('/api/financial'),
        fetch('/api/patients'),
        fetch('/api/wallets'),
        fetch('/api/credit-cards')
      ]);
      setRecords(await fRes.json());
      setPatients(await pRes.json());
      setWallets(await wRes.json());
      setCreditCards(await cRes.json());
    } catch (e) { 
      console.error("Error loading financial data:", e); 
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  // Submit main transaction (Nova entrada / Nova saída)
  const handleSaveTransaction = async (data: any, saveAndNew: boolean) => {
    try {
      const method = editingRecord ? 'PUT' : 'POST';
      const url = editingRecord ? `/api/financial/${editingRecord.id}` : '/api/financial';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error("Erro ao salvar lançamento.");

      if (!saveAndNew) {
        setShowTransactionModal(false);
        setEditingRecord(null);
      }
      fetchData();
    } catch (err) {
      alert("Houve um problema ao salvar este lançamento.");
    }
  };

  const handleEditTransaction = (r: FinancialRecord) => {
    setEditingRecord(r);
    setShowTransactionModal(true);
  };

  const handleDeleteTransaction = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir permanentemente este lançamento do fluxo de caixa?')) {
      await fetch(`/api/financial/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleUpdateStatus = async (id: number, status: 'paid' | 'pending') => {
    await fetch(`/api/financial/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchData();
  };

  // Wallet Actions (Create, Update, Delete)
  const handleSaveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName.trim()) return;

    const payload = {
      name: walletName,
      type: walletType,
      balance: parseFloat(walletBalance) || 0,
      bank_name: walletName.split(' ')[0]
    };

    try {
      if (editingWallet) {
        await fetch(`/api/wallets/${editingWallet.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/wallets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      setShowWalletModal(false);
      setEditingWallet(null);
      setWalletName('');
      setWalletBalance('');
      fetchData();
    } catch (err) {
      alert("Erro ao salvar conta bancária.");
    }
  };

  const handleEditWallet = (w: Wallet) => {
    setEditingWallet(w);
    setWalletName(w.name);
    setWalletType(w.type);
    setWalletBalance(String(w.balance));
    setShowWalletModal(true);
    setActiveWalletMenu(null);
  };

  const handleDeleteWallet = async (id: number) => {
    if (confirm('Deseja excluir esta conta/carteira financeira? Isso não apagará os lançamentos vinculados.')) {
      await fetch(`/api/wallets/${id}`, { method: 'DELETE' });
      fetchData();
    }
    setActiveWalletMenu(null);
  };

  // Credit Card Actions
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim()) return;

    const payload = {
      name: cardName,
      invoice_amount: parseFloat(cardInvoice) || 0,
      available_limit: parseFloat(cardLimit) || 0
    };

    try {
      if (editingCard) {
        await fetch(`/api/credit-cards/${editingCard.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/credit-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      setShowCardModal(false);
      setEditingCard(null);
      setCardName('');
      setCardInvoice('');
      setCardLimit('');
      fetchData();
    } catch (err) {
      alert("Erro ao salvar cartão.");
    }
  };

  const handleEditCard = (c: CreditCard) => {
    setEditingCard(c);
    setCardName(c.name);
    setCardInvoice(String(c.invoice_amount));
    setCardLimit(String(c.available_limit));
    setShowCardModal(true);
    setActiveCardMenu(null);
  };

  const handleDeleteCard = async (id: number) => {
    if (confirm('Deseja excluir este cartão de crédito?')) {
      await fetch(`/api/credit-cards/${id}`, { method: 'DELETE' });
      fetchData();
    }
    setActiveCardMenu(null);
  };

  // Reconciliation processing
  const handleProcessReconciliation = async (reconciledItems: any[]) => {
    for (const item of reconciledItems) {
      if (item.matchedId) {
        // Updated pending entry to paid
        await fetch(`/api/financial/${item.matchedId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'paid', account_card: activeReconciliationWallet?.name })
        });
      } else {
        // Created new entry
        await fetch('/api/financial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      }
    }
    fetchData();
  };

  // Backup & Restore
  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/backup');
      const backupData = await res.json();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-estetica-gestto-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erro ao gerar backup.');
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Atenção: A restauração substituirá todos os dados atuais do caixa. Deseja continuar?')) return;
    
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

  // Filter accounts due this week (Contas a pagar / receber na semana)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const getWeeklyDues = (type: 'income' | 'expense') => {
    return records.filter(r => {
      if (r.type !== type || r.status !== 'pending') return false;
      try {
        const recordDate = parseISO(r.date);
        return isWithinInterval(recordDate, { start: weekStart, end: weekEnd });
      } catch (err) {
        return false;
      }
    });
  };

  const weeklyExpensesPending = getWeeklyDues('expense');
  const weeklyIncomesPending = getWeeklyDues('income');

  const sumRecords = (list: FinancialRecord[]) => list.reduce((acc, curr) => acc + curr.amount, 0);

  const weeklyExpensesTotal = sumRecords(weeklyExpensesPending);
  const weeklyIncomesTotal = sumRecords(weeklyIncomesPending);

  // General Summary Metrics (from DB)
  const totalIncomePaid = records.filter(r => r.type === 'income' && r.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpensePaid = records.filter(r => r.type === 'expense' && r.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
  const totalPendingReceive = records.filter(r => r.type === 'income' && r.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
  const totalPendingPay = records.filter(r => r.type === 'expense' && r.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
  const netBalance = totalIncomePaid - totalExpensePaid;

  // Filter Cash Flow table
  const filteredRecords = records.filter(r => {
    if (ledgerSubTab === 'income') return r.type === 'income';
    if (ledgerSubTab === 'expense') return r.type === 'expense';
    if (ledgerSubTab === 'pending') return r.status === 'pending';
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Top Page Header */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-4 border-b border-gray-100">
        <div className="text-left">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Financeiro & Caixa</h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Controle mestre de fluxo de caixa, conciliação de contas bancárias e cartões.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Backup Operations */}
          <button
            onClick={handleExportBackup}
            className="flex items-center space-x-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs"
            title="Exportar Backup de Caixa"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Backup</span>
          </button>
          
          <label className="flex items-center space-x-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer" title="Restaurar Backup">
            <Upload className="w-3.5 h-3.5 text-gray-500" />
            <span>Restaurar</span>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
          </label>

          <button 
            onClick={() => {
              setEditingRecord(null);
              setShowTransactionModal(true);
            }}
            className="flex items-center space-x-1.5 bg-[#8c7457] hover:bg-[#735e45] text-white px-4 py-2 rounded-xl font-bold text-xs transition-colors shadow-md shadow-[#8c7457]/10"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
          
          <div className="ml-1">
            <NotificationBell />
          </div>
        </div>
      </header>

      {/* Main Stats Summary Cards Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Balanço Mensal */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4 text-left">
          <div className="p-3 bg-[#8c7457]/10 text-[#8c7457] rounded-xl">
            <WalletIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Saldo em Caixa</p>
            <p className={`text-lg font-black mt-0.5 ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netBalance)}
            </p>
          </div>
        </div>

        {/* Contas a pagar na semana */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between text-left">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-500 rounded-xl">
              <ArrowDownCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pagar na Semana</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-gray-400 text-xs font-bold">{weeklyExpensesPending.length}</span>
                <p className="text-lg font-black mt-0.5 text-gray-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(weeklyExpensesTotal)}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('fluxo');
              setLedgerSubTab('pending');
            }}
            className="text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100/80 border border-red-100 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shrink-0"
          >
            Resolver
          </button>
        </div>

        {/* Contas a receber na semana */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between text-left">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-500 rounded-xl">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Receber na Semana</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-gray-400 text-xs font-bold">{weeklyIncomesPending.length}</span>
                <p className="text-lg font-black mt-0.5 text-gray-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(weeklyIncomesTotal)}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('fluxo');
              setLedgerSubTab('pending');
            }}
            className="text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100/80 border border-green-100 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shrink-0"
          >
            Resolver
          </button>
        </div>

        {/* Balanço do Mês Metrics Box */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-center text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Balanço do Mês (Realizado)</p>
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-[11px] font-bold text-gray-500">Entradas: <b className="text-emerald-600">+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncomePaid)}</b></span>
            <span className="text-[11px] font-bold text-gray-500">Saídas: <b className="text-red-500">-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpensePaid)}</b></span>
          </div>
        </div>

      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex space-x-2 border-b border-gray-100 pb-px overflow-x-auto text-left">
        <button
          onClick={() => setActiveTab('fluxo')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
            activeTab === 'fluxo' 
              ? 'text-[#8c7457] border-b-2 border-[#8c7457]' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Fluxo de Caixa
        </button>
        <button
          onClick={() => setActiveTab('carteiras')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
            activeTab === 'carteiras' 
              ? 'text-[#8c7457] border-b-2 border-[#8c7457]' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Contas e Carteiras ({wallets.length})
        </button>
        <button
          onClick={() => setActiveTab('cartoes')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
            activeTab === 'cartoes' 
              ? 'text-[#8c7457] border-b-2 border-[#8c7457]' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Cartões de Crédito ({creditCards.length})
        </button>
      </div>

      {/* ------------------------------------------- */}
      {/* VIEW PANEL: TAB 1 - FLOW OF CASH (Fluxo de caixa) */}
      {/* ------------------------------------------- */}
      {activeTab === 'fluxo' && (
        <div className="space-y-4">
          
          {/* Sub-Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setLedgerSubTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  ledgerSubTab === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Todos os lançamentos ({records.length})
              </button>
              <button
                onClick={() => setLedgerSubTab('income')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  ledgerSubTab === 'income' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-500 hover:text-gray-950'
                }`}
              >
                Receitas ({records.filter(r => r.type === 'income').length})
              </button>
              <button
                onClick={() => setLedgerSubTab('expense')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  ledgerSubTab === 'expense' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-500 hover:text-gray-950'
                }`}
              >
                Despesas ({records.filter(r => r.type === 'expense').length})
              </button>
              <button
                onClick={() => setLedgerSubTab('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  ledgerSubTab === 'pending' ? 'bg-white text-amber-700 shadow-xs' : 'text-gray-500 hover:text-gray-950'
                }`}
              >
                Pendentes ({records.filter(r => r.status === 'pending').length})
              </button>
            </div>

            <div className="text-[11px] text-gray-400 font-semibold flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#8c7457]" />
              <span>Clique em um lançamento pendente para quitá-lo rapidamente.</span>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs text-left">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Tipo</th>
                    <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Data Competência</th>
                    <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Descrição</th>
                    <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Cliente / Fornecedor</th>
                    <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Categoria</th>
                    <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Conta Origem</th>
                    <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Valor</th>
                    <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Status</th>
                    <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-400 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredRecords.map(r => (
                    <tr key={r.id} className="hover:bg-[#fbf9f5]/20 transition-colors">
                      <td className="p-4">
                        {r.type === 'income' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-green-50 text-green-700">
                            <ArrowUpCircle className="w-3.5 h-3.5 shrink-0 text-green-500" />
                            <span>Receita</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-red-50 text-red-700">
                            <ArrowDownCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                            <span>Despesa</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-500 font-semibold">
                        {r.competency_date ? r.competency_date.split('-').reverse().join('/') : r.date.split('-').reverse().join('/')}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-gray-800">{r.description}</span>
                          {r.cost_center && (
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Centro de Custo: {r.cost_center}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-600 font-medium">
                        {r.patient_name || '-'}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-bold text-[10px]">
                          {r.category || 'Outros'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 font-semibold">
                        {r.account_card || 'Caixa Geral'}
                      </td>
                      <td className={`p-4 font-extrabold ${r.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {r.type === 'income' ? '+ ' : '- '}
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.amount)}
                      </td>
                      <td className="p-4">
                        {r.status === 'paid' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                            Pago
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleUpdateStatus(r.id, 'paid')}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors cursor-pointer border border-transparent hover:border-yellow-300"
                            title="Clique para quitar transação"
                          >
                            Pendente (Quitar)
                          </button>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={() => handleEditTransaction(r)} 
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteTransaction(r.id)} 
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 font-semibold">
                        Nenhum lançamento encontrado nesta sub-categoria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------- */}
      {/* VIEW PANEL: TAB 2 - WALLETS & ACCOUNTS (Contas e carteiras) */}
      {/* ------------------------------------------- */}
      {activeTab === 'carteiras' && (
        <div className="space-y-4">
          
          {/* Header row inside view */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-800">Contas e carteiras homologadas</h3>
            <button
              onClick={() => {
                setEditingWallet(null);
                setWalletName('');
                setWalletBalance('');
                setWalletType('conta corrente');
                setShowWalletModal(true);
              }}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar conta</span>
            </button>
          </div>

          {/* Wallets Grid Layout (Screenshot 3 style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wallets.map(w => (
              <div 
                key={w.id} 
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between hover:border-gray-200 transition-all relative group text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Visual Bank Wallet Avatar Icon */}
                    <div className="p-3 bg-gray-50 group-hover:bg-[#8c7457]/5 rounded-xl text-gray-600 group-hover:text-[#8c7457] transition-colors shrink-0">
                      <WalletIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-xs md:text-sm line-clamp-1">{w.name}</h4>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">({w.type})</span>
                    </div>
                  </div>

                  {/* Settings dropdown trigger */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveWalletMenu(activeWalletMenu === w.id ? null : w.id)}
                      className="p-1 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {activeWalletMenu === w.id && (
                      <div className="absolute right-0 mt-1.5 w-32 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 text-left">
                        <button
                          onClick={() => handleEditWallet(w)}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteWallet(w.id)}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Balance and Conciliation Action */}
                <div className="mt-5 flex items-end justify-between border-t border-gray-50 pt-3">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">Saldo atual</span>
                    <p className={`text-base font-extrabold mt-0.5 ${
                      w.balance >= 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(w.balance)}
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveReconciliationWallet(w)}
                    className="bg-white border border-gray-200 hover:border-[#8c7457] text-[#8c7457] hover:bg-[#fbf9f5] font-bold px-4 py-1.5 rounded-xl text-[11px] transition-all cursor-pointer shadow-2xs"
                  >
                    Conciliar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------- */}
      {/* VIEW PANEL: TAB 3 - CREDIT CARDS (Cartões de crédito) */}
      {/* ------------------------------------------- */}
      {activeTab === 'cartoes' && (
        <div className="space-y-4">
          
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-800">Cartões corporativos credenciados</h3>
            <button
              onClick={() => {
                setEditingCard(null);
                setCardName('');
                setCardInvoice('');
                setCardLimit('');
                setShowCardModal(true);
              }}
              className="flex items-center space-x-1.5 bg-[#8c7457] hover:bg-[#735e45] text-white px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar cartão</span>
            </button>
          </div>

          {/* Credit Cards Widgets (Screenshot 4 style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {creditCards.map(c => (
              <div 
                key={c.id}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between hover:border-gray-200 transition-all text-left relative group"
              >
                
                {/* Brand and settings */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <CreditCardIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900">{c.name}</h4>
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Corporativo Gold</span>
                    </div>
                  </div>

                  {/* Option menu */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveCardMenu(activeCardMenu === c.id ? null : c.id)}
                      className="p-1 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {activeCardMenu === c.id && (
                      <div className="absolute right-0 mt-1.5 w-32 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 text-left">
                        <button
                          onClick={() => handleEditCard(c)}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCard(c.id)}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 mt-6 border-t border-gray-50 pt-4">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">Fatura Atual</span>
                    <span className="text-base font-extrabold mt-0.5 text-gray-800">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.invoice_amount)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">Limite Disponível</span>
                    <span className={`text-base font-extrabold mt-0.5 ${
                      c.available_limit >= 0 ? 'text-gray-700' : 'text-red-500'
                    }`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.available_limit)}
                    </span>
                  </div>
                </div>

                {/* Visual Card Limit Meter */}
                <div className="mt-4 space-y-1">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        c.available_limit < 0 ? 'bg-red-500' : 'bg-indigo-500'
                      }`}
                      style={{ 
                        width: `${Math.min(100, Math.max(0, (c.available_limit / (c.available_limit + c.invoice_amount || 10000)) * 100))}%` 
                      }}
                    />
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------- */}
      {/* MODAL: TRANSACTION CREATOR/EDIT (TransactionFormModal) */}
      {/* ------------------------------------------- */}
      <TransactionFormModal
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveTransaction}
        editingRecord={editingRecord}
        patients={patients}
        wallets={wallets}
      />

      {/* ------------------------------------------- */}
      {/* MODAL: RECONCILIATION PROCESSOR (ReconciliationModal) */}
      {/* ------------------------------------------- */}
      <ReconciliationModal
        isOpen={activeReconciliationWallet !== null}
        onClose={() => setActiveReconciliationWallet(null)}
        wallet={activeReconciliationWallet}
        records={records}
        onReconcile={handleProcessReconciliation}
      />

      {/* ------------------------------------------- */}
      {/* MODAL: WALLET ADD/EDIT (Conta e Carteira) */}
      {/* ------------------------------------------- */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-left">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm md:text-base">
                {editingWallet ? 'Editar Conta Bancária' : 'Adicionar Nova Conta'}
              </h3>
              <button onClick={() => setShowWalletModal(false)} className="p-1 hover:bg-gray-50 rounded-lg">
                <XIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSaveWallet} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Nome da Conta / Banco</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Banco do Brasil, PAGCORP, Bradesco"
                  value={walletName}
                  onChange={e => setWalletName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#c5b49f] font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Tipo da Conta</label>
                <select
                  value={walletType}
                  onChange={e => setWalletType(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#c5b49f] font-semibold"
                >
                  <option value="conta corrente">Conta Corrente</option>
                  <option value="outros">Carteira Digital (Outros)</option>
                  <option value="poupança">Poupança</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Saldo Inicial (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={walletBalance}
                  onChange={e => setWalletBalance(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#c5b49f] font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#8c7457] hover:bg-[#735e45] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md mt-2 cursor-pointer"
              >
                {editingWallet ? 'Salvar Alterações' : 'Cadastrar Conta'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------- */}
      {/* MODAL: CREDIT CARD ADD/EDIT */}
      {/* ------------------------------------------- */}
      {showCardModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-left">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm md:text-base">
                {editingCard ? 'Editar Limites do Cartão' : 'Cadastrar Novo Cartão'}
              </h3>
              <button onClick={() => setShowCardModal(false)} className="p-1 hover:bg-gray-50 rounded-lg">
                <XIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSaveCard} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Nome do Cartão / Emissor</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: CARTÃO ITAU BUSINESS"
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#c5b49f] font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Fatura Atual (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cardInvoice}
                  onChange={e => setCardInvoice(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#c5b49f] font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Limite Disponível (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cardLimit}
                  onChange={e => setCardLimit(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#c5b49f] font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#8c7457] hover:bg-[#735e45] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md mt-2 cursor-pointer"
              >
                {editingCard ? 'Salvar Alterações' : 'Cadastrar Cartão'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline mini X icon for simplicity inside local modals
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
