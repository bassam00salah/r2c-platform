import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../contexts'
import OfferImage from '../components/OfferImage'
import { db } from '@r2c/shared'
import { collection, query, where, limit, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'

const ORANGE = '#ee7b26'
const ORANGE_DARK = '#d96a18'
const ORANGE_SOFT = '#fff3e8'
const NAVY = '#0d1f35'
const WHITE = '#ffffff'
const TEXT = '#111827'
const MUTED = '#6b7280'
const BORDER = '#e5e7eb'
const BG = '#ffffff'
const SHADOW = '0 8px 24px rgba(17, 24, 39, 0.04)'
const HEADER_OVERLAP = 88
const COVER_BASE_HEIGHT = 220
const COVER_HEIGHT = `calc(${COVER_BASE_HEIGHT}px + ${HEADER_OVERLAP}px + env(safe-area-inset-top, 0px))`

const FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&display=swap');
  * {
    font-family: 'Cairo', sans-serif;
    line-height: 1.5;
  }
  .font-num { font-family: 'Poppins', 'Cairo', sans-serif; }
`

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
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

function offerSearchText(offer, restaurantData) {
  return normalizeText([
    offer?.name,
    offer?.description,
    offer?.shortDescription,
    offer?.category,
    offer?.cuisine,
    offer?.restaurantName,
    offer?.restaurant,
    offer?.tags,
    restaurantData?.name,
  ].filter(Boolean).join(' '))
}

function extractCoordinates(value) {
  if (!value) return null

  if (Array.isArray(value) && value.length >= 2) {
    const lat = toNumber(value[0])
    const lng = toNumber(value[1])
    return lat != null && lng != null ? { lat, lng } : null
  }

  if (typeof value === 'string') {
    const parts = value.split(',').map(part => part.trim())
    if (parts.length >= 2) {
      const lat = toNumber(parts[0])
      const lng = toNumber(parts[1])
      return lat != null && lng != null ? { lat, lng } : null
    }
    return null
  }

  const lat = toNumber(
    value.latitude ??
    value.lat ??
    value.coords?.latitude ??
    value.position?.lat ??
    value.geometry?.location?.lat
  )
  const lng = toNumber(
    value.longitude ??
    value.lng ??
    value.lon ??
    value.coords?.longitude ??
    value.position?.lng ??
    value.geometry?.location?.lng
  )

  if (lat != null && lng != null) return { lat, lng }

  return (
    extractCoordinates(value.location) ||
    extractCoordinates(value.currentLocation) ||
    extractCoordinates(value.selectedLocation) ||
    extractCoordinates(value.address) ||
    extractCoordinates(value.map)
  )
}

function readStoredUserCoordinates() {
  if (typeof localStorage === 'undefined') return null

  const keys = [
    'r2c_user_location',
    'r2c_current_location',
    'r2c_selected_location',
    'r2c_location',
    'userLocation',
    'currentLocation',
    'selectedLocation',
    'location',
  ]

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const direct = extractCoordinates(raw)
      if (direct) return direct
      const parsed = JSON.parse(raw)
      const coords = extractCoordinates(parsed)
      if (coords) return coords
    } catch {
      // تجاهل أي قيمة مخزنة بصيغة غير متوقعة
    }
  }

  return null
}

function getBranchCoords(branch) {
  return extractCoordinates(branch) ||
    extractCoordinates(branch?.location) ||
    extractCoordinates(branch?.coordinates) ||
    extractCoordinates(branch?.geoPoint) ||
    extractCoordinates(branch?.map)
}

function distanceKm(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY
  const radius = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function pickNearestBranch(branches, userCoords) {
  const branchesWithCoords = (branches || [])
    .map(branch => ({ branch, coords: getBranchCoords(branch) }))
    .filter(item => item.coords?.lat != null && item.coords?.lng != null)

  if (branchesWithCoords.length === 0) return null
  if (!userCoords) return branchesWithCoords[0].branch

  return branchesWithCoords.reduce((best, current) => {
    const bestDistance = distanceKm(userCoords, best.coords)
    const currentDistance = distanceKm(userCoords, current.coords)
    return currentDistance < bestDistance ? current : best
  }, branchesWithCoords[0]).branch
}

function getBranchName(branch) {
  return branch?.name || branch?.branchName || branch?.address || branch?.city || 'الفرع'
}

function getBranchDistanceLabel(branch, userCoords) {
  const coords = getBranchCoords(branch)
  if (!coords || !userCoords) return null
  const km = distanceKm(userCoords, coords)
  if (!Number.isFinite(km)) return null
  return km < 1 ? `${Math.round(km * 1000)} م تقريبًا` : `${km.toFixed(1)} كم تقريبًا`
}

function offerBelongsToRestaurant(offer, selectedRestaurant) {
  if (!offer || !selectedRestaurant) return false

  const selectedId = selectedRestaurant?.id
  const selectedName = normalizeText(selectedRestaurant?.name)
  const offerRestaurantId = offer?.restaurantId || offer?.restaurant?.id || offer?.vendorId
  const offerRestaurantName = normalizeText(offer?.restaurantName || offer?.restaurant || offer?.restaurant?.name || offer?.vendorName)

  if (selectedId && offerRestaurantId === selectedId) return true
  if (selectedName && offerRestaurantName && offerRestaurantName === selectedName) return true

  return false
}

function BranchMap({ lat, lng, name, distanceLabel, isNearest }) {
  if (lat == null || lng == null) return null

  const delta = 0.01
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&layer=mapnik&marker=${lat},${lng}`
  const openMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`

  return (
    <div style={{
      margin: '0 16px 24px',
      borderRadius: 22,
      overflow: 'hidden',
      border: `1px solid ${BORDER}`,
      boxShadow: '0 8px 24px rgba(17, 24, 39, 0.06)',
      background: WHITE,
    }}>
      <div style={{
        background: NAVY,
        color: WHITE,
        fontSize: 13,
        fontWeight: 700,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>📍</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {isNearest ? 'موقع أقرب فرع لك' : 'موقع أقرب فرع لك'} — {name}
          </div>
          {distanceLabel ? (
            <div className="font-num" style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', fontWeight: 600, marginTop: 2 }}>
              يبعد عنك {distanceLabel}
            </div>
          ) : null}
        </div>
        <a
          href={openMapUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            flexShrink: 0,
            fontSize: 12,
            background: 'rgba(255,255,255,0.15)',
            padding: '6px 12px',
            borderRadius: 999,
            color: WHITE,
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          الاتجاهات ↗
        </a>
      </div>
      <iframe
        title={`خريطة ${name}`}
        src={src}
        width="100%"
        height="210"
        style={{ border: 'none', display: 'block' }}
        loading="lazy"
      />
    </div>
  )
}

export default function RestaurantProfileScreen() {
  const {
    offers,
    selectedRestaurant,
    setSelectedOffer,
    setCurrentScreen,
    user,
    globalHeaderSearchQuery,
    userLocation,
    currentLocation,
    selectedLocation,
    location: appLocation,
  } = useApp()

  const [displayMode, setDisplayMode] = useState(() => {
    try {
      return localStorage.getItem('r2c_restaurant_profile_display_mode') || 'grid'
    } catch {
      return 'grid'
    }
  })
  const [branchStatus, setBranchStatus] = useState(null)
  const [branches, setBranches] = useState([])
  const [restaurantData, setRestaurantData] = useState(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favLoading, setFavLoading] = useState(false)
  const [deviceLocation, setDeviceLocation] = useState(null)

  const searchQuery = globalHeaderSearchQuery || ''

  const userCoords = useMemo(() => {
    return (
      extractCoordinates(userLocation) ||
      extractCoordinates(currentLocation) ||
      extractCoordinates(selectedLocation) ||
      extractCoordinates(appLocation) ||
      extractCoordinates(user) ||
      readStoredUserCoordinates() ||
      deviceLocation
    )
  }, [userLocation, currentLocation, selectedLocation, appLocation, user, deviceLocation])

  const nearestBranch = useMemo(() => pickNearestBranch(branches, userCoords), [branches, userCoords])
  const nearestBranchCoords = getBranchCoords(nearestBranch)
  const nearestBranchDistanceLabel = getBranchDistanceLabel(nearestBranch, userCoords)
  const restaurantRating = toNumber(restaurantData?.rating ?? selectedRestaurant?.rating) ?? 4.8

  useEffect(() => {
    try { localStorage.setItem('r2c_restaurant_profile_display_mode', displayMode) } catch { /* ignore localStorage errors */ }
  }, [displayMode])

  useEffect(() => {
    if (userCoords || typeof navigator === 'undefined' || !navigator.geolocation) return undefined

    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      position => {
        if (cancelled) return
        const coords = extractCoordinates(position)
        if (coords) setDeviceLocation(coords)
      },
      () => {},
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 10 * 60 * 1000 }
    )

    return () => {
      cancelled = true
    }
  }, [userCoords])

  useEffect(() => {
    if (!user?.uid || !selectedRestaurant?.id) return undefined
    const favRef = doc(db, 'users', user.uid, 'favorites', selectedRestaurant.id)
    getDoc(favRef).then(snap => setIsFavorite(snap.exists())).catch(() => {})
    return undefined
  }, [user?.uid, selectedRestaurant?.id])

  const toggleFavorite = async () => {
    if (favLoading) return
    const newValue = !isFavorite
    setIsFavorite(newValue)
    if (!user?.uid || !selectedRestaurant?.id) return

    setFavLoading(true)
    const favRef = doc(db, 'users', user.uid, 'favorites', selectedRestaurant.id)

    try {
      if (!newValue) {
        await deleteDoc(favRef)
      } else {
        await setDoc(favRef, {
          restaurantId: selectedRestaurant.id,
          name: selectedRestaurant.name || '',
          savedAt: new Date().toISOString(),
        })
      }
    } catch (err) {
      console.error('R2C: failed to toggle favorite', err)
      setIsFavorite(!newValue)
    } finally {
      setFavLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedRestaurant?.id) return undefined
    setRestaurantData(null)
    getDoc(doc(db, 'restaurants', selectedRestaurant.id)).then(snap => {
      if (snap.exists()) setRestaurantData({ id: snap.id, ...snap.data() })
    }).catch(() => {})
    return undefined
  }, [selectedRestaurant?.id])

  const restaurantOffers = useMemo(() => {
    return (offers || []).filter(offer => offerBelongsToRestaurant(offer, selectedRestaurant))
  }, [offers, selectedRestaurant])

  const filteredRestaurantOffers = useMemo(() => {
    const q = normalizeText(searchQuery)
    if (!q) return restaurantOffers

    return restaurantOffers.filter(offer => offerSearchText(offer, restaurantData).includes(q))
  }, [restaurantOffers, searchQuery, restaurantData])

  useEffect(() => {
    let cancelled = false

    if (!selectedRestaurant?.id) {
      setBranchStatus(null)
      setBranches([])
      return undefined
    }

    setBranchStatus(null)
    setBranches([])

    const branchesQuery = query(
      collection(db, 'branches'),
      where('restaurantId', '==', selectedRestaurant.id),
      where('status', '==', 'active'),
      limit(50)
    )

    getDocs(branchesQuery).then(snap => {
      if (cancelled) return
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const anyOpen = docs.some(d => d?.settings?.acceptingOrders !== false)
      setBranches(docs)
      setBranchStatus(anyOpen)
    }).catch(() => {
      if (!cancelled) {
        setBranchStatus(null)
        setBranches([])
      }
    })

    return () => {
      cancelled = true
    }
  }, [selectedRestaurant?.id])

  const handleOfferClick = (offer) => {
    setSelectedOffer(offer)
    setCurrentScreen('offerDetails')
  }

  const toggleDisplayMode = () => {
    setDisplayMode(current => current === 'grid' ? 'list' : 'grid')
  }

  const restaurantLogo = restaurantData?.imageUrl || restaurantData?.logoUrl || restaurantData?.logo
  const restaurantCity = selectedRestaurant?.city || restaurantData?.city || nearestBranch?.city || ''

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

      <div dir="rtl" style={{ minHeight: '100vh', background: BG, paddingBottom: 96, color: TEXT }}>
        {/* معلومات المطعم - صورة الغلاف ممتدة خلف الهيدر الشفاف */}
        <div style={{
          margin: 0,
          marginTop: `calc(-${HEADER_OVERLAP}px - env(safe-area-inset-top, 0px))`,
          marginBottom: 20,
        }}>
          <div style={{
            position: 'relative',
            overflow: 'visible',
            minHeight: COVER_HEIGHT,
          }}>
            <div style={{
              overflow: 'hidden',
              minHeight: COVER_HEIGHT,
              background: 'linear-gradient(180deg, #d1d5db 0%, #e5e7eb 100%)',
              borderBottomLeftRadius: 28,
              borderBottomRightRadius: 28,
              boxShadow: '0 10px 28px rgba(15,23,42,0.08)',
            }}>
              {restaurantData?.coverImageUrl || restaurantData?.imageUrl ? (
                <img
                  src={restaurantData.coverImageUrl || restaurantData.imageUrl}
                  alt={selectedRestaurant?.name}
                  style={{
                    width: '100%',
                    height: COVER_HEIGHT,
                    objectFit: 'cover',
                    display: 'block',
                  }}
                  onError={e => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : null}

              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(15,23,42,0.42) 0%, rgba(15,23,42,0.18) 34%, rgba(15,23,42,0.08) 62%, rgba(15,23,42,0.20) 100%)',
                pointerEvents: 'none'
              }} />
            </div>

            <div style={{
              position: 'absolute',
              left: '50%',
              bottom: -42,
              transform: 'translateX(-50%)',
              width: 92,
              height: 92,
              borderRadius: '50%',
              overflow: 'hidden',
              border: `4px solid ${WHITE}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: WHITE,
              boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
              zIndex: 5,
            }}>
              {restaurantLogo ? (
                <img
                  src={restaurantLogo}
                  alt={selectedRestaurant?.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => {
                    e.currentTarget.style.display = 'none'
                    if (e.currentTarget.nextSibling) {
                      e.currentTarget.nextSibling.style.display = 'flex'
                    }
                  }}
                />
              ) : null}
              <span style={{ fontSize: 40, display: restaurantLogo ? 'none' : 'flex' }}>
                🏪
              </span>
            </div>
          </div>

          <div style={{ padding: '58px 16px 0', textAlign: 'center', background: 'transparent' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 6px' }}>
              {selectedRestaurant?.name}
            </h2>

            {restaurantCity ? (
              <p style={{ fontSize: 14, color: MUTED, fontWeight: 500, margin: '0 0 20px' }}>
                📍 {restaurantCity}
              </p>
            ) : null}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {branchStatus === null ? (
                <span style={{
                  background: '#f1f5f9',
                  color: MUTED,
                  padding: '6px 16px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  ⏳ جاري التحقق...
                </span>
              ) : branchStatus ? (
                <span style={{
                  background: '#ecfdf5',
                  color: '#059669',
                  padding: '6px 16px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  border: '1px solid #a7f3d0'
                }}>
                  🟢 مفتوح الآن
                </span>
              ) : (
                <span style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  padding: '6px 16px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  border: '1px solid #fecaca'
                }}>
                  🔴 مغلق حالياً
                </span>
              )}

              <span style={{
                background: '#fffbeb',
                color: '#d97706',
                padding: '6px 16px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                ⭐ <span className="font-num">{restaurantRating.toFixed ? restaurantRating.toFixed(1) : restaurantRating}</span>
              </span>

              <button
                onClick={toggleFavorite}
                disabled={favLoading}
                style={{
                  background: isFavorite ? '#fef2f2' : '#f1f5f9',
                  border: `1px solid ${isFavorite ? '#fecaca' : '#e2e8f0'}`,
                  borderRadius: 12,
                  padding: '6px 14px',
                  cursor: favLoading ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 13,
                  fontWeight: 700,
                  color: isFavorite ? '#ef4444' : MUTED,
                  transition: 'all 0.2s ease',
                  transform: isFavorite ? 'scale(1.05)' : 'scale(1)',
                  opacity: favLoading ? 0.6 : 1,
                }}
              >
                <span style={{
                  fontSize: 16,
                  transition: 'transform 0.2s ease',
                  display: 'inline-block',
                  transform: isFavorite ? 'scale(1.15)' : 'scale(1)',
                }}>
                  {isFavorite ? '❤️' : '🤍'}
                </span>
                {favLoading ? '...' : isFavorite ? 'محفوظ' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>

        {/* العروض بنفس شكل ExploreScreen بدون شريط الأيقونات */}
        <section style={{ background: WHITE }}>
          <div style={{
            padding: '0 16px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: NAVY, margin: 0 }}>
              العروض المتاحة
            </h3>

          </div>

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

          <div style={{ padding: displayMode === 'grid' ? '26px 12px 20px' : '18px 12px 20px', background: WHITE }}>
            {filteredRestaurantOffers.length === 0 ? (
              <EmptyOffers />
            ) : displayMode === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 14, rowGap: 34 }}>
                {filteredRestaurantOffers.map((offer) => (
                  <OfferGridCard
                    key={offer.id}
                    offer={offer}
                    restaurantData={restaurantData}
                    onOfferClick={() => handleOfferClick(offer)}
                    onRestaurantClick={() => {}}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {filteredRestaurantOffers.map((offer) => (
                  <OfferListCard
                    key={offer.id}
                    offer={offer}
                    restaurantData={restaurantData}
                    onOfferClick={() => handleOfferClick(offer)}
                    onRestaurantClick={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* الخريطة في الأسفل: أقرب فرع للمستخدم عند توفر موقعه */}
        {nearestBranch && nearestBranchCoords ? (
          <BranchMap
            lat={nearestBranchCoords.lat}
            lng={nearestBranchCoords.lng}
            name={getBranchName(nearestBranch)}
            distanceLabel={nearestBranchDistanceLabel}
            isNearest={Boolean(userCoords)}
          />
        ) : (
          branchStatus !== null && (
            <div style={{
              margin: '0 16px 24px',
              borderRadius: 16,
              background: WHITE,
              border: `1px dashed ${BORDER}`,
              minHeight: 72,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: MUTED,
              fontSize: 14,
              fontWeight: 600,
              padding: '0 16px',
            }}>
              📍 لا تتوفر إحداثيات لفروع هذا المطعم حالياً
            </div>
          )
        )}
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
