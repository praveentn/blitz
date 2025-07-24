// src/services/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5123',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

// API Service Methods
export const apiService = {
  // Health Check
  health: () => api.get('/api/health'),

  // Authentication
  auth: {
    login: (email, password) => api.post('/api/auth/login', { email, password }),
    register: (userData) => api.post('/api/auth/register', userData),
  },

  // Dashboard
  dashboard: {
    getStats: () => api.get('/api/dashboard/stats'),
  },

  // Models
  models: {
    getAll: () => api.get('/api/models'),
    create: (modelData) => api.post('/api/models', modelData),
    update: (id, modelData) => api.put(`/api/models/${id}`, modelData),
    delete: (id) => api.delete(`/api/models/${id}`),
  },

  // Prompts
  prompts: {
    getAll: () => api.get('/api/prompts'),
    create: (promptData) => api.post('/api/prompts', promptData),
    update: (id, promptData) => api.put(`/api/prompts/${id}`, promptData),
    delete: (id) => api.delete(`/api/prompts/${id}`),
  },

  // Tools
  tools: {
    getAll: () => api.get('/api/tools'),
    create: (toolData) => api.post('/api/tools', toolData),
    update: (id, toolData) => api.put(`/api/tools/${id}`, toolData),
    delete: (id) => api.delete(`/api/tools/${id}`),
  },

  // Agents
  agents: {
    getAll: () => api.get('/api/agents'),
    create: (agentData) => api.post('/api/agents', agentData),
    update: (id, agentData) => api.put(`/api/agents/${id}`, agentData),
    delete: (id) => api.delete(`/api/agents/${id}`),
    execute: (id, inputData) => api.post(`/api/executions/agent/${id}`, { input_data: inputData }),
  },

  // Workflows
  workflows: {
    getAll: () => api.get('/api/workflows'),
    create: (workflowData) => api.post('/api/workflows', workflowData),
    update: (id, workflowData) => api.put(`/api/workflows/${id}`, workflowData),
    delete: (id) => api.delete(`/api/workflows/${id}`),
    execute: (id, inputData) => api.post(`/api/executions/workflow/${id}`, { input_data: inputData }),
  },

  // Executions
  executions: {
    getAll: (page = 1, perPage = 20) => api.get(`/api/executions?page=${page}&per_page=${perPage}`),
    getStatus: (id) => api.get(`/api/executions/${id}/status`),
    cancel: (id) => api.post(`/api/executions/${id}/cancel`),
  },

  // Admin
  admin: {
    // SQL Executor - Enhanced to match backend API
    sql: {
      execute: (query, page = 1, perPage = 100, allowDangerous = false) => 
        api.post('/api/admin/sql', {
          query,
          page,
          per_page: perPage,
          allow_dangerous: allowDangerous
        }),
      
      validate: (query) => api.post('/api/admin/sql/validate', { query }),
      
      analyze: (query) => api.post('/api/admin/sql/analyze', { query }),
      
      export: (query, format = 'csv') => 
        api.post('/api/admin/sql/export', { query, format }, {
          responseType: 'blob'
        }),
    },
    
    // Database schema and tables
    schema: () => api.get('/api/admin/sql/schema'),
    
    tables: {
      list: () => api.get('/api/admin/sql/tables'),
      info: (tableName) => api.get(`/api/admin/sql/schema?table=${encodeURIComponent(tableName)}`),
    },
    
    // User management
    users: {
      getAll: () => api.get('/api/admin/users'),
      update: (id, userData) => api.put(`/api/admin/users/${id}`, userData),
      delete: (id) => api.delete(`/api/admin/users/${id}`),
    },
    
    // System health
    health: () => api.get('/api/admin/health'),
  },

  // Cost Tracking
  costs: {
    getUserCosts: () => api.get('/api/costs/user'),
    getCostAnalytics: (days = 30) => api.get(`/api/costs/analytics?days=${days}`),
  },
};

// Helper function for handling API errors
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  if (error.response?.data?.error) {
    toast.error(error.response.data.error);
    return error.response.data.error;
  } else if (error.message) {
    toast.error(error.message);
    return error.message;
  } else {
    toast.error(defaultMessage);
    return defaultMessage;
  }
};

// Helper function for handling API success
export const handleApiSuccess = (message) => {
  toast.success(message);
};

// Export the configured axios instance as default
export default api;