import { AppProvider, useApp } from './context/AppContext';
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

function AdminApp() {
  const { adminUser, userRole, loading, currentPage, toast } = useApp();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px' }}>⚡</div>
        <div style={{ color: '#6b7280' }}>جاري التحميل...</div>
      </div>
    </div>
  );

  if (!adminUser) return <LoginScreen />;

  const superAdminPages = {
    overview:    <OverviewPage />,
    restaurants: <RestaurantsPage />,
    branches:    <BranchesPage />,
    offers:      <OffersPage />,
    orders:      <OrdersPage />,
    influencers: <InfluencersPage />,
    reports:     <ReportsPage />,
    owners:      <OwnersPage />,
    settings:    <SettingsPage />,
  };

  const ownerPages = {
    overview: <OverviewPage />,
    branches: <BranchesPage readOnly />,
    offers:   <OffersPage />,
    orders:   <OrdersPage />,
    reports:  <ReportsPage />,
  };

  const pages = userRole === 'superAdmin' ? superAdminPages : ownerPages;

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Segoe UI', Tahoma, sans-serif", background: '#f3f4f6', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginRight: '240px', padding: '32px', minHeight: '100vh' }}>
        {pages[currentPage] || <OverviewPage />}
      </main>
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white', padding: '12px 24px', borderRadius: '10px', fontWeight: '600', zIndex: 9999 }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return <AppProvider><AdminApp /></AppProvider>;
}
