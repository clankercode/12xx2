import { useEffect, useMemo, useRef, useState } from 'react'
import type { AxisId } from '../engine/types'
import { decodeShared } from '../state/shared'
import { deriveResults, type Results } from '../engine/results'
import { compareResults, sameScores, type CompareSummary, type Comparison } from '../engine/compare'
import { catalogueFor } from '../data/archetypes'
import { CALIBRATION } from '../data/calibration'
import { AXES } from '../data/axes'
import { cardBlob, ensureFonts, type CardSize } from '../share/card'
import { NOT_COMPARABLE, clearCount, drawCompareCard } from '../share/compareCard'
import { useStore } from './App'
import { AxisChart } from './AxisChart'
import { DECODE_MESSAGE } from './SharedPage'
import { MATCH_LABEL, heroName } from './copy'
import css from './Results.module.css'
import share from './Share.module.css'

const NAME_MAX = 16

/** The card speaks as "we"; the page speaks to the reader about the two people. */
const PAGE_SUMMARY: Record<CompareSummary, string> = {
  'ideals-differ-more': 'These two disagree more about ideals than about what to do here and now.',
  'practice-differs-more': 'These two share more of their ideals than of their here-and-now politics.',
  even: 'These two disagree about as much in theory as here and now.',
  none: 'No axis clearly differs, in theory or here and now.',
}

export function ComparePage({ mine, theirs }: { mine: string; theirs: string }) {
  const { own } = useStore()
  const da = useMemo(() => decodeShared(mine), [mine])
  const db = useMemo(() => decodeShared(theirs), [theirs])
  if (!da.ok || !db.ok) {
    return (
      <div className="narrow" style={{ padding: '48px 0' }}>
        <h1>Can’t compare these results</h1>
        <p>{DECODE_MESSAGE[!da.ok ? da.error : (db as { ok: false; error: keyof typeof DECODE_MESSAGE }).error]}</p>
      </div>
    )
  }
  // A compare link can be forwarded, so work out who "you" is from the scores, and put you first.
  const swap = !!own && !sameScores(own.payload, da.payload) && sameScores(own.payload, db.payload)
  const viewerIn = !!own && (swap || sameScores(own.payload, da.payload))
  const [pa, pb] = swap ? [db.payload, da.payload] : [da.payload, db.payload]
  const [ea, eb] = swap ? [theirs, mine] : [mine, theirs]
  const labels: [string, string] = viewerIn ? ['You', 'Them'] : ['First person', 'Second person']
  const ra = deriveResults(pa, catalogueFor(pa), CALIBRATION)
  const rb = deriveResults(pb, catalogueFor(pb), CALIBRATION)
  const cmp = compareResults(pa, pb)
  const ax = (id: AxisId | null) => (id ? AXES[id].title.toLowerCase() : '')

  return (
    <div className={`wrap ${css.results}`}>
      <section className={css.hero}>
        <p className="small muted">Comparing two results. Each link contains scores only, never answers.</p>
        <div className={css.pair}>
          {([
            [labels[0], ra],
            [labels[1], rb],
          ] as const).map(([label, r], k) => (
            <div key={k} className={css.half}>
              <p className={css.heroKicker}>{label}</p>
              <h1 className={css.heroTitle} style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)' }}>
                {heroName(r)}
              </h1>
              {r.matchesIdeal[0] && <p className="small muted">{MATCH_LABEL[r.matchesIdeal[0].label]}</p>}
            </div>
          ))}
        </div>
        {cmp.reliable ? (
          <>
            <div className={css.stats}>
              <div className={css.stat}>
                <span className={css.statLabel}>Ideal systems</span>
                <span className={css.statValue}>{clearCount(cmp.ideal)}</span>
                <span className="small muted">axes where you clearly differ</span>
              </div>
              <div className={css.stat}>
                <span className={css.statLabel}>Here and now</span>
                <span className={css.statValue}>{clearCount(cmp.now)}</span>
                <span className="small muted">axes where you clearly differ</span>
              </div>
            </div>
            {cmp.summary && <p>{PAGE_SUMMARY[cmp.summary]}</p>}
            {cmp.ideal.closest && cmp.ideal.furthest && (
              <p>
                In your ideal systems you’re closest on <strong>{ax(cmp.ideal.closest)}</strong> and furthest apart on{' '}
                <strong>{ax(cmp.ideal.furthest)}</strong>.
              </p>
            )}
            <p className="small muted">
              “Clearly differ” means the two scores are further apart than their combined measurement error allows (a 95% test per
              axis). Smaller differences may be real but can’t be told apart from noise.
            </p>
          </>
        ) : (
          <p>One of these results was flagged as careless answering, so no differences are claimed.</p>
        )}
        {cmp.sameCountry === false && <p className="small muted">{NOT_COMPARABLE}</p>}
      </section>
      <section className={css.section}>
        <h2>Side by side</h2>
        <p className="small muted">
          Filled markers are {labels[0].toLowerCase()}; hollow markers are {labels[1].toLowerCase()}. A solid line joins the two where they clearly differ.
        </p>
        <AxisChart
          rows={ra.rows}
          overlay={{
            label: labels[1],
            rows: rb.rows,
            clear: { I: cmp.ideal.axes.map(d => cmp.reliable && !!d?.clear), N: cmp.now.axes.map(d => cmp.reliable && !!d?.clear) },
          }}
        />
      </section>
      <section className={css.section}>
        <h2>Share this comparison</h2>
        <CompareShare a={ra} b={rb} cmp={cmp} link={`${location.origin}${import.meta.env.BASE_URL}#c=${ea}~${eb}`} viewerIn={viewerIn} />
      </section>
      <section className={css.section}>
        <a className="btn btn-primary" href="#/">
          {own ? 'Back to the start' : 'Take the test'}
        </a>
      </section>
    </div>
  )
}

