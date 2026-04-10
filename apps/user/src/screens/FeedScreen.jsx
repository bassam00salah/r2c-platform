import { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../contexts'
import OfferImage from '../components/OfferImage'
import { db } from '@r2c/shared/firebase/config'
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore'

const ORANGE = '#ee7b26'
const ORANGE_DARK = '#d96a18'
const ORANGE_SOFT = '#fff3e8'
const NAVY        = '#0d1f35'   // كحلي غامق – خلفية البطاقات والبانرات
const NAVY_MID    = '#152d4a'   // كحلي متوسط
const NAVY_DARK   = '#080f1a'   // كحلي أعمق للتدرج
// ── legacy aliases (for any remaining references) ──
const BLUE        = NAVY
const BLUE_LIGHT  = NAVY_MID
const BLUE_DARK   = NAVY_DARK
const BLUE_SOFT   = '#eaf1f9'


const GOLD = '#ee7b26'  // برتقالي بدل ذهبي
// ── aliases للتوافق مع الكود ─────────────────────────────────────────────────
const RED      = ORANGE        // كان أحمر، الآن برتقالي المشروع
const RED_DARK = ORANGE_DARK   // كان أحمر داكن، الآن برتقالي داكن
const BG = '#f4f6f9'
const WHITE = '#ffffff'
const TEXT = '#111827'
const MUTED = '#6b7280'
const BORDER = '#e5e7eb'
const SHADOW = '0 10px 30px rgba(238, 123, 38, 0.10)'

const FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Poppins:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Cairo', 'Poppins', sans-serif; }
  .font-num { font-family: 'Poppins', 'Cairo', sans-serif; }
`

const EMOJI_3D = {
  all: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f37d_fe0f/512.webp',
  burger: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f354/512.webp',
  pizza: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f355/512.webp',
  shawarma: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f32f/512.webp',
  chicken: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f357/512.webp',
  fish: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f41f/512.webp',
  grills: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f969/512.webp',
  sweets: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f370/512.webp',
}

const CUISINE_FILTERS = [
  { id: 'all', label: 'الكل', img: EMOJI_3D.all },
  { id: 'برجر', label: 'برجر', img: EMOJI_3D.burger },
  { id: 'بيتزا', label: 'بيتزا', img: EMOJI_3D.pizza },
  { id: 'شاورما', label: 'شاورما', img: EMOJI_3D.shawarma },
  { id: 'دجاج', label: 'دجاج', img: EMOJI_3D.chicken },
  { id: 'أسماك', label: 'أسماك', img: EMOJI_3D.fish },
  { id: 'مشاوي', label: 'مشويات', img: EMOJI_3D.grills },
  { id: 'حلويات', label: 'حلويات', img: EMOJI_3D.sweets },
]

const CUSTOM_CATEGORIES = [
  { id: 'popular', label: 'الأكثر مبيعًا', emoji: '🔥', keywords: ['عرض', 'خصم', 'وجبة', 'بيتزا', 'شاورما'] },
  { id: 'family', label: 'عروض عائلية', emoji: '👨‍👩‍👧', keywords: ['عائلة', 'عائلي', 'كومبو', 'وجبة'] },
  { id: 'quick', label: 'وجبات سريعة', emoji: '⚡', keywords: ['برجر', 'دجاج', 'بطاطس', 'شاورما'] },
  { id: 'sweet', label: 'حلويات', emoji: '🍰', keywords: ['كيك', 'حلويات', 'حلو', 'تورتة'] },
]

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

function normalizeRestaurantCategories(r) {
  if (Array.isArray(r.categories) && r.categories.length) return r.categories.join('، ')
  if (typeof r.category === 'string' && r.category.trim()) return r.category
  if (typeof r.cuisine === 'string' && r.cuisine.trim()) return r.cuisine
  return ''
}

function resolveRestaurantLogo(r) {
  return r?.logoUrl || r?.logo || r?.imageUrl || r?.photo || r?.photoUrl || r?.image || r?.thumbnailUrl || ''
}

function getOfferImage(offer) {
  return offer?.imageUrl || offer?.photo || offer?.thumbnailUrl || ''
}

function pickCuisineImage(filter, offers, restaurants) {
  if (filter.id === 'all') {
    return getOfferImage(offers?.[0]) || resolveRestaurantLogo(restaurants?.[0]) || filter.img
  }
  const matchOffer = (offers || []).find(o => {
    const text = `${o?.name || ''} ${o?.description || ''} ${o?.category || ''} ${o?.cuisine || ''}`.toLowerCase()
    return text.includes(filter.id.toLowerCase())
  })
  if (matchOffer) return getOfferImage(matchOffer) || filter.img
  const matchRestaurant = (restaurants || []).find(r => {
    const text = `${r?.name || ''} ${r?.category || ''} ${r?.cuisine || ''}`.toLowerCase()
    return text.includes(filter.id.toLowerCase())
  })
  return resolveRestaurantLogo(matchRestaurant) || filter.img
}


// ── القائمة الجانبية ────────────────────────────────────────────────────────
function SideMenu({ isOpen, onClose, setCurrentScreen }) {
  const items = [
    { icon: '🛍️', label: 'طلباتي',  screen: 'orders' },
    { icon: '👤', label: 'حسابي',   screen: 'profile' },
    { icon: '🎁', label: 'العروض',  screen: 'search' },
  ]
  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 40 }}
        />
      )}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100%', width: 270,
        background: WHITE, zIndex: 50,
        boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
      }} dir="rtl">
        {/* Header */}
        <div style={{ background: NAVY, padding: '20px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/logo.png" alt="R2C" style={{ height: 36, objectFit: 'contain' }} onError={e => { e.currentTarget.style.display = 'none' }} />
          <button
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.12)', color: WHITE, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
        </div>
        {/* Items */}
        <div style={{ flex: 1, padding: '12px 10px' }}>
          {items.map(item => (
            <button
              key={item.screen}
              onClick={() => { setCurrentScreen(item.screen); onClose() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 14px', borderRadius: 14, border: 'none',
                background: 'transparent', cursor: 'pointer', marginBottom: 4,
                textAlign: 'right',
              }}
              onMouseEnter={e => e.currentTarget.style.background = ORANGE_SOFT}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ width: 42, height: 42, borderRadius: 12, background: ORANGE_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{item.label}</span>
              <span style={{ marginRight: 'auto', color: MUTED, fontSize: 16 }}>‹</span>
            </button>
          ))}
        </div>
        {/* Footer */}
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${BORDER}`, textAlign: 'center', color: MUTED, fontSize: 12, fontWeight: 600 }}>
          R2C — عروض المطاعم الحصرية
        </div>
      </div>
    </>
  )
}

