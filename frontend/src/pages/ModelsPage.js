// src/pages/ModelsPage.js
import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CpuChipIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import CrudModal from '../components/CrudModal';

const ModelsPage = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create',
    item: null
  });

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
      description: 'API endpoint URL (for Azure OpenAI and custom providers)'
    },
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      placeholder: 'Enter API key...',
      description: 'API key for authentication (will be encrypted)'
    },
    {
      key: 'parameters',
      label: 'Default Parameters',
      type: 'json',
      default: JSON.stringify({
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0
      }, null, 2),
      description: 'Default LLM parameters for this model'
    },
    {
      key: 'cost_per_1k_tokens',
      label: 'Cost per 1K Tokens',
      type: 'number',
      step: '0.001',
      min: '0',
      placeholder: '0.030',
      description: 'Cost in USD per 1000 tokens (for cost tracking)'
    },
    {
      key: 'is_active',
      label: 'Active',
      type: 'checkbox',
      default: true,
      description: 'Whether this model is active and available for use'
    }
  ];

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await apiService.models.list();
      setModels(response.data || []);
    } catch (error) {
      handleApiError(error);
      setModels([]);
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
    loadModels();
  };

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'azure_openai':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
            <span className="text-xs font-bold text-blue-600">AZ</span>
          </div>
        );
      case 'openai':
        return (
          <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
            <span className="text-xs font-bold text-green-600">AI</span>
          </div>
        );
      case 'anthropic':
        return (
          <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
            <span className="text-xs font-bold text-purple-600">AN</span>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
            <CpuChipIcon className="h-5 w-5 text-gray-600" />
          </div>
        );
    }
  };

  const getProviderBadge = (provider) => {
    const badges = {
      azure_openai: 'bg-blue-100 text-blue-800',
      openai: 'bg-green-100 text-green-800',
      anthropic: 'bg-purple-100 text-purple-800',
      local: 'bg-gray-100 text-gray-800'
    };
    
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[provider] || badges.local}`;
  };

  const formatCost = (cost) => {
    if (!cost) return 'Not set';
    return `$${parseFloat(cost).toFixed(3)}/1K tokens`;
  };

  const getModelStatus = (model) => {
    if (!model.is_active) {
      return {
        icon: <ExclamationTriangleIcon className="h-4 w-4 text-gray-500" />,
        text: 'Inactive',
        color: 'text-gray-500'
      };
    }
    
    if (!model.api_key || !model.endpoint) {
      return {
        icon: <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />,
        text: 'Configuration Incomplete',
        color: 'text-yellow-600'
      };
    }
    
    return {
      icon: <CheckCircleIcon className="h-4 w-4 text-green-500" />,
      text: 'Ready',
      color: 'text-green-600'
    };
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
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CpuChipIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Model Management</h1>
              <p className="text-gray-600">Configure and manage LLM models for your agents</p>
            </div>
          </div>
          <button onClick={() => openModal('create')} className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Model
          </button>
        </div>
      </div>

      {models.length === 0 ? (
        <div className="text-center py-12">
          <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No models configured</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first LLM model.</p>
          <div className="mt-6">
            <button onClick={() => openModal('create')} className="btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Model
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => {
            const status = getModelStatus(model);
            
            return (
              <div key={model.id} className="card">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getProviderIcon(model.provider)}
                      <h3 className="ml-3 text-lg font-medium text-gray-900">{model.name}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openModal('edit', model)}
                        className="text-gray-400 hover:text-blue-600"
                        title="Edit model"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => openModal('delete', model)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete model"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="mb-3">
                    <span className={getProviderBadge(model.provider)}>
                      {model.provider.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Model ID:</span>
                      <span className="font-mono text-gray-900 text-xs">
                        {model.model_name}
                      </span>
                    </div>
                    
                    {model.endpoint && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Endpoint:</span>
                        <span className="font-mono text-gray-900 text-xs truncate max-w-32">
                          {model.endpoint}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Cost:</span>
                      <span className="font-medium text-gray-900">
                        {formatCost(model.cost_per_1k_tokens)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Status:</span>
                      <div className={`flex items-center ${status.color}`}>
                        {status.icon}
                        <span className="ml-1 text-xs">{status.text}</span>
                      </div>
                    </div>
                    
                    {model.parameters && Object.keys(model.parameters).length > 0 && (
                      <div className="pt-2 border-t border-gray-100">
                        <span className="text-sm font-medium text-gray-500 mb-2 block">Parameters:</span>
                        <div className="space-y-1">
                          {Object.entries(model.parameters).slice(0, 3).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-xs">
                              <span className="text-gray-500 capitalize">{key}:</span>
                              <span className="text-gray-900 font-mono">
                                {typeof value === 'number' ? value.toFixed(2) : String(value)}
                              </span>
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
            );
          })}
        </div>
      )}

      <CrudModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title="Model"
        mode={modalState.mode}
        item={modalState.item}
        fields={modelFields}
        endpoint="/models"
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default ModelsPage;