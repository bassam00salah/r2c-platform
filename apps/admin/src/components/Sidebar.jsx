import { useApp } from '../context/AppContext';
import logoSrc from '../assets/logo.png';
import { COLORS } from './adminUi';

const SUPER_ADMIN_MAIN_MENU = [
  { id: 'overview', label: 'نظرة عامة', icon: '📊' },
  { id: 'restaurants', label: 'المطاعم', icon: '🍽️' },
  { id: 'branches', label: 'الفروع', icon: '📍' },
  { id: 'offers', label: 'العروض', icon: '🎁' },
  { id: 'orders', label: 'الطلبات', icon: '🛍️' },
  { id: 'influencers', label: 'المؤثرين', icon: '⭐' },
  { id: 'reports', label: 'التقارير', icon: '📈' },
  { id: 'owners', label: 'ملاك المطاعم', icon: '👤' },
  { id: 'userApp', label: 'تطبيق المستخدم', icon: '📱' },
];

const SUPER_ADMIN_BOTTOM_MENU = [{ id: 'settings', label: 'الإعدادات', icon: '⚙️' }];

const OWNER_MENU = [
  { id: 'overview', label: 'نظرة عامة', icon: '📊' },
  { id: 'branches', label: 'فروعي', icon: '📍' },
  { id: 'offers', label: 'عروضي', icon: '🎁' },
  { id: 'orders', label: 'طلبات مطعمي', icon: '🛍️' },
  { id: 'reports', label: 'أداء مطعمي', icon: '📈' },
];

function MenuItem({ item, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 14px',
        marginBottom: '6px',
        borderRadius: '14px',
        cursor: 'pointer',
        border: active ? 'none' : '1px solid transparent',
        background: active ? 'linear-gradient(135deg, #ee7b26, #ff9a4a)' : 'transparent',
        color: active ? '#fff' : '#4b5563',
        fontWeight: active ? 800 : 600,
        fontSize: '14px',
        textAlign: 'right',
      }}
    >
      <span style={{ fontSize: '18px', width: '22px', textAlign: 'center' }}>{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

export default function Sidebar() {
  const { currentPage, setCurrentPage, logout, adminUser, userRole, ownedRestaurant, restaurants } = useApp();

  const mainMenu = userRole === 'superAdmin' ? SUPER_ADMIN_MAIN_MENU : OWNER_MENU;
  const bottomMenu = userRole === 'superAdmin' ? SUPER_ADMIN_BOTTOM_MENU : [];

  const myRestaurant = userRole === 'restaurantOwner' ? restaurants.find(r => r.id === ownedRestaurant) : null;

  return (
    <aside style={{ width: '260px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', height: '100vh', position: 'fixed', right: 0, top: 0, borderLeft: '1px solid #edf0f5', display: 'flex', flexDirection: 'column', zIndex: 100, boxShadow: '-6px 0 24px rgba(15,23,42,0.04)' }}>
      <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid #edf0f5' }}>
        <div style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #edf0f5', borderRadius: '18px', padding: '16px', textAlign: 'center' }}>
          <img src={logoSrc} alt="R2C Logo" style={{ height: '58px', width: 'auto', objectFit: 'contain', marginBottom: '8px' }} />
          {userRole === 'restaurantOwner' && myRestaurant ? (
            <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.navy, marginBottom: '4px' }}>{myRestaurant.name}</div>
          ) : null}
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{userRole === 'superAdmin' ? '🔑 مدير عام' : '🏪 مالك مطعم'}</div>
          <div style={{ fontSize: '11px', color: COLORS.primary, marginTop: '4px', wordBreak: 'break-word' }}>● {adminUser?.email}</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div>
          {mainMenu.map(item => (
            <MenuItem key={item.id} item={item} active={currentPage === item.id} onClick={() => setCurrentPage(item.id)} />
          ))}
        </div>

        {bottomMenu.length > 0 ? (
          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <div style={{ padding: '0 8px 10px', fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>إعدادات النظام</div>
            <div style={{ height: '1px', background: '#f1f5f9', margin: '0 8px 12px' }} />
            {bottomMenu.map(item => (
              <MenuItem key={item.id} item={item} active={currentPage === item.id} onClick={() => setCurrentPage(item.id)} />
            ))}
          </div>
        ) : null}
      </nav>

      <div style={{ padding: '16px' }}>
        <button
          onClick={logout}
          style={{
            width: '100%',
            padding: '12px',
            background: '#fff',
            color: '#dc2626',
            border: '1.5px solid #fecaca',
            borderRadius: '14px',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          🚪 تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
