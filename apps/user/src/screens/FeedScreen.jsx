import { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../contexts'
import OfferImage from '../components/OfferImage'
import { db } from '@r2c/shared/firebase/config'
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore'

const ORANGE = '#ee7b26'
const ORANGE_DARK = '#d96a18'
const ORANGE_SOFT = '#fff3e8'
const NAVY        = '#0d1f35'
const NAVY_MID    = '#152d4a'
const NAVY_DARK   = '#080f1a'
const BLUE        = NAVY
const BLUE_LIGHT  = NAVY_MID
const BLUE_DARK   = NAVY_DARK
const BLUE_SOFT   = '#eaf1f9'

const GOLD = '#ee7b26'
const RED      = ORANGE
const RED_DARK = ORANGE_DARK
const BG = '#f4f6f9'
const WHITE = '#ffffff'
const TEXT = '#111827'
const MUTED = '#6b7280'
const BORDER = '#e5e7eb'
const SHADOW = '0 10px 30px rgba(238, 123, 38, 0.10)'

const FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500&family=Poppins:wght@300;400;500&display=swap');
  * {
    font-family: 'Cairo', sans-serif;
    font-weight: 400;
    line-height: 1.5;
  }
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
 { id: 'all',     label: 'الكل', customImg: 'https://i.ibb.co/8DByX04b/image.png' },
  { id: 'بحب', label: 'عروض مميزة', customImg: 'https://i.ibb.co/ymG5qHhr/image.png' },
  { id: 'بطاطس', label: 'أفضل العروض', customImg: 'https://i.ibb.co/8DByX04b/image.png' },
  { id: 'بوكس', label: 'عروض لك', customImg: 'https://i.ibb.co/7tJLwNh5/file-00000000a90072439ee2eb42f6c0c720.png' },
  { id: 'مكس',  label: 'الأكثر مبيعًا',   customImg: 'https://i.ibb.co/ccp4YM9J/image.png' },
  { id: 'شاورما', label: 'شاورما',customImg: 'https://i.ibb.co/wh2wzQbt/image.png' },
  { id: 'بيتزا',  label: 'بيتزا',  customImg: 'https://i.ibb.co/JFdjTJmP/image.png' },
  { id: 'برجر',   label: 'برجر', customImg: 'https://i.ibb.co/tPXQKJcL/image.png' },
  { id: 'دجاج',   label: 'دجاج',customImg: 'https://i.ibb.co/Z6JtJbxQ/image.png' },
  { id: 'مشاوي',  label: 'مشويات', customImg: 'https://i.ibb.co/wh2wzQbt/image.png' },
  { id: 'حلويات', label: 'حلويات',  customImg: 'https://i.ibb.co/q3tDHGtX/image.png' },
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

function extractOrderRestaurantKey(order) {
  return order?.restaurantId || order?.restaurant?.id || order?.restaurant?.restaurantId || order?.restaurantName || order?.restaurant || order?.offer?.restaurantId || order?.offer?.restaurantName || order?.offer?.restaurant || ''
}

function extractLatLng(entity) {
  const lat = entity?.latitude ?? entity?.lat ?? entity?.location?.latitude ?? entity?.location?.lat ?? entity?.coords?.latitude ?? entity?.coords?.lat
  const lng = entity?.longitude ?? entity?.lng ?? entity?.lon ?? entity?.location?.longitude ?? entity?.location?.lng ?? entity?.location?.lon ?? entity?.coords?.longitude ?? entity?.coords?.lng ?? entity?.coords?.lon
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  return { lat, lng }
}

function haversineKm(a, b) {
  const toRad = d => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s1 = Math.sin(dLat / 2)
  const s2 = Math.sin(dLng / 2)
  const aa = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2
  return 2 * R * Math.asin(Math.sqrt(aa))
}

function pickCuisineImage(filter, offers, restaurants) {
  if (filter.customImg) return filter.customImg
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
function SideMenu({ isOpen, onClose, setCurrentScreen, profileData, onScrollToTopSellers, onScrollToRestaurants, setActiveOrdersTab }) {

  const IconTrack = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
      <circle cx="17" cy="17" r="4"/><path d="m20 20-1.5-1.5"/>
    </svg>
  )
  const IconHistory = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
    </svg>
  )
  const IconTopSellers = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  )
  const IconRate = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
  const IconFaq = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
  const IconTerms = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
  const IconPrivacy = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
  const IconNutrition = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  )
  const IconSupport = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.7a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
  const ChevronLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )

  const IconRestaurants = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
  const IconProfile = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )

  const mainItems = [
    { icon: <IconTrack />,       label: 'تتبع طلباتي',    action: () => { setActiveOrdersTab?.('current'); setCurrentScreen('orders'); onClose() } },
    { icon: <IconHistory />,     label: 'طلباتي السابقة', action: () => { setActiveOrdersTab?.('past');    setCurrentScreen('orders'); onClose() } },
    { icon: <IconTopSellers />,  label: 'الأكثر مبيعًا',  action: () => { onScrollToTopSellers?.() } },
    { icon: <IconRestaurants />, label: 'مطاعمنا',         action: () => { onScrollToRestaurants?.() } },
    { icon: <IconProfile />,     label: 'حسابي',           action: () => { setCurrentScreen('profile'); onClose() } },
  ]

  const footerItems = [
    { icon: <IconRate />,      label: 'تقييمك' },
    { icon: <IconFaq />,       label: 'الأسئلة المتداولة' },
    { icon: <IconTerms />,     label: 'الشروط والأحكام' },
    { icon: <IconPrivacy />,   label: 'سياسة الخصوصية' },
    { icon: <IconNutrition />, label: 'معلومات غذائية' },
    { icon: <IconSupport />,   label: 'الاتصال بالدعم' },
  ]

  const name     = profileData?.name     || 'مستخدم'
  const email    = profileData?.email    || ''
  const photo    = profileData?.photoURL || ''
  const initials = name.charAt(0).toUpperCase()

  const rowStyle = {
    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
    padding: '12px 16px', border: 'none', background: 'transparent',
    cursor: 'pointer', textAlign: 'right',
  }
  const iconWrap = { width: 38, height: 38, borderRadius: 10, background: '#f5f6f8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#374151' }

  return (
    <>
      {isOpen && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
      )}

      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100%', width: 295,
        background: WHITE, zIndex: 50,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }} dir="rtl">

        <div style={{ padding: '52px 20px 20px', background: WHITE, borderBottom: `1px solid ${BORDER}`, position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f5f6f8', color: '#374151', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {photo ? (
              <img src={photo} alt={name} style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${BORDER}` }} onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }} />
            ) : null}
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: ORANGE, color: WHITE, fontSize: 13, fontWeight: 500, display: photo ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{name}</div>
              {email ? <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{email}</div> : null}
            </div>
          </div>
        </div>

        <div style={{ padding: '8px 0' }}>
          {mainItems.map((item, i) => (
            <button key={i} onClick={item.action} style={rowStyle}
              onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={iconWrap}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: TEXT }}>{item.label}</span>
              <ChevronLeft />
            </button>
          ))}
        </div>

        <div style={{ height: 8, background: '#f5f6f8', flexShrink: 0 }} />

        <div style={{ padding: '8px 0', flex: 1 }}>
          {footerItems.map((item, i) => (
            <div key={i} style={{ ...rowStyle, cursor: 'default' }}>
              <span style={{ ...iconWrap, background: 'transparent' }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 400, color: '#374151' }}>{item.label}</span>
              <ChevronLeft />
            </div>
          ))}
        </div>

      </div>
    </>
  )
}


export default function FeedScreen() {
  const {
    offers, orders, loadingOffers,
    setCurrentScreen, setSelectedOffer, setSelectedRestaurant,
    user, profileData, setActiveOrdersTab,
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
  const [userCoords, setUserCoords] = useState(null)
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
      pos => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        reverseGeocode(pos.coords.latitude, pos.coords.longitude)
      },
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

  const [banner, setBanner] = useState({ text: null, restaurantId: null, restaurantName: null, imageUrl: null, discountValue: null, banner2ImageUrl: null, banner3ImageUrl: null })
  const [bannerSlides, setBannerSlides] = useState([])
  const [activeSlide, setActiveSlide] = useState(0)
  const slideTimerRef = useRef(null)

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
        banner3ImageUrl: d.banner3ImageUrl || null,
      })
      const slides = []
      if (d.bannerImageUrl) {
        slides.push({
          imageUrl: d.bannerImageUrl,
          restaurantId: d.bannerRestaurantId || null,
          restaurantName: d.bannerRestaurantName || null,
        })
      }
      if (Array.isArray(d.banners)) {
        d.banners.forEach(b => { if (b.imageUrl) slides.push(b) })
      }
      setBannerSlides(slides)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (bannerSlides.length <= 1) return
    slideTimerRef.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % bannerSlides.length)
    }, 4000)
    return () => clearInterval(slideTimerRef.current)
  }, [bannerSlides.length])

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

    // الأولوية للعروض المميزة يدويًا من اللوحة الإدارية
    const manualFeatured = (offers || []).filter(o => o.isFeatured === true)
    const base = manualFeatured.length > 0
      ? manualFeatured
      : [...(offers || [])].sort((a, b) => (b.discount || 0) - (a.discount || 0))

    return base
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

  const onScrollToTopSellers = () => {
    setShowSideMenu(false)
    setTimeout(() => {
      document.getElementById('top-sellers-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
  }

  const onScrollToRestaurants = () => {
    setShowSideMenu(false)
    setTimeout(() => {
      restaurantsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
  }

  const openOffer = o => { setSelectedOffer(o); setCurrentScreen('offerDetails') }
  const openRestaurant = r => {
    setSelectedRestaurant({ id: r.id, name: r.name, city: r.city })
    setCurrentScreen('restaurantProfile')
  }
  const handleBannerClick = () => {
    const slide = bannerSlides[activeSlide]
    const restId = slide?.restaurantId || banner.restaurantId
    const restName = slide?.restaurantName || banner.restaurantName || ''
    if (!restId) return
    setSelectedRestaurant({ id: restId, name: restName, city: '' })
    setCurrentScreen('restaurantProfile')
  }

  const handleSlideChange = (index) => {
    setActiveSlide(index)
    clearInterval(slideTimerRef.current)
    if (bannerSlides.length > 1) {
      slideTimerRef.current = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % bannerSlides.length)
      }, 4000)
    }
  }

  const quickExploreItems = useMemo(() => {
    const base = [CUISINE_FILTERS[2], CUISINE_FILTERS[7], CUISINE_FILTERS[8], CUISINE_FILTERS[3], CUISINE_FILTERS[4], CUISINE_FILTERS[5], CUISINE_FILTERS[6], CUISINE_FILTERS[9], CUISINE_FILTERS[10], CUISINE_FILTERS[1]]
    return base.map((filter, idx) => ({
      id: filter.id,
      label: filter.label,
      image: pickCuisineImage(filter, featuredOffers, restaurants),
      emojiImg: filter.img,
      accent: idx % 2 === 0 ? ORANGE : ORANGE_DARK,
      onClick: () => {
        const isFeaturedShortcut = filter.id === 'بحب' || filter.label === 'عروض مميزة'

        if (isFeaturedShortcut) {
          try {
            localStorage.setItem('r2c_explore_category', 'featured')
            localStorage.setItem('r2c_explore_featured_offers', JSON.stringify(featuredOffers))
          } catch {}
        } else {
          localStorage.setItem('r2c_explore_category', filter.id)
          try { localStorage.removeItem('r2c_explore_featured_offers') } catch {}
        }

        setCurrentScreen('explore')
      },
    }))
  }, [featuredOffers, restaurants, setCurrentScreen])

  const topSellerOffers = useMemo(() => featuredOffers.slice(0, 6), [featuredOffers])
  const quickPickOffers = useMemo(() => featuredOffers.slice(2, 8), [featuredOffers])
  const recommendedOffers = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : []
    const previousRestaurantKeys = new Set(
      safeOrders
        .map(extractOrderRestaurantKey)
        .filter(Boolean)
        .map(v => String(v).trim().toLowerCase())
    )

    const cityQuery = String(cityName || '').trim().toLowerCase()

    const matchingRestaurantIds = new Set()
    const matchingRestaurantNames = new Set()

    restaurants.forEach(r => {
      const restaurantKey = String(r.id || '').trim().toLowerCase()
      const restaurantName = String(r.name || '').trim().toLowerCase()
      const hasPreviousOrder = previousRestaurantKeys.has(restaurantKey) || previousRestaurantKeys.has(restaurantName)

      let isNearby = false
      const restaurantCoords = extractLatLng(r)
      if (userCoords && restaurantCoords) {
        isNearby = haversineKm(userCoords, restaurantCoords) <= 8
      } else if (cityQuery && cityQuery !== '...' && cityQuery !== 'موقعك') {
        const cityText = `${r.city || ''} ${r.area || ''} ${r.address || ''}`.toLowerCase()
        isNearby = cityText.includes(cityQuery)
      }

      if (hasPreviousOrder || isNearby) {
        if (restaurantKey) matchingRestaurantIds.add(restaurantKey)
        if (restaurantName) matchingRestaurantNames.add(restaurantName)
      }
    })

    const personalized = featuredOffers.filter(o => {
      const restaurantId = String(o.restaurantId || '').trim().toLowerCase()
      const restaurantName = String(o.restaurantName || o.restaurant || '').trim().toLowerCase()
      return matchingRestaurantIds.has(restaurantId) || matchingRestaurantNames.has(restaurantName)
    })

    return (personalized.length ? personalized : featuredOffers).slice(0, 6)
  }, [featuredOffers, orders, restaurants, cityName, userCoords])

  if (loadingOffers) {
    return (
      <>
        <style>{FONT_STYLE}</style>
        <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, border: `4px solid ${ORANGE}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: MUTED, fontWeight: 500, margin: 0 }}>جاري تحميل العروض...</p>
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
            <div style={{ fontSize: 13, marginBottom: 12 }}>📭</div>
            <h2 style={{ margin: '0 0 8px', color: TEXT, fontWeight: 500 }}>لا توجد عروض حالياً</h2>
            <p style={{ color: MUTED, margin: 0 }}>سيتم إضافة عروض جديدة قريباً</p>
          </div>
        </div>
      </>
    )
  }

  const isSearching = searchQuery.trim().length > 0

  return (
    <>
      <SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} setCurrentScreen={setCurrentScreen} profileData={profileData} onScrollToTopSellers={onScrollToTopSellers} onScrollToRestaurants={onScrollToRestaurants} setActiveOrdersTab={setActiveOrdersTab} />
      <style>{FONT_STYLE}</style>
      <style>{`
        .r2c-scrollbar::-webkit-scrollbar { display: none; }
        .r2c-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .r2c-card-hover { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .r2c-card-hover:active { transform: scale(0.98); }
        .r2c-btn-press { transition: transform 0.18s ease, box-shadow 0.18s ease; will-change: transform; }
        .r2c-btn-press:active { transform: scale(0.93); }
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
              <span style={{ fontSize: 13 }}>📍</span>
              <div style={{ fontSize: 13, color: ORANGE, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                    fontSize: 9, fontWeight: 500,
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
                    <strong style={{ fontWeight: 500, fontSize: 13 }}>الإشعارات</strong>
                    <button onClick={() => setShowNotifs(false)} style={{ border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 13 }}>✕</button>
                  </div>
                  {notifOrders.length === 0 ? (
                    <div style={{ padding: '24px 20px', textAlign: 'center', color: MUTED, fontSize: 13 }}>لا توجد إشعارات</div>
                  ) : notifOrders.map(order => {
                    const info = STATUS_INFO[order.status] || STATUS_INFO.pending
                    const seen = seenKeys.has(`${order.id}_${order.status}`)
                    return (
                      <div key={`${order.id}_${order.status}`} onClick={() => { setShowNotifs(false); setCurrentScreen('orders') }} style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', background: seen ? WHITE : '#fff4ef' }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 18, flexShrink: 0, background: `${info.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{info.icon}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: info.color }}>{info.text}</div>
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
                fontSize: 13, boxShadow: SHADOW, color: TEXT,
              }}
            />
            <span style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', color: RED, fontSize: 13 }}>🔍</span>
          </div>
        </div>

        {!isSearching && (
          <>
            <div style={{ padding: '0 12px' }}>
              <HeroBannerSlider
                slides={bannerSlides}
                fallbackBanner={banner}
                activeSlide={activeSlide}
                onSlideChange={handleSlideChange}
                onClick={handleBannerClick}
              />
            </div>

            <SectionBar title="استكشف القائمة" action="عرض الكل" onAction={() => {
              localStorage.setItem('r2c_explore_category', 'all')
              setCurrentScreen('explore')
            }} />
            <div
              className="r2c-scrollbar"
              style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 12px 4px', scrollSnapType: 'x mandatory' }}
            >
              {quickExploreItems.map(item => (
                <div key={item.id} style={{ flexShrink: 0, width: 80, scrollSnapAlign: 'start' }}>
                  <ExploreCategoryCard item={item} active={activeCuisine === item.id} />
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 12px 0' }}>
              <TopOffersPromo offers={featuredOffers} onOpenOffer={openOffer} banner2ImageUrl={banner.banner2ImageUrl} />
            </div>

            <div id="top-sellers-section">
            <ProductSection
              title="الأكثر مبيعًا"
              action="عرض الكل"
              offers={topSellerOffers}
              onOpenOffer={openOffer}
              onOpenRestaurant={openRestaurant}
              onViewAll={() => {
                localStorage.setItem('r2c_explore_category', 'all')
  setTimeout(() => {
    window.scrollTo(0, 0)
  }, 50)
                setCurrentScreen('explore')
              }}
            />
            </div>

            <div style={{ padding: '10px 12px 0' }}>
              <InfoTimelineCard imageUrl={banner.banner3ImageUrl} />
            </div>

            <ProductSection
              title="أفضل الخيارات"
              action="عرض الكل"
              offers={quickPickOffers}
              onOpenOffer={openOffer}
              onOpenRestaurant={openRestaurant}
              onViewAll={() => {
                localStorage.setItem('r2c_explore_category', 'all')
  setTimeout(() => {
    window.scrollTo(0, 0)
  }, 50)
                setCurrentScreen('explore')
              }}
            />

            <ProductSection
              title="عروض لك"
              action="عرض الكل"
              offers={recommendedOffers}
              onOpenOffer={openOffer}
              onOpenRestaurant={openRestaurant}
              onViewAll={() => {
                localStorage.setItem('r2c_explore_category', 'all')
  setTimeout(() => {
    window.scrollTo(0, 0)
  }, 50)
                setCurrentScreen('explore')
              }}
            />
          </>
        )}

        <section ref={restaurantsSectionRef} style={{ padding: isSearching ? '14px 12px 0' : '18px 12px 0' }}>
          <SectionBar title={isSearching ? 'نتائج المطاعم' : 'المطاعم المشاركة'} action={filteredRestaurants.length > 0 ? `${filteredRestaurants.length}` : ''} actionMuted />

          {restaurantsError && (
            <div style={{ margin: '0 0 12px', background: ORANGE_SOFT, border: `1px solid rgba(238,123,38,0.35)`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: RED_DARK }}>تعذّر تحميل المطاعم</div>
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
            <div style={{ marginBottom: 10, fontSize: 13, color: MUTED, fontWeight: 400 }}>
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
  border: `1.5px solid ${ORANGE}44`,
  background: ORANGE_SOFT,
  boxShadow: `0 2px 10px ${ORANGE}22`,
  color: ORANGE_DARK,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  position: 'relative',
}

function HeroBannerSlider({ slides, fallbackBanner, activeSlide, onSlideChange, onClick }) {
  const hasSlides = slides && slides.length > 0
  const currentSlide = hasSlides ? slides[activeSlide] : null
  const isClickable = currentSlide?.restaurantId || fallbackBanner?.restaurantId

  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = (e) => {
    setTouchEnd(e.changedTouches[0].clientX)
    handleSwipe()
  }

  const handleSwipe = () => {
    if (!hasSlides || slides.length <= 1) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      onSlideChange((activeSlide + 1) % slides.length)
    }
    if (isRightSwipe) {
      onSlideChange((activeSlide - 1 + slides.length) % slides.length)
    }
  }

  return (
    <div
      className="r2c-card-hover"
      style={{
        position: 'relative',
        height: 178,
        borderRadius: 22,
        overflow: 'hidden',
        cursor: isClickable ? 'pointer' : 'grab',
        boxShadow: SHADOW,
        background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 50%, ${BLUE_DARK} 100%)`,
        userSelect: 'none',
      }}
      onClick={isClickable ? onClick : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* الشرائح */}
      {hasSlides ? slides.map((slide, idx) => (
        <img
          key={idx}
          src={slide.imageUrl}
          alt={slide.restaurantName || `banner-${idx}`}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            opacity: idx === activeSlide ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        />
      )) : fallbackBanner?.imageUrl ? (
        <img src={fallbackBanner.imageUrl} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : null}

      {/* نقاط التنقل */}
      {hasSlides && slides.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 10, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 6, zIndex: 3,
        }}>
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={e => { e.stopPropagation(); onSlideChange(idx) }}
              style={{
                width: idx === activeSlide ? 20 : 7,
                height: 7,
                borderRadius: 999,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: idx === activeSlide ? ORANGE : 'rgba(255,255,255,0.55)',
                transition: 'width 0.3s ease, background 0.3s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ExploreCategoryCard({ item, active }) {
  const imgSrc = item.image || item.emojiImg || null
  return (
    <button
      onClick={item.onClick}
      className="r2c-btn-press"
      style={{
        border: 'none', padding: '4px 2px 6px', cursor: 'pointer',
        background: 'transparent',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
        width: '100%',
      }}
    >
      <div style={{
        width: 68, height: 68, borderRadius: '50%',
        overflow: 'hidden',
        background: WHITE,
        border: active ? `2.5px solid ${ORANGE}` : `2px solid ${BORDER}`,
        boxShadow: active
          ? `0 4px 16px ${ORANGE}55`
          : '0 2px 10px rgba(0,0,0,0.09)',
        flexShrink: 0,
        transition: 'border 0.18s, box-shadow 0.18s',
      }}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={item.label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { e.currentTarget.src = item.emojiImg || ''; e.currentTarget.style.objectFit = 'contain'; e.currentTarget.style.padding = '8px' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🍽️</div>
        )}
      </div>
      <div style={{
        fontSize: 12, fontWeight: 500,
        color: active ? ORANGE : TEXT,
        textAlign: 'center', lineHeight: 1.2,
        whiteSpace: 'nowrap',
        transition: 'color 0.18s',
      }}>
        {item.label}
      </div>
    </button>
  )
}

function TopOffersPromo({ offers, onOpenOffer, banner2ImageUrl }) {
  const topFive = useMemo(() => {
    return [...(offers || [])]
      .filter(o => (o.price ?? o.finalPrice ?? o.discountedPrice) != null)
      .sort((a, b) => {
        const pa = a.price ?? a.finalPrice ?? a.discountedPrice ?? 0
        const pb = b.price ?? b.finalPrice ?? b.discountedPrice ?? 0
        return pb - pa
      })
      .slice(0, 5)
  }, [offers])

  if (!topFive.length) return null

  return (
    <div style={{ borderRadius: 22, paddingBottom: 16 }}>
      <div style={{
        position: 'relative',
        background: `linear-gradient(160deg, #0a1929 0%, #0d2644 40%, #0a1929 100%)`,
        overflow: 'hidden',
        borderRadius: 22,
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      }}>

        {/* Islamic geometric pattern overlay */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="islamicPattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="#c8a96e" strokeWidth="0.8"/>
              <path d="M30 10 L50 30 L30 50 L10 30 Z" fill="none" stroke="#c8a96e" strokeWidth="0.6"/>
              <circle cx="30" cy="30" r="6" fill="none" stroke="#c8a96e" strokeWidth="0.6"/>
              <path d="M0 0 L30 30 M60 0 L30 30 M0 60 L30 30 M60 60 L30 30" stroke="#c8a96e" strokeWidth="0.4"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#islamicPattern)"/>
        </svg>

        {/* Decorative top-left corner ornament */}
        <svg style={{ position: 'absolute', top: 0, right: 0, width: 90, height: 90, opacity: 0.45, pointerEvents: 'none' }} viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
          <path d="M90 0 Q60 0 45 45 Q30 0 0 0" fill="none" stroke="#c8a96e" strokeWidth="1.2"/>
          <path d="M90 0 Q70 10 55 40 Q40 10 10 0" fill="none" stroke="#c8a96e" strokeWidth="0.8"/>
          <circle cx="45" cy="12" r="3.5" fill="#c8a96e" opacity="0.7"/>
          <circle cx="30" cy="6" r="2" fill="#c8a96e" opacity="0.5"/>
          <circle cx="60" cy="6" r="2" fill="#c8a96e" opacity="0.5"/>
          <path d="M45 18 Q38 28 30 32 M45 18 Q52 28 60 32" stroke="#c8a96e" strokeWidth="0.8" fill="none"/>
        </svg>

        {/* Decorative top-right corner ornament */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: 90, height: 90, opacity: 0.45, pointerEvents: 'none', transform: 'scaleX(-1)' }} viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
          <path d="M90 0 Q60 0 45 45 Q30 0 0 0" fill="none" stroke="#c8a96e" strokeWidth="1.2"/>
          <path d="M90 0 Q70 10 55 40 Q40 10 10 0" fill="none" stroke="#c8a96e" strokeWidth="0.8"/>
          <circle cx="45" cy="12" r="3.5" fill="#c8a96e" opacity="0.7"/>
          <circle cx="30" cy="6" r="2" fill="#c8a96e" opacity="0.5"/>
          <circle cx="60" cy="6" r="2" fill="#c8a96e" opacity="0.5"/>
          <path d="M45 18 Q38 28 30 32 M45 18 Q52 28 60 32" stroke="#c8a96e" strokeWidth="0.8" fill="none"/>
        </svg>

        {/* Decorative bottom ornaments */}
        <svg style={{ position: 'absolute', bottom: 0, right: 0, width: 90, height: 70, opacity: 0.35, pointerEvents: 'none', transform: 'scaleY(-1)' }} viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
          <path d="M90 0 Q60 0 45 45 Q30 0 0 0" fill="none" stroke="#c8a96e" strokeWidth="1.2"/>
          <path d="M90 0 Q70 10 55 40 Q40 10 10 0" fill="none" stroke="#c8a96e" strokeWidth="0.8"/>
          <circle cx="45" cy="12" r="3.5" fill="#c8a96e" opacity="0.7"/>
        </svg>
        <svg style={{ position: 'absolute', bottom: 0, left: 0, width: 90, height: 70, opacity: 0.35, pointerEvents: 'none', transform: 'scaleX(-1) scaleY(-1)' }} viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
          <path d="M90 0 Q60 0 45 45 Q30 0 0 0" fill="none" stroke="#c8a96e" strokeWidth="1.2"/>
          <path d="M90 0 Q70 10 55 40 Q40 10 10 0" fill="none" stroke="#c8a96e" strokeWidth="0.8"/>
          <circle cx="45" cy="12" r="3.5" fill="#c8a96e" opacity="0.7"/>
        </svg>

        {/* Side vertical ornament lines */}
        <div style={{ position: 'absolute', top: 10, bottom: 10, right: 10, width: 1, background: 'linear-gradient(to bottom, transparent, rgba(200,169,110,0.35), transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 10, bottom: 10, left: 10, width: 1, background: 'linear-gradient(to bottom, transparent, rgba(200,169,110,0.35), transparent)', pointerEvents: 'none' }} />

        {/* Title row with flame icon */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '16px 16px 14px',
          borderBottom: `1px solid rgba(200,169,110,0.25)`,
          position: 'relative', zIndex: 1,
        }}>
          <span style={{ fontSize: 26 }}>🔥</span>
          <span style={{
            color: '#f0d078',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 1,
            textShadow: '0 0 18px rgba(240,208,120,0.5)',
            fontFamily: "'Cairo', sans-serif",
          }}>عروض مميزة</span>
        </div>

        {/* Cards container */}
        <div style={{ position: 'relative', zIndex: 1, padding: '14px 0 16px' }}>
          <div
            className="r2c-scrollbar"
            style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 10px 4px' }}
          >
            {topFive.map((offer) => (
              <FeaturedOfferCard key={offer.id} offer={offer} onOpenOffer={onOpenOffer} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FeaturedOfferCard({ offer, onOpenOffer }) {
  const price = offer.price ?? offer.finalPrice ?? offer.discountedPrice
  const restName = offer.restaurantName || offer.restaurant || ''

  return (
    <div
      onClick={() => onOpenOffer(offer)}
      className="r2c-card-hover"
      style={{
        flexShrink: 0,
        width: 150,
        cursor: 'pointer',
        borderRadius: 18,
        overflow: 'hidden',
        background: WHITE,
        boxShadow: '0 4px 16px rgba(238,123,38,0.15)',
        border: `1.5px solid ${ORANGE_SOFT}`,
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 28px rgba(238,123,38,0.25)'
        e.currentTarget.style.transform = 'translateY(-6px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(238,123,38,0.15)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* صورة العرض مع تدرج */}
      <div style={{
        position: 'relative',
        height: 140,
        background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 100%)`,
        overflow: 'hidden',
      }}>
        <OfferImage offer={offer} size="medium" style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }} />

        {/* شريط التقييم في الأسفل */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))',
          padding: '12px 10px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}>
          {restName && (
            <span style={{
              color: ORANGE,
              fontSize: 10,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '70%',
            }}>
              {restName}
            </span>
          )}
          <span style={{
            color: WHITE,
            fontSize: 10,
            fontWeight: 700,
          }}>
            ⭐ 4.8
          </span>
        </div>
      </div>

      {/* معلومات العرض */}
      <div style={{ padding: '12px 10px' }}>
        <h4 style={{
          fontSize: 12,
          fontWeight: 600,
          color: TEXT,
          margin: '0 0 8px',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {offer.name}
        </h4>

        {/* السعر والزر */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}>
          {price && (
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              color: ORANGE,
            }} className="font-num">
              {price} ر.س
            </span>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: ORANGE_SOFT,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = ORANGE
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = ORANGE_SOFT
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1, color: ORANGE, fontWeight: 500 }}>+</span>
          </div>
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(238,123,38,0.20)', border: '1px solid rgba(238,123,38,0.38)', color: '#f4a844', borderRadius: 999, padding: '2px 10px', fontSize: 10, fontWeight: 500, marginBottom: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: ORANGE, display: 'inline-block' }} />
            PROMO
          </div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, lineHeight: 1 }}>{title}</div>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 500 }}>{subtitle}</div>
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
      </div>
      <div style={{ padding: '10px 10px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, lineHeight: 1.3, minHeight: 36, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {offer.name}
        </div>
        {restName ? (
          <button onClick={e => { e.stopPropagation(); onOpenRestaurant({ id: offer.restaurantId, name: restName, city: offer.city }) }} style={{ border: 'none', background: 'transparent', padding: 0, marginTop: 4, color: MUTED, fontSize: 11, cursor: 'pointer' }}>
            {restName}
          </button>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
          <div>
            {price != null && <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }} className="font-num">{price} ر.س</div>}
            {oldPrice && <div style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through' }} className="font-num">{oldPrice}</div>}
          </div>
          <button style={{ border: `2px solid ${RED}`, background: WHITE, color: TEXT, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>عرض ↗</button>
        </div>
      </div>
    </div>
  )
}

function InfoTimelineCard({ imageUrl }) {
  if (imageUrl) {
    return (
      <div style={{
        borderRadius: 24,
        overflow: 'hidden',
        height: 178,
        boxShadow: '0 12px 36px rgba(15,23,42,0.22)',
        background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 50%, ${BLUE_DARK} 100%)`,
      }}>
        <img
          src={imageUrl}
          alt="banner3"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      </div>
    )
  }

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
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(238,123,38,0.20)', border: '1px solid rgba(238,123,38,0.38)', color: '#f4a844', borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 500, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: ORANGE, display: 'inline-block' }} />
        بدون انتظار
      </div>

      <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, lineHeight: 1.25, marginBottom: 4 }}>
        استلم طلبك من المطعم مباشرةً
      </div>
      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 500, marginBottom: 18 }}>
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
            <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', background: ORANGE, color: '#fff', fontSize: 9, fontWeight: 500, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>
              {step.num}
            </div>
            {/* icon circle */}
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: step.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
              {step.icon}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: 500, lineHeight: 1.35, whiteSpace: 'pre-line' }}>
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
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🏪</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
            {r.maxDiscount > 0 ? <span style={{ background: ORANGE_SOFT, color: ORANGE_DARK, fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '4px 8px' }}>{r.maxDiscount}% خصم</span> : null}
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
    <button onClick={onClick} className="r2c-btn-press" style={{ border: `1.5px solid ${active ? ORANGE : BORDER}`, background: active ? ORANGE_SOFT : WHITE, color: active ? ORANGE_DARK : '#374151', borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5, boxShadow: active ? '0 6px 18px rgba(238,123,38,0.18)' : '0 2px 8px rgba(0,0,0,0.04)' }}>
      {icon ? <span>{icon}</span> : null}
      {children}
    </button>
  )
}

function InfoPill({ children, icon }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f7f7f8', color: '#4b5563', borderRadius: 10, padding: '4px 8px', fontSize: 11, fontWeight: 500 }}>
      <span>{icon}</span>
      <span>{children}</span>
    </span>
  )
}

function SectionBar({ title, action, actionMuted, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 10px' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{title}</div>
      {action ? (
        <div
          onClick={onAction}
          style={{ fontSize: 13, color: actionMuted ? MUTED : ORANGE, fontWeight: 500, cursor: onAction ? 'pointer' : 'default' }}
        >{action}</div>
      ) : <div />}
    </div>
  )
}

function EmptyState({ searchQuery }) {
  return (
    <div style={{ background: WHITE, borderRadius: 20, border: `1px solid ${BORDER}`, padding: '36px 20px', textAlign: 'center', color: MUTED, boxShadow: SHADOW }}>
      <div style={{ fontSize: 13, marginBottom: 10 }}>🔍</div>
      <div style={{ fontWeight: 500, color: TEXT, marginBottom: 6, fontSize: 13 }}>لا توجد نتائج</div>
      <div style={{ fontSize: 13 }}>{searchQuery ? `لا توجد نتائج لـ "${searchQuery}"` : 'جرّب فلتراً آخر'}</div>
    </div>
  )
}
