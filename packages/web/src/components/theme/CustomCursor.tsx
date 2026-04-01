import { useEffect, useRef } from 'react'

const INTERACTIVE =
  'a[href], button, [role="button"], input, select, textarea, label, .mukwano-cursor-hover'

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let mx = 0
    let my = 0
    let rx = 0
    let ry = 0

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
      dot.style.left = `${mx}px`
      dot.style.top = `${my}px`
    }
    document.addEventListener('mousemove', onMove)

    /** Higher = ring follows pointer faster (0.15 felt sluggish in-app). */
    const follow = 0.34
    let frame = 0
    const anim = () => {
      rx += (mx - rx) * follow
      ry += (my - ry) * follow
      ring.style.left = `${rx}px`
      ring.style.top = `${ry}px`
      frame = requestAnimationFrame(anim)
    }
    frame = requestAnimationFrame(anim)

    const onEnter = () => {
      dot.style.width = '14px'
      dot.style.height = '14px'
      ring.style.width = '52px'
      ring.style.height = '52px'
      ring.style.borderColor = 'rgba(240,165,0,.8)'
    }
    const onLeave = () => {
      dot.style.width = '8px'
      dot.style.height = '8px'
      ring.style.width = '36px'
      ring.style.height = '36px'
      ring.style.borderColor = 'rgba(240,165,0,.5)'
    }

    const onOver = (e: PointerEvent) => {
      const t = e.target as Element | null
      if (t?.closest(INTERACTIVE)) onEnter()
    }
    const onOut = (e: PointerEvent) => {
      const t = e.target as Element | null
      const rel = e.relatedTarget as Element | null
      if (t?.closest(INTERACTIVE) && (!rel || !rel.closest(INTERACTIVE))) onLeave()
    }
    document.addEventListener('pointerover', onOver, true)
    document.addEventListener('pointerout', onOut, true)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('pointerover', onOver, true)
      document.removeEventListener('pointerout', onOut, true)
    }
  }, [])

  return (
    <>
      <div
        ref={dotRef}
        className="pointer-events-none fixed z-[10000] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--mk-gold)] transition-[width,height,background] duration-100 ease-out"
        aria-hidden
      />
      <div
        ref={ringRef}
        className="pointer-events-none fixed z-[9999] h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(240,165,0,0.5)] mix-blend-screen transition-[width,height,border-color] duration-75 ease-out"
        aria-hidden
      />
    </>
  )
}
