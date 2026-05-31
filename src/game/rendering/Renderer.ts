import { PALETTE, ROOM_H, ROOM_W, TILE, VIRTUAL_H, VIRTUAL_W } from '../constants';
import { RNG } from '../math/rng';
import { clamp, dist, hexToRgbString, lerp, norm } from '../math/vec2';
import { Room, RoomType, RelicId, WeaponId, SpellId, WeaponDef, SpellDef } from '../GameTypes';
import { NpcDef } from '../data/npcs';
import { WEAPONS } from '../data/weapons';
import { SPELLS } from '../data/spells';
import { sphereForFloor } from '../data/spheres';
import { BOSSES } from '../data/bosses';
import { ParticleSystem } from './Particles';
import {
  drawChest, drawEnemy, drawFloorTile, drawInitiate, drawShrine, drawStairs, drawTorch, drawWallTile, getEnemySize,
} from './PixelArt';

// ─── Internal types shared between GameEngine and Renderer ────────────

export interface Vec { x: number; y: number; }

export interface Enemy {
  id: number;
  type: string;
  visualKey: string;
  pos: Vec; vel: Vec;
  hp: number; maxHp: number;
  speed: number;
  radius: number; width: number; height: number;
  contactDamage: number;
  flash: number;
  attackTimer: number;
  state: string;
  cooldown: number;
  facing: Vec;
  isBoss?: boolean;
  isMiniBoss?: boolean;
  phase?: number;
  phaseTimer?: number;
  pattern?: number;
  ai?: Record<string, unknown> | { jitterTimer?: number; jitterDir?: Vec; chargeTimer?: number; chargeDir?: Vec; prepTimer?: number };
}

export interface PlayerLike {
  pos: Vec;
  maxHp: number; hp: number;
  maxMp: number; mp: number;
  attack: number; spellPower: number;
  speed: number; armor: number; luck: number;
  manaRegen: number;
  dashCooldown: number; dashCdMax: number;
  dashTimer: number; dashDir: Vec;
  iframes: number;
  facing: Vec;
  attackTimer: number; spellTimer: number;
  attackCooldown: number; spellCooldown: number;
  walkPhase: number;
  flash: number;
  coins: number; keys: number; essence: number;
  relics: RelicId[];
  reviveAvailable: boolean;
  damageMul: number;
  weapons: WeaponId[]; spells: SpellId[];
  weaponIdx: number; spellIdx: number;
  attackHitsLeft: number; attackHitTimer: number;
}

export interface Projectile {
  id: number;
  pos: Vec; vel: Vec;
  life: number;
  radius: number;
  damage: number;
  fromPlayer: boolean;
  pierce: number;
  homing: boolean;
  colour: string;
  trailColour: string;
  visual?: string;
  explodeRadius?: number;
}

export interface Pickup {
  id: number;
  pos: Vec;
  kind: 'coin' | 'essence' | 'key' | 'hp' | 'mp' | 'relic' | 'weapon' | 'spell';
  value: number;
  relic?: RelicId;
  weapon?: WeaponId;
  spell?: SpellId;
  life: number;
}

export interface SigilHazard {
  pos: Vec;
  timer: number;
  delay: number;
  damage: number;
  fired: boolean;
  fromPlayer?: boolean;
  radius?: number;
  colour?: string;
  safeRadius?: number;
}

export interface DamageNumber {
  id: number; x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  value: number; colour: string;
  text?: string;
}

export interface DeathFx {
  visualKey: string;
  pos: Vec; facing: Vec;
  width: number; height: number;
  radius: number;
  isBoss: boolean;
  t: number; duration: number;
}

export interface RoomClearEffect { t: number; duration: number; x: number; y: number; }

export interface DashTrailEntry {
  x: number; y: number; facing: Vec;
  walkPhase: number; t: number;
}

export interface NpcEntity {
  def: NpcDef;
  pos: Vec;
  facing: Vec;
  passiveAccum: number;
}

export interface DelayedAction {
  t: number; duration: number;
  fire: () => void;
  render?: (ctx: CanvasRenderingContext2D, t01: number) => void;
}

export interface FloorTransition { t: number; duration: number; }

export interface FloorBanner { t: number; duration: number; text: string; }

export interface CameraState {
  x: number; y: number;
  shakeT: number; shakeMag: number;
}

export interface ViewportTransform {
  scale: number;
  offX: number;
  offY: number;
  width: number;
  height: number;
}

export function computeViewportTransform(canvasWidth: number, canvasHeight: number): ViewportTransform {
  const sx = canvasWidth / VIRTUAL_W;
  const sy = canvasHeight / VIRTUAL_H;
  const scale = Math.max(0.1, Math.min(sx, sy));
  const width = VIRTUAL_W * scale;
  const height = VIRTUAL_H * scale;

  return {
    scale,
    width,
    height,
    offX: Math.floor((canvasWidth - width) / 2),
    offY: Math.floor((canvasHeight - height) / 2),
  };
}

/** Everything the Renderer needs to draw a frame. */
export interface RenderState {
  camera: CameraState;
  player: PlayerLike;
  room: Room;
  floorNumber: number;
  currentSphere: ReturnType<typeof sphereForFloor>;
  enemies: Enemy[];
  projectiles: Projectile[];
  pickups: Pickup[];
  sigils: SigilHazard[];
  damageNumbers: DamageNumber[];
  deathFx: DeathFx[];
  roomClearEffects: RoomClearEffect[];
  dashTrail: DashTrailEntry[];
  delayedActions: DelayedAction[];
  particles: ParticleSystem;
  timeAlive: number;
  timeStopUntil: number;
  dyingT: number;
  dyingDuration: number;
  reducedParticles: boolean;
  pendingShrine: { name: string; effect: string; downside: string } | null;
  floorTransition: FloorTransition | null;
  floorBanner: FloorBanner | null;
  bossBannerTimer: number;
  npcs: NpcEntity[];
  bossSnapshot: { hp: number; maxHp: number; name: string } | null;
}

