// src/components/CrudModal.js
import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { apiService, handleApiError, handleApiSuccess } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const CrudModal = ({
  isOpen,
  onClose,
  title,
  mode, // 'create', 'edit', 'delete'
  item,
  fields,
  endpoint,
  onSuccess
}) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && item) {
        setFormData(item);
      } else if (mode === 'create') {
        const initialData = {};
        fields.forEach(field => {
          initialData[field.key] = field.default || '';
        });
        setFormData(initialData);
      }
      setErrors({});
    }
  }, [isOpen, mode, item, fields]);

  const handleInputChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => ({
        ...prev,
        [key]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    fields.forEach(field => {
      if (field.required && (!formData[field.key] || formData[field.key].toString().trim() === '')) {
        newErrors[field.key] = `${field.label} is required`;
      }
      
      // Additional validation for specific types
      if (formData[field.key]) {
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData[field.key])) {
          newErrors[field.key] = 'Please enter a valid email address';
        }
        
        if (field.type === 'url' && !/^https?:\/\/.+/.test(formData[field.key])) {
          newErrors[field.key] = 'Please enter a valid URL (starting with http:// or https://)';
        }
        
        if (field.type === 'json') {
          try {
            JSON.parse(formData[field.key]);
          } catch (e) {
            newErrors[field.key] = 'Please enter valid JSON';
          }
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      let response;
      const submissionData = { ...formData };
      
      // Process JSON fields
      fields.forEach(field => {
        if (field.type === 'json' && submissionData[field.key]) {
          try {
            submissionData[field.key] = JSON.parse(submissionData[field.key]);
          } catch (e) {
            // Keep as string if not valid JSON
          }
        }
      });
      
      if (mode === 'create') {
        response = await apiService.post(endpoint, submissionData);
        handleApiSuccess(`${title} created successfully!`);
      } else if (mode === 'edit') {
        response = await apiService.put(`${endpoint}/${item.id}`, submissionData);
        handleApiSuccess(`${title} updated successfully!`);
      } else if (mode === 'delete') {
        response = await apiService.delete(`${endpoint}/${item.id}`);
        handleApiSuccess(`${title} deleted successfully!`);
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field.key] || '';
    const error = errors[field.key];
    
    const commonProps = {
      id: field.key,
      value: field.type === 'json' ? JSON.stringify(value, null, 2) : value,
      onChange: (e) => handleInputChange(field.key, e.target.value),
      className: `form-input ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`,
      placeholder: field.placeholder || '',
      disabled: loading
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
            className={`form-textarea ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          />
        );
      
      case 'json':
        return (
          <textarea
            {...commonProps}
            rows={8}
            className={`form-textarea font-mono text-sm ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          />
        );
      
      case 'select':
        return (
          <select
            {...commonProps}
            className={`form-select ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          >
            <option value="">Select an option</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
            step={field.step || 'any'}
            min={field.min}
            max={field.max}
          />
        );
      
      case 'checkbox':
        return (
          <input
            type="checkbox"
            id={field.key}
            checked={!!value}
            onChange={(e) => handleInputChange(field.key, e.target.checked)}
            className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled={loading}
          />
        );
      
      default:
        return (
          <input
            {...commonProps}
            type={field.type || 'text'}
          />
        );
    }
  };

  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return `Create New ${title}`;
      case 'edit':
        return `Edit ${title}`;
      case 'delete':
        return `Delete ${title}`;
      default:
        return title;
    }
  };

  const getSubmitButtonText = () => {
    if (loading) {
      return <LoadingSpinner size="sm" />;
    }
    
    switch (mode) {
      case 'create':
        return 'Create';
      case 'edit':
        return 'Update';
      case 'delete':
        return 'Delete';
      default:
        return 'Submit';
    }
  };

  const getSubmitButtonClass = () => {
    const baseClass = 'w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    switch (mode) {
      case 'delete':
        return `${baseClass} text-white bg-red-600 hover:bg-red-700 focus:ring-red-500`;
      default:
        return `${baseClass} text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      
      {/* Modal */}
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                {getModalTitle()}
              </Dialog.Title>
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={onClose}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit}>
              {mode === 'delete' ? (
                <div className="mb-6">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete this {title.toLowerCase()}? This action cannot be undone.
                  </p>
                  {item && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm font-medium text-gray-900">
                        {item.name || item.title || `${title} #${item.id}`}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {fields.map(field => (
                    <div key={field.key}>
                      <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {renderField(field)}
                      
                      {field.description && (
                        <p className="mt-1 text-xs text-gray-500">{field.description}</p>
                      )}
                      
                      {errors[field.key] && (
                        <p className="mt-1 text-xs text-red-600">{errors[field.key]}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  className="flex-1 rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className={getSubmitButtonClass()}
                  disabled={loading}
                >
                  {getSubmitButtonText()}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
};

export default CrudModal;