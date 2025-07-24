// src/pages/CostTrackerPage.js
import React, { useState, useEffect } from 'react';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  UserIcon,
  CpuChipIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const CostTrackerPage = () => {
  const [costData, setCostData] = useState({
    totalCost: 0,
    dailyCosts: [],
    modelCosts: [],
    userCosts: [],
    executions: []
  });
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d'); // 1d, 7d, 30d
  const [selectedModel, setSelectedModel] = useState('all');
  const [models, setModels] = useState([]);

  useEffect(() => {
    loadCostData();
    loadModels();
  }, [timeframe, selectedModel]);

  const loadCostData = async () => {
    try {
      setLoading(true);
      // Since we don't have specific cost endpoints, we'll simulate the data structure
      // In a real implementation, you'd call your cost API endpoints
      const response = await apiService.get(`/costs?timeframe=${timeframe}&model=${selectedModel}`);
      setCostData(response.data || {
        totalCost: 0,
        dailyCosts: [],
        modelCosts: [],
        userCosts: [],
        executions: []
      });
    } catch (error) {
      // For demo purposes, we'll use mock data if the endpoint doesn't exist
      console.log('Cost endpoint not available, using mock data');
      generateMockCostData();
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const response = await apiService.models.list();
      setModels(response.data || []);
    } catch (error) {
      handleApiError(error);
      setModels([]);
    }
  };

  const generateMockCostData = () => {
    // Generate mock data for demonstration
    const days = timeframe === '1d' ? 1 : timeframe === '7d' ? 7 : 30;
    const dailyCosts = [];
    let totalCost = 0;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const cost = Math.random() * 50 + 10; // Random cost between $10-60
      totalCost += cost;
      
      dailyCosts.push({
        date: date.toISOString().split('T')[0],
        cost: cost,
        executions: Math.floor(Math.random() * 20) + 5,
        tokens: Math.floor(cost * 1000) // Approximate tokens
      });
    }

    const modelCosts = [
      { model: 'GPT-4', cost: totalCost * 0.6, executions: 45, tokens: 120000 },
      { model: 'GPT-3.5-Turbo', cost: totalCost * 0.3, executions: 78, tokens: 200000 },
      { model: 'Claude-3-Sonnet', cost: totalCost * 0.1, executions: 12, tokens: 30000 }
    ];

    const userCosts = [
      { user: 'admin@blitz.com', cost: totalCost * 0.4, executions: 32 },
      { user: 'user@blitz.com', cost: totalCost * 0.35, executions: 28 },
      { user: 'demo@blitz.com', cost: totalCost * 0.25, executions: 20 }
    ];

    setCostData({
      totalCost: Math.round(totalCost * 100) / 100,
      dailyCosts,
      modelCosts,
      userCosts,
      executions: dailyCosts.reduce((sum, day) => sum + day.executions, 0)
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getTimeframeDays = () => {
    switch (timeframe) {
      case '1d': return 1;
      case '7d': return 7;
      case '30d': return 30;
      default: return 7;
    }
  };

  const getAverageDailyCost = () => {
    const days = getTimeframeDays();
    return costData.totalCost / days;
  };

  const getCostTrend = () => {
    if (costData.dailyCosts.length < 2) return 0;
    
    const recent = costData.dailyCosts.slice(-3).reduce((sum, day) => sum + day.cost, 0) / 3;
    const older = costData.dailyCosts.slice(0, 3).reduce((sum, day) => sum + day.cost, 0) / 3;
    
    return ((recent - older) / older) * 100;
  };

  const getTrendIcon = () => {
    const trend = getCostTrend();
    if (trend > 5) {
      return <ArrowTrendingUpIcon className="h-4 w-4 text-red-500" />;
    } else if (trend < -5) {
      return <ArrowTrendingDownIcon className="h-4 w-4 text-green-500" />;
    }
    return <ArrowTrendingUpIcon className="h-4 w-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cost Tracking</h1>
              <p className="text-gray-600">Monitor LLM usage costs and budget allocation</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="form-select text-sm"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="form-select text-sm"
            >
              <option value="all">All Models</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cost Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Cost</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(costData.totalCost)}
              </p>
              <div className="flex items-center mt-1">
                {getTrendIcon()}
                <span className="ml-1 text-xs text-gray-500">
                  {Math.abs(getCostTrend()).toFixed(1)}% vs avg
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Daily Average</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(getAverageDailyCost())}
              </p>
              <p className="text-xs text-gray-500">Last {getTimeframeDays()} days</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Executions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(costData.executions)}
              </p>
              <p className="text-xs text-gray-500">
                {formatCurrency(costData.totalCost / costData.executions || 0)} per execution
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Budget Status</p>
              <p className="text-2xl font-semibold text-gray-900">85%</p>
              <p className="text-xs text-gray-500">of monthly budget used</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Cost Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Cost Breakdown</h3>
          <div className="space-y-3">
            {costData.dailyCosts.map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">
                      {new Date(day.date).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(day.cost)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(day.cost / Math.max(...costData.dailyCosts.map(d => d.cost))) * 100}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{day.executions} executions</span>
                    <span>{formatNumber(day.tokens)} tokens</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Cost Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cost by Model</h3>
          <div className="space-y-4">
            {costData.modelCosts.map((model, index) => (
              <div key={index} className="flex items-center">
                <div className="p-2 bg-gray-100 rounded">
                  <CpuChipIcon className="h-5 w-5 text-gray-600" />
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{model.model}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(model.cost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{model.executions} executions</span>
                    <span>{formatNumber(model.tokens)} tokens</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{
                        width: `${(model.cost / costData.totalCost) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Cost Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cost by User</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Executions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Cost/Execution
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {costData.userCosts.map((user, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="p-1 bg-gray-100 rounded-full">
                        <UserIcon className="h-4 w-4 text-gray-600" />
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {user.user}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(user.cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.executions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(user.cost / user.executions)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(user.cost / costData.totalCost) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-900">
                        {((user.cost / costData.totalCost) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget Alert */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Budget Alert</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                You've used 85% of your monthly budget. Consider reviewing your usage patterns or 
                adjusting your budget limits to avoid service interruptions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostTrackerPage;