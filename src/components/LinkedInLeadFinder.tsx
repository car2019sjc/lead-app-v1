import React, { useState, useEffect } from 'react';
import { searchApolloLeads } from '../services/apollo';
import { getCompanyEmployeeCount } from '../services/openai';
import { Lead, SearchParams, Notification as NotificationType } from '../types';
import SearchForm from './SearchForm';
import SearchResults from './SearchResults';
import SavedLeads from './SavedLeads';
import Notification from './Notification';
import TabNavigation from './TabNavigation';
import Footer from './Footer';
import { ExternalLink } from 'lucide-react';

interface LinkedInLeadFinderProps {
  onShowOfflineApp: () => void;
}

const LinkedInLeadFinder: React.FC<LinkedInLeadFinderProps> = ({ onShowOfflineApp }) => {
  const [activeTab, setActiveTab] = useState<string>('search');
  const [searchParams, setSearchParams] = useState<SearchParams>({
    jobTitle: '',
    location: '',
    industry: '',
    count: 10
  });
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isEnrichingData, setIsEnrichingData] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [savedLeads, setSavedLeads] = useState<Lead[]>([]);
  const [notification, setNotification] = useState<NotificationType>({ 
    show: false, 
    message: '', 
    type: '' 
  });
  const [forceUpdate, setForceUpdate] = useState<number>(0); // Para forçar re-renderização

  // Load saved leads from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('savedLeads');
    if (savedData) {
      try {
        setSavedLeads(JSON.parse(savedData));
      } catch (error) {
        console.error('Error loading saved leads:', error);
      }
    }
  }, []);

  // Save leads to localStorage when they change
  useEffect(() => {
    localStorage.setItem('savedLeads', JSON.stringify(savedLeads));
  }, [savedLeads]);

  // Show temporary notification
  const showNotification = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 5000);
  };

  // Enrich leads with employee data using AI
  const enrichLeadsWithEmployeeData = async (leads: Lead[]): Promise<Lead[]> => {
    console.log('[LinkedInLeadFinder] Iniciando enriquecimento para', leads.length, 'leads');
    setIsEnrichingData(true);
    
    try {
      // Timeout geral de 30 segundos para todo o processo
      const enrichmentPromise = Promise.all(
        leads.map(async (lead, index) => {
          // Skip if already has valid employee data
          if (lead.employeeCount && lead.employeeCount !== 'N/A' && lead.employeeCount !== '') {
            console.log(`[LinkedInLeadFinder] Lead ${lead.fullName}: dados já disponíveis (${lead.employeeCount})`);
            return lead;
          }

          try {
            console.log(`[LinkedInLeadFinder] Buscando dados para: ${lead.company}`);
            // Timeout de 8 segundos para cada empresa
            const timeoutPromise = new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 8000)
            );
            
            const employeeCountPromise = getCompanyEmployeeCount(lead.company, lead.industry);
            
            const employeeCount = await Promise.race([employeeCountPromise, timeoutPromise]);
            
            console.log(`[LinkedInLeadFinder] ${lead.company}: ${employeeCount} funcionários`);
            
            return {
              ...lead,
              employeeCount,
              lastUpdated: Date.now() // Adicionar timestamp para debug
            };
          } catch (error) {
            console.error(`[LinkedInLeadFinder] ❌ Erro/Timeout para ${lead.company}, usando fallback:`, error);
            
            // Fallback: usar dados estimados baseados no setor
            const fallbackData = {
              'Technology': '51-200',
              'Software': '51-200', 
              'Marketing': '11-50',
              'Consulting': '11-50',
              'Healthcare': '201-500',
              'Finance': '501-1000',
              'Education': '201-500',
              'Retail': '1001-5000'
            };
            
            const fallbackCount = fallbackData[lead.industry as keyof typeof fallbackData] || '11-50';
            
            return {
              ...lead,
              employeeCount: fallbackCount,
              lastUpdated: Date.now()
            };
          }
        })
      );
      
      const timeoutPromise = new Promise<Lead[]>((_, reject) => 
        setTimeout(() => reject(new Error('Processo de enriquecimento expirou')), 30000)
      );
      
      const enrichedLeads = await Promise.race([enrichmentPromise, timeoutPromise]);
      
      console.log('[LinkedInLeadFinder] ✅ Enriquecimento concluído:', enrichedLeads);
      return enrichedLeads;
    } catch (error) {
      console.error('[LinkedInLeadFinder] ❌ Erro geral no enriquecimento:', error);
      
      // Em caso de erro geral, retornar leads com dados de fallback
      const leadsWithFallback = leads.map(lead => ({
        ...lead,
        employeeCount: lead.employeeCount || '11-50', // Fallback padrão
        lastUpdated: Date.now()
      }));
      
      console.log('[LinkedInLeadFinder] Retornando leads com fallback:', leadsWithFallback);
      return leadsWithFallback;
    } finally {
      console.log('[LinkedInLeadFinder] Finalizando enriquecimento, setIsEnrichingData(false)');
      setIsEnrichingData(false);
    }
  };

  // Handle search parameter changes
  const handleSearchParamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Search for leads in Apollo
  const handleSearch = async () => {
    if (!searchParams.jobTitle) {
      showNotification('Please enter at least a job title to search', 'error');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      console.log('[LinkedInLeadFinder] Iniciando busca...', searchParams);
      const results = await searchApolloLeads(
        searchParams.jobTitle, 
        searchParams.location, 
        searchParams.industry, 
        searchParams.count
      );
      
      console.log('[LinkedInLeadFinder] Resultados encontrados:', results.length);
      setSearchResults(results);
      
      if (results.length > 0) {
        showNotification(`${results.length} leads found! Enriquecendo dados...`);
        
        console.log('[LinkedInLeadFinder] Iniciando enriquecimento de dados...');
        // Automatically enrich data with AI
        const enrichedResults = await enrichLeadsWithEmployeeData(results);
        
        console.log('[LinkedInLeadFinder] Dados enriquecidos:', enrichedResults);
        setSearchResults(enrichedResults);
        
        // Verificar se os dados foram realmente enriquecidos
        const enrichedCount = enrichedResults.filter(lead => lead.employeeCount && lead.employeeCount !== 'N/A').length;
        console.log(`[LinkedInLeadFinder] ${enrichedCount} leads enriquecidos com dados de funcionários`);
        
        // Forçar atualização da interface
        triggerUpdate();
        
        showNotification(`${results.length} leads encontrados e enriquecidos com sucesso!`);
      } else {
        showNotification('No leads found with these criteria', 'warning');
      }
    } catch (error) {
      console.error('[LinkedInLeadFinder] Erro na busca:', error);
      showNotification(`Error searching for leads: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle lead selection
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => {
      if (prev.includes(leadId)) {
        return prev.filter(id => id !== leadId);
      } else {
        return [...prev, leadId];
      }
    });
  };

  // Select all leads
  const selectAllLeads = () => {
    if (selectedLeads.length === searchResults.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(searchResults.map(lead => lead.id));
    }
  };

  // Save selected leads
  const saveSelectedLeads = () => {
    if (selectedLeads.length === 0) {
      showNotification('Select at least one lead to save', 'error');
      return;
    }

    const selectedLeadsData = searchResults.filter(lead => selectedLeads.includes(lead.id));
    setSavedLeads(prev => {
      // Adiciona apenas leads que ainda não estão salvos (por id)
      const prevIds = new Set(prev.map(lead => lead.id));
      const novosLeads = selectedLeadsData.filter(lead => !prevIds.has(lead.id));
      if (novosLeads.length === 0) {
        showNotification('Todos os leads selecionados já estão salvos.', 'warning');
        return prev;
      }
      showNotification(`${novosLeads.length} lead(s) salvo(s) com sucesso!`);
      return [...novosLeads, ...prev];
    });
    setSelectedLeads([]);
    setActiveTab('saved');
  };

  // Delete saved lead
  const deleteSavedLead = (leadId: string) => {
    setSavedLeads(prev => prev.filter(lead => lead.id !== leadId));
    showNotification('Lead removed successfully');
  };

  // Clear all saved leads
  const clearAllSavedLeads = () => {
    if (savedLeads.length === 0) {
      showNotification('Nenhum lead salvo para limpar!', 'warning');
      return;
    }
    if (confirm(`Tem certeza que deseja remover todos os ${savedLeads.length} leads salvos?`)) {
      setSavedLeads([]);
      showNotification('Todos os leads foram removidos!');
    }
  };

  // Export leads as CSV
  const exportLeads = () => {
    if (savedLeads.length === 0) {
      showNotification('No leads to export', 'warning');
      return;
    }

    // Create CSV header
    const headers = ['Name', 'Job Title', 'Company', 'Location', 'Email', 'LinkedIn URL'];
    
    // Create CSV rows
    const rows = savedLeads.map(lead => [
      lead.fullName,
      lead.jobTitle,
      lead.company,
      lead.location,
      lead.email || '',
      lead.profileUrl || ''
    ]);
    
    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `linkedin_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Leads exported successfully!');
  };

  // Função para forçar atualização da interface
  const triggerUpdate = () => {
    setForceUpdate(prev => prev + 1);
    console.log('[LinkedInLeadFinder] Forçando atualização da interface');
  };

  // Monitorar mudanças nos dados enriquecidos
  useEffect(() => {
    if (searchResults.length > 0 && !isEnrichingData) {
      const hasEnrichedData = searchResults.some(lead => lead.employeeCount && lead.employeeCount !== 'N/A');
      if (hasEnrichedData) {
        console.log('[LinkedInLeadFinder] Dados enriquecidos detectados, atualizando interface...');
        triggerUpdate();
      }
    }
  }, [searchResults, isEnrichingData]);

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

  return (
    <div className="max-w-6xl mx-auto p-4 pt-20">
      {/* Header com logo OnSet */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center mb-2">
          <OnSetLogo />
        </div>
        <p className="text-xs text-gray-500 mb-4">Conectando Inteligência e Tecnologia</p>
      </div>
      
              <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Localizador de leads - Apollo / LinkedIn</h1>
          <p className="text-gray-600">Integração real com a API Apollo.io para pesquisas de leads</p>
          
          {/* Botão Leads Offline - Apollo */}
          <div className="mt-4">
            <button
              onClick={() => {
                console.log('Botão Leads Offline - Apollo clicado');
                onShowOfflineApp();
              }}
              className="group inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-lg"
              title="Upload de arquivos CSV/Excel do Apollo.io para busca offline"
            >
              <ExternalLink size={18} />
              <div className="flex flex-col items-start">
                <span className="font-medium">Leads Offline - Apollo</span>
                <span className="text-xs opacity-90 leading-tight">CSV/Excel do Apollo.io</span>
              </div>
            </button>
          </div>
        </div>

      <Notification notification={notification} />

      <TabNavigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        savedLeadsCount={savedLeads.length} 
      />

      {activeTab === 'search' && (
        <div>
          <SearchForm 
            searchParams={searchParams}
            handleSearchParamChange={handleSearchParamChange}
            handleSearch={handleSearch}
            isSearching={isSearching}
            isEnrichingData={isEnrichingData}
          />

          {searchResults.length > 0 && (
            <SearchResults 
              key={`search-results-${forceUpdate}`}
              searchResults={searchResults}
              selectedLeads={selectedLeads}
              toggleLeadSelection={toggleLeadSelection}
              selectAllLeads={selectAllLeads}
              saveSelectedLeads={saveSelectedLeads}
              isEnrichingData={isEnrichingData}
            />
          )}
        </div>
      )}

      {activeTab === 'saved' && (
        <SavedLeads 
          savedLeads={savedLeads}
          deleteSavedLead={deleteSavedLead}
          exportLeads={exportLeads}
          clearAllSavedLeads={clearAllSavedLeads}
        />
      )}

      <Footer />
    </div>
  );
};

export default LinkedInLeadFinder;