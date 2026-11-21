// Kit Cadet — the all-rounder. Space cadet from the Comet Colonies; bubble helmet, jet boots, ray blaster.
import { spawnProj } from '../../sim/projectiles';
import { registerScripts } from '../../sim/scripts';
import { STAGES } from '../../sim/data';
import type { FighterDef } from '../../sim/types';

export const kit: FighterDef = {
  id: 'kit',
  name: 'Kit Cadet',
  title: 'Co-Pilot of Your Heart',
  role: 'All-rounder',
  color: '#ff8a2a',
  weight: 98,
  rig: { thigh: 24, shin: 24, torso: 36, head: 21, upper: 20, fore: 18, girth: 15, limb: 7 },
  stats: { walk: 9.5, dash: 17, run: 15.5, dashFrames: 11, airSpeed: 10, airAccel: 0.55, airFric: 0.12, groundFric: 0.85, grav: 0.78, fall: 13.5, ffall: 21, jump: 21.5, hop: 14.5, djump: 20, jumps: 1, squat: 3 },
  bio: 'Top of her class at the Comet Colonies Flight Academy (class size: one). Beamed aboard mid-launch and has decided the whole show is a training simulation. Calls everyone "co-pilot".',
  line: 'Houston, we have a bro-blem: you’re too handsome to KO. Doing it anyway.',
  taunt: 'Salutes. Unfurls a tiny flag that says MY BRO.',
  wins: ['Mission accomplished, co-pilot. Same time next orbit?', 'Logged it: you were great. Second greatest.', 'Ground control to my bro: you okay down there?'],
  moveNames: { nspec: 'Ray Blaster', sspec: 'Comet Dash', uspec: 'Jet Boost', dspec: 'Gravity Stomp', ult: 'Supernova' },
  projs: {
    bolt: { kind: 'bolt', r: 11, life: 64, vx: 13.5, hit: { dmg: 5, ang: 361, bkb: 18, kbg: 48, fx: 'magic' }, chargeable: true },
    comet: { kind: 'comet', r: 80, life: 90, ghost: true, pierce: true, vy: -24, hit: { dmg: 6, ang: 80, bkb: 30, kbg: 30, fx: 'fire', unblockable: true }, rehit: 8, fuse: 44, explode: { r: 420, hit: { dmg: 28, ang: 70, bkb: 70, kbg: 115, fx: 'fire', unblockable: true } } },
  },
  moves: {
    jab1: {
      frames: 18,
      hits: [{ f: [3, 4], at: 'handF', r: 13, dmg: 2.5, ang: 361, bkb: 18, kbg: 25 }],
      next: [{ move: 'jab2', from: 4, to: 16 }],
      anim: [[0, 'jabWind'], [3, 'jab1'], [10, 'jab1'], [18, 'ready']],
    },
    jab2: {
      frames: 18,
      hits: [{ f: [3, 4], at: 'handB', r: 13, dmg: 2, ang: 361, bkb: 18, kbg: 25 }],
      next: [{ move: 'jab3', from: 4, to: 16 }],
      anim: [[0, 'jab1'], [3, 'jab2'], [10, 'jab2'], [18, 'ready']],
    },
    jab3: {
      frames: 30,
      hits: [{ f: [5, 7], at: 'footF', r: 17, dmg: 4.5, ang: 45, bkb: 45, kbg: 90 }],
      anim: [[0, 'kickWind'], [5, 'kick'], [12, 'kick'], [30, 'idle']],
    },
    ftilt: {
      frames: 28,
      hits: [
        { f: [6, 8], at: 'footF', r: 17, dmg: 8.5, ang: 361, bkb: 22, kbg: 92 },
        { f: [6, 8], at: 'kneeF', r: 12, dmg: 7, ang: 361, bkb: 22, kbg: 90 },
      ],
      anim: [[0, 'kickWind'], [6, 'kick'], [12, 'kick'], [28, 'idle']],
    },
    utilt: {
      frames: 30,
      hits: [{ f: [5, 10], at: 'handF', r: 16, dmg: 6.5, ang: 96, bkb: 26, kbg: 120 }],
      anim: [[0, 'uppercutWind'], [5, ['uppercut', { armF: 120 }]], [9, 'uppercut'], [14, ['uppercut', { armF: 200 }]], [30, 'idle']],
    },
    dtilt: {
      frames: 24,
      hits: [{ f: [5, 7], at: 'footF', r: 15, dmg: 6, ang: 78, bkb: 32, kbg: 72 }],
      anim: [[0, 'crouch'], [5, 'kickLow'], [10, 'kickLow'], [24, 'crouch']],
    },
    dash: {
      frames: 38,
      vel: [{ f: [1, 4], vx: 13 }, { f: [5, 16], vx: 11 }, { f: [17, 38], vx: 3 }],
      hits: [
        { f: [6, 10], at: 'footF', r: 19, dmg: 9, ang: 70, bkb: 60, kbg: 58, fx: 'fire' },
        { f: [11, 18], at: 'footF', r: 15, dmg: 5, ang: 70, bkb: 40, kbg: 40, fx: 'fire' },
      ],
      anim: [[0, 'dash'], [5, ['kick', { lean: -30, legF: 80, y: -8 }]], [18, ['kick', { lean: -24, legF: 76 }]], [38, 'idle']],
    },
    fsmash: {
      frames: 46,
      charge: 9,
      hits: [
        { f: [13, 15], at: 'handF', x: 10, r: 22, dmg: 17, ang: 361, bkb: 30, kbg: 100, fx: 'magic' },
        { f: [13, 15], at: 'elbowF', r: 14, dmg: 14, ang: 361, bkb: 30, kbg: 96, fx: 'magic' },
      ],
      anim: [[0, 'ready'], [8, 'smashWind'], [12, 'smashWind'], [14, 'smashHit'], [22, 'smashHit'], [46, 'idle']],
      sfx: [[13, 'zap']],
    },
    usmash: {
      frames: 44,
      charge: 6,
      hits: [
        { f: [9, 14], at: 'head', y: 14, r: 24, dmg: 15, ang: 90, bkb: 32, kbg: 98 },
        { f: [9, 14], at: 'handF', r: 16, dmg: 13, ang: 90, bkb: 32, kbg: 96 },
      ],
      anim: [[0, 'ready'], [6, 'upSmashWind'], [10, 'upSmash'], [18, 'upSmash'], [44, 'idle']],
    },
    dsmash: {
      frames: 44,
      charge: 5,
      hits: [
        { f: [7, 8], at: 'footF', r: 18, dmg: 12, ang: 30, bkb: 28, kbg: 96 },
        { f: [15, 16], at: 'footB', r: 18, dmg: 14, ang: 30, bkb: 30, kbg: 98, grp: 1 },
      ],
      anim: [[0, 'crouch'], [5, ['downSmashWind', { rot: 0 }]], [8, ['downSmash', { lean: 30 }]], [12, ['downSmash', { lean: 10, legF: -82, legB: 82 }]], [16, ['downSmash', { lean: 30, legF: 82, legB: -82 }]], [26, 'crouch'], [44, 'idle']],
    },
    nair: {
      frames: 36,
      air: true,
      landLag: 7,
      autoCancel: [3, 30],
      hits: [
        { f: [3, 6], at: 'footF', r: 17, dmg: 8, ang: 361, bkb: 16, kbg: 100 },
        { f: [7, 24], at: 'footF', r: 15, dmg: 5, ang: 361, bkb: 10, kbg: 90 },
      ],
      anim: [[0, 'tuck'], [3, ['kick', { legF: 80, lean: -10 }]], [24, ['kick', { legF: 75, lean: -8 }]], [36, 'fall']],
    },
    fair: {
      frames: 40,
      air: true,
      landLag: 12,
      autoCancel: [3, 34],
      hits: [{ f: [10, 13], at: 'footF', r: 19, dmg: 12, ang: 40, bkb: 34, kbg: 98, fx: 'fire' }],
      anim: [[0, 'kickWind'], [9, ['kickWind', { lean: -20 }]], [11, ['kick', { lean: -30, legF: 100 }]], [18, 'kick'], [40, 'fall']],
    },
    bair: {
      frames: 32,
      air: true,
      landLag: 9,
      autoCancel: [3, 26],
      hits: [{ f: [6, 9], at: 'footB', r: 18, dmg: 11.5, ang: 361, bkb: 20, kbg: 100 }],
      anim: [[0, ['bair', { legB: -40, shinB: 100 }]], [6, 'bair'], [14, 'bair'], [32, 'fall']],
    },
    uair: {
      frames: 32,
      air: true,
      landLag: 8,
      autoCancel: [3, 26],
      hits: [{ f: [5, 10], at: 'footF', r: 18, dmg: 8, ang: 78, bkb: 26, kbg: 110 }],
      anim: [[0, ['uairWind', { rot: 0 }]], [5, ['uair', { rot: -40 }]], [10, ['uair', { rot: -200 }]], [18, ['tuck', { rot: -330 }]], [32, ['fall', { rot: -360 }]]],
    },
    dair: {
      frames: 40,
      air: true,
      landLag: 16,
      autoCancel: [3, 34],
      hits: [
        { f: [13, 15], at: 'footF', r: 17, dmg: 13, ang: 270, bkb: 20, kbg: 88, fx: 'fire' },
        { f: [13, 15], at: 'footB', r: 15, dmg: 13, ang: 270, bkb: 20, kbg: 88, fx: 'fire' },
        { f: [16, 22], at: 'footF', r: 15, dmg: 8, ang: 361, bkb: 20, kbg: 70 },
      ],
      anim: [[0, 'dairWind'], [12, 'dairWind'], [14, 'dair'], [22, 'dair'], [40, 'fall']],
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
    pummel: { frames: 16, pummel: 1.5, anim: [[0, 'hold'], [4, ['hold', { armB: 100, foreB: 0 }]], [16, 'hold']] },
    fthrow: {
      frames: 28,
      throw: { release: 10, hit: { dmg: 8, ang: 40, bkb: 60, kbg: 62 } },
      anim: [[0, 'hold'], [8, 'throwF'], [28, 'idle']],
    },
    bthrow: {
      frames: 32,
      throw: { release: 14, holdAt: 'handF', hit: { dmg: 11, ang: 140, bkb: 60, kbg: 72 } },
      anim: [[0, 'hold'], [6, ['throwF', { rot: -90 }]], [12, ['throwB', { rot: -200 }]], [16, ['throwB', { rot: -340 }]], [32, ['idle', { rot: -360 }]]],
    },
    uthrow: {
      frames: 34,
      throw: { release: 13, hit: { dmg: 7, ang: 90, bkb: 70, kbg: 70 } },
      anim: [[0, 'hold'], [8, 'crouch'], [13, 'throwUp'], [34, 'idle']],
    },
    dthrow: {
      frames: 34,
      throw: { release: 15, hit: { dmg: 6, ang: 70, bkb: 60, kbg: 38 } },
      anim: [[0, 'hold'], [10, 'throwDown'], [20, 'throwDown'], [34, 'idle']],
    },
    nspec: {
      frames: 60,
      chargeB: { at: 10, max: 75, release: 'nspecFire' },
      anim: [[0, 'castWind'], [10, 'charge'], [60, 'charge']],
    },
    nspecFire: {
      frames: 26,
      shots: [{ f: 4, proj: 'bolt', at: 'handF', x: 10 }],
      anim: [[0, 'charge'], [3, 'cast'], [14, 'cast'], [26, 'idle']],
      sfx: [[4, 'zap']],
    },
    nspecAir: {
      frames: 30,
      shots: [{ f: 5, proj: 'bolt', at: 'handF', x: 10 }],
      anim: [[0, 'castWind'], [4, 'cast'], [16, 'cast'], [30, 'fall']],
      sfx: [[5, 'zap']],
    },
    sspec: {
      frames: 40,
      oncePerAir: true,
      vel: [{ f: [1, 6], vx: 1, vy: 0, grav: 0 }, { f: [7, 20], vx: 18, vy: 0, grav: 0 }, { f: [21, 40], vx: 3, grav: 0.6 }],
      hits: [{ f: [7, 20], at: 'torso', y: 10, r: 28, dmg: 9, ang: 45, bkb: 55, kbg: 60, fx: 'fire' }],
      anim: [[0, 'charge'], [6, ['charge', { lean: 60 }]], [8, ['dash', { lean: 70, rot: 0 }]], [20, ['dash', { lean: 70 }]], [40, 'fall']],
      sfx: [[7, 'jet']],
    },
    uspec: {
      frames: 44,
      helpless: true,
      landHelpless: 22,
      ledgeFrom: 8,
      reverse: true,
      vel: [{ f: [1, 5], vx: 0, vy: 0, grav: 0 }, { f: [6, 28], vy: 17, grav: 0 }, { f: [29, 44], grav: 0.7 }],
      hits: [
        { f: [6, 28], at: 'footF', r: 20, dmg: 1.8, ang: 85, bkb: 28, kbg: 25, rehit: 5, fx: 'fire' },
        { f: [29, 31], at: 'torso', y: 20, r: 28, dmg: 5, ang: 75, bkb: 60, kbg: 85, grp: 1, fx: 'fire' },
      ],
      anim: [[0, 'charge'], [5, 'charge'], [6, 'jump'], [28, ['jump', { armF: 180, armB: 175 }]], [44, 'helpless']],
      sfx: [[6, 'jet']],
    },
    dspec: {
      frames: 40,
      hits: [
        { f: [11, 14], at: 'hip', x: 50, y: -10, r: 34, dmg: 10, ang: 70, bkb: 52, kbg: 68, fx: 'rock' },
        { f: [11, 14], at: 'hip', x: -50, y: -10, r: 34, dmg: 10, ang: 110, bkb: 52, kbg: 68, fx: 'rock' },
      ],
      anim: [[0, 'ready'], [8, ['stomp', { legF: 80, shinF: 90, y: 10 }]], [11, 'stomp'], [20, 'crouch'], [40, 'idle']],
      sfx: [[11, 'thud']],
    },
    dspecAir: {
      frames: 70,
      vel: [{ f: [1, 7], vx: 0, vy: 3, grav: 0 }, { f: [8, 70], vx: 0, vy: -24, grav: 0, noDrift: true }],
      landInto: 'dspecLand',
      hits: [{ f: [8, 70], at: 'footF', r: 20, dmg: 9, ang: 270, bkb: 30, kbg: 70, only: 'air', fx: 'fire' }],
      anim: [[0, 'tuck'], [7, 'tuck'], [9, 'dair'], [70, 'dair']],
    },
    dspecLand: {
      frames: 30,
      hits: [
        { f: [1, 3], at: 'hip', x: 55, y: -20, r: 36, dmg: 9, ang: 65, bkb: 50, kbg: 60, fx: 'rock' },
        { f: [1, 3], at: 'hip', x: -55, y: -20, r: 36, dmg: 9, ang: 115, bkb: 50, kbg: 60, fx: 'rock' },
      ],
      anim: [[0, 'land'], [10, 'crouch'], [30, 'idle']],
      sfx: [[1, 'thud']],
    },
    ledgeatk: {
      frames: 50,
      hits: [{ f: [17, 20], at: 'footF', r: 19, dmg: 9, ang: 361, bkb: 45, kbg: 45 }],
      anim: [[0, 'climb'], [14, 'kickWind'], [18, 'kick'], [26, 'kick'], [50, 'idle']],
    },
    getupatk: {
      frames: 44,
      hits: [
        { f: [14, 16], at: 'footF', r: 18, dmg: 7, ang: 361, bkb: 50, kbg: 40 },
        { f: [22, 24], at: 'footB', r: 18, dmg: 7, ang: 361, bkb: 50, kbg: 40, grp: 1 },
      ],
      anim: [[0, 'lying'], [12, ['downSmash', { lean: 50 }]], [16, 'downSmash'], [24, ['downSmash', { legF: -82, legB: 82 }]], [44, 'idle']],
    },
    ult: {
      frames: 110,
      ult: true,
      script: 'kit:ult',
      anim: [[0, 'castUp'], [30, 'castUp'], [40, 'victory'], [110, 'idle']],
    },
  },
};

registerScripts({
  'kit:ult': (st, f) => {
    if (f.mf !== 12) return;
    const stg = STAGES[st.stage];
    const cx = (stg.solids[0].x1 + stg.solids[0].x2) / 2;
    const p = spawnProj(st, f, 1, cx, stg.cam.t - 300);
    p.vx = 0;
  },
});
