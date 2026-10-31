import { useEffect, useMemo, useRef, useState } from 'react'
import { encodePayload, forSharing, type Payload } from '../engine/payload'
import { deriveResults, nameable, sameInBothFrames, type HeroPick, type Results } from '../engine/results'
import { CATALOGUE } from '../data/archetypes'
import { ruledOutSlugs } from '../data/commitments'
import { deriveShared } from '../state/shared'
import { CALIBRATION } from '../data/calibration'
import { countryName } from '../data/countries'
import { AXES } from '../data/axes'
import { cardBlob, drawCard, ensureFonts, headline, type CardSize } from '../share/card'
import css from './Share.module.css'

const base = () => `${location.origin}${import.meta.env.BASE_URL}`

/** "Link with preview" goes to a static stub page whose path names the headline (spec §6.6). */
export function previewPath(r: Results): string | null {
  const h = r.hero
  const ok = (p: HeroPick) => nameable(p) && !p.match.arch.sensitive
  if (h.kind === 'split' && ok(h.ideal) && ok(h.now)) return `p/${h.ideal.match.arch.slug}/${h.now.match.arch.slug}/`
  // The one-ideology stub says "in theory and here and now", so only when both frames agree.
  if (h.kind === 'constant' && ok(h.ideal) && sameInBothFrames(h)) return `p/${h.ideal.match.arch.slug}/`
  return null
}

function heroIsSensitive(r: Results): boolean {
  const h = r.hero
  if (h.kind !== 'split' && h.kind !== 'constant') return false
  return h.ideal.match.arch.sensitive || (h.kind === 'split' && h.now.match.arch.sensitive)
}

export function shareText(r: Results): string {
  const h = r.hero
  if (h.kind === 'split')
    return `In theory I’m closest to ${h.ideal.match.arch.name}. Here and now, ${nameable(h.now) ? h.now.match.arch.name : 'no listed ideology is close'}. What’s your gap?`
  if (h.kind === 'constant' && h.nowMissing) return `In theory I’m closest to ${h.ideal.match.arch.name}. What’s your gap?`
  if (h.kind === 'constant' && h.leaning && !sameInBothFrames(h))
    return `In theory I’m closest to ${h.ideal.match.arch.name}. Here and now I lean toward ${h.leaning.match.arch.name}, but not by enough to call it a split${r.payload.rg !== null ? ` (Reality Gap ${r.payload.rg})` : ''}. What’s yours?`
  if (h.kind === 'constant')
    return `In theory and here and now, I’m closest to ${h.ideal.match.arch.name}${r.payload.rg !== null ? ` (Reality Gap ${r.payload.rg})` : ''}. What’s yours?`
  if (h.kind === 'no-close')
    return h.nearest.match.label === 'none'
      ? `No listed ideology is a close match for my politics; the nearest, ${h.nearest.match.arch.name}, isn’t close. What’s your gap?`
      : `My answers can’t single out one ideology: ${h.nearest.match.arch.name} is nearest, but others are about as close. What’s your gap?`
  return 'I answered every political question twice: for my ideal system and for here and now. What’s your gap?'
}

const pos = (v: number) => (v === 0 ? 'centre' : `${Math.abs(Math.round(v))} toward ${v < 0 ? 'left' : 'right'}`)

/** Plain-text result: card alt text, and "Copy as text" for chats that drop images. */
export function resultText(r: Results): string {
  const lines = [shareText(r).replace(/ What’s (your gap|yours)\?$/, '')]
  if (r.payload.rg !== null) lines.push(`Reality Gap ${r.payload.rg} (0 = same answers in both frames; random clicking ≈ 38).`)
  const gaps = r.rows
    .filter(x => x.notable && x.I !== null && x.N !== null)
    .sort((a, b) => Math.abs(b.G ?? 0) - Math.abs(a.G ?? 0))
    .slice(0, 3)
  for (const g of gaps) {
    const a = AXES[g.axis]
    lines.push(`${a.title} (${a.neg} ↔ ${a.pos}): ideal ${pos(g.I!)}, here and now ${pos(g.N!)}.`.replace(/left/g, a.neg).replace(/right/g, a.pos))
  }
  return lines.join('\n')
}

