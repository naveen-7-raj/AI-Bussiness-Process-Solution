import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://127.0.0.1:8000';
const POLL_INTERVAL_MS = 30000;

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

const Recommendations = () => {
    const [recommendations, setRecommendations] = useState([]);
    const [summary, setSummary] = useState({ high: 0, medium: 0, low: 0 });
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const { token } = useAuth();

    const fetchLiveRecommendations = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/recommendations/live`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setRecommendations(data.recommendations || []);
            setSummary(data.summary || { high: 0, medium: 0, low: 0 });
            setError(null);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchLiveRecommendations();
        const interval = setInterval(fetchLiveRecommendations, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchLiveRecommendations]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch(`${API_BASE}/api/recommendations/generate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            // Refresh the live view after generating
            await fetchLiveRecommendations();
        } catch (err) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    const totalCount = summary.high + summary.medium + summary.low;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ marginBottom: '4px' }}>Operational Recommendations</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', opacity: 0.7 }}>
                        Deterministic engine • Rule-based • No LLM
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
                    {generating ? 'Generating…' : '⟳ Generate & Save'}
                </button>
            </div>

            {/* Summary Bar */}
            <div className="grid-cards" style={{ marginBottom: '24px' }}>
                <div className="stat-card" style={{ borderLeft: `4px solid var(--status-error)` }}>
                    <span className="stat-title">High Risk</span>
                    <span className="stat-value" style={{ color: 'var(--status-error)' }}>
                        {summary.high}
                    </span>
                </div>
                <div className="stat-card" style={{ borderLeft: `4px solid var(--status-warning)` }}>
                    <span className="stat-title">Medium Risk</span>
                    <span className="stat-value" style={{ color: 'var(--status-warning)' }}>
                        {summary.medium}
                    </span>
                </div>
                <div className="stat-card" style={{ borderLeft: `4px solid var(--status-info)` }}>
                    <span className="stat-title">Low Risk</span>
                    <span className="stat-value" style={{ color: 'var(--status-info)' }}>
                        {summary.low}
                    </span>
                </div>
                <div className="stat-card">
                    <span className="stat-title">Total</span>
                    <span className="stat-value">{totalCount}</span>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="card" style={{ borderLeft: '4px solid var(--status-error)', marginBottom: '20px' }}>
                    <p style={{ margin: 0, color: 'var(--status-error)' }}>
                        ✕ Failed to load recommendations: {error}
                    </p>
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
            {!loading && !error && recommendations.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>✓</div>
                    <h3 style={{ marginBottom: '8px' }}>All Clear</h3>
                    <p style={{ margin: 0, color: 'var(--text)', opacity: 0.6 }}>
                        No actionable recommendations at this time.
                        The engine found no inventory shortages, overloads, or imbalances.
                    </p>
                </div>
            )}

            {/* Recommendation Cards */}
            {recommendations.map((rec, idx) => {
                const config = RISK_CONFIG[rec.risk] || RISK_CONFIG.low;
                const hasTransfer = rec.source_warehouse && rec.target_warehouse && rec.recommended_quantity > 0;

                return (
                    <div
                        key={idx}
                        className="card"
                        style={{
                            borderLeft: `4px solid ${config.color}`,
                            backgroundColor: config.bg,
                            marginBottom: '16px',
                        }}
                    >
                        {/* Card Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '18px' }}>{config.icon}</span>
                                <h3 style={{ margin: 0, color: config.color }}>
                                    {rec.recommended_action}
                                </h3>
                            </div>
                            <span className={`badge ${config.badgeClass}`}>
                                {config.label}
                            </span>
                        </div>

                        {/* Root Cause */}
                        <div style={{ marginBottom: '12px' }}>
                            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text)', opacity: 0.6, fontWeight: 600 }}>
                                Root Cause
                            </span>
                            <p style={{ margin: '4px 0 0', color: 'var(--text-h)' }}>
                                {rec.root_cause}
                            </p>
                        </div>

                        {/* Transfer Details */}
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
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.6, marginBottom: '2px' }}>From</div>
                                        <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '15px', color: 'var(--text-h)' }}>
                                            {rec.source_warehouse}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '20px', color: config.color }}>→</div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.6, marginBottom: '2px' }}>To</div>
                                        <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '15px', color: 'var(--text-h)' }}>
                                            {rec.target_warehouse}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.6, marginBottom: '2px' }}>Quantity</div>
                                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '22px', color: config.color }}>
                                        {rec.recommended_quantity}
                                    </div>
                                </div>
                                {rec.product_id && (
                                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.6, marginBottom: '2px' }}>Product</div>
                                        <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '14px', color: 'var(--text-h)' }}>
                                            {rec.product_id}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Non-transfer details (overload etc.) */}
                        {!hasTransfer && (rec.source_warehouse || rec.target_warehouse) && (
                            <div style={{
                                backgroundColor: 'var(--bg-surface)',
                                border: `1px solid ${config.border}`,
                                borderRadius: 'var(--radius-md)',
                                padding: '14px 18px',
                                marginBottom: '12px',
                            }}>
                                <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--text-h)' }}>
                                    Warehouse: {rec.target_warehouse || rec.source_warehouse}
                                </span>
                                {rec.product_id && (
                                    <span style={{ marginLeft: '16px', fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                                        Product: {rec.product_id}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Reason */}
                        <div>
                            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text)', opacity: 0.6, fontWeight: 600 }}>
                                Reason
                            </span>
                            <p style={{ margin: '4px 0 0', color: 'var(--text)', lineHeight: '1.6' }}>
                                {rec.reason}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Recommendations;
