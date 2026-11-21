// Chef Flambé — the trickster. Dramatic head chef of the Grand Gastronomia with a GIANT frying pan. Every move is
// a course: random Daily Specials from under a silver cloche, a reflecting Pan Swing, a flambé-powered rocket jump,
// hot-sauce puddles and a stage-sized cauldron for dessert.
//
// Pan angle cheat sheet (pose `wep`): the pan points along phi = rot + lean + 180 - armF - foreF - wep
// (0 = up, 90 = forward, 180 = down, -90 = back). Every custom pose below lists the phi it aims for, and every swing
// interpolates monotonically so the pan never flips through the floor between keys.
import { bodyH, cfOf, shoot } from '../../sim/fighter';
import { ev } from '../../sim/events';
import { POSES } from '../../sim/poses';
import { spawnProj } from '../../sim/projectiles';
import { rint } from '../../sim/rng';
import { registerScripts } from '../../sim/scripts';
import { STAGES } from '../../sim/data';
import type { FighterDef } from '../../sim/types';

/** Daily Special dishes, by f.v[0] (1..4); the art reads f.v[0] to show the dish on the platter */
const DISHES = ['tomato', 'pie', 'turkey', 'souffle'];

export const chef: FighterDef = {
  id: 'chef',
  name: 'Chef Flambé',
  title: 'Your Plate Is Never Empty',
  role: 'Trickster',
  color: '#ff6a3d',
  weight: 100,
  power: 1.15,
  rig: { thigh: 23, shin: 22, torso: 38, head: 21, upper: 20, fore: 18, girth: 18, limb: 7.5, wep: 44 },
  stats: { walk: 9, dash: 16, run: 14.6, dashFrames: 11, airSpeed: 9.7, airAccel: 0.52, airFric: 0.12, groundFric: 0.85, grav: 0.8, fall: 14, ffall: 22, jump: 21, hop: 14.2, djump: 19.6, jumps: 1, squat: 3 },
  bio: 'Head chef of the Grand Gastronomia, where every table seats twelve and every guest leaves three kilos happier. Beamed aboard mid-soufflé and has sworn that no bro on this show will ever fight on an empty stomach. Cries a little at every plate. Cries a lot at yours.',
  line: 'You look hungry, bro. Here: a five-course KO.',
  taunt: 'Kisses his fingertips. "Mwah! Perfection. Like you, bro."',
  wins: ['Magnifique! Seconds?', 'Sit, sit! You fought like a lion, mon bro. Now you eat like one.', 'I am not crying. It is the onions. And your beautiful, beautiful technique.'],
  moveNames: { nspec: 'Daily Special', sspec: 'Pan Swing', uspec: 'Flambé Jet', dspec: 'Hot Sauce', ult: 'Chef’s Kiss' },
  projs: {
    tomato: { kind: 'chefTomato', r: 11, life: 80, vx: 12.5, vy: 5, grav: 0.42, hit: { dmg: 6, ang: 361, bkb: 22, kbg: 55, fx: 'food' } },
    pie: { kind: 'chefPie', r: 15, life: 90, vx: 10.5, vy: 6.5, grav: 0.45, hit: { dmg: 9, ang: 60, bkb: 35, kbg: 62, fx: 'food', trip: true } },
    turkey: { kind: 'chefTurkey', r: 18, life: 150, vx: 8.5, vy: 8.5, grav: 0.55, bounce: 0.5, roll: true, drag: 0.996, hit: { dmg: 13, ang: 45, bkb: 45, kbg: 78, fx: 'food' } },
    souffle: { kind: 'chefSouffle', r: 16, life: 240, vx: 10, vy: 6, grav: 0.4, hit: { dmg: 1, ang: 65, bkb: 20, kbg: 20, fx: 'food' }, explode: { r: 115, hit: { dmg: 21, ang: 65, bkb: 62, kbg: 98, fx: 'fire' } } },
    sauce: { kind: 'chefSauce', r: 10, life: 200, vx: 6, vy: 9, grav: 0.55, hit: { dmg: 4, ang: 70, bkb: 25, kbg: 40, fx: 'fire' }, puddle: { life: 240, w: 58, hit: { dmg: 3, ang: 80, bkb: 30, kbg: 30, fx: 'fire' } } },
    cauldron: {
      kind: 'chefCauldron',
      r: 60,
      life: 140,
      ghost: true,
      reflectable: false,
      hit: { dmg: 0, ang: 90, bkb: 0, kbg: 0 },
      pulse: { every: 13, r: 560, hit: { dmg: 2, ang: 90, bkb: 32, kbg: 10, fx: 'food' } },
      fuse: 104,
      explode: { r: 640, hit: { dmg: 22, ang: 80, bkb: 75, kbg: 108, fx: 'fire', unblockable: true } },
    },
  },
  poses: {
    // ---- library overrides: same bodies, but the pan sits somewhere sensible (never through the face)
    idle: { lean: 8, armF: 22, foreF: 34, wep: 82, armB: -12, foreB: 40, legF: 12, shinF: 12, legB: -12, shinB: 12 }, // pan 50
    ready: { ...POSES.ready, wep: 17 }, // pan 45
    fall: { ...POSES.fall, wep: 8 }, // pan 40
    jump: { ...POSES.jump, wep: -8 }, // pan 30
    tuck: { ...POSES.tuck, wep: -54 }, // pan 60
    helpless: { ...POSES.helpless, wep: -12 }, // pan 10
    ledge: { ...POSES.ledge, wep: -26 }, // pan 30 (lying on the stage)
    crouch: { ...POSES.crouch, wep: 27 }, // pan 80
    skid: { ...POSES.skid, wep: 0 },
    hold: { ...POSES.hold, wep: 50 }, // pan 30
    airdodge: { ...POSES.airdodge, wep: -20 },
    teeter: { ...POSES.teeter, wep: 0 },
    shield: { ...POSES.shield, wep: -8 }, // pan up like a guard
    grabbed: { ...POSES.grabbed, wep: 0 },
    // ---- run cycle (keeps the pan pointing forward-up while the free arm pumps)
    chefRun0: { lean: 24, head: -6, armF: 40, foreF: 70, wep: 54, armB: 40, foreB: 80, legF: 20, shinF: 30, legB: 20, shinB: 100, y: 5 },
    chefRun1: { lean: 24, head: -6, armF: -10, foreF: 80, wep: 94, armB: 90, foreB: 80, legF: 78, shinF: 30, legB: -38, shinB: 30, y: 0 },
    chefRun2: { lean: 24, head: -6, armF: 40, foreF: 70, wep: 54, armB: 40, foreB: 80, legF: 20, shinF: 100, legB: 20, shinB: 30, y: 5 },
    chefRun3: { lean: 24, head: -6, armF: 70, foreF: 70, wep: 24, armB: -50, foreB: 80, legF: -38, shinF: 30, legB: 78, shinB: 30, y: 0 },
    // ---- jabs
    cJabWind: { ...POSES.jabWind, wep: 0 }, // pan 40
    cJab1: { ...POSES.jab2, wep: 30 }, // free-hand punch, pan 40
    cJab2: { ...POSES.jab1, wep: 79 }, // pan-hand punch, pan 25
    cPokeWind: { lean: 6, armF: 50, foreF: 90, wep: -24, armB: 30, foreB: 80, legF: 26, shinF: 26, legB: -24, shinB: 20 }, // pan 70
    cPoke: { ...POSES.stab, wep: 28 }, // pan 92
    // ---- tilts
    cChopWind: { lean: -8, armF: 70, foreF: 110, wep: 32, armB: 20, foreB: 60, legF: 24, shinF: 22, legB: -24, shinB: 16 }, // pan -40
    cChop: { lean: 26, armF: 96, foreF: 0, wep: 10, armB: -30, foreB: 40, legF: 44, shinF: 18, legB: -38, shinB: 8 }, // pan 100
    cUpWind: { lean: 22, armF: 30, foreF: 30, wep: 2, armB: 20, foreB: 60, legF: 46, shinF: 60, legB: -16, shinB: 50 }, // pan 140
    cUpMid: { lean: -4, armF: 165, foreF: 0, wep: 1, armB: -20, foreB: 40, legF: 14, shinF: 8, legB: -14, shinB: 10 }, // pan 10
    cUpEnd: { lean: -16, armF: 200, foreF: 10, wep: 24, armB: -30, foreB: 40, legF: 10, shinF: 8, legB: -16, shinB: 12 }, // pan -70
    cLowWind: { lean: 34, head: -10, armF: 120, foreF: 40, wep: 39, armB: 25, foreB: 60, legF: 75, shinF: 115, legB: 15, shinB: 115 }, // pan 15
    cLow: { lean: 38, head: -10, armF: 75, foreF: 0, wep: 31, armB: -20, foreB: 40, legF: 75, shinF: 115, legB: 15, shinB: 115 }, // pan 112
    cSlide: { rot: 70, lean: 0, head: -50, armF: 172, foreF: 0, wep: -2, armB: 140, foreB: 20, legF: -8, shinF: 20, legB: -24, shinB: 40 }, // belly slide, pan 80
    // ---- smashes
    cBonkWind: { lean: -24, head: -6, armF: 205, foreF: 25, wep: 31, armB: 60, foreB: 80, legF: 34, shinF: 40, legB: -36, shinB: 22 }, // pan -105
    cBonkUp: { lean: 8, armF: 178, foreF: 5, wep: 0, armB: 20, foreB: 40, legF: 40, shinF: 30, legB: -40, shinB: 10 }, // pan 5
    cBonk: { lean: 42, head: 6, armF: 78, foreF: 0, wep: 22, armB: -50, foreB: 30, legF: 56, shinF: 32, legB: -54, shinB: 4 }, // pan 122
    cFlipWind: { lean: 24, armF: 40, foreF: 40, wep: 4, armB: 30, foreB: 90, legF: 62, shinF: 104, legB: 12, shinB: 104 }, // pan 120
    cFlipMid: { lean: 6, armF: 120, foreF: 0, wep: 6, armB: 90, foreB: 40, legF: 20, shinF: 20, legB: -14, shinB: 16, y: 4 }, // pan 60
    cFlip: { lean: -8, head: -10, armF: 180, foreF: 0, wep: 7, armB: 160, foreB: 10, legF: 6, shinF: 4, legB: -8, shinB: 6, y: 10 }, // pan -15
    cDsWind: { lean: 0, armF: 178, foreF: 0, wep: 2, armB: 30, foreB: 60, legF: 50, shinF: 80, legB: -30, shinB: 70 }, // pan 0
    cDsFront: { lean: 40, armF: 72, foreF: 0, wep: 26, armB: -40, foreB: 30, legF: 70, shinF: 70, legB: -40, shinB: 50 }, // pan 122
    cDsOver: { lean: 0, armF: 180, foreF: 0, wep: 0, armB: 0, foreB: 40, legF: 50, shinF: 70, legB: -50, shinB: 50 }, // pan 0
    cDsBack: { lean: -34, head: 10, armF: 250, foreF: 0, wep: 21, armB: 60, foreB: 40, legF: 40, shinF: 60, legB: -70, shinB: 30 }, // pan -125
    // ---- aerials
    cSpin: { lean: 0, armF: 92, foreF: 0, wep: -2, armB: -92, foreB: 0, legF: 30, shinF: 50, legB: -30, shinB: 50 }, // pan 90
    cFairWind: { lean: -14, armF: 185, foreF: 20, wep: 11, armB: 140, foreB: 30, legF: 42, shinF: 92, legB: 22, shinB: 92 }, // pan -50
    cFair: { lean: 30, armF: 92, foreF: 0, wep: 18, armB: 40, foreB: 20, legF: 44, shinF: 60, legB: -10, shinB: 70 }, // pan 100
    cFairEnd: { lean: 34, armF: 60, foreF: 0, wep: -6, armB: 30, foreB: 20, legF: 40, shinF: 70, legB: -10, shinB: 70 }, // pan 160
    cBairWind: { lean: 18, head: 10, armF: 120, foreF: 70, wep: -7, armB: 20, foreB: 50, legF: 42, shinF: 92, legB: -60, shinB: 40 }, // pan 15
    cBair: { lean: 22, head: 14, armF: 252, foreF: 0, wep: 38, armB: 40, foreB: 60, legF: 50, shinF: 92, legB: -100, shinB: 10 }, // pan -88
    cUairWind: { lean: 6, armF: 100, foreF: 20, wep: -14, armB: -30, foreB: 40, legF: 50, shinF: 90, legB: 20, shinB: 90 }, // pan 80
    cUair: { lean: -20, armF: 205, foreF: 0, wep: 15, armB: -40, foreB: 40, legF: 20, shinF: 30, legB: -20, shinB: 40 }, // pan -60
    cDairWind: { lean: 4, armF: 175, foreF: 10, wep: -1, armB: 160, foreB: 10, legF: 82, shinF: 122, legB: 72, shinB: 122 }, // pan 0
    cDair: { lean: 0, head: 10, armF: 4, foreF: 0, wep: -4, armB: 10, foreB: 0, legF: 34, shinF: 70, legB: -24, shinB: 80 }, // pan 180
    // ---- grabs and throws
    cPumHit: { ...POSES.hold, wep: -20 }, // pan 100
    cTenderUp: { lean: 52, armF: 90, foreF: 30, wep: 82, armB: 32, foreB: 0, legF: 52, shinF: 92, legB: -10, shinB: 60 }, // pan 30
    cTender: { lean: 52, armF: 40, foreF: 0, wep: 42, armB: 32, foreB: 0, legF: 52, shinF: 92, legB: -10, shinB: 60 }, // pan 150
    // ---- specials
    cPresent: { lean: 14, head: -10, armB: 80, foreB: 15, armF: 22, foreF: 34, wep: 88, legF: 14, shinF: 12, legB: -14, shinB: 12 }, // platter out, pan 50
    cReveal: { lean: 0, head: -16, armB: 84, foreB: 20, armF: 140, foreF: 20, wep: 10, legF: 18, shinF: 10, legB: -18, shinB: 10 }, // VOILA! pan 10
    cHurlWind: { lean: -16, armB: -40, foreB: 60, armF: 60, foreF: 50, wep: 4, legF: 30, shinF: 24, legB: -30, shinB: 20 }, // pan 50
    cHurl: { lean: 24, head: 4, armB: 150, foreB: 0, armF: 30, foreF: 40, wep: 64, legF: 44, shinF: 18, legB: -40, shinB: 8 }, // pan 70
    cSwingWind: { lean: -10, head: -4, armF: -55, foreF: 20, wep: 265, armB: 50, foreB: 70, legF: 30, shinF: 30, legB: -30, shinB: 20 }, // pan -60, hand low behind
    cSwing: { lean: 22, armF: 95, foreF: 0, wep: 12, armB: -40, foreB: 30, legF: 46, shinF: 20, legB: -40, shinB: 6 }, // pan 95
    cSwingEnd: { lean: 28, armF: 80, foreF: 0, wep: -2, armB: -50, foreB: 30, legF: 46, shinF: 24, legB: -40, shinB: 8 }, // pan 130
    cJetPrep: { lean: 20, head: -14, armF: 100, foreF: 80, wep: 20, armB: 120, foreB: 60, legF: 60, shinF: 90, legB: 0, shinB: 90 }, // pan 0, dousing it
    cJet: { lean: 0, head: -10, armF: 20, foreF: 10, wep: -30, armB: 150, foreB: 20, legF: 30, shinF: 60, legB: -20, shinB: 70 }, // pan 180, riding the flame
    cJetEnd: { lean: -10, head: -14, armF: 180, foreF: 0, wep: 0, armB: 150, foreB: 20, legF: 20, shinF: 30, legB: -20, shinB: 40 }, // pan -10
    cSauceWind: { lean: -6, armB: -40, foreB: 50, armF: 22, foreF: 34, wep: 68, legF: 20, shinF: 18, legB: -22, shinB: 14 }, // pan 50
    cSauceToss: { lean: 16, armB: 130, foreB: 10, armF: 30, foreF: 40, wep: 76, legF: 34, shinF: 18, legB: -30, shinB: 10 }, // pan 50
    // ---- ultimate and taunt
    cUltCall: { lean: -10, head: -16, armF: 170, foreF: 10, wep: -5, armB: 160, foreB: 20, legF: 26, shinF: 14, legB: -26, shinB: 12 }, // pan -5
    cConductA: { lean: 0, head: -12, armF: 150, foreF: 20, wep: 10, armB: 60, foreB: 70, legF: 18, shinF: 12, legB: -18, shinB: 12 }, // pan 0
    cConductB: { lean: 10, head: -4, armF: 95, foreF: 30, wep: -5, armB: 100, foreB: 40, legF: 18, shinF: 12, legB: -18, shinB: 12 }, // pan 70
    cKissIn: { lean: -4, head: -10, armB: 80, foreB: 90, armF: 22, foreF: 34, wep: 70, legF: 14, shinF: 10, legB: -12, shinB: 12 }, // fingertips to the moustache
    cKissOut: { lean: -8, head: -18, armB: 150, foreB: 5, armF: 30, foreF: 40, wep: 52, legF: 16, shinF: 10, legB: -14, shinB: 12 }, // ...and MWAH!
  },
  base: {
    idle: [[0, 'idle'], [30, ['idle', { y: -1.5, lean: 9.5, armB: -8, head: -2 }], 'io'], [60, 'idle', 'io']],
    run: [[0, 'chefRun0'], [6, 'chefRun1', 'io'], [11, 'chefRun2', 'io'], [17, 'chefRun3', 'io'], [22, 'chefRun0', 'io']],
    taunt: [[0, 'idle'], [10, 'cKissIn'], [24, 'cKissIn'], [30, 'cKissOut'], [46, 'cKissOut'], [60, 'idle']],
  },
  moves: {
    jab1: {
      frames: 18,
      hits: [{ f: [3, 4], at: 'handB', r: 13, dmg: 2.5, ang: 361, bkb: 18, kbg: 25 }],
      next: [{ move: 'jab2', from: 4, to: 16 }],
      anim: [[0, 'cJabWind'], [3, 'cJab1'], [10, 'cJab1'], [18, 'idle']],
    },
    jab2: {
      frames: 18,
      hits: [{ f: [3, 4], at: 'handF', r: 13, dmg: 2, ang: 361, bkb: 18, kbg: 25 }],
      next: [{ move: 'jab3', from: 4, to: 16 }],
      anim: [[0, 'cJab1'], [3, 'cJab2'], [10, 'cJab2'], [18, 'idle']],
    },
    jab3: {
      frames: 30,
      hits: [
        { f: [5, 7], at: 'wep', r: 17, dmg: 4.5, ang: 45, bkb: 45, kbg: 90 },
        { f: [5, 7], at: 'wepMid', r: 12, dmg: 4, ang: 45, bkb: 45, kbg: 85 },
      ],
      anim: [[0, 'cPokeWind'], [5, 'cPoke'], [12, 'cPoke'], [30, 'idle']],
      sfx: [[5, 'whiff']],
    },
    ftilt: {
      frames: 28,
      hits: [
        { f: [7, 9], at: 'wep', r: 18, dmg: 9, ang: 361, bkb: 22, kbg: 92 },
        { f: [7, 9], at: 'wepMid', r: 12, dmg: 7, ang: 361, bkb: 22, kbg: 88 },
      ],
      anim: [[0, 'cChopWind'], [5, 'cChopWind'], [8, 'cChop'], [14, 'cChop'], [28, 'idle']],
      sfx: [[6, 'whiff']],
    },
    utilt: {
      frames: 30,
      hits: [
        { f: [6, 12], at: 'wep', r: 19, dmg: 7, ang: 96, bkb: 26, kbg: 118 },
        { f: [6, 12], at: 'handF', r: 12, dmg: 6, ang: 96, bkb: 26, kbg: 112 },
      ],
      anim: [[0, 'idle'], [3, 'cUpWind'], [8, 'cUpMid'], [13, 'cUpEnd'], [30, 'idle']],
      sfx: [[5, 'whiff']],
    },
    dtilt: {
      frames: 24,
      hits: [
        { f: [6, 8], at: 'wep', r: 16, dmg: 6, ang: 78, bkb: 32, kbg: 72 },
        { f: [6, 8], at: 'wepMid', r: 11, dmg: 5, ang: 78, bkb: 32, kbg: 70 },
      ],
      anim: [[0, 'crouch'], [3, 'cLowWind'], [6, 'cLow'], [11, 'cLow'], [24, 'crouch']],
    },
    dash: {
      frames: 38,
      vel: [{ f: [1, 4], vx: 12 }, { f: [5, 18], vx: 12.5 }, { f: [19, 38], vx: 2.5 }],
      hits: [
        { f: [6, 11], at: 'wep', r: 20, dmg: 10, ang: 60, bkb: 55, kbg: 62 },
        { f: [6, 11], at: 'torso', r: 22, dmg: 8, ang: 60, bkb: 50, kbg: 58 },
        { f: [12, 20], at: 'wep', r: 16, dmg: 6, ang: 60, bkb: 40, kbg: 40 },
      ],
      anim: [[0, 'dash'], [6, 'cSlide'], [20, 'cSlide'], [38, 'idle']],
      sfx: [[6, 'dash']],
    },
    fsmash: {
      frames: 48,
      charge: 10,
      vel: [{ f: [12, 15], vx: 3 }],
      hits: [
        { f: [13, 16], at: 'wep', r: 21, dmg: 18, ang: 361, bkb: 32, kbg: 100 },
        { f: [13, 16], at: 'wepMid', r: 13, dmg: 13, ang: 361, bkb: 30, kbg: 94 },
      ],
      anim: [[0, 'idle'], [8, 'cBonkWind'], [10, 'cBonkWind'], [12, 'cBonkUp'], [14, 'cBonk'], [24, 'cBonk'], [48, 'idle']],
      sfx: [[12, 'whiff']],
    },
    usmash: {
      frames: 44,
      charge: 6,
      hits: [
        { f: [8, 12], at: 'wep', r: 22, dmg: 2.5, ang: 95, bkb: 40, kbg: 10, rehit: 4, fx: 'fire' },
        { f: [13, 16], at: 'wep', r: 24, dmg: 12, ang: 90, bkb: 32, kbg: 98, grp: 1, fx: 'fire' },
        { f: [13, 16], at: 'handF', r: 14, dmg: 10, ang: 90, bkb: 32, kbg: 94, grp: 1, fx: 'fire' },
      ],
      anim: [[0, 'idle'], [5, 'cFlipWind'], [6, 'cFlipWind'], [9, 'cFlipMid'], [12, 'cFlip'], [24, 'cFlip'], [44, 'idle']],
      sfx: [[8, 'fire'], [13, 'whiff']],
    },
    dsmash: {
      frames: 46,
      charge: 5,
      hits: [
        { f: [8, 9], at: 'wep', r: 20, dmg: 13, ang: 30, bkb: 28, kbg: 96 },
        { f: [8, 9], at: 'wepMid', r: 13, dmg: 10, ang: 30, bkb: 28, kbg: 90 },
        { f: [15, 16], at: 'wep', r: 20, dmg: 14, ang: 150, bkb: 30, kbg: 98, grp: 1 },
        { f: [15, 16], at: 'wepMid', r: 13, dmg: 11, ang: 150, bkb: 30, kbg: 92, grp: 1 },
      ],
      anim: [[0, 'crouch'], [4, 'cDsWind'], [5, 'cDsWind'], [8, 'cDsFront'], [11, 'cDsFront'], [13, 'cDsOver'], [15, 'cDsBack'], [20, 'cDsBack'], [46, 'idle']],
      sfx: [[8, 'thud'], [15, 'thud']],
    },
    nair: {
      frames: 36,
      air: true,
      landLag: 7,
      autoCancel: [3, 30],
      hits: [
        { f: [3, 6], at: 'wep', r: 18, dmg: 9, ang: 361, bkb: 18, kbg: 98 },
        { f: [3, 6], at: 'hip', r: 18, dmg: 7, ang: 361, bkb: 16, kbg: 90 },
        { f: [7, 18], at: 'wep', r: 15, dmg: 5, ang: 361, bkb: 10, kbg: 88 },
      ],
      anim: [[0, 'tuck'], [3, ['cSpin', { rot: 0 }]], [18, ['cSpin', { rot: 360 }], 'lin'], [36, ['fall', { rot: 360 }]]],
      sfx: [[3, 'whiff']],
    },
    fair: {
      frames: 40,
      air: true,
      landLag: 12,
      autoCancel: [3, 34],
      hits: [
        { f: [10, 12], at: 'wep', r: 19, dmg: 13, ang: 45, bkb: 34, kbg: 98 },
        { f: [10, 12], at: 'wepMid', r: 13, dmg: 10, ang: 45, bkb: 30, kbg: 92 },
        { f: [13, 15], at: 'wep', r: 17, dmg: 11, ang: 270, bkb: 25, kbg: 82, only: 'air' },
        { f: [13, 15], at: 'wep', r: 17, dmg: 11, ang: 60, bkb: 40, kbg: 60, only: 'ground' },
      ],
      anim: [[0, 'cFairWind'], [8, 'cFairWind'], [11, 'cFair'], [14, 'cFairEnd'], [22, 'cFairEnd'], [40, 'fall']],
      sfx: [[9, 'whiff']],
    },
    bair: {
      frames: 32,
      air: true,
      landLag: 9,
      autoCancel: [3, 26],
      hits: [
        { f: [6, 9], at: 'wep', r: 19, dmg: 13, ang: 145, bkb: 20, kbg: 100 },
        { f: [6, 9], at: 'wepMid', r: 13, dmg: 10, ang: 145, bkb: 20, kbg: 92 },
      ],
      anim: [[0, 'cBairWind'], [6, 'cBair'], [14, 'cBair'], [32, 'fall']],
      sfx: [[4, 'whiff']],
    },
    uair: {
      frames: 32,
      air: true,
      landLag: 8,
      autoCancel: [3, 26],
      hits: [
        { f: [4, 10], at: 'wep', r: 19, dmg: 8.5, ang: 82, bkb: 26, kbg: 110 },
        { f: [4, 10], at: 'handF', r: 12, dmg: 7, ang: 82, bkb: 26, kbg: 104 },
      ],
      anim: [[0, 'cUairWind'], [3, 'cUairWind'], [9, 'cUair'], [14, 'cUair'], [32, 'fall']],
      sfx: [[4, 'whiff']],
    },
    dair: {
      frames: 42,
      air: true,
      landLag: 16,
      autoCancel: [3, 36],
      vel: [{ f: [1, 10], grav: 0.6 }],
      hits: [
        { f: [12, 14], at: 'wep', r: 18, dmg: 14, ang: 270, bkb: 20, kbg: 86 },
        { f: [12, 14], at: 'wepMid', r: 12, dmg: 10, ang: 361, bkb: 25, kbg: 80 },
        { f: [15, 22], at: 'wep', r: 15, dmg: 8, ang: 361, bkb: 20, kbg: 70 },
      ],
      anim: [[0, 'cDairWind'], [9, 'cDairWind'], [12, 'cDair'], [22, 'cDair'], [42, 'fall']],
      sfx: [[12, 'whiff']],
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
    pummel: { frames: 16, pummel: 1.5, anim: [[0, 'hold'], [4, 'cPumHit'], [10, 'hold'], [16, 'hold']] },
    fthrow: {
      frames: 30,
      throw: { release: 12, hit: { dmg: 9, ang: 40, bkb: 60, kbg: 62 } },
      anim: [[0, 'hold'], [7, 'cChopWind'], [12, 'cChop'], [20, 'cChop'], [30, 'idle']],
      sfx: [[11, 'whiff']],
    },
    bthrow: {
      frames: 34,
      throw: { release: 14, holdAt: 'handF', hit: { dmg: 11, ang: 140, bkb: 62, kbg: 72 } },
      anim: [[0, 'hold'], [6, ['throwF', { rot: -90, wep: 60 }]], [12, ['throwB', { rot: -200, wep: 60 }]], [16, ['throwB', { rot: -340, wep: 60 }]], [34, ['idle', { rot: -360 }]]],
    },
    uthrow: {
      frames: 36,
      throw: { release: 14, holdAt: 'wep', hx: 0, hy: 10, hit: { dmg: 8, ang: 90, bkb: 70, kbg: 70, fx: 'food' } },
      anim: [[0, 'hold'], [8, 'cFlipWind'], [14, 'cFlip'], [22, 'cFlip'], [36, 'idle']],
      sfx: [[14, 'boing']],
    },
    dthrow: {
      frames: 38,
      throw: { release: 22, holdAt: 'hip', hx: 34, hy: 10, hit: { dmg: 7, ang: 72, bkb: 62, kbg: 40 } },
      anim: [[0, 'hold'], [5, 'cTenderUp'], [8, 'cTender'], [12, 'cTenderUp'], [15, 'cTender'], [19, 'cTenderUp'], [22, 'cTender'], [30, 'cTender'], [38, 'idle']],
      sfx: [[8, 'clank'], [15, 'clank'], [22, 'clank']],
    },
    nspec: {
      frames: 46,
      script: 'chef:dish',
      anim: [[0, 'idle'], [6, 'cPresent'], [8, 'cPresent'], [11, 'cReveal'], [15, 'cHurlWind'], [19, 'cHurl'], [28, 'cHurl'], [46, 'idle']],
    },
    nspecAir: {
      frames: 44,
      script: 'chef:dish',
      vel: [{ f: [1, 22], grav: 0.45 }],
      anim: [[0, 'fall'], [6, 'cPresent'], [8, 'cPresent'], [11, 'cReveal'], [15, 'cHurlWind'], [19, 'cHurl'], [28, 'cHurl'], [44, 'fall']],
    },
    sspec: {
      frames: 44,
      oncePerAir: true,
      vel: [{ f: [1, 1], vy: 0 }, { f: [1, 20], grav: 0.25 }],
      reflect: { f: [9, 17], at: 'wep', r: 30, mult: 1.3 },
      hits: [
        { f: [11, 14], at: 'wep', r: 22, dmg: 12, ang: 361, bkb: 40, kbg: 82 },
        { f: [11, 14], at: 'wepMid', r: 14, dmg: 9, ang: 361, bkb: 36, kbg: 76 },
      ],
      anim: [[0, 'idle'], [8, 'cSwingWind'], [9, 'cSwingWind'], [12, 'cSwing'], [16, 'cSwingEnd'], [26, 'cSwingEnd'], [44, 'idle']],
      sfx: [[11, 'whiff']],
    },
    uspec: {
      frames: 46,
      helpless: true,
      landHelpless: 22,
      ledgeFrom: 8,
      reverse: true,
      vel: [{ f: [1, 6], vx: 0, vy: 0, grav: 0 }, { f: [7, 27], vy: 17, grav: 0 }, { f: [28, 46], grav: 0.7 }],
      hits: [
        { f: [7, 26], at: 'wep', r: 24, dmg: 1.5, ang: 85, bkb: 32, kbg: 22, rehit: 4, fx: 'fire' },
        { f: [7, 26], at: 'hip', r: 22, dmg: 1.5, ang: 85, bkb: 32, kbg: 22, rehit: 4, fx: 'fire' },
        { f: [28, 31], at: 'wep', r: 28, dmg: 6, ang: 80, bkb: 62, kbg: 90, grp: 1, fx: 'fire' },
      ],
      anim: [[0, 'cJetPrep'], [6, 'cJetPrep'], [8, 'cJet'], [26, 'cJet'], [30, 'cJetEnd'], [46, 'helpless']],
      sfx: [[7, 'jet'], [7, 'fire'], [28, 'fire']],
    },
    dspec: {
      frames: 34,
      shots: [{ f: 12, proj: 'sauce', at: 'handB', x: 4 }],
      anim: [[0, 'idle'], [6, 'cSauceWind'], [12, 'cSauceToss'], [20, 'cSauceToss'], [34, 'idle']],
      sfx: [[12, 'throw']],
    },
    dspecAir: {
      frames: 34,
      shots: [{ f: 12, proj: 'sauce', at: 'handB', x: 4, vx: 3, vy: 3 }],
      anim: [[0, 'fall'], [6, 'cSauceWind'], [12, 'cSauceToss'], [20, 'cSauceToss'], [34, 'fall']],
      sfx: [[12, 'throw']],
    },
    ledgeatk: {
      frames: 50,
      hits: [
        { f: [17, 20], at: 'wep', r: 18, dmg: 9, ang: 361, bkb: 45, kbg: 45 },
        { f: [17, 20], at: 'wepMid', r: 12, dmg: 8, ang: 361, bkb: 45, kbg: 45 },
      ],
      anim: [[0, 'climb'], [12, 'cChopWind'], [18, 'cChop'], [26, 'cChop'], [50, 'idle']],
    },
    getupatk: {
      frames: 44,
      hits: [
        { f: [14, 16], at: 'wep', r: 18, dmg: 7, ang: 361, bkb: 50, kbg: 40 },
        { f: [21, 23], at: 'wep', r: 18, dmg: 7, ang: 145, bkb: 50, kbg: 40, grp: 1 },
      ],
      anim: [[0, 'lying'], [10, 'cDsWind'], [14, 'cDsFront'], [18, 'cDsOver'], [22, 'cDsBack'], [44, 'idle']],
    },
    ult: {
      frames: 130,
      ult: true,
      script: 'chef:ult',
      anim: [
        [0, 'cUltCall'],
        [20, 'cUltCall'],
        [28, 'cConductA'],
        [40, 'cConductB', 'io'],
        [52, 'cConductA', 'io'],
        [64, 'cConductB', 'io'],
        [76, 'cConductA', 'io'],
        [88, 'cConductB', 'io'],
        [98, 'cKissIn'],
        [108, 'cKissIn'],
        [113, 'cKissOut'],
        [126, 'cKissOut'],
        [130, 'idle'],
      ],
      sfx: [[4, 'thud'], [6, 'magic'], [111, 'note']],
    },
  },
};

registerScripts({
  // Daily Special: the cloche lifts on frame 8 (the dish is rolled then), the dish flies on frame 19.
  'chef:dish': (st, f) => {
    if (f.mf <= 2) f.v[0] = 0;
    if (f.mf === 8) {
      const r = rint(st, 16);
      f.v[0] = r === 0 ? 4 : r <= 3 ? 3 : r <= 8 ? 2 : 1;
      if (f.v[0] === 4) {
        ev(st, 'charged', f.x, f.y, f.i);
        ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'magic');
      } else ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'item');
    }
    if (f.mf === 19) {
      shoot(st, f, DISHES[(f.v[0] || 1) - 1], 'handB', 6, 4);
      ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'throw');
    }
  },
  // Chef's Kiss: a giant cauldron rises out of the stage centre, bubbles over everyone, then boils over.
  'chef:ult': (st, f) => {
    if (f.mf !== 4) return;
    const s0 = STAGES[st.stage].solids[0];
    const cx = (s0.x1 + s0.x2) / 2;
    const pk = cfOf(f).projIdx.cauldron;
    if (pk === undefined) return;
    const p = spawnProj(st, f, pk, cx, s0.y1 - 110, 0, 0);
    // half-width for the art (the pot fills most of the main stage)
    p.v0 = Math.min(560, Math.max(260, (s0.x2 - s0.x1) * 0.42));
    ev(st, 'sfx', cx, s0.y1 - bodyH(st, f) * 0.5, f.i, 0, 0, 'boing');
  },
});
