import type { ArchetypeCheck, CommitmentCheck, FrameCheck, UnknownReason, Verdict } from '../engine/commitments'
import type { Match, Results } from '../engine/results'
import { HAS_COMMITMENTS } from '../data/commitments'
import { ALL_ITEMS } from '../data/items'
import { MAX_COMMITMENTS } from '../engine/commitments'
import { label } from './answer'
import { REPORT_COMMITMENT_URL } from './copy'
import css from './Commitments.module.css'
import rcss from './Results.module.css'

const TEXT = new Map(ALL_ITEMS.map(i => [i.id, i.text]))
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

/** One line per contradicted commitment, naming each frame that failed. */
function failLine(arch: Match['arch'], c: CommitmentCheck) {
  const text = TEXT.get(c.commitment.item) ?? c.commitment.item
  const need = c.commitment.side === 1 ? 'agreeing' : 'disagreeing'
  const failed = c.frames.filter(f => f.verdict === 'fail')
  return (
    <li key={`${arch.slug}-${c.commitment.item}`}>
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
 * have ranked there) against their core commitments. Needs the answers, so never in shared views.
 */
export function CoreCommitments({ r, checks }: { r: Results; checks: ReadonlyMap<string, ArchetypeCheck> }) {
  if (!HAS_COMMITMENTS || !r.matchesIdeal.length) return null
  const rows = r.matchesIdeal.map(m => ({ m, check: checks.get(m.arch.slug) ?? { slug: m.arch.slug, all: 'none' as const, checks: [] } }))
  const cols = Math.min(MAX_COMMITMENTS, Math.max(1, ...rows.map(x => x.check.checks.length)))
  const fails = rows.flatMap(({ m, check }) =>
    check.checks.filter(c => c.verdict === 'fail').map(c => failLine(m.arch, c)),
  )
  return (
    <section className={`${rcss.section} ${css.section}`} aria-labelledby="core-commitments">
      <h2 id="core-commitments">Core commitments</h2>
      <p className="muted small">
        Core commitments are positions that our coded profiles of an ideology’s mainstream share, checked for counterexamples.
        Answering decisively against one rules that ideology out for you, however close the rest of your answers are. They are
        our coders’ judgements, not checked with adherents or experts: <a href={REPORT_COMMITMENT_URL}>report one you think is
        wrong</a>. <a href="#/method">How this works</a>.
      </p>
      <div className={css.scroll}>
        <table className={css.matrix}>
          <caption className="visually-hidden">
            Your closest ideal-system matches checked against their core commitments: holds, contradicted, or unknown
          </caption>
          <thead>
            <tr>
              <th scope="col">Ideology</th>
              {Array.from({ length: cols }, (_, k) => (
                <th key={k} scope="col">
                  Commitment {k + 1}
                </th>
              ))}
              <th scope="col">All</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, check }) => (
              <tr key={m.arch.slug} data-out={check.all === 'fail' || undefined}>
                <th scope="row">
                  <a href={`#/ideologies`}>{m.arch.name}</a>
                </th>
                {Array.from({ length: cols }, (_, k) =>
                  check.checks[k] ? (
                    <Cell key={k} c={check.checks[k]!} n={k + 1} />
                  ) : (
                    <td key={k} className={css.empty}>
                      <span aria-hidden>–</span>
                      <span className="visually-hidden">none</span>
                    </td>
                  ),
                )}
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
