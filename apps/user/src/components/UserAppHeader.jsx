import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../contexts'

const ORANGE = '#ee7b26'
const ORANGE_DARK = '#d96a18'
const WHITE = '#ffffff'
const TEXT = '#111827'
const MUTED = '#6b7280'
const BORDER = 'rgba(229, 231, 235, 0.72)'

const STATUS_INFO = {
  pending: { text: 'في انتظار القبول', icon: '⏳', color: '#f59e0b' },
  accepted: { text: 'تم قبول طلبك', icon: '✅', color: '#10b981' },
  ready: { text: 'طلبك جاهز', icon: '🎉', color: ORANGE },
  completed: { text: 'اكتمل الطلب', icon: '✔️', color: MUTED },
  rejected: { text: 'تم رفض الطلب', icon: '❌', color: '#ef4444' },
  cancelled: { text: 'تم إلغاء الطلب', icon: '🚫', color: MUTED },
}

const SCREEN_TITLES = {
  feed: 'الرئيسية',
  explore: 'استكشف العروض',
  grid: 'البحث والاستكشاف',
  search: 'البحث',
  restaurantProfile: 'صفحة المطعم',
  offerDetails: 'تفاصيل العرض',
  confirmOrder: 'تأكيد الطلب',
  waiting: 'متابعة الطلب',
  success: 'كود الاستلام',
  orders: 'طلباتي',
  profile: 'إدارة الحساب',
  empty: 'R2C',
}

function timeAgo(order) {
  const ms = order.updatedAt?.toMillis?.() ?? order.createdAt?.toMillis?.() ?? 0
  if (!ms) return ''
  const diff = Math.floor((Date.now() - ms) / 60000)
  if (diff < 1) return 'الآن'
  if (diff < 60) return `منذ ${diff} دقيقة`
  const h = Math.floor(diff / 60)
  if (h < 24) return `منذ ${h} ساعة`
  return `منذ ${Math.floor(h / 24)} يوم`
}

