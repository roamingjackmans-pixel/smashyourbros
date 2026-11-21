// Drawing a rigged fighter in the bold vector cartoon style: thick dark outlines, flat colour, one shade.
// Each fighter's art file (render/fighters/<id>.ts) provides an ArtDef: palettes and the parts that make it
// look like itself (head, torso, hands, feet, weapon, back and front extras). Everything else has defaults.
import type { Fighter, Skel, State } from '../sim/types';

export interface Palette {
  main: string;
  second: string;
  accent: string;
  skin: string;
  /** optional fifth colour (hair, glow, ...) */
  extra?: string;
  name?: string;
}

export interface FView {
  st: State;
  f: Fighter;
  k: Skel;
  p: Palette;
  /** frames, for idle wobbles */
  t: number;
  expr: 'normal' | 'hurt' | 'angry' | 'happy' | 'ko' | 'focus';
  blink: boolean;
  /** 0..1 how "lit" the fighter is (hit flash) */
  flash: number;
  ol: string;
}

export interface ArtDef {
  palettes: Palette[];
  outline?: string;
  /** limb fill width (world units at scale 1) */
  limb: number;
  upperArm?: (p: Palette) => string;
  foreArm?: (p: Palette) => string;
  thigh?: (p: Palette) => string;
  shin?: (p: Palette) => string;
  handR?: number;
  footL?: number;
  /** extra draw passes (all optional) */
  back?: (c: CanvasRenderingContext2D, v: FView) => void;
  tail?: (c: CanvasRenderingContext2D, v: FView) => void;
  torso?: (c: CanvasRenderingContext2D, v: FView) => void;
  head: (c: CanvasRenderingContext2D, v: FView) => void;
  hand?: (c: CanvasRenderingContext2D, v: FView, x: number, y: number, front: boolean) => void;
  foot?: (c: CanvasRenderingContext2D, v: FView, front: boolean) => void;
  weapon?: (c: CanvasRenderingContext2D, v: FView) => void;
  front?: (c: CanvasRenderingContext2D, v: FView) => void;
  /** a little portrait for menus and the HUD (draws a head at 0,0 with radius ~40) */
  portrait?: (c: CanvasRenderingContext2D, p: Palette, t: number) => void;
}

export const OUTLINE = '#1b0f24';
export const RAD = Math.PI / 180;

// ------------------------------------------------------------------ colour helpers

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amt < 0) {
    r = Math.round(r * (1 + amt));
    g = Math.round(g * (1 + amt));
    b = Math.round(b * (1 + amt));
  } else {
    r = Math.round(r + (255 - r) * amt);
    g = Math.round(g + (255 - g) * amt);
    b = Math.round(b + (255 - b) * amt);
  }
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ------------------------------------------------------------------ primitives (world units)

/** a limb segment: outline stroke then fill stroke, round caps */
export function seg(c: CanvasRenderingContext2D, a: [number, number], b: [number, number], w: number, fill: string, ol: string, olw: number): void {
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(a[0], a[1]);
  c.lineTo(b[0], b[1]);
  c.strokeStyle = ol;
  c.lineWidth = w + olw * 2;
  c.stroke();
  c.strokeStyle = fill;
  c.lineWidth = w;
  c.stroke();
}

/** a two-segment limb drawn as one bent tube (shoulder-elbow-hand) */
export function limb(c: CanvasRenderingContext2D, a: [number, number], b: [number, number], d: [number, number], w1: number, w2: number, f1: string, f2: string, ol: string, olw: number): void {
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // outline both
  c.strokeStyle = ol;
  c.beginPath();
  c.moveTo(a[0], a[1]);
  c.lineTo(b[0], b[1]);
  c.lineWidth = w1 + olw * 2;
  c.stroke();
  c.beginPath();
  c.moveTo(b[0], b[1]);
  c.lineTo(d[0], d[1]);
  c.lineWidth = w2 + olw * 2;
  c.stroke();
  // fills
  c.strokeStyle = f2;
  c.lineWidth = w2;
  c.beginPath();
  c.moveTo(b[0], b[1]);
  c.lineTo(d[0], d[1]);
  c.stroke();
  c.strokeStyle = f1;
  c.lineWidth = w1;
  c.beginPath();
  c.moveTo(a[0], a[1]);
  c.lineTo(b[0], b[1]);
  c.stroke();
}

export function circle(c: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, ol: string | null, olw: number): void {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (ol) {
    c.strokeStyle = ol;
    c.lineWidth = olw;
    c.stroke();
  }
}

export function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, fill: string, ol: string | null, olw: number): void {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (ol) {
    c.strokeStyle = ol;
    c.lineWidth = olw;
    c.stroke();
  }
}

export function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

export function fillStroke(c: CanvasRenderingContext2D, fill: string, ol: string, olw: number): void {
  c.fillStyle = fill;
  c.fill();
  c.strokeStyle = ol;
  c.lineWidth = olw;
  c.lineJoin = 'round';
  c.stroke();
}

/**
 * Enter a bone's local frame: origin at pt, +x = the fighter's forward, -y = along the bone (phi direction).
 * Draw, then call c.restore().
 */
export function boneFrame(c: CanvasRenderingContext2D, v: FView, pt: [number, number], phi: number): void {
  c.save();
  c.translate(pt[0], pt[1]);
  c.scale(v.k.facing * v.k.scale, v.k.grav * v.k.scale);
  c.rotate(phi * RAD);
}

