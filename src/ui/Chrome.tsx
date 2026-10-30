import { useState } from 'react'
import { clearAllData } from '../state/session'
import { useStore } from './App'
import { go } from './router'
import css from './Chrome.module.css'

export function Wordmark({ size = 'm' }: { size?: 's' | 'm' }) {
  return (
    <span className={`${css.wordmark} ${size === 's' ? css.wordmarkS : ''}`} aria-label="12 Axes squared">
      12&nbsp;Axes<sup>2</sup>
    </span>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') ?? 'auto')
  const next = theme === 'light' ? 'dark' : 'light'
  return (
    <button
      className="btn btn-ghost"
      type="button"
      onClick={() => {
        document.documentElement.setAttribute('data-theme', next)
        try {
          localStorage.setItem('12xx2.theme', next)
        } catch {
          /* ignore */
        }
        setTheme(next)
      }}
    >
      {next === 'light' ? 'Light' : 'Dark'} theme
    </button>
  )
}

export function Header({ compact }: { compact: boolean }) {
  return (
    <header className={`${css.header} ${compact ? css.static : ''}`}>
      <div className={`wrap ${css.headerInner}`}>
        <a href="#/" className={css.home} onClick={() => go('#/')}>
          <Wordmark size="s" />
        </a>
        {!compact && (
          <nav className={css.nav} aria-label="Site">
            <a href="#/method">How it works</a>
            <a href="#/ideologies">Ideologies</a>
            <a href="#/criticisms">Why a new test</a>
          </nav>
        )}
      </div>
    </header>
  )
}

export function Footer() {
  const { dispatch } = useStore()
  const [cleared, setCleared] = useState(false)
  return (
    <footer className={css.footer}>
      <div className={`wrap ${css.footerInner}`}>
        <div>
          <Wordmark size="s" />
          <p className="muted small">
            Answers are scored on your device. Nothing is sent anywhere, and there are no analytics.{' '}
            <a href="#/privacy">Privacy</a>
          </p>
          <p className="muted small">
            Axis concepts adapted from the MIT-licensed 12axes test (© 8values/SapplyValues). Questions, scoring and ideology profiles are original.
          </p>
        </div>
        <div className={css.footerCol}>
          <a href="#/method">How it works</a>
          <a href="#/ideologies">Ideology catalogue</a>
          <a href="#/criticisms">Why a new test</a>
          <a href="#/privacy">Privacy</a>
        </div>
        <div className={css.footerCol}>
          <ThemeToggle />
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              clearAllData()
              dispatch({ type: 'reset' })
              setCleared(true)
            }}
          >
            {cleared ? 'Data cleared' : 'Clear my data'}
          </button>
        </div>
      </div>
      <div className={`wrap ${css.credit}`}>
        Created by <a href="https://xk.io">Max Kaye (XertroV)</a> + AI
      </div>
    </footer>
  )
}
