// Stagehand Bot: a small boxy crew robot. Square head with an LED face screen, a headset with a boom mic, a
// tally light, a chunky body with a CREW panel, a tool belt with a tape roll, grippers, treaded boots, a wrench.
import { A } from '../../sim/acts';
import { FIGHTERS } from '../../sim/data';
import { boneFrame, circle, ellipse, fillStroke, OUTLINE, rgba, rrect, shade, type ArtDef, type FView } from '../art';
import { registerProjDraw } from '../things';

const R = 20;
const TORSO = 26;
const GIRTH = 16;
const WEP = 26;

function moveId(v: FView): string {
  return v.f.act === A.MOVE ? (FIGHTERS[v.f.def].moveIds[v.f.mv] ?? '') : '';
}

/** LED face: drawn as glowing strokes on the screen */
function ledFace(c: CanvasRenderingContext2D, v: FView, cx: number, cy: number, w: number): void {
  const col = v.p.accent;
  c.save();
  c.strokeStyle = col;
  c.fillStyle = col;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // the glow: a wide faint pass under the crisp one (shadowBlur was a per-stroke blur, slow with a stage full of
  // stagehands, D22)
  const a = c.globalAlpha;
  c.globalAlpha = a * 0.3;
  c.lineWidth = 7;
  ledStrokes(c, v, cx, cy, w);
  c.globalAlpha = a;
  c.lineWidth = 2.6;
  ledStrokes(c, v, cx, cy, w);
  c.restore();
}

function ledStrokes(c: CanvasRenderingContext2D, v: FView, cx: number, cy: number, w: number): void {
  const ex = w * 0.26;
  const e = v.expr;
  for (const s of [-1, 1]) {
    const x = cx + s * ex + 2;
    const y = cy - w * 0.08;
    c.beginPath();
    if (e === 'ko') {
      c.moveTo(x - 3.5, y - 3.5);
      c.lineTo(x + 3.5, y + 3.5);
      c.moveTo(x + 3.5, y - 3.5);
      c.lineTo(x - 3.5, y + 3.5);
      c.stroke();
    } else if (e === 'hurt') {
      c.moveTo(x - 3.5 * s, y - 3.5);
      c.lineTo(x + 3.5 * s, y);
      c.lineTo(x - 3.5 * s, y + 3.5);
      c.stroke();
    } else if (e === 'happy') {
      c.moveTo(x - 4, y + 2);
      c.lineTo(x, y - 3);
      c.lineTo(x + 4, y + 2);
      c.stroke();
    } else if (v.blink) {
      c.moveTo(x - 4, y);
      c.lineTo(x + 4, y);
      c.stroke();
    } else if (e === 'angry' || e === 'focus') {
      c.moveTo(x - 4, y - 2 - s * 1.5);
      c.lineTo(x + 4, y - 2 + s * 1.5);
      c.stroke();
      c.fillRect(x - 3, y, 6, 3.5);
    } else {
      c.arc(x, y, 3.6, 0, Math.PI * 2);
      c.fill();
    }
  }
  // mouth
  c.beginPath();
  const my = cy + w * 0.22;
  if (e === 'hurt' || e === 'ko') {
    for (let i = 0; i < 4; i++) c.lineTo(cx - 6 + i * 4 + 2, my + (i % 2 ? -2 : 2));
  } else if (e === 'happy') {
    c.arc(cx + 2, my - 3, 5, 0.2, Math.PI - 0.2);
  } else if (e === 'angry' || e === 'focus') {
    c.moveTo(cx - 4, my);
    c.lineTo(cx + 8, my);
  } else {
    c.moveTo(cx - 3, my - 1);
    c.quadraticCurveTo(cx + 2, my + 3, cx + 7, my - 1);
  }
  c.stroke();
}

registerProjDraw('shTape', (c, p, r, t) => {
  c.save();
  c.translate(p.x, p.y);
  c.rotate((p.vx >= 0 ? 1 : -1) * t * 0.3);
  circle(c, 0, 0, r, '#9aa3b5', OUTLINE, 3);
  circle(c, 0, 0, r * 0.45, '#2b2633', OUTLINE, 2);
  c.beginPath();
  c.arc(0, 0, r * 0.75, 0.3, 1.6);
  c.strokeStyle = 'rgba(255,255,255,0.6)';
  c.lineWidth = 2;
  c.stroke();
  // a loose tail of tape
  c.beginPath();
  c.moveTo(r * 0.9, 0);
  c.quadraticCurveTo(r * 1.6, r * 0.6, r * 1.3, r * 1.3);
  c.strokeStyle = '#9aa3b5';
  c.lineWidth = 4;
  c.stroke();
  c.restore();
});

