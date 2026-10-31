import { Component, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { PALETTE_IDS, PALETTES, isPaletteId, type PaletteId } from './palettes'
import { DEFAULT_STATEMENT } from './kit'
import type { LabMode, ProtoMeta, ProtoProps } from './types'
import css from './LabPage.module.css'

/**
 * Dev-only prototype lab ("#/lab"). Discovers every src/lab/protos/<id>/index.tsx
 * and renders the chosen one with a toolbar (mode, palette, theme, side-by-side).
 * Toolbar state lives in the hash query so a state can be shared or screenshotted:
 *   #/lab?p=<id>&mode=hero|answer&pal=gr|bo|rt|mono&theme=dark|light&side=1
 */

interface ProtoModule {
  default: ComponentType<ProtoProps>
  meta: ProtoMeta
}

interface Proto {
  id: string
  letter: string
  Component: ComponentType<ProtoProps>
  meta: ProtoMeta
}

const modules = import.meta.glob<ProtoModule>('./protos/*/index.tsx', { eager: true })

const PROTOS: Proto[] = Object.entries(modules)
  .map(([path, mod]) => ({ id: path.split('/')[2]!, mod }))
  .filter(({ mod }) => typeof mod.default === 'function' && mod.meta)
  // "_"-prefixed (reference) prototypes last.
  .sort((a, b) => Number(a.id.startsWith('_')) - Number(b.id.startsWith('_')) || a.id.localeCompare(b.id))
  .map(({ id, mod }, k) => ({ id, letter: String.fromCharCode(65 + k), Component: mod.default, meta: mod.meta }))

type Theme = 'dark' | 'light'

interface LabState {
  p: string
  mode: LabMode
  pal: PaletteId
  theme: Theme | null
  side: boolean
}

function parseQuery(query: string): LabState {
  const q = new URLSearchParams(query)
  const p = q.get('p')
  const mode = q.get('mode')
  const pal = q.get('pal')
  const theme = q.get('theme')
  return {
    p: PROTOS.some(x => x.id === p) ? p! : (PROTOS[0]?.id ?? ''),
    mode: mode === 'answer' ? 'answer' : 'hero',
    pal: isPaletteId(pal) ? pal : 'gr',
    theme: theme === 'dark' || theme === 'light' ? theme : null,
    side: q.get('side') === '1',
  }
}

function toQuery(s: LabState): string {
  const q = new URLSearchParams()
  if (s.p) q.set('p', s.p)
  q.set('mode', s.mode)
  q.set('pal', s.pal)
  if (s.theme) q.set('theme', s.theme)
  if (s.side) q.set('side', '1')
  return q.toString()
}

/** One broken prototype must not take the whole lab down. */
class Boundary extends Component<{ name: string; children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  override render() {
    if (this.state.error)
      return (
        <div className={css.crash} role="alert">
          <strong>{this.props.name} crashed:</strong> {this.state.error.message}
        </div>
      )
    return this.props.children
  }
}

function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: ReactNode; title?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className={css.field} role="group" aria-label={label}>
      <span className={css.fieldLabel}>{label}</span>
      <div className={css.seg}>
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            className={css.segBtn}
            aria-pressed={o.value === value}
            title={o.title}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Ideas({ proto, compact = false }: { proto: Proto; compact?: boolean }) {
  if (!proto.meta.ideas.length) return null
  return (
    <ol className={`${css.ideas} ${compact ? css.ideasCompact : ''}`}>
      {proto.meta.ideas.map((idea, k) => (
        <li key={idea.id} id={`idea-${proto.letter}${k + 1}`}>
          <span className={css.ideaTag}>
            Idea {proto.letter}
            {k + 1}
          </span>
          <span className={css.ideaTitle}>{idea.title}</span>
          {!compact && <span className={css.ideaDetail}>{idea.detail}</span>}
        </li>
      ))}
    </ol>
  )
}

export default function LabPage({ query }: { query: string }) {
  const [state, setState] = useState<LabState>(() => parseQuery(query))
  // A hand-edited hash (hashchange) re-syncs the toolbar.
  useEffect(() => setState(parseQuery(query)), [query])

  const update = (patch: Partial<LabState>) =>
    setState(prev => {
      const next = { ...prev, ...patch }
      // replaceState: no history entry and no hashchange loop.
      history.replaceState(null, '', `${location.pathname}${location.search}#/lab?${toQuery(next)}`)
      return next
    })

  useEffect(() => {
    if (state.theme) document.documentElement.setAttribute('data-theme', state.theme)
  }, [state.theme])

  const palette = PALETTES[state.pal]
  const current = useMemo(() => PROTOS.find(x => x.id === state.p), [state.p])
  const effectiveTheme: Theme =
    state.theme ??
    (document.documentElement.getAttribute('data-theme') === 'light' ||
    (document.documentElement.getAttribute('data-theme') !== 'dark' && matchMedia('(prefers-color-scheme: light)').matches)
      ? 'light'
      : 'dark')

  return (
    <div className={css.lab}>
      <header className={css.toolbar}>
        <div className={css.title}>
          <strong>Prototype lab</strong>
          <span className={css.devTag}>dev only</span>
        </div>

        <div className={css.field}>
          <label className={css.fieldLabel} htmlFor="lab-proto">
            Prototype
          </label>
          <select
            id="lab-proto"
            className={css.select}
            value={state.p}
            disabled={state.side}
            onChange={e => update({ p: e.target.value })}
          >
            {PROTOS.map(x => (
              <option key={x.id} value={x.id}>
                {x.letter}. {x.meta.name}
              </option>
            ))}
          </select>
        </div>

        <Seg<LabMode>
          label="Mode"
          value={state.mode}
          options={[
            { value: 'hero', label: 'Hero', title: 'Landing-page demo of how the grid works' },
            { value: 'answer', label: 'Answer', title: 'Simulate answering one statement' },
          ]}
          onChange={mode => update({ mode })}
        />

        <Seg<PaletteId>
          label="Palette"
          value={state.pal}
          options={PALETTE_IDS.map(id => ({
            value: id,
            title: `${PALETTES[id].name} — ${PALETTES[id].description}`,
            label: (
              <span className={css.swatch} aria-label={PALETTES[id].name}>
                {[-3, -2, -1, 0, 1, 2, 3].map(v => (
                  <i key={v} style={{ background: PALETTES[id].fill(v) }} />
                ))}
              </span>
            ),
          }))}
          onChange={pal => update({ pal })}
        />

        <Seg<Theme>
          label="Theme"
          value={effectiveTheme}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
          onChange={theme => update({ theme })}
        />

        <label className={css.check}>
          <input type="checkbox" checked={state.side} onChange={e => update({ side: e.target.checked })} />
          Side by side
        </label>
      </header>

      <p className={css.paletteNote}>
        <strong>{palette.name}:</strong> {palette.description}
      </p>

      {PROTOS.length === 0 && <p className="muted">No prototypes found under src/lab/protos/*/index.tsx.</p>}

      {state.side ? (
        <div className={css.sideGrid}>
          {PROTOS.map(x => (
            <section key={x.id} className={css.card} aria-labelledby={`lab-card-${x.id}`}>
              <h2 className={css.cardTitle} id={`lab-card-${x.id}`}>
                <button type="button" className={css.cardPick} onClick={() => update({ p: x.id, side: false })}>
                  {x.letter}. {x.meta.name}
                </button>
              </h2>
              <p className={css.tagline}>{x.meta.tagline}</p>
              <div className={css.stage}>
                <Boundary key={state.mode} name={x.meta.name}>
                  <x.Component mode={state.mode} palette={palette} statement={DEFAULT_STATEMENT} size="small" />
                </Boundary>
              </div>
              <Ideas proto={x} compact />
            </section>
          ))}
        </div>
      ) : (
        current && (
          <section aria-labelledby="lab-current">
            <div className={css.head}>
              <h1 className={css.h1} id="lab-current">
                {current.letter}. {current.meta.name}
              </h1>
              <p className={css.tagline}>{current.meta.tagline}</p>
            </div>
            <div className={`${css.stage} ${css.stageFull}`}>
              {/* key: remount on prototype/mode change so internal state resets. */}
              <Boundary key={`${current.id}:${state.mode}`} name={current.meta.name}>
                <current.Component mode={state.mode} palette={palette} statement={DEFAULT_STATEMENT} size="full" />
              </Boundary>
            </div>
            <h2 className={css.ideasHead}>Ideas in this prototype</h2>
            <Ideas proto={current} />
          </section>
        )
      )}
    </div>
  )
}
