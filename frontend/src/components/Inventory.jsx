import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { filterByTimeRange } from '../utils/dateFilters';
import CustomDropdown from './CustomDropdown';

const WAREHOUSE_NAMES = {
    'WH01': 'Chennai Central Warehouse',
    'WH02': 'Coimbatore Distribution Center',
    'WH03': 'Bengaluru South Warehouse',
    'WH04': 'Kochi Regional Warehouse',
    'WH05': 'Hyderabad South Zone Warehouse',
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

const Inventory = () => {
    const { token } = useAuth();
    const { data, loading, error, refresh } = useFetch('/api/inventory', token, 10000);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);

    const [timeRange, setTimeRange] = useState('7d');
    const [sortOrder, setSortOrder] = useState('desc');
    const items = data?.inventory || [];

    const totalSKUs = items.length;
    const lowStockCount = items.filter(i => i.available_quantity <= 15).length;
    const totalUnits = items.reduce((acc, i) => acc + i.available_quantity, 0);

    const filteredItems = items.filter(i => filterByTimeRange(i.updated_at, timeRange));
    const sortedItems = [...filteredItems].sort((a, b) => {
        const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        const validA = !isNaN(timeA) ? timeA : 0;
        const validB = !isNaN(timeB) ? timeB : 0;
        return sortOrder === 'desc' ? validB - validA : validA - validB;
    });

    const handleSyncERP = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/inventory/sync`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error(`ERP sync failed (HTTP ${res.status})`);
            const result = await res.json();
            setSyncResult({
                type: 'success',
                text: `✓ ${result.message} (${result.synced_records} records synced via ${result.source})`
            });
            refresh();
        } catch (err) {
            setSyncResult({
                type: 'error',
                text: `✕ Sync Failed: ${err.message}`
            });
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Inventory Status</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', opacity: 0.7 }}>
                        Multi-facility product inventory with live stock levels
                    </p>
                </div>
                <button onClick={handleSyncERP} disabled={syncing}>
                    {syncing ? '🔄 Syncing ERP Simulator…' : '🔄 Sync ERP (Demo Simulator)'}
                </button>
            </div>

            {syncResult && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    backgroundColor: syncResult.type === 'success' ? 'rgba(18, 184, 134, 0.15)' : 'rgba(250, 82, 82, 0.15)',
                    color: syncResult.type === 'success' ? 'var(--status-success)' : 'var(--status-error)',
                    border: `1px solid ${syncResult.type === 'success' ? 'var(--status-success)' : 'var(--status-error)'}`
                }}>
                    {syncResult.text}
                </div>
            )}
            
            <div className="grid-cards">
                <div className="stat-card">
                    <span className="stat-title">Total Product SKUs</span>
                    <span className="stat-value">{loading ? '…' : totalSKUs}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-title">Low Stock Alerts (≤15 units)</span>
                    <span className="stat-value" style={{ color: lowStockCount > 0 ? 'var(--status-error)' : 'var(--status-success)' }}>
                        {loading ? '…' : lowStockCount}
                    </span>
                </div>
                <div className="stat-card">
                    <span className="stat-title">Total Units Across Facilities</span>
                    <span className="stat-value">{loading ? '…' : totalUnits.toLocaleString()}</span>
                </div>
            </div>

            {/* Sorting & Time Range Filter Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-h)', fontWeight: 600 }}>
                    Stock Records ({sortedItems.length})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <CustomDropdown
                        id="inventory-timerange-dropdown"
                        label="Time Range:"
                        options={TIME_RANGE_OPTIONS}
                        value={timeRange}
                        onChange={setTimeRange}
                    />

                    <CustomDropdown
                        id="inventory-sort-dropdown"
                        label="Sort: Last Updated"
                        options={SORT_OPTIONS}
                        value={sortOrder}
                        onChange={setSortOrder}
                    />
                </div>
            </div>

            <div className="card table-container" style={{ padding: 0 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Facility</th>
                            <th>Product SKU</th>
                            <th>Stock Level</th>
                            <th>Status</th>
                            <th>Last Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>Loading inventory from PostgreSQL…</td></tr>
                        )}
                        {!loading && sortedItems.length === 0 && (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', opacity: 0.6 }}>No inventory records found. Click "Sync ERP" to populate demo stock.</td></tr>
                        )}
                        {!loading && sortedItems.map((item, idx) => (
                            <tr key={`${item.warehouse_id}-${item.product_id}-${idx}`}>
                                <td>
                                    <strong>{WAREHOUSE_NAMES[item.warehouse_id] || item.warehouse_id}</strong>
                                    <span style={{ fontSize: '11px', opacity: 0.6, marginLeft: '6px' }}>({item.warehouse_id})</span>
                                </td>
                                <td><code style={{ fontFamily: 'var(--mono)', fontWeight: 'bold' }}>{item.product_id}</code></td>
                                <td>
                                    <strong>{item.available_quantity} units</strong>
                                </td>
                                <td>
                                    {item.available_quantity <= 15 ? (
                                        <span className="badge error">Low Stock</span>
                                    ) : item.available_quantity <= 50 ? (
                                        <span className="badge warning">Moderate</span>
                                    ) : (
                                        <span className="badge success">Healthy</span>
                                    )}
                                </td>
                                <td style={{ fontSize: '12px', opacity: 0.8 }}>
                                    {item.updated_at ? new Date(item.updated_at).toLocaleString() : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Inventory;
