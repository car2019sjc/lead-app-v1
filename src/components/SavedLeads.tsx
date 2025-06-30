import React, { useState } from 'react';
import { Lead } from '../types';
import UserInitials from './UserInitials';
import LeadDataModal from './LeadDataModal';
import ProfileAnalysisModal from './ProfileAnalysisModal';
import { extractCity } from '../utils/stringUtils';

interface SavedLeadsProps {
  savedLeads: Lead[];
  deleteSavedLead: (leadId: string) => void;
  exportLeads: () => void;
  clearAllSavedLeads?: () => void;
}

const SavedLeads: React.FC<SavedLeadsProps> = ({
  savedLeads,
  deleteSavedLead,
  exportLeads,
  clearAllSavedLeads
}) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  const handleLeadDataClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDataModal(true);
  };

  const handleAnalysisClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowAnalysisModal(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Saved Leads ({savedLeads.length})</h2>
        {clearAllSavedLeads && savedLeads.length > 0 && (
          <button
            onClick={clearAllSavedLeads}
            className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
          >
            Limpar Tudo
          </button>
        )}
      </div>
      
      {savedLeads.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No leads saved yet. Search and validate leads to add them here.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name / Job Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {savedLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <UserInitials firstName={lead.firstName} lastName={lead.lastName} />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{lead.fullName || 'Name not available'}</div>
                        <div className="text-sm text-gray-500">{lead.jobTitle || 'Job title not available'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 text-sm">
                    {lead.companyUrl ? (
                      <a href={lead.companyUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 hover:underline">{lead.company}</a>
                    ) : (
                      <span className="font-bold text-gray-800">{lead.company}</span>
                    )}
                    <div className="text-xs text-gray-400">{lead.industry}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{extractCity(lead.location) || 'Location not available'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    {lead.profileUrl && (
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => handleLeadDataClick(lead)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors duration-200"
                        >
                          Lead Data
                        </button>
                        <button
                          onClick={() => handleAnalysisClick(lead)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors duration-200"
                        >
                          Análise
                        </button>
                        <a 
                          href={lead.profileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200"
                        >
                          Profile
                        </a>
                        <button
                          onClick={() => deleteSavedLead(lead.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors duration-200"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDataModal && selectedLead && (
        <LeadDataModal
          lead={selectedLead}
          onClose={() => setShowDataModal(false)}
        />
      )}

      {showAnalysisModal && selectedLead && (
        <ProfileAnalysisModal
          lead={selectedLead}
          onClose={() => setShowAnalysisModal(false)}
        />
      )}
    </div>
  );
};

export default SavedLeads;