import { useState, useEffect } from 'react';
import { db } from '../firebase'; // تأكد من مسار الاستيراد
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const usePartnerOrders = (branchId) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) return;

    // مراقبة الطلبات التي تنتمي لهذا الفرع وحالتها "pending" أو "accepted"
    const q = query(
      collection(db, 'orders'),
      where('branchId', '==', branchId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [branchId]);

  return { orders, loading };
};

