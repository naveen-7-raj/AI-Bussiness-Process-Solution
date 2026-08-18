import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useFetch } from '../hooks/useFetch';
import { SparkLine, BarChart } from './Charts';

// ─── constants ────────────────────────────────────────────────────────────────
const POLL_MS    = 15_000;   // KPI cards refresh every 15 s
const TREND_MS   = 30_000;   // Trend charts refresh every 30 s

// ─── small helpers ─────────────────────────────────────────────────────────────
const riskBadge = (risk) => {
    if (!risk) return 'info';
    const r = String(risk).toUpperCase();
    if (r === 'HIGH' || r === 'OVERLOADED') return 'error';
    if (r === 'MEDIUM')                     return 'warning';
    return 'success';
};

const riskRowStyle = (pct) => {
    if (pct >= 70) return { borderLeft: '3px solid var(--status-error)',   background: 'rgba(250,82,82,0.04)' };
    if (pct >= 40) return { borderLeft: '3px solid var(--status-warning)', background: 'rgba(245,159,0,0.04)' };
    return {};
};

const riskBarColor = (pct) => {
    if (pct >= 70) return 'var(--status-error)';
    if (pct >= 40) return 'var(--status-warning)';
    return 'var(--status-success)';
};

const fmt = (ts) => {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return ts; }
};

const fmtHour = (iso) => {
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
};

// ─── sub-components ────────────────────────────────────────────────────────────
const KpiCard = ({ title, value, sub, subClass = 'neutral', loading, accent }) => (
    <div className="stat-card" style={accent ? { borderTop: `3px solid ${accent}` } : {}}>
        <span className="stat-title">{title}</span>
        <span className="stat-value" style={loading ? { opacity: 0.3 } : {}}>
            {loading ? '…' : (value ?? '—')}
        </span>
        {sub && <span className={`stat-change ${subClass}`}>{sub}</span>}
    </div>
);

const SectionHeader = ({ title, sub, badge, badgeClass = 'info' }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
        <div>
            <h3 style={{ margin: 0 }}>{title}</h3>
            {sub && <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.6 }}>{sub}</p>}
        </div>
        {badge != null && <span className={`badge ${badgeClass}`}>{badge}</span>}
    </div>
);

