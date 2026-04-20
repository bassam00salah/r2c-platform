import { AppProvider, useApp } from './context/AppContext';
import LoginScreen from './screens/LoginScreen';
import OverviewPage from './screens/OverviewPage';
import RestaurantsPage from './screens/RestaurantsPage';
import BranchesPage from './screens/BranchesPage';
import OffersPage from './screens/OffersPage';
import OrdersPage from './screens/OrdersPage';
import OwnersPage from './screens/OwnersPage';
import ReportsPage from './screens/ReportsPage';
import { InfluencersPage, SettingsPage } from './screens/OtherPages';
import UserAppPage from './screens/UserAppPage';
import Sidebar from './components/Sidebar';
import logoSrc from './assets/logo.png';
import { COLORS, shadows } from './components/adminUi';

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(180deg, ${COLORS.bg} 0%, #ffffff 100%)` }}>
      <div style={{ textAlign: 'center', background: '#fff', borderRadius: '20px', padding: '34px 42px', boxShadow: shadows.elevated, border: '1px solid #edf0f5' }}>
        <img src={logoSrc} alt="R2C" style={{ width: '120px', height: 'auto', marginBottom: '16px' }} />
        <div style={{ color: COLORS.muted, fontWeight: 700 }}>جاري تحميل لوحة الإدارة...</div>
      </div>
    </div>
  );
}

function AdminApp() {
  const { adminUser, userRole, loading, currentPage, toast } = useApp();

  if (loading) return <LoadingScreen />;
  if (!adminUser) return <LoginScreen />;

  const superAdminPages = {
    overview: <OverviewPage />,
    restaurants: <RestaurantsPage />,
    branches: <BranchesPage />,
    offers: <OffersPage />,
    orders: <OrdersPage />,
    influencers: <InfluencersPage />,
    reports: <ReportsPage />,
    owners: <OwnersPage />,
    settings: <SettingsPage />,
    userApp: <UserAppPage />,
  };

  const ownerPages = {
    overview: <OverviewPage />,
    branches: <BranchesPage readOnly />,
    offers: <OffersPage />,
    orders: <OrdersPage />,
    reports: <ReportsPage />,
  };

  const pages = userRole === 'superAdmin' ? superAdminPages : ownerPages;

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Segoe UI', Tahoma, sans-serif", background: `linear-gradient(180deg, ${COLORS.bg} 0%, #ffffff 100%)`, minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginRight: '260px', padding: '28px 32px 36px', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1400px' }}>
          {pages[currentPage] || <OverviewPage />}
        </div>
      </main>
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: toast.type === 'error' ? COLORS.danger : COLORS.success,
            color: 'white',
            padding: '14px 22px',
            borderRadius: '14px',
            fontWeight: 700,
            zIndex: 9999,
            boxShadow: shadows.elevated,
          }}
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
      <AdminApp />
    </AppProvider>
  );
}
