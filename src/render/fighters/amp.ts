// Amp: a lanky punk rocker. Towering spiked mohawk, lightning face paint, studded sleeveless vest over a band
// tee, ripped jeans, stompy boots, and a guitar shaped like a double-bladed battle axe.
import { A } from '../../sim/acts';
import { FIGHTERS, STAGES } from '../../sim/data';
import { boneFrame, circle, ellipse, eyes, fillStroke, mouth, OUTLINE, rgba, rrect, shade, type ArtDef, type FView } from '../art';
import { registerProjDraw } from '../things';

const R = 20;
const TORSO = 38;
const GIRTH = 16;
const WEP = 58;
const TEE = '#2a2433';

let curStage = 0; // remembered from the fighter pass, for the ultimate's speaker wall

function moveId(v: FView): string {
  return v.f.act === A.MOVE ? (FIGHTERS[v.f.def].moveIds[v.f.mv] ?? '') : '';
}

function note(c: CanvasRenderingContext2D, x: number, y: number, s: number, col: string): void {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  ellipse(c, 0, 0, 5, 3.8, -0.4, col, OUTLINE, 2);
  c.beginPath();
  c.moveTo(4.5, -1);
  c.lineTo(4.5, -15);
  c.quadraticCurveTo(9, -12, 11, -7);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 2.4;
  c.stroke();
  c.restore();
}

function spark(c: CanvasRenderingContext2D, x: number, y: number, s: number, t: number): void {
  c.save();
  c.translate(x, y);
  c.rotate((t % 8) * 0.4);
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? s * 0.35 : s;
    const a = (i * Math.PI) / 4;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  fillStroke(c, '#fff27a', OUTLINE, 2.2);
  c.restore();
}

/** one speaker cabinet, origin at its bottom centre */
function cabinet(c: CanvasRenderingContext2D, w: number, h: number, pump: number, crack: number): void {
  rrect(c, -w / 2, -h, w, h, 6);
  fillStroke(c, '#24202c', OUTLINE, 3);
  rrect(c, -w / 2 + 5, -h + 5, w - 10, h - 10, 4);
  fillStroke(c, '#3a3446', OUTLINE, 1.6);
  const cr = Math.min(w, h) * 0.3 * (1 + pump * 0.12);
  circle(c, 0, -h * 0.42, cr, '#14111a', OUTLINE, 2.4);
  circle(c, 0, -h * 0.42, cr * 0.62, '#4b4458', OUTLINE, 2);
  circle(c, 0, -h * 0.42, cr * 0.22, '#9a92aa', OUTLINE, 1.6);
  circle(c, 0, -h * 0.84, Math.min(w, h) * 0.08, '#9a92aa', OUTLINE, 1.6);
  for (const sx of [-1, 1]) for (const sy of [0, 1]) circle(c, sx * (w / 2 - 6), -h + 6 + sy * (h - 12), 3, '#c9c2d8', OUTLINE, 1.2);
  if (crack > 0) {
    c.beginPath();
    c.moveTo(-w * 0.3, -h * 0.9);
    c.lineTo(-w * 0.1, -h * 0.7);
    c.lineTo(-w * 0.2, -h * 0.55);
    if (crack > 1) {
      c.moveTo(w * 0.35, -h * 0.2);
      c.lineTo(w * 0.15, -h * 0.35);
      c.lineTo(w * 0.25, -h * 0.5);
    }
    c.strokeStyle = '#d8d0e8';
    c.lineWidth = 2;
    c.stroke();
  }
}

function soundArcs(c: CanvasRenderingContext2D, x: number, y: number, dir: number, r: number, col: string, k: number): void {
  c.save();
  c.translate(x, y);
  c.scale(dir, 1);
  c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const rr = r * (0.55 + i * 0.32);
    c.beginPath();
    c.arc(-r * 0.6, 0, rr, -0.85, 0.85);
    c.strokeStyle = rgba('#1b0f24', 0.7 * k);
    c.lineWidth = 9 - i * 1.5;
    c.stroke();
    c.strokeStyle = col;
    c.globalAlpha = k;
    c.lineWidth = 5 - i;
    c.stroke();
    c.globalAlpha = 1;
  }
  c.restore();
}

