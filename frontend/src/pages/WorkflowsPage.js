// =================== src/pages/WorkflowsPage.js ===================
import React, { useState, useEffect } from 'react';
import { PlusIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { apiService, handleApiError } from '../services/api';
import LoadingSpinner, { TableSkeleton } from '../components/LoadingSpinner';

const WorkflowsPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const response = await apiService.workflows.getAll();
      setWorkflows(response.data);
    } catch (error) {
      handleApiError(error, 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-600">Design and manage your AI workflows</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
            <p className="text-gray-600">Design and manage your AI workflows</p>
          </div>
          <button className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Workflow
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium">AI Workflows</h3>
        </div>
        <div className="card-body">
          {workflows.length === 0 ? (
            <div className="text-center py-12">
              <Squares2X2Icon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No workflows</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first workflow.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Name</th>
                    <th className="table-header-cell">Nodes</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Created</th>
                    <th className="table-header-cell">Actions</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {workflows.map((workflow) => (
                    <tr key={workflow.id} className="table-row">
                      <td className="table-cell font-medium">{workflow.name}</td>
                      <td className="table-cell">{workflow.nodes ? JSON.parse(workflow.nodes).length : 0}</td>
                      <td className="table-cell">
                        <span className="status-badge status-success">Active</span>
                      </td>
                      <td className="table-cell">{new Date(workflow.created_at).toLocaleDateString()}</td>
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

export { WorkflowsPage };
export default WorkflowsPage;