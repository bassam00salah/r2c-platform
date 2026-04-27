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
const BG = '#ffffff'
const WHITE = '#ffffff'
const TEXT = '#111827'
const MUTED = '#6b7280'
const BORDER = '#e5e7eb'
const SHADOW = '0 1px 2px rgba(17, 24, 39, 0.05)'

const FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500&family=Poppins:wght@300;400;500&display=swap');
  * {
    font-family: 'Cairo', sans-serif;
    font-weight: 400;
    line-height: 1.5;
  }
  .font-num { font-family: 'Poppins', 'Cairo', sans-serif; }
  @keyframes r2c-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .r2c-slide-in { animation: r2c-fade-in 0.35s ease forwards; }
  @keyframes r2c-shimmer {
    0%   { transform: translateX(-100%); opacity: 1; }
    100% { transform: translateX(200%);  opacity: 0; }
  }
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
  { id: 'all',     label: 'الكل', customImg: 'https://i.ibb.co/99HgtTDP/file-000000005e8c720aaeaaeb7347016d68.png' },
  { id: 'featured', label: 'عروض مميزة', customImg: 'https://i.ibb.co/WNGCWVD7/Untitled-2.png' },
  { id: 'بطاطس', label: 'أفضل العروض', customImg: 'https://i.ibb.co/qM6CsKHL/image.png' },
  { id: 'مكس',  label: 'الأكثر مبيعًا',   customImg: 'https://i.ibb.co/ccp4YM9J/image.png' },
  { id: 'بوكس', label: 'عروض لك', customImg: 'https://i.ibb.co/xqvHqJ3L/image.png' },
   { id: 'برجر',   label: 'برجر', customImg: 'https://i.ibb.co/27rm6C8v/image.png' },
  { id: 'بيتزا',  label: 'بيتزا',  customImg: 'https://i.ibb.co/DffJ48fc/Untitled.png' },
 { id: 'شاورما', label: 'شاورما',customImg: 'https://i.ibb.co/tTzwp6zV/image.png' },
  { id: 'دجاج',   label: 'دجاج',customImg: 'https://i.ibb.co/9HZtbjNb/image.png' },
  { id: 'مشاوي',  label: 'مشويات', customImg: 'https://i.ibb.co/tTzwp6zV/image.png' },
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

function resolveOfferRestaurantMeta(offer, restaurants = []) {
  const restaurantId = String(offer?.restaurantId || offer?.restaurant?.id || '').trim()
  const offerRestaurantName = String(
    offer?.restaurantName ||
    (typeof offer?.restaurant === 'string' ? offer.restaurant : offer?.restaurant?.name) ||
    offer?.vendorName ||
    ''
  ).trim()

  const matchedRestaurant = (restaurants || []).find(r => {
    const id = String(r?.id || '').trim()
    const name = String(r?.name || '').trim()
    return (
      (restaurantId && id && id === restaurantId) ||
      (offerRestaurantName && name && name === offerRestaurantName)
    )
  })

  const name = matchedRestaurant?.name || offerRestaurantName
  const logoUrl =
    resolveRestaurantLogo(matchedRestaurant) ||
    offer?.restaurantLogo ||
    offer?.restaurantLogoUrl ||
    offer?.restaurantImage ||
    offer?.restaurantImageUrl ||
    offer?.logoUrl ||
    offer?.logo ||
    offer?.vendorLogo ||
    offer?.brandLogo ||
    offer?.restaurant?.logoUrl ||
    offer?.restaurant?.imageUrl ||
    offer?.restaurant?.logo ||
    ''

  return {
    id: matchedRestaurant?.id || restaurantId,
    name,
    city: matchedRestaurant?.city || offer?.city || offer?.restaurantCity || '',
    logoUrl,
    restaurant: matchedRestaurant,
  }
}

function getOfferImage(offer) {
  return offer?.imageUrl || offer?.photo || offer?.thumbnailUrl || ''
}

