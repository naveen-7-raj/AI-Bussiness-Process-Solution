import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const SystemCard = ({ title, status, dataSource, lastEvent, eventsReceived, onTest }) => {
    return (
        <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>{title}</h3>
                <span className={`badge ${status === 'Connected' ? 'success' : 'error'}`}>
                    {status}
                </span>
            </div>
            
            <div style={{ marginTop: '16px', fontSize: '13px', lineHeight: '1.6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.7 }}>Data Source:</span>
                    <strong>{dataSource}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.7 }}>Last Event:</span>
                    <span>{lastEvent ? new Date(lastEvent).toLocaleTimeString() : 'Waiting...'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.7 }}>Events Received:</span>
                    <strong>{eventsReceived}</strong>
                </div>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <button 
                    onClick={onTest}
                    style={{ 
                        width: '100%', 
                        backgroundColor: 'transparent', 
                        color: 'var(--text)', 
                        border: '1px solid var(--border)' 
                    }}
                >
                    Test Connection
                </button>
            </div>
        </div>
    );
};

const DataIntegration = () => {
    const { events, connected } = useWebSocket();
    const [stats, setStats] = useState({
        Orders: { count: 0, lastEvent: null },
        Inventory: { count: 0, lastEvent: null },
        Warehouse: { count: 0, lastEvent: null },
        Logistics: { count: 0, lastEvent: null },
    });

    const lastSeenTs = useRef(null);

    useEffect(() => {
        if (!events || events.length === 0) return;
        
        const latest = events[0];
        if (latest.timestamp === lastSeenTs.current) return;
        lastSeenTs.current = latest.timestamp;

        setStats(prev => {
            const next = { ...prev };
            const evtName = latest.event.toLowerCase();
            let sys = null;

            if (evtName.includes('order') || evtName.includes('demand')) {
                sys = 'Orders';
            } else if (evtName.includes('inventory')) {
                sys = 'Inventory';
            } else if (evtName.includes('warehouse')) {
                sys = 'Warehouse';
            } else if (evtName.includes('logistics')) {
                sys = 'Logistics';
            }

            if (sys) {
                next[sys] = {
                    count: next[sys].count + 1,
                    lastEvent: latest.timestamp
                };
            }
            return next;
        });

    }, [events]);

    const handleTest = (sysName) => {
        alert(`Testing connection to ${sysName}...\\n[Prototype] Ping successful via local websocket.`);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Data Pipeline Integrations</h2>
                    <p style={{ margin: '4px 0 0', opacity: 0.6, maxWidth: '600px' }}>
                        Configure connections to external enterprise systems. The future architecture supports authorized API and webhook credentials via environment variables.
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span className="badge warning" style={{ marginBottom: '8px', display: 'inline-block' }}>
                        PROTOTYPE DATA SOURCE
                    </span>
                    <br/>
                    <span className="badge info">
                        FUTURE ENTERPRISE API / WEBHOOK
                    </span>
                </div>
            </div>

            <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                <SystemCard 
                    title="Order Management System"
                    status={connected ? 'Connected' : 'Disconnected'}
                    dataSource="Python ERP Simulator (Orders)"
                    lastEvent={stats.Orders.lastEvent}
                    eventsReceived={stats.Orders.count}
                    onTest={() => handleTest('Order Management System')}
                />
                
                <SystemCard 
                    title="Inventory System"
                    status={connected ? 'Connected' : 'Disconnected'}
                    dataSource="Python ERP Simulator (Inventory)"
                    lastEvent={stats.Inventory.lastEvent}
                    eventsReceived={stats.Inventory.count}
                    onTest={() => handleTest('Inventory System')}
                />

                <SystemCard 
                    title="Warehouse Management System"
                    status={connected ? 'Connected' : 'Disconnected'}
                    dataSource="Python ERP Simulator (Warehouse)"
                    lastEvent={stats.Warehouse.lastEvent}
                    eventsReceived={stats.Warehouse.count}
                    onTest={() => handleTest('Warehouse Management System')}
                />

                <SystemCard 
                    title="Logistics System"
                    status={connected ? 'Connected' : 'Disconnected'}
                    dataSource="Python ERP Simulator (Logistics)"
                    lastEvent={stats.Logistics.lastEvent}
                    eventsReceived={stats.Logistics.count}
                    onTest={() => handleTest('Logistics System')}
                />
            </div>
            
            <div style={{ marginTop: '32px', padding: '20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ margin: '0 0 12px 0' }}>Integration Architecture Notes</h4>
                <p style={{ margin: 0, opacity: 0.8, fontSize: '14px', lineHeight: '1.6' }}>
                    This prototype uses a local Python simulator to generate realistic Kafka events across the 4 primary operational domains. 
                    No complicated enterprise authentication is implemented here. In a production environment, you would provide OAuth2, API Keys, or Webhook secrets via secure environment variables to connect to actual SAP, Salesforce, or custom ERP endpoints.
                </p>
            </div>
        </div>
    );
};

export default DataIntegration;
