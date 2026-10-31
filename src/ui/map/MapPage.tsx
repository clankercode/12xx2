import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../App'
import { AXES } from '../../data/axes'
import { CALIBRATION } from '../../data/calibration'
import { ruledOutSlugs } from '../../data/commitments'
import { coverageOk, labelFor, type Vec } from '../../engine/match'
import { egoPosition } from '../../engine/mapGeo'
import type { Space } from '../../engine/mapLayout'
import { isFlat } from '../../engine/results'
import { AXIS_IDS, type AxisId, type Mode } from '../../engine/types'
import { MATCH_LABEL, MODE_NAME } from '../copy'
import { EgoChart, FamilyKey, RingKey, SHORT_LABEL, type EgoItem } from './EgoChart'
import { MapChart, type Sel } from './MapChart'
import { Matrix, mostAsymmetric } from './Matrix'
import { Shepard } from './Shepard'
import { FAMILIES, Swatch, family } from './marks'
import { ARCH, D, N, PTS, SPACE_IDS, dYou, dir, layout, mapScene, nameOf, neighbours, placeYou, sceneStats, sliceScene, type Scene } from './model'
import { reducedMotion } from './useWidth'
import css from './Map.module.css'
import page from './MapPage.module.css'

type Tab = '2d' | '3d' | 'ego' | 'explore'
const TABS: [Tab, string][] = [
  ['2d', '2D map'],
  ['3d', '3D map'],
  ['ego', 'Exact from here'],
  ['explore', 'Explore'],
]
const SPACE_NAME: Record<Space, string> = { ideal: 'Ideal', now: 'Here and now', joint: 'Both' }
const LOOSE_STD = CALIBRATION.labels.standard.loose

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, ReactNode, boolean?][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className={css.seg} role="group" aria-label={label}>
      {options.map(([v, l, disabled]) => (
        <button key={v} type="button" aria-pressed={value === v} disabled={disabled} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  )
}

/** The visitor's own finished result, if there is one usable for placing them. */
function useYou() {
  const { s, own } = useStore()
  return useMemo(() => {
    if (s.stage !== 'done' || !own) return null
    const r = own.results
    if (r.hero.kind === 'unreliable' || r.hero.kind === 'insufficient' || isFlat(own.payload.I)) return null
    const p = own.payload
    return {
      I: p.I as Vec,
      N: coverageOk(p.N) && !isFlat(p.N) ? (p.N as Vec) : null,
      mode: p.mode as Mode,
      out: ruledOutSlugs(p),
    }
  }, [s.stage, own])
}

export default function MapPage() {
  const you = useYou()
  const [tab, setTab] = useState<Tab>('2d')
  const [explore, setExplore] = useState<'matrix' | 'slice'>('matrix')
  const [space, setSpace] = useState<Space>('ideal')
  const [overlay, setOverlay] = useState<'none' | 'bands' | 'halo'>('none')
  const [sel, setSel] = useState<Sel>(null)
  const [hover, setHover] = useState<Sel>(null)
  const [pair, setPair] = useState<[number, number] | null>(null)
  const [focus, setFocus] = useState<Set<string>>(new Set())
  const [rot, setRot] = useState<[number, number]>([0.6, -0.35])
  const [ego, setEgo] = useState<number | 'youI' | 'youN'>(() => (you ? 'youI' : ARCH.findIndex(a => a.slug === 'centrism')))
  const [egoW, setEgoW] = useState<'theirs' | 'own'>('theirs')
  const [mmode, setMmode] = useState<'dist' | 'asym'>('dist')
  const [cell, setCell] = useState<[number, number] | null>(null)
  const [axes, setAxes] = useState<[AxisId, AxisId]>(['col', 'pro'])
  const [morph, setMorph] = useState(false)
  const motionOk = !reducedMotion()

  // Morph: flip ideal ⇄ here and now; positions tween (aligned layouts, so stable regions stay put).
  useEffect(() => {
    if (!morph) return
    const id = setInterval(() => setSpace(sp => (sp === 'ideal' ? 'now' : 'ideal')), 2200)
    return () => clearInterval(id)
  }, [morph])
  useEffect(() => {
    if (tab !== '2d') setMorph(false)
  }, [tab])

  // Keep a selection when the frame changes: the same ideology in the new frame.
  const remap = (g: Sel, sp: Space): Sel => (typeof g !== 'number' ? g : sp === 'now' ? N + (g % N) : sp === 'ideal' ? g % N : g)
  const changeSpace = (sp: Space) => {
    setMorph(false)
    setSpace(sp)
    setSel(g => remap(g, sp))
    setPair(null)
    setCell(null)
    if (typeof ego === 'number') setEgo(remap(ego, sp) as number)
  }

  const dim: 2 | 3 = tab === '3d' ? 3 : 2
  const isSlice = tab === 'explore' && explore === 'slice'
  const isMatrix = tab === 'explore' && explore === 'matrix'
  const sc: Scene = isSlice ? sliceScene(space, axes[0], axes[1]) : mapScene(space, dim)
  const statKey = isSlice ? `slice-${space}-${axes.join('-')}` : `${space}-${dim}`
  const stats = sceneStats(statKey, sc)
  const frameCoords = useMemo(() => (['ideal', 'now', 'joint'] as Space[]).flatMap(sp => layout(sp, dim).coords), [dim])

  const youPos = useMemo(() => {
    if (!you) return {}
    if (isSlice) {
      const [xi, yi] = axes.map(a => AXIS_IDS.indexOf(a))
      const raw = (u: Vec | null) => (u && u[xi!] != null && u[yi!] != null ? [u[xi!]!, u[yi!]!] : undefined)
      return { I: raw(you.I), N: raw(you.N) }
    }
    return { I: placeYou(you.I, 'I', space, dim).c, N: you.N ? placeYou(you.N, 'N', space, dim).c : undefined }
  }, [you, space, dim, isSlice, axes])

  const active = sel ?? hover
  const nb = typeof active === 'number' && sc.ids.includes(active) ? neighbours(sc, active) : null
  const youNear = (u: Vec) =>
    [...sc.ids].map(g => ({ g, d: dYou(u, g) })).sort((a, b) => a.d - b.d).slice(0, 3)
  const neighbourIds = nb ? nb.top : active === 'youI' && you ? youNear(you.I) : active === 'youN' && you?.N ? youNear(you.N) : []

  const findOptions = [...ARCH.map((a, i) => ({ a, i }))].sort((x, y) => x.a.name.localeCompare(y.a.name))
  const onFind = (v: string) => {
    if (v === '') return setSel(null)
    const i = Number(v)
    const g = space === 'now' ? N + i : i
    if (tab === 'ego') setEgo(g)
    else setSel(g)
  }

  return (
    <article className={`wrap ${page.page}`}>
      <h1>Ideology map</h1>
      <p className={page.lede}>
        All {N} ideologies, laid out so that distance on screen approximates the quiz’s own 12-axis distance. Twelve dimensions don’t fit
        in two, and the quiz’s distance isn’t symmetric (each ideology weighs the axes differently), so every view says how much it
        distorts. Hover or tap a dot: lines go to its <em>true</em> nearest neighbours.
        {!you && (
          <>
            {' '}
            <a href="#/">Take the test</a> to see yourself on the map.
          </>
        )}
      </p>

      <div className={page.tabs} role="tablist" aria-label="Map views">
        {TABS.map(([t, l]) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => { setTab(t); setPair(null) }}>
            {l}
          </button>
        ))}
      </div>

      <div className={css.toolbar}>
        <Seg
          label="Positions"
          value={space}
          onChange={changeSpace}
          options={(['ideal', 'now', 'joint'] as Space[]).map(sp => [sp, SPACE_NAME[sp], isMatrix && sp === 'joint'])}
        />
        {tab === 'explore' && <Seg label="Explore view" value={explore} onChange={v => { setExplore(v); setPair(null) }} options={[['matrix', 'Matrix'], ['slice', 'Axis slice']]} />}
        {(tab === '2d' || tab === '3d' || isSlice) && (
          <label className={page.field}>
            Overlay{' '}
            <select value={overlay} onChange={e => setOverlay(e.target.value as typeof overlay)}>
              <option value="none">None</option>
              <option value="bands">Rubber bands (on the selected dot)</option>
              <option value="halo">Distortion halos</option>
            </select>
          </label>
        )}
        {isSlice && (
          <>
            <label className={page.field}>
              Across{' '}
              <select value={axes[0]} onChange={e => setAxes([e.target.value as AxisId, axes[1]])}>
                {AXIS_IDS.map(a => <option key={a} value={a}>{AXES[a].title}</option>)}
              </select>
            </label>
            <label className={page.field}>
              Up{' '}
              <select value={axes[1]} onChange={e => setAxes([axes[0], e.target.value as AxisId])}>
                {AXIS_IDS.map(a => <option key={a} value={a}>{AXES[a].title}</option>)}
              </select>
            </label>
          </>
        )}
        {isMatrix && <Seg label="Matrix colour" value={mmode} onChange={setMmode} options={[['dist', 'Distance'], ['asym', 'Asymmetry']]} />}
        {tab === 'ego' && typeof ego === 'number' && (
          <Seg label="Whose weights" value={egoW} onChange={setEgoW} options={[['theirs', 'Their weights'], ['own', 'Its own weights']]} />
        )}
        {!isMatrix && (
          <label className={page.field}>
            {tab === 'ego' ? 'Centre on' : 'Find'}{' '}
            <select value="" onChange={e => onFind(e.target.value)}>
              <option value="">Choose an ideology…</option>
              {findOptions.map(({ a, i }) => <option key={a.slug} value={i}>{a.name}</option>)}
            </select>
          </label>
        )}
        {tab === 'ego' && you && (
          <Seg
            label="Centre on you"
            value={typeof ego === 'string' ? ego : ('' as 'youI')}
            onChange={setEgo}
            options={[['youI', 'You (ideal)'], ['youN', 'You (here and now)', !you.N]]}
          />
        )}
        {tab === '2d' && (
          <button type="button" className="btn btn-ghost" onClick={() => setMorph(m => !m)} disabled={!motionOk} aria-pressed={morph} title={motionOk ? undefined : 'Off: your device asks for reduced motion'}>
            {morph ? 'Stop the morph' : 'Morph ideal ⇄ here and now'}
          </button>
        )}
      </div>

      {tab === 'ego' ? (
        <EgoView space={space} ego={ego} egoW={egoW} you={you} setEgo={setEgo} setSel={setSel} setTab={setTab} />
      ) : isMatrix ? (
        <div className={page.stage}>
          <Matrix ids={SPACE_IDS[space === 'joint' ? 'ideal' : space]} mode={mmode} cell={cell} onCell={setCell} />
          <aside className={page.panel} aria-live="polite">
            <MatrixPanel ids={SPACE_IDS[space === 'joint' ? 'ideal' : space]} cell={cell} setCell={setCell} mode={mmode} />
          </aside>
        </div>
      ) : (
        <>
          <div className={page.stage}>
            <div>
              <MapChart
                kind={isSlice ? 'slice' : tab === '3d' ? '3d' : '2d'}
                space={space}
                sc={sc}
                frameCoords={frameCoords}
                you={youPos}
                sel={sel}
                hover={hover}
                onSelect={g => {
                  setSel(g)
                  setPair(null)
                }}
                onHover={setHover}
                overlay={overlay}
                local={stats.local}
                focus={focus}
                pair={pair}
                neighbourIds={neighbourIds}
                loose={you ? CALIBRATION.labels[you.mode].loose : LOOSE_STD}
                yaw={rot[0]}
                pitch={rot[1]}
                onRotate={(y, p) => setRot([y, p])}
                axes={axes}
                ariaLabel={`${isSlice ? 'Axis slice' : tab === '3d' ? '3D map' : '2D map'} of ideologies (${SPACE_NAME[space].toLowerCase()}). Use Find to pick one; details appear beside the map.`}
              />
              <p className="small muted" style={{ margin: '6px 0 0' }}>
                {tab === '3d' ? 'Drag to rotate. ' : ''}Hover or tap a dot for its true nearest; tap empty space to clear.
              </p>
            </div>
            <aside className={page.panel} aria-live="polite">
              <PointPanel sc={sc} space={space} sel={active} pair={pair} nb={nb} you={you} isSlice={isSlice} setTab={setTab} setEgo={setEgo} />
            </aside>
          </div>
          <Legend focus={focus} setFocus={setFocus} space={space} you={!!you} overlay={overlay} ring={tab === '2d' && !!you} />
          <section className={page.caption}>
            <div>
              <Caption tab={tab} isSlice={isSlice} space={space} axes={axes} stats={stats} dim={dim} you={you} />
              {stats.liars.length > 0 ? (
                <>
                  <p style={{ marginBottom: 2 }}>Look close here, but aren’t:</p>
                  <ul className={page.liars}>
                    {stats.liars.map(l => (
                      <li key={`${l.a}-${l.b}`}>
                        <button type="button" className={page.linkish} onClick={() => { setPair([l.a, l.b]); setSel(null) }}>
                          {nameOf(l.a, space)} ↔ {nameOf(l.b, space)}
                        </button>{' '}
                        <span className={css.num}>
                          {l.m.toFixed(3)} here, {l.d.toFixed(3)} true
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>No pair is drawn under 0.06 apart while truly more than 0.15 apart.</p>
              )}
            </div>
            <Shepard pairs={stats.pairs} hot={typeof active === 'number' ? active : null} pair={pair} onPair={p => { setPair(p); if (p) setSel(null) }} loose={you ? CALIBRATION.labels[you.mode].loose : LOOSE_STD} />
          </section>
        </>
      )}
    </article>
  )
}

function Caption({ tab, isSlice, space, axes, stats, dim, you }: { tab: Tab; isSlice: boolean; space: Space; axes: [AxisId, AxisId]; stats: { stress: number; knn3: number }; dim: 2 | 3; you: ReturnType<typeof useYou> }) {
  const quality = stats.stress < 0.1 ? 'good' : stats.stress < 0.2 ? 'fair: expect visible distortion' : 'poor: treat it as a sketch'
  const L = layout(space, dim)
  return (
    <>
      <p className={page.honest}>Distances {isSlice ? 'on this slice' : 'on this map'} are approximate; the lines on hover show the true nearest.</p>
      <p>
        {isSlice ? (
          <>Raw scores on two of the 12 axes ({AXES[axes[0]].title} × {AXES[axes[1]].title}). The other ten axes are ignored, so closeness here can be badly wrong.</>
        ) : (
          <>
            Metric MDS on the quiz’s distance (the mean of both directions) between{' '}
            {space === 'joint' ? `all ${2 * N} ideal and here-and-now positions` : `the ${N} ${space === 'ideal' ? 'ideal' : 'here-and-now'} positions`}. The axes have no
            meaning of their own: the map is turned so private ownership rises to the right and traditional norms rise upward.
            {space === 'joint' && L.stressIdeal !== undefined && <> Stress on ideal pairs {L.stressIdeal.toFixed(3)}, here-and-now pairs {L.stressNow!.toFixed(3)}.</>}
            {space === 'joint' && ' Filled = ideal, hollow = here and now; a thin line joins each ideology’s two positions.'}
          </>
        )}
        {you && !isSlice && ' You are placed against your true distance to every point shown (each ideology’s weights, as the quiz uses).'}
      </p>
      <p>
        <strong>Stress {stats.stress.toFixed(3)}</strong> ({quality}) · <strong>{Math.round(stats.knn3 * 100)}%</strong> of each dot’s 3 true nearest are also
        its 3 nearest here.{tab === '3d' && ' (Figures are for the 3D layout; any single view of it is a further flattening.)'}
      </p>
    </>
  )
}

function Legend({ focus, setFocus, space, you, overlay, ring }: { focus: Set<string>; setFocus: (f: Set<string>) => void; space: Space; you: boolean; overlay: string; ring: boolean }) {
  return (
    <div className={page.legendBox}>
      <div className={page.legend} role="group" aria-label="Families: press to highlight">
        {FAMILIES.map(f => (
          <button
            key={f.id}
            type="button"
            aria-pressed={focus.has(f.id)}
            className={page.chip}
            onClick={() => {
              const next = new Set(focus)
              if (next.has(f.id)) next.delete(f.id)
              else next.add(f.id)
              setFocus(next)
            }}
          >
            <Swatch fam={f.id} /> {f.name}
          </button>
        ))}
      </div>
      <p className={`small muted ${page.keys}`}>
        {you && (
          <>
            <span><i className={page.youI} aria-hidden /> You (ideal)</span>
            <span><i className={page.youN} aria-hidden /> You (here and now)</span>
          </>
        )}
        {ring && <span><i className={page.ringKey} aria-hidden /> loose cut around your ideal</span>}
        {space === 'joint' && <span>hollow = here-and-now position</span>}
        {overlay === 'bands' && <span><i className={page.bandFar} aria-hidden /> drawn too far apart · <i className={page.bandNear} aria-hidden /> drawn too close</span>}
        {overlay === 'halo' && <span>halo size = how distorted that dot’s own distances are</span>}
      </p>
    </div>
  )
}

/** "How A sees B vs how B sees A": both directed distances on one 0–0.5 scale. */
function Asym({ a, b }: { a: number; b: number }) {
  const ab = dir(a, b)
  const ba = dir(b, a)
  const w = (v: number) => `${Math.min(100, (v / 0.5) * 100)}%`
  return (
    <div className={page.asym}>
      <span>{PTS[a]!.a.name} → {PTS[b]!.a.name}</span>
      <span className={css.num}>{ab.toFixed(3)}</span>
      <span className={page.bar}><i style={{ width: w(ab), background: 'var(--ideal)' }} /></span>
      <span>{PTS[b]!.a.name} → {PTS[a]!.a.name}</span>
      <span className={css.num}>{ba.toFixed(3)}</span>
      <span className={page.bar}><i style={{ width: w(ba), background: 'var(--now)' }} /></span>
    </div>
  )
}

const verdictText = (d: number, mode: Mode, out: boolean) => (out ? 'Ruled out' : SHORT_LABEL[labelFor(d, CALIBRATION.labels[mode])])

function PointPanel({
  sc,
  space,
  sel,
  pair,
  nb,
  you,
  isSlice,
  setTab,
  setEgo,
}: {
  sc: Scene
  space: Space
  sel: Sel
  pair: [number, number] | null
  nb: ReturnType<typeof neighbours> | null
  you: ReturnType<typeof useYou>
  isSlice: boolean
  setTab: (t: Tab) => void
  setEgo: (e: number | 'youI' | 'youN') => void
}) {
  const where = isSlice ? 'on these two axes' : 'on the map'
  if (pair) {
    const [a, b] = pair
    const d = D(a, b)
    const m = sc.mapDist(a, b)
    return (
      <>
        <h2 className={page.panelTitle}>{nameOf(a, space)} ↔ {nameOf(b, space)}</h2>
        <p>
          True distance <span className={css.num}>{d.toFixed(3)}</span>, drawn <span className={css.num}>{m.toFixed(3)}</span>: {m > d ? 'too far apart' : 'too close'} by{' '}
          {Math.round((Math.abs(m - d) / d) * 100)}%.
        </p>
        <h3 className={page.subhead}>How they see each other</h3>
        <Asym a={a} b={b} />
        <p className="small muted">A → B scores B against A with A’s weights: what A cares about.</p>
      </>
    )
  }
  if (sel === 'youI' || sel === 'youN') {
    const u = sel === 'youI' ? you?.I : you?.N
    if (!u || !you) return null
    const top = sc.ids.map(g => ({ g, d: dYou(u, g) })).sort((a, b) => a.d - b.d).slice(0, 3)
    return (
      <>
        <h2 className={page.panelTitle}>You ({sel === 'youI' ? 'ideal' : 'here and now'})</h2>
        <p className="small muted">
          Nearest by the quiz’s own distance to the {space === 'now' ? 'here-and-now positions' : space === 'joint' ? 'positions' : 'ideal positions'} shown.
          {space !== 'ideal' && ' (Your match list compares both frames with each ideology’s ideal.)'}
        </p>
        <ol className={page.olist}>
          {top.map(t => (
            <li key={t.g}>
              <Swatch fam={PTS[t.g]!.a.family} hollow={you.out.has(PTS[t.g]!.a.slug)} /> {nameOf(t.g, space)} <span className={css.num}>{t.d.toFixed(3)}</span>{' '}
              <span className="small muted">{verdictText(t.d, you.mode, you.out.has(PTS[t.g]!.a.slug))}</span>
            </li>
          ))}
        </ol>
        <button type="button" className="btn" onClick={() => { setEgo(sel); setTab('ego') }}>
          Exact from here →
        </button>
      </>
    )
  }
  if (typeof sel === 'number' && nb) {
    const pt = PTS[sel]!
    return (
      <>
        <h2 className={page.panelTitle}>{nameOf(sel, space)}</h2>
        <p className="small muted">
          <Swatch fam={pt.a.family} /> {family(pt.a.family).name}
        </p>
        <p className="small">True 3 nearest (the quiz’s distance, mean of both directions):</p>
        <ol className={page.olist}>
          {nb.top.map(n => {
            const ratio = n.m / n.d
            return (
              <li key={n.g}>
                {nameOf(n.g, space)}
                <br />
                <span className={css.num}>true {n.d.toFixed(3)}</span> · <span className={`${css.num} ${ratio < 0.6 || ratio > 1.6 ? css.tagOut : ''}`}>{where} {n.m.toFixed(3)}</span>
                {n.rank > 3 && <span className={css.tagOut}> (drawn #{n.rank} nearest)</span>}
              </li>
            )
          })}
        </ol>
        {nb.imposters.length > 0 ? (
          <>
            <p className="small">Drawn nearer {where} than they are:</p>
            <ul className={page.olist}>
              {nb.imposters.map(m => (
                <li key={m.g} className="small">
                  {nameOf(m.g, space)}: drawn <span className={css.num}>{m.m.toFixed(3)}</span>, really <span className={`${css.num} ${css.tagOut}`}>{m.d.toFixed(3)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className={`small ${css.tagFit}`}>The 3 nearest as drawn are the true 3 nearest.</p>
        )}
        {nb.top[0] && (
          <>
            <h3 className={page.subhead}>How they see each other</h3>
            <Asym a={sel} b={nb.top[0].g} />
          </>
        )}
        <div className={page.panelActions}>
          <button type="button" className="btn" onClick={() => { setEgo(sel); setTab('ego') }}>
            Exact from here →
          </button>
          <a href={`#/ideologies/${pt.a.slug}`}>Read about it in the catalogue</a>
        </div>
      </>
    )
  }
  return (
    <>
      <h2 className={page.panelTitle}>{you ? 'Your result on the map' : 'Pick a dot'}</h2>
      <p className="small">
        Hover or tap any dot (or use Find) to see its true nearest neighbours, how far the map moves them, and how the two see each other.
      </p>
      {you ? (
        <p className="small muted">
          Your ideal and here-and-now answers are placed on the map from their true distances; the arrow runs from ideal to here and now. Only
          you see this: nothing leaves your device.
        </p>
      ) : (
        <p className="small muted">No result on this device yet, so no “you” point is drawn.</p>
      )}
    </>
  )
}

function MatrixPanel({ ids, cell, setCell, mode }: { ids: number[]; cell: [number, number] | null; setCell: (c: [number, number] | null) => void; mode: 'dist' | 'asym' }) {
  const note = (
    <p className="small muted">
      Cell (row A, column B) = d(A→B): B scored against A using <strong>A’s</strong> weights. Upper triangle A→B, lower the mirror B→A.
      Rows are ordered by clustering, so blocks on the diagonal are real clusters.{' '}
      {mode === 'asym' ? 'Blue: A sees B as nearer than B sees A; amber: farther.' : 'Bright = near.'} No projection here: every directed
      distance is shown exactly.
    </p>
  )
  if (cell) {
    const [a, b] = cell
    return (
      <>
        <h2 className={page.panelTitle}>{PTS[a]!.a.name} ↔ {PTS[b]!.a.name}</h2>
        <Asym a={a} b={b} />
        <p className="small">
          Mean of both (what the maps use): <span className={css.num}>{D(a, b).toFixed(3)}</span>
        </p>
        {note}
      </>
    )
  }
  return (
    <>
      <h2 className={page.panelTitle}>Directed distances</h2>
      {note}
      <h3 className={page.subhead}>Most asymmetric pairs</h3>
      {mostAsymmetric(ids).map(([a, b]) => (
        <button key={`${a}-${b}`} type="button" className={page.asymButton} onClick={() => setCell([a, b])}>
          <Asym a={a} b={b} />
        </button>
      ))}
      <p className="small muted">Hover or tap a cell for both directions.</p>
    </>
  )
}

function EgoView({
  space,
  ego,
  egoW,
  you,
  setEgo,
}: {
  space: Space
  ego: number | 'youI' | 'youN'
  egoW: 'theirs' | 'own'
  you: ReturnType<typeof useYou>
  setEgo: (e: number | 'youI' | 'youN') => void
  setSel: (s: Sel) => void
  setTab: (t: Tab) => void
}) {
  const L = layout(space, 2)
  const ids = L.ids
  const pos2 = new Map(ids.map((g, r) => [g, L.coords[r]! as unknown as readonly [number, number]]))
  const u = ego === 'youI' ? you?.I : ego === 'youN' ? you?.N ?? null : null
  const focusIsYou = ego === 'youI' || ego === 'youN'
  const focus: number | 'youI' | 'youN' = focusIsYou && !u ? ids[0]! : typeof ego === 'number' && !ids.includes(ego) ? ids[0]! : ego
  const fpos = typeof focus === 'number' ? pos2.get(focus)! : (placeYou(u!, focus === 'youI' ? 'I' : 'N', space, 2).c as unknown as readonly [number, number])
  const radius = (g: number) => (typeof focus !== 'number' ? dYou(u!, g) : egoW === 'own' ? dir(focus, g) : dir(g, focus))
  const mode: Mode = you?.mode ?? 'standard'
  const cuts = CALIBRATION.labels[mode]
  const list = ids.filter(g => g !== focus).map(g => ({ g, r: radius(g) })).sort((a, b) => a.r - b.r)
  const top = new Set(list.slice(0, 5).map(x => x.g))
  const out = typeof focus === 'string' && you ? you.out : new Set<string>()
  const items: EgoItem[] = list.map(({ g, r }) => {
    const pt = PTS[g]!
    const ruled = out.has(pt.a.slug)
    const detail = `${nameOf(g, space)} (${family(pt.a.family).name}): ${r.toFixed(3)}${ruled ? ', ruled out' : ''}`
    return {
      key: String(g),
      fam: pt.a.family,
      name: nameOf(g, space),
      r,
      pos: egoPosition(fpos, pos2.get(g)!, r),
      hollow: space === 'joint' && pt.frame === 'now',
      struck: ruled,
      aria: `${detail}. Press to centre on it.`,
      detail,
      label: top.has(g) ? nameOf(g, space) : undefined,
    }
  })
  const fname = typeof focus === 'number' ? nameOf(focus, space) : focus === 'youI' ? 'You (ideal)' : 'You (here and now)'
  const inside = (c: number) => list.filter(x => x.r <= c).length
  return (
    <div className={page.stage}>
      <div>
        <EgoChart
          items={items}
          center={{ label: fname, tone: typeof focus === 'number' ? { fam: PTS[focus]!.a.family } : focus === 'youI' ? 'ideal' : 'now' }}
          cuts={cuts}
          onPick={k => setEgo(Number(k))}
          ariaLabel={`Every ideology at its true distance from ${fname}. Press a dot to centre on it.`}
        />
        <RingKey cuts={cuts} mode={MODE_NAME[mode]} />
        <FamilyKey ruledOut={out.size > 0} />
      </div>
      <aside className={page.panel} aria-live="polite">
        <h2 className={page.panelTitle}>Exact from {fname}</h2>
        <p className="small">
          Every dot’s distance from the centre is its <strong>true</strong> quiz distance{' '}
          {typeof focus !== 'number'
            ? '(each ideology’s own weights: exactly how the quiz ranks you)'
            : egoW === 'theirs'
              ? `(each ideology scores ${PTS[focus]!.a.name} with its own weights: how they see it)`
              : `(${PTS[focus]!.a.name} scores everyone with its weights: how it sees them)`}
          . Direction comes from the 2D map, so only distances to the centre are exact: exact from the centre, approximate everywhere else.
        </p>
        <p className="small">
          Inside the rings: <span className={css.num}>{inside(cuts.veryClose)}</span> very close · <span className={css.num}>{inside(cuts.close)}</span> close ·{' '}
          <span className={css.num}>{inside(cuts.loose)}</span> loose.
        </p>
        <h3 className={page.subhead}>Nearest</h3>
        <ol className={page.olist}>
          {list.slice(0, 5).map(x => (
            <li key={x.g}>
              <Swatch fam={PTS[x.g]!.a.family} hollow={out.has(PTS[x.g]!.a.slug)} /> {nameOf(x.g, space)} <span className={css.num}>{x.r.toFixed(3)}</span>{' '}
              <span className="small muted">{out.has(PTS[x.g]!.a.slug) ? 'Ruled out' : SHORT_LABEL[labelFor(x.r, cuts)]}</span>
            </li>
          ))}
        </ol>
        {typeof focus === 'number' && <p className="small muted">Flip <strong>Their weights / Its own weights</strong> to watch the asymmetry move the dots.</p>}
        <p className="small muted">Tap any dot to centre on it.</p>
      </aside>
    </div>
  )
}
