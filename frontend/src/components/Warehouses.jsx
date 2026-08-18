import React from 'react';

const Warehouses = () => {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>Warehouses & Facilities</h2>
                <button>Add Facility</button>
            </div>
            
            <div className="grid-cards">
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="card-header">
                        <h3>East Coast Hub (NY)</h3>
                        <span className="badge success">Optimal</span>
                    </div>
                    <p>Capacity: 84%</p>
                    <p>Fulfillment Rate: 99.2%</p>
                </div>
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="card-header">
                        <h3>West Coast Hub (CA)</h3>
                        <span className="badge warning">High Load</span>
                    </div>
                    <p>Capacity: 92%</p>
                    <p>Fulfillment Rate: 95.8%</p>
                </div>
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="card-header">
                        <h3>Central Hub (TX)</h3>
                        <span className="badge success">Optimal</span>
                    </div>
                    <p>Capacity: 45%</p>
                    <p>Fulfillment Rate: 99.8%</p>
                </div>
            </div>
        </div>
    );
};

export default Warehouses;
