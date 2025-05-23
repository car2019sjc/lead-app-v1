import React from 'react';

interface UserInitialsProps {
  firstName: string;
  lastName: string;
}

const UserInitials: React.FC<UserInitialsProps> = ({ firstName, lastName }) => {
  const getInitials = () => {
    const firstInitial = firstName && firstName[0] ? firstName[0].toUpperCase() : '';
    const lastInitial = lastName && lastName[0] ? lastName[0].toUpperCase() : '';
    return `${firstInitial}${lastInitial}`;
  };

  return (
    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
      {getInitials() || '??'}
    </div>
  );
};

export default UserInitials;