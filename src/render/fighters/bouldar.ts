// Bouldar: a gentle rock golem. A huge boulder body with moss and glowing crystals, tiny head under a heavy brow with
// soft glowing eyes and a daisy growing on top, long stony arms ending in boulder fists, slab feet.
import { A } from '../../sim/acts';
import { FIGHTERS } from '../../sim/data';
import type { Proj } from '../../sim/types';
import { boneFrame, circle, ellipse, fillStroke, rgba, rrect, shade, type ArtDef, type FView } from '../art';
import { registerProjDraw } from '../things';

const G = 27;
const L = 50;
const R = 23;
const OL = '#1b0f24';

/** a closed blob through the given points (smoothed with quadratic curves through the midpoints) */
function blob(c: CanvasRenderingContext2D, pts: [number, number][]): void {
  const n = pts.length;
  c.beginPath();
  const m0: [number, number] = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
  c.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    c.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  c.closePath();
}

/** an irregular rock of radius r (seeded so each rock keeps its shape) */
function rockPts(r: number, seed: number, n = 8, squash = 1): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const j = Math.sin(seed * 91.7 + i * 47.3) * 0.5 + 0.5;
    const rr = r * (0.84 + j * 0.24);
    out.push([Math.cos(a) * rr, Math.sin(a) * rr * squash]);
  }
  return out;
}

function moveId(v: FView): string {
  return v.f.act === A.MOVE ? FIGHTERS[v.f.def].moveIds[v.f.mv] : '';
}

function armored(v: FView): boolean {
  if (v.f.act !== A.MOVE) return false;
  const m = FIGHTERS[v.f.def].moves[v.f.mv];
  return !!m.armor && v.f.mf >= m.armor[0] && v.f.mf <= m.armor[1];
}

function crystal(c: CanvasRenderingContext2D, x: number, y: number, h: number, w: number, tilt: number, col: string, ol: string): void {
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  c.beginPath();
  c.moveTo(-w, 0);
  c.lineTo(-w, -h * 0.75);
  c.lineTo(0, -h);
  c.lineTo(w, -h * 0.75);
  c.lineTo(w, 0);
  c.closePath();
  fillStroke(c, col, ol, 2.2);
  c.beginPath();
  c.moveTo(0, -h);
  c.lineTo(0, 0);
  c.strokeStyle = shade(col, 0.45);
  c.lineWidth = 1.6;
  c.stroke();
  c.fillStyle = shade(col, -0.2);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, -h);
  c.lineTo(w, -h * 0.75);
  c.lineTo(w, 0);
  c.closePath();
  c.fill();
  c.restore();
}

function daisy(c: CanvasRenderingContext2D, x: number, y: number, s: number, petal: string, t: number): void {
  const sway = Math.sin(t * 0.08) * 0.15;
  c.save();
  c.translate(x, y);
  c.rotate(sway);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(2 * s, -6 * s, 0, -12 * s);
  c.strokeStyle = '#3f8f3a';
  c.lineWidth = 2.4;
  c.stroke();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    ellipse(c, Math.cos(a) * 4.5 * s, -12 * s + Math.sin(a) * 4.5 * s, 3.6 * s, 2 * s, a, petal, OL, 1.2);
  }
  circle(c, 0, -12 * s, 2.8 * s, '#ffcf3a', OL, 1.2);
  c.restore();
}

function bird(c: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, flap: number): void {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  ellipse(c, 0, 0, 7, 5.5, 0, col, OL, 1.8);
  circle(c, 5, -4, 3.8, col, OL, 1.6);
  c.beginPath();
  c.moveTo(8.5, -4);
  c.lineTo(12, -3);
  c.lineTo(8.5, -2);
  c.closePath();
  c.fillStyle = '#ffb13a';
  c.fill();
  circle(c, 6, -4.6, 1, OL, null, 0);
  c.beginPath();
  c.moveTo(-2, -1);
  c.quadraticCurveTo(-6, -8 - flap * 4, -10, -3 - flap * 3);
  c.quadraticCurveTo(-6, 0, -2, 1);
  c.closePath();
  fillStroke(c, shade(col, -0.2), OL, 1.4);
  c.restore();
}

