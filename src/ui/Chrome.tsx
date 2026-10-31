import { useEffect, useRef, useState, type ReactNode } from 'react'
import { clearAllData } from '../state/session'
import { useStore } from './App'
import { go } from './router'
import { REPO_URL } from './copy'
import { applyTheme, readTheme, type ThemeChoice } from './theme'
import { PALETTES } from './tiles/palettes'
import { PALETTE_CHOICES, applyPalette, usePalette } from './tiles/paletteChoice'
import css from './Chrome.module.css'

export function Wordmark({ size = 'm' }: { size?: 's' | 'm' }) {
  return (
    <span className={`${css.wordmark} ${size === 's' ? css.wordmarkS : ''}`} aria-label="12 Axes squared">
      12&nbsp;Axes<sup>2</sup>
    </span>
  )
}

/** System / Light / Dark. Real radios (visually hidden) so arrow keys move between them natively. */
function ThemePicker() {
  const [theme, setTheme] = useState<ThemeChoice>(readTheme)
  const options: [ThemeChoice, string][] = [
    ['system', 'System'],
    ['light', 'Light'],
    ['dark', 'Dark'],
  ]
  return (
    <fieldset className={css.theme}>
      <legend className="muted small">Theme</legend>
      <div className={css.seg}>
        {options.map(([k, l]) => (
          <label key={k} className={theme === k ? css.segOn : ''}>
            <input
              type="radio"
              name="theme"
              value={k}
              checked={theme === k}
              onChange={() => {
                applyTheme(k)
                setTheme(k)
              }}
              className="visually-hidden"
            />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Answer-grid colours: four scales, two of them safe for colour blindness. Real radios, like the theme. */
function PalettePicker() {
  const current = usePalette().id
  return (
    <fieldset className={css.palette} id="grid-colours">
      <legend className="muted small">Grid colours</legend>
      <div className={css.palList}>
        {PALETTE_CHOICES.map(({ id, name, hint }) => (
          <label key={id} className={current === id ? css.palOn : ''}>
            <input
              type="radio"
              name="palette"
              value={id}
              checked={current === id}
              onChange={() => applyPalette(id)}
              className="visually-hidden"
            />
            <span className={css.swatch} aria-hidden>
              {[-3, -2, -1, 0, 1, 2, 3].map(v => (
                <i key={v} style={{ background: PALETTES[id].fill(v) }} />
              ))}
            </span>
            <span className={css.palText}>
              <span className={css.palName}>{name}</span>
              <span className={css.palHint}>{hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/**
 * Inline confirm for actions that erase answers (no window.confirm). Focus lands on
 * Cancel, the safe choice; Escape cancels.
 */
export function Confirm({
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const cancel = useRef<HTMLButtonElement>(null)
  useEffect(() => cancel.current?.focus(), [])
  return (
    <div
      className={css.confirm}
      role="alertdialog"
      aria-label="Confirm"
      onKeyDown={e => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      <p>{children}</p>
      <div className={css.confirmButtons}>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button ref={cancel} type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

/** Erase everything on this device. Leaves a shared-result route first so its effect can't re-stash it. */
export function useClearData() {
  const { dispatch, setRuns } = useStore()
  return () => {
    go('#/')
    clearAllData()
    setRuns([])
    dispatch({ type: 'reset' })
  }
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
            <a href="#/map">Map</a>
            <a href="#/criticisms">Why a new test</a>
          </nav>
        )}
      </div>
    </header>
  )
}

export function Footer() {
  const { s } = useStore()
  const clear = useClearData()
  const [cleared, setCleared] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const { runs } = useStore()
  const hasData = s.stage !== 'start' || Object.keys(s.answers).length > 0 || s.incoming !== null || runs.length > 0
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
            Axis concepts adapted from the MIT-licensed 12axes test (© 8values/SapplyValues). Questions, scoring and ideology profiles are original. Not affiliated with 12axes.vercel.app.
          </p>
        </div>
        <div className={css.footerCol}>
          <a href="#/method">How it works</a>
          <a href="#/ideologies">Ideology catalogue</a>
          <a href="#/map">Ideology map</a>
          <a href="#/criticisms">Why a new test</a>
          <a href="#/privacy">Privacy</a>
          <a href="#/history">Your runs</a>
          <a href={REPO_URL}>Source and issues</a>
        </div>
        <div className={css.footerCol}>
          <ThemePicker />
          <PalettePicker />
          {confirming ? (
            <Confirm
              confirmLabel="Erase my data"
              onCancel={() => setConfirming(false)}
              onConfirm={() => {
                clear()
                setConfirming(false)
                setCleared(true)
              }}
            >
              Erase your answers, results and saved runs from this device? Export your runs first if you want to keep them. This
              can’t be undone.
            </Confirm>
          ) : (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                if (hasData) setConfirming(true)
                else {
                  clear()
                  setCleared(true)
                }
              }}
            >
              {cleared && !hasData ? 'Data cleared' : 'Clear my data'}
            </button>
          )}
        </div>
      </div>
      <div className={`wrap ${css.credit}`}>
        Created by <a href="https://xk.io">Max Kaye (XertroV)</a> + AI
      </div>
    </footer>
  )
}
