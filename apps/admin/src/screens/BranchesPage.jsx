import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '@r2c/shared/firebase/config';
import { collection, addDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';

function MapPicker({ lat, lng, onLocationChange }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (mapInstanceRef.current) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      const L = window.L;
      const defaultLat = lat || 26.4207;
      const defaultLng = lng || 50.0888;

      const map = L.map(mapRef.current).setView([defaultLat, defaultLng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);

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
    document.head.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div>
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', fontSize: '13px', color: '#0369a1' }}>
        📍 اضغط على الخريطة أو اسحب العلامة لتحديد موقع الفرع
      </div>
      <div ref={mapRef} style={{ height: '300px', borderRadius: '10px', border: '2px solid #e5e7eb', zIndex: 1 }} />
    </div>
  );
}

export default function BranchesPage() {
  const { branches, restaurants, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [form, setForm] = useState({
    name: '', restaurantId: '', city: 'الدمام',
    email: '', password: '', latitude: '', longitude: ''
  });

  const filtered = branches.filter(b => b.name?.includes(search) || b.city?.includes(search));

  const resetForm = () => {
    setForm({ name: '', restaurantId: '', city: 'الدمام', email: '', password: '', latitude: '', longitude: '' });
    setShowForm(false);
    setShowMap(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.restaurantId) return showToast('أدخل اسم الفرع والمطعم', 'error');
    if (!form.latitude || !form.longitude) return showToast('حدد موقع الفرع على الخريطة', 'error');
    try {
      await addDoc(collection(db, 'branches'), {
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        status: 'active',
        createdAt: serverTimestamp()
      });
      showToast('تم إضافة الفرع');
      resetForm();
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`هل تريد حذف "${name}"؟`)) return;
    await deleteDoc(doc(db, 'branches', id));
    showToast('تم الحذف');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e' }}>الفروع ({branches.length})</h2>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>+ إضافة فرع</button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." style={{ width: '100%', padding: '10px 16px', border: '2px solid #e5e7eb', borderRadius: '10px', marginBottom: '16px', fontSize: '15px', boxSizing: 'border-box' }} />

      {showForm && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>إضافة فرع جديد</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>اسم الفرع</label>
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
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>المدينة</label>
              <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>البريد الإلكتروني</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>كلمة المرور</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>

            {/* الإحداثيات */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>خط العرض (Latitude)</label>
              <input value={form.latitude} onChange={e => setForm({...form, latitude: e.target.value})} placeholder="26.4207" style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>خط الطول (Longitude)</label>
              <input value={form.longitude} onChange={e => setForm({...form, longitude: e.target.value})} placeholder="50.0888" style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>

            {/* زر الخريطة */}
            <div style={{ gridColumn: '1 / -1' }}>
              <button
                onClick={() => setShowMap(!showMap)}
                style={{ padding: '10px 20px', background: showMap ? '#f3f4f6' : '#15487d', color: showMap ? '#374151' : 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                📍 {showMap ? 'إخفاء الخريطة' : 'تحديد الموقع على الخريطة'}
              </button>
              {form.latitude && form.longitude && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#10b981', fontWeight: '600' }}>
                  ✅ تم تحديد الموقع: {form.latitude}, {form.longitude}
                </div>
              )}
            </div>

            {showMap && (
              <div style={{ gridColumn: '1 / -1' }}>
                <MapPicker
                  lat={Number(form.latitude) || 26.4207}
                  lng={Number(form.longitude) || 50.0888}
                  onLocationChange={(lat, lng) => setForm(f => ({...f, latitude: lat, longitude: lng}))}
                />
              </div>
            )}

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
              {['الاسم','المطعم','المدينة','الإحداثيات','إجراءات'].map(h => (
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
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{rest?.name||'-'}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{b.city}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>
                    {b.latitude && b.longitude ? `${b.latitude}, ${b.longitude}` : '-'}
                  </td>
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
