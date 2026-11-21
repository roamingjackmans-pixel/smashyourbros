// Sir Clank: a hollow suit of armour with a heart-shaped visor, ghost-light eyes, a big plume, a longsword and a
// kite shield. Lance (the polite ghost inside) shows himself when Clank doffs his helmet in the taunt.
import { A } from '../../sim/acts';
import { FIGHTERS } from '../../sim/data';
import { evalKeys } from '../../sim/poses';
import { worldSkel } from '../../sim/rig';
import type { Proj } from '../../sim/types';
import { boneFrame, circle, ellipse, fillStroke, rgba, rrect, shade, shoe, type ArtDef, type FView } from '../art';
import { registerProjDraw } from '../things';

const G = 17; // girth
const L = 38; // torso
const R = 20; // head
const WL = 66; // sword

function isMove(v: FView, ids: string[]): boolean {
  if (v.f.act !== A.MOVE) return false;
  return ids.includes(FIGHTERS[v.f.def].moveIds[v.f.mv]);
}

function taunting(v: FView): number {
  if (v.f.act !== A.TAUNT) return 0;
  const a = v.f.af;
  if (a < 8) return a / 8;
  if (a > 50) return Math.max(0, (60 - a) / 10);
  return 1;
}

function heartPath(c: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  c.beginPath();
  c.moveTo(x, y + s * 0.95);
  c.bezierCurveTo(x - s * 1.35, y + s * 0.1, x - s * 0.85, y - s * 0.95, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.85, y - s * 0.95, x + s * 1.35, y + s * 0.1, x, y + s * 0.95);
  c.closePath();
}

/** a glowing slash ribbon that follows the blade tip over the last few frames of an active swing */
function slashTrail(c: CanvasRenderingContext2D, v: FView): void {
  const f = v.f;
  if (f.act !== A.MOVE) return;
  const cf = FIGHTERS[f.def];
  const m = cf.moves[f.mv];
  if (!m.hits) return;
  let on = false;
  for (const h of m.hits) if ((h.at === 'wep' || h.at === 'wepMid') && !h.grab && f.mf >= h.f[0] - 1 && f.mf <= h.f[1] + 3) on = true;
  if (!on) return;
  const outer: [number, number][] = [];
  const inner: [number, number][] = [];
  for (let d = 5; d >= 0; d -= 0.5) {
    const fr = Math.max(0, f.mf - d);
    const sk = d === 0 ? v.k : worldSkel(cf.def.rig, evalKeys(m.anim, fr, cf.def.poses), f.x, f.y, f.facing, f.grav, v.k.scale, f.gnd >= 0);
    outer.push(sk.wep);
    inner.push([sk.handF[0] + (sk.wep[0] - sk.handF[0]) * 0.45, sk.handF[1] + (sk.wep[1] - sk.handF[1]) * 0.45]);
  }
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.beginPath();
  c.moveTo(outer[0][0], outer[0][1]);
  for (const p of outer) c.lineTo(p[0], p[1]);
  for (let i = inner.length - 1; i >= 0; i--) c.lineTo(inner[i][0], inner[i][1]);
  c.closePath();
  c.fillStyle = rgba(v.p.accent, 0.34);
  c.fill();
  c.beginPath();
  c.moveTo(outer[0][0], outer[0][1]);
  for (const p of outer) c.lineTo(p[0], p[1]);
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = 5 * v.k.scale;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.stroke();
  c.restore();
}

function kiteShield(c: CanvasRenderingContext2D, v: FView): void {
  const k = v.k;
  boneFrame(c, v, k.handB, k.ang.torso + 6);
  const p = v.p;
  const w = 17;
  c.beginPath();
  c.moveTo(-w, -20);
  c.quadraticCurveTo(0, -27, w, -20);
  c.quadraticCurveTo(w + 1, 10, 0, 38);
  c.quadraticCurveTo(-w - 1, 10, -w, -20);
  c.closePath();
  fillStroke(c, p.skin, v.ol, 3);
  // inner field and rim
  c.save();
  c.clip();
  c.fillStyle = shade(p.skin, -0.2);
  c.fillRect(-w - 2, -30, w * 0.75, 80);
  c.restore();
  c.beginPath();
  c.moveTo(-w + 4, -17);
  c.quadraticCurveTo(0, -23, w - 4, -17);
  c.quadraticCurveTo(w - 3, 8, 0, 31);
  c.quadraticCurveTo(-w + 3, 8, -w + 4, -17);
  c.closePath();
  c.strokeStyle = p.second;
  c.lineWidth = 3;
  c.stroke();
  heartPath(c, 1, -1, 7.5);
  fillStroke(c, p.second, v.ol, 2.2);
  circle(c, -1.5, -4, 1.8, 'rgba(255,255,255,0.8)', null, 0);
  // the strap peeking over the top
  c.fillStyle = shade(p.main, -0.35);
  c.fillRect(-4, -26, 8, 5);
  c.restore();
}

