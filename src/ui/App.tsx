import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch } from 'react'
import { loadSession, persistSession, reduce, stashIncoming, type Action, type Session } from '../state/session'
import { deriveOwn, type Own } from '../state/derive'
import { buildRun, loadRuns, storeRuns, upsertRun, type Run } from '../state/history'
import { heroName } from './copy'
import { HistoryPage, RunPage, RunsComparePage } from './HistoryPage'
import { useRoute, go, parseHash, type Route } from './router'
import { Landing } from './Landing'
import { Quiz } from './Quiz'
import { Context } from './Context'
import { Place } from './Place'
import { ResultsPage } from './ResultsPage'
import { SharedPage } from './SharedPage'
import { ComparePage } from './ComparePage'
import { MethodPage } from './pages/MethodPage'
import { CriticismsPage } from './pages/CriticismsPage'
import { IdeologiesPage } from './pages/IdeologiesPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { Footer, Header } from './Chrome'

interface Store {
  s: Session
  dispatch: Dispatch<Action>
  own: Own | null
  /** Finished runs kept on this device, newest first. */
  runs: Run[]
  /** Replaces the stored runs (and persists them). Returns how many old runs storage forced out. */
  setRuns: (runs: Run[]) => number
}

const StoreCtx = createContext<Store | null>(null)

const TITLES: Record<Route['page'], string> = {
  landing: '12 Axes² (12 Axes Squared) — your politics, in theory and in practice',
  quiz: 'Questions — 12 Axes²',
  context: 'Your system — 12 Axes²',
  place: 'Your country now — 12 Axes²',
  results: 'Your results — 12 Axes²',
  shared: 'Shared result — 12 Axes²',
  compare: 'Compare results — 12 Axes²',
  method: 'How it works — 12 Axes²',
  criticisms: 'Why a new test — 12 Axes²',
  ideologies: 'Ideology catalogue — 12 Axes²',
  privacy: 'Privacy — 12 Axes²',
  history: 'Your runs — 12 Axes²',
  run: 'Past run — 12 Axes²',
  runs: 'Compare runs — 12 Axes²',
}

/** On route change: set the title and move focus to the new page's main heading (not on first load). */
function useRouteFocus(route: Route) {
  const key = route.page === 'shared' ? `r=${route.payload}` : route.page === 'compare' ? `c=${route.mine}~${route.theirs}` : route.page
  const first = useRef(true)
  useEffect(() => {
    // The quiz sets its own title per statement.
    if (route.page !== 'quiz') document.title = TITLES[route.page]
    if (first.current) {
      first.current = false
      return
    }
    const h = document.querySelector<HTMLElement>('#main h1, #main h2, #main [data-route-focus]')
    if (!h) return
    if (!h.hasAttribute('tabindex')) h.tabIndex = -1
    h.setAttribute('data-route-focus', '')
    h.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

export function useStore(): Store {
  const v = useContext(StoreCtx)
  if (!v) throw new Error('StoreCtx missing')
  return v
}

export function App() {
  const [s, dispatch] = useReducer(reduce, undefined, loadSession)
  const route = useRoute()
  useEffect(() => persistSession(s), [s])
  const own = useMemo(() => (s.stage === 'done' || s.stage === 'context' || s.stage === 'place' ? deriveOwn(s) : null), [s])
  const [runs, setRunsState] = useState<Run[]>(loadRuns)
  const setRuns = useCallback((next: Run[]) => {
    const { dropped } = storeRuns(next)
    setRunsState(dropped ? next.slice(0, next.length - dropped) : next)
    return dropped
  }, [])

  // Record (or update) the finished run in the on-device history, unless saving is off.
  useEffect(() => {
    if (s.stage !== 'done' || !s.save || !own) return
    const run = buildRun(s, heroName(own.results))
    if (run) setRunsState(prev => {
      const next = upsertRun(prev, run)
      const { dropped } = storeRuns(next)
      return dropped ? next.slice(0, next.length - dropped) : next
    })
  }, [s, own])

  useRouteFocus(route)

  // A shared link opened before taking the quiz is kept so we can offer a comparison afterwards.
  // Runs on route change only: clearing data while on a shared route must not re-stash it.
  const stage = useRef(s.stage)
  stage.current = s.stage
  useEffect(() => {
    if (route.page === 'shared' && stage.current !== 'done') {
      dispatch({ type: 'incoming', payload: route.payload })
      stashIncoming(route.payload)
    }
  }, [route])

  // Guard routes that need state. Checks the live hash: a navigation dispatched with the state change
  // (e.g. results → quiz when continuing a run) hasn't reached `route` yet.
  useEffect(() => {
    const page = parseHash(location.hash).page
    if ((page === 'quiz' && !s.mode) || (page === 'results' && s.stage !== 'done')) go('#/')
  }, [route.page, s.mode, s.stage])

  const store = useMemo(() => ({ s, dispatch, own, runs, setRuns }), [s, own, runs, setRuns])
  const focused = route.page === 'quiz' || route.page === 'context' || route.page === 'place'

  return (
    <StoreCtx.Provider value={store}>
      <Header compact={focused} />
      <main id="main">
        {route.page === 'landing' && <Landing />}
        {route.page === 'quiz' && s.mode && <Quiz />}
        {route.page === 'context' && <Context />}
        {route.page === 'place' && <Place />}
        {route.page === 'results' && own && <ResultsPage own={own} />}
        {route.page === 'shared' && <SharedPage encoded={route.payload} />}
        {route.page === 'compare' && <ComparePage mine={route.mine} theirs={route.theirs} />}
        {route.page === 'method' && <MethodPage />}
        {route.page === 'criticisms' && <CriticismsPage />}
        {route.page === 'ideologies' && <IdeologiesPage />}
        {route.page === 'privacy' && <PrivacyPage />}
        {route.page === 'history' && <HistoryPage />}
        {route.page === 'run' && <RunPage id={route.id} />}
        {route.page === 'runs' && <RunsComparePage a={route.a} b={route.b} />}
      </main>
      {!focused && <Footer />}
    </StoreCtx.Provider>
  )
}
