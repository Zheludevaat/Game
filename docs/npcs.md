# Non-Hostile NPCs — Integration Plan

## Goal

Populate *Abyss of the Seven Lamps* with non-hostile presences so the
descent feels inhabited rather than empty between fights. The Hermetic
fiction is built around the idea that the soul, as it falls through the
seven spheres, encounters guardians, teachers, beggars, and ghosts of
those who came before. The game currently delivers the cosmology but
not the population. This plan adds twelve NPCs across three interaction
depths, one new room type (the Sanctuary), and a lightweight dialogue
system — all built on top of existing primitives.

The plan is sized to ship in four phases over roughly a week of focused
work. Each phase is independently shippable; the earliest phase already
makes the world feel different.

---

## Interaction depths

NPCs split into three categories. Most of the cast sits in the lighter
tiers — full dialogue carries production weight, and the game wants
many small encounters more than a few heavy ones.

### Ambient (lightest — no input needed)
The NPC exists in the world. The player can walk past it. There is no
modal, no choice, no progression gate. Effects are passive and
single-line.

- Idle animations (the sweeping motion of a reed-cutter, the slow
  exhale of the Mute).
- A short flavour line appears as a floating subtitle the first time
  the player walks within range — "Don't kneel to that lamp" — and is
  not repeated.
- A small passive benefit on proximity, such as a +1 essence drip
  every two seconds while standing adjacent.

### Limited (one-tap)
The NPC reacts to a single press of `interact`. Fires a one-shot
effect plus one or two lines of dialogue rendered as banner text. No
modal opens; the player stays in motion control. Used for vending
NPCs that trade essence for a buff, or wanderers that hand the player
a key in exchange for a coin.

### Full (modal dialogue)
A modal `<DialoguePanel>` opens; combat/world freezes (engine enters a
dialogue-paused state similar to the shrine confirm); the player
selects from 2-4 choices that branch the conversation or trigger
effects (trade weapon, hear a prophecy, accept a blessing). Used only
for the four "anchor" NPCs whose presence justifies the production
cost — the Hierophant, the Smith, the Diviner, the Lampwright.

---

## The roster — twelve NPCs

Grouped by where and when they appear.

### A. The Hub anchor (1)

**1. The Hierophant — "Keeper of the First Threshold"**
- *Where:* The Main Menu, restructured as a "Temple Hub" screen.
  Replaces the current static menu background with a chamber where
  the Hierophant stands at the central lamp.
- *Interaction:* Full. He speaks before each new run, comments on
  the player's previous death ("Selene swallowed your light again. Of
  course"), and offers the meta-progression panel (HP/MP/essence
  bonuses) as a dialogue branch instead of a separate menu.
- *Visual:* Tall robed figure, two staves crossed behind him, gold
  rim around the hood. Roughly 16×22.
- *Sample lines:*
  - First meeting: *"You are not the first to read the Tabula. You
    will not be the last. Take this lamp."*
  - After every death: *"The Abyss is patient. You are not. Begin
    again."*
  - After reaching the Ogdoad once: *"You have stood beyond the
    seventh. Few do. Most go on, you understand."*

### B. Sphere-keyed wanderers (7 — one per sphere)

Each appears in a rare Sanctuary room on the floors of that sphere
(floors 1-3 for Moon, 4-6 for Mercury, etc.). They never appear off
their sphere. About a 25 % chance per sphere of seeing the NPC across
the three floors, so most runs encounter 1-2.

**2. The Reed-Cutter (Selene / Moon, floors 1-3)**
- *Interaction:* Ambient. Kneels by a glowing pool, cutting moon-reeds
  in a slow loop. Standing adjacent for two seconds gives a single
  "+10 MP" reed.
- *Visual:* Bent figure in pale grey, sickle in hand, reed-bundle at
  her side. The reeds glint silver under the room's lighting.
- *Ambient line:* *"The tide does not ask."*

**3. The Cartographer (Hermes / Mercury, floors 4-6)**
- *Interaction:* Full. Stands behind a long scroll-table. Offers to
  reveal the floor map for 15 essence (single choice) or to "trade a
  rumour" — a hint about what lies behind the next door — for free.
- *Visual:* Wiry quick figure, quill behind ear, satchel of scrolls
  at hip, perpetually leaning forward.
- *Sample line:* *"You're four chambers from the stair. The middle
  one is full of teeth. The southern is empty. Which would you like?"*

**4. The Garlandkeep (Aphrodite / Venus, floors 7-9)**
- *Interaction:* Limited. Offers a single flower necklace per visit.
  Tap interact → consume 10 coins → spawn a small heart pickup on
  the floor in front of her, with a short line.
- *Visual:* Seated figure with woven garlands draped across the lap,
  flowers strewn in a half-circle.
- *Sample line:* *"For the heart you have lost. Take it back."*

