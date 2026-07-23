import { useState, useEffect } from 'react';
import { Appointment } from '../types';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle, XCircle } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';

export default function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
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

  useEffect(() => {
    fetchAppointments();
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchAppointments();
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

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Agenda de Hoje</h2>
          <p className="text-gray-500 mt-2">{format(new Date(), 'dd/MM/yyyy')}</p>
        </div>
        <div className="flex items-center space-x-4">
          <NotificationBell />
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {appointments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Nenhum agendamento encontrado.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {appointments.map((apt) => (
              <li key={apt.id} className="p-6 hover:bg-gray-50/50 transition-colors flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-xl w-16 h-16 font-semibold">
                    <span className="text-xl">{apt.time.split(':')[0]}</span>
                    <span className="text-xs opacity-80">{apt.time.split(':')[1]}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{apt.patient_name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{apt.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${
                        apt.status === 'Confirmado' ? 'bg-green-100 text-green-800' :
                        apt.status === 'Cancelado' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                    <a
                      href={getWhatsAppLink(apt.patient_phone || '', apt.patient_name, apt.time)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-green-600 bg-green-50 rounded-full hover:bg-green-100 transition-colors"
                      title="Enviar WhatsApp"
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                    {apt.status !== 'Confirmado' && (
                      <button onClick={() => updateStatus(apt.id, 'Confirmado')} className="p-2 text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors" title="Confirmar">
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    {apt.status !== 'Cancelado' && (
                      <button onClick={() => updateStatus(apt.id, 'Cancelado')} className="p-2 text-red-600 bg-red-50 rounded-full hover:bg-red-100 transition-colors" title="Cancelar">
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
