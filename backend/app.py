# backend/app.py
import os
import sys
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, g, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, verify_jwt_in_request
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import json
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
import sqlite3
from contextlib import contextmanager

# Import our modules
from config import get_config, init_app_config
from models import db, User, Model, Prompt, Tool, Agent, Workflow, WorkflowNode, WorkflowConnection, Execution, ExecutionStep, LLMCall, Cost, AuditLog, Schedule
from services import LLMService, AgentService, WorkflowService, ExecutionService, CostService, AuditService
from auth import admin_required, business_user_required
from sql_executor_service import SQLExecutorService

def create_app():
    app = Flask(__name__)
    config_class = get_config()
    app.config.from_object(config_class)
    
    # Initialize extensions
    init_app_config(app)
    db.init_app(app)
    CORS(app, origins=app.config['CORS_ORIGINS'])
    
    jwt = JWTManager(app)

    # Initialize services
    app.llm_service = LLMService(app.config)
    app.agent_service = AgentService(db)
    app.workflow_service = WorkflowService(db)
    app.execution_service = ExecutionService(db, app.llm_service)
    app.cost_service = CostService(db)
    app.audit_service = AuditService(db)
    app.sql_executor = SQLExecutorService(app.config['SQLALCHEMY_DATABASE_URI'])
    
    # Thread pool for async execution
    app.executor = ThreadPoolExecutor(max_workers=app.config['MAX_CONCURRENT_EXECUTIONS'])
    
    
    with app.app_context():
        db.create_all()
        create_default_data()
    
    # Before request handler for audit logging
    @app.before_request
    def before_request():
        g.start_time = time.time()
        g.request_id = str(uuid.uuid4())
    
    @app.after_request
    def after_request(response):
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            try:
                user_id = None
                if 'Authorization' in request.headers:
                    try:
                        verify_jwt_in_request(optional=True)
                        user_id = int(get_jwt_identity())
                    except:
                        pass
                
                app.audit_service.log_request(
                    user_id=user_id,
                    endpoint=request.endpoint or 'unknown',
                    method=request.method,
                    status_code=response.status_code,
                    duration=duration,
                    request_id=g.request_id
                )
            except Exception as e:
                app.logger.error(f"Error logging request: {e}")
        
        return response
    
    # Register routes
    register_routes(app)
    
    return app

