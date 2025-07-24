// src/components/DatabaseBrowser.js
import React, { useState, useEffect } from 'react';
import {
  TableCellsIcon,
  EyeIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError, handleApiSuccess } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const DatabaseBrowser = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [tableSchema, setTableSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedTables, setExpandedTables] = useState(new Set());

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable, currentPage);
      loadTableSchema(selectedTable);
    }
  }, [selectedTable, currentPage]);

  const loadTables = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/admin/database/tables');
      setTables(response.data || []);
    } catch (error) {
      console.error('Error loading tables:', error);
      handleApiError(error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (tableName, page = 1) => {
    try {
      setDataLoading(true);
      const response = await apiService.get(
        `/admin/database/tables/${tableName}/data?page=${page}&limit=50`
      );
      setTableData(response.data);
      setTotalPages(response.data.total_pages || 1);
    } catch (error) {
      console.error('Error loading table data:', error);
      handleApiError(error);
      setTableData(null);
    } finally {
      setDataLoading(false);
    }
  };

  const loadTableSchema = async (tableName) => {
    try {
      const response = await apiService.get(`/admin/database/tables/${tableName}/schema`);
      setTableSchema(response.data);
    } catch (error) {
      console.error('Error loading table schema:', error);
      handleApiError(error);
      setTableSchema(null);
    }
  };

  const toggleTableExpansion = (tableName) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const handleTableSelect = (tableName) => {
    setSelectedTable(tableName);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const exportTableData = async (tableName) => {
    try {
      const response = await apiService.get(
        `/admin/database/tables/${tableName}/export`,
        { responseType: 'blob' }
      );
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableName}_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      handleApiSuccess(`Table ${tableName} exported successfully`);
    } catch (error) {
      handleApiError(error);
    }
  };

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDataTypeIcon = (dataType) => {
    const type = dataType.toLowerCase();
    if (type.includes('int') || type.includes('number')) return '🔢';
    if (type.includes('text') || type.includes('varchar') || type.includes('char')) return '📝';
    if (type.includes('date') || type.includes('time')) return '📅';
    if (type.includes('bool')) return '✅';
    if (type.includes('json')) return '📊';
    return '❓';
  };

  const formatValue = (value, dataType) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">NULL</span>;
    }
    
    if (dataType && dataType.toLowerCase().includes('json')) {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return (
          <details className="cursor-pointer">
            <summary className="text-blue-600 hover:text-blue-800">View JSON</summary>
            <pre className="mt-1 text-xs bg-gray-100 p-2 rounded max-h-32 overflow-auto">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </details>
        );
      } catch {
        return String(value);
      }
    }
    
    const strValue = String(value);
    if (strValue.length > 100) {
      return (
        <details className="cursor-pointer">
          <summary className="text-blue-600 hover:text-blue-800">
            {strValue.substring(0, 50)}...
          </summary>
          <div className="mt-1 text-xs bg-gray-100 p-2 rounded max-h-32 overflow-auto">
            {strValue}
          </div>
        </details>
      );
    }
    
    return strValue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Tables Sidebar */}
      <div className="w-1/3 border-r border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Database Tables</h3>
            <span className="text-sm text-gray-500">{tables.length} tables</span>
          </div>
          
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredTables.length === 0 ? (
            <div className="p-4 text-center">
              <TableCellsIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No tables found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTables.map((table) => (
                <div key={table.name} className="relative">
                  <div
                    className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedTable === table.name ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                    onClick={() => handleTableSelect(table.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTableExpansion(table.name);
                          }}
                          className="mr-2 p-1 hover:bg-gray-200 rounded"
                        >
                          {expandedTables.has(table.name) ? (
                            <ChevronDownIcon className="h-3 w-3" />
                          ) : (
                            <ChevronRightIcon className="h-3 w-3" />
                          )}
                        </button>
                        <TableCellsIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{table.name}</p>
                          <p className="text-xs text-gray-500">
                            {table.row_count?.toLocaleString() || 0} rows
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportTableData(table.name);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Export table"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Table Details */}
                  {expandedTables.has(table.name) && (
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Columns:</span>
                          <span className="font-medium">{table.column_count || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Size:</span>
                          <span className="font-medium">{table.size_mb ? `${table.size_mb} MB` : 'Unknown'}</span>
                        </div>
                        {table.last_updated && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Updated:</span>
                            <span className="font-medium">
                              {new Date(table.last_updated).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
        {selectedTable ? (
          <>
            {/* Table Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{selectedTable}</h3>
                  <p className="text-sm text-gray-500">
                    {tableData ? `${tableData.total_records?.toLocaleString() || 0} total records` : 'Loading...'}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  {tableData && tableData.total_pages > 1 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage <= 1}
                          className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                          className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => exportTableData(selectedTable)}
                    className="btn-secondary"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Export
                  </button>
                </div>
              </div>
            </div>

            {/* Schema Information */}
            {tableSchema && (
              <div className="bg-white border-b border-gray-200 p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Schema</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tableSchema.columns?.map((column) => (
                    <div key={column.name} className="flex items-center space-x-2 text-sm">
                      <span className="text-lg">{getDataTypeIcon(column.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 truncate">{column.name}</span>
                          {column.primary_key && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">PK</span>
                          )}
                          {column.nullable === false && (
                            <span className="text-xs bg-red-100 text-red-800 px-1 rounded">NOT NULL</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{column.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Table Data */}
            <div className="flex-1 overflow-auto p-4">
              {dataLoading ? (
                <div className="flex items-center justify-center h-32">
                  <LoadingSpinner />
                </div>
              ) : tableData && tableData.data && tableData.data.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
                  <table className="min-w-full table">
                    <thead>
                      <tr className="table-header">
                        {tableData.columns.map((column, index) => (
                          <th key={index} className="table-cell text-left sticky top-0 bg-gray-50">
                            <div className="flex items-center space-x-1">
                              <span>{getDataTypeIcon(tableSchema?.columns?.find(c => c.name === column)?.type || '')}</span>
                              <span>{column}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {tableData.data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="table-row">
                          {tableData.columns.map((column, colIndex) => {
                            const columnSchema = tableSchema?.columns?.find(c => c.name === column);
                            return (
                              <td key={colIndex} className="table-cell max-w-xs">
                                {formatValue(row[column], columnSchema?.type)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Data</h3>
                  <p className="text-gray-500">This table contains no data or failed to load.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <TableCellsIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Table</h3>
              <p className="text-gray-500">Choose a table from the sidebar to view its data and schema</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseBrowser;