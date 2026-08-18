import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const navItems = [
    { path: '/dashboard', label: '📊 Dashboard' },
    { path: '/orders', label: '📦 Orders' },
    { path: '/inventory', label: '🗃️ Inventory' },
    { path: '/warehouses', label: '🏢 Warehouses' },
    { path: '/predictions', label: '📈 Predictions' },
    { path: '/recommendations', label: '💡 Recommendations' },
    { path: '/events', label: '⚡ Live Stream' },
    { path: '/integration', label: '🔌 Integrations' },
    { path: '/assistant', label: '💬 Process Copilot' },
    { path: '/settings', label: '⚙️ Settings' },
  ];

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9 }}
          onClick={toggleSidebar}
        ></div>
      )}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>AI-BPI</h2>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setIsSidebarOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={logout} style={{ width: '100%', backgroundColor: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              className="menu-btn" 
              onClick={toggleSidebar}
              style={{ display: 'none', background: 'none', color: 'var(--text)', padding: '4px' }}
            >
              ☰
            </button>
            <h3 style={{ margin: 0 }}>Enterprise Analytics</h3>
          </div>
          <div>
            <span className="badge info">System Active</span>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
