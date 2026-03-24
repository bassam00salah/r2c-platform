import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import OfferImage from '../components/OfferImage'

const ORANGE = '#ee7b26'
const NAVY   = '#110d35'

const CUSTOM_CATEGORIES = [
    { id: 'family',   label: 'عروض عائلية',  emoji: '🍗' },
    { id: 'birthday', label: 'أعياد ميلاد',  emoji: '🎂' },
    { id: 'halls',    label: 'عروض مناقق',   emoji: '🏛️' },
    { id: 'trips',    label: 'رحلات بحرية',  emoji: '🚢' },
]

export default function SearchScreen() {
    const {
        offers,
        loadingOffers,
        setCurrentScreen,
        setSelectedOffer,
        setSelectedRestaurant,
    } = useApp()

    const [searchQuery, setSearchQuery]     = useState('')
    const [activeCategory, setActiveCategory] = useState(null)
    const [sortBy, setSortBy]               = useState('default')

    // ── Unique restaurants derived from offers ───────────────────────────────
    const restaurants = useMemo(() => {
        if (!offers) return []
        const map = {}
        offers.forEach(o => {
            const id   = o.restaurantId || o.restaurant || o.restaurantName
            const name = o.restaurantName || o.restaurant || ''
            if (!id || !name) return
            if (!map[id]) {
                map[id] = {
                    id,
                    name,
                    city:       o.city     || '',
                    cuisine:    o.cuisine  || o.category || 'متنوع',
                    offerCount: 0,
                    maxDiscount: 0,
                }
            }
            map[id].offerCount++
            if ((o.discount || 0) > map[id].maxDiscount)
                map[id].maxDiscount = o.discount || 0
        })
        return Object.values(map)
    }, [offers])

    // ── Featured offers (top 6 by discount) ─────────────────────────────────
    const featured = useMemo(() =>
        [...(offers || [])].sort((a, b) => (b.discount || 0) - (a.discount || 0)).slice(0, 6),
    [offers])

    // ── Filtered restaurants ─────────────────────────────────────────────────
    const filteredRestaurants = useMemo(() => {
        const q = searchQuery.trim()
        let list = restaurants.filter(r => {
            if (!q) return true
            return r.name.includes(q) || r.city.includes(q) || r.cuisine.includes(q)
        })
        if (sortBy === 'discount') list = [...list].sort((a, b) => b.maxDiscount - a.maxDiscount)
        return list
    }, [restaurants, searchQuery, sortBy])

    // ── Filtered offers (when typing) ────────────────────────────────────────
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

            {/* ── STICKY HEADER ─────────────────────────────────────────────── */}
            <div style={{
                background: ORANGE,
                padding: '12px 14px 14px',
                position: 'sticky', top: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', gap: 10,
            }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <input
                        autoFocus
                        type="text"
                        dir="rtl"
                        placeholder="ابحث عن مطعم أو طبق ..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            background: '#fff', border: 'none',
                            borderRadius: 25, padding: '10px 42px 10px 16px',
                            fontSize: 14, color: '#333', outline: 'none',
                            fontFamily: 'inherit',
                        }}
                    />
                    <span style={{
                        position: 'absolute', right: 14, top: '50%',
                        transform: 'translateY(-50%)', fontSize: 16,
                        color: '#aaa', pointerEvents: 'none',
                    }}>🔍</span>
                </div>
                <button style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)',
                    fontSize: 18, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                }}>🔔</button>
            </div>

            {/* ══════════ SEARCH RESULTS MODE ══════════ */}
            {isSearching ? (
                <div style={{ padding: '14px 12px 0' }}>
                    <SectionTitle title={`نتائج البحث (${filteredOffers.length})`} />
                    {loadingOffers ? (
                        <LoadingSkeleton />
                    ) : filteredOffers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                            <p style={{ fontWeight: 700 }}>لا توجد نتائج لـ "{searchQuery}"</p>
                        </div>
                    ) : (
                        filteredOffers.map(offer => (
                            <OfferRow
                                key={offer.id}
                                offer={offer}
                                onClick={() => { setSelectedOffer(offer); setCurrentScreen('offerDetails') }}
                            />
                        ))
                    )}
                </div>
            ) : (

            /* ══════════ NORMAL MODE ══════════ */
            <>
                {/* ── HERO BANNER ──────────────────────────────────────────── */}
                <div style={{ padding: '14px 12px 0' }}>
                    <div style={{
                        borderRadius: 16, overflow: 'hidden',
                        background: 'linear-gradient(135deg, #1a0800 0%, #5c2200 40%, #c45000 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '18px 18px', minHeight: 108, position: 'relative',
                    }}>
                        <div style={{
                            position: 'absolute', inset: 0, pointerEvents: 'none',
                            background: 'radial-gradient(ellipse at 65% 50%, rgba(238,123,38,0.3) 0%, transparent 70%)',
                        }} />
                        <div style={{ zIndex: 1 }}>
                            <p style={{ color: '#fff',    fontSize: 24, fontWeight: 900, margin: 0, lineHeight: 1.25 }}>مشكوك</p>
                            <p style={{ color: '#f5c842', fontSize: 24, fontWeight: 900, margin: 0, lineHeight: 1.25 }}>خبارك. أول</p>
                        </div>
                        <div style={{ zIndex: 1, textAlign: 'center' }}>
                            <img
                                src="/logo.png"
                                alt="R2C"
                                style={{ height: 52, width: 'auto', objectFit: 'contain', display: 'block' }}
                                onError={e => { e.target.style.display = 'none' }}
                            />
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8, letterSpacing: 1, margin: '4px 0 0', textTransform: 'uppercase' }}>
                                Restaurant to Customer
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── CUSTOM CATEGORIES ────────────────────────────────────── */}
                <div style={{ padding: '18px 12px 0' }}>
                    <SectionTitle title="عروض مخصصة" />
                    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                        {CUSTOM_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                                style={{
                                    flexShrink: 0,
                                    background: activeCategory === cat.id ? ORANGE : '#fff',
                                    color:      activeCategory === cat.id ? '#fff'  : NAVY,
                                    border:     `1.5px solid ${activeCategory === cat.id ? ORANGE : '#e0e0e0'}`,
                                    borderRadius: 14, padding: '10px 14px',
                                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 7,
                                    whiteSpace: 'nowrap', fontFamily: 'inherit',
                                    transition: 'all 0.18s',
                                }}
                            >
                                <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── FEATURED OFFERS ──────────────────────────────────────── */}
                {featured.length > 0 && (
                    <div style={{ padding: '18px 12px 0' }}>
                        <SectionTitle title="عروض مميزة" />
                        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                            {featured.map(offer => (
                                <div
                                    key={offer.id}
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
                                            fontSize: 11, fontWeight: 800,
                                            padding: '3px 8px', borderRadius: 8,
                                        }}>
                                            خصم {offer.discount}%
                                        </div>
                                    </div>
                                    <div style={{ padding: '8px 10px' }}>
                                        <p style={{
                                            margin: 0, color: '#fff', fontSize: 13, fontWeight: 700,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {offer.restaurantName || offer.restaurant || 'عرض مميز'}
                                        </p>
                                        {offer.name && (
                                            <p style={{
                                                margin: '3px 0 0', color: 'rgba(255,255,255,0.6)',
                                                fontSize: 11, overflow: 'hidden',
                                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {offer.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── RESTAURANTS LIST ─────────────────────────────────────── */}
                <div style={{ padding: '18px 12px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>المطاعم</h2>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <SortBtn label="تصنيف"    icon="≡"  active={sortBy === 'default'}  onClick={() => setSortBy('default')} />
                            <SortBtn label="أعلى خصم" icon="🔥" active={sortBy === 'discount'} onClick={() => setSortBy('discount')} />
                        </div>
                    </div>

                    {loadingOffers ? (
                        <LoadingSkeleton />
                    ) : filteredRestaurants.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#999', padding: '24px 0' }}>لا توجد مطاعم</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {filteredRestaurants.map(r => (
                                <RestaurantCard
                                    key={r.id}
                                    restaurant={r}
                                    offers={offers}
                                    onClick={() => {
                                        setSelectedRestaurant({ id: r.id, name: r.name, city: r.city })
                                        setCurrentScreen('restaurantProfile')
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </>
            )}
        </div>
    )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ title }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1a1a2e', whiteSpace: 'nowrap' }}>{title}</h2>
            <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
        </div>
    )
}

function SortBtn({ label, icon, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: active ? ORANGE : '#fff',
                color:      active ? '#fff' : '#555',
                border: `1px solid ${active ? ORANGE : '#e0e0e0'}`,
                borderRadius: 20, padding: '6px 12px',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                fontFamily: 'inherit', transition: 'all 0.15s',
            }}
        >
            <span>{icon}</span><span>{label}</span>
        </button>
    )
}

function RestaurantCard({ restaurant: r, offers, onClick }) {
    const repOffer = (offers || []).find(o =>
        (o.restaurantId || o.restaurant || o.restaurantName) === r.id
    )
    return (
        <div
            onClick={onClick}
            style={{
                background: '#fff', borderRadius: 16,
                overflow: 'hidden', display: 'flex',
                alignItems: 'stretch', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            }}
        >
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
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#777' }}>
                        {r.cuisine}{r.city ? ` · ${r.city}` : ''}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: '#999' }}>{r.offerCount} عروض</span>
                    {r.maxDiscount > 0 && (
                        <span style={{
                            background: ORANGE, color: '#fff',
                            borderRadius: 8, padding: '3px 10px',
                            fontSize: 12, fontWeight: 700,
                        }}>
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
        <div
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
            }}
        >
            <div style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#eee' }}>
                <OfferImage offer={offer} size="small" />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{offer.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{restName}</div>
                {offer.city && <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>📍 {offer.city}</div>}
            </div>
            <div style={{
                background: ORANGE, color: '#fff', fontWeight: 700,
                padding: '4px 10px', borderRadius: 8, fontSize: 12, flexShrink: 0,
            }}>
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
