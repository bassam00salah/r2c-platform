 
import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { doc, setDoc } from 'firebase/firestore'
import { db, auth } from '@r2c/shared'

export function useFCM() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const init = async () => {
      const permission = await PushNotifications.requestPermissions()
      if (permission.receive !== 'granted') return

      await PushNotifications.register()

      PushNotifications.addListener('registration', async (token) => {
        const uid = auth.currentUser?.uid
        if (!uid) return
        await setDoc(
          doc(db, 'users', uid),
          { fcmToken: token.value, platform: 'android' },
          { merge: true }
        )
      })
    }

    init()
  }, [])
}
