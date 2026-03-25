import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '@r2c/shared/firebase/config';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc, where } from 'firebase/firestore';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [adminUser,       setAdminUser]       = useState(null);
  const [userRole,        setUserRole]        = useState(null); // 'superAdmin' | 'restaurantOwner'
  const [ownedRestaurant, setOwnedRestaurant] = useState(null); // restaurantId للمالك
  const [loading,         setLoading]         = useState(true);
  const [restaurants,     setRestaurants]     = useState([]);
  const [branches,        setBranches]        = useState([]);
  const [offers,          setOffers]          = useState([]);
  const [orders,          setOrders]          = useState([]);
  const [influencers,     setInfluencers]     = useState([]);
  const [currentPage,     setCurrentPage]     = useState('overview');
  const [toast,           setToast]           = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── تحديد نوع المستخدم ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 1. هل هو سوبر أدمن؟
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists()) {
          setAdminUser(user);
          setUserRole('superAdmin');
          setOwnedRestaurant(null);
          setLoading(false);
          return;
        }
        // 2. هل هو مالك مطعم؟
        const ownerDoc = await getDoc(doc(db, 'restaurantOwners', user.uid));
        if (ownerDoc.exists()) {
          setAdminUser(user);
          setUserRole('restaurantOwner');
          setOwnedRestaurant(ownerDoc.data().restaurantId);
          setLoading(false);
          return;
        }
        // لا صلاحية
        await signOut(auth);
        setAdminUser(null);
        setUserRole(null);
        setOwnedRestaurant(null);
      } else {
        setAdminUser(null);
        setUserRole(null);
        setOwnedRestaurant(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── جلب البيانات بعد تحديد الدور ─────────────────────────────────────────
  useEffect(() => {
    if (!adminUser || !userRole) return;

    const unsubs = [];

    if (userRole === 'superAdmin') {
      // سوبر أدمن يرى كل شيء
      unsubs.push(onSnapshot(collection(db, 'restaurants'), snap =>
        setRestaurants(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(collection(db, 'branches'), snap =>
        setBranches(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(collection(db, 'offers'), snap =>
        setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(
        query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(200)),
        snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(collection(db, 'influencers'), snap =>
        setInfluencers(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
    } else {
      // مالك المطعم — يرى بيانات مطعمه فقط
      const rid = ownedRestaurant;
      if (!rid) return;

      unsubs.push(onSnapshot(
        query(collection(db, 'restaurants'), where('__name__', '==', rid)),
        snap => setRestaurants(snap.docs.map(d => ({ id: d.id, ...d.data() })))));

      unsubs.push(onSnapshot(
        query(collection(db, 'branches'), where('restaurantId', '==', rid)),
        snap => setBranches(snap.docs.map(d => ({ id: d.id, ...d.data() })))));

      unsubs.push(onSnapshot(
        query(collection(db, 'offers'), where('restaurantId', '==', rid)),
        snap => setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })))));

      // الطلبات عبر branchIds
      unsubs.push(onSnapshot(
        query(collection(db, 'orders'), where('restaurantId', '==', rid), orderBy('createdAt', 'desc'), limit(200)),
        snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
    }

    return () => unsubs.forEach(u => u());
  }, [adminUser, userRole, ownedRestaurant]);

  const logout = async () => {
    await signOut(auth);
    setAdminUser(null);
    setUserRole(null);
    setOwnedRestaurant(null);
  };

  return (
    <AppContext.Provider value={{
      adminUser, userRole, ownedRestaurant,
      loading, restaurants, branches, offers, orders, influencers,
      currentPage, setCurrentPage, toast, showToast, logout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
