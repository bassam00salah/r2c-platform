import {
  createContext, useContext, useState, useEffect,
  useCallback, useMemo
} from 'react'
import { useAuth as useSharedAuth, useOffers, useOrders } from '@r2c/shared'

const AuthContext = createContext(null)
const OfferDataContext = createContext(null)
const OrderDataContext = createContext(null)
const NavigationContext = createContext(null)

export function AuthProvider({ children }) {
  const { user, profileData, authLoading } = useSharedAuth()
  const value = useMemo(() => ({ user, profileData, authLoading }), [user, profileData, authLoading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthCtx() {
  return useContext(AuthContext)
}

export function OfferDataProvider({ children }) {
  const { offers, loading: loadingOffers } = useOffers()
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)

  const value = useMemo(() => ({
    offers,
    loadingOffers,
    selectedOffer,
    setSelectedOffer,
    selectedRestaurant,
    setSelectedRestaurant,
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
  const [userLocation, setUserLocation] = useState(null)
  const [viewMode, setViewMode] = useState('feed')
  const [bottomNav, setBottomNav] = useState('home')
  const [activeOrdersTab, setActiveOrdersTab] = useState('current')

  const setCurrentScreen = useCallback((screen) => {
    setCurrentScreenRaw(screen)
  }, [])

  useEffect(() => {
    if (authLoading) return undefined
    const targetScreen = user ? 'location' : 'auth'
    const syncId = setTimeout(() => {
      setCurrentScreenRaw((prev) => (prev === targetScreen ? prev : targetScreen))
    }, 0)
    return () => clearTimeout(syncId)
  }, [user, authLoading])

  const value = useMemo(() => ({
    currentScreen,
    setCurrentScreen,
    userLocation,
    setUserLocation,
    viewMode,
    setViewMode,
    bottomNav,
    setBottomNav,
    activeOrdersTab,
    setActiveOrdersTab,
  }), [currentScreen, setCurrentScreen, userLocation, viewMode, bottomNav, activeOrdersTab])

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
  const auth = useContext(AuthContext)
  const offers = useContext(OfferDataContext)
  const orders = useContext(OrderDataContext)
  const nav = useContext(NavigationContext)
  return useMemo(() => ({ ...auth, ...offers, ...orders, ...nav }), [auth, offers, orders, nav])
}
