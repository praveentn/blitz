// src/pages/PromptsPage.js
import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import CrudModal from '../components/CrudModal';

const PromptsPage = () => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create',
    item: null
  });

  const promptFields = [
    {
      key: 'name',
      label: 'Prompt Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Risk Analysis Prompt',
      description: 'Unique name for this prompt template'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Describe what this prompt does...',
      description: 'Brief description of the prompt\'s purpose'
    },
    {
      key: 'template',
      label: 'Prompt Template',
      type: 'textarea',
      required: true,
      placeholder: 'You are an expert analyst. Analyze the following: {input}...',
      description: 'The prompt text with variables in {brackets}'
    },
    {
      key: 'input_schema',
      label: 'Input Schema',
      type: 'json',
      default: '{\n  "type": "object",\n  "properties": {\n    "input": {\n      "type": "string",\n      "description": "Text to analyze"\n    }\n  },\n  "required": ["input"]\n}',
      description: 'JSON schema defining expected input structure'
    },
    {
      key: 'output_schema',
      label: 'Output Schema',
      type: 'json',
      default: '{\n  "type": "object",\n  "properties": {\n    "result": {\n      "type": "string",\n      "description": "Analysis result"\n    }\n  }\n}',
      description: 'JSON schema defining expected output structure'
    }
  ];

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/prompts');
      setPrompts(response.data || []);
    } catch (error) {
      handleApiError(error);
      setPrompts([]);
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
    loadPrompts();
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
            <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Prompt Management</h1>
              <p className="text-gray-600">Create and manage reusable prompt templates</p>
            </div>
          </div>
          <button onClick={() => openModal('create')} className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Prompt
          </button>
        </div>
      </div>

      {prompts.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No prompts configured</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first prompt template.</p>
          <div className="mt-6">
            <button onClick={() => openModal('create')} className="btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Prompt
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="card hover:shadow-lg transition-shadow">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{prompt.name}</h3>
                    <p className="text-sm text-gray-500">{prompt.description}</p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => openModal('edit', prompt)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit prompt"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openModal('delete', prompt)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete prompt"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="card-body">
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Template Preview:</span>
                    <div className="mt-1 p-3 bg-gray-50 border rounded text-sm font-mono max-h-32 overflow-y-auto">
                      {prompt.template.substring(0, 200)}
                      {prompt.template.length > 200 && '...'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Input Schema:</span>
                      <p className="text-sm text-gray-900">
                        {prompt.input_schema?.properties ? 
                          Object.keys(prompt.input_schema.properties).length + ' fields' : 
                          'Not defined'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Output Schema:</span>
                      <p className="text-sm text-gray-900">
                        {prompt.output_schema?.properties ? 
                          Object.keys(prompt.output_schema.properties).length + ' fields' : 
                          'Not defined'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card-footer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${prompt.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-500">
                      Version {prompt.version} • {prompt.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    Created {new Date(prompt.created_at).toLocaleDateString()}
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
        title="Prompt"
        mode={modalState.mode}
        item={modalState.item}
        fields={promptFields}
        endpoint="/prompts"
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default PromptsPage;
