// src/components/WorkflowDesigner.js - Complete drag & drop implementation
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  PlusIcon,
  PlayIcon,
  StopIcon,
  DocumentTextIcon,
  BoltIcon,
  CogIcon,
  TrashIcon,
  LinkIcon,
  XMarkIcon,
  CheckIcon,
  EyeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const WorkflowDesigner = ({ workflow, onSave, onClose }) => {
  const [nodes, setNodes] = useState(workflow?.nodes || []);
  const [connections, setConnections] = useState(workflow?.connections || []);
  const [selectedNode, setSelectedNode] = useState(null);
  const [draggedNode, setDraggedNode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [nodeCounter, setNodeCounter] = useState(1);
  
  const canvasRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Sample node types for the component palette
  const nodeTypes = [
    {
      id: 'start',
      type: 'start',
      name: 'Start',
      icon: PlayIcon,
      color: 'bg-green-100 border-green-300 text-green-700',
      description: 'Workflow entry point'
    },
    {
      id: 'input',
      type: 'input',
      name: 'Input',
      icon: DocumentTextIcon,
      color: 'bg-blue-100 border-blue-300 text-blue-700',
      description: 'Collect user input'
    },
    {
      id: 'agent',
      type: 'agent',
      name: 'Agent',
      icon: BoltIcon,
      color: 'bg-purple-100 border-purple-300 text-purple-700',
      description: 'Execute an AI agent'
    },
    {
      id: 'tool',
      type: 'tool',
      name: 'Tool',
      icon: CogIcon,
      color: 'bg-orange-100 border-orange-300 text-orange-700',
      description: 'Use a tool directly'
    },
    {
      id: 'end',
      type: 'end',
      name: 'End',
      icon: StopIcon,
      color: 'bg-red-100 border-red-300 text-red-700',
      description: 'Workflow exit point'
    }
  ];

  // Initialize with a start node if empty
  useEffect(() => {
    if (nodes.length === 0) {
      const startNode = {
        id: 'start-1',
        type: 'start',
        name: 'Start',
        position: { x: 100, y: 100 },
        data: {}
      };
      setNodes([startNode]);
      setNodeCounter(2);
    }
  }, [nodes.length]);

  // Handle drag start for palette items
  const handlePaletteDragStart = (e, nodeType) => {
    e.dataTransfer.setData('application/json', JSON.stringify(nodeType));
    setDraggedNode(nodeType);
  };

  // Handle drop on canvas
  const handleCanvasDrop = useCallback((e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - canvasOffset.x;
    const y = e.clientY - rect.top - canvasOffset.y;

    try {
      const nodeType = JSON.parse(e.dataTransfer.getData('application/json'));
      const newNode = {
        id: `${nodeType.type}-${nodeCounter}`,
        type: nodeType.type,
        name: `${nodeType.name} ${nodeCounter}`,
        position: { x: Math.max(0, x - 50), y: Math.max(0, y - 25) },
        data: {}
      };

      setNodes(prev => [...prev, newNode]);
      setNodeCounter(prev => prev + 1);
      setSelectedNode(newNode);
    } catch (error) {
      console.error('Failed to add node:', error);
    }
  }, [canvasOffset, nodeCounter]);

  // Handle node drag
  const handleNodeMouseDown = useCallback((e, node) => {
    if (isConnecting) return;
    
    e.preventDefault();
    setSelectedNode(node);
    setIsDragging(true);
    
    const rect = canvasRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left - node.position.x - canvasOffset.x,
      y: e.clientY - rect.top - node.position.y - canvasOffset.y
    };

    const handleMouseMove = (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragOffsetRef.current.x - canvasOffset.x;
      const newY = e.clientY - rect.top - dragOffsetRef.current.y - canvasOffset.y;

      setNodes(prev => prev.map(n => 
        n.id === node.id 
          ? { ...n, position: { x: Math.max(0, newX), y: Math.max(0, newY) } }
          : n
      ));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [canvasOffset, isConnecting]);

  // Handle connection creation
  const startConnection = (nodeId) => {
    setIsConnecting(true);
    setConnectionSource(nodeId);
  };

  const completeConnection = (targetNodeId) => {
    if (connectionSource && targetNodeId !== connectionSource) {
      const newConnection = {
        id: `conn-${connectionSource}-${targetNodeId}`,
        source: connectionSource,
        target: targetNodeId
      };

      setConnections(prev => {
        // Prevent duplicate connections
        const exists = prev.some(conn => 
          conn.source === connectionSource && conn.target === targetNodeId
        );
        return exists ? prev : [...prev, newConnection];
      });
    }
    
    setIsConnecting(false);
    setConnectionSource(null);
  };

  // Delete node
  const deleteNode = (nodeId) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.source !== nodeId && c.target !== nodeId));
    setSelectedNode(null);
  };

  // Delete connection
  const deleteConnection = (connectionId) => {
    setConnections(prev => prev.filter(c => c.id !== connectionId));
  };

  // Get node style
  const getNodeStyle = (node) => {
    const nodeType = nodeTypes.find(nt => nt.type === node.type);
    const isSelected = selectedNode?.id === node.id;
    
    return {
      left: node.position.x,
      top: node.position.y,
      className: `
        absolute w-24 h-16 rounded-lg border-2 cursor-pointer transition-all
        ${nodeType?.color || 'bg-gray-100 border-gray-300 text-gray-700'}
        ${isSelected ? 'ring-2 ring-blue-500 shadow-lg scale-105' : 'hover:shadow-md'}
        ${isConnecting && connectionSource !== node.id ? 'hover:ring-2 hover:ring-green-400' : ''}
      `
    };
  };

  // Render connection line
  const renderConnection = (connection) => {
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return null;

    const sourceX = sourceNode.position.x + 48; // Half of node width
    const sourceY = sourceNode.position.y + 32; // Half of node height
    const targetX = targetNode.position.x + 48;
    const targetY = targetNode.position.y + 32;

    // Calculate bezier curve control points
    const controlPointOffset = Math.abs(targetX - sourceX) * 0.5;
    const controlPoint1X = sourceX + controlPointOffset;
    const controlPoint1Y = sourceY;
    const controlPoint2X = targetX - controlPointOffset;
    const controlPoint2Y = targetY;

    const pathData = `M ${sourceX} ${sourceY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${targetX} ${targetY}`;

    return (
      <g key={connection.id}>
        <path
          d={pathData}
          stroke="#6b7280"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="hover:stroke-red-500 cursor-pointer"
          onClick={() => deleteConnection(connection.id)}
        />
        {/* Connection delete button */}
        <circle
          cx={(sourceX + targetX) / 2}
          cy={(sourceY + targetY) / 2}
          r="8"
          fill="white"
          stroke="#6b7280"
          strokeWidth="1"
          className="hover:fill-red-100 cursor-pointer"
          onClick={() => deleteConnection(connection.id)}
        />
        <XMarkIcon 
          x={(sourceX + targetX) / 2 - 4}
          y={(sourceY + targetY) / 2 - 4}
          width="8"
          height="8"
          className="pointer-events-none"
        />
      </g>
    );
  };

  // Save workflow
  const handleSave = () => {
    const workflowData = {
      ...workflow,
      nodes: nodes.map(node => ({
        ...node,
        position: { x: Math.round(node.position.x), y: Math.round(node.position.y) }
      })),
      connections,
      updated_at: new Date().toISOString()
    };
    onSave(workflowData);
  };

  // Validate workflow
  const validateWorkflow = () => {
    const errors = [];
    
    if (nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }
    
    const startNodes = nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push('Workflow must have a start node');
    }
    
    const endNodes = nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push('Workflow must have an end node');
    }

    // Check for orphaned nodes (except start nodes)
    const connectedNodeIds = new Set();
    connections.forEach(conn => {
      connectedNodeIds.add(conn.source);
      connectedNodeIds.add(conn.target);
    });

    const orphanedNodes = nodes.filter(n => 
      n.type !== 'start' && !connectedNodeIds.has(n.id)
    );
    
    if (orphanedNodes.length > 0) {
      errors.push(`${orphanedNodes.length} orphaned node(s) found`);
    }

    return errors;
  };

  const validationErrors = validateWorkflow();

  return (
    <div className="fixed inset-0 bg-white z-50 flex">
      {/* Component Palette */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Components</h3>
          <p className="text-sm text-gray-600">Drag to add to workflow</p>
        </div>
        
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          {nodeTypes.map((nodeType) => {
            const IconComponent = nodeType.icon;
            return (
              <div
                key={nodeType.id}
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, nodeType)}
                className={`
                  p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all
                  ${nodeType.color} hover:shadow-md
                `}
              >
                <div className="flex items-center space-x-2">
                  <IconComponent className="h-5 w-5" />
                  <div>
                    <div className="font-medium">{nodeType.name}</div>
                    <div className="text-xs opacity-75">{nodeType.description}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Node Properties Panel */}
        {selectedNode && (
          <div className="border-t p-4">
            <h4 className="font-medium text-gray-900 mb-2">Properties</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={selectedNode.name}
                  onChange={(e) => {
                    setNodes(prev => prev.map(n => 
                      n.id === selectedNode.id 
                        ? { ...n, name: e.target.value }
                        : n
                    ));
                    setSelectedNode(prev => ({ ...prev, name: e.target.value }));
                  }}
                  className="mt-1 w-full px-3 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="w-full btn-danger text-sm"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete Node
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BoltIcon className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {workflow ? `Edit: ${workflow.name}` : 'New Workflow'}
                </h1>
                <p className="text-sm text-gray-600">
                  Drag components from the palette to build your workflow
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {validationErrors.length > 0 && (
                <div className="text-sm text-red-600">
                  {validationErrors.length} error(s)
                </div>
              )}
              <button
                onClick={() => setIsConnecting(!isConnecting)}
                className={`btn-secondary ${isConnecting ? 'bg-blue-100 text-blue-700' : ''}`}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                {isConnecting ? 'Cancel Connect' : 'Connect Nodes'}
              </button>
              <button 
                onClick={handleSave}
                disabled={validationErrors.length > 0}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Save Workflow
              </button>
              <button onClick={onClose} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden bg-gray-100">
          <div
            ref={canvasRef}
            className="w-full h-full relative"
            onDrop={handleCanvasDrop}
            onDragOver={(e) => e.preventDefault()}
            style={{
              backgroundImage: `
                radial-gradient(circle, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: `${canvasOffset.x % 20}px ${canvasOffset.y % 20}px`
            }}
          >
            {/* SVG for connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#6b7280"
                  />
                </marker>
              </defs>
              {connections.map(renderConnection)}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => {
              const style = getNodeStyle(node);
              const nodeType = nodeTypes.find(nt => nt.type === node.type);
              const IconComponent = nodeType?.icon || BoltIcon;

              return (
                <div
                  key={node.id}
                  style={{
                    left: style.left,
                    top: style.top
                  }}
                  className={style.className}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onClick={() => {
                    if (isConnecting) {
                      if (connectionSource) {
                        completeConnection(node.id);
                      } else {
                        startConnection(node.id);
                      }
                    } else {
                      setSelectedNode(node);
                    }
                  }}
                >
                  <div className="flex flex-col items-center justify-center h-full p-1">
                    <IconComponent className="h-5 w-5 mb-1" />
                    <div className="text-xs font-medium text-center leading-tight">
                      {node.name}
                    </div>
                  </div>

                  {/* Connection handles */}
                  <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full opacity-0 hover:opacity-100 transition-opacity" />
                  <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full opacity-0 hover:opacity-100 transition-opacity" />
                </div>
              );
            })}

            {/* Instructions overlay when empty */}
            {nodes.length <= 1 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-gray-500">
                  <BoltIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Build Your Workflow</h3>
                  <p className="text-sm">
                    Drag components from the left panel to get started
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border-t border-red-200 p-4">
            <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h4>
            <ul className="text-sm text-red-600 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowDesigner;