import { useState } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@r2c/shared/firebase/config';
import { useApp } from '../context/AppContext';
import { AdminCard, EmptyState, Field, ImagePreview, Notice, PageHeader, PillButton, TableCard, dangerButtonStyle, inputStyle, primaryButtonStyle, secondaryButtonStyle, textareaStyle, tableCellStyle, tableHeaderStyle } from '../components/adminUi';

export default function OffersPage() {
  const { offers, restaurants, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('نشطة');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', restaurantId: '', discount: 30,
    originalPrice: 100, finalPrice: 70,
    description: '', imageUrl: '', videoUrl: '', mediaType: 'image',
    isFeatured: false,
  });

  const filtered = offers.filter(o => {
    const matchSearch = o.name?.includes(search) || o.description?.includes(search);
    const matchTab = activeTab === 'نشطة' ? (o.status === 'active' || !o.status) : o.status === 'inactive';
    return matchSearch && matchTab;
  });

  const resetForm = () => {
    setForm({ name: '', restaurantId: '', discount: 30, originalPrice: 100, finalPrice: 70, description: '', imageUrl: '', videoUrl: '', mediaType: 'image', isFeatured: false });
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.restaurantId) return showToast('أدخل اسم العرض والمطعم', 'error');
    try {
      const data = { ...form, originalPrice: Number(form.originalPrice), finalPrice: Number(form.finalPrice), discount: Number(form.discount) };
      if (editing) {
        await updateDoc(doc(db, 'offers', editing.id), { ...data, updatedAt: serverTimestamp() });
        showToast('تم تحديث العرض');
      } else {
        await addDoc(collection(db, 'offers'), { ...data, status: 'active', createdAt: serverTimestamp() });
        showToast('تم إضافة العرض');
      }
      resetForm();
    } catch {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`هل تريد حذف "${name}"؟`)) return;
    await deleteDoc(doc(db, 'offers', id));
    showToast('تم الحذف');
  };

  const handleEdit = (o) => {
    setEditing(o);
    setForm({
      name: o.name || '', restaurantId: o.restaurantId || '',
      discount: o.discount || 30, originalPrice: o.originalPrice || 100,
      finalPrice: o.finalPrice || 70, description: o.description || '',
      imageUrl: o.imageUrl || '', videoUrl: o.videoUrl || '',
      mediaType: o.mediaType || 'image', isFeatured: o.isFeatured || false,
    });
    setShowForm(true);
  };

  return (
    <div>
      <PageHeader
        icon="🎁"
        title={`العروض (${offers.length})`}
        description=""
        badge="إدارة العروض"
        action={<button onClick={() => setShowForm(true)} style={primaryButtonStyle}>+ إضافة عرض</button>}
      />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['نشطة', 'منتهية'].map(tab => (
          <PillButton key={tab} label={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)} />
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 بحث باسم العرض أو وصفه..." style={{ ...inputStyle, marginBottom: '16px' }} />

      {showForm ? (
        <AdminCard style={{ marginBottom: '24px' }}>
          <PageHeader icon={editing ? '✏️' : '➕'} title={editing ? 'تعديل عرض' : 'إضافة عرض جديد'} description="" />
          <Notice tone="orange">يمكنك رفع العرض كصورة أو فيديو، وتحديده كعرض مميز ليظهر في الصفحة الرئيسية.</Notice>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '18px' }}>
            <Field label="اسم العرض"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} /></Field>
            <Field label="المطعم">
              <select value={form.restaurantId} onChange={e => setForm({ ...form, restaurantId: e.target.value })} style={inputStyle}>
                <option value="">اختر مطعم</option>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="السعر الأصلي"><input type="number" value={form.originalPrice} onChange={e => setForm({ ...form, originalPrice: e.target.value })} style={inputStyle} /></Field>
            <Field label="السعر النهائي"><input type="number" value={form.finalPrice} onChange={e => setForm({ ...form, finalPrice: e.target.value })} style={inputStyle} /></Field>
            <Field label="نسبة الخصم %"><input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} style={inputStyle} /></Field>
            <Field label="نوع الميديا">
              <select value={form.mediaType} onChange={e => setForm({ ...form, mediaType: e.target.value })} style={inputStyle}>
                <option value="image">صورة</option>
                <option value="video">فيديو</option>
              </select>
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label={form.mediaType === 'image' ? 'رابط الصورة' : 'رابط الفيديو'}>
                <input
                  value={form.mediaType === 'image' ? form.imageUrl : form.videoUrl}
                  onChange={e => setForm({ ...form, [form.mediaType === 'image' ? 'imageUrl' : 'videoUrl']: e.target.value })}
                  placeholder={form.mediaType === 'image' ? 'https://example.com/image.jpg' : 'https://example.com/video.mp4'}
                  style={inputStyle}
                />
              </Field>
              {form.mediaType === 'image' && form.imageUrl ? <ImagePreview src={form.imageUrl} alt="offer preview" height={160} /> : null}
              {form.mediaType === 'video' && form.videoUrl ? <video src={form.videoUrl} controls style={{ width: '100%', maxHeight: '220px', borderRadius: '12px', marginTop: '10px', border: '1px solid #e5e7eb' }} /> : null}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="الوصف"><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} style={textareaStyle} /></Field>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '14px 16px', background: form.isFeatured ? '#fff3e8' : '#f9fafb', border: `1.5px solid ${form.isFeatured ? '#ee7b26' : '#e5e7eb'}`, borderRadius: '14px' }}>
                <input type="checkbox" checked={form.isFeatured} onChange={e => setForm({ ...form, isFeatured: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#ee7b26' }} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: form.isFeatured ? '#ee7b26' : '#374151' }}>⭐ إضافة إلى "عروض مميزة"</span>
                {form.isFeatured ? <span style={{ marginRight: 'auto', fontSize: '12px', color: '#ee7b26', background: '#fff', padding: '3px 9px', borderRadius: '999px', border: '1px solid #fed7aa' }}>سيظهر في الصفحة الرئيسية</span> : null}
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button onClick={handleSave} style={primaryButtonStyle}>حفظ</button>
            <button onClick={resetForm} style={secondaryButtonStyle}>إلغاء</button>
          </div>
        </AdminCard>
      ) : null}

      <TableCard>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['العرض', 'المطعم', 'السعر', 'الخصم', 'النوع', 'مميز', 'إجراءات'].map(h => <th key={h} style={tableHeaderStyle()}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const rest = restaurants.find(r => r.id === o.restaurantId);
              return (
                <tr key={o.id}>
                  <td style={tableCellStyle({ fontWeight: 800 })}>{o.name}</td>
                  <td style={tableCellStyle({ color: '#6b7280' })}>{rest?.name || '-'}</td>
                  <td style={tableCellStyle()}><span style={{ color: '#10b981', fontWeight: 800 }}>{o.finalPrice} ر.س</span><span style={{ color: '#9ca3af', textDecoration: 'line-through', fontSize: '13px', marginRight: '6px' }}>{o.originalPrice}</span></td>
                  <td style={tableCellStyle()}><span style={{ background: '#dcfce7', color: '#16a34a', padding: '5px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>{o.discount}%</span></td>
                  <td style={tableCellStyle()}><span style={{ fontSize: '18px' }}>{o.mediaType === 'video' ? '🎬' : '🖼️'}</span></td>
                  <td style={tableCellStyle({ textAlign: 'center' })}>{o.isFeatured ? <span title="عرض مميز" style={{ fontSize: '18px' }}>⭐</span> : <span style={{ color: '#d1d5db', fontSize: '13px' }}>—</span>}</td>
                  <td style={tableCellStyle()}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button onClick={() => handleEdit(o)} style={{ ...secondaryButtonStyle, padding: '8px 14px', color: '#1d4ed8', borderColor: '#bfdbfe' }}>تعديل</button>
                      <button onClick={() => handleDelete(o.id, o.name)} style={dangerButtonStyle}>حذف</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 ? <EmptyState icon="🎁" text="لا توجد عروض" /> : null}
      </TableCard>
    </div>
  );
}
