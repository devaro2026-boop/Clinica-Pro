import React, { useState, useEffect } from 'react';
import { 
  Sparkles, ArrowRight, Shield, Globe, ExternalLink, Mail, Lock, 
  Building, Layers, Database, Key, Send, Search, RefreshCw, 
  AlertTriangle, CheckCircle2, DollarSign, Users, Trash, ShieldAlert,
  UserCheck
} from 'lucide-react';

interface Clinic {
  id: number;
  name: string;
  slug: string;
  admin_email: string;
  admin_password?: string;
  db_url: string | null;
  db_token: string | null;
  billing_status: 'pago' | 'atraso' | 'pendente';
  billing_due_date: string | null;
  billing_last_paid: string | null;
  is_blocked: number;
  created_at: string;
}

// Allowed accounts for super-admin Hub access
const ALLOWED_GOOGLE_ACCOUNTS = [
  'devaro2026@gmail.com',
  'financeiro@gestto.com'
];

export default function Landpage() {
  // Google Auth Session state (simulation of Firebase Auth state change)
  const [googleUser, setGoogleUser] = useState<string | null>(() => {
    return localStorage.getItem('gestto_hub_google_user');
  });

  // Login Form states for secure access control
  const [loginEmail, setLoginEmail] = useState('devaro2026@gmail.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // New Clinic Form State
  const [regName, setRegName] = useState('');
  const [regSlug, setRegSlug] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDbUrl, setRegDbUrl] = useState('');
  const [regDbToken, setRegDbToken] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  // Editing Clinic State
  const [editingClinicId, setEditingClinicId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDbUrl, setEditDbUrl] = useState('');
  const [editDbToken, setEditDbToken] = useState('');
  const [editStatus, setEditStatus] = useState<'pago' | 'atraso' | 'pendente'>('pago');
  const [editDueDate, setEditDueDate] = useState('');
  const [editIsBlocked, setEditIsBlocked] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Message Sending State
  const [msgTarget, setMsgTarget] = useState<'all' | string>('all');
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgType, setMsgType] = useState<'announcement' | 'billing'>('announcement');
  const [msgSuccess, setMsgSuccess] = useState(false);
  const [msgError, setMsgError] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Load clinics list on mount/auth change
  const fetchClinics = () => {
    setLoading(true);
    fetch('/api/hub/clinics')
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: Clinic[]) => {
        if (Array.isArray(data)) {
          setClinics(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (googleUser) {
      fetchClinics();
    }
  }, [googleUser]);

  // Handle Hub Login via API validation
  const handleHubLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('Por favor, selecione seu e-mail e digite a senha.');
      return;
    }
    setLoginError('');
    setLoggingIn(true);

    try {
      const res = await fetch('/api/hub/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao efetuar login.');
      }

      localStorage.setItem('gestto_hub_google_user', data.email);
      setGoogleUser(data.email);
      setLoginPassword('');
    } catch (err: any) {
      setLoginError(err.message || 'Erro ao conectar com o servidor.');
    } finally {
      setLoggingIn(false);
    }
  };

  // Logout Google Account
  const handleGoogleLogout = () => {
    localStorage.removeItem('gestto_hub_google_user');
    setGoogleUser(null);
    setClinics([]);
    setLoginPassword('');
    setLoginError('');
  };

  // Switch between allowed Google Accounts with re-authentication required
  const handleSwitchAccount = () => {
    const currentIdx = ALLOWED_GOOGLE_ACCOUNTS.indexOf(googleUser || '');
    const nextIdx = (currentIdx + 1) % ALLOWED_GOOGLE_ACCOUNTS.length;
    const nextEmail = ALLOWED_GOOGLE_ACCOUNTS[nextIdx];
    
    localStorage.removeItem('gestto_hub_google_user');
    setGoogleUser(null);
    setClinics([]);
    setLoginEmail(nextEmail);
    setLoginPassword('');
    setLoginError('');
  };

  // Generate slug dynamically
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRegName(val);
    const generated = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    setRegSlug(generated);
  };

  // Handle register submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess(false);

    if (!regName || !regSlug || !regEmail || !regPassword) {
      setRegError('Preencha os campos obrigatórios.');
      return;
    }

    try {
      const res = await fetch('/api/stores/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          slug: regSlug,
          admin_email: regEmail,
          admin_password: regPassword,
          db_url: regDbUrl || null,
          db_token: regDbToken || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || 'Erro ao registrar clínica.');
        return;
      }

      setRegSuccess(true);
      setRegName('');
      setRegSlug('');
      setRegEmail('');
      setRegPassword('');
      setRegDbUrl('');
      setRegDbToken('');
      fetchClinics();
    } catch (err) {
      setRegError('Erro de conexão ao criar clínica.');
    }
  };

  // Handle editing modal trigger
  const handleStartEdit = (clinic: Clinic) => {
    setEditingClinicId(clinic.id);
    setEditName(clinic.name);
    setEditDbUrl(clinic.db_url || '');
    setEditDbToken(clinic.db_token || '');
    setEditStatus(clinic.billing_status || 'pago');
    setEditDueDate(clinic.billing_due_date || '');
    setEditIsBlocked(clinic.is_blocked === 1);
    setEditSuccess(false);
    setConfirmDeleteId(null);
  };

  // Handle edit submission
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSuccess(false);

    try {
      const res = await fetch(`/api/hub/clinics/${editingClinicId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          db_url: editDbUrl || null,
          db_token: editDbToken || null,
          billing_status: editStatus,
          billing_due_date: editDueDate || null,
          is_blocked: editIsBlocked ? 1 : 0
        })
      });

      if (res.ok) {
        setEditSuccess(true);
        setTimeout(() => {
          setEditingClinicId(null);
          fetchClinics();
        }, 1500);
      } else {
        alert("Erro ao salvar alterações da clínica.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    }
  };

  // Handle deleting a clinic from the network
  const handleDeleteClinic = async (id: number) => {
    try {
      const res = await fetch(`/api/hub/clinics/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setEditSuccess(true);
        setTimeout(() => {
          setEditingClinicId(null);
          setConfirmDeleteId(null);
          fetchClinics();
        }, 1500);
      } else {
        alert(data.error || "Erro ao excluir clínica.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    }
  };

  // Handle message sending
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgSuccess(false);
    setMsgError('');
    setSendingMsg(true);

    if (!msgTitle || !msgBody) {
      setMsgError('Por favor, preencha o título e a mensagem.');
      setSendingMsg(false);
      return;
    }

    try {
      const res = await fetch('/api/hub/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: msgTarget,
          title: msgTitle,
          message: msgBody,
          type: msgType
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMsgSuccess(true);
        setMsgTitle('');
        setMsgBody('');
      } else {
        setMsgError(data.error || 'Erro ao enviar aviso.');
      }
    } catch (err) {
      setMsgError('Erro de conexão ao enviar aviso.');
    } finally {
      setSendingMsg(false);
    }
  };

  // Filter clinics based on search query
  const filteredClinics = clinics.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.admin_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics calculations
  const totalClinics = clinics.length;
  const activeClinics = clinics.filter(c => c.is_blocked === 0).length;
  const blockedClinics = clinics.filter(c => c.is_blocked === 1).length;
  const estimatedRevenue = clinics.filter(c => c.billing_status === 'pago').length * 149.90;

  // Unauthenticated Gate view
  if (!googleUser) {
    return (
      <div className="min-h-screen bg-[#faf8f5] text-gray-900 font-sans flex flex-col justify-between">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 py-4">
          <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#cfbea5] via-[#ebdcd0] to-[#dfd3c3] flex items-center justify-center text-[#5c4f3c] font-black text-xl shadow-md">
                G
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight lowercase">gestto</h1>
                <p className="text-[9px] uppercase font-bold text-[#a89070] tracking-wider">Hub Central de Gerenciamento</p>
              </div>
            </div>
            <div className="px-3.5 py-1 bg-amber-50 text-[#8c7457] rounded-full border border-amber-100 text-[10px] font-black uppercase tracking-wider">
              Acesso Restrito
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center py-16 px-6">
          <div className="max-w-md w-full bg-white border border-[#ebdcd0] rounded-3xl shadow-xl shadow-[#ebdcd0]/10 p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[#fbf9f6] border border-[#ebdcd0] flex items-center justify-center mx-auto text-[#8c7457] shadow-sm">
              <Shield className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Hub Central do Gestto</h2>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider leading-relaxed">
                Área Administrativa do Proprietário e Financeiro
              </p>
            </div>

            <p className="text-sm text-gray-500 leading-relaxed font-medium">
              Este domínio hospeda o controle mestre da plataforma Gestto. O acesso é estritamente protegido por login institucional Google.
            </p>

            <form onSubmit={handleHubLogin} className="border-t border-gray-100 pt-6 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Conta Administrativa Google</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALLOWED_GOOGLE_ACCOUNTS.map(email => {
                    const isSelected = loginEmail === email;
                    return (
                      <button
                        key={email}
                        type="button"
                        onClick={() => setLoginEmail(email)}
                        className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all truncate flex flex-col justify-center items-center gap-1 ${
                          isSelected 
                            ? 'bg-[#fbf9f5] border-[#c5b49f] text-[#5c4f3c] ring-2 ring-[#c5b49f]/10' 
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <UserCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-[#8c7457]' : 'text-gray-400'}`} />
                        <span className="truncate max-w-full">{email.split('@')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">E-mail Administrativo</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className="w-full text-xs px-4 py-3 bg-[#fbf9f6] border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#c5b49f] font-semibold"
                  placeholder="Selecione ou digite o e-mail..."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Senha Mestre</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full text-xs px-4 py-3 bg-[#fbf9f6] border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#c5b49f] font-semibold"
                  placeholder="••••••••"
                  required
                />
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full bg-[#8c7457] hover:bg-[#735e45] text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-[#8c7457]/10 disabled:opacity-50"
              >
                <span>{loggingIn ? 'Autenticando...' : 'Acessar Hub Central'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Conexão segura via Firebase Authentication</span>
            </div>
          </div>
        </main>

        <footer className="bg-white border-t border-gray-100 py-6 text-xs text-gray-400 text-center">
          <p>© 2026 Gestto. Plataforma de Clínicas SaaS Multi-Lojas. Todos os direitos reservados.</p>
        </footer>
      </div>
    );
  }

  // Super-Admin Hub Dashboard view
  return (
    <div className="min-h-screen bg-[#faf8f5] text-gray-900 font-sans flex flex-col justify-between">
      {/* Top Header navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#cfbea5] via-[#ebdcd0] to-[#dfd3c3] flex items-center justify-center text-[#5c4f3c] font-black text-xl shadow-md">
              G
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight lowercase">gestto</h1>
              <p className="text-[9px] uppercase font-bold text-[#a89070] tracking-wider">Hub Central de Rede</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Administrador Logado</span>
              <span className="text-xs font-extrabold text-[#5c4f3c]">{googleUser}</span>
            </div>
            <button 
              onClick={handleSwitchAccount}
              className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#8c7457] border border-amber-100 text-xs font-bold rounded-full transition-all shrink-0 flex items-center gap-1.5"
              title="Trocar para outra conta administrativa"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Trocar Conta</span>
            </button>
            <button 
              onClick={handleGoogleLogout}
              className="text-xs text-gray-400 hover:text-red-500 font-bold transition-colors"
            >
              Sair do Hub
            </button>
          </div>
        </div>
      </header>

      {/* Main Stats Summary Row */}
      <section className="bg-white border-b border-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-extrabold text-gray-400 tracking-wider flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-gray-400" />
              Total de Clínicas
            </span>
            <p className="text-2xl font-black text-gray-900">{totalClinics}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-extrabold text-gray-400 tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Clínicas Ativas
            </span>
            <p className="text-2xl font-black text-emerald-600">{activeClinics}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-extrabold text-gray-400 tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              Bloqueadas/Atraso
            </span>
            <p className="text-2xl font-black text-red-600">{blockedClinics}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-extrabold text-gray-400 tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-amber-600" />
              Faturamento Estimado
            </span>
            <p className="text-2xl font-black text-gray-900">R$ {estimatedRevenue.toFixed(2)} <span className="text-[10px] text-gray-400 font-medium">/mês</span></p>
          </div>
        </div>
      </section>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
        
        {/* Left Column: Management Clinics List */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          
          {/* Clinic search bar and Header */}
          <div className="bg-white border border-[#ebdcd0]/60 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Clínicas na Rede Gestto</h3>
              <p className="text-xs text-gray-500 mt-1">Monitore faturamento, configure bancos isolados e gerencie suspensões.</p>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 w-4 h-4 text-gray-400 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar loja ou email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#c5b49f] font-medium"
              />
            </div>
          </div>

          {/* Clinics vertical list (Vertical scroll for economical database display) */}
          <div className="bg-white border border-[#ebdcd0]/60 rounded-3xl p-6 shadow-sm flex-1 flex flex-col justify-between">
            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
              {filteredClinics.length > 0 ? (
                filteredClinics.map(clinic => {
                  const isBlocked = clinic.is_blocked === 1;
                  const formattedDue = clinic.billing_due_date 
                    ? clinic.billing_due_date.split('-').reverse().join('/') 
                    : 'N/A';
                  
                  return (
                    <div 
                      key={clinic.id} 
                      className={`p-4 border rounded-2xl transition-all flex flex-col gap-3 ${
                        isBlocked 
                          ? 'border-red-100 bg-red-50/20' 
                          : clinic.billing_status === 'atraso'
                          ? 'border-amber-100 bg-amber-50/20'
                          : 'border-gray-100 bg-white hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2.5">
                            <h4 className="font-bold text-gray-900 text-sm leading-tight">{clinic.name}</h4>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${
                              isBlocked 
                                ? 'bg-red-100 text-red-700' 
                                : clinic.billing_status === 'pago' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {isBlocked ? 'Bloqueado' : clinic.billing_status === 'pago' ? 'Pago' : 'Atraso'}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider flex flex-wrap gap-x-4">
                            <span>Slug: {clinic.slug}</span>
                            <span>Email: {clinic.admin_email}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {clinic.slug !== 'principal' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirmDeleteId === clinic.id) {
                                  handleDeleteClinic(clinic.id);
                                  setConfirmDeleteId(null);
                                } else {
                                  setConfirmDeleteId(clinic.id);
                                }
                              }}
                              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 border ${
                                confirmDeleteId === clinic.id
                                  ? 'bg-red-600 border-red-600 text-white animate-pulse shadow-sm shadow-red-600/20'
                                  : 'bg-red-50/50 hover:bg-red-50 text-red-600 border-red-100 hover:border-red-200'
                              }`}
                              title="Excluir esta clínica permanentemente"
                            >
                              <Trash className="w-3.5 h-3.5" />
                              <span>{confirmDeleteId === clinic.id ? 'Confirmar?' : 'Excluir'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleStartEdit(clinic)}
                            className="text-xs bg-[#fbf9f6] hover:bg-[#f3eee5] border border-gray-200 hover:border-[#ebdcd0] text-[#5c4f3c] font-bold px-3 py-1.5 rounded-xl transition-all"
                          >
                            Gerenciar
                          </button>
                        </div>
                      </div>

                      {/* Display Database configuration indicator */}
                      <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-gray-500 pt-2 border-t border-gray-50">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Database className="w-3.5 h-3.5" />
                          Database:
                        </span>
                        {clinic.db_url ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                            Customizado (Isolado)
                          </span>
                        ) : (
                          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                            Turso Interno (Compartilhado)
                          </span>
                        )}
                        <span className="text-gray-300">|</span>
                        <span>Vence em: <strong className="text-gray-700">{formattedDue}</strong></span>
                      </div>

                      {/* Direct administrative access links */}
                      <div className="flex items-center space-x-3 text-xs font-bold pt-1">
                        <a 
                          href={`/loja/${clinic.slug}/dashboard`}
                          className="text-[#8c7457] hover:text-[#715c44] flex items-center gap-1"
                        >
                          Painel Loja <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <span className="text-gray-200">|</span>
                        <a 
                          href={`/loja/${clinic.slug}/portal`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          Portal Agendamentos <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-gray-400 font-medium">
                  Nenhuma loja corresponde aos critérios de pesquisa ou cadastrada ainda.
                </div>
              )}
            </div>
            
            <p className="text-[10px] text-gray-400 font-medium mt-4 text-center">
              Rolagem vertical habilitada em todas as listas de dados para economia de processamento e recursos.
            </p>
          </div>
        </div>

        {/* Right Column: Register Form and Messaging tools */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Clinic Registration form */}
          <div className="bg-white border border-[#ebdcd0]/60 rounded-3xl p-6 md:p-8 shadow-sm text-left">
            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Registrar Nova Clínica</h3>
            <p className="text-xs text-gray-500 mt-1 mb-5">Insira dados cadastrais e as credenciais do banco isolado se aplicável.</p>

            {regError && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-xs text-red-600 font-bold mb-4">
                {regError}
              </div>
            )}

            {regSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-xs text-emerald-700 font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Clínica e tabelas criadas com sucesso!</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nome da Clínica / Loja *</label>
                <div className="relative flex items-center">
                  <Building className="absolute left-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={handleNameChange}
                    placeholder="Clínica Sorella"
                    className="w-full text-xs pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Link Amigável (Slug) *</label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#c5b49f] focus-within:bg-white transition-all">
                  <span className="text-[10px] text-gray-400 bg-gray-100/50 px-3 py-2.5 border-r border-gray-200 select-none font-bold">/loja/</span>
                  <input
                    type="text"
                    required
                    value={regSlug}
                    onChange={e => setRegSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                    placeholder="sorella"
                    className="w-full text-xs px-3 py-2 bg-transparent outline-none font-bold text-gray-800 lowercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email Adm *</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="admin@sorella.com"
                    className="w-full text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Senha Adm *</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 mt-2 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#a89070] flex items-center gap-1">
                    <Database className="w-4 h-4" />
                    Banco de Dados Customizado (Opcional)
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Data base URL</label>
                  <div className="relative flex items-center">
                    <Database className="absolute left-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={regDbUrl}
                      onChange={e => setRegDbUrl(e.target.value)}
                      placeholder="libsql://sua-clinica.turso.io"
                      className="w-full text-xs pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-mono text-[10px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Data base Token</label>
                  <div className="relative flex items-center">
                    <Key className="absolute left-3 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={regDbToken}
                      onChange={e => setRegDbToken(e.target.value)}
                      placeholder="Insira o Token do Turso"
                      className="w-full text-xs pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-mono text-[10px]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#a38e74] hover:bg-[#8f7b62] text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-xs uppercase tracking-wider mt-4"
              >
                <span>Criar Clínica na Rede</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Hub Messaging panel */}
          <div className="bg-white border border-[#ebdcd0]/60 rounded-3xl p-6 md:p-8 shadow-sm text-left">
            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Disparador de Mensagens</h3>
            <p className="text-xs text-gray-500 mt-1 mb-5">Envie avisos gerais ou cobranças direto no painel e sininho das lojas.</p>

            {msgSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-xs text-emerald-700 font-bold mb-4">
                Aviso enviado com sucesso para a rede!
              </div>
            )}

            {msgError && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-xs text-red-700 font-bold mb-4">
                {msgError}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Destinatário da Mensagem</label>
                <select
                  value={msgTarget}
                  onChange={e => setMsgTarget(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none font-semibold text-gray-800"
                >
                  <option value="all">Todas as Clínicas Cadastradas</option>
                  {clinics.map(c => (
                    <option key={c.id} value={c.slug}>{c.name} ({c.slug})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tipo de Notificação</label>
                  <select
                    value={msgType}
                    onChange={e => setMsgType(e.target.value as 'announcement' | 'billing')}
                    className="w-full text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none font-semibold text-gray-800"
                  >
                    <option value="announcement">Aviso Geral (Lilás)</option>
                    <option value="billing">Alerta de Cobrança (Vermelho)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Título do Aviso</label>
                  <input
                    type="text"
                    required
                    value={msgTitle}
                    onChange={e => setMsgTitle(e.target.value)}
                    placeholder="Ex: Atualização do Sistema"
                    className="w-full text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Conteúdo da Mensagem</label>
                <textarea
                  required
                  rows={3}
                  value={msgBody}
                  onChange={e => setMsgBody(e.target.value)}
                  placeholder="Escreva a mensagem mestre para a clínica..."
                  className="w-full text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={sendingMsg}
                className="w-full bg-[#a38e74] hover:bg-[#8f7b62] text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
              >
                <Send className="w-4 h-4" />
                <span>{sendingMsg ? 'Enviando avisos...' : 'Disparar para Lojas'}</span>
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Inline Modal/Editor Drawer for Clinic Details (Edit & Block) */}
      {editingClinicId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-gray-100 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative animate-scale-up text-left">
            <div className="bg-[#a38e74] text-white p-6">
              <h3 className="text-lg font-bold">Editar Dados e Faturamento</h3>
              <p className="text-xs opacity-90 mt-1">Gerencie chaves de conexão e bloqueio preventivo.</p>
              <button 
                onClick={() => setEditingClinicId(null)}
                className="absolute top-4 right-4 text-white hover:text-gray-100 font-bold text-sm focus:outline-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {editSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-xs text-emerald-700 font-bold mb-4">
                  Alterações salvas com sucesso! Atualizando rede...
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nome da Clínica</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status de Faturamento</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as 'pago' | 'atraso' | 'pendente')}
                    className="w-full text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none font-semibold text-gray-800"
                  >
                    <option value="pago">Pago (Liberado)</option>
                    <option value="pendente">Pendente (Aviso Prévio)</option>
                    <option value="atraso">Atrasado (Bloqueio)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Data de Vencimento (AAAA-MM-DD)</label>
                  <input
                    type="date"
                    required
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Block/Unblock switch trigger block */}
              <div className="p-4 border border-red-100 bg-red-50/10 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" />
                    Bloqueio do Painel Administrativo
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">Impede totalmente o login e a visualização das agendas.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditIsBlocked(!editIsBlocked)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${editIsBlocked ? 'bg-red-600' : 'bg-gray-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${editIsBlocked ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="border-t border-gray-100 pt-4 mt-2 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#a89070] flex items-center gap-1">
                  <Database className="w-4 h-4" />
                  Credenciais de Banco de Dados Isolado
                </span>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Data base URL</label>
                  <input
                    type="text"
                    value={editDbUrl}
                    onChange={e => setEditDbUrl(e.target.value)}
                    placeholder="Ex: libsql://sua-clinica-isolated.turso.io"
                    className="w-full text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none font-mono text-[10px]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Data base Token</label>
                  <input
                    type="password"
                    value={editDbToken}
                    onChange={e => setEditDbToken(e.target.value)}
                    placeholder="Insira o Token do Turso"
                    className="w-full text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none font-mono text-[10px]"
                  />
                </div>
              </div>

              {/* Modal action buttons */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {editingClinicId && clinics.find(c => c.id === editingClinicId)?.slug !== 'principal' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmDeleteId === editingClinicId) {
                        handleDeleteClinic(editingClinicId);
                      } else {
                        setConfirmDeleteId(editingClinicId);
                      }
                    }}
                    className={`col-span-1 font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-1 text-xs uppercase tracking-wider border ${
                      confirmDeleteId === editingClinicId
                        ? 'bg-red-600 border-red-600 text-white animate-pulse shadow-sm shadow-red-600/20'
                        : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-100 hover:border-red-200'
                    }`}
                  >
                    <Trash className="w-4 h-4" />
                    <span>{confirmDeleteId === editingClinicId ? 'Confirmar?' : 'Excluir'}</span>
                  </button>
                )}

                <button
                  type="submit"
                  className={`${editingClinicId && clinics.find(c => c.id === editingClinicId)?.slug === 'principal' ? 'col-span-3' : 'col-span-2'} bg-[#a38e74] hover:bg-[#8f7b62] text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-xs uppercase tracking-wider`}
                >
                  <span>Salvar Configurações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 text-xs text-gray-400 text-center">
        <p>© 2026 Gestto. Plataforma de Clínicas SaaS Multi-Lojas. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
