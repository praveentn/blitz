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
      query: 'SELECT model_type, COUNT(*) as count FROM models GROUP BY model_type;'
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
      handleApiError({ message: 'This query contains potentially dangerous operations. Please check the "Allow dangerous operations" box to proceed.' });
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.admin.sql.execute(
        query,
        currentPage,
        100,
        allowDangerous
      );
      
      setResults(response.data);
      setTotalPages(response.data.pagination?.total_pages || 1);
      handleApiSuccess('Query executed successfully');
    } catch (error) {
      handleApiError(error, 'Failed to execute query');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const changePage = (newPage) => {
    setCurrentPage(newPage);
    // Re-execute query with new page
    executeQuery();
  };

  const exportResults = async (format = 'csv') => {
    if (!query.trim() || !results) {
      handleApiError({ message: 'No results to export' });
      return;
    }

    try {
      const response = await apiService.admin.sql.export(query, format);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `query_results.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      handleApiSuccess(`Results exported as ${format.toUpperCase()}`);
    } catch (error) {
      handleApiError(error, 'Failed to export results');
    }
  };

  const loadSampleQuery = (sampleQuery) => {
    setQuery(sampleQuery.query);
    setResults(null);
    setCurrentPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-medium text-gray-900">SQL Executor</h2>
          <p className="text-sm text-gray-600">Execute SQL queries and view results with pagination</p>
        </div>
        
        {results && (
          <div className="flex space-x-2">
            <button
              onClick={() => exportResults('csv')}
              className="btn-secondary text-sm"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
              Export CSV
            </button>
            <button
              onClick={() => exportResults('json')}
              className="btn-secondary text-sm"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
              Export JSON
            </button>
          </div>
        )}
      </div>

      {/* Sample Queries */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Sample Queries</h3>
        <div className="flex flex-wrap gap-2">
          {sampleQueries.map((sample, index) => (
            <button
              key={index}
              onClick={() => loadSampleQuery(sample)}
              className="btn-secondary text-xs"
            >
              {sample.name}
            </button>
          ))}
        </div>
      </div>

      {/* Query Input */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label htmlFor="sql-query" className="block text-sm font-medium text-gray-700">
            SQL Query
          </label>
          <div className="flex items-center space-x-4">
            {dangerousWarning && (
              <div className="flex items-center space-x-2">
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
            
            {results.pagination && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Page {results.pagination.page} of {results.pagination.total_pages}
                  ({results.pagination.total_records} total records)
                </span>
                
                <div className="flex space-x-1">
                  <button
                    onClick={() => changePage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => changePage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {results.data && results.data.length > 0 ? (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {results.columns.map((column, index) => (
                      <th
                        key={index}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
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
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {row[column] !== null ? String(row[column]) : (
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
            <div className="text-center py-8">
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