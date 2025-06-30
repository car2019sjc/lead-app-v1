import React from 'react';
import { Lead } from '../types';
import UserInitials from './UserInitials';
import { Users } from 'lucide-react';
import { extractCity } from '../utils/stringUtils';

interface SearchResultsProps {
  searchResults: Lead[];
  selectedLeads: string[];
  toggleLeadSelection: (leadId: string) => void;
  selectAllLeads: () => void;
  saveSelectedLeads: () => void;
  isEnrichingData?: boolean;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  searchResults,
  selectedLeads,
  toggleLeadSelection,
  selectAllLeads,
  saveSelectedLeads,
  isEnrichingData = false
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
              {isEnrichingData && (
          <div className="mb-4 p-3 bg-blue-50 rounded-md flex items-center">
            <Users className="text-blue-500 mr-2 animate-spin" size={16} />
            <p className="text-blue-700 text-sm">
              Enriquecendo dados de funcionários com IA...
            </p>
          </div>
        )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h2 className="text-xl font-semibold">Search Results ({searchResults.length})</h2>
        <div className="flex space-x-2">
          <button
            onClick={selectAllLeads}
            className="py-1 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md focus:outline-none transition-colors duration-200"
          >
            {selectedLeads.length === searchResults.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={saveSelectedLeads}
            disabled={selectedLeads.length === 0}
            className="py-1 px-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md focus:outline-none disabled:opacity-50 transition-colors duration-200"
          >
            Save Selected ({selectedLeads.length})
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 w-10">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name / Job Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                FTEs
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Profile
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {searchResults.map(lead => (
              <tr key={lead.id} className={`hover:bg-gray-50 ${selectedLeads.includes(lead.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedLeads.includes(lead.id)}
                    onChange={() => toggleLeadSelection(lead.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <UserInitials firstName={lead.firstName} lastName={lead.lastName} />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{lead.fullName || 'Name not available'}</div>
                      <div className="text-sm text-gray-500">{lead.jobTitle || 'Job title not available'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">{lead.company || 'N/A'}</div>
                  <div className="text-xs text-gray-500">{lead.industry || 'Industry not specified'}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center text-sm text-gray-900">
                    <Users 
                      size={14} 
                      className={`mr-2 ${
                        isEnrichingData && (!lead.employeeCount || lead.employeeCount === 'N/A') 
                          ? 'text-blue-400 animate-spin' 
                          : 'text-gray-400'
                      }`} 
                    />
                    {isEnrichingData && (!lead.employeeCount || lead.employeeCount === 'N/A') 
                      ? 'Buscando...' 
                      : (lead.employeeCount || 'N/A')
                    }
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">{extractCity(lead.location) || 'Location not available'}</div>
                </td>
                <td className="px-4 py-3">
                  {lead.profileUrl ? (
                    <a 
                      href={lead.profileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                    >
                      View Profile
                    </a>
                  ) : (
                    <span className="text-sm text-gray-500">Not available</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SearchResults;