import { useState } from 'react'
import { auth } from '@r2c/shared'
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth'

export default function AuthScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { Capacitor } = await import('@capacitor/core')

      if (Capacitor.isNativePlatform()) {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
        const result = await GoogleAuth.signIn()
        const credential = GoogleAuthProvider.credential(result.authentication.idToken)
        await signInWithCredential(auth, credential)
      } else {
        const provider = new GoogleAuthProvider()
        await signInWithPopup(auth, provider)
      }
    } catch (err) {
      console.error(err)
      setError('فشل تسجيل الدخول. حاول مرة أخرى.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 pb-20">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="R2C" className="h-20 object-contain" />
        </div>

        <p className="text-center text-gray-500 mb-10">عروض المطاعم الحصرية</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center text-red-600 text-sm font-bold">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl py-4 px-6 font-bold text-gray-700 shadow-sm active:scale-95 transition-transform"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          )}
          {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول بـ Google'}
        </button>
      </div>
    </div>
  )
}
