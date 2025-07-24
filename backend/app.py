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
    # CORS(app, origins=app.config['CORS_ORIGINS'])
    # Configure CORS properly
    from flask_cors import CORS
    
    CORS(app, 
         origins=['http://localhost:3000'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization'],
         supports_credentials=True)    
    
    jwt = JWTManager(app)

    # Initialize services
    app.llm_service = LLMService(app.config)
    app.agent_service = AgentService(db)
    app.workflow_service = WorkflowService(db)
    app.execution_service = ExecutionService(db, app.llm_service)
    app.cost_service = CostService(db)
    app.audit_service = AuditService(db)
    
    # Initialize SQL executor with proper database path
    app.sql_executor = SQLExecutorService(app.config['SQLALCHEMY_DATABASE_URI'])
    
    # Thread pool for async execution
    app.executor = ThreadPoolExecutor(max_workers=app.config['MAX_CONCURRENT_EXECUTIONS'])
    
    with app.app_context():
        # Ensure database and tables exist
        try:
            db.create_all()
            create_default_data()
            print(f"✅ Database initialized at: {app.sql_executor.db_path}")
        except Exception as e:
            print(f"❌ Database initialization error: {e}")
    
    # Before request handler for audit logging
    @app.before_request
    def before_request():
        g.start_time = time.time()
        g.request_id = str(uuid.uuid4())

    @app.before_request
    def handle_options():
        if request.method == 'OPTIONS':
            response = jsonify({})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
            return response


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
            from sqlalchemy import text
            # Check database connectivity
            db.session.execute(text('SELECT 1'))
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


    @app.route('/api/executions/workflow/<int:workflow_id>', methods=['POST'])
    @jwt_required()
    def execute_workflow(workflow_id):
        try:
            user_id = int(get_jwt_identity())
            data = request.get_json()
            
            if not data or 'input_data' not in data:
                return jsonify({'error': 'Input data required'}), 400
            
            # Start execution in background
            execution_id = app.execution_service.execute_workflow_async(
                workflow_id=workflow_id,
                input_data=data['input_data'],
                user_id=user_id
            )
            
            return jsonify({
                'execution_id': execution_id,
                'message': 'Workflow execution started'
            }), 202
            
        except Exception as e:
            app.logger.error(f"Execute workflow error: {e}")
            return jsonify({'error': 'Failed to execute workflow'}), 500


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
            
            # Enhanced permissions for admin users
            # Allow more operations for testing and administration
            if query.upper().startswith(('SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'PRAGMA')):
                allow_dangerous = True  # Read operations are always safe
            
            # Use the enhanced SQL executor service
            result = app.sql_executor.execute_query(
                query=query,
                page=page,
                per_page=per_page,
                allow_dangerous=allow_dangerous
            )
            
            # Enhanced error handling
            if not result.get('success', False):
                error_msg = result.get('error', 'Unknown error')
                
                # Check if it's a security-related error
                if any(word in error_msg.lower() for word in ['blocked', 'dangerous', 'security']):
                    return jsonify({
                        'success': False,
                        'error': error_msg,
                        'suggestion': 'Try setting allow_dangerous=true for write operations',
                        'query_analysis': result.get('analysis', {}),
                        'warnings': result.get('warnings', [])
                    }), 403  # Forbidden for security blocks
                else:
                    return jsonify(result), 400  # Bad request for other errors
            
            return jsonify(result), 200
            
        except Exception as e:
            app.logger.error(f"SQL execution error: {e}")
            return jsonify({
                'success': False,
                'error': f'SQL execution failed: {str(e)}',
                'suggestion': 'Check query syntax and database connection'
            }), 500


    @app.route('/api/admin/sql/schema', methods=['GET'])
    @jwt_required()
    @admin_required
    def get_database_schema():
        try:
            table_name = request.args.get('table')
            
            if table_name:
                # Get specific table schema
                result = app.sql_executor.get_table_info(table_name)
            else:
                # Get all tables overview
                result = app.sql_executor.get_table_info()
            
            return jsonify(result)
            
        except Exception as e:
            app.logger.error(f"Get database schema error: {e}")
            return jsonify({'error': f'Failed to get database schema: {str(e)}'}), 500

    @app.route('/api/admin/sql/tables', methods=['GET'])
    @jwt_required()
    @admin_required  
    def get_table_list():
        """Get list of all tables with basic info"""
        try:
            result = app.sql_executor.get_table_info()
            
            if result.get('success'):
                # Format for easier consumption
                tables_info = []
                for table in result.get('tables', []):
                    tables_info.append({
                        'name': table['name'],
                        'row_count': table.get('row_count', 0),
                        'type': 'table'
                    })
                
                for view in result.get('views', []):
                    tables_info.append({
                        'name': view['name'], 
                        'row_count': 0,
                        'type': 'view'
                    })
                
                return jsonify({
                    'success': True,
                    'tables': tables_info,
                    'total_tables': result.get('total_tables', 0),
                    'total_views': result.get('total_views', 0)
                })
            else:
                return jsonify(result), 400
                
        except Exception as e:
            app.logger.error(f"Get table list error: {e}")
            return jsonify({'error': f'Failed to get table list: {str(e)}'}), 500

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

    # Model management - PUT/DELETE routes
    # Model UPDATE route (ADD THIS)
    @app.route('/api/models/<int:model_id>', methods=['PUT', 'OPTIONS'])
    @jwt_required()
    def update_model(model_id):
        if request.method == 'OPTIONS':
            return '', 200
            
        try:
            model = Model.query.get(model_id)
            if not model:
                return jsonify({'error': 'Model not found'}), 404
            
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Update fields
            if 'name' in data:
                model.name = data['name']
            if 'provider' in data:
                model.provider = data['provider']
            if 'model_name' in data:
                model.model_name = data['model_name']
            if 'endpoint' in data:
                model.endpoint = data['endpoint']
            if 'api_key' in data:
                model.api_key = data['api_key']
            if 'parameters' in data:
                model.parameters = data['parameters']
            if 'cost_per_token' in data:
                model.cost_per_token = round(float(data['cost_per_token']), 5)
            
            model.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({'message': 'Model updated successfully'})
            
        except Exception as e:
            app.logger.error(f"Update model error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to update model'}), 500

    # Model DELETE route (ADD THIS)
    @app.route('/api/models/<int:model_id>', methods=['DELETE'])
    @jwt_required()
    def delete_model(model_id):
        try:
            model = Model.query.get(model_id)
            if not model:
                return jsonify({'error': 'Model not found'}), 404
            
            # Soft delete by setting is_active to False
            model.is_active = False
            model.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({'message': 'Model deleted successfully'})
            
        except Exception as e:
            app.logger.error(f"Delete model error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to delete model'}), 500

    # Prompt UPDATE route (ADD THIS)
    @app.route('/api/prompts/<int:prompt_id>', methods=['PUT', 'OPTIONS'])
    @jwt_required()
    def update_prompt(prompt_id):
        if request.method == 'OPTIONS':
            return '', 200
            
        try:
            prompt = Prompt.query.get(prompt_id)
            if not prompt:
                return jsonify({'error': 'Prompt not found'}), 404
            
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Update fields
            if 'name' in data:
                prompt.name = data['name']
            if 'description' in data:
                prompt.description = data['description']
            if 'template' in data:
                prompt.template = data['template']
            if 'input_schema' in data:
                prompt.input_schema = data['input_schema']
            if 'output_schema' in data:
                prompt.output_schema = data['output_schema']
            
            prompt.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({'message': 'Prompt updated successfully'})
            
        except Exception as e:
            app.logger.error(f"Update prompt error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to update prompt'}), 500

    # Prompt DELETE route (ADD THIS)
    @app.route('/api/prompts/<int:prompt_id>', methods=['DELETE'])
    @jwt_required()
    def delete_prompt(prompt_id):
        try:
            prompt = Prompt.query.get(prompt_id)
            if not prompt:
                return jsonify({'error': 'Prompt not found'}), 404
            
            # Soft delete
            prompt.is_active = False
            prompt.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({'message': 'Prompt deleted successfully'})
            
        except Exception as e:
            app.logger.error(f"Delete prompt error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to delete prompt'}), 500

    # Tool CREATE route (ADD THIS - currently missing)
    @app.route('/api/tools', methods=['POST'])
    @jwt_required()
    @admin_required  # Only admins can create tools
    def create_tool():
        try:
            user_id = int(get_jwt_identity())
            data = request.get_json()
            
            required_fields = ['name', 'description', 'tool_type']
            if not data or not all(field in data for field in required_fields):
                return jsonify({'error': 'Name, description, and tool_type required'}), 400
            
            tool = Tool(
                name=data['name'],
                description=data['description'],
                tool_type=data['tool_type'],
                implementation=data.get('implementation', ''),
                parameters_schema=data.get('parameters_schema', {}),
                output_schema=data.get('output_schema', {}),
                is_active=True,
                created_by=user_id
            )
            
            db.session.add(tool)
            db.session.commit()
            
            return jsonify({
                'id': tool.id,
                'message': 'Tool created successfully'
            }), 201
            
        except Exception as e:
            app.logger.error(f"Create tool error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to create tool'}), 500

    # Tool UPDATE route (ADD THIS)
    @app.route('/api/tools/<int:tool_id>', methods=['PUT', 'OPTIONS'])
    @jwt_required()
    @admin_required
    def update_tool(tool_id):
        if request.method == 'OPTIONS':
            return '', 200
            
        try:
            tool = Tool.query.get(tool_id)
            if not tool:
                return jsonify({'error': 'Tool not found'}), 404
            
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Update fields
            if 'name' in data:
                tool.name = data['name']
            if 'description' in data:
                tool.description = data['description']
            if 'tool_type' in data:
                tool.tool_type = data['tool_type']
            if 'implementation' in data:
                tool.implementation = data['implementation']
            if 'parameters_schema' in data:
                tool.parameters_schema = data['parameters_schema']
            if 'output_schema' in data:
                tool.output_schema = data['output_schema']
            
            tool.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({'message': 'Tool updated successfully'})
            
        except Exception as e:
            app.logger.error(f"Update tool error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to update tool'}), 500

    # Tool DELETE route (ADD THIS)
    @app.route('/api/tools/<int:tool_id>', methods=['DELETE'])
    @jwt_required()
    @admin_required
    def delete_tool(tool_id):
        try:
            tool = Tool.query.get(tool_id)
            if not tool:
                return jsonify({'error': 'Tool not found'}), 404
            
            # Soft delete
            tool.is_active = False
            tool.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({'message': 'Tool deleted successfully'})
            
        except Exception as e:
            app.logger.error(f"Delete tool error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to delete tool'}), 500

    # Agent UPDATE route (ADD THIS)
    @app.route('/api/agents/<int:agent_id>', methods=['PUT', 'OPTIONS'])
    @jwt_required()
    def update_agent(agent_id):
        if request.method == 'OPTIONS':
            return '', 200
            
        try:
            agent = Agent.query.get(agent_id)
            if not agent:
                return jsonify({'error': 'Agent not found'}), 404
            
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Update fields
            if 'name' in data:
                agent.name = data['name']
            if 'description' in data:
                agent.description = data['description']
            if 'model_id' in data:
                agent.model_id = data['model_id']
            if 'prompt_id' in data:
                agent.prompt_id = data['prompt_id']
            if 'parameters' in data:
                agent.parameters = data['parameters']
            if 'memory_config' in data:
                agent.memory_config = data['memory_config']
            
            # Update tools if specified
            if 'tool_ids' in data:
                tools = Tool.query.filter(Tool.id.in_(data['tool_ids'])).all()
                agent.tools = tools
            
            agent.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({'message': 'Agent updated successfully'})
            
        except Exception as e:
            app.logger.error(f"Update agent error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to update agent'}), 500

    # Agent DELETE route (ADD THIS)
    @app.route('/api/agents/<int:agent_id>', methods=['DELETE'])
    @jwt_required()
    def delete_agent(agent_id):
        try:
            agent = Agent.query.get(agent_id)
            if not agent:
                return jsonify({'error': 'Agent not found'}), 404
            
            # Soft delete
            agent.is_active = False
            agent.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({'message': 'Agent deleted successfully'})
            
        except Exception as e:
            app.logger.error(f"Delete agent error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to delete agent'}), 500

    # Workflow UPDATE route (ADD THIS)
    @app.route('/api/workflows/<int:workflow_id>', methods=['PUT', 'OPTIONS'])
    @jwt_required()
    def update_workflow(workflow_id):
        if request.method == 'OPTIONS':
            return '', 200
            
        try:
            workflow = Workflow.query.get(workflow_id)
            if not workflow:
                return jsonify({'error': 'Workflow not found'}), 404
            
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Update fields
            if 'name' in data:
                workflow.name = data['name']
            if 'description' in data:
                workflow.description = data['description']
            if 'definition' in data:
                workflow.definition = data['definition']
            
            workflow.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({'message': 'Workflow updated successfully'})
            
        except Exception as e:
            app.logger.error(f"Update workflow error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to update workflow'}), 500

    # Workflow DELETE route (ADD THIS)
    @app.route('/api/workflows/<int:workflow_id>', methods=['DELETE'])
    @jwt_required()
    def delete_workflow(workflow_id):
        try:
            workflow = Workflow.query.get(workflow_id)
            if not workflow:
                return jsonify({'error': 'Workflow not found'}), 404
            
            # Soft delete
            workflow.is_active = False
            workflow.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({'message': 'Workflow deleted successfully'})
            
        except Exception as e:
            app.logger.error(f"Delete workflow error: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to delete workflow'}), 500


    # Cost tracking routes (ADD THESE)
    @app.route('/api/costs', methods=['GET'])
    @jwt_required()
    def get_costs():
        try:
            user_id = int(get_jwt_identity())
            timeframe = request.args.get('timeframe', '7d')
            model_filter = request.args.get('model', 'all')
            
            # Calculate date range
            if timeframe == '1d':
                since_date = datetime.utcnow() - timedelta(days=1)
            elif timeframe == '30d':
                since_date = datetime.utcnow() - timedelta(days=30)
            else:  # 7d default
                since_date = datetime.utcnow() - timedelta(days=7)
            
            # Get user costs (admins see all, users see their own)
            user = User.query.get(user_id)
            if user.role == 'admin':
                costs_query = Cost.query.filter(Cost.created_at >= since_date)
            else:
                costs_query = Cost.query.filter(
                    Cost.user_id == user_id,
                    Cost.created_at >= since_date
                )
            
            # Apply model filter if specified
            if model_filter != 'all':
                costs_query = costs_query.join(Execution).filter(
                    Execution.model_id == int(model_filter)
                )
            
            costs = costs_query.all()
            
            # Calculate aggregations
            total_cost = sum(cost.amount for cost in costs)
            
            # Daily breakdown
            daily_costs = {}
            for cost in costs:
                date_key = cost.created_at.strftime('%Y-%m-%d')
                if date_key not in daily_costs:
                    daily_costs[date_key] = 0.0
                daily_costs[date_key] = round(daily_costs[date_key] + cost.amount, 3)
            
            # Model breakdown
            model_costs = {}
            for cost in costs:
                execution = Execution.query.get(cost.execution_id)
                if execution and execution.model_id:
                    model = Model.query.get(execution.model_id)
                    model_name = model.name if model else 'Unknown'
                    if model_name not in model_costs:
                        model_costs[model_name] = 0.0
                    model_costs[model_name] = round(model_costs[model_name] + cost.amount, 3)
            
            # User breakdown (admin only)
            user_costs = {}
            if user.role == 'admin':
                for cost in costs:
                    user_obj = User.query.get(cost.user_id)
                    username = user_obj.username if user_obj else 'Unknown'
                    if username not in user_costs:
                        user_costs[username] = 0.0
                    user_costs[username] = round(user_costs[username] + cost.amount, 3)
            
            return jsonify({
                'total_cost': round(total_cost, 2),
                'daily_costs': [
                    {'date': date, 'cost': cost} 
                    for date, cost in sorted(daily_costs.items())
                ],
                'model_costs': [
                    {'model': model, 'cost': cost} 
                    for model, cost in model_costs.items()
                ],
                'user_costs': [
                    {'user': user, 'cost': cost} 
                    for user, cost in user_costs.items()
                ],
                'executions': len(set(cost.execution_id for cost in costs))
            })
            
        except Exception as e:
            app.logger.error(f"Get costs error: {e}")
            return jsonify({'error': 'Failed to fetch costs'}), 500

    # Admin routes for SQL executor (ADD THESE)
    @app.route('/api/admin/tables', methods=['GET'])
    @jwt_required()
    @admin_required
    def get_database_tables():
        try:
            tables = app.sql_executor.get_tables()
            return jsonify({'data': tables})
            
        except Exception as e:
            app.logger.error(f"Get tables error: {e}")
            return jsonify({'error': 'Failed to fetch database tables'}), 500

    @app.route('/api/admin/table/<table_name>/schema', methods=['GET'])
    @jwt_required()
    @admin_required
    def get_table_schema(table_name):
        try:
            schema = app.sql_executor.get_table_schema(table_name)
            return jsonify({'data': schema})
            
        except Exception as e:
            app.logger.error(f"Get table schema error: {e}")
            return jsonify({'error': 'Failed to fetch table schema'}), 500

    @app.route('/api/admin/table/<table_name>/data', methods=['GET'])
    @jwt_required()
    @admin_required
    def get_table_data(table_name):
        try:
            page = int(request.args.get('page', 1))
            page_size = int(request.args.get('page_size', 50))
            
            data = app.sql_executor.get_table_data(table_name, page, page_size)
            return jsonify({'data': data})
            
        except Exception as e:
            app.logger.error(f"Get table data error: {e}")
            return jsonify({'error': 'Failed to fetch table data'}), 500


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
        debug=False,
        use_reloader=False
    )