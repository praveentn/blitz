// =================== src/pages/CostTrackerPage.js ===================
import React from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

const CostTrackerPage = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cost Tracker</h1>
            <p className="text-gray-600">Monitor your AI usage costs and analytics</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="text-center py-12">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Cost tracking coming soon</h3>
            <p className="mt-1 text-sm text-gray-500">Advanced cost analytics will be available in the next update.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export { CostTrackerPage };
export default CostTrackerPage;