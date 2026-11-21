// Zippy: a red courier squirrel in a backwards cap and a zip-up courier jacket, a leather satchel on the hip and a
// huge fluffy tail with static crackling through it. Stored static (f.v[0]) makes him spark all over.
import { A } from '../../sim/acts';
import { FIGHTERS } from '../../sim/data';
import { evalKeys } from '../../sim/poses';
import { worldSkel } from '../../sim/rig';
import type { Proj } from '../../sim/types';
import { boneFrame, circle, ellipse, eyes, fillStroke, mouth, rgba, rrect, shade, shoe, type ArtDef, type FView } from '../art';
import { registerProjDraw } from '../things';

const G = 13;
const L = 28;
const R = 19;
const LEATHER = '#7a4a2a';

function moveId(v: FView): string {
  return v.f.act === A.MOVE ? FIGHTERS[v.f.def].moveIds[v.f.mv] : '';
}

function charged(v: FView): boolean {
  return v.f.v[0] >= 1;
}

/** a jagged bolt between two points (world), deterministic jitter from a seed */
function bolt(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, seed: number, w: number, col: string): void {
  const n = 7;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  c.beginPath();
  c.moveTo(x1, y1);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const j = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const off = ((j - Math.floor(j)) - 0.5) * len * 0.22;
    c.lineTo(x1 + dx * t + nx * off, y1 + dy * t + ny * off);
  }
  c.lineTo(x2, y2);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = rgba(col, 0.55);
  c.lineWidth = w * 2.6;
  c.stroke();
  c.strokeStyle = '#ffffff';
  c.lineWidth = w;
  c.stroke();
}

/** tail swoosh: where the tip was over the last few frames of a tail attack */
function tailTrail(c: CanvasRenderingContext2D, v: FView): void {
  const f = v.f;
  if (f.act !== A.MOVE) return;
  const cf = FIGHTERS[f.def];
  const m = cf.moves[f.mv];
  if (!m.hits) return;
  let on = false;
  for (const h of m.hits) if (h.at === 'tail' && f.mf >= h.f[0] - 1 && f.mf <= h.f[1] + 2) on = true;
  if (!on) return;
  const pts: [number, number][] = [];
  const base: [number, number][] = [];
  for (let d = 4; d >= 0; d -= 0.5) {
    const sk = d === 0 ? v.k : worldSkel(cf.def.rig, evalKeys(m.anim, Math.max(0, f.mf - d), cf.def.poses), f.x, f.y, f.facing, f.grav, v.k.scale, f.gnd >= 0);
    pts.push(sk.tail);
    base.push([sk.hip[0] + (sk.tail[0] - sk.hip[0]) * 0.4, sk.hip[1] + (sk.tail[1] - sk.hip[1]) * 0.4]);
  }
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts) c.lineTo(p[0], p[1]);
  for (let i = base.length - 1; i >= 0; i--) c.lineTo(base[i][0], base[i][1]);
  c.closePath();
  c.fillStyle = rgba(v.p.accent, 0.3);
  c.fill();
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts) c.lineTo(p[0], p[1]);
  c.strokeStyle = 'rgba(255,255,255,0.8)';
  c.lineWidth = 4 * v.k.scale;
  c.lineCap = 'round';
  c.stroke();
  c.restore();
}

function tailInFront(v: FView): boolean {
  const k = v.k;
  return (k.tail[0] - k.hip[0]) * k.facing > G * 1.6;
}

