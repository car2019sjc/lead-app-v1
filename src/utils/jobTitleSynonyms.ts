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