import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/copilot/chat`, {
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
                        style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text)',
                            fontSize: '12px',
                            padding: '6px 12px',
                            borderRadius: '16px',
                            cursor: 'pointer'
                        }}
                    >
                        💬 {q}
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
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: m.role === 'user' ? 'var(--text)' : 'var(--accent)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '13px',
                                    flexShrink: 0
                                }}
                            >
                                {m.role === 'user' ? 'You' : 'AI'}
                            </div>
                            <div
                                style={{
                                    backgroundColor: m.role === 'user' ? 'var(--accent-bg)' : 'var(--bg-surface)',
                                    padding: '14px 18px',
                                    borderRadius: '8px',
                                    border: `1px solid ${m.role === 'user' ? 'var(--accent-border)' : 'var(--border)'}`,
                                    maxWidth: '80%',
                                    whiteSpace: 'pre-line',
                                    lineHeight: '1.5'
                                }}
                            >
                                <p style={{ margin: 0, fontSize: '13px', color: m.isError ? 'var(--status-error)' : 'var(--text-h)' }}>
                                    {m.text}
                                </p>
                                {m.source && (
                                    <div style={{ marginTop: '8px', fontSize: '11px', opacity: 0.6 }}>
                                        ✦ Grounded via {m.source}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>AI</div>
                            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <span style={{ opacity: 0.6, fontSize: '13px' }}>Analyzing live business data…</span>
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
