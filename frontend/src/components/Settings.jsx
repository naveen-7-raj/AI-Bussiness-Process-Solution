import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CustomDropdown from './CustomDropdown';

const TIMEZONES = [
    { value: 'Asia/Kolkata', label: 'India Standard Time (Asia/Kolkata, UTC+5:30)' },
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'US Eastern (America/New_York, UTC-5)' },
    { value: 'America/Chicago', label: 'US Central (America/Chicago, UTC-6)' },
    { value: 'America/Denver', label: 'US Mountain (America/Denver, UTC-7)' },
    { value: 'America/Los_Angeles', label: 'US Pacific (America/Los_Angeles, UTC-8)' },
    { value: 'Europe/London', label: 'Europe London (Europe/London, UTC+0)' },
    { value: 'Europe/Berlin', label: 'Europe Central (Europe/Berlin, UTC+1)' },
    { value: 'Asia/Singapore', label: 'Asia Singapore (Asia/Singapore, UTC+8)' },
    { value: 'Asia/Tokyo', label: 'Asia Tokyo (Asia/Tokyo, UTC+9)' },
    { value: 'Australia/Sydney', label: 'Australia Sydney (Australia/Sydney, UTC+10)' },
];

const Settings = () => {
    const { logout, token, user } = useAuth();
    const [userEmail, setUserEmail] = useState('');
    const [emailOption, setEmailOption] = useState('All Alerts');
    const [timezone, setTimezone] = useState('Asia/Kolkata');
    const [smtpConfigured, setSmtpConfigured] = useState(false);
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/settings`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUserEmail(data.email || '');
                    setEmailOption(data.email_notifications || 'All Alerts');
                    setTimezone(data.timezone || 'Asia/Kolkata');
                    setSmtpConfigured(Boolean(data.smtp_configured));
                }
            } catch (err) {
                console.error('Failed to load settings', err);
            }
        };
        if (token) fetchSettings();
    }, [token]);

    const handleSave = async () => {
        setSaving(true);
        setStatusMsg(null);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    email_notifications: emailOption,
                    timezone: timezone
                })
            });
            if (!res.ok) throw new Error(`Failed to save (HTTP ${res.status})`);
            setStatusMsg({ type: 'success', text: '✓ Account preferences and timezone saved successfully!' });
        } catch (err) {
            setStatusMsg({ type: 'error', text: `✕ ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>System Settings & Preferences</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', opacity: 0.7 }}>
                        Configure regional time zones, user alert delivery, and system configurations
                    </p>
                </div>
            </div>

            {statusMsg && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    backgroundColor: statusMsg.type === 'success' ? 'rgba(81, 207, 102, 0.15)' : 'rgba(250, 82, 82, 0.15)',
                    color: statusMsg.type === 'success' ? 'var(--status-success)' : 'var(--status-error)',
                    border: `1px solid ${statusMsg.type === 'success' ? 'var(--status-success)' : 'var(--status-error)'}`
                }}>
                    {statusMsg.text}
                </div>
            )}
            
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h3 style={{ margin: 0 }}>Account & Alert Preferences</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '520px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}>
                            Registered Alert Recipient Email
                        </label>
                        <input
                            type="text"
                            value={userEmail}
                            disabled
                            style={{
                                width: '100%',
                                backgroundColor: 'var(--bg-surface)',
                                opacity: 0.85,
                                cursor: 'not-allowed',
                                fontFamily: 'var(--mono)'
                            }}
                        />
                        <span style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px', display: 'block' }}>
                            Critical, High Risk, Inventory, and Warehouse alerts are mapped directly to your authenticated registered email.
                        </span>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}>
                            Email Notification Frequency
                        </label>
                        <CustomDropdown
                            value={emailOption}
                            onChange={(val) => setEmailOption(val)}
                            fullWidth={true}
                            options={[
                                { value: 'All Alerts', label: 'All Alerts (Critical, High Risk, Inventory & Warehouse)' },
                                { value: 'Critical Only', label: 'Critical & High Risk Only' },
                                { value: 'None', label: 'None (In-App & WebSocket Only)' }
                            ]}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}>
                            System Timezone
                        </label>
                        <CustomDropdown
                            value={timezone}
                            onChange={(val) => setTimezone(val)}
                            fullWidth={true}
                            options={TIMEZONES}
                        />
                    </div>

                    <div style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        fontSize: '12px'
                    }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{smtpConfigured ? '🟢 SMTP Email Provider Connected' : '🟡 Email Delivery Status: Provider-Ready'}</span>
                        </div>
                        <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.4 }}>
                            {smtpConfigured
                                ? 'Real-time alert emails will be automatically dispatched to your registered address.'
                                : 'To enable live email dispatch, configure SMTP_HOST (e.g. Resend, SendGrid, or Gmail SMTP) and credentials in .env.'}
                        </p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{ width: 'fit-content', marginTop: '6px' }}
                    >
                        {saving ? 'Saving Preferences…' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Admin Access Request Section for Standard Users */}
            {(!user?.role || user?.role === 'user') && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>Request Admin Access</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                Request administrative governance privileges for platform management.
                            </p>
                        </div>
                        <span className="badge warning" style={{ fontSize: '11px' }}>Role: User</span>
                    </div>

                    <AccessRequestForm token={token} />
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <h3 style={{ color: 'var(--status-error)', margin: 0 }}>Danger Zone</h3>
                </div>
                <p style={{ fontSize: '13px', opacity: 0.7, marginBottom: '14px' }}>
                    Revoke current session and securely log out of Nexora BPI across this device.
                </p>
                <button 
                    onClick={logout}
                    style={{ backgroundColor: 'var(--status-error)' }}
                >
                    Sign Out Everywhere
                </button>
            </div>
        </div>
    );
};

