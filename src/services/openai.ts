import OpenAI from 'openai';
import { Lead } from '../types';
import { INDUSTRIES } from '../constants/industries';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export const analyzeProfile = async (lead: Lead): Promise<string> => {
  try {
    const prompt = `
      Analise o seguinte perfil profissional e forneça uma análise detalhada em português do Brasil.
      Use um tom profissional, analítico e APROFUNDADO.

      Dados do Perfil:
      - Nome: ${lead.fullName}
      - Cargo Atual: ${lead.jobTitle}
      - Empresa: ${lead.company}
      - Localização: ${lead.location}
      - Indústria: ${lead.industry}
      
      Histórico Profissional:
      ${lead.workHistory?.map(job => `
        - ${job.title} em ${job.company}
        - Duração: ${job.duration}
        - Descrição: ${job.description}
      `).join('\n')}

      Por favor, forneça uma análise estruturada com as seguintes seções:

      1. Visão Geral do Perfil
      Faça um resumo do profissional destacando sua posição atual e experiência geral.

      2. Análise da Experiência
      Analise a trajetória profissional, evolução de carreira e responsabilidades principais.

      3. Persona para Marketing
      Para cada item abaixo, desenvolva uma resposta detalhada, com exemplos, contexto e recomendações práticas:
      - Principais desafios e dores profissionais
      - Objetivos e aspirações de carreira
      - Canais de comunicação preferidos
      - Tipo de conteúdo que mais engaja
      - Abordagem recomendada para marketing
      - Gatilhos de decisão prováveis

      4. Recomendações de Abordagem
      Sugira estratégias específicas para abordar este profissional em campanhas de marketing.

      Mantenha um tom profissional, analítico e APROFUNDADO, focando em insights acionáveis para marketing.
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 800
    });

    return completion.choices[0].message.content || 'Não foi possível gerar a análise.';
  } catch (error) {
    console.error('Error analyzing profile:', error);
    throw new Error('Falha ao analisar o perfil. Por favor, tente novamente.');
  }
};

export const getCompanyIndustry = async (companyName: string): Promise<string> => {
  try {
    const prompt = `
      Você é um especialista em dados de mercado. Dado apenas o nome de uma empresa, pesquise mentalmente como se estivesse usando o Google e responda apenas com o setor de atuação (indústria) principal da empresa, usando uma das seguintes opções padronizadas:

      ${INDUSTRIES.join('\n')}

      Regras:
      1. Responda APENAS com o nome exato do setor da lista acima
      2. Se não encontrar uma correspondência exata, escolha o setor mais próximo
      3. Se não conseguir identificar o setor, responda apenas "Industry not specified"
      4. Não inclua explicações ou texto adicional
      
      Nome da empresa: ${companyName}
    `;
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.2,
      max_tokens: 50
    });
    const response = completion.choices[0].message.content?.trim() || 'Industry not specified';
    // Verificar se a resposta está na lista de setores
    return INDUSTRIES.includes(response) ? response : 'Industry not specified';
  } catch (error) {
    console.error('Error fetching industry from OpenAI:', error);
    return 'Industry not specified';
  }
};

export const getCompanyUrl = async (companyName: string): Promise<string> => {
  try {
    const prompt = `
      Você é um assistente de dados. Dado apenas o nome de uma empresa, pesquise mentalmente como se estivesse usando o Google e responda apenas com a URL oficial do site da empresa.\n\nRegras:\n1. Responda APENAS com a URL oficial (ex: https://www.empresa.com)\n2. Não inclua explicações, texto adicional ou qualquer outro dado\n3. Se não encontrar, responda apenas "URL not found"\n\nNome da empresa: ${companyName}
    `;
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.2,
      max_tokens: 60
    });
    const response = completion.choices[0].message.content?.trim() || 'URL not found';
    // Validação simples de URL
    if (response.startsWith('http')) return response;
    return 'URL not found';
  } catch (error) {
    console.error('Error fetching company URL from OpenAI:', error);
    return 'URL not found';
  }
};

export const getCompanyEmployeeCount = async (companyName: string, industry?: string): Promise<string> => {
  // Verificar se a chave da API está configurada
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    console.warn('⚠️ Chave da API OpenAI não configurada, usando fallback');
    return '11-50'; // Fallback se não houver chave
  }
  
  try {
    const prompt = `
      Você é um especialista em dados de empresas. Dado o nome de uma empresa${industry ? ` do setor de ${industry}` : ''}, pesquise mentalmente como se tivesse acesso a bases de dados empresariais (LinkedIn, Crunchbase, sites oficiais) e responda apenas com o número aproximado de funcionários.

      Regras importantes:
      1. Responda APENAS com uma das seguintes opções padronizadas:
         - "1-10" (para startups muito pequenas)
         - "11-50" (para pequenas empresas)
         - "51-200" (para empresas médias)
         - "201-500" (para empresas médias-grandes)
         - "501-1000" (para empresas grandes)
         - "1001-5000" (para grandes corporações)
         - "5001-10000" (para multinacionais)
         - "10000+" (para grandes multinacionais)
         - "N/A" (se não conseguir estimar)

      2. Base sua estimativa em:
         - Porte da empresa no mercado
         - Setor de atuação
         - Presença geográfica
         - Conhecimento geral sobre a empresa

      3. Não inclua explicações ou texto adicional
      4. Seja conservador nas estimativas

      Nome da empresa: ${companyName}
    `;
    
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.1, // Baixa temperatura para respostas mais consistentes
      max_tokens: 20
    });

    const response = completion.choices[0].message.content?.trim() || 'N/A';
    
    // Validar se a resposta está nas opções válidas
    const validOptions = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10000+', 'N/A'];
    const finalResponse = validOptions.includes(response) ? response : 'N/A';
    
    return finalResponse;
    
  } catch (error) {
    console.error('Erro ao buscar dados de funcionários:', error);
    return 'N/A';
  }
};