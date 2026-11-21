// The shared pose library and keyframe evaluation. Poses are partial: missing fields come from 'idle'.
// Angle conventions: docs/DESIGN.md (armF 0 = hanging, 90 = forward, 180 = overhead; legF + = forward; shin + =
// knee bends back; rot/lean + = forward pitch).
import { dsin } from './math';
import type { Ease, Key, Pose, PoseRef } from './types';

export const IDLE: Pose = {
  rot: 0,
  lean: 6,
  head: 0,
  armF: 22,
  foreF: 40,
  armB: -14,
  foreB: 34,
  legF: 10,
  shinF: 12,
  legB: -10,
  shinB: 12,
  wep: 100,
  tail: 50,
  x: 0,
  y: 0,
  sx: 1,
  sy: 1,
};

export const POSES: Record<string, Partial<Pose>> = {
  idle: {},
  ready: { lean: 12, armF: 55, foreF: 75, armB: 35, foreB: 85, legF: 26, shinF: 30, legB: -22, shinB: 26 },
  crouch: { lean: 32, head: -12, armF: 45, foreF: 60, armB: 25, foreB: 60, legF: 75, shinF: 115, legB: 15, shinB: 115, sy: 0.96 },
  land: { lean: 25, armF: 35, foreF: 40, armB: -30, foreB: 40, legF: 60, shinF: 95, legB: -5, shinB: 90, sy: 0.9, sx: 1.08 },
  // ---- strikes
  jabWind: { lean: 10, armF: 40, foreF: 110, armB: 30, foreB: 90, legF: 25, shinF: 25, legB: -22, shinB: 20 },
  jab1: { lean: 16, armF: 92, foreF: 0, armB: 25, foreB: 95, legF: 28, shinF: 22, legB: -22, shinB: 16 },
  jab2: { lean: 20, armF: 35, foreF: 95, armB: 96, foreB: 0, legF: 28, shinF: 22, legB: -24, shinB: 16 },
  punchWind: { lean: -6, armF: -35, foreF: 105, armB: 45, foreB: 80, legF: 22, shinF: 20, legB: -28, shinB: 18 },
  punch: { lean: 26, armF: 96, foreF: 0, armB: -42, foreB: 30, legF: 38, shinF: 16, legB: -38, shinB: 6 },
  uppercutWind: { lean: 30, armF: 10, foreF: 100, armB: 20, foreB: 80, legF: 50, shinF: 70, legB: -10, shinB: 60 },
  uppercut: { lean: -12, armF: 172, foreF: 8, armB: -25, foreB: 40, legF: 14, shinF: 8, legB: -14, shinB: 10 },
  kickWind: { lean: -8, armF: 45, foreF: 60, armB: -45, foreB: 40, legF: 72, shinF: 125, legB: -6, shinB: 12 },
  kick: { lean: -16, armF: 45, foreF: 50, armB: -55, foreB: 30, legF: 96, shinF: 0, legB: -4, shinB: 10 },
  kickHigh: { lean: -32, armF: 65, foreF: 40, armB: -65, foreB: 30, legF: 145, shinF: 0, legB: -2, shinB: 8 },
  kickLow: { lean: 28, armF: 50, foreF: 40, armB: -30, foreB: 40, legF: 78, shinF: 0, legB: -30, shinB: 100 },
  backKick: { lean: 32, armF: 40, foreF: 40, armB: -30, foreB: 50, legF: 12, shinF: 22, legB: -102, shinB: 0 },
  stomp: { lean: 4, armF: 60, foreF: 30, armB: -40, foreB: 30, legF: 14, shinF: 0, legB: -12, shinB: 30 },
  overheadWind: { lean: -22, armF: 192, foreF: 20, armB: 172, foreB: 20, legF: 20, shinF: 20, legB: -20, shinB: 16 },
  overhead: { lean: 34, armF: 72, foreF: -8, armB: 62, foreB: -4, legF: 40, shinF: 30, legB: -34, shinB: 10 },
  // ---- weapon swings (wep relative to forearm: 0 = continues the arm)
  swingWind: { lean: -12, armF: -62, foreF: 34, wep: 70, armB: 40, foreB: 70, legF: 24, shinF: 22, legB: -26, shinB: 16 },
  swing: { lean: 22, armF: 96, foreF: 0, wep: 0, armB: -30, foreB: 40, legF: 40, shinF: 18, legB: -36, shinB: 8 },
  swingLow: { lean: 36, armF: 62, foreF: 0, wep: -18, armB: -30, foreB: 40, legF: 60, shinF: 70, legB: -30, shinB: 30 },
  swingUpWind: { lean: 18, armF: 28, foreF: 10, wep: 62, armB: 20, foreB: 60, legF: 40, shinF: 50, legB: -20, shinB: 40 },
  swingUp: { lean: -10, armF: 168, foreF: 4, wep: 0, armB: 150, foreB: 20 },
  stab: { lean: 32, armF: 92, foreF: 0, wep: 0, armB: -40, foreB: 30, legF: 46, shinF: 20, legB: -40, shinB: 6 },
  // ---- smash attacks
  smashWind: { lean: -16, armF: -52, foreF: 60, armB: -72, foreB: 60, legF: 32, shinF: 42, legB: -36, shinB: 22, sy: 0.96 },
  smashHit: { lean: 32, armF: 96, foreF: 0, armB: 80, foreB: 10, legF: 52, shinF: 30, legB: -52, shinB: 4, sx: 1.06 },
  upSmashWind: { lean: 22, armF: 22, foreF: 120, armB: 22, foreB: 120, legF: 62, shinF: 104, legB: 12, shinB: 104, sy: 0.92 },
  upSmash: { lean: -6, armF: 180, foreF: 0, armB: 172, foreB: 0, legF: 6, shinF: 4, legB: -6, shinB: 4, y: 8, sy: 1.08 },
  downSmashWind: { lean: 10, armF: 140, foreF: 30, armB: 130, foreB: 30, legF: 40, shinF: 60, legB: -30, shinB: 50 },
  downSmash: { lean: 14, armF: 60, foreF: 0, armB: -60, foreB: 0, legF: 82, shinF: 0, legB: -82, shinB: 0 },
  // ---- aerials
  nair: { lean: 0, armF: 100, foreF: 0, armB: -100, foreB: 0, legF: 52, shinF: 60, legB: -42, shinB: 60 },
  fairWind: { lean: -14, armF: 165, foreF: 30, armB: 140, foreB: 30, legF: 42, shinF: 92, legB: 22, shinB: 92 },
  fair: { lean: 34, armF: 62, foreF: 0, armB: 52, foreB: 0, legF: 44, shinF: 60, legB: -10, shinB: 70 },
  bair: { lean: 22, head: 10, armF: 32, foreF: 50, armB: 20, foreB: 50, legF: 42, shinF: 92, legB: -112, shinB: 0 },
  uairWind: { lean: 0, armF: 40, foreF: 60, armB: -40, foreB: 60, legF: 32, shinF: 92, legB: -22, shinB: 82 },
  uair: { lean: -42, armF: 22, foreF: 40, armB: -42, foreB: 40, legF: 172, shinF: 0, legB: 10, shinB: 30 },
  dairWind: { lean: 6, armF: 142, foreF: 20, armB: 142, foreB: 20, legF: 82, shinF: 122, legB: 72, shinB: 122 },
  dair: { lean: 0, armF: 162, foreF: 0, armB: 152, foreB: 0, legF: 2, shinF: 0, legB: 10, shinB: 0, sy: 1.08 },
  // ---- grabs and throws
  grab: { lean: 26, armF: 92, foreF: 8, armB: 86, foreB: 8, legF: 40, shinF: 20, legB: -30, shinB: 10 },
  hold: { lean: 10, armF: 80, foreF: 30, armB: 72, foreB: 30, legF: 24, shinF: 24, legB: -22, shinB: 18 },
  throwF: { lean: 36, armF: 112, foreF: 0, armB: 102, foreB: 0, legF: 44, shinF: 16, legB: -38, shinB: 6 },
  throwB: { lean: -32, rot: -18, armF: -92, foreF: 0, armB: -82, foreB: 0, legF: 30, shinF: 20, legB: -10, shinB: 20 },
  throwUp: { lean: -12, armF: 180, foreF: 0, armB: 176, foreB: 0, legF: 10, shinF: 10, legB: -10, shinB: 10 },
  throwDown: { lean: 52, armF: 40, foreF: 0, armB: 32, foreB: 0, legF: 52, shinF: 92, legB: -10, shinB: 60 },
  // ---- casting
  cast: { lean: 12, armF: 96, foreF: 0, armB: 30, foreB: 92, legF: 30, shinF: 22, legB: -26, shinB: 14 },
  castWind: { lean: -10, armF: 30, foreF: 120, armB: -30, foreB: 90, legF: 22, shinF: 22, legB: -22, shinB: 16 },
  castUp: { lean: -12, armF: 172, foreF: 0, armB: 152, foreB: 0 },
  castDown: { lean: 30, armF: 22, foreF: -10, armB: 14, foreB: -10, legF: 40, shinF: 60, legB: -20, shinB: 50 },
  charge: { lean: 26, armF: 62, foreF: 102, armB: 56, foreB: 102, legF: 42, shinF: 62, legB: -22, shinB: 52 },
  // ---- states
  hurt: { lean: -26, head: -22, armF: 122, foreF: 30, armB: 112, foreB: 30, legF: 32, shinF: 42, legB: -12, shinB: 32 },
  hurtBig: { lean: -42, head: -32, armF: 152, foreF: 10, armB: 162, foreB: 10, legF: 42, shinF: 30, legB: -32, shinB: 30 },
  tumble: { lean: 0, armF: 132, foreF: 20, armB: -132, foreB: 20, legF: 62, shinF: 62, legB: -62, shinB: 62 },
  lying: { rot: -88, lean: 0, head: 10, armF: 162, foreF: 10, armB: 172, foreB: 10, legF: 2, shinF: 6, legB: 10, shinB: 6 },
  ledge: { lean: 0, head: -10, armF: 176, foreF: 0, armB: 170, foreB: 0, legF: 22, shinF: 42, legB: -12, shinB: 32 },
  climb: { lean: 42, armF: 102, foreF: 20, armB: 92, foreB: 20, legF: 82, shinF: 102, legB: -10, shinB: 60 },
  shield: { lean: 16, armF: 72, foreF: 102, armB: 62, foreB: 102, legF: 32, shinF: 42, legB: -26, shinB: 32 },
  roll: { lean: 42, head: 20, armF: 92, foreF: 122, armB: 82, foreB: 122, legF: 112, shinF: 142, legB: 102, shinB: 142 },
  dodge: { lean: -18, head: -10, armF: 32, foreF: 40, armB: -32, foreB: 40, legF: 10, shinF: 20, legB: -20, shinB: 20, sx: 0.95 },
  airdodge: { lean: 0, armF: 150, foreF: 10, armB: -150, foreB: 10, legF: 22, shinF: 30, legB: -22, shinB: 30 },
  squat: { lean: 20, armF: 10, foreF: 30, armB: -30, foreB: 30, legF: 60, shinF: 100, legB: 0, shinB: 100, sy: 0.88, sx: 1.08 },
  jump: { lean: 4, armF: 142, foreF: 20, armB: -42, foreB: 30, legF: 42, shinF: 62, legB: -12, shinB: 42, sy: 1.08, sx: 0.95 },
  tuck: { lean: 30, armF: 82, foreF: 122, armB: 72, foreB: 122, legF: 102, shinF: 142, legB: 92, shinB: 142 },
  fall: { lean: 2, armF: 112, foreF: 22, armB: 102, foreB: 22, legF: 22, shinF: 32, legB: -16, shinB: 42 },
  helpless: { lean: -8, head: -16, armF: 162, foreF: 12, armB: 152, foreB: 12, legF: 12, shinF: 22, legB: -12, shinB: 22 },
  dash: { lean: 32, armF: -62, foreF: 82, armB: 62, foreB: 82, legF: 72, shinF: 62, legB: -62, shinB: 62 },
  skid: { lean: -26, armF: 82, foreF: 20, armB: -42, foreB: 20, legF: 52, shinF: 2, legB: -22, shinB: 62 },
  teeter: { lean: -6, armF: 152, foreF: -20, armB: 142, foreB: -20, legF: 6, shinF: 6, legB: -16, shinB: 6 },
  taunt: { lean: -6, head: -12, armF: 172, foreF: 30, armB: -22, foreB: 30 },
  victory: { lean: -6, head: -10, armF: 176, foreF: 0, armB: 176, foreB: 0, legF: 22, shinF: 10, legB: -22, shinB: 10 },
  dizzy: { lean: 12, head: 22, armF: 12, foreF: 10, armB: -12, foreB: 10, legF: 16, shinF: 30, legB: -16, shinB: 30 },
  grabbed: { lean: -10, head: -20, armF: 140, foreF: 40, armB: 130, foreB: 40, legF: 20, shinF: 50, legB: -10, shinB: 50 },
  float: { lean: 4, armF: 102, foreF: 42, armB: -102, foreB: 42, legF: 32, shinF: 82, legB: 22, shinB: 82 },
  spin: { lean: 0, armF: 92, foreF: 0, armB: -92, foreB: 0, legF: 20, shinF: 30, legB: -20, shinB: 30 },
};

