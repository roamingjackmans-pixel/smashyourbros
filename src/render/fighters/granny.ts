// Granny Grapple: luchador mask with gold-rimmed glasses, a silver bun skewered with knitting needles, an open
// cardigan over a wrestling singlet, a championship belt, knee-high lace-up boots and a trusty rolling pin.
import { A } from '../../sim/acts';
import { FIGHTERS } from '../../sim/data';
import { evalKeys } from '../../sim/poses';
import { worldSkel } from '../../sim/rig';
import type { Proj } from '../../sim/types';
import { boneFrame, circle, ellipse, eyes, fillStroke, rgba, rrect, shade, shoe, type ArtDef, type FView } from '../art';
import { registerProjDraw } from '../things';

const G = 23;
const L = 40;
const R = 22;
const PIN = 34;
const LIP = '#d8204a';
const WOOD = '#e2b27a';

function moveId(v: FView): string {
  return v.f.act === A.MOVE ? FIGHTERS[v.f.def].moveIds[v.f.mv] : '';
}

function bigText(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, fill: string, rot = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.font = `900 ${size}px Bungee, Impact, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = size * 0.22;
  c.strokeStyle = '#1b0f24';
  c.strokeText(s, 0, 0);
  c.fillStyle = fill;
  c.fillText(s, 0, 0);
  c.restore();
}

/** a soft smear that follows the pin (or fists) through the active frames of a swing */
function smear(c: CanvasRenderingContext2D, v: FView): void {
  const f = v.f;
  if (f.act !== A.MOVE) return;
  const cf = FIGHTERS[f.def];
  const m = cf.moves[f.mv];
  if (!m.hits) return;
  let on = false;
  for (const h of m.hits) if ((h.at === 'wep' || h.at === 'wepMid') && !h.grab && f.mf >= h.f[0] - 1 && f.mf <= h.f[1] + 2) on = true;
  if (!on) return;
  const outer: [number, number][] = [];
  const inner: [number, number][] = [];
  for (let d = 4; d >= 0; d -= 0.5) {
    const sk = d === 0 ? v.k : worldSkel(cf.def.rig, evalKeys(m.anim, Math.max(0, f.mf - d), cf.def.poses), f.x, f.y, f.facing, f.grav, v.k.scale, f.gnd >= 0);
    outer.push(sk.wep);
    inner.push(sk.handF);
  }
  c.save();
  c.beginPath();
  c.moveTo(outer[0][0], outer[0][1]);
  for (const p of outer) c.lineTo(p[0], p[1]);
  for (let i = inner.length - 1; i >= 0; i--) c.lineTo(inner[i][0], inner[i][1]);
  c.closePath();
  c.fillStyle = 'rgba(255,240,210,0.38)';
  c.fill();
  c.restore();
}

function rollingPin(c: CanvasRenderingContext2D, v: FView): void {
  // near handle in the fist, barrel, far handle
  rrect(c, -3.2, -9, 6.4, 16, 3);
  fillStroke(c, shade(WOOD, -0.3), v.ol, 2.2);
  rrect(c, -7, -PIN + 6, 14, PIN - 14, 5);
  fillStroke(c, WOOD, v.ol, 2.8);
  c.fillStyle = shade(WOOD, -0.18);
  c.fillRect(2, -PIN + 8, 3.5, PIN - 18);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fillRect(-4.5, -PIN + 9, 2.2, PIN - 20);
  rrect(c, -3, -PIN - 3, 6, 10, 3);
  fillStroke(c, shade(WOOD, -0.3), v.ol, 2.2);
}

function teacup(c: CanvasRenderingContext2D, ol: string, x: number, y: number, s: number, col: string): void {
  c.beginPath();
  c.moveTo(x - 8 * s, y - 6 * s);
  c.lineTo(x + 8 * s, y - 6 * s);
  c.quadraticCurveTo(x + 7 * s, y + 6 * s, x, y + 6 * s);
  c.quadraticCurveTo(x - 7 * s, y + 6 * s, x - 8 * s, y - 6 * s);
  c.closePath();
  fillStroke(c, '#ffffff', ol, 2.2);
  c.beginPath();
  c.arc(x + 9 * s, y - 1 * s, 3.5 * s, -1.4, 1.4);
  c.strokeStyle = ol;
  c.lineWidth = 2;
  c.stroke();
  c.fillStyle = col;
  c.fillRect(x - 6 * s, y - 2 * s, 12 * s, 2 * s);
  ellipse(c, x, y + 7 * s, 11 * s, 2.5 * s, 0, '#ffffff', ol, 2);
}

function teapot(c: CanvasRenderingContext2D, v: FView, tilt: number): void {
  c.save();
  c.rotate(tilt);
  ellipse(c, 0, 0, 13, 11, 0, v.p.second, v.ol, 2.6);
  c.beginPath();
  c.moveTo(10, 2);
  c.quadraticCurveTo(20, 0, 23, -9);
  c.lineTo(19, -9);
  c.quadraticCurveTo(16, -3, 9, -3);
  c.closePath();
  fillStroke(c, v.p.second, v.ol, 2.2);
  c.beginPath();
  c.arc(-13, 0, 6, Math.PI * 0.5, Math.PI * 1.5);
  c.strokeStyle = v.ol;
  c.lineWidth = 3;
  c.stroke();
  ellipse(c, 0, -10, 7, 3, 0, shade(v.p.second, -0.15), v.ol, 2);
  circle(c, 0, -14, 2.5, v.p.accent, v.ol, 1.6);
  circle(c, -3, 2, 3, v.p.accent, null, 0);
  circle(c, 4, -2, 2, v.p.accent, null, 0);
  c.restore();
}

function turnbuckle(c: CanvasRenderingContext2D, v: FView, x: number, y: number, grow: number): void {
  const k = v.k;
  const h = 230 * grow * k.scale;
  const dir = -k.facing; // ropes run away from where she is diving
  c.save();
  c.strokeStyle = '#1b0f24';
  c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const yy = y - h * (0.42 + i * 0.22);
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(x, yy);
    c.lineTo(x + dir * 260, yy + 30);
    c.stroke();
    c.lineWidth = 5;
    c.strokeStyle = ['#ff3a5a', '#ffffff', '#3a6cff'][i];
    c.stroke();
    c.strokeStyle = '#1b0f24';
  }
  rrect(c, x - 9, y - h, 18, h, 4);
  fillStroke(c, '#c9d2e3', '#1b0f24', 3);
  for (let i = 0; i < 3; i++) {
    rrect(c, x - 14, y - h * (0.42 + i * 0.22) - 12, 28, 24, 7);
    fillStroke(c, ['#ff3a5a', '#ffffff', '#3a6cff'][i], '#1b0f24', 3);
  }
  c.restore();
}

function grannyMouth(c: CanvasRenderingContext2D, v: FView, x: number, y: number, w: number): void {
  const e = v.expr;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  if (e === 'hurt' || e === 'ko') {
    ellipse(c, x, y + 1, w * 0.3, w * 0.38, 0, '#5a1a2a', LIP, 3);
    return;
  }
  if (e === 'angry' || e === 'focus') {
    rrect(c, x - w * 0.45, y - w * 0.2, w * 0.9, w * 0.4, w * 0.15);
    c.fillStyle = '#fff';
    c.fill();
    c.strokeStyle = LIP;
    c.lineWidth = 3.2;
    c.stroke();
    c.beginPath();
    c.moveTo(x - w * 0.42, y);
    c.lineTo(x + w * 0.42, y);
    c.strokeStyle = v.ol;
    c.lineWidth = 1.2;
    c.stroke();
    // the famous gold tooth
    c.fillStyle = '#ffd23a';
    c.fillRect(x + w * 0.08, y - w * 0.18, w * 0.16, w * 0.17);
    return;
  }
  if (e === 'happy') {
    c.beginPath();
    c.moveTo(x - w * 0.5, y - w * 0.12);
    c.quadraticCurveTo(x, y + w * 0.75, x + w * 0.5, y - w * 0.12);
    c.closePath();
    c.fillStyle = '#fff';
    c.fill();
    c.strokeStyle = LIP;
    c.lineWidth = 3.2;
    c.stroke();
    return;
  }
  c.beginPath();
  c.moveTo(x - w * 0.45, y - w * 0.08);
  c.quadraticCurveTo(x, y + w * 0.5, x + w * 0.45, y - w * 0.08);
  c.strokeStyle = LIP;
  c.lineWidth = 4;
  c.stroke();
  c.strokeStyle = v.ol;
  c.lineWidth = 1.4;
  c.stroke();
}

export const grannyArt: ArtDef = {
  limb: 13,
  handR: 9.5,
  footL: 26,
  palettes: [
    { name: 'Bingo Night', main: '#e83a5a', second: '#7bc8a4', accent: '#ffd23a', skin: '#f0c3a0', extra: '#e6e6f0' },
    { name: 'Lavender Legend', main: '#8a55ff', second: '#f4c6e0', accent: '#fff17a', skin: '#c98c64', extra: '#ffffff' },
    { name: 'Tea Party', main: '#2fa37a', second: '#f4ead2', accent: '#e8604c', skin: '#8d5a3b', extra: '#d0d0d8' },
    { name: 'Hot Flash', main: '#ff7a2a', second: '#ffe14f', accent: '#3a2bff', skin: '#ffd9c2', extra: '#ff9ed8' },
    { name: 'Midnight Matriarch', main: '#2a3256', second: '#7a46b0', accent: '#ffcf3a', skin: '#6b3f2a', extra: '#bfc8ff' },
    { name: 'Seaside Nana', main: '#3ab8e8', second: '#ffffff', accent: '#ff6f6f', skin: '#e9b48a', extra: '#f0e6d0' },
    { name: 'Golden Years', main: '#ffcf3a', second: '#b33a3a', accent: '#2b2633', skin: '#f0c19b', extra: '#ffffff' },
    { name: 'Knit Wit', main: '#ff6fb5', second: '#6a8cff', accent: '#9dff7a', skin: '#a8704a', extra: '#b5a594' },
  ],
  upperArm: (p) => p.second,
  foreArm: (p) => p.skin,
  thigh: (p) => p.main,
  shin: (p) => p.accent,
  back: (c, v) => {
    const k = v.k;
    const id = moveId(v);
    // the turnbuckle for the ultimate
    if (v.f.v[2] === 1 && ((id === 'ultTea' && v.f.mf >= 44) || (id === 'ultDrop' && v.f.mf < 24))) {
      const grow = id === 'ultTea' ? Math.min(1, (v.f.mf - 44) / 8) : Math.max(0, 1 - v.f.mf / 24);
      turnbuckle(c, v, v.f.v[0], v.f.v[1], grow);
    }
    // cardigan tail behind
    boneFrame(c, v, k.hip, k.ang.torso);
    c.beginPath();
    c.moveTo(-G * 0.95, -L * 0.7);
    c.quadraticCurveTo(-G * 1.35, -L * 0.1, -G * 1.15 - Math.sin(v.t * 0.1) * 2, L * 0.42);
    c.lineTo(-G * 0.2, L * 0.38);
    c.lineTo(-G * 0.3, -L * 0.4);
    c.closePath();
    fillStroke(c, shade(v.p.second, -0.22), v.ol, 2.8);
    c.restore();
  },
  torso: (c, v) => {
    const k = v.k;
    const p = v.p;
    boneFrame(c, v, k.hip, k.ang.torso);
    // round, sturdy body in the singlet
    c.beginPath();
    c.moveTo(-G * 0.95, 8);
    c.quadraticCurveTo(-G * 1.25, -L * 0.6, -G * 0.72, -L * 1.03);
    c.lineTo(G * 0.6, -L * 1.03);
    c.quadraticCurveTo(G * 1.5, -L * 0.55, G * 1.02, 8);
    c.closePath();
    fillStroke(c, p.main, v.ol, 3.2);
    c.save();
    c.clip();
    // open cardigan: covers the back two thirds
    c.beginPath();
    c.moveTo(-G * 1.6, -L * 1.2);
    c.lineTo(G * 0.05, -L * 1.2);
    c.quadraticCurveTo(G * 0.45, -L * 0.5, G * 0.2, 12);
    c.lineTo(-G * 1.6, 12);
    c.closePath();
    c.fillStyle = p.second;
    c.fill();
    c.strokeStyle = v.ol;
    c.lineWidth = 2.6;
    c.stroke();
    c.fillStyle = shade(p.second, -0.18);
    c.fillRect(-G * 1.6, -L * 1.2, G * 0.85, L * 1.5);
    // knit ribbing
    c.strokeStyle = shade(p.second, -0.28);
    c.lineWidth = 1.3;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(-G * 0.7 + i * 7, -L * 0.95);
      c.lineTo(-G * 0.7 + i * 7, -L * 0.25);
      c.stroke();
    }
    c.restore();
    // buttons down the cardigan edge
    for (let i = 0; i < 3; i++) circle(c, G * 0.18 + i * 1.5, -L * 0.82 + i * L * 0.22, 2.6, p.accent, v.ol, 1.4);
    // championship belt
    rrect(c, -G * 1.0, -L * 0.2, G * 2.05, 9, 3);
    fillStroke(c, '#ffcf3a', v.ol, 2.4);
    ellipse(c, G * 0.55, -L * 0.2 + 4.5, 11, 8.5, 0, '#ffe98a', v.ol, 2.4);
    circle(c, G * 0.55, -L * 0.2 + 4.5, 5, p.main, v.ol, 1.6);
    c.fillStyle = '#ffffff';
    c.font = '900 7px Bungee, Impact, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('B', G * 0.55, -L * 0.2 + 5);
    // pearls
    for (let i = 0; i < 7; i++) {
      const a = 0.25 + i * 0.32;
      circle(c, G * 0.15 + Math.cos(a) * G * 0.55, -L * 1.0 + Math.sin(a) * 8, 2.4, '#fffaf0', v.ol, 1.2);
    }
    c.restore();
  },
  head: (c, v) => {
    const p = v.p;
    // silver bun skewered with knitting needles
    c.strokeStyle = v.ol;
    c.lineCap = 'round';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(-R * 1.25, -R * 1.35);
    c.lineTo(-R * 0.1, -R * 0.8);
    c.moveTo(-R * 1.15, -R * 0.65);
    c.lineTo(-R * 0.2, -R * 1.25);
    c.stroke();
    c.strokeStyle = p.accent;
    c.lineWidth = 2.6;
    c.stroke();
    circle(c, -R * 1.27, -R * 1.37, 3.2, p.main, v.ol, 1.6);
    circle(c, -R * 1.18, -R * 0.62, 3.2, p.main, v.ol, 1.6);
    circle(c, -R * 0.62, -R * 1.0, R * 0.46, p.extra ?? '#e6e6f0', v.ol, 2.8);
    c.beginPath();
    c.arc(-R * 0.62, -R * 1.0, R * 0.28, 2.4, 5.2);
    c.strokeStyle = shade(p.extra ?? '#e6e6f0', -0.25);
    c.lineWidth = 1.6;
    c.stroke();
    // the mask
    ellipse(c, 0, 0, R * 1.0, R * 1.05, 0, p.main, v.ol, 3.2);
    c.save();
    c.beginPath();
    c.ellipse(0, 0, R * 1.0, R * 1.05, 0, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = shade(p.main, -0.2);
    c.fillRect(-R * 1.1, -R * 1.2, R * 0.5, R * 2.4);
    // crown stripe
    c.beginPath();
    c.moveTo(-R * 1.1, -R * 0.35);
    c.quadraticCurveTo(-R * 0.3, -R * 1.2, R * 0.55, -R * 1.0);
    c.lineTo(R * 0.48, -R * 0.82);
    c.quadraticCurveTo(-R * 0.3, -R * 0.98, -R * 1.1, -R * 0.12);
    c.closePath();
    c.fillStyle = p.accent;
    c.fill();
    // flame trim around the eyes, licking back toward the laces
    c.beginPath();
    c.moveTo(R * 1.02, -R * 0.12);
    c.quadraticCurveTo(R * 0.8, -R * 0.62, R * 0.3, -R * 0.52);
    c.quadraticCurveTo(-R * 0.1, -R * 0.5, -R * 0.55, -R * 0.42);
    c.quadraticCurveTo(-R * 0.25, -R * 0.28, -R * 0.2, -R * 0.2);
    c.quadraticCurveTo(-R * 0.5, -R * 0.12, -R * 0.62, R * 0.02);
    c.quadraticCurveTo(-R * 0.2, R * 0.0, -R * 0.02, R * 0.1);
    c.quadraticCurveTo(R * 0.45, R * 0.26, R * 1.02, R * 0.08);
    c.closePath();
    c.fillStyle = p.accent;
    c.fill();
    c.strokeStyle = v.ol;
    c.lineWidth = 2;
    c.stroke();
    // open mouth area of the mask, with its own trim
    ellipse(c, R * 0.6, R * 0.64, R * 0.52, R * 0.38, -0.2, p.accent, v.ol, 2);
    ellipse(c, R * 0.62, R * 0.66, R * 0.42, R * 0.3, -0.2, p.skin, v.ol, 2);
    c.restore();
    // mask laces at the back
    c.strokeStyle = v.ol;
    c.lineWidth = 1.6;
    c.beginPath();
    for (let i = 0; i < 3; i++) {
      c.moveTo(-R * 0.95, -R * 0.05 + i * 6);
      c.lineTo(-R * 0.7, R * 0.05 + i * 6);
      c.moveTo(-R * 0.7, -R * 0.05 + i * 6);
      c.lineTo(-R * 0.95, R * 0.05 + i * 6);
    }
    c.stroke();
    eyes(c, v, R * 0.38, -R * 0.12, R * 0.24, '#3a2a6a', { gap: R * 0.52 });
    // gold-rimmed granny glasses
    c.strokeStyle = '#d9a52a';
    c.lineWidth = 2.2;
    for (const [x, rr] of [[R * 0.17, R * 0.27], [R * 0.69, R * 0.3]] as const) {
      c.beginPath();
      c.arc(x, -R * 0.12, rr, 0, Math.PI * 2);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(R * 0.43, -R * 0.14);
    c.lineTo(R * 0.4, -R * 0.14);
    c.moveTo(-R * 0.1, -R * 0.12);
    c.lineTo(-R * 0.6, -R * 0.2);
    c.stroke();
    grannyMouth(c, v, R * 0.6, R * 0.62, R * 0.42);
  },
  hand: (c, v, x, y, front) => {
    const k = v.k;
    const el = front ? k.elbowF : k.elbowB;
    // the sleeve is pushed up to the elbow: a chunky knit cuff
    circle(c, el[0], el[1], 8 * k.scale, front ? shade(v.p.second, 0.1) : shade(v.p.second, -0.15), v.ol, 2.4);
    const col = front ? v.p.skin : shade(v.p.skin, -0.18);
    circle(c, x, y, 9.5 * k.scale, col, v.ol, 2.6);
    circle(c, x - 3 * k.scale, y - 3 * k.scale, 3 * k.scale, shade(col, 0.35), null, 0);
    // taunt: knitting needles, then the finished scarf
    if (v.f.act === A.TAUNT && front) {
      const af = v.f.af;
      if (af < 26) {
        const s = k.scale;
        c.strokeStyle = v.p.accent;
        c.lineWidth = 2.6 * s;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + k.facing * 22 * s, y - 14 * s);
        c.moveTo(k.handB[0], k.handB[1]);
        c.lineTo(k.handB[0] + k.facing * 20 * s, k.handB[1] - 18 * s);
        c.stroke();
        rrect(c, x + k.facing * 4 * s - 7 * s, y + 2 * s, 14 * s, Math.min(26, af) * s, 3);
        fillStroke(c, v.p.main, v.ol, 2);
      } else {
        // WORLD'S BEST BRO
        const mid = (x + k.handB[0]) / 2;
        const half = Math.max(34 * k.scale, Math.abs(x - k.handB[0]) / 2 + 6);
        const x1 = mid - half;
        const x2 = mid + half;
        const yy = Math.min(y, k.handB[1]) - 26 * k.scale;
        rrect(c, x1, yy - 4, x2 - x1, 30 * k.scale, 4);
        fillStroke(c, v.p.main, v.ol, 2.4);
        c.fillStyle = v.p.accent;
        for (let i = 0; i < 4; i++) c.fillRect(x1 + 4 + i * ((x2 - x1 - 8) / 4), yy + 20 * k.scale, (x2 - x1 - 8) / 8, 5);
        bigText(c, 'BRO', (x1 + x2) / 2, yy + 9 * k.scale, 13 * k.scale, '#ffffff');
      }
    }
  },
  foot: (c, v, front) => {
    const k = v.k;
    boneFrame(c, v, front ? k.footF : k.footB, (front ? k.ang.shF : k.ang.shB) - 180);
    const col = front ? v.p.accent : shade(v.p.accent, -0.22);
    shoe(c, 26, 14, col, '#2b2633', v.ol, 2.8);
    // laces
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1.6;
    c.beginPath();
    for (let i = 0; i < 3; i++) {
      c.moveTo(2, -13 + i * 4);
      c.lineTo(7, -11 + i * 4);
    }
    c.stroke();
    c.restore();
  },
  weapon: (c, v) => {
    const k = v.k;
    const id = moveId(v);
    if (v.f.act === A.TAUNT) return;
    if ((id === 'nspec' || id === 'nspecAir') && v.f.mf >= 12 && v.f.mf < 26) return;
    smear(c, v);
    boneFrame(c, v, k.handF, k.ang.wep);
    rollingPin(c, v);
    c.restore();
  },
  front: (c, v) => {
    const k = v.k;
    const p = v.p;
    const id = moveId(v);
    const mf = v.f.mf;
    const s = k.scale;
    // BINGO!
    if ((id === 'dspec' && mf >= 12) || id === 'dspecLand') {
      const t = id === 'dspec' ? mf - 12 : mf;
      if (t < 30) {
        const pop = t < 6 ? 0.5 + t / 12 : 1;
        bigText(c, 'BINGO!', k.head[0], k.head[1] - 60 * s - t * 0.8, 30 * s * pop, p.accent, Math.sin(t * 0.5) * 0.08);
      }
    }
    // the shawl lariat: a whirl of cardigan around her
    if (id === 'uspec' && mf >= 4 && mf <= 30) {
      const cx = (k.hip[0] + k.neck[0]) / 2;
      const cy = (k.hip[1] + k.neck[1]) / 2;
      c.save();
      c.strokeStyle = rgba(p.second, 0.75);
      c.lineWidth = 8 * s;
      c.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a0 = mf * 0.9 + i * 2.1;
        c.beginPath();
        c.ellipse(cx, cy + (i - 1) * 16 * s, 62 * s, 16 * s, 0, a0, a0 + 1.6);
        c.stroke();
      }
      c.strokeStyle = 'rgba(255,255,255,0.8)';
      c.lineWidth = 3 * s;
      c.beginPath();
      c.ellipse(cx, cy, 70 * s, 20 * s, 0, mf * 0.9 + 3, mf * 0.9 + 4.2);
      c.stroke();
      c.restore();
    }
    // tea time
    if (id === 'ult' && (mf < 4 || mf > 26)) {
      teacup(c, v.ol, k.handB[0], k.handB[1] - 8 * s, s, '#b8743a');
      for (let i = 0; i < 2; i++) {
        const ph = (v.t * 0.08 + i) % 1;
        c.strokeStyle = `rgba(255,255,255,${0.7 * (1 - ph)})`;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(k.handB[0] + (i * 6 - 3) * s, k.handB[1] - 16 * s - ph * 20);
        c.quadraticCurveTo(k.handB[0] + (i * 6 + 3) * s, k.handB[1] - 22 * s - ph * 20, k.handB[0] + (i * 6 - 2) * s, k.handB[1] - 30 * s - ph * 20);
        c.stroke();
      }
    }
    if (id === 'ultTea' && mf >= 8 && mf < 48) {
      const vic = v.st.fighters[v.f.grabbing];
      boneFrame(c, v, k.handB, 0);
      teapot(c, v, 0.5 + Math.sin(mf * 0.2) * 0.1);
      c.restore();
      if (vic) {
        const cx = vic.x - k.facing * 4;
        const cy = vic.y - FIGHTERS[vic.def].height * 0.62;
        teacup(c, v.ol, cx, cy, s, '#b8743a');
        if (mf >= 14 && mf < 40) {
          const sx = k.handB[0] + k.facing * 22 * s;
          const sy = k.handB[1] - 8 * s;
          c.strokeStyle = 'rgba(184,116,58,0.9)';
          c.lineWidth = 4 * s;
          c.lineCap = 'round';
          c.beginPath();
          c.moveTo(sx, sy);
          c.quadraticCurveTo((sx + cx) / 2, Math.min(sy, cy) - 30 * s, cx, cy - 6 * s);
          c.stroke();
        }
        if (mf >= 30) bigText(c, 'TEA TIME!', (k.head[0] + cx) / 2, k.head[1] - 70 * s, 22 * s, '#ffffff');
      }
    }
  },
};

// ------------------------------------------------------------------ projectiles

function drawPin(c: CanvasRenderingContext2D, p: Proj, t: number): void {
  c.save();
  c.translate(p.x, p.y);
  c.rotate(p.age * 0.45 * (p.vx >= 0 ? 1 : -1));
  const ol = '#1b0f24';
  rrect(c, -22, -3.2, 8, 6.4, 3);
  fillStroke(c, shade(WOOD, -0.3), ol, 2.2);
  rrect(c, 14, -3.2, 8, 6.4, 3);
  fillStroke(c, shade(WOOD, -0.3), ol, 2.2);
  rrect(c, -15, -7, 30, 14, 5);
  fillStroke(c, WOOD, ol, 2.8);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fillRect(-12, -4.5, 24, 2.2);
  c.restore();
  void t;
}

const BINGO = 'BINGO';
registerProjDraw('pin', (c, p, r, t) => drawPin(c, p, t));
registerProjDraw('bingoball', (c, p, r) => {
  const n = (p.id * 37) % 75;
  const col = ['#3a7bff', '#e83a5a', '#ffffff', '#46b85a', '#ffcf3a'][Math.floor(n / 15)];
  circle(c, p.x, p.y, r, '#ffffff', '#1b0f24', 2.6);
  c.save();
  c.beginPath();
  c.arc(p.x, p.y, r, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = col === '#ffffff' ? '#ff9ed8' : col;
  c.fillRect(p.x - r, p.y - r * 0.45, r * 2, r * 0.9);
  c.restore();
  circle(c, p.x, p.y, r * 0.58, '#ffffff', '#1b0f24', 1.4);
  c.fillStyle = '#1b0f24';
  c.font = `900 ${r * 0.62}px Bungee, Impact, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(`${n + 1}`, p.x, p.y + 0.5);
  c.font = `900 ${r * 0.42}px Bungee, Impact, sans-serif`;
  c.fillStyle = '#ffffff';
  c.fillText(BINGO[Math.floor(n / 15)], p.x - r * 0.78, p.y);
});