function eyesRock(c: CanvasRenderingContext2D, v: FView, glow: number): void {
  const e = v.expr;
  const col = v.p.accent;
  const ys = -R * 0.1;
  const xs = [R * 0.18, R * 0.62];
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const x of xs) circle(c, x, ys, R * 0.3 * (1 + glow * 0.4), rgba(col, 0.22 + glow * 0.25), null, 0);
  c.restore();
  c.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const x = xs[i];
    const s = i === 0 ? 0.85 : 1;
    if (v.blink || e === 'ko') {
      c.strokeStyle = col;
      c.lineWidth = 3;
      c.beginPath();
      if (e === 'ko') {
        c.moveTo(x - 3.5, ys - 3.5);
        c.lineTo(x + 3.5, ys + 3.5);
        c.moveTo(x + 3.5, ys - 3.5);
        c.lineTo(x - 3.5, ys + 3.5);
      } else {
        c.moveTo(x - 4, ys);
        c.lineTo(x + 4, ys);
      }
      c.stroke();
      continue;
    }
    if (e === 'happy') {
      c.strokeStyle = shade(col, 0.4);
      c.lineWidth = 3.2;
      c.beginPath();
      c.moveTo(x - 4.5, ys + 2);
      c.quadraticCurveTo(x, ys - 5, x + 4.5, ys + 2);
      c.stroke();
      continue;
    }
    if (e === 'hurt') {
      c.strokeStyle = shade(col, 0.4);
      c.lineWidth = 2.8;
      const d = i === 0 ? 1 : -1;
      c.beginPath();
      c.moveTo(x - 3.5 * d, ys - 3.5);
      c.lineTo(x + 3.5 * d, ys);
      c.lineTo(x - 3.5 * d, ys + 3.5);
      c.stroke();
      continue;
    }
    const h = (e === 'angry' || e === 'focus' ? 3.4 : 5) * s;
    ellipse(c, x, ys, 3.6 * s, h, 0, col, OL, 1.6);
    ellipse(c, x + 0.8, ys - 1, 1.6 * s, h * 0.45, 0, '#ffffff', null, 0);
  }
}

function rockFist(c: CanvasRenderingContext2D, v: FView, pt: [number, number], phi: number, front: boolean): void {
  boneFrame(c, v, pt, phi);
  const col = front ? v.p.main : shade(v.p.main, -0.22);
  blob(c, rockPts(15, front ? 3 : 7, 7).map(([x, y]) => [x, y - 4] as [number, number]));
  fillStroke(c, col, v.ol, 3);
  // knuckles
  for (let i = 0; i < 3; i++) circle(c, -7 + i * 7, -15, 3.6, shade(col, 0.12), v.ol, 1.6);
  c.strokeStyle = shade(col, -0.35);
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-8, 0);
  c.lineTo(-2, -5);
  c.lineTo(3, -2);
  c.stroke();
  c.restore();
}

