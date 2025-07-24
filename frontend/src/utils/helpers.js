// src/utils/helpers.js

/**
 * Format currency values
 */
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(amount);
};

/**
 * Format numbers with proper thousand separators
 */
export const formatNumber = (number, decimals = 0) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

/**
 * Format date relative to now (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date) => {
  const now = new Date();
  const inputDate = new Date(date);
  const diffInSeconds = Math.floor((now - inputDate) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return inputDate.toLocaleDateString();
};

/**
 * Format execution status with proper styling
 */
export const getStatusBadge = (status) => {
  const statusConfig = {
    completed: { class: 'status-badge status-success', text: 'Completed' },
    running: { class: 'status-badge status-info', text: 'Running' },
    failed: { class: 'status-badge status-error', text: 'Failed' },
    pending: { class: 'status-badge status-warning', text: 'Pending' },
    cancelled: { class: 'status-badge status-gray', text: 'Cancelled' },
  };
  
  return statusConfig[status?.toLowerCase()] || statusConfig.pending;
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate random ID
 */
export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Deep clone object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Debounce function calls
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Check if user has permission for action
 */
export const hasPermission = (user, action) => {
  if (!user) return false;
  
  const permissions = {
    admin: ['read', 'write', 'delete', 'admin'],
    business_user: ['read', 'write'],
    basic_user: ['read'],
  };
  
  return permissions[user.role]?.includes(action) || false;
};

/**
 * Format JSON for display
 */
export const formatJSON = (obj, indent = 2) => {
  try {
    return JSON.stringify(obj, null, indent);
  } catch (error) {
    return 'Invalid JSON';
  }
};

/**
 * Parse JSON safely
 */
export const parseJSON = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    return fallback;
  }
};

/**
 * Calculate execution time display
 */
export const formatExecutionTime = (startTime, endTime) => {
  if (!startTime) return 'N/A';
  
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const durationMs = end - start;
  
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  if (durationMs < 3600000) return `${(durationMs / 60000).toFixed(1)}m`;
  
  return `${(durationMs / 3600000).toFixed(1)}h`;
};

/**
 * Get file size in human readable format
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Color utilities for consistent theming
 */
export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe', 
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  }
};

/**
 * Class name utility function
 */
export const classNames = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Download data as file
 */
export const downloadAsFile = (data, filename, type = 'application/json') => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Format code for syntax highlighting
 */
export const formatCode = (code, language = 'javascript') => {
  // This would integrate with a syntax highlighter
  return {
    code,
    language,
    formatted: code, // Placeholder for actual syntax highlighting
  };
};

/**
 * Validate SQL query for basic safety
 */
export const validateSQLQuery = (query) => {
  const dangerousPatterns = [
    /\bDROP\s+TABLE\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bTRUNCATE\b/i,
    /\bUPDATE\s+.*\s+SET\b/i,
    /\bINSERT\s+INTO\b/i,
    /\bALTER\s+TABLE\b/i,
    /\bCREATE\s+TABLE\b/i,
  ];
  
  const warnings = [];
  const errors = [];
  
  // Check for dangerous operations
  dangerousPatterns.forEach(pattern => {
    if (pattern.test(query)) {
      warnings.push('Query contains potentially dangerous operations');
    }
  });
  
  // Check for basic syntax
  if (!query.trim()) {
    errors.push('Query cannot be empty');
  }
  
  if (!query.trim().toLowerCase().startsWith('select') && 
      !query.trim().toLowerCase().startsWith('show') &&
      !query.trim().toLowerCase().startsWith('describe')) {
    warnings.push('Non-SELECT queries may modify data');
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    isDangerous: warnings.length > 0,
  };
};