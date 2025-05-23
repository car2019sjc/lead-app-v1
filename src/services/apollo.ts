import axios from 'axios';
import config from '../config';
import { Lead } from '../types';
import { getCompanyIndustry } from './openai';

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
  count: number = 10
): Promise<Lead[]> => {
  try {
    const response = await apolloApi.post('/api/v1/mixed_people/search', {
      q_organization_domains: [],
      page: 1,
      person_titles: [jobTitle],
      person_locations: location ? [location] : [],
      organization_industries: industry ? [industry] : [],
      per_page: count
    });
    
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