// Local controls: keyboards and gamepads, turned into one packed input int per player per frame (pack() in
// sim/input.ts: the deterministic sim and the rollback netcode only ever see that int). Gamepads are read by
// game/pads.ts and laid out per player port by game/padLayout.ts (D23).
import { B_ATTACK, B_GRAB, B_JUMP, B_SHIELD, B_SPECIAL, B_TAUNT, B_ULT, C_DOWN, C_LEFT, C_NONE, C_RIGHT, C_UP, NEUTRAL, pack } from '../sim/input';
import { defaultPadLayout, PORTS, type PadAction, type PadLayout } from './padLayout';
import { getPad, lastActivePad, padList, pollPads, type PadState } from './pads';

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
const DEFAULT_KEYMAPS: KeyMap[] = KEYMAPS.map((m) => ({ name: m.name, keys: { ...m.keys } }));

const down = new Set<string>();
/** when each key was last pressed: a tap shorter than a frame still counts for 45 ms */
const tapped = new Map<string, number>();
const LATCH_MS = 45;
let attached = false;
let blurred = false;
/** which kind of device was used last (button prompts, who P1 is on the character picker) */
let lastKind: 'kb' | 'pad' = 'kb';
let kbAt = -1e9;

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : 0);

export function attachKeyboard(): void {
  if (attached) return;
  attached = true;
  window.addEventListener('keydown', (e) => {
    // a pad's Back sends a synthetic Escape (ui/menuPad.ts): that's not the keyboard being used
    if (!e.isTrusted) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (!down.has(e.code)) tapped.set(e.code, now());
    down.add(e.code);
    lastKind = 'kb';
    kbAt = now();
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener(
    'mousedown',
    () => {
      lastKind = 'kb';
      kbAt = now();
    },
    { passive: true },
  );
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

/** 'pad' when a controller was the last thing used, else 'kb' (keyboard or mouse) */
export function lastInputKind(): 'kb' | 'pad' {
  const p = lastActivePad();
  if (p && p.activeAt > kbAt) return 'pad';
  return lastKind === 'pad' ? 'pad' : 'kb';
}

/** ms since a key was pressed or the mouse clicked */
export function keyboardIdleMs(): number {
  return now() - kbAt;
}

export interface Device {
  kind: 'kb' | 'pad';
  /** keymap index, or the gamepad's index (Gamepad.index; 98 = Steam Controller) */
  index: number;
  tapJump: boolean;
  /** which player port's controller layout a pad uses (0–3); defaults to 0 */
  port?: number;
}

function anyKey(map: KeyMap, a: Action): boolean {
  const ks = map.keys[a];
  if (!ks) return false;
  const t = now();
  for (const k of ks) if (down.has(k) || t - (tapped.get(k) ?? -1e9) < LATCH_MS) return true;
  return false;
}

/** custom key bindings saved by the settings screen override the defaults */
export function setCustomKeys(i: number, keys: Partial<Record<Action, string[]>>): void {
  if (KEYMAPS[i]) KEYMAPS[i] = { ...KEYMAPS[i], keys: { ...KEYMAPS[i].keys, ...keys } };
}
export function resetKeymaps(): void {
  DEFAULT_KEYMAPS.forEach((m, i) => (KEYMAPS[i] = { name: m.name, keys: { ...m.keys } }));
}
export function defaultKeymap(i: number): KeyMap {
  return DEFAULT_KEYMAPS[i] ?? DEFAULT_KEYMAPS[0];
}

// ------------------------------------------------------------------ pad layouts

let layouts: PadLayout[] = Array.from({ length: PORTS }, () => defaultPadLayout());
let kbTapJump = false;

/** the profile's per-port layouts and the keyboard tap-jump setting (session.applySettings) */
export function setControlSettings(pads: PadLayout[], tapJumpKb: boolean): void {
  layouts = pads;
  kbTapJump = tapJumpKb;
}

export function padLayout(port: number): PadLayout {
  return layouts[Math.max(0, Math.min(PORTS - 1, port | 0))] ?? defaultPadLayout();
}

/** tap jump for a device (the match config carries it into the sim) */
export function deviceTapJump(d: Device | null | undefined): boolean {
  if (!d) return false;
  return d.kind === 'pad' ? padLayout(d.port ?? 0).tapJump : kbTapJump;
}

/** the device a player port starts with: the pad that was used last, else the keyboard */
export function defaultDevice(port = 0): Device {
  pollPads();
  const p = lastActivePad();
  if (p && lastInputKind() === 'pad') return { kind: 'pad', index: p.index, port, tapJump: padLayout(port).tapJump };
  return { kind: 'kb', index: 0, port, tapJump: kbTapJump };
}

function radial(x: number, y: number, dz: number): [number, number] {
  const m = Math.sqrt(x * x + y * y);
  if (m < dz) return [0, 0];
  const s = Math.min(1, (m - dz) / (1 - dz)) / m;
  return [x * s, y * s];
}

/** the right stick's direction in world terms (stick up = C_UP), or C_NONE */
function stickDir(x: number, yUp: number, threshold: number): number {
  if (Math.abs(x) < threshold && Math.abs(yUp) < threshold) return C_NONE;
  if (Math.abs(yUp) >= Math.abs(x)) return yUp > 0 ? C_UP : C_DOWN;
  return x > 0 ? C_RIGHT : C_LEFT;
}

/** a right-stick flick in tilt / specials mode: the move's direction and button, held for a few frames */
const pulses = new Map<string, { dir: number; left: number; prevDir: number }>();
const PULSE_FRAMES = 3;

function held(p: PadState, L: PadLayout, a: PadAction): boolean {
  for (const b of L.buttons[a]) if (p.down[b]) return true;
  return false;
}

function bound(L: PadLayout, b: number): boolean {
  for (const a in L.buttons) if (L.buttons[a as PadAction].includes(b)) return true;
  return false;
}

/** one pad, one frame, as the packed int (`key` keeps a right-stick flick going across frames) */
export function readPad(p: PadState, L: PadLayout, key: string): number {
  let [x, y] = radial(p.axes[0], -p.axes[1], L.deadzone);
  // the D-pad moves, unless its buttons are bound to something
  if (p.down[14] && !bound(L, 14)) x = -1;
  if (p.down[15] && !bound(L, 15)) x = 1;
  if (p.down[12] && !bound(L, 12)) y = 1;
  if (p.down[13] && !bound(L, 13)) y = -1;
  let b = 0;
  if (held(p, L, 'attack')) b |= B_ATTACK;
  if (held(p, L, 'special')) b |= B_SPECIAL;
  if (held(p, L, 'jump')) b |= B_JUMP;
  if (held(p, L, 'shield')) b |= B_SHIELD;
  if (held(p, L, 'grab')) b |= B_GRAB;
  if (held(p, L, 'taunt')) b |= B_TAUNT;
  if (held(p, L, 'ult')) b |= B_ULT;
  // the right stick
  const dir = stickDir(p.axes[2], -p.axes[3], 0.55);
  let c = C_NONE;
  if (L.cstick === 'smash') c = dir;
  else if (L.cstick === 'tilt' || L.cstick === 'special') {
    // a flick reads as "this direction + Attack" (a tilt: kept under the smash and tap-jump thresholds) or
    // "this direction + Special"
    let pu = pulses.get(key);
    if (!pu) pulses.set(key, (pu = { dir: C_NONE, left: 0, prevDir: C_NONE }));
    if (dir !== C_NONE && dir !== pu.prevDir) {
      pu.dir = dir;
      pu.left = PULSE_FRAMES;
    }
    pu.prevDir = dir;
    if (pu.left > 0) {
      pu.left--;
      const m = L.cstick === 'tilt' ? 0.52 : 0.75;
      x = pu.dir === C_RIGHT ? m : pu.dir === C_LEFT ? -m : 0;
      y = pu.dir === C_UP ? m : pu.dir === C_DOWN ? -m : 0;
      b |= L.cstick === 'tilt' ? B_ATTACK : B_SPECIAL;
    }
  }
  return pack(x * 100, y * 100, b, c);
}

export function readDevice(d: Device): number {
  if (blurred) return NEUTRAL;
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
  pollPads();
  const p = getPad(d.index);
  if (!p) return NEUTRAL;
  const port = d.port ?? 0;
  return readPad(p, padLayout(port), `${d.index}:${port}`);
}

/** connected gamepads (indices) */
export function pads(): number[] {
  pollPads();
  return padList().map((p) => p.index);
}

/** did this device press its Pause button this frame (local matches) */
export function pausePressed(d: Device | null): boolean {
  if (!d || d.kind === 'kb') return false;
  const p = getPad(d.index);
  if (!p) return false;
  for (const b of padLayout(d.port ?? 0).buttons.pause) if (p.down[b] && !p.prev[b]) return true;
  return false;
}
