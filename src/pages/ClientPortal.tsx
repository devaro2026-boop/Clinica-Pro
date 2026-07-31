import { useState, useEffect } from 'react';
import { CatalogItem, Appointment } from '../types';
import { 
  User, Phone, Mail, Calendar, Clock, Bell, LogOut, CheckCircle2, 
  MapPin, Clipboard, ShieldCheck, ArrowRight, Sparkles, Smile 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientNotification {
  id: number;
  patient_id: number;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

export default function ClientPortal() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authForm, setAuthForm] = useState({ phone: '', cpf: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    birth_date: ''
  });
  const [authError, setAuthError] = useState('');
  const [regError, setRegError] = useState('');

  // Portal State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [services, setServices] = useState<CatalogItem[]>([]);
  
  // Scheduling State
  const [selectedService, setSelectedService] = useState<CatalogItem | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingNote, setBookingNote] = useState('');
  const [isShopClosed, setIsShopClosed] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Notifications bell state
  const [showBellMenu, setShowBellMenu] = useState(false);

  useEffect(() => {
    // Check local storage session
    const storedUser = localStorage.getItem('gestto_client_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setCurrentUser(parsed);
    }
    fetchServices();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchClientData();
      const interval = setInterval(fetchClientData, 15000); // Poll notifications/appointments
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
      setSelectedSlot('');
    }
  }, [selectedDate]);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/catalog');
      const data: CatalogItem[] = await res.json();
      setServices(data.filter(item => item.type === 'service'));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClientData = async () => {
    if (!currentUser) return;
    try {
      const [apptRes, notifRes] = await Promise.all([
        fetch(`/api/portal/patients/${currentUser.id}/appointments`),
        fetch(`/api/portal/patients/${currentUser.id}/notifications`)
      ]);
      setAppointments(await apptRes.json());
      setNotifications(await notifRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAvailableSlots = async () => {
    setLoadingSlots(true);
    setIsShopClosed(false);
    setSelectedSlot('');
    try {
      const res = await fetch(`/api/portal/available-slots?date=${selectedDate}`);
      const data = await res.json();
      if (data.status === 'closed') {
        setIsShopClosed(true);
        setAvailableSlots([]);
      } else {
        setAvailableSlots(data.slots || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authForm.phone && !authForm.cpf) {
      setAuthError('Por favor, informe seu telefone ou CPF.');
      return;
    }
    try {
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Erro ao realizar login.');
        return;
      }
      localStorage.setItem('gestto_client_user', JSON.stringify(data));
      setCurrentUser(data);
    } catch (err) {
      setAuthError('Erro de conexão com o servidor.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!registerForm.name || !registerForm.phone) {
      setRegError('Nome e Telefone são obrigatórios.');
      return;
    }
    try {
      const res = await fetch('/api/portal/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || 'Erro ao realizar cadastro.');
        return;
      }
      localStorage.setItem('gestto_client_user', JSON.stringify(data));
      setCurrentUser(data);
    } catch (err) {
      setRegError('Erro de conexão com o servidor.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gestto_client_user');
    setCurrentUser(null);
    setAppointments([]);
    setNotifications([]);
    setSelectedService(null);
    setSelectedDate('');
    setSelectedSlot('');
    setBookingNote('');
    setBookingSuccess(false);
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedSlot) {
      alert('Por favor, selecione o serviço, a data e o horário.');
      return;
    }

    const payload = {
      clinic_id: 1,
      patient_id: currentUser.id,
      date: selectedDate,
      time: selectedSlot,
      description: selectedService.name,
      status: 'Scheduled'
    };

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setBookingSuccess(true);
        setSelectedService(null);
        setSelectedDate('');
        setSelectedSlot('');
        setBookingNote('');
        fetchClientData();
      } else {
        alert('Ocorreu um erro ao realizar seu agendamento.');
      }
    } catch (e) {
      alert('Erro de conexão ao agendar.');
    }
  };

  const markNotificationRead = async (id: number) => {
    try {
      await fetch(`/api/portal/notifications/${id}/read`, { method: 'PUT' });
      fetchClientData();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const unread = notifications.filter(n => n.is_read === 0);
      await Promise.all(
        unread.map(n => fetch(`/api/portal/notifications/${n.id}/read`, { method: 'PUT' }))
      );
      fetchClientData();
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  // Render Login and Register views
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 md:p-8 font-sans selection:bg-[#ebdcd0]">
        <div className="w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 grid grid-cols-1 lg:grid-cols-12 min-h-[600px] animate-fade-in">
          
          {/* Brand/Hero Panel */}
          <div className="lg:col-span-5 bg-gradient-to-tr from-[#dfd3c3] via-[#f7f5f0] to-[#ebdcd0] p-8 md:p-12 text-[#4a3e31] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 rounded-full blur-3xl transform translate-x-12 -translate-y-12"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#ebdcd0]/40 rounded-full blur-3xl transform -translate-x-12 translate-y-12"></div>
            
            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-white/60 backdrop-blur-md flex items-center justify-center text-[#5c4f3c] font-black text-xl border border-white/80 shadow-xs">
                  G
                </div>
                <span className="text-2xl font-black tracking-tight text-[#4a3e31]">gestto</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-[#3a2f22]">
                Seu momento de bem-estar começa aqui.
              </h2>
              <p className="text-[#5c4f3c] text-sm md:text-base mt-4 leading-relaxed font-semibold">
                Acesse nossa plataforma exclusiva para agendar seus atendimentos, ver horários disponíveis em tempo real e cuidar de você de forma simples e rápida.
              </p>
            </div>

            <div className="relative z-10 pt-12 border-t border-[#4a3e31]/10 space-y-4">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-5 h-5 text-[#8c7457] shrink-0" />
                <span className="text-xs font-bold text-[#4a3e31]/90">Ambiente seguro e privativo</span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-[#8c7457] shrink-0" />
                <span className="text-xs font-bold text-[#4a3e31]/90">Confirmação de horário imediata</span>
              </div>
            </div>
          </div>

          {/* Form Panel */}
          <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-center">
            {isRegistering ? (
              // Registration View
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#a38e74]">Cadastro de Novo Cliente</span>
                  <h3 className="text-2xl font-extrabold text-gray-900 mt-1">Crie sua Conta</h3>
                  <p className="text-xs text-gray-500 mt-1">Preencha seus dados para acessar o portal do cliente.</p>
                </div>

                {regError && (
                  <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-xs text-red-600 font-semibold">
                    {regError}
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nome Completo</label>
                      <div className="relative flex items-center">
                        <User className="absolute left-3 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          required
                          placeholder="Maria Silva"
                          className="w-full text-sm pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-medium text-gray-800"
                          value={registerForm.name}
                          onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Telefone</label>
                      <div className="relative flex items-center">
                        <Phone className="absolute left-3 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          required
                          placeholder="(11) 99999-9999"
                          className="w-full text-sm pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-medium text-gray-800"
                          value={registerForm.phone}
                          onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">CPF (Opcional)</label>
                      <input
                        type="text"
                        placeholder="123.456.789-00"
                        className="w-full text-sm px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-medium text-gray-800"
                        value={registerForm.cpf}
                        onChange={e => setRegisterForm({ ...registerForm, cpf: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">E-mail (Opcional)</label>
                      <div className="relative flex items-center">
                        <Mail className="absolute left-3 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          placeholder="maria@exemplo.com"
                          className="w-full text-sm pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-medium text-gray-800"
                          value={registerForm.email}
                          onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Data de Nascimento (Opcional)</label>
                    <input
                      type="date"
                      className="w-full text-sm px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-medium text-gray-800"
                      value={registerForm.birth_date}
                      onChange={e => setRegisterForm({ ...registerForm, birth_date: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#a38e74] hover:bg-[#8f7b62] text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-[#ebdcd0]/40 flex items-center justify-center space-x-2 text-sm"
                  >
                    <span>Concluir Cadastro e Entrar</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="text-center">
                  <span className="text-xs text-gray-500">
                    Já possui cadastro?{' '}
                    <button
                      onClick={() => setIsRegistering(false)}
                      className="text-[#a38e74] hover:text-[#8f7b62] font-bold outline-none"
                    >
                      Acesse sua conta
                    </button>
                  </span>
                </div>
              </div>
            ) : (
              // Login View
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#a38e74]">Acesso Restrito do Cliente</span>
                  <h3 className="text-2xl font-extrabold text-gray-900 mt-1">Bem-vindo de volta!</h3>
                  <p className="text-xs text-gray-500 mt-1">Informe seu celular ou CPF cadastrados para entrar no portal.</p>
                </div>

                {authError && (
                  <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-xs text-red-600 font-semibold">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Número de Telefone</label>
                    <div className="relative flex items-center">
                      <Phone className="absolute left-3 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        placeholder="(11) 99999-9999"
                        className="w-full text-sm pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-medium text-gray-800"
                        value={authForm.phone}
                        onChange={e => setAuthForm({ ...authForm, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="relative flex items-center">
                    <div className="w-full border-t border-gray-100"></div>
                    <span className="absolute left-1/2 transform -translate-x-1/2 bg-white px-3 text-[10px] text-gray-400 uppercase font-black tracking-wider">ou entre com CPF</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Seu CPF</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      className="w-full text-sm px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-medium text-gray-800"
                      value={authForm.cpf}
                      onChange={e => setAuthForm({ ...authForm, cpf: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#a38e74] hover:bg-[#8f7b62] text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-[#ebdcd0]/40 flex items-center justify-center space-x-2 text-sm"
                  >
                    <span>Entrar no Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="text-center pt-2">
                  <span className="text-xs text-gray-500">
                    Não tem uma conta?{' '}
                    <button
                      onClick={() => setIsRegistering(true)}
                      className="text-[#a38e74] hover:text-[#8f7b62] font-bold outline-none"
                    >
                      Cadastre-se grátis
                    </button>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Logged In Dashboard View
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-[#ebdcd0]">
      
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#cfbea5] via-[#ebdcd0] to-[#dfd3c3] flex items-center justify-center text-[#5c4f3c] font-black text-lg shadow-sm shadow-amber-100/30">
              G
            </div>
            <span className="text-lg font-black tracking-tight text-gray-950 lowercase">gestto</span>
            <span className="text-[10px] uppercase font-bold text-[#a38e74] tracking-wider bg-[#fbf9f5] border border-[#ebdcd0]/50 px-2 py-0.5 rounded-lg">Portal do Cliente</span>
          </div>

          <div className="flex items-center space-x-4">
            
            {/* Notification Bell (Sininho) */}
            <div className="relative">
              <button 
                onClick={() => setShowBellMenu(!showBellMenu)}
                className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors outline-none"
              >
                <Bell className="w-5.5 h-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#a38e74] border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown list */}
              {showBellMenu && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                  <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">Mensagens e Alertas</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllNotificationsRead}
                        className="text-[10px] text-[#a38e74] hover:text-[#8f7b62] font-bold"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                    {notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        onClick={() => notif.is_read === 0 && markNotificationRead(notif.id)}
                        className={`p-3 text-left transition-colors cursor-pointer ${notif.is_read === 0 ? 'bg-[#fbf9f5]/50 hover:bg-[#fbf9f5]' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            {notif.title}
                            {notif.is_read === 0 && <span className="w-1.5 h-1.5 bg-[#a38e74] rounded-full"></span>}
                          </h4>
                          <span className="text-[9px] text-gray-400">
                            {format(parseISO(notif.created_at), 'dd/MM HH:mm')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{notif.message}</p>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="p-6 text-center text-xs text-gray-400">
                        Nenhuma mensagem recebida ainda.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User details & logout */}
            <div className="hidden sm:flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-[#f4efe8] text-[#968065] border border-[#ebdcd0]/60 flex items-center justify-center font-bold text-sm">
                {currentUser.name[0].toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-900 leading-none">{currentUser.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{currentUser.phone}</p>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors outline-none"
              title="Sair do Portal"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
        
        {/* Welcome Section */}
        <section className="bg-gradient-to-tr from-[#cfbea5] via-[#f7f5f0] to-[#dfd3c3] p-6 md:p-8 rounded-3xl text-[#4a3e31] shadow-xl shadow-amber-100/30 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden border border-[#ebdcd0]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/40 rounded-full blur-2xl translate-x-12 -translate-y-12"></div>
          <div className="relative z-10 space-y-2">
            <div className="flex items-center space-x-2 bg-[#4a3e31]/5 backdrop-blur-md px-3 py-1 rounded-full w-fit border border-[#4a3e31]/10">
              <Sparkles className="w-3.5 h-3.5 text-[#8c7457]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5c4f3c]">Área Exclusiva</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#3a2f22]">Olá, {currentUser.name}!</h2>
            <p className="text-[#5c4f3c]/90 text-xs md:text-sm font-semibold leading-relaxed max-w-xl">
              Bem-vindo ao seu portal personalizado. Agende novos serviços com facilidade e confira as novidades e horários disponíveis definidos especialmente para você.
            </p>
          </div>
          <div className="shrink-0 flex items-center space-x-2.5 z-10">
            <div className="p-3 bg-[#4a3e31]/5 backdrop-blur-md rounded-2xl border border-[#4a3e31]/10 text-center text-[#4a3e31]">
              <p className="text-[10px] font-bold text-[#8c7457] uppercase tracking-wider">Agendamentos</p>
              <p className="text-2xl font-black mt-0.5">{appointments.length}</p>
            </div>
          </div>
        </section>

        {/* Form Notifications on schedules */}
        {bookingSuccess && (
          <div className="bg-green-50 border border-green-200 p-5 rounded-2xl flex items-start space-x-3 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-green-950 text-sm">Agendamento Realizado com Sucesso!</h4>
              <p className="text-xs text-green-800 mt-1">O seu horário foi registrado e confirmado na nossa agenda. Acesse seu sininho de notificações para ver os alertas.</p>
              <button 
                onClick={() => setBookingSuccess(false)}
                className="text-xs font-bold text-green-700 hover:text-green-800 mt-2 underline"
              >
                Agendar outro horário
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Schedule a New Session (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center space-x-2 pb-4 border-b border-gray-100 mb-6">
                <Sparkles className="w-5 h-5 text-[#a38e74]" />
                <h3 className="font-bold text-gray-900">Novo Agendamento Online</h3>
              </div>

              <form onSubmit={handleBookAppointment} className="space-y-6">
                
                {/* 1. Select Service */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Passo 1: Selecione o Serviço</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-56 overflow-y-auto pr-1">
                    {services.map(s => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedService(s)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-28 text-left ${selectedService?.id === s.id ? 'border-[#a38e74] bg-[#fdfcf7] ring-2 ring-[#a38e74]/10' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{s.name}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{s.description || 'Nenhuma descrição.'}</p>
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-100/60 pt-2 mt-2">
                          <span className="text-xs font-bold text-gray-950">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.unit_price)}
                          </span>
                          <span className="text-[9px] font-semibold text-[#a38e74] uppercase tracking-wide">{s.unit_type}</span>
                        </div>
                      </div>
                    ))}
                    {services.length === 0 && (
                      <p className="text-xs text-gray-400 py-4 col-span-full">Nenhum serviço disponível no catálogo.</p>
                    )}
                  </div>
                </div>

                {/* 2. Select Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Passo 2: Selecione a Data de Atendimento</label>
                  <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2.5" />
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full text-xs font-semibold outline-none bg-transparent text-gray-800"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* 3. Available Slots */}
                {selectedDate && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Passo 3: Escolha o Horário Disponível</label>
                    
                    {loadingSlots ? (
                      <p className="text-xs text-gray-500 animate-pulse">Buscando horários disponíveis em tempo real...</p>
                    ) : isShopClosed ? (
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                        O estabelecimento está fechado nesta data. Por favor, escolha outro dia!
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="p-3 bg-[#fbf9f5] border border-[#ebdcd0]/60 rounded-xl text-xs text-[#8c7457]">
                        Não existem horários de atendimento vagos para este dia. Escolha outra data.
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-0.5">
                        {availableSlots.map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-2 rounded-lg text-xs font-extrabold transition-all border ${selectedSlot === slot ? 'bg-[#a38e74] text-white border-[#a38e74] shadow-sm' : 'bg-gray-50 text-gray-800 hover:bg-gray-100 border-gray-200'}`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Optional Note */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Comentários ou Observações (Opcional)</label>
                  <textarea
                    placeholder="Algum detalhe ou preferência que queira nos contar..."
                    className="w-full text-xs p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#c5b49f] focus:bg-white transition-all font-medium text-gray-800 h-20 resize-none"
                    value={bookingNote}
                    onChange={e => setBookingNote(e.target.value)}
                  />
                </div>

                {/* Action button */}
                <button
                  type="submit"
                  disabled={!selectedService || !selectedDate || !selectedSlot}
                  className="w-full bg-[#a38e74] hover:bg-[#8f7b62] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-stone-200/50 flex items-center justify-center space-x-2 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar meu Agendamento</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Appointment History & Info (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* My Appointments list */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center space-x-2 pb-4 border-b border-gray-100 mb-5">
                <Calendar className="w-5 h-5 text-gray-600" />
                <h3 className="font-bold text-gray-900">Meus Agendamentos</h3>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {appointments.map(appt => {
                  const [year, month, day] = appt.date.split('-');
                  const isUpcoming = new Date(`${appt.date}T${appt.time || '00:00'}`) >= new Date();
                  
                  return (
                    <div key={appt.id} className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors bg-gray-50/50 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 leading-snug">{appt.description}</h4>
                          <div className="flex items-center space-x-1 text-[10px] text-gray-500 mt-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{day}/{month}/{year} às {appt.time}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${appt.status === 'Completed' ? 'bg-green-100 text-green-800' : appt.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                          {appt.status === 'Scheduled' ? 'Agendado' : appt.status === 'Completed' ? 'Concluído' : 'Cancelado'}
                        </span>
                      </div>
                      
                      {/* Alert notice in item itself if near */}
                      {isUpcoming && appt.status === 'Scheduled' && (
                        <div className="bg-[#fbf9f5] p-2.5 rounded-lg border border-[#ebdcd0]/60 flex items-start space-x-2">
                          <Bell className="w-3.5 h-3.5 text-[#a38e74] mt-0.5 shrink-0" />
                          <p className="text-[10px] text-[#5c4f3c] leading-relaxed font-semibold">
                            Fique atento! Seu atendimento está agendado e confirmado para o dia {day}/{month}/{year} às {appt.time}.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
                {appointments.length === 0 && (
                  <div className="text-center py-8 text-gray-400 space-y-2">
                    <Smile className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="text-xs">Você não tem nenhum agendamento realizado.</p>
                  </div>
                )}
              </div>
            </div>

            {/* General Info Card */}
            <div className="bg-gradient-to-tr from-gray-900 to-indigo-950 p-6 rounded-2xl text-white space-y-4">
              <h4 className="font-bold text-sm">Informações de Contato</h4>
              <div className="space-y-3 text-xs text-gray-300">
                <div className="flex items-center space-x-2.5">
                  <MapPin className="w-4 h-4 text-[#ebdcd0] shrink-0" />
                  <span>Av. Principal de Estética & Beleza, 1200 - Centro</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <Phone className="w-4 h-4 text-[#ebdcd0] shrink-0" />
                  <span>(11) 98888-7777 / (11) 3333-2222</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12 py-6 text-center text-xs text-gray-500">
        <p>© 2026 Gestto - Clínica de Estética & Salão de Beleza. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
