// Gamepads (D23, after DungeonJoe's input manager): every connected controller is read once per animation frame into
// the standard layout (buttons 0–16, two sticks) with its brand for button prompts. Xbox and other XInput pads,
// PlayStation, Switch Pro / Joy-Con, generic and non-standard pads (a hat switch becomes the D-pad), and a Steam
// Controller over WebHID all look the same to the rest of the game. Also: hot-plug notices, edge detection for menus,
// and rumble.
import { STEAM_PAD_INDEX, steamGamepad } from './steamController';

export type PadKind = 'xbox' | 'playstation' | 'switch' | 'generic';

/** standard-layout buttons read (0–15 plus 16 = Guide / PS / Home) */
export const PAD_BUTTONS = 17;
/** buttons the remapping screen may bind (0–15) */
export const BINDABLE_BUTTONS = 16;
export const TRIGGER_THRESHOLD = 0.35;

/** Gamepad.id → which button pictures it wants. */
export function padKindFromId(id: string): PadKind {
  // "Xbox Wireless Controller" must not read as Sony's "Wireless Controller"; Steam's virtual pads are Xbox pads
  if (/xbox|xinput|045e|steam/i.test(id)) return 'xbox';
  if (/057e|nintendo|pro controller|joy-?con|switch/i.test(id)) return 'switch';
  if (/054c|playstation|dualsense|dualshock|wireless controller|\bps[345]\b/i.test(id)) return 'playstation';
  return 'generic';
}

/** a short name for menus: "Xbox pad", "DualSense", "Switch Pro", "Pad" */
export function padModel(id: string): string {
  if (/steam controller/i.test(id)) return 'Steam Controller';
  if (/dualsense|0ce6|0df2/i.test(id)) return 'DualSense';
  if (/dualshock|054c/i.test(id)) return 'DualShock';
  if (/joy-?con/i.test(id)) return 'Joy-Con';
  if (/pro controller|057e/i.test(id)) return 'Switch Pro';
  if (/xbox|xinput|045e/i.test(id)) return 'Xbox pad';
  if (/8bitdo|2dc8/i.test(id)) return '8BitDo';
  return 'Pad';
}

export interface Normalized {
  /** button values 0..1 in the standard layout */
  b: number[];
  /** left x, left y, right x, right y (−1..1, y down) */
  a: [number, number, number, number];
  standard: boolean;
}

/** A POV hat as browsers report it in one axis: 8 steps from −1 (up) clockwise, anything past ±1 = centred. */
export function hatToDpad(v: number): [boolean, boolean, boolean, boolean] {
  if (!(Math.abs(v) <= 1.05)) return [false, false, false, false];
  const i = (Math.round(((v + 1) * 7) / 2) + 8) % 8; // 0 up, 1 up-right, 2 right … 7 up-left
  return [i === 7 || i === 0 || i === 1, i >= 3 && i <= 5, i >= 5 && i <= 7, i >= 1 && i <= 3];
}

/**
 * Any pad in the standard layout. A pad the browser already maps ("standard") passes through. Otherwise buttons keep
 * their own numbers (the remapping screen sorts out which is which), the D-pad comes from a hat axis or the buttons
 * after the first twelve, and the right stick from axes 2/5 (DirectInput's Z/Rz) on pads with six or more axes.
 */
export function normalizePad(gp: Pick<Gamepad, 'id' | 'mapping' | 'buttons' | 'axes'>): Normalized {
  const b = new Array<number>(PAD_BUTTONS).fill(0);
  const val = (i: number): number => {
    const x = gp.buttons[i];
    if (!x) return 0;
    return Math.max(typeof x.value === 'number' ? x.value : 0, x.pressed ? 1 : 0);
  };
  const ax = (i: number): number => {
    const v = gp.axes[i] ?? 0;
    return Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0;
  };
  if (gp.mapping === 'standard') {
    for (let i = 0; i < PAD_BUTTONS; i++) b[i] = val(i);
    return { b, a: [ax(0), ax(1), ax(2), ax(3)], standard: true };
  }
  const n = gp.buttons.length;
  for (let i = 0; i < Math.min(n, 12); i++) b[i] = val(i);
  if (n >= 16) for (let i = 12; i < 16; i++) b[i] = val(i);
  if (n >= 17) b[16] = val(16);
  // a hat switch: Chrome puts it in axis 9; Firefox gives the D-pad as axes 6/7 on some pads
  const axes = gp.axes;
  let hat: [boolean, boolean, boolean, boolean] | null = null;
  if (axes.length >= 10) hat = hatToDpad(axes[9] ?? 9);
  else if (axes.length >= 8 && axes.length < 10) {
    const hx = axes[6] ?? 0;
    const hy = axes[7] ?? 0;
    if (Math.abs(hx) === 1 || Math.abs(hy) === 1 || (hx === 0 && hy === 0)) hat = [hy < -0.5, hy > 0.5, hx < -0.5, hx > 0.5];
  }
  if (hat) for (let k = 0; k < 4; k++) if (hat[k]) b[12 + k] = 1;
  const right: [number, number] = axes.length >= 6 ? [ax(2), ax(5)] : [ax(2), ax(3)];
  return { b, a: [ax(0), ax(1), right[0], right[1]], standard: false };
}

export interface PadState {
  /** Gamepad.index (98 for the Steam Controller) */
  index: number;
  id: string;
  kind: PadKind;
  model: string;
  standard: boolean;
  /** button values and pressed state in the game's layout (Nintendo labels swapped when that setting is on) */
  v: number[];
  down: boolean[];
  prev: boolean[];
  axes: [number, number, number, number];
  /** when it last pressed or pushed something (performance.now ms) */
  activeAt: number;
  /** the live object, for rumble */
  gp: Gamepad | null;
  /** buttons a menu used: they read as up until released (D23, DungeonJoe's D147) */
  swallowed: Set<number>;
}

const pads = new Map<number, PadState>();
const listeners: ((p: PadState, on: boolean) => void)[] = [];
let lastActive: PadState | null = null;
let polledAt = -1;
/** Nintendo pads: swap so the button labelled A acts as A (right = confirm, like the console), D23 */
let nintendoLabels = true;
let rumbleStrength = 1;

export function setNintendoLabels(on: boolean): void {
  nintendoLabels = on;
}
export function nintendoLabelsOn(): boolean {
  return nintendoLabels;
}
export function setRumbleStrength(s: number): void {
  rumbleStrength = Math.max(0, Math.min(1, s));
}
export function getRumbleStrength(): number {
  return rumbleStrength;
}

/** hot-plug: called with (pad, true) when a pad appears and (pad, false) when it goes */
export function onPadChange(cb: (p: PadState, on: boolean) => void): () => void {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
}

function rawPads(): Gamepad[] {
  const out: Gamepad[] = [];
  try {
    if (typeof navigator !== 'undefined' && navigator.getGamepads) for (const g of navigator.getGamepads()) if (g && g.connected && g.buttons.length) out.push(g);
  } catch {
    /* the Gamepad API can be blocked by a permissions policy */
  }
  const steam = steamGamepad();
  if (steam) out.push(steam);
  return out;
}

/**
 * Read every pad. Called by whatever needs pads first in an animation frame (the menu loop, a match's input); a
 * second call within 3 ms is skipped, so each frame reads the pads exactly once and edges (prev → down) stay
 * correct. `force` reads again regardless (tests).
 */
