import {
  createContext, useContext, useState, useEffect,
  useCallback, useMemo, useRef
} from 'react'
import { useAuth as useSharedAuth, useOffers, useOrders } from '@r2c/shared'

const AuthContext      = createContext(null)
const OfferDataContext = createContext(null)
const OrderDataContext = createContext(null)
const NavigationContext = createContext(null)

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

  const [locationAsked, setLocationAsked] = useState(() => {
    try { return !!localStorage.getItem('r2c_location_asked') } catch { return false }
  })

  const markLocationAsked = useCallback(() => {
    setLocationAsked(true)
    try { localStorage.setItem('r2c_location_asked', '1') } catch {}
  }, [])

  // ── زر العودة في أندرويد (محسّن) ──────────────────────────────────────────
  // stack يتتبع تاريخ الشاشات
  const screenHistoryRef = useRef(['feed'])

  // قائمة الشاشات التي لا يجب العودة منها (تغلق التطبيق)
  const exitScreens = ['auth', 'location']

  // دالة للذهاب للشاشة مع تسجيل التاريخ
  const setCurrentScreen = useCallback((screen) => {
    setCurrentScreenRaw(screen)

    // أضف الشاشة الجديدة إلى التاريخ
    const stack = screenHistoryRef.current
    if (stack[stack.length - 1] !== screen) {
      stack.push(screen)
    }
  }, [])

  // دالة للعودة للشاشة السابقة
  const goBack = useCallback(() => {
    const stack = screenHistoryRef.current

    // إذا كان هناك أكثر من شاشة واحدة في السجل
    if (stack.length > 1) {
      stack.pop() // أزل الشاشة الحالية
      const previousScreen = stack[stack.length - 1]
      setCurrentScreenRaw(previousScreen)
    } else {
      // إذا كنت في أول شاشة، ابق هناك
      // أو يمكنك تنفيذ إجراء مخصص (مثل فتح قائمة للخروج)
      console.log('أنت في أول شاشة')
    }
  }, [])

  // معالج زر العودة في أندرويد
  useEffect(() => {
    const handlePopState = (e) => {
      const stack = screenHistoryRef.current

      // أزل الشاشة الحالية
      if (stack.length > 1) {
        stack.pop()
        const previousScreen = stack[stack.length - 1]
        setCurrentScreenRaw(previousScreen)
      } else {
        // إذا كانت هذه أول شاشة
        if (exitScreens.includes(stack[0])) {
          // في شاشات Auth/Location - لا تفعل شيء
        } else {
          // في الشاشات الأخرى - ابق في نفس الشاشة
          window.history.pushState({ screen: stack[0] }, '', window.location.href)
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [exitScreens])

  // ضع أول pushState عند التحميل
  useEffect(() => {
    window.history.pushState({ screen: 'feed' }, '', window.location.href)
  }, [])

  useEffect(() => {
    if (authLoading) return undefined

    if (!user) {
      setCurrentScreenRaw('auth')
      screenHistoryRef.current = ['auth']
      return undefined
    }

    const syncId = setTimeout(() => {
      if (!userLocation) {
        setCurrentScreenRaw('location')
        screenHistoryRef.current = ['location']
      } else {
        setCurrentScreenRaw('feed')
        screenHistoryRef.current = ['feed']
      }
    }, 0)
    return () => clearTimeout(syncId)
  }, [user, authLoading, userLocation])

  const value = useMemo(() => ({
    currentScreen: currentScreen === undefined ? 'feed' : currentScreen,
    setCurrentScreen,
    goBack, // ✅ أضفنا دالة العودة هنا
    userLocation, setUserLocation,
    viewMode, setViewMode,
    bottomNav, setBottomNav,
    activeOrdersTab, setActiveOrdersTab,
    locationAsked, markLocationAsked,
  }), [currentScreen, setCurrentScreen, goBack, userLocation, viewMode, bottomNav, activeOrdersTab, locationAsked, markLocationAsked])

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
