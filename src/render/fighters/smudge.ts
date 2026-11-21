// Smudge: street-artist raccoon from Canvas Town. Slouchy beanie with ear holes, bandit mask, buck-tooth grin,
// paint-splattered overalls over a tee, high-tops, a giant paintbrush (a paint roller for Down-B) and a bushy tail
// ringed in paint colours. Anything that is actual paint (brush tip, drips, jets, shots) uses the PLAYER colour,
// exactly like the paint the engine draws on the floor, so it is always clear whose paint is whose.
import { A } from '../../sim/acts';
import { FIGHTERS } from '../../sim/data';
import type { Proj } from '../../sim/types';
import { smudgeCanvas, smudgeOnOwnPaint } from '../../data/fighters/smudge';
import { boneFrame, circle, ellipse, eyes, fillStroke, mouth, OUTLINE, rgba, rrect, shade, shoe, type ArtDef, type FView } from '../art';
import { defaultTorso } from '../fighterDraw';
import { PLAYER_TINTS, TEAM_TINTS } from '../renderer';
import { registerProjDraw } from '../things';

const RIG = { thigh: 22, shin: 21, torso: 33, head: 23, upper: 19, fore: 17, girth: 15, limb: 7 };
const BRUSH = 56;
const TAIL = 50;

function moveId(v: FView): string {
  if (v.f.act !== A.MOVE) return '';
  return FIGHTERS[v.f.def].moveIds[v.f.mv] ?? '';
}

/** the paint colour: this player's colour (same as the floor paint) */
function paintCol(v: FView): string {
  const f = v.f;
  const t = v.st.cfg.teams ? TEAM_TINTS[f.team % TEAM_TINTS.length] : PLAYER_TINTS[f.i % PLAYER_TINTS.length];
  return t ?? v.p.accent;
}

function star4(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string): void {
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.closePath();
  c.fillStyle = col;
  c.fill();
}

/** a paint drop (teardrop, point up) centred at x,y */
function drop(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, olw: number): void {
  c.beginPath();
  c.moveTo(x, y - r * 2);
  c.quadraticCurveTo(x + r * 1.15, y - r * 0.25, x, y + r);
  c.quadraticCurveTo(x - r * 1.15, y - r * 0.25, x, y - r * 2);
  c.closePath();
  if (olw > 0) fillStroke(c, col, OUTLINE, olw);
  else {
    c.fillStyle = col;
    c.fill();
  }
}

function ear(c: CanvasRenderingContext2D, x: number, y: number, tilt: number, s: number, col: string, inner: string, ol: string): void {
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  c.scale(s, s);
  c.beginPath();
  c.moveTo(-8, 5);
  c.quadraticCurveTo(-8, -11, 0, -15);
  c.quadraticCurveTo(8, -11, 8, 5);
  c.closePath();
  fillStroke(c, col, ol, 2.6);
  c.beginPath();
  c.moveTo(-4, 3);
  c.quadraticCurveTo(-4, -7, 0, -10);
  c.quadraticCurveTo(4, -7, 4, 3);
  c.closePath();
  c.fillStyle = inner;
  c.fill();
  c.restore();
}

/** a short tee sleeve over the top of an upper arm (world coords) */
function sleeve(c: CanvasRenderingContext2D, v: FView, front: boolean): void {
  const k = v.k;
  const a = k.shoulder;
  const e = front ? k.elbowF : k.elbowB;
  const b: [number, number] = [a[0] + (e[0] - a[0]) * 0.36, a[1] + (e[1] - a[1]) * 0.36];
  const s = k.scale;
  const col = front ? v.p.second : shade(v.p.second, -0.22);
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(a[0], a[1]);
  c.lineTo(b[0], b[1]);
  c.strokeStyle = v.ol;
  c.lineWidth = 14 * s + 6.4 * s;
  c.stroke();
  c.strokeStyle = col;
  c.lineWidth = 14 * s;
  c.stroke();
}

// ------------------------------------------------------------------ brush and roller (weapon frame: -y = toward the tip)

function drawBrush(c: CanvasRenderingContext2D, v: FView, wet: boolean): void {
  const L = BRUSH;
  const ol = v.ol;
  const paint = paintCol(v);
  // handle
  rrect(c, -3.2, -L * 0.64, 6.4, L * 0.64 + 13, 3);
  fillStroke(c, '#c07a3c', ol, 2.4);
  c.fillStyle = shade('#c07a3c', -0.25);
  c.fillRect(-3.2, -L * 0.5, 2.2, L * 0.5 + 10);
  // ferrule
  rrect(c, -6, -L * 0.77, 12, L * 0.15, 2.5);
  fillStroke(c, '#c9d2e3', ol, 2.4);
  c.strokeStyle = '#8b93a8';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-5, -L * 0.7);
  c.lineTo(5, -L * 0.7);
  c.stroke();
  // bristles
  const tuft = (): void => {
    c.beginPath();
    c.moveTo(-6, -L * 0.75);
    c.bezierCurveTo(-11, -L * 0.84, -9, -L * 0.98, 0, -L * 1.08);
    c.bezierCurveTo(9, -L * 0.98, 11, -L * 0.84, 6, -L * 0.75);
    c.closePath();
  };
  tuft();
  c.fillStyle = '#f0dcac';
  c.fill();
  c.save();
  tuft();
  c.clip();
  // paint-soaked tip
  c.beginPath();
  c.moveTo(-14, -L * 0.86);
  c.quadraticCurveTo(-6, -L * 0.82, -2, -L * 0.88);
  c.quadraticCurveTo(3, -L * 0.93, 7, -L * 0.85);
  c.quadraticCurveTo(10, -L * 0.82, 14, -L * 0.87);
  c.lineTo(14, -L * 1.2);
  c.lineTo(-14, -L * 1.2);
  c.closePath();
  c.fillStyle = paint;
  c.fill();
  c.strokeStyle = rgba('#ffffff', 0.55);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-3, -L * 0.8);
  c.lineTo(-1.5, -L * 1.0);
  c.stroke();
  c.restore();
  tuft();
  c.strokeStyle = ol;
  c.lineWidth = 2.6;
  c.lineJoin = 'round';
  c.stroke();
  if (wet) {
    // a fat drip hanging off the tip
    const k = (v.t % 24) / 24;
    drop(c, 3, -L * 1.06 + k * 0, 2.5 + k * 1.5, paint, 1.6);
  }
}

function drawRoller(c: CanvasRenderingContext2D, v: FView): void {
  const L = BRUSH;
  const ol = v.ol;
  const paint = paintCol(v);
  // grip
  rrect(c, -4.5, -10, 9, 24, 4);
  fillStroke(c, v.p.main, ol, 2.4);
  // bent metal frame
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(0, -8);
  c.lineTo(0, -L * 0.72);
  c.lineTo(10, -L * 0.84);
  c.lineTo(0, -L);
  c.strokeStyle = ol;
  c.lineWidth = 7.5;
  c.stroke();
  c.strokeStyle = '#c9d2e3';
  c.lineWidth = 3.5;
  c.stroke();
  // the roller (seen end-on), rolling with the ground speed
  const R = 19;
  circle(c, 0, -L, R, paint, ol, 3.2);
  c.save();
  c.beginPath();
  c.arc(0, -L, R, 0, Math.PI * 2);
  c.clip();
  c.translate(0, -L);
  c.rotate(v.f.x / R);
  c.fillStyle = shade(paint, -0.2);
  for (let i = 0; i < 4; i++) {
    c.rotate(Math.PI / 2);
    c.fillRect(-3, -R - 2, 6, R * 0.7);
  }
  c.restore();
  circle(c, 0, -L, R * 0.36, '#c9d2e3', ol, 2.4);
  circle(c, -R * 0.35, -L - R * 0.4, R * 0.18, rgba('#ffffff', 0.6), null, 0);
}

// ------------------------------------------------------------------ world-space extras

function skateboard(c: CanvasRenderingContext2D, v: FView): void {
  const f = v.f;
  const s = v.k.scale;
  const mf = f.mf;
  if (mf > 34) return;
  const ol = v.ol;
  c.save();
  // after the ride, the board kicks up and flips into Smudge's paw
  let x = f.x;
  let y = f.y - 4 * s * v.k.grav;
  let rot = 0;
  if (mf > 20) {
    const t = (mf - 20) / 14;
    x += f.facing * 20 * t * s;
    y -= (Math.sin(t * Math.PI) * 50 + t * 10) * s * v.k.grav;
    rot = t * Math.PI * 2 * f.facing;
  }
  c.translate(x, y);
  c.rotate(rot);
  c.scale(f.facing * s, v.k.grav * s);
  rrect(c, -34, -10, 68, 9, 4.5);
  fillStroke(c, v.p.extra ?? '#ffcf3a', ol, 2.6);
  c.fillStyle = v.p.accent;
  c.fillRect(-16, -9.5, 12, 8);
  circle(c, -20, 2, 5.5, '#f4f1ea', ol, 2.4);
  circle(c, 20, 2, 5.5, '#f4f1ea', ol, 2.4);
  c.restore();
}

