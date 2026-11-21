// Professor Hoot: round owl in a star-trimmed scholar's robe, moon spectacles, a mortarboard with a swinging tassel,
// feathered wing-sleeves, talons, and a spellbook that floats at his shoulder (it jumps into his wing for book
// attacks). Also draws his magic: orb charge, page bursts, rune blasts, the starlight pillar, the barrier, the
// blink streak, and the projectiles (Arcane Orb, Homing Quill, the Final Exam spell circle).
import { A } from '../../sim/acts';
import { FIGHTERS } from '../../sim/data';
import { boneFrame, circle, ellipse, eyes, fillStroke, OUTLINE, rgba, rrect, shade, type ArtDef, type FView, type Palette } from '../art';
import { registerProjDraw } from '../things';

const R = 24; // head radius
const G = 17; // girth
const L = 34; // torso length

/** set while the front foot hook redraws the lower robe over the front thigh */
let skirtOnly = false;

/** moves where the tome is in his wing instead of floating */
const BOOK_MOVES = new Set(['jab3', 'ftilt', 'fsmash', 'usmash', 'dsmash', 'fthrow', 'dspec', 'dspecAir', 'ult']);

function moveId(v: FView): string {
  return v.f.act === A.MOVE ? (FIGHTERS[v.f.def]?.moveIds[v.f.mv] ?? '') : '';
}

function beakCol(p: Palette): string {
  return p.extra ?? '#ffb02e';
}

/** a 4-point sparkle */
function sparkle(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string): void {
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.closePath();
  c.fillStyle = col;
  c.fill();
}

/** a rune circle (two rings, an eight-point star, tick runes), centred at 0,0 */
function runeCircle(c: CanvasRenderingContext2D, r: number, col: string, spin: number, lw = 3): void {
  c.strokeStyle = col;
  c.lineWidth = lw;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  c.stroke();
  c.save();
  c.rotate(spin);
  c.beginPath();
  for (let i = 0; i <= 8; i++) {
    const a = (i * 3 * Math.PI * 2) / 8;
    const x = Math.cos(a) * r * 0.76;
    const y = Math.sin(a) * r * 0.76;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
  c.restore();
  c.save();
  c.rotate(-spin * 1.5);
  c.lineWidth = lw * 0.8;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI * 2) / 12;
    const x = Math.cos(a) * r * 0.89;
    const y = Math.sin(a) * r * 0.89;
    c.beginPath();
    if (i % 3 === 0) c.arc(x, y, r * 0.045, 0, Math.PI * 2);
    else {
      c.moveTo(x - Math.sin(a) * r * 0.05, y + Math.cos(a) * r * 0.05);
      c.lineTo(x + Math.sin(a) * r * 0.05, y - Math.cos(a) * r * 0.05);
    }
    c.stroke();
  }
  c.restore();
}

/** the spellbook, in a frame where the spine runs along -y from the origin */
function drawBook(c: CanvasRenderingContext2D, v: FView, open: boolean, glow: number): void {
  const p = v.p;
  const cover = shade(p.main, -0.38);
  if (glow > 0) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    circle(c, 0, -13, 20 + glow * 10, rgba(p.accent, 0.22 * glow), null, 0);
    c.restore();
  }
  if (open) {
    // two pages spread like wings
    c.beginPath();
    c.moveTo(0, -1);
    c.lineTo(-15, -4);
    c.lineTo(-16, -25);
    c.lineTo(0, -23);
    c.closePath();
    fillStroke(c, cover, v.ol, 2.6);
    c.beginPath();
    c.moveTo(0, -1);
    c.lineTo(15, -4);
    c.lineTo(16, -25);
    c.lineTo(0, -23);
    c.closePath();
    fillStroke(c, cover, v.ol, 2.6);
    c.beginPath();
    c.moveTo(0, -3);
    c.lineTo(-12, -5.5);
    c.lineTo(-13, -22.5);
    c.lineTo(0, -21);
    c.lineTo(13, -22.5);
    c.lineTo(12, -5.5);
    c.closePath();
    fillStroke(c, '#fff8e6', v.ol, 2);
    c.strokeStyle = rgba('#6b5a7a', 0.7);
    c.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(-10.5, -18.5 + i * 3.6);
      c.lineTo(-3, -17.5 + i * 3.6);
      c.moveTo(3, -17.5 + i * 3.6);
      c.lineTo(10.5, -18.5 + i * 3.6);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(0, -3);
    c.lineTo(0, -21);
    c.strokeStyle = v.ol;
    c.lineWidth = 2;
    c.stroke();
    if (glow > 0) sparkle(c, 6, -14, 4 + glow * 3, p.accent);
    return;
  }
  // closed: cover, page edge, gold corners, a moon rune and a ribbon bookmark
  rrect(c, -9, -26, 18, 24, 3);
  fillStroke(c, cover, v.ol, 2.6);
  c.fillStyle = '#fff8e6';
  c.fillRect(6, -24, 3, 20);
  c.fillStyle = p.second;
  c.fillRect(-9, -26, 5, 5);
  c.fillRect(-9, -7, 5, 5);
  c.beginPath();
  c.arc(-0.5, -14, 5, 0.6, Math.PI * 2 - 0.6);
  c.arc(1.5, -14, 4, Math.PI * 2 - 0.9, 0.9, true);
  c.closePath();
  c.fillStyle = p.accent;
  c.fill();
  c.beginPath();
  c.moveTo(2, -2);
  c.lineTo(3, 5);
  c.lineTo(5, 2);
  c.lineTo(7, 5);
  c.lineTo(6, -2);
  c.fillStyle = '#ff4a6e';
  c.fill();
}

/** feather fan for a wing tip, in a hand frame (forearm runs along -y) */
function wingTip(c: CanvasRenderingContext2D, v: FView, front: boolean): void {
  const p = v.p;
  const fe = front ? p.skin : shade(p.skin, -0.2);
  const tip = shade(fe, -0.38);
  const spread = [-0.42, -0.14, 0.14, 0.4];
  for (let i = 0; i < spread.length; i++) {
    const a = spread[i];
    const len = 19 - Math.abs(i - 1.5) * 2.2;
    c.save();
    c.rotate(a);
    c.beginPath();
    c.moveTo(-3.6, -2);
    c.quadraticCurveTo(-4.6, -len * 0.6, 0, -len);
    c.quadraticCurveTo(4.6, -len * 0.6, 3.6, -2);
    c.closePath();
    fillStroke(c, fe, v.ol, 2.2);
    c.beginPath();
    c.moveTo(-2.6, -len * 0.66);
    c.quadraticCurveTo(0, -len * 0.76, 2.6, -len * 0.66);
    c.lineTo(0, -len + 1.5);
    c.closePath();
    c.fillStyle = tip;
    c.fill();
    c.restore();
  }
  // sleeve cuff
  c.beginPath();
  c.moveTo(-6.5, 9);
  c.lineTo(6.5, 9);
  c.lineTo(9, -1);
  c.lineTo(-9, -1);
  c.closePath();
  fillStroke(c, front ? p.second : shade(p.second, -0.2), v.ol, 2.4);
}

