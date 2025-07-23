# backend/services.py
import os
import json
import time
import threading
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from concurrent.futures import ThreadPoolExecutor, Future
import requests
from openai import AzureOpenAI
from flask import current_app, request
import re
import tempfile
from pathlib import Path

from models import db, User, Model, Prompt, Tool, Agent, Workflow, WorkflowNode, WorkflowConnection, Execution, ExecutionStep, LLMCall, Cost, AuditLog

class LLMService:
    """Service for handling LLM interactions"""
    
    def __init__(self, config):
        self.config = config
        self.clients = {}
        self._init_clients()
    
    def _init_clients(self):
        """Initialize LLM clients"""
        try:
            azure_config = self.config.get('LLM_CONFIG', {}).get('azure', {})
            api_key = os.environ.get('AZURE_OPENAI_API_KEY') or azure_config.get('api_key')
            endpoint = os.environ.get('AZURE_OPENAI_ENDPOINT') or azure_config.get('endpoint')
            
            # Check if we have valid configuration
            if (api_key and api_key != 'your-azure-openai-api-key' and 
                endpoint and endpoint != 'https://your-resource.openai.azure.com/'):
                
                self.clients['azure_openai'] = AzureOpenAI(
                    api_key=api_key,
                    azure_endpoint=endpoint,
                    api_version=azure_config.get('api_version', '2024-02-01')
                )
                print("✅ Azure OpenAI client initialized")
            else:
                print("⚠️ Azure OpenAI configuration missing - using mock responses for testing")
                self.clients['azure_openai'] = None
        except Exception as e:
            print(f"❌ Error initializing LLM clients: {e}")
            self.clients['azure_openai'] = None
    
    def call_llm(self, model: Model, prompt: str, parameters: Dict = None) -> Dict[str, Any]:
        """Make a call to the LLM"""
        start_time = time.time()
        
        try:
            if model.provider == 'azure_openai':
                return self._call_azure_openai(model, prompt, parameters or {})
            else:
                raise ValueError(f"Unsupported provider: {model.provider}")
                
        except Exception as e:
            duration = time.time() - start_time
            return {
                'success': False,
                'response': '',
                'error': str(e),
                'prompt_tokens': 0,
                'completion_tokens': 0,
                'total_tokens': 0,
                'cost': 0.0,
                'duration': round(duration, 3)
            }
    
    def _call_azure_openai(self, model: Model, prompt: str, parameters: Dict) -> Dict[str, Any]:
        """Call Azure OpenAI"""
        start_time = time.time()
        
        try:
            client = self.clients.get('azure_openai')
            
            # If no client (testing mode), return mock response
            if not client:
                duration = time.time() - start_time
                mock_response = f"Mock response for prompt: {prompt[:100]}... This is a simulated AI response for testing purposes."
                
                return {
                    'success': True,
                    'response': mock_response,
                    'error': None,
                    'prompt_tokens': 50,
                    'completion_tokens': 25,
                    'total_tokens': 75,
                    'cost': round(75 * model.cost_per_token, 5),
                    'duration': round(duration, 3)
                }
            
            # Merge model parameters with call parameters
            model_params = model.parameters or {}
            call_params = {
                'temperature': parameters.get('temperature', model_params.get('temperature', 0.7)),
                'max_tokens': parameters.get('max_tokens', model_params.get('max_tokens', 4000)),
                'top_p': parameters.get('top_p', model_params.get('top_p', 1.0)),
                'frequency_penalty': parameters.get('frequency_penalty', model_params.get('frequency_penalty', 0.0)),
                'presence_penalty': parameters.get('presence_penalty', model_params.get('presence_penalty', 0.0))
            }
            
            response = client.chat.completions.create(
                model=model.model_name,
                messages=[
                    {"role": "system", "content": "You are a helpful AI assistant."},
                    {"role": "user", "content": prompt}
                ],
                **call_params
            )
            
            duration = time.time() - start_time
            
            # Extract usage information
            usage = response.usage
            prompt_tokens = usage.prompt_tokens if usage else 0
            completion_tokens = usage.completion_tokens if usage else 0
            total_tokens = usage.total_tokens if usage else 0
            
            # Calculate cost
            cost = round(total_tokens * model.cost_per_token, 5)
            
            return {
                'success': True,
                'response': response.choices[0].message.content,
                'error': None,
                'prompt_tokens': prompt_tokens,
                'completion_tokens': completion_tokens,
                'total_tokens': total_tokens,
                'cost': cost,
                'duration': round(duration, 3)
            }
            
        except Exception as e:
            duration = time.time() - start_time
            return {
                'success': False,
                'response': '',
                'error': str(e),
                'prompt_tokens': 0,
                'completion_tokens': 0,
                'total_tokens': 0,
                'cost': 0.0,
                'duration': round(duration, 3)
            }


