// Sir Clank — the swordfighter. A hollow suit of Rustwood armour animated by a very polite ghost named Lance.
// Longsword (disjointed: hitboxes ride the blade, which has no hurtbox) and a kite shield on the back arm.
// Pose cheat sheet: sword direction (0 up, 90 forward, 180 down, 270 back) = rot + lean + 180 - armF - foreF - wep.
import { spawnProj } from '../../sim/projectiles';
import { registerScripts } from '../../sim/scripts';
import { STAGES } from '../../sim/data';
import type { Fighter, FighterDef, State } from '../../sim/types';

export const clank: FighterDef = {
  id: 'clank',
  name: 'Sir Clank',
  title: 'Knight in Shining Bromance',
  role: 'Swordfighter',
  color: '#9fb2d6',
  weight: 104,
  power: 1.02,
  rig: { thigh: 25, shin: 24, torso: 38, head: 20, upper: 21, fore: 19, girth: 17, limb: 8, wep: 66 },
  stats: { walk: 9, dash: 16.5, run: 15, dashFrames: 11, airSpeed: 9.6, airAccel: 0.5, airFric: 0.12, groundFric: 0.9, grav: 0.82, fall: 14, ffall: 22, jump: 21, hop: 14.2, djump: 19.5, jumps: 1, squat: 3 },
  bio: 'A suit of armour from the Rustwood Kingdom, haunted by Lance, a ghost so polite he apologises to doors before walking through them. Swore an oath to protect every bro in the realm. The oath did not say anything about not smashing them.',
  line: 'M’bro. I would duel a dragon for thee. Then hug thee. Then duel thee.',
  taunt: 'Doffs his helmet with a deep bow. Lance the ghost peeks out, blushes, and waves.',
  wins: ['Huzzah! Thy defeat was most valiant, sweet bro.', 'I shall write a ballad of thy courage. Forty verses. Thou art in all of them.', 'Pray, take my hand, good bro. Lance insists. He is ever so fond of thee.'],
  moveNames: { nspec: 'Ghostfire', sspec: 'Shield Bash', uspec: 'Spiral Ascent', dspec: 'Riposte', ult: 'Haunted Armory' },
  poses: {
    // stances
    idle: { lean: 6, armF: 22, foreF: 74, wep: 64, armB: 66, foreB: 58, legF: 22, shinF: 16, legB: -20, shinB: 14 },
    ready: { lean: 12, armF: 34, foreF: 70, wep: 56, armB: 74, foreB: 54, legF: 30, shinF: 30, legB: -26, shinB: 24 },
    shield: { lean: 14, armF: 10, foreF: 60, wep: 80, armB: 92, foreB: 44, legF: 32, shinF: 40, legB: -26, shinB: 30 },
    crouch: { lean: 30, head: -10, armF: 40, foreF: 60, wep: 70, armB: 70, foreB: 50, legF: 75, shinF: 115, legB: 15, shinB: 115, sy: 0.96 },
    // jabs
    cJabWind: { lean: 4, armF: 26, foreF: 96, wep: 44, armB: 66, foreB: 58, legF: 24, shinF: 22, legB: -22, shinB: 18 },
    cJab1: { lean: 18, armF: 100, foreF: 8, wep: 2, armB: 46, foreB: 76, legF: 34, shinF: 22, legB: -30, shinB: 12 },
    cJab2: { lean: 8, armF: 150, foreF: 12, wep: 26, armB: 40, foreB: 70, legF: 30, shinF: 20, legB: -28, shinB: 12 },
    cJab3Wind: { lean: -4, armF: -24, foreF: 100, wep: 6, armB: 60, foreB: 60, legF: 26, shinF: 24, legB: -26, shinB: 20 },
    cJab3: { lean: 30, armF: 118, foreF: 0, wep: 2, armB: -36, foreB: 40, legF: 52, shinF: 30, legB: -46, shinB: 6, sx: 1.04 },
    // tilts
    cHighWind: { lean: -10, armF: 166, foreF: 28, wep: 30, armB: 60, foreB: 60, legF: 26, shinF: 24, legB: -24, shinB: 16 },
    cSlashFwd: { lean: 24, armF: 100, foreF: 0, wep: -8, armB: 8, foreB: 60, legF: 40, shinF: 22, legB: -36, shinB: 8 },
    cUtiltA: { lean: 12, armF: 60, foreF: 12, wep: -12, armB: 40, foreB: 60, legF: 26, shinF: 24, legB: -22, shinB: 16 },
    cUtiltB: { lean: 0, armF: 140, foreF: 0, wep: 0, armB: 20, foreB: 60, legF: 16, shinF: 10, legB: -16, shinB: 10 },
    cUtiltC: { lean: -8, armF: 182, foreF: 0, wep: 0, armB: 10, foreB: 60, legF: 14, shinF: 8, legB: -16, shinB: 10 },
    cUtiltD: { lean: -14, armF: 216, foreF: 10, wep: 10, armB: 10, foreB: 60, legF: 16, shinF: 10, legB: -20, shinB: 12 },
    cLowStab: { lean: 40, head: -14, armF: 122, foreF: 0, wep: 0, armB: 50, foreB: 70, legF: 82, shinF: 112, legB: 4, shinB: 122, sy: 0.97 },
    cLunge: { lean: 38, armF: 126, foreF: 0, wep: 0, armB: -40, foreB: 30, legF: 62, shinF: 30, legB: -60, shinB: 10, sx: 1.05 },
    // smashes
    cSmashWind: { lean: -26, armF: 196, foreF: 24, wep: 14, armB: 66, foreB: 56, legF: 36, shinF: 48, legB: -40, shinB: 20 },
    cSmashMid: { lean: 10, armF: 140, foreF: 0, wep: 0, armB: 30, foreB: 50, legF: 50, shinF: 40, legB: -48, shinB: 10 },
    cSmashHit: { lean: 36, armF: 96, foreF: 0, wep: -20, armB: -6, foreB: 50, legF: 64, shinF: 46, legB: -58, shinB: 4, sx: 1.06 },
    cUpWind: { lean: 26, armF: 40, foreF: 30, wep: -10, armB: 50, foreB: 90, legF: 62, shinF: 100, legB: 10, shinB: 100, sy: 0.92 },
    cUpThrust: { lean: -6, armF: 174, foreF: 0, wep: 0, armB: 26, foreB: 60, legF: 8, shinF: 4, legB: -8, shinB: 4, y: 6, sy: 1.07 },
    cDsmashF: { lean: 32, armF: 82, foreF: 0, wep: 0, armB: 40, foreB: 60, legF: 72, shinF: 66, legB: -42, shinB: 60 },
    cDsmashOver: { lean: 20, armF: 186, foreF: 0, wep: 0, armB: 20, foreB: 60, legF: 60, shinF: 60, legB: -40, shinB: 60 },
    cDsmashB: { lean: 30, head: 12, armF: 290, foreF: 10, wep: 10, armB: 30, foreB: 60, legF: 72, shinF: 66, legB: -42, shinB: 60 },
    // aerials
    cNair: { lean: 0, armF: 102, foreF: 0, wep: 0, armB: -60, foreB: 40, legF: 50, shinF: 80, legB: -20, shinB: 80 },
    cFairWind: { lean: -10, armF: 172, foreF: 20, wep: 20, armB: 50, foreB: 60, legF: 40, shinF: 80, legB: 10, shinB: 80 },
    cFairMid: { lean: 10, armF: 110, foreF: 0, wep: 0, armB: 30, foreB: 60, legF: 40, shinF: 70, legB: -6, shinB: 70 },
    cFairEnd: { lean: 26, armF: 70, foreF: 0, wep: -10, armB: 10, foreB: 60, legF: 40, shinF: 70, legB: -10, shinB: 70 },
    cBairWind: { lean: 10, armF: 120, foreF: 30, wep: 20, armB: 40, foreB: 60, legF: 50, shinF: 90, legB: 0, shinB: 90 },
    cBair: { lean: 20, head: 14, armF: 240, foreF: 20, wep: 20, armB: 50, foreB: 60, legF: 50, shinF: 90, legB: -30, shinB: 60 },
    cBairEnd: { lean: 22, head: 14, armF: 262, foreF: 28, wep: 30, armB: 50, foreB: 60, legF: 50, shinF: 90, legB: -30, shinB: 60 },
    cUairA: { lean: -6, armF: 70, foreF: 20, wep: 0, armB: -30, foreB: 40, legF: 50, shinF: 90, legB: 10, shinB: 90 },
    cUairB: { lean: -14, armF: 166, foreF: 0, wep: 0, armB: -40, foreB: 40, legF: 50, shinF: 90, legB: 10, shinB: 90 },
    cUairC: { lean: -18, armF: 230, foreF: 10, wep: 10, armB: -40, foreB: 40, legF: 50, shinF: 90, legB: 10, shinB: 90 },
    cDairWind: { lean: 2, armF: 150, foreF: 20, wep: 10, armB: 60, foreB: 60, legF: 80, shinF: 120, legB: 60, shinB: 120 },
    cDair: { lean: 4, armF: 12, foreF: 0, wep: -8, armB: 60, foreB: 60, legF: 64, shinF: 104, legB: 30, shinB: 94, sy: 1.04 },
    // specials
    cFlickWind: { lean: -8, armF: 150, foreF: 40, wep: 40, armB: 60, foreB: 60, legF: 24, shinF: 22, legB: -24, shinB: 16 },
    cFlick: { lean: 18, armF: 104, foreF: 0, wep: -4, armB: 40, foreB: 70, legF: 34, shinF: 22, legB: -30, shinB: 12 },
    cBashWind: { lean: -6, armF: 20, foreF: 70, wep: 70, armB: 10, foreB: 90, legF: 26, shinF: 30, legB: -28, shinB: 20 },
    cBash: { lean: 34, armF: -20, foreF: 60, wep: 70, armB: 108, foreB: 6, legF: 50, shinF: 30, legB: -50, shinB: 10, sx: 1.05 },
    cSpin: { lean: 0, armF: 96, foreF: 0, wep: 0, armB: -70, foreB: 30, legF: 26, shinF: 40, legB: -18, shinB: 40 },
    cSpinTop: { lean: -6, armF: 176, foreF: 0, wep: 0, armB: 120, foreB: 30, legF: 10, shinF: 20, legB: -10, shinB: 20 },
    cGuard: { lean: -4, head: -6, armF: 136, foreF: 0, wep: -50, armB: 84, foreB: 40, legF: 30, shinF: 34, legB: -28, shinB: 24 },
    cRiposte: { lean: 34, armF: 100, foreF: 0, wep: -14, armB: -20, foreB: 40, legF: 60, shinF: 40, legB: -56, shinB: 6, sx: 1.06 },
    cSalute: { lean: -8, head: -16, armF: 178, foreF: 0, wep: 0, armB: 20, foreB: 60, legF: 14, shinF: 6, legB: -14, shinB: 6 },
    cKneel: { lean: 20, head: 10, armF: 60, foreF: 30, wep: 40, armB: 40, foreB: 60, legF: 90, shinF: 90, legB: -40, shinB: 120 },
    // throws
    cPommel: { lean: 18, armF: 64, foreF: 96, wep: 150, armB: 80, foreB: 30, legF: 26, shinF: 24, legB: -24, shinB: 18 },
    cShove: { lean: 34, armF: 0, foreF: 70, wep: 80, armB: 112, foreB: 0, legF: 46, shinF: 18, legB: -40, shinB: 6 },
    cHoist: { lean: -10, armF: 176, foreF: 0, wep: 0, armB: 172, foreB: 0, legF: 10, shinF: 10, legB: -10, shinB: 10 },
  },
  base: {
    // doffs the helmet (held high in the sword hand) and bows; the art shows Lance where the head was
    taunt: [
      [0, 'idle'],
      [8, { lean: -4, head: -10, armF: 176, foreF: 8, wep: 120, armB: 50, foreB: 60, legF: 18, shinF: 10, legB: -18, shinB: 10 }],
      [22, { lean: 24, head: 18, armF: 46, foreF: 40, wep: 120, armB: -30, foreB: 40, legF: 34, shinF: 30, legB: -30, shinB: 16 }],
      [40, { lean: 24, head: 18, armF: 46, foreF: 40, wep: 120, armB: -30, foreB: 40, legF: 34, shinF: 30, legB: -30, shinB: 16 }],
      [52, { lean: -4, head: -10, armF: 176, foreF: 8, wep: 120, armB: 50, foreB: 60, legF: 18, shinF: 10, legB: -18, shinB: 10 }],
      [60, 'idle'],
    ],
  },
  projs: {
    ghostfire: { kind: 'ghostfire', r: 13, life: 80, vx: 7.5, vy: 7.5, grav: 0.38, bounce: 0.5, hit: { dmg: 6, ang: 50, bkb: 30, kbg: 52, fx: 'ice' } },
    ghostblade: { kind: 'ghostblade', r: 28, life: 64, vy: -27, ghost: true, pierce: true, hit: { dmg: 4.5, ang: 80, bkb: 30, kbg: 8, fx: 'ice', unblockable: true, hitlag: 0.5 } },
    greatblade: { kind: 'greatblade', r: 38, life: 60, vy: -30, ghost: true, fuse: 30, hit: { dmg: 4, ang: 80, bkb: 30, kbg: 10, fx: 'ice', unblockable: true }, explode: { r: 112, hit: { dmg: 14, ang: 72, bkb: 70, kbg: 96, fx: 'ice', unblockable: true } } },
  },
  moves: {
    jab1: {
      frames: 18,
      edgeStop: true,
      hits: [
        { f: [3, 5], at: 'wep', r: 13, dmg: 2.5, ang: 361, bkb: 18, kbg: 25, fx: 'slash' },
        { f: [3, 5], at: 'wepMid', r: 12, dmg: 2.5, ang: 361, bkb: 18, kbg: 25, fx: 'slash' },
      ],
      next: [{ move: 'jab2', from: 5, to: 16 }],
      anim: [[0, 'cJabWind'], [3, 'cJab1'], [9, 'cJab1'], [18, 'idle']],
      sfx: [[2, 'whiff']],
    },
    jab2: {
      frames: 20,
      edgeStop: true,
      hits: [
        { f: [3, 5], at: 'wepMid', r: 14, dmg: 2.5, ang: 361, bkb: 20, kbg: 25, fx: 'slash' },
        { f: [3, 5], at: 'wep', r: 12, dmg: 2.5, ang: 361, bkb: 20, kbg: 25, fx: 'slash' },
      ],
      next: [{ move: 'jab3', from: 5, to: 18 }],
      anim: [[0, 'cJab1'], [4, 'cJab2'], [10, 'cJab2'], [20, 'idle']],
      sfx: [[2, 'whiff']],
    },
    jab3: {
      frames: 30,
      edgeStop: true,
      hits: [
        { f: [6, 8], at: 'wep', r: 16, dmg: 5, ang: 40, bkb: 45, kbg: 88, fx: 'slash' },
        { f: [6, 8], at: 'wepMid', r: 13, dmg: 4, ang: 40, bkb: 45, kbg: 80, fx: 'slash' },
      ],
      anim: [[0, 'cJab2'], [4, 'cJab3Wind'], [7, 'cJab3'], [14, 'cJab3'], [30, 'idle']],
      sfx: [[5, 'whiff']],
    },
    ftilt: {
      frames: 30,
      edgeStop: true,
      hits: [
        { f: [8, 10], at: 'wep', r: 17, dmg: 10.5, ang: 361, bkb: 24, kbg: 94, fx: 'slash' },
        { f: [8, 10], at: 'wepMid', r: 15, dmg: 9, ang: 361, bkb: 22, kbg: 90, fx: 'slash' },
        { f: [8, 10], at: 'handF', r: 11, dmg: 7.5, ang: 361, bkb: 22, kbg: 86, fx: 'slash' },
      ],
      anim: [[0, 'idle'], [5, 'cHighWind'], [7, ['cSmashMid', { lean: 14 }], 'lin'], [9, 'cSlashFwd'], [16, 'cSlashFwd'], [30, 'idle']],
      sfx: [[7, 'whiff']],
    },
    utilt: {
      frames: 30,
      edgeStop: true,
      hits: [
        { f: [6, 12], at: 'wep', r: 18, dmg: 8, ang: 96, bkb: 26, kbg: 116, fx: 'slash' },
        { f: [6, 12], at: 'wepMid', r: 15, dmg: 7, ang: 96, bkb: 26, kbg: 110, fx: 'slash' },
      ],
      anim: [[0, 'idle'], [4, 'cUtiltA'], [7, 'cUtiltB', 'lin'], [10, 'cUtiltC', 'lin'], [13, 'cUtiltD'], [18, 'cUtiltD'], [30, 'idle']],
      sfx: [[5, 'whiff']],
    },
    dtilt: {
      frames: 24,
      edgeStop: true,
      hits: [
        { f: [6, 8], at: 'wep', r: 15, dmg: 7.5, ang: 22, bkb: 40, kbg: 72, fx: 'slash' },
        { f: [6, 8], at: 'wepMid', r: 13, dmg: 6.5, ang: 30, bkb: 36, kbg: 70, fx: 'slash' },
      ],
      anim: [[0, 'crouch'], [4, ['cLowStab', { armF: 80, wep: 20 }]], [6, 'cLowStab'], [12, 'cLowStab'], [24, 'crouch']],
      sfx: [[5, 'whiff']],
    },
    dash: {
      frames: 38,
      edgeStop: true,
      vel: [{ f: [1, 6], vx: 14 }, { f: [7, 16], vx: 9.5 }, { f: [17, 38], vx: 2 }],
      hits: [
        { f: [7, 12], at: 'wep', r: 18, dmg: 10.5, ang: 45, bkb: 58, kbg: 64, fx: 'slash' },
        { f: [7, 12], at: 'wepMid', r: 15, dmg: 9, ang: 50, bkb: 55, kbg: 60, fx: 'slash' },
        { f: [13, 18], at: 'wep', r: 14, dmg: 6, ang: 50, bkb: 40, kbg: 50, fx: 'slash' },
      ],
      anim: [[0, 'dash'], [5, ['cJab3Wind', { lean: 24 }]], [8, 'cLunge'], [20, 'cLunge'], [38, 'idle']],
      sfx: [[6, 'whiff']],
    },
    fsmash: {
      frames: 50,
      edgeStop: true,
      charge: 10,
      hits: [
        { f: [14, 16], at: 'wep', r: 22, dmg: 19, ang: 36, bkb: 32, kbg: 100, fx: 'slash' },
        { f: [14, 16], at: 'wepMid', r: 18, dmg: 16, ang: 36, bkb: 30, kbg: 98, fx: 'slash' },
        { f: [14, 16], at: 'handF', r: 13, dmg: 13, ang: 40, bkb: 30, kbg: 95, fx: 'slash' },
        { f: [17, 19], at: 'wep', r: 16, dmg: 9, ang: 50, bkb: 30, kbg: 80, fx: 'slash' },
      ],
      anim: [[0, 'idle'], [7, 'cSmashWind'], [12, ['cSmashWind', { lean: -30, armF: 204 }]], [14, 'cSmashMid', 'lin'], [16, 'cSmashHit'], [26, 'cSmashHit'], [50, 'idle']],
      sfx: [[13, 'whiff']],
    },
    usmash: {
      frames: 46,
      edgeStop: true,
      charge: 7,
      hits: [
        { f: [9, 10], at: 'handF', y: 10, r: 20, dmg: 6, ang: 100, bkb: 70, kbg: 30, fx: 'slash' },
        { f: [11, 16], at: 'wep', r: 22, dmg: 16.5, ang: 90, bkb: 32, kbg: 99, fx: 'slash', grp: 1 },
        { f: [11, 16], at: 'wepMid', r: 18, dmg: 14, ang: 90, bkb: 32, kbg: 97, fx: 'slash', grp: 1 },
      ],
      anim: [[0, 'idle'], [6, 'cUpWind'], [9, ['cUpThrust', { armF: 120, wep: -10 }], 'lin'], [11, 'cUpThrust'], [20, 'cUpThrust'], [46, 'idle']],
      sfx: [[9, 'whiff']],
    },
    dsmash: {
      frames: 46,
      edgeStop: true,
      charge: 5,
      hits: [
        { f: [7, 9], at: 'wep', r: 18, dmg: 13, ang: 28, bkb: 30, kbg: 96, fx: 'slash' },
        { f: [7, 9], at: 'wepMid', r: 15, dmg: 11, ang: 28, bkb: 30, kbg: 94, fx: 'slash' },
        { f: [15, 17], at: 'wep', r: 18, dmg: 15, ang: 150, bkb: 30, kbg: 98, fx: 'slash', grp: 1 },
        { f: [15, 17], at: 'wepMid', r: 15, dmg: 12.5, ang: 150, bkb: 30, kbg: 96, fx: 'slash', grp: 1 },
      ],
      anim: [[0, 'crouch'], [5, ['cDsmashF', { armF: 150, wep: 20 }]], [8, 'cDsmashF'], [11, 'cDsmashF'], [13, 'cDsmashOver', 'lin'], [16, 'cDsmashB'], [26, 'cDsmashB'], [46, 'idle']],
      sfx: [[6, 'whiff'], [14, 'whiff']],
    },
    nair: {
      frames: 38,
      air: true,
      landLag: 8,
      autoCancel: [3, 32],
      hits: [
        { f: [5, 9], at: 'wep', r: 16, dmg: 9, ang: 361, bkb: 18, kbg: 100, fx: 'slash' },
        { f: [5, 9], at: 'wepMid', r: 14, dmg: 8, ang: 361, bkb: 18, kbg: 96, fx: 'slash' },
        { f: [10, 18], at: 'wep', r: 14, dmg: 6, ang: 361, bkb: 12, kbg: 90, fx: 'slash' },
      ],
      anim: [[0, ['cNair', { rot: -20 }]], [4, ['cNair', { rot: 0 }]], [18, ['cNair', { rot: 360 }], 'lin'], [24, ['tuck', { rot: 360 }]], [38, ['fall', { rot: 360 }]]],
      sfx: [[4, 'whiff']],
    },
    fair: {
      frames: 40,
      air: true,
      landLag: 12,
      autoCancel: [3, 34],
      hits: [
        { f: [8, 11], at: 'wep', r: 17, dmg: 12, ang: 40, bkb: 34, kbg: 97, fx: 'slash' },
        { f: [8, 11], at: 'wepMid', r: 15, dmg: 10.5, ang: 40, bkb: 32, kbg: 94, fx: 'slash' },
        { f: [8, 11], at: 'handF', r: 11, dmg: 8, ang: 45, bkb: 30, kbg: 90, fx: 'slash' },
      ],
      anim: [[0, 'fall'], [5, 'cFairWind'], [7, 'cFairWind'], [9, 'cFairMid', 'lin'], [12, 'cFairEnd'], [20, 'cFairEnd'], [40, 'fall']],
      sfx: [[7, 'whiff']],
    },
    bair: {
      frames: 34,
      air: true,
      landLag: 10,
      autoCancel: [3, 28],
      hits: [
        { f: [7, 10], at: 'wep', r: 18, dmg: 13, ang: 145, bkb: 22, kbg: 100, fx: 'slash' },
        { f: [7, 10], at: 'wepMid', r: 15, dmg: 11, ang: 145, bkb: 20, kbg: 96, fx: 'slash' },
      ],
      anim: [[0, 'fall'], [4, 'cBairWind'], [6, ['cBairWind', { armF: 170 }], 'lin'], [8, 'cBair', 'lin'], [11, 'cBairEnd'], [18, 'cBairEnd'], [34, 'fall']],
      sfx: [[6, 'whiff']],
    },
    uair: {
      frames: 32,
      air: true,
      landLag: 8,
      autoCancel: [3, 26],
      hits: [
        { f: [5, 10], at: 'wep', r: 17, dmg: 8.5, ang: 85, bkb: 26, kbg: 110, fx: 'slash' },
        { f: [5, 10], at: 'wepMid', r: 15, dmg: 7.5, ang: 85, bkb: 26, kbg: 105, fx: 'slash' },
      ],
      anim: [[0, 'fall'], [3, 'cUairA'], [7, 'cUairB', 'lin'], [10, 'cUairC'], [16, 'cUairC'], [32, 'fall']],
      sfx: [[4, 'whiff']],
    },
    dair: {
      frames: 42,
      air: true,
      landLag: 16,
      autoCancel: [3, 36],
      hits: [
        { f: [12, 14], at: 'wep', r: 16, dmg: 14, ang: 270, bkb: 22, kbg: 88, fx: 'slash' },
        { f: [12, 14], at: 'wepMid', r: 14, dmg: 11, ang: 361, bkb: 24, kbg: 84, fx: 'slash' },
        { f: [15, 22], at: 'wep', r: 13, dmg: 8, ang: 361, bkb: 20, kbg: 72, fx: 'slash' },
      ],
      anim: [[0, 'fall'], [6, 'cDairWind'], [10, 'cDairWind'], [13, 'cDair'], [24, 'cDair'], [42, 'fall']],
      sfx: [[11, 'whiff']],
    },
    grab: {
      frames: 30,
      edgeStop: true,
      hits: [{ f: [6, 8], at: 'handF', r: 17, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'ready'], [6, ['grab', { wep: 160 }]], [12, ['grab', { wep: 160 }]], [30, 'idle']],
    },
    dashgrab: {
      frames: 38,
      edgeStop: true,
      vel: [{ f: [1, 10], vx: 9 }, { f: [11, 38], vx: 1 }],
      hits: [{ f: [8, 11], at: 'handF', r: 19, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'dash'], [8, ['grab', { wep: 160 }]], [16, ['grab', { wep: 160 }]], [38, 'idle']],
    },
    pummel: { frames: 16, pummel: 1.4, anim: [[0, ['hold', { wep: 160 }]], [4, 'cPommel'], [16, ['hold', { wep: 160 }]]], sfx: [[4, 'clank']] },
    fthrow: {
      frames: 30,
      throw: { release: 10, holdAt: 'handB', hit: { dmg: 8, ang: 40, bkb: 62, kbg: 62 } },
      anim: [[0, ['hold', { wep: 160 }]], [6, ['cBashWind', { armB: 60 }]], [10, 'cShove'], [18, 'cShove'], [30, 'idle']],
      sfx: [[10, 'clank']],
    },
    bthrow: {
      frames: 34,
      throw: { release: 15, hit: { dmg: 10, ang: 140, bkb: 60, kbg: 72 } },
      anim: [[0, ['hold', { wep: 160 }]], [6, ['throwF', { rot: -90, wep: 160 }]], [12, ['throwB', { rot: -200, wep: 160 }]], [16, ['throwB', { rot: -340, wep: 160 }]], [34, ['idle', { rot: -360 }]]],
    },
    uthrow: {
      frames: 38,
      throw: { release: 12, hit: { dmg: 7, ang: 90, bkb: 72, kbg: 66 } },
      hits: [{ f: [17, 20], at: 'wep', r: 20, dmg: 3, ang: 90, bkb: 40, kbg: 40, fx: 'slash' }],
      anim: [[0, ['hold', { wep: 160 }]], [8, ['crouch', { wep: 120 }]], [12, ['cHoist', { wep: 160 }]], [15, ['cUpWind', { lean: 10 }]], [18, 'cUpThrust'], [26, 'cUpThrust'], [38, 'idle']],
    },
    dthrow: {
      frames: 36,
      throw: { release: 16, holdAt: 'handB', hx: 26, hy: -30, hit: { dmg: 6.5, ang: 72, bkb: 60, kbg: 40 } },
      anim: [[0, ['hold', { wep: 160 }]], [8, ['cBashWind', { lean: 20 }]], [14, ['throwDown', { armB: 60, foreB: 20, armF: 30, foreF: 70, wep: 80 }]], [22, ['throwDown', { armB: 60, foreB: 20, armF: 30, foreF: 70, wep: 80 }]], [36, 'idle']],
      sfx: [[16, 'clank']],
    },
    nspec: {
      frames: 36,
      edgeStop: true,
      shots: [{ f: 11, proj: 'ghostfire', at: 'wep' }],
      anim: [[0, 'idle'], [6, 'cFlickWind'], [9, 'cFlickWind'], [11, 'cFlick'], [20, 'cFlick'], [36, 'idle']],
      sfx: [[11, 'magic']],
    },
    nspecAir: {
      frames: 36,
      shots: [{ f: 11, proj: 'ghostfire', at: 'wep' }],
      anim: [[0, 'fall'], [6, 'cFlickWind'], [9, 'cFlickWind'], [11, 'cFlick'], [20, 'cFlick'], [36, 'fall']],
      sfx: [[11, 'magic']],
    },
    sspec: {
      frames: 42,
      turn: true,
      oncePerAir: true,
      vel: [{ f: [1, 7], vx: 1, vy: 0, grav: 0.2 }, { f: [8, 18], vx: 15, vy: 0, grav: 0 }, { f: [19, 42], vx: 3, grav: 0.7 }],
      hits: [
        { f: [8, 18], at: 'handB', x: 6, r: 24, dmg: 9, ang: 42, bkb: 58, kbg: 55, shield: 16, fx: 'hit', sfx: 'clank' },
        { f: [8, 18], at: 'torso', y: 20, r: 22, dmg: 7, ang: 45, bkb: 50, kbg: 50, shield: 10 },
      ],
      anim: [[0, 'idle'], [6, 'cBashWind'], [9, 'cBash'], [18, 'cBash'], [30, ['cBash', { lean: 10 }]], [42, 'fall']],
      sfx: [[8, 'dash']],
    },
    uspec: {
      frames: 48,
      helpless: true,
      landHelpless: 22,
      ledgeFrom: 10,
      reverse: true,
      vel: [{ f: [1, 5], vx: 0, vy: 0, grav: 0.2 }, { f: [6, 27], vx: 4, vy: 17, grav: 0 }, { f: [28, 48], grav: 0.7 }],
      hits: [
        { f: [6, 24], at: 'wep', r: 19, dmg: 2, ang: 85, bkb: 30, kbg: 20, rehit: 4, fx: 'slash' },
        { f: [6, 24], at: 'wepMid', r: 16, dmg: 2, ang: 85, bkb: 30, kbg: 20, rehit: 4, fx: 'slash' },
        { f: [25, 27], at: 'wep', r: 24, dmg: 6, ang: 80, bkb: 62, kbg: 90, fx: 'slash', grp: 1 },
        { f: [25, 27], at: 'wepMid', r: 20, dmg: 6, ang: 80, bkb: 62, kbg: 90, fx: 'slash', grp: 1 },
      ],
      anim: [[0, 'crouch'], [5, ['cSpin', { rot: -30 }]], [25, ['cSpin', { rot: 690 }], 'lin'], [28, ['cSpinTop', { rot: 720 }]], [36, ['cSpinTop', { rot: 720 }]], [48, ['helpless', { rot: 720 }]]],
      sfx: [[6, 'whiff'], [12, 'whiff'], [18, 'whiff'], [25, 'slash']],
    },
    dspec: {
      frames: 40,
      edgeStop: true,
      counter: { f: [5, 24], move: 'dspecHit', mult: 1.3 },
      anim: [[0, 'idle'], [4, 'cGuard'], [26, 'cGuard'], [40, 'idle']],
      sfx: [[4, 'clank']],
    },
    dspecAir: {
      frames: 40,
      counter: { f: [5, 24], move: 'dspecHitAir', mult: 1.3 },
      vel: [{ f: [1, 26], grav: 0.4 }],
      anim: [[0, 'fall'], [4, 'cGuard'], [26, 'cGuard'], [40, 'fall']],
      sfx: [[4, 'clank']],
    },
    dspecHit: {
      frames: 34,
      edgeStop: true,
      intang: [1, 6],
      hits: [
        { f: [4, 7], at: 'wep', r: 24, dmg: 9, ang: 38, bkb: 62, kbg: 86, fx: 'slash' },
        { f: [4, 7], at: 'wepMid', r: 20, dmg: 9, ang: 38, bkb: 62, kbg: 86, fx: 'slash' },
        { f: [4, 7], at: 'torso', x: 20, y: 20, r: 24, dmg: 8, ang: 40, bkb: 60, kbg: 80, fx: 'slash' },
      ],
      anim: [[0, 'cGuard'], [2, 'cSmashWind'], [5, 'cRiposte'], [16, 'cRiposte'], [34, 'idle']],
      sfx: [[3, 'slash']],
    },
    dspecHitAir: {
      frames: 34,
      intang: [1, 6],
      hits: [
        { f: [4, 7], at: 'wep', r: 24, dmg: 9, ang: 38, bkb: 62, kbg: 86, fx: 'slash' },
        { f: [4, 7], at: 'wepMid', r: 20, dmg: 9, ang: 38, bkb: 62, kbg: 86, fx: 'slash' },
        { f: [4, 7], at: 'torso', x: 20, y: 20, r: 24, dmg: 8, ang: 40, bkb: 60, kbg: 80, fx: 'slash' },
      ],
      anim: [[0, 'cGuard'], [2, 'cSmashWind'], [5, 'cRiposte'], [16, 'cRiposte'], [34, 'fall']],
      sfx: [[3, 'slash']],
    },
    ledgeatk: {
      frames: 48,
      hits: [
        { f: [18, 21], at: 'wep', r: 18, dmg: 9, ang: 361, bkb: 45, kbg: 45, fx: 'slash' },
        { f: [18, 21], at: 'wepMid', r: 15, dmg: 8, ang: 361, bkb: 45, kbg: 45, fx: 'slash' },
      ],
      anim: [[0, 'climb'], [14, 'cHighWind'], [17, ['cSmashMid', { lean: 14 }], 'lin'], [19, 'cSlashFwd'], [28, 'cSlashFwd'], [48, 'idle']],
    },
    getupatk: {
      frames: 44,
      hits: [
        { f: [14, 16], at: 'wep', r: 18, dmg: 7, ang: 361, bkb: 50, kbg: 40, fx: 'slash' },
        { f: [22, 24], at: 'wep', r: 18, dmg: 7, ang: 150, bkb: 50, kbg: 40, fx: 'slash', grp: 1 },
      ],
      anim: [[0, 'lying'], [10, ['cDsmashF', { armF: 150 }]], [15, 'cDsmashF'], [19, 'cDsmashOver', 'lin'], [23, 'cDsmashB'], [30, 'cDsmashB'], [44, 'idle']],
    },
    ult: {
      frames: 104,
      edgeStop: true,
      ult: true,
      script: 'clank:ult',
      anim: [[0, 'cSalute'], [44, ['cSalute', { y: 4 }]], [62, ['cSmashWind', { armF: 190 }]], [66, 'cSmashHit'], [84, 'cSmashHit'], [104, 'idle']],
      sfx: [[8, 'magic'], [20, 'magic'], [32, 'magic'], [62, 'whiff']],
    },
  },
};

