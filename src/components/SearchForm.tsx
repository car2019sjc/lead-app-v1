import React from 'react';
import { SearchParams } from '../types';
import { INDUSTRIES } from '../constants/industries';

interface SearchFormProps {
  searchParams: SearchParams;
  handleSearchParamChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleSearch: () => void;
  isSearching: boolean;
  isEnrichingData?: boolean;
}

const SearchForm: React.FC<SearchFormProps> = ({
  searchParams,
  handleSearchParamChange,
  handleSearch,
  isSearching,
  isEnrichingData = false
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Search Leads by Job Title</h2>
      
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
      
      <div className="mt-2">
        <button
          onClick={handleSearch}
          disabled={isSearching || isEnrichingData}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200"
        >
          {isSearching ? 'Searching...' : isEnrichingData ? 'Enriching Data...' : 'Search Leads'}
        </button>
      </div>
    </div>
  );
};

export default SearchForm;