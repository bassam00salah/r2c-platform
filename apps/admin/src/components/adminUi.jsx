import React from 'react';

export const COLORS = {
  primary: '#ee7b26',
  primaryDark: '#d96a18',
  navy: '#15487d',
  bg: '#f7f8fc',
  panel: '#ffffff',
  text: '#1a1a2e',
  muted: '#6b7280',
  line: '#e5e7eb',
  softLine: '#edf0f5',
  soft: '#f9fafb',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  purple: '#8b5cf6',
  blue: '#3b82f6',
};

export const shadows = {
  card: '0 2px 10px rgba(15,23,42,0.06)',
  elevated: '0 10px 24px rgba(15,23,42,0.08)',
};

export const radii = {
  lg: 14,
  xl: 16,
  pill: 999,
};

export const panelStyle = {
  background: COLORS.panel,
  borderRadius: radii.lg,
  padding: '24px',
  boxShadow: shadows.card,
  border: `1px solid ${COLORS.softLine}`,
};

export const tableWrapStyle = {
  ...panelStyle,
  padding: 0,
  overflow: 'hidden',
};

export const toolbarCardStyle = {
  ...panelStyle,
  padding: '16px',
};

export const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  border: `1.5px solid ${COLORS.line}`,
  borderRadius: '10px',
  fontSize: '14px',
  background: '#fff',
  boxSizing: 'border-box',
  color: COLORS.text,
  outline: 'none',
};

export const textareaStyle = {
  ...inputStyle,
  minHeight: '96px',
  resize: 'vertical',
  fontFamily: 'inherit',
};

export const searchInputStyle = {
  ...inputStyle,
  background: '#fff',
  boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.03)',
};

export const primaryButtonStyle = {
  padding: '11px 18px',
  background: `linear-gradient(135deg, ${COLORS.primary}, #ff9a4a)`,
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '14px',
  boxShadow: '0 8px 20px rgba(238,123,38,0.22)',
};

export const secondaryButtonStyle = {
  padding: '11px 18px',
  background: '#fff',
  color: '#374151',
  border: `1.5px solid ${COLORS.line}`,
  borderRadius: '12px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '14px',
};

export const ghostButtonStyle = {
  padding: '8px 14px',
  background: '#fff',
  color: '#374151',
  border: `1px solid ${COLORS.line}`,
  borderRadius: '10px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '13px',
};

export const dangerButtonStyle = {
  padding: '8px 14px',
  background: '#fee2e2',
  color: '#dc2626',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '13px',
};

export const infoPillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '7px 12px',
  background: '#fff7ed',
  border: '1px solid #fed7aa',
  color: '#9a3412',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 700,
};

export function PageHeader({ icon, title, description, action, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
      <div>
        {badge ? <div style={{ ...infoPillStyle, marginBottom: '10px' }}>{badge}</div> : null}
        <h2 style={{ fontSize: '26px', fontWeight: 800, color: COLORS.text, margin: 0 }}>
          {icon ? `${icon} ` : ''}{title}
        </h2>
        {description ? <p style={{ color: COLORS.muted, margin: '8px 0 0', fontSize: '14px', lineHeight: 1.8 }}>{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function AdminCard({ children, style }) {
  return <div style={{ ...panelStyle, ...style }}>{children}</div>;
}

export function TableCard({ children, style }) {
  return <div style={{ ...tableWrapStyle, ...style }}>{children}</div>;
}

export function Field({ label, note, children }) {
  return (
    <div>
      {label ? <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px', color: '#374151' }}>{label}</label> : null}
      {children}
      {note ? <div style={{ marginTop: '6px', color: '#9ca3af', fontSize: '12px' }}>{note}</div> : null}
    </div>
  );
}

export function StatCard({ icon, label, value, sub, color = COLORS.navy }) {
  return (
    <div style={{ ...panelStyle, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '52px', height: '52px', background: `${color}18`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '24px', fontWeight: 800, color }}>{value}</div>
        <div style={{ color: '#374151', fontWeight: 700, fontSize: '14px' }}>{label}</div>
        {sub ? <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px' }}>{sub}</div> : null}
      </div>
    </div>
  );
}

export function SectionTitle({ icon, title, subtitle, accent = COLORS.primary }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '18px' }}>
      <div style={{ width: '42px', height: '42px', background: `${accent}16`, color: accent, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <h3 style={{ fontWeight: 800, fontSize: '18px', color: COLORS.text, margin: 0 }}>{title}</h3>
        {subtitle ? <p style={{ margin: '6px 0 0', color: COLORS.muted, fontSize: '13px', lineHeight: 1.7 }}>{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function Notice({ icon = 'ℹ️', children, tone = 'blue' }) {
  const tones = {
    blue: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
    green: { bg: '#f0fdf4', border: '#86efac', color: '#15803d' },
    amber: { bg: '#fffbeb', border: '#fcd34d', color: '#92400e' },
    orange: { bg: '#fff7ed', border: '#fed7aa', color: '#9a3412' },
    red: { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' },
  };
  const active = tones[tone] || tones.blue;
  return (
    <div style={{ background: active.bg, border: `1px solid ${active.border}`, borderRadius: '12px', padding: '12px 14px', color: active.color, fontSize: '13px', display: 'flex', gap: '10px', alignItems: 'flex-start', lineHeight: 1.8 }}>
      <span>{icon}</span>
      <div>{children}</div>
    </div>
  );
}

export function PillButton({ label, active, onClick, activeColor = COLORS.primary }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        background: active ? activeColor : '#fff',
        color: active ? '#fff' : '#374151',
        border: `1px solid ${active ? activeColor : COLORS.line}`,
        borderRadius: '999px',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: '13px',
      }}
    >
      {label}
    </button>
  );
}

export function EmptyState({ icon = '📭', text, style }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af', ...style }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      {text}
    </div>
  );
}

export function LoadingBox({ text = 'جاري التحميل...' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: '#9ca3af' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
        <div>{text}</div>
      </div>
    </div>
  );
}

export function tableHeaderStyle(extra = {}) {
  return { padding: '14px 16px', textAlign: 'right', color: '#374151', fontWeight: 800, fontSize: '13px', background: '#fafbfc', borderBottom: `1px solid ${COLORS.softLine}`, ...extra };
}

export function tableCellStyle(extra = {}) {
  return { padding: '14px 16px', borderBottom: `1px solid ${COLORS.softLine}`, color: '#374151', fontSize: '14px', ...extra };
}

export function ImagePreview({ src, alt, height = 100, circle = false }) {
  if (!src) return null;
  return (
    <div style={{ marginTop: '10px', width: circle ? height : '100%', height, borderRadius: circle ? '50%' : '12px', overflow: 'hidden', border: `1px solid ${COLORS.line}`, background: '#f3f4f6' }}>
      <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
    </div>
  );
}
