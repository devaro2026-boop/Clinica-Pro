import { useState, useEffect } from 'react';
import { Appointment } from '../types';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle, XCircle, Settings, Save, Check } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';

export default function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // Settings State
  const [startHour, setStartHour] = useState('08:00');
  const [endHour, setEndHour] = useState('18:00');
  const [interval, setIntervalVal] = useState(30);
  const [workdays, setWorkdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
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
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchSettings();
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
                        ? 'bg-rose-500 text-white border-rose-500 shadow-xs' 
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
    </div>
  );
}
