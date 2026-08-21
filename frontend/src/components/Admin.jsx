import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { useWebSocket } from '../hooks/useWebSocket';
import CustomDropdown from './CustomDropdown';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const WAREHOUSE_NAMES = {
    'WH01': 'Chennai Central Warehouse',
    'WH02': 'Coimbatore Distribution Center',
    'WH03': 'Bengaluru South Warehouse',
    'WH04': 'Kochi Regional Warehouse',
    'WH05': 'Hyderabad South Zone Warehouse',
};

const Admin = () => {
    const { token, user } = useAuth();
    const { events: wsEvents } = useWebSocket();
    
    const userEmailStr = (user?.email || '').toLowerCase().trim();
    const userRoleStr = (user?.role || '').toLowerCase().trim();
    const isSuperAdmin = userEmailStr === 'naveenramu161@gmail.com' ||
                         ['super_admin', 'superadmin', 'system administrator'].includes(userRoleStr);
    
    // Fetch real backend data
    const { data: statsData, loading: statsLoading, refresh: refreshStats } = useFetch('/api/admin/stats', token, 15000);
    const { data: usersData, loading: usersLoading, refresh: refreshUsers } = useFetch('/api/users', token, 15000);
    const { data: whData, loading: whLoading } = useFetch('/api/warehouses', token, 15000);
    const { data: recsData } = useFetch('/api/recommendations/live', token, 15000);
    const { data: auditData, loading: auditLoading } = useFetch('/api/audit-logs', token, 15000);
    const { data: healthData } = useFetch('/health', token, 15000);
    const { data: bpiStatsData } = useFetch('/api/stats', token, 15000);
    const { data: requestsData, loading: requestsLoading, refresh: refreshRequests } = useFetch(isSuperAdmin ? '/api/access-requests' : null, token, 15000);
    const { data: rbacAuditData, loading: rbacAuditLoading, refresh: refreshRbacAudit } = useFetch(isSuperAdmin ? '/api/admin/rbac-audit-logs' : null, token, 15000);

    // Auto-refresh upon receiving real-time WebSocket events for role updates or access requests
    useEffect(() => {
        if (!wsEvents || wsEvents.length === 0) return;
        const latest = wsEvents[0];
        if (latest && (latest.event === 'USER_ROLE_UPDATED' || latest.event === 'ACCESS_REQUEST_SUBMITTED' || latest.event === 'ACCESS_REQUEST_DECIDED')) {
            if (refreshUsers) refreshUsers();
            if (refreshRequests) refreshRequests();
            if (refreshRbacAudit) refreshRbacAudit();
            if (refreshStats) refreshStats();
        }
    }, [wsEvents, refreshUsers, refreshRequests, refreshRbacAudit, refreshStats]);

    const [updatingEmail, setUpdatingEmail] = useState(null);
    const [roleForm, setRoleForm] = useState({});
    const [approvalDurations, setApprovalDurations] = useState({});
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('ALL');
    const [auditActionFilter, setAuditActionFilter] = useState('ALL');
    const [feedbackBanner, setFeedbackBanner] = useState(null);
    const [isTriggeringDemo, setIsTriggeringDemo] = useState(false);
    const [confirmRoleModal, setConfirmRoleModal] = useState(null);

    const getRoleLabel = (r) => {
        if (!r) return 'Warehouse Lead';
        const str = String(r).toLowerCase().trim();
        if (str === 'super_admin' || str === 'superadmin' || str === 'system administrator') return 'System Administrator';
        if (str === 'admin' || str === 'administrator' || str === 'regional logistics director') return 'Regional Logistics Director';
        return 'Warehouse Lead';
    };

    const handleApproveRequest = async (requestId, durationDays = 0) => {
        try {
            const res = await fetch(`${API_BASE}/api/access-requests/${requestId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ duration_days: durationDays })
            });
            const data = await res.json();
            if (res.ok) {
                const durText = durationDays > 0 ? `${durationDays}-day temporary` : 'permanent';
                setFeedbackBanner({ type: 'success', text: `✓ Access Request #${requestId} approved (${durText} admin access granted)!` });
                if (refreshRequests) refreshRequests();
                if (refreshUsers) refreshUsers();
                if (refreshRbacAudit) refreshRbacAudit();
            } else {
                setFeedbackBanner({ type: 'error', text: `✕ ${data.detail || 'Approval failed.'}` });
            }
        } catch (e) {
            setFeedbackBanner({ type: 'error', text: '✕ Network error approving access request.' });
        }
    };

    const handleRejectRequest = async (requestId) => {
        try {
            const res = await fetch(`${API_BASE}/api/access-requests/${requestId}/reject`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setFeedbackBanner({ type: 'success', text: `✓ Access Request #${requestId} rejected.` });
                if (refreshRequests) refreshRequests();
                if (refreshRbacAudit) refreshRbacAudit();
            } else {
                setFeedbackBanner({ type: 'error', text: `✕ ${data.detail || 'Rejection failed.'}` });
            }
        } catch (e) {
            setFeedbackBanner({ type: 'error', text: '✕ Network error rejecting access request.' });
        }
    };

    // Trigger Super Admin test risk event
    const handleTriggerDemoRisk = async () => {
        setIsTriggeringDemo(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/trigger-demo-risk`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setFeedbackBanner({ type: 'success', text: `✨ ${data.message}` });
                setTimeout(() => setFeedbackBanner(null), 5000);
                refreshStats();
            } else {
                const err = await res.json();
                setFeedbackBanner({ type: 'error', text: err.detail || 'Failed to trigger demo event.' });
            }
        } catch (e) {
            setFeedbackBanner({ type: 'error', text: 'Network error triggering demo event.' });
        } finally {
            setIsTriggeringDemo(false);
        }
    };

    // Execute backend role update
    const executeUserUpdate = async (email, newRole, newFacility, newActive, newDuration) => {
        try {
            const res = await fetch(`${API_BASE}/api/users/role`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: email,
                    role: newRole,
                    assigned_facility: newFacility,
                    assigned_region: 'ALL',
                    is_active: newActive,
                    duration_days: newDuration
                })
            });

            if (res.ok) {
                setUpdatingEmail(null);
                setRoleForm({});
                setFeedbackBanner({ type: 'success', text: `✓ Permissions updated successfully for ${email}.` });
                setTimeout(() => setFeedbackBanner(null), 4000);
                if (refreshUsers) refreshUsers();
                if (refreshRbacAudit) refreshRbacAudit();
                if (refreshStats) refreshStats();
            } else {
                const err = await res.json();
                setFeedbackBanner({ type: 'error', text: `✕ ${err.detail || 'Failed to update user permissions.'}` });
            }
        } catch (e) {
            setFeedbackBanner({ type: 'error', text: '✕ Network error updating user permissions.' });
        }
    };

    // Prompt confirmation modal if role is changed, otherwise execute update immediately
    const handleUpdateUser = (email, currentRole, defaultFacility, defaultActive) => {
        const newRole = roleForm.role !== undefined ? roleForm.role : currentRole;
        const newFacility = roleForm.facility !== undefined ? roleForm.facility : (defaultFacility || 'ALL');
        const newActive = roleForm.is_active !== undefined ? roleForm.is_active : (defaultActive !== false);
        const newDuration = roleForm.duration_days !== undefined ? parseInt(roleForm.duration_days) : 0;

        const normCurrent = ['super_admin', 'admin', 'user'].includes(currentRole) ? currentRole : (currentRole === 'System Administrator' ? 'super_admin' : (currentRole === 'Regional Logistics Director' ? 'admin' : 'user'));
        const normNew = ['super_admin', 'admin', 'user'].includes(newRole) ? newRole : (newRole === 'System Administrator' ? 'super_admin' : (newRole === 'Regional Logistics Director' ? 'admin' : 'user'));

        if (normNew !== normCurrent) {
            setConfirmRoleModal({
                userEmail: email,
                currentRoleRaw: normCurrent,
                newRoleRaw: normNew,
                facility: newFacility,
                isActive: newActive,
                durationDays: newDuration
            });
        } else {
            executeUserUpdate(email, normNew, newFacility, newActive, newDuration);
        }
    };

    // Export Audit Logs to CSV
    const exportAuditCSV = () => {
        const logs = auditData?.audit_logs || [];
        if (!logs.length) return;

        const headers = ['ID', 'Timestamp', 'User Email', 'User Role', 'Action', 'Details'];
        const rows = logs.map(l => [
            l.id,
            l.timestamp ? new Date(l.timestamp).toISOString() : '',
            `"${l.user_email || ''}"`,
            `"${l.user_role || ''}"`,
            `"${l.action || ''}"`,
            `"${typeof l.details === 'object' ? (l.details.message || JSON.stringify(l.details)).replace(/"/g, '""') : String(l.details || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `nexora_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const users = usersData?.users || [];
    const warehouses = whData?.warehouses || [];
    const auditLogs = auditData?.audit_logs || [];
    const activeRecsCount = recsData?.live_recommendations?.filter(r => r.status === 'ACTIVE' || r.status === 'IN_PROGRESS')?.length || 0;

    // Filter Users
    const filteredUsers = users.filter(u => {
        const matchesQuery = (u.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                             (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase());
        const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
        return matchesQuery && matchesRole;
    });

    // Filter Audit Logs
    const filteredAuditLogs = auditLogs.filter(log => {
        if (auditActionFilter === 'ALL') return true;
        return log.action === auditActionFilter;
    });

    return (
        <div style={{ padding: '0 0 40px 0' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-h)', margin: 0 }}>
                            {isSuperAdmin ? 'Super Admin Security & Governance' : 'Admin Operational Oversight'}
                        </h1>
                        <span className={`badge ${isSuperAdmin ? 'error' : 'info'}`} style={{ fontSize: '11px' }}>
                            {isSuperAdmin ? '★ Super Admin (Full Control)' : '● Admin (Operational View)'}
                        </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                        {isSuperAdmin
                            ? 'Full administrative platform control, user role management, system health, and security governance.'
                            : 'Operational metrics monitoring, system telemetry oversight, and audit trail verification.'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {isSuperAdmin && (
                        <button
                            className="button button-primary"
                            onClick={handleTriggerDemoRisk}
                            disabled={isTriggeringDemo}
                            style={{ fontSize: '12px', padding: '6px 12px', background: 'var(--status-error, #dc2626)', borderColor: 'var(--status-error, #dc2626)' }}
                        >
                            {isTriggeringDemo ? '⌛ Dispatching...' : '⚡ Trigger Test Risk Alert'}
                        </button>
                    )}
                    <button className="button button-secondary" onClick={() => { refreshStats(); refreshUsers(); }} style={{ fontSize: '12px', padding: '6px 12px' }}>
                        ⟳ Refresh Directory
                    </button>
                </div>
            </div>

            {/* Inline Notification Banner */}
            {feedbackBanner && (
                <div style={{
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    marginBottom: '16px',
                    fontSize: '13px',
                    fontWeight: 500,
                    background: feedbackBanner.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-error-bg)',
                    color: feedbackBanner.type === 'success' ? 'var(--status-success)' : 'var(--status-error)',
                    border: `1px solid ${feedbackBanner.type === 'success' ? 'var(--status-success)' : 'var(--status-error)'}`
                }}>
                    {feedbackBanner.text}
                </div>
            )}

            {/* Section 1: Overview Cards */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="card stat-card">
                    <div className="stat-label">Total Users</div>
                    <div className="stat-value">{statsLoading ? '...' : (statsData?.total_users || users.length)}</div>
                    <div className="stat-desc">Registered operational identities</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-label">Active Users</div>
                    <div className="stat-value">{usersLoading ? '...' : users.filter(u => u.role).length}</div>
                    <div className="stat-desc">Authenticated System Accounts</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-label">Facilities</div>
                    <div className="stat-value">{whLoading ? '...' : warehouses.length}</div>
                    <div className="stat-desc">Regional logistics hubs</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-label">Active Recommendations</div>
                    <div className="stat-value" style={{ color: activeRecsCount > 0 ? 'var(--brand-blue, #0284c7)' : 'var(--text-h)' }}>
                        {activeRecsCount}
                    </div>
                    <div className="stat-desc">Pending operational transfers</div>
                </div>
            </div>

            {/* Platform Health & System Observability */}
            <div className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span>End-to-End Pipeline Observability & AI Engine Status</span>
                    <span className="badge success" style={{ fontSize: '11px' }}>
                        ● {healthData?.status === 'ok' ? 'System Operational' : 'Degraded'}
                    </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
                    <div style={{ padding: '12px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Event Ingestion Stream</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--status-success)', marginTop: '4px' }}>
                            Kafka Replay (UCI Retail II)
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>1.07M Real Transactions</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. API & Data Store</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--status-success)', marginTop: '4px' }}>
                            {healthData?.db_status === 'connected' ? 'FastAPI + Postgres (app_db)' : 'Connecting...'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Asyncpg Pool Connected</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>3. AI Model & SHAP</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--status-success)', marginTop: '4px' }}>
                            XGBoost Regressor (99.83%)
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>TreeExplainer Active</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>4. WebSockets & Audit Trail</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--status-success)', marginTop: '4px' }}>
                            {statsData?.active_ws_connections !== undefined ? `${statsData.active_ws_connections} Live Client(s)` : 'Live Broadcaster'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {statsData?.total_audit_logs || auditLogs.length} Total Audit Records
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Process Intelligence & Risk Operations Summary */}
            <div className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span>AI Process Intelligence & Risk Operations Summary</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Powered by XGBoost + SHAP TreeExplainer Engine
                    </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <div style={{ padding: '12px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>High Risk Anomalies</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--status-error, #dc2626)', marginTop: '4px' }}>
                            {recsData?.live_recommendations?.filter(r => r.risk === 'HIGH').length || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Critical delay probability</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In-Progress Actions</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--status-warning, #d97706)', marginTop: '4px' }}>
                            {recsData?.live_recommendations?.filter(r => r.status === 'IN_PROGRESS').length || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Dispatched transfer tasks</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolved Incidents</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--status-success, #16a34a)', marginTop: '4px' }}>
                            {recsData?.live_recommendations?.filter(r => r.status === 'RESOLVED').length || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Optimized process fixes</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Order Delay MAE</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)', marginTop: '4px' }}>
                            1.597 min
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Real UCI test performance</div>
                    </div>
                </div>
            </div>

            {/* All Roles Component */}
            <div className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
                <div style={{ paddingBottom: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-h)', margin: 0 }}>
                            All Roles
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                            Manage and monitor user roles across the NEXORA platform.
                        </p>
                    </div>
                    <span className="badge info" style={{ fontSize: '11px' }}>
                        3 Active Role Tiers
                    </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {/* Role 1: System Administrator */}
                    <div style={{ padding: '16px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)' }}>System Administrator</div>
                                <span className="badge error" style={{ fontSize: '10px' }}>Level 1 Access</span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                                Full system control, administrative governance, user role modification, and security audit logs.
                            </p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle, #f4f4f5)' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Assigned Users</span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-h)' }}>
                                {users.filter(u => u.role === 'super_admin' || u.role === 'superadmin' || u.role === 'System Administrator' || (u.email || '').toLowerCase().trim() === 'naveenramu161@gmail.com').length}
                            </span>
                        </div>
                    </div>

                    {/* Role 2: Regional Logistics Director */}
                    <div style={{ padding: '16px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)' }}>Regional Logistics Director</div>
                                <span className="badge info" style={{ fontSize: '10px' }}>Level 2 Access</span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                                Regional warehouse network oversight, AI risk monitoring, and operational transfer authorizations.
                            </p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle, #f4f4f5)' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Assigned Users</span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-h)' }}>
                                {users.filter(u => (u.role === 'admin' || u.role === 'administrator' || u.role === 'Regional Logistics Director') && (u.email || '').toLowerCase().trim() !== 'naveenramu161@gmail.com').length}
                            </span>
                        </div>
                    </div>

                    {/* Role 3: Warehouse Lead */}
                    <div style={{ padding: '16px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)' }}>Warehouse Lead</div>
                                <span className="badge warning" style={{ fontSize: '10px' }}>Level 3 Access</span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                                Facility-specific backlog management, order fulfillment tracking, and local stock updates.
                            </p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle, #f4f4f5)' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Assigned Users</span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-h)' }}>
                                {users.filter(u => !['super_admin', 'superadmin', 'System Administrator', 'admin', 'administrator', 'Regional Logistics Director'].includes(u.role) && (u.email || '').toLowerCase().trim() !== 'naveenramu161@gmail.com').length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: User Management Table */}
            <div className="card table-container" style={{ marginBottom: '24px', padding: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)' }}>
                        User Authorization & Role Directory ({filteredUsers.length} of {users.length})
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Search name or email..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px', width: '180px' }}
                        />
                        <CustomDropdown
                            value={userRoleFilter}
                            onChange={(val) => setUserRoleFilter(val)}
                            options={[
                                { value: 'ALL', label: 'All Roles' },
                                { value: 'System Administrator', label: 'System Administrator' },
                                { value: 'Regional Logistics Director', label: 'Regional Director' },
                                { value: 'Warehouse Lead', label: 'Warehouse Lead' }
                            ]}
                        />
                    </div>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Assigned Facilities</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usersLoading ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>Loading user directory...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>No users match search filters.</td></tr>
                        ) : (
                            filteredUsers.map((u) => {
                                const isEditing = updatingEmail === u.email;
                                return (
                                    <tr key={u.id || u.email}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-h)' }}>{u.name}</td>
                                        <td style={{ fontFamily: 'var(--mono, monospace)', fontSize: '12px' }}>{u.email}</td>
                                        <td>
                                            {isEditing ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <CustomDropdown
                                                        value={roleForm.role !== undefined ? roleForm.role : (['super_admin', 'admin', 'user'].includes(u.role) ? u.role : (u.role === 'System Administrator' ? 'super_admin' : 'user'))}
                                                        onChange={(val) => setRoleForm(prev => ({ ...prev, role: val }))}
                                                        options={[
                                                            { value: 'user', label: 'user' },
                                                            { value: 'admin', label: 'admin' },
                                                            { value: 'super_admin', label: 'super_admin' }
                                                        ]}
                                                    />
                                                    {(roleForm.role === 'admin' || (roleForm.role === undefined && u.role === 'admin')) && (
                                                        <CustomDropdown
                                                            value={roleForm.duration_days !== undefined ? String(roleForm.duration_days) : '0'}
                                                            onChange={(val) => setRoleForm(prev => ({ ...prev, duration_days: parseInt(val) }))}
                                                            options={[
                                                                { value: '0', label: 'Duration: Permanent' },
                                                                { value: '1', label: 'Duration: 1 Day' },
                                                                { value: '7', label: 'Duration: 7 Days' },
                                                                { value: '30', label: 'Duration: 30 Days' }
                                                            ]}
                                                        />
                                                    )}
                                                </div>
                                            ) : (
                                                <div>
                                                    <span className={`badge ${u.role === 'super_admin' || u.role === 'System Administrator' ? 'error' : (u.role === 'admin' || u.role === 'administrator' ? 'info' : 'warning')}`} style={{ fontSize: '11px' }}>
                                                        {u.role}
                                                    </span>
                                                    {u.access_expires_at ? (
                                                        <div style={{ fontSize: '10px', color: '#d97706', marginTop: '3px', fontWeight: 500 }}>
                                                            Expires: {new Date(u.access_expires_at).toLocaleDateString()}
                                                        </div>
                                                    ) : u.role === 'admin' ? (
                                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                                                            Access: Permanent
                                                        </div>
                                                    ) : null}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    defaultValue={u.assigned_facility || 'ALL'}
                                                    placeholder="e.g. WH01 or WH01,WH03 or ALL"
                                                    onChange={(e) => setRoleForm(prev => ({ ...prev, facility: e.target.value }))}
                                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px', width: '130px' }}
                                                />
                                            ) : (
                                                <span style={{ fontSize: '12px', color: 'var(--text)' }}>
                                                    {u.assigned_facility === 'ALL' ? 'ALL Facilities (Global)' : (WAREHOUSE_NAMES[u.assigned_facility] || u.assigned_facility || 'ALL')}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <CustomDropdown
                                                    value={roleForm.is_active !== undefined ? (roleForm.is_active ? 'true' : 'false') : (u.is_active !== false ? 'true' : 'false')}
                                                    onChange={(val) => setRoleForm(prev => ({ ...prev, is_active: val === 'true' }))}
                                                    options={[
                                                        { value: 'true', label: 'Active' },
                                                        { value: 'false', label: 'Deactivated' }
                                                    ]}
                                                />
                                            ) : (
                                                <span className={`badge ${u.is_active !== false ? 'success' : 'error'}`} style={{ fontSize: '10px' }}>
                                                    {u.is_active !== false ? 'Active' : 'Deactivated'}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {isEditing ? (
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        className="button button-primary"
                                                        onClick={() => {
                                                            const fallbackRole = ['super_admin', 'admin', 'user'].includes(u.role) ? u.role : (u.role === 'System Administrator' ? 'super_admin' : 'user');
                                                            handleUpdateUser(u.email, roleForm.role !== undefined ? roleForm.role : fallbackRole, roleForm.facility !== undefined ? roleForm.facility : u.assigned_facility, roleForm.is_active !== undefined ? roleForm.is_active : (u.is_active !== false));
                                                        }}
                                                        style={{ fontSize: '11px', padding: '4px 8px' }}
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        className="button button-secondary"
                                                        onClick={() => { setUpdatingEmail(null); setRoleForm({}); }}
                                                        style={{ fontSize: '11px', padding: '4px 8px' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : isSuperAdmin ? (
                                                <button
                                                    className="button button-secondary"
                                                    onClick={() => {
                                                        const normRole = ['super_admin', 'admin', 'user'].includes(u.role) ? u.role : (u.role === 'System Administrator' ? 'super_admin' : 'user');
                                                        setUpdatingEmail(u.email);
                                                        setRoleForm({ role: normRole, facility: u.assigned_facility || 'ALL', is_active: u.is_active !== false, duration_days: u.access_expires_at ? 7 : 0 });
                                                    }}
                                                    style={{ fontSize: '11px', padding: '4px 8px' }}
                                                >
                                                    Edit Access
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                    Read Only
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Super Admin Access Requests Section */}
            {isSuperAdmin && (
                <div className="card table-container" style={{ marginBottom: '24px', padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)' }}>
                                Admin Access Requests Review
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Review pending access requests submitted by standard users
                            </div>
                        </div>
                        <span className="badge warning" style={{ fontSize: '11px' }}>
                            Pending: {(requestsData?.access_requests || []).filter(r => r.status === 'pending').length}
                        </span>
                    </div>

                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Req #</th>
                                <th>User Email</th>
                                <th>Requested Access</th>
                                <th>Justification Reason</th>
                                <th>Submitted Date</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requestsLoading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>Loading access requests...</td></tr>
                            ) : (requestsData?.access_requests || []).length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No access requests submitted yet.</td></tr>
                            ) : (
                                (requestsData?.access_requests || []).map((req) => (
                                    <tr key={req.id}>
                                        <td style={{ fontWeight: 600, fontFamily: 'var(--mono, monospace)' }}>#{req.id}</td>
                                        <td style={{ fontFamily: 'var(--mono, monospace)', fontSize: '12px' }}>{req.user_email}</td>
                                        <td>
                                            <span className="badge info" style={{ fontSize: '10px' }}>{req.requested_role}</span>
                                        </td>
                                        <td style={{ fontSize: '12px', maxWidth: '300px', whiteSpace: 'normal' }}>
                                            {req.reason}
                                        </td>
                                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {req.created_at ? new Date(req.created_at).toLocaleString() : '—'}
                                        </td>
                                        <td>
                                            <span className={`badge ${req.status === 'pending' ? 'warning' : (req.status === 'approved' ? 'success' : 'error')}`} style={{ fontSize: '10px' }}>
                                                {req.status?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {req.status === 'pending' ? (
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                    <CustomDropdown
                                                        value={approvalDurations[req.id] !== undefined ? String(approvalDurations[req.id]) : '0'}
                                                        onChange={(val) => setApprovalDurations(prev => ({ ...prev, [req.id]: parseInt(val) }))}
                                                        options={[
                                                            { value: '0', label: 'Permanent' },
                                                            { value: '1', label: '1 Day' },
                                                            { value: '7', label: '7 Days' },
                                                            { value: '30', label: '30 Days' }
                                                        ]}
                                                    />
                                                    <button
                                                        className="button button-primary"
                                                        onClick={() => handleApproveRequest(req.id, approvalDurations[req.id] || 0)}
                                                        style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: 'var(--status-success, #10b981)' }}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="button button-secondary"
                                                        onClick={() => handleRejectRequest(req.id)}
                                                        style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: 'var(--status-error, #ef4444)', color: '#fff' }}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Decided</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Section 3: Facilities Overview */}
            <div className="card table-container" style={{ marginBottom: '24px', padding: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)' }}>
                        Registered Logistics Facilities ({warehouses.length})
                    </div>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Facility ID</th>
                            <th>Facility Name</th>
                            <th>Backlog Queue</th>
                            <th>Avg Processing Time</th>
                            <th>Status Tier</th>
                        </tr>
                    </thead>
                    <tbody>
                        {whLoading ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>Loading facilities...</td></tr>
                        ) : warehouses.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>No facilities registered.</td></tr>
                        ) : (
                            warehouses.map((wh) => (
                                <tr key={wh.warehouse_id}>
                                    <td style={{ fontWeight: 600, fontFamily: 'var(--mono, monospace)' }}>{wh.warehouse_id}</td>
                                    <td style={{ fontWeight: 500 }}>{WAREHOUSE_NAMES[wh.warehouse_id] || wh.name || wh.warehouse_id}</td>
                                    <td>{wh.backlog_orders || 0} orders</td>
                                    <td>{wh.avg_processing_time_sec ? `${wh.avg_processing_time_sec}s` : '2.5s'}</td>
                                    <td>
                                        <span className={`badge ${wh.status === 'OVERLOADED' ? 'error' : 'success'}`} style={{ fontSize: '10px' }}>
                                            {wh.status || 'NORMAL'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Section 4: Recent Admin Activity */}
            <div className="card table-container" style={{ padding: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)' }}>
                        Recent Admin Activity & Security Log
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <CustomDropdown
                            value={auditActionFilter}
                            onChange={(val) => setAuditActionFilter(val)}
                            options={[
                                { value: 'ALL', label: 'All Actions' },
                                { value: 'ADMIN_ACCESS', label: 'ADMIN_ACCESS' },
                                { value: 'ROLE_UPDATE', label: 'ROLE_UPDATE' },
                                { value: 'FACILITY_UPDATE', label: 'FACILITY_UPDATE' },
                                { value: 'USER_STATUS_UPDATE', label: 'USER_STATUS_UPDATE' }
                            ]}
                        />
                        <button
                            className="button button-secondary"
                            onClick={exportAuditCSV}
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                            Export CSV
                        </button>
                    </div>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>User</th>
                            <th>Action</th>
                            <th>Role / Scope</th>
                            <th>Event Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {auditLoading ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>Loading activity logs...</td></tr>
                        ) : filteredAuditLogs.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>No audit logs match selected action filter.</td></tr>
                        ) : (
                            filteredAuditLogs.slice(0, 15).map((log) => (
                                <tr key={log.id}>
                                    <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                                    </td>
                                    <td style={{ fontWeight: 500, fontSize: '12px' }}>{log.user_email || log.user_name}</td>
                                    <td>
                                        <span className={`badge ${log.action?.includes('ADMIN') ? 'info' : (log.action?.includes('ROLE') ? 'warning' : 'neutral')}`} style={{ fontSize: '10px' }}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '12px' }}>{log.user_role}</td>
                                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {typeof log.details === 'object' ? (log.details.message || JSON.stringify(log.details)) : String(log.details)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Section 5: Access Governance Audit Log */}
            {isSuperAdmin && (
                <div className="card table-container" style={{ marginBottom: '24px', padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)' }}>
                                Access Governance Audit Log
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Immutable historical audit records for RBAC, access requests, approvals, and role updates
                            </div>
                        </div>
                        <span className="badge info" style={{ fontSize: '11px' }}>
                            Total Events: {(rbacAuditData?.rbac_audit_logs || []).length}
                        </span>
                    </div>

                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date / Time</th>
                                <th>Actor</th>
                                <th>Target User</th>
                                <th>Action</th>
                                <th>Old Role</th>
                                <th>New Role</th>
                                <th>Reason / Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rbacAuditLoading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>Loading governance audit logs...</td></tr>
                            ) : (rbacAuditData?.rbac_audit_logs || []).length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No RBAC governance audit records found.</td></tr>
                            ) : (
                                (rbacAuditData?.rbac_audit_logs || []).map((log) => (
                                    <tr key={log.id}>
                                        <td style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                                        </td>
                                        <td style={{ fontFamily: 'var(--mono, monospace)', fontSize: '12px', fontWeight: 500 }}>
                                            {log.actor_email}
                                        </td>
                                        <td style={{ fontFamily: 'var(--mono, monospace)', fontSize: '12px' }}>
                                            {log.target_email}
                                        </td>
                                        <td>
                                            <span className={`badge ${log.action === 'ADMIN_ACCESS_APPROVED' ? 'success' : (log.action === 'ADMIN_ACCESS_REJECTED' ? 'error' : (log.action === 'USER_REQUESTED_ACCESS' ? 'warning' : 'info'))}`} style={{ fontSize: '10px' }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '11px' }}>
                                            <span className="badge neutral" style={{ fontSize: '10px' }}>{log.old_role || '—'}</span>
                                        </td>
                                        <td style={{ fontSize: '11px' }}>
                                            <span className="badge info" style={{ fontSize: '10px' }}>{log.new_role || '—'}</span>
                                        </td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '280px', whiteSpace: 'normal' }}>
                                            {log.reason || '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Role Change Confirmation Modal */}
            {confirmRoleModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '420px', maxWidth: '90%', padding: '24px', background: 'var(--bg-card, #ffffff)', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-h)', marginTop: 0, marginBottom: '16px' }}>
                            Change User Role?
                        </h3>
                        
                        <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '16px' }}>
                            <strong>User:</strong> <span style={{ fontFamily: 'var(--mono, monospace)' }}>{confirmRoleModal.userEmail}</span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', padding: '14px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Role</div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-h)', marginTop: '4px' }}>
                                    {getRoleLabel(confirmRoleModal.currentRoleRaw)}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    ({confirmRoleModal.currentRoleRaw})
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Role</div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-blue, #0284c7)', marginTop: '4px' }}>
                                    {getRoleLabel(confirmRoleModal.newRoleRaw)}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--brand-blue, #0284c7)', marginTop: '2px' }}>
                                    ({confirmRoleModal.newRoleRaw})
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                className="button button-secondary"
                                onClick={() => setConfirmRoleModal(null)}
                                style={{ fontSize: '12px', padding: '6px 14px' }}
                            >
                                Cancel
                            </button>
                            <button
                                className="button button-primary"
                                onClick={async () => {
                                    const targetData = confirmRoleModal;
                                    setConfirmRoleModal(null);
                                    await executeUserUpdate(targetData.userEmail, targetData.newRoleRaw, targetData.facility, targetData.isActive, targetData.durationDays);
                                }}
                                style={{ fontSize: '12px', padding: '6px 14px' }}
                            >
                                Confirm Change
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
