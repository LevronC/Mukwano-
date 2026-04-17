import type { ReactNode } from 'react'

function ModalShell({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-[4px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="relative max-h-[80vh] w-[90%] max-w-[680px] overflow-y-auto rounded-2xl border border-[rgba(240,165,0,0.1)] bg-[var(--mk-navy2)] p-8 md:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-lg text-2xl text-[var(--mk-muted2)] transition-colors hover:bg-white/5 hover:text-white"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="legal-modal-title" className="mb-2 text-2xl font-semibold text-white">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

export function LegalModals({
  termsOpen,
  privacyOpen,
  onCloseTerms,
  onClosePrivacy,
}: {
  termsOpen: boolean
  privacyOpen: boolean
  onCloseTerms: () => void
  onClosePrivacy: () => void
}) {
  return (
    <>
      <ModalShell open={termsOpen} onClose={onCloseTerms} title="Terms of Service">
        <span className="mb-6 block text-xs text-[var(--mk-muted2)]">Last updated: April 2026</span>
        <div className="mb-7 rounded-xl border-l-4 border-[var(--mk-gold)] bg-[rgba(240,165,0,0.08)] p-5">
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-[var(--mk-gold)] uppercase">
            Demo Mode Disclaimer
          </h3>
          <ul className="list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-[var(--mk-muted)]">
            <li>
              Mukwano is currently operating in <strong className="text-white">DEMO MODE</strong>. No real money is
              collected, transferred, or held. All financial transactions shown are simulated for demonstration purposes
              only.
            </li>
            <li>
              Mukwano is <strong className="text-white">NOT</strong> a licensed financial institution, bank, money
              transmitter, or investment advisor.
            </li>
            <li>No fiduciary relationship exists between Mukwano and its users.</li>
          </ul>
        </div>
        <LegalSection title="1. Acceptance of Terms">
          <p>
            By accessing or using the Mukwano platform, you agree to be bound by these Terms of Service. If you do not
            agree to these terms, please do not use the platform. Continued use of Mukwano after any changes to these
            terms constitutes your acceptance of those changes.
          </p>
        </LegalSection>
        <LegalSection title="2. Platform Description">
          <p>
            Mukwano is a governance platform designed to help diaspora communities pool resources collectively toward
            projects in their home countries. Members can form Circles, submit contributions, vote on proposals, and
            execute funded projects. All governance logic is enforced at the server layer, ensuring accountable and
            transparent operations.
          </p>
          <p className="mt-2">
            In its current demo phase, Mukwano uses simulated funds with real accounting logic. No actual financial
            transactions occur.
          </p>
        </LegalSection>
        <LegalSection title="3. User Accounts">
          <p>
            To use Mukwano, you must create an account. You agree to provide accurate, complete, and current information
            during registration and to keep your account information up to date. You are responsible for maintaining the
            confidentiality of your account credentials and for all activities that occur under your account.
          </p>
        </LegalSection>
        <LegalSection title="4. Prohibited Conduct">
          <p>You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed">
            <li>Use the platform for any fraudulent or unlawful purpose</li>
            <li>Attempt to gain unauthorized access to any part of the platform</li>
            <li>Abuse or manipulate governance mechanisms</li>
            <li>Harass, threaten, or harm other users</li>
            <li>Introduce malware or attempt to disrupt platform operations</li>
          </ul>
        </LegalSection>
        <LegalSection title="5. Intellectual Property">
          <p>
            All content, design, code, and materials on the Mukwano platform are the intellectual property of Mukwano
            and its licensors. You may not copy, reproduce, distribute, or create derivative works without express
            written permission.
          </p>
        </LegalSection>
        <LegalSection title="6. Limitation of Liability">
          <p>
            The Mukwano platform is provided &quot;as is&quot; without warranties of any kind. To the fullest extent
            permitted by law, Mukwano disclaims all warranties, express or implied. In particular, as this platform is in
            demo mode, no real financial outcomes, returns, or guarantees are made. Mukwano shall not be liable for any
            indirect, incidental, or consequential damages arising from your use of the platform.
          </p>
        </LegalSection>
        <LegalSection title="7. Changes to Terms">
          <p>
            We may update these Terms of Service from time to time. When we do, we will update the &quot;Last
            updated&quot; date at the top of this page. Your continued use of the platform after changes are posted
            constitutes your acceptance of the revised terms.
          </p>
        </LegalSection>
        <LegalSection title="8. Contact">
          <p>
            If you have questions about these Terms of Service, please contact us at{' '}
            <a href="mailto:support@mukwano.app" className="text-[var(--mk-gold)] hover:text-[var(--mk-gold2)]">
              support@mukwano.app
            </a>
            .
          </p>
        </LegalSection>
      </ModalShell>

      <ModalShell open={privacyOpen} onClose={onClosePrivacy} title="Privacy Policy">
        <span className="mb-6 block text-xs text-[var(--mk-muted2)]">Last updated: April 2026</span>
        <div className="mb-7 rounded-xl border-l-4 border-[var(--mk-gold)] bg-[rgba(240,165,0,0.08)] p-5">
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-[var(--mk-gold)] uppercase">Demo Mode Notice</h3>
          <p className="text-[13px] leading-relaxed text-[var(--mk-muted)]">
            In demo mode, no real financial data is processed. Account data (email, display name) is stored solely for
            platform functionality and demonstration purposes.
          </p>
        </div>
        <LegalSection title="1. Introduction">
          <p>
            Mukwano (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your privacy. This
            Privacy Policy explains what data we collect, how we use it, and your rights regarding your personal
            information. By using the Mukwano platform, you agree to the collection and use of information in accordance
            with this policy.
          </p>
        </LegalSection>
        <LegalSection title="2. Information We Collect">
          <p>We collect the following types of information:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed">
            <li>
              <strong className="text-white">Account information:</strong> Your email address, display name, and
              securely hashed password when you register
            </li>
            <li>
              <strong className="text-white">Circle participation data:</strong> Circles you join or create,
              contributions, proposals you vote on, and projects you participate in
            </li>
            <li>
              <strong className="text-white">Usage data:</strong> How you interact with the platform, including pages
              visited and features used
            </li>
          </ul>
        </LegalSection>
        <LegalSection title="3. How We Use Information">
          <p>We use the information we collect to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed">
            <li>Operate and maintain the Mukwano platform</li>
            <li>Enforce governance rules and ensure platform accountability</li>
            <li>Provide you with access to circles, contributions, proposals, and projects</li>
            <li>Improve the platform experience through usage analytics</li>
            <li>Communicate important updates about the platform</li>
          </ul>
        </LegalSection>
        <LegalSection title="4. Data Sharing">
          <p>
            We do not sell, trade, or rent your personal information to third parties. We may share your information
            with trusted service providers who assist in operating the platform, provided those parties agree to keep
            this information confidential. We may disclose information where required by law or to protect the rights,
            property, or safety of Mukwano or others.
          </p>
        </LegalSection>
        <LegalSection title="5. Data Security">
          <p>
            We implement industry-standard security measures to protect your data. These include JWT-based authentication
            with short-lived access tokens and rotating refresh tokens, encrypted password storage, and server-enforced
            governance controls. However, no method of transmission over the internet or electronic storage is 100%
            secure, and we cannot guarantee absolute security.
          </p>
        </LegalSection>
        <LegalSection title="6. Data Retention">
          <p>
            We retain your personal data for as long as your account is active or as needed to provide you with
            platform services. If you request deletion of your account, we will delete your personal data unless we are
            required to retain it by law or for legitimate business purposes.
          </p>
        </LegalSection>
        <LegalSection title="7. Your Rights">
          <p>You have the right to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed">
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate or incomplete data</li>
            <li>Request deletion of your account and associated data</li>
            <li>Object to how we process your personal data</li>
          </ul>
          <p className="mt-2">To exercise any of these rights, please contact us at the address below.</p>
        </LegalSection>
        <LegalSection title="8. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update the &quot;Last updated&quot;
            date at the top of this page. We encourage you to review this policy periodically for any changes. Your
            continued use of the platform after changes are posted constitutes your acceptance of the revised policy.
          </p>
        </LegalSection>
        <LegalSection title="9. Contact">
          <p>
            If you have questions about this Privacy Policy or how we handle your data, please contact us at{' '}
            <a href="mailto:support@mukwano.app" className="text-[var(--mk-gold)] hover:text-[var(--mk-gold2)]">
              support@mukwano.app
            </a>
            .
          </p>
        </LegalSection>
      </ModalShell>
    </>
  )
}

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2.5 text-base font-semibold text-white">{title}</h3>
      <div className="space-y-2 text-[13px] leading-relaxed text-[var(--mk-muted)]">{children}</div>
    </section>
  )
}
