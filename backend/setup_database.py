# backend/setup_database.py
"""
Database setup script for Blitz AI Framework
This script initializes the database with default data
"""

import os
import sys
from datetime import datetime
from werkzeug.security import generate_password_hash

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db, User, Model, Prompt, Tool, Agent
from config import get_config

def setup_database():
    """Setup database with tables and default data"""
    print("🗄️ Setting up Blitz AI Framework Database...")
    
    # Load environment variables
    try:
        from dotenv import load_dotenv
        load_dotenv()
        print("✅ Environment variables loaded from .env")
    except ImportError:
        print("⚠️  python-dotenv not installed, skipping .env file loading")
    
    # Create Flask app
    app = create_app()
    
    with app.app_context():
        try:
            # Drop all tables (for fresh setup)
            print("🧹 Dropping existing tables...")
            db.drop_all()
            
            # Create all tables
            print("🏗️ Creating database tables...")
            db.create_all()
            
            # Create default users
            print("👤 Creating default users...")
            
            # Admin user
            admin_user = User(
                username='admin',
                email='admin@blitz.com',
                password_hash=generate_password_hash('admin123'),
                role='admin',
                is_active=True,
                cost_limit=1000.00
            )
            db.session.add(admin_user)
            
            # Business user
            business_user = User(
                username='user',
                email='user@blitz.com',
                password_hash=generate_password_hash('user123'),
                role='business_user',
                is_active=True,
                cost_limit=100.00
            )
            db.session.add(business_user)
            
            # Demo user
            demo_user = User(
                username='demo',
                email='demo@blitz.com',
                password_hash=generate_password_hash('demo123'),
                role='business_user',
                is_active=True,
                cost_limit=50.00
            )
            db.session.add(demo_user)
            
            db.session.flush()  # Get user IDs
            
            # Create default models
            print("🤖 Creating default models...")
            
            # Azure OpenAI model
            azure_model = Model(
                name='azure-gpt-4',
                provider='azure_openai',
                model_name='gpt-4.1-nano',
                endpoint=os.environ.get('AZURE_OPENAI_ENDPOINT', ''),
                api_key=os.environ.get('AZURE_OPENAI_API_KEY', ''),
                parameters={
                    'temperature': 0.7,
                    'max_tokens': 4000,
                    'top_p': 1.0,
                    'frequency_penalty': 0.0,
                    'presence_penalty': 0.0
                },
                cost_per_token=0.00003,  # $0.03 per 1K tokens
                is_active=True,
                created_by=admin_user.id
            )
            db.session.add(azure_model)
            
            # GPT-3.5 model for cost-effective operations
            gpt35_model = Model(
                name='azure-gpt-3.5',
                provider='azure_openai',
                model_name='gpt-3.5-turbo',
                endpoint=os.environ.get('AZURE_OPENAI_ENDPOINT', ''),
                api_key=os.environ.get('AZURE_OPENAI_API_KEY', ''),
                parameters={
                    'temperature': 0.7,
                    'max_tokens': 2000,
                    'top_p': 1.0,
                    'frequency_penalty': 0.0,
                    'presence_penalty': 0.0
                },
                cost_per_token=0.000002,  # $0.002 per 1K tokens
                is_active=True,
                created_by=admin_user.id
            )
            db.session.add(gpt35_model)
            
            db.session.flush()  # Get model IDs
            
            # Create default tools
            print("🔧 Creating default tools...")
            
            default_tools = [
                {
                    'name': 'web_search',
                    'description': 'Search the web for information using various search engines',
                    'tool_type': 'builtin',
                    'parameters_schema': {
                        'type': 'object',
                        'properties': {
                            'query': {
                                'type': 'string', 
                                'description': 'Search query'
                            },
                            'max_results': {
                                'type': 'integer', 
                                'default': 10,
                                'description': 'Maximum number of results to return'
                            }
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
                            'filename': {
                                'type': 'string',
                                'description': 'Name of the file to write'
                            },
                            'content': {
                                'type': 'string',
                                'description': 'Content to write to the file'
                            }
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
                            'filename': {
                                'type': 'string',
                                'description': 'Name of the file to read'
                            }
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
                            'expression': {
                                'type': 'string',
                                'description': 'Mathematical expression to evaluate'
                            }
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
            
            db.session.flush()  # Get tool IDs
            
            # Create default prompts
            print("📝 Creating default prompts...")
            
            default_prompts = [
                {
                    'name': 'risk_analysis',
                    'description': 'Analyze text for potential risks and provide detailed assessment',
                    'template': '''Analyze the following text for potential risks and provide a comprehensive assessment:

Text to analyze: {text}

Please provide:
1. A risk score from 1-10 (where 10 is highest risk)
2. A list of specific issues or concerns found
3. Recommendations for mitigation

Format your response as a structured analysis.''',
                    'input_schema': {
                        'type': 'object',
                        'properties': {
                            'text': {
                                'type': 'string', 
                                'description': 'Text to analyze for risks'
                            }
                        },
                        'required': ['text']
                    },
                    'output_schema': {
                        'type': 'object',
                        'properties': {
                            'risk_score': {
                                'type': 'integer', 
                                'minimum': 1, 
                                'maximum': 10
                            },
                            'issues': {
                                'type': 'array', 
                                'items': {'type': 'string'}
                            },
                            'recommendations': {
                                'type': 'array',
                                'items': {'type': 'string'}
                            }
                        }
                    }
                },
                {
                    'name': 'web_research',
                    'description': 'Research a topic using web search and provide comprehensive summary',
                    'template': '''You are a professional researcher. Your task is to research the following topic: {query}

Please:
1. Use the web_search tool to find relevant information
2. Analyze the search results
3. Provide a comprehensive summary of your findings
4. Include credible sources

Be thorough and objective in your research.''',
                    'input_schema': {
                        'type': 'object',
                        'properties': {
                            'query': {
                                'type': 'string',
                                'description': 'Research topic or query'
                            }
                        },
                        'required': ['query']
                    },
                    'output_schema': {
                        'type': 'object',
                        'properties': {
                            'summary': {'type': 'string'},
                            'key_findings': {
                                'type': 'array',
                                'items': {'type': 'string'}
                            },
                            'sources': {
                                'type': 'array',
                                'items': {'type': 'string'}
                            }
                        }
                    }
                },
                {
                    'name': 'document_summarizer',
                    'description': 'Summarize documents and extract key insights',
                    'template': '''Please analyze and summarize the following document:

Document content: {content}

Provide:
1. A concise executive summary
2. Key points and insights
3. Important details that should not be missed

Keep the summary clear and actionable.''',
                    'input_schema': {
                        'type': 'object',
                        'properties': {
                            'content': {
                                'type': 'string',
                                'description': 'Document content to summarize'
                            }
                        },
                        'required': ['content']
                    },
                    'output_schema': {
                        'type': 'object',
                        'properties': {
                            'executive_summary': {'type': 'string'},
                            'key_points': {
                                'type': 'array',
                                'items': {'type': 'string'}
                            },
                            'important_details': {
                                'type': 'array',
                                'items': {'type': 'string'}
                            }
                        }
                    }
                },
                {
                    'name': 'data_analyzer',
                    'description': 'Analyze data and provide insights with recommendations',
                    'template': '''Analyze the following data and provide insights:

Data: {data}

Please provide:
1. Data summary and overview
2. Key patterns and trends identified
3. Insights and observations
4. Actionable recommendations based on the analysis

Be specific and data-driven in your analysis.''',
                    'input_schema': {
                        'type': 'object',
                        'properties': {
                            'data': {
                                'type': 'string',
                                'description': 'Data to analyze (can be text, numbers, or structured data)'
                            }
                        },
                        'required': ['data']
                    },
                    'output_schema': {
                        'type': 'object',
                        'properties': {
                            'summary': {'type': 'string'},
                            'patterns': {
                                'type': 'array',
                                'items': {'type': 'string'}
                            },
                            'insights': {
                                'type': 'array',
                                'items': {'type': 'string'}
                            },
                            'recommendations': {
                                'type': 'array',
                                'items': {'type': 'string'}
                            }
                        }
                    }
                }
            ]
            
            for prompt_data in default_prompts:
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
            
            db.session.flush()  # Get prompt IDs
            
            # Create sample agents
            print("🤖 Creating sample agents...")
            
            # Get created objects
            risk_prompt = Prompt.query.filter_by(name='risk_analysis').first()
            research_prompt = Prompt.query.filter_by(name='web_research').first()
            web_search_tool = Tool.query.filter_by(name='web_search').first()
            file_write_tool = Tool.query.filter_by(name='file_write').first()
            
            if risk_prompt and azure_model:
                risk_agent = Agent(
                    name='risk_analyzer',
                    description='Analyzes documents and content for potential risks and compliance issues',
                    model_id=azure_model.id,
                    prompt_id=risk_prompt.id,
                    parameters={
                        'temperature': 0.3,  # Lower temperature for more consistent risk analysis
                        'max_iterations': 3
                    },
                    memory_config={
                        'enabled': True,
                        'max_history': 10
                    },
                    is_active=True,
                    created_by=admin_user.id
                )
                db.session.add(risk_agent)
            
            if research_prompt and azure_model and web_search_tool:
                research_agent = Agent(
                    name='web_researcher',
                    description='Conducts comprehensive web research on any topic and provides detailed analysis',
                    model_id=azure_model.id,
                    prompt_id=research_prompt.id,
                    parameters={
                        'temperature': 0.7,
                        'max_iterations': 5
                    },
                    memory_config={
                        'enabled': True,
                        'max_history': 20
                    },
                    is_active=True,
                    created_by=admin_user.id
                )
                # Add tools to research agent
                research_agent.tools = [web_search_tool, file_write_tool]
                db.session.add(research_agent)
            
            # Commit all changes
            db.session.commit()
            
            print("✅ Database setup completed successfully!")
            print("\n📋 Default Accounts Created:")
            print("   👤 Admin: admin@blitz.com / admin123")
            print("   👤 Business User: user@blitz.com / user123") 
            print("   👤 Demo User: demo@blitz.com / demo123")
            print("\n🤖 Sample Agents Created:")
            print("   🔍 Risk Analyzer - Analyzes content for risks")
            print("   🌐 Web Researcher - Conducts web research with tools")
            print("\n🔧 Built-in Tools Available:")
            print("   🔍 web_search - Search the web")
            print("   📝 file_write - Write files")
            print("   📖 file_read - Read files")
            print("   🧮 calculator - Mathematical calculations")
            
            return True
            
        except Exception as e:
            print(f"❌ Database setup failed: {e}")
            db.session.rollback()
            return False

def check_environment():
    """Check if environment is properly configured"""
    print("🔍 Checking environment configuration...")
    
    required_vars = ['AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_ENDPOINT']
    missing_vars = []
    
    for var in required_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("⚠️  Warning: Missing environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\n💡 Please set these in your .env file for full functionality")
        return False
    else:
        print("✅ Environment configuration looks good!")
        return True

def main():
    """Main setup function"""
    print("🚀 Blitz AI Framework Database Setup")
    print("="*50)
    
    # Check environment
    env_ok = check_environment()
    if not env_ok:
        print("\n⚠️  Continuing with setup, but some features may not work without proper configuration.")
        
    print()
    
    # Setup database
    success = setup_database()
    
    if success:
        print("\n🎉 Setup completed successfully!")
        print("\n🚀 You can now start the backend with:")
        print("   python app.py")
        print("\n🧪 And test it with:")
        print("   python test_backend.py")
    else:
        print("\n❌ Setup failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main()