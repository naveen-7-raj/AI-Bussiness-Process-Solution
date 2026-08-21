import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoBrand from './LogoMark';

const Landing = () => {
  const { isAuthenticated } = useAuth();

  const getStartedPath = isAuthenticated ? '/dashboard' : '/register';
  const signInPath = isAuthenticated ? '/dashboard' : '/login';
  const viewDashboardPath = isAuthenticated ? '/dashboard' : '/login';

  // Simple live telemetry simulation ticker for the hero visual
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setPulse((p) => (p + 1) % 100), 2000);
    return () => clearInterval(timer);
  }, []);

  const layers = [
    {
      step: '01',
      title: 'DESCRIPTIVE',
      headline: 'Understand what is happening.',
      desc: 'Real-time ingestion of Kafka event streams, multi-warehouse load, order status, and inventory velocity across global nodes.'
    },
    {
      step: '02',
      title: 'DIAGNOSTIC',
      headline: 'Understand why it is happening.',
      desc: 'SHAP game-theoretic explainability decomposing root cause factors: backlog accumulation, transit latency, and supply stockouts.'
    },
    {
      step: '03',
      title: 'PREDICTIVE',
      headline: 'Know what is likely to happen.',
      desc: 'Trained XGBoost models score breach probabilities on active shipments hours before operational SLA failures occur.'
    },
    {
      step: '04',
      title: 'PRESCRIPTIVE',
      headline: 'Know what action to take.',
      desc: 'Autonomous action playbooks generating inventory transfers, dynamic supplier expedites, and capacity rebalancing.'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#000000',
      color: '#ededed',
      fontFamily: 'var(--sans, -apple-system, BlinkMacSystemFont, "Inter", sans-serif)',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* ── Compact Resend-Style Navbar ── */}
      <header style={{
        height: '60px',
        borderBottom: '1px solid #18181b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 48px)',
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 50
      }}>
        {/* Left: Logo */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <LogoBrand variant="light" showSub={false} />
        </Link>

        {/* Center: Navigation Links */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '28px',
          fontSize: '13px'
        }} className="landing-nav-center">
          <a href="#intelligence" style={{ color: '#888888', transition: 'color 0.15s ease' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#888888'}>
            Intelligence
          </a>
          <a href="#layers" style={{ color: '#888888', transition: 'color 0.15s ease' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#888888'}>
            Architecture
          </a>
          <a href="#capabilities" style={{ color: '#888888', transition: 'color 0.15s ease' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#888888'}>
            Capabilities
          </a>
          <Link to="/docs" style={{ color: '#888888', transition: 'color 0.15s ease' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#888888'}>
            Documentation
          </Link>
        </nav>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link
            to={signInPath}
            style={{
              fontSize: '13px',
              color: '#a1a1aa',
              fontWeight: 500,
              padding: '6px 10px',
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={e => e.target.style.color = '#ffffff'}
            onMouseLeave={e => e.target.style.color = '#a1a1aa'}
          >
            {isAuthenticated ? 'Dashboard' : 'Sign In'}
          </Link>
          <Link
            to={getStartedPath}
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#000000',
              backgroundColor: '#ffffff',
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #ffffff',
              transition: 'all 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center'
            }}
            onMouseEnter={e => { e.target.style.backgroundColor = '#e4e4e7'; e.target.style.borderColor = '#e4e4e7'; }}
            onMouseLeave={e => { e.target.style.backgroundColor = '#ffffff'; e.target.style.borderColor = '#ffffff'; }}
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* ── Left-Aligned Editorial Hero Section ── */}
      <section style={{
        maxWidth: '1240px',
        margin: '0 auto',
        width: '100%',
        padding: 'clamp(48px, 8vw, 96px) clamp(16px, 4vw, 48px) 64px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 'clamp(32px, 6vw, 64px)',
        alignItems: 'center',
        minHeight: 'calc(80vh - 60px)'
      }}>
        {/* Left Side: Typography & CTAs */}
        <div style={{ maxWidth: '580px' }}>
          {/* Announcement Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '9999px',
            background: '#121214',
            border: '1px solid #27272a',
            fontSize: '12px',
            fontWeight: 500,
            color: '#a1a1aa',
            marginBottom: '28px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            <span>AI-Powered Business Intelligence</span>
            <span style={{ color: '#52525b' }}>→</span>
          </div>

          {/* Large Editorial Headline */}
          <h1 style={{
            fontSize: 'clamp(40px, 6vw, 68px)',
            fontWeight: 600,
            lineHeight: 1.04,
            letterSpacing: '-0.04em',
            color: '#ffffff',
            marginBottom: '24px'
          }}>
            Turn business data<br />
            into intelligent<br />
            decisions.
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(15px, 2vw, 17px)',
            lineHeight: 1.6,
            color: '#888888',
            marginBottom: '36px',
            maxWidth: '500px',
            fontWeight: 400
          }}>
            Monitor operations in real time, predict risks before they happen, understand root causes, and turn insights into action.
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              to={getStartedPath}
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                fontSize: '14px',
                fontWeight: 500,
                padding: '10px 22px',
                borderRadius: '6px',
                border: '1px solid #ffffff',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e4e4e7'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
            >
              Get started
            </Link>
            <Link
              to={viewDashboardPath}
              style={{
                backgroundColor: '#121214',
                color: '#ededed',
                fontSize: '14px',
                fontWeight: 500,
                padding: '10px 20px',
                borderRadius: '6px',
                border: '1px solid #27272a',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3f3f46'; e.currentTarget.style.backgroundColor = '#18181b'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.backgroundColor = '#121214'; }}
            >
              View dashboard →
            </Link>
          </div>
        </div>

        {/* Right Side: Sophisticated Abstract Business Intelligence Visual */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(180deg, #111113 0%, #09090b 100%)',
          border: '1px solid #27272a',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8)',
          fontFamily: 'var(--mono, "JetBrains Mono", monospace)',
          fontSize: '12px'
        }}>
          {/* Header Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid #1f1f23',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
              <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em' }}>
                KAFKA INFERENCE PIPELINE
              </span>
            </div>
            <span style={{ color: '#71717a', fontSize: '11px' }}>latency 18ms</span>
          </div>

          {/* Metric Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
            <div style={{ background: '#09090b', border: '1px solid #1f1f23', borderRadius: '6px', padding: '10px' }}>
              <div style={{ color: '#71717a', fontSize: '10px', textTransform: 'uppercase' }}>Throughput</div>
              <div style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginTop: '2px' }}>2.4k/s</div>
            </div>
            <div style={{ background: '#09090b', border: '1px solid #1f1f23', borderRadius: '6px', padding: '10px' }}>
              <div style={{ color: '#71717a', fontSize: '10px', textTransform: 'uppercase' }}>ML Confidence</div>
              <div style={{ color: '#22c55e', fontSize: '15px', fontWeight: 600, marginTop: '2px' }}>98.4%</div>
            </div>
            <div style={{ background: '#09090b', border: '1px solid #1f1f23', borderRadius: '6px', padding: '10px' }}>
              <div style={{ color: '#71717a', fontSize: '10px', textTransform: 'uppercase' }}>Risk Index</div>
              <div style={{ color: '#f59e0b', fontSize: '15px', fontWeight: 600, marginTop: '2px' }}>Low (0.12)</div>
            </div>
          </div>

          {/* Telemetry Process Flow */}
          <div style={{
            background: '#09090b',
            border: '1px solid #1f1f23',
            borderRadius: '6px',
            padding: '12px 14px',
            marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a', fontSize: '11px', marginBottom: '8px' }}>
              <span>PROCESS ORCHESTRATION</span>
              <span style={{ color: '#22c55e' }}>NOMINAL</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#a1a1aa' }}>
                <span>WH01 Chicago Hub</span>
                <span style={{ color: '#ffffff' }}>420 units/min</span>
              </div>
              <div style={{ height: '3px', background: '#1f1f23', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '84%', height: '100%', background: '#ffffff', borderRadius: '2px' }}></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#a1a1aa', marginTop: '4px' }}>
                <span>WH03 Rotterdam Port</span>
                <span style={{ color: '#f59e0b' }}>Backlog +14%</span>
              </div>
              <div style={{ height: '3px', background: '#1f1f23', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '62%', height: '100%', background: '#f59e0b', borderRadius: '2px' }}></div>
              </div>
            </div>
          </div>

          {/* Root-Cause SHAP Factor Snippet */}
          <div style={{
            background: '#09090b',
            border: '1px solid #1f1f23',
            borderRadius: '6px',
            padding: '12px 14px'
          }}>
            <div style={{ color: '#71717a', fontSize: '10px', textTransform: 'uppercase', marginBottom: '6px' }}>
              SHAP Root-Cause Attribution
            </div>
            <div style={{ color: '#a1a1aa', fontSize: '11px', lineHeight: 1.5 }}>
              <span style={{ color: '#ffffff' }}>backlog_ratio</span> (+0.42) · <span style={{ color: '#ffffff' }}>carrier_delay</span> (+0.28) → <span style={{ color: '#22c55e' }}>Automated reroute dispatch ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Below the Fold: 4-Layer Architecture (Dark Editorial Style) ── */}
      <section id="layers" style={{
        borderTop: '1px solid #18181b',
        borderBottom: '1px solid #18181b',
        backgroundColor: '#050507',
        padding: '96px clamp(16px, 4vw, 48px)'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: '56px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#71717a'
            }}>
              The Four Layers
            </span>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              marginTop: '10px',
              maxWidth: '600px',
              lineHeight: 1.15
            }}>
              Closed-loop intelligence from telemetry to action.
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1px',
            backgroundColor: '#18181b',
            border: '1px solid #18181b',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            {layers.map((layer) => (
              <div
                key={layer.step}
                style={{
                  backgroundColor: '#09090b',
                  padding: '32px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '220px'
                }}
              >
                <div>
                  <div style={{
                    fontSize: '11px',
                    fontFamily: 'var(--mono, monospace)',
                    color: '#71717a',
                    fontWeight: 600,
                    marginBottom: '16px'
                  }}>
                    {layer.step} // {layer.title}
                  </div>
                  <h3 style={{
                    fontSize: '17px',
                    fontWeight: 600,
                    color: '#ffffff',
                    letterSpacing: '-0.02em',
                    marginBottom: '8px',
                    lineHeight: 1.3
                  }}>
                    {layer.headline}
                  </h3>
                </div>
                <p style={{
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: '#888888',
                  margin: 0
                }}>
                  {layer.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities Grid ── */}
      <section id="capabilities" style={{
        padding: '96px clamp(16px, 4vw, 48px)',
        maxWidth: '1240px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{ marginBottom: '48px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#71717a'
          }}>
            Enterprise Platform
          </span>
          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 36px)',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            marginTop: '8px',
            lineHeight: 1.2
          }}>
            Designed for high-throughput operational control.
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px'
        }}>
          {[
            {
              title: 'Kafka Event Processing',
              desc: 'Sub-second event stream consumers digesting orders, inventory updates, and facility load signals in real time.'
            },
            {
              title: 'Trained XGBoost Risk Engine',
              desc: 'Continuous scoring models calculating shipment delay risks and critical failure odds ahead of time.'
            },
            {
              title: 'SHAP Explainability Layer',
              desc: 'Transparent tree feature contribution metrics giving operators clear root-cause diagnosis for every alert.'
            },
            {
              title: 'Prescriptive Recommendations',
              desc: 'Impact-ranked operational intervention playbooks with projected time savings and mitigation paths.'
            },
            {
              title: 'Live Operational Alerts',
              desc: 'Threshold-based and ML-driven alert dispatches with deduplication and instant notification dispatch.'
            },
            {
              title: 'Interactive Process Copilot',
              desc: 'Natural language querying across live warehouse telemetry, backlog indices, and predictive models.'
            }
          ].map((item) => (
            <div
              key={item.title}
              style={{
                backgroundColor: '#09090b',
                border: '1px solid #18181b',
                borderRadius: '8px',
                padding: '24px',
                transition: 'border-color 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#27272a'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#18181b'}
            >
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
                {item.title}
              </h4>
              <p style={{ fontSize: '13px', color: '#888888', lineHeight: 1.5, margin: 0 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Minimal Bottom CTA ── */}
      <section style={{
        borderTop: '1px solid #18181b',
        padding: '80px clamp(16px, 4vw, 48px)',
        textAlign: 'center',
        backgroundColor: '#050507'
      }}>
        <h2 style={{
          fontSize: 'clamp(24px, 3.5vw, 36px)',
          fontWeight: 600,
          letterSpacing: '-0.03em',
          color: '#ffffff',
          marginBottom: '12px'
        }}>
          Transform operations into intelligent decisions.
        </h2>
        <p style={{
          color: '#888888',
          fontSize: '14px',
          marginBottom: '28px',
          maxWidth: '480px',
          margin: '0 auto 28px'
        }}>
          Get real-time operational visibility, predictive breach alerts, and automated recommendations today.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <Link
            to={getStartedPath}
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              fontSize: '14px',
              fontWeight: 500,
              padding: '10px 24px',
              borderRadius: '6px',
              border: '1px solid #ffffff',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            Get Started with Nexora BPI
          </Link>
        </div>
      </section>

      {/* ── Resend-Style Minimal Footer ── */}
      <footer style={{
        borderTop: '1px solid #18181b',
        padding: '24px clamp(16px, 4vw, 48px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#71717a',
        backgroundColor: '#000000',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>Nexora BPI — AI-Powered Business Process Intelligence</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link to="/docs" style={{ color: '#71717a' }}>Documentation</Link>
          <Link to={signInPath} style={{ color: '#71717a' }}>{isAuthenticated ? 'Dashboard' : 'Sign In'}</Link>
          <Link to={getStartedPath} style={{ color: '#71717a' }}>{isAuthenticated ? 'Live Console' : 'Register'}</Link>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
