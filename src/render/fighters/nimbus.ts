// Nimbus: a puffy cumulus kid. Big cloud head with a lightning-bolt cowlick, a little cloud body, a striped
// scarf, stubby misty limbs and bright rain boots. Cries happy rain, crackles when it means business.
import { A } from '../../sim/acts';
import { FIGHTERS } from '../../sim/data';
import type { Proj } from '../../sim/types';
import { boneFrame, circle, ellipse, eyes, fillStroke, mouth, OUTLINE, rgba, rrect, shade, type ArtDef, type FView } from '../art';
import { registerProjDraw } from '../things';

const R = 25; // head radius
const TORSO = 24;
const GIRTH = 17;

function moveId(v: FView): string {
  return v.f.act === A.MOVE ? (FIGHTERS[v.f.def].moveIds[v.f.mv] ?? '') : '';
}

/** a cloud: the union of circles with one outline around the whole thing */
function puffs(c: CanvasRenderingContext2D, list: [number, number, number][], fill: string, shadeCol: string | null, ol: string, olw: number): void {
  c.lineJoin = 'round';
  for (const [x, y, r] of list) circle(c, x, y, r, '', ol, olw * 2);
  c.fillStyle = fill;
  for (const [x, y, r] of list) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  if (shadeCol) {
    c.save();
    c.beginPath();
    for (const [x, y, r] of list) {
      c.moveTo(x + r, y);
      c.arc(x, y, r, 0, Math.PI * 2);
    }
    c.clip();
    // soft underside shade: a big offset blob
    let maxY = -1e9;
    for (const [, y, r] of list) maxY = Math.max(maxY, y + r);
    ellipse(c, 4, maxY + 6, 60, 18, 0, shadeCol, null, 0);
    for (const [x, y, r] of list) circle(c, x - r * 0.28, y - r * 0.34, r * 0.26, 'rgba(255,255,255,0.2)', null, 0);
    c.restore();
  }
}

function zig(c: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string, ol: string): void {
  c.beginPath();
  c.moveTo(x + 2 * s, y - 10 * s);
  c.lineTo(x - 4 * s, y + 1 * s);
  c.lineTo(x + 0.5 * s, y + 1 * s);
  c.lineTo(x - 3 * s, y + 10 * s);
  c.lineTo(x + 5 * s, y - 2 * s);
  c.lineTo(x + 0.5 * s, y - 2 * s);
  c.lineTo(x + 4 * s, y - 10 * s);
  c.closePath();
  fillStroke(c, fill, ol, 2.4);
}

function cloudCols(v: FView): { main: string; shade: string } {
  if (moveId(v) === 'ult') return { main: shade(v.p.main, -0.45), shade: shade(v.p.second, -0.55) };
  return { main: v.p.main, shade: v.p.second };
}

/** jagged lightning from (x1,y1) to (x2,y2) */
function lightning(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w: number, seed: number, t: number): void {
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const n = Math.max(3, Math.floor(L / 24));
  const nx = -(y2 - y1) / L;
  const ny = (x2 - x1) / L;
  const amp = Math.min(L * 0.12, 8 + w * 1.6);
  const pts: [number, number][] = [[x1, y1]];
  for (let i = 1; i < n; i++) {
    const k = i / n;
    const j = Math.sin(seed * 12.9898 + i * 78.233 + Math.floor(t / 3) * 3.1) * 43758.5453;
    const off = (j - Math.floor(j) - 0.5) * 2 * amp * (i % 2 ? 1 : -1);
    pts.push([x1 + (x2 - x1) * k + nx * off, y1 + (y2 - y1) * k + ny * off]);
  }
  pts.push([x2, y2]);
  const path = (): void => {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts) c.lineTo(p[0], p[1]);
  };
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.globalCompositeOperation = 'lighter';
  path();
  c.strokeStyle = 'rgba(255,230,90,0.35)';
  c.lineWidth = w * 3.2;
  c.stroke();
  c.restore();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  path();
  c.strokeStyle = OUTLINE;
  c.lineWidth = w + 5;
  c.stroke();
  path();
  c.strokeStyle = '#ffe14f';
  c.lineWidth = w;
  c.stroke();
  path();
  c.strokeStyle = '#ffffff';
  c.lineWidth = Math.max(1.5, w * 0.4);
  c.stroke();
}

function stormCloud(c: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const list: [number, number, number][] = [
    [x - 34 * s, y + 4 * s, 26 * s],
    [x, y - 8 * s, 32 * s],
    [x + 36 * s, y + 2 * s, 26 * s],
    [x - 14 * s, y + 14 * s, 22 * s],
    [x + 16 * s, y + 14 * s, 22 * s],
  ];
  puffs(c, list, '#5b6178', '#3c4054', OUTLINE, 3);
}

function drawBolt(c: CanvasRenderingContext2D, p: Proj, r: number, t: number): void {
  const topY = p.y - p.vy * p.age - 30;
  stormCloud(c, p.x, topY - 10, r / 28);
  lightning(c, p.x, topY + 10, p.x, p.y + r * 0.6, Math.max(6, r * 0.36), p.id, t);
  c.save();
  c.globalCompositeOperation = 'lighter';
  circle(c, p.x, p.y, r * 1.2, 'rgba(255,240,140,0.35)', null, 0);
  c.restore();
}

registerProjDraw('nimbusRain', (c, p, r) => {
  const a = Math.atan2(p.vy, p.vx);
  c.save();
  c.translate(p.x, p.y);
  c.rotate(a);
  c.beginPath();
  c.moveTo(r * 1.9, 0);
  c.quadraticCurveTo(r * 0.2, -r * 1.05, -r * 0.8, -r * 0.4);
  c.arc(0, 0, r * 0.95, Math.PI * 1.18, Math.PI * 0.82, true);
  c.quadraticCurveTo(r * 0.2, r * 1.05, r * 1.9, 0);
  c.closePath();
  fillStroke(c, '#69c8ff', OUTLINE, 2.4);
  circle(c, -r * 0.2, -r * 0.3, r * 0.3, 'rgba(255,255,255,0.9)', null, 0);
  c.restore();
});

registerProjDraw('nimbusGust', (c, p, r, t) => {
  const k = 1 - p.age / 36;
  const dir = p.vx >= 0 ? 1 : -1;
  c.save();
  c.translate(p.x, p.y);
  c.scale(dir, 1);
  c.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const yy = (i - 1.5) * r * 0.42;
    const len = r * (1.2 + (i % 2) * 0.5);
    const sx = -len - ((t * 6 + i * 13) % 20);
    c.beginPath();
    c.moveTo(sx, yy);
    c.quadraticCurveTo(0, yy - r * 0.15, r * 0.4, yy);
    c.arc(r * 0.4, yy - r * 0.16, r * 0.16, Math.PI / 2, -Math.PI * 0.9, true);
    c.strokeStyle = rgba('#1b0f24', 0.55 * k);
    c.lineWidth = 7;
    c.stroke();
    c.strokeStyle = `rgba(255,255,255,${0.9 * k})`;
    c.lineWidth = 3.5;
    c.stroke();
  }
  // a curl at the front
  c.beginPath();
  c.arc(r * 0.6, 0, r * 0.35, 0, Math.PI * 1.6);
  c.strokeStyle = `rgba(220,245,255,${0.8 * k})`;
  c.lineWidth = 4;
  c.stroke();
  c.restore();
});

registerProjDraw('nimbusBolt', (c, p, r, t) => drawBolt(c, p, r, t));
registerProjDraw('nimbusStorm', (c, p, r, t) => drawBolt(c, p, r, t));

