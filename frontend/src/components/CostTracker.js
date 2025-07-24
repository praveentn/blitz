// src/components/CostTracker.js
import React, { useState, useEffect } from 'react';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CalendarIcon,
  UserIcon,
  CpuChipIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const CostTracker = () => {
  const [costData, setCostData] = useState(null);
  const [timeframe, setTimeframe] = useState('week'); // 'day', 'week', 'month', 'year'
  const [loading, setLoading] = useState(true);
  const [userCosts, setUserCosts] = useState([]);
  const [modelCosts, setModelCosts] = useState([]);

  useEffect(() => {
    loadCostData();
  }, [timeframe]);

  const loadCostData = async () => {
    try {
      setLoading(true);
      
      // Load overall cost data
      const costResponse = await apiService.get(`/costs/analytics?timeframe=${timeframe}`);
      setCostData(costResponse.data);
      
      // Load user-specific costs
      const userCostResponse = await apiService.get(`/costs/by-user?timeframe=${timeframe}`);
      setUserCosts(userCostResponse.data || []);
      
      // Load model-specific costs
      const modelCostResponse = await apiService.get(`/costs/by-model?timeframe=${timeframe}`);
      setModelCosts(modelCostResponse.data || []);
      
    } catch (error) {
      console.error('Error loading cost data:', error);
      handleApiError(error);
      setCostData(null);
      setUserCosts([]);
      setModelCosts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatTokens = (tokens) => {
    if (!tokens) return '0';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toLocaleString();
  };

  const getCostTrend = (current, previous) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      direction: change >= 0 ? 'up' : 'down',
      color: change >= 0 ? 'text-red-600' : 'text-green-600'
    };
  };

  const getUsageLevel = (current, limit) => {
    if (!limit) return 'normal';
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'normal';
  };

  const getUsageColor = (level) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-green-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!costData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Cost data unavailable</h3>
          <p className="mt-1 text-sm text-gray-500">Unable to load cost tracking information.</p>
        </div>
      </div>
    );
  }

  const usageLevel = getUsageLevel(costData.current_period.total_cost, costData.cost_limit);
  const usagePercentage = costData.cost_limit 
    ? Math.min((costData.current_period.total_cost / costData.cost_limit) * 100, 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <CurrencyDollarIcon className="h-8 w-8 text-green-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cost Tracking</h1>
            <p className="text-gray-600">Monitor LLM usage costs and spending patterns</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="form-select"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Cost Limit Alert */}
      {usageLevel !== 'normal' && (
        <div className={`p-4 rounded-lg border ${
          usageLevel === 'critical' 
            ? 'bg-red-50 border-red-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start">
            <ExclamationTriangleIcon className={`h-5 w-5 mt-0.5 mr-3 ${
              usageLevel === 'critical' ? 'text-red-600' : 'text-yellow-600'
            }`} />
            <div>
              <h3 className={`text-sm font-medium ${
                usageLevel === 'critical' ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {usageLevel === 'critical' ? 'Cost Limit Nearly Reached' : 'High Usage Warning'}
              </h3>
              <p className={`text-sm ${
                usageLevel === 'critical' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                You've used {usagePercentage.toFixed(1)}% of your cost limit this period.
                {usageLevel === 'critical' && ' Consider reviewing your usage or increasing your limit.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(costData.current_period.total_cost)}
                </p>
                {costData.previous_period && (
                  <div className="flex items-center mt-1">
                    {(() => {
                      const trend = getCostTrend(
                        costData.current_period.total_cost,
                        costData.previous_period.total_cost
                      );
                      return trend ? (
                        <span className={`text-xs ${trend.color}`}>
                          {trend.direction === 'up' ? '↗' : '↘'} {trend.value}% vs last period
                        </span>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tokens</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTokens(costData.current_period.total_tokens)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg: {formatCurrency(costData.current_period.avg_cost_per_token)}/token
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">API Calls</p>
                <p className="text-2xl font-bold text-gray-900">
                  {costData.current_period.total_calls?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg: {formatCurrency(costData.current_period.avg_cost_per_call)}/call
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="relative w-8 h-8">
                  <div className="w-8 h-8 bg-gray-200 rounded-full">
                    <div 
                      className={`h-8 rounded-full ${getUsageColor(usageLevel)}`}
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Usage Limit</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usagePercentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(costData.cost_limit)} limit
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by User */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <UserIcon className="h-5 w-5 mr-2" />
              Cost by User
            </h3>
          </div>
          <div className="card-body">
            {userCosts.length === 0 ? (
              <div className="text-center py-8">
                <InformationCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No user cost data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userCosts.slice(0, 5).map((user, index) => {
                  const maxCost = Math.max(...userCosts.map(u => u.total_cost));
                  const percentage = maxCost > 0 ? (user.total_cost / maxCost) * 100 : 0;
                  
                  return (
                    <div key={user.user_id} className="flex items-center">
                      <div className="w-24 text-sm text-gray-600 truncate">
                        {user.username || `User ${user.user_id}`}
                      </div>
                      <div className="flex-1 mx-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-20 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(user.total_cost)}
                      </div>
                    </div>
                  );
                })}
                {userCosts.length > 5 && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    +{userCosts.length - 5} more users
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cost by Model */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CpuChipIcon className="h-5 w-5 mr-2" />
              Cost by Model
            </h3>
          </div>
          <div className="card-body">
            {modelCosts.length === 0 ? (
              <div className="text-center py-8">
                <InformationCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No model cost data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {modelCosts.slice(0, 5).map((model, index) => {
                  const maxCost = Math.max(...modelCosts.map(m => m.total_cost));
                  const percentage = maxCost > 0 ? (model.total_cost / maxCost) * 100 : 0;
                  
                  return (
                    <div key={model.model_id} className="flex items-center">
                      <div className="w-24 text-sm text-gray-600 truncate">
                        {model.model_name || `Model ${model.model_id}`}
                      </div>
                      <div className="flex-1 mx-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-20 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(model.total_cost)}
                      </div>
                    </div>
                  );
                })}
                {modelCosts.length > 5 && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    +{modelCosts.length - 5} more models
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
        </div>
        <div className="card-body">
          {costData.recent_transactions && costData.recent_transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table">
                <thead>
                  <tr className="table-header">
                    <th className="table-cell text-left">Time</th>
                    <th className="table-cell text-left">User</th>
                    <th className="table-cell text-left">Model</th>
                    <th className="table-cell text-right">Tokens</th>
                    <th className="table-cell text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {costData.recent_transactions.slice(0, 10).map((transaction, index) => (
                    <tr key={index} className="table-row">
                      <td className="table-cell">
                        {new Date(transaction.created_at).toLocaleString()}
                      </td>
                      <td className="table-cell">
                        {transaction.username || `User ${transaction.user_id}`}
                      </td>
                      <td className="table-cell">
                        {transaction.model_name || 'Unknown'}
                      </td>
                      <td className="table-cell text-right">
                        {formatTokens(transaction.tokens)}
                      </td>
                      <td className="table-cell text-right font-medium">
                        {formatCurrency(transaction.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <InformationCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No recent transactions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostTracker;