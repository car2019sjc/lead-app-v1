/**
 * Componente ApplyLeadOffline
 * 
 * Este componente permite o upload e processamento de leads a partir de arquivos Excel exportados do Apollo.io.
 * Principais funcionalidades:
 * - Upload de arquivos Excel
 * - Validação do formato do arquivo
 * - Busca e filtragem de leads
 * - Seleção e salvamento de leads
 * - Exportação de leads selecionados
 */

import React, { useState } from 'react';
import { X, Upload, CheckCircle2, HelpCircle, Download } from 'lucide-react';
import { read, utils, writeFile, WorkBook, WorkSheet } from 'xlsx';
import { normalizeString } from '../utils/stringUtils';
import { INDUSTRIES } from '../constants/industries';
import { LOCATIONS } from '../constants/locations';
import SavedLeads from './SavedLeads';
import { Lead } from '../types';

/**
 * Interface que define a estrutura dos dados de um lead importado do Excel
 */
interface ExcelLead {
  'First Name': string;
  'Last Name': string;
  'Title': string;
  'Company': string;
  'Company Name for Emails': string;
  'Email': string;
  '# Employees': string;
  'Industry': string;
  'Person Linkedin Url': string;
  'City': string;
  'State': string;
}

/**
 * Interface que define a estrutura dos resultados de busca
 */
interface SearchResult {
  id: string;
  name: string;
  jobTitle: string;
  company: string;
  industry: string;
  ftes: string;
  location: string;
  profileUrl: string;
  email: string;
}

/**
 * Props do componente ApplyLeadOffline
 */
interface ApplyLeadOfflineProps {
  onClose: () => void;
}

/**
 * Componente principal para processamento offline de leads
 */
