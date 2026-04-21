import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '@r2c/shared/firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const cardStyle = {
  background: 'white',
  borderRadius: '14px',
  padding: '24px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '2px solid #e5e7eb',
  borderRadius: '10px',
  fontSize: '14px',
  boxSizing: 'border-box',
  background: '#fff',
};

function LoadingBox({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: '#9ca3af' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
        <div>{text}</div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color = '#15487d' }) {
  return (
    <div style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '52px', height: '52px', background: `${color}18`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color }}>{value}</div>
        <div style={{ color: '#374151', fontWeight: '600', fontSize: '14px' }}>{label}</div>
        {sub ? <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px' }}>{sub}</div> : null}
      </div>
    </div>
  );
}

function SectionCard({ icon, title, subtitle, children, accent = '#ee7b26', fullWidth = false }) {
  return (
    <div style={{ ...cardStyle, gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', background: `${accent}16`, color: accent, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
            {icon}
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#1a1a2e' }}>{title}</h3>
            {subtitle ? <p style={{ color: '#6b7280', fontSize: '13px', margin: '6px 0 0' }}>{subtitle}</p> : null}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, note }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>{label}</label>
      {children}
      {note ? <div style={{ marginTop: '6px', color: '#9ca3af', fontSize: '12px' }}>{note}</div> : null}
    </div>
  );
}

function ImagePreview({ src, alt, height = 112 }) {
  if (!src) return null;

  return (
    <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', height, background: '#f3f4f6', position: 'relative', border: '1px solid #e5e7eb' }}>
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={e => {
          e.target.style.display = 'none';
          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
        }}
      />
      <div style={{ display: 'none', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 13, fontWeight: 600, background: '#fff' }}>
        ⚠️ تعذّر تحميل الصورة — تحقق من الرابط
      </div>
    </div>
  );
}

function EmptySlides({ text }) {
  return (
    <div style={{ background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 12, padding: '22px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
      {text}
    </div>
  );
}

function SlideRow({ slide, idx, total, onMove, onRemove, showRestaurant = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 14px' }}>
      <div style={{ width: 74, height: 46, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#e5e7eb' }}>
        <img src={slide.imageUrl} alt={`slide-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.opacity = 0.3; }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: '#374151', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {slide.imageUrl}
        </div>
        {showRestaurant ? (
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {slide.restaurantName ? `مرتبط بـ ${slide.restaurantName}` : 'بدون ربط'}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => onMove(idx, -1)}
          disabled={idx === 0}
          title="تحريك لأعلى"
          style={{ padding: '4px 8px', background: idx === 0 ? '#f3f4f6' : '#eff6ff', color: idx === 0 ? '#d1d5db' : '#2563eb', border: 'none', borderRadius: 6, cursor: idx === 0 ? 'default' : 'pointer', fontSize: 13, fontWeight: 700 }}
        >↑</button>
        <button
          onClick={() => onMove(idx, 1)}
          disabled={idx === total - 1}
          title="تحريك لأسفل"
          style={{ padding: '4px 8px', background: idx === total - 1 ? '#f3f4f6' : '#eff6ff', color: idx === total - 1 ? '#d1d5db' : '#2563eb', border: 'none', borderRadius: 6, cursor: idx === total - 1 ? 'default' : 'pointer', fontSize: 13, fontWeight: 700 }}
        >↓</button>
        <button
          onClick={() => onRemove(idx)}
          title="حذف الشريحة"
          style={{ padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
        >✕</button>
      </div>
    </div>
  );
}

export default function UserAppPage() {
  const { showToast, restaurants } = useApp();
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bannerRestaurantId, setBannerRestaurantId] = useState('');
  const [bannerRestaurantName, setBannerRestaurantName] = useState('');
  const [bannerText, setBannerText] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [banner2ImageUrl, setBanner2ImageUrl] = useState('');
  const [banner3ImageUrl, setBanner3ImageUrl] = useState('');

  const [banners, setBanners] = useState([]);
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const [newBannerRestId, setNewBannerRestId] = useState('');
  const [newBannerRestName, setNewBannerRestName] = useState('');

  const [banners3, setBanners3] = useState([]);
  const [newBanner3Url, setNewBanner3Url] = useState('');

  useEffect(() => {
    getDoc(doc(db, 'system', 'settings'))
      .then(docSnap => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        if (data.bannerRestaurantId) setBannerRestaurantId(data.bannerRestaurantId);
        if (data.bannerRestaurantName) setBannerRestaurantName(data.bannerRestaurantName);
        if (data.bannerText) setBannerText(data.bannerText);
        if (data.bannerImageUrl) setBannerImageUrl(data.bannerImageUrl);
        if (data.banner2ImageUrl) setBanner2ImageUrl(data.banner2ImageUrl);
        if (data.banner3ImageUrl) setBanner3ImageUrl(data.banner3ImageUrl);
        if (Array.isArray(data.banners)) setBanners(data.banners);
        if (Array.isArray(data.banners3)) setBanners3(data.banners3);
      })
      .catch(err => console.error('خطأ في تحميل إعدادات تطبيق المستخدم:', err))
      .finally(() => setLoadingData(false));
  }, []);

  const handleBannerRestaurantChange = (e) => {
    const id = e.target.value;
    setBannerRestaurantId(id);
    const rest = (restaurants || []).find(r => r.id === id);
    setBannerRestaurantName(rest ? rest.name : '');
  };

  const handleAddBannerSlide = () => {
    if (!newBannerUrl.trim()) return showToast('أدخل رابط الصورة', 'error');
    const rest = newBannerRestId ? (restaurants || []).find(r => r.id === newBannerRestId) : null;
    setBanners(prev => [...prev, {
      imageUrl: newBannerUrl.trim(),
      restaurantId: newBannerRestId || null,
      restaurantName: rest ? rest.name : (newBannerRestName || null),
    }]);
    setNewBannerUrl('');
    setNewBannerRestId('');
    setNewBannerRestName('');
    showToast('تمت إضافة الشريحة — احفظ الإعدادات لتطبيقها');
  };

  const handleRemoveBannerSlide = (idx) => {
    setBanners(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMoveBannerSlide = (idx, dir) => {
    setBanners(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

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
        bannerRestaurantId: bannerRestaurantId || null,
        bannerRestaurantName: bannerRestaurantName || null,
        bannerText: bannerText || null,
        bannerImageUrl: bannerImageUrl || null,
        banner2ImageUrl: banner2ImageUrl || null,
        banner3ImageUrl: banner3ImageUrl || null,
        banners,
        banners3,
      }, { merge: true });
      showToast('تم حفظ إعدادات تطبيق المستخدم ✅');
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const linkedSlidesCount = useMemo(() => banners.filter(slide => slide.restaurantId || slide.restaurantName).length, [banners]);
  const configuredBannersCount = useMemo(() => [bannerImageUrl, banner3ImageUrl].filter(Boolean).length, [bannerImageUrl, banner3ImageUrl]);

  if (loadingData) return <LoadingBox text="جاري تحميل إعدادات تطبيق المستخدم..." />;

  return (
    <div dir="rtl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e', margin: 0 }}>📱 إدارة تطبيق المستخدم</h2>
          <p style={{ color: '#6b7280', marginTop: '8px', marginBottom: 0 }}>
             <strong></strong>.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '13px 20px', background: saving ? '#9ca3af' : '#ee7b26', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 6px 16px rgba(238,123,38,0.25)' }}
        >
          {saving ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
        <StatCard icon="🖼️" label="بانرات أساسية" value={configuredBannersCount} sub="الأول + الثالث" color="#15487d" />
        <StatCard icon="🎞️" label="شرائح البانر الأول" value={banners.length} sub="غير الشريحة الأساسية" color="#ee7b26" />
        <StatCard icon="⚡" label="شرائح البانر الثالث" value={banners3.length} sub="غير الشريحة الأساسية" color="#8b5cf6" />
        <StatCard icon="🔗" label="شرائح مرتبطة بمطاعم" value={linkedSlidesCount} sub="داخل سلايدر البانر الأول" color="#10b981" />
      </div>

      <div style={{ ...cardStyle, marginBottom: '20px', border: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: '#eff6ff', color: '#2563eb', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>ℹ️</div>
          <div>
            <div style={{ fontWeight: 'bold', color: '#1a1a2e' }}>ملاحظات سريعة</div>
            <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '3px' }}></div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            'البانر الأول والثالث يدعمان شريحة أساسية + سلايدر إضافي.',
            'أي تعديل في الشرائح يحتاج الضغط على زر الحفظ ليظهر داخل التطبيق.',
          ].map((item, idx) => (
            <div key={idx} style={{ background: '#f9fafb', borderRadius: '10px', padding: '12px 14px', color: '#4b5563', fontSize: '13px', lineHeight: 1.8 }}>
              {item}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <SectionCard
          icon="📢"
          title="البانر الأول — الشريحة الأساسية"
          subtitle="المقاس الموصى به: 800 × 356 بكسل — PNG أو JPG"
          accent="#ee7b26"
        >
          <div style={{ display: 'grid', gap: '14px' }}>
            <Field label="رابط صورة البانر">
              <input
                type="url"
                value={bannerImageUrl}
                onChange={e => setBannerImageUrl(e.target.value)}
                placeholder="https://example.com/banner1.jpg"
                style={inputStyle}
              />
              <ImagePreview src={bannerImageUrl} alt="معاينة البانر 1" />
            </Field>

            <Field label="نص البانر (اختياري)">
              <input
                type="text"
                value={bannerText}
                onChange={e => setBannerText(e.target.value)}
                placeholder="مثال: تميز أكثر واطلب أسرع"
                style={inputStyle}
              />
            </Field>

            <Field label="ربط البانر بمطعم (اختياري)" note="عند اختيار مطعم يصبح البانر قابلًا للضغط داخل التطبيق.">
              <select value={bannerRestaurantId} onChange={handleBannerRestaurantChange} style={inputStyle}>
                <option value="">— بدون ربط (البانر غير قابل للضغط) —</option>
                {(restaurants || []).map(r => (
                  <option key={r.id} value={r.id}>{r.name}{r.city ? ' · ' + r.city : ''}</option>
                ))}
              </select>
            </Field>
          </div>
        </SectionCard>


        <SectionCard
          icon="⚡"
          title="البانر الثالث — الشريحة الأساسية"
          subtitle="المقاس الموصى به: 800 × 356 بكسل — إذا تركته فارغًا سيظهر الشكل الافتراضي"
          accent="#8b5cf6"
        >
          <Field label="رابط صورة البانر">
            <input
              type="url"
              value={banner3ImageUrl}
              onChange={e => setBanner3ImageUrl(e.target.value)}
              placeholder="https://example.com/banner3.jpg"
              style={inputStyle}
            />
            <ImagePreview src={banner3ImageUrl} alt="معاينة البانر 3" />
          </Field>
        </SectionCard>

        <SectionCard
          icon="🎞️"
          title="سلايدر البانر الأول"
          subtitle="الشريحة الأساسية تُعرض أولًا، ثم تتناوب مع الشرائح المضافة هنا كل 4.5 ثوانٍ"
          accent="#10b981"
        >
          <div style={{ display: 'grid', gap: '16px' }}>
            {banners.length === 0 ? (
              <EmptySlides text="لا توجد شرائح إضافية — أضف شريحة أدناه" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {banners.map((slide, idx) => (
                  <SlideRow
                    key={`${slide.imageUrl}-${idx}`}
                    slide={slide}
                    idx={idx}
                    total={banners.length}
                    onMove={handleMoveBannerSlide}
                    onRemove={handleRemoveBannerSlide}
                    showRestaurant
                  />
                ))}
              </div>
            )}

            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 12 }}>➕ إضافة شريحة جديدة</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                <Field label="رابط الصورة *">
                  <input
                    type="url"
                    value={newBannerUrl}
                    onChange={e => setNewBannerUrl(e.target.value)}
                    placeholder="https://example.com/slide.jpg"
                    style={{ ...inputStyle, borderWidth: '1.5px' }}
                  />
                  <ImagePreview src={newBannerUrl} alt="معاينة الشريحة الجديدة" height={88} />
                </Field>

                <Field label="ربط بمطعم (اختياري)">
                  <select
                    value={newBannerRestId}
                    onChange={e => {
                      const id = e.target.value;
                      setNewBannerRestId(id);
                      const rest = (restaurants || []).find(r => r.id === id);
                      setNewBannerRestName(rest ? rest.name : '');
                    }}
                    style={{ ...inputStyle, borderWidth: '1.5px' }}
                  >
                    <option value="">— بدون ربط —</option>
                    {(restaurants || []).map(r => (
                      <option key={r.id} value={r.id}>{r.name}{r.city ? ' · ' + r.city : ''}</option>
                    ))}
                  </select>
                </Field>

                <button
                  onClick={handleAddBannerSlide}
                  style={{ padding: '10px 18px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                >
                  + إضافة الشريحة
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon="🎞️"
          title="سلايدر البانر الثالث"
          subtitle="الشريحة الأساسية تُعرض أولًا، ثم تتناوب مع الشرائح المضافة هنا كل 4.5 ثوانٍ"
          accent="#f59e0b"
        >
          <div style={{ display: 'grid', gap: '16px' }}>
            {banners3.length === 0 ? (
              <EmptySlides text="لا توجد شرائح إضافية — أضف شريحة أدناه" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {banners3.map((slide, idx) => (
                  <SlideRow
                    key={`${slide.imageUrl}-${idx}`}
                    slide={slide}
                    idx={idx}
                    total={banners3.length}
                    onMove={handleMoveBanner3Slide}
                    onRemove={handleRemoveBanner3Slide}
                  />
                ))}
              </div>
            )}

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 12 }}>➕ إضافة شريحة جديدة</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                <Field label="رابط الصورة *">
                  <input
                    type="url"
                    value={newBanner3Url}
                    onChange={e => setNewBanner3Url(e.target.value)}
                    placeholder="https://example.com/slide3.jpg"
                    style={{ ...inputStyle, borderWidth: '1.5px' }}
                  />
                  <ImagePreview src={newBanner3Url} alt="معاينة الشريحة الثالثة الجديدة" height={88} />
                </Field>

                <button
                  onClick={handleAddBanner3Slide}
                  style={{ padding: '10px 18px', background: '#ee7b26', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                >
                  + إضافة الشريحة
                </button>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div style={{ position: 'sticky', bottom: '16px', marginTop: '24px' }}>
        <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px 16px', boxShadow: '0 10px 24px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: '#1a1a2e' }}>جاهز للحفظ</div>
            <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>تأكّد من الروابط، ثم احفظ لتطبيق التعديلات داخل تطبيق المستخدم.</div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '14px 20px', background: saving ? '#9ca3af' : '#ee7b26', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? '⏳ جاري الحفظ...' : '💾 حفظ إعدادات تطبيق المستخدم'}
          </button>
        </div>
      </div>
    </div>
  );
}
