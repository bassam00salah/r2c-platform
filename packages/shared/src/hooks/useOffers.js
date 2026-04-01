import { useState, useEffect } from 'react'
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

const OFFERS_PAGE_SIZE = 50

export function useOffers(user, authLoading) {
  const [offers, setOffers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    // انتظر حتى يكتمل تحميل الـ auth
    if (authLoading) return
    // لا تبدأ الـ listener إذا لم يكن المستخدم مسجلاً
    if (!user) {
      setOffers([])
      setLoading(false)
      return
    }

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
  }, [user, authLoading])

  return { offers, loading, hasMore }
}
