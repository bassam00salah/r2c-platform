/**
 * ConfirmOrderScreen — مُصلَح
 *
 * الإصلاحات:
 *  1. [أمان]   إنشاء الطلب عبر createOrder Cloud Function (السعر server-side)
 *  2. [جودة]   إزالة alert() واستبدالها بـ UI مدمج
 *  3. [جودة]   معالجة أخطاء Rate Limit بشكل واضح للمستخدم
 */

import { useState, useEffect } from 'react'
import { useApp } from '../contexts'
import { functions } from '@r2c/shared'
import { httpsCallable } from 'firebase/functions'
import { db } from '@r2c/shared'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { haversineKm } from '@r2c/shared'
import OfferImage from '../components/OfferImage'

export default function ConfirmOrderScreen() {
  const { selectedOffer, setCurrentScreen, userLocation, setUserLocation, setCurrentOrderId } = useApp()
  const [needsLocation,  setNeedsLocation]  = useState(false)
  const [locating,       setLocating]       = useState(false)
  const [assignedBranch, setAssignedBranch] = useState(null)
  const [loadingBranch,  setLoadingBranch]  = useState(false)
  const [submitting,     setSubmitting]     = useState(false)
  const [errorMsg,       setErrorMsg]       = useState('')  // [إصلاح] بدلاً من alert()
  const MAX_BRANCH_DISTANCE_KM = 100

  useEffect(() => {
    if (!userLocation || !selectedOffer?.restaurantId) return
    setLoadingBranch(true)

    const q = query(
      collection(db, 'branches'),
      where('restaurantId', '==', selectedOffer.restaurantId),
      where('status', '==', 'active')
    )

    getDocs(q).then(snap => {
      let minDist = Infinity, nearest = null
      snap.forEach(branchDoc => {
        const b = branchDoc.data()
        if (b.latitude && b.longitude) {
          const d = haversineKm(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
          if (d < minDist) { minDist = d; nearest = { id: branchDoc.id, ...b, distanceKm: d } }
        }
      })
      setAssignedBranch(
        nearest && nearest.distanceKm <= MAX_BRANCH_DISTANCE_KM
          ? { ...nearest, distanceLabel: nearest.distanceKm.toFixed(1) + ' كم' }
          : null
      )
      setLoadingBranch(false)
    }).catch(() => setLoadingBranch(false))
  }, [userLocation, selectedOffer?.restaurantId])

  useEffect(() => {
    if (needsLocation && userLocation) setNeedsLocation(false)
  }, [needsLocation, userLocation])

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
    if (!assignedBranch) { setNeedsLocation(true); return }

    setSubmitting(true)
    try {
      // [إصلاح الأمان] الطلب يُنشأ عبر Cloud Function — السعر يأتي من Firestore
      const createOrder = httpsCallable(functions, 'createOrder')
      const result = await createOrder({
        offerId:  selectedOffer.id,
        branchId: assignedBranch.id,
        userLat:  userLocation?.lat || null,
        userLng:  userLocation?.lng || null,
      })

      setCurrentOrderId(result.data.orderId)
      setCurrentScreen('waiting')
    } catch (error) {
      // [إصلاح الجودة] رسائل خطأ واضحة بدلاً من alert()
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

  return (
    <div className="min-h-screen bg-white p-6 pb-24">
      <h1 className="text-2xl font-bold mb-4">تأكيد الطلب</h1>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4">
        <OfferImage offer={selectedOffer} />
        <div className="p-4">
          <h2 className="text-xl font-bold mb-1">{selectedOffer.name}</h2>
          <p className="text-gray-500 text-sm">{selectedOffer.restaurantName || selectedOffer.restaurant}</p>
          <p className="text-[#ee7b26] font-black mt-2">{selectedOffer.price ?? selectedOffer.finalPrice} ر.س</p>
        </div>
      </div>

      {/* [إصلاح] رسالة خطأ UI بدلاً من alert() */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 text-center">
          <p className="text-red-700 font-bold text-sm">{errorMsg}</p>
          <button
            onClick={() => setErrorMsg('')}
            className="text-red-500 text-xs underline mt-1"
          >
            إغلاق
          </button>
        </div>
      )}

      {needsLocation && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <p className="text-amber-800 font-bold mb-3">نحتاج موقعك لتحديد أقرب فرع مناسب</p>
          <button
            onClick={requestLocationAndRetry}
            className="w-full py-3 rounded-xl text-white font-bold"
            style={{ background: '#ee7b26' }}
          >
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

      <button
        onClick={handleConfirm}
        disabled={loadingBranch || !assignedBranch || submitting}
        className="w-full py-4 rounded-2xl text-white font-black text-lg disabled:opacity-50"
        style={{ background: '#ee7b26' }}
      >
        {submitting     ? '⏳ جاري إنشاء الطلب...'
         : loadingBranch ? '⏳ جاري تحديد الفرع...'
         : !assignedBranch && !needsLocation ? '⚠️ لا يوجد فرع قريب'
         : 'تأكيد الطلب'}
      </button>
    </div>
  )
}
