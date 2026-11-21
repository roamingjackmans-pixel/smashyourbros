// Inverta: gravity acrobat of the Upside-Down Circus. Harlequin-diamond leotard, a frilly ruff collar, a long high
// ponytail, wrist ribbons, ballet slippers and a tiny top hat worn upside-down (brim up, a star popping out).
// Extras: the trapeze bar in Trapeze Swing, a portal in the floor when she dives through the stage, flip stars,
// a countdown badge over anyone whose gravity she flipped, and the big top + spotlights of Topsy-Turvy.
import { A } from '../../sim/acts';
import { FIGHTERS, STAGES } from '../../sim/data';
import { surfaces } from '../../sim/stage';
import type { Fighter, Proj, State } from '../../sim/types';
import { boneFrame, circle, ellipse, eyes, fillStroke, mouth, OUTLINE, rgba, rrect, shade, shoe, type ArtDef, type FView } from '../art';
import { registerProjDraw } from '../things';

const R = 19; // head radius
const L = 33; // torso
const G = 12; // girth
const VIOLET = '#9b7bff';
const GOLD = '#ffd23a';

function moveId(v: FView): string {
  const f = v.f;
  if (f.act !== A.MOVE) return '';
  return FIGHTERS[f.def].moveIds[f.mv] ?? '';
}

function star(c: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, fill: string, ol: string | null, olw = 2): void {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (ol) {
    c.strokeStyle = ol;
    c.lineWidth = olw;
    c.lineJoin = 'round';
    c.stroke();
  }
}

/** a tapered stroke along a quadratic curve, outlined */
function strand(c: CanvasRenderingContext2D, pts: [number, number][], w0: number, w1: number, fill: string, ol: string): void {
  const n = pts.length - 1;
  c.lineCap = 'round';
  for (const pass of [0, 1]) {
    for (let i = 0; i < n; i++) {
      const w = w0 + ((w1 - w0) * i) / Math.max(1, n - 1);
      c.beginPath();
      c.moveTo(pts[i][0], pts[i][1]);
      c.lineTo(pts[i + 1][0], pts[i + 1][1]);
      c.strokeStyle = pass === 0 ? ol : fill;
      c.lineWidth = pass === 0 ? w + 5 : w;
      c.stroke();
    }
  }
}

function quadPts(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]);
  }
  return out;
}

// ------------------------------------------------------------------ big-top cinematic (Topsy-Turvy)

function drawBigTop(c: CanvasRenderingContext2D, v: FView): void {
  const st = v.st;
  const f = v.f;
  const ss = surfaces(STAGES[st.stage], st.frame, !!st.cfg.flat);
  const main = ss[0];
  if (!main) return;
  const drop = st.freeze > 0 && st.freezeBy === f.i ? Math.min(1, (50 - st.freeze) / 26) : 1;
  const fade = f.mf > 92 ? Math.max(0, 1 - (f.mf - 92) / 18) : 1;
  const ease = 1 - (1 - drop) * (1 - drop);
  const x1 = main.x1 - 170;
  const x2 = main.x2 + 170;
  const cx = (x1 + x2) / 2;
  const yb = main.y1 - 790 - (1 - ease) * 700; // valance line, just above the hoops
  const peak = yb - 260;
  c.save();
  c.globalAlpha *= fade;
  // spotlights sweeping the stage
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const s of [-1, 1]) {
    const sx = cx + s * (x2 - x1) * 0.36;
    const aim = cx + s * Math.sin(v.t * 0.05 + s) * (main.x2 - main.x1) * 0.4;
    const g = c.createLinearGradient(sx, yb, aim, main.y1);
    g.addColorStop(0, 'rgba(255,245,200,0.38)');
    g.addColorStop(1, 'rgba(255,245,200,0.04)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(sx - 16, yb + 10);
    c.lineTo(sx + 16, yb + 10);
    c.lineTo(aim + 150, main.y1);
    c.lineTo(aim - 150, main.y1);
    c.closePath();
    c.fill();
  }
  c.restore();
  // canopy: alternating stripes from the peak
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = x1 + ((x2 - x1) * i) / n;
    const b = x1 + ((x2 - x1) * (i + 1)) / n;
    c.beginPath();
    c.moveTo(cx, peak);
    c.lineTo(a, yb);
    c.lineTo(b, yb);
    c.closePath();
    c.fillStyle = i % 2 ? '#fff4e6' : v.p.main;
    c.fill();
  }
  c.beginPath();
  c.moveTo(cx, peak);
  c.lineTo(x1, yb);
  c.lineTo(x2, yb);
  c.closePath();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 7;
  c.lineJoin = 'round';
  c.stroke();
  // scalloped valance
  const sc = 18;
  c.beginPath();
  c.moveTo(x1, yb);
  for (let i = 0; i < sc; i++) {
    const a = x1 + ((x2 - x1) * i) / sc;
    const b = x1 + ((x2 - x1) * (i + 1)) / sc;
    c.quadraticCurveTo((a + b) / 2, yb + 62, b, yb);
  }
  c.closePath();
  c.fillStyle = shade(v.p.second, -0.05);
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  for (let i = 0; i < sc; i++) {
    const m = x1 + ((x2 - x1) * (i + 0.5)) / sc;
    circle(c, m, yb + 40, 7, v.p.accent, OUTLINE, 2.5);
  }
  // flag on the peak
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(cx, peak);
  c.lineTo(cx, peak - 90);
  c.stroke();
  c.beginPath();
  c.moveTo(cx, peak - 90);
  c.quadraticCurveTo(cx + 40, peak - 92 + Math.sin(v.t * 0.2) * 8, cx + 70, peak - 70);
  c.lineTo(cx, peak - 56);
  c.closePath();
  fillStroke(c, v.p.accent, OUTLINE, 3);
  // banner
  c.font = '900 46px Bungee, Impact, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 9;
  c.strokeStyle = OUTLINE;
  c.strokeText('TOPSY-TURVY!', cx, yb - 70);
  c.fillStyle = GOLD;
  c.fillText('TOPSY-TURVY!', cx, yb - 70);
  c.restore();
}

// ------------------------------------------------------------------ flip readability

/** a badge on anyone whose gravity is flipped for a while: an up arrow and a countdown ring */
function flipBadge(c: CanvasRenderingContext2D, st: State, t: Fighter, tt: number): void {
  const cf = FIGHTERS[t.def];
  const h = cf.height * 0.92 * (cf.def.scale ?? 1);
  const x = t.x + 50;
  const y = t.y + h * 0.5; // flipped: the body hangs below the feet
  const frac = Math.min(1, t.gravT / 116);
  c.save();
  circle(c, x, y, 19, 'rgba(27,15,36,0.75)', VIOLET, 3);
  c.beginPath();
  c.arc(x, y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  c.strokeStyle = GOLD;
  c.lineWidth = 5;
  c.lineCap = 'round';
  c.stroke();
  // double arrow (up and down)
  const bob = Math.sin(tt * 0.3) * 2;
  c.strokeStyle = '#ffffff';
  c.lineWidth = 3.5;
  c.beginPath();
  c.moveTo(x - 5, y + 9 + bob);
  c.lineTo(x - 5, y - 9 + bob);
  c.moveTo(x - 10, y - 4 + bob);
  c.lineTo(x - 5, y - 10 + bob);
  c.lineTo(x, y - 4 + bob);
  c.moveTo(x + 5, y - 9 - bob);
  c.lineTo(x + 5, y + 9 - bob);
  c.moveTo(x + 0, y + 4 - bob);
  c.lineTo(x + 5, y + 10 - bob);
  c.lineTo(x + 10, y + 4 - bob);
  c.stroke();
  c.restore();
  void st;
}

/** the portal she dives through: hides the part of her that's "inside" the floor */
function drawPortal(c: CanvasRenderingContext2D, v: FView): void {
  const f = v.f;
  const mf = f.mf;
  if (f.gnd < 0) return;
  const g = f.grav; // inside the slab = world +g from the surface
  const open = mf <= 10 ? Math.min(1, mf / 4) : Math.max(0, 1 - (mf - 12) / 8);
  if (open <= 0) return;
  const w = 54 * open + 6;
  const x = f.x;
  const y = f.y;
  const depth = 150;
  c.save();
  // the hole: covers whatever of her is inside the stage
  c.beginPath();
  c.moveTo(x - w, y);
  c.lineTo(x - w * 0.8, y + g * depth);
  c.lineTo(x + w * 0.8, y + g * depth);
  c.lineTo(x + w, y);
  c.closePath();
  const grd = c.createLinearGradient(x, y, x, y + g * depth);
  grd.addColorStop(0, '#2a1250');
  grd.addColorStop(0.6, 'rgba(42,18,80,0.92)');
  grd.addColorStop(1, 'rgba(42,18,80,0)');
  c.fillStyle = grd;
  c.fill();
  // stars swirling in it
  for (let i = 0; i < 6; i++) {
    const a = v.t * 0.12 + i * 1.05;
    star(c, x + Math.cos(a) * w * 0.6, y + g * (24 + ((i * 23 + v.t * 2) % 110)), 4 + (i % 3), a, rgba(GOLD, 0.8), null);
  }
  // glowing rim
  c.globalCompositeOperation = 'lighter';
  ellipse(c, x, y, w * 1.15, 12, 0, rgba(VIOLET, 0.35), null, 0);
  c.globalCompositeOperation = 'source-over';
  ellipse(c, x, y, w, 9, 0, '', VIOLET, 5);
  ellipse(c, x, y, w * 0.82, 6, 0, '', '#ffffff', 2);
  c.restore();
}

// ------------------------------------------------------------------ palettes and parts

export const invertaArt: ArtDef = {
  limb: 10,
  handR: 6.5,
  footL: 18,
  palettes: [
    { name: 'Big Top Violet', main: '#9b7bff', second: '#ffd23a', accent: '#ff5fa8', skin: '#ffd7b8', extra: '#3b1f6e' },
    { name: 'Ringmaster Red', main: '#e8364f', second: '#f6efe2', accent: '#ffcf3a', skin: '#c98c64', extra: '#2a1420' },
    { name: 'Cotton Candy', main: '#ff8ad8', second: '#9be8ff', accent: '#ffffff', skin: '#ffe0cc', extra: '#ff4fae' },
    { name: 'Midnight Trapeze', main: '#2c3570', second: '#7fe3ff', accent: '#c2b3ff', skin: '#8d5a3b', extra: '#4b3c9e' },
    { name: 'Lion Tamer', main: '#ff9a2a', second: '#4a2a14', accent: '#ffe07a', skin: '#f0c19b', extra: '#b4511e' },
    { name: 'Mint Juggler', main: '#33cc9c', second: '#fff17a', accent: '#ff6f6f', skin: '#ffcfa6', extra: '#1d5a48' },
    { name: 'Mirror Mirror', main: '#f4f1ea', second: '#2b2633', accent: '#9b7bff', skin: '#e9b48a', extra: '#fafafa' },
    { name: 'Popcorn Night', main: '#ffe14f', second: '#e8364f', accent: '#3a7bff', skin: '#ffd2ad', extra: '#e85a2a' },
  ],
  upperArm: (p) => p.skin,
  foreArm: (p) => p.skin,
  thigh: (p) => p.main,
  shin: (p) => shade(p.main, -0.06),
  back: (c, v) => {
    if (moveId(v) === 'ult') drawBigTop(c, v);
    // the long high ponytail, behind everything
    const k = v.k;
    const p = v.p;
    boneFrame(c, v, k.head, k.ang.head);
    const vyLocal = -v.f.vy * v.f.grav;
    const lift = Math.max(-12, Math.min(12, vyLocal)) * 1.6;
    const sw = Math.sin(v.t * 0.12 + v.f.i) * R * 0.22;
    const pts = quadPts(-R * 0.45, -R * 0.95, -R * 2.0 + sw * 0.3, -R * 1.2, -R * 1.7 + sw, R * 1.7 + lift, 8);
    strand(c, pts, R * 0.62, R * 0.2, p.extra ?? '#3b1f6e', v.ol);
    // a lighter streak along it
    c.beginPath();
    c.moveTo(pts[1][0], pts[1][1]);
    for (let i = 2; i < pts.length - 1; i++) c.lineTo(pts[i][0] + 2, pts[i][1]);
    c.strokeStyle = rgba(shade(p.extra ?? '#3b1f6e', 0.35), 0.8);
    c.lineWidth = 2.4;
    c.stroke();
    c.restore();
  },
  torso: (c, v) => {
    const p = v.p;
    boneFrame(c, v, v.k.hip, v.k.ang.torso);
    rrect(c, -G, -L - G * 0.35, G * 2, L + G * 0.8, G * 0.95);
    c.fillStyle = p.main;
    c.fill();
    // harlequin diamonds
    c.save();
    c.clip();
    const dw = G * 1.0;
    const dh = L * 0.34;
    c.fillStyle = p.second;
    for (let i = -2; i <= 2; i++) {
      for (let j = -1; j <= 4; j++) {
        const x = i * dw;
        const y = G * 0.3 - j * dh;
        c.beginPath();
        c.moveTo(x, y - dh / 2);
        c.lineTo(x + dw / 2, y);
        c.lineTo(x, y + dh / 2);
        c.lineTo(x - dw / 2, y);
        c.closePath();
        c.fill();
      }
    }
    c.fillStyle = 'rgba(20,8,40,0.18)';
    c.fillRect(-G * 1.2, -L - G, G * 0.75, L + G * 2);
    c.restore();
    rrect(c, -G, -L - G * 0.35, G * 2, L + G * 0.8, G * 0.95);
    c.strokeStyle = v.ol;
    c.lineWidth = 3.2;
    c.stroke();
    // sash
    rrect(c, -G - 1, -G * 0.25, G * 2 + 2, G * 0.55, 3);
    fillStroke(c, p.accent, v.ol, 2.2);
    star(c, G * 0.45, -G * 0.0, 4.2, 0, '#ffffff', v.ol, 1.6);
    // frilly ruff collar
    const cy = -L - 1;
    const rx = G * 1.7;
    const ry = 9;
    const n = 16;
    c.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = i % 2 ? 0.74 : 1;
      c.lineTo(Math.cos(a) * rx * rr + 1, cy + Math.sin(a) * ry * rr);
    }
    c.closePath();
    fillStroke(c, p.second, v.ol, 2.4);
    ellipse(c, 1, cy, rx * 0.55, ry * 0.5, 0, shade(p.second, -0.15), null, 0);
    circle(c, rx * 0.8, cy + 2, 2.6, p.accent, v.ol, 1.4);
    c.restore();
  },
  head: (c, v) => {
    const p = v.p;
    const hair = p.extra ?? '#3b1f6e';
    // back hair cap
    ellipse(c, -R * 0.12, -R * 0.12, R * 0.92, R * 0.9, 0, hair, v.ol, 3);
    // face
    ellipse(c, R * 0.1, R * 0.08, R * 0.8, R * 0.78, 0, p.skin, v.ol, 3);
    // swooping bangs
    c.beginPath();
    c.moveTo(-R * 0.75, -R * 0.15);
    c.quadraticCurveTo(-R * 0.55, -R * 1.05, R * 0.55, -R * 0.78);
    c.quadraticCurveTo(R * 0.98, -R * 0.55, R * 0.86, -R * 0.12);
    c.quadraticCurveTo(R * 0.5, -R * 0.5, R * 0.05, -R * 0.42);
    c.quadraticCurveTo(-R * 0.3, -R * 0.38, -R * 0.75, -R * 0.15);
    c.closePath();
    fillStroke(c, hair, v.ol, 2.6);
    c.beginPath();
    c.moveTo(-R * 0.2, -R * 0.82);
    c.quadraticCurveTo(R * 0.3, -R * 0.86, R * 0.62, -R * 0.6);
    c.strokeStyle = rgba(shade(hair, 0.4), 0.9);
    c.lineWidth = 2.2;
    c.stroke();
    // hair tie (a little bow at the base of the ponytail)
    circle(c, -R * 0.5, -R * 0.88, R * 0.2, p.accent, v.ol, 2);
    // blush + star face paint under the front eye
    circle(c, R * 0.42, R * 0.34, R * 0.13, rgba('#ff6b8b', 0.45), null, 0);
    star(c, R * 0.8, R * 0.24, R * 0.14, 0.2, p.accent, v.ol, 1.2);
    eyes(c, v, R * 0.36, -R * 0.03, R * 0.26, shade(VIOLET, -0.3));
    // lashes on the front eye
    if (!v.blink && v.expr !== 'ko' && v.expr !== 'happy') {
      c.strokeStyle = v.ol;
      c.lineWidth = 2;
      c.lineCap = 'round';
      const ex = R * 0.36 + R * 0.15 + 2;
      const ey = -R * 0.03 - R * 0.24;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(ex + i * 3, ey + i * 1.5);
        c.lineTo(ex + i * 3 + 3.5, ey + i * 1.5 - 4);
        c.stroke();
      }
    }
    mouth(c, v, R * 0.56, R * 0.56, R * 0.36);
    // the tiny top hat, worn upside-down: crown on her head, brim on top, a star popping out
    c.save();
    c.translate(R * 0.12, -R * 0.82);
    c.rotate(0.22);
    const hb = R * 0.3; // half width at the crown (bottom)
    const ht = R * 0.42; // half width at the opening (top)
    const hh = R * 0.85;
    c.beginPath();
    c.moveTo(-hb, 0);
    c.lineTo(-ht, -hh);
    c.lineTo(ht, -hh);
    c.lineTo(hb, 0);
    c.closePath();
    fillStroke(c, '#2b2633', v.ol, 2.6);
    c.fillStyle = p.main;
    c.beginPath();
    c.moveTo(-ht * 0.93, -hh * 0.8);
    c.lineTo(ht * 0.93, -hh * 0.8);
    c.lineTo(ht * 0.88, -hh * 0.62);
    c.lineTo(-ht * 0.88, -hh * 0.62);
    c.closePath();
    c.fill();
    ellipse(c, 0, -hh, R * 0.7, R * 0.2, 0, '#2b2633', v.ol, 2.6);
    ellipse(c, 0, -hh, R * 0.44, R * 0.1, 0, '#120a1c', null, 0);
    const pop = Math.sin(v.t * 0.15) * 2;
    star(c, 1, -hh - R * 0.32 + pop, R * 0.24, 0.1 + v.t * 0.02, GOLD, v.ol, 1.6);
    c.restore();
  },
  hand: (c, v, x, y, front) => {
    const p = v.p;
    const s = v.k.scale;
    const fc = v.k.facing;
    const g = v.k.grav;
    // wrist ribbon streaming behind
    const pts: [number, number][] = [];
    for (let i = 0; i <= 5; i++) {
      const w = Math.sin(v.t * 0.25 + i * 0.9 + (front ? 0 : 1.7)) * 3 * (i / 5);
      pts.push([x - fc * (i * 4 + w) * s, y + g * i * 5 * s]);
    }
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = v.ol;
    c.lineWidth = 5.6 * s;
    c.stroke();
    c.strokeStyle = front ? p.accent : shade(p.accent, -0.2);
    c.lineWidth = 2.6 * s;
    c.stroke();
    // glove-less hand with a cuff
    circle(c, x, y, 6.5 * s, front ? p.skin : shade(p.skin, -0.15), v.ol, 2.4);
    circle(c, x - 2 * s, y - 2 * s, 2 * s, rgba('#ffffff', 0.5), null, 0);
  },
  foot: (c, v, front) => {
    const k = v.k;
    const pt = front ? k.footF : k.footB;
    const phi = front ? k.ang.shF : k.ang.shB;
    boneFrame(c, v, pt, phi - 180);
    const col = front ? v.p.second : shade(v.p.second, -0.2);
    // pointed ballet slipper
    c.beginPath();
    c.moveTo(-7, -9);
    c.lineTo(6, -9);
    c.quadraticCurveTo(18, -6, 21, 0);
    c.lineTo(-8, 0);
    c.quadraticCurveTo(-11, -5, -7, -9);
    c.closePath();
    fillStroke(c, col, v.ol, 2.6);
    // ribbon ties crossing up the ankle
    c.strokeStyle = front ? v.p.accent : shade(v.p.accent, -0.2);
    c.lineWidth = 2.6;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-5, -9);
    c.lineTo(4, -20);
    c.moveTo(4, -9);
    c.lineTo(-5, -20);
    c.stroke();
    void shoe;
    c.restore();
  },
  weapon: (c, v) => {
    // the trapeze bar during Trapeze Swing
    if (moveId(v) !== 'uspec' || v.f.mf > 31) return;
    const k = v.k;
    const s = k.scale;
    const mx = (k.handF[0] + k.handB[0]) / 2;
    const my = (k.handF[1] + k.handB[1]) / 2;
    let ax = mx - k.shoulder[0];
    let ay = my - k.shoulder[1];
    const al = Math.sqrt(ax * ax + ay * ay) || 1;
    ax /= al;
    ay /= al;
    const px = -ay;
    const py = ax;
    const half = 30 * s;
    const ex1: [number, number] = [mx + px * half, my + py * half];
    const ex2: [number, number] = [mx - px * half, my - py * half];
    // ropes up into the sky (the circus provides)
    for (const e of [ex1, ex2]) {
      const g = c.createLinearGradient(e[0], e[1], e[0] + ax * 300, e[1] + ay * 300);
      g.addColorStop(0, '#f6efe2');
      g.addColorStop(1, 'rgba(246,239,226,0)');
      c.strokeStyle = g;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(e[0], e[1]);
      c.lineTo(e[0] + ax * 300, e[1] + ay * 300);
      c.stroke();
    }
    c.lineCap = 'round';
    c.strokeStyle = v.ol;
    c.lineWidth = 10 * s;
    c.beginPath();
    c.moveTo(ex1[0], ex1[1]);
    c.lineTo(ex2[0], ex2[1]);
    c.stroke();
    c.strokeStyle = GOLD;
    c.lineWidth = 5 * s;
    c.stroke();
    circle(c, ex1[0], ex1[1], 4.5 * s, v.p.accent, v.ol, 2);
    circle(c, ex2[0], ex2[1], 4.5 * s, v.p.accent, v.ol, 2);
  },
  front: (c, v) => {
    const f = v.f;
    const st = v.st;
    const id = moveId(v);
    if (id === 'dspecDive') drawPortal(c, v);
    // flip sparkle: stars orbit her while gravity turns over
    if (id === 'dspec' && f.mf <= 18) {
      const cx = v.k.hip[0];
      const cy = v.k.hip[1];
      const a0 = f.mf * 0.45;
      const rr = 52 + f.mf * 1.5;
      c.save();
      c.globalAlpha *= Math.max(0, 1 - f.mf / 20);
      for (let i = 0; i < 6; i++) {
        const a = a0 + (i * Math.PI) / 3;
        star(c, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8, 7, a, i % 2 ? GOLD : VIOLET, OUTLINE, 2);
      }
      c.restore();
    }
    // safety-net snap: a burst where gravity snapped back
    if (f.v[1] > 0 && st.frame - f.v[1] < 24 && st.frame >= f.v[1]) {
      const q = (st.frame - f.v[1]) / 24;
      c.save();
      c.strokeStyle = rgba(VIOLET, 1 - q);
      c.lineWidth = 6;
      c.beginPath();
      c.arc(f.x, f.y - 50, 40 + q * 90, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    // self-flipped: little arrows by her feet show which way she falls
    if (f.grav < 0 && f.gravT === 0 && f.act !== A.DEAD) {
      const bob = (v.t % 30) / 30;
      c.save();
      c.globalAlpha *= 0.75;
      for (const s of [-1, 1]) {
        const x = f.x + s * 22;
        const y = f.y - 10 - bob * 16;
        c.beginPath();
        c.moveTo(x - 6, y + 6);
        c.lineTo(x, y - 2);
        c.lineTo(x + 6, y + 6);
        c.strokeStyle = VIOLET;
        c.lineWidth = 4;
        c.lineCap = 'round';
        c.stroke();
      }
      c.restore();
    }
    // badges on everyone whose gravity is flipped on a timer
    for (const t of st.fighters) {
      if (t.out || t.act === A.DEAD || t.grav > 0 || t.gravT <= 0) continue;
      flipBadge(c, st, t, v.t);
    }
  },
};

// ------------------------------------------------------------------ projectiles

registerProjDraw('gwell', (c: CanvasRenderingContext2D, p: Proj, r: number, t: number) => {
  const fuse = 92;
  const late = p.age > fuse - 18 ? (p.age - (fuse - 18)) / 18 : 0;
  const pulse = 1 + Math.sin(t * 0.4) * 0.06 + late * 0.35;
  c.save();
  // the pull zone
  c.setLineDash([10, 14]);
  c.lineDashOffset = -t * 1.5;
  c.strokeStyle = rgba(VIOLET, 0.22);
  c.lineWidth = 3;
  c.beginPath();
  c.arc(p.x, p.y, 200, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);
  // infalling sparks
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 10; i++) {
    const ph = ((t * 0.02 + i * 0.1) % 1 + 1) % 1;
    const rr = r * (3.6 - ph * 3);
    const a = i * 2.4 + ph * 5;
    circle(c, p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.55, 2.5 + ph * 2, rgba(i % 2 ? '#c9b8ff' : GOLD, 0.6 * ph + 0.2), null, 0);
  }
  // accretion disk (back half, core, front half)
  c.globalCompositeOperation = 'source-over';
  ellipse(c, p.x, p.y, r * 2.3 * pulse, r * 0.62 * pulse, -0.25, rgba(VIOLET, 0.35), null, 0);
  circle(c, p.x, p.y, r * 0.95 * pulse, '#0d0618', OUTLINE, 3);
  circle(c, p.x, p.y, r * 1.12 * pulse, '', rgba('#c9b8ff', 0.8), 2.5);
  c.save();
  c.translate(p.x, p.y);
  c.rotate(-0.25);
  c.beginPath();
  c.ellipse(0, 0, r * 2.3 * pulse, r * 0.62 * pulse, 0, 0, Math.PI);
  c.strokeStyle = late > 0 && t % 4 < 2 ? '#ffffff' : '#c9b8ff';
  c.lineWidth = 5;
  c.stroke();
  c.beginPath();
  c.ellipse(0, 0, r * 1.7 * pulse, r * 0.42 * pulse, 0, 0.2 + t * 0.1, 1.6 + t * 0.1);
  c.strokeStyle = GOLD;
  c.lineWidth = 3;
  c.stroke();
  c.restore();
  c.restore();
});

