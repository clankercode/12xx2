import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch } from 'react'
import { loadSession, persistSession, reduce, stashIncoming, type Action, type Session } from '../state/session'
import { deriveOwn, type Own } from '../state/derive'
import { useRoute, go } from './router'
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
}

const StoreCtx = createContext<Store | null>(null)

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

  // A shared link opened before taking the quiz is kept so we can offer a comparison afterwards.
  useEffect(() => {
    if (route.page === 'shared' && s.stage !== 'done') {
      dispatch({ type: 'incoming', payload: route.payload })
      stashIncoming(route.payload)
    }
  }, [route, s.stage])

  // Guard routes that need state.
  useEffect(() => {
    if ((route.page === 'quiz' && !s.mode) || (route.page === 'results' && s.stage !== 'done')) go('#/')
  }, [route.page, s.mode, s.stage])

  const store = useMemo(() => ({ s, dispatch, own }), [s, own])
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
      </main>
      {!focused && <Footer />}
    </StoreCtx.Provider>
  )
}
