---
phase: quick
plan: 260409-djc
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/web/src/components/layout/AppLayout.tsx
  - packages/web/src/router/index.tsx
  - packages/web/src/pages/ExplorePage.tsx
  - packages/web/src/pages/auth/SignupPage.tsx
  - packages/web/src/pages/legal/TermsPage.tsx
  - packages/web/src/pages/legal/PrivacyPage.tsx
  - packages/web/public/avator-landing.html
  - packages/api/src/routes/circles.ts
autonomous: true
---

<objective>
Implement five critical UX and compliance fixes: mobile navigation, public circle browsing, KYC false claim removal, legal pages (Terms/Privacy), and DEMO_MODE regulatory disclaimers.

Purpose: The app currently has no mobile navigation, falsely claims KYC compliance, lacks legal pages, and has no clear demo-mode disclaimers for regulatory safety.
Output: Mobile-usable navigation, public explore page, accurate feature claims, Terms/Privacy pages, demo-mode banners.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/web/src/components/layout/AppLayout.tsx
@packages/web/src/router/index.tsx
@packages/web/src/pages/ExplorePage.tsx
@packages/web/src/pages/auth/SignupPage.tsx
@packages/api/src/routes/circles.ts
@packages/api/src/app.ts
@packages/web/public/avator-landing.html

<interfaces>
<!-- AppLayout currently uses `hidden md:flex` for nav links (line 33) — completely invisible on mobile -->
<!-- circlesRoute applies authGuard at plugin level (line 12): `fastify.addHook('preHandler', authGuard)` -->
<!-- All circle routes including GET /circles require auth because authGuard is a plugin-level hook -->
<!-- api client: `api.get<T>(path)` auto-attaches Bearer token, redirects to /login on 401 -->
<!-- Router: ProtectedLayout wraps all app routes including /explore (line 39-56) -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add mobile hamburger menu to AppLayout</name>
  <files>packages/web/src/components/layout/AppLayout.tsx</files>
  <action>
  Add a mobile hamburger menu to AppLayout.tsx:

  1. Add React state: `const [mobileMenuOpen, setMobileMenuOpen] = useState(false)`
  2. Import `useState` from React and `useLocation` from react-router-dom
  3. Add `useEffect` that closes mobile menu on route change: watch `location.pathname`, set `mobileMenuOpen(false)`
  4. Add a hamburger button BEFORE the right-side buttons div, visible only on mobile: `className="md:hidden"`. Use the Material Symbols icon `menu` (when closed) / `close` (when open). Style to match existing nav button patterns (rounded-full p-2, color var(--mk-gold)).
  5. Add a slide-out drawer below the header (inside the header element, after the nav). Conditionally render when `mobileMenuOpen` is true. Structure:
     - Full-width overlay div with `className="md:hidden"` and dark background `rgba(6, 13, 31, 0.95)`
     - Flex column of NavLink items reusing the SAME destinations as the desktop nav (Dashboard, My Circles, Explore, Portfolio, conditional Admin)
     - Each NavLink styled as a block element with padding `px-6 py-4`, border-bottom `rgba(240, 165, 0, 0.08)`, same font styles as desktop nav
     - Apply active style (gold color + left border) vs inactive (muted color)
     - Include Logout button at bottom of drawer
  6. ALSO add a persistent DEMO MODE banner between the header and main content. Small bar: `className="text-center text-xs py-1.5"` with background `rgba(240, 165, 0, 0.1)`, gold text, content: "DEMO MODE -- No real funds are processed". Only show when `config?.demoMode` is true.
  7. Add a footer before closing the root div: minimal footer with links to `/terms` and `/privacy`, copyright line. Style: `border-t` with `rgba(240, 165, 0, 0.08)`, padding, muted color text, small font. Links styled in gold on hover.
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && npx tsc --noEmit --project packages/web/tsconfig.json 2>&1 | head -30</automated>
  </verify>
  <done>Mobile users see hamburger icon, tapping opens drawer with all nav links. Drawer closes on route change. DEMO MODE banner visible below header. Footer with legal links present.</done>
</task>

