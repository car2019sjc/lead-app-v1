import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import { X, Briefcase, Globe, FileText, Building2, MapPin, Mail, Loader2 } from 'lucide-react';
import { extractCity } from '../utils/stringUtils';
import { searchApolloLead } from '../services/apollo';

interface LeadDataModalProps {
  lead: Lead;
  onClose: () => void;
}

const LeadDataModal: React.FC<LeadDataModalProps> = ({ lead, onClose }) => {
  const [activeTab, setActiveTab] = useState('experience');
  const [updatedLead, setUpdatedLead] = useState<Lead>(lead);
  const [isSearchingEmail, setIsSearchingEmail] = useState(false);
  const [emailSearchCompleted, setEmailSearchCompleted] = useState(false);
  const [emailFoundAutomatically, setEmailFoundAutomatically] = useState(false);

  const tabs = [
    { id: 'experience', label: 'Experience', icon: Briefcase },
  ];

  // Get current company from work history
  const currentCompany = updatedLead.workHistory?.find(job => 
    job.company.toLowerCase() === updatedLead.company.toLowerCase()
  );

  // Função para detectar se precisa buscar email
  const needsEmailSearch = (leadData: Lead): boolean => {
    return !leadData.email || 
           leadData.email === '' || 
           leadData.email === 'N/A' || 
           leadData.email.includes('email_not_unlocked') ||
           leadData.email.includes('not_available');
  };

  // Função para buscar email automaticamente
  const searchEmailAutomatically = async () => {
    if (!needsEmailSearch(updatedLead) || emailSearchCompleted || isSearchingEmail) {
      return;
    }

    setIsSearchingEmail(true);
    console.log('🔍 Buscando email automaticamente para:', updatedLead.fullName);

    try {
      const searchParams = {
        firstName: updatedLead.firstName,
        lastName: updatedLead.lastName,
        organizationName: updatedLead.company,
        organizationDomain: currentCompany?.companyUrl?.replace('https://www.', '').replace('http://www.', '') || ''
      };

      console.log('📤 Parâmetros de busca:', searchParams);
      const apolloResult = await searchApolloLead(searchParams);
      
      if (apolloResult && apolloResult.person && apolloResult.person.email) {
        const newEmail = apolloResult.person.email;
        console.log('✅ Email encontrado:', newEmail);
        
        setUpdatedLead(prev => ({
          ...prev,
          email: newEmail,
          emailVerified: apolloResult.person.emailStatus === 'available'
        }));
        
        setEmailFoundAutomatically(true);
        // Ocultar a notificação após 5 segundos
        setTimeout(() => {
          setEmailFoundAutomatically(false);
        }, 5000);
      } else {
        console.log('❌ Email não encontrado no Apollo');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar email:', error);
    } finally {
      setIsSearchingEmail(false);
      setEmailSearchCompleted(true);
    }
  };

  // Buscar email automaticamente quando modal abrir (apenas uma vez)
  useEffect(() => {
    const timer = setTimeout(() => {
      searchEmailAutomatically();
    }, 1000); // Aguarda 1 segundo após abrir o modal

    return () => clearTimeout(timer);
  }, []); // Array vazio garante que executa apenas uma vez

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{updatedLead.fullName}</h3>
            <div className="flex items-center text-sm text-gray-600">
              <span>{updatedLead.jobTitle} at {currentCompany?.companyUrl ? (
                <a href={currentCompany.companyUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 hover:underline">{updatedLead.company}</a>
              ) : (
                <span className="font-bold text-gray-800">{updatedLead.company}</span>
              )}</span>
              {currentCompany?.companyUrl && (
                <a
                  href={currentCompany.companyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Building2 size={14} className="mr-1" />
                  Company Website
                </a>
              )}
            </div>
            
            {/* Indicador de busca de email */}
            {isSearchingEmail && (
              <div className="flex items-center mt-2 text-xs text-blue-600">
                <Loader2 size={12} className="mr-1 animate-spin" />
                Buscando email no Apollo...
              </div>
            )}
            
            {/* Notificação de email encontrado */}
            {emailFoundAutomatically && (
              <div className="flex items-center mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                <Mail size={12} className="mr-1" />
                Email encontrado automaticamente!
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-48 bg-gray-50 border-r border-gray-200 p-4 flex-shrink-0">
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

          <div className="flex-1 p-6 overflow-y-auto min-h-0">
            {activeTab === 'experience' && (
              <div className="space-y-6">
                {/* Informações do Lead */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">Informações do Lead</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Nome:</span>
                      <p className="text-gray-900">{updatedLead.fullName}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Cargo:</span>
                      <p className="text-gray-900">{updatedLead.jobTitle}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Empresa:</span>
                      <p className="text-gray-900">{updatedLead.company}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Setor:</span>
                      <p className="text-gray-900">{updatedLead.industry}</p>
                    </div>
                    {updatedLead.location && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Localização:</span>
                        <p className="text-gray-900">{extractCity(updatedLead.location)}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-600">Email:</span>
                      <div className="flex items-center">
                        {isSearchingEmail ? (
                          <div className="flex items-center text-blue-600">
                            <Loader2 size={14} className="mr-2 animate-spin" />
                            <span className="text-sm">Buscando...</span>
                          </div>
                        ) : updatedLead.email && updatedLead.email !== 'N/A' ? (
                          <div className="flex items-center">
                            <Mail size={14} className="mr-2 text-green-600" />
                            <p className="text-gray-900">{updatedLead.email}</p>
                            {updatedLead.emailVerified && (
                              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                Verificado
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">Email não disponível</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {updatedLead.profileUrl && (
                    <div className="mt-3">
                      <a
                        href={updatedLead.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors duration-200"
                      >
                        Ver Perfil LinkedIn
                      </a>
                    </div>
                  )}
                </div>

                {/* Informações da Empresa */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h4 className="text-lg font-semibold mb-3 text-blue-800">Informações da Empresa</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-blue-600">Nome:</span>
                      <p className="text-blue-900 font-semibold">{updatedLead.company}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-blue-600">Setor:</span>
                      <p className="text-blue-900">{updatedLead.industry}</p>
                    </div>
                    
                    {updatedLead.employeeCount && (
                      <div>
                        <span className="text-sm font-medium text-blue-600">Funcionários:</span>
                        <p className="text-blue-900">{updatedLead.employeeCount}</p>
                      </div>
                    )}
                    
                    {updatedLead.location && (
                      <div>
                        <span className="text-sm font-medium text-blue-600">Localização:</span>
                        <p className="text-blue-900">{extractCity(updatedLead.location)}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Website da empresa em linha separada para destaque */}
                  {(currentCompany?.companyUrl || updatedLead.workHistory?.[0]?.companyUrl) && (
                    <div className="mt-4 pt-3 border-t border-blue-200">
                      <span className="text-sm font-medium text-blue-600">Website da Empresa:</span>
                      <p className="mt-1">
                        <a 
                          href={currentCompany?.companyUrl || updatedLead.workHistory?.[0]?.companyUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors duration-200"
                        >
                          🌐 {(currentCompany?.companyUrl || updatedLead.workHistory?.[0]?.companyUrl || '').replace('https://www.', '').replace('http://www.', '')}
                        </a>
                      </p>
                    </div>
                  )}
                </div>

                {updatedLead.summary && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-2">Resumo Profissional</h4>
                    <p className="text-gray-700">{updatedLead.summary}</p>
                  </div>
                )}
                
                {/* Experiência Profissional */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800">Experiência Profissional</h4>
                  <div className="space-y-6">
                    {updatedLead.workHistory?.map((exp, index) => (
                    <div key={index} className="border-l-2 border-gray-200 pl-4">
                      <div className="font-medium text-gray-900">{exp.title}</div>
                      <div className="flex items-center text-gray-600">
                        <span>{exp.companyUrl ? (
                          <a href={exp.companyUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 hover:underline">{exp.company}</a>
                        ) : (
                          <span className="font-bold text-gray-800">{exp.company}</span>
                        )}</span>
                        {exp.companyUrl && (
                          <a
                            href={exp.companyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:text-blue-800"
                            title="Acessar site da empresa"
                          >
                            <Building2 size={14} />
                          </a>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mb-2">{exp.duration}</div>
                      {exp.location && (
                        <div className="text-sm text-gray-600 mb-1">
                          <Globe size={14} className="inline mr-1" />
                          {extractCity(exp.location)}
                        </div>
                      )}
                      {exp.description && (
                        <div className="text-sm text-gray-700 mt-2">{exp.description}</div>
                      )}
                    </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'other' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold mb-2">Informações Adicionais</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">LinkedIn Profile:</span>
                      <a
                        href={updatedLead.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                      >
                        View Profile
                      </a>
                    </div>
                    {updatedLead.email && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">Email:</span>
                        <span className="text-gray-800">{updatedLead.email}</span>
                      </div>
                    )}
                    {updatedLead.location && (
                      <div className="flex items-center text-gray-600 mb-2">
                        <MapPin size={16} className="mr-2" />
                        <span className="text-gray-800">{extractCity(updatedLead.location)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDataModal;