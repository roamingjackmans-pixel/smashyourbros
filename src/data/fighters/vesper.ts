// Vesper — the ninja. Shadow cat from the Moonlit Rooftops: hood with tall ears poking through, a long moonlit
// scarf, wrapped paws, a tiny pink notebook of haiku about their bros. Light, fast, combo-heavy, tricky.
import { A } from '../../sim/acts';
import { STAGES } from '../../sim/data';
import { ev } from '../../sim/events';
import { bodyH, bodyW, cfOf, surfs, sx } from '../../sim/fighter';
import { spawnProj } from '../../sim/projectiles';
import { registerScripts } from '../../sim/scripts';
import type { Fighter, FighterDef, State } from '../../sim/types';

export const vesper: FighterDef = {
  id: 'vesper',
  name: 'Vesper',
  title: 'Too Cool (Secretly Writes Poems About You)',
  role: 'Ninja',
  color: '#7a6cff',
  weight: 80,
  power: 1,
  rig: { thigh: 22, shin: 23, torso: 32, head: 19, upper: 18, fore: 17, girth: 12, limb: 6, wep: 22, tail: 46 },
  stats: { walk: 10.5, dash: 20, run: 18.5, dashFrames: 10, airSpeed: 10.5, airAccel: 0.62, airFric: 0.13, groundFric: 0.9, grav: 0.9, fall: 15, ffall: 24, jump: 22, hop: 14.5, djump: 20.5, jumps: 1, squat: 3 },
  bio: 'The quietest shadow on the Moonlit Rooftops, beamed aboard mid-backflip. Answers every question with a shrug. Carries a tiny pink notebook full of haiku about every bro who has ever been nice to them, and will deny it until the moon falls out of the sky.',
  line: 'I’m not blushing, it’s the moonlight. …You’re cool or whatever, bro.',
  taunt: 'Scribbles a haiku in a tiny pink notebook, blushes, and hides it behind their back.',
  wins: ['Haiku for you: / you fell off the stage / I’ll still text you later bro.', '…Good fight. Not that I was watching you. (I was watching you.)', 'The moon saw everything, bro. It says you were amazing.'],
  moveNames: { nspec: 'Kunai Fan', sspec: 'Shadow Step', uspec: 'Smoke Burst', dspec: 'Shade Counter', ult: 'Eclipse' },
  poses: {
    // base stance and air poses (override the shared library for Vesper only)
    idle: { lean: 14, head: -4, armF: 38, foreF: 92, armB: -28, foreB: 70, legF: 28, shinF: 40, legB: -24, shinB: 36, tail: 80 },
    crouch: { lean: 34, head: -14, armF: 55, foreF: 70, armB: 30, foreB: 70, legF: 78, shinF: 118, legB: 18, shinB: 118, tail: 95 },
    fall: { lean: 4, head: -4, armF: 115, foreF: 30, armB: 85, foreB: 40, legF: 34, shinF: 60, legB: -18, shinB: 60, tail: 110 },
    jump: { lean: -2, armF: 155, foreF: 15, armB: -40, foreB: 30, legF: 55, shinF: 85, legB: -12, shinB: 50, tail: 125 },
    dash: { lean: 42, head: -18, armF: -70, foreF: 15, armB: -82, foreB: 15, legF: 72, shinF: 55, legB: -60, shinB: 75, tail: 100 },
    // strikes
    vClaw: { lean: 18, head: 2, armF: 92, foreF: 4, armB: 20, foreB: 95, legF: 30, shinF: 26, legB: -24, shinB: 18, tail: 90 },
    vClaw2: { lean: 22, head: 2, armF: 30, foreF: 100, armB: 94, foreB: 4, legF: 30, shinF: 26, legB: -26, shinB: 18, tail: 95 },
    vPalm: { lean: 26, head: 4, armF: 95, foreF: 0, armB: 86, foreB: 6, legF: 46, shinF: 24, legB: -42, shinB: 8, tail: 85 },
    vSlide: { rot: 14, lean: -52, head: 14, armF: 40, foreF: 40, armB: -50, foreB: 20, legF: 86, shinF: 0, legB: 28, shinB: 132, tail: 40 },
    vThrowWind: { lean: -14, head: -4, armF: 200, foreF: 70, armB: 40, foreB: 100, legF: 30, shinF: 30, legB: -30, shinB: 20, tail: 125, wep: 60 },
    vThrow: { lean: 22, head: 4, armF: 88, foreF: 0, armB: -30, foreB: 40, legF: 40, shinF: 25, legB: -36, shinB: 10, tail: 80, wep: 0 },
    // smash attacks
    vSmashWind: { lean: -18, head: -6, armF: 205, foreF: 50, wep: 10, armB: 190, foreB: 55, legF: 45, shinF: 70, legB: -42, shinB: 30, tail: 145 },
    vSmashHit: { lean: 38, head: 6, armF: 75, foreF: 0, wep: 0, armB: 55, foreB: 10, legF: 75, shinF: 35, legB: -62, shinB: 8, tail: 80 },
    vUpSpin: { lean: -6, head: -12, armF: 180, foreF: 0, wep: 0, armB: 165, foreB: 18, legF: 20, shinF: 50, legB: -16, shinB: 40, tail: 165, y: 14 },
    vSplitWind: { lean: 20, head: -6, armF: 150, foreF: 30, armB: 140, foreB: 30, legF: 50, shinF: 92, legB: -20, shinB: 92, tail: 170 },
    vSplitFront: { lean: 30, head: 4, armF: 40, foreF: 30, armB: -24, foreB: 30, legF: 92, shinF: 0, legB: -20, shinB: 122, tail: 40 },
    vSplitBack: { lean: -14, head: -6, armF: 70, foreF: 40, armB: -40, foreB: 30, legF: 26, shinF: 116, legB: -100, shinB: 0, tail: 150 },
    // aerials
    vWheel: { lean: 10, head: 0, armF: 100, foreF: 20, armB: -100, foreB: 20, legF: 86, shinF: 10, legB: -50, shinB: 40, tail: 90 },
    vFairWind: { lean: -12, head: -4, armF: 178, foreF: 35, armB: 160, foreB: 35, legF: 45, shinF: 85, legB: -8, shinB: 70, tail: 125 },
    vFair1: { lean: 22, head: 4, armF: 70, foreF: 0, armB: 165, foreB: 30, legF: 50, shinF: 70, legB: -12, shinB: 70, tail: 110 },
    vFair2: { lean: 34, head: 8, armF: 30, foreF: 30, armB: 72, foreB: 0, legF: 55, shinF: 60, legB: -16, shinB: 70, tail: 100 },
    vDairWind: { lean: 10, head: 6, armF: 150, foreF: 30, armB: 140, foreB: 30, legF: 95, shinF: 130, legB: 85, shinB: 130, tail: 160 },
    vDair: { lean: -6, head: 10, armF: 165, foreF: 10, armB: 150, foreB: 10, legF: 8, shinF: 0, legB: -4, shinB: 18, tail: 172 },
    // specials
    vStepWind: { lean: 36, head: -10, armF: -40, foreF: 30, wep: 0, armB: -60, foreB: 20, legF: 62, shinF: 100, legB: -30, shinB: 90, tail: 120 },
    vGuard: { lean: 4, head: -6, armF: 122, foreF: 118, wep: 40, armB: 112, foreB: 128, legF: 30, shinF: 42, legB: -26, shinB: 36, tail: 150 },
    vUltPose: { lean: -10, head: -14, armF: 170, foreF: 10, wep: 0, armB: 70, foreB: 125, legF: 20, shinF: 15, legB: -30, shinB: 20, tail: 160 },
    vSheathe: { lean: 6, head: 10, armF: 28, foreF: 112, wep: 160, armB: 18, foreB: 108, legF: 18, shinF: 18, legB: -20, shinB: 18, tail: 60 },
    // taunt
    vWrite: { lean: 10, head: 16, armF: 72, foreF: 112, armB: 58, foreB: 104, legF: 20, shinF: 25, legB: -18, shinB: 22, tail: 90 },
  },
  base: {
    // sneaky tiptoe walk, paws up
    walk: [
      [0, { lean: 22, head: -10, armF: 75, foreF: 110, armB: 55, foreB: 110, legF: 40, shinF: 50, legB: -20, shinB: 30, tail: 120 }],
      [7, { lean: 22, head: -10, armF: 70, foreF: 115, armB: 60, foreB: 105, legF: 12, shinF: 92, legB: -2, shinB: 22, tail: 126, y: 3 }],
      [14, { lean: 22, head: -10, armF: 75, foreF: 110, armB: 55, foreB: 110, legF: -20, shinF: 30, legB: 40, shinB: 50, tail: 120 }],
      [21, { lean: 22, head: -10, armF: 80, foreF: 105, armB: 50, foreB: 115, legF: -2, shinF: 22, legB: 12, shinB: 92, tail: 114, y: 3 }],
      [27, { lean: 22, head: -10, armF: 75, foreF: 110, armB: 55, foreB: 110, legF: 38, shinF: 50, legB: -18, shinB: 30, tail: 120 }],
    ],
    // ninja run: arms swept back
    run: [
      [0, { lean: 40, head: -22, armF: -62, foreF: 12, armB: -80, foreB: 12, legF: 66, shinF: 35, legB: -45, shinB: 88, tail: 104, y: 3 }],
      [4, { lean: 42, head: -22, armF: -60, foreF: 14, armB: -78, foreB: 14, legF: 16, shinF: 112, legB: 4, shinB: 34, tail: 98, y: 8 }],
      [8, { lean: 40, head: -22, armF: -62, foreF: 12, armB: -80, foreB: 12, legF: -45, shinF: 88, legB: 66, shinB: 35, tail: 108, y: 3 }],
      [12, { lean: 42, head: -22, armF: -60, foreF: 14, armB: -78, foreB: 14, legF: 4, shinF: 34, legB: 16, shinB: 112, tail: 98, y: 8 }],
      [15, { lean: 40, head: -22, armF: -62, foreF: 12, armB: -80, foreB: 12, legF: 52, shinF: 50, legB: -32, shinB: 80, tail: 104, y: 4 }],
    ],
    // pulls out the notebook, scribbles, blushes, hides it
    taunt: [
      [0, 'idle'],
      [8, 'vWrite'],
      [13, ['vWrite', { armF: 66, foreF: 100 }]],
      [18, 'vWrite'],
      [23, ['vWrite', { armF: 66, foreF: 100 }]],
      [28, 'vWrite'],
      [33, ['vWrite', { armF: 66, foreF: 100 }]],
      [40, { lean: 0, head: -6, armF: 120, foreF: 70, armB: 128, foreB: 76, legF: 14, shinF: 14, legB: -14, shinB: 14, tail: 150 }],
      [47, { lean: 0, head: -6, armF: 118, foreF: 72, armB: 126, foreB: 78, legF: 14, shinF: 14, legB: -14, shinB: 14, tail: 160 }],
      [52, { lean: 10, head: 8, armF: 40, foreF: 90, armB: -60, foreB: 40, legF: 20, shinF: 22, legB: -20, shinB: 22, tail: 60 }],
      [60, 'idle'],
    ],
  },
  projs: {
    kunai: { kind: 'kunai', r: 9, life: 34, vx: 16, hit: { dmg: 2.6, ang: 361, bkb: 14, kbg: 40, fx: 'slash' } },
    // the lights go out (visual only: a pulse that never fires, no contact hits)
    eclipse: { kind: 'eclipse', r: 1, life: 74, ghost: true, reflectable: false, hit: { dmg: 0, ang: 0, bkb: 0, kbg: 0 }, pulse: { every: 9999, r: 1, hit: { dmg: 0, ang: 0, bkb: 0, kbg: 0, wind: true } } },
    // the flurry: follows its bro (script), locks them with quick slashes
    eclipseSlash: { kind: 'eclipseSlash', r: 72, life: 54, ghost: true, pierce: true, stick: true, reflectable: false, rehit: 5, hit: { dmg: 2, ang: 90, bkb: 16, kbg: 0, fx: 'slash', unblockable: true } },
    eclipseFinish: { kind: 'eclipseFinish', r: 96, life: 14, ghost: true, pierce: true, stick: true, reflectable: false, hit: { dmg: 15, ang: 72, bkb: 78, kbg: 106, fx: 'dark', unblockable: true } },
  },
  moves: {
    jab1: {
      frames: 16,
      hits: [{ f: [3, 4], at: 'handF', x: 2, r: 12, dmg: 2.2, ang: 361, bkb: 18, kbg: 25, fx: 'slash' }],
      next: [{ move: 'jab2', from: 4, to: 14 }],
      anim: [[0, 'jabWind'], [3, 'vClaw'], [8, 'vClaw'], [16, 'idle']],
    },
    jab2: {
      frames: 16,
      hits: [{ f: [3, 4], at: 'handB', x: 2, r: 12, dmg: 2, ang: 361, bkb: 18, kbg: 25, fx: 'slash' }],
      next: [{ move: 'jab3', from: 4, to: 14 }],
      anim: [[0, 'vClaw'], [3, 'vClaw2'], [8, 'vClaw2'], [16, 'idle']],
    },
    jab3: {
      frames: 28,
      hits: [
        { f: [5, 7], at: 'handF', r: 15, dmg: 4, ang: 50, bkb: 50, kbg: 85, fx: 'slash' },
        { f: [5, 7], at: 'handB', r: 14, dmg: 4, ang: 50, bkb: 50, kbg: 85, fx: 'slash' },
      ],
      anim: [[0, 'vClaw2'], [3, ['jabWind', { armB: 20, foreB: 110 }]], [5, 'vPalm'], [12, 'vPalm'], [28, 'idle']],
    },
    ftilt: {
      frames: 26,
      hits: [
        { f: [6, 8], at: 'footF', r: 16, dmg: 8, ang: 361, bkb: 22, kbg: 90 },
        { f: [6, 8], at: 'kneeF', r: 11, dmg: 6.5, ang: 361, bkb: 22, kbg: 88 },
      ],
      anim: [[0, ['kickWind', { tail: 120 }]], [5, ['kickWind', { lean: -16, legF: 80 }]], [6, ['kick', { lean: -26, legF: 102, tail: 140 }]], [12, ['kick', { lean: -22, legF: 98, tail: 130 }]], [26, 'idle']],
    },
    utilt: {
      frames: 28,
      hits: [
        { f: [5, 11], at: 'footF', r: 16, dmg: 6.5, ang: 94, bkb: 26, kbg: 116 },
        { f: [5, 11], at: 'kneeF', r: 11, dmg: 5.5, ang: 94, bkb: 26, kbg: 110 },
      ],
      anim: [[0, ['kickWind', { tail: 140 }]], [4, ['kickHigh', { legF: 105, lean: -26 }]], [7, ['kickHigh', { legF: 160, lean: -38, armF: 70, tail: 40 }]], [11, ['kickHigh', { legF: 192, lean: -34, armF: 80, tail: 30 }]], [18, ['kickHigh', { legF: 150, lean: -20 }]], [28, 'idle']],
      sfx: [[5, 'whiff']],
    },
    dtilt: {
      frames: 22,
      hits: [{ f: [5, 8], at: 'tail', r: 16, dmg: 5.5, ang: 76, bkb: 34, kbg: 66 }],
      anim: [[0, ['crouch', { tail: 100 }]], [3, ['crouch', { tail: 125, lean: 46 }]], [4, ['crouch', { tail: 110, lean: 48 }]], [5, ['crouch', { tail: -62, lean: 50, armF: 70 }]], [8, ['crouch', { tail: -88, lean: 52, armF: 75 }]], [14, ['crouch', { tail: -80 }]], [22, 'crouch']],
      sfx: [[5, 'whiff']],
    },
    dash: {
      frames: 36,
      vel: [{ f: [1, 4], vx: 14 }, { f: [5, 16], vx: 12 }, { f: [17, 36], vx: 2 }],
      hits: [
        { f: [5, 9], at: 'footF', r: 17, dmg: 8, ang: 65, bkb: 55, kbg: 60 },
        { f: [10, 16], at: 'footF', r: 14, dmg: 5, ang: 70, bkb: 40, kbg: 40 },
      ],
      anim: [[0, 'dash'], [4, 'vSlide'], [16, 'vSlide'], [24, ['crouch', { tail: 90 }]], [36, 'idle']],
    },
    fsmash: {
      frames: 46,
      charge: 10,
      vel: [{ f: [1, 12], vx: 0 }, { f: [13, 15], vx: 14 }, { f: [16, 20], vx: 4 }],
      hits: [
        { f: [13, 16], at: 'wep', r: 20, dmg: 16, ang: 361, bkb: 30, kbg: 101, fx: 'slash' },
        { f: [13, 16], at: 'handF', r: 15, dmg: 13.5, ang: 361, bkb: 30, kbg: 97, fx: 'slash' },
      ],
      anim: [[0, 'ready'], [8, 'vSmashWind'], [12, ['vSmashWind', { lean: -22 }]], [13, ['vSmashHit', { armF: 150, armB: 140 }]], [16, ['vSmashHit', { armF: 70, armB: 55 }]], [24, ['vSmashHit', { armF: 62, armB: 50 }]], [46, 'idle']],
      sfx: [[13, 'slash']],
    },
    usmash: {
      frames: 44,
      charge: 6,
      hits: [
        { f: [9, 16], at: 'wep', r: 18, dmg: 3, ang: 90, bkb: 18, kbg: 0, rehit: 4, fx: 'slash' },
        { f: [9, 16], at: 'head', y: 16, r: 20, dmg: 3, ang: 90, bkb: 18, kbg: 0, rehit: 4, fx: 'slash' },
        { f: [17, 20], at: 'wep', r: 24, dmg: 8.5, ang: 88, bkb: 32, kbg: 104, grp: 1, fx: 'slash' },
        { f: [17, 20], at: 'head', y: 18, r: 24, dmg: 8, ang: 88, bkb: 32, kbg: 100, grp: 1, fx: 'slash' },
      ],
      anim: [
        [0, 'ready'],
        [5, ['upSmashWind', { tail: 150 }]],
        [6, ['upSmashWind', { tail: 150 }]],
        [9, 'vUpSpin'],
        [12, ['vUpSpin', { armF: 150, armB: 195, y: 22 }]],
        [15, ['vUpSpin', { armF: 192, armB: 150, y: 24 }]],
        [18, ['vUpSpin', { armF: 176, armB: 172, y: 18, lean: -12 }]],
        [26, ['vUpSpin', { y: 4 }]],
        [44, 'idle'],
      ],
      sfx: [[9, 'whiff'], [17, 'slash']],
    },
    dsmash: {
      frames: 44,
      charge: 5,
      hits: [
        { f: [7, 9], at: 'footF', r: 17, dmg: 11, ang: 30, bkb: 30, kbg: 96 },
        { f: [7, 9], at: 'kneeF', r: 12, dmg: 9, ang: 30, bkb: 30, kbg: 92 },
        { f: [13, 15], at: 'footB', r: 17, dmg: 12.5, ang: 150, bkb: 30, kbg: 98, grp: 1 },
        { f: [13, 15], at: 'kneeB', r: 12, dmg: 10, ang: 150, bkb: 30, kbg: 94, grp: 1 },
      ],
      anim: [[0, 'crouch'], [4, 'vSplitWind'], [5, 'vSplitWind'], [7, 'vSplitFront'], [10, 'vSplitFront'], [13, 'vSplitBack'], [17, 'vSplitBack'], [26, 'crouch'], [44, 'idle']],
      sfx: [[7, 'whiff'], [13, 'whiff']],
    },
    nair: {
      frames: 36,
      air: true,
      landLag: 7,
      autoCancel: [3, 30],
      hits: [
        { f: [3, 6], at: 'footF', r: 16, dmg: 7.5, ang: 361, bkb: 20, kbg: 95 },
        { f: [3, 6], at: 'tail', r: 14, dmg: 7, ang: 361, bkb: 20, kbg: 95 },
        { f: [7, 20], at: 'footF', r: 13, dmg: 4, ang: 361, bkb: 10, kbg: 82 },
        { f: [7, 20], at: 'tail', r: 13, dmg: 4, ang: 361, bkb: 10, kbg: 82 },
      ],
      anim: [[0, 'tuck'], [3, ['vWheel', { rot: 0 }]], [12, ['vWheel', { rot: 190 }], 'lin'], [21, ['vWheel', { rot: 360 }], 'lin'], [36, ['fall', { rot: 360 }]]],
      sfx: [[3, 'whiff']],
    },
    fair: {
      frames: 38,
      air: true,
      landLag: 10,
      autoCancel: [3, 32],
      hits: [
        { f: [7, 8], at: 'handF', r: 15, dmg: 4.5, ang: 80, bkb: 40, kbg: 20, fx: 'slash' },
        { f: [12, 14], at: 'handB', r: 16, dmg: 7.5, ang: 42, bkb: 36, kbg: 96, grp: 1, fx: 'slash' },
      ],
      anim: [[0, 'vFairWind'], [5, 'vFairWind'], [7, 'vFair1'], [10, ['vFair1', { armF: 40, foreF: 20 }]], [12, 'vFair2'], [18, 'vFair2'], [38, 'fall']],
      sfx: [[7, 'whiff'], [12, 'slash']],
    },
    bair: {
      frames: 32,
      air: true,
      landLag: 9,
      autoCancel: [3, 26],
      hits: [
        { f: [6, 9], at: 'footB', r: 17, dmg: 12, ang: 140, bkb: 20, kbg: 100 },
        { f: [10, 14], at: 'footB', r: 14, dmg: 7.5, ang: 140, bkb: 12, kbg: 85 },
      ],
      anim: [[0, ['bair', { legB: -30, shinB: 110, tail: 120 }]], [5, ['bair', { legB: -20, shinB: 120, tail: 120 }]], [6, ['bair', { tail: 30 }]], [14, ['bair', { tail: 30 }]], [32, 'fall']],
    },
    uair: {
      frames: 32,
      air: true,
      landLag: 8,
      autoCancel: [3, 26],
      hits: [
        { f: [5, 7], at: 'footF', r: 15, dmg: 4, ang: 88, bkb: 45, kbg: 15 },
        { f: [9, 12], at: 'footB', r: 16, dmg: 7.5, ang: 84, bkb: 26, kbg: 112, grp: 1 },
      ],
      anim: [
        [0, ['uairWind', { rot: 0 }]],
        [5, ['uair', { rot: -15, tail: 40 }]],
        [8, ['uair', { rot: -30, legF: 120, legB: 175, shinB: 0, tail: 40 }]],
        [12, ['uair', { rot: -60, legF: 70, legB: 190, shinB: 0, tail: 60 }]],
        [18, ['tuck', { rot: -260 }]],
        [32, ['fall', { rot: -360 }]],
      ],
      sfx: [[5, 'whiff']],
    },
    dair: {
      frames: 40,
      air: true,
      landLag: 15,
      autoCancel: [3, 34],
      vel: [{ f: [1, 9], grav: 0.4 }],
      hits: [
        { f: [12, 14], at: 'footF', r: 16, dmg: 12, ang: 270, bkb: 20, kbg: 85 },
        { f: [12, 14], at: 'footB', r: 14, dmg: 12, ang: 270, bkb: 20, kbg: 85 },
        { f: [15, 22], at: 'footF', r: 13, dmg: 7, ang: 361, bkb: 15, kbg: 70 },
      ],
      anim: [[0, 'vDairWind'], [11, 'vDairWind'], [13, 'vDair'], [22, 'vDair'], [40, 'fall']],
    },
    grab: {
      frames: 30,
      hits: [{ f: [6, 8], at: 'handF', r: 15, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'ready'], [6, 'grab'], [12, 'grab'], [30, 'idle']],
    },
    dashgrab: {
      frames: 38,
      vel: [{ f: [1, 10], vx: 10 }, { f: [11, 38], vx: 1 }],
      hits: [{ f: [8, 11], at: 'handF', r: 17, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'dash'], [8, 'grab'], [16, 'grab'], [38, 'idle']],
    },
    pummel: { frames: 14, pummel: 1.2, anim: [[0, 'hold'], [4, ['hold', { armF: 130, foreF: 30, lean: 16 }]], [8, 'hold'], [14, 'hold']] },
    fthrow: {
      frames: 28,
      throw: { release: 10, hit: { dmg: 7.5, ang: 42, bkb: 60, kbg: 62 } },
      anim: [[0, 'hold'], [6, ['kickWind', { tail: 120 }]], [10, ['kick', { legF: 100, lean: -22 }]], [16, 'kick'], [28, 'idle']],
      sfx: [[10, 'hit']],
    },
    bthrow: {
      frames: 34,
      throw: { release: 15, holdAt: 'handF', hit: { dmg: 10, ang: 140, bkb: 60, kbg: 72 } },
      anim: [[0, 'hold'], [6, ['throwF', { rot: -90 }]], [12, ['throwB', { rot: -200 }]], [16, ['backKick', { rot: -330 }]], [34, ['idle', { rot: -360 }]]],
    },
    uthrow: {
      frames: 34,
      throw: { release: 13, hit: { dmg: 7, ang: 90, bkb: 70, kbg: 68 } },
      anim: [[0, 'hold'], [8, 'crouch'], [13, ['throwUp', { tail: 160 }]], [20, ['uair', { rot: -20 }]], [34, 'idle']],
    },
    dthrow: {
      frames: 34,
      throw: { release: 14, hit: { dmg: 5.5, ang: 72, bkb: 58, kbg: 40 } },
      anim: [[0, 'hold'], [8, ['throwDown', { tail: 150 }]], [14, ['crouch', { lean: 56, armF: 40, armB: 30 }]], [22, 'crouch'], [34, 'idle']],
    },
    nspec: {
      frames: 34,
      shots: [
        { f: 9, proj: 'kunai', at: 'handF', x: 6, vx: 16, vy: 3 },
        { f: 9, proj: 'kunai', at: 'handF', x: 6, vx: 17, vy: 0 },
        { f: 9, proj: 'kunai', at: 'handF', x: 6, vx: 16, vy: -3 },
      ],
      anim: [[0, 'ready'], [6, 'vThrowWind'], [9, 'vThrow'], [20, 'vThrow'], [34, 'idle']],
      sfx: [[9, 'whiff']],
    },
    nspecAir: {
      frames: 36,
      shots: [
        { f: 9, proj: 'kunai', at: 'handF', x: 6, vx: 16, vy: 1.5 },
        { f: 9, proj: 'kunai', at: 'handF', x: 6, vx: 16.5, vy: -2 },
        { f: 9, proj: 'kunai', at: 'handF', x: 6, vx: 15.5, vy: -5.5 },
      ],
      vel: [{ f: [1, 12], grav: 0.5 }],
      anim: [[0, 'fall'], [6, 'vThrowWind'], [9, ['vThrow', { lean: 34 }]], [20, ['vThrow', { lean: 30 }]], [36, 'fall']],
      sfx: [[9, 'whiff']],
    },
    sspec: {
      frames: 40,
      oncePerAir: true,
      edgeStop: true,
      intang: [7, 12],
      script: 'vesper:step',
      vel: [{ f: [1, 7], vx: 1, vy: 0, grav: 0 }, { f: [8, 11], vx: 36, vy: 0, grav: 0, noDrift: true }, { f: [12, 20], vx: 4, vy: 0, grav: 0.3 }],
      hits: [
        { f: [12, 15], at: 'wep', r: 21, dmg: 8.5, ang: 50, bkb: 55, kbg: 62, fx: 'dark' },
        { f: [12, 15], at: 'handF', r: 16, dmg: 8, ang: 50, bkb: 55, kbg: 60, fx: 'dark' },
      ],
      anim: [[0, 'ready'], [6, 'vStepWind'], [8, 'dash'], [11, 'dash'], [12, ['vSmashHit', { armF: 150, armB: 20 }]], [15, ['vSmashHit', { armF: 60, armB: 10 }]], [24, ['vSmashHit', { armF: 55 }]], [40, 'idle']],
      sfx: [[8, 'dash'], [12, 'slash']],
    },
    uspec: {
      frames: 46,
      helpless: true,
      landHelpless: 22,
      ledgeFrom: 8,
      reverse: true,
      intang: [6, 23],
      script: 'vesper:smoke',
      vel: [{ f: [1, 7], vx: 0, vy: 0, grav: 0 }, { f: [8, 24], vy: 22, grav: 0, noDrift: true }, { f: [25, 27], vy: 9, grav: 0.6 }],
      hits: [
        { f: [5, 7], at: 'hip', y: 10, r: 36, dmg: 5, ang: 80, bkb: 55, kbg: 50, fx: 'dark' },
        { f: [25, 29], at: 'footF', r: 16, dmg: 6, ang: 70, bkb: 50, kbg: 72, grp: 1 },
      ],
      anim: [
        [0, 'crouch'],
        [3, ['crouch', { armF: 125, foreF: 20 }]],
        [5, ['castDown', { tail: 140 }]],
        [8, 'jump'],
        [24, ['jump', { armF: 170, armB: 160 }]],
        [25, ['uair', { rot: -40 }]],
        [29, ['uair', { rot: -200 }]],
        [34, ['tuck', { rot: -330 }]],
        [46, ['helpless', { rot: -360 }]],
      ],
      sfx: [[5, 'boom'], [25, 'whiff']],
    },
    dspec: {
      frames: 40,
      counter: { f: [5, 24], move: 'dspecHit', mult: 1.3 },
      vel: [{ f: [1, 24], grav: 0.35 }],
      anim: [[0, 'ready'], [4, 'vGuard'], [24, 'vGuard'], [40, 'idle']],
    },
    dspecHit: {
      frames: 36,
      intang: [1, 10],
      script: 'vesper:counter',
      vel: [{ f: [1, 8], vx: 0, vy: 0, grav: 0 }],
      hits: [
        { f: [5, 8], at: 'wep', r: 22, dmg: 9, ang: 40, bkb: 65, kbg: 80, fx: 'dark' },
        { f: [5, 8], at: 'handF', r: 16, dmg: 8, ang: 40, bkb: 65, kbg: 78, fx: 'dark' },
      ],
      anim: [[0, ['vSmashWind', { lean: 4 }]], [4, 'vSmashWind'], [5, ['vSmashHit', { armF: 150, armB: 140 }]], [8, ['vSmashHit', { armF: 62, armB: 50 }]], [16, ['vSmashHit', { armF: 58 }]], [36, 'idle']],
      sfx: [[1, 'whiff'], [5, 'slash']],
    },
    ledgeatk: {
      frames: 48,
      hits: [{ f: [17, 20], at: 'footF', r: 18, dmg: 8, ang: 361, bkb: 45, kbg: 45 }],
      anim: [[0, 'climb'], [13, ['kickWind', { tail: 120 }]], [17, ['kick', { legF: 96, lean: -22 }]], [24, 'kick'], [48, 'idle']],
    },
    getupatk: {
      frames: 44,
      hits: [
        { f: [14, 16], at: 'footF', r: 18, dmg: 7, ang: 361, bkb: 50, kbg: 40 },
        { f: [22, 24], at: 'footB', r: 18, dmg: 7, ang: 150, bkb: 50, kbg: 40, grp: 1 },
      ],
      anim: [[0, 'lying'], [11, 'vSplitWind'], [14, 'vSplitFront'], [18, 'vSplitFront'], [22, 'vSplitBack'], [26, 'vSplitBack'], [44, 'idle']],
    },
    ult: {
      frames: 100,
      ult: true,
      edgeStop: true,
      vel: [{ f: [1, 56], vx: 0, vy: 0, grav: 0, noDrift: true }],
      script: 'vesper:ult',
      anim: [[0, 'vUltPose'], [6, 'vUltPose'], [10, ['crouch', { tail: 150 }]], [54, ['crouch', { tail: 150 }]], [56, 'vSheathe'], [60, ['vSheathe', { foreF: 126, head: 14 }]], [84, ['vSheathe', { foreF: 126, head: 14 }]], [100, 'idle']],
      sfx: [[10, 'whiff'], [60, 'clank']],
    },
  },
};

// ------------------------------------------------------------------ scripts

function foeOk(st: State, f: Fighter, t: Fighter): boolean {
  if (t.i === f.i || t.out || t.act === A.DEAD || t.act === A.RESPAWN) return false;
  if (st.cfg.teams && t.team === f.team && !st.cfg.friendlyFire) return false;
  return true;
}

/** is a body standing at (x, y) clear of solid stage blocks? */
function clear(st: State, x: number, y: number, h: number): boolean {
  for (const s of surfs(st)) {
    if (s.soft) continue;
    if (x > s.x1 - 6 && x < s.x2 + 6 && y > s.y1 + 2 && y - h < s.y2) return false;
  }
  return true;
}

/** blink to the far side of t, facing them. Returns false (and stays put) if there is no room there. */
function behind(st: State, f: Fighter, t: Fighter): boolean {
  const side = t.x >= f.x ? 1 : -1;
  const stg = STAGES[st.stage].solids[0];
  let nx = t.x + side * (bodyW(st, t) + bodyW(st, f) + 6);
  nx = Math.max(stg.x1 - 150, Math.min(stg.x2 + 150, nx));
  const ny = t.y - t.grav;
  if (!clear(st, nx, ny, bodyH(st, f))) return false;
  f.x = nx;
  f.y = ny;
  f.gnd = -1;
  f.vx = 0;
  f.vy = 0;
  f.facing = nx >= t.x ? -1 : 1;
  return true;
}

