import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '@r2c/shared/firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const cardStyle = {
  background: 'white',
  borderRadius: '18px',
  padding: '24px',
  boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)',
  border: '1px solid #eef2f7',
};

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  border: '1.5px solid #e5e7eb',
  borderRadius: '12px',
  fontSize: '14px',
  boxSizing: 'border-box',
  background: '#fff',
  outline: 'none',
};

const PREVIEW_META = {
  overview: {
    title: 'معاينة تطبيق المستخدم',
    description: 'مرّر المؤشر على أي كارت أو ركّز على أحد الحقول ليتم إبراز مكان التعديل داخل شاشة FeedScreen.',
    color: '#15487d',
  },
  banner1: {
    title: 'البانر الأول — الشريحة الأساسية',
    description: 'سيتم إبراز البانر العلوي الرئيسي في شاشة التطبيق، لأنه يتأثر مباشرة بتعديلات هذا الكارت.',
    color: '#ee7b26',
  },
  banner3: {
    title: 'البانر الثالث — الشريحة الأساسية',
    description: 'سيتم إبراز البانر الثالث الموجود أسفل قسم "الأكثر مبيعًا" داخل شاشة التطبيق.',
    color: '#8b5cf6',
  },
  banner1Slider: {
    title: 'سلايدر البانر الأول',
    description: 'يتم تمييز نفس مساحة البانر الأول، لكن باعتبارها سلايدر يحتوي على عدة شرائح متتابعة.',
    color: '#10b981',
  },
  banner3Slider: {
    title: 'سلايدر البانر الثالث',
    description: 'يتم تمييز مكان السلايدر الثالث في FeedScreen مع الإشارة إلى أنّه يعرض عدة شرائح متعاقبة.',
    color: '#f59e0b',
  },
  featuredSection: {
    title: 'قسم عروض مميزة',
    description: 'هذا الكارت يتحكم في خلفية قسم عروض مميزة، ونص العنوان، ولون العنوان داخل FeedScreen.',
    color: '#f0d078',
  },
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
    <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)', border: '1px solid #eef2f7', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '52px', height: '52px', background: `${color}18`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
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

