# Cutscenes — design document

Four set-piece cinematics to thread the Hermetic story through the
roguelike loop. Each is a *real* cutscene — not just text fades — built
on the same canvas-backdrop engine that powers the existing Prologue and
Epilogue, with hand-authored pixel-art keyframes, parallax layers,
deliberate pacing, and a single cohesive visual language across all
four.

The goal is the player feels like they're inside a *work* — an opus
that has chapters — not a roguelike with prose interludes.

## Shared visual language

These rules apply to every cutscene so the four feel like one piece:

- **Aspect** — full-bleed canvas at the device's native viewport. No
  cropping bars; the same scaling rules as gameplay.
- **Frame rate** — 30 fps internal animation (matches gameplay). The
  backdrops drift / breathe; nothing strobes.
- **Palette** — strictly the project palette (`PALETTE` in `constants.ts`).
  Each cutscene has a single dominant accent colour drawn from a sphere:
  Moon-silver, Mercury-teal, Sun-gold, Saturn-violet, Ogdoad-white.
- **Type** — Iowan Old Style serif for body, the project's
  uppercase-letterspaced golden serif for titles. Source citations in
  small uppercase gold with em-dash leader.
- **Layering** — every scene composites in four layers:
  1. **Sky** — deep gradient + drifting stars / motes (procedural).
  2. **Far backdrop** — a single hand-authored pixel keyframe (column,
     gate, throne, sphere — see each scene).
  3. **Near backdrop** — a smaller pixel element with parallax (silhouette
     of Initiate, glyph, banner). Drifts at 0.6× the camera pan.
  4. **Type & UI** — the panel card, pip pager, controls hint.
- **Pacing** — each scene is a sequence of *beats*. A beat is at most
  six seconds; a single tap / button / second of dwell advances it.
  Auto-advance dwell is the safety net for unattended play (Switch in
  the bag, iPad asleep), not the primary rhythm.
- **Sound** — a slow sustained pad (single sine, faint reverb) underneath
  every cutscene; a soft chime on each beat advance. Skippable via the
  Settings → SFX volume the user already has.
- **Skip** — Start (Plus on Switch) skips the entire cutscene. B / Esc
  skips the current beat (or backs one beat). A / Enter advances.
- **Replay** — every cutscene is replayable from the Codex screen
  ("Cinematics" tab, added when this plan ships).

### Visual language summary

| Element       | Pre-menu | New game | Boss | Ending |
|---|---|---|---|---|
| Dominant hue  | Gold + indigo | Sphere accent (the Moon for run 1) | Sphere accent | Ogdoad white |
| Length        | 12–15 s | 25–30 s | 12–18 s | ~60 s |
| Beats         | 3 | 4 | 3 | 6 |
| Skippable     | Yes (Start) — never auto-shown again after first skip per session | Yes — settings toggle "show on every run" / "show only once" | Yes — skipped scenes drop the boss intro line as a floating banner | Yes, but discouraged with a clear pip pager and short beats |

## Tech foundation

These cutscenes reuse the same primitives as the existing Prologue /
Epilogue (`src/components/Prologue.tsx`, `Epilogue.tsx`), with one new
shared component:

- **`<Cutscene>`** — a reusable component in `src/components/Cutscene.tsx`
  that accepts a list of `Beat` objects (title, subtitle, body, source,
  optional `backdrop: (ctx, t) => void` renderer, optional `near: (ctx, t)`
  parallax). Owns the canvas + animation loop, the pip pager, and all
  controller / keyboard input via `useGamepadButtons`. Existing Prologue
  and Epilogue should be ported to this component during implementation;
  they're 80 % already.
- **`src/game/data/cutscenes.ts`** — the four cutscenes as data, mostly
  text and beat descriptors. Beat backdrops live in
  `src/game/rendering/cutsceneArt.ts` as pure functions that take a
  `CanvasRenderingContext2D`, a virtual canvas size, and a time in
  seconds.
- **`MetaState`** gets one new boolean field per cutscene that has a
  "seen once" gate: `seenPreMenu`, `seenNewRunCinematic`, and a
  `bossesSeen: SphereId[]` array so each Warden intro plays only the
  first time. The Ending is replayed on every victory.
- **No new assets**. All art is procedural pixel rendering in canvas
  using the existing palette, the way the player sprite, enemies, and
  doors are drawn today. This keeps the bundle and the offline cache
  tiny.

---

## Cutscene 1 — Pre-menu: "Tabula Smaragdina"

**Trigger:** Plays once per browser session, before the main menu
appears. After the LoadingScreen's brief delay (1.4 s), `seenPreMenu`
is checked — false → cutscene → menu; true → straight to menu. The
"first time" reset is per session so the user gets the title impact on
first load but isn't blocked on re-entry.

**Replay:** From the Codex screen.

**Length:** 12–15 s, 3 beats. Each beat ~4 s; auto-advances.

### Beat 1 — As above
- **Backdrop:** Deep indigo sky. A horizon-line of distant motes drifts
  slowly upward (procedural). Mid-frame, a single eight-pointed star
  fades in — the Ogdoad mark — pulses once.
- **Text:** *"It is true, without lies, certain and most true."*
  &nbsp;&nbsp;— TABULA SMARAGDINA
- **Animation:** Star fade-in over 1.2 s, pulse at 2.0 s.

### Beat 2 — So below
- **Backdrop:** Cross-dissolve to a tighter shot — a single torch lit in
  a stone niche (procedural — same `drawTorch` style as the gameplay
  walls). One pixel-art figure (the hooded Initiate, idle silhouette)
  stands in the foreground, motionless.
- **Text:** *"That which is below is like that which is above, and that
  which is above is like that which is below — to perform the miracles
  of the One Thing."*
  &nbsp;&nbsp;— TABULA SMARAGDINA (Newton trans.)
- **Animation:** Torch flame flickers as in gameplay. The Initiate
  breathes (1 px vertical bob at 0.5 Hz).

### Beat 3 — The work
- **Backdrop:** Pull back to reveal seven lamps in a row above the
  Initiate (the same lamps used in the main menu). They light in
  sequence left-to-right (0.4 s between each), then all seven dim at
  once, leaving only the Initiate and the torch.
- **Text:** *"Abyss of the Seven Lamps."* — the title fades up in the
  golden serif. A small caption below in teal: *"A SOLITARY DESCENT"*.
- **Animation:** Lamps light in sequence (lighting effect = halo bloom
  + flame appear), dim simultaneously at 3.0 s. Title fades in at 3.5 s
  and holds until skipped or auto-cut to menu.

### Production notes

- The torch / lamp / Initiate sprites already exist (`drawTorch`,
  `drawInitiate`, the menu lamp routine). Reusing them gives the
  cutscene the same lighting / look as gameplay — no "this looks like
  a different game" feeling.
- The auto-advance to menu happens 2.5 s after Beat 3's title appears,
  so the player can absorb it.

---

## Cutscene 2 — New game start: "The Gate Opens"

**Trigger:** After archetype select, before the engine mounts. Plays on
the first run ever (`seenNewRunCinematic === false`), then becomes
opt-in (Settings: "Show opening cinematic on every run" — default off
after first run). Always playable from the Codex screen.

**Replay:** From the Codex screen.

**Length:** 25–30 s, 4 beats.

### Beat 1 — The chosen vessel (~7 s)
- **Backdrop:** The archetype's portrait at high detail (the same
  `ArchetypeArt` figure used in ArchetypeSelect, but scaled up 4× and
  centred). A dark gradient behind, with the archetype's accent colour
  (Magus = teal, Hermit = gold, Star = violet) glowing softly from
  below the figure.
- **Text:** *"The {ArchetypeName} approaches."* in the golden serif,
  with the archetype's subtitle below in teal. e.g. *"The Magus
  approaches. INITIATE OF THE WORD."*
