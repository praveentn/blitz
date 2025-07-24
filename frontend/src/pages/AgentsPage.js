// src/pages/AgentsPage.js
import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
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

  // Dynamic agent fields that will be populated with model/prompt options
  const [agentFields, setAgentFields] = useState([
    {
      key: 'name',
      label: 'Agent Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Risk Analysis Agent',
      description: 'Descriptive name for this agent'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      required: true,
      placeholder: 'Describe what this agent does...',
      description: 'Clear description of the agent\'s purpose and capabilities'
    },
    {
      key: 'model_id',
      label: 'Model',
      type: 'select',
      required: true,
      options: [],
      description: 'LLM model this agent will use'
    },
    {
      key: 'prompt_id',
      label: 'Prompt Template',
      type: 'select',
      required: true,
      options: [],
      description: 'Prompt template that defines agent behavior'
    },
    {
      key: 'parameters',
      label: 'Agent Parameters',
      type: 'json',
      default: JSON.stringify({
        temperature: 0.7,
        max_tokens: 1000,
        max_iterations: 5
      }, null, 2),
      description: 'JSON configuration for agent parameters'
    },
    {
      key: 'memory_config',
      label: 'Memory Configuration',
      type: 'json',
      default: JSON.stringify({
        type: "buffer",
        max_messages: 10,
        include_context: true
      }, null, 2),
      description: 'Memory settings for conversation history'
    },
    {
      key: 'is_active',
      label: 'Active',
      type: 'checkbox',
      default: true,
      description: 'Whether this agent is active and available for use'
    }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all required data in parallel
      const [agentsRes, modelsRes, promptsRes, toolsRes] = await Promise.all([
        apiService.agents.list(),
        apiService.models.list(),
        apiService.prompts.list(),
        apiService.tools.list()
      ]);
      
      setAgents(agentsRes.data || []);
      setModels(modelsRes.data || []);
      setPrompts(promptsRes.data || []);
      setTools(toolsRes.data || []);
      
      // Update field options dynamically
      setAgentFields(prevFields => {
        const updatedFields = [...prevFields];
        
        // Update model options
        const modelFieldIndex = updatedFields.findIndex(f => f.key === 'model_id');
        if (modelFieldIndex !== -1) {
          updatedFields[modelFieldIndex].options = [
            { value: '', label: 'Select Model' },
            ...(modelsRes.data || []).map(model => ({
              value: model.id,
              label: model.name
            }))
          ];
        }
        
        // Update prompt options
        const promptFieldIndex = updatedFields.findIndex(f => f.key === 'prompt_id');
        if (promptFieldIndex !== -1) {
          updatedFields[promptFieldIndex].options = [
            { value: '', label: 'Select Prompt' },
            ...(promptsRes.data || []).map(prompt => ({
              value: prompt.id,
              label: prompt.name
            }))
          ];
        }
        
        return updatedFields;
      });
      
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

  const getAgentTools = (agentId) => {
    // This would typically come from the agent data with tool relationships
    // For now, we'll return a placeholder
    return tools.filter(tool => tool.is_active).slice(0, 3);
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.id} className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <UserIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="ml-3 text-lg font-medium text-gray-900">{agent.name}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openModal('edit', agent)}
                      className="text-gray-400 hover:text-blue-600"
                      title="Edit agent"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => openModal('delete', agent)}
                      className="text-gray-400 hover:text-red-600"
                      title="Delete agent"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="card-body">
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {agent.description}
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <CpuChipIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-500 w-16">Model:</span>
                    <span className="font-medium text-gray-900">{getModelName(agent.model_id)}</span>
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-500 w-16">Prompt:</span>
                    <span className="font-medium text-gray-900 truncate">{getPromptName(agent.prompt_id)}</span>
                  </div>
                  
                  <div className="flex items-start text-sm">
                    <WrenchScrewdriverIcon className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                    <span className="text-gray-500 w-16">Tools:</span>
                    <div className="flex-1">
                      {getAgentTools(agent.id).length > 0 ? (
                        <div className="space-y-1">
                          {getAgentTools(agent.id).slice(0, 2).map((tool) => (
                            <div key={tool.id} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {tool.name}
                            </div>
                          ))}
                          {getAgentTools(agent.id).length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{getAgentTools(agent.id).length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">No tools configured</span>
                      )}
                    </div>
                  </div>
                  
                  {agent.parameters && Object.keys(agent.parameters).length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-sm font-medium text-gray-500 mb-2 block">Parameters:</span>
                      <div className="space-y-1">
                        {Object.entries(agent.parameters).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="text-gray-500 capitalize">{key}:</span>
                            <span className="text-gray-900 font-mono">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                        {Object.keys(agent.parameters).length > 3 && (
                          <p className="text-xs text-gray-500">+{Object.keys(agent.parameters).length - 3} more...</p>
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