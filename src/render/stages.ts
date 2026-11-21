// Stage art: parallax backgrounds (screen space) and the stage geometry itself (world space).
import { STAGES } from '../sim/data';
import { surfaces } from '../sim/stage';
import type { State } from '../sim/types';
import { circle, getBaseScale, makeCanvas, OUTLINE, rrect, screenT, shade } from './art';
import type { Camera } from './camera';

function rnd(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ------------------------------------------------------------------ backgrounds

// Full-screen gradients were re-shaded every frame (about 20× a flat fill on an integrated GPU, D22). The parts of
// each sky that never move are painted once per screen size into a cached layer and copied; moving gradient shapes
// (spotlight beams, the planet) are cached sprites drawn with a transform.
const layerCache = new Map<string, HTMLCanvasElement>();
function cachedLayer(c: CanvasRenderingContext2D, key: string, w: number, h: number, paint: (g: CanvasRenderingContext2D) => void): void {
  const s = getBaseScale(c);
  const W = Math.max(1, Math.ceil(w * s));
  const H = Math.max(1, Math.ceil(h * s));
  const k = `${key}:${W}x${H}`;
  let cv = layerCache.get(k);
  if (!cv) {
    if (layerCache.size > 8) layerCache.clear();
    cv = makeCanvas(W, H);
    const g = cv.getContext('2d')!;
    g.scale(s, s);
    paint(g);
    layerCache.set(k, cv);
  }
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(cv, 0, 0);
  c.restore();
}

const spriteCache = new Map<string, HTMLCanvasElement>();
/** a cached sprite of size w × h (logical pixels, drawn at up to 2 device pixels each) */
function sprite(key: string, w: number, h: number, paint: (g: CanvasRenderingContext2D, w: number, h: number) => void): HTMLCanvasElement {
  let cv = spriteCache.get(key);
  if (!cv) {
    if (spriteCache.size > 40) spriteCache.clear();
    cv = makeCanvas(w, h);
    paint(cv.getContext('2d')!, w, h);
    spriteCache.set(key, cv);
  }
  return cv;
}

function vGradient(g: CanvasRenderingContext2D, w: number, h: number, stops: [number, string][]): void {
  const lg = g.createLinearGradient(0, 0, 0, h);
  for (const [o, col] of stops) lg.addColorStop(o, col);
  g.fillStyle = lg;
  g.fillRect(0, 0, w, h);
}

export function drawBackground(c: CanvasRenderingContext2D, st: State, cam: Camera, w: number, h: number, t: number, blackout: boolean): void {
  const bg = STAGES[st.stage].bg;
  screenT(c);
  if (blackout) {
    c.fillStyle = '#05030a';
    c.fillRect(0, 0, w, h);
    return;
  }
  const px = (f: number): number => w / 2 - cam.x * cam.zoom * f;
  const py = (f: number): number => h / 2 - cam.y * cam.zoom * f;
  const z = cam.zoom;
  if (bg === 'studio') studioBg(c, w, h, t, px, py, z);
  else if (bg === 'rooftops') roofBg(c, w, h, t, px, py, z);
  else if (bg === 'galleon') seaBg(c, w, h, t, px, py, z);
  else spaceBg(c, w, h, t, px, py, z);
}

type PX = (f: number) => number;

function studioBg(c: CanvasRenderingContext2D, w: number, h: number, t: number, px: PX, py: PX, z: number): void {
  cachedLayer(c, 'studio', w, h, (g) =>
    vGradient(g, w, h, [
      [0, '#1a0630'],
      [0.6, '#3a0d4f'],
      [1, '#14041f'],
    ]),
  );
  const s = z * 0.5;
  // big LED screen
  const sx = px(0.15);
  const sy = py(0.15) - 560 * s;
  c.save();
  c.translate(sx, sy);
  c.scale(s, s);
  rrect(c, -520, -170, 1040, 300, 24);
  c.fillStyle = '#0b0614';
  c.fill();
  c.lineWidth = 12;
  c.strokeStyle = '#ffcf3a';
  c.stroke();
  const pulse = 0.6 + 0.4 * Math.sin(t * 0.05);
  c.fillStyle = `rgba(255,58,110,${0.35 * pulse})`;
  c.fillRect(-500, -150, 1000, 260);
  c.font = '900 92px Bungee, Impact, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#fff';
  c.fillText('SMASH YOUR BROS', 0, -40);
  c.font = '900 64px Bungee, Impact, sans-serif';
  c.fillStyle = (t >> 5) % 2 ? '#ffcf3a' : '#ff3a6e';
  c.fillText('★ LIVE ★', 0, 60);
  // marquee bulbs
  for (let i = 0; i < 26; i++) {
    const on = ((i + (t >> 3)) % 3) === 0;
    circle(c, -500 + i * 40, -190, 9, on ? '#fff6c2' : '#7a5a1a', null, 0);
    circle(c, -500 + i * 40, 150, 9, on ? '#fff6c2' : '#7a5a1a', null, 0);
  }
  c.restore();
  // curtains
  for (const side of [-1, 1]) {
    const cx = side < 0 ? 0 : w;
    c.fillStyle = '#7a0d2e';
    c.beginPath();
    c.moveTo(cx, 0);
    c.lineTo(cx + side * w * 0.17, 0);
    for (let i = 0; i <= 6; i++) c.quadraticCurveTo(cx + side * w * (0.13 + 0.02 * (i % 2)), h * (i / 6) + h / 12, cx + side * w * (0.11 - 0.01 * i), h * ((i + 1) / 6));
    c.lineTo(cx, h);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 1; i < 5; i++) c.fillRect(cx + side * w * 0.03 * i, 0, 6, h);
  }
  // spotlights sweeping
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const bx = w * (0.15 + i * 0.23);
    const ang = Math.sin(t * 0.012 + i * 1.7) * 0.5;
    const col = ['255,207,58', '255,58,110', '90,200,255', '190,120,255'][i];
    const beam = sprite(`beam${i}`, 160, 256, (g, sw, sh) => {
      const lg = g.createLinearGradient(0, 0, 0, sh);
      lg.addColorStop(0, `rgba(${col},0.32)`);
      lg.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(sw / 2 - 6, 0);
      g.lineTo(sw / 2 + 6, 0);
      g.lineTo(sw, sh);
      g.lineTo(0, sh);
      g.closePath();
      g.fill();
    });
    c.save();
    c.translate(bx, -20);
    c.rotate(ang);
    c.drawImage(beam, -160, 0, 320, h * 1.1);
    c.restore();
  }
  c.globalCompositeOperation = 'source-over';
}

