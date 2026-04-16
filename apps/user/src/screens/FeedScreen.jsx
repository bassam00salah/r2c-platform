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
  { id: 'all',     label: 'الكل',    img: EMOJI_3D.all },
  { id: 'برجر',   label: 'برجر',    img: EMOJI_3D.burger,   customImg: 'https://i.ibb.co/tPXQKJcL/image.png' /* 🔗 ضع رابط صورة البرجر هنا    — 400×400 px */ },
  { id: 'بحب', label: 'عروض مميزة', img: EMOJI_3D.burger, customImg: 'https://i.ibb.co/ymG5qHhr/image.png' },
  { id: 'بيتزا',  label: 'بيتزا',   img: EMOJI_3D.pizza,    customImg: 'https://i.ibb.co/JFdjTJmP/image.png' },
  { id: 'شاورما', label: 'شاورما',  img: EMOJI_3D.shawarma, customImg: 'https://i.ibb.co/wh2wzQbt/image.png' /* 🔗 ضع رابط صورة الشاورما هنا  — 400×400 px */ },
  { id: 'دجاج',   label: 'دجاج',    img: EMOJI_3D.chicken,  customImg: 'https://i.ibb.co/Z6JtJbxQ/image.png' /* 🔗 ضع رابط صورة الدجاج هنا    — 400×400 px */ },
  { id: 'بيتزا',  label: 'الأكثر مبيعًا',   img: EMOJI_3D.fish,     customImg: 'https://i.ibb.co/ymG5qHhr/image.png' /* 🔗 ضع رابط صورة الأسماك هنا   — 400×400 px */ },
  { id: 'مشاوي',  label: 'مشروبات',  img: EMOJI_3D.grills,   customImg: 'https://i.ibb.co/TqWqjw7x/image.png' /* 🔗 ضع رابط صورة المشويات هنا  — 400×400 px */ },
  { id: 'حلويات', label: 'حلويات',  img: EMOJI_3D.sweets,   customImg: 'https://i.ibb.co/q3tDHGtX/image.png' /* 🔗 ضع رابط صورة الحلويات هنا  — 400×400 px */ },
  { id: 'بطاطس', label: 'أفضل العروض', img: EMOJI_3D.burger, customImg: 'https://i.ibb.co/8DByX04b/image.png' },
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
  if (filter.customImg) return filter.customImg   // ← الصورة المخصصة تأخذ الأولوية دائماً
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

  // SVG icons — خط رفيع بسيط
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
      {/* Overlay */}
      {isOpen && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100%', width: 295,
        background: WHITE, zIndex: 50,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }} dir="rtl">

        {/* ── User Header ── */}
        <div style={{ padding: '52px 20px 20px', background: WHITE, borderBottom: `1px solid ${BORDER}`, position: 'relative' }}>
          {/* Close btn */}
          <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f5f6f8', color: '#374151', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

          {/* Avatar */}
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

        {/* ── Main Items ── */}
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

        {/* ── Divider ── */}
        <div style={{ height: 8, background: '#f5f6f8', flexShrink: 0 }} />

        {/* ── Footer Items ── */}
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
      // بناء قائمة الشرائح: البانر الأساسي + banners array
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

  // تبديل تلقائي كل 4 ثوانٍ
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
    // إعادة ضبط المؤقت عند الضغط اليدوي
    clearInterval(slideTimerRef.current)
    if (bannerSlides.length > 1) {
      slideTimerRef.current = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % bannerSlides.length)
      }, 4000)
    }
  }

  const quickExploreItems = useMemo(() => {
    const base = [CUISINE_FILTERS[2], CUISINE_FILTERS[6], CUISINE_FILTERS[9], CUISINE_FILTERS[3], CUISINE_FILTERS[4], CUISINE_FILTERS[5], CUISINE_FILTERS[7], CUISINE_FILTERS[8],]
    return base.map((filter, idx) => ({
      id: filter.id,
      label: filter.label,
      image: pickCuisineImage(filter, featuredOffers, restaurants),
      emojiImg: filter.img,   // صورة webp من Noto Emoji كـ fallback
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

            <SectionBar title="استكشف القائمة" action="عرض الكل" onAction={() => { setActiveCuisine('all'); setActiveCustomCat(null); restaurantsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} />
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
              onViewAll={() => { setSortBy('default'); setActiveCuisine('all'); setActiveCustomCat(null); restaurantsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
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
  // fallback: إذا لم تكن هناك شرائح، أظهر البانر الأصلي فارغاً
  const hasSlides = slides && slides.length > 0

  const currentSlide = hasSlides ? slides[activeSlide] : null
  const isClickable = currentSlide?.restaurantId || fallbackBanner?.restaurantId

  return (
    <div
      className="r2c-card-hover"
      style={{
        position: 'relative',
        height: 178,
        borderRadius: 22,
        overflow: 'hidden',
        cursor: isClickable ? 'pointer' : 'default',
        boxShadow: SHADOW,
        background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 50%, ${BLUE_DARK} 100%)`,
        userSelect: 'none',
      }}
      onClick={isClickable ? onClick : undefined}
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

      {/* نقاط التنقل — تظهر فقط إذا يوجد أكثر من شريحة */}
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
      {/* دائرة الصورة */}
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
      {/* الاسم أسفل الدائرة */}
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

      {/* ── Hero banner: white card with orange border, decorative food doodles ── */}
      <div style={{
        position: 'relative',
        background: '#fffdf8',
        border: `2.5px solid ${ORANGE}`,
        overflow: 'hidden',
        borderRadius: 22,
        boxShadow: `0 6px 28px rgba(238,123,38,0.18), 0 2px 8px rgba(238,123,38,0.10)`,
      }}>
        {/* Decorative SVG food doodles left */}
        <svg style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: 90, opacity: 0.13, pointerEvents: 'none' }} viewBox="0 0 90 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="15" cy="30" r="10" stroke="#ee7b26" strokeWidth="1.5"/>
          <path d="M5 60 Q20 50 35 65 Q20 80 5 70Z" stroke="#ee7b26" strokeWidth="1.5"/>
          <circle cx="45" cy="110" r="8" stroke="#ee7b26" strokeWidth="1.5"/>
          <path d="M10 130 L25 120 L30 135 L15 145Z" stroke="#ee7b26" strokeWidth="1.5"/>
          <circle cx="20" cy="165" r="6" stroke="#ee7b26" strokeWidth="1.5"/>
          <path d="M50 25 Q60 15 70 25 Q60 35 50 25Z" stroke="#ee7b26" strokeWidth="1.5"/>
          <circle cx="65" cy="60" r="5" stroke="#ee7b26" strokeWidth="1.5"/>
          <path d="M55 85 L70 78 L72 95 L57 98Z" stroke="#ee7b26" strokeWidth="1.5"/>
          <circle cx="35" cy="150" r="7" stroke="#ee7b26" strokeWidth="1.5"/>
        </svg>
        {/* Decorative SVG food doodles right */}
        <svg style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 90, opacity: 0.13, pointerEvents: 'none' }} viewBox="0 0 90 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="75" cy="30" r="10" stroke="#ee7b26" strokeWidth="1.5"/>
          <path d="M85 60 Q70 50 55 65 Q70 80 85 70Z" stroke="#ee7b26" strokeWidth="1.5"/>
          <circle cx="45" cy="110" r="8" stroke="#ee7b26" strokeWidth="1.5"/>
          <path d="M80 130 L65 120 L60 135 L75 145Z" stroke="#ee7b26" strokeWidth="1.5"/>
          <circle cx="70" cy="165" r="6" stroke="#ee7b26" strokeWidth="1.5"/>
          <path d="M40 25 Q30 15 20 25 Q30 35 40 25Z" stroke="#ee7b26" strokeWidth="1.5"/>
          <circle cx="25" cy="60" r="5" stroke="#ee7b26" strokeWidth="1.5"/>
          <path d="M35 85 L20 78 L18 95 L33 98Z" stroke="#ee7b26" strokeWidth="1.5"/>
          <circle cx="55" cy="150" r="7" stroke="#ee7b26" strokeWidth="1.5"/>
        </svg>

        {/* Title row with flame icon */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '14px 16px 12px',
          borderBottom: `1.5px solid rgba(238,123,38,0.18)`,
          position: 'relative', zIndex: 1,
        }}>
          <span style={{ fontSize: 26 }}>🔥</span>
          <span style={{ color: ORANGE, fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>عروض مميزة</span>
        </div>

        {/* Cards container */}
        <div style={{ position: 'relative', zIndex: 1, padding: '14px 0 16px' }}>
        <div
          className="r2c-scrollbar"
          style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 10px 4px' }}
        >
          {topFive.map((offer) => {
            const price = offer.price ?? offer.finalPrice ?? offer.discountedPrice
            const restName = offer.restaurantName || offer.restaurant || ''
            return (
              <div
                key={offer.id}
                onClick={() => onOpenOffer(offer)}
                className="r2c-card-hover"
                style={{ flexShrink: 0, width: 140, cursor: 'pointer', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 28px rgba(0,0,0,0.32)' }}
              >
                {/* full image — no white bg */}
                <div style={{ position: 'relative', height: 190, background: BLUE, overflow: 'hidden' }}>
                  <OfferImage offer={offer} size="medium" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

                  {/* subtle gradient at bottom for text readability */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(10,10,30,0.82) 0%, rgba(10,10,30,0.18) 55%, rgba(0,0,0,0) 100%)',
                    pointerEvents: 'none',
                  }} />

                  {/* discount badge */}
                  {offer.discount > 0 && (
                    <div style={{ position: 'absolute', top: 7, right: 7, background: RED, color: '#fff', borderRadius: 999, padding: '2px 7px', fontSize: 9, fontWeight: 500, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                      {offer.discount}%
                    </div>
                  )}

                  {/* text info — floating over image, no background */}
                  <div style={{ position: 'absolute', bottom: 0, right: 0, left: 0, padding: '0 8px 10px', textAlign: 'right' }}>
                    {restName ? (
                      <div style={{ fontSize: 10, fontWeight: 500, color: ORANGE, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: 0.2, marginBottom: 2 }}>
                        {restName}
                      </div>
                    ) : null}
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.82)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 5 }}>
                      {offer.name}
                    </div>
                    {price != null && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, justifyContent: 'flex-end' }}>
                        <span style={{ color: GOLD, fontSize: 13, fontWeight: 500, textShadow: '0 1px 6px rgba(0,0,0,0.5)' }} className="font-num">{price}</span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: 500 }}>ر.س</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        </div>{/* end cards container */}
      </div>{/* end banner card */}

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
        {offer.discount > 0 && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: WHITE, color: RED, borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 500, boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }}>
            خصم {offer.discount}%
          </div>
        )}
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
  // إذا وُجد رابط صورة من الإعدادات، نعرض الصورة كبانر
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
