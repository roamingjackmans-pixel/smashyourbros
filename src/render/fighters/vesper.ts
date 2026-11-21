// Vesper: a sleek shadow cat in a wrapped ninja hood (tall ears poke through), a long moonlit scarf that streams
// behind, wrapped paws and shins, split-toe tabi, a striped tail with ribbon bands, and a tiny pink haiku notebook.
import { A } from '../../sim/acts';
import { FIGHTERS } from '../../sim/data';
import { boneFrame, circle, ellipse, fillStroke, rgba, rrect, shade, shoe, type ArtDef, type FView } from '../art';
import { registerProjDraw } from '../things';

const R = 19; // head radius
const G = 12; // girth
const TORSO = 32;
const WEP = 22; // kunai length

const KUNAI_MOVES = new Set(['fsmash', 'usmash', 'dspec', 'dspecHit', 'sspec', 'ult']);
const TWIN_MOVES = new Set(['fsmash', 'usmash', 'dspec', 'dspecHit']);
const CLAW_MOVES = new Set(['jab1', 'jab2', 'jab3', 'fair', 'grab', 'dashgrab', 'pummel']);

/** the fighter's base alpha before Vesper fades (set in back, used for effects in front) */
let baseA = 1;

function moveId(v: FView): string {
  return v.f.act === A.MOVE ? FIGHTERS[v.f.def].moveIds[v.f.mv] : '';
}

/** how visible Vesper is this frame (vanishing specials and the ultimate) */
function visibility(v: FView): number {
  const id = moveId(v);
  const m = v.f.mf;
  if (id === 'sspec') {
    if (m >= 7 && m <= 11) return v.f.v[0] === 1 ? 0.08 + (m - 7) * 0.12 : 0.3;
    if (m === 6) return 0.6;
  }
  if (id === 'uspec') {
    if (m >= 7 && m <= 23) return 0.06;
    if (m === 6 || m === 24) return 0.45;
  }
  if (id === 'dspecHit' && m <= 4) return 0.2 + m * 0.18;
  if (id === 'ult') {
    if (m >= 10 && m <= 54) return 0.08;
    if (m >= 8 && m < 10) return 0.5;
    if (m > 54 && m < 57) return 0.6;
  }
  return 1;
}

function smoke(c: CanvasRenderingContext2D, x: number, y: number, age: number, size: number, ol: string): void {
  if (age < 0 || age > 26) return;
  const t = age / 26;
  const a = 1 - t;
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2 + 0.4;
    const d = size * (0.25 + t * 0.9);
    const px = x + Math.cos(ang) * d;
    const py = y + Math.sin(ang) * d * 0.7 - t * size * 0.5;
    const r = size * (0.32 + t * 0.25) * (i % 2 ? 0.85 : 1);
    circle(c, px, py, r, rgba('#5b4f78', 0.75 * a), rgba(ol, 0.6 * a), 2.5);
    circle(c, px - r * 0.3, py - r * 0.3, r * 0.45, rgba('#9d92c2', 0.6 * a), null, 0);
  }
}

// ------------------------------------------------------------------ face

type EyeMode = 'cool' | 'fierce' | 'wide' | 'happy' | 'closed' | 'ko' | 'blink';