function roofBg(c: CanvasRenderingContext2D, w: number, h: number, t: number, px: PX, py: PX, z: number): void {
  cachedLayer(c, 'roof', w, h, (g) =>
    vGradient(g, w, h, [
      [0, '#060824'],
      [0.55, '#2a1350'],
      [1, '#ff3a8c'],
    ]),
  );
  // moon and stars
  circle(c, px(0.03) + w * 0.25, py(0.03) - h * 0.15, 70 * Math.max(0.6, z), '#ffe9c2', null, 0);
  for (let i = 0; i < 70; i++) {
    const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.02 + i));
    c.fillStyle = `rgba(255,255,255,${a * 0.7})`;
    c.fillRect((rnd(i) * w * 1.3 + px(0.02)) % w, rnd(i + 99) * h * 0.55, 2, 2);
  }
  // skyline layers
  const layers = [
    { f: 0.12, col: '#1c0f3e', base: 420, hmax: 700, wmin: 80 },
    { f: 0.25, col: '#130a2c', base: 330, hmax: 560, wmin: 110 },
  ];
  for (const L of layers) {
    const s = z * (0.6 + L.f);
    const ox = px(L.f);
    const oy = py(L.f) + L.base * s;
    let x = -2600;
    let i = 0;
    while (x < 2600) {
      const bw = (L.wmin + rnd(i * 7 + L.f * 100) * 140) * s;
      const bh = (180 + rnd(i * 13 + L.f * 50) * L.hmax) * s;
      const sx = ox + x * s;
      c.fillStyle = L.col;
      c.fillRect(sx, oy - bh, bw, bh + h);
      // windows
      for (let wy = 0; wy < bh - 30 * s; wy += 34 * s) {
        for (let wx = 10 * s; wx < bw - 14 * s; wx += 26 * s) {
          const on = rnd(i * 31 + wx * 0.37 + wy * 0.11) > 0.62;
          if (!on) continue;
          c.fillStyle = rnd(i + wy) > 0.5 ? 'rgba(255,220,140,0.55)' : 'rgba(120,230,255,0.5)';
          c.fillRect(sx + wx, oy - bh + 18 * s + wy, 10 * s, 14 * s);
        }
      }
      // neon sign
      if (rnd(i * 3 + L.f) > 0.72) {
        const blink = (t + i * 40) % 160 < 140;
        c.fillStyle = blink ? ['#ff3a8c', '#3affd5', '#ffe63a'][i % 3] : '#331a3a';
        c.fillRect(sx + bw * 0.2, oy - bh - 30 * s, bw * 0.6, 18 * s);
      }
      x += bw / s + 30;
      i++;
    }
  }
}

