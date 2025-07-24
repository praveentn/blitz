// src/pages/ExecutionMonitorPage.js - Fixed version
import React, { useState, useEffect, useCallback } from 'react';
import {
  BoltIcon,
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CalendarIcon,
  UserIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

const ExecutionMonitorPage = () => {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadExecutions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.executions.list();
      
      // Fix: Ensure we always have an array
      const executionsData = response?.data || response || [];
      const validExecutions = Array.isArray(executionsData) ? executionsData : [];
      
      setExecutions(validExecutions);
    } catch (error) {
      console.error('Failed to load executions:', error);
      handleApiError(error);
      setExecutions([]); // Ensure we always set an array
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  // Auto-refresh functionality
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadExecutions, 5000); // Refresh every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, loadExecutions]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <ClockIcon className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end - start) / 1000);
    
    if (duration < 60) {
      return `${duration}s`;
    } else if (duration < 3600) {
      return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    } else {
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const getExecutionTypeIcon = (execution) => {
    if (execution.workflow_id) {
      return <BoltIcon className="h-4 w-4 text-blue-500" />;
    } else if (execution.agent_id) {
      return <PlayIcon className="h-4 w-4 text-green-500" />;
    }
    return <CpuChipIcon className="h-4 w-4 text-gray-400" />;
  };

  const viewExecutionDetails = async (execution) => {
    try {
      const response = await apiService.executions.get(execution.id);
      setSelectedExecution(response.data || response);
    } catch (error) {
      handleApiError(error);
    }
  };

  // Filter executions based on status and type
  const filteredExecutions = executions.filter(execution => {
    const statusMatch = statusFilter === 'all' || execution.status === statusFilter;
    const typeMatch = typeFilter === 'all' || 
      (typeFilter === 'workflow' && execution.workflow_id) ||
      (typeFilter === 'agent' && execution.agent_id);
    return statusMatch && typeMatch;
  });

  const getRunningExecutions = () => {
    return filteredExecutions.filter(exec => exec.status === 'running').length;
  };

  const getRecentFailures = () => {
    const recent = filteredExecutions.filter(exec => {
      const execDate = new Date(exec.created_at);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return exec.status === 'failed' && execDate > oneDayAgo;
    });
    return recent.length;
  };

  if (loading && executions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BoltIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Execution Monitor</h1>
              <p className="text-gray-600">Real-time monitoring of workflow and agent executions</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">Auto-refresh</span>
            </label>
            <button
              onClick={loadExecutions}
              className="btn-secondary"
              disabled={loading}
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Running</p>
              <p className="text-2xl font-bold text-gray-900">{getRunningExecutions()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Completed Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredExecutions.filter(exec => {
                  const today = new Date().toDateString();
                  const execDate = new Date(exec.created_at).toDateString();
                  return exec.status === 'completed' && execDate === today;
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Recent Failures</p>
              <p className="text-2xl font-bold text-gray-900">{getRecentFailures()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <BoltIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Executions</p>
              <p className="text-2xl font-bold text-gray-900">{executions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="form-select"
            >
              <option value="all">All Types</option>
              <option value="workflow">Workflows</option>
              <option value="agent">Agents</option>
            </select>
          </div>
        </div>
      </div>

      {/* Executions List */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Recent Executions</h3>
          <p className="text-sm text-gray-600">
            Showing {filteredExecutions.length} of {executions.length} executions
          </p>
        </div>

        {filteredExecutions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <BoltIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No executions found</p>
            <p className="text-sm">Try adjusting the filters or start a new execution</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredExecutions.map((execution) => (
              <div key={execution.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getExecutionTypeIcon(execution)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {execution.workflow_name || execution.agent_name || `Execution #${execution.id}`}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(execution.status)}`}>
                          {execution.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {formatDistanceToNow(new Date(execution.created_at), { addSuffix: true })}
                        </span>
                        {execution.user_name && (
                          <span className="flex items-center">
                            <UserIcon className="h-4 w-4 mr-1" />
                            {execution.user_name}
                          </span>
                        )}
                        <span>
                          Duration: {formatDuration(execution.created_at, execution.completed_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(execution.status)}
                    <button
                      onClick={() => viewExecutionDetails(execution)}
                      className="btn-secondary text-sm"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Execution Details Modal */}
      {selectedExecution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Execution Details - #{selectedExecution.id}
                </h3>
                <button
                  onClick={() => setSelectedExecution(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(selectedExecution.status)}`}>
                    {selectedExecution.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration</label>
                  <p className="text-sm text-gray-900">
                    {formatDuration(selectedExecution.created_at, selectedExecution.completed_at)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Started</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedExecution.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Completed</label>
                  <p className="text-sm text-gray-900">
                    {selectedExecution.completed_at 
                      ? new Date(selectedExecution.completed_at).toLocaleString()
                      : 'In progress'
                    }
                  </p>
                </div>
              </div>

              {selectedExecution.error_message && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Error</h4>
                  <p className="text-sm text-red-600">{selectedExecution.error_message}</p>
                </div>
              )}

              {selectedExecution.result && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Result</h4>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedExecution.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionMonitorPage;