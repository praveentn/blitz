# backend/README.md

# 🚀 Blitz AI Framework - Backend

Enterprise-level agentic AI framework with no-code workflow designer, role-based access control, and comprehensive cost tracking.

## 🏗️ Architecture

- **Backend**: Flask + SQLAlchemy + JWT Authentication
- **Database**: SQLite (with Azure SQL support planned)
- **LLM Integration**: Azure OpenAI
- **Execution**: Async task processing with threading
- **Security**: RBAC, input validation, SQL injection protection

## 📁 Project Structure

```
backend/
├── app.py              # Main Flask application
├── models.py           # SQLAlchemy database models
├── services.py         # Business logic services
├── auth.py             # Authentication utilities
├── config.py           # Configuration management
├── setup_database.py   # Database initialization script
├── test_backend.py     # Comprehensive test suite
├── requirements.txt    # Python dependencies
├── .env                # Environment configuration
└── README.md           # This file
```

## 🛠️ Quick Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy and configure the `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your Azure OpenAI credentials:

```env
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_MODEL=gpt-4

# Database
DATABASE_URL=sqlite:///blitz.db

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
```

### 3. Initialize Database

```bash
python setup_database.py
```

### 4. Start the Backend

```bash
python app.py
```

The API will be available at `http://localhost:5123` (or your configured port)

### 5. Test the Backend

Open a new terminal and run:

```bash
python test_backend.py
```

## 🔐 Default Accounts

The setup script creates these default accounts:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| Admin | admin@blitz.com | admin123 | Full system access |
| Business User | user@blitz.com | user123 | Standard user access |
| Demo User | demo@blitz.com | demo123 | Demo/testing account |

## 🎯 Key Features

### 🔑 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Business User)
- Session management
- Cost limit enforcement

### 🤖 Model Management
- Azure OpenAI integration
- Multiple model support
- Parameter configuration
- Cost tracking per model

### 📝 Prompt Management
- Template-based prompts
- Input/output schema validation
- Version control
- Reusable prompt library

### 🔧 Tool Management
- Built-in tools (web search, file I/O, calculator)
- Custom tool creation
- Plugin architecture
- Security controls

### 🎭 Agent System
- No-code agent configuration
- Multi-turn conversations
- Tool-using agents (ReAct pattern)
- Memory management

### 🔄 Workflow Engine
- Visual workflow designer support
- Sequential and parallel execution
- Error handling and retries
- Real-time progress tracking

### 👨‍💼 Admin Features
- SQL query executor with security
- User management
- System monitoring
- Audit logging

### 💰 Cost Management
- Token usage tracking
- Cost calculation and limits
- Budget alerts
- Usage analytics

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics

### Models
- `GET /api/models` - List models
- `POST /api/models` - Create model

### Prompts
- `GET /api/prompts` - List prompts
- `POST /api/prompts` - Create prompt

### Tools
- `GET /api/tools` - List tools
- `POST /api/tools` - Create tool (Admin only)

### Agents
- `GET /api/agents` - List agents
- `POST /api/agents` - Create agent

### Workflows
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow

### Executions
- `GET /api/executions` - List executions
- `POST /api/executions/agent/{id}` - Execute agent
- `POST /api/executions/workflow/{id}` - Execute workflow
- `GET /api/executions/{id}/status` - Get execution status

### Admin
- `GET /api/admin/users` - List users (Admin only)
- `PUT /api/admin/users/{id}` - Update user (Admin only)
- `POST /api/admin/sql` - Execute SQL query (Admin only)

### Cost Tracking
- `GET /api/costs/user` - Get user costs

## 🧪 Testing

The `test_backend.py` script provides comprehensive testing:

```bash
python test_backend.py
```

Tests cover:
- ✅ Health checks and connectivity
- ✅ Authentication and authorization
- ✅ All CRUD operations
- ✅ Agent and workflow execution
- ✅ Admin features and SQL executor
- ✅ Cost tracking
- ✅ Security controls

## 🔒 Security Features

### Authentication
- JWT tokens with expiration
- Password hashing with bcrypt
- Role-based permissions

### SQL Injection Prevention
- Parameterized queries
- Query type restrictions
- Admin-only dangerous operations

### Input Validation
- Pydantic schema validation
- File upload restrictions
- Parameter sanitization

### Rate Limiting
- API endpoint protection
- Cost-based limitations
- User quotas

## 📊 Database Schema

### Core Tables
- `users` - User accounts and roles
- `models` - LLM model configurations
- `prompts` - Prompt templates
- `tools` - Tool registry
- `agents` - Agent configurations
- `workflows` - Workflow definitions
- `executions` - Execution records
- `costs` - Cost tracking
- `audit_logs` - System audit trail

## 🔧 Configuration

### Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `sqlite:///blitz.db` |
| `SECRET_KEY` | Flask secret key | `dev-secret-key` |
| `JWT_SECRET_KEY` | JWT signing key | Same as SECRET_KEY |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | Required |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | Required |
| `SERVER_HOST` | Server host address | `0.0.0.0` |
| `SERVER_PORT` | Server port number | `5123` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `MAX_CONCURRENT_EXECUTIONS` | Max parallel executions | `10` |

### Server Configuration

The server port is configurable through environment variables:

```bash
# Set in .env file
SERVER_PORT=5123
SERVER_HOST=0.0.0.0

# Or via environment variable
export SERVER_PORT=5123
python app.py
```

The application will also respect Flask's standard environment variables:
- `FLASK_RUN_PORT` (fallback if SERVER_PORT not set)
- `FLASK_RUN_HOST` (fallback if SERVER_HOST not set)

### Application Settings

- **JWT Token Expiry**: 24 hours (dev), 1 hour (prod)
- **Database**: SQLite with connection pooling
- **File Uploads**: 100MB max, temp directory storage
- **Execution Timeout**: 5 minutes (agents), 30 minutes (workflows)

## 🚀 Deployment

### Development
```bash
python app.py
```

### Production
```bash
# Using Gunicorn
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# Environment variables
export FLASK_ENV=production
export DATABASE_URL=sqlite:///prod_blitz.db
```

## 📈 Monitoring

### Health Check
- `GET /api/health` - Returns system status

### Logs
- Application logs in `logs/blitz.log`
- Audit trail in database
- Request/response logging

### Metrics
- Execution times and success rates
- Token usage and costs
- User activity patterns

## 🐛 Troubleshooting

### Common Issues

1. **"Azure OpenAI client not initialized"**
   - Check your `.env` file configuration
   - Verify API key and endpoint are correct

2. **"Database locked" errors**
   - SQLite concurrent access issue
   - Restart the application

3. **"Token has expired" errors**
   - Re-authenticate with `/api/auth/login`
   - Check system clock

4. **Permission denied errors**
   - Verify user role and permissions
   - Check JWT token validity

### Debug Mode
```bash
export FLASK_ENV=development
python app.py
```

## 🤝 Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Use type hints where possible
5. Follow PEP 8 style guidelines

## 📄 License

Enterprise license - Internal use only

---

**Ready to build amazing AI workflows!** 🚀

For questions or support, please check the test results and logs for detailed error information.