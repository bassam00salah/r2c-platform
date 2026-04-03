import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

function AppRoutes() {
  const { user, authLoading, userLocation } = useApp()

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    )
  }

  if (!userLocation) {
    return (
      <Routes>
        <Route path="/location" element={<LocationScreen />} />
        <Route path="*" element={<Navigate to="/location" replace />} />
      </Routes>
    )
  }

  return (
    <div className="pb-20">
      <Routes>
        <Route path="/" element={<Navigate to="/feed" replace />} />
        <Route path="/feed" element={<FeedScreen />} />
        <Route path="/grid" element={<GridScreen />} />
        <Route path="/search" element={<SearchScreen />} />
        <Route path="/restaurant/:id" element={<RestaurantProfileScreen />} />
        <Route path="/offer/:id" element={<OfferDetailsScreen />} />
        <Route path="/confirm" element={<ConfirmOrderScreen />} />
        <Route path="/waiting/:id" element={<WaitingScreen />} />
        <Route path="/success" element={<SuccessScreen />} />
        <Route path="/orders" element={<OrdersScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/empty" element={<EmptyStateScreen />} />
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
