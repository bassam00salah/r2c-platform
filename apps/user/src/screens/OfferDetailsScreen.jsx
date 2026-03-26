import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import OfferImage from '../components/OfferImage'
import { db } from '@r2c/shared'
import { collection, query, where, limit, getDocs, doc, getDoc } from 'firebase/firestore'

// ── خريطة OpenStreetMap حقيقية عبر iframe ────────────────────────────────────
function BranchMap({ lat, lng, name }) {
  if (!lat || !lng) return null
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="bg-[#15487d] text-white text-sm font-bold px-4 py-2 flex items-center gap-2">
        <span>📍</span>
        <span>{name}</span>
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
        height="200"
        style={{ border: 'none', display: 'block' }}
        loading="lazy"
      />
    </div>
  )
}

export default function OfferDetailsScreen() {
  const { selectedOffer, setCurrentScreen, viewMode } = useApp()
  const [nearestBranch, setNearestBranch] = useState(null)
  const [mapLoading, setMapLoading] = useState(true)

  // ── جلب إحداثيات الفرع من Firestore ─────────────────────────────────────
  useEffect(() => {
    if (!selectedOffer) return
    setMapLoading(true)
    setNearestBranch(null)

    const branchId    = selectedOffer.branchId    || selectedOffer.branch_id    || null
    const restaurantId = selectedOffer.restaurantId || selectedOffer.restaurant_id || null

    const fetchBranch = async () => {
      try {
        // محاولة 1: عبر branchId مباشرة
        if (branchId) {
          const snap = await getDoc(doc(db, 'branches', branchId))
          if (snap.exists()) {
            const data = { id: snap.id, ...snap.data() }
            if (data.latitude && data.longitude) {
              setNearestBranch(data)
              setMapLoading(false)
              return
            }
          }
        }
        // محاولة 2: عبر restaurantId
        if (restaurantId) {
          const q = query(
            collection(db, 'branches'),
            where('restaurantId', '==', restaurantId),
            where('status', '==', 'active'),
            limit(5)
          )
          const snap = await getDocs(q)
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          const withCoords = docs.find(d => d.latitude && d.longitude)
          if (withCoords) {
            setNearestBranch(withCoords)
            setMapLoading(false)
            return
          }
        }
      } catch (err) {
        console.error('خطأ في جلب إحداثيات الفرع:', err)
      }
      setMapLoading(false)
    }

    fetchBranch()
  }, [selectedOffer?.id])

  if (!selectedOffer) return null

  const offerDuration = selectedOffer.duration || 45

  // ── استخراج السعر بشكل صحيح من أي حقل ──────────────────────────────────
  const price    = selectedOffer.price
               ?? selectedOffer.finalPrice
               ?? selectedOffer.discountedPrice
               ?? selectedOffer.newPrice
               ?? null

  const oldPrice = selectedOffer.oldPrice
               ?? selectedOffer.originalPrice
               ?? selectedOffer.beforePrice
               ?? null

  const branchName = nearestBranch?.name
                  || nearestBranch?.address
                  || selectedOffer.branch
                  || selectedOffer.branchName
                  || 'الفرع الرئيسي'

  const branchAddress = nearestBranch?.address
                     || nearestBranch?.city
                     || selectedOffer.branchAddress
                     || selectedOffer.city
                     || null

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 p-4">
        <button onClick={() => setCurrentScreen(viewMode)} className="text-gray-900 text-2xl">←</button>
      </div>

      {/* Image */}
      <div className="relative h-80 bg-gradient-to-br from-orange-900/20 to-gray-100 flex items-center justify-center overflow-hidden">
        <OfferImage offer={selectedOffer} size="large" />
        <div className="absolute top-4 right-4">
          <div className="discount-badge">خصم {selectedOffer.discount}%</div>
        </div>
      </div>

      {/* Details */}
      <div className="p-6 pb-24">
        <h1 className="text-3xl font-bold mb-2">{selectedOffer.name}</h1>
        <div className="flex items-center gap-2 text-gray-500 mb-6">
          <span>📍</span>
          <span>{selectedOffer.city}{selectedOffer.distance ? ` • ${selectedOffer.distance}` : ''}</span>
        </div>

        <div className="bg-gradient-to-r from-[#ee7b26]/20 to-[#d96b1a]/20 border border-[#ee7b26]/30 rounded-2xl p-6 mb-6">
          <h3 className="text-[#ee7b26] font-bold text-xl mb-4">تفاصيل العرض</h3>
          {selectedOffer.description && (
            <p className="text-gray-600 mb-6">{selectedOffer.description}</p>
          )}

          <div className="space-y-2 mb-6">
            {(selectedOffer.details || []).map((detail, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[#ee7b26]">•</span>
                <span>{detail}</span>
              </div>
            ))}
          </div>

          {/* ── السعر الحقيقي ── */}
          <div className="flex items-baseline gap-3">
            {price !== null && price !== undefined ? (
              <span className="text-[#ee7b26] text-5xl font-bold">
                {Number(price).toLocaleString('ar-SA')} ريال
              </span>
            ) : (
              <span className="text-gray-400 text-lg">السعر غير محدد</span>
            )}
            {oldPrice !== null && oldPrice !== undefined && (
              <span className="text-gray-500 text-xl line-through">
                {Number(oldPrice).toLocaleString('ar-SA')} ريال
              </span>
            )}
          </div>
        </div>

        {/* مدة الصلاحية */}
        <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-xl py-3 mb-6">
          <span className="text-[#ee7b26]">⏱</span>
          <span className="font-semibold text-amber-800">صالح لمدة {offerDuration} دقيقة بعد قبول الطلب</span>
        </div>

        {/* ── موقع الفرع + الخريطة الحقيقية ── */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[#ee7b26] text-2xl">📍</span>
            <div>
              <div className="font-bold">{branchName}</div>
              {branchAddress && (
                <div className="text-sm text-gray-500">{branchAddress}</div>
              )}
            </div>
          </div>

          {mapLoading ? (
            <div className="h-32 bg-gray-100 rounded-xl flex items-center justify-center gap-2 text-gray-400">
              <div className="w-5 h-5 border-2 border-[#ee7b26] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">جاري تحميل الخريطة...</span>
            </div>
          ) : nearestBranch ? (
            <BranchMap
              lat={nearestBranch.latitude}
              lng={nearestBranch.longitude}
              name={branchName}
            />
          ) : (
            <div className="h-32 bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 gap-2">
              <span className="text-3xl">🗺️</span>
              <span className="text-sm">لا تتوفر إحداثيات لهذا الفرع</span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCurrentScreen('confirmOrder')}
          className="gradient-button text-white font-bold text-xl py-4 rounded-2xl w-full transition-transform"
        >
          اطلب الآن
        </button>
      </div>
    </div>
  )
}