function catEye(c: CanvasRenderingContext2D, v: FView, x: number, y: number, rx: number, ry: number, mode: EyeMode, front: boolean): void {
  const ol = v.ol;
  const lid = shade(v.p.skin, -0.32);
  c.lineCap = 'round';
  if (mode === 'ko') {
    c.beginPath();
    c.moveTo(x - rx, y - ry * 0.7);
    c.lineTo(x + rx, y + ry * 0.7);
    c.moveTo(x + rx, y - ry * 0.7);
    c.lineTo(x - rx, y + ry * 0.7);
    c.strokeStyle = ol;
    c.lineWidth = 2.6;
    c.stroke();
    return;
  }
  if (mode === 'blink' || mode === 'closed') {
    c.beginPath();
    c.moveTo(x - rx * 1.05, y - (mode === 'closed' ? ry * 0.1 : 0));
    c.quadraticCurveTo(x, y + ry * 0.55, x + rx * 1.05, y - (mode === 'closed' ? ry * 0.1 : 0));
    c.strokeStyle = ol;
    c.lineWidth = 2.6;
    c.stroke();
    if (mode === 'closed') {
      // long lashes: very cool, very composed
      c.beginPath();
      c.moveTo(x + rx * 1.05, y - ry * 0.1);
      c.lineTo(x + rx * 1.45, y - ry * 0.45);
      c.lineWidth = 2;
      c.stroke();
    }
    return;
  }
  if (mode === 'happy') {
    c.beginPath();
    c.moveTo(x - rx, y + ry * 0.3);
    c.quadraticCurveTo(x, y - ry * 0.9, x + rx, y + ry * 0.3);
    c.strokeStyle = ol;
    c.lineWidth = 2.8;
    c.stroke();
    return;
  }
  if (mode === 'wide') {
    ellipse(c, x, y, rx * 1.05, ry * 1.08, 0, '#fffbea', ol, 2.2);
    circle(c, x + rx * 0.15, y, rx * 0.28, '#120a18', null, 0);
    return;
  }
  // iris with a slit pupil
  ellipse(c, x, y, rx, ry, 0, v.p.accent, ol, 2.2);
  ellipse(c, x + rx * 0.15, y + ry * 0.08, rx * (mode === 'fierce' ? 0.14 : 0.2), ry * 0.72, 0, '#120a18', null, 0);
  circle(c, x + rx * 0.45, y - ry * 0.32, rx * 0.22, '#ffffff', null, 0);
  // the heavy half-lid that makes everything look unimpressed
  const inner = front ? -1 : 1; // inner corner (toward the other eye)
  const lo = mode === 'fierce' ? y - ry * 0.05 : y - ry * 0.28;
  const hi = mode === 'fierce' ? y - ry * 0.62 : y - ry * 0.28;
  const yIn = lo;
  const yOut = hi;
  const xIn = x + inner * (rx + 2);
  const xOut = x - inner * (rx + 2);
  c.save();
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.clip();
  c.beginPath();
  c.moveTo(xOut, y - ry - 3);
  c.lineTo(xIn, y - ry - 3);
  c.lineTo(xIn, yIn);
  c.lineTo(xOut, yOut);
  c.closePath();
  c.fillStyle = lid;
  c.fill();
  c.restore();
  c.beginPath();
  c.moveTo(xOut, yOut);
  c.lineTo(xIn, yIn);
  c.strokeStyle = ol;
  c.lineWidth = 2.6;
  c.stroke();
}

function ear(c: CanvasRenderingContext2D, v: FView, x: number, tilt: number, col: string, front: boolean): void {
  const tw = v.t % 170 < 5 ? (front ? 3 : -2) : 0;
  c.beginPath();
  c.moveTo(x - 7.5, -R * 0.5);
  c.lineTo(x + tilt + tw, -R * 1.78);
  c.lineTo(x + 8, -R * 0.62);
  c.closePath();
  fillStroke(c, col, v.ol, 2.8);
  c.beginPath();
  c.moveTo(x - 3.5, -R * 0.66);
  c.lineTo(x + tilt * 0.85 + tw, -R * 1.5);
  c.lineTo(x + 4, -R * 0.72);
  c.closePath();
  c.fillStyle = front ? '#ff9cbc' : '#d97b9c';
  c.fill();
}

// ------------------------------------------------------------------ props

/** a kunai in a bone frame: grip at the origin, blade along -y */
function kunai(c: CanvasRenderingContext2D, ol: string, accent: string, len = WEP): void {
  c.beginPath();
  c.arc(0, 8, 3.2, 0, Math.PI * 2);
  c.strokeStyle = ol;
  c.lineWidth = 2.2;
  c.stroke();
  rrect(c, -2.2, -4, 4.4, 10, 1.5);
  fillStroke(c, '#3a2f4a', ol, 1.8);
  c.beginPath();
  c.moveTo(0, -len);
  c.lineTo(4.6, -len * 0.42);
  c.lineTo(0, -4);
  c.lineTo(-4.6, -len * 0.42);
  c.closePath();
  fillStroke(c, '#dfe6f2', ol, 2);
  c.beginPath();
  c.moveTo(0, -len + 2);
  c.lineTo(2.6, -len * 0.42);
  c.lineTo(0, -5);
  c.closePath();
  c.fillStyle = '#ffffff';
  c.fill();
  circle(c, 0, -len * 0.42, 1.4, accent, null, 0);
}

function notebook(c: CanvasRenderingContext2D, ol: string): void {
  rrect(c, -7, -9, 14, 18, 2.5);
  fillStroke(c, '#ff8fb8', ol, 2.2);
  c.fillStyle = '#fff4f8';
  c.fillRect(-4.5, -6.5, 9, 13);
  // tiny heart on the page
  c.beginPath();
  c.moveTo(0, 3);
  c.bezierCurveTo(-4, 0, -3, -4, 0, -2);
  c.bezierCurveTo(3, -4, 4, 0, 0, 3);
  c.fillStyle = '#ff4f8b';
  c.fill();
  for (let i = 0; i < 4; i++) circle(c, -7, -6 + i * 4, 1.2, ol, null, 0);
}

function heart(c: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, ol: string): void {
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.3, y, x - s * 0.9, y - s * 1.1, x, y - s * 0.45);
  c.bezierCurveTo(x + s * 0.9, y - s * 1.1, x + s * 1.3, y, x, y + s * 0.9);
  c.closePath();
  fillStroke(c, col, ol, 2.4);
}

// ------------------------------------------------------------------ scarf and tail (world space)

