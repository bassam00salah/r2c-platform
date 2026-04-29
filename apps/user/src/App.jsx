import { useApp } from './contexts'
import { useRef, useState, useEffect, useLayoutEffect } from 'react'

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
import ExploreScreen from './screens/ExploreScreen'

// Components
import BottomNav from './components/BottomNav'
import StatusBarSync from './components/StatusBarSync'
import UserAppHeader from './components/UserAppHeader'

const SCREENS = {
  auth: AuthScreen,
  location: LocationScreen,
  feed: FeedScreen,
  grid: GridScreen,
  search: SearchScreen,
  restaurantProfile: RestaurantProfileScreen,
  offerDetails: OfferDetailsScreen,
  confirmOrder: ConfirmOrderScreen,
  waiting: WaitingScreen,
  success: SuccessScreen,
  orders: OrdersScreen,
  profile: ProfileScreen,
  empty: EmptyStateScreen,
  explore: ExploreScreen,
}

const WITH_NAV = ['feed', 'grid', 'search', 'restaurantProfile', 'offerDetails', 'orders', 'profile', 'explore']
const WITH_HEADER = ['grid', 'search', 'restaurantProfile', 'offerDetails', 'confirmOrder', 'waiting', 'orders', 'profile', 'empty', 'explore']

// شاشات يتم الاحتفاظ بها محملة في الخلفية عند التنقل بينها.
// تم استبعاد auth/location لأنهما جزء من بداية التطبيق، واستبعاد waiting/success لأنها شاشات انتقالية.
const KEEP_ALIVE_SCREENS = [
  'feed',
  'grid',
  'search',
  'restaurantProfile',
  'offerDetails',
  'confirmOrder',
  'orders',
  'profile',
  'explore',
]

// لا نغلق الكاش عند waiting/success حتى يظل المستخدم قادرًا على الرجوع لشاشاته السابقة بدون إعادة تحميل.
const RESET_CACHE_SCREENS = ['auth', 'location']

// الشاشات التي تدخل من الأسفل
const SLIDE_UP_SCREENS = ['profile', 'orders']

// تحديد نوع الانتقال
function getTransitionType(from, to, isBack) {
  const toIsUp = SLIDE_UP_SCREENS.includes(to)
  const fromIsUp = SLIDE_UP_SCREENS.includes(from)

  if (toIsUp || fromIsUp) return 'vertical'
  return 'horizontal'
}

function shouldKeepAlive(screen) {
  return KEEP_ALIVE_SCREENS.includes(screen)
}

function shouldResetCache(screen) {
  return RESET_CACHE_SCREENS.includes(screen)
}

const ANIMATION_STYLES = `
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
  @keyframes slideOutLeft {
    from { transform: translateX(0); }
    to   { transform: translateX(-100%); }
  }
  @keyframes slideInLeft {
    from { transform: translateX(-100%); }
    to   { transform: translateX(0); }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); }
    to   { transform: translateX(100%); }
  }
  @keyframes slideInUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes slideOutDown {
    from { transform: translateY(0); }
    to   { transform: translateY(100%); }
  }
  @keyframes slideInDown {
    from { transform: translateY(-100%); }
    to   { transform: translateY(0); }
  }
  @keyframes slideOutUp {
    from { transform: translateY(0); }
    to   { transform: translateY(-100%); }
  }
  .r2c-screen-wrapper {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--r2c-screen-background, #ffffff);
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    will-change: transform;
  }
  .r2c-screen-hidden {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }
  .r2c-screen-backdrop {
    opacity: 1;
    visibility: visible;
    pointer-events: none;
  }
  .r2c-screen-active {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
  .r2c-screen-enter-right  { animation: slideInRight 0.28s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }
  .r2c-screen-enter-left   { animation: slideInLeft  0.28s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }
  .r2c-screen-enter-up     { animation: slideInUp    0.32s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }
  .r2c-screen-enter-down   { animation: slideInDown  0.32s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }
`

const LOADING_WRAPPER_STYLE = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#ffffff',
}

const LOGO_PULSE_STYLE = {
  width: 120,
  height: 120,
  objectFit: 'contain',
  animation: 'r2cLogoPulse 1.8s ease-in-out infinite',
}

