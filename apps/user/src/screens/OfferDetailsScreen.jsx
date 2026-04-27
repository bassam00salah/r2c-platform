import { useState, useEffect } from 'react'
import { useApp } from '../contexts'
import { db } from '@r2c/shared'
import OfferImage from '../components/OfferImage'
import { collection, query, where, limit, getDocs, doc, getDoc } from 'firebase/firestore'
import { App } from '@capacitor/app'

function BranchMap({ lat, lng, name }) {
  if (!lat || !lng) return null
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="bg-[#15487d] text-white text-sm font-bold px-4 py-2 flex items-center gap-2">
        <span>📍</span><span>{name}</span>
        <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`} target="_blank" rel="noreferrer" className="mr-auto text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors">فتح الخريطة ↗</a>
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

export default function OfferDetailsScreen() {
  const { selectedOffer, goBack, setCurrentScreen } = useApp()
  const [nearestBranch, setNearestBranch] = useState(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [restaurantData, setRestaurantData] = useState(null)

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

  useEffect(() => {
    let cancelled = false
    async function fetchBranch() {
      if (!selectedOffer) {
        if (!cancelled) { setNearestBranch(null); setMapLoading(false) }
        return
      }
      setMapLoading(true)
      const branchId = selectedOffer.branchId || selectedOffer.branch_id || null
      const restaurantId = selectedOffer.restaurantId || selectedOffer.restaurant_id || null
      try {
        if (branchId) {
          const snap = await getDoc(doc(db, 'branches', branchId))
          if (snap.exists()) {
            const data = { id: snap.id, ...snap.data() }
            if (data.latitude && data.longitude) {
              if (!cancelled) { setNearestBranch(data); setMapLoading(false) }
              return
            }
          }
        }
        if (restaurantId) {
          const branchesQuery = query(collection(db, 'branches'), where('restaurantId', '==', restaurantId), where('status', '==', 'active'), limit(5))
          const snap = await getDocs(branchesQuery)
          const docs = snap.docs.map((branchDoc) => ({ id: branchDoc.id, ...branchDoc.data() }))
          const withCoords = docs.find((branch) => branch.latitude && branch.longitude)
          if (!cancelled) setNearestBranch(withCoords || null)
        } else if (!cancelled) {
          setNearestBranch(null)
        }
      } catch (err) {
        console.error('خطأ في جلب إحداثيات الفرع:', err)
        if (!cancelled) setNearestBranch(null)
      } finally {
        if (!cancelled) setMapLoading(false)
      }
    }
    fetchBranch()
    return () => { cancelled = true }
  }, [selectedOffer])

  if (!selectedOffer) return null
  const offerDuration = selectedOffer.duration || 45
  const price = selectedOffer.price ?? selectedOffer.finalPrice ?? selectedOffer.discountedPrice ?? selectedOffer.newPrice ?? null
  const oldPrice = selectedOffer.oldPrice ?? selectedOffer.originalPrice ?? selectedOffer.beforePrice ?? null
  const branchName = nearestBranch?.name || nearestBranch?.address || selectedOffer.branch || selectedOffer.branchName || 'الفرع الرئيسي'
  const branchAddress = nearestBranch?.address || nearestBranch?.city || selectedOffer.branchAddress || selectedOffer.city || null

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
            </div>
          </div>
          {mapLoading
            ? <div className="h-32 bg-gray-100 rounded-xl flex items-center justify-center gap-2 text-gray-400">
                <div className="w-5 h-5 border-2 border-[#ee7b26] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">جاري تحميل الخريطة...</span>
              </div>
            : nearestBranch
              ? <BranchMap lat={nearestBranch.latitude} lng={nearestBranch.longitude} name={branchName} />
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
