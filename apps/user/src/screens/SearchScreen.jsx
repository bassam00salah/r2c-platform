import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../contexts'
import OfferImage from '../components/OfferImage'
import { db } from '@r2c/shared/firebase/config'
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore'

const ORANGE = '#ee7b26'
const NAVY   = '#110d35'

const CUSTOM_CATEGORIES = [
    { id: 'family',   label: 'عروض عائلية',  emoji: '🍗' },
    { id: 'birthday', label: 'أعياد ميلاد',  emoji: '🎂' },
    { id: 'grills',   label: 'مشاوي',        emoji: '🔥' },
    { id: 'sweets',   label: 'حلويات',       emoji: '🍰' },
]


export default function SearchScreen() {
    const {
        offers,
        loadingOffers,
        setCurrentScreen,
        setSelectedOffer,
        setSelectedRestaurant,
        globalHeaderSearchQuery,
    } = useApp()

    const searchQuery = globalHeaderSearchQuery || ''
    const [activeCategory, setActiveCategory] = useState(null)
    const [sortBy, setSortBy]                 = useState('default')
    const [showSortMenu, setShowSortMenu]     = useState(false)

    // جلب المطاعم مباشرة من Firestore
    const [allRestaurants, setAllRestaurants] = useState([])
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'restaurants'), snap => {
            setAllRestaurants(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        })
        return () => unsub()
    }, [])


    // البانر من Firestore
    const [bannerRestaurantId, setBannerRestaurantId]     = useState(null)
    const [bannerRestaurantName, setBannerRestaurantName] = useState(null)
    const [bannerText, setBannerText]                     = useState(null)

    // إغلاق قائمة التصنيف عند الضغط خارجها
    useEffect(() => {
        if (!showSortMenu) return
        const handler = () => setShowSortMenu(false)
        document.addEventListener('click', handler)
        return () => document.removeEventListener('click', handler)
    }, [showSortMenu])

    useEffect(() => {
        getDoc(doc(db, 'system', 'settings')).then(snap => {
            if (snap.exists()) {
                const d = snap.data()
                if (d.bannerRestaurantId)   setBannerRestaurantId(d.bannerRestaurantId)
                if (d.bannerRestaurantName) setBannerRestaurantName(d.bannerRestaurantName)
                if (d.bannerText)           setBannerText(d.bannerText)
            }
        }).catch(() => {})
    }, [])

    const handleBannerClick = () => {
        if (!bannerRestaurantId) return
        setSelectedRestaurant({ id: bannerRestaurantId, name: bannerRestaurantName || '', city: '' })
        setCurrentScreen('restaurantProfile')
    }

    // إحصائيات العروض لكل مطعم (من offers)
    const offerStats = useMemo(() => {
        const map = {}
        ;(offers || []).forEach(o => {
            const id = o.restaurantId || o.restaurant || o.restaurantName
            if (!id) return
            if (!map[id]) map[id] = { offerCount: 0, maxDiscount: 0, maxPrice: 0, totalOrders: 0 }
            map[id].offerCount++
            if ((o.discount || 0) > map[id].maxDiscount) map[id].maxDiscount = o.discount || 0
            const price = o.price ?? o.originalPrice ?? o.oldPrice ?? 0
            if (price > map[id].maxPrice) map[id].maxPrice = price
        })
        return map
    }, [offers])

    // دمج المطاعم من Firestore مع إحصائيات العروض
    const restaurants = useMemo(() => {
        // إذا لم تُحمَّل المطاعم بعد، استخدم ما يمكن اشتقاقه من العروض مؤقتاً
        const base = allRestaurants.length > 0 ? allRestaurants : (() => {
            const map = {}
            ;(offers || []).forEach(o => {
                const id   = o.restaurantId || o.restaurant || o.restaurantName
                const name = o.restaurantName || o.restaurant || ''
                if (!id || !name || map[id]) return
                map[id] = { id, name, city: o.city || '', cuisine: o.cuisine || o.category || 'متنوع' }
            })
            return Object.values(map)
        })()
        return base.map(r => ({
            ...r,
            offerCount:  offerStats[r.id]?.offerCount  || 0,
            maxDiscount: offerStats[r.id]?.maxDiscount || 0,
            maxPrice:    offerStats[r.id]?.maxPrice    || 0,
        }))
    }, [allRestaurants, offers, offerStats])

    const featured = useMemo(() =>
        [...(offers || [])].sort((a, b) => (b.discount || 0) - (a.discount || 0)).slice(0, 6),
    [offers])

    // كلمات مفتاحية لكل فئة
    const CATEGORY_KEYWORDS = {
        family:   ['عائلي', 'عائلة', 'وجبة', 'عيلة'],
        birthday: ['ميلاد', 'عيد', 'كيك', 'تورتة', 'حفلة'],
        grills:   ['مشوي', 'مشاوي', 'كباب', 'شيش', 'تكا', 'برجر', 'لحم'],
        sweets:   ['حلو', 'حلويات', 'كيك', 'بسبوسة', 'كنافة'],
    }

    // IDs المطاعم التي لها عروض في الفئة المختارة
    const restaurantsInCategory = useMemo(() => {
        if (!activeCategory) return null
        const keywords = CATEGORY_KEYWORDS[activeCategory] || []
        const ids = new Set()
        ;(offers || []).forEach(o => {
            const text = ((o.name || '') + ' ' + (o.description || '') + ' ' + (o.category || '')).toLowerCase()
            if (keywords.some(k => text.includes(k))) {
                const id = o.restaurantId || o.restaurant || o.restaurantName
                if (id) ids.add(id)
            }
        })
        return ids
    }, [activeCategory, offers])

    const filteredRestaurants = useMemo(() => {
        const q = searchQuery.trim()
        let list = restaurants.filter(r => {
            const matchSearch = !q || r.name.includes(q) || r.city.includes(q) || r.cuisine.includes(q)
            const matchCat    = !restaurantsInCategory || restaurantsInCategory.has(r.id)
            return matchSearch && matchCat
        })
        if      (sortBy === 'discount') list = [...list].sort((a, b) => b.maxDiscount - a.maxDiscount)
        else if (sortBy === 'price')    list = [...list].sort((a, b) => b.maxPrice    - a.maxPrice)
        else if (sortBy === 'popular')  list = [...list].sort((a, b) => b.offerCount  - a.offerCount)
        else                            list = [...list].sort((a, b) => b.offerCount  - a.offerCount)
        return list
    }, [restaurants, searchQuery, sortBy, restaurantsInCategory])

    const filteredOffers = useMemo(() => {
        const q = searchQuery.trim()
        if (!q) return []
        return (offers || []).filter(o =>
            o.name?.includes(q) ||
            (o.restaurantName || o.restaurant || '').includes(q) ||
            o.city?.includes(q)
        )
    }, [offers, searchQuery])

    const isSearching = searchQuery.trim().length > 0

    return (
        <div dir="rtl" style={{ background: '#f5f5f7', minHeight: '100vh', paddingBottom: 80, fontFamily: 'inherit' }}>

            {/* SEARCH RESULTS */}
            {isSearching ? (
                <div style={{ padding: '14px 12px 0' }}>
                    <SectionTitle title={'نتائج البحث (' + filteredOffers.length + ')'} />
                    {loadingOffers ? <LoadingSkeleton /> : filteredOffers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                            <p style={{ fontWeight: 700 }}>لا توجد نتائج لـ "{searchQuery}"</p>
                        </div>
                    ) : (
                        filteredOffers.map(offer => (
                            <OfferRow key={offer.id} offer={offer}
                                onClick={() => { setSelectedOffer(offer); setCurrentScreen('offerDetails') }} />
                        ))
                    )}
                </div>
            ) : (
            <>
                {/* HERO BANNER */}
                <div style={{ padding: '14px 12px 0' }}>
                    <div
                        onClick={bannerRestaurantId ? handleBannerClick : undefined}
                        style={{
                            borderRadius: 16, overflow: 'hidden',
                            background: 'linear-gradient(135deg, #1a0800 0%, #5c2200 40%, #c45000 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '18px 18px', minHeight: 108, position: 'relative',
                            cursor: bannerRestaurantId ? 'pointer' : 'default',
                        }}
                        onMouseEnter={e => { if (bannerRestaurantId) e.currentTarget.style.opacity = '0.9' }}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                        <div style={{
                            position: 'absolute', inset: 0, pointerEvents: 'none',
                            background: 'radial-gradient(ellipse at 65% 50%, rgba(238,123,38,0.3) 0%, transparent 70%)',
                        }} />
                        <div style={{ zIndex: 1 }}>
                            {bannerText ? (
                                <p style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: 0, lineHeight: 1.3 }}>{bannerText}</p>
                            ) : (
                                <>
                                    <p style={{ color: '#fff',    fontSize: 24, fontWeight: 900, margin: 0, lineHeight: 1.25 }}>مشكوك</p>
                                    <p style={{ color: '#f5c842', fontSize: 24, fontWeight: 900, margin: 0, lineHeight: 1.25 }}>خيارك الأول</p>
                                </>
                            )}
                            {bannerRestaurantId && (
                                <div style={{
                                    marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                                    background: 'rgba(255,255,255,0.15)', borderRadius: 20,
                                    padding: '4px 12px', fontSize: 12, color: 'rgba(255,255,255,0.9)',
                                }}>
                                    <span>🏪</span>
                                    <span>{bannerRestaurantName || 'اعرف المزيد'}</span>
                                    <span style={{ fontSize: 10, opacity: 0.7 }}>←</span>
                                </div>
                            )}
                        </div>
                        <div style={{ zIndex: 1, textAlign: 'center' }}>
                            <img src="/logo.png" alt="R2C"
                                style={{ height: 52, width: 'auto', objectFit: 'contain', display: 'block' }}
                                onError={e => { e.target.style.display = 'none' }} />
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8, letterSpacing: 1, margin: '4px 0 0', textTransform: 'uppercase' }}>
                                Restaurant to Customer
                            </p>
                        </div>
                    </div>
                </div>

                {/* CUSTOM CATEGORIES */}
                <div style={{ padding: '18px 12px 0' }}>
                    <SectionTitle title="عروض مخصصة" />
                    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                        {CUSTOM_CATEGORIES.map(cat => (
                            <button key={cat.id}
                                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                                style={{
                                    flexShrink: 0,
                                    background: activeCategory === cat.id ? ORANGE : '#fff',
                                    color:      activeCategory === cat.id ? '#fff'  : NAVY,
                                    border:     '1.5px solid ' + (activeCategory === cat.id ? ORANGE : '#e0e0e0'),
                                    borderRadius: 14, padding: '10px 14px',
                                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 7,
                                    whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.18s',
                                }}
                            >
                                <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* FEATURED OFFERS */}
                {featured.length > 0 && (
                    <div style={{ padding: '18px 12px 0' }}>
                        <SectionTitle title="عروض مميزة" />
                        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                            {featured.map(offer => (
                                <div key={offer.id}
                                    onClick={() => { setSelectedOffer(offer); setCurrentScreen('offerDetails') }}
                                    style={{
                                        flexShrink: 0, width: 155, borderRadius: 14,
                                        overflow: 'hidden', background: NAVY,
                                        cursor: 'pointer', position: 'relative',
                                        boxShadow: '0 3px 12px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    <div style={{ width: '100%', height: 88, overflow: 'hidden', position: 'relative' }}>
                                        <OfferImage offer={offer} size="small" />
                                        <div style={{
                                            position: 'absolute', top: 7, right: 7,
                                            background: ORANGE, color: '#fff',
                                            fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 8,
                                        }}>خصم {offer.discount}%</div>
                                    </div>
                                    <div style={{ padding: '8px 10px' }}>
                                        <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {offer.restaurantName || offer.restaurant || 'عرض مميز'}
                                        </p>
                                        {offer.name && (
                                            <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {offer.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* RESTAURANTS LIST */}
                <div style={{ padding: '18px 12px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>
                            المطاعم {filteredRestaurants.length > 0 && <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>({filteredRestaurants.length})</span>}
                        </h2>
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={e => { e.stopPropagation(); setShowSortMenu(v => !v) }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: sortBy !== 'default' ? ORANGE : '#fff',
                                    color: sortBy !== 'default' ? '#fff' : '#555',
                                    border: '1px solid ' + (sortBy !== 'default' ? ORANGE : '#e0e0e0'),
                                    borderRadius: 20, padding: '7px 14px',
                                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                <span>≡</span>
                                <span>
                                    {sortBy === 'popular'  ? 'الأكثر مبيعاً' :
                                     sortBy === 'discount' ? 'أعلى خصم'      :
                                     sortBy === 'price'    ? 'الأعلى سعراً'  : 'تصنيف'}
                                </span>
                                <span style={{ fontSize: 10, opacity: 0.7 }}>{showSortMenu ? '▲' : '▼'}</span>
                            </button>

                            {showSortMenu && (
                                <div onClick={e => e.stopPropagation()} style={{
                                    position: 'absolute', top: 40, left: 0,
                                    background: '#fff', borderRadius: 12,
                                    boxShadow: '0 6px 24px rgba(0,0,0,0.13)',
                                    border: '1px solid #f0f0f0',
                                    zIndex: 50, minWidth: 160, overflow: 'hidden',
                                }}>
                                    {[
                                        { key: 'default',  label: 'افتراضي',       icon: '≡'  },
                                        { key: 'popular',  label: 'الأكثر مبيعاً', icon: '🏆' },
                                        { key: 'discount', label: 'أعلى خصم',      icon: '🔥' },
                                        { key: 'price',    label: 'الأعلى سعراً',  icon: '💰' },
                                    ].map(opt => (
                                        <div
                                            key={opt.key}
                                            onClick={e => { e.stopPropagation(); setSortBy(opt.key); setShowSortMenu(false) }}
                                            style={{
                                                padding: '11px 16px', cursor: 'pointer',
                                                background: sortBy === opt.key ? '#fff7ed' : 'transparent',
                                                color: sortBy === opt.key ? ORANGE : '#333',
                                                fontWeight: sortBy === opt.key ? 700 : 500,
                                                fontSize: 14, display: 'flex', alignItems: 'center', gap: 10,
                                                borderBottom: '1px solid #f9fafb',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                            onMouseLeave={e => e.currentTarget.style.background = sortBy === opt.key ? '#fff7ed' : 'transparent'}
                                        >
                                            <span>{opt.icon}</span><span>{opt.label}</span>
                                            {sortBy === opt.key && <span style={{ marginRight: 'auto', color: ORANGE }}>✓</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    {loadingOffers ? <LoadingSkeleton /> : filteredRestaurants.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                            <div style={{ fontSize: 40, marginBottom: 10 }}>{activeCategory ? '🔍' : '🏪'}</div>
                            <p style={{ fontWeight: 700, margin: 0 }}>{activeCategory ? 'لا توجد مطاعم في هذه الفئة' : 'لا توجد مطاعم'}</p>
                            {activeCategory && <p style={{ fontSize: 13, marginTop: 6 }}>جرب فئة أخرى أو اضغط عليها مرة أخرى لإلغاء التصفية</p>}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {filteredRestaurants.map(r => (
                                <RestaurantCard key={r.id} restaurant={r} offers={offers}
                                    onClick={() => { setSelectedRestaurant({ id: r.id, name: r.name, city: r.city }); setCurrentScreen('restaurantProfile') }} />
                            ))}
                        </div>
                    )}
                </div>
            </>
            )}
        </div>
    )
}

function SectionTitle({ title }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1a1a2e', whiteSpace: 'nowrap' }}>{title}</h2>
            <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
        </div>
    )
}


function RestaurantCard({ restaurant: r, offers, onClick }) {
    const repOffer = (offers || []).find(o => (o.restaurantId || o.restaurant || o.restaurantName) === r.id)
    return (
        <div onClick={onClick} style={{
            background: '#fff', borderRadius: 16, overflow: 'hidden',
            display: 'flex', alignItems: 'stretch', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        }}>
            <div style={{ width: 115, height: 100, flexShrink: 0, overflow: 'hidden', background: '#eee', position: 'relative' }}>
                {repOffer
                    ? <OfferImage offer={repOffer} size="small" />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🏪</div>
                }
            </div>
            <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e' }}>{r.name}</span>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: ORANGE, display: 'inline-block' }} />
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#777' }}>{r.cuisine}{r.city ? ' · ' + r.city : ''}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: '#999' }}>{r.offerCount} عروض</span>
                    {r.maxDiscount > 0 && (
                        <span style={{ background: ORANGE, color: '#fff', borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                            خصم {r.maxDiscount}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

function OfferRow({ offer, onClick }) {
    const restName = offer.restaurantName || offer.restaurant || ''
    return (
        <div onClick={onClick} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
        }}>
            <div style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#eee' }}>
                <OfferImage offer={offer} size="small" />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{offer.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{restName}</div>
                {offer.city && <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>📍 {offer.city}</div>}
            </div>
            <div style={{ background: ORANGE, color: '#fff', fontWeight: 700, padding: '4px 10px', borderRadius: 8, fontSize: 12, flexShrink: 0 }}>
                خصم {offer.discount}%
            </div>
        </div>
    )
}

function LoadingSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
                <div key={i} style={{ background: '#fff', borderRadius: 16, height: 100, display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: 115, background: '#eee' }} />
                    <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ height: 14, background: '#eee', borderRadius: 8, width: '55%' }} />
                        <div style={{ height: 11, background: '#eee', borderRadius: 8, width: '75%' }} />
                        <div style={{ height: 20, background: '#eee', borderRadius: 8, width: 60 }} />
                    </div>
                </div>
            ))}
        </div>
    )
}
