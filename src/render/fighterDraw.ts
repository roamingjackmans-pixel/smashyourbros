// Draws one fighter from its skeleton and its ArtDef.
import { A } from '../sim/acts';
import { fighterSkel } from '../sim/anim';
import { FIGHTERS } from '../sim/data';
import type { Fighter, RigDef, Skel, State } from '../sim/types';
import { boneFrame, circle, fillStroke, fist, limb, makeCanvas, OUTLINE, rrect, shade, shoe, type ArtDef, type FView, type Palette } from './art';
import { artFor } from './fighters';

export interface DrawOpts {
  palette: number;
  /** team / player colour for tags and shields */
  tint: string;
  alpha?: number;
  /** skip the hitlag shake etc. (menus) */
  still?: boolean;
  skel?: Skel;
  /** solid black (locked roster tiles) */
  silhouette?: boolean;
}

export function expressionOf(f: Fighter): FView['expr'] {
  switch (f.act) {
    case A.HITSTUN:
    case A.DIZZY:
    case A.GRABBED:
    case A.TRAPPED:
    case A.FROZEN:
      return 'hurt';
    case A.DOWN:
      return f.af < 20 ? 'hurt' : 'normal';
    case A.TAUNT:
    case A.RESPAWN:
      return 'happy';
    case A.MOVE:
    case A.HOLD:
    case A.SHIELD:
      return 'angry';
    case A.DASH:
    case A.RUN:
    case A.HELPLESS:
      return 'focus';
  }
  return 'normal';
}

export function fighterView(st: State, f: Fighter, k: Skel, p: Palette, t: number): FView {
  return {
    st,
    f,
    k,
    p,
    t,
    expr: expressionOf(f),
    blink: t > 20 && (t + f.i * 37) % 200 < 7,
    flash: f.hitlag > 0 && f.hurtFx > 0 ? 1 : 0,
    ol: OUTLINE,
  };
}

/** default torso: a rounded body capsule along the spine */
export function defaultTorso(c: CanvasRenderingContext2D, v: FView, rig: RigDef, fill: string, belt?: string): void {
  boneFrame(c, v, v.k.hip, v.k.ang.torso);
  const L = rig.torso;
  const g = rig.girth;
  rrect(c, -g, -L - g * 0.35, g * 2, L + g * 0.8, g * 0.95);
  fillStroke(c, fill, v.ol, 3.2);
  // shade on the back half
  c.save();
  c.clip();
  c.fillStyle = shade(fill, -0.18);
  c.fillRect(-g * 1.2, -L - g, g * 0.7, L + g * 2);
  c.restore();
  if (belt) {
    c.fillStyle = belt;
    c.fillRect(-g + 1, -g * 0.15, g * 2 - 2, g * 0.45);
    c.strokeStyle = v.ol;
    c.lineWidth = 2;
    c.strokeRect(-g + 1, -g * 0.15, g * 2 - 2, g * 0.45);
  }
  c.restore();
}

export function drawFighter(c: CanvasRenderingContext2D, st: State, f: Fighter, o: DrawOpts, t: number): Skel {
  const cf = FIGHTERS[f.def];
  const art = artFor(cf.def.id);
  const k = o.skel ?? fighterSkel(st, f, cf);
  const p = art.palettes[o.palette % art.palettes.length];
  const v = fighterView(st, f, k, p, t);
  const rig = cf.def.rig;
  const s = k.scale;
  const olw = 3.2 * s;
  c.save();
  // hitlag shake for the one who got hit
  if (!o.still && f.hitlag > 0 && f.lSpd > 0) c.translate(((t % 2) * 2 - 1) * 3.5 * s, 0);
  let alpha = o.alpha ?? 1;
  if (!o.still && f.invinc > 0 && f.act !== A.RESPAWN) alpha *= 0.55 + 0.45 * (t % 8 < 4 ? 1 : 0);
  c.globalAlpha = alpha;
  // squash and stretch around the feet
  if (k.sx !== 1 || k.sy !== 1) {
    c.translate(f.x, f.y);
    c.scale(k.sx || 1, k.sy || 1);
    c.translate(-f.x, -f.y);
  }
  // hit flash, star power, frozen, locked silhouettes: a colour wash over the fighter only. These used canvas
  // `filter`, which in Chrome renders every path drawn under it through its own full-canvas layer: one flashing
  // fighter cost up to a second of GPU time on an integrated GPU (D22).
  const wash = o.silhouette ? SILHOUETTE : v.flash > 0 ? FLASH : f.starT > 0 ? { col: `hsl(${(t * 18) % 360},100%,62%)`, a: 0.5 } : f.frozenT > 0 ? FROZEN : null;
  if (wash) drawWashed(c, v, art, rig, s, olw, wash);
  else drawBody(c, v, art, rig, s, olw);

  c.restore();
  return k;
}

interface Wash {
  col: string;
  a: number;
}
const FLASH: Wash = { col: '#ffffff', a: 0.72 };
const FROZEN: Wash = { col: '#9fe6ff', a: 0.5 };
const SILHOUETTE: Wash = { col: '#000000', a: 1 };

let layer: HTMLCanvasElement | null = null;
let layerCtx: CanvasRenderingContext2D | null = null;

