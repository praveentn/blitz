// src/pages/ToolsPage.js
import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import CrudModal from '../components/CrudModal';

const ToolsPage = () => {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create',
    item: null
  });

  const toolFields = [
    {
      key: 'name',
      label: 'Tool Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Web Search Tool',
      description: 'Unique name for this tool'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      required: true,
      placeholder: 'Describe what this tool does...',
      description: 'Clear description of the tool\'s functionality'
    },
    {
      key: 'tool_type',
      label: 'Tool Type',
      type: 'select',
      required: true,
      options: [
        { value: 'builtin', label: 'Built-in Tool' },
        { value: 'custom', label: 'Custom Tool' },
        { value: 'api', label: 'API Integration' },
        { value: 'python', label: 'Python Function' }
      ],
      description: 'Type of tool implementation'
    },
    {
      key: 'implementation',
      label: 'Implementation',
      type: 'textarea',
      placeholder: 'Python code, API endpoint, or configuration...',
      description: 'Tool implementation code or configuration'
    },
    {
      key: 'parameters_schema',
      label: 'Parameters Schema',
      type: 'json',
      default: '{\n  "type": "object",\n  "properties": {\n    "input": {\n      "type": "string",\n      "description": "Input parameter"\n    }\n  },\n  "required": ["input"]\n}',
      description: 'JSON schema for tool input parameters'
    },
    {
      key: 'output_schema',
      label: 'Output Schema',
      type: 'json',
      default: '{\n  "type": "object",\n  "properties": {\n    "result": {\n      "type": "string",\n      "description": "Tool output"\n    }\n  }\n}',
      description: 'JSON schema for tool output'
    }
  ];

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/tools');
      setTools(response.data || []);
    } catch (error) {
      handleApiError(error);
      setTools([]);
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
    loadTools();
  };

  const getToolIcon = (toolType) => {
    switch (toolType) {
      case 'builtin':
        return '🔧';
      case 'custom':
        return '⚙️';
      case 'api':
        return '🌐';
      case 'python':
        return '🐍';
      default:
        return '❓';
    }
  };

  const getToolTypeLabel = (toolType) => {
    switch (toolType) {
      case 'builtin':
        return 'Built-in';
      case 'custom':
        return 'Custom';
      case 'api':
        return 'API';
      case 'python':
        return 'Python';
      default:
        return toolType;
    }
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
            <WrenchScrewdriverIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tool Management</h1>
              <p className="text-gray-600">Manage tools and integrations for your agents</p>
            </div>
          </div>
          <button onClick={() => openModal('create')} className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Tool
          </button>
        </div>
      </div>

      {tools.length === 0 ? (
        <div className="text-center py-12">
          <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tools configured</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first tool.</p>
          <div className="mt-6">
            <button onClick={() => openModal('create')} className="btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Tool
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {tools.map((tool) => (
            <div key={tool.id} className="card hover:shadow-lg transition-shadow">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getToolIcon(tool.tool_type)}</span>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{tool.name}</h3>
                      <p className="text-sm text-gray-500">{getToolTypeLabel(tool.tool_type)}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => openModal('edit', tool)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit tool"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openModal('delete', tool)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete tool"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="card-body">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-700">{tool.description}</p>
                  </div>
                  
                  {tool.implementation && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Implementation:</span>
                      <div className="mt-1 p-3 bg-gray-50 border rounded text-sm font-mono max-h-24 overflow-y-auto">
                        {tool.implementation.substring(0, 150)}
                        {tool.implementation.length > 150 && '...'}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Parameters:</span>
                      <p className="text-sm text-gray-900">
                        {tool.parameters_schema?.properties ? 
                          Object.keys(tool.parameters_schema.properties).length + ' params' : 
                          'Not defined'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Output:</span>
                      <p className="text-sm text-gray-900">
                        {tool.output_schema?.properties ? 
                          Object.keys(tool.output_schema.properties).length + ' fields' : 
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
                    <div className={`w-2 h-2 rounded-full mr-2 ${tool.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-500">
                      {tool.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    Created {new Date(tool.created_at).toLocaleDateString()}
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
        title="Tool"
        mode={modalState.mode}
        item={modalState.item}
        fields={toolFields}
        endpoint="/tools"
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default ToolsPage;
