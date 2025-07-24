// src/components/LoadingSpinner.js
import React from 'react';

// Main Loading Spinner Component
const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  text = null,
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    white: 'border-white',
    green: 'border-green-600',
    red: 'border-red-600'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`}
      />
      {text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
};

// Card Skeleton Loader
export const CardSkeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-white rounded-lg shadow-soft border border-gray-200 p-6 ${className}`}>
    <div className="space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);

// Table Skeleton Loader
export const TableSkeleton = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={`animate-pulse bg-white rounded-lg shadow-soft border border-gray-200 overflow-hidden ${className}`}>
    {/* Header */}
    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }, (_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded w-24"></div>
        ))}
      </div>
    </div>
    
    {/* Rows */}
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }, (_, colIndex) => (
              <div key={colIndex} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Page Skeleton Loader
export const PageSkeleton = ({ className = '' }) => (
  <div className={`space-y-6 ${className}`}>
    {/* Header */}
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-96"></div>
    </div>
    
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
    
    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CardSkeleton className="h-64" />
      <CardSkeleton className="h-64" />
    </div>
  </div>
);

// Button Loading State
export const ButtonSpinner = ({ size = 'sm', className = '' }) => (
  <div
    className={`animate-spin rounded-full border-2 border-t-transparent border-current ${
      size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
    } ${className}`}
  />
);

// Form Skeleton Loader
export const FormSkeleton = ({ fields = 3, className = '' }) => (
  <div className={`animate-pulse space-y-4 ${className}`}>
    {Array.from({ length: fields }, (_, i) => (
      <div key={i} className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    ))}
    <div className="flex space-x-2 pt-4">
      <div className="h-10 bg-gray-200 rounded w-24"></div>
      <div className="h-10 bg-gray-200 rounded w-20"></div>
    </div>
  </div>
);

// List Item Skeleton
export const ListItemSkeleton = ({ className = '' }) => (
  <div className={`animate-pulse flex items-center space-x-4 p-4 ${className}`}>
    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
    <div className="h-8 w-16 bg-gray-200 rounded"></div>
  </div>
);

// Full Screen Loading
export const FullScreenLoading = ({ text = 'Loading...' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90">
    <div className="text-center">
      <LoadingSpinner size="xl" />
      <p className="mt-4 text-lg text-gray-600">{text}</p>
    </div>
  </div>
);

export default LoadingSpinner;