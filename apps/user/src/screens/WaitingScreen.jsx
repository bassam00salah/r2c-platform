import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { auth, db, functions } from '@r2c/shared'
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

export default function WaitingScreen() {
    const { currentOrderId, setCurrentScreen } = useApp()
    const [countdown, setCountdown] = useState(45)
    const [timedOut, setTimedOut]   = useState(false)
    const orderResolvedRef          = useRef(false)

    useEffect(() => {
        if (!currentOrderId) return
        const unsub = onSnapshot(doc(db, 'orders', currentOrderId), snap => {
            if (!snap.exists()) return
            const status = snap.data().status
            if (status === 'accepted') {
                orderResolvedRef.current = true
                setTimedOut(true)
                setCurrentScreen('success')
            } else if (status === 'rejected') {
                orderResolvedRef.current = true
                setTimedOut(true)
                setCurrentScreen('offerDetails')
                alert('❌ عذراً، رفض الفرع طلبك. يمكنك المحاولة مرة أخرى.')
            }
        })
        return () => unsub()
    }, [currentOrderId])

    useEffect(() => {
        if (timedOut) return
        if (countdown <= 0) {
            setTimedOut(true)
            if (currentOrderId && !orderResolvedRef.current) {
                const cancelFn = httpsCallable(functions, 'cancelOrderOnTimeout')
                cancelFn({ orderId: currentOrderId }).catch(() => {})
            }
            return
        }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000)
        return () => clearTimeout(t)
    }, [countdown, timedOut, currentOrderId])

    const handleCancel = async () => {
        const currentUser = auth.currentUser
        if (currentOrderId && currentUser) {
            try {
                const orderRef  = doc(db, 'orders', currentOrderId)
                const orderSnap = await getDoc(orderRef)
                if (orderSnap.exists() && orderSnap.data().userId === currentUser.uid) {
                    await updateDoc(orderRef, {
                        status:         'rejected',
                        rejectedAt:     new Date().toISOString(),
                        rejectedReason: 'user_cancelled'
                    })
                }
            } catch { /* تجاهل */ }
        }
        setCurrentScreen('offerDetails')
    }

    if (timedOut) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="text-8xl mb-6">⏱</div>
                <h1 className="text-2xl font-bold text-red-500 mb-3">انتهت مهلة انتظار الفرع</h1>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    لم يستجب الفرع خلال الوقت المحدد.<br/>يمكنك المحاولة مرة أخرى.
                </p>
                <button
                    onClick={() => setCurrentScreen('offerDetails')}
                    className="gradient-button text-white font-bold text-xl py-4 px-10 rounded-2xl w-full max-w-sm"
                >
                    العودة والمحاولة مجدداً
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
            <div className="mb-8">
                <div style={{fontSize:80}}>🍽️</div>
            </div>
            <h1 className="text-3xl font-bold mb-4 text-center">في انتظار قبول الفرع...</h1>
            <p className="text-gray-500 text-center mb-6">جاري التواصل مع الفرع لتأكيد طلبك</p>

            <div className={`border-2 rounded-2xl px-10 py-5 mb-8 text-center ${countdown <= 15 ? 'bg-red-50 border-red-400' : 'bg-[#ee7b26]/10 border-[#ee7b26]'}`}>
                <div className={`text-5xl font-black font-mono tracking-wider ${countdown <= 15 ? 'text-red-500' : 'text-[#ee7b26]'}`}>
                    {String(Math.floor(countdown / 60)).padStart(2,'0')}:{String(countdown % 60).padStart(2,'0')}
                </div>
                <div className="text-gray-500 font-semibold text-sm mt-1">الوقت المتبقي للانتظار</div>
            </div>

            <div className="spinner mb-8 mx-auto" />
            <p className="text-xs text-gray-400 text-center mb-6">سيظهر QR الكود فور قبول الفرع لطلبك</p>

            <button
                onClick={handleCancel}
                className="text-gray-400 font-semibold text-sm underline hover:text-gray-600"
            >
                إلغاء الطلب
            </button>
        </div>
    )
}