export const bouldarArt: ArtDef = {
  limb: 21,
  handR: 15,
  footL: 32,
  palettes: [
    { name: 'Mountain Grey', main: '#8d8a94', second: '#6fbf4a', accent: '#7af0ff', skin: '#aaa6b2', extra: '#ffffff' },
    { name: 'Red Canyon', main: '#c0623e', second: '#e8c07a', accent: '#ffb13a', skin: '#d98a62', extra: '#ff7ab5' },
    { name: 'Basalt Buddy', main: '#3f3a4a', second: '#ff6a2a', accent: '#ff9a3a', skin: '#5a5468', extra: '#ffe14f' },
    { name: 'Sandstone Sweetie', main: '#dcbc86', second: '#8fd17a', accent: '#ff7af2', skin: '#efd6a6', extra: '#ff6fb5' },
    { name: 'Jade Giant', main: '#4a9a7a', second: '#2f5d3a', accent: '#c8ff7a', skin: '#6ab896', extra: '#fff6a0' },
    { name: 'Snowcap', main: '#c3d0e4', second: '#ffffff', accent: '#5a9cff', skin: '#dfe8f5', extra: '#7fb8ff' },
    { name: 'Amethyst Geode', main: '#6a4a8a', second: '#b47aff', accent: '#ff9ef0', skin: '#8a6aa8', extra: '#ffe14f' },
    { name: 'Gold Nugget', main: '#d4a83a', second: '#7a5a2a', accent: '#fffbe0', skin: '#e8c460', extra: '#ff3a6e' },
  ],
  upperArm: (p) => p.main,
  foreArm: (p) => shade(p.main, 0.06),
  thigh: (p) => shade(p.main, -0.08),
  shin: (p) => p.main,
  back: (c, v) => {
    const k = v.k;
    const p = v.p;
    // crystals growing out of his back
    boneFrame(c, v, k.hip, k.ang.torso);
    c.save();
    c.globalCompositeOperation = 'lighter';
    circle(c, -G * 0.9, -L * 0.8, 22, rgba(p.accent, 0.16 + 0.06 * Math.sin(v.t * 0.07)), null, 0);
    c.restore();
    crystal(c, -G * 0.8, -L * 0.62, 26, 6, -0.9, p.accent, v.ol);
    crystal(c, -G * 0.6, -L * 0.9, 34, 7, -0.55, p.accent, v.ol);
    crystal(c, -G * 0.2, -L * 1.02, 20, 5, -0.2, shade(p.accent, -0.15), v.ol);
    c.restore();
  },
  torso: (c, v) => {
    const k = v.k;
    const p = v.p;
    boneFrame(c, v, k.hip, k.ang.torso);
    if (armored(v)) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      ellipse(c, 0, -L * 0.5, G * 1.8, L * 0.85, 0, 'rgba(255,170,70,0.22)', null, 0);
      c.restore();
    }
    const body: [number, number][] = [
      [-G * 0.85, 12],
      [-G * 1.2, -L * 0.35],
      [-G * 1.12, -L * 0.82],
      [-G * 0.6, -L * 1.1],
      [G * 0.35, -L * 1.14],
      [G * 1.08, -L * 0.9],
      [G * 1.32, -L * 0.45],
      [G * 1.0, -L * 0.04],
      [G * 0.4, 14],
    ];
    blob(c, body);
    fillStroke(c, p.main, v.ol, 3.4);
    c.save();
    c.clip();
    c.fillStyle = shade(p.main, -0.2);
    c.fillRect(-G * 1.5, -L * 1.3, G * 0.9, L * 1.6);
    // a lighter belly stone
    blob(c, rockPts(G * 0.62, 5, 7, 1.25).map(([x, y]) => [x + G * 0.5, y - L * 0.42] as [number, number]));
    c.fillStyle = p.skin;
    c.fill();
    c.strokeStyle = shade(p.main, -0.35);
    c.lineWidth = 2;
    c.stroke();
    // moss over the shoulders and back
    blob(c, [[-G * 1.4, -L * 0.75], [-G * 0.8, -L * 1.25], [G * 0.4, -L * 1.3], [G * 0.6, -L * 1.0], [G * 0.1, -L * 0.92], [-G * 0.5, -L * 0.8], [-G * 1.0, -L * 0.55]]);
    c.fillStyle = p.second;
    c.fill();
    c.strokeStyle = shade(p.second, -0.3);
    c.lineWidth = 1.6;
    c.stroke();
    c.restore();
    // cracks
    c.strokeStyle = shade(p.main, -0.42);
    c.lineWidth = 2;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-G * 0.6, -L * 0.3);
    c.lineTo(-G * 0.3, -L * 0.42);
    c.lineTo(-G * 0.35, -L * 0.58);
    c.moveTo(G * 0.95, -L * 0.2);
    c.lineTo(G * 0.7, -L * 0.12);
    c.stroke();
    // little moss tufts dripping over the edge
    for (let i = 0; i < 3; i++) circle(c, -G * 0.4 + i * G * 0.35, -L * 0.98 + (i % 2) * 3, 3, shade(p.second, 0.15), null, 0);
    c.restore();
  },
  head: (c, v) => {
    const p = v.p;
    // rock head
    blob(c, [[-R * 0.95, R * 0.1], [-R * 0.8, -R * 0.75], [-R * 0.1, -R * 1.0], [R * 0.75, -R * 0.82], [R * 1.08, -R * 0.1], [R * 0.95, R * 0.62], [R * 0.2, R * 0.92], [-R * 0.7, R * 0.7]]);
    fillStroke(c, p.skin, v.ol, 3.2);
    c.save();
    c.clip();
    c.fillStyle = shade(p.skin, -0.2);
    c.fillRect(-R * 1.2, -R * 1.2, R * 0.6, R * 2.4);
    c.restore();
    // mossy cap and a daisy
    blob(c, [[-R * 0.85, -R * 0.55], [-R * 0.4, -R * 1.12], [R * 0.4, -R * 1.08], [R * 0.75, -R * 0.75], [R * 0.2, -R * 0.66], [-R * 0.4, -R * 0.62]]);
    fillStroke(c, p.second, v.ol, 2.4);
    daisy(c, R * 0.05, -R * 0.98, 1, p.extra ?? '#ffffff', v.t);
    eyesRock(c, v, v.f.charge > 0 || armored(v) ? 1 : 0);
    // heavy brow
    const brow = v.expr === 'angry' || v.expr === 'focus' ? 3 : 0;
    blob(c, [[-R * 0.15, -R * 0.42 + brow], [R * 0.4, -R * 0.62], [R * 1.1, -R * 0.42 + brow * 1.3], [R * 1.0, -R * 0.24 + brow], [R * 0.4, -R * 0.3 + brow], [-R * 0.1, -R * 0.26 + brow]]);
    fillStroke(c, shade(p.skin, -0.15), v.ol, 2.4);
    // gentle mouth
    const e = v.expr;
    c.strokeStyle = v.ol;
    c.lineCap = 'round';
    c.lineWidth = 2.6;
    c.beginPath();
    if (e === 'hurt' || e === 'ko') {
      ellipse(c, R * 0.55, R * 0.48, R * 0.13, R * 0.16, 0, '#3a2a3a', v.ol, 2);
    } else if (e === 'angry' || e === 'focus') {
      c.moveTo(R * 0.3, R * 0.48);
      c.lineTo(R * 0.8, R * 0.44);
      c.stroke();
    } else if (e === 'happy') {
      c.moveTo(R * 0.25, R * 0.36);
      c.quadraticCurveTo(R * 0.55, R * 0.78, R * 0.9, R * 0.34);
      c.closePath();
      c.fillStyle = '#5a2a3a';
      c.fill();
      c.stroke();
    } else {
      c.moveTo(R * 0.3, R * 0.42);
      c.quadraticCurveTo(R * 0.58, R * 0.62, R * 0.86, R * 0.4);
      c.stroke();
    }
    // a pebble cheek
    circle(c, -R * 0.45, R * 0.35, 2.4, shade(p.skin, -0.3), null, 0);
  },
  hand: (c, v, x, y, front) => {
    const k = v.k;
    const el = front ? k.elbowF : k.elbowB;
    // a boulder at the elbow
    boneFrame(c, v, el, front ? k.ang.armF : k.ang.armB);
    blob(c, rockPts(12, front ? 11 : 13, 6));
    fillStroke(c, front ? shade(v.p.main, 0.08) : shade(v.p.main, -0.15), v.ol, 2.6);
    c.restore();
    rockFist(c, v, [x, y], front ? k.ang.foreF : k.ang.foreB, front);
  },
  foot: (c, v, front) => {
    const k = v.k;
    const col = front ? v.p.main : shade(v.p.main, -0.22);
    // knee rock
    boneFrame(c, v, front ? k.kneeF : k.kneeB, front ? k.ang.thF : k.ang.thB);
    blob(c, rockPts(12, front ? 17 : 19, 6));
    fillStroke(c, shade(col, 0.06), v.ol, 2.6);
    c.restore();
    // slab foot
    boneFrame(c, v, front ? k.footF : k.footB, (front ? k.ang.shF : k.ang.shB) - 180);
    rrect(c, -14, -15, 34, 16, 6);
    fillStroke(c, col, v.ol, 3);
    for (let i = 0; i < 3; i++) circle(c, 12 + i * 3, -2, 3, shade(col, 0.1), v.ol, 1.4);
    c.fillStyle = shade(col, -0.35);
    c.fillRect(-12, -3, 30, 3);
    c.restore();
  },
  front: (c, v) => {
    const k = v.k;
    const p = v.p;
    // the big front shoulder boulder, mossy on top
    boneFrame(c, v, k.shoulder, k.ang.armF);
    blob(c, rockPts(16, 23, 8).map(([x, y]) => [x, y - 9] as [number, number]));
    fillStroke(c, shade(p.main, 0.05), v.ol, 3);
    c.save();
    c.clip();
    c.fillStyle = shade(p.main, -0.18);
    c.fillRect(-22, -30, 10, 50);
    c.fillStyle = p.second;
    c.fillRect(-20, 0, 40, 6);
    c.restore();
    c.restore();
    // taunt: the fist bump... a little bird lands on it
    if (v.f.act === A.TAUNT) {
      const af = v.f.af;
      if (af >= 14 && af < 58) {
        const land = Math.min(1, (af - 14) / 12);
        const bx = k.handF[0] + k.facing * (1 - land) * 90;
        const by = k.handF[1] - 22 * k.scale - (1 - land) * 70;
        const flap = land < 1 || af > 46 ? Math.sin(v.t * 1.2) : 0;
        c.save();
        c.translate(bx, by);
        c.scale(-k.facing, 1);
        bird(c, 0, 0, k.scale * 1.2, p.accent === '#fffbe0' ? '#ff9ed8' : p.accent, flap);
        c.restore();
        if (af > 28 && af < 46) {
          // a little heart over his head
          const hy = k.head[1] - 40 * k.scale - (af - 28) * 0.8;
          c.fillStyle = '#ff6fb5';
          c.beginPath();
          const hx = k.head[0];
          c.moveTo(hx, hy + 6);
          c.bezierCurveTo(hx - 9, hy, hx - 6, hy - 8, hx, hy - 3);
          c.bezierCurveTo(hx + 6, hy - 8, hx + 9, hy, hx, hy + 6);
          c.fill();
          c.strokeStyle = OL;
          c.lineWidth = 2;
          c.stroke();
        }
      }
    }
    // Geyser Leap: rubble kicked up as he launches
    if (moveId(v) === 'uspec' && v.f.mf >= 9 && v.f.mf <= 20) {
      for (let i = 0; i < 5; i++) {
        const t = v.f.mf - 9;
        const px = k.footF[0] + (i - 2) * 14 * k.scale + (i - 2) * t * 1.5;
        const py = k.footF[1] + 20 + t * (2 + i * 0.4);
        blob(c, rockPts(5 + (i % 3), i * 5, 5).map(([x, y]) => [x + px, y + py] as [number, number]));
        fillStroke(c, p.main, v.ol, 1.8);
      }
    }
  },
};

