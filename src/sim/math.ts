// Deterministic math for the simulation. Every browser must compute bit-identical results (rollback netcode
// depends on it), so trig comes from tables built with + - * / only, never Math.sin/cos/atan2.

export const PI = 3.141592653589793;

function taylorSin(x: number): number {
  // x in [-PI/2, PI/2]
  const x2 = x * x;
  let term = x;
  let sum = x;
  for (let k = 1; k < 14; k++) {
    term = (-term * x2) / (2 * k * (2 * k + 1));
    sum += term;
  }
  return sum;
}

const STEPS = 4; // table entries per degree
const SIN = new Float64Array(360 * STEPS + 2);
for (let i = 0; i < SIN.length; i++) {
  const deg = i / STEPS;
  // reduce to [-90, 90] with exact symmetries
  let d = deg % 360;
  let sign = 1;
  if (d > 180) {
    d -= 180;
    sign = -1;
  }
  if (d > 90) d = 180 - d;
  SIN[i] = sign * taylorSin((d * PI) / 180);
}

/** sin of an angle in degrees */
export function dsin(deg: number): number {
  let d = deg - Math.floor(deg / 360) * 360;
  d *= STEPS;
  const i = Math.floor(d);
  const t = d - i;
  return SIN[i] + (SIN[i + 1] - SIN[i]) * t;
}

/** cos of an angle in degrees */
export function dcos(deg: number): number {
  return dsin(deg + 90);
}

/** atan of t in [0, 1], radians (minimax polynomial, error ~1e-5 rad) */
function atan01(t: number): number {
  const t2 = t * t;
  return t * (0.99997726 + t2 * (-0.33262347 + t2 * (0.19354346 + t2 * (-0.11643287 + t2 * (0.05265332 + t2 * -0.0117212)))));
}

/** atan2 in degrees, (-180, 180]. Standard math convention: datan2(1, 0) = 90. */
export function datan2(y: number, x: number): number {
  if (x === 0 && y === 0) return 0;
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  let a: number;
  if (ax >= ay) a = atan01(ay / ax);
  else a = PI / 2 - atan01(ax / ay);
  if (x < 0) a = PI - a;
  if (y < 0) a = -a;
  return (a * 180) / PI;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function sign(v: number): number {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

/** move v toward target by at most step */
export function approach(v: number, target: number, step: number): number {
  if (v < target) return Math.min(target, v + step);
  if (v > target) return Math.max(target, v - step);
  return v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** round to 1/1024 so long float chains stay tidy (still deterministic) */
export function q(v: number): number {
  return Math.round(v * 1024) / 1024;
}

/** squared distance from point (px,py) to segment (ax,ay)-(bx,by) */
export function segDist2(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + dx * t - px;
  const cy = ay + dy * t - py;
  return cx * cx + cy * cy;
}

/** deterministic integer hash (for stateless per-frame randomness, e.g. bots) */
export function hash32(a: number, b = 0, c = 0): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return h >>> 0;
}