function seaBg(c: CanvasRenderingContext2D, w: number, h: number, t: number, px: PX, py: PX, z: number): void {
  cachedLayer(c, 'sea', w, h, (g) =>
    vGradient(g, w, h, [
      [0, '#ff8a5a'],
      [0.45, '#ffcf7a'],
      [0.62, '#ffd9a6'],
      [0.63, '#2a8fb8'],
      [1, '#0d3b66'],
    ]),
  );
  // sun
  const sunY = py(0.05) + 60 * z;
  circle(c, px(0.05) - 260 * z, sunY, 120 * Math.max(0.7, z), '#fff1c2', null, 0);
  // heart-shaped cloud (it is the romance episode)
  c.save();
  c.translate(px(0.08) + 420 * z, py(0.08) - 300 * z);
  c.scale(z, z);
  c.fillStyle = 'rgba(255,240,240,0.85)';
  c.beginPath();
  c.moveTo(0, 40);
  c.bezierCurveTo(-120, -40, -60, -120, 0, -60);
  c.bezierCurveTo(60, -120, 120, -40, 0, 40);
  c.fill();
  c.restore();
  // island silhouette
  c.fillStyle = '#7a3a5a';
  c.beginPath();
  const ix = px(0.1) - 900 * z;
  const iy = py(0.1) + 140 * z;
  c.moveTo(ix - 300 * z, iy);
  c.quadraticCurveTo(ix, iy - 260 * z, ix + 400 * z, iy);
  c.fill();
  // waves
  for (let row = 0; row < 6; row++) {
    const yy = h * 0.64 + row * h * 0.07 + Math.sin(t * 0.03 + row) * 4;
    c.strokeStyle = `rgba(255,255,255,${0.25 - row * 0.03})`;
    c.lineWidth = 3;
    c.beginPath();
    for (let x = -40; x < w + 40; x += 40) {
      const yv = yy + Math.sin(x * 0.02 + t * 0.05 + row * 2) * 6;
      if (x === -40) c.moveTo(x, yv);
      else c.lineTo(x, yv);
    }
    c.stroke();
  }
}

function spaceBg(c: CanvasRenderingContext2D, w: number, h: number, t: number, px: PX, py: PX, z: number): void {
  cachedLayer(c, 'space', w, h, (g) => {
    g.fillStyle = '#070418';
    g.fillRect(0, 0, w, h);
    // nebula
    const ng = g.createRadialGradient(w * 0.7, h * 0.3, 10, w * 0.7, h * 0.3, w * 0.6);
    ng.addColorStop(0, 'rgba(255,90,200,0.35)');
    ng.addColorStop(0.5, 'rgba(90,60,255,0.18)');
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = ng;
    g.fillRect(0, 0, w, h);
  });
  for (let i = 0; i < 160; i++) {
    const sx = (rnd(i) * w * 1.4 + px(0.02) * 0.5) % w;
    const sy = (rnd(i + 300) * h * 1.2 + py(0.02) * 0.3) % h;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.03 + i * 1.3));
    c.fillStyle = `rgba(255,255,255,${tw})`;
    const r = rnd(i + 7) > 0.92 ? 2.6 : 1.4;
    c.fillRect(sx, sy, r, r);
  }
  // the candy planet below
  const R = 1400 * Math.max(0.35, z);
  const cx = px(0.08);
  const cy = py(0.08) + R * 0.95 + 300 * z;
  const planet = sprite('planet', 1024, 1024, (g, sw) => {
    const r0 = sw / 2;
    const pg = g.createRadialGradient(r0 - r0 * 0.3, r0 - r0 * 0.5, r0 * 0.2, r0, r0, r0);
    pg.addColorStop(0, '#ffb3e6');
    pg.addColorStop(0.6, '#b45cff');
    pg.addColorStop(1, '#3b1a7a');
    g.fillStyle = pg;
    g.beginPath();
    g.arc(r0, r0, r0, 0, Math.PI * 2);
    g.fill();
  });
  c.drawImage(planet, cx - R, cy - R, R * 2, R * 2);
  c.strokeStyle = 'rgba(255,255,255,0.2)';
  c.lineWidth = 18 * z;
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.ellipse(cx, cy - R * 0.2 + i * R * 0.15, R * (0.98 - i * 0.03), R * 0.08, 0, Math.PI, Math.PI * 2);
    c.stroke();
  }
  // a little satellite drifting
  const sx2 = ((t * 0.6) % (w + 200)) - 100;
  c.fillStyle = '#c9d2e3';
  c.fillRect(sx2, h * 0.18, 18, 10);
  c.fillStyle = '#4a7dff';
  c.fillRect(sx2 - 22, h * 0.18 + 2, 18, 6);
  c.fillRect(sx2 + 22, h * 0.18 + 2, 18, 6);
}