/** cartoon eyes facing forward; x,y = between the eyes in a head frame */
export function eyes(c: CanvasRenderingContext2D, v: FView, x: number, y: number, size: number, iris: string, opts: { gap?: number; brow?: boolean; lash?: boolean; white?: string } = {}): void {
  const gap = opts.gap ?? size * 1.15;
  const e = v.expr;
  const ol = v.ol;
  for (const s of [-1, 1]) {
    const ex = x + s * gap * 0.5 + 2;
    const ey = y;
    const back = s < 0; // the far eye is a bit smaller
    const r = size * (back ? 0.85 : 1);
    if (v.blink || e === 'ko') {
      c.beginPath();
      if (e === 'ko') {
        c.moveTo(ex - r * 0.6, ey - r * 0.6);
        c.lineTo(ex + r * 0.6, ey + r * 0.6);
        c.moveTo(ex + r * 0.6, ey - r * 0.6);
        c.lineTo(ex - r * 0.6, ey + r * 0.6);
      } else {
        c.moveTo(ex - r * 0.8, ey);
        c.quadraticCurveTo(ex, ey + r * 0.5, ex + r * 0.8, ey);
      }
      c.strokeStyle = ol;
      c.lineWidth = Math.max(2, r * 0.32);
      c.lineCap = 'round';
      c.stroke();
      continue;
    }
    if (e === 'happy') {
      c.beginPath();
      c.moveTo(ex - r * 0.8, ey + r * 0.2);
      c.quadraticCurveTo(ex, ey - r * 0.9, ex + r * 0.8, ey + r * 0.2);
      c.strokeStyle = ol;
      c.lineWidth = Math.max(2, r * 0.36);
      c.lineCap = 'round';
      c.stroke();
      continue;
    }
    const squash = e === 'hurt' ? 0.55 : 1;
    ellipse(c, ex, ey, r * 0.78, r * squash, 0, opts.white ?? '#fff', ol, Math.max(1.5, r * 0.22));
    const px = ex + r * 0.22;
    const pr = e === 'hurt' ? r * 0.22 : r * 0.42;
    circle(c, px, ey + (e === 'hurt' ? 0 : r * 0.05), pr, iris, null, 0);
    circle(c, px + pr * 0.35, ey - pr * 0.4, pr * 0.32, '#fff', null, 0);
    if (opts.brow !== false && (e === 'angry' || e === 'focus' || e === 'hurt')) {
      c.beginPath();
      const tilt = e === 'hurt' ? -0.35 : 0.45;
      c.moveTo(ex - r * 0.9, ey - r * 1.25 + s * tilt * r * 0.6 * -1);
      c.lineTo(ex + r * 0.9, ey - r * 1.25 - s * tilt * r * 0.6 * -1 * -1);
      c.strokeStyle = ol;
      c.lineWidth = Math.max(2, r * 0.34);
      c.lineCap = 'round';
      c.stroke();
    }
  }
}

/** a simple mouth: smile / grit / open "O" / grin */
export function mouth(c: CanvasRenderingContext2D, v: FView, x: number, y: number, w: number, kind?: 'smile' | 'grin' | 'o' | 'grit' | 'flat'): void {
  const e = v.expr;
  const k = kind ?? (e === 'hurt' || e === 'ko' ? 'o' : e === 'angry' || e === 'focus' ? 'grit' : e === 'happy' ? 'grin' : 'smile');
  c.lineCap = 'round';
  c.strokeStyle = v.ol;
  c.lineWidth = Math.max(2, w * 0.22);
  c.beginPath();
  if (k === 'o') {
    ellipse(c, x, y, w * 0.32, w * 0.42, 0, '#5a1a2a', v.ol, Math.max(1.5, w * 0.16));
    return;
  }
  if (k === 'grin') {
    c.moveTo(x - w * 0.5, y - w * 0.1);
    c.quadraticCurveTo(x, y + w * 0.7, x + w * 0.5, y - w * 0.1);
    c.closePath();
    c.fillStyle = '#fff';
    c.fill();
    c.stroke();
    return;
  }
  if (k === 'grit') {
    rrect(c, x - w * 0.45, y - w * 0.18, w * 0.9, w * 0.36, w * 0.12);
    c.fillStyle = '#fff';
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(x - w * 0.45, y);
    c.lineTo(x + w * 0.45, y);
    c.lineWidth = Math.max(1, w * 0.1);
    c.stroke();
    return;
  }
  if (k === 'flat') {
    c.moveTo(x - w * 0.4, y);
    c.lineTo(x + w * 0.4, y);
    c.stroke();
    return;
  }
  c.moveTo(x - w * 0.45, y - w * 0.1);
  c.quadraticCurveTo(x, y + w * 0.45, x + w * 0.45, y - w * 0.1);
  c.stroke();
}

/** a glove/fist */
export function fist(c: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, ol: string, olw: number): void {
  circle(c, x, y, r, fill, ol, olw);
  circle(c, x - r * 0.3, y - r * 0.3, r * 0.3, shade(fill, 0.45), null, 0);
}

/** a shoe at a foot, in the foot frame (call inside boneFrame of the shin rotated to "standing = 0") */
export function shoe(c: CanvasRenderingContext2D, len: number, h: number, fill: string, sole: string, ol: string, olw: number): void {
  c.beginPath();
  c.moveTo(-len * 0.35, -h);
  c.lineTo(len * 0.35, -h);
  c.quadraticCurveTo(len * 0.95, -h * 0.9, len * 0.95, 0);
  c.lineTo(-len * 0.4, 0);
  c.quadraticCurveTo(-len * 0.55, -h * 0.5, -len * 0.35, -h);
  c.closePath();
  fillStroke(c, fill, ol, olw);
  c.beginPath();
  c.moveTo(-len * 0.4, 0);
  c.lineTo(len * 0.95, 0);
  c.lineWidth = olw * 1.6;
  c.strokeStyle = sole;
  c.stroke();
}
