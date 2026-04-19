import { useState, useEffect, useRef } from 'react'
import { useApp } from '../contexts'
import { db, functions } from '@r2c/shared'
import { doc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

const COUNTDOWN_SECONDS = 20

export default function WaitingScreen() {
  const { currentOrderId, setCurrentScreen, user } = useApp()
  const [countdown, setCountdown]   = useState(COUNTDOWN_SECONDS)
  const [phase, setPhase]           = useState('waiting')
  const [cancelling, setCancelling] = useState(false)
  const orderResolvedRef            = useRef(false)

  // ── مستمع Firestore ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentOrderId) return
    const unsub = onSnapshot(doc(db, 'orders', currentOrderId), (snap) => {
      if (!snap.exists()) return
      const status = snap.data().status
      if (status === 'accepted') {
        orderResolvedRef.current = true
        setCurrentScreen('success')
      } else if (status === 'rejected') {
        orderResolvedRef.current = true
        setPhase('rejected')
      } else if (status === 'cancelled') {
        orderResolvedRef.current = true
        setCurrentScreen('feed')
      }
    })
    return () => unsub()
  }, [currentOrderId, setCurrentScreen])

  // ── العداد ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'waiting') return
    if (countdown <= 0) {
      if (!orderResolvedRef.current && currentOrderId) {
        setPhase('auto_accepting')
        httpsCallable(functions, 'autoAcceptOrder')({ orderId: currentOrderId })
          .catch(() => setCurrentScreen('success'))
      }
      return
    }
    const t = setTimeout(() => setCountdown(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, phase, currentOrderId, setCurrentScreen])

  // ── إلغاء الطلب ─────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!currentOrderId || !user?.uid || cancelling) return
    setCancelling(true)
    try {
      // ننتظر تأكيد الإلغاء من السيرفر أولاً قبل الانتقال
      await httpsCallable(functions, 'cancelOrderOnTimeout')({ orderId: currentOrderId })
    } catch (err) {
      console.error('cancel error:', err)
    }
    // ننتقل للـ feed بغض النظر عن نجاح أو فشل الـ function
    setCurrentScreen('feed')
  }

  // ── شاشة الرفض ──────────────────────────────────────────────────────────
  if (phase === 'rejected') return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="text-8xl mb-6">❌</div>
      <h1 className="text-2xl font-bold text-red-500 mb-3">تم رفض الطلب</h1>
      <p className="text-gray-500 mb-8 leading-relaxed">عذراً، رفض الفرع طلبك. يمكنك المحاولة مرة أخرى.</p>
      <button onClick={() => setCurrentScreen('offerDetails')}
        className="w-full max-w-sm py-4 rounded-2xl text-white font-black text-xl mb-3"
        style={{ background: '#ee7b26' }}>
        العودة والمحاولة مجدداً
      </button>
      <button onClick={() => setCurrentScreen('feed')}
        style={{ background: '#f3f4f6', border: 'none', cursor: 'pointer', color: '#374151', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', padding: '10px 24px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto' }}>
        <span>🏠</span><span>الرئيسية</span>
      </button>
    </div>
  )

  // ── شاشة القبول التلقائي ────────────────────────────────────────────────
  if (phase === 'auto_accepting') return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="text-8xl mb-6">⏳</div>
      <h1 className="text-2xl font-bold text-[#ee7b26] mb-3">جاري قبول طلبك تلقائياً...</h1>
      <p className="text-gray-500 mb-8 leading-relaxed">
        لم يستجب الفرع خلال {COUNTDOWN_SECONDS} ثانية.<br />
        سيتم قبول طلبك تلقائياً، يرجى الانتظار.
      </p>
      <div className="spinner mx-auto" />
    </div>
  )

  // ── شاشة الانتظار ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="mb-8"><div style={{ fontSize: 80 }}>🍽️</div></div>
      <h1 className="text-3xl font-bold mb-4 text-center">في انتظار قبول الفرع...</h1>
      <p className="text-gray-500 text-center mb-6">جاري التواصل مع الفرع لتأكيد طلبك</p>

      <div className={`border-2 rounded-2xl px-10 py-5 mb-8 text-center ${countdown <= 10 ? 'bg-red-50 border-red-400' : 'bg-[#ee7b26]/10 border-[#ee7b26]'}`}>
        <div className={`text-5xl font-black font-mono tracking-wider ${countdown <= 10 ? 'text-red-500' : 'text-[#ee7b26]'}`}>
          {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
        </div>
        <div className="text-gray-500 font-semibold text-sm mt-1">الوقت المتبقي للانتظار</div>
      </div>

      <div className="spinner mb-8 mx-auto" />
      <p className="text-xs text-gray-400 text-center mb-6">سيظهر QR الكود فور قبول الفرع لطلبك</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          style={{
            background: 'none', border: 'none',
            cursor: cancelling ? 'not-allowed' : 'pointer',
            color: cancelling ? '#d1d5db' : '#ef4444',
            fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
            textDecoration: 'underline', opacity: cancelling ? 0.6 : 1,
          }}>
          {cancelling ? 'جاري الإلغاء...' : 'إلغاء الطلب'}
        </button>
        <span style={{ color: '#e5e7eb' }}>|</span>
        <button onClick={() => setCurrentScreen('feed')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>🏠</span><span>الرئيسية</span>
        </button>
      </div>
    </div>
  )
}
