import React, { useState } from 'react';
import { Lead } from '../types';
import UserInitials from './UserInitials';
import LeadDataModal from './LeadDataModal';
import ProfileAnalysisModal from './ProfileAnalysisModal';
import { extractCity } from '../utils/stringUtils';
import { searchApolloLead } from '../services/apollo';
import { utils, writeFile } from 'xlsx';
import { FileDown, Loader2 } from 'lucide-react';

interface SavedLeadsProps {
  savedLeads: Lead[];
  deleteSavedLead: (leadId: string) => void;
  exportLeads: () => void;
  clearAllSavedLeads?: () => void;
}

const SavedLeads: React.FC<SavedLeadsProps> = ({
  savedLeads,
  deleteSavedLead,
  exportLeads,
  clearAllSavedLeads
}) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isProcessingExport, setIsProcessingExport] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });

  const handleLeadDataClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDataModal(true);
  };

  const handleAnalysisClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowAnalysisModal(true);
  };

  // Função para buscar email de um lead específico
  const fetchLeadEmail = async (lead: Lead): Promise<string> => {
    try {
      // Verifica se já tem email válido
      if (lead.email && lead.email !== 'N/A' && !lead.email.includes('email_not_unlocked')) {
        return lead.email;
      }

      // Busca dados atuais da empresa no histórico
      const currentCompany = lead.workHistory?.find(job => 
        job.company.toLowerCase() === lead.company.toLowerCase()
      );

      const searchParams = {
        firstName: lead.firstName,
        lastName: lead.lastName,
        organizationName: lead.company,
        organizationDomain: currentCompany?.companyUrl?.replace('https://www.', '').replace('http://www.', '') || ''
      };

      console.log(`🔍 Buscando email para: ${lead.fullName}`);
      const apolloResult = await searchApolloLead(searchParams);
      
      if (apolloResult && apolloResult.person && apolloResult.person.email) {
        const email = apolloResult.person.email;
        if (email && !email.includes('email_not_unlocked')) {
          console.log(`✅ Email encontrado: ${email}`);
          return email;
        }
      }
      
      console.log(`❌ Email não encontrado para ${lead.fullName}`);
      return 'Email não disponível';
    } catch (error) {
      console.error(`Erro ao buscar email para ${lead.fullName}:`, error);
      return 'Erro ao buscar email';
    }
  };

  // Função para exportar leads com dados processados
  const exportProcessedLeads = async () => {
    if (savedLeads.length === 0) {
      alert('Nenhum lead salvo para exportar!');
      return;
    }

    setIsProcessingExport(true);
    setExportProgress({ current: 0, total: savedLeads.length });

    try {
      console.log('🚀 Iniciando processamento de leads para exportação...');
      
      // Processar cada lead e buscar emails
      const processedLeads = [];
      
      for (let i = 0; i < savedLeads.length; i++) {
        const lead = savedLeads[i];
        setExportProgress({ current: i + 1, total: savedLeads.length });
        
        // Buscar email atualizado
        const email = await fetchLeadEmail(lead);
        
        // Adicionar pequeno delay para não sobrecarregar a API
        if (i < savedLeads.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        processedLeads.push({
          'Lead Name': lead.fullName,
          'Cargo': lead.jobTitle,
          'Empresa': lead.company,
          'Setor': lead.industry || 'Não especificado',
          'FTEs': lead.employeeCount || 'N/A',
          'Localização': lead.location ? extractCity(lead.location) : '',
          'Email Validado': email
        });
      }

      // Criar planilha Excel
      const ws = utils.json_to_sheet(processedLeads);
      
      // Ajustar largura das colunas
      const colWidths = [
        { wch: 25 }, // Lead Name
        { wch: 30 }, // Cargo
        { wch: 30 }, // Empresa
        { wch: 25 }, // Setor
        { wch: 15 }, // FTEs
        { wch: 20 }, // Localização
        { wch: 35 }  // Email Validado
      ];
      ws['!cols'] = colWidths;

      // Criar workbook e adicionar planilha
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Leads Processados');

      // Gerar nome do arquivo com data/hora
      const fileName = `leads_processados_${new Date().toISOString().slice(0, 10)}_${new Date().toLocaleTimeString('pt-BR').replace(/:/g, '-')}.xlsx`;
      
      // Baixar arquivo
      writeFile(wb, fileName);
      
      console.log('✅ Exportação concluída com sucesso!');
      alert(`Exportação concluída! ${processedLeads.length} leads processados e salvos em ${fileName}`);
      
    } catch (error) {
      console.error('Erro durante a exportação:', error);
      alert('Erro ao processar e exportar leads. Por favor, tente novamente.');
    } finally {
      setIsProcessingExport(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Saved Leads ({savedLeads.length})</h2>
        <div className="flex gap-2">
          {savedLeads.length > 0 && (
            <>
              <button
                onClick={exportProcessedLeads}
                disabled={isProcessingExport}
                className={`px-3 py-1 text-sm rounded flex items-center gap-2 transition-colors ${
                  isProcessingExport 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isProcessingExport ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processando {exportProgress.current}/{exportProgress.total}...
                  </>
                ) : (
                  <>
                    <FileDown size={16} />
                    Exportar com Dados
                  </>
                )}
              </button>
              {clearAllSavedLeads && (
                <button
                  onClick={clearAllSavedLeads}
                  className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                >
                  Limpar Tudo
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      {savedLeads.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No leads saved yet. Search and validate leads to add them here.
        </div>
      ) : (
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
                  Location
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {savedLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <UserInitials firstName={lead.firstName} lastName={lead.lastName} />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{lead.fullName || 'Name not available'}</div>
                        <div className="text-sm text-gray-500">{lead.jobTitle || 'Job title not available'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 text-sm">
                    {lead.companyUrl ? (
                      <a href={lead.companyUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 hover:underline">{lead.company}</a>
                    ) : (
                      <span className="font-bold text-gray-800">{lead.company}</span>
                    )}
                    <div className="text-xs text-gray-400">{lead.industry}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{extractCity(lead.location) || 'Location not available'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    {lead.profileUrl && (
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => handleLeadDataClick(lead)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors duration-200"
                        >
                          Lead Data
                        </button>
                        <button
                          onClick={() => handleAnalysisClick(lead)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors duration-200"
                        >
                          Análise
                        </button>
                        <a 
                          href={lead.profileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200"
                        >
                          Profile
                        </a>
                        <button
                          onClick={() => deleteSavedLead(lead.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors duration-200"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDataModal && selectedLead && (
        <LeadDataModal
          lead={selectedLead}
          onClose={() => setShowDataModal(false)}
        />
      )}

      {showAnalysisModal && selectedLead && (
        <ProfileAnalysisModal
          lead={selectedLead}
          onClose={() => setShowAnalysisModal(false)}
        />
      )}
    </div>
  );
};

export default SavedLeads;