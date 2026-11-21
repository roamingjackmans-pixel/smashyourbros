// Button prompts drawn in code (D23, ported from DungeonJoe's ui/glyphs.ts): keyboard keycaps and Xbox, PlayStation,
// Switch and generic pad buttons. Every prompt reads the CURRENT bindings (P1's pad layout, the WASD keymap) and the
// chosen style (Settings → Controls → Button pictures; Auto follows the last device used and the pad's brand).
//   text:  glyphText(action) · formatPrompts('Pick ({menuConfirm})')
//   DOM:   glyphEl(action, size) · inputGlyphEl(button, size, style) · promptTextEl(template) · hintBar([...])
//   live elements redraw through refreshGlyphs() (called from the menu loop) when the style or bindings change.
import { defaultMenuPad, defaultPadLayout, type MenuPad, type PadAction, type PadLayout } from '../game/padLayout';
import type { PadKind } from '../game/pads';
import type { PromptStyle } from '../game/profile';

export type GlyphStyle = 'keyboard' | PadKind;
/** What a prompt can name: P1's pad actions, the sticks, and the menu buttons. */
export type GlyphAction = PadAction | 'move' | 'cstick' | 'menuConfirm' | 'menuBack' | 'menuStart' | 'menuView' | 'menuX' | 'menuY' | 'menuLB' | 'menuRB';
/** One physical input: a KeyboardEvent.code (or a label like 'WASD'), or a pad button (−1 left stick, −2 right). */
export type GlyphInput = string | number;

export const PAD_LSTICK = -1;
export const PAD_RSTICK = -2;

const GLYPH_ACTIONS: readonly GlyphAction[] = ['attack', 'special', 'jump', 'shield', 'grab', 'ult', 'taunt', 'pause', 'move', 'cstick', 'menuConfirm', 'menuBack', 'menuStart', 'menuView', 'menuX', 'menuY', 'menuLB', 'menuRB'];

// ---------------------------------------------------------------------------------------------------------------
// where settings come from (the live app registers itself; tests inject their own)

export interface GlyphSource {
  prompts(): PromptStyle;
  /** 'pad' when a controller was used last */
  device(): 'kb' | 'pad';
  /** the brand of the pad used last */
  padKind(): PadKind;
  layout(): PadLayout;
  menuPad(): MenuPad;
  /** key codes per action of the first keymap */
  keys(): Partial<Record<string, string[]>>;
  /** Nintendo pads show A on the right (labels) or positionally */
  nintendoLabels(): boolean;
}

const defaultSource: GlyphSource = {
  prompts: () => 'auto',
  device: () => 'kb',
  padKind: () => 'xbox',
  layout: () => defaultPadLayout(),
  menuPad: () => defaultMenuPad(),
  keys: () => ({}),
  nintendoLabels: () => true,
};
let source: GlyphSource = defaultSource;

export function setGlyphSource(s: GlyphSource | null): void {
  source = s ?? defaultSource;
  lastSig = '';
}

/** The resolved style: the setting, or for Auto the last device used (and the pad's brand). */
export function promptStyle(): GlyphStyle {
  const s = source.prompts();
  if (s !== 'auto') return s;
  return source.device() === 'pad' ? source.padKind() : 'keyboard';
}

/** The pad pictures to show where only pad pictures make sense (the controller settings). */
export function padStyle(): PadKind {
  const s = source.prompts();
  if (s !== 'auto' && s !== 'keyboard') return s;
  return source.padKind();
}

const KB_FIXED: Partial<Record<GlyphAction, string>> = { pause: 'Escape', move: 'WASD', menuConfirm: 'Enter', menuBack: 'Escape' };

/** The inputs bound to an action in a style (current bindings). */
export function actionInputs(action: GlyphAction, style: GlyphStyle = promptStyle()): GlyphInput[] {
  if (style === 'keyboard') {
    const f = KB_FIXED[action];
    if (f) return [f];
    if (action === 'cstick') return ['Arrows'];
    if (action.startsWith('menu')) return [];
    return [...(source.keys()[action] ?? [])];
  }
  const mp = source.menuPad();
  switch (action) {
    case 'move':
      return [PAD_LSTICK];
    case 'cstick':
      return [PAD_RSTICK];
    case 'menuConfirm':
      return [mp.confirm];
    case 'menuBack':
      return [mp.back];
    case 'menuStart':
      return [9];
    case 'menuView':
      return [8];
    case 'menuX':
      return [2];
    case 'menuY':
      return [3];
    case 'menuLB':
      return [4];
    case 'menuRB':
      return [5];
  }
  return [...source.layout().buttons[action]];
}

