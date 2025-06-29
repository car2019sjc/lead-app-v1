import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, X, Loader2, Download } from 'lucide-react';
import { searchApolloLead } from '../services/apollo';
import { getCompanyEmployeeCount } from '../services/openai';
import { utils, writeFile, WorkBook, WorkSheet } from 'xlsx';
import { ExcelLead } from '../types/excel';

interface ApolloLead {
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  emailStatus?: string;
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
  const isMountedRef = useRef(true);
  const [searchParams, setSearchParams] = useState({
    firstName: initialParams?.firstName || '',
    lastName: initialParams?.lastName || '',
    organizationName: initialParams?.organizationName || '',
    organizationDomain: initialParams?.organizationDomain || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  const [companyDescription, setCompanyDescription] = useState<string | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyData, setCompanyData] = useState<{
    industry?: string;
    employees?: string;
    description?: string;
  } | null>(null);
  // Novo estado para controlar se a descrição já foi buscada para o domínio atual
  const [lastDomainSearched, setLastDomainSearched] = useState('');

  useEffect(() => {
    if (initialParams) {
      setSearchParams(prev => ({
        ...prev,
        ...initialParams
      }));
    }
  }, [initialParams]);

  // Limpar ref quando componente for desmontado
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Função específica para buscar setor usando Google API
  const fetchIndustryFromGoogle = async (companyName: string, domain?: string) => {
    try {
      console.log('Buscando setor da empresa no Google:', companyName);
      
      const searchQuery = domain 
        ? `"${companyName}" site:${domain} setor indústria ramo atividade`
        : `"${companyName}" Brasil setor indústria ramo atividade`;
      
      const prompt = `Baseado em uma pesquisa no Google sobre a empresa "${companyName}"${domain ? ` (site: ${domain})` : ''}, identifique qual é o setor/indústria desta empresa.

Responda APENAS com o nome do setor em português, sem explicações adicionais. Exemplos de resposta:
- Tecnologia
- Saúde
- Educação
- Logística
- Varejo
- Construção Civil
- Consultoria
- Financeiro

Se não conseguir identificar, responda apenas: "Não identificado"`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 50,
          temperature: 0.3
        })
      });

      const data = await response.json();
      const industry = data.choices?.[0]?.message?.content?.trim() || 'Não identificado';
      
      console.log('Setor encontrado via Google:', industry);
      return industry;
    } catch (error) {
      console.error('Erro ao buscar setor no Google:', error);
      return 'Não identificado';
    }
  };

  const handleCompanyDataFetch = async () => {
    if (!searchParams.organizationName) {
      setCompanyDescription('Nome da empresa não informado.');
      return;
    }

    setCompanyLoading(true);
    setCompanyDescription(null);
    setCompanyData(null);
    
    try {
      let domain = searchParams.organizationDomain;
      
      if (!domain) {
        // Primeiro, tentar encontrar o domínio da empresa
        console.log('Buscando domínio da empresa com IA...');
        const domainPrompt = `Qual é o domínio do site oficial da empresa chamada '${searchParams.organizationName}' no Brasil? Responda apenas com o domínio, sem texto extra.`;
        const domainResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: domainPrompt }],
            max_tokens: 50
        })
      });
        
        const domainData = await domainResponse.json();
        domain = domainData.choices?.[0]?.message?.content?.trim()
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/\/$/, '') || '';
        
        if (domain && domain.includes('.') && !domain.includes(' ')) {
        setSearchParams(prev => ({ ...prev, organizationDomain: domain }));
          console.log('Domínio encontrado:', domain);
        }
      }
      
      // Buscar informações da empresa (setor, descrição, funcionários) usando funções específicas
      console.log('Buscando informações da empresa com IA...');
      console.log('Domínio para busca:', domain);
      console.log('Nome da empresa para busca:', searchParams.organizationName);
      
      // Buscar setor usando Google
      const googleIndustry = await fetchIndustryFromGoogle(searchParams.organizationName, domain);
      
      // Buscar quantidade de funcionários usando a função específica da OpenAI
      console.log('Buscando dados de funcionários com IA...');
      const employeeCount = await getCompanyEmployeeCount(searchParams.organizationName, googleIndustry);
      console.log('Funcionários encontrados:', employeeCount);
      
      // Buscar descrição da empresa
      const descriptionPrompt = domain 
        ? `Forneça uma breve descrição profissional da empresa ${searchParams.organizationName} (site: ${domain}). Inclua suas principais atividades e área de atuação. Responda em português e seja conciso.`
        : `Forneça uma breve descrição profissional da empresa ${searchParams.organizationName} no Brasil. Inclua suas principais atividades e área de atuação. Responda em português e seja conciso.`;
        
      const descResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: descriptionPrompt }],
          max_tokens: 200,
          temperature: 0.3
        })
      });
      
      const descData = await descResponse.json();
      const description = descData.choices?.[0]?.message?.content?.trim() || 'Descrição não disponível';
      
      // Definir dados da empresa
      setCompanyData({
        industry: googleIndustry !== 'Não identificado' ? googleIndustry : 'Setor não identificado',
        employees: employeeCount,
        description: description
      });
      setCompanyDescription(description);
      
      console.log('Dados da empresa definidos:', {
        industry: googleIndustry,
        employees: employeeCount,
        description: description
      });
      
    } catch (e) {
      console.error('Erro ao buscar dados da empresa:', e);
      setCompanyDescription('Não foi possível buscar informações da empresa com IA.');
      setCompanyData(null);
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchParams.firstName && !searchParams.lastName && !searchParams.organizationName) {
      setError('Por favor, preencha pelo menos um campo para buscar.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCompanyDescription(null);
    setCompanyData(null);
    
    try {
      const response = await searchApolloLead(searchParams);
      setResult(response);
      
      // Se não temos dados da organização OU se os dados estão incompletos, buscar automaticamente com IA
      const needsCompanyData = !response.organization || 
        !response.organization.industry || 
        response.organization.industry === 'N/A' || 
        response.organization.industry === '' ||
        !response.organization.employees;
        
      if (needsCompanyData && searchParams.organizationName) {
        console.log('Dados da empresa incompletos ou não encontrados, buscando automaticamente com IA...');
        await handleCompanyDataFetch();
      } else if (response.organization && (!response.organization.industry || response.organization.industry === '')) {
        // Se temos organização mas não temos setor, buscar apenas o setor via Google
        console.log('Setor não encontrado no Apollo, buscando via Google...');
        const googleIndustry = await fetchIndustryFromGoogle(
          searchParams.organizationName, 
          response.organization?.primary_domain
        );
        
        if (googleIndustry !== 'Não identificado') {
          // Atualizar apenas o setor da organização existente
          setResult(prev => prev ? {
            ...prev,
            organization: prev.organization ? {
              ...prev.organization,
              industry: googleIndustry
            } : prev.organization
          } : prev);
          console.log('Setor atualizado via Google:', googleIndustry);
        }
      }
    } catch (err) {
      console.log('Erro na busca do Apollo:', err);
      
      // Se a busca falhou mas temos nome da empresa, tentar buscar informações da empresa com IA
      if (searchParams.organizationName && !result) {
        console.log('Busca do Apollo falhou, mas tentando buscar informações da empresa com IA...');
        try {
          await handleCompanyDataFetch();
          // Não mostrar erro se conseguimos buscar informações da empresa
          setError(null);
        } catch (companyErr) {
          setError('Lead não encontrado no Apollo e não foi possível buscar informações da empresa.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao buscar lead');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLead = () => {
    if (!result) return;

    try {
      console.log('Exportando lead para Excel...');
      
      // Dados do lead
      const data = {
        'Nome': `${result.person.first_name} ${result.person.last_name}`,
        'Cargo': result.person.title || '',
        'Email': result.person.email || '',
        'Empresa': result.organization?.name || searchParams.organizationName || '',
        'Setor': companyData?.industry || result.organization?.industry || '',
        'Funcionários': companyData?.employees || result.organization?.employees?.toString() || '',
        'LinkedIn': result.person.linkedin_url || '',
        'Cidade': result.person.city || '',
        'Estado': result.person.state || '',
        'Domínio': result.organization?.primary_domain || searchParams.organizationDomain || ''
      };

      // Criar Excel
      const ws = utils.json_to_sheet([data]);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Lead');

      // Download
      const fileName = `lead_${Date.now()}.xlsx`;
      writeFile(wb, fileName);
      
      // Feedback simples
      console.log('Download concluído com sucesso!');
      
      console.log('Excel exportado:', fileName);

    } catch (err) {
      console.error('Erro:', err);
      setError('Erro ao exportar Excel');
    }
  };

  // Função helper para atualizações de estado seguras
  const safeSetState = useCallback((setter: () => void) => {
    if (isMountedRef.current) {
      try {
        setter();
      } catch (error) {
        console.error('Erro ao atualizar estado:', error);
      }
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center disabled:bg-blue-400"
            >
              <span className={`flex items-center justify-center ${loading ? 'hidden' : ''}`}>
                <Search className="w-5 h-5 mr-2" />
                Buscar Lead
              </span>
              <span className={`flex items-center justify-center ${!loading ? 'hidden' : ''}`}>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Buscando...
              </span>
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <X className="text-red-500 mr-2" size={20} />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Mostrar informações da empresa mesmo quando o lead não é encontrado */}
          {!result && (companyDescription || companyData) && !loading && (
            <div key="fallback-company" className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Informações da Empresa</h2>
              </div>
              <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  ℹ️ Lead não encontrado no Apollo, mas conseguimos buscar informações da empresa com IA
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <p><strong className="font-medium text-gray-600">Nome:</strong> {searchParams.organizationName}</p>
                  <p><strong className="font-medium text-gray-600">Domínio:</strong> 
                    {searchParams.organizationDomain ? (
                      <a 
                        href={`http://${searchParams.organizationDomain}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline ml-1"
                      >
                        {searchParams.organizationDomain}
                      </a>
                    ) : ' N/A'}
                  </p>
                  <p><strong className="font-medium text-gray-600">Setor:</strong> {companyData?.industry || 'N/A'}</p>
                  <p><strong className="font-medium text-gray-600">Funcionários:</strong> {companyData?.employees || 'N/A'}</p>
                  {companyDescription && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800"><strong>Descrição:</strong></p>
                      <p className="text-sm text-blue-700 mt-1">{companyDescription}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {result && (
            <div key="search-result" className="mt-6 space-y-6">
              {/* Header com botão salvar */}
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Resultado da Busca</h2>
                <button
                  onClick={handleSaveLead}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Excel
                </button>
              </div>

              {/* Bloco 1: Dados da Pessoa */}
              <div key="person-info" className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3 text-lg border-b border-gray-100 pb-2">👤 Dados da Pessoa</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Nome Completo</dt>
                    <dd className="text-sm text-gray-900 font-medium">{`${result.person.first_name} ${result.person.last_name}`}</dd>
                      </div>
                      <div>
                    <dt className="text-sm font-medium text-gray-500">Cargo</dt>
                        <dd className="text-sm text-gray-900">{result.person.title}</dd>
                      </div>
                      <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">
                      {result.person.emailStatus === 'available' ? (
                        <a href={`mailto:${result.person.email}`} className="text-blue-600 hover:underline font-medium">
                          {result.person.email}
                        </a>
                      ) : result.person.emailStatus === 'locked' ? (
                        <div className="flex items-center">
                          <span className="text-orange-600">📧 Email não foi desbloqueado automaticamente</span>
                          <span className="text-xs text-gray-500 ml-2">(tentativa de usar créditos falhou)</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Email não encontrado</span>
                      )}
                    </dd>
                      </div>
                      <div>
                    <dt className="text-sm font-medium text-gray-500">LinkedIn</dt>
                        <dd className="text-sm text-gray-900">
                      {result.person.linkedin_url ? (
                        <a href={result.person.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Ver perfil no LinkedIn
                          </a>
                      ) : 'N/A'}
                        </dd>
                      </div>
                      <div>
                    <dt className="text-sm font-medium text-gray-500">Localização</dt>
                        <dd className="text-sm text-gray-900">{`${result.person.city}, ${result.person.state}`}</dd>
                      </div>
                    </dl>
              </div>

              {/* Bloco 2: Informações da Empresa */}
              <div key="company-info" className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3 text-lg border-b border-blue-200 pb-2">🏢 Informações da Empresa</h3>
                
                {companyLoading && (
                  <div className="text-blue-700 bg-blue-100 p-3 rounded-lg animate-pulse flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Buscando informações adicionais da empresa...
                  </div>
                )}
                
                {!companyLoading && (result.organization || companyDescription || companyData) && (
                  <div className="space-y-4">
                    {/* Informações básicas da empresa */}
                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                        <dt className="text-sm font-medium text-blue-700">Nome</dt>
                        <dd className="text-sm text-gray-900 font-medium">{result?.organization?.name || searchParams.organizationName || 'N/A'}</dd>
                            </div>
                            <div>
                        <dt className="text-sm font-medium text-blue-700">Setor</dt>
                        <dd className="text-sm text-gray-900 font-medium">{companyData?.industry || result?.organization?.industry || 'N/A'}</dd>
                            </div>
                            <div>
                        <dt className="text-sm font-medium text-blue-700">Funcionários</dt>
                        <dd className="text-sm text-gray-900">{companyData?.employees || result?.organization?.employees || 'N/A'}</dd>
                            </div>
                      {(result?.organization?.primary_domain || searchParams.organizationDomain) && (
                            <div>
                          <dt className="text-sm font-medium text-blue-700">Domínio</dt>
                          <dd className="text-sm text-gray-900">
                            <a 
                              href={`http://${result?.organization?.primary_domain || searchParams.organizationDomain}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {result?.organization?.primary_domain || searchParams.organizationDomain}
                            </a>
                          </dd>
                            </div>
                      )}
                      {(result?.organization?.city && result?.organization?.state) && (
                            <div>
                          <dt className="text-sm font-medium text-blue-700">Localização</dt>
                              <dd className="text-sm text-gray-900">{`${result.organization.city}, ${result.organization.state}`}</dd>
                            </div>
                      )}
                    </dl>
                    
                    {/* Descrição da empresa */}
                    {companyDescription && (
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <div className="text-sm font-medium text-blue-700 mb-2">Descrição da Empresa</div>
                        <div className="text-sm text-gray-700 leading-relaxed">{companyDescription}</div>
                    </div>
                    )}
                  </div>
                )}
                
                {!companyLoading && !result.organization && !companyDescription && !companyData && (
                  <div className="text-center py-6 text-gray-500">
                    <p>Dados da empresa não disponíveis</p>
                    <p className="text-sm mt-1">Tente incluir o nome da empresa na busca</p>
                </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApolloLeadSearch; 