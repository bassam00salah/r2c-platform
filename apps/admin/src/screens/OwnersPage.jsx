import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '@r2c/shared/firebase/config';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection, onSnapshot, doc, deleteDoc,
} from 'firebase/firestore';
import { auth } from '@r2c/shared/firebase/config';

export default function OwnersPage() {
  const { restaurants, showToast } = useApp();
  const [owners, setOwners]     = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [form, setForm]         = useState({ email: '', password: '', restaurantId: '', name: '' });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'restaurantOwners'), snap => {
      setOwners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const resetForm = () => {
    setForm({ email: '', password: '', restaurantId: '', name: '' });
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.restaurantId || !form.name)
      return showToast('أدخل جميع البيانات', 'error');
    if (form.password.length < 6)
      return showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');

    setLoading(true);
    try {
      // ✅ استخدام Cloud Function بدلاً من secondary app
      // هذا يتجنب تماماً خطأ FIRESTORE INTERNAL ASSERTION
      const functions = getFunctions(auth.app);
      const createOwnerUser = httpsCallable(functions, 'createOwnerUser');
      await createOwnerUser({
        email:        form.email,
        password:     form.password,
        name:         form.name,
        restaurantId: form.restaurantId,
      });

      showToast('تم إنشاء حساب المالك بنجاح ✅');
      resetForm();
    } catch (err) {
      const msg = err?.details || err?.message || 'حدث خطأ غير متوقع';
      if (msg.includes('already-exists') || msg.includes('مستخدم بالفعل')) {
        showToast('هذا البريد الإلكتروني مستخدم بالفعل', 'error');
      } else {
        showToast('حدث خطأ: ' + msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ownerId, ownerEmail) => {
    if (!confirm(`هل تريد حذف حساب "${ownerEmail}"؟`)) return;
    try {
      await deleteDoc(doc(db, 'restaurantOwners', ownerId));
      showToast('تم حذف المالك ✅  (احذف حساب Auth يدوياً من Firebase Console إن أردت)');
    } catch (e) {
      showToast('حدث خطأ أثناء الحذف', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e' }}>ملاك المطاعم ({owners.length})</h2>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
          + إضافة مالك
        </button>
      </div>

      {/* نموذج الإضافة */}
      {showForm && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>إضافة مالك مطعم جديد</h3>

          <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#92400e' }}>
            ⚠️ سيتم إنشاء حساب تسجيل دخول جديد بهذا البريد وكلمة المرور. سيتمكن المالك من رؤية فروع وعروض وطلبات مطعمه فقط.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>الاسم الكامل</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>المطعم</label>
              <select value={form.restaurantId} onChange={e => setForm({ ...form, restaurantId: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }}>
                <option value="">اختر مطعم</option>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>البريد الإلكتروني</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>كلمة المرور</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button onClick={handleCreate} disabled={loading}
              style={{ padding: '10px 24px', background: loading ? '#9ca3af' : '#ee7b26', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {loading ? '⏳ جاري الإنشاء...' : 'إنشاء الحساب'}
            </button>
            <button onClick={resetForm}
              style={{ padding: '10px 24px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* جدول الملاك */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['الاسم', 'البريد الإلكتروني', 'المطعم', 'إجراءات'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'right', color: '#374151', fontWeight: '600' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {owners.map(o => {
              const rest = restaurants.find(r => r.id === o.restaurantId);
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>{o.name || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{o.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {rest ? (
                      <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
                        {rest.name}
                      </span>
                    ) : <span style={{ color: '#ef4444' }}>مطعم غير موجود</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => handleDelete(o.id, o.email)}
                      style={{ padding: '6px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      حذف
                    </button>
                  </td>
                </tr>
              );
            })}
            {owners.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>لا يوجد ملاك مطاعم حتى الآن</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


export default function OwnersPage() {
  const { restaurants, showToast } = useApp();
  const [owners, setOwners]     = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [form, setForm]         = useState({ email: '', password: '', restaurantId: '', name: '' });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'restaurantOwners'), snap => {
      setOwners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const resetForm = () => {
    setForm({ email: '', password: '', restaurantId: '', name: '' });
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.restaurantId || !form.name)
      return showToast('أدخل جميع البيانات', 'error');
    if (form.password.length < 6)
      return showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');

    setLoading(true);
    try {
      const uid = await createOwnerAccount(form.email, form.password);

      await setDoc(doc(db, 'restaurantOwners', uid), {
        email:        form.email,
        name:         form.name,
        restaurantId: form.restaurantId,
        createdAt:    serverTimestamp(),
      });

      showToast('تم إنشاء حساب المالك بنجاح ✅');
      resetForm();
    } catch (err) {
      if (err.code === 'auth/email-already-in-use')
        showToast('هذا البريد مستخدم بالفعل', 'error');
      else
        showToast('حدث خطأ: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ownerId, ownerEmail) => {
    if (!confirm(`هل تريد حذف حساب "${ownerEmail}"؟`)) return;
    try {
      await deleteDoc(doc(db, 'restaurantOwners', ownerId));
      showToast('تم حذف المالك ✅  (احذف حساب Auth يدوياً من Firebase Console إن أردت)');
    } catch (e) {
      showToast('حدث خطأ أثناء الحذف', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e' }}>ملاك المطاعم ({owners.length})</h2>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
          + إضافة مالك
        </button>
      </div>

      {/* نموذج الإضافة */}
      {showForm && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>إضافة مالك مطعم جديد</h3>

          <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#92400e' }}>
            ⚠️ سيتم إنشاء حساب تسجيل دخول جديد بهذا البريد وكلمة المرور. سيتمكن المالك من رؤية فروع وعروض وطلبات مطعمه فقط.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>الاسم الكامل</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>المطعم</label>
              <select value={form.restaurantId} onChange={e => setForm({ ...form, restaurantId: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }}>
                <option value="">اختر مطعم</option>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>البريد الإلكتروني</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>كلمة المرور</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button onClick={handleCreate} disabled={loading}
              style={{ padding: '10px 24px', background: loading ? '#9ca3af' : '#ee7b26', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {loading ? '⏳ جاري الإنشاء...' : 'إنشاء الحساب'}
            </button>
            <button onClick={resetForm}
              style={{ padding: '10px 24px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* جدول الملاك */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['الاسم', 'البريد الإلكتروني', 'المطعم', 'إجراءات'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'right', color: '#374151', fontWeight: '600' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {owners.map(o => {
              const rest = restaurants.find(r => r.id === o.restaurantId);
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>{o.name || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{o.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {rest ? (
                      <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
                        {rest.name}
                      </span>
                    ) : <span style={{ color: '#ef4444' }}>مطعم غير موجود</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => handleDelete(o.id, o.email)}
                      style={{ padding: '6px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      حذف
                    </button>
                  </td>
                </tr>
              );
            })}
            {owners.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>لا يوجد ملاك مطاعم حتى الآن</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
