// Local controls: keyboards and gamepads, turned into one packed input int per player per frame.
import { B_ATTACK, B_GRAB, B_JUMP, B_SHIELD, B_SPECIAL, B_TAUNT, B_ULT, C_DOWN, C_LEFT, C_NONE, C_RIGHT, C_UP, pack } from '../sim/input';

export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack' | 'special' | 'shield' | 'grab' | 'taunt' | 'ult' | 'walk' | 'cUp' | 'cDown' | 'cLeft' | 'cRight';

export interface KeyMap {
  name: string;
  keys: Partial<Record<Action, string[]>>;
}

export const KEYMAPS: KeyMap[] = [
  {
    name: 'Keyboard (WASD)',
    keys: {
      left: ['KeyA'],
      right: ['KeyD'],
      up: ['KeyW'],
      down: ['KeyS'],
      jump: ['Space'],
      attack: ['KeyJ'],
      special: ['KeyK'],
      shield: ['KeyL', 'ShiftRight'],
      grab: ['KeyI', 'Semicolon'],
      taunt: ['KeyT'],
      ult: ['KeyO'],
      walk: ['ShiftLeft'],
      cUp: ['ArrowUp'],
      cDown: ['ArrowDown'],
      cLeft: ['ArrowLeft'],
      cRight: ['ArrowRight'],
    },
  },
  {
    name: 'Keyboard (arrows + numpad)',
    keys: {
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
      up: ['ArrowUp'],
      down: ['ArrowDown'],
      jump: ['Numpad0', 'ControlRight'],
      attack: ['Numpad1', 'Comma'],
      special: ['Numpad2', 'Period'],
      shield: ['Numpad3', 'Slash'],
      grab: ['Numpad4', 'Quote'],
      taunt: ['Numpad9'],
      ult: ['Numpad6'],
      walk: ['Numpad5'],
    },
  },
];

const down = new Set<string>();
/** when each key was last pressed: a tap shorter than a frame still counts for 45 ms */
const tapped = new Map<string, number>();
const LATCH_MS = 45;
let attached = false;
let blurred = false;

export function attachKeyboard(): void {
  if (attached) return;
  attached = true;
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (!down.has(e.code)) tapped.set(e.code, performance.now());
    down.add(e.code);
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener('blur', () => {
    down.clear();
    tapped.clear();
    blurred = true;
  });
  window.addEventListener('focus', () => (blurred = false));
}

export function keyDown(code: string): boolean {
  return down.has(code);
}

export interface Device {
  kind: 'kb' | 'pad';
  /** keymap index, or gamepad index */
  index: number;
  tapJump: boolean;
}

function anyKey(map: KeyMap, a: Action): boolean {
  const ks = map.keys[a];
  if (!ks) return false;
  const now = performance.now();
  for (const k of ks) if (down.has(k) || now - (tapped.get(k) ?? -1e9) < LATCH_MS) return true;
  return false;
}

/** custom key bindings saved by the settings screen override the defaults */
export function setCustomKeys(i: number, keys: Partial<Record<Action, string[]>>): void {
  if (KEYMAPS[i]) KEYMAPS[i] = { ...KEYMAPS[i], keys: { ...KEYMAPS[i].keys, ...keys } };
}

export function readDevice(d: Device): number {
  if (blurred) return pack(0, 0, 0, 0);
  if (d.kind === 'kb') {
    const m = KEYMAPS[d.index] ?? KEYMAPS[0];
    let x = (anyKey(m, 'right') ? 100 : 0) - (anyKey(m, 'left') ? 100 : 0);
    let y = (anyKey(m, 'up') ? 100 : 0) - (anyKey(m, 'down') ? 100 : 0);
    if (anyKey(m, 'walk')) {
      x = Math.round(x * 0.45);
      y = Math.round(y * 0.45);
    }
    let b = 0;
    if (anyKey(m, 'attack')) b |= B_ATTACK;
    if (anyKey(m, 'special')) b |= B_SPECIAL;
    if (anyKey(m, 'jump')) b |= B_JUMP;
    if (anyKey(m, 'shield')) b |= B_SHIELD;
    if (anyKey(m, 'grab')) b |= B_GRAB;
    if (anyKey(m, 'taunt')) b |= B_TAUNT;
    if (anyKey(m, 'ult')) b |= B_ULT;
    let c = C_NONE;
    if (anyKey(m, 'cUp')) c = C_UP;
    else if (anyKey(m, 'cDown')) c = C_DOWN;
    else if (anyKey(m, 'cLeft')) c = C_LEFT;
    else if (anyKey(m, 'cRight')) c = C_RIGHT;
    return pack(x, y, b, c);
  }
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const g = pads[d.index];
  if (!g) return pack(0, 0, 0, 0);
  const ax = (i: number): number => g.axes[i] ?? 0;
  const bt = (i: number): boolean => !!g.buttons[i]?.pressed || (g.buttons[i]?.value ?? 0) > 0.5;
  let x = ax(0);
  let y = -ax(1);
  // d-pad overrides the stick
  if (bt(14)) x = -1;
  if (bt(15)) x = 1;
  if (bt(12)) y = 1;
  if (bt(13)) y = -1;
  const mag = Math.sqrt(x * x + y * y);
  if (mag < 0.2) {
    x = 0;
    y = 0;
  }
  let b = 0;
  if (bt(0)) b |= B_ATTACK;
  if (bt(1)) b |= B_SPECIAL;
  if (bt(2) || bt(3)) b |= B_JUMP;
  if (bt(5) || bt(7)) b |= B_SHIELD;
  if (bt(4) || bt(6)) b |= B_GRAB;
  if (bt(8)) b |= B_TAUNT;
  if (bt(10) || bt(11)) b |= B_ULT;
  // right stick = smash stick
  const cx = ax(2);
  const cy = -ax(3);
  let c = C_NONE;
  if (Math.abs(cx) > 0.55 || Math.abs(cy) > 0.55) {
    if (Math.abs(cy) >= Math.abs(cx)) c = cy > 0 ? C_UP : C_DOWN;
    else c = cx > 0 ? C_RIGHT : C_LEFT;
  }
  return pack(x * 100, y * 100, b, c);
}

/** connected gamepads (indices) */
export function pads(): number[] {
  const out: number[] = [];
  const ps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < ps.length; i++) if (ps[i]) out.push(i);
  return out;
}

/** menu navigation from any device: returns 'up' | 'down' | 'left' | 'right' | 'ok' | 'back' | null (edge-triggered) */
const menuPrev = new Map<string, boolean>();
export function menuPress(): string | null {
  const now = new Map<string, boolean>();
  const ps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const g of ps) {
    if (!g) continue;
    const ax = g.axes[0] ?? 0;
    const ay = g.axes[1] ?? 0;
    now.set('left', (now.get('left') ?? false) || ax < -0.6 || !!g.buttons[14]?.pressed);
    now.set('right', (now.get('right') ?? false) || ax > 0.6 || !!g.buttons[15]?.pressed);
    now.set('up', (now.get('up') ?? false) || ay < -0.6 || !!g.buttons[12]?.pressed);
    now.set('down', (now.get('down') ?? false) || ay > 0.6 || !!g.buttons[13]?.pressed);
    now.set('ok', (now.get('ok') ?? false) || !!g.buttons[0]?.pressed || !!g.buttons[9]?.pressed);
    now.set('back', (now.get('back') ?? false) || !!g.buttons[1]?.pressed);
  }
  let hit: string | null = null;
  for (const [k, v] of now) {
    if (v && !menuPrev.get(k)) hit = k;
    menuPrev.set(k, v);
  }
  return hit;
}
