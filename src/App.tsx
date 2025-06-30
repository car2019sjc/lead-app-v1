import React, { useState, useEffect } from 'react';
import LinkedInLeadFinder from './components/LinkedInLeadFinder';
import ApplyLeadOnline from './components/ApplyLeadOnline';
import ApplyLeadOffline from './components/ApplyLeadOffline';
import ApolloLeadSearch from './components/ApolloLeadSearch';
import { ExternalLink, Lock, User, Search } from 'lucide-react';

const OnSetLogo: React.FC = () => {
  return (
    <div 
      className="text-3xl font-extrabold mb-1 tracking-tight"
      style={{ 
        minWidth: 'max-content', 
        display: 'block', 
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'visible',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <span style={{ color: '#2563eb' }}>On</span>
      <span style={{ color: '#FF7A00' }}>Set</span>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showOnlineApp, setShowOnlineApp] = useState(false);
  const [showOfflineApp, setShowOfflineApp] = useState(false);
  
  console.log('App state - showOfflineApp:', showOfflineApp);

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
        <div className="w-full max-w-md px-4">
          <form onSubmit={handleLogin} className="bg-[#26293b] p-10 rounded-2xl shadow-2xl border border-[#23263a] flex flex-col gap-2">
            <div className="flex flex-col items-center mb-6">
                      <div className="text-center mb-8">
          <OnSetLogo />
          <p className="text-xs font-bold mb-4" style={{ color: '#FF7A00' }}>Conectando Inteligência e Tecnologia</p>
        </div>
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
      {/* Botão no lado direito */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={() => setIsAuthenticated(false)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 shadow-lg font-semibold"
        >
          Encerrar
        </button>
      </div>
      
      <LinkedInLeadFinder 
        onShowOfflineApp={() => setShowOfflineApp(true)}
      />

      {showOnlineApp && (
        <ApplyLeadOnline onClose={() => setShowOnlineApp(false)} />
      )}

      {showOfflineApp && (
        <ApplyLeadOffline onClose={() => {
          console.log('Fechando ApplyLeadOffline');
          setShowOfflineApp(false);
        }} />
      )}
    </div>
  );
}

export default App;