/**
 * contexts/index.js — تقسيم AppContext إلى سياقات مُركَّزة
 *
 * الإصلاحات:
 *  1. [أداء]   تقسيم Context الضخم إلى 3 سياقات مستقلة — كل تغيير يُعيد
 *              render المشتركين فيه فقط، لا كل الشجرة
 *  2. [أداء]   useMemo و useCallback على القيم والدوال المُمرَّرة
 *  3. [معمارية] كل سياق مسؤول عن دورة حياة بياناته فقط
 *
 * الاستخدام:
 *   import { useAuth }      from '../contexts'   // بيانات المستخدم فقط
 *   import { useOfferData } from '../contexts'   // العروض فقط
 *   import { useOrderData } from '../contexts'   // الطلبات فقط
 *   import { useNavigation }from '../contexts'   // التنقل والـ UI state
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, useMemo
} from 'react'
import { useAuth as useSharedAuth, useOffers, useOrders } from '@r2c/shared'

// ─── 1. Auth Context ──────────────────────────────────────────────────────────
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { user, profileData, authLoading } = useSharedAuth()
  const value = useMemo(
    () => ({ user, profileData, authLoading }),
    [user, profileData, authLoading]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthCtx() {
  return useContext(AuthContext)
}

// ─── 2. Offer Data Context ────────────────────────────────────────────────────
const OfferDataContext = createContext(null)

export function OfferDataProvider({ children }) {
  const { offers, loading: loadingOffers } = useOffers()
  const [selectedOffer,      setSelectedOffer]      = useState(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)

  const value = useMemo(() => ({
    offers, loadingOffers,
    selectedOffer,      setSelectedOffer,
    selectedRestaurant, setSelectedRestaurant,
  }), [offers, loadingOffers, selectedOffer, selectedRestaurant])

  return <OfferDataContext.Provider value={value}>{children}</OfferDataContext.Provider>
}

export function useOfferData() {
  return useContext(OfferDataContext)
}

// ─── 3. Order Data Context ────────────────────────────────────────────────────
const OrderDataContext = createContext(null)

export function OrderDataProvider({ children }) {
  const { user } = useContext(AuthContext)
  const { orders } = useOrders({ userId: user?.uid })
  const [currentOrderId, setCurrentOrderId] = useState(null)

  const value = useMemo(() => ({
    orders, currentOrderId, setCurrentOrderId,
  }), [orders, currentOrderId])

  return <OrderDataContext.Provider value={value}>{children}</OrderDataContext.Provider>
}

export function useOrderData() {
  return useContext(OrderDataContext)
}

// ─── 4. Navigation + UI Context ──────────────────────────────────────────────
const NavigationContext = createContext(null)

export function NavigationProvider({ children }) {
  const { user, authLoading } = useContext(AuthContext)
  const [currentScreen,   setCurrentScreenRaw] = useState('auth')
  const [userLocation,    setUserLocation]      = useState(null)
  const [viewMode,        setViewMode]          = useState('feed')
  const [bottomNav,       setBottomNav]         = useState('home')
  const [activeOrdersTab, setActiveOrdersTab]   = useState('current')

  // [أداء] useCallback يمنع إنشاء دالة جديدة كل render
  const setCurrentScreen = useCallback((screen) => {
    setCurrentScreenRaw(screen)
  }, [])

  // توجيه تلقائي بناءً على حالة Auth
  useEffect(() => {
    if (authLoading) return
    setCurrentScreen(user ? 'location' : 'auth')
  }, [user, authLoading, setCurrentScreen])

  const value = useMemo(() => ({
    currentScreen, setCurrentScreen,
    userLocation,  setUserLocation,
    viewMode,      setViewMode,
    bottomNav,     setBottomNav,
    activeOrdersTab, setActiveOrdersTab,
  }), [
    currentScreen, userLocation, viewMode,
    bottomNav, activeOrdersTab, setCurrentScreen
  ])

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useNavigation() {
  return useContext(NavigationContext)
}

// ─── AppProvider الجذر (يجمع كل الـ Providers) ───────────────────────────────
export function AppProvider({ children }) {
  return (
    <AuthProvider>
      <OfferDataProvider>
        <OrderDataProvider>
          <NavigationProvider>
            {children}
          </NavigationProvider>
        </OrderDataProvider>
      </OfferDataProvider>
    </AuthProvider>
  )
}

/**
 * useApp() — للتوافق مع الكود الحالي
 *
 * يجمع كل السياقات في كائن واحد.
 * للمكونات الجديدة: استخدم السياق المُحدَّد مباشرةً (أداء أفضل).
 * للمكونات القديمة: useApp() يعمل بدون تغيير.
 */
export function useApp() {
  const auth    = useContext(AuthContext)
  const offers  = useContext(OfferDataContext)
  const orders  = useContext(OrderDataContext)
  const nav     = useContext(NavigationContext)

  return useMemo(() => ({
    ...auth,
    ...offers,
    ...orders,
    ...nav,
  }), [auth, offers, orders, nav])
}
