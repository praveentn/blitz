// src/components/ExecutionMonitor.js
import React, { useState, useEffect } from 'react';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  EyeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const ExecutionMonitor = () => {
  const [executions, setExecutions] = useState([]);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [executionSteps, setExecutionSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadExecutions();
    
    // Auto-refresh every 5 seconds if enabled
    const interval = autoRefresh ? setInterval(loadExecutions, 5000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  useEffect(() => {
    if (selectedExecution) {
      loadExecutionDetails(selectedExecution.id);
    }
  }, [selectedExecution]);

  const loadExecutions = async () => {
    try {
      const response = await apiService.get('/executions');
      setExecutions(response.data || []);
    } catch (error) {
      console.error('Error loading executions:', error);
      handleApiError(error);
      setExecutions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadExecutionDetails = async (executionId) => {
    try {
      setDetailsLoading(true);
      const response = await apiService.get(`/executions/${executionId}/steps`);
      setExecutionSteps(response.data || []);
    } catch (error) {
      console.error('Error loading execution details:', error);
      handleApiError(error);
      setExecutionSteps([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const stopExecution = async (executionId) => {
    try {
      await apiService.post(`/executions/${executionId}/stop`);
      loadExecutions(); // Refresh the list
    } catch (error) {
      handleApiError(error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />;
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <ExclamationCircleIcon className="h-4 w-4 text-red-600" />;
      case 'stopped':
        return <StopIcon className="h-4 w-4 text-gray-600" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'stopped':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  const calculateProgress = (execution) => {
    if (!execution.total_steps || execution.total_steps === 0) return 0;
    return Math.round((execution.completed_steps / execution.total_steps) * 100);
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
      {/* Executions List */}
      <div className="w-1/2 border-r border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Workflow Executions</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded text-sm ${
                  autoRefresh 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}
                title="Toggle auto-refresh"
              >
                <ArrowPathIcon className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={loadExecutions}
                className="btn-secondary p-2"
                title="Refresh now"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto h-full">
          {executions.length === 0 ? (
            <div className="p-8 text-center">
              <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Executions</h3>
              <p className="text-gray-500">Start executing workflows to see them here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {executions.map((execution) => (
                <div
                  key={execution.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedExecution?.id === execution.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedExecution(execution)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(execution.status)}
                      <h3 className="font-medium text-gray-900">
                        {execution.workflow_name || execution.agent_name || `Execution ${execution.id}`}
                      </h3>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(execution.status)}`}>
                      {execution.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="font-medium">{execution.execution_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Started:</span>
                      <span>{formatTimestamp(execution.created_at)}</span>
                    </div>
                    {execution.completed_at && (
                      <div className="flex justify-between">
                        <span>Completed:</span>
                        <span>{formatTimestamp(execution.completed_at)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{formatDuration(execution.duration)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {execution.status === 'running' && execution.total_steps > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{execution.completed_steps}/{execution.total_steps} steps</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${calculateProgress(execution)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {execution.status === 'running' && (
                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          stopExecution(execution.id);
                        }}
                        className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        <StopIcon className="h-3 w-3" />
                        <span>Stop</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Execution Details */}
      <div className="w-1/2 bg-gray-50">
        {selectedExecution ? (
          <div className="h-full flex flex-col">
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Execution Details</h3>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(selectedExecution.status)}
                  <span className={`px-2 py-1 text-sm font-medium rounded-full border ${getStatusColor(selectedExecution.status)}`}>
                    {selectedExecution.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">ID:</span>
                  <p className="font-medium">{selectedExecution.id}</p>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>
                  <p className="font-medium">{selectedExecution.execution_type}</p>
                </div>
                <div>
                  <span className="text-gray-500">Started:</span>
                  <p className="font-medium">{formatTimestamp(selectedExecution.created_at)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <p className="font-medium">{formatDuration(selectedExecution.duration)}</p>
                </div>
                {selectedExecution.total_cost && (
                  <div>
                    <span className="text-gray-500">Cost:</span>
                    <p className="font-medium">${selectedExecution.total_cost.toFixed(4)}</p>
                  </div>
                )}
                {selectedExecution.token_count && (
                  <div>
                    <span className="text-gray-500">Tokens:</span>
                    <p className="font-medium">{selectedExecution.token_count.toLocaleString()}</p>
                  </div>
                )}
              </div>

              {selectedExecution.error_message && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {selectedExecution.error_message}
                  </p>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Execution Steps</h4>

              {detailsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <LoadingSpinner />
                </div>
              ) : executionSteps.length === 0 ? (
                <div className="text-center py-8">
                  <InformationCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No execution steps available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {executionSteps.map((step, index) => (
                    <div key={step.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {index + 1}
                          </span>
                          <h5 className="font-medium text-gray-900">
                            {step.step_name || step.step_type}
                          </h5>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(step.status)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(step.status)}`}>
                            {step.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Duration:</span>
                          <span>{formatDuration(step.duration)}</span>
                        </div>
                        {step.llm_calls > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">LLM Calls:</span>
                            <span>{step.llm_calls}</span>
                          </div>
                        )}
                        {step.tokens_used > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tokens:</span>
                            <span>{step.tokens_used.toLocaleString()}</span>
                          </div>
                        )}
                        {step.cost > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Cost:</span>
                            <span>${step.cost.toFixed(4)}</span>
                          </div>
                        )}
                      </div>

                      {step.output && (
                        <div className="mt-3">
                          <span className="text-gray-500 text-sm">Output:</span>
                          <div className="mt-1 p-2 bg-gray-50 border rounded text-sm font-mono max-h-32 overflow-y-auto">
                            {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
                          </div>
                        </div>
                      )}

                      {step.error_message && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                          <span className="text-red-800 text-sm font-medium">Error: </span>
                          <span className="text-red-700 text-sm">{step.error_message}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <EyeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Execution</h3>
              <p className="text-gray-500">Choose an execution from the list to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionMonitor;