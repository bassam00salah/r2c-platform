import { useEffect, useMemo } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useApp } from './contexts'

// Screens
import AuthScreen from './screens/AuthScreen'
import LocationScreen from './screens/LocationScreen'
import FeedScreen from './screens/FeedScreen'
import GridScreen from './screens/GridScreen'
import SearchScreen from './screens/SearchScreen'
import RestaurantProfileScreen from './screens/RestaurantProfileScreen'
import OfferDetailsScreen from './screens/OfferDetailsScreen'
import ConfirmOrderScreen from './screens/ConfirmOrderScreen'
import WaitingScreen from './screens/WaitingScreen'
import SuccessScreen from './screens/SuccessScreen'
import OrdersScreen from './screens/OrdersScreen'
import ProfileScreen from './screens/ProfileScreen'
import EmptyStateScreen from './screens/EmptyStateScreen'
import ExploreScreen from './screens/ExploreScreen'

// Components
import BottomNav from './components/BottomNav'

const SCREENS = {
  auth: AuthScreen,
  location: LocationScreen,
  feed: FeedScreen,
  grid: GridScreen,
  search: SearchScreen,
  restaurantProfile: RestaurantProfileScreen,
  offerDetails: OfferDetailsScreen,
  confirmOrder: ConfirmOrderScreen,
  waiting: WaitingScreen,
  success: SuccessScreen,
  orders: OrdersScreen,
  profile: ProfileScreen,
  empty: EmptyStateScreen,
  explore: ExploreScreen,
}

const WITH_NAV = ['feed', 'grid', 'search', 'restaurantProfile', 'offerDetails', 'orders', 'profile', 'explore']

const STATUS_BAR_CONFIG = {
  auth:              { color: '#000000', style: Style.Light, padTop: false },
  location:          { color: '#FFFFFF', style: Style.Dark,  padTop: true },
  feed:              { color: '#FFFFFF', style: Style.Dark,  padTop: true },
  grid:              { color: '#ee7b26', style: Style.Light, padTop: true },
  search:            { color: '#FFFFFF', style: Style.Dark,  padTop: true },
  restaurantProfile: { color: '#FFFFFF', style: Style.Dark,  padTop: true },
  offerDetails:      { color: '#FFFFFF', style: Style.Dark,  padTop: true },
  confirmOrder:      { color: '#FFFFFF', style: Style.Dark,  padTop: true },
  waiting:           { color: '#FFF7ED', style: Style.Dark,  padTop: true },
  success:           { color: '#FFFFFF', style: Style.Dark,  padTop: true },
  orders:            { color: '#FFFFFF', style: Style.Dark,  padTop: true },
  profile:           { color: '#FFFFFF', style: Style.Dark,  padTop: true },
  empty:             { color: '#FFFFFF', style: Style.Dark,  padTop: true },
  explore:           { color: '#FFFFFF', style: Style.Dark,  padTop: true },
}

const LOADING_WRAPPER_STYLE = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#ffffff',
}

const LOGO_PULSE_STYLE = {
  width: 120,
  height: 120,
  objectFit: 'contain',
  animation: 'r2cLogoPulse 1.8s ease-in-out infinite',
}

export default function App() {
  const { currentScreen, authLoading } = useApp()

  const isNativeAndroid = Capacitor.getPlatform() === 'android'
  const statusConfig = useMemo(
    () => STATUS_BAR_CONFIG[currentScreen] ?? { color: '#FFFFFF', style: Style.Dark, padTop: true },
    [currentScreen]
  )

  useEffect(() => {
    if (!isNativeAndroid) return

    let cancelled = false

    const applyStatusBar = async () => {
      try {
        await StatusBar.show()

        // ✅ الترتيب الصحيح:
        // 1. نضبط اللون والستايل أولاً
        // 2. ثم نفعّل الـ overlay عشان الـ WebView يمتد فعلاً تحته
        await StatusBar.setBackgroundColor({ color: statusConfig.color })
        await StatusBar.setStyle({ style: statusConfig.style })
        await StatusBar.setOverlaysWebView({ overlay: false })
        await StatusBar.setOverlaysWebView({ overlay: true })

        // تأخير قصير لضمان تطبيق الستايل على بعض أجهزة أندرويد
        window.setTimeout(() => {
          if (cancelled) return
          StatusBar.setStyle({ style: statusConfig.style }).catch(() => {})
        }, 80)
      } catch (error) {
        console.error('StatusBar update failed:', error)
      }
    }

    applyStatusBar()

    return () => {
      cancelled = true
    }
  }, [isNativeAndroid, statusConfig])

  useEffect(() => {
    document.documentElement.style.setProperty('--r2c-statusbar-color', statusConfig.color)
    document.documentElement.style.setProperty(
      '--r2c-statusbar-space-active',
      isNativeAndroid && statusConfig.padTop ? 'var(--r2c-statusbar-space)' : '0px'
    )
  }, [isNativeAndroid, statusConfig])

  if (authLoading) {
    return (
      <div style={LOADING_WRAPPER_STYLE}>
        <style>{`
          @keyframes r2cLogoPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.86; }
          }
        `}</style>
        <img src="/logo.png" alt="R2C" style={LOGO_PULSE_STYLE} />
      </div>
    )
  }

  const Screen = SCREENS[currentScreen] ?? SCREENS.feed

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--r2c-statusbar-color)',
        paddingTop: 'var(--r2c-statusbar-space-active)',
      }}
    >
      <Screen />
      {WITH_NAV.includes(currentScreen) && <BottomNav />}
    </div>
  )
}