// ------------------------------------------------------------------ projectiles

function drawBoulder(c: CanvasRenderingContext2D, p: Proj, r: number): void {
  const spin = (p.x / r) * (p.vx >= 0 ? 1 : 1);
  // dust when rolling
  if (p.gnd) {
    for (let i = 0; i < 3; i++) circle(c, p.x - Math.sign(p.vx) * (r + i * 10), p.y + r * 0.7 - i * 3, 5 + i * 3, `rgba(220,205,180,${0.35 - i * 0.1})`, null, 0);
  }
  c.save();
  c.translate(p.x, p.y);
  c.rotate(spin);
  blob(c, rockPts(r, p.id % 9, 9));
  fillStroke(c, '#9a8f86', OL, 3.2);
  c.save();
  c.clip();
  c.fillStyle = '#7a6f68';
  c.fillRect(-r * 1.2, -r * 1.2, r * 0.7, r * 2.4);
  blob(c, rockPts(r * 0.45, p.id % 5 + 3, 6).map(([x, y]) => [x + r * 0.25, y - r * 0.45] as [number, number]));
  c.fillStyle = '#6fbf4a';
  c.fill();
  c.restore();
  c.strokeStyle = '#4a403c';
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-r * 0.4, r * 0.1);
  c.lineTo(0, r * 0.3);
  c.lineTo(r * 0.1, r * 0.6);
  c.moveTo(r * 0.3, -r * 0.1);
  c.lineTo(r * 0.55, r * 0.05);
  c.stroke();
  c.restore();
}

