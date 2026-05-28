import { describe, expect, it } from 'vitest';
import { RELICS, RELIC_IDS } from '../relics';
import { WEAPONS } from '../weapons';
import { SPELLS, SPELL_IDS } from '../spells';
import { CONSUMABLES, CONSUMABLE_IDS } from '../consumables';
import { SHRINE_VARIANTS } from '../shrines';
import { RELIC_SYNERGIES, SYNERGY_IDS } from '../relicSynergies';
import { SPHERES, sphereForFloor } from '../spheres';
import { NPCS } from '../npcs';
import { ARCHETYPES, getArchetype } from '../archetypes';
import { CODEX, CODEX_BY_ID } from '../codex';

// Each "id → def" lookup the engine relies on. If someone adds a new
// id to a union type but forgets to register its def, the corresponding
// `pickEnemyType` / `castSpell` / `useUltimate` call site silently
// returns undefined and the game breaks at runtime. These tests catch
// that class of bug at build time.

describe('Data registries — every id resolves', () => {
  it('RELIC_IDS all resolve to a RelicDef', () => {
    for (const id of RELIC_IDS) {
      expect(RELICS[id], `relic ${id}`).toBeDefined();
      expect(RELICS[id].id).toBe(id);
      expect(RELICS[id].name.length).toBeGreaterThan(0);
    }
  });

  it('SPELL_IDS all resolve to a SpellDef', () => {
    for (const id of SPELL_IDS) {
      expect(SPELLS[id], `spell ${id}`).toBeDefined();
      expect(SPELLS[id].id).toBe(id);
      expect(SPELLS[id].manaCost).toBeGreaterThanOrEqual(0);
    }
  });

  it('CONSUMABLE_IDS all resolve to a ConsumableDef', () => {
    for (const id of CONSUMABLE_IDS) {
      expect(CONSUMABLES[id], `consumable ${id}`).toBeDefined();
      expect(CONSUMABLES[id].id).toBe(id);
    }
  });

  it('Every ShrineKind has at least one variant', () => {
    const kinds = Object.keys(SHRINE_VARIANTS) as (keyof typeof SHRINE_VARIANTS)[];
    for (const k of kinds) {
      expect(SHRINE_VARIANTS[k].length, `shrine ${k}`).toBeGreaterThan(0);
    }
  });

  it('drawShrine renders every kind without throwing', async () => {
    const { drawShrine } = await import('../../rendering/PixelArt');
    // Minimal CanvasRenderingContext2D stub — every method the
    // pixel-art primitives call becomes a no-op. drawShrine internals
    // hit fillRect / fillStyle / beginPath / arc / fill / ellipse /
    // stroke / strokeStyle / lineWidth / createRadialGradient, so we
    // proxy every accessed property to a sensible default.
    const ctx = new Proxy({}, {
      get: (_t, prop) => {
        if (prop === 'createRadialGradient') return () => ({ addColorStop: () => undefined });
        return () => undefined;
      },
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    const kinds = Object.keys(SHRINE_VARIANTS) as (keyof typeof SHRINE_VARIANTS)[];
    for (const k of kinds) {
      expect(() => drawShrine(ctx, 0, 0, false, 0, k), `shrine ${k} unused`).not.toThrow();
      expect(() => drawShrine(ctx, 0, 0, true, 0, k), `shrine ${k} used`).not.toThrow();
    }
  });

  it('SYNERGY_IDS all resolve to a SynergyDef with a relic pair', () => {
    for (const id of SYNERGY_IDS) {
      const def = RELIC_SYNERGIES[id];
      expect(def, `synergy ${id}`).toBeDefined();
      expect(def.pair).toHaveLength(2);
      expect(RELICS[def.pair[0]], `synergy ${id} parent ${def.pair[0]}`).toBeDefined();
      expect(RELICS[def.pair[1]], `synergy ${id} parent ${def.pair[1]}`).toBeDefined();
    }
  });

  it('Every weapon has the swing-shape fields the engine reads', () => {
    for (const id of Object.keys(WEAPONS) as (keyof typeof WEAPONS)[]) {
      const w = WEAPONS[id];
      expect(w.damageMul).toBeGreaterThan(0);
      expect(w.cooldown).toBeGreaterThan(0);
      expect(w.swingType, `weapon ${id}`).toBeDefined();
    }
  });

  it('sphereForFloor returns a SphereDef for any positive floor', () => {
    for (const floor of [1, 5, 10, 21, 70, 71]) {
      const s = sphereForFloor(floor);
      expect(s, `floor ${floor}`).toBeDefined();
      expect(SPHERES.some((sp) => sp.id === s.id), `sphere ${s.id} in SPHERES`).toBe(true);
    }
  });

  it('NPCS keys round-trip — every def.id matches its key', () => {
    for (const key of Object.keys(NPCS)) {
      expect(NPCS[key].id, `npc ${key}`).toBe(key);
    }
  });

  it('getArchetype returns Magus on unknown id (fallback)', () => {
    expect(getArchetype('not-real').id).toBe(ARCHETYPES[0].id);
  });

  it('Every CODEX entry id is unique + indexed in CODEX_BY_ID', () => {
    const seen = new Set<string>();
    for (const e of CODEX) {
      expect(seen.has(e.id), `duplicate codex id ${e.id}`).toBe(false);
      seen.add(e.id);
      expect(CODEX_BY_ID[e.id], `codex lookup ${e.id}`).toBe(e);
    }
  });
});
