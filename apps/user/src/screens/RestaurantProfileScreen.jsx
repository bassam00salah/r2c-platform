import { useState, useEffect } from 'react'
import { useApp } from '../contexts'
import OfferImage from '../components/OfferImage'
import { db } from '@r2c/shared'
import { collection, query, where, limit, getDocs } from 'firebase/firestore'

// ── خريطة OpenStreetMap عبر iframe ───────────────────────────────────────────
function BranchMap({ lat, lng, name }) {
  if (!lat || !lng) return null
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`
  return (
    <div className="mx-4 mb-4 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="bg-[#15487d] text-white text-sm font-bold px-4 py-2 flex items-center gap-2">
        <span>📍</span>
        <span>موقع الفرع — {name}</span>
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
          target="_blank"
          rel="noreferrer"
          className="mr-auto text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
        >
          فتح الخريطة ↗
        </a>
      </div>
      <iframe
        title={`خريطة ${name}`}
        src={src}
        width="100%"
        height="220"
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

  const restaurantOffers = (offers || []).filter(o =>
    o.restaurantId === selectedRestaurant?.id ||
    (o.restaurantName || o.restaurant) === selectedRestaurant?.name
  )

  useEffect(() => {
    if (!selectedRestaurant?.id) return
    setBranchStatus(null)
    setNearestBranch(null)

    const q = query(
      collection(db, 'branches'),
      where('restaurantId', '==', selectedRestaurant.id),
      where('status', '==', 'active'),
      limit(5)
    )

    getDocs(q).then(snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const anyOpen = docs.some(d => d.settings?.acceptingOrders !== false)
      setBranchStatus(anyOpen)
      // أول فرع له إحداثيات
      const withCoords = docs.find(d => d.latitude && d.longitude)
      if (withCoords) setNearestBranch(withCoords)
    }).catch(() => setBranchStatus(null))
  }, [selectedRestaurant?.id])

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-20 p-4 border-b flex items-center gap-4 shadow-sm">
        <button onClick={() => setCurrentScreen(viewMode)} className="text-2xl font-bold text-gray-700">←</button>
        <h1 className="text-xl font-bold text-[#15487d]">{selectedRestaurant?.name}</h1>
      </div>

      {/* معلومات المطعم */}
      <div className="p-8 bg-gray-50 flex flex-col items-center">
        <div className="w-24 h-24 bg-[#ee7b26]/10 border-2 border-[#ee7b26]/20 rounded-full flex items-center justify-center text-5xl mb-4">🏪</div>
        <h2 className="text-2xl font-bold">{selectedRestaurant?.name}</h2>
        <p className="text-gray-500 font-semibold mt-1">📍 {selectedRestaurant?.city}</p>
        <div className="flex gap-2 mt-4">
          {branchStatus === null
            ? <span className="bg-gray-100 text-gray-400 px-4 py-1 rounded-full text-sm font-bold">جاري التحقق...</span>
            : branchStatus
              ? <span className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-sm font-bold">مفتوح الآن ✅</span>
              : <span className="bg-red-100 text-red-600 px-4 py-1 rounded-full text-sm font-bold">مغلق حالياً 🔴</span>
          }
          <span className="bg-[#15487d]/10 text-[#15487d] px-4 py-1 rounded-full text-sm font-bold">⭐ 4.8</span>
        </div>
      </div>

      {/* ── الخريطة الحقيقية ── */}
      {nearestBranch ? (
        <BranchMap
          lat={nearestBranch.latitude}
          lng={nearestBranch.longitude}
          name={nearestBranch.name || nearestBranch.address || 'الفرع'}
        />
      ) : (
        branchStatus !== null && (
          <div className="mx-4 mb-4 rounded-2xl bg-gray-50 border border-gray-200 h-14 flex items-center justify-center text-gray-400 text-sm">
            لا تتوفر إحداثيات لهذا الفرع
          </div>
        )
      )}

      {/* العروض */}
      <div className="p-4">
        <h3 className="font-bold mb-4 text-lg border-r-4 border-[#ee7b26] pr-3">
          كافة عروضنا ({restaurantOffers.length})
        </h3>
        {restaurantOffers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">📭</div>
            <p className="font-semibold">لا توجد عروض متاحة حالياً</p>
          </div>
        ) : (
          <div className="space-y-4">
            {restaurantOffers.map(offer => {
              const price    = offer.price ?? offer.finalPrice ?? offer.discountedPrice ?? null
              const oldPrice = offer.oldPrice ?? offer.originalPrice ?? null
              return (
                <div
                  key={offer.id}
                  onClick={() => { setSelectedOffer(offer); setCurrentScreen('offerDetails') }}
                  className="flex bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-32 cursor-pointer hover:shadow-md transition-all"
                >
                  <div className="w-32 bg-gray-100 relative flex items-center justify-center overflow-hidden">
                    <OfferImage offer={offer} size="small" />
                    <div className="absolute top-2 right-2 bg-[#ee7b26] text-black text-[10px] font-bold px-2 py-0.5 rounded-lg">
                      خصم {offer.discount}%
                    </div>
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-center">
                    <h4 className="font-bold text-sm mb-1">{offer.name}</h4>
                    <div className="flex items-baseline gap-2 mt-1">
                      {price !== null && (
                        <span className="text-[#ee7b26] font-bold text-lg">{price} ريال</span>
                      )}
                      {oldPrice && (
                        <span className="text-gray-400 text-xs line-through">{oldPrice} ريال</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