- **Animation:** The figure's eye-glow pulses once, the accent
  gradient breathes.

### Beat 2 — The oath (~6 s)
- **Backdrop:** Cross-dissolve to a tighter shot of the Initiate's
  hands holding the starting weapon (Tarnished Dagger, drawn from the
  existing weapon silhouette routine). The hands rotate the blade so
  the player sees both sides.
- **Text:** The archetype's *invocation* — one new line per archetype
  written in the same style as the Corpus Hermeticum:
  - **Magus** — *"By the Word, the Cosmos was made. By the Word, I
    descend to remember it."*
  - **Hermit** — *"What is hidden is not unmade. What is unmade is not
    forgotten. I take up the lamp."*
  - **Star** — *"From the fixed stars I fell. To the fixed stars I
    return. Light follows light."*
- **Animation:** The weapon's accent stripe glows on the spoken word
  ("Word" / "lamp" / "Light").

### Beat 3 — The descent line (~7 s)
- **Backdrop:** Cross-dissolve again. We see, from above, the silhouette
  of the Initiate small and centred, walking forward into a black gate
  flanked by two stone pillars. The seven lamps from the menu hang
  above the gate, all dim. As the Initiate passes the threshold, the
  *first* lamp (the Moon) flickers once. The camera pans slowly down
  with the Initiate.
- **Text:** *"Seven lamps await thee. The Abyss is thy forgetting.
  Descend, surrender, remember."* — TITLE OF THE WORK
- **Animation:** Initiate walks at 1 step per second; gate columns
  fade in from black; moon-lamp flicker at 5 s.

### Beat 4 — Floor 1 reveal (~5 s)
- **Backdrop:** Hard cut to a pulled-back framing of an actual room
  rendered in the game's tile system (the first-room layout from the
  generated floor — we just call the engine's `drawRoom` once into a
  temp canvas). Letterboxed inside the cutscene frame so it's clearly
  *the world the player is about to enter*.
- **Text:** The floor banner — *"FLOOR 1 · I — SELENE. WHERE THE BODY
  REMEMBERS THE TIDE."* — appears.
- **Animation:** Banner fades up; held for 2 s. Then cuts to live
  gameplay (the engine starts).

### Production notes

- The archetype oath copy is the *one* place new prose is needed; the
  rest is composition of existing assets. All three lines are
  pre-written in this doc; locked.
- Beat 4 doubles as the floor banner the player would see anyway, so
  if they skip the cutscene, they get banner-only.

---

## Cutscene 3 — Boss intro: "The Warden Manifests"

**Trigger:** When the player enters a boss room for the first time per
sphere this run. The InputManager is muted while it plays. Each
Warden's intro plays once per run regardless of how many times the
player has reached this sphere — and only the first time they reach
this sphere in their *entire* playthrough across runs gets the slow,
4-second version; subsequent runs get a 2-second compressed cut to keep
runs moving.

**Replay:** From the Codex screen, after the player has first beaten
that Warden.

**Length:** 12–18 s on first encounter, ~5 s on repeat. 3 beats.

### Beat 1 — The sphere announces itself (~4 s first time, 1.5 s on repeat)
- **Backdrop:** The sphere's planetary glyph (☾ ☿ ♀ ☉ ♂ ♃ ♄) rises in
  the centre, drawn large in the sphere's accent colour with a slow
  halo. Behind it, a procedural starfield rotates around it.
- **Text:** Sphere name, in the golden serif, drawn slowly
  letter-by-letter (typewriter, 20 ms per letter, ~700 ms for the
  longer names). Below: the *Greek god name*. e.g. **"SPHERE OF THE
  MOON / SELENE"**.

### Beat 2 — The Warden's title and threat (~6 s first time, 2 s on repeat)
- **Backdrop:** The boss room's actual occult circle, rendered live
  (same `drawOccultCircle` routine that gameplay uses), with the boss
  enemy itself drawn in the centre at 2× scale, slow-rotating ~5°
  back-and-forth. Camera shake on Beat 2 → 3 transition.
