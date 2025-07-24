// src/pages/ModelsPage.js
import React, { useState, useEffect } from 'react';
import {
  CpuChipIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError, handleApiSuccess } from '../services/api';
import LoadingSpinner, { TableSkeleton } from '../components/LoadingSpinner';
import ModelForm from '../components/ModelForm';

const ModelsPage = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingModel, setEditingModel] = useState(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const response = await apiService.models.getAll();
      setModels(response.data);
    } catch (error) {
      handleApiError(error, 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (model) => {
    setEditingModel(model);
    setShowCreateModal(true);
  };

  const handleDelete = async (model) => {
    if (window.confirm(`Are you sure you want to delete the model "${model.name}"?`)) {
      try {
        await apiService.models.delete(model.id);
        await loadModels();
        handleApiSuccess('Model deleted successfully');
      } catch (error) {
        handleApiError(error, 'Failed to delete model');
      }
    }
  };

  const handleFormSuccess = () => {
    loadModels();
    setEditingModel(null);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingModel(null);
  };

  const getProviderBadge = (provider) => {
    const badges = {
      azure_openai: 'bg-blue-100 text-blue-800',
      openai: 'bg-green-100 text-green-800',
      anthropic: 'bg-purple-100 text-purple-800',
    };
    return badges[provider] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Model Management</h1>
          <p className="text-gray-600">Manage your LLM models and configurations</p>
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Model Management</h1>
          <p className="text-gray-600">Manage your LLM models and configurations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Model
        </button>
      </div>

      {/* Models List */}
      <div className="card">
        <div className="card-body">
          {models.length === 0 ? (
            <div className="text-center py-12">
              <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No models configured</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first LLM model
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Model
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Name</th>
                    <th className="table-header-cell">Provider</th>
                    <th className="table-header-cell">Model</th>
                    <th className="table-header-cell">Cost per Token</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Actions</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {models.map((model) => (
                    <tr key={model.id} className="table-row">
                      <td className="table-cell">
                        <div className="font-medium text-gray-900">{model.name}</div>
                      </td>
                      <td className="table-cell">
                        <span className={`status-badge ${getProviderBadge(model.provider)}`}>
                          {model.provider.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="text-gray-900">{model.model_name}</div>
                        {model.endpoint && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {model.endpoint}
                          </div>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className="font-mono text-sm">
                          ${model.cost_per_token?.toFixed(5) || '0.00000'}
                        </span>
                      </td>
                      <td className="table-cell">
                        {model.is_active ? (
                          <span className="status-badge status-success">
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="status-badge status-error">
                            <XCircleIcon className="h-3 w-3 mr-1" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <button 
                            className="p-1 text-blue-600 hover:text-blue-800"
                            onClick={() => handleEdit(model)}
                            title="Edit model"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button 
                            className="p-1 text-red-600 hover:text-red-800"
                            onClick={() => handleDelete(model)}
                            title="Delete model"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Model Form Modal */}
      <ModelForm
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        onSuccess={handleFormSuccess}
        model={editingModel}
      />
    </div>
  );
};

export default ModelsPage;