// Haunted Armory: three waves of ghostly swords sweep down across the whole stage, then a row of great blades
// stabs into the floor and bursts with ghostfire.
function rain(st: State, f: Fighter, pk: number, n: number, jitter: number, y: number, stagger = true): void {
  const stg = STAGES[st.stage];
  const s = stg.solids[0];
  const x1 = s.x1 - 160;
  const x2 = s.x2 + 160;
  for (let i = 0; i < n; i++) {
    const x = x1 + ((x2 - x1) * (i + 0.5)) / n + jitter * (i % 2 ? 1 : -1);
    const p = spawnProj(st, f, pk, x, y - (stagger ? (i % 3) * 70 : 0));
    p.vx = 0;
  }
}

registerScripts({
  'clank:ult': (st, f) => {
    const stg = STAGES[st.stage];
    const top = stg.cam.t + 220;
    if (f.mf === 8) rain(st, f, 1, 11, 0, top);
    if (f.mf === 20) rain(st, f, 1, 11, 60, top);
    if (f.mf === 32) rain(st, f, 1, 11, -50, top);
    // the great blades are timed to burst just as they reach the main floor (they pass through platforms)
    if (f.mf === 62) rain(st, f, 2, 7, 0, stg.solids[0].y1 - 20 - 30 * 29, false);
  },
});
