// Chef Flambé: a towering puffy toque, a magnificent curly moustache, rosy cheeks, a double-breasted jacket over a
// proud belly, apron, chef clogs and a GIANT frying pan. Also draws his Daily Special dishes (tomato, cream pie,
// roast turkey, the rare Golden Soufflé), hot-sauce puddles and the Chef's Kiss cauldron.
import { A } from '../../sim/acts';
import { FIGHTERS } from '../../sim/data';
import { evalKeys } from '../../sim/poses';
import type { Proj } from '../../sim/types';
import { boneFrame, circle, ellipse, eyes, fillStroke, mouth, OUTLINE, rgba, rrect, shade, shoe, type ArtDef, type FView } from '../art';
import { registerProjDraw } from '../things';

const RIG = { torso: 38, girth: 18, head: 21 };
/** pan: handle from the fist to the disc, disc centred on the `wep` bone tip */
const PAN_L = 44;
const PAN_R = 15;

interface Extra {
  hair: string;
  toque: string;
  apron: string;
  clog: string;
  handle: string;
}

const EXTRA: Record<string, Extra> = {
  'Classic Whites': { hair: '#4a2a1a', toque: '#ffffff', apron: '#ffffff', clog: '#2b2633', handle: '#6b4126' },
  'Tomato Rouge': { hair: '#2a1810', toque: '#fff6ee', apron: '#fff6ee', clog: '#5a2a1a', handle: '#3a2418' },
  'Basil Pesto': { hair: '#1d1410', toque: '#fbfff2', apron: '#2f6e33', clog: '#3d2a1a', handle: '#6b4126' },
  'Blueberry Galette': { hair: '#efeae2', toque: '#f4f0ff', apron: '#d8b27a', clog: '#2a2a5a', handle: '#5a3a22' },
  'Midnight Truffle': { hair: '#dccdb5', toque: '#3a3446', apron: '#4a4256', clog: '#111014', handle: '#1b1a20' },
  'Saffron Gold': { hair: '#b5482a', toque: '#fffbe8', apron: '#fff3c4', clog: '#7a3a1a', handle: '#7a3a1a' },
  'Bubblegum Macaron': { hair: '#7a49c8', toque: '#ffe6f3', apron: '#b9f3d0', clog: '#ff6fb5', handle: '#ffffff' },
  'Charcoal Grill': { hair: '#151515', toque: '#f0f0f0', apron: '#5a5c63', clog: '#1a1a1a', handle: '#3a2418' },
};
const DEF_EXTRA: Extra = EXTRA['Classic Whites'];

function ex(v: FView): Extra {
  return EXTRA[v.p.name ?? ''] ?? DEF_EXTRA;
}

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255;
}

function moveId(v: FView): string {
  return v.f.act === A.MOVE ? FIGHTERS[v.f.def].moveIds[v.f.mv] : '';
}

/** is the free (back) hand in front of the body line? (props in it are drawn in front, else behind) */
function handInFront(v: FView): boolean {
  return (v.k.handB[0] - v.k.hip[0]) * v.k.facing > -4 * v.k.scale;
}

/** the pan's bone angle at a (fractional) move frame, straight from the keyframes */
function panPhi(v: FView, fr: number): number {
  const cf = FIGHTERS[v.f.def];
  const m = cf.moves[v.f.mv];
  const p = evalKeys(m.anim, Math.max(0, fr), cf.def.poses);
  return p.rot + p.lean + 180 - p.armF - p.foreF - p.wep;
}

// ------------------------------------------------------------------ little props (world units, centred)

function star4(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string): void {
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x + r * 0.15, y - r * 0.15, x + r, y);
  c.quadraticCurveTo(x + r * 0.15, y + r * 0.15, x, y + r);
  c.quadraticCurveTo(x - r * 0.15, y + r * 0.15, x - r, y);
  c.quadraticCurveTo(x - r * 0.15, y - r * 0.15, x, y - r);
  c.fillStyle = col;
  c.fill();
}

function heart(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, ol: string | null): void {
  c.beginPath();
  c.moveTo(x, y + r * 0.9);
  c.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.45);
  c.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
  c.closePath();
  c.fillStyle = col;
  c.fill();
  if (ol) {
    c.strokeStyle = ol;
    c.lineWidth = 2.5;
    c.stroke();
  }
}

function tomato(c: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  ellipse(c, 0, 0, r * 1.08, r, 0, '#ff3b2f', OUTLINE, 3);
  c.beginPath();
  c.arc(0, 0, r * 0.7, Math.PI * 1.1, Math.PI * 1.45);
  c.strokeStyle = 'rgba(255,255,255,0.75)';
  c.lineWidth = r * 0.22;
  c.lineCap = 'round';
  c.stroke();
  // leafy calyx
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.18 : r * 0.55;
    c.lineTo(Math.cos(a) * rr, -r * 0.82 + Math.sin(a) * rr * 0.5);
  }
  c.closePath();
  fillStroke(c, '#3fae4a', OUTLINE, 2);
  c.restore();
}

function pie(c: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  // tin + crust
  c.beginPath();
  c.moveTo(-r * 1.15, -r * 0.1);
  c.lineTo(r * 1.15, -r * 0.1);
  c.lineTo(r * 0.9, r * 0.55);
  c.lineTo(-r * 0.9, r * 0.55);
  c.closePath();
  fillStroke(c, '#c98a3a', OUTLINE, 3);
  c.fillStyle = '#9a6424';
  for (let i = -3; i <= 3; i++) c.fillRect(i * r * 0.28 - 1, r * 0.05, 2, r * 0.38);
  // whipped cream cloud
  c.beginPath();
  c.moveTo(-r * 1.1, -r * 0.1);
  c.quadraticCurveTo(-r * 1.0, -r * 0.65, -r * 0.45, -r * 0.55);
  c.quadraticCurveTo(-r * 0.25, -r * 1.05, r * 0.2, -r * 0.7);
  c.quadraticCurveTo(r * 0.6, -r * 0.95, r * 0.75, -r * 0.5);
  c.quadraticCurveTo(r * 1.2, -r * 0.5, r * 1.1, -r * 0.1);
  c.closePath();
  fillStroke(c, '#fffaf2', OUTLINE, 2.6);
  circle(c, r * 0.05, -r * 0.95, r * 0.22, '#e8203a', OUTLINE, 2);
  circle(c, -r * 0.02, -r * 1.02, r * 0.07, '#ffffff', null, 0);
  c.restore();
}

