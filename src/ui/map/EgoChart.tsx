import { useState } from 'react'
import { MATCH_LABEL } from '../copy'
import { FAMILIES, Mark, Swatch, famColor, placeLabels } from './marks'
import { useWidth } from './useWidth'
import css from './Map.module.css'

export interface EgoItem {
  key: string
  fam: string
  name: string
  /** True distance from the centre (quiz units). */
  r: number
  /** Position relative to the centre, in quiz units: |pos| === r. */
  pos: readonly [number, number]
  hollow?: boolean
  /** Ruled out: drawn hollow with a strike. */
  struck?: boolean
  href?: string
  aria: string
  /** Always labelled (e.g. the nearest few). */
  label?: string
  /** Detail line shown on hover/focus. */
  detail: string
}

export interface Cuts {
  veryClose: number
  close: number
  loose: number
}

/**
 * "Exact from here": the centre at the middle, every other point at its true distance, in the
 * direction the 2D map puts it. Rings mark the fit cuts. Dots are links (or buttons with onPick).
 */
export function EgoChart({
  items,
  center,
  cuts,
  onPick,
  ariaLabel,
  height,
}: {
  items: EgoItem[]
  center: { label: string; tone: 'ideal' | 'now' | { fam: string } }
  cuts: Cuts
  onPick?: (key: string) => void
  ariaLabel: string
  height?: number
}) {
  const [ref, W] = useWidth<HTMLDivElement>()
  const [hot, setHot] = useState<string | null>(null)
  const H = height ?? Math.round(Math.min(Math.max(W * 0.86, 300), 620))
  const pad = W < 480 ? 18 : 30
  const maxR = Math.max(cuts.loose * 1.6, ...items.map(i => i.r)) * 1.04
  const s = (Math.min(W, H) / 2 - pad) / maxR
  const cx = W / 2
  const cy = H / 2
  const sx = (p: readonly [number, number]) => [cx + p[0] * s, cy - p[1] * s] as const
  const pts = items.map(i => ({ i, xy: sx(i.pos) }))
  const hotItem = items.find(i => i.key === hot)
  const labels = placeLabels(
    [
      { key: '__c', text: center.label, x: cx, y: cy, px: 13, force: true },
      ...pts.filter(p => p.i.label || p.i.key === hot).map(p => ({ key: p.i.key, text: p.i.key === hot ? p.i.name : p.i.label!, x: p.xy[0], y: p.xy[1], px: 12, force: true })),
    ],
    pts.map(p => ({ x: p.xy[0], y: p.xy[1] })),
    W,
    H,
  )
  const grid = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6].filter(g => g < maxR)
  const centerColor = center.tone === 'ideal' ? 'var(--ideal)' : center.tone === 'now' ? 'var(--now)' : famColor(center.tone.fam)
  const pick = (k: string) => onPick?.(k)

  return (
    <div ref={ref} className={css.chartBox}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={ariaLabel} className={`${css.svg} ${css.tween}`}>
        {grid.map(g => (
          <g key={g}>
            <circle cx={cx} cy={cy} r={g * s} fill="none" stroke="var(--rule-major)" strokeWidth={1} />
            <text x={cx + 3} y={cy - g * s - 3} className={css.tick}>
              {g.toFixed(1)}
            </text>
          </g>
        ))}
        <circle cx={cx} cy={cy} r={cuts.veryClose * s} className={css.ringVeryClose} />
        <circle cx={cx} cy={cy} r={cuts.close * s} className={css.ringClose} />
        <circle cx={cx} cy={cy} r={cuts.loose * s} className={css.ringLoose} />
        {hotItem && (
          <line x1={cx} y1={cy} x2={sx(hotItem.pos)[0]} y2={sx(hotItem.pos)[1]} stroke="var(--paper)" strokeWidth={1.4} strokeDasharray="4 3" />
        )}
        {pts.map(({ i, xy }) => {
          const body = (
            <>
              <Mark fam={i.fam} r={i.key === hot ? 7.5 : 5.5} hollow={i.hollow || i.struck} />
              {i.struck && <line x1={-7} y1={7} x2={7} y2={-7} stroke={famColor(i.fam)} strokeWidth={1.6} />}
              <title>{i.detail}</title>
            </>
          )
          const common = {
            className: css.dot,
            style: { transform: `translate(${xy[0]}px, ${xy[1]}px)` },
            onMouseEnter: () => setHot(i.key),
            onMouseLeave: () => setHot(h => (h === i.key ? null : h)),
            onFocus: () => setHot(i.key),
            onBlur: () => setHot(h => (h === i.key ? null : h)),
          }
          return onPick ? (
            <g
              key={i.key}
              {...common}
              role="button"
              // Kept out of the tab order: the page offers a list or a picker for the same choice.
              tabIndex={-1}
              aria-label={i.aria}
              onClick={() => pick(i.key)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  pick(i.key)
                }
              }}
            >
              {body}
            </g>
          ) : (
            <a key={i.key} href={i.href} aria-label={i.aria} tabIndex={-1} {...common}>
              {body}
            </a>
          )
        })}
        <g style={{ transform: `translate(${cx}px, ${cy}px)` }} aria-hidden>
          <circle r={11} fill="none" stroke={centerColor} strokeWidth={2} />
          <circle r={5} fill={centerColor} />
        </g>
        {labels.map(l => (
          <text key={l.key} x={l.x} y={l.y} className={l.key === '__c' ? css.labelCenter : css.label} style={l.key === '__c' ? { fill: centerColor } : undefined} aria-hidden>
            {l.text}
          </text>
        ))}
      </svg>
      <p className={`small ${css.hotLine}`} aria-live="polite">
        {hotItem ? hotItem.detail : ' '}
      </p>
    </div>
  )
}

/** Match labels for lists of nearest ideologies ("none" reads oddly in a list). */
export const SHORT_LABEL = { ...MATCH_LABEL, none: 'Outside the loose cut' }

/** Ring key, as text: the fit cuts for this test length. */
export function RingKey({ cuts, mode }: { cuts: Cuts; mode?: string }) {
  return (
    <p className={`small muted ${css.ringKey}`}>
      <span>
        <i className={css.keyVeryClose} aria-hidden /> very close ≤ {cuts.veryClose.toFixed(3)}
      </span>
      <span>
        <i className={css.keyClose} aria-hidden /> close ≤ {cuts.close.toFixed(3)}
      </span>
      <span>
        <i className={css.keyLoose} aria-hidden /> loose ≤ {cuts.loose.toFixed(3)}
      </span>
      {mode && <span>({mode} test cuts)</span>}
    </p>
  )
}

/** Family key: shape and colour together, plus the ruled-out mark. */
export function FamilyKey({ ruledOut }: { ruledOut?: boolean }) {
  return (
    <p className={`small muted ${css.ringKey}`}>
      {FAMILIES.map(f => (
        <span key={f.id}>
          <Swatch fam={f.id} /> {f.name}
        </span>
      ))}
      {ruledOut && <span>hollow and struck through = ruled out</span>}
    </p>
  )
}
