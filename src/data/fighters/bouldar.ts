// Bouldar — super heavy. A gentle rock golem from Mount Grumble: huge, slow, long-armed, armour on his smash attacks.
// Fists are the business end (hitboxes on handF/handB). Boulders roll, the ground quakes, a pillar of stone carries
// him back to the stage.
import { spawnProj } from '../../sim/projectiles';
import { registerScripts } from '../../sim/scripts';
import { STAGES } from '../../sim/data';
import { ev } from '../../sim/events';
import { rint } from '../../sim/rng';
import { cfOf } from '../../sim/fighter';
import type { FighterDef } from '../../sim/types';

export const bouldar: FighterDef = {
  id: 'bouldar',
  name: 'Bouldar',
  title: 'Rock Solid',
  role: 'Super heavy',
  color: '#9a8f86',
  weight: 135,
  power: 0.93,
  scale: 1.1,
  rig: { thigh: 22, shin: 20, torso: 50, head: 23, upper: 28, fore: 27, girth: 27, limb: 12 },
  stats: { walk: 7, dash: 13.5, run: 11.5, dashFrames: 13, airSpeed: 8.2, airAccel: 0.42, airFric: 0.1, groundFric: 0.95, grav: 0.9, fall: 15.5, ffall: 24, jump: 19.5, hop: 13, djump: 18.5, jumps: 1, squat: 5 },
  bio: 'A gentle golem who spent four hundred years sitting very still on Mount Grumble so a family of birds could nest on his head. Came down the mountain because the birds said he should make some friends his own size. Nobody is his size. He loves everyone anyway.',
  line: 'Bouldar think you very pebble. Bouldar mean that as highest compliment.',
  taunt: 'Holds out a fist for a bump. A tiny bird lands on it instead. He is overjoyed.',
  wins: ['Bro… rock… solid.', 'Bouldar sorry for smashing. Bouldar not sorry for hug after.', 'You sturdy little pebble. Bouldar keep you in pocket forever. Bouldar not have pocket. Bouldar get pocket.'],
  moveNames: { nspec: 'Boulder Roll', sspec: 'Avalanche Charge', uspec: 'Geyser Leap', dspec: 'Quake Slam', ult: 'Landslide' },
  shieldR: 96,
  poses: {
    // a hunched, long-armed stance; knuckles nearly on the ground
    idle: { lean: 20, head: -8, armF: 18, foreF: 16, armB: 8, foreB: 20, legF: 26, shinF: 30, legB: -24, shinB: 26 },
    ready: { lean: 26, head: -10, armF: 34, foreF: 30, armB: 24, foreB: 34, legF: 32, shinF: 40, legB: -28, shinB: 34 },
    crouch: { lean: 40, head: -16, armF: 40, foreF: 20, armB: 30, foreB: 20, legF: 72, shinF: 110, legB: 14, shinB: 110 },
    shield: { lean: 24, head: -10, armF: 80, foreF: 110, armB: 74, foreB: 110, legF: 32, shinF: 40, legB: -26, shinB: 30 },
    // jabs
    bJabWind: { lean: 16, armF: 40, foreF: 60, armB: 10, foreB: 20, legF: 28, shinF: 30, legB: -24, shinB: 26 },
    bJab1: { lean: 28, armF: 104, foreF: 0, armB: 0, foreB: 30, legF: 34, shinF: 30, legB: -30, shinB: 20 },
    bJab2: { lean: 30, armF: 20, foreF: 40, armB: 106, foreB: 0, legF: 34, shinF: 30, legB: -32, shinB: 20 },
    bHammerWind: { lean: -6, head: -10, armF: 176, foreF: 30, armB: 170, foreB: 30, legF: 26, shinF: 24, legB: -24, shinB: 20 },
    bHammer: { lean: 38, armF: 82, foreF: 0, armB: 78, foreB: 0, legF: 42, shinF: 40, legB: -36, shinB: 20 },
    // tilts
    bBackhandWind: { lean: 8, armF: -50, foreF: 70, armB: 40, foreB: 40, legF: 28, shinF: 30, legB: -26, shinB: 24 },
    bBackhand: { lean: 30, armF: 106, foreF: 6, armB: -20, foreB: 40, legF: 42, shinF: 30, legB: -36, shinB: 10 },
    bUpA: { lean: 20, armF: 50, foreF: 20, armB: 10, foreB: 30, legF: 30, shinF: 34, legB: -26, shinB: 26 },
    bUpB: { lean: 4, head: -14, armF: 150, foreF: 0, armB: 10, foreB: 30, legF: 20, shinF: 20, legB: -20, shinB: 16 },
    bUpC: { lean: -10, head: -20, armF: 210, foreF: 10, armB: 10, foreB: 30, legF: 20, shinF: 20, legB: -22, shinB: 16 },
    bKnuckle: { lean: 48, head: -12, armF: 72, foreF: 0, armB: 20, foreB: 30, legF: 70, shinF: 92, legB: -10, shinB: 80 },
    bBall: { lean: 40, head: 20, armF: 120, foreF: 140, armB: 110, foreB: 140, legF: 110, shinF: 140, legB: 100, shinB: 140 },
    // smashes
    bFistWind: { lean: -20, head: -6, armF: -74, foreF: 84, armB: 64, foreB: 40, legF: 36, shinF: 44, legB: -42, shinB: 20 },
    bFist: { lean: 38, head: -4, armF: 108, foreF: 0, armB: -40, foreB: 30, legF: 66, shinF: 40, legB: -62, shinB: 4 },
    bSummitWind: { lean: 36, head: -10, armF: 20, foreF: 30, armB: 16, foreB: 30, legF: 68, shinF: 104, legB: 14, shinB: 104 },
    bSummit: { lean: -6, head: -18, armF: 176, foreF: 0, armB: 168, foreB: 0, legF: 8, shinF: 6, legB: -8, shinB: 6, y: 6 },
    bFaultWind: { lean: -2, head: -10, armF: 172, foreF: 20, armB: 168, foreB: 20, legF: 40, shinF: 40, legB: -40, shinB: 30 },
    bFault: { lean: 42, head: 6, armF: 98, foreF: 0, armB: -26, foreB: 0, legF: 64, shinF: 76, legB: -42, shinB: 64 },
    // aerials
    bSpinArms: { lean: 0, armF: 96, foreF: 0, armB: -96, foreB: 0, legF: 30, shinF: 50, legB: -20, shinB: 50 },
    bAxeWind: { lean: -14, head: -10, armF: 184, foreF: 24, armB: 178, foreB: 24, legF: 40, shinF: 80, legB: 10, shinB: 80 },
    bAxe: { lean: 30, armF: 70, foreF: 0, armB: 64, foreB: 0, legF: 40, shinF: 60, legB: -10, shinB: 70 },
    bBackfistWind: { lean: 24, armF: 40, foreF: 60, armB: 70, foreB: 70, legF: 40, shinF: 70, legB: -10, shinB: 70 },
    bBackfist: { lean: 10, head: 16, armF: 40, foreF: 60, armB: -96, foreB: 0, legF: 30, shinF: 60, legB: -40, shinB: 40 },
    bHeadbuttUp: { lean: -32, head: -30, armF: 40, foreF: 60, armB: -40, foreB: 60, legF: 60, shinF: 100, legB: 20, shinB: 100 },
    bStompWind: { lean: 0, armF: 150, foreF: 20, armB: 144, foreB: 20, legF: 90, shinF: 120, legB: 80, shinB: 120 },
    bStomp: { lean: 0, armF: 156, foreF: 10, armB: 150, foreB: 10, legF: 6, shinF: 0, legB: -6, shinB: 0 },
    // specials and throws
    bLift: { lean: 52, head: -10, armF: 62, foreF: 10, armB: 56, foreB: 10, legF: 70, shinF: 100, legB: -10, shinB: 90 },
    bHeave: { lean: 0, head: -10, armF: 120, foreF: 40, armB: 114, foreB: 40, legF: 30, shinF: 30, legB: -26, shinB: 24 },
    bPush: { lean: 32, armF: 98, foreF: 8, armB: 94, foreB: 8, legF: 52, shinF: 30, legB: -44, shinB: 8 },
    bShoulder: { lean: 42, head: 8, armF: 30, foreF: 80, armB: -30, foreB: 60, legF: 62, shinF: 40, legB: -52, shinB: 10 },
    bLeap: { lean: -6, head: -16, armF: 172, foreF: 8, armB: 162, foreB: 8, legF: 10, shinF: 30, legB: -10, shinB: 30 },
    bQuakeWind: { lean: -8, head: -12, armF: 120, foreF: 40, armB: 110, foreB: 40, legF: 92, shinF: 90, legB: -10, shinB: 16 },
    bQuake: { lean: 22, armF: 60, foreF: 30, armB: 50, foreB: 30, legF: 30, shinF: 10, legB: -30, shinB: 30 },
    bRoar: { lean: -10, head: -22, armF: 160, foreF: 30, armB: 150, foreB: 30, legF: 30, shinF: 20, legB: -30, shinB: 20 },
    bSlam: { lean: 52, head: 0, armF: 62, foreF: 0, armB: 56, foreB: 0, legF: 60, shinF: 80, legB: -30, shinB: 60 },
    bSqueeze: { lean: 10, armF: 74, foreF: 76, armB: 68, foreB: 76, legF: 26, shinF: 30, legB: -24, shinB: 26 },
    bShoulderToss: { lean: 46, armF: 250, foreF: 10, armB: 240, foreB: 10, legF: 40, shinF: 30, legB: -30, shinB: 10 },
  },
  base: {
    noflip: [],
    // fist bump... a bird lands on it instead (the art draws the bird)
    taunt: [
      [0, 'idle'],
      [10, { lean: 18, head: -6, armF: 92, foreF: 10, armB: 8, foreB: 20, legF: 26, shinF: 30, legB: -24, shinB: 26 }],
      [40, { lean: 14, head: 6, armF: 96, foreF: 30, armB: 8, foreB: 20, legF: 26, shinF: 30, legB: -24, shinB: 26 }],
      [48, { lean: 10, head: -4, armF: 100, foreF: 40, armB: 140, foreB: 40, legF: 26, shinF: 30, legB: -24, shinB: 26, y: 3 }],
      [54, { lean: 10, head: -4, armF: 100, foreF: 40, armB: 160, foreB: 20, legF: 26, shinF: 30, legB: -24, shinB: 26 }],
      [60, 'idle'],
    ],
  },
  projs: {
    boulder: { kind: 'boulder', r: 30, life: 120, vx: 7.5, vy: 4, grav: 0.8, roll: true, hp: 22, hit: { dmg: 12, ang: 45, bkb: 45, kbg: 68, fx: 'rock' } },
    pillar: { kind: 'pillar', r: 36, life: 24, ghost: true, pierce: true, hit: { dmg: 10, ang: 88, bkb: 62, kbg: 70, fx: 'rock' } },
    quake: { kind: 'quake', r: 24, life: 30, vx: 12, grav: 1, roll: true, pierce: true, hit: { dmg: 8, ang: 75, bkb: 55, kbg: 55, fx: 'rock' } },
    landslide: { kind: 'boulder', r: 44, life: 100, vy: -3, grav: 0.85, roll: true, pierce: true, hit: { dmg: 6, ang: 70, bkb: 50, kbg: 62, fx: 'rock', unblockable: true } },
  },
  moves: {
    jab1: {
      frames: 22,
      edgeStop: true,
      hits: [{ f: [5, 6], at: 'handF', r: 20, dmg: 4, ang: 361, bkb: 20, kbg: 30, fx: 'rock' }],
      next: [{ move: 'jab2', from: 6, to: 20 }],
      anim: [[0, 'bJabWind'], [5, 'bJab1'], [11, 'bJab1'], [22, 'idle']],
    },
    jab2: {
      frames: 24,
      edgeStop: true,
      hits: [{ f: [5, 6], at: 'handB', r: 20, dmg: 4, ang: 361, bkb: 20, kbg: 30, fx: 'rock' }],
      next: [{ move: 'jab3', from: 6, to: 22 }],
      anim: [[0, 'bJab1'], [5, 'bJab2'], [12, 'bJab2'], [24, 'idle']],
    },
    jab3: {
      frames: 38,
      edgeStop: true,
      hits: [
        { f: [10, 12], at: 'handF', r: 24, dmg: 7.5, ang: 50, bkb: 55, kbg: 92, fx: 'rock' },
        { f: [10, 12], at: 'handB', r: 22, dmg: 7.5, ang: 50, bkb: 55, kbg: 92, fx: 'rock' },
      ],
      anim: [[0, 'bJab2'], [7, 'bHammerWind'], [11, 'bHammer'], [20, 'bHammer'], [38, 'idle']],
      sfx: [[11, 'thud']],
    },
    ftilt: {
      frames: 34,
      edgeStop: true,
      hits: [
        { f: [10, 12], at: 'handF', r: 25, dmg: 12.5, ang: 361, bkb: 26, kbg: 94, fx: 'rock' },
        { f: [10, 12], at: 'elbowF', r: 17, dmg: 10, ang: 361, bkb: 24, kbg: 90, fx: 'rock' },
      ],
      anim: [[0, 'idle'], [7, 'bBackhandWind'], [11, 'bBackhand'], [18, 'bBackhand'], [34, 'idle']],
      sfx: [[9, 'whiff']],
    },
    utilt: {
      frames: 36,
      edgeStop: true,
      hits: [
        { f: [9, 15], at: 'handF', r: 25, dmg: 11, ang: 95, bkb: 30, kbg: 112, fx: 'rock' },
        { f: [9, 15], at: 'elbowF', r: 18, dmg: 9, ang: 95, bkb: 30, kbg: 106, fx: 'rock' },
      ],
      anim: [[0, 'idle'], [6, 'bUpA'], [10, 'bUpB', 'lin'], [14, 'bUpC'], [20, 'bUpC'], [36, 'idle']],
      sfx: [[8, 'whiff']],
    },
    dtilt: {
      frames: 30,
      edgeStop: true,
      hits: [
        { f: [9, 11], at: 'handF', r: 23, dmg: 9, ang: 30, bkb: 42, kbg: 74, fx: 'rock' },
        { f: [9, 11], at: 'elbowF', r: 16, dmg: 7, ang: 35, bkb: 40, kbg: 70, fx: 'rock' },
      ],
      anim: [[0, 'crouch'], [6, ['bKnuckle', { armF: 130 }]], [10, 'bKnuckle'], [18, 'bKnuckle'], [30, 'crouch']],
      sfx: [[10, 'thud']],
    },
    dash: {
      frames: 46,
      edgeStop: true,
      vel: [{ f: [1, 8], vx: 13 }, { f: [9, 24], vx: 12 }, { f: [25, 46], vx: 1.5 }],
      hits: [
        { f: [8, 24], at: 'hip', r: 34, dmg: 13, ang: 50, bkb: 62, kbg: 64, fx: 'rock' },
        { f: [8, 24], at: 'neck', r: 32, dmg: 13, ang: 50, bkb: 62, kbg: 64, fx: 'rock' },
      ],
      anim: [[0, 'dash'], [6, ['bBall', { rot: 0 }]], [26, ['bBall', { rot: 720 }], 'lin'], [34, ['crouch', { rot: 720 }]], [46, ['idle', { rot: 720 }]]],
      sfx: [[8, 'thud'], [16, 'thud']],
    },
    fsmash: {
      frames: 58,
      edgeStop: true,
      charge: 12,
      armor: [5, 20, 15],
      hits: [
        { f: [17, 20], at: 'handF', x: 6, r: 30, dmg: 24, ang: 361, bkb: 34, kbg: 98, fx: 'rock' },
        { f: [17, 20], at: 'elbowF', r: 20, dmg: 19, ang: 361, bkb: 32, kbg: 95, fx: 'rock' },
      ],
      anim: [[0, 'idle'], [9, 'bFistWind'], [14, ['bFistWind', { lean: -26, armF: -84 }]], [17, ['bFist', { armF: 90 }], 'lin'], [19, 'bFist'], [30, 'bFist'], [58, 'idle']],
      sfx: [[16, 'whiff'], [18, 'boom']],
    },
    usmash: {
      frames: 52,
      edgeStop: true,
      charge: 8,
      armor: [4, 17, 15],
      hits: [
        { f: [12, 18], at: 'handF', r: 30, dmg: 21, ang: 88, bkb: 34, kbg: 96, fx: 'rock' },
        { f: [12, 18], at: 'handB', r: 28, dmg: 20, ang: 92, bkb: 34, kbg: 95, fx: 'rock' },
        { f: [12, 14], at: 'hip', x: 40, y: 10, r: 28, dmg: 8, ang: 100, bkb: 70, kbg: 30, fx: 'rock' },
      ],
      anim: [[0, 'idle'], [8, 'bSummitWind'], [12, 'bSummit'], [24, 'bSummit'], [52, 'idle']],
      sfx: [[12, 'boom']],
    },
    dsmash: {
      frames: 54,
      edgeStop: true,
      charge: 6,
      armor: [4, 16, 15],
      hits: [
        { f: [13, 16], at: 'handF', r: 32, dmg: 19, ang: 30, bkb: 32, kbg: 96, fx: 'rock' },
        { f: [13, 16], at: 'handB', r: 32, dmg: 19, ang: 150, bkb: 32, kbg: 96, fx: 'rock' },
      ],
      anim: [[0, 'crouch'], [8, 'bFaultWind'], [12, ['bFault', { armF: 130, armB: 40 }], 'lin'], [14, 'bFault'], [26, 'bFault'], [54, 'idle']],
      sfx: [[13, 'boom']],
    },
    nair: {
      frames: 42,
      air: true,
      landLag: 10,
      autoCancel: [3, 36],
      hits: [
        { f: [6, 10], at: 'handF', r: 26, dmg: 12, ang: 361, bkb: 22, kbg: 96, fx: 'rock' },
        { f: [6, 10], at: 'handB', r: 26, dmg: 12, ang: 361, bkb: 22, kbg: 96, fx: 'rock' },
        { f: [11, 20], at: 'handF', r: 22, dmg: 8, ang: 361, bkb: 16, kbg: 88, fx: 'rock' },
        { f: [11, 20], at: 'handB', r: 22, dmg: 8, ang: 361, bkb: 16, kbg: 88, fx: 'rock' },
      ],
      anim: [[0, 'tuck'], [5, ['bSpinArms', { rot: 0 }]], [20, ['bSpinArms', { rot: 360 }], 'lin'], [26, ['tuck', { rot: 360 }]], [42, ['fall', { rot: 360 }]]],
      sfx: [[6, 'whiff']],
    },
    fair: {
      frames: 46,
      air: true,
      landLag: 14,
      autoCancel: [3, 40],
      hits: [
        { f: [13, 16], at: 'handF', r: 26, dmg: 16, ang: 40, bkb: 36, kbg: 96, fx: 'rock' },
        { f: [13, 16], at: 'handB', r: 24, dmg: 15, ang: 40, bkb: 34, kbg: 94, fx: 'rock' },
      ],
      anim: [[0, 'fall'], [8, 'bAxeWind'], [12, 'bAxeWind'], [15, 'bAxe'], [26, 'bAxe'], [46, 'fall']],
      sfx: [[13, 'whiff']],
    },
    bair: {
      frames: 40,
      air: true,
      landLag: 12,
      autoCancel: [3, 34],
      hits: [
        { f: [9, 12], at: 'handB', r: 27, dmg: 16, ang: 145, bkb: 24, kbg: 100, fx: 'rock' },
        { f: [9, 12], at: 'elbowB', r: 19, dmg: 13, ang: 145, bkb: 22, kbg: 96, fx: 'rock' },
      ],
      anim: [[0, 'fall'], [6, 'bBackfistWind'], [10, 'bBackfist'], [18, 'bBackfist'], [40, 'fall']],
      sfx: [[9, 'whiff']],
    },
    uair: {
      frames: 38,
      air: true,
      landLag: 10,
      autoCancel: [3, 32],
      hits: [{ f: [8, 13], at: 'head', y: 12, r: 32, dmg: 14, ang: 85, bkb: 28, kbg: 108, fx: 'rock' }],
      anim: [[0, 'fall'], [5, ['tuck', { head: 10 }]], [9, 'bHeadbuttUp'], [18, 'bHeadbuttUp'], [38, 'fall']],
      sfx: [[8, 'whiff']],
    },
    dair: {
      frames: 50,
      air: true,
      landLag: 20,
      autoCancel: [3, 44],
      hits: [
        { f: [15, 18], at: 'footF', r: 26, dmg: 17, ang: 270, bkb: 22, kbg: 88, fx: 'rock' },
        { f: [15, 18], at: 'footB', r: 24, dmg: 17, ang: 270, bkb: 22, kbg: 88, fx: 'rock' },
        { f: [19, 26], at: 'footF', r: 20, dmg: 10, ang: 361, bkb: 20, kbg: 74, fx: 'rock' },
      ],
      anim: [[0, 'fall'], [9, 'bStompWind'], [14, 'bStompWind'], [16, 'bStomp'], [28, 'bStomp'], [50, 'fall']],
    },
    grab: {
      frames: 36,
      edgeStop: true,
      hits: [{ f: [8, 10], at: 'handF', r: 24, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'ready'], [8, 'grab'], [15, 'grab'], [36, 'idle']],
    },
    dashgrab: {
      frames: 44,
      edgeStop: true,
      vel: [{ f: [1, 12], vx: 8 }, { f: [13, 44], vx: 1 }],
      hits: [{ f: [10, 13], at: 'handF', r: 25, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'dash'], [10, 'grab'], [20, 'grab'], [44, 'idle']],
    },
    pummel: { frames: 20, pummel: 2, anim: [[0, 'hold'], [4, 'bSqueeze'], [20, 'hold']], sfx: [[4, 'thud']] },
    fthrow: {
      frames: 38,
      throw: { release: 14, hit: { dmg: 11, ang: 40, bkb: 70, kbg: 66, fx: 'rock' } },
      anim: [[0, 'hold'], [8, ['hold', { lean: -10 }]], [14, 'bPush'], [24, 'bPush'], [38, 'idle']],
      sfx: [[14, 'thud']],
    },
    bthrow: {
      frames: 42,
      throw: { release: 18, hit: { dmg: 12, ang: 140, bkb: 66, kbg: 72, fx: 'rock' } },
      anim: [[0, 'hold'], [8, 'bHeave'], [18, 'bShoulderToss'], [28, 'bShoulderToss'], [42, 'idle']],
      sfx: [[18, 'thud']],
    },
    uthrow: {
      frames: 44,
      throw: { release: 14, hit: { dmg: 8, ang: 90, bkb: 72, kbg: 70 } },
      hits: [{ f: [20, 23], at: 'handF', y: 14, r: 30, dmg: 5, ang: 90, bkb: 50, kbg: 50, fx: 'rock' }],
      anim: [[0, 'hold'], [8, 'crouch'], [14, 'bSummit'], [18, 'bSummitWind'], [21, 'bSummit'], [30, 'bSummit'], [44, 'idle']],
      sfx: [[21, 'thud']],
    },
    dthrow: {
      frames: 42,
      throw: { release: 18, hy: 8, hit: { dmg: 8, ang: 80, bkb: 62, kbg: 48, fx: 'rock' } },
      anim: [[0, 'hold'], [8, 'bHeave'], [18, 'bSlam'], [28, 'bSlam'], [42, 'idle']],
      sfx: [[18, 'boom']],
    },
    nspec: {
      frames: 52,
      edgeStop: true,
      shots: [{ f: 20, proj: 'boulder', at: 'handF', x: 20, y: 10 }],
      anim: [[0, 'idle'], [8, 'bLift'], [14, 'bHeave'], [20, 'bPush'], [32, 'bPush'], [52, 'idle']],
      sfx: [[8, 'thud'], [20, 'whiff']],
    },
    nspecAir: {
      frames: 50,
      shots: [{ f: 18, proj: 'boulder', at: 'handF', x: 16, vx: 5, vy: 2 }],
      anim: [[0, 'fall'], [8, 'bAxeWind'], [18, 'bPush'], [30, 'bPush'], [50, 'fall']],
      sfx: [[18, 'whiff']],
    },
    sspec: {
      frames: 48,
      turn: true,
      oncePerAir: true,
      edgeStop: true,
      armor: [6, 26, 14],
      vel: [{ f: [1, 8], vx: 2, vy: 0, grav: 0.4 }, { f: [9, 26], vx: 14, vy: 0, grav: 0.15 }, { f: [27, 48], vx: 3, grav: 0.8 }],
      hits: [
        { f: [9, 26], at: 'shoulder', x: 20, r: 32, dmg: 12, ang: 40, bkb: 64, kbg: 66, fx: 'rock' },
        { f: [9, 26], at: 'hip', x: 20, y: 10, r: 26, dmg: 10, ang: 40, bkb: 60, kbg: 60, fx: 'rock' },
      ],
      anim: [[0, 'idle'], [8, ['bShoulder', { lean: 10 }]], [10, 'bShoulder'], [26, 'bShoulder'], [36, ['bShoulder', { lean: 20 }]], [48, 'idle']],
      sfx: [[9, 'dash'], [14, 'thud'], [20, 'thud']],
    },
    uspec: {
      frames: 52,
      helpless: true,
      landHelpless: 28,
      ledgeFrom: 12,
      reverse: true,
      vel: [{ f: [1, 8], vx: 0, vy: 0, grav: 0.3 }, { f: [9, 26], vx: 3.5, vy: 20, grav: 0 }, { f: [27, 52], grav: 0.8 }],
      shots: [{ f: 9, proj: 'pillar', at: 'hip', y: -24 }],
      hits: [
        { f: [9, 14], at: 'handF', r: 26, dmg: 9, ang: 85, bkb: 62, kbg: 70, fx: 'rock' },
        { f: [9, 14], at: 'handB', r: 24, dmg: 9, ang: 85, bkb: 62, kbg: 70, fx: 'rock' },
        { f: [15, 24], at: 'handF', r: 22, dmg: 5, ang: 80, bkb: 40, kbg: 50, fx: 'rock' },
      ],
      anim: [[0, 'crouch'], [8, ['crouch', { y: -6 }]], [10, 'bLeap'], [26, 'bLeap'], [36, 'helpless'], [52, 'helpless']],
      sfx: [[9, 'boom']],
    },
    dspec: {
      frames: 50,
      edgeStop: true,
      hits: [
        { f: [15, 17], at: 'hip', x: 62, y: -10, r: 38, dmg: 13, ang: 78, bkb: 62, kbg: 70, fx: 'rock' },
        { f: [15, 17], at: 'hip', x: -62, y: -10, r: 38, dmg: 13, ang: 102, bkb: 62, kbg: 70, fx: 'rock' },
      ],
      shots: [{ f: 15, proj: 'quake', at: 'hip', x: 40, y: -14 }, { f: 15, proj: 'quake', at: 'hip', x: -40, y: -14, vx: -12 }],
      anim: [[0, 'idle'], [9, 'bQuakeWind'], [15, 'bQuake'], [24, 'bQuake'], [50, 'idle']],
      sfx: [[15, 'boom']],
    },
    dspecAir: {
      frames: 80,
      landInto: 'dspecLand',
      vel: [{ f: [1, 8], vx: 0, vy: 3, grav: 0 }, { f: [9, 80], vx: 0, vy: -24, grav: 0, noDrift: true }],
      hits: [{ f: [9, 80], at: 'footF', r: 30, dmg: 11, ang: 270, bkb: 30, kbg: 70, only: 'air', fx: 'rock' }],
      anim: [[0, 'tuck'], [8, 'bStompWind'], [11, 'bStomp'], [80, 'bStomp']],
    },
    dspecLand: {
      frames: 40,
      edgeStop: true,
      hits: [
        { f: [1, 3], at: 'hip', x: 62, y: -20, r: 40, dmg: 12, ang: 72, bkb: 60, kbg: 66, fx: 'rock' },
        { f: [1, 3], at: 'hip', x: -62, y: -20, r: 40, dmg: 12, ang: 108, bkb: 60, kbg: 66, fx: 'rock' },
      ],
      shots: [{ f: 1, proj: 'quake', at: 'hip', x: 40, y: -14 }, { f: 1, proj: 'quake', at: 'hip', x: -40, y: -14, vx: -12 }],
      anim: [[0, 'land'], [8, 'bQuake'], [22, 'crouch'], [40, 'idle']],
      sfx: [[1, 'boom']],
    },
    ledgeatk: {
      frames: 52,
      hits: [
        { f: [19, 22], at: 'handF', r: 24, dmg: 10, ang: 361, bkb: 45, kbg: 45, fx: 'rock' },
        { f: [19, 22], at: 'elbowF', r: 17, dmg: 8, ang: 361, bkb: 45, kbg: 45, fx: 'rock' },
      ],
      anim: [[0, 'climb'], [14, 'bBackhandWind'], [20, 'bBackhand'], [30, 'bBackhand'], [52, 'idle']],
    },
    getupatk: {
      frames: 46,
      hits: [
        { f: [15, 18], at: 'handF', r: 28, dmg: 8, ang: 361, bkb: 50, kbg: 40, fx: 'rock' },
        { f: [15, 18], at: 'handB', r: 28, dmg: 8, ang: 150, bkb: 50, kbg: 40, fx: 'rock' },
      ],
      anim: [[0, 'lying'], [10, 'bFaultWind'], [15, 'bFault'], [26, 'bFault'], [46, 'idle']],
      sfx: [[15, 'thud']],
    },
    ult: {
      frames: 112,
      edgeStop: true,
      ult: true,
      script: 'bouldar:ult',
      // the opening quake knocks everyone standing anywhere on the stage up into the rockfall
      hits: [
        { f: [10, 12], at: 'hip', r: 150, dmg: 12, ang: 75, bkb: 60, kbg: 70, fx: 'rock', unblockable: true },
        { f: [10, 12], at: 'hip', r: 760, dmg: 9, ang: 85, bkb: 55, kbg: 30, fx: 'rock', unblockable: true, only: 'ground' },
      ],
      anim: [[0, 'bRoar'], [7, ['bRoar', { y: 6 }]], [10, 'bSlam'], [22, 'bSlam'], [32, 'bRoar'], [50, 'bRoar'], [56, 'bSlam'], [66, 'bSlam'], [80, 'bRoar'], [112, 'idle']],
      sfx: [[10, 'boom'], [56, 'boom']],
    },
  },
};

registerScripts({
  // Landslide: the stage shakes and boulders rain from the sky, bouncing and rolling across the whole stage
  'bouldar:ult': (st, f) => {
    const stg = STAGES[st.stage];
    const s = stg.solids[0];
    if (f.mf === 10) ev(st, 'boom', f.x, f.y - 20, f.i, 220);
    if (f.mf > 10 && f.mf < 80 && f.mf % 10 === 0) ev(st, 'knockdown', f.x, stg.blast.b + 600, f.i);
    if (f.mf >= 16 && f.mf <= 44 && (f.mf - 16) % 14 === 0) {
      const pk = cfOf(f).projIdx.landslide;
      const n = 5;
      const w = (s.x2 - s.x1 + 300) / n;
      for (let i = 0; i < n; i++) {
        const x = s.x1 - 150 + w * (i + 0.3 + rint(st, 40) / 100);
        const p = spawnProj(st, f, pk, x, stg.cam.t + 120 - rint(st, 160));
        p.vx = (rint(st, 2) ? 1 : -1) * (2 + rint(st, 5));
        p.vy = 2 + rint(st, 6);
      }
    }
  },
});
