import { useState, useEffect } from 'react';
import { Appointment } from '../types';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle, XCircle, Settings, Save, Check, Trash2, History } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';

export default function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // Settings State
  const [startHour, setStartHour] = useState('08:00');
  const [endHour, setEndHour] = useState('18:00');
  const [interval, setIntervalVal] = useState(30);
  const [workdays, setWorkdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Store Settings State
  const [storeName, setStoreName] = useState('Gestto Estética & Beleza');
  const [storeAddress, setStoreAddress] = useState('Av. Principal de Estética & Beleza, 1200 - Centro');
  const [storeWhatsApp, setStoreWhatsApp] = useState('11988887777');
  const [storePhone, setStorePhone] = useState('(11) 3333-2222');
  const [storeSaveSuccess, setStoreSaveSuccess] = useState(false);

  // Data Cleanup Settings State
  const [cleanupEnabled, setCleanupEnabled] = useState(true);
  const [cleanupDays, setCleanupDays] = useState(30);
  const [cleanupSaveSuccess, setCleanupSaveSuccess] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [manualCleanupSuccess, setManualCleanupSuccess] = useState(false);
  
  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments');
      const data = await res.json();
      
      // Filter for today's appointments on Dashboard
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      const todaysAppointments = data.filter((apt: Appointment) => apt.date === todayStr);
      setAppointments(todaysAppointments);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/schedule_hours');
      const data = await res.json();
      if (data) {
        setStartHour(data.start || '08:00');
        setEndHour(data.end || '18:00');
        setIntervalVal(data.interval || 30);
        setWorkdays(data.workdays || [1, 2, 3, 4, 5]);
      }

      // Fetch store details
      const storeRes = await fetch('/api/settings/store_info');
      const storeData = await storeRes.json();
      if (storeData) {
        setStoreName(storeData.name || 'Gestto Estética & Beleza');
        setStoreAddress(storeData.address || 'Av. Principal de Estética & Beleza, 1200 - Centro');
        setStoreWhatsApp(storeData.whatsapp || '11988887777');
        setStorePhone(storeData.phone || '(11) 3333-2222');
      }

      // Fetch cleanup settings
      const cleanupRes = await fetch('/api/settings/data_cleanup');
      const cleanupData = await cleanupRes.json();
      if (cleanupData) {
        setCleanupEnabled(cleanupData.enabled !== undefined ? cleanupData.enabled : true);
        setCleanupDays(cleanupData.retentionDays !== undefined ? cleanupData.retentionDays : 30);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchSettings();
    window.addEventListener('appointmentsUpdated', fetchAppointments);
    return () => {
      window.removeEventListener('appointmentsUpdated', fetchAppointments);
    };
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchAppointments();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/settings/schedule_hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: startHour,
          end: endHour,
          interval: Number(interval),
          workdays
        })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      alert('Erro ao salvar horários de atendimento.');
    }
  };

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreSaveSuccess(false);
    try {
      const res = await fetch('/api/settings/store_info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName,
          address: storeAddress,
          whatsapp: storeWhatsApp,
          phone: storePhone
        })
      });
      if (res.ok) {
        setStoreSaveSuccess(true);
        setTimeout(() => setStoreSaveSuccess(false), 3000);
      }
    } catch (e) {
      alert('Erro ao salvar informações da loja.');
    }
  };

  const handleSaveCleanupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setCleanupSaveSuccess(false);
    try {
      const res = await fetch('/api/settings/data_cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: cleanupEnabled,
          retentionDays: Number(cleanupDays)
        })
      });
      if (res.ok) {
        setCleanupSaveSuccess(true);
        setTimeout(() => setCleanupSaveSuccess(false), 3000);
      }
    } catch (e) {
      alert('Erro ao salvar configurações de limpeza de dados.');
    }
  };

  const handleManualCleanup = async () => {
    if (!window.confirm('Atenção: Tem certeza que deseja limpar os históricos agora? Serão removidos permanentemente agendamentos, lançamentos de caixa e notificações mais antigos do que o período de retenção definido.')) {
      return;
    }
    setIsCleaning(true);
    setManualCleanupSuccess(false);
    try {
      const res = await fetch('/api/cleanup/now', {
        method: 'POST'
      });
      if (res.ok) {
        setManualCleanupSuccess(true);
        setTimeout(() => setManualCleanupSuccess(false), 4000);
        fetchAppointments();
      } else {
        alert('Erro ao executar a limpeza de dados.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão com o servidor.');
    } finally {
      setIsCleaning(false);
    }
  };

  const toggleWorkday = (dayNum: number) => {
    if (workdays.includes(dayNum)) {
      setWorkdays(workdays.filter(d => d !== dayNum));
    } else {
      setWorkdays([...workdays, dayNum].sort());
    }
  };

  const getWhatsAppLink = (phone: string, name: string, time: string) => {
    // Acrescentar +55 se não tiver
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length === 10 || formattedPhone.length === 11) {
      formattedPhone = '55' + formattedPhone;
    }
    const msg = encodeURIComponent(`Olá ${name}, confirmando seu agendamento hoje às ${time}.`);
    return `https://wa.me/${formattedPhone}?text=${msg}`;
  };

  const weekDayNames = [
    { label: 'Dom', value: 0 },
    { label: 'Seg', value: 1 },
    { label: 'Ter', value: 2 },
    { label: 'Qua', value: 3 },
    { label: 'Qui', value: 4 },
    { label: 'Sex', value: 5 },
    { label: 'Sáb', value: 6 }
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <header className="flex justify-between items-center md:items-end">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Agenda de Hoje</h2>
          <p className="text-sm md:text-base text-gray-500 mt-1 md:mt-2">{format(new Date(), 'dd/MM/yyyy')}</p>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <NotificationBell />
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {appointments.length === 0 ? (
          <div className="p-8 md:p-12 text-center text-gray-500">Nenhum agendamento encontrado para hoje.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {appointments.map((apt) => (
              <li key={apt.id} className="p-4 md:p-6 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4 md:space-x-6">
                  <div className="shrink-0 flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-xl w-14 h-14 md:w-16 md:h-16 font-semibold">
                    <span className="text-lg md:text-xl">{apt.time.split(':')[0]}</span>
                    <span className="text-[10px] md:text-xs opacity-80">{apt.time.split(':')[1]}</span>
                  </div>
                  <div>
                    <h4 className="text-base md:text-lg font-semibold text-gray-900">{apt.patient_name}</h4>
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">{apt.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs md:text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 md:px-2.5 md:py-0.5 rounded-full font-medium ${
                        apt.status === 'Confirmado' ? 'bg-green-100 text-green-800' :
                        apt.status === 'Cancelado' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 md:space-x-3 self-end sm:self-auto">
                    <a
                      href={getWhatsAppLink(apt.patient_phone || '', apt.patient_name, apt.time)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-green-600 bg-green-50 rounded-full hover:bg-green-100 transition-colors"
                      title="Enviar WhatsApp"
                    >
                      <Phone className="w-4 h-4 md:w-5 md:h-5" />
                    </a>
                    {apt.status !== 'Confirmado' && (
                      <button onClick={() => updateStatus(apt.id, 'Confirmado')} className="p-2 text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors" title="Confirmar">
                        <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    )}
                    {apt.status !== 'Cancelado' && (
                      <button onClick={() => updateStatus(apt.id, 'Cancelado')} className="p-2 text-red-600 bg-red-50 rounded-full hover:bg-red-100 transition-colors" title="Cancelar">
                        <XCircle className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Schedule Configuration Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="flex items-center space-x-2.5 pb-4 border-b border-gray-100">
          <Settings className="w-5 h-5 text-gray-700" />
          <div>
            <h3 className="font-bold text-gray-900">Configuração dos Horários de Atendimento</h3>
            <p className="text-xs text-gray-500 mt-0.5">Defina os dias e horários em que os clientes podem agendar pelo Portal externo</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Start Hour */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Hora de Início</label>
              <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <Clock className="w-4 h-4 text-gray-400 mr-2" />
                <select
                  className="w-full text-xs font-semibold outline-none bg-transparent text-gray-800"
                  value={startHour}
                  onChange={e => setStartHour(e.target.value)}
                >
                  {Array.from({ length: 24 }).map((_, i) => {
                    const h = String(i).padStart(2, '0');
                    return (
                      <optgroup key={h} label={h + ':00'}>
                        <option value={`${h}:00`}>{h}:00</option>
                        <option value={`${h}:30`}>{h}:30</option>
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* End Hour */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Hora de Término</label>
              <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <Clock className="w-4 h-4 text-gray-400 mr-2" />
                <select
                  className="w-full text-xs font-semibold outline-none bg-transparent text-gray-800"
                  value={endHour}
                  onChange={e => setEndHour(e.target.value)}
                >
                  {Array.from({ length: 24 }).map((_, i) => {
                    const h = String(i).padStart(2, '0');
                    return (
                      <optgroup key={h} label={h + ':00'}>
                        <option value={`${h}:00`}>{h}:00</option>
                        <option value={`${h}:30`}>{h}:30</option>
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Interval */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Intervalo das Sessões</label>
              <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <Clock className="w-4 h-4 text-gray-400 mr-2" />
                <select
                  className="w-full text-xs font-semibold outline-none bg-transparent text-gray-800"
                  value={interval}
                  onChange={e => setIntervalVal(Number(e.target.value))}
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos (1 hora)</option>
                  <option value={90}>90 minutos (1h30)</option>
                  <option value={120}>120 minutos (2 horas)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Workdays */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Dias de Funcionamento</label>
            <div className="flex flex-wrap gap-2">
              {weekDayNames.map(day => {
                const isActive = workdays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWorkday(day.value)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${
                      isActive 
                        ? 'bg-[#a38e74] text-white border-[#a38e74] shadow-xs' 
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-5 mt-4">
            {saveSuccess ? (
              <span className="text-xs text-green-600 font-semibold flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>Configurações salvas com sucesso!</span>
              </span>
            ) : (
              <span className="text-xs text-gray-400">Clique em salvar para ativar as novas regras no Portal do Cliente.</span>
            )}
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Configurações</span>
            </button>
          </div>
        </form>
      </div>

      {/* Store Information Configuration Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="flex items-center space-x-2.5 pb-4 border-b border-gray-100">
          <Settings className="w-5 h-5 text-gray-700" />
          <div>
            <h3 className="font-bold text-gray-900">Informações da Loja / Clínica</h3>
            <p className="text-xs text-gray-500 mt-0.5">Defina os dados de contato e endereço que aparecem no Portal do Cliente</p>
          </div>
        </div>

        <form onSubmit={handleSaveStoreSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Store Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Nome da Loja / Clínica</label>
              <input
                type="text"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
              />
            </div>

            {/* Store Address */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Endereço Completo</label>
              <input
                type="text"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={storeAddress}
                onChange={e => setStoreAddress(e.target.value)}
              />
            </div>

            {/* Store WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">WhatsApp da Loja (Somente números)</label>
              <input
                type="text"
                required
                placeholder="Ex: 11988887777"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={storeWhatsApp}
                onChange={e => setStoreWhatsApp(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            {/* Store Phone */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Telefone Fixo / Adicional</label>
              <input
                type="text"
                placeholder="Ex: (11) 3333-2222"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={storePhone}
                onChange={e => setStorePhone(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-5 mt-4">
            {storeSaveSuccess ? (
              <span className="text-xs text-green-600 font-semibold flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>Informações salvas com sucesso!</span>
              </span>
            ) : (
              <span className="text-xs text-gray-400">Clique em salvar para atualizar as informações de contato no Portal do Cliente.</span>
            )}
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Informações</span>
            </button>
          </div>
        </form>
      </div>

      {/* Data Cleanup / History Pruning Configuration Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="flex items-center space-x-2.5 pb-4 border-b border-gray-100">
          <History className="w-5 h-5 text-gray-700" />
          <div>
            <h3 className="font-bold text-gray-900">Limpeza de Histórico e Privacidade</h3>
            <p className="text-xs text-gray-500 mt-0.5">Defina o período de retenção para os agendamentos, registros de caixa e notificações do sistema</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Automatic Cleanup Form */}
          <form onSubmit={handleSaveCleanupSettings} className="space-y-6 border-r border-gray-100 pr-0 lg:pr-8">
            <h4 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>Limpeza Diária Automática</span>
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Ativar Limpeza Automática</label>
                  <span className="text-[11px] text-gray-400 mt-0.5 block">Executa uma rotina de remoção diária automática</span>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="cleanup-toggle"
                    className="sr-only peer"
                    checked={cleanupEnabled}
                    onChange={e => setCleanupEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Período de Retenção de Dados</label>
                <select
                  disabled={!cleanupEnabled}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  value={cleanupDays}
                  onChange={e => setCleanupDays(Number(e.target.value))}
                >
                  <option value={15}>Manter somente os últimos 15 dias</option>
                  <option value={30}>Manter somente os últimos 30 dias (Recomendado)</option>
                  <option value={60}>Manter somente os últimos 60 dias</option>
                  <option value={90}>Manter somente os últimos 90 dias</option>
                  <option value={180}>Manter somente os últimos 180 dias</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                  Todos os agendamentos (incluindo meus agendamentos do portal do cliente), fluxos de caixa e notificações mais antigos do que este limite serão removidos de forma definitiva a cada 24 horas.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-5">
              {cleanupSaveSuccess ? (
                <span className="text-xs text-green-600 font-semibold flex items-center space-x-1">
                  <Check className="w-4 h-4" />
                  <span>Configurações salvas!</span>
                </span>
              ) : (
                <span className="text-xs text-gray-400">Padrão: 30 dias de retenção.</span>
              )}
              <button
                type="submit"
                className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Configuração</span>
              </button>
            </div>
          </form>

          {/* Manual Immediate Cleanup Section */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span>Limpeza Manual Imediata</span>
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Se você deseja limpar a base de dados imediatamente de acordo com o período de retenção atual de <span className="font-bold text-gray-900">{cleanupDays} dias</span>, você pode acionar a rotina de limpeza manual agora mesmo.
              </p>
              <div className="bg-red-50/50 rounded-xl p-4 border border-red-100 flex items-start space-x-3">
                <Trash2 className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="text-[11px] text-red-700 leading-relaxed font-semibold">
                  Esta ação é irreversível e excluirá permanentemente dados de histórico fora do período de retenção (antes de {format(new Date(Date.now() - cleanupDays * 24 * 60 * 60 * 1000), 'dd/MM/yyyy')}).
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-5">
              {manualCleanupSuccess ? (
                <span className="text-xs text-green-600 font-semibold flex items-center space-x-1">
                  <Check className="w-4 h-4" />
                  <span>Histórico limpo com sucesso!</span>
                </span>
              ) : (
                <span className="text-xs text-gray-400">Clique para executar.</span>
              )}
              <button
                type="button"
                onClick={handleManualCleanup}
                disabled={isCleaning}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-2 shadow-sm"
              >
                {isCleaning ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Limpando Base...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Limpar Histórico Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
