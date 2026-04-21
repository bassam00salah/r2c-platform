import { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { PushNotifications } from '@capacitor/push-notifications'
import { StatusBar, Style } from '@capacitor/status-bar'
import { auth, db, usePartnerOrders } from '@r2c/shared'
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import BottomNav from './components/BottomNav'
import Logo from './components/logo'

const LoginScreen = lazy(() => import('./screens/Loginscreen'))
const SetupScreen = lazy(() => import('./screens/Setupscreen'))
const DashboardScreen = lazy(() => import('./screens/DashboardScreen'))
const OrderDetailScreen = lazy(() => import('./screens/OrderDetailScreen'))
const ReportsScreen = lazy(() => import('./screens/ReportsScreen'))
const SettingScreen = lazy(() => import('./screens/SettingScreen'))
const QRScannerScreen = lazy(() => import('./screens/QRScannerScreen'))

const WITH_NAV = ['dashboard', 'reports', 'settings']
const IS_NATIVE = Capacitor.isNativePlatform()

const SCREEN_STATUS_BAR = {
  login: { color: '#110d35', style: Style.Light },
  setup: { color: '#f7f5f1', style: Style.Dark },
  dashboard: { color: '#f7f7f7', style: Style.Dark },
  reports: { color: '#f7f7f7', style: Style.Dark },
  settings: { color: '#f7f5f1', style: Style.Dark },
  orderDetail: { color: '#f7f7f7', style: Style.Dark },
  qrScanner: { color: '#111827', style: Style.Light },
  default: { color: '#ffffff', style: Style.Dark },
}

function getStatusBarConfig(screen) {
  return SCREEN_STATUS_BAR[screen] || SCREEN_STATUS_BAR.default
}

function AppLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white" dir="rtl">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/5">
          <div className="animate-pulse">
            <Logo className="h-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

function toTokenDocId(token) {
  return String(token || '').replace(/\//g, '_')
}

function getOrderIdFromData(data) {
  if (!data) return null
  return data.orderId || data.id || data.order_id || null
}

async function showLocalNotificationWithSound(notification) {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.createChannel({
      id: 'order_updates_partner',
      name: 'تحديثات الطلبات',
      description: 'إشعارات الطلبات الواردة',
      importance: 5,
      sound: 'default',
      vibration: true,
      lights: true,
      lightColor: '#ee7b26',
    })
    await LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Math.random() * 100000),
        title: notification?.title || '🔔 طلب جديد!',
        body: notification?.body || '',
        channelId: 'order_updates_partner',
        sound: 'default',
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#ee7b26',
      }],
    })
  } catch (e) {
    console.warn('R2C Partner: LocalNotifications not available', e?.message)
  }
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login')
  const [currentOrder, setCurrentOrder] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [branchId, setBranchId] = useState(null)
  const [pushToken, setPushToken] = useState(null)
  const [pendingOpenOrderId, setPendingOpenOrderId] = useState(null)

  const previousBranchIdRef = useRef(null)
  const currentPushTokenRef = useRef(null)

  const { orders, loading: ordersLoading } = usePartnerOrders(branchId)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const nav = useCallback((screen, order = null) => {
    if (order) {
      setCurrentOrder(order)
    } else if (screen !== 'orderDetail') {
      setCurrentOrder(null)
    }
    setCurrentScreen(screen)
  }, [])

  const removePushTokenFromBranch = useCallback(async (targetBranchId, tokenValue) => {
    if (!IS_NATIVE || !targetBranchId || !tokenValue) return

    try {
      await deleteDoc(doc(collection(db, 'branches', targetBranchId, 'pushTokens'), toTokenDocId(tokenValue)))
    } catch (error) {
      console.warn('تعذر حذف توكن الإشعارات القديم:', error)
    }
  }, [])

  const savePushTokenForBranch = useCallback(async (targetBranchId, tokenValue) => {
    if (!IS_NATIVE || !targetBranchId || !tokenValue) return

    try {
      await setDoc(
        doc(collection(db, 'branches', targetBranchId, 'pushTokens'), toTokenDocId(tokenValue)),
        {
          token: tokenValue,
          branchId: targetBranchId,
          userId: auth.currentUser?.uid || targetBranchId,
          platform: Capacitor.getPlatform(),
          isActive: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    } catch (error) {
      console.warn('تعذر حفظ توكن الإشعارات:', error)
    }
  }, [])

  const openOrderFromNotification = useCallback(
    (data) => {
      const pushedOrderId = getOrderIdFromData(data)

      if (!pushedOrderId) {
        nav('dashboard')
        return
      }

      const matchedOrder = orders.find(
        (order) => order?.id === pushedOrderId || order?.orderId === pushedOrderId
      )

      if (matchedOrder) {
        nav('orderDetail', matchedOrder)
        return
      }

      setPendingOpenOrderId(pushedOrderId)
      nav('dashboard')
    },
    [orders, nav]
  )

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const uid = firebaseUser.uid
          const branchSnap = await getDoc(doc(db, 'branches', uid))

          if (branchSnap.exists()) {
            setBranchId(uid)
            setCurrentScreen('dashboard')
          } else {
            setBranchId(null)
            setCurrentScreen('setup')
          }
        } catch (error) {
          console.error('خطأ في جلب الفرع:', error)
          setBranchId(firebaseUser.uid)
          setCurrentScreen('dashboard')
        }
      } else {
        setBranchId(null)
        setPushToken(null)
        currentPushTokenRef.current = null
        setCurrentScreen('login')
      }
      setAuthLoading(false)
    })

    return unsub
  }, [])

  useEffect(() => {
    if (!pendingOpenOrderId || !orders.length) return

    const matchedOrder = orders.find(
      (order) => order?.id === pendingOpenOrderId || order?.orderId === pendingOpenOrderId
    )

    if (matchedOrder) {
      nav('orderDetail', matchedOrder)
      setPendingOpenOrderId(null)
    }
  }, [pendingOpenOrderId, orders, nav])

  const onLogin = async ({ email, password }) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch {
      showToast('البريد أو كلمة المرور غير صحيحة', 'error')
    }
  }

  const handleLogout = async () => {
    try {
      await removePushTokenFromBranch(branchId, currentPushTokenRef.current)
      await auth.signOut()
    } catch {
      showToast('حدث خطأ أثناء تسجيل الخروج', 'error')
    }
  }

  useEffect(() => {
    if (!IS_NATIVE) return undefined

    let cancelled = false

    const applyStatusBar = async () => {
      const { color, style } = getStatusBarConfig(authLoading ? 'login' : currentScreen)

      try {
        await StatusBar.setOverlaysWebView({ overlay: false })
        await StatusBar.setBackgroundColor({ color })
        await StatusBar.setStyle({ style })
      } catch (error) {
        if (!cancelled) {
          console.warn('تعذر تحديث شريط الحالة:', error)
        }
      }
    }

    applyStatusBar()

    return () => {
      cancelled = true
    }
  }, [currentScreen, authLoading])

  useEffect(() => {
    if (!IS_NATIVE) return undefined

    let backListener
    let resumeListener

    const handleNativeBack = async () => {
      const screen = authLoading ? 'login' : currentScreen

      if (screen === 'reports' || screen === 'settings' || screen === 'orderDetail' || screen === 'qrScanner') {
        nav('dashboard')
        return
      }

      if (screen === 'setup' || screen === 'login' || screen === 'dashboard') {
        await CapacitorApp.exitApp()
      }
    }

    const attachListeners = async () => {
      backListener = await CapacitorApp.addListener('backButton', () => {
        handleNativeBack()
      })

      resumeListener = await CapacitorApp.addListener('resume', async () => {
        const { color, style } = getStatusBarConfig(authLoading ? 'login' : currentScreen)
        try {
          await StatusBar.setOverlaysWebView({ overlay: false })
          await StatusBar.setBackgroundColor({ color })
          await StatusBar.setStyle({ style })
        } catch (error) {
          console.warn('تعذر إعادة مزامنة شريط الحالة:', error)
        }
      })
    }

    attachListeners()

    return () => {
      backListener?.remove?.()
      resumeListener?.remove?.()
    }
  }, [currentScreen, authLoading, nav])

  useEffect(() => {
    if (!IS_NATIVE) return undefined

    let registrationListener
    let registrationErrorListener
    let receivedListener
    let actionListener

    const attachPushListeners = async () => {
      registrationListener = await PushNotifications.addListener('registration', (token) => {
        const tokenValue = token?.value || ''
        if (!tokenValue) return

        currentPushTokenRef.current = tokenValue
        setPushToken(tokenValue)
        console.log('✅ Push token registered:', tokenValue)
      })

      registrationErrorListener = await PushNotifications.addListener('registrationError', (error) => {
        console.error('فشل تسجيل Push Notifications:', error)
        showToast('تعذر تفعيل الإشعارات على هذا الجهاز', 'error')
      })

      receivedListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        const pushedOrderId = getOrderIdFromData(notification?.data)
        if (pushedOrderId) {
          showToast(notification?.title || '🔔 طلب جديد وارد!', 'success')
        }
        showLocalNotificationWithSound(notification)
      })

      actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
        openOrderFromNotification(event?.notification?.data)
      })
    }

    attachPushListeners()

    return () => {
      registrationListener?.remove?.()
      registrationErrorListener?.remove?.()
      receivedListener?.remove?.()
      actionListener?.remove?.()
    }
  }, [openOrderFromNotification, showToast])

  useEffect(() => {
    if (!IS_NATIVE || !branchId) return undefined

    let cancelled = false

    const registerForPush = async () => {
      try {
        let permission = await PushNotifications.checkPermissions()
        console.log('Push permission before request:', permission)

        if (permission.receive !== 'granted') {
          permission = await PushNotifications.requestPermissions()
          console.log('Push permission after request:', permission)
        }

        if (permission.receive !== 'granted') {
          if (!cancelled) {
            showToast('يجب السماح بالإشعارات حتى تصلك الطلبات الجديدة', 'error')
          }
          return
        }

        await PushNotifications.register()
      } catch (error) {
        if (!cancelled) {
          console.error('registerForPush error:', error)
          showToast('تعذر تفعيل الإشعارات على هذا الجهاز', 'error')
        }
      }
    }

    registerForPush()

    return () => {
      cancelled = true
    }
  }, [branchId, showToast])

  useEffect(() => {
    const previousBranchId = previousBranchIdRef.current

    if (previousBranchId && previousBranchId !== branchId && currentPushTokenRef.current) {
      removePushTokenFromBranch(previousBranchId, currentPushTokenRef.current)
    }

    previousBranchIdRef.current = branchId
  }, [branchId, removePushTokenFromBranch])

  useEffect(() => {
    if (!branchId || !pushToken) return undefined

    savePushTokenForBranch(branchId, pushToken)
  }, [branchId, pushToken, savePushTokenForBranch])

  if (authLoading) {
    return <AppLoadingScreen />
  }

  const commonProps = { setCurrentScreen: nav, showToast, branchId }

  return (
    <div className="relative">
      <Suspense fallback={<AppLoadingScreen />}>
        {currentScreen === 'login' && <LoginScreen onLogin={onLogin} showToast={showToast} />}
        {currentScreen === 'setup' && <SetupScreen onComplete={() => nav('settings')} showToast={showToast} />}
        {currentScreen === 'dashboard' && (
          <DashboardScreen {...commonProps} orders={orders} ordersLoading={ordersLoading} />
        )}
        {currentScreen === 'orderDetail' && <OrderDetailScreen {...commonProps} order={currentOrder} />}
        {currentScreen === 'reports' && <ReportsScreen {...commonProps} orders={orders} />}
        {currentScreen === 'settings' && (
          <SettingScreen {...commonProps} orders={orders} onLogout={handleLogout} />
        )}
        {currentScreen === 'qrScanner' && <QRScannerScreen {...commonProps} />}
      </Suspense>

      {WITH_NAV.includes(currentScreen) && (
        <BottomNav currentScreen={currentScreen} setCurrentScreen={nav} />
      )}

      {toast && (
        <div
          className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm text-white ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-green-600'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
