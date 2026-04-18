import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../contexts'
import OfferImage from '../components/OfferImage'

const ORANGE = '#ee7b26'
const ORANGE_DARK = '#d96a18'
const ORANGE_SOFT = '#fff3e8'
const NAVY = '#0d1f35'
const NAVY_MID = '#152d4a'
const NAVY_DARK = '#080f1a'
const BG = '#f4f6f9'
const WHITE = '#ffffff'
const TEXT = '#111827'
const MUTED = '#6b7280'
const BORDER = '#e5e7eb'
const SHADOW = '0 10px 30px rgba(238, 123, 38, 0.10)'

const EMOJI_3D = {
  all: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f37d_fe0f/512.webp',
  burger: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f354/512.webp',
  pizza: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f355/512.webp',
  shawarma: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f32f/512.webp',
  chicken: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f357/512.webp',
  fish: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f41f/512.webp',
  grills: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f969/512.webp',
  sweets: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f370/512.webp',
}

const CUISINE_FILTERS = [
  { id: 'all',     label: 'الكل', customImg: 'https://i.ibb.co/99HgtTDP/file-000000005e8c720aaeaaeb7347016d68.png' },
    { id: 'برجر',   label: 'برجر', customImg: 'https://i.ibb.co/tPXQKJcL/image.png' },
  { id: 'بوكس', label: 'عروض لك', customImg: 'https://i.ibb.co/7tJLwNh5/file-00000000a90072439ee2eb42f6c0c720.png' },
  { id: 'مكس',  label: 'الأكثر مبيعًا',   customImg: 'https://i.ibb.co/ccp4YM9J/image.png' },
  { id: 'شاورما', label: 'شاورما',customImg: 'https://i.ibb.co/wh2wzQbt/image.png' },
    { id: 'بيتزا',  label: 'بيتزا',  customImg: 'https://i.ibb.co/JFdjTJmP/image.png' },
  { id: 'حلويات', label: 'حلويات',  customImg: 'https://i.ibb.co/q3tDHGtX/image.png' },
    { id: 'featured', label: 'عروض مميزة', customImg: 'https://i.ibb.co/ymG5qHhr/image.png' },
    { id: 'دجاج',   label: 'دجاج',customImg: 'https://i.ibb.co/Z6JtJbxQ/image.png' },
  { id: 'مشاوي',  label: 'مشويات', customImg: 'https://i.ibb.co/wh2wzQbt/image.png' },
]

const FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500&family=Poppins:wght@300;400;500&display=swap');
  * {
    font-family: 'Cairo', sans-serif;
    font-weight: 400;
    line-height: 1.5;
  }
  .font-num { font-family: 'Poppins', 'Cairo', sans-serif; }
