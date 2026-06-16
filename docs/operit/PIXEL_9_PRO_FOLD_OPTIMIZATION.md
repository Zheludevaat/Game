# Pixel 9 Pro Fold Optimization Plan — "Abyss of the Seven Lamps"

**Created**: 2026-06-16 | **Version**: 1.0 | **Scope**: Comprehensive plan adapting the game to Google Pixel 9 Pro Fold, yielding a polished Capacitor APK that works flawlessly on both folded and unfolded states.

---

## Executive Summary

The game's 480×270 virtual resolution on Canvas 2D targets 16:9 landscape. The Pixel 9 Pro Fold's **2076×2152 unfolded square** and **1080×2424 outer portrait** display demand a dual-mode adaptation. This plan identifies **15 optimization targets** across 5 categories (Display, Android Integration, Performance, Storage, Capacitor APK), with concrete technical solutions, TypeScript code patterns, and Capacitor plugin recommendations.

### Key Principles
1. **Desktop/web build unchanged** — all Android adaptations are conditional
2. **Capacitor-first** — APK wrapping is the primary distribution method
3. **Graceful degradation** — outer display gets "playable" mode; unfolded gets "premium" mode
4. **Permission minimalism** — only audio and WAKE_LOCK permissions
5. **Test on real hardware** — plan requires Pixel 9 Pro Fold device

---

## 1. Device Specifications

| Property | Outer Display | Unfolded Display |
|---|---|---|
| Resolution | 1080×2424 px | 2076×2152 px |
| Aspect ratio | ~1:2.24 (portrait) | ~1:1.04 (near-square) |
| Refresh rate | 120 Hz | 120 Hz |
| GPU | Mali-G715 MC7 (Tensor G4) | Same |
| Hinge | N/A | Center crease at Y≈1076 |

---

## 2. Target Inventory (15 Items)

### 2.1 Display & Layout
| # | Target | Severity |
|---|---|---|
| 1 | Unfolded aspect ratio adaptation | **CRITICAL** |
| 2 | Outer display portrait support | **HIGH** |
| 3 | Fold/unfold state transitions | **HIGH** |
| 4 | Hinge-aware UI placement | **MEDIUM** |

### 2.2 Android Integration
| # | Target | Severity |
|---|---|---|
| 5 | System back gesture handling | **HIGH** |
| 6 | Multi-window/split-screen resilience | **MEDIUM** |
| 7 | Edge-to-edge / safe-area insets | **HIGH** |
| 8 | Status bar & navigation bar | **MEDIUM** |

### 2.3 Performance
| # | Target | Severity |
|---|---|---|
| 9 | Canvas 2D GPU performance at 1920×1080 | **HIGH** |
| 10 | WebAudio latency & buffer tuning | **HIGH** |
| 11 | Sprite sheet decode memory management | **MEDIUM** |
| 12 | Thermal throttling mitigation | **MEDIUM** |

### 2.4 Storage & Networking
| # | Target | Severity |
|---|---|---|
| 13 | Storage quota & IndexedDB migration | **MEDIUM** |
| 14 | Service Worker / offline in Capacitor | **MEDIUM** |

### 2.5 Distribution
| # | Target | Severity |
|---|---|---|
| 15 | Capacitor APK build & release signing | **HIGH** |

---

## 3. Display & Layout Solutions

### 3.1 Unfolded Aspect Ratio Adaptation (CRITICAL)

**Problem**: 480×270 game at 2076×2152 (1:1) creates massive letterboxing — game occupies 2076×1167, leaving 985px vertical dead space.

**Solution**: DisplayManager with integer scaling + ambient letterbox panels.

**Target**: 4× integer scale = 1920×1080 rendered game area. Fits within 2076×2152 with 78px horizontal letterbox and 536px vertical letterbox per side.

```typescript
// New file: src/game/platform/DisplayManager.ts

export interface DisplayConfig {
  virtualW: number;        // 480 (fixed)
  virtualH: number;        // 270 (fixed)
  scale: number;           // integer scale (1-6)
  offsetX: number;         // canvas CSS offset X
  offsetY: number;         // canvas CSS offset Y
  letterboxH: number;      // vertical letterbox per side
  isUnfolded: boolean;
  isOuterDisplay: boolean;
}

export function calculateDisplay(windowW: number, windowH: number): DisplayConfig {
  const ratio = windowW / windowH;

  // Unfolded: near-square (0.9 < ratio < 1.7)
  if (ratio > 0.9 && ratio < 1.7) {
    const scale = Math.min(
      Math.floor(windowW / 480),
      Math.floor(windowH / 270),
      6
    );
    const renderW = 480 * scale;
    const renderH = 270 * scale;
    return {
      virtualW: 480, virtualH: 270, scale,
      offsetX: Math.floor((windowW - renderW) / 2),
      offsetY: Math.floor((windowH - renderH) / 2),
      letterboxH: Math.floor((windowH - renderH) / 2),
      isUnfolded: true, isOuterDisplay: false,
    };
  }

  // Outer display: tall portrait (ratio < 0.55)
  if (ratio < 0.55) {
    const scale = 2; // 960×540 render
    const renderW = 480 * scale;
    const renderH = 270 * scale;
    return {
      virtualW: 480, virtualH: 270, scale,
      offsetX: Math.floor((windowW - renderW) / 2),
      offsetY: Math.min(Math.floor(windowH * 0.12), 150),
      letterboxH: 0,
      isUnfolded: false, isOuterDisplay: true,
    };
  }

  // Default: 16:9 landscape
  const scale = Math.min(Math.floor(windowW / 480), Math.floor(windowH / 270));
  return {
    virtualW: 480, virtualH: 270,
    scale: Math.max(1, Math.min(scale, 6)),
    offsetX: Math.floor((windowW - 480 * scale) / 2),
    offsetY: Math.floor((windowH - 270 * scale) / 2),
    letterboxH: 0,
    isUnfolded: false, isOuterDisplay: false,
  };
}
```