export default function FeedScreen() {
  const {
    offers, orders, loadingOffers,
    setCurrentScreen, setSelectedOffer, setSelectedRestaurant,
  } = useApp()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCuisine, setActiveCuisine] = useState('all')
  const [activeCustomCat, setActiveCustomCat] = useState(null)
  const [sortBy, setSortBy] = useState('default')
  const [showNotifs, setShowNotifs] = useState(false)
  const [seenKeys, setSeenKeys] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('r2c_seen') || '[]')) } catch { return new Set() }
  })
  const notifsRef = useRef(null)
  const restaurantsSectionRef = useRef(null)
  const [showSideMenu, setShowSideMenu] = useState(false)

  const [cityName, setCityName] = useState('...')
  useEffect(() => {
    const reverseGeocode = async (lat, lng) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`)
        const data = await res.json()
        setCityName(
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.county ||
          data.address?.state ||
          'موقعك'
        )
      } catch {
        setCityName('موقعك')
      }
    }
    if (!navigator.geolocation) { setCityName('موقعك'); return }
    navigator.geolocation.getCurrentPosition(
      pos => reverseGeocode(pos.coords.latitude, pos.coords.longitude),
      () => setCityName('موقعك'),
      { timeout: 6000, maximumAge: 300000 }
    )
  }, [])

  const [allRestaurants, setAllRestaurants] = useState([])
  const [restaurantsError, setRestaurantsError] = useState(false)
  useEffect(() => {
    setRestaurantsError(false)
    const unsub = onSnapshot(
      collection(db, 'restaurants'),
      snap => {
        setAllRestaurants(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setRestaurantsError(false)
      },
      err => {
        console.error('[FeedScreen] onSnapshot restaurants error:', err)
        setRestaurantsError(true)
      }
    )
    return () => unsub()
  }, [])

  const [banner, setBanner] = useState({ text: null, restaurantId: null, restaurantName: null, imageUrl: null, discountValue: null, banner2ImageUrl: null })
  useEffect(() => {
    getDoc(doc(db, 'system', 'settings')).then(snap => {
      if (!snap.exists()) return
      const d = snap.data()
      setBanner({
        text: d.bannerText || null,
        restaurantId: d.bannerRestaurantId || null,
        restaurantName: d.bannerRestaurantName || null,
        imageUrl: d.bannerImageUrl || null,
        discountValue: d.bannerDiscountValue || null,
        banner2ImageUrl: d.banner2ImageUrl || null,
      })
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!showNotifs) return
    const h = e => {
      if (notifsRef.current && !notifsRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showNotifs])

  const offerStats = useMemo(() => {
    const map = {}
    ;(offers || []).forEach(o => {
      const id = o.restaurantId || o.restaurant || o.restaurantName
      if (!id) return
      if (!map[id]) map[id] = { offerCount: 0, maxDiscount: 0 }
      map[id].offerCount += 1
      map[id].maxDiscount = Math.max(map[id].maxDiscount, o.discount || 0)
    })
    return map
  }, [offers])

  const restaurants = useMemo(() => {
    const base = allRestaurants.length > 0 ? allRestaurants : (() => {
      const map = {}
      ;(offers || []).forEach(o => {
        const id = o.restaurantId || o.restaurant || o.restaurantName
        const name = o.restaurantName || o.restaurant || ''
        if (!id || !name || map[id]) return
        map[id] = {
          id,
          name,
          city: o.city || '',
          category: o.category || o.cuisine || '',
          imageUrl: o.imageUrl || o.photo || '',
          logoUrl: o.logoUrl || o.logo || o.photoUrl || '',
        }
      })
      return Object.values(map)
    })()
    return base.map(r => ({
      ...r,
      logoUrl: resolveRestaurantLogo(r),
      offerCount: offerStats[r.id]?.offerCount || 0,
      maxDiscount: offerStats[r.id]?.maxDiscount || 0,
    }))
  }, [allRestaurants, offers, offerStats])

  const featuredOffers = useMemo(() => {
    const restMap = {}
    allRestaurants.forEach(r => { restMap[r.id] = r.name })
    return [...(offers || [])]
      .sort((a, b) => (b.discount || 0) - (a.discount || 0))
      .slice(0, 12)
      .map(offer => ({
        ...offer,
        restaurantName: restMap[offer.restaurantId] || offer.restaurantName || offer.restaurant || '',
      }))
  }, [offers, allRestaurants])

  const restaurantsInCustomCat = useMemo(() => {
    if (!activeCustomCat) return null
    const cat = CUSTOM_CATEGORIES.find(c => c.id === activeCustomCat)
    if (!cat) return null
    const ids = new Set()
    ;(offers || []).forEach(o => {
      const text = `${o.name || ''} ${o.description || ''} ${o.category || ''}`.toLowerCase()
      if (cat.keywords.some(k => text.includes(k))) {
        const id = o.restaurantId || o.restaurant || o.restaurantName
        if (id) ids.add(id)
      }
    })
    return ids
  }, [activeCustomCat, offers])

  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let list = restaurants.filter(r => {
      const hay = `${r.name || ''} ${r.city || ''} ${r.category || ''} ${r.cuisine || ''}`.toLowerCase()
      const matchSearch = !q || hay.includes(q)
      const matchCuisine = activeCuisine === 'all' || hay.includes(activeCuisine.toLowerCase())
      const matchCustom = !restaurantsInCustomCat || restaurantsInCustomCat.has(r.id)
      return matchSearch && matchCuisine && matchCustom
    })
    if (sortBy === 'discount') list = [...list].sort((a, b) => b.maxDiscount - a.maxDiscount)
    else if (sortBy === 'popular') list = [...list].sort((a, b) => b.offerCount - a.offerCount)
    else list = [...list].sort((a, b) => b.offerCount - a.offerCount)
    return list
  }, [restaurants, searchQuery, activeCuisine, restaurantsInCustomCat, sortBy])

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

  const openOffer = o => { setSelectedOffer(o); setCurrentScreen('offerDetails') }
  const openRestaurant = r => {
    setSelectedRestaurant({ id: r.id, name: r.name, city: r.city })
    setCurrentScreen('restaurantProfile')
  }
  const handleBannerClick = () => {
    if (!banner.restaurantId) return
    setSelectedRestaurant({ id: banner.restaurantId, name: banner.restaurantName || '', city: '' })
    setCurrentScreen('restaurantProfile')
  }

  const quickExploreItems = useMemo(() => {
    const base = [CUISINE_FILTERS[2], CUISINE_FILTERS[3], CUISINE_FILTERS[1], CUISINE_FILTERS[4], CUISINE_FILTERS[6], CUISINE_FILTERS[7]]
    return base.map((filter, idx) => ({
      id: filter.id,
      label: filter.label,
      image: pickCuisineImage(filter, featuredOffers, restaurants),
      accent: idx % 2 === 0 ? ORANGE : ORANGE_DARK,
      onClick: () => {
        setActiveCuisine(filter.id)
        setActiveCustomCat(null)
        setTimeout(() => {
          restaurantsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 80)
      },
    }))
  }, [featuredOffers, restaurants])

  const topSellerOffers = useMemo(() => featuredOffers.slice(0, 6), [featuredOffers])
  const quickPickOffers = useMemo(() => featuredOffers.slice(2, 8), [featuredOffers])
  const pizzaLoveOffers = useMemo(() => {
    const pizza = featuredOffers.filter(o => `${o.name || ''} ${o.description || ''} ${o.category || ''}`.toLowerCase().includes('بيتزا'))
    return (pizza.length ? pizza : featuredOffers).slice(0, 6)
  }, [featuredOffers])

  if (loadingOffers) {
    return (
      <>
        <style>{FONT_STYLE}</style>
        <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, border: `4px solid ${ORANGE}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: MUTED, fontWeight: 700, margin: 0 }}>جاري تحميل العروض...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </>
    )
  }

  if (!offers || offers.length === 0) {
    return (
      <>
        <style>{FONT_STYLE}</style>
        <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 72, marginBottom: 12 }}>📭</div>
            <h2 style={{ margin: '0 0 8px', color: TEXT, fontWeight: 900 }}>لا توجد عروض حالياً</h2>
            <p style={{ color: MUTED, margin: 0 }}>سيتم إضافة عروض جديدة قريباً</p>
          </div>
        </div>
      </>
    )
  }

  const isSearching = searchQuery.trim().length > 0

  return (
    <>
      <SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} setCurrentScreen={setCurrentScreen} />
      <style>{FONT_STYLE}</style>
      <style>{`
        .r2c-scrollbar::-webkit-scrollbar { display: none; }
        .r2c-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .r2c-card-hover { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .r2c-card-hover:active { transform: scale(0.98); }
        .r2c-btn-press:active { transform: scale(0.95); }
        .r2c-fade-in { animation: fadeSlideIn 0.22s ease both; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div dir="rtl" style={{ background: BG, minHeight: '100vh', paddingBottom: 96, color: TEXT }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          padding: '12px 12px 10px',
          background: 'rgba(255,255,255,0)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <img
              src="/logo.png"
              alt="R2C"
              style={{ height: 44, width: 'auto', objectFit: 'contain', display: 'block', flexShrink: 0 }}
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
            <button
              onClick={() => setShowSideMenu(true)}
              className="r2c-btn-press"
              style={{
                width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${BORDER}`,
                background: WHITE, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 5, flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {[0,1,2].map(i => (
                <span key={i} style={{ display: 'block', width: i === 1 ? 14 : 18, height: 2, background: NAVY, borderRadius: 2 }} />
              ))}
            </button>

            <div style={{ flex: 1, background: 'rgba(255,255,255,0)', borderRadius: 18, border: '1px solid rgba(238,123,38,0.22)', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15 }}>📍</span>
              <div style={{ fontSize: 13, color: ORANGE, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cityName}
              </div>
            </div>

            <div style={{ position: 'relative' }} ref={notifsRef}>
              <button onClick={showNotifs ? () => setShowNotifs(false) : openNotifs} className="r2c-btn-press" style={headerIconBtnStyle}>🛍️
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -3, left: -3,
                    minWidth: 18, height: 18, padding: '0 4px',
                    borderRadius: 999, background: RED, color: '#fff',
                    fontSize: 9, fontWeight: 900,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${WHITE}`,
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="r2c-fade-in" style={{
                  position: 'absolute', top: 46, left: 0,
                  width: 295, maxHeight: 380, overflowY: 'auto',
                  background: WHITE, borderRadius: 20, boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                  zIndex: 30, border: `1px solid ${BORDER}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${BORDER}` }}>
                    <strong style={{ fontWeight: 800, fontSize: 15 }}>الإشعارات</strong>
                    <button onClick={() => setShowNotifs(false)} style={{ border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                  {notifOrders.length === 0 ? (
                    <div style={{ padding: '24px 20px', textAlign: 'center', color: MUTED, fontSize: 14 }}>لا توجد إشعارات</div>
                  ) : notifOrders.map(order => {
                    const info = STATUS_INFO[order.status] || STATUS_INFO.pending
                    const seen = seenKeys.has(`${order.id}_${order.status}`)
                    return (
                      <div key={`${order.id}_${order.status}`} onClick={() => { setShowNotifs(false); setCurrentScreen('orders') }} style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', background: seen ? WHITE : '#fff4ef' }}>
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

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              dir="rtl"
              placeholder="ابحث في المطاعم أو العروض..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', height: 46,
                borderRadius: 18, border: 'none', outline: 'none',
                background: WHITE, padding: '0 44px 0 16px',
                fontSize: 14, boxShadow: SHADOW, color: TEXT,
              }}
            />
            <span style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', color: RED, fontSize: 16 }}>🔍</span>
          </div>
        </div>

        {!isSearching && (
          <>
            <div style={{ padding: '0 12px' }}>
              <HeroBanner banner={banner} onClick={handleBannerClick} />
            </div>

            <SectionBar title="استكشف القائمة" action="عرض الكل" onAction={() => { setActiveCuisine('all'); setActiveCustomCat(null); restaurantsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} />
            <div style={{ padding: '0 12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                {quickExploreItems.map(item => (
                  <ExploreCategoryCard key={item.id} item={item} active={activeCuisine === item.id} />
                ))}
              </div>
            </div>

            <div style={{ padding: '14px 12px 0' }}>
              <TopOffersPromo offers={featuredOffers} onOpenOffer={openOffer} banner2ImageUrl={banner.banner2ImageUrl} />
            </div>

            <ProductSection
              title="الأكثر مبيعًا"
              action="عرض الكل"
              offers={topSellerOffers}
              onOpenOffer={openOffer}
              onOpenRestaurant={openRestaurant}
              onViewAll={() => { setSortBy('default'); setActiveCuisine('all'); setActiveCustomCat(null); restaurantsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
            />

            <div style={{ padding: '10px 12px 0' }}>
              <InfoTimelineCard />
            </div>

            <ProductSection
              title="أفضل الخيارات"
              action="عرض الكل"
              offers={quickPickOffers}
              onOpenOffer={openOffer}
              onOpenRestaurant={openRestaurant}
              onViewAll={() => { setSortBy('default'); setActiveCuisine('all'); setActiveCustomCat(null); restaurantsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
            />

            <ProductSection
              title="من أجل حب البيتزا"
              action="عرض الكل"
              offers={pizzaLoveOffers}
              onOpenOffer={openOffer}
              onOpenRestaurant={openRestaurant}
              onViewAll={() => { setSortBy('default'); setActiveCuisine('بيتزا'); setActiveCustomCat(null); restaurantsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
            />
          </>
        )}

        <section ref={restaurantsSectionRef} style={{ padding: isSearching ? '14px 12px 0' : '18px 12px 0' }}>
          <SectionBar title={isSearching ? 'نتائج المطاعم' : 'المطاعم المشاركة'} action={filteredRestaurants.length > 0 ? `${filteredRestaurants.length}` : ''} actionMuted />

          {restaurantsError && (
            <div style={{ margin: '0 0 12px', background: ORANGE_SOFT, border: `1px solid rgba(238,123,38,0.35)`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: RED_DARK }}>تعذّر تحميل المطاعم</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>تحقق من اتصالك بالإنترنت وأعد المحاولة</div>
              </div>
            </div>
          )}

          <div className="r2c-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12 }}>
            <FilterChip active={sortBy === 'default' && activeCuisine === 'all'} onClick={() => { setSortBy('default'); setActiveCuisine('all'); setActiveCustomCat(null) }} icon="☰">الكل</FilterChip>
            <FilterChip active={sortBy === 'discount'} onClick={() => setSortBy('discount')} icon="٪">الأكثر خصماً</FilterChip>
            <FilterChip active={sortBy === 'popular'} onClick={() => setSortBy('popular')} icon="🏆">الأكثر عروضاً</FilterChip>
            {CUISINE_FILTERS.slice(1, 5).map(cat => (
              <FilterChip key={cat.id} active={activeCuisine === cat.id} onClick={() => { setActiveCuisine(cat.id); setActiveCustomCat(null) }}>
                {cat.label}
              </FilterChip>
            ))}
          </div>

          {!isSearching && (
            <div className="r2c-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12 }}>
              {CUSTOM_CATEGORIES.map(cat => (
                <FilterChip key={cat.id} active={activeCustomCat === cat.id} onClick={() => setActiveCustomCat(prev => prev === cat.id ? null : cat.id)} icon={cat.emoji}>
                  {cat.label}
                </FilterChip>
              ))}
            </div>
          )}

          {isSearching && (
            <div style={{ marginBottom: 10, fontSize: 13, color: MUTED, fontWeight: 600 }}>
              {filteredRestaurants.length} نتيجة لـ "{searchQuery}"
            </div>
          )}

          {filteredRestaurants.length === 0 ? (
            <EmptyState searchQuery={searchQuery} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredRestaurants.map(r => (
                <RestaurantCard key={r.id} restaurant={r} onClick={() => openRestaurant(r)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}

const headerIconBtnStyle = {
  width: 40,
  height: 40,
  borderRadius: 14,
  border: '1.5px solid rgba(255,255,255,0.25)',
  background: 'rgba(255,255,255,0.15)',
  boxShadow: 'none',
  color: WHITE,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  position: 'relative',
}

function HeroBanner({ banner, onClick }) {
  return (
    <div
      onClick={banner.restaurantId ? onClick : undefined}
      className="r2c-card-hover"
      style={{
        position: 'relative',
        height: 178,
        borderRadius: 22,
        overflow: 'hidden',
        cursor: banner.restaurantId ? 'pointer' : 'default',
        boxShadow: SHADOW,
        background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 50%, ${BLUE_DARK} 100%)`,
      }}
    >
      {banner.imageUrl
        ? <img src={banner.imageUrl} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : null}
    </div>
  )
}
function ExploreCategoryCard({ item, active }) {
  return (
    <button onClick={item.onClick} className="r2c-btn-press" style={{ border: 'none', background: WHITE, borderRadius: 18, padding: '12px 8px 10px', boxShadow: SHADOW, cursor: 'pointer' }}>
      <div style={{ width: 86, height: 86, margin: '0 auto 8px', borderRadius: '50%', overflow: 'hidden', background: '#f3f4f6', border: `3px solid ${active ? RED : '#f0f0f0'}` }}>
        {item.image ? (
          <img src={item.image} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>🍽️</div>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: TEXT, lineHeight: 1.25, minHeight: 34 }}>{item.label}</div>
      <div style={{ width: 46, height: 3, borderRadius: 3, background: item.accent, margin: '8px auto 0' }} />
    </button>
  )
}

