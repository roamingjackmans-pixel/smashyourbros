// Granny Grapple — grappler heavy. Retired wrestling legend from the Bingo Hall Dimension: luchador mask, cardigan,
// rolling pin (the weapon bone). Side B is a command grab into a German suplex; the ultimate grabs the nearest bro,
// pours them a cup of tea, climbs a turnbuckle that was definitely not there before, and dives.
// Pin direction (0 up, 90 forward, 180 down, 270 back) = rot + lean + 180 - armF - foreF - wep.
import { A } from '../../sim/acts';
import { bodyW } from '../../sim/fighter';
import { registerScripts } from '../../sim/scripts';
import { STAGES } from '../../sim/data';
import { ev } from '../../sim/events';
import type { FighterDef } from '../../sim/types';

export const granny: FighterDef = {
  id: 'granny',
  name: 'Granny Grapple',
  title: 'Bro-ma',
  role: 'Grappler heavy',
  color: '#e83a5a',
  weight: 118,
  power: 0.93,
  rig: { thigh: 22, shin: 21, torso: 40, head: 22, upper: 23, fore: 21, girth: 23, limb: 9, wep: 34 },
  stats: { walk: 8.2, dash: 15, run: 13.5, dashFrames: 12, airSpeed: 8.8, airAccel: 0.46, airFric: 0.1, groundFric: 0.92, grav: 0.86, fall: 15, ffall: 23.5, jump: 20, hop: 13.6, djump: 19, jumps: 1, squat: 4 },
  bio: 'Thirty-one-time champion of the Bingo Hall Dimension’s Saturday Night Slamboree. Retired to knit. Un-retired the moment she heard there were bros out there who had not been properly hugged. Calls everyone “sweetie”. Means it every time.',
  line: 'Come here, sweetie bro. Granny’s got a hug for you. It’s a piledriver.',
  taunt: 'Whips out her knitting and holds up a tiny scarf that says WORLD’S BEST BRO.',
  wins: ['Eat something, you’re all knees and percent.', 'Biscuits for everyone. Winners and losers. Granny doesn’t play favourites. (You’re my favourite.)', 'Back in my day we suplexed uphill both ways. Now come give Granny a squeeze.'],
  moveNames: { nspec: 'Rolling Pin Toss', sspec: 'Bear Hug', uspec: 'Shawl Lariat', dspec: 'Bingo!', ult: 'Tea Time Takedown' },
  poses: {
    idle: { lean: 14, head: -4, armF: 40, foreF: 84, wep: 50, armB: 34, foreB: 92, legF: 26, shinF: 26, legB: -24, shinB: 22 },
    ready: { lean: 18, armF: 48, foreF: 80, wep: 46, armB: 44, foreB: 86, legF: 32, shinF: 34, legB: -28, shinB: 26 },
    crouch: { lean: 36, head: -10, armF: 50, foreF: 70, wep: 50, armB: 40, foreB: 70, legF: 78, shinF: 115, legB: 15, shinB: 115 },
    shield: { lean: 18, armF: 70, foreF: 104, wep: 40, armB: 64, foreB: 108, legF: 32, shinF: 40, legB: -26, shinB: 30 },
    hold: { lean: 12, armF: 84, foreF: 44, wep: 110, armB: 78, foreB: 44, legF: 26, shinF: 26, legB: -24, shinB: 20 },
    // jabs
    gJabWind: { lean: 10, armF: 40, foreF: 84, wep: 50, armB: 10, foreB: 112, legF: 24, shinF: 22, legB: -24, shinB: 20 },
    gSlap: { lean: 24, armF: 30, foreF: 80, wep: 56, armB: 104, foreB: 4, legF: 34, shinF: 24, legB: -30, shinB: 12 },
    gBonk: { lean: 22, armF: 74, foreF: 2, wep: 4, armB: 40, foreB: 80, legF: 32, shinF: 22, legB: -28, shinB: 14 },
    gHeadWind: { lean: -18, head: -20, armF: 30, foreF: 84, wep: 50, armB: 20, foreB: 84, legF: 22, shinF: 20, legB: -26, shinB: 20 },
    gHeadbutt: { lean: 50, head: 22, armF: -30, foreF: 50, wep: 80, armB: -40, foreB: 40, legF: 54, shinF: 30, legB: -50, shinB: 8 },
    // tilts
    gPinBack: { lean: -8, armF: 160, foreF: 30, wep: 30, armB: 40, foreB: 80, legF: 24, shinF: 22, legB: -26, shinB: 16 },
    gPinMid: { lean: 12, armF: 130, foreF: 0, wep: 0, armB: 20, foreB: 70, legF: 34, shinF: 22, legB: -30, shinB: 12 },
    gPinSwing: { lean: 26, armF: 100, foreF: 0, wep: 0, armB: -20, foreB: 60, legF: 40, shinF: 20, legB: -36, shinB: 8 },
    gUpA: { lean: 14, armF: 70, foreF: 10, wep: 0, armB: 40, foreB: 70, legF: 28, shinF: 26, legB: -24, shinB: 18 },
    gUpB: { lean: 0, armF: 150, foreF: 0, wep: 0, armB: 20, foreB: 70, legF: 16, shinF: 10, legB: -16, shinB: 10 },
    gUpC: { lean: -12, head: -14, armF: 206, foreF: 10, wep: 10, armB: 10, foreB: 70, legF: 16, shinF: 10, legB: -20, shinB: 12 },
    gTrip: { lean: 26, armF: 50, foreF: 70, wep: 50, armB: 30, foreB: 70, legF: 74, shinF: 2, legB: -30, shinB: 96 },
    gDropkick: { rot: -66, head: 16, armF: 140, foreF: 20, wep: 60, armB: 130, foreB: 20, legF: 22, shinF: 0, legB: 14, shinB: 8 },
    // smashes
    gSmashWind: { lean: -24, armF: 182, foreF: 20, wep: 20, armB: 172, foreB: 30, legF: 30, shinF: 36, legB: -36, shinB: 18 },
    gSmashMid: { lean: 10, armF: 136, foreF: 0, wep: 0, armB: 128, foreB: 6, legF: 50, shinF: 40, legB: -48, shinB: 10 },
    gSmashHit: { lean: 40, armF: 92, foreF: 0, wep: -22, armB: 86, foreB: 4, legF: 62, shinF: 50, legB: -56, shinB: 4 },
    gUpSmashWind: { lean: 30, armF: 40, foreF: 20, wep: -20, armB: 34, foreB: 24, legF: 62, shinF: 100, legB: 10, shinB: 100 },
    gUpSmash: { lean: -8, head: -16, armF: 176, foreF: 0, wep: 0, armB: 168, foreB: 4, legF: 6, shinF: 4, legB: -6, shinB: 4, y: 4 },
    gDsF: { lean: 34, armF: 80, foreF: 0, wep: 0, armB: 74, foreB: 6, legF: 72, shinF: 70, legB: -42, shinB: 60 },
    gDsOver: { lean: 20, armF: 186, foreF: 0, wep: 0, armB: 180, foreB: 0, legF: 66, shinF: 66, legB: -40, shinB: 60 },
    gDsB: { lean: 30, head: 12, armF: 290, foreF: 10, wep: 10, armB: 280, foreB: 10, legF: 72, shinF: 70, legB: -42, shinB: 60 },
    // aerials
    gSplash: { rot: 64, lean: 0, head: -40, armF: 180, foreF: 10, wep: 60, armB: 40, foreB: 10, legF: 30, shinF: 20, legB: -30, shinB: 30 },
    gAxeWind: { lean: -12, armF: 184, foreF: 24, wep: 30, armB: 178, foreB: 24, legF: 40, shinF: 80, legB: 10, shinB: 80 },
    gAxe: { lean: 30, armF: 66, foreF: 0, wep: 20, armB: 60, foreB: 0, legF: 40, shinF: 60, legB: -10, shinB: 70 },
    gBairWind: { lean: 20, armF: 40, foreF: 80, wep: 50, armB: 60, foreB: 120, legF: 40, shinF: 70, legB: -10, shinB: 70 },
    gBair: { lean: -14, head: 14, armF: 50, foreF: 60, wep: 50, armB: -84, foreB: 112, legF: 30, shinF: 60, legB: -50, shinB: 30 },
    gUairA: { lean: -4, armF: 76, foreF: 16, wep: 0, armB: -30, foreB: 40, legF: 40, shinF: 80, legB: 10, shinB: 80 },
    gUairB: { lean: -14, armF: 168, foreF: 0, wep: 0, armB: -40, foreB: 40, legF: 40, shinF: 80, legB: 10, shinB: 80 },
    gUairC: { lean: -18, armF: 232, foreF: 10, wep: 10, armB: -40, foreB: 40, legF: 40, shinF: 80, legB: 10, shinB: 80 },
    gKneeWind: { lean: -6, armF: 150, foreF: 30, wep: 40, armB: 150, foreB: 30, legF: 80, shinF: 120, legB: 70, shinB: 120 },
    gKneeDrop: { lean: 0, head: 10, armF: 160, foreF: 20, wep: 50, armB: 150, foreB: 20, legF: 4, shinF: 150, legB: -6, shinB: 150 },
    // grabs and throws
    gNoogie: { lean: 30, head: 26, armF: 80, foreF: 30, wep: 110, armB: 72, foreB: 30, legF: 30, shinF: 26, legB: -26, shinB: 18 },
    gShove: { lean: 36, armF: 108, foreF: 0, wep: 80, armB: 104, foreB: 0, legF: 46, shinF: 18, legB: -40, shinB: 6 },
    gShoulderA: { lean: -10, armF: 170, foreF: 10, wep: 100, armB: 160, foreB: 10, legF: 22, shinF: 20, legB: -22, shinB: 16 },
    gShoulderB: { lean: 46, armF: 250, foreF: 10, wep: 100, armB: 240, foreB: 10, legF: 40, shinF: 30, legB: -30, shinB: 10 },
    gLiftHigh: { lean: -10, head: -12, armF: 176, foreF: 6, wep: 100, armB: 170, foreB: 6, legF: 16, shinF: 12, legB: -16, shinB: 12 },
    gSlamDown: { lean: 50, armF: 60, foreF: 0, wep: 100, armB: 54, foreB: 0, legF: 52, shinF: 90, legB: -10, shinB: 60 },
    // specials
    gTossWind: { lean: -10, armF: 170, foreF: 40, wep: 40, armB: 60, foreB: 60, legF: 24, shinF: 22, legB: -24, shinB: 16 },
    gToss: { lean: 24, armF: 100, foreF: 0, wep: 0, armB: -20, foreB: 50, legF: 36, shinF: 22, legB: -30, shinB: 10 },
    gHugWind: { lean: 6, armF: 126, foreF: 10, wep: 100, armB: 116, foreB: 10, legF: 30, shinF: 30, legB: -28, shinB: 20 },
    gHug: { lean: 30, armF: 90, foreF: 40, wep: 120, armB: 84, foreB: 40, legF: 46, shinF: 24, legB: -40, shinB: 10 },
    gLift: { lean: -10, armF: 96, foreF: 54, wep: 120, armB: 90, foreB: 54, legF: 30, shinF: 40, legB: -24, shinB: 30 },
    gSuplexA: { rot: -55, lean: -10, head: -16, armF: 172, foreF: 14, wep: 120, armB: 166, foreB: 14, legF: -50, shinF: 20, legB: -60, shinB: 20 },
    gSuplexB: { rot: -115, lean: 0, head: -20, armF: 182, foreF: 6, wep: 120, armB: 178, foreB: 6, legF: -100, shinF: 10, legB: -110, shinB: 14 },
    gLariat: { lean: 0, armF: 92, foreF: 0, wep: 100, armB: -92, foreB: 0, legF: 20, shinF: 40, legB: -30, shinB: 50 },
    gLariat2: { lean: 10, armF: 110, foreF: 0, wep: 100, armB: -74, foreB: 0, legF: 26, shinF: 50, legB: -24, shinB: 40 },
    gLariat3: { lean: -10, armF: 74, foreF: 0, wep: 100, armB: -110, foreB: 0, legF: 14, shinF: 30, legB: -36, shinB: 60 },
    gStompWind: { lean: -6, head: -10, armF: 120, foreF: 40, wep: 60, armB: 110, foreB: 40, legF: 92, shinF: 84, legB: -10, shinB: 16, y: 4 },
    gStomp: { lean: 10, armF: 70, foreF: 30, wep: 60, armB: 60, foreB: 30, legF: 20, shinF: 0, legB: -16, shinB: 30 },
    gBingo: { lean: -6, head: -12, armF: 168, foreF: 20, wep: 60, armB: 164, foreB: 20, legF: 20, shinF: 10, legB: -20, shinB: 10 },
    gSlamDive: { rot: 80, head: -30, armF: 160, foreF: 10, wep: 100, armB: 150, foreB: 10, legF: -20, shinF: 20, legB: -30, shinB: 20 },
    gTeaUp: { lean: -4, head: -8, armF: 30, foreF: 80, wep: 60, armB: 118, foreB: 76, legF: 22, shinF: 16, legB: -22, shinB: 14 },
    gTeaPour: { lean: 6, head: 6, armF: 84, foreF: 56, wep: 120, armB: 120, foreB: 30, legF: 26, shinF: 24, legB: -24, shinB: 18 },
    gSquatHold: { lean: 30, armF: 80, foreF: 50, wep: 120, armB: 74, foreB: 50, legF: 74, shinF: 110, legB: 14, shinB: 110 },
    gDive: { rot: 165, head: 10, armF: 178, foreF: 4, wep: 120, armB: 172, foreB: 4, legF: 10, shinF: 30, legB: -20, shinB: 40 },
  },
  base: {
    // knits furiously, then holds up the scarf
    taunt: [
      [0, 'idle'],
      [8, { lean: 16, head: 10, armF: 66, foreF: 112, wep: 60, armB: 60, foreB: 112, legF: 24, shinF: 22, legB: -22, shinB: 18 }],
      [14, { lean: 16, head: 10, armF: 74, foreF: 104, wep: 60, armB: 54, foreB: 118, legF: 24, shinF: 22, legB: -22, shinB: 18 }],
      [20, { lean: 16, head: 10, armF: 66, foreF: 112, wep: 60, armB: 60, foreB: 112, legF: 24, shinF: 22, legB: -22, shinB: 18 }],
      [30, { lean: -6, head: -12, armF: 150, foreF: 20, wep: 60, armB: 146, foreB: 20, legF: 18, shinF: 10, legB: -18, shinB: 10 }],
      [50, { lean: -6, head: -12, armF: 150, foreF: 20, wep: 60, armB: 146, foreB: 20, legF: 18, shinF: 10, legB: -18, shinB: 10 }],
      [60, 'idle'],
    ],
  },
  projs: {
    pin: { kind: 'pin', r: 15, life: 80, vx: 8.5, vy: 9.5, grav: 0.55, hit: { dmg: 8, ang: 45, bkb: 40, kbg: 62, fx: 'hit' } },
    bingo: { kind: 'bingoball', r: 12, life: 50, vx: 6.5, vy: 9, grav: 0.62, bounce: 0.6, hit: { dmg: 4, ang: 70, bkb: 45, kbg: 40, fx: 'hit' } },
  },
  moves: {
    jab1: {
      frames: 18,
      edgeStop: true,
      hits: [{ f: [3, 4], at: 'handB', r: 15, dmg: 3, ang: 361, bkb: 18, kbg: 25 }],
      next: [{ move: 'jab2', from: 4, to: 16 }],
      anim: [[0, 'gJabWind'], [3, 'gSlap'], [9, 'gSlap'], [18, 'idle']],
    },
    jab2: {
      frames: 20,
      edgeStop: true,
      hits: [
        { f: [3, 5], at: 'wep', r: 15, dmg: 3, ang: 361, bkb: 20, kbg: 25 },
        { f: [3, 5], at: 'handF', r: 12, dmg: 3, ang: 361, bkb: 20, kbg: 25 },
      ],
      next: [{ move: 'jab3', from: 5, to: 18 }],
      anim: [[0, 'gSlap'], [3, 'gBonk'], [10, 'gBonk'], [20, 'idle']],
    },
    jab3: {
      frames: 32,
      edgeStop: true,
      hits: [{ f: [7, 9], at: 'head', x: 6, r: 21, dmg: 5.5, ang: 45, bkb: 50, kbg: 90 }],
      anim: [[0, 'gBonk'], [4, 'gHeadWind'], [8, 'gHeadbutt'], [15, 'gHeadbutt'], [32, 'idle']],
      sfx: [[8, 'thud']],
    },
    ftilt: {
      frames: 30,
      edgeStop: true,
      hits: [
        { f: [8, 10], at: 'wep', r: 17, dmg: 11, ang: 361, bkb: 26, kbg: 94 },
        { f: [8, 10], at: 'wepMid', r: 15, dmg: 10, ang: 361, bkb: 25, kbg: 92 },
        { f: [8, 10], at: 'handF', r: 13, dmg: 9, ang: 361, bkb: 24, kbg: 90 },
      ],
      anim: [[0, 'idle'], [5, 'gPinBack'], [7, 'gPinMid', 'lin'], [9, 'gPinSwing'], [16, 'gPinSwing'], [30, 'idle']],
      sfx: [[7, 'whiff']],
    },
    utilt: {
      frames: 32,
      edgeStop: true,
      hits: [
        { f: [7, 12], at: 'wep', r: 18, dmg: 9, ang: 95, bkb: 30, kbg: 110 },
        { f: [7, 12], at: 'handF', r: 15, dmg: 8, ang: 95, bkb: 30, kbg: 106 },
      ],
      anim: [[0, 'idle'], [5, 'gUpA'], [8, 'gUpB', 'lin'], [11, 'gUpC'], [18, 'gUpC'], [32, 'idle']],
      sfx: [[6, 'whiff']],
    },
    dtilt: {
      frames: 26,
      edgeStop: true,
      hits: [
        { f: [7, 9], at: 'footF', r: 17, dmg: 7, ang: 25, bkb: 42, kbg: 58, trip: true },
        { f: [7, 9], at: 'kneeF', r: 13, dmg: 6, ang: 25, bkb: 40, kbg: 56, trip: true },
      ],
      anim: [[0, 'crouch'], [5, ['gTrip', { legF: 40, shinF: 60 }]], [8, 'gTrip'], [14, 'gTrip'], [26, 'crouch']],
      sfx: [[7, 'whiff']],
    },
    dash: {
      frames: 42,
      edgeStop: true,
      vel: [{ f: [1, 6], vx: 15 }, { f: [7, 16], vx: 11 }, { f: [17, 42], vx: 1.5 }],
      hits: [
        { f: [7, 12], at: 'footF', r: 21, dmg: 11.5, ang: 50, bkb: 62, kbg: 62 },
        { f: [7, 12], at: 'footB', r: 18, dmg: 10, ang: 50, bkb: 60, kbg: 60 },
        { f: [13, 20], at: 'footF', r: 16, dmg: 7, ang: 55, bkb: 45, kbg: 50 },
      ],
      anim: [[0, 'dash'], [5, ['gDropkick', { rot: -30, legF: 60, shinF: 80 }]], [8, 'gDropkick'], [22, 'gDropkick'], [30, ['crouch', { rot: 0 }]], [42, 'idle']],
      sfx: [[7, 'whiff'], [24, 'thud']],
    },
    fsmash: {
      frames: 52,
      edgeStop: true,
      charge: 11,
      hits: [
        { f: [15, 17], at: 'wep', r: 24, dmg: 20, ang: 38, bkb: 34, kbg: 100 },
        { f: [15, 17], at: 'wepMid', r: 20, dmg: 17, ang: 38, bkb: 32, kbg: 98 },
        { f: [15, 17], at: 'handF', r: 16, dmg: 15, ang: 40, bkb: 30, kbg: 96 },
        { f: [18, 20], at: 'wep', y: -6, r: 26, dmg: 9, ang: 70, bkb: 40, kbg: 70, fx: 'rock' },
      ],
      anim: [[0, 'idle'], [8, 'gSmashWind'], [13, ['gSmashWind', { lean: -28, armF: 190, armB: 180 }]], [15, 'gSmashMid', 'lin'], [17, 'gSmashHit'], [28, 'gSmashHit'], [52, 'idle']],
      sfx: [[14, 'whiff'], [17, 'thud']],
    },
    usmash: {
      frames: 46,
      edgeStop: true,
      charge: 7,
      hits: [
        { f: [10, 15], at: 'wep', r: 22, dmg: 17, ang: 88, bkb: 32, kbg: 98 },
        { f: [10, 15], at: 'wepMid', r: 19, dmg: 15, ang: 88, bkb: 32, kbg: 96 },
        { f: [10, 15], at: 'handF', r: 16, dmg: 14, ang: 90, bkb: 30, kbg: 95 },
      ],
      anim: [[0, 'idle'], [6, 'gUpSmashWind'], [9, ['gUpSmash', { armF: 120, armB: 112 }], 'lin'], [11, 'gUpSmash'], [20, 'gUpSmash'], [46, 'idle']],
      sfx: [[9, 'whiff']],
    },
    dsmash: {
      frames: 48,
      edgeStop: true,
      charge: 6,
      hits: [
        { f: [8, 10], at: 'wep', r: 19, dmg: 14, ang: 30, bkb: 30, kbg: 96 },
        { f: [8, 10], at: 'handF', r: 15, dmg: 12, ang: 30, bkb: 30, kbg: 94 },
        { f: [16, 18], at: 'wep', r: 19, dmg: 15, ang: 150, bkb: 30, kbg: 98, grp: 1 },
        { f: [16, 18], at: 'handF', r: 15, dmg: 13, ang: 150, bkb: 30, kbg: 96, grp: 1 },
      ],
      anim: [[0, 'crouch'], [6, ['gDsF', { armF: 150, armB: 144 }]], [9, 'gDsF'], [12, 'gDsF'], [14, 'gDsOver', 'lin'], [17, 'gDsB'], [28, 'gDsB'], [48, 'idle']],
      sfx: [[7, 'whiff'], [15, 'whiff']],
    },
    nair: {
      frames: 38,
      air: true,
      landLag: 9,
      autoCancel: [3, 32],
      hits: [
        { f: [5, 8], at: 'neck', r: 28, dmg: 10.5, ang: 361, bkb: 20, kbg: 96 },
        { f: [5, 8], at: 'hip', r: 28, dmg: 10.5, ang: 361, bkb: 20, kbg: 96 },
        { f: [9, 20], at: 'neck', r: 24, dmg: 6.5, ang: 361, bkb: 14, kbg: 88 },
        { f: [9, 20], at: 'hip', r: 24, dmg: 6.5, ang: 361, bkb: 14, kbg: 88 },
      ],
      anim: [[0, 'tuck'], [4, 'gSplash'], [20, 'gSplash'], [38, 'fall']],
    },
    fair: {
      frames: 42,
      air: true,
      landLag: 13,
      autoCancel: [3, 36],
      hits: [
        { f: [10, 13], at: 'handF', r: 20, dmg: 13.5, ang: 40, bkb: 34, kbg: 96 },
        { f: [10, 13], at: 'handB', r: 18, dmg: 12.5, ang: 40, bkb: 32, kbg: 94 },
      ],
      anim: [[0, 'fall'], [6, 'gAxeWind'], [9, 'gAxeWind'], [12, 'gAxe'], [22, 'gAxe'], [42, 'fall']],
      sfx: [[10, 'whiff']],
    },
    bair: {
      frames: 34,
      air: true,
      landLag: 10,
      autoCancel: [3, 28],
      hits: [
        { f: [7, 10], at: 'elbowB', r: 21, dmg: 13, ang: 145, bkb: 22, kbg: 100 },
        { f: [7, 10], at: 'hip', x: -22, y: 4, r: 22, dmg: 11, ang: 145, bkb: 22, kbg: 96 },
      ],
      anim: [[0, 'fall'], [4, 'gBairWind'], [8, 'gBair'], [16, 'gBair'], [34, 'fall']],
      sfx: [[7, 'whiff']],
    },
    uair: {
      frames: 34,
      air: true,
      landLag: 9,
      autoCancel: [3, 28],
      hits: [
        { f: [6, 11], at: 'wep', r: 18, dmg: 9.5, ang: 85, bkb: 26, kbg: 108 },
        { f: [6, 11], at: 'handF', r: 15, dmg: 8.5, ang: 85, bkb: 26, kbg: 104 },
      ],
      anim: [[0, 'fall'], [4, 'gUairA'], [8, 'gUairB', 'lin'], [11, 'gUairC'], [18, 'gUairC'], [34, 'fall']],
      sfx: [[5, 'whiff']],
    },
    dair: {
      frames: 44,
      air: true,
      landLag: 17,
      autoCancel: [3, 38],
      hits: [
        { f: [12, 15], at: 'kneeF', r: 20, dmg: 14, ang: 270, bkb: 24, kbg: 86 },
        { f: [12, 15], at: 'kneeB', r: 18, dmg: 13, ang: 270, bkb: 24, kbg: 86 },
        { f: [16, 24], at: 'kneeF', r: 16, dmg: 8, ang: 361, bkb: 20, kbg: 70 },
      ],
      anim: [[0, 'fall'], [7, 'gKneeWind'], [11, 'gKneeWind'], [13, 'gKneeDrop'], [26, 'gKneeDrop'], [44, 'fall']],
    },
    grab: {
      frames: 32,
      edgeStop: true,
      hits: [{ f: [7, 9], at: 'handF', x: 4, r: 20, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'ready'], [4, ['gHugWind', { lean: 20 }]], [7, ['grab', { wep: 120 }]], [14, ['grab', { wep: 120 }]], [32, 'idle']],
    },
    dashgrab: {
      frames: 40,
      edgeStop: true,
      vel: [{ f: [1, 10], vx: 9 }, { f: [11, 40], vx: 1 }],
      hits: [{ f: [9, 12], at: 'handF', x: 4, r: 21, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'dash'], [9, ['grab', { wep: 120 }]], [18, ['grab', { wep: 120 }]], [40, 'idle']],
    },
    pummel: { frames: 18, pummel: 1.6, anim: [[0, 'hold'], [4, 'gNoogie'], [18, 'hold']], sfx: [[4, 'thud']] },
    fthrow: {
      frames: 32,
      throw: { release: 11, hit: { dmg: 10, ang: 40, bkb: 66, kbg: 64 } },
      anim: [[0, 'hold'], [7, ['hold', { lean: -6 }]], [11, 'gShove'], [20, 'gShove'], [32, 'idle']],
    },
    bthrow: {
      frames: 38,
      throw: { release: 15, hit: { dmg: 11, ang: 135, bkb: 64, kbg: 76 } },
      anim: [[0, 'hold'], [7, 'gShoulderA'], [15, 'gShoulderB'], [24, 'gShoulderB'], [38, 'idle']],
      sfx: [[15, 'thud']],
    },
    uthrow: {
      frames: 40,
      throw: { release: 11, hit: { dmg: 7, ang: 90, bkb: 72, kbg: 68 } },
      hits: [{ f: [16, 19], at: 'wep', r: 22, dmg: 4, ang: 90, bkb: 45, kbg: 40 }],
      anim: [[0, 'hold'], [6, 'crouch'], [11, 'gLiftHigh'], [14, 'gUpSmashWind'], [17, 'gUpSmash'], [26, 'gUpSmash'], [40, 'idle']],
    },
    dthrow: {
      frames: 40,
      throw: { release: 17, hy: 8, hit: { dmg: 7, ang: 82, bkb: 62, kbg: 38 } },
      anim: [[0, 'hold'], [8, 'gLiftHigh'], [17, 'gSlamDown'], [26, 'gSlamDown'], [40, 'idle']],
      sfx: [[17, 'thud']],
    },
    nspec: {
      frames: 38,
      edgeStop: true,
      shots: [{ f: 12, proj: 'pin', at: 'handF', y: 6 }],
      anim: [[0, 'idle'], [7, 'gTossWind'], [10, 'gTossWind'], [12, 'gToss'], [22, 'gToss'], [38, 'idle']],
      sfx: [[11, 'whiff']],
    },
    nspecAir: {
      frames: 38,
      shots: [{ f: 12, proj: 'pin', at: 'handF', y: 6 }],
      anim: [[0, 'fall'], [7, 'gTossWind'], [10, 'gTossWind'], [12, 'gToss'], [22, 'gToss'], [38, 'fall']],
      sfx: [[11, 'whiff']],
    },
    sspec: {
      frames: 46,
      turn: true,
      edgeStop: true,
      cmdGrab: 'sspecThrow',
      vel: [{ f: [1, 5], vx: 2 }, { f: [6, 16], vx: 11 }, { f: [17, 46], vx: 1 }],
      hits: [
        { f: [8, 16], at: 'handF', r: 22, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 },
        { f: [8, 16], at: 'torso', x: 26, y: 30, r: 24, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 },
      ],
      anim: [[0, 'idle'], [6, 'gHugWind'], [10, 'gHug'], [18, 'gHug'], [30, ['gHug', { lean: 10, armF: 60, armB: 56 }]], [46, 'idle']],
      sfx: [[7, 'dash']],
    },
    sspecAir: {
      frames: 46,
      turn: true,
      oncePerAir: true,
      cmdGrab: 'sspecThrow',
      vel: [{ f: [1, 5], vx: 1, vy: 2, grav: 0.3 }, { f: [6, 16], vx: 10, vy: 0, grav: 0 }, { f: [17, 46], vx: 2, grav: 0.8 }],
      hits: [
        { f: [8, 16], at: 'handF', r: 22, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 },
        { f: [8, 16], at: 'torso', x: 26, y: 30, r: 24, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 },
      ],
      anim: [[0, 'fall'], [6, 'gHugWind'], [10, 'gHug'], [18, 'gHug'], [46, 'fall']],
      sfx: [[7, 'dash']],
    },
    sspecThrow: {
      frames: 54,
      throw: { release: 26, holdAt: 'handF', hx: 4, hy: 20, hit: { dmg: 14, ang: 122, bkb: 74, kbg: 70, fx: 'hit' } },
      hits: [{ f: [26, 26], at: 'handF', y: -20, r: 48, dmg: 6, ang: 110, bkb: 55, kbg: 50, fx: 'rock' }],
      anim: [[0, 'gHug'], [9, 'gLift'], [17, 'gSuplexA', 'lin'], [25, 'gSuplexB'], [38, 'gSuplexB'], [46, ['crouch', { rot: 0 }]], [54, 'idle']],
      sfx: [[9, 'grab'], [26, 'boom']],
    },
    uspec: {
      frames: 50,
      helpless: true,
      landHelpless: 24,
      ledgeFrom: 10,
      reverse: true,
      vel: [{ f: [1, 4], vx: 0, vy: 0, grav: 0.2 }, { f: [5, 27], vx: 3.5, vy: 16.5, grav: 0 }, { f: [28, 50], grav: 0.75 }],
      hits: [
        { f: [5, 26], at: 'handF', r: 22, dmg: 2.5, ang: 80, bkb: 35, kbg: 20, rehit: 4 },
        { f: [5, 26], at: 'handB', r: 22, dmg: 2.5, ang: 80, bkb: 35, kbg: 20, rehit: 4 },
        { f: [27, 29], at: 'handF', r: 27, dmg: 7, ang: 75, bkb: 66, kbg: 86, grp: 1 },
        { f: [27, 29], at: 'handB', r: 27, dmg: 7, ang: 105, bkb: 66, kbg: 86, grp: 1 },
      ],
      anim: [
        [0, 'crouch'], [4, 'gLariat'], [8, 'gLariat2', 'io'], [12, 'gLariat3', 'io'], [16, 'gLariat2', 'io'], [20, 'gLariat3', 'io'], [24, 'gLariat2', 'io'], [28, 'gLariat'], [36, 'gBingo'], [50, 'helpless'],
      ],
      sfx: [[5, 'whiff'], [11, 'whiff'], [17, 'whiff'], [23, 'whiff'], [27, 'thud']],
    },
    dspec: {
      frames: 46,
      edgeStop: true,
      hits: [
        { f: [12, 15], at: 'hip', x: 56, y: -10, r: 36, dmg: 11, ang: 70, bkb: 55, kbg: 64, fx: 'rock' },
        { f: [12, 15], at: 'hip', x: -56, y: -10, r: 36, dmg: 11, ang: 110, bkb: 55, kbg: 64, fx: 'rock' },
      ],
      shots: [{ f: 12, proj: 'bingo', at: 'hip', x: 30, y: 24 }, { f: 12, proj: 'bingo', at: 'hip', x: -30, y: 24, vx: -6.5 }],
      anim: [[0, 'idle'], [7, 'gStompWind'], [12, 'gStomp'], [16, 'gStomp'], [22, 'gBingo'], [34, 'gBingo'], [46, 'idle']],
      sfx: [[12, 'thud']],
    },
    dspecAir: {
      frames: 80,
      landInto: 'dspecLand',
      vel: [{ f: [1, 8], vx: 0, vy: 5, grav: 0 }, { f: [9, 80], vx: 0, vy: -22, grav: 0, noDrift: true }],
      hits: [{ f: [9, 80], at: 'torso', y: 10, r: 30, dmg: 9, ang: 270, bkb: 30, kbg: 60, only: 'air' }],
      anim: [[0, 'tuck'], [8, 'gBingo'], [12, 'gSlamDive'], [80, 'gSlamDive']],
      sfx: [[9, 'whiff']],
    },
    dspecLand: {
      frames: 36,
      edgeStop: true,
      hits: [
        { f: [1, 3], at: 'hip', x: 58, y: -20, r: 38, dmg: 10, ang: 65, bkb: 52, kbg: 62, fx: 'rock' },
        { f: [1, 3], at: 'hip', x: -58, y: -20, r: 38, dmg: 10, ang: 115, bkb: 52, kbg: 62, fx: 'rock' },
      ],
      shots: [{ f: 1, proj: 'bingo', at: 'hip', x: 30, y: 24 }, { f: 1, proj: 'bingo', at: 'hip', x: -30, y: 24, vx: -6.5 }],
      anim: [[0, 'land'], [8, 'crouch'], [14, 'gBingo'], [24, 'gBingo'], [36, 'idle']],
      sfx: [[1, 'boom']],
    },
    ledgeatk: {
      frames: 50,
      hits: [
        { f: [18, 21], at: 'wep', r: 18, dmg: 9, ang: 361, bkb: 45, kbg: 45 },
        { f: [18, 21], at: 'handF', r: 14, dmg: 8, ang: 361, bkb: 45, kbg: 45 },
      ],
      anim: [[0, 'climb'], [14, 'gPinBack'], [17, 'gPinMid', 'lin'], [19, 'gPinSwing'], [28, 'gPinSwing'], [50, 'idle']],
    },
    getupatk: {
      frames: 44,
      hits: [
        { f: [14, 16], at: 'wep', r: 18, dmg: 7, ang: 361, bkb: 50, kbg: 40 },
        { f: [22, 24], at: 'wep', r: 18, dmg: 7, ang: 150, bkb: 50, kbg: 40, grp: 1 },
      ],
      anim: [[0, 'lying'], [10, ['gDsF', { armF: 150, armB: 144 }]], [15, 'gDsF'], [19, 'gDsOver', 'lin'], [23, 'gDsB'], [30, 'gDsB'], [44, 'idle']],
    },
    ult: {
      frames: 44,
      ult: true,
      edgeStop: true,
      script: 'granny:ult',
      cmdGrab: 'ultTea',
      hits: [
        { f: [4, 24], at: 'handF', r: 34, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 },
        { f: [4, 24], at: 'torso', x: 30, y: 30, r: 34, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 },
      ],
      anim: [[0, 'gTeaUp'], [3, 'gHugWind'], [7, 'gHug'], [24, 'gHug'], [30, 'gTeaUp'], [40, 'gTeaUp'], [44, 'idle']],
      sfx: [[3, 'dash'], [13, 'dash'], [30, 'eat']],
    },
    ultTea: {
      frames: 130,
      intang: [1, 130],
      edgeStop: true,
      landInto: 'ultDrop',
      script: 'granny:tea',
      throw: { release: 128, holdAt: 'handF', hx: 6, hy: 12, hit: { dmg: 26, ang: 80, bkb: 85, kbg: 88, fx: 'hit' } },
      vel: [
        { f: [1, 55], vx: 0, vy: 0, grav: 0 },
        { f: [56, 70], vx: 0, vy: 24, grav: 0 },
        { f: [71, 80], vx: 0, vy: 1, grav: 0 },
        { f: [81, 130], vx: 0, vy: -30, grav: 0, noDrift: true },
      ],
      anim: [
        [0, 'gHug'], [8, 'gLift'], [14, 'gTeaPour'], [44, 'gTeaPour'], [50, 'gSquatHold'], [55, 'gSquatHold'], [60, 'gLiftHigh'], [72, 'gLiftHigh'],
        [82, ['gDive', { rot: 120 }], 'io'], [88, 'gDive'], [130, 'gDive'],
      ],
      sfx: [[14, 'eat'], [56, 'jump'], [81, 'whiff']],
    },
    ultDrop: {
      frames: 46,
      intang: [1, 20],
      throw: { release: 1, holdAt: 'handF', hx: 6, hy: 12, hit: { dmg: 26, ang: 80, bkb: 85, kbg: 88, fx: 'hit' } },
      hits: [{ f: [1, 1], at: 'hip', r: 120, dmg: 9, ang: 70, bkb: 60, kbg: 62, fx: 'rock' }],
      anim: [[0, ['gDive', { rot: 150 }]], [5, ['land', { rot: 0 }]], [14, 'gBingo'], [34, 'gBingo'], [46, 'idle']],
      sfx: [[1, 'boom']],
    },
  },
};

