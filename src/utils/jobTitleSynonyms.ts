// Dicionário de equivalências de cargos
// Adicione mais conforme necessário
export const jobTitleSynonyms: Record<string, string[]> = {
  'cio': ['chief information officer', 'diretor de ti', 'diretor de tecnologia', 'gerente de ti'],
  'cto': ['chief technology officer', 'diretor de tecnologia'],
  'ceo': ['chief executive officer', 'presidente', 'diretor executivo'],
  'cfo': ['chief financial officer', 'diretor financeiro'],
  'coo': ['chief operating officer', 'diretor de operações'],
  // Adicione outros cargos e equivalentes aqui
};

export function getJobTitleEquivalents(term: string): string[] {
  const key = term.trim().toLowerCase();
  return jobTitleSynonyms[key] || [];
} 