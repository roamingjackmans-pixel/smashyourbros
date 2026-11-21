// Zippy — the speedster. Courier squirrel from Thunderwood; a big fluffy tail that crackles with static. Light, fast
// faller, rushdown. Down B stores static: f.v[0] = 1 while charged, and 'zippy:mult' makes the next hit electric
// and stronger (consumed by 'zippy:onhit' or a throw). The tail is a real bone: tail attacks hit with its tip.
// Tail direction (0 up, 90 forward, 180 down, 270 back) = rot + 180 + tail, so tail 90 = straight back, 180 = up.
import { A } from '../../sim/acts';
import { bodyH } from '../../sim/fighter';
import { POSES } from '../../sim/poses';
import { spawnProj } from '../../sim/projectiles';
import { registerScripts } from '../../sim/scripts';
import { STAGES } from '../../sim/data';
import { ev } from '../../sim/events';
import type { Fighter, FighterDef, Pose, State } from '../../sim/types';
import { startMove, cfOf } from '../../sim/fighter';

/** library pose with Zippy's tail held a particular way */
const tl = (name: string, tail: number, extra: Partial<Pose> = {}): Partial<Pose> => ({ ...POSES[name], tail, ...extra });

const RUN = { lean: 36, head: -14, foreF: 100, foreB: 100 };

export const zippy: FighterDef = {
  id: 'zippy',
  name: 'Zippy',
  title: 'Special Delivery',
  role: 'Speedster',
  color: '#ff8a3a',
  weight: 74,
  power: 0.92,
  rig: { thigh: 18, shin: 18, torso: 28, head: 19, upper: 15, fore: 14, girth: 13, limb: 6, tail: 50 },
  stats: { walk: 11, dash: 22, run: 20, dashFrames: 10, airSpeed: 11, airAccel: 0.62, airFric: 0.14, groundFric: 1.0, grav: 0.98, fall: 16.5, ffall: 25, jump: 22, hop: 15, djump: 20.5, jumps: 1, squat: 3 },
  bio: 'Fastest courier in Thunderwood. Has never once been late, mostly because he arrives before he leaves. Carries every parcel like it is a love letter, and every love letter like it is a parcel. All of them are for his bros.',
  line: 'I ran here at 300 km/h just to tell you you look great. Okay bye.',
  taunt: 'Holds out a clipboard: SIGN HERE FOR ONE (1) HUG. Taps his foot. Taps it very fast.',
  wins: ['Delivered!', 'Express shipping, bro. Next-day KO. Tracking number: ILY.', 'Signed, sealed, smashed. Same time tomorrow? I’ll be early.'],
  moveNames: { nspec: 'Acorn Flick', sspec: 'Bolt Dash', uspec: 'Tail Spring', dspec: 'Static Charge', ult: 'Thunder Rush' },
  passive: 'zippy:passive',
  poses: {
    // squirrel stances: paws up at the chest, tail curled high
    idle: { lean: 12, head: -4, armF: 34, foreF: 124, armB: 26, foreB: 128, legF: 34, shinF: 44, legB: -26, shinB: 44, tail: 150 },
    ready: { lean: 22, head: -8, armF: 40, foreF: 116, armB: 32, foreB: 120, legF: 40, shinF: 60, legB: -30, shinB: 56, tail: 140 },
    crouch: { lean: 44, head: -14, armF: 50, foreF: 110, armB: 40, foreB: 110, legF: 80, shinF: 125, legB: 20, shinB: 125, tail: 135 },
    fall: tl('fall', 125),
    jump: tl('jump', 110),
    tuck: tl('tuck', 150),
    land: tl('land', 120),
    squat: tl('squat', 130),
    dash: tl('dash', 100),
    skid: tl('skid', 150),
    shield: tl('shield', 160),
    hurt: tl('hurt', 70),
    hurtBig: tl('hurtBig', 40),
    tumble: tl('tumble', 60),
    lying: tl('lying', 40),
    ledge: tl('ledge', 30),
    climb: tl('climb', 120),
    roll: tl('roll', 160),
    dodge: tl('dodge', 170),
    airdodge: tl('airdodge', 120),
    helpless: tl('helpless', 60),
    teeter: tl('teeter', 175),
    dizzy: tl('dizzy', 80),
    grabbed: tl('grabbed', 50),
    hold: tl('hold', 140),
    victory: tl('victory', 165),
    // strikes
    zJab1: { lean: 18, armF: 96, foreF: 4, armB: 30, foreB: 124, legF: 36, shinF: 40, legB: -30, shinB: 36, tail: 140 },
    zJab2: { lean: 22, armF: 34, foreF: 120, armB: 98, foreB: 4, legF: 36, shinF: 40, legB: -32, shinB: 36, tail: 140 },
    zKickA: { lean: -14, armF: 50, foreF: 110, armB: -30, foreB: 90, legF: 92, shinF: 4, legB: -6, shinB: 20, tail: 120 },
    zKickB: { lean: -10, armF: 40, foreF: 110, armB: -20, foreB: 90, legF: 70, shinF: 60, legB: 10, shinB: 30, tail: 130 },
    zKickC: { lean: -16, armF: 50, foreF: 110, armB: -30, foreB: 90, legF: 104, shinF: 0, legB: -8, shinB: 20, tail: 120 },
    zFinWind: { lean: 30, armF: 40, foreF: 110, armB: 30, foreB: 110, legF: 40, shinF: 50, legB: -30, shinB: 40, tail: 80 },
    zFin: { lean: 30, armF: 60, foreF: 100, armB: -20, foreB: 90, legF: 40, shinF: 40, legB: -30, shinB: 30, tail: 262 },
    zSpinKickWind: { lean: 6, armF: 40, foreF: 110, armB: 20, foreB: 110, legF: 70, shinF: 120, legB: -10, shinB: 20, tail: 120 },
    zSpinKick: { lean: -20, armF: 60, foreF: 100, armB: -50, foreB: 80, legF: 98, shinF: 0, legB: -8, shinB: 14, tail: 100 },
    zUtiltA: { lean: 30, armF: 40, foreF: 110, armB: 30, foreB: 110, legF: 40, shinF: 60, legB: -30, shinB: 50, tail: 80 },
    zUtiltB: { lean: 10, armF: 50, foreF: 100, armB: 30, foreB: 100, legF: 30, shinF: 40, legB: -26, shinB: 36, tail: 185 },
    zUtiltC: { lean: 4, armF: 50, foreF: 100, armB: 30, foreB: 100, legF: 30, shinF: 40, legB: -26, shinB: 36, tail: 250 },
    zSweepA: { lean: 50, head: -16, armF: 70, foreF: 30, armB: 60, foreB: 40, legF: 84, shinF: 120, legB: 26, shinB: 126, tail: 70 },
    zSweepB: { lean: 54, head: -16, armF: 80, foreF: 20, armB: 70, foreB: 30, legF: 84, shinF: 120, legB: 26, shinB: 126, tail: -78 },
    zSlide: { rot: -40, lean: 0, head: 10, armF: 140, foreF: 40, armB: 160, foreB: 30, legF: 50, shinF: 0, legB: 90, shinB: 100, tail: 60 },
    // smashes
    zTailWind: { lean: -18, head: -6, armF: -40, foreF: 80, armB: -50, foreB: 80, legF: 40, shinF: 70, legB: -30, shinB: 50, tail: 70 },
    zTailOver: { lean: 6, armF: 20, foreF: 90, armB: 10, foreB: 90, legF: 48, shinF: 50, legB: -40, shinB: 30, tail: 180 },
    zTailHit: { lean: 34, head: -10, armF: 70, foreF: 30, armB: 50, foreB: 30, legF: 58, shinF: 40, legB: -52, shinB: 10, tail: 268 },
    zUpWind: { lean: 30, armF: 20, foreF: 120, armB: 16, foreB: 120, legF: 64, shinF: 110, legB: 14, shinB: 110, tail: 60 },
    zUpHit: { lean: -8, head: -18, armF: 176, foreF: 0, armB: 168, foreB: 4, legF: 6, shinF: 4, legB: -6, shinB: 4, y: 10, tail: 178 },
    zBreakF: { lean: 60, head: -20, armF: 160, foreF: 10, armB: 150, foreB: 10, legF: 40, shinF: 120, legB: -10, shinB: 120, tail: -84 },
    zBreakDown: { lean: 60, head: -20, armF: 160, foreF: 10, armB: 150, foreB: 10, legF: 40, shinF: 120, legB: -10, shinB: 120, tail: 0 },
    zBreakB: { lean: 60, head: -20, armF: 160, foreF: 10, armB: 150, foreB: 10, legF: 40, shinF: 120, legB: -10, shinB: 120, tail: 84 },
    // aerials
    zBall: { lean: 30, head: 10, armF: 80, foreF: 130, armB: 70, foreB: 130, legF: 110, shinF: 140, legB: 100, shinB: 140, tail: 200 },
    zFairWind: { lean: -20, armF: 120, foreF: 60, armB: 100, foreB: 60, legF: 90, shinF: 130, legB: 60, shinB: 120, tail: 160 },
    zFair: { lean: 30, armF: 30, foreF: 80, armB: -30, foreB: 60, legF: 60, shinF: 10, legB: 40, shinB: 30, tail: 120 },
    zBairWind: { lean: 20, armF: 50, foreF: 110, armB: 40, foreB: 110, legF: 50, shinF: 90, legB: 10, shinB: 90, tail: 10 },
    zBair: { lean: 34, head: 14, armF: 60, foreF: 100, armB: 40, foreB: 100, legF: 50, shinF: 90, legB: -20, shinB: 60, tail: 98 },
    zBairEnd: { lean: 30, head: 14, armF: 60, foreF: 100, armB: 40, foreB: 100, legF: 50, shinF: 90, legB: -20, shinB: 60, tail: 140 },
    zUairA: { lean: -6, armF: 60, foreF: 100, armB: 40, foreB: 100, legF: 50, shinF: 90, legB: 10, shinB: 90, tail: 110 },
    zUairB: { lean: -20, head: -20, armF: 60, foreF: 100, armB: 40, foreB: 100, legF: 50, shinF: 90, legB: 10, shinB: 90, tail: 180 },
    zUairC: { lean: -24, head: -20, armF: 60, foreF: 100, armB: 40, foreB: 100, legF: 50, shinF: 90, legB: 10, shinB: 90, tail: 250 },
    zDairWind: { lean: -4, armF: 140, foreF: 30, armB: 140, foreB: 30, legF: 90, shinF: 130, legB: 80, shinB: 130, tail: 170 },
    zDair: { lean: 0, armF: 160, foreF: 10, armB: 150, foreB: 10, legF: 6, shinF: 0, legB: 14, shinB: 4, tail: 160 },
    // specials and throws
    zFlick: { lean: 20, armF: 100, foreF: 10, armB: 30, foreB: 120, legF: 34, shinF: 40, legB: -28, shinB: 36, tail: 150 },
    zFlickWind: { lean: 4, armF: 20, foreF: 140, armB: 30, foreB: 120, legF: 30, shinF: 40, legB: -26, shinB: 36, tail: 160 },
    zBolt: { rot: 62, lean: 0, head: -50, armF: -60, foreF: 30, armB: -70, foreB: 30, legF: -30, shinF: 40, legB: -50, shinB: 30, tail: 90 },
    zCoil: { lean: 40, head: -14, armF: 60, foreF: 100, armB: 50, foreB: 100, legF: 84, shinF: 130, legB: 24, shinB: 130, tail: -30 },
    zSpring: { lean: -6, armF: 170, foreF: 10, armB: 160, foreB: 10, legF: 10, shinF: 10, legB: -10, shinB: 14, tail: 0 },
    zFluffA: { lean: 6, head: -10, armF: 70, foreF: 130, armB: 64, foreB: 130, legF: 30, shinF: 50, legB: -26, shinB: 50, tail: 120 },
    zFluffB: { lean: -4, head: 6, armF: 60, foreF: 140, armB: 56, foreB: 140, legF: 34, shinF: 54, legB: -30, shinB: 54, tail: 175 },
    zZap: { lean: -10, head: -14, armF: 140, foreF: 20, armB: -140, foreB: 20, legF: 30, shinF: 30, legB: -30, shinB: 30, tail: 180 },
    zNibble: { lean: 30, head: 24, armF: 80, foreF: 60, armB: 76, foreB: 60, legF: 36, shinF: 44, legB: -30, shinB: 36, tail: 150 },
    zToss: { lean: -24, armF: 170, foreF: 10, armB: 160, foreB: 10, legF: 20, shinF: 20, legB: -20, shinB: 20, tail: 170 },
  },
  base: {
    walk: [
      [0, { lean: 16, head: -6, armF: 40, foreF: 120, armB: 30, foreB: 124, legF: 34, shinF: 20, legB: -24, shinB: 50, tail: 150 }],
      [5, { lean: 14, head: -6, armF: 30, foreF: 124, armB: 40, foreB: 120, legF: 6, shinF: 60, legB: 4, shinB: 20, y: 3, tail: 158 }],
      [10, { lean: 16, head: -6, armF: 30, foreF: 124, armB: 40, foreB: 120, legF: -24, shinF: 50, legB: 34, shinB: 20, tail: 150 }],
      [15, { lean: 14, head: -6, armF: 40, foreF: 120, armB: 30, foreB: 124, legF: 4, shinF: 20, legB: 6, shinB: 60, y: 3, tail: 158 }],
      [19, { lean: 16, head: -6, armF: 40, foreF: 120, armB: 30, foreB: 124, legF: 34, shinF: 20, legB: -24, shinB: 50, tail: 150 }],
    ],
    run: [
      [0, { ...RUN, armF: -60, armB: 70, legF: 80, shinF: 30, legB: -40, shinB: 70, tail: 100 }],
      [3, { ...RUN, armF: 0, armB: 10, legF: 24, shinF: 110, legB: 20, shinB: 40, y: 6, tail: 108 }],
      [7, { ...RUN, armF: 70, armB: -60, legF: -40, shinF: 70, legB: 80, shinB: 30, tail: 100 }],
      [10, { ...RUN, armF: 10, armB: 0, legF: 20, shinF: 40, legB: 24, shinB: 110, y: 6, tail: 108 }],
      [13, { ...RUN, armF: -60, armB: 70, legF: 80, shinF: 30, legB: -40, shinB: 70, tail: 100 }],
    ],
    // the clipboard taunt (drawn by the art), tapping a foot very fast
    taunt: [
      [0, 'idle'],
      [6, { lean: 4, head: -6, armF: 84, foreF: 50, armB: 50, foreB: 100, legF: 30, shinF: 30, legB: -24, shinB: 30, tail: 165 }],
      [9, { lean: 4, head: -6, armF: 84, foreF: 50, armB: 50, foreB: 100, legF: 44, shinF: 60, legB: -24, shinB: 30, tail: 160, y: 1 }],
      [12, { lean: 4, head: -6, armF: 84, foreF: 50, armB: 50, foreB: 100, legF: 30, shinF: 30, legB: -24, shinB: 30, tail: 165 }],
      [15, { lean: 4, head: -6, armF: 84, foreF: 50, armB: 50, foreB: 100, legF: 44, shinF: 60, legB: -24, shinB: 30, tail: 160, y: 1 }],
      [18, { lean: 4, head: -6, armF: 84, foreF: 50, armB: 50, foreB: 100, legF: 30, shinF: 30, legB: -24, shinB: 30, tail: 165 }],
      [21, { lean: 4, head: -6, armF: 84, foreF: 50, armB: 50, foreB: 100, legF: 44, shinF: 60, legB: -24, shinB: 30, tail: 160, y: 1 }],
      [24, { lean: 4, head: -6, armF: 84, foreF: 50, armB: 50, foreB: 100, legF: 30, shinF: 30, legB: -24, shinB: 30, tail: 165 }],
      [27, { lean: 4, head: -6, armF: 84, foreF: 50, armB: 50, foreB: 100, legF: 44, shinF: 60, legB: -24, shinB: 30, tail: 160, y: 1 }],
      [30, { lean: 4, head: -6, armF: 84, foreF: 50, armB: 50, foreB: 100, legF: 30, shinF: 30, legB: -24, shinB: 30, tail: 165 }],
      [33, { lean: 4, head: -6, armF: 84, foreF: 50, armB: 50, foreB: 100, legF: 44, shinF: 60, legB: -24, shinB: 30, tail: 160, y: 1 }],
      [36, { lean: 4, head: -6, armF: 84, foreF: 50, armB: 50, foreB: 100, legF: 30, shinF: 30, legB: -24, shinB: 30, tail: 165 }],
      [48, { lean: 4, head: -6, armF: 84, foreF: 50, armB: 50, foreB: 100, legF: 30, shinF: 30, legB: -24, shinB: 30, tail: 165 }],
      [60, 'idle'],
    ],
  },
  projs: {
    acorn: { kind: 'acorn', r: 10, life: 40, vx: 15, vy: 2.5, grav: 0.2, hit: { dmg: 3.5, ang: 361, bkb: 16, kbg: 40, fx: 'hit' } },
    // the final thunderclap: a pinpoint strike on each bro (tiny, so bunched-up bros don't eat each other's bolts)
    thunder: { kind: 'thunder', r: 6, life: 14, ghost: true, pierce: true, hit: { dmg: 13, ang: 80, bkb: 72, kbg: 96, fx: 'elec', unblockable: true } },
  },
  moves: {
    jab1: {
      frames: 14,
      edgeStop: true,
      hits: [{ f: [2, 3], at: 'handF', r: 12, dmg: 2, ang: 361, bkb: 16, kbg: 22 }],
      next: [{ move: 'jab2', from: 3, to: 13 }],
      anim: [[0, 'idle'], [2, 'zJab1'], [7, 'zJab1'], [14, 'idle']],
    },
    jab2: {
      frames: 15,
      edgeStop: true,
      hits: [{ f: [2, 3], at: 'handB', r: 12, dmg: 2, ang: 361, bkb: 16, kbg: 22 }],
      next: [{ move: 'jab3', from: 3, to: 14 }],
      anim: [[0, 'zJab1'], [2, 'zJab2'], [8, 'zJab2'], [15, 'idle']],
    },
    jab3: {
      // rapid kick flurry: hold Attack to keep it going, release for the tail finisher
      frames: 12,
      loop: { from: 3, to: 9, on: 'attack', max: 14, end: 'jabFin' },
      hits: [
        { f: [3, 8], at: 'footF', r: 15, dmg: 0.7, ang: 361, bkb: 6, kbg: 12, rehit: 3 },
        { f: [3, 8], at: 'kneeF', r: 12, dmg: 0.7, ang: 361, bkb: 6, kbg: 12, rehit: 3 },
      ],
      anim: [[0, 'zKickB'], [3, 'zKickA'], [5, 'zKickB'], [7, 'zKickC'], [9, 'zKickB'], [12, 'idle']],
    },
    jabFin: {
      frames: 30,
      edgeStop: true,
      hits: [{ f: [6, 8], at: 'tail', r: 19, dmg: 3.5, ang: 45, bkb: 50, kbg: 110, fx: 'elec' }],
      anim: [[0, 'zKickB'], [4, 'zFinWind'], [7, 'zFin'], [14, 'zFin'], [30, 'idle']],
      sfx: [[6, 'whiff']],
    },
    ftilt: {
      frames: 26,
      edgeStop: true,
      hits: [
        { f: [6, 8], at: 'footF', r: 16, dmg: 7, ang: 361, bkb: 18, kbg: 92 },
        { f: [6, 8], at: 'kneeF', r: 12, dmg: 6, ang: 361, bkb: 18, kbg: 88 },
      ],
      anim: [[0, 'idle'], [4, 'zSpinKickWind'], [6, 'zSpinKick'], [12, 'zSpinKick'], [26, 'idle']],
      sfx: [[5, 'whiff']],
    },
    utilt: {
      frames: 24,
      edgeStop: true,
      hits: [{ f: [5, 10], at: 'tail', r: 19, dmg: 6, ang: 95, bkb: 30, kbg: 110, fx: 'elec' }],
      anim: [[0, 'idle'], [3, 'zUtiltA'], [7, 'zUtiltB', 'lin'], [10, 'zUtiltC'], [14, 'zUtiltC'], [24, 'idle']],
      sfx: [[4, 'whiff']],
    },
    dtilt: {
      frames: 20,
      edgeStop: true,
      hits: [{ f: [5, 7], at: 'tail', r: 18, dmg: 5, ang: 76, bkb: 32, kbg: 66, fx: 'elec' }],
      anim: [[0, 'crouch'], [3, 'zSweepA'], [6, 'zSweepB'], [11, 'zSweepB'], [20, 'crouch']],
      sfx: [[4, 'whiff']],
    },
    dash: {
      frames: 34,
      edgeStop: true,
      vel: [{ f: [1, 5], vx: 17 }, { f: [6, 16], vx: 13 }, { f: [17, 34], vx: 2 }],
      hits: [
        { f: [5, 10], at: 'footF', r: 17, dmg: 8, ang: 74, bkb: 62, kbg: 48 },
        { f: [5, 10], at: 'kneeF', r: 13, dmg: 7, ang: 74, bkb: 60, kbg: 46 },
        { f: [11, 16], at: 'footF', r: 14, dmg: 5, ang: 70, bkb: 45, kbg: 40 },
      ],
      anim: [[0, 'dash'], [4, 'zSlide'], [18, 'zSlide'], [26, 'crouch'], [34, 'idle']],
      sfx: [[4, 'dash']],
    },
    fsmash: {
      frames: 42,
      edgeStop: true,
      charge: 9,
      hits: [
        { f: [12, 14], at: 'tail', r: 22, dmg: 15, ang: 361, bkb: 30, kbg: 100, fx: 'elec' },
        { f: [12, 14], at: 'hip', x: 26, y: 18, r: 18, dmg: 11, ang: 361, bkb: 28, kbg: 96, fx: 'elec' },
      ],
      anim: [[0, 'idle'], [6, 'zTailWind'], [10, ['zTailWind', { lean: -24, tail: 60 }]], [12, 'zTailOver', 'lin'], [14, 'zTailHit'], [22, 'zTailHit'], [42, 'idle']],
      sfx: [[11, 'whiff'], [13, 'zap']],
    },
    usmash: {
      frames: 40,
      edgeStop: true,
      charge: 6,
      hits: [
        { f: [9, 14], at: 'handF', y: 6, r: 20, dmg: 14, ang: 90, bkb: 32, kbg: 98, fx: 'elec' },
        { f: [9, 14], at: 'tail', r: 20, dmg: 13, ang: 90, bkb: 32, kbg: 96, fx: 'elec' },
        { f: [9, 14], at: 'head', y: 10, r: 18, dmg: 12, ang: 90, bkb: 30, kbg: 95, fx: 'elec' },
      ],
      anim: [[0, 'idle'], [6, 'zUpWind'], [9, 'zUpHit'], [18, 'zUpHit'], [40, 'idle']],
      sfx: [[9, 'zap']],
    },
    dsmash: {
      frames: 40,
      edgeStop: true,
      charge: 5,
      hits: [
        { f: [7, 9], at: 'tail', y: 6, r: 23, dmg: 12, ang: 30, bkb: 30, kbg: 94, fx: 'elec' },
        { f: [14, 16], at: 'tail', y: 6, r: 23, dmg: 13, ang: 150, bkb: 30, kbg: 96, fx: 'elec', grp: 1 },
      ],
      anim: [[0, 'crouch'], [5, ['zBreakDown', { tail: 60 }]], [7, 'zBreakF'], [10, 'zBreakF'], [12, 'zBreakDown', 'lin'], [14, 'zBreakB'], [22, 'zBreakB'], [40, 'idle']],
      sfx: [[6, 'whiff'], [13, 'whiff']],
    },
    nair: {
      frames: 32,
      air: true,
      landLag: 6,
      autoCancel: [3, 26],
      hits: [
        { f: [3, 16], at: 'hip', y: 16, r: 26, dmg: 1.5, ang: 361, bkb: 10, kbg: 18, rehit: 4, fx: 'elec' },
        { f: [17, 19], at: 'hip', y: 16, r: 30, dmg: 4, ang: 45, bkb: 40, kbg: 100, fx: 'elec', grp: 1 },
      ],
      anim: [[0, ['tuck', { rot: 0, tail: 160 }]], [3, ['zBall', { rot: 0 }]], [19, ['zBall', { rot: 720 }], 'lin'], [24, ['tuck', { rot: 720, tail: 150 }]], [32, ['fall', { rot: 720, tail: 125 }]]],
      sfx: [[3, 'zap']],
    },
    fair: {
      frames: 34,
      air: true,
      landLag: 10,
      autoCancel: [3, 28],
      hits: [
        { f: [7, 10], at: 'footF', r: 17, dmg: 9, ang: 45, bkb: 30, kbg: 96 },
        { f: [7, 10], at: 'footB', r: 15, dmg: 8, ang: 45, bkb: 30, kbg: 92 },
      ],
      anim: [[0, 'fall'], [4, ['zFairWind', { rot: -30 }]], [7, ['zFair', { rot: 30 }]], [14, ['zFair', { rot: 40 }]], [34, ['fall', { rot: 0 }]]],
      sfx: [[6, 'whiff']],
    },
    bair: {
      frames: 30,
      air: true,
      landLag: 8,
      autoCancel: [3, 24],
      hits: [{ f: [6, 9], at: 'tail', r: 21, dmg: 11.5, ang: 140, bkb: 22, kbg: 100, fx: 'elec' }],
      anim: [[0, 'fall'], [3, 'zBairWind'], [7, 'zBair', 'lin'], [10, 'zBairEnd'], [16, 'zBairEnd'], [30, 'fall']],
      sfx: [[5, 'whiff']],
    },
    uair: {
      frames: 28,
      air: true,
      landLag: 7,
      autoCancel: [3, 22],
      hits: [{ f: [5, 9], at: 'tail', r: 20, dmg: 7.5, ang: 82, bkb: 26, kbg: 108, fx: 'elec' }],
      anim: [[0, 'fall'], [3, 'zUairA'], [6, 'zUairB', 'lin'], [9, 'zUairC'], [14, 'zUairC'], [28, 'fall']],
      sfx: [[4, 'whiff']],
    },
    dair: {
      frames: 36,
      air: true,
      landLag: 14,
      autoCancel: [3, 30],
      hits: [
        { f: [10, 12], at: 'footF', r: 16, dmg: 10, ang: 270, bkb: 20, kbg: 80 },
        { f: [10, 12], at: 'footB', r: 15, dmg: 10, ang: 270, bkb: 20, kbg: 80 },
        { f: [13, 20], at: 'footF', r: 13, dmg: 6, ang: 361, bkb: 16, kbg: 66 },
      ],
      anim: [[0, 'fall'], [6, 'zDairWind'], [9, 'zDairWind'], [11, 'zDair'], [20, 'zDair'], [36, 'fall']],
    },
    grab: {
      frames: 28,
      edgeStop: true,
      hits: [{ f: [6, 7], at: 'handF', r: 15, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'ready'], [6, ['grab', { tail: 140 }]], [11, ['grab', { tail: 140 }]], [28, 'idle']],
    },
    dashgrab: {
      frames: 34,
      edgeStop: true,
      vel: [{ f: [1, 9], vx: 11 }, { f: [10, 34], vx: 1 }],
      hits: [{ f: [8, 10], at: 'handF', r: 17, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'dash'], [8, ['grab', { tail: 110 }]], [14, ['grab', { tail: 120 }]], [34, 'idle']],
    },
    pummel: { frames: 12, pummel: 1.1, anim: [[0, 'hold'], [3, 'zNibble'], [12, 'hold']] },
    fthrow: {
      frames: 26,
      throw: { release: 8, hit: { dmg: 7, ang: 40, bkb: 60, kbg: 58 } },
      anim: [[0, 'hold'], [4, 'zSpinKickWind'], [8, 'zSpinKick'], [16, 'zSpinKick'], [26, 'idle']],
    },
    bthrow: {
      frames: 30,
      throw: { release: 13, hit: { dmg: 9, ang: 140, bkb: 60, kbg: 68, fx: 'elec' } },
      anim: [[0, 'hold'], [6, ['throwF', { rot: -100, tail: 180 }]], [11, ['throwB', { rot: -220, tail: 120 }]], [15, ['throwB', { rot: -330, tail: 100 }]], [30, ['idle', { rot: -360 }]]],
    },
    uthrow: {
      frames: 32,
      throw: { release: 10, hit: { dmg: 6, ang: 90, bkb: 70, kbg: 60 } },
      anim: [[0, 'hold'], [5, 'zCoil'], [10, 'zToss'], [20, 'zToss'], [32, 'idle']],
    },
    dthrow: {
      frames: 32,
      throw: { release: 14, holdAt: 'footF', hx: 0, hy: -40, hit: { dmg: 5, ang: 76, bkb: 60, kbg: 30 } },
      anim: [[0, 'hold'], [5, 'zDairWind'], [9, 'zDair'], [12, 'zDairWind'], [14, 'zDair'], [20, 'crouch'], [32, 'idle']],
      sfx: [[9, 'hit'], [14, 'thud']],
    },
    nspec: {
      frames: 24,
      edgeStop: true,
      shots: [{ f: 6, proj: 'acorn', at: 'handF', x: 6 }],
      anim: [[0, 'idle'], [3, 'zFlickWind'], [6, 'zFlick'], [14, 'zFlick'], [24, 'idle']],
      sfx: [[6, 'whiff']],
    },
    nspecAir: {
      frames: 26,
      shots: [{ f: 6, proj: 'acorn', at: 'handF', x: 6 }],
      anim: [[0, 'fall'], [3, 'zFlickWind'], [6, 'zFlick'], [14, 'zFlick'], [26, 'fall']],
      sfx: [[6, 'whiff']],
    },
    sspec: {
      frames: 36,
      turn: true,
      oncePerAir: true,
      vel: [{ f: [1, 4], vx: 0, vy: 0, grav: 0 }, { f: [5, 16], vx: 25, vy: 0, grav: 0, noDrift: true }, { f: [17, 36], vx: 3, grav: 0.8 }],
      hits: [
        { f: [5, 16], at: 'neck', r: 24, dmg: 7, ang: 55, bkb: 50, kbg: 55, fx: 'elec' },
        { f: [5, 16], at: 'hip', r: 22, dmg: 7, ang: 55, bkb: 50, kbg: 55, fx: 'elec' },
      ],
      anim: [[0, 'crouch'], [4, ['crouch', { lean: 60 }]], [6, 'zBolt'], [16, 'zBolt'], [24, ['fall', { rot: 0 }]], [36, 'fall']],
      sfx: [[5, 'zap']],
    },
    uspec: {
      frames: 42,
      helpless: true,
      landHelpless: 20,
      ledgeFrom: 8,
      reverse: true,
      vel: [{ f: [1, 4], vx: 0, vy: 0, grav: 0.2 }, { f: [5, 19], vx: 3, vy: 22, grav: 0 }, { f: [20, 42], grav: 0.8 }],
      hits: [
        { f: [5, 7], at: 'footF', r: 22, dmg: 6, ang: 85, bkb: 60, kbg: 60, fx: 'elec' },
        { f: [8, 17], at: 'tail', r: 20, dmg: 2, ang: 80, bkb: 30, kbg: 20, rehit: 4, fx: 'elec', grp: 1 },
        { f: [18, 20], at: 'hip', y: 20, r: 26, dmg: 4, ang: 80, bkb: 60, kbg: 84, fx: 'elec', grp: 2 },
      ],
      anim: [[0, 'zCoil'], [4, ['zCoil', { y: -4 }]], [6, ['zSpring', { rot: 0 }]], [18, ['zSpring', { rot: -720 }], 'lin'], [22, ['tuck', { rot: -720 }]], [42, ['helpless', { rot: -720 }]]],
      sfx: [[5, 'boing'], [9, 'zap']],
    },
    dspec: {
      frames: 42,
      edgeStop: true,
      script: 'zippy:static',
      anim: [[0, 'idle'], [4, 'zFluffA'], [7, 'zFluffB'], [10, 'zFluffA'], [13, 'zFluffB'], [16, 'zFluffA'], [19, 'zFluffB'], [24, 'zZap'], [32, 'zZap'], [42, 'idle']],
      sfx: [[4, 'zap'], [24, 'elec']],
    },
    dspecAir: {
      frames: 42,
      script: 'zippy:static',
      vel: [{ f: [1, 30], grav: 0.45 }],
      anim: [[0, 'fall'], [4, 'zFluffA'], [7, 'zFluffB'], [10, 'zFluffA'], [13, 'zFluffB'], [16, 'zFluffA'], [19, 'zFluffB'], [24, 'zZap'], [32, 'zZap'], [42, 'fall']],
      sfx: [[4, 'zap'], [24, 'elec']],
    },
    dspecZap: {
      frames: 34,
      edgeStop: true,
      script: 'zippy:zap',
      hits: [{ f: [5, 9], at: 'hip', y: 26, r: 62, dmg: 9, ang: 75, bkb: 56, kbg: 80, fx: 'elec' }],
      anim: [[0, 'zFluffA'], [4, 'zZap'], [14, 'zZap'], [34, 'idle']],
      sfx: [[5, 'elec']],
    },
    dspecZapAir: {
      frames: 34,
      script: 'zippy:zap',
      vel: [{ f: [1, 14], grav: 0.4 }],
      hits: [{ f: [5, 9], at: 'hip', y: 26, r: 62, dmg: 9, ang: 75, bkb: 56, kbg: 80, fx: 'elec' }],
      anim: [[0, 'zFluffA'], [4, 'zZap'], [14, 'zZap'], [34, 'fall']],
      sfx: [[5, 'elec']],
    },
    ledgeatk: {
      frames: 46,
      hits: [{ f: [16, 19], at: 'tail', r: 20, dmg: 8, ang: 361, bkb: 45, kbg: 45, fx: 'elec' }],
      anim: [[0, 'climb'], [12, 'zFinWind'], [17, 'zFin'], [26, 'zFin'], [46, 'idle']],
    },
    getupatk: {
      frames: 42,
      hits: [
        { f: [13, 15], at: 'tail', r: 20, dmg: 7, ang: 361, bkb: 50, kbg: 40, fx: 'elec' },
        { f: [20, 22], at: 'tail', r: 20, dmg: 7, ang: 150, bkb: 50, kbg: 40, fx: 'elec', grp: 1 },
      ],
      anim: [[0, 'lying'], [10, ['zBreakDown', { tail: 40 }]], [13, 'zBreakF'], [17, 'zBreakDown', 'lin'], [20, 'zBreakB'], [28, 'zBreakB'], [42, 'idle']],
    },
    ult: {
      frames: 96,
      edgeStop: true,
      ult: true,
      script: 'zippy:ult',
      vel: [{ f: [2, 79], vx: 0, vy: 0, grav: 0, noDrift: true }, { f: [80, 96], vx: 0, grav: 1 }],
      hits: [{ f: [8, 77], at: 'hip', y: 20, r: 58, dmg: 1.3, ang: 80, bkb: 30, kbg: 6, rehit: 6, fx: 'elec', hitlag: 0.35, unblockable: true }],
      anim: [[0, 'zZap'], [6, ['zBolt', { rot: 40 }]], [78, ['zBolt', { rot: 40 }]], [82, 'zZap'], [96, 'idle']],
      sfx: [[1, 'elec'], [80, 'boom']],
    },
  },
};