registerProjDraw('polarity', (c: CanvasRenderingContext2D, p: Proj, r: number, t: number) => {
  const rot = p.age * 0.12 * (p.facing || 1);
  c.save();
  // sparkle trail
  c.globalCompositeOperation = 'lighter';
  for (let i = 1; i <= 5; i++) circle(c, p.x - p.vx * i * 1.6, p.y - p.vy * i * 1.6, r * (0.5 - i * 0.07), rgba(i % 2 ? VIOLET : GOLD, 0.35), null, 0);
  c.globalCompositeOperation = 'source-over';
  c.translate(p.x, p.y);
  c.rotate(rot);
  // two-tone bubble
  c.beginPath();
  c.arc(0, 0, r, Math.PI, 0);
  c.closePath();
  c.fillStyle = rgba(VIOLET, 0.85);
  c.fill();
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI);
  c.closePath();
  c.fillStyle = rgba(GOLD, 0.85);
  c.fill();
  // arrows: up on the violet half, down on the gold half
  c.strokeStyle = '#ffffff';
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, -r * 0.2);
  c.lineTo(0, -r * 0.75);
  c.moveTo(-r * 0.25, -r * 0.5);
  c.lineTo(0, -r * 0.78);
  c.lineTo(r * 0.25, -r * 0.5);
  c.stroke();
  c.strokeStyle = OUTLINE;
  c.beginPath();
  c.moveTo(0, r * 0.2);
  c.lineTo(0, r * 0.75);
  c.moveTo(-r * 0.25, r * 0.5);
  c.lineTo(0, r * 0.78);
  c.lineTo(r * 0.25, r * 0.5);
  c.stroke();
  c.restore();
  circle(c, p.x, p.y, r, '', OUTLINE, 3);
  circle(c, p.x, p.y, r * 1.18 + Math.sin(t * 0.5) * 1.5, '', rgba('#ffffff', 0.5), 1.5);
  circle(c, p.x - r * 0.38, p.y - r * 0.4, r * 0.22, 'rgba(255,255,255,0.85)', null, 0);
});

