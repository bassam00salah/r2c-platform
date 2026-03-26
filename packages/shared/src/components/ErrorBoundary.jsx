/**
 * ErrorBoundary — مُكوِّن حماية من الأعطال
 *
 * الإصلاح:
 *  [جودة] يمنع أي خطأ غير معالج من إسقاط التطبيق بالكامل
 *  [جودة] يعرض شاشة صديقة بدلاً من شاشة بيضاء
 *
 * الاستخدام:
 *   // في main.jsx
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 *
 *   // أو حول قسم معين
 *   <ErrorBoundary fallback={<p>خطأ في التقارير</p>}>
 *     <ReportsPage />
 *   </ErrorBoundary>
 */

import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // في الإنتاج: أرسل لـ Sentry أو Firebase Crashlytics
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    // أعد تحميل الصفحة إن لم ينجح الـ reset
    if (this.state.hasError) {
      window.location.reload()
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    // إذا مُرِّر fallback مخصص — استخدمه
    if (this.props.fallback) return this.props.fallback

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#fff',
          textAlign: 'center',
          direction: 'rtl',
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>
          حدث خطأ غير متوقع
        </h2>
        <p style={{ color: '#6b7280', marginBottom: 24, maxWidth: 320 }}>
          نعتذر عن هذا الخلل. يرجى إعادة المحاولة. إذا استمرت المشكلة يرجى التواصل مع الدعم.
        </p>
        <button
          onClick={this.handleReset}
          style={{
            background: '#ee7b26',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            padding: '14px 32px',
            fontWeight: 800,
            fontSize: 16,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          إعادة المحاولة
        </button>

        {/* تفاصيل الخطأ في وضع التطوير فقط */}
        {import.meta.env?.DEV && this.state.error && (
          <details style={{ marginTop: 24, textAlign: 'left', maxWidth: 500, color: '#ef4444', fontSize: 12 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>تفاصيل الخطأ (dev only)</summary>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
              {this.state.error.toString()}
            </pre>
          </details>
        )}
      </div>
    )
  }
}