- **Text:** The Warden's name + epithet. Each Warden has its own
  written line; locked here:

| Sphere   | Warden name                | Epithet                                |
|---|---|---|
| Moon     | *Selene the Tide-keeper*    | "She who counts the breaths of the body." |
| Mercury  | *Hermes the Quicksilver*    | "Whose lies are silvered like the moon." |
| Venus    | *Aphrodite of a Thousand Loves* | "Whose desire scatters the soul." |
| Sun      | *Helios the Crowned*        | "Who mistakes the lamp for the Light." |
| Mars     | *Ares the Edge-warden*      | "Whose sword does not know what it cuts." |
| Jupiter  | *Zeus the Wide-vessel*      | "Whose largeness cannot contain its own light." |
| Saturn   | *Kronos the Boundary*       | "Beyond him is no clock and no need of one." |

### Beat 3 — The threshold (~3 s first time, 1.5 s on repeat)
- **Backdrop:** Cross-dissolve to a tight crop of the boss arena floor
  — a single tile, the occult circle, a glint.
- **Text:** *"Surrender thy {VICE}."* where {VICE} is taken from the
  sphere's `surrender` field (`spheres.ts`). e.g. *"Surrender the
  ruling arrogance."*
- **Animation:** Hard cut to gameplay; the boss room music swells; the
  doors lock with a deep tone.

### Production notes

- All seven Wardens use the same scene structure with different name,
  glyph, accent, vice. The data lives in `cutscenes.ts:bossIntros`.
- Skipping a boss intro should still drop the *"Surrender thy {VICE}"*
  line as a floating banner over the gameplay so the narrative beat
  isn't fully lost on impatient players.

---

## Cutscene 4 — Ending: "The Eighth Sphere"

**Trigger:** Plays the *first* time the player both (a) reaches the
Ogdoad (floor 8) and (b) defeats the Saturn-Warden in the same run.
This is the climactic payoff and is meant to feel earned. After the
first viewing it's replayable from the Codex.

**Replay:** Always replayable from the Codex screen once unlocked.

**Length:** ~60 s, 6 beats. Not auto-advanced — each beat waits on
input, except the final one which holds until the player chooses to
descend again.

### Beat 1 — The seventh lamp lights (~8 s)
- **Backdrop:** The Saturn-Warden's room, frozen on the moment of his
  death (snapshot of the gameplay framebuffer when the kill landed). A
  slow fade-out of the gameplay HUD; the seven lamps from the menu
  appear ghosted above the arena, six already lit. The seventh
  (Saturn-violet) catches fire and rises.
- **Text:** *"The seventh ring is undone."* — silent.
- **Animation:** The seventh lamp flame grows over 3 s; the boss
  silhouette dissolves into motes that rise toward the lamp.

### Beat 2 — The cosmic frame falls (~10 s)
- **Backdrop:** Hard cut to a wide black field. One by one, the seven
  spheres' rings draw themselves around a central point, each in its
  own colour — slow circular line strokes. After all seven are drawn,
  they begin rotating *together* at increasing speed. Then they
  **explode outward**, leaving a clean dark sky and a single
  pinpoint at centre — the Eighth.
- **Text:** *"Made bare of all the workings of the cosmic frame, the
  soul cometh to the Eighth Nature."* &nbsp;— CORPUS HERMETICUM I.26.
- **Animation:** Concentric rings draw at 0.4 s per ring; rotation
  builds; explosion at 7.5 s; pinpoint settles by 9 s.

### Beat 3 — The Initiate hymned (~10 s)
- **Backdrop:** Zoom slowly toward the central pinpoint. As we approach
  it expands into the eight-pointed Ogdoad glyph already used in the
  current Epilogue, rotating very slowly. Around it the silhouette of
  the Initiate appears, *facing into* the star, arms slightly raised.
- **Text:** *"With its own proper power it hymneth with the Powers
  that are there to the Father."* &nbsp;— CORPUS HERMETICUM I.26.
