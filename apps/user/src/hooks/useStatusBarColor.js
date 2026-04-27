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

function updateCssStatusBar(theme, android) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const layerHeight = android && theme.overlay ? 'var(--r2c-statusbar-space)' : '0px'
  const activePadding = android && theme.padTop ? 'var(--r2c-statusbar-space)' : '0px'

  root.style.setProperty('--r2c-statusbar-color', theme.color)
  root.style.setProperty('--r2c-statusbar-layer-height', layerHeight)
  root.style.setProperty('--r2c-statusbar-space-active', activePadding)
  root.style.setProperty('--r2c-screen-background', theme.color)

  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) {
    themeColor.setAttribute('content', theme.color)
  }
}

async function applyCapacitorStatusBar(theme) {
  await StatusBar.show()
  await StatusBar.setOverlaysWebView({ overlay: theme.overlay })
  await StatusBar.setBackgroundColor({ color: theme.color })
  await StatusBar.setStyle({
    style: CAPACITOR_STATUS_BAR_STYLE[theme.style] || Style.Dark,
  })
}

async function applyNativeFallback(theme) {
  await R2CStatusBar.setStatusBar({
    color: theme.color,
    style: theme.style,
    overlay: theme.overlay,
    darkIcons: theme.style === 'dark',
  })
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
