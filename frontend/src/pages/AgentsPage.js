// src/pages/AgentsPage.js
import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  CpuChipIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import CrudModal from '../components/CrudModal';

const AgentsPage = () => {
  const [agents, setAgents] = useState([]);
  const [models, setModels] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create',
    item: null
  });

  const agentFields = [
    {
      key: 'name',
      label: 'Agent Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Research Assistant',
      description: 'Unique name for this agent'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Describe what this agent does...',
      description: 'Brief description of the agent\'s purpose'
    },
    {
      key: 'model_id',
      label: 'Model',
      type: 'select',
      required: true,
      options: [], // Will be populated dynamically
      description: 'LLM model this agent will use'
    },
    {
      key: 'prompt_id',
      label: 'Prompt Template',
      type: 'select',
      required: true,
      options: [], // Will be populated dynamically
      description: 'Prompt template defining agent behavior'
    },
    {
      key: 'parameters',
      label: 'Agent Parameters',
      type: 'json',
      default: '{\n  "temperature": 0.7,\n  "max_tokens": 2000,\n  "timeout": 300\n}',
      description: 'JSON configuration for agent parameters'
    },
    {
      key: 'memory_config',
      label: 'Memory Configuration',
      type: 'json',
      default: '{\n  "type": "conversation",\n  "max_messages": 10\n}',
      description: 'Memory settings for conversation history'
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all necessary data
      const [agentsRes, modelsRes, promptsRes, toolsRes] = await Promise.all([
        apiService.get('/agents'),
        apiService.get('/models'),
        apiService.get('/prompts'),
        apiService.get('/tools')
      ]);
      
      setAgents(agentsRes.data || []);
      setModels(modelsRes.data || []);
      setPrompts(promptsRes.data || []);
      setTools(toolsRes.data || []);
      
      // Update field options
      agentFields[2].options = [
        { value: '', label: 'Select Model' },
        ...(modelsRes.data || []).map(model => ({
          value: model.id,
          label: model.name
        }))
      ];
      
      agentFields[3].options = [
        { value: '', label: 'Select Prompt' },
        ...(promptsRes.data || []).map(prompt => ({
          value: prompt.id,
          label: prompt.name
        }))
      ];
      
    } catch (error) {
      handleApiError(error);
      setAgents([]);
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
    loadData();
  };

  const getModelName = (modelId) => {
    const model = models.find(m => m.id === modelId);
    return model ? model.name : 'Unknown Model';
  };

  const getPromptName = (promptId) => {
    const prompt = prompts.find(p => p.id === promptId);
    return prompt ? prompt.name : 'Unknown Prompt';
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
            <UserIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agent Management</h1>
              <p className="text-gray-600">Create and configure AI agents for your workflows</p>
            </div>
          </div>
          <button onClick={() => openModal('create')} className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Agent
          </button>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No agents configured</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first AI agent.</p>
          <div className="mt-6">
            <button onClick={() => openModal('create')} className="btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Agent
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.id} className="card hover:shadow-lg transition-shadow">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <UserIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{agent.name}</h3>
                      <p className="text-sm text-gray-500">Agent</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => openModal('edit', agent)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit agent"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openModal('delete', agent)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete agent"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="card-body">
                <div className="space-y-3">
                  {agent.description && (
                    <div>
                      <p className="text-sm text-gray-700">{agent.description}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <CpuChipIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-500">Model:</span>
                      <span className="ml-2 font-medium">{getModelName(agent.model_id)}</span>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-500">Prompt:</span>
                      <span className="ml-2 font-medium">{getPromptName(agent.prompt_id)}</span>
                    </div>
                    
                    {agent.tools && agent.tools.length > 0 && (
                      <div className="flex items-center text-sm">
                        <WrenchScrewdriverIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-500">Tools:</span>
                        <span className="ml-2 font-medium">{agent.tools.length} configured</span>
                      </div>
                    )}
                  </div>
                  
                  {agent.parameters && Object.keys(agent.parameters).length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Parameters:</span>
                      <div className="mt-1 space-y-1">
                        {Object.entries(agent.parameters).slice(0, 2).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="text-gray-500">{key}:</span>
                            <span className="text-gray-900 font-mono">{String(value)}</span>
                          </div>
                        ))}
                        {Object.keys(agent.parameters).length > 2 && (
                          <p className="text-xs text-gray-500">+{Object.keys(agent.parameters).length - 2} more...</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="card-footer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${agent.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-500">
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    Created {new Date(agent.created_at).toLocaleDateString()}
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
        title="Agent"
        mode={modalState.mode}
        item={modalState.item}
        fields={agentFields}
        endpoint="/agents"
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default AgentsPage;