function gauntlet(c: CanvasRenderingContext2D, v: FView, pt: [number, number], phi: number, front: boolean): void {
  boneFrame(c, v, pt, phi);
  const col = front ? v.p.main : shade(v.p.main, -0.22);
  rrect(c, -8, -9, 16, 15, 5);
  fillStroke(c, col, v.ol, 2.8);
  c.strokeStyle = shade(col, -0.35);
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-6, -3);
  c.lineTo(6, -3);
  c.moveTo(-6, 1);
  c.lineTo(6, 1);
  c.stroke();
  // cuff
  rrect(c, -9, 3, 18, 6, 3);
  fillStroke(c, front ? v.p.second : shade(v.p.second, -0.25), v.ol, 2.2);
  c.restore();
}

function sword(c: CanvasRenderingContext2D, v: FView, glow: boolean): void {
  const p = v.p;
  // pommel and grip (mostly hidden by the gauntlet)
  circle(c, 0, 13, 4.5, p.second, v.ol, 2.4);
  rrect(c, -3, -2, 6, 14, 2);
  fillStroke(c, '#5a3a2a', v.ol, 2);
  // blade
  if (glow) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.beginPath();
    c.moveTo(-8, -6);
    c.lineTo(-7, -WL + 10);
    c.lineTo(0, -WL - 6);
    c.lineTo(7, -WL + 10);
    c.lineTo(8, -6);
    c.closePath();
    c.fillStyle = rgba(p.accent, 0.45);
    c.fill();
    c.restore();
  }
  c.beginPath();
  c.moveTo(-4.5, -6);
  c.lineTo(-4, -WL + 9);
  c.lineTo(0, -WL);
  c.lineTo(4, -WL + 9);
  c.lineTo(4.5, -6);
  c.closePath();
  fillStroke(c, '#eef3ff', v.ol, 2.6);
  c.fillStyle = '#b9c4dc';
  c.beginPath();
  c.moveTo(0, -6);
  c.lineTo(4.5, -6);
  c.lineTo(4, -WL + 9);
  c.lineTo(0, -WL);
  c.closePath();
  c.fill();
  c.strokeStyle = rgba(p.accent, 0.9);
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(0, -10);
  c.lineTo(0, -WL + 14);
  c.stroke();
  // crossguard
  rrect(c, -14, -8, 28, 6, 3);
  fillStroke(c, p.second, v.ol, 2.4);
  circle(c, 0, -5, 3, p.extra ?? '#ff4a6a', v.ol, 1.6);
}

function lance(c: CanvasRenderingContext2D, v: FView, x: number, y: number, s: number, wave: number): void {
  // Lance the ghost: a soft blob with big eyes and a shy blush
  c.save();
  c.globalCompositeOperation = 'lighter';
  circle(c, x, y, s * 1.5, rgba(v.p.accent, 0.25), null, 0);
  c.restore();
  c.beginPath();
  c.moveTo(x - s, y + s * 0.6);
  c.quadraticCurveTo(x - s * 1.05, y - s * 1.1, x, y - s * 1.1);
  c.quadraticCurveTo(x + s * 1.05, y - s * 1.1, x + s, y + s * 0.6);
  for (let i = 0; i < 4; i++) {
    const xx = x + s - ((i + 1) * s * 2) / 4;
    c.quadraticCurveTo(xx + s * 0.25, y + s * (i % 2 ? 0.95 : 0.35), xx, y + s * 0.6);
  }
  c.closePath();
  fillStroke(c, '#f2fdff', v.ol, 2.4);
  circle(c, x + s * 0.05, y - s * 0.25, s * 0.2, v.ol, null, 0);
  circle(c, x + s * 0.55, y - s * 0.25, s * 0.18, v.ol, null, 0);
  circle(c, x + s * 0.1, y - s * 0.32, s * 0.07, '#fff', null, 0);
  circle(c, x + s * 0.6, y - s * 0.32, s * 0.06, '#fff', null, 0);
  circle(c, x - s * 0.25, y + s * 0.08, s * 0.16, 'rgba(255,110,150,0.6)', null, 0);
  circle(c, x + s * 0.85, y + s * 0.08, s * 0.14, 'rgba(255,110,150,0.6)', null, 0);
  c.beginPath();
  c.arc(x + s * 0.32, y + s * 0.05, s * 0.18, 0.2, Math.PI - 0.2);
  c.strokeStyle = v.ol;
  c.lineWidth = 1.8;
  c.stroke();
  // a little waving hand
  ellipse(c, x + s * 1.15, y - s * 0.2 + wave * 3, s * 0.28, s * 0.22, 0.4, '#f2fdff', v.ol, 2);
}

function visorEyes(c: CanvasRenderingContext2D, v: FView): void {
  const p = v.p;
  const e = v.expr;
  const ex = [R * 0.22, R * 0.62];
  const ey = -R * 0.02;
  c.save();
  heartPath(c, R * 0.42, -R * 0.02, R * 0.6);
  c.clip();
  c.fillStyle = '#120a1c';
  c.fillRect(-R, -R * 1.2, R * 3, R * 2.4);
  // ghost-light glow inside the helmet
  c.globalCompositeOperation = 'lighter';
  circle(c, R * 0.42, ey, R * 0.55, rgba(p.accent, 0.22), null, 0);
  c.globalCompositeOperation = 'source-over';
  c.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const x = ex[i];
    const s = i === 0 ? 0.85 : 1;
    if (v.blink || e === 'ko') {
      c.strokeStyle = p.accent;
      c.lineWidth = 3;
      c.beginPath();
      if (e === 'ko') {
        c.moveTo(x - 3.5, ey - 3.5);
        c.lineTo(x + 3.5, ey + 3.5);
        c.moveTo(x + 3.5, ey - 3.5);
        c.lineTo(x - 3.5, ey + 3.5);
      } else {
        c.moveTo(x - 4, ey);
        c.lineTo(x + 4, ey);
      }
      c.stroke();
      continue;
    }
    if (e === 'happy') {
      c.strokeStyle = '#ffffff';
      c.lineWidth = 3.2;
      c.beginPath();
      c.moveTo(x - 4, ey + 2);
      c.quadraticCurveTo(x, ey - 5, x + 4, ey + 2);
      c.stroke();
      continue;
    }
    if (e === 'hurt') {
      c.strokeStyle = '#ffffff';
      c.lineWidth = 2.8;
      c.beginPath();
      const d = i === 0 ? 1 : -1;
      c.moveTo(x - 3.5 * d, ey - 3.5);
      c.lineTo(x + 3.5 * d, ey);
      c.lineTo(x - 3.5 * d, ey + 3.5);
      c.stroke();
      continue;
    }
    const h = (e === 'angry' || e === 'focus' ? 4 : 5.6) * s;
    ellipse(c, x, ey, 3.4 * s, h, 0, p.accent, null, 0);
    ellipse(c, x + 0.6, ey - 0.6, 1.8 * s, h * 0.55, 0, '#ffffff', null, 0);
    if (e === 'angry' || e === 'focus') {
      // a stern brow: the visor's top edge cuts the eyes
      c.fillStyle = '#120a1c';
      c.beginPath();
      c.moveTo(x - 6, ey - 7 + (i === 0 ? -2 : 2));
      c.lineTo(x + 6, ey - 7 + (i === 0 ? 2 : -2) + 3);
      c.lineTo(x + 6, ey - 12);
      c.lineTo(x - 6, ey - 12);
      c.closePath();
      c.fill();
    }
  }
  c.restore();
  heartPath(c, R * 0.42, -R * 0.02, R * 0.6);
  c.strokeStyle = v.ol;
  c.lineWidth = 2.6;
  c.stroke();
}

