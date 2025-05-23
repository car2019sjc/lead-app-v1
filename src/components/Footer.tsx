import React from 'react';

const Footer: React.FC = () => {
  return (
    <div className="mt-8 bg-white rounded-lg shadow-md p-4">
      <p className="text-sm text-gray-600 text-center">
        This application uses the Apollo.io API for lead searches
      </p>
    </div>
  );
};

export default Footer;