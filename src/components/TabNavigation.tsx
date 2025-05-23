import React from 'react';

interface TabNavigationProps {
  activeTab: 'search' | 'saved';
  setActiveTab: (tab: 'search' | 'saved') => void;
  savedLeadsCount: number;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, setActiveTab, savedLeadsCount }) => {
  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <div className="flex overflow-x-auto">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-3 px-4 text-center font-medium border-b-2 transition-colors duration-200 ${
            activeTab === 'search' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Search Leads
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex-1 py-3 px-4 text-center font-medium border-b-2 transition-colors duration-200 ${
            activeTab === 'saved' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Saved Leads ({savedLeadsCount})
        </button>
      </div>
    </div>
  );
};

export default TabNavigation;