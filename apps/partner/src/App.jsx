import { useState, useEffect, useCallback } from 'react'
import { auth, db } from '@r2c/shared'
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import LoginScreen from './screens/Loginscreen'
import SetupScreen from './screens/Setupscreen'
import DashboardScreen from './screens/DashboardScreen'
import OrderDetailScreen from './screens/OrderDetailScreen'
import ReportsScreen from './screens/ReportsScreen'
import SettingScreen from './screens/SettingScreen'
import QRScannerScreen from './screens/QRScannerScreen'
import BottomNav from './components/BottomNav'

const WITH_NAV = ['dashboard', 'reports', 'settings']

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login')
  const [currentOrder, setCurrentOrder] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [branchId, setBranchId] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const q = query(collection(db, 'branches'), where('branchEmail', '==', firebaseUser.email))
          const snap = await getDocs(q)
          if (!snap.empty) {
            setBranchId(snap.docs[0].id)
            setCurrentScreen('dashboard')
          } else {
            setBranchId(null)
            setCurrentScreen('setup')
          }
        } catch (error) {
          console.error('خطأ في جلب الفرع:', error)
          setBranchId(null)
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

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#110d35]"><div className="w-12 h-12 border-4 border-[#ee7b26] border-t-transparent rounded-full animate-spin" /></div>

  const commonProps = { setCurrentScreen: nav, showToast, branchId }

  return (
    <div className="relative">
      {currentScreen === 'login' && <LoginScreen onLogin={onLogin} showToast={showToast} />}
      {currentScreen === 'setup' && <SetupScreen {...commonProps} />}
      {currentScreen === 'dashboard' && <DashboardScreen {...commonProps} />}
      {currentScreen === 'orderDetail' && <OrderDetailScreen {...commonProps} order={currentOrder} />}
      {currentScreen === 'reports' && <ReportsScreen {...commonProps} />}
      {currentScreen === 'settings' && <SettingScreen {...commonProps} onLogout={handleLogout} />}
      {currentScreen === 'qrScanner' && <QRScannerScreen {...commonProps} />}
      {WITH_NAV.includes(currentScreen) && <BottomNav currentScreen={currentScreen} setCurrentScreen={nav} />}
      {toast && <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-white text-sm z-50 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>{toast.msg}</div>}
    </div>
  )
}
