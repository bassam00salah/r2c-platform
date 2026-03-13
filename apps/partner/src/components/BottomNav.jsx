import { LayoutDashboard, ClipboardList, Settings } from 'lucide-react'

export default function BottomNav({ currentScreen, setCurrentScreen }) {
  const items = [
    { screen: 'dashboard', icon: LayoutDashboard, label: 'الرئيسية' },
    { screen: 'reports',   icon: ClipboardList,   label: 'التقارير'  },
    { screen: 'settings',  icon: Settings,        label: 'الإعدادات' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#110d35] border-t border-white/10 flex z-40">
      {items.map(({ screen, icon: Icon, label }) => (
        <button
          key={screen}
          onClick={() => setCurrentScreen(screen)}
          className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs
            ${currentScreen === screen ? 'text-[#ee7b26]' : 'text-white/50'}`}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
