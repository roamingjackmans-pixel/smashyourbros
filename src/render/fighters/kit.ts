// Kit Cadet: orange flight suit, white trim, glass bubble helmet with an antenna, jet boots, chunky ray blaster.
import { A } from '../../sim/acts';
import { boneFrame, circle, ellipse, eyes, fillStroke, mouth, rgba, rrect, shade, shoe, type ArtDef, type FView } from '../art';
import { defaultTorso } from '../fighterDraw';

const RIG = { torso: 36, girth: 15 };

function jetOn(v: FView): boolean {
  const f = v.f;
  if (f.act === A.MOVE) {
    const id = v.st.fighters[f.i] && f.mv;
    void id;
    return true;
  }
  return f.act === A.AIR && f.jumpKind === 2 && f.af < 14;
}

export const kitArt: ArtDef = {
  limb: 11,
  handR: 8,
  footL: 22,
  palettes: [
    { name: 'Launch Orange', main: '#ff8a2a', second: '#f4f1ea', accent: '#7fe3ff', skin: '#ffcfa6', extra: '#d8432f' },
    { name: 'Nebula Blue', main: '#3a7bff', second: '#f4f1ea', accent: '#ffe07a', skin: '#e9b48a', extra: '#22306e' },
    { name: 'Moss Ranger', main: '#46b85a', second: '#f2f6d8', accent: '#b8f2ff', skin: '#8d5a3b', extra: '#1d4d2a' },
    { name: 'Bubblegum', main: '#ff6fb5', second: '#fff3fa', accent: '#b7ffef', skin: '#ffd9c2', extra: '#7a2b77' },
    { name: 'Void Violet', main: '#8a55ff', second: '#e8ddff', accent: '#ff9ef0', skin: '#c98c64', extra: '#2b1157' },
    { name: 'Black Hole Gold', main: '#2b2633', second: '#ffcf3a', accent: '#ffcf3a', skin: '#f0c19b', extra: '#ffcf3a' },
    { name: 'Rescue Red', main: '#e43a3a', second: '#ffffff', accent: '#9ad7ff', skin: '#6b3f2a', extra: '#ffd23a' },
    { name: 'Comet Teal', main: '#1fc0b0', second: '#ecfffb', accent: '#fff17a', skin: '#ffe0c8', extra: '#0d5b55' },
  ],
  upperArm: (p) => p.main,
  foreArm: (p) => p.main,
  thigh: (p) => p.main,
  shin: (p) => p.second,
  back: (c, v) => {
    // jetpack between the shoulder blades
    boneFrame(c, v, v.k.hip, v.k.ang.torso);
    rrect(c, -RIG.girth - 14, -RIG.torso + 2, 16, 30, 5);
    fillStroke(c, '#9aa3b5', v.ol, 3);
    rrect(c, -RIG.girth - 12, -RIG.torso + 30, 12, 8, 3);
    fillStroke(c, '#5d6478', v.ol, 2.4);
    if (jetOn(v) && (v.f.act === A.AIR || (v.f.act === A.MOVE && v.f.gnd < 0))) {
      const fl = 14 + (v.t % 3) * 5;
      c.beginPath();
      c.moveTo(-RIG.girth - 12, -RIG.torso + 38);
      c.quadraticCurveTo(-RIG.girth - 6, -RIG.torso + 38 + fl, -RIG.girth - 0, -RIG.torso + 38);
      c.fillStyle = '#ffd23a';
      c.fill();
    }
    c.restore();
  },
  torso: (c, v) => {
    defaultTorso(c, v, { thigh: 24, shin: 24, torso: RIG.torso, head: 21, upper: 20, fore: 18, girth: RIG.girth, limb: 7 }, v.p.main, v.p.second);
    boneFrame(c, v, v.k.hip, v.k.ang.torso);
    // chest panel with a star
    circle(c, 4, -RIG.torso * 0.62, 7.5, v.p.second, v.ol, 2.4);
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 2.6 : 6;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      c.lineTo(4 + Math.cos(a) * r, -RIG.torso * 0.62 + Math.sin(a) * r);
    }
    c.closePath();
    c.fillStyle = v.p.extra ?? '#d8432f';
    c.fill();
    // collar
    ellipse(c, 0, -RIG.torso - 1, RIG.girth * 0.85, 5, 0, v.p.second, v.ol, 2.4);
    c.restore();
  },
  head: (c, v) => {
    const R = 21;
    const p = v.p;
    // hair tuft under the helmet
    c.beginPath();
    c.moveTo(-R * 0.75, -R * 0.35);
    c.quadraticCurveTo(-R * 0.5, -R * 1.05, R * 0.25, -R * 0.95);
    c.quadraticCurveTo(R * 0.15, -R * 0.6, R * 0.55, -R * 0.55);
    c.quadraticCurveTo(0, -R * 0.15, -R * 0.75, -R * 0.35);
    c.closePath();
    fillStroke(c, p.extra ?? '#d8432f', v.ol, 2.6);
    // face
    ellipse(c, R * 0.08, R * 0.05, R * 0.82, R * 0.8, 0, p.skin, v.ol, 3);
    // hair fringe over the face
    c.beginPath();
    c.moveTo(-R * 0.7, -R * 0.25);
    c.quadraticCurveTo(-R * 0.2, -R * 0.95, R * 0.75, -R * 0.45);
    c.quadraticCurveTo(R * 0.2, -R * 0.38, R * 0.1, -R * 0.1);
    c.quadraticCurveTo(-R * 0.2, -R * 0.4, -R * 0.7, -R * 0.25);
    c.closePath();
    fillStroke(c, p.extra ?? '#d8432f', v.ol, 2.4);
    // cheek
    circle(c, R * 0.55, R * 0.32, R * 0.13, rgba('#ff6b6b', 0.45), null, 0);
    eyes(c, v, R * 0.3, -R * 0.02, R * 0.26, '#2a6cff');
    mouth(c, v, R * 0.42, R * 0.42, R * 0.42);
    // bubble helmet
    circle(c, 0, -R * 0.05, R * 1.22, rgba(p.accent, 0.22), v.ol, 3.2);
    c.beginPath();
    c.arc(0, -R * 0.05, R * 1.05, -2.6, -1.7);
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.stroke();
    circle(c, R * 0.55, -R * 0.85, R * 0.1, 'rgba(255,255,255,0.8)', null, 0);
    // antenna
    c.beginPath();
    c.moveTo(-R * 0.5, -R * 1.1);
    c.lineTo(-R * 0.75, -R * 1.75);
    c.strokeStyle = v.ol;
    c.lineWidth = 3;
    c.stroke();
    circle(c, -R * 0.78, -R * 1.82, 4.5, '#ff4a4a', v.ol, 2.2);
    // helmet rim
    ellipse(c, 0, R * 1.0, R * 0.95, R * 0.22, 0, shade(p.second, -0.05), v.ol, 2.6);
  },
  foot: (c, v, front) => {
    const k = v.k;
    const pt = front ? k.footF : k.footB;
    const phi = front ? k.ang.shF : k.ang.shB;
    boneFrame(c, v, pt, phi - 180);
    const col = front ? v.p.second : shade(v.p.second, -0.22);
    shoe(c, 24, 13, col, shade(v.p.main, -0.3), v.ol, 2.8);
    c.fillStyle = front ? v.p.main : shade(v.p.main, -0.22);
    c.fillRect(-6, -11, 12, 4);
    // heel thruster
    if (v.f.gnd < 0 && (v.f.act === A.AIR || v.f.act === A.MOVE || v.f.act === A.HELPLESS)) {
      const fl = 10 + (v.t % 3) * 6 + (v.f.act === A.MOVE ? 10 : 0);
      c.beginPath();
      c.moveTo(-8, 0);
      c.quadraticCurveTo(-4, fl, 2, 0);
      c.fillStyle = 'rgba(255,200,60,0.9)';
      c.fill();
    }
    c.restore();
  },
  weapon: (c, v) => {
    // the ray blaster sits in the front fist
    const k = v.k;
    boneFrame(c, v, k.handF, k.ang.foreF);
    rrect(c, -6, -26, 12, 22, 4);
    fillStroke(c, '#c9d2e3', v.ol, 2.6);
    rrect(c, -4, -34, 8, 10, 3);
    fillStroke(c, v.p.accent, v.ol, 2.2);
    c.restore();
  },
  portrait: (c, p) => {
    void p;
    void c;
  },
};
