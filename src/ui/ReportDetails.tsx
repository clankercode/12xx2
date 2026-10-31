import { useState } from 'react'
import { version } from '../../package.json'
import { CATALOGUE } from '../data/archetypes'
import { CALIBRATION } from '../data/calibration'
import { COMMITMENTS } from '../data/commitments'
import { RED_LINES } from '../data/redlines'
import { buildReport, formatReport } from '../engine/report'
import type { Own } from '../state/derive'
import type { Session } from '../state/session'
import css from './Results.module.css'

/** Clipboard permissions vary; the fallback stays in the same local document. */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    const previous = document.activeElement
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('aria-label', 'Diagnostic report to copy')
    field.style.cssText = 'position:fixed;left:-9999px;top:0'
    document.body.append(field)
    try {
      field.select()
      if (!document.execCommand('copy')) throw new Error('Clipboard unavailable')
    } finally {
      field.remove()
      if (previous instanceof HTMLElement) previous.focus()
    }
  }
}

/** Kept separate so other results-page features need only share one insertion point. */
export function ReportDetails({ own, session }: { own: Own; session: Session }) {
  const [focus, setFocus] = useState('')
  const [status, setStatus] = useState('')
  const [manual, setManual] = useState('')
  const copy = async () => {
    setStatus('')
    setManual('')
    const text = formatReport(buildReport({
      payload: own.payload,
      answers: session.answers,
      statements: [...own.items, ...RED_LINES.filter(line => session.answers[line.id])],
      catalogue: CATALOGUE,
      calibration: CALIBRATION,
      commitments: COMMITMENTS,
      appVersion: version,
      date: session.finishedAt ?? new Date().toISOString(),
      focus: focus ? [focus] : [],
    }))
    try {
      await copyText(text)
      setStatus('Copied')
    } catch {
      setStatus('Copy is unavailable in this browser. Select and copy the report below.')
      setManual(text)
    }
  }
  return (
    <section className={css.section}>
      <details>
        <summary>For feedback and debugging</summary>
        <p className="small muted">The report includes your answers. It stays on your device and only goes where you paste it.</p>
        <div className={css.actions}>
          <label htmlFor="report-focus" className="small">Also explain: </label>
          <select
            id="report-focus"
            value={focus}
            style={{ maxWidth: '100%', minWidth: 0, font: 'inherit', padding: '6px 8px', background: 'var(--ink)', color: 'var(--paper)', border: '1px solid var(--rule-major)', borderRadius: 'var(--radius-s)' }}
            onChange={e => { setFocus(e.target.value); setStatus(''); setManual('') }}
          >
            <option value="">Top matches only</option>
            {[...CATALOGUE].sort((a, b) => a.name.localeCompare(b.name)).map(a => <option key={a.slug} value={a.slug}>{a.name}</option>)}
          </select>
          <button type="button" className="btn btn-ghost" onClick={copy}>Copy full report</button>
          <span className="small" role="status">{status}</span>
        </div>
        {manual && <textarea aria-label="Full diagnostic report" readOnly value={manual} rows={8} style={{ width: '100%', marginTop: 12 }} onFocus={e => e.target.select()} />}
      </details>
    </section>
  )
}