export function pollPads(force = false): void {
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  if (!force && polledAt >= 0 && now - polledAt < 3) return;
  polledAt = now;
  const seen = new Set<number>();
  for (const gp of rawPads()) {
    const index = gp.id.startsWith('Steam Controller (WebHID') ? STEAM_PAD_INDEX : gp.index;
    seen.add(index);
    let p = pads.get(index);
    const kind = padKindFromId(gp.id);
    if (!p || p.id !== gp.id) {
      p = { index, id: gp.id, kind, model: padModel(gp.id), standard: true, v: new Array<number>(PAD_BUTTONS).fill(0), down: new Array<boolean>(PAD_BUTTONS).fill(false), prev: new Array<boolean>(PAD_BUTTONS).fill(false), axes: [0, 0, 0, 0], activeAt: 0, gp, swallowed: new Set() };
      pads.set(index, p);
      for (const cb of listeners) cb(p, true);
    }
    p.gp = gp;
    const n = normalizePad(gp);
    p.standard = n.standard;
    if (kind === 'switch' && nintendoLabels) {
      // the browser numbers Nintendo's face buttons by position (B bottom = 0, A right = 1, Y left = 2, X top = 3)
      [n.b[0], n.b[1]] = [n.b[1], n.b[0]];
      [n.b[2], n.b[3]] = [n.b[3], n.b[2]];
    }
    let any = false;
    for (let i = 0; i < PAD_BUTTONS; i++) {
      p.prev[i] = p.down[i];
      p.v[i] = n.b[i];
      const raw = i === 6 || i === 7 ? n.b[i] > TRIGGER_THRESHOLD : n.b[i] > 0.5;
      if (raw) any = true;
      if (!raw) p.swallowed.delete(i);
      p.down[i] = raw && !p.swallowed.has(i);
    }
    p.axes = n.a;
    if (any || Math.abs(n.a[0]) > 0.5 || Math.abs(n.a[1]) > 0.5 || Math.abs(n.a[2]) > 0.5 || Math.abs(n.a[3]) > 0.5) {
      p.activeAt = now;
      lastActive = p;
    }
  }
  for (const [i, p] of pads) {
    if (seen.has(i)) continue;
    pads.delete(i);
    if (lastActive === p) lastActive = null;
    for (const cb of listeners) cb(p, false);
  }
}

/** the connected pads, by index */
export function padList(): PadState[] {
  return [...pads.values()].sort((a, b) => a.index - b.index);
}

export function getPad(index: number): PadState | undefined {
  return pads.get(index);
}

/** the pad that pressed something last (button prompts in Auto follow it) */
export function lastActivePad(): PadState | null {
  return lastActive;
}

/** button i went down this frame */
export function padEdge(p: PadState, i: number): boolean {
  return !!p.down[i] && !p.prev[i];
}

/**
 * A menu used this press (confirm, back, Start…): the game must not see it too (A closing the pause menu used to
 * attack as the match resumed), so the button reads as up until it is released and pressed again.
 */
export function swallowButton(p: PadState, i: number): void {
  p.swallowed.add(i);
  p.down[i] = false;
  p.prev[i] = false;
}

/** a "1-2-3" number for menus: the order the browser lists the pads */
export function padNumber(index: number): number {
  const list = padList();
  const k = list.findIndex((p) => p.index === index);
  return k >= 0 ? k + 1 : index + 1;
}

/** Rumble one pad (where the browser supports it). Strengths 0..1, scaled by the Rumble setting. */
export function rumble(index: number, strong: number, weak: number, ms: number): void {
  if (rumbleStrength <= 0) return;
  const p = pads.get(index);
  const act = (p?.gp as (Gamepad & { vibrationActuator?: { playEffect?: (t: string, o: object) => Promise<unknown> } }) | null)?.vibrationActuator;
  if (!act?.playEffect) return;
  try {
    void act
      .playEffect('dual-rumble', { startDelay: 0, duration: Math.round(ms), strongMagnitude: Math.min(1, strong * rumbleStrength), weakMagnitude: Math.min(1, weak * rumbleStrength) })
      .catch(() => {});
  } catch {
    /* not supported */
  }
}

/** tests: forget every pad */
export function resetPads(): void {
  pads.clear();
  lastActive = null;
  polledAt = -1;
}
