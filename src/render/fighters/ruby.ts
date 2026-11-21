// Rumble Ruby: a champion boxing kangaroo. Tall ears, a long snout, a sweatband, huge gloves, a gold title belt
// over her trunks, a cream belly with a (roomy) pouch, long feet and a big springy tail.
import { A } from '../../sim/acts';
import { FIGHTERS } from '../../sim/data';
import { boneFrame, circle, ellipse, eyes, fillStroke, mouth, OUTLINE, rgba, rrect, shade, type ArtDef, type FView } from '../art';

const R = 19;
const TORSO = 35;
const GIRTH = 15;
const TAIL = 54;
/** where each fighter's ring went up (visual only: the ring stays put while she rushes in) */
const ringAt = new Map<number, [number, number]>();

function moveId(v: FView): string {
  return v.f.act === A.MOVE ? (FIGHTERS[v.f.def].moveIds[v.f.mv] ?? '') : '';
}

function inUlt(v: FView): boolean {
  const m = moveId(v);
  return m === 'ult' || m === 'ultFlurry';
}

/** a boxing glove in the forearm frame (origin at the wrist, -y = along the forearm) */
function glove(c: CanvasRenderingContext2D, v: FView, col: string, s: number): void {
  rrect(c, -7 * s, -3 * s, 14 * s, 8 * s, 3 * s);
  fillStroke(c, '#f4f1ea', v.ol, 2.4);
  ellipse(c, 0, -11 * s, 11 * s, 12 * s, 0, col, v.ol, 2.8);
  ellipse(c, 7 * s, -7 * s, 4.5 * s, 6 * s, 0.4, shade(col, -0.12), v.ol, 2.2);
  ellipse(c, -3 * s, -15 * s, 4 * s, 3 * s, -0.5, rgba('#ffffff', 0.55), null, 0);
}