export default function App() {
  const { currentScreen, authLoading, restoreScrollRequest } = useApp()
  const activeScreen = authLoading ? 'auth' : (currentScreen ?? 'feed')

  const prevScreenRef = useRef(activeScreen)
  const isBackRef = useRef(false)
  const screenHistoryRef = useRef([activeScreen])
  const screenRefs = useRef({})
  const [animClass, setAnimClass] = useState('')
  const [transitionFromScreen, setTransitionFromScreen] = useState(null)
  const [cachedScreens, setCachedScreens] = useState(() => [activeScreen])

  // أضف الشاشة للكاش عند زيارتها بدل إزالة الشاشة السابقة من الـ DOM.
  useEffect(() => {
    setCachedScreens(prev => {
      if (shouldResetCache(activeScreen)) {
        return [activeScreen]
      }

      const next = prev.filter(screen => shouldKeepAlive(screen) && SCREENS[screen])

      if (shouldKeepAlive(activeScreen) && !next.includes(activeScreen)) {
        next.push(activeScreen)
      }

      // احتفظ بـ feed دائمًا إذا كان قد تم تحميله لأنها أكثر شاشة يلاحظ المستخدم إعادة تحميلها.
      if (prev.includes('feed') && !next.includes('feed')) {
        next.unshift('feed')
      }

      return next.length ? next : [activeScreen]
    })
  }, [activeScreen])

  // استعادة موضع السكرول للشاشة النشطة فقط.
  // مهم: لا نعيد السكرول إلى 0 تلقائيًا عند ظهور شاشة محفوظة في الكاش،
  // لأن ذلك كان يعطي إحساسًا بأن الشاشة ظهرت ثم أعادت التحميل/القفز مرة ثانية.
  useLayoutEffect(() => {
    if (restoreScrollRequest?.screen !== activeScreen) return undefined

    const node = screenRefs.current[activeScreen]
    if (!node) return undefined

    const targetScrollTop = Math.max(0, Number(restoreScrollRequest?.scrollTop) || 0)

    const applyScroll = () => {
      const el = screenRefs.current[activeScreen]
      if (!el) return
      el.scrollTop = targetScrollTop
    }

    applyScroll()
    const raf1 = window.requestAnimationFrame(() => {
      applyScroll()
      window.requestAnimationFrame(applyScroll)
    })
    const t1 = window.setTimeout(applyScroll, 120)
    const t2 = window.setTimeout(applyScroll, 360)

    return () => {
      window.cancelAnimationFrame(raf1)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [activeScreen, restoreScrollRequest])

  // useLayoutEffect يمنع ظهور الشاشة لحظة بدون transition ثم تطبيق الحركة بعدها.
  // هذا كان سبب الإحساس بأن التنقل يحدث مرتين.
  useLayoutEffect(() => {
    const from = prevScreenRef.current
    if (activeScreen === from) return undefined

    const to = activeScreen
    const history = screenHistoryRef.current

    // هل هذا رجوع؟
    const prevIndex = history.indexOf(to)
    const isBack = prevIndex !== -1 && prevIndex < history.length - 1
    isBackRef.current = isBack

    // حدّث التاريخ الخاص باتجاه الحركة فقط.
    if (isBack) {
      screenHistoryRef.current = history.slice(0, prevIndex + 1)
    } else {
      screenHistoryRef.current = [...history, to]
    }

    // حدد نوع الـ animation
    const type = getTransitionType(from, to, isBack)
    let cls = ''
    if (type === 'vertical') {
      cls = isBack ? 'r2c-screen-enter-down' : 'r2c-screen-enter-up'
    } else {
      cls = isBack ? 'r2c-screen-enter-left' : 'r2c-screen-enter-right'
    }

    prevScreenRef.current = to
    setTransitionFromScreen(from)
    setAnimClass(cls)

    const clearTimer = window.setTimeout(() => {
      setAnimClass('')
      setTransitionFromScreen(null)
    }, 380)

    return () => window.clearTimeout(clearTimer)
  }, [activeScreen])

  if (authLoading) {
    return (
      <>
        <StatusBarSync screen={activeScreen} />
        <div style={LOADING_WRAPPER_STYLE}>
          <style>{`
            @keyframes r2cLogoPulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.08); opacity: 0.86; }
            }
          `}</style>
          <img src="/logo.png" alt="R2C" style={LOGO_PULSE_STYLE} />
        </div>
      </>
    )
  }

  const mountedScreens = shouldResetCache(activeScreen)
    ? [activeScreen]
    : Array.from(new Set([
        ...cachedScreens.filter(screen => shouldKeepAlive(screen) && SCREENS[screen]),
        transitionFromScreen,
        activeScreen,
      ].filter(Boolean)))

  const showHeader = WITH_HEADER.includes(activeScreen)

  return (
    <>
      <style>{ANIMATION_STYLES}</style>
      <StatusBarSync screen={activeScreen} />
      <div
        style={{
          height: '100dvh',
          minHeight: '100dvh',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--r2c-screen-background, #ffffff)',
          paddingTop: 0,
        }}
      >
        {mountedScreens.map(screen => {
          const Screen = SCREENS[screen] ?? SCREENS.feed
          const isActive = screen === activeScreen
          const isTransitionBackdrop = !isActive && screen === transitionFromScreen && !!animClass
          const screenHasHeader = WITH_HEADER.includes(screen)

          return (
            <div
              key={screen}
              ref={el => {
                if (el) screenRefs.current[screen] = el
                else delete screenRefs.current[screen]
              }}
              data-r2c-screen-wrapper={isActive ? 'active' : 'inactive'}
              data-r2c-screen={screen}
              aria-hidden={isActive ? 'false' : 'true'}
              className={[
                'r2c-screen-wrapper',
                isActive ? 'r2c-screen-active' : isTransitionBackdrop ? 'r2c-screen-backdrop' : 'r2c-screen-hidden',
                isActive ? animClass : '',
              ].filter(Boolean).join(' ')}
              style={{
                paddingTop: screenHasHeader
                  ? 'calc(var(--r2c-statusbar-space-active, 0px) + var(--r2c-header-height, 64px))'
                  : 0,
                zIndex: isActive ? 3 : isTransitionBackdrop ? 1 : 0,
              }}
            >
              <Screen />
            </div>
          )
        })}

        {showHeader && (
          <div
            style={{
              position: 'absolute',
              top: 'var(--r2c-statusbar-space-active, 0px)',
              left: 0,
              right: 0,
              zIndex: 100,
            }}
          >
            <UserAppHeader />
          </div>
        )}
        {WITH_NAV.includes(activeScreen) && <BottomNav />}
      </div>
    </>
  )
}