<task type="auto">
  <name>Task 2: Enable public circle browsing without auth</name>
  <files>packages/api/src/routes/circles.ts, packages/web/src/router/index.tsx, packages/web/src/pages/ExplorePage.tsx</files>
  <action>
  **API change** in `packages/api/src/routes/circles.ts`:
  The problem is `authGuard` is registered as a plugin-level hook (line 12), so ALL routes in this plugin require auth. Fix:
  1. Remove the plugin-level `fastify.addHook('preHandler', authGuard)` on line 12
  2. Instead, add `{ preHandler: [authGuard] }` as the route options for EVERY route EXCEPT `GET /circles`. This means adding the preHandler option to: POST /circles, GET /circles/my-requests, GET /circles/:id, PATCH /circles/:id, PATCH /circles/:id/governance, GET /circles/:id/permissions, POST /circles/:id/close, POST /circles/:id/join, POST /circles/:id/join-request, POST /circles/:id/leave, GET /circles/:id/members, GET /circles/:id/join-requests, PATCH /circles/:id/join-requests/:userId/approve, DELETE /circles/:id/join-requests/:userId/reject, PATCH /circles/:id/members/:userId/role.
  3. For routes that already have a `schema` options object, merge `preHandler: [authGuard]` into that object. For routes without options, add `{ preHandler: [authGuard] }` as the second argument.
  4. The GET /circles handler remains as-is (no auth required). It already returns circles via `circleService.listCircles()`. Verify the service method returns only safe public fields (name, description, goalAmount, status, currency). If it returns sensitive data, limit the select in the service or map the response in the route handler.

  **Router change** in `packages/web/src/router/index.tsx`:
  1. Move `{ path: 'explore', element: <ExplorePage /> }` OUT of the ProtectedLayout children and into the RootLayout children (same level as login/signup). This makes /explore accessible without auth.

  **ExplorePage change** in `packages/web/src/pages/ExplorePage.tsx`:
  1. Import `useAuth` from `@/contexts/AuthContext`
  2. Get `const { user } = useAuth()` at the top of the component
  3. Wrap the `api.get('/circles/my-requests')` query with `enabled: !!user` so it only fires when authenticated
  4. Wrap the join request mutation and the "Request to Join" button: if `!user`, show a `<Link to="/signup">` button instead with text "Sign up to join" (styled as mukwano-btn-primary)
  5. Change the "Create a Circle" and "Browse all" hero CTAs: if `!user`, link both to `/signup` instead
  6. Since ExplorePage is now outside ProtectedLayout (no AppLayout wrapper), wrap it in a minimal layout: import the nav bar concept or add a simple header with logo + "Sign in" / "Join" links for unauthenticated users, and render `<AppLayout>` wrapper for authenticated users. Simplest approach: wrap ExplorePage in a conditional — if user is authenticated, just show the page content (AppLayout handles layout via router). If not authenticated, add a simple header bar with logo, "Sign in" link, and "Join a Circle" CTA, plus the explore content, plus the same footer as AppLayout.
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && npx tsc --noEmit --project packages/web/tsconfig.json 2>&1 | head -30</automated>
  </verify>
  <done>Unauthenticated users can visit /explore, see circle listings, and see "Sign up to join" CTAs. Authenticated users see normal join-request flow. All other circle API routes still require auth.</done>
</task>

<task type="auto">
  <name>Task 3: Fix KYC false claim in landing page</name>
  <files>packages/web/public/avator-landing.html</files>
  <action>
  In `packages/web/public/avator-landing.html` line 158, find the feature card #03 (the one with feat-num "03" and feat-title "Compliance &amp; Safety"). Replace the feat-desc text:

  FROM: "Automated KYC verification, compliance monitoring, and admin oversight keeps every circle operating at 99.8% governance health."

  TO: "Server-enforced governance rules, contribution verification, and admin oversight keeps every circle accountable and transparent."

  Do NOT change the feat-title "Compliance &amp; Safety" — that is accurate.
  Do NOT change any other feature cards.
  Also update the "99.8% governance health" claim which is fabricated — remove the percentage entirely.
  </action>
  <verify>
    <automated>grep -c "KYC" /Users/levicheptoyek/MUKWANO/packages/web/public/avator-landing.html | grep "^0$"</automated>
  </verify>
  <done>No mention of KYC in the landing page. Feature card #03 accurately describes the platform's actual compliance capabilities.</done>
</task>

