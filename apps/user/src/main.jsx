import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppProvider } from './contexts/index.jsx'
import ErrorBoundary from '@r2c/shared/components/ErrorBoundary'
import { App as CapacitorApp } from '@capacitor/app'

// ── معالج زر العودة في Capacitor (أندرويد وiOS) ──────────────────────────
CapacitorApp.addListener('backButton', ({ canGoBack }) => {
  if (!canGoBack) {
    // إذا لم يكن هناك شاشة سابقة، أغلق التطبيق
    CapacitorApp.exitApp()
  } else {
    // إذا كان هناك شاشة سابقة، اضغط على زر العودة
    window.history.back()
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>
)
