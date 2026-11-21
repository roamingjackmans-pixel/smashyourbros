// Max Ratings: the host. A chunky CRT television for a head (rabbit-ear antennas, knobs, a ratings light-bar) with
// his smug face live on the screen, a sequinned gold suit with a bow tie, white gloves, a stack of cue cards in
// one hand and a corded microphone in the other.
import { A } from '../../sim/acts';
import { FIGHTERS } from '../../sim/data';
import { boneFrame, circle, ellipse, fillStroke, OUTLINE, rgba, rrect, shade, type ArtDef, type FView } from '../art';
import { registerProjDraw } from '../things';

const R = 27;
const TORSO = 46;
const GIRTH = 24;
const WEP = 34;
const BARS = ['#e8e8e8', '#e8e030', '#30d8e0', '#30d040', '#d830d0', '#e03030', '#3040e0'];

function moveId(v: FView): string {
  return v.f.act === A.MOVE ? (FIGHTERS[v.f.def].moveIds[v.f.mv] ?? '') : '';
}

function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, fill: string, stroke = OUTLINE, lw = 0): void {
  c.save();
  c.font = `900 ${size}px Bungee, Impact, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  if (lw > 0) {
    c.lineWidth = lw;
    c.strokeStyle = stroke;
    c.strokeText(s, x, y);
  }
  c.fillStyle = fill;
  c.fillText(s, x, y);
  c.restore();
}

function colorBars(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: number): void {
  c.save();
  c.globalAlpha = a;
  const bw = w / BARS.length;
  for (let i = 0; i < BARS.length; i++) {
    c.fillStyle = BARS[i];
    c.fillRect(x + i * bw, y, bw + 0.5, h * 0.72);
  }
  const lo = ['#3040e0', '#101010', '#d830d0', '#101010', '#30d8e0', '#101010', '#e8e8e8'];
  for (let i = 0; i < lo.length; i++) {
    c.fillStyle = lo[i];
    c.fillRect(x + i * bw, y + h * 0.72, bw + 0.5, h * 0.28);
  }
  c.restore();
}

function staticNoise(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = Math.sin(i * 91.7 + t * 13.1) * 43758.5;
    const b = Math.sin(i * 47.3 + t * 7.7) * 12345.6;
    const px = x + (a - Math.floor(a)) * w;
    const py = y + (b - Math.floor(b)) * h;
    c.fillStyle = i % 3 ? 'rgba(255,255,255,0.75)' : 'rgba(30,30,40,0.8)';
    c.fillRect(px, py, 2.5, 1.6);
  }
}

/** the face on the screen. Screen centre at (sx, sy), size s. */
function face(c: CanvasRenderingContext2D, v: FView, sx: number, sy: number, s: number): void {
  const e = v.expr;
  const ol = '#1b0f24';
  const glow = '#1b0f24';
  const ratings = v.f.v[0] ?? 0;
  const ex = sx + s * 0.08;
  const ey = sy - s * 0.18;
  const gap = s * 0.36;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // eyes
  for (const k of [-1, 1]) {
    const x = ex + k * gap;
    const y = ey;
    if (e === 'happy') {
      c.beginPath();
      c.moveTo(x - s * 0.13, y + s * 0.04);
      c.quadraticCurveTo(x, y - s * 0.16, x + s * 0.13, y + s * 0.04);
      c.strokeStyle = glow;
      c.lineWidth = 3.4;
      c.stroke();
      continue;
    }
    if (e === 'hurt') {
      c.beginPath();
      c.moveTo(x - s * 0.1 * k, y - s * 0.1);
      c.lineTo(x + s * 0.1 * k, y);
      c.lineTo(x - s * 0.1 * k, y + s * 0.1);
      c.strokeStyle = glow;
      c.lineWidth = 3.2;
      c.stroke();
      continue;
    }
    if (v.blink) {
      c.beginPath();
      c.moveTo(x - s * 0.12, y);
      c.lineTo(x + s * 0.12, y);
      c.strokeStyle = glow;
      c.lineWidth = 3.2;
      c.stroke();
      continue;
    }
    if (ratings > 70 && e !== 'angry') {
      // star-struck by his own ratings
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * 0.06 : s * 0.15;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      c.closePath();
      fillStroke(c, '#ffe14f', ol, 2);
      continue;
    }
    const narrow = e === 'angry' || e === 'focus';
    ellipse(c, x, y, s * 0.13, s * (narrow ? 0.08 : 0.12), 0, '#ffffff', ol, 2.2);
    circle(c, x + s * 0.04, y + s * 0.01, s * 0.055, glow, null, 0);
    circle(c, x + s * 0.055, y - s * 0.015, s * 0.018, '#ffffff', null, 0);
    // smug heavy lids
    c.beginPath();
    c.moveTo(x - s * 0.15, y - s * (narrow ? 0.02 : 0.04));
    c.lineTo(x + s * 0.15, y - s * (narrow ? 0.02 : 0.04) + (narrow ? k * s * 0.03 : 0));
    c.strokeStyle = ol;
    c.lineWidth = 3;
    c.stroke();
    // brows: one cocked up (normal), both slammed down (attacking)
    c.beginPath();
    if (narrow) {
      c.moveTo(x - s * 0.16, y - s * 0.2 - k * s * 0.05);
      c.lineTo(x + s * 0.14, y - s * 0.15 + k * s * 0.05);
    } else {
      const up = k > 0 ? s * 0.08 : 0;
      c.moveTo(x - s * 0.15, y - s * 0.2 - up);
      c.quadraticCurveTo(x, y - s * 0.28 - up, x + s * 0.15, y - s * 0.21 - up * 0.4);
    }
    c.strokeStyle = glow;
    c.lineWidth = 3.4;
    c.stroke();
  }
  // mouth
  const my = sy + s * 0.22;
  const mx = sx + s * 0.08;
  if (e === 'hurt') {
    c.beginPath();
    for (let i = 0; i <= 6; i++) c.lineTo(mx - s * 0.24 + i * s * 0.08, my + (i % 2 ? -s * 0.04 : s * 0.04));
    c.strokeStyle = glow;
    c.lineWidth = 3;
    c.stroke();
    return;
  }
  if (e === 'happy') {
    ellipse(c, mx, my, s * 0.26, s * 0.17, 0, '#5a1a2a', ol, 2.4);
    rrect(c, mx - s * 0.2, my - s * 0.15, s * 0.4, s * 0.07, 2);
    c.fillStyle = '#fff';
    c.fill();
    ellipse(c, mx, my + s * 0.08, s * 0.12, s * 0.06, 0, '#ff6b8a', null, 0);
    return;
  }
  // the famous grin: a wide crescent of teeth
  const w = e === 'angry' ? s * 0.34 : s * 0.3;
  c.beginPath();
  c.moveTo(mx - w, my - s * 0.06);
  c.quadraticCurveTo(mx, my + s * 0.06, mx + w, my - s * 0.08);
  c.quadraticCurveTo(mx + w * 0.7, my + s * 0.2, mx, my + s * 0.2);
  c.quadraticCurveTo(mx - w * 0.75, my + s * 0.2, mx - w, my - s * 0.06);
  c.closePath();
  fillStroke(c, '#ffffff', ol, 2.4);
  c.beginPath();
  for (let i = 1; i < 6; i++) {
    const tx = mx - w + (i * 2 * w) / 6;
    c.moveTo(tx, my - s * 0.04);
    c.lineTo(tx, my + s * 0.17);
  }
  c.moveTo(mx - w * 0.9, my + s * 0.06);
  c.quadraticCurveTo(mx, my + s * 0.12, mx + w * 0.9, my + s * 0.05);
  c.strokeStyle = 'rgba(27,15,36,0.55)';
  c.lineWidth = 1.4;
  c.stroke();
  // glint on a tooth
  if (v.t % 90 < 8) {
    const gx = mx + w * 0.4;
    const gy = my;
    c.beginPath();
    c.moveTo(gx - 6, gy);
    c.lineTo(gx + 6, gy);
    c.moveTo(gx, gy - 6);
    c.lineTo(gx, gy + 6);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.stroke();
  }
}

function microphone(c: CanvasRenderingContext2D, v: FView, len: number): void {
  // handle from the fist up to the grille
  rrect(c, -3.6, -len + 8, 7.2, len - 4, 3);
  fillStroke(c, '#2b2633', v.ol, 2.4);
  rrect(c, -4.6, -len + 6, 9.2, 5, 2);
  fillStroke(c, v.p.extra ?? '#ffcf3a', v.ol, 1.8);
  circle(c, 0, -len - 2, 9, '#c9d2e3', v.ol, 2.6);
  c.beginPath();
  for (let i = -2; i <= 2; i++) {
    c.moveTo(-8, -len - 2 + i * 3.2);
    c.lineTo(8, -len - 2 + i * 3.2);
  }
  c.strokeStyle = 'rgba(80,80,100,0.6)';
  c.lineWidth = 1;
  c.stroke();
  circle(c, -3, -len - 5, 2.4, 'rgba(255,255,255,0.8)', null, 0);
}

function cueCard(c: CanvasRenderingContext2D, w: number, h: number, label: string | null): void {
  rrect(c, -w / 2, -h / 2, w, h, 2.5);
  fillStroke(c, '#fffdf4', OUTLINE, 2.4);
  c.fillStyle = '#e83a4a';
  c.fillRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h * 0.2);
  if (label) {
    text(c, label, 0, h * 0.08, Math.min(h * 0.32, (w * 1.6) / label.length), '#1b0f24');
  } else {
    c.fillStyle = 'rgba(40,40,60,0.55)';
    for (let i = 0; i < 3; i++) c.fillRect(-w / 2 + 4, -h * 0.12 + i * h * 0.18, w * (0.8 - i * 0.15), 1.6);
  }
}

registerProjDraw('maxCard', (c, p, r, t) => {
  c.save();
  c.translate(p.x, p.y);
  c.rotate(t * 0.45 * (p.vx >= 0 ? 1 : -1) + p.id);
  cueCard(c, r * 2.1, r * 1.4, null);
  c.restore();
});

registerProjDraw('maxSpotlight', (c, p, r, t) => {
  const k = Math.min(1, p.age / 6) * Math.min(1, (p.life - p.age) / 10);
  const floorY = p.y + r * 1.1;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.beginPath();
  c.moveTo(p.x - 22, p.y - 760);
  c.lineTo(p.x + 22, p.y - 760);
  c.lineTo(p.x + r * 1.4, floorY);
  c.lineTo(p.x - r * 1.4, floorY);
  c.closePath();
  const g = c.createLinearGradient(0, p.y - 760, 0, floorY);
  g.addColorStop(0, 'rgba(255,250,210,0)');
  g.addColorStop(1, `rgba(255,240,170,${0.45 * k})`);
  c.fillStyle = g;
  c.fill();
  ellipse(c, p.x, floorY, r * 1.45, r * 0.32, 0, `rgba(255,245,190,${0.6 * k})`, null, 0);
  for (let i = 0; i < 6; i++) {
    const a = Math.sin(i * 12.3 + p.id) * 0.5 + 0.5;
    const yy = floorY - ((t * 2 + i * 37) % 160);
    circle(c, p.x + (a - 0.5) * r * 2, yy, 2, `rgba(255,255,255,${0.6 * k})`, null, 0);
  }
  c.restore();
  // a star stamped on the floor
  c.save();
  c.translate(p.x, floorY);
  c.scale(1, 0.3);
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.3 : r * 0.7;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.closePath();
  c.fillStyle = rgba('#ffe14f', 0.7 * k);
  c.fill();
  c.restore();
});

registerProjDraw('maxAdBreak', (c, p, r, t) => {
  const w = r * 2.4;
  const h = r * 2.0;
  const k = Math.min(1, p.age / 5);
  c.save();
  c.translate(p.x, p.y);
  c.scale(k, k);
  // bezel
  rrect(c, -w / 2 - 12, -h / 2 - 12, w + 24, h + 24, 18);
  c.lineWidth = 16;
  c.strokeStyle = OUTLINE;
  c.stroke();
  c.lineWidth = 10;
  c.strokeStyle = '#ffcf3a';
  c.stroke();
  // the ad itself, see-through so the poor bro is still visible inside
  c.save();
  rrect(c, -w / 2, -h / 2, w, h, 12);
  c.clip();
  colorBars(c, -w / 2, -h / 2, w, h, 0.42);
  staticNoise(c, -w / 2, -h / 2, w, h, t, 40);
  c.restore();
  text(c, 'COMMERCIAL BREAK', 0, -h / 2 - 24, 20, '#ffe14f', OUTLINE, 6);
  const left = 66 - p.age;
  text(c, left > 0 ? 'WE’LL BE RIGHT BACK' : 'AND WE’RE BACK!', 0, h / 2 + 22, 15, '#ffffff', OUTLINE, 5);
  c.restore();
});

registerProjDraw('maxWeBack', (c, p, r, t) => {
  const k = Math.min(1, p.age / 3);
  text(c, 'AND WE’RE BACK!', p.x, p.y - 260, 70 * k, `hsl(${(t * 12) % 360},100%,65%)`, OUTLINE, 14);
  void r;
});

function antennas(c: CanvasRenderingContext2D, v: FView, wob: number): void {
  c.lineCap = 'round';
  for (const [x2, y2] of [[-R * 0.75 - wob, -R * 2.0], [R * 0.55 + wob, -R * 1.95]] as [number, number][]) {
    c.beginPath();
    c.moveTo(-R * 0.1, -R * 0.98);
    c.lineTo(x2, y2);
    c.strokeStyle = v.ol;
    c.lineWidth = 5;
    c.stroke();
    c.strokeStyle = '#c9d2e3';
    c.lineWidth = 2.2;
    c.stroke();
    circle(c, x2, y2, 3.6, '#c9d2e3', v.ol, 1.8);
  }
  ellipse(c, -R * 0.1, -R * 0.98, R * 0.3, R * 0.13, 0, '#2b2633', v.ol, 2.2);
}

export const maxArt: ArtDef = {
  limb: 14,
  handR: 10,
  footL: 30,
  palettes: [
    { name: 'Prime Time Gold', main: '#e8b830', second: '#6b4428', accent: '#e8303a', skin: '#a8f0ff', extra: '#fff0a8' },
    { name: 'Late Night', main: '#5a2a9a', second: '#2b2633', accent: '#ffcf3a', skin: '#c8b0ff', extra: '#e8d0ff' },
    { name: 'Daytime Teal', main: '#1fb8a8', second: '#e8e2d0', accent: '#ff7a3a', skin: '#c8fff0', extra: '#ffffff' },
    { name: 'Award Season', main: '#2b2633', second: '#1b1622', accent: '#ffcf3a', skin: '#ffe9b0', extra: '#ffcf3a' },
    { name: 'Holiday Special', main: '#c8303a', second: '#2a6a3a', accent: '#ffffff', skin: '#d0ffd8', extra: '#9ae8a0' },
    { name: 'Silver Anniversary', main: '#b8c0d0', second: '#5d6478', accent: '#3a7bff', skin: '#e0f0ff', extra: '#ffffff' },
    { name: 'Infomercial', main: '#ff8a2a', second: '#ffe14f', accent: '#3a3aff', skin: '#fff6b0', extra: '#ffffff' },
    { name: 'Rerun Sepia', main: '#a8784a', second: '#4a3424', accent: '#5a2a1a', skin: '#f0dcb8', extra: '#f0dcb8' },
  ],
  upperArm: (p) => p.main,
  foreArm: (p) => p.main,
  thigh: (p) => shade(p.main, -0.08),
  shin: (p) => shade(p.main, -0.08),
  back: (c, v) => {
    // the mic cord trails from the mic to his belt
    const k = v.k;
    if (moveId(v) === 'sspec') return;
    const hx = k.handF[0];
    const hy = k.handF[1];
    const bx = k.hip[0] - k.facing * GIRTH * 0.6 * k.scale;
    const by = k.hip[1] + 4;
    const sag = 40 * k.scale;
    c.beginPath();
    c.moveTo(hx, hy + 4);
    c.bezierCurveTo(hx, hy + sag, bx, by + sag, bx, by);
    c.strokeStyle = v.ol;
    c.lineWidth = 5;
    c.stroke();
    c.strokeStyle = '#2b2633';
    c.lineWidth = 2.4;
    c.stroke();
  },
  torso: (c, v) => {
    const p = v.p;
    const k = v.k;
    const trim = p.extra ?? '#fff0a8';
    boneFrame(c, v, k.hip, k.ang.torso);
    // jacket: broad shoulders, nipped waist, tails past the hip
    c.beginPath();
    c.moveTo(-GIRTH * 1.08, -TORSO - 2);
    c.quadraticCurveTo(0, -TORSO - 10, GIRTH * 1.1, -TORSO - 1);
    c.quadraticCurveTo(GIRTH * 1.0, -TORSO * 0.45, GIRTH * 0.9, -TORSO * 0.2);
    c.lineTo(GIRTH * 1.0, 10);
    c.lineTo(-GIRTH * 1.05, 12);
    c.quadraticCurveTo(-GIRTH * 0.95, -TORSO * 0.45, -GIRTH * 1.08, -TORSO - 2);
    c.closePath();
    fillStroke(c, p.main, v.ol, 3.4);
    c.save();
    c.clip();
    c.fillStyle = shade(p.main, -0.2);
    c.fillRect(-GIRTH * 1.2, -TORSO - 12, GIRTH * 0.7, TORSO + 30);
    // sequins
    for (let i = 0; i < 9; i++) {
      const a = Math.sin(i * 77.7) * 0.5 + 0.5;
      const b = Math.sin(i * 33.1) * 0.5 + 0.5;
      const tw = (v.t + i * 11) % 40 < 6;
      circle(c, -GIRTH * 0.6 + a * GIRTH * 1.5, -TORSO + 6 + b * TORSO * 0.9, tw ? 2.2 : 1.2, tw ? '#ffffff' : rgba(trim, 0.6), null, 0);
    }
    c.restore();
    // shirt V
    c.beginPath();
    c.moveTo(GIRTH * 0.05, -TORSO - 4);
    c.lineTo(GIRTH * 0.75, -TORSO - 1);
    c.lineTo(GIRTH * 0.5, -TORSO * 0.5);
    c.closePath();
    fillStroke(c, '#fffdf4', v.ol, 2.2);
    // lapels
    c.beginPath();
    c.moveTo(GIRTH * 0.05, -TORSO - 4);
    c.lineTo(GIRTH * 0.5, -TORSO * 0.5);
    c.lineTo(GIRTH * 0.1, -TORSO * 0.62);
    c.lineTo(-GIRTH * 0.2, -TORSO * 0.9);
    c.closePath();
    fillStroke(c, shade(p.main, -0.32), v.ol, 2.2);
    c.beginPath();
    c.moveTo(GIRTH * 0.78, -TORSO - 1);
    c.lineTo(GIRTH * 0.5, -TORSO * 0.5);
    c.lineTo(GIRTH * 0.95, -TORSO * 0.7);
    c.closePath();
    fillStroke(c, shade(p.main, -0.32), v.ol, 2.2);
    // bow tie
    const bx = GIRTH * 0.42;
    const by = -TORSO + 5;
    c.beginPath();
    c.moveTo(bx, by);
    c.lineTo(bx - 9, by - 6);
    c.lineTo(bx - 9, by + 6);
    c.closePath();
    c.moveTo(bx, by);
    c.lineTo(bx + 9, by - 6);
    c.lineTo(bx + 9, by + 6);
    c.closePath();
    fillStroke(c, p.accent, v.ol, 2);
    circle(c, bx, by, 3, shade(p.accent, -0.2), v.ol, 1.6);
    // pocket square + buttons
    c.beginPath();
    c.moveTo(-GIRTH * 0.35, -TORSO * 0.68);
    c.lineTo(-GIRTH * 0.2, -TORSO * 0.8);
    c.lineTo(-GIRTH * 0.05, -TORSO * 0.68);
    c.closePath();
    fillStroke(c, p.accent, v.ol, 1.6);
    c.beginPath();
    c.moveTo(-GIRTH * 0.45, -TORSO * 0.67);
    c.lineTo(GIRTH * 0.05, -TORSO * 0.67);
    c.strokeStyle = v.ol;
    c.lineWidth = 2;
    c.stroke();
    for (let i = 0; i < 2; i++) circle(c, GIRTH * 0.55, -TORSO * 0.34 + i * 10, 2.6, trim, v.ol, 1.4);
    c.restore();
  },
  head: (c, v) => {
    const p = v.p;
    const mid = moveId(v);
    const talk = v.f.act === A.TAUNT || mid === 'ult';
    const hurt = v.expr === 'hurt';
    const jit = hurt ? ((v.t % 3) - 1) * 1.5 : 0;
    c.translate(0, -R * 0.2);
    antennas(c, v, talk ? Math.sin(v.t * 0.5) * 5 : mid === 'uspec' ? 4 : 0);
    // the back of the set
    c.beginPath();
    c.moveTo(-R * 1.15, -R * 0.78);
    c.lineTo(-R * 1.6, -R * 0.5);
    c.lineTo(-R * 1.6, R * 0.5);
    c.lineTo(-R * 1.15, R * 0.78);
    c.closePath();
    fillStroke(c, shade(p.second, -0.3), v.ol, 3);
    // casing
    rrect(c, -R * 1.22, -R * 0.98, R * 2.42, R * 1.96, R * 0.28);
    fillStroke(c, p.second, v.ol, 3.4);
    c.save();
    c.clip();
    c.fillStyle = shade(p.second, 0.18);
    c.fillRect(-R * 1.3, -R * 1.05, R * 2.6, R * 0.16);
    c.restore();
    // knob strip
    circle(c, R * 0.95, -R * 0.42, R * 0.13, '#e8e2d0', v.ol, 2);
    circle(c, R * 0.95, -R * 0.05, R * 0.13, '#e8e2d0', v.ol, 2);
    c.beginPath();
    for (let i = 0; i < 4; i++) {
      c.moveTo(R * 0.85, R * 0.25 + i * R * 0.12);
      c.lineTo(R * 1.06, R * 0.25 + i * R * 0.12);
    }
    c.strokeStyle = v.ol;
    c.lineWidth = 1.8;
    c.stroke();
    // screen
    const sx = -R * 0.98;
    const sy = -R * 0.76;
    const sw = R * 1.72;
    const sh = R * 1.52;
    rrect(c, sx - 2, sy - 2, sw + 4, sh + 4, R * 0.34);
    fillStroke(c, '#1b1622', v.ol, 2.6);
    c.save();
    rrect(c, sx, sy, sw, sh, R * 0.3);
    c.clip();
    const cx = sx + sw / 2;
    const cy = sy + sh / 2;
    const g = c.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.1);
    g.addColorStop(0, shade(p.skin, 0.3));
    g.addColorStop(1, shade(p.skin, -0.25));
    c.fillStyle = g;
    c.fillRect(sx, sy, sw, sh);
    if (mid === 'ult' && v.f.mf < 72) {
      colorBars(c, sx, sy, sw, sh, 1);
      rrect(c, cx - R * 0.8, cy - R * 0.2, R * 1.6, R * 0.4, 4);
      c.fillStyle = '#1b1622';
      c.fill();
      text(c, 'COMMERCIAL', cx, cy - R * 0.06, R * 0.2, '#ffffff');
      text(c, 'BREAK', cx, cy + R * 0.12, R * 0.2, '#ffe14f');
    } else if (v.expr === 'ko') {
      c.fillStyle = '#2a3aa8';
      c.fillRect(sx, sy, sw, sh);
      text(c, 'NO', cx, cy - R * 0.2, R * 0.36, '#ffffff');
      text(c, 'SIGNAL', cx, cy + R * 0.2, R * 0.32, '#ffffff');
    } else {
      if (hurt) staticNoise(c, sx, sy, sw, sh, v.t, 70);
      c.translate(jit, 0);
      face(c, v, cx, cy, R * 1.5);
    }
    // scanlines and glare
    c.fillStyle = 'rgba(0,0,0,0.08)';
    for (let y = sy; y < sy + sh; y += 4) c.fillRect(sx, y, sw, 1.5);
    c.beginPath();
    c.moveTo(sx + sw * 0.08, sy + sh * 0.35);
    c.quadraticCurveTo(sx + sw * 0.12, sy + sh * 0.1, sx + sw * 0.42, sy + sh * 0.07);
    c.strokeStyle = 'rgba(255,255,255,0.45)';
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.stroke();
    c.restore();
    // ratings light-bar under the screen
    const lit = Math.round((v.f.v[0] ?? 0) / 20);
    for (let i = 0; i < 5; i++) circle(c, -R * 0.7 + i * R * 0.3, R * 0.86, R * 0.065, i < lit ? (i >= 3 ? '#ff3a3a' : '#ffe14f') : '#4a3a2a', v.ol, 1.2);
    if (mid === 'ult' && v.f.mf >= 72) text(c, 'WE’RE BACK!', 0, -R * 2.4, R * 0.5, '#ffe14f', OUTLINE, 5);
  },
  hand: (c, v, x, y, front) => {
    const k = v.k;
    const s = k.scale;
    const phi = front ? k.ang.foreF : k.ang.foreB;
    boneFrame(c, v, [x, y], phi);
    // cuff
    rrect(c, -8, -2, 16, 7, 3);
    fillStroke(c, '#fffdf4', v.ol, 2.2);
    if (!front) {
      // the cue cards ride in the back glove
      const mid = moveId(v);
      const label = v.f.act === A.TAUNT ? 'APPLAUSE' : mid === 'dsmash' ? 'CLAP!' : mid === 'ult' ? 'BUY NOW' : null;
      c.save();
      c.translate(0, -16);
      c.rotate(-0.25);
      if (label) cueCard(c, 40, 26, label);
      else {
        c.translate(2, 2);
        cueCard(c, 26, 18, null);
        c.translate(-3, -3);
        cueCard(c, 26, 18, null);
      }
      c.restore();
    }
    circle(c, 0, -9, 10, front ? '#ffffff' : '#e8e2d0', v.ol, 2.6);
    ellipse(c, 7, -5, 4, 6, 0.5, front ? '#ffffff' : '#e8e2d0', v.ol, 2);
    c.beginPath();
    c.moveTo(-4, -16);
    c.lineTo(-4, -11);
    c.moveTo(1, -17);
    c.lineTo(1, -12);
    c.strokeStyle = 'rgba(27,15,36,0.5)';
    c.lineWidth = 1.4;
    c.stroke();
    c.restore();
    void s;
  },
  foot: (c, v, front) => {
    const k = v.k;
    const pt = front ? k.footF : k.footB;
    const phi = front ? k.ang.shF : k.ang.shB;
    boneFrame(c, v, pt, phi - 180);
    const col = front ? '#1b1622' : '#120e18';
    c.beginPath();
    c.moveTo(-10, -12);
    c.lineTo(6, -12);
    c.quadraticCurveTo(24, -11, 26, 0);
    c.lineTo(-11, 0);
    c.closePath();
    fillStroke(c, col, v.ol, 2.6);
    rrect(c, -10, -15, 14, 6, 2);
    fillStroke(c, '#fffdf4', v.ol, 1.8);
    c.beginPath();
    c.moveTo(8, -9);
    c.quadraticCurveTo(16, -9, 20, -5);
    c.strokeStyle = 'rgba(255,255,255,0.6)';
    c.lineWidth = 2;
    c.stroke();
    c.restore();
  },
  weapon: (c, v) => {
    const k = v.k;
    const mid = moveId(v);
    if (mid === 'sspec' && v.f.mf >= 11 && v.f.mf <= 26) {
      // Mic Lasso: the mic flies out on its cord and snaps back
      const out = v.f.mf <= 18 ? Math.min(1, (v.f.mf - 10) / 4) : Math.max(0, 1 - (v.f.mf - 18) / 8);
      const reach = (WEP + 34) * out * k.scale;
      const a = (k.ang.wep * Math.PI) / 180;
      const dx = Math.sin(a) * k.facing;
      const dy = -Math.cos(a) * k.grav;
      const mx = k.handF[0] + dx * reach;
      const my = k.handF[1] + dy * reach;
      c.beginPath();
      c.moveTo(k.handF[0], k.handF[1]);
      c.quadraticCurveTo((k.handF[0] + mx) / 2, (k.handF[1] + my) / 2 + 14, mx, my);
      c.strokeStyle = v.ol;
      c.lineWidth = 5;
      c.stroke();
      c.strokeStyle = '#2b2633';
      c.lineWidth = 2.4;
      c.stroke();
      boneFrame(c, v, [mx, my], k.ang.wep);
      c.translate(0, WEP * 0.4);
      microphone(c, v, WEP * 0.9);
      c.restore();
      return;
    }
    boneFrame(c, v, k.handF, k.ang.wep);
    microphone(c, v, WEP);
    c.restore();
  },
  front: (c, v) => {
    const k = v.k;
    const mid = moveId(v);
    const mf = v.f.mf;
    const s = k.scale;
    if (mid === 'dsmash' && mf >= 6 && mf <= 30) {
      // the APPLAUSE sign lights up overhead
      const on = mf >= 11 && v.t % 6 < 4;
      const x = k.head[0];
      const y = k.head[1] - 92 * s;
      rrect(c, x - 74, y - 20, 148, 40, 8);
      fillStroke(c, on ? '#ff3a4a' : '#5a1a22', OUTLINE, 3.4);
      text(c, 'APPLAUSE', x, y + 1, 24, on ? '#ffffff' : '#a85a62');
      if (mf >= 11 && mf <= 22) {
        const floor = Math.max(k.footF[1], k.footB[1]);
        for (const sd of [-1, 1]) {
          const rr = 30 + (mf - 11) * 12;
          c.beginPath();
          c.ellipse(k.hip[0] + sd * 40, floor - 8, rr, rr * 0.4, 0, sd > 0 ? -Math.PI * 0.5 : Math.PI * 0.5, sd > 0 ? Math.PI * 0.5 : Math.PI * 1.5);
          c.strokeStyle = `rgba(255,240,160,${1 - (mf - 11) / 12})`;
          c.lineWidth = 6;
          c.stroke();
        }
      }
    }
    if (mid === 'usmash' && mf >= 6 && mf <= 22) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const x = k.head[0];
      const floor = Math.max(k.footF[1], k.footB[1]);
      c.beginPath();
      c.moveTo(x - 16, floor - 700);
      c.lineTo(x + 16, floor - 700);
      c.lineTo(x + 70, floor);
      c.lineTo(x - 70, floor);
      c.closePath();
      c.fillStyle = 'rgba(255,245,190,0.28)';
      c.fill();
      c.restore();
    }
    if (mid === 'uspec' && mf >= 8 && mf <= 30) {
      // the broadcast beam carrying him up
      c.save();
      c.globalCompositeOperation = 'lighter';
      const x = k.hip[0];
      const y = Math.max(k.footF[1], k.footB[1]);
      for (let i = 0; i < 4; i++) {
        const yy = y + 10 + ((v.t * 6 + i * 20) % 80);
        ellipse(c, x, yy, 30 - i * 3, 8, 0, '', `rgba(120,230,255,${0.7 - i * 0.12})`, 4);
      }
      c.restore();
    }
    if ((mid === 'fsmash' && mf >= 17 && mf <= 24) || (mid === 'sspecThrow' && mf >= 28 && mf <= 34)) {
      const rr = 18 + (mf % 8) * 6;
      circle(c, k.wep[0], k.wep[1], rr, '', `rgba(255,240,160,${0.9 - (mf % 8) / 8})`, 5);
    }
  },
};
