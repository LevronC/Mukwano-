import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { CustomCursor } from '@/components/theme/CustomCursor'
import { WebGLBackground } from '@/components/theme/WebGLBackground'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export function AppThemeShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const isSplash = pathname === '/'
  const reducedMotion = usePrefersReducedMotion()
  const showAmbient = !reducedMotion
  const showCursor = !reducedMotion && !isSplash

  useEffect(() => {
    const root = document.documentElement
    if (showCursor) root.classList.add('mk-theme-cursor')
    else root.classList.remove('mk-theme-cursor')
    return () => root.classList.remove('mk-theme-cursor')
  }, [showCursor])

  return (
    <div className="relative min-h-dvh">
      {showAmbient && <WebGLBackground />}
      <div
        className="mk-noise pointer-events-none fixed inset-0 z-[1]"
        aria-hidden
      />
      <div
        className="mk-radial-overlay pointer-events-none fixed inset-0 z-[1]"
        aria-hidden
      />
      {showCursor && <CustomCursor />}
      <div className="relative z-[2] min-h-dvh">{children}</div>
    </div>
  )
}
