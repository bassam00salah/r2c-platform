import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import LoginScreen    from './screens/LoginScreen';
import OverviewPage   from './screens/OverviewPage';
import RestaurantsPage from './screens/RestaurantsPage';
import BranchesPage   from './screens/BranchesPage';
import OffersPage     from './screens/OffersPage';
import OrdersPage     from './screens/OrdersPage';
import OwnersPage     from './screens/OwnersPage';
import ReportsPage    from './screens/ReportsPage';
import { InfluencersPage, SettingsPage } from './screens/OtherPages';
import Sidebar        from './components/Sidebar';
import logoSrc        from './assets/logo.png';

function AdminRoutes() {
  const { adminUser, userRole, loading, toast } = useApp();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <img src={logoSrc} alt="R2C" className="w-32 h-auto mb-4 mx-auto" />
        <div className="text-gray-500 animate-pulse font-medium">جاري التحميل...</div>
      </div>
    </div>
  );

  if (!adminUser) return <LoginScreen />;

  const isSuperAdmin = userRole === 'superAdmin';

  return (
    <div className="min-h-screen bg-gray-100 font-sans" dir="rtl">
      <Sidebar />
      <main className="mr-60 p-8 min-h-screen transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/restaurants" element={isSuperAdmin ? <RestaurantsPage /> : <Navigate to="/" replace />} />
            <Route path="/branches" element={<BranchesPage readOnly={!isSuperAdmin} />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/influencers" element={isSuperAdmin ? <InfluencersPage /> : <Navigate to="/" replace />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/owners" element={isSuperAdmin ? <OwnersPage /> : <Navigate to="/" replace />} />
            <Route path="/settings" element={isSuperAdmin ? <SettingsPage /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl font-bold shadow-lg z-[9999] animate-bounce text-white ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AdminRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
