import { useEffect, useRef, useState } from 'react'

/** Tracks an element's content width (SVG charts draw at real pixel size so text stays legible). */
export function useWidth<T extends HTMLElement>(initial = 640) {
  const ref = useRef<T>(null)
  const [w, setW] = useState(initial)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth || initial)
    const ro = new ResizeObserver(([e]) => e && setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [initial])
  return [ref, w] as const
}

/** True when the visitor asked for less motion. */
export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
