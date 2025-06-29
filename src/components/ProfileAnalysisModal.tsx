import React, { useState, useEffect, useMemo } from 'react';
import { X, UserCircle, Briefcase, Target, MessageSquare, Loader2, Award, MapPin, Building } from 'lucide-react';
import { Lead } from '../types';
import { analyzeProfile } from '../services/openai';

interface ProfileAnalysisModalProps {
  lead: Lead;
  onClose: () => void;
}

const ProfileAnalysisModal: React.FC<ProfileAnalysisModalProps> = ({ lead, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [analysisResult, setAnalysisResult] = useState<string>('');

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        setLoading(true);
        const result = await analyzeProfile(lead);
        setAnalysisResult(result);
      } catch (err) {
        setError('Erro ao analisar perfil');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [lead]);

  const tabs = [
    { 
      id: 'profile', 
      label: 'Perfil', 
      icon: UserCircle,
      color: 'bg-blue-500',
      description: 'Visão geral do profissional'
    },
    { 
      id: 'experience', 
      label: 'Experiência', 
      icon: Briefcase,
      color: 'bg-green-500',
      description: 'Histórico profissional e competências'
    },
    { 
      id: 'persona', 
      label: 'Persona', 
      icon: Target,
      color: 'bg-purple-500',
      description: 'Perfil comportamental e motivações'
    },
    { 
      id: 'recommendations', 
      label: 'Recomendações', 
      icon: MessageSquare,
      color: 'bg-orange-500',
      description: 'Estratégias de abordagem'
    }
  ];

  const extractSectionContent = (sectionNumber: number) => {
    if (!analysisResult) return '';
    
    console.log(`Buscando seção ${sectionNumber}...`);
    console.log('Texto completo da análise:', analysisResult);
    
    const lines = analysisResult.split('\n');
    let capturing = false;
    let content: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Padrões mais flexíveis para detectar seções
      const patterns = [
        new RegExp(`^(?:#+\\s*|\\*\\*\\s*)?${sectionNumber}\\.\\s*`, 'i'),
        new RegExp(`^(?:#+\\s*|\\*\\*\\s*)?${sectionNumber}\\s*[-.]\\s*`, 'i'),
        new RegExp(`^(?:#+\\s*|\\*\\*\\s*)?${sectionNumber}\\s*`, 'i')
      ];
      
      let isStartOfSection = false;
      for (const pattern of patterns) {
        if (pattern.test(trimmed)) {
          isStartOfSection = true;
          break;
        }
      }
      
      if (isStartOfSection) {
        console.log(`Encontrou início da seção ${sectionNumber}:`, trimmed);
        capturing = true;
        // Adiciona o título da seção (removendo o número e formatação)
        const title = trimmed
          .replace(new RegExp(`^(?:#+\\s*|\\*\\*\\s*)?${sectionNumber}[.-]?\\s*`, 'i'), '')
          .replace(/\*\*$/, '')
          .trim();
        if (title) content.push(title);
        continue;
      }
      
      // Verifica se é o início de outra seção numerada (para parar de capturar)
      if (capturing && trimmed.match(/^(?:#+\s*|\*\*\s*)?\d+[.-]\s*/)) {
        const otherSectionNumber = parseInt(trimmed.match(/^(?:#+\s*|\*\*\s*)?(\d+)/)?.[1] || '0');
        if (otherSectionNumber !== sectionNumber) {
          console.log(`Parou de capturar na seção ${otherSectionNumber}`);
          break;
        }
      }
      
      // Adiciona o conteúdo se estiver capturando
      if (capturing && trimmed) {
        content.push(trimmed);
      }
    }
    
    const result = content.join('\n');
    console.log(`Conteúdo extraído da seção ${sectionNumber}:`, result.substring(0, 200) + '...');
    
    return result;
  };

  const getCurrentContent = useMemo(() => {
    const sectionMap = {
      'profile': 1,
      'experience': 2,
      'persona': 3,
      'recommendations': 4
    };
    
    const sectionNumber = sectionMap[activeTab as keyof typeof sectionMap];
    let content = extractSectionContent(sectionNumber);
    
    // Fallback: se não encontrou conteúdo, tenta métodos alternativos
    if (!content && analysisResult) {
      console.log(`Fallback para seção ${sectionNumber}...`);
      
      // Método alternativo: busca por palavras-chave
      const keywords = {
        2: ['experiência', 'experience', 'histórico', 'carreira'],
        3: ['persona', 'perfil', 'comportamental', 'marketing'],
        4: ['recomendações', 'recommendations', 'sugestões', 'abordagem']
      };
      
      if (keywords[sectionNumber as keyof typeof keywords]) {
        const lines = analysisResult.split('\n');
        let foundKeyword = false;
        let fallbackContent: string[] = [];
        
        for (const line of lines) {
          const trimmed = line.trim().toLowerCase();
          
          // Verifica se a linha contém palavras-chave da seção
          if (keywords[sectionNumber as keyof typeof keywords].some(keyword => 
            trimmed.includes(keyword))) {
            foundKeyword = true;
            fallbackContent.push(line.trim());
            continue;
          }
          
          // Se já encontrou a palavra-chave, continua capturando até encontrar outra seção
          if (foundKeyword) {
            if (trimmed.match(/^(?:#+\s*|\*\*\s*)?\d+[.-]\s*/) && 
                !keywords[sectionNumber as keyof typeof keywords].some(keyword => 
                  trimmed.includes(keyword))) {
              break;
            }
            if (trimmed) {
              fallbackContent.push(line.trim());
            }
          }
        }
        
        content = fallbackContent.join('\n');
        console.log(`Fallback encontrou conteúdo:`, content.substring(0, 100));
      }
    }
    
    // Se ainda não tem conteúdo, mostra debug
    if (!content) {
      console.log(`Nenhum conteúdo encontrado para seção ${sectionNumber} (${activeTab})`);
      console.log('Primeiras 500 chars do resultado:', analysisResult.substring(0, 500));
    }
    
    return content;
  }, [activeTab, analysisResult]);

  const formatText = (text: string) => {
    if (!text) return '';
    
    // Substitui **texto** por negrito usando uma abordagem mais estável
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <strong key={`bold-${index}`} className="font-semibold text-gray-900">{boldText}</strong>;
      }
      return <span key={`text-${index}`}>{part}</span>;
    });
  };

  const renderContent = () => {
    const content = getCurrentContent;
    const currentTab = tabs.find(tab => tab.id === activeTab);
    
    if (!content) {
      return (
        <div className="text-center py-16">
          <div className="bg-gray-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-12 h-12 text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum conteúdo disponível</h3>
          <p className="text-gray-500 mb-4">Não foi possível extrair informações para esta seção</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-2">Informações de debug:</p>
              <div className="space-y-1 text-xs">
                <p>• Seção: {activeTab}</p>
                <p>• Resultado da IA: {analysisResult ? 'Disponível' : 'Não disponível'}</p>
                <p>• Tamanho: {analysisResult?.length || 0} caracteres</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    return (
      <div className="space-y-6">
        {/* Header da seção */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
          <div className="flex items-center mb-3">
            <div className={`${currentTab?.color} rounded-lg p-2 mr-4`}>
              {currentTab?.icon && <currentTab.icon className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{currentTab?.label}</h3>
              <p className="text-gray-600 text-sm">{currentTab?.description}</p>
            </div>
          </div>
        </div>

        {/* Conteúdo da seção */}
        <div className="space-y-4">
          {paragraphs.map((paragraph, index) => {
            const isListItem = paragraph.trim().startsWith('•') || paragraph.trim().startsWith('-');
            const isTitle = paragraph.trim().startsWith('**') && paragraph.trim().endsWith('**');
            
            if (isTitle) {
              return (
                <div key={`title-${index}`} className="border-l-4 border-blue-500 pl-4 py-2">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {formatText(paragraph)}
                  </h4>
                </div>
              );
            }
            
            if (isListItem) {
              const items = paragraph.split('\n').filter(line => line.trim());
              return (
                <div key={`list-${index}`} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <ul className="space-y-3">
                    {items.map((item, itemIndex) => (
                      <li key={`item-${itemIndex}`} className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <div className="text-gray-700 leading-relaxed flex-1">
                          {formatText(item.replace(/^[•-]\s*/, ''))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
            
            return (
              <div key={`paragraph-${index}`} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-gray-700 leading-relaxed text-base whitespace-pre-line">
                  {formatText(paragraph)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
  };

      return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
        {/* Header aprimorado */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-4">
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <UserCircle className="w-8 h-8 text-white" />
              </div>
                  <div>
                <h2 className="text-2xl font-bold mb-1">{lead.fullName}</h2>
                <div className="flex items-center space-x-4 text-blue-100">
                  <div className="flex items-center">
                    <Briefcase className="w-4 h-4 mr-1" />
                    <span className="text-sm">{lead.jobTitle}</span>
                  </div>
                  <div className="flex items-center">
                    <Building className="w-4 h-4 mr-1" />
                    <span className="text-sm">{lead.company}</span>
                  </div>
                  {lead.location && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="text-sm">{lead.location}</span>
              </div>
                  )}
                </div>
              </div>
          </div>
          <button
            onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
          >
            <X size={24} />
          </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="bg-blue-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analisando perfil</h3>
              <p className="text-gray-600">Processando informações com IA...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <div className="bg-red-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <X className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erro na análise</h3>
            <div className="text-red-600 mb-6">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="flex h-[calc(95vh-140px)]">
            {/* Sidebar aprimorada */}
            <div className="w-72 bg-gray-50 border-r border-gray-200 p-6">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Análise Completa
                </h3>
              </div>
              <div className="space-y-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                        ? 'bg-white text-blue-700 shadow-md border border-blue-200'
                        : 'text-gray-600 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className={`${tab.color} ${activeTab === tab.id ? 'opacity-100' : 'opacity-70'} rounded-md p-1.5 mr-3`}>
                      <tab.icon size={16} className="text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{tab.description}</div>
                    </div>
                </button>
              ))}
              </div>
            </div>

            {/* Main content aprimorado */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-8">
                {renderContent()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileAnalysisModal;