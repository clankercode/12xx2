import { useEffect, useState } from 'react'

/**
 * Hash routing. Result payloads live in the fragment ("#r=…", "#c=…~…") so they
 * are never sent to the host; pages use "#/name".
 */
export type Route =
  | { page: 'landing' }
  | { page: 'quiz' }
  | { page: 'context' }
  | { page: 'place' }
  | { page: 'results' }
  | { page: 'shared'; payload: string }
  | { page: 'compare'; mine: string; theirs: string }
  | { page: 'method' }
  | { page: 'criticisms' }
  | { page: 'ideologies' }
  | { page: 'privacy' }

const PAGES = ['quiz', 'context', 'place', 'results', 'method', 'criticisms', 'ideologies', 'privacy'] as const

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '')
  if (h.startsWith('r=')) return { page: 'shared', payload: h.slice(2) }
  if (h.startsWith('c=')) {
    const [mine = '', theirs = ''] = h.slice(2).split('~')
    return { page: 'compare', mine, theirs }
  }
  const name = h.replace(/^\//, '')
  return (PAGES as readonly string[]).includes(name) ? ({ page: name } as Route) : { page: 'landing' }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash))
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash))
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return route
}

export function go(hash: string) {
  if (location.hash === hash) return
  location.hash = hash
  window.scrollTo({ top: 0 })
}

/** Replace the fragment without adding a history entry (used when sharing). */
export function replaceHash(hash: string) {
  history.replaceState(null, '', location.pathname + location.search + hash)
}
