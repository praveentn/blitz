// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './services/auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import './App.css';

// Import page components - using individual imports to avoid issues
const ModelsPage = React.lazy(() => import('./pages/ModelsPage'));
const PromptsPage = React.lazy(() => import('./pages/PromptsPage').then(module => ({ default: module.PromptsPage })));
const ToolsPage = React.lazy(() => import('./pages/ToolsPage').then(module => ({ default: module.ToolsPage })));
const AgentsPage = React.lazy(() => import('./pages/AgentsPage').then(module => ({ default: module.AgentsPage })));
const WorkflowsPage = React.lazy(() => import('./pages/WorkflowsPage').then(module => ({ default: module.WorkflowsPage })));
const CostTrackerPage = React.lazy(() => import('./pages/CostTrackerPage').then(module => ({ default: module.CostTrackerPage })));
const ExecutionMonitorPage = React.lazy(() => import('./pages/ExecutionMonitorPage').then(module => ({ default: module.ExecutionMonitorPage })));

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
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Public Route Component (redirects to dashboard if logged in)
const PublicRoute = ({ children }) => {
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
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Lazy Loading Wrapper
const LazyWrapper = ({ children }) => (
  <React.Suspense fallback={
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  }>
    {children}
  </React.Suspense>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } 
            />
            
            {/* Protected Routes with Layout */}
            <Route 
              path="/*" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      
                      <Route 
                        path="/models" 
                        element={
                          <LazyWrapper>
                            <ModelsPage />
                          </LazyWrapper>
                        } 
                      />
                      
                      <Route 
                        path="/prompts" 
                        element={
                          <LazyWrapper>
                            <PromptsPage />
                          </LazyWrapper>
                        } 
                      />
                      
                      <Route 
                        path="/tools" 
                        element={
                          <LazyWrapper>
                            <ToolsPage />
                          </LazyWrapper>
                        } 
                      />
                      
                      <Route 
                        path="/agents" 
                        element={
                          <LazyWrapper>
                            <AgentsPage />
                          </LazyWrapper>
                        } 
                      />
                      
                      <Route 
                        path="/workflows" 
                        element={
                          <LazyWrapper>
                            <WorkflowsPage />
                          </LazyWrapper>
                        } 
                      />
                      
                      <Route 
                        path="/executions" 
                        element={
                          <LazyWrapper>
                            <ExecutionMonitorPage />
                          </LazyWrapper>
                        } 
                      />
                      
                      <Route 
                        path="/costs" 
                        element={
                          <LazyWrapper>
                            <CostTrackerPage />
                          </LazyWrapper>
                        } 
                      />
                      
                      {/* Admin Routes */}
                      <Route 
                        path="/admin" 
                        element={
                          <ProtectedRoute adminOnly={true}>
                            <AdminPage />
                          </ProtectedRoute>
                        } 
                      />
                      
                      {/* Default redirect */}
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              } 
            />
          </Routes>
          
          {/* Toast notifications */}
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
      </Router>
    </AuthProvider>
  );
}

export default App;