function satchel(c: CanvasRenderingContext2D, v: FView): void {
  const k = v.k;
  boneFrame(c, v, k.hip, k.ang.torso);
  const bounce = v.f.act === A.RUN ? Math.sin(v.t * 0.8) * 2 : 0;
  rrect(c, -G - 12, -L * 0.42 + bounce, 20, 18, 5);
  fillStroke(c, LEATHER, v.ol, 2.6);
  rrect(c, -G - 13, -L * 0.42 + bounce, 22, 9, 4);
  fillStroke(c, shade(LEATHER, 0.15), v.ol, 2.2);
  // lightning sticker
  c.beginPath();
  c.moveTo(-G - 1, -L * 0.42 + 10 + bounce);
  c.lineTo(-G - 6, -L * 0.42 + 15 + bounce);
  c.lineTo(-G - 2, -L * 0.42 + 15 + bounce);
  c.lineTo(-G - 6, -L * 0.42 + 20 + bounce);
  c.strokeStyle = v.p.accent;
  c.lineWidth = 2;
  c.stroke();
  c.restore();
}

function drawTail(c: CanvasRenderingContext2D, v: FView): void {
  const k = v.k;
  const p = v.p;
  tailTrail(c, v);
  boneFrame(c, v, k.hip, k.ang.tail);
  const sway = Math.sin(v.t * 0.15 + v.f.i) * 2;
  const fur = p.main;
  // the plume: thin at the root, big and fluffy, curling outward at the tip
  c.beginPath();
  c.moveTo(-3, 2);
  c.bezierCurveTo(-16, -10, -26 + sway, -30, -22 + sway, -48);
  c.bezierCurveTo(-20 + sway, -60, -4, -66, 6, -60);
  c.bezierCurveTo(14, -55, 13, -44, 5, -44);
  c.bezierCurveTo(12, -36, 14, -22, 9, -10);
  c.quadraticCurveTo(6, -2, 4, 3);
  c.closePath();
  if (charged(v) || moveId(v) === 'dspec' || moveId(v) === 'dspecAir') {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.shadowColor = p.accent;
    c.shadowBlur = 16;
    c.fillStyle = rgba(p.accent, 0.4);
    c.fill();
    c.restore();
  }
  fillStroke(c, fur, v.ol, 3);
  c.save();
  c.clip();
  // lighter fluffy core and fur tufts
  c.fillStyle = shade(fur, 0.25);
  c.beginPath();
  c.ellipse(-6 + sway * 0.5, -34, 9, 20, -0.2, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = shade(fur, -0.25);
  c.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.moveTo(-18 + i * 3, -16 - i * 9);
    c.quadraticCurveTo(-12 + i * 3, -20 - i * 9, -8 + i * 3, -16 - i * 9);
    c.stroke();
  }
  c.restore();
  // the curl at the tip
  c.beginPath();
  c.arc(2, -53, 5, Math.PI * 0.2, Math.PI * 1.6);
  c.strokeStyle = shade(fur, -0.3);
  c.lineWidth = 2;
  c.stroke();
  // static running through the fur
  const flick = Math.floor(v.t / 3);
  c.beginPath();
  c.moveTo(0, -4);
  for (let i = 1; i <= 6; i++) c.lineTo(((i + flick) % 2 ? -1 : 1) * (3 + (i % 3)) - 6, -4 - i * 8);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = rgba(p.accent, 0.5);
  c.lineWidth = charged(v) ? 6 : 4;
  c.stroke();
  c.strokeStyle = charged(v) ? '#ffffff' : p.accent;
  c.lineWidth = 1.8;
  c.stroke();
  c.restore();
}

