/**
 * BackButton — زر عودة موحد لجميع شاشات تطبيق المستخدم
 *
 * الاستخدام:
 *   <BackButton onClick={() => setCurrentScreen('feed')} />
 *   <BackButton onClick={...} label="العودة للعروض" />
 *   <BackButton onClick={...} variant="light" />   ← فوق خلفيات داكنة
 */

export default function BackButton({ onClick, label, variant = 'default', className = '' }) {
  const isLight = variant === 'light'

  return (
    <button
      onClick={onClick}
      aria-label={label || 'رجوع'}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px 8px 10px',
        borderRadius: 999,
        border: isLight
          ? '1.5px solid rgba(255,255,255,0.25)'
          : '1.5px solid rgba(0,0,0,0.08)',
        background: isLight
          ? 'rgba(255,255,255,0.15)'
          : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: isLight
          ? 'none'
          : '0 2px 10px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        color: isLight ? '#fff' : '#111827',
        fontFamily: 'inherit',
        fontSize: 14,
        fontWeight: 700,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.04)'
        if (!isLight) e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.13)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)'
        if (!isLight) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)'
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.04)' }}
      onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {/* سهم RTL */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
      {label && (
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.2 }}>
          {label}
        </span>
      )}
    </button>
  )
}
