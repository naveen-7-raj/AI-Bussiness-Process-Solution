import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';

const WAREHOUSE_NAMES = {
    'WH01': 'Chennai Central Warehouse',
    'WH02': 'Coimbatore Distribution Center',
    'WH03': 'Bengaluru South Warehouse',
    'WH04': 'Kochi Regional Warehouse',
    'WH05': 'Hyderabad South Zone Warehouse',
};

const formatShapMetric = (feature, rawVal) => {
    const feat = String(feature || '').toLowerCase().trim();
    const val = Number(rawVal ?? 0);

    if (feat === 'processing_time' || feat === 'avg_processing_time_sec') {
        return {
            label: 'Mean Processing Duration',
            formattedValue: `${val.toFixed(1)} s`,
        };
    }
    if (feat === 'warehouse_load' || feat === 'facility_utilization') {
        const pctVal = val <= 1.0 ? Math.round(val * 100) : Math.round(val);
        return {
            label: 'Facility Capacity Utilization',
            formattedValue: `${pctVal}%`,
        };
    }
    if (feat === 'backlog' || feat === 'backlog_orders') {
        return {
            label: 'Backlogged Orders',
            formattedValue: `${Math.round(val)} orders`,
        };
    }
    if (feat === 'orders_per_hour' || feat === 'order_ingestion_velocity') {
        return {
            label: 'Order Processing Rate',
            formattedValue: `${Math.round(val)} orders/hour`,
        };
    }
    if (feat === 'inventory_quantity' || feat === 'available_quantity' || feat === 'inventory_level') {
        return {
            label: 'Available Inventory',
            formattedValue: `${Math.round(val)} units`,
        };
    }
    if (feat === 'demand_rate') {
        return {
            label: 'Demand Velocity Factor',
            formattedValue: `${val.toFixed(1)}x baseline`,
        };
    }
    if (feat === 'stockout_risk_score') {
        const pctVal = val <= 1.0 ? Math.round(val * 100) : Math.round(val);
        return {
            label: 'Stockout Probability',
            formattedValue: `${pctVal}%`,
        };
    }
    if (feat === 'lead_time_days') {
        return {
            label: 'Supplier Lead Time',
            formattedValue: `${val.toFixed(1)} days`,
        };
    }

    const cleanLabel = feat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return {
        label: cleanLabel,
        formattedValue: Number.isInteger(val) ? String(val) : val.toFixed(1),
    };
};

