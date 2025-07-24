// =================== src/pages/AgentsPage.js ===================
import React, { useState, useEffect } from 'react';
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner, { TableSkeleton } from '../components/LoadingSpinner';

const AgentsPage = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await apiService.agents.getAll();
      setAgents(response.data);
    } catch (error) {
      handleApiError(error, 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-600">Manage your AI agents</p>
        </div>
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
            <p className="text-gray-600">Manage your AI agents</p>
          </div>
          <button className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Agent
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium">AI Agents</h3>
        </div>
        <div className="card-body">
          {agents.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No agents</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first AI agent.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Name</th>
                    <th className="table-header-cell">Model</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Created</th>
                    <th className="table-header-cell">Actions</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {agents.map((agent) => (
                    <tr key={agent.id} className="table-row">
                      <td className="table-cell font-medium">{agent.name}</td>
                      <td className="table-cell">{agent.model_id}</td>
                      <td className="table-cell">
                        <span className="status-badge status-success">Active</span>
                      </td>
                      <td className="table-cell">{new Date(agent.created_at).toLocaleDateString()}</td>
                      <td className="table-cell">
                        <button className="btn-secondary">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { AgentsPage };
export default AgentsPage;