function helmet(c: CanvasRenderingContext2D, v: FView): void {
  const p = v.p;
  // plume, streaming back and swaying
  const sway = Math.sin(v.t * 0.12) * 3 - Math.max(-6, Math.min(6, v.f.vx * v.f.facing * 0.4));
  c.beginPath();
  c.moveTo(-R * 0.1, -R * 1.0);
  c.bezierCurveTo(-R * 0.5, -R * 2.1, -R * 1.7, -R * 1.7 + sway, -R * 2.1, -R * 0.6 + sway * 1.5);
  c.bezierCurveTo(-R * 1.6, -R * 1.0 + sway, -R * 1.1, -R * 1.0, -R * 0.75, -R * 0.55);
  c.closePath();
  fillStroke(c, p.extra ?? '#ff4a6a', v.ol, 2.6);
  c.beginPath();
  c.moveTo(-R * 0.35, -R * 1.25);
  c.quadraticCurveTo(-R * 1.1, -R * 1.6 + sway * 0.5, -R * 1.7, -R * 0.9 + sway);
  c.strokeStyle = shade(p.extra ?? '#ff4a6a', 0.35);
  c.lineWidth = 2;
  c.stroke();
  // the great helm
  c.beginPath();
  c.moveTo(-R * 0.92, R * 0.85);
  c.lineTo(-R * 0.98, -R * 0.2);
  c.quadraticCurveTo(-R * 0.95, -R * 1.12, R * 0.05, -R * 1.12);
  c.quadraticCurveTo(R * 1.05, -R * 1.1, R * 1.08, -R * 0.15);
  c.lineTo(R * 1.02, R * 0.85);
  c.quadraticCurveTo(R * 0.05, R * 1.05, -R * 0.92, R * 0.85);
  c.closePath();
  fillStroke(c, p.main, v.ol, 3.2);
  c.save();
  c.clip();
  c.fillStyle = shade(p.main, -0.2);
  c.fillRect(-R * 1.2, -R * 1.3, R * 0.55, R * 2.6);
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.beginPath();
  c.ellipse(R * 0.35, -R * 0.75, R * 0.45, R * 0.16, -0.25, 0, Math.PI * 2);
  c.fill();
  c.restore();
  // crest ridge and brow band
  c.strokeStyle = p.second;
  c.lineWidth = 3.4;
  c.beginPath();
  c.moveTo(-R * 0.96, -R * 0.42);
  c.quadraticCurveTo(R * 0.1, -R * 0.62, R * 1.07, -R * 0.42);
  c.stroke();
  // breathing holes
  for (let i = 0; i < 3; i++) circle(c, R * 0.25 + i * R * 0.22, R * 0.68, 1.6, '#120a1c', null, 0);
  circle(c, -R * 0.62, R * 0.2, 2.2, p.second, v.ol, 1.4);
  visorEyes(c, v);
}

