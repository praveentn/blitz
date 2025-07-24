# 🚀 Blitz AI Framework - Frontend Setup Guide

## 📋 Prerequisites

- ✅ Backend running on `http://localhost:5123`
- ✅ Node.js 16+ installed
- ✅ npm or yarn package manager

## 🛠️ Quick Setup

### 1. Create React App Structure

```bash
# In your project root directory
npx create-react-app frontend
cd frontend
```

### 2. Install Dependencies

```bash
npm install @headlessui/react @heroicons/react axios react-router-dom react-hot-toast date-fns
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms @tailwindcss/typography @tailwindcss/aspect-ratio
```

### 3. Initialize Tailwind CSS

```bash
npx tailwindcss init -p
```

### 4. Replace Generated Files

Replace the following files with the provided implementations:

**Core Files:**
- `package.json` - Dependencies and scripts
- `public/index.html` - HTML template
- `public/manifest.json` - PWA manifest
- `tailwind.config.js` - Tailwind configuration
- `src/index.js` - App entry point
- `src/App.js` - Main app component
- `src/App.css` - Global styles

**Services:**
- `src/services/api.js` - API client with interceptors
- `src/services/auth.js` - Authentication context

**Components:**
- `src/components/Layout.js` - Main layout wrapper
- `src/components/Header.js` - Top navigation
- `src/components/Sidebar.js` - Side navigation
- `src/components/Dashboard.js` - Dashboard overview
- `src/components/AdminPanel.js` - Admin panel container
- `src/components/SQLExecutor.js` - Enhanced SQL executor
- `src/components/LoadingSpinner.js` - Loading components

**Pages:**
- `src/pages/LoginPage.js` - Authentication page
- `src/pages/DashboardPage.js` - Dashboard page
- `src/pages/ModelsPage.js` - Model management
- `src/pages/PromptsPage.js` - Prompt management
- `src/pages/ToolsPage.js` - Tools registry
- `src/pages/AgentsPage.js` - Agent management
- `src/pages/WorkflowsPage.js` - Workflow designer
- `src/pages/AdminPage.js` - Admin panel

**Utilities:**
- `src/utils/helpers.js` - Utility functions

### 5. Configure Environment (Optional)

Create `.env` file in frontend directory:

```env
REACT_APP_API_URL=http://localhost:5123
REACT_APP_APP_NAME=Blitz AI Framework
```

### 6. Start Development Server

```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## 🔑 Default Login Credentials

Use these credentials to test the application:

- **Admin**: admin@blitz.com / admin123
- **Business User**: user@blitz.com / user123  
- **Demo User**: demo@blitz.com / demo123

## 🎯 Key Features Implemented

### ✅ **Authentication & Navigation**
- JWT-based login/logout
- Role-based access control
- Protected routes
- Responsive navigation

### ✅ **Dashboard**
- Real-time statistics
- Recent activity feed
- Quick action buttons
- Cost overview

### ✅ **Enhanced SQL Executor**
- Syntax highlighting
- Query validation and analysis
- Pagination support
- Dangerous operation warnings
- Export functionality (CSV/JSON)
- Sample queries
- Query history
- Database schema browser

### ✅ **Management Interfaces**
- Model registry (Azure OpenAI configs)
- Prompt templates with I/O schemas
- Tools registry (built-in tools)
- Agent configurations
- Workflow definitions

### ✅ **Admin Panel**
- Database browser with table explorer
- Enhanced SQL executor
- System health monitoring (placeholder)
- User management (placeholder)

## 🔧 Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/         # All components (flat structure)
│   │   ├── Layout.js
│   │   ├── Header.js
│   │   ├── Sidebar.js
│   │   ├── Dashboard.js
│   │   ├── AdminPanel.js
│   │   ├── SQLExecutor.js
│   │   └── LoadingSpinner.js
│   ├── pages/             # All pages (flat structure)
│   │   ├── LoginPage.js
│   │   ├── DashboardPage.js
│   │   ├── ModelsPage.js
│   │   ├── PromptsPage.js
│   │   ├── ToolsPage.js
│   │   ├── AgentsPage.js
│   │   ├── WorkflowsPage.js
│   │   └── AdminPage.js
│   ├── services/
│   │   ├── api.js          # API client
│   │   └── auth.js         # Authentication
│   ├── utils/
│   │   └── helpers.js      # Utilities
│   ├── App.js
│   ├── App.css
│   └── index.js
├── package.json
└── tailwind.config.js
```

