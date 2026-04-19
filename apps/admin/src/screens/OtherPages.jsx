import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '@r2c/shared/firebase/config';
import { collection, addDoc, doc, deleteDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

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

const DEFAULT_SETTINGS = {
  commission: 10,
  autoAcceptTime: 45,
  cities: ['الدمام', 'الخبر', 'الجبيل', 'القطيف'],
  toggles: { appActive: true, allowAutoAccept: true, influencersActive: true, notificationsActive: true },
};

export function SettingsPage() {
  const { showToast, restaurants } = useApp();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [newCity, setNewCity]   = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving]     = useState(false);

  // إعدادات البانر الإعلاني
  const [bannerRestaurantId,   setBannerRestaurantId]   = useState('');
  const [bannerRestaurantName, setBannerRestaurantName] = useState('');
  const [bannerText,           setBannerText]           = useState('');
  const [bannerImageUrl,       setBannerImageUrl]       = useState('');   // البانر 1
  const [banner2ImageUrl,      setBanner2ImageUrl]      = useState('');   // البانر 2
  const [banner3ImageUrl,      setBanner3ImageUrl]      = useState('');   // البانر 3
  // ── قائمة شرائح البانر الأول ──
  const [banners,              setBanners]              = useState([]);   // [{imageUrl, restaurantId, restaurantName}]
  const [newBannerUrl,         setNewBannerUrl]         = useState('');
  const [newBannerRestId,      setNewBannerRestId]      = useState('');
  const [newBannerRestName,    setNewBannerRestName]    = useState('');
  // ── قائمة شرائح البانر الثالث ──
  const [banners3,             setBanners3]             = useState([]);   // [{imageUrl}]
  const [newBanner3Url,        setNewBanner3Url]        = useState('');

  useEffect(() => {
    getDoc(doc(db, 'system', 'settings'))
      .then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings(prev => ({
            commission:     data.commission     ?? prev.commission,
            autoAcceptTime: data.autoAcceptTime ?? prev.autoAcceptTime,
            cities:         Array.isArray(data.cities) && data.cities.length > 0 ? data.cities : prev.cities,
            toggles:        { ...prev.toggles, ...(data.toggles || {}) },
          }));
          if (data.bannerRestaurantId)   setBannerRestaurantId(data.bannerRestaurantId);
          if (data.bannerRestaurantName) setBannerRestaurantName(data.bannerRestaurantName);
          if (data.bannerText)           setBannerText(data.bannerText);
          if (data.bannerImageUrl)       setBannerImageUrl(data.bannerImageUrl);
          if (data.banner2ImageUrl)      setBanner2ImageUrl(data.banner2ImageUrl);
          if (data.banner3ImageUrl)      setBanner3ImageUrl(data.banner3ImageUrl);
          if (Array.isArray(data.banners)) setBanners(data.banners);
          if (Array.isArray(data.banners3)) setBanners3(data.banners3);
        }
      })
      .catch(err => console.error('خطأ في تحميل الإعدادات:', err))
      .finally(() => setLoadingData(false));
  }, []);

  const handleBannerRestaurantChange = (e) => {
    const id = e.target.value;
    setBannerRestaurantId(id);
    const rest = (restaurants || []).find(r => r.id === id);
    setBannerRestaurantName(rest ? rest.name : '');
  };

  // ── إضافة شريحة بانر جديدة ──
  const handleAddBannerSlide = () => {
    if (!newBannerUrl.trim()) return showToast('أدخل رابط الصورة', 'error');
    const rest = newBannerRestId ? (restaurants || []).find(r => r.id === newBannerRestId) : null;
    setBanners(prev => [...prev, {
      imageUrl:       newBannerUrl.trim(),
      restaurantId:   newBannerRestId   || null,
      restaurantName: rest ? rest.name  : (newBannerRestName || null),
    }]);
    setNewBannerUrl('');
    setNewBannerRestId('');
    setNewBannerRestName('');
    showToast('تمت إضافة الشريحة — احفظ الإعدادات لتطبيقها');
  };

  // ── حذف شريحة ──
  const handleRemoveBannerSlide = (idx) => {
    setBanners(prev => prev.filter((_, i) => i !== idx));
  };

  // ── تحريك شريحة لأعلى ──
  const handleMoveBannerSlide = (idx, dir) => {
    setBanners(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  // ── شرائح البانر الثالث ──
  const handleAddBanner3Slide = () => {
    if (!newBanner3Url.trim()) return showToast('أدخل رابط الصورة', 'error');
    setBanners3(prev => [...prev, { imageUrl: newBanner3Url.trim() }]);
    setNewBanner3Url('');
    showToast('تمت إضافة الشريحة — احفظ الإعدادات لتطبيقها');
  };

  const handleRemoveBanner3Slide = (idx) => {
    setBanners3(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMoveBanner3Slide = (idx, dir) => {
    setBanners3(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'system', 'settings'), {
        ...settings,
        bannerRestaurantId:   bannerRestaurantId   || null,
        bannerRestaurantName: bannerRestaurantName || null,
        bannerText:           bannerText           || null,
        bannerImageUrl:       bannerImageUrl       || null,
        banner2ImageUrl:      banner2ImageUrl      || null,
        banner3ImageUrl:      banner3ImageUrl      || null,
        banners:              banners,
        banners3:             banners3,
      }, { merge: true });
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
    appActive:           'التطبيق نشط',
    allowAutoAccept:     'القبول التلقائي',
    influencersActive:   'المؤثرون نشطون',
    notificationsActive: 'الإشعارات نشطة',
  };

  if (loadingData) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: '#9ca3af' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
        <div>جاري تحميل الإعدادات...</div>
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '24px' }}>الإعدادات</h2>
      <div style={{ display: 'grid', gap: '20px' }}>

        {/* الإعدادات العامة */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>الإعدادات العامة</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>نسبة العمولة %</label>
              <input type="number" min="0" max="100"
                value={settings.commission}
                onChange={e => setSettings({ ...settings, commission: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', color: '#ee7b26', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>وقت القبول التلقائي (ثانية)</label>
              <input type="number" min="10"
                value={settings.autoAcceptTime}
                onChange={e => setSettings({ ...settings, autoAcceptTime: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', color: '#ee7b26', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        {/* المدن */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>المدن المتاحة ({settings.cities.length})</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', minHeight: '40px' }}>
            {settings.cities.length === 0 && (
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>لا توجد مدن — أضف مدينة أدناه</span>
            )}
            {settings.cities.map(city => (
              <span key={city} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: '#1d4ed8' }}>
                {city}
                <span
                  onClick={() => removeCity(city)}
                  title="حذف المدينة"
                  style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 'bold', fontSize: '16px', lineHeight: 1, marginRight: '2px' }}
                >×</span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={newCity}
              onChange={e => setNewCity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCity()}
              placeholder="اسم المدينة الجديدة..."
              style={{ flex: 1, padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '15px' }}
            />
            <button
              onClick={addCity}
              style={{ padding: '10px 20px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
            >+ إضافة</button>
          </div>
        </div>

        {/* تفعيل / تعطيل */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>تفعيل / تعطيل</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {Object.entries(settings.toggles).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f9fafb', borderRadius: '10px' }}>
                <span style={{ fontWeight: '600' }}>{toggleLabels[key] || key}</span>
                <div
                  onClick={() => setSettings(p => ({ ...p, toggles: { ...p.toggles, [key]: !value } }))}
                  style={{ width: '48px', height: '26px', background: value ? '#ee7b26' : '#d1d5db', borderRadius: '13px', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                >
                  <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', right: value ? '3px' : '25px', transition: 'right 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── البانر الأول (الشريحة الأساسية) ── */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '4px' }}>📢 البانر الأول — الشريحة الأساسية</h3>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px', marginTop: 0 }}>
            المقاس الموصى به: <strong>800 × 356 بكسل</strong> (نسبة 2.25:1) — PNG أو JPG
          </p>
          <div style={{ display: 'grid', gap: '14px' }}>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>🖼️ رابط صورة البانر</label>
              <input
                type="url"
                value={bannerImageUrl}
                onChange={e => setBannerImageUrl(e.target.value)}
                placeholder="https://example.com/banner1.jpg"
                style={{ width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
              {bannerImageUrl && (
                <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', height: 100, background: '#f3f4f6', position: 'relative' }}>
                  <img
                    src={bannerImageUrl}
                    alt="معاينة البانر 1"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                  />
                  <div style={{ display: 'none', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                    ⚠️ تعذّر تحميل الصورة — تحقق من الرابط
                  </div>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>✏️ نص البانر (اختياري)</label>
              <input
                type="text"
                value={bannerText}
                onChange={e => setBannerText(e.target.value)}
                placeholder="مثال: تميز أكثر — واطلب أسرع  (فارغ = النص الافتراضي)"
                style={{ width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>🏪 المطعم المرتبط (يُفتح عند الضغط)</label>
              <select
                value={bannerRestaurantId}
                onChange={handleBannerRestaurantChange}
                style={{ width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '15px', background: '#fff', cursor: 'pointer', boxSizing: 'border-box' }}
              >
                <option value="">— بدون ربط (البانر غير قابل للضغط) —</option>
                {(restaurants || []).map(r => (
                  <option key={r.id} value={r.id}>{r.name}{r.city ? ' · ' + r.city : ''}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* ── شرائح البانر الإضافية (Slider) ── */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '4px' }}>🎞️ شرائح البانر الأول — السلايدر</h3>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px', marginTop: 0 }}>
            الشريحة الأساسية أعلاه تُعرض دائماً أولاً، ثم تتناوب مع الشرائح المضافة هنا كل 4 ثوانٍ تلقائياً.
          </p>

          {/* قائمة الشرائح الحالية */}
          {banners.length === 0 ? (
            <div style={{ background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 10, padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 14, marginBottom: 20 }}>
              لا توجد شرائح إضافية — أضف شريحة أدناه
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {banners.map((slide, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px' }}>
                  {/* معاينة مصغرة */}
                  <div style={{ width: 72, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#e5e7eb' }}>
                    <img src={slide.imageUrl} alt={`slide-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.opacity = 0.3 }} />
                  </div>
                  {/* بيانات */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#374151', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {slide.imageUrl}
                    </div>
                    {slide.restaurantName && (
                      <div style={{ fontSize: 11, color: '#ee7b26', fontWeight: 600, marginTop: 2 }}>🏪 {slide.restaurantName}</div>
                    )}
                  </div>
                  {/* أزرار الترتيب والحذف */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => handleMoveBannerSlide(idx, -1)}
                      disabled={idx === 0}
                      title="تحريك لأعلى"
                      style={{ padding: '4px 8px', background: idx === 0 ? '#f3f4f6' : '#eff6ff', color: idx === 0 ? '#d1d5db' : '#2563eb', border: 'none', borderRadius: 6, cursor: idx === 0 ? 'default' : 'pointer', fontSize: 13, fontWeight: 700 }}
                    >↑</button>
                    <button
                      onClick={() => handleMoveBannerSlide(idx, 1)}
                      disabled={idx === banners.length - 1}
                      title="تحريك لأسفل"
                      style={{ padding: '4px 8px', background: idx === banners.length - 1 ? '#f3f4f6' : '#eff6ff', color: idx === banners.length - 1 ? '#d1d5db' : '#2563eb', border: 'none', borderRadius: 6, cursor: idx === banners.length - 1 ? 'default' : 'pointer', fontSize: 13, fontWeight: 700 }}
                    >↓</button>
                    <button
                      onClick={() => handleRemoveBannerSlide(idx)}
                      title="حذف الشريحة"
                      style={{ padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* إضافة شريحة جديدة */}
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 12 }}>➕ إضافة شريحة جديدة</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>🖼️ رابط الصورة *</label>
                <input
                  type="url"
                  value={newBannerUrl}
                  onChange={e => setNewBannerUrl(e.target.value)}
                  placeholder="https://example.com/slide.jpg"
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
                {newBannerUrl && (
                  <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', height: 80, background: '#f3f4f6' }}>
                    <img src={newBannerUrl} alt="معاينة" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.opacity = 0.2 }} />
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>🏪 المطعم المرتبط (اختياري)</label>
                <select
                  value={newBannerRestId}
                  onChange={e => {
                    const id = e.target.value;
                    setNewBannerRestId(id);
                    const rest = (restaurants || []).find(r => r.id === id);
                    setNewBannerRestName(rest ? rest.name : '');
                  }}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer', boxSizing: 'border-box' }}
                >
                  <option value="">— بدون ربط —</option>
                  {(restaurants || []).map(r => (
                    <option key={r.id} value={r.id}>{r.name}{r.city ? ' · ' + r.city : ''}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAddBannerSlide}
                style={{ padding: '10px 20px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
              >
                + إضافة الشريحة
              </button>
            </div>
          </div>
        </div>

        {/* ── البانر الثاني ── */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '4px' }}>📣 البانر الثاني — قسم العروض المميزة</h3>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px', marginTop: 0 }}>
            المقاس الموصى به: <strong>800 × 320 بكسل</strong> (نسبة 2.5:1) — PNG أو JPG
          </p>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>🖼️ رابط صورة البانر</label>
            <input
              type="url"
              value={banner2ImageUrl}
              onChange={e => setBanner2ImageUrl(e.target.value)}
              placeholder="https://example.com/banner2.jpg"
              style={{ width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
            {banner2ImageUrl && (
              <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', height: 100, background: '#f3f4f6', position: 'relative' }}>
                <img
                  src={banner2ImageUrl}
                  alt="معاينة البانر 2"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                />
                <div style={{ display: 'none', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                  ⚠️ تعذّر تحميل الصورة — تحقق من الرابط
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── البانر الثالث (الشريحة الأساسية) ── */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '4px' }}>⚡ البانر الثالث — الشريحة الأساسية</h3>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px', marginTop: 0 }}>
            المقاس الموصى به: <strong>800 × 356 بكسل</strong> (نسبة 2.25:1) — PNG أو JPG<br />
            إذا تركت الحقل فارغاً، سيُعرض التصميم الافتراضي (الخطوات الثلاث).
          </p>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>🖼️ رابط صورة البانر</label>
            <input
              type="url"
              value={banner3ImageUrl}
              onChange={e => setBanner3ImageUrl(e.target.value)}
              placeholder="https://example.com/banner3.jpg"
              style={{ width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
            {banner3ImageUrl && (
              <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', height: 100, background: '#f3f4f6', position: 'relative' }}>
                <img
                  src={banner3ImageUrl}
                  alt="معاينة البانر 3"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                />
                <div style={{ display: 'none', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                  ⚠️ تعذّر تحميل الصورة — تحقق من الرابط
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── شرائح البانر الثالث (Slider) ── */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '4px' }}>🎞️ شرائح البانر الثالث — السلايدر</h3>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px', marginTop: 0 }}>
            الشريحة الأساسية أعلاه تُعرض دائماً أولاً، ثم تتناوب مع الشرائح المضافة هنا كل 4.5 ثوانٍ تلقائياً.
          </p>

          {/* قائمة الشرائح الحالية */}
          {banners3.length === 0 ? (
            <div style={{ background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 10, padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 14, marginBottom: 20 }}>
              لا توجد شرائح إضافية — أضف شريحة أدناه
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {banners3.map((slide, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px' }}>
                  {/* معاينة مصغرة */}
                  <div style={{ width: 72, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#e5e7eb' }}>
                    <img src={slide.imageUrl} alt={`slide3-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.opacity = 0.3 }} />
                  </div>
                  {/* رابط الصورة */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#374151', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {slide.imageUrl}
                    </div>
                  </div>
                  {/* أزرار الترتيب والحذف */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => handleMoveBanner3Slide(idx, -1)}
                      disabled={idx === 0}
                      title="تحريك لأعلى"
                      style={{ padding: '4px 8px', background: idx === 0 ? '#f3f4f6' : '#eff6ff', color: idx === 0 ? '#d1d5db' : '#2563eb', border: 'none', borderRadius: 6, cursor: idx === 0 ? 'default' : 'pointer', fontSize: 13, fontWeight: 700 }}
                    >↑</button>
                    <button
                      onClick={() => handleMoveBanner3Slide(idx, 1)}
                      disabled={idx === banners3.length - 1}
                      title="تحريك لأسفل"
                      style={{ padding: '4px 8px', background: idx === banners3.length - 1 ? '#f3f4f6' : '#eff6ff', color: idx === banners3.length - 1 ? '#d1d5db' : '#2563eb', border: 'none', borderRadius: 6, cursor: idx === banners3.length - 1 ? 'default' : 'pointer', fontSize: 13, fontWeight: 700 }}
                    >↓</button>
                    <button
                      onClick={() => handleRemoveBanner3Slide(idx)}
                      title="حذف الشريحة"
                      style={{ padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* إضافة شريحة جديدة */}
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 12 }}>➕ إضافة شريحة جديدة</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>🖼️ رابط الصورة *</label>
                <input
                  type="url"
                  value={newBanner3Url}
                  onChange={e => setNewBanner3Url(e.target.value)}
                  placeholder="https://example.com/slide3.jpg"
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
                {newBanner3Url && (
                  <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', height: 80, background: '#f3f4f6' }}>
                    <img src={newBanner3Url} alt="معاينة" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.opacity = 0.2 }} />
                  </div>
                )}
              </div>
              <button
                onClick={handleAddBanner3Slide}
                style={{ padding: '10px 20px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
              >
                + إضافة الشريحة
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '14px', background: saving ? '#9ca3af' : '#ee7b26', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
        </button>

      </div>
    </div>
  );
}