export const clankArt: ArtDef = {
  limb: 12,
  handR: 8,
  footL: 26,
  palettes: [
    { name: 'Polished Steel', main: '#b9c6dc', second: '#ffd35a', accent: '#8ff7ff', skin: '#3a6cff', extra: '#ff4a6a' },
    { name: 'Rose Gold Romantic', main: '#f2b8a2', second: '#fff2e0', accent: '#ff8ad8', skin: '#c2366e', extra: '#ff5fa2' },
    { name: 'Midnight Softie', main: '#4a4558', second: '#c9a0ff', accent: '#c58bff', skin: '#2a1d3e', extra: '#8a5cff' },
    { name: 'Verdigris Veteran', main: '#6fbfa6', second: '#e2a95a', accent: '#d9ff8a', skin: '#2f5d3a', extra: '#ffcf3a' },
    { name: 'Gilded Glory', main: '#f4c542', second: '#ffffff', accent: '#fff6a8', skin: '#d23b3b', extra: '#ffffff' },
    { name: 'Frost Paladin', main: '#dff3ff', second: '#7fb8ff', accent: '#7fe3ff', skin: '#3a5cc8', extra: '#9ae6ff' },
    { name: 'Rusty Ol’ Lance', main: '#c0743e', second: '#7a4a2a', accent: '#ffb36b', skin: '#6b8f3a', extra: '#ffe27a' },
    { name: 'Pumpkin Spook', main: '#ff9a3c', second: '#2b2633', accent: '#a6ff6b', skin: '#6a2b8a', extra: '#2b2633' },
  ],
  upperArm: (p) => p.main,
  foreArm: (p) => p.main,
  thigh: (p) => p.main,
  shin: (p) => p.main,
  back: (c, v) => {
    // a faint ghost-light aura around the hollow armour
    const k = v.k;
    const pulse = 0.5 + 0.5 * Math.sin(v.t * 0.09);
    c.save();
    c.globalCompositeOperation = 'lighter';
    const mx = (k.hip[0] + k.neck[0]) / 2;
    const my = (k.hip[1] + k.neck[1]) / 2;
    const rr = 46 * k.scale;
    const g = c.createRadialGradient(mx, my, rr * 0.2, mx, my, rr * 1.3);
    g.addColorStop(0, rgba(v.p.accent, 0.12 + 0.06 * pulse));
    g.addColorStop(1, rgba(v.p.accent, 0));
    c.fillStyle = g;
    c.beginPath();
    c.arc(mx, my, rr * 1.3, 0, Math.PI * 2);
    c.fill();
    c.restore();
    // the cape-like tabard tail behind
    boneFrame(c, v, k.hip, k.ang.torso);
    c.beginPath();
    c.moveTo(-G * 0.9, -L * 0.95);
    c.quadraticCurveTo(-G * 1.8, -L * 0.3, -G * 1.4 - Math.sin(v.t * 0.1) * 3, L * 0.35);
    c.lineTo(-G * 0.5, L * 0.2);
    c.lineTo(-G * 0.6, -L * 0.6);
    c.closePath();
    fillStroke(c, shade(v.p.skin, -0.25), v.ol, 2.6);
    c.restore();
  },
  torso: (c, v) => {
    const k = v.k;
    const p = v.p;
    // the shield goes behind the body when the shield arm is behind the hip
    const shieldFront = (k.handB[0] - k.hip[0]) * k.facing > G * 0.2;
    if (!shieldFront) kiteShield(c, v);
    boneFrame(c, v, k.hip, k.ang.torso);
    // tabard skirt
    c.beginPath();
    c.moveTo(-G * 0.85, -4);
    c.lineTo(G * 0.95, -4);
    c.lineTo(G * 1.05, 16);
    c.quadraticCurveTo(G * 0.1, 20, -G * 0.95, 16);
    c.closePath();
    fillStroke(c, p.skin, v.ol, 2.6);
    c.strokeStyle = p.second;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-G * 0.85, 12);
    c.quadraticCurveTo(G * 0.1, 16, G * 0.98, 12);
    c.stroke();
    // breastplate (barrel chest)
    c.beginPath();
    c.moveTo(-G * 0.9, -L * 0.08);
    c.quadraticCurveTo(-G * 1.25, -L * 0.7, -G * 0.75, -L * 1.04);
    c.lineTo(G * 0.7, -L * 1.04);
    c.quadraticCurveTo(G * 1.55, -L * 0.72, G * 0.95, -L * 0.08);
    c.closePath();
    fillStroke(c, p.main, v.ol, 3.2);
    c.save();
    c.clip();
    c.fillStyle = shade(p.main, -0.2);
    c.fillRect(-G * 1.4, -L * 1.2, G * 0.8, L * 1.4);
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.beginPath();
    c.ellipse(G * 0.55, -L * 0.72, G * 0.28, L * 0.18, 0.3, 0, Math.PI * 2);
    c.fill();
    c.restore();
    // centre ridge, belt and heart crest
    c.strokeStyle = shade(p.main, -0.3);
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(G * 0.3, -L * 1.0);
    c.quadraticCurveTo(G * 0.65, -L * 0.55, G * 0.35, -L * 0.12);
    c.stroke();
    rrect(c, -G * 0.95, -L * 0.16, G * 1.95, 7, 3);
    fillStroke(c, shade(p.second, -0.15), v.ol, 2.2);
    rrect(c, G * 0.25, -L * 0.17, 8, 8, 2);
    fillStroke(c, p.second, v.ol, 1.8);
    heartPath(c, G * 0.4, -L * 0.6, 6.5);
    fillStroke(c, p.extra ?? '#ff4a6a', v.ol, 2.2);
    // gorget, with ghost-light leaking out of the neck hole
    c.save();
    c.globalCompositeOperation = 'lighter';
    ellipse(c, 0, -L - 2, G * 0.7, 6, 0, rgba(p.accent, 0.55), null, 0);
    c.restore();
    ellipse(c, 0, -L + 1, G * 0.78, 5, 0, shade(p.main, -0.1), v.ol, 2.4);
    c.restore();
    if (shieldFront) kiteShield(c, v);
  },
  head: (c, v) => {
    const t = taunting(v);
    if (t > 0) {
      // helmet's off: Lance says hello
      lance(c, v, R * 0.1, R * 0.1 - t * 4, R * 0.78, Math.sin(v.t * 0.5));
      return;
    }
    // ghost wisps escaping the helmet
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const ph = (v.t * 0.6 + i * 23 + v.f.i * 11) % 70;
      circle(c, -R * 0.6 - ph * 0.25, -R * 0.6 - ph * 0.5, Math.max(0, 4 - ph * 0.05), rgba(v.p.accent, 0.45 * (1 - ph / 70)), null, 0);
    }
    c.restore();
    // a rattle when hit
    if (v.expr === 'hurt' && v.f.hitlag > 0) c.translate(0, -3);
    helmet(c, v);
  },
  hand: (c, v, x, y, front) => {
    const k = v.k;
    const el = front ? k.elbowF : k.elbowB;
    // elbow cop
    circle(c, el[0], el[1], 6.5 * k.scale, front ? v.p.second : shade(v.p.second, -0.25), v.ol, 2.2);
    gauntlet(c, v, [x, y], front ? k.ang.foreF : k.ang.foreB, front);
  },
  foot: (c, v, front) => {
    const k = v.k;
    const kn = front ? k.kneeF : k.kneeB;
    const col = front ? v.p.main : shade(v.p.main, -0.22);
    // knee cop
    boneFrame(c, v, kn, front ? k.ang.thF : k.ang.thB);
    ellipse(c, 2, 0, 8.5, 7.5, 0, col, v.ol, 2.4);
    circle(c, 3, 0, 2.2, front ? v.p.second : shade(v.p.second, -0.25), null, 0);
    c.restore();
    boneFrame(c, v, front ? k.footF : k.footB, (front ? k.ang.shF : k.ang.shB) - 180);
    shoe(c, 27, 13, col, shade(col, -0.45), v.ol, 2.8);
    c.strokeStyle = shade(col, -0.35);
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(2, -12);
    c.lineTo(6, -2);
    c.moveTo(9, -10);
    c.lineTo(13, -2);
    c.stroke();
    c.restore();
  },
  weapon: (c, v) => {
    const k = v.k;
    if (taunting(v) > 0) {
      // the sword is planted in the floor while he bows
      c.save();
      c.translate(k.hip[0] + k.facing * 46 * k.scale, k.footF[1] + 14 * k.scale);
      c.scale(k.facing * k.scale, k.scale);
      c.rotate(0.12);
      sword(c, v, false);
      c.restore();
      return;
    }
    slashTrail(c, v);
    const glow = v.f.act === A.MOVE || v.f.counterT > 0;
    boneFrame(c, v, k.handF, k.ang.wep);
    sword(c, v, glow);
    c.restore();
  },
  front: (c, v) => {
    const k = v.k;
    const p = v.p;
    // front pauldron
    boneFrame(c, v, k.shoulder, k.ang.armF);
    ellipse(c, 0, -3, 13, 11, 0, p.main, v.ol, 2.8);
    c.beginPath();
    c.arc(0, -3, 8, Math.PI * 0.15, Math.PI * 0.85);
    c.strokeStyle = p.second;
    c.lineWidth = 2.4;
    c.stroke();
    circle(c, 0, -8, 2, p.second, null, 0);
    c.restore();
    const t = taunting(v);
    if (t > 0) {
      // the helmet, raised like a hat
      c.save();
      c.translate(k.handF[0], k.handF[1] - 10 * k.scale);
      c.scale(k.facing * k.scale * 0.95, k.scale * 0.95);
      c.rotate(-0.3 * t);
      helmet(c, { ...v, expr: 'happy' });
      c.restore();
    }
    // riposte stance: a shimmer runs along the guard
    if (isMove(v, ['dspec', 'dspecAir']) && v.f.mf >= 5 && v.f.mf <= 24) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const s = 0.6 + 0.4 * Math.sin(v.t * 0.8);
      circle(c, k.wepMid[0], k.wepMid[1], 26 * k.scale * s, rgba(p.accent, 0.35), null, 0);
      circle(c, k.wep[0], k.wep[1], 8 * k.scale, 'rgba(255,255,255,0.9)', null, 0);
      c.restore();
    }
  },
};

