import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppProvider } from './contexts/index.jsx'
import ErrorBoundary from '@r2c/shared/components/ErrorBoundary'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// ── زر العودة الفيزيائي في أندرويد ──────────────────────────────────────────
CapacitorApp.addListener('backButton', () => {
  window.dispatchEvent(new CustomEvent('r2c-back'))
})

window.addEventListener('r2c-exit-app', () => {
  CapacitorApp.exitApp()
})

// ── Push Notifications ────────────────────────────────────────────────────────
async function initPushNotifications() {
  if (Capacitor.getPlatform() !== 'android') return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    // 1. طلب الإذن
    const permResult = await PushNotifications.requestPermissions()
    if (permResult.receive !== 'granted') {
      console.warn('R2C: Push permission denied')
      return
    }

    // 2. تسجيل مع FCM
    await PushNotifications.register()

    // 3. استقبال الـ token وإرساله للـ context
    PushNotifications.addListener('registration', ({ value: token }) => {
      console.log('R2C FCM Token:', token)
      window.dispatchEvent(new CustomEvent('r2c-fcm-token', { detail: { token } }))
    })

    // 4. إشعار وصل والتطبيق مفتوح (foreground) — نعرضه يدوياً بصوت
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('R2C Push foreground:', notification)

      // عرض notification محلية بصوت عبر LocalNotifications
      showLocalNotification(notification)

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
    console.warn(
      'R2C: @capacitor/push-notifications not installed.\n' +
      'Run: npm install @capacitor/push-notifications && npx cap sync android'
    )
  }
}

// ── إشعار محلي بصوت عند وصول push وهو مفتوح ─────────────────────────────────
async function showLocalNotification(notification) {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // إنشاء الـ channel مع صوت (يكفي مرة واحدة لكن لا ضرر من تكرار)
    await LocalNotifications.createChannel({
      id: 'order_updates',
      name: 'تحديثات الطلبات',
      description: 'إشعارات حالة الطلب',
      importance: 5,        // IMPORTANCE_HIGH
      sound: 'default',
      vibration: true,
      lights: true,
      lightColor: '#ee7b26',
    })

    await LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Math.random() * 100000),
        title: notification.title || 'R2C',
        body: notification.body || '',
        channelId: 'order_updates',
        sound: 'default',
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#ee7b26',
      }]
    })
  } catch (e) {
    // LocalNotifications مش مثبت — مش مشكلة
    console.warn('R2C: LocalNotifications not available', e?.message)
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
