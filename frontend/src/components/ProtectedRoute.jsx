import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false, superAdminOnly = false }) => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const emailStr = (user?.email || '').toString().trim().toLowerCase();
    const roleStr = (user?.role || '').toString().trim().toLowerCase();

    const isSuperAdmin = emailStr === 'naveenramu161@gmail.com' ||
                         ['super_admin', 'superadmin', 'system administrator'].includes(roleStr);

    const isAdmin = isSuperAdmin ||
                    ['admin', 'administrator', 'system admin'].includes(roleStr) || 
                    roleStr.includes('admin');

    if ((superAdminOnly && !isSuperAdmin) || (adminOnly && !isAdmin)) {
        return (
            <div className="card" style={{ margin: '60px auto', maxWidth: '500px', textAlign: 'center', padding: '36px 28px' }}>
                <div style={{
                    width: '52px',
                    height: '52px',
                    margin: '0 auto 16px',
                    borderRadius: '50%',
                    background: 'var(--status-error-bg, rgba(239, 68, 68, 0.12))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--status-error, #dc2626)'
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5:0 0 1 10 0v4"></path>
                    </svg>
                </div>

                <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '4px', background: 'var(--status-error-bg, rgba(239, 68, 68, 0.12))', color: 'var(--status-error, #dc2626)', fontSize: '11px', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.05em' }}>
                    403 FORBIDDEN
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-h)', marginBottom: '8px' }}>
                    Access Denied
                </h2>

                <p style={{ fontSize: '14px', color: 'var(--text-h)', fontWeight: 500, margin: '0 0 4px 0' }}>
                    You don't have permission to access the administrator dashboard.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 24px 0' }}>
                    Administrator privileges are required to view this page.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Link to="/dashboard" className="button button-primary" style={{ fontSize: '13px', padding: '8px 20px' }}>
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
