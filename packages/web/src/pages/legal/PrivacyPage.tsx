import { Link } from 'react-router-dom'

const mukwanoLogo = '/assets/mukwano-logo.png'

export function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>Last updated: April 2026</p>
        </div>

        {/* Demo Mode Notice — prominent */}
        <div
          className="rounded-2xl p-6 mb-10 border-l-4"
          style={{ background: 'rgba(240, 165, 0, 0.08)', borderColor: 'var(--mk-gold)' }}
        >
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--mk-gold)', fontFamily: "'Outfit', sans-serif" }}>
            DEMO MODE NOTICE
          </h2>
          <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
            In demo mode, no real financial data is processed. Account data (email, display name) is stored solely for platform functionality and demonstration purposes.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'var(--mk-muted)' }}>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              1. Introduction
            </h2>
            <p>
              Mukwano ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains what data we collect, how we use it, and your rights regarding your personal information. By using the Mukwano platform, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              2. Information We Collect
            </h2>
            <p>We collect the following types of information:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong style={{ color: 'var(--mk-white)' }}>Account information:</strong> Your email address, display name, and securely hashed password when you register</li>
              <li><strong style={{ color: 'var(--mk-white)' }}>Circle participation data:</strong> Circles you join or create, contributions, proposals you vote on, and projects you participate in</li>
              <li><strong style={{ color: 'var(--mk-white)' }}>Usage data:</strong> How you interact with the platform, including pages visited and features used</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              3. How We Use Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Operate and maintain the Mukwano platform</li>
              <li>Enforce governance rules and ensure platform accountability</li>
              <li>Provide you with access to circles, contributions, proposals, and projects</li>
              <li>Improve the platform experience through usage analytics</li>
              <li>Communicate important updates about the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              4. Data Sharing
            </h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted service providers who assist in operating the platform, provided those parties agree to keep this information confidential. We may disclose information where required by law or to protect the rights, property, or safety of Mukwano or others.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              5. Data Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your data. These include JWT-based authentication with short-lived access tokens and rotating refresh tokens, encrypted password storage, and server-enforced governance controls. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              6. Data Retention
            </h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to provide you with platform services. If you request deletion of your account, we will delete your personal data unless we are required to retain it by law or for legitimate business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              7. Your Rights
            </h2>
            <p>You have the right to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Object to how we process your personal data</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, please contact us at the address below.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              8. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. We encourage you to review this policy periodically for any changes. Your continued use of the platform after changes are posted constitutes your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}>
              9. Contact
            </h2>
            <p>
              If you have questions about this Privacy Policy or how we handle your data, please contact us at{' '}
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
              style={{ color: 'var(--mk-muted)' }}
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="transition-colors hover:text-[var(--mk-gold)]"
              style={{ color: 'var(--mk-gold)' }}
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
