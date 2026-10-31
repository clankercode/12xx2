import { useMemo, useState } from 'react'
import { coverageOk, labelFor, type Archetype } from '../../engine/match'
import { fits, isFlat, type Results } from '../../engine/results'
import { egoPosition, placeOutOfSample, respondentRadii } from '../../engine/mapGeo'
import { CALIBRATION } from '../../data/calibration'
import { ruledOutSlugs } from '../../data/commitments'
import { MAP } from '../../data/map'
import { MATCH_LABEL, MODE_NAME } from '../copy'
import { EgoChart, FamilyKey, RingKey, SHORT_LABEL, type EgoItem } from './EgoChart'
import { Swatch, family } from './marks'
import css from './Map.module.css'


/**
 * Results panel: every ideology at its true quiz distance from the respondent (each ideology's own
 * weights, as the match list uses), in the direction the 2D map puts it. `catalogue` is the one the
 * results were derived with: the full catalogue for the owner, catalogueFor(payload) when shared.
 */
export default function ExactPanel({ r, catalogue, who }: { r: Results; catalogue: readonly Archetype[]; who: 'You' | 'They' }) {
  const p = r.payload
  const [frame, setFrame] = useState<'I' | 'N'>('I')
  const nowOk = coverageOk(p.N) && !isFlat(p.N)
  const f = frame === 'N' && nowOk ? 'N' : 'I'
  const u = f === 'I' ? p.I : p.N
  const cuts = CALIBRATION.labels[p.mode]
  const out = useMemo(() => ruledOutSlugs(p), [p])

  const model = useMemo(() => {
    const coords = MAP.layouts['ideal-2'].coords
    const shown = catalogue.flatMap(a => {
      const k = MAP.slugs.indexOf(a.slug)
      return k < 0 ? [] : [{ a, y: [coords[k]![0]!, coords[k]![1]!] as const }]
    })
    const radii = respondentRadii(u, shown.map(s => s.a))
    const at = placeOutOfSample(radii, shown.map(s => s.y)).x as unknown as readonly [number, number]
    return shown.map((s, k) => ({ a: s.a, d: radii[k]!, pos: egoPosition(at, s.y, radii[k]!) }))
  }, [catalogue, u])

  if (r.hero.kind === 'unreliable' || r.hero.kind === 'insufficient' || isFlat(p.I)) return null

  const ranked = [...model].sort((x, y) => x.d - y.d || x.a.slug.localeCompare(y.a.slug))
  const top = ranked.slice(0, 5)
  const topSet = new Set(top.map(t => t.a.slug))
  const verdict = (a: Archetype, d: number) => {
    const label = labelFor(d, cuts)
    const ruledOut = out.has(a.slug)
    const fit = fits({ arch: a, d, label, ruledOut, why: { near: [], far: null } })
    return { label, ruledOut, fit, text: ruledOut ? 'Ruled out' : fit ? `Fits · ${MATCH_LABEL[label]}` : SHORT_LABEL[label] }
  }
  const items: EgoItem[] = model.map(m => {
    const v = verdict(m.a, m.d)
    const detail = `${m.a.name} (${family(m.a.family).name}): ${m.d.toFixed(3)}, ${v.text.toLowerCase()}`
    return {
      key: m.a.slug,
      fam: m.a.family,
      name: m.a.name,
      r: m.d,
      pos: m.pos,
      struck: v.ruledOut,
      href: `#/ideologies/${m.a.slug}`,
      aria: detail,
      detail,
      label: topSet.has(m.a.slug) ? m.a.name : undefined,
    }
  })
  const whose = who === 'You' ? 'your' : 'their'

  return (
    <section className={css.panelSection} aria-labelledby="exact-h">
      <h2 id="exact-h">Exact from here</h2>
      <p className="muted small">
        Every ideology at its true distance from {who === 'You' ? 'you' : 'this result'}: the same distance the match list uses, with each
        ideology’s own weights. The direction comes from the 2D map, so only distances to the centre are exact: exact from the centre,
        approximate everywhere else.
      </p>
      <div className={css.toolbar}>
        <div className={css.seg} role="group" aria-label="Which answers">
          <button type="button" aria-pressed={f === 'I'} onClick={() => setFrame('I')}>
            <span className="glyph-ideal" aria-hidden /> Ideal
          </button>
          <button type="button" aria-pressed={f === 'N'} onClick={() => setFrame('N')} disabled={!nowOk}>
            <span className="glyph-now" aria-hidden /> Here and now
          </button>
        </div>
        {!nowOk && <span className="small muted">Not enough here-and-now answers to place.</span>}
      </div>
      <div className={css.exactGrid}>
        <div>
          <EgoChart
            items={items}
            center={{ label: who === 'You' ? `You (${f === 'I' ? 'ideal' : 'here and now'})` : f === 'I' ? 'Ideal' : 'Here and now', tone: f === 'I' ? 'ideal' : 'now' }}
            cuts={cuts}
            ariaLabel={`Ideologies by true distance from ${whose} ${f === 'I' ? 'ideal' : 'here-and-now'} answers. Each dot links to the ideology.`}
          />
          <RingKey cuts={cuts} mode={MODE_NAME[p.mode]} />
          <FamilyKey ruledOut={out.size > 0} />
        </div>
        <div>
          <h3 className={css.listTitle}>Nearest five{f === 'N' ? ' (here-and-now answers vs each ideal)' : ''}</h3>
          <ol className={css.nearList}>
            {top.map(t => {
              const v = verdict(t.a, t.d)
              return (
                <li key={t.a.slug} data-ruled-out={v.ruledOut || undefined}>
                  <Swatch fam={t.a.family} hollow={v.ruledOut} />
                  <a href={`#/ideologies/${t.a.slug}`} className={v.ruledOut ? css.struck : undefined}>
                    {t.a.name}
                  </a>
                  <span className={css.num}>{t.d.toFixed(3)}</span>
                  <span className={`small ${v.ruledOut ? css.tagOut : v.fit ? css.tagFit : 'muted'}`}>
                    {v.ruledOut ? '✘ ' : v.fit ? '✔ ' : ''}
                    {v.text}
                  </span>
                </li>
              )
            })}
          </ol>
          {top.some(t => out.has(t.a.slug)) && (
            <p className="small muted">Ruled out: {who === 'You' ? 'you contradict' : 'these answers contradict'} a core or red-line commitment, so it is drawn hollow and struck through, never a match.</p>
          )}
          <p className="small">
            <a href="#/map">See the whole map →</a>
          </p>
        </div>
      </div>
    </section>
  )
}
