# APK Strategy — Abyss of the Seven Lamps
**Created**: 2026-06-17 | **Version**: 1.0
**Purpose**: Evaluate packaging options and recommend the build pipeline for private Pixel 9 Pro Fold APK.

---

## Option Comparison

| Criteria | Capacitor | PWA (WebView wrapper) | TWA (Trusted Web Activity) | Bare WebView APK |
|----------|-----------|----------------------|---------------------------|-------------------|
| **Setup complexity** | Medium | Low | High (Digital Asset Links) | Low |
| **Native API access** | ✅ Full (plugins) | ❌ None | ❌ None | ❌ None |
| **Audio latency control** | ✅ Via plugin | ⚠️ Browser-dependent | ⚠️ Browser-dependent | ⚠️ Browser-dependent |
| **Offline support** | ✅ Native + SW | ⚠️ SW only | ⚠️ SW only | ⚠️ SW only |
| **Back gesture control** | ✅ Capacitor back button | ❌ System-dependent | ❌ System-dependent | ❌ System-dependent |
| **Play Store eligibility** | ✅ Full | ❌ Not eligible | ✅ Eligible | ❌ Not eligible |
| **File size** | ~8-15 MB | ~3 MB | ~3 MB + verification | ~3 MB |
| **Maintenance** | Active community | Minimal | Google-maintained | Minimal |
| **Performance** | Native WebView (fast) | Browser WebView | Chrome WebView | System WebView |

---

## Recommendation: Capacitor

**Capacitor is the clear winner** for this project's requirements:

1. **Native audio control** — Capacitor plugins allow direct Android audio session management, critical for the game's procedural audio (Tone.js) to avoid Android's WebAudio suspension during focus loss
2. **Back gesture defense** — The fold optimization plan requires intercepting the system back gesture in-game. Capacitor's `@capacitor/android` back-button listener enables this natively
3. **Wake lock** — Capacitor plugin prevents screen dimming during gameplay
4. **Status bar / safe area** — Capacitor's StatusBar and SafeArea plugins handle edge-to-edge properly
5. **Play Store ready** — If distribution moves from private to public, Capacitor is Play Store eligible
6. **Capacitor's WebView** is Chromium-based and performance-identical to Chrome on Android, which the game already targets

---

## Build Pipeline

```
Vite build (static HTML/JS/CSS)
  → Capacitor copy (npx cap copy)
    → Android Studio / Gradle build
      → Signed APK + AAB
```

### Step-by-Step

1. **Initialize Capacitor**:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init "Abyss of the Seven Lamps" "com.zheludevaat.abyss"
   npx cap add android
   ```

2. **Configure Vite**:
   ```typescript
   // vite.config.ts
   export default defineConfig({
     base: './',  // relative paths for Capacitor
     build: { outDir: 'dist' }
   });
   ```

3. **Build & sync**:
   ```bash
   npm run build
   npx cap sync
   ```

4. **AndroidManifest adjustments** (from PIXEL_9_PRO_FOLD_OPTIMIZATION.md):
   - `screenOrientation`: sensorLandscape or fullSensor for fold detection
   - `resizeableActivity="true"` for multi-window
   - `configChanges`: orientation|screenSize|screenLayout|keyboardHidden for fold transitions

5. **Plugins to add**:
   - `@capacitor/status-bar` — edge-to-edge handling
   - `@capacitor/screen-reader` — (optional) accessibility
   - `@capacitor/android` — back button listener
   - Custom plugin or community `capacitor-wake-lock` for screen wake

6. **Signing**:
   ```bash
   keytool -genkey -v -keystore abyss-release.keystore \
     -alias abyss -keyalg RSA -keysize 2048 -validity 10000
   ```
   Store keystore and passwords securely (not in repo). Use environment variables or a signing config file excluded via `.gitignore`.

7. **Build release**:
   ```bash
   cd android && ./gradlew assembleRelease
   # Output: android/app/build/outputs/apk/release/app-release.apk
   ```

---

## Distribution Options

| Option | Setup | Privacy | Updates |
|--------|-------|---------|---------|
| **Direct APK sideload** | None | Full | Manual |
| **Google Play Internal Track** | $25 one-time | Semi-private (up to 100 testers) | Automatic |
| **Google Play Closed Track** | $25 one-time | Private (invite-only) | Automatic |
| **Firebase App Distribution** | Free tier | Private | Automatic |

**Recommendation**: Start with direct sideload for immediate testing. Graduate to Play Store Internal Track when ready for broader testing.

---

## File Size Budget

| Component | Size |
|-----------|------|
| Base WebView APK | ~3 MB |
| Game HTML/JS/CSS (Vite build) | ~2 MB |
| Sprite sheets (future Phase 10) | ~1.5 MB |
| Audio (procedural — no assets) | 0 MB |
| Capacitor runtime | ~2 MB |
| **Total** | **~8.5 MB** |

Well under the 100 MB Play Store APK limit. If sprite assets grow, AAB (Android App Bundle) can handle up to 200 MB.

---

## Key Constraints

- **Private distribution only** — do not publish publicly without explicit approval
- **No Google Play Services dependency** — game should work offline, no achievements/leaderboards API
- **No analytics, no telemetry** — per privacy requirement
- **Procedural audio preserved** — Tone.js runs in Capacitor WebView same as Chrome
