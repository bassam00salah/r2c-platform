import { useState, useEffect } from 'react'
import { useApp } from '../contexts'
import { db } from '@r2c/shared'
import OfferImage from '../components/OfferImage'
import { collection, query, where, limit, getDocs, doc, getDoc } from 'firebase/firestore'
import { App } from '@capacitor/app'

function BranchMap({ lat, lng, name, distanceLabel }) {
  if (lat == null || lng == null) return null
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="bg-[#15487d] text-white text-sm font-bold px-4 py-2 flex items-center gap-2">
        <span>📍</span>
        <div className="min-w-0 flex-1">
          <div className="truncate">أقرب فرع لك — {name}</div>
          {distanceLabel ? <div className="text-[11px] font-semibold text-white/75 mt-0.5">يبعد عنك {distanceLabel}</div> : null}
        </div>
        <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`} target="_blank" rel="noreferrer" className="mr-auto flex-shrink-0 text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors">فتح الخريطة ↗</a>
      </div>
      <iframe title={`خريطة ${name}`} src={src} width="100%" height="200" style={{ border: 'none', display: 'block' }} loading="lazy" />
    </div>
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

function resolveRestaurantName(offer, restaurantData) {
  if (restaurantData?.name) return restaurantData.name
  if (typeof offer?.restaurant === 'string' && offer.restaurant.trim()) return offer.restaurant.trim()
  return offer?.restaurantName || offer?.restaurant?.name || offer?.vendorName || offer?.branchName || 'مطعم'
}


function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
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
    extractCoordinates(value.coordinates) ||
    extractCoordinates(value.geoPoint) ||
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
  return (
    extractCoordinates(branch) ||
    extractCoordinates(branch?.location) ||
    extractCoordinates(branch?.coordinates) ||
    extractCoordinates(branch?.geoPoint) ||
    extractCoordinates(branch?.map)
  )
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

function pickNearestBranch(branches, userCoords, preferredBranchId) {
  const branchesWithCoords = (branches || [])
    .map(branch => ({ branch, coords: getBranchCoords(branch) }))
    .filter(item => item.coords?.lat != null && item.coords?.lng != null)

  if (branchesWithCoords.length === 0) return null

  if (userCoords) {
    return branchesWithCoords.reduce((best, current) => {
      const bestDistance = distanceKm(userCoords, best.coords)
      const currentDistance = distanceKm(userCoords, current.coords)
      return currentDistance < bestDistance ? current : best
    }, branchesWithCoords[0]).branch
  }

  if (preferredBranchId) {
    const preferred = branchesWithCoords.find(item => item.branch?.id === preferredBranchId)
    if (preferred) return preferred.branch
  }

  return branchesWithCoords[0].branch
}

function getBranchDistanceLabel(branch, userCoords) {
  const coords = getBranchCoords(branch)
  if (!coords || !userCoords) return null
  const km = distanceKm(userCoords, coords)
  if (!Number.isFinite(km)) return null
  return km < 1 ? `${Math.round(km * 1000)} م تقريبًا` : `${km.toFixed(1)} كم تقريبًا`
}

export default function OfferDetailsScreen() {
  const {
    selectedOffer,
    goBack,
    setCurrentScreen,
    user,
    userLocation,
    currentLocation,
    selectedLocation,
    location: appLocation,
  } = useApp()
  const [nearestBranch, setNearestBranch] = useState(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [restaurantData, setRestaurantData] = useState(null)
  const [userCoords, setUserCoords] = useState(null)

  // ✅ FIX 1: الصعود لأعلى الشاشة عند الدخول
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  // ✅ FIX 2: زر العودة في الهاتف (Capacitor)
  useEffect(() => {
    let listener = null
    const register = async () => {
      listener = await App.addListener('backButton', () => {
        goBack()
      })
    }
    register()
    return () => {
      if (listener) listener.remove()
    }
  }, [goBack])

  // جلب بيانات المطعم (اللوجو والاسم)
  useEffect(() => {
    let cancelled = false
    const restaurantId = selectedOffer?.restaurantId || selectedOffer?.restaurant_id || null
    if (!restaurantId) return
    getDoc(doc(db, 'restaurants', restaurantId)).then(snap => {
      if (!cancelled && snap.exists()) setRestaurantData({ id: snap.id, ...snap.data() })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [selectedOffer])

  // تحديد موقع المستخدم من context أو localStorage أو navigator.geolocation
  useEffect(() => {
    let cancelled = false
    const coordsFromState =
      extractCoordinates(userLocation) ||
      extractCoordinates(currentLocation) ||
      extractCoordinates(selectedLocation) ||
      extractCoordinates(appLocation) ||
      extractCoordinates(user) ||
      readStoredUserCoordinates()

    if (coordsFromState) {
      setUserCoords(coordsFromState)
      return () => { cancelled = true }
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          if (cancelled) return
          setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
        },
        () => {
          if (!cancelled) setUserCoords(null)
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 5 * 60 * 1000 }
      )
    } else {
      setUserCoords(null)
    }

    return () => { cancelled = true }
  }, [userLocation, currentLocation, selectedLocation, appLocation, user])

  useEffect(() => {
    let cancelled = false

    async function fetchBranch() {
      if (!selectedOffer) {
        if (!cancelled) {
          setNearestBranch(null)
          setMapLoading(false)
        }
        return
      }

      setMapLoading(true)
      const branchId = selectedOffer.branchId || selectedOffer.branch_id || null
      const restaurantId = selectedOffer.restaurantId || selectedOffer.restaurant_id || null

      try {
        const branches = []

        if (restaurantId) {
          const branchesQuery = query(
            collection(db, 'branches'),
            where('restaurantId', '==', restaurantId),
            where('status', '==', 'active'),
            limit(50)
          )
          const snap = await getDocs(branchesQuery)
          branches.push(...snap.docs.map((branchDoc) => ({ id: branchDoc.id, ...branchDoc.data() })))
        }

        // fallback: لو العرض مرتبط بفرع محدد ولم يظهر ضمن الفروع النشطة، نضيفه كخيار احتياطي
        if (branchId && !branches.some(branch => branch.id === branchId)) {
          const branchSnap = await getDoc(doc(db, 'branches', branchId))
          if (branchSnap.exists()) {
            branches.push({ id: branchSnap.id, ...branchSnap.data() })
          }
        }

        const selectedBranch = pickNearestBranch(branches, userCoords, branchId)
        if (!cancelled) setNearestBranch(selectedBranch)
      } catch (err) {
        console.error('خطأ في جلب إحداثيات أقرب فرع:', err)
        if (!cancelled) setNearestBranch(null)
      } finally {
        if (!cancelled) setMapLoading(false)
      }
    }

    fetchBranch()
    return () => { cancelled = true }
  }, [selectedOffer, userCoords])

  if (!selectedOffer) return null
  const offerDuration = selectedOffer.duration || 45
  const price = selectedOffer.price ?? selectedOffer.finalPrice ?? selectedOffer.discountedPrice ?? selectedOffer.newPrice ?? null
  const oldPrice = selectedOffer.oldPrice ?? selectedOffer.originalPrice ?? selectedOffer.beforePrice ?? null
  const branchName = nearestBranch?.name || nearestBranch?.branchName || nearestBranch?.address || selectedOffer.branch || selectedOffer.branchName || 'الفرع الأقرب'
  const branchAddress = nearestBranch?.address || nearestBranch?.city || selectedOffer.branchAddress || selectedOffer.city || null
  const branchCoords = getBranchCoords(nearestBranch)
  const branchDistanceLabel = getBranchDistanceLabel(nearestBranch, userCoords)

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        .offer-details-hero-media,
        .offer-details-hero-media > *,
        .offer-details-hero-media img,
        .offer-details-hero-media video {
          width: 100%;
          height: 100%;
        }

        .offer-details-hero-media img,
        .offer-details-hero-media video {
          object-fit: cover;
          display: block;
        }
      `}</style>

      {/* ─── Hero: يبدأ من أعلى الشاشة ويظهر خلف الهيدر الشفاف ─── */}
      <div
        className="relative overflow-visible"
        style={{
          // ارفع الصورة خلف الهيدر العام + مساحة شريط الحالة في الهاتف
          marginTop: 'calc(-1 * (var(--app-header-height, 76px) + env(safe-area-inset-top, 0px)))',
          height: 'calc(340px + var(--app-header-height, 76px) + env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="offer-details-hero-media absolute inset-0 overflow-hidden" style={{ height: '100%' }}>
          <OfferImage offer={selectedOffer} size="large" />
        </div>

        {/* تدرج خفيف خلف الهيدر حتى تظهر أيقونات الهيدر فوق الصورة بوضوح */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: 'calc(var(--app-header-height, 76px) + env(safe-area-inset-top, 0px) + 96px)',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 100%)',
            zIndex: 2,
          }}
        />

        <div
          className="absolute right-4"
          style={{
            top: 'calc(var(--app-header-height, 76px) + env(safe-area-inset-top, 0px) + 12px)',
            zIndex: 3,
          }}
        >
          <div className="discount-badge">خصم {selectedOffer.discount}%</div>
        </div>

        {/* لوجو المطعم على منتصف الحد السفلي */}
        {(() => {
          const logoUrl = resolveRestaurantLogo(selectedOffer, restaurantData)
          const name = resolveRestaurantName(selectedOffer, restaurantData)
          const letter = (name || 'R').trim().charAt(0)
          return (
            <div style={{
              position: 'absolute',
              bottom: -28,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: '3px solid #ffffff',
              background: '#ffffff',
              overflow: 'hidden',
              boxShadow: '0 8px 18px rgba(17, 24, 39, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}>
              {logoUrl
                ? <img src={logoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }} />
                : null}
              <span style={{ display: logoUrl ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', color: '#d96b1a', fontWeight: 900, fontSize: 22 }}>{letter}</span>
            </div>
          )
        })()}
      </div>

      {/* ─── المحتوى ─── */}
      <div className="p-6 pb-24 pt-10">
        <h1 className="text-3xl font-bold mb-2">{selectedOffer.name}</h1>
        <div className="flex items-center gap-2 text-gray-500 mb-6">
          <span>📍</span>
          <span>{selectedOffer.city}{selectedOffer.distance ? ` • ${selectedOffer.distance}` : ''}</span>
        </div>

        <div className="bg-gradient-to-r from-[#ee7b26]/20 to-[#d96b1a]/20 border border-[#ee7b26]/30 rounded-2xl p-6 mb-6">
          <h3 className="text-[#ee7b26] font-bold text-xl mb-4">تفاصيل العرض</h3>
          {selectedOffer.description && <p className="text-gray-600 mb-6">{selectedOffer.description}</p>}
          <div className="space-y-2 mb-6">
            {(selectedOffer.details || []).map((detail, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-[#ee7b26]">•</span><span>{detail}</span>
              </div>
            ))}
          </div>
          <div className="flex items-baseline gap-3">
            {price !== null && price !== undefined
              ? <span className="text-[#ee7b26] text-5xl font-bold">{Number(price).toLocaleString('ar-SA')} ريال</span>
              : <span className="text-gray-400 text-lg">السعر غير محدد</span>}
            {oldPrice !== null && oldPrice !== undefined &&
              <span className="text-gray-500 text-xl line-through">{Number(oldPrice).toLocaleString('ar-SA')} ريال</span>}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-xl py-3 mb-6">
          <span className="text-[#ee7b26]">⏱</span>
          <span className="font-semibold text-amber-800">صالح لمدة {offerDuration} دقيقة بعد قبول الطلب</span>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[#ee7b26] text-2xl">📍</span>
            <div>
              <div className="font-bold">{branchName}</div>
              {branchAddress && <div className="text-sm text-gray-500">{branchAddress}</div>}
              {branchDistanceLabel && <div className="text-xs text-[#ee7b26] font-bold mt-1">يبعد عنك {branchDistanceLabel}</div>}
            </div>
          </div>
          {mapLoading
            ? <div className="h-32 bg-gray-100 rounded-xl flex items-center justify-center gap-2 text-gray-400">
                <div className="w-5 h-5 border-2 border-[#ee7b26] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">جاري تحميل الخريطة...</span>
              </div>
            : branchCoords
              ? <BranchMap lat={branchCoords.lat} lng={branchCoords.lng} name={branchName} distanceLabel={branchDistanceLabel} />
              : <div className="h-32 bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 gap-2">
                  <span className="text-3xl">🗺️</span>
                  <span className="text-sm">لا تتوفر إحداثيات لهذا الفرع</span>
                </div>}
        </div>

        <button
          onClick={() => setCurrentScreen('confirmOrder')}
          className="gradient-button text-white font-bold text-xl py-4 rounded-2xl w-full transition-transform"
        >
          اطلب الآن
        </button>
      </div>
    </div>
  )
}
