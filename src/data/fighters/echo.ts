// Echo — time rewind. Chrono-courier from the Clockwork Future: courier cap and goggles, a clockwork wheel on her
// back, a pocket watch on a chain. Her engine history (f.hist, 120 frames) is her "ghost": Rewind snaps her back to
// it and undoes half the damage taken since. Paradox stops time for everyone else.
//
// f.v slots: 0 Rewind cooldown (frames left)   1 frames since the last Rewind (0 = never, capped 999)
//            2 valid history frames (0..120)   3 Paradox pending (1 = her time stop is running)
//            4,5 Rewind target x,y while winding up, then the spot she left (for the art)
//            6 damage 2 s ago while winding up, then the amount healed (for the art)
import { A } from '../../sim/acts';
import { STAGES } from '../../sim/data';
import { ev } from '../../sim/events';
import { bodyH, cfOf, shoot, startMove, surfs } from '../../sim/fighter';
import { spawnProj } from '../../sim/projectiles';
import { registerScripts } from '../../sim/scripts';
import type { Fighter, FighterDef, State } from '../../sim/types';

/** history ring length (engine: 120 entries of [x, y, dmg]) */
export const ECHO_HIST = 120;
/** Rewind cooldown: 12 seconds */
export const ECHO_COOLDOWN = 720;
/** Rewind needs at least this much history (half a second) */
export const ECHO_MIN_HIST = 30;
/** the frame of Rewind that snaps her back */
const REWIND_AT = 10;
const BOMB_FUSE = 72;
/** Paradox: frames of stopped time */
export const ECHO_STOP = 180;

function histK(frame: number): number {
  return (((frame % ECHO_HIST) + ECHO_HIST) % ECHO_HIST) * 3;
}

/** how many frames back the ghost is (the oldest valid entry, two seconds at most) */
export function echoGhostBack(f: Fighter): number {
  return Math.min(ECHO_HIST - 1, Math.max(0, f.v[2] - 1));
}

/** the ghost: where Echo was two seconds ago (x, y, damage), or null when there's no usable history */
export function echoGhost(st: State, f: Fighter): [number, number, number] | null {
  if (!f.hist || f.hist.length < ECHO_HIST * 3 || f.v[2] < 2) return null;
  const k = histK(st.frame - echoGhostBack(f));
  return [f.hist[k], f.hist[k + 1], f.hist[k + 2]];
}

/** a past point of the trail, `back` frames ago (back < valid history) */
export function echoPast(st: State, f: Fighter, back: number): [number, number] {
  const k = histK(st.frame - back);
  return [f.hist[k], f.hist[k + 1]];
}

