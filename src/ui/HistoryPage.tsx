import { useMemo, useRef, useState } from 'react'
import type { Mode } from '../engine/types'
import { compareResults } from '../engine/compare'
import { deriveOwn, type Own } from '../state/derive'
import { exportFile, mergeRuns, parseImport, runToSession, sameMethod, type Run } from '../state/history'
import { ALL_ITEMS, itemsForMode } from '../data/items'
import { useStore } from './App'
import { AxisChart } from './AxisChart'
import { ResultsView } from './ResultsView'
import { ShareSheet } from './ShareSheet'
import { Confirm } from './Chrome'
import { clearCount } from '../share/compareCard'
import { heroName } from './copy'
import { label } from './answer'
import css from './Results.module.css'
import h from './History.module.css'

const MODE_NAME: Record<Mode, string> = { quick: 'Quick', standard: 'Standard', full: 'Full' }
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** Re-scores a stored run with the current method. */
function useScored(run: Run | undefined): Own | null {
  return useMemo(() => (run ? deriveOwn(runToSession(run)) : null), [run])
}

export function downloadExport(runs: readonly Run[]) {
  const data = exportFile(runs, new Date().toISOString())
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `12axes2-runs-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function HistoryPage() {
  const { runs, setRuns, s } = useStore()
  const [picked, setPicked] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const [confirm, setConfirm] = useState<'clear' | { del: string } | null>(null)
  const file = useRef<HTMLInputElement | null>(null)

  const onImport = async (f: File | undefined) => {
    if (!f) return
    if (f.size > 8_000_000) return setStatus('That file is too large to be a 12 Axes² export.')
    const res = parseImport(await f.text(), new Date().toISOString())
    if (!res.ok) return setStatus(res.error)
    const m = mergeRuns(runs, res.runs)
    const dropped = setRuns(m.runs)
    setStatus(
      `Imported ${m.added} run${m.added === 1 ? '' : 's'}${m.skipped ? `; ${m.skipped} already here` : ''}.` +
        (dropped ? ` Storage was full, so the ${dropped} oldest were dropped.` : ''),
    )
  }

  const toggle = (id: string) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p.slice(-1), id]))
  const [older, newer] = picked
    .map(id => runs.find(r => r.id === id))
    .filter((r): r is Run => !!r)
    .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt))

  return (
    <div className={`wrap ${css.results}`}>
      <section className={css.hero}>
        <h1>Your runs</h1>
        <p className="muted">
          Every time you reach your results, the run is kept here with all your answers, on this device only. Old runs are
          re-scored with the current method, so they stay comparable when the scoring improves.
          {!s.save && ' Saving is off for this session, so new runs aren’t being recorded.'}
        </p>
        <div className={css.actions}>
          <button type="button" className="btn" onClick={() => downloadExport(runs)} disabled={runs.length === 0}>
            Export all (JSON)
          </button>
          <button type="button" className="btn" onClick={() => file.current?.click()}>
            Import a file
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            tabIndex={-1}
            aria-hidden
            onChange={e => {
              void onImport(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          {runs.length > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setConfirm('clear')}>
              Delete all runs
            </button>
          )}
        </div>
        {confirm === 'clear' && (
          <Confirm
            confirmLabel="Delete all runs"
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              setRuns([])
              setPicked([])
              setConfirm(null)
              setStatus('All runs deleted from this device.')
            }}
          >
            Delete every saved run from this device? Export first if you want to keep them. This can’t be undone.
          </Confirm>
        )}
        <p className="small" role="status">
          {status}
        </p>
      </section>

      <section className={css.section}>
        {runs.length === 0 ? (
          <p>
            No runs yet. <a href="#/">Take the test</a>, or import a file you exported earlier.
          </p>
        ) : (
          <>
            <div className={h.compareBar}>
              <span className="small muted">
                {picked.length < 2 ? `Tick two runs to compare them (${picked.length} of 2).` : 'Two runs picked.'}
              </span>
              <a
                className={`btn btn-primary ${picked.length < 2 ? h.disabled : ''}`}
                aria-disabled={picked.length < 2}
                href={older && newer ? `#/runs/${older.id}~${newer.id}` : undefined}
              >
                Compare runs
              </a>
            </div>
            <ol className={h.list}>
              {runs.map(run => (
                <RunRow
                  key={run.id}
                  run={run}
                  picked={picked.includes(run.id)}
                  onPick={() => toggle(run.id)}
                  confirming={typeof confirm === 'object' && confirm?.del === run.id}
                  onDelete={() => setConfirm({ del: run.id })}
                  onCancel={() => setConfirm(null)}
                  onConfirm={() => {
                    setRuns(runs.filter(r => r.id !== run.id))
                    setPicked(p => p.filter(x => x !== run.id))
                    setConfirm(null)
                  }}
                />
              ))}
            </ol>
          </>
        )}
      </section>
    </div>
  )
}

