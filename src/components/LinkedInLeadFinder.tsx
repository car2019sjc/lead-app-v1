import React, { useState, useEffect } from 'react';
import { searchApolloLeads } from '../services/apollo';
import { Lead, SearchParams, Notification as NotificationType } from '../types';
import SearchForm from './SearchForm';
import SearchResults from './SearchResults';
import SavedLeads from './SavedLeads';
import Notification from './Notification';
import TabNavigation from './TabNavigation';
import Footer from './Footer';

const LinkedInLeadFinder: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('search');
  const [searchParams, setSearchParams] = useState<SearchParams>({
    jobTitle: '',
    location: '',
    industry: '',
    count: 10
  });
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [savedLeads, setSavedLeads] = useState<Lead[]>([]);
  const [notification, setNotification] = useState<NotificationType>({ 
    show: false, 
    message: '', 
    type: '' 
  });

  // Load saved leads from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('savedLeads');
    if (savedData) {
      try {
        setSavedLeads(JSON.parse(savedData));
      } catch (error) {
        console.error('Error loading saved leads:', error);
      }
    }
  }, []);

  // Save leads to localStorage when they change
  useEffect(() => {
    localStorage.setItem('savedLeads', JSON.stringify(savedLeads));
  }, [savedLeads]);

  // Show temporary notification
  const showNotification = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 5000);
  };

  // Handle search parameter changes
  const handleSearchParamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Search for leads in Apollo
  const handleSearch = async () => {
    if (!searchParams.jobTitle) {
      showNotification('Please enter at least a job title to search', 'error');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const results = await searchApolloLeads(
        searchParams.jobTitle, 
        searchParams.location, 
        searchParams.industry, 
        searchParams.count
      );
      
      setSearchResults(results);
      
      if (results.length > 0) {
        showNotification(`${results.length} leads found!`);
      } else {
        showNotification('No leads found with these criteria', 'warning');
      }
    } catch (error) {
      showNotification(`Error searching for leads: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle lead selection
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => {
      if (prev.includes(leadId)) {
        return prev.filter(id => id !== leadId);
      } else {
        return [...prev, leadId];
      }
    });
  };

  // Select all leads
  const selectAllLeads = () => {
    if (selectedLeads.length === searchResults.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(searchResults.map(lead => lead.id));
    }
  };

  // Save selected leads
  const saveSelectedLeads = () => {
    if (selectedLeads.length === 0) {
      showNotification('Select at least one lead to save', 'error');
      return;
    }

    const selectedLeadsData = searchResults.filter(lead => selectedLeads.includes(lead.id));
    setSavedLeads(prev => {
      // Adiciona apenas leads que ainda não estão salvos (por id)
      const prevIds = new Set(prev.map(lead => lead.id));
      const novosLeads = selectedLeadsData.filter(lead => !prevIds.has(lead.id));
      if (novosLeads.length === 0) {
        showNotification('Todos os leads selecionados já estão salvos.', 'warning');
        return prev;
      }
      showNotification(`${novosLeads.length} lead(s) salvo(s) com sucesso!`);
      return [...novosLeads, ...prev];
    });
    setSelectedLeads([]);
    setActiveTab('saved');
  };

  // Delete saved lead
  const deleteSavedLead = (leadId: string) => {
    setSavedLeads(prev => prev.filter(lead => lead.id !== leadId));
    showNotification('Lead removed successfully');
  };

  // Export leads as CSV
  const exportLeads = () => {
    if (savedLeads.length === 0) {
      showNotification('No leads to export', 'warning');
      return;
    }

    // Create CSV header
    const headers = ['Name', 'Job Title', 'Company', 'Location', 'Email', 'LinkedIn URL'];
    
    // Create CSV rows
    const rows = savedLeads.map(lead => [
      lead.fullName,
      lead.jobTitle,
      lead.company,
      lead.location,
      lead.email || '',
      lead.profileUrl || ''
    ]);
    
    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `linkedin_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Leads exported successfully!');
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-center text-gray-800">LinkedIn Lead Finder</h1>
        <p className="text-center text-gray-600 mt-2">
          Real integration with Apollo.io API for lead searches
        </p>
      </header>

      <Notification notification={notification} />

      <TabNavigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        savedLeadsCount={savedLeads.length} 
      />

      {activeTab === 'search' && (
        <div>
          <SearchForm 
            searchParams={searchParams}
            handleSearchParamChange={handleSearchParamChange}
            handleSearch={handleSearch}
            isSearching={isSearching}
          />

          {searchResults.length > 0 && (
            <SearchResults 
              searchResults={searchResults}
              selectedLeads={selectedLeads}
              toggleLeadSelection={toggleLeadSelection}
              selectAllLeads={selectAllLeads}
              saveSelectedLeads={saveSelectedLeads}
            />
          )}
        </div>
      )}

      {activeTab === 'saved' && (
        <SavedLeads 
          savedLeads={savedLeads}
          deleteSavedLead={deleteSavedLead}
          exportLeads={exportLeads}
        />
      )}

      <Footer />
    </div>
  );
};

export default LinkedInLeadFinder;