function cap(c: CanvasRenderingContext2D, v: FView): void {
  const p = v.p;
  const col = p.extra ?? '#ff3a5a';
  // brim, worn backwards
  c.beginPath();
  c.moveTo(-R * 0.6, -R * 0.52);
  c.quadraticCurveTo(-R * 1.35, -R * 0.68, -R * 1.62, -R * 0.4);
  c.quadraticCurveTo(-R * 1.2, -R * 0.3, -R * 0.55, -R * 0.32);
  c.closePath();
  fillStroke(c, shade(col, -0.2), v.ol, 2.6);
  // dome
  c.beginPath();
  c.moveTo(-R * 0.92, -R * 0.38);
  c.quadraticCurveTo(-R * 0.9, -R * 1.18, R * 0.05, -R * 1.12);
  c.quadraticCurveTo(R * 0.75, -R * 1.05, R * 0.82, -R * 0.52);
  c.quadraticCurveTo(0, -R * 0.36, -R * 0.92, -R * 0.38);
  c.closePath();
  fillStroke(c, col, v.ol, 2.8);
  c.fillStyle = shade(col, 0.3);
  c.beginPath();
  c.ellipse(R * 0.25, -R * 0.92, R * 0.28, R * 0.09, -0.15, 0, Math.PI * 2);
  c.fill();
  // lightning emblem
  c.beginPath();
  c.moveTo(R * 0.05, -R * 1.0);
  c.lineTo(-R * 0.18, -R * 0.72);
  c.lineTo(-R * 0.02, -R * 0.72);
  c.lineTo(-R * 0.22, -R * 0.44);
  c.lineTo(R * 0.14, -R * 0.8);
  c.lineTo(-R * 0.02, -R * 0.8);
  c.closePath();
  fillStroke(c, p.accent, v.ol, 1.4);
  circle(c, -R * 0.1, -R * 1.13, 2.5, shade(col, -0.2), v.ol, 1.4);
}

function ear(c: CanvasRenderingContext2D, v: FView, x: number, back: boolean): void {
  const p = v.p;
  const col = back ? shade(p.main, -0.25) : p.main;
  c.beginPath();
  c.moveTo(x - R * 0.28, -R * 0.62);
  c.quadraticCurveTo(x - R * 0.2, -R * 1.45, x + R * 0.08, -R * 1.62);
  c.quadraticCurveTo(x + R * 0.3, -R * 1.2, x + R * 0.3, -R * 0.6);
  c.closePath();
  fillStroke(c, col, v.ol, 2.6);
  if (!back) {
    c.beginPath();
    c.moveTo(x - R * 0.12, -R * 0.72);
    c.quadraticCurveTo(x - R * 0.06, -R * 1.25, x + R * 0.06, -R * 1.36);
    c.quadraticCurveTo(x + R * 0.16, -R * 1.1, x + R * 0.16, -R * 0.72);
    c.closePath();
    c.fillStyle = shade(p.skin, -0.08);
    c.fill();
  }
  // ear tuft
  c.beginPath();
  c.moveTo(x + R * 0.08, -R * 1.62);
  c.lineTo(x - R * 0.02, -R * 1.92);
  c.moveTo(x + R * 0.08, -R * 1.62);
  c.lineTo(x + R * 0.2, -R * 1.9);
  c.strokeStyle = v.ol;
  c.lineWidth = 2.4;
  c.lineCap = 'round';
  c.stroke();
}

