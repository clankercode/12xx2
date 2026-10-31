/**
 * Theme choice: follow the system (the default; nothing stored), or force light or dark.
 * public/theme.js applies a stored choice before first paint; keep the two in sync.
 */
export type ThemeChoice = 'system' | 'light' | 'dark'

const KEY = '12xx2.theme'
/** Page background (--ink) per theme, for the browser chrome's theme-color. */
const INK = { light: '#f4f2ec', dark: '#141726' } as const

export function readTheme(): ThemeChoice {
  const t = document.documentElement.getAttribute('data-theme')
  return t === 'light' || t === 'dark' ? t : 'system'
}

export function applyTheme(t: ThemeChoice) {
  const root = document.documentElement
  if (t === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', t)
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', t === 'system' ? 'dark light' : t)
  // index.html has one theme-color per prefers-color-scheme; a forced theme pins both.
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
    const scheme = m.getAttribute('media')?.includes('light') ? 'light' : 'dark'
    m.setAttribute('content', INK[t === 'system' ? scheme : t])
  }
  try {
    if (t === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, t)
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
}
