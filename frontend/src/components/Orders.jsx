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

const Orders = () => {
    const { token } = useAuth();
    const { data, loading, error, refresh } = useFetch('/api/orders', token, 10000);
    const { data: invData } = useFetch('/api/inventory', token, 15000);
    const { data: whData } = useFetch('/api/warehouses', token, 15000);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [warehouseId, setWarehouseId] = useState('WH01');
    const [productId, setProductId] = useState('P001');
    const [quantity, setQuantity] = useState(5);
    const [customer, setCustomer] = useState('Nexora Enterprise Client');
    const [submitting, setSubmitting] = useState(false);
    const [actionMsg, setActionMsg] = useState(null);

    const [timeRange, setTimeRange] = useState('7d');
    const [sortOrder, setSortOrder] = useState('desc');
    const orders = data?.orders || [];
    const warehouses = whData?.warehouses || [
        { warehouse_id: 'WH01' },
        { warehouse_id: 'WH02' },
        { warehouse_id: 'WH03' },
        { warehouse_id: 'WH04' },
        { warehouse_id: 'WH05' },
    ];

    const filteredOrders = orders.filter(ord => filterByTimeRange(ord.created_at, timeRange));
    const sortedOrders = [...filteredOrders].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        const validA = !isNaN(timeA) ? timeA : 0;
        const validB = !isNaN(timeB) ? timeB : 0;
        return sortOrder === 'desc' ? validB - validA : validA - validB;
    });

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setActionMsg(null);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    warehouse_id: warehouseId,
                    product_id: productId,
                    quantity: parseInt(quantity, 10),
                    customer,
                }),
            });

            if (!res.ok) throw new Error(`Failed to create order (HTTP ${res.status})`);
            const result = await res.json();
            setActionMsg({ type: 'success', text: `Order ${result.order_id} created successfully! Stock updated.` });
            setIsModalOpen(false);
            refresh();
        } catch (err) {
            setActionMsg({ type: 'error', text: err.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Orders Management</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', opacity: 0.7 }}>
                        Live PostgreSQL dispatch flow with inventory decrement
                    </p>
                </div>
                <button onClick={() => setIsModalOpen(true)}>+ Create Order</button>
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

            {/* Create Order Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '480px', margin: 0, padding: '28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>Create New Dispatch Order</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Target Warehouse / Facility</label>
                                <select 
                                    value={warehouseId} 
                                    onChange={(e) => setWarehouseId(e.target.value)}
                                    style={{ width: '100%' }}
                                    required
                                >
                                    {warehouses.map(w => (
                                        <option key={w.warehouse_id} value={w.warehouse_id}>
                                            {w.warehouse_id} — {WAREHOUSE_NAMES[w.warehouse_id] || w.warehouse_id}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Product SKU</label>
                                <input
                                    type="text"
                                    placeholder="e.g. P001"
                                    value={productId}
                                    onChange={(e) => setProductId(e.target.value.toUpperCase())}
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Quantity to Dispatch</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="500"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Customer / Partner</label>
                                <input
                                    type="text"
                                    value={customer}
                                    onChange={(e) => setCustomer(e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}>
                                    {submitting ? 'Placing Order…' : 'Submit & Deduct Stock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Sorting & Time Range Filter Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-h)', fontWeight: 600 }}>
                    Dispatch Orders ({sortedOrders.length})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <CustomDropdown
                        id="orders-timerange-dropdown"
                        label="Time Range:"
                        options={TIME_RANGE_OPTIONS}
                        value={timeRange}
                        onChange={setTimeRange}
                    />

                    <CustomDropdown
                        id="orders-sort-dropdown"
                        label="Sort: Date / Time"
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
                            <th>Order ID</th>
                            <th>Warehouse / Facility</th>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Date / Time</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>Loading orders from PostgreSQL…</td></tr>
                        )}
                        {!loading && sortedOrders.length === 0 && (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px', opacity: 0.6 }}>No orders found. Click "Create Order" to create one.</td></tr>
                        )}
                        {!loading && sortedOrders.map(ord => (
                            <tr key={ord.order_id}>
                                <td><code style={{ fontFamily: 'var(--mono)', fontWeight: 'bold' }}>{ord.order_id}</code></td>
                                <td>{WAREHOUSE_NAMES[ord.warehouse_id] || ord.warehouse_id}</td>
                                <td><span className="badge info">{ord.product_id}</span></td>
                                <td><strong>{ord.quantity} units</strong></td>
                                <td style={{ fontSize: '12px', opacity: 0.8 }}>
                                    {ord.created_at ? new Date(ord.created_at).toLocaleString() : '—'}
                                </td>
                                <td>
                                    <span className={`badge ${ord.status === 'CREATED' || ord.status === 'COMPLETED' ? 'success' : 'warning'}`}>
                                        {ord.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Orders;
