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
      required: true,
      placeholder: 'Describe what this prompt does...',
      description: 'Clear description of the prompt\'s purpose and usage'
    },
    {
      key: 'template',
      label: 'Prompt Template',
      type: 'textarea',
      required: true,
      placeholder: 'You are an expert analyst. Analyze the following text for potential risks...\n\nText to analyze: {text}\n\nProvide your analysis in the following format:\n- Risk Score (1-10): \n- Issues Found: \n- Recommendations:',
      description: 'The actual prompt text. Use {variable_name} for placeholders.'
    },
    {
      key: 'input_schema',
      label: 'Input Schema',
      type: 'json',
      required: true,
      default: JSON.stringify({
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Text to analyze"
          }
        },
        required: ["text"]
      }, null, 2),
      description: 'JSON schema defining expected input parameters'
    },
    {
      key: 'output_schema',
      label: 'Output Schema',
      type: 'json',
      required: true,
      default: JSON.stringify({
        type: "object",
        properties: {
          risk_score: {
            type: "integer",
            minimum: 1,
            maximum: 10,
            description: "Risk score from 1-10"
          },
          issues_found: {
            type: "array",
            items: {
              type: "string"
            },
            description: "List of identified issues"
          },
          recommendations: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Recommended actions"
          }
        },
        required: ["risk_score"]
      }, null, 2),
      description: 'JSON schema defining expected output structure'
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'analysis', label: 'Analysis' },
        { value: 'generation', label: 'Content Generation' },
        { value: 'classification', label: 'Classification' },
        { value: 'extraction', label: 'Data Extraction' },
        { value: 'summarization', label: 'Summarization' },
        { value: 'other', label: 'Other' }
      ],
      description: 'Prompt category for organization'
    }
  ];

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const response = await apiService.prompts.list();
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">No prompts</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new prompt template.</p>
          <div className="mt-6">
            <button onClick={() => openModal('create')} className="btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Prompt
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">{prompt.name}</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openModal('edit', prompt)}
                      className="text-gray-400 hover:text-blue-600"
                      title="Edit prompt"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => openModal('delete', prompt)}
                      className="text-gray-400 hover:text-red-600"
                      title="Delete prompt"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="card-body">
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {prompt.description}
                </p>
                
                {prompt.category && (
                  <div className="mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {prompt.category}
                    </span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 w-20">Template:</span>
                    <span className="text-gray-900 font-mono text-xs truncate">
                      {prompt.template?.substring(0, 50)}...
                    </span>
                  </div>
                  
                  {prompt.input_schema && (
                    <div className="flex items-start text-sm">
                      <span className="text-gray-500 w-20 flex-shrink-0">Inputs:</span>
                      <div className="text-xs">
                        {Object.keys(prompt.input_schema.properties || {}).length > 0 ? (
                          <div className="space-y-1">
                            {Object.entries(prompt.input_schema.properties || {}).slice(0, 2).map(([key, schema]) => (
                              <div key={key} className="flex items-center">
                                <span className="font-mono text-gray-600">{key}</span>
                                <span className="ml-2 text-gray-500">({schema.type})</span>
                              </div>
                            ))}
                            {Object.keys(prompt.input_schema.properties || {}).length > 2 && (
                              <p className="text-gray-500">+{Object.keys(prompt.input_schema.properties).length - 2} more...</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">No inputs defined</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {prompt.output_schema && (
                    <div className="flex items-start text-sm">
                      <span className="text-gray-500 w-20 flex-shrink-0">Outputs:</span>
                      <div className="text-xs">
                        {Object.keys(prompt.output_schema.properties || {}).length > 0 ? (
                          <div className="space-y-1">
                            {Object.entries(prompt.output_schema.properties || {}).slice(0, 2).map(([key, schema]) => (
                              <div key={key} className="flex items-center">
                                <span className="font-mono text-gray-600">{key}</span>
                                <span className="ml-2 text-gray-500">({schema.type})</span>
                              </div>
                            ))}
                            {Object.keys(prompt.output_schema.properties || {}).length > 2 && (
                              <p className="text-gray-500">+{Object.keys(prompt.output_schema.properties).length - 2} more...</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">No outputs defined</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="card-footer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${prompt.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-500">
                      {prompt.is_active ? 'Active' : 'Inactive'}
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