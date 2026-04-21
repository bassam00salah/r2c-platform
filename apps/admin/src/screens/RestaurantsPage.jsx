import { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@r2c/shared/firebase/config';
import { useApp } from '../context/AppContext';
import { AdminCard, EmptyState, Field, ImagePreview, Notice, PageHeader, primaryButtonStyle, secondaryButtonStyle, dangerButtonStyle, inputStyle, TableCard, tableCellStyle, tableHeaderStyle } from '../components/adminUi';

export default function RestaurantsPage() {
  const { restaurants, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [cities, setCities] = useState(['الدمام', 'الخبر', 'الجبيل', 'القطيف']);
  const [form, setForm] = useState({ name: '', category: '', city: 'الدمام', imageUrl: '', coverImageUrl: '' });

  useEffect(() => {
    getDoc(doc(db, 'system', 'settings')).then(d => {
      if (d.exists() && d.data().cities) setCities(d.data().cities);
    });
  }, []);

  const filtered = restaurants.filter(r => r.name?.includes(search) || r.city?.includes(search));

  const resetForm = () => {
    setForm({ name: '', category: '', city: cities[0] || 'الدمام', imageUrl: '', coverImageUrl: '' });
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
    } catch {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`هل تريد حذف "${name}"؟`)) return;
    await deleteDoc(doc(db, 'restaurants', id));
    showToast('تم الحذف');
  };

  const handleEdit = (r) => {
    setEditing(r);
    setForm({ name: r.name || '', category: r.category || '', city: r.city || cities[0] || 'الدمام', imageUrl: r.imageUrl || '', coverImageUrl: r.coverImageUrl || '' });
    setShowForm(true);
  };

  return (
    <div>
      <PageHeader
        icon="🍽️"
        title={`المطاعم (${restaurants.length})`}
        description="إدارة المطاعم وبياناتها الأساسية"
        badge="إدارة المحتوى"
        action={<button onClick={() => setShowForm(true)} style={primaryButtonStyle}>+ إضافة مطعم</button>}
      />

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 ابحث باسم المطعم أو المدينة..." style={{ ...inputStyle, marginBottom: '16px' }} />

      {showForm ? (
        <AdminCard style={{ marginBottom: '24px' }}>
          <PageHeader
            icon={editing ? '✏️' : '➕'}
            title={editing ? 'تعديل مطعم' : 'إضافة مطعم جديد'}
            description=""
          />

          <Notice tone="blue">يمكنك استخدام روابط الصور المباشرة للوجو وصورة الغلاف، وستظهر المعاينة أسفل الحقول مباشرة.</Notice>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '18px' }}>
            <Field label="اسم المطعم">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            </Field>

            <Field label="التصنيف">
              <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle} />
            </Field>

            <Field label="المدينة">
              <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={inputStyle}>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <Field label="رابط الصورة (اللوجو)">
              <input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://example.com/logo.jpg" style={inputStyle} />
            </Field>

            <Field label="رابط صورة الغلاف" note="يفضل أن تكون الصورة أفقية وواضحة داخل التطبيق.">
              <input value={form.coverImageUrl} onChange={e => setForm({ ...form, coverImageUrl: e.target.value })} placeholder="https://example.com/cover.jpg" style={inputStyle} />
            </Field>
          </div>

          {(form.imageUrl || form.coverImageUrl) ? (
            <div style={{ display: 'grid', gridTemplateColumns: form.imageUrl && form.coverImageUrl ? '220px 1fr' : '1fr', gap: '16px', marginTop: '18px' }}>
              {form.imageUrl ? (
                <div>
                  <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>معاينة اللوجو</div>
                  <ImagePreview src={form.imageUrl} alt="logo preview" height={84} circle />
                </div>
              ) : null}
              {form.coverImageUrl ? (
                <div>
                  <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>معاينة الغلاف</div>
                  <ImagePreview src={form.coverImageUrl} alt="cover preview" height={120} />
                </div>
              ) : null}
            </div>
          ) : null}

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
              {['الاسم', 'التصنيف', 'المدينة', 'إجراءات'].map(h => <th key={h} style={tableHeaderStyle()}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td style={tableCellStyle({ fontWeight: 800 })}>{r.name}</td>
                <td style={tableCellStyle({ color: '#6b7280' })}>{r.category || '-'}</td>
                <td style={tableCellStyle({ color: '#6b7280' })}>{r.city || '-'}</td>
                <td style={tableCellStyle()}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => handleEdit(r)} style={{ ...secondaryButtonStyle, padding: '8px 14px', color: '#1d4ed8', borderColor: '#bfdbfe' }}>تعديل</button>
                    <button onClick={() => handleDelete(r.id, r.name)} style={dangerButtonStyle}>حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? <EmptyState icon="🍽️" text="لا توجد مطاعم" /> : null}
      </TableCard>
    </div>
  );
}