class ToolService:
    """Service for handling tool execution"""
    
    def __init__(self):
        self.builtin_tools = {
            'web_search': self._web_search,
            'file_write': self._file_write,
            'file_read': self._file_read,
            'calculator': self._calculator,
        }
    
    def execute_tool(self, tool: Tool, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool with given parameters"""
        start_time = time.time()
        
        try:
            if tool.tool_type == 'builtin':
                if tool.name in self.builtin_tools:
                    result = self.builtin_tools[tool.name](parameters)
                    duration = time.time() - start_time
                    return {
                        'success': True,
                        'output': result,
                        'error': None,
                        'duration': round(duration, 3)
                    }
                else:
                    raise ValueError(f"Unknown builtin tool: {tool.name}")
            
            elif tool.tool_type == 'custom':
                # Execute custom Python code
                result = self._execute_custom_tool(tool, parameters)
                duration = time.time() - start_time
                return {
                    'success': True,
                    'output': result,
                    'error': None,
                    'duration': round(duration, 3)
                }
            
            else:
                raise ValueError(f"Unsupported tool type: {tool.tool_type}")
                
        except Exception as e:
            duration = time.time() - start_time
            return {
                'success': False,
                'output': None,
                'error': str(e),
                'duration': round(duration, 3)
            }
    
    def _web_search(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Simple web search implementation"""
        query = parameters.get('query', '')
        max_results = parameters.get('max_results', 10)
        
        # Mock search results for now
        results = [
            {
                'title': f'Search result for "{query}" - Article 1',
                'url': f'https://example.com/article1?q={query}',
                'snippet': f'This is a mock search result for the query "{query}". It contains relevant information about the topic.'
            },
            {
                'title': f'Search result for "{query}" - Article 2',
                'url': f'https://example.com/article2?q={query}',
                'snippet': f'Another relevant search result for "{query}" with additional details and context.'
            },
            {
                'title': f'Search result for "{query}" - Article 3',
                'url': f'https://example.com/article3?q={query}',
                'snippet': f'Third search result providing more context and information about "{query}".'
            }
        ]
        
        return results[:max_results]
    
    def _file_write(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Write content to a file"""
        filename = parameters.get('filename', '')
        content = parameters.get('content', '')
        
        if not filename:
            raise ValueError("Filename is required")
        
        # Create temp directory if it doesn't exist
        temp_dir = Path(tempfile.gettempdir()) / 'blitz_files'
        temp_dir.mkdir(exist_ok=True)
        
        # Sanitize filename
        safe_filename = re.sub(r'[^\w\-_\.]', '_', filename)
        filepath = temp_dir / safe_filename
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return {
                'success': True,
                'filepath': str(filepath),
                'bytes_written': len(content.encode('utf-8'))
            }
        except Exception as e:
            raise Exception(f"Failed to write file: {str(e)}")
    
    def _file_read(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Read content from a file"""
        filename = parameters.get('filename', '')
        
        if not filename:
            raise ValueError("Filename is required")
        
        # Look in temp directory
        temp_dir = Path(tempfile.gettempdir()) / 'blitz_files'
        safe_filename = re.sub(r'[^\w\-_\.]', '_', filename)
        filepath = temp_dir / safe_filename
        
        try:
            if not filepath.exists():
                raise FileNotFoundError(f"File not found: {filename}")
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return {
                'success': True,
                'content': content,
                'filepath': str(filepath),
                'bytes_read': len(content.encode('utf-8'))
            }
        except Exception as e:
            raise Exception(f"Failed to read file: {str(e)}")
    
    def _calculator(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Perform basic mathematical calculations"""
        expression = parameters.get('expression', '')
        
        if not expression:
            raise ValueError("Expression is required")
        
        try:
            # Simple expression evaluation with safety checks
            allowed_chars = set('0123456789+-*/.() ')
            if not all(c in allowed_chars for c in expression):
                raise ValueError("Expression contains invalid characters")
            
            # Evaluate the expression safely
            result = eval(expression, {"__builtins__": {}}, {})
            
            return {
                'result': round(float(result), 3) if isinstance(result, (int, float)) else result,
                'expression': expression
            }
        except Exception as e:
            raise Exception(f"Calculation failed: {str(e)}")
    
    def _execute_custom_tool(self, tool: Tool, parameters: Dict[str, Any]) -> Any:
        """Execute custom Python tool (simplified implementation)"""
        # This is a simplified implementation
        # In production, you'd want proper sandboxing
        if not tool.implementation:
            raise ValueError("No implementation provided for custom tool")
        
        # Create a safe execution environment
        safe_globals = {
            '__builtins__': {
                'len': len,
                'str': str,
                'int': int,
                'float': float,
                'bool': bool,
                'list': list,
                'dict': dict,
                'print': print,
                'round': round
            },
            'parameters': parameters
        }
        
        try:
            exec(tool.implementation, safe_globals)
            return safe_globals.get('result', None)
        except Exception as e:
            raise Exception(f"Custom tool execution failed: {str(e)}")

class AgentService:
    """Service for agent operations"""
    
    def __init__(self, db):
        self.db = db
        self.tool_service = ToolService()
    
    def execute_agent(self, agent: Agent, input_data: Dict[str, Any], llm_service: LLMService) -> Dict[str, Any]:
        """Execute an agent with given input data"""
        start_time = time.time()
        
        try:
            # Get model and prompt
            model = Model.query.get(agent.model_id)
            prompt_template = Prompt.query.get(agent.prompt_id)
            
            if not model or not prompt_template:
                raise ValueError("Agent model or prompt not found")
            
            # Fill prompt template with input data
            filled_prompt = self._fill_prompt_template(prompt_template.template, input_data)
            
            # Check if agent has tools (for ReAct-style execution)
            if agent.tools:
                return self._execute_agent_with_tools(agent, model, filled_prompt, llm_service)
            else:
                return self._execute_simple_agent(agent, model, filled_prompt, llm_service)
                
        except Exception as e:
            duration = time.time() - start_time
            return {
                'success': False,
                'output': None,
                'error': str(e),
                'duration': round(duration, 3),
                'steps': []
            }
    
    def _fill_prompt_template(self, template: str, input_data: Dict[str, Any]) -> str:
        """Fill prompt template with input data"""
        try:
            return template.format(**input_data)
        except KeyError as e:
            raise ValueError(f"Missing required input parameter: {e}")
    
    def _execute_simple_agent(self, agent: Agent, model: Model, prompt: str, llm_service: LLMService) -> Dict[str, Any]:
        """Execute agent without tools"""
        start_time = time.time()
        
        # Call LLM
        llm_result = llm_service.call_llm(model, prompt, agent.parameters)
        
        duration = time.time() - start_time
        
        return {
            'success': llm_result['success'],
            'output': llm_result['response'] if llm_result['success'] else None,
            'error': llm_result.get('error'),
            'duration': round(duration, 3),
            'steps': [{
                'type': 'llm_call',
                'success': llm_result['success'],
                'duration': llm_result['duration'],
                'tokens': llm_result['total_tokens'],
                'cost': llm_result['cost']
            }],
            'total_tokens': llm_result['total_tokens'],
            'total_cost': llm_result['cost']
        }
    
    def _execute_agent_with_tools(self, agent: Agent, model: Model, prompt: str, llm_service: LLMService) -> Dict[str, Any]:
        """Execute agent with tools using ReAct pattern"""
        start_time = time.time()
        max_iterations = agent.parameters.get('max_iterations', 5)
        
        conversation_history = []
        steps = []
        total_tokens = 0
        total_cost = 0.0
        
        # Add tool descriptions to prompt
        tool_descriptions = []
        for tool in agent.tools:
            tool_descriptions.append(f"- {tool.name}: {tool.description}")
        
        enhanced_prompt = f"""{prompt}

You have access to the following tools:
{chr(10).join(tool_descriptions)}

To use a tool, respond with: TOOL_CALL: tool_name(parameter1=value1, parameter2=value2)
After using a tool, you'll receive the result. Continue reasoning based on the result.
When you have the final answer, respond with: FINAL_ANSWER: your answer here
"""
        
        conversation_history.append(f"User: {enhanced_prompt}")
        
        for iteration in range(max_iterations):
            # Prepare conversation for LLM
            conversation_prompt = "\n".join(conversation_history)
            
            # Call LLM
            llm_result = llm_service.call_llm(model, conversation_prompt, agent.parameters)
            
            steps.append({
                'type': 'llm_call',
                'iteration': iteration + 1,
                'success': llm_result['success'],
                'duration': llm_result['duration'],
                'tokens': llm_result['total_tokens'],
                'cost': llm_result['cost']
            })
            
            total_tokens += llm_result['total_tokens']
            total_cost = round(total_cost + llm_result['cost'], 5)
            
            if not llm_result['success']:
                break
            
            response = llm_result['response']
            conversation_history.append(f"Assistant: {response}")
            
            # Check if this is the final answer
            if 'FINAL_ANSWER:' in response:
                final_answer = response.split('FINAL_ANSWER:', 1)[1].strip()
                duration = time.time() - start_time
                return {
                    'success': True,
                    'output': final_answer,
                    'error': None,
                    'duration': round(duration, 3),
                    'steps': steps,
                    'total_tokens': total_tokens,
                    'total_cost': total_cost,
                    'iterations': iteration + 1
                }
            
            # Check if agent wants to use a tool
            if 'TOOL_CALL:' in response:
                tool_call = response.split('TOOL_CALL:', 1)[1].strip()
                tool_result = self._execute_tool_call(agent, tool_call)
                
                steps.append({
                    'type': 'tool_call',
                    'tool_call': tool_call,
                    'success': tool_result['success'],
                    'duration': tool_result['duration'],
                    'error': tool_result.get('error')
                })
                
                # Add tool result to conversation
                if tool_result['success']:
                    conversation_history.append(f"Tool Result: {json.dumps(tool_result['output'], indent=2)}")
                else:
                    conversation_history.append(f"Tool Error: {tool_result['error']}")
        
        # If we reach here, we've exceeded max iterations
        duration = time.time() - start_time
        return {
            'success': False,
            'output': None,
            'error': f"Agent exceeded maximum iterations ({max_iterations})",
            'duration': round(duration, 3),
            'steps': steps,
            'total_tokens': total_tokens,
            'total_cost': total_cost,
            'iterations': max_iterations
        }
    
    def _execute_tool_call(self, agent: Agent, tool_call: str) -> Dict[str, Any]:
        """Parse and execute a tool call"""
        try:
            # Simple parsing: tool_name(param1=value1, param2=value2)
            tool_name = tool_call.split('(')[0].strip()
            
            # Find the tool
            tool = None
            for t in agent.tools:
                if t.name == tool_name:
                    tool = t
                    break
            
            if not tool:
                return {
                    'success': False,
                    'output': None,
                    'error': f"Tool '{tool_name}' not found",
                    'duration': 0
                }
            
            # Parse parameters (simplified)
            params = {}
            if '(' in tool_call and ')' in tool_call:
                params_str = tool_call.split('(', 1)[1].rsplit(')', 1)[0]
                if params_str.strip():
                    # Very simple parameter parsing
                    for param in params_str.split(','):
                        if '=' in param:
                            key, value = param.split('=', 1)
                            key = key.strip()
                            value = value.strip().strip('"\'')
                            params[key] = value
            
            # Execute tool
            return self.tool_service.execute_tool(tool, params)
            
        except Exception as e:
            return {
                'success': False,
                'output': None,
                'error': f"Tool call parsing error: {str(e)}",
                'duration': 0
            }

class WorkflowService:
    """Service for workflow operations"""
    
    def __init__(self, db):
        self.db = db
    
    def execute_workflow(self, workflow: Workflow, input_data: Dict[str, Any], 
                        agent_service: AgentService, llm_service: LLMService) -> Dict[str, Any]:
        """Execute a workflow"""
        start_time = time.time()
        
        try:
            # Get workflow nodes and connections
            nodes = {node.node_id: node for node in workflow.nodes}
            connections = workflow.connections
            
            # Build execution graph
            graph = self._build_execution_graph(nodes, connections)
            
            # Execute workflow
            result = self._execute_workflow_graph(graph, nodes, input_data, agent_service, llm_service)
            
            duration = time.time() - start_time
            result['duration'] = round(duration, 3)
            
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            return {
                'success': False,
                'output': None,
                'error': str(e),
                'duration': round(duration, 3),
                'steps': []
            }
    
    def _build_execution_graph(self, nodes: Dict[str, WorkflowNode], 
                             connections: List[WorkflowConnection]) -> Dict[str, List[str]]:
        """Build execution graph from nodes and connections"""
        graph = {node_id: [] for node_id in nodes.keys()}
        
        for connection in connections:
            graph[connection.source_node_id].append(connection.target_node_id)
        
        return graph
    
    def _execute_workflow_graph(self, graph: Dict[str, List[str]], nodes: Dict[str, WorkflowNode],
                               input_data: Dict[str, Any], agent_service: AgentService, 
                               llm_service: LLMService) -> Dict[str, Any]:
        """Execute workflow graph"""
        # Find start node
        start_nodes = [node_id for node_id, node in nodes.items() if node.node_type == 'start']
        if not start_nodes:
            raise ValueError("No start node found in workflow")
        
        # Execution state
        executed_nodes = set()
        node_outputs = {}
        steps = []
        total_cost = 0.0
        
        # Simple sequential execution for now
        def execute_node(node_id: str):
            if node_id in executed_nodes:
                return
            
            node = nodes[node_id]
            step_start = time.time()
            
            try:
                if node.node_type == 'start':
                    node_outputs[node_id] = input_data
                    
                elif node.node_type == 'input':
                    # Input nodes provide data
                    config = node.configuration or {}
                    node_outputs[node_id] = config.get('default_value', {})
                    
                elif node.node_type == 'agent':
                    # Execute agent
                    agent_id = node.configuration.get('agent_id')
                    if not agent_id:
                        raise ValueError(f"No agent specified for node {node_id}")
                    
                    # Get agent directly via query
                    agent = Agent.query.get(agent_id)
                    if not agent:
                        raise ValueError(f"Agent {agent_id} not found")
                    
                    # Get input from previous nodes
                    agent_input = self._get_node_input(node_id, graph, node_outputs, nodes)
                    
                    # Execute agent
                    result = agent_service.execute_agent(agent, agent_input, llm_service)
                    
                    if result['success']:
                        node_outputs[node_id] = result['output']
                        total_cost = round(total_cost + result.get('total_cost', 0), 5)
                    else:
                        raise Exception(f"Agent execution failed: {result.get('error')}")
                    
                elif node.node_type == 'end':
                    # End node collects final output
                    final_input = self._get_node_input(node_id, graph, node_outputs, nodes)
                    node_outputs[node_id] = final_input
                
                executed_nodes.add(node_id)
                step_duration = time.time() - step_start
                
                steps.append({
                    'node_id': node_id,
                    'node_type': node.node_type,
                    'success': True,
                    'duration': round(step_duration, 3),
                    'output': node_outputs.get(node_id)
                })
                
                # Execute child nodes
                for child_id in graph.get(node_id, []):
                    execute_node(child_id)
                    
            except Exception as e:
                step_duration = time.time() - step_start
                steps.append({
                    'node_id': node_id,
                    'node_type': node.node_type,
                    'success': False,
                    'duration': round(step_duration, 3),
                    'error': str(e)
                })
                raise e
        
        # Start execution
        for start_node in start_nodes:
            execute_node(start_node)
        
        # Find end nodes and collect output
        end_nodes = [node_id for node_id, node in nodes.items() if node.node_type == 'end']
        final_output = {}
        
        for end_node in end_nodes:
            if end_node in node_outputs:
                final_output[end_node] = node_outputs[end_node]
        
        if not final_output and node_outputs:
            # If no end nodes, return last output
            final_output = list(node_outputs.values())[-1]
        
        return {
            'success': True,
            'output': final_output,
            'error': None,
            'steps': steps,
            'total_cost': total_cost,
            'nodes_executed': len(executed_nodes)
        }
    
    def _get_node_input(self, node_id: str, graph: Dict[str, List[str]], 
                       node_outputs: Dict[str, Any], nodes: Dict[str, WorkflowNode]) -> Dict[str, Any]:
        """Get input data for a node from its predecessors"""
        # Find nodes that connect to this node
        input_data = {}
        
        for source_id, targets in graph.items():
            if node_id in targets and source_id in node_outputs:
                # For simplicity, merge all inputs
                source_output = node_outputs[source_id]
                if isinstance(source_output, dict):
                    input_data.update(source_output)
                else:
                    input_data[f'{source_id}_output'] = source_output
        
        return input_data if input_data else {}

class ExecutionService:
    """Service for managing executions"""
    
    def __init__(self, db, llm_service: LLMService):
        self.db = db
        self.llm_service = llm_service
        self.agent_service = AgentService(db)
        self.workflow_service = WorkflowService(db)
        self.running_executions = {}

    def execute_agent_async(self, agent_id: int, input_data: Dict[str, Any], user_id: int) -> int:
        """Start agent execution asynchronously"""
        # Create execution record in current thread/session
        execution = Execution(
            execution_type='agent',
            target_id=agent_id,
            input_data=input_data,
            status='pending',
            created_by=user_id
        )
        
        self.db.session.add(execution)
        self.db.session.commit()
        execution_id = execution.id  # Get ID before closing session
        
        # Start execution in background
        from concurrent.futures import ThreadPoolExecutor
        executor = current_app.executor
        future = executor.submit(self._execute_agent_background, execution_id)
        self.running_executions[execution_id] = future
        
        return execution_id

    def execute_workflow_async(self, workflow_id: int, input_data: Dict[str, Any], user_id: int) -> int:
        """Start workflow execution asynchronously"""
        # Create execution record in current thread/session
        execution = Execution(
            execution_type='workflow',
            target_id=workflow_id,
            input_data=input_data,
            status='pending',
            created_by=user_id
        )
        
        self.db.session.add(execution)
        self.db.session.commit()
        execution_id = execution.id  # Get ID before closing session
        
        # Start execution in background
        executor = current_app.executor
        future = executor.submit(self._execute_workflow_background, execution_id)
        self.running_executions[execution_id] = future
        
        return execution_id
    
    def _execute_agent_background(self, execution_id: int):
        """Execute agent in background thread with proper session handling"""
        # Create new database session for this thread
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        
        try:
            # Create thread-local database session
            engine = self.db.engine
            Session = sessionmaker(bind=engine)
            session = Session()
            
            execution = session.query(Execution).get(execution_id)
            if not execution:
                session.close()
                return
            
            # Update status
            execution.status = 'running'
            execution.started_at = datetime.utcnow()
            session.commit()
            
            # Get agent
            agent = session.query(Agent).get(execution.target_id)
            if not agent:
                execution.status = 'failed'
                execution.error_message = 'Agent not found'
                execution.completed_at = datetime.utcnow()
                session.commit()
                session.close()
                return
            
            # Create agent service with thread-local session
            thread_agent_service = AgentService(type('MockDB', (), {'session': session})())
            
            # Execute agent
            result = thread_agent_service.execute_agent(agent, execution.input_data, self.llm_service)
            
            # Update execution
            execution.status = 'completed' if result['success'] else 'failed'
            execution.output_data = result.get('output')
            execution.error_message = result.get('error')
            execution.duration = round(result.get('duration', 0), 2)
            execution.completed_at = datetime.utcnow()
            execution.progress = 1.0
            
            # Create execution steps
            for i, step in enumerate(result.get('steps', [])):
                execution_step = ExecutionStep(
                    execution_id=execution.id,
                    step_order=i + 1,
                    step_type=step.get('type', 'unknown'),
                    status='completed' if step.get('success') else 'failed',
                    duration=round(step.get('duration', 0), 2),
                    started_at=datetime.utcnow(),
                    completed_at=datetime.utcnow()
                )
                session.add(execution_step)
            
            # Log costs if any
            total_cost = result.get('total_cost', 0)
            if total_cost > 0:
                cost = Cost(
                    user_id=execution.created_by,
                    execution_id=execution.id,
                    cost_type='llm_call',
                    amount=round(total_cost, 5),
                    description=f'Agent execution: {agent.name}'
                )
                session.add(cost)
            
            session.commit()
            session.close()
            
        except Exception as e:
            try:
                # Update execution with error
                execution = session.query(Execution).get(execution_id)
                if execution:
                    execution.status = 'failed'
                    execution.error_message = str(e)
                    execution.completed_at = datetime.utcnow()
                    session.commit()
                session.close()
            except:
                pass  # Avoid nested exceptions
        
        finally:
            # Clean up
            if execution_id in self.running_executions:
                del self.running_executions[execution_id]
    
    def _execute_workflow_background(self, execution_id: int):
        """Execute workflow in background thread with proper session handling"""
        # Similar pattern as agent execution with thread-local sessions
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        
        try:
            # Create thread-local database session
            engine = self.db.engine
            Session = sessionmaker(bind=engine)
            session = Session()
            
            execution = session.query(Execution).get(execution_id)
            if not execution:
                session.close()
                return
            
            # Update status
            execution.status = 'running'
            execution.started_at = datetime.utcnow()
            session.commit()
            
            workflow = session.query(Workflow).get(execution.target_id)
            if not workflow:
                execution.status = 'failed'
                execution.error_message = 'Workflow not found'
                execution.completed_at = datetime.utcnow()
                session.commit()
                session.close()
                return
            
            # Create workflow service with thread-local session
            thread_workflow_service = WorkflowService(type('MockDB', (), {'session': session})())
            thread_agent_service = AgentService(type('MockDB', (), {'session': session})())
            
            # Execute workflow
            result = thread_workflow_service.execute_workflow(
                workflow, execution.input_data, thread_agent_service, self.llm_service
            )
            
            # Update execution
            execution.status = 'completed' if result['success'] else 'failed'
            execution.output_data = result.get('output')
            execution.error_message = result.get('error')
            execution.duration = round(result.get('duration', 0), 2)
            execution.completed_at = datetime.utcnow()
            execution.progress = 1.0
            
            # Create execution steps
            for i, step in enumerate(result.get('steps', [])):
                execution_step = ExecutionStep(
                    execution_id=execution.id,
                    step_order=i + 1,
                    step_type=step.get('node_type', 'unknown'),
                    step_name=step.get('node_id'),
                    status='completed' if step.get('success') else 'failed',
                    duration=round(step.get('duration', 0), 2),
                    error_message=step.get('error'),
                    started_at=datetime.utcnow(),
                    completed_at=datetime.utcnow()
                )
                session.add(execution_step)
            
            # Log costs if any
            total_cost = result.get('total_cost', 0)
            if total_cost > 0:
                cost = Cost(
                    user_id=execution.created_by,
                    execution_id=execution.id,
                    cost_type='llm_call',
                    amount=round(total_cost, 5),
                    description=f'Workflow execution: {workflow.name}'
                )
                session.add(cost)
            
            session.commit()
            session.close()
            
        except Exception as e:
            try:
                # Update execution with error
                execution = session.query(Execution).get(execution_id)
                if execution:
                    execution.status = 'failed'
                    execution.error_message = str(e)
                    execution.completed_at = datetime.utcnow()
                    session.commit()
                session.close()
            except:
                pass  # Avoid nested exceptions
        
        finally:
            # Clean up
            if execution_id in self.running_executions:
                del self.running_executions[execution_id]


class CostService:
    """Service for cost tracking and management"""
    
    def __init__(self, db):
        self.db = db
    
    def get_user_total_cost(self, user_id: int) -> float:
        """Get total cost for a user"""
        total = self.db.session.query(
            self.db.func.sum(Cost.amount)
        ).filter_by(user_id=user_id).scalar()
        
        return round(total or 0.0, 2)
    
    def get_user_costs(self, user_id: int, days: int = 30) -> Dict[str, Any]:
        """Get cost breakdown for a user"""
        since_date = datetime.utcnow() - timedelta(days=days)
        
        # Total cost
        total_cost = self.get_user_total_cost(user_id)
        
        # Recent costs
        recent_costs = Cost.query.filter(
            Cost.user_id == user_id,
            Cost.created_at >= since_date
        ).all()
        
        # Cost by type
        cost_by_type = {}
        for cost in recent_costs:
            cost_type = cost.cost_type
            if cost_type not in cost_by_type:
                cost_by_type[cost_type] = 0.0
            cost_by_type[cost_type] = round(cost_by_type[cost_type] + cost.amount, 3)
        
        return {
            'total_cost': total_cost,
            'recent_cost': round(sum(cost.amount for cost in recent_costs), 2),
            'cost_by_type': {k: round(v, 2) for k, v in cost_by_type.items()},
            'recent_executions': len(set(cost.execution_id for cost in recent_costs))
        }

class AuditService:
    """Service for audit logging"""
    
    def __init__(self, db):
        self.db = db
    
    def log_request(self, user_id: Optional[int], endpoint: str, method: str, 
                   status_code: int, duration: float, request_id: str):
        """Log API request"""
        try:
            audit_log = AuditLog(
                user_id=user_id,
                action=f"{method} {endpoint}",
                resource_type='api_request',
                status_code=status_code,
                duration=round(duration, 3),
                request_id=request_id,
                ip_address=request.remote_addr if request else None,
                user_agent=request.headers.get('User-Agent') if request else None
            )
            
            self.db.session.add(audit_log)
            self.db.session.commit()
            
        except Exception as e:
            # Don't let audit logging break the main request
            print(f"Audit logging error: {e}")
    
    def log_action(self, user_id: int, action: str, resource_type: str = None, 
                  resource_id: str = None, details: Dict = None):
        """Log user action"""
        try:
            audit_log = AuditLog(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details or {},
                ip_address=request.remote_addr if request else None
            )
            
            self.db.session.add(audit_log)
            self.db.session.commit()
            
        except Exception as e:
            print(f"Audit logging error: {e}")