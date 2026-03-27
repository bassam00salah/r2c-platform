import { useState, useEffect, useRef } from 'react'
import { useApp } from '../contexts'
import { auth, db, functions } from '@r2c/shared'
import { doc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

export default function WaitingScreen() {
  const { currentOrderId, setCurrentScreen } = useApp()
  const [countdown, setCountdown] = useState(45)
  const [timedOut, setTimedOut] = useState(false)
  const [rejectedMsg, setRejectedMsg] = useState('')
  const orderResolvedRef = useRef(false)

  useEffect(() => {
    if (!currentOrderId) return undefined
    const unsub = onSnapshot(doc(db, 'orders', currentOrderId), (snap) => {
      if (!snap.exists()) return
      const status = snap.data().status
      if (status === 'accepted') {
        orderResolvedRef.current = true
        setTimedOut(true)
        setCurrentScreen('success')
      } else if (status === 'rejected') {
        orderResolvedRef.current = true
        setTimedOut(true)
        setRejectedMsg('عذراً، رفض الفرع طلبك. يمكنك المحاولة مرة أخرى.')
      } else if (status === 'cancelled') {
        orderResolvedRef.current = true
        setTimedOut(true)
      }
    })
    return () => unsub()
  }, [currentOrderId, setCurrentScreen])

  useEffect(() => {
    if (timedOut) return undefined
    if (countdown <= 0) {
      const timeoutId = setTimeout(() => {
        setTimedOut(true)
        if (currentOrderId && !orderResolvedRef.current) {
          const cancelFn = httpsCallable(functions, 'cancelOrderOnTimeout')
          cancelFn({ orderId: currentOrderId }).catch(() => {})
        }
      }, 0)
      return () => clearTimeout(timeoutId)
    }
    const timerId = setTimeout(() => setCountdown((value) => value - 1), 1000)
    return () => clearTimeout(timerId)
  }, [countdown, timedOut, currentOrderId])

  const handleCancel = async () => {
    if (currentOrderId && auth.currentUser) {
      try {
        const cancelFn = httpsCallable(functions, 'cancelOrderOnTimeout')
        await cancelFn({ orderId: currentOrderId })
      } catch {
        setTimedOut((value) => value)
      }
    }
    setCurrentScreen('offerDetails')
  }

  if (rejectedMsg) return <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center"><div className="text-8xl mb-6">❌</div><h1 className="text-2xl font-bold text-red-500 mb-3">تم رفض الطلب</h1><p className="text-gray-500 mb-8 leading-relaxed">{rejectedMsg}</p><button onClick={() => setCurrentScreen('offerDetails')} className="w-full max-w-sm py-4 rounded-2xl text-white font-black text-xl" style={{ background: '#ee7b26' }}>العودة والمحاولة مجدداً</button></div>
  if (timedOut) return <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center"><div className="text-8xl mb-6">⏱</div><h1 className="text-2xl font-bold text-red-500 mb-3">انتهت مهلة انتظار الفرع</h1><p className="text-gray-500 mb-8 leading-relaxed">لم يستجب الفرع خلال الوقت المحدد.<br />يمكنك المحاولة مرة أخرى.</p><button onClick={() => setCurrentScreen('offerDetails')} className="w-full max-w-sm py-4 rounded-2xl text-white font-black text-xl" style={{ background: '#ee7b26' }}>العودة والمحاولة مجدداً</button></div>

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="mb-8"><div style={{ fontSize: 80 }}>🍽️</div></div>
      <h1 className="text-3xl font-bold mb-4 text-center">في انتظار قبول الفرع...</h1>
      <p className="text-gray-500 text-center mb-6">جاري التواصل مع الفرع لتأكيد طلبك</p>
      <div className={`border-2 rounded-2xl px-10 py-5 mb-8 text-center ${countdown <= 15 ? 'bg-red-50 border-red-400' : 'bg-[#ee7b26]/10 border-[#ee7b26]'}`}><div className={`text-5xl font-black font-mono tracking-wider ${countdown <= 15 ? 'text-red-500' : 'text-[#ee7b26]'}`}>{String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}</div><div className="text-gray-500 font-semibold text-sm mt-1">الوقت المتبقي للانتظار</div></div>
      <div className="spinner mb-8 mx-auto" />
      <p className="text-xs text-gray-400 text-center mb-6">سيظهر QR الكود فور قبول الفرع لطلبك</p>
      <button onClick={handleCancel} className="text-gray-400 font-semibold text-sm underline hover:text-gray-600">إلغاء الطلب</button>
    </div>
  )
}
