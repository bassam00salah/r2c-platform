/**
 * BranchesPage — مُصلَح أمنياً
 *
 * الإصلاحات:
 *  1. [أمان حرج]  إزالة حفظ password في Firestore نهائياً
 *  2. [أمان]      إنشاء حساب الفرع عبر Cloud Function فقط (createBranchUser)
 *                 → Firebase Auth + مستند branches بدون كلمة مرور
 *  3. [جودة]      رسالة خطأ واضحة عند فشل إنشاء الحساب
 */

import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { db, functions } from '@r2c/shared/firebase/config';
import { doc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

function MapPicker({ lat, lng, onLocationChange }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initMap = () => {
    if (mapInstanceRef.current) return;
    const L = window.L;
    const defaultLat = lat || 26.4207;
    const defaultLng = lng || 50.0888;
    const map = L.map(mapRef.current).setView([defaultLat, defaultLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
    markerRef.current = marker;
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
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', fontSize: '13px', color: '#0369a1' }}>
        📍 اضغط على الخريطة أو اسحب العلامة لتحديد موقع الفرع
      </div>
      <div ref={containerRef} style={{ height: '300px', borderRadius: '10px', border: '2px solid #e5e7eb', zIndex: 1 }} />
    </div>
  );
}

const EMPTY_FORM = { name: '', restaurantId: '', city: 'الدمام', email: '', password: '', latitude: '', longitude: '' };

export default function BranchesPage() {
  const { branches, restaurants, showToast } = useApp();
  const [search, setSearch]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showMap, setShowMap]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);

  const filtered = branches.filter(b => b.name?.includes(search) || b.city?.includes(search));

  const resetForm = () => { setForm(EMPTY_FORM); setShowForm(false); setShowMap(false); };

  const handleSave = async () => {
    if (!form.name || !form.restaurantId) return showToast('أدخل اسم الفرع والمطعم', 'error');
    if (!form.latitude || !form.longitude) return showToast('حدد موقع الفرع على الخريطة', 'error');
    if (!form.email) return showToast('أدخل البريد الإلكتروني للفرع', 'error');
    if (!form.password || form.password.length < 8) return showToast('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'error');

    setSaving(true);
    try {
      /*
       * [إصلاح أمني] استدعاء Cloud Function بدلاً من حفظ البيانات مباشرة:
       *   ✅ تُنشئ الـ Function حساب Firebase Auth للفرع
       *   ✅ تحفظ مستند branches بدون أي كلمة مرور
       *   ✅ كلمة المرور لا تُمر عبر العميل لـ Firestore أبداً
       */
      const createBranchUser = httpsCallable(functions, 'createBranchUser');
      const result = await createBranchUser({
        email: form.email, password: form.password,
        name: form.name, restaurantId: form.restaurantId,
        city: form.city, latitude: Number(form.latitude), longitude: Number(form.longitude),
      });
      if (!result.data?.success) throw new Error(result.data?.message || 'فشل إنشاء الحساب');
      showToast('تم إضافة الفرع بنجاح');
      resetForm();
    } catch (e) {
      const msg = e?.message?.includes('already-exists')
        ? 'هذا البريد الإلكتروني مستخدم بالفعل'
        : (e?.message || 'حدث خطأ أثناء إنشاء الفرع');
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

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e' }}>الفروع ({branches.length})</h2>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>+ إضافة فرع</button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." style={{ width: '100%', padding: '10px 16px', border: '2px solid #e5e7eb', borderRadius: '10px', marginBottom: '16px', fontSize: '15px', boxSizing: 'border-box' }} />

      {showForm && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>إضافة فرع جديد</h3>

          {/* تنبيه أمان مرئي */}
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#15803d', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            🔒 <span>كلمة المرور <strong>لا تُحفظ</strong> في Firestore — يُنشأ حساب Firebase Auth آمن عبر Cloud Function</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>اسم الفرع</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>المطعم</label>
              <select value={form.restaurantId} onChange={e => setForm({ ...form, restaurantId: e.target.value })} style={inputStyle}>
                <option value="">اختر مطعم</option>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>المدينة</label>
              <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>البريد الإلكتروني</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>
                كلمة المرور
                <span style={{ fontWeight: 'normal', color: '#6b7280', marginRight: '6px', fontSize: '12px' }}>(8 أحرف على الأقل — لن تُحفظ في Firestore)</span>
              </label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="new-password" style={{ ...inputStyle, maxWidth: '400px' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>خط العرض (Latitude)</label>
              <input value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="26.4207" style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>خط الطول (Longitude)</label>
              <input value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="50.0888" style={inputStyle} />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <button onClick={() => setShowMap(!showMap)} style={{ padding: '10px 20px', background: showMap ? '#f3f4f6' : '#15487d', color: showMap ? '#374151' : 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                📍 {showMap ? 'إخفاء الخريطة' : 'تحديد الموقع على الخريطة'}
              </button>
              {form.latitude && form.longitude && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#10b981', fontWeight: '600' }}>✅ تم تحديد الموقع: {form.latitude}, {form.longitude}</div>
              )}
            </div>

            {showMap && (
              <div style={{ gridColumn: '1 / -1' }}>
                <MapPicker lat={Number(form.latitude) || 26.4207} lng={Number(form.longitude) || 50.0888} onLocationChange={(lat, lng) => setForm(f => ({ ...f, latitude: lat, longitude: lng }))} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', background: saving ? '#9ca3af' : '#ee7b26', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {saving ? '⏳ جاري الإنشاء...' : 'حفظ'}
            </button>
            <button onClick={resetForm} disabled={saving} style={{ padding: '10px 24px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>إلغاء</button>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['الاسم', 'المطعم', 'المدينة', 'الإحداثيات', 'إجراءات'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'right', color: '#374151', fontWeight: '600' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const rest = restaurants.find(r => r.id === b.restaurantId);
              return (
                <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>{b.name}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{rest?.name || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{b.city}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>{b.latitude && b.longitude ? `${b.latitude}, ${b.longitude}` : '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => handleDelete(b.id, b.name)} style={{ padding: '6px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>حذف</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>لا توجد فروع</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
