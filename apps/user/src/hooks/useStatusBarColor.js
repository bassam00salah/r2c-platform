import { useEffect } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { getStatusBarTheme } from '../config/statusBarTheme'

const R2CStatusBar = registerPlugin('R2CStatusBar')

const CAPACITOR_STATUS_BAR_STYLE = {
  dark: Style.Dark,
  light: Style.Light,
}

const isAndroid = () => Capacitor.getPlatform() === 'android'

function isTransparentStatusBarColor(color) {
  const normalized = String(color || '').trim().toLowerCase()
  return (
    normalized === 'transparent' ||
    normalized === 'rgba(0,0,0,0)' ||
    normalized === 'rgba(0, 0, 0, 0)' ||
    normalized === '#0000' ||
    normalized === '#00000000'
  )
}

function getCapacitorBackgroundColor(color) {
  // بعض إصدارات @capacitor/status-bar لا تتعامل بثبات مع 8-digit hex.
  // عند overlay=true اللون لا يظهر فعليًا، لذلك نمرر لونًا صالحًا ونترك الطبقة الشفافة للـ Native fallback/CSS.
  return isTransparentStatusBarColor(color) ? '#000000' : color
}

function updateCssSystemInsets(result) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const bottomInset = Number(result?.bottomInsetPx)

  if (Number.isFinite(bottomInset) && bottomInset > 0) {
    // القيمة القادمة من Native محوّلة إلى CSS px، ونحصرها حتى لا تتحول إلى مساحة بيضاء كبيرة.
    root.style.setProperty('--r2c-safe-area-bottom', `${Math.min(bottomInset, 34)}px`)
  } else {
    root.style.setProperty('--r2c-safe-area-bottom', '0px')
  }
}

function updateCssStatusBar(theme, android) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const layerHeight = android && theme.overlay ? 'var(--r2c-statusbar-space)' : '0px'
  const activePadding = android && theme.padTop ? 'var(--r2c-statusbar-space)' : '0px'

  const screenBackground = theme.screenBackground || (isTransparentStatusBarColor(theme.color) ? '#ffffff' : theme.color)

  root.style.setProperty('--r2c-statusbar-color', theme.color)
  root.style.setProperty('--r2c-statusbar-layer-height', layerHeight)
  root.style.setProperty('--r2c-statusbar-space-active', activePadding)
  root.style.setProperty('--r2c-screen-background', screenBackground)

  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) {
    themeColor.setAttribute('content', theme.color)
  }
}

async function applyCapacitorStatusBar(theme) {
  await StatusBar.show()
  await StatusBar.setOverlaysWebView({ overlay: theme.overlay })
  await StatusBar.setBackgroundColor({ color: getCapacitorBackgroundColor(theme.color) })
  await StatusBar.setStyle({
    style: CAPACITOR_STATUS_BAR_STYLE[theme.style] || Style.Dark,
  })
}

async function applyNativeFallback(theme) {
  const result = await R2CStatusBar.setStatusBar({
    color: theme.color,
    style: theme.style,
    overlay: theme.overlay,
    darkIcons: theme.style === 'dark',
  })

  updateCssSystemInsets(result)
  return result
}

/**
 * useStatusBarColor('feed')
 * useStatusBarColor({ color: '#111827', style: 'light', padTop: true })
 */
export function useStatusBarColor(themeOrName, overrides) {
  const theme = getStatusBarTheme(themeOrName, overrides)
  const android = isAndroid()

  useEffect(() => {
    updateCssStatusBar(theme, android)

    if (!android) return undefined

    let cancelled = false

    const apply = async () => {
      try {
        await applyCapacitorStatusBar(theme)

        if (!cancelled) {
          await applyNativeFallback(theme).catch(() => {})
        }

        window.setTimeout(() => {
          if (cancelled) return

          applyCapacitorStatusBar(theme)
            .then(() => applyNativeFallback(theme).catch(() => {}))
            .catch(() => {})
        }, 120)
      } catch (error) {
        console.warn('R2C StatusBar update failed:', error?.message || error)
      }
    }

    apply()

    return () => {
      cancelled = true
    }
  }, [android, theme.color, theme.style, theme.padTop, theme.overlay])
}

export default useStatusBarColor