function canvasPainting(c: CanvasRenderingContext2D, v: FView): void {
  const f = v.f;
  const mf = f.mf;
  const [cx, cy] = smudgeCanvas(v.st);
  const pop = Math.min(1, (mf + 3) / 8);
  const scl = pop < 1 ? pop * 1.12 : 1 + Math.max(0, 0.06 - (mf - 5) * 0.01);
  const fade = mf > 72 ? Math.max(0, 1 - (mf - 72) / 12) : 1;
  const W = 480 * scl;
  const H = 280 * scl;
  const paint = paintCol(v);
  const p = v.p;
  c.save();
  c.globalAlpha *= fade;
  // rigging wires up into the studio ceiling
  c.strokeStyle = 'rgba(40,30,60,0.9)';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(cx - W * 0.35, cy - H / 2);
  c.lineTo(cx - W * 0.2, cy - H / 2 - 600);
  c.moveTo(cx + W * 0.35, cy - H / 2);
  c.lineTo(cx + W * 0.2, cy - H / 2 - 600);
  c.stroke();
  // golden frame
  rrect(c, cx - W / 2 - 22, cy - H / 2 - 22, W + 44, H + 44, 10);
  fillStroke(c, '#e0a93a', OUTLINE, 6);
  rrect(c, cx - W / 2 - 10, cy - H / 2 - 10, W + 20, H + 20, 6);
  fillStroke(c, '#b9802a', OUTLINE, 3);
  c.fillStyle = '#fff8ec';
  c.fillRect(cx - W / 2, cy - H / 2, W, H);
  // the painting appears stroke by stroke
  const prog = Math.max(0, Math.min(1, (mf - 4) / 36));
  c.save();
  c.beginPath();
  c.rect(cx - W / 2, cy - H / 2, W * prog, H);
  c.clip();
  const bands = [p.accent, p.extra ?? p.main, p.main, paint];
  for (let i = 0; i < 4; i++) {
    c.fillStyle = rgba(bands[i].startsWith('#') ? bands[i] : '#ff4fd2', 0.85);
    c.beginPath();
    const y0 = cy - H / 2 + (i * H) / 4;
    c.moveTo(cx - W / 2, y0);
    for (let x = 0; x <= W; x += W / 8) c.lineTo(cx - W / 2 + x, y0 + Math.sin(x * 0.02 + i) * 14 + H / 4 + 6);
    c.lineTo(cx + W / 2, y0);
    c.closePath();
    c.fill();
  }
  // a giant heart and the title
  c.save();
  c.translate(cx, cy - 10 * scl);
  c.scale(scl, scl);
  c.beginPath();
  c.moveTo(0, 70);
  c.bezierCurveTo(-140, -10, -90, -120, 0, -60);
  c.bezierCurveTo(90, -120, 140, -10, 0, 70);
  c.closePath();
  fillStroke(c, '#ff3a6e', OUTLINE, 6);
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.beginPath();
  c.ellipse(-50, -45, 18, 10, -0.6, 0, Math.PI * 2);
  c.fill();
  c.font = '900 46px Bungee, Impact, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 8;
  c.strokeStyle = OUTLINE;
  c.strokeText('MY BROS', 0, 0);
  c.fillStyle = '#fff8ec';
  c.fillText('MY BROS', 0, 0);
  c.font = 'italic 900 26px Bungee, Impact, sans-serif';
  c.lineWidth = 5;
  c.strokeText('~Smudge', 160, 104);
  c.fillStyle = paint;
  c.fillText('~Smudge', 160, 104);
  c.restore();
  c.restore();
  // the wet edge of the stroke being painted
  if (prog > 0 && prog < 1) {
    c.fillStyle = paint;
    for (let i = 0; i < 6; i++) circle(c, cx - W / 2 + W * prog, cy - H / 2 + ((i + 0.5) * H) / 6 + Math.sin(v.t * 0.5 + i) * 8, 10, paint, null, 0);
  }
  // glow while the paint waves leave the canvas
  if ((mf >= 16 && mf < 22) || (mf >= 30 && mf < 36) || (mf >= 46 && mf < 54)) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = rgba(paint.startsWith('#') ? paint : '#ff4fd2', 0.3);
    c.fillRect(cx - W / 2, cy - H / 2, W, H);
    c.restore();
  }
  c.restore();
}

function paintedHeart(c: CanvasRenderingContext2D, v: FView): void {
  const f = v.f;
  const t = Math.min(1, f.af / 46);
  const s = v.k.scale;
  const x = f.x + f.facing * 70 * s;
  const y = f.y - 110 * s * v.k.grav;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  // traced as two loops that meet at the point
  c.beginPath();
  const N = 40;
  for (let i = 0; i <= N * t; i++) {
    const a = (i / N) * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(a), 3);
    const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    if (i === 0) c.moveTo(hx * 1.6, hy * 1.6);
    else c.lineTo(hx * 1.6, hy * 1.6);
  }
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = OUTLINE;
  c.lineWidth = 9;
  c.stroke();
  c.strokeStyle = paintCol(v);
  c.lineWidth = 5;
  c.stroke();
  if (f.af > 46) {
    c.font = '900 13px Bungee, Impact, sans-serif';
    c.textAlign = 'center';
    c.fillStyle = '#ffffff';
    c.lineWidth = 4;
    c.strokeStyle = OUTLINE;
    c.strokeText('BRO', 0, 2);
    c.fillText('BRO', 0, 2);
  }
  c.restore();
}

export const smudgeArt: ArtDef = {
  limb: 11,
  handR: 7.5,
  footL: 23,
  palettes: [
    { name: 'Canvas Town', main: '#3a6fd8', second: '#f4f1ea', accent: '#ff4fd2', skin: '#8e93a3', extra: '#ffcf3a' },
    { name: 'Neon Tag', main: '#2b2633', second: '#3affd5', accent: '#ff4fd2', skin: '#7c8091', extra: '#ffe14f' },
    { name: 'Sunset Mural', main: '#ff7a3a', second: '#fff1dc', accent: '#8a55ff', skin: '#a38b7c', extra: '#3a2a8a' },
    { name: 'Bubblegum Bomb', main: '#ff6fb5', second: '#fff3fa', accent: '#3a8dff', skin: '#9fa1ad', extra: '#7ef0ff' },
    { name: 'Mint Condition', main: '#2fb36a', second: '#f2fff4', accent: '#ff6a3a', skin: '#717986', extra: '#2b2633' },
    { name: 'Gallery Gala', main: '#f4f1ea', second: '#2b2633', accent: '#e43a3a', skin: '#5f6373', extra: '#2b2633' },
    { name: 'Midnight Spray', main: '#3a2a8a', second: '#ff3a6e', accent: '#ffe14f', skin: '#565469', extra: '#3affd5' },
    { name: 'Golden Frame', main: '#c9962e', second: '#7a2b77', accent: '#3affd5', skin: '#8a8078', extra: '#ff3a6e' },
  ],
  upperArm: (p) => p.skin,
  foreArm: (p) => p.skin,
  thigh: (p) => p.main,
  shin: (p) => p.main,
  back: (c, v) => {
    const id = moveId(v);
    if (id === 'ult') canvasPainting(c, v);
    if (id === 'dash') skateboard(c, v);
    // own paint: a glowing puddle of colour under the feet
    if (smudgeOnOwnPaint(v.st, v.f)) {
      const col = paintCol(v);
      const pulse = 0.5 + 0.5 * Math.sin(v.t * 0.25);
      c.save();
      c.globalCompositeOperation = 'lighter';
      ellipse(c, v.f.x, v.f.y, (52 + pulse * 8) * v.k.scale, 11 * v.k.scale, 0, rgba(col.startsWith('#') ? col : '#ff4fd2', 0.32 + pulse * 0.2), null, 0);
      c.restore();
    }
  },
  tail: (c, v) => {
    const k = v.k;
    const p = v.p;
    const sway = v.f.act === A.MOVE ? 0 : Math.sin(v.t * 0.08 + v.f.i) * 6;
    boneFrame(c, v, k.hip, k.ang.tail + sway);
    // a bushy tail along the bone whose tip curls up (+x in this frame), sampled as two edges
    const T = TAIL;
    const N = 25;
    const lo: [number, number][] = [];
    const hi: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const cx = 24 * s * s;
      const cy = -T * s;
      const tx = 48 * s;
      const ty = -T;
      const tl = Math.sqrt(tx * tx + ty * ty);
      const nx = -ty / tl;
      const ny = tx / tl;
      const w = 12.5 * Math.sqrt(Math.max(0, Math.sin(Math.PI * Math.min(1, 0.1 + 0.9 * s)))) + (s < 1 ? 0.5 : 0);
      lo.push([cx - nx * w, cy - ny * w]);
      hi.push([cx + nx * w, cy + ny * w]);
    }
    const band = (a: number, b: number): void => {
      const i0 = Math.round(a * N);
      const i1 = Math.round(b * N);
      c.beginPath();
      c.moveTo(lo[i0][0], lo[i0][1]);
      for (let i = i0 + 1; i <= i1; i++) c.lineTo(lo[i][0], lo[i][1]);
      for (let i = i1; i >= i0; i--) c.lineTo(hi[i][0], hi[i][1]);
      c.closePath();
    };
    band(0, 1);
    c.fillStyle = p.skin;
    c.fill();
    // rings: paint colours, with fur between, and a dark tip
    const rings: [number, number, string][] = [
      [0.3, 0.42, p.accent],
      [0.52, 0.63, p.extra ?? p.main],
      [0.72, 0.82, p.main],
      [0.88, 1, shade(p.skin, -0.62)],
    ];
    for (const [a, b, col] of rings) {
      band(a, b);
      c.fillStyle = col;
      c.fill();
    }
    // shade on the underside
    c.beginPath();
    c.moveTo(lo[0][0], lo[0][1]);
    for (let i = 1; i <= N; i++) c.lineTo(lo[i][0] * 0.55 + (24 * (i / N) ** 2) * 0.45, lo[i][1]);
    for (let i = N; i >= 0; i--) c.lineTo(lo[i][0], lo[i][1]);
    c.closePath();
    c.fillStyle = 'rgba(0,0,0,0.16)';
    c.fill();
    band(0, 1);
    c.strokeStyle = v.ol;
    c.lineWidth = 3;
    c.lineJoin = 'round';
    c.stroke();
    c.restore();
  },
  torso: (c, v) => {
    const p = v.p;
    const ol = v.ol;
    sleeve(c, v, false);
    defaultTorso(c, v, RIG, p.second);
    boneFrame(c, v, v.k.hip, v.k.ang.torso);
    const L = RIG.torso;
    const g = RIG.girth;
    const body = (): void => rrect(c, -g, -L - g * 0.35, g * 2, L + g * 0.8, g * 0.95);
    c.save();
    body();
    c.clip();
    // overalls: trousers up to the waist, bib on the chest
    c.fillStyle = p.main;
    c.fillRect(-g - 2, -L * 0.42, g * 2 + 4, L + g);
    c.fillRect(-g * 0.25, -L * 0.88, g * 1.35, L * 0.5);
    c.fillStyle = shade(p.main, -0.22);
    c.fillRect(-g * 1.2, -L * 0.42, g * 0.62, L + g);
    // splatters
    circle(c, g * 0.5, -L * 0.18, 3.4, p.accent, null, 0);
    circle(c, g * 0.75, -L * 0.1, 1.8, p.accent, null, 0);
    circle(c, -g * 0.3, -L * 0.05, 2.6, p.extra ?? p.accent, null, 0);
    circle(c, g * 0.1, -L * 0.74, 2.2, p.extra ?? p.accent, null, 0);
    c.restore();
    // bib edges, waist seam, strap
    c.strokeStyle = ol;
    c.lineWidth = 2.4;
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-g, -L * 0.42);
    c.lineTo(-g * 0.25, -L * 0.42);
    c.lineTo(-g * 0.25, -L * 0.88);
    c.lineTo(g * 1.0, -L * 0.88);
    c.stroke();
    c.beginPath();
    c.moveTo(-g * 0.25, -L * 0.86);
    c.quadraticCurveTo(-g * 0.6, -L * 1.0, -g * 0.95, -L * 0.96);
    c.strokeStyle = ol;
    c.lineWidth = 6.5;
    c.stroke();
    c.strokeStyle = shade(p.main, -0.1);
    c.lineWidth = 3.2;
    c.stroke();
    circle(c, -g * 0.05, -L * 0.8, 2.6, '#ffd23a', ol, 1.6);
    circle(c, g * 0.78, -L * 0.8, 2.6, '#ffd23a', ol, 1.6);
    // bib pocket with a little spare brush
    c.beginPath();
    c.moveTo(g * 0.58, -L * 0.72);
    c.lineTo(g * 0.62, -L * 0.98);
    c.strokeStyle = ol;
    c.lineWidth = 4.5;
    c.stroke();
    c.strokeStyle = '#c07a3c';
    c.lineWidth = 2;
    c.stroke();
    circle(c, g * 0.63, -L * 1.0, 2.6, p.accent, ol, 1.4);
    rrect(c, g * 0.12, -L * 0.74, g * 0.78, L * 0.22, 2.5);
    fillStroke(c, shade(p.main, 0.12), ol, 2);
    // spray can in the side pocket
    rrect(c, g * 0.25, -L * 0.36, 8, 15, 2.5);
    fillStroke(c, '#c9d2e3', ol, 2);
    c.fillStyle = p.accent;
    c.fillRect(g * 0.25 + 1, -L * 0.36 + 5, 6, 5);
    rrect(c, g * 0.25 + 2, -L * 0.36 - 4, 4, 4, 1);
    fillStroke(c, '#2b2633', ol, 1.4);
    c.restore();
  },
  head: (c, v) => {
    const R = RIG.head;
    const p = v.p;
    const ol = v.ol;
    const fur = p.skin;
    const light = shade(fur, 0.7);
    const dark = shade(fur, -0.62);
    // cheek fluff behind the head
    c.beginPath();
    c.moveTo(-R * 0.5, R * 0.7);
    c.lineTo(-R * 1.1, R * 0.5);
    c.lineTo(-R * 0.88, R * 0.26);
    c.lineTo(-R * 1.2, R * 0.04);
    c.lineTo(-R * 0.8, -R * 0.2);
    c.closePath();
    fillStroke(c, shade(fur, -0.08), ol, 2.6);
    // head
    ellipse(c, 0, 0.5, R * 0.98, R * 0.9, 0, fur, ol, 3);
    // pointy snout
    c.beginPath();
    c.moveTo(R * 0.12, R * 0.12);
    c.quadraticCurveTo(R * 0.7, -R * 0.02, R * 1.18, R * 0.16);
    c.quadraticCurveTo(R * 1.36, R * 0.26, R * 1.16, R * 0.44);
    c.quadraticCurveTo(R * 0.75, R * 0.82, R * 0.2, R * 0.72);
    c.closePath();
    fillStroke(c, light, ol, 2.6);
    // white brow stripe above the mask
    c.beginPath();
    c.moveTo(-R * 0.5, -R * 0.24);
    c.quadraticCurveTo(-R * 0.1, -R * 0.7, R * 0.42, -R * 0.6);
    c.quadraticCurveTo(R * 0.84, -R * 0.6, R * 0.98, -R * 0.3);
    c.lineTo(R * 0.9, -R * 0.14);
    c.quadraticCurveTo(R * 0.3, -R * 0.44, -R * 0.5, -R * 0.08);
    c.closePath();
    c.fillStyle = light;
    c.fill();
    // bandit mask
    c.beginPath();
    c.moveTo(-R * 0.68, -R * 0.04);
    c.quadraticCurveTo(-R * 0.3, -R * 0.46, R * 0.3, -R * 0.4);
    c.quadraticCurveTo(R * 0.78, -R * 0.46, R * 0.98, -R * 0.16);
    c.quadraticCurveTo(R * 0.9, R * 0.22, R * 0.52, R * 0.18);
    c.quadraticCurveTo(R * 0.12, R * 0.34, -R * 0.22, R * 0.22);
    c.quadraticCurveTo(-R * 0.52, R * 0.15, -R * 0.68, -R * 0.04);
    c.closePath();
    fillStroke(c, dark, ol, 2);
    eyes(c, v, R * 0.38, -R * 0.08, R * 0.32, '#8a4a18', { gap: R * 0.66 });
    // nose
    ellipse(c, R * 1.24, R * 0.25, R * 0.17, R * 0.13, 0.2, '#2a1a2a', ol, 2);
    circle(c, R * 1.2, R * 0.2, R * 0.05, 'rgba(255,255,255,0.7)', null, 0);
    // mouth + buck teeth
    const e = v.expr;
    mouth(c, v, R * 0.82, R * 0.56, R * 0.36);
    if (e !== 'hurt' && e !== 'ko') {
      rrect(c, R * 0.76, R * 0.56 + (e === 'happy' ? 1 : 0), R * 0.2, R * 0.2, 1.5);
      fillStroke(c, '#ffffff', ol, 1.6);
      c.beginPath();
      c.moveTo(R * 0.86, R * 0.57);
      c.lineTo(R * 0.86, R * 0.75);
      c.lineWidth = 1.2;
      c.stroke();
    }
    // a fresh splat on the cheek
    circle(c, R * 0.0, R * 0.5, R * 0.11, p.accent, null, 0);
    circle(c, R * 0.14, R * 0.62, R * 0.05, p.accent, null, 0);
    // slouchy beanie (sits high so the brows and mask read)
    const hat = p.extra ?? '#ffcf3a';
    c.beginPath();
    c.moveTo(-R * 0.5, -R * 1.08);
    c.quadraticCurveTo(-R * 1.55, -R * 1.08, -R * 1.42, -R * 0.24);
    c.quadraticCurveTo(-R * 1.05, -R * 0.38, -R * 0.85, -R * 0.58);
    c.closePath();
    fillStroke(c, shade(hat, -0.12), ol, 2.6);
    circle(c, -R * 1.42, -R * 0.2, R * 0.22, '#f4f1ea', ol, 2.4);
    c.beginPath();
    c.moveTo(-R * 0.96, -R * 0.44);
    c.bezierCurveTo(-R * 1.0, -R * 1.42, R * 0.6, -R * 1.46, R * 0.78, -R * 0.6);
    c.closePath();
    fillStroke(c, hat, ol, 3);
    circle(c, -R * 0.2, -R * 0.96, R * 0.09, p.accent, null, 0);
    circle(c, R * 0.25, -R * 1.08, R * 0.06, p.accent, null, 0);
    // turned-up cuff
    c.beginPath();
    c.moveTo(-R * 0.98, -R * 0.44);
    c.quadraticCurveTo(-R * 0.1, -R * 0.76, R * 0.8, -R * 0.6);
    c.lineCap = 'round';
    c.strokeStyle = ol;
    c.lineWidth = 9;
    c.stroke();
    c.strokeStyle = shade(hat, -0.22);
    c.lineWidth = 5;
    c.stroke();
    // ears out through the beanie
    ear(c, -R * 0.55, -R * 1.08, -0.45, 0.85, shade(fur, -0.2), dark, ol);
    ear(c, R * 0.18, -R * 1.22, 0.25, 1, fur, shade(fur, -0.5), ol);
  },
  hand: (c, v, x, y, front) => {
    const s = v.k.scale;
    const col = front ? shade(v.p.skin, -0.42) : shade(v.p.skin, -0.56);
    circle(c, x, y, 7.5 * s, col, v.ol, 2.6 * s);
    circle(c, x - 2.2 * s, y - 2.2 * s, 2 * s, shade(col, 0.35), null, 0);
  },
  foot: (c, v, front) => {
    const k = v.k;
    const pt = front ? k.footF : k.footB;
    const phi = front ? k.ang.shF : k.ang.shB;
    boneFrame(c, v, pt, phi - 180);
    const col = front ? (v.p.extra ?? '#ffcf3a') : shade(v.p.extra ?? '#ffcf3a', -0.25);
    // high-top collar
    rrect(c, -9, -19, 13, 10, 3);
    fillStroke(c, col, v.ol, 2.4);
    shoe(c, 24, 12, col, '#f4f1ea', v.ol, 2.6);
    // white toe cap and a splat
    c.beginPath();
    c.moveTo(12, -11);
    c.quadraticCurveTo(22, -10, 22.5, -1);
    c.lineTo(12, -1);
    c.closePath();
    fillStroke(c, '#f4f1ea', v.ol, 2);
    circle(c, 3, -6, 2.4, v.p.accent, null, 0);
    c.restore();
  },
  weapon: (c, v) => {
    const k = v.k;
    const id = moveId(v);
    boneFrame(c, v, k.handF, k.ang.wep);
    if (id === 'dspec' || id === 'dspecAir' || id === 'dspecLand') drawRoller(c, v);
    else drawBrush(c, v, smudgeOnOwnPaint(v.st, v.f) || id === 'nspec' || id === 'uspec');
    c.restore();
  },
  front: (c, v) => {
    const f = v.f;
    const k = v.k;
    const s = k.scale;
    const g = k.grav;
    const id = moveId(v);
    const col = paintCol(v);
    const hex = col.startsWith('#') ? col : '#ff4fd2';
    sleeve(c, v, true);
    // own paint: sparkles and drips off the brush
    if (smudgeOnOwnPaint(v.st, f)) {
      for (let i = 0; i < 3; i++) {
        const a = v.t * 0.07 + (i * Math.PI * 2) / 3;
        const tw = 0.5 + 0.5 * Math.sin(v.t * 0.3 + i * 2);
        star4(c, f.x + Math.cos(a) * 34 * s, f.y - (14 + 30 * ((i + v.t * 0.02) % 1)) * s * g, (4 + tw * 5) * s, i === 1 ? '#ffffff' : rgba(hex, 0.95));
      }
      const dk = (v.t % 30) / 30;
      drop(c, k.wep[0], k.wep[1] + dk * 40 * s * g, (2.4 - dk) * s, rgba(hex, 1 - dk), 0);
    }
    // Drip Rocket: the paint jet out of the upside-down brush
    if (id === 'uspec' && f.mf >= 7 && f.mf <= 30) {
      const x = k.wep[0];
      const y = k.wep[1];
      const len = (110 + (f.mf % 3) * 10) * s;
      c.beginPath();
      c.moveTo(x - 7 * s, y);
      c.quadraticCurveTo(x - 12 * s + Math.sin(v.t) * 4, y + len * 0.5 * g, x - 26 * s, y + len * g);
      c.lineTo(x + 26 * s, y + len * g);
      c.quadraticCurveTo(x + 12 * s - Math.sin(v.t) * 4, y + len * 0.5 * g, x + 7 * s, y);
      c.closePath();
      fillStroke(c, hex, OUTLINE, 3);
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.fillRect(x - 2 * s, y, 4 * s, len * 0.6 * g);
      for (let i = 0; i < 4; i++) {
        const t = ((v.t * 0.12 + i * 0.25) % 1);
        circle(c, x + (i % 2 ? 1 : -1) * (14 + t * 24) * s, y + (len + t * 30 * s) * g, (6 - t * 4) * s, hex, OUTLINE, 2);
      }
    }
    // Brush Dash: speed smear
    if (id === 'sspec' && f.mf >= 6 && f.mf <= 18) {
      c.save();
      c.globalAlpha *= 0.7;
      for (let i = 0; i < 3; i++) {
        const yy = f.y - (20 + i * 26) * s * g;
        c.strokeStyle = i === 1 ? '#ffffff' : hex;
        c.lineWidth = (8 - i * 2) * s;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(f.x - f.facing * 30 * s, yy);
        c.lineTo(f.x - f.facing * (110 + i * 20) * s, yy);
        c.stroke();
      }
      c.restore();
    }
    // smash splashes off the brush
    if ((id === 'fsmash' && f.mf >= 14 && f.mf <= 22) || (id === 'usmash' && f.mf >= 9 && f.mf <= 16)) {
      const t0 = id === 'fsmash' ? 14 : 9;
      const t = (f.mf - t0) / 8;
      const up = id === 'usmash';
      for (let i = 0; i < 7; i++) {
        const a = up ? -Math.PI / 2 + (i - 3) * 0.32 : -Math.PI / 2 + (i - 3) * 0.5;
        const d = (18 + t * 70 * (0.75 + 0.5 * (((i * 3) % 4) / 3))) * s;
        const ax = Math.cos(a) * d * (up ? 1 : 1.3);
        const ay = Math.sin(a) * d * g;
        circle(c, k.wep[0] + ax * f.facing, k.wep[1] + ay + (up ? 0 : t * t * 40 * s * g), (9 - t * 6) * s, hex, OUTLINE, 2.2);
      }
    }
    // Roller: a wet sheen trail just behind the roller
    if ((id === 'dspec' && f.mf >= 11 && f.mf <= 48) || (id === 'dspecAir' && f.mf >= 7)) {
      for (let i = 0; i < 3; i++) {
        const t = (v.t * 0.2 + i / 3) % 1;
        circle(c, k.wep[0] - f.facing * (10 + t * 30) * s, k.wep[1] - (6 + t * 26) * s * g, (5 - t * 3) * s, hex, OUTLINE, 1.6);
      }
    }
    if (f.act === A.TAUNT) paintedHeart(c, v);
  },
  portrait: (c, p) => {
    void c;
    void p;
  },
};