function pow(c: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.beginPath();
  for (let i = 0; i < 14; i++) {
    const r = i % 2 ? s * 0.5 : s;
    const a = (i * Math.PI) / 7;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  fillStroke(c, '#ffe14f', OUTLINE, 2.4);
  c.restore();
}

export const rubyArt: ArtDef = {
  limb: 11,
  handR: 11,
  footL: 30,
  palettes: [
    { name: 'Champion Red', main: '#c8743a', second: '#f6dfb8', accent: '#e43a3a', skin: '#3a2228', extra: '#ffcf3a' },
    { name: 'Outback Blue', main: '#8e8f9e', second: '#eceaf2', accent: '#2f7bff', skin: '#2b2633', extra: '#ffcf3a' },
    { name: 'Golden Glove', main: '#e8c49a', second: '#fff4e0', accent: '#ffb92a', skin: '#5a3a2a', extra: '#ff5a3a' },
    { name: 'Pink Pow', main: '#e88aa8', second: '#ffe6ee', accent: '#ff3a8c', skin: '#5a2a3a', extra: '#9cf6ff' },
    { name: 'Midnight Bout', main: '#4a3a5e', second: '#cbb8e0', accent: '#a64bff', skin: '#1b0f24', extra: '#ffcf3a' },
    { name: 'Mint Southpaw', main: '#d9b27a', second: '#fff3d6', accent: '#2fd0a0', skin: '#3a2a20', extra: '#e8e2ff' },
    { name: 'Ghost Roo', main: '#f2efe8', second: '#ffffff', accent: '#2b2633', skin: '#ff8aa8', extra: '#ff3a3a' },
    { name: 'Sunset Slugger', main: '#e8603a', second: '#ffd8a8', accent: '#1fb8c8', skin: '#3a1a14', extra: '#ffe14f' },
  ],
  upperArm: (p) => p.main,
  foreArm: (p) => p.main,
  thigh: (p) => p.main,
  shin: (p) => p.main,
  back: (c, v) => {
    // Title Fight: the ring ropes go up around the fight
    if (!inUlt(v)) return;
    const f = v.f;
    let ring = ringAt.get(f.i);
    if (!ring || (moveId(v) === 'ult' && f.mf <= 2) || Math.abs(ring[0] - f.x) > 700) {
      ring = [f.x + v.k.facing * 190, f.y];
      ringAt.set(f.i, ring);
    }
    const floor = ring[1];
    const x = ring[0];
    const half = 330;
    const cols = ['#ff3a3a', '#ffffff', '#3a7bff'];
    for (const sx of [-1, 1]) {
      rrect(c, x + sx * half - 7, floor - 140, 14, 140, 4);
      fillStroke(c, '#c9d2e3', OUTLINE, 3);
      rrect(c, x + sx * half - 10, floor - 148, 20, 14, 4);
      fillStroke(c, sx < 0 ? '#ff3a3a' : '#3a7bff', OUTLINE, 2.6);
    }
    for (let i = 0; i < 3; i++) {
      const y = floor - 42 - i * 38;
      const sag = 6 + Math.sin(v.t * 0.4 + i) * 2;
      c.beginPath();
      c.moveTo(x - half, y);
      c.quadraticCurveTo(x, y + sag, x + half, y);
      c.strokeStyle = OUTLINE;
      c.lineWidth = 8;
      c.stroke();
      c.strokeStyle = cols[i];
      c.lineWidth = 4.5;
      c.stroke();
    }
  },
  tail: (c, v) => {
    const k = v.k;
    const p = v.p;
    const hx = k.hip[0];
    const hy = k.hip[1];
    const tx = k.tail[0];
    const ty = k.tail[1];
    const dx = tx - hx;
    const dy = ty - hy;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    // sag the middle toward the floor a little
    const s = k.scale;
    const mx = hx + dx * 0.5 + nx * 6 * k.facing * s;
    const my = hy + dy * 0.5 + 10 * s;
    const w0 = 13 * s;
    c.beginPath();
    c.moveTo(hx + nx * w0, hy + ny * w0);
    c.quadraticCurveTo(mx + nx * w0 * 0.7, my + ny * w0 * 0.7, tx + nx * 3, ty + ny * 3);
    c.quadraticCurveTo(tx + dx / L * 6, ty + dy / L * 6, tx - nx * 3, ty - ny * 3);
    c.quadraticCurveTo(mx - nx * w0 * 0.7, my - ny * w0 * 0.7, hx - nx * w0, hy - ny * w0);
    c.closePath();
    fillStroke(c, shade(p.main, -0.08), v.ol, 3);
    void TAIL;
  },
  torso: (c, v) => {
    const p = v.p;
    const k = v.k;
    boneFrame(c, v, k.hip, k.ang.torso);
    // body: pear-shaped, wide at the hips
    c.beginPath();
    c.moveTo(-GIRTH * 0.75, -TORSO - 3);
    c.quadraticCurveTo(GIRTH * 0.9, -TORSO - 6, GIRTH * 0.95, -TORSO * 0.55);
    c.quadraticCurveTo(GIRTH * 1.25, -4, GIRTH * 0.8, 6);
    c.lineTo(-GIRTH * 1.0, 6);
    c.quadraticCurveTo(-GIRTH * 1.25, -TORSO * 0.45, -GIRTH * 0.75, -TORSO - 3);
    c.closePath();
    fillStroke(c, p.main, v.ol, 3.2);
    // cream belly + pouch
    c.save();
    c.clip();
    ellipse(c, GIRTH * 0.55, -TORSO * 0.45, GIRTH * 0.75, TORSO * 0.6, 0, p.second, null, 0);
    c.restore();
    c.beginPath();
    c.moveTo(-GIRTH * 0.1, -TORSO * 0.32);
    c.quadraticCurveTo(GIRTH * 0.6, -TORSO * 0.14, GIRTH * 1.1, -TORSO * 0.36);
    c.strokeStyle = shade(p.second, -0.35);
    c.lineWidth = 2.4;
    c.stroke();
    // a little heart peeking out of the pouch
    const hx = GIRTH * 0.55;
    const hy = -TORSO * 0.36;
    c.beginPath();
    c.moveTo(hx, hy + 1);
    c.bezierCurveTo(hx - 6, hy - 3, hx - 3, hy - 8, hx, hy - 4.5);
    c.bezierCurveTo(hx + 3, hy - 8, hx + 6, hy - 3, hx, hy + 1);
    fillStroke(c, '#ff5a7a', v.ol, 1.4);
    // trunks
    c.beginPath();
    c.moveTo(-GIRTH * 1.05, -6);
    c.lineTo(GIRTH * 1.05, -6);
    c.lineTo(GIRTH * 0.95, 9);
    c.lineTo(-GIRTH * 1.05, 9);
    c.closePath();
    fillStroke(c, p.accent, v.ol, 2.6);
    c.fillStyle = '#ffffff';
    c.fillRect(-GIRTH * 0.7, -5, 3, 13);
    // title belt
    rrect(c, -GIRTH * 1.1, -11, GIRTH * 2.2, 8, 3);
    fillStroke(c, shade(p.extra ?? '#ffcf3a', -0.25), v.ol, 2.2);
    ellipse(c, GIRTH * 0.45, -7, 8, 7, 0, p.extra ?? '#ffcf3a', v.ol, 2.2);
    circle(c, GIRTH * 0.45, -7, 3, '#e43a3a', null, 0);
    c.restore();
  },
  head: (c, v) => {
    const p = v.p;
    const flick = v.f.act === A.HITSTUN ? 10 : 0;
    // ears (back one, then front one)
    for (const [ex, rot, col] of [
      [-R * 0.45, -0.42 - flick * 0.02, shade(p.main, -0.15)],
      [-R * 0.1, -0.2 - flick * 0.03, p.main],
    ] as [number, number, string][]) {
      c.save();
      c.translate(ex, -R * 0.65);
      c.rotate(rot);
      ellipse(c, 0, -R * 0.75, R * 0.3, R * 0.8, 0, col, v.ol, 2.8);
      ellipse(c, 0, -R * 0.7, R * 0.14, R * 0.55, 0, rgba('#ff8aa8', 0.8), null, 0);
      c.restore();
    }
    // skull
    ellipse(c, -R * 0.05, -R * 0.05, R * 0.82, R * 0.78, 0, p.main, v.ol, 3);
    // snout
    c.beginPath();
    c.moveTo(R * 0.2, -R * 0.42);
    c.quadraticCurveTo(R * 1.25, -R * 0.38, R * 1.38, R * 0.12);
    c.quadraticCurveTo(R * 1.35, R * 0.55, R * 0.7, R * 0.62);
    c.quadraticCurveTo(R * 0.2, R * 0.66, R * 0.05, R * 0.3);
    c.closePath();
    fillStroke(c, p.main, v.ol, 3);
    ellipse(c, R * 0.86, R * 0.28, R * 0.48, R * 0.3, 0.1, p.second, null, 0);
    // nose
    ellipse(c, R * 1.3, R * 0.02, R * 0.16, R * 0.12, 0.3, p.skin, v.ol, 1.8);
    circle(c, R * 1.26, -R * 0.03, R * 0.04, 'rgba(255,255,255,0.7)', null, 0);
    // sweatband
    c.save();
    c.beginPath();
    c.ellipse(-R * 0.05, -R * 0.05, R * 0.83, R * 0.79, 0, 0, Math.PI * 2);
    c.clip();
    c.beginPath();
    c.moveTo(-R, -R * 0.62);
    c.lineTo(R, -R * 0.42);
    c.lineTo(R, -R * 0.18);
    c.lineTo(-R, -R * 0.38);
    c.closePath();
    fillStroke(c, p.accent, v.ol, 2.2);
    c.restore();
    // band tails fluttering behind
    const fl = Math.sin(v.t * 0.3) * 3;
    c.beginPath();
    c.moveTo(-R * 0.7, -R * 0.5);
    c.lineTo(-R * 1.4, -R * 0.6 + fl);
    c.lineTo(-R * 1.3, -R * 0.3 + fl);
    c.closePath();
    fillStroke(c, p.accent, v.ol, 2);
    eyes(c, v, R * 0.28, -R * 0.02, R * 0.24, '#3a2228', { gap: R * 0.46 });
    // lashes
    if (!v.blink && v.expr !== 'ko' && v.expr !== 'happy') {
      c.beginPath();
      c.moveTo(R * 0.5, -R * 0.24);
      c.lineTo(R * 0.64, -R * 0.36);
      c.moveTo(R * 0.44, -R * 0.27);
      c.lineTo(R * 0.52, -R * 0.42);
      c.strokeStyle = v.ol;
      c.lineWidth = 2;
      c.stroke();
    }
    // cheek + mouth on the snout
    circle(c, R * 0.42, R * 0.32, R * 0.12, rgba('#ff6b8a', 0.5), null, 0);
    mouth(c, v, R * 0.92, R * 0.46, R * 0.38);
  },
  hand: (c, v, x, y, front) => {
    const k = v.k;
    const phi = front ? k.ang.foreF : k.ang.foreB;
    const col = front ? v.p.accent : shade(v.p.accent, -0.2);
    boneFrame(c, v, [x, y], phi);
    glove(c, v, col, 1);
    c.restore();
  },
  foot: (c, v, front) => {
    const k = v.k;
    const pt = front ? k.footF : k.footB;
    const phi = front ? k.ang.shF : k.ang.shB;
    boneFrame(c, v, pt, phi - 180);
    const col = front ? shade(v.p.main, -0.05) : shade(v.p.main, -0.25);
    // long kangaroo foot
    c.beginPath();
    c.moveTo(-8, -9);
    c.quadraticCurveTo(4, -12, 14, -7);
    c.quadraticCurveTo(28, -6, 30, 0);
    c.lineTo(-9, 1);
    c.quadraticCurveTo(-12, -4, -8, -9);
    c.closePath();
    fillStroke(c, col, v.ol, 2.6);
    c.fillStyle = v.ol;
    for (let i = 0; i < 3; i++) circle(c, 24 + i * 3, -1.5, 1.4, '#f4f1ea', v.ol, 1);
    // ankle tape
    rrect(c, -8, -12, 11, 5, 2);
    fillStroke(c, '#f4f1ea', v.ol, 1.8);
    c.restore();
  },
  weapon: (c, v) => {
    // Title Fight: she rings the bell herself
    if (moveId(v) !== 'ult' || v.f.mf > 13) return;
    const k = v.k;
    const ring = v.f.mf % 6 < 3 ? -0.3 : 0.3;
    c.save();
    c.translate(k.handF[0], k.handF[1] - 14);
    c.rotate(ring);
    c.beginPath();
    c.moveTo(-14, 10);
    c.quadraticCurveTo(-13, -12, 0, -14);
    c.quadraticCurveTo(13, -12, 14, 10);
    c.closePath();
    fillStroke(c, '#ffcf3a', OUTLINE, 3);
    rrect(c, -16, 8, 32, 6, 3);
    fillStroke(c, '#e0a020', OUTLINE, 2.4);
    circle(c, 0, 16, 4, '#8a5a1a', OUTLINE, 2);
    c.restore();
    if (v.f.mf % 6 < 3) {
      c.save();
      c.strokeStyle = '#fff6a0';
      c.lineWidth = 3;
      c.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.6;
        c.beginPath();
        c.moveTo(k.handF[0] + Math.cos(a) * 24, k.handF[1] - 14 + Math.sin(a) * 24);
        c.lineTo(k.handF[0] + Math.cos(a) * 36, k.handF[1] - 14 + Math.sin(a) * 36);
        c.stroke();
      }
      c.restore();
    }
  },
  front: (c, v) => {
    const k = v.k;
    const mid = moveId(v);
    const mf = v.f.mf;
    // flurries: ghost gloves in a fan
    const flurry = (mid === 'nspec' || mid === 'nspecAir') || (mid === 'ultFlurry' && mf < 60);
    if (flurry) {
      c.save();
      c.globalAlpha = 0.45;
      for (let i = 0; i < 3; i++) {
        const a = ((v.t * 3 + i * 7) % 20) / 20;
        const gx = k.shoulder[0] + k.facing * (30 + a * 22);
        const gy = k.shoulder[1] - 18 + i * 16 + Math.sin(v.t + i) * 4;
        boneFrame(c, v, [gx, gy], 90);
        glove(c, v, v.p.accent, 0.9);
        c.restore();
      }
      c.restore();
      if (mid === 'ultFlurry' && v.t % 6 < 3) pow(c, k.handF[0] + k.facing * 22, k.handF[1] - 10 + ((v.t * 7) % 30) - 15, 14, v.t * 0.3);
    }
    if ((mid === 'fsmash' && mf >= 15 && mf <= 20) || (mid === 'ultFlurry' && mf >= 66 && mf <= 72) || (mid === 'nspecEnd' && mf >= 5 && mf <= 9)) {
      pow(c, k.handF[0] + k.facing * 16, k.handF[1], 22, mf * 0.2);
    }
    if (mid === 'uspec' && mf >= 4 && mf <= 36) {
      // springy squiggle under the tail
      const tx = k.tail[0];
      const ty = k.tail[1];
      c.beginPath();
      for (let i = 0; i <= 6; i++) c.lineTo(tx + (i % 2 ? 8 : -8), ty + 6 + i * 5);
      c.strokeStyle = 'rgba(255,255,255,0.8)';
      c.lineWidth = 3;
      c.stroke();
    }
  },
};
