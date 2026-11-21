// Stagehand Bot — the show's crew robot and a story-mode grunt. Small, light, boxy, earnest. A wrench, a roll of
// gaffer tape, a dolly, spring boots, sandbags, and (once a season) the whole lighting rig.
import { ev } from '../../sim/events';
import { POSES } from '../../sim/poses';
import { cfOf } from '../../sim/fighter';
import { spawnProj } from '../../sim/projectiles';
import { registerScripts } from '../../sim/scripts';
import { STAGES } from '../../sim/data';
import type { FighterDef } from '../../sim/types';

export const stagehand: FighterDef = {
  id: 'stagehand',
  name: 'Stagehand Bot',
  title: 'Crew Member of the Week',
  role: 'Story grunt',
  color: '#9aa3b5',
  weight: 78,
  hidden: true,
  rig: { thigh: 14, shin: 14, torso: 26, head: 20, upper: 14, fore: 14, girth: 16, limb: 6, wep: 26 },
  stats: { walk: 9, dash: 16, run: 14.5, dashFrames: 11, airSpeed: 9, airAccel: 0.5, airFric: 0.12, groundFric: 0.9, grav: 0.85, fall: 14, ffall: 21, jump: 19.5, hop: 13, djump: 18, jumps: 1, squat: 3 },
  bio: 'Unit SB-07 of the Studio Starship crew. Moves sets, tapes cables, holds the boom mic, and fights contestants when the producer says so. Has a framed photo of every contestant it ever lost to. It is a very big wall.',
  line: 'Copy that, bro. Moving you to stage left. (That’s off the stage.)',
  taunt: 'Checks a clipboard, gives you a thumbs-up, beeps happily.',
  wins: ['Scene change complete. Great work out there, bro!', 'BEEP BOOP. Translation: you were awesome, please sign my clipboard.', 'Striking the set. Not you. Okay, a little you.'],
  moveNames: { nspec: 'Gaffer Tape', sspec: 'Dolly Dash', uspec: 'Spring Boots', dspec: 'Sandbag', ult: 'Lights Out!' },
  projs: {
    tape: { kind: 'shTape', r: 12, life: 80, vx: 7.5, vy: 5, grav: 0.55, roll: true, hit: { dmg: 4.5, ang: 50, bkb: 30, kbg: 50 } },
    sandbag: { kind: 'shSandbag', r: 18, life: 70, vy: 0, grav: 1.1, reflectable: false, hit: { dmg: 7, ang: 60, bkb: 40, kbg: 60, fx: 'rock' } },
    lamp: { kind: 'shLamp', r: 30, life: 90, vy: -2, grav: 1.25, reflectable: false, hit: { dmg: 8, ang: 70, bkb: 48, kbg: 70, fx: 'fire', unblockable: true } },
  },
  poses: {
    hurt: { ...POSES.hurt, wep: 0 },
    hurtBig: { ...POSES.hurtBig, wep: 0 },
    airdodge: { ...POSES.airdodge, wep: 0 },
    ledge: { ...POSES.ledge, wep: 0 },
    helpless: { ...POSES.helpless, wep: 0 },
    grabbed: { ...POSES.grabbed, wep: 0 },
    fall: { lean: 2, armF: 80, foreF: 30, armB: -70, foreB: 30, legF: 22, shinF: 32, legB: -16, shinB: 42, wep: 40 },
    jump: { lean: 4, armF: 120, foreF: 10, armB: -60, foreB: 20, legF: 42, shinF: 62, legB: -12, shinB: 42, wep: 10, sy: 1.08, sx: 0.95 },
    idle: { lean: 2, armF: 18, foreF: 50, armB: -12, foreB: 30, legF: 8, shinF: 8, legB: -8, shinB: 8, wep: 110 },
    dolly: { lean: 30, head: -6, armF: 80, foreF: 10, armB: 70, foreB: 10, legF: 20, shinF: 40, legB: -40, shinB: 30, wep: 60, y: 10 },
    spring: { lean: -4, armF: 150, foreF: 10, armB: 140, foreB: 10, legF: 4, shinF: 0, legB: -4, shinB: 0, wep: 0, sy: 1.1 },
  },
  base: {
    taunt: [[0, 'idle'], [8, { lean: 0, head: -12, armF: 36, foreF: 84, armB: -20, foreB: 40, wep: 150, legF: 10, shinF: 8, legB: -10, shinB: 8 }], [16, { lean: 0, head: -12, armF: 36, foreF: 84, armB: -20, foreB: 40, wep: 150, legF: 10, shinF: 30, legB: -10, shinB: 30, y: 8 }], [24, { lean: 0, head: -12, armF: 36, foreF: 84, armB: -20, foreB: 40, wep: 150, legF: 10, shinF: 8, legB: -10, shinB: 8 }], [32, { lean: 0, head: -12, armF: 36, foreF: 84, armB: -20, foreB: 40, wep: 150, legF: 10, shinF: 30, legB: -10, shinB: 30, y: 8 }], [40, { lean: 0, head: -6, armF: 36, foreF: 84, armB: -20, foreB: 40, wep: 150, legF: 10, shinF: 8, legB: -10, shinB: 8 }], [60, 'idle']],
    idle: [[0, 'idle'], [20, ['idle', { head: 6, armF: 24 }], 'io'], [40, 'idle', 'io']],
  },
  moves: {
    jab1: {
      frames: 18,
      hits: [{ f: [3, 4], at: 'wep', r: 12, dmg: 2, ang: 361, bkb: 18, kbg: 25 }],
      next: [{ move: 'jab2', from: 4, to: 16 }],
      anim: [[0, ['jabWind', { wep: 90 }]], [3, ['jab1', { wep: 30 }]], [10, ['jab1', { wep: 30 }]], [18, 'idle']],
    },
    jab2: {
      frames: 18,
      hits: [{ f: [3, 4], at: 'handB', r: 12, dmg: 2, ang: 361, bkb: 18, kbg: 25 }],
      next: [{ move: 'jab3', from: 4, to: 16 }],
      anim: [[0, ['jab1', { wep: 30 }]], [3, ['jab2', { wep: 80 }]], [10, ['jab2', { wep: 80 }]], [18, 'idle']],
    },
    jab3: {
      frames: 28,
      hits: [{ f: [6, 8], at: 'wep', r: 15, dmg: 4, ang: 45, bkb: 42, kbg: 85, fx: 'rock' }],
      anim: [[0, 'swingWind'], [6, 'swing'], [12, 'swing'], [28, 'idle']],
    },
    ftilt: {
      frames: 28,
      hits: [
        { f: [7, 9], at: 'wep', r: 15, dmg: 7, ang: 361, bkb: 20, kbg: 88 },
        { f: [7, 9], at: 'handF', r: 11, dmg: 6, ang: 361, bkb: 20, kbg: 85 },
      ],
      anim: [[0, 'swingWind'], [7, ['swing', { lean: 26 }]], [13, 'swing'], [28, 'idle']],
    },
    utilt: {
      frames: 28,
      hits: [{ f: [6, 11], at: 'wep', r: 15, dmg: 6, ang: 94, bkb: 26, kbg: 112 }],
      anim: [[0, 'swingUpWind'], [6, ['swingUp', { armF: 130 }]], [9, 'swingUp'], [12, ['swingUp', { armF: 200 }]], [28, 'idle']],
    },
    dtilt: {
      frames: 22,
      hits: [{ f: [5, 7], at: 'wep', r: 14, dmg: 5, ang: 72, bkb: 30, kbg: 66 }],
      anim: [[0, 'crouch'], [5, 'swingLow'], [10, 'swingLow'], [22, 'crouch']],
    },
    dash: {
      frames: 34,
      vel: [{ f: [1, 4], vx: 12 }, { f: [5, 16], vx: 10 }, { f: [17, 34], vx: 2 }],
      hits: [{ f: [5, 12], at: 'neck', x: 8, r: 22, dmg: 8, ang: 60, bkb: 52, kbg: 56 }],
      anim: [[0, 'dash'], [5, 'dolly'], [16, 'dolly'], [34, 'idle']],
    },
    fsmash: {
      frames: 46,
      charge: 9,
      hits: [
        { f: [14, 16], at: 'wep', r: 19, dmg: 14, ang: 361, bkb: 30, kbg: 96, fx: 'rock' },
        { f: [14, 16], at: 'handF', r: 13, dmg: 11, ang: 361, bkb: 28, kbg: 92 },
      ],
      anim: [[0, 'ready'], [9, ['overheadWind', { wep: 40 }]], [13, ['overheadWind', { wep: 50, lean: -28 }]], [15, ['overhead', { wep: 0 }]], [24, ['overhead', { wep: 0 }]], [46, 'idle']],
      sfx: [[14, 'clank']],
    },
    usmash: {
      frames: 42,
      charge: 6,
      hits: [{ f: [9, 14], at: 'wep', r: 19, dmg: 12, ang: 90, bkb: 30, kbg: 96, fx: 'rock' }],
      anim: [[0, 'ready'], [6, ['upSmashWind', { wep: 60 }]], [10, ['upSmash', { wep: 0 }]], [18, ['upSmash', { wep: 0 }]], [42, 'idle']],
    },
    dsmash: {
      frames: 42,
      charge: 5,
      hits: [
        { f: [8, 9], at: 'wep', r: 16, dmg: 10, ang: 30, bkb: 30, kbg: 92 },
        { f: [15, 16], at: 'wep', r: 16, dmg: 10, ang: 30, bkb: 30, kbg: 92, grp: 1, away: true },
      ],
      anim: [[0, 'crouch'], [6, ['swingWind', { lean: 20 }]], [9, 'swingLow'], [12, ['swingLow', { armF: 0 }]], [16, ['swingLow', { armF: -110, lean: 30 }]], [24, ['swingLow', { armF: -110, lean: 30 }]], [42, 'idle']],
    },
    nair: {
      frames: 34,
      air: true,
      landLag: 7,
      autoCancel: [3, 28],
      hits: [
        { f: [4, 7], at: 'wep', r: 15, dmg: 7, ang: 361, bkb: 16, kbg: 96 },
        { f: [8, 18], at: 'wep', r: 13, dmg: 4.5, ang: 361, bkb: 10, kbg: 86 },
      ],
      anim: [[0, ['spin', { rot: 0, wep: 0 }]], [4, ['spin', { rot: 30, wep: 0 }]], [18, ['spin', { rot: 390, wep: 0 }], 'lin'], [34, ['fall', { rot: 360 }]]],
    },
    fair: {
      frames: 38,
      air: true,
      landLag: 11,
      autoCancel: [3, 32],
      hits: [{ f: [10, 13], at: 'wep', r: 16, dmg: 9, ang: 40, bkb: 32, kbg: 92 }],
      anim: [[0, ['overheadWind', { wep: 40 }]], [9, ['overheadWind', { wep: 50, lean: -24 }]], [11, ['overhead', { wep: 0 }]], [18, ['overhead', { wep: 0 }]], [38, 'fall']],
    },
    bair: {
      frames: 32,
      air: true,
      landLag: 9,
      autoCancel: [3, 26],
      hits: [{ f: [6, 9], at: 'footB', r: 15, dmg: 9, ang: 361, bkb: 20, kbg: 94 }],
      anim: [[0, ['bair', { legB: -40, shinB: 100 }]], [6, 'bair'], [14, 'bair'], [32, 'fall']],
    },
    uair: {
      frames: 30,
      air: true,
      landLag: 8,
      autoCancel: [3, 24],
      hits: [{ f: [5, 10], at: 'wep', r: 16, dmg: 7, ang: 82, bkb: 26, kbg: 106 }],
      anim: [[0, ['uairWind', { armF: 70, wep: 40 }]], [5, ['uairWind', { armF: 130, foreF: 0, wep: 0 }]], [8, ['uairWind', { armF: 180, foreF: 0, wep: 0 }]], [11, ['uairWind', { armF: 230, foreF: 0, wep: 0 }]], [30, 'fall']],
    },
    dair: {
      frames: 40,
      air: true,
      landLag: 15,
      autoCancel: [3, 34],
      hits: [
        { f: [12, 15], at: 'footF', r: 14, dmg: 10, ang: 270, bkb: 20, kbg: 82 },
        { f: [12, 15], at: 'footB', r: 13, dmg: 10, ang: 270, bkb: 20, kbg: 82 },
      ],
      anim: [[0, 'dairWind'], [11, 'dairWind'], [13, 'dair'], [22, 'dair'], [40, 'fall']],
    },
    grab: {
      frames: 30,
      hits: [{ f: [6, 8], at: 'handF', r: 14, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'ready'], [6, ['grab', { wep: 90 }]], [12, ['grab', { wep: 90 }]], [30, 'idle']],
    },
    dashgrab: {
      frames: 38,
      vel: [{ f: [1, 10], vx: 8 }, { f: [11, 38], vx: 1 }],
      hits: [{ f: [8, 11], at: 'handF', r: 16, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'dash'], [8, ['grab', { wep: 90 }]], [16, ['grab', { wep: 90 }]], [38, 'idle']],
    },
    pummel: { frames: 16, pummel: 1.2, anim: [[0, ['hold', { wep: 90 }]], [4, ['hold', { armB: 100, foreB: 0, wep: 90 }]], [16, ['hold', { wep: 90 }]]] },
    fthrow: {
      frames: 28,
      throw: { release: 10, hit: { dmg: 6, ang: 40, bkb: 58, kbg: 58 } },
      anim: [[0, ['hold', { wep: 90 }]], [8, ['throwF', { wep: 90 }]], [28, 'idle']],
    },
    bthrow: {
      frames: 32,
      throw: { release: 14, holdAt: 'handF', hit: { dmg: 8, ang: 140, bkb: 58, kbg: 66 } },
      anim: [[0, ['hold', { wep: 90 }]], [6, ['throwF', { rot: -90, wep: 90 }]], [12, ['throwB', { rot: -200, wep: 90 }]], [16, ['throwB', { rot: -340, wep: 90 }]], [32, ['idle', { rot: -360 }]]],
    },
    uthrow: {
      frames: 32,
      throw: { release: 12, hit: { dmg: 6, ang: 90, bkb: 66, kbg: 66 } },
      anim: [[0, ['hold', { wep: 90 }]], [7, ['crouch', { wep: 90 }]], [12, ['throwUp', { wep: 0 }]], [32, 'idle']],
    },
    dthrow: {
      frames: 32,
      throw: { release: 14, hit: { dmg: 5, ang: 72, bkb: 56, kbg: 36 } },
      anim: [[0, ['hold', { wep: 90 }]], [9, ['throwDown', { wep: 60 }]], [18, ['throwDown', { wep: 60 }]], [32, 'idle']],
    },
    nspec: {
      frames: 34,
      shots: [{ f: 11, proj: 'tape', at: 'handB', x: 8, y: 4 }],
      anim: [[0, ['throwB', { rot: 0, lean: -10, armB: -60, foreB: 40 }]], [10, ['throwF', { armB: 110, foreB: 0, armF: 20, foreF: 40 }]], [16, ['throwF', { armB: 100, foreB: 0, armF: 20, foreF: 40 }]], [34, 'idle']],
    },
    sspec: {
      frames: 40,
      oncePerAir: true,
      turn: true,
      edgeStop: true,
      vel: [{ f: [1, 6], vx: 1, grav: 0.3 }, { f: [7, 20], vx: 14, vy: 0, grav: 0 }, { f: [21, 40], vx: 3, grav: 0.8 }],
      hits: [{ f: [7, 20], at: 'neck', x: 6, r: 24, dmg: 7, ang: 45, bkb: 50, kbg: 55 }],
      anim: [[0, ['crouch', { wep: 90 }]], [6, 'dolly'], [20, 'dolly'], [40, 'idle']],
      sfx: [[7, 'dash']],
    },
    uspec: {
      frames: 44,
      helpless: true,
      landHelpless: 22,
      ledgeFrom: 8,
      reverse: true,
      vel: [{ f: [1, 5], vx: 0, vy: 0, grav: 0 }, { f: [6, 20], vy: 17, grav: 0 }, { f: [21, 44], grav: 0.7 }],
      hits: [
        { f: [6, 10], at: 'footF', r: 18, dmg: 6, ang: 80, bkb: 50, kbg: 70 },
        { f: [6, 10], at: 'footB', r: 16, dmg: 6, ang: 80, bkb: 50, kbg: 70 },
      ],
      anim: [[0, ['squat', { sy: 0.8 }]], [5, ['squat', { sy: 0.75 }]], [7, 'spring'], [20, 'spring'], [44, 'helpless']],
      sfx: [[6, 'boing']],
    },
    dspec: {
      frames: 40,
      script: 'stagehand:sandbag',
      anim: [[0, 'ready'], [6, ['castUp', { armB: 30, wep: 90 }]], [12, ['castUp', { armF: 120, armB: 30, wep: 90 }]], [20, ['castUp', { armF: 150, armB: 30, wep: 90 }]], [40, 'idle']],
      sfx: [[12, 'whiff']],
    },
    ledgeatk: {
      frames: 48,
      hits: [{ f: [17, 20], at: 'wep', r: 17, dmg: 7, ang: 361, bkb: 45, kbg: 45 }],
      anim: [[0, 'climb'], [14, 'swingWind'], [18, 'swing'], [26, 'swing'], [48, 'idle']],
    },
    getupatk: {
      frames: 44,
      hits: [
        { f: [14, 16], at: 'footF', r: 16, dmg: 6, ang: 361, bkb: 50, kbg: 40 },
        { f: [22, 24], at: 'footB', r: 16, dmg: 6, ang: 361, bkb: 50, kbg: 40, grp: 1 },
      ],
      anim: [[0, 'lying'], [12, ['downSmash', { lean: 50 }]], [16, 'downSmash'], [24, ['downSmash', { legF: -82, legB: 82 }]], [44, 'idle']],
    },
    ult: {
      frames: 100,
      ult: true,
      script: 'stagehand:ult',
      anim: [[0, ['castUp', { armB: 150, foreB: 0 }]], [12, ['castUp', { armB: 150, foreB: 0, head: -20 }]], [24, ['taunt', { wep: 0 }]], [70, ['taunt', { wep: 0 }]], [100, 'idle']],
      sfx: [[1, 'count']],
    },
  },
};

registerScripts({
  // a sandbag drops from the fly loft just in front of the bot
  'stagehand:sandbag': (st, f) => {
    if (f.mf !== 12) return;
    spawnProj(st, f, cfOf(f).projIdx.sandbag, f.x + f.facing * 96, f.y - 300 * f.grav);
  },
  // Lights Out!: the lighting rig comes down, left to right, then right to left
  'stagehand:ult': (st, f) => {
    const mf = f.mf;
    if (mf < 10 || mf > 70 || (mf - 10) % 6 !== 0) return;
    const stg = STAGES[st.stage].solids[0];
    const n = (mf - 10) / 6; // 0..10
    const k = n <= 5 ? n / 5 : (10 - n) / 5 - 0.1;
    const x = stg.x1 + 60 + (stg.x2 - stg.x1 - 120) * Math.max(0, Math.min(1, k));
    spawnProj(st, f, cfOf(f).projIdx.lamp, x, stg.y1 - 640);
    if (n === 0) ev(st, 'flash', x, stg.y1, f.i);
  },
});
