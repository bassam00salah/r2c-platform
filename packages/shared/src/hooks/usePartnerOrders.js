import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export function usePartnerOrders(branchId) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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

    const unsub = onSnapshot(q, snap => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0
          const bTime = b.createdAt?.toMillis?.() ?? 0
          return bTime - aTime
        })
      setOrders(sorted)
      setLoading(false)
    }, (error) => {
      console.error('usePartnerOrders error:', error)
      setLoading(false)
    })

    return () => unsub()
  }, [branchId])

  return { orders, loading }
}
