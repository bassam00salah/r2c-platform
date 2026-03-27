import { useApp } from '../context/AppContext';

import logoSrc from '../assets/logo.png'

// قائمة الصفحات حسب الدور
const SUPER_ADMIN_MENU = [
  { id: 'overview',    label: 'نظرة عامة', icon: '📊' },
  { id: 'restaurants', label: 'المطاعم',   icon: '🍽️' },
  { id: 'branches',    label: 'الفروع',    icon: '📍' },
  { id: 'offers',      label: 'العروض',    icon: '🎁' },
  { id: 'orders',      label: 'الطلبات',   icon: '🛍️' },
  { id: 'influencers', label: 'المؤثرين',  icon: '⭐' },
  { id: 'reports',     label: 'التقارير',  icon: '📈' },
  { id: 'owners',      label: 'ملاك المطاعم', icon: '👤' },
  { id: 'settings',    label: 'الإعدادات', icon: '⚙️' },
];

const OWNER_MENU = [
  { id: 'overview',    label: 'نظرة عامة',       icon: '📊' },
  { id: 'branches',    label: 'فروعي',            icon: '📍' },
  { id: 'offers',      label: 'عروضي',            icon: '🎁' },
  { id: 'orders',      label: 'طلبات مطعمي',      icon: '🛍️' },
  { id: 'reports',     label: 'أداء مطعمي',       icon: '📈' },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, logout, adminUser, userRole, ownedRestaurant, restaurants } = useApp();

  const menu = userRole === 'superAdmin' ? SUPER_ADMIN_MENU : OWNER_MENU;

  const myRestaurant = userRole === 'restaurantOwner'
    ? restaurants.find(r => r.id === ownedRestaurant)
    : null;

  return (
    <div style={{ width: '240px', background: 'white', height: '100vh', position: 'fixed', right: 0, top: 0, borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', zIndex: 100 }}>

      {/* Header */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
      <img src={logoSrc} alt="R2C Logo" style={{ height: '60px', width: 'auto', objectFit: 'contain', marginBottom: '4px' }} />
        {userRole === 'restaurantOwner' && myRestaurant && (
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#15487d', marginBottom: '2px' }}>{myRestaurant.name}</div>
        )}
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
          {userRole === 'superAdmin' ? '🔑 مدير عام' : '🏪 مالك مطعم'}
        </div>
        <div style={{ fontSize: '11px', color: '#ee7b26', marginTop: '2px' }}>● {adminUser?.email}</div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {menu.map(item => (
          <div
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '11px 16px', marginBottom: '2px', borderRadius: '10px', cursor: 'pointer',
              background: currentPage === item.id ? 'linear-gradient(135deg, #ee7b26, #ff9a4a)' : 'transparent',
              color: currentPage === item.id ? 'white' : '#4b5563',
              fontWeight: currentPage === item.id ? 'bold' : 'normal',
              fontSize: '15px',
            }}
          >
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '16px' }}>
        <button
          onClick={logout}
          style={{
            width: '100%', padding: '11px', background: '#fff', color: '#dc2626',
            border: '1.5px solid #fca5a5', borderRadius: '10px', cursor: 'pointer',
            fontWeight: 'bold', fontSize: '15px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          🚪 تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
