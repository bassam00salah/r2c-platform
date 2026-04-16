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
  { id: 'all', label: 'الكل', img: EMOJI_3D.all },
  { id: 'برجر', label: 'برجر', img: EMOJI_3D.burger, customImg: 'https://i.ibb.co/tPXQKJcL/image.png' },
  { id: 'بحب', label: 'عروض مميزة', img: EMOJI_3D.burger, customImg: 'https://i.ibb.co/ymG5qHhr/image.png' },
  { id: 'بيتزا', label: 'بيتزا', img: EMOJI_3D.pizza, customImg: 'https://i.ibb.co/JFdjTJmP/image.png' },
  { id: 'شاورما', label: 'شاورما', img: EMOJI_3D.shawarma, customImg: 'https://i.ibb.co/wh2wzQbt/image.png' },
  { id: 'دجاج', label: 'دجاج', img: EMOJI_3D.chicken, customImg: 'https://i.ibb.co/Z6JtJbxQ/image.png' },
  { id: 'بيتزا2', label: 'الأكثر مبيعًا', img: EMOJI_3D.fish, customImg: 'https://i.ibb.co/ymG5qHhr/image.png' },
  { id: 'مشاوي', label: 'مشروبات', img: EMOJI_3D.grills, customImg: 'https://i.ibb.co/TqWqjw7x/image.png' },
  { id: 'حلويات', label: 'حلويات', img: EMOJI_3D.sweets, customImg: 'https://i.ibb.co/q3tDHGtX/image.png' },
  { id: 'بطاطس', label: 'أفضل العروض', img: EMOJI_3D.burger, customImg: 'https://i.ibb.co/8DByX04b/image.png' },
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

  useEffect(() => {
    setBottomNav('explore')
  }, [setBottomNav])

  // تصفية العروض حسب الفئة المختارة
  const filteredOffers = useMemo(() => {
    if (activeCategory === 'all') {
      return offers || []
    }
    return (offers || []).filter(o => {
      const text = `${o.name || ''} ${o.description || ''} ${o.category || ''} ${o.cuisine || ''}`.toLowerCase()
      return text.includes(activeCategory.toLowerCase())
    })
  }, [offers, activeCategory])

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
          alignItems: 'center',
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
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className="explore-category-btn"
                style={{
                  flexShrink: 0,
                  width: 90,
                  border: activeCategory === category.id ? `2.5px solid ${ORANGE}` : `2px solid ${BORDER}`,
                  borderRadius: 16,
                  background: activeCategory === category.id ? ORANGE_SOFT : WHITE,
                  padding: '8px 6px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  scrollSnapAlign: 'start',
                }}
              >
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: WHITE,
                  border: `1.5px solid ${BORDER}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img
                    src={category.customImg || category.img}
                    alt={category.label}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={(e) => {
                      e.currentTarget.style.objectFit = 'contain'
                      e.currentTarget.style.padding = '6px'
                    }}
                  />
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: activeCategory === category.id ? ORANGE : TEXT,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}>
                  {category.label}
                </span>
              </button>
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
  const price = offer.price ?? offer.finalPrice ?? offer.discountedPrice
  const restName = offer.restaurantName || offer.restaurant || ''

  return (
    <div
      onClick={onOfferClick}
      style={{
        background: WHITE,
        borderRadius: 16,
        padding: '14px 12px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        cursor: 'pointer',
        boxShadow: SHADOW,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(238, 123, 38, 0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = SHADOW
      }}
    >
      {/* صورة العرض */}
      <div style={{
        width: 80,
        height: 80,
        borderRadius: 14,
        overflow: 'hidden',
        background: '#f0f0f0',
        flexShrink: 0,
        border: `1.5px solid ${BORDER}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <OfferImage offer={offer} size="medium" style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }} />

        {/* Discount Badge */}
        {offer.discount > 0 && (
          <div style={{
            position: 'absolute',
            top: 6,
            right: 6,
            background: ORANGE,
            color: WHITE,
            borderRadius: 8,
            padding: '3px 7px',
            fontSize: 10,
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}>
            <span>🔥</span>
            <span>{offer.discount}%</span>
          </div>
        )}
      </div>

      {/* معلومات العرض */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* اسم العرض */}
        <h3 style={{
          fontSize: 14,
          fontWeight: 600,
          color: TEXT,
          margin: '0 0 4px',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {offer.name}
        </h3>

        {/* اسم المطعم */}
        {restName && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRestaurantClick()
            }}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              color: ORANGE,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 6,
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              textAlign: 'right',
            }}
          >
            {restName}
          </button>
        )}

        {/* السعر */}
        {price && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: '#dcfce7',
            color: '#166534',
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
          }} className="font-num">
            <span>💚</span>
            <span>{price} ر.س</span>
          </div>
        )}
      </div>

      {/* Chevron */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={ORANGE}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 8 }}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  )
}
