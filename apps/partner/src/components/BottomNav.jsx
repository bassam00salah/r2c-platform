import { LayoutDashboard, ClipboardList, Settings } from 'lucide-react'

export default function BottomNav({ currentScreen, setCurrentScreen }) {
  const items = [
    { screen: 'dashboard', icon: LayoutDashboard, label: 'الرئيسية' },
    { screen: 'reports', icon: ClipboardList, label: 'التقارير' },
    { screen: 'settings', icon: Settings, label: 'الإعدادات' },
  ]

  return (
    <div className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-16px)] max-w-xl -translate-x-1/2 px-1">
      <nav
        dir="rtl"
        className="flex items-center gap-2 rounded-[30px] border border-[#ebe4d8] bg-white/95 p-2 shadow-[0_14px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        {items.map((item) => {
          const isActive = currentScreen === item.screen
          const Icon = item.icon

          return (
            <button
              key={item.screen}
              type="button"
              onClick={() => setCurrentScreen(item.screen)}
              className={`flex flex-1 flex-col items-center justify-center rounded-[24px] px-3 py-3 text-xs font-bold transition-all active:scale-[0.98] ${
                isActive
                  ? 'bg-[#fff3e9] text-[#ee7b26] shadow-[0_8px_24px_rgba(238,123,38,0.14)]'
                  : 'text-[#7b8190] hover:bg-[#faf8f4] hover:text-[#374151]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={`mb-1 flex h-9 w-9 items-center justify-center rounded-2xl transition-all ${
                  isActive ? 'bg-white shadow-sm' : 'bg-transparent'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.4 : 2.1} />
              </span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