function RunRow(props: { run: Run; picked: boolean; onPick: () => void; confirming: boolean; onDelete: () => void; onCancel: () => void; onConfirm: () => void }) {
  const { run } = props
  const own = useScored(run)
  const now = own ? heroName(own.results) : ''
  const changed = !!run.snapshot.headline && run.snapshot.headline !== now
  // Axis statements only: red lines are never part of the answered/total counts.
  const answered = itemsForMode(run.mode).filter(it => { const a = run.answers[it.id]; return !!a && (a.i !== null || a.n !== null) }).length
  return (
    <li className={`${h.item} ${props.picked ? h.itemOn : ''}`}>
      <label className={h.pick}>
        <input type="checkbox" checked={props.picked} onChange={props.onPick} aria-label={`Pick the run from ${when(run.finishedAt)}`} />
      </label>
      <div className={h.body}>
        <p className={h.meta}>
          {when(run.finishedAt)} · {MODE_NAME[run.mode]} · {answered} of {itemsForMode(run.mode).length} statements
          {run.imported && ' · imported'}
        </p>
        <p className={h.headline}>{now}</p>
        {changed && (
          <p className="small muted">
            {sameMethod(run.method) ? 'When you finished it said' : 'Before the method changed it said'}: {run.snapshot.headline}
          </p>
        )}
      </div>
      <div className={h.rowActions}>
        <a className="btn" href={`#/run/${run.id}`}>
          View
        </a>
        <button type="button" className="btn btn-ghost" onClick={props.onDelete}>
          Delete
        </button>
      </div>
      {props.confirming && (
        <div className={h.confirm}>
          <Confirm confirmLabel="Delete this run" onCancel={props.onCancel} onConfirm={props.onConfirm}>
            Delete the run from {when(run.finishedAt)}? This can’t be undone.
          </Confirm>
        </div>
      )}
    </li>
  )
}

function Missing() {
  return (
    <div className="narrow" style={{ padding: '48px 0' }}>
      <h1>That run isn’t on this device</h1>
      <p>It may have been deleted, or saved in another browser. Runs only live where they were taken or imported.</p>
      <a className="btn btn-primary" href="#/history">
        See your runs
      </a>
    </div>
  )
}

export function RunPage({ id }: { id: string }) {
  const { runs } = useStore()
  const run = runs.find(r => r.id === id)
  const own = useScored(run)
  const [share, setShare] = useState(false)
  if (!run || !own) return <Missing />
  const now = heroName(own.results)
  const banner = (
    <section className={css.section} style={{ display: 'grid', gap: 10 }}>
      <p className="small muted">
        A past run from {when(run.finishedAt)} ({MODE_NAME[run.mode]}), scored with the current method.
        {run.snapshot.headline && run.snapshot.headline !== now && ` When you finished, it said: ${run.snapshot.headline}.`}
      </p>
      <div className={css.actions}>
        <a className="btn" href="#/history">
          All runs
        </a>
        <button type="button" className="btn" aria-expanded={share} onClick={() => setShare(v => !v)}>
          {share ? 'Hide share options' : 'Share this result'}
        </button>
      </div>
      {share && <ShareSheet payload={own.payload} />}
    </section>
  )
  return <ResultsView r={own.results} extras={banner} checks={own.commitments} />
}

