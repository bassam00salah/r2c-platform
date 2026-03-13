import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '@r2c/shared/firebase/config';
import { collection, addDoc, doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function InfluencersPage() {
  const { influencers, showToast } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', platform: 'انستغرام', city: 'الدمام', followers: '' });

  const handleSave = async () => {
    if (!form.name) return showToast('أدخل الاسم', 'error');
    await addDoc(collection(db, 'influencers'), { ...form, orders: 0, createdAt: serverTimestamp() });
    showToast('تم إضافة المؤثر');
    setForm({ name: '', platform: 'انستغرام', city: 'الدمام', followers: '' });
    setShowForm(false);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`حذف "${name}"؟`)) return;
    await deleteDoc(doc(db, 'influencers', id));
    showToast('تم الحذف');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e' }}>المؤثرون ({influencers.length})</h2>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>+ إضافة مؤثر</button>
      </div>
      {showForm && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[['name','الاسم'],['followers','عدد المتابعين'],['city','المدينة']].map(([key,label]) => (
              <div key={key}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>{label}</label>
                <input value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>المنصة</label>
              <select value={form.platform} onChange={e => setForm({...form, platform: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }}>
                {['انستغرام','تيك توك','يوتيوب','سناب شات'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button onClick={handleSave} style={{ padding: '10px 24px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>حفظ</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '10px 24px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>إلغاء</button>
          </div>
        </div>
      )}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            {['الاسم','المنصة','المدينة','المتابعون','إجراءات'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'right', color: '#374151', fontWeight: '600' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {influencers.map(inf => (
              <tr key={inf.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontWeight: '600' }}>{inf.name}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{inf.platform}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{inf.city}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{Number(inf.followers||0).toLocaleString()}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => handleDelete(inf.id, inf.name)} style={{ padding: '6px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { showToast } = useApp();
  const [settings, setSettings] = useState({ commission: 10, autoAcceptTime: 45, cities: ['الدمام','الخبر','الجبيل','القطيف'], toggles: { appActive: true, allowAutoAccept: true, influencersActive: true, notificationsActive: true } });
  const [newCity, setNewCity] = useState('');

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'system', 'settings'), settings, { merge: true });
      showToast('تم حفظ الإعدادات');
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const toggleLabels = { appActive: 'التطبيق نشط', allowAutoAccept: 'القبول التلقائي', influencersActive: 'المؤثرون نشطون', notificationsActive: 'الإشعارات نشطة' };

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '24px' }}>الإعدادات</h2>
      <div style={{ display: 'grid', gap: '20px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>الإعدادات العامة</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>نسبة العمولة %</label>
              <input type="number" value={settings.commission} onChange={e => setSettings({...settings, commission: Number(e.target.value)})} style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', color: '#ee7b26', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>وقت القبول التلقائي (ثانية)</label>
              <input type="number" value={settings.autoAcceptTime} onChange={e => setSettings({...settings, autoAcceptTime: Number(e.target.value)})} style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', color: '#ee7b26', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>المدن المتاحة</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {settings.cities.map(city => (
              <span key={city} style={{ background: '#f3f4f6', padding: '6px 14px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {city}
                <span onClick={() => setSettings(p => ({...p, cities: p.cities.filter(c => c !== city)}))} style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}>×</span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="مدينة جديدة" style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            <button onClick={() => { if(newCity.trim()){ setSettings(p=>({...p,cities:[...p.cities,newCity.trim()]})); setNewCity(''); }}} style={{ padding: '8px 16px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>إضافة</button>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>تفعيل / تعطيل</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {Object.entries(settings.toggles).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f9fafb', borderRadius: '10px' }}>
                <span style={{ fontWeight: '600' }}>{toggleLabels[key]}</span>
                <div onClick={() => setSettings(p => ({...p, toggles: {...p.toggles, [key]: !value}}))} style={{ width: '48px', height: '26px', background: value?'#ee7b26':'#d1d5db', borderRadius: '13px', cursor: 'pointer', position: 'relative' }}>
                  <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', right: value?'3px':'25px', transition: 'right 0.2s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={handleSave} style={{ padding: '14px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>حفظ الإعدادات</button>
      </div>
    </div>
  );
}
