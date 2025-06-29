/**
 * Componente ApplyLeadOnline
 * 
 * Este componente é responsável pela busca e qualificação de leads online via Apollo.io.
 * Principais funcionalidades:
 * - Busca de leads online: permite buscar leads diretamente da API do Apollo.io usando parâmetros como cargo (Job Title), localização, indústria, etc.
 * - Exibição dos resultados: mostra os leads encontrados em uma tabela, com informações detalhadas.
 * - Seleção e qualificação de leads: o usuário pode selecionar, qualificar e visualizar detalhes dos leads.
 * - Visualização de detalhes: permite abrir um modal com informações detalhadas do lead selecionado.
 * 
 * Dicas para futuras alterações:
 * - Para alterar os parâmetros de busca, edite a função handleSearch e os campos do formulário.
 * - Para modificar a exibição dos resultados, altere a renderização da tabela de leads.
 * - Para integrar com outras APIs, adapte a chamada fetch dentro de handleSearch.
 * - Para customizar a qualificação ou visualização de leads, edite as funções relacionadas e os modais de detalhes.
 * 
 * Localização do arquivo: src/components/ApplyLeadOnline.tsx
 */
import React, { useState, useEffect } from 'react';
import { X, Search, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { searchApolloLeads } from '../services/apollo';
import { getCompanyEmployeeCount } from '../services/openai';
import { Lead } from '../types';
import LeadDataModal from './LeadDataModal';
import { INDUSTRIES } from '../constants/industries';
import ApolloLeadSearch from './ApolloLeadSearch';

interface ApplyLeadOnlineProps {
  onClose: () => void;
}

const ApplyLeadOnline: React.FC<ApplyLeadOnlineProps> = ({ onClose }) => {
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [searchResults, setSearchResults] = useState<Lead[]>([]);
  const [qualifiedLeads, setQualifiedLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isQualifying, setIsQualifying] = useState(false);
  const [isEnrichingData, setIsEnrichingData] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showApolloSearch, setShowApolloSearch] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0); // Para forçar re-renderização

  const [searchParams, setSearchParams] = useState({
    jobTitle: '',
    location: '',
    industry: INDUSTRIES[0],
    count: 10
  });

  const addDebugLog = (message: string) => {
    console.log(`[Debug] ${message}`);
    setDebugLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  const enrichLeadsWithEmployeeData = async (leads: Lead[]): Promise<Lead[]> => {
    setIsEnrichingData(true);
    addDebugLog('Iniciando enriquecimento de dados de funcionários...');
    
    try {
      const enrichedLeads = await Promise.all(
        leads.map(async (lead, index) => {
          // Se já tem dados de funcionários válidos, pular
          if (lead.employeeCount && lead.employeeCount !== 'N/A' && lead.employeeCount !== '') {
            addDebugLog(`Lead ${lead.fullName}: dados de funcionários já disponíveis (${lead.employeeCount})`);
            return lead;
          }

          try {
            addDebugLog(`Buscando dados de funcionários para: ${lead.company}`);
            
            // Adicionar um pequeno delay para evitar rate limiting
            if (index > 0) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            const employeeCount = await getCompanyEmployeeCount(lead.company, lead.industry);
            addDebugLog(`${lead.company}: ${employeeCount} funcionários`);
            
            const updatedLead = {
              ...lead,
              employeeCount,
              // Adicionar timestamp para forçar re-renderização
              lastUpdated: Date.now()
            };
            
            return updatedLead;
          } catch (error) {
            addDebugLog(`Erro ao buscar dados para ${lead.company}: ${error}`);
            return {
              ...lead,
              employeeCount: 'N/A',
              lastUpdated: Date.now()
            };
          }
        })
      );

      addDebugLog(`Enriquecimento concluído para ${enrichedLeads.length} leads`);
      return enrichedLeads;
    } catch (error) {
      addDebugLog(`Erro no enriquecimento de dados: ${error}`);
      // Retorna leads com fallback e timestamp para forçar atualização
      return leads.map(lead => ({
        ...lead,
        employeeCount: lead.employeeCount || 'N/A',
        lastUpdated: Date.now()
      }));
    } finally {
      setIsEnrichingData(false);
    }
  };

  const handleSearchParamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = async () => {
    if (!searchParams.jobTitle) {
      setError('Please enter a job title to search');
      return;
    }

    setIsSearching(true);
    setError('');
    setSuccess(false);
    setSearchResults([]);
    setQualifiedLeads([]);
    addDebugLog('Starting search...');

    try {
      addDebugLog(`Search params: ${JSON.stringify(searchParams)}`);
      const results = await searchApolloLeads(
        searchParams.jobTitle,
        searchParams.location,
        searchParams.industry,
        searchParams.count
      );

      addDebugLog(`Found ${results.length} leads`);
      setSearchResults(results);
      
      if (results.length > 0) {
        // Enriquecer dados automaticamente
        addDebugLog('Iniciando enriquecimento automático de dados...');
        const enrichedResults = await enrichLeadsWithEmployeeData(results);
        setSearchResults([...enrichedResults]); // Força nova renderização com spread operator
        triggerUpdate(); // Força atualização adicional da interface
        
        addDebugLog(`Enriquecimento concluído. ${enrichedResults.length} leads atualizados.`);
      }
      
      setSuccess(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`Search error: ${errorMessage}`);
      setError('Error searching for leads. Please try again.');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadModal(true);
  };

  const handleQualifyLeads = () => {
    addDebugLog('Starting lead qualification...');
    
    if (searchResults.length === 0) {
      addDebugLog('No leads to qualify');
      setError('No leads to qualify');
      return;
    }

    setIsQualifying(true);

    try {
      addDebugLog(`Processing ${searchResults.length} leads for qualification`);
      
      // Apply qualification criteria
      const qualified = searchResults.filter(lead => {
        const checks = {
          basicInfo: Boolean(lead.firstName && lead.lastName && lead.jobTitle && lead.company),
          email: Boolean(lead.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) && lead.emailVerified),
          linkedin: Boolean(lead.profileUrl && lead.profileUrl.toLowerCase().includes('linkedin.com/in/')),
          company: Boolean(lead.company && lead.industry && lead.employeeCount !== 'N/A'),
          location: Boolean(lead.location && lead.location !== 'Location not available'),
          workHistory: Boolean(lead.workHistory && lead.workHistory.length > 0)
        };

        addDebugLog(`Qualifying lead ${lead.id} (${lead.fullName}):
          - Basic info: ${checks.basicInfo}
          - Email: ${checks.email}
          - LinkedIn: ${checks.linkedin}
          - Company: ${checks.company}
          - Location: ${checks.location}
          - Work history: ${checks.workHistory}
        `);

        return checks.basicInfo && checks.email && checks.linkedin && checks.company && checks.location && checks.workHistory;
      });

      addDebugLog(`Found ${qualified.length} qualified leads`);
      setQualifiedLeads(qualified);
      setSuccess(true);
      setError('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`Qualification error: ${errorMessage}`);
      setError('Error qualifying leads. Please try again.');
      console.error('Qualification error:', error);
    } finally {
      setIsQualifying(false);
    }
  };

  const displayedLeads = qualifiedLeads.length > 0 ? qualifiedLeads : searchResults;

  // Função para forçar atualização da interface
  const triggerUpdate = () => {
    setForceUpdate(prev => prev + 1);
  };

  // Monitorar mudanças nos dados enriquecidos
  useEffect(() => {
    if (searchResults.length > 0 && !isEnrichingData) {
      const hasEnrichedData = searchResults.some(lead => lead.employeeCount && lead.employeeCount !== 'N/A');
      if (hasEnrichedData) {
        addDebugLog('Dados enriquecidos detectados, atualizando interface...');
        triggerUpdate();
      }
    }
  }, [searchResults, isEnrichingData]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Apply Lead Online</h2>
            <p className="text-sm text-gray-600">Search and validate leads from Apollo.io</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Search Leads</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-4">
                <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  id="jobTitle"
                  name="jobTitle"
                  value={searchParams.jobTitle}
                  onChange={handleSearchParamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="E.g., React Developer, Marketing Manager"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={searchParams.location}
                  onChange={handleSearchParamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="E.g., New York, London"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <select
                  id="industry"
                  name="industry"
                  value={searchParams.industry}
                  onChange={handleSearchParamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {INDUSTRIES.map((industry, index) => (
                    <option key={index} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Leads
                </label>
                <input
                  type="number"
                  id="count"
                  name="count"
                  min="1"
                  max="100"
                  value={searchParams.count}
                  onChange={handleSearchParamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter number of leads to search"
                />
              </div>
            </div>
            
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleSearch}
                disabled={isSearching || isEnrichingData}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Search size={20} />
                {isSearching ? 'Searching...' : isEnrichingData ? 'Enriching Data...' : 'Search Leads'}
              </button>
              <button
                onClick={() => setShowApolloSearch(true)}
                className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center gap-2"
              >
                Busca Específica com IA
              </button>
              
              {searchResults.length > 0 && (
                <button
                  onClick={handleQualifyLeads}
                  disabled={isQualifying}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200"
                >
                  {isQualifying ? 'Qualifying...' : 'Quality Leads'}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 rounded-md flex items-center">
              <AlertCircle className="text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {isEnrichingData && (
            <div className="mb-4 p-4 bg-blue-50 rounded-md flex items-center">
              <Users className="text-blue-500 mr-2 animate-spin" />
              <p className="text-blue-700">
                Enriquecendo dados com informações de funcionários via IA...
              </p>
            </div>
          )}

          {success && displayedLeads.length > 0 && !isEnrichingData && (
            <div className="mb-4 p-4 bg-green-50 rounded-md flex items-center">
              <CheckCircle2 className="text-green-500 mr-2" />
              <p className="text-green-700">
                {qualifiedLeads.length > 0
                  ? `Found ${qualifiedLeads.length} qualified leads out of ${searchResults.length} total leads!`
                  : `Found ${searchResults.length} leads matching your criteria!`}
              </p>
            </div>
          )}

          {displayedLeads.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {qualifiedLeads.length > 0 ? 'Qualified' : ''} Search Results ({displayedLeads.length})
                </h2>
                <button
                  onClick={() => {
                    setSearchResults([]);
                    setQualifiedLeads([]);
                    setError('');
                    setSuccess(false);
                    setDebugLogs([]);
                    setIsEnrichingData(false);
                  }}
                  className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors duration-200"
                >
                  Limpar tudo
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name / Job Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        FTEs
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200" key={`leads-table-${forceUpdate}`}>
                    {displayedLeads.map(lead => (
                      <tr key={`${lead.id}-${lead.lastUpdated || forceUpdate}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                              {lead.firstName[0]}{lead.lastName[0]}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{lead.fullName}</div>
                              <div className="text-sm text-gray-500">{lead.jobTitle}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{lead.company}</div>
                          <div className="text-xs text-gray-500">{lead.industry}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center text-sm text-gray-900">
                            <Users size={14} className={`mr-1 ${isEnrichingData && (!lead.employeeCount || lead.employeeCount === 'N/A') ? 'text-blue-400 animate-spin' : 'text-gray-400'}`} />
                            {(() => {
                              const employeeCount = lead.employeeCount;
                              console.log(`[FTEs Debug] Lead: ${lead.fullName}, EmployeeCount: ${employeeCount}, IsEnriching: ${isEnrichingData}`);
                              
                              if (isEnrichingData && (!employeeCount || employeeCount === 'N/A')) {
                                return '...';
                              }
                              return employeeCount || 'N/A';
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{lead.location}</div>
                        </td>
                        <td className="px-4 py-3 space-x-2">
                          <button
                            onClick={() => handleLeadClick(lead)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View Details
                          </button>
                          {lead.profileUrl && (
                            <a
                              href={lead.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              LinkedIn
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {debugLogs.length > 0 && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <h3 className="text-lg font-semibold mb-2">Debug Logs</h3>
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {debugLogs.join('\n')}
              </pre>
            </div>
          )}
        </div>
      </div>

      {showLeadModal && selectedLead && (
        <LeadDataModal
          lead={selectedLead}
          onClose={() => setShowLeadModal(false)}
        />
      )}

      {showApolloSearch && (
        <ApolloLeadSearch onClose={() => setShowApolloSearch(false)} />
      )}
    </div>
  );
};

export default ApplyLeadOnline;