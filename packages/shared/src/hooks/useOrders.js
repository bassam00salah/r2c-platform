import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useOrders(filters = {}) {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    if (!filters.userId && !filters.branchId) { setOrders([]); return }

    let q = collection(db, 'orders')
    if (filters.userId)   q = query(q, where('userId',   '==', filters.userId))
    if (filters.branchId) q = query(q, where('branchId', '==', filters.branchId))

    const unsub = onSnapshot(q,
      snap => {
        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
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
