import React from 'react';
import { LayoutGrid, List, ArrowUp, ArrowDown } from 'lucide-react';

const StudentListControls = ({ viewMode, onToggleView, sortBy, sortDirection, onSortChange }) => {

  const handleSortDirectionToggle = () => {
    onSortChange(sortBy, sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const handleSortByChange = (e) => {
    onSortChange(e.target.value, sortDirection);
  };

  const sortOptions = [
    { value: 'lastName', label: 'Last Name' },
    { value: 'firstName', label: 'First Name' },
    { value: 'email', label: 'Email' },
  ];

  return (
    <div className="flex items-center space-x-2">
      {/* Sorting Controls */}
      <div className="flex items-center space-x-1 p-2 rounded-md bg-gray-200">
        <label htmlFor="sortBy" className="sr-only">Sort By</label>
        <select
          id="sortBy"
          value={sortBy}
          onChange={handleSortByChange}
          className="bg-transparent text-sm font-medium border-none focus:ring-0 cursor-pointer"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button
          type="button" // Corrected: Set type to button
          onClick={handleSortDirectionToggle}
          className="p-1 rounded-md text-gray-700 hover:bg-gray-300 transition-colors duration-200"
          title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
        >
          {sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center space-x-1 p-1 rounded-md bg-gray-200">
        <button
          type="button" // Corrected: Set type to button
          onClick={() => onToggleView('grid')}
          className={`p-2 rounded-md transition-colors duration-200 ${
            viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-300'
          }`}
          title="Grid View"
        >
          <LayoutGrid size={20} />
        </button>
        <button
          type="button" // Corrected: Set type to button
          onClick={() => onToggleView('list')}
          className={`p-2 rounded-md transition-colors duration-200 ${
            viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-300'
          }`}
          title="Table View"
        >
          <List size={20} />
        </button>
      </div>
    </div>
  );
};

export default StudentListControls;