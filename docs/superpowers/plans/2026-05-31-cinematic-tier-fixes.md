# Cinematic Tier Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the recent tier 1-3 cinematic pass so transitions, canvas effects, and generated sprite art are deterministic, mobile-safe, and covered by tests.

**Architecture:** Keep the existing film player and shot data structure. Move timing math into a tiny pure helper that can be tested directly, replace raw pixel-copy effects with ordinary Canvas 2D drawing commands that respect the current transform, and add a test harness that validates every string-based cinematic sprite matrix.

**Tech Stack:** React 18, TypeScript, Vite, Canvas 2D, Vitest, Playwright.

---

## File Structure

- Modify `src/components/CinematicShort.tsx`: use tested transition timing, keep render loop behavior otherwise unchanged.
- Create `src/game/rendering/cinemaTiming.ts`: pure transition-overlay progress helper.
- Create `src/game/rendering/cinemaTiming.test.ts`: TDD coverage for transition progress across fade-in, hold, and fade-out.
- Modify `src/game/rendering/cinemaHelpers.ts`: make `chromaticAberration` and `lensFlare` transform-safe and remove raw image-data reads/writes.
- Modify `src/game/rendering/cinemaTransitions.ts`: make `glitchTransition` transform-safe and remove raw image-data reads/writes.
- Create `src/game/rendering/cinemaRenderSafety.test.ts`: source-level regression tests for forbidden canvas APIs in cinematic effects.
- Modify `src/game/rendering/cinematicSprites.ts`: fix malformed `stoneArchMatrix` and `initiateProfileFrameD` rows.
- Create `src/game/rendering/cinematicSprites.test.ts`: validate named `PixelMatrix` constants for consistent widths, no literal spaces, and palette coverage.

---

### Task 1: Fix Cinematic Transition Timing

**Files:**
- Create: `src/game/rendering/cinemaTiming.ts`
- Create: `src/game/rendering/cinemaTiming.test.ts`
- Modify: `src/components/CinematicShort.tsx:16`
- Modify: `src/components/CinematicShort.tsx:165-176`

- [ ] **Step 1: Write the failing timing tests**

Create `src/game/rendering/cinemaTiming.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { transitionOverlayProgress } from './cinemaTiming';

describe('transitionOverlayProgress', () => {
  it('does not run custom transitions during shot fade-in', () => {
    expect(transitionOverlayProgress({
      tShotSec: 0.1,
      shotDurationSec: 4,
      transitionDurationMs: 300,
      fadeInSec: 0.35,
      fadeOutSec: 0.4,
    })).toBe(0);
  });

  it('stays off while the shot is fully visible', () => {
    expect(transitionOverlayProgress({
      tShotSec: 2,
      shotDurationSec: 4,
      transitionDurationMs: 300,
      fadeInSec: 0.35,
      fadeOutSec: 0.4,
    })).toBe(0);
  });

  it('ramps from 0 to 1 across the final transition window', () => {
    expect(transitionOverlayProgress({
      tShotSec: 3.85,
      shotDurationSec: 4,
      transitionDurationMs: 300,
      fadeInSec: 0.35,
      fadeOutSec: 0.4,
    })).toBeCloseTo(0.5, 5);

    expect(transitionOverlayProgress({
      tShotSec: 4,
      shotDurationSec: 4,
      transitionDurationMs: 300,
      fadeInSec: 0.35,
      fadeOutSec: 0.4,
    })).toBe(1);
  });

  it('uses the smaller of transition duration and fade-out window', () => {
    expect(transitionOverlayProgress({
      tShotSec: 3.8,
      shotDurationSec: 4,
      transitionDurationMs: 900,
      fadeInSec: 0.35,
      fadeOutSec: 0.4,
    })).toBeCloseTo(0.5, 5);
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
npm.cmd test -- src/game/rendering/cinemaTiming.test.ts
```

Expected: FAIL because `./cinemaTiming` does not exist.

- [ ] **Step 3: Add the pure timing helper**

Create `src/game/rendering/cinemaTiming.ts`:

