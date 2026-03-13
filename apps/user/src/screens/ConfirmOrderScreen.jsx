import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { auth, db } from '@shared/firebase/config'
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { haversineKm } from '@shared/utils/haversine'
import OfferImage from '../components/OfferImage'

export default function ConfirmOrderScreen() {
    const { selectedOffer, setCurrentScreen, user, userLocation, setUserLocation, setCurrentOrderId } = useApp()
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
            snap.forEach(doc => {
                const b = doc.data()
                if (b.latitude && b.longitude) {
                    const d = haversineKm(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
                    if (d < minDist) { minDist = d; nearest = { id: doc.id, ...b, distanceKm: d } }
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
    }, [userLocation])

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

    const offerDuration = selectedOffer.duration || 45

    const handleConfirm = async () => {
        try {
            const currentUser = auth.currentUser
            if (!currentUser) {
                alert('❌ انتهت جلسة تسجيل دخولك. يرجى تسجيل الدخول مجدداً.')
                setCurrentScreen('auth')
                return
            }
            if (!assignedBranch) { setNeedsLocation(true); return }

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
                status:         'preparing',
                qrCode:         (() => { const a = new Uint8Array(16); crypto.getRandomValues(a); return 'QR-' + Array.from(a, b => b.toString(16).padStart(2,'0')).join('').toUpperCase() })(),
                timeRemaining:  (selectedOffer.duration || 45) * 60,
                createdAt:      new Date().toISOString(),
                timestamp:      serverTimestamp()
            }

            const docRef = await addDoc(collection(db, 'orders'), newOrder)
            setCurrentOrderId(docRef.id)
            setCurrentScreen('waiting')
        } catch (error) {
            console.error('❌ Error creating order:', error)
            alert('حدث خطأ في إنشاء الطلب: ' + error.message)
        }
    }

    return (
        <div className="min-h-screen bg-white p-6">
            <div className="mb-8">
                <button onClick={() => setCurrentScreen('offerDetails')} className="text-gray-900 text-2xl mb-4">←</button>
                <h1 className="text-3xl font-bold text-[#ee7b26] text-center">تأكيد الطلب</h1>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                <h3 className="font-bold mb-4">ملخص الطلب</h3>
                <div className="flex gap-4 mb-4">
                    <div className="relative w-24 h-24 bg-gradient-to-br from-orange-900/20 to-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                        <OfferImage offer={selectedOffer} size="small" />
                        <div className="absolute -top-2 -right-2">
                            <div className="discount-badge text-xs px-2 py-1">{selectedOffer.discount}%</div>
                        </div>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1">{selectedOffer.name}</h4>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                            <span>🏪</span><span>{selectedOffer.restaurant}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-[#ee7b26] text-2xl font-bold">{selectedOffer.price} ريال</span>
                            {selectedOffer.oldPrice && (
                                <span className="text-gray-500 text-sm line-through">{selectedOffer.oldPrice} ريال</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#ee7b26]/10 border border-[#ee7b26]/30 rounded-xl p-4 mb-6 flex items-start gap-3">
                <span className="text-[#ee7b26] text-2xl">⚠️</span>
                <span className="text-[#ee7b26] font-bold">سيكون الطلب صالح لمدة {offerDuration} دقيقة بعد قبول الفرع</span>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                <h3 className="font-bold mb-4">الفرع المُعيَّن لطلبك</h3>
                {loadingBranch ? (
                    <div className="flex items-center gap-3 py-2">
                        <div className="spinner" style={{width:28,height:28,borderWidth:3}} />
                        <span className="text-gray-400 font-semibold">جاري تحديد أقرب فرع...</span>
                    </div>
                ) : assignedBranch ? (
                    <>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-[#ee7b26] text-3xl">📍</span>
                            <div>
                                <div className="font-bold text-lg">{assignedBranch.name || 'الفرع الرئيسي'}</div>
                                <div className="text-sm text-gray-500">{assignedBranch.address}</div>
                                <div className="text-sm font-bold mt-0.5" style={{color:'#10b981'}}>🧭 على بُعد {assignedBranch.distanceLabel}</div>
                            </div>
                        </div>
                        <div className="h-28 bg-gray-100 rounded-xl flex items-center justify-center">
                            <span className="text-[#ee7b26] text-5xl">🗺️</span>
                        </div>
                    </>
                ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-2">⚠️</div>
                        <p className="font-bold text-red-700">لا يوجد فرع في نطاق 100كم من موقعك</p>
                        <p className="text-red-400 text-sm mt-1">جرب تغيير موقعك أو تواصل معنا</p>
                    </div>
                )}
            </div>

            {needsLocation && (
                <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-5 mb-5 text-center">
                    <div className="text-4xl mb-2">📍</div>
                    <p className="font-bold text-red-700 text-lg mb-1">يجب تحديد موقعك أولاً</p>
                    <p className="text-red-500 text-sm mb-4">نحتاج موقعك لتوجيه طلبك للفرع الأقرب إليك</p>
                    <button
                        onClick={requestLocationAndRetry}
                        disabled={locating}
                        className="gradient-button text-white font-bold text-base py-3 px-8 rounded-xl w-full"
                    >
                        {locating ? '⏳ جاري تحديد موقعك...' : '📍 السماح بالموقع والمتابعة'}
                    </button>
                </div>
            )}

            <button
                onClick={handleConfirm}
                disabled={needsLocation || loadingBranch || !assignedBranch}
                className={`font-bold text-xl py-4 rounded-2xl w-full transition-transform ${needsLocation || loadingBranch || !assignedBranch ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'gradient-button text-white'}`}
            >
                {loadingBranch ? '⏳ جاري تحديد الفرع...' : !assignedBranch && !needsLocation ? '⚠️ لا يوجد فرع قريب' : 'تأكيد الطلب'}
            </button>
        </div>
    )
}
