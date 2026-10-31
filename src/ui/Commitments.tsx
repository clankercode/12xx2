import type { ArchetypeCheck, CommitmentCheck, FrameCheck, UnknownReason, Verdict } from '../engine/commitments'
import type { Match, Results } from '../engine/results'
import type { Payload } from '../engine/payload'
import type { RedCode } from '../engine/types'
import type { Own } from '../state/derive'
import { HAS_COMMITMENTS, HAS_RED_COMMITMENTS } from '../data/commitments'
import { ALL_ITEMS } from '../data/items'
import { RED_LINES } from '../data/redlines'
import { CATALOGUE } from '../data/archetypes'
import { MAX_CORE, combine, isRedCommitment } from '../engine/commitments'
import { label } from './answer'
import { REPORT_COMMITMENT_URL } from './copy'
import css from './Commitments.module.css'
import rcss from './Results.module.css'

const TEXT = new Map([...ALL_ITEMS.map(i => [i.id, i.text] as const), ...RED_LINES.map(r => [r.id, r.text] as const)])
const NAME = new Map(CATALOGUE.map(a => [a.slug, a.name]))
const FRAME = { I: 'ideal system', N: 'here and now' } as const
const SYMBOL: Record<Verdict, string> = { pass: '✔', fail: '✘', unknown: '?' }
const VERDICT: Record<Verdict, string> = { pass: 'Holds', fail: 'Contradicted', unknown: 'Unknown' }
const ALL: Record<Verdict | 'none', string> = { pass: 'All hold', fail: 'Ruled out', unknown: 'Not settled', none: 'No commitments listed' }
const REASON: Record<UnknownReason, string> = {
  passed: 'you passed',
  'not-asked': 'not asked in this length',
  neutral: 'you were neutral',
  'not-decisive': 'only slightly the other way',
}
/** Who judged the commitments, said wherever they are shown. */
export const CODED_BY =
  'Commitments were judged by AI coders (three independent Claude Opus readings: theorist, insider and sceptic), not validated by adherents.'

const excerpt = (s: string, n = 64) => (s.length <= n ? s : `${s.slice(0, s.lastIndexOf(' ', n))}…`)

function unknownWhy(c: CommitmentCheck): string {
  const reasons = [...new Set(c.frames.filter(f => f.verdict === 'unknown').map(f => REASON[f.reason!]))]
  return reasons.join('; ')
}

function Cell({ c, n }: { c: CommitmentCheck; n: number }) {
  const text = TEXT.get(c.commitment.item) ?? c.commitment.item
  // The ideology's required stance, worded so it can't be read as your own answer.
  const stance = c.commitment.side === 1 ? 'Must agree' : 'Must disagree'
  const frames = c.commitment.frame === 'both' ? 'ideal and here and now' : 'ideal'
  return (
    <td className={css.cell} data-v={c.verdict} title={`${stance} (${frames}): ${text}`}>
      <span className={css.sym} aria-hidden>
        {SYMBOL[c.verdict]}
      </span>{' '}
      <span className={css.verdict}>{VERDICT[c.verdict]}</span>
      {c.verdict === 'unknown' && <span className={css.reason}> ({unknownWhy(c)})</span>}
      <span className={css.stmt}>
        <span className="visually-hidden">Commitment {n}: </span>
        <strong>{stance}</strong>
        {c.commitment.frame === 'both' && <span className={css.both}> · both frames</span>}: {excerpt(text)}
      </span>
    </td>
  )
}

/** One cell summarising an ideology's red-line commitments: ✔ all hold · ✘ contradicted · ? not settled · – none listed. */
function RedCell({ reds }: { reds: CommitmentCheck[] }) {
  if (!reds.length)
    return (
      <td className={css.empty} data-red="none">
        <span aria-hidden>–</span> <span className={css.reason}>none listed</span>
      </td>
    )
  const v = combine(reds.map(c => c.verdict))
  const failed = reds.filter(c => c.verdict === 'fail').length
  const open = reds.filter(c => c.verdict === 'unknown').length
  const title = reds
    .map(c => `${SYMBOL[c.verdict]} ${c.commitment.side === 1 ? 'Must agree' : 'Must disagree'}: ${TEXT.get(c.commitment.item) ?? c.commitment.item}`)
    .join('\n')
  return (
    <td className={css.cell} data-v={v} data-red={v} title={title}>
      <span className={css.sym} aria-hidden>
        {SYMBOL[v]}
      </span>{' '}
      <span className={css.verdict}>{v === 'pass' ? 'All hold' : v === 'fail' ? `Contradicted (${failed})` : 'Not settled'}</span>
      <span className={css.stmt}>
        {reds.length} listed
        {v === 'fail' && `, ${failed} contradicted`}
        {v !== 'pass' && open > 0 && `, ${open} unknown`}
      </span>
    </td>
  )
}

/** One line per contradicted commitment, naming each frame that failed. */
function failLine(arch: Match['arch'], c: CommitmentCheck) {
  const text = TEXT.get(c.commitment.item) ?? c.commitment.item
  const need = c.commitment.side === 1 ? 'agreeing' : 'disagreeing'
  const failed = c.frames.filter(f => f.verdict === 'fail')
  return (
    <li key={`${arch.slug}-${c.commitment.item}`} data-red={isRedCommitment(c.commitment) || undefined}>
      {isRedCommitment(c.commitment) && <strong>Red line. </strong>}
      You answered{' '}
      {failed.map((f: FrameCheck, k) => (
        <span key={f.frame}>
          {k > 0 && ' and '}
          <strong>{label(f.answer)}</strong> ({FRAME[f.frame]})
        </span>
      ))}{' '}
      to “{text}”{/[.?!]$/.test(text) ? '' : '.'} {arch.name} requires {need}: {c.commitment.why}
    </li>
  )
}

/**
 * IGC matrix for the owner's own result: the top ideal matches (plus any ruled-out one that would
 * have ranked there) against their core commitments, with one column summarising their red-line
 * commitments. Needs the answers, so never in shared views.
 */
export function CoreCommitments({ r, checks }: { r: Results; checks: ReadonlyMap<string, ArchetypeCheck> }) {
  if (!HAS_COMMITMENTS || !r.matchesIdeal.length) return null
  const rows = r.matchesIdeal.map(m => {
    const check = checks.get(m.arch.slug) ?? { slug: m.arch.slug, all: 'none' as const, checks: [] }
    return {
      m,
      check,
      core: check.checks.filter(c => !isRedCommitment(c.commitment)),
      reds: check.checks.filter(c => isRedCommitment(c.commitment)),
    }
  })
  const cols = Math.min(MAX_CORE, Math.max(1, ...rows.map(x => x.core.length)))
  const fails = rows.flatMap(({ m, check }) => check.checks.filter(c => c.verdict === 'fail').map(c => failLine(m.arch, c)))
  return (
    <section className={`${rcss.section} ${css.section}`} aria-labelledby="core-commitments">
      <h2 id="core-commitments">Core commitments</h2>
      <p className="muted small">
        Core commitments are positions that our coded profiles of an ideology’s mainstream share, checked for counterexamples.
        Answering decisively against one rules that ideology out for you, however close the rest of your answers are.
        {HAS_RED_COMMITMENTS && ' The red-line statements at the end of the test work the same way; their column sums them up.'}{' '}
        {CODED_BY} <a href={REPORT_COMMITMENT_URL}>Report one you think is wrong</a>. <a href="#/method">How this works</a>.
      </p>
      <div className={css.scroll}>
        <table className={css.matrix}>
          <caption className="visually-hidden">
            Your closest ideal-system matches checked against their core commitments and red lines: holds, contradicted, or
            unknown
          </caption>
          <thead>
            <tr>
              <th scope="col">Ideology</th>
              {Array.from({ length: cols }, (_, k) => (
                <th key={k} scope="col">
                  Commitment {k + 1}
                </th>
              ))}
              {HAS_RED_COMMITMENTS && <th scope="col">Red lines</th>}
              <th scope="col">All</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, check, core, reds }) => (
              <tr key={m.arch.slug} data-out={check.all === 'fail' || undefined}>
                <th scope="row">
                  <a href={`#/ideologies`}>{m.arch.name}</a>
                </th>
                {Array.from({ length: cols }, (_, k) =>
                  core[k] ? (
                    <Cell key={k} c={core[k]!} n={k + 1} />
                  ) : (
                    <td key={k} className={css.empty}>
                      <span aria-hidden>–</span>
                      <span className="visually-hidden">none</span>
                    </td>
                  ),
                )}
                {HAS_RED_COMMITMENTS && <RedCell reds={reds} />}
                <td className={css.all} data-v={check.all}>
                  {check.all !== 'none' && (
                    <span className={css.sym} aria-hidden>
                      {SYMBOL[check.all]}
                    </span>
                  )}{' '}
                  {ALL[check.all]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fails.length > 0 && <ul className={css.fails}>{fails}</ul>}
      <p className="small muted">
        <span aria-hidden>?</span> means unknown, and never counts as holding: you passed the statement, it was not asked in
        this length of test, you answered neutral, or you were only slightly on the other side (too close to call, since
        answers are noisy).
      </p>
    </section>
  )
}

