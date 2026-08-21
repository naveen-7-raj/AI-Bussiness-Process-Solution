import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';

const WAREHOUSE_NAMES = {
    'WH01': 'Chennai Central Warehouse',
    'WH02': 'Coimbatore Distribution Center',
    'WH03': 'Bengaluru South Warehouse',
    'WH04': 'Kochi Regional Warehouse',
    'WH05': 'Hyderabad South Zone Warehouse',
};

const Warehouses = () => {
    const { token } = useAuth();
    const { data, loading, error, refresh } = useFetch('/api/warehouses', token, 10000);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [facilityId, setFacilityId] = useState('');
    const [facilityName, setFacilityName] = useState('');
    const [backlog, setBacklog] = useState(10);
    const [procTime, setProcTime] = useState(2.5);
    const [submitting, setSubmitting] = useState(false);
    const [actionMsg, setActionMsg] = useState(null);

    const warehouses = data?.warehouses || [];

    const handleAddFacility = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setActionMsg(null);
        try {
            const cleanId = facilityId.trim().toUpperCase();
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/warehouses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    warehouse_id: cleanId,
                    name: facilityName || undefined,
                    backlog_orders: parseInt(backlog, 10),
                    avg_processing_time_sec: parseFloat(procTime),
                }),
            });

            if (!res.ok) throw new Error(`Failed to add facility (HTTP ${res.status})`);
            const result = await res.json();
            setActionMsg({ type: 'success', text: `Facility ${cleanId} added successfully to network.` });
            setIsModalOpen(false);
            setFacilityId('');
            setFacilityName('');
            refresh();
        } catch (err) {
            setActionMsg({ type: 'error', text: err.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Warehouses & Distribution Facilities</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', opacity: 0.7 }}>
                        South India logistics network and live operating load
                    </p>
                </div>
                <button onClick={() => setIsModalOpen(true)}>+ Add Facility</button>
            </div>

            {actionMsg && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    backgroundColor: actionMsg.type === 'success' ? 'rgba(18, 184, 134, 0.15)' : 'rgba(250, 82, 82, 0.15)',
                    color: actionMsg.type === 'success' ? 'var(--status-success)' : 'var(--status-error)',
                    border: `1px solid ${actionMsg.type === 'success' ? 'var(--status-success)' : 'var(--status-error)'}`
                }}>
                    {actionMsg.text}
                </div>
            )}

            {/* Add Facility Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '480px', margin: 0, padding: '28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>Register New Logistics Facility</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <form onSubmit={handleAddFacility} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Facility ID (e.g. WH06)</label>
                                <input
                                    type="text"
                                    placeholder="WH06"
                                    value={facilityId}
                                    onChange={(e) => setFacilityId(e.target.value.toUpperCase())}
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Facility Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Madurai Regional Distribution Center"
                                    value={facilityName}
                                    onChange={(e) => setFacilityName(e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Initial Backlog Orders</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={backlog}
                                    onChange={(e) => setBacklog(e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Avg Processing Time (seconds)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0.5"
                                    max="15.0"
                                    value={procTime}
                                    onChange={(e) => setProcTime(e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}>
                                    {submitting ? 'Registering…' : 'Register Facility'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <div className="grid-cards">
                {loading && (
                    <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px' }}>
                        Loading warehouse network from PostgreSQL…
                    </div>
                )}
                {!loading && warehouses.map((wh) => {
                    const displayName = WAREHOUSE_NAMES[wh.warehouse_id] || `${wh.warehouse_id} Facility`;
                    const isOverloaded = wh.status === 'OVERLOADED' || wh.backlog_orders >= 20;
                    return (
                        <div key={wh.warehouse_id} className="card" style={{ marginBottom: 0 }}>
                            <div className="card-header">
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '15px' }}>{displayName}</h3>
                                    <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', opacity: 0.65 }}>ID: {wh.warehouse_id}</span>
                                </div>
                                <span className={`badge ${isOverloaded ? 'error' : 'success'}`}>
                                    {wh.status}
                                </span>
                            </div>
                            <p style={{ margin: '6px 0', fontSize: '13px' }}>
                                <strong>Backlog Orders:</strong> {wh.backlog_orders}
                            </p>
                            <p style={{ margin: '6px 0', fontSize: '13px' }}>
                                <strong>Avg Processing Time:</strong> {wh.avg_processing_time_sec}s
                            </p>
                            <p style={{ margin: '6px 0 0', fontSize: '11px', opacity: 0.6 }}>
                                Updated: {wh.last_updated ? new Date(wh.last_updated).toLocaleTimeString() : 'Active'}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Warehouses;
