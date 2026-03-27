import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '@r2c/shared/firebase/config';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export default function OffersPage() {
  const { offers, restaurants, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('نشطة');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', restaurantId: '', discount: 30,
    originalPrice: 100, finalPrice: 70,
    description: '', mediaUrl: '', videoUrl: '', mediaType: 'image'
  });

  const filtered = offers.filter(o => {
    const matchSearch = o.name?.includes(search) || o.description?.includes(search);
    const matchTab = activeTab === 'نشطة' ? (o.status === 'active' || !o.status) : o.status === 'inactive';
    return matchSearch && matchTab;
  });

  const resetForm = () => {
    setForm({ name: '', restaurantId: '', discount: 30, originalPrice: 100, finalPrice: 70, description: '', mediaUrl: '', videoUrl: '', mediaType: 'image' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.restaurantId) return showToast('أدخل اسم العرض والمطعم', 'error');
    try {
      const data = {
        ...form,
        originalPrice: Number(form.originalPrice),
        finalPrice: Number(form.finalPrice),
        discount: Number(form.discount),
      };
      if (editing) {
        await updateDoc(doc(db, 'offers', editing.id), { ...data, updatedAt: serverTimestamp() });
        showToast('تم تحديث العرض');
      } else {
        await addDoc(collection(db, 'offers'), { ...data, status: 'active', createdAt: serverTimestamp() });
        showToast('تم إضافة العرض');
      }
      resetForm();
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`هل تريد حذف "${name}"؟`)) return;
    await deleteDoc(doc(db, 'offers', id));
    showToast('تم الحذف');
  };

  const handleEdit = (o) => {
    setEditing(o);
    setForm({
      name: o.name||'', restaurantId: o.restaurantId||'',
      discount: o.discount||30, originalPrice: o.originalPrice||100,
      finalPrice: o.finalPrice||70, description: o.description||'',
      mediaUrl: o.mediaUrl||'', videoUrl: o.videoUrl||'',
      mediaType: o.mediaType||'image'
    });
    setShowForm(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e' }}>العروض ({offers.length})</h2>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>+ إضافة عرض</button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['نشطة','منتهية'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 20px', background: activeTab===tab?'#ee7b26':'white', color: activeTab===tab?'white':'#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>{tab}</button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." style={{ width: '100%', padding: '10px 16px', border: '2px solid #e5e7eb', borderRadius: '10px', marginBottom: '16px', fontSize: '15px', boxSizing: 'border-box' }} />

      {showForm && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>{editing ? 'تعديل عرض' : 'إضافة عرض جديد'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>اسم العرض</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>المطعم</label>
              <select value={form.restaurantId} onChange={e => setForm({...form, restaurantId: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }}>
                <option value="">اختر مطعم</option>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>السعر الأصلي</label>
              <input type="number" value={form.originalPrice} onChange={e => setForm({...form, originalPrice: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>السعر النهائي</label>
              <input type="number" value={form.finalPrice} onChange={e => setForm({...form, finalPrice: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>نسبة الخصم %</label>
              <input type="number" value={form.discount} onChange={e => setForm({...form, discount: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>نوع الميديا</label>
              <select value={form.mediaType} onChange={e => setForm({...form, mediaType: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }}>
                <option value="image">صورة</option>
                <option value="video">فيديو</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>
                {form.mediaType === 'image' ? 'رابط الصورة' : 'رابط الفيديو'}
              </label>
              <input
                value={form.mediaType === 'image' ? form.mediaUrl : form.videoUrl}
                onChange={e => setForm({...form, [form.mediaType === 'image' ? 'mediaUrl' : 'videoUrl']: e.target.value})}
                placeholder={form.mediaType === 'image' ? 'https://example.com/image.jpg' : 'https://example.com/video.mp4'}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }}
              />
            </div>

            {/* معاينة الميديا */}
            {(form.mediaUrl || form.videoUrl) && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>معاينة</label>
                {form.mediaType === 'image' && form.mediaUrl && (
                  <img src={form.mediaUrl} alt="preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} onError={e => e.target.style.display='none'} />
                )}
                {form.mediaType === 'video' && form.videoUrl && (
                  <video src={form.videoUrl} controls style={{ width: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                )}
              </div>
            )}

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>الوصف</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box', resize: 'vertical' }} />
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
              {['العرض','المطعم','السعر','الخصم','النوع','إجراءات'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'right', color: '#374151', fontWeight: '600' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const rest = restaurants.find(r => r.id === o.restaurantId);
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>{o.name}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{rest?.name||'-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>{o.finalPrice} ر.س</span>
                    <span style={{ color: '#9ca3af', textDecoration: 'line-through', fontSize: '13px', marginRight: '6px' }}>{o.originalPrice}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>{o.discount}%</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '18px' }}>{o.mediaType === 'video' ? '🎬' : '🖼️'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => handleEdit(o)} style={{ padding: '6px 14px', background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: '6px', cursor: 'pointer', marginLeft: '8px' }}>تعديل</button>
                    <button onClick={() => handleDelete(o.id, o.name)} style={{ padding: '6px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>حذف</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>لا توجد عروض</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