// ------------------------------------------------------------------ projectiles

/** Splat Shot: a wobbling blob of paint trailing droplets */
registerProjDraw('splatblob', (c, p: Proj, r, t, col) => {
  const hex = col.startsWith('#') ? col : '#ff4fd2';
  for (let i = 3; i >= 1; i--) circle(c, p.x - p.vx * i * 1.5, p.y - p.vy * i * 1.5, r * (0.5 - i * 0.1), hex, OUTLINE, 2);
  const w = Math.sin((t + p.id * 7) * 0.45) * 0.14;
  const a = Math.atan2(p.vy, p.vx);
  c.save();
  c.translate(p.x, p.y);
  c.rotate(a);
  c.beginPath();
  c.ellipse(0, 0, r * (1.12 + w), r * (0.92 - w), 0, 0, Math.PI * 2);
  fillStroke(c, hex, OUTLINE, 3);
  // little nubs that wobble like a jelly
  for (let i = 0; i < 3; i++) {
    const b = (i - 1) * 1.1 + Math.PI;
    circle(c, Math.cos(b) * r * 1.0, Math.sin(b) * r * 0.85, r * 0.3, hex, null, 0);
  }
  c.restore();
  ellipse(c, p.x - r * 0.35, p.y - r * 0.35, r * 0.32, r * 0.2, -0.6, 'rgba(255,255,255,0.85)', null, 0);
});

