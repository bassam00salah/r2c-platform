import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppProvider } from './contexts/index.jsx'
import ErrorBoundary from '@r2c/shared/components/ErrorBoundary'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// ── زر العودة الفيزيائي في أندرويد ──────────────────────────────────────────
// نرسل event مخصص يلتقطه NavigationProvider في contexts/index.jsx
// هو اللي يتحكم فعلاً في الـ screen stack بدل window.history
CapacitorApp.addListener('backButton', () => {
  window.dispatchEvent(new CustomEvent('r2c-back'))
})

// لو الـ context طلب الخروج من التطبيق نعمل exitApp
window.addEventListener('r2c-exit-app', () => {
  CapacitorApp.exitApp()
})

// ── Push Notifications (أندرويد فقط) ────────────────────────────────────────
async function initPushNotifications() {
  if (Capacitor.getPlatform() !== 'android') return

  try {
    // نستورد ديناميكياً عشان مش موجود في web build
    const { PushNotifications } = await import('@capacitor/push-notifications')

    // 1. طلب الإذن
    const permResult = await PushNotifications.requestPermissions()
    if (permResult.receive !== 'granted') {
      console.warn('R2C: Push notification permission denied')
      return
    }

    // 2. تسجيل الجهاز مع FCM
    await PushNotifications.register()

    // 3. استقبال الـ FCM token — احفظه في Firestore مع الـ userId
    PushNotifications.addListener('registration', ({ value: token }) => {
      console.log('R2C FCM Token:', token)
      // أرسل الـ token لـ Firestore (يتم في AppContext بعد login)
      window.dispatchEvent(new CustomEvent('r2c-fcm-token', { detail: { token } }))
    })

    // 4. إشعار وصل والتطبيق مفتوح (foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('R2C Push (foreground):', notification)
      window.dispatchEvent(new CustomEvent('r2c-notification', { detail: notification }))
    })

    // 5. المستخدم ضغط على الإشعار (background/closed)
    PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      console.log('R2C Push tapped:', notification)
      const screen = notification?.data?.screen
      if (screen) {
        window.dispatchEvent(new CustomEvent('r2c-open-screen', { detail: { screen } }))
      }
    })

    // 6. خطأ في التسجيل
    PushNotifications.addListener('registrationError', (err) => {
      console.error('R2C Push registration error:', err)
    })

  } catch (e) {
    // الـ plugin مش مثبت بعد — اطبع تحذير واضح
    console.warn(
      'R2C: @capacitor/push-notifications not installed.\n' +
      'Run: npm install @capacitor/push-notifications && npx cap sync android'
    )
  }
}

initPushNotifications()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>
)
