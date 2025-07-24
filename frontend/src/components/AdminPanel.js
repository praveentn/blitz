// src/components/AdminPanel.js - Complete implementation with all features
import React, { useState, useEffect } from 'react';
import {
  CogIcon,
  ServerIcon,
  UsersIcon,
  HeartIcon,
  DocumentChartBarIcon,
  CommandLineIcon,
  TableCellsIcon,
  EyeIcon,
  PencilIcon,
  UserCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';
import { apiService, handleApiError, handleApiSuccess } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('sql');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'sql', name: 'SQL Executor', icon: CommandLineIcon },
    { id: 'database', name: 'DB Browser', icon: ServerIcon },
    { id: 'users', name: 'User Management', icon: UsersIcon },
    { id: 'health', name: 'System Health', icon: HeartIcon },
    { id: 'audit', name: 'Audit Logs', icon: DocumentChartBarIcon }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center">
          <CogIcon className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-600">System administration and management tools</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <nav className="px-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <IconComponent className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'sql' && <SQLExecutorTab />}
        {activeTab === 'database' && <DatabaseBrowserTab />}
        {activeTab === 'users' && <UserManagementTab />}
        {activeTab === 'health' && <SystemHealthTab />}
        {activeTab === 'audit' && <AuditLogsTab />}
      </div>
    </div>
  );
};

