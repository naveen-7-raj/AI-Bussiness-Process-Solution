import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layout & Eager Core Pages
import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';

// Lazy Loaded Non-Critical Application Pages
const Orders = lazy(() => import('./components/Orders'));
const Inventory = lazy(() => import('./components/Inventory'));
const Warehouses = lazy(() => import('./components/Warehouses'));
const Predictions = lazy(() => import('./components/Predictions'));
const Recommendations = lazy(() => import('./components/Recommendations'));
const LiveEvents = lazy(() => import('./components/LiveEvents'));
const DataIntegration = lazy(() => import('./components/DataIntegration'));
const AIAssistant = lazy(() => import('./components/AIAssistant'));
const Settings = lazy(() => import('./components/Settings'));
const AuditLogs = lazy(() => import('./components/AuditLogs'));
const Admin = lazy(() => import('./components/Admin'));
const Landing = lazy(() => import('./components/Landing'));
const Documentation = lazy(() => import('./components/Documentation'));

import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const PageLoader = () => (
  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
    <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
    <span style={{ fontSize: '13px' }}>Loading module...</span>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<ErrorBoundary componentName="Dashboard"><Dashboard /></ErrorBoundary>} />
              <Route path="/orders" element={<ErrorBoundary componentName="Orders"><Orders /></ErrorBoundary>} />
              <Route path="/inventory" element={<ErrorBoundary componentName="Inventory"><Inventory /></ErrorBoundary>} />
              <Route path="/warehouses" element={<ErrorBoundary componentName="Warehouses"><Warehouses /></ErrorBoundary>} />
              <Route path="/predictions" element={<ErrorBoundary componentName="Predictions & ML"><Predictions /></ErrorBoundary>} />
              <Route path="/recommendations" element={<ErrorBoundary componentName="Recommendations"><Recommendations /></ErrorBoundary>} />
              <Route path="/events" element={<ErrorBoundary componentName="Live Telemetry"><LiveEvents /></ErrorBoundary>} />
              <Route path="/integration" element={<ErrorBoundary componentName="Data Integration"><DataIntegration /></ErrorBoundary>} />
              <Route path="/assistant" element={<ErrorBoundary componentName="Process Copilot"><AIAssistant /></ErrorBoundary>} />
              <Route path="/settings" element={<ErrorBoundary componentName="Settings"><Settings /></ErrorBoundary>} />
              <Route path="/audit" element={<ErrorBoundary componentName="Audit Logs"><AuditLogs /></ErrorBoundary>} />
              <Route path="/admin" element={<ProtectedRoute adminOnly={true}><ErrorBoundary componentName="Admin Security"><Admin /></ErrorBoundary></ProtectedRoute>} />
            </Route>

            <Route path="/docs" element={<Documentation />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/" element={<Landing />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
