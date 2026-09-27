import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

/* ─── helpers ───────────────────────────────────────────── */
const riskClass = (risk) => {
    if (!risk) return 'info';
    const r = risk.toUpperCase();
    if (r === 'HIGH')   return 'error';
    if (r === 'MEDIUM') return 'warning';
    return 'success';
};

const fmt = (ts) => {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleTimeString(); } catch { return ts; }
};

/* ─── component ─────────────────────────────────────────── */
const LiveEvents = () => {
    const { events, connected, clearEvents } = useWebSocket();

    return (
        <div>
            {/* ── header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Live Event Stream</h2>
                    <p style={{ margin: '4px 0 0', opacity: 0.6, fontSize: '13px' }}>
                        Kafka → Consumer → FastAPI → Prediction → SHAP → Recommendation → WebSocket
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span className={`badge ${connected ? 'success' : 'warning'}`}>
                        <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: connected ? 'var(--status-success)' : 'var(--status-warning)', display: 'inline-block' }} />
                        {connected ? 'Live Stream Active' : 'Reconnecting to Stream'}
                    </span>
                    {events.length > 0 && (
                        <button
                            onClick={clearEvents}
                            className="btn-secondary btn-sm"
                        >
                            Clear Events
                        </button>
                    )}
                </div>
            </div>

            {/* ── event count summary ── */}
            {events.length > 0 && (
                <div className="grid-cards" style={{ marginBottom: '16px' }}>
                    {[
                        { label: 'Total Ingested Events',  value: events.length,                                                   cls: 'info'    },
                        { label: 'High Risk',              value: events.filter(e => e.risk?.toUpperCase() === 'HIGH').length,    cls: 'error'   },
                        { label: 'Medium Risk',            value: events.filter(e => e.risk?.toUpperCase() === 'MEDIUM').length,  cls: 'warning' },
                        { label: 'Nominal / Low',          value: events.filter(e => !['HIGH','MEDIUM'].includes(e.risk?.toUpperCase())).length, cls: 'success' },
                    ].map(({ label, value, cls }) => (
                        <div key={label} className="stat-card">
                            <span className="stat-title">{label}</span>
                            <span className="stat-value" style={{ fontSize: '22px' }}>{value}</span>
                            <span className={`badge ${cls}`} style={{ alignSelf: 'flex-start', marginTop: '6px' }}>{label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── main table ── */}
            <div className="card table-container" style={{ padding: 0 }}>
                {events.length === 0 ? (
                    <div className="empty-state" style={{ padding: '64px 24px' }}>
                        <div className="empty-state-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                        </div>
                        <div className="empty-state-title">Awaiting Inbound Telemetry</div>
                        <p className="empty-state-desc">
                            Listening on WebSocket channel for real-time Kafka event streams across operational topics.
                        </p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Event</th>
                                <th>Warehouse</th>
                                <th>Risk</th>
                                <th>ML Prediction</th>
                                <th>Root Cause (SHAP)</th>
                                <th>Business Summary (AI) & Recommendation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((evt, idx) => (
                                <tr
                                    key={`${evt.timestamp}-${idx}`}
                                    style={{
                                        animation: idx === 0 ? 'row-in 0.35s ease' : 'none',
                                    }}
                                >
                                    <td style={{ fontFamily: 'var(--mono)', fontSize: '12px', whiteSpace: 'nowrap', opacity: 0.7 }}>
                                        {fmt(evt.timestamp)}
                                    </td>
                                    <td><strong>{evt.event}</strong></td>
                                    <td><code style={{ fontFamily: 'var(--mono)' }}>{evt.warehouse}</code></td>
                                    <td>
                                        <span className={`badge ${riskClass(evt.risk)}`}>
                                            {evt.risk ?? '—'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '13px' }}>{evt.prediction}</td>
                                    <td style={{ fontSize: '12px', whiteSpace: 'pre-line', fontFamily: 'var(--mono)', maxWidth: '260px' }}>
                                        {evt.root_cause}
                                    </td>
                                    <td style={{ maxWidth: '300px', fontSize: '13px' }}>
                                        {evt.explanation && (
                                            <div style={{ marginBottom: '6px', fontWeight: 500, color: 'var(--text-h)' }}>
                                                {evt.explanation}
                                            </div>
                                        )}
                                        <div style={{ 
                                            color: evt.risk?.toUpperCase() === 'HIGH' ? 'var(--status-error)' : 'var(--text)',
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
                )}
            </div>

            {/* ── animations ── */}
            <style>{`
                @keyframes row-in {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes ws-pulse {
                    0%, 100% { opacity: 1; }
                    50%       { opacity: 0.55; }
                }
            `}</style>
        </div>
    );
};

export default LiveEvents;