// SQL Executor Tab Component
const SQLExecutorTab = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [allowDangerous, setAllowDangerous] = useState(false);
  const [history, setHistory] = useState([]);

  const sampleQueries = [
    'SELECT * FROM users LIMIT 10;',
    'SELECT COUNT(*) as total_executions FROM executions;',
    'SELECT status, COUNT(*) as count FROM executions GROUP BY status;',
    'SELECT name, created_at FROM workflows ORDER BY created_at DESC LIMIT 5;',
    'PRAGMA table_info(users);'
  ];

  const executeQuery = async () => {
    if (!query.trim()) {
      handleApiError({ response: { data: { error: 'Please enter a query' } } });
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.admin.executeSql(query, currentPage, pageSize, allowDangerous);
      setResults(result);
      
      // Add to history
      setHistory(prev => [
        { query, timestamp: new Date(), result: result.success },
        ...prev.slice(0, 9) // Keep last 10 queries
      ]);

      if (result.success) {
        handleApiSuccess('Query executed successfully');
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const exportResults = async (format) => {
    if (!results?.success || !results?.rows?.length) {
      handleApiError({ response: { data: { error: 'No results to export' } } });
      return;
    }

    try {
      const blob = await apiService.admin.exportQuery(query, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query_results_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      handleApiSuccess(`Results exported as ${format.toUpperCase()}`);
    } catch (error) {
      handleApiError(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">SQL Query</h3>
          <div className="flex items-center space-x-4">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={allowDangerous}
                onChange={(e) => setAllowDangerous(e.target.checked)}
                className="form-checkbox h-4 w-4 text-red-600 mr-2"
              />
              Allow dangerous operations
            </label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value))}
              className="form-select text-sm"
            >
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={500}>500 rows</option>
              <option value={1000}>1000 rows</option>
            </select>
          </div>
        </div>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your SQL query here..."
          className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm"
          onKeyDown={(e) => {
            if (e.ctrlKey && e.key === 'Enter') {
              e.preventDefault();
              executeQuery();
            }
          }}
        />

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={executeQuery}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Execute Query'}
            </button>
            {results?.success && results?.rows?.length > 0 && (
              <>
                <button
                  onClick={() => exportResults('csv')}
                  className="btn-secondary text-sm"
                >
                  <CloudArrowDownIcon className="h-4 w-4 mr-1" />
                  Export CSV
                </button>
                <button
                  onClick={() => exportResults('json')}
                  className="btn-secondary text-sm"
                >
                  <CloudArrowDownIcon className="h-4 w-4 mr-1" />
                  Export JSON
                </button>
              </>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Press Ctrl+Enter to execute
          </div>
        </div>
      </div>

      {/* Sample Queries */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Sample Queries</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sampleQueries.map((sampleQuery, index) => (
            <button
              key={index}
              onClick={() => setQuery(sampleQuery)}
              className="text-left p-3 bg-gray-50 rounded border hover:bg-gray-100 font-mono text-sm"
            >
              {sampleQuery}
            </button>
          ))}
        </div>
      </div>

      {/* Query History */}
      {history.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Query History</h3>
          <div className="space-y-2">
            {history.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                onClick={() => setQuery(item.query)}
              >
                <div className="flex-1 font-mono text-sm truncate mr-4">
                  {item.query}
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  {item.result ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircleIcon className="h-4 w-4 text-red-500" />
                  )}
                  <span>{formatDistanceToNow(item.timestamp, { addSuffix: true })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div className="bg-white rounded-lg border">
          {results.success ? (
            <>
              <div className="p-4 border-b bg-green-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-green-700">
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    <span className="font-medium">Query executed successfully</span>
                  </div>
                  <div className="text-sm text-green-600">
                    Execution time: {results.execution_time}s
                  </div>
                </div>
              </div>

              {results.rows && results.rows.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {results.columns.map((column) => (
                            <th
                              key={column}
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {results.rows.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {results.columns.map((column) => (
                              <td key={column} className="px-4 py-3 text-sm text-gray-900">
                                {row[column] !== null && row[column] !== undefined ? 
                                  String(row[column]) : (
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
                        ({results.total_count} total rows)
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setCurrentPage(results.page - 1);
                            executeQuery();
                          }}
                          disabled={results.page <= 1}
                          className="btn-secondary text-sm"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => {
                            setCurrentPage(results.page + 1);
                            executeQuery();
                          }}
                          disabled={results.page >= results.total_pages}
                          className="btn-secondary text-sm"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <InformationCircleIcon className="h-8 w-8 mx-auto mb-2" />
                  <p>Query executed successfully but returned no results</p>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200">
              <div className="flex items-center text-red-700">
                <XCircleIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">Query failed</span>
              </div>
              <p className="text-sm text-red-600 mt-2">{results.error}</p>
              {results.suggestion && (
                <p className="text-sm text-red-500 mt-1">
                  <strong>Suggestion:</strong> {results.suggestion}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Database Browser Tab Component
const DatabaseBrowserTab = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [tableSchema, setTableSchema] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    setLoading(true);
    try {
      const response = await apiService.admin.getTables();
      setTables(response.data || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const selectTable = async (tableName) => {
    setSelectedTable(tableName);
    setLoading(true);
    try {
      const [dataResponse, schemaResponse] = await Promise.all([
        apiService.admin.getTableData(tableName),
        apiService.admin.getTableSchema(tableName)
      ]);
      setTableData(dataResponse.data);
      setTableSchema(schemaResponse.data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Tables List */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Database Tables</h3>
          <button onClick={loadTables} className="btn-secondary text-sm">
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
        
        {loading && !selectedTable ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-2">
            {tables.map((table) => (
              <button
                key={table.name}
                onClick={() => selectTable(table.name)}
                className={`
                  w-full text-left p-3 rounded border transition-colors
                  ${selectedTable === table.name 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TableCellsIcon className="h-4 w-4 mr-2" />
                    <span className="font-medium">{table.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {table.row_count} rows
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table Details */}
      <div className="lg:col-span-2 space-y-6">
        {selectedTable ? (
          <>
            {/* Table Schema */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Schema: {selectedTable}
              </h3>
              {tableSchema ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Column
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Type
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Nullable
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Default
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {tableSchema.map((column, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            {column.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {column.type}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {column.notnull ? 'No' : 'Yes'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {column.dflt_value || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : loading ? (
                <LoadingSpinner />
              ) : null}
            </div>

            {/* Table Data */}
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Data: {selectedTable}
                </h3>
              </div>
              
              {tableData ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {tableData.columns?.map((column) => (
                          <th
                            key={column}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {tableData.rows?.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {tableData.columns?.map((column) => (
                            <td key={column} className="px-4 py-3 text-sm text-gray-900">
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
              ) : loading ? (
                <div className="p-8">
                  <LoadingSpinner />
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
            <ServerIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Select a table to view its schema and data</p>
          </div>
        )}
      </div>
    </div>
  );
};

// User Management Tab Component
const UserManagementTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await apiService.admin.getUsers();
      setUsers(response.data || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId, updates) => {
    try {
      await apiService.admin.updateUser(userId, updates);
      handleApiSuccess('User updated successfully');
      loadUsers();
      setEditingUser(null);
    } catch (error) {
      handleApiError(error);
    }
  };

  const getRoleColor = (role) => {
    return role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">User Management</h3>
        <button onClick={loadUsers} className="btn-secondary">
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <UserCircleIcon className="h-8 w-8 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.username}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(user.is_active)}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div>Executions: {user.total_executions || 0}</div>
                      <div>Cost: ${user.total_cost || 0}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="btn-secondary text-sm"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Edit User: {editingUser.username}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                  className="mt-1 w-full form-select"
                >
                  <option value="business_user">Business User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingUser.is_active}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="form-checkbox h-4 w-4 text-blue-600 mr-2"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Cost Limit ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingUser.cost_limit || 0}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, cost_limit: parseFloat(e.target.value) }))}
                  className="mt-1 w-full form-input"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => updateUser(editingUser.id, {
                  role: editingUser.role,
                  is_active: editingUser.is_active,
                  cost_limit: editingUser.cost_limit
                })}
                className="btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// System Health Tab Component
const SystemHealthTab = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHealthData();
    const interval = setInterval(loadHealthData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadHealthData = async () => {
    setLoading(true);
    try {
      const response = await apiService.admin.getSystemHealth();
      setHealthData(response);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      case 'error':
      case 'unhealthy':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      default:
        return <InformationCircleIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMetricValue = (key, value) => {
    // Handle database_info object separately
    if (key === 'database_info' && typeof value === 'object') {
      return (
        <div className="text-sm space-y-1">
          <div>Size: {value.database_size_mb}MB</div>
          <div>Tables: {value.table_count}</div>
          <div>Records: {value.total_records}</div>
          <div>Version: {value.sqlite_version}</div>
        </div>
      );
    }
    
    // Format other values
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return value;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">System Health</h3>
        <button onClick={loadHealthData} className="btn-secondary">
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {healthData ? (
        <>
          {/* Overall Status */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(healthData.overall_status)}
                <div className="ml-3">
                  <h4 className="text-lg font-medium text-gray-900">
                    System Status: {healthData.overall_status}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Last checked: {new Date(healthData.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(healthData.overall_status)}`}>
                {healthData.overall_status}
              </span>
            </div>
          </div>

          {/* Component Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(healthData.components || {}).map(([component, status]) => (
              <div key={component} className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(status.status)}
                    <div className="ml-3">
                      <h5 className="font-medium text-gray-900 capitalize">
                        {component.replace('_', ' ')}
                      </h5>
                      {status.error && (
                        <p className="text-sm text-red-600">{status.error}</p>
                      )}
                      {status.free_space_gb && (
                        <p className="text-sm text-gray-600">
                          Free space: {status.free_space_gb}GB
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(status.status)}`}>
                    {status.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* System Metrics */}
          <div className="bg-white rounded-lg border p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">System Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(healthData.metrics || {}).map(([metric, value]) => (
                <div key={metric} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatMetricValue(metric, value)}
                  </div>
                  <div className="text-sm text-gray-600 capitalize">
                    {metric.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
          <HeartIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Unable to load system health data</p>
        </div>
      )}
    </div>
  );
};

// Audit Logs Tab Component (placeholder)
const AuditLogsTab = () => {
  return (
    <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
      <DocumentChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Audit Logs</h3>
      <p>Audit log functionality will be implemented in a future update</p>
    </div>
  );
};

export default AdminPanel;