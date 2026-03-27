import { useState } from 'react'
import { useApp } from '../contexts'

export default function GridScreen() {
    // ✅ إصلاح: كان يستخدم mockOffers (غير موجود) → offers
    const { offers, setSelectedOffer, setCurrentScreen } = useApp()
    const [searchQuery, setSearchQuery]   = useState('')
    const [selectedCity, setSelectedCity] = useState('الكل')

    const cities = ['الكل', ...Array.from(new Set((offers || []).map(o => o.city).filter(Boolean)))]

    const filteredOffers = (offers || []).filter(offer => {
        const matchesCity   = selectedCity === 'الكل' || offer.city === selectedCity
        const matchesSearch = !searchQuery.trim() ||
            offer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            offer.restaurant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            offer.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            offer.description?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCity && matchesSearch
    })

    return (
        <div className="min-h-screen bg-white pb-24">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 z-10 shadow-sm">
                <div className="p-4 pb-2">
                    <h1 className="text-xl font-bold text-[#15487d] text-center mb-3">البحث والاستكشاف</h1>
                    <div className="relative">
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
                        <input
                            type="text"
                            className="search-bar pr-10"
                            placeholder="ابحث عن عرض أو مطعم..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* فلتر المدن */}
                <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {cities.map(city => (
                        <button
                            key={city}
                            onClick={() => setSelectedCity(city)}
                            className={`city-chip ${selectedCity === city ? 'active' : ''}`}
                        >
                            {city}
                        </button>
                    ))}
                </div>
            </div>

            {/* عداد النتائج */}
            <div className="px-4 py-2 text-sm text-gray-400 font-semibold">
                {filteredOffers.length} عرض {searchQuery ? `لـ "${searchQuery}"` : ''}
            </div>

            {/* Grid */}
            <div className="p-4 pt-0">
                {filteredOffers.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <div className="text-6xl mb-4">🔍</div>
                        <p className="font-bold text-lg">لا توجد نتائج</p>
                        <p className="text-sm mt-2">جرب كلمة بحث مختلفة</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {filteredOffers.map((offer) => (
                            <div
                                key={offer.id}
                                onClick={() => { setSelectedOffer(offer); setCurrentScreen('offerDetails') }}
                                className="grid-card cursor-pointer border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="relative h-40 bg-gradient-to-br from-orange-900/20 to-gray-100 flex items-center justify-center overflow-hidden">
                                    <OfferImage offer={offer} size="medium" />
                                    <div className="absolute top-2 right-2">
                                        <div className="discount-badge text-sm px-2 py-1">
                                            خصم {offer.discount}%
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <h3 className="font-bold mb-1 text-sm leading-snug">{offer.name}</h3>
                                    <p className="text-xs text-gray-400 font-semibold mb-1">🏪 {offer.restaurant}</p>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                        <span>📍 {offer.city}</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-[#ee7b26] text-lg font-bold">{offer.price} ريال</span>
                                        {offer.oldPrice && (
                                            <span className="text-gray-400 text-xs line-through">{offer.oldPrice} ريال</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
