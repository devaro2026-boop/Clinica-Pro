import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Home } from 'lucide-react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const activeSlug = slug || 'principal';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Check session in localStorage
  const sessionStr = localStorage.getItem('gestto_admin_session');
  let session = null;
  try {
    session = sessionStr ? JSON.parse(sessionStr) : null;
  } catch (e) {}
  
  const isAuthorized = session && session.slug === activeSlug && session.loggedIn;
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/stores/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_email: email, admin_password: password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Credenciais inválidas.');
        setLoading(false);
        return;
      }
      
      if (data.slug !== activeSlug) {
        setError('Estas credenciais não pertencem a esta loja/clínica.');
        setLoading(false);
        return;
      }
      
      // Save session info
      localStorage.setItem('gestto_admin_session', JSON.stringify({
        slug: activeSlug,
        email,
        loggedIn: true,
        name: data.name
      }));
      localStorage.setItem('active_store_slug', activeSlug);
      
      // Refresh to apply authenticated view
      window.location.reload();
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };
  
  if (isAuthorized) {
    return <>{children}</>;
  }
  
  return (
    <div className="min-h-screen bg-[#fcfbf9] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#cfbea5] via-[#ebdcd0] to-[#dfd3c3] flex items-center justify-center text-[#5c4f3c] font-black text-2xl shadow-lg shadow-amber-100/40 border border-[#ebdcd0]">
            {activeSlug.charAt(0).toUpperCase()}
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Acesso Administrativo
        </h2>
        <p className="mt-2 text-center text-sm text-[#a89070] font-bold uppercase tracking-wider">
          Loja / Clínica: <span className="text-[#5c4f3c] font-black">{activeSlug}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-[#ebdcd0] rounded-3xl shadow-xl shadow-amber-100/10 sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 p-3 rounded-xl text-xs text-red-600 font-semibold">
              {error}
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                E-mail do Administrador
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#a38e74] focus:ring-1 focus:ring-[#a38e74] sm:text-sm text-gray-800"
                  placeholder="admin@exemplo.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Senha de Acesso
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#a38e74] focus:ring-1 focus:ring-[#a38e74] sm:text-sm text-gray-800"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#a38e74] hover:bg-[#8f7b62] focus:outline-none transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar no Painel'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between text-xs">
            <a href="/" className="text-gray-400 hover:text-gray-600 flex items-center">
              <Home className="w-3.5 h-3.5 mr-1" /> Voltar para o início
            </a>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400">Proteção Ativa</span>
          </div>
        </div>
      </div>
    </div>
  );
}
