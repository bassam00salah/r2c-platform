const DEFAULT_STATUS_BAR_THEME = {
  color: '#FFFFFF',
  style: 'dark',
  padTop: true,
  overlay: true,
}

/**
 * style:
 * - 'dark'  = أيقونات داكنة على خلفية فاتحة
 * - 'light' = أيقونات فاتحة على خلفية داكنة
 */
export const STATUS_BAR_THEMES = {
  auth: {
    color: '#000000',
    style: 'light',
    padTop: false,
    overlay: true,
  },
  location: {
    color: '#FFFFFF',
    style: 'dark',
    padTop: true,
    overlay: true,
  },
  feed: {
    color: '#FFFFFF',
    style: 'dark',
    padTop: true,
    overlay: true,
  },
  grid: {
    color: '#ee7b26',
    style: 'light',
    padTop: true,
    overlay: true,
  },
  search: {
    color: '#FFFFFF',
    style: 'dark',
    padTop: true,
    overlay: true,
  },
  restaurantProfile: {
    // شاشات الـ Hero تحتاج الشريط شفافًا حتى تمتد الصورة تحت شريط الهاتف.
    color: '#00000000',
    style: 'light',
    padTop: true,
    overlay: true,
  },
  offerDetails: {
    color: '#00000000',
    style: 'light',
    padTop: true,
    overlay: true,
  },
  confirmOrder: {
    color: '#00000000',
    style: 'light',
    padTop: true,
    overlay: true,
  },
  waiting: {
    color: '#FFF7ED',
    style: 'dark',
    padTop: true,
    overlay: true,
  },
  success: {
    color: '#FFFFFF',
    style: 'dark',
    padTop: true,
    overlay: true,
  },
  orders: {
    color: '#FFFFFF',
    style: 'dark',
    padTop: true,
    overlay: true,
  },
  profile: {
    color: '#FFFFFF',
    style: 'dark',
    padTop: true,
    overlay: true,
  },
  empty: {
    color: '#FFFFFF',
    style: 'dark',
    padTop: true,
    overlay: true,
  },
  explore: {
    color: '#FFFFFF',
    style: 'dark',
    padTop: true,
    overlay: true,
  },
}

export function normalizeStatusBarStyle(style) {
  if (style === 'light' || style === 'LIGHT') return 'light'
  if (style === 'dark' || style === 'DARK') return 'dark'
  return DEFAULT_STATUS_BAR_THEME.style
}

export function getStatusBarTheme(themeOrName, overrides = {}) {
  const baseTheme = typeof themeOrName === 'string'
    ? STATUS_BAR_THEMES[themeOrName]
    : themeOrName

  return {
    ...DEFAULT_STATUS_BAR_THEME,
    ...(baseTheme || {}),
    ...overrides,
    style: normalizeStatusBarStyle(overrides.style ?? baseTheme?.style ?? DEFAULT_STATUS_BAR_THEME.style),
  }
}

export default STATUS_BAR_THEMES
