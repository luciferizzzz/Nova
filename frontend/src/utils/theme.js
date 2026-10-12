const THEME_KEY = 'nova-theme'
const ACCENT_KEY = 'nova-accent'

export const ACCENTS = [
  { value: 'nova', labelKey: 'settings.accentNova' },
  { value: 'blue', labelKey: 'settings.accentBlue' },
  { value: 'pink', labelKey: 'settings.accentPink' },
  { value: 'red', labelKey: 'settings.accentRed' },
  { value: 'purple', labelKey: 'settings.accentPurple' },
  { value: 'sage', labelKey: 'settings.accentSage' },
  { value: 'amber', labelKey: 'settings.accentAmber' },
  { value: 'teal', labelKey: 'settings.accentTeal' },
  { value: 'slate', labelKey: 'settings.accentSlate' },
  { value: 'terracotta', labelKey: 'settings.accentTerracotta' },
  { value: 'midnight', labelKey: 'settings.accentMidnight' }
]

export function applyTheme(theme = 'dark', accent = 'nova') {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  if (accent && accent !== 'nova') root.setAttribute('data-accent', accent)
  else root.removeAttribute('data-accent')
  localStorage.setItem(THEME_KEY, theme)
  localStorage.setItem(ACCENT_KEY, accent || 'nova')
}

export function loadTheme() {
  return {
    theme: localStorage.getItem(THEME_KEY) || 'dark',
    accent: localStorage.getItem(ACCENT_KEY) || 'nova'
  }
}
