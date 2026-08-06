import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CircleDollarSign, LogOut, X, Package, ShoppingCart, Globe, CreditCard } from 'lucide-react';
import { getActiveStoreSlug } from '../utils/multiStore';

export default function Sidebar({ closeSidebar }: { closeSidebar?: () => void }) {
  const slug = getActiveStoreSlug();
  const prefix = slug ? `/loja/${slug}` : '';

  const navItems = [
    { to: `${prefix}/dashboard`, icon: LayoutDashboard, label: "Agenda & Dashboard" },
    { to: `${prefix}/patients`, icon: Users, label: "Clientes & Pacientes" },
    { to: `${prefix}/catalog`, icon: Package, label: "Serviços e Produtos" },
    { to: `${prefix}/pdv`, icon: ShoppingCart, label: "Frente de Caixa (PDV)" },
    { to: `${prefix}/financial`, icon: CircleDollarSign, label: "Financeiro & Caixa" },
    { to: `${prefix}/billing`, icon: CreditCard, label: "Mensalidade & Assinatura" },
  ];

  const handleLogout = () => {
    localStorage.removeItem('gestto_admin_session');
    localStorage.removeItem('active_store_slug');
    window.location.href = '/';
  };

  const portalUrl = slug ? `/loja/${slug}/portal` : '/portal';

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#cfbea5] via-[#ebdcd0] to-[#dfd3c3] flex items-center justify-center text-[#5c4f3c] font-black text-xl shadow-md shadow-amber-100/40">
            {slug ? slug.charAt(0).toUpperCase() : 'G'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight lowercase">gestto</h1>
            <p className="text-[10px] uppercase font-bold text-[#a89070] tracking-wider">{slug || 'Estética & Salão'}</p>
          </div>
        </div>
        {closeSidebar && (
          <button onClick={closeSidebar} className="md:hidden p-1 -mt-1 -mr-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={closeSidebar}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      {/* Client Portal Link Box */}
      <div className="p-4 mx-4 mb-4 bg-[#fbf9f5] border border-[#ebdcd0] rounded-2xl space-y-2">
        <p className="text-[10px] uppercase font-bold text-[#a89070] tracking-wider">Link do Portal do Cliente</p>
        <p className="text-[11px] text-gray-600 leading-normal">Seus clientes podem realizar agendamentos online por este link:</p>
        <a 
          href={portalUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center justify-between text-xs font-bold text-[#968065] hover:text-[#7d674c] bg-white border border-[#ebdcd0] px-3 py-2 rounded-xl transition-all shadow-xs"
        >
          <span className="truncate">Acessar Portal</span>
          <Globe className="w-3.5 h-3.5 shrink-0" />
        </a>
      </div>

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:text-red-600 w-full rounded-xl hover:bg-gray-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}
