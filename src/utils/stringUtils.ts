/**
 * Normaliza uma string removendo acentos e caracteres especiais
 * @param str - String a ser normalizada
 * @returns String normalizada em minúsculas e sem acentos
 */
export const normalizeString = (str: string): string => {
  if (!str) return '';
  
  return str
    .normalize('NFD')                // Normaliza caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
    .toLowerCase()                   // Converte para minúsculas
    .trim();                         // Remove espaços em branco
}; 