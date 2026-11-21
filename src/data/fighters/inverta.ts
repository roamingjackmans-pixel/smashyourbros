// Inverta — gravity acrobat from the Upside-Down Circus. Harlequin leotard, ruff collar, a tiny top hat worn
// upside-down. Her signature Flip dives THROUGH the stage and pops her out walking on its underside (or flips her
// gravity in mid-air); Polarity Toss flips the gravity of whoever it hits; Topsy-Turvy flips everyone else.
import { A, GROUNDED } from '../../sim/acts';
import { STAGES } from '../../sim/data';
import { ev } from '../../sim/events';
import { bodyH, cfOf, flipGrav, grabRelease, shoot, startMove, surfs } from '../../sim/fighter';
import { spawnProj } from '../../sim/projectiles';
import { registerScripts } from '../../sim/scripts';
import type { Fighter, FighterDef, State } from '../../sim/types';

/** self-flipped and airborne this far above the main stage top: gravity snaps back (a safety net) */
const SAFE_H = 950;
/** Polarity Toss flip time (frames) */
const TOSS_FLIP = 110;
/** Topsy-Turvy: flip time for everyone else, hoop height above the stage, hoop fuse */
const ULT_FLIP = 116;
const HOOP_H = 560;

// f.v slots: [1] frame of the last safety snap (art), [2] frames spent standing on an underside (CPU helper)

