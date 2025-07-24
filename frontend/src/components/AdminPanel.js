// src/components/AdminPanel.js - Updated version
import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import {
  CogIcon,
  CommandLineIcon,
  ServerIcon,
  UsersIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import SQLExecutor from './SQLExecutor';
import DatabaseBrowser from './DatabaseBrowser';
import UserManagement from './UserManagement';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Placeholder components for missing features
const SystemHealth = () => (
  <div className="text-center py-12">
    <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-medium text-gray-900">System Health</h3>
    <p className="mt-1 text-sm text-gray-500">Performance monitoring coming soon</p>
  </div>
);

const AdminPanel = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const tabs = [
    {
      name: 'SQL Executor',
      icon: CommandLineIcon,
      component: SQLExecutor,
    },
    {
      name: 'Database Browser',
      icon: ServerIcon,
      component: DatabaseBrowser,
    },
    {
      name: 'User Management',
      icon: UsersIcon,
      component: UserManagement,
    },
    {
      name: 'System Health',
      icon: ChartBarIcon,
      component: SystemHealth,
    },
  ];

  const ActiveComponent = tabs[selectedIndex].component;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center">
          <CogIcon className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-600">Advanced administration and database management</p>
          </div>
        </div>
      </div>

      <div className="card">
        <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <Tab.List className="flex space-x-1 rounded-t-lg bg-gray-100 p-1">
            {tabs.map((tab, index) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  classNames(
                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200',
                    'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                    selected
                      ? 'bg-white text-blue-700 shadow'
                      : 'text-gray-600 hover:bg-white/[0.12] hover:text-gray-800'
                  )
                }
              >
                <div className="flex items-center justify-center space-x-2">
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </div>
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="mt-0">
            <Tab.Panel className="rounded-b-lg bg-white p-6 focus:outline-none">
              <ActiveComponent />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default AdminPanel;