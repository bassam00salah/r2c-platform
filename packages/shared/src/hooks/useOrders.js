import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useOrders(filters = {}) {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    // لا تبدأ الـ listener بدون userId أو branchId
    if (!filters.userId && !filters.branchId) { setOrders([]); return }

    let q = collection(db, 'orders')
    if (filters.userId)   q = query(q, where('userId',   '==', filters.userId))
    if (filters.branchId) q = query(q, where('branchId', '==', filters.branchId))

    const unsub = onSnapshot(q,
      snap => {
        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? new Date(a.createdAt).getTime() ?? 0
            const bTime = b.createdAt?.toMillis?.() ?? new Date(b.createdAt).getTime() ?? 0
            return bTime - aTime
          })
        setOrders(sorted)
      },
      error => {
        console.error('useOrders error:', error)
      }
    )
    return () => unsub()
  }, [filters.userId, filters.branchId])

  return { orders }
}
