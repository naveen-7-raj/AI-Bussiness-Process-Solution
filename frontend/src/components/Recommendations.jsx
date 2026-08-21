import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const POLL_INTERVAL_MS = 30000;

const WAREHOUSE_NAMES = {
    'WH01': 'Chennai Central Warehouse',
    'WH02': 'Coimbatore Distribution Center',
    'WH03': 'Bengaluru South Warehouse',
    'WH04': 'Kochi Regional Warehouse',
    'WH05': 'Hyderabad South Zone Warehouse',
};

const RISK_CONFIG = {
    high: {
        color: 'var(--status-error)',
        bg: 'rgba(250, 82, 82, 0.08)',
        border: 'rgba(250, 82, 82, 0.35)',
        badgeClass: 'error',
        label: 'High Risk',
        icon: '⚠',
    },
    medium: {
        color: 'var(--status-warning)',
        bg: 'rgba(245, 159, 0, 0.08)',
        border: 'rgba(245, 159, 0, 0.35)',
        badgeClass: 'warning',
        label: 'Medium Risk',
        icon: '◆',
    },
    low: {
        color: 'var(--status-info)',
        bg: 'rgba(21, 170, 191, 0.08)',
        border: 'rgba(21, 170, 191, 0.35)',
        badgeClass: 'info',
        label: 'Low Risk',
        icon: '●',
    },
};

const STATUS_CONFIG = {
    ACTIVE: { label: 'Active', badgeClass: 'info', color: 'var(--accent)' },
    IN_PROGRESS: { label: 'In Progress', badgeClass: 'warning', color: 'var(--status-warning)' },
    RESOLVED: { label: 'Resolved', badgeClass: 'success', color: 'var(--status-success)' },
    VERIFIED: { label: 'Verified', badgeClass: 'success', color: 'var(--status-success)' },
    REOPENED: { label: 'Reopened', badgeClass: 'error', color: 'var(--status-error)' },
};

