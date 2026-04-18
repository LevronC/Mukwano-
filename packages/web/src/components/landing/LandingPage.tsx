import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { ScrollExpandMedia, type ScrollExpandMediaHandle } from '@/components/ui/scroll-expansion-hero'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useSimpleLandingHero } from '@/hooks/useSimpleLandingHero'
import { LegalModals } from '@/components/landing/LegalModals'
import { LandingSections } from '@/components/landing/LandingSections'

const HERO = {
  media: '/assets/landing/hero-expand-cape-town.png',
  bg: '/assets/landing/hero-bg-alpine.png',
}

export function LandingPage() {
  const heroScrollRef = useRef<ScrollExpandMediaHandle>(null)
  const [introGone, setIntroGone] = useState(false)
  const [navVisible, setNavVisible] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const simpleLandingHero = useSimpleLandingHero()
  const staticHero = reducedMotion || simpleLandingHero

  const scrollToSection = useCallback((id: string) => {
    const go = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (heroScrollRef.current) {
      heroScrollRef.current.expandToContent()
      window.setTimeout(go, 120)
    } else {
      go()
    }
  }, [])

  const onInPageNavClick = useCallback(
    (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault()
      scrollToSection(id)
    },
    [scrollToSection]
  )

  useEffect(() => {
    const t1 = setTimeout(() => setIntroGone(true), 2600)
    const t2 = setTimeout(() => setNavVisible(true), 3200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  useEffect(() => {
    if (termsOpen || privacyOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [termsOpen, privacyOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTermsOpen(false)
        setPrivacyOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const sections = (
    <LandingSections onOpenTerms={() => setTermsOpen(true)} onOpenPrivacy={() => setPrivacyOpen(true)} />
  )

  return (
    <div className="relative min-h-dvh bg-[var(--mk-navy)]">
      <div
        className={`fixed inset-0 z-[500] flex flex-col items-center justify-center bg-[var(--mk-navy)] transition-[opacity,visibility] duration-1000 ease-out ${
          introGone ? 'pointer-events-none invisible opacity-0' : 'opacity-100'
        }`}
        aria-hidden={introGone}
      >
        <div
          className={`transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            introGone ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          <div className="mx-auto w-[130px] rounded-full bg-white/97 p-4 shadow-[0_12px_48px_rgba(0,0,0,0.35)]">
            <img src="/assets/mukwano-logo.png" alt="" width={300} height={300} className="h-full w-full object-contain" />
          </div>
        </div>
        <div
          className={`mt-8 h-0.5 bg-gradient-to-r from-transparent via-[var(--mk-gold)] to-transparent transition-[width] duration-[1200ms] ease-out ${
            introGone ? 'w-0' : 'w-[260px]'
          }`}
        />
        <p
          className={`label-font mt-4 text-[11px] tracking-[5px] text-[var(--mk-muted)] uppercase transition-opacity duration-500 ${
            introGone ? 'opacity-0' : 'opacity-100 delay-500'
          }`}
        >
          Building Together
        </p>
      </div>

      <header
        className={`fixed top-0 right-0 left-0 z-[100] flex items-center justify-between px-4 py-4 transition-opacity duration-700 sm:px-6 md:px-16 md:py-6 ${
          navVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <a href="#" className="flex items-center gap-3 no-underline">
          <div className="rounded-xl bg-white/97 p-1.5">
            <img src="/assets/mukwano-logo.png" alt="Mukwano" width={300} height={300} className="h-7 w-auto object-contain md:h-8" />
          </div>
          <span className="font-display hidden text-xl font-bold tracking-wide text-[var(--mk-gold)] sm:block">Mukwano</span>
        </a>
        <ul className="hidden list-none gap-10 md:flex">
          <li>
            <a
              href="#features"
              onClick={onInPageNavClick('features')}
              className="text-[12px] font-semibold tracking-[2.5px] text-[var(--mk-muted)] uppercase transition-colors hover:text-[var(--mk-gold)]"
            >
              Features
            </a>
          </li>
          <li>
            <a
              href="#how-it-works"
              onClick={onInPageNavClick('how-it-works')}
              className="text-[12px] font-semibold tracking-[2.5px] text-[var(--mk-muted)] uppercase transition-colors hover:text-[var(--mk-gold)]"
            >
              How It Works
            </a>
          </li>
          <li>
            <a
              href="#values"
              onClick={onInPageNavClick('values')}
              className="text-[12px] font-semibold tracking-[2.5px] text-[var(--mk-muted)] uppercase transition-colors hover:text-[var(--mk-gold)]"
            >
              Values
            </a>
          </li>
          <li>
            <a
              href="#faq"
              onClick={onInPageNavClick('faq')}
              className="text-[12px] font-semibold tracking-[2.5px] text-[var(--mk-muted)] uppercase transition-colors hover:text-[var(--mk-gold)]"
            >
              FAQ
            </a>
          </li>
        </ul>
        <div className="flex items-center gap-3 md:gap-[18px]">
          <Link
            to="/login"
            className="hidden text-[11px] font-semibold tracking-[2.5px] text-[var(--mk-muted)] uppercase transition-colors hover:text-[var(--mk-gold)] sm:block md:text-[12px]"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-[30px] border border-[rgba(240,165,0,0.35)] bg-transparent px-4 py-2 text-[10px] font-semibold tracking-[1.8px] text-[var(--mk-gold)] uppercase transition-all hover:bg-[var(--mk-gold)] hover:text-[var(--mk-navy)] hover:shadow-[0_0_30px_rgba(240,165,0,0.3)] sm:px-5 sm:py-2.5 sm:text-[11px] md:px-7 md:text-[12px]"
          >
            Join a Circle
          </Link>
        </div>
      </header>

      <div className="pointer-events-none absolute top-0 right-0 left-0 z-[99] h-px bg-gradient-to-r from-transparent via-[rgba(240,165,0,0.15)] to-transparent md:left-16 md:right-16" />

      {staticHero ? (
        <>
          <LandingStaticHero />
          {sections}
        </>
      ) : (
        <ScrollExpandMedia
          ref={heroScrollRef}
          mediaType="image"
          mediaSrc={HERO.media}
          bgImageSrc={HERO.bg}
          heroContent={
            <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center text-center">
              <div className="relative mb-5 flex justify-center md:mb-6">
                <div className="absolute inset-[-18px] rounded-full border border-[rgba(240,165,0,0.12)]" />
                <div className="absolute inset-[-34px] rounded-full border border-[rgba(240,165,0,0.05)]" />
                <div className="rounded-full bg-[rgba(248,244,236,0.98)] p-3 shadow-[0_20px_65px_rgba(0,0,0,0.36)] ring-1 ring-[rgba(240,165,0,0.18)]">
                  <img
                    src="/assets/mukwano-logo.png"
                    alt="Mukwano"
                    width={300}
                    height={300}
                    className="h-20 w-20 rounded-full object-cover sm:h-24 sm:w-24 md:h-32 md:w-32"
                  />
                </div>
              </div>

              <p className="label-font text-[9px] font-semibold tracking-[0.32em] text-[var(--mk-gold3)] uppercase sm:text-[10px] md:text-[11px]">
                Building Together
              </p>

              <h1 className="font-display mt-3 max-w-[11ch] text-[clamp(2.6rem,11vw,6.1rem)] leading-[0.92] font-bold tracking-[-0.045em] text-[var(--mk-offwhite)]">
                Where <span className="text-[var(--mk-gold3)] italic">Friendship</span>
                <br />
                Builds Wealth
              </h1>

              <p className="mt-4 max-w-[620px] px-2 text-[14px] leading-7 text-[rgba(255,255,255,0.9)] sm:text-[15px] md:px-0 md:text-[17px]">
                Mukwano helps trusted communities save together, invest with clarity, and grow wealth through shared
                circles.
              </p>

              <p className="font-display mt-4 px-2 text-[clamp(1rem,3.6vw,1.6rem)] font-semibold italic tracking-[0.01em] text-[var(--mk-gold2)]">
                Trusted circles. Shared growth.
              </p>

              <div className="mt-7 flex w-full max-w-[520px] flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
                <Link
                  to="/signup"
                  className="mukwano-btn-primary inline-flex w-full min-w-0 items-center justify-center rounded-[50px] px-8 py-4 text-[13px] tracking-[2px] uppercase sm:min-w-[220px] sm:px-11"
                >
                  Create a Circle
                </Link>
                <a
                  href="#how-it-works"
                  onClick={onInPageNavClick('how-it-works')}
                  className="inline-flex w-full min-w-0 items-center justify-center rounded-[50px] border border-white/18 bg-[rgba(6,13,31,0.34)] px-8 py-4 text-[13px] font-medium tracking-[2px] text-white uppercase backdrop-blur-md transition-all hover:border-[var(--mk-gold)] hover:bg-[rgba(6,13,31,0.52)] hover:text-[var(--mk-gold2)] sm:min-w-[220px] sm:px-11"
                >
                  How It Works
                </a>
              </div>
            </div>
          }
        >
          {sections}
        </ScrollExpandMedia>
      )}

      <LegalModals
        termsOpen={termsOpen}
        privacyOpen={privacyOpen}
        onCloseTerms={() => setTermsOpen(false)}
        onClosePrivacy={() => setPrivacyOpen(false)}
      />
    </div>
  )
}

function LandingStaticHero() {
  return (
    <section className="relative min-h-dvh">
      <img src={HERO.bg} alt="" className="absolute inset-0 h-full w-full object-cover" width={1920} height={1080} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,9,21,0.58)_0%,rgba(6,13,31,0.42)_28%,rgba(6,13,31,0.72)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,199,64,0.16),transparent_28%),radial-gradient(circle_at_bottom,rgba(7,17,38,0.18),rgba(6,13,31,0.72)_72%)]" />
      <div className="mk-noise absolute inset-0" />
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-end px-5 pt-24 pb-10 text-center sm:pt-28 sm:pb-12 md:pb-16">
        <div className="relative mb-8 hidden max-h-[min(44vh,420px)] w-full max-w-[320px] items-center justify-center overflow-hidden rounded-[34px] border border-white/10 shadow-[0_30px_80px_rgba(2,8,24,0.42)] sm:mb-10 sm:max-h-[min(50vh,480px)] sm:max-w-[420px] md:max-w-[480px] md:flex">
          <div className="pointer-events-none absolute inset-x-[12%] top-0 z-[2] h-px bg-gradient-to-r from-transparent via-[rgba(255,232,192,0.85)] to-transparent" />
          <img
            src={HERO.media}
            alt=""
            width={1280}
            height={720}
            className="max-h-[50vh] w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,19,0.06)_0%,rgba(3,8,19,0.12)_30%,rgba(3,8,19,0.58)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,196,86,0.18)_0%,transparent_32%),radial-gradient(circle_at_bottom_right,rgba(6,13,31,0.14),rgba(6,13,31,0.4)_74%)]" />
        </div>
        <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center px-2 text-center">
          <div className="relative mb-5 flex justify-center md:mb-6">
            <div className="absolute inset-[-18px] rounded-full border border-[rgba(240,165,0,0.12)]" />
            <div className="absolute inset-[-34px] rounded-full border border-[rgba(240,165,0,0.05)]" />
            <div className="rounded-full bg-[rgba(248,244,236,0.98)] p-3 shadow-[0_20px_65px_rgba(0,0,0,0.36)] ring-1 ring-[rgba(240,165,0,0.18)]">
              <img
                src="/assets/mukwano-logo.png"
                alt="Mukwano"
                width={300}
                height={300}
                className="h-20 w-20 rounded-full object-cover sm:h-24 sm:w-24 md:h-32 md:w-32"
              />
            </div>
          </div>

          <p className="label-font text-[9px] font-semibold tracking-[0.32em] text-[var(--mk-gold3)] uppercase sm:text-[10px] md:text-[11px]">
            Building Together
          </p>

          <h1 className="font-display mt-3 max-w-[11ch] text-[clamp(2.6rem,11vw,6.1rem)] leading-[0.92] font-bold tracking-[-0.045em] text-[var(--mk-offwhite)]">
            Where <span className="text-[var(--mk-gold3)] italic">Friendship</span>
            <br />
            Builds Wealth
          </h1>

          <p className="mt-4 max-w-[620px] px-2 text-[14px] leading-7 text-[rgba(255,255,255,0.9)] sm:text-[15px] md:px-0 md:text-[17px]">
            Mukwano helps trusted communities save together, invest with clarity, and grow wealth through shared
            circles.
          </p>

          <p className="font-display mt-4 px-2 text-[clamp(1rem,3.6vw,1.6rem)] font-semibold italic tracking-[0.01em] text-[var(--mk-gold2)]">
            Trusted circles. Shared growth.
          </p>
        </div>
        <div className="mt-7 flex w-full max-w-[520px] flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/signup"
            className="mukwano-btn-primary inline-flex w-full min-w-0 items-center justify-center rounded-[50px] px-8 py-4 text-[13px] tracking-[2px] uppercase sm:min-w-[220px] sm:px-11"
          >
            Create a Circle
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex w-full min-w-0 items-center justify-center rounded-[50px] border border-white/18 bg-[rgba(6,13,31,0.34)] px-8 py-4 text-[13px] font-medium tracking-[2px] text-white uppercase backdrop-blur-md transition-all hover:border-[var(--mk-gold)] hover:bg-[rgba(6,13,31,0.52)] hover:text-[var(--mk-gold)] sm:min-w-[220px] sm:px-11"
          >
            How It Works
          </a>
        </div>
      </div>
    </section>
  )
}