**5. The Smith (Helios / Sun, floors 10-12)**
- *Interaction:* Full. Forge-shopkeeper. Three dialogue branches:
  *(a)* upgrade the equipped weapon's damage by 20 % for 50 coins,
  *(b)* re-roll the equipped relic (current relic returned to pool,
  one new random relic granted), *(c)* leave.
- *Visual:* Broad-shouldered with a hammer over the back, anvil
  beside her, glowing forge behind. The forge throws warm light into
  the Sanctuary.
- *Sample line:* *"Brass and bone. Give me coin and I'll give you
  weight."*

**6. The Veteran (Ares / Mars, floors 13-15)**
- *Interaction:* Limited. Scarred warrior leaning on a notched spear.
  Tap interact → consume nothing → fires a 60-second damage-up buff
  on the player. Can only be triggered once per run.
- *Visual:* Cloaked silhouette, gash across the helm, spear point
  burning a slow red. Sits on a stone.
- *Sample line:* *"I died on Mars. You will not. Hit harder."*

**7. The Diviner (Zeus / Jupiter, floors 16-18)**
- *Interaction:* Full. Robed seer over a brass-rim mirror. Offers
  *(a)* "Hear the next storm" — reveals the boss's first attack
  pattern as a text hint before the fight, *(b)* "Hear the long
  thunder" — increases essence gained from the next floor by 50 %,
  *(c)* leave.
- *Visual:* Tall, mirror at chest level catching gold flickers, hands
  spread wide.
- *Sample line:* *"Zeus throws five marks. They strike in sequence.
  The third is yours to stand on."*

**8. The Mute (Kronos / Saturn, floors 19-21)**
- *Interaction:* Ambient. Stands motionless at the centre of the
  Sanctuary, no animation other than a slow breath every two seconds.
  Standing within range slowly heals HP at 1/sec, capped at 50 % of
  max. Never speaks.
- *Visual:* Featureless robed silhouette, eyes covered by a deep hood
  shadow. The room around him is unnaturally still — particles
  visibly slowed, the same time-stop overlay used by Kronos's boss
  pattern but at a quarter intensity.
