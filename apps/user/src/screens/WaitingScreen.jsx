import { useState, useEffect, useRef } from 'react'
import { useApp } from '../contexts'
import { db, functions } from '@r2c/shared'
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

const COUNTDOWN_SECONDS = 20
const STORAGE_KEY = 'r2c_current_order_id'

export default function WaitingScreen() {
  const { currentOrderId, setCurrentOrderId, setCurrentScreen, user } = useApp()
  const [countdown, setCountdown]     = useState(COUNTDOWN_SECONDS)
  const [phase, setPhase]             = useState('waiting')
  const [cancelling, setCancelling]   = useState(false)
  const [cancelError, setCancelError] = useState(null)
  const orderResolvedRef              = useRef(false)
  const orderIdRef                    = useRef(null)

  // ── حفظ orderId في ref دائماً محدَّث ──────────────────────────────────────
  useEffect(() => {
    if (currentOrderId) {
      orderIdRef.current = currentOrderId
      try { localStorage.setItem(STORAGE_KEY, currentOrderId) } catch {}
    } else {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) orderIdRef.current = saved
      } catch {}
    }
  }, [currentOrderId])

  const getOrderId = () => {
    try {
      return orderIdRef.current || currentOrderId || localStorage.getItem(STORAGE_KEY)
    } catch {
      return orderIdRef.current || currentOrderId
    }
  }

  const clearOrderId = () => {
    orderIdRef.current = null
    setCurrentOrderId(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  // ── مستمع Firestore ──────────────────────────────────────────────────────
  useEffect(() => {
    const oid = getOrderId()
    if (!oid) return
    const unsub = onSnapshot(doc(db, 'orders', oid), (snap) => {
      if (!snap.exists()) return
      const status = snap.data().status
      if (status === 'accepted') {
        orderResolvedRef.current = true
        // ❌ لا نمسح orderId هنا — SuccessScreen تحتاجه لعرض QR والبيانات
        setCurrentScreen('success')
      } else if (status === 'rejected') {
        orderResolvedRef.current = true
        clearOrderId()
        setPhase('rejected')
      } else if (status === 'cancelled') {
        orderResolvedRef.current = true
        clearOrderId()
        setCurrentScreen('feed')
      }
    })
    return () => unsub()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrderId])

  // ── العداد ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'waiting') return
    if (countdown <= 0) {
      const oid = getOrderId()
      if (!orderResolvedRef.current && oid) {
        setPhase('auto_accepting')
        httpsCallable(functions, 'autoAcceptOrder')({ orderId: oid })
          .catch(() => setCurrentScreen('success'))
      }
      return
    }
    const t = setTimeout(() => setCountdown(v => v - 1), 1000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, phase])

  // ── إلغاء الطلب ──────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (cancelling) return
    const oid = getOrderId()

    if (!oid) {
      setCancelError('لم يتم العثور على رقم الطلب.')
      return
    }

    setCancelling(true)
    setCancelError(null)

    // ── المحاولة الأولى: Firestore مباشرة (أسرع وأبسط) ──────────────────────
    try {
      await updateDoc(doc(db, 'orders', oid), {
        status: 'cancelled',
        cancelReason: 'user_cancelled',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      // الـ onSnapshot سيلتقط التغيير ويغير الشاشة تلقائياً
      return
    } catch (fsErr) {
      console.warn('R2C: Firestore direct cancel failed, trying Function...', fsErr?.code)
    }

    // ── المحاولة الثانية: Cloud Function كـ fallback ─────────────────────────
    try {
      const result = await httpsCallable(functions, 'cancelOrderOnTimeout')({ orderId: oid })

      if (result?.data?.cancelled === true) {
        clearOrderId()
        setCurrentScreen('feed')
        return
      }

      const st = result?.data?.status
      if (st === 'ready' || st === 'completed') {
        setCancelError('لا يمكن إلغاء الطلب بعد تجهيزه.')
      } else {
        setCancelError('لم يتم الإلغاء، أعد المحاولة.')
      }

    } catch (fnErr) {
      const code = fnErr?.code || ''
      console.error('R2C: Function cancel error:', code, fnErr?.message)

      if (code === 'functions/unauthenticated') {
        setCancelError('انتهت جلستك. أعد تسجيل الدخول.')
      } else if (code === 'functions/not-found') {
        setCancelError('الطلب غير موجود أو تم إلغاؤه مسبقاً.')
      } else if (code === 'functions/permission-denied') {
        setCancelError('لا تملك صلاحية إلغاء هذا الطلب.')
      } else {
        setCancelError('مشكلة في الاتصال. تحقق من الإنترنت وأعد المحاولة.')
      }
    }

    setCancelling(false)
  }

  // ── شاشة الرفض ────────────────────────────────────────────────────────────
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

  // ── شاشة القبول التلقائي ──────────────────────────────────────────────────
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

  // ── شاشة الانتظار ─────────────────────────────────────────────────────────
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

      {cancelError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold text-center max-w-xs leading-relaxed">
          {cancelError}
        </div>
      )}

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
