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

import React, { useState, useEffect } from 'react';
import { X, Upload, CheckCircle2, HelpCircle, Download, AlertCircle, AlertTriangle } from 'lucide-react';
import { read, utils, writeFile, WorkBook, WorkSheet } from 'xlsx';
import { normalizeString } from '../utils/stringUtils';
import { INDUSTRIES } from '../constants/industries';
import { LOCATIONS } from '../constants/locations';
import SavedLeads from './SavedLeads';
import { Lead } from '../types';
import { getJobTitleEquivalents } from '../utils/jobTitleSynonyms';
import UserInitials from './UserInitials';
import LeadDataModal from './LeadDataModal';
import ProfileAnalysisModal from './ProfileAnalysisModal';
import { sanitizeString } from '../utils/string';
import { extractCity } from '../utils/stringUtils';

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
  console.log('ApplyLeadOffline component renderizado');
  
  // Estados do componente
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [showDocs, setShowDocs] = useState<boolean>(false);
  const [processedLeads, setProcessedLeads] = useState<ExcelLead[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [customLocation, setCustomLocation] = useState('');
  const [showSavedLeads, setShowSavedLeads] = useState(false);
  const [savedLeads, setSavedLeads] = useState<Lead[]>([]);
  const [notification, setNotification] = useState<{show: boolean, message: string, type: 'success' | 'error' | 'warning'}>({
    show: false,
    message: '',
    type: 'success'
  });
  
  // Estados para os modais
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // Função para mostrar notificações
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Funções para os modais
  const handleLeadDataClick = (result: SearchResult) => {
    // Converter SearchResult para Lead com workHistory
    const lead: Lead = {
      id: result.id,
      fullName: result.name,
      firstName: result.name.split(' ')[0] || '',
      lastName: result.name.split(' ').slice(1).join(' ') || '',
      jobTitle: result.jobTitle,
      company: result.company,
      industry: result.industry,
      location: result.location,
      profileUrl: result.profileUrl,
      email: result.email,
      employeeCount: result.ftes,
      emailVerified: false,
      emailScore: null,
      // Criar workHistory com as informações disponíveis
      workHistory: [{
        title: result.jobTitle,
        company: result.company,
        duration: 'Atual',
        location: result.location,
        description: `${result.jobTitle} na ${result.company} - ${result.industry}`,
        companyUrl: `https://www.${result.company.toLowerCase().replace(/\s+/g, '')}.com`
      }],
      // Adicionar summary básico
      summary: `Profissional com experiência em ${result.jobTitle} na área de ${result.industry}. Atualmente trabalha na ${result.company}.`
    };
    setSelectedLead(lead);
    setShowDataModal(true);
  };

  const handleAnalysisClick = (result: SearchResult) => {
    // Converter SearchResult para Lead com workHistory
    const lead: Lead = {
      id: result.id,
      fullName: result.name,
      firstName: result.name.split(' ')[0] || '',
      lastName: result.name.split(' ').slice(1).join(' ') || '',
      jobTitle: result.jobTitle,
      company: result.company,
      industry: result.industry,
      location: result.location,
      profileUrl: result.profileUrl,
      email: result.email,
      employeeCount: result.ftes,
      emailVerified: false,
      emailScore: null,
      // Criar workHistory com as informações disponíveis
      workHistory: [{
        title: result.jobTitle,
        company: result.company,
        duration: 'Atual',
        location: result.location,
        description: `${result.jobTitle} na ${result.company} - ${result.industry}`,
        companyUrl: `https://www.${result.company.toLowerCase().replace(/\s+/g, '')}.com`
      }],
      // Adicionar summary básico
      summary: `Profissional com experiência em ${result.jobTitle} na área de ${result.industry}. Atualmente trabalha na ${result.company}.`
    };
    setSelectedLead(lead);
    setShowAnalysisModal(true);
  };

  // Reset dos estados quando o componente é montado
  useEffect(() => {
    setShowSavedLeads(false);
    setError('');
    setSuccess(false);
    setProcessedLeads([]);
    setSearchResults([]);
    setSelectedLeads([]);
    // Reset do input de arquivo
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }, []);

  // Carregar leads salvos do localStorage ao inicializar
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

  // Salvar leads no localStorage quando mudarem
  useEffect(() => {
    localStorage.setItem('savedLeads', JSON.stringify(savedLeads));
  }, [savedLeads]);

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
   * Função para corrigir problemas de encoding em strings
   * @param str - String a ser corrigida
   * @returns String corrigida
   */
  function fixEncoding(str: string): string {
    try {
      return decodeURIComponent(escape(str));
    } catch {
      return str;
    }
  }

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
      
      if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
        setError('Por favor, envie um arquivo Excel (.xlsx, .xls) ou CSV (.csv)');
        return;
      }

      console.log('Processando arquivo:', file.name);
      
      let jsonData: any[];
      
      // Processa arquivo CSV ou Excel de forma diferente
      if (file.name.toLowerCase().endsWith('.csv')) {
        console.log('Processando arquivo CSV');
        const text = await file.text();
        const workbook = read(text, { type: 'string' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonData = utils.sheet_to_json(worksheet);
      } else {
        console.log('Processando arquivo Excel');
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonData = utils.sheet_to_json(worksheet);
      }

      if (!jsonData || jsonData.length === 0) {
        setError('Arquivo está vazio ou não contém dados válidos.');
        return;
      }

      console.log('Dados processados:', jsonData.length, 'leads encontrados');
      console.log('Cabeçalhos encontrados:', Object.keys(jsonData[0] || {}));
      console.log('Exemplo de lead:', jsonData[0]);
      
      // Debug: verificar leads com dados suspeitos
      jsonData.forEach((lead, index) => {
        const firstName = lead['First Name'] || lead['Nome'] || lead['Primeiro Nome'] || '';
        const lastName = lead['Last Name'] || lead['Sobrenome'] || lead['Último Nome'] || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        // Verificar se há caracteres suspeitos no nome
        if (fullName.includes('MILÍMETROS') || fullName.includes('MILIMETROS') || /[^\w\s\u00C0-\u017F\-\.]/g.test(fullName)) {
          console.log(`[DEBUG] Lead suspeito encontrado no índice ${index}:`, {
            firstName,
            lastName,
            fullName,
            rawLead: lead
          });
        }
      });

      // Função para limpar dados corrompidos
      const sanitizeData = (value: any): string => {
        if (!value) return '';
        let str = String(value).trim();
        
        // Remove palavras suspeitas conhecidas
        const suspiciousWords = ['MILÍMETROS', 'MILIMETROS', 'MILÍMETRE', 'MILIMETRE'];
        suspiciousWords.forEach(word => {
          str = str.replace(new RegExp(word, 'gi'), '');
        });
        
        // Remove caracteres especiais que podem causar problemas de renderização
        str = str.replace(/[^\w\s\u00C0-\u017F@\.\-]/g, '').trim();
        
        // Remove espaços múltiplos
        str = str.replace(/\s+/g, ' ').trim();
        
        return str;
      };

      // Processa os dados com a estrutura existente
      const processedData = jsonData.map((lead: any) => {
        // Filtra leads que não tenham dados mínimos válidos
        const firstName = sanitizeData(lead['First Name'] || lead['Nome'] || lead['Primeiro Nome']);
        const lastName = sanitizeData(lead['Last Name'] || lead['Sobrenome'] || lead['Último Nome']);
        const title = sanitizeData(lead['Title'] || lead['Cargo'] || lead['Posição'] || lead['Job Title']);
        const company = sanitizeData(lead['Company'] || lead['Empresa'] || lead['Organization']);
        
        // Se não tiver nome OU título OU empresa, pular este lead
        if (!firstName && !lastName && !title && !company) {
          return null;
        }
        
        return {
        ...lead,
          'First Name': firstName,
          'Last Name': lastName,
          'Title': title,
          'Company': company,
          'Email': sanitizeData(lead['Email'] || lead['E-mail']),
          'Industry': sanitizeData(lead['Industry'] || lead['Indústria'] || lead['Setor']),
          'City': sanitizeData(lead['City'] || lead['Cidade']),
          'State': sanitizeData(lead['State'] || lead['Estado']),
          '# Employees': sanitizeData(lead['# Employees'] || lead['Funcionários'] || lead['Employees']),
          'Person Linkedin Url': lead['Person Linkedin Url'] || lead['LinkedIn'] || lead['Profile URL'] || '',
          'Company Name for Emails': sanitizeData(lead['Company Name for Emails'] || lead['Company'] || lead['Empresa']),
          NormalizedTitle: normalizeString(title)
        };
      }).filter(lead => lead !== null); // Remove leads nulos

      console.log('Dados processados com sucesso:', processedData.length, 'leads');
      console.log('Exemplo de lead processado:', processedData[0]);

      setProcessedLeads(processedData);
      setSuccess(true);
      setShowDocs(false);
    } catch (err) {
      console.error('Erro ao processar arquivo:', err);
      setError('Erro ao processar o arquivo. Verifique se o arquivo não está corrompido e tente novamente.');
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

        // =====================
        // FILTRO DE JOB TITLE
        // =====================
        // A busca por cargo (Job Title) é flexível:
        // - O termo digitado pelo usuário é normalizado (sem acentos, minúsculo, etc) e dividido em palavras.
        // - O título do lead também é normalizado.
        // - O lead será considerado correspondente se TODAS as palavras do termo buscado estiverem presentes no título, mesmo que separadas.
        // - Se não houver correspondência direta, busca equivalentes definidos em src/utils/jobTitleSynonyms.ts (ex: "CIO" encontra "Diretor de TI").
        // - Para equivalentes, também é exigido que todas as palavras estejam presentes no título.
        // - Para alterar ou expandir equivalentes, edite o arquivo jobTitleSynonyms.ts.
        // - Para mudar a lógica de busca (ex: exigir ordem, permitir plurais, etc), altere este bloco.
        // Exemplo: buscar "Diretor TI" encontra "Diretor de TI", "Diretor Executivo de TI", etc.
        const normalizedTitle = (lead.NormalizedTitle || '');
        const searchWords = normalizeString(jobTitle).split(/\s+/).filter(Boolean);
        let titleMatch = !jobTitle || searchWords.every(word => normalizedTitle.includes(word));
        if (!titleMatch && jobTitle) {
          const equivalents = getJobTitleEquivalents(jobTitle);
          titleMatch = equivalents.some(eq => {
            const eqWords = normalizeString(eq).split(/\s+/).filter(Boolean);
            return eqWords.every(word => normalizedTitle.includes(word));
          });
        }

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

      // Função para limpar e validar strings
      const cleanString = (str: any): string => {
        if (!str) return '';
        let cleaned = String(str).trim();
        
        // Remove palavras suspeitas conhecidas
        const suspiciousWords = ['MILÍMETROS', 'MILIMETROS', 'MILÍMETRE', 'MILIMETRE'];
        suspiciousWords.forEach(word => {
          cleaned = cleaned.replace(new RegExp(word, 'gi'), '');
        });
        
        // Remove caracteres estranhos e mantém apenas letras, números, espaços e acentos
        cleaned = cleaned.replace(/[^\w\s\u00C0-\u017F\-\.]/g, '').trim();
        
        // Remove espaços múltiplos
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        return cleaned;
      };

      // Converte os leads filtrados para o formato de exibição
      const results = limitedResults.map((lead, index) => {
        let firstName = cleanString(lead['First Name']);
        let lastName = cleanString(lead['Last Name']);
        
        // Validação extra: se ainda contém palavras suspeitas, substituir por valores seguros
        if (firstName.includes('MILÍMETROS') || firstName.includes('MILIMETROS')) {
          console.log(`[ERRO] First Name ainda contém MILÍMETROS:`, firstName);
          firstName = 'Nome';
        }
        if (lastName.includes('MILÍMETROS') || lastName.includes('MILIMETROS')) {
          console.log(`[ERRO] Last Name ainda contém MILÍMETROS:`, lastName);
          lastName = 'Sobrenome';
        }
        
        let fullName = `${firstName} ${lastName}`.trim();
        
        // Validação final: se o nome completo ainda contém palavras suspeitas
        if (fullName.includes('MILÍMETROS') || fullName.includes('MILIMETROS')) {
          console.log(`[ERRO] Nome completo ainda contém MILÍMETROS:`, fullName);
          fullName = 'Nome Não Disponível';
        }
        
        // Debug: verificar se ainda há problemas no nome final
        if (fullName.includes('MILÍMETROS') || fullName.includes('MILIMETROS')) {
          console.log(`[DEBUG] Nome suspeito ainda presente no resultado ${index}:`, {
            originalFirstName: lead['First Name'],
            originalLastName: lead['Last Name'],
            cleanedFirstName: firstName,
            cleanedLastName: lastName,
            finalName: fullName,
            fullLead: lead
          });
        }
        
        // Debug: verificar as iniciais que serão geradas
        const words = fullName.split(' ').filter(word => {
          const cleanWord = word.trim();
          return cleanWord.length > 0 && 
                 !cleanWord.includes('MILÍMETROS') && 
                 !cleanWord.includes('MILIMETROS') &&
                 /^[a-zA-ZÀ-ÿ]/.test(cleanWord);
        });
        const initials = words.length > 0 ? words.map(n => n[0]).join('').toUpperCase() : 'NN';
        
        if (fullName.includes('Mauro')) {
          console.log(`[DEBUG] Processando Mauro Mazur:`, {
            originalFirstName: lead['First Name'],
            originalLastName: lead['Last Name'],
            cleanedFirstName: firstName,
            cleanedLastName: lastName,
            finalName: fullName,
            words: words,
            initials: initials,
            fullLead: lead
          });
        }
        
        return {
        id: Math.random().toString(36).substr(2, 9),
          name: fullName || 'Nome não disponível',
          jobTitle: cleanString(lead.Title) || 'Cargo não informado',
          company: cleanString(lead.Company) || 'Empresa não informada',
          industry: cleanString(lead.Industry) || 'Indústria não informada',
          ftes: cleanString(lead['# Employees']) || 'N/A',
          location: `${cleanString(lead.City)}, ${cleanString(lead.State)}`.replace(/^,\s*|,\s*$/g, '') || 'Localização não informada',
          profileUrl: lead['Person Linkedin Url'] || '',
          email: cleanString(lead.Email) || ''
        };
      });

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
   * Salva os leads selecionados
   */
  const saveSelectedLeads = () => {
    if (selectedLeads.length === 0) {
      showNotification('Selecione pelo menos um lead para salvar!', 'error');
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
      companyUrl: `https://www.${lead.company.toLowerCase().replace(/\s+/g, '')}.com`,
      // Adicionar workHistory e summary para que as informações apareçam no modal
      workHistory: [{
        title: lead.jobTitle,
        company: lead.company,
        duration: 'Atual',
        location: lead.location,
        description: `${lead.jobTitle} na ${lead.company} - ${lead.industry}`,
        companyUrl: `https://www.${lead.company.toLowerCase().replace(/\s+/g, '')}.com`
      }],
      summary: `Profissional com experiência em ${lead.jobTitle} na área de ${lead.industry}. Atualmente trabalha na ${lead.company}.`
    }));
    
    setSavedLeads(prev => {
      // Adiciona apenas leads que ainda não estão salvos (por id)
      const prevIds = new Set(prev.map(lead => lead.id));
      const novosLeads = leadsAdaptados.filter(lead => !prevIds.has(lead.id));
      if (novosLeads.length === 0) {
        showNotification('Todos os leads selecionados já estão salvos.', 'warning');
        return prev;
      }
      showNotification(`${novosLeads.length} lead(s) salvo(s) com sucesso!`);
      return [...prev, ...novosLeads];
    });
    
    setSelectedLeads([]);
    setShowSavedLeads(true);
  };

  /**
   * Remove um lead da lista de salvos
   */
  const deleteSavedLead = (leadId: string) => {
    setSavedLeads(prev => prev.filter(lead => lead.id !== leadId));
    setSearchResults(prev => prev.filter(lead => lead.id !== leadId)); // Remove também dos resultados da pesquisa
    showNotification('Lead removido com sucesso!');
  };

  /**
   * Limpa todos os leads salvos
   */
  const clearAllSavedLeads = () => {
    if (savedLeads.length === 0) {
      showNotification('Nenhum lead salvo para limpar!', 'warning');
      return;
    }
    if (confirm(`Tem certeza que deseja remover todos os ${savedLeads.length} leads salvos?`)) {
      setSavedLeads([]);
      setSearchResults([]); // Limpar também os resultados da pesquisa
      setSelectedLeads([]); // Limpar leads selecionados
      showNotification('Todos os leads foram removidos!');
    }
  };

  /**
   * Exporta os leads salvos para um arquivo CSV
   */
  const exportLeads = () => {
    if (savedLeads.length === 0) {
      showNotification('Nenhum lead salvo para exportar!', 'warning');
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
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white px-6 py-4 flex justify-between items-center border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Leads Offline - Apollo</h2>
            <p className="text-sm text-gray-600">Upload de arquivo Excel ou CSV exportado do Apollo.io</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                // Reset completo dos estados antes de abrir o file picker
                setShowSavedLeads(false);
                setError('');
                setSuccess(false);
                setProcessedLeads([]);
                setSearchResults([]);
                setSelectedLeads([]);
                setShowDocs(false);
                
                // Reset do input de arquivo
                const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                if (fileInput) {
                  fileInput.value = '';
                  fileInput.click();
                }
              }}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              <Upload size={16} className="mr-1" />
              Upload Excel/CSV
            </button>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".xlsx,.xls,.csv"
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
            <SavedLeads 
              savedLeads={savedLeads} 
              deleteSavedLead={deleteSavedLead} 
              exportLeads={exportLeads}
              clearAllSavedLeads={clearAllSavedLeads}
            />
            <div className="flex space-x-3 mt-4">
            <button
                onClick={() => {
                  // Apenas volta para a tela de resultados SEM resetar os dados
                  setShowSavedLeads(false);
                  // Mantém os dados carregados: processedLeads, searchResults, etc.
                  // Apenas limpa notificações e dropdowns
                  setNotification({ show: false, message: '', type: 'success' });
                  setShowIndustryDropdown(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
              >
                ← Voltar aos Resultados
              </button>
              
              <button
                onClick={() => {
                  // Reset completo para novo upload
                  setShowSavedLeads(false);
                  setError('');
                  setSuccess(false);
                  setSearchResults([]);
                  setSelectedLeads([]);
                  setProcessedLeads([]);
                  setShowDocs(false);
                  setCustomLocation('');
                  setIndustrySearch('');
                  setShowIndustryDropdown(false);
                  setNotification({ show: false, message: '', type: 'success' });
                  
                  // Reset dos parâmetros de busca
                  setSearchParams({
                    jobTitle: '',
                    location: LOCATIONS[0],
                    industry: INDUSTRIES[0],
                    limit: 5,
                    ftes: 'all'
                  });
                  
                  // Reset do input de arquivo
                  const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                  if (fileInput) fileInput.value = '';
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-200"
              >
                📁 Novo Upload
            </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {success && (
              <>
              <div className="mb-6 p-4 bg-green-50 rounded-md flex items-center">
                <CheckCircle2 className="text-green-500 mr-2" size={20} />
                <p className="text-green-700">
                    {processedLeads.length} leads carregados e normalizados com sucesso!
                </p>
              </div>
                

              </>
            )}

            {showDocs && (
              <div className="mb-6 bg-blue-50 rounded-lg p-6">
                <div className="flex items-start mb-4">
                  <HelpCircle className="text-blue-600 mr-2 flex-shrink-0 mt-1" />
                  <h3 className="text-lg font-semibold text-blue-900">Requisitos do Arquivo Excel</h3>
                </div>
                <div className="space-y-4 text-sm text-blue-800">
                  <div className="bg-green-100 p-4 rounded-md">
                    <p className="font-medium text-green-800 mb-2">✨ Normalização Automática Ativada!</p>
                    <p className="text-green-700">
                      O sistema agora mapeia automaticamente as colunas do Apollo, mesmo que tenham nomes diferentes. 
                      Não se preocupe com formatação - os dados serão limpos automaticamente!
                    </p>
                  </div>
                  
                  <div className="pl-4">
                    <h4 className="font-semibold mb-2">Colunas Mapeadas Automaticamente:</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="font-medium">Nomes:</p>
                    <ul className="list-disc pl-4 space-y-1">
                          <li>First Name, Nome, Primeiro Nome</li>
                          <li>Last Name, Sobrenome, Último Nome</li>
                    </ul>
                  </div>
                      <div>
                        <p className="font-medium">Profissional:</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Title, Job Title, Cargo, Função</li>
                          <li>Company, Organization, Empresa</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Contato:</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Email, E-mail, Personal Email</li>
                          <li>LinkedIn URL, Profile URL</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Empresa:</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Industry, Sector, Setor</li>
                          <li># Employees, Funcionários</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-100 p-4 rounded-md">
                    <p className="font-medium">Limpeza Automática de Dados:</p>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li>• Correção de acentos e caracteres especiais</li>
                      <li>• Capitalização adequada de nomes e localizações</li>
                      <li>• Validação e correção de emails</li>
                      <li>• Padronização de URLs do LinkedIn</li>
                      <li>• Normalização do número de funcionários</li>
                    </ul>
                  </div>
                  
                  <div className="bg-yellow-100 p-4 rounded-md">
                    <p className="font-medium text-yellow-800">Requisito Mínimo:</p>
                    <p className="text-yellow-700">
                      O arquivo deve conter pelo menos: <strong>Nome, Sobrenome, Cargo e Empresa</strong>. 
                      Outras colunas são opcionais e serão preenchidas automaticamente quando possível.
                    </p>
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
                      onClick={onClose}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 font-medium"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={selectAllLeads}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      {selectedLeads.length === searchResults.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      onClick={() => {
                        setSearchResults([]);
                        setSelectedLeads([]);
                      }}
                      className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                    >
                      Limpar tudo
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
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
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
                                {(() => {
                                  // Gera iniciais apenas de palavras válidas (sem palavras suspeitas)
                                  const words = result.name.split(' ').filter(word => {
                                    const cleanWord = word.trim();
                                    return cleanWord.length > 0 && 
                                           !cleanWord.includes('MILÍMETROS') && 
                                           !cleanWord.includes('MILIMETROS') &&
                                           /^[a-zA-ZÀ-ÿ]/.test(cleanWord); // Só palavras que começam com letra
                                  });
                                  return words.length > 0 ? words.map(n => n[0]).join('').toUpperCase() : 'NN';
                                })()}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900" style={{position: 'relative', zIndex: 10, backgroundColor: 'white'}}>
                                  {result.name}
                                </div>
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
                            <div className="text-sm text-gray-900">{extractCity(result.location)}</div>
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
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleLeadDataClick(result)}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors duration-200"
                              >
                                Lead Data
                              </button>
                              <button
                                onClick={() => handleAnalysisClick(result)}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors duration-200"
                              >
                                Análise
                              </button>
                              {result.profileUrl && (
                                <a 
                                  href={result.profileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200"
                                >
                                  Profile
                                </a>
                              )}
                              <button
                                onClick={() => {
                                  setSearchResults(prev => prev.filter(r => r.id !== result.id));
                                  setSelectedLeads(prev => prev.filter(id => id !== result.id));
                                }}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors duration-200"
                              >
                                Remove
                              </button>
                            </div>
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
        
        {/* Notificação */}
        {notification.show && (
          <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg transition-all duration-300 ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200' :
            notification.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notification.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                {notification.type === 'error' && <AlertCircle className="h-5 w-5 text-red-400" />}
                {notification.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-400" />}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  notification.type === 'success' ? 'text-green-800' :
                  notification.type === 'error' ? 'text-red-800' :
                  'text-yellow-800'
                }`}>
                  {notification.message}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => setNotification({ show: false, message: '', type: 'success' })}
                    className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      notification.type === 'success' ? 'text-green-500 hover:bg-green-100 focus:ring-green-600' :
                      notification.type === 'error' ? 'text-red-500 hover:bg-red-100 focus:ring-red-600' :
                      'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600'
                    }`}
                  >
                    <span className="sr-only">Dismiss</span>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
      
      {/* Modais */}
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
    </>
  );
};

export default ApplyLeadOffline;