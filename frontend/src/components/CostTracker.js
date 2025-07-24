// src/components/CostTracker.js
import React, { useState, useEffect } from 'react';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner, { CardSkeleton } from './LoadingSpinner';
import { useAuth } from '../services/auth';

const CostTracker = () => {
  const [costs, setCosts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30); // days
  const { user } = useAuth();

  useEffect(() => {
    loadCostData();
  }, [timeRange]);

  const loadCostData = async () => {
    setLoading(true);
    try {
      const response = await apiService.costs.getUserCosts();
      setCosts(response.data);
    } catch (error) {
      handleApiError(error, 'Failed to load cost data');
    } finally {
      setLoading(false);
    }
  };

  // Generate mock data for charts (replace with real API data)
  const generateChartData = () => {
    const data = [];
    for (let i = timeRange - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      data.push({
        date: format(date, 'MMM dd'),
        cost: Math.random() * 5 + 1, // Mock cost data
        executions: Math.floor(Math.random() * 20) + 5,
      });
    }
    return data;
  };

  const chartData = generateChartData();

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

  const costCards = [
    {
      name: 'Total Cost',
      value: `$${costs?.total_cost?.toFixed(2) || '0.00'}`,
      change: '+12.3%',
      trend: 'up',
      icon: CurrencyDollarIcon,
      color: 'blue',
    },
    {
      name: 'This Month',
      value: `$${costs?.recent_cost?.toFixed(2) || '0.00'}`,
      change: '+8.1%',
      trend: 'up',
      icon: CalendarIcon,
      color: 'green',
    },
    {
      name: 'Recent Executions',
      value: costs?.recent_executions || '0',
      change: '+24.5%',
      trend: 'up',
      icon: ChartBarIcon,
      color: 'purple',
    },
    {
      name: 'Budget Used',
      value: `${((costs?.total_cost || 0) / (user?.cost_limit || 100) * 100).toFixed(1)}%`,
      change: costs?.total_cost > (user?.cost_limit * 0.8) ? 'Warning' : 'Good',
      trend: costs?.total_cost > (user?.cost_limit * 0.8) ? 'up' : 'down',
      icon: ExclamationTriangleIcon,
      color: costs?.total_cost > (user?.cost_limit * 0.8) ? 'red' : 'green',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cost Tracking</h1>
          <p className="text-gray-600">Monitor your AI usage costs and budget</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
            className="form-select"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Cost Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {costCards.map((card) => {
          const Icon = card.icon;
          const TrendIcon = card.trend === 'up' ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
          
          const colorClasses = {
            blue: 'text-blue-600 bg-blue-100',
            green: 'text-green-600 bg-green-100',
            purple: 'text-purple-600 bg-purple-100',
            red: 'text-red-600 bg-red-100',
          };

          const trendColors = {
            up: card.color === 'red' ? 'text-red-600' : 'text-green-600',
            down: 'text-green-600',
          };

          return (
            <div key={card.name} className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${colorClasses[card.color]}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600">{card.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    <div className="flex items-center mt-1">
                      <TrendIcon className={`h-4 w-4 ${trendColors[card.trend]}`} />
                      <span className={`text-sm ml-1 ${trendColors[card.trend]}`}>
                        {card.change}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Budget Alert */}
      {costs?.total_cost > (user?.cost_limit * 0.8) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Budget Warning</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You've used {((costs?.total_cost || 0) / (user?.cost_limit || 100) * 100).toFixed(1)}% 
                of your ${user?.cost_limit || 100} budget limit.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Trend Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Cost Trend</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Cost']}
                  labelStyle={{ color: '#374151' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Execution Volume */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Execution Volume</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [value, 'Executions']}
                  labelStyle={{ color: '#374151' }}
                />
                <Bar dataKey="executions" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Type */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Cost by Type</h3>
          </div>
          <div className="card-body">
            {costs?.cost_by_type && Object.keys(costs.cost_by_type).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(costs.cost_by_type).map(([type, amount]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {type.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      ${amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No cost data</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start using the platform to see cost breakdown
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Budget Progress */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Budget Progress</h3>
          </div>
          <div className="card-body">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Current Usage</span>
                  <span className="text-sm text-gray-500">
                    ${costs?.total_cost?.toFixed(2) || '0.00'} / ${user?.cost_limit || 100}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      (costs?.total_cost || 0) > (user?.cost_limit * 0.9) 
                        ? 'bg-red-500' 
                        : (costs?.total_cost || 0) > (user?.cost_limit * 0.7)
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min(((costs?.total_cost || 0) / (user?.cost_limit || 100)) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Remaining Budget</span>
                  <span className="font-medium text-gray-900">
                    ${Math.max((user?.cost_limit || 100) - (costs?.total_cost || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Estimated Days Remaining</span>
                  <span className="font-medium text-gray-900">
                    {Math.floor(Math.max((user?.cost_limit || 100) - (costs?.total_cost || 0), 0) / Math.max((costs?.total_cost || 0.1) / 30, 0.1))} days
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Daily Average</span>
                  <span className="font-medium text-gray-900">
                    ${((costs?.total_cost || 0) / 30).toFixed(2)}
                  </span>
                </div>
              </div>

              {(costs?.total_cost || 0) > (user?.cost_limit * 0.9) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    <strong>Critical:</strong> You're approaching your budget limit. 
                    Consider reducing usage or requesting a budget increase.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostTracker;