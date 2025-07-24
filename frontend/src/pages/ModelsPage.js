// src/pages/ModelsPage.js
import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CpuChipIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import CrudModal from '../components/CrudModal';

const ModelsPage = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create', // 'create', 'edit', 'delete'
    item: null
  });

  // Field definitions for the CRUD modal
  const modelFields = [
    {
      key: 'name',
      label: 'Model Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., GPT-4 Production',
      description: 'Unique name for this model configuration'
    },
    {
      key: 'provider',
      label: 'Provider',
      type: 'select',
      required: true,
      options: [
        { value: 'azure_openai', label: 'Azure OpenAI' },
        { value: 'openai', label: 'OpenAI' },
        { value: 'anthropic', label: 'Anthropic' },
        { value: 'local', label: 'Local Model' }
      ],
      description: 'LLM provider for this model'
    },
    {
      key: 'model_name',
      label: 'Model Name/ID',
      type: 'text',
      required: true,
      placeholder: 'e.g., gpt-4, claude-3-sonnet-20240229',
      description: 'Exact model identifier from the provider'
    },
    {
      key: 'endpoint',
      label: 'API Endpoint',
      type: 'url',
      placeholder: 'https://your-resource.openai.azure.com/',
      description: 'API endpoint URL (for Azure OpenAI, custom endpoints)'
    },
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      placeholder: 'Enter API key',
      description: 'API key for authentication (stored securely)'
    },
    {
      key: 'parameters',
      label: 'Model Parameters',
      type: 'json',
      default: '{\n  "temperature": 0.7,\n  "max_tokens": 2000,\n  "top_p": 1.0\n}',
      description: 'JSON configuration for model parameters'
    },
    {
      key: 'cost_per_token',
      label: 'Cost per Token ($)',
      type: 'number',
      min: 0,
      step: 0.00001,
      placeholder: '0.00003',
      description: 'Cost per token for usage tracking (e.g., 0.00003 for GPT-4)'
    }
  ];

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/models');
      setModels(response.data || []);
    } catch (error) {
      console.error('Error loading models:', error);
      handleApiError(error);
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode, item = null) => {
    setModalState({
      isOpen: true,
      mode,
      item
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      mode: 'create',
      item: null
    });
  };

  const handleModalSuccess = () => {
    loadModels(); // Refresh the list
  };

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'azure_openai':
        return '🔵';
      case 'openai':
        return '🟢';
      case 'anthropic':
        return '🟠';
      case 'local':
        return '🖥️';
      default:
        return '❓';
    }
  };

  const getProviderName = (provider) => {
    switch (provider) {
      case 'azure_openai':
        return 'Azure OpenAI';
      case 'openai':
        return 'OpenAI';
      case 'anthropic':
        return 'Anthropic';
      case 'local':
        return 'Local Model';
      default:
        return provider;
    }
  };

  const formatCost = (cost) => {
    if (!cost || cost === 0) return 'Free';
    return `$${(cost * 1000).toFixed(5)}/1K tokens`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CpuChipIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Model Management</h1>
              <p className="text-gray-600">Configure and manage LLM models</p>
            </div>
          </div>
          <button
            onClick={() => openModal('create')}
            className="btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Model
          </button>
        </div>
      </div>

      {/* Models Grid */}
      {models.length === 0 ? (
        <div className="text-center py-12">
          <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No models configured</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first LLM model.</p>
          <div className="mt-6">
            <button
              onClick={() => openModal('create')}
              className="btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Model
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <div key={model.id} className="card hover:shadow-lg transition-shadow">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">{getProviderIcon(model.provider)}</span>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{model.name}</h3>
                      <p className="text-sm text-gray-500">{getProviderName(model.provider)}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => openModal('edit', model)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit model"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openModal('delete', model)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete model"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="card-body">
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Model:</span>
                    <p className="text-sm text-gray-900 font-mono">{model.model_name}</p>
                  </div>
                  
                  {model.endpoint && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Endpoint:</span>
                      <p className="text-sm text-gray-900 font-mono truncate">{model.endpoint}</p>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500">Cost:</span>
                    <p className="text-sm text-gray-900">{formatCost(model.cost_per_token)}</p>
                  </div>

                  {model.parameters && Object.keys(model.parameters).length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Parameters:</span>
                      <div className="mt-1 space-y-1">
                        {Object.entries(model.parameters).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="text-gray-500">{key}:</span>
                            <span className="text-gray-900 font-mono">{String(value)}</span>
                          </div>
                        ))}
                        {Object.keys(model.parameters).length > 3 && (
                          <p className="text-xs text-gray-500">+{Object.keys(model.parameters).length - 3} more...</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="card-footer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${model.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-500">
                      {model.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    Created {new Date(model.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CRUD Modal */}
      <CrudModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title="Model"
        mode={modalState.mode}
        item={modalState.item}
        fields={modelFields}
        endpoint="/models"
        onSuccess={handleModalSuccess}
        validationRules={{
          name: (value) => {
            if (value && value.length < 3) return 'Name must be at least 3 characters';
            return null;
          },
          cost_per_token: (value) => {
            if (value && (isNaN(value) || Number(value) < 0)) return 'Cost must be a positive number';
            return null;
          }
        }}
      />
    </div>
  );
};

export default ModelsPage;