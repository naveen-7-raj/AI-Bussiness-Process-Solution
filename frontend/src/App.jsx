import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layout & Auth Pages
import Layout from './components/Layout';
import Landing from './components/Landing';
import Documentation from './components/Documentation';
import Login from './components/Login';
import Register from './components/Register';

// Main Application Pages
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import Inventory from './components/Inventory';
import Warehouses from './components/Warehouses';
import Predictions from './components/Predictions';
import Recommendations from './components/Recommendations';
import LiveEvents from './components/LiveEvents';
import DataIntegration from './components/DataIntegration';
import AIAssistant from './components/AIAssistant';
import Settings from './components/Settings';
import AuditLogs from './components/AuditLogs';
import Admin from './components/Admin';

import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
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
      </Router>
    </AuthProvider>
  );
}

export default App;
