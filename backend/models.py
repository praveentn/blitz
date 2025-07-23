# backend/models.py
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Text, JSON, DateTime, Boolean, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship, backref
import json

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(Integer, primary_key=True)
    username = db.Column(String(80), unique=True, nullable=False, index=True)
    email = db.Column(String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(String(255), nullable=False)
    role = db.Column(String(20), nullable=False, default='business_user')  # 'admin', 'business_user'
    is_active = db.Column(Boolean, nullable=False, default=True)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    last_login = db.Column(DateTime)
    cost_limit = db.Column(Float, default=100.00)
    
    # Relationships
    models = relationship('Model', backref='creator', lazy=True)
    prompts = relationship('Prompt', backref='creator', lazy=True)
    tools = relationship('Tool', backref='creator', lazy=True)
    agents = relationship('Agent', backref='creator', lazy=True)
    workflows = relationship('Workflow', backref='creator', lazy=True)
    executions = relationship('Execution', backref='user', lazy=True)
    costs = relationship('Cost', backref='user', lazy=True)
    audit_logs = relationship('AuditLog', backref='user', lazy=True)
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'cost_limit': round(self.cost_limit, 2) if self.cost_limit else 0.0
        }

class Model(db.Model):
    __tablename__ = 'models'
    
    id = db.Column(Integer, primary_key=True)
    name = db.Column(String(100), nullable=False, unique=True, index=True)
    provider = db.Column(String(50), nullable=False)  # 'azure_openai', 'openai', 'anthropic', etc.
    model_name = db.Column(String(100), nullable=False)
    endpoint = db.Column(String(500))
    api_key = db.Column(String(500))
    parameters = db.Column(JSON, default={})  # temperature, max_tokens, etc.
    cost_per_token = db.Column(Float, default=0.0)
    is_active = db.Column(Boolean, nullable=False, default=True)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Relationships
    agents = relationship('Agent', backref='model', lazy=True)
    llm_calls = relationship('LLMCall', backref='model', lazy=True)
    
    def __repr__(self):
        return f'<Model {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'provider': self.provider,
            'model_name': self.model_name,
            'endpoint': self.endpoint,
            'parameters': self.parameters,
            'cost_per_token': round(self.cost_per_token, 5) if self.cost_per_token else 0.0,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Prompt(db.Model):
    __tablename__ = 'prompts'
    
    id = db.Column(Integer, primary_key=True)
    name = db.Column(String(100), nullable=False, unique=True, index=True)
    description = db.Column(Text)
    template = db.Column(Text, nullable=False)
    input_schema = db.Column(JSON, default={})  # Pydantic-compatible JSON schema
    output_schema = db.Column(JSON, default={})  # Expected output schema
    version = db.Column(Integer, default=1)
    is_active = db.Column(Boolean, nullable=False, default=True)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Relationships
    agents = relationship('Agent', backref='prompt', lazy=True)
    
    def __repr__(self):
        return f'<Prompt {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'template': self.template,
            'input_schema': self.input_schema,
            'output_schema': self.output_schema,
            'version': self.version,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Tool(db.Model):
    __tablename__ = 'tools'
    
    id = db.Column(Integer, primary_key=True)
    name = db.Column(String(100), nullable=False, unique=True, index=True)
    description = db.Column(Text, nullable=False)
    tool_type = db.Column(String(50), nullable=False)  # 'builtin', 'custom', 'api'
    implementation = db.Column(Text)  # Python code or API config
    parameters_schema = db.Column(JSON, default={})  # Input parameters schema
    output_schema = db.Column(JSON, default={})  # Output schema
    is_active = db.Column(Boolean, nullable=False, default=True)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(Integer, ForeignKey('users.id'), nullable=False)
    
    def __repr__(self):
        return f'<Tool {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'tool_type': self.tool_type,
            'implementation': self.implementation,
            'parameters_schema': self.parameters_schema,
            'output_schema': self.output_schema,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# Association table for agent-tool many-to-many relationship
agent_tools = db.Table('agent_tools',
    db.Column('agent_id', Integer, ForeignKey('agents.id'), primary_key=True),
    db.Column('tool_id', Integer, ForeignKey('tools.id'), primary_key=True)
)

