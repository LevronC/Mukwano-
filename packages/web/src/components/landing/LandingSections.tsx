import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

const stroke = '#f0a500'

const faqItems: { q: string; a: string }[] = [
  {
    q: 'What is Mukwano?',
    a: 'Mukwano (meaning "friend" in Luganda) is a governance-first platform for diaspora communities to pool money collectively toward projects in their home countries. Members form Circles, submit contributions, vote on proposals, and execute funded projects — all with server-enforced rules so no single person can override governance in the UI.',
  },
  {
    q: 'Is my money safe on Mukwano?',
    a: 'Mukwano is currently in Demo Mode — no real money is collected, transferred, or held. All financial transactions shown are simulated. When live, funds will be held in a verified escrow account and every disbursement requires a passed circle vote before any money moves.',
  },
  {
    q: 'How do I add members to my circle?',
    a: 'From your Circle dashboard, share your unique invite link or enter member email addresses directly. New members submit a join request and existing members with the right role can approve or reject them. All membership changes are logged in the activity feed.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'In the upcoming live release, Mukwano will support mobile money (M-Pesa, Airtel Money), bank transfers, and card payments. During the current demo phase, contributions are submitted and verified manually to simulate the full governance flow.',
  },
  {
    q: 'Can I withdraw my money anytime?',
    a: 'Withdrawals follow the rules set by your circle. Funds committed to a project proposal that has passed cannot be withdrawn unilaterally — this protects the collective. Individual withdrawal rules are defined per circle and enforced at the server layer, not the UI.',
  },
  {
    q: 'How much does Mukwano cost?',
    a: 'Mukwano is free to use during the demo phase. When we launch for real transactions, we will operate on a small platform fee model that keeps the service sustainable while remaining accessible to diaspora communities worldwide. Full fee details will be published before launch.',
  },
  {
    q: 'Is Mukwano available on mobile?',
    a: 'The web app is fully responsive and works great in mobile browsers. A dedicated native app for iOS and Android is on the roadmap for later in 2026.',
  },
  {
    q: 'How do I contact support?',
    a: 'Reach out to us at support@mukwano.app or use the contact form on our website. We respond within 24 hours.',
  },
]

