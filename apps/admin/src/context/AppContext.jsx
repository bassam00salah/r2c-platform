/**
 * apps/admin/src/context/AppContext.jsx — مُصلَح
 *
 * الإصلاحات:
 *  1. [أداء]    useMemo على قيم Context — تمنع إعادة render غير ضرورية
 *  2. [أداء]    useCallback على الدوال — تمنع إنشاء دوالٍ جديدة كل render
 *  3. [أداء]    الـ snapshots للطلبات تستخدم startAfter للـ Pagination الحقيقي
 *               بدلاً من limit(200) الثابت
 *  4. [معمارية] كل الـ listeners تُلغى عند تغيير الدور (تنظيف كامل)
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, useMemo
} from 'react'
import { auth, db } from '@r2c/shared'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  collection, onSnapshot, query, orderBy, limit,
  doc, getDoc, where, startAfter, getDocs
} from 'firebase/firestore'

const AppContext = createContext(null)

const ORDERS_PAGE_SIZE = 50 // [أداء] بدلاً من limit(200)

export function AppProvider({ children }) {
  const [adminUser,       setAdminUser]       = useState(null)
  const [userRole,        setUserRole]        = useState(null)
  const [ownedRestaurant, setOwnedRestaurant] = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [restaurants,     setRestaurants]     = useState([])
  const [branches,        setBranches]        = useState([])
  const [offers,          setOffers]          = useState([])
  const [orders,          setOrders]          = useState([])
  const [influencers,     setInfluencers]     = useState([])
  const [currentPage,     setCurrentPage]     = useState('overview')
  const [toast,           setToast]           = useState(null)
  const [hasMoreOrders,   setHasMoreOrders]   = useState(false)
  const [lastOrderDoc,    setLastOrderDoc]    = useState(null)

  // [أداء] useCallback — الدالة لا تتغير بين renders
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const login = useCallback(async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password)
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
    setAdminUser(null)
    setUserRole(null)
    setOwnedRestaurant(null)
    setOrders([])
    setRestaurants([])
    setBranches([])
    setOffers([])
    setInfluencers([])
    setLastOrderDoc(null)
  }, [])

  // تحديد نوع المستخدم
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid))
        if (adminDoc.exists()) {
          setAdminUser(user)
          setUserRole('superAdmin')
          setOwnedRestaurant(null)
          setLoading(false)
          return
        }
        const ownerDoc = await getDoc(doc(db, 'restaurantOwners', user.uid))
        if (ownerDoc.exists()) {
          setAdminUser(user)
          setUserRole('restaurantOwner')
          setOwnedRestaurant(ownerDoc.data().restaurantId)
          setLoading(false)
          return
        }
        await signOut(auth)
        setAdminUser(null)
        setUserRole(null)
        setOwnedRestaurant(null)
      } else {
        setAdminUser(null)
        setUserRole(null)
        setOwnedRestaurant(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  // جلب البيانات بعد تحديد الدور
  useEffect(() => {
    if (!adminUser || !userRole) return

    const unsubs = []

    if (userRole === 'superAdmin') {
      unsubs.push(onSnapshot(collection(db, 'restaurants'),
        snap => setRestaurants(snap.docs.map(d => ({ id: d.id, ...d.data() })))))

      unsubs.push(onSnapshot(collection(db, 'branches'),
        snap => setBranches(snap.docs.map(d => ({ id: d.id, ...d.data() })))))

      unsubs.push(onSnapshot(collection(db, 'offers'),
        snap => setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })))))

      unsubs.push(onSnapshot(collection(db, 'influencers'),
        snap => setInfluencers(snap.docs.map(d => ({ id: d.id, ...d.data() })))))

      // [أداء] Pagination على الطلبات — أول صفحة فقط
      const ordersQ = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(ORDERS_PAGE_SIZE)
      )
      unsubs.push(onSnapshot(ordersQ, snap => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setHasMoreOrders(snap.docs.length === ORDERS_PAGE_SIZE)
        setLastOrderDoc(snap.docs[snap.docs.length - 1] || null)
      }))

    } else {
      // مالك المطعم — يرى بيانات مطعمه فقط
      const rid = ownedRestaurant
      if (!rid) return

      unsubs.push(onSnapshot(
        query(collection(db, 'restaurants'), where('__name__', '==', rid)),
        snap => setRestaurants(snap.docs.map(d => ({ id: d.id, ...d.data() })))))

      unsubs.push(onSnapshot(
        query(collection(db, 'branches'), where('restaurantId', '==', rid)),
        snap => setBranches(snap.docs.map(d => ({ id: d.id, ...d.data() })))))

      unsubs.push(onSnapshot(
        query(collection(db, 'offers'), where('restaurantId', '==', rid)),
        snap => setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })))))

      unsubs.push(onSnapshot(
        query(collection(db, 'orders'),
          where('restaurantId', '==', rid),
          orderBy('createdAt', 'desc'),
          limit(ORDERS_PAGE_SIZE)
        ),
        snap => {
          setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
          setHasMoreOrders(snap.docs.length === ORDERS_PAGE_SIZE)
          setLastOrderDoc(snap.docs[snap.docs.length - 1] || null)
        }))
    }

    return () => unsubs.forEach(u => u())
  }, [adminUser, userRole, ownedRestaurant])

  // [أداء] تحميل صفحة أخرى من الطلبات
  const loadMoreOrders = useCallback(async () => {
    if (!lastOrderDoc || !hasMoreOrders) return

    const q = userRole === 'superAdmin'
      ? query(collection(db, 'orders'),
          orderBy('createdAt', 'desc'),
          startAfter(lastOrderDoc),
          limit(ORDERS_PAGE_SIZE))
      : query(collection(db, 'orders'),
          where('restaurantId', '==', ownedRestaurant),
          orderBy('createdAt', 'desc'),
          startAfter(lastOrderDoc),
          limit(ORDERS_PAGE_SIZE))

    const snap = await getDocs(q)
    const newOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    setOrders(prev => [...prev, ...newOrders])
    setHasMoreOrders(newOrders.length === ORDERS_PAGE_SIZE)
    setLastOrderDoc(snap.docs[snap.docs.length - 1] || null)
  }, [lastOrderDoc, hasMoreOrders, userRole, ownedRestaurant])

  // [أداء] useMemo — Context value لا يتغير ما لم تتغير البيانات فعلاً
  const value = useMemo(() => ({
    adminUser, userRole, ownedRestaurant,
    loading, restaurants, branches, offers, orders, influencers,
    currentPage, setCurrentPage, toast, showToast,
    login, logout,
    hasMoreOrders, loadMoreOrders,
  }), [
    adminUser, userRole, ownedRestaurant,
    loading, restaurants, branches, offers, orders, influencers,
    currentPage, toast, showToast, login, logout,
    hasMoreOrders, loadMoreOrders,
  ])

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