registerProjDraw('ampChord', (c, p, r, t) => {
  const boosted = p.v1 > 1;
  const k = Math.min(1, (p.life - p.age) / 10);
  const rr = r * (0.8 + Math.min(1, p.age / 12) * 0.5) * (boosted ? 1.35 : 1);
  soundArcs(c, p.x, p.y, p.vx >= 0 ? 1 : -1, rr, boosted ? '#ffe14f' : '#ff5fb0', k);
  note(c, p.x - (p.vx >= 0 ? 1 : -1) * rr * 0.2, p.y - rr * 0.5 + Math.sin(t * 0.3 + p.id) * 4, boosted ? 1.2 : 0.9, boosted ? '#ffe14f' : '#ffffff');
  if (boosted) note(c, p.x + (p.vx >= 0 ? -1 : 1) * rr * 0.4, p.y + rr * 0.45, 0.8, '#ff5fb0');
});

registerProjDraw('ampSpeaker', (c, p, r) => {
  const pump = p.age % 48 < 6 ? 1 - (p.age % 48) / 6 : 0;
  const hp = p.hp;
  c.save();
  c.translate(p.x, p.y + r * 0.5);
  if (p.life - p.age < 60 && p.age % 8 < 4) c.globalAlpha = 0.5;
  cabinet(c, r * 2.1, r * 2.3, pump, hp < 8 ? 2 : hp < 15 ? 1 : 0);
  // a little power light
  circle(c, r * 0.7, -r * 2.05, 3, pump > 0 ? '#ff5fb0' : '#7a2a55', null, 0);
  c.restore();
});

registerProjDraw('ampWall', (c, p, r, t) => {
  const stg = STAGES[curStage]?.solids[0];
  if (!stg) return;
  const floor = stg.y1;
  const beat = p.age % 14;
  const pump = beat < 5 ? 1 - beat / 5 : 0;
  const rise = Math.min(1, p.age / 14);
  for (const side of [-1, 1]) {
    const x = side < 0 ? stg.x1 - 80 : stg.x2 + 80;
    for (let i = 0; i < 4; i++) {
      for (const dx of [-1, 1]) {
        if (i === 3 && dx === 1) continue;
        c.save();
        c.translate(x + dx * 72 * (i === 3 ? 0 : 1) + (i === 3 ? 0 : 0), floor + (1 - rise) * 500 - i * 118);
        cabinet(c, 140, 118, pump, 0);
        c.restore();
      }
    }
    // sound pouring out toward the stage
    for (let j = 0; j < 3; j++) {
      const ph = ((p.age + j * 5) % 15) / 15;
      soundArcs(c, x - side * (110 + ph * 300), floor - 170, -side, 80 + ph * 90, '#ff5fb0', 1 - ph);
    }
  }
  // the banner
  if (p.age > 6) {
    const cx = (stg.x1 + stg.x2) / 2;
    const y = floor - 560 - pump * 8;
    c.save();
    c.font = '900 84px Bungee, Impact, sans-serif';
    c.textAlign = 'center';
    c.lineJoin = 'round';
    c.lineWidth = 12;
    c.strokeStyle = OUTLINE;
    c.strokeText('ENCORE!', cx, y);
    c.fillStyle = `hsl(${(t * 9) % 360},100%,65%)`;
    c.fillText('ENCORE!', cx, y);
    c.restore();
  }
  void r;
});

