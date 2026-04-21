/**
 * BranchesPage — مع زر تعديل بيانات الفرع
 */

import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { db, functions } from '@r2c/shared/firebase/config';
import { doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { AdminCard, EmptyState, Field, Notice, PageHeader, TableCard, dangerButtonStyle, inputStyle as uiInputStyle, panelStyle, primaryButtonStyle, secondaryButtonStyle, tableCellStyle, tableHeaderStyle } from '../components/adminUi';

function MapPicker({ lat, lng, onLocationChange }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const initMap = () => {
    if (mapInstanceRef.current) return;
    const L = window.L;
    const defaultLat = lat || 26.4207;
    const defaultLng = lng || 50.0888;
    const map = L.map(mapRef.current).setView([defaultLat, defaultLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
    mapInstanceRef.current = map;
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onLocationChange(pos.lat.toFixed(6), pos.lng.toFixed(6));
    });
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onLocationChange(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
    });
  };

  const containerRef = (el) => {
    if (!el) return;
    mapRef.current = el;
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  };

  return (
    <div>
      <Notice tone="blue">اضغط على الخريطة أو اسحب العلامة لتحديد موقع الفرع بدقة.</Notice>
      <div ref={containerRef} style={{ height: '300px', borderRadius: '14px', border: '1.5px solid #e5e7eb', zIndex: 1, marginTop: '10px' }} />
    </div>
  );
}

const EMPTY_FORM = { name: '', restaurantId: '', city: 'الدمام', email: '', password: '', latitude: '', longitude: '' };

