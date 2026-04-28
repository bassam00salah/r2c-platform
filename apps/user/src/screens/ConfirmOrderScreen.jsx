import { useState, useEffect } from 'react'
import { useApp } from '../contexts'
import { functions, db, haversineKm } from '@r2c/shared'
import OfferImage from '../components/OfferImage'
import { httpsCallable } from 'firebase/functions'
import { collection, query, where, getDocs } from 'firebase/firestore'

const HERO_HEADER_OVERLAP = 'var(--r2c-header-height, 64px)'
const HERO_SAFE_TOP = 'var(--r2c-statusbar-space-active, 0px)'
const CONFIRM_HERO_BASE_HEIGHT = 340
// زيادة بسيطة تمنع ظهور أي شريط أبيض فوق الصورة داخل localhost/Android،
// وتضمن أن الصورة تبدأ من خلف الهيدر مباشرة مثل OfferDetailsScreen.
const CONFIRM_HERO_TOP_PULL = 36
const CONFIRM_HERO_HEIGHT = `calc(${CONFIRM_HERO_BASE_HEIGHT}px + ${HERO_HEADER_OVERLAP} + ${HERO_SAFE_TOP} + ${CONFIRM_HERO_TOP_PULL}px)`

export default function ConfirmOrderScreen() {
  const { selectedOffer, setCurrentScreen, userLocation, setUserLocation, setCurrentOrderId } = useApp()
  const [needsLocation, setNeedsLocation] = useState(false)
  const [locating, setLocating] = useState(false)
  const [assignedBranch, setAssignedBranch] = useState(null)
  const [loadingBranch, setLoadingBranch] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const MAX_BRANCH_DISTANCE_KM = 100


  // نفس سلوك OfferDetailsScreen: ابدأ من أعلى الشاشة حتى لا يظهر جزء أبيض قبل صورة الـ Hero.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadBranch() {
      if (!userLocation || !selectedOffer?.restaurantId) {
        if (!cancelled) {
          setAssignedBranch(null)
          setLoadingBranch(false)
        }
        return
      }
      setLoadingBranch(true)
      try {
        const q = query(collection(db, 'branches'), where('restaurantId', '==', selectedOffer.restaurantId), where('status', '==', 'active'))
        const snap = await getDocs(q)
        let minDist = Infinity
        let nearest = null
        snap.forEach((branchDoc) => {
          const branchData = branchDoc.data()
          if (branchData.latitude && branchData.longitude) {
            const distance = haversineKm(userLocation.lat, userLocation.lng, branchData.latitude, branchData.longitude)
            if (distance < minDist) {
              minDist = distance
              nearest = { id: branchDoc.id, ...branchData, distanceKm: distance }
            }
          }
        })
        if (!cancelled) {
          setAssignedBranch(nearest && nearest.distanceKm <= MAX_BRANCH_DISTANCE_KM ? { ...nearest, distanceLabel: `${nearest.distanceKm.toFixed(1)} كم` } : null)
        }
      } catch {
        if (!cancelled) setAssignedBranch(null)
      } finally {
        if (!cancelled) setLoadingBranch(false)
      }
    }
    loadBranch()
    return () => { cancelled = true }
  }, [userLocation, selectedOffer?.restaurantId])

  const requestLocationAndRetry = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
        setNeedsLocation(false)
      },
      () => {
        setLocating(false)
        setErrorMsg('يرجى السماح بالموقع من إعدادات المتصفح ثم المحاولة مجدداً.')
      },
      { enableHighAccuracy: true }
    )
  }

  if (!selectedOffer) return null

  const handleConfirm = async () => {
    setErrorMsg('')
    if (!assignedBranch) {
      setNeedsLocation(true)
      return
    }
    setSubmitting(true)
    try {
      const createOrder = httpsCallable(functions, 'createOrder')
      const result = await createOrder({ offerId: selectedOffer.id, branchId: assignedBranch.id, userLat: userLocation?.lat || null, userLng: userLocation?.lng || null })
      const newOrderId = result.data.orderId
      setCurrentOrderId(newOrderId)
      try { localStorage.setItem('r2c_current_order_id', newOrderId) } catch {}
      setCurrentScreen('waiting')
    } catch (error) {
      const code = error?.code || ''
      if (code.includes('resource-exhausted')) {
        setErrorMsg(error.message || 'يرجى الانتظار قليلاً قبل إنشاء طلب جديد.')
      } else if (code.includes('failed-precondition')) {
        setErrorMsg('هذا العرض أو الفرع غير متاح حالياً.')
      } else if (code.includes('unauthenticated')) {
        setCurrentScreen('auth')
      } else {
        setErrorMsg('حدث خطأ في إنشاء الطلب. حاول مرة أخرى.')
      }
      setSubmitting(false)
    }
  }

  const price = selectedOffer.price ?? selectedOffer.finalPrice
  const restaurantName = selectedOffer.restaurantName || selectedOffer.restaurant

  return (
    <div className="min-h-screen bg-white pb-24 overflow-x-hidden">
      <style>{`
        .confirm-order-hero-media,
        .confirm-order-hero-media > *,
        .confirm-order-hero-media img,
        .confirm-order-hero-media video {
          width: 100%;
          height: 100%;
        }

        .confirm-order-hero-media img,
        .confirm-order-hero-media video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          display: block;
          transform: scale(1.08);
          transform-origin: center center;
        }
      `}</style>

      {/* صورة العرض بنفس منطق الـ Hero في OfferDetailsScreen و RestaurantProfileScreen */}
      <div
        className="relative overflow-visible"
        style={{
          // ارفع الصورة خلف الهيدر العام + مساحة شريط الحالة في الهاتف.
          // أضفنا CONFIRM_HERO_TOP_PULL حتى لا تظهر أي مساحة بيضاء فوق الصورة في localhost أو Android.
          marginTop: `calc(-1 * (${HERO_HEADER_OVERLAP} + ${HERO_SAFE_TOP} + ${CONFIRM_HERO_TOP_PULL}px))`,
          height: CONFIRM_HERO_HEIGHT,
        }}
      >
        <div className="confirm-order-hero-media absolute inset-0 overflow-hidden bg-gray-100" style={{ height: '100%' }}>
          <OfferImage offer={selectedOffer} size="large" />
        </div>

        {/* تدرج خفيف خلف الهيدر حتى تظهر أيقونات الهيدر وأيقونات الهاتف فوق الصورة بوضوح */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: `calc(${HERO_HEADER_OVERLAP} + ${HERO_SAFE_TOP} + ${CONFIRM_HERO_TOP_PULL}px + 96px)`,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 100%)',
            zIndex: 2,
          }}
        />
      </div>

      <div className="relative z-10 px-6 -mt-12">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-4 mb-4">
          <h2 className="text-xl font-bold mb-1">{selectedOffer.name}</h2>
          <p className="text-gray-500 text-sm">{restaurantName}</p>
          <p className="text-[#ee7b26] font-black mt-2">{price} ر.س</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 text-center">
            <p className="text-red-700 font-bold text-sm">{errorMsg}</p>
            <button onClick={() => setErrorMsg('')} className="text-red-500 text-xs underline mt-1">إغلاق</button>
          </div>
        )}

        {needsLocation && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <p className="text-amber-800 font-bold mb-3">نحتاج موقعك لتحديد أقرب فرع مناسب</p>
            <button onClick={requestLocationAndRetry} className="w-full py-3 rounded-xl text-white font-bold" style={{ background: '#ee7b26' }}>
              {locating ? 'جاري تحديد الموقع...' : 'تحديد موقعي الآن'}
            </button>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6">
          <div className="font-bold mb-2">الفرع المحدد</div>
          {loadingBranch ? (
            <p className="text-gray-500">جاري تحديد الفرع المناسب...</p>
          ) : assignedBranch ? (
            <div>
              <p className="font-bold">{assignedBranch.name || 'الفرع الرئيسي'}</p>
              <p className="text-gray-500 text-sm">{assignedBranch.address || 'بدون عنوان'}</p>
              <p className="text-[#ee7b26] text-sm font-bold mt-1">يبعد عنك {assignedBranch.distanceLabel}</p>
            </div>
          ) : (
            <p className="text-red-500 font-bold">لا يوجد فرع نشط قريب منك حالياً</p>
          )}
        </div>

        <button onClick={handleConfirm} disabled={loadingBranch || !assignedBranch || submitting} className="w-full py-4 rounded-2xl text-white font-black text-lg disabled:opacity-50" style={{ background: '#ee7b26' }}>
          {submitting ? '⏳ جاري إنشاء الطلب...' : loadingBranch ? '⏳ جاري تحديد الفرع...' : !assignedBranch && !needsLocation ? '⚠️ لا يوجد فرع قريب' : 'تأكيد الطلب'}
        </button>
      </div>
    </div>
  )
}
