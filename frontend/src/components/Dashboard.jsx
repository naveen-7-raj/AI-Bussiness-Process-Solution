import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useFetch } from '../hooks/useFetch';
import { SparkLine, BarChart } from './Charts';

// ─── constants ────────────────────────────────────────────────────────────────
const POLL_MS    = 15_000;
const TREND_MS   = 30_000;

const WAREHOUSE_NAMES = {
    'WH01': 'Chennai Central Hub',
    'WH02': 'Coimbatore Logistics Hub',
    'WH03': 'Bengaluru Distribution Center',
    'WH04': 'Kochi Regional Warehouse',
    'WH05': 'Hyderabad South Zone Hub',
};

// ─── small helpers ─────────────────────────────────────────────────────────────
const riskBadge = (risk) => {
    if (!risk) return 'neutral';
    const r = String(risk).toUpperCase();
    if (r === 'HIGH' || r === 'OVERLOADED') return 'error';
    if (r === 'MEDIUM')                     return 'warning';
    return 'success';
};

const fmt = (ts) => {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    catch { return ts; }
};

const formatEventDescription = (evt) => {
    const type = (evt.event_type || '').toLowerCase();
    const wid = evt.warehouse_id ? ` at ${evt.warehouse_id}` : '';
    const pid = evt.product_id ? ` for ${evt.product_id}` : '';

    if (type === 'demand_spike' || type === 'demand') {
        return `Order Velocity Surge${wid}`;
    }
    if (type === 'inventory_shortage' || type === 'inventory') {
        return `Inventory Shortage Alert${pid}${wid}`;
    }
    if (type === 'warehouse_overload' || type === 'warehouse') {
        return `Processing Congestion & Backlog Surge${wid}`;
    }
    if (type === 'order_created' || type === 'orders') {
        return `New Order Ingested${pid ? ` (${evt.product_id})` : ''}${wid}`;
    }
    return (evt.event_type || 'Operational Event')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase()) + wid;
};

// ─── sub-components ────────────────────────────────────────────────────────────
const KpiCard = ({ title, value, sub, subClass = 'neutral', loading }) => (
    <div className="stat-card">
        <div className="stat-title">
            <span>{title}</span>
        </div>
        <div className="stat-value" style={loading ? { opacity: 0.3 } : {}}>
            {loading ? '…' : (value ?? '—')}
        </div>
        {sub && <div className={`stat-change ${subClass}`}>{sub}</div>}
    </div>
);