function countryCodeToFlagEmoji(countryCode) {
  if (!countryCode || typeof countryCode !== 'string') return '🌐'
  const code = countryCode.trim().toUpperCase()
  if (code.length !== 2) return '🌐'
  return code
    .split('')
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('')
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
  const [locationCountry, setLocationCountry] = useState({ code: '', name: '', flag: '🌐' })
  const [userCoords, setUserCoords] = useState(null)
  useEffect(() => {
    const reverseGeocode = async (lat, lng) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`)
        const data = await res.json()
        const address = data.address || {}
        const countryCode = address.country_code || ''

        setCityName(
          address.city ||
          address.town ||
          address.village ||
          address.county ||
          address.state ||
          'موقعك'
        )
        setLocationCountry({
          code: countryCode,
          name: address.country || '',
          flag: countryCodeToFlagEmoji(countryCode),
        })
      } catch {
        setCityName('موقعك')
        setLocationCountry({ code: '', name: '', flag: '🌐' })
      }
    }
    if (!navigator.geolocation) {
      setCityName('موقعك')
      setLocationCountry({ code: '', name: '', flag: '🌐' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        reverseGeocode(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        setCityName('موقعك')
        setLocationCountry({ code: '', name: '', flag: '🌐' })
      },
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
  // Banner 3 slider
  const [banner3Slides, setBanner3Slides] = useState([])
  const [activeSlide3, setActiveSlide3] = useState(0)
  const slideTimer3Ref = useRef(null)

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

      // Banner 3 slides — يستخدم banner3ImageUrl + مصفوفة banners3
      const slides3 = []
      if (d.banner3ImageUrl) slides3.push({ imageUrl: d.banner3ImageUrl })
      if (Array.isArray(d.banners3)) {
        d.banners3.forEach(b => { if (b.imageUrl) slides3.push(b) })
      }
      setBanner3Slides(slides3)
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
    if (banner3Slides.length <= 1) return
    slideTimer3Ref.current = setInterval(() => {
      setActiveSlide3(prev => (prev + 1) % banner3Slides.length)
    }, 4500)
    return () => clearInterval(slideTimer3Ref.current)
  }, [banner3Slides.length])

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

  const handleSlideChange3 = (index) => {
    setActiveSlide3(index)
    clearInterval(slideTimer3Ref.current)
    if (banner3Slides.length > 1) {
      slideTimer3Ref.current = setInterval(() => {
        setActiveSlide3(prev => (prev + 1) % banner3Slides.length)
      }, 4500)
    }
  }

  const quickExploreItems = useMemo(() => {
    const base = [CUISINE_FILTERS[1],  CUISINE_FILTERS[2], CUISINE_FILTERS[3], CUISINE_FILTERS[4], CUISINE_FILTERS[5], CUISINE_FILTERS[6], CUISINE_FILTERS[7], CUISINE_FILTERS[8], CUISINE_FILTERS[9],CUISINE_FILTERS[10] ]
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
          padding: '14px 12px 10px',
          background: WHITE,
          boxShadow: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* زر القائمة - يمين */}
            <button
              onClick={() => setShowSideMenu(true)}
              className="r2c-btn-press"
              aria-label="فتح القائمة"
              style={{
                width: 42,
                height: 42,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                flexShrink: 0,
                padding: 0,
              }}
            >
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{
                    display: 'block',
                    width: i === 1 ? 20 : 28,
                    height: 4,
                    background: '#d1d5db',
                    borderRadius: 999,
                  }}
                />
              ))}
            </button>

            {/* البحث في منتصف الهيدر */}
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              <input
                type="text"
                dir="rtl"
                placeholder="إيش اللي تبحث عنه؟"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  height: 42,
                  borderRadius: 18,
                  border: '1.5px solid #e5e7eb',
                  outline: 'none',
                  background: WHITE,
                  padding: '0 48px 0 18px',
                  fontSize: 16,
                  fontWeight: 500,
                  color: TEXT,
                  textAlign: 'center',
                  boxShadow: 'none',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="#6b7280" strokeWidth="2" />
                  <path d="M20 20L16.65 16.65" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
            </div>

            {/* زر الموقع/الدولة */}
            <button
              title={locationCountry.name ? `${cityName} - ${locationCountry.name}` : cityName}
              type="button"
              style={{
                minWidth: 58,
                height: 42,
                padding: '0 8px',
                borderRadius: 14,
                border: 'none',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'default',
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 9L12 15L18 9"
                  stroke="#111827"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{locationCountry.flag}</span>
            </button>

            {/* زر الإشعارات - يسار */}
            <div style={{ position: 'relative', flexShrink: 0 }} ref={notifsRef}>
              <button
                onClick={showNotifs ? () => setShowNotifs(false) : openNotifs}
                className="r2c-btn-press"
                aria-label="الإشعارات"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  border: 'none',
                  background: '#ff7a00',
                  boxShadow: '0 8px 18px rgba(255,122,0,0.28)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 17H9M18 17V11C18 7.686 15.314 5 12 5C8.686 5 6 7.686 6 11V17L4.5 18.5V19H19.5V18.5L18 17Z"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 19C10.3 20 11 20.5 12 20.5C13 20.5 13.7 20 14 19"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>

                {unreadCount > 0 && (
                  <span
                    style={{
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
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px solid ${WHITE}`,
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div
                  className="r2c-fade-in"
                  style={{
                    position: 'absolute',
                    top: 58,
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
        </div>

        {!isSearching && (
          <>
            <div style={{ padding: '0 12px' }}>
              <MainHeroBannerSlider
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

            <div style={{ padding: '14px 0px 0' }}>
              <TopOffersPromo offers={featuredOffers} restaurants={restaurants} onOpenOffer={openOffer} onOpenRestaurant={openRestaurant} banner2ImageUrl={banner.banner2ImageUrl} />
            </div>

            <div id="top-sellers-section">
            <ProductSection
              title="الأكثر مبيعًا"
              action="عرض الكل"
              titleImg={CUISINE_FILTERS.find(f => f.label === 'الأكثر مبيعًا')?.customImg}
              offers={topSellerOffers}
              restaurants={restaurants}
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
              {banner3Slides.length > 0 ? (
                <HeroBannerSlider
                  slides={banner3Slides}
                  fallbackBanner={null}
                  activeSlide={activeSlide3}
                  onSlideChange={handleSlideChange3}
                  onClick={() => {}}
                />
              ) : (
                <InfoTimelineCard imageUrl={banner.banner3ImageUrl} />
              )}
            </div>

            <ProductSection
              title="أفضل العروض"
              action="عرض الكل"
              titleImg={CUISINE_FILTERS.find(f => f.label === 'أفضل العروض')?.customImg}
              offers={quickPickOffers}
              restaurants={restaurants}
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
              titleImg={CUISINE_FILTERS.find(f => f.label === 'عروض لك')?.customImg}
              offers={recommendedOffers}
              restaurants={restaurants}
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


function MainHeroBannerSlider({ slides, fallbackBanner, activeSlide, onSlideChange, onClick }) {
  const hasSlides = Array.isArray(slides) && slides.length > 0
  const displaySlides = hasSlides
    ? slides
    : (fallbackBanner?.imageUrl ? [{ ...fallbackBanner, imageUrl: fallbackBanner.imageUrl }] : [])
  const count = displaySlides.length
  const currentSlide = count > 0 ? displaySlides[activeSlide % count] : null
  const isClickable = !!(currentSlide?.restaurantId || fallbackBanner?.restaurantId)

  // Extended slides for infinite loop: [clone_of_last, ...real_slides, clone_of_first]
  // internalIdx: 1..count = real slides, 0 = clone of last, count+1 = clone of first
  const extSlides = count > 1
    ? [displaySlides[count - 1], ...displaySlides, displaySlides[0]]
    : displaySlides

  const PEEK = count > 1 ? 18 : 0
  const GAP  = count > 1 ? 8  : 0

  const containerRef    = useRef(null)
  const touchStartX     = useRef(0)
  const touchStartY     = useRef(0)
  const [dragPx,        setDragPx]      = useState(0)
  const [isDragging,    setIsDragging]  = useState(false)
  const [containerW,    setContainerW]  = useState(375)
  const [internalIdx,   setInternalIdx] = useState(count > 1 ? activeSlide + 1 : 0)
  const [jumping,       setJumping]     = useState(false)
  const prevActiveProp  = useRef(activeSlide)
  const loopTimer       = useRef(null)

  // Measure container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setContainerW(el.offsetWidth || 375)
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])

  // Teleport instantly to idx after the current CSS transition finishes (430ms)
  const teleportTo = (idx) => {
    clearTimeout(loopTimer.current)
    loopTimer.current = setTimeout(() => {
      setJumping(true)
      setInternalIdx(idx)
      requestAnimationFrame(() => requestAnimationFrame(() => setJumping(false)))
    }, 430)
  }

  useEffect(() => () => clearTimeout(loopTimer.current), [])

  // Sync internalIdx when parent activeSlide changes (auto-timer or dot click)
  useEffect(() => {
    if (count <= 1) return
    const prev = prevActiveProp.current
    const cur  = activeSlide
    prevActiveProp.current = cur
    if (prev === cur) return

    if (prev === count - 1 && cur === 0) {
      // Forward wrap: animate to clone of first, then teleport to real first
      setInternalIdx(count + 1)
      teleportTo(1)
    } else if (prev === 0 && cur === count - 1) {
      // Backward wrap: animate to clone of last, then teleport to real last
      setInternalIdx(0)
      teleportTo(count)
    } else {
      setInternalIdx(cur + 1)
    }
  }, [activeSlide, count])

  // Geometry
  const slideW     = containerW > 0 ? containerW - 2 * PEEK - 2 * GAP : 0
  const trackBaseX = PEEK + GAP - internalIdx * (slideW + GAP)
  const trackX     = trackBaseX + dragPx

  // Touch handlers
  const handleTouchStart = (e) => {
    if (count <= 1) return
    clearTimeout(loopTimer.current)
    touchStartX.current = e.targetTouches[0].clientX
    touchStartY.current = e.targetTouches[0].clientY
    setIsDragging(true)
    setDragPx(0)
  }

  const handleTouchMove = (e) => {
    if (!isDragging || count <= 1) return
    const dx = e.targetTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.targetTouches[0].clientY - touchStartY.current)
    if (dy > Math.abs(dx)) return
    setDragPx(dx)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (count <= 1) return
    const threshold = slideW * 0.15

    if (dragPx < -threshold) {
      const next = internalIdx + 1
      setInternalIdx(next)
      setDragPx(0)
      if (next >= extSlides.length - 1) {
        teleportTo(1)
        onSlideChange(0)
      } else {
        onSlideChange(next - 1)
      }
    } else if (dragPx > threshold) {
      const prev = internalIdx - 1
      setInternalIdx(prev)
      setDragPx(0)
      if (prev <= 0) {
        teleportTo(count)
        onSlideChange(count - 1)
      } else {
        onSlideChange(prev - 1)
      }
    } else {
      setDragPx(0)
    }
  }

  const handleClick = (e) => {
    if (Math.abs(dragPx) > 8) return
    if (isClickable) onClick?.(e)
  }

  if (!count) {
    return (
      <div style={{
        height: 190, borderRadius: 20,
        background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 50%, ${BLUE_DARK} 100%)`,
      }} />
    )
  }

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Clip container */}
      <div
        ref={containerRef}
        style={{
          position: 'relative', height: 190, overflow: 'hidden',
          touchAction: 'pan-y',
          cursor: isDragging ? 'grabbing' : (isClickable ? 'pointer' : 'default'),
        }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sliding track — direction:ltr fixes RTL flex reversal */}
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          display: 'flex', direction: 'ltr', gap: GAP,
          transform: `translateX(${trackX}px)`,
          transition: jumping || isDragging ? 'none' : 'transform 0.42s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'transform',
        }}>
          {extSlides.map((slide, idx) => {
            const isActive = idx === internalIdx
            return (
              <div key={idx} style={{
                width: slideW, height: '100%', flexShrink: 0,
                borderRadius: 18, overflow: 'hidden',
                background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 50%, ${BLUE_DARK} 100%)`,
                boxShadow: isActive ? '0 4px 18px rgba(0,0,0,0.18)' : '0 2px 8px rgba(0,0,0,0.10)',
                transform: isActive ? 'scale(1)' : 'scale(0.96)',
                transition: jumping || isDragging ? 'none' : 'transform 0.42s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.42s ease',
              }}>
                <img
                  src={slide.imageUrl}
                  alt={slide.restaurantName || `banner-${idx}`}
                  draggable="false"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Dots */}
      {count > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 10 }}>
          {displaySlides.map((_, idx) => (
            <button
              key={idx}
              onClick={e => { e.stopPropagation(); onSlideChange(idx) }}
              style={{
                width: idx === activeSlide ? 24 : 7, height: 7,
                borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer',
                background: idx === activeSlide ? TEXT : '#d1d5db',
                transition: 'width 0.38s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.25s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}


function HeroBannerSlider({ slides, fallbackBanner, activeSlide, onSlideChange, onClick }) {
  const hasSlides = slides && slides.length > 0
  const currentSlide = hasSlides ? slides[activeSlide] : null
  const isClickable = currentSlide?.restaurantId || fallbackBanner?.restaurantId

  // ── سوايب بالـ px النسبي (بدون ResizeObserver) ───────────────────────────
  const touchStartX = useRef(0)
  const [dragPct, setDragPct]       = useState(0)   // نسبة من عرض الـ container 0..1
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)

  const getW = () => containerRef.current?.offsetWidth || 1

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX
    setIsDragging(true)
    setDragPct(0)
  }

  const handleTouchMove = (e) => {
    if (!isDragging || !hasSlides || slides.length <= 1) return
    const delta = e.targetTouches[0].clientX - touchStartX.current
    const w = getW()
    const pct = delta / w                             // −1..+1
    const resistance = 0.35
    const atStart = activeSlide === 0 && pct > 0
    const atEnd   = activeSlide === slides.length - 1 && pct < 0
    setDragPct(atStart || atEnd ? pct * resistance : pct)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (!hasSlides || slides.length <= 1) { setDragPct(0); return }
    if (dragPct < -0.15)     onSlideChange((activeSlide + 1) % slides.length)
    else if (dragPct > 0.15) onSlideChange((activeSlide - 1 + slides.length) % slides.length)
    setDragPct(0)
  }

  const handleClick = (e) => {
    if (Math.abs(dragPct) > 0.05) return
    if (isClickable) onClick?.(e)
  }

  // translateX بالـ % من عرض الـ container — يعمل فوراً بدون قياس
  // كل شريحة عرضها 100% من الـ container، فالانتقال = activeSlide * -100%
  const translateX = `calc(${(-activeSlide + dragPct) * 100}%)`

  return (
    <div
      ref={containerRef}
      className="r2c-card-hover"
      style={{
        position: 'relative',
        height: 178,
        borderRadius: 22,
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : (isClickable ? 'pointer' : 'grab'),
        boxShadow: SHADOW,
        background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 50%, ${BLUE_DARK} 100%)`,
        userSelect: 'none',
        touchAction: 'pan-y',
      }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* كل شريحة position:absolute تمتد 100% — بتتحرك بـ translateX نسبي */}
      {hasSlides ? slides.map((slide, idx) => (
        <img
          key={idx}
          src={slide.imageUrl}
          alt={slide.restaurantName || `banner-${idx}`}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            pointerEvents: 'none',
            transform: `translateX(calc(${(idx - activeSlide) * 100}% + ${dragPct * 100}%))`,
            transition: isDragging
              ? 'none'
              : 'transform 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            willChange: 'transform',
          }}
        />
      )) : fallbackBanner?.imageUrl ? (
        <img
          src={fallbackBanner.imageUrl}
          alt="banner"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
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
        border: active ? `2.5px solid ${ORANGE}` : `0px solid ${BORDER}`,
        boxShadow: active
          ? `0 3px 10px ${ORANGE}33`
          : 'none',
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

function TopOffersPromo({ offers, restaurants = [], onOpenOffer, onOpenRestaurant, banner2ImageUrl }) {
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

  const [activeIndex, setActiveIndex] = useState(0)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const autoPlayRef = useRef(null)

  const goTo = (index) => {
    const clamped = Math.max(0, Math.min(topFive.length - 1, index))
    setActiveIndex(clamped)
  }

  const resetAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    if (topFive.length <= 1) return
    autoPlayRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % topFive.length)
    }, 4000)
  }

  useEffect(() => {
    resetAutoPlay()
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current) }
  }, [topFive.length])

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    if (autoPlayRef.current) clearInterval(autoPlayRef.current)
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
      // RTL: swipe left = next, swipe right = prev
      if (dx < 0) goTo(activeIndex + 1)
      else goTo(activeIndex - 1)
    }
    touchStartX.current = null
    resetAutoPlay()
  }

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

        {/* Corner ornaments */}
        <svg style={{ position: 'absolute', top: 0, right: 0, width: 90, height: 90, opacity: 0.45, pointerEvents: 'none' }} viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
          <path d="M90 0 Q60 0 45 45 Q30 0 0 0" fill="none" stroke="#c8a96e" strokeWidth="1.2"/>
          <path d="M90 0 Q70 10 55 40 Q40 10 10 0" fill="none" stroke="#c8a96e" strokeWidth="0.8"/>
          <circle cx="45" cy="12" r="3.5" fill="#c8a96e" opacity="0.7"/>
          <circle cx="30" cy="6" r="2" fill="#c8a96e" opacity="0.5"/>
          <circle cx="60" cy="6" r="2" fill="#c8a96e" opacity="0.5"/>
        </svg>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: 90, height: 90, opacity: 0.45, pointerEvents: 'none', transform: 'scaleX(-1)' }} viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
          <path d="M90 0 Q60 0 45 45 Q30 0 0 0" fill="none" stroke="#c8a96e" strokeWidth="1.2"/>
          <path d="M90 0 Q70 10 55 40 Q40 10 10 0" fill="none" stroke="#c8a96e" strokeWidth="0.8"/>
          <circle cx="45" cy="12" r="3.5" fill="#c8a96e" opacity="0.7"/>
          <circle cx="30" cy="6" r="2" fill="#c8a96e" opacity="0.5"/>
          <circle cx="60" cy="6" r="2" fill="#c8a96e" opacity="0.5"/>
        </svg>

        {/* Side ornament lines */}
        <div style={{ position: 'absolute', top: 10, bottom: 10, right: 10, width: 1, background: 'linear-gradient(to bottom, transparent, rgba(200,169,110,0.35), transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 10, bottom: 10, left: 10, width: 1, background: 'linear-gradient(to bottom, transparent, rgba(200,169,110,0.35), transparent)', pointerEvents: 'none' }} />

        {/* Title row */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '16px 16px 14px',
          borderBottom: `1px solid rgba(200,169,110,0.25)`,
          position: 'relative', zIndex: 1, gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{
              color: '#f0d078',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 1,
              textShadow: '0 0 18px rgba(240,208,120,0.5)',
              fontFamily: "'Cairo', sans-serif",
            }}>عروض مميزة</span>
            <img
              src={CUISINE_FILTERS.find(f => f.id === 'featured')?.customImg}
              alt="عروض مميزة"
              style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: '50%', flexShrink: 0, border: '0px solid rgba(200,169,110,0.4)' }}
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          </div>
          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {topFive.map((_, i) => (
              <button
                key={i}
                onClick={() => { goTo(i); resetAutoPlay() }}
                style={{
                  width: i === activeIndex ? 18 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: i === activeIndex ? ORANGE : 'rgba(200,169,110,0.4)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Slider */}
        <div
          style={{ position: 'relative', zIndex: 1, padding: '20px 14px 18px' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Nav arrow right (prev in RTL) */}
          {activeIndex > 0 && (
            <button
              onClick={() => { goTo(activeIndex - 1); resetAutoPlay() }}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                zIndex: 10, width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(200,169,110,0.2)', border: '1px solid rgba(200,169,110,0.4)',
                color: '#f0d078', fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >›</button>
          )}
          {/* Nav arrow left (next in RTL) */}
          {activeIndex < topFive.length - 1 && (
            <button
              onClick={() => { goTo(activeIndex + 1); resetAutoPlay() }}
              style={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                zIndex: 10, width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(200,169,110,0.2)', border: '1px solid rgba(200,169,110,0.4)',
                color: '#f0d078', fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >‹</button>
          )}

          {/* Cards — show only active */}
          <div style={{ paddingTop: 22 }}>
            {topFive.map((offer, i) => (
              <div
                key={offer.id}
                className={i === activeIndex ? 'r2c-slide-in' : ''}
                style={{ display: i === activeIndex ? 'block' : 'none' }}
              >
                <FeaturedOfferCard
                  offer={offer}
                  restaurants={restaurants}
                  onOpenOffer={onOpenOffer}
                  onOpenRestaurant={onOpenRestaurant}
                  isActive={true}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FeaturedOfferCard({ offer, restaurants = [], onOpenOffer, onOpenRestaurant, isActive }) {
  const price = offer.price ?? offer.finalPrice ?? offer.discountedPrice
  const oldPrice = offer.oldPrice ?? offer.originalPrice ?? null
  const restaurantMeta = resolveOfferRestaurantMeta(offer, restaurants)
  const restName = restaurantMeta.name
  const discount = oldPrice && price ? Math.round((1 - price / oldPrice) * 100) : (offer.discountPercent ?? offer.discount ?? null)

  return (
    <div
      onClick={() => onOpenOffer(offer)}
      className="r2c-card-hover"
      style={{
        width: '100%',
        cursor: 'pointer',
        borderRadius: 18,
        overflow: 'hidden',
        background: WHITE,
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        border: `1.5px solid rgba(200,169,110,0.2)`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* صورة العرض */}
      <div style={{
        position: 'relative',
        height: 200,
        background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 100%)`,
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <OfferImage offer={offer} size="large" style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }} />

        {/* gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* شارة الخصم */}
        {discount > 0 && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: ORANGE, color: WHITE,
            fontSize: 12, fontWeight: 700,
            borderRadius: 999, padding: '4px 10px',
            boxShadow: '0 2px 8px rgba(238,123,38,0.5)',
          }}>
            {discount}% خصم
          </div>
        )}

        {/* لوجو المطعم + اسمه */}
        <div style={{
          position: 'absolute', bottom: 12, right: 12,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <RestaurantLogoBadge
            logoUrl={restaurantMeta.logoUrl}
            name={restName}
            size={36}
            onClick={(e) => {
              e.stopPropagation()
              if (onOpenRestaurant && restaurantMeta.id) {
                onOpenRestaurant({ id: restaurantMeta.id, name: restName, city: restaurantMeta.city })
              }
            }}
          />
          {restName && (
            <span style={{
              color: WHITE, fontSize: 12, fontWeight: 600,
              textShadow: '0 1px 4px rgba(0,0,0,0.6)',
              maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{restName}</span>
          )}
        </div>

        {/* تقييم */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          borderRadius: 999, padding: '3px 8px',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ fontSize: 11 }}>⭐</span>
          <span style={{ color: WHITE, fontSize: 11, fontWeight: 600 }}>4.8</span>
        </div>
      </div>

      {/* معلومات العرض */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{
            fontSize: 14,
            fontWeight: 600,
            color: TEXT,
            margin: '0 0 4px',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {offer.name}
          </h4>
          {offer.description ? (
            <div style={{
              fontSize: 12, color: MUTED, lineHeight: 1.3,
              display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{offer.description}</div>
          ) : null}
        </div>

        {/* السعر وزر الطلب */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          {price != null && (
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: ORANGE }} className="font-num">{price} ر.س</span>
              {oldPrice && (
                <div style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through', textAlign: 'left' }} className="font-num">{oldPrice} ر.س</div>
              )}
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenOffer(offer) }}
            style={{
              background: ORANGE, color: WHITE, border: 'none',
              borderRadius: 999, padding: '7px 16px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(238,123,38,0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            اطلب الآن
          </button>
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


function RestaurantLogoBadge({ logoUrl, name, size = 42, onClick, style }) {
  const letter = String(name || 'R').trim().charAt(0) || 'R'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name ? `فتح مطعم ${name}` : 'لوجو المطعم'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `3px solid ${WHITE}`,
        background: WHITE,
        overflow: 'hidden',
        boxShadow: '0 8px 18px rgba(17, 24, 39, 0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: ORANGE_DARK,
        fontSize: Math.max(14, size * 0.34),
        fontWeight: 900,
        cursor: onClick ? 'pointer' : 'default',
        padding: 0,
        zIndex: 5,
        ...style,
      }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name || 'restaurant'}
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

function ProductSection({ title, action, offers, restaurants = [], onOpenOffer, onOpenRestaurant, onViewAll, titleImg }) {
  if (!offers || offers.length === 0) return null
  return (
    <section style={{ paddingTop: 16 }}>
      <SectionBar title={title} action={action} onAction={onViewAll} titleImg={titleImg} />
      <div className="r2c-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '26px 12px 4px' }}>
        {offers.map(offer => (
          <ProductCard key={offer.id} offer={offer} restaurants={restaurants} onOpenOffer={onOpenOffer} onOpenRestaurant={onOpenRestaurant} />
        ))}
      </div>
    </section>
  )
}

function ProductCard({ offer, restaurants = [], onOpenOffer, onOpenRestaurant }) {
  const price = offer.price ?? offer.finalPrice ?? offer.discountedPrice ?? null
  const oldPrice = offer.oldPrice ?? offer.originalPrice ?? null
  const restaurantMeta = resolveOfferRestaurantMeta(offer, restaurants)
  const restName = restaurantMeta.name
  return (
    <div className="r2c-card-hover" onClick={() => onOpenOffer(offer)} style={{ width: 162, flexShrink: 0, background: WHITE, borderRadius: 18, overflow: 'visible', boxShadow: SHADOW, border: `1px solid ${BORDER}`, cursor: 'pointer' }}>
      <div style={{ height: 118, background: '#fafafa', position: 'relative', overflow: 'visible' }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '18px 18px 0 0',
          overflow: 'hidden',
        }}>
          <OfferImage offer={offer} size="medium" />
        </div>
        <RestaurantLogoBadge
          logoUrl={restaurantMeta.logoUrl}
          name={restName}
          size={42}
          onClick={(e) => {
            e.stopPropagation()
            if (onOpenRestaurant && restaurantMeta.id) {
              onOpenRestaurant({ id: restaurantMeta.id, name: restName, city: restaurantMeta.city })
            }
          }}
          style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}
        />
      </div>
      <div style={{ padding: '10px 10px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, lineHeight: 1.3, minHeight: 36, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {offer.name}
        </div>
        {restName ? (
          <button onClick={e => { e.stopPropagation(); onOpenRestaurant({ id: restaurantMeta.id || offer.restaurantId, name: restName, city: restaurantMeta.city || offer.city }) }} style={{ border: 'none', background: 'transparent', padding: 0, marginTop: 4, color: MUTED, fontSize: 11, cursor: 'pointer' }}>
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
    <div onClick={onClick} className="r2c-card-hover" style={{ background: WHITE, borderRadius: 20, overflow: 'hidden', boxShadow: SHADOW, border: `1px solid ${BORDER}`, cursor: 'pointer' }}>
      <div style={{ display: 'flex', gap: 12, padding: 14, alignItems: 'center' }}>
        <div style={{ width: 62, height: 62, borderRadius: 18, overflow: 'hidden', background: '#fafafa', flexShrink: 0, border: `1px solid ${BORDER}` }}>
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
    <button onClick={onClick} className="r2c-btn-press" style={{ border: `1.5px solid ${active ? ORANGE : BORDER}`, background: active ? ORANGE_SOFT : WHITE, color: active ? ORANGE_DARK : '#374151', borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5, boxShadow: active ? '0 3px 10px rgba(238,123,38,0.12)' : 'none' }}>
      {icon ? <span>{icon}</span> : null}
      {children}
    </button>
  )
}

function InfoPill({ children, icon }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fafafa', color: '#4b5563', borderRadius: 10, padding: '4px 8px', fontSize: 11, fontWeight: 500, border: `1px solid ${BORDER}` }}>
      <span>{icon}</span>
      <span>{children}</span>
    </span>
  )
}

function SectionBar({ title, action, actionMuted, onAction, titleImg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {titleImg && (
          <img
            src={titleImg}
            alt=""
            style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{title}</div>
      </div>
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
