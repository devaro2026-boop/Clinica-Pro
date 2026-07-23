import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Appointment } from '../types';

export default function NotificationBell() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/appointments')
      .then(res => res.json())
      .then((data: Appointment[]) => {
        // Obter a data de hoje no formato YYYY-MM-DD
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        // Filtrar apenas eventos estritamente no futuro (depois de hoje)
        const future = data.filter(apt => apt.date > todayStr);
        setAppointments(future);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-full transition-colors shadow-sm"
        title="Eventos Futuros"
      >
        <Bell className="w-5 h-5" />
        {appointments.length > 0 && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Eventos Futuros</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {appointments.length}
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {appointments.length === 0 ? (
              <div className="p-6 text-sm text-gray-500 text-center">Nenhum evento agendado para o futuro.</div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {appointments.map(apt => {
                  const [y, m, d] = apt.date.split('-');
                  const formattedDate = `${d}/${m}/${y}`;
                  return (
                    <li key={apt.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-semibold text-gray-900">{apt.patient_name}</p>
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                          {formattedDate}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Horário: <span className="font-medium text-gray-700">{apt.time}</span></p>
                        {apt.description && <p className="truncate">{apt.description}</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
