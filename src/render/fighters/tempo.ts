// Tempo: a DJ robot from Bassline Boulevard. Dome head with a visor of LED eyes, an LED equaliser crest, huge
// speaker-cone headphones, a turntable on the chest, a boombox backpack, light-up high-tops. A beat ring pulses
// under Tempo all match (the approach ring closes onto the base ring exactly on the beat); streak pips light up
// with each On Beat hit; The Drop colour-cycles the whole kit.
import { A } from '../../sim/acts';
import { FIGHTERS, STAGES } from '../../sim/data';
import { surfaces, type Surf } from '../../sim/stage';
import type { Fighter } from '../../sim/types';
import { boneFrame, circle, ellipse, fillStroke, OUTLINE, rgba, rrect, shade, shoe, type ArtDef, type FView } from '../art';
import { registerProjDraw } from '../things';

const R = 23; // head radius
const L = 36; // torso
const G = 17; // girth

function period(f: Fighter): number {
  const p = f.v[6];
  return p === 22 || p === 40 ? p : 30;
}

interface Beat {
  P: number;
  ph: number;
  on: boolean;
  /** 1 on the beat, fades out over 8 frames */
  pulse: number;
}

function beat(v: FView): Beat {
  const P = period(v.f);
  const ph = ((v.st.frame % P) + P) % P;
  return { P, ph, on: ph <= 4 || ph >= P - 4, pulse: ph <= 8 ? 1 - ph / 8 : 0 };
}

function moveId(v: FView): string | null {
  if (v.f.act !== A.MOVE) return null;
  return FIGHTERS[v.f.def]?.moveIds[v.f.mv] ?? null;
}

function dropOn(v: FView): boolean {
  return v.f.v[7] > 0;
}

/** LED colour: the accent, or a colour cycle during The Drop */
function led(v: FView, off = 0): string {
  if (!dropOn(v)) return v.p.accent;
  return `hsl(${(v.t * 7 + off) % 360},100%,62%)`;
}

function eqLevel(v: FView, i: number, pulse: number): number {
  if (v.t === 0) return [0.6, 1, 0.75, 0.45][i % 4];
  return 0.25 + 0.75 * Math.abs(Math.sin(v.t * 0.21 + i * 1.7)) * (0.5 + 0.5 * pulse);
}

