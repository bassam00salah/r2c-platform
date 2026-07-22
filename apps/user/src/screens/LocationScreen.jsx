import { useState } from 'react'
import { useApp } from '../contexts'
import './onboarding.css'

const LOCATION_IMAGE = '/location-banner.jpg'

const LOCATION_PRESETS = {
  eg: {
    name: 'مصر',
    flag: '🇪🇬',
    cities: [
      { id: 'cairo', name: 'القاهرة', area: 'القاهرة الكبرى', lat: 30.0444, lng: 31.2357 },
      { id: 'giza', name: 'الجيزة', area: 'الجيزة', lat: 30.0131, lng: 31.2089 },
      { id: 'alexandria', name: 'الإسكندرية', area: 'الساحل الشمالي', lat: 31.2001, lng: 29.9187 },
      { id: 'mansoura', name: 'المنصورة', area: 'الدقهلية', lat: 31.0409, lng: 31.3785 },
    ],
  },
  sa: {
    name: 'السعودية',
    flag: '🇸🇦',
    cities: [
      { id: 'riyadh', name: 'الرياض', area: 'منطقة الرياض', lat: 24.7136, lng: 46.6753 },
      { id: 'jeddah', name: 'جدة', area: 'منطقة مكة', lat: 21.4858, lng: 39.1925 },
      { id: 'dammam', name: 'الدمام', area: 'المنطقة الشرقية', lat: 26.4207, lng: 50.0888 },
      { id: 'madinah', name: 'المدينة', area: 'المدينة المنورة', lat: 24.5247, lng: 39.5692 },
    ],
  },
}

function MapArtwork() {
  return (
    <div className="r2c-location-map" aria-hidden="true">
      <svg viewBox="0 0 300 176" fill="none">
        <path
          d="M-18 132C20 119 43 127 72 106C100 86 95 49 129 43C166 37 179 78 209 76C240 74 249 43 321 45"
          stroke="rgba(255,255,255,.62)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M-18 132C20 119 43 127 72 106C100 86 95 49 129 43C166 37 179 78 209 76C240 74 249 43 321 45"
          stroke="#ff8b20"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="8 9"
        />
        <circle cx="52" cy="118" r="5" fill="#fff" />
        <circle cx="245" cy="61" r="5" fill="#fff" />
      </svg>

      <span className="r2c-location-pulse" />
      <span className="r2c-location-pin">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" fill="#fff" />
          <circle cx="12" cy="12" r="8" stroke="#fff" strokeWidth="2" opacity=".72" />
        </svg>
      </span>
    </div>
  )
}

function LocationIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21C15.8 16.5 18 13.6 18 10A6 6 0 1 0 6 10C6 13.6 8.2 16.5 12 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2" fill="currentColor" />
    </svg>
  )
}

function CityIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20V8L10 5V20M10 20V3L20 7V20M2 20H22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 8H16M13 12H16M13 16H16M6.5 11H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export default function LocationScreen() {
  const { setCurrentScreen, setUserLocation, markLocationAsked } = useApp()
  const [locating, setLocating] = useState(false)
  const [denied, setDenied] = useState(false)
  const [granted, setGranted] = useState(false)
  const [showManualPicker, setShowManualPicker] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState('eg')
  const [selectedCityId, setSelectedCityId] = useState('cairo')

  const saveLocationLocally = (city, country, coords) => {
    try {
      localStorage.setItem('r2c_city', city)
      localStorage.setItem('r2c_country', JSON.stringify(country))
      if (coords) localStorage.setItem('r2c_coords', JSON.stringify(coords))
    } catch {
      // localStorage قد لا يكون متاحًا في بعض أوضاع الخصوصية؛ لا نمنع استمرار المستخدم.
    }
  }

  const finish = (location) => {
    markLocationAsked()
    if (location) setUserLocation(location)
    setCurrentScreen('feed')
  }

  const resolveAddress = async (lat, lng) => {
    const fallback = {
      city: 'موقعك الحالي',
      country: { code: '', name: '', flag: '🌐' },
    }

    try {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 6500)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`,
        { signal: controller.signal }
      )
      window.clearTimeout(timeoutId)

      if (!response.ok) return fallback

      const data = await response.json()
      const address = data.address || {}
      const code = String(address.country_code || '').toLowerCase()
      const city = address.city || address.town || address.village || address.county || address.state || fallback.city
      const flag = code
        ? String.fromCodePoint(...code.toUpperCase().split('').map(letter => 127397 + letter.charCodeAt(0)))
        : '🌐'

      return {
        city,
        country: { code, name: address.country || '', flag },
      }
    } catch {
      return fallback
    }
  }

  const completeGpsLocation = async (latitude, longitude) => {
    const coords = { lat: latitude, lng: longitude }
    const address = await resolveAddress(latitude, longitude)

    saveLocationLocally(address.city, address.country, coords)
    setGranted(true)
    setDenied(false)

    await new Promise(resolve => window.setTimeout(resolve, 650))
    finish({ ...coords, city: address.city, country: address.country })
  }

  const requestLocation = async () => {
    if (locating) return

    setLocating(true)
    setDenied(false)
    setGranted(false)

    try {
      const { Capacitor } = await import('@capacitor/core')

      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation')
        const permission = await Geolocation.requestPermissions()

        if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') {
          setDenied(true)
          return
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 120000,
        })

        await completeGpsLocation(position.coords.latitude, position.coords.longitude)
        return
      }

      if (!navigator.geolocation) {
        setDenied(true)
        return
      }

      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async position => {
            try {
              await completeGpsLocation(position.coords.latitude, position.coords.longitude)
              resolve()
            } catch (error) {
              reject(error)
            }
          },
          reject,
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 }
        )
      })
    } catch (locationError) {
      console.warn('R2C location request failed:', locationError?.message || locationError)
      setDenied(true)
    } finally {
      setLocating(false)
    }
  }

  const openManualPicker = () => {
    setDenied(false)
    setShowManualPicker(true)
  }

  const selectCountry = countryCode => {
    const firstCity = LOCATION_PRESETS[countryCode].cities[0]
    setSelectedCountry(countryCode)
    setSelectedCityId(firstCity.id)
  }

  const confirmManualLocation = () => {
    const countryData = LOCATION_PRESETS[selectedCountry]
    const city = countryData.cities.find(item => item.id === selectedCityId)
    if (!city) return

    const country = {
      code: selectedCountry,
      name: countryData.name,
      flag: countryData.flag,
    }
    const coords = { lat: city.lat, lng: city.lng }

    saveLocationLocally(city.name, country, coords)
    setShowManualPicker(false)
    finish({ ...coords, city: city.name, country, manual: true })
  }

  const visibleCities = LOCATION_PRESETS[selectedCountry].cities

  return (
    <main
      dir="rtl"
      className={`r2c-onboarding r2c-onboarding--location${granted ? ' r2c-onboarding--success' : ''}`}
      aria-busy={locating}
    >
      <img className="r2c-onboarding__image" src={LOCATION_IMAGE} alt="تحديد موقعك داخل R2C" />
      <div className="r2c-onboarding__shade" />
      <div className="r2c-onboarding__glow" />
      <div className="r2c-onboarding__noise" />

      <div className="r2c-onboarding__scroll">
        <div className="r2c-onboarding__inner">
          <header className="r2c-onboarding__topbar">
            <span className="r2c-onboarding__step-label">الخطوة 2 من 2</span>
            <span className="r2c-onboarding__brand">
              <img src="/logo.png" alt="R2C" />
            </span>
          </header>

          <section className="r2c-location-hero">
            <MapArtwork />

            <div className="r2c-location-copy">
              <h1 className="r2c-onboarding__title">
                {granted ? 'لقينا موقعك' : <>نجيب لك العروض <span className="r2c-onboarding__title-accent">القريبة</span></>}
              </h1>
              <p className="r2c-onboarding__subtitle">
                {granted
                  ? 'جاري ترتيب المطاعم والعروض الأقرب إليك الآن.'
                  : 'حدد موقعك مرة واحدة علشان نرتب لك المطاعم والعروض المتاحة حواليك.'}
              </p>
            </div>
          </section>

          <section className="r2c-onboarding__actions">
            <div className="r2c-onboarding__progress" aria-hidden="true">
              <span className="r2c-onboarding__progress-dot" />
              <span className="r2c-onboarding__progress-dot is-active" />
            </div>

            {denied && (
              <div className="r2c-onboarding__error" role="alert">
                لم نتمكن من الوصول للموقع. يمكنك السماح به من إعدادات الجهاز أو اختيار مدينتك يدويًا.
              </div>
            )}

            {granted && (
              <div className="r2c-onboarding__success-note" role="status">
                تم تحديد موقعك بنجاح، لحظة ونفتح لك العروض.
              </div>
            )}

            <button
              type="button"
              className="r2c-onboarding__primary"
              onClick={requestLocation}
              disabled={locating || granted}
            >
              <span className="r2c-onboarding__primary-content">
                <span className="r2c-onboarding__button-icon">
                  {locating ? <span className="r2c-onboarding__spinner" /> : <LocationIcon />}
                </span>
                <span>
                  {locating
                    ? 'جاري تحديد موقعك…'
                    : granted
                      ? 'تم تحديد الموقع'
                      : 'استخدم موقعي الحالي'}
                </span>
              </span>
            </button>

            <button
              type="button"
              className="r2c-onboarding__secondary"
              onClick={openManualPicker}
              disabled={locating || granted}
            >
              اختار المنطقة يدويًا
            </button>

            <p className="r2c-onboarding__legal">
              لا نشارك موقعك مع المطاعم، ويُستخدم فقط لترتيب النتائج الأقرب لك.
            </p>
          </section>
        </div>
      </div>

      {showManualPicker && (
        <div
          className="r2c-location-sheet-backdrop"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setShowManualPicker(false)
          }}
        >
          <section className="r2c-location-sheet" role="dialog" aria-modal="true" aria-labelledby="manual-location-title">
            <div className="r2c-location-sheet__handle" />

            <div className="r2c-location-sheet__head">
              <div>
                <h2 id="manual-location-title">اختار مدينتك</h2>
                <p>يمكنك تغييرها بعد ذلك من الشاشة الرئيسية.</p>
              </div>
              <button
                type="button"
                className="r2c-location-sheet__close"
                onClick={() => setShowManualPicker(false)}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            <div className="r2c-location-sheet__countries" role="tablist" aria-label="الدولة">
              {Object.entries(LOCATION_PRESETS).map(([code, country]) => (
                <button
                  key={code}
                  type="button"
                  role="tab"
                  aria-selected={selectedCountry === code}
                  className={`r2c-location-sheet__country${selectedCountry === code ? ' is-active' : ''}`}
                  onClick={() => selectCountry(code)}
                >
                  {country.flag} {country.name}
                </button>
              ))}
            </div>

            <div className="r2c-location-sheet__cities">
              {visibleCities.map(city => (
                <button
                  key={city.id}
                  type="button"
                  className={`r2c-location-sheet__city${selectedCityId === city.id ? ' is-active' : ''}`}
                  onClick={() => setSelectedCityId(city.id)}
                >
                  <span className="r2c-location-sheet__city-icon"><CityIcon /></span>
                  <span>
                    <strong>{city.name}</strong>
                    <span>{city.area}</span>
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="r2c-location-sheet__confirm"
              onClick={confirmManualLocation}
              disabled={!selectedCityId}
            >
              تأكيد المدينة والمتابعة
            </button>
          </section>
        </div>
      )}
    </main>
  )
}
