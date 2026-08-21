import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Documentation = () => {
  const { isAuthenticated } = useAuth();

  const sections = [
    {
      id: 'overview',
      title: 'Overview',
      content: (
        <>
          <p>
            <strong>Nexora BPI</strong> is an enterprise-grade AI-Powered Business Process Intelligence platform designed for real-time operational monitoring, failure prevention, and autonomous decision optimization across logistics, orders, and multi-warehouse networks.
          </p>
          <p>
            The system bridges raw event streaming with machine learning inference, delivering continuous risk assessments and actionable prescriptions before SLA breaches impact business operations.
          </p>
        </>
      )
    },
    {
      id: 'how-it-works',
      title: 'How Nexora BPI Works',
      content: (
        <>
          <p>
            Nexora BPI operates as an event-driven intelligence engine that continuously digests streaming telemetry from enterprise ERP and WMS sources:
          </p>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.7', color: '#a1a1aa' }}>
            <li><strong style={{ color: '#fff' }}>1. Event Ingestion:</strong> Kafka message brokers capture real-time order creations, inventory syncs, and warehouse load events.</li>
            <li><strong style={{ color: '#fff' }}>2. Data Persistence:</strong> PostgreSQL stores normalized relational data for companies, users, warehouses, inventory, and historical events.</li>
            <li><strong style={{ color: '#fff' }}>3. Real-Time Inference:</strong> Pre-trained XGBoost classifiers evaluate every incoming event to predict shipment delays and facility bottleneck probabilities.</li>
            <li><strong style={{ color: '#fff' }}>4. Explainability & Prescriptions:</strong> TreeSHAP decomposes root-cause feature contributions, triggering automated mitigation playbooks.</li>
            <li><strong style={{ color: '#fff' }}>5. Live Broadcast:</strong> WebSocket endpoints push sub-second event telemetry directly to the responsive frontend console.</li>
          </ul>
        </>
      )
    },
    {
      id: 'intelligence-layers',
      title: 'The Four Intelligence Layers',
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '12px' }}>
          {[
            { tag: '01. Descriptive', title: 'What is happening?', desc: 'Live operational state tracking across order volume, warehouse backlog counts, and SKU inventory velocity.' },
            { tag: '02. Diagnostic', title: 'Why did it happen?', desc: 'SHAP attribution isolating specific drivers: backlog ratio spikes, carrier transit delays, and safety stock depletion.' },
            { tag: '03. Predictive', title: 'What will happen?', desc: 'XGBoost machine learning models forecasting fulfillment delays and breach probabilities with granular confidence metrics.' },
            { tag: '04. Prescriptive', title: 'What should we do?', desc: 'Ranked operational playbooks generating automated stock transfers, supplier expedites, and dynamic order rerouting.' }
          ].map(l => (
            <div key={l.tag} style={{ background: '#09090b', border: '1px solid #1f1f23', borderRadius: '6px', padding: '16px' }}>
              <div style={{ color: '#71717a', fontSize: '11px', fontFamily: 'var(--mono, monospace)', fontWeight: 600 }}>{l.tag}</div>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '4px 0 6px' }}>{l.title}</div>
              <div style={{ color: '#888888', fontSize: '12px', lineHeight: 1.5 }}>{l.desc}</div>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'architecture',
      title: 'System Architecture & Stack',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p>Nexora BPI combines high-throughput data processing with sub-second ML inference:</p>
          <div style={{ background: '#09090b', border: '1px solid #1f1f23', borderRadius: '6px', padding: '14px', fontFamily: 'var(--mono, monospace)', fontSize: '12px', color: '#a1a1aa' }}>
            <div style={{ color: '#fff', fontWeight: 600, marginBottom: '6px' }}>CORE TECHNOLOGY STACK:</div>
            <div>• <strong style={{ color: '#fff' }}>Backend:</strong> FastAPI (Python async runtime, ASGI server with Uvicorn)</div>
            <div>• <strong style={{ color: '#fff' }}>Database:</strong> PostgreSQL (asyncpg connection pooling, relational schema)</div>
            <div>• <strong style={{ color: '#fff' }}>Message Bus:</strong> Apache Kafka (topics: orders, inventory, warehouse, logistics)</div>
            <div>• <strong style={{ color: '#fff' }}>ML Engine:</strong> XGBoost (multi-feature tabular risk classifier) & TreeSHAP</div>
            <div>• <strong style={{ color: '#fff' }}>LLM Layer:</strong> Google Gemini API integration with deterministic fallback</div>
            <div>• <strong style={{ color: '#fff' }}>Real-Time:</strong> WebSocket channel (/api/ws) with thread-safe async queue</div>
            <div>• <strong style={{ color: '#fff' }}>Frontend:</strong> React, Vite, React Router, custom CSS design system</div>
          </div>
        </div>
      )
    },
    {
      id: 'ml-shap',
      title: 'ML Prediction & SHAP Explainability',
      content: (
        <>
          <p>
            When orders or warehouse updates are processed, the inference pipeline extracts key operational signals:
          </p>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.7', color: '#a1a1aa' }}>
            <li><strong style={{ color: '#fff' }}>Feature Extraction:</strong> Backlog order counts, warehouse average processing latency, item quantities, and baseline risk indices.</li>
            <li><strong style={{ color: '#fff' }}>XGBoost Classification:</strong> Produces a calibrated delay probability and categorical risk rating (LOW, MEDIUM, HIGH).</li>
            <li><strong style={{ color: '#fff' }}>SHAP Attribution:</strong> Evaluates exact Shapley values per feature, generating human-readable root-cause explanations for business operations managers.</li>
          </ul>
        </>
      )
    },
    {
      id: 'recommendations-copilot',
      title: 'Prescriptive Recommendations & Process Copilot',
      content: (
        <>
          <p>
            <strong>Prescriptive Engine:</strong> Evaluates active risk conditions and synthesizes ranked operational actions with estimated time recovery and cost mitigation metrics.
          </p>
          <p>
            <strong>Process Copilot:</strong> An intelligent conversational assistant with real-time access to live database metrics, warehouse status, active orders, and ML predictions to answer queries from operations managers.
          </p>
        </>
      )
    },
    {
      id: 'alerts-notifications',
      title: 'Alerts, WebSockets & Notifications',
      content: (
        <>
          <p>
            The alerting pipeline supports multi-channel notification dispatch:
          </p>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.7', color: '#a1a1aa' }}>
            <li><strong style={{ color: '#fff' }}>WebSocket Telemetry:</strong> Live event broadcasting to all connected frontend dashboards.</li>
            <li><strong style={{ color: '#fff' }}>Deduplication Filter:</strong> In-memory and signature hashing prevents duplicate notifications within alert windows.</li>
            <li><strong style={{ color: '#fff' }}>SMTP Email Dispatch:</strong> Automated alert emails routed directly to the authenticated user's registered address for critical stockouts and warehouse overload events.</li>
          </ul>
        </>
      )
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
      boxSizing: 'border-box'
    }}>
      {/* Navbar */}
      <header style={{
        height: '60px',
        borderBottom: '1px solid #18181b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 48px)',
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{
              width: '24px',
              height: '24px',
              background: '#ffffff',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
              fontWeight: 800,
              fontSize: '13px'
            }}>
              N
            </div>
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#ffffff' }}>Nexora BPI</span>
          </Link>
          <span style={{ color: '#27272a' }}>/</span>
          <span style={{ fontSize: '13px', color: '#a1a1aa' }}>Documentation</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to="/"
            style={{ fontSize: '13px', color: '#a1a1aa', textDecoration: 'none' }}
          >
            ← Home
          </Link>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#000000',
                backgroundColor: '#ffffff',
                padding: '6px 14px',
                borderRadius: '6px',
                textDecoration: 'none'
              }}
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#000000',
                backgroundColor: '#ffffff',
                padding: '6px 14px',
                borderRadius: '6px',
                textDecoration: 'none'
              }}
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main Content Layout with Sidebar */}
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        width: '100%',
        padding: 'clamp(24px, 4vw, 48px) clamp(16px, 4vw, 48px)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: '40px',
        boxSizing: 'border-box'
      }}>
        <div>
          {/* Header */}
          <div style={{ marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid #18181b' }}>
            <div style={{ fontSize: '12px', fontFamily: 'var(--mono, monospace)', color: '#71717a', textTransform: 'uppercase', marginBottom: '8px' }}>
              System Architecture & Documentation
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.03em', margin: 0 }}>
              Nexora BPI Platform Guide
            </h1>
            <p style={{ color: '#888888', fontSize: '15px', marginTop: '10px', maxWidth: '720px', lineHeight: 1.6 }}>
              Comprehensive technical guide covering the real-time event pipeline, 4-layer intelligence model, XGBoost inference, and prescriptive operational workflows.
            </p>
          </div>

          {/* Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {sections.map(section => (
              <section key={section.id} id={section.id} style={{ scrollMarginTop: '80px' }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  marginBottom: '14px'
                }}>
                  {section.title}
                </h2>
                <div style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.7 }}>
                  {section.content}
                </div>
              </section>
            ))}
          </div>

          {/* Footer CTA */}
          <div style={{
            marginTop: '64px',
            padding: '32px',
            background: '#09090b',
            border: '1px solid #18181b',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>Ready to explore the live console?</div>
              <div style={{ color: '#71717a', fontSize: '13px', marginTop: '4px' }}>Access active telemetry, machine learning predictions, and process copilot.</div>
            </div>
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                fontSize: '13px',
                fontWeight: 500,
                padding: '8px 18px',
                borderRadius: '6px',
                textDecoration: 'none'
              }}
            >
              {isAuthenticated ? 'Open Dashboard →' : 'Sign In to Console →'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