## 🎨 Design System

### **Colors**
- Primary: Blue (`blue-600`, `blue-700`)
- Success: Green (`green-600`, `green-100`)
- Warning: Yellow (`yellow-600`, `yellow-100`)
- Error: Red (`red-600`, `red-100`)
- Gray scale: `gray-50` to `gray-900`

### **Components**
- **Buttons**: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-success`
- **Forms**: `.form-input`, `.form-textarea`, `.form-select`
- **Cards**: `.card`, `.card-header`, `.card-body`, `.card-footer`
- **Tables**: `.table`, `.table-header`, `.table-body`, `.table-row`, `.table-cell`
- **Status**: `.status-badge`, `.status-success`, `.status-warning`, `.status-error`

## 🔗 API Integration

The frontend integrates with the backend through:

- **Base URL**: `http://localhost:5123`
- **Authentication**: JWT tokens in Authorization header
- **Error Handling**: Global interceptors with toast notifications
- **Real-time Updates**: Polling for execution status

### **Key API Endpoints**
- `/api/auth/login` - Authentication
- `/api/dashboard/stats` - Dashboard data
- `/api/models` - Model management
- `/api/prompts` - Prompt management  
- `/api/tools` - Tools registry
- `/api/agents` - Agent management
- `/api/workflows` - Workflow management
- `/api/admin/sql` - SQL executor
- `/api/admin/tables` - Database browser

## 🚀 Production Build

```bash
npm run build
```

Builds the app for production to the `build` folder.

## 🧪 Testing the Frontend

### **Manual Testing Checklist**

1. **Authentication Flow**
   - [ ] Login with demo credentials
   - [ ] JWT token persistence
   - [ ] Logout functionality
   - [ ] Route protection

2. **Dashboard**
   - [ ] Statistics loading
   - [ ] Recent executions display
   - [ ] Cost overview
   - [ ] Quick actions

3. **SQL Executor (Critical)**
   - [ ] Query execution with pagination
   - [ ] Sample queries loading
   - [ ] Query validation
   - [ ] Dangerous operation warnings
   - [ ] Export functionality
   - [ ] Database schema browser

4. **Management Pages**
   - [ ] Models list loading
   - [ ] Prompts list loading
   - [ ] Tools list loading  
   - [ ] Agents list loading
   - [ ] Workflows list loading

5. **Admin Features**
   - [ ] Database browser
   - [ ] Table schema viewing
   - [ ] SQL executor access (admin only)

## 🐛 Troubleshooting

### **Common Issues**

1. **API Connection Failed**
   ```bash
   # Ensure backend is running
   curl http://localhost:5123/api/health
   ```

2. **CORS Errors**
   - Backend proxy configured in `package.json`
   - Check backend CORS settings

3. **Authentication Issues**
   - Clear localStorage: `localStorage.clear()`
   - Check JWT token validity
   - Verify backend credentials

4. **Build Errors**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

## 🔮 Next Steps

The frontend foundation is complete. You can now:

1. **Enhance Forms** - Add create/edit modals for models, prompts, agents
2. **Workflow Designer** - Implement visual drag-and-drop interface
3. **Real-time Features** - Add WebSocket support for live updates
4. **Advanced Analytics** - Build charts and dashboards
5. **File Uploads** - Add file handling capabilities

## 📚 Resources

- **Tailwind CSS**: https://tailwindcss.com/docs
- **Headless UI**: https://headlessui.dev/
- **Heroicons**: https://heroicons.com/
- **React Router**: https://reactrouter.com/
- **Date-fns**: https://date-fns.org/

---

**🎉 Your enterprise-grade agentic AI frontend is ready!**

The frontend provides a solid foundation with all core features implemented, matching your backend API perfectly. The enhanced SQL executor gives you powerful database management capabilities, and the modular structure makes it easy to extend.