const SHOW_NAMES = 6

/** Names of ideologies, the first few inline and the rest behind a disclosure. */
function Names({ slugs }: { slugs: readonly string[] }) {
  const names = slugs.map(s => NAME.get(s) ?? s)
  if (names.length <= SHOW_NAMES) return <>{names.join(', ')}</>
  return (
    <details className={css.more}>
      <summary>
        {names.slice(0, SHOW_NAMES).join(', ')} and {names.length - SHOW_NAMES} more
      </summary>
      {names.slice(SHOW_NAMES).join(', ')}
    </details>
  )
}

/**
 * The owner's answers on every red line, and which ideologies that answer contradicts on it.
 * Owner only (needs the answers); a shared link carries these only on an explicit opt-in.
 */
export function YourRedLines({ lines }: { lines: Own['redLines'] }) {
  if (!lines.some(l => l.answer)) return null
  return (
    <section className={`${rcss.section} ${css.section}`} aria-labelledby="your-red-lines">
      <h2 id="your-red-lines">Your red lines</h2>
      <p className="muted small">
        Your answers to the red-line statements. They never move your axis scores; an answer firmly against an ideology’s
        listed side rules that ideology out{HAS_RED_COMMITMENTS ? ', and is marked ✘ with the ideologies it rules out' : ''}. Only
        you can see this unless you choose to include it when sharing. {CODED_BY}
      </p>
      <ol className={css.redList}>
        {lines.map(({ line, answer, contradicts }) => (
          <li key={line.id} data-contradicts={contradicts.length > 0 || undefined}>
            <p className={css.redText}>{line.text}</p>
            <p className="small">
              {answer ? (
                <>
                  <span className="ideal">{label(answer.i)}</span> in your ideal · <span className="now">{label(answer.n)}</span> here
                  and now
                </>
              ) : (
                <span className="muted">Not answered in this run</span>
              )}
            </p>
            {contradicts.length > 0 && (
              <p className={`small ${css.redRuled}`}>
                <span aria-hidden>✘ </span>Rules out <Names slugs={contradicts} />
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

/** A red-line code as the stance it stands for, worded against the statement itself. */
export function redStance(code: RedCode, humane: 1 | -1): string {
  const agree = humane === 1
  switch (code) {
    case 0:
      return 'Passed or not answered'
    case 1:
      return agree ? 'Agrees' : 'Disagrees'
    case 2:
      return agree ? 'Neutral or slightly disagrees' : 'Neutral or slightly agrees'
    case 3:
      return agree ? 'Disagrees' : 'Agrees'
  }
}

/** Shared view: where the owner stands on the red lines, present only when they opted in to share it. */
export function SharedRedLines({ p }: { p: Payload }) {
  if (!p.red?.length) return null
  const rows = p.red.slice(0, RED_LINES.length).map((x, k) => ({ line: RED_LINES[k]!, x }))
  return (
    <section className={`${rcss.section} ${css.section}`} aria-labelledby="shared-red-lines">
      <h2 id="shared-red-lines">Their red lines</h2>
      <p className="muted small">
        They chose to share where they stand on the red-line statements: agreeing or disagreeing at any strength, neutral or
        only slightly, or firmly (agree / disagree or stronger). These never move axis scores. <a href="#/method">What red lines
        are</a>.
      </p>
      <ol className={css.redList}>
        {rows.map(({ line, x }) => (
          <li key={line.id} data-firm={x.i === 3 || x.n === 3 || undefined}>
            <p className={css.redText}>{line.text}</p>
            <p className="small">
              <span className="ideal">{redStance(x.i, line.humane)}</span> in their ideal ·{' '}
              <span className="now">{redStance(x.n, line.humane)}</span> here and now
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
