import React from 'react';

const Orders = () => {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>Orders Management</h2>
                <button>Create Order</button>
            </div>
            
            <div className="card table-container" style={{ padding: 0 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>#ORD-8923</td>
                            <td>Acme Corp</td>
                            <td>Oct 24, 2026</td>
                            <td>$1,250.00</td>
                            <td><span className="badge success">Completed</span></td>
                        </tr>
                        <tr>
                            <td>#ORD-8924</td>
                            <td>Globex</td>
                            <td>Oct 24, 2026</td>
                            <td>$840.00</td>
                            <td><span className="badge warning">Processing</span></td>
                        </tr>
                        <tr>
                            <td>#ORD-8925</td>
                            <td>Initech</td>
                            <td>Oct 23, 2026</td>
                            <td>$3,420.00</td>
                            <td><span className="badge error">Delayed</span></td>
                        </tr>
                        <tr>
                            <td>#ORD-8926</td>
                            <td>Soylent</td>
                            <td>Oct 22, 2026</td>
                            <td>$150.00</td>
                            <td><span className="badge success">Completed</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Orders;