export const inverta: FighterDef = {
  id: 'inverta',
  name: 'Inverta',
  title: 'You Turn My World Upside Down',
  role: 'Gravity flip',
  color: '#9b7bff',
  weight: 84,
  rig: { thigh: 25, shin: 25, torso: 33, head: 19, upper: 19, fore: 17, girth: 12, limb: 6 },
  stats: { walk: 9.8, dash: 17.5, run: 16.2, dashFrames: 10, airSpeed: 10.4, airAccel: 0.6, airFric: 0.12, groundFric: 0.85, grav: 0.66, fall: 12, ffall: 19, jump: 22, hop: 14.5, djump: 21, jumps: 1, squat: 3 },
  bio: 'Headliner of the Upside-Down Circus, where the audience sits on the ceiling and the popcorn falls up. Has never once stood the right way round on purpose. Beamed aboard mid-triple-somersault and stuck the landing on the studio ceiling. Thinks every bro deserves a standing ovation, ideally upside down.',
  line: 'Is it hot in here or did I flip the gravity on your heart, bro?',
  taunt: 'Cartwheels, sticks a perfect landing and bows: “Hold your applause. No, don’t. Applaud, bro.”',
  wins: ['Ta-da! Bow to your bro!', 'You fell for me. Upwards. That’s a first, bro.', 'Same time tomorrow? I’ll be on the ceiling, saving you a seat.'],
  moveNames: { nspec: 'Gravity Well', sspec: 'Polarity Toss', uspec: 'Trapeze Swing', dspec: 'Flip', ult: 'Topsy-Turvy' },
  poses: {
    idle: { lean: 4, head: -4, armF: 26, foreF: 62, armB: -24, foreB: 110, legF: 20, shinF: 4, legB: -8, shinB: 18 },
    cartwheel: { rot: 90, lean: 0, head: 0, armF: 175, foreF: 0, armB: 185, foreB: 0, legF: 40, shinF: 0, legB: -40, shinB: 0 },
    splitsHigh: { lean: -14, head: -6, armF: 120, foreF: 10, armB: -110, foreB: 10, legF: 112, shinF: 0, legB: -36, shinB: 6 },
    handstand: { rot: 180, lean: 0, head: 0, armF: 178, foreF: 0, armB: 182, foreB: 0, legF: 4, shinF: 0, legB: -4, shinB: 0 },
    handSplit: { rot: 180, lean: 0, head: 0, armF: 178, foreF: 0, armB: 182, foreB: 0, legF: 82, shinF: 0, legB: -82, shinB: 0 },
    splits: { lean: 16, head: -6, armF: 112, foreF: 0, armB: -112, foreB: 0, legF: 92, shinF: 0, legB: -92, shinB: 0 },
    star: { lean: 0, head: 0, armF: 140, foreF: 0, armB: -140, foreB: 0, legF: 44, shinF: 0, legB: -44, shinB: 0 },
    taDa: { lean: -8, head: -10, armF: 150, foreF: 0, armB: -150, foreB: 0, legF: 16, shinF: 0, legB: -4, shinB: 20 },
    bow: { lean: 52, head: 14, armF: 40, foreF: 30, armB: -70, foreB: 10, legF: 4, shinF: 0, legB: -8, shinB: 4 },
    dive: { rot: 150, lean: 0, head: 0, armF: 178, foreF: 0, armB: 178, foreB: 0, legF: 2, shinF: 0, legB: -2, shinB: 0 },
    hang: { rot: 0, lean: 0, head: -8, armF: 178, foreF: 0, armB: 176, foreB: 0, legF: 6, shinF: 6, legB: -2, shinB: 10 },
    axeUp: { lean: -12, head: -6, armF: 150, foreF: 10, armB: -100, foreB: 20, legF: 172, shinF: 6, legB: -12, shinB: 30 },
    axeDown: { lean: 28, head: 8, armF: 70, foreF: 10, armB: -70, foreB: 20, legF: 58, shinF: 0, legB: -14, shinB: 30 },
    pogo: { lean: 2, head: 6, armF: 164, foreF: 0, armB: 158, foreB: 0, legF: 3, shinF: 0, legB: 1, shinB: 0, sy: 1.08 },
    pogoWind: { lean: 8, head: -6, armF: 150, foreF: 20, armB: 140, foreB: 20, legF: 78, shinF: 125, legB: 66, shinB: 125 },
    dropkick: { rot: -78, lean: 0, head: 14, armF: 150, foreF: 10, armB: 165, foreB: 10, legF: 12, shinF: 0, legB: 2, shinB: 0, y: 48 },
    backbend: { rot: -8, lean: -44, head: -22, armF: -100, foreF: 30, armB: -120, foreB: 30, legF: 34, shinF: 58, legB: -18, shinB: 48, sy: 0.95 },
  },
  base: {
    taunt: [[0, 'idle'], [8, 'cartwheel'], [16, ['cartwheel', { rot: 270 }]], [24, ['taDa', { rot: 360 }]], [34, ['bow', { rot: 360 }]], [50, ['bow', { rot: 360 }]], [60, ['idle', { rot: 360 }]]],
  },
  projs: {
    well: {
      kind: 'gwell',
      r: 22,
      life: 100,
      vx: 4.2,
      drag: 0.975,
      ghost: true,
      pull: 2.3,
      reflectable: false,
      hit: { dmg: 0, ang: 0, bkb: 0, kbg: 0 },
      pulse: { every: 10, r: 62, hit: { dmg: 1.2, ang: 180, bkb: 7, kbg: 0, fx: 'grav', hitlag: 0.4 } },
      fuse: 92,
      explode: { r: 105, hit: { dmg: 9, ang: 80, bkb: 42, kbg: 74, fx: 'grav' } },
    },
    polarity: {
      kind: 'polarity',
      r: 17,
      life: 64,
      vx: 9.5,
      vy: 1.2,
      grav: 0.05,
      drag: 0.995,
      hit: { dmg: 5, ang: 86, bkb: 34, kbg: 22, fx: 'grav', gflip: TOSS_FLIP },
    },
    hoop: {
      kind: 'hoop',
      r: 96,
      life: 120,
      ghost: true,
      pierce: true,
      stick: true,
      reflectable: false,
      hit: { dmg: 0, ang: 0, bkb: 0, kbg: 0 },
      pulse: { every: 7, r: 104, hit: { dmg: 1.8, ang: 90, bkb: 14, kbg: 6, fx: 'grav', hitlag: 0.35, unblockable: true } },
      fuse: 74,
      explode: { r: 250, hit: { dmg: 15, ang: 90, bkb: 22, kbg: 84, fx: 'grav', hitlag: 0.5, unblockable: true } },
    },
  },
  moves: {
    jab1: {
      frames: 17,
      hits: [{ f: [3, 4], at: 'handF', r: 12, dmg: 2.2, ang: 361, bkb: 18, kbg: 25 }],
      next: [{ move: 'jab2', from: 4, to: 15 }],
      anim: [[0, 'jabWind'], [3, ['jab1', { armF: 96 }]], [9, 'jab1'], [17, 'ready']],
    },
    jab2: {
      frames: 17,
      hits: [{ f: [3, 4], at: 'handB', r: 12, dmg: 2, ang: 361, bkb: 18, kbg: 25 }],
      next: [{ move: 'jab3', from: 4, to: 15 }],
      anim: [[0, 'jab1'], [3, 'jab2'], [9, 'jab2'], [17, 'ready']],
    },
    jab3: {
      // a scissor high kick
      frames: 30,
      vel: [{ f: [1, 9], vx: 3 }, { f: [10, 30], vx: 0.5 }],
      hits: [
        { f: [6, 9], at: 'footF', r: 17, dmg: 4.5, ang: 45, bkb: 45, kbg: 90 },
        { f: [6, 9], at: 'kneeF', r: 12, dmg: 4, ang: 45, bkb: 45, kbg: 88 },
      ],
      anim: [[0, 'kickWind'], [4, ['kickHigh', { rot: -6, lean: -10, legF: 100, legB: -30, armF: 90, armB: -120 }]], [7, ['kickHigh', { rot: -10, lean: -22, legB: -40, armF: 120, armB: -140 }]], [13, ['kickHigh', { rot: -6, lean: -18 }]], [30, 'idle']],
    },
    ftilt: {
      // splits kick
      frames: 27,
      hits: [
        { f: [6, 8], at: 'footF', r: 16, dmg: 8.5, ang: 361, bkb: 22, kbg: 92 },
        { f: [6, 8], at: 'kneeF', r: 11, dmg: 7, ang: 361, bkb: 22, kbg: 90 },
      ],
      anim: [[0, ['kickWind', { legF: 80, shinF: 120 }]], [6, ['splitsHigh', { legF: 100 }]], [12, 'splitsHigh'], [27, 'idle']],
    },
    utilt: {
      // a vertical-splits bell kick
      frames: 30,
      hits: [
        { f: [6, 11], at: 'footF', r: 17, dmg: 7, ang: 95, bkb: 26, kbg: 118 },
        { f: [6, 11], at: 'kneeF', r: 12, dmg: 6, ang: 95, bkb: 26, kbg: 112 },
      ],
      anim: [[0, { lean: 12, armF: 40, armB: -30, legF: 40, shinF: 90, legB: -8, shinB: 20 }], [6, { lean: -22, armF: 70, armB: -70, legF: 150, shinF: 0, legB: -4, shinB: 4 }], [10, { lean: -26, head: -10, armF: 90, armB: -90, legF: 188, shinF: 0, legB: -4, shinB: 4 }], [16, { lean: -22, armF: 80, armB: -80, legF: 176, shinF: 6, legB: -4 }], [30, 'idle']],
    },
    dtilt: {
      frames: 22,
      hits: [{ f: [5, 7], at: 'footF', r: 15, dmg: 5.5, ang: 78, bkb: 32, kbg: 70 }],
      anim: [[0, 'crouch'], [5, ['kickLow', { legF: 86, armF: 30 }]], [10, 'kickLow'], [22, 'crouch']],
    },
    dash: {
      // a front handspring that lands heels-first
      frames: 38,
      vel: [{ f: [1, 6], vx: 12 }, { f: [7, 18], vx: 10 }, { f: [19, 38], vx: 2 }],
      hits: [
        { f: [9, 13], at: 'footF', r: 19, dmg: 9, ang: 65, bkb: 55, kbg: 60 },
        { f: [9, 13], at: 'footB', r: 17, dmg: 8, ang: 65, bkb: 52, kbg: 58 },
        { f: [14, 18], at: 'footF', r: 15, dmg: 5, ang: 65, bkb: 40, kbg: 40 },
      ],
      anim: [[0, 'dash'], [4, ['dive', { rot: 80 }]], [8, ['handstand', { legF: 20, legB: -20 }]], [11, ['handstand', { rot: 262, legF: 0, legB: 0, armF: 160, armB: 160 }]], [16, ['star', { rot: 310 }]], [22, ['land', { rot: 360 }]], [38, ['idle', { rot: 360 }]]],
    },
    fsmash: {
      // lean way back like a backflip... then spring forward into a flying double dropkick
      frames: 46,
      charge: 10,
      vel: [{ f: [11, 15], vx: 7 }, { f: [16, 22], vx: 2 }, { f: [23, 46], vx: 0 }],
      hits: [
        { f: [13, 16], at: 'footF', x: 6, r: 22, dmg: 17, ang: 38, bkb: 30, kbg: 101 },
        { f: [13, 16], at: 'footB', x: 6, r: 19, dmg: 15, ang: 38, bkb: 30, kbg: 98 },
        { f: [13, 16], at: 'kneeF', r: 13, dmg: 13, ang: 38, bkb: 30, kbg: 95 },
      ],
      anim: [[0, 'ready'], [7, 'backbend'], [10, ['backbend', { rot: -12, lean: -50 }]], [13, 'dropkick'], [20, 'dropkick'], [30, ['land', { lean: 30 }]], [46, 'idle']],
      sfx: [[13, 'whiff']],
    },
    usmash: {
      // flip into a handstand, legs together like a cannon... then split them wide
      frames: 44,
      charge: 6,
      hits: [
        { f: [9, 12], at: 'footF', r: 24, dmg: 16, ang: 90, bkb: 32, kbg: 98 },
        { f: [9, 12], at: 'footB', r: 22, dmg: 15, ang: 90, bkb: 32, kbg: 96 },
        { f: [9, 12], at: 'kneeF', r: 15, dmg: 13, ang: 88, bkb: 30, kbg: 94 },
        { f: [13, 17], at: 'footB', r: 19, dmg: 13, ang: 82, bkb: 30, kbg: 94 },
        { f: [13, 17], at: 'footF', r: 19, dmg: 13, ang: 98, bkb: 30, kbg: 94 },
      ],
      anim: [[0, 'ready'], [6, 'upSmashWind'], [9, 'handstand'], [12, 'handstand'], [16, 'handSplit'], [24, 'handSplit'], [32, ['tuck', { rot: 290 }]], [44, ['idle', { rot: 360 }]]],
      sfx: [[9, 'whiff']],
    },
    dsmash: {
      // drops into the splits and spins on the floor
      frames: 44,
      charge: 5,
      hits: [
        { f: [7, 9], at: 'footF', r: 19, dmg: 12, ang: 28, bkb: 28, kbg: 96 },
        { f: [7, 9], at: 'kneeF', r: 13, dmg: 10, ang: 28, bkb: 28, kbg: 92 },
        { f: [13, 15], at: 'footF', r: 19, dmg: 14, ang: 152, bkb: 30, kbg: 98, grp: 1 },
        { f: [13, 15], at: 'kneeF', r: 13, dmg: 11, ang: 152, bkb: 30, kbg: 94, grp: 1 },
      ],
      anim: [[0, 'crouch'], [4, { lean: 10, armF: 150, foreF: 0, armB: -150, foreB: 0, legF: 40, shinF: 70, legB: -30, shinB: 60, sy: 0.95 }], [5, { lean: 12, armF: 154, foreF: 0, armB: -154, foreB: 0, legF: 44, shinF: 76, legB: -32, shinB: 64, sy: 0.94 }], [8, 'splits'], [11, ['splits', { legF: 0, legB: 0, lean: 0 }]], [14, ['splits', { legF: -92, legB: 92, lean: -12 }]], [22, ['splits', { legF: -88, legB: 88 }]], [30, 'crouch'], [44, 'idle']],
    },
    nair: {
      // star spin
      frames: 36,
      air: true,
      landLag: 7,
      autoCancel: [3, 30],
      hits: [
        { f: [3, 6], at: 'footF', r: 16, dmg: 8, ang: 361, bkb: 16, kbg: 100 },
        { f: [3, 6], at: 'footB', r: 16, dmg: 8, ang: 361, bkb: 16, kbg: 100 },
        { f: [3, 6], at: 'handF', r: 13, dmg: 7, ang: 361, bkb: 16, kbg: 96 },
        { f: [7, 20], at: 'footF', r: 14, dmg: 5, ang: 361, bkb: 10, kbg: 90 },
        { f: [7, 20], at: 'footB', r: 14, dmg: 5, ang: 361, bkb: 10, kbg: 90 },
      ],
      anim: [[0, 'tuck'], [3, 'star'], [12, ['star', { rot: 180 }]], [21, ['star', { rot: 360 }]], [36, ['fall', { rot: 360 }]]],
    },
    fair: {
      // ribbon axe kick
      frames: 40,
      air: true,
      landLag: 12,
      autoCancel: [3, 34],
      hits: [
        { f: [9, 12], at: 'footF', r: 18, dmg: 12, ang: 45, bkb: 34, kbg: 98 },
        { f: [9, 12], at: 'kneeF', r: 12, dmg: 9, ang: 45, bkb: 30, kbg: 92 },
      ],
      anim: [[0, 'kickWind'], [6, 'axeUp'], [8, ['axeUp', { legF: 178 }]], [11, 'axeDown'], [18, ['axeDown', { legF: 40, lean: 30 }]], [40, 'fall']],
    },
    bair: {
      // mule kick
      frames: 32,
      air: true,
      landLag: 9,
      autoCancel: [3, 26],
      hits: [
        { f: [6, 9], at: 'footB', r: 18, dmg: 12, ang: 361, bkb: 20, kbg: 100 },
        { f: [6, 9], at: 'kneeB', r: 12, dmg: 9, ang: 361, bkb: 20, kbg: 95 },
      ],
      anim: [[0, ['bair', { legB: -40, shinB: 110 }]], [6, ['bair', { armF: 60, armB: 40 }]], [14, 'bair'], [32, 'fall']],
    },
    uair: {
      // scissor somersault
      frames: 32,
      air: true,
      landLag: 8,
      autoCancel: [3, 26],
      hits: [
        { f: [5, 10], at: 'footF', r: 18, dmg: 8.5, ang: 80, bkb: 26, kbg: 110 },
        { f: [5, 10], at: 'footB', r: 15, dmg: 7, ang: 84, bkb: 26, kbg: 105 },
      ],
      anim: [[0, ['uairWind', { rot: 0 }]], [5, ['uair', { rot: -40, legB: -60 }]], [10, ['uair', { rot: -200, legB: -30 }]], [18, ['tuck', { rot: -330 }]], [32, ['fall', { rot: -360 }]]],
    },
    dair: {
      // trampoline pogo stomp
      frames: 42,
      air: true,
      landLag: 16,
      autoCancel: [3, 36],
      vel: [{ f: [1, 10], grav: 0.5 }],
      hits: [
        { f: [13, 15], at: 'footF', r: 17, dmg: 13, ang: 270, bkb: 20, kbg: 85, fx: 'grav' },
        { f: [13, 15], at: 'footB', r: 15, dmg: 13, ang: 270, bkb: 20, kbg: 85, fx: 'grav' },
        { f: [16, 22], at: 'footF', r: 14, dmg: 8, ang: 361, bkb: 20, kbg: 70 },
      ],
      anim: [[0, 'pogoWind'], [11, 'pogoWind'], [13, 'pogo'], [22, 'pogo'], [42, 'fall']],
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
    pummel: { frames: 16, pummel: 1.5, anim: [[0, 'hold'], [4, ['hold', { lean: 20, armB: 100, foreB: 0 }]], [16, 'hold']] },
    fthrow: {
      // twirl and toss
      frames: 30,
      throw: { release: 13, hit: { dmg: 8, ang: 42, bkb: 60, kbg: 64, fx: 'grav' } },
      anim: [[0, 'hold'], [7, ['hold', { rot: -170 }]], [13, ['throwF', { rot: -360 }]], [30, ['idle', { rot: -360 }]]],
    },
    bthrow: {
      // back walkover throw
      frames: 34,
      throw: { release: 15, holdAt: 'handF', hit: { dmg: 11, ang: 138, bkb: 60, kbg: 72 } },
      anim: [[0, 'hold'], [6, ['throwF', { rot: -90 }]], [12, ['throwB', { rot: -200, legF: 60, legB: -50 }]], [16, ['throwB', { rot: -330 }]], [34, ['idle', { rot: -360 }]]],
    },
    uthrow: {
      // into a handstand, launches them with both feet; their gravity flips for a moment
      frames: 36,
      throw: { release: 14, holdAt: 'footF', hx: 0, hy: 12, hit: { dmg: 7, ang: 90, bkb: 70, kbg: 70, fx: 'grav', gflip: 45 } },
      anim: [[0, 'hold'], [6, 'crouch'], [11, ['handstand', { legF: 60, shinF: 90, legB: 40, shinB: 90 }]], [14, 'handstand'], [24, ['tuck', { rot: 290 }]], [36, ['idle', { rot: 360 }]]],
    },
    dthrow: {
      frames: 34,
      throw: { release: 15, hit: { dmg: 6, ang: 72, bkb: 60, kbg: 40 } },
      anim: [[0, 'hold'], [8, ['jump', { armF: 120, armB: 110 }]], [15, ['throwDown', { lean: 60 }]], [24, 'throwDown'], [34, 'idle']],
    },
    nspec: {
      frames: 40,
      script: 'inverta:well',
      anim: [[0, 'castWind'], [9, ['charge', { armF: 80, armB: 70, foreF: 60, foreB: 60 }]], [12, ['cast', { armB: 92, foreB: 0 }]], [26, 'cast'], [40, 'idle']],
      sfx: [[12, 'magic']],
    },
    nspecAir: {
      frames: 40,
      script: 'inverta:well',
      anim: [[0, 'castWind'], [9, ['charge', { armF: 80, armB: 70, foreF: 60, foreB: 60 }]], [12, ['cast', { armB: 92, foreB: 0 }]], [26, 'cast'], [40, 'fall']],
      sfx: [[12, 'magic']],
    },
    sspec: {
      frames: 38,
      script: 'inverta:toss',
      anim: [[0, 'ready'], [8, { lean: -14, armF: -70, foreF: 60, armB: 60, foreB: 40, legF: 30, shinF: 20, legB: -30, shinB: 20 }], [11, ['throwF', { armB: -40 }]], [22, 'throwF'], [38, 'idle']],
      sfx: [[11, 'boing']],
    },
    sspecAir: {
      frames: 38,
      script: 'inverta:toss',
      anim: [[0, 'fall'], [8, { lean: -14, armF: -70, foreF: 60, armB: 60, foreB: 40, legF: 30, shinF: 60, legB: -20, shinB: 60 }], [11, ['throwF', { armB: -40, legF: 30, shinF: 50 }]], [22, ['throwF', { legF: 30, shinF: 50 }]], [38, 'fall']],
      sfx: [[11, 'boing']],
    },
    uspec: {
      // a trapeze bar drops from nowhere; she swings up on it and lets go into a flip
      frames: 46,
      helpless: true,
      landHelpless: 22,
      ledgeFrom: 8,
      reverse: true,
      vel: [{ f: [1, 5], vx: 0, vy: 2, grav: 0 }, { f: [6, 13], vx: 8, vy: 13, grav: 0 }, { f: [14, 26], vx: 3.5, vy: 17, grav: 0 }, { f: [27, 31], vx: 2, vy: 8, grav: 0.3 }, { f: [32, 46], grav: 0.75 }],
      hits: [
        { f: [6, 12], at: 'footF', r: 19, dmg: 7, ang: 72, bkb: 50, kbg: 55, fx: 'grav' },
        { f: [13, 24], at: 'handF', y: 6, r: 20, dmg: 2.2, ang: 88, bkb: 30, kbg: 22, rehit: 5, grp: 1 },
        { f: [26, 29], at: 'footF', r: 21, dmg: 5, ang: 80, bkb: 55, kbg: 82, grp: 2, fx: 'grav' },
      ],
      anim: [[0, 'hang'], [5, ['hang', { rot: -28, legF: -16, legB: -26 }]], [10, ['hang', { rot: 42, legF: 76, shinF: 0, legB: 64, shinB: 0 }]], [16, ['hang', { rot: 16, legF: 24, legB: 14 }]], [22, ['hang', { rot: -24, legF: -10, legB: -22 }]], [27, ['hang', { rot: 34, legF: 70, shinF: 0, legB: 58, shinB: 0 }]], [34, ['tuck', { rot: 360 }]], [46, ['helpless', { rot: 360 }]]],
      sfx: [[6, 'whiff'], [26, 'boing']],
    },
    dspec: {
      // Flip. Air: gravity toggles in place (once per airtime). Ground: script hands over to dspecDive.
      frames: 26,
      oncePerAir: true,
      intang: [1, 6],
      script: 'inverta:flip',
      vel: [{ f: [1, 14], grav: 0.3 }],
      anim: [[0, 'tuck'], [4, ['tuck', { rot: 110 }]], [7, ['tuck', { rot: 180 }]], [8, ['tuck', { rot: 0 }]], [14, ['star', { rot: 0 }]], [26, 'fall']],
    },
    dspecDive: {
      // dives head-first into the floor and pops out of the other side
      frames: 30,
      intang: [1, 16],
      edgeStop: true,
      script: 'inverta:dive',
      vel: [{ f: [1, 30], vx: 0 }],
      anim: [[0, 'ready'], [3, 'crouch'], [6, ['dive', { y: 12 }]], [9, ['handstand', { y: -112 }]], [10, ['hang', { y: -104, head: 0 }]], [17, ['taDa', { y: 0 }]], [30, 'idle']],
    },
    ledgeatk: {
      frames: 48,
      hits: [{ f: [17, 20], at: 'footF', r: 19, dmg: 8, ang: 361, bkb: 45, kbg: 45 }],
      anim: [[0, 'climb'], [12, 'cartwheel'], [17, ['kickHigh', { rot: 50, lean: 0 }]], [24, ['kickHigh', { rot: 20 }]], [48, 'idle']],
    },
    getupatk: {
      frames: 44,
      hits: [
        { f: [14, 16], at: 'footF', r: 18, dmg: 7, ang: 361, bkb: 50, kbg: 40 },
        { f: [22, 24], at: 'footF', r: 18, dmg: 7, ang: 150, bkb: 50, kbg: 40, grp: 1 },
      ],
      anim: [[0, 'lying'], [10, ['splits', { lean: 30 }]], [15, 'splits'], [19, ['splits', { legF: 0, legB: 0 }]], [23, ['splits', { legF: -92, legB: 92 }]], [32, 'crouch'], [44, 'idle']],
    },
    ult: {
      // Topsy-Turvy: the big top drops in, everyone else falls UP into the hoops. She does a handstand, naturally.
      frames: 110,
      ult: true,
      script: 'inverta:ult',
      anim: [[0, 'taDa'], [8, ['taDa', { armF: 175, armB: -175, head: -18 }]], [14, 'handstand'], [60, ['handSplit', { legF: 70, legB: -70 }]], [86, 'handSplit'], [98, ['tuck', { rot: 300 }]], [110, ['idle', { rot: 360 }]]],
      sfx: [[6, 'magic']],
    },
  },
  passive: 'inverta:passive',
};

// ------------------------------------------------------------------ scripts

function countProjs(st: State, f: Fighter, name: string): number {
  const pk = cfOf(f).projIdx[name];
  let n = 0;
  for (const p of st.projs) if (!p.dead && p.o === f.i && p.fd === f.def && p.pk === pk) n++;
  return n;
}

/**
 * Where Flip takes a grounded Inverta: the other face of the solid stack under her feet.
 * Normal gravity: walk DOWN the stacked solids to the lowest exposed underside. Flipped: walk UP to the top.
 * Returns [surface index, y] or null (soft platform, or the far side is outside the blast zone).
 */
function flipTarget(st: State, f: Fighter): [number, number] | null {
  if (f.gnd < 0) return null;
  const ss = surfs(st);
  const s0 = ss[f.gnd];
  if (!s0 || s0.soft) return null;
  const x = f.x;
  let idx = f.gnd;
  let y = f.grav > 0 ? s0.y2 : s0.y1;
  for (let guard = 0; guard < 8; guard++) {
    let next = -1;
    for (let i = 0; i < ss.length; i++) {
      const s = ss[i];
      if (s.soft || i === idx || x < s.x1 || x > s.x2) continue;
      if (f.grav > 0 ? Math.abs(s.y1 - y) < 1.5 : Math.abs(s.y2 - y) < 1.5) {
        next = i;
        break;
      }
    }
    if (next < 0) break;
    idx = next;
    y = f.grav > 0 ? ss[next].y2 : ss[next].y1;
  }
  const b = STAGES[st.stage].blast;
  if (y > b.b - 220 || y < b.t + 220) return null;
  return [idx, y];
}

/**
 * Flip gravity without moving the body: a flipped fighter's box hangs from its feet point, so the feet jump to
 * where the head was. (A plain flipGrav on someone standing on a solid leaves their box inside the floor and the
 * collision shoves them off the edge of the stage.)
 */
function flipInPlace(st: State, t: Fighter): void {
  t.y -= t.grav * bodyH(st, t);
  flipGrav(st, t);
}

function isFoe(st: State, f: Fighter, t: Fighter): boolean {
  if (t.i === f.i || t.out || t.act === A.DEAD || t.act === A.RESPAWN) return false;
  if (st.cfg.teams && t.team === f.team && !st.cfg.friendlyFire) return false;
  return true;
}

registerScripts({
  'inverta:passive': (st, f) => {
    if (f.act === A.DEAD) return;
    // engine workaround: throwsAndPummels re-applies a pummel every time its hitlag runs out (mf is still 4 on that
    // frame), which locks the victim forever. Step past frame 4 on the last hitlag frame.
    if (f.act === A.MOVE && f.hitlag === 1 && f.mf === 4 && cfOf(f).moves[f.mv].pummel) f.mf = 5;
    // safety net: a self-inflicted flip can't carry her into the top blast zone
    if (f.grav < 0 && f.gravT === 0 && f.gnd < 0 && f.act !== A.HITSTUN && f.act !== A.LEDGE && f.hitlag === 0) {
      const top = STAGES[st.stage].solids[0].y1;
      if (f.y < top - SAFE_H) {
        flipInPlace(st, f);
        f.v[1] = st.frame;
        ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'boing');
      }
    }
    // knockback from her hits follows HER gravity (the engine keeps launch angles world-up): mirror throws here,
    // melee hits in inverta:onhit
    if (f.grav < 0 && f.act === A.MOVE) {
      const m = cfOf(f).moves[f.mv];
      if (m.throw && f.mf === m.throw.release) {
        for (const t of st.fighters) {
          if (t !== f && t.lastHitBy === f.i && t.lastHitT <= 1 && t.lSpd > 0 && t.hitlag > 0) t.lAng = -t.lAng;
        }
      }
    }
    // standing on an underside: CPU Inverta comes back up after a while (the bot doesn't know about ceilings)
    if (f.grav < 0 && f.gnd >= 0) f.v[2]++;
    else f.v[2] = 0;
    if (f.cpu > 0 && f.v[2] > 150 && (f.act === A.IDLE || f.act === A.WALK || f.act === A.RUN || f.act === A.DASH)) {
      f.v[2] = 0;
      startMove(st, f, 'dspec');
    }
  },
  'inverta:onhit': (st, f, m, t: Fighter) => {
    void st;
    void m;
    if (f.grav < 0 && t.act === A.HITSTUN && t.lSpd > 0) t.lAng = -t.lAng;
  },
  'inverta:flip': (st, f) => {
    if (f.mf === 1 && f.gnd >= 0) {
      // on the ground: dive through the stage if there is a far side to come out of
      if (flipTarget(st, f)) {
        startMove(st, f, 'dspecDive');
        return;
      }
    }
    if (f.mf === 8) {
      flipInPlace(st, f);
      f.gravT = 0;
      f.act = A.MOVE;
      ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'magic');
    }
  },
  'inverta:dive': (st, f) => {
    if (f.mf === 1) ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'whiff');
    if (f.mf !== 10) return;
    const tgt = flipTarget(st, f);
    flipGrav(st, f);
    f.gravT = 0;
    if (tgt) {
      f.gnd = tgt[0];
      f.y = tgt[1];
      f.vy = 0;
      f.vx = 0;
      f.airUsed = 0;
      f.jumps = cfOf(f).def.stats.jumps;
    }
    ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'magic');
  },
  'inverta:well': (st, f) => {
    if (f.mf !== 12) return;
    if (countProjs(st, f, 'well') >= 1) {
      ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'whiff');
      return;
    }
    shoot(st, f, 'well', 'handF', 26, 0);
  },
  'inverta:toss': (st, f) => {
    if (f.mf !== 11) return;
    if (countProjs(st, f, 'polarity') >= 2) return;
    shoot(st, f, 'polarity', 'handF', 14, 4);
  },
  'inverta:ult': (st, f) => {
    if (f.mf !== 6) return;
    // everyone else falls UP
    for (const t of st.fighters) {
      if (!isFoe(st, f, t)) continue;
      if (t.act === A.GRABBED) continue;
      if (t.act === A.HOLD && t.grabbing >= 0) {
        const v = st.fighters[t.grabbing];
        if (v) grabRelease(st, t, v);
      }
      t.gravT = ULT_FLIP;
      if (t.grav > 0) flipInPlace(st, t);
      if (GROUNDED.has(t.act)) {
        t.act = A.AIR;
        t.af = 0;
        t.jumpKind = 0;
      }
      t.vy = 2.5 * t.grav;
    }
    // ...into a row of circus hoops hanging above the stage
    const main = surfs(st)[0];
    const pk = cfOf(f).projIdx.hoop;
    const w = main.x2 - main.x1;
    const n = w > 1200 ? 5 : 4;
    for (let i = 0; i < n; i++) {
      const x = main.x1 + 150 + ((w - 300) * i) / (n - 1);
      spawnProj(st, f, pk, x, main.y1 - HOOP_H, 0, 0);
    }
    ev(st, 'flash', f.x, f.y, f.i);
  },
});
