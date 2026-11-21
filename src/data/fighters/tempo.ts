// Tempo — rhythm power. A DJ robot from Bassline Boulevard with speaker-cone headphones and a turntable chest.
// A beat pulses under Tempo all match (period in f.v[6], frames per beat). Hits that land within ±4 frames of
// the beat are On Beat (+30% damage, +20% knockback); four On Beat hits in a row trigger The Drop (f.v[7]
// frames of +25% speed, given by the engine).
//
// f.v slots: 0 frame of the last Tempo Shift (art pop-up)  1 beat id of the last counted On Beat hit
//            2 frame of the last counted On Beat hit         3 Drop The Beat: beats left on the dance floor
//            4 frame The Drop started (art flourish)        5 On Beat streak (0..3)
//            6 beat period (22 / 30 / 40; 0 = 30)           7 The Drop: frames left
import { A } from '../../sim/acts';
import { ev } from '../../sim/events';
import { cfOf, startMove, surfs } from '../../sim/fighter';
import { spawnProj } from '../../sim/projectiles';
import { registerScripts } from '../../sim/scripts';
import type { Fighter, FighterDef, State } from '../../sim/types';

/** frames per beat (30 = 120 BPM) */
export function tempoPeriod(f: Fighter): number {
  const p = f.v[6];
  return p === 22 || p === 40 ? p : 30;
}

/** is this frame inside the ±4 frame On Beat window */
export function tempoOnBeat(st: State, f: Fighter): boolean {
  const P = tempoPeriod(f);
  const ph = st.frame % P;
  return ph <= 4 || ph >= P - 4;
}

const DROP = 300;
const DANCE_BEATS = 8;