// ------------------------------------------------------------------ stage geometry

const STYLE: Record<string, { top: string; body: string; trim: string }> = {
  studio: { top: '#ffcf3a', body: '#4a1f6e', trim: '#ff3a6e' },
  rooftops: { top: '#55607a', body: '#2a2f45', trim: '#3affd5' },
  galleon: { top: '#b0763f', body: '#6b3d1e', trim: '#e8c07a' },
  orbit: { top: '#d5dcea', body: '#6b7490', trim: '#5ac8ff' },
};

export function drawStage(c: CanvasRenderingContext2D, st: State, t: number, blackout: boolean): void {
  const stg = STAGES[st.stage];
  const S = STYLE[stg.bg] ?? STYLE.studio;
  const ss = surfaces(stg, st.frame, !!st.cfg.flat);
  const nSolid = st.cfg.flat ? 1 : stg.solids.length;
  c.lineJoin = 'round';
  // solids, bottom-most first so the top deck overlaps
  for (let i = nSolid - 1; i >= 0; i--) {
    const s = ss[i];
    const kind = s.kind;
    if (kind === 'building') {
      // the building under the rooftop: walls and windows
      c.fillStyle = '#20253a';
      c.fillRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
      c.fillStyle = 'rgba(255,220,140,0.35)';
      for (let y = s.y1 + 40; y < s.y2; y += 90) for (let x = s.x1 + 40; x < s.x2 - 60; x += 110) if (rnd(x * 0.1 + y) > 0.45) c.fillRect(x, y, 50, 46);
      c.strokeStyle = OUTLINE;
      c.lineWidth = 6;
      c.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
      continue;
    }
    const body = kind === 'under' || kind === 'hull' ? shade(S.body, -0.18 * i) : S.body;
    rrect(c, s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1, i === 0 ? 10 : 18);
    c.fillStyle = body;
    c.fill();
    c.lineWidth = 6;
    c.strokeStyle = OUTLINE;
    c.stroke();
    if (stg.bg === 'galleon') {
      c.strokeStyle = 'rgba(0,0,0,0.25)';
      c.lineWidth = 3;
      for (let y = s.y1 + 18; y < s.y2; y += 18) {
        c.beginPath();
        c.moveTo(s.x1 + 8, y);
        c.lineTo(s.x2 - 8, y);
        c.stroke();
      }
      if (i === 1) {
        // portholes
        for (let x = s.x1 + 120; x < s.x2 - 80; x += 200) circle(c, x, (s.y1 + s.y2) / 2, 18, '#ffd97a', OUTLINE, 5);
      }
    }
    if (stg.bg === 'studio' && i > 0) {
      for (let x = s.x1 + 50; x < s.x2 - 30; x += 70) circle(c, x, s.y1 + 26, 8, (Math.floor(t / 6) + x) % 3 === 0 ? '#fff6c2' : '#7a5a1a', null, 0);
    }
    if (stg.bg === 'orbit' && i === 0) {
      c.fillStyle = S.trim;
      for (let x = s.x1 + 40; x < s.x2 - 40; x += 120) c.fillRect(x, s.y1 + 22, 60, 10);
    }
  }
  // top surface of the main deck
  const m = ss[0];
  c.fillStyle = S.top;
  rrect(c, m.x1, m.y1 - 2, m.x2 - m.x1, 18, 8);
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  c.fillStyle = S.trim;
  c.fillRect(m.x1 + 10, m.y1 + 16, m.x2 - m.x1 - 20, 6);
  if (stg.bg === 'galleon') {
    // mast and sails
    const midX = (m.x1 + m.x2) / 2;
    c.fillStyle = '#5a3418';
    c.fillRect(midX - 14, m.y1 - 520, 28, 520);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 5;
    c.strokeRect(midX - 14, m.y1 - 520, 28, 520);
    c.fillStyle = 'rgba(255,245,230,0.92)';
    c.beginPath();
    c.moveTo(midX + 18, m.y1 - 470);
    c.quadraticCurveTo(midX + 300, m.y1 - 360, midX + 18, m.y1 - 230);
    c.closePath();
    c.fill();
    c.stroke();
    // heart on the sail
    c.fillStyle = '#ff3a6e';
    c.beginPath();
    const hx = midX + 110;
    const hy = m.y1 - 350;
    c.moveTo(hx, hy + 22);
    c.bezierCurveTo(hx - 44, hy - 10, hx - 20, hy - 40, hx, hy - 18);
    c.bezierCurveTo(hx + 20, hy - 40, hx + 44, hy - 10, hx, hy + 22);
    c.fill();
  }
  // soft platforms
  for (let i = nSolid; i < ss.length; i++) {
    const p = ss[i];
    const w = p.x2 - p.x1;
    if (p.kind === 'drone') {
      // a billboard drone: the platform is its top edge
      rrect(c, p.x1, p.y1, w, 70, 10);
      c.fillStyle = '#141826';
      c.fill();
      c.strokeStyle = OUTLINE;
      c.lineWidth = 5;
      c.stroke();
      c.fillStyle = (t >> 4) % 2 ? '#ff3a8c' : '#3affd5';
      c.font = '900 26px Bungee, Impact, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('BRO DEALS', (p.x1 + p.x2) / 2, p.y1 + 36);
      for (const sx of [p.x1 + 20, p.x2 - 20]) {
        c.fillStyle = '#9aa3b5';
        c.fillRect(sx - 30, p.y1 - 10, 60, 6);
        c.fillStyle = 'rgba(200,220,255,0.5)';
        c.fillRect(sx - 34 + ((t * 7) % 10), p.y1 - 14, 68, 3);
      }
      continue;
    }
    if (p.kind === 'panel') {
      rrect(c, p.x1, p.y1, w, 22, 4);
      c.fillStyle = '#2f5fd0';
      c.fill();
      c.strokeStyle = OUTLINE;
      c.lineWidth = 4;
      c.stroke();
      c.strokeStyle = 'rgba(160,210,255,0.6)';
      c.lineWidth = 2;
      for (let x = p.x1 + 25; x < p.x2; x += 25) {
        c.beginPath();
        c.moveTo(x, p.y1 + 3);
        c.lineTo(x, p.y1 + 19);
        c.stroke();
      }
      continue;
    }
    const col = stg.bg === 'galleon' ? '#c9935a' : stg.bg === 'rooftops' ? '#7c879e' : stg.bg === 'orbit' ? '#b7c0d4' : '#ff3a6e';
    rrect(c, p.x1, p.y1, w, 16, 7);
    c.fillStyle = col;
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 4;
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(p.x1 + 8, p.y1 + 3, w - 16, 3);
    if (stg.bg === 'studio') {
      // glowing underside
      c.fillStyle = 'rgba(255,58,110,0.25)';
      c.fillRect(p.x1 + 10, p.y1 + 16, w - 20, 14);
    }
  }
  if (blackout) {
    // stage edges stay faintly visible in the dark
    c.strokeStyle = 'rgba(120,200,255,0.25)';
    c.lineWidth = 3;
    c.strokeRect(m.x1, m.y1, m.x2 - m.x1, 4);
  }
}

/** foreground crowd (studio) and other overlays, screen space */
export function drawForeground(c: CanvasRenderingContext2D, st: State, w: number, h: number, t: number, cheer: number): void {
  const bg = STAGES[st.stage].bg;
  if (bg !== 'studio') return;
  screenT(c);
  const n = Math.ceil(w / 46) + 2;
  for (let i = 0; i < n; i++) {
    const bounce = Math.abs(Math.sin(t * 0.08 + i * 0.7)) * (4 + cheer * 14);
    const x = i * 46 - 20;
    const y = h + 18 - bounce;
    c.fillStyle = ['#2a0f3a', '#3a1450', '#22092f'][i % 3];
    c.beginPath();
    c.arc(x, y - 24, 22, 0, Math.PI * 2);
    c.fill();
    c.fillRect(x - 28, y - 10, 56, 40);
    if (cheer > 0.3 && i % 4 === 0) {
      c.fillRect(x + 14, y - 64 - bounce, 8, 40);
      c.beginPath();
      c.arc(x + 18, y - 68 - bounce, 9, 0, Math.PI * 2);
      c.fill();
    }
  }
}