const Predictions = () => {
    const { token } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const facilityParam = searchParams.get('facility') || '';

    const { data: wrhRisk, loading: riskLoading, refresh: refreshRisk } = useFetch('/api/warehouse-risk-trend', token, 15000);
    const { data: stats } = useFetch('/api/stats', token, 15000);

    const [running, setRunning] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [runResults, setRunResults] = useState(null);
    const [error, setError] = useState(null);

    // Fetch latest predictions with real TreeSHAP on mount or refresh
    const fetchLatestPredictions = useCallback(async () => {
        const authToken = token || localStorage.getItem('token');
        if (!authToken) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/predictions/latest`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setRunResults(data.predictions || []);
            }
        } catch (err) {
            console.error('Failed to load initial predictions:', err);
        } finally {
            setInitialLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchLatestPredictions();
    }, [fetchLatestPredictions]);

    const handleRefreshPredictions = async () => {
        setRunning(true);
        setError(null);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/predictions/run`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token || localStorage.getItem('token')}`,
                },
            });

            if (!res.ok) throw new Error(`Inference execution failed (HTTP ${res.status})`);
            const data = await res.json();
            setRunResults(data.predictions || []);
            refreshRisk();
        } catch (err) {
            setError(err.message);
        } finally {
            setRunning(false);
        }
    };

    const warehouseRiskList = wrhRisk?.warehouses || [];

    const filteredRunResults = runResults
        ? (facilityParam ? runResults.filter(p => p.warehouse_id === facilityParam) : runResults)
        : null;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>XGBoost & TreeSHAP Delay Risk Predictions</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', opacity: 0.7 }}>
                        Live gradient boosted decision tree model with Explainable AI (SHAP TreeExplainer)
                    </p>
                </div>
                <button onClick={handleRefreshPredictions} disabled={running || initialLoading}>
                    {running ? '⚙️ Refreshing Real-Time Predictions…' : '⚡ Refresh Real-Time Predictions'}
                </button>
            </div>

            {/* Facility Filter Banner if deep-linked */}
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
                        <strong>Focused Facility Filter:</strong> {WAREHOUSE_NAMES[facilityParam] || facilityParam} ({facilityParam})
                    </div>
                    <button
                        onClick={() => setSearchParams({})}
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                        ✕ Clear Filter (Show All Facilities)
                    </button>
                </div>
            )}

            {error && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    backgroundColor: 'rgba(250, 82, 82, 0.15)',
                    color: 'var(--status-error)',
                    border: '1px solid var(--status-error)',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                }}>
                    <span>✕ Unable to load predictions ({error}). Please try again.</span>
                    <button
                        onClick={() => { setLoading(true); setError(null); fetchPredictions(); }}
                        className="btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                    >
                        ↻ Retry Fetch
                    </button>
                </div>
            )}

            {/* Model Summary Cards */}
            <div className="grid-cards" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <span className="stat-title">Model Architecture</span>
                    <span className="stat-value" style={{ fontSize: '18px' }}>XGBoost Classifier</span>
                    <span className="stat-change positive">Trained on Historical ERP</span>
                </div>
                <div className="stat-card">
                    <span className="stat-title">Explainability Layer</span>
                    <span className="stat-value" style={{ fontSize: '18px' }}>TreeSHAP Explainer</span>
                    <span className="stat-change positive">Exact Local Attribution</span>
                </div>
                <div className="stat-card">
                    <span className="stat-title">Active Facility Alerts</span>
                    <span className="stat-value" style={{ color: stats?.active_alerts > 0 ? 'var(--status-error)' : 'var(--status-success)' }}>
                        {stats?.active_alerts ?? 0}
                    </span>
                    <span className="stat-change neutral">Overloaded thresholds</span>
                </div>
            </div>

            {/* Live Model Inference Output with TreeSHAP Explanations */}
            <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--accent)', padding: 0 }}>
                <div className="card-header" style={{ padding: '16px 20px', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0 }}>Live Model Inference & TreeSHAP Attributions</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                            Exact physical feature contribution weights explaining why each facility is at risk
                        </p>
                    </div>
                    <span className="badge success">Live Inference</span>
                </div>
                <div className="table-container" style={{ padding: 0, margin: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Facility</th>
                                <th>Delay Risk %</th>
                                <th>Risk Level</th>
                                <th>Predicted Delay</th>
                                <th>SHAP Root-Cause Feature Attributions</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {initialLoading && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                        Evaluating live XGBoost inference & TreeSHAP attributions…
                                    </td>
                                </tr>
                            )}
                            {!initialLoading && (!filteredRunResults || filteredRunResults.length === 0) && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                        No facilities match the selected view.
                                    </td>
                                </tr>
                            )}
                            {!initialLoading && filteredRunResults && filteredRunResults.map((pred) => {
                                const isFocused = facilityParam === pred.warehouse_id;
                                return (
                                    <tr
                                        key={pred.warehouse_id}
                                        style={{ backgroundColor: isFocused ? 'rgba(59, 130, 246, 0.08)' : undefined }}
                                    >
                                        <td>
                                            <strong>{WAREHOUSE_NAMES[pred.warehouse_id] || pred.warehouse_id}</strong>
                                            <span style={{ fontSize: '11px', opacity: 0.6, marginLeft: '6px' }}>({pred.warehouse_id})</span>
                                        </td>
                                        <td>
                                            <strong style={{
                                                color: pred.risk_level === 'HIGH' ? 'var(--status-error)' : pred.risk_level === 'MEDIUM' ? 'var(--status-warning)' : 'var(--status-success)'
                                            }}>
                                                {pred.delay_percentage}
                                            </strong>
                                        </td>
                                        <td>
                                            <span className={`badge ${pred.risk_level === 'HIGH' ? 'error' : pred.risk_level === 'MEDIUM' ? 'warning' : 'success'}`}>
                                                {pred.risk_level}
                                            </span>
                                        </td>
                                        <td>{Number(pred.predicted_delay_minutes).toFixed(1)} mins</td>
                                        <td style={{ fontSize: '12px' }}>
                                            {pred.explanations && pred.explanations.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                    {pred.explanations.map((e, idx) => {
                                                        const metric = formatShapMetric(e.feature, e.value);
                                                        return (
                                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    width: '6px',
                                                                    height: '6px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: e.direction === 'increases' ? 'var(--status-error)' : 'var(--status-success)',
                                                                    flexShrink: 0,
                                                                }} />
                                                                <strong style={{ color: 'var(--text-h)' }}>{metric.label}:</strong>
                                                                <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)', fontWeight: 500 }}>
                                                                    {metric.formattedValue}
                                                                </span>
                                                                <span style={{
                                                                    fontSize: '11px',
                                                                    color: e.direction === 'increases' ? 'var(--status-error)' : 'var(--status-success)',
                                                                    opacity: 0.9,
                                                                    whiteSpace: 'nowrap',
                                                                }}>
                                                                    ({e.direction} delay risk)
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                                    ✓ Operating within normal parameters
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => navigate(`/recommendations?facility=${pred.warehouse_id}`)}
                                                className="btn-secondary"
                                                style={{ fontSize: '11px', padding: '4px 8px', whiteSpace: 'nowrap' }}
                                            >
                                                View Actions →
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Historical Risk Table (Past 24 Hours) */}
            <div className="card table-container" style={{ padding: 0 }}>
                <div className="card-header" style={{ padding: '16px 20px', margin: 0 }}>
                    <h3 style={{ margin: 0 }}>Facility Risk History (Past 24 Hours)</h3>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Facility</th>
                            <th>Average Delay Risk %</th>
                            <th>Inference Samples</th>
                            <th>Status Assessment</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {riskLoading && (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>Loading predictions from PostgreSQL…</td></tr>
                        )}
                        {!riskLoading && warehouseRiskList.length === 0 && (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', opacity: 0.6 }}>No historical prediction records found.</td></tr>
                        )}
                        {!riskLoading && warehouseRiskList.map((wh) => (
                            <tr key={wh.warehouse_id}>
                                <td>
                                    <strong>{WAREHOUSE_NAMES[wh.warehouse_id] || wh.warehouse_id}</strong>
                                    <span style={{ fontSize: '11px', opacity: 0.6, marginLeft: '6px' }}>({wh.warehouse_id})</span>
                                </td>
                                <td>
                                    <span style={{
                                        fontWeight: 'bold',
                                        color: wh.avg_risk_pct >= 70 ? 'var(--status-error)' : wh.avg_risk_pct >= 40 ? 'var(--status-warning)' : 'var(--status-success)'
                                    }}>
                                        {wh.avg_risk_pct}%
                                    </span>
                                </td>
                                <td>{wh.sample_count} inferences</td>
                                <td>
                                    <span className={`badge ${wh.avg_risk_pct >= 70 ? 'error' : wh.avg_risk_pct >= 40 ? 'warning' : 'success'}`}>
                                        {wh.avg_risk_pct >= 70 ? 'High Risk' : wh.avg_risk_pct >= 40 ? 'Moderate Risk' : 'Optimal'}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        onClick={() => navigate(`/recommendations?facility=${wh.warehouse_id}`)}
                                        className="btn-secondary"
                                        style={{ fontSize: '11px', padding: '4px 8px', whiteSpace: 'nowrap' }}
                                    >
                                        View Actions →
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Predictions;