def create_default_data():
    """Create default data for the application"""
    try:
        # Create default admin user
        if not User.query.filter_by(email='admin@blitz.com').first():
            admin_user = User(
                username='admin',
                email='admin@blitz.com',
                password_hash=generate_password_hash('admin123'),
                role='admin',
                is_active=True,
                cost_limit=1000.00
            )
            db.session.add(admin_user)
        
        # Create default business user
        if not User.query.filter_by(email='user@blitz.com').first():
            business_user = User(
                username='user',
                email='user@blitz.com',
                password_hash=generate_password_hash('user123'),
                role='business_user',
                is_active=True,
                cost_limit=100.00
            )
            db.session.add(business_user)
        
        # Create demo user
        if not User.query.filter_by(email='demo@blitz.com').first():
            demo_user = User(
                username='demo',
                email='demo@blitz.com',
                password_hash=generate_password_hash('demo123'),
                role='business_user',
                is_active=True,
                cost_limit=50.00
            )
            db.session.add(demo_user)
        
        # Flush to get user IDs
        db.session.flush()
        
        # Get admin user for foreign key references
        admin_user = User.query.filter_by(email='admin@blitz.com').first()
        
        # Create default Azure OpenAI model
        if not Model.query.filter_by(name='azure-gpt-4').first():
            default_model = Model(
                name='azure-gpt-4',
                provider='azure_openai',
                model_name=os.environ.get('AZURE_OPENAI_MODEL', 'gpt-4'),
                endpoint=os.environ.get('AZURE_OPENAI_ENDPOINT', ''),
                api_key=os.environ.get('AZURE_OPENAI_API_KEY', ''),
                parameters={
                    'temperature': float(os.environ.get('AZURE_OPENAI_TEMPERATURE', 0.7)),
                    'max_tokens': int(os.environ.get('AZURE_OPENAI_MAX_TOKENS', 4000)),
                    'top_p': 1.0,
                    'frequency_penalty': 0.0,
                    'presence_penalty': 0.0
                },
                cost_per_token=0.00003,
                is_active=True,
                created_by=admin_user.id
            )
            db.session.add(default_model)
        
        # Create default tools
        default_tools = [
            {
                'name': 'web_search',
                'description': 'Search the web for information using various search engines',
                'tool_type': 'builtin',
                'parameters_schema': {
                    'type': 'object',
                    'properties': {
                        'query': {'type': 'string', 'description': 'Search query'},
                        'max_results': {'type': 'integer', 'default': 10, 'description': 'Maximum results'}
                    },
                    'required': ['query']
                },
                'output_schema': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'title': {'type': 'string'},
                            'url': {'type': 'string'},
                            'snippet': {'type': 'string'}
                        }
                    }
                }
            },
            {
                'name': 'file_write',
                'description': 'Write content to a file in the temporary directory',
                'tool_type': 'builtin',
                'parameters_schema': {
                    'type': 'object',
                    'properties': {
                        'filename': {'type': 'string'},
                        'content': {'type': 'string'}
                    },
                    'required': ['filename', 'content']
                },
                'output_schema': {
                    'type': 'object',
                    'properties': {
                        'success': {'type': 'boolean'},
                        'filepath': {'type': 'string'},
                        'bytes_written': {'type': 'integer'}
                    }
                }
            },
            {
                'name': 'file_read',
                'description': 'Read content from a file in the temporary directory',
                'tool_type': 'builtin',
                'parameters_schema': {
                    'type': 'object',
                    'properties': {
                        'filename': {'type': 'string'}
                    },
                    'required': ['filename']
                },
                'output_schema': {
                    'type': 'object',
                    'properties': {
                        'success': {'type': 'boolean'},
                        'content': {'type': 'string'},
                        'filepath': {'type': 'string'},
                        'bytes_read': {'type': 'integer'}
                    }
                }
            },
            {
                'name': 'calculator',
                'description': 'Perform basic mathematical calculations',
                'tool_type': 'builtin',
                'parameters_schema': {
                    'type': 'object',
                    'properties': {
                        'expression': {'type': 'string', 'description': 'Mathematical expression'}
                    },
                    'required': ['expression']
                },
                'output_schema': {
                    'type': 'object',
                    'properties': {
                        'result': {'type': 'number'},
                        'expression': {'type': 'string'}
                    }
                }
            }
        ]
        
        for tool_data in default_tools:
            if not Tool.query.filter_by(name=tool_data['name']).first():
                tool = Tool(
                    name=tool_data['name'],
                    description=tool_data['description'],
                    tool_type=tool_data['tool_type'],
                    parameters_schema=tool_data['parameters_schema'],
                    output_schema=tool_data['output_schema'],
                    is_active=True,
                    created_by=admin_user.id
                )
                db.session.add(tool)
        
        # Create default prompts
        default_prompts = [
            {
                'name': 'risk_analysis',
                'description': 'Analyze text for potential risks and provide detailed assessment',
                'template': '''Analyze the following text for potential risks: {text}

Please provide:
1. A risk score from 1-10 (where 10 is highest risk)
2. A list of specific issues found
3. Recommendations for mitigation

Format your response clearly.''',
                'input_schema': {
                    'type': 'object',
                    'properties': {
                        'text': {'type': 'string', 'description': 'Text to analyze'}
                    },
                    'required': ['text']
                },
                'output_schema': {
                    'type': 'object',
                    'properties': {
                        'risk_score': {'type': 'integer', 'minimum': 1, 'maximum': 10},
                        'issues': {'type': 'array', 'items': {'type': 'string'}},
                        'recommendations': {'type': 'array', 'items': {'type': 'string'}}
                    }
                }
            },
            {
                'name': 'web_research',
                'description': 'Research a topic using web search and provide comprehensive summary',
                'template': '''You are a professional researcher. Research the topic: {query}

Please:
1. Use the web_search tool to find relevant information
2. Analyze the search results
3. Provide a comprehensive summary
4. Include credible sources

Be thorough and objective.''',
                'input_schema': {
                    'type': 'object',
                    'properties': {
                        'query': {'type': 'string', 'description': 'Research query'}
                    },
                    'required': ['query']
                },
                'output_schema': {
                    'type': 'object',
                    'properties': {
                        'summary': {'type': 'string'},
                        'key_findings': {'type': 'array', 'items': {'type': 'string'}},
                        'sources': {'type': 'array', 'items': {'type': 'string'}}
                    }
                }
            }
        ]
        
        for prompt_data in default_prompts:
            if not Prompt.query.filter_by(name=prompt_data['name']).first():
                prompt = Prompt(
                    name=prompt_data['name'],
                    description=prompt_data['description'],
                    template=prompt_data['template'],
                    input_schema=prompt_data['input_schema'],
                    output_schema=prompt_data['output_schema'],
                    is_active=True,
                    created_by=admin_user.id
                )
                db.session.add(prompt)
        
        db.session.commit()
        print("✅ Default data created successfully")
        
    except Exception as e:
        print(f"❌ Error creating default data: {e}")
        db.session.rollback()
        raise e

