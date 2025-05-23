import React, { useState } from 'react';
import LinkedInLeadFinder from './components/LinkedInLeadFinder';
import ApplyLeadOnline from './components/ApplyLeadOnline';
import ApplyLeadOffline from './components/ApplyLeadOffline';
import ApolloLeadSearch from './components/ApolloLeadSearch';
import { ExternalLink, Lock, User, Search } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showOnlineApp, setShowOnlineApp] = useState(false);
  const [showOfflineApp, setShowOfflineApp] = useState(false);
  const [showApolloSearch, setShowApolloSearch] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login === 'Lead Finder' && password === 'Up2025It') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Usuário ou senha inválidos.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#232433]">
        <div className="w-full max-w-md">
          <form onSubmit={handleLogin} className="bg-[#26293b] p-10 rounded-2xl shadow-2xl border border-[#23263a] flex flex-col gap-2">
            <div className="flex flex-col items-center mb-6">
              <div className="mb-2">
                <svg width="38" height="38" fill="none" viewBox="0 0 24 24"><path fill="#FFC300" d="M13 2v8.267l6.294-3.634a1 1 0 1 1 1 1.732l-16 9.236a1 1 0 0 1-1-1.732L11 2.267V2a1 1 0 1 1 2 0Z"/></svg>
              </div>
              <h2 className="text-2xl font-extrabold mb-1 tracking-tight">
                <span className="text-[#2563eb]">On</span><span className="text-[#FF7A00]">Set</span>
              </h2>
              <span className="text-[#FF7A00] text-sm font-medium mb-2">Conectando Inteligência e Tecnologia</span>
              <h3 className="text-2xl font-bold text-white mb-1 mt-2">Leads Finder</h3>
              <p className="text-gray-300 text-sm text-center max-w-xs">Plataforma inteligente para pesquisa e qualificação de leads B2B, integrando múltiplas fontes e automação para gerar dados enriquecidos e insights estratégicos.</p>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-200 mb-1">Usuário</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"><User size={20} /></span>
                <input
                  type="text"
                  value={login}
                  onChange={e => setLogin(e.target.value)}
                  className="w-full pl-11 pr-3 py-3 border border-gray-400 rounded-md bg-[#f5f6fa] text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 transition-all"
                  placeholder=""
                  autoFocus
                />
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-200 mb-1">Senha</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500"><Lock size={20} /></span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-11 pr-3 py-3 border border-gray-400 rounded-md bg-[#f5f6fa] text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 transition-all"
                  placeholder="Digite sua senha"
                />
              </div>
            </div>
            <div className="flex items-center mb-4">
              <input type="checkbox" id="remember" className="accent-blue-600 mr-2" defaultChecked />
              <label htmlFor="remember" className="text-gray-300 text-sm select-none">Lembrar-me</label>
            </div>
            {loginError && <div className="mb-4 text-red-400 text-sm text-center">{loginError}</div>}
            <button
              type="submit"
              className="w-full py-2 px-4 bg-[#2563eb] hover:bg-blue-700 text-white font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 shadow"
            >
              Entrar
            </button>
          </form>
          <footer className="mt-6 text-gray-500 text-xs text-center opacity-80">
            © 2025 OnSet Tecnologia. Todos os direitos reservados.
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-10 relative">
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => setIsAuthenticated(false)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 shadow-lg font-semibold"
        >
          Encerrar
        </button>
        <button
          onClick={() => setShowOfflineApp(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-lg"
        >
          <ExternalLink size={18} />
          Apply Lead Offline
        </button>
        <button
          onClick={() => setShowApolloSearch(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg"
        >
          <Search size={18} />
          Apollo Lead Search
        </button>
      </div>
      
      <LinkedInLeadFinder />

      {showOnlineApp && (
        <ApplyLeadOnline onClose={() => setShowOnlineApp(false)} />
      )}

      {showOfflineApp && (
        <ApplyLeadOffline onClose={() => setShowOfflineApp(false)} />
      )}

      {showApolloSearch && (
        <ApolloLeadSearch onClose={() => setShowApolloSearch(false)} />
      )}
    </div>
  );
}

export default App;