registerScripts({
  // Tea Time Takedown: Granny appears beside the nearest bro (on the side toward the stage centre) and hugs them
  'granny:ult': (st, f) => {
    // (again a moment later, in case they dodged: she follows them)
    if (f.mf !== 3 && f.mf !== 13) return;
    const stg = STAGES[st.stage];
    const s = stg.solids[0];
    let best = -1;
    let bd = 1e12;
    for (const t of st.fighters) {
      if (t.i === f.i || t.out || t.act === A.DEAD || t.act === A.RESPAWN || t.act === A.LEDGE) continue;
      if (st.cfg.teams && t.team === f.team) continue;
      if (t.gnd < 0 && (t.x < s.x1 || t.x > s.x2)) continue; // nobody off-stage: Granny does not dive into pits
      const dx = t.x - f.x;
      const dy = t.y - f.y;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = t.i;
      }
    }
    if (best < 0) return;
    const t = st.fighters[best];
    const cx = (s.x1 + s.x2) / 2;
    const side = t.x > cx ? -1 : 1;
    ev(st, 'buff', f.x, f.y, f.i);
    f.facing = -side;
    f.x = t.x + side * (bodyW(st, f) + bodyW(st, t)) * 0.75;
    f.y = t.y;
    f.gnd = t.gnd;
    f.vx = 0;
    f.vy = 0;
    ev(st, 'buff', f.x, f.y, f.i);
  },
  // remember where the turnbuckle goes (drawn by the art)
  'granny:tea': (st, f) => {
    if (f.mf === 44) {
      // (only when she is standing on something: the post needs a floor)
      f.v[0] = f.x - f.facing * 46;
      f.v[1] = f.y;
      f.v[2] = f.gnd >= 0 ? 1 : 0;
    }
    if (f.mf === 56) ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'boing');
    // the dive goes through soft platforms down to the main stage (when there is main stage underneath)
    const s = STAGES[st.stage].solids[0];
    if (f.mf >= 81 && f.x > s.x1 && f.x < s.x2) f.dropT = Math.max(f.dropT, 2);
  },
});