// ─── Telegraph colour helper ─────────────────────────────────────────

function enemyTelegraphColour(type: string): string {
  switch (type) {
    case 'lesserShade':    return '226, 58, 74';
    case 'mercuryImp':     return '108, 246, 229';
    case 'saltGolem':      return '244, 210, 122';
    case 'lunarWisp':      return '205, 214, 220';
    case 'saturnKnight':   return '155, 108, 255';
    case 'serpentOfBrass': return '200, 152, 63';
    case 'saltBanshee':    return '205, 214, 220';
    default:               return '244, 130, 60';
  }
}

// ─── Renderer ────────────────────────────────────────────────────────

export class Renderer {
  private ctx!: CanvasRenderingContext2D;
  private s!: RenderState;

  render(ctx: CanvasRenderingContext2D, state: RenderState): void {
    this.ctx = ctx;
    this.s = state;
    ctx.imageSmoothingEnabled = false;

    const canvas = ctx.canvas;
    const { scale, offX, offY } = computeViewportTransform(canvas.width, canvas.height);

    ctx.fillStyle = '#02010a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);

    // Camera shake
    let camX = state.camera.x;
    let camY = state.camera.y;
    if (state.camera.shakeT > 0) {
      camX += (Math.random() - 0.5) * state.camera.shakeMag;
      camY += (Math.random() - 0.5) * state.camera.shakeMag;
    }

    ctx.save();
    ctx.translate(-Math.floor(camX), -Math.floor(camY));

    this.drawRoom();
    this.drawShrineDecor();
    this.drawChests();
    this.drawStairsIfExit();
    this.drawSigils();
    this.drawDelayedActionTelegraphs();
    this.drawPickups();
    this.drawEnemiesAll();
    this.drawNpcs();
    this.drawPlayer();
    this.drawProjectiles();
    this.s.particles.draw(ctx);
    this.drawDamageNumbers();
    this.drawRoomClearEffects();

    this.drawLighting();

    // Time-stop visual
    if (this.s.timeAlive < this.s.timeStopUntil) {
      const left = this.s.timeStopUntil - this.s.timeAlive;
      const a = Math.min(1, left * 1.4);
      ctx.fillStyle = `rgba(91, 58, 134, ${0.18 * a})`;
      ctx.fillRect(0, 0, ROOM_W, ROOM_H);
      ctx.strokeStyle = `rgba(155, 108, 255, ${0.55 * a})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const off = i * 80;
        ctx.beginPath();
        ctx.moveTo(0, off);
        ctx.lineTo(ROOM_W, off + 200);
        ctx.stroke();
      }
    }

    ctx.restore();

    // Vignette
    const vg = ctx.createRadialGradient(VIRTUAL_W / 2, VIRTUAL_H / 2, VIRTUAL_H * 0.25, VIRTUAL_W / 2, VIRTUAL_H / 2, VIRTUAL_H * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    // Death sequence darkness
    if (this.s.dyingT >= 0) {
      const t = Math.min(1, this.s.dyingT / this.s.dyingDuration);
      const darkness = Math.min(0.92, t * 0.95);
      ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
      ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    }

    // Floor transition flash
    if (this.s.floorTransition) {
      const t = this.s.floorTransition.t / this.s.floorTransition.duration;
      const a = t < 0.5 ? t * 2 : 1 - (t - 0.5) * 2;
      ctx.fillStyle = `rgba(244, 210, 122, ${a * 0.7})`;
      ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    }

    ctx.restore();
  }

  // ─── Room ────────────────────────────────────────────────────────

  private drawRoom(): void {
    const ctx = this.ctx;
    const rng = new RNG(this.s.room.seed);
    const wallTint = this.s.currentSphere.accent;
    const torchTint = this.makeTorchTint(this.s.currentSphere);

    for (let y = 0; y < ROOM_H; y += TILE) {
      for (let x = 0; x < ROOM_W; x += TILE) {
        const t = (x + y * 7 + this.s.room.seed) & 0xffff;
        drawFloorTile(ctx, x, y, TILE, t);
      }
    }

    if (['enemy', 'miniBoss', 'boss', 'shrine'].includes(this.s.room.type)) {
      this.drawOccultCircle(ROOM_W / 2, ROOM_H / 2, this.s.room.type === 'boss' ? 100 : 60);
    }

    for (let x = 0; x < ROOM_W; x += TILE) {
      drawWallTile(ctx, x, 0, TILE, true, wallTint);
      drawWallTile(ctx, x, ROOM_H - TILE, TILE, false, wallTint);
    }
    for (let y = TILE; y < ROOM_H - TILE; y += TILE) {
      drawWallTile(ctx, 0, y, TILE, false, wallTint);
      drawWallTile(ctx, ROOM_W - TILE, y, TILE, false, wallTint);
    }

    this.drawDoors();

    const t = this.s.timeAlive;
    for (let i = 1; i <= 4; i++) {
      const x = (ROOM_W / 5) * i;
      drawTorch(ctx, x - 2, 18, t + i * 0.5, torchTint);
    }

    if (this.s.room.type === 'boss') {
      const cx = ROOM_W / 2, cy = ROOM_H / 2;
      const lampRgb = hexToRgbString(this.s.currentSphere.accent);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(a) * 110;
        const py = cy + Math.sin(a) * 80;
        ctx.fillStyle = '#3b265c';
        ctx.fillRect(px - 2, py, 4, 6);
        const flick = 0.6 + Math.sin(t * 4 + i) * 0.3;
        ctx.fillStyle = `rgba(${lampRgb}, ${flick})`;
        ctx.beginPath();
        ctx.arc(px, py - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py - 4, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (!this.s.reducedParticles && Math.random() < 0.4) {
      this.s.particles.emit({
        x: rng.range(20, ROOM_W - 20),
        y: rng.range(40, ROOM_H - 40),
        vx: (Math.random() - 0.5) * 4,
        vy: -3 - Math.random() * 4,
        life: 2, maxLife: 2, size: 1, colour: 'rgba(244,210,122,0.5)',
        drag: 0.98,
      });
    }
  }

  private drawOccultCircle(cx: number, cy: number, r: number): void {
    const ctx = this.ctx;
    const t = this.s.timeAlive;
    const ringColour = hexToRgbString(this.s.currentSphere.colour);
    const accentColour = hexToRgbString(this.s.currentSphere.accent);
    ctx.save();

    const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.4);
    halo.addColorStop(0, `rgba(${accentColour}, 0.08)`);
    halo.addColorStop(1, `rgba(${accentColour}, 0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(cx - r * 1.5, cy - r * 1.5, r * 3, r * 3);

    ctx.strokeStyle = `rgba(${ringColour}, ${0.45 + Math.sin(t * 1.2) * 0.1})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(${ringColour}, 0.55)`;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t * 0.18;
      const gx = cx + Math.cos(a) * r;
      const gy = cy + Math.sin(a) * r;
      ctx.fillRect(gx - 1, gy - 1, 2, 2);
    }

    ctx.strokeStyle = `rgba(${ringColour}, 0.35)`;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(${accentColour}, ${0.55 + Math.sin(t * 2) * 0.15})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (((i * 2) % 5) / 5) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r * 0.92;
      const y = cy + Math.sin(a) * r * 0.92;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.fillStyle = `rgba(${ringColour}, ${0.4 + pulse * 0.4})`;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
    ctx.fillStyle = `rgba(${accentColour}, ${pulse})`;
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
    ctx.restore();
  }

  private drawDoors(): void {
    const ctx = this.ctx;
    const d = this.s.room.doors;
    const locked = ['enemy', 'miniBoss', 'boss'].includes(this.s.room.type) && !this.s.room.cleared;
    const w = 56;
    const pulse = 0.55 + 0.35 * Math.sin(this.s.timeAlive * 3);
    const drawDoor = (x: number, y: number, horiz: boolean): void => {
      if (locked) {
        ctx.fillStyle = PALETTE.wallDark;
        if (horiz) ctx.fillRect(x - w / 2, y - TILE / 2, w, TILE);
        else ctx.fillRect(x - TILE / 2, y - w / 2, TILE, w);
        ctx.fillStyle = PALETTE.crimson;
        if (horiz) {
          ctx.fillRect(x - 16, y - 2, 4, 4);
          ctx.fillRect(x -  2, y - 2, 4, 4);
          ctx.fillRect(x + 12, y - 2, 4, 4);
        } else {
          ctx.fillRect(x - 2, y - 16, 4, 4);
          ctx.fillRect(x - 2, y -  2, 4, 4);
          ctx.fillRect(x - 2, y + 12, 4, 4);
        }
        ctx.fillStyle = 'rgba(226, 58, 74, 0.35)';
        if (horiz) ctx.fillRect(x - w / 2, y - 1, w, 2);
        else ctx.fillRect(x - 1, y - w / 2, 2, w);
      } else {
        ctx.fillStyle = '#000';
        if (horiz) ctx.fillRect(x - w / 2, y - 6, w, 12);
        else ctx.fillRect(x - 6, y - w / 2, 12, w);
        ctx.fillStyle = PALETTE.gold;
        if (horiz) {
          ctx.fillRect(x - w / 2, y - 8, w, 2);
          ctx.fillRect(x - w / 2, y + 6, w, 2);
          ctx.fillStyle = PALETTE.gold2;
          ctx.fillRect(x - w / 2, y - 8, 2, 16);
          ctx.fillRect(x + w / 2 - 2, y - 8, 2, 16);
        } else {
          ctx.fillRect(x - 8, y - w / 2, 2, w);
          ctx.fillRect(x + 6, y - w / 2, 2, w);
          ctx.fillStyle = PALETTE.gold2;
          ctx.fillRect(x - 8, y - w / 2, 16, 2);
          ctx.fillRect(x - 8, y + w / 2 - 2, 16, 2);
        }
        ctx.fillStyle = `rgba(108, 246, 229, ${0.18 * pulse})`;
        if (horiz) ctx.fillRect(x - w / 2 + 2, y - 4, w - 4, 8);
        else ctx.fillRect(x - 4, y - w / 2 + 2, 8, w - 4);
        ctx.fillStyle = `rgba(255, 247, 214, ${0.6 * pulse})`;
        if (horiz) ctx.fillRect(x - 12, y - 1, 24, 2);
        else ctx.fillRect(x - 1, y - 12, 2, 24);
      }
    };
    if (d.up)    drawDoor(ROOM_W / 2, 8, true);
    if (d.down)  drawDoor(ROOM_W / 2, ROOM_H - 8, true);
    if (d.left)  drawDoor(8, ROOM_H / 2, false);
    if (d.right) drawDoor(ROOM_W - 8, ROOM_H / 2, false);
  }

  private drawShrineDecor(): void {
    if (this.s.room.hasShrine) {
      drawShrine(this.ctx, ROOM_W / 2, ROOM_H / 2 - 8, this.s.room.shrineUsed, this.s.timeAlive);
    }
  }

  private drawChests(): void {
    if (this.s.room.hasChest) {
      drawChest(this.ctx, ROOM_W / 2 - 9, ROOM_H / 2 - 4, this.s.room.chestOpened, this.s.room.chestLocked);
    }
  }

  private drawStairsIfExit(): void {
    if (this.s.room.type === 'exit') {
      drawStairs(this.ctx, ROOM_W / 2 - 12, ROOM_H / 2 - 12, this.s.timeAlive);
    }
  }

  // ─── Sigils ──────────────────────────────────────────────────────

  private drawSigils(): void {
    const ctx = this.ctx;
    for (const s of this.s.sigils) {
      const p = Math.min(1, s.timer / s.delay);
      const radius = s.radius ?? 18;
      const fromPlayer = !!s.fromPlayer;
      const stroke = fromPlayer ? '155, 108, 255' : '226, 58, 74';
      const accent = fromPlayer ? '244, 210, 122' : '226, 58, 74';
      ctx.save();
      ctx.translate(s.pos.x, s.pos.y);
      ctx.strokeStyle = `rgba(${stroke}, ${0.45 + 0.55 * p})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius * p, 0, Math.PI * 2);
      ctx.stroke();
      if (s.safeRadius && s.safeRadius > 0) {
        ctx.strokeStyle = `rgba(108, 246, 229, ${0.55 + 0.35 * Math.sin(this.s.timeAlive * 4)})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, s.safeRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.strokeStyle = `rgba(${accent}, ${0.35 + 0.4 * p})`;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.55 * p, 0, Math.PI * 2);
      ctx.stroke();
      const rot = this.s.timeAlive * (fromPlayer ? 2.2 : 1.4);
      ctx.rotate(rot);
      ctx.strokeStyle = `rgba(${stroke}, ${0.5 * p})`;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -radius * 0.9 * p);
        ctx.stroke();
        ctx.rotate(Math.PI / 2);
      }
      ctx.rotate(-rot);
      ctx.fillStyle = `rgba(${accent}, ${0.4 + 0.5 * p})`;
      ctx.fillRect(-2, -2, 4, 4);
      if (s.fired) {
        const ft = Math.max(0, 1 - (s.timer - s.delay) / 0.4);
        ctx.fillStyle = `rgba(${accent}, ${ft * 0.6})`;
        ctx.beginPath();
        ctx.arc(0, 0, radius * (1 + (1 - ft) * 1.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawDelayedActionTelegraphs(): void {
    for (const a of this.s.delayedActions) {
      if (!a.render) continue;
      const t01 = Math.min(1, a.t / a.duration);
      this.ctx.save();
      try { a.render(this.ctx, t01); } catch (e) { console.warn('[render] telegraph render failed', e); }
      this.ctx.restore();
    }
  }

  // ─── Pickups ─────────────────────────────────────────────────────

  private drawPickups(): void {
    const ctx = this.ctx;
    for (const pk of this.s.pickups) {
      const wobble = Math.sin(this.s.timeAlive * 4 + pk.id) * 1.2;
      switch (pk.kind) {
        case 'coin':
          ctx.fillStyle = PALETTE.gold;
          ctx.fillRect(pk.pos.x - 2, pk.pos.y - 2 + wobble, 4, 4);
          ctx.fillStyle = '#ffe6a3';
          ctx.fillRect(pk.pos.x - 1, pk.pos.y - 1 + wobble, 2, 2);
          break;
        case 'essence':
          ctx.fillStyle = PALETTE.teal;
          ctx.fillRect(pk.pos.x - 1, pk.pos.y - 2 + wobble, 2, 4);
          ctx.fillRect(pk.pos.x - 2, pk.pos.y - 1 + wobble, 4, 2);
          break;
        case 'key':
          ctx.fillStyle = PALETTE.gold;
          ctx.fillRect(pk.pos.x - 1, pk.pos.y - 3 + wobble, 2, 6);
          ctx.fillRect(pk.pos.x - 3, pk.pos.y - 3 + wobble, 6, 2);
          break;
        case 'hp':
          ctx.fillStyle = PALETTE.crimson;
          ctx.fillRect(pk.pos.x - 3, pk.pos.y - 1 + wobble, 6, 2);
          ctx.fillRect(pk.pos.x - 1, pk.pos.y - 3 + wobble, 2, 6);
          break;
        case 'mp':
          ctx.fillStyle = PALETTE.violet;
          ctx.fillRect(pk.pos.x - 3, pk.pos.y - 2 + wobble, 6, 4);
          ctx.fillStyle = '#dac8ff';
          ctx.fillRect(pk.pos.x - 1, pk.pos.y - 1 + wobble, 2, 2);
          break;
        case 'relic': {
          const g = ctx.createRadialGradient(pk.pos.x, pk.pos.y + wobble, 2, pk.pos.x, pk.pos.y + wobble, 14);
          g.addColorStop(0, 'rgba(244, 210, 122, 0.7)');
          g.addColorStop(1, 'rgba(244, 210, 122, 0)');
          ctx.fillStyle = g;
          ctx.fillRect(pk.pos.x - 14, pk.pos.y - 14 + wobble, 28, 28);
          ctx.fillStyle = PALETTE.gold;
          ctx.fillRect(pk.pos.x - 3, pk.pos.y - 3 + wobble, 6, 6);
          ctx.fillStyle = '#ffe6a3';
          ctx.fillRect(pk.pos.x - 1, pk.pos.y - 1 + wobble, 2, 2);
          break;
        }
        case 'weapon': {
          const w = pk.weapon ? WEAPONS[pk.weapon] : null;
          if (!w) break;
          const g = ctx.createRadialGradient(pk.pos.x, pk.pos.y + wobble, 2, pk.pos.x, pk.pos.y + wobble, 18);
          g.addColorStop(0, 'rgba(244, 210, 122, 0.55)');
          g.addColorStop(1, 'rgba(244, 210, 122, 0)');
          ctx.fillStyle = g;
          ctx.fillRect(pk.pos.x - 18, pk.pos.y - 18 + wobble, 36, 36);
          ctx.fillStyle = '#3b265c';
          ctx.fillRect(pk.pos.x - 6, pk.pos.y + 5 + wobble, 12, 3);
          ctx.fillStyle = '#1a0f2c';
          ctx.fillRect(pk.pos.x - 7, pk.pos.y + 7 + wobble, 14, 1);
          ctx.save();
          ctx.translate(pk.pos.x, pk.pos.y - 2 + wobble);
          ctx.rotate(-Math.PI / 4);
          this.drawWeaponSilhouette(w, 0.3);
          ctx.restore();
          break;
        }
        case 'spell': {
          const sp = pk.spell ? SPELLS[pk.spell] : null;
          if (!sp) break;
          const halo = ctx.createRadialGradient(pk.pos.x, pk.pos.y + wobble, 2, pk.pos.x, pk.pos.y + wobble, 18);
          halo.addColorStop(0, 'rgba(155, 108, 255, 0.55)');
          halo.addColorStop(1, 'rgba(155, 108, 255, 0)');
          ctx.fillStyle = halo;
          ctx.fillRect(pk.pos.x - 18, pk.pos.y - 18 + wobble, 36, 36);
          ctx.fillStyle = '#1a0f2c';
          ctx.fillRect(pk.pos.x - 5, pk.pos.y - 4 + wobble, 10, 8);
          ctx.fillStyle = '#3b265c';
          ctx.fillRect(pk.pos.x - 5, pk.pos.y - 4 + wobble, 10, 1);
          ctx.fillStyle = '#5b3a86';
          ctx.fillRect(pk.pos.x - 4, pk.pos.y - 3 + wobble, 8, 6);
          ctx.fillStyle = sp.projColour;
          ctx.fillRect(pk.pos.x - 2, pk.pos.y - 8 + wobble, 4, 4);
          ctx.fillStyle = '#fff';
          ctx.fillRect(pk.pos.x - 1, pk.pos.y - 7 + wobble, 2, 2);
          break;
        }
      }
    }
  }

  // ─── Enemies ─────────────────────────────────────────────────────

  private drawEnemiesAll(): void {
    const ctx = this.ctx;
    const floorTint = this.s.currentSphere.accent;
    for (const e of this.s.enemies) {
      const sz = getEnemySize(e.visualKey);
      const scale = 2;
      const dx = e.pos.x - (sz.w * scale) / 2;
      const dy = e.pos.y - (sz.h * scale) + e.radius + 1;
      const tint = e.isBoss ? undefined : floorTint;
      drawEnemy(ctx, e.visualKey, dx, dy, scale, e.flash, e.facing.x < 0, tint);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(e.pos.x - e.radius, e.pos.y + e.radius - 1, e.radius * 2, 2);
      if (e.isBoss) this.drawWardenMotif(e);
      if (e.isBoss && e.cooldown < 0.5 && e.cooldown > 0) {
        ctx.fillStyle = `rgba(226, 58, 74, ${0.2 + 0.4 * Math.sin(this.s.timeAlive * 20)})`;
        ctx.fillRect(e.pos.x - e.width, e.pos.y - 16, e.width * 2, 2);
      }
      if (!e.isBoss && e.contactDamage > 6 && e.cooldown < 0.5 && e.cooldown > 0.1) {
        const pulse = 0.5 + 0.5 * Math.sin(this.s.timeAlive * 18);
        const col = enemyTelegraphColour(e.type);
        ctx.fillStyle = `rgba(${col}, ${0.18 + 0.22 * pulse})`;
        ctx.fillRect(e.pos.x - e.radius - 1, e.pos.y - e.radius - 1, (e.radius + 1) * 2, (e.radius + 1) * 2);
      }
    }
    for (const fx of this.s.deathFx) {
      const sz = getEnemySize(fx.visualKey);
      const scale = 2;
      const tNorm = Math.min(1, fx.t / fx.duration);
      const grow = 1 + tNorm * 0.5;
      const alpha = 1 - tNorm;
      const dx = fx.pos.x - (sz.w * scale) / 2;
      const dy = fx.pos.y - (sz.h * scale) + fx.radius + 1;
      const cx = fx.pos.x;
      const cy = dy + (sz.h * scale) / 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx, cy);
      ctx.scale(grow, grow);
      ctx.translate(-cx, -cy);
      drawEnemy(ctx, fx.visualKey, dx, dy, scale, 0.6 * (1 - tNorm), fx.facing.x < 0, fx.isBoss ? undefined : floorTint);
      ctx.restore();
    }
  }

  private drawWardenMotif(e: Enemy): void {
    const ctx = this.ctx;
    const def = BOSSES[e.visualKey as keyof typeof BOSSES];
    if (!def) return;
    const t = this.s.timeAlive;
    const cx = e.pos.x;
    const headY = e.pos.y - e.height;
    const bodyY = e.pos.y - e.height / 2;
    ctx.save();
    switch (e.visualKey) {
      case 'seleneBoss': {
        const r = 11, mx = cx - 14, my = headY - 12;
        ctx.fillStyle = `rgba(255, 247, 214, ${0.7 + 0.2 * Math.sin(t * 2)})`;
        ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(mx + 4, my - 1, r - 1, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case 'hermesBoss':
        ctx.strokeStyle = `rgba(108, 246, 229, ${0.7 + 0.2 * Math.sin(t * 4)})`;
        ctx.lineWidth = 2;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          for (let k = 0; k <= 12; k++) {
            const yy = bodyY - 14 + k * 2.5;
            const xx = cx + side * (10 + Math.sin(k * 0.9 + t * 4) * 4);
            if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
          }
          ctx.stroke();
        }
        ctx.fillStyle = `rgba(164, 250, 240, 0.85)`;
        ctx.beginPath();
        ctx.moveTo(cx - 4, headY); ctx.lineTo(cx - 14, headY - 6); ctx.lineTo(cx - 4, headY - 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 4, headY); ctx.lineTo(cx + 14, headY - 6); ctx.lineTo(cx + 4, headY - 2);
        ctx.fill();
        break;
      case 'aphroditeBoss':
        ctx.translate(cx, bodyY);
        ctx.rotate(t * 0.6);
        for (let i = 0; i < 5; i++) {
          ctx.rotate((Math.PI * 2) / 5);
          ctx.fillStyle = `rgba(255, 155, 193, ${0.75})`;
          ctx.beginPath();
          ctx.ellipse(0, -7, 3.2, 5.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffd0e3';
        ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
        break;
      case 'heliosBoss':
        ctx.fillStyle = `rgba(255, 230, 163, ${0.85})`;
        { const cy = headY - 4;
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + t * 0.3;
          const len = 10 + Math.abs(Math.sin(t * 3 + i)) * 2;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(a);
          ctx.fillStyle = `rgba(255, 247, 214, ${0.9})`;
          ctx.fillRect(-1, -len, 2, len * 0.7);
          ctx.restore();
        } }
        break;
      case 'aresBoss':
        ctx.translate(cx + 12, headY - 4);
        ctx.rotate(Math.PI / 5 + Math.sin(t * 1.4) * 0.08);
        ctx.fillStyle = '#cdd6dc';
        ctx.fillRect(-1, -12, 2, 18);
        ctx.fillStyle = '#7a5a1a';
        ctx.fillRect(-4, 4, 8, 2);
        ctx.fillStyle = '#e23a4a';
        ctx.fillRect(-1, 6, 2, 5);
        break;
      case 'zeusBoss':
        ctx.strokeStyle = `rgba(255, 247, 214, ${0.65 + 0.35 * Math.sin(t * 8)})`;
        ctx.lineWidth = 2;
        { const off = cx + 14;
        const base = headY + 2;
        ctx.beginPath();
        ctx.moveTo(off,     base);
        ctx.lineTo(off + 4, base + 6);
        ctx.lineTo(off + 1, base + 8);
        ctx.lineTo(off + 5, base + 16);
        ctx.lineTo(off + 2, base + 18);
        ctx.lineTo(off + 6, base + 26);
        ctx.stroke(); }
        break;
      case 'kronosBoss':
        { const hx = cx, hy = headY - 8;
        ctx.fillStyle = `rgba(155, 108, 255, ${0.85})`;
        ctx.beginPath();
        ctx.moveTo(hx - 6, hy - 6);
        ctx.lineTo(hx + 6, hy - 6);
        ctx.lineTo(hx,     hy);
        ctx.lineTo(hx + 6, hy + 6);
        ctx.lineTo(hx - 6, hy + 6);
        ctx.lineTo(hx,     hy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(244, 210, 122, ${0.8})`;
        const sandY = hy - 4 + ((t * 12) % 8);
        ctx.fillRect(hx, sandY, 1, 2); }
        break;
    }
    ctx.restore();
  }

  // ─── Player ──────────────────────────────────────────────────────

  private drawNpcs(): void {
    const ctx = this.ctx;
    for (const npc of this.s.npcs) {
      // NPC silhouette — small robed figure, faintly tinted.
      const x = npc.pos.x, y = npc.pos.y;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x - 5, y + 6, 10, 2);

      if (npc.def.id === 'mute') {
        // The Mute: standing figure, no animation, deep hood shadow.
        ctx.fillStyle = '#1a0f2c';
        ctx.fillRect(x - 4, y - 10, 8, 14);
        ctx.fillStyle = '#0e0820';
        ctx.fillRect(x - 3, y - 8, 6, 10);
        // Hood shadow
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 3, y - 10, 6, 4);
      } else {
        // Default NPC: small hooded figure (echo / others)
        ctx.fillStyle = 'rgba(155, 108, 255, 0.35)';
        ctx.fillRect(x - 4, y - 10, 8, 14);
        ctx.fillStyle = 'rgba(244, 210, 122, 0.2)';
        ctx.fillRect(x - 3, y - 8, 6, 10);
        ctx.fillStyle = 'rgba(255, 247, 214, 0.15)';
        ctx.fillRect(x - 2, y - 10, 4, 2);
      }
    }
  }

  private drawPlayer(): void {
    const p = this.s.player;
    this.drawDashTrail();
    if (this.s.dyingT >= 0) {
      const t = Math.min(1, this.s.dyingT / this.s.dyingDuration);
      if (t >= 0.82) return;
      const alpha = 1 - t / 0.82;
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(p.pos.x - 6, p.pos.y + 3, 12, 2);
      const slump = Math.round(t * 3);
      drawInitiate(ctx, p.pos.x - 7, p.pos.y - 15 + slump, 1, p.facing, 0, Math.min(0.4, t));
      ctx.restore();
      if (!this.s.reducedParticles) {
        const r = 14 + t * 18;
        const accent = this.s.currentSphere.accent;
        ctx.save();
        ctx.globalAlpha = (1 - t) * 0.35;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y - 4, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(p.pos.x - 6, p.pos.y + 3, 12, 2);
    drawInitiate(ctx, p.pos.x - 7, p.pos.y - 15, 1, p.facing, p.walkPhase, p.flash);
    this.drawPlayerWeapon();
    if (p.iframes > 0 && Math.floor(this.s.timeAlive * 18) % 2 === 0) {
      ctx.strokeStyle = 'rgba(108,246,229,0.65)';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.pos.x - 7, p.pos.y - 14, 14, 18);
    }
  }

  private drawDashTrail(): void {
    if (this.s.dashTrail.length === 0) return;
    const ctx = this.ctx;
    for (const g of this.s.dashTrail) {
      const tNorm = Math.min(1, g.t / 0.28);
      const alpha = (1 - tNorm) * 0.55;
      if (alpha <= 0.02) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      drawInitiate(ctx, g.x - 7, g.y - 15, 1, g.facing, g.walkPhase, 1);
      ctx.restore();
    }
  }

  private drawPlayerWeapon(): void {
    const p = this.s.player;
    const w = WEAPONS[p.weapons[p.weaponIdx]];
    const ctx = this.ctx;
    const fx = p.facing.x || 1, fy = p.facing.y;
    const baseAngle = Math.atan2(fy, fx);
    const swinging = p.attackTimer > 0;
    const tNorm = swinging ? p.attackTimer / w.duration : 0;
    const ax = p.pos.x;
    const ay = p.pos.y - 2;

    ctx.save();
    ctx.translate(ax, ay);

    if (!swinging) {
      ctx.rotate(baseAngle + 0.6);
      this.drawWeaponSilhouette(w, 0);
      ctx.restore();
      return;
    }

    if (w.swingType === 'arc' || w.swingType === 'flurry') {
      const progress = 1 - tNorm;
      const sweep = -w.arcHalf + progress * w.arcHalf * 2;
      ctx.rotate(baseAngle + sweep);
      this.drawSlashFx(w, tNorm, sweep);
      this.drawWeaponSilhouette(w, 0.6);
    } else if (w.swingType === 'thrust' || w.swingType === 'lunge') {
      const phase = 1 - tNorm;
      const extend = w.swingType === 'lunge' ? 10 : 6;
      const off = Math.sin(phase * Math.PI) * extend;
      ctx.rotate(baseAngle);
      ctx.translate(off, 0);
      this.drawThrustFx(w, tNorm);
      this.drawWeaponSilhouette(w, 0.6);
    } else if (w.swingType === 'overhead') {
      const progress = 1 - tNorm;
      const eased = progress * progress;
      const sweep = -2.2 + eased * 3.3;
      ctx.rotate(baseAngle + sweep);
      this.drawSlashFx(w, tNorm, sweep);
      this.drawWeaponSilhouette(w, 0.8);
    } else {
      ctx.rotate(baseAngle);
      this.drawSlashFx(w, tNorm, 0);
      this.drawWeaponSilhouette(w, 0.5);
    }
    ctx.restore();
  }

  private drawWeaponSilhouette(w: WeaponDef, glowAlpha: number): void {
    const ctx = this.ctx;
    const len = w.length;
    const th = w.thickness;
    ctx.fillStyle = w.hiltColour;
    ctx.fillRect(-3, -1, 4, 2);
    ctx.fillStyle = w.accentColour;
    ctx.fillRect(0, -2, 2, 5);
    ctx.fillStyle = '#04020a';
    ctx.fillRect(1, -Math.ceil(th / 2) - 1, len + 1, th + 2);
    ctx.fillStyle = w.bladeColour;
    ctx.fillRect(2, -Math.floor(th / 2), len - 1, th);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, -Math.floor(th / 2), len - 2, 1);
    ctx.fillStyle = w.accentColour;
    ctx.fillRect(len - 3, 0, 2, 1);
    if (glowAlpha > 0) {
      ctx.globalAlpha = glowAlpha;
      ctx.fillStyle = w.swingColour;
      ctx.fillRect(2, -Math.floor(th / 2) - 1, len - 1, th + 2);
      ctx.globalAlpha = 1;
    }
  }

  private drawSlashFx(w: WeaponDef, tNorm: number, sweep: number): void {
    const ctx = this.ctx;
    const reach = w.range;
    ctx.fillStyle = `rgba(255, 247, 214, ${tNorm * 0.22})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, reach + 4, sweep - 0.7, sweep + 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = w.swingColour;
    ctx.globalAlpha = tNorm * 0.55;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.arc(2, 0, reach - 2, sweep - 0.4, sweep + 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${tNorm})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, reach, sweep - 0.04, sweep + 0.04);
    ctx.stroke();
  }

  private drawThrustFx(w: WeaponDef, tNorm: number): void {
    const ctx = this.ctx;
    const reach = w.range;
    ctx.fillStyle = w.swingColour;
    ctx.globalAlpha = tNorm * 0.6;
    ctx.fillRect(0, -1, reach, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255, 255, 255, ${tNorm})`;
    ctx.fillRect(reach - 4, -1, 4, 2);
  }

  // ─── Projectiles ─────────────────────────────────────────────────

  private drawProjectiles(): void {
    const ctx = this.ctx;
    for (const pr of this.s.projectiles) {
      const r = pr.radius;
      const vx = pr.vel.x, vy = pr.vel.y;
      const speed = Math.hypot(vx, vy) || 1;
      const visual = pr.visual ?? 'orb';
      const angle = Math.atan2(vy, vx);

      if (visual === 'shard') {
        ctx.save();
        ctx.translate(pr.pos.x, pr.pos.y);
        ctx.rotate(angle);
        ctx.fillStyle = pr.trailColour;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(-r * 3, -r * 0.5, r * 3, r);
        ctx.globalAlpha = 1;
        ctx.fillStyle = pr.colour;
        ctx.beginPath();
        ctx.moveTo(r * 1.6, 0);
        ctx.lineTo(0, -r);
        ctx.lineTo(-r * 1.2, 0);
        ctx.lineTo(0, r);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(-1, -1, r * 1.6, 1);
        ctx.restore();
        continue;
      }

      if (visual === 'flame') {
        for (let i = 1; i <= 4; i++) {
          const tx = pr.pos.x - (vx / speed) * i * (r * 0.9);
          const ty = pr.pos.y - (vy / speed) * i * (r * 0.9);
          ctx.fillStyle = pr.trailColour;
          ctx.globalAlpha = 0.32 * (5 - i) / 4;
          ctx.beginPath();
          ctx.arc(tx, ty, r * (1 - i * 0.12), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        const halo = ctx.createRadialGradient(pr.pos.x, pr.pos.y, 1, pr.pos.x, pr.pos.y, r * 2.4);
        halo.addColorStop(0, 'rgba(255, 122, 58, 0.55)');
        halo.addColorStop(1, 'rgba(255, 122, 58, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(pr.pos.x - r * 3, pr.pos.y - r * 3, r * 6, r * 6);
        const pulse = 1 + Math.sin(this.s.timeAlive * 18 + pr.id) * 0.15;
        ctx.fillStyle = pr.colour;
        ctx.beginPath();
        ctx.arc(pr.pos.x, pr.pos.y, r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe6a3';
        ctx.beginPath();
        ctx.arc(pr.pos.x, pr.pos.y, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(pr.pos.x - 1, pr.pos.y - 1, 2, 2);
        continue;
      }

      for (let i = 1; i <= 3; i++) {
        const tx = pr.pos.x - (vx / speed) * i * (r + 1);
        const ty = pr.pos.y - (vy / speed) * i * (r + 1);
        ctx.fillStyle = pr.colour;
        ctx.globalAlpha = 0.18 * (4 - i) / 3;
        ctx.beginPath();
        ctx.arc(tx, ty, r * (1 - i * 0.15), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = pr.colour;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(pr.pos.x, pr.pos.y, r * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = pr.colour;
      ctx.beginPath();
      ctx.arc(pr.pos.x, pr.pos.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(pr.pos.x, pr.pos.y, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── Damage numbers ─────────────────────────────────────────────

  private drawDamageNumbers(): void {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const d of this.s.damageNumbers) {
      const a = Math.max(0, Math.min(1, d.life / d.maxLife));
      const tFromStart = 1 - a;
      const scale = tFromStart < 0.3 ? 1.0 + (0.3 - tFromStart) * 2 : 1.0;
      const text = d.text ?? `${d.value}`;
      const big = text.startsWith('-') || /^\d+$/.test(text);
      const baseSize = big ? 11 : 9;
      ctx.font = `bold ${Math.round(baseSize * scale)}px "Iowan Old Style","Georgia",serif`;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillText(text, Math.round(d.x) + 1, Math.round(d.y) + 1);
      ctx.fillText(text, Math.round(d.x) - 1, Math.round(d.y) + 1);
      ctx.fillText(text, Math.round(d.x) + 1, Math.round(d.y) - 1);
      ctx.fillText(text, Math.round(d.x) - 1, Math.round(d.y) - 1);
      ctx.fillStyle = d.colour;
      ctx.fillText(text, Math.round(d.x), Math.round(d.y));
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  private drawRoomClearEffects(): void {
    const ctx = this.ctx;
    for (const e of this.s.roomClearEffects) {
      const t = e.t / e.duration;
      ctx.strokeStyle = `rgba(244, 210, 122, ${1 - t})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 12 + t * 120, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ─── Lighting ────────────────────────────────────────────────────

  private paintLight(x: number, y: number, r: number, rgb: string, alpha: number): void {
    const g = this.ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    this.ctx.fillStyle = g;
    this.ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  private drawLighting(): void {
    const ctx = this.ctx;
    const sphereRgb = hexToRgbString(this.s.currentSphere.accent);
    const t = this.s.timeAlive;
    const flick = (seed: number): number => 0.86 + 0.14 * Math.sin(t * 6 + seed * 1.7);

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(70, 56, 110)';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 1; i <= 4; i++) {
      const lx = (ROOM_W / 5) * i;
      const ly = 28;
      const f = flick(i);
      this.paintLight(lx, ly, 78, '255, 220, 160', 0.42 * f);
      this.paintLight(lx, ly, 110, sphereRgb, 0.14 * f);
    }

    if (this.s.dyingT < 0) {
      this.paintLight(this.s.player.pos.x, this.s.player.pos.y - 6, 56, '244, 210, 122', 0.38);
    }

    if (this.s.room.hasChest && !this.s.room.chestOpened) {
      this.paintLight(ROOM_W / 2, ROOM_H / 2, 36, '244, 210, 122', 0.28);
    }

    for (const pk of this.s.pickups) {
      switch (pk.kind) {
        case 'coin':    this.paintLight(pk.pos.x, pk.pos.y, 22, '244, 210, 122', 0.45); break;
        case 'essence': this.paintLight(pk.pos.x, pk.pos.y, 24, '155, 108, 255', 0.45); break;
        case 'hp':      this.paintLight(pk.pos.x, pk.pos.y, 26, '255, 122, 138', 0.45); break;
        case 'mp':      this.paintLight(pk.pos.x, pk.pos.y, 26, '155, 108, 255', 0.45); break;
        case 'key':     this.paintLight(pk.pos.x, pk.pos.y, 26, '108, 246, 229', 0.45); break;
        case 'relic':   this.paintLight(pk.pos.x, pk.pos.y, 40, '244, 210, 122', 0.55); break;
        case 'weapon':  this.paintLight(pk.pos.x, pk.pos.y, 36, '244, 210, 122', 0.45); break;
        case 'spell':   this.paintLight(pk.pos.x, pk.pos.y, 36, '155, 108, 255', 0.45); break;
      }
    }

    if (this.s.room.type === 'boss') {
      const cx = ROOM_W / 2, cy = ROOM_H / 2;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
        const lx = cx + Math.cos(a) * 110;
        const ly = cy + Math.sin(a) * 80;
        this.paintLight(lx, ly, 60, sphereRgb, 0.32 * flick(i * 3));
      }
    }

    if (this.s.room.hasShrine && !this.s.room.shrineUsed) {
      const pulse = 0.85 + 0.15 * Math.sin(t * 3);
      this.paintLight(ROOM_W / 2, ROOM_H / 2 + 8, 50, '244, 210, 122', 0.32 * pulse);
    }

    for (const pr of this.s.projectiles) {
      if (!pr.fromPlayer) continue;
      const rgb = hexToRgbString(pr.colour);
      this.paintLight(pr.pos.x, pr.pos.y, 22, rgb, 0.42);
    }

    ctx.restore();
  }

  private makeTorchTint(sphere: { accent: string }): { rgb: string; halo: string } {
    const rgb = hexToRgbString(sphere.accent);
    return { rgb, halo: `rgba(${rgb}, 0.35)` };
  }
}