function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, col: string): void {
  c.save();
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

// ------------------------------------------------------------------ the beat ring

function beatRing(c: CanvasRenderingContext2D, v: FView): void {
  const f = v.f;
  const b = beat(v);
  const s = v.k.scale;
  const g = v.k.grav;
  const x = f.x;
  const y = f.y;
  const col = led(v);
  const air = f.gnd < 0;
  c.save();
  c.globalAlpha *= air ? 0.4 : 1;
  // the approach ring closes onto the base ring as the next beat nears
  const tt = (b.P - b.ph) / b.P;
  if (!b.on) ellipse(c, x, y, (48 + 50 * tt) * s, (12 + 12 * tt) * s, 0, '', rgba(col.startsWith('#') ? col : '#ffffff', 0.25 + 0.55 * (1 - tt)), 3);
  // burst ring after each beat
  const t1 = b.ph / b.P;
  if (b.ph < b.P * 0.6) ellipse(c, x, y, (48 + 80 * t1) * s, (12 + 20 * t1) * s, 0, '', rgba(col.startsWith('#') ? col : '#ffffff', 0.85 * (1 - t1 / 0.6)), 5 * (1 - t1));
  // base ring
  c.save();
  c.globalCompositeOperation = 'lighter';
  ellipse(c, x, y, 48 * s, 12 * s, 0, b.on ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)', null, 0);
  c.restore();
  ellipse(c, x, y, 48 * s, 12 * s, 0, '', OUTLINE, b.on ? 8 : 6);
  ellipse(c, x, y, 48 * s, 12 * s, 0, '', b.on ? '#ffffff' : col, b.on ? 4.5 : 2.6);
  // streak pips (0..3 lit), in front of the feet
  const n = f.v[5];
  for (let i = 0; i < 4; i++) {
    const px = x + (-27 + i * 18) * s;
    const py = y + 12 * s * g;
    const lit = i < n || (dropOn(v) && (v.t >> 2) % 4 === i);
    circle(c, px, py, 4.8 * s, lit ? (dropOn(v) ? led(v, i * 60) : '#ffd23a') : '#3a3346', OUTLINE, 2);
  }
  c.restore();
}

// ------------------------------------------------------------------ the dance floor (Drop The Beat)

function exposedTops(ss: Surf[]): Surf[] {
  return ss.filter((s, i) => s.soft || !ss.some((o, j) => j !== i && !o.soft && Math.abs(o.y2 - s.y1) < 2 && o.x1 <= s.x1 + 1 && o.x2 >= s.x2 - 1));
}

function danceFloor(c: CanvasRenderingContext2D, v: FView): void {
  const st = v.st;
  const stg = STAGES[st.stage];
  if (!stg) return;
  const ss = surfaces(stg, st.frame, !!st.cfg.flat);
  const b = beat(v);
  const n = Math.floor(st.frame / b.P);
  const cols = [v.p.accent, v.p.extra ?? '#ff4f9a', '#ffd23a'];
  const main = ss[0];
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const s of exposedTops(ss)) {
    const tw = 46;
    for (let x = s.x1, i = 0; x < s.x2 - 4; x += tw, i++) {
      const w = Math.min(tw - 4, s.x2 - x - 2);
      const lit = (i + n) % 2 === 0;
      const col = cols[(i + n) % 3];
      c.fillStyle = rgba(col, lit ? 0.35 + 0.5 * b.pulse : 0.14);
      c.fillRect(x + 2, s.y1 - 3, w, s.soft ? 8 : 14);
      if (lit && b.pulse > 0.2) {
        // light spilling up off the lit tiles
        const gr = c.createLinearGradient(0, s.y1, 0, s.y1 - 90);
        gr.addColorStop(0, rgba(col, 0.28 * b.pulse));
        gr.addColorStop(1, rgba(col, 0));
        c.fillStyle = gr;
        c.fillRect(x + 2, s.y1 - 90, w, 87);
      }
    }
  }
  // sweeping spotlights
  if (main) {
    const cx = (main.x1 + main.x2) / 2;
    for (let k = 0; k < 3; k++) {
      const top = main.y1 - 1150;
      const sx = cx + (k - 1) * 520;
      const fx = cx + Math.sin(v.t * 0.035 + k * 2.1) * 520;
      const col = cols[(k + n) % 3];
      c.beginPath();
      c.moveTo(sx - 18, top);
      c.lineTo(sx + 18, top);
      c.lineTo(fx + 120, main.y1);
      c.lineTo(fx - 120, main.y1);
      c.closePath();
      c.fillStyle = rgba(col, 0.09 + 0.08 * b.pulse);
      c.fill();
      ellipse(c, fx, main.y1, 120, 18, 0, rgba(col, 0.25 + 0.2 * b.pulse), null, 0);
    }
  }
  c.restore();
  // countdown to the drop
  const left = v.f.v[3];
  if (main && left > 0 && left <= 3) {
    const cx = (main.x1 + main.x2) / 2;
    text(c, `${left}`, cx, main.y1 - 380, 90 + 40 * b.pulse, left === 1 ? '#ff4f9a' : '#ffd23a');
  } else if (main && left > 3) {
    const cx = (main.x1 + main.x2) / 2;
    text(c, 'DROP THE BEAT', cx, main.y1 - 380, 46 + 10 * b.pulse, led(v));
  }
}

// ------------------------------------------------------------------ props

function speaker(c: CanvasRenderingContext2D, v: FView, x: number, y: number, r: number, pulse: number): void {
  const p = v.p;
  const k = 1 + 0.1 * pulse;
  circle(c, x, y, r * k, p.extra ?? '#ff4f9a', v.ol, 3);
  circle(c, x, y, r * 0.78 * k, shade(p.extra ?? '#ff4f9a', -0.45), v.ol, 2);
  c.beginPath();
  c.arc(x, y, r * 0.55 * k, 0, Math.PI * 2);
  c.strokeStyle = 'rgba(255,255,255,0.22)';
  c.lineWidth = 2;
  c.stroke();
  circle(c, x, y, r * 0.28 * k, led(v), v.ol, 2);
  circle(c, x - r * 0.08, y - r * 0.1, r * 0.1, 'rgba(255,255,255,0.8)', null, 0);
}