`



function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function resolveOldPrice(offer, currentPrice) {
  const oldPrice = toNumber(
    offer?.oldPrice ??
    offer?.originalPrice ??
    offer?.priceBeforeDiscount ??
    offer?.beforePrice
  )
  if (oldPrice != null) return oldPrice
  if (offer?.discount > 0 && currentPrice != null) {
    return Math.round((currentPrice / (1 - offer.discount / 100)) * 100) / 100
  }
  return null
}

function resolveRating(offer) {
  return (
    toNumber(offer?.restaurantRating) ??
    toNumber(offer?.rating) ??
    toNumber(offer?.restaurant?.rating) ??
    4.8
  )
}

function resolveDeliveryTime(offer) {
  return (
    offer?.deliveryTime ??
    offer?.estimatedDeliveryTime ??
    offer?.restaurantDeliveryTime ??
    offer?.prepTime ??
    '25-40 د'
  )
}

function resolveShortDescription(offer) {
  const raw = (offer?.description || offer?.shortDescription || '').trim()
  if (!raw) return 'عرض مميز بطعم رائع وسعر مناسب.'
  return raw.length > 65 ? `${raw.slice(0, 65).trim()}...` : raw
}

export default function ExploreScreen() {
  const {
    offers, setCurrentScreen, setSelectedOffer, setSelectedRestaurant, setBottomNav
  } = useApp()

  const [activeCategory, setActiveCategory] = useState(() => {
    try {
      const saved = localStorage.getItem('r2c_explore_category')
      localStorage.removeItem('r2c_explore_category')
      return saved || 'all'
    } catch {
      return 'all'
    }
  })
  const [featuredOffersSnapshot] = useState(() => {
    try {
      const raw = localStorage.getItem('r2c_explore_featured_offers')
      localStorage.removeItem('r2c_explore_featured_offers')
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    setBottomNav('explore')
  }, [setBottomNav])

  // تصفية العروض حسب الفئة المختارة
  const filteredOffers = useMemo(() => {
    if (activeCategory === 'all') {
      return offers || []
    }

    if (activeCategory === 'featured') {
      if (featuredOffersSnapshot.length > 0) return featuredOffersSnapshot

      const manualFeatured = (offers || []).filter(o => o.isFeatured === true)
      const base = manualFeatured.length > 0
        ? manualFeatured
        : [...(offers || [])].sort((a, b) => (b.discount || 0) - (a.discount || 0))

      return base.slice(0, 12)
    }

    return (offers || []).filter(o => {
      const text = `${o.name || ''} ${o.description || ''} ${o.category || ''} ${o.cuisine || ''}`.toLowerCase()
      return text.includes(activeCategory.toLowerCase())
    })
  }, [offers, activeCategory, featuredOffersSnapshot])

  const handleOfferClick = (offer) => {
    setSelectedOffer(offer)
    setCurrentScreen('offerDetails')
  }

  const handleRestaurantClick = (restaurantId, restaurantName) => {
    setSelectedRestaurant({ id: restaurantId, name: restaurantName, city: '' })
    setCurrentScreen('restaurantProfile')
  }

  const handleBack = () => {
    setBottomNav('home')
    setCurrentScreen('feed')
  }

  return (
    <>
      <style>{FONT_STYLE}</style>
      <style>{`
        .explore-scrollbar::-webkit-scrollbar { display: none; }
        .explore-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .explore-category-btn { transition: all 0.2s ease; }
        .explore-category-btn:active { transform: scale(0.95); }
      `}</style>

      <div dir="rtl" style={{ background: BG, minHeight: '100vh', color: TEXT, paddingBottom: 96 }}>
        {/* Header */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: WHITE,
          borderBottom: `1px solid ${BORDER}`,
          padding: '14px 12px',
          display: 'flex',
          alignItems: 'stretch',
          gap: 10,
        }}>
          <button
            onClick={handleBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px 8px 10px',
              borderRadius: 999,
              border: '1.5px solid rgba(0,0,0,0.08)',
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              color: '#111827',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 700,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.04)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.13)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)'
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.04)' }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>استكشف القائمة</h1>
        </div>

        {/* Category Icons Filter */}
        <div style={{ padding: '12px 12px' }}>
          <div
            className="explore-scrollbar"
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingBottom: 8,
              scrollSnapType: 'x mandatory',
            }}
          >
            {CUISINE_FILTERS.map((category) => (
              <div
                key={category.id}
                style={{
                  flexShrink: 0,
                  width: 80,
                  scrollSnapAlign: 'start',
                }}
              >
                <button
                  onClick={() => setActiveCategory(category.id)}
                  className="explore-category-btn"
                  style={{
                    border: 'none',
                    padding: '4px 2px 6px',
                    cursor: 'pointer',
                    background: 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 7,
                    width: '100%',
                  }}
                >
                  <div style={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: WHITE,
                    border: activeCategory === category.id ? `2.5px solid ${ORANGE}` : `2px solid ${BORDER}`,
                    boxShadow: activeCategory === category.id
                      ? `0 4px 16px ${ORANGE}55`
                      : '0 2px 10px rgba(0,0,0,0.09)',
                    flexShrink: 0,
                    transition: 'border 0.18s, box-shadow 0.18s',
                  }}>
                    <img
                      src={category.customImg || category.img}
                      alt={category.label}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      onError={(e) => {
                        e.currentTarget.style.objectFit = 'contain'
                        e.currentTarget.style.padding = '8px'
                      }}
                    />
                  </div>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: activeCategory === category.id ? ORANGE : TEXT,
                    textAlign: 'center',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    transition: 'color 0.18s',
                  }}>
                    {category.label}
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Offers List */}
        <div style={{ padding: '0 12px 20px' }}>
          {filteredOffers.length === 0 ? (
            <div style={{
              background: WHITE,
              borderRadius: 20,
              border: `1px solid ${BORDER}`,
              padding: '40px 20px',
              textAlign: 'center',
              color: MUTED,
              boxShadow: SHADOW,
            }}>
              <div style={{ fontSize: 13, marginBottom: 10 }}>🔍</div>
              <div style={{ fontWeight: 500, color: TEXT, marginBottom: 6, fontSize: 13 }}>
                لا توجد عروض في هذه الفئة
              </div>
              <div style={{ fontSize: 13 }}>جرّب فئة أخرى</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredOffers.map((offer) => (
                <OfferListCard
                  key={offer.id}
                  offer={offer}
                  onOfferClick={() => handleOfferClick(offer)}
                  onRestaurantClick={() => handleRestaurantClick(offer.restaurantId, offer.restaurantName || offer.restaurant)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}


function OfferListCard({ offer, onOfferClick, onRestaurantClick }) {
  const currentPrice = toNumber(offer.price ?? offer.finalPrice ?? offer.discountedPrice)
  const oldPrice = resolveOldPrice(offer, currentPrice)
  const rating = resolveRating(offer)
  const deliveryTime = resolveDeliveryTime(offer)
  const shortDescription = resolveShortDescription(offer)

  return (
    <div
      onClick={onOfferClick}
      style={{
        position: 'relative',
        background: WHITE,
        borderRadius: 22,
        padding: '12px 12px 12px 56px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        cursor: 'pointer',
        boxShadow: '0 6px 18px rgba(17, 24, 39, 0.06)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        border: `1px solid ${BORDER}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 14px 34px rgba(238, 123, 38, 0.14)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(17, 24, 39, 0.06)'
      }}
    >
      {/* صورة العرض — تظهر على اليمين في RTL لأنها أول عنصر */}
      <div style={{
        width: 130,
        minHeight: 130,
        alignSelf: 'stretch',
        borderRadius: 18,
        overflow: 'hidden',
        background: '#f0f0f0',
        flexShrink: 0,
        border: `1.5px solid ${BORDER}`,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'stretch',
        position: 'relative',
      }}>
        <OfferImage offer={offer} size="large" style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          flex: 1,
        }} />
      </div>

      {/* محتوى النص */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h3 style={{
          fontSize: 15,
          fontWeight: 700,
          color: TEXT,
          margin: '0 0 6px',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {offer.name}
        </h3>

        <p style={{
          fontSize: 11,
          color: MUTED,
          margin: '0 0 9px',
          lineHeight: 1.55,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {shortDescription}
        </p>

        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, rgba(229,231,235,0), rgba(229,231,235,1), rgba(229,231,235,0))',
          margin: '0 0 9px',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 9 }}>
          {currentPrice != null && (
            <span style={{ fontSize: 15, fontWeight: 800, color: ORANGE }} className="font-num">
              {currentPrice} ر.س
            </span>
          )}
          {oldPrice != null && oldPrice > (currentPrice ?? 0) && (
            <span style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'line-through' }} className="font-num">
              {oldPrice} ر.س
            </span>
          )}
          {oldPrice != null && currentPrice != null && oldPrice > currentPrice && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 8px',
              borderRadius: 999,
              background: ORANGE_SOFT,
              color: ORANGE_DARK,
              fontSize: 10,
              fontWeight: 700,
            }}>
              وفر {Math.round(oldPrice - currentPrice)} ر.س
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          <InfoPill label={`⭐ ${rating.toFixed ? rating.toFixed(1) : rating}`} />
          <InfoPill label={`⏱ ${deliveryTime}`} />
        </div>
      </div>

      {/* زر + على اليسار الفيزيائي (نهاية الكارت في RTL) */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onOfferClick()
        }}
        aria-label="فتح العرض"
        style={{
          position: 'absolute',
          left: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: `1px solid rgba(238, 123, 38, 0.18)`,
          background: ORANGE_SOFT,
          color: ORANGE_DARK,
          boxShadow: '0 6px 14px rgba(238, 123, 38, 0.16)',
          fontSize: 24,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        +
      </button>
    </div>
  )
}

function InfoPill({ label }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '5px 10px',
      borderRadius: 999,
      background: '#fffaf5',
      border: `1px solid rgba(238, 123, 38, 0.10)`,
      color: TEXT,
      fontSize: 10,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      minHeight: 28,
    }}>
      {label}
    </span>
  )
}
