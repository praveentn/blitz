// src/components/SQLExecutor.js
import React, { useState, useEffect } from 'react';
import {
  PlayIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError, handleApiSuccess } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const SQLExecutor = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [queryHistory, setQueryHistory] = useState([]);
  const [selectedSample, setSelectedSample] = useState('');
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableSchema, setTableSchema] = useState(null);

  const sampleQueries = [
    {
      name: 'List all users',
      query: 'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10;'
    },
    {
      name: 'Recent executions',
      query: 'SELECT id, status, started_at, completed_at FROM executions ORDER BY created_at DESC LIMIT 20;'
    },
    {
      name: 'Models with costs',
      query: 'SELECT m.name, m.provider, m.cost_per_1k_tokens, COUNT(e.id) as executions FROM models m LEFT JOIN executions e ON m.id = e.model_id GROUP BY m.id ORDER BY executions DESC;'
    },
    {
      name: 'Cost summary by user',
      query: 'SELECT u.username, u.email, SUM(c.amount) as total_cost, COUNT(e.id) as executions FROM users u LEFT JOIN executions e ON u.id = e.user_id LEFT JOIN costs c ON e.id = c.execution_id GROUP BY u.id ORDER BY total_cost DESC;'
    },
    {
      name: 'Database schema',
      query: 'SELECT name FROM sqlite_master WHERE type="table" ORDER BY name;'
    }
  ];

  useEffect(() => {
    loadTables();
    loadQueryHistory();
  }, []);

  const loadTables = async () => {
    try {
      const response = await apiService.admin.getTables();
      setTables(response.data || []);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const loadTableSchema = async (tableName) => {
    try {
      const response = await apiService.admin.getTableSchema(tableName);
      setTableSchema(response.data);
    } catch (error) {
      handleApiError(error);
      setTableSchema(null);
    }
  };

  const loadQueryHistory = () => {
    const history = JSON.parse(localStorage.getItem('sqlQueryHistory') || '[]');
    setQueryHistory(history.slice(0, 10)); // Keep last 10 queries
  };

  const saveToHistory = (queryText) => {
    const history = JSON.parse(localStorage.getItem('sqlQueryHistory') || '[]');
    const newHistory = [queryText, ...history.filter(q => q !== queryText)].slice(0, 10);
    localStorage.setItem('sqlQueryHistory', JSON.stringify(newHistory));
    setQueryHistory(newHistory);
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      handleApiError({ message: 'Please enter a SQL query' });
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.admin.executeSQL(query, currentPage, pageSize);
      
      if (response.data) {
        setResults(response.data);
        saveToHistory(query.trim());
        handleApiSuccess(`Query executed successfully! ${response.data.rows?.length || 0} rows returned.`);
      } else {
        setResults(null);
        handleApiError({ message: 'No data returned from query' });
      }
    } catch (error) {
      handleApiError(error);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (query.trim()) {
      executeQuery();
    }
  };

  const exportResults = (format) => {
    if (!results?.rows?.length) {
      handleApiError({ message: 'No data to export' });
      return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'csv') {
      const headers = results.columns.join(',');
      const rows = results.rows.map(row => 
        results.columns.map(col => {
          const value = row[col];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      );
      content = [headers, ...rows].join('\n');
      filename = 'query_results.csv';
      mimeType = 'text/csv';
    } else if (format === 'json') {
      content = JSON.stringify(results.rows, null, 2);
      filename = 'query_results.json';
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    handleApiSuccess(`Results exported as ${format.toUpperCase()}`);
  };

  const isDangerousQuery = (queryText) => {
    const dangerous = ['DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'UPDATE'];
    return dangerous.some(keyword => 
      queryText.toUpperCase().includes(keyword)
    );
  };

  const renderResults = () => {
    if (!results) return null;

    if (results.error) {
      return (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Query Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <pre className="whitespace-pre-wrap">{results.error}</pre>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!results.rows || results.rows.length === 0) {
      return (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">No Results</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Query executed successfully but returned no rows.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-4">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="text-lg font-medium text-gray-900">Query Results</h3>
            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {results.total_rows || results.rows.length} rows
            </span>
            {results.execution_time && (
              <span className="ml-2 text-sm text-gray-500">
                Executed in {results.execution_time}ms
              </span>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => exportResults('csv')}
              className="btn-secondary text-sm"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
              CSV
            </button>
            <button
              onClick={() => exportResults('json')}
              className="btn-secondary text-sm"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
              JSON
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {results.columns?.map((column, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {results.columns?.map((column, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-4 py-3 text-sm text-gray-900 font-mono max-w-xs truncate"
                        title={String(row[column])}
                      >
                        {row[column] === null ? (
                          <span className="text-gray-400 italic">NULL</span>
                        ) : (
                          String(row[column])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {results.total_rows > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-700">
                Showing {Math.min((currentPage - 1) * pageSize + 1, results.total_rows)} to{' '}
                {Math.min(currentPage * pageSize, results.total_rows)} of {results.total_rows} results
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Previous
              </button>
              
              <span className="text-sm text-gray-700">
                Page {currentPage} of {Math.ceil(results.total_rows / pageSize)}
              </span>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= Math.ceil(results.total_rows / pageSize)}
                className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Query Input Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">SQL Query Executor</h2>
          <div className="flex items-center space-x-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="form-select text-sm"
            >
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={200}>200 rows</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          {/* Sample Queries */}
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sample Queries
            </label>
            <select
              value={selectedSample}
              onChange={(e) => {
                setSelectedSample(e.target.value);
                if (e.target.value) {
                  setQuery(e.target.value);
                }
              }}
              className="form-select text-sm w-full"
            >
              <option value="">Select sample query...</option>
              {sampleQueries.map((sample, index) => (
                <option key={index} value={sample.query}>
                  {sample.name}
                </option>
              ))}
            </select>

            {/* Query History */}
            {queryHistory.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recent Queries
                </label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {queryHistory.map((historyQuery, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(historyQuery)}
                      className="block w-full text-left text-xs text-gray-600 hover:text-blue-600 truncate"
                      title={historyQuery}
                    >
                      {historyQuery.substring(0, 40)}...
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Query Area */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                SQL Query
              </label>
              {isDangerousQuery(query) && (
                <div className="flex items-center text-red-600">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  <span className="text-xs">Dangerous operation detected</span>
                </div>
              )}
            </div>
            
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your SQL query here..."
              className="form-textarea w-full h-32 font-mono text-sm"
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                  executeQuery();
                }
              }}
            />
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                Press Ctrl+Enter to execute
              </span>
              <button
                onClick={executeQuery}
                disabled={loading || !query.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <PlayIcon className="h-4 w-4 mr-2" />
                )}
                Execute Query
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Database Browser */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Database Browser</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tables
            </label>
            <select
              value={selectedTable}
              onChange={(e) => {
                setSelectedTable(e.target.value);
                if (e.target.value) {
                  loadTableSchema(e.target.value);
                }
              }}
              className="form-select w-full"
            >
              <option value="">Select a table...</option>
              {tables.map((table, index) => (
                <option key={index} value={table}>
                  {table}
                </option>
              ))}
            </select>
            
            {selectedTable && (
              <button
                onClick={() => setQuery(`SELECT * FROM ${selectedTable} LIMIT 100;`)}
                className="mt-2 btn-secondary text-sm w-full"
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                Browse Table Data
              </button>
            )}
          </div>
          
          {tableSchema && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schema for {selectedTable}
              </label>
              <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left font-medium text-gray-700 pb-2">Column</th>
                      <th className="text-left font-medium text-gray-700 pb-2">Type</th>
                      <th className="text-left font-medium text-gray-700 pb-2">Null</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableSchema.map((column, index) => (
                      <tr key={index} className="border-t border-gray-100">
                        <td className="py-1 font-mono text-gray-900">{column.name}</td>
                        <td className="py-1 text-gray-600">{column.type}</td>
                        <td className="py-1 text-gray-600">{column.notnull ? 'No' : 'Yes'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {renderResults()}
    </div>
  );
};

export default SQLExecutor;