function foes(st: State, f: Fighter): Fighter[] {
  const cam = STAGES[st.stage].cam;
  const out: Fighter[] = [];
  for (const t of st.fighters) {
    if (t.i === f.i || t.out || t.act === A.DEAD || t.act === A.RESPAWN) continue;
    if (st.cfg.teams && t.team === f.team) continue;
    if (t.x < cam.l || t.x > cam.r || t.y < cam.t || t.y > cam.b) continue;
    out.push(t);
  }
  return out;
}

registerScripts({
  'zippy:passive': (st, f) => {
    if (f.act === A.DEAD) f.v[0] = 0;
  },
  // Static Charge: fluff the tail, store the charge. Already charged? Discharge it as a burst instead.
  'zippy:static': (st, f) => {
    if (f.mf === 1 && f.v[0] >= 1) {
      startMove(st, f, f.gnd >= 0 ? 'dspecZap' : 'dspecZapAir');
      return;
    }
    if (f.mf === 24) {
      f.v[0] = 1;
      ev(st, 'charged', f.x, f.y - bodyH(st, f) * 0.5, f.i);
    }
  },
  'zippy:zap': (st, f) => {
    if (f.mf === 12) f.v[0] = 0;
  },
  // stored static: the next hit is electric and stronger (throws use it up straight away)
  'zippy:mult': (st, f, m, out) => {
    if (f.v[0] < 1) return;
    out.dmg *= 1.4;
    out.kb *= 1.2;
    out.fx = 'elec';
    if (f.act === A.MOVE && cfOf(f).moves[f.mv].throw) f.v[0] = 0;
  },
  'zippy:onhit': (st, f) => {
    if (f.v[0] >= 1) {
      f.v[0] = 0;
      ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'elec');
    }
  },
  // Thunder Rush: zip from bro to bro (everyone on camera, in turn), then a thunderclap on each and home again.
  // v[2], v[3] = home; v[4] = hops; v[5], v[6] = where the last zip started (for the art's lightning streak); v[7] = when
  'zippy:ult': (st, f) => {
    if (f.mf === 1) {
      f.v[2] = f.x;
      f.v[3] = f.y;
      f.v[4] = 0;
      f.v[7] = -99;
      return;
    }
    if (f.mf >= 8 && f.mf <= 74 && (f.mf - 8) % 6 === 0) {
      const list = foes(st, f);
      if (!list.length) return;
      const t = list[f.v[4] % list.length];
      f.v[4]++;
      const side = f.v[4] % 2 ? -1 : 1;
      f.v[5] = f.x;
      f.v[6] = f.y;
      f.v[7] = f.mf;
      f.x = t.x + side * 36;
      f.y = t.y - 8;
      f.facing = -side;
      f.gnd = -1;
      f.vx = 0;
      f.vy = 0;
      ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'zap');
    }
    if (f.mf === 80) {
      const pk = cfOf(f).projIdx.thunder;
      for (const t of foes(st, f)) spawnProj(st, f, pk, t.x, t.y - bodyH(st, t) * 0.5);
      f.v[5] = f.x;
      f.v[6] = f.y;
      f.v[7] = f.mf;
      f.x = f.v[2];
      f.y = f.v[3] - 2;
      f.gnd = -1;
      f.vx = 0;
      f.vy = 0;
      ev(st, 'flash', f.x, f.y, f.i);
    }
  },
});
