import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Save, CheckCircle2 } from 'lucide-react';

interface ApolloLead {
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  linkedin_url: string;
  organization_id: string;
  city: string;
  state: string;
}

interface Organization {
  id: string;
  name: string;
  primary_domain: string;
  employees: number;
  industry: string;
  city: string;
  state: string;
}

interface SearchResult {
  person: ApolloLead;
  organization: Organization;
}

interface ApolloLeadSearchProps {
  onClose: () => void;
  initialParams?: {
    firstName?: string;
    lastName?: string;
    organizationName?: string;
    organizationDomain?: string;
  };
}

const ApolloLeadSearch: React.FC<ApolloLeadSearchProps> = ({ onClose, initialParams }) => {
  const [searchParams, setSearchParams] = useState({
    firstName: initialParams?.firstName || '',
    lastName: initialParams?.lastName || '',
    organizationName: initialParams?.organizationName || '',
    organizationDomain: initialParams?.organizationDomain || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [companyDescription, setCompanyDescription] = useState<string | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  // Novo estado para controlar se a descrição já foi buscada para o domínio atual
  const [lastDomainSearched, setLastDomainSearched] = useState('');

  // useEffect para buscar descrição automaticamente quando o domínio é preenchido
  useEffect(() => {
    if (
      searchParams.organizationDomain &&
      searchParams.organizationDomain !== lastDomainSearched &&
      !companyLoading &&
      !result?.organization
    ) {
      setLastDomainSearched(searchParams.organizationDomain);
      fetchCompanyDescription();
    }
    // eslint-disable-next-line
  }, [searchParams.organizationDomain]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setSaved(false);

      // Primeira chamada para buscar dados da pessoa
      const personResponse = await fetch('/apollo/api/v1/people/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Accept': 'application/json',
          'X-Api-Key': import.meta.env.VITE_APOLLO_API_KEY || ''
        },
        body: JSON.stringify({
          first_name: searchParams.firstName,
          last_name: searchParams.lastName,
          organization_name: searchParams.organizationName
        })
      });

      if (!personResponse.ok) {
        let errorMsg = 'Erro ao buscar dados da pessoa';
        try {
          const errorData = await personResponse.json();
          errorMsg = errorData.message || JSON.stringify(errorData) || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const personData = await personResponse.json();
      if (!personData.person) {
        throw new Error('Nenhum resultado encontrado para os critérios informados');
      }

      // Se o domínio da empresa for informado, buscar dados da organização
      let organization = null;
      let cleanDomain = searchParams.organizationDomain
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .replace(/\s/g, '');
      if (cleanDomain) {
        const orgResponse = await fetch(`/apollo/api/v1/organizations/enrich?domain=${encodeURIComponent(cleanDomain)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Accept': 'application/json',
            'X-Api-Key': import.meta.env.VITE_APOLLO_API_KEY || ''
          }
        });
        if (!orgResponse.ok) {
          let errorMsg = 'Erro ao buscar dados da organização';
          try {
            const errorData = await orgResponse.json();
            errorMsg = errorData.message || JSON.stringify(errorData) || errorMsg;
          } catch (e) {}
          throw new Error(errorMsg);
        }
        const orgData = await orgResponse.json();
        organization = orgData.organization;
      }

      setResult({
        person: personData.person,
        organization: organization
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao realizar a busca');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLead = () => {
    if (!result) return;

    try {
      // Aqui você pode implementar a lógica para salvar o lead
      // Por exemplo, enviar para uma API ou salvar no localStorage
      const leadToSave = {
        ...result.person,
        organization: result.organization
      };

      // Exemplo de salvamento no localStorage
      const savedLeads = JSON.parse(localStorage.getItem('savedLeads') || '[]');
      savedLeads.push(leadToSave);
      localStorage.setItem('savedLeads', JSON.stringify(savedLeads));

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Erro ao salvar o lead');
    }
  };

  // Função para buscar descrição da empresa via OpenAI
  const fetchCompanyDescription = async () => {
    if (!searchParams.organizationDomain) return;
    setCompanyLoading(true);
    setCompanyDescription(null);
    try {
      const prompt = `Descreva brevemente a empresa cujo site é ${searchParams.organizationDomain}.`;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300
        })
      });
      const data = await response.json();
      setCompanyDescription(data.choices?.[0]?.message?.content || 'Não foi possível gerar uma descrição com IA.');
    } catch (e) {
      setCompanyDescription('Não foi possível gerar uma descrição com IA.');
    } finally {
      setCompanyLoading(false);
    }
  };

  // Função para buscar domínio da empresa via OpenAI
  const fetchCompanyDomain = async () => {
    if (!searchParams.organizationName) return;
    setCompanyLoading(true);
    setCompanyDescription(null);
    try {
      const prompt = `Qual é o domínio do site oficial da empresa chamada '${searchParams.organizationName}' no Brasil? Responda apenas com o domínio, sem texto extra.`;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 20
        })
      });
      const data = await response.json();
      const domain = data.choices?.[0]?.message?.content?.replace(/\s/g, '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '') || '';
      if (domain && domain.includes('.')) {
        setSearchParams(prev => ({ ...prev, organizationDomain: domain }));
        setCompanyDescription(null);
        // Buscar descrição automaticamente após preencher domínio
        setTimeout(() => {
          fetchCompanyDescription();
        }, 100); // pequeno delay para garantir atualização do estado
      } else {
        setCompanyDescription('Não foi possível identificar o domínio da empresa com IA.');
      }
    } catch (e) {
      setCompanyDescription('Não foi possível identificar o domínio da empresa com IA.');
    } finally {
      setCompanyLoading(false);
    }
  };

  // Função para melhorar a descrição com IA
  const improveCompanyDescription = async () => {
    if (!companyDescription) return;
    setCompanyLoading(true);
    try {
      const prompt = `Melhore e detalhe a seguinte descrição de empresa: ${companyDescription}`;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 120
        })
      });
      const data = await response.json();
      setCompanyDescription(data.choices?.[0]?.message?.content || companyDescription);
    } catch (e) {
      setCompanyDescription(companyDescription + '\n\n(Não foi possível melhorar a descrição com IA.)');
    } finally {
      setCompanyLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white px-6 py-4 flex justify-between items-center border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Busca de Lead no Apollo</h1>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={searchParams.firstName}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Sobrenome
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={searchParams.lastName}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sobrenome"
                />
              </div>
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  id="organizationName"
                  value={searchParams.organizationName}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, organizationName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome da Empresa"
                />
              </div>
              <div>
                <label htmlFor="organizationDomain" className="block text-sm font-medium text-gray-700 mb-1">
                  Domínio da Empresa (opcional)
                </label>
                <input
                  type="text"
                  id="organizationDomain"
                  value={searchParams.organizationDomain}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, organizationDomain: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="exemplo.com"
                />
              </div>
            </div>

            <button
              onClick={handleSearch}
              disabled={loading || !searchParams.firstName || !searchParams.lastName || !searchParams.organizationName}
              className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="mr-2" size={20} />
                  Buscar Lead
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-md flex items-center">
              <X className="text-red-500 mr-2" size={20} />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Resultado da Busca</h2>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Dados da Pessoa</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm text-gray-500">Nome Completo</dt>
                        <dd className="text-sm text-gray-900">{`${result.person.first_name} ${result.person.last_name}`}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Cargo</dt>
                        <dd className="text-sm text-gray-900">{result.person.title}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Email</dt>
                        <dd className="text-sm text-gray-900">{result.person.email}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">LinkedIn</dt>
                        <dd className="text-sm text-gray-900">
                          <a href={result.person.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                            {result.person.linkedin_url}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Localização</dt>
                        <dd className="text-sm text-gray-900">{`${result.person.city}, ${result.person.state}`}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <div>
                      {result.organization ? (
                        <>
                          <h3 className="font-medium text-gray-900 mb-2">Dados da Empresa</h3>
                          <dl className="space-y-2">
                            <div>
                              <dt className="text-sm text-gray-500">Nome da Empresa</dt>
                              <dd className="text-sm text-gray-900">{result.organization.name}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Domínio</dt>
                              <dd className="text-sm text-gray-900">{result.organization.primary_domain}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Número de Funcionários</dt>
                              <dd className="text-sm text-gray-900">{result.organization.employees}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Indústria</dt>
                              <dd className="text-sm text-gray-900">{result.organization.industry}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Localização</dt>
                              <dd className="text-sm text-gray-900">{`${result.organization.city}, ${result.organization.state}`}</dd>
                            </div>
                          </dl>
                        </>
                      ) : (
                        <>
                          <h3 className="font-medium text-gray-900 mb-2">Dados da Empresa</h3>
                          <button
                            className="mb-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-semibold shadow"
                            onClick={async () => {
                              if (!searchParams.organizationDomain && searchParams.organizationName) {
                                await fetchCompanyDomain();
                              }
                            }}
                            disabled={companyLoading || !searchParams.organizationName}
                          >
                            {companyLoading ? 'Consultando IA...' : (!searchParams.organizationDomain ? 'Buscar Dados da Empresa com IA' : 'Gerar Descrição com IA')}
                          </button>
                          {companyLoading ? (
                            <div className="text-blue-700 bg-blue-50 p-3 rounded animate-pulse">Consultando IA...</div>
                          ) : companyDescription ? (
                            <div className="text-blue-700 bg-blue-50 p-3 rounded" style={{ maxHeight: 200, overflowY: 'auto' }}>
                              {companyDescription}
                            </div>
                          ) : (
                            <div className="text-yellow-700 bg-yellow-50 p-3 rounded">
                              Para exibir os dados da empresa, informe o domínio no campo correspondente.<br />
                              <span className="text-xs">Clique no botão acima para gerar uma descrição ou buscar o domínio com IA.</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApolloLeadSearch; 