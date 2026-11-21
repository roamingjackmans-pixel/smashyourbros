// Coral — the whip / spacer. Surfer tide-witch from the Sunken Reef with a living water whip (named Gerald) and a
// surfboard strapped to her back. Long disjointed lashes, a bubble that traps, a whirlpool that pulls, a tether
// side-B that snags ledges, and a stage-crossing Tsunami she surfs on.
import { A } from '../../sim/acts';
import { fighterSkel } from '../../sim/anim';
import { ev } from '../../sim/events';
import { bodyH, bodyW, cfOf, shoot, startMove, surfs } from '../../sim/fighter';
import { segDist2 } from '../../sim/math';
import { spawnProj } from '../../sim/projectiles';
import { registerScripts } from '../../sim/scripts';
import { ledges } from '../../sim/stage';
import type { Fighter, FighterDef, HitDef, State } from '../../sim/types';

// whip hitboxes: the tip is the sweet spot, the middle is weaker, near the hand is weakest
function lash(f: [number, number], tip: Omit<HitDef, 'f' | 'at' | 'r'> & { r?: number }, mid: Omit<HitDef, 'f' | 'at' | 'r'> & { r?: number }, grp?: number): HitDef[] {
  const g = grp === undefined ? {} : { grp };
  return [
    { f, at: 'wep', r: 16, fx: 'water', ...tip, ...g },
    { f, at: 'wepMid', r: 13, fx: 'water', ...mid, ...g },
  ];
}