function CompareShare({ a, b, cmp, link, viewerIn }: { a: Results; b: Results; cmp: Comparison; link: string; viewerIn: boolean }) {
  const [names, setNames] = useState<[string, string]>(viewerIn ? ['Me', 'Them'] : ['A', 'B'])
  const [size, setSize] = useState<CardSize>('post')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const shown: [string, string] = [names[0].trim() || 'A', names[1].trim() || 'B']

  useEffect(() => {
    let alive = true
    setBlob(null)
    ;(async () => {
      await ensureFonts()
      if (!canvas.current) canvas.current = document.createElement('canvas')
      drawCompareCard(canvas.current, a, b, cmp, { size, names: shown, host: location.host || '12 Axes²' })
      const out = await cardBlob(canvas.current)
      if (alive) setBlob(out)
    })().catch(() => setStatus('Could not draw the card in this browser.'))
    return () => {
      alive = false
    }
  }, [a, b, cmp, size, names])

  useEffect(() => {
    if (!blob) return
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => {
      // Clear first so Download can't fire with a revoked URL while the next card draws.
      setUrl(null)
      URL.revokeObjectURL(u)
    }
  }, [blob])

  const fileName = `12axes2-compare-${size}.png`
  const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null
  const canShareFile = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
  const text = 'We each answered every political question twice: for our ideal system and for here and now. How do you two compare?'

  const download = () => {
    if (!url) return
    const el = document.createElement('a')
    el.href = url
    el.download = fileName
    el.click()
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setStatus('Link copied.')
    } catch {
      setStatus('Copy failed — select the link above and copy it manually.')
    }
  }
  const doShare = () => {
    if (file && canShareFile) navigator.share({ files: [file], text: `${text} ${link}` }).catch(() => {})
    else if (typeof navigator.share === 'function') navigator.share({ text, url: link }).catch(() => {})
    else download()
  }
  const alt =
    `Comparison card. ${shown[0]}: ${heroName(a)}. ${shown[1]}: ${heroName(b)}. ` +
    (cmp.reliable ? `Clearly different on ${clearCount(cmp.ideal)} axes in theory and ${clearCount(cmp.now)} here and now.` : '')

  return (
    <div className={share.sheet} aria-label="Share this comparison">
      <div className={share.preview}>
        {url ? <img src={url} alt={alt} /> : <div className={share.placeholder}>Drawing card…</div>}
      </div>
      <div className={share.controls}>
        <fieldset className={share.fs}>
          <legend>Names on the card</legend>
          <div className={share.names}>
            {([0, 1] as const).map(k => (
              <label key={k}>
                <span className="small muted">{k === 0 ? 'Filled markers' : 'Hollow markers'}</span>
                <input
                  className={share.link}
                  value={names[k]}
                  maxLength={NAME_MAX}
                  onChange={e => setNames(k === 0 ? [e.target.value, names[1]] : [names[0], e.target.value])}
                />
              </label>
            ))}
          </div>
          <p className="small muted">Names are drawn on the image only. They are never put in a link.</p>
        </fieldset>
        <fieldset className={share.fs}>
          <legend>Card</legend>
          <div className={share.seg} role="radiogroup" aria-label="Card size">
            {(
              [
                ['post', 'Post 4:5'],
                ['story', 'Story 9:16'],
                ['wide', 'Wide'],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className={size === k ? share.segOn : ''}>
                <input type="radio" name="compare-card-size" value={k} checked={size === k} onChange={() => setSize(k)} className="visually-hidden" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className={share.fs}>
          <legend>Link</legend>
          <input className={share.link} readOnly value={link} onFocus={e => e.target.select()} aria-label="Comparison link" />
          <p className="small muted">This link holds both people’s scores (not answers). Share it only where you’re both happy for them to appear.</p>
        </fieldset>
        <div className={share.buttons}>
          <button type="button" className="btn btn-primary" onClick={doShare} disabled={!blob}>
            Share image
          </button>
          <button type="button" className="btn" onClick={download} disabled={!url}>
            Download PNG
          </button>
          <button type="button" className="btn" onClick={copy}>
            Copy link
          </button>
        </div>
        <p className="small" role="status">
          {status}
        </p>
      </div>
    </div>
  )
}
