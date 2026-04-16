import { useState } from 'react'
import { auth } from '@r2c/shared'
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth'

const LOGIN_IMAGE = '/login-banner.jpg'
const SUCCESS_IMAGE = '/login-success.jpg'

export default function AuthScreen() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const imageSrc = success || loading ? SUCCESS_IMAGE : LOGIN_IMAGE

  const handleGoogleLogin = async () => {
    setLoading(true)
    setSuccess(false)
    setError('')

    try {
      const { Capacitor } = await import('@capacitor/core')

      if (Capacitor.isNativePlatform()) {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
        await GoogleAuth.initialize({
          clientId: '907964191277-0angci6kbvebt9vl57u7qipr77o0uicl.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        })

        const result = await GoogleAuth.signIn()
        const credential = GoogleAuthProvider.credential(result.authentication.idToken)
        await signInWithCredential(auth, credential)
      } else {
        const provider = new GoogleAuthProvider()
        await signInWithPopup(auth, provider)
      }

      setSuccess(true)
      await new Promise(resolve => setTimeout(resolve, 700))
    } catch (err) {
      console.error(err)
      setError('فشل تسجيل الدخول. حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* الصورة على كامل الشاشة */}
      <img
        src={imageSrc}
        alt="Auth visual"
        className="absolute inset-0 h-full w-full object-cover transition-all duration-700"
      />

      {/* تدرج على كامل الشاشة لتحسين وضوح المحتوى */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/40 to-black/60" />

      {/* المحتوى */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* أعلى الشاشة */}
        <div className="px-6 pt-8">
          <div className="mx-auto max-w-md text-center text-white">
            <img
              src="/logo.png"
              alt="R2C"
              className="mx-auto mb-5 h-16 object-contain drop-shadow-md"
            />

            <h1 className="text-3xl font-extrabold tracking-tight mb-3 drop-shadow-sm">
              {success ? 'تم تسجيل الدخول بنجاح' : 'اكتشف أفضل العروض'}
            </h1>

            <p className="text-sm sm:text-base text-white/90 leading-6">
              {success
                ? 'جاري تجهيز تجربتك داخل التطبيق'
                : 'ادخل الآن للوصول إلى عروض المطاعم الحصرية والخصومات القريبة منك'}
            </p>
          </div>
        </div>

        {/* أسفل الشاشة */}
        <div className="mt-auto px-4 pb-8 pt-8">
          <div className="max-w-md mx-auto rounded-[28px] bg-white/92 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.22)] border border-white/50 p-6 sm:p-7">
            <div className="text-center mb-6">
              <h2 className="text-xl font-extrabold text-gray-900 mb-2">
                أهلاً بك في R2C
              </h2>
              <p className="text-gray-600 text-sm leading-6">
                سجل الدخول وابدأ في تصفح العروض بسهولة وسرعة
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4 text-center text-red-600 text-sm font-bold">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 mb-4 text-center text-green-700 text-sm font-bold">
                تم تسجيل الدخول بنجاح
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full group relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-200 active:scale-[0.98] disabled:opacity-70"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-orange-50 via-white to-orange-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <span className="relative flex items-center justify-center gap-3">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100">
                    <svg width="20" height="20" viewBox="0 0 48 48">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                  </span>
                )}

                <span className="text-[15px] font-extrabold text-gray-800">
                  {loading
                    ? 'جاري تسجيل الدخول...'
                    : success
                    ? 'تم تسجيل الدخول'
                    : 'تسجيل الدخول باستخدام Google'}
                </span>
              </span>
            </button>

            <p className="text-center text-[12px] text-gray-500 mt-5 leading-5">
              بالمتابعة، أنت توافق على استخدام تسجيل الدخول الآمن للوصول إلى خدمات التطبيق
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
