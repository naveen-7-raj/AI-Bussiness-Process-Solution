import React from 'react';

const Inventory = () => {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>Inventory Status</h2>
                <button>Sync ERP</button>
            </div>
            
            <div className="grid-cards">
                <div className="stat-card">
                    <span className="stat-title">Total SKUs</span>
                    <span className="stat-value">4,120</span>
                </div>
                <div className="stat-card">
                    <span className="stat-title">Low Stock Alerts</span>
                    <span className="stat-value" style={{ color: 'var(--status-error)' }}>18</span>
                </div>
                <div className="stat-card">
                    <span className="stat-title">Inventory Value</span>
                    <span className="stat-value">$1.2M</span>
                </div>
            </div>

            <div className="card table-container" style={{ padding: 0 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Stock Level</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>SKU-1001</td>
                            <td>Industrial Widget A</td>
                            <td>Components</td>
                            <td>1,240</td>
                            <td><span className="badge success">Healthy</span></td>
                        </tr>
                        <tr>
                            <td>SKU-1002</td>
                            <td>Sensor Array B</td>
                            <td>Electronics</td>
                            <td>12</td>
                            <td><span className="badge error">Low Stock</span></td>
                        </tr>
                        <tr>
                            <td>SKU-1003</td>
                            <td>Valve Assembly</td>
                            <td>Mechanical</td>
                            <td>340</td>
                            <td><span className="badge success">Healthy</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Inventory;
