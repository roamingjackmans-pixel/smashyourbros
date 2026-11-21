// Controllers (D23): pad brands, non-standard mappings, the Nintendo label swap, swallowed menu presses, per-port
// layouts and rebinding, the right-stick modes, and the button prompts. readDevice keeps producing the same packed
// int, so the sim and the netcode don't change.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hatToDpad, normalizePad, padEdge, padKindFromId, padList, pollPads, resetPads, setNintendoLabels, swallowButton, getPad, onPadChange } from '../src/game/pads';
import { defaultPadLayout, normalizeMenuPad, normalizePadLayout, normalizePadLayouts, rebindPad, unboundPadActions } from '../src/game/padLayout';
import { deviceTapJump, readDevice, readPad, setControlSettings } from '../src/game/input';
import { B_ATTACK, B_GRAB, B_JUMP, B_SHIELD, B_SPECIAL, C_LEFT, C_NONE, C_UP, ib, ic, ix, iy } from '../src/sim/input';
import { fixProfile } from '../src/game/profile';
import { glyphShape, glyphText, padText, setGlyphSource, type GlyphSource } from '../src/ui/glyphs';
import { defaultMenuPad } from '../src/game/padLayout';

interface FakeButton {
  pressed: boolean;
  touched: boolean;
  value: number;
}
function fakePad(index: number, id: string, opts: { mapping?: string; buttons?: number; axes?: number[] } = {}): Gamepad & { buttons: FakeButton[]; axes: number[] } {
  const n = opts.buttons ?? 17;
  return {
    id,
    index,
    connected: true,
    mapping: (opts.mapping ?? 'standard') as GamepadMappingType,
    timestamp: 0,
    axes: opts.axes ?? [0, 0, 0, 0],
    buttons: Array.from({ length: n }, () => ({ pressed: false, touched: false, value: 0 })),
    vibrationActuator: null,
    hapticActuator: null,
  } as unknown as Gamepad & { buttons: FakeButton[]; axes: number[] };
}
const press = (g: { buttons: FakeButton[] }, i: number, on = true): void => {
  g.buttons[i] = { pressed: on, touched: on, value: on ? 1 : 0 };
};

let connected: Gamepad[] = [];
beforeEach(() => {
  connected = [];
  resetPads();
  setNintendoLabels(true);
  vi.stubGlobal('navigator', { getGamepads: () => connected });
});
afterEach(() => vi.unstubAllGlobals());

describe('pad brands and mappings', () => {
  it('tells Xbox, PlayStation, Switch, Steam and generic pads apart', () => {
    expect(padKindFromId('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)')).toBe('xbox');
    expect(padKindFromId('Xbox 360 Controller (XInput STANDARD GAMEPAD)')).toBe('xbox');
    expect(padKindFromId('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)')).toBe('playstation');
    expect(padKindFromId('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)')).toBe('playstation');
    expect(padKindFromId('Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)')).toBe('switch');
    expect(padKindFromId('Joy-Con L+R (STANDARD GAMEPAD Vendor: 057e Product: 200e)')).toBe('switch');
    expect(padKindFromId('Steam Virtual Gamepad')).toBe('xbox');
    expect(padKindFromId('USB Gamepad (Vendor: 0079 Product: 0011)')).toBe('generic');
  });

  it('reads a POV hat as the D-pad', () => {
    expect(hatToDpad(-1)).toEqual([true, false, false, false]);
    expect(hatToDpad(-3 / 7)).toEqual([false, false, false, true]);
    expect(hatToDpad(1 / 7)).toEqual([false, true, false, false]);
    expect(hatToDpad(5 / 7)).toEqual([false, false, true, false]);
    expect(hatToDpad(1)).toEqual([true, false, true, false]);
    expect(hatToDpad(1.2857)).toEqual([false, false, false, false]);
  });

  it('normalises a non-standard pad: buttons as listed, hat → D-pad, right stick from Z / Rz', () => {
    const g = fakePad(0, 'USB Gamepad (Vendor: 0079 Product: 0011)', { mapping: '', buttons: 12, axes: [0.5, 0, 0.9, 0, 0, -0.8, 0, 0, 0, -1] });
    press(g, 3);
    const n = normalizePad(g);
    expect(n.standard).toBe(false);
    expect(n.b[3]).toBe(1);
    expect(n.b[12]).toBe(1); // hat up
    expect(n.a).toEqual([0.5, 0, 0.9, -0.8]);
  });

  it('polls pads once per frame, notices hot-plugging and swaps Nintendo labels', () => {
    const seen: string[] = [];
    const off = onPadChange((p, on) => seen.push(`${on ? '+' : '-'}${p.kind}`));
    const sw = fakePad(1, 'Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)');
    connected = [sw];
    press(sw, 1); // the button labelled A (on the right)
    pollPads(true);
    const p = getPad(1)!;
    expect(p.kind).toBe('switch');
    expect(p.down[0]).toBe(true); // reads as A
    setNintendoLabels(false);
    pollPads(true);
    expect(getPad(1)!.down[1]).toBe(true); // by position
    connected = [];
    pollPads(true);
    expect(padList()).toEqual([]);
    expect(seen).toEqual(['+switch', '-switch']);
    off();
  });

  it('a press a menu used stays invisible to the game until released', () => {
    const g = fakePad(0, 'Xbox Wireless Controller');
    connected = [g];
    pollPads(true);
    press(g, 0);
    pollPads(true);
    const p = getPad(0)!;
    expect(padEdge(p, 0)).toBe(true);
    swallowButton(p, 0);
    expect(p.down[0]).toBe(false);
    pollPads(true);
    expect(getPad(0)!.down[0]).toBe(false);
    press(g, 0, false);
    pollPads(true);
    press(g, 0);
    pollPads(true);
    expect(getPad(0)!.down[0]).toBe(true);
  });
});

describe('layouts and readDevice', () => {
  it('the default layout packs the same buttons as before', () => {
    const g = fakePad(0, 'Xbox Wireless Controller', { axes: [1, 0, 0, 0] });
    connected = [g];
    for (const b of [0, 1, 2, 5, 4]) press(g, b);
    pollPads(true);
    setControlSettings(normalizePadLayouts(null), false);
    const v = readDevice({ kind: 'pad', index: 0, tapJump: true });
    expect(ix(v)).toBe(100);
    expect(iy(v)).toBe(0);
    expect(ib(v) & (B_ATTACK | B_SPECIAL | B_JUMP | B_SHIELD | B_GRAB)).toBe(B_ATTACK | B_SPECIAL | B_JUMP | B_SHIELD | B_GRAB);
    expect(ic(v)).toBe(C_NONE);
  });

  it('each port has its own layout, deadzone and tap jump', () => {
    const L1 = defaultPadLayout();
    const L2 = defaultPadLayout(false);
    rebindPad(L2, 'attack', 2, 0);
    L2.deadzone = 0.5;
    setControlSettings([L1, L2, defaultPadLayout(), defaultPadLayout()], false);
    const g = fakePad(0, 'Xbox Wireless Controller', { axes: [0.4, 0, 0, 0] });
    connected = [g];
    press(g, 2);
    pollPads(true);
    const p1 = readDevice({ kind: 'pad', index: 0, port: 0, tapJump: true });
    const p2 = readDevice({ kind: 'pad', index: 0, port: 1, tapJump: true });
    expect(ib(p1) & B_ATTACK).toBe(0);
    expect(ib(p1) & B_JUMP).toBe(B_JUMP);
    expect(ib(p2) & B_ATTACK).toBe(B_ATTACK);
    expect(ix(p1)).toBeGreaterThan(0);
    expect(ix(p2)).toBe(0); // inside P2's bigger deadzone
    expect(deviceTapJump({ kind: 'pad', index: 0, port: 1, tapJump: true })).toBe(false);
    expect(deviceTapJump({ kind: 'kb', index: 0, tapJump: true })).toBe(false);
  });

  it('the D-pad moves unless its buttons are bound', () => {
    const L = defaultPadLayout();
    const g = fakePad(0, 'Xbox Wireless Controller');
    connected = [g];
    press(g, 14);
    pollPads(true);
    expect(ix(readPad(getPad(0)!, L, 'a'))).toBe(-100);
    rebindPad(L, 'taunt', 14, 0);
    const v = readPad(getPad(0)!, L, 'a');
    expect(ix(v)).toBe(0);
    expect(ib(v) & 32).toBe(32);
  });

  it('the right stick: smash stick, tilt flicks, special flicks, off', () => {
    const g = fakePad(0, 'Xbox Wireless Controller', { axes: [0, 0, -1, 0] });
    connected = [g];
    pollPads(true);
    const L = defaultPadLayout();
    expect(ic(readPad(getPad(0)!, L, 's'))).toBe(C_LEFT);
    L.cstick = 'tilt';
    const frames = [0, 1, 2, 3].map(() => readPad(getPad(0)!, L, 't'));
    expect(ix(frames[0])).toBe(-52); // under the smash (70) and tap-jump (55) thresholds
    expect(ib(frames[0]) & B_ATTACK).toBe(B_ATTACK);
    expect(ib(frames[2]) & B_ATTACK).toBe(B_ATTACK);
    expect(ib(frames[3]) & B_ATTACK).toBe(0); // a flick is three frames
    L.cstick = 'special';
    g.axes[2] = 0;
    g.axes[3] = -1;
    pollPads(true);
    const up = readPad(getPad(0)!, L, 'sp');
    expect(iy(up)).toBe(75);
    expect(ib(up) & B_SPECIAL).toBe(B_SPECIAL);
    expect(ic(up)).toBe(C_NONE);
    L.cstick = 'off';
    expect(ic(readPad(getPad(0)!, L, 'o'))).toBe(C_NONE);
    L.cstick = 'smash';
    expect(ic(readPad(getPad(0)!, L, 'o'))).toBe(C_UP);
  });

  it('rebinding takes a button from another action, swapping so nothing is left unbound', () => {
    const L = defaultPadLayout();
    // Special's only button (B) goes to Attack: Special gets Attack's old A
    const r = rebindPad(L, 'attack', 1, 0);
    expect(L.buttons.attack).toEqual([1]);
    expect(L.buttons.special).toEqual([0]);
    expect(r.swapped).toEqual({ action: 'special', button: 0 });
    // a second slot
    rebindPad(L, 'attack', 11, 1);
    expect(L.buttons.attack).toEqual([1, 11]);
    expect(L.buttons.ult).toEqual([10]);
    expect(unboundPadActions(L)).toEqual([]);
  });

  it('repairs saved layouts and menu buttons', () => {
    const L = normalizePadLayout({ buttons: { attack: [99], jump: [3, 3, 2] }, cstick: 'nope', deadzone: 9 } as never);
    expect(L.buttons.attack).toEqual([0]);
    expect(L.buttons.jump).toEqual([3, 2]);
    expect(L.cstick).toBe('smash');
    expect(L.deadzone).toBe(0.5);
    expect(normalizeMenuPad({ confirm: 12, back: 1 })).toEqual({ confirm: 0, back: 1 });
    expect(normalizeMenuPad({ confirm: 1, back: 1 })).toEqual({ confirm: 1, back: 0 });
  });

  it('old saves: the one gamepad tap-jump switch becomes every port’s', () => {
    const p = fixProfile({ settings: { tapJumpPad: false } } as never);
    expect(p.settings.pads).toHaveLength(4);
    expect(p.settings.pads.every((l) => l.tapJump === false)).toBe(true);
    expect(p.settings.menuPad).toEqual({ confirm: 0, back: 1 });
    expect(p.settings.prompts).toBe('auto');
    expect(p.settings.rumble).toBe(1);
  });
});

describe('button prompts', () => {
  const src = (over: Partial<GlyphSource> = {}): GlyphSource => ({
    prompts: () => 'auto',
    device: () => 'pad',
    padKind: () => 'xbox',
    layout: () => defaultPadLayout(),
    menuPad: () => defaultMenuPad(),
    keys: () => ({ attack: ['KeyJ'] }),
    nintendoLabels: () => true,
    ...over,
  });
  afterEach(() => setGlyphSource(null));

  it('follow the pad in use and the bindings', () => {
    setGlyphSource(src());
    expect(glyphText('attack')).toBe('A');
    expect(glyphText('menuBack')).toBe('B');
    setGlyphSource(src({ padKind: () => 'playstation' }));
    expect(glyphText('attack')).toBe('✕');
    expect(glyphText('shield')).toBe('R1');
    setGlyphSource(src({ device: () => 'kb' }));
    expect(glyphText('attack')).toBe('J');
    setGlyphSource(src({ prompts: () => 'switch' }));
    expect(glyphText('attack')).toBe('A');
    expect(glyphText('grab')).toBe('L');
    setGlyphSource(src({ prompts: () => 'switch', nintendoLabels: () => false }));
    expect(padText(0, 'switch')).toBe('B');
    const L = defaultPadLayout();
    rebindPad(L, 'attack', 7, 0);
    setGlyphSource(src({ layout: () => L }));
    expect(glyphText('attack')).toBe('RT');
  });

  it('draws every pad button for every brand', () => {
    setGlyphSource(src());
    for (const kind of ['xbox', 'playstation', 'switch', 'generic'] as const)
      for (let b = -2; b <= 16; b++) {
        const s = glyphShape(b, kind, 24);
        expect(s.w).toBeGreaterThan(0);
        expect(s.prims.length).toBeGreaterThan(0);
      }
  });
});
