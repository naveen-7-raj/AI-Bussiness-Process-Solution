import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { filterByTimeRange } from '../utils/dateFilters';
import CustomDropdown from './CustomDropdown';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const ACTION_BADGES = {
    'START_ACTION': 'warning',
    'MARK_RESOLVED': 'success',
    'VERIFY_TELEMETRY': 'info',
    'REOPEN_TASK': 'error',
    'RESET_STATUS': 'neutral',
    'ROLE_UPDATE': 'warning',
};

const ROLE_COLORS = {
    'System Administrator': 'var(--status-error)',
    'Regional Logistics Director': 'var(--accent)',
    'Warehouse Lead': 'var(--status-warning)',
};

const TIME_RANGE_OPTIONS = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 3 Months' },
    { value: '365d', label: 'Last 12 Months' },
    { value: 'all', label: 'All Time' },
];

const SORT_OPTIONS = [
    { value: 'desc', label: 'Newest First' },
    { value: 'asc', label: 'Oldest First' },
];

const AuditLogs = () => {
    const { token, user } = useAuth();
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [timeRange, setTimeRange] = useState('7d');
    const [sortOrder, setSortOrder] = useState('desc');

    // Role Management Modal/Panel state for Admin
    const [targetEmail, setTargetEmail] = useState('');
    const [targetRole, setTargetRole] = useState('Regional Logistics Director');
    const [roleUpdating, setRoleUpdating] = useState(false);
    const [roleMessage, setRoleMessage] = useState(null);

    const fetchAuditLogs = useCallback(async () => {
        const authToken = token || localStorage.getItem('token');
        if (!authToken) return;
        try {
            const res = await fetch(`${API_BASE}/api/audit-logs`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setAuditLogs(data.audit_logs || []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchAuditLogs();
        const interval = setInterval(fetchAuditLogs, 15000);
        return () => clearInterval(interval);
    }, [fetchAuditLogs]);

    const handleRoleUpdate = async (e) => {
        e.preventDefault();
        if (!targetEmail.trim()) return;
        setRoleUpdating(true);
        setRoleMessage(null);
        try {
            const res = await fetch(`${API_BASE}/api/users/role`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token || localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ email: targetEmail.trim(), role: targetRole }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
            setRoleMessage({ type: 'success', text: `✓ ${data.message}` });
            setTargetEmail('');
            await fetchAuditLogs();
        } catch (err) {
            setRoleMessage({ type: 'error', text: `✕ ${err.message}` });
        } finally {
            setRoleUpdating(false);
        }
    };

    const filteredLogs = auditLogs.filter(log => {
        const matchesTimeRange = filterByTimeRange(log.timestamp, timeRange);
        if (!matchesTimeRange) return false;
        const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
        if (!matchesAction) return false;
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
            (log.user_email || '').toLowerCase().includes(q) ||
            (log.user_name || '').toLowerCase().includes(q) ||
            (log.facility_id || '').toLowerCase().includes(q) ||
            (log.action || '').toLowerCase().includes(q)
        );
    });

    const sortedLogs = [...filteredLogs].sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        const validA = !isNaN(timeA) ? timeA : 0;
        const validB = !isNaN(timeB) ? timeB : 0;
        return sortOrder === 'desc' ? validB - validA : validA - validB;
    });

    const isSystemAdmin = user?.role === 'System Administrator' || user?.role === 'Regional Logistics Director';

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Enterprise Audit Trail & Role Management</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text)', opacity: 0.7 }}>
                        Append-only immutable operational action records • Compliant with SOC2 audit standards
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span className="badge info" style={{ fontSize: '12px' }}>
                        Current Role: {user?.role || 'Regional Logistics Director'}
                    </span>
                    <button onClick={fetchAuditLogs} className="btn-secondary" style={{ fontSize: '12px' }}>
                        ⟳ Refresh Log
                    </button>
                </div>
            </div>

            {/* Role Management Panel for Admins & Directors */}
            {isSystemAdmin && (
                <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--accent)' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Role-Based Access Control (RBAC) Management</h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text)', opacity: 0.7 }}>
                        Assign enterprise roles to operators. Permissions are enforced on both frontend controls and backend APIs.
                    </p>

                    {roleMessage && (
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '14px',
                            fontSize: '13px',
                            backgroundColor: roleMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: roleMessage.type === 'success' ? 'var(--status-success)' : 'var(--status-error)',
                            border: `1px solid ${roleMessage.type === 'success' ? 'var(--status-success)' : 'var(--status-error)'}`
                        }}>
                            {roleMessage.text}
                        </div>
                    )}

                    <form onSubmit={handleRoleUpdate} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                            type="email"
                            placeholder="Operator email (e.g. operator@nexora.ai)"
                            value={targetEmail}
                            onChange={(e) => setTargetEmail(e.target.value)}
                            aria-label="Operator email address"
                            required
                            style={{ flex: 1, minWidth: '220px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-h)' }}
                        />
                        <CustomDropdown
                            id="audit-role-select-dropdown"
                            value={targetRole}
                            onChange={(val) => setTargetRole(val)}
                            options={[
                                { value: 'Warehouse Lead', label: 'Warehouse Lead' },
                                { value: 'Regional Logistics Director', label: 'Regional Logistics Director' },
                                { value: 'System Administrator', label: 'System Administrator' }
                            ]}
                        />
                        <button type="submit" disabled={roleUpdating} style={{ padding: '8px 16px', fontSize: '12px' }}>
                            {roleUpdating ? 'Updating…' : 'Update User Role'}
                        </button>
                    </form>
                </div>
            )}

            {/* Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
                    <input
                        type="text"
                        placeholder="Search by operator, facility, or action…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="Search audit logs"
                        style={{
                            padding: '8px 14px',
                            width: '260px',
                            maxWidth: '100%',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-h)',
                            fontSize: '13px'
                        }}
                    />

                    <CustomDropdown
                        id="audit-timerange-dropdown"
                        label="Time Range:"
                        options={TIME_RANGE_OPTIONS}
                        value={timeRange}
                        onChange={setTimeRange}
                    />

                    <CustomDropdown
                        id="audit-sort-dropdown"
                        label="Sort: Timestamp"
                        options={SORT_OPTIONS}
                        value={sortOrder}
                        onChange={setSortOrder}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['ALL', 'START_ACTION', 'MARK_RESOLVED', 'VERIFY_TELEMETRY', 'ROLE_UPDATE'].map(act => (
                        <button
                            key={act}
                            onClick={() => setActionFilter(act)}
                            style={{
                                background: actionFilter === act ? 'var(--text)' : 'var(--bg-surface)',
                                color: actionFilter === act ? 'var(--bg)' : 'var(--text)',
                                border: `1px solid ${actionFilter === act ? 'var(--text)' : 'var(--border)'}`,
                                padding: '5px 12px',
                                fontSize: '11px',
                                borderRadius: '14px',
                                cursor: 'pointer',
                            }}
                        >
                            {act.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Audit Logs Table */}
            <div className="card" style={{ padding: 0 }}>
                <div className="table-container" style={{ margin: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Operator</th>
                                <th>Role</th>
                                <th>Action</th>
                                <th>Facility</th>
                                <th>Status Transition</th>
                                <th>Operational Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                        Loading append-only audit trail…
                                    </td>
                                </tr>
                            )}
                            {error && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--status-error)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <div>✕ Unable to load audit logs ({error}). Please try again.</div>
                                            <button
                                                onClick={() => { setLoading(true); setError(null); fetchAuditLogs(); }}
                                                className="btn-secondary"
                                                style={{ fontSize: '12px', padding: '5px 12px' }}
                                            >
                                                ↻ Retry Audit Log Fetch
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && !error && sortedLogs.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                        No audit log entries match the current query.
                                    </td>
                                </tr>
                            )}
                            {!loading && !error && sortedLogs.map((log) => {
                                const details = log.details || {};
                                return (
                                    <tr key={log.id}>
                                        <td style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                                        </td>
                                        <td>
                                            <strong style={{ color: 'var(--text-h)', fontSize: '13px' }}>{log.user_name || 'Operator'}</strong>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                                                {log.user_email}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                                border: `1px solid ${ROLE_COLORS[log.user_role] || 'var(--border)'}`,
                                                color: ROLE_COLORS[log.user_role] || 'var(--text)',
                                                fontWeight: 600,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {log.user_role || 'Warehouse Lead'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${ACTION_BADGES[log.action] || 'info'}`} style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--text-h)' }}>
                                            {log.facility_id || '—'}
                                        </td>
                                        <td>
                                            {log.previous_status && log.new_status ? (
                                                <div style={{ fontSize: '12px', fontFamily: 'var(--mono)' }}>
                                                    <span style={{ opacity: 0.6 }}>{log.previous_status}</span>
                                                    <span style={{ margin: '0 6px', color: 'var(--accent)' }}>→</span>
                                                    <strong>{log.new_status}</strong>
                                                </div>
                                            ) : (
                                                <span style={{ opacity: 0.6 }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '12px', color: 'var(--text)' }}>
                                            {details.recommended_action ? (
                                                <div>
                                                    <div style={{ fontWeight: 500, color: 'var(--text-h)' }}>{details.recommended_action}</div>
                                                    {details.source_warehouse && details.target_warehouse && (
                                                        <div style={{ fontSize: '11px', opacity: 0.7, fontFamily: 'var(--mono)' }}>
                                                            Transfer {details.quantity || ''} units ({details.source_warehouse} → {details.target_warehouse})
                                                        </div>
                                                    )}
                                                </div>
                                            ) : details.message ? (
                                                <span>{details.message}</span>
                                            ) : (
                                                <span style={{ opacity: 0.5 }}>Standard execution</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;
