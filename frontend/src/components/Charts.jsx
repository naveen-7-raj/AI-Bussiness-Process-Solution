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
export const BarChart = ({ items = [], colorFn }) => {
    if (!items || items.length === 0) {
        return (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.35, fontSize: 12 }}>
                No data yet
            </div>
        );
    }

    const globalMax = Math.max(...items.map(i => i.value), 1);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map(({ label, value }) => {
                const pct = (value / globalMax) * 100;
                const barColor = colorFn ? colorFn(value) : 'var(--accent)';
                return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', width: '44px', flexShrink: 0, color: 'var(--text-h)' }}>
                            {label}
                        </span>
                        <div style={{ flex: 1, background: 'var(--bg-surface-hover)', borderRadius: '4px', overflow: 'hidden', height: '16px' }}>
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
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', width: '40px', textAlign: 'right', color: barColor, fontWeight: 600 }}>
                            {value.toFixed(1)}%
                        </span>
                    </div>
                );
            })}
        </div>
    );
};
