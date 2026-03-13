import { useState, useEffect } from 'react'
import { onAuthStateChanged }  from 'firebase/auth'
import { doc, getDoc }         from 'firebase/firestore'
import { auth, db }            from '../firebase/config'

export function useAuth() {
  const [user,        setUser]        = useState(null)
  const [profileData, setProfileData] = useState({ name: '', email: '', photoURL: '' })
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async currentUser => {
      if (currentUser) {
        setUser(currentUser)
        const snap = await getDoc(doc(db, 'users', currentUser.uid))
        setProfileData({
          name:     snap.exists() ? snap.data().name     || currentUser.displayName : currentUser.displayName || 'مستخدم',
          email:    snap.exists() ? snap.data().email    || currentUser.email       : currentUser.email || '',
          photoURL: snap.exists() ? snap.data().photoURL || currentUser.photoURL   : currentUser.photoURL || '',
        })
      } else {
        setUser(null)
        setProfileData({ name: '', email: '', photoURL: '' })
      }
      setAuthLoading(false)
    })
    return () => unsub()
  }, [])

  return { user, profileData, authLoading }
}
