// Controller layouts (D23): one per player port (P1–P4), saved in the profile. Every action is rebindable to any
// standard-layout button 0–15 (two per action); the right stick can be the smash stick, a tilt stick, a specials stick
// or off; each port has its own deadzone and tap-jump. Menu confirm / back are one pair for everyone.

export type PadAction = 'attack' | 'special' | 'jump' | 'shield' | 'grab' | 'ult' | 'taunt' | 'pause';
export const PAD_ACTIONS: readonly [PadAction, string][] = [
  ['attack', 'Attack (A)'],
  ['special', 'Special (B)'],
  ['jump', 'Jump'],
  ['shield', 'Shield / dodge'],
  ['grab', 'Grab'],
  ['ult', 'Ultimate'],
  ['taunt', 'Taunt'],
  ['pause', 'Pause'],
];
export const PAD_ACTION_IDS: readonly PadAction[] = PAD_ACTIONS.map(([a]) => a);

export type CStick = 'smash' | 'tilt' | 'special' | 'off';
export const CSTICK_MODES: readonly [CStick, string][] = [
  ['smash', 'Smash attacks'],
  ['tilt', 'Tilt attacks'],
  ['special', 'Specials'],
  ['off', 'Off'],
];

export interface PadLayout {
  buttons: Record<PadAction, number[]>;
  /** what the right stick does */
  cstick: CStick;
  /** stick deadzone, 0.05..0.5 */
  deadzone: number;
  tapJump: boolean;
}

export interface MenuPad {
  confirm: number;
  back: number;
}

export const PORTS = 4;

export function defaultPadLayout(tapJump = true): PadLayout {
  return {
    buttons: {
      attack: [0],
      special: [1],
      jump: [2, 3],
      shield: [5, 7],
      grab: [4, 6],
      ult: [10, 11],
      taunt: [8],
      pause: [9],
    },
    cstick: 'smash',
    deadzone: 0.2,
    tapJump,
  };
}

export function defaultMenuPad(): MenuPad {
  return { confirm: 0, back: 1 };
}

/** Menu confirm / back can be any button but the D-pad (it moves the menu focus) and Start / Select. */
export function menuPadAllowed(v: number): boolean {
  return Number.isInteger(v) && v >= 0 && v < 12 && v !== 8 && v !== 9;
}

export function normalizeMenuPad(b: unknown): MenuPad {
  const d = defaultMenuPad();
  const o = (b ?? {}) as Partial<Record<string, unknown>>;
  const ok = (v: unknown): v is number => typeof v === 'number' && menuPadAllowed(v);
  const confirm = ok(o.confirm) ? o.confirm : d.confirm;
  let back = ok(o.back) ? o.back : d.back;
  if (back === confirm) back = confirm === d.back ? d.confirm : d.back;
  return { confirm, back };
}

const okButton = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x < 16;

/** Fill anything missing from the defaults (older saves) and drop junk. */
export function normalizePadLayout(x: unknown, tapJumpDefault = true): PadLayout {
  const d = defaultPadLayout(tapJumpDefault);
  if (!x || typeof x !== 'object') return d;
  const o = x as Partial<PadLayout>;
  const buttons = {} as Record<PadAction, number[]>;
  for (const a of PAD_ACTION_IDS) {
    const v = (o.buttons as Record<string, unknown> | undefined)?.[a];
    buttons[a] = Array.isArray(v) && v.every(okButton) ? [...new Set(v as number[])].slice(0, 2) : [...d.buttons[a]];
  }
  const cstick = CSTICK_MODES.some(([m]) => m === o.cstick) ? (o.cstick as CStick) : d.cstick;
  const deadzone = typeof o.deadzone === 'number' && Number.isFinite(o.deadzone) ? Math.max(0.05, Math.min(0.5, o.deadzone)) : d.deadzone;
  const tapJump = typeof o.tapJump === 'boolean' ? o.tapJump : d.tapJump;
  return { buttons, cstick, deadzone, tapJump };
}

export function normalizePadLayouts(x: unknown, tapJumpDefault = true): PadLayout[] {
  const arr = Array.isArray(x) ? x : [];
  return Array.from({ length: PORTS }, (_, i) => normalizePadLayout(arr[i], tapJumpDefault));
}

/** The actions bound to button `b` in a layout. */
export function actionsOn(L: PadLayout, b: number): PadAction[] {
  return PAD_ACTION_IDS.filter((a) => L.buttons[a].includes(b));
}

export interface RebindResult {
  /** actions that lost the button */
  displaced: PadAction[];
  /** set when a displaced action was left with nothing and took the slot's previous button instead */
  swapped: { action: PadAction; button: number } | null;
}

/**
 * Bind `button` to `action` at `slot` (0 or 1), taking it from any other action. If that leaves the other action with
 * no button at all, it gets the button this slot held before (a swap), so remapping one button never silently
 * unbinds another action (DungeonJoe's rule).
 */
export function rebindPad(L: PadLayout, action: PadAction, button: number, slot = 0): RebindResult {
  const prev = L.buttons[action][slot];
  const displaced: PadAction[] = [];
  for (const a of PAD_ACTION_IDS) {
    if (a === action) continue;
    const i = L.buttons[a].indexOf(button);
    if (i >= 0) {
      L.buttons[a].splice(i, 1);
      displaced.push(a);
    }
  }
  const cur = [...L.buttons[action]];
  const at = cur.indexOf(button);
  if (at >= 0 && at !== slot && cur[slot] !== undefined) [cur[at], cur[slot]] = [cur[slot]!, cur[at]!];
  else {
    if (at >= 0) cur.splice(at, 1);
    cur[Math.min(slot, cur.length)] = button;
  }
  L.buttons[action] = [...new Set(cur)].slice(0, 2);
  let swapped: RebindResult['swapped'] = null;
  if (prev !== undefined && prev !== button && !PAD_ACTION_IDS.some((a) => L.buttons[a].includes(prev))) {
    const orphan = displaced.find((a) => L.buttons[a].length === 0);
    if (orphan) {
      L.buttons[orphan] = [prev];
      swapped = { action: orphan, button: prev };
    }
  }
  return { displaced, swapped };
}

/** Clear one slot of an action (it keeps at least nothing; the screen warns about unbound actions). */
export function clearPadSlot(L: PadLayout, action: PadAction, slot: number): void {
  L.buttons[action] = L.buttons[action].filter((_, i) => i !== slot);
}

export function unboundPadActions(L: PadLayout): PadAction[] {
  return PAD_ACTION_IDS.filter((a) => a !== 'taunt' && L.buttons[a].length === 0);
}