export const zippyArt: ArtDef = {
  limb: 9,
  handR: 6.5,
  footL: 22,
  palettes: [
    { name: 'Express Red', main: '#d9692a', second: '#2fb7c9', accent: '#7af0ff', skin: '#ffe3c2', extra: '#ff3a5a' },
    { name: 'Midnight Courier', main: '#5a4a6e', second: '#ff9a2a', accent: '#ffd36b', skin: '#e8d8f0', extra: '#2b2633' },
    { name: 'Grey Squirrel Gang', main: '#8a8f9a', second: '#e84a6a', accent: '#ff8af2', skin: '#f2efe6', extra: '#3a7bff' },
    { name: 'Chestnut Prime', main: '#8a4e2a', second: '#5ad17a', accent: '#c8ff6a', skin: '#f0d2a8', extra: '#ffcf3a' },
    { name: 'Neon Rush', main: '#ff5fa2', second: '#2b2633', accent: '#5affd2', skin: '#ffe0ef', extra: '#5affd2' },
    { name: 'Caramel Dash', main: '#c98a3a', second: '#3a5cc8', accent: '#ffb3f0', skin: '#fff2d6', extra: '#7a3aa8' },
    { name: 'Mint Chip', main: '#4fb894', second: '#6b3f2a', accent: '#e0ffb0', skin: '#f0fff6', extra: '#ff7ab5' },
    { name: 'Storm Cloud', main: '#4a4f6a', second: '#ffcf3a', accent: '#a8c8ff', skin: '#c8ccdc', extra: '#8a55ff' },
  ],
  upperArm: (p) => p.second,
  foreArm: (p) => p.main,
  thigh: (p) => p.main,
  shin: (p) => p.main,
  back: (c, v) => {
    const k = v.k;
    const id = moveId(v);
    const f = v.f;
    // ultimate: a lightning streak from the last zip
    if (id === 'ult' && f.mf - f.v[7] < 6 && f.mf - f.v[7] >= 0) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      bolt(c, f.v[5], f.v[6] - 46, f.x, f.y - 46, f.v[7] + f.i, 6, v.p.accent);
      c.restore();
    }
    // bolt dash: the trail he leaves behind
    if ((id === 'sspec' && f.mf >= 5 && f.mf <= 18) || (id === 'ult' && f.mf >= 6 && f.mf <= 78)) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const hx = k.hip[0];
      const hy = k.hip[1] - 14 * k.scale;
      for (let i = 0; i < 2; i++) bolt(c, hx - k.facing * (130 + i * 30) * k.scale, hy + (i - 0.5) * 18, hx, hy, Math.floor(v.t / 2) + i * 7, 3.5 - i, v.p.accent);
      c.restore();
    }
    satchel(c, v);
  },
  tail: (c, v) => {
    // a tail swung out in front is drawn over the body instead (see front)
    if (!tailInFront(v)) drawTail(c, v);
  },
  torso: (c, v) => {
    const k = v.k;
    const p = v.p;
    boneFrame(c, v, k.hip, k.ang.torso);
    // zip-up courier jacket
    rrect(c, -G, -L - 4, G * 2, L + 12, G * 0.9);
    fillStroke(c, p.second, v.ol, 3);
    c.save();
    c.clip();
    c.fillStyle = shade(p.second, -0.2);
    c.fillRect(-G - 2, -L - 6, G * 0.7, L + 20);
    // fluffy chest peeking out of the zip
    c.beginPath();
    c.ellipse(G * 0.75, -L * 0.62, G * 0.55, L * 0.36, 0.15, 0, Math.PI * 2);
    c.fillStyle = p.skin;
    c.fill();
    c.strokeStyle = v.ol;
    c.lineWidth = 2;
    c.stroke();
    // lightning stripe
    c.beginPath();
    c.moveTo(-G, -L * 0.25);
    c.lineTo(-G * 0.2, -L * 0.36);
    c.lineTo(-G * 0.35, -L * 0.22);
    c.lineTo(G * 0.5, -L * 0.32);
    c.strokeStyle = p.accent;
    c.lineWidth = 3.4;
    c.stroke();
    c.restore();
    // satchel strap
    c.beginPath();
    c.moveTo(-G * 0.85, -L * 0.2);
    c.lineTo(G * 0.6, -L * 0.98);
    c.strokeStyle = v.ol;
    c.lineWidth = 6;
    c.stroke();
    c.strokeStyle = LEATHER;
    c.lineWidth = 3.4;
    c.stroke();
    circle(c, G * 0.05, -L * 0.6, 2.4, '#d9c06a', v.ol, 1.2);
    // collar
    ellipse(c, 0, -L - 1, G * 0.8, 4, 0, shade(p.second, 0.15), v.ol, 2.2);
    c.restore();
  },
  head: (c, v) => {
    const p = v.p;
    ear(c, v, -R * 0.42, true);
    // cheek fluff
    c.beginPath();
    c.moveTo(-R * 0.6, R * 0.2);
    c.lineTo(-R * 1.05, R * 0.55);
    c.lineTo(-R * 0.55, R * 0.62);
    c.lineTo(-R * 0.75, R * 0.85);
    c.lineTo(-R * 0.2, R * 0.75);
    c.closePath();
    fillStroke(c, shade(p.main, 0.1), v.ol, 2.4);
    // head and snout
    ellipse(c, 0, 0, R * 0.96, R * 0.9, 0, p.main, v.ol, 3);
    ellipse(c, R * 0.72, R * 0.3, R * 0.5, R * 0.38, 0.12, p.skin, v.ol, 2.6);
    ellipse(c, -R * 0.4, R * 0.05, R * 0.3, R * 0.5, 0, shade(p.main, -0.12), null, 0);
    cap(c, v);
    ear(c, v, R * 0.05, false);
    // eye, brow
    eyes(c, v, R * 0.28, -R * 0.12, R * 0.3, '#1f1630', { gap: R * 0.62 });
    // nose
    ellipse(c, R * 1.17, R * 0.16, R * 0.13, R * 0.1, 0, '#2b1a2a', null, 0);
    circle(c, R * 1.14, R * 0.12, 1.4, '#ffffff', null, 0);
    // mouth with buck teeth
    const e = v.expr;
    mouth(c, v, R * 0.88, R * 0.48, R * 0.34, e === 'normal' ? 'smile' : undefined);
    if (e !== 'hurt' && e !== 'ko') {
      rrect(c, R * 0.84, R * 0.48, R * 0.2, R * 0.22, 1.5);
      fillStroke(c, '#ffffff', v.ol, 1.4);
      c.beginPath();
      c.moveTo(R * 0.94, R * 0.48);
      c.lineTo(R * 0.94, R * 0.7);
      c.strokeStyle = v.ol;
      c.lineWidth = 1;
      c.stroke();
    }
    // whiskers
    c.strokeStyle = rgba('#1b0f24', 0.7);
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(R * 0.85, R * 0.22);
    c.lineTo(R * 1.35, R * 0.05);
    c.moveTo(R * 0.88, R * 0.3);
    c.lineTo(R * 1.4, R * 0.32);
    c.stroke();
  },
  hand: (c, v, x, y, front) => {
    const k = v.k;
    const col = front ? v.p.main : shade(v.p.main, -0.2);
    circle(c, x, y, 6.5 * k.scale, col, v.ol, 2.4);
    circle(c, x + k.facing * 1.5 * k.scale, y - 1.5 * k.scale, 2.6 * k.scale, shade(v.p.skin, front ? 0 : -0.15), null, 0);
    // jacket cuff at the elbow
    const el = front ? k.elbowF : k.elbowB;
    circle(c, el[0], el[1], 5 * k.scale, front ? shade(v.p.second, 0.15) : shade(v.p.second, -0.1), v.ol, 2);
  },
  foot: (c, v, front) => {
    const k = v.k;
    boneFrame(c, v, front ? k.footF : k.footB, (front ? k.ang.shF : k.ang.shB) - 180);
    const col = front ? '#ffffff' : '#d9d4e8';
    shoe(c, 22, 11, col, '#2b2633', v.ol, 2.6);
    c.beginPath();
    c.moveTo(-4, -9);
    c.lineTo(2, -5);
    c.lineTo(-1, -5);
    c.lineTo(5, -1);
    c.strokeStyle = front ? v.p.second : shade(v.p.second, -0.2);
    c.lineWidth = 2.4;
    c.stroke();
    c.restore();
  },
  front: (c, v) => {
    const k = v.k;
    const p = v.p;
    const id = moveId(v);
    const s = k.scale;
    if (tailInFront(v)) drawTail(c, v);
    // stored static: little arcs dancing over him
    if (charged(v) || ((id === 'dspec' || id === 'dspecAir') && v.f.mf >= 6)) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const cx = (k.hip[0] + k.neck[0]) / 2;
      const cy = (k.hip[1] + k.neck[1]) / 2;
      const n = charged(v) ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const seed = Math.floor(v.t / 3) * 3 + i;
        const a = seed * 2.39996;
        const r1 = 18 * s;
        const r2 = (40 + (seed % 3) * 8) * s;
        bolt(c, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a + 0.5) * r2, cy + Math.sin(a + 0.5) * r2, seed, 1.6, p.accent);
      }
      c.restore();
    }
    // the static burst
    if ((id === 'dspecZap' || id === 'dspecZapAir') && v.f.mf >= 4 && v.f.mf <= 12) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const cx = k.hip[0];
      const cy = k.hip[1] - 26 * s;
      circle(c, cx, cy, 64 * s * (0.7 + (v.f.mf - 4) * 0.05), rgba(p.accent, 0.25), null, 0);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + v.f.mf * 0.3;
        bolt(c, cx, cy, cx + Math.cos(a) * 66 * s, cy + Math.sin(a) * 66 * s, i + v.f.mf, 2.2, p.accent);
      }
      c.restore();
    }
    // taunt: SIGN HERE
    if (v.f.act === A.TAUNT && v.f.af >= 4 && v.f.af <= 54) {
      c.save();
      c.translate(k.handF[0], k.handF[1]);
      c.scale(k.facing * s, s);
      c.rotate(-0.15);
      rrect(c, -2, -30, 34, 40, 4);
      fillStroke(c, '#c9a06a', v.ol, 2.6);
      rrect(c, 1, -25, 28, 32, 2);
      fillStroke(c, '#ffffff', v.ol, 1.6);
      rrect(c, 9, -33, 12, 6, 2);
      fillStroke(c, '#9aa3b5', v.ol, 1.6);
      c.scale(k.facing, 1);
      c.fillStyle = '#1b0f24';
      c.font = '900 6px Bungee, Impact, sans-serif';
      c.textAlign = 'center';
      c.fillText('SIGN', 15 * k.facing, -16);
      c.fillText('HERE', 15 * k.facing, -9);
      c.fillText('1 HUG', 15 * k.facing, -1);
      c.restore();
    }
  },
};

// ------------------------------------------------------------------ projectiles

registerProjDraw('acorn', (c, p, r) => {
  const ol = '#1b0f24';
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 1; i < 4; i++) circle(c, p.x - p.vx * i * 0.8, p.y - p.vy * i * 0.8, r * (1 - i * 0.2), 'rgba(255,220,160,0.18)', null, 0);
  c.restore();
  c.save();
  c.translate(p.x, p.y);
  c.rotate(p.age * 0.5 * (p.vx >= 0 ? 1 : -1));
  c.beginPath();
  c.moveTo(-r * 0.85, -r * 0.1);
  c.quadraticCurveTo(-r * 0.9, r * 0.9, 0, r * 1.15);
  c.quadraticCurveTo(r * 0.9, r * 0.9, r * 0.85, -r * 0.1);
  c.closePath();
  fillStroke(c, '#c9803a', ol, 2.4);
  ellipse(c, -r * 0.3, r * 0.3, r * 0.18, r * 0.35, 0.3, 'rgba(255,255,255,0.45)', null, 0);
  c.beginPath();
  c.ellipse(0, -r * 0.2, r, r * 0.55, 0, Math.PI, 0);
  c.closePath();
  fillStroke(c, '#7a4a2a', ol, 2.4);
  c.beginPath();
  c.moveTo(0, -r * 0.7);
  c.lineTo(r * 0.15, -r * 1.05);
  c.strokeStyle = ol;
  c.lineWidth = 2.4;
  c.stroke();
  c.restore();
});

registerProjDraw('thunder', (c, p, r) => {
  const a = Math.max(0, 1 - p.age / 12);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = a;
  circle(c, p.x, p.y, 56 + p.age * 5, 'rgba(160,240,255,0.35)', null, 0);
  bolt(c, p.x + 30, p.y - 900, p.x, p.y, p.id + p.age, 9, '#7af0ff');
  bolt(c, p.x - 40, p.y - 700, p.x, p.y, p.id * 3 + p.age, 4, '#7af0ff');
  circle(c, p.x, p.y, 32, 'rgba(255,255,255,0.8)', null, 0);
  void r;
  c.restore();
});
