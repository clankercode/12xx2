import { useState } from 'react'
import { encodePayload, forSharing } from '../engine/payload'
import type { Own } from '../state/derive'
import { clearAllData } from '../state/session'
import { CHIP_LABELS } from '../data/chips'
import { CALIBRATION } from '../data/calibration'
import { AXES } from '../data/axes'
import { useStore } from './App'
import { ResultsView } from './ResultsView'
import { ShareSheet } from './ShareSheet'
import { label } from './answer'
import { go } from './router'
import css from './Results.module.css'

export function ResultsPage({ own }: { own: Own }) {
  const { s, dispatch } = useStore()
  const [showShare, setShowShare] = useState(false)
  const r = own.results
  const mine = encodePayload(forSharing(own.payload, { q: false, sc: false, country: false }))

  const exportJson = () => {
    const data = {
      tool: '12 Axes²',
      exported: 'answers stay on your device unless you choose to send this file',
      mode: s.mode,
      answers: s.answers,
      systemConfidence: s.sc,
      statusQuo: s.q,
      country: s.country,
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = '12axes2-answers.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const extras = (
    <>
      {own.reasons.length > 0 && (
        <section className={css.section}>
          <h2>Your reasons</h2>
          <p className="muted small">What you said when your two answers differed a lot.</p>
          <div className={css.reasons}>
            {own.reasons.map(x => (
              <div key={x.chip} className={css.reason}>
                <span>{CHIP_LABELS[x.chip]}</span>
                <span className={css.reasonBar} style={{ width: `${(100 * x.count) / own.reasons[0]!.count}%` }} />
                <span className="muted">{x.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {r.payload.sc && r.payload.rg !== null && <ScMap sc={r.payload.sc.score} scSe={r.payload.sc.se} rg={r.payload.rg} />}

      {own.splits.length > 0 && (
        <section className={css.section}>
          <h2>Your biggest splits</h2>
          <p className="muted small">The statements where your two answers differ most. Only you can see these; they are never in a shared link.</p>
          <ol className={css.splits}>
            {own.splits.map(x => (
              <li key={x.item.id}>
                <p>{x.item.text}</p>
                <p className="small">
                  <span className="ideal">{label(x.i as never)}</span> in your ideal · <span className="now">{label(x.n as never)}</span> here and now
                  <span className="muted"> · {AXES[x.item.axis].title}</span>
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className={css.section}>
        <details>
          <summary>
            <strong>Answer patterns and coverage</strong>
          </summary>
          <div className={css.diag} style={{ marginTop: 12 }}>
            <p className="small">
              Passed {own.diagnostics.passed} of {own.diagnostics.frames} single answers.
            </p>
            <p className="small">
              Same answer in both frames on {own.diagnostics.paired ? Math.round((100 * own.diagnostics.diagonal) / own.diagnostics.paired) : 0}% of
              statements.
            </p>
            <p className="small">Strongest options used {Math.round((100 * own.diagnostics.extreme) / Math.max(1, own.diagnostics.frames))}% of the time.</p>
            <p className="small">Neutral used {Math.round((100 * own.diagnostics.midpoint) / Math.max(1, own.diagnostics.frames))}% of the time.</p>
          </div>
          {own.diagnostics.paired > 0 && own.diagnostics.diagonal / own.diagnostics.paired > 0.9 && (
            <p className="small muted">
              You answered the same in both frames almost everywhere: either you see your country as close to your ideal, or the
              second frame went unused.
            </p>
          )}
        </details>
      </section>

      <section className={css.section}>
        <h2>Share, compare, keep</h2>
        <div className={css.actions}>
          <button type="button" className="btn btn-primary" onClick={() => setShowShare(v => !v)}>
            {showShare ? 'Hide share options' : 'Share my result'}
          </button>
          {s.incoming && (
            <a className="btn" href={`#c=${mine}~${s.incoming}`}>
              Compare with the person who shared their link
            </a>
          )}
          <button type="button" className="btn" onClick={exportJson}>
            Export my answers (JSON)
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              dispatch({ type: 'reset' })
              go('#/')
            }}
          >
            Retake
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              clearAllData()
              dispatch({ type: 'reset' })
              go('#/')
            }}
          >
            Clear my data
          </button>
        </div>
        {showShare && (
          <div style={{ marginTop: 20 }}>
            <ShareSheet payload={own.payload} />
          </div>
        )}
      </section>
    </>
  )

  return <ResultsView r={r} extras={extras} />
}

/** System confidence × Reality Gap: a descriptive map with positional labels (spec §4.6). */
function ScMap({ sc, scSe, rg }: { sc: number; scSe: number; rg: number }) {
  const cut = CALIBRATION.rgCuts[1]
  const maxY = Math.max(60, rg + 10)
  const W = 400
  const H = 260
  const x = (v: number) => 40 + (v / 100) * (W - 60)
  const y = (v: number) => H - 30 - (v / maxY) * (H - 50)
  const borderline = Math.abs(sc - 50) <= scSe
  return (
    <section className={css.section}>
      <h2>Confidence and gap</h2>
      <p className="muted small">
        Where your system confidence and your Reality Gap put you. Labels describe position only.
        {borderline && ' Your confidence score is within its error of the midline.'}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className={css.map} role="img" aria-label={`System confidence ${sc}, Reality Gap ${rg}`}>
        <rect x={40} y={20} width={W - 60} height={H - 50} fill="none" stroke="var(--rule-major)" />
        <line x1={x(50)} x2={x(50)} y1={20} y2={H - 30} stroke="var(--muted)" strokeDasharray="4 4" />
        <line x1={40} x2={W - 20} y1={y(cut)} y2={y(cut)} stroke="var(--muted)" strokeDasharray="4 4" />
        <text x={x(25)} y={34} fill="var(--muted)" fontSize="11" textAnchor="middle">Low confidence · large gap</text>
        <text x={x(75)} y={34} fill="var(--muted)" fontSize="11" textAnchor="middle">High confidence · large gap</text>
        <text x={x(25)} y={H - 38} fill="var(--muted)" fontSize="11" textAnchor="middle">Low confidence · small gap</text>
        <text x={x(75)} y={H - 38} fill="var(--muted)" fontSize="11" textAnchor="middle">High confidence · small gap</text>
        <line x1={x(Math.max(0, sc - scSe))} x2={x(Math.min(100, sc + scSe))} y1={y(rg)} y2={y(rg)} stroke="var(--paper)" strokeWidth={2} opacity={0.5} />
        <circle cx={x(sc)} cy={y(rg)} r={7} fill="var(--paper)" />
        <text x={40} y={H - 10} fill="var(--muted)" fontSize="11">System confidence →</text>
        <text x={14} y={H / 2} fill="var(--muted)" fontSize="11" transform={`rotate(-90 14 ${H / 2})`} textAnchor="middle">Reality Gap →</text>
      </svg>
    </section>
  )
}
