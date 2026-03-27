import { useApp } from '../contexts'

export default function BottomNav() {
    const { bottomNav, setBottomNav, setCurrentScreen, setViewMode, orders } = useApp()
    const activeOrdersCount = orders.filter(o =>
        ['pending', 'accepted', 'ready'].includes(o.status)
    ).length

    return (
        <div className="modern-nav-container">
            <nav className="modern-nav-bar">

                {/* الرئيسية */}
                <button
                    onClick={() => { setBottomNav('home'); setCurrentScreen('search') }}
                    className={`modern-nav-item ${bottomNav === 'home' ? 'active' : ''}`}
                >
                    <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                    <span>الرئيسية</span>
                </button>

                {/* بحث — يفتح SearchScreen الجديدة */}
                <button
                    onClick={() => { setBottomNav('search'); setViewMode('feed'); setCurrentScreen('feed') }}
                    className={`modern-nav-item ${bottomNav === 'search' ? 'active' : ''}`}
                >
                    <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                    <span>بحث</span>
                </button>

                {/* طلباتي */}
                <button
                    onClick={() => { setBottomNav('orders'); setCurrentScreen('orders') }}
                    className={`modern-nav-item ${bottomNav === 'orders' ? 'active' : ''}`}
                >
                    <svg viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                    <span>طلباتي</span>
                    {activeOrdersCount > 0 && (
                        <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full" />
                    )}
                </button>

                {/* حسابي */}
                <button
                    onClick={() => { setBottomNav('profile'); setCurrentScreen('profile') }}
                    className={`modern-nav-item ${bottomNav === 'profile' ? 'active' : ''}`}
                >
                    <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    <span>حسابي</span>
                </button>

            </nav>
        </div>
    )
}