function vinyl(c: CanvasRenderingContext2D, x: number, y: number, r: number, label: string, spin: number, ol: string): void {
  circle(c, x, y, r, '#17141f', ol, 2.6);
  c.lineWidth = 1.3;
  c.strokeStyle = 'rgba(255,255,255,0.16)';
  for (const q of [0.82, 0.64]) {
    c.beginPath();
    c.arc(x, y, r * q, 0, Math.PI * 2);
    c.stroke();
  }
  c.beginPath();
  c.arc(x, y, r * 0.86, spin, spin + 1.1);
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = 2.2;
  c.stroke();
  circle(c, x, y, r * 0.36, label, ol, 1.6);
  circle(c, x, y, r * 0.08, '#17141f', null, 0);
}

function soundRings(c: CanvasRenderingContext2D, n: number, y0: number, step: number, w: number, a: number, col: string): void {
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    c.beginPath();
    c.ellipse(0, y0 - i * step, w * (1 + i * 0.35), w * 0.32 * (1 + i * 0.35), 0, Math.PI, 0);
    c.strokeStyle = rgba(col.startsWith('#') ? col : '#ffffff', a * (1 - i / (n + 1)));
    c.lineWidth = 5 - i;
    c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ projectiles

registerProjDraw('bassdrop', (c, p, r, _t, col) => {
  const dir = p.vx >= 0 ? 1 : -1;
  const k = Math.max(0, 1 - p.age / 46);
  c.save();
  c.translate(p.x, p.y);
  c.scale(dir, 1);
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const rr = r * (0.7 + i * 0.4) + p.age * 0.9;
    c.beginPath();
    c.arc(-i * 9, 0, rr, -0.95, 0.95);
    c.strokeStyle = rgba(i % 2 ? '#3affd5' : col.startsWith('#') ? col : '#ffffff', 0.8 * k * (1 - i * 0.17));
    c.lineWidth = 10 - i * 1.8;
    c.lineCap = 'round';
    c.stroke();
  }
  c.restore();
  c.save();
  c.translate(p.x, p.y);
  c.scale(dir, 1);
  // a little woofer at the core
  circle(c, 0, 0, r * 0.42, rgba('#2b2633', 0.9 * k + 0.1), OUTLINE, 2.5);
  circle(c, 0, 0, r * 0.2, rgba('#3affd5', k), null, 0);
  c.restore();
});

registerProjDraw('record', (c, p, r, _t, col) => {
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 1; i < 5; i++) circle(c, p.x - p.vx * i * 1.3, p.y - p.vy * i * 1.3, r * (1 - i * 0.16), rgba(col.startsWith('#') ? col : '#ffffff', 0.16), null, 0);
  c.restore();
  // scratch marks
  c.save();
  c.translate(p.x, p.y);
  c.strokeStyle = 'rgba(255,255,255,0.6)';
  c.lineWidth = 2.5;
  c.lineCap = 'round';
  const sp = p.age * 0.18;
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.arc(0, 0, r * (1.45 + i * 0.22), sp + i * 2.1, sp + i * 2.1 + 0.7);
    c.stroke();
  }
  c.restore();
  vinyl(c, p.x, p.y, r * 1.15, col.startsWith('#') ? col : '#ff4f9a', p.age * 0.55 * p.facing, OUTLINE);
});

function waveBars(c: CanvasRenderingContext2D, x: number, y: number, k: number, maxH: number, seed: number, col: string): void {
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = rgba(col, 0.4 * k);
  c.fillRect(x - 1150, y - 7, 2300, 14);
  for (let i = -23; i <= 23; i++) {
    const bx = x + i * 50;
    const h = (0.25 + (((i * 37 + seed * 13) % 9) + 9) % 9 / 11) * maxH * k;
    const cc = i % 2 ? '#3affd5' : col;
    c.fillStyle = rgba(cc, 0.32 * k);
    c.fillRect(bx - 15, y - h, 30, h);
    c.fillStyle = rgba('#ffffff', 0.5 * k);
    c.fillRect(bx - 15, y - h - 6, 30, 5);
  }
  c.restore();
}

