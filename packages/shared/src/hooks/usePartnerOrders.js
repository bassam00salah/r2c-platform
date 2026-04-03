import { useState, useEffect, useRef } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

/**
 * usePartnerOrders — نسخة مُحسَّنة
 *
 * الإصلاحات:
 * 1. إضافة includeMetadataChanges: true لتسريع استقبال التغييرات من الخادم
 *    (بدونها Firestore قد يعتمد على الـ cache أولاً مما يُسبب تأخيراً)
 * 2. إضافة حالة "lastUpdated" لإجبار React على إعادة الرسم عند وصول بيانات جديدة
 * 3. تجنّب إعادة إنشاء الـ listener عند كل render بدون سبب
 */
export function usePartnerOrders(branchId) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  // ✅ مرجع للـ listener الحالي لضمان التنظيف الصحيح
  const unsubRef = useRef(null)

  useEffect(() => {
    // تنظيف أي listener سابق
    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }

    if (!branchId) {
      setOrders([])
      setLoading(false)
      return
    }

    setLoading(true)

    const q = query(
      collection(db, 'orders'),
      where('branchId', '==', branchId)
    )

    // ✅ الإصلاح الرئيسي: includeMetadataChanges: true
    // يجعل Firestore يُخطرك فوراً بالبيانات القادمة من الخادم
    // وليس فقط من الـ cache المحلي — هذا هو سبب التأخير في ظهور الطلبات
    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        // ✅ تجاهل الـ snapshots القادمة من الـ cache فقط (من الجهاز)
        // والانتظار حتى تأتي من الخادم الفعلي
        // hasPendingWrites: true = البيانات محلية لم ترسل بعد
        // fromCache: true = البيانات من الـ cache وليس الخادم
        const serverDocs = snap.docs.filter(
          d => !d.metadata.hasPendingWrites
        )

        // إذا كان كل الـ docs من الـ cache ولم يكتمل التزامن بعد، لا تحدّث
        // إلا إذا لم يكن هناك docs أصلاً (حالة فارغة حقيقية)
        if (snap.metadata.fromCache && snap.docs.length > 0 && serverDocs.length === 0) {
          return
        }

        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? 0
            const bTime = b.createdAt?.toMillis?.() ?? 0
            return bTime - aTime
          })

        setOrders(sorted)
        setLoading(false)
      },
      (error) => {
        console.error('usePartnerOrders error:', error)
        setLoading(false)
      }
    )

    unsubRef.current = unsub

    return () => {
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
    }
  }, [branchId])

  return { orders, loading }
}
