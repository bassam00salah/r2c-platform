import { useApp } from '../contexts'

const ORANGE = '#ee7b26'
const WHITE = '#ffffff'
const MUTED = '#94a3b8'

const Icon = {
  orders: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="22"
      height="22"
    >
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  ),
  profile: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="22"
      height="22"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
}

export default function BottomNav() {
  const { bottomNav, setBottomNav, setCurrentScreen, orders } = useApp()

  const activeOrdersCount = (orders || []).filter(o =>
    ['pending', 'accepted', 'ready'].includes(o.status)
  ).length

  const leftItem = {
    id: 'orders',
    label: 'طلباتي',
    icon: Icon.orders,
    onPress: () => {
      setBottomNav('orders')
      setCurrentScreen('orders')
    },
    badge: activeOrdersCount > 0,
  }

  const rightItem = {
    id: 'profile',
    label: 'حسابي',
    icon: Icon.profile,
    onPress: () => {
      setBottomNav('profile')
      setCurrentScreen('profile')
    },
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        {/* SVG الشكل المنحني — الجناحان يرتفعان للأعلى والفتحة في المنتصف */}
        <svg
          viewBox="0 0 390 96"
          preserveAspectRatio="none"
          width="100%"
          height="96"
          style={{ display: 'block' }}
        >
          <defs>
            <filter id="bnav-shadow" x="-5%" y="-60%" width="110%" height="230%">
              <feDropShadow dx="0" dy="-5" stdDeviation="10" floodColor="rgba(0,0,0,0.10)" />
            </filter>
          </defs>

          {/* الشكل الأبيض: جوانب مرتفعة + انحناء نحو الفتحة المركزية */}
          <path
            d="
              M0,96
              L0,12
              C45,12 95,38 145,38
              C157,38 163,29 166,30
              L166,38
              C166,48 178,58 195,58
              C212,58 224,48 224,38
              L224,30
              C227,29 233,38 245,38
              C295,38 345,12 390,12
              L390,96
              Z
            "
            fill={WHITE}
            filter="url(#bnav-shadow)"
          />

          {/* الخط البرتقالي الخفيف على حافة الشكل */}
          <path
            d="
              M6,12
              C45,12 95,38 145,38
              C157,38 163,29 166,30
              L166,38
              C166,48 178,58 195,58
              C212,58 224,48 224,38
              L224,30
              C227,29 233,38 245,38
              C295,38 345,12 384,12
            "
            fill="none"
            stroke={ORANGE}
            strokeWidth="2"
            opacity="0.20"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* حاوية الأزرار */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 84,
            display: 'flex',
            alignItems: 'flex-end',
            paddingBottom: 'env(safe-area-inset-bottom)',
            pointerEvents: 'none',
          }}
        >
          {/* الزر الأيسر — طلباتي */}
          <div
            style={{
              display: 'flex',
              flex: 1,
              justifyContent: 'center',
              paddingBottom: 10,
              pointerEvents: 'auto',
            }}
          >
            <NavButton item={leftItem} active={bottomNav === leftItem.id} />
          </div>

          {/* المسافة للزر المركزي */}
          <div style={{ width: 96, flexShrink: 0 }} />

          {/* الزر الأيمن — حسابي */}
          <div
            style={{
              display: 'flex',
              flex: 1,
              justifyContent: 'center',
              paddingBottom: 10,
              pointerEvents: 'auto',
            }}
          >
            <NavButton item={rightItem} active={bottomNav === rightItem.id} />
          </div>
        </div>
      </div>

      {/* دائرة اللوجو في المنتصف */}
      <button
        onClick={() => {
          setBottomNav('home')
          setCurrentScreen('feed')
        }}
        style={{
          position: 'fixed',
          bottom: 26,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          width: 62,
          height: 62,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: '1.5px solid rgba(255,255,255,0.95)',
          boxShadow: '0 8px 18px rgba(0,0,0,0.10)',
          padding: 0,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.2s ease',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateX(-50%) translateY(-2px) scale(1.03)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateX(-50%) translateY(0) scale(1)'
        }}
        onTouchStart={e => {
          e.currentTarget.style.transform = 'translateX(-50%) translateY(-2px) scale(1.03)'
        }}
        onTouchEnd={e => {
          e.currentTarget.style.transform = 'translateX(-50%) translateY(0) scale(1)'
        }}
      >
        <img
          src="/logo.png"
          alt="R2C"
          style={{
            height: 31,
            width: 'auto',
            objectFit: 'contain',
            pointerEvents: 'none',
            display: 'block',
          }}
          onError={e => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextSibling.style.display = 'flex'
          }}
        />
        <span
          style={{
            display: 'none',
            color: ORANGE,
            fontWeight: 900,
            fontSize: 13,
            letterSpacing: 0.5,
            pointerEvents: 'none',
          }}
        >
          R2C
        </span>
      </button>
    </>
  )
}

function NavButton({ item, active }) {
  return (
    <button
      onClick={item.onPress}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '5px 18px',
        borderRadius: 16,
        color: active ? ORANGE : MUTED,
        fontFamily: 'inherit',
        fontSize: 10,
        fontWeight: active ? 800 : 600,
        transition: 'color 0.2s, transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        transform: active ? 'translateY(-3px)' : 'translateY(0)',
        position: 'relative',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
      }}
    >
      {active && (
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'rgba(238,123,38,0.10)',
            pointerEvents: 'none',
          }}
        />
      )}

      <span
        style={{
          position: 'relative',
          transform: active ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 0.22s ease',
          display: 'flex',
        }}
      >
        {item.icon}
        {item.badge && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#ef4444',
              border: '1.5px solid white',
            }}
          />
        )}
      </span>

      <span style={{ lineHeight: 1, letterSpacing: 0.2 }}>{item.label}</span>

      {active && (
        <span
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: ORANGE,
            display: 'block',
          }}
        />
      )}
    </button>
  )
}