function EditModal({ branch, restaurants, onClose, onSave, showToast }) {
  const [form, setForm] = useState({
    name: branch.name || '',
    city: branch.city || '',
    restaurantId: branch.restaurantId || '',
    latitude: branch.latitude != null ? String(branch.latitude) : '',
    longitude: branch.longitude != null ? String(branch.longitude) : '',
  });
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name) return showToast('أدخل اسم الفرع', 'error');
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        city: form.city,
        restaurantId: form.restaurantId || branch.restaurantId,
        updatedAt: serverTimestamp(),
      };
      if (form.latitude && form.longitude) {
        payload.latitude = Number(form.latitude);
        payload.longitude = Number(form.longitude);
      }
      await updateDoc(doc(db, 'branches', branch.id), payload);
      showToast('تم تحديث بيانات الفرع ✅');
      onSave();
    } catch {
      showToast('حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ ...panelStyle, width: '100%', maxWidth: '620px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto', borderRadius: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontWeight: 'bold', fontSize: '18px', color: '#1a1a2e', margin: 0 }}>✏️ تعديل بيانات الفرع</h3>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '16px', color: '#374151' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <Field label="اسم الفرع"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={uiInputStyle} /></Field>
          <Field label="المدينة"><input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={uiInputStyle} /></Field>
          <div style={{ gridColumn: '1 / -1' }}><Field label="المطعم"><select value={form.restaurantId} onChange={e => setForm({ ...form, restaurantId: e.target.value })} style={uiInputStyle}><option value="">اختر مطعم</option>{restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field></div>
          <Field label="خط العرض"><input value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="26.4207" style={uiInputStyle} /></Field>
          <Field label="خط الطول"><input value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="50.0888" style={uiInputStyle} /></Field>

          <div style={{ gridColumn: '1 / -1' }}>
            <button onClick={() => setShowMap(!showMap)} style={{ ...secondaryButtonStyle, borderColor: showMap ? '#e5e7eb' : '#bfdbfe', color: showMap ? '#374151' : '#1d4ed8' }}>📍 {showMap ? 'إخفاء الخريطة' : 'تحديد الموقع على الخريطة'}</button>
            {form.latitude && form.longitude ? <span style={{ marginRight: '12px', fontSize: '13px', color: '#10b981', fontWeight: '600' }}>✅ {form.latitude}, {form.longitude}</span> : null}
          </div>

          {showMap ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <MapPicker lat={Number(form.latitude) || 26.4207} lng={Number(form.longitude) || 50.0888} onLocationChange={(lat, lng) => setForm(f => ({ ...f, latitude: lat, longitude: lng }))} />
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={handleSave} disabled={saving} style={{ ...primaryButtonStyle, flex: 1, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? '⏳ جاري الحفظ...' : '💾 حفظ التعديلات'}</button>
          <button onClick={onClose} disabled={saving} style={secondaryButtonStyle}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

export default function BranchesPage() {
  const { branches, restaurants, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingBranch, setEditingBranch] = useState(null);

  const filtered = branches.filter(b => b.name?.includes(search) || b.city?.includes(search));
  const resetForm = () => { setForm(EMPTY_FORM); setShowForm(false); setShowMap(false); };

  const handleSave = async () => {
    if (!form.name || !form.restaurantId) return showToast('أدخل اسم الفرع والمطعم', 'error');
    if (!form.latitude || !form.longitude) return showToast('حدد موقع الفرع على الخريطة', 'error');
    if (!form.email) return showToast('أدخل البريد الإلكتروني للفرع', 'error');
    if (!form.password || form.password.length < 8) return showToast('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'error');

    setSaving(true);
    try {
      const createBranchUser = httpsCallable(functions, 'createBranchUser');
      const result = await createBranchUser({
        email: form.email,
        password: form.password,
        name: form.name,
        restaurantId: form.restaurantId,
        city: form.city,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      });
      if (!result.data?.success) throw new Error(result.data?.message || 'فشل إنشاء الحساب');
      showToast('تم إضافة الفرع بنجاح');
      resetForm();
    } catch (e) {
      const msg = e?.message?.includes('already-exists') ? 'هذا البريد الإلكتروني مستخدم بالفعل' : (e?.message || 'حدث خطأ أثناء إنشاء الفرع');
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`هل تريد حذف "${name}"؟`)) return;
    await deleteDoc(doc(db, 'branches', id));
    showToast('تم الحذف');
  };

  return (
    <div>
      {editingBranch ? <EditModal branch={editingBranch} restaurants={restaurants} showToast={showToast} onClose={() => setEditingBranch(null)} onSave={() => setEditingBranch(null)} /> : null}

      <PageHeader
        icon="📍"
        title={`الفروع (${branches.length})`}
        description=""
        badge="إدارة الفروع"
        action={<button onClick={() => setShowForm(true)} style={primaryButtonStyle}>+ إضافة فرع</button>}
      />

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 بحث باسم الفرع أو المدينة..." style={{ ...uiInputStyle, marginBottom: '16px' }} />

      {showForm ? (
        <AdminCard style={{ marginBottom: '24px' }}>
          <PageHeader icon="➕" title="إضافة فرع جديد" description="" />
          <Notice tone="green">كلمة المرور <strong>لا تُحفظ</strong> في Firestore — يُنشأ حساب Firebase Auth آمن عبر Cloud Function.</Notice>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '18px' }}>
            <Field label="اسم الفرع"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={uiInputStyle} /></Field>
            <Field label="المطعم"><select value={form.restaurantId} onChange={e => setForm({ ...form, restaurantId: e.target.value })} style={uiInputStyle}><option value="">اختر مطعم</option>{restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
            <Field label="المدينة"><input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={uiInputStyle} /></Field>
            <Field label="البريد الإلكتروني"><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={uiInputStyle} /></Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="كلمة المرور" note="8 أحرف على الأقل — لن تُحفظ في Firestore.">
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="new-password" style={{ ...uiInputStyle, maxWidth: '420px' }} />
              </Field>
            </div>
            <Field label="خط العرض (Latitude)"><input value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="26.4207" style={uiInputStyle} /></Field>
            <Field label="خط الطول (Longitude)"><input value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="50.0888" style={uiInputStyle} /></Field>

            <div style={{ gridColumn: '1 / -1' }}>
              <button onClick={() => setShowMap(!showMap)} style={{ ...secondaryButtonStyle, borderColor: showMap ? '#e5e7eb' : '#bfdbfe', color: showMap ? '#374151' : '#1d4ed8' }}>📍 {showMap ? 'إخفاء الخريطة' : 'تحديد الموقع على الخريطة'}</button>
              {form.latitude && form.longitude ? <div style={{ marginTop: '8px', fontSize: '13px', color: '#10b981', fontWeight: '600' }}>✅ تم تحديد الموقع: {form.latitude}, {form.longitude}</div> : null}
            </div>

            {showMap ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <MapPicker lat={Number(form.latitude) || 26.4207} lng={Number(form.longitude) || 50.0888} onLocationChange={(lat, lng) => setForm(f => ({ ...f, latitude: lat, longitude: lng }))} />
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={handleSave} disabled={saving} style={{ ...primaryButtonStyle, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? '⏳ جاري الإنشاء...' : 'حفظ'}</button>
            <button onClick={resetForm} disabled={saving} style={secondaryButtonStyle}>إلغاء</button>
          </div>
        </AdminCard>
      ) : null}

      <TableCard>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['الاسم', 'المطعم', 'المدينة', 'الإحداثيات', 'إجراءات'].map(h => <th key={h} style={tableHeaderStyle()}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const rest = restaurants.find(r => r.id === b.restaurantId);
              return (
                <tr key={b.id}>
                  <td style={tableCellStyle({ fontWeight: '600' })}>{b.name}</td>
                  <td style={tableCellStyle({ color: '#6b7280' })}>{rest?.name || '-'}</td>
                  <td style={tableCellStyle({ color: '#6b7280' })}>{b.city}</td>
                  <td style={tableCellStyle({ color: '#6b7280', fontSize: '13px' })}>{b.latitude && b.longitude ? `${b.latitude}, ${b.longitude}` : '-'}</td>
                  <td style={tableCellStyle()}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button onClick={() => setEditingBranch(b)} style={{ ...secondaryButtonStyle, padding: '8px 14px', color: '#1d4ed8', borderColor: '#bfdbfe' }}>تعديل</button>
                      <button onClick={() => handleDelete(b.id, b.name)} style={dangerButtonStyle}>حذف</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 ? <EmptyState icon="📍" text="لا توجد فروع" /> : null}
      </TableCard>
    </div>
  );
}
