// src/components/CrudModal.js
import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';
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
  onSuccess,
  validationRules = {}
}) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && item) {
        // FIX: Safely handle item data with proper null checking
        const initialData = {};
        fields.forEach(field => {
          // Ensure we handle all data types properly
          const value = item[field.key];
          if (value !== null && value !== undefined) {
            if (field.type === 'json' && typeof value === 'object') {
              initialData[field.key] = JSON.stringify(value, null, 2);
            } else {
              initialData[field.key] = String(value);
            }
          } else {
            initialData[field.key] = field.default || '';
          }
        });
        setFormData(initialData);
      } else {
        // Initialize with defaults for create mode
        const initialData = {};
        fields.forEach(field => {
          initialData[field.key] = field.default || '';
        });
        setFormData(initialData);
      }
      setErrors({});
    }
  }, [isOpen, mode, item, fields]);

  const validateForm = () => {
    const newErrors = {};
    
    fields.forEach(field => {
      const value = formData[field.key];
      
      // Required field validation
      if (field.required && (!value || String(value).trim() === '')) {
        newErrors[field.key] = `${field.label} is required`;
        return;
      }
      
      // Skip validation for empty optional fields
      if (!value || String(value).trim() === '') return;
      
      // Type-specific validation
      switch (field.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            newErrors[field.key] = 'Invalid email format';
          }
          break;
          
        case 'url':
          try {
            new URL(value);
          } catch {
            newErrors[field.key] = 'Invalid URL format';
          }
          break;
          
        case 'number':
          if (isNaN(Number(value))) {
            newErrors[field.key] = 'Must be a valid number';
          } else if (field.min !== undefined && Number(value) < field.min) {
            newErrors[field.key] = `Must be at least ${field.min}`;
          } else if (field.max !== undefined && Number(value) > field.max) {
            newErrors[field.key] = `Must be at most ${field.max}`;
          }
          break;
          
        case 'json':
          try {
            JSON.parse(value);
          } catch {
            newErrors[field.key] = 'Invalid JSON format';
          }
          break;
          
        default:
          if (field.minLength && String(value).length < field.minLength) {
            newErrors[field.key] = `Must be at least ${field.minLength} characters`;
          }
          if (field.maxLength && String(value).length > field.maxLength) {
            newErrors[field.key] = `Must be at most ${field.maxLength} characters`;
          }
      }
      
      // Custom validation rules
      if (validationRules[field.key]) {
        const customError = validationRules[field.key](value, formData);
        if (customError) {
          newErrors[field.key] = customError;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[key]) {
      setErrors(prev => ({
        ...prev,
        [key]: undefined
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (mode === 'delete') {
      await handleDelete();
      return;
    }
    
    if (!validateForm()) {
      handleApiError({ message: 'Please fix the validation errors' });
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare data for submission
      const submitData = {};
      fields.forEach(field => {
        let value = formData[field.key];
        
        // Type conversions
        switch (field.type) {
          case 'number':
            submitData[field.key] = value ? Number(value) : null;
            break;
          case 'json':
            try {
              submitData[field.key] = value ? JSON.parse(value) : {};
            } catch {
              submitData[field.key] = {};
            }
            break;
          case 'boolean':
            submitData[field.key] = Boolean(value);
            break;
          default:
            submitData[field.key] = value || null;
        }
      });
      
      let response;
      if (mode === 'create') {
        response = await apiService.post(endpoint, submitData);
      } else if (mode === 'edit') {
        response = await apiService.put(`${endpoint}/${item.id}`, submitData);
      }
      
      handleApiSuccess(`${title} ${mode === 'create' ? 'created' : 'updated'} successfully`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error(`${mode} error:`, error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    
    try {
      await apiService.delete(`${endpoint}/${item.id}`);
      handleApiSuccess(`${title} deleted successfully`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field.key] || '';
    const hasError = errors[field.key];
    
    const baseInputClass = `form-input ${hasError ? 'border-red-500 focus:ring-red-500' : ''}`;
    
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={`${baseInputClass} h-24`}
            disabled={loading}
          />
        );
        
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            className={baseInputClass}
            disabled={loading}
          >
            <option value="">Select {field.label}</option>
            {field.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
        
      case 'json':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            placeholder={field.placeholder || 'Enter valid JSON'}
            className={`${baseInputClass} h-32 font-mono text-sm`}
            style={{ fontFamily: 'Monaco, Consolas, "Courier New", monospace' }}
            disabled={loading}
          />
        );
        
      case 'password':
        return (
          <input
            type="password"
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
            disabled={loading}
          />
        );
        
      default:
        return (
          <input
            type={field.type || 'text'}
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
            disabled={loading}
          />
        );
    }
  };

  if (!isOpen) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {mode === 'create' && `Create ${title}`}
                    {mode === 'edit' && `Edit ${title}`}
                    {mode === 'delete' && `Delete ${title}`}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {mode === 'delete' ? (
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-900">
                          Are you sure you want to delete this {title.toLowerCase()}? This action cannot be undone.
                        </p>
                        {item && (
                          <p className="mt-2 text-sm text-gray-600 font-medium">
                            {item.name || item.title || `ID: ${item.id}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-danger disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <LoadingSpinner size="sm" color="white" className="mr-2" />
                            Deleting...
                          </>
                        ) : (
                          'Delete'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {fields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderField(field)}
                        {errors[field.key] && (
                          <p className="mt-1 text-sm text-red-600">{errors[field.key]}</p>
                        )}
                        {field.description && (
                          <p className="mt-1 text-sm text-gray-500">{field.description}</p>
                        )}
                      </div>
                    ))}
                    
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <LoadingSpinner size="sm" color="white" className="mr-2" />
                            {mode === 'create' ? 'Creating...' : 'Updating...'}
                          </>
                        ) : (
                          mode === 'create' ? 'Create' : 'Update'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CrudModal;