export default function UserAppHeader() {
  const {
    orders,
    currentScreen,
    selectedRestaurant,
    setCurrentScreen,
    goBack,
    setBottomNav,
    setActiveOrdersTab,
    viewMode,
    globalHeaderSearchQuery,
    setGlobalHeaderSearchQuery,
  } = useApp()

  const [showSearchBox, setShowSearchBox] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [seenKeys, setSeenKeys] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('r2c_seen') || '[]')) } catch { return new Set() }
  })
  const searchInputRef = useRef(null)
  const notifsRef = useRef(null)

  const title = currentScreen === 'restaurantProfile' && selectedRestaurant?.name
    ? selectedRestaurant.name
    : SCREEN_TITLES[currentScreen] || 'R2C'

  const notifOrders = useMemo(() => {
    if (!orders) return []
    return [...orders]
      .filter(order => order.status && STATUS_INFO[order.status])
      .sort((a, b) => {
        const t = order => order.updatedAt?.toMillis?.() ?? order.createdAt?.toMillis?.() ?? 0
        return t(b) - t(a)
      })
      .slice(0, 15)
  }, [orders])

  const unreadCount = notifOrders.filter(order => !seenKeys.has(`${order.id}_${order.status}`)).length

  useEffect(() => {
    if (!showSearchBox) return undefined
    const id = setTimeout(() => searchInputRef.current?.focus(), 60)
    return () => clearTimeout(id)
  }, [showSearchBox])

  useEffect(() => {
    if (!showNotifs) return undefined
    const handleOutsideClick = event => {
      if (notifsRef.current && !notifsRef.current.contains(event.target)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showNotifs])

  const openNotifs = () => {
    setShowNotifs(true)
    const keys = notifOrders.map(order => `${order.id}_${order.status}`)
    const next = new Set([...seenKeys, ...keys])
    setSeenKeys(next)
    try { localStorage.setItem('r2c_seen', JSON.stringify([...next])) } catch {}
  }

  const goHome = () => {
    setBottomNav?.('home')
    setCurrentScreen('feed')
  }

  const handleBack = () => {
    if (currentScreen === 'feed') {
      window.dispatchEvent(new CustomEvent('r2c-feed-menu-open'))
      return
    }
    if (['explore', 'grid', 'search', 'orders', 'profile', 'empty'].includes(currentScreen)) {
      goHome()
      return
    }
    if (currentScreen === 'restaurantProfile') {
      setCurrentScreen(viewMode || 'feed')
      return
    }
    if (currentScreen === 'confirmOrder') {
      setCurrentScreen('offerDetails')
      return
    }
    if (['waiting', 'success'].includes(currentScreen)) {
      goHome()
      return
    }
    goBack?.()
  }

  const handleSearchButton = () => {
    setShowSearchBox(current => !current)
  }

  return (
    <div
      dir="rtl"
      style={{
        position: 'sticky',
        top: 'var(--r2c-statusbar-space-active, 0px)',
        zIndex: 150,
        background: 'rgba(255, 255, 255, 0.00)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `0px solid ${BORDER}`,
        padding: '12px 12px 10px',
      }}
    >
      <style>{`
        .r2c-shared-header-press { transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease; }
        .r2c-shared-header-press:active { transform: scale(0.93); }
        .r2c-shared-header-fade { animation: r2cSharedHeaderFade 0.22s ease both; }
        @keyframes r2cSharedHeaderFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={handleBack}
          aria-label={currentScreen === 'feed' ? 'فتح القائمة' : 'رجوع'}
          className="r2c-shared-header-press"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 42,
            height: 42,
            borderRadius: 14,
            border: `1px solid ${BORDER}`,
            background: 'rgba(255,255,255,0.76)',
            boxShadow: '0 4px 12px rgba(17,24,39,0.07)',
            cursor: 'pointer',
            color: TEXT,
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            flexShrink: 0,
          }}
        >
          {currentScreen === 'feed' ? <MenuIcon /> : <BackIcon />}
        </button>

        <h1 style={{
          fontSize: 18,
          fontWeight: 800,
          margin: 0,
          flex: 1,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: TEXT,
        }}>
          {title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            onClick={handleSearchButton}
            aria-label="بحث"
            className="r2c-shared-header-press"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 42,
              height: 42,
              borderRadius: 14,
              border: `1px solid ${BORDER}`,
              background: 'rgba(255,255,255,0.76)',
              boxShadow: '0 4px 12px rgba(17,24,39,0.07)',
              cursor: 'pointer',
              color: showSearchBox ? ORANGE_DARK : '#374151',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <SearchIcon />
          </button>

          <div style={{ position: 'relative', flexShrink: 0 }} ref={notifsRef}>
            <button
              onClick={showNotifs ? () => setShowNotifs(false) : openNotifs}
              aria-label="الإشعارات"
              className="r2c-shared-header-press"
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 42,
                height: 42,
                borderRadius: 14,
                border: 'none',
                background: ORANGE,
                boxShadow: '0 8px 18px rgba(238,123,38,0.28)',
                cursor: 'pointer',
                color: WHITE,
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  left: -4,
                  minWidth: 18,
                  height: 18,
                  padding: '0 4px',
                  borderRadius: 999,
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${WHITE}`,
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div
                className="r2c-shared-header-fade"
                style={{
                  position: 'absolute',
                  top: 50,
                  left: 0,
                  width: 'min(300px, calc(100vw - 24px))',
                  maxHeight: 380,
                  overflowY: 'auto',
                  background: WHITE,
                  borderRadius: 20,
                  boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                  zIndex: 180,
                  border: '1px solid #e5e7eb',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
                  <strong style={{ fontWeight: 800, fontSize: 13 }}>الإشعارات</strong>
                  <button onClick={() => setShowNotifs(false)} style={{ border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 13 }}>✕</button>
                </div>
                {notifOrders.length === 0 ? (
                  <div style={{ padding: '24px 20px', textAlign: 'center', color: MUTED, fontSize: 13 }}>لا توجد إشعارات</div>
                ) : notifOrders.map(order => {
                  const info = STATUS_INFO[order.status] || STATUS_INFO.pending
                  const seen = seenKeys.has(`${order.id}_${order.status}`)
                  return (
                    <div
                      key={`${order.id}_${order.status}`}
                      onClick={() => {
                        setShowNotifs(false)
                        setActiveOrdersTab?.('current')
                        setCurrentScreen('orders')
                      }}
                      style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', cursor: 'pointer', background: seen ? WHITE : '#fff4ef' }}
                    >
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 18, flexShrink: 0, background: `${info.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{info.icon}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: info.color }}>{info.text}</div>
                          <div style={{ fontSize: 12, color: TEXT, marginTop: 2 }}>{order.offerName || order.offer?.name || 'طلب'}</div>
                          <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{timeAgo(order)}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showSearchBox && (
        <div className="r2c-shared-header-fade" style={{ marginTop: 12, position: 'relative' }}>
          <input
            ref={searchInputRef}
            type="text"
            dir="rtl"
            placeholder="اكتبي كلمة البحث هنا"
            value={globalHeaderSearchQuery || ''}
            onChange={event => setGlobalHeaderSearchQuery(event.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              height: 50,
              borderRadius: 16,
              border: '1.5px solid #e5e7eb',
              outline: 'none',
              background: 'rgba(255,255,255,0.84)',
              padding: '0 46px 0 42px',
              fontSize: 15,
              fontWeight: 700,
              color: TEXT,
              textAlign: 'center',
              boxShadow: '0 6px 16px rgba(17,24,39,0.06)',
            }}
          />
          <span style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <SearchIcon />
          </span>
          {(globalHeaderSearchQuery || showSearchBox) && (
            <button
              onClick={() => {
                if (globalHeaderSearchQuery) setGlobalHeaderSearchQuery('')
                else setShowSearchBox(false)
              }}
              aria-label="مسح البحث"
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: 'none',
                background: '#f3f4f6',
                color: MUTED,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="20" y1="20" x2="16.65" y2="16.65" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 17H9M18 17V11C18 7.686 15.314 5 12 5C8.686 5 6 7.686 6 11V17L4.5 18.5V19H19.5V18.5L18 17Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 19C10.3 20 11 20.5 12 20.5C13 20.5 13.7 20 14 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
