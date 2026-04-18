import { useEffect, useState } from 'react'

function prefersSimpleLandingHero(): boolean {
  if (typeof window === 'undefined') return true
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(max-width: 767px)').matches
  )
}

/**
 * Whether the landing page should use the static hero instead of scroll-driven expansion.
 * Touch and narrow viewports get native scrolling — the wheel/touch-jacked hero is desktop-only.
 */
export function useSimpleLandingHero() {
  const [simple, setSimple] = useState(prefersSimpleLandingHero)

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)')
    const narrow = window.matchMedia('(max-width: 767px)')
    const sync = () => setSimple(coarse.matches || narrow.matches)
    sync()
    coarse.addEventListener('change', sync)
    narrow.addEventListener('change', sync)
    return () => {
      coarse.removeEventListener('change', sync)
      narrow.removeEventListener('change', sync)
    }
  }, [])

  return simple
}
