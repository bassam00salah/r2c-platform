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

  const Screen = SCREENS[activeScreen] ?? SCREENS.feed
  const showHeader = WITH_HEADER.includes(activeScreen)

  return (
    <>
      <StatusBarSync screen={activeScreen} />
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--r2c-screen-background, #ffffff)',
          paddingTop: 'var(--r2c-statusbar-space-active)',
        }}
      >
        {showHeader && <UserAppHeader />}
        <Screen />
        {WITH_NAV.includes(activeScreen) && <BottomNav />}
      </div>
    </>
  )
}
