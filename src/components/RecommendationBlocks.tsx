import React from 'react';
import { MessageSquare, Target, Briefcase } from 'lucide-react';

interface RecommendationBlocksProps {
  content: string;
}

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

const RecommendationBlocks: React.FC<RecommendationBlocksProps> = ({ content }) => {
  // Regex tolerante para blocos de recomendações
  const regex = /\*\*(.*?)\*\*[:\-]?(.*?)(?=\n- \*\*|$)/gs;
  const matches = [...content.matchAll(regex)];

  if (matches.length === 0) {
    const listItems = content.split('\n').filter(line => line.trim().startsWith('-'));
    if (listItems.length > 0) {
      return (
        <div className="grid grid-cols-1 gap-4">
          {listItems.map((item, idx) => (
            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start shadow-sm">
              <MessageSquare className="text-blue-500 mr-2 mt-1" size={20} />
              <div className="text-gray-700 text-sm whitespace-pre-line">{item.replace(/^\-\s*/, '')}</div>
            </div>
          ))}
        </div>
      );
    }
    // Fallback: texto bruto
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
        <div className="font-semibold mb-2">Não foi possível identificar blocos de recomendações automaticamente.</div>
        <div className="text-sm mb-2">Veja abaixo o texto gerado pela IA:</div>
        <pre className="whitespace-pre-line text-gray-700 text-sm bg-gray-100 rounded p-2 overflow-x-auto">{content}</pre>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {matches.map((match, idx) => (
        <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start shadow-sm">
          {blocks[idx] && blocks[idx].icon}
          <div>
            <div className="font-semibold text-gray-800 mb-1 text-base">{match[1]}</div>
            <div className="text-gray-700 text-sm whitespace-pre-line">{match[2].trim()}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecommendationBlocks; 