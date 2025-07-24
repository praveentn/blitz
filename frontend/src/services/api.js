// src/services/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
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
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API service object with structured endpoints
export const apiService = {
  // Generic HTTP methods
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

  patch: async (url, data = {}, config = {}) => {
    try {
      const response = await api.patch(url, data, config);
      return response.data;
    } catch (error) {
      console.error('API PATCH Error:', error);
      throw error;
    }
  },

  // Structured API endpoints
  auth: {
    login: async (email, password) => {
      const response = await api.post('/auth/login', { email, password });
      return response;
    },
    register: async (userData) => {
      const response = await api.post('/auth/register', userData);
      return response;
    }
  },

  dashboard: {
    getStats: async () => {
      const response = await api.get('/dashboard/stats');
      return response;
    }
  },

  models: {
    list: async () => {
      const response = await api.get('/models');
      return response;
    },
    create: async (data) => {
      const response = await api.post('/models', data);
      return response;
    },
    update: async (id, data) => {
      const response = await api.put(`/models/${id}`, data);
      return response;
    },
    delete: async (id) => {
      const response = await api.delete(`/models/${id}`);
      return response;
    }
  },

  prompts: {
    list: async () => {
      const response = await api.get('/prompts');
      return response;
    },
    create: async (data) => {
      const response = await api.post('/prompts', data);
      return response;
    },
    update: async (id, data) => {
      const response = await api.put(`/prompts/${id}`, data);
      return response;
    },
    delete: async (id) => {
      const response = await api.delete(`/prompts/${id}`);
      return response;
    }
  },

  tools: {
    list: async () => {
      const response = await api.get('/tools');
      return response;
    },
    create: async (data) => {
      const response = await api.post('/tools', data);
      return response;
    },
    update: async (id, data) => {
      const response = await api.put(`/tools/${id}`, data);
      return response;
    },
    delete: async (id) => {
      const response = await api.delete(`/tools/${id}`);
      return response;
    }
  },

  agents: {
    list: async () => {
      const response = await api.get('/agents');
      return response;
    },
    create: async (data) => {
      const response = await api.post('/agents', data);
      return response;
    },
    update: async (id, data) => {
      const response = await api.put(`/agents/${id}`, data);
      return response;
    },
    delete: async (id) => {
      const response = await api.delete(`/agents/${id}`);
      return response;
    }
  },

  workflows: {
    list: async () => {
      const response = await api.get('/workflows');
      return response;
    },
    create: async (data) => {
      const response = await api.post('/workflows', data);
      return response;
    },
    update: async (id, data) => {
      const response = await api.put(`/workflows/${id}`, data);
      return response;
    },
    delete: async (id) => {
      const response = await api.delete(`/workflows/${id}`);
      return response;
    }
  },

  executions: {
    list: async () => {
      const response = await api.get('/executions');
      return response;
    },
    create: async (data) => {
      const response = await api.post('/executions', data);
      return response;
    },
    get: async (id) => {
      const response = await api.get(`/executions/${id}`);
      return response;
    }
  },

  admin: {
    executeSQL: async (query, page = 1, pageSize = 50) => {
      const response = await api.post('/admin/sql', { 
        query, 
        page, 
        page_size: pageSize 
      });
      return response;
    },
    getTables: async () => {
      const response = await api.get('/admin/tables');
      return response;
    },
    getTableSchema: async (tableName) => {
      const response = await api.get(`/admin/tables/${tableName}/schema`);
      return response;
    }
  }
};

// Helper functions for consistent error/success handling
export const handleApiError = (error, defaultMessage = 'An unexpected error occurred') => {
  console.error('API Error:', error);
  
  let message = defaultMessage;
  
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    if (data?.error) {
      message = data.error;
    } else if (data?.message) {
      message = data.message;
    } else if (status === 400) {
      message = 'Invalid request. Please check your input.';
    } else if (status === 401) {
      message = 'Authentication failed. Please log in again.';
    } else if (status === 403) {
      message = 'You do not have permission to perform this action.';
    } else if (status === 404) {
      message = 'The requested resource was not found.';
    } else if (status === 500) {
      message = 'Server error. Please try again later.';
    } else {
      message = `Server error (${status}). Please try again.`;
    }
  } else if (error.request) {
    // Network error
    message = 'Network error. Please check your connection and try again.';
  } else if (error.message) {
    message = error.message;
  }
  
  toast.error(message);
  return message;
};

export const handleApiSuccess = (message) => {
  if (message) {
    toast.success(message);
  }
};

// Default export for backward compatibility
export default apiService;