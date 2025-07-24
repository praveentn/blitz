// src/components/ExecutionMonitor.js
import React, { useState, useEffect } from 'react';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowPathIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner, { TableSkeleton } from './LoadingSpinner';
import { formatDuration, formatCurrency, getStatusColor } from '../utils/helpers';

const ExecutionMonitor = () => {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    page: 1,
    perPage: 20
  });
  const [pagination, setPagination] = useState({});
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadExecutions();
  }, [filters]);

  // Auto-refresh for running executions
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      const hasRunning = executions.some(exec => exec.status === 'running' || exec.status === 'pending');
      if (hasRunning) {
        loadExecutions(false); // Silent refresh
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [executions, autoRefresh]);

  const loadExecutions = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const response = await apiService.executions.getAll(filters.page, filters.perPage);
      const data = response.data;
      
      // Filter by status and type if specified
      let filtered = data.executions || [];
      
      if (filters.status !== 'all') {
        filtered = filtered.filter(exec => exec.status === filters.status);
      }
      
      if (filters.type !== 'all') {
        filtered = filtered.filter(exec => exec.execution_type === filters.type);
      }

      setExecutions(filtered);
      setPagination({
        total: data.total || filtered.length,
        pages: data.pages || 1,
        currentPage: data.current_page || 1
      });
    } catch (error) {
      if (showLoading) {
        handleApiError(error, 'Failed to load executions');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadExecutionDetails = async (executionId) => {
    try {
      const response = await apiService.executions.getStatus(executionId);
      setSelectedExecution(response.data);
    } catch (error) {
      handleApiError(error, 'Failed to load execution details');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'running':
        return <LoadingSpinner size="small" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'cancelled':
        return <StopIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getExecutionTypeIcon = (type) => {
    switch (type) {
      case 'agent':
        return '🤖';
      case 'workflow':
        return '🔄';
      default:
        return '▶️';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Execution Monitor</h1>
          <p className="text-gray-600">Track and monitor AI executions in real-time</p>
        </div>
        <TableSkeleton rows={10} columns={6} />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Execution Monitor</h1>
          <p className="text-gray-600">Track and monitor AI executions in real-time</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>
          <button
            onClick={() => loadExecutions()}
            className="btn-secondary"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="form-select"
              >
                <option value="all">All Statuses</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value, page: 1 }))}
                className="form-select"
              >
                <option value="all">All Types</option>
                <option value="agent">Agents</option>
                <option value="workflow">Workflows</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Executions List */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">
                Executions ({executions.length})
              </h3>
            </div>
            <div className="card-body p-0">
              {executions.length === 0 ? (
                <div className="text-center py-12">
                  <PlayIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No executions found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {filters.status !== 'all' || filters.type !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Start by running an agent or workflow'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell">Type</th>
                        <th className="table-header-cell">ID</th>
                        <th className="table-header-cell">Status</th>
                        <th className="table-header-cell">Duration</th>
                        <th className="table-header-cell">Created</th>
                        <th className="table-header-cell">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {executions.map((execution) => (
                        <tr 
                          key={execution.id} 
                          className={`table-row ${
                            selectedExecution?.id === execution.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="table-cell">
                            <div className="flex items-center">
                              <span className="text-lg mr-2">
                                {getExecutionTypeIcon(execution.execution_type)}
                              </span>
                              <span className="capitalize">
                                {execution.execution_type}
                              </span>
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className="font-mono text-sm">
                              #{execution.id}
                            </div>
                            <div className="text-xs text-gray-500">
                              Target: {execution.target_id}
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(execution.status)}
                              <span className={`status-badge ${getStatusColor(execution.status)}`}>
                                {execution.status}
                              </span>
                            </div>
                            {execution.progress !== undefined && execution.status === 'running' && (
                              <div className="mt-1">
                                <div className="w-full bg-gray-200 rounded-full h-1">
                                  <div 
                                    className="bg-blue-600 h-1 rounded-full"
                                    style={{ width: `${(execution.progress * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="table-cell">
                            {execution.duration ? (
                              <span className="font-mono text-sm">
                                {formatDuration(execution.duration)}
                              </span>
                            ) : execution.status === 'running' && execution.started_at ? (
                              <span className="text-blue-600 font-mono text-sm">
                                Running...
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="table-cell">
                            <div className="text-sm text-gray-900">
                              {format(new Date(execution.created_at), 'MMM d, HH:mm')}
                            </div>
                            <div className="text-xs text-gray-500">
                              by User #{execution.created_by}
                            </div>
                          </td>
                          <td className="table-cell">
                            <button
                              onClick={() => loadExecutionDetails(execution.id)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={filters.page === 1}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {filters.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={filters.page === pagination.pages}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Execution Details */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Execution Details</h3>
            </div>
            <div className="card-body">
              {selectedExecution ? (
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">ID:</span>
                        <span className="font-mono">#{selectedExecution.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="capitalize">{selectedExecution.execution_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`status-badge ${getStatusColor(selectedExecution.status)}`}>
                          {selectedExecution.status}
                        </span>
                      </div>
                      {selectedExecution.duration && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-mono">{formatDuration(selectedExecution.duration)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Input Data */}
                  {selectedExecution.input_data && Object.keys(selectedExecution.input_data).length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Input Data</h4>
                      <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(selectedExecution.input_data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Output Data */}
                  {selectedExecution.output_data && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Output Data</h4>
                      <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                        {typeof selectedExecution.output_data === 'string' 
                          ? selectedExecution.output_data 
                          : JSON.stringify(selectedExecution.output_data, null, 2)
                        }
                      </pre>
                    </div>
                  )}

                  {/* Error Message */}
                  {selectedExecution.error_message && (
                    <div>
                      <h4 className="font-medium text-red-900 mb-2">Error</h4>
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm text-red-700">{selectedExecution.error_message}</p>
                      </div>
                    </div>
                  )}

                  {/* Execution Steps */}
                  {selectedExecution.steps && selectedExecution.steps.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Execution Steps ({selectedExecution.steps.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedExecution.steps.map((step, index) => (
                          <div key={step.id || index} className="border border-gray-200 rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                Step {step.step_order}: {step.step_name || step.step_type}
                              </span>
                              <span className={`status-badge ${getStatusColor(step.status)}`}>
                                {step.status}
                              </span>
                            </div>
                            {step.duration && (
                              <div className="text-xs text-gray-600">
                                Duration: {formatDuration(step.duration)}
                              </div>
                            )}
                            {step.error_message && (
                              <div className="text-xs text-red-600 mt-1">
                                Error: {step.error_message}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <EyeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No execution selected</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Click on an execution to view its details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutionMonitor;