---
phase: quick
plan: 260409-mu9
subsystem: ui
tags: [html, modal, legal, css, javascript]

requires: []
provides:
  - Footer legal links (Terms of Service, Privacy Policy) in avator-landing.html
  - Modal overlays with full Terms and Privacy content, dark-themed, scrollable
  - JS open/close/Escape handlers with body scroll lock
affects: [landing-page, legal-compliance]

tech-stack:
  added: []
  patterns:
    - "Vanilla JS modal pattern: overlay with active class toggle, body overflow lock, Escape key handler"

key-files:
  created: []
  modified:
    - packages/web/public/avator-landing.html

key-decisions:
  - "Modal content embedded inline in HTML (no fetch) since landing page is a standalone static file inside an iframe"
  - "Click-outside-to-close implemented via overlay onclick with event.stopPropagation on modal container"

patterns-established:
  - "Legal modals: .legal-modal-overlay + .active class toggle via openLegalModal/closeLegalModal JS functions"

requirements-completed: []

duration: 2min
completed: 2026-04-09
---

# Quick Task 260409-mu9: Add Terms of Service and Privacy Policy Summary

**Footer legal links in avator-landing.html that open scrollable dark-themed modal overlays with full Terms and Privacy content, dismissible via X button, outside click, or Escape key**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-09T20:28:57Z
- **Completed:** 2026-04-09T20:30:18Z
- **Tasks:** 1 of 2 (Task 2 is human-verify checkpoint — awaiting verification)
- **Files modified:** 1

## Accomplishments

- Added `.footer-legal` link row in `.footer-bottom` with pipe-separated "Terms of Service" and "Privacy Policy" links styled in var(--muted2) with gold hover
- Added full CSS for modal overlay, modal container, legal sections, disclaimer blocks, close button, and custom scrollbar — all using existing dark theme CSS variables
- Embedded full legal content (8 Terms sections + demo disclaimer, 9 Privacy sections + demo notice) sourced from TermsPage.tsx and PrivacyPage.tsx
- Implemented `openLegalModal` / `closeLegalModal` JS functions with body overflow lock and Escape key handler
- Added mobile responsive breakpoints: 95% width / 85vh max-height at <=768px, 20px padding at <=480px

## Task Commits

1. **Task 1: Add footer legal links and modal overlays** - `9d50335` (feat)

## Files Created/Modified

- `/Users/levicheptoyek/MUKWANO/packages/web/public/avator-landing.html` - Added legal CSS, footer links HTML, two modal overlays with full content, and JS modal handlers

## Decisions Made

- Modal content embedded inline rather than fetched dynamically — the landing page is a self-contained static HTML file rendered inside an iframe with no access to React router or API
- Click-outside close uses `onclick="if(event.target===this)closeLegalModal(...)"` on overlay div with `event.stopPropagation()` on modal container — standard vanilla JS pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None — all modal content is fully wired with real legal text sourced from TermsPage.tsx and PrivacyPage.tsx.

## Next Steps

Awaiting human visual verification (Task 2 checkpoint):
1. Visit http://localhost:5173
2. Scroll to footer — verify "Terms of Service | Privacy Policy" links appear
3. Click each link — verify modal opens with correct scrollable content
4. Test all three close methods: X button, outside click, Escape key
5. Test on 375px mobile viewport in DevTools

---
*Phase: quick*
*Completed: 2026-04-09*

## Self-Check: PASSED

- packages/web/public/avator-landing.html: FOUND
- commit 9d50335: FOUND