export const echo: FighterDef = {
  id: 'echo',
  name: 'Echo',
  title: 'I’ve Lived This Moment 40 Times. You’re Cute Every Time.',
  role: 'Time rewind',
  color: '#9cffd9',
  weight: 86,
  power: 0.97,
  history: true,
  passive: 'echo:passive',
  rig: { thigh: 23, shin: 23, torso: 34, head: 21, upper: 19, fore: 18, girth: 13, limb: 6.5, wep: 44 },
  stats: { walk: 10, dash: 18, run: 16.5, dashFrames: 10, airSpeed: 10.4, airAccel: 0.58, airFric: 0.12, groundFric: 0.9, grav: 0.7, fall: 12.8, ffall: 20, jump: 21, hop: 14, djump: 20.5, jumps: 1, squat: 3 },
  bio: 'Senior courier of the Clockwork Future Postal Service: never late, occasionally a week early. Beamed aboard mid-shift and has secretly replayed this whole season forty times, mostly to rewatch her bros’ best moments. Leaves a ghost of herself two seconds behind, just in case.',
  line: 'Spoilers: we stay bros forever. Also you fall off at 112%.',
  taunt: 'Checks her pocket watch, gasps, and blows you a kiss timed to the exact second.',
  wins: [
    'Saw that coming. Saw you coming. Saw us becoming best bros.',
    'Don’t worry, bro: in another timeline you won. I watched it. You looked amazing.',
    'Special delivery: one (1) loss, gift-wrapped. Signed with love from two seconds ago.',
  ],
  moveNames: { nspec: 'Time Bomb', sspec: 'Skip', uspec: 'Loop', dspec: 'Rewind', ult: 'Paradox' },
  poses: {
    palm: { lean: 18, armF: 90, foreF: -4, armB: -30, foreB: 60, legF: 34, shinF: 22, legB: -30, shinB: 10 },
    watch: { lean: 6, head: 22, armF: 32, foreF: 96, armB: -16, foreB: 40, legF: 14, shinF: 14, legB: -12, shinB: 14 },
    slide: { rot: -14, lean: -30, head: 10, armF: 128, foreF: 24, armB: -74, foreB: 20, legF: 90, shinF: 0, legB: 24, shinB: 112 },
    axeUp: { lean: -24, armF: 150, foreF: 20, armB: -50, foreB: 30, legF: 165, shinF: 4, legB: -12, shinB: 30 },
    axeDown: { lean: 30, armF: 62, foreF: 20, armB: -62, foreB: 20, legF: 44, shinF: 0, legB: -22, shinB: 40 },
    watchWind: { lean: -20, head: -6, armF: 212, foreF: 34, wep: 70, armB: 40, foreB: 60, legF: 24, shinF: 30, legB: -34, shinB: 18, sy: 0.97 },
    watchSwing: { lean: 28, armF: 98, foreF: 0, wep: 0, armB: -46, foreB: 30, legF: 50, shinF: 26, legB: -50, shinB: 6, sx: 1.05 },
    pendWind: { lean: 24, armF: 128, foreF: 14, wep: 8, armB: -40, foreB: 40, legF: 64, shinF: 86, legB: -36, shinB: 64, sy: 0.95 },
    pendF: { lean: 30, armF: 66, foreF: 0, wep: 0, armB: -42, foreB: 40, legF: 64, shinF: 86, legB: -36, shinB: 64 },
    pendMid: { lean: 18, armF: 6, foreF: 46, wep: 10, armB: 30, foreB: 40, legF: 60, shinF: 90, legB: -30, shinB: 70 },
    pendB: { lean: 8, armF: -62, foreF: 0, wep: 0, armB: 44, foreB: 30, legF: 56, shinF: 80, legB: -34, shinB: 60 },
    bellWind: { lean: 24, head: -10, armF: 30, foreF: 120, armB: 30, foreB: 120, legF: 64, shinF: 104, legB: 12, shinB: 104, sy: 0.92 },
    bell: { lean: -4, head: -14, armF: 168, foreF: 18, armB: 160, foreB: 22, legF: 8, shinF: 6, legB: -8, shinB: 6, y: 10, sy: 1.08 },
    clockSpin: { lean: 0, armF: 96, foreF: 0, armB: -96, foreB: 0, legF: 86, shinF: 6, legB: -76, shinB: 8 },
    kiss1: { lean: 4, head: -8, armF: 152, foreF: 150, armB: -12, foreB: 30 },
    kiss2: { lean: 14, head: 4, armF: 108, foreF: 4, armB: -22, foreB: 30, legB: -24, shinB: 30 },
    rewindSnap: { lean: -8, head: -10, armF: 172, foreF: 10, armB: -30, foreB: 30, legF: 16, shinF: 10, legB: -16, shinB: 10, sy: 1.1, sx: 0.94 },
  },
  base: {
    taunt: [[0, 'idle'], [8, 'watch'], [26, ['watch', { head: 28 }]], [34, 'kiss1'], [44, 'kiss2'], [52, 'kiss2'], [60, 'idle']],
  },
  projs: {
    timebomb: {
      kind: 'timebomb',
      r: 15,
      life: BOMB_FUSE + 10,
      vx: 7,
      vy: 4,
      grav: 0.55,
      drag: 0.95,
      stick: true,
      fuse: BOMB_FUSE,
      hit: { dmg: 2, ang: 361, bkb: 10, kbg: 20, fx: 'time' },
      explode: { r: 82, hit: { dmg: 12, ang: 58, bkb: 46, kbg: 80, fx: 'time' } },
    },
    // Paradox: a stage-wide, harmless "field" that only exists so the art can grey out the frozen world
    field: { kind: 'paradoxField', r: 1, life: ECHO_STOP + 4, ghost: true, hit: { dmg: 0, ang: 0, bkb: 0, kbg: 0 }, pulse: { every: 100000, r: 0, hit: { dmg: 0, ang: 0, bkb: 0, kbg: 0 } } },
    // when time starts again, every frozen bro gets the paradox bill
    snap: { kind: 'paradoxSnap', r: 30, life: 10, ghost: true, pierce: true, hit: { dmg: 14, ang: 78, bkb: 64, kbg: 90, fx: 'time', unblockable: true } },
  },
  moves: {
    jab1: {
      frames: 17,
      hits: [{ f: [3, 4], at: 'handF', r: 12, dmg: 2.4, ang: 361, bkb: 18, kbg: 25 }],
      next: [{ move: 'jab2', from: 4, to: 15 }],
      anim: [[0, 'jabWind'], [3, 'palm'], [9, 'palm'], [17, 'ready']],
    },
    jab2: {
      frames: 17,
      hits: [{ f: [3, 4], at: 'handB', r: 12, dmg: 2, ang: 361, bkb: 18, kbg: 25 }],
      next: [{ move: 'jab3', from: 4, to: 15 }],
      anim: [[0, 'palm'], [3, 'jab2'], [9, 'jab2'], [17, 'ready']],
    },
    jab3: {
      // "Tick-Tock": a high heel kick
      frames: 30,
      hits: [
        { f: [5, 7], at: 'footF', r: 17, dmg: 4.5, ang: 45, bkb: 45, kbg: 90, fx: 'time' },
        { f: [5, 7], at: 'kneeF', r: 12, dmg: 4, ang: 45, bkb: 45, kbg: 88, fx: 'time' },
      ],
      anim: [[0, 'kickWind'], [3, ['kickWind', { lean: -16, legF: 90 }]], [5, ['kickHigh', { legF: 120 }]], [12, ['kickHigh', { legF: 112 }]], [30, 'idle']],
    },
    ftilt: {
      // "Second Hand": a long straight leg
      frames: 27,
      hits: [
        { f: [6, 8], at: 'footF', r: 16, dmg: 8.5, ang: 361, bkb: 22, kbg: 92 },
        { f: [6, 8], at: 'kneeF', r: 11, dmg: 7, ang: 361, bkb: 22, kbg: 90 },
      ],
      anim: [[0, 'kickWind'], [6, ['kick', { lean: -22, legF: 98 }]], [12, ['kick', { lean: -20, legF: 96 }]], [27, 'idle']],
    },
    utilt: {
      // "High Noon": the hand sweeps over the dial, nine to three
      frames: 28,
      hits: [{ f: [5, 11], at: 'handF', r: 15, dmg: 7, ang: 98, bkb: 26, kbg: 118, fx: 'time' }],
      anim: [
        [0, { lean: 14, armF: 40, foreF: 60, armB: -10, foreB: 40, legF: 30, shinF: 30, legB: -20, shinB: 20 }],
        [5, { lean: 6, armF: 112, foreF: 0, armB: -20, foreB: 40, legF: 22, shinF: 18, legB: -18, shinB: 16 }],
        [8, { lean: -6, armF: 176, foreF: 0, armB: -30, foreB: 40, legF: 16, shinF: 10, legB: -16, shinB: 12 }],
        [11, { lean: -16, armF: 236, foreF: 0, armB: -30, foreB: 40, legF: 14, shinF: 10, legB: -14, shinB: 12 }],
        [16, { lean: -12, armF: 240, foreF: 12, armB: -24, foreB: 40 }],
        [28, 'idle'],
      ],
    },
    dtilt: {
      frames: 22,
      hits: [{ f: [5, 7], at: 'footF', r: 14, dmg: 6, ang: 76, bkb: 30, kbg: 72 }],
      anim: [[0, 'crouch'], [5, ['kickLow', { legF: 80 }]], [10, 'kickLow'], [22, 'crouch']],
    },
    dash: {
      // "Late Delivery": a sliding kick
      frames: 36,
      vel: [{ f: [1, 4], vx: 14 }, { f: [5, 16], vx: 12 }, { f: [17, 36], vx: 2 }],
      hits: [
        { f: [5, 10], at: 'footF', r: 19, dmg: 9, ang: 62, bkb: 55, kbg: 60, fx: 'time' },
        { f: [11, 16], at: 'footF', r: 15, dmg: 5, ang: 70, bkb: 40, kbg: 40 },
      ],
      anim: [[0, 'dash'], [4, 'slide'], [16, 'slide'], [24, ['slide', { rot: -6, lean: -12, shinB: 90 }]], [36, 'idle']],
    },
    fsmash: {
      // "Pocket Watch Swing": winds the watch back on its chain, then whips it overhand
      frames: 46,
      charge: 9,
      hits: [
        { f: [13, 15], at: 'wep', r: 24, dmg: 17, ang: 361, bkb: 30, kbg: 101, fx: 'time' },
        { f: [13, 15], at: 'wepMid', r: 16, dmg: 15, ang: 361, bkb: 30, kbg: 98, fx: 'time' },
        { f: [13, 15], at: 'handF', r: 13, dmg: 12, ang: 361, bkb: 28, kbg: 94 },
      ],
      anim: [[0, 'ready'], [6, ['watchWind', { armF: 170, foreF: 40, wep: 60, lean: -12 }]], [10, 'watchWind'], [12, ['watchWind', { armF: 196, lean: -10, wep: 40 }]], [14, ['watchSwing', { armF: 104, wep: -6 }]], [16, 'watchSwing'], [24, ['watchSwing', { wep: 24, armF: 86 }]], [46, 'idle']],
      sfx: [[13, 'smash']],
    },
    usmash: {
      // "Alarm Bell": rings a giant alarm clock overhead
      frames: 44,
      charge: 6,
      hits: [
        { f: [9, 14], at: 'head', y: 44, r: 30, dmg: 15, ang: 90, bkb: 32, kbg: 98, fx: 'sound' },
        { f: [9, 14], at: 'handF', r: 17, dmg: 13, ang: 90, bkb: 32, kbg: 96, fx: 'sound' },
      ],
      anim: [[0, 'ready'], [6, 'bellWind'], [9, 'bell'], [18, ['bell', { armF: 176, armB: 168 }]], [44, 'idle']],
      sfx: [[9, 'note']],
    },
    dsmash: {
      // "Pendulum": the watch sweeps low in front, under her, and out behind
      frames: 44,
      charge: 5,
      hits: [
        { f: [7, 9], at: 'wep', r: 20, dmg: 12, ang: 28, bkb: 30, kbg: 95, fx: 'time' },
        { f: [7, 9], at: 'handF', r: 13, dmg: 10, ang: 28, bkb: 30, kbg: 92 },
        { f: [14, 16], at: 'wep', r: 20, dmg: 14, ang: 152, bkb: 30, kbg: 98, grp: 1, fx: 'time' },
        { f: [14, 16], at: 'handF', r: 13, dmg: 11, ang: 152, bkb: 30, kbg: 94, grp: 1 },
      ],
      anim: [[0, 'crouch'], [5, 'pendWind'], [8, 'pendF'], [11, 'pendMid'], [15, 'pendB'], [24, ['pendB', { armF: -50 }]], [44, 'idle']],
    },
    nair: {
      // "Clockwork": spins clockwise, arms and legs out like clock hands
      frames: 36,
      air: true,
      landLag: 7,
      autoCancel: [3, 30],
      hits: [
        { f: [3, 6], at: 'footF', r: 17, dmg: 8, ang: 361, bkb: 16, kbg: 100, fx: 'time' },
        { f: [3, 6], at: 'handF', r: 14, dmg: 7, ang: 361, bkb: 16, kbg: 96 },
        { f: [7, 20], at: 'footF', r: 15, dmg: 5, ang: 361, bkb: 10, kbg: 90 },
      ],
      anim: [[0, 'tuck'], [3, ['clockSpin', { rot: 0 }]], [11, ['clockSpin', { rot: 180 }]], [20, ['clockSpin', { rot: 360 }]], [36, ['fall', { rot: 360 }]]],
    },
    fair: {
      // "Minute Hand": an axe kick that sweeps over the top
      frames: 40,
      air: true,
      landLag: 12,
      autoCancel: [3, 34],
      hits: [
        { f: [9, 12], at: 'footF', r: 18, dmg: 12, ang: 45, bkb: 34, kbg: 98, fx: 'time' },
        { f: [9, 12], at: 'kneeF', r: 12, dmg: 9, ang: 45, bkb: 30, kbg: 90 },
        { f: [13, 16], at: 'footF', r: 15, dmg: 7, ang: 361, bkb: 20, kbg: 70 },
      ],
      anim: [[0, ['kickWind', { lean: -10 }]], [8, 'axeUp'], [10, ['axeUp', { legF: 120, lean: 4 }]], [13, 'axeDown'], [20, 'axeDown'], [40, 'fall']],
    },
    bair: {
      frames: 32,
      air: true,
      landLag: 9,
      autoCancel: [3, 26],
      hits: [
        { f: [6, 9], at: 'footB', r: 18, dmg: 12, ang: 145, bkb: 20, kbg: 100, fx: 'time' },
        { f: [6, 9], at: 'kneeB', r: 12, dmg: 9, ang: 145, bkb: 20, kbg: 92 },
      ],
      anim: [[0, ['bair', { legB: -40, shinB: 100 }]], [6, 'bair'], [14, 'bair'], [32, 'fall']],
    },
    uair: {
      frames: 32,
      air: true,
      landLag: 8,
      autoCancel: [3, 26],
      hits: [{ f: [5, 10], at: 'footF', r: 18, dmg: 8.5, ang: 80, bkb: 26, kbg: 108 }],
      anim: [[0, ['uairWind', { rot: 0 }]], [5, ['uair', { rot: -40 }]], [10, ['uair', { rot: -200 }]], [18, ['tuck', { rot: -330 }]], [32, ['fall', { rot: -360 }]]],
    },
    dair: {
      // "Deadline": both heels straight down
      frames: 42,
      air: true,
      landLag: 16,
      autoCancel: [3, 36],
      hits: [
        { f: [12, 14], at: 'footF', r: 17, dmg: 13, ang: 270, bkb: 20, kbg: 86, fx: 'time' },
        { f: [12, 14], at: 'footB', r: 15, dmg: 13, ang: 270, bkb: 20, kbg: 86, fx: 'time' },
        { f: [15, 21], at: 'footF', r: 14, dmg: 8, ang: 361, bkb: 20, kbg: 70 },
      ],
      anim: [[0, 'dairWind'], [11, 'dairWind'], [13, 'dair'], [21, 'dair'], [42, 'fall']],
    },
    grab: {
      frames: 30,
      hits: [{ f: [6, 8], at: 'handF', r: 17, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'ready'], [6, 'grab'], [12, 'grab'], [30, 'idle']],
    },
    dashgrab: {
      frames: 38,
      vel: [{ f: [1, 10], vx: 9 }, { f: [11, 38], vx: 1 }],
      hits: [{ f: [8, 11], at: 'handF', r: 19, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'dash'], [8, 'grab'], [16, 'grab'], [38, 'idle']],
    },
    pummel: { frames: 16, pummel: 1.5, anim: [[0, 'hold'], [4, ['hold', { legF: 70, shinF: 70, lean: 16 }]], [16, 'hold']] },
    fthrow: {
      // "Return to Sender"
      frames: 28,
      throw: { release: 10, hit: { dmg: 8, ang: 40, bkb: 60, kbg: 62, fx: 'time' } },
      anim: [[0, 'hold'], [6, ['hold', { lean: -6, armF: 60, armB: 56 }]], [10, ['throwF', { lean: 40 }]], [28, 'idle']],
    },
    bthrow: {
      // "Wrong Way": spins them round the dial and out behind
      frames: 32,
      throw: { release: 14, holdAt: 'handF', hit: { dmg: 11, ang: 140, bkb: 60, kbg: 72, fx: 'time' } },
      anim: [[0, 'hold'], [6, ['throwF', { rot: -90 }]], [12, ['throwB', { rot: -200 }]], [16, ['throwB', { rot: -340 }]], [32, ['idle', { rot: -360 }]]],
    },
    uthrow: {
      // "Launch Window"
      frames: 34,
      throw: { release: 13, hit: { dmg: 7, ang: 90, bkb: 72, kbg: 68 } },
      anim: [[0, 'hold'], [8, 'crouch'], [13, 'throwUp'], [34, 'idle']],
    },
    dthrow: {
      // "Pressed for Time"
      frames: 34,
      throw: { release: 15, hit: { dmg: 6, ang: 72, bkb: 60, kbg: 40 } },
      anim: [[0, 'hold'], [10, 'throwDown'], [20, ['throwDown', { legF: 70, shinF: 30 }]], [34, 'idle']],
    },
    nspec: {
      // Time Bomb: lob a ticking alarm clock; press again while it's out to set it off early
      frames: 32,
      script: 'echo:bomb',
      anim: [[0, 'castWind'], [6, ['cast', { foreF: 16 }]], [16, 'cast'], [32, 'idle']],
      sfx: [[7, 'throw']],
    },
    nspecAir: {
      frames: 32,
      script: 'echo:bomb',
      anim: [[0, 'castWind'], [6, ['cast', { foreF: 16 }]], [16, 'cast'], [32, 'fall']],
      sfx: [[7, 'throw']],
    },
    sspec: {
      // Skip: blink forward through time (intangible), pop back in with a hit
      frames: 36,
      oncePerAir: true,
      intang: [1, 16],
      vel: [{ f: [1, 5], vx: 1, vy: 0, grav: 0 }, { f: [6, 14], vx: 24, vy: 0, grav: 0, noDrift: true }, { f: [15, 22], vx: 5, vy: 0, grav: 0.2 }, { f: [23, 36], grav: 0.8 }],
      hits: [{ f: [15, 17], at: 'torso', y: 14, r: 28, dmg: 7, ang: 50, bkb: 50, kbg: 55, fx: 'time' }],
      anim: [[0, 'charge'], [5, ['charge', { lean: 50 }]], [7, ['dash', { lean: 64 }]], [14, ['dash', { lean: 64 }]], [16, ['palm', { lean: 24, armB: 60 }]], [24, 'palm'], [36, 'ready']],
      sfx: [[6, 'dash'], [15, 'zap']],
    },
    uspec: {
      // Loop: spirals up through time, counter-clockwise (rewinding), multi-hit then a launcher
      frames: 46,
      helpless: true,
      landHelpless: 22,
      ledgeFrom: 10,
      reverse: true,
      vel: [{ f: [1, 5], vx: 0, vy: 0, grav: 0 }, { f: [6, 30], vy: 17, grav: 0 }, { f: [31, 46], grav: 0.7 }],
      hits: [
        { f: [6, 28], at: 'hip', y: 34, r: 32, dmg: 1.6, ang: 88, bkb: 30, kbg: 22, rehit: 5, fx: 'time' },
        { f: [29, 31], at: 'hip', y: 40, r: 36, dmg: 5, ang: 80, bkb: 60, kbg: 88, grp: 1, fx: 'time' },
      ],
      anim: [[0, 'charge'], [5, ['tuck', { rot: 0 }]], [18, ['tuck', { rot: -360 }]], [30, ['jump', { rot: -720, armF: 176, armB: 170 }]], [46, ['helpless', { rot: -720 }]]],
      sfx: [[6, 'jet']],
    },
    dspec: {
      // Rewind (signature): snap back to the ghost, undo half the damage taken since. Long cooldown.
      frames: 34,
      intang: [1, 13],
      script: 'echo:rewind',
      anim: [[0, 'ready'], [3, 'watch'], [8, ['watch', { lean: -8, head: -4, foreF: 130 }]], [REWIND_AT, 'rewindSnap'], [15, 'land'], [34, 'ready']],
    },
    dspecFail: {
      // the watch isn't wound yet: a sad little buzz
      frames: 22,
      anim: [[0, 'ready'], [4, 'watch'], [8, ['watch', { head: 30 }]], [12, ['watch', { head: 10 }]], [16, ['watch', { head: 28 }]], [22, 'ready']],
      sfx: [[5, 'clank']],
    },
    ledgeatk: {
      frames: 50,
      hits: [{ f: [17, 20], at: 'footF', r: 19, dmg: 9, ang: 361, bkb: 45, kbg: 45 }],
      anim: [[0, 'climb'], [14, 'kickWind'], [18, 'kick'], [26, 'kick'], [50, 'idle']],
    },
    getupatk: {
      frames: 44,
      hits: [
        { f: [14, 16], at: 'footF', r: 18, dmg: 7, ang: 361, bkb: 50, kbg: 40 },
        { f: [22, 24], at: 'footB', r: 18, dmg: 7, ang: 150, bkb: 50, kbg: 40, grp: 1 },
      ],
      anim: [[0, 'lying'], [12, ['downSmash', { lean: 50 }]], [16, 'downSmash'], [24, ['downSmash', { legF: -82, legB: 82 }]], [44, 'idle']],
    },
    ult: {
      // Paradox: clicks the watch and stops time for everyone else (3 s); when it starts again, the bill arrives
      frames: 44,
      ult: true,
      script: 'echo:ult',
      anim: [[0, 'watch'], [6, ['castUp', { head: -10 }]], [9, ['castUp', { sy: 1.08, head: -14 }]], [16, 'victory'], [44, 'idle']],
      sfx: [[9, 'boom']],
    },
  },
};

function pk(f: Fighter, name: string): number {
  return cfOf(f).projIdx[name] ?? -1;
}

/** put her on the floor she was standing on two seconds ago (moving platforms may have shifted a little) */
function settle(st: State, f: Fighter): void {
  f.gnd = -1;
  if (f.grav < 0) return;
  const ss = surfs(st);
  for (let i = 0; i < ss.length; i++) {
    const s = ss[i];
    if (f.x < s.x1 || f.x > s.x2) continue;
    if (f.y >= s.y1 - 10 && f.y <= s.y1 + (s.soft ? 6 : 40)) {
      f.y = s.y1;
      f.gnd = i;
      return;
    }
  }
}

registerScripts({
  // hits landed in her own stopped time "bank" a little extra
  'echo:mult': (st, f, _m, out: { dmg: number; kb: number; fx?: string }) => {
    if (st.timeStop > 0 && st.timeStopBy === f.i) {
      out.dmg *= 1.15;
      out.fx = 'time';
    }
  },

  'echo:passive': (st, f) => {
    const v = f.v;
    // history is only trusted while she's alive (no rewinding into a blast zone)
    if (f.act === A.DEAD) v[2] = 0;
    else if (v[2] < ECHO_HIST) v[2]++;
    if (v[0] > 0) {
      v[0]--;
      if (v[0] === 0) ev(st, 'charged', f.x, f.y, f.i);
    }
    if (v[1] > 0 && v[1] < 999) v[1]++;
    // Paradox: time starts again
    if (v[3] === 1 && (st.timeStop <= 0 || st.timeStopBy !== f.i)) {
      v[3] = 0;
      const fk = pk(f, 'field');
      for (const p of st.projs) if (p.o === f.i && p.fd === f.def && p.pk === fk) p.life = Math.min(p.life, p.age);
      if (st.timeStopBy === f.i && f.act !== A.DEAD && !f.out) {
        const sk = pk(f, 'snap');
        for (const t of st.fighters) {
          if (t.i === f.i || t.out || t.act === A.DEAD || t.act === A.RESPAWN) continue;
          if (st.cfg.teams && t.team === f.team && !st.cfg.friendlyFire) continue;
          spawnProj(st, f, sk, t.x, t.y - bodyH(st, t) * 0.5 * t.grav, 0, 0);
        }
        ev(st, 'flash', f.x, f.y, f.i);
        ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'boom');
      }
      st.timeStopBy = st.timeStop > 0 ? st.timeStopBy : -1;
    }
  },

  'echo:rewind': (st, f) => {
    const v = f.v;
    if (f.mf === 1) {
      if (v[0] > 0 || v[2] < ECHO_MIN_HIST) {
        startMove(st, f, 'dspecFail');
        return;
      }
      // lock the target now, so what you see when you press is where you go
      const g = echoGhost(st, f);
      if (!g) {
        startMove(st, f, 'dspecFail');
        return;
      }
      v[4] = g[0];
      v[5] = g[1];
      v[6] = g[2];
      ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'magic');
      return;
    }
    if (f.mf !== REWIND_AT) return;
    const fromX = f.x;
    const fromY = f.y;
    f.x = v[4];
    f.y = v[5];
    settle(st, f);
    f.vx = 0;
    f.vy = 0;
    f.kx = 0;
    f.ky = 0;
    f.ff = false;
    f.helpless = false;
    f.ledge = -1;
    // everything she spent since then comes back too
    f.jumps = cfOf(f).def.stats.jumps;
    f.dodged = false;
    f.airUsed = 0;
    const heal = f.dmg > v[6] ? Math.round(((f.dmg - v[6]) / 2) * 10) / 10 : 0;
    f.dmg = Math.max(0, f.dmg - heal);
    f.hp += heal;
    v[0] = ECHO_COOLDOWN;
    v[1] = 1;
    v[4] = fromX;
    v[5] = fromY;
    v[6] = heal;
    ev(st, 'charged', fromX, fromY, f.i);
    ev(st, 'charged', f.x, f.y, f.i);
    ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'zap');
  },

  'echo:bomb': (st, f) => {
    if (f.mf !== 7) return;
    const bk = pk(f, 'timebomb');
    for (const p of st.projs) {
      if (p.o === f.i && p.fd === f.def && p.pk === bk && !p.dead) {
        // remote detonation: the bomb goes off on the next tick
        p.age = Math.max(p.age, BOMB_FUSE - 1);
        ev(st, 'sfx', p.x, p.y, f.i, 0, 0, 'clank');
        return;
      }
    }
    shoot(st, f, 'timebomb', 'handF', 8, 0);
  },

  'echo:ult': (st, f) => {
    if (f.mf !== 9) return;
    st.timeStop = ECHO_STOP;
    st.timeStopBy = f.i;
    f.v[3] = 1;
    f.speedT = Math.max(f.speedT, ECHO_STOP);
    const s0 = STAGES[st.stage].solids[0];
    spawnProj(st, f, pk(f, 'field'), (s0.x1 + s0.x2) / 2, s0.y1 - 380, 0, 0);
    ev(st, 'flash', f.x, f.y, f.i);
  },
});