export function primaryInput(action: GlyphAction, style: GlyphStyle = promptStyle()): GlyphInput | null {
  return actionInputs(action, style)[0] ?? null;
}

// ---------------------------------------------------------------------------------------------------------------
// text

const PAD_TEXT: Record<PadKind, string[]> = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →', 'Guide'],
  playstation: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →', 'PS'],
  switch: ['A', 'B', 'X', 'Y', 'L', 'R', 'ZL', 'ZR', '−', '+', 'LS', 'RS', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →', 'Home'],
  generic: ['Bottom', 'Right', 'Left', 'Top', 'L1', 'R1', 'L2', 'R2', 'Select', 'Start', 'L3', 'R3', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →', 'Home'],
};
/** Switch face letters when the buttons are read by position (Nintendo labels off): bottom B, right A, left Y, top X */
const SWITCH_POSITIONAL = ['B', 'A', 'Y', 'X'];

const KEY_TEXT: Record<string, string> = {
  Space: 'Space',
  Escape: 'Esc',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Bksp',
  ShiftLeft: 'L Shift',
  ShiftRight: 'R Shift',
  ControlLeft: 'Ctrl',
  ControlRight: 'R Ctrl',
  AltLeft: 'Alt',
  AltRight: 'Alt',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
};

/** Short keycap text for a KeyboardEvent.code ('KeyE' → 'E', 'Numpad1' → 'Num 1'). */
export function keyLabel(code: string): string {
  const k = KEY_TEXT[code];
  if (k) return k;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return `Num ${code.slice(6)}`;
  return code;
}

export function padText(n: number, kind: PadKind): string {
  if (n === PAD_LSTICK) return 'Left stick';
  if (n === PAD_RSTICK) return 'Right stick';
  if (kind === 'switch' && n >= 0 && n <= 3 && !source.nintendoLabels()) return SWITCH_POSITIONAL[n];
  return PAD_TEXT[kind][n] ?? `Button ${n + 1}`;
}

export function inputText(input: GlyphInput, style: GlyphStyle = promptStyle()): string {
  if (typeof input === 'string') return keyLabel(input);
  return padText(input, style === 'keyboard' ? 'xbox' : style);
}

export function glyphText(action: GlyphAction, style: GlyphStyle = promptStyle()): string {
  const i = primaryInput(action, style);
  return i === null ? '—' : inputText(i, style);
}

const TOKEN = /\{(\w+)\}/g;
function isGlyphAction(s: string): s is GlyphAction {
  return (GLYPH_ACTIONS as readonly string[]).includes(s);
}

/** Replace {action} tokens with the current prompt text: 'Pick ({menuConfirm})' → 'Pick (A)' / 'Pick (✕)'. */
export function formatPrompts(template: string): string {
  return template.replace(TOKEN, (m, name: string) => (isGlyphAction(name) ? glyphText(name) : m));
}

type Segment = { text: string } | { action: GlyphAction };
function segments(template: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of template.matchAll(TOKEN)) {
    const name = m[1]!;
    if (!isGlyphAction(name)) continue;
    if (m.index > last) out.push({ text: template.slice(last, m.index) });
    out.push({ action: name });
    last = m.index + m[0].length;
  }
  if (last < template.length) out.push({ text: template.slice(last) });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// shapes: resolution-free primitives in a w × h box

interface Paint {
  fill?: string;
  stroke?: string;
  lw?: number;
}
export type GlyphPrim =
  | (Paint & { t: 'path'; d: string })
  | (Paint & { t: 'circle'; x: number; y: number; r: number })
  | { t: 'text'; x: number; y: number; s: string; size: number; fill: string; weight: number; stroke?: string; lw?: number }
  | { t: 'group'; dx: number; prims: GlyphPrim[] };

export interface GlyphShape {
  w: number;
  h: number;
  prims: GlyphPrim[];
  /** plain text for screen readers and tooltips */
  label: string;
}

const FONT = 'Nunito, system-ui, sans-serif';
const C = {
  outline: '#1b0f24',
  body: '#5a4a78',
  bodyDark: '#3a2a52',
  rim: 'rgba(255,255,255,0.22)',
  light: '#fff7ee',
  ink: '#1b0f24',
  accent: '#ffcf3a',
  keyFace: '#fff7ee',
  keySide: '#8a7a9a',
};
const XBOX_FACE = [
  { fill: '#4caf3e', ring: '#1f5a18', s: 'A' },
  { fill: '#e0453a', ring: '#6a1610', s: 'B' },
  { fill: '#3a7fe0', ring: '#143a7a', s: 'X' },
  { fill: '#e7b623', ring: '#6a5008', s: 'Y' },
];
/** PlayStation symbol colours: cross blue, circle red, square pink, triangle green. */
export const PS_COLORS = { cross: '#7fb2ff', circle: '#ff6a7a', square: '#f08ad0', triangle: '#4fd6a8' };

const f = (n: number): number => Math.round(n * 100) / 100;

function rr(x: number, y: number, w: number, h: number, r: number | [number, number, number, number]): string {
  const m = Math.min(w, h) / 2;
  const [a, b, c, d] = (typeof r === 'number' ? [r, r, r, r] : r).map((v) => Math.min(m, Math.max(0, v))) as [number, number, number, number];
  return (
    `M${f(x + a)},${f(y)}H${f(x + w - b)}A${f(b)},${f(b)} 0 0 1 ${f(x + w)},${f(y + b)}V${f(y + h - c)}` +
    `A${f(c)},${f(c)} 0 0 1 ${f(x + w - c)},${f(y + h)}H${f(x + d)}A${f(d)},${f(d)} 0 0 1 ${f(x)},${f(y + h - d)}` +
    `V${f(y + a)}A${f(a)},${f(a)} 0 0 1 ${f(x + a)},${f(y)}Z`
  );
}

let measureCtx: CanvasRenderingContext2D | null | undefined;
function textWidth(s: string, size: number, weight = 800): number {
  if (measureCtx === undefined) {
    measureCtx = null;
    try {
      if (typeof document !== 'undefined') measureCtx = document.createElement('canvas').getContext('2d');
    } catch {
      measureCtx = null;
    }
  }
  if (measureCtx) {
    measureCtx.font = `${weight} ${size}px ${FONT}`;
    return measureCtx.measureText(s).width;
  }
  let w = 0;
  for (const ch of s) w += /[A-Z0-9]/.test(ch) ? 0.66 : /[a-z]/.test(ch) ? 0.55 : 0.6;
  return w * size;
}

const lineW = (S: number): number => Math.max(1, S * 0.07);

function keycap(label: string, S: number): GlyphShape {
  const lw = lineW(S);
  const n = [...label].length;
  const fs = n <= 1 ? S * 0.56 : n <= 3 ? S * 0.46 : S * 0.4;
  const w = Math.max(S, textWidth(label, fs) + S * 0.55);
  const faceH = S * 0.72;
  return {
    w,
    h: S,
    label,
    prims: [
      { t: 'path', d: rr(lw / 2, lw / 2, w - lw, S - lw, S * 0.2), fill: C.keySide, stroke: C.outline, lw },
      { t: 'path', d: rr(S * 0.1, S * 0.07, w - S * 0.2, faceH, S * 0.14), fill: C.keyFace },
      { t: 'text', x: w / 2, y: S * 0.07 + faceH / 2 + S * 0.02, s: label, size: fs, fill: C.ink, weight: 800 },
    ],
  };
}

function circleButton(S: number, fill: string, stroke = C.outline): GlyphPrim {
  const lw = lineW(S);
  const r = S / 2 - lw / 2;
  return {
    t: 'group',
    dx: 0,
    prims: [
      { t: 'circle', x: S / 2, y: S / 2, r, fill, stroke, lw },
      { t: 'circle', x: S / 2, y: S / 2, r: r - lw * 0.95, stroke: C.rim, lw: lw * 0.6 },
    ],
  };
}

function letterButton(S: number, fill: string, ring: string, s: string, label: string): GlyphShape {
  const c = S / 2;
  return { w: S, h: S, label, prims: [circleButton(S, fill, ring), { t: 'text', x: c, y: c + S * 0.03, s, size: S * (s.length > 1 ? 0.42 : 0.6), fill: '#ffffff', weight: 900, stroke: 'rgba(0,0,0,0.55)', lw: S * 0.1 }] };
}

/** Generic pads: four dots in a diamond with the pressed position lit (bottom, right, left, top). */
function diamond(n: number, S: number, label: string): GlyphShape {
  const c = S / 2;
  const d = S * 0.26;
  const r = S * 0.13;
  const pos: [number, number][] = [
    [c, c + d],
    [c + d, c],
    [c - d, c],
    [c, c - d],
  ];
  return {
    w: S,
    h: S,
    label,
    prims: [circleButton(S, C.bodyDark), ...pos.map(([x, y], i): GlyphPrim => ({ t: 'circle', x, y, r, fill: i === n ? C.accent : 'rgba(255,255,255,0.25)', stroke: i === n ? C.outline : undefined, lw: lineW(S) * 0.6 }))],
  };
}

function padGlyph(n: number, kind: PadKind, S: number): GlyphShape {
  const lw = lineW(S);
  const label = padText(n, kind);
  const c = S / 2;
  if (n >= 0 && n <= 3) {
    if (kind === 'xbox') return letterButton(S, XBOX_FACE[n].fill, XBOX_FACE[n].ring, XBOX_FACE[n].s, label);
    if (kind === 'switch') return letterButton(S, '#2b2733', '#0d0b10', label, label);
    if (kind === 'generic') return diamond(n, S, label);
    const sw = S * 0.11;
    const sym: GlyphPrim[] =
      n === 0
        ? [{ t: 'path', d: `M${f(S * 0.32)},${f(S * 0.32)}L${f(S * 0.68)},${f(S * 0.68)}M${f(S * 0.68)},${f(S * 0.32)}L${f(S * 0.32)},${f(S * 0.68)}`, stroke: PS_COLORS.cross, lw: sw }]
        : n === 1
          ? [{ t: 'circle', x: c, y: c, r: S * 0.2, stroke: PS_COLORS.circle, lw: sw }]
          : n === 2
            ? [{ t: 'path', d: rr(S * 0.31, S * 0.31, S * 0.38, S * 0.38, S * 0.03), stroke: PS_COLORS.square, lw: sw }]
            : [{ t: 'path', d: `M${f(c)},${f(S * 0.27)}L${f(S * 0.735)},${f(S * 0.67)}L${f(S * 0.265)},${f(S * 0.67)}Z`, stroke: PS_COLORS.triangle, lw: sw }];
    return { w: S, h: S, label, prims: [circleButton(S, C.bodyDark), ...sym] };
  }
  if (n === 4 || n === 5) {
    const w = S * 1.7;
    const big = S * 0.36;
    const small = S * 0.12;
    const radii: [number, number, number, number] = n === 4 ? [big, small, small, small] : [small, big, small, small];
    return {
      w,
      h: S,
      label,
      prims: [
        { t: 'path', d: rr(lw / 2, S * 0.16, w - lw, S * 0.68, radii), fill: C.body, stroke: C.outline, lw },
        { t: 'path', d: `M${f(S * 0.42)},${f(S * 0.16 + lw * 1.2)}H${f(w - S * 0.42)}`, stroke: C.rim, lw: lw * 0.7 },
        { t: 'text', x: w / 2, y: S * 0.52, s: label, size: S * 0.44, fill: C.light, weight: 800 },
      ],
    };
  }
  if (n === 6 || n === 7) {
    const w = S * 1.3;
    return {
      w,
      h: S,
      label,
      prims: [
        { t: 'path', d: rr(lw / 2, lw / 2, w - lw, S - lw, [S * 0.46, S * 0.46, S * 0.16, S * 0.16]), fill: C.body, stroke: C.outline, lw },
        { t: 'path', d: `M${f(w * 0.3)},${f(S * 0.2)}H${f(w * 0.7)}`, stroke: C.rim, lw: lw * 0.8 },
        { t: 'text', x: w / 2, y: S * 0.58, s: label, size: S * (label.length > 2 ? 0.36 : 0.42), fill: C.light, weight: 800 },
      ],
    };
  }
  if (n >= 12 && n <= 15) {
    const a = S * 0.2;
    const e = S / 2 - lw / 2;
    const plus =
      `M${f(c - a)},${f(c - e)}H${f(c + a)}V${f(c - a)}H${f(c + e)}V${f(c + a)}H${f(c + a)}V${f(c + e)}` +
      `H${f(c - a)}V${f(c + a)}H${f(c - e)}V${f(c - a)}H${f(c - a)}Z`;
    const dir = n - 12; // 0 up, 1 down, 2 left, 3 right
    const ins = lw * 0.9;
    const len = e - ins * 1.2;
    const arm =
      dir === 0
        ? rr(c - a + ins, c - e + ins, 2 * a - 2 * ins, len, S * 0.04)
        : dir === 1
          ? rr(c - a + ins, c + e - ins - len, 2 * a - 2 * ins, len, S * 0.04)
          : dir === 2
            ? rr(c - e + ins, c - a + ins, len, 2 * a - 2 * ins, S * 0.04)
            : rr(c + e - ins - len, c - a + ins, len, 2 * a - 2 * ins, S * 0.04);
    return {
      w: S,
      h: S,
      label,
      prims: [
        { t: 'path', d: plus, fill: C.body, stroke: C.outline, lw },
        { t: 'path', d: arm, fill: C.light },
      ],
    };
  }
  if (n === 8 || n === 9) {
    const il = Math.max(1, S * 0.075);
    let icon: GlyphPrim[];
    if (kind === 'switch') icon = [{ t: 'text', x: c, y: c + S * 0.02, s: n === 8 ? '−' : '+', size: S * 0.62, fill: C.light, weight: 900 }];
    else if (kind === 'xbox')
      icon =
        n === 8
          ? [
              { t: 'path', d: rr(S * 0.27, S * 0.29, S * 0.3, S * 0.25, S * 0.04), stroke: C.light, lw: il },
              { t: 'path', d: rr(S * 0.43, S * 0.45, S * 0.3, S * 0.25, S * 0.04), fill: C.bodyDark, stroke: C.light, lw: il },
            ]
          : [{ t: 'path', d: `M${f(S * 0.3)},${f(S * 0.35)}H${f(S * 0.7)}M${f(S * 0.3)},${f(S * 0.5)}H${f(S * 0.7)}M${f(S * 0.3)},${f(S * 0.65)}H${f(S * 0.7)}`, stroke: C.light, lw: il }];
    else icon = [{ t: 'text', x: c, y: c + S * 0.02, s: kind === 'playstation' ? (n === 8 ? 'SHR' : 'OPT') : n === 8 ? 'SEL' : 'STA', size: S * 0.3, fill: C.light, weight: 900 }];
    return { w: S, h: S, label, prims: [circleButton(S, C.bodyDark), ...icon] };
  }
  if (n === 10 || n === 11 || n === PAD_LSTICK || n === PAD_RSTICK) {
    const left = n === 10 || n === PAD_LSTICK;
    const click = n === 10 || n === 11;
    const s = click ? (kind === 'playstation' || kind === 'generic' ? (left ? 'L3' : 'R3') : left ? 'LS' : 'RS') : left ? 'L' : 'R';
    const prims: GlyphPrim[] = [circleButton(S, C.bodyDark), { t: 'circle', x: c, y: c, r: S * 0.31, fill: '#6a5a8a', stroke: '#15101c', lw: lw * 0.7 }];
    if (!click) {
      const r0 = S * 0.4;
      const tk = S * 0.07;
      prims.push({
        t: 'path',
        d: `M${f(c - tk)},${f(c - r0 + tk)}L${f(c)},${f(c - r0)}L${f(c + tk)},${f(c - r0 + tk)}M${f(c - tk)},${f(c + r0 - tk)}L${f(c)},${f(c + r0)}L${f(c + tk)},${f(c + r0 - tk)}`,
        stroke: C.light,
        lw: Math.max(1, S * 0.06),
      });
    }
    prims.push({ t: 'text', x: c, y: c + S * 0.02, s, size: S * (s.length > 1 ? 0.34 : 0.42), fill: C.light, weight: 800 });
    return { w: S, h: S, label, prims };
  }
  const s = n === 16 ? (kind === 'playstation' ? 'PS' : kind === 'switch' ? '⌂' : 'G') : String(n + 1);
  return { w: S, h: S, label, prims: [circleButton(S, C.bodyDark), { t: 'text', x: c, y: c + S * 0.02, s, size: S * 0.42, fill: C.light, weight: 800 }] };
}

function unboundGlyph(S: number): GlyphShape {
  const lw = lineW(S);
  return {
    w: S,
    h: S,
    label: '—',
    prims: [
      { t: 'path', d: rr(lw / 2, lw / 2, S - lw, S - lw, S * 0.2), fill: '#2a1a3a', stroke: '#4a3a5a', lw },
      { t: 'text', x: S / 2, y: S / 2, s: '—', size: S * 0.5, fill: '#b9a6c8', weight: 800 },
    ],
  };
}

const shapeCache = new Map<string, GlyphShape>();

/** Build (cached) the shape for one input in a style at height `size`. null = an unbound placeholder. */
export function glyphShape(input: GlyphInput | null, style: GlyphStyle, size: number): GlyphShape {
  const S = Math.max(6, Math.round(size * 2) / 2);
  const kind: PadKind = style === 'keyboard' ? 'xbox' : style;
  const key = `${kind}|${source.nintendoLabels() ? 1 : 0}|${String(input)}|${S}`;
  const hit = shapeCache.get(key);
  if (hit) return hit;
  let shape: GlyphShape;
  if (input === null) shape = unboundGlyph(S);
  else if (typeof input === 'string') shape = keycap(keyLabel(input), S);
  else shape = padGlyph(input, kind, S);
  if (shapeCache.size > 600) shapeCache.clear();
  shapeCache.set(key, shape);
  return shape;
}

export function actionShape(action: GlyphAction, size: number, style: GlyphStyle = promptStyle()): GlyphShape {
  return glyphShape(primaryInput(action, style), style, size);
}

// ---------------------------------------------------------------------------------------------------------------
// DOM (inline SVG)

const SVG = 'http://www.w3.org/2000/svg';

function svgPrims(parent: SVGElement, prims: GlyphPrim[]): void {
  for (const p of prims) {
    let el: SVGElement;
    if (p.t === 'group') {
      el = document.createElementNS(SVG, 'g');
      el.setAttribute('transform', `translate(${f(p.dx)},0)`);
      svgPrims(el, p.prims);
    } else if (p.t === 'text') {
      el = document.createElementNS(SVG, 'text');
      el.setAttribute('x', String(f(p.x)));
      el.setAttribute('y', String(f(p.y)));
      el.setAttribute('text-anchor', 'middle');
      el.setAttribute('dominant-baseline', 'central');
      el.setAttribute('font-family', FONT);
      el.setAttribute('font-size', String(f(p.size)));
      el.setAttribute('font-weight', String(p.weight));
      el.setAttribute('fill', p.fill);
      if (p.stroke) {
        el.setAttribute('stroke', p.stroke);
        el.setAttribute('stroke-width', String(f(p.lw ?? 1)));
        el.setAttribute('stroke-linejoin', 'round');
        el.setAttribute('paint-order', 'stroke');
      }
      el.textContent = p.s;
    } else {
      if (p.t === 'circle') {
        el = document.createElementNS(SVG, 'circle');
        el.setAttribute('cx', String(f(p.x)));
        el.setAttribute('cy', String(f(p.y)));
        el.setAttribute('r', String(f(p.r)));
      } else {
        el = document.createElementNS(SVG, 'path');
        el.setAttribute('d', p.d);
      }
      el.setAttribute('fill', p.fill ?? 'none');
      if (p.stroke) {
        el.setAttribute('stroke', p.stroke);
        el.setAttribute('stroke-width', String(f(p.lw ?? 1)));
        el.setAttribute('stroke-linejoin', 'round');
        el.setAttribute('stroke-linecap', 'round');
      }
    }
    parent.appendChild(el);
  }
}

export function shapeSvg(shape: GlyphShape): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('width', String(Math.ceil(shape.w)));
  svg.setAttribute('height', String(Math.ceil(shape.h)));
  svg.setAttribute('viewBox', `0 0 ${Math.ceil(shape.w)} ${Math.ceil(shape.h)}`);
  svg.setAttribute('aria-hidden', 'true');
  svgPrims(svg, shape.prims);
  return svg;
}