export const coral: FighterDef = {
  id: 'coral',
  name: 'Coral',
  title: 'Totally Tubular Tide-Witch',
  role: 'Whip / Spacer',
  color: '#1fc8c8',
  weight: 90,
  power: 1.27,
  rig: { thigh: 25, shin: 25, torso: 34, head: 20, upper: 20, fore: 18, girth: 13, limb: 6.5, wep: 105 },
  stats: { walk: 9.6, dash: 17, run: 16, dashFrames: 11, airSpeed: 10.2, airAccel: 0.55, airFric: 0.12, groundFric: 0.85, grav: 0.72, fall: 13, ffall: 20.5, jump: 21, hop: 14, djump: 19.5, jumps: 1, squat: 3 },
  bio: 'Three-time champion of the Sunken Reef Big Wave Classic and the only tide-witch with a surfboard license. Her whip is a living current named Gerald. Got beamed up mid-barrel, decided the studio lights are "basically sunshine, dude", and now wants to teach every bro on the show to surf. By force. Lovingly.',
  line: 'You make my tides go all wobbly, dude-bro.',
  taunt: 'Throws a lazy shaka. A tiny wave pops up and high-fives her.',
  wins: ['Gnarly wipeout, bro. Paddle back out anytime.', 'Totally tubular, my dude. You ride with me next set, deal?', 'The ocean says you’re rad. I agree with the ocean. Gerald agrees too.'],
  moveNames: { nspec: 'Bubble Trap', sspec: 'Tide Lash', uspec: 'Waterspout', dspec: 'Undertow', ult: 'Tsunami' },
  projs: {
    // the bubble holds a bro in place (engine `freeze`, mashable) and floats them up a touch; the art draws the bubble
    // around them. (`trap` would be the natural fit, but TRAPPED ends the moment a grounded bro touches the floor.)
    bubble: { kind: 'coralBubble', r: 20, life: 120, vx: 7, vy: 0.5, drag: 0.978, hp: 3, hit: { dmg: 4, ang: 90, bkb: 24, kbg: 8, freeze: 34, fx: 'water' } },
    // a vortex standing on the floor; its centre sits at chest height so the pull never drags anyone into the stage
    whirl: { kind: 'coralWhirl', r: 40, life: 150, ghost: true, stick: true, pierce: true, hits: 999, rehit: 16, pull: 2.4, reflectable: false, hit: { dmg: 1.3, ang: 88, bkb: 22, kbg: 10, fx: 'water' } },
    tsunami: { kind: 'coralWave', r: 200, life: 140, vx: 16, ghost: true, stick: true, pierce: true, hits: 999, rehit: 10, reflectable: false, hit: { dmg: 2.5, ang: 22, bkb: 70, kbg: 10, hitlag: 0.3, fx: 'water', unblockable: true } },
    crash: { kind: 'coralCrash', r: 1, life: 8, ghost: true, stick: true, fuse: 2, reflectable: false, hit: { dmg: 0, ang: 45, bkb: 0, kbg: 0 }, explode: { r: 340, hit: { dmg: 17, ang: 42, bkb: 78, kbg: 104, fx: 'water', unblockable: true } } },
  },
  // whip angles: phi(wep) = rot + lean + 180 - armF - foreF - wep (0 up, 90 forward, 180 down, -90 back)
  poses: {
    cIdle: { lean: 4, head: 3, armF: 16, foreF: 52, armB: -8, foreB: 30, legF: 16, shinF: 8, legB: -12, shinB: 20 },
    cIdle2: { lean: 6, head: -1, armF: 21, foreF: 58, armB: -12, foreB: 36, legF: 14, shinF: 13, legB: -10, shinB: 16, y: -1 },
    shaka: { lean: -4, head: -8, armF: 150, foreF: 55, armB: -20, foreB: 40, legF: 14, shinF: 10, legB: -12, shinB: 16 },
    whipReady: { lean: 6, armF: 120, foreF: 40, wep: 26, armB: 20, foreB: 60, legF: 20, shinF: 22, legB: -20, shinB: 16 }, // whip up (0)
    lashWind: { lean: -10, armF: 168, foreF: 18, wep: 82, armB: 30, foreB: 60, legF: 22, shinF: 26, legB: -26, shinB: 18 }, // -98
    lash: { lean: 22, armF: 92, foreF: -8, wep: 28, armB: -38, foreB: 40, legF: 40, shinF: 20, legB: -38, shinB: 6 }, // 90
    lashLong: { lean: 30, armF: 96, foreF: -10, wep: 34, armB: -50, foreB: 30, legF: 54, shinF: 26, legB: -50, shinB: 4 }, // 90
    flickWind: { lean: -4, armF: 140, foreF: 50, wep: 20, armB: 40, foreB: 80, legF: 26, shinF: 24, legB: -22, shinB: 18 }, // -34
    flick: { lean: 18, armF: 90, foreF: -4, wep: 12, armB: -20, foreB: 60, legF: 32, shinF: 20, legB: -28, shinB: 10 }, // 100
    utiltWind: { lean: 16, armF: 58, foreF: 12, wep: -2, armB: 20, foreB: 60, legF: 28, shinF: 30, legB: -20, shinB: 24 }, // 128
    utiltUp: { lean: -12, armF: 176, foreF: 0, wep: 2, armB: -30, foreB: 40, legF: 12, shinF: 8, legB: -14, shinB: 10 }, // -10
    utiltEnd: { lean: -16, armF: 200, foreF: 14, wep: 36, armB: -40, foreB: 40, legF: 12, shinF: 8, legB: -16, shinB: 12 }, // -86
    dtiltWind: { lean: 30, head: -10, armF: 38, foreF: 34, wep: 118, armB: 20, foreB: 60, legF: 75, shinF: 115, legB: 15, shinB: 115 }, // 20
    dtiltSnap: { lean: 38, head: -12, armF: 78, foreF: -12, wep: 52, armB: -20, foreB: 50, legF: 70, shinF: 110, legB: -5, shinB: 110 }, // 100
    surf: { lean: 8, head: 6, armF: 95, foreF: 10, armB: -75, foreB: 15, legF: 40, shinF: 45, legB: -38, shinB: 30, y: 6 },
    fsWind: { lean: -24, head: -6, armF: 200, foreF: 25, wep: 81, armB: 40, foreB: 50, legF: 34, shinF: 40, legB: -32, shinB: 24 }, // -150
    fsHit: { lean: 34, armF: 92, foreF: -6, wep: 38, armB: -42, foreB: 30, legF: 52, shinF: 30, legB: -52, shinB: 4 }, // 90
    usWind: { lean: 22, armF: 28, foreF: 70, wep: 4, armB: 22, foreB: 120, legF: 62, shinF: 104, legB: 12, shinB: 104 }, // 100
    twirlA: { lean: -6, armF: 172, foreF: 0, wep: -85, armB: -30, foreB: 30, legF: 10, shinF: 8, legB: -10, shinB: 8, y: 4 }, // 87
    twirlB: { lean: -6, armF: 172, foreF: 0, wep: 89, armB: -30, foreB: 30, legF: 10, shinF: 8, legB: -10, shinB: 8, y: 4 }, // -87
    twirlTop: { lean: -8, head: -10, armF: 178, foreF: 0, wep: -6, armB: 150, foreB: 10, legF: 6, shinF: 4, legB: -6, shinB: 4, y: 8 }, // 0
    dsWind: { lean: 24, armF: 120, foreF: 60, wep: 70, armB: 20, foreB: 60, legF: 50, shinF: 80, legB: -20, shinB: 70 }, // -46
    dsFront: { lean: 30, armF: 74, foreF: -6, wep: 42, armB: -40, foreB: 30, legF: 60, shinF: 100, legB: -12, shinB: 88 }, // 100
    dsBack: { lean: 22, armF: -50, foreF: -4, wep: 361, armB: 40, foreB: 30, legF: 60, shinF: 100, legB: -12, shinB: 88 }, // -105
    nairSpin: { lean: 0, armF: 92, foreF: 0, wep: 0, armB: -100, foreB: 10, legF: 60, shinF: 90, legB: -30, shinB: 80 }, // rot + 88
    fairWindC: { lean: -14, armF: 190, foreF: 20, wep: 76, armB: 140, foreB: 30, legF: 42, shinF: 92, legB: 22, shinB: 92 }, // -120
    fairHit: { lean: 28, armF: 95, foreF: -5, wep: 23, armB: -40, foreB: 30, legF: 44, shinF: 60, legB: -10, shinB: 70 }, // 95
    bairWindC: { lean: 8, armF: 120, foreF: 20, wep: 10, armB: -30, foreB: 40, legF: 40, shinF: 80, legB: -10, shinB: 80 }, // 38
    bairHit: { lean: 22, head: 10, armF: 232, foreF: 40, wep: 25, armB: -40, foreB: 30, legF: 42, shinF: 92, legB: -80, shinB: 20 }, // -95
    uairWindC: { lean: 0, armF: 60, foreF: 20, wep: -50, armB: -40, foreB: 60, legF: 32, shinF: 92, legB: -22, shinB: 82 }, // 150
    uairHit: { lean: -18, head: -14, armF: 186, foreF: 0, wep: -24, armB: -40, foreB: 40, legF: 20, shinF: 50, legB: -20, shinB: 50 }, // 0
    uairEnd: { lean: -14, armF: 200, foreF: 10, wep: 30, armB: -40, foreB: 40, legF: 24, shinF: 60, legB: -20, shinB: 56 }, // -74
    dairWindC: { lean: 0, armF: 175, foreF: 10, wep: 55, armB: 140, foreB: 20, legF: 60, shinF: 100, legB: 40, shinB: 100 }, // -60
    dairHit: { lean: 10, head: 14, armF: 30, foreF: -10, wep: -8, armB: -30, foreB: 30, legF: 10, shinF: 20, legB: -10, shinB: 20 }, // 178
    grabWindC: { lean: 0, armF: 140, foreF: 30, wep: 40, armB: 30, foreB: 60, legF: 22, shinF: 26, legB: -26, shinB: 18 }, // -30
    bubbleBlow: { lean: 4, head: 6, armF: 70, foreF: 90, armB: 50, foreB: 100, legF: 24, shinF: 22, legB: -22, shinB: 16 },
    spoutRise: { lean: -4, head: -6, armF: 160, foreF: 20, armB: 150, foreB: 20, legF: 14, shinF: 24, legB: -14, shinB: 30 },
    dspecWind: { lean: -6, armF: 160, foreF: 40, armB: 140, foreB: 40, legF: 20, shinF: 20, legB: -20, shinB: 16 },
    dspecCast: { lean: 30, head: 10, armF: 60, foreF: -10, armB: 40, foreB: 10, legF: 40, shinF: 60, legB: -20, shinB: 50 },
    ultCall: { lean: -10, head: -14, armF: 170, foreF: 10, armB: 160, foreB: 10, legF: 16, shinF: 10, legB: -16, shinB: 10 },
    surfRide: { lean: 6, head: 4, armF: 110, foreF: 20, armB: -85, foreB: 15, legF: 34, shinF: 46, legB: -36, shinB: 34 },
  },
  base: {
    idle: [[0, 'cIdle'], [45, 'cIdle2', 'io'], [90, 'cIdle', 'io']],
    taunt: [[0, 'shaka'], [8, ['shaka', { armF: 162, foreF: 40, head: -12 }], 'io'], [16, 'shaka', 'io']],
  },
  passive: 'coral:passive',
  moves: {
    jab1: {
      frames: 18,
      hits: [{ f: [3, 4], at: 'handF', r: 12, dmg: 2.5, ang: 361, bkb: 18, kbg: 25 }],
      next: [{ move: 'jab2', from: 4, to: 16 }],
      anim: [[0, 'jabWind'], [3, 'jab1'], [10, 'jab1'], [18, 'ready']],
    },
    jab2: {
      frames: 18,
      hits: [{ f: [3, 4], at: 'handB', r: 12, dmg: 2, ang: 361, bkb: 18, kbg: 25 }],
      next: [{ move: 'jab3', from: 4, to: 16 }],
      anim: [[0, 'jab1'], [3, 'jab2'], [10, 'jab2'], [18, 'ready']],
    },
    jab3: {
      frames: 30,
      hits: lash([6, 8], { r: 15, dmg: 4.5, ang: 45, bkb: 45, kbg: 90 }, { dmg: 4, ang: 45, bkb: 42, kbg: 85 }),
      anim: [[0, 'jab2'], [3, 'flickWind'], [6, 'flick'], [12, 'flick'], [30, 'idle']],
      sfx: [[5, 'whiff']],
    },
    ftilt: {
      frames: 32,
      hits: lash([9, 11], { dmg: 9.5, ang: 361, bkb: 22, kbg: 94 }, { dmg: 7, ang: 361, bkb: 20, kbg: 86 }),
      anim: [[0, 'whipReady'], [6, 'lashWind'], [9, 'lash'], [16, 'lash'], [32, 'idle']],
      sfx: [[8, 'whiff']],
    },
    utilt: {
      frames: 30,
      hits: lash([7, 12], { dmg: 7, ang: 95, bkb: 26, kbg: 118 }, { r: 14, dmg: 6, ang: 95, bkb: 26, kbg: 112 }),
      anim: [[0, 'utiltWind'], [4, 'utiltWind'], [8, 'utiltUp'], [12, 'utiltEnd'], [30, 'idle']],
      sfx: [[6, 'whiff']],
    },
    dtilt: {
      frames: 24,
      hits: lash([6, 8], { r: 14, dmg: 6, ang: 30, bkb: 35, kbg: 60, trip: true }, { dmg: 5, ang: 72, bkb: 30, kbg: 70 }),
      anim: [[0, 'crouch'], [3, 'dtiltWind'], [6, 'dtiltSnap'], [12, 'dtiltSnap'], [24, 'crouch']],
      sfx: [[5, 'whiff']],
    },
    dash: {
      frames: 36,
      vel: [{ f: [1, 4], vx: 14 }, { f: [5, 18], vx: 12 }, { f: [19, 36], vx: 3 }],
      hits: [
        { f: [6, 10], at: 'hip', x: 12, y: -8, r: 25, dmg: 9, ang: 62, bkb: 58, kbg: 60, fx: 'water' },
        { f: [11, 18], at: 'hip', x: 10, y: -8, r: 21, dmg: 5.5, ang: 62, bkb: 40, kbg: 45, fx: 'water' },
      ],
      anim: [[0, 'dash'], [5, 'surf'], [18, ['surf', { lean: 2, armF: 120 }]], [36, 'idle']],
      sfx: [[5, 'dash']],
    },
    fsmash: {
      frames: 48,
      charge: 10,
      hits: [
        { f: [13, 16], at: 'wep', r: 20, dmg: 18, ang: 38, bkb: 32, kbg: 100, fx: 'water' },
        { f: [13, 16], at: 'wepMid', r: 15, dmg: 13, ang: 40, bkb: 30, kbg: 92, fx: 'water' },
        { f: [13, 16], at: 'handF', r: 11, dmg: 10, ang: 40, bkb: 28, kbg: 85, fx: 'water' },
      ],
      anim: [[0, 'whipReady'], [8, 'fsWind'], [10, 'fsWind'], [14, 'fsHit'], [22, 'fsHit'], [48, 'idle']],
      sfx: [[12, 'whiff'], [14, 'slash']],
    },
    usmash: {
      frames: 46,
      charge: 6,
      hits: [
        { f: [9, 19], at: 'wep', r: 17, dmg: 1.5, ang: 88, bkb: 30, kbg: 18, rehit: 4, fx: 'water' },
        { f: [9, 19], at: 'wepMid', r: 15, dmg: 1.5, ang: 88, bkb: 30, kbg: 18, rehit: 4, fx: 'water' },
        { f: [9, 19], at: 'neck', x: 8, y: 16, r: 30, dmg: 1.5, ang: 92, bkb: 30, kbg: 18, rehit: 4, fx: 'water' },
        { f: [21, 23], at: 'wep', r: 22, dmg: 10, ang: 88, bkb: 34, kbg: 102, grp: 1, fx: 'water' },
        { f: [21, 23], at: 'wepMid', r: 18, dmg: 9, ang: 88, bkb: 34, kbg: 98, grp: 1, fx: 'water' },
        { f: [21, 23], at: 'head', y: 36, r: 32, dmg: 9, ang: 90, bkb: 34, kbg: 98, grp: 1, fx: 'water' },
      ],
      anim: [[0, 'usWind'], [6, 'usWind'], [9, 'twirlA'], [12, 'twirlB', 'io'], [15, 'twirlA', 'io'], [18, 'twirlB', 'io'], [21, 'twirlTop'], [27, 'twirlTop'], [46, 'idle']],
      sfx: [[9, 'whiff'], [15, 'whiff'], [21, 'slash']],
    },
    dsmash: {
      frames: 44,
      charge: 5,
      hits: [
        ...lash([8, 10], { r: 17, dmg: 13, ang: 30, bkb: 30, kbg: 95 }, { r: 14, dmg: 11, ang: 32, bkb: 28, kbg: 90 }),
        ...lash([15, 17], { r: 17, dmg: 14, ang: 150, bkb: 30, kbg: 98 }, { r: 14, dmg: 12, ang: 148, bkb: 28, kbg: 92 }, 1),
      ],
      anim: [[0, 'crouch'], [4, 'dsWind'], [5, 'dsWind'], [8, 'dsFront'], [11, 'dsFront'], [15, 'dsBack'], [18, 'dsBack'], [30, 'crouch'], [44, 'idle']],
      sfx: [[7, 'whiff'], [14, 'whiff']],
    },
    nair: {
      frames: 38,
      air: true,
      landLag: 7,
      autoCancel: [3, 32],
      hits: [
        ...lash([4, 8], { dmg: 9, ang: 361, bkb: 20, kbg: 96 }, { dmg: 8, ang: 361, bkb: 18, kbg: 92 }),
        ...lash([9, 20], { r: 14, dmg: 5, ang: 361, bkb: 12, kbg: 88 }, { r: 12, dmg: 4, ang: 361, bkb: 10, kbg: 85 }),
      ],
      anim: [[0, 'tuck'], [3, ['nairSpin', { rot: 0 }]], [8, ['nairSpin', { rot: -130 }], 'lin'], [13, ['nairSpin', { rot: -260 }], 'lin'], [18, ['nairSpin', { rot: -360 }], 'lin'], [24, ['nairSpin', { rot: -385 }]], [38, ['fall', { rot: -360 }]]],
      sfx: [[4, 'whiff']],
    },
    fair: {
      frames: 40,
      air: true,
      landLag: 12,
      autoCancel: [3, 34],
      hits: lash([10, 13], { r: 17, dmg: 12, ang: 40, bkb: 34, kbg: 98 }, { r: 14, dmg: 9, ang: 45, bkb: 30, kbg: 90 }),
      anim: [[0, ['whipReady', { legF: 40, shinF: 70, legB: 0, shinB: 70 }]], [7, 'fairWindC'], [11, 'fairHit'], [18, 'fairHit'], [40, 'fall']],
      sfx: [[10, 'whiff']],
    },
    bair: {
      frames: 34,
      air: true,
      landLag: 9,
      autoCancel: [3, 28],
      hits: lash([7, 10], { r: 17, dmg: 12.5, ang: 140, bkb: 22, kbg: 102 }, { r: 14, dmg: 9, ang: 140, bkb: 20, kbg: 95 }),
      anim: [[0, 'bairWindC'], [5, 'bairWindC'], [8, 'bairHit'], [14, 'bairHit'], [34, 'fall']],
      sfx: [[7, 'whiff']],
    },
    uair: {
      frames: 32,
      air: true,
      landLag: 8,
      autoCancel: [3, 26],
      hits: lash([6, 10], { r: 17, dmg: 8.5, ang: 85, bkb: 26, kbg: 112 }, { r: 14, dmg: 7, ang: 88, bkb: 24, kbg: 105 }),
      anim: [[0, 'uairWindC'], [4, 'uairWindC'], [7, 'uairHit'], [11, 'uairEnd'], [32, 'fall']],
      sfx: [[6, 'whiff']],
    },
    dair: {
      frames: 42,
      air: true,
      landLag: 16,
      autoCancel: [3, 36],
      hits: [
        { f: [12, 14], at: 'wep', r: 16, dmg: 12, ang: 270, bkb: 20, kbg: 85, fx: 'water' },
        { f: [12, 14], at: 'wepMid', r: 13, dmg: 9, ang: 361, bkb: 25, kbg: 80, fx: 'water' },
        { f: [15, 20], at: 'wep', r: 13, dmg: 6, ang: 361, bkb: 15, kbg: 70, fx: 'water' },
      ],
      anim: [[0, 'dairWindC'], [9, 'dairWindC'], [12, 'dairHit'], [20, 'dairHit'], [42, 'fall']],
      sfx: [[11, 'whiff']],
    },
    grab: {
      frames: 40,
      hits: [
        { f: [10, 13], at: 'wep', r: 15, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 },
        { f: [10, 13], at: 'wepMid', r: 14, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 },
        { f: [10, 13], at: 'handF', r: 13, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 },
      ],
      anim: [[0, 'whipReady'], [6, 'grabWindC'], [10, 'lash'], [20, 'lash'], [40, 'idle']],
      sfx: [[9, 'whiff']],
    },
    dashgrab: {
      frames: 46,
      vel: [{ f: [1, 10], vx: 8 }, { f: [11, 46], vx: 1 }],
      hits: [
        { f: [12, 15], at: 'wep', r: 15, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 },
        { f: [12, 15], at: 'wepMid', r: 14, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 },
        { f: [12, 15], at: 'handF', r: 13, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 },
      ],
      anim: [[0, 'dash'], [7, 'grabWindC'], [12, 'lashLong'], [24, 'lashLong'], [46, 'idle']],
      sfx: [[11, 'whiff']],
    },
    pummel: { frames: 16, pummel: 1.5, anim: [[0, 'hold'], [4, ['hold', { armF: 60, foreF: 70, lean: 16 }]], [16, 'hold']] },
    fthrow: {
      frames: 30,
      throw: { release: 12, hit: { dmg: 8, ang: 42, bkb: 60, kbg: 64, fx: 'water' } },
      anim: [[0, 'hold'], [6, ['hold', { lean: -10, armF: 40 }]], [12, 'throwF'], [30, 'idle']],
    },
    bthrow: {
      frames: 34,
      throw: { release: 15, holdAt: 'handF', hit: { dmg: 10, ang: 140, bkb: 60, kbg: 74, fx: 'water' } },
      anim: [[0, 'hold'], [6, ['throwF', { rot: -90 }]], [12, ['throwB', { rot: -200 }]], [17, ['throwB', { rot: -340 }]], [34, ['idle', { rot: -360 }]]],
    },
    uthrow: {
      frames: 36,
      throw: { release: 14, hit: { dmg: 7, ang: 90, bkb: 72, kbg: 72, fx: 'water' } },
      anim: [[0, 'hold'], [8, 'crouch'], [14, 'throwUp'], [36, 'idle']],
    },
    dthrow: {
      frames: 36,
      throw: { release: 16, hit: { dmg: 6, ang: 75, bkb: 55, kbg: 42, fx: 'water' } },
      anim: [[0, 'hold'], [10, 'throwDown'], [20, 'throwDown'], [36, 'idle']],
    },
    nspec: {
      frames: 42,
      script: 'coral:bubble',
      anim: [[0, 'castWind'], [8, 'bubbleBlow'], [12, 'cast'], [26, 'cast'], [42, 'idle']],
      sfx: [[12, 'boing']],
    },
    nspecAir: {
      frames: 40,
      script: 'coral:bubble',
      anim: [[0, 'castWind'], [8, 'bubbleBlow'], [12, 'cast'], [24, 'cast'], [40, 'fall']],
      sfx: [[12, 'boing']],
    },
    sspec: {
      frames: 46,
      oncePerAir: true,
      hits: [
        { f: [15, 17], at: 'wep', x: 22, r: 18, dmg: 11, ang: 40, bkb: 45, kbg: 82, fx: 'water' },
        ...lash([14, 17], { r: 15, dmg: 11, ang: 40, bkb: 45, kbg: 82 }, { r: 14, dmg: 8, ang: 50, bkb: 40, kbg: 70 }),
      ],
      anim: [[0, 'whipReady'], [9, 'lashWind'], [12, 'lashWind'], [15, 'lashLong'], [24, 'lashLong'], [46, 'idle']],
      sfx: [[13, 'whiff'], [15, 'slash']],
    },
    sspecAir: {
      frames: 46,
      oncePerAir: true,
      ledgeFrom: 12,
      script: 'coral:tether',
      vel: [{ f: [1, 2], vy: 0 }, { f: [1, 30], grav: 0.2, noDrift: true }, { f: [31, 46], grav: 0.8 }],
      hits: [
        { f: [15, 17], at: 'wep', x: 22, r: 18, dmg: 11, ang: 40, bkb: 45, kbg: 82, fx: 'water' },
        ...lash([14, 17], { r: 15, dmg: 11, ang: 40, bkb: 45, kbg: 82 }, { r: 14, dmg: 8, ang: 50, bkb: 40, kbg: 70 }),
      ],
      anim: [[0, ['whipReady', { legF: 40, shinF: 60, legB: -10, shinB: 60 }]], [9, ['lashWind', { legF: 40, shinF: 60 }]], [12, ['lashWind', { legF: 40, shinF: 60 }]], [15, ['lashLong', { legF: 40, shinF: 50, legB: -40, shinB: 30 }]], [26, ['lashLong', { legF: 40, shinF: 50, legB: -40, shinB: 30 }]], [46, 'fall']],
      sfx: [[13, 'whiff'], [15, 'slash']],
    },
    uspec: {
      frames: 46,
      helpless: true,
      landHelpless: 22,
      ledgeFrom: 8,
      reverse: true,
      vel: [{ f: [1, 5], vx: 0, vy: 0, grav: 0 }, { f: [6, 25], vy: 15.5, grav: 0 }, { f: [26, 46], grav: 0.6 }],
      hits: [
        { f: [6, 24], at: 'hip', y: -42, r: 30, dmg: 1.6, ang: 86, bkb: 28, kbg: 22, rehit: 5, fx: 'water' },
        { f: [6, 24], at: 'hip', y: 0, r: 22, dmg: 1.6, ang: 86, bkb: 28, kbg: 22, rehit: 5, fx: 'water' },
        { f: [25, 27], at: 'torso', y: 30, r: 32, dmg: 6, ang: 80, bkb: 62, kbg: 86, grp: 1, fx: 'water' },
      ],
      anim: [[0, 'squat'], [5, 'crouch'], [7, 'spoutRise'], [25, ['spoutRise', { armF: 180, armB: 175, foreF: 0, foreB: 0 }]], [46, 'helpless']],
      sfx: [[6, 'jet']],
    },
    dspec: {
      frames: 40,
      script: 'coral:whirl',
      anim: [[0, 'ready'], [8, 'dspecWind'], [13, 'dspecCast'], [24, 'dspecCast'], [40, 'idle']],
      sfx: [[13, 'boing']],
    },
    dspecAir: {
      frames: 40,
      script: 'coral:whirl',
      vel: [{ f: [1, 16], grav: 0.4 }],
      anim: [[0, 'ready'], [8, 'dspecWind'], [13, 'dspecCast'], [24, 'dspecCast'], [40, 'fall']],
      sfx: [[13, 'boing']],
    },
    ledgeatk: {
      frames: 50,
      hits: lash([19, 21], { r: 15, dmg: 9, ang: 361, bkb: 45, kbg: 45 }, { dmg: 8, ang: 361, bkb: 45, kbg: 45 }),
      anim: [[0, 'climb'], [12, 'whipReady'], [16, 'lashWind'], [19, 'lash'], [26, 'lash'], [50, 'idle']],
      sfx: [[18, 'whiff']],
    },
    getupatk: {
      frames: 44,
      hits: [
        ...lash([14, 16], { r: 15, dmg: 7, ang: 361, bkb: 50, kbg: 40 }, { dmg: 7, ang: 361, bkb: 50, kbg: 40 }),
        ...lash([22, 24], { r: 15, dmg: 7, ang: 140, bkb: 50, kbg: 40 }, { dmg: 7, ang: 140, bkb: 50, kbg: 40 }, 1),
      ],
      anim: [[0, 'lying'], [10, 'dsWind'], [14, 'dsFront'], [18, 'dsFront'], [22, 'dsBack'], [26, 'dsBack'], [44, 'idle']],
    },
    ult: {
      frames: 130,
      ult: true,
      script: 'coral:ult',
      vel: [{ f: [1, 130], grav: 0, noDrift: true }],
      anim: [[0, 'ultCall'], [6, 'ultCall'], [14, 'surfRide'], [130, 'surfRide']],
    },
    // hop off the crest once the wave reaches the far side
    ultHop: {
      frames: 34,
      air: true,
      landLag: 8,
      vel: [{ f: [1, 2], vx: -6, vy: 13 }],
      anim: [[0, 'surfRide'], [6, ['tuck', { rot: -180 }]], [14, ['tuck', { rot: -360 }]], [24, ['fall', { rot: -360 }]], [34, ['fall', { rot: -360 }]]],
    },
  },
};

