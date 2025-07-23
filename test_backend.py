# test_backend.py
"""
Comprehensive test script for Blitz AI Framework Backend
Run this in a separate terminal while the backend is running on the configured port

Usage: python test_backend.py
"""

import os
import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional

class BlitzAPITester:
    def __init__(self, base_url: str = None):
        # Load environment variables from .env if available
        try:
            from dotenv import load_dotenv
            load_dotenv()
        except ImportError:
            pass  # python-dotenv not installed, continue without it
        
        # Get port from environment or use default
        port = os.environ.get('SERVER_PORT', os.environ.get('FLASK_RUN_PORT', '5123'))
        self.base_url = base_url or f"http://localhost:{port}"
        self.session = requests.Session()
        self.admin_token = None
        self.user_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str = "", data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        result = {
            'timestamp': timestamp,
            'test_name': test_name,
            'success': success,
            'message': message,
            'data': data
        }
        
        self.test_results.append(result)
        print(f"[{timestamp}] {status} - {test_name}")
        if message:
            print(f"    {message}")
        if not success and data:
            print(f"    Error Data: {data}")
        print()
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    token: str = None, params: Dict = None) -> requests.Response:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers, params=params)
            elif method.upper() == 'POST':
                response = self.session.post(url, headers=headers, json=data)
            elif method.upper() == 'PUT':
                response = self.session.put(url, headers=headers, json=data)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
            
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}")
            raise
    
    def test_health_check(self):
        """Test API health check"""
        try:
            response = self.make_request('GET', '/api/health')
            
            if response.status_code == 200:
                data = response.json()
                if 'status' in data and data['status'] == 'healthy':
                    self.log_test("Health Check", True, f"API is healthy - Version: {data.get('version', 'unknown')}")
                else:
                    self.log_test("Health Check", False, "Health check response invalid", data)
            else:
                self.log_test("Health Check", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
    
    def test_authentication(self):
        """Test authentication endpoints"""
        # Test admin login
        try:
            admin_data = {
                'email': 'admin@blitz.com',
                'password': 'admin123'
            }
            
            response = self.make_request('POST', '/api/auth/login', admin_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data:
                    self.admin_token = data['access_token']
                    user_info = data.get('user', {})
                    self.log_test("Admin Login", True, 
                                f"Logged in as {user_info.get('username')} ({user_info.get('role')})")
                else:
                    self.log_test("Admin Login", False, "No access token in response", data)
            else:
                self.log_test("Admin Login", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
        
        # Test business user login
        try:
            user_data = {
                'email': 'user@blitz.com',
                'password': 'user123'
            }
            
            response = self.make_request('POST', '/api/auth/login', user_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data:
                    self.user_token = data['access_token']
                    user_info = data.get('user', {})
                    self.log_test("Business User Login", True, 
                                f"Logged in as {user_info.get('username')} ({user_info.get('role')})")
                else:
                    self.log_test("Business User Login", False, "No access token in response", data)
            else:
                self.log_test("Business User Login", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Business User Login", False, f"Exception: {str(e)}")
        
        # Test invalid login
        try:
            invalid_data = {
                'email': 'invalid@test.com',
                'password': 'wrongpassword'
            }
            
            response = self.make_request('POST', '/api/auth/login', invalid_data)
            
            if response.status_code == 401:
                self.log_test("Invalid Login Rejection", True, "Invalid credentials properly rejected")
            else:
                self.log_test("Invalid Login Rejection", False, 
                            f"Expected 401, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Invalid Login Rejection", False, f"Exception: {str(e)}")
    
    def test_dashboard(self):
        """Test dashboard endpoints"""
        if not self.admin_token:
            self.log_test("Dashboard Stats", False, "No admin token available")
            return
        
        try:
            response = self.make_request('GET', '/api/dashboard/stats', token=self.admin_token)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['models', 'prompts', 'tools', 'agents', 'workflows', 'executions_today']
                
                if all(field in data for field in required_fields):
                    self.log_test("Dashboard Stats", True, 
                                f"Stats: {data['models']} models, {data['prompts']} prompts, "
                                f"{data['tools']} tools, {data['agents']} agents, {data['workflows']} workflows")
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Dashboard Stats", False, f"Missing fields: {missing}", data)
            else:
                self.log_test("Dashboard Stats", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Dashboard Stats", False, f"Exception: {str(e)}")
    
    def test_models(self):
        """Test model management endpoints"""
        if not self.admin_token:
            self.log_test("Model Management", False, "No admin token available")
            return
        
        # Test getting models
        try:
            response = self.make_request('GET', '/api/models', token=self.admin_token)
            
            if response.status_code == 200:
                models = response.json()
                if isinstance(models, list):
                    self.log_test("Get Models", True, f"Retrieved {len(models)} models")
                    
                    # Check if default model exists
                    default_model = next((m for m in models if m['name'] == 'azure-gpt-4'), None)
                    if default_model:
                        self.log_test("Default Model Check", True, 
                                    f"Default Azure GPT-4 model found with provider: {default_model['provider']}")
                    else:
                        self.log_test("Default Model Check", False, "Default Azure GPT-4 model not found")
                else:
                    self.log_test("Get Models", False, "Response is not a list", models)
            else:
                self.log_test("Get Models", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Models", False, f"Exception: {str(e)}")
        
        # Test creating a model
        try:
            new_model = {
                'name': f'test-model-{int(time.time())}',
                'provider': 'azure_openai',
                'model_name': 'gpt-3.5-turbo',
                'cost_per_token': 0.00002,
                'parameters': {
                    'temperature': 0.5,
                    'max_tokens': 2000
                }
            }
            
            response = self.make_request('POST', '/api/models', new_model, token=self.admin_token)
            
            if response.status_code == 201:
                data = response.json()
                if 'id' in data:
                    self.log_test("Create Model", True, f"Created model with ID: {data['id']}")
                else:
                    self.log_test("Create Model", False, "No ID in response", data)
            else:
                self.log_test("Create Model", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Create Model", False, f"Exception: {str(e)}")
    
    def test_prompts(self):
        """Test prompt management endpoints"""
        if not self.admin_token:
            self.log_test("Prompt Management", False, "No admin token available")
            return
        
        # Test getting prompts
        try:
            response = self.make_request('GET', '/api/prompts', token=self.admin_token)
            
            if response.status_code == 200:
                prompts = response.json()
                if isinstance(prompts, list):
                    self.log_test("Get Prompts", True, f"Retrieved {len(prompts)} prompts")
                    
                    # Check for default prompts
                    risk_prompt = next((p for p in prompts if p['name'] == 'risk_analysis'), None)
                    if risk_prompt:
                        self.log_test("Default Risk Analysis Prompt", True, "Found default risk analysis prompt")
                    else:
                        self.log_test("Default Risk Analysis Prompt", False, "Risk analysis prompt not found")
                else:
                    self.log_test("Get Prompts", False, "Response is not a list", prompts)
            else:
                self.log_test("Get Prompts", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Prompts", False, f"Exception: {str(e)}")
        
        # Test creating a prompt
        try:
            new_prompt = {
                'name': f'test-prompt-{int(time.time())}',
                'description': 'Test prompt for automated testing',
                'template': 'Analyze the following text and provide insights: {text}',
                'input_schema': {
                    'type': 'object',
                    'properties': {
                        'text': {'type': 'string'}
                    },
                    'required': ['text']
                },
                'output_schema': {
                    'type': 'object',
                    'properties': {
                        'insights': {'type': 'string'}
                    }
                }
            }
            
            response = self.make_request('POST', '/api/prompts', new_prompt, token=self.admin_token)
            
            if response.status_code == 201:
                data = response.json()
                if 'id' in data:
                    self.log_test("Create Prompt", True, f"Created prompt with ID: {data['id']}")
                else:
                    self.log_test("Create Prompt", False, "No ID in response", data)
            else:
                self.log_test("Create Prompt", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Create Prompt", False, f"Exception: {str(e)}")
    
    def test_tools(self):
        """Test tool management endpoints"""
        if not self.admin_token:
            self.log_test("Tool Management", False, "No admin token available")
            return
        
        # Test getting tools
        try:
            response = self.make_request('GET', '/api/tools', token=self.admin_token)
            
            if response.status_code == 200:
                tools = response.json()
                if isinstance(tools, list):
                    self.log_test("Get Tools", True, f"Retrieved {len(tools)} tools")
                    
                    # Check for default tools
                    expected_tools = ['web_search', 'file_write', 'file_read']
                    found_tools = [t['name'] for t in tools]
                    
                    for expected in expected_tools:
                        if expected in found_tools:
                            self.log_test(f"Default Tool: {expected}", True, f"Found {expected} tool")
                        else:
                            self.log_test(f"Default Tool: {expected}", False, f"{expected} tool not found")
                else:
                    self.log_test("Get Tools", False, "Response is not a list", tools)
            else:
                self.log_test("Get Tools", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Tools", False, f"Exception: {str(e)}")
    
    def test_agents(self):
        """Test agent management endpoints"""
        if not self.admin_token:
            self.log_test("Agent Management", False, "No admin token available")
            return
        
        # First get models and prompts to create agent
        models_response = self.make_request('GET', '/api/models', token=self.admin_token)
        prompts_response = self.make_request('GET', '/api/prompts', token=self.admin_token)
        tools_response = self.make_request('GET', '/api/tools', token=self.admin_token)
        
        if (models_response.status_code != 200 or 
            prompts_response.status_code != 200 or 
            tools_response.status_code != 200):
            self.log_test("Agent Prerequisites", False, "Could not fetch models, prompts, or tools")
            return
        
        models = models_response.json()
        prompts = prompts_response.json()
        tools = tools_response.json()
        
        if not models or not prompts:
            self.log_test("Agent Prerequisites", False, "No models or prompts available")
            return
        
        # Test getting agents
        try:
            response = self.make_request('GET', '/api/agents', token=self.admin_token)
            
            if response.status_code == 200:
                agents = response.json()
                if isinstance(agents, list):
                    self.log_test("Get Agents", True, f"Retrieved {len(agents)} agents")
                else:
                    self.log_test("Get Agents", False, "Response is not a list", agents)
            else:
                self.log_test("Get Agents", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Agents", False, f"Exception: {str(e)}")
        
        # Test creating an agent
        try:
            new_agent = {
                'name': f'test-agent-{int(time.time())}',
                'description': 'Test agent for automated testing',
                'model_id': models[0]['id'],
                'prompt_id': prompts[0]['id'],
                'parameters': {
                    'temperature': 0.7,
                    'max_iterations': 3
                },
                'tool_ids': [tools[0]['id']] if tools else []
            }
            
            response = self.make_request('POST', '/api/agents', new_agent, token=self.admin_token)
            
            if response.status_code == 201:
                data = response.json()
                if 'id' in data:
                    self.log_test("Create Agent", True, f"Created agent with ID: {data['id']}")
                    return data['id']  # Return agent ID for execution test
                else:
                    self.log_test("Create Agent", False, "No ID in response", data)
            else:
                self.log_test("Create Agent", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Create Agent", False, f"Exception: {str(e)}")
        
        return None
    
    def test_workflows(self):
        """Test workflow management endpoints"""
        if not self.admin_token:
            self.log_test("Workflow Management", False, "No admin token available")
            return
        
        # Test getting workflows
        try:
            response = self.make_request('GET', '/api/workflows', token=self.admin_token)
            
            if response.status_code == 200:
                workflows = response.json()
                if isinstance(workflows, list):
                    self.log_test("Get Workflows", True, f"Retrieved {len(workflows)} workflows")
                else:
                    self.log_test("Get Workflows", False, "Response is not a list", workflows)
            else:
                self.log_test("Get Workflows", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Workflows", False, f"Exception: {str(e)}")
        
        # Test creating a workflow
        try:
            new_workflow = {
                'name': f'test-workflow-{int(time.time())}',
                'description': 'Test workflow for automated testing',
                'definition': {
                    'nodes': [
                        {
                            'id': 'start',
                            'type': 'start',
                            'position': {'x': 100, 'y': 100},
                            'data': {}
                        },
                        {
                            'id': 'end',
                            'type': 'end',
                            'position': {'x': 400, 'y': 100},
                            'data': {}
                        }
                    ],
                    'edges': [
                        {
                            'id': 'start-end',
                            'source': 'start',
                            'target': 'end'
                        }
                    ]
                }
            }
            
            response = self.make_request('POST', '/api/workflows', new_workflow, token=self.admin_token)
            
            if response.status_code == 201:
                data = response.json()
                if 'id' in data:
                    self.log_test("Create Workflow", True, f"Created workflow with ID: {data['id']}")
                    return data['id']  # Return workflow ID for execution test
                else:
                    self.log_test("Create Workflow", False, "No ID in response", data)
            else:
                self.log_test("Create Workflow", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Create Workflow", False, f"Exception: {str(e)}")
        
        return None
    
    def test_executions(self, agent_id: Optional[int] = None, workflow_id: Optional[int] = None):
        """Test execution endpoints"""
        if not self.admin_token:
            self.log_test("Execution Management", False, "No admin token available")
            return
        
        # Test getting executions
        try:
            response = self.make_request('GET', '/api/executions', token=self.admin_token)
            
            if response.status_code == 200:
                data = response.json()
                if 'executions' in data and isinstance(data['executions'], list):
                    self.log_test("Get Executions", True, 
                                f"Retrieved {len(data['executions'])} executions (Total: {data.get('total', 0)})")
                else:
                    self.log_test("Get Executions", False, "Invalid response format", data)
            else:
                self.log_test("Get Executions", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Executions", False, f"Exception: {str(e)}")
        
        # Test agent execution
        if agent_id:
            try:
                execution_data = {
                    'input_data': {
                        'text': 'This is a test document for risk analysis. It contains some potential security concerns and compliance issues.'
                    }
                }
                
                response = self.make_request('POST', f'/api/executions/agent/{agent_id}', 
                                           execution_data, token=self.admin_token)
                
                if response.status_code == 202:
                    data = response.json()
                    if 'execution_id' in data:
                        execution_id = data['execution_id']
                        self.log_test("Start Agent Execution", True, f"Started execution with ID: {execution_id}")
                        
                        # Wait a bit and check status
                        time.sleep(2)
                        self.check_execution_status(execution_id)
                    else:
                        self.log_test("Start Agent Execution", False, "No execution ID in response", data)
                else:
                    self.log_test("Start Agent Execution", False, f"Status code: {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_test("Start Agent Execution", False, f"Exception: {str(e)}")
        
        # Test workflow execution
        if workflow_id:
            try:
                execution_data = {
                    'input_data': {
                        'message': 'Test workflow execution'
                    }
                }
                
                response = self.make_request('POST', f'/api/executions/workflow/{workflow_id}', 
                                           execution_data, token=self.admin_token)
                
                if response.status_code == 202:
                    data = response.json()
                    if 'execution_id' in data:
                        execution_id = data['execution_id']
                        self.log_test("Start Workflow Execution", True, f"Started execution with ID: {execution_id}")
                        
                        # Wait a bit and check status
                        time.sleep(2)
                        self.check_execution_status(execution_id)
                    else:
                        self.log_test("Start Workflow Execution", False, "No execution ID in response", data)
                else:
                    self.log_test("Start Workflow Execution", False, f"Status code: {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_test("Start Workflow Execution", False, f"Exception: {str(e)}")
    
    def check_execution_status(self, execution_id: int):
        """Check execution status"""
        try:
            response = self.make_request('GET', f'/api/executions/{execution_id}/status', token=self.admin_token)
            
            if response.status_code == 200:
                data = response.json()
                status = data.get('status', 'unknown')
                steps = data.get('steps', [])
                
                self.log_test("Check Execution Status", True, 
                            f"Execution {execution_id} status: {status}, Steps: {len(steps)}")
                
                if data.get('error_message'):
                    self.log_test("Execution Error", False, f"Error: {data['error_message']}")
                
            else:
                self.log_test("Check Execution Status", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Check Execution Status", False, f"Exception: {str(e)}")
    
    def test_admin_features(self):
        """Test admin-specific features"""
        if not self.admin_token:
            self.log_test("Admin Features", False, "No admin token available")
            return
        
        # Test user management
        try:
            response = self.make_request('GET', '/api/admin/users', token=self.admin_token)
            
            if response.status_code == 200:
                users = response.json()
                if isinstance(users, list):
                    self.log_test("Admin - Get Users", True, f"Retrieved {len(users)} users")
                    
                    # Check if default users exist
                    admin_user = next((u for u in users if u['email'] == 'admin@blitz.com'), None)
                    business_user = next((u for u in users if u['email'] == 'user@blitz.com'), None)
                    
                    if admin_user:
                        self.log_test("Admin - Default Admin User", True, f"Found admin user: {admin_user['username']}")
                    if business_user:
                        self.log_test("Admin - Default Business User", True, f"Found business user: {business_user['username']}")
                        
                else:
                    self.log_test("Admin - Get Users", False, "Response is not a list", users)
            else:
                self.log_test("Admin - Get Users", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Admin - Get Users", False, f"Exception: {str(e)}")
        
        # Test SQL executor with a simple query
        try:
            sql_data = {
                'query': 'SELECT name, email, role FROM users LIMIT 5',
                'page': 1,
                'per_page': 10
            }
            
            response = self.make_request('POST', '/api/admin/sql', sql_data, token=self.admin_token)
            
            if response.status_code == 200:
                data = response.json()
                if 'columns' in data and 'rows' in data:
                    columns = data['columns']
                    rows = data['rows']
                    self.log_test("Admin - SQL Executor", True, 
                                f"Query executed successfully - Columns: {columns}, Rows: {len(rows)}")
                else:
                    self.log_test("Admin - SQL Executor", False, "Invalid response format", data)
            else:
                self.log_test("Admin - SQL Executor", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Admin - SQL Executor", False, f"Exception: {str(e)}")
        
        # Test dangerous SQL prevention
        try:
            dangerous_sql = {
                'query': 'DROP TABLE users;',
                'page': 1,
                'per_page': 10
            }
            
            response = self.make_request('POST', '/api/admin/sql', dangerous_sql, token=self.admin_token)
            
            if response.status_code == 403:
                self.log_test("Admin - SQL Security", True, "Dangerous SQL properly blocked")
            else:
                self.log_test("Admin - SQL Security", False, 
                            f"Expected 403, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Admin - SQL Security", False, f"Exception: {str(e)}")
    
    def test_cost_tracking(self):
        """Test cost tracking features"""
        if not self.admin_token:
            self.log_test("Cost Tracking", False, "No admin token available")
            return
        
        try:
            response = self.make_request('GET', '/api/costs/user', token=self.admin_token)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['total_cost', 'recent_cost', 'cost_by_type']
                
                if all(field in data for field in required_fields):
                    self.log_test("Cost Tracking", True, 
                                f"Total cost: ${data['total_cost']}, Recent: ${data['recent_cost']}")
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Cost Tracking", False, f"Missing fields: {missing}", data)
            else:
                self.log_test("Cost Tracking", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Cost Tracking", False, f"Exception: {str(e)}")
    
    def test_authorization(self):
        """Test authorization controls"""
        if not self.user_token:
            self.log_test("Authorization Test", False, "No user token available")
            return
        
        # Test business user trying to access admin endpoint
        try:
            response = self.make_request('GET', '/api/admin/users', token=self.user_token)
            
            if response.status_code == 403:
                self.log_test("Authorization - Admin Endpoint Block", True, 
                            "Business user properly blocked from admin endpoint")
            else:
                self.log_test("Authorization - Admin Endpoint Block", False, 
                            f"Expected 403, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Authorization - Admin Endpoint Block", False, f"Exception: {str(e)}")
        
        # Test unauthorized access (no token)
        try:
            response = self.make_request('GET', '/api/dashboard/stats')  # No token
            
            if response.status_code == 401:
                self.log_test("Authorization - No Token Block", True, 
                            "Request without token properly blocked")
            else:
                self.log_test("Authorization - No Token Block", False, 
                            f"Expected 401, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Authorization - No Token Block", False, f"Exception: {str(e)}")
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("🧪 BLITZ AI FRAMEWORK BACKEND TEST SUMMARY")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"📊 Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"📈 Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test_name']}: {result['message']}")
        
        print("\n" + "="*80)
        
        return failed_tests == 0
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Blitz AI Framework Backend Tests...")
        print(f"🌐 Testing against: {self.base_url}")
        print("="*80 + "\n")
        
        # Core functionality tests
        self.test_health_check()
        self.test_authentication()
        
        if not self.admin_token:
            print("❌ Cannot continue without admin authentication")
            return False
        
        self.test_dashboard()
        self.test_models()
        self.test_prompts()
        self.test_tools()
        
        # Create test entities and get their IDs
        agent_id = self.test_agents()
        workflow_id = self.test_workflows()
        
        # Test executions with created entities
        self.test_executions(agent_id, workflow_id)
        
        # Admin and security tests
        self.test_admin_features()
        self.test_cost_tracking()
        self.test_authorization()
        
        # Print summary
        return self.print_summary()

def main():
    """Main test function"""
    # Load environment variables from .env if available
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass  # python-dotenv not installed, continue without it
    
    # Get port from environment or use default
    port = os.environ.get('SERVER_PORT', os.environ.get('FLASK_RUN_PORT', '5123'))
    base_url = f"http://localhost:{port}"
    
    print("🔧 Blitz AI Framework Backend Tester")
    print(f"Make sure the backend is running on {base_url}")
    print()
    
    # Check if backend is accessible
    try:
        response = requests.get(f"{base_url}/api/health", timeout=5)
        if response.status_code != 200:
            print(f"❌ Backend is not accessible at {base_url}. Please start the backend first.")
            sys.exit(1)
    except requests.exceptions.RequestException:
        print(f"❌ Backend is not accessible at {base_url}. Please start the backend first.")
        print("Run: python app.py")
        sys.exit(1)
    
    print(f"✅ Backend is accessible at {base_url}. Starting tests...\n")
    
    # Run tests
    tester = BlitzAPITester(base_url)
    success = tester.run_all_tests()
    
    if success:
        print("🎉 All tests passed! Backend is working correctly.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()