- **Animation:** Camera pushes in over the full beat; Initiate fades
  in at 3 s; arms-raise at 6 s.

### Beat 4 — The Hymn (~14 s)
- **Backdrop:** Continue pushing forward into the star. The screen
  brightens to pale gold; everything else fades. The Initiate's
  silhouette becomes outline-only — a frame of light around them.
- **Text:** The Hymn of the Reborn, four lines, each fading in 1.5 s
  apart, holding together for 6 s before fading:
  &nbsp;&nbsp;*"Holy is God, the Father of all things."*
  &nbsp;&nbsp;*"Holy is God, whose will is accomplished by his own powers."*
  &nbsp;&nbsp;*"Holy is God, who would be known and is known by his own."*
  &nbsp;&nbsp;*"Holy art Thou, of whom all Nature is the image."*
  &nbsp;&nbsp;— CORPUS HERMETICUM XIII.18
- **Animation:** Each line fades in; light intensity scales with each
  line. Faint sustained tone in audio.

### Beat 5 — The flight of the Alone (~10 s)
- **Backdrop:** Slow fade to deep starfield — the gold dissolves
  outward, leaving the same drifting motes used in the menu. The
  Ogdoad mark and the Initiate are both gone.
- **Text:** *"This is the life of the gods and of the godlike and
  blessed among men: the flight of the Alone to the Alone."*
  &nbsp;— PLOTINUS, ENNEADS VI.9.11
- **Animation:** Light fades over 5 s; full starfield by 7 s; text
  holds 3 s.

### Beat 6 — The cycle turns (~8 s, held)
- **Backdrop:** The seven lamps reappear in a row, all lit, slowly
  drifting upward.
- **Text:** *"Thus ends the first work. The cycle turns again."*
  Then a button: **"Descend Again"**.
- **Animation:** Lamps fade in over 2 s; text appears at 3 s; button
  at 4.5 s and holds. Pressing it returns to the main menu (or
  begins a New Run if the player prefers — Settings option).

### Production notes

- This is the largest cutscene; it should be the LAST thing implemented
  in this batch so I can do it justice. The ring-collapse animation in
  Beat 2 is the most novel — it's worth prototyping standalone first
  to make sure the motion sells.
- Audio: a low sine swell across the whole cutscene, peaking on Beat 4.
  Optional; mutes correctly via existing SFX volume setting.

---

## Implementation order (suggested)

1. **`<Cutscene>` component** — port Prologue + Epilogue to use it.
   Validates the abstraction. ~1 day.
2. **Pre-menu cutscene** — simplest; reuses existing assets only.
   ~half day.
3. **New-game cutscene** — adds the archetype invocations and the
   "live first-room preview" technique. ~1 day.
4. **Boss intro cutscene** — reuses the boss room rendering. Data-driven
   so all 7 ship together. ~1.5 days.
5. **Ending cutscene** — the big one. Includes the ring-collapse
   animation prototype. ~2 days.

Total: ~6 working days of focused work, no new art assets, no new
audio assets (just synth tones via WebAudio in the existing
`AudioSystem`).

## Open questions

- **Music** — currently the game has procedural ambient pads via the
  AudioSystem. Cutscenes deserve dedicated cues (a low sine swell, a
  chime per beat advance). Worth committing one evening of audio work
  to author 4–5 short procedural cues that map onto these scenes.
- **Localisation** — these cutscenes are English-only. If a translation
  pass is ever wanted, the entire text block lives in
  `data/cutscenes.ts` — one file to translate.
- **First-run skip habit** — players who skip cutscenes on first viewing
  miss the story. Should "skipped" cutscenes be auto-replayed from the
  Codex with a small "RECOMMENDED" badge? Default: yes, the Codex's
  Cinematics tab shows skipped ones with the badge.
- **Reduced-motion** — the existing Settings has `reducedParticles`.
  We should extend that toggle (or add `reducedMotion`) to drop the
  parallax / camera pushes for users who'd otherwise feel motion sick.
