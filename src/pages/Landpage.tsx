import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Shield, Globe, ExternalLink, Mail, Lock, Building, Layers } from 'lucide-react';

interface Clinic {
  name: string;
  slug: string;
}

export default function Landpage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Registration Form
  const [regName, setRegName] = useState('');
  const [regSlug, setRegSlug] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [loadingReg, setLoadingReg] = useState(false);

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  useEffect(() => {
    fetch('/api/stores')
      .then(res => res.json())
      .then((data: Clinic[]) => {
        if (Array.isArray(data)) {
          setClinics(data);
        }
      })
      .catch(console.error);
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRegName(val);
    // Auto-generate slug from name
    const generated = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric except spaces/hyphens
      .trim()
      .replace(/\s+/g, "-"); // replace spaces with hyphens
    setRegSlug(generated);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess(false);
    setLoadingReg(true);

    if (!regName || !regSlug || !regEmail || !regPassword) {
      setRegError('Por favor, preencha todos os campos do formulário.');
      setLoadingReg(false);
      return;
    }

    try {
      const res = await fetch('/api/stores/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          slug: regSlug,
          admin_email: regEmail,
          admin_password: regPassword,
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || 'Erro ao registrar clínica.');
        setLoadingReg(false);
        return;
      }

      setRegSuccess(true);
      // Auto-save session
      localStorage.setItem('gestto_admin_session', JSON.stringify({
        slug: regSlug,
        email: regEmail,
        loggedIn: true,
        name: regName
      }));
      localStorage.setItem('active_store_slug', regSlug);

      setTimeout(() => {
        window.location.href = `/loja/${regSlug}/dashboard`;
      }, 1000);

    } catch (err) {
      setRegError('Erro ao conectar-se com o servidor de banco de dados.');
    } finally {
      setLoadingReg(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoadingLogin(true);

    if (!loginEmail || !loginPassword) {
      setLoginError('Informe o email e a senha.');
      setLoadingLogin(false);
      return;
    }

    try {
      const res = await fetch('/api/stores/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_email: loginEmail,
          admin_password: loginPassword,
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Credenciais inválidas.');
        setLoadingLogin(false);
        return;
      }

      // Save session
      localStorage.setItem('gestto_admin_session', JSON.stringify({
        slug: data.slug,
        email: loginEmail,
        loggedIn: true,
        name: data.name
      }));
      localStorage.setItem('active_store_slug', data.slug);

      window.location.href = `/loja/${data.slug}/dashboard`;
    } catch (err) {
      setLoginError('Erro de conexão com o banco de dados.');
    } finally {
      setLoadingLogin(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-gray-900 font-sans flex flex-col justify-between">
      {/* Top Header navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#cfbea5] via-[#ebdcd0] to-[#dfd3c3] flex items-center justify-center text-[#5c4f3c] font-black text-xl shadow-md">
              G
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight lowercase">gestto</h1>
              <p className="text-[9px] uppercase font-bold text-[#a89070] tracking-wider">Multi-Clínicas SaaS</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-amber-50 text-[#8c7457] rounded-full border border-amber-100 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>Bancos de Dados Isolados</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left column: Value Proposition */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center space-x-2 bg-[#ebdcd0]/40 backdrop-blur-md px-3 py-1 rounded-full border border-[#ebdcd0]/60">
            <Sparkles className="w-3.5 h-3.5 text-[#8c7457]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5c4f3c]">Plataforma Multi-Store Ativa</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight text-gray-900">
            Sua clínica ou salão de estética com gestão impecável.
          </h2>
          
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            O Gestto agora é <strong className="text-[#8c7457] font-semibold">totalmente multi-lojas</strong>. Crie um espaço virtual completo para a sua clínica ou salão em menos de um minuto. Cada loja conta com banco de dados isolado (tabelas independentes no Turso Cloud) para máxima privacidade e velocidade.
          </p>

          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-start space-x-3">
              <Layers className="w-5 h-5 text-[#8c7457] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Replicação de Melhorias</h4>
                <p className="text-xs text-gray-500 mt-1">Quaisquer atualizações, novos recursos e telas desenvolvidos são replicados e aplicados instantaneamente para todas as clínicas.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Globe className="w-5 h-5 text-[#8c7457] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Seu link exclusivo</h4>
                <p className="text-xs text-gray-500 mt-1">Cada loja possui seus próprios links dedicados para acesso administrativo (/loja/nome) e agendamento de clientes (/loja/nome/portal).</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Interactive Hub and Forms */}
        <div className="lg:col-span-7 flex flex-col space-y-8">
          <div className="bg-white border border-[#ebdcd0]/80 rounded-3xl shadow-xl shadow-[#ebdcd0]/20 overflow-hidden">
            {/* Form tab selector */}
            <div className="flex border-b border-gray-100 bg-[#fbf9f6]">
              <button
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors outline-none ${activeTab === 'login' ? 'bg-white text-gray-900 border-b-2 border-[#a38e74]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Acessar Minha Clínica
              </button>
              <button
                onClick={() => setActiveTab('register')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors outline-none ${activeTab === 'register' ? 'bg-white text-gray-900 border-b-2 border-[#a38e74]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Cadastrar Nova Clínica
              </button>
            </div>

            {/* Forms body */}
            <div className="p-8 md:p-10">
              {activeTab === 'login' ? (
                // Administrative Login
                <form onSubmit={handleLoginSubmit} className="space-y-5 text-left">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Login do Administrador</h3>
                    <p className="text-xs text-gray-500 mt-1">Acesse a conta administrativa da sua clínica.</p>
                  </div>

                  {loginError && (
                    <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-xs text-red-600 font-semibold">
                      {loginError}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email Administrativo</label>
                      <div className="relative flex items-center">
                        <Mail className="absolute left-3 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={e => setLoginEmail(e.target.value)}
                          placeholder="exemplo@gestto.com"
                          className="w-full text-sm pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-medium text-gray-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Senha</label>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3 w-4 h-4 text-gray-400" />
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full text-sm pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-medium text-gray-800"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingLogin}
                    className="w-full bg-[#a38e74] hover:bg-[#8f7b62] text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-sm"
                  >
                    <span>{loadingLogin ? 'Entrando...' : 'Entrar no Painel'}</span>
                    {!loadingLogin && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              ) : (
                // Clinic Registration
                <form onSubmit={handleRegisterSubmit} className="space-y-5 text-left">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Nova Clínica</h3>
                    <p className="text-xs text-gray-500 mt-1">Crie sua clínica e monte seu banco de dados isolado instantaneamente.</p>
                  </div>

                  {regError && (
                    <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-xs text-red-600 font-semibold">
                      {regError}
                    </div>
                  )}

                  {regSuccess && (
                    <div className="bg-green-50 border border-green-100 p-3 rounded-xl text-xs text-green-700 font-semibold">
                      Clínica criada com sucesso! Redirecionando...
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nome da Clínica / Loja</label>
                      <div className="relative flex items-center">
                        <Building className="absolute left-3 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={handleNameChange}
                          placeholder="Clínica Sorella"
                          className="w-full text-sm pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-medium text-gray-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Link da Loja (Link Amigável)</label>
                      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#c5b49f] focus-within:bg-white transition-all">
                        <span className="text-xs text-gray-400 bg-gray-100/50 px-3 py-2.5 border-r border-gray-200 select-none">/loja/</span>
                        <input
                          type="text"
                          required
                          value={regSlug}
                          onChange={e => setRegSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                          placeholder="sorella"
                          className="w-full text-sm px-3 py-2 bg-transparent outline-none font-bold text-gray-800 lowercase"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email Administrativo</label>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={e => setRegEmail(e.target.value)}
                          placeholder="admin@sorella.com"
                          className="w-full text-sm px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-medium text-gray-800"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Senha de Acesso</label>
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full text-sm px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#c5b49f] focus:bg-white outline-none transition-all font-medium text-gray-800"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingReg}
                    className="w-full bg-[#a38e74] hover:bg-[#8f7b62] text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-sm"
                  >
                    <span>{loadingReg ? 'Criando Espaço...' : 'Criar Minha Clínica'}</span>
                    {!loadingReg && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Quick Hub Selector of registered stores */}
          <div className="bg-white border border-[#ebdcd0]/80 rounded-3xl p-6 text-left shadow-lg shadow-[#ebdcd0]/10">
            <h4 className="text-sm font-black text-[#5c4f3c] uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#a38e74] rounded-full inline-block animate-pulse"></span>
              Clínicas Registradas na Rede ({clinics.length})
            </h4>
            
            {clinics.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                {clinics.map((clinic) => (
                  <div 
                    key={clinic.slug}
                    className="p-3 border border-gray-100 rounded-2xl bg-gray-50/50 hover:bg-[#fbf9f5] hover:border-[#ebdcd0] transition-all flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <h5 className="font-bold text-gray-900 text-sm leading-none">{clinic.name}</h5>
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Slug: {clinic.slug}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a 
                        href={`/loja/${clinic.slug}/dashboard`}
                        className="text-[11px] font-bold text-[#8c7457] hover:text-[#735d44] flex items-center gap-1"
                      >
                        Painel <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="text-gray-200">|</span>
                      <a 
                        href={`/loja/${clinic.slug}/portal`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        Portal Clientes <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Nenhuma outra clínica cadastrada ainda. Use o formulário acima para registrar a primeira!</p>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 gap-4">
          <p>© 2026 Gestto. Todos os direitos reservados. Plataforma Multi-Lojas.</p>
          <div className="flex space-x-4">
            <span className="font-semibold text-gray-500">Privacidade Absoluta</span>
            <span>•</span>
            <span className="font-semibold text-gray-500">Bancos de Dados Seguros</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