**Letterbox Aesthetics**: The 536px+ vertical dead space is filled with a dark atmospheric gradient (#06030f → #0f0d1c → #06030f) plus optional ambient UI panels showing sphere name, floor number, and active status effects when unfolded.

```typescript
// In canvas rendering pipeline
function drawLetterbox(ctx: CanvasRenderingContext2D, cfg: DisplayConfig): void {
  if (cfg.letterboxH <= 0) return;
  const gameTop = cfg.offsetY;
  const gameBot = cfg.offsetY + 480 * cfg.scale;

  // Top gradient
  const topGrad = ctx.createLinearGradient(0, 0, 0, cfg.letterboxH);
  topGrad.addColorStop(0, '#06030f');
  topGrad.addColorStop(0.7, '#0a0815');
  topGrad.addColorStop(1, '#0f0d1c');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, ctx.canvas.width, cfg.letterboxH);

  // Bottom gradient (mirrored)
  const botGrad = ctx.createLinearGradient(0, gameBot, 0, gameBot + cfg.letterboxH);
  botGrad.addColorStop(0, '#0f0d1c');
  botGrad.addColorStop(0.3, '#0a0815');
  botGrad.addColorStop(1, '#06030f');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, gameBot, ctx.canvas.width, cfg.letterboxH);

  // Ambient UI panels (unfolded only, if letterbox > 200px)
  if (cfg.isUnfolded && cfg.letterboxH > 200) {
    drawUnfoldedAmbientPanels(ctx, cfg);
  }
}
```

**Ambient panel rendering** (unfolded-only bonus HUD):

```typescript
function drawUnfoldedAmbientPanels(ctx: CanvasRenderingContext2D, cfg: DisplayConfig): void {
  ctx.save();
  ctx.font = '16px "abyss-glyphs"';
  ctx.fillStyle = 'rgba(205, 214, 220, 0.35)'; // Selene silver, muted
  ctx.textAlign = 'center';
  const cx = cfg.offsetX + (480 * cfg.scale) / 2;

  // Top panel: sphere + floor info
  ctx.fillText(`SPHERE ${hudState.sphereNum}: ${hudState.sphereName}`, cx, cfg.letterboxH * 0.4);
  ctx.fillText(`FLOOR ${hudState.floorNum}  ·  ${hudState.runTime}`, cx, cfg.letterboxH * 0.4 + 22);

  // Bottom panel: status effects row (if any active)
  if (hudState.activeEffects.length > 0) {
    const botY = cfg.offsetY + 480 * cfg.scale + cfg.letterboxH * 0.5;
    // ... render effect icons from status_icons.png
  }
  ctx.restore();
}
```

### 3.2 Outer Display Support (HIGH)

**Problem**: 1080×2424 portrait — game designed for 16:9 landscape.

**Solution**: Accept portrait as a reduced-functionality mode:

- **2× scale** = 960×540 render area, centered horizontally, offset to upper portion of screen
- **Touch controls expanded**: `TouchControls.tsx` gets 1.5× scale in portrait
- **Rotate hint**: After 5 seconds in portrait, show subtle "Rotate for full experience" text
- **Orientation config**: User setting to lock landscape via Capacitor `ScreenOrientation` plugin

In SettingsMenu, add toggle: "Lock Landscape (recommended)" — default ON.

### 3.3 Fold/Unfold State Transitions (HIGH)

**Problem**: Fold/unfold triggers canvas resize. Must preserve game state.

**Solution**: Debounced resize with game pause during transition:

```typescript
let foldTransitionTimer: ReturnType<typeof setTimeout> | null = null;

function handleDisplayChange(): void {
  gameEngine.pause();
  if (foldTransitionTimer) clearTimeout(foldTransitionTimer);
  foldTransitionTimer = setTimeout(() => {
    const cfg = calculateDisplay(window.innerWidth, window.innerHeight);
    // Resize physical canvas
    canvas.width = cfg.virtualW * cfg.scale;
    canvas.height = cfg.virtualH * cfg.scale;
    canvas.style.left = `${cfg.offsetX}px`;
    canvas.style.top = `${cfg.offsetY}px`;
    // Recalculate touch zones
    inputManager.recalculate(cfg);
    // Redraw letterbox
    drawLetterbox(ctx, cfg);
    // Save new config
    displayConfig = cfg;
    gameEngine.resume();
  }, 350); // debounce covers fold animation (~300ms)
}
```

### 3.4 Hinge-Aware UI Placement (MEDIUM)

**Assessment**: The Pixel 9 Pro Fold hinge at Y≈1076 falls within the game area at 4× scale. The physical crease is subtle and not a touch-dead zone.

**Recommendation**: No code changes unless playtesting reveals issues. If needed, offset game camera by 15px when unfolded to keep player sprite away from crease.

---

## 4. Android Integration Solutions

### 4.1 System Back Gesture Handling (HIGH)

Three-layer defense:

**Layer 1 — Capacitor back button interception** (`@capacitor/app`):
```typescript
import { App } from '@capacitor/app';
App.addListener('backButton', ({ canGoBack }) => {
  if (gameState.screen === 'playing') { showPauseMenu(); }
  else if (gameState.screen === 'pauseMenu') { hidePauseMenu(); }
  else { App.exitApp(); }
});
```

**Layer 2 — WebView gesture insets** (24px edge reservation for system back gesture):
```typescript
// In TouchControls.tsx
const EDGE_DEADZONE = 24;
function isSystemGesture(clientX: number): boolean {
  return clientX < EDGE_DEADZONE || clientX > window.innerWidth - EDGE_DEADZONE;
}
```

**Layer 3 — Capacitor config** (`capacitor.config.ts`):
```typescript
android: {
  allowMixedContent: false,
  captureInput: true,
  webContentsDebuggingEnabled: false,
}
```

### 4.2 Multi-Window / Split-Screen (MEDIUM)

**Detection + warning**: If window dimensions fall below minimum playable size (480×270 at 1×):
```typescript
function handleResize(): void {
  if (window.innerWidth < 480 || window.innerHeight < 270) {
    showUnsupportedSizeOverlay();
    gameEngine.pause();
  } else {
    hideUnsupportedSizeOverlay();
  }
}
```

### 4.3 Edge-to-Edge & Safe-Area Insets (HIGH)

Use Capacitor `@capacitor/safe-area` + CSS `env(safe-area-inset-*)`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```
```css
body { padding: env(safe-area-inset-top) env(safe-area-inset-right)
                   env(safe-area-inset-bottom) env(safe-area-inset-left); }
```

Canvas positioning is computed **within** safe areas, with letterbox filling to edges.

### 4.4 Status Bar & Navigation Bar (MEDIUM)

**Immersive mode during gameplay**:
```typescript
import { StatusBar } from '@capacitor/status-bar';
// During gameplay: StatusBar.hide()
// During menus: StatusBar.show()
```

**Configuration**: Android styles.xml sets `android:navigationBarColor` transparent, `android:windowFullscreen` true.

---

## 5. Performance Solutions

### 5.1 Canvas 2D GPU Performance at 4× Scale (HIGH)

**Target**: Stable 60 FPS at 1920×1080 render buffer on Tensor G4.

**Strategy**:
1. **Cap to 60 FPS** (not 120) — `requestAnimationFrame` with 16.7ms interval gate
2. **Sprite sheet migration** (PixelLab Phases A-D) — replace N×M `fillRect()` calls with single `drawImage()` per sprite
3. **Pre-render gradient sprites** — no `createRadialGradient()` in render loop
4. **Benchmark first**: Add FPS counter in dev builds, test on real hardware with procedural sprites BEFORE commencing PixelLab

```typescript
// Frame rate cap
const TARGET_FPS = 60;
const FRAME_MS = 1000 / TARGET_FPS;
let lastFrameTime = 0;

function gameLoop(timestamp: number): void {
  requestAnimationFrame(gameLoop);
  const elapsed = timestamp - lastFrameTime;
  if (elapsed < FRAME_MS) return;
  lastFrameTime = timestamp - (elapsed % FRAME_MS);
  update(elapsed / 1000);
  render();
}
```

**Fallback plan**: If 4× scale cannot sustain 60 FPS even with sprite sheets, drop to 3× (1440×810) — still crisp on 2076×2152 display.

### 5.2 WebAudio Latency & Buffer Tuning (HIGH)

**Key concern**: Tone.js on Android WebView may have higher latency/buffer underruns than desktop Chrome.

**Android-specific audio context**:
```typescript
function createAudioContext(): AudioContext {
  const isAndroid = /Android/.test(navigator.userAgent);
  return new AudioContext({
    sampleRate: isAndroid ? 22050 : 44100,
    latencyHint: isAndroid ? 'balanced' : 'interactive',
  });
}
```

**Tone.js tuning**:
```typescript
if (isAndroid) {
  Tone.context.lookAhead = 0.2; // 200ms look-ahead (default ~0.1)
}
```

**Audio diagnostic additions**: Track `outputLatencyMs`, `sampleRate`, `bufferSize` in existing diagnostics system.

### 5.3 Sprite Sheet Decode Memory (MEDIUM)

**Strategy**: Progressive loading by priority tier (CRITICAL/HIGH/MEDIUM/LOW) — see PIXELLAB_VISUAL_OVERHAUL_PLAN.md §10 for asset manifest. CRITICAL assets (player, floor tiles) load before main menu. HIGH/MEDIUM load in background during menu. LOW (cinematic backgrounds) lazy-load on demand.

**Total GPU memory**: ~12 MB after decode — well within Tensor G4 capacity (~2-4 GB shared).

### 5.4 Thermal Throttling Mitigation (MEDIUM)

- **60 FPS cap** (not 120)
- **Sprite sheet migration** reduces GPU fill-rate
- **Idle frame dropping**: 30 FPS cap when game is paused or in menu screen
- **Power-saving hint** after 30 min continuous play (subtle, non-intrusive)

---

## 6. Storage & Networking Solutions

### 6.1 Storage — IndexedDB Migration (MEDIUM)

**Problem**: `localStorage` limited to ~5-10 MB on Android WebView.

**Solution**: New `StorageAdapter` abstraction with IndexedDB backend + localStorage fallback:

```typescript
// src/game/platform/StorageAdapter.ts
interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAvailableBytes(): Promise<number>;
}

class IndexedDBBackend implements StorageBackend { /* save store */ }
class LocalStorageBackend implements StorageBackend { /* existing logic */ }
```

**Migration**: On first run after update, copy all localStorage keys to IndexedDB, set `migration_complete` flag.

**Quota monitoring**: Warn user if available space drops below 5 MB.

### 6.2 Service Worker — Conditional Registration (MEDIUM)

```typescript
const isCapacitor = !!(window as any).Capacitor;

if (!isCapacitor) {
  navigator.serviceWorker?.register('/sw.js'); // web PWA only
}
// In Capacitor: all assets bundled in APK, no SW needed
```

---

## 7. Capacitor APK Build & Signing (HIGH)

### 7.1 Project Initialization
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Abyss of the Seven Lamps" "com.abyss.sevenlamps" --web-dir=dist
npx cap add android

# Essential plugins
npm install @capacitor/app @capacitor/status-bar @capacitor/splash-screen
npm install @capacitor/device @capacitor/screen-orientation
npm install @capacitor/safe-area
```

### 7.2 capacitor.config.ts
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.abyss.sevenlamps',
  appName: 'Abyss of the Seven Lamps',
  webDir: 'dist',
  server: { androidScheme: 'https', cleartext: false },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      backgroundColor: '#06030f',
      androidSplashResourceName: 'splash',
    },
    StatusBar: { style: 'DARK', backgroundColor: '#06030f' },
  },
};
export default config;
```

### 7.3 Android Manifest (`AndroidManifest.xml`)
```xml
<uses-feature android:name="android.software.foldable" android:required="false"/>
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

