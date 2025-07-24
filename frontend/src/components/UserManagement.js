// src/components/UserManagement.js
import React, { useState, useEffect } from 'react';
import {
  UsersIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  BanknotesIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { apiService, handleApiError, handleApiSuccess } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import CrudModal from './CrudModal';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create',
    item: null
  });

  const userFields = [
    {
      key: 'username',
      label: 'Username',
      type: 'text',
      required: true,
      placeholder: 'e.g., john_doe',
      description: 'Unique username for the user'
    },
    {
      key: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'user@company.com',
      description: 'User\'s email address'
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: false, // Only required for create mode
      placeholder: 'Leave blank to keep current password',
      description: 'User password (leave blank when editing to keep current)'
    },
    {
      key: 'role',
      label: 'Role',
      type: 'select',
      required: true,
      options: [
        { value: 'business_user', label: 'Business User' },
        { value: 'admin', label: 'Administrator' }
      ],
      description: 'User access level'
    },
    {
      key: 'cost_limit',
      label: 'Cost Limit ($)',
      type: 'number',
      min: 0,
      step: 0.01,
      default: '100.00',
      description: 'Maximum monthly cost allowance for this user'
    },
    {
      key: 'is_active',
      label: 'Account Status',
      type: 'select',
      required: true,
      options: [
        { value: true, label: 'Active' },
        { value: false, label: 'Inactive' }
      ],
      description: 'Whether the user account is active'
    }
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/admin/users');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      handleApiError(error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode, item = null) => {
    // Adjust fields based on mode
    const adjustedFields = userFields.map(field => {
      if (field.key === 'password') {
        return {
          ...field,
          required: mode === 'create'
        };
      }
      return field;
    });
    
    setModalState({ 
      isOpen: true, 
      mode, 
      item,
      fields: adjustedFields
    });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, mode: 'create', item: null });
  };

  const handleModalSuccess = () => {
    loadUsers();
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await apiService.put(`/admin/users/${userId}`, {
        is_active: !currentStatus
      });
      handleApiSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      loadUsers();
    } catch (error) {
      handleApiError(error);
    }
  };

  const resetUserCosts = async (userId) => {
    try {
      await apiService.post(`/admin/users/${userId}/reset-costs`);
      handleApiSuccess('User costs reset successfully');
      loadUsers();
    } catch (error) {
      handleApiError(error);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <ShieldCheckIcon className="h-4 w-4 text-red-600" />;
      case 'business_user':
        return <UserCircleIcon className="h-4 w-4 text-blue-600" />;
      default:
        return <UserCircleIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'business_user':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (isActive) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <UsersIcon className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
          </div>
        </div>
        <button
          onClick={() => openModal('create')}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Users
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Filter
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="form-select"
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrators</option>
                <option value="business_user">Business Users</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-select"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-body p-0">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating a new user account'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table">
                <thead>
                  <tr className="table-header">
                    <th className="table-cell text-left">User</th>
                    <th className="table-cell text-left">Role</th>
                    <th className="table-cell text-left">Status</th>
                    <th className="table-cell text-left">Cost Limit</th>
                    <th className="table-cell text-left">Last Login</th>
                    <th className="table-cell text-left">Created</th>
                    <th className="table-cell text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                            <UserCircleIcon className="h-6 w-6 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.username}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <div className="flex items-center">
                          {getRoleIcon(user.role)}
                          <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(user.role)}`}>
                            {user.role === 'admin' ? 'Administrator' : 'Business User'}
                          </span>
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(user.is_active)}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      
                      <td className="table-cell">
                        <div className="flex items-center">
                          <BanknotesIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="font-medium">{formatCurrency(user.cost_limit)}</span>
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <div className="flex items-center text-sm text-gray-600">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                          {user.last_login ? 
                            new Date(user.last_login).toLocaleDateString() : 
                            'Never'
                          }
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <div className="text-sm text-gray-600">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openModal('edit', user)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit user"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                            className={`p-2 transition-colors ${
                              user.is_active 
                                ? 'text-gray-400 hover:text-yellow-600' 
                                : 'text-gray-400 hover:text-green-600'
                            }`}
                            title={user.is_active ? 'Deactivate user' : 'Activate user'}
                          >
                            {user.is_active ? '⏸️' : '▶️'}
                          </button>
                          
                          <button
                            onClick={() => resetUserCosts(user.id)}
                            className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                            title="Reset user costs"
                          >
                            💰
                          </button>
                          
                          <button
                            onClick={() => openModal('delete', user)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete user"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Administrators</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.is_active).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BanknotesIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(users.reduce((sum, u) => sum + (u.cost_limit || 0), 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CrudModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title="User"
        mode={modalState.mode}
        item={modalState.item}
        fields={userFields}
        endpoint="/admin/users"
        onSuccess={handleModalSuccess}
        validationRules={{
          email: (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (value && !emailRegex.test(value)) return 'Invalid email format';
            return null;
          },
          cost_limit: (value) => {
            if (value && (isNaN(value) || Number(value) < 0)) return 'Cost limit must be a positive number';
            return null;
          }
        }}
      />
    </div>
  );
};

export default UserManagement;