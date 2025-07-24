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
      query: 'SELECT m.name, m.provider, m.cost_per_token, COUNT(e.id) as executions FROM models m LEFT JOIN executions e ON m.id = e.model_id GROUP BY m.id ORDER BY executions DESC;'
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
      const response = await apiService.get('/admin/tables');
      // Ensure tables is always an array
      const tablesData = response?.data || [];
      setTables(Array.isArray(tablesData) ? tablesData : []);
    } catch (error) {
      console.error('Error loading tables:', error);
      // Set to empty array on error to prevent map errors
      setTables([]);
    }
  };

  const loadTableSchema = async (tableName) => {
    try {
      setLoading(true);
      const response = await apiService.get(`/admin/table/${tableName}/schema`);
      setTableSchema(response?.data || []);
    } catch (error) {
      handleApiError(error);
      setTableSchema([]);
    } finally {
      setLoading(false);
    }
  };

  const loadQueryHistory = async () => {
    try {
      // This would load from a query history endpoint if implemented
      // For now, we'll use localStorage
      const history = localStorage.getItem('sqlQueryHistory');
      if (history) {
        setQueryHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading query history:', error);
      setQueryHistory([]);
    }
  };

  const saveToHistory = (query, success) => {
    try {
      const historyItem = {
        id: Date.now(),
        query: query,
        timestamp: new Date().toISOString(),
        success: success
      };
      
      const newHistory = [historyItem, ...queryHistory.slice(0, 19)]; // Keep last 20
      setQueryHistory(newHistory);
      localStorage.setItem('sqlQueryHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      handleApiError({ message: 'Please enter a SQL query' });
      return;
    }

    try {
      setLoading(true);
      setResults(null);
      
      const response = await apiService.post('/admin/sql', {
        query: query.trim(),
        page: currentPage,
        page_size: pageSize
      });

      setResults(response);
      saveToHistory(query, response.success);
      
      if (response.success) {
        handleApiSuccess('Query executed successfully');
      } else {
        handleApiError({ message: response.error || 'Query execution failed' });
      }
    } catch (error) {
      handleApiError(error);
      saveToHistory(query, false);
    } finally {
      setLoading(false);
    }
  };

  const exportResults = async (format) => {
    if (!results?.data) {
      handleApiError({ message: 'No results to export' });
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.post('/admin/sql/export', {
        query: query,
        format: format
      });

      if (response.success && response.download_url) {
        // Trigger download
        const link = document.createElement('a');
        link.href = response.download_url;
        link.download = response.filename || `results.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        handleApiSuccess(`Results exported as ${format.toUpperCase()}`);
      } else {
        handleApiError({ message: 'Export failed' });
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = async (tableName) => {
    setSelectedTable(tableName);
    if (tableName) {
      await loadTableSchema(tableName);
      setQuery(`SELECT * FROM ${tableName} LIMIT 100;`);
    }
  };

  const handleSampleQuery = (sampleQuery) => {
    setQuery(sampleQuery);
    setSelectedSample(sampleQuery);
  };

  const renderResults = () => {
    if (loading) {
      return (
        <div className="card">
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner />
            <span className="ml-2">Executing query...</span>
          </div>
        </div>
      );
    }

    if (!results) return null;

    if (!results.success) {
      return (
        <div className="card">
          <div className="flex items-center p-4 text-red-600 bg-red-50 rounded-lg">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            <div>
              <strong>Query Error:</strong> {results.error}
            </div>
          </div>
        </div>
      );
    }

    if (results.query_type === 'READ' && results.data) {
      return (
        <div className="card">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center">
              <InformationCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm text-gray-600">
                {results.total_rows} rows found • Execution time: {results.execution_time}s
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => exportResults('csv')}
                className="btn-secondary"
                disabled={loading}
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                CSV
              </button>
              <button
                onClick={() => exportResults('json')}
                className="btn-secondary"
                disabled={loading}
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                JSON
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {results.columns?.map((column, index) => (
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
                    {results.columns?.map((column, colIndex) => (
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

          {/* Pagination */}
          {results.total_pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-gray-600">
                Page {results.page} of {results.total_pages} 
                ({results.total_rows} total rows)
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setCurrentPage(results.page - 1);
                    executeQuery();
                  }}
                  disabled={results.page <= 1}
                  className="btn-secondary"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => {
                    setCurrentPage(results.page + 1);
                    executeQuery();
                  }}
                  disabled={results.page >= results.total_pages}
                  className="btn-secondary"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      );
    } else {
      // Non-SELECT queries (INSERT, UPDATE, DELETE, etc.)
      return (
        <div className="card">
          <div className="flex items-center p-4 text-green-600 bg-green-50 rounded-lg">
            <InformationCircleIcon className="h-5 w-5 mr-2" />
            <div>
              <strong>Success:</strong> {results.message} • 
              Execution time: {results.execution_time}s
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">SQL Executor</h2>
          <p className="text-gray-600">Execute SQL queries with pagination and export capabilities</p>
        </div>
      </div>

      {/* Query Input */}
      <div className="card">
        <div className="p-4 border-b">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SQL Query
          </label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your SQL query here..."
            className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ fontFamily: 'monospace' }}
          />
        </div>

        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={executeQuery}
              disabled={loading || !query.trim()}
              className="btn-primary"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Execute Query
            </button>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Page Size:</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            Use Ctrl+Enter to execute query
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sample Queries */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 p-4 border-b">Sample Queries</h3>
          <div className="p-4 space-y-2">
            {sampleQueries.map((sample, index) => (
              <button
                key={index}
                onClick={() => handleSampleQuery(sample.query)}
                className="w-full text-left p-2 text-sm hover:bg-gray-50 rounded border"
              >
                {sample.name}
              </button>
            ))}
          </div>
        </div>

        {/* Database Tables */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 p-4 border-b flex items-center">
            <TableCellsIcon className="h-5 w-5 mr-2" />
            Database Tables
          </h3>
          <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
            {Array.isArray(tables) && tables.length > 0 ? (
              tables.map((table, index) => (
                <button
                  key={index}
                  onClick={() => handleTableSelect(table.name)}
                  className={`w-full text-left p-2 text-sm hover:bg-gray-50 rounded border ${
                    selectedTable === table.name ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="font-medium">{table.name}</div>
                  <div className="text-xs text-gray-500">
                    {table.row_count} rows
                  </div>
                </button>
              ))
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                No tables found
              </div>
            )}
          </div>
        </div>

        {/* Query History */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 p-4 border-b">Query History</h3>
          <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
            {queryHistory.length > 0 ? (
              queryHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setQuery(item.query)}
                  className="w-full text-left p-2 text-sm hover:bg-gray-50 rounded border"
                >
                  <div className="truncate font-medium">
                    {item.query.substring(0, 50)}...
                  </div>
                  <div className="text-xs text-gray-500 flex justify-between">
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                    <span className={item.success ? 'text-green-500' : 'text-red-500'}>
                      {item.success ? '✓' : '✗'}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                No query history
              </div>
            )}
          </div>
        </div>

        {/* Table Schema */}
        {selectedTable && (
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 p-4 border-b flex items-center">
              <EyeIcon className="h-5 w-5 mr-2" />
              {selectedTable} Schema
            </h3>
            <div className="p-4">
              {tableSchema && Array.isArray(tableSchema) ? (
                <div className="space-y-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1">Column</th>
                        <th className="text-left py-1">Type</th>
                        <th className="text-left py-1">Null</th>
                        <th className="text-left py-1">Key</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableSchema.map((column, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-1 font-medium">{column.name}</td>
                          <td className="py-1 text-gray-600">{column.type}</td>
                          <td className="py-1 text-gray-600">{column.not_null ? 'No' : 'Yes'}</td>
                          <td className="py-1 text-gray-600">{column.primary_key ? 'PK' : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  {loading ? 'Loading schema...' : 'No schema available'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {renderResults()}
    </div>
  );
};

export default SQLExecutor;