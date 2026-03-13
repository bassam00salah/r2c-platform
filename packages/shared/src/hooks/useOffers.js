import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useOffers() {
  const [offers, setOffers]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'offers'), where('status', '==', 'active'))
    const unsub = onSnapshot(q, snap => {
      setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return { offers, loading }
}
