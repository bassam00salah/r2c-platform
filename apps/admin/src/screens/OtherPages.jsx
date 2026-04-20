import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '@r2c/shared/firebase/config';
import { collection, addDoc, doc, deleteDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { AdminCard, EmptyState, Field, LoadingBox, Notice, PageHeader, TableCard, dangerButtonStyle, inputStyle as uiInputStyle, primaryButtonStyle, secondaryButtonStyle, tableCellStyle, tableHeaderStyle } from '../components/adminUi';

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
      <PageHeader
        icon="⭐"
        title={`المؤثرون (${influencers.length})`}
        description="إدارة المؤثرين بنفس الوظائف الحالية مع مظهر متناسق مع بقية صفحات لوحة الإدارة."
        badge="إدارة المؤثرين"
        action={<button onClick={() => setShowForm(true)} style={primaryButtonStyle}>+ إضافة مؤثر</button>}
      />

      {showForm ? (
        <AdminCard style={{ marginBottom: '24px' }}>
          <PageHeader icon="➕" title="إضافة مؤثر جديد" description="أدخل البيانات الأساسية ثم احفظها مباشرة في قاعدة البيانات." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {[['name', 'الاسم'], ['followers', 'عدد المتابعين'], ['city', 'المدينة']].map(([key, label]) => (
              <Field key={key} label={label}>
                <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} style={uiInputStyle} />
              </Field>
            ))}
            <Field label="المنصة">
              <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} style={uiInputStyle}>
                {['انستغرام', 'تيك توك', 'يوتيوب', 'سناب شات'].map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={handleSave} style={primaryButtonStyle}>حفظ</button>
            <button onClick={() => setShowForm(false)} style={secondaryButtonStyle}>إلغاء</button>
          </div>
        </AdminCard>
      ) : null}

      <TableCard>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['الاسم', 'المنصة', 'المدينة', 'المتابعون', 'إجراءات'].map(h => <th key={h} style={tableHeaderStyle()}>{h}</th>)}</tr></thead>
          <tbody>
            {influencers.map(inf => (
              <tr key={inf.id}>
                <td style={tableCellStyle({ fontWeight: 700 })}>{inf.name}</td>
                <td style={tableCellStyle({ color: '#6b7280' })}>{inf.platform}</td>
                <td style={tableCellStyle({ color: '#6b7280' })}>{inf.city}</td>
                <td style={tableCellStyle({ color: '#6b7280' })}>{Number(inf.followers || 0).toLocaleString()}</td>
                <td style={tableCellStyle()}><button onClick={() => handleDelete(inf.id, inf.name)} style={dangerButtonStyle}>حذف</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {influencers.length === 0 ? <EmptyState icon="⭐" text="لا يوجد مؤثرون بعد" /> : null}
      </TableCard>
    </div>
  );
}

const DEFAULT_SETTINGS = {
  commission: 10,
  autoAcceptTime: 45,
  cities: ['الدمام', 'الخبر', 'الجبيل', 'القطيف'],
  toggles: { appActive: true, allowAutoAccept: true, influencersActive: true, notificationsActive: true },
};

export function SettingsPage() {
  const { showToast } = useApp();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [newCity, setNewCity] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'system', 'settings'))
      .then(docSnap => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        setSettings(prev => ({
          commission: data.commission ?? prev.commission,
          autoAcceptTime: data.autoAcceptTime ?? prev.autoAcceptTime,
          cities: Array.isArray(data.cities) && data.cities.length > 0 ? data.cities : prev.cities,
          toggles: { ...prev.toggles, ...(data.toggles || {}) },
        }));
      })
      .catch(err => console.error('خطأ في تحميل الإعدادات:', err))
      .finally(() => setLoadingData(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'system', 'settings'), { ...settings }, { merge: true });
      showToast('تم حفظ الإعدادات ✅');
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addCity = () => {
    const trimmed = newCity.trim();
    if (!trimmed) return;
    if (settings.cities.includes(trimmed)) {
      showToast('المدينة موجودة بالفعل', 'error');
      return;
    }
    setSettings(p => ({ ...p, cities: [...p.cities, trimmed] }));
    setNewCity('');
  };

  const removeCity = (city) => {
    setSettings(p => ({ ...p, cities: p.cities.filter(c => c !== city) }));
  };

  const toggleLabels = {
    appActive: 'التطبيق نشط',
    allowAutoAccept: 'القبول التلقائي',
    influencersActive: 'المؤثرون نشطون',
    notificationsActive: 'الإشعارات نشطة',
  };

  if (loadingData) return <LoadingBox text="جاري تحميل الإعدادات..." />;

  return (
    <div>
      <PageHeader
        icon="⚙️"
        title="الإعدادات"
        description="تم الحفاظ على نفس حقول الإعدادات العامة والمدن والتبديلات كما هي، مع تنظيم بصري أوضح."
        badge="إعدادات النظام"
      />

      <div style={{ display: 'grid', gap: '20px' }}>
        <AdminCard>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>الإعدادات العامة</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="نسبة العمولة %">
              <input type="number" min="0" max="100" value={settings.commission} onChange={e => setSettings({ ...settings, commission: Number(e.target.value) })} style={{ ...uiInputStyle, fontSize: '18px', fontWeight: 'bold', color: '#ee7b26' }} />
            </Field>
            <Field label="وقت القبول التلقائي (ثانية)">
              <input type="number" min="10" value={settings.autoAcceptTime} onChange={e => setSettings({ ...settings, autoAcceptTime: Number(e.target.value) })} style={{ ...uiInputStyle, fontSize: '18px', fontWeight: 'bold', color: '#ee7b26' }} />
            </Field>
          </div>
        </AdminCard>

        <AdminCard>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>المدن المتاحة ({settings.cities.length})</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', minHeight: '40px' }}>
            {settings.cities.length === 0 ? <span style={{ color: '#9ca3af', fontSize: '14px' }}>لا توجد مدن — أضف مدينة أدناه</span> : null}
            {settings.cities.map(city => (
              <span key={city} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '7px 14px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: '#1d4ed8' }}>
                {city}
                <span onClick={() => removeCity(city)} title="حذف المدينة" style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 'bold', fontSize: '16px', lineHeight: 1, marginRight: '2px' }}>×</span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input value={newCity} onChange={e => setNewCity(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCity()} placeholder="اسم المدينة الجديدة..." style={{ ...uiInputStyle, flex: 1 }} />
            <button onClick={addCity} style={primaryButtonStyle}>+ إضافة</button>
          </div>
        </AdminCard>

        <AdminCard>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>تفعيل / تعطيل</h3>
          <Notice tone="blue">التبديل يغيّر القيمة داخل `system/settings` مباشرة عند الحفظ، كما في النسخة الأصلية.</Notice>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
            {Object.entries(settings.toggles).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #edf0f5' }}>
                <span style={{ fontWeight: '600' }}>{toggleLabels[key] || key}</span>
                <div onClick={() => setSettings(p => ({ ...p, toggles: { ...p.toggles, [key]: !value } }))} style={{ width: '48px', height: '26px', background: value ? '#ee7b26' : '#d1d5db', borderRadius: '13px', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', right: value ? '3px' : '25px', transition: 'right 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <button onClick={handleSave} disabled={saving} style={{ ...primaryButtonStyle, width: '100%', padding: '14px', opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
}
