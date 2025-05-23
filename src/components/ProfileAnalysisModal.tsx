import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import { analyzeProfile, getCompanyUrl } from '../services/openai';
import { X, Loader2, UserCircle, Briefcase, Target, MessageSquare } from 'lucide-react';

interface ProfileAnalysisModalProps {
  lead: Lead;
  onClose: () => void;
}

const ProfileAnalysisModal: React.FC<ProfileAnalysisModalProps> = ({ lead, onClose }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [parsedSections, setParsedSections] = useState<{ [key: string]: string }>({});
  const [companyUrl, setCompanyUrl] = useState<string | undefined>(lead.companyUrl);

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const result = await analyzeProfile(lead);
        setAnalysis(result);
        
        // Parse sections based on numbered headings
        const sections: { [key: string]: string } = {};
        const sectionMatches = result.match(/\d+\.\s+([^\n]+)([\s\S]*?)(?=\d+\.|$)/g) || [];
        
        sectionMatches.forEach(section => {
          if (section.startsWith('1.')) {
            sections.profile = section.replace(/1\.\s+[^\n]+\n/, '').trim();
          } else if (section.startsWith('2.')) {
            sections.experience = section.replace(/2\.\s+[^\n]+\n/, '').trim();
          } else if (section.startsWith('3.')) {
            sections.persona = section.replace(/3\.\s+[^\n]+\n/, '').trim();
          } else if (section.startsWith('4.')) {
            sections.recommendations = section.replace(/4\.\s+[^\n]+\n/, '').trim();
          }
        });

        setParsedSections(sections);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao analisar o perfil');
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [lead]);

  useEffect(() => {
    // Busca automática da URL da empresa se não houver
    const fetchCompanyUrl = async () => {
      if (!lead.companyUrl && lead.company) {
        const url = await getCompanyUrl(lead.company);
        if (url && url !== 'URL not found') {
          setCompanyUrl(url);
        }
      }
    };
    fetchCompanyUrl();
  }, [lead]);

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: UserCircle },
    { id: 'experience', label: 'Experiência', icon: Briefcase },
    { id: 'persona', label: 'Persona', icon: Target },
    { id: 'recommendations', label: 'Recomendações', icon: MessageSquare }
  ];

  // Função para renderizar lista de persona
  const renderPersonaList = (listItems: string[]) => (
    <div className="grid grid-cols-1 gap-4">
      {listItems.map((item, idx) => (
        <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start shadow-sm">
          <Target className="text-blue-500 mr-2 mt-1" size={20} />
          <div className="text-gray-700 text-sm whitespace-pre-line">{highlightCompany(item.replace(/^\-\s*/, ''))}</div>
        </div>
      ))}
    </div>
  );

  // Função para renderizar lista de recomendações
  const renderRecommendationsList = (listItems: string[]) => (
    <div className="grid grid-cols-1 gap-4">
      {listItems.map((item, idx) => (
        <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start shadow-sm">
          <MessageSquare className="text-blue-700 mr-2 mt-1" size={20} />
          <div className="text-gray-700 text-sm whitespace-pre-line">{highlightCompany(item.replace(/^\-\s*/, ''))}</div>
        </div>
      ))}
    </div>
  );

  // Função utilitária para destacar o nome da empresa em negrito ou como link nos textos
  const highlightCompany = (text: string) => {
    if (!lead.company) return text;
    const urlToUse = companyUrl || lead.companyUrl;
    const regex = new RegExp(`(${lead.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part, idx) => {
      if (part.toLowerCase() === lead.company.toLowerCase()) {
        if (urlToUse) {
          return <a key={idx} href={urlToUse} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 hover:underline">{part}</a>;
        }
        return <span key={idx} className="font-bold text-blue-700">{part}</span>;
      }
      return part;
    });
  };

  const renderContent = () => {
    const content = parsedSections[activeTab];
    if (!content) return null;

    // Renderização especial para a aba Persona
    if (activeTab === 'persona') {
      // Regex mais tolerante: aceita dois pontos ou hífen após o título
      const regex = /\*\*(.*?)\*\*[:\-]?\s*([\s\S]*?)(?=\n\*\*|$)/g;
      const matches = [...content.matchAll(regex)];
      if (matches.length === 0) {
        // Detectar blocos por títulos conhecidos mesmo em texto corrido
        const TITULOS = [
          'Principais desafios e dores profissionais',
          'Objetivos e aspirações de carreira',
          'Canais de comunicação preferidos',
          'Tipo de conteúdo que mais engaja',
          'Abordagem recomendada para marketing',
          'Gatilhos de decisão prováveis'
        ];
        // Regex para separar blocos por título
        const regexT = new RegExp(`(${TITULOS.map(t => t.replace(/([.*+?^=!:${}()|[\]\\])/g, "\\$1")).join('|')}):`, 'g');
        const partes = content.split(regexT).filter(Boolean);
        if (partes.length > 1) {
          // partes = [titulo1, texto1, titulo2, texto2, ...]
          const icones = [
            <Target className="text-red-400 mr-3 mt-1" size={22} />, // Desafios
            <Briefcase className="text-blue-500 mr-3 mt-1" size={22} />, // Objetivos
            <UserCircle className="text-green-500 mr-3 mt-1" size={22} />, // Canais
            <MessageSquare className="text-yellow-500 mr-3 mt-1" size={22} />, // Conteúdo
            <Target className="text-purple-500 mr-3 mt-1" size={22} />, // Abordagem
            <Briefcase className="text-pink-500 mr-3 mt-1" size={22} /> // Gatilhos
          ];
          const cards = [];
          for (let i = 0; i < partes.length - 1; i += 2) {
            const titulo = partes[i].replace(/^[\-\s]+/, '').trim();
            let texto = partes[i + 1].replace(/^[\-\s]+/, '').trim();
            // Remove título do início ou fim do texto, hífens e espaços extras
            texto = texto.replace(new RegExp(`^${titulo}[:\-]?`, 'i'), '').replace(/^-+/, '').replace(/-+$/, '').trim();
            if (titulo && texto) {
              cards.push({ titulo, texto, icon: icones[i/2] });
            }
          }
          // Se só o primeiro bloco vier com todos os tópicos dentro do texto, quebrar em cards
          if (cards.length === 1) {
            const texto = cards[0].texto;
            // Regex para encontrar tópicos do tipo '- **Título:**' (com ou sem texto na mesma linha)
            const regexSub = /- \*\*(.*?)\*\*:?\s*([\s\S]*?)(?=\n- \*\*|$)/g;
            let matchSub;
            const newCards = [];
            // Encontrar o texto introdutório antes do primeiro tópico
            const firstMatch = texto.match(/^-\s*\*\*/m);
            if (firstMatch && firstMatch.index > 0) {
              const intro = texto.slice(0, firstMatch.index).trim();
              if (intro) {
                newCards.push({ titulo: cards[0].titulo, texto: intro, icon: cards[0].icon });
              }
            }
            // Encontrar todos os tópicos '- **Título:**' + texto
            while ((matchSub = regexSub.exec(texto)) !== null) {
              let titulo = (matchSub[1] || '').replace(/^[\-\s\*]+/, '').replace(/[\*]+$/, '').trim();
              let textoTopico = (matchSub[2] || '').replace(/^[\-\s]+/, '').trim();
              // Remove o título do início do texto, hífens, asteriscos e espaços extras
              textoTopico = textoTopico.replace(new RegExp(`^${titulo}[:\-]?`, 'i'), '').replace(/^[\-\s\*]+/, '').replace(/[\*]+$/, '').replace(/^-+/, '').replace(/-+$/, '').trim();
              if (titulo && textoTopico) {
                // Seleciona ícone conforme o título
                let icon = <Target className="text-blue-700 mr-2 mt-1 flex-shrink-0" size={18} />;
                if (/desafios/i.test(titulo)) icon = <Target className="text-red-400 mr-2 mt-1 flex-shrink-0" size={18} />;
                else if (/objetivos/i.test(titulo)) icon = <Briefcase className="text-blue-500 mr-2 mt-1 flex-shrink-0" size={18} />;
                else if (/canais/i.test(titulo)) icon = <UserCircle className="text-green-500 mr-2 mt-1 flex-shrink-0" size={18} />;
                else if (/conteúdo/i.test(titulo)) icon = <MessageSquare className="text-yellow-500 mr-2 mt-1 flex-shrink-0" size={18} />;
                else if (/abordagem/i.test(titulo)) icon = <Target className="text-purple-500 mr-2 mt-1 flex-shrink-0" size={18} />;
                else if (/gatilhos/i.test(titulo)) icon = <Briefcase className="text-pink-500 mr-2 mt-1 flex-shrink-0" size={18} />;
                newCards.push({ titulo, texto: textoTopico, icon });
              }
            }
            if (newCards.length > 0) {
              return (
                <div className="bg-orange-50 border border-orange-700 rounded-lg p-6 text-orange-900 shadow-md relative">
                  <div className="grid grid-cols-1 gap-1 pr-2">
                    {newCards.map((card, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm flex items-start">
                        {card.icon}
                        <div>
                          <div className="font-semibold text-gray-800 mb-1 text-base">{highlightCompany(card.titulo)}</div>
                          <div className="text-gray-700 text-sm whitespace-pre-line leading-normal">{highlightCompany(card.texto)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
          }
          // Listas
          const listItems = content.split('\n').filter(line => line.trim().match(/^[-•]\s+/));
          if (listItems.length > 0) {
            return (
              <div className="bg-orange-50 border border-orange-700 rounded-lg p-6 text-orange-900 shadow-md relative">
                <div className="bg-gray-50 border border-gray-200 rounded p-4 overflow-x-auto shadow-inner">
                  {listItems.map((item, idx) => (
                    <div key={idx} className="flex items-start mb-1">
                      <Target className="text-blue-700 mr-2 mt-1 flex-shrink-0" size={18} />
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line m-0">{highlightCompany(item.replace(/^[-•]\s+/, ''))}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          // Fallback: parágrafos
          return (
            <div className="bg-orange-50 border border-orange-700 rounded-lg p-6 text-orange-900 shadow-md relative">
              <div className="bg-gray-50 border border-gray-200 rounded p-4 overflow-x-auto shadow-inner">
                {content
                  .split(/(?<=\.) (?=[A-ZÁÉÍÓÚÇÂÊÔÃÕÀÜ])/g)
                  .map((paragraph, idx) => (
                    <div key={idx} className="flex items-start mb-1">
                      <Target className="text-blue-700 mr-2 mt-1 flex-shrink-0" size={18} />
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line m-0">{highlightCompany(paragraph.trim().replace(/^[-•]\s+/, ''))}</p>
                    </div>
                  ))}
              </div>
            </div>
          );
        }
        // Blocos bem formatados (com **Título**)
        return (
          <div className="bg-orange-50 border border-orange-700 rounded-lg p-6 text-orange-900 shadow-md relative">
            <div className="grid grid-cols-1 gap-1">
              {matches.map((match, idx) => {
                const titulo = match[1].replace(/^[\-\s]+/, '').trim();
                let texto = match[2].replace(/^[\-\s]+/, '').trim();
                // Remove título do início ou fim do texto, hífens e espaços extras
                texto = texto.replace(new RegExp(`^${titulo}[:\-]?`, 'i'), '').replace(/^-+/, '').replace(/-+$/, '').trim();
                // Seleciona ícone conforme o título
                let icon = <Target className="text-blue-700 mr-2 mt-1 flex-shrink-0" size={18} />;
                if (/desafios/i.test(titulo)) icon = <Target className="text-red-400 mr-2 mt-1 flex-shrink-0" size={18} />;
                else if (/objetivos/i.test(titulo)) icon = <Briefcase className="text-blue-500 mr-2 mt-1 flex-shrink-0" size={18} />;
                else if (/canais/i.test(titulo)) icon = <UserCircle className="text-green-500 mr-2 mt-1 flex-shrink-0" size={18} />;
                else if (/conteúdo/i.test(titulo)) icon = <MessageSquare className="text-yellow-500 mr-2 mt-1 flex-shrink-0" size={18} />;
                else if (/abordagem/i.test(titulo)) icon = <Target className="text-purple-500 mr-2 mt-1 flex-shrink-0" size={18} />;
                else if (/gatilhos/i.test(titulo)) icon = <Briefcase className="text-pink-500 mr-2 mt-1 flex-shrink-0" size={18} />;
                if (!titulo || !texto) return null;
                return (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start shadow-sm">
                    {icon}
                    <div>
                      <div className="font-semibold text-gray-800 mb-1 text-base">{highlightCompany(titulo)}</div>
                      <div className="text-gray-700 text-sm whitespace-pre-line">{highlightCompany(texto)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      // Blocos bem formatados (com **Título**)
      return (
        <div className="bg-orange-50 border border-orange-700 rounded-lg p-6 text-orange-900 shadow-md relative">
          <div className="grid grid-cols-1 gap-1">
            {matches.map((match, idx) => {
              const titulo = match[1].replace(/^[\-\s]+/, '').trim();
              let texto = match[2].replace(/^[\-\s]+/, '').trim();
              // Remove título do início ou fim do texto, hífens e espaços extras
              texto = texto.replace(new RegExp(`^${titulo}[:\-]?`, 'i'), '').replace(/^-+/, '').replace(/-+$/, '').trim();
              // Seleciona ícone conforme o título
              let icon = <Target className="text-blue-700 mr-2 mt-1 flex-shrink-0" size={18} />;
              if (/desafios/i.test(titulo)) icon = <Target className="text-red-400 mr-2 mt-1 flex-shrink-0" size={18} />;
              else if (/objetivos/i.test(titulo)) icon = <Briefcase className="text-blue-500 mr-2 mt-1 flex-shrink-0" size={18} />;
              else if (/canais/i.test(titulo)) icon = <UserCircle className="text-green-500 mr-2 mt-1 flex-shrink-0" size={18} />;
              else if (/conteúdo/i.test(titulo)) icon = <MessageSquare className="text-yellow-500 mr-2 mt-1 flex-shrink-0" size={18} />;
              else if (/abordagem/i.test(titulo)) icon = <Target className="text-purple-500 mr-2 mt-1 flex-shrink-0" size={18} />;
              else if (/gatilhos/i.test(titulo)) icon = <Briefcase className="text-pink-500 mr-2 mt-1 flex-shrink-0" size={18} />;
              if (!titulo || !texto) return null;
              return (
                <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start shadow-sm">
                  {icon}
                  <div>
                    <div className="font-semibold text-gray-800 mb-1 text-base">{highlightCompany(titulo)}</div>
                    <div className="text-gray-700 text-sm whitespace-pre-line">{highlightCompany(texto)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Renderização especial para a aba Recomendações
    if (activeTab === 'recommendations') {
      // Blocos e ícones para recomendações
      const blocks = [
        {
          title: 'Recomendações de abordagem',
          icon: <MessageSquare className="text-blue-500 mr-2" size={20} />,
          key: 'recomendacoes',
        },
        {
          title: 'Sugestões de estratégias',
          icon: <Target className="text-green-500 mr-2" size={20} />,
          key: 'estrategias',
        },
        {
          title: 'Ações práticas',
          icon: <Briefcase className="text-purple-500 mr-2" size={20} />,
          key: 'acoes',
        },
      ];
      // Regex tolerante para blocos de recomendações
      const regex = /\*\*(.*?)\*\*[:\-]?(.*?)(?=\n- \*\*|$)/gs;
      const matches = [...content.matchAll(regex)];
      if (matches.length === 0) {
        // Parser inteligente para listas e blocos
        // 1. Detectar listas
        const listItems = content.split('\n').filter(line => line.trim().match(/^[-•]\s+/));
        if (listItems.length > 0) {
          return (
            <div className="bg-orange-50 border border-orange-700 rounded-lg p-6 text-orange-900 shadow-md relative">
              <div className="bg-gray-50 border border-gray-200 rounded p-4 overflow-x-auto shadow-inner">
                {listItems.map((item, idx) => (
                  <div key={idx} className="flex items-start mb-1">
                    <MessageSquare className="text-blue-700 mr-2 mt-1 flex-shrink-0" size={18} />
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line m-0">{highlightCompany(item.replace(/^[-•]\s+/, ''))}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        // 2. Detectar blocos com títulos (ex: 'Sugestão:', '**Título**:')
        const blocoRegex = /(?:\*\*(.*?)\*\*|([A-ZÁÉÍÓÚÇÂÊÔÃÕÀÜa-záéíóúçâêôãõàü0-9\s]+))[:：]\s*([\s\S]*?)(?=\n\s*(?:\*\*|[A-ZÁÉÍÓÚÇÂÊÔÃÕÀÜa-záéíóúçâêôãõàü0-9\s]+)[:：]|$)/g;
        const blocos = [];
        let blocoMatch;
        while ((blocoMatch = blocoRegex.exec(content)) !== null) {
          const titulo = blocoMatch[1] || blocoMatch[2] || '';
          const texto = blocoMatch[3] || '';
          blocos.push({ titulo, texto });
        }
        if (blocos.length > 0) {
          return (
            <div className="grid grid-cols-1 gap-3">
              {blocos.map((bloco, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="font-semibold text-gray-800 mb-1 text-base">{highlightCompany(bloco.titulo)}</div>
                  <div className="text-gray-700 text-sm whitespace-pre-line leading-normal">{highlightCompany(bloco.texto.trim())}</div>
                </div>
              ))}
            </div>
          );
        }
        // 3. Fallback: parágrafos
        return (
          <div className="bg-orange-50 border border-orange-700 rounded-lg p-6 text-orange-900 shadow-md relative">
            <div className="bg-gray-50 border border-gray-200 rounded p-4 overflow-x-auto shadow-inner">
              {content
                .split(/(?<=\.) (?=[A-ZÁÉÍÓÚÇÂÊÔÃÕÀÜ])/g)
                .map((paragraph, idx) => (
                  <div key={idx} className="flex items-start mb-1">
                    <MessageSquare className="text-blue-700 mr-2 mt-1 flex-shrink-0" size={18} />
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line m-0">{highlightCompany(paragraph.trim())}</p>
                  </div>
                ))}
            </div>
          </div>
        );
      }
      return (
        <div className="grid grid-cols-1 gap-1">
          {matches.map((match, idx) => (
            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start shadow-sm">
              {blocks[idx] && blocks[idx].icon}
              <div>
                <div className="font-semibold text-gray-800 mb-1 text-base">{highlightCompany(match[1])}</div>
                <div className="text-gray-700 text-sm whitespace-pre-line">{highlightCompany(match[2].trim())}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Renderização padrão para outras abas
    return content.split('\n').map((paragraph, index) => (
      paragraph.trim() && (
        <p key={index} className="mb-4 text-gray-700 leading-relaxed whitespace-pre-line">
          {highlightCompany(paragraph.trim())}
        </p>
      )
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{lead.fullName}</h3>
            <p className="text-sm text-gray-600">{lead.jobTitle} at {lead.company}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
            <span className="ml-2 text-gray-600">Analisando perfil...</span>
          </div>
        ) : error ? (
          <div className="text-red-600 text-center py-8">{error}</div>
        ) : analysis ? (
          <div className="flex h-full">
            <div className="w-48 bg-gray-50 border-r border-gray-200 p-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-md mb-2 text-sm font-medium transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon size={18} className="mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <div className="prose max-w-none">
                {renderContent()}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600">Não foi possível gerar a análise</div>
        )}
      </div>
    </div>
  );
};

export default ProfileAnalysisModal;