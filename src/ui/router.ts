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
  | { page: 'review' }
  | { page: 'shared'; payload: string }
  | { page: 'compare'; mine: string; theirs: string }
  | { page: 'method' }
  | { page: 'criticisms' }
  /** Optional slug: "#/ideologies/<slug>" scrolls to that ideology. */
  | { page: 'ideologies'; slug?: string }
  | { page: 'map' }
  | { page: 'privacy' }
  | { page: 'history' }
  | { page: 'run'; id: string }
  | { page: 'runs'; a: string; b: string }
  /** Dev-only prototype lab ("#/lab?p=…&mode=…"); query is the raw part after "?". */
  | { page: 'lab'; query: string }

const PAGES = ['quiz', 'context', 'place', 'results', 'review', 'method', 'criticisms', 'ideologies', 'privacy', 'history', 'map'] as const

/** The prototype lab only exists in dev builds or when served from this machine. */
export function labAllowed(): boolean {
  if (import.meta.env?.DEV) return true
  return typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname)
}

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '')
  const lab = h.match(/^\/lab(?:\?(.*))?$/)
  if (lab && labAllowed()) return { page: 'lab', query: lab[1] ?? '' }
  if (h.startsWith('r=')) return { page: 'shared', payload: h.slice(2) }
  if (h.startsWith('c=')) {
    const [mine = '', theirs = ''] = h.slice(2).split('~')
    return { page: 'compare', mine, theirs }
  }
  const ideology = h.match(/^\/ideologies\/([a-z0-9-]{1,64})$/)
  if (ideology) return { page: 'ideologies', slug: ideology[1]! }
  const run = h.match(/^\/run\/([0-9a-f]{8,32})$/)
  if (run) return { page: 'run', id: run[1]! }
  const pair = h.match(/^\/runs\/([0-9a-f]{8,32})~([0-9a-f]{8,32})$/)
  if (pair) return { page: 'runs', a: pair[1]!, b: pair[2]! }
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

/** Like go, but replaces the current history entry, so Back doesn't return to a step that's over. */
export function goReplace(hash: string) {
  if (location.hash === hash) return
  location.replace(hash)
  window.scrollTo({ top: 0 })
}

/** Replace the fragment without adding a history entry (used when sharing). */
export function replaceHash(hash: string) {
  history.replaceState(null, '', location.pathname + location.search + hash)
}

/** Takes the result part of a pasted 12 Axes² link: "#r=…" (or a bare code). */
export function resultFromLink(text: string): string | null {
  const t = text.trim()
  const m = t.match(/#r=([A-Za-z0-9_-]+Z)/) ?? t.match(/^([A-Za-z0-9_-]+Z)$/)
  return m ? m[1]! : null
}
