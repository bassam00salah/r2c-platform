import { useApp } from './contexts'
import { useRef, useState, useEffect } from 'react'

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
import StatusBarSync from './components/StatusBarSync'
import UserAppHeader from './components/UserAppHeader'

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
const WITH_HEADER = ['grid', 'search', 'restaurantProfile', 'offerDetails', 'confirmOrder', 'waiting', 'success', 'orders', 'profile', 'empty', 'explore']

// الشاشات التي تدخل من الأسفل
const SLIDE_UP_SCREENS = ['profile', 'orders']

// تحديد نوع الانتقال
function getTransitionType(from, to, isBack) {
  const toIsUp = SLIDE_UP_SCREENS.includes(to)
  const fromIsUp = SLIDE_UP_SCREENS.includes(from)

  if (toIsUp || fromIsUp) return 'vertical'
  return 'horizontal'
}

const ANIMATION_STYLES = `
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
  @keyframes slideOutLeft {
    from { transform: translateX(0); }
    to   { transform: translateX(-100%); }
  }
  @keyframes slideInLeft {
    from { transform: translateX(-100%); }
    to   { transform: translateX(0); }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); }
    to   { transform: translateX(100%); }
  }
  @keyframes slideInUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes slideOutDown {
    from { transform: translateY(0); }
    to   { transform: translateY(100%); }
  }
  @keyframes slideInDown {
    from { transform: translateY(-100%); }
    to   { transform: translateY(0); }
  }
  @keyframes slideOutUp {
    from { transform: translateY(0); }
    to   { transform: translateY(-100%); }
  }
  .r2c-screen-wrapper {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .r2c-screen-enter-right  { animation: slideInRight 0.28s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }
  .r2c-screen-enter-left   { animation: slideInLeft  0.28s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }
  .r2c-screen-enter-up     { animation: slideInUp    0.32s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }
  .r2c-screen-enter-down   { animation: slideInDown  0.32s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }
`

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
  const activeScreen = authLoading ? 'auth' : (currentScreen ?? 'feed')

  const prevScreenRef = useRef(activeScreen)
  const isBackRef = useRef(false)
  const screenHistoryRef = useRef([activeScreen])
  const [animClass, setAnimClass] = useState('')
  const [displayScreen, setDisplayScreen] = useState(activeScreen)

  useEffect(() => {
    if (activeScreen === displayScreen) return

    const from = prevScreenRef.current
    const to = activeScreen
    const history = screenHistoryRef.current

    // هل هذا رجوع؟
    const prevIndex = history.indexOf(to)
    const isBack = prevIndex !== -1 && prevIndex < history.length - 1
    isBackRef.current = isBack

    // حدّث التاريخ
    if (isBack) {
      screenHistoryRef.current = history.slice(0, prevIndex + 1)
    } else {
      screenHistoryRef.current = [...history, to]
    }

    // حدد نوع الـ animation
    const type = getTransitionType(from, to, isBack)
    let cls = ''
    if (type === 'vertical') {
      cls = isBack ? 'r2c-screen-enter-down' : 'r2c-screen-enter-up'
    } else {
      cls = isBack ? 'r2c-screen-enter-left' : 'r2c-screen-enter-right'
    }

    prevScreenRef.current = to
    setDisplayScreen(to)
    setAnimClass(cls)
  }, [activeScreen])

  if (authLoading) {
    return (
      <>
        <StatusBarSync screen={activeScreen} />
        <div style={LOADING_WRAPPER_STYLE}>
          <style>{`
            @keyframes r2cLogoPulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.08); opacity: 0.86; }
            }
          `}</style>
          <img src="/logo.png" alt="R2C" style={LOGO_PULSE_STYLE} />
        </div>
      </>
    )
  }

  const Screen = SCREENS[displayScreen] ?? SCREENS.feed
  const showHeader = WITH_HEADER.includes(displayScreen)

  return (
    <>
      <style>{ANIMATION_STYLES}</style>
      <StatusBarSync screen={activeScreen} />
      <div
        style={{
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--r2c-screen-background, #ffffff)',
          paddingTop: 'var(--r2c-statusbar-space-active)',
        }}
      >
        <div
          key={displayScreen}
          className={`r2c-screen-wrapper ${animClass}`}
          style={{ paddingTop: showHeader ? 'var(--r2c-header-height, 56px)' : 0 }}
        >
          <Screen />
        </div>
        {showHeader && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}>
            <UserAppHeader />
          </div>
        )}
        {WITH_NAV.includes(displayScreen) && <BottomNav />}
      </div>
    </>
  )
}
