// Dicionário de equivalências de cargos
// Adicione mais conforme necessário
export const jobTitleSynonyms: Record<string, string[]> = {
  // Cargos executivos
  'cio': ['chief information officer', 'diretor de ti', 'diretor de tecnologia', 'gerente de ti'],
  'cto': ['chief technology officer', 'diretor de tecnologia'],
  'ceo': ['chief executive officer', 'presidente', 'diretor executivo'],
  'cfo': ['chief financial officer', 'diretor financeiro'],
  'coo': ['chief operating officer', 'diretor de operações'],
  
  // Gerência e liderança - Português para Inglês
  'gerente': ['manager', 'supervisor', 'team leader', 'lead', 'head', 'coordinator'],
  'gerente geral': ['general manager', 'gm', 'operations manager'],
  'gerente de vendas': ['sales manager', 'sales director', 'head of sales'],
  'gerente de marketing': ['marketing manager', 'marketing director', 'head of marketing'],
  'gerente de ti': ['it manager', 'technology manager', 'head of it'],
  'gerente de rh': ['hr manager', 'human resources manager', 'head of hr'],
  'gerente financeiro': ['finance manager', 'financial manager', 'head of finance'],
  'gerente de operações': ['operations manager', 'ops manager', 'head of operations'],
  'gerente de projetos': ['project manager', 'pm', 'program manager'],
  'gerente de produto': ['product manager', 'head of product', 'product lead'],
  'gerente comercial': ['commercial manager', 'business manager', 'sales manager'],
  
  // Direção - Português para Inglês
  'diretor': ['director', 'head', 'vp', 'vice president'],
  'diretor geral': ['general director', 'managing director', 'ceo'],
  'diretor comercial': ['commercial director', 'sales director', 'business director'],
  'diretor de vendas': ['sales director', 'head of sales', 'vp sales'],
  'diretor de marketing': ['marketing director', 'cmo', 'head of marketing'],
  'diretor financeiro': ['financial director', 'cfo', 'head of finance'],
  'diretor de rh': ['hr director', 'head of hr', 'chro'],
  'diretor de ti': ['it director', 'cto', 'head of technology'],
  'diretor de operações': ['operations director', 'coo', 'head of operations'],
  
  // Coordenação
  'coordenador': ['coordinator', 'lead', 'supervisor'],
  'coordenador de vendas': ['sales coordinator', 'sales lead'],
  'coordenador de marketing': ['marketing coordinator', 'marketing lead'],
  'coordenador de ti': ['it coordinator', 'technology coordinator', 'tech coordinator', 'it lead'],
  'coordenador ti': ['it coordinator', 'technology coordinator', 'tech coordinator', 'it lead'],
  'coordenador de tecnologia': ['technology coordinator', 'tech coordinator', 'it coordinator'],
  'coordenador tecnologia': ['technology coordinator', 'tech coordinator', 'it coordinator'],
  
  // Supervisão
  'supervisor': ['supervisor', 'team lead', 'manager', 'coordenador'],
  'supervisor de vendas': ['sales supervisor', 'sales team lead'],
  
  // Inglês para Português (para pesquisas reversas)
  'manager': ['gerente', 'supervisor', 'coordenador'],
  'director': ['diretor', 'gerente geral'],
  'head': ['chefe', 'diretor', 'gerente'],
  'lead': ['líder', 'coordenador', 'responsável'],
  'coordinator': ['coordenador', 'supervisor'],
  
  // Especialidades técnicas
  'analista': ['analyst', 'specialist'],
  'consultor': ['consultant', 'advisor'],
  'especialista': ['specialist', 'expert', 'analyst'],
  'desenvolvedor': ['developer', 'programmer', 'engineer'],
  'engenheiro': ['engineer', 'developer', 'architect'],
  
  // Outros cargos comuns
  'presidente': ['president', 'ceo', 'chief executive'],
  'vice-presidente': ['vice president', 'vp'],
  'sócio': ['partner', 'founding partner'],
  'fundador': ['founder', 'co-founder'],
  'proprietário': ['owner', 'business owner']
};