export const hootArt: ArtDef = {
  limb: 12,
  footL: 20,
  palettes: [
    { name: 'Midnight Scholar', main: '#3b2a7a', second: '#ffd36a', accent: '#7fe3ff', skin: '#a8754a', extra: '#ffb02e' },
    { name: 'Snowy Dean', main: '#eef3ff', second: '#8fb2ff', accent: '#8ee6ff', skin: '#f6f1e6', extra: '#ffd23a' },
    { name: 'Crimson Tenure', main: '#b3283d', second: '#ffd36a', accent: '#ffb36b', skin: '#7a5236', extra: '#ffcc33' },
    { name: 'Emerald Thesis', main: '#1f7a57', second: '#eaf7c6', accent: '#b6ff6a', skin: '#94704e', extra: '#ffae2e' },
    { name: 'Barn Lantern', main: '#d9822b', second: '#fff1d6', accent: '#ffe27a', skin: '#ecd0a2', extra: '#5a3a26' },
    { name: 'Stargazer', main: '#353a52', second: '#dfe6ff', accent: '#ff8af2', skin: '#7a6a8e', extra: '#ffe14f' },
    { name: 'Bubble Tea', main: '#ff8fc8', second: '#fff3fa', accent: '#8affea', skin: '#b88c6c', extra: '#ff9a3a' },
    { name: 'Tea-Time Teal', main: '#1a9a9a', second: '#ffe9b0', accent: '#ffd23a', skin: '#a07850', extra: '#ff8a2a' },
  ],
  upperArm: (p) => p.main,
  foreArm: (p) => p.main,
  thigh: (p) => p.main,
  shin: (p) => p.skin,
  back: (c, v) => {
    const f = v.f;
    const id = moveId(v);
    const k = v.k;
    const s = k.scale;
    // Blink: fade out, gone during the streak, fade back in (contained by drawFighter's save/restore)
    if (id === 'uspec') {
      const m = f.mf;
      const a = m < 4 ? 1 : m < 6 ? 1 - (m - 3) * 0.4 : m <= 13 ? 0.04 : m <= 17 ? 0.2 + (m - 13) * 0.2 : 1;
      c.globalAlpha *= a;
    }
    // the floating tome (not during book moves or the taunt)
    if (!BOOK_MOVES.has(id) && f.act !== A.TAUNT) {
      const bob = Math.sin(v.t * 0.07 + f.i) * 4;
      const bx = k.shoulder[0] - 30 * k.facing * s;
      const by = k.shoulder[1] - (20 + bob) * k.grav * s;
      c.save();
      c.translate(bx, by);
      c.scale(k.facing * s, k.grav * s);
      c.rotate(-0.25 + Math.sin(v.t * 0.05) * 0.08);
      c.translate(0, 13);
      drawBook(c, v, false, f.stored > 0 ? 0.6 + f.stored * 0.4 : 0);
      c.restore();
      // a stored orb sits on the book, glowing
      if (f.stored > 0 && id !== 'nspec' && id !== 'nspecAir') {
        c.save();
        c.globalCompositeOperation = 'lighter';
        const rr = (5 + f.stored * 9) * s;
        circle(c, bx, by - 20 * k.grav * s, rr * 1.8, rgba(v.p.accent, 0.25), null, 0);
        circle(c, bx, by - 20 * k.grav * s, rr, rgba('#c9a8ff', 0.8), null, 0);
        c.restore();
        for (let i = 0; i < 3; i++) {
          const a = v.t * 0.12 + (i * Math.PI * 2) / 3;
          sparkle(c, bx + Math.cos(a) * 18 * s, by - 20 * k.grav * s + Math.sin(a) * 9 * s, 3.5 * s, '#ffffff');
        }
      }
    }
  },
  tail: (c, v) => {
    const k = v.k;
    boneFrame(c, v, k.hip, k.ang.tail);
    const col = shade(v.p.skin, -0.12);
    for (const a of [-0.32, 0, 0.32]) {
      c.save();
      c.rotate(a);
      c.beginPath();
      c.moveTo(-4, -6);
      c.quadraticCurveTo(-5.5, -20, 0, -29);
      c.quadraticCurveTo(5.5, -20, 4, -6);
      c.closePath();
      fillStroke(c, col, v.ol, 2.4);
      c.fillStyle = shade(col, -0.35);
      c.fillRect(-2.5, -21, 5, 2.4);
      c.restore();
    }
    c.restore();
  },
  torso: (c, v) => {
    const p = v.p;
    boneFrame(c, v, v.k.hip, v.k.ang.torso);
    // skirt mode (called from the front foot): redraw only the lower robe, over the front thigh
    const skirt = skirtOnly;
    if (skirt) {
      c.save();
      c.beginPath();
      c.rect(-G * 2, -L * 0.3, G * 4, L + G * 3);
      c.clip();
    }
    // the robe: round owl belly, flared hem
    const robe = (): void => {
      c.beginPath();
      c.moveTo(-G * 0.8, -L - 2);
      c.quadraticCurveTo(-G * 1.2, -L * 0.5, -G * 1.3, G * 0.6);
      c.lineTo(-G * 1.42, G * 1.18);
      c.quadraticCurveTo(0, G * 1.42, G * 1.38, G * 1.12);
      c.lineTo(G * 1.24, G * 0.5);
      c.quadraticCurveTo(G * 1.22, -L * 0.55, G * 0.74, -L - 2);
      c.quadraticCurveTo(0, -L - 9, -G * 0.8, -L - 2);
      c.closePath();
    };
    robe();
    fillStroke(c, p.main, v.ol, 3.2);
    c.save();
    robe();
    c.clip();
    // back-half shade
    c.fillStyle = shade(p.main, -0.2);
    c.fillRect(-G * 1.6, -L - 10, G * 0.95, L + G * 3);
    // hem trim with little moons
    c.fillStyle = p.second;
    c.fillRect(-G * 1.6, G * 0.82, G * 3.2, G * 0.7);
    c.strokeStyle = v.ol;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-G * 1.6, G * 0.82);
    c.lineTo(G * 1.6, G * 0.82);
    c.stroke();
    c.fillStyle = shade(p.main, -0.1);
    for (const x of [-G * 0.9, -G * 0.1, G * 0.7]) {
      c.beginPath();
      c.arc(x, G * 1.06, 3.2, 0.5, Math.PI * 2 - 0.5);
      c.arc(x + 1.6, G * 1.06, 2.5, Math.PI * 2 - 0.8, 0.8, true);
      c.fill();
    }
    // chest feathers in the robe's opening
    ellipse(c, G * 0.5, -L * 0.6, G * 0.56, L * 0.36, 0.1, shade(p.skin, 0.28), v.ol, 2.2);
    c.strokeStyle = shade(p.skin, -0.25);
    c.lineWidth = 1.8;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const x = G * 0.32 + j * 7 + (i % 2) * 3.5;
        const y = -L * 0.82 + i * 7;
        c.beginPath();
        c.moveTo(x - 2.4, y - 1.6);
        c.lineTo(x, y + 1);
        c.lineTo(x + 2.4, y - 1.6);
        c.stroke();
      }
    }
    // lapels down the front
    c.lineCap = 'round';
    for (const [x0, x1] of [
      [G * 0.02, G * 0.18],
      [G * 0.98, G * 0.86],
    ] as const) {
      c.beginPath();
      c.moveTo(x0, -L - 1);
      c.quadraticCurveTo((x0 + x1) / 2 + (x0 < G * 0.5 ? -3 : 3), -L * 0.55, x1, -L * 0.2);
      c.strokeStyle = v.ol;
      c.lineWidth = 7;
      c.stroke();
      c.strokeStyle = p.second;
      c.lineWidth = 3.6;
      c.stroke();
    }
    // star embroidery
    for (const [x, y, r] of [
      [-G * 0.8, -L * 0.62, 4],
      [-G * 0.5, -L * 0.18, 3],
      [G * 0.95, G * 0.25, 3.4],
    ] as const) {
      sparkle(c, x, y, r, rgba(p.accent, 0.9));
    }
    c.restore();
    if (skirt) {
      c.restore();
      c.restore();
      return;
    }
    // collar drape and a crescent brooch
    ellipse(c, -2, -L - 1, G * 0.92, 5.5, 0, p.second, v.ol, 2.4);
    c.beginPath();
    c.arc(G * 0.46, -L + 3, 4.2, 0.6, Math.PI * 2 - 0.6);
    c.arc(G * 0.46 + 2, -L + 3, 3.3, Math.PI * 2 - 0.9, 0.9, true);
    c.closePath();
    fillStroke(c, p.accent, v.ol, 1.6);
    c.restore();
  },
  head: (c, v) => {
    const p = v.p;
    const e = v.expr;
    const fe = p.skin;
    const dark = shade(fe, -0.25);
    const id = moveId(v);
    // ear tufts (horn feathers), poking out from under the cap
    for (const [x, rot, len] of [
      [-R * 0.62, -0.5, 1.0],
      [R * 0.5, 0.25, 0.9],
    ] as const) {
      c.save();
      c.translate(x, -R * 0.62);
      c.rotate(rot);
      c.beginPath();
      c.moveTo(-6, 4);
      c.quadraticCurveTo(-5, -R * 0.4 * len, 1, -R * 0.75 * len);
      c.quadraticCurveTo(4, -R * 0.35 * len, 7, 4);
      c.closePath();
      fillStroke(c, dark, v.ol, 2.6);
      c.restore();
    }
    // head
    ellipse(c, 0, 0, R * 1.02, R * 0.96, 0, fe, v.ol, 3.2);
    c.save();
    c.beginPath();
    c.ellipse(0, 0, R * 1.02, R * 0.96, 0, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = shade(fe, -0.14);
    c.fillRect(-R * 1.2, -R * 1.2, R * 0.65, R * 2.4);
    c.restore();
    // facial disc (heart-ish)
    c.beginPath();
    c.moveTo(R * 0.38, -R * 0.52);
    c.bezierCurveTo(R * 0.85, -R * 0.82, R * 1.18, -R * 0.2, R * 0.92, R * 0.28);
    c.bezierCurveTo(R * 0.78, R * 0.62, R * 0.5, R * 0.8, R * 0.3, R * 0.62);
    c.bezierCurveTo(-R * 0.1, R * 0.7, -R * 0.36, R * 0.3, -R * 0.3, -R * 0.12);
    c.bezierCurveTo(-R * 0.22, -R * 0.62, R * 0.14, -R * 0.66, R * 0.38, -R * 0.52);
    c.closePath();
    fillStroke(c, shade(fe, 0.42), v.ol, 2.2);
    // feather brows over the spectacles
    const browY = e === 'angry' || e === 'focus' ? -R * 0.48 : e === 'hurt' ? -R * 0.6 : -R * 0.56;
    c.strokeStyle = dark;
    c.lineCap = 'round';
    c.lineWidth = 4;
    c.beginPath();
    if (e === 'angry' || e === 'focus') {
      c.moveTo(-R * 0.16, browY - 5);
      c.lineTo(R * 0.24, browY + 1);
      c.moveTo(R * 0.46, browY + 1);
      c.lineTo(R * 0.92, browY - 6);
    } else if (e === 'hurt') {
      c.moveTo(-R * 0.16, browY + 3);
      c.lineTo(R * 0.24, browY - 2);
      c.moveTo(R * 0.46, browY - 2);
      c.lineTo(R * 0.92, browY + 3);
    } else {
      c.moveTo(-R * 0.16, browY);
      c.quadraticCurveTo(R * 0.04, browY - 4, R * 0.24, browY);
      c.moveTo(R * 0.46, browY);
      c.quadraticCurveTo(R * 0.69, browY - 5, R * 0.92, browY);
    }
    c.stroke();
    // big owl eyes: amber irises with dark pupils
    const ex = R * 0.32;
    const ey = -R * 0.12;
    const es = R * 0.27;
    eyes(c, v, ex, ey, es, '#1b0f24', { gap: R * 0.66, brow: false, white: beakCol(p) });
    // cheeks
    if (e === 'happy' || f_taunt(v)) {
      circle(c, R * 0.78, R * 0.3, R * 0.12, rgba('#ff6b8b', 0.5), null, 0);
      circle(c, R * 0.06, R * 0.32, R * 0.1, rgba('#ff6b8b', 0.4), null, 0);
    }
    // moon spectacles: round lenses with crescent rims, a bridge and an arm back to the ear
    const gap = R * 0.66;
    const lx = [ex - gap * 0.5 + 2, ex + gap * 0.5 + 2];
    const lr = [es * 1.12, es * 1.3];
    c.save();
    for (let i = 0; i < 2; i++) {
      circle(c, lx[i], ey, lr[i], rgba('#e8f6ff', 0.22), null, 0);
    }
    c.lineWidth = 2.6;
    c.strokeStyle = v.ol;
    c.beginPath();
    c.moveTo(lx[0] + lr[0], ey - 1);
    c.quadraticCurveTo((lx[0] + lx[1]) / 2, ey - 5, lx[1] - lr[1], ey - 1);
    c.moveTo(lx[0] - lr[0], ey);
    c.lineTo(-R * 0.62, ey - 3);
    c.stroke();
    for (let i = 0; i < 2; i++) {
      c.beginPath();
      c.arc(lx[i], ey, lr[i], 0, Math.PI * 2);
      c.strokeStyle = v.ol;
      c.lineWidth = 4.4;
      c.stroke();
      c.strokeStyle = '#e9d68a';
      c.lineWidth = 2;
      c.stroke();
      // crescent shine on the rim
      c.beginPath();
      c.arc(lx[i], ey, lr[i] - 0.4, -2.5, -1.2);
      c.strokeStyle = '#fffbe0';
      c.lineWidth = 2;
      c.stroke();
    }
    // spectacle glint: a white flash across the lenses on big moves
    const glint = (id === 'fsmash' || id === 'usmash' || id === 'dsmash' || id === 'ult' || id === 'nspec' || id === 'nspecAir') && v.f.mf % 40 < 14;
    if (glint) {
      c.save();
      c.beginPath();
      c.arc(lx[1], ey, lr[1], 0, Math.PI * 2);
      c.arc(lx[0], ey, lr[0], 0, Math.PI * 2);
      c.clip();
      c.fillStyle = 'rgba(255,255,255,0.75)';
      const sweep = ((v.f.mf % 40) / 14) * R * 1.6 - R * 0.4;
      c.beginPath();
      c.moveTo(sweep - 4, ey - R);
      c.lineTo(sweep + 6, ey - R);
      c.lineTo(sweep - 4, ey + R);
      c.lineTo(sweep - 14, ey + R);
      c.closePath();
      c.fill();
      c.restore();
    }
    c.restore();
    // beak: hooked; opens when he hoots (hurt, happy, attacking)
    const open = e === 'hurt' || e === 'ko' || e === 'happy' || (e === 'angry' && v.f.mf % 30 < 18);
    const bx = R * 0.66;
    const by = R * 0.18;
    const bc = shade(beakCol(p), -0.15);
    if (open) {
      c.beginPath();
      c.moveTo(bx - 4, by + 4);
      c.lineTo(bx + 5, by + 11);
      c.lineTo(bx + 3, by + 5);
      c.closePath();
      fillStroke(c, shade(bc, -0.2), v.ol, 2);
    }
    c.beginPath();
    c.moveTo(bx - 5, by - 3);
    c.quadraticCurveTo(bx + 6, by - 5, bx + 7, by + (open ? 3 : 9));
    c.quadraticCurveTo(bx + 2, by + (open ? 2 : 5), bx - 4, by + 4);
    c.closePath();
    fillStroke(c, bc, v.ol, 2.2);
    // the mortarboard: skullcap, tilted board, swinging tassel
    const cap = shade(p.main, -0.55);
    ellipse(c, -R * 0.08, -R * 0.74, R * 0.66, R * 0.3, 0, cap, v.ol, 2.6);
    c.beginPath();
    c.moveTo(-R * 1.12, -R * 0.98);
    c.lineTo(-R * 0.02, -R * 1.26);
    c.lineTo(R * 1.02, -R * 1.02);
    c.lineTo(-R * 0.1, -R * 0.76);
    c.closePath();
    fillStroke(c, cap, v.ol, 2.8);
    c.beginPath();
    c.moveTo(-R * 1.12, -R * 0.98);
    c.lineTo(-R * 0.1, -R * 0.76);
    c.lineTo(R * 1.02, -R * 1.02);
    c.lineTo(R * 1.02, -R * 0.94);
    c.lineTo(-R * 0.1, -R * 0.68);
    c.lineTo(-R * 1.12, -R * 0.9);
    c.closePath();
    fillStroke(c, shade(cap, -0.3), v.ol, 2);
    // tassel hangs off the back corner and sways with time and motion
    const sway = Math.sin(v.t * 0.09) * 3 - Math.max(-6, Math.min(6, v.f.vx * v.k.facing * 0.5));
    const tx = -R * 1.12 + sway;
    const ty = -R * 0.4;
    c.beginPath();
    c.moveTo(-R * 0.04, -R * 1.02);
    c.quadraticCurveTo(-R * 0.7, -R * 1.02, -R * 1.1, -R * 0.96);
    c.quadraticCurveTo(-R * 1.16, -R * 0.7, tx, ty);
    c.strokeStyle = v.ol;
    c.lineWidth = 4;
    c.stroke();
    c.strokeStyle = p.second;
    c.lineWidth = 2;
    c.stroke();
    c.beginPath();
    c.moveTo(tx - 3.5, ty - 1);
    c.lineTo(tx + 3.5, ty - 1);
    c.lineTo(tx + 4.5, ty + 9);
    c.lineTo(tx - 4.5, ty + 9);
    c.closePath();
    fillStroke(c, p.second, v.ol, 2);
    circle(c, -R * 0.04, -R * 1.02, 3, p.second, v.ol, 1.6);
  },
  hand: (c, v, x, y, front) => {
    boneFrame(c, v, [x, y], front ? v.k.ang.foreF : v.k.ang.foreB);
    wingTip(c, v, front);
    c.restore();
  },
  foot: (c, v, front) => {
    const k = v.k;
    // the robe hangs over the front thigh: redraw its skirt before the front talons
    if (front && hootArt.torso) {
      skirtOnly = true;
      hootArt.torso(c, v);
      skirtOnly = false;
    }
    const pt = front ? k.footF : k.footB;
    const phi = front ? k.ang.shF : k.ang.shB;
    boneFrame(c, v, pt, phi - 180);
    const toe = front ? shade(beakCol(v.p), -0.05) : shade(beakCol(v.p), -0.3);
    const fluff = front ? shade(v.p.skin, 0.15) : shade(v.p.skin, -0.15);
    // talons peeking out the front: three toes with dark hooked claws
    for (const [x, y, a] of [
      [11, -2, -0.35],
      [14, 0, 0.05],
      [11, 1.5, 0.45],
    ] as const) {
      c.save();
      c.translate(x, y);
      c.rotate(a);
      c.beginPath();
      c.moveTo(-2, -3);
      c.lineTo(6, -2.2);
      c.quadraticCurveTo(10, -1, 9, 3.5);
      c.quadraticCurveTo(7.5, 0.5, 5, 1.8);
      c.lineTo(-2, 2.5);
      c.closePath();
      fillStroke(c, toe, v.ol, 2);
      c.beginPath();
      c.moveTo(6.5, -1.6);
      c.quadraticCurveTo(10, -1, 9, 3.5);
      c.strokeStyle = v.ol;
      c.lineWidth = 2.6;
      c.stroke();
      c.restore();
    }
    // the fluffy feathered foot
    c.beginPath();
    c.moveTo(-7, 0);
    c.quadraticCurveTo(-9, -9, -2, -11);
    c.quadraticCurveTo(6, -12, 10, -5);
    c.quadraticCurveTo(13, -1, 9, 0);
    c.closePath();
    fillStroke(c, fluff, v.ol, 2.4);
    c.beginPath();
    c.moveTo(1, -6);
    c.lineTo(3, -3.5);
    c.lineTo(5, -6);
    c.strokeStyle = shade(fluff, -0.3);
    c.lineWidth = 1.6;
    c.stroke();
    c.restore();
  },
  weapon: (c, v) => {
    const f = v.f;
    const id = moveId(v);
    const k = v.k;
    const inHand = BOOK_MOVES.has(id) || f.act === A.TAUNT;
    if (!inHand) return;
    const casting = id === 'fsmash' || id === 'usmash' || id === 'ult' || id === 'dspec' || id === 'dspecAir' || id === 'ftilt';
    boneFrame(c, v, k.handF, k.ang.wep);
    c.translate(0, 2);
    drawBook(c, v, id !== 'jab3' && id !== 'fthrow', casting ? 1 : 0);
    if (f.act === A.TAUNT) {
      // the MY BROS chapter: a little heart on the page
      c.fillStyle = '#ff4a6e';
      c.beginPath();
      c.moveTo(-6, -11);
      c.bezierCurveTo(-11, -16, -6, -21, -6, -16);
      c.bezierCurveTo(-6, -21, -1, -16, -6, -11);
      c.fill();
    }
    c.restore();
  },
  front: (c, v) => {
    const f = v.f;
    const k = v.k;
    const p = v.p;
    const id = moveId(v);
    const s = k.scale;
    const m = f.mf;
    const fx = k.facing;
    c.save();
    c.globalAlpha = 1;
    c.lineCap = 'round';
    // Arcane Orb charging between the wings
    if ((id === 'nspec' || id === 'nspecAir') && m >= 6) {
      const ox = (k.handF[0] + k.handB[0]) / 2 + 10 * fx * s;
      const oy = (k.handF[1] + k.handB[1]) / 2;
      const rr = (7 + f.stored * 13) * s;
      c.globalCompositeOperation = 'lighter';
      circle(c, ox, oy, rr * 2.1, rgba(p.accent, 0.18), null, 0);
      circle(c, ox, oy, rr * 1.4, 'rgba(170,120,255,0.35)', null, 0);
      c.globalCompositeOperation = 'source-over';
      circle(c, ox, oy, rr, '#8a55ff', OUTLINE, 2.5);
      circle(c, ox, oy, rr * 0.62, '#e6d6ff', null, 0);
      c.save();
      c.translate(ox, oy);
      runeCircle(c, rr * 1.6, rgba(p.accent, 0.85), v.t * 0.12, 2);
      c.restore();
      if (f.stored >= 1 && v.t % 10 < 5) circle(c, ox, oy, rr * 1.9, '', '#ffffff', 2);
    }
    // Page Turner: pages fly out of the book
    if (id === 'ftilt' && m >= 7 && m <= 16) {
      const t = (m - 7) / 9;
      for (let i = 0; i < 4; i++) {
        const px = k.wep[0] + fx * (14 + t * (40 + i * 12)) * s;
        const py = k.wep[1] + (-14 + i * 9 - t * 10 * (i - 1.5)) * s;
        c.save();
        c.translate(px, py);
        c.rotate((i - 1.5) * 0.5 + t * 3 * fx);
        rrect(c, -6 * s, -4.5 * s, 12 * s, 9 * s, 1.5);
        c.globalAlpha = 1 - t * 0.7;
        fillStroke(c, '#fff8e6', OUTLINE, 1.8);
        c.restore();
      }
      c.save();
      c.translate(k.wep[0] + fx * 10 * s, k.wep[1]);
      c.scale(0.45, 1);
      c.globalAlpha = 1 - t;
      runeCircle(c, 26 * s, p.accent, t * 3, 3);
      c.restore();
    }
    // Thesis Defense: a rune circle blooms in front of the book
    if (id === 'fsmash' && m >= 13 && m <= 26) {
      const t = (m - 13) / 13;
      const cx = k.handF[0] + fx * 32 * s;
      const cy = k.handF[1] - 4 * s;
      c.save();
      c.translate(cx, cy);
      c.globalCompositeOperation = 'lighter';
      circle(c, 0, 0, (30 + t * 30) * s, rgba(p.accent, 0.35 * (1 - t)), null, 0);
      c.globalCompositeOperation = 'source-over';
      c.scale(0.42 * fx, 1);
      c.globalAlpha = 1 - t * 0.8;
      runeCircle(c, (34 + t * 16) * s, p.accent, t * 4, 4);
      c.restore();
      c.save();
      c.globalAlpha = Math.max(0, 1 - t * 1.4);
      for (let i = 0; i < 6; i++) {
        const a = (i - 2.5) * 0.28;
        const r0 = (30 + t * 50) * s;
        const r1 = r0 + 26 * s;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * r0 * fx, cy + Math.sin(a) * r0);
        c.lineTo(cx + Math.cos(a) * r1 * fx, cy + Math.sin(a) * r1);
        c.strokeStyle = '#ffffff';
        c.lineWidth = 4;
        c.stroke();
      }
      c.restore();
    }
    // Starlight Pillar
    if (id === 'usmash' && m >= 9 && m <= 22) {
      const t = (m - 9) / 13;
      const bx = k.wep[0];
      const by = k.wep[1];
      const h = (150 + t * 40) * s;
      const w = (26 + (m >= 16 && m <= 18 ? 14 : 0)) * s * (1 - t * 0.5);
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(bx, by, bx, by - h * k.grav);
      g.addColorStop(0, rgba(p.accent, 0.75));
      g.addColorStop(1, rgba(p.accent, 0));
      c.fillStyle = g;
      rrect(c, bx - w, by - (k.grav > 0 ? h : 0), w * 2, h, w);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.7)';
      rrect(c, bx - w * 0.35, by - (k.grav > 0 ? h * 0.9 : 0), w * 0.7, h * 0.9, w * 0.35);
      c.fill();
      c.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 4; i++) {
        const yy = by - ((((m * 9 + i * 37) % 140) + 10) * s) * k.grav;
        sparkle(c, bx + Math.sin(i * 2.1 + m * 0.4) * w * 0.8, yy, (4 + (i % 2) * 3) * s, '#ffffff');
      }
    }
    // Rune Quake: runes ripple out along the floor both ways
    if (id === 'dsmash' && m >= 12 && m <= 26) {
      const t = (m - 12) / 14;
      const gy = f.y;
      c.globalAlpha = 1 - t;
      for (const side of [-1, 1]) {
        const cx = f.x + side * (30 + t * 90) * s;
        c.save();
        c.translate(cx, gy);
        c.scale(1, 0.3);
        runeCircle(c, (22 + t * 26) * s, p.accent, t * 5 * side, 5);
        c.restore();
      }
      c.globalCompositeOperation = 'lighter';
      circle(c, k.wep[0], k.wep[1], (20 + t * 30) * s, rgba(p.accent, 0.4 * (1 - t)), null, 0);
    }
    // Tome Barrier: a hexagonal rune shield
    if ((id === 'dspec' || id === 'dspecAir') && m >= 3 && m <= 24) {
      const t = m < 6 ? (m - 2) / 4 : m > 20 ? (25 - m) / 5 : 1;
      const cx = k.hip[0] + 26 * fx * s;
      const cy = k.hip[1] - 40 * k.grav * s;
      const rr = 54 * s * (0.6 + 0.4 * t);
      c.save();
      c.translate(cx, cy);
      c.rotate(v.t * 0.02);
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        if (i === 0) c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
      c.fillStyle = rgba(p.accent, 0.2 * t);
      c.fill();
      c.strokeStyle = rgba(p.accent, 0.95 * t);
      c.lineWidth = 4;
      c.stroke();
      c.globalAlpha = t;
      runeCircle(c, rr * 0.62, rgba('#ffffff', 0.8), -v.t * 0.05, 2);
      c.restore();
    }
    // Blink: the vanishing point, the streak, and the reappearing burst
    if (id === 'uspec' && m >= 5 && m <= 24) {
      const sx0 = f.v[3];
      const sy0 = f.v[4] - 50 * s * k.grav;
      const cy = f.y - 50 * s * k.grav;
      if (m <= 20) {
        const t = (m - 5) / 15;
        c.save();
        c.translate(sx0, sy0);
        c.globalAlpha = 1 - t;
        c.scale(1, 0.5);
        runeCircle(c, (30 + t * 30) * s, p.accent, t * 4, 3);
        c.restore();
        for (let i = 0; i < 5; i++) {
          const a = i * 1.3 + 0.4;
          const d = (10 + t * 46) * s;
          c.save();
          c.globalAlpha = 1 - t;
          c.translate(sx0 + Math.cos(a) * d, sy0 + Math.sin(a) * d + t * 20 * s);
          c.rotate(a + t * 2);
          ellipse(c, 0, 0, 7 * s, 2.6 * s, 0, p.skin, OUTLINE, 1.6);
          c.restore();
        }
      }
      if (m >= 6 && m <= 15) {
        const t = m <= 13 ? 1 : (16 - m) / 3;
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = rgba(p.accent, 0.45 * t);
        c.lineWidth = 22 * s;
        c.beginPath();
        c.moveTo(sx0, sy0);
        c.lineTo(f.x, cy);
        c.stroke();
        c.strokeStyle = rgba('#ffffff', 0.8 * t);
        c.lineWidth = 6 * s;
        c.stroke();
        c.globalCompositeOperation = 'source-over';
        sparkle(c, f.x, cy, 14 * s * t, '#ffffff');
      }
      if (m >= 13 && m <= 22) {
        const t = (m - 13) / 9;
        c.globalAlpha = 1 - t;
        c.save();
        c.translate(f.x, cy);
        runeCircle(c, (24 + t * 40) * s, p.accent, t * 3, 4);
        c.restore();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3 + 0.3;
          sparkle(c, f.x + Math.cos(a) * (20 + t * 50) * s, cy + Math.sin(a) * (20 + t * 50) * s, 6 * s, '#ffffff');
        }
      }
    }
    // Final Exam: glowing eyes behind the spectacles and an aura while lecturing
    if (id === 'ult' && m < 100) {
      c.globalCompositeOperation = 'lighter';
      circle(c, k.neck[0], k.neck[1], (70 + Math.sin(v.t * 0.3) * 6) * s, rgba(p.accent, 0.12), null, 0);
      circle(c, k.wep[0], k.wep[1], (26 + Math.sin(v.t * 0.5) * 4) * s, rgba(p.accent, 0.35), null, 0);
    }
    // stars when happy (taunt)
    if (f.act === A.TAUNT && f.af > 14) {
      for (let i = 0; i < 3; i++) {
        const t = ((f.af - 14 + i * 12) % 36) / 36;
        sparkle(c, k.handF[0] + (i - 1) * 14 * s, k.handF[1] - (20 + t * 50) * s * k.grav, (5 - t * 3) * s, i === 1 ? '#ff6b8b' : p.accent);
      }
    }
    c.restore();
  },
};

function f_taunt(v: FView): boolean {
  return v.f.act === A.TAUNT;
}

// ---------------------------------------------------------------- projectiles

registerProjDraw('hootOrb', (c, p, r, t) => {
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 5; i > 0; i--) circle(c, p.x - p.vx * i * 1.3, p.y - p.vy * i * 1.3, r * (1 - i * 0.13), 'rgba(150,100,255,0.22)', null, 0);
  circle(c, p.x, p.y, r * 1.9, 'rgba(127,227,255,0.16)', null, 0);
  c.restore();
  c.save();
  c.translate(p.x, p.y);
  runeCircle(c, r * 1.45, 'rgba(160,240,255,0.9)', t * 0.15, 2);
  c.restore();
  circle(c, p.x, p.y, r, '#8a55ff', OUTLINE, 3);
  circle(c, p.x, p.y, r * 0.64, '#dcc8ff', null, 0);
  circle(c, p.x + r * 0.05, p.y, r * 0.3, '#ffffff', null, 0);
  sparkle(c, p.x - r * 0.35, p.y - r * 0.35, r * 0.35, '#ffffff');
});

registerProjDraw('quill', (c, p, r, t, col) => {
  const a = Math.atan2(p.vy, p.vx);
  c.save();
  c.translate(p.x, p.y);
  c.rotate(a);
  // a soft streak behind
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = col.startsWith('#') ? rgba(col, 0.35) : 'rgba(255,255,255,0.35)';
  c.lineCap = 'round';
  c.lineWidth = r * 1.2;
  c.beginPath();
  c.moveTo(-r * 2.2, 0);
  c.lineTo(-r * 5.5, 0);
  c.stroke();
  c.globalCompositeOperation = 'source-over';
  // vane
  c.beginPath();
  c.moveTo(r * 1.5, 0);
  c.quadraticCurveTo(r * 0.4, -r * 1.05, -r * 2.2, -r * 0.55);
  c.lineTo(-r * 1.6, 0);
  c.lineTo(-r * 2.2, r * 0.55);
  c.quadraticCurveTo(r * 0.4, r * 1.05, r * 1.5, 0);
  c.closePath();
  fillStroke(c, '#fff6e0', OUTLINE, 2.4);
  c.fillStyle = '#c99a6a';
  c.beginPath();
  c.moveTo(-r * 0.6, -r * 0.62);
  c.lineTo(-r * 0.2, -r * 0.72);
  c.lineTo(-r * 0.2, r * 0.72);
  c.lineTo(-r * 0.6, r * 0.62);
  c.closePath();
  c.fill();
  // shaft and glowing nib
  c.beginPath();
  c.moveTo(-r * 2.6, 0);
  c.lineTo(r * 1.9, 0);
  c.strokeStyle = '#5a3a20';
  c.lineWidth = 1.8;
  c.stroke();
  circle(c, r * 1.9, 0, r * 0.32, col.startsWith('#') ? col : '#ffffff', OUTLINE, 1.4);
  void t;
  c.restore();
});

