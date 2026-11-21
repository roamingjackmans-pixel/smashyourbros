// Coral: surfer tide-witch. Breaking-wave hair with foam tips, starfish clip, shell earrings, wave-print rash guard,
// board shorts, bare feet with anklets, a surfboard on her back, and Gerald the living water whip.
import { A } from '../../sim/acts';
import { FIGHTERS } from '../../sim/data';
import { evalKeys } from '../../sim/poses';
import { boneFrame, circle, ellipse, eyes, fillStroke, mouth, OUTLINE, rgba, rrect, shade, type ArtDef, type FView } from '../art';
import { registerProjDraw } from '../things';

const L = 34; // torso
const G = 13; // girth
const HR = 20; // head radius

/** moves where Gerald is stretched out as a lash */
const WHIP = new Set(['jab3', 'ftilt', 'utilt', 'dtilt', 'fsmash', 'usmash', 'dsmash', 'nair', 'fair', 'bair', 'uair', 'dair', 'grab', 'dashgrab', 'sspec', 'sspecAir', 'ledgeatk', 'getupatk']);
/** moves where the surfboard leaves her back and goes under her feet */
const BOARD_FEET = new Set(['dash', 'ult', 'ultHop']);

function moveId(v: FView): string {
  return v.f.act === A.MOVE ? (FIGHTERS[v.f.def].moveIds[v.f.mv] ?? '') : '';
}

type P2 = [number, number];

// ------------------------------------------------------------------ water helpers

/** a tapered water rope through points, outline then fill then a glint */
function waterRope(c: CanvasRenderingContext2D, pts: P2[], w0: number, w1: number, col: string, ol: string): void {
  const n = pts.length - 1;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const wAt = (i: number): number => w0 + (w1 - w0) * (i / n);
  // soft glow
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = rgba(col, 0.18);
  c.lineWidth = w0 + 10;
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.stroke();
  c.restore();
  for (let i = 0; i < n; i++) {
    c.strokeStyle = ol;
    c.lineWidth = wAt(i) + 5;
    c.beginPath();
    c.moveTo(pts[i][0], pts[i][1]);
    c.lineTo(pts[i + 1][0], pts[i + 1][1]);
    c.stroke();
  }
  for (let i = 0; i < n; i++) {
    c.strokeStyle = col;
    c.lineWidth = wAt(i);
    c.beginPath();
    c.moveTo(pts[i][0], pts[i][1]);
    c.lineTo(pts[i + 1][0], pts[i + 1][1]);
    c.stroke();
  }
  c.strokeStyle = 'rgba(255,255,255,0.75)';
  c.lineWidth = Math.max(1.2, w0 * 0.22);
  c.beginPath();
  for (let i = 0; i <= n * 0.8; i++) {
    const p = pts[i];
    if (i === 0) c.moveTo(p[0], p[1] - w0 * 0.18);
    else c.lineTo(p[0], p[1] - wAt(i) * 0.18);
  }
  c.stroke();
}

function foam(c: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, ol: string): void {
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + t * 0.2;
    circle(c, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.45, r * (0.55 - i * 0.07), '#ffffff', ol, 1.6);
  }
}

function star(c: CanvasRenderingContext2D, x: number, y: number, r1: number, r2: number, n: number, rot: number): void {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = (i * Math.PI) / n + rot;
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
}

/** Gerald stretched from the hand to the whip tip (or a ledge it has snagged) */
function drawLash(c: CanvasRenderingContext2D, v: FView): void {
  const f = v.f;
  const k = v.k;
  const cf = FIGHTERS[f.def];
  const m = cf.moves[f.mv];
  const id = cf.moveIds[f.mv];
  const mf = f.mf;
  const col = v.p.accent;
  // the water forms out of the hand, then drains back after the last active frame
  let frac = Math.min(1, 0.3 + mf * 0.2);
  const lastHit = (m.hits ?? []).reduce((a, h) => Math.max(a, h.f[1]), 0);
  const tail = m.frames - (lastHit + 4);
  if (mf > lastHit + 4 && tail > 0) frac *= Math.max(0.14, 1 - (mf - lastHit - 4) / tail);
  const H: P2 = k.handF;
  let T: P2 = k.wep;
  let bend = 0;
  const snag = id === 'sspecAir' && f.v[0] === 1;
  if (snag) {
    T = [f.v[1], f.v[2]];
    frac = 1;
  } else {
    // swing speed from the previous frame's pose: the middle trails behind the swing
    const prev = evalKeys(m.anim, Math.max(0, mf - 1), cf.def.poses);
    const prevPhi = prev.rot + prev.lean + 180 - prev.armF - prev.foreF - prev.wep;
    const dphi = k.ang.wep - prevPhi;
    bend = Math.max(-46, Math.min(46, dphi * 0.9));
  }
  const dx = T[0] - H[0];
  const dy = T[1] - H[1];
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // perpendicular in the direction of increasing pose angle (mirrored by facing and gravity)
  const sg = k.facing * k.grav;
  const nx = -uy * sg;
  const ny = ux * sg;
  const Tx = H[0] + dx * frac;
  const Ty = H[1] + dy * frac;
  const Cx = (H[0] + Tx) / 2 - nx * bend * frac;
  const Cy = (H[1] + Ty) / 2 - ny * bend * frac;
  const N = 16;
  const pts: P2[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = (1 - t) * (1 - t);
    const b = 2 * t * (1 - t);
    const cc = t * t;
    const ripple = snag ? Math.sin(t * 9 - v.t * 0.9) * 2 * t : Math.sin(t * 11 - v.t * 0.55) * 2.6 * t * (1 - t) * 2;
    pts.push([a * H[0] + b * Cx + cc * Tx + nx * ripple, a * H[1] + b * Cy + cc * Ty + ny * ripple]);
  }
  waterRope(c, pts, 8.5 * k.scale, 3 * k.scale, col, v.ol);
  // foam at the tip
  foam(c, Tx, Ty, 7 * k.scale, v.t, v.ol);
  // droplets flung off a fast swing
  if (Math.abs(bend) > 14 && frac > 0.6) {
    const s = bend > 0 ? 1 : -1;
    for (let i = 0; i < 4; i++) {
      const back = 10 + i * 11;
      const px = Tx - nx * s * back + ux * (i % 2 ? 6 : -4);
      const py = Ty - ny * s * back + uy * (i % 2 ? 6 : -4);
      circle(c, px, py, 3.6 - i * 0.6, col, v.ol, 1.4);
      circle(c, px - 0.8, py - 0.8, 1, '#ffffff', null, 0);
    }
  }
  // the crack: a splash star on active tip frames
  const active = (m.hits ?? []).some((h) => h.at === 'wep' && !h.grab && mf >= h.f[0] && mf <= h.f[1]);
  if (active && !snag) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    circle(c, Tx, Ty, 22 * k.scale, rgba(col, 0.35), null, 0);
    c.restore();
    star(c, Tx, Ty, 19 * k.scale, 7 * k.scale, 6, v.t * 0.3);
    fillStroke(c, '#ffffff', v.ol, 2);
    circle(c, Tx, Ty, 5 * k.scale, col, null, 0);
  }
  if (snag) {
    // wrapped around the ledge corner
    ellipse(c, T[0], T[1], 9, 6, 0, 'rgba(0,0,0,0)', v.ol, 5);
    ellipse(c, T[0], T[1], 9, 6, 0, 'rgba(0,0,0,0)', col, 2.5);
    foam(c, T[0], T[1] - 4, 6, v.t, v.ol);
  }
}

/** Gerald resting: a coil of water looped over the front hand */
function drawCoil(c: CanvasRenderingContext2D, v: FView): void {
  const k = v.k;
  const s = k.scale;
  const col = v.p.accent;
  const sway = Math.sin(v.t * 0.09 + v.f.i) * 2;
  c.save();
  c.translate(k.handF[0], k.handF[1]);
  c.scale(k.facing * s, k.grav * s);
  c.lineCap = 'round';
  for (const pass of [0, 1]) {
    c.strokeStyle = pass ? col : v.ol;
    c.lineWidth = pass ? 4.5 : 9;
    c.beginPath();
    c.ellipse(-2 + sway * 0.3, 12, 8, 12, 0.2, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.ellipse(3 + sway * 0.4, 14, 7, 11, -0.25, 0, Math.PI * 2);
    c.stroke();
    // dangling end
    c.beginPath();
    c.moveTo(4, 24);
    c.quadraticCurveTo(10 + sway, 32, 4 + sway, 38);
    c.stroke();
  }
  c.strokeStyle = 'rgba(255,255,255,0.7)';
  c.lineWidth = 1.6;
  c.beginPath();
  c.ellipse(-2 + sway * 0.3, 12, 8, 12, 0.2, 3.6, 4.6);
  c.stroke();
  circle(c, 4 + sway, 39, 3, '#ffffff', v.ol, 1.4);
  c.restore();
}

/** the surfboard, centred at 0,0 along +x (nose forward), in the current frame */
function board(c: CanvasRenderingContext2D, v: FView, len: number, wid: number): void {
  const p = v.p;
  const base = shade(p.second, 0.45);
  c.beginPath();
  c.moveTo(len * 0.5, 0);
  c.quadraticCurveTo(len * 0.38, -wid * 0.55, 0, -wid * 0.5);
  c.quadraticCurveTo(-len * 0.45, -wid * 0.45, -len * 0.5, 0);
  c.quadraticCurveTo(-len * 0.45, wid * 0.45, 0, wid * 0.5);
  c.quadraticCurveTo(len * 0.38, wid * 0.55, len * 0.5, 0);
  c.closePath();
  fillStroke(c, base, v.ol, 3);
  c.save();
  c.clip();
  c.fillStyle = p.main;
  c.fillRect(-len * 0.08, -wid, len * 0.07, wid * 2);
  c.fillRect(len * 0.03, -wid, len * 0.025, wid * 2);
  c.fillStyle = shade(base, -0.15);
  c.fillRect(-len, wid * 0.15, len * 2, wid);
  c.restore();
  c.beginPath();
  c.moveTo(len * 0.46, 0);
  c.lineTo(-len * 0.46, 0);
  c.strokeStyle = rgba('#000000', 0.25);
  c.lineWidth = 1.4;
  c.stroke();
}

// ------------------------------------------------------------------ props: bubble, whirlpool, tsunami

function bubbleShape(c: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, fish: boolean): void {
  const wob = Math.sin(t * 0.3) * 0.07;
  const rx = r * (1 + wob);
  const ry = r * (1 - wob);
  c.save();
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.10)');
  g.addColorStop(0.7, 'rgba(160,240,255,0.18)');
  g.addColorStop(1, 'rgba(120,210,255,0.55)');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
  // iridescent sheen
  const cols = ['rgba(255,120,220,0.7)', 'rgba(255,240,120,0.65)', 'rgba(120,255,230,0.7)'];
  cols.forEach((cl, i) => {
    c.strokeStyle = cl;
    c.lineWidth = 2.4;
    c.beginPath();
    c.ellipse(x, y, rx * (0.86 - i * 0.05), ry * (0.86 - i * 0.05), 0, 0.3 + t * 0.04 + i * 0.5, 1.4 + t * 0.04 + i * 0.5);
    c.stroke();
  });
  c.strokeStyle = 'rgba(27,15,36,0.75)';
  c.lineWidth = 2.6;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.stroke();
  // highlight
  ellipse(c, x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.12, -0.7, 'rgba(255,255,255,0.9)', null, 0);
  circle(c, x + r * 0.4, y + r * 0.35, r * 0.07, 'rgba(255,255,255,0.8)', null, 0);
  if (fish) {
    // a tiny reef fish swimming laps inside
    const a = t * 0.08;
    const fx = x + Math.cos(a) * r * 0.35;
    const fy = y + Math.sin(a * 2) * r * 0.18;
    const dir = -Math.sin(a) >= 0 ? 1 : -1;
    c.translate(fx, fy);
    c.scale(dir, 1);
    ellipse(c, 0, 0, r * 0.22, r * 0.13, 0, '#ffa24a', OUTLINE, 1.6);
    c.beginPath();
    c.moveTo(-r * 0.18, 0);
    c.lineTo(-r * 0.34, -r * 0.12);
    c.lineTo(-r * 0.34, r * 0.12);
    c.closePath();
    fillStroke(c, '#ffa24a', OUTLINE, 1.6);
    c.fillStyle = '#ffffff';
    c.fillRect(-r * 0.04, -r * 0.12, r * 0.06, r * 0.24);
    circle(c, r * 0.1, -r * 0.02, 1.4, OUTLINE, null, 0);
  }
  c.restore();
}

registerProjDraw('coralBubble', (c, p, r, t) => {
  bubbleShape(c, p.x, p.y, r, t + p.id * 13, true);
});

registerProjDraw('coralWhirl', (c, p, r, t) => {
  c.save();
  const gy = p.y + 90; // the floor under the vortex (the projectile sits at chest height)
  const fade = Math.min(1, (p.life - p.age) / 20, p.age / 8);
  const rise = Math.min(1, p.age / 12);
  c.globalAlpha *= fade;
  void r;
  // the pull area: faint rings sliding inward
  for (let i = 0; i < 3; i++) {
    const ph = ((t * 0.02 + i / 3) % 1);
    const rr = 200 * (1 - ph) + 40;
    c.strokeStyle = `rgba(150,230,255,${0.28 * ph})`;
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(p.x, gy, rr, rr * 0.18, 0, 0, Math.PI * 2);
    c.stroke();
  }
  // the vortex: a tilted disc with spiral arms
  ellipse(c, p.x, gy, 74, 17, 0, '#1f6fd0', OUTLINE, 3.5);
  ellipse(c, p.x, gy, 58, 13, 0, '#3aa8ff', null, 0);
  ellipse(c, p.x, gy + 1, 26, 6, 0, '#0e3a7a', null, 0);
  c.lineCap = 'round';
  for (let arm = 0; arm < 4; arm++) {
    c.beginPath();
    for (let j = 0; j <= 14; j++) {
      const s = j / 14;
      const a = -t * 0.22 + arm * (Math.PI / 2) + s * 3.4;
      const rr = 66 * (1 - s) + 8;
      const px = p.x + Math.cos(a) * rr;
      const py = gy + Math.sin(a) * rr * 0.23;
      if (j) c.lineTo(px, py);
      else c.moveTo(px, py);
    }
    c.strokeStyle = arm % 2 ? 'rgba(255,255,255,0.9)' : 'rgba(170,240,255,0.85)';
    c.lineWidth = arm % 2 ? 3 : 2.2;
    c.stroke();
  }
  // the funnel: a twisting column of water rising out of the eye
  const top = gy - 140 * rise;
  const wAt = (y: number): number => 9 + ((gy - y) / 140) * 34;
  const funnel = (): void => {
    c.beginPath();
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const y = gy - (gy - top) * (i / n);
      const w = wAt(y) + Math.sin(t * 0.35 + i) * 2.5;
      if (i) c.lineTo(p.x + w, y);
      else c.moveTo(p.x + w, y);
    }
    for (let i = n; i >= 0; i--) {
      const y = gy - (gy - top) * (i / n);
      c.lineTo(p.x - wAt(y) - Math.sin(t * 0.35 + i + 1.5) * 2.5, y);
    }
    c.closePath();
  };
  c.save();
  c.globalAlpha *= 0.62;
  const g = c.createLinearGradient(0, top, 0, gy);
  g.addColorStop(0, '#bff4ff');
  g.addColorStop(1, '#1f6fd0');
  funnel();
  c.fillStyle = g;
  c.fill();
  c.restore();
  c.save();
  funnel();
  c.clip();
  // spiral bands sliding round the column
  c.strokeStyle = 'rgba(255,255,255,0.8)';
  c.lineWidth = 3;
  for (let b = 0; b < 5; b++) {
    c.beginPath();
    for (let j = 0; j <= 16; j++) {
      const y = gy - (gy - top) * (j / 16);
      const ph = t * 0.3 + b * 1.25 + j * 0.55;
      const x = p.x + Math.sin(ph) * wAt(y);
      if (j) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
  }
  c.restore();
  funnel();
  c.strokeStyle = rgba(OUTLINE, 0.85);
  c.lineWidth = 3;
  c.stroke();
  // foam lip on top + spray
  for (let i = 0; i < 5; i++) {
    const a = t * 0.25 + i * 1.26;
    circle(c, p.x + Math.cos(a) * wAt(top) * 0.85, top + Math.sin(a) * 6, 7, '#ffffff', OUTLINE, 2);
  }
  for (let i = 0; i < 6; i++) {
    const ph = ((t * 0.05 + i / 6) % 1);
    const px = p.x + Math.sin(i * 2.1 + t * 0.1) * (20 + 30 * ph);
    const py = top - 4 - ph * 40;
    circle(c, px, py, 4.5 * (1 - ph) + 1, rgba('#bff0ff', 0.9 * (1 - ph)), null, 0);
  }
  c.restore();
});

/** the Tsunami: a curling wall of water, drawn in the wave's own frame (+x = direction of travel) */
registerProjDraw('coralWave', (c, p, r, t) => {
  const dir = p.vx >= 0 ? 1 : -1;
  const S = r / 200;
  const grow = Math.min(1, 0.25 + p.age / 14);
  const left = p.life - p.age;
  const collapse = left < 8 ? left / 8 : 1;
  c.save();
  c.translate(p.x, p.y + 110 * S); // the floor under the wave
  c.scale(dir * S, S * grow * (0.35 + 0.65 * collapse));
  const crest: P2 = [24, -298];
  const wob = Math.sin(t * 0.2) * 6;
  // body silhouette
  const body = (): void => {
    c.beginPath();
    c.moveTo(-430, 40);
    c.bezierCurveTo(-300, 30, -160, -120, -60, -230);
    c.bezierCurveTo(-20, -280, 0, crest[1], crest[0], crest[1]);
    c.bezierCurveTo(90, -300, 150, -270, 168, -222 + wob * 0.4); // lip reaches forward
    c.bezierCurveTo(176, -196, 158, -172, 134, -176); // hooks down
    c.bezierCurveTo(118, -180, 112, -196, 124, -204); // curls in
    c.bezierCurveTo(96, -200, 84, -170, 100, -120); // inside of the barrel
    c.bezierCurveTo(118, -60, 170, -10, 230, 40); // front face down to the floor
    c.closePath();
  };
  const g = c.createLinearGradient(0, -300, 0, 40);
  g.addColorStop(0, '#9ff4ff');
  g.addColorStop(0.35, '#2fc0f0');
  g.addColorStop(0.75, '#1466c8');
  g.addColorStop(1, '#0b3a86');
  c.globalAlpha *= 0.9;
  body();
  c.fillStyle = g;
  c.fill();
  c.save();
  c.clip();
  // the barrel's shadow
  c.fillStyle = 'rgba(8,40,110,0.55)';
  c.beginPath();
  c.ellipse(118, -150, 46, 70, -0.3, 0, Math.PI * 2);
  c.fill();
  // streaks running up the face
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineWidth = 6;
  c.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const ph = ((t * 0.03 + i / 7) % 1);
    const x0 = -380 + i * 70 + ph * 60;
    const y0 = 20 - ph * 200;
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo(x0 + 30, y0 - 40, x0 + 70, y0 - 70);
    c.stroke();
  }
  c.restore();
  body();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 6 / S;
  c.stroke();
  // foam along the crest and the lip
  const foamPts: P2[] = [[-150, -150], [-110, -195], [-70, -235], [-30, -270], [10, -292], [55, -296], [100, -284], [140, -260], [162, -232], [150, -192]];
  foamPts.forEach((q, i) => {
    const rr = 15 + ((i * 7) % 9) + Math.sin(t * 0.3 + i) * 3;
    circle(c, q[0], q[1] - 4, rr, '#ffffff', OUTLINE, 3);
  });
  // churning foam at the base
  for (let i = 0; i < 9; i++) {
    const x = -360 + i * 70 + Math.sin(t * 0.15 + i) * 10;
    circle(c, x, 30 - (i % 3) * 8, 18 + (i % 4) * 4, 'rgba(255,255,255,0.92)', OUTLINE, 3);
  }
  // spray flying off the lip
  for (let i = 0; i < 10; i++) {
    const ph = ((t * 0.045 + i * 0.137) % 1);
    const x = 150 + ph * 160 + (i % 3) * 12;
    const y = -240 + ph * ph * 200 - (i % 4) * 14;
    circle(c, x, y, 7 * (1 - ph) + 2, `rgba(230,250,255,${0.95 * (1 - ph)})`, null, 0);
  }
  // collapse: the crash spray
  if (collapse < 1) {
    const k = 1 - collapse;
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI * (0.1 + 0.8 * (i / 11));
      const d = 80 + k * 260;
      circle(c, 120 + Math.cos(a) * d, -80 + Math.sin(a) * d * 0.9, 26 * (1 - k * 0.6), `rgba(255,255,255,${0.9 * (1 - k * 0.7)})`, OUTLINE, 3);
    }
  }
  c.restore();
});

registerProjDraw('coralCrash', () => {});

// ------------------------------------------------------------------ the fighter

export const coralArt: ArtDef = {
  limb: 10.5,
  handR: 7.5,
  footL: 20,
  palettes: [
    { name: 'Reef Teal', main: '#18b3a6', second: '#ff7a59', accent: '#7fe8ff', skin: '#d99a6c', extra: '#d2fff0' },
    { name: 'Sunset Coral', main: '#ff6b5e', second: '#ffd166', accent: '#a6e9ff', skin: '#f2c29b', extra: '#ffb0c8' },
    { name: 'Kelp Forest', main: '#3f8f3a', second: '#c9e265', accent: '#9ff2c8', skin: '#8a5a3c', extra: '#7cc96b' },
    { name: 'Deep Abyss', main: '#1d2c66', second: '#0f1a40', accent: '#5cfff0', skin: '#a9b8f0', extra: '#2ee6d6' },
    { name: 'Pearl Foam', main: '#f4f1ea', second: '#8fd0e6', accent: '#c4f2ff', skin: '#ffd9c2', extra: '#ffffff' },
    { name: 'Tropical Punch', main: '#ff3fa4', second: '#3ad2ff', accent: '#8ff0ff', skin: '#c8875a', extra: '#ffe14f' },
    { name: 'Lagoon Lilac', main: '#9a7bff', second: '#5ce1c8', accent: '#b6f0ff', skin: '#f0c7a8', extra: '#e6d4ff' },
    { name: 'Golden Hour', main: '#ffb02e', second: '#7a3b1f', accent: '#ffe9b0', skin: '#b5774f', extra: '#fff1b8' },
  ],
  upperArm: (p) => p.skin,
  foreArm: (p) => p.skin,
  thigh: (p) => p.second,
  shin: (p) => p.skin,
  back: (c, v) => {
    const id = moveId(v);
    const k = v.k;
    const s = k.scale;
    // Waterspout: a column of water under her feet
    if (id === 'uspec' && v.f.mf >= 4) {
      const mf = v.f.mf;
      const a = mf < 27 ? Math.min(1, (mf - 3) / 3) : Math.max(0, 1 - (mf - 27) / 10);
      if (a > 0) {
        const fx = (k.footF[0] + k.footB[0]) / 2;
        const fy = Math.max(k.footF[1] * k.grav, k.footB[1] * k.grav) * k.grav;
        const len = 170 * s;
        c.save();
        c.globalAlpha *= a;
        c.translate(fx, fy);
        c.scale(1, k.grav);
        const gr = c.createLinearGradient(0, 0, 0, len);
        gr.addColorStop(0, '#bff4ff');
        gr.addColorStop(0.5, '#3aa8ff');
        gr.addColorStop(1, 'rgba(20,90,200,0)');
        c.beginPath();
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
          const y = (i / steps) * len;
          const w = 20 * s + (i / steps) * 22 * s + Math.sin(v.t * 0.5 + i) * 3;
          if (i) c.lineTo(w, y);
          else c.moveTo(w, y);
        }
        for (let i = steps; i >= 0; i--) {
          const y = (i / steps) * len;
          const w = 20 * s + (i / steps) * 22 * s + Math.sin(v.t * 0.5 + i + 2) * 3;
          c.lineTo(-w, y);
        }
        c.closePath();
        c.fillStyle = gr;
        c.fill();
        c.strokeStyle = rgba(OUTLINE, 0.8);
        c.lineWidth = 3;
        c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.7)';
        c.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          const y = ((v.t * 6 + i * 50) % len);
          c.beginPath();
          c.moveTo(-14 * s, y);
          c.quadraticCurveTo(0, y + 10, 14 * s, y);
          c.stroke();
        }
        for (let i = 0; i < 6; i++) circle(c, Math.cos(i * 1.05 + v.t * 0.3) * 24 * s, Math.sin(i * 2.1) * 4, (9 - (i % 3) * 2) * s, '#ffffff', OUTLINE, 2);
        c.restore();
      }
    }
    // Surf's Up: a little wave curls behind her
    if (id === 'dash' && v.f.mf >= 3 && v.f.mf <= 24) {
      const fx = (k.footF[0] + k.footB[0]) / 2;
      const fy = Math.max(k.footF[1], k.footB[1]);
      const a = v.f.mf > 18 ? (24 - v.f.mf) / 6 : 1;
      c.save();
      c.globalAlpha *= a;
      c.translate(fx, fy + 6 * s);
      c.scale(k.facing * s, s);
      c.beginPath();
      c.moveTo(-110, 4);
      c.bezierCurveTo(-80, 0, -50, -40, -20, -46);
      c.bezierCurveTo(0, -50, 12, -36, 4, -26);
      c.bezierCurveTo(-6, -30, -14, -24, -6, -14);
      c.bezierCurveTo(4, -6, 20, 0, 40, 4);
      c.closePath();
      fillStroke(c, '#3aa8ff', OUTLINE, 3);
      for (let i = 0; i < 5; i++) circle(c, -70 + i * 18, -14 - i * 7 + (i > 3 ? 14 : 0), 8, '#ffffff', OUTLINE, 2);
      c.restore();
    }
    // the surfboard: on her back, or under her feet when she rides
    if (BOARD_FEET.has(id)) {
      const ax = k.footB[0];
      const ay = k.footB[1];
      const bx = k.footF[0];
      const by = k.footF[1];
      const ang = Math.atan2(by - ay, (bx - ax) * k.facing);
      c.save();
      c.translate((ax + bx) / 2, (ay + by) / 2);
      c.scale(k.facing * s, s);
      c.rotate(ang);
      c.translate(4, 7 * k.grav);
      board(c, v, 96, 20);
      // fin
      c.beginPath();
      c.moveTo(-34, 9);
      c.lineTo(-42, 22);
      c.lineTo(-26, 10);
      c.closePath();
      fillStroke(c, shade(v.p.main, -0.3), v.ol, 2.4);
      c.restore();
    } else {
      boneFrame(c, v, k.hip, k.ang.torso);
      c.translate(-G * 1.2, -L * 0.32);
      c.rotate(-2.3);
      board(c, v, 112, 23);
      // strap across the chest is drawn by the torso
      c.restore();
    }
  },
  torso: (c, v) => {
    const p = v.p;
    boneFrame(c, v, v.k.hip, v.k.ang.torso);
    // rash guard capsule
    rrect(c, -G, -L - G * 0.35, G * 2, L + G * 0.8, G * 0.95);
    fillStroke(c, p.main, v.ol, 3.2);
    c.save();
    c.clip();
    c.fillStyle = shade(p.main, -0.18);
    c.fillRect(-G * 1.2, -L - G, G * 0.7, L + G * 2);
    // wave band across the chest: scalloped crests with foam
    const by = -L * 0.56;
    c.beginPath();
    c.moveTo(-G * 1.3, by + 9);
    c.lineTo(-G * 1.3, by);
    for (let i = 0; i < 3; i++) {
      const x0 = -G * 1.3 + i * G * 0.9;
      c.bezierCurveTo(x0 + G * 0.25, by - 8, x0 + G * 0.75, by - 8, x0 + G * 0.62, by - 1);
      c.quadraticCurveTo(x0 + G * 0.5, by + 3, x0 + G * 0.9, by);
    }
    c.lineTo(G * 1.4, by + 9);
    c.closePath();
    c.fillStyle = p.second;
    c.fill();
    c.strokeStyle = v.ol;
    c.lineWidth = 1.8;
    c.stroke();
    // board shorts
    c.fillStyle = p.second;
    c.fillRect(-G * 1.3, -L * 0.18, G * 2.6, L);
    c.fillStyle = shade(p.second, -0.2);
    c.fillRect(-G * 1.3, -L * 0.18, G * 0.75, L);
    // shorts stripe + waistband
    c.fillStyle = p.main;
    c.fillRect(G * 0.15, -L * 0.18, G * 0.28, L);
    c.fillStyle = shade(p.second, -0.35);
    c.fillRect(-G * 1.3, -L * 0.2, G * 2.6, 3.2);
    // the board strap across the chest
    c.strokeStyle = shade(p.second, -0.45);
    c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(-G * 1.2, -L * 0.25);
    c.lineTo(G * 1.2, -L * 0.88);
    c.stroke();
    c.restore();
    rrect(c, -G, -L - G * 0.35, G * 2, L + G * 0.8, G * 0.95);
    c.strokeStyle = v.ol;
    c.lineWidth = 3.2;
    c.stroke();
    // foam dots on the crests
    for (let i = 0; i < 3; i++) circle(c, -G * 1.3 + i * G * 0.9 + G * 0.55, by - 5.5, 1.7, '#ffffff', null, 0);
    // a shell charm on the strap
    ellipse(c, G * 0.45, -L * 0.72, 3.6, 3, 0, '#ffb3c7', v.ol, 1.6);
    c.restore();
  },
  head: (c, v) => {
    const R = HR;
    const p = v.p;
    const hair = p.extra ?? '#d2fff0';
    const hairDk = shade(hair, -0.2);
    const wob = Math.sin(v.t * 0.11 + v.f.i) * 1.8;
    const flow = v.f.act === A.RUN || v.f.act === A.DASH || v.f.act === A.AIR ? 4 : 0;
    // ---- back hair: swept back into a breaking wave that curls over at the tip
    const fl = flow;
    c.beginPath();
    c.moveTo(R * 0.6, -R * 0.78);
    c.bezierCurveTo(R * 0.2, -R * 1.5, -R * 1.2, -R * 1.55, -R * 2.0 - fl, -R * 1.05 + wob * 0.4);
    c.bezierCurveTo(-R * 2.55 - fl, -R * 0.75, -R * 2.6 - fl, -R * 0.05, -R * 2.15 - fl, R * 0.05);
    c.bezierCurveTo(-R * 1.85 - fl, R * 0.1, -R * 1.8 - fl, -R * 0.35, -R * 2.05 - fl, -R * 0.45);
    c.bezierCurveTo(-R * 1.7, -R * 0.55, -R * 1.45, -R * 0.2, -R * 1.5 + wob * 0.5, R * 0.35);
    c.bezierCurveTo(-R * 1.55 + wob, R * 0.85, -R * 1.15, R * 1.15, -R * 0.75, R * 1.0);
    c.bezierCurveTo(-R * 0.55, R * 0.85, -R * 0.4, R * 0.6, -R * 0.15, R * 0.42);
    c.closePath();
    fillStroke(c, hair, v.ol, 3);
    // the barrel inside the curl, and flow lines
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-R * 1.98 - fl, -R * 0.4);
    c.bezierCurveTo(-R * 1.72, -R * 0.46, -R * 1.52, -R * 0.2, -R * 1.54 + wob * 0.5, R * 0.3);
    c.strokeStyle = hairDk;
    c.lineWidth = 4;
    c.stroke();
    c.beginPath();
    c.moveTo(-R * 0.1, -R * 1.08);
    c.quadraticCurveTo(-R * 1.0, -R * 1.22, -R * 1.75 - fl, -R * 0.92);
    c.moveTo(-R * 0.9, R * 0.75);
    c.quadraticCurveTo(-R * 1.25, R * 0.55, -R * 1.3, R * 0.1);
    c.lineWidth = 2.2;
    c.stroke();
    // foam on the crest
    const crest: P2[] = [[-R * 0.35, -R * 1.32], [-R * 0.95, -R * 1.4], [-R * 1.5, -R * 1.28], [-R * 2.0 - fl, -R * 1.04], [-R * 2.38 - fl, -R * 0.66], [-R * 2.42 - fl, -R * 0.22]];
    crest.forEach((q, i) => circle(c, q[0], q[1] + (i === 3 ? wob * 0.4 : 0), 3.4 - (i % 2) * 0.8, '#ffffff', v.ol, 1.6));
    // ---- face
    ellipse(c, R * 0.1, R * 0.08, R * 0.8, R * 0.82, 0, p.skin, v.ol, 3);
    // ear + shell earring
    ellipse(c, -R * 0.18, R * 0.16, R * 0.16, R * 0.22, 0, p.skin, v.ol, 2);
    c.save();
    c.translate(-R * 0.16, R * 0.56 + Math.sin(v.t * 0.12) * 0.8);
    c.beginPath();
    c.moveTo(0, -3);
    c.lineTo(-5, 4);
    c.quadraticCurveTo(0, 7, 5, 4);
    c.closePath();
    fillStroke(c, '#ffb3c7', v.ol, 1.6);
    c.strokeStyle = shade('#ffb3c7', -0.3);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, -2);
    c.lineTo(0, 5);
    c.moveTo(0, -2);
    c.lineTo(-3, 4);
    c.moveTo(0, -2);
    c.lineTo(3, 4);
    c.stroke();
    c.restore();
    // cheeks + freckles
    circle(c, R * 0.6, R * 0.32, R * 0.14, rgba('#ff6b6b', 0.35), null, 0);
    for (let i = 0; i < 3; i++) circle(c, R * (0.48 + i * 0.12), R * (0.2 + (i % 2) * 0.06), 0.9, shade(p.skin, -0.35), null, 0);
    // ---- eyes: laid back, lids half down when relaxed
    const ex = R * 0.34;
    const ey = -R * 0.02;
    const es = R * 0.27;
    eyes(c, v, ex, ey, es, shade(p.accent, -0.55));
    if (v.expr === 'normal' && !v.blink) {
      const gap = es * 1.15;
      for (const sd of [-1, 1]) {
        const x = ex + sd * gap * 0.5 + 2;
        const r = es * (sd < 0 ? 0.85 : 1);
        c.save();
        c.beginPath();
        c.ellipse(x, ey, r * 0.78 + 1, r + 1, 0, 0, Math.PI * 2);
        c.clip();
        c.fillStyle = p.skin;
        c.fillRect(x - r * 1.2, ey - r * 1.4, r * 2.4, r * 0.95);
        c.restore();
        c.beginPath();
        c.moveTo(x - r * 0.82, ey - r * 0.42);
        c.quadraticCurveTo(x, ey - r * 0.55, x + r * 0.86, ey - r * 0.4);
        c.strokeStyle = v.ol;
        c.lineWidth = 2.4;
        c.lineCap = 'round';
        c.stroke();
      }
    }
    // nose
    c.beginPath();
    c.moveTo(R * 0.86, R * 0.12);
    c.quadraticCurveTo(R * 0.94, R * 0.24, R * 0.82, R * 0.27);
    c.strokeStyle = shade(p.skin, -0.4);
    c.lineWidth = 1.8;
    c.stroke();
    // mouth: a lopsided chill smirk when relaxed
    if (v.expr === 'normal') {
      c.beginPath();
      c.moveTo(R * 0.3, R * 0.45);
      c.quadraticCurveTo(R * 0.52, R * 0.58, R * 0.74, R * 0.36);
      c.strokeStyle = v.ol;
      c.lineWidth = 2.6;
      c.lineCap = 'round';
      c.stroke();
      c.beginPath();
      c.moveTo(R * 0.7, R * 0.32);
      c.lineTo(R * 0.78, R * 0.4);
      c.lineWidth = 2;
      c.stroke();
    } else mouth(c, v, R * 0.5, R * 0.46, R * 0.42);
    // ---- bangs: one big swoop like a peeling wave
    c.beginPath();
    c.moveTo(-R * 0.55, -R * 0.55);
    c.bezierCurveTo(-R * 0.3, -R * 1.15, R * 0.6, -R * 1.2, R * 0.95, -R * 0.55);
    c.bezierCurveTo(R * 1.05, -R * 0.3, R * 0.95, -R * 0.08, R * 0.78, -R * 0.12);
    c.bezierCurveTo(R * 0.72, -R * 0.28, R * 0.84, -R * 0.36, R * 0.7, -R * 0.42);
    c.bezierCurveTo(R * 0.35, -R * 0.55, R * 0.1, -R * 0.3, -R * 0.15, -R * 0.35);
    c.closePath();
    fillStroke(c, hair, v.ol, 2.6);
    circle(c, R * 0.9, -R * 0.42, 2.6, '#ffffff', v.ol, 1.4);
    // starfish hair clip
    c.save();
    c.translate(-R * 0.62, -R * 1.02);
    c.rotate(0.3 + Math.sin(v.t * 0.05) * 0.05);
    star(c, 0, 0, 8, 3.6, 5, -Math.PI / 2);
    fillStroke(c, '#ff9a3c', v.ol, 2);
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      circle(c, Math.cos(a) * 4.2, Math.sin(a) * 4.2, 0.9, '#fff3c4', null, 0);
    }
    c.restore();
  },
  hand: (c, v, x, y, front) => {
    const s = v.k.scale;
    const col = front ? v.p.skin : shade(v.p.skin, -0.22);
    const r = 7.5 * s;
    if (front && v.f.act === A.TAUNT) {
      // shaka: thumb and pinky out
      boneFrame(c, v, [x, y], v.k.ang.foreF);
      c.lineCap = 'round';
      for (const [ax, ay] of [[-7, -2], [6, -9]] as P2[]) {
        c.strokeStyle = v.ol;
        c.lineWidth = 7.5;
        c.beginPath();
        c.moveTo(0, -2);
        c.lineTo(ax, ay - 6);
        c.stroke();
        c.strokeStyle = col;
        c.lineWidth = 4;
        c.stroke();
      }
      circle(c, 0, -2, r, col, v.ol, 2.6);
      c.restore();
      return;
    }
    circle(c, x, y, r, col, v.ol, 2.6);
    circle(c, x - r * 0.3, y - r * 0.3, r * 0.28, shade(col, 0.3), null, 0);
  },
  foot: (c, v, front) => {
    const k = v.k;
    const pt = front ? k.footF : k.footB;
    const phi = front ? k.ang.shF : k.ang.shB;
    boneFrame(c, v, pt, phi - 180);
    const col = front ? v.p.skin : shade(v.p.skin, -0.22);
    // bare foot
    c.beginPath();
    c.moveTo(-6, 0.5);
    c.quadraticCurveTo(-10.5, -4, -6.5, -10.5);
    c.lineTo(2, -11);
    c.quadraticCurveTo(7, -8, 11, -5.5);
    c.quadraticCurveTo(18.5, -5.2, 18.5, -1.5);
    c.quadraticCurveTo(18.5, 0.6, 15, 0.6);
    c.closePath();
    fillStroke(c, col, v.ol, 2.6);
    // toes
    c.strokeStyle = shade(col, -0.32);
    c.lineWidth = 1.3;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(13.5, -4.6);
    c.quadraticCurveTo(14.5, -2.5, 13.2, -0.6);
    c.moveTo(10.5, -4.8);
    c.quadraticCurveTo(11.2, -2.6, 10.2, -0.6);
    c.stroke();
    // anklet with beads
    c.strokeStyle = v.ol;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-7, -9);
    c.lineTo(2.5, -9.6);
    c.stroke();
    circle(c, -3.5, -9.2, 2.2, v.p.accent, v.ol, 1.2);
    circle(c, 1, -9.6, 2.2, front ? '#ffb3c7' : shade('#ffb3c7', -0.2), v.ol, 1.2);
    c.restore();
  },
  weapon: (c, v) => {
    const id = moveId(v);
    if (WHIP.has(id)) drawLash(c, v);
    else drawCoil(c, v);
  },
  front: (c, v) => {
    // bros caught in a Bubble Trap (held by the bubble's freeze) float inside one of Coral's bubbles
    for (const t of v.st.fighters) {
      const caught = (t.frozenT > 0 && t.lastFx === 'water') || t.act === A.TRAPPED;
      if (!caught || t.lastHitBy !== v.f.i || t.out || t.i === v.f.i) continue;
      const cf = FIGHTERS[t.def];
      const h = cf.height * 0.92;
      const pop = t.frozenT > 0 && t.frozenT < 5 ? 1 + (5 - t.frozenT) * 0.06 : 1;
      c.save();
      c.filter = 'none';
      c.globalAlpha = 1;
      bubbleShape(c, t.x, t.y - h * 0.5 * t.grav, h * 0.64 * pop, v.t, false);
      c.restore();
    }
  },
};

