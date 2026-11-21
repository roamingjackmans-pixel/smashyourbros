// Echo: chrono-courier from the Clockwork Future. Courier jacket with a satchel strap and an hourglass buckle, a cap
// with goggles, an asymmetric bob with a silver time-streak, a mint time-scarf, a clockwork wheel on her back and a
// pocket watch on a chain. Also draws her signature: the ghost two seconds behind her (from f.hist), the Rewind
// cooldown clock over her head, and Paradox's frozen, greyed-out world (via the harmless 'paradoxField' projectile,
// which is drawn after every fighter, so it can grey them all and then redraw Echo in full colour on top).
import { A } from '../../sim/acts';
import { FIGHTERS, STAGES } from '../../sim/data';
import { resolve } from '../../sim/poses';
import { worldSkel } from '../../sim/rig';
import type { Fighter, Proj, Skel, State } from '../../sim/types';
import { ECHO_COOLDOWN, ECHO_MIN_HIST, ECHO_STOP, echoGhost, echoGhostBack, echoPast } from '../../data/fighters/echo';
import { boneFrame, circle, ellipse, eyes, fillStroke, mouth, OUTLINE, rgba, rrect, shade, shoe, type ArtDef, type FView, type Palette } from '../art';
import { defaultTorso, drawFighter } from '../fighterDraw';
import { registerProjDraw } from '../things';

const RIG = { thigh: 23, shin: 23, torso: 34, head: 21, upper: 19, fore: 18, girth: 13, limb: 6.5, wep: 44 };
const R = RIG.head;
const H = RIG.thigh + RIG.shin + RIG.torso + RIG.head * 1.85;
const BRASS = '#e3ab43';
const BRASS_D = '#9a6522';
const CREAM = '#fff7e2';
const TAU = Math.PI * 2;

const PALETTES: Palette[] = [
  { name: 'Chrono Mint', main: '#2c6577', second: '#f3ead2', accent: '#9cffd9', skin: '#ffd7b8', extra: '#3a2648' },
  { name: 'Brass Courier', main: '#b8702a', second: '#3b2a22', accent: '#ffe08a', skin: '#c98a5e', extra: '#f4efe6' },
  { name: 'Midnight Loop', main: '#262a5c', second: '#cdd5ff', accent: '#7fd8ff', skin: '#8d5a3b', extra: '#ff6fb5' },
  { name: 'Future Fuchsia', main: '#e8438f', second: '#2b1633', accent: '#7fffe8', skin: '#ffe0c8', extra: '#2b1633' },
  { name: 'Sepia Snapshot', main: '#86623f', second: '#f2e3c2', accent: '#ffd38a', skin: '#e9c3a0', extra: '#4f321f' },
  { name: 'Paradox Purple', main: '#5a3ab6', second: '#1e1338', accent: '#ffcf3a', skin: '#f3c6a5', extra: '#bdf3ff' },
  { name: 'Alarm Red', main: '#d8343c', second: '#fff4e6', accent: '#ffe14f', skin: '#6b3f2a', extra: '#1c1a1f' },
  { name: 'Glitch Lime', main: '#1f2c25', second: '#c6ff4f', accent: '#c6ff4f', skin: '#ffd2b0', extra: '#9cffd9' },
];

function moveId(f: Fighter): string {
  if (f.act !== A.MOVE) return '';
  return FIGHTERS[f.def]?.moveIds[f.mv] ?? '';
}

function swingsWatch(id: string): boolean {
  return id === 'fsmash' || id === 'dsmash';
}

function holdsWatch(v: FView): boolean {
  const id = moveId(v.f);
  return id === 'dspec' || id === 'dspecFail' || id === 'ult' || (v.f.act === A.TAUNT && v.f.af >= 6 && v.f.af < 32);
}

/** hand angle helper: a = radians clockwise from 12 o'clock */
function hand(c: CanvasRenderingContext2D, x: number, y: number, a: number, len: number, w: number, col: string): void {
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + Math.sin(a) * len, y - Math.cos(a) * len);
  c.strokeStyle = col;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.stroke();
}

/** a little clock face (world or local units) */
function clock(c: CanvasRenderingContext2D, x: number, y: number, r: number, rim: string, face: string, ol: string, a1: number, a2: number): void {
  circle(c, x, y, r, rim, ol, Math.max(1.5, r * 0.16));
  circle(c, x, y, r * 0.74, face, null, 0);
  c.strokeStyle = rgba('#3a2a20', 0.7);
  c.lineWidth = Math.max(1, r * 0.08);
  for (let i = 0; i < 12; i += 3) {
    const a = (i / 12) * TAU;
    c.beginPath();
    c.moveTo(x + Math.sin(a) * r * 0.56, y - Math.cos(a) * r * 0.56);
    c.lineTo(x + Math.sin(a) * r * 0.7, y - Math.cos(a) * r * 0.7);
    c.stroke();
  }
  hand(c, x, y, a1, r * 0.42, Math.max(1.2, r * 0.13), '#3a2a20');
  hand(c, x, y, a2, r * 0.6, Math.max(1, r * 0.09), '#3a2a20');
  circle(c, x, y, Math.max(1, r * 0.1), '#3a2a20', null, 0);
}

/** the pocket watch, seen face-on; (dx, dy) points from the watch toward its chain */
function pocketWatch(c: CanvasRenderingContext2D, x: number, y: number, r: number, dx: number, dy: number, t: number, ol: string, glow: string | null): void {
  const l = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  if (glow) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    circle(c, x, y, r * 1.9, rgba(glow, 0.22), null, 0);
    circle(c, x, y, r * 1.35, rgba(glow, 0.3), null, 0);
    c.restore();
  }
  // crown + bow toward the chain
  circle(c, x + ux * r * 1.12, y + uy * r * 1.12, r * 0.28, BRASS_D, ol, 2);
  c.beginPath();
  c.arc(x + ux * r * 1.42, y + uy * r * 1.42, r * 0.3, 0, TAU);
  c.strokeStyle = BRASS;
  c.lineWidth = 2.4;
  c.stroke();
  clock(c, x, y, r, BRASS, CREAM, ol, t * 0.02, t * 0.24);
  // glass shine
  c.beginPath();
  c.arc(x, y, r * 0.58, -2.5, -1.6);
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = Math.max(1.2, r * 0.12);
  c.stroke();
}

