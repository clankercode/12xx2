import { useEffect, type ReactNode, type RefObject } from 'react'

/**
 * Route focus for lazy pages. On navigation the router focuses the page's heading, but a lazy page
 * shows this fallback first: the router focuses it instead, and the page takes focus back when it
 * mounts (focus is lost when the fallback is removed). Not on first load: nothing focuses the fallback then.
 */
let pending = false

export function LazyFallback({ children }: { children: ReactNode }) {
  return (
    <p
      className="wrap muted"
      tabIndex={-1}
      data-route-focus
      onFocus={() => (pending = true)}
      // Moving on to another element (not losing focus to removal) cancels the hand-back.
      onBlur={e => e.relatedTarget && (pending = false)}
    >
      {children}
    </p>
  )
}

/** Call from a lazy page with its main heading: focuses it if the fallback had focus when it was replaced. */
export function useLazyRouteFocus(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!pending) return
    pending = false
    const h = ref.current
    if (!h || (document.activeElement && document.activeElement !== document.body)) return
    if (!h.hasAttribute('tabindex')) h.tabIndex = -1
    h.setAttribute('data-route-focus', '')
    h.focus({ preventScroll: true })
  }, [ref])
}
