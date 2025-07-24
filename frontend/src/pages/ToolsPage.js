// src/pages/ToolsPage.js
import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  CalculatorIcon,
  DocumentIcon,
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
        { value: 'custom', label: 'Custom Python Function' },
        { value: 'api', label: 'API Integration' },
        { value: 'file', label: 'File Operation' },
        { value: 'web', label: 'Web Tool' }
      ],
      description: 'Type of tool implementation'
    },
    {
      key: 'implementation',
      label: 'Implementation',
      type: 'textarea',
      placeholder: 'Python code, API endpoint, or configuration...',
      description: 'Tool implementation code or configuration (for custom tools)'
    },
    {
      key: 'parameters_schema',
      label: 'Parameters Schema',
      type: 'json',
      required: true,
      default: JSON.stringify({
        type: "object",
        properties: {
          input: {
            type: "string",
            description: "Input parameter"
          }
        },
        required: ["input"]
      }, null, 2),
      description: 'JSON schema for tool input parameters'
    },
    {
      key: 'output_schema',
      label: 'Output Schema',
      type: 'json',
      required: true,
      default: JSON.stringify({
        type: "object",
        properties: {
          result: {
            type: "string",
            description: "Tool output"
          }
        }
      }, null, 2),
      description: 'JSON schema for tool output'
    },
    {
      key: 'is_active',
      label: 'Active',
      type: 'checkbox',
      default: true,
      description: 'Whether this tool is active and available for use'
    }
  ];

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      setLoading(true);
      const response = await apiService.tools.list();
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
      case 'web':
        return <GlobeAltIcon className="h-5 w-5 text-blue-500" />;
      case 'api':
        return <CodeBracketIcon className="h-5 w-5 text-green-500" />;
      case 'file':
        return <DocumentIcon className="h-5 w-5 text-purple-500" />;
      case 'builtin':
        return <CalculatorIcon className="h-5 w-5 text-orange-500" />;
      default:
        return <WrenchScrewdriverIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getToolTypeBadge = (toolType) => {
    const badges = {
      builtin: 'bg-orange-100 text-orange-800',
      custom: 'bg-blue-100 text-blue-800',
      api: 'bg-green-100 text-green-800',
      file: 'bg-purple-100 text-purple-800',
      web: 'bg-blue-100 text-blue-800'
    };
    
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[toolType] || badges.custom}`;
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
              <p className="text-gray-600">Manage tools that agents can use to perform actions</p>
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tools available</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first tool.</p>
          <div className="mt-6">
            <button onClick={() => openModal('create')} className="btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Tool
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <div key={tool.id} className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getToolIcon(tool.tool_type)}
                    <h3 className="ml-3 text-lg font-medium text-gray-900">{tool.name}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openModal('edit', tool)}
                      className="text-gray-400 hover:text-blue-600"
                      title="Edit tool"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => openModal('delete', tool)}
                      className="text-gray-400 hover:text-red-600"
                      title="Delete tool"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="card-body">
                <div className="mb-3">
                  <span className={getToolTypeBadge(tool.tool_type)}>
                    {tool.tool_type}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {tool.description}
                </p>
                
                <div className="space-y-2">
                  {tool.parameters_schema && Object.keys(tool.parameters_schema.properties || {}).length > 0 && (
                    <div className="flex items-start text-sm">
                      <span className="text-gray-500 w-20 flex-shrink-0">Inputs:</span>
                      <div className="text-xs">
                        <div className="space-y-1">
                          {Object.entries(tool.parameters_schema.properties || {}).slice(0, 2).map(([key, schema]) => (
                            <div key={key} className="flex items-center">
                              <span className="font-mono text-gray-600">{key}</span>
                              <span className="ml-2 text-gray-500">({schema.type})</span>
                            </div>
                          ))}
                          {Object.keys(tool.parameters_schema.properties || {}).length > 2 && (
                            <p className="text-gray-500">+{Object.keys(tool.parameters_schema.properties).length - 2} more...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {tool.output_schema && Object.keys(tool.output_schema.properties || {}).length > 0 && (
                    <div className="flex items-start text-sm">
                      <span className="text-gray-500 w-20 flex-shrink-0">Outputs:</span>
                      <div className="text-xs">
                        <div className="space-y-1">
                          {Object.entries(tool.output_schema.properties || {}).slice(0, 2).map(([key, schema]) => (
                            <div key={key} className="flex items-center">
                              <span className="font-mono text-gray-600">{key}</span>
                              <span className="ml-2 text-gray-500">({schema.type})</span>
                            </div>
                          ))}
                          {Object.keys(tool.output_schema.properties || {}).length > 2 && (
                            <p className="text-gray-500">+{Object.keys(tool.output_schema.properties).length - 2} more...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {tool.implementation && tool.tool_type === 'custom' && (
                    <div className="mt-3">
                      <span className="text-sm text-gray-500">Implementation:</span>
                      <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono text-gray-700 max-h-20 overflow-hidden">
                        {tool.implementation.substring(0, 100)}...
                      </div>
                    </div>
                  )}
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