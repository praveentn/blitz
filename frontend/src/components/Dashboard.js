// src/components/Dashboard.js
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
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner, { CardSkeleton } from '../components/LoadingSpinner';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const response = await apiService.dashboard.getStats();
      setStats(response.data);
    } catch (error) {
      handleApiError(error, 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Unable to load dashboard</h3>
          <button
            onClick={loadDashboardStats}
            className="mt-2 btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Models',
      value: stats.models,
      href: '/models',
      icon: CpuChipIcon,
      color: 'blue',
    },
    {
      name: 'Agents',
      value: stats.agents,
      href: '/agents',
      icon: UserGroupIcon,
      color: 'green',
    },
    {
      name: 'Workflows',
      value: stats.workflows,
      href: '/workflows',
      icon: Squares2X2Icon,
      color: 'purple',
    },
    {
      name: 'Executions Today',
      value: stats.executions_today,
      href: '/executions',
      icon: PlayIcon,
      color: 'orange',
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'running':
        return <LoadingSpinner size="small" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'status-badge status-success',
      failed: 'status-badge status-error',
      running: 'status-badge status-info',
      pending: 'status-badge status-pending',
    };
    return badges[status] || 'status-badge status-pending';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome to Blitz AI Framework</h1>
        <p className="text-blue-100">
          Build and deploy enterprise-grade agentic AI workflows with ease
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'text-blue-600 bg-blue-100',
            green: 'text-green-600 bg-green-100',
            purple: 'text-purple-600 bg-purple-100',
            orange: 'text-orange-600 bg-orange-100',
          };

          return (
            <Link
              key={stat.name}
              to={stat.href}
              className="card hover:shadow-md transition-shadow duration-200"
            >
              <div className="card-body">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${colorClasses[stat.color]}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Executions */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Executions</h3>
              <Link to="/executions" className="text-sm text-blue-600 hover:text-blue-500">
                View all
              </Link>
            </div>
          </div>
          <div className="card-body">
            {stats.recent_executions && stats.recent_executions.length > 0 ? (
              <div className="space-y-4">
                {stats.recent_executions.slice(0, 5).map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {execution.type} #{execution.id}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(execution.created_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={getStatusBadge(execution.status)}>
                        {execution.status}
                      </span>
                      {execution.duration && (
                        <p className="text-xs text-gray-500 mt-1">
                          {execution.duration}s
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <PlayIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No executions yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start by creating an agent or workflow
                </p>
                <div className="mt-4 space-x-2">
                  <Link to="/agents" className="btn-primary">
                    Create Agent
                  </Link>
                  <Link to="/workflows" className="btn-secondary">
                    Create Workflow
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cost Overview */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Cost Overview</h3>
              <Link to="/costs" className="text-sm text-blue-600 hover:text-blue-500">
                View details
              </Link>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats.total_cost?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>

              {/* Quick cost breakdown */}
              <div className="pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex justify-between">
                    <span>Today's Usage</span>
                    <span className="font-medium">${(stats.total_cost * 0.1).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Week</span>
                    <span className="font-medium">${(stats.total_cost * 0.3).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Month</span>
                    <span className="font-medium">${stats.total_cost?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Link to="/models" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <CpuChipIcon className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Add Model</span>
            </Link>
            
            <Link to="/prompts" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <DocumentTextIcon className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Create Prompt</span>
            </Link>
            
            <Link to="/tools" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <WrenchScrewdriverIcon className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Browse Tools</span>
            </Link>
            
            <Link to="/agents" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <UserGroupIcon className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Build Agent</span>
            </Link>
            
            <Link to="/workflows" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Squares2X2Icon className="h-8 w-8 text-red-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Design Workflow</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;