const SectionHeader = ({ title, sub, badge, badgeClass = 'info' }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{title}</h3>
            {sub && <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
        {badge != null && <span className={`badge ${badgeClass}`}>{badge}</span>}
    </div>
);

// ─── main component ─────────────────────────────────────────────────────────────
const Dashboard = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const userAssignedFacility = user?.assigned_facility || 'WH01';

    const [facilityScope, setFacilityScope] = useState('ALL');

    // live WS feed
    const { events: realtimeEvents, connected: wsConnected, clearEvents } = useWebSocket();

    // Consolidated dashboard summary endpoint (falls back gracefully to individual endpoints)
    const { data: summaryData, loading: summaryLoading } = useFetch('/api/dashboard/summary', token, POLL_MS);
    const { data: statsFallback, loading: statsLoading } = useFetch('/api/stats', token, POLL_MS);

    const stats = summaryData?.stats ?? statsFallback;
    const hrData = summaryData ? { high_risk_warehouses: summaryData.high_risk_warehouses } : null;
    const ordTrend = summaryData?.orders_trend;
    const invTrend = summaryData?.inventory_trend;
    const wrhRisk = summaryData?.warehouse_risk_trend;

    const loadingAll = summaryLoading && statsLoading;

    // derived chart series
    const orderSeries = useMemo(() =>
        (ordTrend?.trend ?? []).map(p => p.order_count), [ordTrend]);

    const invSeries = useMemo(() =>
        (invTrend?.trend ?? []).map(p => p.total_qty), [invTrend]);

    const riskItems = useMemo(() =>
        (wrhRisk?.warehouses ?? [])
            .filter(w => facilityScope === 'ALL' || w.warehouse_id === facilityScope)
            .map(w => ({
                label: w.warehouse_id,
                value: w.avg_risk_pct ?? 0,
                pct: w.avg_risk_pct ?? 0,
                count: w.sample_count,
            })), [wrhRisk, facilityScope]);

    const rawHighRisk = hrData?.high_risk_warehouses ?? hrData?.warehouses ?? [];
    const highRisk = useMemo(() =>
        rawHighRisk.filter(w => facilityScope === 'ALL' || w.warehouse_id === facilityScope),
        [rawHighRisk, facilityScope]
    );

    const filteredWsEvents = useMemo(() =>
        realtimeEvents.filter(e => facilityScope === 'ALL' || e.warehouse_id === facilityScope),
        [realtimeEvents, facilityScope]
    );

    const wsHighCount = filteredWsEvents.filter(e => String(e.risk).toUpperCase() === 'HIGH').length;

    return (
        <div>
            {/* ── Page Header & Facility Scope Toggle ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '4px' }}>
                        Operational Overview
                    </h1>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                        Real-time process telemetry, order velocity, and predictive risk distribution.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', background: 'var(--bg-subtle, #f1f5f9)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <button
                            onClick={() => setFacilityScope('ALL')}
                            style={{
                                padding: '4px 10px',
                                fontSize: '12px',
                                fontWeight: 500,
                                borderRadius: '4px',
                                border: 'none',
                                cursor: 'pointer',
                                background: facilityScope === 'ALL' ? '#ffffff' : 'transparent',
                                color: facilityScope === 'ALL' ? 'var(--text-h)' : 'var(--text-muted)',
                                boxShadow: facilityScope === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            🌐 All Network Hubs
                        </button>
                        <button
                            onClick={() => setFacilityScope(userAssignedFacility)}
                            style={{
                                padding: '4px 10px',
                                fontSize: '12px',
                                fontWeight: 500,
                                borderRadius: '4px',
                                border: 'none',
                                cursor: 'pointer',
                                background: facilityScope !== 'ALL' ? '#ffffff' : 'transparent',
                                color: facilityScope !== 'ALL' ? 'var(--text-h)' : 'var(--text-muted)',
                                boxShadow: facilityScope !== 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            📍 My Assigned Hub ({userAssignedFacility})
                        </button>
                    </div>
                    <span className={`badge ${wsConnected ? 'success' : 'warning'}`}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: wsConnected ? 'var(--status-success)' : 'var(--status-warning)', display: 'inline-block' }}></span>
                        {wsConnected ? 'Kafka Live' : 'Connecting'}
                    </span>
                </div>
            </div>

            {/* Scope Info Banner when assigned hub selected */}
            {facilityScope !== 'ALL' && (
                <div className="card" style={{ marginBottom: '16px', padding: '10px 14px', background: 'var(--bg-surface, #ffffff)', borderColor: 'var(--brand-blue, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                        <span className="badge info" style={{ fontSize: '11px' }}>Facility View</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                            {userAssignedFacility} — {WAREHOUSE_NAMES[userAssignedFacility] || 'Regional Facility'}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            (Showing telemetry, high-risk anomalies, and live events filtered specifically for your assigned hub)
                        </span>
                    </div>
                    <button
                        onClick={() => setFacilityScope('ALL')}
                        style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                    >
                        Reset to Global Network →
                    </button>
                </div>
            )}

            {/* ── KPI Grid ── */}
            <div className="grid-cards">
                <KpiCard
                    title="Total Orders"
                    value={stats?.total_orders?.toLocaleString()}
                    sub="Cumulative logged"
                    loading={statsLoading}
                />
                <KpiCard
                    title="Active Backlog"
                    value={stats?.total_backlog != null ? Number(stats.total_backlog).toLocaleString() : '—'}
                    sub={(stats?.total_backlog ?? 0) > 20 ? 'Above baseline' : 'Normal volume'}
                    subClass={(stats?.total_backlog ?? 0) > 20 ? 'negative' : 'positive'}
                    loading={statsLoading}
                />
                <KpiCard
                    title="High-Risk Warehouses"
                    value={highRisk.length}
                    sub={highRisk.length > 0 ? 'Requires attention' : 'All nominal'}
                    subClass={highRisk.length > 0 ? 'negative' : 'positive'}
                    loading={hrLoading}
                />
                <KpiCard
                    title="High-Risk Events"
                    value={wsHighCount}
                    sub="Current stream session"
                    subClass={wsHighCount > 0 ? 'negative' : 'positive'}
                />
            </div>

            {/* ── Telemetry Trends Grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div className="card" style={{ margin: 0 }}>
                    <SectionHeader
                        title="Order Ingestion Velocity"
                        sub="Hourly volume trend"
                        badge={`${orderSeries.reduce((a, b) => a + b, 0)} total`}
                    />
                    <div style={{ height: '90px', display: 'flex', alignItems: 'center' }}>
                        <SparkLine data={orderSeries} color="var(--text-h)" height={70} />
                    </div>
                </div>

                <div className="card" style={{ margin: 0 }}>
                    <SectionHeader
                        title="Total Inventory On-Hand"
                        sub="Global stock level trend"
                        badge={`${invSeries[invSeries.length - 1] ?? '—'} units`}
                    />
                    <div style={{ height: '90px', display: 'flex', alignItems: 'center' }}>
                        <SparkLine data={invSeries} color="var(--brand-blue)" height={70} />
                    </div>
                </div>

                <div className="card" style={{ margin: 0 }}>
                    <SectionHeader
                        title="Warehouse Risk Index"
                        sub="Failure probability (%) — Click bar to view actions"
                        badge={`${riskItems.length} sites`}
                    />
                    <div style={{
                        height: '90px',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        paddingRight: '4px',
                        boxSizing: 'border-box',
                    }}>
                        <BarChart
                            items={riskItems}
                            onItemClick={(wid) => navigate(`/recommendations?facility=${wid}`)}
                        />
                    </div>
                </div>
            </div>

            {/* ── High-Risk Facilities & Live Events ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {/* High-Risk Warehouses Table with Direct Action Deep-Links */}
                <div className="card" style={{ margin: 0 }}>
                    <SectionHeader
                        title="High-Risk Facilities"
                        sub="Active backlogs and capacity constraints — Click facility to view prescribed actions"
                        badge={highRisk.length}
                        badgeClass={highRisk.length > 0 ? 'error' : 'success'}
                    />
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Warehouse</th>
                                    <th>Status</th>
                                    <th>Backlog</th>
                                    <th>Avg Delay Prob</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {highRisk.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                                            No critical facility risks detected.
                                        </td>
                                    </tr>
                                ) : (
                                    highRisk.map((w) => {
                                        const delayVal = w.avg_delay_risk_pct ?? w.risk_pct;
                                        return (
                                            <tr
                                                key={w.warehouse_id}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => navigate(`/recommendations?facility=${w.warehouse_id}`)}
                                                title={`Click to view recommendations for ${w.warehouse_id}`}
                                            >
                                                <td style={{ fontWeight: 600, fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--text-h)' }}>
                                                    {w.warehouse_id}
                                                </td>
                                                <td>
                                                    <span className={`badge ${riskBadge(w.status)}`}>
                                                        {w.status}
                                                    </span>
                                                </td>
                                                <td style={{ fontFamily: 'var(--mono)' }}>{w.backlog_orders ?? 0}</td>
                                                <td>
                                                    <span style={{
                                                        fontFamily: 'var(--mono)',
                                                        fontWeight: 600,
                                                        color: (delayVal ?? 0) >= 70 ? 'var(--status-error)' : 'var(--status-warning)'
                                                    }}>
                                                        {delayVal != null ? `${Number(delayVal).toFixed(1)}%` : '—'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/recommendations?facility=${w.warehouse_id}`);
                                                        }}
                                                        className="btn-secondary"
                                                        style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}
                                                    >
                                                        View Actions →
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Real-Time Event Feed with Business-Friendly Language */}
                <div className="card" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Live Telemetry Stream</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                Real-time operational event stream ({realtimeEvents.length} events logged)
                            </p>
                        </div>
                        {realtimeEvents.length > 0 && (
                            <button
                                onClick={clearEvents}
                                className="btn-secondary"
                                style={{ fontSize: '11px', padding: '3px 8px' }}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {realtimeEvents.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                Awaiting incoming Kafka events…
                            </div>
                        ) : (
                            realtimeEvents.slice(0, 15).map((evt, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '9px 12px',
                                        background: 'var(--bg-subtle)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '12px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span className={`badge ${riskBadge(evt.risk)}`} style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                                            {evt.risk || 'INFO'}
                                        </span>
                                        <span style={{ fontWeight: 500, color: 'var(--text-h)' }}>
                                            {formatEventDescription(evt)}
                                        </span>
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--mono)', marginLeft: '8px', whiteSpace: 'nowrap' }}>
                                        {fmt(evt.timestamp)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
