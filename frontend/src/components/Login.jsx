import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import LogoBrand from './LogoMark';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState('login'); // 'login' | 'otp'
    const [otp, setOtp] = useState('');
    const [otpNotice, setOtpNotice] = useState(null);

    const [activeClientId, setActiveClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || '');

    // Fetch Google Client ID from backend if not already set in frontend env
    useEffect(() => {
        if (!activeClientId) {
            fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/auth/google/config`)
                .then(res => res.json())
                .then(data => {
                    if (data?.client_id) {
                        setActiveClientId(data.client_id);
                    }
                })
                .catch(() => {});
        }
    }, [activeClientId]);

    // Handle normal email/password authentication (Step 1 -> Triggers OTP)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Invalid email or password');
            }

            const data = await response.json();
            if (data.status === 'otp_required') {
                setStep('otp');
                setOtpNotice(`Verification code sent to ${email}`);
            } else if (data.access_token) {
                login(data.access_token, email, data.user);
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle OTP Verification (Step 2 -> Issues JWT)
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otp.trim() }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Verification code failed. Please check the code and try again.');
            }

            const data = await response.json();
            login(data.access_token, email, data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle Resend OTP
    const handleResendOTP = async () => {
        setError(null);
        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/auth/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to resend verification code.');
            }

            setOtpNotice(`A new 6-digit verification code was sent to ${email}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle Google Identity Services credential response
    const handleGoogleCredentialResponse = async (response) => {
        if (!response?.credential) {
            setError('Google sign-in failed. No credential received.');
            return;
        }

        setError(null);
        setGoogleLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Google sign-in failed. Please try again.');
            }

            const data = await res.json();
            login(data.access_token, data.user?.email || email, data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Google sign-in failed. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    };

    // Initialize Google Identity Services
    useEffect(() => {
        const initGIS = () => {
            if (window.google?.accounts?.id && activeClientId) {
                try {
                    window.google.accounts.id.initialize({
                        client_id: activeClientId,
                        callback: handleGoogleCredentialResponse,
                        auto_select: false,
                        cancel_on_tap_outside: true,
                    });

                    const container = document.getElementById('googleSignInBtn');
                    if (container) {
                        container.innerHTML = '';
                        window.google.accounts.id.renderButton(container, {
                            theme: 'outline',
                            size: 'large',
                            width: 316,
                            text: 'signin_with',
                            shape: 'rectangular',
                            logo_alignment: 'left',
                        });
                    }
                } catch (err) {
                    console.error('Failed to initialize Google Identity Services:', err);
                }
            }
        };

        if (window.google?.accounts?.id) {
            initGIS();
        } else {
            const timer = setInterval(() => {
                if (window.google?.accounts?.id) {
                    clearInterval(timer);
                    initGIS();
                }
            }, 200);
            return () => clearInterval(timer);
        }
    }, [activeClientId]);

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div style={{ textAlign: 'center', marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Link to="/" style={{ textDecoration: 'none', marginBottom: '8px' }}>
                        <LogoBrand variant="dark" showSub={false} />
                    </Link>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '4px' }}>
                        {step === 'otp' ? 'Enter Security Code' : 'Sign in to Nexora BPI'}
                    </h2>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                        {step === 'otp' ? `We sent a 6-digit verification code to ${email}` : 'AI-Powered Business Process Intelligence'}
                    </p>
                </div>

                {otpNotice && step === 'otp' && (
                    <div style={{
                        padding: '10px 12px',
                        background: 'var(--status-success-bg, rgba(34, 197, 94, 0.12))',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--status-success, #16a34a)',
                        fontSize: '12px',
                        marginBottom: '16px',
                        textAlign: 'center',
                        fontWeight: 500
                    }}>
                        ✓ {otpNotice}
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: '10px 12px',
                        background: 'var(--status-error-bg)',
                        border: '1px solid rgba(220, 38, 38, 0.2)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--status-error)',
                        fontSize: '12px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span>•</span> {error}
                    </div>
                )}

                {step === 'otp' ? (
                    <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: 'var(--text-h)', textAlign: 'center' }}>
                                6-Digit One-Time Password (OTP)
                            </label>
                            <input
                                type="text"
                                maxLength="6"
                                placeholder="123456"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                style={{
                                    width: '100%',
                                    textAlign: 'center',
                                    fontSize: '22px',
                                    fontWeight: 700,
                                    letterSpacing: '0.4em',
                                    fontFamily: 'var(--mono, monospace)',
                                    padding: '10px'
                                }}
                                required
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading || otp.length < 6}
                            style={{ width: '100%', padding: '9px 14px', marginTop: '4px', fontSize: '13px' }}
                        >
                            {loading ? 'Verifying…' : 'Verify & Sign In'}
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '12px' }}>
                            <button
                                type="button"
                                onClick={handleResendOTP}
                                disabled={loading}
                                className="raw-btn button-secondary"
                                style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Resend Code
                            </button>
                            <button
                                type="button"
                                onClick={() => { setStep('login'); setError(null); setOtpNotice(null); }}
                                className="raw-btn"
                                style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                ← Back to Login
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-h)' }}>
                                        Password
                                    </label>
                                </div>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
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
                                disabled={loading || googleLoading}
                                style={{ width: '100%', padding: '9px 14px', marginTop: '4px', fontSize: '13px' }}
                            >
                                {loading ? 'Signing in…' : 'Sign in'}
                            </button>
                        </form>

                        {/* ── Divider ── */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            margin: '20px 0',
                            color: 'var(--text-muted)',
                            fontSize: '11px',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                            <span style={{ padding: '0 10px' }}>OR</span>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                        </div>

                        {/* ── Official Google Identity Services Sign-In Button Container ── */}
                        <div style={{ display: 'flex', justifyContent: 'center', minHeight: '40px' }}>
                            {activeClientId ? (
                                <div id="googleSignInBtn" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}></div>
                            ) : (
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setError('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment.')}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        padding: '9px 14px',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" />
                                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15Z" />
                                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
                                    </svg>
                                    <span>Sign in with Google</span>
                                </button>
                            )}
                        </div>
                    </>
                )}

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: 'var(--text-h)', fontWeight: 500, textDecoration: 'underline' }}>
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
