import React, { useState } from 'react';
import { X, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { searchApolloLeads } from '../services/apollo';
import { Lead } from '../types';
import LeadDataModal from './LeadDataModal';
import { INDUSTRIES } from '../constants/industries';

interface ApplyLeadOnlineProps {
  onClose: () => void;
}

const ApplyLeadOnline: React.FC<ApplyLeadOnlineProps> = ({ onClose }) => {
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [searchResults, setSearchResults] = useState<Lead[]>([]);
  const [qualifiedLeads, setQualifiedLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isQualifying, setIsQualifying] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const [searchParams, setSearchParams] = useState({
    jobTitle: '',
    location: '',
    industry: INDUSTRIES[0],
    count: 10
  });

  const addDebugLog = (message: string) => {
    console.log(`[Debug] ${message}`);
    setDebugLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  const handleSearchParamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = async () => {
    if (!searchParams.jobTitle) {
      setError('Please enter a job title to search');
      return;
    }

    setIsSearching(true);
    setError('');
    setSuccess(false);
    setSearchResults([]);
    setQualifiedLeads([]);
    addDebugLog('Starting search...');

    try {
      addDebugLog(`Search params: ${JSON.stringify(searchParams)}`);
      const results = await searchApolloLeads(
        searchParams.jobTitle,
        searchParams.location,
        searchParams.industry,
        searchParams.count
      );

      addDebugLog(`Found ${results.length} leads`);
      setSearchResults(results);
      setSuccess(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`Search error: ${errorMessage}`);
      setError('Error searching for leads. Please try again.');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadModal(true);
  };

  const handleQualifyLeads = () => {
    addDebugLog('Starting lead qualification...');
    
    if (searchResults.length === 0) {
      addDebugLog('No leads to qualify');
      setError('No leads to qualify');
      return;
    }

    setIsQualifying(true);

    try {
      addDebugLog(`Processing ${searchResults.length} leads for qualification`);
      
      // Apply qualification criteria
      const qualified = searchResults.filter(lead => {
        const checks = {
          basicInfo: Boolean(lead.firstName && lead.lastName && lead.jobTitle && lead.company),
          email: Boolean(lead.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) && lead.emailVerified),
          linkedin: Boolean(lead.profileUrl && lead.profileUrl.toLowerCase().includes('linkedin.com/in/')),
          company: Boolean(lead.company && lead.industry && lead.employeeCount !== 'N/A'),
          location: Boolean(lead.location && lead.location !== 'Location not available'),
          workHistory: Boolean(lead.workHistory && lead.workHistory.length > 0)
        };

        addDebugLog(`Qualifying lead ${lead.id} (${lead.fullName}):
          - Basic info: ${checks.basicInfo}
          - Email: ${checks.email}
          - LinkedIn: ${checks.linkedin}
          - Company: ${checks.company}
          - Location: ${checks.location}
          - Work history: ${checks.workHistory}
        `);

        return checks.basicInfo && checks.email && checks.linkedin && checks.company && checks.location && checks.workHistory;
      });

      addDebugLog(`Found ${qualified.length} qualified leads`);
      setQualifiedLeads(qualified);
      setSuccess(true);
      setError('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`Qualification error: ${errorMessage}`);
      setError('Error qualifying leads. Please try again.');
      console.error('Qualification error:', error);
    } finally {
      setIsQualifying(false);
    }
  };

  const displayedLeads = qualifiedLeads.length > 0 ? qualifiedLeads : searchResults;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Apply Lead Online</h2>
            <p className="text-sm text-gray-600">Search and validate leads from Apollo.io</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Search Leads</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-4">
                <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  id="jobTitle"
                  name="jobTitle"
                  value={searchParams.jobTitle}
                  onChange={handleSearchParamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="E.g., React Developer, Marketing Manager"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={searchParams.location}
                  onChange={handleSearchParamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="E.g., New York, London"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <select
                  id="industry"
                  name="industry"
                  value={searchParams.industry}
                  onChange={handleSearchParamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {INDUSTRIES.map((industry, index) => (
                    <option key={index} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Leads
                </label>
                <input
                  type="number"
                  id="count"
                  name="count"
                  min="1"
                  max="100"
                  value={searchParams.count}
                  onChange={handleSearchParamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter number of leads to search"
                />
              </div>
            </div>
            
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Search size={20} />
                {isSearching ? 'Searching...' : 'Search Leads'}
              </button>
              
              {searchResults.length > 0 && (
                <button
                  onClick={handleQualifyLeads}
                  disabled={isQualifying}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200"
                >
                  {isQualifying ? 'Qualifying...' : 'Quality Leads'}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 rounded-md flex items-center">
              <AlertCircle className="text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && displayedLeads.length > 0 && (
            <div className="mb-4 p-4 bg-green-50 rounded-md flex items-center">
              <CheckCircle2 className="text-green-500 mr-2" />
              <p className="text-green-700">
                {qualifiedLeads.length > 0
                  ? `Found ${qualifiedLeads.length} qualified leads out of ${searchResults.length} total leads!`
                  : `Found ${searchResults.length} leads matching your criteria!`}
              </p>
            </div>
          )}

          {displayedLeads.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                {qualifiedLeads.length > 0 ? 'Qualified' : ''} Search Results ({displayedLeads.length})
              </h2>
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayedLeads.map(lead => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                              {lead.firstName[0]}{lead.lastName[0]}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{lead.fullName}</div>
                              <div className="text-sm text-gray-500">{lead.jobTitle}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{lead.company}</div>
                          <div className="text-xs text-gray-500">{lead.industry}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{lead.location}</div>
                        </td>
                        <td className="px-4 py-3 space-x-2">
                          <button
                            onClick={() => handleLeadClick(lead)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View Details
                          </button>
                          {lead.profileUrl && (
                            <a
                              href={lead.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              LinkedIn
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {debugLogs.length > 0 && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <h3 className="text-lg font-semibold mb-2">Debug Logs</h3>
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {debugLogs.join('\n')}
              </pre>
            </div>
          )}
        </div>
      </div>

      {showLeadModal && selectedLead && (
        <LeadDataModal
          lead={selectedLead}
          onClose={() => setShowLeadModal(false)}
        />
      )}
    </div>
  );
};

export default ApplyLeadOnline;