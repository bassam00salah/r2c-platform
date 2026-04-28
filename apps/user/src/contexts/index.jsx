import {
  createContext, useContext, useState, useEffect,
  useCallback, useMemo, useRef
} from 'react'
import { useAuth as useSharedAuth, useOffers, useOrders } from '@r2c/shared'
import { db } from '@r2c/shared/firebase/config'
import { doc, updateDoc } from 'firebase/firestore'

const AuthContext      = createContext(null)
const OfferDataContext = createContext(null)
const OrderDataContext = createContext(null)
const NavigationContext = createContext(null)

const EXIT_SCREENS = new Set(['auth', 'location'])
const ROOT_SCREEN = 'feed'

function getActiveScreenScroller() {
  if (typeof document === 'undefined') return null
  return (
    document.querySelector('[data-r2c-screen-wrapper="active"]') ||
    document.querySelector('.r2c-screen-wrapper') ||
    document.scrollingElement ||
    document.documentElement
  )
}

function readActiveScrollTop() {
  const el = getActiveScreenScroller()
  if (!el) return 0
  return Number(el.scrollTop || window.scrollY || 0) || 0
}

function createHistoryEntry(screen, scrollTop = 0) {
  return {
    screen: screen || ROOT_SCREEN,
    scrollTop: Math.max(0, Number(scrollTop) || 0),
  }
}

function getCurrentUrl() {
  if (typeof window === 'undefined') return ''
  return window.location.href
}

function safePushBrowserState(screen) {
  if (typeof window === 'undefined' || !window.history?.pushState) return
  try {
    window.history.pushState({ r2c: true, screen }, '', getCurrentUrl())
  } catch {}
}

function safeReplaceBrowserState(screen) {
  if (typeof window === 'undefined' || !window.history?.replaceState) return
  try {
    window.history.replaceState({ r2c: true, screen }, '', getCurrentUrl())
  } catch {}
}

