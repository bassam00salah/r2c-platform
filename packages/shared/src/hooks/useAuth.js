import { useState, useEffect } from 'react'
import { onAuthStateChanged }  from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'  // ✅ أضف setDoc
import { auth, db }            from '../firebase/config'

export function useAuth() {
  const [user,        setUser]        = useState(null)
  const [profileData, setProfileData] = useState({ name: '', email: '', photoURL: '', phone: '', address: '' })
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async currentUser => {
      if (currentUser) {
        setUser(currentUser)

        try {
          await currentUser.getIdToken(true)

          const userRef = doc(db, 'users', currentUser.uid)
          const snap    = await getDoc(userRef)

          if (!snap.exists()) {
            // أنشئ document للمستخدم إذا لم يكن موجوداً (أول تسجيل دخول)
            await setDoc(userRef, {
              name:      currentUser.displayName || 'مستخدم',
              email:     currentUser.email       || '',
              photoURL:  currentUser.photoURL    || '',
              createdAt: new Date().toISOString(),
            })
            setProfileData({
              name:     currentUser.displayName || 'مستخدم',
              email:    currentUser.email       || '',
              photoURL: currentUser.photoURL    || '',
              phone:    '',
              address:  '',
            })
          } else {
            const d = snap.data()
            setProfileData({
              name:     d.name     || currentUser.displayName || 'مستخدم',
              email:    d.email    || currentUser.email       || '',
              photoURL: d.photoURL || currentUser.photoURL   || '',
              phone:    d.phone    || '',
              address:  d.address  || '',
            })
          }

        } catch (error) {
          console.error('Error fetching user profile:', error)
          setProfileData({
            name:     currentUser.displayName || 'مستخدم',
            email:    currentUser.email       || '',
            photoURL: currentUser.photoURL    || '',
            phone:    '',
            address:  '',
          })
        }

      } else {
        setUser(null)
        setProfileData({ name: '', email: '', photoURL: '', phone: '', address: '' })
      }
      setAuthLoading(false)
    })
    return () => unsub()
  }, [])

  return { user, profileData, setProfileData, authLoading }
}
