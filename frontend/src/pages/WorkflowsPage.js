// src/pages/WorkflowsPage.js
import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  BoltIcon,
  EyeIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import CrudModal from '../components/CrudModal';

const WorkflowsPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create',
    item: null
  });
  const [showDesigner, setShowDesigner] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  const workflowFields = [
    {
      key: 'name',
      label: 'Workflow Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Document Analysis Pipeline',
      description: 'Descriptive name for this workflow'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      required: true,
      placeholder: 'Describe what this workflow accomplishes...',
      description: 'Clear description of the workflow\'s purpose and functionality'
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'analysis', label: 'Data Analysis' },
        { value: 'automation', label: 'Process Automation' },
        { value: 'content', label: 'Content Generation' },
        { value: 'integration', label: 'System Integration' },
        { value: 'monitoring', label: 'Monitoring & Alerts' },
        { value: 'other', label: 'Other' }
      ],
      description: 'Workflow category for organization'
    },
    {
      key: 'trigger_type',
      label: 'Trigger Type',
      type: 'select',
      required: true,
      options: [
        { value: 'manual', label: 'Manual Execution' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'event', label: 'Event-Based' },
        { value: 'api', label: 'API Trigger' }
      ],
      description: 'How this workflow should be triggered'
    },
    {
      key: 'is_active',
      label: 'Active',
      type: 'checkbox',
      default: true,
      description: 'Whether this workflow is active and can be executed'
    }
  ];

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const response = await apiService.workflows.list();
      setWorkflows(response.data || []);
    } catch (error) {
      handleApiError(error);
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode, item = null) => {
    setModalState({ isOpen: true, mode, item });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, mode: 'create', item: null });
  };

  const handleModalSuccess = () => {
    loadWorkflows();
  };

  const openDesigner = (workflow = null) => {
    setSelectedWorkflow(workflow);
    setShowDesigner(true);
  };

  const closeDesigner = () => {
    setShowDesigner(false);
    setSelectedWorkflow(null);
  };

  const executeWorkflow = async (workflow) => {
    try {
      await apiService.executions.create({
        workflow_id: workflow.id,
        trigger_type: 'manual'
      });
      handleApiSuccess(`Workflow "${workflow.name}" started successfully!`);
    } catch (error) {
      handleApiError(error);
    }
  };

  const getStatusColor = (workflow) => {
    if (!workflow.is_active) return 'bg-gray-400';
    if (workflow.nodes_count === 0) return 'bg-yellow-400';
    return 'bg-green-400';
  };

  const getStatusText = (workflow) => {
    if (!workflow.is_active) return 'Inactive';
    if (workflow.nodes_count === 0) return 'Not Configured';
    return 'Ready';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Workflow Designer Component (placeholder for now)
  const WorkflowDesigner = () => (
    <div className="fixed inset-0 bg-white z-50">
      <div className="h-full flex flex-col">
        {/* Designer Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BoltIcon className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {selectedWorkflow ? `Edit: ${selectedWorkflow.name}` : 'New Workflow'}
                </h1>
                <p className="text-sm text-gray-600">
                  Drag and drop components to build your workflow
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="btn-secondary">
                <EyeIcon className="h-4 w-4 mr-2" />
                Preview
              </button>
              <button className="btn-primary">
                Save Workflow
              </button>
              <button 
                onClick={closeDesigner}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Designer Content */}
        <div className="flex-1 flex">
          {/* Tool Palette */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Components</h3>
            <div className="space-y-2">
              <div className="p-3 bg-white border rounded-lg cursor-pointer hover:shadow-sm">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                    <PlayIcon className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">Start Node</p>
                    <p className="text-xs text-gray-500">Workflow entry point</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-white border rounded-lg cursor-pointer hover:shadow-sm">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                    <Cog6ToothIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">Agent Node</p>
                    <p className="text-xs text-gray-500">Execute an agent</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-white border rounded-lg cursor-pointer hover:shadow-sm">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                    <BoltIcon className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">Tool Node</p>
                    <p className="text-xs text-gray-500">Execute a tool</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-white border rounded-lg cursor-pointer hover:shadow-sm">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                    <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">End Node</p>
                    <p className="text-xs text-gray-500">Workflow exit point</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-gray-100 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <BoltIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Workflow Designer Coming Soon
                </h3>
                <p className="text-gray-600 mb-4">
                  Full drag-and-drop workflow designer will be available in the next update.
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <p>✓ Visual node-based editor</p>
                  <p>✓ Drag and drop interface</p>
                  <p>✓ Real-time validation</p>
                  <p>✓ Parallel execution support</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (showDesigner) {
    return <WorkflowDesigner />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BoltIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Workflow Management</h1>
              <p className="text-gray-600">Design and manage automated AI workflows</p>
            </div>
          </div>
          <button onClick={() => openDesigner()} className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Workflow
          </button>
        </div>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center py-12">
          <BoltIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No workflows</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first automated workflow.</p>
          <div className="mt-6">
            <button onClick={() => openDesigner()} className="btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Workflow
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">{workflow.name}</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openDesigner(workflow)}
                      className="text-gray-400 hover:text-blue-600"
                      title="Edit workflow"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => executeWorkflow(workflow)}
                      className="text-gray-400 hover:text-green-600"
                      title="Run workflow"
                      disabled={!workflow.is_active}
                    >
                      <PlayIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => openModal('delete', workflow)}
                      className="text-gray-400 hover:text-red-600"
                      title="Delete workflow"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="card-body">
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {workflow.description}
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status:</span>
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(workflow)}`} />
                      <span className="text-sm font-medium">{getStatusText(workflow)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Nodes:</span>
                    <span className="text-sm font-medium">{workflow.nodes_count || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Trigger:</span>
                    <span className="text-sm font-medium capitalize">
                      {workflow.trigger_type || 'manual'}
                    </span>
                  </div>
                  
                  {workflow.category && (
                    <div className="mt-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {workflow.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="card-footer">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Last run: {workflow.last_execution_at ? 
                      new Date(workflow.last_execution_at).toLocaleDateString() : 
                      'Never'
                    }
                  </span>
                  <span className="text-xs text-gray-400">
                    Created {new Date(workflow.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CrudModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title="Workflow"
        mode={modalState.mode}
        item={modalState.item}
        fields={workflowFields}
        endpoint="/workflows"
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default WorkflowsPage;