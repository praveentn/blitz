// =================== src/pages/ExecutionMonitorPage.js ===================
import React from 'react';
import { PlayIcon } from '@heroicons/react/24/outline';

const ExecutionMonitorPage = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Execution Monitor</h1>
            <p className="text-gray-600">Monitor real-time execution of agents and workflows</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="text-center py-12">
            <PlayIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Execution monitor coming soon</h3>
            <p className="mt-1 text-sm text-gray-500">Real-time execution monitoring will be available in the next update.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ExecutionMonitorPage };
export default ExecutionMonitorPage;