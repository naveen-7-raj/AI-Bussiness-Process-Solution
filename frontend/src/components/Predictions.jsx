import React from 'react';

const Predictions = () => {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>Demand Predictions</h2>
                <button>Run New Model</button>
            </div>
            
            <div className="card">
                <div className="card-header">
                    <h3>Q4 Demand Forecast</h3>
                </div>
                <div className="chart-placeholder">
                    [Time Series Forecasting Chart]
                </div>
            </div>

            <div className="grid-cards">
                <div className="stat-card">
                    <span className="stat-title">Expected Peak</span>
                    <span className="stat-value">Nov 24</span>
                </div>
                <div className="stat-card">
                    <span className="stat-title">Confidence Score</span>
                    <span className="stat-value">91%</span>
                </div>
            </div>
        </div>
    );
};

export default Predictions;
