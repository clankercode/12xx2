import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { AXIS_IDS, type AxisId } from '../engine/types'
import { AXES } from '../data/axes'
import { useStore } from './App'
import { go } from './router'
import css from './Steps.module.css'

/**
 * Optional status-quo placement (spec §2.5): each track already shows the user's
 * own ◆ Ideal and ● Now, and the user places where their country is now. No thumb
 * until touched: an untouched slider is "skipped", never 0.
 */
export function Place() {
  const { s, dispatch, own } = useStore()
  const finish = () => {
    dispatch({ type: 'stage', stage: 'done' })
    go('#/results')
  }
  return (
    <div className={`narrow ${css.step}`}>
      <p className="small muted">Last step · optional</p>
      <h2>Where is your country now?</h2>
      <p>
        Tap each line where you think your country sits today. Your answers are already marked:{' '}
        <span className="glyph-ideal" aria-hidden /> <span className="ideal">ideal</span> and <span className="glyph-now" aria-hidden />{' '}
        <span className="now">here and now</span>. This lets us describe each gap — partway toward your ideal, beyond it, or the
        opposite way.
      </p>
      <div className={css.tracks}>
        {AXIS_IDS.map((ax, k) => (
          <Track
            key={ax}
            axis={ax}
            I={own?.payload.I[k] ?? null}
            N={own?.payload.N[k] ?? null}
            q={s.q[ax] ?? null}
            onChange={v => dispatch({ type: 'q', axis: ax, value: v })}
          />
        ))}
      </div>
      <div className={css.actions}>
        <button type="button" className="btn btn-primary" onClick={finish}>
          See my results
        </button>
        <button type="button" className="btn btn-ghost" onClick={finish}>
          Skip this step
        </button>
      </div>
    </div>
  )
}

function Track({ axis, I, N, q, onChange }: { axis: AxisId; I: number | null; N: number | null; q: number | null; onChange: (v: number | null) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  /** Pointer gesture in progress: a tap or a horizontal drag sets the value; a vertical swipe scrolls the page. */
  const gesture = useRef<{ id: number; x: number; y: number; drag: boolean } | null>(null)
  const meta = AXES[axis]
  const set = (e: PointerEvent<HTMLDivElement>) => {
    const r = ref.current!.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    onChange(Math.round(x * 200 - 100))
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 20 : 5
    const cur = q ?? 0
    if (e.key === 'ArrowLeft') onChange(Math.max(-100, cur - step))
    else if (e.key === 'ArrowRight') onChange(Math.min(100, cur + step))
    else if (e.key === 'Delete' || e.key === 'Backspace') onChange(null)
    else return
    e.preventDefault()
  }
  const pct = (v: number) => `${(v + 100) / 2}%`
  return (
    <div className={css.track}>
      <div className={css.trackHead}>
        <span className={css.trackTitle}>{meta.title}</span>
        {q !== null ? (
          <button type="button" className={`btn btn-ghost ${css.clear}`} onClick={() => onChange(null)}>
            Clear
          </button>
        ) : (
          <span className={css.untouched}>Not placed · tap the line</span>
        )}
      </div>
      <div className={css.poles}>
        <span>{meta.neg}</span>
        <span>{meta.pos}</span>
      </div>
      <div
        ref={ref}
        className={css.rail}
        role="slider"
        tabIndex={0}
        aria-label={`${meta.title}: where your country is now, from ${meta.neg} to ${meta.pos}`}
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={q ?? undefined}
        aria-valuetext={q === null ? 'Not placed' : `${q} (${q < 0 ? meta.neg : meta.pos})`}
        onPointerDown={e => {
          if (e.button !== 0) return
          gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, drag: false }
        }}
        onPointerMove={e => {
          const g = gesture.current
          if (!g || g.id !== e.pointerId) return
          if (!g.drag) {
            const dx = Math.abs(e.clientX - g.x)
            if (dx < 8 || dx < Math.abs(e.clientY - g.y)) return
            g.drag = true
            ref.current!.setPointerCapture(e.pointerId)
          }
          set(e)
        }}
        onPointerUp={e => {
          const g = gesture.current
          gesture.current = null
          if (!g || g.id !== e.pointerId) return
          if (g.drag || Math.hypot(e.clientX - g.x, e.clientY - g.y) < 10) set(e)
        }}
        onPointerCancel={() => {
          gesture.current = null
        }}
        onKeyDown={onKey}
      >
        <span className={css.mid} />
        {I !== null && <span className={`${css.m} ${css.mI}`} style={{ left: pct(I) }} title="Your ideal" />}
        {N !== null && <span className={`${css.m} ${css.mN}`} style={{ left: pct(N) }} title="Your here and now" />}
        {q !== null && <span className={css.q} style={{ left: pct(q) }} />}
      </div>
    </div>
  )
}