// ─── main component ─────────────────────────────────────────────────────────────
const Dashboard = () => {
    const { token } = useAuth();

    // live WS feed
    const { events: realtimeEvents, connected: wsConnected, clearEvents } = useWebSocket();

    // polled REST endpoints
    const { data: stats,     loading: statsLoading }     = useFetch('/api/stats',               token, POLL_MS);
    const { data: hrData,    loading: hrLoading }        = useFetch('/api/high-risk-warehouses', token, POLL_MS);
    const { data: ordTrend,  loading: ordTrendLoading }  = useFetch('/api/orders/trend',         token, TREND_MS);
    const { data: invTrend,  loading: invTrendLoading }  = useFetch('/api/inventory/trend',      token, TREND_MS);
    const { data: wrhRisk,   loading: wrhRiskLoading }   = useFetch('/api/warehouse-risk-trend', token, TREND_MS);

    // derived chart series
    const orderSeries = useMemo(() =>
        (ordTrend?.trend ?? []).map(p => p.order_count), [ordTrend]);

    const invSeries = useMemo(() =>
        (invTrend?.trend ?? []).map(p => p.total_qty), [invTrend]);

    const riskItems = useMemo(() =>
        (wrhRisk?.warehouses ?? []).map(w => ({ label: w.warehouse_id, value: w.avg_risk_pct })),
    [wrhRisk]);

    const highRisk = hrData?.high_risk_warehouses ?? [];

    // derive active alerts from WS events (HIGH-risk events in the last feed)
    const wsHighCount = useMemo(
        () => realtimeEvents.filter(e => String(e.risk).toUpperCase() === 'HIGH').length,
        [realtimeEvents]
    );

    return (
        <div>
            {/* ── page title ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Dashboard Overview</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.55 }}>
                        Live data from Kafka → ML → DB • Refreshes every {POLL_MS / 1000}s
                    </p>
                </div>
                <span className={`badge ${wsConnected ? 'success' : 'warning'}`}
                    style={wsConnected ? { animation: 'ws-pulse 2s ease-in-out infinite' } : {}}>
                    {wsConnected ? '● WebSocket Live' : '○ Reconnecting…'}
                </span>
            </div>

            {/* ── KPI cards ── */}
            <div className="grid-cards">
                <KpiCard
                    title="Total Orders"
                    value={stats?.total_orders?.toLocaleString()}
                    sub={stats ? `Across all warehouses` : undefined}
                    loading={statsLoading}
                    accent="var(--accent)"
                />
                <KpiCard
                    title="Current Inventory"
                    value={stats?.total_inventory?.toLocaleString()}
                    sub={stats ? `Units in all locations` : undefined}
                    loading={statsLoading}
                    accent="var(--status-info)"
                />
                <KpiCard
                    title="Active Alerts"
                    value={stats ? Math.max(stats.active_alerts, wsHighCount) : undefined}
                    sub={stats?.active_alerts > 0 ? 'High-risk predictions (1 h)' : 'No critical alerts'}
                    subClass={stats?.active_alerts > 0 ? 'negative' : 'positive'}
                    loading={statsLoading}
                    accent="var(--status-warning)"
                />
                <KpiCard
                    title="High-Risk Warehouses"
                    value={stats?.high_risk_warehouses}
                    sub={stats?.high_risk_warehouses > 0 ? 'Overloaded – action needed' : 'All warehouses normal'}
                    subClass={stats?.high_risk_warehouses > 0 ? 'negative' : 'positive'}
                    loading={statsLoading}
                    accent="var(--status-error)"
                />
            </div>

            {/* ── trend charts ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>

                {/* Order trend */}
                <div className="card" style={{ margin: 0 }}>
                    <SectionHeader
                        title="Order Trend"
                        sub="Hourly orders – last 24 h"
                        badge={ordTrend ? `${orderSeries.reduce((a, b) => a + b, 0)} orders` : '…'}
                    />
                    {ordTrendLoading
                        ? <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4, fontSize: 12 }}>Loading…</div>
                        : <SparkLine
                            data={orderSeries}
                            color="var(--accent)"
                            fillColor="rgba(34,139,230,0.08)"
                            height={80}
                          />
                    }
                    {ordTrend?.trend?.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.55, marginTop: '6px' }}>
                            <span>{fmtHour(ordTrend.trend[0].hour)}</span>
                            <span>{fmtHour(ordTrend.trend[ordTrend.trend.length - 1].hour)}</span>
                        </div>
                    )}
                </div>

                {/* Inventory trend */}
                <div className="card" style={{ margin: 0 }}>
                    <SectionHeader
                        title="Inventory Trend"
                        sub="Total units on-hand – last 24 h"
                        badge={invTrend ? `${(invSeries[invSeries.length - 1] ?? 0).toLocaleString()} now` : '…'}
                        badgeClass="info"
                    />
                    {invTrendLoading
                        ? <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4, fontSize: 12 }}>Loading…</div>
                        : <SparkLine
                            data={invSeries}
                            color="var(--status-info)"
                            fillColor="rgba(21,170,191,0.08)"
                            height={80}
                          />
                    }
                    {invTrend?.trend?.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.55, marginTop: '6px' }}>
                            <span>{fmtHour(invTrend.trend[0].hour)}</span>
                            <span>{fmtHour(invTrend.trend[invTrend.trend.length - 1].hour)}</span>
                        </div>
                    )}
                </div>

                {/* Warehouse risk chart */}
                <div className="card" style={{ margin: 0 }}>
                    <SectionHeader
                        title="Warehouse Risk"
                        sub="Avg delay-risk % – last 24 h"
                        badge={riskItems.length > 0 ? `${riskItems.length} warehouses` : '—'}
                        badgeClass={riskItems.some(r => r.value >= 70) ? 'error' : 'warning'}
                    />
                    {wrhRiskLoading
                        ? <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4, fontSize: 12 }}>Loading…</div>
                        : <BarChart items={riskItems} colorFn={riskBarColor} />
                    }
                </div>

            </div>

            {/* ── high-risk warehouse table ── */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <SectionHeader
                    title="High-Risk Warehouses"
                    sub="Overloaded — requires immediate attention"
                    badge={hrLoading ? '…' : (highRisk.length > 0 ? `${highRisk.length} critical` : 'All clear')}
                    badgeClass={highRisk.length > 0 ? 'error' : 'success'}
                />

                {hrLoading && (
                    <p style={{ textAlign: 'center', opacity: 0.5, padding: '24px 0' }}>Loading warehouse data…</p>
                )}

                {!hrLoading && highRisk.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px', opacity: 0.55 }}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>✓</div>
                        <p style={{ margin: 0 }}>All warehouses are operating within normal thresholds.</p>
                    </div>
                )}

                {!hrLoading && highRisk.length > 0 && (
                    <div className="table-container" style={{ margin: 0, padding: 0 }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Warehouse</th>
                                    <th>Risk %</th>
                                    <th>Backlog</th>
                                    <th>Prediction</th>
                                    <th>Root Cause (SHAP)</th>
                                    <th>Recommended Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {highRisk.map((wh) => (
                                    <tr key={wh.warehouse_id} style={riskRowStyle(wh.risk_pct)}>
                                        <td>
                                            <code style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{wh.warehouse_id}</code>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '60px', background: 'var(--bg-surface-hover)', borderRadius: '4px', overflow: 'hidden', height: '8px' }}>
                                                    <div style={{ width: `${Math.min(wh.risk_pct, 100)}%`, height: '100%', background: riskBarColor(wh.risk_pct), transition: 'width 0.5s' }} />
                                                </div>
                                                <span style={{ color: riskBarColor(wh.risk_pct), fontWeight: 600, fontFamily: 'var(--mono)', fontSize: '13px' }}>
                                                    {wh.risk_pct}%
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge warning">{wh.backlog_orders} orders</span>
                                        </td>
                                        <td style={{ fontSize: '13px' }}>{wh.prediction}</td>
                                        <td style={{ fontSize: '12px', whiteSpace: 'pre-line', fontFamily: 'var(--mono)', maxWidth: '220px', lineHeight: '1.5' }}>
                                            {wh.root_cause}
                                        </td>
                                        <td style={{ color: 'var(--status-error)', fontWeight: 500, fontSize: '13px', maxWidth: '220px' }}>
                                            {wh.recommended_action}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── live event feed ── */}
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0 }}>Live Event Feed</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.6 }}>
                            Kafka → Consumer → ML → SHAP → WebSocket — no refresh needed
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span className={`badge ${wsConnected ? 'success' : 'warning'}`}
                              style={wsConnected ? { animation: 'ws-pulse 2s ease-in-out infinite' } : {}}>
                            {wsConnected ? '● Live' : '○ Offline'}
                        </span>
                        {realtimeEvents.length > 0 && (
                            <button onClick={clearEvents} style={{
                                fontSize: '11px', padding: '4px 10px', borderRadius: '8px',
                                border: '1px solid var(--border)', background: 'var(--bg-surface-hover)',
                                color: 'var(--text)', cursor: 'pointer',
                            }}>Clear</button>
                        )}
                    </div>
                </div>

                {realtimeEvents.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', opacity: 0.55 }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📡</div>
                        <p style={{ margin: 0 }}>
                            Waiting for events…<br />
                            <small>Run: <code>python simulator/erp_simulator.py</code></small>
                        </p>
                    </div>
                ) : (
                    <div className="table-container" style={{ margin: 0, padding: 0 }}>
                        <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Event</th>
                                            <th>Warehouse</th>
                                            <th>Risk</th>
                                            <th>Prediction</th>
                                            <th>Root Cause (SHAP)</th>
                                            <th>Business Summary (AI) & Recommendation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {realtimeEvents.map((evt, idx) => (
                                            <tr key={`${evt.timestamp}-${idx}`} style={{
                                                animation: idx === 0 ? 'row-in 0.35s ease' : 'none',
                                                ...(String(evt.risk).toUpperCase() === 'HIGH'
                                                    ? { borderLeft: '3px solid var(--status-error)', background: 'rgba(250,82,82,0.04)' }
                                                    : {}),
                                            }}>
                                                <td style={{ fontFamily: 'var(--mono)', fontSize: '12px', whiteSpace: 'nowrap', opacity: 0.65 }}>
                                                    {fmt(evt.timestamp)}
                                                </td>
                                                <td><strong>{evt.event}</strong></td>
                                                <td><code style={{ fontFamily: 'var(--mono)' }}>{evt.warehouse}</code></td>
                                                <td>
                                                    <span className={`badge ${riskBadge(evt.risk)}`}>{evt.risk}</span>
                                                </td>
                                                <td style={{ fontSize: '13px' }}>{evt.prediction}</td>
                                                <td style={{ fontSize: '12px', whiteSpace: 'pre-line', fontFamily: 'var(--mono)', maxWidth: '220px' }}>
                                                    {evt.root_cause}
                                                </td>
                                                <td style={{ maxWidth: '300px', fontSize: '13px' }}>
                                                    {evt.explanation && (
                                                        <div style={{ marginBottom: '6px', fontWeight: '500', color: 'var(--text-h)' }}>
                                                            ✨ {evt.explanation}
                                                        </div>
                                                    )}
                                                    <div style={{ 
                                                        color: String(evt.risk).toUpperCase() === 'HIGH' ? 'var(--status-error)' : 'var(--text)',
                                                        fontSize: '11px',
                                                        opacity: evt.explanation ? 0.75 : 1
                                                    }}>
                                                        <strong>Action:</strong> {evt.recommendation}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes row-in {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes ws-pulse {
                    0%, 100% { opacity: 1; }
                    50%       { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