<activity
  android:configChanges="orientation|screenSize|screenLayout|keyboardHidden|smallestScreenSize|density"
  android:resizeableActivity="true"
  android:keepScreenOn="true">
```

### 7.4 Build Pipeline
```bash
npm run build              # Vite prod build → dist/
npx cap sync android       # sync web assets to Android project
npx cap open android       # open in Android Studio
# In Android Studio: Build → Generate Signed Bundle/APK
```

**Signing**: Release keystore generation + Google Play App Signing (recommended). Store keystore securely (not in repo).

**CI option**: GitHub Actions workflow for automated APK builds on tag push:
```yaml
- run: npm ci && npm run build
- run: npx cap sync android
- run: cd android && ./gradlew assembleRelease
```

---

## 8. Testing Protocol

### 8.1 Hardware Requirements
- Google Pixel 9 Pro Fold (required — no emulator can simulate fold mechanics)
- USB-C debugging cable
- Android Studio for logcat monitoring

### 8.2 Test Matrix

| Test | Outer Display | Unfolded | Fold→Unfold | Unfold→Fold |
|---|---|---|---|---|
| **App launch** | ✅ Required | ✅ Required | — | — |
| **Main menu** | ✅ Required | ✅ Required | ✅ Required | ✅ Required |
| **Gameplay 10 min** | ✅ Required | ✅ Required | ✅ Required | ✅ Required |
| **Pause/resume** | ✅ Required | ✅ Required | ✅ Required | ✅ Required |
| **Audio continuity** | ✅ Required | ✅ Required | ✅ Required | ✅ Required |
| **Touch controls** | ✅ Required | ✅ Required | ✅ Required | ✅ Required |
| **Back gesture** | ✅ Required | ✅ Required | — | — |
| **Split-screen** | ✅ Required | ✅ Required | — | — |
| **Save/load** | ✅ Required | ✅ Required | ✅ Required | ✅ Required |
| **FPS benchmark** | ✅ Required | ✅ Required | — | — |
| **30-min soak test** | Optional | ✅ Required | — | — |
| **Offline mode** | ✅ Required | ✅ Required | — | — |
| **Splash screen** | ✅ Required | ✅ Required | — | — |

### 8.3 Performance Benchmarks (Targets)
| Metric | Target |
|---|---|
| FPS (unfolded, procedural sprites) | ≥ 45 FPS |
| FPS (unfolded, sprite sheets) | 60 FPS stable |
| FPS (outer display) | 60 FPS stable |
| Frame time p99 | < 25ms |
| Audio latency | < 50ms |
| Memory (after 30 min) | < 200 MB growth |
| APK size (with assets) | < 15 MB |

---

## 9. Implementation Phases

### Phase 5A — Foundation (Platform Detection)
- Implement `DisplayManager.ts` with `calculateDisplay()`
- Add Capacitor to project (`npm install` + `npx cap init` + `npx cap add android`)
- Implement `StorageAdapter.ts` with IndexedDB backend
- Test: app runs in Android Studio emulator (basic)

### Phase 5B — Display Adaptation
- Implement letterbox rendering with `drawLetterbox()`
- Implement fold/unfold transition handling (debounced resize)
- Implement outer display portrait mode
- Test: visual correctness on Pixel 9 Pro Fold (both states)

### Phase 5C — Android Integration
- Back gesture handling (Capacitor + edge deadzone)
- Safe-area insets + immersive mode
- Multi-window detection + warning
- Audio context Android tuning
- Test: full interaction on device

### Phase 5D — Performance & Polish
- FPS benchmarking + frame rate cap
- Progressive asset loading integration
- Thermal mitigation (idle frame dropping)
- Splash screen + status bar
- Test: 30-min soak test, FPS benchmarks

### Phase 5E — Release Build
- Android signing key generation
- Release APK build
- Google Play Store listing prep (screenshots from unfolded display)
- Test: install release APK on clean device

**Estimated Effort**: ~60 hours total (30 hrs engineering + 20 hrs testing + 10 hrs store prep)

---

## 10. Risk Assessment

| Risk | Severity | Probability | Mitigation |
|---|---|---|---|
| Canvas 2D can't sustain 60 FPS at 4× scale | HIGH | Medium | Benchmark early; fall back to 3× scale; accelerate PixelLab sprite migration |
| Tone.js audio glitches on Android WebView | HIGH | Low | Android-specific AudioContext tuning; test on device before launch |
| Fold transition causes state corruption | MEDIUM | Medium | Pause game during transition; debounce resize to 350ms; test edge cases |
| Outer display unplayable even in adapted mode | MEDIUM | Medium | Accept as "bonus" mode — not primary play experience; show rotate prompt |
| System back gesture conflicts unresolved | LOW | Low | Three-layer defense should handle all cases |
| Capacitor plugin compatibility break | MEDIUM | Low | Pin plugin versions; test before upgrading |

---

## 11. Dependencies

### 11.1 Prerequisites from Other Phases
- **PixelLab Phase A (Entity Sprites)**: Needed for performance benchmarks — sprite sheet `drawImage()` is key to hitting 60 FPS at 4× scale
- **PR #1 Content**: iOS polish fixes (touch, splash) may partially apply to Android; gamepad fixes directly applicable
- **Build system**: Vite production build must output to `dist/` for Capacitor sync

### 11.2 New Dependencies
| Package | Purpose |
|---|---|
| `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` | APK wrapping |
| `@capacitor/app` | Back button handling |
| `@capacitor/status-bar` | Immersive mode |
| `@capacitor/splash-screen` | Launch splash |
| `@capacitor/device` | Device info queries |
| `@capacitor/screen-orientation` | Lock landscape |
| `@capacitor/safe-area` | Safe area insets |

---

## 12. Success Criteria

- [ ] Game launches and plays at 60 FPS on unfolded Pixel 9 Pro Fold
- [ ] Fold/unfold transitions preserve game state; no crashes or visual corruption
- [ ] Outer display mode is playable (touch controls work, 2× scale readable)
- [ ] System back gesture opens pause menu, does not exit app during gameplay
- [ ] Safe-area insets respected; no content hidden behind camera cutout
- [ ] Audio plays without glitches, pops, or buffer underruns
- [ ] Splash screen displays during app launch (2500ms)
- [ ] Save data persists across app restarts (IndexedDB)
- [ ] APK builds and installs on Android 12+ devices
- [ ] Total APK size < 15 MB
- [ ] 30-minute continuous play without thermal throttling drop below 45 FPS
- [ ] Offline mode works (all assets in APK)

---

**End of PIXEL9_FOLD_OPTIMIZATION_PLAN.md**