registerProjDraw('boulder', (c, p, r) => drawBoulder(c, p, r));

registerProjDraw('pillar', (c, p, r) => {
  const grow = Math.min(1, p.age / 5);
  const fade = p.age > 16 ? Math.max(0, 1 - (p.age - 16) / 8) : 1;
  const h = 170 * grow;
  const base = p.y + r * 0.7;
  c.save();
  c.globalAlpha = fade;
  // the column, slightly tapered, with stone bands
  c.beginPath();
  c.moveTo(p.x - r * 1.05, base);
  c.lineTo(p.x - r * 0.85, base - h);
  c.lineTo(p.x + r * 0.85, base - h);
  c.lineTo(p.x + r * 1.05, base);
  c.closePath();
  fillStroke(c, '#9a8f86', OL, 3.2);
  c.fillStyle = '#7a6f68';
  c.fillRect(p.x - r * 0.95, base - h, r * 0.5, h);
  for (let i = 1; i < 4; i++) {
    c.strokeStyle = '#5a504a';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(p.x - r * 0.95, base - (h * i) / 4);
    c.lineTo(p.x + r * 0.95, base - (h * i) / 4 + 4);
    c.stroke();
  }
  blob(c, rockPts(r * 1.05, 4, 8, 0.45).map(([x, y]) => [x + p.x, y + base - h] as [number, number]));
  fillStroke(c, '#b2a89f', OL, 3);
  c.restore();
});

registerProjDraw('quake', (c, p, r) => {
  const dir = p.vx >= 0 ? 1 : -1;
  const floor = p.y + r;
  for (let i = 0; i < 4; i++) {
    const x = p.x - dir * i * 22;
    const h = (46 - i * 9) * Math.min(1, (p.age + 2 - i) / 3);
    if (h <= 0) continue;
    c.beginPath();
    c.moveTo(x - 12, floor);
    c.lineTo(x - 3 + dir * 4, floor - h);
    c.lineTo(x + 5 + dir * 4, floor - h * 0.7);
    c.lineTo(x + 12, floor);
    c.closePath();
    fillStroke(c, i === 0 ? '#b2a89f' : '#9a8f86', OL, 2.6);
  }
  for (let i = 0; i < 3; i++) circle(c, p.x - dir * (10 + i * 18), floor - 8 - i * 4, 6 + i * 2, `rgba(225,210,185,${0.45 - i * 0.12})`, null, 0);
});
