import { useState } from 'react'
import type { Answer, Mode } from '../engine/types'
import { itemsForMode } from '../data/items'
import { IDEAL_SHORT, NOW_SHORT } from '../data/frames'
import { useStore } from './App'
import { Grid } from './Grid'
import { go } from './router'
import css from './Landing.module.css'

const MODES: { mode: Mode; name: string; minutes: number; note: string }[] = [
  { mode: 'quick', name: 'Quick', minutes: 7, note: 'Rough picture, wider error bars' },
  { mode: 'standard', name: 'Standard', minutes: 11, note: 'Recommended' },
  { mode: 'full', name: 'Full', minutes: 18, note: 'Tightest results' },
]

const DEMO = 'If a few people come to own most of a society’s wealth, much of it should be shared out among the rest.'

export function Landing() {
  const { s, dispatch } = useStore()
  const [demo, setDemo] = useState<{ i: Answer; n: Answer } | null>({ i: 1, n: 3 })
  const inProgress = s.stage === 'quiz' && s.mode && Object.keys(s.answers).length > 0
  const done = s.stage === 'done'

  const start = (mode: Mode) => {
    dispatch({ type: 'start', mode })
    go('#/quiz')
  }

  return (
    <>
      <section className={`wrap ${css.hero}`}>
        <div className={css.copy}>
          <h1>
            Your politics,
            <br />
            in theory and in practice.
          </h1>
          <p className={css.lede}>
            12 Axes² is a 12-axis political quiz where every statement is answered twice: once for{' '}
            <strong className="ideal">your ideal system</strong>, once for <strong className="now">here and now</strong>.
            Wanting something in a corrupt country and wanting it in a well-run one are different beliefs. This test keeps them apart.
          </p>
          <div className={css.ctaRow}>
            {done && (
              <button type="button" className="btn btn-primary" onClick={() => go('#/results')}>
                See my results
              </button>
            )}
            {inProgress && !done && (
              <button type="button" className="btn btn-primary" onClick={() => go('#/quiz')}>
                Continue where I left off
              </button>
            )}
            <a href="#modes" className={`btn ${done || inProgress ? '' : 'btn-primary'}`}>
              {done || inProgress ? 'Start again' : 'Take the test'}
            </a>
          </div>
          <p className="small muted">Free, anonymous, and private: your answers never leave your device.</p>
        </div>
        <figure className={css.demo}>
          <p className={css.demoStatement}>{DEMO}</p>
          <Grid value={demo} onPick={(i, n) => setDemo({ i, n })} idPrefix="demo" />
          <figcaption className="small muted">
            Someone in a country where the rich bought the courts might answer like this: in principle only slightly, but here and
            now, strongly. Try it yourself.
          </figcaption>
        </figure>
      </section>

      <section className={`wrap ${css.frames}`}>
        <div>
          <h2 className="ideal">
            <span className="glyph-ideal" aria-hidden /> Ideal system
          </h2>
          <p>{IDEAL_SHORT} Not a fantasy where nothing goes wrong: it still faces recessions, conflict and crime, and you decide what it does when they happen.</p>
        </div>
        <div>
          <h2 className="now">
            <span className="glyph-now" aria-hidden /> Here and now
          </h2>
          <p>{NOW_SHORT} Its real institutions, its real leaders, its real problems. Can they be fixed within the rules, or not?</p>
        </div>
        <div>
          <h2>The gap</h2>
          <p>
            Where your two answers part ways is the interesting part. 12 Axes² measures the gap, shows which way it points, and
            only calls it out when it’s bigger than answer-to-answer noise.
          </p>
        </div>
      </section>

      <section id="modes" className={`wrap ${css.modes}`}>
        <h2>Choose a length</h2>
        <div className={css.modeList}>
          {MODES.map(m => (
            <button key={m.mode} type="button" className={`${css.mode} ${m.mode === 'standard' ? css.modeRec : ''}`} onClick={() => start(m.mode)}>
              <span className={css.modeName}>{m.name}</span>
              <span className={css.modeMeta}>
                {itemsForMode(m.mode).length} statements · about {m.minutes} min
              </span>
              <span className="small muted">{m.note}</span>
            </button>
          ))}
        </div>
        <p className="small muted">
          Every statement is fixed and the same for everyone in a mode, so results are comparable. Pass anything you don’t
          understand or don’t want to answer; it’s left out, never counted as neutral.
        </p>
      </section>

      <section className={`wrap ${css.why}`}>
        <h2>What’s different from other political quizzes</h2>
        <ul className={css.whyList}>
          <li>
            <strong>Two frames, not one.</strong> Separates what you think is right from what you think your situation calls
            for.
          </li>
          <li>
            <strong>Pass is not neutral.</strong> Unsure answers are left out instead of dragging you to the centre.
          </li>
          <li>
            <strong>Agreeing with everything scores zero.</strong> Every axis has as many statements for each side, so
            yes-saying can’t push you anywhere.
          </li>
          <li>
            <strong>Honest labels.</strong> Error bars on every axis; matches say how close and how stable they are, with no
            inflated percentages. Gaps are shown only when they beat noise.
          </li>
          <li>
            <strong>Published method.</strong> Every formula and threshold is on the <a href="#/method">How it works</a> page,
            and the <a href="#/criticisms">problems we fixed</a> are listed.
          </li>
        </ul>
      </section>
    </>
  )
}
