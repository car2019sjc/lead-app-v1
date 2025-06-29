import React, { useState } from 'react';
import { Lead } from '../types';
import { X, Briefcase, Globe, FileText, Building2 } from 'lucide-react';

interface LeadDataModalProps {
  lead: Lead;
  onClose: () => void;
}

const LeadDataModal: React.FC<LeadDataModalProps> = ({ lead, onClose }) => {
  const [activeTab, setActiveTab] = useState('experience');

  const tabs = [
    { id: 'experience', label: 'Experience', icon: Briefcase },
  ];

  // Get current company from work history
  const currentCompany = lead.workHistory?.find(job => 
    job.company.toLowerCase() === lead.company.toLowerCase()
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{lead.fullName}</h3>
            <div className="flex items-center text-sm text-gray-600">
              <span>{lead.jobTitle} at {currentCompany?.companyUrl ? (
                <a href={currentCompany.companyUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 hover:underline">{lead.company}</a>
              ) : (
                <span className="font-bold text-gray-800">{lead.company}</span>
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
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>

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
            {activeTab === 'experience' && (
              <div className="space-y-6">
                {lead.summary && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-2">Professional Summary</h4>
                    <p className="text-gray-700">{lead.summary}</p>
                  </div>
                )}
                
                <div className="space-y-6">
                  {lead.workHistory?.map((exp, index) => (
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
                          {exp.location}
                        </div>
                      )}
                      {exp.description && (
                        <div className="text-sm text-gray-700 mt-2">{exp.description}</div>
                      )}
                    </div>
                  ))}
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
                        href={lead.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                      >
                        View Profile
                      </a>
                    </div>
                    {lead.email && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">Email:</span>
                        <span className="text-gray-800">{lead.email}</span>
                      </div>
                    )}
                    {lead.location && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">Location:</span>
                        <span className="text-gray-800">{lead.location}</span>
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