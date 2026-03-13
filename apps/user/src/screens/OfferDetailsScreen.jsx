import { useApp } from '../context/AppContext'
// ✅ إصلاح: كان OfferImage مستخدماً بدون import
import OfferImage from '../components/OfferImage'

export default function OfferDetailsScreen() {
    const { selectedOffer, setCurrentScreen, viewMode } = useApp()
    if (!selectedOffer) return null

    const offerDuration = selectedOffer.duration || 45

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

                    <div className="flex items-baseline gap-3">
                        <span className="text-[#ee7b26] text-5xl font-bold">{selectedOffer.price} ريال</span>
                        {selectedOffer.oldPrice && (
                            <span className="text-gray-500 text-xl line-through">{selectedOffer.oldPrice} ريال</span>
                        )}
                    </div>
                </div>

                {/* مدة الصلاحية */}
                <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-xl py-3 mb-6">
                    <span className="text-[#ee7b26]">⏱</span>
                    <span className="font-semibold text-amber-800">صالح لمدة {offerDuration} دقيقة بعد قبول الطلب</span>
                </div>

                {/* Map Placeholder */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-[#ee7b26] text-2xl">📍</span>
                        <div>
                            <div className="font-bold">{selectedOffer.branch || 'الفرع الرئيسي'}</div>
                            {selectedOffer.branchAddress && (
                                <div className="text-sm text-gray-500">{selectedOffer.branchAddress}</div>
                            )}
                        </div>
                    </div>
                    <div className="h-32 bg-gray-100 rounded-xl flex items-center justify-center">
                        <span className="text-[#ee7b26] text-4xl">🗺️</span>
                    </div>
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