export const nimbusArt: ArtDef = {
  limb: 9,
  handR: 7,
  footL: 20,
  palettes: [
    { name: 'Fair Weather', main: '#f6fcff', second: '#c9e2f5', accent: '#ffd23a', skin: '#ff9fb4', extra: '#ffcf3a' },
    { name: 'Thunderhead', main: '#7d86a3', second: '#565d78', accent: '#fff07a', skin: '#ffb0c8', extra: '#3a7bff' },
    { name: 'Sunset Puff', main: '#ffd9c2', second: '#f2a48d', accent: '#ff5f8a', skin: '#ff7a8f', extra: '#8a55ff' },
    { name: 'Cotton Candy', main: '#ffe0f2', second: '#bcdcff', accent: '#5fd6ff', skin: '#ff8ac6', extra: '#ff6fb5' },
    { name: 'Aurora', main: '#d6fff3', second: '#8fdcc9', accent: '#b26bff', skin: '#ff9fc8', extra: '#1fc0b0' },
    { name: 'Night Sky', main: '#3a4385', second: '#262c5c', accent: '#ffe07a', skin: '#ff8fb8', extra: '#ffcf3a' },
    { name: 'Snow Day', main: '#ffffff', second: '#dbeeff', accent: '#7fd0ff', skin: '#ffa3b0', extra: '#e43a3a' },
    { name: 'Golden Hour', main: '#fff0b8', second: '#f5c766', accent: '#ff8a2a', skin: '#ff9a7a', extra: '#46b85a' },
  ],
  upperArm: (p) => p.main,
  foreArm: (p) => p.main,
  thigh: (p) => p.main,
  shin: (p) => p.main,
  back: (c, v) => {
    // Perfect Storm: a churning thunderhead over Nimbus
    if (moveId(v) === 'ult') {
      const s = v.k.scale;
      const x = v.k.head[0];
      const y = v.k.head[1] - 120 * s;
      const w = Math.sin(v.t * 0.2) * 6;
      stormCloud(c, x - 70 * s + w, y + 10 * s, 1.6 * s);
      stormCloud(c, x + 80 * s - w, y + 20 * s, 1.4 * s);
      stormCloud(c, x, y - 20 * s, 2 * s);
      if (v.t % 10 < 4) lightning(c, x - 40 * s, y + 30 * s, x - 70 * s, y + 160 * s, 5, v.t, v.t);
    }
  },
  torso: (c, v) => {
    const k = v.k;
    const cols = cloudCols(v);
    boneFrame(c, v, k.hip, k.ang.torso);
    puffs(
      c,
      [
        [0, -4, GIRTH * 0.95],
        [-GIRTH * 0.55, -TORSO * 0.42, GIRTH * 0.78],
        [GIRTH * 0.5, -TORSO * 0.45, GIRTH * 0.8],
        [0, -TORSO * 0.82, GIRTH * 0.85],
      ],
      cols.main,
      cols.shade,
      v.ol,
      3,
    );
    // striped scarf at the neck, tail flapping behind
    const flap = Math.sin(v.t * 0.25) * 4 + (v.f.gnd < 0 ? 6 : 0);
    c.beginPath();
    c.moveTo(-GIRTH * 0.4, -TORSO - 2);
    c.quadraticCurveTo(-GIRTH * 1.3, -TORSO + 2 + flap * 0.5, -GIRTH * 1.9, -TORSO + 10 + flap);
    c.lineTo(-GIRTH * 1.7, -TORSO + 18 + flap);
    c.quadraticCurveTo(-GIRTH * 1.1, -TORSO + 8, -GIRTH * 0.2, -TORSO + 6);
    c.closePath();
    fillStroke(c, v.p.accent, v.ol, 2.6);
    rrect(c, -GIRTH * 0.9, -TORSO - 5, GIRTH * 1.9, 11, 5);
    fillStroke(c, v.p.accent, v.ol, 2.6);
    c.fillStyle = shade(v.p.accent, -0.25);
    for (let i = 0; i < 3; i++) c.fillRect(-GIRTH * 0.55 + i * GIRTH * 0.55, -TORSO - 3.5, 4.5, 8);
    c.restore();
  },
  head: (c, v) => {
    const p = v.p;
    const cols = cloudCols(v);
    const mid = moveId(v);
    // the cowlick (a tiny lightning bolt) sits behind the puffs
    const crackle = v.f.act === A.MOVE && v.t % 6 < 3;
    zig(c, R * 0.12, -R * 1.5, 1.75, crackle ? '#ffffff' : p.accent, v.ol);
    const breathe = mid === 'sspec' && v.f.mf < 13 ? 1.12 : 1;
    puffs(
      c,
      [
        [R * 0.08, R * 0.05, R * 0.92 * breathe],
        [-R * 0.62, R * 0.2, R * 0.62],
        [R * 0.68, R * 0.22, R * 0.6 * breathe],
        [-R * 0.38, -R * 0.55, R * 0.6],
        [R * 0.3, -R * 0.62, R * 0.62],
        [-R * 0.95, -R * 0.15, R * 0.42],
        [R * 0.92, -R * 0.2, R * 0.4],
      ],
      cols.main,
      cols.shade,
      v.ol,
      3,
    );
    // cheeks
    circle(c, R * 0.72, R * 0.36, R * 0.16, rgba(p.skin, 0.65), null, 0);
    circle(c, -R * 0.05, R * 0.38, R * 0.13, rgba(p.skin, 0.5), null, 0);
    const iris = shade(p.second, -0.55);
    eyes(c, v, R * 0.32, -R * 0.02, R * 0.3, iris, { gap: R * 0.62 });
    if (mid === 'sspec' && v.f.mf >= 13 && v.f.mf < 32) {
      // blowing: a little O mouth with puffed cheeks
      ellipse(c, R * 0.62, R * 0.45, R * 0.13, R * 0.17, 0, '#5a1a2a', v.ol, 2.4);
    } else if (mid === 'sspec') {
      circle(c, R * 0.6, R * 0.45, R * 0.2, rgba(p.skin, 0.8), v.ol, 2.2);
    } else mouth(c, v, R * 0.4, R * 0.44, R * 0.36);
    // tears: hurt = sad rain, happy = happy rain
    if (v.expr === 'hurt' || v.expr === 'happy') {
      for (let i = 0; i < 3; i++) {
        const ph = (v.t * 2 + i * 9) % 26;
        const tx = R * (0.12 + (i % 2) * 0.45);
        circle(c, tx + (v.expr === 'happy' ? ph * 0.4 : 0), R * 0.2 + ph, 2.8 + (i % 2), '#69c8ff', v.ol, 1.4);
      }
    }
    // taunt: a tiny rainbow
    if (v.f.act === A.TAUNT && v.f.af > 10) {
      const k = Math.min(1, (v.f.af - 10) / 10);
      const cols2 = ['#ff4a4a', '#ffb13a', '#ffe14f', '#46d86a', '#3a9bff', '#9b6bff'];
      c.save();
      c.lineCap = 'round';
      for (let i = 0; i < cols2.length; i++) {
        c.beginPath();
        c.arc(0, -R * 0.9, R * (1.6 - i * 0.1), Math.PI, Math.PI + Math.PI * k);
        c.strokeStyle = cols2[i];
        c.lineWidth = R * 0.1;
        c.stroke();
      }
      c.restore();
    }
  },
  hand: (c, v, x, y, front) => {
    const col = front ? cloudCols(v).main : shade(cloudCols(v).main, -0.15);
    const s = v.k.scale;
    puffs(c, [[x, y, 7.5 * s], [x + 4 * s * v.k.facing, y - 3 * s, 5 * s]], col, null, v.ol, 2.6);
  },
  foot: (c, v, front) => {
    const k = v.k;
    const pt = front ? k.footF : k.footB;
    const phi = front ? k.ang.shF : k.ang.shB;
    boneFrame(c, v, pt, phi - 180);
    const col = front ? v.p.extra ?? '#ffcf3a' : shade(v.p.extra ?? '#ffcf3a', -0.22);
    // a chunky rain boot
    c.beginPath();
    c.moveTo(-8, -12);
    c.lineTo(5, -12);
    c.lineTo(5, -2);
    c.quadraticCurveTo(16, -3, 16, 5);
    c.lineTo(-9, 5);
    c.closePath();
    fillStroke(c, col, v.ol, 2.6);
    rrect(c, -10, -16, 17, 6, 3);
    fillStroke(c, shade(col, 0.35), v.ol, 2.2);
    rrect(c, -10, 3, 27, 4.5, 2);
    fillStroke(c, shade(col, -0.45), v.ol, 1.6);
    c.restore();
  },
  weapon: (c, v) => {
    // Lightning Rod: a tiny copper rod held high
    if (moveId(v) !== 'dspec') return;
    const k = v.k;
    boneFrame(c, v, k.handF, k.ang.foreF);
    rrect(c, -2.5, -34, 5, 34, 2);
    fillStroke(c, '#d98a4a', v.ol, 2.2);
    circle(c, 0, -36, 5, '#ffcf8a', v.ol, 2.2);
    c.restore();
    if (v.f.mf >= 12 && v.f.mf <= 22) {
      const hx = k.handF[0];
      const hy = k.handF[1];
      lightning(c, hx, hy - 160, hx, hy - 40, 4, v.f.mf, v.t);
    }
  },
  front: (c, v) => {
    const k = v.k;
    const mid = moveId(v);
    const mf = v.f.mf;
    if (mid === 'fsmash' && mf >= 12 && mf <= 20) {
      // thunderclap: sparks between the palms
      lightning(c, k.handB[0], k.handB[1], k.handF[0] + 26 * k.facing, k.handF[1] - 6, 4, mf, v.t);
      lightning(c, k.handF[0], k.handF[1], k.handF[0] + 46 * k.facing, k.handF[1] + 12, 3, mf + 7, v.t);
    }
    if ((mid === 'usmash' || mid === 'ult') && mf >= 8 && (mid === 'ult' || mf <= 18)) {
      const hx = k.head[0];
      const hy = k.head[1];
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.7 + Math.sin(v.t * 0.5 + i) * 0.15;
        lightning(c, hx, hy - 20, hx + Math.cos(a) * 60, hy + Math.sin(a) * 60, 3, i + mf, v.t);
      }
    }
    if (mid === 'uspec' && mf >= 6 && mf <= 34) {
      // whirlwind around Nimbus
      const cx = k.hip[0];
      const cy = k.hip[1] - 10;
      c.save();
      c.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const ph = (v.t * 0.5 + i * 1.6) % (Math.PI * 2);
        ellipse(c, cx, cy + 30 - i * 22, 46 - i * 4, 11, 0, '', `rgba(255,255,255,${0.35 + 0.15 * Math.sin(ph)})`, 4);
      }
      c.restore();
    }
    if (mid === 'dsmash' && mf >= 8 && mf <= 16) {
      const fy = Math.max(k.footF[1], k.footB[1]);
      for (const s of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
          const t = (mf - 8) / 8;
          const dx = s * (30 + i * 10 + t * 30);
          const dy = -Math.sin((i / 4) * Math.PI) * 30 * (1 - t * 0.4) - 6;
          circle(c, k.hip[0] + dx, fy + dy, 6 - i * 0.6, '#69c8ff', v.ol, 2);
        }
      }
    }
    if (mid === 'nspec' || mid === 'nspecAir') {
      // a little personal raincloud squeezed from the hands
      if (v.t % 4 < 2) circle(c, k.handF[0] + 8 * k.facing, k.handF[1] + 6, 3, '#69c8ff', v.ol, 1.4);
    }
  },
};
