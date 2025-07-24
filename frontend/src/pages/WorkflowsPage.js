// src/pages/WorkflowsPage.js - Updated version
import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  RectangleGroupIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import WorkflowDesigner from '../components/WorkflowDesigner';
import CrudModal from '../components/CrudModal';

const WorkflowsPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create',
    item: null
  });

  const workflowFields = [
    {
      key: 'name',
      label: 'Workflow Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Data Analysis Pipeline',
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Describe what this workflow does...',
    }
  ];

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/workflows');
      setWorkflows(response.data || []);
    } catch (error) {
      handleApiError(error);
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  const openDesigner = (workflow = null) => {
    setSelectedWorkflow(workflow);
    setDesignerOpen(true);
  };

  const closeDesigner = () => {
    setDesignerOpen(false);
    setSelectedWorkflow(null);
    loadWorkflows(); // Refresh list
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

  const executeWorkflow = async (workflowId) => {
    try {
      await apiService.post(`/workflows/${workflowId}/execute`);
      // Could redirect to execution monitor
    } catch (error) {
      handleApiError(error);
    }
  };

  if (designerOpen) {
    return (
      <WorkflowDesigner
        workflowId={selectedWorkflow?.id}
        onSave={closeDesigner}
        onClose={closeDesigner}
      />
    );
  }

  if (loading) {
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
            <RectangleGroupIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Workflow Management</h1>
              <p className="text-gray-600">Design and manage AI workflows</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button onClick={() => openModal('create')} className="btn-secondary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Quick Create
            </button>
            <button onClick={() => openDesigner()} className="btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Design Workflow
            </button>
          </div>
        </div>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center py-12">
          <RectangleGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No workflows configured</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by designing your first AI workflow.</p>
          <div className="mt-6">
            <button onClick={() => openDesigner()} className="btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Design Workflow
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="card hover:shadow-lg transition-shadow">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{workflow.name}</h3>
                    <p className="text-sm text-gray-500">{workflow.description}</p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => openDesigner(workflow)}
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
              
              <div className="card-body">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Nodes:</span>
                      <p className="font-medium">{workflow.nodes?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Connections:</span>
                      <p className="font-medium">{workflow.connections?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card-footer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${workflow.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-500">
                      {workflow.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <button
                    onClick={() => executeWorkflow(workflow.id)}
                    className="btn-secondary btn-sm"
                  >
                    <PlayIcon className="h-4 w-4 mr-1" />
                    Run
                  </button>
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