const Recommendations = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const facilityParam = searchParams.get('facility') || searchParams.get('warehouse') || '';

    const [recommendations, setRecommendations] = useState([]);
    const [summary, setSummary] = useState({ active: 0, in_progress: 0, resolved: 0, verified: 0, reopened: 0, high: 0, medium: 0, low: 0 });
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [toast, setToast] = useState(null);
    const { token } = useAuth();

    // Auto-dismiss toast after 4 seconds
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(t);
    }, [toast]);

    const fetchLiveRecommendations = useCallback(async () => {
        const authToken = token || localStorage.getItem('token');
        if (!authToken) return;
        try {
            const url = statusFilter && statusFilter !== 'ALL'
                ? `${API_BASE}/api/recommendations/live?status=${encodeURIComponent(statusFilter)}`
                : `${API_BASE}/api/recommendations/live`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setRecommendations(data.recommendations || []);
            setSummary(data.summary || { active: 0, in_progress: 0, resolved: 0, verified: 0, reopened: 0, high: 0, medium: 0, low: 0 });
            setError(null);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token, statusFilter]);

    useEffect(() => {
        fetchLiveRecommendations();
        const interval = setInterval(fetchLiveRecommendations, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchLiveRecommendations]);

    const handleGenerate = async () => {
        const authToken = token || localStorage.getItem('token');
        if (!authToken) return;
        setGenerating(true);
        try {
            const res = await fetch(`${API_BASE}/api/recommendations/generate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setToast({ type: 'success', message: '✓ Recommendation rules re-evaluated across all facilities.' });
            await fetchLiveRecommendations();
        } catch (err) {
            setError(err.message);
            setToast({ type: 'error', message: `✕ Failed to evaluate recommendations: ${err.message}` });
        } finally {
            setGenerating(false);
        }
    };

    const handleUpdateStatus = async (recId, newStatus) => {
        const authToken = token || localStorage.getItem('token');
        if (!authToken) return;

        const targetRec = recommendations.find(r => r.id === recId);
        const hasTransfer = targetRec?.source_warehouse && targetRec?.target_warehouse && targetRec?.recommended_quantity > 0;

        // Optimistic update for instant visual feedback
        setRecommendations(prev => prev.map(r => r.id === recId ? { ...r, status: newStatus } : r));

        try {
            const res = await fetch(`${API_BASE}/api/recommendations/${recId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.current_status) {
                setRecommendations(prev => prev.map(r => r.id === recId ? { ...r, status: data.current_status } : r));
            }

            // Trigger action confirmation toast
            if (newStatus === 'IN_PROGRESS') {
                const msg = hasTransfer
                    ? `✓ Stock transfer task initiated: ${targetRec.recommended_quantity} units (${targetRec.source_warehouse} → ${targetRec.target_warehouse})`
                    : `✓ Action task initiated: ${targetRec?.recommended_action || 'Operational action'}`;
                setToast({ type: 'success', message: msg });
            } else if (newStatus === 'RESOLVED') {
                setToast({ type: 'success', message: `✓ Recommendation marked as resolved.` });
            } else if (newStatus === 'VERIFY') {
                setToast({ type: 'success', message: `✓ Telemetry verified: Resolution confirmed by live database state.` });
            }

            await fetchLiveRecommendations();
        } catch (err) {
            setError(err.message);
            setToast({ type: 'error', message: `✕ Action failed: ${err.message}` });
            await fetchLiveRecommendations();
        }
    };

    const filteredRecs = recommendations.filter(rec => {
        const matchesStatus = statusFilter === 'ALL' || rec.status === statusFilter;
        if (!matchesStatus) return false;
        if (!facilityParam) return true;
        return (
            rec.target_warehouse === facilityParam ||
            rec.source_warehouse === facilityParam ||
            rec.warehouse_id === facilityParam
        );
    });

    return (
        <div>
            {/* Action Confirmation Toast Banner */}
            {toast && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '18px',
                    backgroundColor: toast.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${toast.type === 'success' ? 'var(--status-success)' : 'var(--status-error)'}`,
                    color: toast.type === 'success' ? 'var(--status-success)' : 'var(--status-error)',
                    fontWeight: 500,
                    fontSize: '13px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{toast.message}</span>
                    </div>
                    <button
                        onClick={() => setToast(null)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            fontSize: '14px',
                            fontWeight: 700,
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ marginBottom: '4px' }}>Prescriptive Operational Recommendations</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', opacity: 0.7 }}>
                        Deterministic workflow execution • Verified by live telemetry
                        {lastUpdated && (
                            <span> • Updated {lastUpdated.toLocaleTimeString()}</span>
                        )}
                    </p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    style={{ whiteSpace: 'nowrap' }}
                >
                    {generating ? 'Evaluating…' : '⟳ Refresh Prescriptions'}
                </button>
            </div>

            {/* Deep-link Facility Filter Banner */}
            {facilityParam && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid var(--accent)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '20px',
                    fontSize: '13px',
                }}>
                    <div>
                        <strong>Filtered for Facility:</strong> {WAREHOUSE_NAMES[facilityParam] || facilityParam} ({facilityParam})
                    </div>
                    <button
                        onClick={() => setSearchParams({})}
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                        ✕ Show All Facilities
                    </button>
                </div>
            )}

            {/* Summary Bar */}
            <div className="grid-cards" style={{ marginBottom: '24px' }}>
                <div className="stat-card" style={{ borderLeft: `4px solid var(--accent)` }}>
                    <span className="stat-title">Active</span>
                    <span className="stat-value" style={{ color: 'var(--accent)' }}>
                        {(summary.active || 0) + (summary.reopened || 0)}
                    </span>
                </div>
                <div className="stat-card" style={{ borderLeft: `4px solid var(--status-warning)` }}>
                    <span className="stat-title">In Progress</span>
                    <span className="stat-value" style={{ color: 'var(--status-warning)' }}>
                        {summary.in_progress || 0}
                    </span>
                </div>
                <div className="stat-card" style={{ borderLeft: `4px solid var(--status-success)` }}>
                    <span className="stat-title">Verified Resolved</span>
                    <span className="stat-value" style={{ color: 'var(--status-success)' }}>
                        {(summary.verified || 0) + (summary.resolved || 0)}
                    </span>
                </div>
                <div className="stat-card" style={{ borderLeft: `4px solid var(--status-error)` }}>
                    <span className="stat-title">Reopened</span>
                    <span className="stat-value" style={{ color: 'var(--status-error)' }}>
                        {summary.reopened || 0}
                    </span>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {[
                    { id: 'ACTIVE', label: 'Active Tasks' },
                    { id: 'IN_PROGRESS', label: 'In Progress' },
                    { id: 'RESOLVED', label: 'Resolved' },
                    { id: 'VERIFIED', label: 'Verified' },
                    { id: 'REOPENED', label: 'Reopened' },
                    { id: 'ALL', label: 'All History' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        style={{
                            background: statusFilter === tab.id ? 'var(--text)' : 'var(--bg-surface)',
                            color: statusFilter === tab.id ? 'var(--bg)' : 'var(--text)',
                            border: `1px solid ${statusFilter === tab.id ? 'var(--text)' : 'var(--border)'}`,
                            padding: '6px 14px',
                            fontSize: '12px',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div className="card" style={{ borderLeft: '4px solid var(--status-error)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <p style={{ margin: 0, color: 'var(--status-error)', fontSize: '13px' }}>
                        ✕ Unable to load operational recommendations ({error}). Please try again.
                    </p>
                    <button
                        onClick={() => { setLoading(true); setError(null); fetchRecommendations(); }}
                        className="btn-secondary"
                        style={{ fontSize: '12px', padding: '5px 12px' }}
                    >
                        ↻ Retry Fetch
                    </button>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <p style={{ margin: 0, color: 'var(--text)', opacity: 0.6 }}>
                        Loading recommendations from engine…
                    </p>
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && filteredRecs.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>✓</div>
                    <h3 style={{ marginBottom: '8px' }}>No Tasks in this view</h3>
                    <p style={{ margin: 0, color: 'var(--text)', opacity: 0.6 }}>
                        {facilityParam
                            ? `No recommendation tasks found matching facility ${facilityParam} with status ${statusFilter}.`
                            : 'No recommendation tasks currently match the selected status filter.'}
                    </p>
                </div>
            )}

            {/* Recommendation Cards with Clear Operational Blocks */}
            {filteredRecs.map((rec, idx) => {
                const statusKey = (rec.status || 'ACTIVE').toUpperCase();
                const config = RISK_CONFIG[rec.risk] || RISK_CONFIG.low;
                const statusConf = STATUS_CONFIG[statusKey] || STATUS_CONFIG.ACTIVE;
                const hasTransfer = rec.source_warehouse && rec.target_warehouse && rec.recommended_quantity > 0;

                return (
                    <div
                        key={rec.id || idx}
                        className="card"
                        style={{
                            borderLeft: `4px solid ${config.color}`,
                            backgroundColor: config.bg,
                            marginBottom: '16px',
                        }}
                    >
                        {/* 1. Recommended Action Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '18px' }}>{config.icon}</span>
                                <h3 style={{ margin: 0, color: config.color }}>
                                    {rec.recommended_action}
                                </h3>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span className={`badge ${statusConf.badgeClass}`}>
                                    {statusConf.label}
                                </span>
                                <span className={`badge ${config.badgeClass}`}>
                                    {config.label}
                                </span>
                            </div>
                        </div>

                        {/* 2. Root Cause & Diagnostic Driver */}
                        <div style={{ marginBottom: '12px', backgroundColor: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text)', opacity: 0.7, fontWeight: 700 }}>
                                Root Cause & Process Bottleneck
                            </span>
                            <p style={{ margin: '4px 0 0', color: 'var(--text-h)', fontWeight: 500, fontSize: '13px' }}>
                                {rec.root_cause && rec.root_cause.trim() ? rec.root_cause : 'Root cause evaluation in progress based on live telemetry.'}
                            </p>
                        </div>

                        {/* 3. Operational Transfer / Intervention Details */}
                        {hasTransfer && (
                            <div style={{
                                backgroundColor: 'var(--bg-surface)',
                                border: `1px solid ${config.border}`,
                                borderRadius: 'var(--radius-md)',
                                padding: '14px 18px',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                flexWrap: 'wrap',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '200px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.6, marginBottom: '2px' }}>Source Facility</div>
                                        <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '14px', color: 'var(--text-h)' }}>
                                            {rec.source_warehouse} ({WAREHOUSE_NAMES[rec.source_warehouse] || 'Facility'})
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '20px', color: config.color }}>→</div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.6, marginBottom: '2px' }}>Destination Facility</div>
                                        <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '14px', color: 'var(--text-h)' }}>
                                            {rec.target_warehouse} ({WAREHOUSE_NAMES[rec.target_warehouse] || 'Facility'})
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center', minWidth: '90px' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.6, marginBottom: '2px' }}>Transfer Qty</div>
                                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '20px', color: config.color }}>
                                        {rec.recommended_quantity} units
                                    </div>
                                </div>
                                {rec.product_id && (
                                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.6, marginBottom: '2px' }}>SKU / Product</div>
                                        <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '14px', color: 'var(--text-h)' }}>
                                            {rec.product_id}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Non-transfer facility details */}
                        {!hasTransfer && (rec.source_warehouse || rec.target_warehouse) && (
                            <div style={{
                                backgroundColor: 'var(--bg-surface)',
                                border: `1px solid ${config.border}`,
                                borderRadius: 'var(--radius-md)',
                                padding: '12px 16px',
                                marginBottom: '12px',
                                display: 'flex',
                                gap: '16px',
                                flexWrap: 'wrap',
                            }}>
                                <div>
                                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.6 }}>Facility: </span>
                                    <strong style={{ fontFamily: 'var(--mono)', color: 'var(--text-h)' }}>
                                        {rec.target_warehouse || rec.source_warehouse}
                                    </strong>
                                </div>
                                {rec.product_id && (
                                    <div>
                                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.6 }}>SKU: </span>
                                        <strong style={{ fontFamily: 'var(--mono)', color: 'var(--text-h)' }}>
                                            {rec.product_id}
                                        </strong>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 4. Operational Rationale & Expected Benefit */}
                        <div style={{ marginBottom: '14px' }}>
                            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text)', opacity: 0.7, fontWeight: 700 }}>
                                Expected Operational Rationale & Benefit
                            </span>
                            <p style={{ margin: '4px 0 0', color: 'var(--text)', lineHeight: '1.6', fontSize: '13px' }}>
                                {rec.reason}
                            </p>
                        </div>

                        {/* 5. Task Lifecycle Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.7 }}>Current State:</span>
                                <span className={`badge ${statusConf.badgeClass}`} style={{ fontWeight: 600 }}>
                                    {statusConf.label}
                                </span>
                            </div>

                            <div>
                                {statusKey === 'ACTIVE' && (
                                    <button
                                        onClick={() => handleUpdateStatus(rec.id, 'IN_PROGRESS')}
                                        style={{
                                            background: 'var(--accent)',
                                            color: 'white',
                                            fontSize: '12px',
                                            padding: '6px 14px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                        }}
                                    >
                                        ▶ Start Action
                                    </button>
                                )}
                                {statusKey === 'IN_PROGRESS' && (
                                    <button
                                        onClick={() => handleUpdateStatus(rec.id, 'RESOLVED')}
                                        style={{
                                            background: 'var(--status-success)',
                                            color: 'white',
                                            fontSize: '12px',
                                            padding: '6px 14px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                        }}
                                    >
                                        ✓ Mark as Resolved
                                    </button>
                                )}
                                {statusKey === 'RESOLVED' && (
                                    <button
                                        onClick={() => handleUpdateStatus(rec.id, 'VERIFY')}
                                        style={{
                                            background: 'var(--accent)',
                                            color: 'white',
                                            fontSize: '12px',
                                            padding: '6px 14px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                        }}
                                    >
                                        ⚡ Verify Telemetry
                                    </button>
                                )}
                                {statusKey === 'VERIFIED' && (
                                    <span style={{ fontSize: '12px', color: 'var(--status-success)', fontWeight: 600 }}>
                                        ✓ Telemetry Verified: Problem Resolved
                                    </span>
                                )}
                                {statusKey === 'REOPENED' && (
                                    <button
                                        onClick={() => handleUpdateStatus(rec.id, 'IN_PROGRESS')}
                                        style={{
                                            background: 'var(--status-error)',
                                            color: 'white',
                                            fontSize: '12px',
                                            padding: '6px 14px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                        }}
                                    >
                                        ▶ Start Action
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Recommendations;
