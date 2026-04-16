import { useEffect, useState } from 'react'
import { useApp } from '../contexts'

const LOCATION_IMAGE = '/location-banner.jpg'
const SUCCESS_IMAGE = '/location-banner.jpg'

export default function LocationScreen() {
  const { setCurrentScreen, setUserLocation, markLocationAsked } = useApp()
  const [locating, setLocating] = useState(false)
  const [denied, setDenied] = useState(false)
  const [granted, setGranted] = useState(false)

  const imageSrc = locating || granted ? SUCCESS_IMAGE : LOCATION_IMAGE

  const finish = (location) => {
    markLocationAsked()
    if (location) setUserLocation(location)
    setCurrentScreen('feed')
  }

  const requestLocation = async () => {
    setLocating(true)
    setDenied(false)
    setGranted(false)

    try {
      const { Capacitor } = await import('@capacitor/core')

      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation')
        const permission = await Geolocation.requestPermissions()

        if (permission.location !== 'granted') {
          setLocating(false)
          setDenied(true)
          return
        }

        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true })
        setGranted(true)
        await new Promise((resolve) => setTimeout(resolve, 700))
        finish({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      } else {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            setLocating(false)
            setGranted(true)
            await new Promise((resolve) => setTimeout(resolve, 700))
            finish({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          },
          () => {
            setLocating(false)
            setDenied(true)
          },
          { enableHighAccuracy: true }
        )
      }
    } catch {
      setLocating(false)
      setDenied(true)
    } finally {
      if (!granted) setLocating(false)
    }
  }

  useEffect(() => {
    requestLocation()
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <img
        src={imageSrc}
        alt="Location visual"
        className="absolute inset-0 h-full w-full object-cover transition-all duration-700"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/45 to-black/65" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="px-6 pt-8">
          <div className="mx-auto max-w-md text-center text-white">
            <img
              src="/logo.png"
              alt="R2C"
              className="mx-auto mb-5 h-16 object-contain drop-shadow-md"
            />

            <div className="mb-4 text-6xl">📍</div>

            <h1 className="mb-3 text-3xl font-extrabold tracking-tight drop-shadow-sm">
              {granted ? 'تم تحديد موقعك بنجاح' : 'فعّل موقعك الآن'}
            </h1>

            <p className="text-sm leading-6 text-white/90 sm:text-base">
              {granted
                ? 'جاري تجهيز أقرب العروض والمطاعم المناسبة لك'
                : 'نحتاج إلى موقعك لعرض العروض والمطاعم الأقرب إليك بشكل أدق وأسرع'}
            </p>
          </div>
        </div>

        <div className="mt-auto px-4 pb-8 pt-8">
          <div className="mx-auto max-w-md rounded-[28px] border border-white/50 bg-white/92 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-md sm:p-7">
            <div className="mb-6 text-center">
              <h2 className="mb-2 text-xl font-extrabold text-gray-900">
                مشاركة الموقع
              </h2>
              <p className="text-sm leading-6 text-gray-600">
                اسمح للتطبيق بالوصول إلى موقعك حتى نعرض لك النتائج الأقرب بشكل أفضل
              </p>
            </div>

            {locating && (
              <div className="mb-5 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-center">
                <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                <p className="font-bold text-orange-600">جاري تحديد موقعك...</p>
                <p className="mt-1 text-sm text-orange-500">
                  انتظر لحظات قليلة
                </p>
              </div>
            )}

            {granted && (
              <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
                <p className="font-bold text-green-700">تم تحديد الموقع بنجاح</p>
                <p className="mt-1 text-sm text-green-600">
                  سيتم نقلك الآن إلى صفحة العروض
                </p>
              </div>
            )}

            {denied && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
                <p className="mb-1 font-bold text-red-600">لم نتمكن من تحديد موقعك</p>
                <p className="text-sm text-red-500">
                  يرجى السماح بالوصول للموقع من إعدادات الجهاز أو المحاولة مرة أخرى
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={requestLocation}
                disabled={locating}
                className="w-full rounded-2xl px-5 py-4 font-extrabold text-white shadow-[0_8px_24px_rgba(238,123,38,0.28)] transition-all duration-200 active:scale-[0.98] disabled:opacity-70"
                style={{ background: '#ee7b26' }}
              >
                {locating ? 'جاري التحديد...' : 'السماح بتحديد الموقع'}
              </button>

              <button
                onClick={() => finish(null)}
                disabled={locating}
                className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-lg font-bold text-gray-600 transition-all duration-200 active:scale-[0.98] disabled:opacity-70"
              >
                تخطي الآن
              </button>
            </div>

            <p className="mt-5 text-center text-[12px] leading-5 text-gray-500">
              يمكنك تغيير إذن الموقع لاحقًا من إعدادات الجهاز في أي وقت
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
