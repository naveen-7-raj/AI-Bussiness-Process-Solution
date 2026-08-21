import React from 'react';

/**
 * SparkLine – lightweight SVG line chart, zero dependencies.
 *
 * Props:
 *   data        – array of numbers
 *   color       – stroke colour (CSS variable or hex)
 *   fillColor   – optional area fill (semi-transparent recommended)
 *   height      – SVG height in px (default 60)
 *   label       – y-axis hint shown on hover not needed for sparklines
 */
export const SparkLine = ({ data = [], color = 'var(--accent)', fillColor, height = 60 }) => {
    if (!data || data.length < 2) {
        return (
            <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.35, fontSize: 12 }}>
                No data yet
            </div>
        );
    }

    const w = 400;
    const h = height;
    const pad = 4;
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

    return (
        <svg
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height, display: 'block' }}
        >
            {fillColor && <path d={areaPath} fill={fillColor} />}
            <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {/* last point dot */}
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
        </svg>
    );
};

/**
 * BarChart – horizontal bar chart for warehouse risk ranking.
 *
 * Props:
 *   items  – [{ label, value, max }]
 *   color  – bar color function (value) => css-color string
 */
const defaultRiskColor = (val) => {
    if (val >= 70) return 'var(--status-error, #dc2626)';
    if (val >= 40) return 'var(--status-warning, #d97706)';
    return 'var(--status-success, #16a34a)';
};

export const BarChart = ({ items = [], colorFn = defaultRiskColor, onItemClick }) => {
    if (!items || items.length === 0) {
        return (
            <div style={{ height: '100%', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.35, fontSize: 12 }}>
                No data yet
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '2px' }}>
            {normalized.map(({ label, value }) => {
                const pct = Math.min(100, Math.max(0, (value / globalMax) * 100));
                const barColor = (colorFn || defaultRiskColor)(value);
                return (
                    <div
                        key={label}
                        onClick={() => isClickable && onItemClick(label)}
                        title={isClickable ? `Click to view recommendations for ${label}` : undefined}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            minHeight: '20px',
                            cursor: isClickable ? 'pointer' : 'default',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            transition: 'background-color 0.15s ease',
                        }}
                    >
                        <span style={{
                            fontFamily: 'var(--mono)',
                            fontSize: '12px',
                            width: '44px',
                            flexShrink: 0,
                            color: 'var(--text-h)',
                            fontWeight: isClickable ? 600 : 400,
                            textDecoration: isClickable ? 'underline' : 'none',
                            textDecorationColor: 'var(--border)',
                        }}>
                            {label}
                        </span>
                        <div style={{ flex: 1, background: 'var(--bg-surface-hover)', borderRadius: '4px', overflow: 'hidden', height: '14px' }}>
                            <div
                                style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    background: barColor,
                                    borderRadius: '4px',
                                    transition: 'width 0.6s ease',
                                }}
                            />
                        </div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', width: '44px', flexShrink: 0, textAlign: 'right', color: barColor, fontWeight: 600 }}>
                            {Number(value).toFixed(1)}%
                        </span>
                    </div>
                );
            })}
        </div>
    );
};