function turkey(c: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, face: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(face, 1);
  // drumsticks with paper frills
  for (const s of [-1, 1]) {
    c.save();
    c.translate(r * 0.55, s * r * 0.35);
    c.rotate(s * 0.35);
    rrect(c, 0, -r * 0.16, r * 0.75, r * 0.32, r * 0.14);
    fillStroke(c, '#f2e6d0', OUTLINE, 2.2);
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(r * (0.75 + i * 0.0), -r * 0.2);
      c.lineTo(r * 0.95, -r * 0.25 + i * r * 0.22);
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.6;
      c.stroke();
    }
    c.restore();
  }
  ellipse(c, -r * 0.05, 0, r * 0.95, r * 0.72, 0, '#b8672a', OUTLINE, 3);
  ellipse(c, -r * 0.25, -r * 0.22, r * 0.45, r * 0.22, -0.3, '#e0954a', null, 0);
  circle(c, -r * 0.45, -r * 0.3, r * 0.1, 'rgba(255,255,255,0.8)', null, 0);
  c.restore();
}

function souffle(c: CanvasRenderingContext2D, x: number, y: number, r: number, t: number): void {
  c.save();
  c.translate(x, y);
  c.save();
  c.globalCompositeOperation = 'lighter';
  const pulse = 1 + Math.sin(t * 0.3) * 0.08;
  circle(c, 0, -r * 0.2, r * 2.0 * pulse, 'rgba(255,200,60,0.18)', null, 0);
  circle(c, 0, -r * 0.2, r * 1.45 * pulse, 'rgba(255,230,120,0.28)', null, 0);
  c.restore();
  // ramekin
  rrect(c, -r * 0.85, -r * 0.1, r * 1.7, r * 0.75, r * 0.15);
  fillStroke(c, '#ffffff', OUTLINE, 2.6);
  c.strokeStyle = 'rgba(27,15,36,0.35)';
  c.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) {
    c.beginPath();
    c.moveTo(i * r * 0.3, -r * 0.05);
    c.lineTo(i * r * 0.3, r * 0.6);
    c.stroke();
  }
  // golden puff
  c.beginPath();
  c.moveTo(-r * 0.85, -r * 0.1);
  c.quadraticCurveTo(-r * 1.0, -r * 0.9, -r * 0.2, -r * 1.05);
  c.quadraticCurveTo(r * 0.1, -r * 1.35, r * 0.5, -r * 1.0);
  c.quadraticCurveTo(r * 1.05, -r * 0.8, r * 0.85, -r * 0.1);
  c.closePath();
  fillStroke(c, '#ffc43a', OUTLINE, 2.6);
  ellipse(c, -r * 0.2, -r * 0.75, r * 0.35, r * 0.16, -0.3, '#fff2a8', null, 0);
  // orbiting sparkles
  for (let i = 0; i < 3; i++) {
    const a = t * 0.15 + (i * Math.PI * 2) / 3;
    star4(c, Math.cos(a) * r * 1.5, -r * 0.4 + Math.sin(a) * r * 0.9, r * (0.25 + 0.1 * Math.sin(t * 0.4 + i)), '#fff6c0');
  }
  c.restore();
}

function sauceBottle(c: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(s, s);
  rrect(c, -6, -10, 12, 20, 4);
  fillStroke(c, '#e0261a', OUTLINE, 2.4);
  rrect(c, -3, -17, 6, 8, 2);
  fillStroke(c, '#e0261a', OUTLINE, 2);
  rrect(c, -3.6, -21, 7.2, 5, 1.5);
  fillStroke(c, '#3fae4a', OUTLINE, 2);
  // label with a little flame
  rrect(c, -5, -4, 10, 9, 2);
  fillStroke(c, '#fff3c4', OUTLINE, 1.4);
  c.beginPath();
  c.moveTo(0, -2.5);
  c.quadraticCurveTo(3, 1, 0, 3.5);
  c.quadraticCurveTo(-3, 1, 0, -2.5);
  c.fillStyle = '#ff7a2a';
  c.fill();
  c.restore();
}

/** a flame pointing toward -y from (x, y) in the current frame */
function flame(c: CanvasRenderingContext2D, x: number, y: number, len: number, w: number, t: number): void {
  const layers: [number, string][] = [
    [1, 'rgba(255,90,31,0.92)'],
    [0.72, 'rgba(255,177,58,0.95)'],
    [0.42, 'rgba(255,246,190,0.98)'],
  ];
  for (const [k, col] of layers) {
    const l = len * k * (0.88 + 0.12 * Math.sin(t * 1.7 + k * 5));
    const ww = w * k;
    const wob = Math.sin(t * 0.9 + k * 3) * ww * 0.25;
    c.beginPath();
    c.moveTo(x - ww, y);
    c.quadraticCurveTo(x - ww * 0.9 + wob, y - l * 0.55, x + wob, y - l);
    c.quadraticCurveTo(x + ww * 0.9 + wob, y - l * 0.55, x + ww, y);
    c.quadraticCurveTo(x, y + ww * 0.7, x - ww, y);
    c.fillStyle = col;
    c.fill();
  }
}