registerProjDraw('shSandbag', (c, p, r) => {
  c.save();
  c.translate(p.x, p.y);
  // the rope up to the fly loft
  c.beginPath();
  c.moveTo(0, -r);
  c.lineTo(0, -r - 300);
  c.strokeStyle = '#c8a46a';
  c.lineWidth = 2;
  c.stroke();
  c.beginPath();
  c.moveTo(-r * 0.8, -r * 0.6);
  c.quadraticCurveTo(0, -r * 1.2, r * 0.8, -r * 0.6);
  c.quadraticCurveTo(r * 1.15, r * 0.4, r * 0.7, r);
  c.lineTo(-r * 0.7, r);
  c.quadraticCurveTo(-r * 1.15, r * 0.4, -r * 0.8, -r * 0.6);
  c.closePath();
  fillStroke(c, '#c8a46a', OUTLINE, 3);
  c.beginPath();
  c.moveTo(-r * 0.4, -r * 0.75);
  c.lineTo(r * 0.4, -r * 0.75);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 3;
  c.stroke();
  c.fillStyle = '#7a5a2a';
  c.font = '900 11px Bungee, Impact, sans-serif';
  c.textAlign = 'center';
  c.fillText('25KG', 0, r * 0.45);
  c.restore();
});

registerProjDraw('shLamp', (c, p, r, t) => {
  c.save();
  c.translate(p.x, p.y);
  // light cone while it falls
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.beginPath();
  c.moveTo(-r * 0.5, r * 0.6);
  c.lineTo(-r * 2.2, r * 6);
  c.lineTo(r * 2.2, r * 6);
  c.lineTo(r * 0.5, r * 0.6);
  c.closePath();
  c.fillStyle = `rgba(255,240,170,${0.18 + 0.06 * Math.sin(t * 0.8)})`;
  c.fill();
  c.restore();
  // yoke
  c.beginPath();
  c.moveTo(-r * 0.9, 0);
  c.lineTo(-r * 0.9, -r * 0.9);
  c.lineTo(r * 0.9, -r * 0.9);
  c.lineTo(r * 0.9, 0);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 7;
  c.stroke();
  c.strokeStyle = '#5d6478';
  c.lineWidth = 4;
  c.stroke();
  // can
  rrect(c, -r * 0.7, -r * 0.6, r * 1.4, r * 1.3, 6);
  fillStroke(c, '#2b2633', OUTLINE, 3);
  ellipse(c, 0, r * 0.7, r * 0.62, r * 0.2, 0, '#fff6c0', OUTLINE, 2.4);
  c.restore();
});

