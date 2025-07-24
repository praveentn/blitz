// src/App.js
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './services/auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import LoadingSpinner from './components/LoadingSpinner';
import './App.css';

// Fixed lazy loading - ensure correct imports and exports
const ModelsPage = React.lazy(() => import('./pages/ModelsPage'));
const PromptsPage = React.lazy(() => import('./pages/PromptsPage'));
const ToolsPage = React.lazy(() => import('./pages/ToolsPage'));
const AgentsPage = React.lazy(() => import('./pages/AgentsPage'));
const WorkflowsPage = React.lazy(() => import('./pages/WorkflowsPage'));
const CostTrackerPage = React.lazy(() => import('./pages/CostTrackerPage'));
const ExecutionMonitorPage = React.lazy(() => import('./pages/ExecutionMonitorPage'));

// Loading wrapper for lazy components
const LazyWrapper = ({ children }) => (
  <Suspense fallback={
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" />
    </div>
  }>
    {children}
  </Suspense>
);

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (adminOnly && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }
  
  return <Layout>{children}</Layout>;
};

// Main App Component
const AppContent = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
      />
      
      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/models" 
        element={
          <ProtectedRoute>
            <LazyWrapper>
              <ModelsPage />
            </LazyWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/prompts" 
        element={
          <ProtectedRoute>
            <LazyWrapper>
              <PromptsPage />
            </LazyWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/tools" 
        element={
          <ProtectedRoute>
            <LazyWrapper>
              <ToolsPage />
            </LazyWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/agents" 
        element={
          <ProtectedRoute>
            <LazyWrapper>
              <AgentsPage />
            </LazyWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/workflows" 
        element={
          <ProtectedRoute>
            <LazyWrapper>
              <WorkflowsPage />
            </LazyWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/executions" 
        element={
          <ProtectedRoute>
            <LazyWrapper>
              <ExecutionMonitorPage />
            </LazyWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/costs" 
        element={
          <ProtectedRoute>
            <LazyWrapper>
              <CostTrackerPage />
            </LazyWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Catch all route */}
      <Route 
        path="*" 
        element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
              <p className="text-gray-600 mb-4">Page not found</p>
              <Navigate to="/dashboard" replace />
            </div>
          </div>
        } 
      />
    </Routes>
  );
};

// Root App component with providers
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <AppContent />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                style: {
                  background: '#10B981',
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: '#EF4444',
                },
              },
            }}
          />
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;