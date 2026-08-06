/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu, AlertTriangle, ArrowRight } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import Financial from './pages/Financial';
import Catalog from './pages/Catalog';
import PDV from './pages/PDV';
import Billing from './pages/Billing';
import ClientPortal from './pages/ClientPortal';
import Landpage from './pages/Landpage';
import { AdminGuard } from './components/AdminGuard';
import { setupFetchOverride, getActiveStoreSlug } from './utils/multiStore';

// Enable global multi-store fetch header override
setupFetchOverride();

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const location = useLocation();
  const isPortal = location.pathname.includes('/portal');
  const slug = getActiveStoreSlug();

  // Unified global subscription status verification
  useEffect(() => {
    if (slug && slug !== 'principal' && !isPortal && location.pathname !== '/') {
      fetch('/api/billing/info')
        .then(res => {
          if (!res.ok) return null;
          return res.json();
        })
        .then(data => {
          if (data && data.is_blocked) {
            setIsBlocked(true);
          } else {
            setIsBlocked(false);
          }
        })
        .catch(err => {
          console.error("Error loading subscription block state:", err);
          setIsBlocked(false);
        });
    } else {
      setIsBlocked(false);
    }
  }, [location.pathname, slug, isPortal]);

  // Listener to release block instantly when paid
  useEffect(() => {
    const handleBillingUpdated = () => {
      setIsBlocked(false);
    };
    window.addEventListener('billingUpdated', handleBillingUpdated);
    return () => window.removeEventListener('billingUpdated', handleBillingUpdated);
  }, []);

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

  // Visual blocked state block shield
  if (isBlocked && !location.pathname.includes('/billing')) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-red-100 rounded-3xl p-8 shadow-xl space-y-6 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Acesso Suspenso</h2>
            <p className="text-xs text-red-600 font-bold uppercase tracking-wider">Assinatura em Atraso</p>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed font-medium">
            O painel administrativo da clínica <strong className="text-gray-800">{slug}</strong> foi suspenso temporariamente por atraso na mensalidade.
          </p>
          <div className="border-t border-gray-100 pt-5 flex flex-col gap-3">
            <a 
              href={`/loja/${slug}/billing`}
              className="w-full bg-[#a38e74] hover:bg-[#8f7b62] text-white font-bold py-3 rounded-xl transition-all shadow-md text-sm flex items-center justify-center space-x-2"
            >
              <span>Ir para Faturamento</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <p className="text-[10px] text-gray-400">Regularize via Pix no Mercado Pago para liberar o sistema na hora.</p>
          </div>
        </div>
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
          <Route path="/billing" element={<AdminGuard><Billing /></AdminGuard>} />
          
          {/* Multi-Store admin routes */}
          <Route path="/loja/:slug" element={<Navigate to="dashboard" replace />} />
          <Route path="/loja/:slug/dashboard" element={<AdminGuard><Dashboard /></AdminGuard>} />
          <Route path="/loja/:slug/patients" element={<AdminGuard><Patients /></AdminGuard>} />
          <Route path="/loja/:slug/patients/:id" element={<AdminGuard><PatientDetails /></AdminGuard>} />
          <Route path="/loja/:slug/financial" element={<AdminGuard><Financial /></AdminGuard>} />
          <Route path="/loja/:slug/catalog" element={<AdminGuard><Catalog /></AdminGuard>} />
          <Route path="/loja/:slug/pdv" element={<AdminGuard><PDV /></AdminGuard>} />
          <Route path="/loja/:slug/billing" element={<AdminGuard><Billing /></AdminGuard>} />
          
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
