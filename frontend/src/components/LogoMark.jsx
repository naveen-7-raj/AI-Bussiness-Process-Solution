import React from 'react';

export const LogoSymbol = ({ size = 24, variant = 'dark' }) => {
  const isLight = variant === 'light';
  const bgColor = isLight ? '#FFFFFF' : '#000000';
  const iconColor = isLight ? '#000000' : '#FFFFFF';
  const accentDot = isLight ? '#000000' : '#FFFFFF';

  return (
    <div
      aria-label="Nexora BPI Logo"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: bgColor,
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(255,255,255,0.05)',
        border: isLight ? '1px solid #e4e4e7' : '1px solid #27272a',
        transition: 'all 0.2s ease',
      }}
    >
      <svg
        width={Math.round(size * 0.65)}
        height={Math.round(size * 0.65)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer connected process node diamond */}
        <path
          d="M12 3.5L19.5 11L12 18.5L4.5 11L12 3.5Z"
          stroke={iconColor}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Inner intelligence nexus node */}
        <circle cx="12" cy="11" r="2.5" fill={accentDot} />
        {/* Connected process node endpoints */}
        <circle cx="12" cy="3.5" r="1.3" fill={iconColor} />
        <circle cx="19.5" cy="11" r="1.3" fill={iconColor} />
        <circle cx="12" cy="18.5" r="1.3" fill={iconColor} />
        <circle cx="4.5" cy="11" r="1.3" fill={iconColor} />
      </svg>
    </div>
  );
};

export const LogoBrand = ({ variant = 'dark', showSub = true, compact = false }) => {
  const isLight = variant === 'light';
  const textColor = isLight ? '#FFFFFF' : 'var(--text-h, #09090b)';
  const badgeBg = isLight ? 'rgba(255, 255, 255, 0.15)' : 'var(--bg-surface-hover, #f4f4f5)';
  const badgeText = isLight ? '#FFFFFF' : 'var(--text, #71717a)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <LogoSymbol size={compact ? 24 : 26} variant={isLight ? 'light' : 'dark'} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: compact ? '13px' : '14px',
              letterSpacing: '-0.03em',
              color: textColor,
              fontFamily: 'var(--sans)',
            }}
          >
            NEXORA
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: badgeText,
              backgroundColor: badgeBg,
              padding: '1px 5px',
              borderRadius: '4px',
              border: isLight ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border)',
            }}
          >
            BPI
          </span>
        </div>
        {showSub && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 500,
              color: isLight ? '#a1a1aa' : 'var(--text-muted, #71717a)',
              letterSpacing: '-0.01em',
              marginTop: '1px',
            }}
          >
            Business Process Intelligence
          </span>
        )}
      </div>
    </div>
  );
};

export default LogoBrand;