function SectionCard({ icon, title, subtitle, children, accent = '#ee7b26', previewKey = 'overview', onActivate }) {
  return (
    <div
      style={{
        ...cardStyle,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
      }}
      onMouseEnter={() => onActivate?.(previewKey)}
      onFocusCapture={() => onActivate?.(previewKey)}
      onClick={() => onActivate?.(previewKey)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', background: `${accent}16`, color: accent, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
            {icon}
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#1a1a2e' }}>{title}</h3>
            {subtitle ? <p style={{ color: '#6b7280', fontSize: '13px', margin: '6px 0 0', lineHeight: 1.7 }}>{subtitle}</p> : null}
          </div>
        </div>
        <div style={{ background: `${accent}12`, color: accent, border: `1px solid ${accent}22`, borderRadius: '999px', padding: '6px 10px', fontSize: 11, fontWeight: 700 }}>
          معاينة
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
      {note ? <div style={{ marginTop: '6px', color: '#9ca3af', fontSize: '12px', lineHeight: 1.7 }}>{note}</div> : null}
    </div>
  );
}

function ImagePreview({ src, alt, height = 112 }) {
  if (!src) return null;

  return (
    <div style={{ marginTop: 10, borderRadius: 14, overflow: 'hidden', height, background: '#f3f4f6', position: 'relative', border: '1px solid #e5e7eb' }}>
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

function PreviewBlock({ activeArea, targetKeys, style, label, badge, accent, children }) {
  const highlighted = targetKeys.includes(activeArea);
  const dimOthers = activeArea !== 'overview';
  const opacity = dimOthers ? (highlighted ? 1 : 0.22) : 1;
  const ringColor = accent || '#ee7b26';

  return (
    <div
      style={{
        ...style,
        position: 'relative',
        opacity,
        transition: 'all 0.25s ease',
        boxShadow: highlighted ? `0 0 0 3px ${ringColor}, 0 10px 24px ${ringColor}35` : style.boxShadow,
        transform: highlighted ? 'scale(1.015)' : 'scale(1)',
        zIndex: highlighted ? 3 : 1,
      }}
    >
      {children}
      {label ? <div style={{ fontSize: 10, color: highlighted ? '#111827' : '#6b7280', fontWeight: 700 }}>{label}</div> : null}
      {badge && highlighted ? (
        <div style={{ position: 'absolute', top: 7, left: 7, background: '#111827', color: '#fff', borderRadius: 999, padding: '4px 8px', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap' }}>
          {badge}
        </div>
      ) : null}
    </div>
  );
}

function TinyLine({ width = '60%', height = 6 }) {
  return <div style={{ width, height, borderRadius: 999, background: '#e5e7eb' }} />;
}

function MiniOfferCard({ wide = false }) {
  return (
    <div style={{
      height: wide ? 54 : 64,
      borderRadius: 14,
      border: '1px solid #e5e7eb',
      background: '#fff',
      padding: 7,
      display: 'flex',
      gap: 7,
      boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
    }}>
      <div style={{ width: wide ? 52 : 58, borderRadius: 10, background: 'linear-gradient(135deg,#dbeafe,#eff6ff)', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'grid', alignContent: 'center', gap: 5 }}>
        <TinyLine width="72%" />
        <TinyLine width="48%" height={5} />
        <TinyLine width="62%" height={5} />
      </div>
    </div>
  );
}

function UserAppPreview({ activeArea = 'overview' }) {
  const meta = PREVIEW_META[activeArea] || PREVIEW_META.overview;
  const isBanner3Focus = activeArea === 'banner3' || activeArea === 'banner3Slider';
  const accent =
    activeArea === 'banner1Slider' ? PREVIEW_META.banner1Slider.color :
    activeArea === 'banner3Slider' ? PREVIEW_META.banner3Slider.color :
    meta.color;

  return (
    <div style={{ ...cardStyle, padding: 18 }} dir="rtl">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, background: `${accent}16`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>
          📱
        </div>
        <div>
          <div style={{ fontWeight: 800, color: '#111827', fontSize: 15 }}>{meta.title}</div>
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 3, lineHeight: 1.6 }}>{meta.description}</div>
        </div>
      </div>

      <div style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)', borderRadius: 20, border: '1px solid #e5ecf5', padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827', padding: '5px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 800 }}>
            FeedScreen المختصر
          </div>
          <div style={{ color: '#64748b', fontSize: 10.5 }}>المعاينة لا تمتد بطول الشاشة</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 256,
            background: '#111827',
            borderRadius: 30,
            padding: 8,
            boxShadow: '0 22px 44px rgba(15,23,42,0.18)',
          }}>
            <div style={{
              background: '#ffffff',
              height: 438,
              borderRadius: 24,
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid rgba(255,255,255,0.18)',
            }}>
              <div style={{ height: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fff' }}>
                <div style={{ width: 70, height: 4, borderRadius: 999, background: '#d1d5db' }} />
              </div>

              <div
                style={{
                  padding: isBanner3Focus ? '9px 10px 150px' : '9px 10px 11px',
                  background: '#fff',
                  transform: isBanner3Focus ? 'translateY(-168px)' : 'translateY(0)',
                  transition: 'transform 0.38s cubic-bezier(0.4, 0, 0.2, 1), padding 0.38s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* Header قريب من FeedScreen */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 12, background: '#fff4eb', border: '1px solid #ffd8b3', display: 'grid', placeItems: 'center', color: '#ee7b26', fontSize: 12, fontWeight: 900 }}>R2C</div>
                  <div style={{ flex: 1, height: 34, borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 9px', boxSizing: 'border-box' }}>
                    <TinyLine width="48%" height={5} />
                    <span style={{ fontSize: 13 }}>🇪🇬</span>
                  </div>
                  <div style={{ width: 34, height: 34, borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb', display: 'grid', placeItems: 'center', fontSize: 13 }}>🔔</div>
                </div>

                {/* MainHeroBannerSlider */}
                <PreviewBlock
                  activeArea={activeArea}
                  targetKeys={['banner1', 'banner1Slider']}
                  badge={activeArea === 'banner1Slider' ? 'سلايدر البانر الأول' : 'البانر الأول'}
                  accent={activeArea === 'banner1Slider' ? PREVIEW_META.banner1Slider.color : PREVIEW_META.banner1.color}
                  style={{
                    height: 88,
                    borderRadius: 18,
                    background: 'linear-gradient(135deg, #ee7b26 0%, #ffb16f 100%)',
                    marginBottom: 10,
                    padding: 10,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ color: 'white', fontWeight: 900, fontSize: 13, marginTop: 40 }}>MainHeroBannerSlider</div>
                  <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
                    {[0, 1, 2].map(i => <span key={i} style={{ width: i === 0 ? 13 : 5, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.75)' }} />)}
                  </div>
                </PreviewBlock>

                {/* Explore */}
                <div style={{ marginBottom: 7, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#111827', fontWeight: 800, fontSize: 11 }}>استكشف القائمة</div>
                  <div style={{ color: '#ee7b26', fontSize: 9.5, fontWeight: 800 }}>عرض الكل</div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {['عروض', 'أفضل', 'الأكثر', 'لك'].map((name, i) => (
                    <div key={name} style={{ width: 48, flexShrink: 0, textAlign: 'center' }}>
                      <div style={{ width: 40, height: 40, margin: '0 auto 4px', borderRadius: 999, background: i === 0 ? '#fff3e8' : '#f8fafc', border: '1px solid #e5e7eb' }} />
                      <div style={{ fontSize: 8.5, color: '#374151', whiteSpace: 'nowrap' }}>{name}</div>
                    </div>
                  ))}
                </div>

                {/* TopOffersPromo */}
                <PreviewBlock
                  activeArea={activeArea}
                  targetKeys={['featuredSection']}
                  badge="قسم عروض مميزة"
                  accent={PREVIEW_META.featuredSection.color}
                  style={{
                    marginBottom: 10,
                    borderRadius: 15,
                    padding: 6,
                    background: activeArea === 'featuredSection' ? 'rgba(240, 208, 120, 0.12)' : 'transparent',
                  }}
                >
                  <div style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ color: '#111827', fontWeight: 800, fontSize: 11 }}>عروض مميزة</div>
                    <TinyLine width={42} height={5} />
                  </div>
                  <MiniOfferCard wide />
                </PreviewBlock>

                {/* Top sellers */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ height: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ color: '#111827', fontWeight: 800, fontSize: 11 }}>الأكثر مبيعًا</div>
                    <TinyLine width={42} height={5} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ width: 68, height: 58, borderRadius: 14, border: '1px solid #e5e7eb', background: '#fff', flexShrink: 0, padding: 5, boxSizing: 'border-box' }}>
                        <div style={{ height: 28, borderRadius: 10, background: '#f1f5f9', marginBottom: 5 }} />
                        <TinyLine width="70%" height={5} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Banner 3 */}
                <PreviewBlock
                  activeArea={activeArea}
                  targetKeys={['banner3', 'banner3Slider']}
                  badge={activeArea === 'banner3Slider' ? 'سلايدر البانر الثالث' : 'البانر الثالث'}
                  accent={activeArea === 'banner3Slider' ? PREVIEW_META.banner3Slider.color : PREVIEW_META.banner3.color}
                  style={{
                    height: 64,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #c4b5fd 100%)',
                    marginBottom: 9,
                    padding: 9,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ color: 'white', fontWeight: 900, fontSize: 12, marginTop: 26 }}>HeroBannerSlider</div>
                  <div style={{ position: 'absolute', bottom: 7, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
                    {[0, 1, 2].map(i => <span key={i} style={{ width: i === 0 ? 12 : 5, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.75)' }} />)}
                  </div>
                </PreviewBlock>

                {/* Best offers - partially visible to show continuation */}
                <div>
                  <div style={{ height: 17, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ color: '#111827', fontWeight: 800, fontSize: 10.5 }}>أفضل العروض</div>
                    <TinyLine width={38} height={5} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1, 2].map(i => <MiniOfferCard key={i} />)}
                  </div>
                </div>
              </div>

              {activeArea !== 'overview' ? (
                <div style={{ position: 'absolute', bottom: 10, right: 10, left: 10, background: 'rgba(17,24,39,0.9)', color: '#fff', borderRadius: 13, padding: '7px 9px', fontSize: 10.5, lineHeight: 1.55, textAlign: 'center' }}>
                  {isBanner3Focus ? 'تم تحريك المعاينة لأعلى حتى يظهر البانر الثالث كاملًا داخل الهاتف.' : 'الجزء المضيء هو المكان الذي يتأثر بتعديلات الكارت الحالي.'}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'banner1', label: 'بانر 1', color: PREVIEW_META.banner1.color },
            { key: 'banner3', label: 'بانر 3', color: PREVIEW_META.banner3.color },
            { key: 'banner1Slider', label: 'سلايدر 1', color: PREVIEW_META.banner1Slider.color },
            { key: 'banner3Slider', label: 'سلايدر 3', color: PREVIEW_META.banner3Slider.color },
            { key: 'featuredSection', label: 'عروض مميزة', color: PREVIEW_META.featuredSection.color },
          ].map(item => (
            <span key={item.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 10.5, fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UserAppPage() {
  const { showToast, restaurants } = useApp();
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePreview, setActivePreview] = useState('overview');
  const [isCompactLayout, setIsCompactLayout] = useState(false);

  const [bannerRestaurantId, setBannerRestaurantId] = useState('');
  const [bannerRestaurantName, setBannerRestaurantName] = useState('');
  const [bannerText, setBannerText] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [banner2ImageUrl, setBanner2ImageUrl] = useState('');
  const [banner3ImageUrl, setBanner3ImageUrl] = useState('');
  const [featuredSectionTitle, setFeaturedSectionTitle] = useState('عروض مميزة');
  const [featuredSectionTitleColor, setFeaturedSectionTitleColor] = useState('#f0d078');
  const [featuredSectionBackground, setFeaturedSectionBackground] = useState('linear-gradient(160deg, #0a1929 0%, #0d2644 40%, #0a1929 100%)');
  const [featuredSectionBackgroundImage, setFeaturedSectionBackgroundImage] = useState('');

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
        if (data.featuredSectionTitle) setFeaturedSectionTitle(data.featuredSectionTitle);
        if (data.featuredSectionTitleColor) setFeaturedSectionTitleColor(data.featuredSectionTitleColor);
        if (data.featuredSectionBackground) setFeaturedSectionBackground(data.featuredSectionBackground);
        if (data.featuredSectionBackgroundImage) setFeaturedSectionBackgroundImage(data.featuredSectionBackgroundImage);
        if (Array.isArray(data.banners)) setBanners(data.banners);
        if (Array.isArray(data.banners3)) setBanners3(data.banners3);
      })
      .catch(err => console.error('خطأ في تحميل إعدادات تطبيق المستخدم:', err))
      .finally(() => setLoadingData(false));
  }, []);

  useEffect(() => {
    const updateLayout = () => setIsCompactLayout(window.innerWidth < 1180);
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
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
        featuredSectionTitle: featuredSectionTitle || 'عروض مميزة',
        featuredSectionTitleColor: featuredSectionTitleColor || '#f0d078',
        featuredSectionBackground: featuredSectionBackground || 'linear-gradient(160deg, #0a1929 0%, #0d2644 40%, #0a1929 100%)',
        featuredSectionBackgroundImage: featuredSectionBackgroundImage || null,
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
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0 }}>📱 إدارة تطبيق المستخدم</h2>
          <p style={{ color: '#6b7280', marginTop: '10px', marginBottom: 0, maxWidth: 760, lineHeight: 1.8 }}>
            تحكّم في البانرات والشرائح التي تظهر داخل <strong>FeedScreen</strong>، ومع كل كارت على اليمين ستظهر على اليسار معاينة توضح مكان تأثير هذا التعديل داخل تطبيق المستخدم.
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

      <div style={{ display: 'grid', gridTemplateColumns: isCompactLayout ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <StatCard icon="🖼️" label="بانرات أساسية" value={configuredBannersCount} sub="الأول + الثالث" color="#15487d" />
        <StatCard icon="🎞️" label="شرائح البانر الأول" value={banners.length} sub="غير الشريحة الأساسية" color="#ee7b26" />
        <StatCard icon="⚡" label="شرائح البانر الثالث" value={banners3.length} sub="غير الشريحة الأساسية" color="#8b5cf6" />
        <StatCard icon="🔗" label="شرائح مرتبطة بمطاعم" value={linkedSlidesCount} sub="داخل سلايدر البانر الأول" color="#10b981" />
      </div>

      <div style={{ direction: 'ltr', display: 'grid', gridTemplateColumns: isCompactLayout ? '1fr' : '380px minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        <div
          style={{
            direction: 'rtl',
            position: isCompactLayout ? 'relative' : 'sticky',
            top: isCompactLayout ? 'auto' : 18,
            alignSelf: 'start',
            maxHeight: isCompactLayout ? 'none' : 'calc(100vh - 36px)',
            overflow: isCompactLayout ? 'visible' : 'auto',
          }}
        >
          <UserAppPreview activeArea={activePreview} />
        </div>

        <div style={{ direction: 'rtl', display: 'grid', gap: '20px' }}>
          <div style={{ ...cardStyle, border: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: '#eff6ff', color: '#2563eb', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>ℹ️</div>
              <div>
                <div style={{ fontWeight: 'bold', color: '#1a1a2e' }}>دليل المعاينة التفاعلية</div>
                <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '3px', lineHeight: 1.8 }}>
                  حرّك المؤشر فوق أي كارت أو ركّز على أي حقل داخله، وسيتم على اليسار إبراز الجزء المقابل له داخل شاشة التطبيق.
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isCompactLayout ? '1fr' : 'repeat(3, minmax(0,1fr))', gap: '12px' }}>
              {[
                'البانر الأول والثالث يظهران داخل الرسم بنفس ترتيب ظهورهما في FeedScreen.',
                'سلايدر البانر الأول والثالث يستخدم نفس المساحة المرئية، لكن بتمييز خاص لكونه سلايدر متعدد الشرائح.',
                'يمكن الآن التحكم في خلفية قسم عروض مميزة بصورة أو بخلفية افتراضية، بالإضافة إلى كلمة العنوان ولونها من كارت مستقل.',
                'كل الوظائف الحالية للحفظ والإضافة والحذف والتحريك بقيت كما هي دون تغيير.',
              ].map((item, idx) => (
                <div key={idx} style={{ background: '#f9fafb', borderRadius: '10px', padding: '12px 14px', color: '#4b5563', fontSize: '13px', lineHeight: 1.8 }}>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <SectionCard
            icon="🏷️"
            title="قسم عروض مميزة"
            subtitle="يتحكم في خلفية القسم، وكلمة العنوان، ولون العنوان داخل FeedScreen"
            accent="#f0d078"
            previewKey="featuredSection"
            onActivate={setActivePreview}
          >
            <div style={{ display: 'grid', gap: '14px' }}>
              <Field label="كلمة / عنوان القسم">
                <input
                  type="text"
                  value={featuredSectionTitle}
                  onChange={e => setFeaturedSectionTitle(e.target.value)}
                  placeholder="مثال: عروض مميزة"
                  style={inputStyle}
                />
              </Field>

              <Field label="لون كلمة العنوان" note="هذا اللون يطبق على الكلمة الظاهرة أعلى قسم عروض مميزة.">
                <div style={{ display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr)', gap: 10, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={featuredSectionTitleColor || '#f0d078'}
                    onChange={e => setFeaturedSectionTitleColor(e.target.value)}
                    style={{ width: 64, height: 42, border: '1px solid #e5e7eb', borderRadius: 12, padding: 4, background: '#fff', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={featuredSectionTitleColor}
                    onChange={e => setFeaturedSectionTitleColor(e.target.value)}
                    placeholder="#f0d078"
                    style={inputStyle}
                  />
                </div>
              </Field>

              <Field label="الخلفية الافتراضية للقسم" note="تُستخدم هذه الخلفية فقط إذا لم يتم إدخال صورة خلفية.">
                <input
                  type="text"
                  value={featuredSectionBackground}
                  onChange={e => setFeaturedSectionBackground(e.target.value)}
                  placeholder="linear-gradient(160deg, #0a1929 0%, #0d2644 40%, #0a1929 100%)"
                  style={inputStyle}
                />
              </Field>

              <Field label="رابط صورة الخلفية (اختياري)" note="إذا أضفت صورة هنا ستظهر كخلفية لقسم عروض مميزة، وإذا تركته فارغًا ستظهر الخلفية الافتراضية الحالية.">
                <input
                  type="url"
                  value={featuredSectionBackgroundImage}
                  onChange={e => setFeaturedSectionBackgroundImage(e.target.value)}
                  placeholder="https://example.com/featured-background.jpg"
                  style={inputStyle}
                />
                <ImagePreview src={featuredSectionBackgroundImage} alt="معاينة صورة خلفية عروض مميزة" height={96} />
              </Field>

              <div
                style={{
                  borderRadius: 18,
                  padding: '18px 16px',
                  background: featuredSectionBackgroundImage
                    ? `linear-gradient(rgba(10,25,41,0.35), rgba(10,25,41,0.45)), url(${featuredSectionBackgroundImage}) center/cover no-repeat`
                    : (featuredSectionBackground || 'linear-gradient(160deg, #0a1929 0%, #0d2644 40%, #0a1929 100%)'),
                  border: '1px solid rgba(200,169,110,0.25)',
                  boxShadow: '0 8px 26px rgba(15, 23, 42, 0.12)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ textAlign: 'center', color: featuredSectionTitleColor || '#f0d078', fontSize: 20, fontWeight: 800 }}>
                  {featuredSectionTitle || 'عروض مميزة'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 12 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: i === 0 ? 18 : 6, height: 6, borderRadius: 999, background: i === 0 ? '#ee7b26' : 'rgba(200,169,110,0.45)' }} />
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon="📢"
            title="البانر الأول — الشريحة الأساسية"
            subtitle="المقاس الموصى به: 800 × 356 بكسل — PNG أو JPG"
            accent="#ee7b26"
            previewKey="banner1"
            onActivate={setActivePreview}
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
            previewKey="banner3"
            onActivate={setActivePreview}
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
            previewKey="banner1Slider"
            onActivate={setActivePreview}
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
            previewKey="banner3Slider"
            onActivate={setActivePreview}
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

          <div style={{ position: 'sticky', bottom: '16px' }}>
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
      </div>
    </div>
  );
}