registerProjDraw('hoop', (c: CanvasRenderingContext2D, p: Proj, r: number, t: number) => {
  const fuse = 74;
  const hot = p.age > fuse - 20 ? (p.age - (fuse - 20)) / 20 : 0;
  const pop = Math.min(1, p.age / 10);
  const rr = r * (0.4 + 0.6 * pop) * (1 + hot * 0.12 * Math.sin(t * 0.9));
  c.save();
  // hanging rope
  c.strokeStyle = 'rgba(246,239,226,0.7)';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(p.x, p.y - rr);
  c.lineTo(p.x, p.y - rr - 170);
  c.stroke();
  // glow
  c.globalCompositeOperation = 'lighter';
  circle(c, p.x, p.y, rr + 10, '', rgba(hot > 0 ? '#ffffff' : GOLD, 0.25 + hot * 0.5), 18);
  c.globalCompositeOperation = 'source-over';
  // candy-striped ring
  circle(c, p.x, p.y, rr, '', OUTLINE, 20);
  circle(c, p.x, p.y, rr, '', '#fff4e6', 13);
  c.setLineDash([16, 16]);
  c.lineDashOffset = -t * 3;
  circle(c, p.x, p.y, rr, '', hot > 0 && t % 4 < 2 ? '#ff9a2a' : '#e8364f', 13);
  c.setLineDash([]);
  // sparkles around
  for (let i = 0; i < 4; i++) {
    const a = t * 0.06 + (i * Math.PI) / 2;
    star(c, p.x + Math.cos(a) * (rr + 18), p.y + Math.sin(a) * (rr + 18), 7, a, GOLD, OUTLINE, 2);
  }
  c.restore();
});
