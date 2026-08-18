import React from 'react';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
    const { logout } = useAuth();

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>System Settings</h2>
            </div>
            
            <div className="card">
                <div className="card-header">
                    <h3>Account Preferences</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Email Notifications</label>
                        <select style={{ width: '100%' }}>
                            <option>All Alerts</option>
                            <option>Critical Only</option>
                            <option>None</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Timezone</label>
                        <select style={{ width: '100%' }}>
                            <option>UTC (Default)</option>
                            <option>America/New_York</option>
                            <option>America/Los_Angeles</option>
                        </select>
                    </div>
                    <button style={{ width: 'fit-content' }}>Save Changes</button>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 style={{ color: 'var(--status-error)' }}>Danger Zone</h3>
                </div>
                <button 
                    onClick={logout}
                    style={{ backgroundColor: 'var(--status-error)' }}
                >
                    Sign Out Everywhere
                </button>
            </div>
        </div>
    );
};

export default Settings;
