import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { auth, db, usePartnerOrders }                  from '@r2c/shared'
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc }                                 from 'firebase/firestore'
import BottomNav                                       from './components/BottomNav'

const LoginScreen       = lazy(() => import('./screens/Loginscreen'))
const SetupScreen       = lazy(() => import('./screens/Setupscreen'))
const DashboardScreen   = lazy(() => import('./screens/DashboardScreen'))
const OrderDetailScreen = lazy(() => import('./screens/OrderDetailScreen'))
const ReportsScreen     = lazy(() => import('./screens/ReportsScreen'))
const SettingScreen     = lazy(() => import('./screens/SettingScreen'))
const QRScannerScreen   = lazy(() => import('./screens/QRScannerScreen'))

const WITH_NAV = ['dashboard', 'reports', 'settings']

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login')
  const [currentOrder, setCurrentOrder] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [branchId, setBranchId] = useState(null)

  // ── يجب أن يكون قبل أي early return — Rules of Hooks ──
  const { orders, loading: ordersLoading } = usePartnerOrders(branchId)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // ✅ الإصلاح: ضبط branchId فوراً بمجرد معرفة الـ uid
          // بدلاً من الانتظار حتى اكتمال getDoc
          // هذا يُطلق الـ listener في usePartnerOrders أسرع
          const uid = firebaseUser.uid

          // جلب بيانات الفرع
          const branchSnap = await getDoc(doc(db, 'branches', uid))

          if (branchSnap.exists()) {
            // ✅ ضبط branchId أولاً لبدء الاستماع للطلبات فوراً
            setBranchId(uid)
            setCurrentScreen('dashboard')
          } else {
            setBranchId(null)
            setCurrentScreen('setup')
          }
        } catch (error) {
          console.error('خطأ في جلب الفرع:', error)
          // ✅ حتى في حالة الخطأ، جرّب تعيين branchId للـ uid
          // لأن الخطأ قد يكون مؤقتاً في الاتصال
          setBranchId(firebaseUser.uid)
          setCurrentScreen('dashboard')
        }
      } else {
        setBranchId(null)
        setCurrentScreen('login')
      }
      setAuthLoading(false)
    })
    return unsub
  }, [])

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const nav = useCallback((screen, order = null) => {
    if (order) setCurrentOrder(order)
    setCurrentScreen(screen)
  }, [])

  const onLogin = async ({ email, password }) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch {
      showToast('البريد أو كلمة المرور غير صحيحة', 'error')
    }
  }

  const handleLogout = async () => {
    try {
      await auth.signOut()
    } catch {
      showToast('حدث خطأ أثناء تسجيل الخروج', 'error')
    }
  }

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#110d35]">
      <div className="w-12 h-12 border-4 border-[#ee7b26] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const commonProps = { setCurrentScreen: nav, showToast, branchId }

  return (
    <div className="relative">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#110d35]">
            <div className="w-12 h-12 border-4 border-[#ee7b26] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        {currentScreen === 'login'       && <LoginScreen       onLogin={onLogin} showToast={showToast} />}
        {currentScreen === 'setup'       && <SetupScreen       onComplete={() => nav('settings')} showToast={showToast} />}
        {currentScreen === 'dashboard'   && <DashboardScreen   {...commonProps} orders={orders} ordersLoading={ordersLoading} />}
        {currentScreen === 'orderDetail' && <OrderDetailScreen {...commonProps} order={currentOrder} />}
        {currentScreen === 'reports'     && <ReportsScreen     {...commonProps} orders={orders} />}
        {currentScreen === 'settings'    && <SettingScreen     {...commonProps} onLogout={handleLogout} />}
        {currentScreen === 'qrScanner'   && <QRScannerScreen   {...commonProps} />}
      </Suspense>
      {WITH_NAV.includes(currentScreen) && <BottomNav currentScreen={currentScreen} setCurrentScreen={nav} />}
      {toast && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-white text-sm z-50 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