export const tempo: FighterDef = {
  id: 'tempo',
  name: 'Tempo',
  title: 'Bros Per Minute',
  role: 'Rhythm power',
  color: '#3affd5',
  weight: 94,
  power: 0.78,
  rig: { thigh: 23, shin: 23, torso: 36, head: 23, upper: 20, fore: 18, girth: 17, limb: 7.5 },
  stats: { walk: 9.6, dash: 17, run: 15.6, dashFrames: 11, airSpeed: 9.8, airAccel: 0.55, airFric: 0.12, groundFric: 0.88, grav: 0.8, fall: 14, ffall: 22, jump: 21.2, hop: 14.3, djump: 19.8, jumps: 1, squat: 3 },
  passive: 'tempo:passive',
  bio: 'Assembled in a Bassline Boulevard basement to keep one party going forever. Gained sentience the night someone requested “the song where the bros hug”. Runs on 120 BPM and pure friendship, and treats every fight as a dance battle where every bro is the headliner.',
  line: 'Is this a bop or is it just you, bro?',
  taunt: 'Does the robot (ironically), then the robot (sincerely), then points both fingers at you: “This one’s for my bro.”',
  wins: ['That’s a wrap. Same playlist tomorrow?', 'Bro, your heartbeat was on the two and the four. Iconic.', 'Adding you to my feel-good playlist. Track one. Also every other track.'],
  moveNames: { nspec: 'Bass Drop', sspec: 'Scratch', uspec: 'Beat Jump', dspec: 'Tempo Shift', ult: 'Drop The Beat' },
  projs: {
    bass: { kind: 'bassdrop', r: 30, life: 44, vx: 10.5, drag: 0.985, ghost: true, pierce: true, hit: { dmg: 5, ang: 45, bkb: 38, kbg: 42, fx: 'sound' } },
    record: { kind: 'record', r: 16, life: 110, vx: 15, boomerang: 20, pierce: true, rehit: 28, hit: { dmg: 5.5, ang: 50, bkb: 26, kbg: 50, fx: 'sound' } },
    // Drop The Beat: one stage-wide wave per beat (stick: never cancelled by other projectiles)
    beatwave: { kind: 'beatwave', r: 1700, life: 4, ghost: true, pierce: true, stick: true, reflectable: false, hit: { dmg: 3, ang: 90, bkb: 40, kbg: 0, fx: 'note', unblockable: true, hitlag: 0.6 } },
    dropwave: { kind: 'dropwave', r: 1700, life: 8, ghost: true, pierce: true, stick: true, reflectable: false, hit: { dmg: 12, ang: 70, bkb: 70, kbg: 100, fx: 'note', unblockable: true } },
  },
  poses: {
    robotWind: { lean: 2, head: 4, armF: 10, foreF: 95, armB: 40, foreB: 90, legF: 20, shinF: 18, legB: -20, shinB: 16 },
    robotArm: { lean: 14, head: -4, armF: 90, foreF: 0, armB: -20, foreB: 90, legF: 34, shinF: 18, legB: -30, shinB: 10 },
    raiseRoof: { lean: -6, head: -10, armF: 176, foreF: 34, armB: 168, foreB: 34, legF: 14, shinF: 14, legB: -12, shinB: 14 },
    pushBoth: { lean: 22, armF: 92, foreF: 0, armB: 86, foreB: 0, legF: 36, shinF: 18, legB: -34, shinB: 8 },
    scratch: { lean: 10, armF: 62, foreF: 112, armB: 40, foreB: 100, legF: 26, shinF: 26, legB: -22, shinB: 20 },
    headphone: { lean: 4, head: 16, armF: 152, foreF: 142, armB: 55, foreB: 95, legF: 22, shinF: 20, legB: -18, shinB: 16 },
    knob: { lean: 8, head: -6, armF: 150, foreF: 150, armB: 70, foreB: 60, legF: 26, shinF: 22, legB: -20, shinB: 16, sy: 1.03 },
    spinSplit: { lean: 0, armF: 100, foreF: 0, armB: -100, foreB: 0, legF: 82, shinF: 0, legB: -82, shinB: 0 },
    breakWind: { lean: 40, head: -10, armF: 40, foreF: 20, armB: 30, foreB: 20, legF: 60, shinF: 110, legB: 10, shinB: 120, sy: 0.94 },
    breakF: { lean: 62, head: -24, armF: 64, foreF: 0, armB: 54, foreB: 0, legF: 92, shinF: 0, legB: -20, shinB: 110 },
    breakB: { lean: 62, head: -24, armF: 64, foreF: 0, armB: 54, foreB: 0, legF: 40, shinF: 110, legB: -98, shinB: 0 },
    robotA: { lean: 0, head: 12, armF: 90, foreF: 90, armB: 0, foreB: 90, legF: 12, shinF: 10, legB: -12, shinB: 10 },
    robotB: { lean: 0, head: -12, armF: 0, foreF: 90, armB: 90, foreB: 90, legF: 12, shinF: 10, legB: -12, shinB: 10 },
    point: { lean: 4, head: -6, armF: 120, foreF: 0, armB: 30, foreB: 120, legF: 22, shinF: 14, legB: -22, shinB: 12 },
  },
  base: {
    taunt: [
      [0, 'robotA', 'step'],
      [8, 'robotB', 'step'],
      [16, 'robotA', 'step'],
      [24, 'robotB', 'step'],
      [32, 'point'],
      [44, ['point', { armB: 125, foreB: 0 }]],
      [59, ['point', { armB: 125, foreB: 0 }]],
    ],
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
      // Hype Push: both palms, a little blast of bass
      frames: 30,
      hits: [
        { f: [6, 8], at: 'handF', x: 6, r: 18, dmg: 4.5, ang: 45, bkb: 45, kbg: 90, fx: 'sound' },
        { f: [6, 8], at: 'handB', x: 4, r: 15, dmg: 4, ang: 45, bkb: 45, kbg: 90, fx: 'sound' },
      ],
      anim: [[0, 'jab2'], [4, ['pushBoth', { armF: 50, foreF: 100, armB: 46, foreB: 100, lean: 4 }]], [6, 'pushBoth'], [13, 'pushBoth'], [30, 'idle']],
      sfx: [[6, 'note']],
    },
    ftilt: {
      // The Robot: a stiff pop-and-lock arm
      frames: 27,
      hits: [
        { f: [6, 8], at: 'handF', x: 4, r: 16, dmg: 9, ang: 361, bkb: 20, kbg: 90 },
        { f: [6, 8], at: 'elbowF', r: 12, dmg: 7, ang: 361, bkb: 20, kbg: 88 },
      ],
      anim: [[0, 'robotWind'], [5, 'robotWind', 'step'], [6, 'robotArm', 'step'], [14, 'robotArm'], [27, 'idle']],
    },
    utilt: {
      // Raise The Roof: two pumps, the second launches
      frames: 30,
      hits: [
        { f: [5, 7], at: 'handF', r: 15, dmg: 3, ang: 100, bkb: 42, kbg: 20 },
        { f: [5, 7], at: 'handB', r: 14, dmg: 3, ang: 100, bkb: 42, kbg: 20 },
        { f: [12, 14], at: 'handF', r: 17, dmg: 5, ang: 92, bkb: 30, kbg: 118, grp: 1 },
        { f: [12, 14], at: 'handB', r: 15, dmg: 5, ang: 92, bkb: 30, kbg: 118, grp: 1 },
      ],
      anim: [[0, 'uppercutWind'], [5, 'raiseRoof'], [9, ['raiseRoof', { armF: 140, armB: 132, foreF: 50, foreB: 50 }]], [12, 'raiseRoof'], [16, 'raiseRoof'], [30, 'idle']],
    },
    dtilt: {
      // Needle Drop: a low sweeping shin
      frames: 24,
      hits: [{ f: [5, 7], at: 'footF', r: 15, dmg: 6, ang: 76, bkb: 32, kbg: 70 }],
      anim: [[0, 'crouch'], [5, 'kickLow'], [10, 'kickLow'], [24, 'crouch']],
    },
    dash: {
      // Moonslide: leaning way back, one heel out
      frames: 38,
      vel: [{ f: [1, 4], vx: 12 }, { f: [5, 18], vx: 10 }, { f: [19, 38], vx: 2 }],
      hits: [
        { f: [6, 10], at: 'footF', r: 19, dmg: 9, ang: 60, bkb: 58, kbg: 60 },
        { f: [11, 18], at: 'footF', r: 15, dmg: 5, ang: 60, bkb: 40, kbg: 40 },
      ],
      anim: [[0, 'dash'], [5, ['kick', { lean: -34, legF: 72, legB: -16, shinB: 46, armF: 130, foreF: 20, armB: 150, foreB: 10, y: -4 }]], [18, ['kick', { lean: -30, legF: 66, legB: -14, shinB: 40, armF: 125, armB: 145 }]], [38, 'idle']],
    },
    fsmash: {
      // Subwoofer Punch: cock it back, then a fist-full of bass
      frames: 48,
      charge: 10,
      hits: [
        { f: [13, 15], at: 'handF', x: 14, r: 25, dmg: 17, ang: 361, bkb: 30, kbg: 102, fx: 'sound' },
        { f: [13, 15], at: 'elbowF', r: 14, dmg: 13, ang: 361, bkb: 30, kbg: 96, fx: 'sound' },
      ],
      anim: [[0, 'ready'], [8, ['punchWind', { lean: -24, armF: -62, foreF: 112, legB: -42, legF: 30, sy: 0.95 }]], [12, ['punchWind', { lean: -26, armF: -66, foreF: 116, legB: -44, legF: 30, sy: 0.94 }]], [14, ['punch', { lean: 34, sx: 1.08 }]], [22, 'punch'], [48, 'idle']],
      sfx: [[13, 'thud']],
    },
    usmash: {
      // Air Horn: crouch, then blast it straight up
      frames: 44,
      charge: 6,
      hits: [
        { f: [9, 14], at: 'handF', y: 24, r: 28, dmg: 15, ang: 90, bkb: 32, kbg: 98, fx: 'sound' },
        { f: [9, 14], at: 'handF', r: 16, dmg: 13, ang: 90, bkb: 32, kbg: 96, fx: 'sound' },
      ],
      anim: [[0, 'ready'], [6, ['upSmashWind', { armF: 10, foreF: 130 }]], [10, ['upSmash', { armB: 110, foreB: 40 }]], [18, ['upSmash', { armB: 110, foreB: 40 }]], [44, 'idle']],
      sfx: [[9, 'note']],
    },
    dsmash: {
      // Breakdance Sweep: front leg, then windmill round to the back
      frames: 44,
      charge: 5,
      hits: [
        { f: [7, 9], at: 'footF', r: 19, dmg: 12, ang: 30, bkb: 28, kbg: 96 },
        { f: [7, 9], at: 'kneeF', r: 13, dmg: 10, ang: 30, bkb: 28, kbg: 92 },
        { f: [15, 17], at: 'footB', r: 19, dmg: 14, ang: 30, bkb: 30, kbg: 98, grp: 1 },
        { f: [15, 17], at: 'kneeB', r: 13, dmg: 11, ang: 30, bkb: 30, kbg: 94, grp: 1 },
      ],
      anim: [[0, 'crouch'], [5, 'breakWind'], [8, 'breakF'], [12, ['breakF', { legF: 40, shinF: 100, legB: -40, shinB: 100 }]], [16, 'breakB'], [24, ['breakWind', { lean: 30 }]], [44, 'idle']],
    },
    nair: {
      // Turntable Split: a backwards spinning split kick
      frames: 36,
      air: true,
      landLag: 7,
      autoCancel: [3, 30],
      hits: [
        { f: [3, 6], at: 'footF', r: 17, dmg: 8, ang: 361, bkb: 16, kbg: 100 },
        { f: [3, 6], at: 'footB', r: 16, dmg: 8, ang: 361, bkb: 16, kbg: 100 },
        { f: [7, 20], at: 'footF', r: 15, dmg: 5, ang: 361, bkb: 10, kbg: 90 },
        { f: [7, 20], at: 'footB', r: 14, dmg: 5, ang: 361, bkb: 10, kbg: 90 },
      ],
      anim: [[0, 'tuck'], [3, ['spinSplit', { rot: 0 }]], [11, ['spinSplit', { rot: -160 }]], [20, ['spinSplit', { rot: -320 }]], [36, ['fall', { rot: -360 }]]],
    },
    fair: {
      // Fader Slam: a two-fisted hammer
      frames: 40,
      air: true,
      landLag: 12,
      autoCancel: [3, 34],
      hits: [
        { f: [10, 13], at: 'handF', r: 19, dmg: 12.5, ang: 40, bkb: 34, kbg: 98, fx: 'sound' },
        { f: [10, 13], at: 'handB', r: 16, dmg: 11, ang: 40, bkb: 34, kbg: 96, fx: 'sound' },
      ],
      anim: [[0, 'fairWind'], [9, ['fairWind', { lean: -22, armF: 180, armB: 170 }]], [11, ['fair', { lean: 42 }]], [18, 'fair'], [40, 'fall']],
    },
    bair: {
      frames: 32,
      air: true,
      landLag: 9,
      autoCancel: [3, 26],
      hits: [
        { f: [6, 9], at: 'footB', r: 18, dmg: 12, ang: 361, bkb: 22, kbg: 100 },
        { f: [6, 9], at: 'kneeB', r: 12, dmg: 9, ang: 361, bkb: 20, kbg: 95 },
      ],
      anim: [[0, ['bair', { legB: -40, shinB: 100 }]], [6, 'bair'], [14, 'bair'], [32, 'fall']],
    },
    uair: {
      // Hi-Hat: a flipping bicycle kick
      frames: 32,
      air: true,
      landLag: 8,
      autoCancel: [3, 26],
      hits: [{ f: [5, 10], at: 'footF', r: 18, dmg: 8.5, ang: 80, bkb: 26, kbg: 110 }],
      anim: [[0, ['uairWind', { rot: 0 }]], [5, ['uair', { rot: -40 }]], [10, ['uair', { rot: -200 }]], [18, ['tuck', { rot: -330 }]], [32, ['fall', { rot: -360 }]]],
    },
    dair: {
      // Bass Stomp: both heels, straight down
      frames: 42,
      air: true,
      landLag: 16,
      autoCancel: [3, 36],
      hits: [
        { f: [13, 15], at: 'footF', r: 17, dmg: 13, ang: 270, bkb: 20, kbg: 88, fx: 'sound' },
        { f: [13, 15], at: 'footB', r: 15, dmg: 13, ang: 270, bkb: 20, kbg: 88, fx: 'sound' },
        { f: [16, 22], at: 'footF', r: 15, dmg: 8, ang: 361, bkb: 20, kbg: 70 },
      ],
      anim: [[0, 'dairWind'], [12, 'dairWind'], [14, 'dair'], [22, 'dair'], [42, 'fall']],
      sfx: [[13, 'thud']],
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
    pummel: { frames: 16, pummel: 1.5, anim: [[0, 'hold'], [4, ['hold', { head: 24, armB: 100, foreB: 0 }]], [16, 'hold']] },
    fthrow: {
      // Pass The Aux
      frames: 28,
      throw: { release: 10, hit: { dmg: 8, ang: 40, bkb: 60, kbg: 62, fx: 'sound' } },
      anim: [[0, 'hold'], [8, 'pushBoth'], [28, 'idle']],
    },
    bthrow: {
      // Spin It Back
      frames: 32,
      throw: { release: 14, holdAt: 'handF', hit: { dmg: 11, ang: 140, bkb: 60, kbg: 72 } },
      anim: [[0, 'hold'], [6, ['throwF', { rot: -90 }]], [12, ['throwB', { rot: -200 }]], [16, ['throwB', { rot: -340 }]], [32, ['idle', { rot: -360 }]]],
    },
    uthrow: {
      // Hype Toss
      frames: 34,
      throw: { release: 13, hit: { dmg: 7, ang: 90, bkb: 70, kbg: 70, fx: 'note' } },
      anim: [[0, 'hold'], [8, 'crouch'], [13, 'raiseRoof'], [34, 'idle']],
    },
    dthrow: {
      // Floor Filler: down on the dance floor, then a little stomp step
      frames: 36,
      throw: { release: 16, hit: { dmg: 6, ang: 75, bkb: 60, kbg: 40 } },
      anim: [[0, 'hold'], [10, 'throwDown'], [16, ['stomp', { legF: 50, shinF: 40 }]], [20, 'stomp'], [36, 'idle']],
      sfx: [[16, 'thud']],
    },
    nspec: {
      // Bass Drop: fist to the floor, a sub-bass pulse round Tempo and a wave rolling forward
      frames: 40,
      hits: [{ f: [13, 16], at: 'hip', y: 40, r: 54, dmg: 7, ang: 60, bkb: 50, kbg: 52, fx: 'sound' }],
      shots: [{ f: 14, proj: 'bass', at: 'handF', x: 8 }],
      anim: [[0, 'ready'], [7, ['castWind', { armF: 172, foreF: 40, armB: -30, lean: -10 }]], [11, ['castWind', { armF: 180, foreF: 20, armB: -40, lean: -12, sy: 1.05 }]], [13, ['castDown', { armF: 50, foreF: 0, lean: 34, sy: 0.93, sx: 1.06 }]], [22, 'castDown'], [40, 'idle']],
      sfx: [[13, 'boom']],
    },
    nspecAir: {
      frames: 40,
      hits: [{ f: [13, 16], at: 'hip', y: 40, r: 54, dmg: 7, ang: 60, bkb: 50, kbg: 52, fx: 'sound' }],
      shots: [{ f: 14, proj: 'bass', at: 'handF', x: 8 }],
      anim: [[0, 'fall'], [7, ['castWind', { armF: 172, foreF: 40, armB: -30, lean: -10 }]], [11, ['castWind', { armF: 180, foreF: 20, armB: -40, lean: -12 }]], [13, ['castDown', { armF: 50, foreF: 0, lean: 34 }]], [22, 'castDown'], [40, 'fall']],
      sfx: [[13, 'boom']],
    },
    sspec: {
      // Scratch: throws a vinyl record that boomerangs back
      frames: 34,
      script: 'tempo:record',
      shots: [{ f: 9, proj: 'record', at: 'handF', x: 6 }],
      anim: [[0, 'ready'], [5, ['castWind', { armF: -30, foreF: 100, lean: -12 }]], [8, ['castWind', { armF: -40, foreF: 90, lean: -14 }]], [10, ['cast', { lean: 22 }]], [20, 'cast'], [34, 'idle']],
      sfx: [[9, 'whiff']],
    },
    sspecAir: {
      frames: 34,
      script: 'tempo:record',
      shots: [{ f: 9, proj: 'record', at: 'handF', x: 6 }],
      anim: [[0, 'fall'], [5, ['castWind', { armF: -30, foreF: 100, lean: -12 }]], [8, ['castWind', { armF: -40, foreF: 90, lean: -14 }]], [10, ['cast', { lean: 22 }]], [20, 'cast'], [34, 'fall']],
      sfx: [[9, 'whiff']],
    },
    sspecScratch: {
      // the record is still out: scratch the chest deck instead (a short wub that hits)
      frames: 26,
      hits: [{ f: [5, 8], at: 'handF', x: 10, r: 19, dmg: 5, ang: 361, bkb: 40, kbg: 40, fx: 'sound' }],
      anim: [[0, 'ready'], [3, 'scratch'], [5, ['scratch', { armF: 88, foreF: 30 }]], [9, 'scratch'], [12, ['scratch', { armF: 88, foreF: 30 }]], [26, 'idle']],
      sfx: [[5, 'note']],
    },
    uspec: {
      // Beat Jump: on the beat it becomes uspecBeat (higher, harder)
      frames: 42,
      helpless: true,
      landHelpless: 22,
      ledgeFrom: 8,
      reverse: true,
      script: 'tempo:beatjump',
      vel: [{ f: [1, 4], vx: 0, vy: 0, grav: 0 }, { f: [5, 20], vy: 17, grav: 0 }, { f: [21, 42], grav: 0.7 }],
      hits: [
        { f: [5, 10], at: 'handF', r: 18, dmg: 7, ang: 82, bkb: 45, kbg: 72, fx: 'sound' },
        { f: [5, 10], at: 'handB', r: 16, dmg: 6, ang: 82, bkb: 45, kbg: 72, fx: 'sound' },
      ],
      anim: [[0, 'squat'], [4, 'squat'], [6, 'raiseRoof'], [12, ['raiseRoof', { armF: 140, armB: 132 }]], [18, 'raiseRoof'], [42, 'helpless']],
      sfx: [[5, 'jump']],
    },
    uspecBeat: {
      frames: 44,
      helpless: true,
      landHelpless: 20,
      ledgeFrom: 8,
      reverse: true,
      vel: [{ f: [1, 4], vx: 0, vy: 0, grav: 0 }, { f: [5, 22], vy: 21, grav: 0 }, { f: [23, 44], grav: 0.7 }],
      hits: [
        { f: [5, 12], at: 'head', y: 18, r: 26, dmg: 10, ang: 86, bkb: 45, kbg: 95, fx: 'note' },
        { f: [5, 12], at: 'handF', r: 21, dmg: 10, ang: 86, bkb: 45, kbg: 95, fx: 'note' },
        { f: [5, 12], at: 'handB', r: 19, dmg: 9, ang: 86, bkb: 45, kbg: 92, fx: 'note' },
      ],
      anim: [[0, 'squat'], [4, ['squat', { sy: 0.84 }]], [6, ['raiseRoof', { sy: 1.1 }]], [12, ['raiseRoof', { armF: 140, armB: 132 }]], [18, 'raiseRoof'], [24, ['raiseRoof', { armF: 140, armB: 132 }]], [44, 'helpless']],
      sfx: [[5, 'djump']],
    },
    dspec: {
      // Tempo Shift: one hand on the headphones, one on the knob: 120 -> 164 -> 90 -> 120 BPM
      frames: 30,
      script: 'tempo:shift',
      hits: [{ f: [8, 10], at: 'hip', y: 44, r: 48, dmg: 3, ang: 60, bkb: 45, kbg: 30, fx: 'sound' }],
      anim: [[0, 'ready'], [5, 'headphone'], [8, 'knob'], [18, ['knob', { armB: 76, foreB: 40 }]], [30, 'idle']],
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
      anim: [[0, 'lying'], [12, ['breakF', { lean: 50 }]], [16, 'breakF'], [24, 'breakB'], [44, 'idle']],
    },
    ult: {
      // Drop The Beat: the stage turns into a dance floor; every bro gets hit on every beat, the last one drops
      frames: 80,
      ult: true,
      script: 'tempo:ult',
      anim: [[0, 'charge'], [8, 'crouch'], [14, 'raiseRoof'], [24, ['raiseRoof', { armF: 140, armB: 132 }]], [34, 'raiseRoof'], [44, ['raiseRoof', { armF: 140, armB: 132 }]], [56, 'point'], [80, 'idle']],
      sfx: [[12, 'boom']],
    },
  },
};

registerScripts({
  'tempo:passive': (st, f) => {
    if (f.v[6] !== 22 && f.v[6] !== 30 && f.v[6] !== 40) f.v[6] = 30;
    if (st.timeStop > 0 && st.timeStopBy !== f.i) return; // frozen in someone else's time stop
    if (f.v[7] > 0) f.v[7]--;
    // Drop The Beat: a stage-wide hit on every beat while beats are left
    if (f.v[3] > 0) {
      if (f.act === A.DEAD || f.out) {
        f.v[3] = 0;
        return;
      }
      const P = tempoPeriod(f);
      if (st.frame % P !== 0) return;
      f.v[3]--;
      const s = surfs(st)[0];
      if (!s) return;
      const cx = (s.x1 + s.x2) / 2;
      const last = f.v[3] === 0;
      const pk = cfOf(f).projIdx[last ? 'dropwave' : 'beatwave'];
      spawnProj(st, f, pk, cx, s.y1, 0, 0);
      ev(st, 'pulse', cx, s.y1 - 20, f.i, last ? 900 : 420);
      ev(st, 'sfx', cx, s.y1, f.i, 0, 0, last ? 'boom' : 'note');
      if (last) ev(st, 'flash', cx, s.y1, f.i);
    }
  },
  'tempo:mult': (st, f, _m, out: { dmg: number; kb: number; fx?: string }) => {
    const P = tempoPeriod(f);
    const ph = st.frame % P;
    if (ph <= 4 || ph >= P - 4) {
      out.dmg *= 1.3;
      out.kb *= 1.2;
      out.fx = 'note';
      ev(st, 'onbeat', f.x, f.y - 120 * f.grav, f.i);
      f.st.onbeat++;
      // the frame of the nearest beat identifies this beat window (count once per window)
      const beat = st.frame - ph + (ph > 4 ? P : 0) + 1;
      if (f.v[1] !== beat) {
        f.v[1] = beat;
        f.v[2] = st.frame;
        f.v[5]++;
        if (f.v[5] >= 4) {
          // THE DROP
          f.v[5] = 0;
          f.v[7] = DROP;
          f.v[4] = st.frame;
          ev(st, 'buff', f.x, f.y, f.i);
          ev(st, 'pulse', f.x, f.y - 60 * f.grav, f.i, 160);
          ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'boom');
        }
      }
    } else if (st.frame - f.v[2] > 8) {
      // off beat: the streak resets (trailing hits of an On Beat multi-hit don't count)
      f.v[5] = 0;
    }
  },
  'tempo:shift': (st, f) => {
    if (f.mf !== 8) return;
    const P = tempoPeriod(f);
    f.v[6] = P === 30 ? 22 : P === 22 ? 40 : 30;
    f.v[0] = st.frame;
    ev(st, 'pulse', f.x, f.y - 60 * f.grav, f.i, 90);
    ev(st, 'sfx', f.x, f.y, f.i, 0, 0, 'zap');
  },
  'tempo:beatjump': (st, f) => {
    if (f.mf !== 1 || !tempoOnBeat(st, f)) return;
    startMove(st, f, 'uspecBeat');
    ev(st, 'onbeat', f.x, f.y - 120 * f.grav, f.i);
    ev(st, 'pulse', f.x, f.y - 20 * f.grav, f.i, 90);
  },
  'tempo:record': (st, f) => {
    if (f.mf !== 1) return;
    const pk = cfOf(f).projIdx.record;
    for (const p of st.projs) {
      if (!p.dead && p.o === f.i && p.fd === f.def && p.pk === pk) {
        startMove(st, f, 'sspecScratch');
        return;
      }
    }
  },
  'tempo:ult': (st, f) => {
    if (f.mf !== 12) return;
    f.v[3] = DANCE_BEATS;
    // dropping the beat drops The Drop too
    f.v[7] = Math.max(f.v[7], DROP);
    f.v[4] = st.frame;
    f.v[5] = 0;
  },
});