const AccessRequestForm = ({ token }) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [statusInfo, setStatusInfo] = useState(null);
    const [hasPending, setHasPending] = useState(false);
    const [pendingDetails, setPendingDetails] = useState(null);

    const checkStatus = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/access-requests/my-status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHasPending(Boolean(data.has_pending));
                setPendingDetails(data.pending_request);
            }
        } catch (e) {
            console.error('Failed to fetch access request status', e);
        }
    };

    useEffect(() => {
        checkStatus();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            setStatusInfo({ type: 'error', text: 'Please provide a valid justification reason for admin access.' });
            return;
        }
        setSubmitting(true);
        setStatusInfo(null);
        try {
            const res = await fetch(`${API_BASE}/api/access-requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    requested_role: 'admin',
                    reason: reason.trim()
                })
            });
            const data = await res.json();
            if (res.ok) {
                setStatusInfo({ type: 'success', text: '✓ Access request submitted successfully! Pending Super Admin review.' });
                setReason('');
                setHasPending(true);
                setPendingDetails({
                    requested_role: 'admin',
                    reason: reason.trim(),
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
            } else {
                setStatusInfo({ type: 'error', text: data.detail || 'Failed to submit access request.' });
            }
        } catch (err) {
            setStatusInfo({ type: 'error', text: 'Network error submitting request.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (hasPending) {
        return (
            <div style={{
                padding: '16px',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--status-warning, #f59e0b)' }}>
                    <span>🟡 Request Already Pending</span>
                    <span className="badge warning" style={{ fontSize: '10px' }}>STATUS: PENDING</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>
                    Your request for <strong>Admin</strong> access is currently under review by Super Admin.
                </p>
                {pendingDetails?.reason && (
                    <div style={{ fontSize: '12px', background: 'var(--bg-subtle, rgba(255,255,255,0.03))', padding: '8px 12px', borderRadius: '4px', borderLeft: '3px solid var(--status-warning, #f59e0b)' }}>
                        <strong>Submitted Justification:</strong> "{pendingDetails.reason}"
                    </div>
                )}
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Submitted on: {pendingDetails?.created_at ? new Date(pendingDetails.created_at).toLocaleString() : 'Recently'}
                </span>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '520px' }}>
            {statusInfo && (
                <div style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: statusInfo.type === 'success' ? 'rgba(81, 207, 102, 0.15)' : 'rgba(250, 82, 82, 0.15)',
                    color: statusInfo.type === 'success' ? 'var(--status-success)' : 'var(--status-error)',
                    border: `1px solid ${statusInfo.type === 'success' ? 'var(--status-success)' : 'var(--status-error)'}`
                }}>
                    {statusInfo.text}
                </div>
            )}

            <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}>
                    Requested Access Level
                </label>
                <input
                    type="text"
                    value="Admin"
                    disabled
                    style={{
                        width: '100%',
                        backgroundColor: 'var(--bg-surface)',
                        opacity: 0.85,
                        cursor: 'not-allowed',
                        fontWeight: 600
                    }}
                />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}>
                    Justification / Business Reason <span style={{ color: 'var(--status-error)' }}>*</span>
                </label>
                <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide justification for requiring administrator privileges (e.g. Regional logistics manager duties)..."
                    style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text)',
                        fontSize: '13px',
                        resize: 'vertical'
                    }}
                />
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="button button-primary"
                style={{ width: 'fit-content' }}
            >
                {submitting ? 'Submitting Request…' : 'Submit Request'}
            </button>
        </form>
    );
};

export default Settings;
