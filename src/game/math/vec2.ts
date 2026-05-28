export interface Vec2 { x: number; y: number; }

export function v(x: number, y: number): Vec2 { return { x, y }; }
export function len(a: Vec2): number { return Math.hypot(a.x, a.y); }
export function norm(a: Vec2): Vec2 {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
}
export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
export function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}
export function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

/** Convert a hex colour to an `"r, g, b"` CSS triple suitable for rgba(). */
export function hexToRgbString(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}`;
}