// ------------------------------------------------------------------ scripts

/** retire this fighter's live projectiles of one kind (they finish next frame) */
function retire(st: State, f: Fighter, pk: number): void {
  for (const p of st.projs) if (!p.dead && p.o === f.i && p.fd === f.def && p.pk === pk) p.life = Math.min(p.life, p.age + 1);
}

registerScripts({
  // one bubble at a time: blowing a new one pops the old one
  'coral:bubble': (st, f) => {
    if (f.mf !== 12) return;
    retire(st, f, cfOf(f).projIdx.bubble);
    shoot(st, f, 'bubble', 'handF', 14, 0);
  },
  // one whirlpool at a time
  'coral:whirl': (st, f) => {
    if (f.mf !== 13) return;
    retire(st, f, cfOf(f).projIdx.whirl);
    spawnProj(st, f, cfOf(f).projIdx.whirl, f.x + 82 * f.facing, f.y - 90 * f.grav, 0, 0);
  },
  // Tide Lash in the air: if the whip snags a ledge corner, reel Coral in so the ledge grab catches her.
  // v[0] = 1 while reeling, v[1..3] = ledge x, y, side
  'coral:tether': (st, f) => {
    const cf = cfOf(f);
    if (f.mf <= 2) {
      f.v[0] = 0;
      // once per airtime (the engine checks the base 'sspec' bit)
      f.airUsed |= 1 << (cf.moveIdx.sspec % 30);
    }
    if (f.v[0] === 0 && f.mf >= 14 && f.mf <= 24) {
      const k = fighterSkel(st, f, cf);
      for (const l of ledges(surfs(st))) {
        if (l.side !== -f.facing) continue;
        if ((f.x - l.x) * l.side < -10) continue;
        const d2 = segDist2(l.x, l.y, k.wepMid[0], k.wepMid[1], k.wep[0] + 22 * f.facing, k.wep[1]);
        if (d2 < 62 * 62) {
          f.v[0] = 1;
          f.v[1] = l.x;
          f.v[2] = l.y;
          f.v[3] = l.side;
          ev(st, 'sfx', l.x, l.y, f.i, 0, 0, 'grab');
          break;
        }
      }
    }
    if (f.v[0] === 1) {
      const tx = f.v[1] + f.v[3] * (bodyW(st, f) * 0.55 + 4);
      const ty = f.v[2] + bodyH(st, f) * 0.8;
      const dx = tx - f.x;
      const dy = ty - f.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0.5) {
        const sp = Math.min(19, d);
        f.vx = (dx / d) * sp;
        f.vy = (dy / d) * sp;
      } else {
        f.vx = 0;
        f.vy = 0;
      }
      f.kx = 0;
      f.ky = 0;
    }
  },
  // Tsunami: the wave rises behind the near edge and sweeps the stage; Coral leaps on and surfs the crest.
  // v[4] = ride state (0 wait, 1 riding, 2 off), v[5] = wave id + 1, v[6] = far edge (in facing units), v[7] = ride frames
  'coral:ult': (st, f) => {
    const s0 = surfs(st)[0];
    const fac = f.facing;
    if (f.mf <= 2) {
      f.v[4] = 0;
      f.v[7] = 0;
    }
    if (f.mf === 4) {
      const uBack = fac > 0 ? s0.x1 : -s0.x2;
      const uFront = fac > 0 ? s0.x2 : -s0.x1;
      const u0 = Math.min(uBack, f.x * fac) - 300;
      const p = spawnProj(st, f, cfOf(f).projIdx.tsunami, u0 * fac, s0.y1 - 110);
      f.v[5] = p.id + 1;
      f.v[6] = uFront;
      ev(st, 'sfx', p.x, p.y, f.i, 0, 0, 'jet');
      return;
    }
    if (f.mf < 5 || f.v[4] >= 2 || f.v[5] <= 0) return;
    const p = st.projs.find((q) => q.id === f.v[5] - 1 && !q.dead);
    if (!p) return;
    const u = p.x * fac;
    if (f.v[4] === 0 && u >= f.x * fac - 170 && u < f.v[6] - 280) f.v[4] = 1;
    if (f.v[4] !== 1) return;
    if (u >= f.v[6] - 280) {
      f.v[4] = 2;
      startMove(st, f, 'ultHop');
      return;
    }
    f.v[7]++;
    const a = Math.min(1, 0.22 + f.v[7] * 0.09);
    const tx = p.x + 30 * fac;
    const ty = p.y - 186;
    f.x += (tx - f.x) * a;
    f.y += (ty - f.y) * a;
    f.vx = 0;
    f.vy = 0;
    f.kx = 0;
    f.ky = 0;
    f.gnd = -1;
  },
  // the wave crashes once it passes the far edge (runs every frame so it fires whatever Coral is doing)
  'coral:passive': (st, f) => {
    // engine workaround: the pummel hit fires on mf 4 and its own hitlag ends on a frame where the move can't
    // advance, so it would re-fire forever; step past mf 4 on the last hitlag frame (only touches Coral)
    if (f.act === A.MOVE && f.mf === 4 && f.hitlag === 1 && f.grabbing >= 0 && cfOf(f).moveIds[f.mv] === 'pummel') f.mf = 5;
    const id = f.v[5];
    if (id <= 0) return;
    const p = st.projs.find((q) => q.id === id - 1 && !q.dead);
    if (!p) {
      f.v[5] = 0;
      return;
    }
    const fac = p.vx >= 0 ? 1 : -1;
    if (p.x * fac < f.v[6] + 40 && p.age < 108) return;
    spawnProj(st, f, cfOf(f).projIdx.crash, p.x - 140 * fac, p.y - 20, 0, 0);
    // the wave collapses: no more carrying hits, a few frames of spray
    p.vx *= 0.35;
    p.life = p.age + 8;
    p.hitMask = 0xff;
    for (let i = 0; i < p.hitAt.length; i++) p.hitAt[i] = st.frame;
    f.v[5] = 0;
  },
});