registerProjDraw('beatwave', (c, p, _r, _t, col) => {
  const k = Math.max(0, 1 - p.age / 5);
  waveBars(c, p.x, p.y, k, 190, p.id, col.startsWith('#') ? col : '#ffd23a');
});

registerProjDraw('dropwave', (c, p, _r, _t, col) => {
  const k = Math.max(0, 1 - p.age / 9);
  const cc = col.startsWith('#') ? col : '#ff4f9a';
  waveBars(c, p.x, p.y, k, 420, p.id, cc);
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.ellipse(p.x, p.y, 300 + p.age * 120 + i * 60, 60 + p.age * 22 + i * 14, 0, 0, Math.PI * 2);
    c.strokeStyle = rgba(i === 1 ? '#3affd5' : cc, 0.6 * k);
    c.lineWidth = 14 - i * 4;
    c.stroke();
  }
  c.restore();
  text(c, 'DROP!', p.x, p.y - 260 - p.age * 6, 110, '#ffd23a');
});

// ------------------------------------------------------------------ the art

export const tempoArt: ArtDef = {
  limb: 12,
  handR: 9,
  footL: 26,
  palettes: [
    { name: 'Bassline Mint', main: '#3f4a7a', second: '#eef1f8', accent: '#3affd5', skin: '#121226', extra: '#ff4f9a' },
    { name: 'Sunset Remix', main: '#ff6a3d', second: '#fff1dc', accent: '#ffe14f', skin: '#2a1020', extra: '#7a2bff' },
    { name: 'Vaporwave', main: '#ff7af2', second: '#d6f6ff', accent: '#7afcff', skin: '#1d1236', extra: '#6a5cff' },
    { name: 'Gold Record', main: '#2b2633', second: '#ffcf3a', accent: '#ffcf3a', skin: '#0e0b14', extra: '#c9a227' },
    { name: 'Lo-Fi Chill', main: '#7fa88f', second: '#f3ead8', accent: '#ffb3a6', skin: '#22302a', extra: '#c9846b' },
    { name: 'Laser Lime', main: '#26262e', second: '#b6ff3a', accent: '#b6ff3a', skin: '#050507', extra: '#ff3a6e' },
    { name: 'Bubblegum Bass', main: '#ff9ccf', second: '#ffffff', accent: '#ff3a8c', skin: '#2a0f24', extra: '#3ad7ff' },
    { name: 'Chrome Classic', main: '#c9d2e3', second: '#5d6478', accent: '#ff4a4a', skin: '#111018', extra: '#3a7bff' },
  ],
  upperArm: (p) => shade(p.second, -0.12),
  foreArm: (p) => p.main,
  thigh: (p) => shade(p.second, -0.12),
  shin: (p) => p.main,
  back: (c, v) => {
    const id = moveId(v);
    // the dance floor and spotlights while Drop The Beat runs
    if (v.f.v[3] > 0 || (id === 'ult' && v.f.mf >= 10)) danceFloor(c, v);
    // The Drop: a colour-cycling aura and speed lines
    if (dropOn(v)) {
      const hx = v.k.hip[0];
      const hy = (v.k.hip[1] + v.k.neck[1]) / 2;
      c.save();
      c.globalCompositeOperation = 'lighter';
      const gr = c.createRadialGradient(hx, hy, 10, hx, hy, 110 * v.k.scale);
      gr.addColorStop(0, `hsla(${(v.t * 7) % 360},100%,60%,0.45)`);
      gr.addColorStop(1, `hsla(${(v.t * 7 + 90) % 360},100%,60%,0)`);
      c.fillStyle = gr;
      c.beginPath();
      c.arc(hx, hy, 110 * v.k.scale, 0, Math.PI * 2);
      c.fill();
      if (Math.abs(v.f.vx) > 3) {
        const d = v.f.vx > 0 ? -1 : 1;
        for (let i = 0; i < 5; i++) {
          const yy = hy - 50 + i * 24 + ((v.t * 3 + i * 17) % 11);
          c.strokeStyle = `hsla(${(v.t * 7 + i * 50) % 360},100%,65%,0.55)`;
          c.lineWidth = 4;
          c.beginPath();
          c.moveTo(hx + d * 30, yy);
          c.lineTo(hx + d * (90 + (i % 2) * 40), yy);
          c.stroke();
        }
      }
      c.restore();
    }
    beatRing(c, v);
    // boombox backpack
    const b = beat(v);
    boneFrame(c, v, v.k.hip, v.k.ang.torso);
    rrect(c, -G - 15, -L + 1, 17, 32, 5);
    fillStroke(c, shade(v.p.main, -0.35), v.ol, 3);
    rrect(c, -G - 12, -L - 5, 11, 6, 2);
    fillStroke(c, v.p.second, v.ol, 2);
    for (const yy of [-L + 9, -L + 23]) {
      circle(c, -G - 6.5, yy, 5.6 + b.pulse * 0.9, v.p.extra ?? '#ff4f9a', v.ol, 2);
      circle(c, -G - 6.5, yy, 2.4, led(v), null, 0);
    }
    c.restore();
  },
  torso: (c, v) => {
    const p = v.p;
    const b = beat(v);
    boneFrame(c, v, v.k.hip, v.k.ang.torso);
    // boxy chassis
    rrect(c, -G - 2, -L - 6, G * 2 + 4, L + 14, 9);
    fillStroke(c, p.main, v.ol, 3.2);
    c.save();
    c.clip();
    c.fillStyle = shade(p.main, -0.2);
    c.fillRect(-G - 4, -L - 8, 11, L + 24);
    c.fillStyle = 'rgba(255,255,255,0.16)';
    c.fillRect(G - 6, -L - 4, 4, L + 6);
    c.restore();
    // collar ring
    rrect(c, -G * 0.7, -L - 10, G * 1.4, 7, 3);
    fillStroke(c, p.second, v.ol, 2.4);
    // turntable deck on the chest
    rrect(c, -G + 5, -L + 1, G * 2 - 8, G * 2 - 9, 5);
    fillStroke(c, shade(p.second, -0.1), v.ol, 2.4);
    const spin = v.t * (dropOn(v) ? 0.5 : 0.25) * (moveId(v) === 'sspecScratch' ? -2.5 : 1);
    vinyl(c, 3, -L * 0.62, 11.5, p.extra ?? '#ff4f9a', spin, v.ol);
    // tone arm
    c.beginPath();
    c.moveTo(G - 5, -L + 4);
    c.lineTo(G - 7, -L * 0.48);
    c.lineTo(9, -L * 0.5);
    c.strokeStyle = v.ol;
    c.lineWidth = 4.5;
    c.lineCap = 'round';
    c.stroke();
    c.strokeStyle = shade(p.second, -0.3);
    c.lineWidth = 2;
    c.stroke();
    // mixer belt: knobs glow on the beat, one fader
    rrect(c, -G - 1, -8, G * 2 + 2, 10, 3);
    fillStroke(c, '#26222f', v.ol, 2.2);
    for (let i = 0; i < 3; i++) circle(c, -9 + i * 6, -3, 2.1, b.on ? led(v, i * 40) : rgba(p.accent, 0.45), null, 0);
    c.fillStyle = shade(p.second, -0.2);
    c.fillRect(8, -5, 7, 4);
    c.fillStyle = led(v);
    c.fillRect(9 + ((b.ph / b.P) * 4) | 0, -6, 2.4, 6);
    c.restore();
  },
  head: (c, v) => {
    const p = v.p;
    const b = beat(v);
    const id = moveId(v);
    c.save();
    // nod on the beat
    c.translate(0, b.pulse * 2.2);
    c.rotate(b.pulse * 0.07);
    // LED equaliser crest poking out of the dome
    for (let i = 0; i < 4; i++) {
      const bx = -R * 0.18 + i * R * 0.28;
      const h = R * (0.22 + 0.48 * eqLevel(v, i, b.pulse));
      rrect(c, bx - 3.4, -R * 0.8 - h, 6.8, h + 8, 2.5);
      fillStroke(c, led(v, i * 45), v.ol, 2.2);
    }
    // dome
    rrect(c, -R, -R * 0.92, R * 2, R * 1.84, R * 0.8);
    fillStroke(c, p.main, v.ol, 3.2);
    c.save();
    c.clip();
    c.fillStyle = shade(p.main, -0.2);
    c.fillRect(-R - 2, -R, R * 0.6, R * 2);
    c.restore();
    // jaw plate
    rrect(c, R * 0.05, R * 0.5, R * 0.8, R * 0.32, 4);
    fillStroke(c, shade(p.second, -0.15), v.ol, 2);
    // visor
    rrect(c, -R * 0.12, -R * 0.56, R * 1.2, R * 1.02, R * 0.4);
    fillStroke(c, p.skin, v.ol, 2.6);
    c.beginPath();
    c.moveTo(R * 0.18, -R * 0.46);
    c.lineTo(R * 0.8, -R * 0.46);
    c.strokeStyle = 'rgba(255,255,255,0.28)';
    c.lineWidth = 2.4;
    c.lineCap = 'round';
    c.stroke();
    ledFace(c, v);
    // headband over the crown
    rrect(c, -R * 0.72, -R * 1.0, R * 0.32, R * 0.8, 4);
    fillStroke(c, shade(p.extra ?? '#ff4f9a', -0.2), v.ol, 2.4);
    // the near headphone: a big speaker cone that thumps on the beat (and flashes on Tempo Shift)
    const shift = v.f.v[0] > 0 && v.st.frame - v.f.v[0] < 40;
    const pulse = Math.max(b.pulse, id === 'dspec' ? 1 : 0, shift ? 1 - (v.st.frame - v.f.v[0]) / 40 : 0);
    const hx = -R * 0.56;
    const hy = R * 0.12;
    if (pulse > 0.3) {
      c.beginPath();
      c.arc(hx, hy, R * (0.6 + 0.12 * pulse), Math.PI * 0.45, Math.PI * 1.55);
      c.strokeStyle = rgba(p.accent, 0.7 * pulse);
      c.lineWidth = 2.2;
      c.stroke();
    }
    speaker(c, v, hx, hy, R * 0.5, pulse);
    c.restore();
  },
  hand: (c, v, _x, _y, front) => {
    const k = v.k;
    boneFrame(c, v, front ? k.handF : k.handB, front ? k.ang.foreF : k.ang.foreB);
    const col = front ? v.p.second : shade(v.p.second, -0.22);
    rrect(c, -9.5, -10, 19, 18, 6);
    fillStroke(c, col, v.ol, 2.6);
    c.fillStyle = shade(col, -0.18);
    c.fillRect(-7, -4, 14, 3);
    if (front) circle(c, 0, -7, 2.6, led(v), null, 0);
    c.restore();
  },
  foot: (c, v, front) => {
    const k = v.k;
    const pt = front ? k.footF : k.footB;
    const phi = front ? k.ang.shF : k.ang.shB;
    const b = beat(v);
    boneFrame(c, v, pt, phi - 180);
    const col = front ? v.p.second : shade(v.p.second, -0.22);
    // high-top cuff
    rrect(c, -9, -21, 16, 10, 4);
    fillStroke(c, front ? v.p.main : shade(v.p.main, -0.22), v.ol, 2.4);
    shoe(c, 26, 14, col, '#26222f', v.ol, 2.8);
    // light-up sole
    c.beginPath();
    c.moveTo(-9, -1.5);
    c.lineTo(22, -1.5);
    c.strokeStyle = b.on || dropOn(v) ? led(v, front ? 0 : 120) : rgba(v.p.accent, 0.4);
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.stroke();
    c.restore();
  },
  front: (c, v) => {
    const k = v.k;
    const p = v.p;
    const b = beat(v);
    const s = k.scale;
    const id = moveId(v);
    const mf = v.f.mf;
    // LED strips on the front forearm and shin, joint lights
    const strip = (a: [number, number], z: [number, number]): void => {
      c.beginPath();
      c.moveTo(a[0] + (z[0] - a[0]) * 0.28, a[1] + (z[1] - a[1]) * 0.28);
      c.lineTo(a[0] + (z[0] - a[0]) * 0.72, a[1] + (z[1] - a[1]) * 0.72);
      c.setLineDash([4 * s, 3.5 * s]);
      c.strokeStyle = b.on || dropOn(v) ? led(v, 30) : rgba(p.accent, 0.55);
      c.lineWidth = 3.2 * s;
      c.lineCap = 'butt';
      c.stroke();
      c.setLineDash([]);
    };
    strip(k.elbowF, k.handF);
    strip(k.kneeF, k.footF);
    circle(c, k.elbowF[0], k.elbowF[1], 4.4 * s, '#26222f', v.ol, 1.8);
    circle(c, k.elbowF[0], k.elbowF[1], 2 * s, led(v), null, 0);
    circle(c, k.kneeF[0], k.kneeF[1], 4.8 * s, '#26222f', v.ol, 1.8);
    circle(c, k.kneeF[0], k.kneeF[1], 2.2 * s, led(v), null, 0);

    // move props
    if (id === 'fsmash') {
      // a speaker cone strapped to the fist
      boneFrame(c, v, k.handF, k.ang.foreF);
      const shake = v.f.charge > 0 && v.f.chargeHold ? Math.sin(v.t * 2.3) * 1.5 : 0;
      c.translate(shake, 0);
      c.beginPath();
      c.moveTo(-7, -8);
      c.lineTo(-17, -28);
      c.lineTo(17, -28);
      c.lineTo(7, -8);
      c.closePath();
      fillStroke(c, p.extra ?? '#ff4f9a', v.ol, 2.6);
      ellipse(c, 0, -28, 17, 6, 0, shade(p.extra ?? '#ff4f9a', -0.45), v.ol, 2.4);
      circle(c, 0, -28, 4, led(v), null, 0);
      if (mf >= 13 && mf <= 22) soundRings(c, 4, -40, 17, 20, 1 - (mf - 13) / 11, p.accent);
      c.restore();
    } else if (id === 'usmash') {
      // an air horn, blasted straight up
      boneFrame(c, v, k.handF, k.ang.foreF);
      rrect(c, -7, -20, 14, 18, 4);
      fillStroke(c, '#ff4a4a', v.ol, 2.4);
      c.beginPath();
      c.moveTo(-4, -20);
      c.lineTo(-11, -38);
      c.lineTo(11, -38);
      c.lineTo(4, -20);
      c.closePath();
      fillStroke(c, '#e8ecf5', v.ol, 2.4);
      if (mf >= 9 && mf <= 18) soundRings(c, 4, -48, 18, 22, 1 - (mf - 9) / 10, '#ffd23a');
      c.restore();
    } else if (id === 'sspec' || id === 'sspecAir') {
      if (mf < 9) {
        boneFrame(c, v, k.handF, k.ang.foreF);
        vinyl(c, 0, -10, 15, p.extra ?? '#ff4f9a', v.t * 0.3, v.ol);
        c.restore();
      }
    } else if (id === 'sspecScratch' || id === 'dspec') {
      // scratch / knob sparks
      if (mf >= 4 && mf <= 14) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          c.beginPath();
          c.arc(k.handF[0], k.handF[1], (16 + i * 9) * s, -0.8 + i, 0.2 + i);
          c.strokeStyle = rgba(p.accent, 0.7 - i * 0.18);
          c.lineWidth = 3;
          c.stroke();
        }
        c.restore();
      }
    } else if ((id === 'nspec' || id === 'nspecAir') && mf >= 13 && mf <= 24) {
      // the bass pulse round Tempo
      const t = (mf - 13) / 11;
      const cx = k.hip[0];
      const cy = k.hip[1] - 40 * s * k.grav;
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(cx, cy, (30 + t * 60 + i * 14) * s, 0, Math.PI * 2);
        c.strokeStyle = rgba(i === 1 ? p.accent : '#ffffff', (1 - t) * 0.6);
        c.lineWidth = 6 - i * 1.5;
        c.stroke();
      }
      c.restore();
    }

    // Tempo Shift: the new BPM pops over the head
    const top = v.f.y - 222 * s * k.grav;
    const ds = v.st.frame - v.f.v[0];
    if (v.f.v[0] > 0 && ds >= 0 && ds < 80) {
      const P = period(v.f);
      const pop = ds < 8 ? 0.6 + ds * 0.08 : 1;
      c.save();
      c.globalAlpha *= ds > 60 ? (80 - ds) / 20 : 1;
      text(c, `${Math.round(3600 / P)} BPM`, v.f.x, top - ds * 0.3, 34 * pop, P === 22 ? '#ff4f9a' : P === 40 ? '#7afcff' : '#ffd23a');
      text(c, P === 22 ? 'FAST' : P === 40 ? 'SLOW' : 'MEDIUM', v.f.x, top + 28 - ds * 0.3, 18 * pop, '#ffffff');
      c.restore();
    }
    // The Drop flourish
    const dd = v.st.frame - v.f.v[4];
    if (dropOn(v) && v.f.v[4] > 0 && dd >= 0 && dd < 70) {
      const pop = dd < 6 ? 0.5 + dd * 0.1 : 1 + 0.06 * Math.sin(dd * 0.6);
      c.save();
      c.globalAlpha *= dd > 52 ? (70 - dd) / 18 : 1;
      text(c, 'THE DROP!', v.f.x, top - 30 - dd * 0.4, 40 * pop, led(v));
      c.restore();
    }
  },
};