function fillGlyphSpan(span: HTMLElement, shape: GlyphShape): void {
  while (span.firstChild) span.removeChild(span.firstChild);
  span.appendChild(shapeSvg(shape));
  span.setAttribute('aria-label', shape.label);
  span.title = shape.label;
}

function glyphSpan(): HTMLElement {
  const span = document.createElement('span');
  span.className = 'glyph';
  span.setAttribute('role', 'img');
  return span;
}

/** A live prompt element for an action: redraws when the style, the last device or the bindings change. */
export function glyphEl(action: GlyphAction, size = 20, style?: GlyphStyle): HTMLElement {
  const span = glyphSpan();
  span.dataset.glyphAction = action;
  span.dataset.glyphSize = String(size);
  if (style) span.dataset.glyphStyle = style;
  fillGlyphSpan(span, actionShape(action, size, style ?? promptStyle()));
  return span;
}

/** A static element for one input (the remapping screen). */
export function inputGlyphEl(input: GlyphInput | null, size = 20, style?: GlyphStyle): HTMLElement {
  const span = glyphSpan();
  const st = style ?? (typeof input === 'string' ? 'keyboard' : padStyle());
  fillGlyphSpan(span, glyphShape(input, st, size));
  return span;
}

/** Text with live inline glyphs for {action} tokens. */
export function promptTextEl(template: string, size = 16): HTMLElement {
  const el = document.createElement('span');
  el.className = 'prompt-text';
  for (const s of segments(template)) el.appendChild('text' in s ? document.createTextNode(s.text) : glyphEl(s.action, Math.round(size * 1.25)));
  return el;
}