def register_routes(app):
    """Register all application routes"""

    # Health check
    @app.route('/api/health', methods=['GET'])
    def health_check():
        try:
            # Check database connectivity
            db.session.execute('SELECT 1')
            db_status = 'healthy'
        except Exception as e:
            db_status = f'unhealthy: {str(e)}'
        
        # Check Azure OpenAI connectivity
        try:
            llm_status = 'configured' if app.llm_service.clients.get('azure_openai') else 'not configured'
        except:
            llm_status = 'error'
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': app.config['APP_VERSION'],
            'database': db_status,
            'llm_service': llm_status,
            'components': {
                'database': db_status == 'healthy',
                'llm_service': llm_status == 'configured',
                'sql_executor': True,
                'file_system': os.path.exists('temp')
            }
        })
    
    # Authentication routes
    @app.route('/api/auth/login', methods=['POST'])
    def login():
        try:
            data = request.get_json()
            if not data or not data.get('email') or not data.get('password'):
                return jsonify({'error': 'Email and password required'}), 400
            
            user = User.query.filter_by(email=data['email']).first()
            if not user or not check_password_hash(user.password_hash, data['password']):
                return jsonify({'error': 'Invalid credentials'}), 401
            
            if not user.is_active:
                return jsonify({'error': 'Account is deactivated'}), 401
            
            # Update last login
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            access_token = create_access_token(identity=str(user.id))
            
            return jsonify({
                'access_token': access_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                }
            })
            
        except Exception as e:
            app.logger.error(f"Login error: {e}")
            return jsonify({'error': 'Login failed'}), 500
    
    @app.route('/api/auth/register', methods=['POST'])
    def register():
        try:
            data = request.get_json()
            required_fields = ['username', 'email', 'password']
            
            if not data or not all(field in data for field in required_fields):
                return jsonify({'error': 'Username, email and password required'}), 400
            
            if User.query.filter_by(email=data['email']).first():
                return jsonify({'error': 'Email already registered'}), 409
            
            if User.query.filter_by(username=data['username']).first():
                return jsonify({'error': 'Username already taken'}), 409
            
            user = User(
                username=data['username'],
                email=data['email'],
                password_hash=generate_password_hash(data['password']),
                role=data.get('role', 'business_user'),
                is_active=True
            )
            
            db.session.add(user)
            db.session.commit()
            
            access_token = create_access_token(identity=user.id)
            
            return jsonify({
                'access_token': access_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                }
            }), 201
            
        except Exception as e:
            app.logger.error(f"Registration error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Registration failed'}), 500
    
    # Dashboard routes
    @app.route('/api/dashboard/stats', methods=['GET'])
    @jwt_required()
    def dashboard_stats():
        try:
            user_id = int(get_jwt_identity())
            
            stats = {
                'models': Model.query.filter_by(is_active=True).count(),
                'prompts': Prompt.query.filter_by(is_active=True).count(),
                'tools': Tool.query.filter_by(is_active=True).count(),
                'agents': Agent.query.filter_by(is_active=True).count(),
                'workflows': Workflow.query.filter_by(is_active=True).count(),
                'executions_today': Execution.query.filter(
                    Execution.created_at >= datetime.utcnow().date()
                ).count(),
                'total_cost': app.cost_service.get_user_total_cost(user_id),
                'recent_executions': []
            }
            
            # Get recent executions
            recent = Execution.query.order_by(Execution.created_at.desc()).limit(10).all()
            for execution in recent:
                stats['recent_executions'].append({
                    'id': execution.id,
                    'type': execution.execution_type,
                    'status': execution.status,
                    'created_at': execution.created_at.isoformat(),
                    'duration': round(execution.duration, 2) if execution.duration else 0
                })
            
            return jsonify(stats)
            
        except Exception as e:
            app.logger.error(f"Dashboard stats error: {e}")
            return jsonify({'error': 'Failed to fetch dashboard stats'}), 500
    
    # Model management routes
    @app.route('/api/models', methods=['GET'])
    @jwt_required()
    def get_models():
        try:
            models = Model.query.filter_by(is_active=True).all()
            return jsonify([model.to_dict() for model in models])
            
        except Exception as e:
            app.logger.error(f"Get models error: {e}")
            return jsonify({'error': 'Failed to fetch models'}), 500
    
    @app.route('/api/models', methods=['POST'])
    @jwt_required()
    def create_model():
        try:
            user_id = int(get_jwt_identity())
            data = request.get_json()
            
            required_fields = ['name', 'provider', 'model_name']
            if not data or not all(field in data for field in required_fields):
                return jsonify({'error': 'Name, provider, and model_name required'}), 400
            
            model = Model(
                name=data['name'],
                provider=data['provider'],
                model_name=data['model_name'],
                endpoint=data.get('endpoint', ''),
                api_key=data.get('api_key', ''),
                parameters=data.get('parameters', {}),
                cost_per_token=round(float(data.get('cost_per_token', 0.0)), 5),
                is_active=True,
                created_by=user_id
            )
            
            db.session.add(model)
            db.session.commit()
            
            return jsonify({
                'id': model.id,
                'message': 'Model created successfully'
            }), 201
            
        except Exception as e:
            app.logger.error(f"Create model error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to create model'}), 500
    
    # Prompt management routes
    @app.route('/api/prompts', methods=['GET'])
    @jwt_required()
    def get_prompts():
        try:
            prompts = Prompt.query.filter_by(is_active=True).all()
            return jsonify([prompt.to_dict() for prompt in prompts])
            
        except Exception as e:
            app.logger.error(f"Get prompts error: {e}")
            return jsonify({'error': 'Failed to fetch prompts'}), 500
    
    @app.route('/api/prompts', methods=['POST'])
    @jwt_required()
    def create_prompt():
        try:
            user_id = int(get_jwt_identity())
            data = request.get_json()
            
            required_fields = ['name', 'template']
            if not data or not all(field in data for field in required_fields):
                return jsonify({'error': 'Name and template required'}), 400
            
            prompt = Prompt(
                name=data['name'],
                description=data.get('description', ''),
                template=data['template'],
                input_schema=data.get('input_schema', {}),
                output_schema=data.get('output_schema', {}),
                is_active=True,
                created_by=user_id
            )
            
            db.session.add(prompt)
            db.session.commit()
            
            return jsonify({
                'id': prompt.id,
                'message': 'Prompt created successfully'
            }), 201
            
        except Exception as e:
            app.logger.error(f"Create prompt error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to create prompt'}), 500
    
    # Tool management routes
    @app.route('/api/tools', methods=['GET'])
    @jwt_required()
    def get_tools():
        try:
            tools = Tool.query.filter_by(is_active=True).all()
            return jsonify([tool.to_dict() for tool in tools])
            
        except Exception as e:
            app.logger.error(f"Get tools error: {e}")
            return jsonify({'error': 'Failed to fetch tools'}), 500
    
    # Agent management routes
    @app.route('/api/agents', methods=['GET'])
    @jwt_required()
    def get_agents():
        try:
            agents = Agent.query.filter_by(is_active=True).all()
            return jsonify([agent.to_dict() for agent in agents])
            
        except Exception as e:
            app.logger.error(f"Get agents error: {e}")
            return jsonify({'error': 'Failed to fetch agents'}), 500
    
    @app.route('/api/agents', methods=['POST'])
    @jwt_required()
    def create_agent():
        try:
            user_id = int(get_jwt_identity())
            data = request.get_json()
            
            required_fields = ['name', 'model_id', 'prompt_id']
            if not data or not all(field in data for field in required_fields):
                return jsonify({'error': 'Name, model_id, and prompt_id required'}), 400
            
            agent = Agent(
                name=data['name'],
                description=data.get('description', ''),
                model_id=data['model_id'],
                prompt_id=data['prompt_id'],
                parameters=data.get('parameters', {}),
                is_active=True,
                created_by=user_id
            )
            
            # Add tools if specified
            if 'tool_ids' in data:
                tools = Tool.query.filter(Tool.id.in_(data['tool_ids'])).all()
                agent.tools = tools
            
            db.session.add(agent)
            db.session.commit()
            
            return jsonify({
                'id': agent.id,
                'message': 'Agent created successfully'
            }), 201
            
        except Exception as e:
            app.logger.error(f"Create agent error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to create agent'}), 500
    
    # Workflow management routes
    @app.route('/api/workflows', methods=['GET'])
    @jwt_required()
    def get_workflows():
        try:
            workflows = Workflow.query.filter_by(is_active=True).all()
            return jsonify([workflow.to_dict() for workflow in workflows])
            
        except Exception as e:
            app.logger.error(f"Get workflows error: {e}")
            return jsonify({'error': 'Failed to fetch workflows'}), 500
    
    @app.route('/api/workflows', methods=['POST'])
    @jwt_required()
    def create_workflow():
        try:
            user_id = int(get_jwt_identity())
            data = request.get_json()
            
            required_fields = ['name', 'definition']
            if not data or not all(field in data for field in required_fields):
                return jsonify({'error': 'Name and definition required'}), 400
            
            workflow = Workflow(
                name=data['name'],
                description=data.get('description', ''),
                definition=data['definition'],
                is_active=True,
                created_by=user_id
            )
            
            db.session.add(workflow)
            db.session.flush()  # Get the ID
            
            # Create nodes and connections
            if 'nodes' in data['definition']:
                for node_data in data['definition']['nodes']:
                    node = WorkflowNode(
                        workflow_id=workflow.id,
                        node_id=node_data['id'],
                        node_type=node_data['type'],
                        position_x=round(node_data.get('position', {}).get('x', 0), 2),
                        position_y=round(node_data.get('position', {}).get('y', 0), 2),
                        configuration=node_data.get('data', {})
                    )
                    db.session.add(node)
            
            if 'edges' in data['definition']:
                for edge_data in data['definition']['edges']:
                    connection = WorkflowConnection(
                        workflow_id=workflow.id,
                        source_node_id=edge_data['source'],
                        target_node_id=edge_data['target'],
                        source_handle=edge_data.get('sourceHandle', ''),
                        target_handle=edge_data.get('targetHandle', '')
                    )
                    db.session.add(connection)
            
            db.session.commit()
            
            return jsonify({
                'id': workflow.id,
                'message': 'Workflow created successfully'
            }), 201
            
        except Exception as e:
            app.logger.error(f"Create workflow error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to create workflow'}), 500
    
    # Execution routes
    @app.route('/api/executions', methods=['GET'])
    @jwt_required()
    def get_executions():
        try:
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 20))
            
            executions = Execution.query.order_by(Execution.created_at.desc()).paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            result = {
                'executions': [execution.to_dict() for execution in executions.items],
                'total': executions.total,
                'pages': executions.pages,
                'current_page': page
            }
            
            return jsonify(result)
            
        except Exception as e:
            app.logger.error(f"Get executions error: {e}")
            return jsonify({'error': 'Failed to fetch executions'}), 500
    
    @app.route('/api/executions/agent/<int:agent_id>', methods=['POST'])
    @jwt_required()
    def execute_agent(agent_id):
        try:
            user_id = int(get_jwt_identity())
            data = request.get_json()
            
            if not data or 'input_data' not in data:
                return jsonify({'error': 'Input data required'}), 400
            
            # Start execution in background
            execution_id = app.execution_service.execute_agent_async(
                agent_id=agent_id,
                input_data=data['input_data'],
                user_id=user_id
            )
            
            return jsonify({
                'execution_id': execution_id,
                'message': 'Agent execution started'
            }), 202
            
        except Exception as e:
            app.logger.error(f"Execute agent error: {e}")
            return jsonify({'error': 'Failed to execute agent'}), 500
    
    @app.route('/api/executions/<int:execution_id>/status', methods=['GET'])
    @jwt_required()
    def get_execution_status(execution_id):
        try:
            execution = Execution.query.get(execution_id)
            if not execution:
                return jsonify({'error': 'Execution not found'}), 404
            
            # Get execution steps
            steps = ExecutionStep.query.filter_by(execution_id=execution_id).order_by(ExecutionStep.step_order).all()
            
            result = execution.to_dict()
            result['steps'] = [step.to_dict() for step in steps]
            
            return jsonify(result)
            
        except Exception as e:
            app.logger.error(f"Get execution status error: {e}")
            return jsonify({'error': 'Failed to fetch execution status'}), 500
    
    # Enhanced Admin routes with SQL Executor
    @app.route('/api/admin/sql', methods=['POST'])
    @jwt_required()
    @admin_required
    def execute_sql():
        try:
            data = request.get_json()
            if not data or 'query' not in data:
                return jsonify({'error': 'SQL query required'}), 400
            
            query = data['query'].strip()
            page = int(data.get('page', 1))
            per_page = int(data.get('per_page', 100))
            allow_dangerous = data.get('allow_dangerous', False)
            
            # Use the enhanced SQL executor service
            result = app.sql_executor.execute_query(
                query=query,
                page=page,
                per_page=per_page,
                allow_dangerous=allow_dangerous
            )
            
            return jsonify(result)
            
        except Exception as e:
            app.logger.error(f"SQL execution error: {e}")
            return jsonify({'error': f'SQL execution failed: {str(e)}'}), 500
    
    @app.route('/api/admin/sql/validate', methods=['POST'])
    @jwt_required()
    @admin_required
    def validate_sql():
        try:
            data = request.get_json()
            if not data or 'query' not in data:
                return jsonify({'error': 'SQL query required'}), 400
            
            result = app.sql_executor.validate_query_syntax(data['query'])
            return jsonify(result)
            
        except Exception as e:
            app.logger.error(f"SQL validation error: {e}")
            return jsonify({'error': f'SQL validation failed: {str(e)}'}), 500
    
    @app.route('/api/admin/sql/analyze', methods=['POST'])
    @jwt_required()
    @admin_required
    def analyze_sql():
        try:
            data = request.get_json()
            if not data or 'query' not in data:
                return jsonify({'error': 'SQL query required'}), 400
            
            analysis = app.sql_executor.analyze_query(data['query'])
            return jsonify({
                'success': True,
                'analysis': analysis
            })
            
        except Exception as e:
            app.logger.error(f"SQL analysis error: {e}")
            return jsonify({'error': f'SQL analysis failed: {str(e)}'}), 500
    
    @app.route('/api/admin/tables', methods=['GET'])
    @jwt_required()
    @admin_required
    def get_table_info():
        try:
            table_name = request.args.get('table')
            result = app.sql_executor.get_table_info(table_name)
            return jsonify(result)
            
        except Exception as e:
            app.logger.error(f"Get table info error: {e}")
            return jsonify({'error': f'Failed to get table info: {str(e)}'}), 500
    
    @app.route('/api/admin/sql/export', methods=['POST'])
    @jwt_required()
    @admin_required
    def export_sql_results():
        try:
            data = request.get_json()
            if not data or 'query' not in data:
                return jsonify({'error': 'SQL query required'}), 400
            
            query = data['query']
            format_type = data.get('format', 'csv')
            
            result = app.sql_executor.export_query_results(query, format_type)
            
            if result['success']:
                return send_file(
                    result['file_path'],
                    as_attachment=True,
                    download_name=f'query_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.{format_type}'
                )
            else:
                return jsonify(result), 400
                
        except Exception as e:
            app.logger.error(f"SQL export error: {e}")
            return jsonify({'error': f'Export failed: {str(e)}'}), 500
    
    @app.route('/api/admin/users', methods=['GET'])
    @jwt_required()
    @admin_required
    def get_users():
        try:
            users = User.query.all()
            return jsonify([user.to_dict() for user in users])
            
        except Exception as e:
            app.logger.error(f"Get users error: {e}")
            return jsonify({'error': 'Failed to fetch users'}), 500
    
    @app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
    @jwt_required()
    @admin_required
    def update_user(user_id):
        try:
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            if 'role' in data:
                user.role = data['role']
            if 'is_active' in data:
                user.is_active = data['is_active']
            if 'cost_limit' in data:
                user.cost_limit = round(float(data['cost_limit']), 2)
            
            db.session.commit()
            
            return jsonify({'message': 'User updated successfully'})
            
        except Exception as e:
            app.logger.error(f"Update user error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to update user'}), 500
    
    # Cost tracking routes
    @app.route('/api/costs/user', methods=['GET'])
    @jwt_required()
    def get_user_costs():
        try:
            user_id = int(get_jwt_identity())
            costs = app.cost_service.get_user_costs(user_id)
            return jsonify(costs)
            
        except Exception as e:
            app.logger.error(f"Get user costs error: {e}")
            return jsonify({'error': 'Failed to fetch user costs'}), 500
    
    return app

@contextmanager
def get_db_connection():
    """Get a direct SQLite connection for raw SQL execution"""
    conn = None
    try:
        # Get database path from config
        db_url = os.environ.get('DATABASE_URL', 'sqlite:///blitz.db')
        db_path = db_url.replace('sqlite:///', '')
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        yield conn
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    app = create_app()
    print("🚀 Blitz AI Framework Backend Starting...")
    print(f"📊 Dashboard: http://{app.config['SERVER_HOST']}:{app.config['SERVER_PORT']}")
    print(f"🔍 API Health: http://{app.config['SERVER_HOST']}:{app.config['SERVER_PORT']}/api/health")
    print("👤 Default Admin: admin@blitz.com / admin123")
    print("👤 Default User: user@blitz.com / user123")
    print("👤 Demo User: demo@blitz.com / demo123")
    print("🗄️ Enhanced SQL Executor: Available in Admin Panel")
    app.run(
        host=app.config['SERVER_HOST'], 
        port=app.config['SERVER_PORT'], 
        debug=app.config['DEBUG']
    )