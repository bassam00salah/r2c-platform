import { useState } from 'react'
import { useApp } from '../context/AppContext'
import OfferImage from '../components/OfferImage'

export default function FeedScreen() {
    const {
        offers,
        loadingOffers,
        setCurrentScreen,
        setSelectedOffer,
        setSelectedRestaurant,
        viewMode,
        setViewMode,
    } = useApp()

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCity, setSelectedCity] = useState('الكل')

    const cities = ['الكل', ...new Set((offers || []).map(o => o.city).filter(Boolean))]

    const filtered = (offers || []).filter(offer => {
        const matchCity = selectedCity === 'الكل' || offer.city === selectedCity
        const restName = offer.restaurantName || offer.restaurant || ''
        const matchSearch =
            !searchQuery ||
            offer.name?.includes(searchQuery) ||
            restName.includes(searchQuery) ||
            offer.city?.includes(searchQuery)
        return matchCity && matchSearch
    })

    if (loadingOffers) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="spinner mb-4 mx-auto"></div>
                    <p className="text-gray-500">جاري تحميل العروض...</p>
                </div>
            </div>
        )
    }

    if (!offers || offers.length === 0) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="text-8xl mb-8">📭</div>
                    <h1 className="text-3xl font-bold mb-4">لا توجد عروض حالياً</h1>
                    <p className="text-gray-500 mb-8">سيتم إضافة عروض جديدة قريباً!</p>
                    <button onClick={() => window.location.reload()} className="gradient-button">تحديث</button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col bg-black overflow-hidden" dir="rtl">

            {/* ── Header ── */}
            <div className="flex-none bg-white shadow-sm px-4 pt-4 pb-3 z-20">

                {/* ✅ اللوجو في المنتصف + أزرار التبديل على اليسار */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    {/* اللوجو في المنتصف */}
                    <img
                        src="/logo.png"
                        alt="R2C"
                        style={{ height: 36, width: 'auto', maxWidth: 100, objectFit: 'contain' }}
                    />
                    {/* أزرار التبديل على اليسار */}
                    <div style={{ position: 'absolute', left: 0, display: 'flex', gap: 8 }}>
                        <button
                            onClick={() => setViewMode('feed')}
                            style={{
                                padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                background: viewMode === 'feed' ? '#ee7b26' : '#f3f4f6',
                                color: viewMode === 'feed' ? '#fff' : '#4b5563',
                                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                        >بطاقات</button>
                        <button
                            onClick={() => { setViewMode('grid'); setCurrentScreen('grid') }}
                            style={{
                                padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                background: viewMode === 'grid' ? '#ee7b26' : '#f3f4f6',
                                color: viewMode === 'grid' ? '#fff' : '#4b5563',
                                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                        >شبكة</button>
                    </div>
                </div>

                <input
                    type="text"
                    placeholder="ابحث عن عرض أو مطعم..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="search-bar w-full mb-3"
                />

                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {cities.map(city => (
                        <button
                            key={city}
                            onClick={() => setSelectedCity(city)}
                            className="city-chip"
                            style={selectedCity === city
                                ? { background: '#ee7b26', color: '#fff', borderColor: '#ee7b26' }
                                : {}}
                        >
                            {city}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Feed scroll ── */}
            <div
                className="flex-1 min-h-0"
                style={{
                    overflowY: 'scroll',
                    scrollSnapType: 'y mandatory',
                    scrollBehavior: 'smooth',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                {filtered.length === 0 ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <div style={{ fontSize: '4rem', marginBottom: 16 }}>🔍</div>
                        <p style={{ fontWeight: 700, fontSize: 18 }}>لا توجد نتائج</p>
                    </div>
                ) : (
                    filtered.map(offer => {
                        const restName = offer.restaurantName || offer.restaurant || ''
                        const price    = offer.price ?? offer.finalPrice ?? offer.discountedPrice ?? null
                        const oldPrice = offer.oldPrice ?? offer.originalPrice ?? null

                        return (
                            <div
                                key={offer.id}
                                onClick={() => { setSelectedOffer(offer); setCurrentScreen('offerDetails') }}
                                style={{
                                    height: '100%', minHeight: '100%',
                                    scrollSnapAlign: 'start',
                                    position: 'relative', overflow: 'hidden',
                                    cursor: 'pointer', backgroundColor: '#111',
                                }}
                            >
                                {/* خلفية الصورة/الفيديو */}
                                <div style={{ position: 'absolute', inset: 0 }}>
                                    <OfferImage offer={offer} size="fullscreen" />
                                </div>

                                {/* Gradient overlay */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.15) 100%)',
                                }} />

                                {/* شارة الخصم — أعلى اليسار */}
                                <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                                    <div style={{
                                        background: '#ee7b26', color: '#000', fontWeight: 800,
                                        padding: '6px 14px', borderRadius: 12, fontSize: 16,
                                    }}>
                                        خصم {offer.discount}%
                                    </div>
                                </div>

                                {/* اسم المطعم — أعلى اليمين */}
                                <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
                                    <div
                                        onClick={e => {
                                            e.stopPropagation()
                                            setSelectedRestaurant({ id: offer.restaurantId, name: restName, city: offer.city })
                                            setCurrentScreen('restaurantProfile')
                                        }}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            background: '#15487d', color: '#fff',
                                            padding: '6px 14px', borderRadius: 10,
                                            fontSize: 14, fontWeight: 700,
                                            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                                        }}
                                    >
                                        <span>🏪</span>
                                        <span>{restName}</span>
                                    </div>
                                </div>

                                {/* محتوى الأسفل */}
                                <div style={{
                                    position: 'absolute', bottom: 0, right: 0, left: 0,
                                    padding: '20px 20px 100px', zIndex: 10,
                                }}>
                                    <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 6, textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>
                                        {offer.name}
                                    </h2>

                                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span>📍</span>
                                        <span>{offer.city}{offer.distance ? ` - ${offer.distance}` : ''}</span>
                                    </div>

                                    {price !== null && price !== undefined && (
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
                                            <span style={{ color: '#ee7b26', fontSize: 28, fontWeight: 900 }}>{price} ريال</span>
                                            {oldPrice && (
                                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'line-through' }}>{oldPrice} ريال</span>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        onClick={e => { e.stopPropagation(); setSelectedOffer(offer); setCurrentScreen('offerDetails') }}
                                        style={{
                                            width: '100%', background: '#ee7b26', color: '#fff',
                                            fontWeight: 800, fontSize: 18, padding: '14px',
                                            borderRadius: 16, border: 'none', cursor: 'pointer',
                                            boxShadow: '0 4px 15px rgba(238,123,38,0.5)',
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        اضغط للحصول على الخصم
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