export function RunsComparePage({ a, b }: { a: string; b: string }) {
  const { runs } = useStore()
  const [all, setAll] = useState(false)
  const pair = [runs.find(r => r.id === a), runs.find(r => r.id === b)].filter((r): r is Run => !!r)
  pair.sort((x, y) => x.finishedAt.localeCompare(y.finishedAt))
  const [ra, rb] = pair
  const oa = useScored(ra)
  const ob = useScored(rb)
  if (!ra || !rb || !oa || !ob) return <Missing />
  const cmp = compareResults(ob.payload, oa.payload)

  // Statements both runs asked (modes are nested), where either answer moved.
  const shared = new Set(itemsForMode(ra.mode).map(it => it.id).filter(id => itemsForMode(rb.mode).some(it => it.id === id)))
  const moved = ALL_ITEMS.filter(it => shared.has(it.id))
    .map(it => {
      const x = ra.answers[it.id]
      const y = rb.answers[it.id]
      const d = (p: number | null | undefined, q: number | null | undefined) => (p === q ? 0 : p == null || q == null ? 1 : Math.abs(q - p))
      return { it, x, y, dI: d(x?.i, y?.i), dN: d(x?.n, y?.n) }
    })
    .filter(m => m.dI + m.dN > 0)
    .sort((p, q) => q.dI + q.dN - (p.dI + p.dN))
  const shown = all ? moved : moved.slice(0, 12)

  return (
    <div className={`wrap ${css.results}`}>
      <section className={css.hero}>
        <p className="small muted">Two of your runs, both scored with the current method.</p>
        <div className={css.pair}>
          {(
            [
              ['Earlier', ra, oa],
              ['Later', rb, ob],
            ] as const
          ).map(([k, run, own]) => (
            <div key={k} className={css.half}>
              <p className={css.heroKicker}>
                {k} · {when(run.finishedAt)}
              </p>
              <h1 className={css.heroTitle} style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)' }}>
                {heroName(own.results)}
              </h1>
              <p className="small muted">{MODE_NAME[run.mode]}</p>
            </div>
          ))}
        </div>
        {cmp.reliable ? (
          <div className={css.stats}>
            <div className={css.stat}>
              <span className={css.statLabel}>Ideal system</span>
              <span className={css.statValue}>{clearCount(cmp.ideal)}</span>
              <span className="small muted">axes that clearly moved</span>
            </div>
            <div className={css.stat}>
              <span className={css.statLabel}>Here and now</span>
              <span className={css.statValue}>{clearCount(cmp.now)}</span>
              <span className="small muted">axes that clearly moved</span>
            </div>
            <div className={css.stat}>
              <span className={css.statLabel}>Statements</span>
              <span className={css.statValue}>
                {moved.length} of {shared.size}
              </span>
              <span className="small muted">answered differently in at least one frame</span>
            </div>
          </div>
        ) : (
          <p>One of these runs was flagged as careless answering, so no axis changes are claimed.</p>
        )}
        <p className="small muted">
          “Clearly moved” uses the same test as comparing two people: the change is bigger than both runs’ measurement error
          allows. Answers wobble a little between takes even when views don’t change.
        </p>
      </section>
      <section className={css.section}>
        <h2>Axes, then and now</h2>
        <p className="small muted">Filled markers are the later run; hollow markers are the earlier one. A solid line marks a clear move.</p>
        <AxisChart
          rows={ob.results.rows}
          overlay={{
            label: 'Earlier run',
            rows: oa.results.rows,
            clear: { I: cmp.ideal.axes.map(d => cmp.reliable && !!d?.clear), N: cmp.now.axes.map(d => cmp.reliable && !!d?.clear) },
          }}
        />
      </section>
      <section className={css.section}>
        <h2>Statements you answered differently</h2>
        {moved.length === 0 ? (
          <p className="muted">Every shared statement got the same two answers both times.</p>
        ) : (
          <>
            <ul className={h.moves}>
              {shown.map(m => (
                <li key={m.it.id}>
                  <p className={h.statement}>{m.it.text}</p>
                  <p className="small">
                    {m.dI > 0 && (
                      <span className={h.move}>
                        <span className="ideal">Ideal</span> {label(m.x?.i ?? null)} → <strong>{label(m.y?.i ?? null)}</strong>
                      </span>
                    )}
                    {m.dN > 0 && (
                      <span className={h.move}>
                        <span className="now">Here and now</span> {label(m.x?.n ?? null)} → <strong>{label(m.y?.n ?? null)}</strong>
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
            {moved.length > shown.length && (
              <button type="button" className="btn btn-ghost" onClick={() => setAll(true)}>
                Show all {moved.length}
              </button>
            )}
          </>
        )}
      </section>
      <section className={css.section}>
        <a className="btn" href="#/history">
          All runs
        </a>
      </section>
    </div>
  )
}
