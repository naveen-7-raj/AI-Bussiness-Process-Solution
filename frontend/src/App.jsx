import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layout & Auth Pages
import Layout from './components/Layout';
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

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/warehouses" element={<Warehouses />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/events" element={<LiveEvents />} />
            <Route path="/integration" element={<DataIntegration />} />
            <Route path="/assistant" element={<AIAssistant />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
