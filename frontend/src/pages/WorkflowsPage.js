// src/pages/WorkflowsPage.js - Fixed with proper WorkflowDesigner integration
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
import { apiService, handleApiError, handleApiSuccess } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import WorkflowDesigner from '../components/WorkflowDesigner';
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
      setWorkflows(response || []);
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

  const handleDesignerSave = async (workflowData) => {
    try {
      if (selectedWorkflow) {
        await apiService.workflows.update(selectedWorkflow.id, workflowData);
        handleApiSuccess(`Workflow "${workflowData.name}" updated successfully!`);
      } else {
        await apiService.workflows.create(workflowData);
        handleApiSuccess(`Workflow "${workflowData.name}" created successfully!`);
      }
      closeDesigner();
      loadWorkflows();
    } catch (error) {
      handleApiError(error);
    }
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
    if ((workflow.nodes_count || 0) === 0) return 'bg-yellow-400';
    return 'bg-green-400';
  };

  const getStatusText = (workflow) => {
    if (!workflow.is_active) return 'Inactive';
    if ((workflow.nodes_count || 0) === 0) return 'Not Configured';
    return 'Ready';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show the WorkflowDesigner when in design mode
  if (showDesigner) {
    return (
      <WorkflowDesigner
        workflow={selectedWorkflow}
        onSave={handleDesignerSave}
        onClose={closeDesigner}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BoltIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
              <p className="text-gray-600">Design and manage AI-powered workflows</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => openModal('create')}
              className="btn-secondary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Quick Create
            </button>
            <button
              onClick={() => openDesigner()}
              className="btn-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Design New Workflow
            </button>
          </div>
        </div>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((workflow) => (
          <div
            key={workflow.id}
            className="bg-white rounded-lg border hover:shadow-md transition-shadow duration-200"
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {workflow.name}
                    </h3>
                    <div className="ml-2 flex items-center">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(workflow)}`}></div>
                      <span className="ml-1 text-xs text-gray-500">
                        {getStatusText(workflow)}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {workflow.description || 'No description available'}
                  </p>
                  
                  <div className="flex items-center text-xs text-gray-500 space-x-4 mb-4">
                    <span>Nodes: {workflow.nodes_count || 0}</span>
                    <span>Category: {workflow.category || 'Other'}</span>
                    <span>Trigger: {workflow.trigger_type || 'Manual'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openDesigner(workflow)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Design workflow"
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => executeWorkflow(workflow)}
                    disabled={!workflow.is_active || (workflow.nodes_count || 0) === 0}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Execute workflow"
                  >
                    <PlayIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => openModal('view', workflow)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="View details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openModal('edit', workflow)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit workflow"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => openModal('delete', workflow)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete workflow"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {workflows.length === 0 && (
          <div className="col-span-full">
            <div className="text-center py-12 bg-white rounded-lg border border-dashed">
              <BoltIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No workflows yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first workflow
              </p>
              <div className="mt-6 flex justify-center space-x-3">
                <button
                  onClick={() => openModal('create')}
                  className="btn-secondary"
                >
                  Quick Create
                </button>
                <button
                  onClick={() => openDesigner()}
                  className="btn-primary"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Design Workflow
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CRUD Modal */}
      <CrudModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        mode={modalState.mode}
        title="Workflow"
        fields={workflowFields}
        item={modalState.item}
        apiEndpoint="workflows"
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default WorkflowsPage;