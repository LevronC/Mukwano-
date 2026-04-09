---
phase: quick
plan: 260409-hfk
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/web/src/pages/ExplorePage.tsx
  - packages/web/src/components/theme/CustomCursor.tsx
  - packages/web/src/index.css
  - packages/web/public/avator-landing.html
autonomous: true
requirements: [UI-FIX-01, UI-FIX-02, UI-FIX-03, UI-FIX-04]

must_haves:
  truths:
    - "Explore page content is centered and matches the container width of other pages (max-w-7xl centered)"
    - "Explore page circle cards have balanced proportions on desktop (not too wide or too tall)"
    - "Custom yellow dot cursor does NOT appear on touch devices (phones/tablets)"
    - "Landing page renders mobile-first: cards stack vertically, text fits viewport, no horizontal overflow"
  artifacts:
    - path: "packages/web/src/pages/ExplorePage.tsx"
      provides: "Fixed explore page layout and card grid proportions"
    - path: "packages/web/src/components/theme/CustomCursor.tsx"
      provides: "Touch device detection gating custom cursor"
    - path: "packages/web/src/index.css"
      provides: "Media query gating cursor:none to pointer:fine only"
    - path: "packages/web/public/avator-landing.html"
      provides: "Mobile-responsive landing page"
  key_links:
    - from: "packages/web/src/index.css"
      to: "packages/web/src/components/theme/CustomCursor.tsx"
      via: "cursor:none only applied behind @media (hover: hover) and (pointer: fine)"
      pattern: "pointer: fine"
---

<objective>
Fix 4 UI issues across the Explore page, custom cursor, and landing page.

Purpose: Improve visual consistency, mobile usability, and touch-device experience.
Output: Corrected layout, proportions, cursor behavior, and mobile responsiveness.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/web/src/pages/ExplorePage.tsx
@packages/web/src/components/theme/CustomCursor.tsx
@packages/web/src/components/theme/AppThemeShell.tsx
@packages/web/src/index.css
@packages/web/public/avator-landing.html
@packages/web/src/components/layout/AppLayout.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Explore page layout alignment and card proportions</name>
  <files>packages/web/src/pages/ExplorePage.tsx</files>
  <action>
Two issues in ExplorePage.tsx:

**Issue 1 — Layout misalignment on desktop:**
The authenticated view returns just `pageContent` (a bare `<div className="space-y-10">`), which gets rendered inside AppLayout's `<main className="mx-auto w-full max-w-7xl px-6 py-8">`. This is correct containment. However the unauthenticated wrapper also uses `max-w-7xl` which should match. Verify the unauthenticated wrapper main tag uses the same centering as AppLayout. Both should be consistent.

The hero section grid uses `lg:grid-cols-12` with `lg:col-span-7` and `lg:col-span-5`, which can push content left-heavy. Adjust to `lg:grid-cols-2` with the text side taking normal flow and the logo side taking normal flow, or use `lg:grid-cols-5` with `lg:col-span-3` / `lg:col-span-2` for better visual balance.

**Issue 2 — Card proportions on desktop:**
The circle cards grid uses `md:grid-cols-2 lg:grid-cols-3` with `gap-5`. The cards have `p-6` padding and contain a status badge row, name/description, goal amount, and TWO action buttons stacked vertically. This makes cards very tall relative to their width on a 3-column grid.

Fix card proportions:
- Reduce vertical padding from `p-6` to `p-5`
- Reduce `gap-4` between card internal elements to `gap-3`
- Make the two action buttons (Open/Sign up + Request to Join/Sign up to join) sit side-by-side on the same row instead of stacked, using `flex flex-wrap gap-2` on a wrapper div. This cuts card height significantly.
- Ensure grid gap is `gap-6` for breathing room between cards

  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && npx tsc --noEmit --project packages/web/tsconfig.json 2>&1 | head -20</automated>
  </verify>
  <done>Explore page hero section is visually balanced (not left-heavy), circle cards have compact proportions with side-by-side action buttons, grid has consistent spacing</done>
</task>

<task type="auto">
  <name>Task 2: Gate custom cursor to pointer:fine devices only</name>
  <files>packages/web/src/components/theme/CustomCursor.tsx, packages/web/src/index.css</files>
  <action>
The custom yellow dot cursor currently renders on ALL devices including phones/tablets. Two changes needed:

**CustomCursor.tsx:**
At the top of the `CustomCursor` component, add an early return that checks for fine pointer support. Before the useEffect, add a state/ref check:
```
const hasFinePointer = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
```
If `!hasFinePointer`, return `null` (render nothing). This prevents the dot/ring elements from existing in DOM on touch devices and prevents the mousemove/pointerover listeners from being registered.

**index.css:**
The existing rule at lines 57-60 unconditionally sets `cursor: none` on `html.mk-theme-cursor`. Wrap it in a media query so touch devices keep their native cursor:

