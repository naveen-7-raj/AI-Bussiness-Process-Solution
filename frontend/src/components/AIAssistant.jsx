import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

const AIAssistant = () => {
    const { token, logout } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            text: 'Hello! I am your Nexora BPI Process Copilot. I have live access to your inventory, order streams, warehouse facility loads, XGBoost predictions, and active operational recommendations. How can I assist your operations today?'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e?.preventDefault();
        const query = input.trim();
        if (!query || loading) return;

        const userMsg = { role: 'user', text: query };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const authToken = token || localStorage.getItem('token');
        if (!authToken) {
            logout();
            navigate('/login');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/copilot/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({ question: query }),
            });

            if (res.status === 401) {
                logout();
                navigate('/login');
                return;
            }

            if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
            const data = await res.json();
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: data.answer,
                source: data.source
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: `✕ Unable to retrieve operations intelligence: ${err.message}`,
                isError: true
            }]);
        } finally {
            setLoading(false);
        }
    };

    const sampleQueries = [
        "What is the current inventory situation?",
        "Which warehouse has the highest load?",
        "Which products have shortage risk?",
        "What recommendations are currently active?"
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Process Copilot Intelligence</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', opacity: 0.7 }}>
                        Context-grounded operational reasoning with live PostgreSQL telemetry
                    </p>
                </div>
            </div>

            {/* Quick Prompt Badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {sampleQueries.map((q, idx) => (
                    <button
                        key={idx}
                        onClick={() => { setInput(q); }}
                        className="btn-secondary btn-sm"
                        style={{
                            borderRadius: '16px',
                            fontWeight: 400,
                            color: 'var(--text)'
                        }}
                    >
                        {q}
                    </button>
                ))}
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '580px', padding: 0 }}>
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>
                    {messages.map((m, idx) => (
                        <div
                            key={idx}
                            style={{
                                marginBottom: '16px',
                                display: 'flex',
                                gap: '12px',
                                flexDirection: m.role === 'user' ? 'row-reverse' : 'row'
                            }}
                        >
                            <div
                                style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '6px',
                                    backgroundColor: m.role === 'user' ? 'var(--text)' : 'var(--text-h)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                    flexShrink: 0,
                                    letterSpacing: '-0.5px'
                                }}
                            >
                                {m.role === 'user' ? 'OP' : 'NX'}
                            </div>
                            <div
                                style={{
                                    backgroundColor: m.role === 'user' ? 'var(--accent-bg)' : 'var(--bg-surface)',
                                    padding: '12px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    border: `1px solid ${m.role === 'user' ? 'var(--accent-border, var(--border))' : 'var(--border)'}`,
                                    maxWidth: '80%',
                                    whiteSpace: 'pre-line',
                                    lineHeight: '1.5'
                                }}
                            >
                                <p style={{ margin: 0, fontSize: '13px', color: m.isError ? 'var(--status-error)' : 'var(--text-h)' }}>
                                    {m.text}
                                </p>
                                {m.source && (
                                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                                        Grounded via {m.source}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: 'var(--text-h)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px' }}>NX</div>
                            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Evaluating operational context…</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSend} style={{ padding: '16px', display: 'flex', gap: '12px', backgroundColor: 'var(--bg-surface)' }}>
                    <input
                        type="text"
                        placeholder="Ask about inventory, high load warehouses, shortages, predictions, or active recommendations..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        aria-label="Ask Process Copilot a question"
                        style={{ flex: 1 }}
                        disabled={loading}
                    />
                    <button type="submit" aria-label="Send query to Process Copilot" disabled={loading || !input.trim()}>
                        {loading ? 'Thinking…' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIAssistant;