```ts
export interface TransitionOverlayArgs {
  tShotSec: number;
  shotDurationSec: number;
  transitionDurationMs?: number;
  fadeInSec?: number;
  fadeOutSec?: number;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function transitionOverlayProgress({
  tShotSec,
  shotDurationSec,
  transitionDurationMs = 400,
  fadeInSec = 0.35,
  fadeOutSec = 0.4,
}: TransitionOverlayArgs): number {
  if (tShotSec < fadeInSec) return 0;
  const transitionSec = Math.min(transitionDurationMs / 1000, fadeOutSec);
  const startsAt = shotDurationSec - transitionSec;
  if (tShotSec <= startsAt) return 0;
  return clamp01((tShotSec - startsAt) / transitionSec);
}
```

- [ ] **Step 4: Wire `CinematicShort` to the helper**

In `src/components/CinematicShort.tsx`, add:

```ts
import { transitionOverlayProgress } from '../game/rendering/cinemaTiming';
```

Replace the custom transition block at lines 167-172 with:

```ts
        if (shot?.transition) {
          const progress = transitionOverlayProgress({
            tShotSec,
            shotDurationSec: dur,
            transitionDurationMs: shot.transition.duration,
          });
          if (progress > 0) {
            renderTransition(ctx, W, H, letterbox, shot.transition, progress);
          } else {
            ctx.fillStyle = `rgba(0,0,0,${overlay})`;
            ctx.fillRect(0, 0, W, H);
          }
```

Keep the existing `else` branch for non-transition shots.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm.cmd test -- src/game/rendering/cinemaTiming.test.ts
```

Expected: PASS.

---

### Task 2: Make Canvas Effects Transform-Safe

**Files:**
- Create: `src/game/rendering/cinemaRenderSafety.test.ts`
- Modify: `src/game/rendering/cinemaHelpers.ts:320-406`
- Modify: `src/game/rendering/cinemaTransitions.ts:111-177`

- [ ] **Step 1: Write failing source-level safety tests**

Create `src/game/rendering/cinemaRenderSafety.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import helpers from './cinemaHelpers.ts?raw';
import transitions from './cinemaTransitions.ts?raw';

