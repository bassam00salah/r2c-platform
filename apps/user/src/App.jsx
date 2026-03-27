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
}

const WITH_NAV = ['feed', 'grid', 'search', 'restaurantProfile', 'orders', 'profile']

export default function App() {
  const { currentScreen, authLoading } = useApp()

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const Screen = SCREENS[currentScreen] ?? SCREENS.auth

  return (
    <>
      <Screen />
      {WITH_NAV.includes(currentScreen) && <BottomNav />}
    </>
  )
}
