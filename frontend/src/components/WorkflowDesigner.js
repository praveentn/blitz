// src/components/WorkflowDesigner.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PlayIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  CogIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError, handleApiSuccess } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const WorkflowDesigner = ({ workflowId, onSave, onClose }) => {
  const [workflow, setWorkflow] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dragNode, setDragNode] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  // Node types with their properties
  const nodeTypes = {
    start: {
      name: 'Start',
      color: 'bg-green-500',
      icon: '▶️',
      inputs: 0,
      outputs: 1,
      width: 100,
      height: 60
    },
    agent: {
      name: 'Agent',
      color: 'bg-blue-500',
      icon: '🤖',
      inputs: 1,
      outputs: 1,
      width: 120,
      height: 80
    },
    input: {
      name: 'Input',
      color: 'bg-purple-500',
      icon: '📥',
      inputs: 0,
      outputs: 1,
      width: 100,
      height: 60
    },
    decision: {
      name: 'Decision',
      color: 'bg-yellow-500',
      icon: '❓',
      inputs: 1,
      outputs: 2,
      width: 100,
      height: 80
    },
    end: {
      name: 'End',
      color: 'bg-red-500',
      icon: '⏹️',
      inputs: 1,
      outputs: 0,
      width: 100,
      height: 60
    }
  };

  useEffect(() => {
    loadData();
  }, [workflowId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      setCanvasOffset({ x: rect.left, y: rect.top });
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load agents for agent nodes
      const agentsResponse = await apiService.get('/agents');
      setAgents(agentsResponse.data || []);
      
      if (workflowId) {
        // Load existing workflow
        const workflowResponse = await apiService.get(`/workflows/${workflowId}`);
        const workflowData = workflowResponse.data;
        
        setWorkflow(workflowData);
        setNodes(workflowData.nodes || []);
        setConnections(workflowData.connections || []);
      } else {
        // New workflow - start with a start node
        const startNode = {
          id: 'start-1',
          type: 'start',
          x: 100,
          y: 100,
          config: {}
        };
        setNodes([startNode]);
        setConnections([]);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const addNode = useCallback((type, x = 200, y = 200) => {
    const nodeId = `${type}-${Date.now()}`;
    const newNode = {
      id: nodeId,
      type,
      x,
      y,
      config: type === 'agent' ? { agent_id: null } : {}
    };
    
    setNodes(prev => [...prev, newNode]);
    setSelectedNode(newNode);
  }, []);

  const deleteNode = useCallback((nodeId) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  const updateNodeConfig = useCallback((nodeId, config) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, config: { ...node.config, ...config } } : node
    ));
  }, []);

  const handleMouseDown = useCallback((e, node) => {
    e.preventDefault();
    setDragNode({ node, offset: { x: e.clientX - node.x, y: e.clientY - node.y } });
    setSelectedNode(node);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (dragNode) {
      const newX = e.clientX - dragNode.offset.x;
      const newY = e.clientY - dragNode.offset.y;
      
      setNodes(prev => prev.map(node => 
        node.id === dragNode.node.id 
          ? { ...node, x: Math.max(0, newX), y: Math.max(0, newY) }
          : node
      ));
    }
  }, [dragNode]);

  const handleMouseUp = useCallback(() => {
    setDragNode(null);
  }, []);

  useEffect(() => {
    if (dragNode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragNode, handleMouseMove, handleMouseUp]);

  const startConnection = useCallback((nodeId, isOutput = true) => {
    setConnecting({ from: isOutput ? nodeId : null, to: isOutput ? null : nodeId });
  }, []);

  const completeConnection = useCallback((nodeId, isOutput = false) => {
    if (connecting) {
      const newConnection = {
        id: `conn-${Date.now()}`,
        from: connecting.from || nodeId,
        to: connecting.to || nodeId,
        output_index: 0,
        input_index: 0
      };
      
      // Validate connection (no self-loops, valid flow)
      if (newConnection.from !== newConnection.to) {
        const existingConnection = connections.find(c => 
          c.from === newConnection.from && c.to === newConnection.to
        );
        
        if (!existingConnection) {
          setConnections(prev => [...prev, newConnection]);
        }
      }
      
      setConnecting(null);
    }
  }, [connecting, connections]);

  const deleteConnection = useCallback((connectionId) => {
    setConnections(prev => prev.filter(c => c.id !== connectionId));
  }, []);

  const saveWorkflow = async () => {
    try {
      const workflowData = {
        name: workflow?.name || 'New Workflow',
        description: workflow?.description || '',
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          x: Math.round(node.x),
          y: Math.round(node.y),
          config: node.config
        })),
        connections: connections.map(conn => ({
          from: conn.from,
          to: conn.to,
          output_index: conn.output_index || 0,
          input_index: conn.input_index || 0
        }))
      };

      let response;
      if (workflowId) {
        response = await apiService.put(`/workflows/${workflowId}`, workflowData);
      } else {
        response = await apiService.post('/workflows', workflowData);
      }

      handleApiSuccess('Workflow saved successfully');
      if (onSave) onSave(response.data);
    } catch (error) {
      handleApiError(error);
    }
  };

  const executeWorkflow = async () => {
    if (!workflowId) {
      handleApiError({ message: 'Please save the workflow before executing' });
      return;
    }

    try {
      const response = await apiService.post(`/workflows/${workflowId}/execute`);
      handleApiSuccess('Workflow execution started');
      // Could redirect to execution monitor here
    } catch (error) {
      handleApiError(error);
    }
  };

  const renderNode = (node) => {
    const nodeType = nodeTypes[node.type];
    const isSelected = selectedNode?.id === node.id;
    
    return (
      <div
        key={node.id}
        className={`absolute cursor-move select-none border-2 rounded-lg shadow-lg ${
          isSelected ? 'border-blue-500' : 'border-gray-200'
        } bg-white`}
        style={{
          left: node.x,
          top: node.y,
          width: nodeType.width,
          height: nodeType.height,
          transform: `scale(${scale})`
        }}
        onMouseDown={(e) => handleMouseDown(e, node)}
      >
        {/* Node Header */}
        <div className={`${nodeType.color} text-white px-2 py-1 rounded-t-lg text-sm font-medium flex items-center`}>
          <span className="mr-1">{nodeType.icon}</span>
          {nodeType.name}
          {node.type !== 'start' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteNode(node.id);
              }}
              className="ml-auto text-white hover:text-red-200"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Node Body */}
        <div className="p-2 text-xs">
          {node.type === 'agent' && (
            <div>
              <select
                value={node.config.agent_id || ''}
                onChange={(e) => updateNodeConfig(node.id, { agent_id: e.target.value })}
                className="w-full text-xs border rounded px-1 py-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Select Agent</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>
          )}
          {node.type === 'input' && (
            <input
              type="text"
              placeholder="Input name"
              value={node.config.name || ''}
              onChange={(e) => updateNodeConfig(node.id, { name: e.target.value })}
              className="w-full text-xs border rounded px-1 py-0.5"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>

        {/* Connection Points */}
        {nodeType.inputs > 0 && (
          <div
            className="absolute w-3 h-3 bg-gray-400 rounded-full border-2 border-white cursor-pointer hover:bg-blue-500"
            style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }}
            onClick={() => completeConnection(node.id, false)}
          />
        )}
        {nodeType.outputs > 0 && (
          <div
            className="absolute w-3 h-3 bg-gray-400 rounded-full border-2 border-white cursor-pointer hover:bg-blue-500"
            style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }}
            onClick={() => startConnection(node.id, true)}
          />
        )}
      </div>
    );
  };

  const renderConnection = (connection) => {
    const fromNode = nodes.find(n => n.id === connection.from);
    const toNode = nodes.find(n => n.id === connection.to);
    
    if (!fromNode || !toNode) return null;
    
    const fromType = nodeTypes[fromNode.type];
    const toType = nodeTypes[toNode.type];
    
    const x1 = fromNode.x + fromType.width;
    const y1 = fromNode.y + fromType.height / 2;
    const x2 = toNode.x;
    const y2 = toNode.y + toType.height / 2;
    
    const midX = (x1 + x2) / 2;
    
    return (
      <g key={connection.id}>
        <path
          d={`M ${x1} ${y1} C ${midX} ${y1} ${midX} ${y2} ${x2} ${y2}`}
          stroke="#6b7280"
          strokeWidth="2"
          fill="none"
          className="hover:stroke-blue-500 cursor-pointer"
          onClick={() => deleteConnection(connection.id)}
        />
        <circle
          cx={midX}
          cy={(y1 + y2) / 2}
          r="4"
          fill="#6b7280"
          className="hover:fill-red-500 cursor-pointer"
          onClick={() => deleteConnection(connection.id)}
        />
      </g>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium">
              {workflow?.name || 'New Workflow'}
            </h2>
            <div className="flex space-x-2">
              {Object.entries(nodeTypes).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => addNode(type, 200 + Math.random() * 200, 200 + Math.random() * 200)}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                  disabled={type === 'start' && nodes.some(n => n.type === 'start')}
                >
                  <span>{config.icon}</span>
                  <span>{config.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={saveWorkflow}
              className="btn-primary"
            >
              Save Workflow
            </button>
            {workflowId && (
              <button
                onClick={executeWorkflow}
                className="btn-secondary"
              >
                <PlayIcon className="h-4 w-4 mr-1" />
                Execute
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={canvasRef}
          className="w-full h-full relative bg-gray-100"
          style={{
            backgroundImage: `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        >
          {/* SVG for connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {connections.map(renderConnection)}
          </svg>
          
          {/* Nodes */}
          {nodes.map(renderNode)}
          
          {/* Instructions */}
          {nodes.length <= 1 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-500">
                <h3 className="text-lg font-medium mb-2">Build Your Workflow</h3>
                <p className="text-sm">Add nodes from the toolbar above and connect them to create your AI workflow</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <div className="absolute right-4 top-20 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Node Properties</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <p className="text-sm text-gray-900">{nodeTypes[selectedNode.type].name}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Position</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={Math.round(selectedNode.x)}
                  onChange={(e) => {
                    const newNodes = nodes.map(n => 
                      n.id === selectedNode.id ? { ...n, x: Number(e.target.value) } : n
                    );
                    setNodes(newNodes);
                    setSelectedNode({ ...selectedNode, x: Number(e.target.value) });
                  }}
                  className="form-input text-sm"
                  placeholder="X"
                />
                <input
                  type="number"
                  value={Math.round(selectedNode.y)}
                  onChange={(e) => {
                    const newNodes = nodes.map(n => 
                      n.id === selectedNode.id ? { ...n, y: Number(e.target.value) } : n
                    );
                    setNodes(newNodes);
                    setSelectedNode({ ...selectedNode, y: Number(e.target.value) });
                  }}
                  className="form-input text-sm"
                  placeholder="Y"
                />
              </div>
            </div>
            
            {selectedNode.type === 'agent' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Agent</label>
                <select
                  value={selectedNode.config.agent_id || ''}
                  onChange={(e) => updateNodeConfig(selectedNode.id, { agent_id: e.target.value })}
                  className="form-select text-sm"
                >
                  <option value="">Select Agent</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowDesigner;