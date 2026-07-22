import { useState } from 'react'
import { auth } from '@r2c/shared'
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth'
import './onboarding.css'

const LOGIN_IMAGE = '/login-success.jpg'

function GoogleMark() {
  return (
    <span className="r2c-onboarding__google-mark" aria-hidden="true">
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
  )
}

export default function AuthScreen() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    if (loading) return

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
    } catch (loginError) {
      console.error(loginError)
      setError('لم نتمكن من تسجيل الدخول. تأكد من الاتصال وحاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      dir="rtl"
      className={`r2c-onboarding${success ? ' r2c-onboarding--success' : ''}`}
      aria-busy={loading}
    >
      <img className="r2c-onboarding__image" src={LOGIN_IMAGE} alt="وجبة من عروض R2C" />
      <div className="r2c-onboarding__shade" />
      <div className="r2c-onboarding__glow" />
      <div className="r2c-onboarding__noise" />

      <div className="r2c-onboarding__scroll">
        <div className="r2c-onboarding__inner">
          <header className="r2c-onboarding__topbar">
            <span className="r2c-onboarding__step-label">الخطوة 1 من 2</span>
            <span className="r2c-onboarding__brand">
              <img src="/logo.png" alt="R2C" />
            </span>
          </header>

          <section className="r2c-onboarding__hero">
            <div className="r2c-onboarding__eyebrow">
              <span className="r2c-onboarding__eyebrow-dot" />
              عروض حقيقية من مطاعم قريبة
            </div>

            <h1 className="r2c-onboarding__title">
              وفّر في <span className="r2c-onboarding__title-accent">كل طلب</span>
            </h1>

            <p className="r2c-onboarding__subtitle">
              اكتشف خصومات المطاعم القريبة منك، اطلب بسهولة، وخلي كل خروجة أو وجبة أوفر.
            </p>

            <div className="r2c-onboarding__benefits" aria-label="مميزات التطبيق">
              <span className="r2c-onboarding__benefit">خصومات يومية</span>
              <span className="r2c-onboarding__benefit">مطاعم قريبة</span>
              <span className="r2c-onboarding__benefit">طلب أسرع</span>
            </div>
          </section>

          <section className="r2c-onboarding__actions">
            <div className="r2c-onboarding__progress" aria-hidden="true">
              <span className="r2c-onboarding__progress-dot is-active" />
              <span className="r2c-onboarding__progress-dot" />
            </div>

            {error && <div className="r2c-onboarding__error" role="alert">{error}</div>}
            {success && (
              <div className="r2c-onboarding__success-note" role="status">
                تم تسجيل الدخول، جاري تجهيز العروض القريبة منك…
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || success}
              className="r2c-onboarding__primary r2c-onboarding__primary--google"
            >
              {loading ? (
                <span className="r2c-onboarding__google-mark">
                  <span className="r2c-onboarding__spinner" />
                </span>
              ) : (
                <GoogleMark />
              )}

              <span>
                {loading
                  ? 'جاري تسجيل الدخول…'
                  : success
                    ? 'تم تسجيل الدخول'
                    : 'المتابعة باستخدام Google'}
              </span>
              <span aria-hidden="true" />
            </button>

            <p className="r2c-onboarding__legal">
              بالمتابعة أنت توافق على شروط الاستخدام وسياسة الخصوصية الخاصة بـ R2C.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
