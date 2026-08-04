/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import Financial from './pages/Financial';
import Catalog from './pages/Catalog';
import PDV from './pages/PDV';
import ClientPortal from './pages/ClientPortal';
import Landpage from './pages/Landpage';
import { AdminGuard } from './components/AdminGuard';
import { setupFetchOverride } from './utils/multiStore';

// Enable global multi-store fetch header override
setupFetchOverride();

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isPortal = location.pathname.includes('/portal');

  if (location.pathname === '/') {
    return <Landpage />;
  }

  if (isPortal) {
    return (
      <div className="min-h-screen bg-neutral-50 text-gray-900 font-sans">
        <Routes>
          <Route path="/portal" element={<ClientPortal />} />
          <Route path="/loja/:slug/portal" element={<ClientPortal />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out`}>
        <Sidebar closeSidebar={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 overflow-y-auto bg-gray-50 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Gestto</h1>
          <button onClick={() => setSidebarOpen(true)} className="p-2 -mr-2 text-gray-600 hover:bg-gray-50 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
        </div>
        
        <Routes>
          <Route path="/dashboard" element={<AdminGuard><Dashboard /></AdminGuard>} />
          <Route path="/patients" element={<AdminGuard><Patients /></AdminGuard>} />
          <Route path="/patients/:id" element={<AdminGuard><PatientDetails /></AdminGuard>} />
          <Route path="/financial" element={<AdminGuard><Financial /></AdminGuard>} />
          <Route path="/catalog" element={<AdminGuard><Catalog /></AdminGuard>} />
          <Route path="/pdv" element={<AdminGuard><PDV /></AdminGuard>} />
          
          {/* Multi-Store admin routes */}
          <Route path="/loja/:slug" element={<Navigate to="dashboard" replace />} />
          <Route path="/loja/:slug/dashboard" element={<AdminGuard><Dashboard /></AdminGuard>} />
          <Route path="/loja/:slug/patients" element={<AdminGuard><Patients /></AdminGuard>} />
          <Route path="/loja/:slug/patients/:id" element={<AdminGuard><PatientDetails /></AdminGuard>} />
          <Route path="/loja/:slug/financial" element={<AdminGuard><Financial /></AdminGuard>} />
          <Route path="/loja/:slug/catalog" element={<AdminGuard><Catalog /></AdminGuard>} />
          <Route path="/loja/:slug/pdv" element={<AdminGuard><PDV /></AdminGuard>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