function axeGuitar(c: CanvasRenderingContext2D, v: FView): void {
  const L = WEP;
  const p = v.p;
  const body = p.main;
  const trim = p.accent;
  // headstock below the fist
  c.beginPath();
  c.moveTo(-3, 2);
  c.lineTo(3, 2);
  c.lineTo(6, 16);
  c.lineTo(-4, 18);
  c.closePath();
  fillStroke(c, '#2b2633', v.ol, 2.4);
  for (let i = 0; i < 3; i++) circle(c, -5, 7 + i * 4, 1.8, '#d8d0e8', v.ol, 1);
  // neck
  rrect(c, -3.2, -L * 0.62, 6.4, L * 0.62 + 4, 2);
  fillStroke(c, '#6b4428', v.ol, 2.4);
  c.fillStyle = '#ffe9c2';
  for (let i = 1; i < 5; i++) circle(c, 0, -i * L * 0.12, 1.1, '#ffe9c2', null, 0);
  // the axe body: a big blade forward, a smaller one behind
  const y0 = -L * 0.56;
  const y1 = -L * 1.0;
  c.beginPath();
  c.moveTo(2, y0);
  c.quadraticCurveTo(14, y0 - 2, 22, y0 + 6);
  c.quadraticCurveTo(30, (y0 + y1) / 2, 23, y1 - 6);
  c.quadraticCurveTo(13, y1 + 2, 2, y1);
  c.closePath();
  fillStroke(c, body, v.ol, 3);
  // blade edge
  c.beginPath();
  c.moveTo(22, y0 + 6);
  c.quadraticCurveTo(30, (y0 + y1) / 2, 23, y1 - 6);
  c.strokeStyle = trim;
  c.lineWidth = 3.4;
  c.stroke();
  c.beginPath();
  c.moveTo(-2, y0 + 3);
  c.quadraticCurveTo(-12, y0 + 2, -16, y0 + 8);
  c.quadraticCurveTo(-21, (y0 + y1) / 2, -15, y1 - 3);
  c.quadraticCurveTo(-9, y1 + 1, -2, y1 + 2);
  c.closePath();
  fillStroke(c, shade(body, -0.2), v.ol, 3);
  // centre block with pickups, bridge, strings
  rrect(c, -5, y1 - 4, 10, y0 - y1 + 10, 3);
  fillStroke(c, shade(body, -0.35), v.ol, 2.4);
  rrect(c, -4, y0 - 12, 8, 5, 1.5);
  fillStroke(c, '#1b1622', v.ol, 1.4);
  rrect(c, -4, y0 - 24, 8, 5, 1.5);
  fillStroke(c, '#1b1622', v.ol, 1.4);
  c.beginPath();
  for (const sx of [-1.4, 0, 1.4]) {
    c.moveTo(sx, 2);
    c.lineTo(sx, y1 + 6);
  }
  c.strokeStyle = 'rgba(240,240,255,0.8)';
  c.lineWidth = 0.8;
  c.stroke();
  // lightning inlay
  c.beginPath();
  c.moveTo(14, y0 + 4);
  c.lineTo(9, (y0 + y1) / 2);
  c.lineTo(15, (y0 + y1) / 2);
  c.lineTo(10, y1 - 2);
  c.strokeStyle = trim;
  c.lineWidth = 2.4;
  c.stroke();
}

