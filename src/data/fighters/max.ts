// Max Ratings — the host of SMASH YOUR BROS LIVE! and the final boss, phase 1. A smug TV for a head (his face is
// on the screen), a gold suit, cue cards in one glove and a microphone in the other. Heavy, armoured on his big
// swings, and every hit he lands pushes his Ratings up (and his hits get harder).
import { A } from '../../sim/acts';
import { ev } from '../../sim/events';
import { bodyH, cfOf } from '../../sim/fighter';
import { POSES } from '../../sim/poses';
import { spawnProj } from '../../sim/projectiles';
import { registerScripts } from '../../sim/scripts';
import { STAGES } from '../../sim/data';
import type { Fighter, FighterDef, State } from '../../sim/types';

export const max: FighterDef = {
  id: 'max',
  name: 'Max Ratings',
  title: 'Your Host!',
  role: 'Final boss',
  color: '#ffcf3a',
  weight: 120,
  scale: 1.05,
  hidden: true,
  passive: 'max:passive',
  rig: { thigh: 30, shin: 30, torso: 46, head: 27, upper: 25, fore: 23, girth: 24, limb: 9.5, wep: 34 },
  stats: { walk: 8.2, dash: 14.5, run: 13.2, dashFrames: 12, airSpeed: 8.8, airAccel: 0.45, airFric: 0.1, groundFric: 0.85, grav: 0.85, fall: 15, ffall: 23, jump: 20.5, hop: 14, djump: 19.5, jumps: 1, squat: 4 },
  bio: 'The face of the galaxy’s number-one show, and also the screen it’s on. Has hosted 9,000 episodes, won every award (he presents them to himself), and has never once had a bro. His show turns your friendship into ratings and the ratings into power. He would like your friendship now, please.',
  line: 'Don’t touch that dial, contestant. Actually — do. I’d love the ratings.',
  taunt: 'Holds up an APPLAUSE card and cups a glove to his screen. Nine billion people clap.',
  wins: ['And THAT’S the show! Same time next week, losers — I mean, valued contestants.', 'Ratings: through the roof. Your percent: also through the roof. Coincidence? I’m a professional.', 'You were a wonderful contestant. Truly. If I had a bro, I’d want one exactly like… no. No. Next!'],
  moveNames: { nspec: 'Cue Card Toss', sspec: 'Mic Lasso', uspec: 'Signal Boost', dspec: 'Spotlight', ult: 'Commercial Break' },
  projs: {
    card: { kind: 'maxCard', r: 15, life: 52, vx: 14, drag: 0.985, hit: { dmg: 5, ang: 361, bkb: 26, kbg: 55, fx: 'slash' } },
    spotlight: { kind: 'maxSpotlight', r: 48, life: 80, ghost: true, pierce: true, rehit: 9, reflectable: false, hit: { dmg: 2.5, ang: 90, bkb: 40, kbg: 18, fx: 'fire', hitlag: 0.6 } },
    // the bro is frozen "watching the ad" (a washed-out rerun look) until the show comes back
    adBreak: { kind: 'maxAdBreak', r: 72, life: 70, ghost: true, pierce: true, reflectable: false, hit: { dmg: 6, ang: 90, bkb: 0, kbg: 0, fx: 'elec', unblockable: true, freeze: 62 } },
    weBack: { kind: 'maxWeBack', r: 60, life: 6, ghost: true, fuse: 3, reflectable: false, hit: { dmg: 0, ang: 0, bkb: 0, kbg: 0, wind: true }, explode: { r: 1400, hit: { dmg: 24, ang: 62, bkb: 76, kbg: 104, fx: 'sound', unblockable: true } } },
  },
  poses: {
    idle: { lean: -6, head: -4, armF: 34, foreF: 66, armB: -18, foreB: 40, legF: 14, shinF: 8, legB: -16, shinB: 8, wep: 40 },
    ready: { lean: 8, head: 0, armF: 50, foreF: 70, armB: 30, foreB: 70, legF: 28, shinF: 28, legB: -24, shinB: 24, wep: 20 },
    fall: { ...POSES.fall, wep: 20 },
    jump: { ...POSES.jump, wep: 0 },
    hurt: { ...POSES.hurt, wep: 0 },
    hurtBig: { ...POSES.hurtBig, wep: 0 },
    airdodge: { ...POSES.airdodge, wep: 0 },
    ledge: { ...POSES.ledge, wep: 0 },
    helpless: { ...POSES.helpless, wep: 0 },
    grabbed: { ...POSES.grabbed, wep: 0 },
    shield: { ...POSES.shield, wep: -40 },
    crouch: { ...POSES.crouch, wep: 30 },
    barge: { lean: 34, head: 6, armF: -30, foreF: 40, armB: -50, foreB: 40, legF: 50, shinF: 40, legB: -40, shinB: 20, wep: 40 },
    cardSlash: { lean: 24, head: 4, armF: -20, foreF: 50, armB: 100, foreB: 0, legF: 40, shinF: 20, legB: -36, shinB: 8, wep: 40 },
    cardWind: { lean: -10, head: -4, armF: 40, foreF: 60, armB: -70, foreB: 60, legF: 24, shinF: 22, legB: -26, shinB: 16, wep: 40 },
    clapWind: { lean: -14, head: -12, armF: 140, foreF: 40, armB: 130, foreB: 40, legF: 34, shinF: 30, legB: -34, shinB: 30, wep: 20 },
    clap: { lean: 20, head: 10, armF: 84, foreF: 30, armB: 80, foreB: 34, legF: 50, shinF: 70, legB: -46, shinB: 60, wep: 20, sy: 0.94, sx: 1.06 },
    present: { lean: -10, head: -10, armF: 120, foreF: 20, armB: 150, foreB: 10, legF: 20, shinF: 10, legB: -20, shinB: 10, wep: 10 },
    broadcast: { lean: -4, head: -18, armF: 170, foreF: 6, armB: 160, foreB: 10, legF: 14, shinF: 30, legB: -14, shinB: 30, wep: 0 },
  },
  base: {
    run: [[0, { lean: 24, head: -6, armF: 60, foreF: 60, wep: -10, armB: -60, foreB: 70, legF: 70, shinF: 50, legB: -50, shinB: 90, y: 2 }], [10, { lean: 22, head: -6, armF: 66, foreF: 60, wep: -10, armB: 50, foreB: 70, legF: -40, shinF: 90, legB: 70, shinB: 50, y: 6 }, 'io'], [20, { lean: 24, head: -6, armF: 60, foreF: 60, wep: -10, armB: -60, foreB: 70, legF: 70, shinF: 50, legB: -50, shinB: 90, y: 2 }, 'io']],
    idle: [[0, 'idle'], [24, ['idle', { lean: -9, head: -8, armF: 38, y: 1 }], 'io'], [48, 'idle', 'io']],
    walk: [[0, { lean: -4, head: -6, armF: 40, foreF: 66, armB: -30, foreB: 30, legF: 30, shinF: 10, legB: -26, shinB: 24, wep: 40 }], [16, { lean: -4, head: -2, armF: 40, foreF: 66, armB: 10, foreB: 30, legF: -24, shinF: 26, legB: 30, shinB: 10, wep: 40, y: 3 }, 'io'], [32, { lean: -4, head: -6, armF: 40, foreF: 66, armB: -30, foreB: 30, legF: 30, shinF: 10, legB: -26, shinB: 24, wep: 40 }, 'io']],
    taunt: [[0, 'idle'], [10, ['present', { armF: 60, foreF: 90, wep: -20 }]], [50, ['present', { armF: 60, foreF: 90, wep: -20, head: -16 }]], [60, 'idle']],
  },
  moves: {
    jab1: {
      frames: 20,
      hits: [
        { f: [4, 5], at: 'wep', r: 16, dmg: 3, ang: 361, bkb: 20, kbg: 25, fx: 'sound' },
        { f: [4, 5], at: 'handF', r: 14, dmg: 3, ang: 361, bkb: 20, kbg: 25 },
      ],
      next: [{ move: 'jab2', from: 5, to: 18 }],
      anim: [[0, ['jabWind', { wep: 40 }]], [4, ['jab1', { wep: 0 }]], [11, ['jab1', { wep: 0 }]], [20, 'ready']],
    },
    jab2: {
      frames: 20,
      hits: [{ f: [4, 5], at: 'handB', x: 6, r: 17, dmg: 3, ang: 361, bkb: 20, kbg: 25, fx: 'slash' }],
      next: [{ move: 'jab3', from: 5, to: 18 }],
      anim: [[0, ['jab1', { wep: 0 }]], [4, ['jab2', { wep: 40 }]], [11, ['jab2', { wep: 40 }]], [20, 'ready']],
    },
    jab3: {
      frames: 32,
      hits: [
        { f: [7, 9], at: 'wep', r: 21, dmg: 6, ang: 45, bkb: 48, kbg: 92, fx: 'sound' },
        { f: [7, 9], at: 'handF', r: 16, dmg: 5, ang: 45, bkb: 48, kbg: 90 },
      ],
      anim: [[0, 'swingWind'], [6, ['swingWind', { lean: -18 }]], [8, 'swing'], [15, 'swing'], [32, 'idle']],
    },
    ftilt: {
      frames: 30,
      hits: [
        { f: [8, 10], at: 'handB', x: 10, r: 23, dmg: 11, ang: 361, bkb: 24, kbg: 94, fx: 'slash' },
        { f: [8, 10], at: 'elbowB', r: 16, dmg: 9, ang: 361, bkb: 24, kbg: 90, fx: 'slash' },
      ],
      anim: [[0, 'idle'], [6, 'cardWind'], [9, 'cardSlash'], [16, 'cardSlash'], [30, 'idle']],
      sfx: [[8, 'slash']],
    },
    utilt: {
      frames: 32,
      hits: [
        { f: [7, 12], at: 'wep', r: 21, dmg: 10, ang: 95, bkb: 28, kbg: 116, fx: 'sound' },
        { f: [7, 12], at: 'handF', r: 17, dmg: 9, ang: 95, bkb: 28, kbg: 112 },
      ],
      anim: [[0, 'swingUpWind'], [7, ['swingUp', { armF: 140 }]], [10, 'swingUp'], [13, ['swingUp', { armF: 205 }]], [32, 'idle']],
    },
    dtilt: {
      frames: 26,
      hits: [{ f: [6, 8], at: 'wep', x: 10, r: 20, dmg: 7, ang: 24, bkb: 40, kbg: 60, trip: true }],
      anim: [[0, 'crouch'], [5, ['swingLow', { wep: 30 }]], [7, ['swingLow', { wep: -20 }]], [13, ['swingLow', { wep: -20 }]], [26, 'crouch']],
    },
    dash: {
      frames: 40,
      armor: [3, 14, 10],
      vel: [{ f: [1, 5], vx: 13 }, { f: [6, 18], vx: 11 }, { f: [19, 40], vx: 2 }],
      hits: [
        { f: [7, 13], at: 'neck', x: 12, r: 32, dmg: 12, ang: 50, bkb: 62, kbg: 64 },
        { f: [14, 19], at: 'neck', x: 10, r: 26, dmg: 7, ang: 50, bkb: 44, kbg: 44 },
      ],
      anim: [[0, 'dash'], [6, 'barge'], [19, 'barge'], [40, 'idle']],
      sfx: [[7, 'thud']],
    },
    fsmash: {
      frames: 52,
      charge: 12,
      armor: [4, 16, 14],
      hits: [
        { f: [17, 20], at: 'wep', r: 28, dmg: 22, ang: 35, bkb: 34, kbg: 100, fx: 'sound' },
        { f: [17, 20], at: 'handF', r: 19, dmg: 18, ang: 35, bkb: 34, kbg: 98 },
      ],
      anim: [[0, 'ready'], [9, ['overheadWind', { wep: 30, lean: -24 }]], [14, ['overheadWind', { wep: 40, lean: -30, sy: 0.96 }]], [17, ['overhead', { wep: 10 }]], [19, ['overhead', { wep: -10, lean: 42 }]], [28, ['overhead', { wep: -10, lean: 42 }]], [52, 'idle']],
      sfx: [[17, 'smash']],
    },
    usmash: {
      frames: 46,
      charge: 7,
      armor: [3, 10, 12],
      hits: [
        { f: [10, 15], at: 'wep', r: 27, dmg: 18, ang: 90, bkb: 34, kbg: 98, fx: 'sound' },
        { f: [10, 15], at: 'handF', r: 20, dmg: 16, ang: 90, bkb: 34, kbg: 96 },
        { f: [10, 15], at: 'head', y: 26, r: 27, dmg: 15, ang: 90, bkb: 32, kbg: 95 },
      ],
      anim: [[0, 'ready'], [7, ['upSmashWind', { wep: 60 }]], [11, ['upSmash', { wep: 0 }]], [19, ['upSmash', { wep: 0 }]], [46, 'idle']],
      sfx: [[10, 'note']],
    },
    dsmash: {
      frames: 48,
      charge: 6,
      armor: [3, 11, 12],
      hits: [
        { f: [11, 13], at: 'hip', x: 72, y: -42, r: 36, dmg: 16, ang: 30, bkb: 32, kbg: 98, fx: 'sound', away: true },
        { f: [11, 13], at: 'hip', x: -72, y: -42, r: 36, dmg: 16, ang: 30, bkb: 32, kbg: 98, fx: 'sound', away: true },
        { f: [16, 18], at: 'hip', x: 128, y: -46, r: 28, dmg: 10, ang: 40, bkb: 40, kbg: 80, grp: 1, fx: 'sound', away: true },
        { f: [16, 18], at: 'hip', x: -128, y: -46, r: 28, dmg: 10, ang: 40, bkb: 40, kbg: 80, grp: 1, fx: 'sound', away: true },
      ],
      anim: [[0, 'crouch'], [6, 'clapWind'], [10, ['clapWind', { lean: -18 }]], [12, 'clap'], [24, 'clap'], [48, 'idle']],
      sfx: [[11, 'boom']],
    },
    nair: {
      frames: 38,
      air: true,
      landLag: 9,
      autoCancel: [3, 32],
      hits: [
        { f: [5, 8], at: 'wep', r: 21, dmg: 10, ang: 361, bkb: 18, kbg: 98, fx: 'sound' },
        { f: [5, 8], at: 'handB', r: 19, dmg: 9, ang: 361, bkb: 18, kbg: 96, fx: 'slash' },
        { f: [9, 20], at: 'wep', r: 18, dmg: 6, ang: 361, bkb: 10, kbg: 88 },
      ],
      anim: [[0, { armF: 92, foreF: 0, wep: 40, armB: -92, foreB: 0, rot: 0, legF: 30, shinF: 50, legB: -20, shinB: 50 }], [5, { armF: 92, foreF: 0, wep: 0, armB: -92, foreB: 0, rot: 30, legF: 30, shinF: 50, legB: -20, shinB: 50 }], [20, { armF: 92, foreF: 0, wep: 0, armB: -92, foreB: 0, rot: 390, legF: 30, shinF: 50, legB: -20, shinB: 50 }, 'lin'], [38, ['fall', { rot: 360 }]]],
    },
    fair: {
      frames: 42,
      air: true,
      landLag: 13,
      autoCancel: [3, 36],
      hits: [
        { f: [11, 14], at: 'wep', r: 22, dmg: 14, ang: 40, bkb: 34, kbg: 98, fx: 'sound' },
        { f: [11, 14], at: 'handF', r: 17, dmg: 12, ang: 40, bkb: 34, kbg: 96 },
      ],
      anim: [[0, ['overheadWind', { wep: 30, legF: 40, shinF: 90, legB: 20, shinB: 90 }]], [10, ['overheadWind', { wep: 40, lean: -26, legF: 40, shinF: 90, legB: 20, shinB: 90 }]], [12, ['overhead', { wep: 0, legF: 50, shinF: 70, legB: -10, shinB: 70 }]], [20, ['overhead', { wep: 0, legF: 50, shinF: 70, legB: -10, shinB: 70 }]], [42, 'fall']],
    },
    bair: {
      frames: 36,
      air: true,
      landLag: 11,
      autoCancel: [3, 30],
      hits: [
        { f: [8, 11], at: 'handB', x: 8, r: 23, dmg: 14, ang: 361, bkb: 24, kbg: 100, fx: 'slash' },
        { f: [8, 11], at: 'elbowB', r: 16, dmg: 11, ang: 361, bkb: 22, kbg: 96, fx: 'slash' },
      ],
      anim: [[0, ['bair', { armB: 60, foreB: 30, wep: 40 }]], [6, ['bair', { armB: 10, foreB: 0, wep: 40 }]], [9, ['bair', { armB: -100, foreB: 0, lean: 24, wep: 40 }]], [18, ['bair', { armB: -100, foreB: 0, lean: 24, wep: 40 }]], [36, 'fall']],
    },
    uair: {
      frames: 34,
      air: true,
      landLag: 9,
      autoCancel: [3, 28],
      hits: [
        { f: [6, 12], at: 'wep', r: 22, dmg: 11, ang: 82, bkb: 26, kbg: 112, fx: 'sound' },
        { f: [6, 12], at: 'handF', r: 17, dmg: 9, ang: 82, bkb: 26, kbg: 108 },
      ],
      anim: [[0, ['uairWind', { armF: 70, wep: 40 }]], [6, ['uairWind', { armF: 130, foreF: 0, wep: 0, lean: -10 }]], [9, ['uairWind', { armF: 180, foreF: 0, wep: 0, lean: -16 }]], [12, ['uairWind', { armF: 232, foreF: 0, wep: 0, lean: -16 }]], [34, 'fall']],
    },
    dair: {
      frames: 46,
      air: true,
      landLag: 18,
      autoCancel: [3, 40],
      hits: [
        { f: [14, 17], at: 'footF', r: 21, dmg: 15, ang: 270, bkb: 22, kbg: 88 },
        { f: [14, 17], at: 'footB', r: 19, dmg: 15, ang: 270, bkb: 22, kbg: 88 },
        { f: [18, 24], at: 'footF', r: 17, dmg: 9, ang: 361, bkb: 22, kbg: 72 },
      ],
      anim: [[0, ['dairWind', { wep: 0 }]], [13, ['dairWind', { wep: 0 }]], [15, ['dair', { wep: 0 }]], [24, ['dair', { wep: 0 }]], [46, 'fall']],
    },
    grab: {
      frames: 32,
      hits: [{ f: [7, 9], at: 'handF', r: 20, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'ready'], [7, ['grab', { wep: -30 }]], [13, ['grab', { wep: -30 }]], [32, 'idle']],
    },
    dashgrab: {
      frames: 40,
      vel: [{ f: [1, 10], vx: 8.5 }, { f: [11, 40], vx: 1 }],
      hits: [{ f: [9, 12], at: 'handF', r: 22, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'dash'], [9, ['grab', { wep: -30 }]], [17, ['grab', { wep: -30 }]], [40, 'idle']],
    },
    pummel: { frames: 18, pummel: 2, anim: [[0, ['hold', { wep: -30 }]], [4, ['hold', { armB: 100, foreB: 0, wep: -30 }]], [18, ['hold', { wep: -30 }]]] },
    fthrow: {
      frames: 32,
      throw: { release: 13, hit: { dmg: 10, ang: 40, bkb: 64, kbg: 66 } },
      anim: [[0, ['hold', { wep: -30 }]], [9, ['throwF', { wep: 0 }]], [32, 'idle']],
    },
    bthrow: {
      frames: 36,
      throw: { release: 16, holdAt: 'handF', hit: { dmg: 13, ang: 140, bkb: 64, kbg: 76 } },
      anim: [[0, ['hold', { wep: -30 }]], [7, ['throwF', { rot: -90, wep: 0 }]], [13, ['throwB', { rot: -200, wep: 0 }]], [18, ['throwB', { rot: -340, wep: 0 }]], [36, ['idle', { rot: -360 }]]],
    },
    uthrow: {
      frames: 36,
      throw: { release: 14, hit: { dmg: 11, ang: 90, bkb: 70, kbg: 78 } },
      anim: [[0, ['hold', { wep: -30 }]], [8, 'crouch'], [14, ['throwUp', { wep: 0 }]], [36, 'idle']],
    },
    dthrow: {
      frames: 38,
      throw: { release: 17, hit: { dmg: 8, ang: 75, bkb: 60, kbg: 45 } },
      anim: [[0, ['hold', { wep: -30 }]], [10, ['throwDown', { wep: 0 }]], [22, ['throwDown', { wep: 0 }]], [38, 'idle']],
      sfx: [[17, 'thud']],
    },
    nspec: {
      frames: 40,
      shots: [
        { f: 13, proj: 'card', at: 'handB', x: 10, vy: 3.2 },
        { f: 13, proj: 'card', at: 'handB', x: 10, vy: 0.4 },
        { f: 13, proj: 'card', at: 'handB', x: 10, vy: -2.4 },
      ],
      anim: [[0, 'cardWind'], [10, ['cardWind', { armB: -90 }]], [13, 'cardSlash'], [20, 'cardSlash'], [40, 'idle']],
      sfx: [[13, 'slash']],
    },
    nspecAir: {
      frames: 40,
      vel: [{ f: [1, 20], grav: 0.6 }],
      shots: [
        { f: 13, proj: 'card', at: 'handB', x: 10, vy: 3.2 },
        { f: 13, proj: 'card', at: 'handB', x: 10, vy: 0.4 },
        { f: 13, proj: 'card', at: 'handB', x: 10, vy: -2.4 },
      ],
      anim: [[0, 'cardWind'], [10, ['cardWind', { armB: -90 }]], [13, 'cardSlash'], [20, 'cardSlash'], [40, 'fall']],
      sfx: [[13, 'slash']],
    },
    sspec: {
      frames: 50,
      oncePerAir: true,
      turn: true,
      cmdGrab: 'sspecThrow',
      vel: [{ f: [1, 30], grav: 0.5 }],
      hits: [
        { f: [13, 19], at: 'wep', x: 34, r: 26, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 },
        { f: [13, 19], at: 'wep', r: 22, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 },
      ],
      anim: [[0, 'ready'], [6, ['swingWind', { armF: -80, foreF: 60, wep: 60 }]], [10, ['swingWind', { armF: -60, foreF: 30, wep: 40, lean: -20 }]], [13, ['swing', { wep: 0, lean: 28 }]], [22, ['swing', { wep: 0, lean: 28 }]], [50, 'idle']],
      sfx: [[12, 'whiff']],
    },
    sspecThrow: {
      frames: 46,
      throw: { release: 28, holdAt: 'wep', hx: 6, hy: -6, hit: { dmg: 12, ang: 45, bkb: 62, kbg: 74, fx: 'sound' } },
      anim: [[0, ['swing', { wep: 0, lean: 28 }]], [10, ['hold', { wep: -20, lean: -6 }]], [18, ['throwB', { rot: -10, wep: 0 }]], [22, ['throwB', { rot: -180, wep: 0 }]], [28, ['throwF', { rot: -360, wep: 0 }]], [46, ['idle', { rot: -360 }]]],
      sfx: [[28, 'smash']],
    },
    uspec: {
      frames: 52,
      helpless: true,
      landHelpless: 24,
      ledgeFrom: 8,
      reverse: true,
      vel: [{ f: [1, 7], vx: 0, vy: 0, grav: 0 }, { f: [8, 30], vy: 16, grav: 0 }, { f: [31, 52], grav: 0.75 }],
      hits: [
        { f: [8, 28], at: 'hip', y: -46, r: 34, dmg: 2, ang: 88, bkb: 34, kbg: 22, rehit: 5, fx: 'elec', hitlag: 0.5 },
        { f: [8, 28], at: 'head', r: 32, dmg: 2, ang: 88, bkb: 34, kbg: 22, rehit: 5, fx: 'elec', hitlag: 0.5 },
        { f: [29, 32], at: 'head', y: 12, r: 38, dmg: 6, ang: 80, bkb: 62, kbg: 90, grp: 1, fx: 'elec' },
      ],
      anim: [[0, ['crouch', { wep: 0 }]], [7, ['crouch', { wep: 0, sy: 0.9 }]], [9, 'broadcast'], [30, ['broadcast', { lean: 4 }]], [52, 'helpless']],
      sfx: [[8, 'jet'], [8, 'elec']],
    },
    dspec: {
      frames: 48,
      script: 'max:spotlight',
      anim: [[0, 'ready'], [8, ['present', { armB: 60, foreB: 30 }]], [14, ['present', { armF: 100, foreF: 0, wep: 0, armB: 40, foreB: 30 }]], [30, ['present', { armF: 100, foreF: 0, wep: 0, armB: 40, foreB: 30 }]], [48, 'idle']],
      sfx: [[14, 'zap']],
    },
    ledgeatk: {
      frames: 50,
      hits: [
        { f: [18, 21], at: 'wep', r: 22, dmg: 9, ang: 361, bkb: 45, kbg: 45 },
        { f: [18, 21], at: 'handF', r: 17, dmg: 8, ang: 361, bkb: 45, kbg: 45 },
      ],
      anim: [[0, 'climb'], [14, 'swingWind'], [19, 'swing'], [27, 'swing'], [50, 'idle']],
    },
    getupatk: {
      frames: 46,
      hits: [
        { f: [14, 16], at: 'footF', r: 21, dmg: 8, ang: 361, bkb: 50, kbg: 40 },
        { f: [22, 24], at: 'footB', r: 21, dmg: 8, ang: 361, bkb: 50, kbg: 40, grp: 1 },
      ],
      anim: [[0, 'lying'], [12, ['downSmash', { lean: 50 }]], [16, 'downSmash'], [24, ['downSmash', { legF: -82, legB: 82 }]], [46, 'idle']],
    },
    ult: {
      frames: 100,
      ult: true,
      script: 'max:ult',
      anim: [[0, ['present', { armF: 100, foreF: 0, wep: 0, armB: 60, foreB: 90 }]], [12, ['present', { armF: 100, foreF: 0, wep: 0, armB: 60, foreB: 90, head: -16 }]], [20, ['present', { armB: 170, foreB: 0 }]], [64, ['present', { armB: 170, foreB: 0, head: -20 }]], [72, 'broadcast'], [86, 'broadcast'], [100, 'idle']],
      sfx: [[1, 'ultimate'], [72, 'boom']],
    },
  },
};

function foes(st: State, f: Fighter): Fighter[] {
  return st.fighters.filter((t) => t.i !== f.i && !t.out && t.act !== A.DEAD && t.act !== A.RESPAWN && !(st.cfg.teams && t.team === f.team && !st.cfg.friendlyFire));
}

registerScripts({
  // Ratings: every hit Max lands bumps them up; they drift back down when the show gets boring
  'max:passive': (st, f) => {
    if (f.v[0] > 0) f.v[0] = Math.max(0, f.v[0] - 0.08);
    void st;
  },
  'max:onhit': (st, f) => {
    f.v[0] = Math.min(100, f.v[0] + 7);
    void st;
  },
  'max:mult': (st, f, _m, out) => {
    out.dmg *= 1 + f.v[0] * 0.0015;
    out.kb *= 1 + f.v[0] * 0.001;
    void st;
  },
  // Spotlight: a hot spotlight pins a spot in front of Max (one at a time)
  'max:spotlight': (st, f) => {
    if (f.mf !== 14) return;
    const pk = cfOf(f).projIdx.spotlight;
    for (const p of st.projs) if (p.o === f.i && p.fd === f.def && p.pk === pk) p.dead = true;
    spawnProj(st, f, pk, f.x + f.facing * 150, f.y - 56 * f.grav);
  },
  // Commercial Break: every bro gets stuck in an ad, then the show comes back with a bang
  'max:ult': (st, f) => {
    const cf = cfOf(f);
    if (f.mf === 6) {
      for (const t of foes(st, f)) spawnProj(st, f, cf.projIdx.adBreak, t.x, t.y - bodyH(st, t) * 0.5 * t.grav);
      ev(st, 'flash', f.x, f.y, f.i);
    }
    if (f.mf === 72) {
      const stg = STAGES[st.stage].solids[0];
      spawnProj(st, f, cf.projIdx.weBack, (stg.x1 + stg.x2) / 2, stg.y1 - 200);
      ev(st, 'flash', f.x, f.y, f.i);
    }
  },
});
