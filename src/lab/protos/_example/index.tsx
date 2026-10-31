import { useEffect, useState } from 'react'
import { CORNERS, COLS, LABEL, ROWS, prefersReducedMotion, type V } from '../../kit'
import { signed, type Palette } from '../../palettes'
import type { ProtoMeta, ProtoProps } from '../../types'
import css from './example.module.css'

/**
 * Reference prototype: a plain 7×7 of split cells. Copy this folder to start a
 * new prototype (rename it; folders starting with "_" sort last in the lab).
 *
 * Geometry (see kit.ts): columns = ideal −3 → +3, rows = now +3 (top) → −3.
 * Each cell is split on its anti-diagonal: top-left triangle = here and now,
 * bottom-right triangle = ideal system.
 */

export const meta: ProtoMeta = {
  name: 'Reference split grid',
  tagline: 'Minimal 7×7 of split triangles. Copy me to start a prototype.',
  ideas: [
    {
      id: 'split-cell',
      title: 'Split cells',
      detail: 'Top-left triangle shows the here-and-now answer, bottom-right the ideal-system answer, each filled from the palette.',
    },
    {
      id: 'corner-chips',
      title: 'Corner chips instead of axis titles',
      detail: 'Hero mode labels the four corners and the centre in plain words, so no axis labels are needed on the side.',
    },
    {
      id: 'glyphs-on-focus',
      title: 'Signed values on hover/selection',
      detail: 'Each triangle shows its value (−3…+3) on the hovered or selected cell, always for the mono palette.',
    },
  ],
}

type Region = keyof typeof CORNERS
const TOUR: Region[] = ['topRight', 'topLeft', 'bottomLeft', 'bottomRight', 'centre']

export function SplitCell({
  now,
  ideal,
  palette,
  glyphs,
}: {
  now: V
  ideal: V
  palette: Palette
  glyphs: boolean
}) {
  return (
    <svg viewBox="0 0 100 100" className={css.svg} aria-hidden>
      {/* Ideal fills the whole square and "now" is drawn over it: two abutting
          triangles would leave an anti-aliased seam on same-colour cells. */}
      <rect width="100" height="100" fill={palette.fill(ideal)} />
      <polygon points="0,0 100,0 0,100" fill={palette.fill(now)} />
      {glyphs && (
        <>
          <text x="28" y="40" fill={palette.ink(now)} className={css.glyph}>
            {signed(now)}
          </text>
          <text x="72" y="80" fill={palette.ink(ideal)} className={css.glyph}>
            {signed(ideal)}
          </text>
        </>
      )}
    </svg>
  )
}

export default function ExampleProto({ mode, palette, statement, size = 'full' }: ProtoProps) {
  const [pick, setPick] = useState<{ i: V; n: V } | null>(null)
  const [hover, setHover] = useState<{ i: V; n: V } | null>(null)
  const [tour, setTour] = useState(0)

  // Hero mode: step through the regions unless the viewer prefers reduced motion.
  useEffect(() => {
    if (mode !== 'hero' || prefersReducedMotion()) return
    const t = setInterval(() => setTour(k => (k + 1) % TOUR.length), 1800)
    return () => clearInterval(t)
  }, [mode])

  const region = CORNERS[TOUR[tour]!]
  const lit = mode === 'hero' ? { i: region.i, n: region.n } : null
  const shown = hover ?? pick

  return (
    <div className={`${css.root} ${size === 'small' ? css.small : ''}`}>
      {mode === 'answer' && <p className={css.statement}>“{statement}”</p>}

      <div className={css.frame}>
        <div className={css.grid} role={mode === 'answer' ? 'group' : 'img'} aria-label={mode === 'hero' ? 'Answer grid: here and now (rows) by ideal system (columns)' : 'Pick your answer'}>
          {ROWS.map(n =>
            COLS.map(i => {
              const on = (pick && pick.i === i && pick.n === n) || (lit && lit.i === i && lit.n === n)
              const glyphs = palette.needsGlyphs || !!on || (hover?.i === i && hover.n === n)
              const cell = <SplitCell now={n} ideal={i} palette={palette} glyphs={glyphs} />
              return mode === 'answer' ? (
                <button
                  key={`${i}:${n}`}
                  type="button"
                  className={`${css.cell} ${on ? css.on : ''}`}
                  aria-pressed={!!on}
                  aria-label={`Here and now: ${LABEL[n]}. Ideal system: ${LABEL[i]}.`}
                  onClick={() => setPick({ i, n })}
                  onMouseEnter={() => setHover({ i, n })}
                  onMouseLeave={() => setHover(null)}
                >
                  {cell}
                </button>
              ) : (
                <div key={`${i}:${n}`} className={`${css.cell} ${on ? css.on : ''}`}>
                  {cell}
                </div>
              )
            }),
          )}
        </div>

        {mode === 'hero' && (
          <>
            <span className={`${css.chip} ${css.tl}`}>{CORNERS.topLeft.short}</span>
            <span className={`${css.chip} ${css.tr}`}>{CORNERS.topRight.short}</span>
            <span className={`${css.chip} ${css.bl}`}>{CORNERS.bottomLeft.short}</span>
            <span className={`${css.chip} ${css.br}`}>{CORNERS.bottomRight.short}</span>
          </>
        )}
      </div>

      <p className={css.key}>
        <span className={css.keyTri} style={{ background: palette.fill(2) }} data-half="now" /> here and now
        <span className={css.keyTri} style={{ background: palette.fill(2) }} data-half="ideal" /> ideal system
      </p>

      {mode === 'hero' ? (
        <p className={css.readout} aria-live="polite">
          <strong>{region.short}.</strong> {region.long}
        </p>
      ) : (
        <p className={css.readout} aria-live="polite">
          {shown ? (
            <>
              Here and now: <strong>{LABEL[shown.n]}</strong> ({signed(shown.n)}) · Ideal system:{' '}
              <strong>{LABEL[shown.i]}</strong> ({signed(shown.i)})
            </>
          ) : (
            'Pick the cell that matches your answer for both.'
          )}
        </p>
      )}
    </div>
  )
}
