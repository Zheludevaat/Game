# iPhone UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the iPhone home screen and shared menu UI feel like a polished modern mobile game while preserving the retro occult pixel identity.

**Architecture:** Keep UI in the existing React DOM layer and CSS system. Modify `MainMenu.tsx` to expose richer semantic sections and update `pixel-ui.css` for shared panel/button/menu styling, with e2e coverage for iPhone layout and input usability.

**Tech Stack:** React 18, TypeScript, Vite, CSS media queries, Playwright, Vitest.

---

### Task 1: Mobile Home Structure

**Files:**
- Modify: `src/components/MainMenu.tsx`
- Modify: `src/styles/pixel-ui.css`
- Test: `tests/e2e/mobile.spec.ts`

- [ ] **Step 1: Add semantic regions to the home screen**

Add a mobile-first shell in `MainMenu.tsx`: a top sigil/lamp area, title block, status strip, primary action group, secondary action grid, and footer.

- [ ] **Step 2: Style the home screen for iPhone portrait**

In `pixel-ui.css`, add `.main-menu-shell`, `.main-menu-status`, `.main-menu-primary`, and `.main-menu-secondary` rules. Use safe-area padding, stronger contrast, no required scrolling, and a clear primary button.

- [ ] **Step 3: Preserve desktop and landscape behavior**

Keep desktop centered and spacious. Keep landscape compact with a two-column action grid.

### Task 2: Shared Pixel UI Polish

**Files:**
- Modify: `src/styles/pixel-ui.css`
- Modify: `src/components/PixelButton.tsx` only if class variants are needed
- Modify: `src/components/PixelPanel.tsx` only if shared panel structure needs a class hook

- [ ] **Step 1: Upgrade button states**

Improve `.pixel-btn` with readable contrast, tappable height, visible focus, disabled clarity, and a stronger active state.

- [ ] **Step 2: Upgrade panel material**

Improve `.pixel-panel` with carved pixel borders, better background opacity, and less muddy text over dark backgrounds.

- [ ] **Step 3: Respect reduced motion**

Add or preserve `prefers-reduced-motion` handling for decorative movement.

### Task 3: Responsive Verification Coverage

**Files:**
- Modify: `tests/e2e/mobile.spec.ts`
- Test command: `npx playwright test tests/e2e/mobile.spec.ts tests/e2e/ui-input.spec.ts`

- [ ] **Step 1: Assert the iPhone home screen is readable**

Update the mobile test to check the title and key buttons are visible and that the menu does not require document scroll.

- [ ] **Step 2: Assert secondary controls remain reachable**

Check Settings and How to Play are visible on iPhone portrait without relying on page scroll.

### Task 4: QA

**Files:**
- Temporary screenshots under `qa-shots/` only during verification; remove them before final unless intentionally kept.

- [ ] **Step 1: Run verification**

Run `npm run typecheck`, `npm test`, `npm run build`, `npm run e2e`, and `npm audit --omit=dev`.

- [ ] **Step 2: Screenshot iPhone, tablet, and desktop**

Capture iPhone portrait, iPhone landscape, iPad, and desktop home screen screenshots. Inspect for clipping, illegible text, crowded controls, and unsafe tap targets.

- [ ] **Step 3: Clean temporary artifacts**

Remove temporary screenshots/test output before final if not part of the deliverable.
