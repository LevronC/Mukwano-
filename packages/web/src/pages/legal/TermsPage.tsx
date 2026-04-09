import { Link } from 'react-router-dom'

const mukwanoLogo = '/assets/mukwano-logo.png'

export function TermsPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--mk-navy, #060d1f)', color: 'var(--mk-white)', fontFamily: "'Inter', sans-serif" }}
    >
      {/* Simple header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(6, 13, 31, 0.95)', borderColor: 'rgba(240, 165, 0, 0.12)' }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/">
            <img src={mukwanoLogo} alt="Mukwano logo" className="h-9 w-auto rounded-xl bg-white/95 p-1" />
          </Link>
          <Link
            to="/dashboard"
            className="text-sm font-medium transition-colors hover:text-[var(--mk-gold)]"
            style={{ color: 'var(--mk-muted)' }}
          >
            &larr; Back to app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
            Terms of Service
          </h1>
          <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>Last updated: April 2026</p>
        </div>

        {/* Demo Mode Disclaimer — prominent */}
        <div
          className="rounded-2xl p-6 mb-10 border-l-4"
          style={{ background: 'rgba(240, 165, 0, 0.08)', borderColor: 'var(--mk-gold)' }}
        >
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--mk-gold)', fontFamily: "'Outfit', sans-serif" }}>
            DEMO MODE DISCLAIMER
          </h2>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--mk-muted)' }}>
            <li>Mukwano is currently operating in <strong style={{ color: 'var(--mk-white)' }}>DEMO MODE</strong>. No real money is collected, transferred, or held. All financial transactions shown are simulated for demonstration purposes only.</li>
            <li>Mukwano is <strong style={{ color: 'var(--mk-white)' }}>NOT</strong> a licensed financial institution, bank, money transmitter, or investment advisor.</li>
            <li>No fiduciary relationship exists between Mukwano and its users.</li>
          </ul>
        </div>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'var(--mk-muted)' }}>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the Mukwano platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform. Continued use of Mukwano after any changes to these terms constitutes your acceptance of those changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              2. Platform Description
            </h2>
            <p>
              Mukwano is a governance platform designed to help diaspora communities pool resources collectively toward projects in their home countries. Members can form Circles, submit contributions, vote on proposals, and execute funded projects. All governance logic is enforced at the server layer, ensuring accountable and transparent operations.
            </p>
            <p className="mt-2">
              In its current demo phase, Mukwano uses simulated funds with real accounting logic. No actual financial transactions occur.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              3. User Accounts
            </h2>
            <p>
              To use Mukwano, you must create an account. You agree to provide accurate, complete, and current information during registration and to keep your account information up to date. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              4. Prohibited Conduct
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Use the platform for any fraudulent or unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the platform</li>
              <li>Abuse or manipulate governance mechanisms</li>
              <li>Harass, threaten, or harm other users</li>
              <li>Introduce malware or attempt to disrupt platform operations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              5. Intellectual Property
            </h2>
            <p>
              All content, design, code, and materials on the Mukwano platform are the intellectual property of Mukwano and its licensors. You may not copy, reproduce, distribute, or create derivative works without express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              6. Limitation of Liability
            </h2>
            <p>
              The Mukwano platform is provided "as is" without warranties of any kind. To the fullest extent permitted by law, Mukwano disclaims all warranties, express or implied. In particular, as this platform is in demo mode, no real financial outcomes, returns, or guarantees are made. Mukwano shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              7. Changes to Terms
            </h2>
            <p>
              We may update these Terms of Service from time to time. When we do, we will update the "Last updated" date at the top of this page. Your continued use of the platform after changes are posted constitutes your acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              8. Contact
            </h2>
            <p>
              If you have questions about these Terms of Service, please contact us at{' '}
              <a
                href="mailto:support@mukwano.app"
                className="transition-colors hover:text-[var(--mk-gold)]"
                style={{ color: 'var(--mk-gold)' }}
              >
                support@mukwano.app
              </a>.
            </p>
          </section>

        </div>
      </main>

      <footer
        className="border-t"
        style={{ borderColor: 'rgba(240, 165, 0, 0.08)', background: 'rgba(6, 13, 31, 0.6)' }}
      >
        <div className="mx-auto max-w-3xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: 'var(--mk-muted)' }}>
            &copy; {new Date().getFullYear()} Mukwano. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs">
            <Link
              to="/terms"
              className="transition-colors hover:text-[var(--mk-gold)]"
              style={{ color: 'var(--mk-gold)' }}
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="transition-colors hover:text-[var(--mk-gold)]"
              style={{ color: 'var(--mk-muted)' }}
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
