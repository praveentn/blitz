// src/components/Dashboard.js - Fixed response handling
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CpuChipIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  Squares2X2Icon,
  PlayIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fixed: Handle the response properly
      const response = await apiService.dashboard.getStats();
      
      // Debug: Log the actual response structure
      console.log('Dashboard API Response:', response);
      
      // Handle different response structures
      const statsData = response?.data || response;
      
      if (!statsData) {
        throw new Error('No data received from server');
      }
      
      setStats(statsData);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      setError(error.message || 'Failed to load dashboard statistics');
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="ml-4">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <div className="text-center bg-white rounded-lg border p-8">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load dashboard</h3>
          <p className="text-sm text-gray-600 mb-4">{error || 'Please try again'}</p>
          <button
            onClick={loadDashboardStats}
            disabled={loading}
            className="btn-primary"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Prepare stat cards with safe defaults
  const statCards = [
    {
      name: 'Models',
      value: stats.models || 0,
      icon: CpuChipIcon,
      href: '/models',
      color: 'blue',
    },
    {
      name: 'Prompts',
      value: stats.prompts || 0,
      icon: DocumentTextIcon,
      href: '/prompts',
      color: 'green',
    },
    {
      name: 'Tools',
      value: stats.tools || 0,
      icon: WrenchScrewdriverIcon,
      href: '/tools',
      color: 'purple',
    },
    {
      name: 'Agents',
      value: stats.agents || 0,
      icon: UserGroupIcon,
      href: '/agents',
      color: 'orange',
    },
    {
      name: 'Workflows',
      value: stats.workflows || 0,
      icon: Squares2X2Icon,
      href: '/workflows',
      color: 'indigo',
    },
    {
      name: 'Executions Today',
      value: stats.executions_today || 0,
      icon: PlayIcon,
      href: '/executions',
      color: 'pink',
    },
    {
      name: 'Total Cost',
      value: `$${(stats.total_cost || 0).toFixed(2)}`,
      icon: CurrencyDollarIcon,
      href: '/costs',
      color: 'yellow',
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'running':
        return <ClockIcon className="h-5 w-5 text-blue-500 animate-pulse" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome to your Blitz AI Framework</p>
        </div>
        <button
          onClick={loadDashboardStats}
          disabled={loading}
          className="btn-secondary"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'text-blue-600 bg-blue-100',
            green: 'text-green-600 bg-green-100',
            purple: 'text-purple-600 bg-purple-100',
            orange: 'text-orange-600 bg-orange-100',
            indigo: 'text-indigo-600 bg-indigo-100',
            pink: 'text-pink-600 bg-pink-100',
            yellow: 'text-yellow-600 bg-yellow-100',
          };

          return (
            <Link
              key={stat.name}
              to={stat.href}
              className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${colorClasses[stat.color]}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Executions */}
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Executions</h3>
              <Link to="/executions" className="text-sm text-blue-600 hover:text-blue-500">
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {stats.recent_executions && stats.recent_executions.length > 0 ? (
              <div className="space-y-4">
                {stats.recent_executions.slice(0, 5).map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      {getStatusIcon(execution.status)}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          Execution #{execution.id}
                        </p>
                        <p className="text-xs text-gray-500">
                          {execution.created_at ? format(new Date(execution.created_at), 'MMM d, HH:mm') : 'Unknown time'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(execution.status)}`}>
                        {execution.status}
                      </span>
                      {execution.duration > 0 && (
                        <span className="text-xs text-gray-500">
                          {execution.duration}s
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <PlayIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No recent executions</p>
                <Link to="/workflows" className="text-xs text-blue-600 hover:text-blue-500">
                  Create your first workflow
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <Link
                to="/models"
                className="block w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <CpuChipIcon className="h-5 w-5 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Add New Model</p>
                    <p className="text-xs text-gray-500">Configure AI models</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/agents"
                className="block w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <UserGroupIcon className="h-5 w-5 text-green-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Create Agent</p>
                    <p className="text-xs text-gray-500">Build AI agents</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/workflows"
                className="block w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <Squares2X2Icon className="h-5 w-5 text-purple-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Design Workflow</p>
                    <p className="text-xs text-gray-500">Visual workflow builder</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/executions"
                className="block w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <PlayIcon className="h-5 w-5 text-orange-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Monitor Executions</p>
                    <p className="text-xs text-gray-500">Track running workflows</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;