function TopOffersPromo({ offers, onOpenOffer, banner2ImageUrl }) {
  const topThree = useMemo(() => {
    return [...(offers || [])]
      .filter(o => (o.price ?? o.finalPrice ?? o.discountedPrice) != null)
      .sort((a, b) => {
        const pa = a.price ?? a.finalPrice ?? a.discountedPrice ?? 0
        const pb = b.price ?? b.finalPrice ?? b.discountedPrice ?? 0
        return pb - pa
      })
      .slice(0, 3)
  }, [offers])

  if (!topThree.length) return null

  // البانر 2: استخدم صورة الإدارة إن وُجدت، وإلا صورة أول عرض
  const heroImageUrl = banner2ImageUrl || getOfferImage(topThree[0]) || ''

  return (
    <div style={{ borderRadius: 22, boxShadow: '0 12px 36px rgba(15,23,42,0.22)', paddingBottom: 14 }}>

      {/* ── Hero banner: big orange title right + floating food image left ── */}
      <div style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 50%, ${BLUE_DARK} 100%)`,
        padding: '22px 16px 60px',
        overflow: 'hidden',
        minHeight: 160,
        borderRadius: 22,
      }}>
        <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(238,123,38,0.07)', top: -80, right: -60, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: 'rgba(244,197,66,0.05)', bottom: -50, right: 90, pointerEvents: 'none' }} />

        {/* floating food image – left side */}
        {heroImageUrl ? (
          <img
            src={heroImageUrl}
            alt=""
            style={{
              position: 'absolute',
              left: 0,
              top: -10,
              width: '52%',
              height: '130%',
              objectFit: 'cover',
              objectPosition: 'center',
              maskImage: 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0) 100%)',
              pointerEvents: 'none',
            }}
          />
        ) : null}

        {/* title text – right side */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'right' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 4 }}>
            {[7,12,7].map((sz, i) => <span key={i} style={{ color: ORANGE, fontSize: sz, opacity: i===1?1:0.5 }}>✦</span>)}
          </div>
          <div style={{ color: ORANGE, fontSize: 46, fontWeight: 900, lineHeight: 1.05, textShadow: '0 2px 20px rgba(238,123,38,0.4)', letterSpacing: -1 }}>عروض</div>
          <div style={{ color: ORANGE, fontSize: 46, fontWeight: 900, lineHeight: 1.05, textShadow: '0 2px 20px rgba(238,123,38,0.4)', letterSpacing: -1 }}>مميزة</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 6 }}>
            {[5,8,5].map((sz, i) => <span key={i} style={{ color: ORANGE, fontSize: sz, opacity: i===1?0.6:0.3 }}>✦</span>)}
          </div>
        </div>
      </div>

      {/* ── 3 cards floating OUT of the banner using negative margin ── */}
      <div style={{
        padding: '0 10px',
        marginTop: -44,
        position: 'relative',
        zIndex: 2,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {topThree.map((offer) => {
            const price = offer.price ?? offer.finalPrice ?? offer.discountedPrice
            const restName = offer.restaurantName || offer.restaurant || ''
            return (
              <div
                key={offer.id}
                onClick={() => onOpenOffer(offer)}
                className="r2c-card-hover"
                style={{ cursor: 'pointer', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.28)' }}
              >
                {/* full image — no white bg */}
                <div style={{ position: 'relative', aspectRatio: '3/4', background: BLUE, overflow: 'hidden' }}>
                  <OfferImage offer={offer} size="medium" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

                  {/* subtle gradient at bottom for text readability */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(10,10,30,0.82) 0%, rgba(10,10,30,0.18) 55%, rgba(0,0,0,0) 100%)',
                    pointerEvents: 'none',
                  }} />

                  {/* discount badge */}
                  {offer.discount > 0 && (
                    <div style={{ position: 'absolute', top: 7, right: 7, background: RED, color: '#fff', borderRadius: 999, padding: '2px 7px', fontSize: 9, fontWeight: 900, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                      {offer.discount}%
                    </div>
                  )}

                  {/* text info — floating over image, no background */}
                  <div style={{ position: 'absolute', bottom: 0, right: 0, left: 0, padding: '0 8px 10px', textAlign: 'right' }}>
                    {restName ? (
                      <div style={{ fontSize: 10, fontWeight: 900, color: ORANGE, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: 0.2, marginBottom: 2 }}>
                        {restName}
                      </div>
                    ) : null}
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.82)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 5 }}>
                      {offer.name}
                    </div>
                    {price != null && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, justifyContent: 'flex-end' }}>
                        <span style={{ color: GOLD, fontSize: 14, fontWeight: 900, textShadow: '0 1px 6px rgba(0,0,0,0.5)' }} className="font-num">{price}</span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: 700 }}>ر.س</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

function PromoStripBanner({ title, subtitle, image, align = 'right' }) {
  return (
    <div style={{
      position: 'relative',
      height: 118,
      borderRadius: 22,
      overflow: 'hidden',
      background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 50%, ${BLUE_DARK} 100%)`,
      boxShadow: '0 12px 36px rgba(15,23,42,0.22)',
    }}>
      {/* decorative circles */}
      <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(238,123,38,0.12)', top: -50, left: -50, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(244,197,66,0.08)', bottom: -30, right: 80, pointerEvents: 'none' }} />
      {image ? <img src={image} alt="promo" style={{ position: 'absolute', [align]: 0, top: 0, width: '42%', height: '100%', objectFit: 'cover', opacity: 0.85 }} /> : null}
      <div style={{ position: 'absolute', inset: 0, background: image ? `linear-gradient(90deg, rgba(15,52,96,0.05) 0%, rgba(15,52,96,0.55) 45%, rgba(15,52,96,0.92) 100%)` : 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, height: '100%', padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: align === 'right' ? 'flex-start' : 'flex-end', textAlign: align === 'right' ? 'right' : 'left' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(238,123,38,0.20)', border: '1px solid rgba(238,123,38,0.38)', color: '#f4a844', borderRadius: 999, padding: '2px 10px', fontSize: 10, fontWeight: 800, marginBottom: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: ORANGE, display: 'inline-block' }} />
            PROMO
          </div>
          <div style={{ color: '#fff', fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{title}</div>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 700 }}>{subtitle}</div>
      </div>
    </div>
  )
}

