import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '@r2c/shared/firebase/config';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [branches, setBranches] = useState([]);
  const [offers, setOffers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [influencers, setInfluencers] = useState([]);
  const [currentPage, setCurrentPage] = useState('overview');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists()) {
          setAdminUser(user);
        } else {
          await signOut(auth);
          setAdminUser(null);
        }
      } else {
        setAdminUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!adminUser) return;
    const unsubRestaurants = onSnapshot(collection(db, 'restaurants'), snap => {
      setRestaurants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubBranches = onSnapshot(collection(db, 'branches'), snap => {
      setBranches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubOffers = onSnapshot(collection(db, 'offers'), snap => {
      setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), orderBy('timestamp', 'desc'), limit(200)),
      snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubInfluencers = onSnapshot(collection(db, 'influencers'), snap => {
      setInfluencers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubRestaurants(); unsubBranches(); unsubOffers(); unsubOrders(); unsubInfluencers(); };
  }, [adminUser]);

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setAdminUser(null);
  };

  return (
    <AppContext.Provider value={{
      adminUser, loading, restaurants, branches, offers, orders, influencers,
      currentPage, setCurrentPage, toast, showToast, login, logout
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