export function LandingSections({
  onOpenTerms,
  onOpenPrivacy,
}: {
  onOpenTerms: () => void
  onOpenPrivacy: () => void
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const reduceMotion = useReducedMotion() ?? false

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenFaq(null)
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [])

  return (
    <div className="bg-[var(--mk-navy)]">
      <section id="features" className="relative z-[2] mx-auto max-w-[1280px] px-5 py-16 md:px-[60px] md:py-[120px]">
        <div className="mb-16 flex flex-col justify-between gap-10 md:mb-[70px] md:flex-row md:items-end">
          <div>
            <span className="mb-[18px] block text-[10px] font-bold tracking-[6px] text-[var(--mk-gold)] uppercase">
              Platform Capabilities
            </span>
            <h2 className="font-display text-[clamp(36px,4.5vw,60px)] leading-[1.05] font-bold tracking-[-0.5px] text-white">
              Built for <em className="text-[var(--mk-gold)] not-italic">Trust.</em>
              <br />
              Engineered for <em className="text-[var(--mk-gold)] not-italic">Growth.</em>
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 overflow-hidden rounded-[22px] bg-[var(--mk-navy2)] p-3.5 shadow-[0_12px_48px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)] md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            n="01"
            title="Investment Circles"
            desc="Join or create savings groups with trusted community members. Pool resources, share profits, and build generational wealth together."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <FeatureCard
            n="02"
            title="Transparent Ledger"
            desc="Every transaction is cryptographically logged. Real-time visibility into circle funds ensures full accountability for all members."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            }
          />
          <FeatureCard
            n="03"
            title="Compliance & Safety"
            desc="Server-enforced governance rules, contribution verification, and admin oversight keeps every circle accountable and transparent."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
          />
          <FeatureCard
            n="04"
            title="Simulated Escrow"
            desc="Funds are held securely in escrow before being distributed. Payment verification ensures no capital moves without member consent."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
          />
          <FeatureCard
            n="05"
            title="Live Analytics"
            desc="Real-time dashboards track circle performance, member activity, and investment returns — giving you the insights to grow smarter."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
          />
          <FeatureCard
            n="06"
            title="Circle Governance"
            desc="Propose votes, approve payout order, and update circle rules together — democratic controls keep every group aligned with its members."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
            }
          />
        </div>
      </section>

      <section
        id="showcase"
        className="relative z-[2] overflow-hidden border-y border-[rgba(240,165,0,0.06)] bg-gradient-to-br from-[#050c1a] via-[#0a1530] to-[#050c1a] px-5 py-16 md:px-[60px] md:py-[120px]"
      >
        <div className="mx-auto grid max-w-[1200px] items-center gap-16 lg:grid-cols-2 lg:gap-[100px]">
          <div className="relative order-1 flex items-center justify-center lg:order-1">
            <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(240,165,0,0.1)]" />
            <div className="absolute top-1/2 left-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[rgba(240,165,0,0.05)]" />
            <div className="animate-mk-float relative z-[1] flex justify-center drop-shadow-[0_0_50px_rgba(240,165,0,0.2)]">
              <div className="rounded-full bg-white/97 p-6 shadow-[0_12px_48px_rgba(0,0,0,0.35)] md:p-8">
                <img
                  src="/assets/mukwano-logo.png"
                  alt="Mukwano"
                  width={300}
                  height={300}
                  className="h-[min(200px,45vw)] w-[min(200px,45vw)] rounded-full object-cover md:h-[220px] md:w-[220px]"
                />
              </div>
            </div>
          </div>
          <div className="order-2 text-center lg:text-left">
            <span className="mb-[18px] block text-[10px] font-bold tracking-[6px] text-[var(--mk-gold)] uppercase">
              Our Foundation
            </span>
            <h2 className="font-display mb-7 text-[clamp(38px,4vw,58px)] leading-[1.05] font-bold text-white">
              Friendship as a
              <br />
              <em className="text-[var(--mk-gold)] not-italic">Foundation</em> for
              <br />
              Financial Freedom
            </h2>
            <p className="text-[14px] font-light leading-relaxed text-[var(--mk-muted)]">
              Mukwano means friendship in Luganda.
            </p>
          </div>
        </div>
      </section>

      <section id="values" className="relative z-[2] mx-auto max-w-[1100px] px-5 py-16 md:px-[60px] md:py-[120px]">
        <div className="mb-20 text-center">
          <span className="mb-[18px] block text-[10px] font-bold tracking-[6px] text-[var(--mk-gold)] uppercase">
            Core Principles
          </span>
          <h2 className="font-display text-[clamp(36px,4.5vw,60px)] leading-[1.05] font-bold text-white">
            The Pillars of <em className="text-[var(--mk-gold)] not-italic">Mukwano</em>
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-px bg-[rgba(240,165,0,0.05)] md:grid-cols-2">
          <div className="group relative bg-[var(--mk-navy)] p-10 transition-colors hover:bg-[rgba(11,22,48,1)] md:p-12">
            <div className="font-display pointer-events-none absolute top-6 right-8 text-[80px] leading-none font-bold text-[rgba(240,165,0,0.05)]">
              01
            </div>
            <div className="absolute top-0 left-0 h-0 w-[3px] bg-[var(--mk-gold)] transition-all duration-500 group-hover:h-full" />
            <h3 className="font-display mb-3.5 text-[26px] font-semibold text-white">Radical Transparency</h3>
            <p className="text-[14px] font-light leading-relaxed text-[var(--mk-muted)]">Every shilling is tracked.</p>
          </div>
          <div className="group relative bg-[var(--mk-navy)] p-10 transition-colors hover:bg-[rgba(11,22,48,1)] md:p-12">
            <div className="font-display pointer-events-none absolute top-6 right-8 text-[80px] leading-none font-bold text-[rgba(240,165,0,0.05)]">
              02
            </div>
            <div className="absolute top-0 left-0 h-0 w-[3px] bg-[var(--mk-gold)] transition-all duration-500 group-hover:h-full" />
            <h3 className="font-display mb-3.5 text-[26px] font-semibold text-white">Community First</h3>
            <p className="text-[14px] font-light leading-relaxed text-[var(--mk-muted)]">
              Collective growth, shared outcomes.
            </p>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="relative z-[2] mx-auto max-w-[1320px] overflow-hidden px-5 py-16 text-center md:px-[60px] md:py-[120px]"
      >
        <motion.div
          className="mb-20"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="mb-[18px] block text-[10px] font-bold tracking-[6px] text-[var(--mk-gold)] uppercase">
            Simple Process
          </span>
          <h2 className="font-display text-[clamp(40px,5vw,68px)] leading-[1.05] font-bold text-white">
            How It <em className="text-[var(--mk-gold)] not-italic">Works</em>
          </h2>
          <p className="mx-auto mt-[18px] max-w-[520px] text-[15px] font-light leading-relaxed text-[var(--mk-muted)]">
            Get started in four simple steps and begin building wealth together.
          </p>
        </motion.div>
        <motion.div
          className="relative mx-auto max-w-[1240px]"
          initial={reduceMotion ? false : { opacity: 0, y: 30 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        >
          <div className="pointer-events-none absolute top-[42px] left-[12.5%] right-[12.5%] z-0 hidden h-px bg-[linear-gradient(90deg,rgba(240,165,0,0.02)_0%,rgba(240,165,0,0.22)_12%,rgba(240,165,0,0.22)_88%,rgba(240,165,0,0.02)_100%)] lg:block" />
          <div className="pointer-events-none absolute inset-x-[24%] top-[-18px] z-0 hidden h-40 bg-[radial-gradient(ellipse,rgba(255,199,64,0.07)_0%,transparent_70%)] blur-2xl lg:block" />
          {!reduceMotion && (
            <div className="pointer-events-none absolute top-[30px] left-[12.5%] right-[12.5%] z-[1] hidden h-6 lg:block">
              <motion.div
                className="absolute top-0 left-0 h-6 w-6 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,213,122,0.98)_0%,rgba(240,165,0,0.58)_38%,rgba(240,165,0,0)_72%)] blur-[1px]"
                animate={{
                  left: ['0%', '33.333%', '66.666%', '100%', '66.666%', '33.333%', '0%'],
                  opacity: [0.75, 1, 1, 1, 1, 1, 0.75],
                  scale: [0.94, 1.06, 1, 1.06, 1, 1.06, 0.94],
                }}
                transition={{ duration: 9.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1 }}
              />
            </div>
          )}
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            <HiwStep
              n="01"
              title="Create Your Circle"
              desc="Set up a new investment circle with your friends and define your goals and contribution rules."
              delay={0}
              reduceMotion={reduceMotion}
            />
            <HiwStep
              n="02"
              title="Invite Members"
              desc="Add trusted members to your circle and assign roles and permissions through the governance layer."
              delay={0.12}
              reduceMotion={reduceMotion}
            />
            <HiwStep
              n="03"
              title="Make Contributions"
              desc="Members contribute regularly via mobile money or bank transfer. Every shilling is tracked in the transparent ledger."
              delay={0.24}
              reduceMotion={reduceMotion}
            />
            <HiwStep
              n="04"
              title="Track & Invest"
              desc="Monitor contributions in real-time and make collective investment decisions through transparent, on-chain voting."
              delay={0.36}
              reduceMotion={reduceMotion}
            />
          </div>
        </motion.div>
      </section>

      <section
        id="faq"
        className="relative z-[2] border-y border-[rgba(240,165,0,0.06)] bg-gradient-to-b from-transparent via-[rgba(11,22,48,0.5)] to-transparent px-5 py-16 md:px-[60px] md:py-[120px]"
      >
        <div className="mx-auto max-w-[760px]">
          <div className="mb-16 text-center">
            <span className="mb-[18px] block text-[10px] font-bold tracking-[6px] text-[var(--mk-gold)] uppercase">
              FAQ
            </span>
            <h2 className="font-display text-[clamp(34px,4vw,56px)] leading-tight font-bold text-white">
              Have questions?
              <br />
              We&apos;ve got answers.
            </h2>
            <p className="mt-3.5 text-[14px] font-light leading-relaxed text-[var(--mk-muted)]">
              Everything you need to know about circles and governance.
            </p>
          </div>
          <div className="space-y-2.5">
            {faqItems.map((item, i) => {
              const open = openFaq === i
              return (
                <div
                  key={item.q}
                  className={`overflow-hidden rounded-[14px] border transition-colors ${
                    open ? 'border-[rgba(240,165,0,0.32)]' : 'border-[rgba(240,165,0,0.12)]'
                  }`}
                >
                  <button
                    type="button"
                    className={`flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-5 text-left text-[15px] font-medium text-white transition-colors md:px-7 ${
                      open ? 'bg-[rgba(240,165,0,0.06)]' : 'hover:bg-[rgba(240,165,0,0.04)]'
                    }`}
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : i)}
                  >
                    {item.q}
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-transform ${
                        open
                          ? 'rotate-180 border-[var(--mk-gold)] bg-[var(--mk-gold)]'
                          : 'border-[rgba(240,165,0,0.3)]'
                      }`}
                    >
                      <ChevronDown
                        className={`h-3 w-3 ${open ? 'text-[var(--mk-navy)]' : 'text-[var(--mk-gold)]'}`}
                        strokeWidth={2.5}
                      />
                    </span>
                  </button>
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <p className="px-5 pb-5 text-[13px] leading-relaxed font-light text-[var(--mk-muted)] md:px-7">
                        <FaqAnswer text={item.a} />
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section
        id="cta"
        className="relative z-[2] overflow-hidden px-5 py-20 text-center md:px-[60px] md:py-40"
      >
        <img
          src="/assets/landing/footer-heritage.png"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.18]"
        />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-[400px] w-[min(900px,100%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(240,165,0,0.06)_0%,transparent_65%)]" />
        <span className="relative mb-[22px] block text-[10px] font-bold tracking-[7px] text-[var(--mk-gold)] uppercase">
          Begin Your Journey
        </span>
        <h2 className="font-display relative mb-6 text-[clamp(48px,7vw,88px)] leading-none font-bold tracking-[-1px] text-white">
          Start <em className="text-[var(--mk-gold)] not-italic">Building</em>
          <br />
          Together Today
        </h2>
        <p className="relative mx-auto mb-14 max-w-[500px] text-[15px] font-light leading-relaxed text-[var(--mk-muted)]">
          Join members growing wealth through friendship.
        </p>
        <div className="relative flex flex-wrap justify-center gap-4">
          <Link
            to="/signup"
            className="mukwano-btn-primary inline-flex items-center justify-center gap-2.5 rounded-[50px] px-11 py-4 text-[13px] tracking-[2px] uppercase"
          >
            Create Your Circle
          </Link>
          <Link
            to="/explore"
            className="inline-flex items-center justify-center gap-2.5 rounded-[50px] border border-white/15 bg-transparent px-11 py-4 text-[13px] font-medium tracking-[2px] text-white uppercase backdrop-blur-md transition-all hover:border-[var(--mk-gold)] hover:text-[var(--mk-gold)]"
          >
            View Live Demo
          </Link>
        </div>
      </section>

      <footer className="relative z-[2] border-t border-white/[0.04] bg-[#030810] px-5 pt-14 pb-10 md:px-16 md:pt-[70px] md:pb-11">
        <div className="mx-auto mb-12 max-w-[1200px] border-b border-white/5 pb-12">
          <div className="flex items-center gap-3">
            <div className="rounded-[14px] bg-white/97 p-2">
              <img src="/assets/mukwano-logo.png" alt="Mukwano" width={200} height={200} className="h-14 w-auto" />
            </div>
          </div>
          <p className="text-muted2 mt-3.5 text-[12px] tracking-[2px] text-[var(--mk-muted2)] uppercase">
            Friendship · Investment · Growth
          </p>
        </div>
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 pt-2">
          <p className="text-[12px] text-[rgba(122,149,196,0.3)]">
            © 2026 <span className="text-[var(--mk-gold)] opacity-60">Mukwano</span>. All rights reserved.
          </p>
          <div className="flex flex-row items-center gap-4 text-[12px]">
            <button type="button" onClick={onOpenTerms} className="text-[var(--mk-muted2)] transition-colors hover:text-[var(--mk-gold)]">
              Terms of Service
            </button>
            <span className="text-[rgba(122,149,196,0.15)]">|</span>
            <button type="button" onClick={onOpenPrivacy} className="text-[var(--mk-muted2)] transition-colors hover:text-[var(--mk-gold)]">
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  n,
  title,
  desc,
  icon,
}: {
  n: string
  title: string
  desc: string
  icon: ReactNode
}) {
  return (
    <div className="group relative min-w-0 overflow-hidden rounded-[14px] border border-[rgba(240,165,0,0.38)] bg-[var(--mk-navy)] px-8 py-12 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all hover:border-[rgba(240,165,0,0.52)] hover:bg-[var(--mk-navy3)] md:px-11">
      <div className="font-display mb-4 text-[72px] leading-none font-bold text-[rgba(240,165,0,0.06)] transition-colors group-hover:text-[rgba(240,165,0,0.12)]">
        {n}
      </div>
      <div className="mb-6 flex h-12 w-12 items-center justify-center [&_svg]:h-full [&_svg]:w-full">{icon}</div>
      <h3 className="font-display mb-3.5 text-[22px] font-semibold text-white">{title}</h3>
      <p className="text-[14px] font-light leading-relaxed text-[var(--mk-muted)]">{desc}</p>
    </div>
  )
}

function HiwStep({
  n,
  title,
  desc,
  delay,
  reduceMotion,
}: {
  n: string
  title: string
  desc: string
  delay: number
  reduceMotion: boolean
}) {
  return (
    <motion.div
      className="group relative z-[1] px-4 lg:px-2"
      initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.985 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.45 }}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1], delay }}
    >
      <div className="relative mx-auto flex w-full max-w-[260px] flex-col items-center pt-2 text-center">
        {!reduceMotion && (
          <motion.div
            className="pointer-events-none absolute top-[6px] z-[1] h-[88px] w-[88px] rounded-full bg-[radial-gradient(circle,rgba(255,199,64,0.18)_0%,rgba(255,199,64,0.05)_42%,transparent_72%)] blur-md"
            animate={{ scale: [1, 1.08, 1], opacity: [0.42, 0.72, 0.42] }}
            transition={{ duration: 4.6, ease: 'easeInOut', repeat: Infinity, delay: delay * 2.2 }}
          />
        )}
        <motion.div
          className="relative z-[2] mb-9 flex h-[84px] w-[84px] items-center justify-center rounded-full border border-[rgba(240,165,0,0.9)] bg-[rgba(18,27,52,0.96)] shadow-[0_0_0_5px_rgba(240,165,0,0.08)] transition-all duration-300 group-hover:shadow-[0_0_0_5px_rgba(240,165,0,0.12),0_0_24px_rgba(240,165,0,0.16)]"
          whileHover={reduceMotion ? undefined : { y: -3, scale: 1.03 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="font-display flex h-[74px] w-[74px] items-center justify-center rounded-full border border-[rgba(255,210,120,0.18)] text-[20px] font-bold text-[var(--mk-gold)]">
            {n}
          </div>
        </motion.div>
        <motion.h3
          className="font-display mb-4 text-[20px] leading-tight font-semibold text-[var(--mk-offwhite)] md:text-[21px]"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: delay + 0.08 }}
        >
          {title}
        </motion.h3>
        <motion.p
          className="max-w-[19ch] text-[13px] leading-[2] font-light text-[var(--mk-muted)] md:text-[14px]"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: delay + 0.14 }}
        >
          {desc}
        </motion.p>
      </div>
    </motion.div>
  )
}

function FaqAnswer({ text }: { text: string }) {
  const marker = 'support@mukwano.app'
  if (!text.includes(marker)) return <>{text}</>
  const [before, after] = text.split(marker)
  return (
    <>
      {before}
      <a href={`mailto:${marker}`} className="text-[var(--mk-gold)] hover:underline">
        {marker}
      </a>
      {after}
    </>
  )
}
