import { useMemo } from 'react'
import { encodePayload, forSharing, type DecodeError } from '../engine/payload'
import { decodeShared, deriveShared } from '../state/shared'
import { CATALOGUE_VERSION } from '../data/archetypes'
import { useStore } from './App'
import { ResultsView } from './ResultsView'
import { previewPath } from './ShareSheet'
import { SharedRedLines } from './Commitments'
import css from './Results.module.css'

export const DECODE_MESSAGE: Record<DecodeError, string> = {
  empty: 'This link has no result in it.',
  truncated: 'This link looks cut off. Ask for the full link — it ends with a capital Z.',
  corrupt: 'This link is damaged or cut off and can’t be read. Ask for the full link again.',
  'newer-version': 'This link was made by a newer version of 12 Axes². Reload the page to update, then open it again.',
}

export function SharedPage({ encoded }: { encoded: string }) {
  const { s, own } = useStore()
  const decoded = useMemo(() => decodeShared(encoded), [encoded])
  if (!decoded.ok) {
    return (
      <div className="narrow" style={{ padding: '48px 0' }}>
        <h1>Can’t open this result</h1>
        <p>{DECODE_MESSAGE[decoded.error]}</p>
        <a className="btn btn-primary" href="#/">
          Take the test yourself
        </a>
      </div>
    )
  }
  const p = decoded.payload
  const r = deriveShared(p)
  // Preview stubs name the headline in the path; if it no longer matches, drop the misleading path.
  const stub = location.pathname.match(/\/(p\/.+)$/)?.[1]
  const mismatch = !!stub && stub !== previewPath(r)
  if (mismatch) history.replaceState(null, '', `${import.meta.env.BASE_URL}${location.hash}`)
  const mine = s.stage === 'done' && own ? encodePayload(forSharing(own.payload, { q: false, sc: false, country: false })) : null

  const banner = (
    <>
      <SharedRedLines p={p} />
    <section className={css.section} style={{ display: 'grid', gap: 10 }}>
      <p className="small muted">
        You’re looking at someone else’s result. It contains their scores only, not their answers.
        {p.catalogue !== CATALOGUE_VERSION && ' It was made with a different version of the ideology catalogue, so labels may differ from what they saw.'}
        {mismatch && ' The preview label in the link no longer matched this result, so it was removed.'}
      </p>
      <div className={css.actions}>
        {mine ? (
          <a className="btn btn-primary" href={`#c=${mine}~${encoded}`}>
            Compare with my result
          </a>
        ) : (
          <a className="btn btn-primary" href="#/">
            Take it yourself and compare
          </a>
        )}
      </div>
    </section>
    </>
  )
  return <ResultsView r={r} extras={banner} who="They" />
}
