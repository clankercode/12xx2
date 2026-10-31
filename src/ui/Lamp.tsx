import { useEffect, useRef } from 'react'

/** Fine pointers only, and not for reduced motion; the dots stay static otherwise (global.css hides the layer too). */
const ACTIVE = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

/** Lamp size and dot pitch; keep in step with `.lamp` in global.css. */
const SIZE = 400
const PITCH = 28

/**
 * Lights the background dots near the pointer. One passive pointermove listener and at most two transform
 * writes per frame (no layout, no paint); nothing runs while the pointer is still.
 */
export function Lamp({ calm }: { calm: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    const dots = el?.firstElementChild as HTMLElement | null
    if (!el || !dots) return
    const mq = matchMedia(ACTIVE)
    let x = 0
    let y = 0
    let frame = 0
    let on = false
    const paint = () => {
      frame = 0
      const left = Math.round(x) - SIZE / 2
      const top = Math.round(y) - SIZE / 2
      el.style.transform = `translate(${left}px, ${top}px)`
      // Shift the dots back so they sit exactly on the page's lattice.
      const mod = (n: number) => ((n % PITCH) + PITCH) % PITCH
      dots.style.transform = `translate(${-mod(left)}px, ${-mod(top)}px)`
      if (!on) {
        on = true
        el.setAttribute('data-on', '')
      }
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      x = e.clientX
      y = e.clientY
      if (!frame) frame = requestAnimationFrame(paint)
    }
    // Leaving the window (or switching away) fades the lamp out.
    const hide = () => {
      cancelAnimationFrame(frame)
      frame = 0
      on = false
      el.removeAttribute('data-on')
    }
    const out = (e: PointerEvent) => {
      if (!e.relatedTarget) hide()
    }
    const attach = () => {
      if (mq.matches) {
        addEventListener('pointermove', move, { passive: true })
        document.addEventListener('pointerout', out, { passive: true })
        addEventListener('blur', hide)
      } else detach()
    }
    const detach = () => {
      removeEventListener('pointermove', move)
      document.removeEventListener('pointerout', out)
      removeEventListener('blur', hide)
      hide()
    }
    attach()
    mq.addEventListener('change', attach)
    return () => {
      mq.removeEventListener('change', attach)
      detach()
    }
  }, [])
  return (
    <div ref={ref} className="lamp" data-calm={calm ? '' : undefined} aria-hidden="true">
      <i />
    </div>
  )
}
