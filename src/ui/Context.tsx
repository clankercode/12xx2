import { useMemo } from 'react'
import { SC_ITEMS } from '../data/sc'
import { COUNTRY_CODES, countryName } from '../data/countries'
import { useStore } from './App'
import { Strip } from './Grid'
import { go } from './router'
import css from './Steps.module.css'

/** After the items (spec §2.4): optional System Confidence block and country. */
export function Context() {
  const { s, dispatch } = useStore()
  const countries = useMemo(
    () => COUNTRY_CODES.map(c => ({ c, name: countryName(c) })).sort((a, b) => a.name.localeCompare(b.name)),
    [],
  )
  const next = () => {
    dispatch({ type: 'stage', stage: 'place' })
    go('#/place')
  }
  return (
    <div className={`narrow ${css.step}`}>
      <p className="small muted">Almost done · optional</p>
      <h2>How well does your system work by its own rules?</h2>
      <p>
        Six quick statements about <span className="now">here and now</span>. They don’t change your axis scores; they help
        explain your gaps. Skip any you like.
      </p>
      {SC_ITEMS.map(it => (
        <div key={it.id} className={css.sc}>
          <p className={css.scText}>{it.text}</p>
          <Strip frame="N" name={it.id} value={s.sc[it.id] ?? null} onPick={v => dispatch({ type: 'sc', id: it.id, answer: v })} />
        </div>
      ))}
      <label className={css.field}>
        <span>Which country are you judging? (optional, never shared unless you choose)</span>
        <select value={s.country ?? ''} onChange={e => dispatch({ type: 'country', country: e.target.value || null })}>
          <option value="">Prefer not to say</option>
          {countries.map(({ c, name }) => (
            <option key={c} value={c}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <div className={css.actions}>
        <button type="button" className="btn btn-primary" onClick={next}>
          Continue
        </button>
        <button type="button" className="btn btn-ghost" onClick={next}>
          Skip this step
        </button>
      </div>
    </div>
  )
}