/** draw the body into a scratch canvas the size of its on-screen box, wash it with a colour, then stamp it */
function drawWashed(c: CanvasRenderingContext2D, v: FView, art: ArtDef, rig: RigDef, s: number, olw: number, wash: Wash): void {
  const k = v.k;
  const pts = [k.hip, k.neck, k.head, k.handF, k.handB, k.footF, k.footB, k.wep, k.tail];
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    if (!p) continue;
    x0 = Math.min(x0, p[0]);
    x1 = Math.max(x1, p[0]);
    y0 = Math.min(y0, p[1]);
    y1 = Math.max(y1, p[1]);
  }
  const pad = (rig.head * 2 * (k.hs ?? 1) + 70) * s;
  x0 -= pad;
  y0 -= pad;
  x1 += pad;
  y1 += pad;
  // the box in device pixels (any camera rotation included)
  const m = c.getTransform();
  let dx0 = Infinity;
  let dy0 = Infinity;
  let dx1 = -Infinity;
  let dy1 = -Infinity;
  for (const [px, py] of [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
  ]) {
    const X = m.a * px + m.c * py + m.e;
    const Y = m.b * px + m.d * py + m.f;
    dx0 = Math.min(dx0, X);
    dx1 = Math.max(dx1, X);
    dy0 = Math.min(dy0, Y);
    dy1 = Math.max(dy1, Y);
  }
  const cw = c.canvas.width;
  const ch = c.canvas.height;
  const bx = Math.max(0, Math.floor(dx0));
  const by = Math.max(0, Math.floor(dy0));
  const bw = Math.min(cw, Math.ceil(dx1)) - bx;
  const bh = Math.min(ch, Math.ceil(dy1)) - by;
  if (bw <= 0 || bh <= 0) return;
  if (!layer || layer.width < bw || layer.height < bh) {
    layer = makeCanvas(Math.max(bw, layer?.width ?? 0), Math.max(bh, layer?.height ?? 0));
    layerCtx = layer.getContext('2d');
  }
  const L = layerCtx;
  if (!L) return drawBody(c, v, art, rig, s, olw);
  L.setTransform(1, 0, 0, 1, 0, 0);
  L.globalAlpha = 1;
  L.globalCompositeOperation = 'source-over';
  L.clearRect(0, 0, bw, bh);
  L.setTransform(m.a, m.b, m.c, m.d, m.e - bx, m.f - by);
  drawBody(L, v, art, rig, s, olw);
  L.setTransform(1, 0, 0, 1, 0, 0);
  L.globalCompositeOperation = 'source-atop';
  L.globalAlpha = wash.a;
  L.fillStyle = wash.col;
  L.fillRect(0, 0, bw, bh);
  L.globalCompositeOperation = 'source-over';
  L.globalAlpha = 1;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(layer!, 0, 0, bw, bh, bx, by, bw, bh);
  c.restore();
}

function drawBody(c: CanvasRenderingContext2D, v: FView, art: ArtDef, rig: RigDef, s: number, olw: number): void {
  const k = v.k;
  const p = v.p;
  const w = art.limb * s;
  const ua = art.upperArm?.(p) ?? p.main;
  const fa = art.foreArm?.(p) ?? p.main;
  const th = art.thigh?.(p) ?? p.main;
  const sh = art.shin?.(p) ?? p.second;
  const dark = (col: string): string => shade(col, -0.22);
  art.back?.(c, v);
  // back arm
  limb(c, k.shoulder, k.elbowB, k.handB, w, w * 0.92, dark(ua), dark(fa), v.ol, olw);
  if (art.hand) art.hand(c, v, k.handB[0], k.handB[1], false);
  else fist(c, k.handB[0], k.handB[1], (art.handR ?? 8) * s, dark(p.second), v.ol, olw * 0.8);
  // back leg
  limb(c, k.hip, k.kneeB, k.footB, w * 1.12, w, dark(th), dark(sh), v.ol, olw);
  if (art.foot) art.foot(c, v, false);
  else defaultFoot(c, v, false, art, dark(p.second));
  art.tail?.(c, v);
  // torso
  if (art.torso) art.torso(c, v);
  else defaultTorso(c, v, rig, p.main);
  // front leg
  limb(c, k.hip, k.kneeF, k.footF, w * 1.12, w, th, sh, v.ol, olw);
  if (art.foot) art.foot(c, v, true);
  else defaultFoot(c, v, true, art, p.second);
  // head
  boneFrame(c, v, k.head, k.ang.head);
  if (k.hs) c.scale(k.hs, k.hs);
  art.head(c, v);
  c.restore();
  // weapon then front arm
  art.weapon?.(c, v);
  limb(c, k.shoulder, k.elbowF, k.handF, w, w * 0.92, ua, fa, v.ol, olw);
  if (art.hand) art.hand(c, v, k.handF[0], k.handF[1], true);
  else fist(c, k.handF[0], k.handF[1], (art.handR ?? 8) * s, p.second, v.ol, olw * 0.8);
  art.front?.(c, v);
}

export function defaultFoot(c: CanvasRenderingContext2D, v: FView, front: boolean, art: ArtDef, col: string): void {
  const k = v.k;
  const pt = front ? k.footF : k.footB;
  const phi = front ? k.ang.shF : k.ang.shB;
  boneFrame(c, v, pt, phi - 180);
  shoe(c, art.footL ?? 18, 9, col, shade(col, -0.4), v.ol, 2.6);
  c.restore();
}

/** shield bubble */
export function drawShield(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, t: number): void {
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, col.replace(')', ',0.28)').replace('rgb(', 'rgba('));
  g.addColorStop(1, col.replace(')', ',0.6)').replace('rgb(', 'rgba('));
  c.beginPath();
  c.arc(x, y, r * (1 + 0.02 * Math.sin(t * 0.3)), 0, Math.PI * 2);
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 3;
  c.strokeStyle = col.replace(')', ',0.9)').replace('rgb(', 'rgba(');
  c.stroke();
  circle(c, x - r * 0.4, y - r * 0.45, r * 0.16, 'rgba(255,255,255,0.7)', null, 0);
}