// ------------------------------------------------------------------ projectiles

function ghostfire(c: CanvasRenderingContext2D, p: Proj, r: number, t: number): void {
  const ang = Math.atan2(p.vy, p.vx);
  c.save();
  c.translate(p.x, p.y);
  c.globalCompositeOperation = 'lighter';
  for (let i = 1; i < 5; i++) circle(c, -p.vx * i * 1.4, -p.vy * i * 1.4, r * (1 - i * 0.16), 'rgba(140,240,255,0.16)', null, 0);
  circle(c, 0, 0, r * 1.8, 'rgba(140,240,255,0.18)', null, 0);
  c.globalCompositeOperation = 'source-over';
  c.rotate(ang + Math.PI / 2);
  const w = Math.sin(t * 0.6 + p.id) * 0.25;
  c.beginPath();
  c.moveTo(0, r * 2.1);
  c.quadraticCurveTo(-r * (1.1 + w), r * 0.6, -r, -r * 0.1);
  c.arc(0, -r * 0.1, r, Math.PI, 0, false);
  c.quadraticCurveTo(r * (1.1 - w), r * 0.6, 0, r * 2.1);
  c.closePath();
  fillStroke(c, '#a8f6ff', '#1b0f24', 2.6);
  ellipse(c, 0, 0, r * 0.6, r * 0.75, 0, '#f4feff', null, 0);
  c.restore();
  // a little face that always looks the way it flies
  const dir = p.vx >= 0 ? 1 : -1;
  circle(c, p.x + dir * r * 0.1, p.y - r * 0.1, r * 0.14, '#1b0f24', null, 0);
  circle(c, p.x + dir * r * 0.5, p.y - r * 0.1, r * 0.14, '#1b0f24', null, 0);
}

