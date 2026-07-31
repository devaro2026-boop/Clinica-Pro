import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CircleDollarSign, LogOut, X, Package, ShoppingCart, Globe } from 'lucide-react';

export default function Sidebar({ closeSidebar }: { closeSidebar?: () => void }) {
  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Agenda & Dashboard" },
    { to: "/patients", icon: Users, label: "Clientes & Pacientes" },
    { to: "/catalog", icon: Package, label: "Serviços e Produtos" },
    { to: "/pdv", icon: ShoppingCart, label: "Frente de Caixa (PDV)" },
    { to: "/financial", icon: CircleDollarSign, label: "Financeiro & Caixa" },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-pink-100">
            G
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight lowercase">gestto</h1>
            <p className="text-[10px] uppercase font-semibold text-rose-500 tracking-wider">Estética & Salão</p>
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
      <div className="p-4 mx-4 mb-4 bg-rose-50 border border-rose-100/50 rounded-2xl space-y-2">
        <p className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">Link do Portal do Cliente</p>
        <p className="text-[11px] text-gray-600 leading-normal">Seus clientes podem realizar agendamentos online por este link:</p>
        <a 
          href="/portal" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center justify-between text-xs font-bold text-rose-600 hover:text-rose-700 bg-white border border-rose-200 px-3 py-2 rounded-xl transition-all shadow-xs"
        >
          <span className="truncate">Acessar Portal</span>
          <Globe className="w-3.5 h-3.5 shrink-0" />
        </a>
      </div>

      <div className="p-4 border-t border-gray-100">
        <button className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:text-red-600 w-full rounded-xl hover:bg-gray-50 transition-colors">
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}
