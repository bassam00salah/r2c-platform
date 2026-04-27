import { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../contexts'
import OfferImage from '../components/OfferImage'
import { db } from '@r2c/shared'
import { doc, getDoc } from 'firebase/firestore'

const ORANGE = '#ee7b26'
const ORANGE_DARK = '#d96a18'
const ORANGE_SOFT = '#fff3e8'
const BG = '#ffffff'
const WHITE = '#ffffff'
const TEXT = '#111827'
const MUTED = '#6b7280'
const BORDER = '#e5e7eb'
const SHADOW = '0 8px 24px rgba(17, 24, 39, 0.04)'

const CUISINE_FILTERS = [
  { id: 'all', label: 'الكل', customImg: 'https://i.ibb.co/99HgtTDP/file-000000005e8c720aaeaaeb7347016d68.png' },
  { id: 'featured', label: 'عروض مميزة', customImg: 'https://i.ibb.co/ymG5qHhr/image.png' },
  { id: 'بطاطس', label: 'أفضل العروض', customImg: 'https://i.ibb.co/qM6CsKHL/image.png' },
  { id: 'مكس', label: 'الأكثر مبيعًا', customImg: 'https://i.ibb.co/ccp4YM9J/image.png' },
  { id: 'بوكس', label: 'عروض لك', customImg: 'https://i.ibb.co/xqvHqJ3L/image.png' },
  { id: 'برجر',   label: 'برجر', customImg: 'https://i.ibb.co/27rm6C8v/image.png' },
  { id: 'بيتزا',  label: 'بيتزا',  customImg: 'https://i.ibb.co/DffJ48fc/Untitled.png' },
 { id: 'شاورما', label: 'شاورما',customImg: 'https://i.ibb.co/tTzwp6zV/image.png' },
  { id: 'دجاج',   label: 'دجاج',customImg: 'https://i.ibb.co/9HZtbjNb/image.png' },
  { id: 'مشاوي',  label: 'مشويات', customImg: 'https://i.ibb.co/tTzwp6zV/image.png' },
  { id: 'حلويات', label: 'حلويات', customImg: 'https://i.ibb.co/q3tDHGtX/image.png' },
]

const FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&display=swap');
  * {
    font-family: 'Cairo', sans-serif;
    line-height: 1.5;
  }
  .font-num { font-family: 'Poppins', 'Cairo', sans-serif; }
`

const STATUS_INFO = {
  pending: { text: 'في انتظار القبول', icon: '⏳', color: '#f59e0b' },
  accepted: { text: 'تم قبول طلبك', icon: '✅', color: '#10b981' },
  ready: { text: 'طلبك جاهز', icon: '🎉', color: ORANGE },
  completed: { text: 'اكتمل الطلب', icon: '✔️', color: MUTED },
  rejected: { text: 'تم رفض الطلب', icon: '❌', color: '#ef4444' },
  cancelled: { text: 'تم إلغاء الطلب', icon: '🚫', color: MUTED },
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

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function resolveOldPrice(offer, currentPrice) {
  const oldPrice = toNumber(
    offer?.oldPrice ??
    offer?.originalPrice ??
    offer?.priceBeforeDiscount ??
    offer?.beforePrice
  )
  if (oldPrice != null) return oldPrice
  if (offer?.discount > 0 && currentPrice != null) {
    return Math.round((currentPrice / (1 - offer.discount / 100)) * 100) / 100
  }
  return null
}

function resolveDiscount(offer, currentPrice, oldPrice) {
  const manualDiscount = toNumber(offer?.discount ?? offer?.discountPercent ?? offer?.discountPercentage)
  if (manualDiscount != null && manualDiscount > 0) return Math.round(manualDiscount)
  if (oldPrice != null && currentPrice != null && oldPrice > currentPrice) {
    return Math.round(((oldPrice - currentPrice) / oldPrice) * 100)
  }
  return null
}

function resolveRating(offer) {
  return (
    toNumber(offer?.restaurantRating) ??
    toNumber(offer?.rating) ??
    toNumber(offer?.restaurant?.rating) ??
    4.8
  )
}

function resolveDeliveryTime(offer) {
  return (
    offer?.deliveryTime ??
    offer?.estimatedDeliveryTime ??
    offer?.restaurantDeliveryTime ??
    offer?.prepTime ??
    '25-40 د'
  )
}

function resolveShortDescription(offer) {
  const raw = (offer?.description || offer?.shortDescription || '').trim()
  if (!raw) return 'عرض مميز بطعم رائع وسعر مناسب.'
  return raw.length > 65 ? `${raw.slice(0, 65).trim()}...` : raw
}

function resolveRestaurantName(offer, restaurantData) {
  if (restaurantData?.name) return restaurantData.name
  if (typeof offer?.restaurant === 'string' && offer.restaurant.trim()) return offer.restaurant.trim()
  return (
    offer?.restaurantName ||
    offer?.restaurant?.name ||
    offer?.vendorName ||
    offer?.branchName ||
    'مطعم'
  )
}

function resolveRestaurantLogo(offer, restaurantData) {
  return (
    restaurantData?.imageUrl ||
    restaurantData?.logoUrl ||
    restaurantData?.logo ||
    restaurantData?.restaurantLogo ||
    offer?.restaurantLogo ||
    offer?.restaurantLogoUrl ||
    offer?.restaurantImage ||
    offer?.restaurantImageUrl ||
    offer?.logoUrl ||
    offer?.logo ||
    offer?.vendorLogo ||
    offer?.brandLogo ||
    offer?.restaurant?.imageUrl ||
    offer?.restaurant?.logoUrl ||
    offer?.restaurant?.logo ||
    null
  )
}

function formatPrice(value) {
  if (value == null) return null
  return Number.isInteger(value) ? value : value.toFixed(2)
}

export default function ExploreScreen() {
  const {
    offers, orders, setCurrentScreen, setSelectedOffer, setSelectedRestaurant, setBottomNav, setActiveOrdersTab
  } = useApp()

  const [activeCategory, setActiveCategory] = useState(() => {
    try {
      const saved = localStorage.getItem('r2c_explore_category')
      localStorage.removeItem('r2c_explore_category')
      return saved || 'all'
    } catch {
      return 'all'
    }
  })

  const [displayMode, setDisplayMode] = useState(() => {
    try {
      return localStorage.getItem('r2c_explore_display_mode') || 'grid'
    } catch {
      return 'grid'
    }
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchBox, setShowSearchBox] = useState(false)
  const searchInputRef = useRef(null)

  const [showNotifs, setShowNotifs] = useState(false)
  const [seenKeys, setSeenKeys] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('r2c_seen') || '[]')) } catch { return new Set() }
  })
  const notifsRef = useRef(null)

  const [restaurantDataById, setRestaurantDataById] = useState({})

  const [featuredOffersSnapshot] = useState(() => {
    try {
      const raw = localStorage.getItem('r2c_explore_featured_offers')
      localStorage.removeItem('r2c_explore_featured_offers')
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    setBottomNav('explore')
  }, [setBottomNav])

  useEffect(() => {
    if (!showSearchBox) return undefined
    const id = setTimeout(() => searchInputRef.current?.focus(), 60)
    return () => clearTimeout(id)
  }, [showSearchBox])

  useEffect(() => {
    if (!showNotifs) return undefined
    const h = e => {
      if (notifsRef.current && !notifsRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showNotifs])

  useEffect(() => {
    try { localStorage.setItem('r2c_explore_display_mode', displayMode) } catch {}
  }, [displayMode])

  useEffect(() => {
    const restaurantIds = Array.from(new Set(
      (offers || [])
        .map(offer => offer?.restaurantId)
        .filter(Boolean)
    ))

    const missingIds = restaurantIds.filter(id => restaurantDataById[id] === undefined)
    if (missingIds.length === 0) return undefined

    let cancelled = false

    Promise.all(
      missingIds.slice(0, 40).map(async (restaurantId) => {
        try {
          const snap = await getDoc(doc(db, 'restaurants', restaurantId))
          return [restaurantId, snap.exists() ? { id: snap.id, ...snap.data() } : null]
        } catch {
          return [restaurantId, null]
        }
      })
    ).then(entries => {
      if (cancelled) return
      setRestaurantDataById(prev => {
        const next = { ...prev }
        entries.forEach(([restaurantId, restaurantData]) => {
          next[restaurantId] = restaurantData
        })
        return next
      })
    })

    return () => {
      cancelled = true
    }
  }, [offers, restaurantDataById])

  const filteredOffers = useMemo(() => {
    let list

    if (activeCategory === 'all') {
      list = offers || []
    } else if (activeCategory === 'featured') {
      if (featuredOffersSnapshot.length > 0) {
        list = featuredOffersSnapshot
      } else {
        const manualFeatured = (offers || []).filter(o => o.isFeatured === true)
        const base = manualFeatured.length > 0
          ? manualFeatured
          : [...(offers || [])].sort((a, b) => (b.discount || 0) - (a.discount || 0))

        list = base.slice(0, 12)
      }
    } else {
      list = (offers || []).filter(o => {
        const text = `${o.name || ''} ${o.description || ''} ${o.category || ''} ${o.cuisine || ''}`.toLowerCase()
        return text.includes(activeCategory.toLowerCase())
      })
    }

    const q = searchQuery.trim().toLowerCase()
    if (!q) return list

    return list.filter(offer => {
      const restaurantData = offer?.restaurantId ? restaurantDataById[offer.restaurantId] : null
      const text = `${offer?.name || ''} ${offer?.description || ''} ${offer?.shortDescription || ''} ${offer?.category || ''} ${offer?.cuisine || ''} ${offer?.restaurantName || ''} ${offer?.restaurant || ''} ${restaurantData?.name || ''}`.toLowerCase()
      return text.includes(q)
    })
  }, [offers, activeCategory, featuredOffersSnapshot, searchQuery, restaurantDataById])

  const notifOrders = useMemo(() => {
    if (!orders) return []
    return [...orders]
      .filter(o => o.status && STATUS_INFO[o.status])
      .sort((a, b) => {
        const t = x => x.updatedAt?.toMillis?.() ?? x.createdAt?.toMillis?.() ?? 0
        return t(b) - t(a)
      })
      .slice(0, 15)
  }, [orders])

  const unreadCount = notifOrders.filter(o => !seenKeys.has(`${o.id}_${o.status}`)).length

  const openNotifs = () => {
    setShowNotifs(true)
    const keys = notifOrders.map(o => `${o.id}_${o.status}`)
    const next = new Set([...seenKeys, ...keys])
    setSeenKeys(next)
    try { localStorage.setItem('r2c_seen', JSON.stringify([...next])) } catch {}
  }

  const handleOfferClick = (offer) => {
    setSelectedOffer(offer)
    setCurrentScreen('offerDetails')
  }

  const handleRestaurantClick = (offer, restaurantData) => {
    const restaurantName = resolveRestaurantName(offer, restaurantData)
    if (!offer?.restaurantId && !restaurantName) return
    setSelectedRestaurant({
      id: offer?.restaurantId || restaurantData?.id || null,
      name: restaurantName || 'مطعم',
      city: restaurantData?.city || offer?.restaurantCity || offer?.city || '',
    })
    setCurrentScreen('restaurantProfile')
  }

  const handleBack = () => {
    setBottomNav('home')
    setCurrentScreen('feed')
  }

  const toggleDisplayMode = () => {
    setDisplayMode(current => current === 'grid' ? 'list' : 'grid')
  }

  return (
    <>
      <style>{FONT_STYLE}</style>
      <style>{`
        .explore-scrollbar::-webkit-scrollbar { display: none; }
        .explore-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .explore-category-btn { transition: all 0.2s ease; }
        .explore-category-btn:active { transform: scale(0.95); }
        .explore-card-hover { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
        .explore-card-hover:active { transform: scale(0.985); }
        .r2c-btn-press { transition: transform 0.18s ease, box-shadow 0.18s ease; will-change: transform; }
        .r2c-btn-press:active { transform: scale(0.93); }
        .r2c-fade-in { animation: fadeSlideIn 0.22s ease both; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div dir="rtl" style={{ background: BG, minHeight: '100vh', color: TEXT, paddingBottom: 96 }}>
        {/* Header */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: WHITE,
          borderBottom: `1px solid ${BORDER}`,
          padding: '14px 12px 10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleBack}
              aria-label="رجوع"
              className="r2c-btn-press"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 42,
                height: 42,
                borderRadius: 14,
                border: `1px solid ${BORDER}`,
                background: WHITE,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                color: TEXT,
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                flexShrink: 0,
              }}
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <h1 style={{
              fontSize: 19,
              fontWeight: 800,
              margin: 0,
              flex: 1,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              استكشف العروض
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <button
                onClick={() => {
                  if (showSearchBox && searchQuery) setSearchQuery('')
                  setShowSearchBox(prev => !prev)
                }}
                aria-label="بحث"
                className="r2c-btn-press"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  border: `1px solid ${BORDER}`,
                  background: WHITE,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  color: showSearchBox ? ORANGE_DARK : '#374151',
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <SearchHeaderIcon />
              </button>

              <div style={{ position: 'relative', flexShrink: 0 }} ref={notifsRef}>
                <button
                  onClick={showNotifs ? () => setShowNotifs(false) : openNotifs}
                  aria-label="الإشعارات"
                  className="r2c-btn-press"
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
                  <BellHeaderIcon />

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
                    className="r2c-fade-in"
                    style={{
                      position: 'absolute',
                      top: 50,
                      left: 0,
                      width: 295,
                      maxHeight: 380,
                      overflowY: 'auto',
                      background: WHITE,
                      borderRadius: 20,
                      boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                      zIndex: 30,
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${BORDER}` }}>
                      <strong style={{ fontWeight: 700, fontSize: 13 }}>الإشعارات</strong>
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
                          style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', background: seen ? WHITE : '#fff4ef' }}
                        >
                          <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 18, flexShrink: 0, background: `${info.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{info.icon}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: info.color }}>{info.text}</div>
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
            <div className="r2c-fade-in" style={{ marginTop: 12, position: 'relative' }}>
              <input
                ref={searchInputRef}
                type="text"
                dir="rtl"
                placeholder="اكتبي كلمة البحث هنا"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  height: 50,
                  borderRadius: 16,
                  border: '1.5px solid #e5e7eb',
                  outline: 'none',
                  background: WHITE,
                  padding: '0 46px 0 42px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: TEXT,
                  textAlign: 'center',
                  boxShadow: '0 6px 16px rgba(17,24,39,0.045)',
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
                <SearchHeaderIcon />
              </span>
              {(searchQuery || showSearchBox) && (
                <button
                  onClick={() => {
                    if (searchQuery) setSearchQuery('')
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

        {/* Category Icons Filter */}
        <div style={{ padding: '12px 12px 8px', background: WHITE }}>
          <div
            className="explore-scrollbar"
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingBottom: 8,
              scrollSnapType: 'x mandatory',
            }}
          >
            {CUISINE_FILTERS.map((category) => (
              <div
                key={category.id}
                style={{
                  flexShrink: 0,
                  width: 80,
                  scrollSnapAlign: 'start',
                }}
              >
                <button
                  onClick={() => setActiveCategory(category.id)}
                  className="explore-category-btn"
                  style={{
                    border: 'none',
                    padding: '4px 2px 6px',
                    cursor: 'pointer',
                    background: 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 7,
                    width: '100%',
                  }}
                >
                  <div style={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: WHITE,
                    border: activeCategory === category.id ? `2.5px solid ${ORANGE}` : '2px solid transparent',
                    boxShadow: activeCategory === category.id ? `0 4px 14px ${ORANGE}33` : 'none',
                    flexShrink: 0,
                    transition: 'border 0.18s, box-shadow 0.18s',
                  }}>
                    <img
                      src={category.customImg || category.img}
                      alt={category.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        e.currentTarget.style.objectFit = 'contain'
                        e.currentTarget.style.padding = '8px'
                      }}
                    />
                  </div>
                  <div style={{
                    fontSize: 12,
                    fontWeight: activeCategory === category.id ? 800 : 600,
                    color: activeCategory === category.id ? ORANGE : TEXT,
                    textAlign: 'center',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    transition: 'color 0.18s',
                  }}>
                    {category.label}
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Display Controls */}
        <div style={{
          background: WHITE,
          padding: '2px 12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }} className="explore-scrollbar">
            <FilterPill label="عروض جديدة" />
            <FilterPill label="الأقرب إليك" />
          </div>

          <button
            onClick={toggleDisplayMode}
            aria-label="تبديل شكل العرض"
            style={{
              flexShrink: 0,
              height: 42,
              minWidth: 110,
              borderRadius: 999,
              border: `1px solid ${BORDER}`,
              background: WHITE,
              color: ORANGE_DARK,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(17, 24, 39, 0.04)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {displayMode === 'grid' ? <ListIcon /> : <GridIcon />}
            {displayMode === 'grid' ? 'عرض قائمة' : 'عرض شبكي'}
          </button>
        </div>

        {/* Offers */}
        <div style={{ padding: displayMode === 'grid' ? '26px 12px 20px' : '18px 12px 20px', background: WHITE }}>
          {filteredOffers.length === 0 ? (
            <EmptyOffers />
          ) : displayMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 14, rowGap: 34 }}>
              {filteredOffers.map((offer) => {
                const restaurantData = offer?.restaurantId ? restaurantDataById[offer.restaurantId] : null
                return (
                  <OfferGridCard
                    key={offer.id}
                    offer={offer}
                    restaurantData={restaurantData}
                    onOfferClick={() => handleOfferClick(offer)}
                    onRestaurantClick={() => handleRestaurantClick(offer, restaurantData)}
                  />
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {filteredOffers.map((offer) => {
                const restaurantData = offer?.restaurantId ? restaurantDataById[offer.restaurantId] : null
                return (
                  <OfferListCard
                    key={offer.id}
                    offer={offer}
                    restaurantData={restaurantData}
                    onOfferClick={() => handleOfferClick(offer)}
                    onRestaurantClick={() => handleRestaurantClick(offer, restaurantData)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function OfferGridCard({ offer, restaurantData, onOfferClick, onRestaurantClick }) {
  const currentPrice = toNumber(offer.price ?? offer.finalPrice ?? offer.discountedPrice)
  const oldPrice = resolveOldPrice(offer, currentPrice)
  const discount = resolveDiscount(offer, currentPrice, oldPrice)
  const rating = resolveRating(offer)
  const restaurantName = resolveRestaurantName(offer, restaurantData)

  return (
    <div
      onClick={onOfferClick}
      className="explore-card-hover"
      style={{
        background: WHITE,
        borderRadius: 18,
        border: `1px solid ${BORDER}`,
        boxShadow: '0 8px 20px rgba(17, 24, 39, 0.045)',
        cursor: 'pointer',
        minWidth: 0,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <div style={{
        position: 'relative',
        height: 'clamp(118px, 31vw, 155px)',
        background: '#f3f4f6',
        overflow: 'visible',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '18px 18px 0 0',
          overflow: 'hidden',
        }}>
          <OfferImage offer={offer} size="large" />
        </div>

        <RestaurantLogo
          offer={offer}
          restaurantData={restaurantData}
          restaurantName={restaurantName}
          onClick={(e) => {
            e.stopPropagation()
            onRestaurantClick()
          }}
          size={52}
          style={{ position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)' }}
        />

        {discount != null && discount > 0 && (
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            minWidth: 36,
            padding: '5px 6px 7px',
            background: ORANGE,
            color: WHITE,
            borderRadius: '0 0 11px 11px',
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 900,
            lineHeight: 1.05,
            boxShadow: '0 7px 16px rgba(238, 123, 38, 0.22)',
            zIndex: 4,
          }}>
            <span className="font-num">{discount}</span>
            <br />%
          </div>
        )}

        <div style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          background: 'rgba(17, 24, 39, 0.84)',
          color: WHITE,
          padding: '4px 7px',
          borderRadius: '0 8px 0 0',
          fontSize: 11,
          fontWeight: 800,
          zIndex: 4,
        }}>
          <span className="font-num">{rating.toFixed ? rating.toFixed(1) : rating}</span> ⭐
        </div>
      </div>

      <div style={{ padding: '12px 12px 14px', minHeight: 146 }}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRestaurantClick()
          }}
          style={{
            border: 'none',
            background: 'transparent',
            color: ORANGE_DARK,
            fontSize: 12,
            fontWeight: 800,
            padding: 0,
            margin: '0 0 6px',
            cursor: 'pointer',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            textAlign: 'right',
          }}
        >
          {restaurantName}
        </button>

        <h3 style={{
          fontSize: 14,
          fontWeight: 900,
          color: TEXT,
          margin: '0 0 14px',
          lineHeight: 1.5,
          minHeight: 42,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {offer.name || resolveShortDescription(offer)}
        </h3>

        <PriceRow currentPrice={currentPrice} oldPrice={oldPrice} compact />
      </div>
    </div>
  )
}

function OfferListCard({ offer, restaurantData, onOfferClick, onRestaurantClick }) {
  const currentPrice = toNumber(offer.price ?? offer.finalPrice ?? offer.discountedPrice)
  const oldPrice = resolveOldPrice(offer, currentPrice)
  const discount = resolveDiscount(offer, currentPrice, oldPrice)
  const rating = resolveRating(offer)
  const deliveryTime = resolveDeliveryTime(offer)
  const shortDescription = resolveShortDescription(offer)
  const restaurantName = resolveRestaurantName(offer, restaurantData)

  return (
    <div
      onClick={onOfferClick}
      className="explore-card-hover"
      style={{
        position: 'relative',
        background: WHITE,
        borderRadius: 22,
        padding: '12px 12px 12px 54px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        cursor: 'pointer',
        boxShadow: '0 6px 18px rgba(17, 24, 39, 0.06)',
        border: `1px solid ${BORDER}`,
        overflow: 'visible',
      }}
    >
      <div style={{
        width: 132,
        minHeight: 132,
        alignSelf: 'stretch',
        borderRadius: 18,
        background: '#f3f4f6',
        flexShrink: 0,
        border: `1px solid ${BORDER}`,
        position: 'relative',
        overflow: 'visible',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 18,
          overflow: 'hidden',
        }}>
          <OfferImage offer={offer} size="large" />
        </div>

        <RestaurantLogo
          offer={offer}
          restaurantData={restaurantData}
          restaurantName={restaurantName}
          onClick={(e) => {
            e.stopPropagation()
            onRestaurantClick()
          }}
          size={46}
          style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)' }}
        />

        {discount != null && discount > 0 && (
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: ORANGE,
            color: WHITE,
            borderRadius: '0 0 10px 10px',
            padding: '4px 6px',
            fontSize: 11,
            fontWeight: 900,
            lineHeight: 1,
            zIndex: 4,
          }}>
            <span className="font-num">{discount}</span>%
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRestaurantClick()
          }}
          style={{
            border: 'none',
            background: 'transparent',
            color: ORANGE_DARK,
            fontSize: 12,
            fontWeight: 800,
            padding: 0,
            margin: '0 0 4px',
            cursor: 'pointer',
            textAlign: 'right',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {restaurantName}
        </button>

        <h3 style={{
          fontSize: 15,
          fontWeight: 900,
          color: TEXT,
          margin: '0 0 6px',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {offer.name}
        </h3>

        <p style={{
          fontSize: 11,
          color: MUTED,
          margin: '0 0 9px',
          lineHeight: 1.55,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {shortDescription}
        </p>

        <PriceRow currentPrice={currentPrice} oldPrice={oldPrice} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>
          <InfoPill label={`⭐ ${rating.toFixed ? rating.toFixed(1) : rating}`} />
          <InfoPill label={`⏱ ${deliveryTime}`} />
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onOfferClick()
        }}
        aria-label="فتح العرض"
        style={{
          position: 'absolute',
          left: 13,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 34,
          height: 34,
          borderRadius: '50%',
          border: `1px solid rgba(238, 123, 38, 0.18)`,
          background: ORANGE_SOFT,
          color: ORANGE_DARK,
          boxShadow: '0 6px 14px rgba(238, 123, 38, 0.16)',
          fontSize: 22,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        +
      </button>
    </div>
  )
}

function RestaurantLogo({ offer, restaurantData, restaurantName, onClick, size = 46, style }) {
  const logoUrl = resolveRestaurantLogo(offer, restaurantData)
  const letter = (restaurantName || 'R').trim().charAt(0) || 'R'

  return (
    <button
      onClick={onClick}
      aria-label={`فتح مطعم ${restaurantName}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '3px solid #ffffff',
        background: WHITE,
        overflow: 'hidden',
        boxShadow: '0 8px 18px rgba(17, 24, 39, 0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: ORANGE_DARK,
        fontSize: Math.max(15, size * 0.36),
        fontWeight: 900,
        cursor: 'pointer',
        padding: 0,
        zIndex: 5,
        ...style,
      }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={restaurantName}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            if (e.currentTarget.nextSibling) {
              e.currentTarget.nextSibling.style.display = 'flex'
            }
          }}
        />
      ) : null}
      <span style={{ display: logoUrl ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {letter}
      </span>
    </button>
  )
}

function PriceRow({ currentPrice, oldPrice, compact = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
      {currentPrice != null && (
        <span style={{ fontSize: compact ? 17 : 15, fontWeight: 900, color: TEXT }} className="font-num">
          {formatPrice(currentPrice)} <span style={{ fontSize: compact ? 11 : 10, color: MUTED }}>ر.س</span>
        </span>
      )}
      {oldPrice != null && oldPrice > (currentPrice ?? 0) && (
        <span style={{ fontSize: compact ? 13 : 12, color: '#9ca3af', textDecoration: 'line-through', fontWeight: 700 }} className="font-num">
          {formatPrice(oldPrice)} ر.س
        </span>
      )}
    </div>
  )
}

function FilterPill({ label }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 40,
      padding: '0 15px',
      borderRadius: 999,
      border: `1px solid ${BORDER}`,
      color: TEXT,
      background: WHITE,
      fontSize: 13,
      fontWeight: 800,
      whiteSpace: 'nowrap',
      boxShadow: '0 3px 12px rgba(17, 24, 39, 0.035)',
    }}>
      {label}
    </span>
  )
}

function InfoPill({ label }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '5px 10px',
      borderRadius: 999,
      background: '#fffaf5',
      border: `1px solid rgba(238, 123, 38, 0.10)`,
      color: TEXT,
      fontSize: 10,
      fontWeight: 700,
      whiteSpace: 'nowrap',
      minHeight: 28,
    }}>
      {label}
    </span>
  )
}

function EmptyOffers() {
  return (
    <div style={{
      background: WHITE,
      borderRadius: 20,
      border: `1px solid ${BORDER}`,
      padding: '40px 20px',
      textAlign: 'center',
      color: MUTED,
      boxShadow: SHADOW,
    }}>
      <div style={{ fontSize: 22, marginBottom: 10 }}>🔍</div>
      <div style={{ fontWeight: 800, color: TEXT, marginBottom: 6, fontSize: 14 }}>
        لا توجد عروض في هذه الفئة
      </div>
      <div style={{ fontSize: 13 }}>جرّب فئة أخرى</div>
    </div>
  )
}


function SearchHeaderIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="20" y1="20" x2="16.65" y2="16.65" />
    </svg>
  )
}

function BellHeaderIcon() {
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

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  )
}