function spectralSword(c: CanvasRenderingContext2D, x: number, y: number, len: number, alpha: number, t: number): void {
  c.save();
  c.translate(x, y);
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = `rgba(140,240,255,${0.22 * alpha})`;
  c.beginPath();
  c.moveTo(-len * 0.12, -len * 0.9);
  c.lineTo(len * 0.12, -len * 0.9);
  c.lineTo(len * 0.1, len * 0.15);
  c.lineTo(0, len * 0.45);
  c.lineTo(-len * 0.1, len * 0.15);
  c.closePath();
  c.fill();
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = alpha;
  c.beginPath();
  c.moveTo(-len * 0.055, -len * 0.62);
  c.lineTo(len * 0.055, -len * 0.62);
  c.lineTo(len * 0.05, len * 0.18);
  c.lineTo(0, len * 0.36);
  c.lineTo(-len * 0.05, len * 0.18);
  c.closePath();
  fillStroke(c, 'rgba(225,252,255,0.92)', '#1b0f24', 2.6);
  rrect(c, -len * 0.17, -len * 0.68, len * 0.34, len * 0.07, 3);
  fillStroke(c, '#8ff7ff', '#1b0f24', 2.2);
  rrect(c, -len * 0.03, -len * 0.9, len * 0.06, len * 0.22, 2);
  fillStroke(c, '#5ad7e8', '#1b0f24', 2);
  circle(c, 0, -len * 0.92, len * 0.04, '#ffd35a', '#1b0f24', 1.6);
  c.strokeStyle = 'rgba(255,255,255,0.9)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(0, -len * 0.58);
  c.lineTo(0, len * 0.14 + Math.sin(t * 0.5) * 2);
  c.stroke();
  c.restore();
}

registerProjDraw('ghostfire', (c, p, r, t) => ghostfire(c, p, r, t));
registerProjDraw('ghostblade', (c, p, r, t) => {
  const a = Math.min(1, p.age / 6);
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 1; i < 5; i++) {
    c.fillStyle = `rgba(140,240,255,${0.08 * (5 - i)})`;
    c.fillRect(p.x - r * 0.12, p.y - r * 3 - i * 22, r * 0.24, 22);
  }
  c.restore();
  spectralSword(c, p.x, p.y - r * 0.6, r * 4.2, a, t);
});
registerProjDraw('greatblade', (c, p, r, t) => {
  // a great spectral blade plunging point-first; it bursts with ghostfire as it strikes the floor
  const g = Math.min(1, p.age / 30);
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 1; i < 6; i++) {
    c.fillStyle = `rgba(140,240,255,${0.07 * (6 - i)})`;
    c.fillRect(p.x - r * 0.22, p.y - r * 6 - i * 34, r * 0.44, 34);
  }
  circle(c, p.x, p.y, r * (0.8 + g * 1.2), `rgba(140,240,255,${0.1 + 0.25 * g})`, null, 0);
  c.restore();
  spectralSword(c, p.x, p.y - r * 2.2, r * 5, 1, t);
});
