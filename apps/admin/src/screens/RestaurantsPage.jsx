import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '@r2c/shared/firebase/config';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export default function RestaurantsPage() {
  const { restaurants, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [cities, setCities] = useState(['الدمام','الخبر','الجبيل','القطيف']);
  const [form, setForm] = useState({ name: '', category: '', city: 'الدمام', imageUrl: '' });

  useEffect(() => {
    getDoc(doc(db, 'system', 'settings')).then(d => {
      if (d.exists() && d.data().cities) {
        setCities(d.data().cities);
      }
    });
  }, []);

  const filtered = restaurants.filter(r => r.name?.includes(search) || r.city?.includes(search));

  const resetForm = () => {
    setForm({ name: '', category: '', city: cities[0] || 'الدمام', imageUrl: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name) return showToast('أدخل اسم المطعم', 'error');
    try {
      if (editing) {
        await updateDoc(doc(db, 'restaurants', editing.id), { ...form, updatedAt: serverTimestamp() });
        showToast('تم تحديث المطعم');
      } else {
        await addDoc(collection(db, 'restaurants'), { ...form, createdAt: serverTimestamp() });
        showToast('تم إضافة المطعم');
      }
      resetForm();
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`هل تريد حذف "${name}"؟`)) return;
    await deleteDoc(doc(db, 'restaurants', id));
    showToast('تم الحذف');
  };

  const handleEdit = (r) => {
    setEditing(r);
    setForm({ name: r.name||'', category: r.category||'', city: r.city||cities[0]||'الدمام', imageUrl: r.imageUrl||'' });
    setShowForm(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e' }}>المطاعم ({restaurants.length})</h2>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>+ إضافة مطعم</button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." style={{ width: '100%', padding: '10px 16px', border: '2px solid #e5e7eb', borderRadius: '10px', marginBottom: '16px', fontSize: '15px', boxSizing: 'border-box' }} />

      {showForm && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>{editing ? 'تعديل مطعم' : 'إضافة مطعم جديد'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>اسم المطعم</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>التصنيف</label>
              <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>المدينة</label>
              <select value={form.city} onChange={e => setForm({...form, city: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }}>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>رابط الصورة</label>
              <input value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>

          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button onClick={handleSave} style={{ padding: '10px 24px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>حفظ</button>
            <button onClick={resetForm} style={{ padding: '10px 24px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>إلغاء</button>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['الاسم','التصنيف','المدينة','إجراءات'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'right', color: '#374151', fontWeight: '600' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontWeight: '600' }}>{r.name}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{r.category||'-'}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{r.city||'-'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => handleEdit(r)} style={{ padding: '6px 14px', background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: '6px', cursor: 'pointer', marginLeft: '8px' }}>تعديل</button>
                  <button onClick={() => handleDelete(r.id, r.name)} style={{ padding: '6px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>حذف</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>لا توجد مطاعم</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