function ProductSection({ title, action, offers, onOpenOffer, onOpenRestaurant, onViewAll }) {
  if (!offers || offers.length === 0) return null
  return (
    <section style={{ paddingTop: 16 }}>
      <SectionBar title={title} action={action} onAction={onViewAll} />
      <div className="r2c-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 12px 4px' }}>
        {offers.map(offer => (
          <ProductCard key={offer.id} offer={offer} onOpenOffer={onOpenOffer} onOpenRestaurant={onOpenRestaurant} />
        ))}
      </div>
    </section>
  )
}

function ProductCard({ offer, onOpenOffer, onOpenRestaurant }) {
  const price = offer.price ?? offer.finalPrice ?? offer.discountedPrice ?? null
  const oldPrice = offer.oldPrice ?? offer.originalPrice ?? null
  const restName = offer.restaurantName || offer.restaurant || ''
  return (
    <div className="r2c-card-hover" onClick={() => onOpenOffer(offer)} style={{ width: 162, flexShrink: 0, background: WHITE, borderRadius: 18, overflow: 'hidden', boxShadow: SHADOW, cursor: 'pointer' }}>
      <div style={{ height: 118, background: '#f7f7f7', position: 'relative' }}>
        <OfferImage offer={offer} size="medium" />
        {offer.discount > 0 && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: WHITE, color: RED, borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 900, boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }}>
            خصم {offer.discount}%
          </div>
        )}
      </div>
      <div style={{ padding: '10px 10px 12px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, lineHeight: 1.3, minHeight: 36, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {offer.name}
        </div>
        {restName ? (
          <button onClick={e => { e.stopPropagation(); onOpenRestaurant({ id: offer.restaurantId, name: restName, city: offer.city }) }} style={{ border: 'none', background: 'transparent', padding: 0, marginTop: 4, color: MUTED, fontSize: 11, cursor: 'pointer' }}>
            {restName}
          </button>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
          <div>
            {price != null && <div style={{ fontSize: 14, fontWeight: 900, color: TEXT }} className="font-num">{price} ر.س</div>}
            {oldPrice && <div style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through' }} className="font-num">{oldPrice}</div>}
          </div>
          <button style={{ border: `2px solid ${RED}`, background: WHITE, color: TEXT, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>عرض ↗</button>
        </div>
      </div>
    </div>
  )
}

function InfoTimelineCard() {
  const steps = [
    {
      num: '01',
      label: 'اطلب\nمن التطبيق',
      iconColor: '#f4a844',
      iconBg: 'rgba(244,168,68,0.18)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f4a844" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2"/>
          <line x1="12" y1="18" x2="12.01" y2="18"/>
        </svg>
      ),
    },
    {
      num: '02',
      label: 'حدد\nوقت الاستلام',
      iconColor: '#9acd32',
      iconBg: 'rgba(154,205,50,0.18)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9acd32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9"/>
          <polyline points="12 7 12 12 15 15"/>
        </svg>
      ),
    },
    {
      num: '03',
      label: 'نُخطرك\nحين يجهز',
      iconColor: '#f8ad14',
      iconBg: 'rgba(248,173,20,0.18)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f8ad14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{
      background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 50%, ${BLUE_DARK} 100%)`,
      borderRadius: 24,
      padding: '20px 18px 22px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 12px 36px rgba(15,23,42,0.22)',
    }}>
      {/* decorative circles */}
      <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(238,123,38,0.10)', top: -60, left: -60, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(244,197,66,0.07)', bottom: -50, right: -30, pointerEvents: 'none' }} />

      {/* badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(238,123,38,0.20)', border: '1px solid rgba(238,123,38,0.38)', color: '#f4a844', borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 800, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: ORANGE, display: 'inline-block' }} />
        بدون انتظار
      </div>

      <div style={{ color: '#fff', fontSize: 17, fontWeight: 900, lineHeight: 1.25, marginBottom: 4 }}>
        استلم طلبك من المطعم مباشرةً
      </div>
      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 700, marginBottom: 18 }}>
        اطلب مسبقًا، ووصل وقت الاستلام جاهزًا
      </div>

      {/* steps */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, position: 'relative' }}>
        {/* connectors */}
        <div style={{ position: 'absolute', top: 24, left: 'calc(33.33% - 4px)', width: 'calc(33.33% + 8px)', height: 1, background: 'linear-gradient(90deg, rgba(238,123,38,0.5), rgba(238,123,38,0.2))', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 24, left: 'calc(66.66% - 4px)', width: 'calc(33.33% + 4px)', height: 1, background: 'linear-gradient(90deg, rgba(238,123,38,0.2), rgba(238,123,38,0.5))', zIndex: 0 }} />

        {steps.map((step) => (
          <div key={step.num} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: '12px 8px 10px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            {/* step number badge */}
            <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', background: ORANGE, color: '#fff', fontSize: 9, fontWeight: 900, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>
              {step.num}
            </div>
            {/* icon circle */}
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: step.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
              {step.icon}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: 800, lineHeight: 1.35, whiteSpace: 'pre-line' }}>
              {step.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RestaurantCard({ restaurant: r, onClick }) {
  const categories = normalizeRestaurantCategories(r)
  const logoSrc = resolveRestaurantLogo(r)
  return (
    <div onClick={onClick} className="r2c-card-hover" style={{ background: WHITE, borderRadius: 20, overflow: 'hidden', boxShadow: SHADOW, cursor: 'pointer' }}>
      <div style={{ display: 'flex', gap: 12, padding: 14, alignItems: 'center' }}>
        <div style={{ width: 62, height: 62, borderRadius: 18, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0, border: `1px solid ${BORDER}` }}>
          {logoSrc ? (
            <img src={logoSrc} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🏪</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
            {r.maxDiscount > 0 ? <span style={{ background: ORANGE_SOFT, color: ORANGE_DARK, fontSize: 11, fontWeight: 800, borderRadius: 999, padding: '4px 8px' }}>{r.maxDiscount}% خصم</span> : null}
          </div>
          <div style={{ marginTop: 4, color: MUTED, fontSize: 12, lineHeight: 1.35 }}>{categories || 'مطعم مشارك في العروض'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {r.offerCount > 0 && <InfoPill icon="🎁">{r.offerCount} عروض</InfoPill>}
            {r.city && <InfoPill icon="📍">{r.city}</InfoPill>}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterChip({ children, active, onClick, icon }) {
  return (
    <button onClick={onClick} className="r2c-btn-press" style={{ border: `1.5px solid ${active ? ORANGE : BORDER}`, background: active ? ORANGE_SOFT : WHITE, color: active ? ORANGE_DARK : '#374151', borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5, boxShadow: active ? '0 6px 18px rgba(238,123,38,0.18)' : '0 2px 8px rgba(0,0,0,0.04)' }}>
      {icon ? <span>{icon}</span> : null}
      {children}
    </button>
  )
}

function InfoPill({ children, icon }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f7f7f8', color: '#4b5563', borderRadius: 10, padding: '4px 8px', fontSize: 11, fontWeight: 700 }}>
      <span>{icon}</span>
      <span>{children}</span>
    </span>
  )
}

function SectionBar({ title, action, actionMuted, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 10px' }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: TEXT }}>{title}</div>
      {action ? (
        <div
          onClick={onAction}
          style={{ fontSize: 13, color: actionMuted ? MUTED : ORANGE, fontWeight: 700, cursor: onAction ? 'pointer' : 'default' }}
        >{action}</div>
      ) : <div />}
    </div>
  )
}

function EmptyState({ searchQuery }) {
  return (
    <div style={{ background: WHITE, borderRadius: 20, border: `1px solid ${BORDER}`, padding: '36px 20px', textAlign: 'center', color: MUTED, boxShadow: SHADOW }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>🔍</div>
      <div style={{ fontWeight: 800, color: TEXT, marginBottom: 6, fontSize: 16 }}>لا توجد نتائج</div>
      <div style={{ fontSize: 14 }}>{searchQuery ? `لا توجد نتائج لـ "${searchQuery}"` : 'جرّب فلتراً آخر'}</div>
    </div>
  )
}