<task type="auto">
  <name>Task 4: Create Terms of Service and Privacy Policy pages</name>
  <files>packages/web/src/pages/legal/TermsPage.tsx, packages/web/src/pages/legal/PrivacyPage.tsx, packages/web/src/router/index.tsx</files>
  <action>
  **Create `packages/web/src/pages/legal/TermsPage.tsx`:**
  A static page with Terms of Service content. Structure:
  - Full-page layout with dark background (matching app theme), centered max-w-3xl container
  - Simple header: logo link to "/", page title "Terms of Service"
  - Last updated date: "April 2026"
  - Content sections (use prose-style formatting with headings, paragraphs):
    1. **Acceptance of Terms** — By using Mukwano you agree to these terms
    2. **Demo Mode Disclaimer** (PROMINENT, at top, with gold border-left accent):
       - "Mukwano is currently operating in DEMO MODE. No real money is collected, transferred, or held. All financial transactions shown are simulated for demonstration purposes only."
       - "Mukwano is NOT a licensed financial institution, bank, money transmitter, or investment advisor."
       - "No fiduciary relationship exists between Mukwano and its users."
    3. **Platform Description** — Governance platform for diaspora communities, circles, contributions, proposals, projects
    4. **User Accounts** — Users must provide accurate info, responsible for account security
    5. **Prohibited Conduct** — No fraud, abuse, unauthorized access
    6. **Intellectual Property** — Mukwano owns platform IP
    7. **Limitation of Liability** — Platform provided as-is, especially in demo mode
    8. **Changes to Terms** — We may update terms, continued use = acceptance
    9. **Contact** — support@mukwano.app (or placeholder)
  - Style all text with muted color, headings in white, using Inter/Outfit fonts consistent with app
  - Include a "Back to app" link at top

  **Create `packages/web/src/pages/legal/PrivacyPage.tsx`:**
  Similar layout. Content sections:
    1. **Introduction** — What data we collect and why
    2. **Demo Mode Notice** (same prominent styling):
       - "In demo mode, no real financial data is processed. Account data (email, display name) is stored for platform functionality."
    3. **Information We Collect** — Account info (email, name, password hash), usage data, circle participation data
    4. **How We Use Information** — Platform operation, governance enforcement, analytics
    5. **Data Sharing** — We do not sell data. May share with service providers for platform operation.
    6. **Data Security** — Industry-standard security measures, JWT auth, encrypted storage
    7. **Data Retention** — Retained while account active, deleted on request
    8. **Your Rights** — Access, correct, delete your data
    9. **Changes to Policy** — May update, will notify
    10. **Contact** — same as Terms

  **Router update** in `packages/web/src/router/index.tsx`:
  1. Import TermsPage and PrivacyPage
  2. Add routes as public (same level as login/signup in RootLayout children):
     - `{ path: 'terms', element: <TermsPage /> }`
     - `{ path: 'privacy', element: <PrivacyPage /> }`
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && npx tsc --noEmit --project packages/web/tsconfig.json 2>&1 | head -30</automated>
  </verify>
  <done>TermsPage and PrivacyPage exist, are accessible at /terms and /privacy without auth, contain DEMO_MODE disclaimers and regulatory disclosures, and are visually consistent with the app theme.</done>
</task>

<task type="auto">
  <name>Task 5: Add compliance disclaimers to signup page</name>
  <files>packages/web/src/pages/auth/SignupPage.tsx</files>
  <action>
  In `packages/web/src/pages/auth/SignupPage.tsx`:

  1. Below the "Continue" submit button (line 141-143) and before the "Already have an account?" paragraph, add a compliance disclaimer block:
     - Small text (`text-xs`), muted color, centered, max-width matching the card
     - Content: "This platform is in demo mode. No real funds are collected or processed. By signing up, you agree to our [Terms of Service](/terms) and [Privacy Policy](/privacy)."
     - "Terms of Service" and "Privacy Policy" should be React Router `<Link>` elements styled in gold

  2. The existing "Demo Mode" chip in the top-right corner (lines 33-35) is fine — keep it.

  3. Import `Link` if not already imported (it is already imported on line 3, so just use it).
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && npx tsc --noEmit --project packages/web/tsconfig.json 2>&1 | head -30</automated>
  </verify>
  <done>Signup page shows compliance disclaimer with links to Terms and Privacy. Users are informed about demo mode before creating an account.</done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors: `cd packages/web && npx tsc --noEmit`
2. Mobile navigation: Resize browser to mobile width -- hamburger icon visible, opens drawer with all nav links
3. Public explore: Open incognito/logged-out browser, navigate to /explore -- circles visible, "Sign up to join" CTA shown
4. KYC claim: Check landing page -- no mention of "KYC" anywhere
5. Legal pages: Navigate to /terms and /privacy -- pages load without auth, contain DEMO MODE disclaimers
6. Signup disclaimer: Visit /signup -- compliance text visible below submit button with links to legal pages
7. Demo banner: Log in -- small gold "DEMO MODE" banner visible below header
</verification>

<success_criteria>
- Mobile users have full navigation access via hamburger menu
- /explore is accessible without authentication
- Landing page makes no false KYC claims
- /terms and /privacy pages exist with proper regulatory disclaimers
- Signup page includes compliance disclosure and links to legal pages
- Persistent DEMO MODE banner visible in authenticated app layout
- All changes compile without TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/260409-djc-implement-critical-ux-and-compliance-fix/260409-djc-SUMMARY.md`
</output>
