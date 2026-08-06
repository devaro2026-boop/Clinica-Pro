import { useState, useEffect, useRef } from 'react';
import { Bell, Trash2, Check, CreditCard, Sparkles } from 'lucide-react';

interface UnifiedNotification {
  id: string;
  originalId?: number;
  type: 'appointment' | 'hub_message' | 'billing';
  title: string;
  message: string;
  created_at: string;
  is_read: number;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = () => {
    fetch('/api/notifications/bell')
      .then(res => res.json())
      .then((data: UnifiedNotification[]) => {
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchNotifications();
    window.addEventListener('appointmentsUpdated', fetchNotifications);
    window.addEventListener('billingUpdated', fetchNotifications);
    return () => {
      window.removeEventListener('appointmentsUpdated', fetchNotifications);
      window.removeEventListener('billingUpdated', fetchNotifications);
    };
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

  const handleMarkAsRead = async (idStr: string, originalId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/hub-messages/${originalId}/read`, {
        method: 'POST'
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== idStr));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAppointment = async (idStr: string, originalId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja apagar este agendamento?")) {
      return;
    }
    try {
      const res = await fetch(`/api/appointments/${originalId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== idStr));
        window.dispatchEvent(new CustomEvent('appointmentsUpdated'));
      } else {
        alert("Erro ao apagar o agendamento.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-full transition-colors shadow-sm focus:outline-none"
        title="Notificações e Alertas"
      >
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && (
          <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-sm text-gray-800">Sininho de Notificações</h3>
            <span className="bg-[#ebdcd0] text-[#5c4f3c] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {notifications.length}
            </span>
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-xs text-gray-400 text-center font-medium">Nenhum aviso ou notificação pendente.</div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {notifications.map(item => (
                  <li key={item.id} className="p-4 hover:bg-gray-50/50 transition-all text-left">
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                        item.type === 'billing' 
                          ? 'text-red-700 bg-red-50 border-red-100' 
                          : item.type === 'hub_message' 
                          ? 'text-purple-700 bg-purple-50 border-purple-100' 
                          : 'text-blue-700 bg-blue-50 border-blue-100'
                      }`}>
                        {item.type === 'billing' ? 'Mensalidade' : item.type === 'hub_message' ? 'Aviso do Hub' : 'Agendamento'}
                      </span>
                      
                      <div className="flex items-center space-x-1 shrink-0">
                        {item.type === 'hub_message' && item.originalId && (
                          <button
                            onClick={(e) => handleMarkAsRead(item.id, item.originalId!, e)}
                            className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Marcar como Lida"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {item.type === 'appointment' && item.originalId && (
                          <button
                            onClick={(e) => handleDeleteAppointment(item.id, item.originalId!, e)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Apagar Agendamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <h4 className="text-xs font-bold text-gray-900 leading-tight mb-1">{item.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium mb-2">{item.message}</p>
                    
                    {item.type === 'billing' && (
                      <a 
                        href={`/loja/${window.location.pathname.split('/')[2]}/billing`}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-xl border border-red-200 transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Pagar com Mercado Pago (Pix)
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