export function ShareSheet({ payload }: { payload: Payload }) {
  const [inc, setInc] = useState({ sc: false, country: false, q: false, red: false })
  const [minimal, setMinimal] = useState(false)
  const [size, setSize] = useState<CardSize>('post')
  const [allowSensitive, setAllowSensitive] = useState(false)
  const [kind, setKind] = useState<'preview' | 'private'>('private')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const canvas = useRef<HTMLCanvasElement | null>(null)

  const shared = useMemo(() => forSharing(payload, { ...inc, sensitive: allowSensitive }), [payload, inc, allowSensitive])
  // Everything shared (card, text, link view) names a sensitive ideology only after the opt-in.
  const r = useMemo(() => deriveShared(shared), [shared])
  const rFull = useMemo(() => deriveResults(payload, CATALOGUE, CALIBRATION, ruledOutSlugs(payload)), [payload])
  const enc = useMemo(() => encodePayload(shared), [shared])
  const pPath = previewPath(r)
  const link = `${base()}${kind === 'preview' && pPath ? pPath : ''}#r=${enc}`
  const text = shareText(r)
  const hasSensitive = heroIsSensitive(rFull)

  // Pre-render the card so the share tap can call navigator.share synchronously (iOS activation rule).
  useEffect(() => {
    let alive = true
    setBlob(null)
    ;(async () => {
      await ensureFonts()
      if (!canvas.current) canvas.current = document.createElement('canvas')
      drawCard(canvas.current, r, {
        size,
        minimal,
        showSc: inc.sc,
        showCountry: inc.country,
        allowSensitive,
        host: location.host || '12 Axes²',
        countryLabel: shared.country ? countryName(shared.country) : undefined,
      })
      const b = await cardBlob(canvas.current)
      if (alive) setBlob(b)
    })().catch(() => setStatus('Could not draw the card in this browser.'))
    return () => {
      alive = false
    }
  }, [r, size, minimal, inc, allowSensitive, shared.country])

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

  const file = blob ? new File([blob], `12axes2-${size}.png`, { type: 'image/png' }) : null
  const canShareFile = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })

  const download = () => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `12axes2-${size}.png`
    a.click()
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setStatus('Link copied.')
    } catch {
      setStatus('Copy failed — select the link above and copy it manually.')
    }
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(`${resultText(r)}\n${link}`)
      setStatus('Result copied as text.')
    } catch {
      setStatus('Copy failed in this browser.')
    }
  }

  const share = () => {
    if (file && canShareFile) {
      navigator.share({ files: [file], text: `${text} ${link}` }).catch(() => {})
    } else if (typeof navigator.share === 'function') {
      navigator.share({ text, url: link }).catch(() => {})
    } else download()
  }

  const enc2 = encodeURIComponent
  const intents = [
    { name: 'X', href: `https://x.com/intent/post?text=${enc2(`${text} ${link}`)}` },
    { name: 'Bluesky', href: `https://bsky.app/intent/compose?text=${enc2(`${text} ${link}`)}` },
    { name: 'Reddit', href: `https://www.reddit.com/submit?url=${enc2(link)}&title=${enc2(text)}` },
    { name: 'WhatsApp', href: `https://wa.me/?text=${enc2(`${text} ${link}`)}` },
  ]

  return (
    <section className={css.sheet} aria-label="Share your result">
      <div className={css.preview}>
        {url ? <img src={url} alt={`Share card. ${resultText(r)}`} /> : <div className={css.placeholder}>Drawing card…</div>}
      </div>
      <div className={css.controls}>
        <fieldset className={css.fs}>
          <legend>Card</legend>
          {/* Real radios (visually hidden) so arrow keys move between sizes natively. */}
          <div className={css.seg} role="radiogroup" aria-label="Card size">
            {(
              [
                ['post', 'Post 4:5'],
                ['story', 'Story 9:16'],
                ['wide', 'Wide'],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className={size === k ? css.segOn : ''}>
                <input type="radio" name="card-size" value={k} checked={size === k} onChange={() => setSize(k)} className="visually-hidden" />
                {l}
              </label>
            ))}
          </div>
          <label className={css.check}>
            <input type="checkbox" checked={minimal} onChange={e => setMinimal(e.target.checked)} /> Minimal (no numbers)
          </label>
          {hasSensitive && (
            <label className={css.check}>
              <input type="checkbox" checked={allowSensitive} onChange={e => setAllowSensitive(e.target.checked)} /> Show my headline ideology
              on the card
            </label>
          )}
        </fieldset>
        <fieldset className={css.fs}>
          <legend>Include (off by default)</legend>
          {payload.sc && (
            <label className={css.check}>
              <input type="checkbox" checked={inc.sc} onChange={e => setInc({ ...inc, sc: e.target.checked })} /> System confidence
            </label>
          )}
          {payload.country && (
            <label className={css.check}>
              <input type="checkbox" checked={inc.country} onChange={e => setInc({ ...inc, country: e.target.checked })} /> Country (
              {countryName(payload.country)})
            </label>
          )}
          {payload.q && (
            <label className={css.check}>
              <input type="checkbox" checked={inc.q} onChange={e => setInc({ ...inc, q: e.target.checked })} /> Where I placed my country
            </label>
          )}
          {payload.red && (
            <label className={css.check}>
              <input type="checkbox" checked={inc.red} onChange={e => setInc({ ...inc, red: e.target.checked })} /> Include where I stand on
              the red-line statements (reveals those answers)
            </label>
          )}
          {inc.country && (inc.sc || inc.q) && (
            <p className={css.warn}>Country together with your view of its system can say more about you than you intend. Share with care.</p>
          )}
          {!payload.sc && !payload.country && !payload.q && !payload.red && <p className="small muted">Nothing optional to include.</p>}
        </fieldset>
        <fieldset className={css.fs}>
          <legend>Link</legend>
          <label className={css.check}>
            <input type="radio" name="kind" checked={kind === 'private'} onChange={() => setKind('private')} /> Link without preview
          </label>
          <label className={css.check}>
            <input type="radio" name="kind" checked={kind === 'preview'} disabled={!pPath} onChange={() => setKind('preview')} /> Link with
            preview {pPath ? '' : '(not available for this result)'}
          </label>
          <input className={css.link} readOnly value={link} onFocus={e => e.target.select()} aria-label="Your result link" />
          <p className="small muted">
            Anyone who gets this link — and any site it’s posted on — can read the scores in it
            {inc.red ? ', and where you stand on each red-line statement.' : ' (not your answers).'}
            {kind === 'preview' && ' A preview link also shows your headline ideology in the address, which the web host can see.'}
          </p>
        </fieldset>
        <div className={css.buttons}>
          <button type="button" className="btn btn-primary" onClick={share} disabled={!blob}>
            Share image
          </button>
          <button type="button" className="btn" onClick={download} disabled={!url}>
            Download PNG
          </button>
          <button type="button" className="btn" onClick={copy}>
            Copy link
          </button>
          <button type="button" className="btn" onClick={copyText}>
            Copy as text
          </button>
        </div>
        <div className={css.intents}>
          {intents.map(i => (
            <a key={i.name} href={i.href} target="_blank" rel="noopener noreferrer">
              Post to {i.name}
            </a>
          ))}
        </div>
        <p className="small" role="status">
          {status}
        </p>
      </div>
    </section>
  )
}
