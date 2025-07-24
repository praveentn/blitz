// src/components/SQLExecutor.js
import React, { useState, useEffect } from 'react';
import {
  PlayIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError, handleApiSuccess } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const SQLExecutor = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dangerousWarning, setDangerousWarning] = useState(false);
  const [allowDangerous, setAllowDangerous] = useState(false);

  // Sample queries for quick testing
  const sampleQueries = [
    {
      name: 'View All Users',
      query: 'SELECT id, username, email, role, created_at FROM users LIMIT 10;'
    },
    {
      name: 'Recent Executions',
      query: 'SELECT id, execution_type, status, created_at FROM executions ORDER BY created_at DESC LIMIT 10;'
    },
    {
      name: 'Model Statistics',
      query: 'SELECT provider, COUNT(*) as count FROM models GROUP BY provider;'
    },
    {
      name: 'Table Schema',
      query: 'SELECT name FROM sqlite_master WHERE type=\'table\';'
    }
  ];

  useEffect(() => {
    // Check if query contains dangerous operations
    const dangerousPatterns = [
      /\bDROP\b/i,
      /\bDELETE\b/i,
      /\bTRUNCATE\b/i,
      /\bUPDATE\b/i,
      /\bINSERT\b/i,
      /\bALTER\b/i,
      /\bCREATE\b/i
    ];
    
    const isDangerous = dangerousPatterns.some(pattern => pattern.test(query));
    setDangerousWarning(isDangerous);
  }, [query]);

  const executeQuery = async () => {
    if (!query.trim()) {
      handleApiError({ message: 'Please enter a SQL query' });
      return;
    }

    if (dangerousWarning && !allowDangerous) {
      handleApiError({ 
        message: 'This query contains potentially dangerous operations. Please check the "Allow dangerous operations" box to proceed.' 
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Executing SQL query:', query);
      
      // Make the API call with proper error handling
      const response = await apiService.post('/admin/sql/execute', {
        sql: query.trim(),
        page: currentPage,
        page_size: 50,
        allow_dangerous: allowDangerous
      });

      console.log('SQL Response received:', response);

      // Handle the response data structure
      if (response) {
        // Check if response has the expected structure
        if (response.data || response.rows || response.columns) {
          setResults({
            data: response.data || response.rows || [],
            columns: response.columns || [],
            total_records: response.total_records || response.count || 0,
            execution_time: response.execution_time || 0,
            page: response.page || 1,
            total_pages: response.total_pages || 1
          });
          setTotalPages(response.total_pages || 1);
          
          const recordCount = response.total_records || response.count || (response.data || response.rows || []).length;
          handleApiSuccess(`Query executed successfully. ${recordCount} records found.`);
        } else if (response.success !== false) {
          // Handle cases where query was successful but returned no structured data
          setResults({
            data: [],
            columns: [],
            total_records: 0,
            execution_time: response.execution_time || 0,
            page: 1,
            total_pages: 1
          });
          handleApiSuccess('Query executed successfully. No records returned.');
        } else {
          throw new Error(response.error || 'Query execution failed');
        }
      } else {
        throw new Error('No response received from server');
      }
    } catch (error) {
      console.error('SQL Execution Error:', error);
      setResults(null);
      
      // Enhanced error handling
      if (error.response?.data?.error) {
        handleApiError({ message: error.response.data.error });
      } else if (error.message) {
        handleApiError({ message: error.message });
      } else {
        handleApiError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const changePage = async (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    
    setCurrentPage(newPage);
    setLoading(true);
    
    try {
      const response = await apiService.post('/admin/sql/execute', {
        sql: query.trim(),
        page: newPage,
        page_size: 50,
        allow_dangerous: allowDangerous
      });

      if (response && (response.data || response.rows)) {
        setResults(prev => ({
          ...prev,
          data: response.data || response.rows || [],
          page: response.page || newPage
        }));
      }
    } catch (error) {
      console.error('Pagination error:', error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const exportResults = () => {
    if (!results || !results.data || results.data.length === 0) {
      handleApiError({ message: 'No data to export' });
      return;
    }

    try {
      // Convert to CSV
      const headers = results.columns.join(',');
      const rows = results.data.map(row => 
        results.columns.map(col => {
          const value = row[col];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        }).join(',')
      );
      
      const csvContent = [headers, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query_results_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      handleApiSuccess('Results exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      handleApiError({ message: 'Export failed: ' + error.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">SQL Query Executor</h3>
          <p className="text-sm text-gray-500">Execute SQL queries with pagination and export support</p>
        </div>
        <button
          onClick={exportResults}
          disabled={!results || !results.data || results.data.length === 0}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Sample Queries */}
      <div className="card">
        <div className="card-header">
          <h4 className="text-md font-medium">Sample Queries</h4>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sampleQueries.map((sample, index) => (
              <button
                key={index}
                onClick={() => setQuery(sample.query)}
                className="text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">{sample.name}</div>
                <div className="text-sm text-gray-500 font-mono truncate">{sample.query}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Query Input */}
      <div className="card">
        <div className="card-body space-y-4">
          <div>
            <label htmlFor="sql-query" className="block text-sm font-medium text-gray-700">
              SQL Query
            </label>
            {dangerousWarning && (
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  id="allow-dangerous"
                  checked={allowDangerous}
                  onChange={(e) => setAllowDangerous(e.target.checked)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="allow-dangerous" className="text-sm text-red-600">
                  Allow dangerous operations
                </label>
              </div>
            )}
          </div>
          
          <textarea
            id="sql-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your SQL query here..."
            className="form-textarea h-32 font-mono text-sm"
            style={{ fontFamily: 'Monaco, Consolas, "Courier New", monospace' }}
          />
          
          {dangerousWarning && (
            <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Warning: Potentially dangerous operation detected</p>
                <p>This query contains operations that could modify your database. Please review carefully before executing.</p>
              </div>
            </div>
          )}
          
          <div className="flex justify-between">
            <button
              onClick={executeQuery}
              disabled={loading || !query.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" color="white" className="mr-2" />
                  Executing...
                </>
              ) : (
                <>
                  <PlayIcon className="h-5 w-5 mr-2" />
                  Execute Query
                </>
              )}
            </button>
            
            <button
              onClick={() => {
                setQuery('');
                setResults(null);
                setCurrentPage(1);
                setAllowDangerous(false);
              }}
              className="btn-secondary"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium text-gray-900">Query Results</h3>
              {results.execution_time && (
                <span className="text-sm text-gray-500">
                  Executed in {(results.execution_time * 1000).toFixed(2)}ms
                </span>
              )}
            </div>
            
            {results.total_records > 50 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Page {results.page || currentPage} of {results.total_pages || totalPages}
                  ({results.total_records} total records)
                </span>
                
                <div className="flex space-x-1">
                  <button
                    onClick={() => changePage(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => changePage(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                    className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {results.data && results.data.length > 0 ? (
            <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
              <table className="min-w-full table">
                <thead>
                  <tr className="table-header">
                    {results.columns.map((column, index) => (
                      <th
                        key={index}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {results.columns.map((column, colIndex) => (
                        <td
                          key={colIndex}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100"
                        >
                          {row[column] !== null && row[column] !== undefined ? (
                            String(row[column])
                          ) : (
                            <span className="text-gray-400 italic">NULL</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 bg-white border border-gray-200 rounded-lg">
              <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No results</h3>
              <p className="mt-1 text-sm text-gray-500">The query executed successfully but returned no results.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SQLExecutor;