import { useState, useEffect } from 'react'
import { useApp } from '../contexts'
import OfferImage from '../components/OfferImage'
// تأكد من مسار BackButton إذا كنت تستخدمه، في الكود الأصلي لم يكن مستخدماً في الـ JSX
// import BackButton from '../components/BackButton'
import { db } from '@r2c/shared'
import { collection, query, where, limit, getDocs, doc, getDoc } from 'firebase/firestore'

const ORANGE = '#ee7b26'
const NAVY = '#0d1f35'
const WHITE = '#ffffff'
const TEXT = '#111827'
const MUTED = '#6b7280'
const BORDER = '#e5e7eb'
const BG = '#f8fafc' // تم تفتيح لون الخلفية قليلاً لتباين أفضل

// ── خريطة OpenStreetMap عبر iframe ─────────────────────────────────────────────
function BranchMap({ lat, lng, name }) {
  if (!lat || !lng) return null
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`
  return (
    <div style={{
      margin: '0 16px 24px',
      borderRadius: 20,
      overflow: 'hidden',
      border: `1px solid ${BORDER}`,
      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        background: NAVY,
        color: WHITE,
        fontSize: 13,
        fontWeight: 600,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>📍</span>
        <span>موقع الفرع — {name}</span>
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
          target="_blank"
          rel="noreferrer"
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            background: 'rgba(255,255,255,0.15)',
            padding: '6px 14px',
            borderRadius: 999,
            color: WHITE,
            textDecoration: 'none',
            transition: 'background 0.2s ease',
            fontWeight: 500
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.25)'}
          onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.15)'}
        >
          الاتجاهات ↗
        </a>
      </div>
      <iframe
        title={`خريطة ${name}`}
        src={src}
        width="100%"
        height="200"
        style={{ border: 'none', display: 'block' }}
        loading="lazy"
      />
    </div>
  )
}

export default function RestaurantProfileScreen() {
  const { offers, selectedRestaurant, setSelectedOffer, setCurrentScreen, viewMode } = useApp()
  const [branchStatus, setBranchStatus] = useState(null)
  const [nearestBranch, setNearestBranch] = useState(null)
  const [restaurantData, setRestaurantData] = useState(null)

  useEffect(() => {
    if (!selectedRestaurant?.id) return
    setRestaurantData(null)
    getDoc(doc(db, 'restaurants', selectedRestaurant.id)).then(snap => {
      if (snap.exists()) setRestaurantData({ id: snap.id, ...snap.data() })
    }).catch(() => {})
  }, [selectedRestaurant?.id])

  const restaurantOffers = (offers || []).filter(o =>
    o.restaurantId === selectedRestaurant?.id ||
    (o.restaurantName || o.restaurant) === selectedRestaurant?.name
  )

  useEffect(() => {
    let cancelled = false
    if (!selectedRestaurant?.id) return undefined

    const resetId = setTimeout(() => {
      if (!cancelled) {
        setBranchStatus(null)
        setNearestBranch(null)
      }
    }, 0)

    const q = query(
      collection(db, 'branches'),
      where('restaurantId', '==', selectedRestaurant.id),
      where('status', '==', 'active'),
      limit(5)
    )

    getDocs(q).then(snap => {
      if (cancelled) return
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const anyOpen = docs.some(d => d.settings?.acceptingOrders !== false)
      const withCoords = docs.find(d => d.latitude && d.longitude)
      setBranchStatus(anyOpen)
      setNearestBranch(withCoords || null)
    }).catch(() => {
      if (!cancelled) setBranchStatus(null)
    })

    return () => {
      cancelled = true
      clearTimeout(resetId)
    }
  }, [selectedRestaurant?.id])

  return (
    <div dir="rtl" style={{
      minHeight: '100vh',
      background: BG,
      paddingBottom: 96,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '16px',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <button
          onClick={() => setCurrentScreen(viewMode)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: `1px solid ${BORDER}`,
            background: WHITE,
            cursor: 'pointer',
            color: NAVY,
            transition: 'all 0.2s ease',
            padding: 0
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = BG
            e.currentTarget.style.borderColor = '#d1d5db'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = WHITE
            e.currentTarget.style.borderColor = BORDER
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="10 19 16 12 10 5" />
          </svg>
        </button>
        <h1 style={{
          fontSize: 18,
          fontWeight: 700,
          color: NAVY,
          margin: 0,
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {selectedRestaurant?.name}
        </h1>
      </div>

      {/* معلومات المطعم - البطاقة الرئيسية */}
      <div style={{
        padding: '32px 16px',
        background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
        margin: '16px',
        borderRadius: 24,
        boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
        border: `1px solid rgba(255,255,255,0.8)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* تأثير زينة في الخلفية */}
        <div style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          background: `${ORANGE}10`,
          borderRadius: '50%',
          filter: 'blur(20px)',
          zIndex: 0
        }} />

        {/* صورة المطعم */}
        <div style={{
          width: 110,
          height: 110,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `4px solid ${WHITE}`,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: WHITE,
          boxShadow: `0 8px 24px ${ORANGE}25`,
          position: 'relative',
          zIndex: 1
        }}>
          {restaurantData?.imageUrl ? (
            <img
              src={restaurantData.imageUrl}
              alt={selectedRestaurant?.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={e => {
                e.currentTarget.style.display = 'none'
                if (e.currentTarget.nextSibling) {
                  e.currentTarget.nextSibling.style.display = 'flex'
                }
              }}
            />
          ) : null}
          <span style={{
            fontSize: 48,
            display: restaurantData?.imageUrl ? 'none' : 'flex',
          }}>
            🏪
          </span>
        </div>

        <h2 style={{
          fontSize: 22,
          fontWeight: 800,
          color: NAVY,
          margin: '0 0 6px',
          position: 'relative',
          zIndex: 1
        }}>
          {selectedRestaurant?.name}
        </h2>

        <p style={{
          fontSize: 14,
          color: MUTED,
          fontWeight: 500,
          margin: '0 0 20px',
          position: 'relative',
          zIndex: 1
        }}>
          📍 {selectedRestaurant?.city}
        </p>

        {/* الحالة والتقييم */}
        <div style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 1
        }}>
          {branchStatus === null ? (
            <span style={{
              background: '#f1f5f9',
              color: MUTED,
              padding: '6px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
            }}>
              ⏳ جاري التحقق...
            </span>
          ) : branchStatus ? (
            <span style={{
              background: '#ecfdf5',
              color: '#059669',
              padding: '6px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              border: '1px solid #a7f3d0'
            }}>
              🟢 مفتوح الآن
            </span>
          ) : (
            <span style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '6px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              border: '1px solid #fecaca'
            }}>
              🔴 مغلق حالياً
            </span>
          )}
          <span style={{
            background: '#fffbeb',
            color: '#d97706',
            padding: '6px 16px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            border: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            ⭐ 4.8
          </span>
        </div>
      </div>

      {/* العروض */}
      <div style={{ padding: '0 16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <h3 style={{
            fontSize: 18,
            fontWeight: 800,
            color: NAVY,
            margin: 0,
          }}>
            العروض المتاحة
          </h3>
          <span style={{
            background: `${ORANGE}15`,
            color: ORANGE,
            padding: '4px 10px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700
          }}>
            {restaurantOffers.length} عناصر
          </span>
        </div>

        {restaurantOffers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            color: MUTED,
            background: WHITE,
            borderRadius: 20,
            marginBottom: 20,
            border: `1px dashed ${BORDER}`
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>لا توجد عروض متاحة حالياً</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
            {restaurantOffers.map(offer => {
              const price = offer.price ?? offer.finalPrice ?? offer.discountedPrice ?? null
              const oldPrice = offer.oldPrice ?? offer.originalPrice ?? null
              return (
                <div
                  key={offer.id}
                  onClick={() => { setSelectedOffer(offer); setCurrentScreen('offerDetails') }}
                  style={{
                    display: 'flex',
                    background: WHITE,
                    borderRadius: 20,
                    padding: 8,
                    border: `1px solid ${BORDER}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = `${ORANGE}50`
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.05)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = BORDER
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* صورة العرض */}
                  <div style={{
                    width: 100,
                    height: 100,
                    borderRadius: 14,
                    background: BG,
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}>
                    <OfferImage offer={offer} size="small" style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }} />
                    {offer.discount > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        background: '#ef4444',
                        color: WHITE,
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 6,
                        boxShadow: '0 2px 4px rgba(239,68,68,0.3)',
                      }}>
                        -{offer.discount}%
                      </div>
                    )}
                  </div>

                  {/* معلومات العرض */}
                  <div style={{
                    padding: '8px 12px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}>
                    <h4 style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: NAVY,
                      margin: '0 0 6px',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {offer.name}
                    </h4>

                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {oldPrice && (
                          <span style={{
                            color: MUTED,
                            fontSize: 12,
                            textDecoration: 'line-through',
                            marginBottom: -2
                          }}>
                            {oldPrice} ريال
                          </span>
                        )}
                        {price !== null && (
                          <span style={{
                            color: ORANGE,
                            fontWeight: 800,
                            fontSize: 16,
                          }}>
                            {price} ريال
                          </span>
                        )}
                      </div>

                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: `${ORANGE}15`,
                        color: ORANGE,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                      }}>
                        +
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* الخريطة في الأسفل */}
      {nearestBranch ? (
        <BranchMap
          lat={nearestBranch.latitude}
          lng={nearestBranch.longitude}
          name={nearestBranch.name || nearestBranch.address || 'الفرع'}
        />
      ) : (
        branchStatus !== null && (
          <div style={{
            margin: '0 16px 24px',
            borderRadius: 16,
            background: WHITE,
            border: `1px dashed ${BORDER}`,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: MUTED,
            fontSize: 14,
            fontWeight: 500
          }}>
            📍 لا تتوفر إحداثيات لهذا الفرع حالياً
          </div>
        )
      )}
    </div>
  )
}