function scarf(c: CanvasRenderingContext2D, v: FView): void {
  const k = v.k;
  const f = v.f;
  const s = k.scale;
  const fc = k.facing;
  const g = k.grav;
  const n = k.neck;
  const speed = Math.min(1, Math.hypot(f.vx + f.kx, f.vy + f.ky) / 15);
  let dx = -fc * 1.0 - (f.vx + f.kx) * 0.07;
  let dy = (0.08 - (f.vy + f.ky) * 0.05) * g;
  const L = Math.hypot(dx, dy) || 1;
  dx /= L;
  dy /= L;
  const px = -dy;
  const py = dx;
  const tails: [number, number, number, string][] = [
    [5, 0.7, 2.3, shade(v.p.second, -0.25)],
    [8, 0, 0, v.p.second],
  ];
  for (const [segs, phase, drop, col] of tails) {
    const seg = 11 * s;
    const pts: [number, number][] = [[n[0] - fc * 2 * s, n[1] + 3 * s * g]];
    for (let i = 1; i <= segs; i++) {
      const w = Math.sin(v.t * (0.17 + speed * 0.22) - i * 0.85 + phase) * (1.2 + i * (0.9 + speed * 1.3)) * s;
      const droop = ((1 - speed) * i * i * 0.26 + drop * i) * s * g;
      pts.push([n[0] + dx * seg * i + px * w, n[1] + dy * seg * i + py * w + droop]);
    }
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < segs; i++) {
        const w = (9.5 - i * 0.65) * s;
        c.beginPath();
        c.moveTo(pts[i][0], pts[i][1]);
        c.lineTo(pts[i + 1][0], pts[i + 1][1]);
        c.strokeStyle = pass === 0 ? v.ol : i >= segs - 2 ? shade(col, 0.25) : col;
        c.lineWidth = pass === 0 ? w + 5.5 * s : w;
        c.stroke();
      }
    }
    // a little embroidered moon near the end of the long tail
    if (segs === 8) {
      const q = pts[6];
      circle(c, q[0], q[1], 2.6 * s, v.p.accent, null, 0);
      circle(c, q[0] + 1.2 * s, q[1] - 0.8 * s, 2.1 * s, shade(v.p.second, 0.25), null, 0);
    }
  }
}

function drawTail(c: CanvasRenderingContext2D, v: FView): void {
  const k = v.k;
  const s = k.scale;
  const a = k.hip;
  const b = k.tail;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const px = -dy / L;
  const py = dx / L;
  // bulges out behind, then the tip hooks over like a question mark
  const bend = -(0.34 + Math.sin(v.t * 0.07 + v.f.i) * 0.12) * L * k.facing * k.grav;
  const cx = (a[0] + b[0]) / 2 + px * bend;
  const cy = (a[1] + b[1]) / 2 + py * bend;
  // curl at the tip
  const ex = b[0] + (dx / L) * 7 * s - px * bend * 0.35;
  const ey = b[1] + (dy / L) * 7 * s - py * bend * 0.35;
  const fur = v.p.skin;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(a[0], a[1]);
  c.quadraticCurveTo(cx, cy, b[0], b[1]);
  c.quadraticCurveTo(b[0] + (dx / L) * 6 * s, b[1] + (dy / L) * 6 * s, ex, ey);
  c.strokeStyle = v.ol;
  c.lineWidth = 15 * s;
  c.stroke();
  c.strokeStyle = shade(fur, -0.12);
  c.lineWidth = 9 * s;
  c.stroke();
  // ribbon bands near the tip
  for (const t of [0.62, 0.78]) {
    const u = 1 - t;
    const qx = u * u * a[0] + 2 * u * t * cx + t * t * b[0];
    const qy = u * u * a[1] + 2 * u * t * cy + t * t * b[1];
    circle(c, qx, qy, 5.6 * s, v.p.accent, v.ol, 2.2 * s);
  }
  circle(c, ex, ey, 4.4 * s, shade(fur, 0.3), v.ol, 2 * s);
}

// ------------------------------------------------------------------ projectiles

registerProjDraw('kunai', (c, p, r, t, col) => {
  const ang = Math.atan2(p.vy, p.vx);
  c.save();
  c.translate(p.x, p.y);
  c.rotate(ang);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = 'rgba(190,210,255,0.28)';
  c.lineWidth = 7;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-46, 0);
  c.lineTo(-6, 0);
  c.stroke();
  c.restore();
  // ribbon tail in the thrower's colour
  c.beginPath();
  c.moveTo(-13, 0);
  for (let i = 1; i <= 6; i++) c.lineTo(-13 - i * 5, Math.sin(t * 0.7 + i * 1.1 + p.id) * i * 0.9);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = '#1b0f24';
  c.lineWidth = 6;
  c.stroke();
  c.strokeStyle = col.startsWith('#') ? col : '#ff4f8b';
  c.lineWidth = 3;
  c.stroke();
  c.rotate(Math.PI / 2);
  kunai(c, '#1b0f24', '#ffd23a', 20);
  c.restore();
  void r;
});

registerProjDraw('eclipse', (c, p, r, t) => {
  const fadeIn = Math.min(1, p.age / 10);
  const fadeOut = Math.min(1, (p.life - p.age) / 18);
  const a = Math.max(0, Math.min(fadeIn, fadeOut));
  c.save();
  c.fillStyle = `rgba(6,3,18,${0.8 * a})`;
  c.fillRect(p.x - 7000, p.y - 5000, 14000, 10000);
  // stars
  for (let i = 0; i < 40; i++) {
    const sx = p.x + (((i * 7919) % 2600) - 1300);
    const sy = p.y + (((i * 104729) % 1300) - 500);
    const tw = 0.5 + 0.5 * Math.sin(t * 0.15 + i);
    circle(c, sx, sy, 2 + (i % 3), `rgba(255,255,255,${0.7 * a * tw})`, null, 0);
  }
  // the moon gets swallowed, leaving a burning ring
  const mr = 125;
  const cover = p.age < 54 ? Math.min(1, p.age / 34) : Math.max(0, 1 - (p.age - 54) / 14);
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(p.x, p.y, mr * 0.8, p.x, p.y, mr * 2.1);
  g.addColorStop(0, `rgba(190,170,255,${0.55 * a * cover})`);
  g.addColorStop(0.4, `rgba(140,90,255,${0.25 * a * cover})`);
  g.addColorStop(1, 'rgba(60,20,120,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(p.x, p.y, mr * 2.1, 0, Math.PI * 2);
  c.fill();
  c.globalCompositeOperation = 'source-over';
  circle(c, p.x, p.y, mr, `rgba(246,240,255,${a})`, null, 0);
  circle(c, p.x - mr * 0.3, p.y - mr * 0.2, mr * 0.18, `rgba(215,205,240,${a})`, null, 0);
  circle(c, p.x + mr * 0.35, p.y + mr * 0.3, mr * 0.12, `rgba(215,205,240,${a})`, null, 0);
  circle(c, p.x + mr * 2.1 * (1 - cover), p.y - mr * 0.5 * (1 - cover), mr * 0.97, `rgba(10,5,24,${a})`, null, 0);
  c.restore();
  void r;
});

registerProjDraw('eclipseSlash', (c, p, r, t) => {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const period = Math.floor(p.age / 5);
  for (let k = 0; k < 3; k++) {
    const n = period - k;
    if (n < 0) continue;
    const ph = (p.age % 5) / 5 + k;
    const a = Math.max(0, 1 - ph / 2.2);
    const ang = ((n * 67 + p.id * 31) % 180) * (Math.PI / 180);
    const len = 120 + (n % 3) * 30;
    const ox = Math.cos(ang + Math.PI / 2) * ((n % 5) - 2) * 9;
    const oy = Math.sin(ang + Math.PI / 2) * ((n % 5) - 2) * 9;
    c.save();
    c.translate(p.x + ox, p.y + oy);
    c.rotate(ang);
    // crescent-shaped cut: violet glow, white-hot core
    c.beginPath();
    c.moveTo(-len, 0);
    c.quadraticCurveTo(0, -26, len, 0);
    c.quadraticCurveTo(0, -6, -len, 0);
    c.fillStyle = `rgba(150,100,255,${0.75 * a})`;
    c.fill();
    c.beginPath();
    c.moveTo(-len * 0.92, 0);
    c.quadraticCurveTo(0, -18, len * 0.92, 0);
    c.quadraticCurveTo(0, -11, -len * 0.92, 0);
    c.fillStyle = `rgba(255,255,255,${a})`;
    c.fill();
    c.restore();
  }
  // impact sparkle on each new cut
  if (p.age % 5 < 2) {
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + p.age;
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(p.x + Math.cos(ang) * 40, p.y + Math.sin(ang) * 40);
      c.strokeStyle = 'rgba(255,230,160,0.8)';
      c.lineWidth = 3;
      c.stroke();
    }
  }
  // a shadow-cat afterimage darting between cuts
  const sx = p.x + Math.cos(p.age * 1.7) * 70;
  const sy = p.y + Math.sin(p.age * 2.3) * 45;
  c.globalCompositeOperation = 'source-over';
  ellipse(c, sx, sy, 18, 8, p.age * 1.7, 'rgba(25,12,50,0.7)', null, 0);
  c.beginPath();
  c.moveTo(sx - 6, sy - 6);
  c.lineTo(sx - 3, sy - 16);
  c.lineTo(sx, sy - 6);
  c.moveTo(sx + 2, sy - 6);
  c.lineTo(sx + 6, sy - 15);
  c.lineTo(sx + 8, sy - 5);
  c.fillStyle = 'rgba(25,12,50,0.7)';
  c.fill();
  circle(c, sx + 3, sy - 2, 1.8, 'rgba(255,210,58,0.9)', null, 0);
  c.restore();
  void r;
  void t;
});

