import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
  type WheelEvent,
} from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

export type ScrollExpandMediaHandle = {
  /** Completes the hero animation and reveals page content so in-page anchors work */
  expandToContent: () => void
}

interface ScrollExpandMediaProps {
  mediaType?: 'video' | 'image'
  mediaSrc: string
  posterSrc?: string
  bgImageSrc: string
  heroContent?: ReactNode
  brandName?: string
  headline?: string
  subtitle?: string
  scrollToExpand?: string
  title?: string
  date?: string
  textBlend?: boolean
  heroActions?: ReactNode
  children?: ReactNode
}

export const ScrollExpandMedia = forwardRef<ScrollExpandMediaHandle, ScrollExpandMediaProps>(
  function ScrollExpandMedia(
    {
      mediaType = 'video',
      mediaSrc,
      posterSrc,
      bgImageSrc,
      heroContent,
      brandName,
      headline,
      subtitle,
      scrollToExpand,
      title,
      date,
      textBlend,
      heroActions,
      children,
    },
    ref
  ) {
    const [scrollProgress, setScrollProgress] = useState(0)
    const [showContent, setShowContent] = useState(false)
    const [mediaFullyExpanded, setMediaFullyExpanded] = useState(false)
    const [touchStartY, setTouchStartY] = useState(0)
    const [isMobileState, setIsMobileState] = useState(false)
    const sectionRef = useRef<HTMLDivElement | null>(null)
    const pointerX = useMotionValue(0)
    const pointerY = useMotionValue(0)
    const smoothPointerX = useSpring(pointerX, { stiffness: 90, damping: 18, mass: 0.5 })
    const smoothPointerY = useSpring(pointerY, { stiffness: 90, damping: 18, mass: 0.5 })
    const mediaParallaxX = useTransform(smoothPointerX, [-1, 1], isMobileState ? [-4, 4] : [-16, 16])
    const mediaParallaxY = useTransform(smoothPointerY, [-1, 1], isMobileState ? [-3, 3] : [-12, 12])
    const contentParallaxX = useTransform(smoothPointerX, [-1, 1], isMobileState ? [0, 0] : [10, -10])
    const contentParallaxY = useTransform(smoothPointerY, [-1, 1], isMobileState ? [0, 0] : [8, -8])
    const glowParallaxX = useTransform(smoothPointerX, [-1, 1], isMobileState ? [-2, 2] : [-24, 24])
    const glowParallaxY = useTransform(smoothPointerY, [-1, 1], isMobileState ? [-2, 2] : [-18, 18])
    const secondaryGlowParallaxX = useTransform(glowParallaxX, (v: number) => -v * 0.8)
    const secondaryGlowParallaxY = useTransform(glowParallaxY, (v: number) => -v * 0.8)
    const lowerGlowParallaxX = useTransform(glowParallaxX, (v: number) => v * 0.5)
    const lowerGlowParallaxY = useTransform(glowParallaxY, (v: number) => v * 0.35)

    const resolvedBrand = brandName ?? (title ? title.split(' ')[0] : '') ?? ''
    const resolvedHeadline = headline ?? (title ? title.split(' ').slice(1).join(' ') : '') ?? ''
    const resolvedSubtitle = subtitle ?? date ?? ''

    useImperativeHandle(ref, () => ({
      expandToContent: () => {
        setScrollProgress(1)
        setMediaFullyExpanded(true)
        setShowContent(true)
      },
    }))

    useEffect(() => {
      setScrollProgress(0)
      setShowContent(false)
      setMediaFullyExpanded(false)
    }, [mediaType])

    useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
        if (mediaFullyExpanded && e.deltaY < 0 && window.scrollY <= 5) {
          setMediaFullyExpanded(false)
          e.preventDefault()
        } else if (!mediaFullyExpanded) {
          e.preventDefault()
          const scrollDelta = e.deltaY * 0.0009
          const newProgress = Math.min(Math.max(scrollProgress + scrollDelta, 0), 1)
          setScrollProgress(newProgress)

          if (newProgress >= 1) {
            setMediaFullyExpanded(true)
            setShowContent(true)
          } else if (newProgress < 0.75) {
            setShowContent(false)
          }
        }
      }

      const handleTouchStart = (e: TouchEvent) => {
        setTouchStartY(e.touches[0].clientY)
      }

      const handleTouchMove = (e: TouchEvent) => {
        if (!touchStartY) return

        const touchY = e.touches[0].clientY
        const deltaY = touchStartY - touchY

        if (mediaFullyExpanded && deltaY < -20 && window.scrollY <= 5) {
          setMediaFullyExpanded(false)
          e.preventDefault()
        } else if (!mediaFullyExpanded) {
          e.preventDefault()
          const scrollFactor = deltaY < 0 ? 0.008 : 0.005
          const scrollDelta = deltaY * scrollFactor
          const newProgress = Math.min(Math.max(scrollProgress + scrollDelta, 0), 1)
          setScrollProgress(newProgress)

          if (newProgress >= 1) {
            setMediaFullyExpanded(true)
            setShowContent(true)
          } else if (newProgress < 0.75) {
            setShowContent(false)
          }

          setTouchStartY(touchY)
        }
      }

      const handleTouchEnd = () => {
        setTouchStartY(0)
      }

      const handleScroll = () => {
        if (!mediaFullyExpanded) {
          window.scrollTo(0, 0)
        }
      }

      window.addEventListener('wheel', handleWheel as unknown as EventListener, {
        passive: false,
      })
      window.addEventListener('scroll', handleScroll as EventListener)
      window.addEventListener('touchstart', handleTouchStart as unknown as EventListener, {
        passive: false,
      })
      window.addEventListener('touchmove', handleTouchMove as unknown as EventListener, {
        passive: false,
      })
      window.addEventListener('touchend', handleTouchEnd as EventListener)

      return () => {
        window.removeEventListener('wheel', handleWheel as unknown as EventListener)
        window.removeEventListener('scroll', handleScroll as EventListener)
        window.removeEventListener('touchstart', handleTouchStart as unknown as EventListener)
        window.removeEventListener('touchmove', handleTouchMove as unknown as EventListener)
        window.removeEventListener('touchend', handleTouchEnd as EventListener)
      }
    }, [scrollProgress, mediaFullyExpanded, touchStartY])

    useEffect(() => {
      const checkIfMobile = () => {
        setIsMobileState(window.innerWidth < 768)
      }

      checkIfMobile()
      window.addEventListener('resize', checkIfMobile)

      return () => window.removeEventListener('resize', checkIfMobile)
    }, [])

    useEffect(() => {
      const node = sectionRef.current
      if (!node || isMobileState) return

      const handlePointerMove = (event: PointerEvent) => {
        const rect = node.getBoundingClientRect()
        const nextX = ((event.clientX - rect.left) / rect.width) * 2 - 1
        const nextY = ((event.clientY - rect.top) / rect.height) * 2 - 1
        pointerX.set(Math.max(-1, Math.min(1, nextX)))
        pointerY.set(Math.max(-1, Math.min(1, nextY)))
      }

      const handlePointerLeave = () => {
        pointerX.set(0)
        pointerY.set(0)
      }

      node.addEventListener('pointermove', handlePointerMove)
      node.addEventListener('pointerleave', handlePointerLeave)

      return () => {
        node.removeEventListener('pointermove', handlePointerMove)
        node.removeEventListener('pointerleave', handlePointerLeave)
      }
    }, [isMobileState, pointerX, pointerY])

    const mediaWidth = (isMobileState ? 320 : 420) + scrollProgress * (isMobileState ? 620 : 1080)
    const mediaHeight = (isMobileState ? 440 : 560) + scrollProgress * (isMobileState ? 260 : 260)
    const textTranslateX = scrollProgress * (isMobileState ? 54 : 42)
    const drift = textTranslateX * 0.5
    const mediaScale = 1.035 - scrollProgress * 0.035
    const mediaTranslateY = 18 - scrollProgress * 18
    const heroLift = 24 - scrollProgress * 24
    const heroOpacity = 1 - scrollProgress * 0.08
    const glassOpacity = 0.18 - scrollProgress * 0.08
    const glowOpacity = 0.55 - scrollProgress * 0.18

    const blendClass = textBlend ? 'mix-blend-difference' : ''

    return (
      <div ref={sectionRef} className="overflow-x-hidden transition-colors duration-700 ease-in-out">
        <section className="relative flex min-h-[100dvh] flex-col items-center justify-start">
          <div className="relative flex min-h-[100dvh] w-full flex-col items-center">
            <div className="absolute inset-0 z-0 h-full" style={{ opacity: 0.96 - scrollProgress * 0.66 }}>
              <img
                src={bgImageSrc}
                alt=""
                width={1920}
                height={1080}
                className="h-screen w-screen object-cover object-center"
                decoding="async"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,9,21,0.58)_0%,rgba(6,13,31,0.42)_28%,rgba(6,13,31,0.72)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,199,64,0.16),transparent_28%),radial-gradient(circle_at_bottom,rgba(7,17,38,0.18),rgba(6,13,31,0.72)_72%)]" />
              <div className="mk-noise absolute inset-0" />
            </div>

            <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
              <motion.div
                className="absolute top-[14%] left-1/2 h-[42vw] w-[42vw] min-h-[280px] min-w-[280px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(240,165,0,0.2)_0%,rgba(240,165,0,0.08)_34%,transparent_70%)] blur-3xl"
                style={{
                  opacity: 0.5 - scrollProgress * 0.22,
                  x: glowParallaxX,
                  y: glowParallaxY,
                  scale: 1 + scrollProgress * 0.14,
                }}
              />
              <motion.div
                className="absolute right-[-8%] bottom-[12%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(64,121,255,0.12)_0%,transparent_68%)] blur-3xl"
                style={{
                  opacity: 0.7 - scrollProgress * 0.25,
                  x: secondaryGlowParallaxX,
                  y: secondaryGlowParallaxY,
                  scale: 1 + scrollProgress * 0.12,
                }}
              />
            </div>

            <div className="relative z-10 container mx-auto flex flex-col items-center justify-start">
              <div className="relative flex min-h-[100dvh] w-full flex-col items-center px-4 pt-20">
                <motion.div
                  className="absolute top-1/2 left-1/2 z-[1] w-full max-w-[95vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[34px] border border-white/10 transition-none"
                  style={{
                    width: `${mediaWidth}px`,
                    height: `${mediaHeight}px`,
                    maxWidth: '95vw',
                    maxHeight: '80vh',
                    boxShadow:
                      '0 30px 80px rgba(2, 8, 24, 0.42), 0 0 0 1px rgba(255, 255, 255, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                    x: mediaParallaxX,
                    y: mediaParallaxY,
                  }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 z-[1] rounded-[34px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_16%,rgba(255,255,255,0)_34%)]"
                    style={{ opacity: glassOpacity }}
                  />
                  <div className="pointer-events-none absolute -top-[24%] left-[-14%] z-[1] h-[36%] w-[46%] rotate-[9deg] bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,248,225,0.12)_48%,rgba(255,255,255,0)_100%)] blur-2xl" />
                  <motion.div
                    className="pointer-events-none absolute left-1/2 bottom-[-20%] z-[1] h-[42%] w-[54%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,196,86,0.18)_0%,rgba(255,196,86,0.08)_32%,transparent_68%)] blur-3xl"
                    style={{
                      opacity: glowOpacity,
                      x: lowerGlowParallaxX,
                      y: lowerGlowParallaxY,
                      scale: 1 + scrollProgress * 0.06,
                    }}
                  />
                  <div className="pointer-events-none absolute inset-x-[12%] top-0 z-[2] h-px bg-gradient-to-r from-transparent via-[rgba(255,232,192,0.85)] to-transparent" />
                  {mediaType === 'video' ? (
                    mediaSrc.includes('youtube.com') ? (
                      <div className="pointer-events-none relative h-full w-full">
                        <iframe
                          width="100%"
                          height="100%"
                          src={
                            mediaSrc.includes('embed')
                              ? `${mediaSrc}${mediaSrc.includes('?') ? '&' : '?'}autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&disablekb=1&modestbranding=1`
                              : `${mediaSrc.replace('watch?v=', 'embed/')}?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&disablekb=1&modestbranding=1&playlist=${mediaSrc.split('v=')[1]}`
                          }
                          className="h-full w-full rounded-xl border-0"
                          title="Hero video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                        <div className="pointer-events-none absolute inset-0 z-10" />

                        <div
                          className="absolute inset-0 rounded-[34px] bg-[linear-gradient(180deg,rgba(5,10,24,0.18)_0%,rgba(5,10,24,0.04)_26%,rgba(5,10,24,0.52)_100%)]"
                          style={{ opacity: 0.74 - scrollProgress * 0.22 }}
                        />
                      </div>
                    ) : (
                      <div className="pointer-events-none relative h-full w-full">
                        <video
                          src={mediaSrc}
                          poster={posterSrc}
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="auto"
                          className="h-full w-full rounded-xl object-cover"
                          controls={false}
                          disablePictureInPicture
                          disableRemotePlayback
                        />
                        <div className="pointer-events-none absolute inset-0 z-10" />

                        <div
                          className="absolute inset-0 rounded-[34px] bg-[linear-gradient(180deg,rgba(5,10,24,0.18)_0%,rgba(5,10,24,0.04)_26%,rgba(5,10,24,0.52)_100%)]"
                          style={{ opacity: 0.74 - scrollProgress * 0.22 }}
                        />
                      </div>
                    )
                  ) : (
                    <div className="relative h-full w-full">
                      <motion.img
                        src={mediaSrc}
                        alt={resolvedBrand || 'Hero media'}
                        width={1280}
                        height={720}
                        className="h-full w-full object-cover"
                        decoding="async"
                        animate={{
                          scale: mediaScale,
                          y: mediaTranslateY,
                        }}
                        transition={{ duration: 0.28, ease: 'easeOut' }}
                      />

                      <div
                        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,19,0.18)_0%,rgba(3,8,19,0.26)_28%,rgba(3,8,19,0.68)_100%)]"
                        style={{ opacity: 0.84 - scrollProgress * 0.12 }}
                      />
                      <div
                        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,196,86,0.14)_0%,transparent_28%),radial-gradient(circle_at_bottom_right,rgba(6,13,31,0.2),rgba(6,13,31,0.48)_74%)]"
                        style={{ opacity: 0.8 - scrollProgress * 0.18 }}
                      />
                      <div
                        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,239,212,0.06)_0%,transparent_38%),linear-gradient(180deg,rgba(3,8,19,0)_0%,rgba(3,8,19,0.18)_100%)]"
                        style={{ opacity: 0.85 - scrollProgress * 0.22 }}
                      />
                    </div>
                  )}
                </motion.div>

                <div className="flex w-full flex-1 flex-col justify-end pb-8 md:pb-14">
                  {heroContent ? (
                    <motion.div
                      className={`pointer-events-auto relative z-[2] mx-auto w-full max-w-[min(100%,1120px)] px-2 ${blendClass}`}
                      style={{
                        transform: `translateY(${scrollProgress * 28}px)`,
                        x: contentParallaxX,
                        y: contentParallaxY,
                      }}
                      animate={{
                        y: heroLift,
                        opacity: heroOpacity,
                      }}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                    >
                      {heroContent}
                    </motion.div>
                  ) : (
                    <>
                      <div
                        className={`pointer-events-none relative z-[2] mx-auto flex w-full max-w-[min(100%,1100px)] flex-col items-center gap-2 px-2 text-center md:gap-3 ${blendClass}`}
                      >
                        {resolvedBrand && (
                          <motion.p
                            className="font-display text-[clamp(3.25rem,11vw,7.25rem)] leading-[0.92] font-bold tracking-[-0.03em]"
                            style={{
                              transform: `translateX(-${drift}vw)`,
                            }}
                          >
                            <span className="inline-block bg-gradient-to-b from-[#fff8e8] from-15% via-[var(--mk-gold)] via-50% to-[#c77a00] bg-clip-text text-transparent [filter:drop-shadow(0_4px_28px_rgba(0,0,0,0.45))]">
                              {resolvedBrand}
                            </span>
                          </motion.p>
                        )}
                        {resolvedHeadline && (
                          <motion.p
                            className="font-display mt-1 max-w-[22ch] text-[clamp(1.65rem,4.8vw,3.35rem)] leading-[1.08] font-semibold tracking-[-0.02em] text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.55)] md:mt-2"
                            style={{
                              transform: `translateX(${drift}vw)`,
                            }}
                          >
                            {resolvedHeadline}
                          </motion.p>
                        )}
                        {resolvedSubtitle && (
                          <p className="label-font mt-5 max-w-xl text-[11px] font-semibold tracking-[0.3em] text-[var(--mk-gold2)] uppercase md:mt-7 md:text-[12px] md:tracking-[0.34em]">
                            {resolvedSubtitle}
                          </p>
                        )}
                        {scrollToExpand && (
                          <p className="label-font mt-3 text-[10px] font-medium tracking-[0.36em] text-[var(--mk-gold)]/90 uppercase md:mt-4 md:text-[11px] md:tracking-[0.4em]">
                            {scrollToExpand}
                          </p>
                        )}
                      </div>

                      {heroActions && (
                        <div className="pointer-events-auto relative z-[2] mx-auto mt-8 flex max-w-[min(100%,560px)] flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5 md:mt-10">
                          {heroActions}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <motion.section
                className={`flex w-full flex-col px-8 md:px-16 lg:py-20 ${showContent ? 'py-10' : 'max-h-0 overflow-hidden py-0'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: showContent ? 1 : 0 }}
                transition={{ duration: 0.7 }}
              >
                {children}
              </motion.section>
            </div>
          </div>
        </section>
      </div>
    )
  }
)

export default ScrollExpandMedia