/** Drip Rocket drips: teardrops falling to the floor */
registerProjDraw('paintdrip', (c, p, r, t, col) => {
  const hex = col.startsWith('#') ? col : '#ff4fd2';
  drop(c, p.x, p.y, r * 0.95, hex, 2.4);
  circle(c, p.x - r * 0.3, p.y - r * 0.2, r * 0.22, 'rgba(255,255,255,0.8)', null, 0);
  void t;
});

function bigDrop(c: CanvasRenderingContext2D, p: Proj, r: number, t: number, col: string, finale: boolean): void {
  const hex = col.startsWith('#') ? col : '#ff4fd2';
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 6; i > 0; i--) circle(c, p.x - p.vx * i * 1.4, p.y - p.vy * i * 1.4, r * (1 - i * 0.12), rgba(hex, 0.2), null, 0);
  c.restore();
  c.save();
  c.translate(p.x, p.y);
  c.rotate(Math.atan2(p.vy, p.vx) - Math.PI / 2);
  // teardrop pointing back along the flight path
  c.beginPath();
  c.moveTo(0, -r * 2.1);
  c.quadraticCurveTo(r * 1.2, -r * 0.2, 0, r);
  c.quadraticCurveTo(-r * 1.2, -r * 0.2, 0, -r * 2.1);
  c.closePath();
  fillStroke(c, hex, OUTLINE, finale ? 5 : 3.5);
  ellipse(c, -r * 0.3, 0, r * 0.25, r * 0.4, 0.3, 'rgba(255,255,255,0.75)', null, 0);
  c.restore();
  if (finale) {
    // a rainbow sparkle crown on the finale splash
    for (let i = 0; i < 5; i++) {
      const a = t * 0.15 + (i * Math.PI * 2) / 5;
      star4(c, p.x + Math.cos(a) * r * 1.6, p.y + Math.sin(a) * r * 1.6, 7 + (i % 2) * 4, ['#ff3a6e', '#ffe14f', '#3affd5', '#b26bff', '#ffffff'][i]);
    }
  }
}

registerProjDraw('mdrop', (c, p, r, t, col) => bigDrop(c, p, r, t, col, false));
registerProjDraw('mfinale', (c, p, r, t, col) => bigDrop(c, p, r, t, col, true));