function bigText(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, col: string): void {
  c.save();
  c.font = `900 ${size}px Bungee, Impact, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = size * 0.22;
  c.strokeStyle = OUTLINE;
  c.strokeText(s, x, y);
  c.fillStyle = col;
  c.fillText(s, x, y);
  c.restore();
}

function drawDish(c: CanvasRenderingContext2D, kind: number, x: number, y: number, s: number, t: number, face: number): void {
  if (kind === 1) tomato(c, x, y - 9 * s, 10 * s, 0);
  else if (kind === 2) pie(c, x, y - 7 * s, 13 * s, 0);
  else if (kind === 3) turkey(c, x, y - 11 * s, 15 * s, 0, face);
  else if (kind === 4) souffle(c, x, y - 4 * s, 13 * s, t);
}

// ------------------------------------------------------------------ projectiles

registerProjDraw('chefTomato', (c, p, r) => {
  for (let i = 1; i <= 3; i++) circle(c, p.x - p.vx * i * 1.6, p.y - p.vy * i * 1.6, r * (0.42 - i * 0.09), rgba('#ff3b2f', 0.5 - i * 0.12), null, 0);
  tomato(c, p.x, p.y, r, p.age * 0.3 * (p.vx >= 0 ? 1 : -1));
});

registerProjDraw('chefPie', (c, p, r) => {
  pie(c, p.x, p.y, r, Math.sin(p.age * 0.25) * 0.25 + (p.vx >= 0 ? 0.15 : -0.15));
});

registerProjDraw('chefTurkey', (c, p, r) => {
  const face = p.vx >= 0 ? 1 : -1;
  const rot = p.gnd ? (p.x / r) * 0.9 : p.age * 0.14 * face;
  // savoury steam
  c.save();
  c.globalAlpha = 0.5;
  for (let i = 0; i < 2; i++) {
    const k = ((p.age * 0.04 + i * 0.5) % 1) as number;
    circle(c, p.x - face * r * 0.3 + i * 8, p.y - r - k * 30, 4 + k * 6, `rgba(255,255,255,${0.7 - k * 0.7})`, null, 0);
  }
  c.restore();
  turkey(c, p.x, p.y, r, rot, face);
});

registerProjDraw('chefSouffle', (c, p, r, t) => {
  for (let i = 1; i <= 5; i++) star4(c, p.x - p.vx * i * 2.2 + Math.sin(i * 2.1 + t * 0.3) * 6, p.y - p.vy * i * 2.2 + Math.cos(i * 1.7) * 6, 7 - i, `rgba(255,230,120,${0.8 - i * 0.14})`);
  souffle(c, p.x, p.y, r, t);
});

registerProjDraw('chefSauce', (c, p: Proj, r, t) => {
  if (p.v0 === 1) {
    // a sizzling puddle (hit radius 58 around the floor point)
    const left = p.life - p.age;
    const a = Math.max(0, Math.min(1, left / 30, p.age / 6 + 0.2));
    const w = 58 * Math.min(1, 0.4 + p.age / 10);
    c.save();
    c.globalAlpha = a;
    ellipse(c, p.x, p.y + 4, w, 10, 0, '#c81e14', OUTLINE, 3);
    ellipse(c, p.x - w * 0.15, p.y + 2, w * 0.6, 4, 0, '#ff4a2a', null, 0);
    ellipse(c, p.x - w * 0.35, p.y + 1, w * 0.18, 2, 0, 'rgba(255,255,255,0.75)', null, 0);
    for (let i = 0; i < 4; i++) {
      const fx = p.x + (i - 1.5) * w * 0.45;
      const h = 16 + 10 * Math.sin(t * 0.35 + i * 1.9);
      c.save();
      c.translate(fx, p.y + 2);
      flame(c, 0, 0, h, 6, t + i * 7);
      c.restore();
    }
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.05 + i * 0.33) % 1;
      circle(c, p.x + (i - 1) * w * 0.5 + Math.sin(i * 3 + t * 0.1) * 6, p.y - 2 - k * 18, 2.5 + k * 2, `rgba(255,140,90,${0.8 - k * 0.8})`, null, 0);
    }
    c.restore();
    return;
  }
  sauceBottle(c, p.x, p.y, r / 10, p.age * 0.35 * (p.vx >= 0 ? 1 : -1));
});

registerProjDraw('chefCauldron', (c, p, _r, t) => {
  const hw = p.v0 > 1 ? p.v0 : 480;
  const fuse = 104;
  const rise = Math.min(1, p.age / 14);
  const e = 1 - (1 - rise) * (1 - rise);
  const boil = Math.max(0, (p.age - (fuse - 24)) / 24);
  const shake = boil > 0 ? Math.sin(t * 2.3) * boil * 9 : 0;
  const x = p.x + shake;
  const rimY = p.y + 40 + (1 - e) * 340;
  const depth = hw * 0.62;
  const soup = '#ff7a3a';
  c.save();
  // steam plumes behind
  for (let i = 0; i < 7; i++) {
    const k = (t * 0.012 + i * 0.143) % 1;
    const sx = x - hw * 0.8 + (i / 6) * hw * 1.6 + Math.sin(t * 0.03 + i) * 20;
    circle(c, sx, rimY - 30 - k * 260, 30 + k * 50, `rgba(255,255,255,${0.32 * (1 - k) * e})`, null, 0);
  }
  // stubby legs
  for (const s of [-0.62, 0.62]) {
    rrect(c, x + s * hw - 26, rimY + depth - 30, 52, 70, 14);
    fillStroke(c, '#241e2c', OUTLINE, 6);
  }
  // pot body
  c.beginPath();
  c.moveTo(x - hw, rimY);
  c.bezierCurveTo(x - hw * 1.12, rimY + depth * 0.55, x - hw * 0.8, rimY + depth, x, rimY + depth);
  c.bezierCurveTo(x + hw * 0.8, rimY + depth, x + hw * 1.12, rimY + depth * 0.55, x + hw, rimY);
  c.closePath();
  fillStroke(c, '#2f2838', OUTLINE, 8);
  c.save();
  c.clip();
  c.fillStyle = '#3f3650';
  c.fillRect(x - hw * 0.75, rimY, hw * 0.22, depth);
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.fillRect(x - hw * 0.5, rimY, hw * 0.07, depth);
  // a golden crest: a big heart (chef's kiss!)
  heart(c, x, rimY + depth * 0.45, depth * 0.2, '#ffcf3a', OUTLINE);
  c.restore();
  // handles
  for (const s of [-1, 1]) {
    c.beginPath();
    c.arc(x + s * hw * 1.02, rimY + depth * 0.22, 34, 0, Math.PI * 2);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 20;
    c.stroke();
    c.strokeStyle = '#5d5470';
    c.lineWidth = 11;
    c.stroke();
  }
  // soup (rises when it is about to boil over)
  const lvl = rimY - boil * 26;
  ellipse(c, x, lvl, hw * 0.98, 30, 0, soup, OUTLINE, 6);
  ellipse(c, x - hw * 0.2, lvl - 4, hw * 0.55, 12, 0, '#ffa25a', null, 0);
  // swirl of cream
  c.beginPath();
  c.ellipse(x + Math.sin(t * 0.05) * hw * 0.2, lvl, hw * 0.35, 9, 0, t * 0.04, t * 0.04 + 4.2);
  c.strokeStyle = 'rgba(255,248,230,0.85)';
  c.lineWidth = 5;
  c.stroke();
  // bubbles popping all over
  for (let i = 0; i < 16; i++) {
    const k = (t * 0.045 + i * 0.37) % 1;
    const bx = x - hw * 0.88 + (((i * 61) % 100) / 100) * hw * 1.76;
    const by = lvl - 4 - k * (18 + (i % 3) * 10);
    const br = (6 + (i % 4) * 4) * (k < 0.85 ? 1 : (1 - k) / 0.15);
    circle(c, bx, by, Math.max(0.5, br), rgba(soup, 0.9), OUTLINE, 2.5);
    circle(c, bx - br * 0.3, by - br * 0.3, br * 0.25, 'rgba(255,255,255,0.8)', null, 0);
  }
  // a splash every pulse
  const ph = p.age % 13;
  if (p.age > 10 && ph < 8) {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI * (0.15 + 0.7 * (i / 9));
      const sp = 9 + (i % 3) * 3;
      const dx = Math.cos(a) * sp * ph * 1.4;
      const dy = Math.sin(a) * sp * ph * 1.4 + ph * ph * 0.9;
      const sx = x + (((i * 37 + Math.floor(p.age / 13) * 53) % 100) / 100 - 0.5) * hw * 1.4;
      circle(c, sx + dx, lvl + dy, 7 - ph * 0.5, soup, OUTLINE, 2);
    }
  }
  // the ladle, stirring itself
  c.save();
  c.translate(x + hw * 0.5, lvl);
  c.rotate(-0.5 + Math.sin(t * 0.07) * 0.25);
  rrect(c, -8, -hw * 0.55, 16, hw * 0.55, 8);
  fillStroke(c, '#c9d2e3', OUTLINE, 5);
  c.restore();
  // boil-over drips down the sides
  if (boil > 0) {
    for (let i = 0; i < 8; i++) {
      const s = i < 4 ? -1 : 1;
      const dx = x + s * hw * (0.55 + (i % 4) * 0.12);
      const len = boil * (40 + (i % 3) * 30);
      rrect(c, dx - 9, lvl, 18, len, 9);
      fillStroke(c, soup, OUTLINE, 3);
    }
  }
  // the rim
  rrect(c, x - hw - 18, rimY - 14, (hw + 18) * 2, 28, 14);
  fillStroke(c, '#4a4258', OUTLINE, 6);
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.fillRect(x - hw, rimY - 9, hw * 2, 5);
  c.restore();
});

// ------------------------------------------------------------------ the fighter

function moustache(c: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, col: string, ol: string): void {
  c.beginPath();
  c.moveTo(cx, cy - h * 0.3);
  c.quadraticCurveTo(cx + w * 0.3, cy - h * 0.6, cx + w * 0.52, cy - h * 0.05);
  c.quadraticCurveTo(cx + w * 0.6, cy - h * 0.62, cx + w * 0.44, cy - h * 0.8);
  c.quadraticCurveTo(cx + w * 0.76, cy - h * 0.82, cx + w * 0.74, cy - h * 0.2);
  c.quadraticCurveTo(cx + w * 0.62, cy + h * 0.6, cx, cy + h * 0.3);
  c.quadraticCurveTo(cx - w * 0.45, cy + h * 0.55, cx - w * 0.56, cy - h * 0.1);
  c.quadraticCurveTo(cx - w * 0.6, cy - h * 0.62, cx - w * 0.42, cy - h * 0.7);
  c.quadraticCurveTo(cx - w * 0.46, cy - h * 0.36, cx - w * 0.32, cy - h * 0.08);
  c.quadraticCurveTo(cx - w * 0.16, cy - h * 0.5, cx, cy - h * 0.3);
  c.closePath();
  fillStroke(c, col, ol, 2.6);
  // a strand highlight
  c.beginPath();
  c.moveTo(cx + w * 0.08, cy - h * 0.1);
  c.quadraticCurveTo(cx + w * 0.3, cy - h * 0.25, cx + w * 0.45, cy + h * 0.02);
  c.strokeStyle = rgba(lum(col) > 0.6 ? '#000000' : '#ffffff', 0.25);
  c.lineWidth = 2;
  c.stroke();
}

function toque(c: CanvasRenderingContext2D, v: FView, R: number, col: string): void {
  const ol = v.ol;
  const bob = Math.sin(v.t * 0.11) * 0.035 + (v.f.act === A.RUN || v.f.act === A.DASH ? -0.08 : 0);
  c.save();
  c.translate(-R * 0.05, -R * 0.78);
  c.rotate(bob - 0.06);
  // tall pleated body
  c.beginPath();
  c.moveTo(-R * 0.78, 0);
  c.lineTo(-R * 0.92, -R * 1.05);
  c.lineTo(R * 0.86, -R * 1.05);
  c.lineTo(R * 0.74, 0);
  c.closePath();
  fillStroke(c, col, ol, 3);
  c.strokeStyle = shade(col, -0.16);
  c.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    c.beginPath();
    c.moveTo(i * R * 0.3, -R * 0.12);
    c.lineTo(i * R * 0.33, -R * 0.95);
    c.stroke();
  }
  // puffy top: outline pass then fill pass so the bumps merge cleanly
  const puffs: [number, number, number][] = [
    [-R * 0.72, -R * 1.25, R * 0.52],
    [R * 0.66, -R * 1.25, R * 0.5],
    [-R * 0.3, -R * 1.62, R * 0.62],
    [R * 0.32, -R * 1.6, R * 0.6],
    [R * 0.02, -R * 1.25, R * 0.6],
  ];
  for (const [x, y, r] of puffs) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.strokeStyle = ol;
    c.lineWidth = 6;
    c.stroke();
  }
  for (const [x, y, r] of puffs) circle(c, x, y, r - 0.5, col, null, 0);
  circle(c, -R * 0.42, -R * 1.78, R * 0.18, 'rgba(255,255,255,0.65)', null, 0);
  c.fillStyle = shade(col, -0.1);
  c.beginPath();
  c.ellipse(R * 0.1, -R * 1.05, R * 0.85, R * 0.14, 0, 0, Math.PI);
  c.fill();
  // band
  rrect(c, -R * 0.84, -R * 0.36, R * 1.62, R * 0.4, R * 0.1);
  fillStroke(c, shade(col, -0.06), ol, 2.6);
  c.restore();
}

function hand(c: CanvasRenderingContext2D, v: FView, x: number, y: number, front: boolean): void {
  const s = v.k.scale;
  const col = front ? v.p.skin : shade(v.p.skin, -0.18);
  circle(c, x, y, 7.6 * s, col, v.ol, 2.6 * s);
  circle(c, x - 2.2 * s, y - 2.2 * s, 2.2 * s, rgba('#ffffff', 0.35), null, 0);
}

export const chefArt: ArtDef = {
  limb: 12,
  handR: 7.6,
  footL: 22,
  palettes: [
    { name: 'Classic Whites', main: '#f2eee4', second: '#2f2b3a', accent: '#e43a3a', skin: '#ffd2b0', extra: '#44434d' },
    { name: 'Tomato Rouge', main: '#e8403a', second: '#f4efe6', accent: '#49b04f', skin: '#e9b48a', extra: '#c0773e' },
    { name: 'Basil Pesto', main: '#4cae4f', second: '#f2ead8', accent: '#fff07a', skin: '#8d5a3b', extra: '#50555f' },
    { name: 'Blueberry Galette', main: '#5163e0', second: '#efe6ff', accent: '#ffb347', skin: '#ffd9c2', extra: '#c98a3a' },
    { name: 'Midnight Truffle', main: '#2d2836', second: '#5a4636', accent: '#ffcf3a', skin: '#c98c64', extra: '#1e1d24' },
    { name: 'Saffron Gold', main: '#ffcf3a', second: '#7a3a1a', accent: '#d8432f', skin: '#f0c19b', extra: '#ffd76a' },
    { name: 'Bubblegum Macaron', main: '#ffb3d9', second: '#9ee8ff', accent: '#ffffff', skin: '#ffe0c8', extra: '#ff6fb5' },
    { name: 'Charcoal Grill', main: '#3d3f45', second: '#1f1f24', accent: '#ff7a2a', skin: '#6b3f2a', extra: '#2a2a2e' },
  ],
  upperArm: (p) => p.main,
  foreArm: (p) => p.main,
  thigh: (p) => p.second,
  shin: (p) => p.second,
  hand,
  back: (c, v) => {
    // a Daily Special dish wound up behind the back
    const id = moveId(v);
    const dish = v.f.v[0] | 0;
    if ((id === 'nspec' || id === 'nspecAir') && dish > 0 && v.f.mf >= 12 && v.f.mf < 19 && !handInFront(v)) {
      drawDish(c, dish, v.k.handB[0], v.k.handB[1] - 5 * v.k.scale, v.k.scale, v.t, v.k.facing);
    }
    // apron bow tied at the small of the back
    const g = RIG.girth;
    boneFrame(c, v, v.k.hip, v.k.ang.torso);
    const col = ex(v).apron;
    for (const s of [-1, 1]) ellipse(c, -g * 0.98, -RIG.torso * 0.34 + s * 4.5, 6.5, 3.6, s * 0.6, col, v.ol, 2.2);
    rrect(c, -g * 1.0 - 2, -RIG.torso * 0.34 - 1, 5, 13, 2);
    fillStroke(c, col, v.ol, 1.8);
    c.restore();
  },
  torso: (c, v) => {
    const p = v.p;
    const L = RIG.torso;
    const g = RIG.girth;
    const e = ex(v);
    boneFrame(c, v, v.k.hip, v.k.ang.torso);
    // jacket over a proud belly
    c.beginPath();
    c.moveTo(-g * 0.92, g * 0.45);
    c.quadraticCurveTo(-g * 1.14, -L * 0.5, -g * 0.86, -L - 2);
    c.quadraticCurveTo(0, -L - g * 0.6, g * 0.86, -L - 1);
    c.quadraticCurveTo(g * 1.5, -L * 0.42, g * 0.98, g * 0.45);
    c.closePath();
    fillStroke(c, p.main, v.ol, 3.2);
    c.save();
    c.clip();
    c.fillStyle = shade(p.main, -0.16);
    c.fillRect(-g * 1.3, -L - g, g * 0.78, L + g * 2);
    c.restore();
    // double-breasted flap and buttons
    c.beginPath();
    c.moveTo(g * 0.05, -L - 1);
    c.quadraticCurveTo(g * 0.25, -L * 0.62, g * 0.62, -L * 0.36);
    c.strokeStyle = shade(p.main, -0.3);
    c.lineWidth = 2.2;
    c.stroke();
    const btn = lum(p.main) > 0.55 ? '#3a3446' : '#ffcf3a';
    for (let i = 0; i < 3; i++) {
      const y = -L * (0.86 - i * 0.17);
      circle(c, g * 0.36 + i * 1.5, y, 2.4, btn, v.ol, 1.4);
      circle(c, g * 0.88 + i * 2.2, y + 1, 2.4, btn, v.ol, 1.4);
    }
    // apron
    c.beginPath();
    c.moveTo(-g * 0.35, -L * 0.34);
    c.lineTo(g * 1.3, -L * 0.36);
    c.quadraticCurveTo(g * 1.38, g * 0.1, g * 1.06, g * 0.95);
    c.lineTo(-g * 0.5, g * 0.95);
    c.closePath();
    fillStroke(c, e.apron, v.ol, 2.8);
    c.fillStyle = shade(e.apron, -0.12);
    c.fillRect(-g * 0.48, -L * 0.34, g * 0.32, L * 0.34 + g * 0.93);
    // apron pocket with a wooden spoon peeking out
    rrect(c, g * 0.25, -L * 0.12, g * 0.6, g * 0.5, 3);
    fillStroke(c, shade(e.apron, -0.06), v.ol, 1.8);
    rrect(c, g * 0.45, -L * 0.3, 3.5, g * 0.4, 1.5);
    fillStroke(c, '#c98a3a', v.ol, 1.4);
    ellipse(c, g * 0.47, -L * 0.33, 3.6, 5, 0, '#c98a3a', v.ol, 1.4);
    // apron string
    c.fillStyle = shade(e.apron, -0.05);
    c.fillRect(-g * 1.0, -L * 0.37, g * 2.2, 4);
    c.strokeStyle = v.ol;
    c.lineWidth = 1.4;
    c.strokeRect(-g * 1.0, -L * 0.37, g * 2.2, 4);
    // neckerchief: band and a jaunty knot
    ellipse(c, g * 0.12, -L - 1, g * 0.8, 5.5, 0, p.accent, v.ol, 2.4);
    c.beginPath();
    c.moveTo(g * 0.55, -L + 1);
    c.lineTo(g * 1.18, -L * 0.8);
    c.lineTo(g * 0.82, -L * 0.74);
    c.lineTo(g * 0.48, -L * 0.86);
    c.closePath();
    fillStroke(c, p.accent, v.ol, 2.2);
    circle(c, g * 0.62, -L + 0.5, 3.6, shade(p.accent, -0.15), v.ol, 1.8);
    c.restore();
  },
  head: (c, v) => {
    const R = RIG.head;
    const p = v.p;
    const e = ex(v);
    const id = moveId(v);
    const mf = v.f.mf;
    // proud/beaming moments override the default "angry" move face
    let expr = v.expr;
    if ((id === 'nspec' || id === 'nspecAir') && mf >= 8 && mf < 22) expr = 'happy';
    if (id === 'ult' && (mf < 2 || mf > 96)) expr = 'happy';
    if (v.f.act === A.TAUNT && v.f.af > 8 && v.f.af < 50) expr = 'happy';
    const vv: FView = expr === v.expr ? v : { ...v, expr };
    // hair at the back and sideburn
    ellipse(c, -R * 0.42, R * 0.02, R * 0.56, R * 0.74, 0.2, e.hair, v.ol, 2.6);
    // face, a touch jowly
    c.beginPath();
    c.moveTo(-R * 0.62, -R * 0.55);
    c.quadraticCurveTo(R * 0.2, -R * 1.05, R * 0.84, -R * 0.35);
    c.quadraticCurveTo(R * 1.08, R * 0.45, R * 0.55, R * 0.86);
    c.quadraticCurveTo(-R * 0.1, R * 1.08, -R * 0.62, R * 0.62);
    c.quadraticCurveTo(-R * 0.9, 0, -R * 0.62, -R * 0.55);
    c.closePath();
    fillStroke(c, p.skin, v.ol, 3);
    // ear + sideburn
    ellipse(c, -R * 0.2, R * 0.12, R * 0.17, R * 0.24, 0, shade(p.skin, -0.1), v.ol, 2.2);
    rrect(c, -R * 0.04, -R * 0.5, R * 0.16, R * 0.66, R * 0.07);
    fillStroke(c, e.hair, v.ol, 2);
    // rosy cheek
    circle(c, R * 0.5, R * 0.34, R * 0.2, rgba('#ff5a6a', 0.42), null, 0);
    // eyes and bushy brows
    eyes(c, vv, R * 0.3, -R * 0.12, R * 0.2, '#3a2414', { brow: false });
    const tilt = expr === 'angry' || expr === 'focus' ? 0.5 : expr === 'hurt' ? -0.45 : expr === 'happy' ? -0.15 : 0;
    for (const s of [-1, 1]) {
      const bx = R * 0.32 + s * R * 0.23 + 2;
      const by = -R * 0.42;
      c.save();
      c.translate(bx, by);
      c.rotate(s * tilt * 0.6 + (s < 0 ? 0.08 : -0.08));
      ellipse(c, 0, 0, R * 0.2, R * 0.075, 0, e.hair, v.ol, 1.8);
      c.restore();
    }
    // happy tears of pride
    if (expr === 'happy') {
      for (const s of [-1, 1]) {
        const k = ((v.t * 0.06 + (s > 0 ? 0.5 : 0)) % 1) as number;
        const tx = R * 0.32 + s * R * 0.23 + 2 + s * R * 0.12;
        circle(c, tx, -R * 0.02 + k * R * 0.6, R * 0.07 + 0.6, rgba('#7fd4ff', 0.9 - k * 0.5), v.ol, 1.2);
      }
    }
    // mouth (peeks out under the moustache when it opens)
    if (expr === 'hurt' || expr === 'ko') mouth(c, vv, R * 0.56, R * 0.66, R * 0.42, 'o');
    else if (expr === 'happy') mouth(c, vv, R * 0.56, R * 0.6, R * 0.5, 'grin');
    else if (expr === 'angry' || expr === 'focus') mouth(c, vv, R * 0.58, R * 0.64, R * 0.42, 'grit');
    // big round nose
    circle(c, R * 0.84, R * 0.06, R * 0.22, shade(p.skin, -0.05), v.ol, 2.4);
    circle(c, R * 0.8, R * 0.0, R * 0.07, 'rgba(255,255,255,0.6)', null, 0);
    // the moustache, magnificent
    moustache(c, R * 0.66, R * 0.34, R * 1.2, R * 0.52, e.hair, v.ol);
    toque(c, v, R, e.toque);
  },
  foot: (c, v, front) => {
    const k = v.k;
    const pt = front ? k.footF : k.footB;
    const phi = front ? k.ang.shF : k.ang.shB;
    boneFrame(c, v, pt, phi - 180);
    const col = ex(v).clog;
    const fill = front ? col : shade(col, -0.25);
    // a white sock cuff then a round chef clog
    rrect(c, -6, -15, 12, 6, 2);
    fillStroke(c, front ? '#ffffff' : '#d6d0c6', v.ol, 2);
    shoe(c, 23, 12, fill, shade(col, -0.5), v.ol, 2.8);
    circle(c, 9, -7, 2.2, rgba('#ffffff', 0.35), null, 0);
    c.restore();
  },
  weapon: (c, v) => {
    const k = v.k;
    const p = v.p;
    const e = ex(v);
    const id = moveId(v);
    const mf = v.f.mf;
    // a swoosh behind fast pan swings (read straight from the move's keyframes)
    if (id && mf > 2 && v.f.act === A.MOVE) {
      const d = panPhi(v, mf) - panPhi(v, mf - 2.5);
      if (Math.abs(d) > 24) {
        const trail = Math.min(150, Math.abs(d) * 1.6) * Math.sign(d);
        boneFrame(c, v, k.handF, k.ang.wep);
        const a1 = -Math.PI / 2;
        const a0 = a1 - (trail * Math.PI) / 180;
        c.lineCap = 'round';
        for (const [rr, w, a] of [
          [PAN_L + PAN_R * 0.6, 18, 0.18],
          [PAN_L + 2, 9, 0.45],
          [PAN_L - PAN_R * 0.5, 5, 0.3],
        ] as [number, number, number][]) {
          c.beginPath();
          c.arc(0, 0, rr, a0, a1, d < 0);
          c.strokeStyle = `rgba(255,255,255,${a})`;
          c.lineWidth = w;
          c.stroke();
        }
        c.restore();
      }
    }
    boneFrame(c, v, k.handF, k.ang.wep);
    // handle with a hanging loop
    rrect(c, -3.8, -(PAN_L - PAN_R) - 2, 7.6, PAN_L - PAN_R + 12, 3.6);
    fillStroke(c, e.handle, v.ol, 2.6);
    circle(c, 0, 6, 2.2, OUTLINE, null, 0);
    rrect(c, -4.6, -(PAN_L - PAN_R) - 4, 9.2, 7, 2);
    fillStroke(c, shade(p.extra ?? '#44434d', -0.15), v.ol, 2);
    // the pan
    const pan = p.extra ?? '#44434d';
    circle(c, 0, -PAN_L, PAN_R + 3, shade(pan, -0.32), v.ol, 3.2);
    circle(c, 0, -PAN_L, PAN_R - 1, pan, null, 0);
    circle(c, 0, -PAN_L, PAN_R - 5, shade(pan, -0.12), null, 0);
    c.beginPath();
    c.arc(0, -PAN_L, PAN_R - 2.5, Math.PI * 1.05, Math.PI * 1.55);
    c.strokeStyle = 'rgba(255,255,255,0.6)';
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.stroke();
    // flambé!
    if (id === 'uspec') {
      if (mf >= 3 && mf <= 7) flame(c, 0, -PAN_L - PAN_R * 0.2, 12 + (mf - 3) * 8, 9, v.t);
      if (mf > 7 && mf <= 27) {
        flame(c, 0, -PAN_L - PAN_R * 0.4, 95, 18, v.t);
        flame(c, 0, -PAN_L, 40, 22, v.t + 3);
      }
      if (mf > 27 && mf <= 33) flame(c, 0, -PAN_L - PAN_R * 0.3, 58 - (mf - 27) * 6, 24, v.t);
    }
    if (id === 'usmash' && mf >= 7 && mf <= 18) {
      for (const s of [-1, 0, 1]) flame(c, s * PAN_R * 0.6, -PAN_L - PAN_R * 0.5, 20 + 6 * Math.sin(v.t + s), 6, v.t + s * 4);
    }
    if (p.name === 'Charcoal Grill') {
      // ember glow on the cast iron
      circle(c, 0, -PAN_L, PAN_R - 6, rgba('#ff7a2a', 0.25 + 0.15 * Math.sin(v.t * 0.2)), null, 0);
    }
    c.restore();
  },
  front: (c, v) => {
    const k = v.k;
    const s = k.scale;
    const fc = k.facing;
    const id = moveId(v);
    const mf = v.f.mf;
    const [hx, hy] = k.handB;
    // ---- Daily Special: platter, cloche, reveal
    if ((id === 'nspec' || id === 'nspecAir') && mf <= 30) {
      const dish = v.f.v[0] | 0;
      const ty = hy - 3 * s;
      // the revealed dish rides the tray, then the hand for the wind-up (drawn behind the body when the hand is)
      if (dish > 0 && mf >= 8 && mf < 19 && (mf < 12 || handInFront(v))) drawDish(c, dish, hx, ty - 2 * s, s, v.t, fc);
      // tray (gone once he picks the dish up)
      if (mf < 13) {
        c.save();
        c.globalAlpha *= mf < 12 ? 1 : 0.5;
        ellipse(c, hx, ty, 25 * s, 5.5 * s, 0, '#dfe4ee', v.ol, 2.6);
        ellipse(c, hx - 6 * s * fc, ty - 1 * s, 12 * s, 1.6 * s, 0, 'rgba(255,255,255,0.9)', null, 0);
        c.restore();
      }
      // cloche on the tray, or flying off
      const lid = (lx: number, ly: number, rot: number, a: number): void => {
        c.save();
        c.globalAlpha *= a;
        c.translate(lx, ly);
        c.rotate(rot);
        c.beginPath();
        c.ellipse(0, 0, 20 * s, 19 * s, 0, Math.PI, Math.PI * 2);
        c.closePath();
        fillStroke(c, '#c9d2e3', v.ol, 2.6);
        c.beginPath();
        c.ellipse(0, 0, 14 * s, 13 * s, 0, Math.PI * 1.15, Math.PI * 1.45);
        c.strokeStyle = 'rgba(255,255,255,0.9)';
        c.lineWidth = 3 * s;
        c.lineCap = 'round';
        c.stroke();
        circle(c, 0, -20 * s, 4 * s, '#ffcf3a', v.ol, 2);
        rrect(c, -21 * s, -2 * s, 42 * s, 4 * s, 2 * s);
        fillStroke(c, '#aab3c6', v.ol, 1.8);
        c.restore();
      };
      if (mf < 8) lid(hx, ty - 2 * s, 0, 1);
      else if (mf < 26) {
        const u = mf - 8;
        lid(hx - fc * u * 2.6 * s, ty - 2 * s - (u * 9 - u * u * 0.42) * s, -fc * u * 0.32, Math.max(0, 1 - u / 18));
      }
      if (mf >= 8 && mf < 16) {
        const u = (mf - 8) / 8;
        const sz = Math.sin(u * Math.PI) * 9 * s;
        for (let i = 0; i < 5; i++) {
          const a = i * 1.26 + 0.4;
          star4(c, hx + Math.cos(a) * 30 * s * (0.6 + u), ty - 14 * s + Math.sin(a) * 22 * s * (0.6 + u), sz, dish === 4 ? '#ffe27a' : '#ffffff');
        }
      }
      if (mf >= 8 && mf < 24) {
        const pop = mf < 11 ? 0.6 + (mf - 8) * 0.14 : 1;
        const gold = dish === 4;
        bigText(c, gold ? 'LE SOUFFLÉ D’OR!' : 'VOILÀ!', k.head[0], k.head[1] - 122 * s - (mf - 8) * 0.6, (gold ? 20 : 26) * pop * s, gold ? '#ffd23a' : '#ffffff');
      }
    }
    // ---- Hot Sauce: the bottle before the toss
    if ((id === 'dspec' || id === 'dspecAir') && mf < 12) sauceBottle(c, hx, hy - 4 * s, s * 1.1, -fc * (0.3 + mf * 0.08));
    // ---- Flambé Jet: a splash of brandy before the whoosh
    if (id === 'uspec' && mf <= 6) {
      sauceBottle(c, hx, hy - 2 * s, s * 0.9, fc * 2.2);
      for (let i = 0; i < 3; i++) circle(c, hx + fc * (6 + i * 4) * s, hy + (4 + ((mf * 3 + i * 5) % 14)) * s, 2.2 * s, 'rgba(255,190,90,0.9)', null, 0);
    }
    // ---- up smash: a crêpe flips into the air
    if (id === 'usmash' && mf >= 9 && mf <= 40) {
      const u = mf - 9;
      const h = 14 * u - 0.45 * u * u;
      c.save();
      c.translate(k.head[0] + fc * 18 * s, k.head[1] - 40 * s - h * s);
      c.rotate(u * 0.5 * fc);
      ellipse(c, 0, 0, 22 * s, 6 * s, 0, '#f2c46a', v.ol, 2.4);
      for (let i = 0; i < 3; i++) circle(c, (i - 1) * 9 * s, (i % 2) * 1.5 * s - 0.5 * s, 2.2 * s, '#b8742a', null, 0);
      c.restore();
    }
    // ---- the chef's kiss (taunt and ultimate)
    let kiss = -1;
    if (v.f.act === A.TAUNT) kiss = v.f.af - 28;
    if (id === 'ult') kiss = mf - 110;
    if (kiss >= 0 && kiss < 22) {
      const u = kiss / 22;
      for (let i = 0; i < 3; i++) {
        const hu = Math.min(1, u * 1.4 - i * 0.12);
        if (hu <= 0) continue;
        heart(c, hx + fc * (10 + hu * 40 + i * 10) * s, hy - (hu * 50 + i * 8) * s, (7 - i * 1.5) * s * (1 - u * 0.3), rgba('#ff4f8a', 1 - u * 0.6), v.ol);
      }
      bigText(c, 'MWAH!', k.head[0] + fc * 72 * s, k.head[1] - 34 * s - kiss * 0.8, 24 * s * Math.min(1, 0.5 + kiss * 0.12), '#ff7ab0');
    }
  },
};