registerScripts({
  // Shadow Step: melt into the shadows; if a bro is close in front, reappear behind them
  'vesper:step': (st, f) => {
    if (f.mf === 8) f.v[0] = 0;
    if (f.mf === 9) {
      f.v[1] = f.x;
      f.v[2] = f.y;
      let best: Fighter | null = null;
      let bd = 1e9;
      for (const t of st.fighters) {
        if (!foeOk(st, f, t) || t.act === A.LEDGE || t.act === A.GRABBED || t.intang > 0) continue;
        const dx = (t.x - f.x) * f.facing;
        const dy = Math.abs(t.y - f.y);
        if (dx < -10 || dx > 290 || dy > 110) continue;
        const d = Math.abs(dx) + dy * 0.6;
        if (d < bd) {
          bd = d;
          best = t;
        }
      }
      if (best && behind(st, f, best)) {
        f.v[0] = 1;
        ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'magic');
      }
    }
    if (f.v[0] === 1 && f.mf >= 9 && f.mf <= 11) f.vx = 0;
  },
  // Smoke Burst: remember where the bomb went off (the art puffs smoke there)
  'vesper:smoke': (st, f) => {
    // remember which way the stick leaned as the bomb was thrown (recovering CPUs let go of it mid-move)
    if (f.mf <= 3) {
      const x = sx(f);
      f.v[7] = Math.abs(x) >= 30 ? (x > 0 ? 1 : -1) : 0;
    }
    if (f.mf === 5) {
      f.v[3] = f.x;
      f.v[4] = f.y;
    }
    // steer the rise: a held stick wins, otherwise drift the way it leaned at the start
    if (f.mf >= 8 && f.mf <= 24) {
      const x = sx(f);
      const want = Math.abs(x) >= 30 ? (x / 100) * 9 : f.v[7] * 6;
      f.vx += (want - f.vx) * 0.35;
      // smoke slides around a stage lip instead of bonking its head on the underside
      if (f.mf > 9 && Math.abs(f.y - f.v[6]) < 2) {
        const stg = STAGES[st.stage].solids[0];
        f.vx = (f.x < (stg.x1 + stg.x2) / 2 ? -1 : 1) * 12;
      }
      f.v[6] = f.y;
    }
  },
  // Shade Counter: reappear behind whoever swung at us
  'vesper:counter': (st, f) => {
    if (f.mf !== 1) return;
    f.v[1] = f.x;
    f.v[2] = f.y;
    const a = st.fighters[f.a2];
    if (!a || !foeOk(st, f, a)) return;
    if (Math.abs(a.x - f.x) > 420 || Math.abs(a.y - f.y) > 260) return;
    behind(st, f, a);
  },
  // Eclipse: the lights go out, every bro on stage gets a flurry, then one clean finishing cut
  'vesper:ult': (st, f) => {
    const cf = cfOf(f);
    const stg = STAGES[st.stage].solids[0];
    const slash = cf.projIdx.eclipseSlash;
    if (f.mf === 2) spawnProj(st, f, cf.projIdx.eclipse, (stg.x1 + stg.x2) / 2, stg.y1 - 470, 0, 0);
    if (f.mf === 10) {
      for (const t of st.fighters) {
        if (!foeOk(st, f, t)) continue;
        const p = spawnProj(st, f, slash, t.x, t.y - bodyH(st, t) * 0.5 * t.grav, 0, 0);
        p.charge = t.i; // which bro this flurry belongs to
      }
    }
    const mine = st.projs.filter((p) => !p.dead && p.o === f.i && p.fd === f.def && p.pk === slash);
    for (const p of mine) {
      const t = st.fighters[p.charge];
      if (t && !t.out && t.act !== A.DEAD) {
        p.x = t.x;
        p.y = t.y - bodyH(st, t) * 0.5 * t.grav;
      }
      if (f.mf === 60) {
        spawnProj(st, f, cf.projIdx.eclipseFinish, p.x, p.y, 0, 0);
        ev(st, 'boom', p.x, p.y, f.i, 110);
        p.dead = true;
      }
    }
  },
});
