import { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../contexts'
import OfferImage from '../components/OfferImage'
import BackButton from '../components/BackButton'
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

const STATUS_INFO = {
    pending:   { text: 'في انتظار القبول',  icon: '⏳', color: '#f59e0b' },
    accepted:  { text: 'تم قبول طلبك ✅',   icon: '✅', color: '#10b981' },
    ready:     { text: 'طلبك جاهز! 🎉',     icon: '🎉', color: ORANGE    },
    completed: { text: 'اكتمل الطلب',       icon: '✔️', color: '#6b7280' },
    rejected:  { text: 'تم رفض الطلب',      icon: '❌', color: '#ef4444' },
    cancelled: { text: 'تم إلغاء الطلب',    icon: '🚫', color: '#6b7280' },
}

function timeAgo(order) {
    const ms = order.updatedAt?.toMillis?.() ?? order.createdAt?.toMillis?.() ?? 0
    if (!ms) return ''
    const diff = Math.floor((Date.now() - ms) / 60000)
    if (diff < 1)  return 'الآن'
    if (diff < 60) return 'منذ ' + diff + ' دقيقة'
    const h = Math.floor(diff / 60)
    if (h < 24) return 'منذ ' + h + ' ساعة'
    return 'منذ ' + Math.floor(h / 24) + ' يوم'
}

export default function SearchScreen() {
    const {
        offers,
        orders,
        loadingOffers,
        setCurrentScreen,
        setSelectedOffer,
        setSelectedRestaurant,
    } = useApp()

    const [searchQuery, setSearchQuery]       = useState('')
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

    // الإشعارات
    const [showNotifs, setShowNotifs] = useState(false)
    const [seenKeys, setSeenKeys]     = useState(() => {
        try { return new Set(JSON.parse(localStorage.getItem('r2c_seen') || '[]')) }
        catch { return new Set() }
    })
    const notifsRef = useRef(null)

    const notifOrders = useMemo(() => {
        if (!orders) return []
        return [...orders]
            .filter(o => o.status && STATUS_INFO[o.status])
            .sort((a, b) => {
                const t = o => o.updatedAt?.toMillis?.() ?? o.createdAt?.toMillis?.() ?? 0
                return t(b) - t(a)
            })
            .slice(0, 15)
    }, [orders])

    const unreadCount = notifOrders.filter(o => !seenKeys.has(o.id + '_' + o.status)).length

    const openNotifs = () => {
        setShowNotifs(true)
        const keys = notifOrders.map(o => o.id + '_' + o.status)
        const next = new Set([...seenKeys, ...keys])
        setSeenKeys(next)
        try { localStorage.setItem('r2c_seen', JSON.stringify([...next])) } catch {}
    }

    useEffect(() => {
        if (!showNotifs) return
        const handler = (e) => {
            if (notifsRef.current && !notifsRef.current.contains(e.target)) setShowNotifs(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showNotifs])

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

            {/* HEADER */}
            <div style={{
                background: ORANGE, padding: '12px 14px 14px',
                position: 'sticky', top: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', gap: 10,
            }}>
                <BackButton onClick={() => setCurrentScreen('feed')} variant="light" />
                <div style={{ flex: 1, position: 'relative' }}>
                    <input
                        type="text" dir="rtl"
                        placeholder="ابحث عن مطعم أو طبق ..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            background: '#fff', border: 'none', borderRadius: 25,
                            padding: '10px 42px 10px 16px',
                            fontSize: 14, color: '#333', outline: 'none', fontFamily: 'inherit',
                        }}
                    />
                    <span style={{
                        position: 'absolute', right: 14, top: '50%',
                        transform: 'translateY(-50%)', fontSize: 16,
                        color: '#aaa', pointerEvents: 'none',
                    }}>🔍</span>
                </div>

                {/* زر الجرس */}
                <div style={{ position: 'relative', flexShrink: 0 }} ref={notifsRef}>
                    <button
                        onClick={showNotifs ? () => setShowNotifs(false) : openNotifs}
                        style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: showNotifs ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
                            border: '2px solid rgba(255,255,255,0.4)',
                            fontSize: 18, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative',
                        }}
                    >
                        🔔
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: -4, left: -4,
                                background: '#ef4444', color: '#fff',
                                fontSize: 10, fontWeight: 800,
                                width: 18, height: 18, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid ' + ORANGE,
                            }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* لوحة الإشعارات */}
                    {showNotifs && (
                        <div style={{
                            position: 'absolute', top: 48, left: 0,
                            width: 300, maxHeight: 420,
                            background: '#fff', borderRadius: 16,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                            overflowY: 'auto', zIndex: 200,
                            border: '1px solid #f0f0f0',
                        }}>
                            <div style={{
                                padding: '14px 16px', borderBottom: '1px solid #f3f4f6',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                position: 'sticky', top: 0, background: '#fff', zIndex: 1,
                            }}>
                                <span style={{ fontWeight: 800, fontSize: 15, color: NAVY }}>الإشعارات</span>
                                <button onClick={() => setShowNotifs(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
                            </div>

                            {notifOrders.length === 0 ? (
                                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                                    <div style={{ fontSize: 40, marginBottom: 10 }}>🔔</div>
                                    <p style={{ fontWeight: 600, margin: 0 }}>لا توجد إشعارات</p>
                                </div>
                            ) : (
                                notifOrders.map(order => {
                                    const info = STATUS_INFO[order.status] || { text: order.status, icon: '📋', color: '#6b7280' }
                                    return (
                                        <div
                                            key={order.id + '_' + order.status}
                                            onClick={() => { setShowNotifs(false); setCurrentScreen('orders') }}
                                            style={{
                                                padding: '12px 16px', borderBottom: '1px solid #f9fafb',
                                                display: 'flex', alignItems: 'flex-start', gap: 12,
                                                cursor: 'pointer',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{
                                                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                                                background: info.color + '18',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 18,
                                            }}>
                                                {info.icon}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: info.color }}>
                                                    {info.text}
                                                </p>
                                                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>
                                                    {order.offerName || order.offer?.name || 'طلب'}
                                                    {order.restaurantName ? ' · ' + order.restaurantName : ''}
                                                </p>
                                                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#c0c0c0' }}>
                                                    {timeAgo(order)}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>

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
