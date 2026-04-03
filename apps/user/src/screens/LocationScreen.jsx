import { useState } from 'react'
import { useApp } from '../contexts'

export default function LocationScreen() {
  const { setCurrentScreen, setUserLocation, markLocationAsked } = useApp()
  const [locating, setLocating] = useState(false)
  const [denied, setDenied]     = useState(false)

  const finish = (location) => {
    markLocationAsked()          // سجّل أن الإذن طُلب
    if (location) setUserLocation(location)
    setCurrentScreen('search')
  }

  const requestLocation = async () => {
    setLocating(true)
    setDenied(false)

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
        finish({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      } else {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocating(false)
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
    }
  }

  // طلب تلقائي عند فتح الشاشة
  useState(() => { requestLocation() }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="text-7xl mb-6">📍</div>
      <h2 className="text-2xl font-black mb-3" style={{ color: '#15487d' }}>تحديد موقعك</h2>
      <p className="text-gray-500 mb-8">نحتاج موقعك لعرض أقرب العروض والمطاعم إليك</p>

      {locating && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 font-bold">جاري تحديد موقعك...</p>
        </div>
      )}

      {denied && (
        <div className="w-full">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-red-600 font-bold mb-1">لم نتمكن من تحديد موقعك</p>
            <p className="text-red-400 text-sm">يرجى السماح بالوصول للموقع من إعدادات الجهاز</p>
          </div>
          <button
            onClick={requestLocation}
            className="w-full py-4 rounded-2xl font-bold text-white text-lg mb-3"
            style={{ background: '#ee7b26' }}
          >
            حاول مرة أخرى
          </button>
          <button
            onClick={() => finish(null)}
            className="w-full py-4 rounded-2xl font-bold text-gray-500 text-lg border border-gray-200"
          >
            تخطي الآن
          </button>
        </div>
      )}
    </div>
  )
}