/**
 * A row of "[glyph] label" hints. Items whose action has no input in the current style (pad-only hints on a keyboard)
 * hide themselves; the bar redraws with refreshGlyphs.
 */
export function hintBar(items: [GlyphAction, string][], size = 20): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'hint-bar';
  bar.dataset.hints = JSON.stringify(items);
  bar.dataset.hintSize = String(size);
  fillHints(bar);
  return bar;
}

function fillHints(bar: HTMLElement): void {
  const items = JSON.parse(bar.dataset.hints ?? '[]') as [GlyphAction, string][];
  const size = Number(bar.dataset.hintSize) || 20;
  while (bar.firstChild) bar.removeChild(bar.firstChild);
  const style = promptStyle();
  for (const [a, label] of items) {
    if (primaryInput(a, style) === null) continue;
    const it = document.createElement('span');
    it.className = 'hint';
    it.appendChild(glyphEl(a, size));
    it.appendChild(document.createTextNode(label));
    bar.appendChild(it);
  }
}

let lastSig = '';
let lastCheck = -1;

function signature(): string {
  return `${promptStyle()}|${padStyle()}|${source.nintendoLabels()}|${JSON.stringify([source.layout().buttons, source.menuPad(), source.keys()])}`;
}

/** Redraw live glyphs if the style, the device or the bindings changed (throttled to 5 Hz when given a clock, ms). */
export function refreshGlyphs(now?: number, force = false): void {
  if (typeof document === 'undefined') return;
  if (now !== undefined && !force) {
    if (now - lastCheck < 200 && now >= lastCheck) return;
    lastCheck = now;
  }
  const sig = signature();
  if (sig === lastSig && !force) return;
  lastSig = sig;
  document.body?.classList.toggle('prompts-pad', promptStyle() !== 'keyboard');
  for (const span of document.querySelectorAll<HTMLElement>('[data-glyph-action]')) {
    const a = span.dataset.glyphAction ?? '';
    if (!isGlyphAction(a)) continue;
    const st = span.dataset.glyphStyle as GlyphStyle | undefined;
    fillGlyphSpan(span, actionShape(a, Number(span.dataset.glyphSize) || 20, st ?? promptStyle()));
  }
  for (const bar of document.querySelectorAll<HTMLElement>('.hint-bar[data-hints]')) fillHints(bar);
}