const FIELDS = Object.keys(IDLE) as (keyof Pose)[];

/** resolve a pose reference to a full pose (fighter poses first, then the shared library) */
export function resolve(ref: PoseRef, extra?: Record<string, Partial<Pose>>): Pose {
  if (typeof ref === 'string') return { ...IDLE, ...(extra?.[ref] ?? POSES[ref] ?? {}) };
  if (Array.isArray(ref)) return { ...IDLE, ...(extra?.[ref[0]] ?? POSES[ref[0]] ?? {}), ...ref[1] };
  return { ...IDLE, ...ref };
}

function ease(t: number, e: Ease): number {
  switch (e) {
    case 'lin':
      return t;
    case 'in':
      return t * t;
    case 'out':
      return 1 - (1 - t) * (1 - t);
    case 'io':
      return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
    case 'step':
      return t < 1 ? 0 : 1;
  }
}

export function mix(a: Pose, b: Pose, t: number): Pose {
  const o = { ...a };
  for (const k of FIELDS) o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
}

/**
 * Evaluate keyframes at frame f (fractional allowed). Keys are sorted by frame; the ease on a key shapes the
 * blend INTO that key (default 'out': fast start, soft landing, good for strikes).
 */
export function evalKeys(keys: Key[], f: number, extra?: Record<string, Partial<Pose>>): Pose {
  if (!keys.length) return { ...IDLE };
  if (f <= keys[0][0]) return resolve(keys[0][1], extra);
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f <= k[0]) {
      const p = keys[i - 1];
      const span = k[0] - p[0];
      const t = span > 0 ? (f - p[0]) / span : 1;
      return mix(resolve(p[1], extra), resolve(k[1], extra), ease(t, k[2] ?? 'out'));
    }
  }
  return resolve(keys[keys.length - 1][1], extra);
}

// ------------------------------------------------------------------ cycles for the base animations

export function walkCycle(phase: number, amt: number): Pose {
  const s = dsin(phase);
  const c = dsin(phase + 90);
  return {
    ...IDLE,
    lean: 8 + 4 * amt,
    armF: 10 - 34 * s * amt,
    foreF: 30,
    armB: 10 + 34 * s * amt,
    foreB: 30,
    legF: 6 + 32 * s * amt,
    shinF: 14 + 26 * Math.max(0, -c) * amt,
    legB: 6 - 32 * s * amt,
    shinB: 14 + 26 * Math.max(0, c) * amt,
    y: 2 * Math.abs(c) * amt,
  };
}

export function runCycle(phase: number): Pose {
  const s = dsin(phase);
  const c = dsin(phase + 90);
  return {
    ...IDLE,
    lean: 26,
    head: -6,
    armF: 20 - 70 * s,
    foreF: 80,
    armB: 20 + 70 * s,
    foreB: 80,
    legF: 20 + 58 * s,
    shinF: 30 + 70 * Math.max(0, -c),
    legB: 20 - 58 * s,
    shinB: 30 + 70 * Math.max(0, c),
    y: 6 * Math.abs(c),
  };
}
