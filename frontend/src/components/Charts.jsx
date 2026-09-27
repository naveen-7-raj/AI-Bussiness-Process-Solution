import React from 'react';

/**
 * SparkLine – lightweight SVG line chart with subtle gradient fill, zero dependencies.
 *
 * Props:
 *   data        – array of numbers
 *   color       – stroke colour (CSS variable or hex)
 *   fillColor   – optional area fill (semi-transparent recommended)
 *   height      – SVG height in px (default 60)
 */
export const SparkLine = ({ data = [], color = 'var(--accent)', fillColor, height = 60 }) => {
    if (!data || data.length < 2) {
        return (
            <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px', gap: '4px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                <span>Awaiting trend telemetry</span>
            </div>
        );
    }

    const w = 400;
    const h = height;
    const pad = 6;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const pts = data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        const y = pad + ((1 - (v - min) / range) * (h - pad * 2));
        return [x, y];
    });

    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
    const gradId = `spark-grad-${Math.abs(data.reduce((a, b) => a + b, 0))}`;

    return (
        <svg
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height, display: 'block' }}
        >
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.16" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.01" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill={fillColor || `url(#${gradId})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            {/* last point dot with pulse ring */}
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill="#ffffff" stroke={color} strokeWidth="2" />
        </svg>
    );
};

/**
 * BarChart – horizontal bar chart for warehouse risk ranking.
 *
 * Props:
 *   items        – [{ label, value, max }]
 *   colorFn      – bar color function (value) => css-color string
 *   onItemClick  – callback when row is clicked
 */
const defaultRiskColor = (val) => {
    if (val >= 70) return 'var(--status-error, #b91c1c)';
    if (val >= 35) return 'var(--status-warning, #b45309)';
    return 'var(--status-success, #15803d)';
};

export const BarChart = ({ items = [], colorFn = defaultRiskColor, onItemClick }) => {
    if (!items || items.length === 0) {
        return (
            <div style={{ height: '100%', minHeight: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px', gap: '4px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                <span>Zero risk anomalies logged</span>
            </div>
        );
    }

    const normalized = items.map(i => {
        const val = typeof i.value === 'number' ? i.value : (typeof i.pct === 'number' ? i.pct : 0);
        return { label: i.label, value: val };
    });

    const globalMax = Math.max(...normalized.map(i => i.value), 1);
    const isClickable = typeof onItemClick === 'function';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingBottom: '2px' }}>
            {normalized.map(({ label, value }) => {
                const pct = Math.min(100, Math.max(0, (value / globalMax) * 100));
                const barColor = (colorFn || defaultRiskColor)(value);
                return (
                    <div
                        key={label}
                        onClick={() => isClickable && onItemClick(label)}
                        title={isClickable ? `Click to view prescriptive actions for ${label}` : undefined}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            minHeight: '20px',
                            cursor: isClickable ? 'pointer' : 'default',
                            padding: '3px 6px',
                            borderRadius: 'var(--radius-sm, 4px)',
                            transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                            if (isClickable) e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
                        }}
                        onMouseLeave={(e) => {
                            if (isClickable) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <span style={{
                            fontFamily: 'var(--mono)',
                            fontSize: '11.5px',
                            width: '46px',
                            flexShrink: 0,
                            color: 'var(--text-h)',
                            fontWeight: 600,
                        }}>
                            {label}
                        </span>
                        <div style={{ flex: 1, background: 'var(--bg-surface-hover)', borderRadius: '3px', overflow: 'hidden', height: '10px' }}>
                            <div
                                style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    background: barColor,
                                    borderRadius: '3px',
                                    transition: 'width 0.5s ease',
                                }}
                            />
                        </div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '11.5px', width: '44px', flexShrink: 0, textAlign: 'right', color: barColor, fontWeight: 600 }}>
                            {Number(value).toFixed(1)}%
                        </span>
                    </div>
                );
            })}
        </div>
    );
};
