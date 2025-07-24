// src/pages/ExecutionMonitorPage.js
import React, { useState, useEffect } from 'react';
import {
  PlayIcon,
  StopIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowPathIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const ExecutionMonitorPage = () => {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    loadExecutions();
    
    // Set up auto-refresh for running executions
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadExecutions();
      }, 3000); // Refresh every 3 seconds
      
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  const loadExecutions = async () => {
    try {
      if (!loading) setLoading(true); // Only show spinner on first load
      const response = await apiService.executions.list();
      setExecutions(response.data || []);
    } catch (error) {
      handleApiError(error);
      setExecutions([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <ClockIcon className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <StopIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-gray-100 text-gray-800',
      running: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status] || badges.pending}`;
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime) return 'N/A';
    
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
    return <ClockIcon className="h-4 w-4 text-gray-400" />;
  };

  const viewExecutionDetails = async (execution) => {
    try {
      const response = await apiService.executions.get(execution.id);
      setSelectedExecution(response.data);
    } catch (error) {
      handleApiError(error);
    }
  };

  const getRunningExecutions = () => {
    return executions.filter(exec => exec.status === 'running').length;
  };

  const getRecentFailures = () => {
    const recent = executions.filter(exec => {
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
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PlayIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Executions</p>
              <p className="text-2xl font-semibold text-gray-900">{executions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Running</p>
              <p className="text-2xl font-semibold text-gray-900">{getRunningExecutions()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {executions.filter(e => e.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recent Failures</p>
              <p className="text-2xl font-semibold text-gray-900">{getRecentFailures()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Executions Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Executions</h3>
        </div>
        
        {executions.length === 0 ? (
          <div className="text-center py-12">
            <BoltIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No executions</h3>
            <p className="mt-1 text-sm text-gray-500">Executions will appear here when workflows or agents are run.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type & Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {executions.map((execution) => (
                  <tr key={execution.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getExecutionTypeIcon(execution)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {execution.workflow_name || execution.agent_name || `Execution #${execution.id}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {execution.workflow_id ? 'Workflow' : 'Agent'} execution
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(execution.status)}
                        <span className={`ml-2 ${getStatusBadge(execution.status)}`}>
                          {execution.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(execution.started_at, execution.completed_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(execution.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {execution.user_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => viewExecutionDetails(execution)}
                        className="text-blue-600 hover:text-blue-900"
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

      {/* Execution Details Modal */}
      {selectedExecution && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Execution Details - {selectedExecution.workflow_name || selectedExecution.agent_name || `#${selectedExecution.id}`}
              </h3>
              <button
                onClick={() => setSelectedExecution(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="flex items-center mt-1">
                    {getStatusIcon(selectedExecution.status)}
                    <span className={`ml-2 ${getStatusBadge(selectedExecution.status)}`}>
                      {selectedExecution.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDuration(selectedExecution.started_at, selectedExecution.completed_at)}
                  </p>
                </div>
              </div>
              
              {selectedExecution.error_message && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Error Message</label>
                  <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {selectedExecution.error_message}
                  </div>
                </div>
              )}
              
              {selectedExecution.result && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Result</label>
                  <pre className="mt-1 p-2 bg-gray-50 border rounded text-sm overflow-auto max-h-48">
                    {JSON.stringify(selectedExecution.result, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedExecution.steps && selectedExecution.steps.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Execution Steps</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedExecution.steps.map((step, index) => (
                      <div key={index} className="p-3 border rounded bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{step.step_name || `Step ${index + 1}`}</span>
                          <span className="text-xs text-gray-500">
                            {step.duration ? `${step.duration}ms` : ''}
                          </span>
                        </div>
                        {step.result && (
                          <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                            {JSON.stringify(step.result, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
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