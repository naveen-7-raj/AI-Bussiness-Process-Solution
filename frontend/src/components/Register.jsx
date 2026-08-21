import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import LogoBrand from './LogoMark';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage('');
        setLoading(true);
        try {
            const derivedCompany = email.includes('@') 
                ? email.split('@')[1].split('.')[0].toUpperCase() + ' Corp' 
                : 'Enterprise';

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_name: derivedCompany, email, password }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Registration failed');
            }

            setMessage('Account created successfully. Redirecting to sign in…');
            setTimeout(() => navigate('/login'), 1200);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div style={{ textAlign: 'center', marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Link to="/" style={{ textDecoration: 'none', marginBottom: '8px' }}>
                        <LogoBrand variant="dark" showSub={false} />
                    </Link>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '4px' }}>
                        Create your Nexora BPI account
                    </h2>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                        AI-Powered Business Process Intelligence
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '10px 12px',
                        background: 'var(--status-error-bg)',
                        border: '1px solid rgba(220, 38, 38, 0.2)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--status-error)',
                        fontSize: '12px',
                        marginBottom: '16px',
                    }}>
                        {error}
                    </div>
                )}

                {message && (
                    <div style={{
                        padding: '10px 12px',
                        background: 'var(--status-success-bg)',
                        border: '1px solid rgba(22, 163, 74, 0.2)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--status-success)',
                        fontSize: '12px',
                        marginBottom: '16px',
                    }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: 'var(--text-h)' }}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ width: '100%' }}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: 'var(--text-h)' }}>
                            Password
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Create a strong password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ width: '100%', paddingRight: '36px' }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'Hide password' : 'Show password'}
                                className="raw-btn"
                                style={{
                                    position: 'absolute',
                                    right: '4px',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {showPassword ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ width: '100%', padding: '9px 14px', marginTop: '4px', fontSize: '13px' }}
                    >
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: 'var(--text-h)', fontWeight: 500, textDecoration: 'underline' }}>
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
