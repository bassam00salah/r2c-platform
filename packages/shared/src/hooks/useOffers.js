import { useState, useEffect } from 'react'
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

const OFFERS_PAGE_SIZE = 50

export function useOffers() {
  const [offers, setOffers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    const q = query(
      collection(db, 'offers'),
      where('status', '==', 'active'),
      limit(OFFERS_PAGE_SIZE)
    )
    const unsub = onSnapshot(q,
      snap => {
        setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setHasMore(snap.docs.length === OFFERS_PAGE_SIZE)
        setLoading(false)
      },
      error => {
        console.error('useOffers error:', error)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  return { offers, loading, hasMore }
}