class Agent(db.Model):
    __tablename__ = 'agents'
    
    id = db.Column(Integer, primary_key=True)
    name = db.Column(String(100), nullable=False, unique=True, index=True)
    description = db.Column(Text)
    model_id = db.Column(Integer, ForeignKey('models.id'), nullable=False)
    prompt_id = db.Column(Integer, ForeignKey('prompts.id'), nullable=False)
    parameters = db.Column(JSON, default={})  # Agent-specific parameters
    memory_config = db.Column(JSON, default={})  # Memory configuration
    is_active = db.Column(Boolean, nullable=False, default=True)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Relationships
    tools = relationship('Tool', secondary=agent_tools, backref='agents')
    
    def __repr__(self):
        return f'<Agent {self.name}>'
        
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'model_id': self.model_id,
            'prompt_id': self.prompt_id,
            'parameters': self.parameters,
            'memory_config': self.memory_config,
            'tool_ids': [tool.id for tool in self.tools],
            'tool_names': [tool.name for tool in self.tools],
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Workflow(db.Model):
    __tablename__ = 'workflows'
    
    id = db.Column(Integer, primary_key=True)
    name = db.Column(String(100), nullable=False, unique=True, index=True)
    description = db.Column(Text)
    definition = db.Column(JSON, nullable=False)  # Complete workflow graph definition
    version = db.Column(Integer, default=1)
    is_active = db.Column(Boolean, nullable=False, default=True)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Relationships
    nodes = relationship('WorkflowNode', backref='workflow', lazy=True, cascade='all, delete-orphan')
    connections = relationship('WorkflowConnection', backref='workflow', lazy=True, cascade='all, delete-orphan')
    schedules = relationship('Schedule', backref='workflow', lazy=True)
    
    def __repr__(self):
        return f'<Workflow {self.name}>'
        
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'definition': self.definition,
            'version': self.version,
            'is_active': self.is_active,
            'nodes_count': len(self.nodes),
            'connections_count': len(self.connections),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class WorkflowNode(db.Model):
    __tablename__ = 'workflow_nodes'
    
    id = db.Column(Integer, primary_key=True)
    workflow_id = db.Column(Integer, ForeignKey('workflows.id'), nullable=False)
    node_id = db.Column(String(100), nullable=False)  # Unique within workflow
    node_type = db.Column(String(50), nullable=False)  # 'start', 'end', 'agent', 'tool', 'input', 'output'
    position_x = db.Column(Float, default=0.0)
    position_y = db.Column(Float, default=0.0)
    configuration = db.Column(JSON, default={})  # Node-specific configuration
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<WorkflowNode {self.node_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'workflow_id': self.workflow_id,
            'node_id': self.node_id,
            'node_type': self.node_type,
            'position_x': round(self.position_x, 2) if self.position_x else 0.0,
            'position_y': round(self.position_y, 2) if self.position_y else 0.0,
            'configuration': self.configuration,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class WorkflowConnection(db.Model):
    __tablename__ = 'workflow_connections'
    
    id = db.Column(Integer, primary_key=True)
    workflow_id = db.Column(Integer, ForeignKey('workflows.id'), nullable=False)
    source_node_id = db.Column(String(100), nullable=False)
    target_node_id = db.Column(String(100), nullable=False)
    source_handle = db.Column(String(50), default='')
    target_handle = db.Column(String(50), default='')
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Connection {self.source_node_id} -> {self.target_node_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'workflow_id': self.workflow_id,
            'source_node_id': self.source_node_id,
            'target_node_id': self.target_node_id,
            'source_handle': self.source_handle,
            'target_handle': self.target_handle,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Execution(db.Model):
    __tablename__ = 'executions'
    
    id = db.Column(Integer, primary_key=True)
    execution_type = db.Column(String(20), nullable=False)  # 'agent', 'workflow'
    target_id = db.Column(Integer, nullable=False)  # agent_id or workflow_id
    status = db.Column(String(20), nullable=False, default='pending')  # 'pending', 'running', 'completed', 'failed', 'cancelled'
    input_data = db.Column(JSON, default={})
    output_data = db.Column(JSON, default={})
    error_message = db.Column(Text)
    progress = db.Column(Float, default=0.0)  # 0.0 to 1.0
    duration = db.Column(Float)  # seconds
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    started_at = db.Column(DateTime)
    completed_at = db.Column(DateTime)
    created_by = db.Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Relationships - Removed problematic relationships, handle programmatically instead
    steps = relationship('ExecutionStep', backref='execution', lazy=True, cascade='all, delete-orphan')
    llm_calls = relationship('LLMCall', backref='execution', lazy=True)
    costs = relationship('Cost', backref='execution', lazy=True)
    
    def __repr__(self):
        return f'<Execution {self.id} ({self.execution_type})>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'execution_type': self.execution_type,
            'target_id': self.target_id,
            'status': self.status,
            'input_data': self.input_data,
            'output_data': self.output_data,
            'error_message': self.error_message,
            'progress': round(self.progress, 3) if self.progress else 0.0,
            'duration': round(self.duration, 2) if self.duration else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_by': self.created_by
        }
    
    # Helper methods to get related objects programmatically
    def get_agent(self):
        """Get the agent if this is an agent execution"""
        if self.execution_type == 'agent':
            return Agent.query.get(self.target_id)
        return None
    
    def get_workflow(self):
        """Get the workflow if this is a workflow execution"""
        if self.execution_type == 'workflow':
            return Workflow.query.get(self.target_id)
        return None

class ExecutionStep(db.Model):
    __tablename__ = 'execution_steps'
    
    id = db.Column(Integer, primary_key=True)
    execution_id = db.Column(Integer, ForeignKey('executions.id'), nullable=False)
    step_order = db.Column(Integer, nullable=False)
    step_type = db.Column(String(50), nullable=False)  # 'agent', 'tool', 'llm_call', 'validation'
    step_name = db.Column(String(100))
    status = db.Column(String(20), nullable=False, default='pending')
    input_data = db.Column(JSON, default={})
    output_data = db.Column(JSON, default={})
    error_message = db.Column(Text)
    duration = db.Column(Float)  # seconds
    started_at = db.Column(DateTime)
    completed_at = db.Column(DateTime)
    
    def __repr__(self):
        return f'<ExecutionStep {self.id} ({self.step_type})>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'execution_id': self.execution_id,
            'step_order': self.step_order,
            'step_type': self.step_type,
            'step_name': self.step_name,
            'status': self.status,
            'input_data': self.input_data,
            'output_data': self.output_data,
            'error_message': self.error_message,
            'duration': round(self.duration, 2) if self.duration else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class LLMCall(db.Model):
    __tablename__ = 'llm_calls'
    
    id = db.Column(Integer, primary_key=True)
    execution_id = db.Column(Integer, ForeignKey('executions.id'), nullable=False)
    model_id = db.Column(Integer, ForeignKey('models.id'), nullable=False)
    prompt_text = db.Column(Text)
    response_text = db.Column(Text)
    prompt_tokens = db.Column(Integer, default=0)
    completion_tokens = db.Column(Integer, default=0)
    total_tokens = db.Column(Integer, default=0)
    cost = db.Column(Float, default=0.0)
    duration = db.Column(Float)  # seconds
    status = db.Column(String(20), default='completed')  # 'completed', 'failed'
    error_message = db.Column(Text)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<LLMCall {self.id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'execution_id': self.execution_id,
            'model_id': self.model_id,
            'prompt_tokens': self.prompt_tokens,
            'completion_tokens': self.completion_tokens,
            'total_tokens': self.total_tokens,
            'cost': round(self.cost, 5) if self.cost else 0.0,
            'duration': round(self.duration, 2) if self.duration else None,
            'status': self.status,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Cost(db.Model):
    __tablename__ = 'costs'
    
    id = db.Column(Integer, primary_key=True)
    user_id = db.Column(Integer, ForeignKey('users.id'), nullable=False)
    execution_id = db.Column(Integer, ForeignKey('executions.id'), nullable=False)
    cost_type = db.Column(String(20), nullable=False)  # 'llm_call', 'tool_usage', 'storage'
    amount = db.Column(Float, nullable=False, default=0.0)
    currency = db.Column(String(3), default='USD')
    description = db.Column(String(200))
    _metadata = db.Column(JSON, default={})  # Additional cost details
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Cost {self.id} ({self.cost_type}: ${self.amount})>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'execution_id': self.execution_id,
            'cost_type': self.cost_type,
            'amount': round(self.amount, 5) if self.amount else 0.0,
            'currency': self.currency,
            'description': self.description,
            'metadata': self._metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(Integer, primary_key=True)
    user_id = db.Column(Integer, ForeignKey('users.id'))
    action = db.Column(String(100), nullable=False)
    resource_type = db.Column(String(50))
    resource_id = db.Column(String(50))
    details = db.Column(JSON, default={})
    ip_address = db.Column(String(45))
    user_agent = db.Column(String(500))
    status_code = db.Column(Integer)
    duration = db.Column(Float)  # seconds
    request_id = db.Column(String(100))
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<AuditLog {self.id} ({self.action})>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'details': self.details,
            'ip_address': self.ip_address,
            'status_code': self.status_code,
            'duration': round(self.duration, 3) if self.duration else None,
            'request_id': self.request_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Schedule(db.Model):
    __tablename__ = 'schedules'
    
    id = db.Column(Integer, primary_key=True)
    name = db.Column(String(100), nullable=False)
    workflow_id = db.Column(Integer, ForeignKey('workflows.id'), nullable=False)
    cron_expression = db.Column(String(100), nullable=False)  # Cron-like schedule
    input_data = db.Column(JSON, default={})  # Default input for scheduled runs
    is_active = db.Column(Boolean, nullable=False, default=True)
    last_run = db.Column(DateTime)
    next_run = db.Column(DateTime)
    run_count = db.Column(Integer, default=0)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(Integer, ForeignKey('users.id'), nullable=False)
    
    def __repr__(self):
        return f'<Schedule {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'workflow_id': self.workflow_id,
            'cron_expression': self.cron_expression,
            'input_data': self.input_data,
            'is_active': self.is_active,
            'last_run': self.last_run.isoformat() if self.last_run else None,
            'next_run': self.next_run.isoformat() if self.next_run else None,
            'run_count': self.run_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }