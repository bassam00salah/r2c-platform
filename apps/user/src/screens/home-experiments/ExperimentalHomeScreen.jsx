import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot } from 'firebase/firestore'
import { db } from '@r2c/shared/firebase/config'
import { useApp } from '../../contexts'
import OfferImage from '../../components/OfferImage'

const CATEGORIES = [
  { id: 'all', label: 'الكل', emoji: '🍽️', keywords: [] },
  { id: 'featured', label: 'مميزة', emoji: '✨', keywords: [] },
  { id: 'برجر', label: 'برجر', emoji: '🍔', keywords: ['برجر', 'burger'] },
  { id: 'بيتزا', label: 'بيتزا', emoji: '🍕', keywords: ['بيتزا', 'pizza'] },
  { id: 'شاورما', label: 'شاورما', emoji: '🌯', keywords: ['شاورما', 'shawarma'] },
  { id: 'دجاج', label: 'دجاج', emoji: '🍗', keywords: ['دجاج', 'فراخ', 'chicken'] },
  { id: 'مشاوي', label: 'مشويات', emoji: '🔥', keywords: ['مشاوي', 'مشويات', 'grill'] },
  { id: 'حلويات', label: 'حلويات', emoji: '🍰', keywords: ['حلويات', 'كيك', 'حلو', 'dessert'] },
]

const DEFAULT_SETTINGS = {
  bannerText: '',
  bannerImageUrl: '',
  banner2ImageUrl: '',
  banner3ImageUrl: '',
  bannerRestaurantId: '',
  bannerRestaurantName: '',
  banners: [],
}

function Icon({ name, size = 22 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.3" /></>,
    arrow: <><path d="m9 18 6-6-6-6" /></>,
    chevron: <><path d="m9 18 6-6-6-6" /></>,
    sliders: <><path d="M4 6h16" /><path d="M7 12h10" /><path d="M10 18h4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    star: <><path d="m12 2.5 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.1l6.2-.9Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    repeat: <><path d="m17 1 4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="m7 23-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>,
    percent: <><path d="m19 5-14 14" /><circle cx="7" cy="7" r="2" /><circle cx="17" cy="17" r="2" /></>,
    shop: <><path d="M3 9h18l-1-5H4L3 9Z" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" /></>,
    sort: <><path d="M8 6h12M8 12h8M8 18h4" /><path d="M4 4v16m0 0-2-2m2 2 2-2" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7" /></>,
  }

  return <svg {...common}>{paths[name] || paths.search}</svg>
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function resolveCurrentPrice(offer) {
  return toNumber(offer?.finalPrice ?? offer?.price ?? offer?.discountedPrice)
}

function resolveOldPrice(offer, currentPrice) {
  const explicit = toNumber(offer?.originalPrice ?? offer?.oldPrice ?? offer?.priceBeforeDiscount)
  if (explicit != null) return explicit
  const discount = toNumber(offer?.discount ?? offer?.discountPercent)
  if (discount && currentPrice != null && discount < 100) {
    return Math.round((currentPrice / (1 - discount / 100)) * 100) / 100
  }
  return null
}

function resolveDiscount(offer) {
  const current = resolveCurrentPrice(offer)
  const old = resolveOldPrice(offer, current)
  const explicit = toNumber(offer?.discount ?? offer?.discountPercent)
  if (explicit != null && explicit > 0) return Math.round(explicit)
  if (current != null && old != null && old > current) return Math.round(((old - current) / old) * 100)
  return 0
}

function resolveRestaurantLogo(restaurant, offer) {
  return restaurant?.logoUrl || restaurant?.logo || restaurant?.imageUrl || restaurant?.photoUrl ||
    offer?.restaurantLogo || offer?.restaurantLogoUrl || offer?.restaurantImage || offer?.logoUrl || ''
}

function resolveRestaurantImage(restaurant) {
  return restaurant?.coverImageUrl || restaurant?.coverUrl || restaurant?.imageUrl || restaurant?.photoUrl || restaurant?.logoUrl || restaurant?.logo || ''
}

function getRestaurantName(offer) {
  if (typeof offer?.restaurant === 'string') return offer.restaurant
  return offer?.restaurantName || offer?.restaurant?.name || offer?.vendorName || 'مطعم مشارك'
}

function getOfferText(offer) {
  return `${offer?.name || ''} ${offer?.description || ''} ${offer?.category || ''} ${offer?.cuisine || ''} ${getRestaurantName(offer)}`.toLowerCase()
}

function getRestaurantKey(offer) {
  return String(offer?.restaurantId || offer?.restaurant?.id || getRestaurantName(offer) || '').trim()
}

function formatPrice(value) {
  if (value == null) return null
  return Number.isInteger(value) ? String(value) : Number(value).toFixed(2)
}

function getCurrency(offer) {
  return offer?.currencySymbol || offer?.currency || 'ر.س'
}

function getDeliveryTime(offer, restaurant) {
  return offer?.deliveryTime || offer?.estimatedDeliveryTime || restaurant?.deliveryTime || restaurant?.estimatedDeliveryTime || ''
}

function getRating(offer, restaurant) {
  return toNumber(offer?.restaurantRating ?? offer?.rating ?? restaurant?.rating)
}

function getShortDescription(offer) {
  const text = String(offer?.shortDescription || offer?.description || '').trim()
  if (!text) return 'عرض حصري متاح لفترة محدودة.'
  return text.length > 76 ? `${text.slice(0, 76).trim()}…` : text
}

function BannerImage({ src, alt = '' }) {
  if (!src) return null
  return <img src={src} alt={alt} onError={event => { event.currentTarget.style.display = 'none' }} />
}

function LogoImage({ src, name }) {
  if (!src) return null
  return (
    <img
      src={src}
      alt={name || 'مطعم'}
      onError={event => {
        event.currentTarget.style.display = 'none'
        if (event.currentTarget.nextSibling) event.currentTarget.nextSibling.style.display = 'grid'
      }}
    />
  )
}

function useExperimentalHomeData() {
  const app = useApp()
  const { offers, orders, loadingOffers } = app
  const [restaurantsRaw, setRestaurantsRaw] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [dataError, setDataError] = useState(false)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'restaurants'),
      snapshot => {
        setRestaurantsRaw(snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
        setDataError(false)
      },
      error => {
        console.error('[HomeExperiments] restaurants subscription failed:', error)
        setDataError(true)
      }
    )
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'system', 'settings'),
      snapshot => {
        if (snapshot.exists()) setSettings({ ...DEFAULT_SETTINGS, ...snapshot.data() })
      },
      error => console.error('[HomeExperiments] settings subscription failed:', error)
    )
    return () => unsubscribe()
  }, [])

  const offerStats = useMemo(() => {
    const map = new Map()
    ;(offers || []).forEach(offer => {
      const keys = [offer?.restaurantId, offer?.restaurant?.id, getRestaurantName(offer)]
        .filter(Boolean)
        .map(value => String(value).trim().toLowerCase())
      keys.forEach(key => {
        const previous = map.get(key) || { offerCount: 0, maxDiscount: 0 }
        map.set(key, {
          offerCount: previous.offerCount + 1,
          maxDiscount: Math.max(previous.maxDiscount, resolveDiscount(offer)),
        })
      })
    })
    return map
  }, [offers])

  const restaurants = useMemo(() => {
    const source = restaurantsRaw.length ? restaurantsRaw : (() => {
      const map = new Map()
      ;(offers || []).forEach(offer => {
        const id = getRestaurantKey(offer)
        if (!id || map.has(id)) return
        map.set(id, {
          id,
          name: getRestaurantName(offer),
          city: offer?.city || '',
          category: offer?.category || offer?.cuisine || '',
          imageUrl: offer?.restaurantImage || offer?.imageUrl || '',
          logoUrl: offer?.restaurantLogo || offer?.logoUrl || '',
        })
      })
      return [...map.values()]
    })()

    return source.map(restaurant => {
      const idKey = String(restaurant.id || '').trim().toLowerCase()
      const nameKey = String(restaurant.name || '').trim().toLowerCase()
      const stat = offerStats.get(idKey) || offerStats.get(nameKey) || { offerCount: 0, maxDiscount: 0 }
      return {
        ...restaurant,
        ...stat,
        logoUrl: resolveRestaurantLogo(restaurant),
        imageUrl: resolveRestaurantImage(restaurant),
      }
    }).sort((a, b) => (b.offerCount - a.offerCount) || (b.maxDiscount - a.maxDiscount))
  }, [restaurantsRaw, offers, offerStats])

  const restaurantByKey = useMemo(() => {
    const map = new Map()
    restaurants.forEach(restaurant => {
      if (restaurant.id) map.set(String(restaurant.id).trim().toLowerCase(), restaurant)
      if (restaurant.name) map.set(String(restaurant.name).trim().toLowerCase(), restaurant)
    })
    return map
  }, [restaurants])

  const enrichedOffers = useMemo(() => {
    return (offers || []).map(offer => {
      const idKey = String(offer?.restaurantId || offer?.restaurant?.id || '').trim().toLowerCase()
      const nameKey = String(getRestaurantName(offer)).trim().toLowerCase()
      const restaurant = restaurantByKey.get(idKey) || restaurantByKey.get(nameKey) || null
      return {
        ...offer,
        restaurantName: restaurant?.name || getRestaurantName(offer),
        __restaurant: restaurant,
        __discount: resolveDiscount(offer),
      }
    })
  }, [offers, restaurantByKey])

  const featuredOffers = useMemo(() => {
    const manual = enrichedOffers.filter(offer => offer?.isFeatured === true)
    const source = manual.length ? manual : enrichedOffers
    return [...source]
      .sort((a, b) => (b.__discount - a.__discount))
      .slice(0, 12)
  }, [enrichedOffers])

  const bannerSlides = useMemo(() => {
    const slides = []
    if (settings.bannerImageUrl) {
      slides.push({
        imageUrl: settings.bannerImageUrl,
        text: settings.bannerText,
        restaurantId: settings.bannerRestaurantId,
        restaurantName: settings.bannerRestaurantName,
      })
    }
    if (Array.isArray(settings.banners)) {
      settings.banners.forEach(slide => {
        if (slide?.imageUrl) slides.push(slide)
      })
    }
    if (!slides.length && settings.banner2ImageUrl) slides.push({ imageUrl: settings.banner2ImageUrl })
    return slides
  }, [settings])

  let cityName = 'موقعك الحالي'
  try { cityName = localStorage.getItem('r2c_city') || cityName } catch { /* التخزين المحلي اختياري */ }

  return {
    ...app,
    offers: enrichedOffers,
    featuredOffers,
    restaurants,
    bannerSlides,
    settings,
    loadingOffers,
    dataError,
    cityName,
    activeOrderCount: (orders || []).filter(order => ['pending', 'accepted', 'ready'].includes(order.status)).length,
  }
}

function HomeHeader({ cityName, activeOrderCount, onLocation, onOrders, onProfile, tone = 'light' }) {
  return (
    <header className={`r2c-exp-header r2c-exp-header--${tone}`}>
      <button type="button" className="r2c-exp-avatar" onClick={onProfile} aria-label="الحساب الشخصي">
        <Icon name="profile" size={20} />
      </button>
      <button type="button" className="r2c-exp-location" onClick={onLocation}>
        <span className="r2c-exp-location-label">التوصيل إلى</span>
        <strong><Icon name="pin" size={16} /> {cityName}</strong>
      </button>
      <button type="button" className="r2c-exp-icon-button" onClick={onOrders} aria-label="الطلبات والإشعارات">
        <Icon name="bell" size={21} />
        {activeOrderCount > 0 && <span className="r2c-exp-notification-badge">{activeOrderCount > 9 ? '9+' : activeOrderCount}</span>}
      </button>
    </header>
  )
}

function SearchField({ value, onChange, onSubmit, placeholder = 'ابحث عن عرض أو مطعم' }) {
  return (
    <form className="r2c-exp-search" onSubmit={event => { event.preventDefault(); onSubmit() }}>
      <button type="submit" aria-label="بحث"><Icon name="search" size={20} /></button>
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {value ? <button type="button" className="r2c-exp-search-clear" onClick={() => onChange('')} aria-label="مسح البحث">×</button> : null}
    </form>
  )
}

function SectionHeading({ eyebrow, title, actionLabel = 'عرض الكل', onAction, inverse = false }) {
  return (
    <div className={`r2c-exp-section-heading${inverse ? ' is-inverse' : ''}`}>
      <div>
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h2>{title}</h2>
      </div>
      {onAction ? <button type="button" onClick={onAction}>{actionLabel}<Icon name="chevron" size={16} /></button> : null}
    </div>
  )
}

function CategoryRail({ activeCategory, onSelect, compact = false }) {
  return (
    <div className={`r2c-exp-categories${compact ? ' is-compact' : ''}`}>
      {CATEGORIES.map(category => (
        <button
          type="button"
          key={category.id}
          className={activeCategory === category.id ? 'is-active' : ''}
          onClick={() => onSelect(category.id)}
        >
          <span>{category.emoji}</span>
          <strong>{category.label}</strong>
        </button>
      ))}
    </div>
  )
}

function PriceBlock({ offer, align = 'start' }) {
  const currentPrice = resolveCurrentPrice(offer)
  const oldPrice = resolveOldPrice(offer, currentPrice)
  if (currentPrice == null) return <span className="r2c-price-unavailable">السعر داخل العرض</span>
  return (
    <div className={`r2c-exp-price r2c-exp-price--${align}`}>
      <strong>{formatPrice(currentPrice)} <small>{getCurrency(offer)}</small></strong>
      {oldPrice != null && oldPrice > currentPrice ? <del>{formatPrice(oldPrice)}</del> : null}
    </div>
  )
}

function MetaRow({ offer }) {
  const restaurant = offer.__restaurant
  const rating = getRating(offer, restaurant)
  const time = getDeliveryTime(offer, restaurant)
  return (
    <div className="r2c-exp-meta-row">
      {rating != null ? <span><Icon name="star" size={14} /> {rating.toFixed(1)}</span> : null}
      {time ? <span><Icon name="clock" size={14} /> {time}</span> : null}
      {!rating && !time ? <span><Icon name="shop" size={14} /> متاح الآن</span> : null}
    </div>
  )
}

function DirectOfferCard({ offer, onOpen }) {
  const discount = offer.__discount
  const logo = resolveRestaurantLogo(offer.__restaurant, offer)
  return (
    <article className="r2c-direct-offer-card" onClick={() => onOpen(offer)}>
      <div className="r2c-direct-offer-media">
        <OfferImage offer={offer} size="medium" />
        {discount > 0 ? <span className="r2c-direct-discount">خصم {discount}%</span> : null}
        <button type="button" className="r2c-direct-add" onClick={event => { event.stopPropagation(); onOpen(offer) }} aria-label="فتح العرض"><Icon name="plus" size={18} /></button>
      </div>
      <div className="r2c-direct-offer-body">
        <div className="r2c-direct-restaurant-line">
          <span className="r2c-mini-logo"><LogoImage src={logo} name={offer.restaurantName} /><span className="r2c-restaurant-logo-fallback">{String(offer.restaurantName || 'R').slice(0, 1)}</span></span>
          <span>{offer.restaurantName}</span>
        </div>
        <h3>{offer.name || 'عرض مميز'}</h3>
        <MetaRow offer={offer} />
        <PriceBlock offer={offer} />
      </div>
    </article>
  )
}

function RestaurantTile({ restaurant, onOpen, variant = 'direct' }) {
  return (
    <article className={`r2c-restaurant-tile r2c-restaurant-tile--${variant}`} onClick={() => onOpen(restaurant)}>
      <div className="r2c-restaurant-cover">
        <BannerImage src={restaurant.imageUrl} alt={restaurant.name} />
        {restaurant.maxDiscount > 0 ? <span>حتى {restaurant.maxDiscount}%</span> : null}
      </div>
      <div className="r2c-restaurant-tile-body">
        <div className="r2c-restaurant-logo">
          <LogoImage src={restaurant.logoUrl} name={restaurant.name} />
          <span className="r2c-restaurant-logo-fallback">{String(restaurant.name || 'R').slice(0, 1)}</span>
        </div>
        <div>
          <h3>{restaurant.name || 'مطعم مشارك'}</h3>
          <p>{restaurant.category || restaurant.cuisine || `${restaurant.offerCount || 0} عروض متاحة`}</p>
        </div>
      </div>
    </article>
  )
}

function DirectHome({ model }) {
  const hero = model.bannerSlides[0]
  const quickActions = [
    { icon: 'percent', label: 'أكبر خصم', action: () => model.onSort('discount') },
    { icon: 'repeat', label: 'اطلبها تاني', action: model.onOrders },
    { icon: 'clock', label: 'الأسرع', action: () => model.onSort('fast') },
    { icon: 'shop', label: 'قريب منك', action: model.onRestaurants },
  ]

  return (
    <main className="r2c-exp-home r2c-direct-home">
      <HomeHeader {...model.headerProps} tone="light" />
      <div className="r2c-direct-search-wrap"><SearchField {...model.searchProps} placeholder="نفسك في إيه النهارده؟" /></div>

      <div className="r2c-direct-quick-actions">
        {quickActions.map(item => (
          <button type="button" key={item.label} onClick={item.action}>
            <span><Icon name={item.icon} size={20} /></span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </div>

      <button type="button" className="r2c-direct-hero" onClick={() => model.onBanner(hero)}>
        <div className="r2c-direct-hero-copy">
          <span>حصري على R2C</span>
          <h1>{hero?.text || model.settings.bannerText || 'خصومات أقوى، واختيار أسرع'}</h1>
          <p>اكتشف أفضل العروض المتاحة حولك الآن</p>
          <strong>شوف العروض <Icon name="arrow" size={17} /></strong>
        </div>
        <div className="r2c-direct-hero-art"><BannerImage src={hero?.imageUrl} alt="عرض اليوم" /></div>
      </button>

      <section className="r2c-exp-section">
        <SectionHeading title="اختار على مزاجك" onAction={model.onExploreAll} />
        <CategoryRail activeCategory={model.activeCategory} onSelect={model.onCategory} compact />
      </section>

      <section className="r2c-exp-section">
        <SectionHeading eyebrow="الأكثر توفيرًا" title={model.resultTitle} onAction={model.onExploreAll} />
        <div className="r2c-direct-offer-rail">
          {model.visibleOffers.slice(0, 8).map(offer => <DirectOfferCard key={offer.id} offer={offer} onOpen={model.onOffer} />)}
        </div>
      </section>

      <section className="r2c-exp-section r2c-exp-section--last">
        <SectionHeading eyebrow="كل الاختيارات في مكان واحد" title="مطاعم عليها عروض الآن" onAction={model.onRestaurants} />
        <div className="r2c-restaurant-rail">
          {model.visibleRestaurants.slice(0, 7).map(restaurant => <RestaurantTile key={restaurant.id} restaurant={restaurant} onOpen={model.onRestaurant} />)}
        </div>
      </section>
    </main>
  )
}

function DiscoverStory({ category, active, onClick }) {
  return (
    <button type="button" className={active ? 'is-active' : ''} onClick={onClick}>
      <span className="r2c-discover-story-ring"><i>{category.emoji}</i></span>
      <strong>{category.label}</strong>
    </button>
  )
}

function DiscoverFeatureCard({ offer, index, onOpen }) {
  const logo = resolveRestaurantLogo(offer.__restaurant, offer)
  return (
    <article className={`r2c-discover-feature-card r2c-discover-feature-card--${index % 3}`} onClick={() => onOpen(offer)}>
      <div className="r2c-discover-feature-media"><OfferImage offer={offer} size="large" /></div>
      <div className="r2c-discover-feature-overlay" />
      <div className="r2c-discover-feature-content">
        <div className="r2c-discover-feature-top">
          <span className="r2c-discover-feature-label">اختيار R2C</span>
          {offer.__discount > 0 ? <span className="r2c-discover-feature-discount">-{offer.__discount}%</span> : null}
        </div>
        <div className="r2c-discover-feature-copy">
          <div className="r2c-direct-restaurant-line is-light">
            <span className="r2c-mini-logo"><LogoImage src={logo} name={offer.restaurantName} /><span className="r2c-restaurant-logo-fallback">{String(offer.restaurantName || 'R').slice(0, 1)}</span></span>
            <span>{offer.restaurantName}</span>
          </div>
          <h3>{offer.name || 'عرض يستحق التجربة'}</h3>
          <p>{getShortDescription(offer)}</p>
          <div className="r2c-discover-feature-bottom">
            <PriceBlock offer={offer} />
            <button type="button" onClick={event => { event.stopPropagation(); onOpen(offer) }}>اكتشف العرض</button>
          </div>
        </div>
      </div>
    </article>
  )
}

function DiscoverCompactOffer({ offer, onOpen }) {
  return (
    <article className="r2c-discover-compact-offer" onClick={() => onOpen(offer)}>
      <div className="r2c-discover-compact-media"><OfferImage offer={offer} size="small" /></div>
      <div>
        <span>{offer.restaurantName}</span>
        <h3>{offer.name || 'عرض مميز'}</h3>
        <PriceBlock offer={offer} />
      </div>
    </article>
  )
}

function DiscoverHome({ model }) {
  const hero = model.bannerSlides[0]
  return (
    <main className="r2c-exp-home r2c-discover-home">
      <div className="r2c-discover-top">
        <HomeHeader {...model.headerProps} tone="dark" />
        <div className="r2c-discover-intro">
          <span>اكتشف حولك</span>
          <h1>كل يوم طعم جديد<br />بسعر أحلى</h1>
        </div>
        <div className="r2c-discover-search-wrap"><SearchField {...model.searchProps} placeholder="مطعم، طبق أو عرض…" /></div>
      </div>

      <section className="r2c-discover-stories" aria-label="تصنيفات العروض">
        {CATEGORIES.slice(0, 7).map(category => (
          <DiscoverStory key={category.id} category={category} active={model.activeCategory === category.id} onClick={() => model.onCategory(category.id)} />
        ))}
      </section>

      {hero?.imageUrl ? (
        <section className="r2c-exp-section">
          <button type="button" className="r2c-discover-editorial-banner" onClick={() => model.onBanner(hero)}>
            <BannerImage src={hero.imageUrl} alt={hero.text || 'عرض خاص'} />
            <span className="r2c-discover-editorial-shade" />
            <span className="r2c-discover-editorial-copy">
              <small>قصة اليوم</small>
              <strong>{hero.text || 'عرض مختلف يستحق التجربة'}</strong>
              <i>اكتشف الآن <Icon name="arrow" size={16} /></i>
            </span>
          </button>
        </section>
      ) : null}

      <section className="r2c-exp-section">
        <SectionHeading eyebrow="منتقاة لك" title={model.resultTitle} onAction={model.onExploreAll} />
        <div className="r2c-discover-feature-grid">
          {model.visibleOffers.slice(0, 3).map((offer, index) => <DiscoverFeatureCard key={offer.id} offer={offer} index={index} onOpen={model.onOffer} />)}
        </div>
      </section>

      <section className="r2c-discover-dark-section">
        <SectionHeading eyebrow="شائع هذا الأسبوع" title="ناس كتير بتختاره" onAction={model.onExploreAll} inverse />
        <div className="r2c-discover-compact-rail">
          {model.visibleOffers.slice(3, 9).map(offer => <DiscoverCompactOffer key={offer.id} offer={offer} onOpen={model.onOffer} />)}
        </div>
      </section>

      <section className="r2c-exp-section r2c-exp-section--last">
        <SectionHeading eyebrow="أماكن تستحق الزيارة" title="مطاعم جديدة عليك" onAction={model.onRestaurants} />
        <div className="r2c-discover-restaurant-grid">
          {model.visibleRestaurants.slice(0, 4).map(restaurant => <RestaurantTile key={restaurant.id} restaurant={restaurant} onOpen={model.onRestaurant} variant="discover" />)}
        </div>
      </section>
    </main>
  )
}

function SmartSortBar({ sortBy, onSort }) {
  const items = [
    { id: 'recommended', label: 'الأنسب' },
    { id: 'discount', label: 'أكبر خصم' },
    { id: 'price', label: 'أقل سعر' },
    { id: 'fast', label: 'الأسرع' },
  ]
  return (
    <div className="r2c-smart-sort-bar">
      <span><Icon name="sort" size={18} /> ترتيب:</span>
      {items.map(item => <button type="button" key={item.id} className={sortBy === item.id ? 'is-active' : ''} onClick={() => onSort(item.id)}>{item.label}</button>)}
    </div>
  )
}

function SmartOfferRow({ offer, onOpen }) {
  const current = resolveCurrentPrice(offer)
  const old = resolveOldPrice(offer, current)
  const discount = offer.__discount
  const logo = resolveRestaurantLogo(offer.__restaurant, offer)
  return (
    <article className="r2c-smart-offer-row" onClick={() => onOpen(offer)}>
      <div className="r2c-smart-offer-image">
        <OfferImage offer={offer} size="small" />
        {discount > 0 ? <span>-{discount}%</span> : null}
      </div>
      <div className="r2c-smart-offer-main">
        <div className="r2c-smart-restaurant-name">
          <span className="r2c-mini-logo"><LogoImage src={logo} name={offer.restaurantName} /><span className="r2c-restaurant-logo-fallback">{String(offer.restaurantName || 'R').slice(0, 1)}</span></span>
          <span>{offer.restaurantName}</span>
        </div>
        <h3>{offer.name || 'عرض مميز'}</h3>
        <p>{getShortDescription(offer)}</p>
        <MetaRow offer={offer} />
      </div>
      <div className="r2c-smart-offer-price">
        {current != null ? <strong>{formatPrice(current)} <small>{getCurrency(offer)}</small></strong> : <strong>التفاصيل</strong>}
        {current != null && old != null && old > current ? <del>{formatPrice(old)}</del> : null}
        <button type="button" onClick={event => { event.stopPropagation(); onOpen(offer) }} aria-label="فتح العرض"><Icon name="chevron" size={18} /></button>
      </div>
    </article>
  )
}

function SmartRestaurantRow({ restaurant, onOpen }) {
  return (
    <article className="r2c-smart-restaurant-row" onClick={() => onOpen(restaurant)}>
      <div className="r2c-restaurant-logo is-large">
        <LogoImage src={restaurant.logoUrl} name={restaurant.name} />
        <span className="r2c-restaurant-logo-fallback">{String(restaurant.name || 'R').slice(0, 1)}</span>
      </div>
      <div>
        <h3>{restaurant.name}</h3>
        <p>{restaurant.category || restaurant.cuisine || 'مطعم مشارك'}</p>
      </div>
      <div className="r2c-smart-restaurant-stats">
        <strong>{restaurant.offerCount || 0}</strong>
        <span>عروض</span>
      </div>
      {restaurant.maxDiscount > 0 ? <span className="r2c-smart-max-discount">حتى {restaurant.maxDiscount}%</span> : null}
      <Icon name="chevron" size={18} />
    </article>
  )
}

function SmartHome({ model }) {
  return (
    <main className="r2c-exp-home r2c-smart-home">
      <div className="r2c-smart-sticky-head">
        <HomeHeader {...model.headerProps} tone="light" />
        <div className="r2c-smart-search-line">
          <SearchField {...model.searchProps} placeholder="ابحث وقارن العروض" />
          <button type="button" className="r2c-smart-filter-button" onClick={model.onExploreAll} aria-label="الفلاتر"><Icon name="sliders" size={21} /></button>
        </div>
      </div>

      <section className="r2c-smart-summary">
        <div><span><Icon name="percent" size={20} /></span><strong>{model.maxDiscount}%</strong><small>أعلى خصم</small></div>
        <div><span><Icon name="shop" size={20} /></span><strong>{model.visibleRestaurants.length}</strong><small>مطعم متاح</small></div>
        <div><span><Icon name="grid" size={20} /></span><strong>{model.visibleOffers.length}</strong><small>عرض للمقارنة</small></div>
      </section>

      <section className="r2c-exp-section r2c-smart-category-section">
        <CategoryRail activeCategory={model.activeCategory} onSelect={model.onCategory} compact />
      </section>

      <section className="r2c-smart-results-head">
        <div>
          <span>{model.visibleOffers.length} نتيجة</span>
          <h1>{model.resultTitle}</h1>
        </div>
        <button type="button" onClick={model.onExploreAll}><Icon name="list" size={18} /> كل النتائج</button>
      </section>

      <SmartSortBar sortBy={model.sortBy} onSort={model.onSort} />

      <section className="r2c-smart-offer-list">
        {model.visibleOffers.slice(0, 10).map(offer => <SmartOfferRow key={offer.id} offer={offer} onOpen={model.onOffer} />)}
      </section>

      <section className="r2c-exp-section r2c-exp-section--last r2c-smart-restaurants">
        <SectionHeading eyebrow="قارن حسب المطعم" title="المطاعم المشاركة" onAction={model.onRestaurants} />
        <div className="r2c-smart-restaurant-list">
          {model.visibleRestaurants.slice(0, 6).map(restaurant => <SmartRestaurantRow key={restaurant.id} restaurant={restaurant} onOpen={model.onRestaurant} />)}
        </div>
      </section>
    </main>
  )
}

function EmptyExperimentalHome({ query, onClear }) {
  return (
    <div className="r2c-exp-empty">
      <span>🔎</span>
      <h2>لا توجد نتائج مطابقة</h2>
      <p>{query ? `لم نجد عروضًا تطابق «${query}»` : 'لا توجد عروض متاحة في هذا التصنيف الآن.'}</p>
      <button type="button" onClick={onClear}>عرض كل العروض</button>
    </div>
  )
}

export default function ExperimentalHomeScreen({ variant }) {
  const data = useExperimentalHomeData()
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('recommended')

  const openOffer = useCallback(offer => {
    data.setSelectedOffer(offer)
    data.setCurrentScreen('offerDetails')
  }, [data])

  const openRestaurant = useCallback(restaurant => {
    data.setSelectedRestaurant({ id: restaurant.id, name: restaurant.name, city: restaurant.city || '' })
    data.setCurrentScreen('restaurantProfile')
  }, [data])

  const openBanner = useCallback(slide => {
    if (!slide?.restaurantId) {
      data.setGlobalHeaderSearchQuery('')
      data.setCurrentScreen('explore')
      return
    }
    data.setSelectedRestaurant({ id: slide.restaurantId, name: slide.restaurantName || '', city: '' })
    data.setCurrentScreen('restaurantProfile')
  }, [data])

  const openExplore = useCallback((category = activeCategory) => {
    try {
      localStorage.setItem('r2c_explore_category', category || 'all')
      if (category === 'featured') localStorage.setItem('r2c_explore_featured_offers', JSON.stringify(data.featuredOffers))
      else localStorage.removeItem('r2c_explore_featured_offers')
    } catch { /* التخزين المحلي اختياري */ }
    data.setGlobalHeaderSearchQuery(query)
    data.setCurrentScreen('explore')
  }, [activeCategory, data, query])

  const openSearch = useCallback(() => {
    data.setGlobalHeaderSearchQuery(query)
    data.setCurrentScreen('search')
  }, [data, query])

  const filteredOffers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const category = CATEGORIES.find(item => item.id === activeCategory)
    let list = activeCategory === 'featured' ? data.featuredOffers : data.offers

    if (activeCategory !== 'all' && activeCategory !== 'featured') {
      list = list.filter(offer => category?.keywords.some(keyword => getOfferText(offer).includes(keyword)))
    }
    if (normalizedQuery) list = list.filter(offer => getOfferText(offer).includes(normalizedQuery))

    const next = [...list]
    if (sortBy === 'discount') next.sort((a, b) => b.__discount - a.__discount)
    if (sortBy === 'price') next.sort((a, b) => (resolveCurrentPrice(a) ?? Number.MAX_SAFE_INTEGER) - (resolveCurrentPrice(b) ?? Number.MAX_SAFE_INTEGER))
    if (sortBy === 'fast') next.sort((a, b) => {
      const aTime = Number.parseInt(String(getDeliveryTime(a, a.__restaurant)).match(/\d+/)?.[0] || '999', 10)
      const bTime = Number.parseInt(String(getDeliveryTime(b, b.__restaurant)).match(/\d+/)?.[0] || '999', 10)
      return aTime - bTime
    })
    if (sortBy === 'recommended') next.sort((a, b) => Number(b.isFeatured === true) - Number(a.isFeatured === true) || b.__discount - a.__discount)
    return next
  }, [activeCategory, data.featuredOffers, data.offers, query, sortBy])

  const visibleRestaurants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const allowedKeys = new Set(filteredOffers.flatMap(offer => [
      String(offer?.restaurantId || '').trim().toLowerCase(),
      String(offer?.restaurantName || '').trim().toLowerCase(),
    ]).filter(Boolean))

    return data.restaurants.filter(restaurant => {
      const keys = [String(restaurant.id || '').toLowerCase(), String(restaurant.name || '').toLowerCase()]
      const searchText = `${restaurant.name || ''} ${restaurant.category || ''} ${restaurant.cuisine || ''} ${restaurant.city || ''}`.toLowerCase()
      const searchMatch = !normalizedQuery || searchText.includes(normalizedQuery) || keys.some(key => allowedKeys.has(key))
      const categoryMatch = activeCategory === 'all' || keys.some(key => allowedKeys.has(key))
      return searchMatch && categoryMatch
    })
  }, [activeCategory, data.restaurants, filteredOffers, query])

  const currentCategory = CATEGORIES.find(item => item.id === activeCategory)
  const resultTitle = query.trim()
    ? `نتائج البحث عن «${query.trim()}»`
    : activeCategory === 'all'
      ? 'عروض مناسبة ليك الآن'
      : activeCategory === 'featured'
        ? 'العروض المميزة'
        : `أفضل عروض ${currentCategory?.label || ''}`

  const model = {
    ...data,
    query,
    activeCategory,
    sortBy,
    visibleOffers: filteredOffers,
    visibleRestaurants,
    resultTitle,
    maxDiscount: Math.max(0, ...filteredOffers.map(offer => offer.__discount || 0)),
    headerProps: {
      cityName: data.cityName,
      activeOrderCount: data.activeOrderCount,
      onLocation: () => data.setCurrentScreen('location'),
      onOrders: () => data.setCurrentScreen('orders'),
      onProfile: () => data.setCurrentScreen('profile'),
    },
    searchProps: {
      value: query,
      onChange: setQuery,
      onSubmit: openSearch,
    },
    onOffer: openOffer,
    onRestaurant: openRestaurant,
    onBanner: openBanner,
    onCategory: category => {
      setActiveCategory(category)
      if (category !== 'all') setSortBy('recommended')
    },
    onSort: setSortBy,
    onExploreAll: () => openExplore(activeCategory),
    onRestaurants: () => openExplore('all'),
    onOrders: () => data.setCurrentScreen('orders'),
  }

  if (data.loadingOffers) {
    return (
      <div className="r2c-exp-loading">
        <img src="/logo.png" alt="R2C" />
        <span />
        <p>جاري تجهيز الشاشة التجريبية…</p>
      </div>
    )
  }

  if (!filteredOffers.length) {
    return (
      <main className={`r2c-exp-home r2c-${variant}-home`}>
        <HomeHeader {...model.headerProps} tone={variant === 'discover' ? 'dark' : 'light'} />
        <div className="r2c-exp-empty-search"><SearchField {...model.searchProps} /></div>
        <EmptyExperimentalHome query={query} onClear={() => { setQuery(''); setActiveCategory('all') }} />
      </main>
    )
  }

  if (variant === 'discover') return <DiscoverHome model={model} />
  if (variant === 'smart') return <SmartHome model={model} />
  return <DirectHome model={model} />
}