- *Codex line (unlocked on first contact, since he won't speak it):*
  *"The Saturnian does not teach. He simply waits. That, in itself,
  is the teaching."*

### C. Universal wanderers (2 — can appear on any floor)

These are rare. 5 % chance per floor independent of sphere. They give
the world the feeling that travellers and ghosts move through it
besides the player.

**9. The Mendicant — "Beggar of the In-Between"**
- *Interaction:* Limited. Slowly walks back and forth across his
  room. Tap interact → consume 1 coin → 50 % chance to receive 5
  essence, 50 % chance to receive a short blessing line and nothing.
  Gambling with the abyss.
- *Visual:* Hunched figure with an outstretched bowl, threadbare
  cloak, eyes lit teal.
- *Sample lines:* *"For the lamp."* / *"Bless your descent."* /
  *"You should not have come."*

**10. The Echo — "An Initiate Who Came Before"**
- *Interaction:* Ambient. A semi-transparent player-like figure
  standing still in the room, repeating one of seven canonical last
  lines on a 4-second loop ("I almost saw it." / "The seventh lamp
  is not a lamp." / "Forgive me — I dropped it."). Touching the
  Echo unlocks a unique codex entry that hints at the story of the
  initiate who died.
- *Visual:* Re-use the initiate sprite drawn at 0.45 alpha tinted
  toward the floor's sphere accent — no new sprite work needed.

### D. Special event NPCs (2)

These don't show up on a per-floor basis; they hook into other game
events.

**11. The Lampwright**
- *Where:* A single "Marketplace" event room that spawns once per
  run, anywhere between floors 5 and 25. Replaces a normal chamber.
- *Interaction:* Full. Travelling vendor with a back-rack of lit
  lamps. Three persistent stock items, prices in coins:
  *(a)* +25 HP restore (cheap),
  *(b)* +40 MP restore (medium),
  *(c)* Lamp Aura cosmetic for one run (expensive, persistent until
  death — visible halo around the player).
- *Visual:* Travelling tinker with a backpack frame draped in small
  lit lamps; the lamps cast their own light wells, contributing to
  the dynamic lighting.
- *Sample line:* *"Some descend with one lamp. Some come back with
  none. Take two."*

**12. The Penitent of the Seventh Lamp**
- *Where:* Spawned into the boss room AFTER the Warden is defeated,
  at the point where the lamp settles. Despawns when the player
  takes the stairs.
- *Interaction:* Ambient. Kneels with hands on the dead Warden's
  lamp. Says a single sphere-keyed line about what the Warden was.
- *Visual:* Hooded penitent, identical sprite across all seven
  spheres, but the lamp under their hands burns in the Warden's
  sphere accent.
- *Codex tie:* Each Warden's defeat-codex entry is now spoken by the
  Penitent rather than appearing as flat text. Same lines, more
  weight.

---

## New room type — the Sanctuary

A non-hostile chamber that hosts NPCs. Adds one variant to the room
generator alongside `combat | shrine | treasure | boss | corridor`.

### Generation rules
- Probability: ~8 % per non-special floor room slot, capped at 1
  Sanctuary per floor.
- Slightly higher chance immediately after a boss-room corridor or
  after a hard combat room (so the game offers respite where it
  naturally would).
- Forced spawn at the start of a run for the Hierophant Hub.

### Layout
- Same 30×17 tile grid as combat rooms.
- No enemies. The Sanctuary's NPC stands at room centre (or
  off-centre, per their visual concept). One door in, one door out
  (the existing door pair).
- A central low altar tile or rug pixel-art piece anchors the NPC.
  Re-uses the existing shrine altar primitive at half scale.
- Two extra wall torches added (six total) so the Sanctuary reads
  brighter and safer than a combat room — the dynamic lighting
  system already handles this.

### Behavior
- Music: stays on the floor's dungeon ambience but the engine ramps
  music volume up 20 % while in a Sanctuary so the NPC's lines feel
  scored.
- Camera: subtle slow zoom-out (5 %) so the Sanctuary feels larger
  than a combat chamber.
- No auto-close: doors stay open from the moment the player enters,
  so they can leave the same way they came.

---

## Dialogue system

Minimal new infrastructure. Most of the lift is data, not engine code.

### Data types
```ts
// game/data/npcs.ts (new)
export type NpcInteraction = 'ambient' | 'limited' | 'full';

export interface DialogueLine {
  speaker: string;       // displayed in caption
  text: string;          // 1-3 short sentences
  emote?: 'still' | 'gesture' | 'turn';
}

export interface DialogueChoice {
  label: string;         // e.g. "Hear the storm (10 essence)"
  cost?: { kind: 'coins' | 'essence'; amount: number };
  effect: (eng: GameEngine) => void;
  gotoLine?: number;     // optional branch
  closesDialogue?: boolean;
}

export interface DialogueTree {
  id: string;
  lines: DialogueLine[];           // played in order until choices
  choices?: DialogueChoice[];
  postLines?: DialogueLine[];       // after a choice runs
}

export interface NpcDef {
  id: string;
  name: string;
  sphere?: SphereId | null;        // null = universal
  visualKey: string;               // → NPC_VISUALS lookup
  interaction: NpcInteraction;
  dialogue?: DialogueTree;         // for full / limited
  ambientLines?: string[];          // for ambient
  passive?: { kind: 'heal'|'mp'|'essence'; perSec: number; radius: number };
  spawnRule: 'hub' | 'sphereRandom' | 'rare' | 'bossDefeated';
  weight?: number;
}
```

### Engine state
```ts
// GameEngine
private npcs: NpcEntity[] = [];
private activeDialogue: { npcId: string; line: number } | null = null;
```

### Update loop
- `updateNpcs(dt)` — tick ambient line timers, idle wander animations.
- `engine.dialogueOpen` is true while `activeDialogue !== null`. World
  update is gated similarly to `pendingShrine` — player frozen, NPCs
  don't move, particles tick, music continues.

### React layer
```
<DialoguePanel
  npcDef={...}
  line={engine.activeDialogue.line}
  onAdvance={() => engine.dialogueAdvance()}
  onChoice={(choice) => engine.dialogueChoose(choice)}
/>
```
- Letterboxed style matching the cinematic shorts so dialogue feels
  cinematic (not VN-style).
- 1.5s typewriter for each line (skippable with interact).
- Gamepad: A advances / confirms choice, B skips/closes if allowed.

### Ambient line rendering
- Floats above the NPC's head in the same style as damage numbers.
- 4-second life, max one line at a time per NPC.

---

## Sprite roster (12 new sprites)

All at the same scale as enemies (10-16 wide × 12-22 tall) so they sit
in the same camera frame at parity. Most are quick palette+silhouette
work, similar to the recent enemy redraws.

| ID                  | Size  | Notes |
| ------------------- | ----- | ----- |
| `hierophant`        | 16×22 | Tall robed teacher, two staves crossed |
| `reedCutter`        | 14×14 | Kneeling, sickle, reed-bundle |
| `cartographer`      | 14×16 | Leaning forward, scroll, quill |
| `garlandkeep`       | 13×14 | Seated, garland in lap |
| `smith`             | 16×16 | Broad, hammer, anvil-side stance |
| `veteran`           | 14×17 | Seated on stone, spear |
| `diviner`           | 14×18 | Hands spread, mirror at chest |
| `mute`              | 14×18 | Featureless silhouette, hood shadow |
| `mendicant`         | 13×15 | Hunched, bowl out |
| `lampwright`        | 16×18 | Backpack frame of small lamps |
| `penitent`          | 14×14 | Kneeling, hands on lamp |
| `echo`              | reuse | Re-use the initiate sprite at low alpha + tint |

Sprite work is the longest single line item. Budget half a day per
sprite for first-pass quality; the simpler ones (mute, penitent) take
under an hour.

---

## Phased rollout

Each phase is independently shippable and visibly changes the game.

### Phase 1 — Foundation (≈ 1 day)
- Add `NpcDef`, `NpcEntity`, `DialogueTree` types in `game/data/npcs.ts`.
- Add the Sanctuary room type to the generator.
- Add `engine.npcs[]`, `updateNpcs`, `drawNpcsAll`, `activeDialogue`.
- Add `<DialoguePanel>` React component.
- Implement the two simplest NPCs to validate the pipeline:
  *the Mute (Saturn, ambient)* and *the Echo (universal, ambient)*.
- Use re-tinted initiate sprite for the Echo so no new pixel art is
  required this phase.

### Phase 2 — Sphere wanderers (≈ 2 days)
- Add the remaining six sphere-keyed NPCs (Reed-Cutter, Cartographer,
  Garlandkeep, Smith, Veteran, Diviner).
- Draw six new sprites.
- Implement the full-dialogue trees for Cartographer, Smith, Diviner.
- Implement the limited-interact effects for Reed-Cutter, Garlandkeep,
  Veteran.

### Phase 3 — Temple Hub (≈ 1.5 days)
- Restructure the Main Menu screen into the Temple Hub.
- Add the Hierophant NPC + sprite.
- Move meta-progression purchase UI into Hierophant dialogue branches.
- Track player history (deaths per sphere, runs completed, Ogdoad
  reached count) so the Hierophant's lines vary.

### Phase 4 — Special encounters (≈ 1 day)
- Add the Lampwright Marketplace room (rare 1/run event).
- Add the Mendicant rare wanderer.
- Add the Penitent post-boss spawner.
- Rewire boss-defeat codex entries to be spoken by the Penitent.

**Total budget: ~5.5 working days.**

---

## Integration with existing systems

Everything below already exists. The plan reuses them rather than
inventing parallel infrastructure.

- **Pickups** (`pickups[]`): NPC gifts (heart, key, essence chunk)
  drop as normal pickups in front of the NPC. The pickup polish pass
  (magnet + collect burst + lighting) already shipped, so gifts will
  feel as satisfying as drops.
- **Damage numbers** (`spawnDamageNumber`): used for "+25 HP" floating
  tags when an NPC gives a benefit.
- **Sigils / SigilHazard**: not used by NPCs (they're non-hostile),
  but the same delayed-effect queue could host NPC visual rituals if
  needed later (e.g. Diviner's mirror flash).
- **Audio** (`audio.sfx`): NPCs use existing `shrine`, `chest`,
  `pickup`, `bossWarn` sfx for their interactions. A new `dialogueOpen`
  sfx (single soft chime) is the only new audio asset — generated via
  the existing AudioSystem synth path.
- **Codex** (`unlockCodex`): every NPC's first meeting unlocks a codex
  entry. New chapter: "Inhabitants of the Descent" with 12 entries.
- **Room generator**: one new `kind: 'sanctuary'` plus a couple of
  layout templates. Lighting/torch system needs no changes (it already
  consumes torch positions from the room).
- **Cinematic films**: NPCs reuse the `CinematicShort` mood-pad audio
  via the dialogue panel for high-stakes lines (Hierophant first
  meeting, Diviner prophecy) so anchor encounters feel scored.

---

## Out of scope (later passes)

Intentionally deferred to keep this plan finishable:

- Romance / persistent NPC relationships across runs (would require
  major meta-progression rework).
- Multi-NPC scenes (two NPCs sharing a Sanctuary).
- Voiced dialogue (the existing audio stays procedural-synth).
- Quest chains spanning multiple floors (one NPC asks for an item
  from a later floor). A natural Phase 5.
- NPC follower / companion mechanic.
- Procedural NPC names / titles (the cast is fixed and canonical
  for now).

---

## Verification criteria

After Phase 1, the player should encounter the Mute in a Saturn-floor
Sanctuary and hear the room go quiet around him. After Phase 2, every
run through the seven spheres should turn up at least one wanderer
with a unique line and effect. After Phase 3, opening the game for the
first time after a death lands on the Hierophant commenting on which
Warden killed the player. After Phase 4, the seventh Warden's death
ends with the Penitent kneeling at the lamp, speaking the line that
was previously a flat codex pop-up.

Side-by-side screenshots of any pre-NPC dungeon vs the same dungeon
post-rollout should be visibly different — the descent should feel
inhabited.
