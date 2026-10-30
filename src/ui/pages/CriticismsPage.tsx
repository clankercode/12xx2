import css from './Prose.module.css'

interface Row {
  problem: string
  where: string
  fix: string
}

const ORIGINAL: Row[] = [
  {
    problem: '“Neutral/Unsure” is one button scored as 0, so not knowing pulls you to the centre.',
    where: 'Original 12axes',
    fix: 'Pass is separate and counts as missing data; neutral is a real answer.',
  },
  {
    problem: 'Each axis asks 3 statements for one pole and 2 for the other, chosen at random, so agreeing with everything moves you 10 points toward a random pole.',
    where: 'Original 12axes (short quiz)',
    fix: 'Every axis has equal statements for each pole, and scoring averages the two poles separately, so yes-saying scores exactly 0 — even after passes.',
  },
  {
    problem: 'An off-by-one in the short quiz means the strongest statements for one pole are never asked and the strongest for the other always are.',
    where: 'Original 12axes (quiz.html)',
    fix: 'Fixed, nested statement sets with matched strength on both poles.',
  },
  {
    problem: 'Statements are written at four strengths, but scoring ignores strength and keeps only the sign.',
    where: 'Original 12axes',
    fix: 'Only clear, polar statements, matched in strength across poles, so a plain average is valid.',
  },
  {
    problem: 'Statements are drawn at random, so two people taking the “same” test answer different questions and can’t be compared.',
    where: 'Both',
    fix: 'Everyone in a mode answers the same statements in the same order.',
  },
  {
    problem: 'The ideology match uses only 4 of the 12 axes, and one of them is compared with its polarity reversed (a free-trader can come out as “Fascism”).',
    where: 'Original 12axes (results.html)',
    fix: 'Matching uses all 12 axes on the same scale as the ideology profiles.',
  },
  {
    problem: 'Short and long quizzes put scores on different scales (50+5×score vs 50+score).',
    where: 'Original 12axes',
    fix: 'One formula for every length; only the error bars change.',
  },
  {
    problem: 'Several statements are relative to the present (“more than they currently do”, “too much”), so their meaning depends on your country.',
    where: 'Original 12axes',
    fix: 'No status-quo-relative wording; country context lives in its own frame.',
  },
  {
    problem: 'Some statements are double-barrelled, US-specific or keyed to the wrong pole.',
    where: 'Original 12axes',
    fix: 'Original statements, international wording, and a blind cross-model check of each statement’s direction.',
  },
  {
    problem: '“Compatibility” percentages are inflated: random answers still produce an 87–93% top match, and opposite profiles score about 19%.',
    where: '12axes.vercel.app',
    fix: 'No percentages. Labels are calibrated against how close sincere adherents land, re-tested under noise, and withheld for careless answering.',
  },
  {
    problem: 'With 3 statements per axis, a retake gives the same top ideology only 23–51% of the time — yet that label leads the share card.',
    where: '12axes.vercel.app (simulated)',
    fix: 'Error bars on every axis and a stability label on every match; the headline splits only beyond a calibrated margin.',
  },
  {
    problem: 'Reference profiles are LLM role-play presented as “not placed by hand”.',
    where: '12axes.vercel.app',
    fix: 'We also use AI coders — disclosed — but three from different model families, blind to each other, with the median scored and disagreement published per axis.',
  },
  {
    problem: 'Answers are sent to a server.',
    where: '12axes.vercel.app',
    fix: 'Everything runs on your device. Share links carry scores, never answers, in the part of the address the server never sees.',
  },
]

export function CriticismsPage() {
  return (
    <article className={`narrow ${css.prose}`}>
      <h1>Why a new test</h1>
      <p className={css.lede}>
        12 Axes² keeps the 12-axis idea of the original 12axes test and fixes what made its results unreliable. The biggest
        change is conceptual: other quizzes ask one question where there are really two.
      </p>
      <h2>The conceptual problem</h2>
      <p>
        A single-frame quiz can’t tell whether you support something because you think it is right, or because of the country you
        live in. Someone in a state where the wealthy have captured the courts may back drastic redistribution that they would
        reject in a well-run democracy. Scored on one axis, that person and a committed socialist look the same. 12 Axes² asks
        both questions and reports the difference.
      </p>
      <h2>Specific problems and what we did</h2>
      {ORIGINAL.map(r => (
        <div key={r.problem} className={css.card}>
          <p>
            <strong>{r.problem}</strong>
          </p>
          <p className="small muted">{r.where}</p>
          <p>{r.fix}</p>
        </div>
      ))}
      <h2>Our own limits</h2>
      <ul>
        <li>No validation data yet: no factor analysis, no test–retest study. The thresholds come from simulation, not from real respondents.</li>
        <li>Answering twice per statement takes longer and can nudge people to make answers match or differ. We don’t tell you which is normal.</li>
        <li>Ideology profiles are AI-coded editorial judgements. Disagreement between coders is published, but agreement between AI models is not the same as accuracy.</li>
        <li>The 12-axis model itself bundles some ideas and leaves others out. See <a href="#/method">How it works</a>.</li>
      </ul>
      <p className="small muted">
        Full write-up with code references: <code>docs/criticisms.md</code> in the source repository.
      </p>
    </article>
  )
}
