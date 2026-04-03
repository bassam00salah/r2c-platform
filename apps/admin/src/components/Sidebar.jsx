import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import logoSrc from '../assets/logo.png'

const SUPER_ADMIN_MENU = [
  { id: 'overview',    path: '/',            label: 'نظرة عامة', icon: '📊' },
  { id: 'restaurants', path: '/restaurants',  label: 'المطاعم',   icon: '🍽️' },
  { id: 'branches',    path: '/branches',     label: 'الفروع',    icon: '📍' },
  { id: 'offers',      path: '/offers',       label: 'العروض',    icon: '🎁' },
  { id: 'orders',      path: '/orders',       label: 'الطلبات',   icon: '🛍️' },
  { id: 'influencers', path: '/influencers',  label: 'المؤثرين',  icon: '⭐' },
  { id: 'reports',     path: '/reports',      label: 'التقارير',  icon: '📈' },
  { id: 'owners',      path: '/owners',       label: 'ملاك المطاعم', icon: '👤' },
  { id: 'settings',    path: '/settings',     label: 'الإعدادات', icon: '⚙️' },
];

const OWNER_MENU = [
  { id: 'overview',    path: '/',        label: 'نظرة عامة',       icon: '📊' },
  { id: 'branches',    path: '/branches', label: 'فروعي',            icon: '📍' },
  { id: 'offers',      path: '/offers',   label: 'عروضي',            icon: '🎁' },
  { id: 'orders',      path: '/orders',   label: 'طلبات مطعمي',      icon: '🛍️' },
  { id: 'reports',     path: '/reports',  label: 'أداء مطعمي',       icon: '📈' },
];

export default function Sidebar() {
  const { logout, adminUser, userRole, ownedRestaurant, restaurants } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const menu = userRole === 'superAdmin' ? SUPER_ADMIN_MENU : OWNER_MENU;
  const myRestaurant = userRole === 'restaurantOwner'
    ? restaurants.find(r => r.id === ownedRestaurant)
    : null;

  return (
    <div className="w-60 bg-white h-screen fixed right-0 top-0 border-l border-gray-200 flex flex-col z-[100] shadow-sm">
      <div className="p-5 border-b border-gray-100 text-center">
        <img src={logoSrc} alt="R2C Logo" className="h-14 w-auto object-contain mx-auto mb-2" />
        {userRole === 'restaurantOwner' && myRestaurant && (
          <div className="text-sm font-bold text-[#15487d] mb-0.5 truncate px-2">{myRestaurant.name}</div>
        )}
        <div className="text-[11px] text-gray-400 font-medium tracking-wide">
          {userRole === 'superAdmin' ? '🔑 مدير عام' : '🏪 مالك مطعم'}
        </div>
        <div className="text-[10px] text-[#ee7b26] mt-1 bg-orange-50 py-1 px-2 rounded-full inline-block truncate max-w-full">
          ● {adminUser?.email}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
        {menu.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <div
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-l from-[#ee7b26] to-[#ff9a4a] text-white shadow-md font-bold scale-[1.02]'
                  : 'text-gray-600 hover:bg-orange-50 hover:text-[#ee7b26]'
              }`}
            >
              <span className={`text-lg ${isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'}`}>
                {item.icon}
              </span>
              <span className="text-[15px]">{item.label}</span>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white text-red-600 border-2 border-red-100 rounded-xl font-bold text-sm hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm active:scale-95"
        >
          <span>🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
}
