# PixelLab Visual Overhaul Plan — "Abyss of the Seven Lamps"

**Created**: 2026-06-16
**Version**: 1.0
**Scope**: Comprehensive plan for replacing the procedural pixel-art rendering system with a modern sprite-sheet-based pixel-art visual identity while preserving all gameplay, audio, and platform functionality.

---

## Executive Summary

The game currently renders **all visuals procedurally** using `PixelMatrix` string arrays drawn pixel-by-pixel via Canvas 2D `fillRect()` calls. There are zero external assets (no PNG, JPG, WebP, no sprite sheets, no texture atlases). This plan proposes a **phased parallel rendering pipeline** that introduces sprite-sheet assets alongside the existing procedural system, allowing incremental migration without breaking gameplay. The audio system (Tone.js procedural synthesis — a major production asset) is **preserved unchanged**.

### Key Principles
1. **Do not break gameplay** — The game must remain playable at every phase
2. **Preserve the audio system** — Tone.js is left untouched
3. **Parallel pipeline** — Old procedural rendering and new sprite rendering coexist during migration
4. **Incremental delivery** — Each phase produces a visually improved, playable build
5. **Mobile-first** — All assets must perform well on Pixel 9 Pro Fold (Tensor G4 GPU)
6. **Sphere identity** — Leverage and extend the PR branch's per-sphere visual identity work

---

## 1. Current State Assessment

### 1.1 Rendering Architecture (from REPO_AUDIT.md §6)

```
drawSprite(ctx, rows: PixelMatrix, palette, x, y, scale, flipX)
  └── for each row, for each char:
        ctx.fillStyle = palette[char]
        ctx.fillRect(x + i*scale, y + j*scale, scale, scale)
```

**All visuals** pass through this single function. The system is elegant but has inherent limitations:
- No asset pipeline (no sprite sheets, no texture atlases)
- Every pixel is a `fillRect()` call — fine for desktop, potentially expensive on mobile GPU
- Sphere tinting is achieved by `mixHexToward()` at draw time (works, but limits visual richness)
- Bosses are identical 22×20 silhouettes with palette swaps — no visual differentiation
- Animations are frame-by-frame via walkPhase/sin(t) parameters — no sprite-sheet frame sequences
- No WebGL acceleration path — pure Canvas 2D

### 1.2 What the PR Branch Adds Visually
From OPEN_PR_AUDIT.md §3.10:
- Per-sphere floor patterns and wall textures
- Per-room-type mood overlays
- Per-shrine altar variants
- Intentional prop placement with templates
- AAP-64 Lospec palette anchor
- Four-layer lighting rebalance
- Sphere-tinted dash trails

These additions are **all still procedural** (extensions of the PixelMatrix system). They provide structural differentiation but not asset-quality visuals.

### 1.3 Target Visual Quality
The goal is to transform from "procedural pixel-art proof-of-concept" to **"premium indie pixel-art game"** suitable for:
- Google Play Store listing with attractive screenshots
- Playable on 2076×2152 unfolded Pixel 9 Pro Fold display
- Recognizable as a polished commercial product

---

## 2. Technical Strategy: Parallel Rendering Pipeline

### 2.1 SpriteRegistry — New Asset Management Layer

```typescript
// New file: src/game/rendering/SpriteRegistry.ts

interface SpriteSheet {
  image: HTMLImageElement;        // loaded sprite sheet PNG
  frameWidth: number;             // width of single frame
  frameHeight: number;            // height of single frame
  framesPerRow: number;           // layout hint
  animations: Record<string, {    // named animations
    startFrame: number;
    frameCount: number;
    frameDuration: number;        // ms per frame
  }>;
}

interface SpriteEntry {
  sheet: SpriteSheet;
  defaultAnimation: string;
  scale: number;                  // base display scale
}

class SpriteRegistry {
  private sprites: Map<string, SpriteEntry> = new Map();
  private loaded = false;

  async loadAll(): Promise<void>;      // load all sprite sheets
  get(key: string): SpriteEntry | null;
  drawFrame(ctx, key, animName, frameIndex, x, y, scale?, flipX?, tint?): void;
}
```

The `drawFrame()` method:
1. Looks up the sprite entry
2. Calculates source rectangle from frame index and sheet layout
3. Uses `ctx.drawImage(sheet.image, sx, sy, sw, sh, dx, dy, dw, dh)` — a single call per sprite instead of N×M `fillRect()` calls
4. Applies optional tint via `ctx.globalCompositeOperation` or a tinted offscreen canvas

### 2.2 Backward Compatibility Adapter

```typescript
// Extends existing drawSprite() to try SpriteRegistry first, fall back to procedural
export function drawSpriteCompat(
  ctx: CanvasRenderingContext2D,
  spriteKey: string,              // matches SpriteRegistry key
  proceduralRows: PixelMatrix,    // fallback PixelMatrix
  palette: Record<string, string | null>,
  x: number, y: number,
  scale: number,
  flipX: boolean,
  animName?: string,
  frameIndex?: number,
  tint?: string,
): void {
  const sprite = spriteRegistry.get(spriteKey);
  if (sprite && spriteRegistry.loaded) {
    spriteRegistry.drawFrame(ctx, spriteKey, animName ?? sprite.defaultAnimation, frameIndex ?? 0, x, y, scale, flipX, tint);
  } else {
    drawSprite(ctx, proceduralRows, palette, x, y, scale, flipX);
  }
}
```

### 2.3 Migration Phasing

```
Phase A ─── Entity Sprites (player, enemies, bosses)
Phase B ─── Tile System (floors, walls, doors)
Phase C ─── Interactive Objects (chests, shrines, stairs, torches)
Phase D ─── Effects & Overlays (projectiles, particles, mood overlays, dash trails)
Phase E ─── UI Chrome (menu backgrounds, panel borders, icons)
Phase F ─── Cinematics (title screen, cutscene backgrounds)
```

Each phase:
1. Design and produce sprite sheets
2. Add entries to SpriteRegistry
3. Wire up in the appropriate draw function
4. Test with procedural fallback
5. Once verified, mark the procedural variant as deprecated

---

## 3. Phase A — Entity Sprites

### 3.1 Player Sprite (Initiate)

**Current**: 14×17 PixelMatrix with 17-row string array. Walk-bob via `Math.abs(Math.sin(walkPhase)) * 1.5`. Flash via full-white palette swap. Single facing direction with horizontal flip.

**Target**: 
- **Sprite sheet**: `initiate.png` — 64×80 px sheet with 4 animation rows × 8 frames each
- **Animations**:
  - `idle`: 4 frames, 200ms each — subtle breathing, hood sway
  - `walk`: 8 frames, 100ms each — full walk cycle with robe flow
  - `attack`: 6 frames, 80ms each — weapon swing arc
  - `cast`: 6 frames, 100ms each — spell-casting pose with hand glow
  - `hurt`: 3 frames, 120ms each — recoil/stagger
  - `death`: 6 frames, 150ms each — collapse to ground
- **Walk bob**: Built into sprite animation frames (no more sin() bob in code — cleaner)
- **Flash**: Use `ctx.globalCompositeOperation = 'source-atop'` + white fill over rendered sprite
- **Facing**: Horizontal flip via `ctx.scale(-1, 1)` (already implemented)

### 3.2 Enemy Sprites (7 types + Salt Banshee = 8)

**Current**: Each enemy is a PixelMatrix (11×10 to 18×12). Sphere tinting via `mixHexToward()` at 22% strength. Flash via white palette swap. All monochrome-with-accent procedural designs.

**Target**:
- **Individual sprite sheets** for each enemy type (no palette-swap — each is visually distinct):
  - `lesserShade.png`: 48×56 — wraith with burning eyes, wisp tail
  - `mercuryImp.png`: 44×48 — sharp angular imp, teal accents
  - `saltGolem.png`: 52×60 — stocky construct, stone texture
  - `lunarWisp.png`: 44×52 — moon-fragment with crescent
  - `saturnKnight.png`: 52×64 — armored knight, red visor
  - `serpentOfBrass.png`: 72×56 — coiled snake, gold scales
  - `saltBanshee.png`: 44×56 — ghostly wailer, translucent
- **Per-sphere tinting**: Instead of `mixHexToward()` in code, provide **sphere-tinted sprite sheet variants** (8 sheets per enemy type = 64 sheets). Alternatively: render enemy normally, then apply a colored overlay at 22% opacity via `ctx.fillRect` with `globalAlpha` + `globalCompositeOperation`. The overlay approach is more memory-efficient (8× fewer sprite sheets).
- **Animations per enemy**:
  - `idle`: 4 frames — idle stance
  - `walk`: 6 frames — movement/floating
  - `attack`: 4 frames — strike/bite/projectile launch
  - `hurt`: 2 frames — flinch
  - `death`: 4 frames — dissolve/collapse

### 3.3 Boss Sprites (7 Wardens + WardenBoss legacy = 8)

**Current**: All 7 Wardens are **identical 22×20 PixelMatrix with palette swaps**. The only differentiation is color. This is the single biggest visual weakness of the game.

**Target**:
- **7 unique boss sprite sheets**, each a distinct entity design:
  - `seleneWarden.png`: 96×96 — ethereal moon Warden, flowing robes, crescent motifs
  - `hermesWarden.png`: 96×96 — quicksilver serpent Warden, mercurial wings
  - `aphroditeWarden.png`: 96×96 — crystalline rose Warden, thorned armor
  - `heliosWarden.png`: 96×96 — solar flame Warden, corona halo
  - `aresWarden.png`: 96×96 — iron-blood Warden, spiked gauntlets
  - `zeusWarden.png`: 96×96 — storm-crowned Warden, lightning arcs
  - `kronosWarden.png`: 96×96 — time-eaten Warden, half-skeletal
- **Each Warden gets**:
  - `idle`: 6 frames — breathing, particle aura
  - `attack1`: 8 frames — primary melee swing
  - `attack2`: 8 frames — special sphere attack
  - `hurt`: 3 frames — stagger
  - `death`: 10 frames — dramatic defeat sequence
- **Sphere color identity preserved** through palette design, not code tinting
- **Entrance animation**: 12 frames — Warden materializes/appears (replaces current simple fade-in)

### 3.4 Phase A — Implementation Steps

1. Create sprite sheet PNGs (design in Aseprite/Pixelorama, export as single PNG atlas)
2. Add to `public/assets/sprites/` directory
3. Implement `SpriteRegistry` class with async loading
4. Extend `drawInitiate()` to use `spriteRegistry.drawFrame()` with procedural fallback
5. Extend `drawEnemy()` to use `spriteRegistry.drawFrame()` with procedural fallback
6. Wire animation state (walkPhase → frameIndex, combat state → animation name)
7. Test: start game, verify player/enemies/bosses render correctly
8. Test: sphere tinting via overlay approach
9. Test: hit flash, death animations
10. Perf test: measure FPS before/after on desktop and mobile

---

## 4. Phase B — Tile System

### 4.1 Floor Tiles

**Current**: `drawFloorTile()` — deterministic PRNG-based procedural tiles with base color variants, edge shading, mortar, random cracks, rare gold inlays. 16×16 px per tile.

**Target**:
- **Tile atlas**: `floor_atlas.png` — 128×128 px containing 8×8 variant tiles at 16×16 each
- **8 floor variants**: Cracked, mortared, gold-inlaid, rune-marked, pristine, weathered, mossy, sphere-glyph
- **Per-sphere floor sets**: 8 sphere-specific tile atlases (128×128 each) with unique patterns
  - Selene: Silver-veined dark stone
  - Hermes: Quicksilver mercurial tiles
  - Aphrodite: Rose-veined marble
  - Helios: Sun-baked gold-flecked clay
  - Ares: Blood-rusted iron plates
  - Zeus: Storm-cloud marble with lightning cracks
  - Kronos: Time-worn sandstone with fossil inclusions
  - Ogdoad: Primordial basalt with lamp-glyph carvings
- **Tile selection**: Use existing PRNG (`tileHash`) but map to atlas UV instead of procedural drawing
- **Rendering**: Single `ctx.drawImage(atlas, sx, sy, 16, 16, x, y, size, size)` per tile — massive performance win over the current multi-rect procedural approach

### 4.2 Wall Tiles

**Current**: `drawWallTile()` — base stone with highlight ridge, brick mortar with offset pattern, stone variation, bottom shadow. Sphere-tinted capstones.

**Target**:
- **Tile atlas**: `wall_atlas.png` — 128×128 px with wall variants
- **8 per-sphere wall sets**: Matching floor sets
- **Edge/capstone variants**: Separate top-edge tiles with sphere-colored capstones
- **Door frames**: Dedicated door-frame tiles (replacing procedural door rendering)

### 4.3 Phase B — Implementation Steps

1. Design 8 sphere-specific floor tile atlases (8×8 tiles, 16×16 px each)
2. Design 8 sphere-specific wall tile atlases with capstone variants
3. Add to SpriteRegistry as "tile_atlas_selene_floor", etc.
4. Implement `drawFloorTileSprite()` that maps PRNG to atlas UV
5. Implement `drawWallTileSprite()` with capstone selection
6. Wire into DungeonGenerator render pass
7. Test: all 8 spheres, verify visual distinctness
8. Perf test: tile rendering should be significantly faster (1 drawImage vs 10+ fillRect calls per tile)

---

## 5. Phase C — Interactive Objects

### 5.1 Chests

**Current**: `drawChest()` — 18×16 procedural with wood grain, gold bands, lock plate, open interior with loot beam and coins. 3 states: closed, opening, open.

**Target**:
- **Sprite sheet**: `chest.png` — 80×64 px
- **Animations**:
  - `closed`: 1 frame (with idle shimmer on lock)
  - `opening`: 6 frames — lid lifts, glow escapes
  - `open`: 4-frame loop — gentle loot sparkle
  - `locked`: 1 frame variant with red lock glow
- **Loot beam**: Separate effect sprite (Phase D)

### 5.2 Shrines

**Current**: `drawShrine()` — 24×14 procedural with platform, column, gold filigree, flame orb (unused) or dark bowl (used). Flicker animation via sin(t).

**Target**:
- **Sprite sheet**: `shrine.png` — 96×96 px
- **7 shrine-kind variants** (leveraging PR branch's per-shrine visual work):
  - Heal Shrine: Green-gold with caduceus motif
  - Buff Shrine: Blue-gold with rising sun
  - Curse Shrine: Purple-black with thorn motif
  - Trade Shrine: Brass with scales motif
  - Revelation Shrine: Silver with eye motif
  - Forge Shrine: Orange-gold with hammer motif
  - Echo Shrine: Pale with spiral motif
- **States**: `idle` (flame flicker loop), `used` (dark bowl), `activating` (transition burst)

### 5.3 Stairs

**Current**: `drawStairs()` — 24×24 with glow, arch, 5 receding steps, pulsing rune glyph. Pulse via sin(t*3).

**Target**:
- **Sprite sheet**: `stairs.png` — 64×64 px
- **Per-sphere stair variants**: Matching each sphere's aesthetic
- **Animations**:
  - `idle`: 8-frame loop — rune pulse, subtle glow breathing
  - `activating`: 4 frames — glow intensifies on approach
- **Glow**: Separate halo sprite rendered behind stairs (Phase D)

### 5.4 Torches

**Current**: `drawTorch()` — 6×9 bracket + radial gradient halo + 3-layer flame with flicker. Sphere-tinted flame. Ember particles. Complex procedural with `createRadialGradient`.

**Target**:
- **Sprite sheet**: `torch.png` — 48×64 px
- **Bracket**: Single frame (iron + gold rivet)
- **Flame**: 8-frame flicker loop, 3 variants per sphere tint
- **Halo**: Pre-rendered radial gradient PNG overlay (avoids expensive `createRadialGradient` calls every frame)
- **Embers**: Particle system (Phase D)

---

## 6. Phase D — Effects & Overlays

### 6.1 Projectiles & Particles

**Current**: Likely simple colored rectangles or small PixelMatrix shapes. (Source code for projectile rendering not fully inspected — assumed simple rects.)

**Target**:
- **Projectile sprite sheet**: `projectiles.png` — 128×128 px atlas
  - Magic bolt: 8×8 glowing teal orb, 4-frame pulse
  - Fire spread: 12×12 flame burst, 4-frame expansion
  - Void orb: 10×10 dark sphere, 4-frame rotation
  - Wrath splinter: 16×4 crystal shard, 2-frame gleam
  - Mirror sigil: 12×12 hexagon, 4-frame spin
- **Particle atlas**: `particles.png` — 64×64 px
  - Spark, smoke puff, ember, dust, magic glitter, blood drop
- **Hit effects**: `hit_fx.png` — 128×128 px atlas
  - Slash arc (4 frames), impact burst (4 frames), crit star (2 frames), parry flash (2 frames)

### 6.2 Mood Overlays (PR Branch Feature)

**Current** (PR branch): Per-room-type mood overlays — colored semi-transparent fills.

**Target**:
- **Pre-rendered overlay textures**: `mood_overlays.png` — 256×256 px atlas
  - Sanctuary glow: Soft radial gradient, warm
  - Combat haze: Red-tinted vignette
  - Treasure shimmer: Gold sparkle pattern
  - Darkness pressure: Vignette with subtle eye-like shapes
  - Revelation light: Bright top-down beam
- **Apply via `ctx.drawImage` with `globalAlpha`** instead of procedural fills

### 6.3 Dash Trail

**Current** (PR branch): Sphere-colored dash trail — simple colored rects fading behind player.

**Target**:
- **Dash trail sprite**: `dash_trail.png` — 32×32 px per-sphere variant
  - Wind-streak shape with fading opacity, sphere-colored
  - Spawned as particle instances behind player during dash

### 6.4 Status Effect Indicators (PR Branch Feature)

**Target**:
- **Status icon atlas**: `status_icons.png` — 64×64 px
  - Burn, Poison, Slow, Stun, Shield, Regen — 8×8 icons
  - Render as small icons near entity health bar

---

## 7. Phase E — UI Chrome

### 7.1 Menu Backgrounds

**Current**: CSS-styled React components (App.css / pixel-ui.css). Dark backgrounds, pixel-font text.

**Target**:
- **Menu background image**: `menu_bg.png` — 480×270 px (matching VIRTUAL_W × VIRTUAL_H)
  - Dark vignette with central lamp icon glow
  - Subtle animated particles overlaid (Phase D particle system)
- **Panel borders**: `panel_borders.png` — 9-slice sprite sheet for modal panels
  - Gold-trimmed dark stone border
  - Corner ornaments (lamp glyphs)

### 7.2 HUD Elements

**Current**: Canvas-rendered HUD (likely — in App.tsx HUD component). Health/mana bars, weapon/spell icons, minimap.

**Target**:
- **HUD icon atlas**: `hud_icons.png` — 128×128 px
  - Heart (health), Star (mana), Sword (weapon), Scroll (spell), Relic slot, Map pin
- **Health/Mana bars**: 9-slice bar backgrounds + fill sprites
- **Combo counter**: Stylized "×N" with pulsing gold glow (sprite + CSS animation hybrid)
- **Status strip**: Icon row with countdown bars under each (from status_icons.png)

### 7.3 Font

**Current**: System pixel font (likely monospace CSS). PR branch adds `abyss-glyphs.woff2` custom font.

**Target**:
- Use `abyss-glyphs.woff2` from PR branch as primary UI font
- Add a second font weight/variant for headings if needed
- Ensure font renders correctly on Android WebView (WOFF2 widely supported)

---

## 8. Phase F — Cinematics

### 8.1 Title Screen

**Current**: Procedural title text + menu options. Menu hum audio (preserved).

**Target**:
- **Title screen background**: `title_bg.png` — 480×270 px
  - Seven lamps arranged in descending spiral into abyss
  - Subtle glow animation on each lamp (sprite overlay)
  - Animated particles rising from abyss (Phase D)
- **Title text**: Render via `abyss-glyphs.woff2` font + gold gradient + shadow
  - Alternatively: pre-rendered title text as sprite for consistent pixel look

### 8.2 Cutscene Backgrounds

**Current**: Text + fade transitions. No visual assets.

**Target**:
- **Cutscene background atlas**: `cutscenes.png` — 960×540 px (2× game rez for quality)
  - Opening: Starlit sky with descending light beam
  - Descent: Spiral staircase into darkness
  - Selene Intro: Moonlit chamber
  - Hermes Intro: Quicksilver vortex
  - Aphrodite Intro: Rose-thorn garden
  - Helios Intro: Solar forge
  - Ares Intro: Blood-soaked battlefield
  - Zeus Intro: Storm-wracked peak
  - Kronos Intro: Time-frozen hall
  - Ending: Seven lamps relit, ascending light
  - Epilogue: Dawn over horizon
- **Overlay text**: White pixel-font with typewriter effect (CSS animation)

---

## 9. Palette & Color Strategy

### 9.1 Anchor Palette

The PR branch anchors to **AAP-64 Lospec reference** — a curated 64-color palette standard. This provides:
- Consistent color language across all assets
- Easy color-ramp selection for shading
- Compatibility with pixel-art community tools (Aseprite, Pixelorama)

### 9.2 Sphere Color Signatures

| Sphere | Primary | Secondary | Accent | Mood |
|---|---|---|---|---|
| **Selene** (Moon) | #2a3a52 | #6c8cff | #cdd6dc | Cool silver, ethereal |
| **Hermes** (Mercury) | #0d3a40 | #1f8a86 | #6cf6e5 | Quick teal, mercurial |
| **Aphrodite** (Venus) | #5b2a52 | #9b6cff | #ff9bc1 | Warm rose, crystalline |
| **Helios** (Sun) | #7a5a1a | #c8983f | #f4d27a | Hot gold, solar |
| **Ares** (Mars) | #5a1018 | #e23a4a | #ff7a5a | Blood red, iron |
| **Zeus** (Jupiter) | #2a1608 | #c8983f | #f4d27a | Storm bronze, lightning |
| **Kronos** (Saturn) | #1a0f2c | #3b265c | #5b3a86 | Deep violet, time-worn |
| **Ogdoad** (Primordial) | #06030f | #1f1142 | #3a225f | Void indigo, ancient |

### 9.3 Tinting Strategy for Mobile Performance
- **Pre-rendered tinted sheets**: For frequently-used sprites (enemies), pre-render 8 tinted variants at build time
- **Runtime overlay**: For rare sprites (bosses), apply tint via `globalAlpha` overlay — acceptable cost for infrequent use
- **No `mixHexToward()` in render loop**: All color decisions are pre-baked into sprite sheets

---

## 10. Asset Production Pipeline

### 10.1 Tool Recommendations

| Tool | Purpose | License |
|---|---|---|
| **Aseprite** | Pixel-art sprite creation, animation, sprite sheet export | Paid ($20) |
| **Pixelorama** | Free alternative to Aseprite | MIT (free) |
| **Lospec Pixel Editor** | Online quick pixel art | Free web |
| **ImageMagick** | Batch processing, tint generation, atlas packing | Apache-2.0 |
| **TexturePacker** | Sprite sheet atlas packing | Paid |
| **Shoebox** | Free sprite sheet packer | Free |

### 10.2 Sprite Sheet Specifications

| Property | Value |
|---|---|
| **Format** | PNG-8 (indexed color, 256-color palette) for static; PNG-24 for gradients |
| **Max sheet size** | 2048×2048 px (safe for all GPU texture sizes) |
| **Tile size** | 16×16 px (matching current TILE constant) |
| **Frame alignment** | Fixed grid (no irregular packing) — simplifies UV math |
| **Padding** | 1px between frames to prevent bleed at non-integer scales |
| **Color mode** | Indexed with embedded palette (AAP-64 compatible) |

### 10.3 Build-Time Asset Processing

Add to Vite build pipeline (`vite.config.ts`):
```typescript
// build-time tint generation
// For each enemy sprite sheet, generate 8 tinted variants
// Output: dist/assets/sprites/enemy_tinted/
// This avoids runtime tint computation on mobile GPU
```

Alternative: Use a simple Node.js script (`scripts/tint-sprites.mjs`) that runs before `vite build`:
```javascript
// Read base sprite sheet PNG
// For each sphere color, apply tint to non-transparent pixels
// Write tinted variant PNG
```

### 10.4 Asset File Size Budget

| Category | Est. Files | Est. Total Size |
|---|---|---|
| Player sprites | 1 sheet | ~30 KB |
| Enemy sprites (8 types × 8 tints) | 64 sheets | ~200 KB |
| Boss sprites (7 unique) | 7 sheets | ~400 KB |
| Floor tile atlases (8 spheres) | 8 sheets | ~100 KB |
| Wall tile atlases (8 spheres) | 8 sheets | ~100 KB |
| Interactive objects | 4 sheets | ~80 KB |
| Effects & particles | 4 sheets | ~60 KB |
| UI elements | 3 sheets | ~40 KB |
| Cinematic backgrounds | 11 images | ~500 KB |
| Font | 1 file | ~30 KB |
| **Total** | ~110 files | **~1.5 MB** |

**Note**: 1.5 MB is well within acceptable PWA/APK size limits. Current game is ~350 KB source only. The audio system (Tone.js) is ~200 KB library. Total APK with assets: ~2–3 MB — excellent.

---

## 11. Performance Considerations for Pixel 9 Pro Fold

### 11.1 GPU Budget
- Tensor G4 GPU can handle hundreds of `drawImage()` calls per frame at 60 FPS
- Key optimization: **batch draw calls** by sprite sheet — draw all entities from the same sheet before switching
- Avoid `createRadialGradient()` every frame — use pre-rendered gradient sprites
- Avoid `globalCompositeOperation` in tight loops — prefer pre-tinted sprite sheets

### 11.2 Memory Budget
- 2048×2048 RGBA sprite sheet = 16 MB GPU memory
- 1.5 MB of PNG assets = ~8–12 MB GPU memory after decode
- Well within Tensor G4's available GPU memory (~2–4 GB shared)

### 11.3 Unfolded Display (2076×2152)
- Current 480×270 virtual resolution scales to 2076×1167 (maintaining 16:9) — leaves 985 px of vertical letterboxing
- The game is pixel-art: scaling is nearest-neighbor by nature, so integer scaling looks crisp
- Target integer scale: 4× (1920×1080) fits well within 2076×2152 display
- Letterbox area should be filled with atmospheric dark gradient + subtle lamp motifs (not pure black)

---

## 12. Implementation Roadmap & Timeline

### Phase A — Entity Sprites (Priority: CRITICAL)
- **Effort**: ~40 hours pixel art + ~8 hours integration
- **Deliverables**: Player, 8 enemies, 7 bosses as sprite sheets
- **Playable at end**: Game looks significantly better with just entity replacement
- **Risk**: Highest visual impact, moderate technical risk

### Phase B — Tile System (Priority: HIGH)
- **Effort**: ~30 hours pixel art + ~6 hours integration
- **Deliverables**: 8 sphere floor + wall tile atlases
- **Playable at end**: Full environmental visual overhaul
- **Risk**: Must maintain deterministic tile selection (seeded PRNG)

### Phase C — Interactive Objects (Priority: HIGH)
- **Effort**: ~20 hours pixel art + ~4 hours integration
- **Deliverables**: Chests, shrines (7 variants), stairs (8 variants), torches
- **Playable at end**: All dungeon objects visually upgraded

### Phase D — Effects & Overlays (Priority: MEDIUM)
- **Effort**: ~15 hours pixel art + ~6 hours integration
- **Deliverables**: Projectiles, particles, hit effects, mood overlays, dash trails, status icons
- **Playable at end**: Combat feel dramatically improved

### Phase E — UI Chrome (Priority: MEDIUM)
- **Effort**: ~15 hours pixel art + ~4 hours integration
- **Deliverables**: Menu backgrounds, panel borders, HUD icons, status bars
- **Playable at end**: UI feels premium

### Phase F — Cinematics (Priority: LOW)
- **Effort**: ~25 hours pixel art + ~4 hours integration
- **Deliverables**: Title screen, 11 cutscene backgrounds
- **Playable at end**: Full narrative visual experience

### Total Estimated Effort
- **Pixel art**: ~145 hours
- **Engineering integration**: ~32 hours
- **Testing & polish**: ~20 hours
- **Grand total**: ~200 hours (5 weeks full-time, 10 weeks part-time)

---

## 13. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| **Sprite-art quality inconsistent** | MEDIUM | Use AAP-64 palette as anchor; create style guide before production; review all assets against guide |
| **Tinted sheets balloon asset size** | LOW | Pre-compute 8 tints at build time; 64 enemy sheets at ~3 KB each = ~200 KB — acceptable |
| **Animation timing desync** | MEDIUM | Maintain same animation interface as current sin()-based system; test frame durations |
| **Fallback rendering breaks** | LOW | Keep procedural code intact; feature-flag the new rendering via SpriteRegistry.loaded |
| **Unfolded display letterboxing ugly** | LOW | Design letterbox fill as atmospheric gradient with subtle lamp motifs |
| **SpriteRegistry async loading delays** | MEDIUM | Preload during loading screen; show procedural sprites as immediate placeholder |
| **Pixel-art scaling artifacts at non-integer scales** | MEDIUM | Use `imageSmoothingEnabled = false` for crisp pixel scaling; test at 4× integer scale on fold |

---

## 14. Success Criteria

- [ ] All 8 enemy types have unique, visually distinct sprite sheets
- [ ] All 7 Warden bosses have completely unique designs (no palette swaps)
- [ ] Each of 8 spheres has visually distinct floor and wall tile sets
- [ ] Player has full animation set (idle, walk, attack, cast, hurt, death)
- [ ] Game runs at 60 FPS on Pixel 9 Pro Fold unfolded display
- [ ] Asset bundle stays under 2 MB total
- [ ] Procedural fallback works when SpriteRegistry not loaded
- [ ] Sphere color identity is visually obvious without labels
- [ ] Audio system preserved unchanged
- [ ] All existing gameplay mechanics function identically

---

**End of PIXELLAB_VISUAL_OVERHAUL_PLAN.md**
