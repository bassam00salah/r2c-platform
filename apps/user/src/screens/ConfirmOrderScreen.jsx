import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { auth, db } from '@r2c/shared'
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { haversineKm } from '@r2c/shared'
import { ORDER_STATUS } from '@r2c/shared/constants/orderStatus'
import OfferImage from '../components/OfferImage'

export default function ConfirmOrderScreen() {
    const { selectedOffer, setCurrentScreen, userLocation, setUserLocation, setCurrentOrderId } = useApp()
    const [needsLocation,  setNeedsLocation]  = useState(false)
    const [locating,       setLocating]       = useState(false)
    const [assignedBranch, setAssignedBranch] = useState(null)
    const [loadingBranch,  setLoadingBranch]  = useState(false)
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
            if (nearest && nearest.distanceKm <= MAX_BRANCH_DISTANCE_KM) {
                setAssignedBranch({ ...nearest, distanceLabel: nearest.distanceKm.toFixed(1) + ' كم' })
            } else {
                setAssignedBranch(null)
            }
            setLoadingBranch(false)
        }).catch(e => { console.warn('branch fetch error:', e); setLoadingBranch(false) })
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
                alert('❌ يرجى السماح بالموقع من إعدادات المتصفح ثم المحاولة مجدداً.')
            },
            { enableHighAccuracy: true }
        )
    }

    if (!selectedOffer) return null

    const handleConfirm = async () => {
        try {
            const currentUser = auth.currentUser
            if (!currentUser) {
                alert('❌ انتهت جلسة تسجيل دخولك. يرجى تسجيل الدخول مجدداً.')
                setCurrentScreen('auth')
                return
            }
            if (!assignedBranch) { setNeedsLocation(true); return }

            const newOrderRef = doc(collection(db, 'orders'))
            const orderId = newOrderRef.id

            const newOrder = {
                userId:         currentUser.uid,
                offerId:        selectedOffer.id,
                offerName:      selectedOffer.name,
                restaurantId:   selectedOffer.restaurantId || selectedOffer.id,
                restaurantName: selectedOffer.restaurant || selectedOffer.restaurantName,
                branchId:       assignedBranch.id,
                branch:         assignedBranch.name || 'الفرع الرئيسي',
                branchAddress:  assignedBranch.address || '',
                distanceToUser: assignedBranch.distanceLabel,
                userLat:        userLocation?.lat || null,
                userLng:        userLocation?.lng || null,
                price:          selectedOffer.price || selectedOffer.finalPrice,
                discount:       selectedOffer.discount,
                city:           selectedOffer.city,
                status:         ORDER_STATUS.PENDING,
                qrCode:         orderId,
                orderCode:      orderId.slice(-6).toUpperCase(),
                timeRemaining:  (selectedOffer.duration || 45) * 60,
                createdAt:      serverTimestamp(),
                updatedAt:      serverTimestamp(),
            }

            await setDoc(newOrderRef, newOrder)
            setCurrentOrderId(orderId)
            setCurrentScreen('waiting')
        } catch (error) {
            console.error('❌ Error creating order:', error)
            alert('حدث خطأ في إنشاء الطلب: ' + error.message)
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
                    <p className="text-[#ee7b26] font-black mt-2">{selectedOffer.price || selectedOffer.finalPrice} ر.س</p>
                </div>
            </div>

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

            <button
                onClick={handleConfirm}
                disabled={loadingBranch || !assignedBranch}
                className="w-full py-4 rounded-2xl text-white font-black text-lg disabled:opacity-50"
                style={{ background: '#ee7b26' }}
            >
                {loadingBranch ? '⏳ جاري تحديد الفرع...' : !assignedBranch && !needsLocation ? '⚠️ لا يوجد فرع قريب' : 'تأكيد الطلب'}
            </button>
        </div>
    )
}