Change:
```css
html.mk-theme-cursor,
html.mk-theme-cursor body {
  cursor: none;
}
```

To:
```css
@media (hover: hover) and (pointer: fine) {
  html.mk-theme-cursor,
  html.mk-theme-cursor body {
    cursor: none;
  }
}
```

This matches the exact same media query already used in `avator-landing.html` at line 146, keeping behavior consistent.
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && npx tsc --noEmit --project packages/web/tsconfig.json 2>&1 | head -20 && grep -c "pointer: fine" packages/web/src/index.css packages/web/src/components/theme/CustomCursor.tsx</automated>
  </verify>
  <done>Custom cursor dot and ring do not render on touch devices. cursor:none CSS only applied behind @media (hover: hover) and (pointer: fine). Native cursor visible on phones/tablets.</done>
</task>

<task type="auto">
  <name>Task 3: Fix landing page mobile/tablet responsiveness</name>
  <files>packages/web/public/avator-landing.html</files>
  <action>
The landing page (avator-landing.html) has minimal responsive breakpoints. The existing media queries at lines 144-145 handle some layout but miss critical mobile issues: cards cut off, "Platform Capabilities" section at desktop scale, fonts too large, padding too wide.

Add/update these responsive styles in the existing `<style>` block, BEFORE the closing `</style>` tag:

**1. Nav mobile fix (already has `@media(max-width:768px)` hiding nav-links):**
Add to the 768px query: `.nav-cta-group { gap: 10px; }` and `.nav-cta { padding: 8px 18px; font-size: 11px; }` and `.nav-signin { font-size: 11px; }` to prevent nav overflow.

**2. Features section mobile (the "Platform Capabilities" cards):**
The `.features-grid` already goes 1-col at 768px but `.feat` has `padding: 52px 44px` which is too wide for phones. Add to 768px query:
`.feat { padding: 32px 24px; }` and `.feat-num { font-size: 48px; }` and `#features { padding: 60px 20px; }`.

**3. Hero section mobile tightening:**
In the 768px query, add: `.hero-logo-scene { width: 180px; height: 180px; margin-bottom: 32px; }` and `.hero-desc { font-size: 13px; margin-bottom: 36px; }` and `.hero-btns { flex-direction: column; align-items: center; gap: 12px; }` and `.btn-gold, .btn-outline { padding: 14px 32px; font-size: 12px; width: 100%; max-width: 280px; justify-content: center; }`.

**4. Showcase section mobile:**
Add to 768px query: `#showcase { padding: 60px 20px; }` and `.showcase-logo-wrap .logo-surface { width: min(220px, 70vw); height: min(220px, 70vw); }`.

**5. Values section mobile:**
Add to 768px query: `#values { padding: 60px 20px; }` and `.val-card { padding: 32px 24px; }`.

**6. CTA section mobile:**
Add to 768px query: `#cta { padding: 80px 20px; }` and `.cta-btns { flex-direction: column; align-items: center; gap: 12px; }` and `.cta-btns .btn-gold, .cta-btns .btn-outline { width: 100%; max-width: 280px; justify-content: center; }`.

**7. Footer mobile:**
Add to 768px query: `footer { padding: 40px 20px 30px; }` and `.footer-top { gap: 30px; }`.

**8. Add a small-phone query at 480px:**
```css
@media(max-width:480px){
  nav{padding:14px 16px;}
  #hero{padding:100px 16px 60px;}
  h1.hero-title{font-size:36px;}
  .hero-script{font-size:16px;}
  .section-title{font-size:28px;}
  .showcase-title{font-size:30px;}
  .cta-title{font-size:36px;}
  .hero-logo-scene{width:140px;height:140px;}
}
```

These changes ensure all sections reflow for small screens, cards are not cut off, and fonts scale down appropriately.
  </action>
  <verify>
    <automated>grep -c "@media" /Users/levicheptoyek/MUKWANO/packages/web/public/avator-landing.html</automated>
  </verify>
  <done>Landing page renders correctly on mobile (375px) and tablet (768px): all cards fit viewport width, sections stack vertically, font sizes reduce, buttons stack on mobile, no horizontal scroll overflow</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit --project packages/web/tsconfig.json` compiles without errors
- Explore page: hero section visually centered, cards have balanced proportions
- Custom cursor: only renders on devices with fine pointer (desktop mice)
- Landing page: no horizontal overflow on mobile viewports, all cards visible
</verification>

<success_criteria>
1. Explore page content width matches other pages' centering (max-w-7xl, mx-auto)
2. Circle cards on Explore page are compact with side-by-side action buttons
3. Yellow dot cursor invisible on touch devices (phones/tablets), visible on desktop
4. Landing page fully responsive: stacked layout, readable fonts, no card cutoff on mobile
</success_criteria>

<output>
After completion, create `.planning/quick/260409-hfk-fix-4-ui-issues-explore-page-layout-misa/260409-hfk-SUMMARY.md`
</output>
