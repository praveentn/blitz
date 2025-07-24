// src/pages/LoginPage.js
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  CpuChipIcon, 
  EyeIcon, 
  EyeSlashIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '../services/auth';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    role: 'business_user'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { user, login, register } = useAuth();

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData);
      }
    } catch (error) {
      // Error handling is done in the auth service
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (role) => {
    const credentials = {
      admin: { email: 'admin@blitz.com', password: 'admin123' },
      user: { email: 'user@blitz.com', password: 'user123' },
      demo: { email: 'demo@blitz.com', password: 'demo123' }
    };
    
    setFormData({
      ...formData,
      email: credentials[role].email,
      password: credentials[role].password
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="flex items-center mb-8">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl mr-4">
              <CpuChipIcon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Blitz AI Framework</h1>
              <p className="text-blue-100">Enterprise Agentic AI Platform</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <SparklesIcon className="h-6 w-6 mt-1 text-blue-200" />
              <div>
                <h3 className="font-semibold mb-2">No-Code AI Workflows</h3>
                <p className="text-blue-100">Build complex AI workflows with drag-and-drop interface. No coding required.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <CpuChipIcon className="h-6 w-6 mt-1 text-blue-200" />
              <div>
                <h3 className="font-semibold mb-2">Enterprise Security</h3>
                <p className="text-blue-100">Role-based access control, audit trails, and comprehensive cost tracking.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <SparklesIcon className="h-6 w-6 mt-1 text-blue-200" />
              <div>
                <h3 className="font-semibold mb-2">Azure OpenAI Integration</h3>
                <p className="text-blue-100">Seamlessly integrate with Azure OpenAI for powerful language models.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-12 p-6 bg-white/10 backdrop-blur-sm rounded-xl">
            <h4 className="font-semibold mb-3">Demo Accounts</h4>
            <div className="space-y-2 text-sm">
              <button
                onClick={() => fillDemoCredentials('admin')}
                className="block w-full text-left p-2 hover:bg-white/10 rounded transition-colors"
              >
                <span className="font-medium">Admin:</span> admin@blitz.com / admin123
              </button>
              <button
                onClick={() => fillDemoCredentials('user')}
                className="block w-full text-left p-2 hover:bg-white/10 rounded transition-colors"
              >
                <span className="font-medium">Business User:</span> user@blitz.com / user123
              </button>
              <button
                onClick={() => fillDemoCredentials('demo')}
                className="block w-full text-left p-2 hover:bg-white/10 rounded transition-colors"
              >
                <span className="font-medium">Demo:</span> demo@blitz.com / demo123
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16">
        <div className="max-w-md w-full mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4 lg:hidden">
              <CpuChipIcon className="h-10 w-10 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Blitz AI</h1>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="mt-2 text-gray-600">
              {isLogin 
                ? 'Sign in to your Blitz AI account' 
                : 'Start building AI workflows today'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required={!isLogin}
                  value={formData.username}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your username"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="business_user">Business User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex justify-center items-center"
            >
              {loading ? (
                <LoadingSpinner size="small" color="white" />
              ) : (
                isLogin ? 'Sign in' : 'Create account'
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;