export const ampArt: ArtDef = {
  limb: 10,
  handR: 7.5,
  footL: 26,
  palettes: [
    { name: 'Hot Pink Riot', main: '#ff3a8c', second: '#3a5a9a', accent: '#ffe14f', skin: '#f1b98f', extra: '#ff3a8c' },
    { name: 'Neon Venom', main: '#2fe08a', second: '#2b2633', accent: '#d8ff3a', skin: '#c98c64', extra: '#2fe08a' },
    { name: 'Blue Suede Bro', main: '#3a8bff', second: '#2b3550', accent: '#9cf6ff', skin: '#ffd2b0', extra: '#ffe14f' },
    { name: 'Classic Black', main: '#2b2633', second: '#4a5a7a', accent: '#ff3a3a', skin: '#8d5a3b', extra: '#ff3a3a' },
    { name: 'Purple Reign', main: '#9b4bff', second: '#2b2147', accent: '#ff9ef0', skin: '#f0c19b', extra: '#d8a0ff' },
    { name: 'Sunburst', main: '#ff8a2a', second: '#5a3a2a', accent: '#ffe7a0', skin: '#6b3f2a', extra: '#ffcf3a' },
    { name: 'Glam Glitter', main: '#e8e2ff', second: '#c4508a', accent: '#ff5fb0', skin: '#ffe0c8', extra: '#7fe3ff' },
    { name: 'Blood Orange Bass', main: '#e8402a', second: '#1f3a3a', accent: '#3affd5', skin: '#e2a57a', extra: '#3affd5' },
  ],
  upperArm: (p) => p.skin,
  foreArm: (p) => p.skin,
  thigh: (p) => p.second,
  shin: (p) => p.second,
  torso: (c, v) => {
    curStage = v.st.stage;
    const p = v.p;
    const k = v.k;
    boneFrame(c, v, k.hip, k.ang.torso);
    // band tee
    rrect(c, -GIRTH, -TORSO - GIRTH * 0.3, GIRTH * 2, TORSO + GIRTH * 0.75, GIRTH * 0.8);
    fillStroke(c, TEE, v.ol, 3.2);
    // heart logo
    const hx = 5;
    const hy = -TORSO * 0.52;
    c.beginPath();
    c.moveTo(hx, hy + 6);
    c.bezierCurveTo(hx - 10, hy - 1, hx - 5, hy - 9, hx, hy - 4);
    c.bezierCurveTo(hx + 5, hy - 9, hx + 10, hy - 1, hx, hy + 6);
    fillStroke(c, p.accent, v.ol, 1.8);
    // vest: back panel + front panel, open down the middle
    c.beginPath();
    c.moveTo(-GIRTH - 1, -TORSO - 1);
    c.lineTo(-GIRTH * 0.45, -TORSO - 4);
    c.lineTo(-GIRTH * 0.55, -2);
    c.lineTo(-GIRTH - 1, -2);
    c.closePath();
    fillStroke(c, shade(p.main, -0.25), v.ol, 2.6);
    c.beginPath();
    c.moveTo(GIRTH + 1, -TORSO + 2);
    c.lineTo(GIRTH * 0.55, -TORSO - 3);
    c.lineTo(GIRTH * 0.2, -TORSO * 0.45);
    c.lineTo(GIRTH * 0.5, -2);
    c.lineTo(GIRTH + 1, -2);
    c.closePath();
    fillStroke(c, p.main, v.ol, 2.6);
    // studs
    for (let i = 0; i < 3; i++) {
      circle(c, -GIRTH * 0.7 + i * 4, -TORSO + 3, 1.8, '#e8e8f0', v.ol, 1);
      circle(c, GIRTH * 0.75, -TORSO + 6 + i * 6, 1.8, '#e8e8f0', v.ol, 1);
    }
    // belt + buckle
    rrect(c, -GIRTH, -6, GIRTH * 2, 7, 2);
    fillStroke(c, '#1b1622', v.ol, 2);
    rrect(c, 3, -7.5, 9, 9, 2);
    fillStroke(c, '#ffd23a', v.ol, 1.8);
    c.restore();
  },
  head: (c, v) => {
    const p = v.p;
    const hair = p.extra ?? p.main;
    const mid = moveId(v);
    // mohawk: tall spikes from forehead to the back of the skull
    const bang = mid === 'usmash' || mid === 'ult' || v.f.act === A.TAUNT ? Math.sin(v.t * 0.6) * 4 : 0;
    c.beginPath();
    c.moveTo(R * 0.55, -R * 0.62);
    const spikes: [number, number][] = [
      [R * 0.7, -R * 1.75 + bang],
      [R * 0.15, -R * 0.85],
      [R * 0.05, -R * 2.2 + bang],
      [-R * 0.35, -R * 0.82],
      [-R * 0.6, -R * 2.05 + bang],
      [-R * 0.8, -R * 0.62],
      [-R * 1.25, -R * 1.45 + bang],
      [-R * 1.0, -R * 0.1],
    ];
    for (const [x, y] of spikes) c.lineTo(x, y);
    c.lineTo(-R * 0.4, -R * 0.4);
    c.closePath();
    fillStroke(c, hair, v.ol, 2.8);
    c.beginPath();
    c.moveTo(R * 0.45, -R * 0.7);
    c.lineTo(R * 0.6, -R * 1.45 + bang);
    c.moveTo(-R * 0.05, -R * 0.9);
    c.lineTo(R * 0.02, -R * 1.85 + bang);
    c.strokeStyle = shade(hair, 0.4);
    c.lineWidth = 2.2;
    c.stroke();
    // head (squarish jaw)
    c.beginPath();
    c.moveTo(-R * 0.82, -R * 0.45);
    c.quadraticCurveTo(-R * 0.75, -R * 0.95, R * 0.1, -R * 0.9);
    c.quadraticCurveTo(R * 0.92, -R * 0.82, R * 0.95, -R * 0.1);
    c.lineTo(R * 0.92, R * 0.55);
    c.quadraticCurveTo(R * 0.85, R * 0.95, R * 0.25, R * 0.98);
    c.quadraticCurveTo(-R * 0.6, R * 0.95, -R * 0.82, R * 0.35);
    c.closePath();
    fillStroke(c, p.skin, v.ol, 3);
    // shaved side
    c.save();
    c.clip();
    ellipse(c, -R * 0.3, -R * 0.5, R * 0.62, R * 0.36, -0.3, rgba(shade(hair, -0.35), 0.55), null, 0);
    for (let i = 0; i < 7; i++) circle(c, -R * 0.6 + (i % 4) * R * 0.2, -R * 0.62 + Math.floor(i / 4) * R * 0.2, 1, rgba(shade(hair, -0.5), 0.7), null, 0);
    c.restore();
    // ear + stud
    ellipse(c, -R * 0.25, R * 0.12, R * 0.2, R * 0.27, 0, shade(p.skin, -0.08), v.ol, 2.2);
    circle(c, -R * 0.25, R * 0.38, 2.4, '#ffe14f', v.ol, 1.2);
    // face paint: a lightning stripe under the front eye
    c.beginPath();
    c.moveTo(R * 0.62, R * 0.12);
    c.lineTo(R * 0.45, R * 0.42);
    c.lineTo(R * 0.6, R * 0.42);
    c.lineTo(R * 0.45, R * 0.72);
    c.strokeStyle = p.accent;
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.stroke();
    eyes(c, v, R * 0.42, -R * 0.12, R * 0.24, '#2b2633', { gap: R * 0.52 });
    // eyeliner flick
    if (!v.blink && v.expr !== 'happy' && v.expr !== 'ko') {
      c.beginPath();
      c.moveTo(R * 0.55, -R * 0.36);
      c.lineTo(R * 0.85, -R * 0.42);
      c.strokeStyle = v.ol;
      c.lineWidth = 2.4;
      c.stroke();
    }
    // grin (a big shout while rocking out)
    if (mid === 'nspec' || mid === 'nspecAir' || mid === 'usmash' || mid === 'ult' || mid === 'sspec') {
      ellipse(c, R * 0.6, R * 0.55, R * 0.22, R * 0.2, 0, '#5a1a2a', v.ol, 2.4);
      rrect(c, R * 0.44, R * 0.4, R * 0.32, R * 0.08, 1);
      c.fillStyle = '#fff';
      c.fill();
    } else mouth(c, v, R * 0.55, R * 0.55, R * 0.42, v.expr === 'normal' ? 'grin' : undefined);
    // nose
    c.beginPath();
    c.moveTo(R * 0.9, R * 0.05);
    c.lineTo(R * 1.05, R * 0.3);
    c.lineTo(R * 0.88, R * 0.33);
    c.strokeStyle = v.ol;
    c.lineWidth = 2.2;
    c.stroke();
  },
  hand: (c, v, x, y, front) => {
    const s = v.k.scale;
    const col = front ? v.p.skin : shade(v.p.skin, -0.18);
    circle(c, x, y, 7.5 * s, col, v.ol, 2.6);
    // spiked wristband just up the forearm
    const k = v.k;
    const e = front ? k.elbowF : k.elbowB;
    const dx = e[0] - x;
    const dy = e[1] - y;
    const l = Math.hypot(dx, dy) || 1;
    const bx = x + (dx / l) * 9 * s;
    const by = y + (dy / l) * 9 * s;
    circle(c, bx, by, 6.5 * s, front ? '#1b1622' : '#120f18', v.ol, 2);
    for (let i = 0; i < 3; i++) {
      const a = Math.atan2(dy, dx) + Math.PI / 2 + (i - 1) * 0.9;
      circle(c, bx + Math.cos(a) * 6 * s, by + Math.sin(a) * 6 * s, 1.6 * s, '#e8e8f0', null, 0);
    }
  },
  foot: (c, v, front) => {
    const k = v.k;
    const pt = front ? k.footF : k.footB;
    const phi = front ? k.ang.shF : k.ang.shB;
    boneFrame(c, v, pt, phi - 180);
    const col = front ? '#2b2633' : '#1b1622';
    // stompy boot
    c.beginPath();
    c.moveTo(-9, -18);
    c.lineTo(5, -18);
    c.lineTo(6, -9);
    c.quadraticCurveTo(20, -9, 21, 0);
    c.lineTo(-10, 0);
    c.closePath();
    fillStroke(c, col, v.ol, 2.6);
    rrect(c, -11, -1, 33, 7, 3);
    fillStroke(c, '#4a4258', v.ol, 2);
    c.fillStyle = '#c9c2d8';
    c.fillRect(-7, -14, 11, 2.4);
    c.fillRect(-7, -9, 11, 2.4);
    c.restore();
  },
  weapon: (c, v) => {
    const k = v.k;
    boneFrame(c, v, k.handF, k.ang.wep);
    axeGuitar(c, v);
    c.restore();
  },
  front: (c, v) => {
    const k = v.k;
    const mid = moveId(v);
    const mf = v.f.mf;
    if ((mid === 'fsmash' && mf >= 16 && mf <= 22) || (mid === 'fair' && mf >= 11 && mf <= 15)) {
      spark(c, k.wep[0], k.wep[1], 16 + (mf % 3) * 4, v.t);
      spark(c, k.wepMid[0], k.wepMid[1] + 6, 9, v.t + 3);
    }
    if ((mid === 'nspec' || mid === 'nspecAir') && mf >= 12 && mf <= 26) {
      note(c, k.wepMid[0] + k.facing * (8 + (mf - 12) * 2), k.wepMid[1] - 18 - (mf - 12) * 2, 1, v.p.accent);
    }
    if (mid === 'ult' && mf >= 12 && mf <= 92) {
      for (let i = 0; i < 3; i++) {
        const ph = (v.t * 2 + i * 13) % 40;
        note(c, k.hip[0] + Math.sin(i * 2.1 + v.t * 0.05) * 40, k.hip[1] - 60 - ph * 3, 1.2, ['#ff5fb0', '#ffe14f', '#7fe3ff'][i]);
      }
    }
    if (mid === 'uspec' && mf >= 7 && mf <= 30) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const rr = 30 + ((v.t * 4 + i * 20) % 60);
        circle(c, k.hip[0], k.hip[1] - 20, rr, '', `rgba(255,95,176,${0.6 - rr / 150})`, 4);
      }
      c.restore();
    }
    if (mid === 'usmash' && mf >= 10 && mf <= 18) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const rr = 18 + i * 16 + (mf - 10) * 4;
        c.beginPath();
        c.arc(k.wep[0], k.wep[1], rr, Math.PI * 1.15, Math.PI * 1.85);
        c.strokeStyle = `rgba(255,225,79,${0.8 - i * 0.2})`;
        c.lineWidth = 5;
        c.stroke();
      }
      c.restore();
    }
  },
};