/** a chain between two world points */
function chain(c: CanvasRenderingContext2D, a: [number, number], b: [number, number], ol: string): void {
  c.save();
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(a[0], a[1]);
  c.lineTo(b[0], b[1]);
  c.strokeStyle = ol;
  c.lineWidth = 5;
  c.stroke();
  c.setLineDash([5, 3]);
  c.strokeStyle = BRASS;
  c.lineWidth = 3;
  c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ the ghost

/** a translucent hologram of the current skeleton, shifted by (dx, dy) */
function ghostFigure(c: CanvasRenderingContext2D, k: Skel, dx: number, dy: number, glow: string, a: number): void {
  if (a <= 0.01) return;
  let col = glow;
  const s = k.scale;
  const P = (q: [number, number]): [number, number] => [q[0] + dx, q[1] + dy];
  const path = (pts: [number, number][]): void => {
    c.beginPath();
    c.moveTo(P(pts[0])[0], P(pts[0])[1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(P(pts[i])[0], P(pts[i])[1]);
  };
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const [w, al, mode] of [
    // a dark halo so the ghost reads on bright stages too, then two additive glow passes
    [14, 0.28, 'dark'],
    [10, 0.22, 'lighter'],
    [0, 0.4, 'lighter'],
  ] as const) {
    c.globalCompositeOperation = mode === 'dark' ? 'source-over' : 'lighter';
    col = mode === 'dark' ? '#0d3a40' : glow;
    c.strokeStyle = rgba(col, a * al);
    c.lineWidth = (13 + w) * s;
    path([k.footB, k.kneeB, k.hip, k.kneeF, k.footF]);
    c.stroke();
    c.lineWidth = (11 + w) * s;
    path([k.handB, k.elbowB, k.shoulder, k.elbowF, k.handF]);
    c.stroke();
    c.lineWidth = (RIG.girth * 2 + 2 + w) * s;
    path([k.hip, k.neck]);
    c.stroke();
    const [hx, hy] = P(k.head);
    circle(c, hx, hy, (R + w * 0.5) * s, rgba(col, a * al), null, 0);
  }
  // a clock on the chest, so it reads as "her, in the past"
  const mx = (k.hip[0] + k.neck[0]) / 2 + dx;
  const my = (k.hip[1] + k.neck[1]) / 2 + dy;
  c.strokeStyle = rgba('#ffffff', a * 0.8);
  c.lineWidth = 2 * s;
  c.beginPath();
  c.arc(mx, my, 8 * s, 0, TAU);
  c.stroke();
  hand(c, mx, my, -0.9, 6 * s, 2 * s, rgba('#ffffff', a * 0.8));
  hand(c, mx, my, 0, 4 * s, 2 * s, rgba('#ffffff', a * 0.8));
  c.restore();
}

function drawGhost(c: CanvasRenderingContext2D, v: FView): void {
  const f = v.f;
  if (f.act === A.DEAD || f.act === A.RESPAWN || !f.hist || !f.v) return;
  const g = echoGhost(v.st, f);
  if (!g) return;
  const ready = f.v[0] <= 0 && f.v[2] >= ECHO_MIN_HIST;
  const col = ready ? v.p.accent : '#9db3ad';
  const back = echoGhostBack(f);
  const lift = 52 * v.k.scale * v.k.grav;
  // the trail: where she has been, fading out toward the present
  c.save();
  const base = c.globalAlpha;
  c.lineCap = 'round';
  for (const [wd, al, dark] of [
    [7, 0.3, true],
    [12, 0.14, false],
    [3.5, 0.75, false],
  ] as const) {
    c.strokeStyle = rgba(dark ? '#0d3a40' : col, ready ? al : al * 0.4);
    c.lineWidth = wd;
    for (let b = back; b > 8; b -= 4) {
      const [x1, y1] = echoPast(v.st, f, b);
      const [x2, y2] = echoPast(v.st, f, b - 4);
      if (Math.abs(x1 - x2) > 400 || Math.abs(y1 - y2) > 400) continue;
      // fades in from the present toward the ghost
      c.globalAlpha = base * Math.min(1, (b - 8) / Math.max(1, back * 0.6));
      c.beginPath();
      c.moveTo(x1, y1 - lift);
      c.lineTo(x2, y2 - lift);
      c.stroke();
    }
  }
  c.globalAlpha = base;
  // tick marks along the trail, one per quarter second
  for (let b = back - (back % 15); b > 14; b -= 15) {
    const [x, y] = echoPast(v.st, f, b);
    circle(c, x, y - lift, 4, rgba(ready ? '#ffffff' : '#c8d6d2', (ready ? 0.8 : 0.35) * Math.min(1, b / Math.max(1, back * 0.6))), null, 0);
  }
  c.restore();
  const dx = g[0] - f.x;
  const dy = g[1] - f.y;
  if (dx * dx + dy * dy < 14 * 14) return;
  const pulse = ready ? 0.72 + 0.12 * Math.sin(v.t * 0.15) : 0.3;
  // the ghost waits where she was, checking her watch
  const cf = FIGHTERS[f.def];
  const pose = resolve('watch', cf.def.poses);
  pose.y += 2 + 2 * Math.sin(v.t * 0.08);
  const gk = worldSkel(cf.def.rig, pose, g[0], g[1], f.facing, f.grav, v.k.scale, true);
  ghostFigure(c, gk, 0, 0, col, pulse);
}

// ------------------------------------------------------------------ the parts

function scarf(c: CanvasRenderingContext2D, v: FView): void {
  const k = v.k;
  const f = v.f;
  const s = k.scale;
  const g = k.grav;
  const fc = k.facing;
  const vx = Math.max(-26, Math.min(26, (f.vx ?? 0) + (f.kx ?? 0)));
  const vy = Math.max(-26, Math.min(26, (f.vy ?? 0) + (f.ky ?? 0)));
  const col = v.p.accent;
  // the knot sits at the back of the neck; the tails stream out behind
  const ax = k.neck[0] + (k.shoulder[0] - k.neck[0]) * 0.6 - fc * 9 * s;
  const ay = k.neck[1] + (k.shoulder[1] - k.neck[1]) * 0.6;
  for (const tail of [1, 0]) {
    let x = ax;
    let y = ay;
    const pts: [number, number][] = [[x, y]];
    // hangs down the back when still, streams out flat at speed
    const spd = Math.min(18, Math.abs(vx) + Math.abs(vy) * 0.5);
    for (let i = 1; i <= 5; i++) {
      const wave = Math.sin(v.t * 0.24 + i * 0.95 + tail * 1.9) * (0.8 + i * (0.4 + spd * 0.05));
      x += (-fc * (3.5 + tail * 1.2) - vx * 0.32) * s + (i > 2 ? wave * 0.5 : 0);
      y += ((6.5 - spd * 0.28 + tail * 1.4) * g - vy * 0.28 + wave) * s;
      pts.push([x, y]);
    }
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.strokeStyle = v.ol;
    c.lineWidth = (tail ? 6.5 : 8) * s + 5.2;
    c.stroke();
    c.strokeStyle = tail ? shade(col, -0.22) : col;
    c.lineWidth = (tail ? 6.5 : 8) * s;
    c.stroke();
    // a stripe near the end
    const e = pts[4];
    const e2 = pts[5];
    c.beginPath();
    c.moveTo(e[0], e[1]);
    c.lineTo(e2[0], e2[1]);
    c.strokeStyle = rgba('#ffffff', 0.55);
    c.lineWidth = (tail ? 2.2 : 3) * s;
    c.stroke();
  }
}

/** the clockwork wheel on her back: gear teeth, a dial and hands that tick (and race backwards on Rewind) */
function wheel(c: CanvasRenderingContext2D, v: FView): void {
  const f = v.f;
  const id = moveId(f);
  boneFrame(c, v, v.k.hip, v.k.ang.torso);
  const cx = -RIG.girth - 9;
  const cy = -RIG.torso * 0.72;
  const rr = 21;
  let spin = Math.floor(v.t / 30) * (TAU / 60);
  if (id === 'dspec') spin = -f.mf * 0.55;
  else if (id === 'sspec') spin = f.mf * 0.5;
  else if (id === 'ult' || (v.st.timeStop > 0 && v.st.timeStopBy === f.i)) spin = 0.3;
  // gear teeth
  c.fillStyle = BRASS_D;
  c.strokeStyle = v.ol;
  c.lineWidth = 2.2;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + spin * 0.25;
    c.save();
    c.translate(cx, cy);
    c.rotate(a);
    rrect(c, -4.5, -rr - 6, 9, 9, 2);
    c.fill();
    c.stroke();
    c.restore();
  }
  circle(c, cx, cy, rr, BRASS, v.ol, 3);
  circle(c, cx, cy, rr * 0.78, rgba(CREAM, 0.95), v.ol, 1.8);
  // the dial fills as Rewind recharges
  const cd = f.v ? f.v[0] : 0;
  if (cd > 0) {
    c.beginPath();
    c.moveTo(cx, cy);
    c.arc(cx, cy, rr * 0.74, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - cd / ECHO_COOLDOWN));
    c.closePath();
    c.fillStyle = rgba(v.p.accent, 0.55);
    c.fill();
  } else {
    circle(c, cx, cy, rr * 0.62, rgba(v.p.accent, 0.35 + 0.15 * Math.sin(v.t * 0.12)), null, 0);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    c.beginPath();
    c.moveTo(cx + Math.sin(a) * rr * 0.6, cy - Math.cos(a) * rr * 0.6);
    c.lineTo(cx + Math.sin(a) * rr * (i % 3 ? 0.68 : 0.74), cy - Math.cos(a) * rr * (i % 3 ? 0.68 : 0.74));
    c.strokeStyle = '#3a2a20';
    c.lineWidth = i % 3 ? 1.2 : 2.2;
    c.stroke();
  }
  hand(c, cx, cy, spin * 0.083 + 1.9, rr * 0.4, 3, '#3a2a20');
  hand(c, cx, cy, spin, rr * 0.6, 2, '#3a2a20');
  circle(c, cx, cy, 2.6, BRASS_D, null, 0);
  // the mount
  rrect(c, cx + rr * 0.55, cy - 4, 12, 8, 3);
  fillStroke(c, BRASS_D, v.ol, 2);
  c.restore();
}