// Final Exam: a spell circle in the sky, pulses of starlight down onto the stage, POP QUIZ!, then the pillar and an A+
registerProjDraw('exam', (c, p, r, t) => {
  void r;
  const a = p.age;
  const cx = p.x;
  const cy = p.y - 330;
  const floor = p.y + 220;
  const grow = Math.min(1, a / 18);
  const R0 = 270 * (0.15 + 0.85 * grow);
  const since = a % 9;
  const finale = a >= 84;
  c.save();
  c.globalCompositeOperation = 'lighter';
  // the beam: soft-edged, a bright core, swelling on each pulse; the finale floods the whole stage
  const beamW = finale ? 300 + (a - 84) * 70 : 90 + (9 - since) * 16;
  const k = finale ? 1 : 0.55;
  const g = c.createLinearGradient(cx - beamW / 2, 0, cx + beamW / 2, 0);
  g.addColorStop(0, 'rgba(160,110,255,0)');
  g.addColorStop(0.25, `rgba(160,110,255,${0.45 * k})`);
  g.addColorStop(0.42, `rgba(127,227,255,${0.6 * k})`);
  g.addColorStop(0.5, `rgba(255,255,255,${0.85 * k})`);
  g.addColorStop(0.58, `rgba(127,227,255,${0.6 * k})`);
  g.addColorStop(0.75, `rgba(160,110,255,${0.45 * k})`);
  g.addColorStop(1, 'rgba(160,110,255,0)');
  c.fillStyle = g;
  c.fillRect(cx - beamW / 2, cy, beamW, floor - cy + 30);
  // a glowing splash where the beam meets the floor
  c.save();
  c.translate(cx, floor);
  c.scale(1, 0.22);
  circle(c, 0, 0, beamW * 0.7, `rgba(200,170,255,${0.35 * k})`, null, 0);
  circle(c, 0, 0, beamW * 0.4, `rgba(255,255,255,${0.4 * k})`, null, 0);
  c.restore();
  // falling starlight on each pulse, across the stage
  if (a > 8 && !finale) {
    for (let i = 0; i < 9; i++) {
      const x = cx + (i - 4) * 140 + ((i * 53) % 40);
      const y = cy + 60 + ((since * 70 + i * 37) % (floor - cy));
      c.fillStyle = 'rgba(255,240,200,0.55)';
      c.fillRect(x - 3, y - 50, 6, 50);
      sparkle(c, x, y, 10, '#ffffff');
    }
  }
  // the circle (a disc seen from below)
  c.save();
  c.translate(cx, cy);
  c.scale(1, 0.36);
  circle(c, 0, 0, R0 * 1.12, `rgba(160,110,255,${0.18 + (finale ? 0.25 : 0)})`, null, 0);
  runeCircle(c, R0, 'rgba(190,240,255,0.95)', t * 0.04, 7);
  runeCircle(c, R0 * 0.5, 'rgba(255,170,250,0.9)', -t * 0.07, 5);
  c.restore();
  c.restore();
  // POP QUIZ!
  if (a < 56) {
    const sc = a < 8 ? a / 8 : 1 + Math.sin(a * 0.4) * 0.04;
    c.save();
    c.translate(cx, cy - 150);
    c.scale(sc, sc);
    c.rotate(-0.06);
    c.font = '900 92px Bungee, Impact, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 14;
    c.strokeStyle = OUTLINE;
    c.strokeText('POP QUIZ!', 0, 0);
    c.fillStyle = '#ffe14f';
    c.fillText('POP QUIZ!', 0, 0);
    c.restore();
  }
  // graded: A+
  if (a >= 88) {
    const sc = Math.min(1, (a - 88) / 5) * 1.0 + 0.4;
    c.save();
    c.translate(cx + 180, cy - 120);
    c.rotate(0.22);
    c.scale(sc, sc);
    c.beginPath();
    c.arc(0, 0, 80, 0, Math.PI * 2);
    c.lineWidth = 12;
    c.strokeStyle = '#ff3a6e';
    c.stroke();
    c.font = '900 96px Bungee, Impact, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 10;
    c.strokeStyle = OUTLINE;
    c.strokeText('A+', 0, 6);
    c.fillStyle = '#ff3a6e';
    c.fillText('A+', 0, 6);
    c.restore();
  }
});
