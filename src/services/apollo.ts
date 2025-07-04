import axios from 'axios';
import config from '../config';
import { Lead } from '../types';
import { getCompanyIndustry } from './openai';
import { getBestEnglishJobTitle, getJobTitleEquivalents, getEnhancedJobTitleEquivalents, generateJobTitleVariations } from '../utils/jobTitleSynonyms';

const apolloApi = axios.create({
  baseURL: '/apollo',
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'accept': 'application/json',
    'x-api-key': config.apolloApiKey
  }
});

export const searchApolloLeads = async (
  jobTitle: string, 
  location?: string, 
  industry?: string, 
  count: number = 10,
  company?: string
): Promise<Lead[]> => {
  try {
    // Gera todas as variações possíveis do cargo
    const titleVariations = generateJobTitleVariations(jobTitle);
    console.log(`Variações geradas para "${jobTitle}":`, titleVariations);
    
    // Tenta primeiro com o melhor termo em inglês
    const englishJobTitle = getBestEnglishJobTitle(jobTitle);
    console.log(`Pesquisando cargo: "${jobTitle}" -> traduzido para: "${englishJobTitle}"`);
    
    let response = await apolloApi.post('/api/v1/mixed_people/search', {
      q_organization_domains: [],
      q_organization_names: company ? [company] : [],
      page: 1,
      person_titles: [englishJobTitle],
      person_locations: location ? [location] : [],
      organization_industries: industry ? [industry] : [],
      per_page: count
    });
    
    // Se não encontrou resultados, tenta com as variações
    if (!response.data?.people || response.data.people.length === 0) {
      console.log('Nenhum resultado com termo em inglês, tentando variações...');
      
      // Tenta cada variação
      for (const variation of titleVariations) {
        console.log(`Tentando variação: "${variation}"`);
        
        response = await apolloApi.post('/api/v1/mixed_people/search', {
          q_organization_domains: [],
          q_organization_names: company ? [company] : [],
          page: 1,
          person_titles: [variation],
          person_locations: location ? [location] : [],
          organization_industries: industry ? [industry] : [],
          per_page: count
        });
        
        if (response.data?.people && response.data.people.length > 0) {
          console.log(`✅ Encontrados ${response.data.people.length} resultados com "${variation}"`);
          break;
        }
      }
    }
    
    // Se ainda não encontrou, tenta com equivalentes aprimorados
    if (!response.data?.people || response.data.people.length === 0) {
      console.log('Ainda sem resultados, tentando equivalentes...');
      const equivalents = getEnhancedJobTitleEquivalents(jobTitle);
      
      for (const equivalent of equivalents.slice(0, 5)) { // Tenta até 5 equivalentes
        console.log(`Tentando equivalente: "${equivalent}"`);
        
        response = await apolloApi.post('/api/v1/mixed_people/search', {
          q_organization_domains: [],
          q_organization_names: company ? [company] : [],
          page: 1,
          person_titles: [equivalent],
          person_locations: location ? [location] : [],
          organization_industries: industry ? [industry] : [],
          per_page: count
        });
        
        if (response.data?.people && response.data.people.length > 0) {
          console.log(`✅ Encontrados ${response.data.people.length} resultados com "${equivalent}"`);
          break;
        }
      }
    }
    
    if (response.data && response.data.people) {
      return await transformApolloData(response.data.people);
    }
    
    return [];
  } catch (error) {
    console.error('Error searching for leads in Apollo:', error);
    if (axios.isAxiosError(error)) {
      console.error('Detailed error information:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
    }
    throw new Error('Falha ao buscar leads. Por favor, verifique sua conexão e tente novamente.');
  }
};

const transformApolloData = async (apolloLeads: any[]): Promise<Lead[]> => {
  return Promise.all(apolloLeads.map(async person => {
    // Get current employment from employment_history
    const currentEmployment = person.employment_history?.find((job: any) => job.current) || {};
    
    // Get organization details
    const organization = person.organization || {};
    
    // Tentar extrair o setor
    let industry = organization.industry || currentEmployment.industry || (person.employment_history && person.employment_history[0]?.industry) || '';
    
    // Se não encontrar, usar OpenAI para tentar identificar pelo nome da empresa
    if (!industry && (currentEmployment.organization_name || organization.name)) {
      industry = await getCompanyIndustry(currentEmployment.organization_name || organization.name);
    }
    if (!industry) industry = 'Industry not specified';
    
    return {
      id: person.id || `${Date.now()}-${Math.random()}`,
      firstName: person.first_name || '',
      lastName: person.last_name || '',
      fullName: person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim(),
      jobTitle: currentEmployment.title || person.title || '',
      company: currentEmployment.organization_name || organization.name || '',
      location: formatLocation(person),
      industry,
      email: person.email || null,
      emailStatus: person.email_status || null,
      emailConfidence: person.extrapolated_email_confidence || null,
      profileUrl: person.linkedin_url || '',
      photoUrl: person.photo_url || '',
      twitterUrl: person.twitter_url || '',
      githubUrl: person.github_url || '',
      facebookUrl: person.facebook_url || '',
      headline: person.headline || '',
      organizationId: organization.id || currentEmployment.organization_id || '',
      contactId: person.contact_id || '',
      emailVerified: person.email_status === 'verified',
      emailScore: null,
      employeeCount: organization.employee_count || 'N/A',
      workHistory: (person.employment_history || []).map((job: any) => ({
        title: job.title || '',
        company: job.organization_name || '',
        companyUrl: job.organization_website || organization.website || '',
        duration: formatDuration(job.start_date, job.end_date, job.current),
        description: job.description || '',
        location: job.raw_address || '',
        skills: job.skills || []
      })),
      education: (person.education || []).map((edu: any) => ({
        school: edu.school || '',
        degree: edu.degree || '',
        fieldOfStudy: edu.major || '',
        year: formatEducationDates(edu.start_date, edu.end_date),
        activities: edu.activities || ''
      })),
      skills: person.skills || [],
      certifications: (person.certifications || []).map((cert: any) => ({
        name: cert.name || '',
        issuer: cert.issuer || '',
        date: cert.date || '',
        description: cert.description || ''
      })),
      state: person.state || '',
      city: person.city || '',
      country: person.country || '',
      validationResult: null
    };
  }));
};

const formatLocation = (person: any): string => {
  const parts = [];
  if (person.city) parts.push(person.city);
  if (person.state) parts.push(person.state);
  if (person.country && person.country !== 'United States') parts.push(person.country);
  return parts.join(', ') || 'Location not available';
};

const formatDuration = (startDate: string, endDate: string | null, current: boolean): string => {
  if (!startDate) return '';
  const start = new Date(startDate).getFullYear();
  const end = current ? 'Present' : endDate ? new Date(endDate).getFullYear() : '';
  return `${start} - ${end}`;
};

const formatEducationDates = (startDate: string | null, endDate: string | null): string => {
  if (!startDate && !endDate) return '';
  if (!startDate && endDate) return endDate;
  if (startDate && !endDate) return startDate;
  return `${startDate} - ${endDate}`;
};

export const fetchLeadData = async (linkedinUrl: string) => {
  try {
    const response = await apolloApi.post('/api/v1/people/match', {
      linkedin_url: linkedinUrl,
      reveal_personal_emails: false,
      reveal_phone_number: false
    });

    if (response.data && response.data.person) {
      return response.data.person;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching lead data:', error);
    if (axios.isAxiosError(error)) {
      console.error('Detailed error information:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
    }
    throw new Error('Falha ao buscar dados do lead. Por favor, verifique sua conexão e tente novamente.');
  }
};

export const searchApolloLead = async (params: {
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  organizationDomain?: string;
}): Promise<{ person: any; organization: any }> => {
  try {
    const searchData: any = {
      page: 1,
      per_page: 1, // Buscar apenas 1 resultado
      reveal_personal_emails: true, // Tentar revelar emails pessoais
      reveal_phone_number: false,
      email_status: ['verified', 'guessed', 'unavailable'], // Incluir todos os tipos de email
      use_email_credits: true // Forçar uso de créditos de email
    };

    // Adicionar filtros baseados nos parâmetros
    if (params.firstName || params.lastName) {
      const fullName = `${params.firstName || ''} ${params.lastName || ''}`.trim();
      if (fullName) {
        searchData.q_keywords = fullName;
      }
    }

    if (params.organizationName) {
      searchData.q_organization_names = [params.organizationName];
    }

    if (params.organizationDomain) {
      searchData.q_organization_domains = [params.organizationDomain];
    }

    console.log('Dados de busca Apollo:', searchData);
    const response = await apolloApi.post('/api/v1/mixed_people/search', searchData);
    
    if (response.data && response.data.people && response.data.people.length > 0) {
      const person = response.data.people[0];
      console.log('Dados brutos da pessoa encontrada:', person);
      
      // Tentar extrair email de diferentes campos
      const rawEmail = person.email || 
                      person.personal_emails?.[0] || 
                      person.work_email || 
                      person.extrapolated_email || 
                      '';

      // Identificar se é um placeholder do Apollo
      const isPlaceholderEmail = rawEmail === 'email_not_unlocked@domain.com' || 
                                rawEmail === 'email_not_unlocked@apollo.io';
      
      // Se for placeholder, indicar que há email disponível mas bloqueado
      // Se for email real, usar o email
      // Se estiver vazio, deixar vazio
      let email = rawEmail;
      let emailStatus = 'available';
      
      if (isPlaceholderEmail) {
        emailStatus = 'locked';
      } else if (!rawEmail) {
        emailStatus = 'unavailable';
      }

      // Se encontramos um placeholder mas temos créditos, tentar revelar o email
      if (isPlaceholderEmail && person.id) {
        console.log('Tentando revelar email bloqueado usando créditos...');
        try {
          // Primeira tentativa: usando people/match
          const revealResponse = await apolloApi.post('/api/v1/people/match', {
            id: person.id,
            reveal_personal_emails: true
          });
          
          if (revealResponse.data && revealResponse.data.person && revealResponse.data.person.email) {
            const revealedEmail = revealResponse.data.person.email;
            if (revealedEmail && !revealedEmail.includes('email_not_unlocked')) {
              email = revealedEmail;
              emailStatus = 'available';
              console.log('Email revelado com sucesso (method 1):', revealedEmail);
            }
          }
        } catch (revealError) {
          console.log('Método 1 falhou, tentando método 2...');
          
          // Segunda tentativa: usando people/enrich
          try {
            const enrichResponse = await apolloApi.post('/api/v1/people/enrich', {
              id: person.id,
              reveal_personal_emails: true
            });
            
            if (enrichResponse.data && enrichResponse.data.person && enrichResponse.data.person.email) {
              const enrichedEmail = enrichResponse.data.person.email;
              if (enrichedEmail && !enrichedEmail.includes('email_not_unlocked')) {
                email = enrichedEmail;
                emailStatus = 'available';
                console.log('Email revelado com sucesso (method 2):', enrichedEmail);
              }
            }
          } catch (enrichError) {
            console.log('Método 2 também falhou:', enrichError);
          }
        }
      }

      // Tentar extrair setor de diferentes campos
      const organization = person.organization || {};
      const currentEmployment = person.employment_history?.find((job: any) => job.current) || {};
      
      console.log('Dados da organização completos:', JSON.stringify(organization, null, 2));
      console.log('Histórico de emprego atual:', JSON.stringify(currentEmployment, null, 2));
      
      let industry = organization.industry || 
                    organization.raw_industry || 
                    organization.sector ||
                    currentEmployment.industry || 
                    person.industry ||
                    '';

      console.log('Email encontrado:', email);
      console.log('Email bruto:', rawEmail);
      console.log('Status do email:', emailStatus);
      console.log('É placeholder?', isPlaceholderEmail);
      console.log('Organização encontrada:', organization);
      console.log('Setor encontrado:', industry);
      
      return {
        person: {
          first_name: person.first_name || '',
          last_name: person.last_name || '',
          title: person.title || currentEmployment.title || '',
          email: email,
          emailStatus: emailStatus,
          linkedin_url: person.linkedin_url || '',
          organization_id: person.organization_id || '',
          city: person.city || '',
          state: person.state || ''
        },
        organization: person.organization ? {
          id: person.organization.id || '',
          name: person.organization.name || '',
          primary_domain: person.organization.primary_domain || person.organization.website || '',
          employees: person.organization.employees || person.organization.estimated_num_employees || 0,
          industry: industry,
          city: person.organization.city || '',
          state: person.organization.state || ''
        } : null
      };
    }
    
    throw new Error('Nenhum resultado encontrado');
  } catch (error) {
    console.error('Error searching for lead in Apollo:', error);
    if (axios.isAxiosError(error)) {
      console.error('Detailed error information:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
    }
    throw new Error('Falha ao buscar lead. Por favor, verifique sua conexão e tente novamente.');
  }
};