function heart(c: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, ol: string): void {
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  c.closePath();
  fillStroke(c, col, ol, 2.4);
}

function outlinedText(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, col: string, a = 1): void {
  c.save();
  c.globalAlpha *= a;
  c.font = `900 ${size}px Bungee, Impact, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(4, size * 0.2);
  c.strokeStyle = OUTLINE;
  c.strokeText(s, x, y);
  c.fillStyle = col;
  c.fillText(s, x, y);
  c.restore();
}

// ------------------------------------------------------------------ Paradox: the frozen world

interface Stash {
  st: State;
  f: Fighter;
  k: Skel;
  pal: number;
  t: number;
}
/** this frame's view of each Echo (by fighter index), for the time-stop field drawn after every fighter */
const STASH: Record<number, Stash> = {};
let redrawing = false;

function bodyMid(o: Fighter): [number, number] {
  const cf = FIGHTERS[o.def];
  const h = (cf?.height ?? 120) * (cf?.def.scale ?? 1);
  return [o.x, o.y - h * 0.5 * o.grav];
}

registerProjDraw('paradoxField', (c: CanvasRenderingContext2D, p: Proj, _r: number, t: number) => {
  const s = STASH[p.o];
  if (!s || s.t !== t) return;
  const st = s.st;
  if (!(st.timeStop > 0) || st.timeStopBy !== p.o) return;
  const stg = STAGES[st.stage];
  if (!stg) return;
  const pal = PALETTES[s.pal] ?? PALETTES[0];
  const el = ECHO_STOP - st.timeStop;
  const fade = Math.max(0, Math.min(1, el / 8, st.timeStop / 10));
  const b = stg.blast;
  const x0 = b.l - 900;
  const y0 = b.t - 900;
  const w = b.r - b.l + 1800;
  const h = b.b - b.t + 1800;
  // grey out everything drawn so far (stage, every fighter, frozen projectiles), then a cool tint
  c.save();
  c.globalCompositeOperation = 'saturation';
  c.globalAlpha = 0.9 * fade;
  c.fillStyle = '#808080';
  c.fillRect(x0, y0, w, h);
  c.globalCompositeOperation = 'multiply';
  c.globalAlpha = 0.6 * fade;
  c.fillStyle = '#c9ece6';
  c.fillRect(x0, y0, w, h);
  c.restore();
  // the clock hangs over the action (roughly where the camera looks)
  let cx = 0;
  let cy = 0;
  let n = 0;
  for (const o of st.fighters) {
    if (o.out || o.act === A.DEAD) continue;
    cx += o.x;
    cy += o.y;
    n++;
  }
  const s0 = stg.solids[0];
  cx = n ? cx / n : (s0.x1 + s0.x2) / 2;
  cy = (n ? cy / n : s0.y1) - 150;
  const CR = 520;
  c.save();
  c.globalAlpha = fade;
  // the shockwave when time stops
  if (el < 26) {
    const q = el / 26;
    c.strokeStyle = rgba('#ffffff', 0.85 * (1 - q));
    c.lineWidth = 50 * (1 - q) + 4;
    c.beginPath();
    c.arc(s.f.x, s.f.y - 60, 60 + q * 2200, 0, TAU);
    c.stroke();
  }
  // the giant clock over the stage
  c.fillStyle = rgba('#ffffff', 0.06);
  c.beginPath();
  c.arc(cx, cy, CR, 0, TAU);
  c.fill();
  c.strokeStyle = rgba(pal.accent, 0.5);
  c.lineWidth = 16;
  c.stroke();
  c.lineWidth = 4;
  c.strokeStyle = rgba('#ffffff', 0.35);
  c.beginPath();
  c.arc(cx, cy, CR - 26, 0, TAU);
  c.stroke();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU;
    const big = i % 5 === 0;
    c.beginPath();
    c.moveTo(cx + Math.sin(a) * (CR - (big ? 70 : 48)), cy - Math.cos(a) * (CR - (big ? 70 : 48)));
    c.lineTo(cx + Math.sin(a) * (CR - 34), cy - Math.cos(a) * (CR - 34));
    c.strokeStyle = rgba(pal.accent, big ? 0.6 : 0.3);
    c.lineWidth = big ? 9 : 4;
    c.stroke();
  }
  const NUM = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  c.font = '900 58px Bungee, Impact, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = rgba(pal.accent, 0.5);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    c.fillText(NUM[i], cx + Math.sin(a) * (CR - 125), cy - Math.cos(a) * (CR - 125));
  }
  // hands: the minute hand drains back to twelve as the stop runs out; the second hand is stuck, twitching
  const left = st.timeStop / ECHO_STOP;
  hand(c, cx, cy, -0.7, CR * 0.42, 22, rgba('#ffffff', 0.5));
  hand(c, cx, cy, left * TAU, CR * 0.7, 14, rgba(pal.accent, 0.75));
  hand(c, cx, cy, 2.2 + Math.sin(t * 1.7) * 0.025, CR * 0.82, 5, rgba('#ff6b6b', 0.8));
  circle(c, cx, cy, 26, rgba(pal.accent, 0.8), OUTLINE, 5);
  c.restore();
  // every frozen bro: a stopped-clock ring and a pause badge
  for (const o of st.fighters) {
    if (o.i === p.o || o.out || o.act === A.DEAD) continue;
    const [ox, oy] = bodyMid(o);
    const cf = FIGHTERS[o.def];
    const hh = (cf?.height ?? 120) * (cf?.def.scale ?? 1);
    c.save();
    c.globalAlpha = fade;
    c.setLineDash([10, 8]);
    c.lineDashOffset = 0;
    c.strokeStyle = rgba('#e8fffa', 0.7);
    c.lineWidth = 4;
    c.beginPath();
    c.arc(ox, oy, hh * 0.62, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    const by = o.y - (hh + 64) * o.grav;
    clock(c, ox, by, 20, '#cfe9ff', CREAM, OUTLINE, 0, 0);
    c.fillStyle = OUTLINE;
    c.fillRect(ox - 7, by - 8, 5, 16);
    c.fillRect(ox + 2, by - 8, 5, 16);
    c.restore();
  }
  // and Echo herself, the only thing still moving, in full colour
  if (!redrawing && s.f.act !== A.DEAD) {
    redrawing = true;
    try {
      drawFighter(c, st, s.f, { palette: s.pal, tint: '#ffffff', skel: s.k }, t);
    } finally {
      redrawing = false;
    }
    // the countdown over her head
    const cf = FIGHTERS[s.f.def];
    const secs = Math.ceil(st.timeStop / 60);
    const tick = (st.timeStop % 60) / 60;
    outlinedText(c, `${secs}`, s.f.x, s.f.y - ((cf?.height ?? 120) * s.k.scale + 150) * s.f.grav, 70 + 26 * tick * tick, pal.accent, fade);
  }
});

registerProjDraw('paradoxSnap', (c: CanvasRenderingContext2D, p: Proj, _r: number, t: number) => {
  const q = Math.min(1, p.age / 9);
  const R0 = 70;
  c.save();
  c.globalCompositeOperation = 'lighter';
  circle(c, p.x, p.y, R0 * (0.6 + q), rgba('#9cffd9', 0.35 * (1 - q)), null, 0);
  c.strokeStyle = rgba('#ffffff', 0.9 * (1 - q));
  c.lineWidth = 8 * (1 - q) + 2;
  c.beginPath();
  c.arc(p.x, p.y, R0 * (0.5 + q * 1.3), 0, TAU);
  c.stroke();
  // clock-glass shards
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.3;
    const d = R0 * (0.3 + q * 1.6);
    const x = p.x + Math.cos(a) * d;
    const y = p.y + Math.sin(a) * d;
    c.fillStyle = rgba(i % 2 ? '#9cffd9' : '#ffffff', 0.9 * (1 - q));
    c.beginPath();
    c.moveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
    c.lineTo(x + Math.cos(a + 2.2) * 6, y + Math.sin(a + 2.2) * 6);
    c.lineTo(x + Math.cos(a - 2.2) * 6, y + Math.sin(a - 2.2) * 6);
    c.closePath();
    c.fill();
  }
  c.restore();
  void t;
});

registerProjDraw('timebomb', (c: CanvasRenderingContext2D, p: Proj, r: number, t: number, col: string) => {
  const FUSE = 72;
  const left = Math.max(0, FUSE - p.age);
  const urgent = left < 26;
  const wob = urgent ? Math.sin(t * 1.3) * 0.18 : Math.sin(t * 0.25) * 0.05;
  if (urgent) {
    // the blast radius, so bros know to get out
    c.save();
    c.setLineDash([12, 10]);
    c.strokeStyle = rgba('#ff5a4a', 0.35 + 0.3 * (t % 6 < 3 ? 1 : 0));
    c.lineWidth = 4;
    c.beginPath();
    c.arc(p.x, p.y, 82, 0, TAU);
    c.stroke();
    c.restore();
  }
  c.save();
  c.translate(p.x, p.y);
  c.rotate(wob);
  const s = r / 15;
  c.scale(s, s);
  // little feet
  c.fillStyle = BRASS_D;
  c.strokeStyle = OUTLINE;
  c.lineWidth = 2.4;
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.moveTo(sx * 8, 11);
    c.lineTo(sx * 13, 19);
    c.stroke();
  }
  // twin bells and the hammer
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.arc(sx * 9, -13, 7, Math.PI, 0);
    c.closePath();
    fillStroke(c, BRASS, OUTLINE, 2.4);
  }
  const hx = urgent ? Math.sin(t * 2.4) * 4 : 0;
  c.beginPath();
  c.moveTo(0, -15);
  c.lineTo(hx, -22);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 2.5;
  c.stroke();
  circle(c, hx, -23, 3, BRASS_D, OUTLINE, 1.8);
  // body, owner band, face
  circle(c, 0, 0, 15, BRASS, OUTLINE, 3);
  c.beginPath();
  c.arc(0, 0, 13, 0.2, Math.PI - 0.2);
  c.strokeStyle = col.startsWith('#') ? col : '#9cffd9';
  c.lineWidth = 3;
  c.stroke();
  circle(c, 0, 0, 11, CREAM, OUTLINE, 1.6);
  // the time left, as a red wedge that shrinks to nothing
  c.beginPath();
  c.moveTo(0, 0);
  c.arc(0, 0, 9.5, -Math.PI / 2, -Math.PI / 2 + TAU * (left / FUSE));
  c.closePath();
  c.fillStyle = rgba('#ff5a4a', 0.75);
  c.fill();
  hand(c, 0, 0, TAU * (1 - left / FUSE), 8.5, 2.2, '#2a1a1a');
  circle(c, 0, 0, 1.8, '#2a1a1a', null, 0);
  // blinking light, faster as it gets close
  const blink = urgent ? t % 6 < 3 : t % 20 < 10;
  circle(c, 9, -8, 3, blink ? '#ff3a3a' : '#7a2020', OUTLINE, 1.5);
  c.restore();
});

// ------------------------------------------------------------------ the art

export const echoArt: ArtDef = {
  limb: 11,
  handR: 8,
  footL: 23,
  palettes: PALETTES,
  upperArm: (p) => p.main,
  foreArm: (p) => p.main,
  thigh: (p) => shade(p.main, -0.42),
  shin: (p) => shade(p.main, -0.42),
  back: (c, v) => {
    const f = v.f;
    if (!redrawing) {
      STASH[f.i] = { st: v.st, f, k: v.k, pal: Math.max(0, PALETTES.indexOf(v.p)), t: v.t };
    }
    const id = moveId(f);
    // the ghost two seconds behind
    drawGhost(c, v);
    // Rewind: a thread to the ghost while winding up, an afterimage where she left after
    if (id === 'dspec' && f.mf < 10 && f.v) {
      const mx = v.k.hip[0];
      const my = v.k.hip[1];
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.setLineDash([16, 12]);
      c.lineDashOffset = -v.t * 3;
      c.strokeStyle = rgba(v.p.accent, 0.7);
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(mx, my);
      c.lineTo(f.v[4], f.v[5] - 52 * v.k.grav);
      c.stroke();
      c.restore();
    }
    const since = f.v ? f.v[1] : 0;
    if (since > 0 && since < 30) {
      const q = since / 30;
      ghostFigure(c, v.k, f.v[4] - f.x, f.v[5] - f.y, v.p.accent, 0.6 * (1 - q));
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = rgba(v.p.accent, 0.5 * (1 - q));
      c.lineWidth = 26 * (1 - q) + 2;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(f.v[4], f.v[5] - 52);
      c.lineTo(f.x, f.y - 52);
      c.stroke();
      // rewind chevrons along the tape
      const n = 5;
      for (let i = 1; i < n; i++) {
        const x = f.v[4] + ((f.x - f.v[4]) * i) / n;
        const y = f.v[5] - 52 + ((f.y - f.v[5]) * i) / n;
        const dir = f.x >= f.v[4] ? -1 : 1;
        c.fillStyle = rgba('#ffffff', 0.7 * (1 - q));
        for (const o of [0, 14]) {
          c.beginPath();
          c.moveTo(x + dir * (o - 6), y);
          c.lineTo(x + dir * (o + 6), y - 10);
          c.lineTo(x + dir * (o + 6), y + 10);
          c.closePath();
          c.fill();
        }
      }
      c.restore();
    }
    // Skip: afterimages strung out behind her while she's between moments
    let bodyAlpha = 1;
    if (id === 'sspec') {
      const mf = f.mf;
      if (mf >= 5 && mf <= 16) {
        for (let n = 1; n <= 3; n++) ghostFigure(c, v.k, -(f.vx || f.facing * 20) * n * 2.1, 0, v.p.accent, 0.42 - n * 0.1);
      }
      if (mf === 5 || mf === 15) bodyAlpha = 0.5;
      else if (mf >= 6 && mf <= 14) bodyAlpha = 0.12;
    } else if (id === 'dspec' && f.mf >= 4 && f.mf < 10) {
      bodyAlpha = v.t % 4 < 2 ? 0.35 : 0.9;
    }
    if (bodyAlpha < 1) c.globalAlpha *= bodyAlpha;
    wheel(c, v);
    scarf(c, v);
  },
  torso: (c, v) => {
    const p = v.p;
    defaultTorso(c, v, RIG, p.main, shade(p.second, -0.5));
    boneFrame(c, v, v.k.hip, v.k.ang.torso);
    const L = RIG.torso;
    const g = RIG.girth;
    // jacket zip and pocket
    c.strokeStyle = shade(p.main, -0.35);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(g * 0.38, -L * 0.98);
    c.lineTo(g * 0.38, -g * 0.2);
    c.stroke();
    // satchel strap across the chest, with an hourglass buckle
    const strap = shade(p.second, -0.45);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-g * 0.95, -L * 0.98);
    c.lineTo(g * 0.95, -L * 0.16);
    c.strokeStyle = v.ol;
    c.lineWidth = 8.5;
    c.stroke();
    c.strokeStyle = strap;
    c.lineWidth = 5;
    c.stroke();
    const bx = g * 0.05;
    const by = -L * 0.58;
    c.beginPath();
    c.moveTo(bx - 5, by - 7);
    c.lineTo(bx + 5, by - 7);
    c.lineTo(bx - 5, by + 7);
    c.lineTo(bx + 5, by + 7);
    c.closePath();
    fillStroke(c, BRASS, v.ol, 2);
    c.fillStyle = p.accent;
    c.beginPath();
    c.moveTo(bx - 2.6, by + 5.5);
    c.lineTo(bx + 2.6, by + 5.5);
    c.lineTo(bx, by + 1.5);
    c.closePath();
    c.fill();
    // the pocket watch clipped to the belt (when it isn't out)
    if (!swingsWatch(moveId(v.f)) && !holdsWatch(v)) {
      c.beginPath();
      c.moveTo(g * 0.1, -g * 0.05);
      c.quadraticCurveTo(g * 0.35, g * 0.55, g * 0.75, g * 0.3);
      c.strokeStyle = BRASS;
      c.lineWidth = 2;
      c.stroke();
      circle(c, g * 0.82, g * 0.42, 5.5, BRASS, v.ol, 2);
      circle(c, g * 0.82, g * 0.42, 3.4, CREAM, null, 0);
    }
    // the time-scarf wrapped round the neck
    ellipse(c, 0, -L - 1, g * 1.02, 6.5, 0, p.accent, v.ol, 2.4);
    c.beginPath();
    c.moveTo(-g * 0.9, -L + 1);
    c.quadraticCurveTo(0, -L + 5, g * 0.9, -L + 1);
    c.strokeStyle = shade(p.accent, -0.25);
    c.lineWidth = 2;
    c.stroke();
    c.restore();
  },
  head: (c, v) => {
    const p = v.p;
    const hair = p.extra ?? '#3a2648';
    // the bob, behind the face
    c.beginPath();
    c.moveTo(R * 0.35, -R * 0.92);
    c.quadraticCurveTo(-R * 1.08, -R * 1.02, -R * 1.04, R * 0.22);
    c.quadraticCurveTo(-R * 0.98, R * 0.9, -R * 0.34, R * 0.98);
    c.quadraticCurveTo(-R * 0.12, R * 0.6, R * 0.1, R * 0.1);
    c.closePath();
    fillStroke(c, hair, v.ol, 2.6);
    // face
    ellipse(c, R * 0.1, R * 0.1, R * 0.8, R * 0.82, 0, p.skin, v.ol, 3);
    // ear
    ellipse(c, -R * 0.38, R * 0.16, R * 0.15, R * 0.2, 0, shade(p.skin, -0.08), v.ol, 2);
    // cheek + freckles
    circle(c, R * 0.58, R * 0.38, R * 0.14, rgba('#ff6b8a', 0.42), null, 0);
    c.fillStyle = rgba(shade(p.skin, -0.45), 0.7);
    for (const [fx, fy] of [
      [0.42, 0.28],
      [0.52, 0.22],
      [0.62, 0.3],
    ]) {
      c.beginPath();
      c.arc(R * fx, R * fy, 1.1, 0, TAU);
      c.fill();
    }
    eyes(c, v, R * 0.34, R * 0.02, R * 0.27, shade(p.accent, -0.45));
    mouth(c, v, R * 0.47, R * 0.48, R * 0.38);
    // side-swept fringe with a silver time-streak
    c.beginPath();
    c.moveTo(-R * 0.86, -R * 0.12);
    c.quadraticCurveTo(-R * 0.62, -R * 0.78, R * 0.2, -R * 0.66);
    c.quadraticCurveTo(R * 0.86, -R * 0.58, R * 1.0, -R * 0.08);
    c.quadraticCurveTo(R * 0.72, -R * 0.3, R * 0.36, -R * 0.3);
    c.quadraticCurveTo(R * 0.02, -R * 0.3, -R * 0.22, -R * 0.2);
    c.quadraticCurveTo(-R * 0.52, -R * 0.08, -R * 0.86, -R * 0.12);
    c.closePath();
    fillStroke(c, hair, v.ol, 2.4);
    c.beginPath();
    c.moveTo(-R * 0.4, -R * 0.36);
    c.quadraticCurveTo(R * 0.3, -R * 0.56, R * 0.86, -R * 0.16);
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.stroke();
    // courier cap: crown, band, visor
    c.beginPath();
    c.moveTo(-R * 0.98, -R * 0.44);
    c.quadraticCurveTo(-R * 0.96, -R * 1.24, R * 0.05, -R * 1.22);
    c.quadraticCurveTo(R * 0.84, -R * 1.14, R * 0.8, -R * 0.52);
    c.closePath();
    fillStroke(c, p.main, v.ol, 2.8);
    c.save();
    c.clip();
    c.fillStyle = shade(p.main, -0.18);
    c.fillRect(-R * 1.1, -R * 1.3, R * 0.55, R);
    c.restore();
    rrect(c, -R * 1.0, -R * 0.64, R * 1.82, R * 0.22, 3);
    fillStroke(c, shade(p.main, -0.38), v.ol, 2.2);
    c.beginPath();
    c.moveTo(R * 0.5, -R * 0.6);
    c.quadraticCurveTo(R * 1.25, -R * 0.66, R * 1.45, -R * 0.42);
    c.quadraticCurveTo(R * 1.02, -R * 0.36, R * 0.5, -R * 0.44);
    c.closePath();
    fillStroke(c, shade(p.main, -0.3), v.ol, 2.4);
    // goggles pushed up on the crown
    c.beginPath();
    c.moveTo(-R * 0.92, -R * 0.78);
    c.quadraticCurveTo(-R * 0.2, -R * 1.18, R * 0.72, -R * 0.84);
    c.strokeStyle = v.ol;
    c.lineWidth = 5;
    c.stroke();
    c.strokeStyle = shade(p.second, -0.4);
    c.lineWidth = 2.6;
    c.stroke();
    for (const [gx, gy, gr] of [
      [-R * 0.12, -R * 1.0, R * 0.25],
      [R * 0.36, -R * 0.96, R * 0.22],
    ]) {
      circle(c, gx, gy, gr, BRASS, v.ol, 2.2);
      circle(c, gx, gy, gr * 0.68, rgba(p.accent, 0.9), null, 0);
      circle(c, gx - gr * 0.25, gy - gr * 0.25, gr * 0.22, 'rgba(255,255,255,0.85)', null, 0);
    }
    // hourglass badge on the band
    circle(c, R * 0.52, -R * 0.53, 4.6, BRASS, v.ol, 1.8);
    c.fillStyle = p.accent;
    c.beginPath();
    c.moveTo(R * 0.52 - 2.2, -R * 0.53 - 2.4);
    c.lineTo(R * 0.52 + 2.2, -R * 0.53 - 2.4);
    c.lineTo(R * 0.52 - 2.2, -R * 0.53 + 2.4);
    c.lineTo(R * 0.52 + 2.2, -R * 0.53 + 2.4);
    c.closePath();
    c.fill();
  },
  foot: (c, v, front) => {
    const k = v.k;
    const pt = front ? k.footF : k.footB;
    const phi = front ? k.ang.shF : k.ang.shB;
    boneFrame(c, v, pt, phi - 180);
    const col = front ? v.p.second : shade(v.p.second, -0.22);
    // tall courier boots with a glowing chrono-stripe
    rrect(c, -7.5, -25, 15, 24, 4);
    fillStroke(c, col, v.ol, 2.6);
    rrect(c, -9, -28, 18, 6, 3);
    fillStroke(c, shade(col, -0.14), v.ol, 2.2);
    shoe(c, 23, 12, col, front ? v.p.accent : shade(v.p.accent, -0.3), v.ol, 2.8);
    c.fillStyle = front ? v.p.accent : shade(v.p.accent, -0.3);
    c.fillRect(-6, -17, 12, 3);
    c.restore();
  },
  weapon: (c, v) => {
    // the pocket watch on its chain, swung by the smashes
    const f = v.f;
    const id = moveId(f);
    if (!swingsWatch(id)) return;
    const k = v.k;
    const s = k.scale;
    const hx = k.handF[0];
    const hy = k.handF[1];
    const wx = k.wep[0];
    const wy = k.wep[1];
    const m = FIGHTERS[f.def].moves[f.mv];
    const act = m.hits?.some((h) => f.mf >= h.f[0] && f.mf <= h.f[1]) ?? false;
    const charging = m.charge !== undefined && f.mf === m.charge && f.chargeHold;
    if (act || (f.mf > 12 && f.mf < 18 && id === 'fsmash')) {
      // a swoosh around the shoulder, trailing the swing
      const sx = k.shoulder[0];
      const sy = k.shoulder[1];
      const rr = Math.sqrt((wx - sx) ** 2 + (wy - sy) ** 2);
      const a = Math.atan2(wy - sy, wx - sx);
      const span = id === 'fsmash' ? 1.9 : 1.2;
      const fwd = k.facing * k.grav > 0;
      // tapered: thick right behind the watch, thin at the far end
      c.save();
      c.lineCap = 'round';
      for (const [k2, wd, col] of [
        [1, 7, rgba(v.p.accent, 0.35)],
        [0.62, 14, rgba(v.p.accent, 0.5)],
        [0.3, 22, rgba(v.p.accent, 0.6)],
        [0.62, 4, rgba('#ffffff', 0.75)],
      ] as const) {
        c.strokeStyle = col;
        c.lineWidth = wd * s;
        c.beginPath();
        if (fwd) c.arc(sx, sy, rr, a - span * k2, a);
        else c.arc(sx, sy, rr, a, a + span * k2);
        c.stroke();
      }
      c.restore();
    }
    chain(c, [hx, hy], [wx, wy], v.ol);
    const glow = charging ? (v.t % 8 < 4 ? '#ffffff' : v.p.accent) : act ? v.p.accent : null;
    pocketWatch(c, wx, wy, 13 * s, hx - wx, hy - wy, v.t, v.ol, glow);
  },
  front: (c, v) => {
    const f = v.f;
    const k = v.k;
    const s = k.scale;
    const g = k.grav;
    const id = moveId(f);
    // the watch held up in her hand (Rewind, Paradox, taunt)
    if (holdsWatch(v)) {
      const hx = k.handF[0] + k.facing * 4 * s;
      const hy = k.handF[1] - 6 * g * s;
      const big = id === 'ult' ? 1.5 : 1;
      pocketWatch(c, hx, hy, 9 * s * big, 0, 10 * g, id === 'dspec' ? -v.t * 3 : v.t, v.ol, id === 'ult' || id === 'dspec' ? v.p.accent : null);
    }
    // Rewind: a dial around her whose hands race backwards
    if (id === 'dspec' && f.mf <= 16) {
      const [cx, cy] = [k.hip[0], k.hip[1] - 14 * g * s];
      const q = f.mf / 16;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = rgba(v.p.accent, 0.6 * (1 - q * 0.6));
      c.lineWidth = 5;
      c.beginPath();
      c.arc(cx, cy, 66 * s, 0, TAU);
      c.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        c.beginPath();
        c.moveTo(cx + Math.sin(a) * 56 * s, cy - Math.cos(a) * 56 * s);
        c.lineTo(cx + Math.sin(a) * 66 * s, cy - Math.cos(a) * 66 * s);
        c.lineWidth = i % 3 ? 2 : 5;
        c.stroke();
      }
      hand(c, cx, cy, -f.mf * 0.9, 58 * s, 5, rgba('#ffffff', 0.8));
      hand(c, cx, cy, -f.mf * 0.25, 38 * s, 7, rgba(v.p.accent, 0.8));
      c.restore();
    }
    // Loop: a counter-clockwise ring of time around her as she spirals up
    if (id === 'uspec' && f.mf >= 5 && f.mf <= 34) {
      const cx = (k.hip[0] + k.neck[0]) / 2;
      const cy = (k.hip[1] + k.neck[1]) / 2;
      const a0 = -f.mf * 0.38;
      const al = Math.min(1, (f.mf - 4) / 4, (35 - f.mf) / 6);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.lineCap = 'round';
      c.strokeStyle = rgba(v.p.accent, 0.65 * al);
      c.lineWidth = 9;
      c.beginPath();
      c.arc(cx, cy, 58 * s, a0, a0 + 4.9);
      c.stroke();
      // arrowhead (pointing counter-clockwise)
      const ax = cx + Math.cos(a0) * 58 * s;
      const ay = cy + Math.sin(a0) * 58 * s;
      c.fillStyle = rgba('#ffffff', 0.85 * al);
      c.beginPath();
      c.moveTo(ax + Math.sin(a0) * 14, ay - Math.cos(a0) * 14);
      c.lineTo(ax + Math.cos(a0) * 10, ay + Math.sin(a0) * 10);
      c.lineTo(ax - Math.cos(a0) * 10, ay - Math.sin(a0) * 10);
      c.closePath();
      c.fill();
      for (let i = 0; i < 12; i++) {
        const a = a0 + (i / 12) * TAU;
        circle(c, cx + Math.cos(a) * 72 * s, cy + Math.sin(a) * 72 * s, i % 3 ? 2.5 : 4.5, rgba(v.p.accent, 0.7 * al), null, 0);
      }
      c.restore();
    }
    // Alarm Bell: a giant alarm clock rung overhead
    if (id === 'usmash' && f.mf >= 4 && f.mf <= 24) {
      const x = (k.handF[0] + k.handB[0]) / 2;
      const y = Math.min(k.handF[1], k.handB[1]) * (g > 0 ? 1 : 0) + Math.max(k.handF[1], k.handB[1]) * (g > 0 ? 0 : 1) - 24 * g * s;
      const ring = f.mf >= 9 && f.mf <= 16;
      const charging = f.mf === 6 && f.chargeHold;
      const jit = ring ? Math.sin(v.t * 2.6) * 3 : charging ? Math.sin(v.t * 1.4) * 1.5 : 0;
      const sz = 25 * s;
      if (ring) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const q = ((f.mf - 9 + i * 2.3) % 7) / 7;
          c.strokeStyle = rgba('#ffe14f', 0.7 * (1 - q));
          c.lineWidth = 6;
          c.beginPath();
          c.arc(x, y, sz * (1.4 + q * 2.2), Math.PI * 1.05, Math.PI * 1.95);
          c.stroke();
        }
        c.restore();
      }
      c.save();
      c.translate(x + jit, y);
      if (g < 0) c.scale(1, -1);
      for (const sx of [-1, 1]) {
        c.beginPath();
        c.arc(sx * sz * 0.62, -sz * 0.92, sz * 0.46, Math.PI, 0);
        c.closePath();
        fillStroke(c, BRASS, v.ol, 2.6);
      }
      const hx = ring ? Math.sin(v.t * 3.1) * sz * 0.3 : 0;
      c.beginPath();
      c.moveTo(0, -sz);
      c.lineTo(hx, -sz * 1.5);
      c.strokeStyle = v.ol;
      c.lineWidth = 3;
      c.stroke();
      circle(c, hx, -sz * 1.52, sz * 0.16, BRASS_D, v.ol, 2);
      clock(c, 0, 0, sz, BRASS, CREAM, v.ol, 0, ring ? v.t * 0.6 : 0.4);
      c.restore();
    }
    // taunt: a kiss, on the second
    if (f.act === A.TAUNT && f.af >= 42) {
      const q = (f.af - 42) / 18;
      heart(c, k.handF[0] + k.facing * (8 + q * 60) * s, k.handF[1] - (4 + q * 28) * g * s, (7 + q * 5) * s, '#ff6fb5', v.ol);
    }
    // Rewind's receipt: how much damage she un-took
    const since = f.v ? f.v[1] : 0;
    if (since > 0 && since < 70 && f.v[6] > 0) {
      const a = Math.min(1, (70 - since) / 20);
      const y = f.y - (H * s + 122 + since * 0.6) * g;
      outlinedText(c, 'REWIND', f.x, y - 26 * g, 18, '#ffffff', a);
      outlinedText(c, `−${Math.round(f.v[6])}%`, f.x, y, 34, v.p.accent, a);
    }
    // the Rewind cooldown clock over her head
    const cd = f.v ? f.v[0] : 0;
    if (cd > 0 && f.act !== A.DEAD) {
      const x = f.x;
      const y = f.y - (H * s + 70) * g;
      const r = 15;
      const q = 1 - cd / ECHO_COOLDOWN;
      c.save();
      for (const sx of [-1, 1]) {
        c.beginPath();
        c.arc(x + sx * 9, y - 13, 6, Math.PI, 0);
        c.closePath();
        fillStroke(c, BRASS, v.ol, 2);
      }
      circle(c, x, y, r, BRASS, v.ol, 2.6);
      circle(c, x, y, r * 0.78, CREAM, null, 0);
      c.beginPath();
      c.moveTo(x, y);
      c.arc(x, y, r * 0.78, -Math.PI / 2, -Math.PI / 2 + TAU * q);
      c.closePath();
      c.fillStyle = rgba(v.p.accent, 0.85);
      c.fill();
      hand(c, x, y, TAU * q, r * 0.62, 2.2, '#2a1a1a');
      circle(c, x, y, 1.8, '#2a1a1a', null, 0);
      c.restore();
    }
  },
};