const ApplyLeadOffline: React.FC<ApplyLeadOfflineProps> = ({ onClose }) => {
  // Estados do componente
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [showDocs, setShowDocs] = useState(true);
  const [processedLeads, setProcessedLeads] = useState<ExcelLead[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [customLocation, setCustomLocation] = useState('');
  const [showSavedLeads, setShowSavedLeads] = useState(false);
  const [savedLeads, setSavedLeads] = useState<Lead[]>([]);

  // Estado para parâmetros de busca
  const [searchParams, setSearchParams] = useState({
    jobTitle: '',
    location: LOCATIONS[0],
    industry: INDUSTRIES[0],
    limit: 5,
    ftes: 'all'
  });

  // Estado para controlar o dropdown de indústrias
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const [industrySearch, setIndustrySearch] = useState('');

  // Filtra as indústrias baseado no texto digitado
  const filteredIndustries = INDUSTRIES.filter(industry => 
    normalizeString(industry).startsWith(normalizeString(industrySearch))
  );

  // Função para selecionar uma indústria
  const handleIndustrySelect = (industry: string) => {
    setSearchParams(prev => ({
      ...prev,
      industry
    }));
    setIndustrySearch(industry);
    setShowIndustryDropdown(false);
  };

  /**
   * Valida se o arquivo Excel contém todas as colunas necessárias
   * @param headers - Array com os nomes das colunas do arquivo
   * @returns boolean indicando se o arquivo é válido
   */
  const validateHeaders = (headers: string[]): boolean => {
    const requiredHeaders = [
      'First Name',
      'Last Name',
      'Title',
      'Company',
      'Company Name for Emails',
      'Email',
      '# Employees',
      'Industry',
      'Person Linkedin Url',
      'City',
      'State'
    ];

    return requiredHeaders.every(header => headers.includes(header));
  };

  /**
   * Processa o arquivo Excel enviado pelo usuário
   * @param file - Arquivo Excel a ser processado
   */
  const handleFileUpload = async (file: File) => {
    try {
      setError('');
      setSuccess(false);
      setProcessedLeads([]);
      setSearchResults([]);
      
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        setError('Please upload an Excel file (.xlsx or .xls)');
        return;
      }

      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json<ExcelLead>(worksheet);

      const headers = Object.keys(jsonData[0] || {});
      if (!validateHeaders(headers)) {
        setError('Invalid Excel format. Please ensure all required columns are present.');
        return;
      }

      setProcessedLeads(jsonData);
      setSuccess(true);
      setShowDocs(false);
    } catch (err) {
      setError('Error processing the Excel file. Please try again.');
      console.error('Error processing Excel:', err);
    }
  };

  /**
   * Gera e faz download de um template Excel para upload de leads
   */
  const downloadTemplate = () => {
    const headers = [
      'First Name',
      'Last Name',
      'Title',
      'Company',
      'Company Name for Emails',
      'Email',
      '# Employees',
      'Industry',
      'Person Linkedin Url',
      'City',
      'State'
    ];

    const exampleRow = [
      'John',
      'Doe',
      'Software Engineer',
      'Tech Corp',
      'Tech Corp Inc',
      'john.doe@techcorp.com',
      '100-500',
      'Technology',
      'https://linkedin.com/in/johndoe',
      'San Francisco',
      'CA'
    ];

    const ws: WorkSheet = utils.aoa_to_sheet([headers, exampleRow]);
    const colWidths = headers.map((_, i) => ({ wch: i === 8 ? 40 : 20 }));
    ws['!cols'] = colWidths;

    const wb: WorkBook = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Leads Template');
    writeFile(wb, `apollo_leads_template_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  /**
   * Atualiza os parâmetros de busca quando o usuário modifica os campos
   */
  const handleSearchParamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'location' && !LOCATIONS.includes(value)) {
      setCustomLocation(value);
      setSearchParams(prev => ({
        ...prev,
        location: 'All Locations'
      }));
    } else {
      setSearchParams(prev => ({
        ...prev,
        [name]: value
      }));
      if (name === 'location') {
        setCustomLocation('');
      }
    }
  };

  /**
   * Realiza a busca de leads com base nos critérios selecionados
   */
  const handleSearch = () => {
    console.log('[DEBUG] handleSearch chamado');
    if (!processedLeads.length) {
      setError('Please upload an Excel file first');
      return;
    }

    console.log('Títulos dos leads carregados:');
    processedLeads.forEach((lead, idx) => console.log(`[${idx + 1}]`, lead.Title));

    try {
      // Normaliza os termos de busca
      const jobTitle = (searchParams.jobTitle || '').toLowerCase();
      const location = (customLocation || searchParams.location || '').toLowerCase();
      const industry = (searchParams.industry || '').toLowerCase();

      // Filtra os leads
      const filtered = processedLeads.filter(lead => {
        // Verifica se o lead é válido
        if (!lead || !lead.Title) return false;

        // Filtro por título
        const titleMatch = !jobTitle || normalizeString(lead.Title).includes(normalizeString(jobTitle));

        // Filtro por localização
        const locationMatch = !location || location === 'all locations' || 
          normalizeString(`${lead.City || ''}, ${lead.State || ''}`).includes(normalizeString(location));

        // Filtro por indústria
        const industryMatch = !industry || industry === 'all industries' || 
          normalizeString(lead.Industry || '').includes(normalizeString(industry));

        // Filtro por FTEs
        let ftesMatch = true;
        if (searchParams.ftes !== 'all') {
          const leadFtes = lead['# Employees'] || '';
          
          // Função auxiliar para extrair números de uma string
          const extractNumbers = (str: string): number[] => {
            return str.match(/\d+/g)?.map(Number) || [];
          };

          // Extrai os números do FTEs do lead
          const leadNumbers = extractNumbers(leadFtes);
          if (leadNumbers.length === 0) {
            ftesMatch = false;
          } else {
            const leadValue = leadNumbers[0]; // Pega o primeiro número encontrado

            switch (searchParams.ftes) {
              case '1-10':
                ftesMatch = leadValue >= 1 && leadValue <= 10;
                break;
              case '11-50':
                ftesMatch = leadValue >= 11 && leadValue <= 50;
                break;
              case '51-200':
                ftesMatch = leadValue >= 51 && leadValue <= 200;
                break;
              case '201-500':
                ftesMatch = leadValue >= 201 && leadValue <= 500;
                break;
              case '501-1000':
                ftesMatch = leadValue >= 501 && leadValue <= 1000;
                break;
              case '1001-5000':
                ftesMatch = leadValue >= 1001 && leadValue <= 5000;
                break;
              case '5001+':
                ftesMatch = leadValue >= 5001;
                break;
            }
          }
        }

        return titleMatch && locationMatch && industryMatch && ftesMatch;
      });

      // Limita o número de resultados
      const limitedResults = filtered.slice(0, searchParams.limit);

      // Converte os leads filtrados para o formato de exibição
      const results = limitedResults.map(lead => ({
        id: Math.random().toString(36).substr(2, 9),
        name: `${lead['First Name']} ${lead['Last Name']}`,
        jobTitle: lead.Title,
        company: lead.Company,
        industry: lead.Industry,
        ftes: lead['# Employees'],
        location: `${lead.City}, ${lead.State}`,
        profileUrl: lead['Person Linkedin Url'],
        email: lead.Email
      }));

      // Atualiza os resultados e mensagens
      setSearchResults(results);
      setError(results.length === 0 ? 'No leads found matching your criteria' : '');
      setSelectedLeads([]); // Limpa seleções anteriores

    } catch (error) {
      console.error('Erro ao filtrar leads:', error);
      setSearchResults([]);
      setError('Error filtering leads. Please try again.');
    }
  };

  /**
   * Alterna a seleção de um lead específico
   * @param id - ID do lead a ser selecionado/deselecionado
   */
  const toggleLeadSelection = (id: string) => {
    setSelectedLeads(prev => {
      if (prev.includes(id)) {
        return prev.filter(leadId => leadId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  /**
   * Seleciona ou deseleciona todos os leads
   */
  const selectAllLeads = () => {
    if (selectedLeads.length === searchResults.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(searchResults.map(result => result.id));
    }
  };

  /**
   * Salva os leads selecionados para processamento posterior
   */
  const saveSelectedLeads = () => {
    if (selectedLeads.length === 0) {
      alert('Selecione pelo menos um lead para salvar!');
      return;
    }
    const leadsParaSalvar = searchResults.filter(lead => selectedLeads.includes(lead.id));
    const leadsAdaptados: Lead[] = leadsParaSalvar.map(lead => ({
      id: lead.id,
      firstName: lead.name.split(' ')[0] || '',
      lastName: lead.name.split(' ').slice(1).join(' ') || '',
      fullName: lead.name,
      jobTitle: lead.jobTitle,
      company: lead.company,
      location: lead.location,
      industry: lead.industry,
      email: lead.email || '',
      profileUrl: lead.profileUrl || '',
      emailVerified: false,
      emailScore: null,
      employeeCount: lead.ftes || '',
    }));
    setSavedLeads(leadsAdaptados);
    setShowSavedLeads(true);
  };

  /**
   * Remove um lead da lista de leads salvos
   * @param leadId - ID do lead a ser removido
   */
  const deleteSavedLead = (leadId: string) => {
    setSavedLeads(prev => prev.filter(lead => lead.id !== leadId));
  };

  /**
   * Exporta os leads salvos para um arquivo CSV
   */
  const exportLeads = () => {
    if (savedLeads.length === 0) {
      alert('Nenhum lead salvo para exportar!');
      return;
    }
    const headers = ['Name', 'Job Title', 'Company', 'Location', 'Email', 'LinkedIn URL'];
    const rows = savedLeads.map(lead => [
      lead.fullName,
      lead.jobTitle,
      lead.company,
      lead.location,
      lead.email || '',
      lead.profileUrl || ''
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `offline_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Renderização do componente
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white px-6 py-4 flex justify-between items-center border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Apply Lead Offline</h2>
            <p className="text-sm text-gray-600">Upload from Apollo.io exported Excel file</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const fileInput = document.getElementById('file-upload');
                if (fileInput) fileInput.click();
              }}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              <Upload size={16} className="mr-1" />
              Upload Excel File
            </button>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {showSavedLeads ? (
          <div className="p-6">
            <SavedLeads savedLeads={savedLeads} deleteSavedLead={deleteSavedLead} exportLeads={exportLeads} />
            <button
              onClick={() => setShowSavedLeads(false)}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Voltar para busca
            </button>
          </div>
        ) : (
          <div className="p-6">
            {success && (
              <div className="mb-6 p-4 bg-green-50 rounded-md flex items-center">
                <CheckCircle2 className="text-green-500 mr-2" size={20} />
                <p className="text-green-700">
                  {processedLeads.length} leads successfully loaded from the Excel file!
                </p>
              </div>
            )}

            {showDocs && (
              <div className="mb-6 bg-blue-50 rounded-lg p-6">
                <div className="flex items-start mb-4">
                  <HelpCircle className="text-blue-600 mr-2 flex-shrink-0 mt-1" />
                  <h3 className="text-lg font-semibold text-blue-900">Excel File Requirements</h3>
                </div>
                <div className="space-y-4 text-sm text-blue-800">
                  <p>
                    To ensure successful data import, your Excel file must:
                  </p>
                  <div className="pl-4">
                    <h4 className="font-semibold mb-2">Required Columns:</h4>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>First Name</li>
                      <li>Last Name</li>
                      <li>Title</li>
                      <li>Company</li>
                      <li>Company Name for Emails</li>
                      <li>Email</li>
                      <li># Employees</li>
                      <li>Industry</li>
                      <li>Person Linkedin Url</li>
                      <li>City</li>
                      <li>State</li>
                    </ul>
                  </div>
                  <div className="bg-blue-100 p-4 rounded-md">
                    <p className="font-medium">Important Note:</p>
                    <p>This tool is designed to work specifically with Excel files exported from Apollo.io. Using files from other sources or with different structures may result in errors.</p>
                  </div>
                </div>
              </div>
            )}

            {processedLeads.length > 0 && (
              <div className="mb-6 bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Search Leads</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="jobTitle"
                      name="jobTitle"
                      value={searchParams.jobTitle}
                      onChange={handleSearchParamChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="E.g., Software Engineer"
                    />
                  </div>
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      placeholder="Enter location to search..."
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                      Industry
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="industry"
                        name="industry"
                        value={industrySearch}
                        onChange={(e) => {
                          setIndustrySearch(e.target.value);
                          setShowIndustryDropdown(true);
                        }}
                        onFocus={() => setShowIndustryDropdown(true)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type to search industry..."
                      />
                      {showIndustryDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredIndustries.length > 0 ? (
                            filteredIndustries.map((industry, index) => (
                              <div
                                key={index}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleIndustrySelect(industry)}
                              >
                                {industry}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-gray-500">
                              No industries found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ftes" className="block text-sm font-medium text-gray-700 mb-1">
                      Company Size
                    </label>
                    <select
                      id="ftes"
                      name="ftes"
                      value={searchParams.ftes}
                      onChange={handleSearchParamChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Sizes</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="501-1000">501-1000 employees</option>
                      <option value="1001-5000">1001-5000 employees</option>
                      <option value="5001+">5001+ employees</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-1">
                      Max Results
                    </label>
                    <select
                      id="limit"
                      name="limit"
                      value={searchParams.limit}
                      onChange={handleSearchParamChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="5">5 leads</option>
                      <option value="10">10 leads</option>
                      <option value="25">25 leads</option>
                      <option value="50">50 leads</option>
                      <option value="100">100 leads</option>
                      <option value="250">250 leads</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => { console.log('[DEBUG] Botão Search Leads clicado'); handleSearch(); }}
                  className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  Search Leads
                </button>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-50 rounded-md flex items-center">
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Search Results ({searchResults.length})</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={selectAllLeads}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      {selectedLeads.length === searchResults.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      onClick={() => {
                        setSearchResults(prev => prev.filter(result => !selectedLeads.includes(result.id)));
                        setSelectedLeads([]);
                      }}
                      className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                    >
                      Excluir Selecionados
                    </button>
                    <button
                      onClick={saveSelectedLeads}
                      disabled={selectedLeads.length === 0}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Save Selected ({selectedLeads.length})
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <span className="sr-only">Select</span>
                        </th>
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
                          Profile
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {searchResults.map(result => (
                        <tr key={result.id} className={`hover:bg-gray-50 ${selectedLeads.includes(result.id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedLeads.includes(result.id)}
                              onChange={() => toggleLeadSelection(result.id)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                                {result.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{result.name}</div>
                                <div className="text-sm text-gray-500">{result.jobTitle}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{result.company}</div>
                            <div className="text-xs text-gray-500">{result.industry}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{result.ftes}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{result.location}</div>
                          </td>
                          <td className="px-4 py-3">
                            {result.profileUrl && (
                              <a
                                href={result.profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplyLeadOffline;