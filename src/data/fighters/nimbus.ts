// Nimbus — the floaty multi-jumper. A small sentient cloud kid from the Sky Isles in tiny rain boots. Four air
// jumps, drifts like a dandelion, rains on you rapidly, blows you off the stage and calls down lightning.
import { A } from '../../sim/acts';
import { ev } from '../../sim/events';
import { cfOf } from '../../sim/fighter';
import { spawnProj } from '../../sim/projectiles';
import { rint } from '../../sim/rng';
import { registerScripts } from '../../sim/scripts';
import { STAGES } from '../../sim/data';
import type { Fighter, FighterDef, State } from '../../sim/types';

export const nimbus: FighterDef = {
  id: 'nimbus',
  name: 'Nimbus',
  title: 'Cries When Bros Hug (It’s Rain)',
  role: 'Floaty multi-jumper',
  color: '#bfe9ff',
  weight: 66,
  power: 1.08,
  rig: { thigh: 14, shin: 12, torso: 24, head: 25, upper: 13, fore: 12, girth: 17, limb: 6.5 },
  stats: { walk: 8.6, dash: 15.5, run: 13.6, dashFrames: 11, airSpeed: 9.6, airAccel: 0.5, airFric: 0.1, groundFric: 0.8, grav: 0.55, fall: 10, ffall: 16, jump: 18.5, hop: 12.5, djump: 15.5, jumps: 4, squat: 3, float: 50 },
  bio: 'A cumulus kid from the Sky Isles who drifted onto the show’s set during a weather segment and refused to leave. Weighs about as much as a hug. Rains when happy, rains when sad, rains when a bro says “nice combo”.',
  line: 'Don’t look at me, I’m misting up. You’re just… so cumulonimbus, bro.',
  taunt: 'Twirls, giggles, and a tiny rainbow pops out over its head.',
  wins: ['Sunshine! (I love you, bro.)', 'Forecast for my bro: 100% chance of hugs. Light drizzle. That’s me crying.', 'Sorry about the lightning! It means I like you!'],
  moveNames: { nspec: 'Raindrop Rapid', sspec: 'Gust', uspec: 'Updraft', dspec: 'Lightning Rod', ult: 'Perfect Storm' },
  projs: {
    rain: { kind: 'nimbusRain', r: 8, life: 40, vx: 12.5, vy: 1.2, grav: 0.22, hit: { dmg: 1.3, ang: 361, bkb: 6, kbg: 16, fx: 'water', hitlag: 0.45 } },
    gust: { kind: 'nimbusGust', r: 46, life: 36, vx: 10.5, drag: 0.965, ghost: true, pierce: true, rehit: 4, reflectable: false, hit: { dmg: 0, ang: 8, bkb: 44, kbg: 0, wind: true, fx: 'wind' } },
    bolt: { kind: 'nimbusBolt', r: 28, life: 22, vy: -44, pierce: true, reflectable: false, hit: { dmg: 13, ang: 80, bkb: 42, kbg: 86, fx: 'elec' } },
    storm: { kind: 'nimbusStorm', r: 40, life: 16, vy: -58, pierce: true, reflectable: false, hit: { dmg: 4.5, ang: 90, bkb: 22, kbg: 22, fx: 'elec', unblockable: true, hitlag: 0.55 } },
    stormMega: { kind: 'nimbusStorm', r: 66, life: 16, vy: -62, pierce: true, reflectable: false, hit: { dmg: 14, ang: 82, bkb: 72, kbg: 102, fx: 'elec', unblockable: true } },
  },
  poses: {
    // the head is huge, so common poses keep the little arms out to the sides instead of across the face
    fall: { lean: 2, head: -4, armF: 72, foreF: 46, armB: -64, foreB: 46, legF: 22, shinF: 40, legB: -16, shinB: 50 },
    jump: { lean: 4, head: -8, armF: 96, foreF: -10, armB: -80, foreB: 20, legF: 34, shinF: 60, legB: -10, shinB: 50, sy: 1.06, sx: 0.96 },
    shield: { lean: 10, head: -4, armF: 58, foreF: 62, armB: 48, foreB: 62, legF: 30, shinF: 50, legB: -20, shinB: 50, y: 4 },
    airdodge: { lean: -6, armF: 100, foreF: 10, armB: -100, foreB: 10, legF: 20, shinF: 40, legB: -20, shinB: 40 },
    hurt: { lean: -24, head: -18, armF: 100, foreF: 30, armB: -110, foreB: 30, legF: 32, shinF: 42, legB: -12, shinB: 32 },
    nIdle: { lean: 4, head: -4, armF: 30, foreF: 50, armB: -24, foreB: 44, legF: 16, shinF: 30, legB: -6, shinB: 36, y: 6 },
    puffIn: { lean: -16, head: -12, armF: 50, foreF: 90, armB: 40, foreB: 90, legF: 24, shinF: 50, legB: -16, shinB: 50, sx: 1.12, sy: 1.1 },
    blow: { lean: 26, head: 16, armF: -40, foreF: 20, armB: -55, foreB: 20, legF: 10, shinF: 30, legB: -40, shinB: 40, sx: 0.94, sy: 0.96 },
    clapWind: { lean: -20, armF: 158, foreF: 26, armB: 146, foreB: 26, legF: 30, shinF: 40, legB: -30, shinB: 30, sy: 0.95 },
    clap: { lean: 32, armF: 96, foreF: 0, armB: 90, foreB: 0, legF: 48, shinF: 30, legB: -50, shinB: 6, sx: 1.08 },
    splash: { lean: 18, head: 8, armF: 50, foreF: -10, armB: -50, foreB: -10, legF: 70, shinF: 90, legB: -60, shinB: 80, sy: 0.88, sx: 1.12 },
    swell: { lean: -8, head: -18, armF: 176, foreF: 0, armB: 168, foreB: 0, legF: 6, shinF: 10, legB: -6, shinB: 10, y: 10, sy: 1.18, sx: 0.94 },
    puffHead: { lean: 36, head: 18, armF: -20, foreF: 30, armB: -40, foreB: 30, legF: 10, shinF: 20, legB: -30, shinB: 30, sx: 1.1 },
  },
  base: {
    idle: [[0, 'nIdle'], [30, ['nIdle', { y: 11, armF: 38, armB: -30, head: -8 }], 'io'], [60, 'nIdle', 'io']],
    walk: [[0, { lean: 14, armF: 40, foreF: 40, armB: -40, foreB: 40, legF: 24, shinF: 40, legB: -18, shinB: 50, y: 8 }], [12, { lean: 16, armF: 10, foreF: 40, armB: -10, foreB: 40, legF: -6, shinF: 50, legB: 20, shinB: 40, y: 13 }, 'io'], [24, { lean: 14, armF: 40, foreF: 40, armB: -40, foreB: 40, legF: 24, shinF: 40, legB: -18, shinB: 50, y: 8 }, 'io']],
    run: [[0, { lean: 34, head: -14, armF: -70, foreF: 30, armB: -90, foreB: 30, legF: -30, shinF: 60, legB: -60, shinB: 50, y: 14 }], [10, { lean: 30, head: -10, armF: -80, foreF: 40, armB: -100, foreB: 40, legF: -40, shinF: 70, legB: -70, shinB: 40, y: 20 }, 'io'], [20, { lean: 34, head: -14, armF: -70, foreF: 30, armB: -90, foreB: 30, legF: -30, shinF: 60, legB: -60, shinB: 50, y: 14 }, 'io']],
    taunt: [[0, 'nIdle'], [8, { lean: -10, head: -14, armF: 96, foreF: -20, armB: -96, foreB: -20, legF: 20, shinF: 40, legB: -10, shinB: 40, y: 14, rot: 0 }], [30, { lean: -10, head: -14, armF: 96, foreF: -20, armB: -96, foreB: -20, legF: 20, shinF: 40, legB: -10, shinB: 40, y: 22, rot: 360 }, 'io'], [50, { lean: -6, head: -10, armF: 90, foreF: 30, armB: -90, foreB: 30, y: 12, rot: 360 }], [60, ['nIdle', { rot: 360 }]]],
  },
  moves: {
    jab1: {
      frames: 16,
      hits: [{ f: [3, 4], at: 'handF', r: 12, dmg: 2, ang: 361, bkb: 16, kbg: 25 }],
      next: [{ move: 'jab2', from: 4, to: 14 }],
      anim: [[0, 'jabWind'], [3, 'jab1'], [9, 'jab1'], [16, 'nIdle']],
    },
    jab2: {
      frames: 16,
      hits: [{ f: [3, 4], at: 'handB', r: 12, dmg: 2, ang: 361, bkb: 16, kbg: 25 }],
      next: [{ move: 'jab3', from: 4, to: 14 }],
      anim: [[0, 'jab1'], [3, 'jab2'], [9, 'jab2'], [16, 'nIdle']],
    },
    jab3: {
      frames: 28,
      hits: [{ f: [5, 7], at: 'head', x: 10, r: 24, dmg: 4.5, ang: 45, bkb: 45, kbg: 88, fx: 'wind' }],
      anim: [[0, 'puffIn'], [4, ['puffIn', { lean: -24 }]], [6, 'puffHead'], [13, 'puffHead'], [28, 'nIdle']],
    },
    ftilt: {
      frames: 26,
      hits: [
        { f: [6, 8], at: 'footF', r: 15, dmg: 8, ang: 361, bkb: 22, kbg: 92, fx: 'water' },
        { f: [6, 8], at: 'kneeF', r: 11, dmg: 6.5, ang: 361, bkb: 22, kbg: 88 },
      ],
      anim: [[0, 'kickWind'], [6, ['kick', { legF: 100, y: 6 }]], [12, ['kick', { y: 6 }]], [26, 'nIdle']],
    },
    utilt: {
      frames: 28,
      hits: [
        { f: [5, 10], at: 'head', y: 12, r: 24, dmg: 6.5, ang: 95, bkb: 28, kbg: 115, fx: 'wind' },
        { f: [5, 10], at: 'handF', r: 13, dmg: 5.5, ang: 95, bkb: 28, kbg: 110 },
      ],
      anim: [[0, 'uppercutWind'], [5, 'swell'], [11, 'swell'], [28, 'nIdle']],
    },
    dtilt: {
      frames: 22,
      hits: [{ f: [5, 7], at: 'footF', r: 14, dmg: 5.5, ang: 75, bkb: 32, kbg: 70, fx: 'water' }],
      anim: [[0, 'crouch'], [5, 'kickLow'], [10, 'kickLow'], [22, 'crouch']],
    },
    dash: {
      frames: 36,
      vel: [{ f: [1, 4], vx: 12 }, { f: [5, 18], vx: 10 }, { f: [19, 36], vx: 2 }],
      hits: [
        { f: [6, 11], at: 'neck', r: 32, dmg: 8.5, ang: 62, bkb: 55, kbg: 60, fx: 'wind' },
        { f: [12, 18], at: 'neck', r: 26, dmg: 5, ang: 62, bkb: 40, kbg: 40, fx: 'wind' },
      ],
      anim: [[0, 'dash'], [5, ['tuck', { rot: 0, y: 10 }]], [12, ['tuck', { rot: 200, y: 14 }], 'lin'], [19, ['tuck', { rot: 360, y: 8 }], 'lin'], [36, ['nIdle', { rot: 360 }]]],
    },
    fsmash: {
      frames: 46,
      charge: 10,
      hits: [
        { f: [14, 16], at: 'handF', x: 10, r: 23, dmg: 16, ang: 361, bkb: 30, kbg: 100, fx: 'elec' },
        { f: [14, 16], at: 'elbowF', r: 14, dmg: 13, ang: 361, bkb: 30, kbg: 96, fx: 'elec' },
      ],
      anim: [[0, 'ready'], [9, 'clapWind'], [13, ['clapWind', { lean: -24 }]], [15, 'clap'], [24, 'clap'], [46, 'nIdle']],
      sfx: [[14, 'zap']],
    },
    usmash: {
      frames: 42,
      charge: 6,
      hits: [
        { f: [9, 14], at: 'head', y: 20, r: 27, dmg: 15, ang: 90, bkb: 32, kbg: 98, fx: 'elec' },
        { f: [9, 14], at: 'handF', r: 15, dmg: 12, ang: 90, bkb: 32, kbg: 95, fx: 'elec' },
      ],
      anim: [[0, 'ready'], [6, 'upSmashWind'], [10, 'swell'], [18, 'swell'], [42, 'nIdle']],
      sfx: [[9, 'zap']],
    },
    dsmash: {
      frames: 42,
      charge: 5,
      hits: [
        { f: [8, 10], at: 'hip', x: 48, y: -4, r: 27, dmg: 12, ang: 30, bkb: 30, kbg: 95, fx: 'water', away: true },
        { f: [8, 10], at: 'hip', x: -48, y: -4, r: 27, dmg: 12, ang: 30, bkb: 30, kbg: 95, fx: 'water', away: true },
      ],
      anim: [[0, 'crouch'], [5, ['puffIn', { y: 10 }]], [9, 'splash'], [18, 'splash'], [42, 'nIdle']],
    },
    nair: {
      frames: 36,
      air: true,
      landLag: 7,
      autoCancel: [3, 30],
      hits: [
        { f: [3, 6], at: 'neck', y: -4, r: 31, dmg: 8, ang: 361, bkb: 16, kbg: 100, fx: 'wind' },
        { f: [7, 20], at: 'neck', y: -4, r: 27, dmg: 5, ang: 361, bkb: 10, kbg: 90, fx: 'wind' },
      ],
      anim: [[0, ['tuck', { rot: 0 }]], [3, ['spin', { rot: 60 }]], [20, ['spin', { rot: 400 }], 'lin'], [36, ['fall', { rot: 360 }]]],
    },
    fair: {
      frames: 38,
      air: true,
      landLag: 11,
      autoCancel: [3, 32],
      hits: [
        { f: [9, 12], at: 'handF', x: 6, r: 18, dmg: 12, ang: 40, bkb: 34, kbg: 98 },
        { f: [9, 12], at: 'handB', x: 6, r: 15, dmg: 11, ang: 40, bkb: 34, kbg: 96 },
      ],
      anim: [[0, 'fairWind'], [8, ['fairWind', { lean: -24 }]], [10, 'fair'], [18, 'fair'], [38, 'fall']],
    },
    bair: {
      frames: 32,
      air: true,
      landLag: 9,
      autoCancel: [3, 26],
      hits: [{ f: [6, 9], at: 'footB', r: 17, dmg: 11.5, ang: 361, bkb: 20, kbg: 100, fx: 'wind' }],
      anim: [[0, ['bair', { legB: -40, shinB: 100 }]], [6, 'bair'], [14, 'bair'], [32, 'fall']],
    },
    uair: {
      frames: 30,
      air: true,
      landLag: 8,
      autoCancel: [3, 24],
      hits: [{ f: [5, 10], at: 'head', y: 12, r: 24, dmg: 8, ang: 80, bkb: 26, kbg: 112, fx: 'wind' }],
      anim: [[0, ['tuck', { lean: 20 }]], [5, ['swell', { lean: -30, head: -26, y: 0 }]], [12, ['swell', { lean: -30, head: -26, y: 0 }]], [30, 'fall']],
    },
    dair: {
      frames: 42,
      air: true,
      landLag: 16,
      autoCancel: [3, 36],
      hits: [
        { f: [12, 15], at: 'footF', r: 16, dmg: 12, ang: 270, bkb: 20, kbg: 86, fx: 'ice' },
        { f: [12, 15], at: 'footB', r: 14, dmg: 12, ang: 270, bkb: 20, kbg: 86, fx: 'ice' },
        { f: [16, 22], at: 'footF', r: 14, dmg: 7, ang: 361, bkb: 20, kbg: 70, fx: 'ice' },
      ],
      anim: [[0, 'dairWind'], [11, 'dairWind'], [13, 'dair'], [22, 'dair'], [42, 'fall']],
    },
    grab: {
      frames: 30,
      hits: [{ f: [6, 8], at: 'handF', r: 15, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'ready'], [6, 'grab'], [12, 'grab'], [30, 'nIdle']],
    },
    dashgrab: {
      frames: 38,
      vel: [{ f: [1, 10], vx: 8.5 }, { f: [11, 38], vx: 1 }],
      hits: [{ f: [8, 11], at: 'handF', r: 17, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'dash'], [8, 'grab'], [16, 'grab'], [38, 'nIdle']],
    },
    pummel: { frames: 16, pummel: 1.3, anim: [[0, 'hold'], [4, ['hold', { head: 20, sy: 1.1 }]], [16, 'hold']] },
    fthrow: {
      frames: 30,
      throw: { release: 13, hit: { dmg: 7, ang: 38, bkb: 62, kbg: 60, fx: 'wind' } },
      anim: [[0, 'hold'], [8, 'puffIn'], [13, 'blow'], [22, 'blow'], [30, 'nIdle']],
    },
    bthrow: {
      frames: 32,
      throw: { release: 14, holdAt: 'handF', hit: { dmg: 10, ang: 140, bkb: 60, kbg: 70 } },
      anim: [[0, 'hold'], [6, ['throwF', { rot: -90 }]], [12, ['throwB', { rot: -200 }]], [16, ['throwB', { rot: -340 }]], [32, ['nIdle', { rot: -360 }]]],
    },
    uthrow: {
      frames: 34,
      throw: { release: 13, hit: { dmg: 8, ang: 90, bkb: 70, kbg: 76, fx: 'wind' } },
      anim: [[0, 'hold'], [8, 'puffIn'], [13, 'swell'], [34, 'nIdle']],
    },
    dthrow: {
      frames: 36,
      throw: { release: 16, hit: { dmg: 5, ang: 72, bkb: 58, kbg: 40, fx: 'water' } },
      anim: [[0, 'hold'], [8, ['tuck', { y: 20 }]], [16, ['splash', { y: 0 }]], [24, 'splash'], [36, 'nIdle']],
    },
    nspec: {
      frames: 26,
      loop: { from: 6, to: 13, on: 'special', max: 26 },
      shots: [
        { f: 6, proj: 'rain', at: 'handF', x: 6 },
        { f: 10, proj: 'rain', at: 'handB', x: 6, vy: 3 },
      ],
      anim: [[0, 'castWind'], [5, ['cast', { sx: 1.06 }]], [9, ['cast', { armB: 92, foreB: 0, armF: 60, foreF: 40 }]], [13, 'cast'], [26, 'nIdle']],
    },
    nspecAir: {
      frames: 26,
      loop: { from: 6, to: 13, on: 'special', max: 26 },
      vel: [{ f: [1, 26], grav: 0.45 }],
      shots: [
        { f: 6, proj: 'rain', at: 'handF', x: 6 },
        { f: 10, proj: 'rain', at: 'handB', x: 6, vy: 3 },
      ],
      anim: [[0, 'castWind'], [5, ['cast', { sx: 1.06 }]], [9, ['cast', { armB: 92, foreB: 0, armF: 60, foreF: 40 }]], [13, 'cast'], [26, 'fall']],
    },
    sspec: {
      frames: 46,
      oncePerAir: true,
      vel: [{ f: [1, 30], grav: 0.3 }],
      shots: [{ f: 13, proj: 'gust', at: 'head', x: 24 }],
      anim: [[0, 'nIdle'], [6, 'puffIn'], [12, ['puffIn', { sx: 1.2, sy: 1.15 }]], [14, 'blow'], [30, 'blow'], [46, 'nIdle']],
      sfx: [[13, 'whiff']],
    },
    uspec: {
      frames: 46,
      helpless: true,
      landHelpless: 20,
      ledgeFrom: 8,
      reverse: true,
      vel: [{ f: [1, 5], vx: 0, vy: 2, grav: 0 }, { f: [6, 30], vy: 15, grav: 0 }, { f: [31, 46], grav: 0.6 }],
      hits: [
        { f: [6, 28], at: 'neck', r: 32, dmg: 1.5, ang: 88, bkb: 32, kbg: 20, rehit: 5, fx: 'wind', hitlag: 0.5 },
        { f: [29, 31], at: 'head', y: 10, r: 32, dmg: 4, ang: 80, bkb: 60, kbg: 85, grp: 1, fx: 'wind' },
      ],
      anim: [[0, 'squat'], [5, 'squat'], [6, ['swell', { rot: 0, y: 0 }]], [29, ['swell', { rot: 720, y: 0 }], 'lin'], [46, ['helpless', { rot: 720 }]]],
      sfx: [[6, 'jet']],
    },
    dspec: {
      frames: 50,
      vel: [{ f: [1, 30], grav: 0.45 }],
      script: 'nimbus:bolt',
      anim: [[0, 'ready'], [8, ['castUp', { lean: -14, armB: 60, foreB: 60 }]], [14, ['castUp', { lean: -18, armB: 60, foreB: 60, sy: 1.06 }]], [32, ['castUp', { armB: 60, foreB: 60 }]], [50, 'nIdle']],
      sfx: [[13, 'zap']],
    },
    ledgeatk: {
      frames: 48,
      hits: [{ f: [17, 20], at: 'head', x: 8, r: 24, dmg: 8, ang: 361, bkb: 45, kbg: 45, fx: 'wind' }],
      anim: [[0, 'climb'], [14, 'puffIn'], [18, 'puffHead'], [26, 'puffHead'], [48, 'nIdle']],
    },
    getupatk: {
      frames: 44,
      hits: [
        { f: [14, 16], at: 'footF', r: 18, dmg: 7, ang: 361, bkb: 50, kbg: 40 },
        { f: [22, 24], at: 'footB', r: 18, dmg: 7, ang: 361, bkb: 50, kbg: 40, grp: 1 },
      ],
      anim: [[0, 'lying'], [12, ['downSmash', { lean: 50 }]], [16, 'downSmash'], [24, ['downSmash', { legF: -82, legB: 82 }]], [44, 'nIdle']],
    },
    ult: {
      frames: 120,
      ult: true,
      script: 'nimbus:ult',
      vel: [{ f: [1, 22], vx: 0, vy: 3, grav: 0 }, { f: [23, 104], vx: 0, vy: 0, grav: 0 }],
      anim: [[0, ['swell', { sx: 1.25, sy: 1.3 }]], [20, ['swell', { sx: 1.3, sy: 1.35, armF: 150, armB: 150 }]], [60, ['swell', { sx: 1.35, sy: 1.4, armF: 178, armB: 172 }], 'io'], [84, ['swell', { sx: 1.45, sy: 1.5 }]], [92, ['victory', { sx: 1.2, sy: 1.2 }]], [120, 'nIdle']],
      sfx: [[1, 'elec']],
    },
  },
};

/** opponents a script may aim at (not me, not out, not a teammate) */
function foes(st: State, f: Fighter): Fighter[] {
  return st.fighters.filter((t) => t.i !== f.i && !t.out && t.act !== A.DEAD && t.act !== A.RESPAWN && !(st.cfg.teams && t.team === f.team && !st.cfg.friendlyFire));
}

registerScripts({
  // Lightning Rod: a bolt drops out of the sky a little in front of Nimbus
  'nimbus:bolt': (st, f) => {
    if (f.mf !== 14) return;
    const pk = cfOf(f).projIdx.bolt;
    spawnProj(st, f, pk, f.x + f.facing * 118, f.y - 470 * f.grav);
  },
  // Perfect Storm: bolts track every bro, stray strikes crackle across the stage, then one huge strike each
  'nimbus:ult': (st, f) => {
    const cf = cfOf(f);
    const mf = f.mf;
    const stg = STAGES[st.stage].solids[0];
    if (mf >= 12 && mf <= 72 && (mf - 12) % 15 === 0) {
      for (const t of foes(st, f)) spawnProj(st, f, cf.projIdx.storm, t.x, t.y - 430);
      for (let i = 0; i < 2; i++) {
        const x = stg.x1 + 40 + rint(st, Math.max(1, stg.x2 - stg.x1 - 80));
        spawnProj(st, f, cf.projIdx.storm, x, stg.y1 - 520);
      }
      ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'elec');
    }
    if (mf === 88) {
      for (const t of foes(st, f)) spawnProj(st, f, cf.projIdx.stormMega, t.x, t.y - 460);
      ev(st, 'flash', f.x, f.y, f.i);
      ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'smash');
    }
  },
});
