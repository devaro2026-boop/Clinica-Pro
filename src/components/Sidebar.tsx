import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CircleDollarSign, LogOut, X } from 'lucide-react';

export default function Sidebar({ closeSidebar }: { closeSidebar?: () => void }) {
  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Agenda & Dashboard" },
    { to: "/patients", icon: Users, label: "Pacientes" },
    { to: "/financial", icon: CircleDollarSign, label: "Financeiro" },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">Estética Pro</h1>
          <p className="text-xs text-gray-500 mt-1">Gestão de Clínicas</p>
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
      <div className="p-4 border-t border-gray-100">
        <button className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:text-gray-900 w-full rounded-xl hover:bg-gray-50 transition-colors">
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}
