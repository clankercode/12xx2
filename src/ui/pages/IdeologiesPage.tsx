import { useEffect, useState } from 'react'
import { AXIS_IDS } from '../../engine/types'
import { AXES } from '../../data/axes'
import { CATALOGUE } from '../../data/archetypes'
import { COMMITMENTS, HAS_COMMITMENTS, HAS_RED_COMMITMENTS } from '../../data/commitments'
import { ALL_ITEMS } from '../../data/items'
import { RED_LINES } from '../../data/redlines'
import { isRedCommitment, type Commitment } from '../../engine/commitments'
import css from './Prose.module.css'

const FAMILY: Record<string, string> = {
  socialist: 'Socialist',
  'left-liberal': 'Social-democratic & left-liberal',
  'liberal-centrist': 'Liberal & centrist',
  conservative: 'Conservative',
  religious: 'Religious',
  'nationalist-populist': 'Nationalist & populist',
  'libertarian-market': 'Libertarian & market',
  anarchist: 'Anarchist',
  hierarchical: 'Hierarchical & technocratic',
}

const pct = (v: number) => `${(v + 100) / 2}%`
const TEXT = new Map([...ALL_ITEMS.map(i => [i.id, i.text] as const), ...RED_LINES.map(r => [r.id, r.text] as const)])

function CommitmentList({ title, list }: { title: string; list: readonly Commitment[] }) {
  return (
    <div style={{ marginTop: 10 }}>
      <p className="small" style={{ margin: 0, fontWeight: 700 }}>
        {title}
      </p>
      {list.length ? (
        <ul className="small" style={{ marginTop: 4 }}>
          {list.map(c => (
            <li key={c.item}>
              <strong>{c.side === 1 ? 'Agree' : 'Disagree'}</strong>
              {c.frame === 'both' ? ' (ideal and here and now)' : ' (ideal)'}: “{TEXT.get(c.item)}”{' '}
              <span className="muted">{c.why}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small muted" style={{ marginTop: 4 }}>
          None listed.
        </p>
      )}
    </div>
  )
}

export function IdeologiesPage({ slug }: { slug?: string }) {
  const [fam, setFam] = useState<string | null>(null)
  // "#/ideologies/<slug>" (from the map and the match lists): show all, then bring that entry into view.
  useEffect(() => {
    if (!slug) return
    setFam(null)
    const id = requestAnimationFrame(() => document.getElementById(slug)?.scrollIntoView({ block: 'start' }))
    return () => cancelAnimationFrame(id)
  }, [slug])
  const families = [...new Set(CATALOGUE.map(a => a.family))]
  const list = CATALOGUE.filter(a => !fam || a.family === fam)
  return (
    <article className={`wrap ${css.prose}`}>
      <h1>Ideology catalogue</h1>
      <p className={css.lede}>
        Every ideology you can be matched to, with its profile on each axis. <span className="glyph-ideal" aria-hidden />{' '}
        <span className="ideal">Ideal</span> and <span className="glyph-now" aria-hidden /> <span className="now">here and now</span>{' '}
        (in a present-day liberal democracy). The shaded band shows how far the three coders disagreed.
        {HAS_COMMITMENTS && (
          <>
            {' '}
            Core commitments are positions that our coded profiles of the ideology’s mainstream share; answering decisively against
            one rules the ideology out (
            <a href="#/method">how</a>).{HAS_RED_COMMITMENTS && ' Red-line commitments do the same on the red-line statements.'}{' '}
            Commitments were judged by AI coders, not validated by adherents.
          </>
        )}
      </p>
      <div className={css.filter} role="group" aria-label="Filter by family">
        <button type="button" className={fam === null ? css.filterOn : ''} onClick={() => setFam(null)}>
          All ({CATALOGUE.length})
        </button>
        {families.map(f => (
          <button key={f} type="button" className={fam === f ? css.filterOn : ''} onClick={() => setFam(f)}>
            {FAMILY[f] ?? f}
          </button>
        ))}
      </div>
      {list.map(a => (
        <section key={a.slug} id={a.slug} className={css.card}>
          <h3>{a.name}</h3>
          <p className="small muted">
            {FAMILY[a.family] ?? a.family}
            {a.signature && a.signature !== 'constant' ? ` · ${a.signature}` : ''}
          </p>
          <p>{a.summary}</p>
          <div className={css.bars}>
            {AXIS_IDS.map((ax, k) => {
              const i = a.ideal[k]!
              const n = a.now[k]!
              const sp = a.spread[k] ?? 0
              // The coder band, clipped to the scale so it never runs past either end of the bar.
              const lo = Math.max(-100, i - sp / 2)
              const hi = Math.min(100, i + sp / 2)
              return (
                <div key={ax} style={{ display: 'contents' }}>
                  <span>
                    {AXES[ax].title}
                    {a.weight[k]! < 0.9 && <span className="muted"> (minor)</span>}
                  </span>
                  <div className={css.bar} title={`${AXES[ax].neg} ← → ${AXES[ax].pos}; ideal ${Math.round(i)}, here and now ${Math.round(n)}, coder spread ${Math.round(sp)}`}>
                    <span className={css.spread} style={{ left: pct(lo), width: `${(hi - lo) / 2}%`, translate: 'none' }} />
                    <span className="glyph-ideal" style={{ left: pct(i) }} />
                    <span className="glyph-now" style={{ left: pct(n), opacity: 0.85 }} />
                  </div>
                </div>
              )
            })}
          </div>
          {HAS_COMMITMENTS && <CommitmentList title="Core commitments" list={(COMMITMENTS[a.slug] ?? []).filter(c => !isRedCommitment(c))} />}
          {HAS_RED_COMMITMENTS && <CommitmentList title="Red-line commitments" list={(COMMITMENTS[a.slug] ?? []).filter(isRedCommitment)} />}
          {a.sources.length > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary className="small">Sources</summary>
              <ul className="small">
                {a.sources.map(s => (
                  <li key={s.title}>
                    {s.author}
                    {s.year ? ` (${s.year})` : ''}, <em>{s.title}</em>
                    {s.by_adherent ? '' : ' — secondary'}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      ))}
    </article>
  )
}