/** the LED face on the visor */
function ledFace(c: CanvasRenderingContext2D, v: FView): void {
  const e = v.expr;
  const col = led(v);
  const ex = [R * 0.3, R * 0.76];
  const ey = -R * 0.12;
  c.save();
  // glow
  c.globalCompositeOperation = 'lighter';
  for (const x of ex) circle(c, x, ey, R * 0.2, rgba(col.startsWith('#') ? col : '#ffffff', 0.25), null, 0);
  c.restore();
  c.strokeStyle = col;
  c.fillStyle = col;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = 3;
  ex.forEach((x, i) => {
    const w = R * (i === 0 ? 0.14 : 0.16);
    const h = R * 0.25;
    c.beginPath();
    if (e === 'ko') {
      c.moveTo(x - w, ey - w);
      c.lineTo(x + w, ey + w);
      c.moveTo(x + w, ey - w);
      c.lineTo(x - w, ey + w);
      c.stroke();
    } else if (v.blink) {
      c.moveTo(x - w, ey + 1);
      c.lineTo(x + w, ey + 1);
      c.stroke();
    } else if (e === 'happy') {
      c.moveTo(x - w, ey + h * 0.35);
      c.lineTo(x, ey - h * 0.4);
      c.lineTo(x + w, ey + h * 0.35);
      c.stroke();
    } else if (e === 'hurt') {
      const d = i === 0 ? 1 : -1;
      c.moveTo(x - w * d, ey - h * 0.5);
      c.lineTo(x + w * d, ey);
      c.lineTo(x - w * d, ey + h * 0.5);
      c.stroke();
    } else if (e === 'angry' || e === 'focus') {
      // slanted brows built into the LEDs
      const d = i === 0 ? 1 : -1;
      c.moveTo(x - w, ey - h * 0.5 + (d > 0 ? -2 : 3));
      c.lineTo(x + w, ey - h * 0.5 + (d > 0 ? 3 : -2));
      c.lineTo(x + w, ey + h * 0.5);
      c.lineTo(x - w, ey + h * 0.5);
      c.closePath();
      c.fill();
    } else {
      rrect(c, x - w, ey - h, w * 2, h * 2, w * 0.8);
      c.fill();
    }
  });
  // mouth: an LED equaliser when fighting, a smile otherwise
  const my = R * 0.27;
  if (e === 'angry' || e === 'focus') {
    for (let i = 0; i < 5; i++) {
      const hh = R * (0.06 + 0.12 * eqLevel(v, i + 2, 1));
      c.fillRect(R * 0.3 + i * R * 0.12, my - hh, R * 0.08, hh * 2);
    }
  } else if (e === 'hurt' || e === 'ko') {
    c.beginPath();
    c.moveTo(R * 0.32, my);
    for (let i = 1; i <= 4; i++) c.lineTo(R * 0.32 + i * R * 0.12, my + (i % 2 ? -3 : 3));
    c.lineWidth = 2.4;
    c.stroke();
  } else {
    c.beginPath();
    c.moveTo(R * 0.3, my - (e === 'happy' ? 3 : 1));
    c.quadraticCurveTo(R * 0.54, my + (e === 'happy' ? 9 : 5), R * 0.8, my - (e === 'happy' ? 4 : 2));
    c.lineWidth = 2.6;
    c.stroke();
  }
}
