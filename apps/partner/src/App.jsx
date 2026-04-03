import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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

function PartnerRoutes() {
  const [authLoading, setAuthLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [branchId, setBranchId] = useState(null)
  const [user, setUser] = useState(null)
  const [isSetup, setIsSetup] = useState(true)

  const location = useLocation()

  const { orders, loading: ordersLoading } = usePartnerOrders(branchId)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        try {
          const uid = firebaseUser.uid
          const branchSnap = await getDoc(doc(db, 'branches', uid))
          if (branchSnap.exists()) {
            setBranchId(uid)
            setIsSetup(true)
          } else {
            setBranchId(null)
            setIsSetup(false)
          }
        } catch (error) {
          console.error('خطأ في جلب الفرع:', error)
          setBranchId(firebaseUser.uid)
        }
      } else {
        setUser(null)
        setBranchId(null)
      }
      setAuthLoading(false)
    })
    return unsub
  }, [])

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const onLogin = async ({ email, password }) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      showToast('البريد أو كلمة المرور غير صحيحة', 'error')
    }
  }

  const handleLogout = async () => {
    try {
      await auth.signOut()
    } catch (e) {
      showToast('حدث خطأ أثناء تسجيل الخروج', 'error')
    }
  }

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#110d35]">
      <div className="w-12 h-12 border-4 border-[#ee7b26] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginScreen onLogin={onLogin} showToast={showToast} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (!isSetup) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupScreen onComplete={() => setIsSetup(true)} showToast={showToast} />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    )
  }

  const commonProps = { showToast, branchId }
  const withNav = ['/', '/reports', '/settings'].includes(location.pathname)

  return (
    <div className="relative pb-20">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#110d35]">
            <div className="w-12 h-12 border-4 border-[#ee7b26] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<DashboardScreen {...commonProps} orders={orders} ordersLoading={ordersLoading} />} />
          <Route path="/order/:id" element={<OrderDetailScreen {...commonProps} />} />
          <Route path="/reports" element={<ReportsScreen {...commonProps} orders={orders} />} />
          <Route path="/settings" element={<SettingScreen {...commonProps} onLogout={handleLogout} />} />
          <Route path="/qr" element={<QRScannerScreen {...commonProps} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {withNav && <BottomNav />}
      {toast && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-white text-sm z-50 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <PartnerRoutes />
    </BrowserRouter>
  )
}