describe('cinematic canvas effect safety', () => {
  it('does not use raw image data in cinematic effects', () => {
    expect(helpers).not.toMatch(/getImageData|putImageData|createImageData/);
    expect(transitions).not.toMatch(/getImageData|putImageData|createImageData/);
  });

  it('does not reset the active canvas transform inside helpers', () => {
    expect(helpers).not.toContain('setTransform(');
    expect(transitions).not.toContain('setTransform(');
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
npm.cmd test -- src/game/rendering/cinemaRenderSafety.test.ts
```

Expected: FAIL because `cinemaHelpers.ts` currently uses `getImageData`, `putImageData`, and `setTransform`, and `cinemaTransitions.ts` currently uses image data APIs.

- [ ] **Step 3: Replace `chromaticAberration` with a transform-safe visual approximation**

Replace `chromaticAberration` in `src/game/rendering/cinemaHelpers.ts` with:

```ts
export function chromaticAberration(a: ShotArgs, strength = 2): void {
  const alpha = clamp01(strength / 8);
  const offset = Math.max(1, Math.round(strength));
  a.ctx.save();
  a.ctx.globalCompositeOperation = 'screen';
  a.ctx.lineWidth = Math.max(1, offset);
  a.ctx.strokeStyle = `rgba(226, 58, 74, ${0.14 * alpha})`;
  a.ctx.strokeRect(offset, offset, a.width - offset * 2, a.height - offset * 2);
  a.ctx.strokeStyle = `rgba(108, 246, 229, ${0.14 * alpha})`;
  a.ctx.strokeRect(offset * 2, offset * 2, a.width - offset * 4, a.height - offset * 4);
  a.ctx.restore();
}
```

- [ ] **Step 4: Fix `lensFlare` transform resets**

Inside `lensFlare`, replace the diagonal-rays loop with:

```ts
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const g = a.ctx.createLinearGradient(
      cx, cy,
      cx + Math.cos(angle) * 80, cy + Math.sin(angle) * 80,
    );
    g.addColorStop(0, withAlpha(colour, 0.5 * intensity));
    g.addColorStop(1, withAlpha(colour, 0));
    a.ctx.save();
    a.ctx.translate(cx, cy);
    a.ctx.rotate(angle);
    a.ctx.fillStyle = g;
    a.ctx.fillRect(0, -1, 80, 2);
    a.ctx.restore();
  }
```

- [ ] **Step 5: Replace `glitchTransition` with a transform-safe overlay**

Replace `glitchTransition` and remove `drawShiftedChannel` in `src/game/rendering/cinemaTransitions.ts`:

```ts
function glitchTransition(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  _lb: number,
  p: number,
): void {
  const seed = Math.floor(p * 100);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const jitter = (1 - p) * 12;
  ctx.fillStyle = `rgba(226,58,74,${0.16 * (1 - p)})`;
  ctx.fillRect(jitter, 0, W, H);
  ctx.fillStyle = `rgba(108,246,229,${0.16 * (1 - p)})`;
  ctx.fillRect(-jitter, 0, W, H);

  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 8; i++) {
    const barY = (i * 137 + seed * 31) % H;
    const barH = 2 + ((i * 73 + seed * 17) % 8);
    const alpha = (1 - p) * (0.25 + (i % 3) * 0.12);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(0, barY, W, barH);
  }
  ctx.restore();

  if (p > 0.7) {
    const fade = (p - 0.7) / 0.3;
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, W, H);
  }
}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm.cmd test -- src/game/rendering/cinemaRenderSafety.test.ts
```

Expected: PASS.

---

### Task 3: Validate and Fix Cinematic Sprite Matrices

**Files:**
- Create: `src/game/rendering/cinematicSprites.test.ts`
- Modify: `src/game/rendering/cinematicSprites.ts:157-184`
- Modify: `src/game/rendering/cinematicSprites.ts:312-349`

- [ ] **Step 1: Write failing sprite validation tests**

Create `src/game/rendering/cinematicSprites.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import source from './cinematicSprites.ts?raw';

const MATRIX_NAMES = [
  'initiateProfileFrameA',
  'initiateProfileFrameB',
  'initiateProfileFrameC',
  'initiateProfileFrameD',
  'initiateFace',
  'stoneArchMatrix',
  'distantLampMatrix',
  'initiateHeroicFromBelow',
  'handsDagger',
  'initiateFallingFrameA',
  'initiateFallingFrameB',
  'initiateFallingFrameC',
  'initiateLookingUp',
] as const;

function matrixRows(name: string): string[] {
  const match = source.match(new RegExp(`const ${name}: PixelMatrix = \\\\[([\\\\s\\\\S]*?)\\\\];`));
  if (!match) throw new Error(`Missing matrix ${name}`);
  return [...match[1].matchAll(/'([^']*)'/g)].map((row) => row[1]);
}

describe('cinematic sprite matrices', () => {
  it('keeps every row in a matrix the same width', () => {
    for (const name of MATRIX_NAMES) {
      const rows = matrixRows(name);
      const expected = rows[0]?.length ?? 0;
      const badRows = rows
        .map((row, index) => ({ index: index + 1, row, width: row.length }))
        .filter((row) => row.width !== expected);

      expect(badRows, `${name} has inconsistent row widths`).toEqual([]);
    }
  });

  it('uses dots for transparency instead of literal spaces', () => {
    for (const name of MATRIX_NAMES) {
      const rows = matrixRows(name);
      const badRows = rows
        .map((row, index) => ({ index: index + 1, row }))
        .filter((row) => row.row.includes(' '));

      expect(badRows, `${name} contains literal spaces`).toEqual([]);
    }
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
npm.cmd test -- src/game/rendering/cinematicSprites.test.ts
```

Expected: FAIL on `stoneArchMatrix` and `initiateProfileFrameD`.

- [ ] **Step 3: Fix `stoneArchMatrix`**

Replace every literal space in `stoneArchMatrix` with `.` and pad/trim each row to 28 characters. Use this exact matrix:

```ts
const stoneArchMatrix: PixelMatrix = [
  '............oGoo............',
  '.........oooGGGooo..........',
  '.......ooMMMgggMMMoo........',
  '......oMMMMMooMMMMMo........',
  '.....oMMMMovvvvMMMMo........',
  '....oMMMMovvvvvvvMMMo.......',
  '...oMMMMovvvvvvvvvMMMo......',
  '..oMMMMovvvvvvvvvvvMMMo.....',
  '..oMMM.ovvvvvvvvvvMMMo......',
  '.oMMM..ovvvvvvvvvvvvMMMo....',
  '.oMMM..ovvvvvvvvvvvvMMMo....',
  'oMMM....ovvvvvvvvvvvvMMMo...',
  'oMMM....ovvvvvvvvvvvvMMMo...',
  'oMMM....ovvvvvvvvvvvvMMMo...',
  'oMMM....ovvvvvvvvvvvvMMMo...',
  'oMMM....ovvvvvvvvvvvvMMMo...',
  '.oMMM...ovvvvvvvvvvvvMMMo...',
  '.oMMM...ovvvvvvvvvvvvMMMo...',
  '..oMMM..ovvvvvvvvvvMMMo.....',
  '..oMMMM.ovvvvvvvvvvMMMo.....',
  '...oMMMMovvvvvvvvvMMMo......',
  '....oMMMMovvvvvvvMMMo.......',
  '.....oMMMMovvvvvMMMMo.......',
  '......oMMMMooooMMMMo........',
  '.......oMMMMMMMMMMo.........',
  '........oMMMMMMMMo..........',
  '.........oMMMMMMo...........',
  '..........oooooo............',
  '.......oooooooooooo.........',
  '......osssssssssso..........',
  '.....osssssssssssso.........',
  '....osss..sssss..ssso.......',
  '...osss....sss....ssso......',
  '..osss.....sss.....ssso.....',
  '.osss......sss......ssso....',
  '.oss.......ooo.......sso....',
];
```

- [ ] **Step 4: Fix `initiateProfileFrameD`**

Replace rows 18-24 in `initiateProfileFrameD` with 16-character rows:

```ts
  '..orrrrrCCCco...',
  '..orrrrCCCco....',
  '...orrrrCco.....',
  '...orrrr........',
  '....orr.........',
  '....obb.........',
  '....oo..........',
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm.cmd test -- src/game/rendering/cinematicSprites.test.ts
```

Expected: PASS.

---

### Task 4: Full Regression and Browser Smoke

**Files:**
- No production files unless earlier verification finds a new root-cause issue.

- [ ] **Step 1: Run the focused cinematic tests together**

Run:

```bash
npm.cmd test -- src/game/rendering/cinemaTiming.test.ts src/game/rendering/cinemaRenderSafety.test.ts src/game/rendering/cinematicSprites.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full unit suite**

Run:

```bash
npm.cmd test -- --run
```

Expected: all Vitest tests pass.

- [ ] **Step 3: Run typecheck and production build**

Run:

```bash
npm.cmd run typecheck
npm.cmd run build
```

Expected: both commands exit 0.

- [ ] **Step 4: Run E2E suite**

Run:

```bash
npm.cmd run e2e
```

Expected: all Playwright tests pass.

- [ ] **Step 5: Smoke the actual Films flow in the in-app browser**

Target flow:

```text
http://127.0.0.1:5173/ -> Films -> Tabula Smaragdina -> observe first two shots -> return to gallery
```

Checks:
- Main menu title and `Films` button visible.
- Cinematics gallery lists Tabula, The Gate Opens, seven Warden intros, and locked ending.
- Launching Tabula shows cinematic controls and changing shot counter.
- Console has no `error` or `warn` entries relevant to app code.
- The gallery is reachable again after playback/skip.

---

## Self-Review

- Spec coverage: covers all reviewed failures: transition timing, DPR/raw-pixel canvas safety, malformed sprites, unsafe transform resets, and actual browser flow verification.
- Placeholder scan: no TBD/TODO placeholders; each task has exact files, commands, and expected outcomes.
- Type consistency: `transitionOverlayProgress` is defined before use and imported by `CinematicShort`; tests use existing Vitest raw-source patterns already present in `AudioSystem.test.ts`.