export const stagehandArt: ArtDef = {
  limb: 8,
  handR: 7,
  footL: 18,
  palettes: [
    { name: 'Crew Grey', main: '#9aa3b5', second: '#5d6478', accent: '#3affd5', skin: '#1e1b26', extra: '#ffb13a' },
    { name: 'Safety Orange', main: '#ff8a2a', second: '#6a4a3a', accent: '#fff07a', skin: '#1e1b26', extra: '#2b2633' },
    { name: 'Night Shift', main: '#3a3446', second: '#24202c', accent: '#ff3a6e', skin: '#0e0c14', extra: '#8a55ff' },
    { name: 'Stage Manager', main: '#3a7bff', second: '#22306e', accent: '#9cf6ff', skin: '#141a33', extra: '#ffcf3a' },
    { name: 'Props Dept', main: '#46b85a', second: '#1d4d2a', accent: '#ffe14f', skin: '#10201a', extra: '#c8743a' },
    { name: 'Lighting Crew', main: '#8a55ff', second: '#2b1157', accent: '#ff9ef0', skin: '#150a26', extra: '#ffcf3a' },
    { name: 'Gaffer Yellow', main: '#ffcf3a', second: '#6b5a2a', accent: '#3a9bff', skin: '#1e1b26', extra: '#2b2633' },
    { name: 'Employee of the Month', main: '#ffd76a', second: '#b08a2a', accent: '#ff5a5a', skin: '#1e1b26', extra: '#ffffff' },
  ],
  upperArm: (p) => p.second,
  foreArm: (p) => p.second,
  thigh: (p) => p.second,
  shin: (p) => p.second,
  torso: (c, v) => {
    const p = v.p;
    const k = v.k;
    boneFrame(c, v, k.hip, k.ang.torso);
    rrect(c, -GIRTH, -TORSO - 6, GIRTH * 2, TORSO + 12, 6);
    fillStroke(c, p.main, v.ol, 3.2);
    c.save();
    c.clip();
    c.fillStyle = shade(p.main, -0.18);
    c.fillRect(-GIRTH - 2, -TORSO - 8, GIRTH * 0.6, TORSO + 20);
    c.restore();
    // chest panel
    rrect(c, -GIRTH * 0.35, -TORSO + 1, GIRTH * 1.15, 13, 3);
    fillStroke(c, '#e8e2ff', v.ol, 2);
    c.fillStyle = '#2b2633';
    c.font = '900 7px Bungee, Impact, sans-serif';
    c.textAlign = 'center';
    c.fillText('CREW', GIRTH * 0.22, -TORSO + 10);
    // rivets
    for (const [x, y] of [[-GIRTH + 4, -TORSO - 2], [GIRTH - 4, -TORSO - 2], [-GIRTH + 4, 2], [GIRTH - 4, 2]] as [number, number][]) circle(c, x, y, 1.6, shade(p.main, 0.4), v.ol, 1);
    // tool belt
    rrect(c, -GIRTH - 1, -7, GIRTH * 2 + 2, 7, 2);
    fillStroke(c, p.extra ?? '#ffb13a', v.ol, 2.2);
    rrect(c, GIRTH * 0.25, -8, 9, 11, 2);
    fillStroke(c, shade(p.extra ?? '#ffb13a', -0.3), v.ol, 1.8);
    rrect(c, -GIRTH * 0.55, -8, 8, 10, 2);
    fillStroke(c, shade(p.extra ?? '#ffb13a', -0.3), v.ol, 1.8);
    // screwdriver poking out
    c.beginPath();
    c.moveTo(-GIRTH * 0.35, -8);
    c.lineTo(-GIRTH * 0.25, -15);
    c.strokeStyle = '#ff3a3a';
    c.lineWidth = 3;
    c.stroke();
    // tape roll on the hip
    circle(c, -GIRTH - 1, -2, 6, '#9aa3b5', v.ol, 2);
    circle(c, -GIRTH - 1, -2, 2.4, '#2b2633', null, 0);
    c.restore();
  },
  head: (c, v) => {
    const p = v.p;
    // tally light on an antenna (red while "on air", i.e. attacking)
    c.beginPath();
    c.moveTo(-R * 0.2, -R * 0.85);
    c.lineTo(-R * 0.3, -R * 1.35);
    c.strokeStyle = v.ol;
    c.lineWidth = 2.4;
    c.stroke();
    const live = v.f.act === A.MOVE && v.t % 10 < 6;
    circle(c, -R * 0.3, -R * 1.42, 3.6, live ? '#ff3a3a' : '#7a2a2a', v.ol, 1.8);
    // headset band (behind the head)
    c.beginPath();
    c.arc(-R * 0.1, -R * 0.05, R * 1.02, Math.PI * 1.05, Math.PI * 1.95);
    c.strokeStyle = v.ol;
    c.lineWidth = 7;
    c.stroke();
    c.strokeStyle = '#2b2633';
    c.lineWidth = 3.5;
    c.stroke();
    // boxy head
    rrect(c, -R * 0.95, -R * 0.85, R * 1.95, R * 1.72, R * 0.32);
    fillStroke(c, p.main, v.ol, 3);
    c.save();
    c.clip();
    c.fillStyle = shade(p.main, -0.18);
    c.fillRect(-R * 1.0, -R, R * 0.5, R * 2);
    c.restore();
    // screen
    rrect(c, -R * 0.35, -R * 0.55, R * 1.18, R * 1.1, R * 0.2);
    fillStroke(c, p.skin, v.ol, 2.4);
    ledFace(c, v, R * 0.24, 0, R * 1.0);
    c.beginPath();
    c.moveTo(-R * 0.25, -R * 0.45);
    c.lineTo(R * 0.15, -R * 0.45);
    c.strokeStyle = 'rgba(255,255,255,0.25)';
    c.lineWidth = 2;
    c.stroke();
    // ear cup + boom mic
    circle(c, -R * 0.55, R * 0.05, R * 0.34, '#2b2633', v.ol, 2.4);
    circle(c, -R * 0.55, R * 0.05, R * 0.14, '#5d6478', null, 0);
    c.beginPath();
    c.moveTo(-R * 0.45, R * 0.3);
    c.quadraticCurveTo(-R * 0.1, R * 0.95, R * 0.55, R * 0.72);
    c.strokeStyle = v.ol;
    c.lineWidth = 4.5;
    c.stroke();
    c.strokeStyle = '#2b2633';
    c.lineWidth = 2;
    c.stroke();
    ellipse(c, R * 0.62, R * 0.7, R * 0.16, R * 0.13, 0, '#3a3446', v.ol, 1.8);
  },
  hand: (c, v, x, y, front) => {
    const k = v.k;
    const phi = front ? k.ang.foreF : k.ang.foreB;
    boneFrame(c, v, [x, y], phi);
    const col = front ? v.p.main : shade(v.p.main, -0.2);
    rrect(c, -6, -4, 12, 8, 3);
    fillStroke(c, col, v.ol, 2.2);
    // two-prong gripper
    rrect(c, -6, -11, 4.5, 9, 2);
    fillStroke(c, shade(col, -0.25), v.ol, 1.8);
    rrect(c, 1.5, -11, 4.5, 9, 2);
    fillStroke(c, shade(col, -0.25), v.ol, 1.8);
    c.restore();
  },
  foot: (c, v, front) => {
    const k = v.k;
    const pt = front ? k.footF : k.footB;
    const phi = front ? k.ang.shF : k.ang.shB;
    boneFrame(c, v, pt, phi - 180);
    const col = front ? v.p.main : shade(v.p.main, -0.22);
    rrect(c, -8, -11, 22, 11, 3);
    fillStroke(c, col, v.ol, 2.6);
    rrect(c, -9, -1, 24, 5, 2);
    fillStroke(c, '#2b2633', v.ol, 1.8);
    c.fillStyle = '#5d6478';
    for (let i = 0; i < 4; i++) c.fillRect(-6 + i * 5.5, 0.5, 2.5, 2.5);
    // spring boots pop out during the up special
    if (moveId(v) === 'uspec' && v.f.mf >= 6 && v.f.mf <= 24) {
      c.beginPath();
      for (let i = 0; i <= 6; i++) c.lineTo(2 + (i % 2 ? 5 : -5), 4 + i * 4);
      c.strokeStyle = '#c9d2e3';
      c.lineWidth = 3;
      c.stroke();
    }
    c.restore();
  },
  weapon: (c, v) => {
    const k = v.k;
    boneFrame(c, v, k.handF, k.ang.wep);
    // wrench: handle along the bone, open jaw at the end
    rrect(c, -3, -WEP + 6, 6, WEP - 2, 3);
    fillStroke(c, '#c9d2e3', v.ol, 2.4);
    c.beginPath();
    c.moveTo(-7, -WEP + 8);
    c.lineTo(-8, -WEP - 4);
    c.lineTo(-2.5, -WEP - 4);
    c.lineTo(-2.5, -WEP + 1);
    c.lineTo(2.5, -WEP + 1);
    c.lineTo(2.5, -WEP - 4);
    c.lineTo(8, -WEP - 4);
    c.lineTo(7, -WEP + 8);
    c.closePath();
    fillStroke(c, '#c9d2e3', v.ol, 2.4);
    rrect(c, -2, -WEP + 10, 4, 10, 1.5);
    c.fillStyle = rgba('#5d6478', 0.8);
    c.fill();
    c.restore();
  },
  front: (c, v) => {
    // dolly dash: a little hand truck under the bot
    const mid = moveId(v);
    if ((mid === 'sspec' && v.f.mf >= 5 && v.f.mf <= 24) || (mid === 'dash' && v.f.mf >= 4 && v.f.mf <= 18)) {
      const k = v.k;
      const fx = Math.max(k.footF[1], k.footB[1]);
      const x = k.hip[0] + k.facing * 4;
      c.beginPath();
      c.moveTo(x - k.facing * 22, fx - 60);
      c.lineTo(x - k.facing * 10, fx - 4);
      c.lineTo(x + k.facing * 24, fx - 4);
      c.strokeStyle = OUTLINE;
      c.lineWidth = 7;
      c.stroke();
      c.strokeStyle = '#ff3a3a';
      c.lineWidth = 4;
      c.stroke();
      circle(c, x - k.facing * 6, fx - 2, 7, '#2b2633', OUTLINE, 2.4);
      circle(c, x - k.facing * 6, fx - 2, 2.5, '#9aa3b5', null, 0);
    }
  },
};
