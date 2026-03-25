import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
// ✅ إصلاح: Firebase modular بدل db.collection()
import { db } from '@r2c/shared'
import { doc, onSnapshot } from 'firebase/firestore'

// ✅ إصلاح: تعريف QrImage كان مفقوداً تماماً
function QrImage({ qrCode, size = 220 }) {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrCode)}`
    return (
        <img
            src={url}
            alt="QR Code"
            width={size}
            height={size}
            style={{ borderRadius: 12 }}
        />
    )
}

// ✅ إصلاح: playReadyNotification كان مفقوداً
function playReadyNotification(offerName) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const play = (freq, start, dur) => {
            const osc  = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.type      = 'sine'
            osc.frequency.value = freq
            gain.gain.setValueAtTime(0.3, ctx.currentTime + start)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
            osc.start(ctx.currentTime + start)
            osc.stop(ctx.currentTime + start + dur)
        }
        play(880, 0,    0.15)
        play(1100, 0.2, 0.15)
        play(1320, 0.4, 0.3)
    } catch { /* تجاهل إذا لم يكن AudioContext متاحاً */ }

    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('طلبك جاهز! 🎉', { body: offerName || 'توجه للكاشير الآن' })
    }
}

export default function SuccessScreen() {
    const { currentOrderId, selectedOffer, setCurrentScreen, setBottomNav, setCurrentOrderId } = useApp()
    const [orderData,      setOrderData]      = useState(null)
    const [timeRemaining,  setTimeRemaining]  = useState(null)
    const [delivered,      setDelivered]      = useState(false)
    const [isReady,        setIsReady]        = useState(false)
    const prevStatusRef = useRef(null)

    // مراقبة حالة الطلب في الوقت الفعلي — Firebase modular
    useEffect(() => {
        if (!currentOrderId) return
        const unsub = onSnapshot(doc(db, 'orders', currentOrderId), snap => {
            if (!snap.exists()) return
            const data   = snap.data()
            const status = data.status
            setOrderData(data)

            // تشغيل الصوت عند الانتقال إلى "جاهز" مرة واحدة فقط
            if (status === 'ready' && prevStatusRef.current !== 'ready' && prevStatusRef.current !== null) {
                playReadyNotification(data.offerName)
                setIsReady(true)
            }

            if (status === 'completed') {
                setDelivered(true)
                setIsReady(false)
                setTimeout(() => {
                    setCurrentOrderId(null)
                    setBottomNav('home')
                    setCurrentScreen('feed')
                }, 4000)
            }
            prevStatusRef.current = status

            // ضبط المؤقت
            if (data.acceptedAt && data.timeRemaining) {
                const elapsed   = Math.floor((Date.now() - new Date(data.acceptedAt).getTime()) / 1000)
                const remaining = Math.max(0, data.timeRemaining - elapsed)
                setTimeRemaining(remaining)
            } else if (data.timeRemaining) {
                setTimeRemaining(data.timeRemaining)
            }
        })
        return () => unsub()
    }, [currentOrderId])

    // العد التنازلي
    useEffect(() => {
        if (timeRemaining === null || delivered || timeRemaining <= 0) return
        const timer = setInterval(() => {
            setTimeRemaining(prev => prev > 0 ? prev - 1 : 0)
        }, 1000)
        return () => clearInterval(timer)
    }, [timeRemaining, delivered])

    const minutes = timeRemaining !== null ? Math.floor(timeRemaining / 60) : 0
    const seconds = timeRemaining !== null ? timeRemaining % 60 : 0

    // شاشة التسليم الناجح
    if (delivered) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center text-6xl text-white font-bold animate-bounce shadow-lg mb-8">✓</div>
                <h1 className="text-3xl font-bold text-green-600 mb-3">تم تسليم طلبك بنجاح! 🎉</h1>
                <p className="text-gray-500 mb-8">نتمنى لك وجبة شهية</p>
                <button
                    onClick={() => { setCurrentOrderId(null); setBottomNav('home'); setCurrentScreen('feed') }}
                    className="gradient-button text-white font-bold text-xl py-4 px-12 rounded-2xl"
                >
                    العودة للرئيسية
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white relative overflow-hidden">
            {[...Array(20)].map((_, i) => (
                <div
                    key={i}
                    className="confetti"
                    style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 3}s`,
                        background: i % 2 === 0 ? '#ee7b26' : '#d96b1a'
                    }}
                />
            ))}

            <div className="relative z-10 p-6 flex flex-col items-center justify-center min-h-screen pb-24">
                <div className="relative mb-6 mt-10">
                    <div className="w-28 h-28 bg-green-500 rounded-full flex items-center justify-center text-5xl text-white font-bold animate-bounce shadow-lg">✓</div>
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20" />
                </div>

                {isReady ? (
                    <>
                        <h1 className="text-3xl font-bold mb-2 text-center animate-bounce" style={{ color: '#10b981' }}>
                            🎉 طلبك جاهز الآن!
                        </h1>
                        <p className="mb-6 text-center font-bold text-lg" style={{ color: '#10b981' }}>
                            توجه للكاشير وأظهر له الكود
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className="text-3xl font-bold text-[#ee7b26] mb-2 text-center">تم قبول الطلب!</h1>
                        <p className="text-gray-500 mb-6 text-center font-bold">أظهر QR الكود للكاشير عند الاستلام</p>
                    </>
                )}

                {/* Timer */}
                {timeRemaining !== null && (
                    <div className={`border-2 rounded-2xl p-5 mb-6 w-full max-w-sm text-center ${timeRemaining <= 120 ? 'bg-red-50 border-red-400' : 'bg-[#ee7b26]/10 border-[#ee7b26]'}`}>
                        <div className={`text-5xl font-black font-mono tracking-wider ${timeRemaining <= 120 ? 'text-red-500' : 'text-[#ee7b26]'}`}>
                            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                        </div>
                        <div className="text-gray-600 font-bold mt-1 text-sm">الوقت المتبقي لصلاحية الكود</div>
                    </div>
                )}

                {/* QR Code */}
                <div
                    className="qr-container mb-6 shadow-md rounded-3xl p-4"
                    style={{
                        border: `4px solid ${isReady ? '#10b981' : '#ee7b26'}`,
                        boxShadow: isReady ? '0 0 30px rgba(16,185,129,0.4)' : '0 4px 20px rgba(238,123,38,0.2)',
                        transition: 'all 0.5s ease',
                    }}
                >
                    {orderData?.qrCode ? (
                        <QrImage qrCode={orderData.qrCode} size={220} />
                    ) : (
                        <div style={{ width: 220, height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                            <div className="spinner" style={{ width: 40, height: 40 }} />
                            <p style={{ fontSize: 13, color: '#9ca3af', fontWeight: 600 }}>في انتظار قبول الفرع...</p>
                        </div>
                    )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-4 text-center max-w-sm">
                    <p className="text-amber-800 font-bold text-sm">⚠️ لن يُسلَّم الطلب إلا بعد مسح هذا الكود من قِبَل الكاشير</p>
                </div>

                {selectedOffer && (
                    <div className="bg-gray-50 rounded-2xl p-4 w-full max-w-md mb-4 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <span className="text-[#ee7b26] text-3xl">📍</span>
                            <div>
                                <div className="font-bold">{selectedOffer.name} - {selectedOffer.branch || 'الفرع الرئيسي'}</div>
                                {selectedOffer.branchAddress && (
                                    <div className="text-sm text-gray-500">{selectedOffer.branchAddress}</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => { setCurrentOrderId(null); setBottomNav('home'); setCurrentScreen('feed') }}
                    className="mt-4 text-gray-500 font-bold underline mb-10 hover:text-gray-800"
                >
                    العودة للرئيسية
                </button>
            </div>
        </div>
    )
}
