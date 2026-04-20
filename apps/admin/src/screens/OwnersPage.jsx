import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from '@r2c/shared/firebase/config';
import { useApp } from '../context/AppContext';
import { AdminCard, EmptyState, Field, Notice, PageHeader, TableCard, dangerButtonStyle, inputStyle, primaryButtonStyle, secondaryButtonStyle, tableCellStyle, tableHeaderStyle } from '../components/adminUi';

export default function OwnersPage() {
  const { restaurants, showToast } = useApp();
  const [owners, setOwners] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', restaurantId: '', name: '' });

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
    if (!form.email || !form.password || !form.restaurantId || !form.name) return showToast('أدخل جميع البيانات', 'error');
    if (form.password.length < 6) return showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');

    setLoading(true);
    try {
      const functions = getFunctions(auth.app);
      const createOwnerUser = httpsCallable(functions, 'createOwnerUser');
      await createOwnerUser({ email: form.email, password: form.password, name: form.name, restaurantId: form.restaurantId });
      showToast('تم إنشاء حساب المالك بنجاح ✅');
      resetForm();
    } catch (err) {
      const msg = err?.details || err?.message || 'حدث خطأ غير متوقع';
      if (msg.includes('already-exists') || msg.includes('مستخدم بالفعل')) showToast('هذا البريد الإلكتروني مستخدم بالفعل', 'error');
      else showToast('حدث خطأ: ' + msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ownerId, ownerEmail) => {
    if (!confirm(`هل تريد حذف حساب "${ownerEmail}"؟`)) return;
    try {
      const functions = getFunctions(auth.app);
      const deleteOwner = httpsCallable(functions, 'deleteOwner');
      await deleteOwner({ ownerId });
      showToast('تم حذف المالك وتعطيل حسابه بنجاح ✅');
    } catch (err) {
      const msg = err?.details || err?.message || 'حدث خطأ غير متوقع';
      showToast('حدث خطأ أثناء الحذف: ' + msg, 'error');
    }
  };

  return (
    <div>
      <PageHeader
        icon="👤"
        title={`ملاك المطاعم (${owners.length})`}
        description="إدارة حسابات ملاك المطاعم مع الحفاظ على نفس منطق الـ Cloud Functions الحالي." 
        badge="إدارة الصلاحيات"
        action={<button onClick={() => setShowForm(true)} style={primaryButtonStyle}>+ إضافة مالك</button>}
      />

      {showForm ? (
        <AdminCard style={{ marginBottom: '24px' }}>
          <PageHeader icon="➕" title="إضافة مالك مطعم جديد" description="سيتم إنشاء حساب تسجيل دخول جديد وربطه بمطعم واحد فقط." />
          <Notice tone="amber">سيتم إنشاء حساب تسجيل دخول جديد بهذا البريد وكلمة المرور، وسيتمكن المالك من رؤية فروع وعروض وطلبات مطعمه فقط.</Notice>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '18px' }}>
            <Field label="الاسم الكامل">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="المطعم">
              <select value={form.restaurantId} onChange={e => setForm({ ...form, restaurantId: e.target.value })} style={inputStyle}>
                <option value="">اختر مطعم</option>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="البريد الإلكتروني">
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="كلمة المرور" note="يجب ألا تقل عن 6 أحرف.">
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={inputStyle} />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button onClick={handleCreate} disabled={loading} style={{ ...primaryButtonStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? '⏳ جاري الإنشاء...' : 'إنشاء الحساب'}</button>
            <button onClick={resetForm} style={secondaryButtonStyle}>إلغاء</button>
          </div>
        </AdminCard>
      ) : null}

      <TableCard>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['الاسم', 'البريد الإلكتروني', 'المطعم', 'إجراءات'].map(h => <th key={h} style={tableHeaderStyle()}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {owners.map(o => {
              const rest = restaurants.find(r => r.id === o.restaurantId);
              return (
                <tr key={o.id}>
                  <td style={tableCellStyle({ fontWeight: 800 })}>{o.name || '-'}</td>
                  <td style={tableCellStyle({ color: '#6b7280' })}>{o.email}</td>
                  <td style={tableCellStyle()}>
                    {rest ? <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '5px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>{rest.name}</span> : <span style={{ color: '#ef4444' }}>مطعم غير موجود</span>}
                  </td>
                  <td style={tableCellStyle()}><button onClick={() => handleDelete(o.id, o.email)} style={dangerButtonStyle}>حذف</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {owners.length === 0 ? <EmptyState icon="👤" text="لا يوجد ملاك مطاعم حتى الآن" /> : null}
      </TableCard>
    </div>
  );
}
