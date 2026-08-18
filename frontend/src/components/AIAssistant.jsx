import React from 'react';

const AIAssistant = () => {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>AI Assistant</h2>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '600px', padding: 0 }}>
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>
                    <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>AI</div>
                        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', maxWidth: '80%' }}>
                            <p style={{ margin: 0 }}>Hello! I am your AI Business Process Intelligence assistant. I can help you analyze data, explain predictions, or assist with configurations. How can I help you today?</p>
                        </div>
                    </div>
                    <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexDirection: 'row-reverse' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--text)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>You</div>
                        <div style={{ backgroundColor: 'var(--accent-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--accent-border)', maxWidth: '80%' }}>
                            <p style={{ margin: 0 }}>Why did SKU-1002 stock drop so quickly?</p>
                        </div>
                    </div>
                    <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>AI</div>
                        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', maxWidth: '80%' }}>
                            <p style={{ margin: 0 }}>Based on recent CRM data, there was an unexpected bulk order from 'Globex' (Order #ORD-8924) that depleted the West Coast Hub inventory. The predictive model has already suggested reallocating from the Central Hub to compensate.</p>
                        </div>
                    </div>
                </div>
                <div style={{ padding: '16px', display: 'flex', gap: '12px', backgroundColor: 'var(--bg-surface)' }}>
                    <input type="text" placeholder="Ask a question..." style={{ flex: 1 }} />
                    <button>Send</button>
                </div>
            </div>
        </div>
    );
};

export default AIAssistant;
