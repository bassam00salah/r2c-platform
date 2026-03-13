import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth }   from '@r2c/shared'
import { useOffers } from '@r2c/shared'
import { useOrders } from '@r2c/shared'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { user, profileData, authLoading } = useAuth()
  const { offers, loading: loadingOffers } = useOffers()
  const { orders }                         = useOrders({ userId: user?.uid })

  const [currentScreen,      setCurrentScreen]      = useState('auth')
  const [selectedOffer,      setSelectedOffer]      = useState(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [userLocation,       setUserLocation]       = useState(null)
  const [currentOrderId,     setCurrentOrderId]     = useState(null)
  const [viewMode,           setViewMode]           = useState('feed')
  const [bottomNav,          setBottomNav]          = useState('home')
  const [activeOrdersTab,    setActiveOrdersTab]    = useState('current')

  // توجيه المستخدم بناءً على حالة تسجيل الدخول
  useEffect(() => {
    if (authLoading) return
    if (user) {
      setCurrentScreen('location')
    } else {
      setCurrentScreen('auth')
    }
  }, [user, authLoading])

  return (
    <AppContext.Provider value={{
      user, profileData, authLoading,
      offers, loadingOffers,
      orders,
      currentScreen,      setCurrentScreen,
      selectedOffer,      setSelectedOffer,
      selectedRestaurant, setSelectedRestaurant,
      userLocation,       setUserLocation,
      currentOrderId,     setCurrentOrderId,
      viewMode,           setViewMode,
      bottomNav,          setBottomNav,
      activeOrdersTab,    setActiveOrdersTab,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