export function getJobTitleEquivalents(term: string): string[] {
  const key = term.trim().toLowerCase();
  return jobTitleSynonyms[key] || [];
}

// Nova função para obter o melhor termo em inglês para pesquisa no Apollo
export function getBestEnglishJobTitle(term: string): string {
  const key = term.trim().toLowerCase();
  const equivalents = jobTitleSynonyms[key] || [];
  
  // Se há equivalentes, retorna o primeiro (geralmente o mais comum em inglês)
  if (equivalents.length > 0) {
    return equivalents[0];
  }
  
  // Se não há equivalentes, retorna o termo original
  return term;
}

// Função para normalizar cargo removendo preposições comuns
export function normalizeJobTitle(title: string): string {
  // Lista de preposições e artigos comuns em português
  const prepositions = ['de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'para', 'pela', 'pelo', 'com', 'sem', 'sob', 'sobre'];
  
  // Divide o título em palavras
  const words = title.toLowerCase().trim().split(/\s+/);
  
  // Remove preposições, mas mantém se for a última palavra (ex: "Gerente de TI" -> mantém "TI")
  const filteredWords = words.filter((word, index) => {
    // Sempre mantém a primeira e última palavra
    if (index === 0 || index === words.length - 1) return true;
    // Remove preposições do meio
    return !prepositions.includes(word);
  });
  
  return filteredWords.join(' ');
}

// Função para gerar variações de um cargo
export function generateJobTitleVariations(title: string): string[] {
  const variations = new Set<string>();
  
  // Adiciona o título original
  variations.add(title);
  
  // Adiciona versão normalizada (sem preposições)
  const normalized = normalizeJobTitle(title);
  variations.add(normalized);
  
  // Divide em palavras para criar mais variações
  const words = title.toLowerCase().trim().split(/\s+/);
  
  // Se tem "de" no meio, cria variações com e sem
  if (words.includes('de')) {
    // Versão sem nenhum "de"
    const withoutDe = words.filter(w => w !== 'de').join(' ');
    variations.add(withoutDe);
    
    // Para casos como "Coordenador de TI", também tenta "Coordenador TI"
    const deIndex = words.indexOf('de');
    if (deIndex > 0 && deIndex < words.length - 1) {
      const beforeDe = words.slice(0, deIndex);
      const afterDe = words.slice(deIndex + 1);
      variations.add([...beforeDe, ...afterDe].join(' '));
    }
  }
  
  // Adiciona variações com diferentes capitalizações
  variations.forEach(v => {
    // Primeira letra maiúscula de cada palavra
    const titleCase = v.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    variations.add(titleCase);
    
    // Tudo maiúsculo
    variations.add(v.toUpperCase());
  });
  
  // Remove duplicatas e retorna como array
  return Array.from(variations);
}

// Função aprimorada para buscar equivalentes considerando variações
export function getEnhancedJobTitleEquivalents(term: string): string[] {
  const allEquivalents = new Set<string>();
  
  // Primeiro, tenta com o termo original
  const directEquivalents = getJobTitleEquivalents(term);
  directEquivalents.forEach(eq => allEquivalents.add(eq));
  
  // Depois, tenta com o termo normalizado
  const normalized = normalizeJobTitle(term);
  const normalizedEquivalents = getJobTitleEquivalents(normalized);
  normalizedEquivalents.forEach(eq => allEquivalents.add(eq));
  
  // Gera variações e busca equivalentes para cada uma
  const variations = generateJobTitleVariations(term);
  variations.forEach(variation => {
    const varEquivalents = getJobTitleEquivalents(variation);
    varEquivalents.forEach(eq => allEquivalents.add(eq));
  });
  
  // Se ainda não encontrou equivalentes, retorna as próprias variações
  if (allEquivalents.size === 0) {
    return variations;
  }
  
  return Array.from(allEquivalents);
} 