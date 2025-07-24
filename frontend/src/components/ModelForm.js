// src/components/ModelForm.js
import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { apiService, handleApiError, handleApiSuccess } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const ModelForm = ({ isOpen, onClose, onSuccess, model = null }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: model?.name || '',
    provider: model?.provider || 'azure_openai',
    model_name: model?.model_name || '',
    endpoint: model?.endpoint || '',
    api_key: model?.api_key || '',
    cost_per_token: model?.cost_per_token || 0.00003,
    parameters: {
      temperature: model?.parameters?.temperature || 0.7,
      max_tokens: model?.parameters?.max_tokens || 4000,
      top_p: model?.parameters?.top_p || 1.0,
      frequency_penalty: model?.parameters?.frequency_penalty || 0.0,
      presence_penalty: model?.parameters?.presence_penalty || 0.0,
    }
  });

  const [errors, setErrors] = useState({});

  const providers = [
    { value: 'azure_openai', label: 'Azure OpenAI' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
  ];

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('parameters.')) {
      const paramName = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        parameters: {
          ...prev.parameters,
          [paramName]: type === 'number' ? parseFloat(value) : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) : value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.model_name.trim()) {
      newErrors.model_name = 'Model name is required';
    }
    
    if (formData.provider === 'azure_openai' && !formData.endpoint.trim()) {
      newErrors.endpoint = 'Endpoint is required for Azure OpenAI';
    }
    
    if (!formData.api_key.trim()) {
      newErrors.api_key = 'API key is required';
    }
    
    if (formData.cost_per_token < 0) {
      newErrors.cost_per_token = 'Cost per token must be non-negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (model) {
        await apiService.models.update(model.id, formData);
        handleApiSuccess('Model updated successfully');
      } else {
        await apiService.models.create(formData);
        handleApiSuccess('Model created successfully');
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      handleApiError(error, `Failed to ${model ? 'update' : 'create'} model`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (model) {
      setFormData({
        name: model.name,
        provider: model.provider,
        model_name: model.model_name,
        endpoint: model.endpoint,
        api_key: model.api_key,
        cost_per_token: model.cost_per_token,
        parameters: model.parameters || {}
      });
    } else {
      setFormData({
        name: '',
        provider: 'azure_openai',
        model_name: '',
        endpoint: '',
        api_key: '',
        cost_per_token: 0.00003,
        parameters: {
          temperature: 0.7,
          max_tokens: 4000,
          top_p: 1.0,
          frequency_penalty: 0.0,
          presence_penalty: 0.0,
        }
      });
    }
    setErrors({});
  };

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, model]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-medium text-gray-900">
                    {model ? 'Edit Model' : 'Create New Model'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Model Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`form-input ${errors.name ? 'border-red-300' : ''}`}
                        placeholder="e.g., azure-gpt-4"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Provider *
                      </label>
                      <select
                        name="provider"
                        value={formData.provider}
                        onChange={handleChange}
                        className="form-select"
                      >
                        {providers.map(provider => (
                          <option key={provider.value} value={provider.value}>
                            {provider.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Model ID *
                      </label>
                      <input
                        type="text"
                        name="model_name"
                        value={formData.model_name}
                        onChange={handleChange}
                        className={`form-input ${errors.model_name ? 'border-red-300' : ''}`}
                        placeholder="e.g., gpt-4, claude-3"
                      />
                      {errors.model_name && (
                        <p className="mt-1 text-sm text-red-600">{errors.model_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cost per Token (USD)
                      </label>
                      <input
                        type="number"
                        name="cost_per_token"
                        value={formData.cost_per_token}
                        onChange={handleChange}
                        step="0.00001"
                        min="0"
                        className={`form-input ${errors.cost_per_token ? 'border-red-300' : ''}`}
                        placeholder="0.00003"
                      />
                      {errors.cost_per_token && (
                        <p className="mt-1 text-sm text-red-600">{errors.cost_per_token}</p>
                      )}
                    </div>
                  </div>

                  {/* API Configuration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Endpoint {formData.provider === 'azure_openai' && '*'}
                    </label>
                    <input
                      type="url"
                      name="endpoint"
                      value={formData.endpoint}
                      onChange={handleChange}
                      className={`form-input ${errors.endpoint ? 'border-red-300' : ''}`}
                      placeholder="https://your-resource.openai.azure.com/"
                    />
                    {errors.endpoint && (
                      <p className="mt-1 text-sm text-red-600">{errors.endpoint}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key *
                    </label>
                    <input
                      type="password"
                      name="api_key"
                      value={formData.api_key}
                      onChange={handleChange}
                      className={`form-input ${errors.api_key ? 'border-red-300' : ''}`}
                      placeholder="Enter your API key"
                    />
                    {errors.api_key && (
                      <p className="mt-1 text-sm text-red-600">{errors.api_key}</p>
                    )}
                  </div>

                  {/* Model Parameters */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-4">Model Parameters</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Temperature</label>
                        <input
                          type="number"
                          name="parameters.temperature"
                          value={formData.parameters.temperature}
                          onChange={handleChange}
                          step="0.1"
                          min="0"
                          max="2"
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Max Tokens</label>
                        <input
                          type="number"
                          name="parameters.max_tokens"
                          value={formData.parameters.max_tokens}
                          onChange={handleChange}
                          min="1"
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Top P</label>
                        <input
                          type="number"
                          name="parameters.top_p"
                          value={formData.parameters.top_p}
                          onChange={handleChange}
                          step="0.1"
                          min="0"
                          max="1"
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Frequency Penalty</label>
                        <input
                          type="number"
                          name="parameters.frequency_penalty"
                          value={formData.parameters.frequency_penalty}
                          onChange={handleChange}
                          step="0.1"
                          min="-2"
                          max="2"
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Presence Penalty</label>
                        <input
                          type="number"
                          name="parameters.presence_penalty"
                          value={formData.parameters.presence_penalty}
                          onChange={handleChange}
                          step="0.1"
                          min="-2"
                          max="2"
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-secondary"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <LoadingSpinner size="small" color="white" />
                      ) : (
                        model ? 'Update Model' : 'Create Model'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ModelForm;