export function AuthProvider({ children }) {
  const { user, profileData, setProfileData, authLoading } = useSharedAuth()
  const value = useMemo(() => ({ user, profileData, setProfileData, authLoading }), [user, profileData, setProfileData, authLoading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthCtx() {
  return useContext(AuthContext)
}

export function OfferDataProvider({ children }) {
  const { user, authLoading } = useContext(AuthContext)
  const { offers, loading: loadingOffers } = useOffers(user, authLoading)
  const [selectedOffer, setSelectedOffer]           = useState(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)

  const value = useMemo(() => ({
    offers, loadingOffers,
    selectedOffer, setSelectedOffer,
    selectedRestaurant, setSelectedRestaurant,
  }), [offers, loadingOffers, selectedOffer, selectedRestaurant])

  return <OfferDataContext.Provider value={value}>{children}</OfferDataContext.Provider>
}

export function useOfferData() {
  return useContext(OfferDataContext)
}

export function OrderDataProvider({ children }) {
  const { user } = useContext(AuthContext)
  const { orders } = useOrders({ userId: user?.uid })
  const [currentOrderId, setCurrentOrderId] = useState(null)
  const value = useMemo(() => ({ orders, currentOrderId, setCurrentOrderId }), [orders, currentOrderId])
  return <OrderDataContext.Provider value={value}>{children}</OrderDataContext.Provider>
}

export function useOrderData() {
  return useContext(OrderDataContext)
}

export function NavigationProvider({ children }) {
  const { user, authLoading } = useContext(AuthContext)
  const [currentScreen, setCurrentScreenRaw] = useState('auth')
  const [userLocation, setUserLocation]       = useState(null)
  const [viewMode, setViewMode]               = useState('feed')
  const [bottomNav, setBottomNav]             = useState('home')
  const [activeOrdersTab, setActiveOrdersTab] = useState('current')
  const [globalHeaderSearchQuery, setGlobalHeaderSearchQuery] = useState('')
  const [restoreScrollRequest, setRestoreScrollRequest] = useState(null)

  const [locationAsked, setLocationAsked] = useState(() => {
    try { return !!localStorage.getItem('r2c_location_asked') } catch { return false }
  })

  const markLocationAsked = useCallback(() => {
    setLocationAsked(true)
    try { localStorage.setItem('r2c_location_asked', '1') } catch {}
  }, [])

  // Stack موحّد لكل أنواع الرجوع: زر الهيدر + زر الهاتف + زر المتصفح.
  // كل عنصر يحفظ اسم الشاشة وموضع التمرير داخل نفس الشاشة.
  const screenHistoryRef = useRef([createHistoryEntry(ROOT_SCREEN)])

  const requestScrollRestore = useCallback((screen, scrollTop = 0) => {
    setRestoreScrollRequest({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      screen,
      scrollTop: Math.max(0, Number(scrollTop) || 0),
    })
  }, [])

  const saveCurrentEntryPosition = useCallback(() => {
    const stack = screenHistoryRef.current
    if (!stack.length) return

    const lastIndex = stack.length - 1
    const lastEntry = stack[lastIndex]
    stack[lastIndex] = {
      ...lastEntry,
      scrollTop: readActiveScrollTop(),
    }
  }, [])

  const syncBottomNavForScreen = useCallback((screen) => {
    if (screen === 'orders') {
      setBottomNav('orders')
      return
    }
    if (screen === 'profile') {
      setBottomNav('profile')
      return
    }
    if (['feed', 'grid', 'search', 'restaurantProfile', 'offerDetails', 'explore'].includes(screen)) {
      setBottomNav('home')
    }
  }, [])

  const moveToHistoryEntry = useCallback((entry, { replaceBrowserState = true } = {}) => {
    const safeEntry = createHistoryEntry(entry?.screen, entry?.scrollTop)
    syncBottomNavForScreen(safeEntry.screen)
    setCurrentScreenRaw(safeEntry.screen)
    requestScrollRestore(safeEntry.screen, safeEntry.scrollTop)
    if (replaceBrowserState) safeReplaceBrowserState(safeEntry.screen)
  }, [requestScrollRestore, syncBottomNavForScreen])

  // دالة الذهاب للشاشة مع تسجيل التاريخ وحفظ موضع الشاشة الحالية قبل الخروج منها.
  // يمكن تمرير options عند الحاجة:
  //   setCurrentScreen('feed', { resetStack: true })
  //   setCurrentScreen('waiting', { replace: true })
  const setCurrentScreen = useCallback((screen, options = {}) => {
    if (!screen) return

    const nextScrollTop = Math.max(0, Number(options.scrollTop) || 0)
    const stack = screenHistoryRef.current
    const lastEntry = stack[stack.length - 1]

    saveCurrentEntryPosition()

    if (options.resetStack) {
      const entry = createHistoryEntry(screen, nextScrollTop)
      screenHistoryRef.current = [entry]
      moveToHistoryEntry(entry)
      return
    }

    if (lastEntry?.screen === screen && !options.forcePush) {
      const updatedEntry = createHistoryEntry(screen, options.keepScroll ? readActiveScrollTop() : nextScrollTop)
      screenHistoryRef.current[stack.length - 1] = updatedEntry
      moveToHistoryEntry(updatedEntry)
      return
    }

    const nextEntry = createHistoryEntry(screen, nextScrollTop)

    if (options.replace && stack.length) {
      screenHistoryRef.current = [...stack.slice(0, -1), nextEntry]
    } else {
      screenHistoryRef.current = [...stack, nextEntry]
    }

    syncBottomNavForScreen(screen)
    setCurrentScreenRaw(screen)
    requestScrollRestore(screen, nextScrollTop)
    safePushBrowserState(screen)
  }, [moveToHistoryEntry, requestScrollRestore, saveCurrentEntryPosition, syncBottomNavForScreen])

  const goBack = useCallback(() => {
    saveCurrentEntryPosition()

    const stack = screenHistoryRef.current

    if (stack.length > 1) {
      const nextStack = stack.slice(0, -1)
      const previousEntry = nextStack[nextStack.length - 1]
      screenHistoryRef.current = nextStack
      moveToHistoryEntry(previousEntry)
      return true
    }

    const currentEntry = stack[0] || createHistoryEntry(currentScreen || ROOT_SCREEN)

    // لو الشاشة الحالية ليست الجذر، ارجع للجذر بدل الخروج المفاجئ.
    if (currentEntry.screen !== ROOT_SCREEN && !EXIT_SCREENS.has(currentEntry.screen)) {
      const fallbackEntry = createHistoryEntry(ROOT_SCREEN, 0)
      screenHistoryRef.current = [fallbackEntry]
      moveToHistoryEntry(fallbackEntry)
      return true
    }

    window.dispatchEvent(new CustomEvent('r2c-exit-app'))
    return false
  }, [currentScreen, moveToHistoryEntry, saveCurrentEntryPosition])

  // معالج العودة المشترك: نفس الدالة يستعملها زر الهاتف والـ browser back.
  useEffect(() => {
    const handleBack = () => {
      goBack()
    }

    window.addEventListener('popstate', handleBack)
    window.addEventListener('r2c-back', handleBack)

    return () => {
      window.removeEventListener('popstate', handleBack)
      window.removeEventListener('r2c-back', handleBack)
    }
  }, [goBack])

  // ضع حالة أولية للمتصفح بدون بناء stack منفصل عن stack التطبيق.
  useEffect(() => {
    safeReplaceBrowserState(ROOT_SCREEN)
  }, [])

  const resetNavigationStack = useCallback((screen) => {
    const entry = createHistoryEntry(screen, 0)
    screenHistoryRef.current = [entry]
    syncBottomNavForScreen(screen)
    setCurrentScreenRaw(screen)
    requestScrollRestore(screen, 0)
    safeReplaceBrowserState(screen)
  }, [requestScrollRestore, syncBottomNavForScreen])

  useEffect(() => {
    if (authLoading) return undefined

    if (!user) {
      resetNavigationStack('auth')
      return undefined
    }

    const syncId = setTimeout(() => {
      if (!userLocation) {
        resetNavigationStack('location')
      } else {
        resetNavigationStack(ROOT_SCREEN)
      }
    }, 0)
    return () => clearTimeout(syncId)
  }, [user, authLoading, userLocation, resetNavigationStack])

  // ── حفظ FCM Token في Firestore عند استقباله من main.jsx ─────────────────
  useEffect(() => {
    const handleFcmToken = async (e) => {
      const { token } = e.detail || {}
      if (!token || !user?.uid) return
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          fcmToken: token,
          fcmTokenUpdatedAt: new Date().toISOString(),
          platform: 'android',
        })
      } catch (err) {
        console.error('R2C: failed to save FCM token', err)
      }
    }

    // فتح شاشة معينة عند الضغط على إشعار (background/closed)
    const handleOpenScreen = (e) => {
      const { screen } = e.detail || {}
      const validScreens = ['orders', 'feed', 'profile', 'search']
      if (screen && validScreens.includes(screen)) {
        setCurrentScreen(screen)
      }
    }

    window.addEventListener('r2c-fcm-token', handleFcmToken)
    window.addEventListener('r2c-open-screen', handleOpenScreen)
    return () => {
      window.removeEventListener('r2c-fcm-token', handleFcmToken)
      window.removeEventListener('r2c-open-screen', handleOpenScreen)
    }
  }, [user?.uid, setCurrentScreen])

  const value = useMemo(() => ({
    currentScreen: currentScreen === undefined ? ROOT_SCREEN : currentScreen,
    setCurrentScreen,
    goBack,
    restoreScrollRequest,
    userLocation, setUserLocation,
    viewMode, setViewMode,
    bottomNav, setBottomNav,
    activeOrdersTab, setActiveOrdersTab,
    globalHeaderSearchQuery, setGlobalHeaderSearchQuery,
    locationAsked, markLocationAsked,
  }), [
    currentScreen,
    setCurrentScreen,
    goBack,
    restoreScrollRequest,
    userLocation,
    viewMode,
    bottomNav,
    activeOrdersTab,
    globalHeaderSearchQuery,
    locationAsked,
    markLocationAsked,
  ])

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useNavigation() {
  return useContext(NavigationContext)
}

export function AppProvider({ children }) {
  return (
    <AuthProvider>
      <OfferDataProvider>
        <OrderDataProvider>
          <NavigationProvider>{children}</NavigationProvider>
        </OrderDataProvider>
      </OfferDataProvider>
    </AuthProvider>
  )
}

export function useApp() {
  const auth   = useContext(AuthContext)
  const offers = useContext(OfferDataContext)
  const orders = useContext(OrderDataContext)
  const nav    = useContext(NavigationContext)
  return useMemo(() => ({ ...auth, ...offers, ...orders, ...nav }), [auth, offers, orders, nav])
}