registerProjDraw('eclipseFinish', (c, p, r) => {
  const k = p.age / p.life;
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const ang of [-0.7, 0.7]) {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(ang);
    const len = 160 + k * 120;
    c.fillStyle = `rgba(190,140,255,${0.8 * (1 - k)})`;
    c.beginPath();
    c.moveTo(-len, 0);
    c.quadraticCurveTo(0, -16 * (1 - k) - 3, len, 0);
    c.quadraticCurveTo(0, 16 * (1 - k) + 3, -len, 0);
    c.fill();
    c.strokeStyle = `rgba(255,255,255,${1 - k})`;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(-len, 0);
    c.lineTo(len, 0);
    c.stroke();
    c.restore();
  }
  circle(c, p.x, p.y, r * (0.4 + k), `rgba(255,240,200,${0.5 * (1 - k)})`, null, 0);
  c.restore();
});

// ------------------------------------------------------------------ the art

export const vesperArt: ArtDef = {
  limb: 10,
  handR: 6.5,
  footL: 19,
  palettes: [
    { name: 'Midnight', main: '#2b2d5c', second: '#bfe6ff', accent: '#ffd23a', skin: '#6a6286', extra: '#e8e2f2' },
    { name: 'Moonbeam', main: '#d9dde8', second: '#4f63ff', accent: '#5fe8ff', skin: '#8e93a8', extra: '#3a3f5c' },
    { name: 'Sakura Dusk', main: '#ff8fb8', second: '#fff0f5', accent: '#3fd6a0', skin: '#f3d2bd', extra: '#7a3a5c' },
    { name: 'Neon Alley', main: '#1c1b26', second: '#39ff9c', accent: '#ff3af0', skin: '#4d4a5e', extra: '#39ff9c' },
    { name: 'Lantern Red', main: '#c8282e', second: '#ffd84a', accent: '#ffd84a', skin: '#f0a35e', extra: '#3a1a1a' },
    { name: 'Jade Mist', main: '#2f8f6f', second: '#d8fff0', accent: '#ffe07a', skin: '#7a6656', extra: '#1d3d33' },
    { name: 'Snowcat', main: '#f4f6ff', second: '#ff86b0', accent: '#3a7bff', skin: '#ffffff', extra: '#b8c4e0' },
    { name: 'Lavender Haiku', main: '#8a6ad8', second: '#ffe0f0', accent: '#ffcf3a', skin: '#c9b8e8', extra: '#4a3a7a' },
  ],
  upperArm: (p) => p.main,
  foreArm: (p) => p.extra ?? p.second,
  thigh: (p) => p.main,
  shin: (p) => p.extra ?? p.second,
  back: (c, v) => {
    // fade the whole body for the vanishing moves (drawFighter's save/restore contains this)
    baseA = c.globalAlpha;
    const vis = visibility(v);
    const id = moveId(v);
    const m = v.f.mf;
    // shadow streaks while stepping through the dark
    if (id === 'sspec' && m >= 7 && m <= 12) {
      c.save();
      c.globalAlpha = baseA * 0.55;
      const fc = v.k.facing;
      const h = v.k.hip;
      for (let i = 0; i < 4; i++) {
        const y = h[1] - 34 * v.k.scale + i * 16 * v.k.scale;
        const len = (90 + ((i * 37) % 50)) * v.k.scale;
        c.beginPath();
        c.moveTo(h[0], y);
        c.lineTo(h[0] - fc * len, y);
        c.strokeStyle = rgba('#3a2a66', 0.8);
        c.lineWidth = 7 * v.k.scale;
        c.lineCap = 'round';
        c.stroke();
      }
      c.restore();
    }
    c.globalAlpha = baseA * vis;
    scarf(c, v);
    // the back hand's kunai for two-blade moves
    if (TWIN_MOVES.has(id)) {
      boneFrame(c, v, v.k.handB, v.k.ang.foreB);
      kunai(c, v.ol, v.p.accent);
      c.restore();
    }
  },
  tail: (c, v) => drawTail(c, v),
  torso: (c, v) => {
    const p = v.p;
    const ol = v.ol;
    boneFrame(c, v, v.k.hip, v.k.ang.torso);
    const L = TORSO;
    const g = G;
    // the gi: slim chest, a little flare at the hips
    c.beginPath();
    c.moveTo(-g * 0.95, -L - g * 0.15);
    c.quadraticCurveTo(0, -L - g * 0.6, g * 0.95, -L - g * 0.15);
    c.lineTo(g * 1.02, -g * 0.15);
    c.quadraticCurveTo(g * 1.3, g * 0.5, g * 0.95, g * 0.72);
    c.lineTo(-g * 0.95, g * 0.72);
    c.quadraticCurveTo(-g * 1.3, g * 0.5, -g * 1.02, -g * 0.15);
    c.closePath();
    fillStroke(c, p.main, ol, 3);
    c.save();
    c.clip();
    c.fillStyle = shade(p.main, -0.22);
    c.fillRect(-g * 1.4, -L - g, g * 0.75, L + g * 2);
    // cross collar
    c.beginPath();
    c.moveTo(-g * 0.55, -L - g * 0.4);
    c.lineTo(g * 0.9, -L * 0.4);
    c.strokeStyle = shade(p.main, -0.42);
    c.lineWidth = 5;
    c.stroke();
    c.beginPath();
    c.moveTo(-g * 0.45, -L - g * 0.45);
    c.lineTo(g * 0.95, -L * 0.48);
    c.strokeStyle = p.extra ?? p.second;
    c.lineWidth = 2;
    c.stroke();
    c.restore();
    // the secret notebook, tucked into the sash at the back
    if (v.f.act !== A.TAUNT) {
      c.save();
      c.translate(-g * 0.85, -g * 0.2);
      c.rotate(-0.3);
      c.scale(0.55, 0.55);
      notebook(c, ol);
      c.restore();
    }
    // sash with a knot and tails
    rrect(c, -g * 1.1, -g * 0.55, g * 2.2, 8, 3);
    fillStroke(c, p.second, ol, 2.4);
    c.beginPath();
    c.moveTo(g * 0.55, -g * 0.1);
    c.quadraticCurveTo(g * 0.9 + Math.sin(v.t * 0.12) * 2, g * 0.6, g * 0.6, g * 1.05);
    c.moveTo(g * 0.75, -g * 0.1);
    c.quadraticCurveTo(g * 1.25 + Math.sin(v.t * 0.12 + 1) * 2, g * 0.45, g * 1.15, g * 0.9);
    c.strokeStyle = ol;
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.stroke();
    c.strokeStyle = p.second;
    c.lineWidth = 3;
    c.stroke();
    circle(c, g * 0.65, -g * 0.15, 4, shade(p.second, -0.1), ol, 2);
    // scarf wrapped around the neck
    ellipse(c, 1, -L - 1, g * 1.05, 6.5, 0, p.second, ol, 2.6);
    ellipse(c, 4, -L - 2, g * 0.5, 3, 0, shade(p.second, 0.3), null, 0);
    c.restore();
  },
  head: (c, v) => {
    const p = v.p;
    const ol = v.ol;
    const fur = p.skin;
    const id = moveId(v);
    // hood knot tails flutter off the back of the head
    for (const [yy, ph] of [[-0.42, 0], [-0.2, 1.3]] as [number, number][]) {
      c.beginPath();
      c.moveTo(-R * 0.8, R * yy);
      c.quadraticCurveTo(-R * 1.35, R * yy - 4 + Math.sin(v.t * 0.2 + ph) * 3, -R * 1.9, R * yy + 3 + Math.sin(v.t * 0.2 + ph + 1) * 5);
      c.strokeStyle = ol;
      c.lineWidth = 8;
      c.lineCap = 'round';
      c.stroke();
      c.strokeStyle = shade(p.main, -0.18);
      c.lineWidth = 4.5;
      c.stroke();
    }
    // ears poke out through slits in the hood
    ear(c, v, -R * 0.42, -4, shade(fur, -0.22), false);
    ear(c, v, R * 0.2, 2, fur, true);
    // hood with a face window
    circle(c, 0, 0, R, p.main, ol, 3);
    c.save();
    c.beginPath();
    c.arc(0, 0, R - 1.4, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = shade(p.main, -0.2);
    c.fillRect(-R, -R, R * 0.55, R * 2);
    ellipse(c, R * 0.48, R * 0.16, R * 0.68, R * 0.62, 0, fur, ol, 2.6);
    c.restore();
    circle(c, 0, 0, R, '', ol, 3);
    // moon crest on the hood
    circle(c, R * 0.02, -R * 0.68, 4.4, p.accent, ol, 1.6);
    circle(c, R * 0.02 + 2, -R * 0.68 - 1.2, 3.6, p.main, null, 0);
    // muzzle, nose and whiskers
    ellipse(c, R * 0.82, R * 0.38, R * 0.3, R * 0.23, 0, shade(fur, 0.42), ol, 2);
    c.beginPath();
    c.moveTo(R * 0.94, R * 0.18);
    c.lineTo(R * 1.12, R * 0.18);
    c.lineTo(R * 1.03, R * 0.3);
    c.closePath();
    fillStroke(c, '#ff8fae', ol, 1.6);
    c.beginPath();
    c.moveTo(R * 0.95, R * 0.36);
    c.lineTo(R * 1.55, R * 0.24);
    c.moveTo(R * 0.95, R * 0.44);
    c.lineTo(R * 1.52, R * 0.52);
    c.strokeStyle = rgba(ol, 0.85);
    c.lineWidth = 1.4;
    c.stroke();
    // expression
    let mode: EyeMode = 'cool';
    let mouthK: 'smirk' | 'fang' | 'grin' | 'o' | 'flat' = 'smirk';
    let blush = false;
    const e = v.expr;
    if (e === 'ko') {
      mode = 'ko';
      mouthK = 'o';
    } else if (e === 'hurt') {
      mode = 'wide';
      mouthK = 'o';
    } else if (e === 'happy') {
      mode = 'happy';
      mouthK = 'grin';
      blush = true;
    } else if (e === 'angry' || e === 'focus') {
      mode = 'fierce';
      mouthK = e === 'angry' ? 'fang' : 'flat';
    }
    if (id === 'ult' && v.f.mf >= 55) {
      mode = 'closed';
      mouthK = 'smirk';
      blush = true;
    }
    if (id === 'dspec') mode = 'fierce';
    if (v.blink && (mode === 'cool' || mode === 'fierce')) mode = 'blink';
    catEye(c, v, R * 0.2, -R * 0.02, R * 0.22, R * 0.28, mode, false);
    catEye(c, v, R * 0.7, -R * 0.02, R * 0.26, R * 0.32, mode, true);
    // glowing eyes during the counter stance
    if (id === 'dspec' && v.f.mf >= 5 && v.f.mf <= 24) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      circle(c, R * 0.7, -R * 0.02, R * 0.5, rgba(p.accent, 0.35), null, 0);
      circle(c, R * 0.2, -R * 0.02, R * 0.42, rgba(p.accent, 0.3), null, 0);
      c.restore();
    }
    if (blush) {
      ellipse(c, R * 0.52, R * 0.38, R * 0.17, R * 0.09, 0, 'rgba(255,110,150,0.6)', null, 0);
      c.beginPath();
      for (let i = 0; i < 3; i++) {
        c.moveTo(R * (0.42 + i * 0.1), R * 0.43);
        c.lineTo(R * (0.47 + i * 0.1), R * 0.33);
      }
      c.strokeStyle = 'rgba(214,60,110,0.8)';
      c.lineWidth = 1.2;
      c.stroke();
    }
    // the mouth: a little "w"
    const mx = R * 0.98;
    const my = R * 0.46;
    c.strokeStyle = ol;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = 1.8;
    c.beginPath();
    if (mouthK === 'smirk') {
      c.moveTo(mx - 6, my - 0.5);
      c.quadraticCurveTo(mx - 3, my + 3, mx, my);
      c.quadraticCurveTo(mx + 2.5, my + 2.5, mx + 5, my - 2.5);
      c.stroke();
    } else if (mouthK === 'grin') {
      c.moveTo(mx - 6, my - 1);
      c.quadraticCurveTo(mx - 3, my + 4, mx, my);
      c.quadraticCurveTo(mx + 3, my + 4, mx + 6, my - 1);
      c.stroke();
    } else if (mouthK === 'flat') {
      c.moveTo(mx - 5, my + 1);
      c.lineTo(mx + 4, my);
      c.stroke();
    } else if (mouthK === 'fang') {
      c.moveTo(mx - 6, my - 1);
      c.quadraticCurveTo(mx, my + 7, mx + 5, my - 1);
      c.closePath();
      c.fillStyle = '#5a1a2a';
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(mx - 3, my);
      c.lineTo(mx - 1.5, my + 3.5);
      c.lineTo(mx, my + 0.3);
      c.closePath();
      c.fillStyle = '#ffffff';
      c.fill();
    } else {
      ellipse(c, mx - 1, my + 1.5, 2.6, 3.4, 0, '#5a1a2a', ol, 1.6);
    }
  },
  hand: (c, v, x, y, front) => {
    const s = v.k.scale;
    const col = front ? v.p.skin : shade(v.p.skin, -0.22);
    circle(c, x, y, 6.6 * s, col, v.ol, 2.4 * s);
    circle(c, x - 2 * s, y - 2 * s, 2 * s, shade(col, 0.35), null, 0);
    const id = moveId(v);
    if (CLAW_MOVES.has(id)) {
      const e = front ? v.k.elbowF : v.k.elbowB;
      let dx = x - e[0];
      let dy = y - e[1];
      const L = Math.hypot(dx, dy) || 1;
      dx /= L;
      dy /= L;
      c.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        const bx = x + dx * 5 * s - dy * i * 3.4 * s;
        const by = y + dy * 5 * s + dx * i * 3.4 * s;
        c.beginPath();
        c.moveTo(bx, by);
        c.lineTo(bx + dx * 5.5 * s, by + dy * 5.5 * s);
        c.strokeStyle = v.ol;
        c.lineWidth = 3.6 * s;
        c.stroke();
        c.strokeStyle = '#ffffff';
        c.lineWidth = 1.6 * s;
        c.stroke();
      }
    }
  },
  foot: (c, v, front) => {
    const k = v.k;
    const pt = front ? k.footF : k.footB;
    const phi = front ? k.ang.shF : k.ang.shB;
    boneFrame(c, v, pt, phi - 180);
    const tabi = shade(v.p.main, -0.38);
    const col = front ? tabi : shade(tabi, -0.2);
    shoe(c, 19, 10, col, shade(col, -0.45), v.ol, 2.6);
    // split toe
    c.beginPath();
    c.moveTo(19 * 0.52, -8);
    c.lineTo(19 * 0.6, -0.5);
    c.strokeStyle = v.ol;
    c.lineWidth = 1.8;
    c.stroke();
    // ankle wrap
    rrect(c, -6, -13, 11, 4, 1.5);
    fillStroke(c, v.p.extra ?? v.p.second, v.ol, 1.6);
    c.restore();
  },
  weapon: (c, v) => {
    const id = moveId(v);
    const k = v.k;
    const m = v.f.mf;
    if ((id === 'nspec' || id === 'nspecAir') && m < 9) {
      // a fan of three kunai, ready to fly
      for (const off of [-24, 0, 24]) {
        boneFrame(c, v, k.handF, k.ang.wep + off);
        kunai(c, v.ol, v.p.accent);
        c.restore();
      }
      return;
    }
    if (KUNAI_MOVES.has(id) && !(id === 'sspec' && m < 11) && !(id === 'ult' && m >= 60)) {
      boneFrame(c, v, k.handF, k.ang.wep);
      kunai(c, v.ol, v.p.accent);
      c.restore();
    }
  },
  front: (c, v) => {
    const k = v.k;
    const s = k.scale;
    const ol = v.ol;
    // wraps on the front forearm
    const e = k.elbowF;
    const h = k.handF;
    const dx = h[0] - e[0];
    const dy = h[1] - e[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    c.strokeStyle = shade(v.p.extra ?? v.p.second, -0.3);
    c.lineWidth = 1.6 * s;
    c.lineCap = 'round';
    c.beginPath();
    for (const t of [0.3, 0.55]) {
      const px = e[0] + dx * t;
      const py = e[1] + dy * t;
      c.moveTo(px + nx * 4.5 * s - dx / L * 2 * s, py + ny * 4.5 * s - dy / L * 2 * s);
      c.lineTo(px - nx * 4.5 * s + dx / L * 2 * s, py - ny * 4.5 * s + dy / L * 2 * s);
    }
    c.stroke();
    // effects at full strength even while Vesper is faded
    c.globalAlpha = baseA;
    const id = moveId(v);
    const m = v.f.mf;
    const f = v.f;
    if (id === 'uspec') {
      smoke(c, f.v[3], f.v[4] - 40 * s, m - 5, 46 * s, ol);
      if (m >= 8 && m <= 26) {
        for (let i = 0; i < 3; i++) smoke(c, f.x, f.y + (20 + i * 26) * s * k.grav, 18 + i * 3, 18 * s, ol);
      }
    }
    if (id === 'sspec' && m >= 9) smoke(c, f.v[1], f.v[2] - 50 * s, m - 9, 34 * s, ol);
    if (id === 'sspec' && f.v[0] === 1 && m >= 9 && m <= 20) smoke(c, f.x, f.y - 50 * s, m - 9, 30 * s, ol);
    if (id === 'dspecHit') {
      smoke(c, f.v[1], f.v[2] - 50 * s, m - 1, 34 * s, ol);
      smoke(c, f.x, f.y - 50 * s, m - 1, 28 * s, ol);
    }
    if (id === 'ult' && m >= 54 && m <= 70) smoke(c, f.x, f.y - 50 * s, m - 54, 40 * s, ol);
    // the taunt: write a haiku, blush, hide the evidence
    if (f.act === A.TAUNT) {
      const af = f.af;
      if (af >= 5 && af < 51) {
        c.save();
        c.translate(k.handB[0], k.handB[1]);
        c.scale(k.facing * s, s);
        c.rotate(af >= 38 ? -0.15 : 0.35);
        notebook(c, ol);
        c.restore();
        if (af < 37) {
          // pencil
          c.save();
          c.translate(h[0], h[1]);
          c.scale(k.facing * s, s);
          c.rotate(0.6 + Math.sin(af * 0.9) * 0.25);
          rrect(c, -2, -14, 4, 14, 1.5);
          fillStroke(c, '#ffd23a', ol, 1.6);
          c.fillStyle = '#ff8fae';
          c.fillRect(-2, -16, 4, 3);
          c.restore();
        }
      }
      if (af >= 30 && af < 56) {
        const rise = (af - 30) * 1.2;
        heart(c, k.head[0] + 18 * k.facing * s, k.head[1] - (36 + rise) * s, 7 * s, '#ff5c8a', ol);
      }
    }
  },
};
