// Smudge — paints the stage. Street-artist raccoon from Canvas Town: slouchy beanie, paint-splattered overalls, a
// giant paintbrush, a paint roller for emergencies and a bushy tail ringed in every colour they own.
// Signature: paint. Everything Smudge flicks, rolls or drips paints the floor; on their own paint Smudge runs 30%
// faster (engine) and hits 15% harder (smudge:mult); bros standing in it are slowed (engine).
import { A } from '../../sim/acts';
import { fighterSkel } from '../../sim/anim';
import { ev } from '../../sim/events';
import { cfOf, surfs } from '../../sim/fighter';
import { POSES } from '../../sim/poses';
import { paintAt, spawnProj } from '../../sim/projectiles';
import { registerScripts } from '../../sim/scripts';
import type { Fighter, FighterDef, State } from '../../sim/types';

/** is f standing on paint of their own (or a teammate's)? Uses the topmost stripe under the feet (the one you see). */
export function smudgeOnOwnPaint(st: State, f: Fighter): boolean {
  if (f.gnd < 0) return false;
  for (let i = st.paint.length - 1; i >= 0; i--) {
    const p = st.paint[i];
    if (p.s !== f.gnd || f.x < p.x1 || f.x > p.x2) continue;
    if (p.owner === f.i) return true;
    const o = st.fighters[p.owner];
    return !!o && st.cfg.teams && o.team === f.team;
  }
  return false;
}

/** where the Masterpiece canvas hangs (the art draws it at the same spot) */
export function smudgeCanvas(st: State): [number, number] {
  const s = surfs(st)[0];
  return [(s.x1 + s.x2) / 2, s.y1 - 330];
}

export const smudge: FighterDef = {
  id: 'smudge',
  name: 'Smudge',
  title: 'Painted 300 Portraits Of Their Bros',
  role: 'Paints the stage',
  color: '#ff4fd2',
  weight: 92,
  power: 0.99,
  rig: { thigh: 22, shin: 21, torso: 33, head: 23, upper: 19, fore: 17, girth: 15, limb: 7, wep: 56, tail: 44 },
  stats: { walk: 10, dash: 18, run: 16.5, dashFrames: 10, airSpeed: 9.8, airAccel: 0.56, airFric: 0.12, groundFric: 0.9, grav: 0.8, fall: 14, ffall: 22, jump: 21, hop: 14.2, djump: 19.5, jumps: 1, squat: 3 },
  bio: 'Canvas Town’s most wanted (for commissions). Smudge has covered every wall, bridge and bus in town with portraits of their bros, got beamed aboard mid-mural, and immediately started on the studio floor. Signs every KO. Very proud of the signature.',
  line: 'Hold still, bro. No— the other side. Your good side. They’re all your good side.',
  taunt: 'Paints a big heart in the air, signs it with a flourish, blows it a kiss.',
  wins: ['Signed it. You’re a masterpiece, bro.', 'This one’s going in the gallery. Title: “Us.” Price: priceless, bro.', 'Wet paint! Watch your step, bro. Love you. Mind the step.'],
  moveNames: { nspec: 'Splat Shot', sspec: 'Brush Dash', uspec: 'Drip Rocket', dspec: 'Roller', ult: 'Masterpiece' },
  projs: {
    blob: { kind: 'splatblob', r: 15, life: 120, vx: 10.5, vy: 7.5, grav: 0.5, paint: true, chargeable: true, hit: { dmg: 6, ang: 361, bkb: 24, kbg: 52, fx: 'paint' } },
    drip: { kind: 'paintdrip', r: 9, life: 90, grav: 0.55, paint: true, hit: { dmg: 3, ang: 361, bkb: 14, kbg: 30, fx: 'paint' } },
    mdrop: { kind: 'mdrop', r: 26, life: 90, ghost: true, homing: 9, hit: { dmg: 9, ang: 85, bkb: 42, kbg: 30, fx: 'paint', unblockable: true } },
    mfinale: { kind: 'mfinale', r: 36, life: 100, ghost: true, homing: 9, hit: { dmg: 16, ang: 75, bkb: 72, kbg: 104, fx: 'paint', unblockable: true } },
  },
  poses: {
    // brush resting on the shoulder
    idle: { lean: 6, armF: 26, foreF: 108, wep: 96, armB: -14, foreB: 34, tail: 72 },
    // library states with the brush held clear of the face (wep only)
    jump: { ...POSES.jump, wep: 30 },
    fall: { ...POSES.fall, wep: 40 },
    airdodge: { ...POSES.airdodge, wep: 20 },
    helpless: { ...POSES.helpless, wep: 0 },
    ledge: { ...POSES.ledge, wep: -80 },
    shield: { ...POSES.shield, wep: 20 },
    hurt: { ...POSES.hurt, wep: -20 },
    hurtBig: { ...POSES.hurtBig, wep: -30 },
    tumble: { ...POSES.tumble, wep: 28 },
    grabbed: { ...POSES.grabbed, wep: -10 },
    tuck: { ...POSES.tuck, wep: 0 },
    lying: { ...POSES.lying, wep: -10 },
    dabWind: { lean: 8, armF: 48, foreF: 100, wep: 70, armB: 30, foreB: 80, legF: 25, shinF: 25, legB: -22, shinB: 20 },
    dab1: { lean: 18, armF: 88, foreF: 4, wep: 12, armB: 20, foreB: 90, legF: 30, shinF: 22, legB: -24, shinB: 16 },
    dab2: { lean: 24, armF: 70, foreF: 6, wep: -14, armB: -30, foreB: 60, legF: 34, shinF: 26, legB: -28, shinB: 14 },
    swipeWind: { lean: -10, armF: -40, foreF: 40, wep: -70, armB: 40, foreB: 70, legF: 24, shinF: 22, legB: -26, shinB: 16 },
    swipe: { lean: 24, armF: 100, foreF: 0, wep: -5, armB: -40, foreB: 30, legF: 40, shinF: 18, legB: -36, shinB: 8 },
    sweepLow: { lean: 35, head: -6, armF: 78, foreF: 0, wep: 32, armB: 20, foreB: 60, legF: 75, shinF: 115, legB: 15, shinB: 115, sy: 0.96 },
    skate: { lean: 8, head: 4, armF: 100, foreF: 10, wep: 60, armB: -70, foreB: 20, legF: 34, shinF: 30, legB: -28, shinB: 36, y: 10, tail: 100 },
    loadBrush: { lean: -6, armF: 150, foreF: 60, wep: 60, armB: 40, foreB: 70, legF: 26, shinF: 24, legB: -24, shinB: 18 },
    lunge: { lean: 44, head: -10, armF: 98, foreF: 0, wep: 8, armB: -50, foreB: 20, legF: 60, shinF: 50, legB: -50, shinB: 30, tail: 110 },
    rocket: { lean: 0, head: -4, armF: 8, foreF: 0, wep: 0, armB: 172, foreB: 6, legF: 40, shinF: 80, legB: 20, shinB: 70, sy: 1.06, tail: 30 },
    rollerPlant: { lean: 20, armF: 70, foreF: 20, wep: 30, armB: 60, foreB: 30, legF: 40, shinF: 60, legB: -20, shinB: 50, tail: 100 },
    rollerA: { lean: 32, head: -6, armF: 64, foreF: 0, wep: 46, armB: 58, foreB: 10, legF: 50, shinF: 40, legB: -40, shinB: 50, tail: 110 },
    rollerB: { lean: 32, head: -6, armF: 64, foreF: 0, wep: 46, armB: 58, foreB: 10, legF: -30, shinF: 60, legB: 45, shinB: 35, tail: 104 },
    rollerDive: { lean: 0, armF: 4, foreF: 0, wep: 0, armB: 8, foreB: 0, legF: 70, shinF: 110, legB: 60, shinB: 110, tail: 20 },
    dsWind: { lean: 10, armF: 150, foreF: 30, wep: 40, armB: 120, foreB: 30, legF: 60, shinF: 100, legB: -20, shinB: 80, tail: 20 },
    dsFront: { lean: 36, armF: 78, foreF: 0, wep: 32, armB: -40, foreB: 20, legF: 70, shinF: 100, legB: -40, shinB: 60, tail: 40 },
    dsBack: { lean: 30, armF: 20, foreF: 40, wep: 100, armB: -60, foreB: 20, legF: 60, shinF: 90, legB: -30, shinB: 70, tail: 98 },
    twirl: { lean: 0, armF: 90, foreF: 0, wep: 0, armB: -100, foreB: 30, legF: 52, shinF: 70, legB: -42, shinB: 60, tail: 100 },
    tailWind: { lean: 10, armF: 60, foreF: 60, armB: 40, foreB: 60, legF: 60, shinF: 90, legB: 30, shinB: 90, tail: -20 },
    tailWhip: { lean: 28, head: 8, armF: 50, foreF: 50, wep: 90, armB: 20, foreB: 40, legF: 50, shinF: 80, legB: 0, shinB: 70, tail: 118 },
    skyA: { lean: -10, armF: 130, foreF: 0, wep: 0, armB: -40, foreB: 30, legF: 30, shinF: 60, legB: -20, shinB: 50 },
  },
  base: {
    // the taunt: paints a heart in the air with big loopy strokes (the art draws the heart)
    taunt: [
      [0, { lean: 2, armF: 100, foreF: 30, wep: 20, armB: -20, foreB: 40 }],
      [12, { lean: -4, armF: 150, foreF: 20, wep: 10, armB: -20, foreB: 40 }],
      [24, { lean: 4, armF: 95, foreF: 30, wep: 30, armB: -20, foreB: 40 }],
      [36, { lean: -4, armF: 150, foreF: 20, wep: 10, armB: -20, foreB: 40 }],
      [48, { lean: 8, armF: 70, foreF: 40, wep: 40, armB: 160, foreB: 10, head: -12 }],
      [60, 'idle'],
    ],
  },
  moves: {
    // ---------------------------------------------------------------- jabs: dab, dab, SWOOSH
    jab1: {
      frames: 17,
      hits: [
        { f: [3, 4], at: 'wep', r: 13, dmg: 2.5, ang: 361, bkb: 18, kbg: 25, fx: 'paint' },
        { f: [3, 4], at: 'wepMid', r: 11, dmg: 2.5, ang: 361, bkb: 18, kbg: 25, fx: 'paint' },
      ],
      next: [{ move: 'jab2', from: 4, to: 15 }],
      anim: [[0, 'dabWind'], [3, 'dab1'], [9, 'dab1'], [17, 'ready']],
    },
    jab2: {
      frames: 18,
      hits: [
        { f: [3, 4], at: 'wep', r: 13, dmg: 2, ang: 361, bkb: 18, kbg: 25, fx: 'paint' },
        { f: [3, 4], at: 'wepMid', r: 11, dmg: 2, ang: 361, bkb: 18, kbg: 25, fx: 'paint' },
      ],
      next: [{ move: 'jab3', from: 4, to: 16 }],
      anim: [[0, 'dab1'], [3, 'dab2'], [10, 'dab2'], [18, 'ready']],
    },
    jab3: {
      frames: 30,
      hits: [
        { f: [6, 8], at: 'wep', r: 18, dmg: 4.5, ang: 45, bkb: 45, kbg: 90, fx: 'paint' },
        { f: [6, 8], at: 'wepMid', r: 14, dmg: 4, ang: 45, bkb: 45, kbg: 88, fx: 'paint' },
      ],
      anim: [[0, 'swipeWind'], [4, ['swipeWind', { armF: -20 }]], [6, 'swipe'], [12, 'swipe'], [30, 'idle']],
      sfx: [[5, 'whiff']],
    },
    // ---------------------------------------------------------------- tilts
    ftilt: {
      frames: 28,
      hits: [
        { f: [6, 8], at: 'wep', r: 17, dmg: 9, ang: 361, bkb: 20, kbg: 90, fx: 'paint' },
        { f: [6, 8], at: 'wepMid', r: 13, dmg: 7.5, ang: 361, bkb: 20, kbg: 88, fx: 'paint' },
      ],
      anim: [[0, ['ready', { armF: 30, foreF: 100, wep: 120, lean: 0 }]], [5, ['stab', { wep: 20, lean: 20 }]], [7, ['stab', { wep: 20 }]], [13, ['stab', { wep: 20 }]], [28, 'idle']],
      sfx: [[6, 'whiff']],
    },
    utilt: {
      frames: 30,
      hits: [
        { f: [5, 10], at: 'wep', r: 18, dmg: 7, ang: 96, bkb: 26, kbg: 118, fx: 'paint' },
        { f: [5, 10], at: 'wepMid', r: 14, dmg: 6, ang: 96, bkb: 26, kbg: 115, fx: 'paint' },
      ],
      anim: [
        [0, ['ready', { armF: 60, foreF: 20, wep: 30 }]],
        [5, { lean: -4, armF: 120, foreF: 0, wep: 0, armB: -30, foreB: 40 }],
        [8, { lean: -10, armF: 180, foreF: 0, wep: 0, armB: -40, foreB: 40 }],
        [12, { lean: -14, armF: 235, foreF: 0, wep: 0, armB: -40, foreB: 40 }],
        [21, { lean: -4, armF: 320, foreF: 20, wep: 40, armB: -20, foreB: 40 }],
        [30, ['idle', { armF: 386 }]],
      ],
      sfx: [[5, 'whiff']],
    },
    dtilt: {
      frames: 24,
      script: 'smudge:dtilt',
      hits: [
        { f: [5, 7], at: 'wep', r: 15, dmg: 6, ang: 76, bkb: 32, kbg: 70, fx: 'paint' },
        { f: [5, 7], at: 'wepMid', r: 12, dmg: 5, ang: 76, bkb: 32, kbg: 68, fx: 'paint' },
      ],
      anim: [[0, 'crouch'], [4, ['crouch', { armF: 40, foreF: 60, wep: 120 }]], [5, 'sweepLow'], [11, 'sweepLow'], [24, 'crouch']],
    },
    dash: {
      // Kickflip Delivery: hops on a skateboard and rams
      frames: 38,
      vel: [{ f: [1, 4], vx: 13 }, { f: [5, 18], vx: 12 }, { f: [19, 38], vx: 3 }],
      hits: [
        { f: [6, 12], at: 'hip', x: 10, y: 4, r: 27, dmg: 9, ang: 62, bkb: 58, kbg: 60 },
        { f: [13, 18], at: 'hip', x: 10, y: 4, r: 20, dmg: 5, ang: 62, bkb: 40, kbg: 40 },
      ],
      anim: [[0, 'dash'], [5, 'skate'], [18, 'skate'], [24, ['skate', { y: 28, legF: 60, shinF: 90, legB: 10, shinB: 90, armF: 140, armB: -80 }]], [30, 'land'], [38, 'idle']],
      sfx: [[5, 'dash']],
    },
    // ---------------------------------------------------------------- smash attacks
    fsmash: {
      // The Big Stroke: brush hauled back over the head, then slammed down in front with a splash
      frames: 48,
      charge: 10,
      script: 'smudge:fsmash',
      hits: [
        { f: [14, 16], at: 'wep', y: 10, r: 25, dmg: 17, ang: 361, bkb: 30, kbg: 100, fx: 'paint' },
        { f: [14, 16], at: 'wepMid', r: 17, dmg: 14, ang: 361, bkb: 30, kbg: 96, fx: 'paint' },
      ],
      anim: [[0, 'ready'], [7, ['overheadWind', { wep: 60, sy: 0.95 }]], [12, ['overheadWind', { wep: 70, lean: -26, sy: 0.94 }]], [15, ['overhead', { wep: 30, sx: 1.06 }]], [23, ['overhead', { wep: 30 }]], [48, 'idle']],
      sfx: [[14, 'thud']],
    },
    usmash: {
      // Upstroke: a crouch, then the brush flung straight up in a fountain of paint
      frames: 44,
      charge: 6,
      hits: [
        { f: [9, 13], at: 'wep', r: 23, dmg: 15, ang: 90, bkb: 32, kbg: 98, fx: 'paint' },
        { f: [9, 13], at: 'wepMid', r: 17, dmg: 13, ang: 92, bkb: 32, kbg: 96, fx: 'paint' },
        { f: [9, 12], at: 'handF', r: 15, dmg: 12, ang: 95, bkb: 32, kbg: 94, fx: 'paint' },
      ],
      anim: [[0, 'ready'], [5, ['upSmashWind', { wep: -60 }]], [9, ['upSmash', { wep: 0 }]], [17, ['upSmash', { wep: 0 }]], [44, 'idle']],
      sfx: [[9, 'whiff']],
    },
    dsmash: {
      // Spin Splash: brush sweeps the floor in front, then the tail sweeps behind
      frames: 44,
      charge: 5,
      hits: [
        { f: [7, 9], at: 'wep', y: 10, r: 21, dmg: 12, ang: 30, bkb: 28, kbg: 96, fx: 'paint' },
        { f: [7, 9], at: 'wepMid', r: 15, dmg: 11, ang: 30, bkb: 28, kbg: 94, fx: 'paint' },
        { f: [14, 16], at: 'tail', r: 22, dmg: 13, ang: 30, bkb: 30, kbg: 98, grp: 1 },
        { f: [14, 16], at: 'tail', x: 20, y: -4, r: 16, dmg: 12, ang: 30, bkb: 30, kbg: 96, grp: 1 },
      ],
      anim: [[0, 'crouch'], [5, 'dsWind'], [8, 'dsFront'], [11, 'dsFront'], [14, 'dsBack'], [18, 'dsBack'], [28, 'crouch'], [44, 'idle']],
      sfx: [[7, 'whiff'], [14, 'whiff']],
    },
    // ---------------------------------------------------------------- aerials
    nair: {
      // Paint Twirl: the brush windmills all the way round
      frames: 36,
      air: true,
      landLag: 7,
      autoCancel: [3, 30],
      hits: [
        { f: [3, 7], at: 'wep', r: 17, dmg: 8, ang: 361, bkb: 16, kbg: 100, fx: 'paint' },
        { f: [3, 7], at: 'wepMid', r: 13, dmg: 7, ang: 361, bkb: 16, kbg: 98, fx: 'paint' },
        { f: [8, 17], at: 'wep', r: 15, dmg: 5, ang: 361, bkb: 10, kbg: 90, fx: 'paint' },
      ],
      anim: [
        [0, 'tuck'],
        [3, ['twirl', { armF: 60 }]],
        [6, ['twirl', { armF: 150 }]],
        [9, ['twirl', { armF: 240 }]],
        [12, ['twirl', { armF: 330 }]],
        [15, ['twirl', { armF: 420 }]],
        [18, ['twirl', { armF: 470 }]],
        [26, ['fall', { armF: 472 }]],
        [36, ['fall', { armF: 472 }]],
      ],
    },
    fair: {
      // Downstroke: overhead chop in front
      frames: 40,
      air: true,
      landLag: 12,
      autoCancel: [3, 34],
      hits: [
        { f: [10, 13], at: 'wep', r: 19, dmg: 12, ang: 40, bkb: 34, kbg: 98, fx: 'paint' },
        { f: [10, 13], at: 'wepMid', r: 14, dmg: 10, ang: 45, bkb: 30, kbg: 92, fx: 'paint' },
      ],
      anim: [[0, ['fairWind', { wep: 20 }]], [8, ['fairWind', { wep: 30, lean: -20 }]], [11, ['fair', { wep: 0 }]], [17, ['fair', { wep: 0 }]], [40, 'fall']],
      sfx: [[10, 'whiff']],
    },
    bair: {
      // Tail Whip
      frames: 32,
      air: true,
      landLag: 9,
      autoCancel: [3, 26],
      hits: [
        { f: [6, 9], at: 'tail', r: 20, dmg: 12, ang: 361, bkb: 20, kbg: 100 },
        { f: [6, 9], at: 'tail', x: 22, y: -10, r: 15, dmg: 10, ang: 361, bkb: 20, kbg: 96 },
      ],
      anim: [[0, 'tailWind'], [5, ['tailWhip', { tail: 60 }]], [7, 'tailWhip'], [14, 'tailWhip'], [32, 'fall']],
      sfx: [[6, 'whiff']],
    },
    uair: {
      // Sky Stroke: the brush arcs over the head, front to back
      frames: 32,
      air: true,
      landLag: 8,
      autoCancel: [3, 26],
      hits: [
        { f: [4, 10], at: 'wep', r: 18, dmg: 8.5, ang: 80, bkb: 26, kbg: 110, fx: 'paint' },
        { f: [4, 10], at: 'wepMid', r: 14, dmg: 7, ang: 82, bkb: 26, kbg: 106, fx: 'paint' },
      ],
      anim: [[0, ['fall', { armF: 80, foreF: 30, wep: 40 }]], [4, 'skyA'], [7, ['skyA', { armF: 185, lean: -14 }]], [11, ['skyA', { armF: 240, lean: -16 }]], [32, ['fall', { armF: 472 }]]],
    },
    dair: {
      // Drip Drop: both sneakers straight down
      frames: 40,
      air: true,
      landLag: 16,
      autoCancel: [3, 34],
      hits: [
        { f: [13, 15], at: 'footF', r: 17, dmg: 13, ang: 270, bkb: 20, kbg: 88, fx: 'paint' },
        { f: [13, 15], at: 'footB', r: 15, dmg: 13, ang: 270, bkb: 20, kbg: 88, fx: 'paint' },
        { f: [16, 22], at: 'footF', r: 15, dmg: 8, ang: 361, bkb: 20, kbg: 70 },
      ],
      anim: [[0, ['dairWind', { tail: 140 }]], [12, ['dairWind', { tail: 150 }]], [14, ['dair', { tail: 160 }]], [22, 'dair'], [40, 'fall']],
    },
    // ---------------------------------------------------------------- grabs and throws
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
    pummel: { frames: 16, pummel: 1.5, anim: [[0, 'hold'], [4, ['hold', { armB: 110, foreB: 0, lean: 16 }]], [16, 'hold']] },
    fthrow: {
      // Fresh Coat: a dab on the nose, then a shove
      frames: 28,
      throw: { release: 10, hit: { dmg: 8, ang: 40, bkb: 60, kbg: 62, fx: 'paint' } },
      anim: [[0, 'hold'], [8, ['throwF', { wep: 20 }]], [28, 'idle']],
    },
    bthrow: {
      // Spin Cycle
      frames: 32,
      throw: { release: 14, holdAt: 'handF', hit: { dmg: 10.5, ang: 140, bkb: 60, kbg: 74 } },
      anim: [[0, 'hold'], [6, ['throwF', { rot: -90 }]], [12, ['throwB', { rot: -200 }]], [16, ['throwB', { rot: -340 }]], [32, ['idle', { rot: -360 }]]],
    },
    uthrow: {
      // Up The Wall
      frames: 34,
      throw: { release: 13, hit: { dmg: 7, ang: 90, bkb: 70, kbg: 70, fx: 'paint' } },
      anim: [[0, 'hold'], [8, 'crouch'], [13, 'throwUp'], [34, 'idle']],
    },
    dthrow: {
      // Floor Print: a body-shaped splat on the floor
      frames: 34,
      script: 'smudge:dthrow',
      throw: { release: 15, hit: { dmg: 6, ang: 72, bkb: 60, kbg: 40, fx: 'paint' } },
      anim: [[0, 'hold'], [10, 'throwDown'], [20, 'throwDown'], [34, 'idle']],
      sfx: [[15, 'thud']],
    },
    // ---------------------------------------------------------------- specials
    nspec: {
      // Splat Shot: hold to load more paint onto the brush; shield stores it
      frames: 60,
      chargeB: { at: 10, max: 70, release: 'nspecFire' },
      anim: [[0, ['castWind', { wep: 140 }]], [10, 'loadBrush'], [60, 'loadBrush']],
    },
    nspecFire: {
      frames: 28,
      shots: [{ f: 4, proj: 'blob', at: 'wep' }],
      anim: [[0, 'loadBrush'], [3, ['swing', { wep: 10, armF: 110 }]], [14, ['swing', { wep: 10, armF: 110 }]], [28, 'idle']],
      sfx: [[4, 'whiff']],
    },
    nspecAir: {
      frames: 32,
      shots: [{ f: 6, proj: 'blob', at: 'wep' }],
      anim: [[0, 'loadBrush'], [5, ['swing', { wep: 10, armF: 110 }]], [18, ['swing', { wep: 10, armF: 110 }]], [32, 'fall']],
      sfx: [[6, 'whiff']],
    },
    sspec: {
      // Brush Dash: a lunge with the brush on the floor, painting the whole path. Recovers once per airtime.
      frames: 40,
      oncePerAir: true,
      edgeStop: true,
      script: 'smudge:dash',
      vel: [{ f: [1, 5], vx: 1, vy: 0, grav: 0 }, { f: [6, 18], vx: 19, vy: 0, grav: 0 }, { f: [19, 40], vx: 3, grav: 0.6 }],
      hits: [
        { f: [6, 18], at: 'wep', y: 8, r: 24, dmg: 9, ang: 45, bkb: 52, kbg: 62, fx: 'paint' },
        { f: [6, 18], at: 'torso', y: 16, r: 22, dmg: 7, ang: 45, bkb: 48, kbg: 58, fx: 'paint' },
      ],
      anim: [[0, ['ready', { wep: 150, armF: 20 }]], [5, ['lunge', { lean: 20 }]], [7, 'lunge'], [18, 'lunge'], [26, 'ready'], [40, 'idle']],
      sfx: [[6, 'dash']],
    },
    uspec: {
      // Drip Rocket: brush upside down, paint jet full blast; drips paint the floor below
      frames: 46,
      helpless: true,
      landHelpless: 22,
      ledgeFrom: 8,
      reverse: true,
      vel: [{ f: [1, 6], vx: 0, vy: 0, grav: 0 }, { f: [7, 30], vy: 17, grav: 0 }, { f: [31, 46], grav: 0.7 }],
      hits: [
        { f: [7, 28], at: 'wep', y: -24, r: 26, dmg: 1.6, ang: 90, bkb: 30, kbg: 22, rehit: 5, fx: 'paint' },
        { f: [7, 28], at: 'hip', r: 26, dmg: 1.6, ang: 90, bkb: 30, kbg: 22, rehit: 5, fx: 'paint' },
        { f: [29, 32], at: 'head', y: 14, r: 30, dmg: 5, ang: 80, bkb: 60, kbg: 88, grp: 1, fx: 'paint' },
      ],
      shots: [
        { f: 10, proj: 'drip', at: 'wep', vx: 0, vy: -3 },
        { f: 16, proj: 'drip', at: 'wep', vx: 1, vy: -3 },
        { f: 22, proj: 'drip', at: 'wep', vx: -1, vy: -3 },
        { f: 28, proj: 'drip', at: 'wep', vx: 0, vy: -3 },
      ],
      anim: [[0, 'crouch'], [6, ['crouch', { armF: 20, foreF: 0, wep: 0 }]], [7, 'rocket'], [30, ['rocket', { armB: 178 }]], [46, 'helpless']],
      sfx: [[7, 'jet']],
    },
    dspec: {
      // Roller (signature): pushes a giant paint roller along the floor, painting a wide stripe. Hold B to keep rolling.
      frames: 60,
      edgeStop: true,
      script: 'smudge:roller',
      loop: { from: 22, to: 38, on: 'special', max: 3 },
      vel: [{ f: [1, 10], vx: 0 }, { f: [11, 47], vx: 10.5 }, { f: [48, 60], vx: 1 }],
      hits: [
        { f: [11, 44], at: 'wep', r: 26, dmg: 2, ang: 361, bkb: 46, kbg: 8, rehit: 7, fx: 'paint' },
        { f: [45, 48], at: 'wep', r: 30, dmg: 6, ang: 48, bkb: 62, kbg: 72, grp: 1, fx: 'paint' },
      ],
      anim: [
        [0, 'crouch'],
        [6, 'rollerPlant'],
        [10, ['rollerPlant', { wep: -12 }]],
        [14, 'rollerA'],
        [18, 'rollerB'],
        [22, 'rollerA'],
        [26, 'rollerB'],
        [30, 'rollerA'],
        [34, 'rollerB'],
        [38, 'rollerA'],
        [42, 'rollerB'],
        [46, ['rollerA', { lean: 38, armF: 76, wep: 40 }]],
        [52, ['rollerA', { lean: 38, armF: 76, wep: 40 }]],
        [60, 'idle'],
      ],
      sfx: [[11, 'dash']],
    },
    dspecAir: {
      // Roller Drop: plunges roller-first and splashes paint both ways on landing
      frames: 70,
      landInto: 'dspecLand',
      vel: [{ f: [1, 6], vx: 0, vy: 4, grav: 0 }, { f: [7, 70], vx: 0, vy: -22, grav: 0, noDrift: true }],
      hits: [{ f: [7, 70], at: 'wep', r: 26, dmg: 9, ang: 270, bkb: 30, kbg: 60, only: 'air', fx: 'paint' }],
      anim: [[0, 'tuck'], [6, ['rollerDive', { armF: 150 }]], [8, 'rollerDive'], [70, 'rollerDive']],
    },
    dspecLand: {
      frames: 32,
      script: 'smudge:rollerLand',
      hits: [
        { f: [1, 3], at: 'hip', x: 62, y: -16, r: 36, dmg: 9, ang: 65, bkb: 50, kbg: 62, fx: 'paint' },
        { f: [1, 3], at: 'hip', x: -62, y: -16, r: 36, dmg: 9, ang: 115, bkb: 50, kbg: 62, fx: 'paint' },
      ],
      anim: [[0, ['land', { armF: 30, wep: 40 }]], [10, 'crouch'], [32, 'idle']],
      sfx: [[1, 'thud']],
    },
    // ---------------------------------------------------------------- ledge / getup
    ledgeatk: {
      frames: 50,
      hits: [
        { f: [17, 20], at: 'wep', r: 20, dmg: 9, ang: 361, bkb: 45, kbg: 45, fx: 'paint' },
        { f: [17, 20], at: 'wepMid', r: 15, dmg: 8, ang: 361, bkb: 45, kbg: 45, fx: 'paint' },
      ],
      anim: [[0, 'climb'], [14, 'swipeWind'], [18, 'swipe'], [26, 'swipe'], [50, 'idle']],
    },
    getupatk: {
      frames: 44,
      hits: [
        { f: [14, 16], at: 'wep', r: 19, dmg: 7, ang: 361, bkb: 50, kbg: 40, fx: 'paint' },
        { f: [22, 24], at: 'tail', r: 20, dmg: 7, ang: 361, bkb: 50, kbg: 40, grp: 1 },
      ],
      anim: [[0, 'lying'], [12, ['dsFront', { lean: 50 }]], [16, 'dsFront'], [22, 'dsBack'], [28, 'dsBack'], [44, 'idle']],
    },
    // ---------------------------------------------------------------- ultimate
    ult: {
      // Masterpiece: a giant canvas drops in over the stage, Smudge paints every floor in one sweep, then flicks
      // three waves of paint off the canvas that home in on every bro (the last one is a gallery-sized splash)
      frames: 84,
      ult: true,
      script: 'smudge:ult',
      anim: [
        [0, 'castUp'],
        [8, ['castUp', { wep: 0 }]],
        [12, ['swingWind', { lean: -16 }]],
        [16, ['swing', { wep: 0 }]],
        [24, 'swingWind'],
        [30, ['swing', { wep: 0 }]],
        [38, ['overheadWind', { wep: 60 }]],
        [46, ['overhead', { wep: 30 }]],
        [62, ['victory', { wep: 0 }]],
        [84, 'idle'],
      ],
      sfx: [[8, 'boom'], [16, 'whiff'], [30, 'whiff'], [46, 'whiff']],
    },
  },
};

// ------------------------------------------------------------------ scripts

/** world x of the brush tip (or roller) this frame */
function tipX(st: State, f: Fighter): number {
  return fighterSkel(st, f, cfOf(f)).wep[0];
}

function paintUnder(st: State, f: Fighter, x: number, w: number, splat: boolean): void {
  if (f.gnd < 0) return;
  paintAt(st, f.gnd, x, f.i, w);
  if (splat) ev(st, 'splat', x, f.y, f.i);
}

/** a solid whose top is buried under another solid (the tapered underside pieces) */
function buried(st: State, i: number): boolean {
  const ss = surfs(st);
  const s = ss[i];
  if (s.soft) return false;
  const cx = (s.x1 + s.x2) / 2;
  for (let j = 0; j < ss.length; j++) {
    const o = ss[j];
    if (j === i || o.soft) continue;
    if (Math.abs(o.y2 - s.y1) < 3 && cx >= o.x1 && cx <= o.x2) return true;
  }
  return false;
}

registerScripts({
  // +15% damage on your own paint (shows as paint splashes on every hit)
  'smudge:mult': (st, f, _m, out) => {
    if (!smudgeOnOwnPaint(st, f)) return;
    out.dmg *= 1.15;
    out.fx = 'paint';
  },
  'smudge:dtilt': (st, f) => {
    if (f.mf === 6) paintUnder(st, f, tipX(st, f) - f.facing * 14, 34, true);
  },
  'smudge:fsmash': (st, f) => {
    if (f.mf === 15) paintUnder(st, f, tipX(st, f), 62, true);
  },
  'smudge:dthrow': (st, f) => {
    if (f.mf === 15) paintUnder(st, f, f.x + f.facing * 30, 64, true);
  },
  'smudge:dash': (st, f) => {
    if (f.mf >= 6 && f.mf <= 24 && f.mf % 2 === 0) paintUnder(st, f, f.x - f.facing * 6, 42, f.mf === 6);
  },
  'smudge:roller': (st, f) => {
    if (f.mf < 11 || f.mf > 48) return;
    paintUnder(st, f, tipX(st, f) - f.facing * 8, 38, f.mf === 11);
  },
  'smudge:rollerLand': (st, f) => {
    if (f.mf !== 1) return;
    paintUnder(st, f, f.x, 115, true);
    ev(st, 'splat', f.x - 70, f.y, f.i);
    ev(st, 'splat', f.x + 70, f.y, f.i);
  },
  'smudge:ult': (st, f) => {
    if (f.mf === 8) {
      // paint every floor in one sweep
      const ss = surfs(st);
      for (let i = 0; i < ss.length; i++) {
        const s = ss[i];
        if (buried(st, i)) continue;
        const cx = (s.x1 + s.x2) / 2;
        paintAt(st, i, cx, f.i, (s.x2 - s.x1) / 2);
        ev(st, 'splat', cx, s.y1, f.i);
        ev(st, 'splat', s.x1 + 40, s.y1, f.i);
        ev(st, 'splat', s.x2 - 40, s.y1, f.i);
      }
      ev(st, 'flash', f.x, f.y, f.i);
      return;
    }
    const wave = f.mf === 16 ? 0 : f.mf === 30 ? 1 : f.mf === 46 ? 2 : -1;
    if (wave < 0) return;
    const cf = cfOf(f);
    const pk = cf.projIdx[wave === 2 ? 'mfinale' : 'mdrop'];
    const [cx, cy] = smudgeCanvas(st);
    let n = 0;
    for (const t of st.fighters) {
      if (t.i === f.i || t.out || t.act === A.DEAD || t.act === A.RESPAWN) continue;
      if (st.cfg.teams && t.team === f.team && !st.cfg.friendlyFire) continue;
      // each drop leaves the canvas from a different spot, aimed at its bro
      const sx = cx + (t.x - cx) * 0.25 + (n % 3) * 70 - 70;
      const sy = cy + 120;
      const dx = t.x - sx;
      const dy = t.y - 60 - sy;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const sp = wave === 2 ? 15 : 17;
      const p = spawnProj(st, f, pk, sx, sy);
      p.vx = (dx / d) * sp;
      p.vy = (dy / d) * sp;
      n++;
    }
    ev(st, 'sfx', cx, cy, f.i, 0, 0, wave === 2 ? 'boom' : 'whiff');
  },
});
