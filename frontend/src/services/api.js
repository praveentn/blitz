// src/services/api.js - Updated with fixed endpoints and error handling
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5123/api',
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Enhanced error handler
export const handleApiError = (error) => {
  console.error('API Error:', error);
  
  if (error.response) {
    const message = error.response.data?.error || 
                   error.response.data?.message || 
                   `Server error: ${error.response.status}`;
    toast.error(message);
  } else if (error.request) {
    toast.error('Network error. Please check your connection.');
  } else {
    toast.error('An unexpected error occurred.');
  }
};

// Generic API methods
const apiService = {
  get: async (url, config = {}) => {
    try {
      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  },

  post: async (url, data = {}, config = {}) => {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  },

  put: async (url, data = {}, config = {}) => {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      console.error('API PUT Error:', error);
      throw error;
    }
  },

  delete: async (url, config = {}) => {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      console.error('API DELETE Error:', error);
      throw error;
    }
  },

  // Structured API endpoints
  auth: {
    login: async (email, password) => {
      try {
        const response = await api.post('/auth/login', { email, password });
        // Return the response data directly
        return response.data;
      } catch (error) {
        console.error('Login API Error:', error);
        throw error;
      }
    },
    register: async (userData) => {
      try {
        const response = await api.post('/auth/register', userData);
        return response.data;
      } catch (error) {
        console.error('Register API Error:', error);
        throw error;
      }
    }
  },

  dashboard: {
    getStats: async () => {
      try {
        const response = await api.get('/dashboard/stats');
        return response.data; // This should be the stats object directly
      } catch (error) {
        console.error('Dashboard API Error:', error);
        throw error;
      }
    }
  },

  models: {
    list: async () => {
      try {
        const response = await api.get('/models');
        return response.data; // Should be array of models
      } catch (error) {
        console.error('Models API Error:', error);
        throw error;
      }
    },
    create: async (data) => {
      const response = await api.post('/models', data);
      return response.data;
    },
    update: async (id, data) => {
      const response = await api.put(`/models/${id}`, data);
      return response.data;
    },
    delete: async (id) => {
      const response = await api.delete(`/models/${id}`);
      return response.data;
    }
  },

  prompts: {
    list: async () => {
      try {
        const response = await api.get('/prompts');
        return response.data;
      } catch (error) {
        console.error('Prompts API Error:', error);
        throw error;
      }
    },
    create: async (data) => {
      const response = await api.post('/prompts', data);
      return response.data;
    },
    update: async (id, data) => {
      const response = await api.put(`/prompts/${id}`, data);
      return response.data;
    },
    delete: async (id) => {
      const response = await api.delete(`/prompts/${id}`);
      return response.data;
    }
  },

  tools: {
    list: async () => {
      try {
        const response = await api.get('/tools');
        return response.data;
      } catch (error) {
        console.error('Tools API Error:', error);
        throw error;
      }
    },
    create: async (data) => {
      const response = await api.post('/tools', data);
      return response.data;
    },
    update: async (id, data) => {
      const response = await api.put(`/tools/${id}`, data);
      return response.data;
    },
    delete: async (id) => {
      const response = await api.delete(`/tools/${id}`);
      return response.data;
    }
  },

  agents: {
    list: async () => {
      try {
        const response = await api.get('/agents');
        return response.data;
      } catch (error) {
        console.error('Agents API Error:', error);
        throw error;
      }
    },
    create: async (data) => {
      const response = await api.post('/agents', data);
      return response.data;
    },
    update: async (id, data) => {
      const response = await api.put(`/agents/${id}`, data);
      return response.data;
    },
    delete: async (id) => {
      const response = await api.delete(`/agents/${id}`);
      return response.data;
    }
  },

  workflows: {
    list: async () => {
      try {
        const response = await api.get('/workflows');
        return response.data;
      } catch (error) {
        console.error('Workflows API Error:', error);
        throw error;
      }
    },
    get: async (id) => {
      const response = await api.get(`/workflows/${id}`);
      return response.data;
    },
    create: async (data) => {
      const response = await api.post('/workflows', data);
      return response.data;
    },
    update: async (id, data) => {
      const response = await api.put(`/workflows/${id}`, data);
      return response.data;
    },
    delete: async (id) => {
      const response = await api.delete(`/workflows/${id}`);
      return response.data;
    },
    execute: async (id, input = {}) => {
      const response = await api.post(`/workflows/${id}/execute`, input);
      return response.data;
    }
  },

  executions: {
    list: async () => {
      try {
        const response = await api.get('/executions');
        // Ensure we always return an array
        const data = response.data;
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Failed to fetch executions:', error);
        return [];
      }
    },
    get: async (id) => {
      const response = await api.get(`/executions/${id}`);
      return response.data;
    },
    create: async (data) => {
      const response = await api.post('/executions', data);
      return response.data;
    },
    cancel: async (id) => {
      const response = await api.post(`/executions/${id}/cancel`);
      return response.data;
    }
  },

  costs: {
    user: async () => {
      const response = await api.get('/costs/user');
      return response.data;
    },
    admin: async () => {
      const response = await api.get('/costs/admin');
      return response.data;
    }
  },

  // Fixed admin endpoints with consistent response handling
  admin: {
    // SQL Executor with fixed parameters
    executeSql: async (query, page = 1, pageSize = 100, allowDangerous = false) => {
      try {
        const response = await api.post('/admin/sql', {
          query,
          page,
          page_size: pageSize, // Use page_size to match backend
          per_page: pageSize,  // Also include per_page for backwards compatibility
          allow_dangerous: allowDangerous
        });
        return response.data;
      } catch (error) {
        console.error('SQL Executor API Error:', error);
        throw error;
      }
    },

    // Database tables - support both endpoints
    getTables: async () => {
      try {
        // Try new endpoint first
        const response = await api.get('/admin/database/tables');
        return response.data;
      } catch (error) {
        try {
          // Fallback to old endpoint
          const response = await api.get('/admin/tables');
          return response.data;
        } catch (fallbackError) {
          console.error('Get tables API Error:', fallbackError);
          throw fallbackError;
        }
      }
    },

    getTableSchema: async (tableName) => {
      try {
        const response = await api.get(`/admin/database/tables/${tableName}/schema`);
        return response.data;
      } catch (error) {
        try {
          const response = await api.get(`/admin/table/${tableName}/schema`);
          return response.data;
        } catch (fallbackError) {
          console.error('Get table schema API Error:', fallbackError);
          throw fallbackError;
        }
      }
    },

    getTableData: async (tableName, page = 1, pageSize = 50) => {
      try {
        const response = await api.get(`/admin/database/tables/${tableName}/data`, {
          params: { page, page_size: pageSize }
        });
        return response.data;
      } catch (error) {
        try {
          const response = await api.get(`/admin/table/${tableName}/data`, {
            params: { page, page_size: pageSize }
          });
          return response.data;
        } catch (fallbackError) {
          console.error('Get table data API Error:', fallbackError);
          throw fallbackError;
        }
      }
    },

    // User management
    getUsers: async () => {
      try {
        const response = await api.get('/admin/users');
        return response.data;
      } catch (error) {
        console.error('Get users API Error:', error);
        throw error;
      }
    },

    updateUser: async (userId, data) => {
      try {
        const response = await api.put(`/admin/users/${userId}`, data);
        return response.data;
      } catch (error) {
        console.error('Update user API Error:', error);
        throw error;
      }
    },

    // System health
    getSystemHealth: async () => {
      try {
        const response = await api.get('/admin/system/health');
        return response.data;
      } catch (error) {
        console.error('System health API Error:', error);
        throw error;
      }
    },

    // SQL validation
    validateSql: async (query) => {
      try {
        const response = await api.post('/admin/sql/validate', { query });
        return response.data;
      } catch (error) {
        console.error('SQL validation API Error:', error);
        throw error;
      }
    },

    // Export functionality
    exportQuery: async (query, format = 'csv') => {
      try {
        const response = await api.post('/admin/sql/export', {
          query,
          format
        }, {
          responseType: 'blob'
        });
        return response.data;
      } catch (error) {
        console.error('Export query API Error:', error);
        throw error;
      }
    }
  }
};

// Success handler
export const handleApiSuccess = (message) => {
  toast.success(message);
};

// Export both as named and default for compatibility
export { apiService };
export default apiService;