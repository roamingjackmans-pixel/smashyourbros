// Professor Hoot — the zoner. Owl archmage from the Library Peaks: robe, moon spectacles, mortarboard, a spellbook
// that floats at his shoulder and jumps into his wing for book attacks. Floaty, two wing-flap air jumps, a storable
// Arcane Orb, homing quills, an 8-way Blink and a reflecting Tome Barrier. Ultimate: Final Exam (stage-wide spell
// circle, pop quiz, then a pillar of starlight).
import { cfOf, surfs, sx, sy } from '../../sim/fighter';
import { spawnProj } from '../../sim/projectiles';
import { registerScripts } from '../../sim/scripts';
import type { FighterDef } from '../../sim/types';

/** blink travel: units per frame for 8 frames */
const BLINK_SPD = 32;

export const hoot: FighterDef = {
  id: 'hoot',
  name: 'Professor Hoot',
  title: 'Professor of Advanced Bro-mantics',
  role: 'Zoner',
  color: '#8a55ff',
  weight: 88,
  power: 1.17,
  rig: { thigh: 20, shin: 18, torso: 34, head: 24, upper: 19, fore: 17, girth: 17, limb: 7, wep: 18, tail: 28 },
  stats: { walk: 8.6, dash: 15.5, run: 14, dashFrames: 11, airSpeed: 9.4, airAccel: 0.5, airFric: 0.1, groundFric: 0.8, grav: 0.58, fall: 10.5, ffall: 17, jump: 19.5, hop: 13, djump: 17.5, jumps: 2, squat: 4 },
  bio: 'Tenured archmage of the Library Peaks and the only professor of Advanced Bro-mantics in the known galaxy. Beamed aboard mid-lecture and still grading. Believes every bro deserves an A, a hug, and an Arcane Orb to the face, in that order.',
  line: 'Whooo’s a good bro? Statistically, you.',
  taunt: 'Opens the spellbook to a chapter titled MY BROS and reads it aloud, one wing raised. It is a very long chapter.',
  wins: ['Class dismissed. You get an A in being my bro.', 'I have peer-reviewed your combo game. Verdict: adorable.', 'Office hours are always open for you, bro. Bring snacks. Bring yourself.'],
  moveNames: { nspec: 'Arcane Orb', sspec: 'Homing Quill', uspec: 'Blink', dspec: 'Tome Barrier', ult: 'Final Exam' },
  projs: {
    orb: { kind: 'hootOrb', r: 12, life: 74, vx: 11.5, hit: { dmg: 6, ang: 361, bkb: 22, kbg: 54, fx: 'magic' }, chargeable: true },
    quill: { kind: 'quill', r: 9, life: 80, vx: 12, homing: 2.6, hit: { dmg: 4.5, ang: 48, bkb: 30, kbg: 36, fx: 'slash' } },
    exam: {
      kind: 'exam',
      r: 20,
      life: 104,
      ghost: true,
      pierce: true,
      hit: { dmg: 0, ang: 90, bkb: 0, kbg: 0 },
      pulse: { every: 9, r: 640, hit: { dmg: 1.8, ang: 90, bkb: 32, kbg: 8, fx: 'magic', unblockable: true } },
      fuse: 96,
      explode: { r: 660, hit: { dmg: 16, ang: 88, bkb: 62, kbg: 112, fx: 'magic', unblockable: true } },
    },
  },
  // Owl rule: his big face is in front of the shoulder, so raised wings go up BEHIND the head (armF > 185), and
  // the library poses that lift the front arm across the face are overridden here.
  poses: {
    idle: { lean: 4, armF: 16, foreF: 58, armB: -8, foreB: 50, legF: 8, shinF: 10, legB: -8, shinB: 10, tail: 40 },
    /** double-jump wing flap (the engine shows 'tuck' for air jumps; noflip below stops the somersault) */
    tuck: { lean: 6, armF: 205, foreF: 14, armB: 195, foreB: 14, legF: 40, shinF: 70, legB: 24, shinB: 70 },
    fall: { lean: 2, armF: 74, foreF: 26, armB: -72, foreB: 20, legF: 20, shinF: 30, legB: -14, shinB: 40 },
    helpless: { lean: -8, head: -14, armF: 205, foreF: 12, armB: 190, foreB: 12, legF: 12, shinF: 22, legB: -12, shinB: 22 },
    ledge: { lean: 0, head: -10, armF: 192, foreF: 0, armB: 184, foreB: 0, legF: 22, shinF: 42, legB: -12, shinB: 32 },
    hurt: { lean: -26, head: -22, armF: 205, foreF: 30, armB: 160, foreB: 30, legF: 32, shinF: 42, legB: -12, shinB: 32 },
    hurtBig: { lean: -42, head: -32, armF: 215, foreF: 10, armB: 175, foreB: 10, legF: 42, shinF: 30, legB: -32, shinB: 30 },
    grabbed: { lean: -10, head: -20, armF: 205, foreF: 40, armB: 190, foreB: 40, legF: 20, shinF: 50, legB: -10, shinB: 50 },
    airdodge: { lean: 0, armF: 60, foreF: 115, armB: 54, foreB: 120, legF: 30, shinF: 60, legB: 10, shinB: 60 },
    shield: { lean: 12, armF: 50, foreF: 55, armB: 44, foreB: 60, legF: 32, shinF: 42, legB: -26, shinB: 32 },
    teeter: { lean: -6, armF: 205, foreF: -20, armB: 192, foreB: -20, legF: 6, shinF: 6, legB: -16, shinB: 6 },
    wingsUp: { lean: -6, armF: 196, foreF: 8, wep: 0, armB: 182, foreB: 10, legF: 14, shinF: 18, legB: -12, shinB: 22 },
    wingSpread: { lean: 0, armF: 100, foreF: 0, armB: -100, foreB: 0, legF: 34, shinF: 60, legB: -30, shinB: 60 },
    wrap: { lean: 8, armF: 62, foreF: 125, armB: 56, foreB: 125, legF: 40, shinF: 70, legB: 20, shinB: 70 },
    // book swings (the tome rides the front wing; wep 0 = continues the forearm)
    bookRaise: { lean: -14, armF: 205, foreF: 25, wep: 30, armB: 40, foreB: 60, legF: 20, shinF: 18, legB: -24, shinB: 14 },
    bookSwat: { lean: 26, armF: 84, foreF: -6, wep: -6, armB: -30, foreB: 50, legF: 36, shinF: 22, legB: -30, shinB: 8 },
    tomeThrust: { lean: 18, armF: 90, foreF: 2, wep: 60, armB: 30, foreB: 70, legF: 34, shinF: 18, legB: -30, shinB: 10 },
    tomeWind: { lean: -20, armF: 218, foreF: 40, wep: 40, armB: -24, foreB: 60, legF: 20, shinF: 34, legB: -36, shinB: 20 },
    tomeBlast: { lean: 30, armF: 92, foreF: -4, wep: 62, armB: -44, foreB: 30, legF: 52, shinF: 30, legB: -48, shinB: 6 },
    bookSlam: { lean: 50, head: -6, armF: 70, foreF: -10, wep: -40, armB: 40, foreB: 40, legF: 64, shinF: 86, legB: -26, shinB: 64 },
    barrier: { lean: 6, armF: 72, foreF: 8, wep: 90, armB: 66, foreB: 60, legF: 26, shinF: 26, legB: -22, shinB: 20 },
    // casting
    orbCharge: { lean: 12, armF: 70, foreF: 78, armB: 62, foreB: 88, legF: 26, shinF: 28, legB: -20, shinB: 20 },
    orbFire: { lean: 22, armF: 96, foreF: 0, armB: 74, foreB: 18, legF: 34, shinF: 20, legB: -28, shinB: 10 },
    quillWind: { lean: -12, armF: 200, foreF: 50, armB: 30, foreB: 60, legF: 22, shinF: 24, legB: -24, shinB: 16 },
    quillFling: { lean: 22, armF: 70, foreF: -12, armB: -30, foreB: 40, legF: 36, shinF: 20, legB: -32, shinB: 8 },
    lecture: { lean: -10, head: -8, armF: 196, foreF: 6, wep: 0, armB: 120, foreB: 40, legF: 18, shinF: 30, legB: -14, shinB: 30 },
    // body
    glide: { lean: 44, head: -28, armF: -98, foreF: 0, armB: -110, foreB: 0, legF: 76, shinF: 6, legB: 56, shinB: 10 },
    talonsBack: { lean: 34, head: 8, armF: 130, foreF: 20, armB: 120, foreB: 20, legF: -82, shinF: 14, legB: -102, shinB: 4 },
    talonsDown: { lean: 2, armF: 198, foreF: 10, armB: 186, foreB: 10, legF: 6, shinF: 0, legB: -6, shinB: 0 },
  },
  base: {
    noflip: [],
    idle: [
      [0, 'idle'],
      [30, ['idle', { y: 1.6, armF: 22, foreF: 54, armB: -4, lean: 5.5 }], 'io'],
      [60, 'idle', 'io'],
    ],
    // a proud little waddle
    walk: [
      [0, { lean: 6, armF: 34, foreF: 40, armB: 18, foreB: 40, legF: 22, shinF: 8, legB: -16, shinB: 22, y: 0 }],
      [7, { lean: 9, armF: 26, foreF: 44, armB: 26, foreB: 44, legF: 0, shinF: 30, legB: 0, shinB: 6, y: 3 }, 'io'],
      [14, { lean: 6, armF: 18, foreF: 40, armB: 34, foreB: 40, legF: -16, shinF: 22, legB: 22, shinB: 8, y: 0 }, 'io'],
      [21, { lean: 9, armF: 26, foreF: 44, armB: 26, foreB: 44, legF: 0, shinF: 6, legB: 0, shinB: 30, y: 3 }, 'io'],
      [28, { lean: 6, armF: 34, foreF: 40, armB: 18, foreB: 40, legF: 22, shinF: 8, legB: -16, shinB: 22, y: 0 }, 'io'],
    ],
    // wings swept back, half-flying run
    run: [
      [0, { lean: 28, head: -10, armF: -78, foreF: 8, armB: -92, foreB: 8, legF: 50, shinF: 30, legB: -34, shinB: 60, y: 2 }],
      [5, { lean: 30, head: -10, armF: -108, foreF: 0, armB: -122, foreB: 0, legF: 4, shinF: 70, legB: 4, shinB: 20, y: 7 }, 'io'],
      [10, { lean: 28, head: -10, armF: -78, foreF: 8, armB: -92, foreB: 8, legF: -34, shinF: 60, legB: 50, shinB: 30, y: 2 }, 'io'],
      [15, { lean: 30, head: -10, armF: -108, foreF: 0, armB: -122, foreB: 0, legF: 4, shinF: 20, legB: 4, shinB: 70, y: 7 }, 'io'],
      [20, { lean: 28, head: -10, armF: -78, foreF: 8, armB: -92, foreB: 8, legF: 50, shinF: 30, legB: -34, shinB: 60, y: 2 }, 'io'],
    ],
    jump: [[0, { lean: 0, armF: 202, foreF: 10, armB: 190, foreB: 10, legF: 30, shinF: 50, legB: -10, shinB: 40 }]],
    // slow, floaty wing beats (front wing forward, back wing behind)
    fall: [
      [0, 'fall'],
      [14, ['fall', { armF: 96, armB: -96, foreF: 10, foreB: 10 }], 'io'],
      [28, 'fall', 'io'],
    ],
    // reads the MY BROS chapter aloud, the other wing raised like a lecturer
    taunt: [
      [0, { lean: 2, head: -4, armF: 80, foreF: 30, wep: -20, armB: 190, foreB: 20 }],
      [15, { lean: -2, head: 8, armF: 82, foreF: 32, wep: -20, armB: 206, foreB: 10, y: 2 }, 'io'],
      [30, { lean: 2, head: -4, armF: 80, foreF: 30, wep: -20, armB: 190, foreB: 20 }, 'io'],
      [45, { lean: -2, head: 8, armF: 82, foreF: 32, wep: -20, armB: 206, foreB: 10, y: 2 }, 'io'],
      [60, { lean: 2, head: -4, armF: 80, foreF: 30, wep: -20, armB: 190, foreB: 20 }, 'io'],
    ],
  },
  moves: {
    // ---------------------------------------------------------------- ground
    jab1: {
      frames: 18,
      hits: [{ f: [3, 4], at: 'handF', r: 14, dmg: 2.5, ang: 361, bkb: 18, kbg: 25, fx: 'wind' }],
      next: [{ move: 'jab2', from: 4, to: 16 }],
      anim: [[0, 'jabWind'], [3, ['jab1', { foreF: 6 }]], [10, 'jab1'], [18, 'ready']],
    },
    jab2: {
      frames: 18,
      hits: [{ f: [3, 4], at: 'handB', r: 14, dmg: 2, ang: 361, bkb: 18, kbg: 25, fx: 'wind' }],
      next: [{ move: 'jab3', from: 4, to: 16 }],
      anim: [[0, 'jab1'], [3, 'jab2'], [10, 'jab2'], [18, 'ready']],
    },
    // pop quiz: the tome bonks you on the head
    jab3: {
      frames: 30,
      hits: [
        { f: [6, 8], at: 'wep', r: 21, dmg: 5, ang: 45, bkb: 45, kbg: 90, fx: 'magic' },
        { f: [6, 8], at: 'handF', r: 13, dmg: 4, ang: 45, bkb: 42, kbg: 86, fx: 'magic' },
      ],
      anim: [[0, 'jab2'], [3, 'bookRaise'], [6, 'bookSwat'], [14, 'bookSwat'], [30, 'idle']],
      sfx: [[6, 'thud']],
    },
    // Page Turner: thrusts the open tome, pages burst out
    ftilt: {
      frames: 27,
      hits: [
        { f: [7, 9], at: 'wep', x: 8, r: 23, dmg: 8.5, ang: 361, bkb: 22, kbg: 92, fx: 'magic' },
        { f: [7, 9], at: 'handF', r: 14, dmg: 7, ang: 361, bkb: 22, kbg: 90, fx: 'magic' },
      ],
      anim: [[0, 'ready'], [4, ['tomeThrust', { armF: 44, foreF: 80, wep: 90, lean: -6 }]], [7, 'tomeThrust'], [13, 'tomeThrust'], [27, 'idle']],
      sfx: [[7, 'magic']],
    },
    // Wing Arc: a big wing sweep over the head, front to back
    utilt: {
      frames: 30,
      hits: [
        { f: [6, 11], at: 'handF', r: 18, dmg: 7, ang: 96, bkb: 26, kbg: 118, fx: 'wind' },
        { f: [6, 11], at: 'elbowF', r: 13, dmg: 6, ang: 96, bkb: 26, kbg: 112, fx: 'wind' },
      ],
      anim: [
        [0, ['uppercutWind', { armF: -10, foreF: 30 }]],
        [6, ['uppercut', { armF: 112, foreF: 0, lean: -2 }]],
        [9, ['uppercut', { armF: 172, foreF: 0 }]],
        [12, ['uppercut', { armF: 228, foreF: 6, lean: -16 }]],
        [20, ['uppercut', { armF: 200, foreF: 30, lean: -8 }]],
        [30, 'idle'],
      ],
      sfx: [[6, 'whiff']],
    },
    // Talon Flick
    dtilt: {
      frames: 22,
      hits: [{ f: [5, 7], at: 'footF', r: 15, dmg: 6, ang: 76, bkb: 32, kbg: 70 }],
      anim: [[0, 'crouch'], [5, ['kickLow', { legF: 84 }]], [10, 'kickLow'], [22, 'crouch']],
    },
    // Night Swoop: a low glide, talons first
    dash: {
      frames: 36,
      vel: [{ f: [1, 5], vx: 12 }, { f: [6, 16], vx: 12.5 }, { f: [17, 36], vx: 2.5 }],
      hits: [
        { f: [6, 11], at: 'footF', r: 19, dmg: 9, ang: 62, bkb: 56, kbg: 60 },
        { f: [6, 11], at: 'footB', r: 16, dmg: 8, ang: 62, bkb: 54, kbg: 58 },
        { f: [12, 17], at: 'footF', r: 15, dmg: 5.5, ang: 62, bkb: 40, kbg: 40 },
      ],
      anim: [[0, 'dash'], [5, 'glide'], [17, 'glide'], [36, 'idle']],
      sfx: [[5, 'whiff']],
    },
    // Thesis Defense: tome raised behind the head, then a rune blast point-blank
    fsmash: {
      frames: 46,
      charge: 10,
      hits: [
        { f: [14, 16], at: 'handF', x: 32, y: 4, r: 30, dmg: 17.5, ang: 361, bkb: 30, kbg: 101, fx: 'magic' },
        { f: [14, 16], at: 'handF', r: 18, dmg: 15, ang: 361, bkb: 30, kbg: 98, fx: 'magic' },
      ],
      anim: [[0, 'ready'], [7, 'tomeWind'], [10, ['tomeWind', { lean: -24, armF: 224 }]], [14, 'tomeBlast'], [24, 'tomeBlast'], [46, 'idle']],
      sfx: [[14, 'magic'], [14, 'boom']],
    },
    // Starlight Pillar: three quick hits then a launcher out of the top
    usmash: {
      frames: 44,
      charge: 6,
      hits: [
        { f: [10, 10], at: 'head', y: 46, r: 30, dmg: 2.2, ang: 90, bkb: 30, kbg: 20, fx: 'magic' },
        { f: [12, 12], at: 'head', y: 46, r: 30, dmg: 2.2, ang: 90, bkb: 30, kbg: 20, fx: 'magic', grp: 1 },
        { f: [14, 14], at: 'head', y: 46, r: 30, dmg: 2.2, ang: 90, bkb: 30, kbg: 20, fx: 'magic', grp: 2 },
        { f: [16, 18], at: 'head', y: 56, r: 34, dmg: 9, ang: 90, bkb: 34, kbg: 104, fx: 'magic', grp: 3 },
        { f: [16, 18], at: 'head', y: 110, r: 28, dmg: 8, ang: 90, bkb: 32, kbg: 100, fx: 'magic', grp: 3 },
      ],
      anim: [[0, 'ready'], [6, ['upSmashWind', { wep: 40 }]], [10, 'wingsUp'], [20, 'wingsUp'], [44, 'idle']],
      sfx: [[10, 'magic'], [16, 'zap']],
    },
    // Rune Quake: slams the tome on the floor, runes ripple out both ways
    dsmash: {
      frames: 44,
      charge: 5,
      hits: [
        { f: [12, 14], at: 'hip', x: 54, y: -22, r: 30, dmg: 13, ang: 30, bkb: 30, kbg: 95, fx: 'magic' },
        { f: [12, 14], at: 'hip', x: -54, y: -22, r: 30, dmg: 13, ang: 150, bkb: 30, kbg: 95, fx: 'magic' },
        { f: [15, 18], at: 'hip', x: 104, y: -22, r: 26, dmg: 10, ang: 35, bkb: 28, kbg: 90, fx: 'magic' },
        { f: [15, 18], at: 'hip', x: -104, y: -22, r: 26, dmg: 10, ang: 145, bkb: 28, kbg: 90, fx: 'magic' },
      ],
      anim: [[0, 'crouch'], [5, ['bookRaise', { lean: -6 }]], [9, ['bookRaise', { lean: -12, armF: 214 }]], [12, 'bookSlam'], [26, 'bookSlam'], [44, 'idle']],
      sfx: [[12, 'thud'], [12, 'magic']],
    },
    // ---------------------------------------------------------------- air
    // Feather Whirl
    nair: {
      frames: 36,
      air: true,
      landLag: 7,
      autoCancel: [3, 30],
      hits: [
        { f: [4, 7], at: 'handF', r: 18, dmg: 8, ang: 361, bkb: 18, kbg: 100, fx: 'wind' },
        { f: [4, 7], at: 'handB', r: 18, dmg: 8, ang: 361, bkb: 18, kbg: 100, fx: 'wind' },
        { f: [4, 7], at: 'hip', y: 22, r: 26, dmg: 7, ang: 361, bkb: 18, kbg: 96, fx: 'wind' },
        { f: [8, 20], at: 'handF', r: 15, dmg: 5, ang: 361, bkb: 10, kbg: 90, fx: 'wind' },
        { f: [8, 20], at: 'handB', r: 15, dmg: 5, ang: 361, bkb: 10, kbg: 90, fx: 'wind' },
      ],
      anim: [[0, 'wrap'], [4, ['wingSpread', { rot: 0 }]], [12, ['wingSpread', { rot: -180 }], 'lin'], [20, ['wingSpread', { rot: -360 }], 'lin'], [36, ['fall', { rot: -360 }]]],
    },
    // Wing Slap: an overhand forward wing swat
    fair: {
      frames: 40,
      air: true,
      landLag: 11,
      autoCancel: [3, 34],
      hits: [
        { f: [9, 12], at: 'handF', r: 19, dmg: 12, ang: 40, bkb: 34, kbg: 98, fx: 'wind' },
        { f: [9, 12], at: 'elbowF', r: 14, dmg: 10, ang: 40, bkb: 30, kbg: 95, fx: 'wind' },
      ],
      anim: [
        [0, ['fall', { armF: 200, foreF: 20 }]],
        [8, ['fairWind', { armF: 218, foreF: 30, lean: -16 }]],
        [10, ['fair', { armF: 142, foreF: 0, lean: 20 }]],
        [12, ['fair', { armF: 72, foreF: -6, lean: 32 }]],
        [20, ['fair', { armF: 50, foreF: 0, lean: 26 }]],
        [40, 'fall'],
      ],
      sfx: [[9, 'whiff']],
    },
    // Double Talon: both feet kick out behind (sends backward)
    bair: {
      frames: 34,
      air: true,
      landLag: 9,
      autoCancel: [3, 28],
      hits: [
        { f: [7, 10], at: 'footB', r: 18, dmg: 12.5, ang: 145, bkb: 20, kbg: 100 },
        { f: [7, 10], at: 'footF', r: 17, dmg: 12, ang: 145, bkb: 20, kbg: 98 },
        { f: [7, 10], at: 'kneeB', r: 12, dmg: 9, ang: 145, bkb: 18, kbg: 90 },
      ],
      anim: [[0, 'wrap'], [5, ['talonsBack', { legF: -40, legB: -60, shinF: 80, shinB: 80 }]], [7, 'talonsBack'], [15, 'talonsBack'], [34, 'fall']],
      sfx: [[7, 'whiff']],
    },
    // Moonlit Flap: both wings beat upward
    uair: {
      frames: 32,
      air: true,
      landLag: 8,
      autoCancel: [3, 26],
      hits: [
        { f: [5, 10], at: 'handF', r: 18, dmg: 8.5, ang: 84, bkb: 26, kbg: 110, fx: 'wind' },
        { f: [5, 10], at: 'handB', r: 17, dmg: 8, ang: 96, bkb: 26, kbg: 108, fx: 'wind' },
      ],
      anim: [
        [0, { lean: 6, armF: 42, foreF: 60, armB: 34, foreB: 60, legF: 26, shinF: 50, legB: -8, shinB: 50 }],
        [5, { lean: -4, armF: 124, foreF: 10, armB: 112, foreB: 10, legF: 22, shinF: 40, legB: -8, shinB: 40 }],
        [8, { lean: -10, armF: 176, foreF: 0, armB: 168, foreB: 0, legF: 18, shinF: 30, legB: -10, shinB: 30 }],
        [12, { lean: -14, armF: 206, foreF: 10, armB: 198, foreB: 10, legF: 18, shinF: 30, legB: -10, shinB: 30 }],
        [32, 'fall'],
      ],
      sfx: [[5, 'whiff']],
    },
    // Talon Drop: a stomp straight down (meteor early)
    dair: {
      frames: 42,
      air: true,
      landLag: 15,
      autoCancel: [3, 36],
      hits: [
        { f: [13, 15], at: 'footF', r: 17, dmg: 13, ang: 270, bkb: 20, kbg: 85 },
        { f: [13, 15], at: 'footB', r: 16, dmg: 13, ang: 270, bkb: 20, kbg: 85 },
        { f: [16, 22], at: 'footF', r: 14, dmg: 8, ang: 361, bkb: 20, kbg: 70 },
      ],
      anim: [[0, ['dairWind', { armF: 196, armB: 186 }]], [12, ['dairWind', { armF: 202, armB: 192 }]], [14, 'talonsDown'], [22, 'talonsDown'], [42, 'fall']],
      sfx: [[13, 'whiff']],
    },
    // ---------------------------------------------------------------- grabs and throws
    grab: {
      frames: 30,
      hits: [{ f: [7, 8], at: 'handF', r: 17, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'ready'], [7, 'grab'], [13, 'grab'], [30, 'idle']],
    },
    dashgrab: {
      frames: 38,
      vel: [{ f: [1, 10], vx: 8 }, { f: [11, 38], vx: 1 }],
      hits: [{ f: [9, 11], at: 'handF', r: 19, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'dash'], [9, 'grab'], [17, 'grab'], [38, 'idle']],
    },
    // a stern little peck
    pummel: { frames: 16, pummel: 1.4, anim: [[0, 'hold'], [4, ['hold', { head: 34, lean: 22 }]], [16, 'hold']] },
    // Pop Quiz: the tome, again
    fthrow: {
      frames: 30,
      throw: { release: 12, hit: { dmg: 9, ang: 42, bkb: 62, kbg: 62, fx: 'magic' } },
      anim: [[0, 'hold'], [6, 'bookRaise'], [11, 'bookSwat'], [30, 'idle']],
      sfx: [[12, 'thud']],
    },
    bthrow: {
      frames: 34,
      throw: { release: 14, holdAt: 'handF', hit: { dmg: 10.5, ang: 140, bkb: 60, kbg: 74, fx: 'wind' } },
      anim: [[0, 'hold'], [6, ['throwF', { rot: -90 }]], [12, ['throwB', { rot: -200 }]], [16, ['throwB', { rot: -340 }]], [34, ['idle', { rot: -360 }]]],
    },
    // Levitation Lecture: floats them overhead and blasts them up
    uthrow: {
      frames: 36,
      throw: { release: 16, holdAt: 'handF', hy: 20, hit: { dmg: 8, ang: 90, bkb: 72, kbg: 70, fx: 'magic' } },
      anim: [[0, 'hold'], [8, 'orbCharge'], [14, 'wingsUp'], [24, 'wingsUp'], [36, 'idle']],
      sfx: [[16, 'magic']],
    },
    dthrow: {
      frames: 36,
      throw: { release: 17, hit: { dmg: 6, ang: 72, bkb: 60, kbg: 42 } },
      anim: [[0, 'hold'], [8, 'throwDown'], [11, ['throwDown', { head: 40 }]], [14, 'throwDown'], [17, ['throwDown', { head: 40 }]], [36, 'idle']],
    },
    ledgeatk: {
      frames: 50,
      hits: [{ f: [18, 21], at: 'handF', r: 20, dmg: 9, ang: 361, bkb: 45, kbg: 45, fx: 'wind' }],
      anim: [[0, 'climb'], [14, ['ready', { armF: 200, foreF: 20 }]], [18, ['jab1', { armF: 100 }]], [26, 'jab1'], [50, 'idle']],
    },
    getupatk: {
      frames: 44,
      hits: [
        { f: [14, 16], at: 'handF', r: 18, dmg: 7, ang: 361, bkb: 50, kbg: 40, fx: 'wind' },
        { f: [22, 24], at: 'handB', r: 18, dmg: 7, ang: 150, bkb: 50, kbg: 40, fx: 'wind', grp: 1 },
      ],
      anim: [[0, 'lying'], [12, ['wingSpread', { lean: 30 }]], [16, ['wingSpread', { lean: 30, armF: 96 }]], [24, ['wingSpread', { lean: 30, armF: 60, armB: -130 }]], [44, 'idle']],
    },
    // ---------------------------------------------------------------- specials
    // Arcane Orb: hold to charge, shield (or jump in the air) to store, fire later
    nspec: {
      frames: 60,
      chargeB: { at: 10, max: 80, release: 'nspecFire' },
      anim: [[0, 'castWind'], [10, 'orbCharge'], [60, 'orbCharge']],
    },
    nspecFire: {
      frames: 28,
      shots: [{ f: 4, proj: 'orb', at: 'handF', x: 14, y: 2 }],
      anim: [[0, 'orbCharge'], [3, 'orbFire'], [14, 'orbFire'], [28, 'idle']],
      sfx: [[4, 'magic']],
    },
    nspecAir: {
      frames: 60,
      chargeB: { at: 10, max: 80, release: 'nspecFireAir' },
      vel: [{ f: [1, 60], grav: 0.55 }],
      anim: [[0, 'castWind'], [10, 'orbCharge'], [60, 'orbCharge']],
    },
    nspecFireAir: {
      frames: 30,
      shots: [{ f: 4, proj: 'orb', at: 'handF', x: 14, y: 2 }],
      anim: [[0, 'orbCharge'], [3, 'orbFire'], [14, 'orbFire'], [30, 'fall']],
      sfx: [[4, 'magic']],
    },
    // Homing Quill: two flicked feathers that steer toward the nearest bro
    sspec: {
      frames: 36,
      reverse: true,
      shots: [
        { f: 11, proj: 'quill', at: 'handF', x: 8, y: 4, vy: 3.5 },
        { f: 15, proj: 'quill', at: 'handF', x: 8, y: -2, vy: -1.5 },
      ],
      anim: [[0, 'ready'], [6, 'quillWind'], [11, 'quillFling'], [13, ['quillWind', { armF: 196 }]], [15, 'quillFling'], [22, 'quillFling'], [36, 'idle']],
      sfx: [[11, 'whiff'], [15, 'whiff']],
    },
    sspecAir: {
      frames: 38,
      reverse: true,
      vel: [{ f: [1, 18], grav: 0.5 }],
      shots: [
        { f: 11, proj: 'quill', at: 'handF', x: 8, y: 4, vy: 3.5 },
        { f: 15, proj: 'quill', at: 'handF', x: 8, y: -2, vy: -1.5 },
      ],
      anim: [[0, 'fall'], [6, 'quillWind'], [11, 'quillFling'], [13, ['quillWind', { armF: 196 }]], [15, 'quillFling'], [22, 'quillFling'], [38, 'fall']],
      sfx: [[11, 'whiff'], [15, 'whiff']],
    },
    // Blink: vanish, streak 8 frames in any stick direction (default up), reappear with a burst
    uspec: {
      frames: 42,
      helpless: true,
      landHelpless: 22,
      ledgeFrom: 14,
      intang: [1, 15],
      script: 'hoot:blink',
      aim: true,
      vel: [{ f: [1, 5], vx: 0, vy: 0, grav: 0 }, { f: [6, 13], grav: 0, noDrift: true }, { f: [14, 18], grav: 0.3 }],
      hits: [{ f: [14, 16], at: 'hip', y: 26, r: 36, dmg: 6, ang: 80, bkb: 55, kbg: 62, fx: 'magic' }],
      anim: [[0, 'castWind'], [4, 'wrap'], [13, 'wrap'], [15, ['wingsUp', { lean: -8 }]], [24, 'helpless'], [42, 'helpless']],
      sfx: [[6, 'magic'], [14, 'zap']],
    },
    // Tome Barrier: the book opens into a rune shield that reflects projectiles
    dspec: {
      frames: 36,
      reflect: { f: [4, 22], r: 54, at: 'hip', x: 26, y: 40, mult: 1.4 },
      hits: [{ f: [4, 6], at: 'hip', x: 30, y: 40, r: 42, dmg: 5, ang: 50, bkb: 60, kbg: 30, fx: 'magic' }],
      anim: [[0, 'castWind'], [4, 'barrier'], [22, 'barrier'], [36, 'idle']],
      sfx: [[4, 'shield']],
    },
    dspecAir: {
      frames: 36,
      vel: [{ f: [1, 22], grav: 0.25 }],
      reflect: { f: [4, 22], r: 54, at: 'hip', x: 26, y: 40, mult: 1.4 },
      hits: [{ f: [4, 6], at: 'hip', x: 30, y: 40, r: 42, dmg: 5, ang: 50, bkb: 60, kbg: 30, fx: 'magic' }],
      anim: [[0, 'castWind'], [4, 'barrier'], [22, 'barrier'], [36, 'fall']],
      sfx: [[4, 'shield']],
    },
    // Final Exam: rises, opens the tome overhead; a stage-sized spell circle quizzes everyone, then the pillar
    ult: {
      frames: 120,
      ult: true,
      script: 'hoot:ult',
      vel: [{ f: [1, 18], vx: 0, vy: 3.5, grav: 0, noDrift: true }, { f: [19, 100], vx: 0, vy: 0, grav: 0, noDrift: true }],
      anim: [[0, 'lecture'], [18, 'lecture'], [28, 'wingsUp'], [84, 'wingsUp'], [96, ['lecture', { armF: 120, foreF: 0, wep: 60, lean: 10 }]], [120, 'idle']],
      sfx: [[2, 'magic'], [96, 'boom']],
    },
  },
};

registerScripts({
  // Blink: read the stick on frame 6, streak that way for 8 frames (physics handles walls and floors)
  'hoot:blink': (st, f) => {
    if (f.mf === 6) {
      const x = sx(f);
      const y = sy(f);
      const mag = Math.sqrt(x * x + y * y);
      let dx = 0;
      let dy = 1;
      if (mag >= 30) {
        dx = x / mag;
        dy = y / mag;
      }
      if (Math.abs(dx) > 0.2) f.facing = dx > 0 ? 1 : -1;
      f.v[1] = dx;
      f.v[2] = dy;
      // the art draws the vanishing point and the streak from here
      f.v[3] = f.x;
      f.v[4] = f.y;
    }
    if (f.mf >= 6 && f.mf <= 13) {
      // the teleport is his recovery: its speed follows the balance recovery multiplier (D25)
      const spd = BLINK_SPD * (cfOf(f).def.recovery ?? 1);
      f.vx = f.v[1] * spd;
      f.vy = -f.v[2] * spd * f.grav;
      f.kx = 0;
      f.ky = 0;
    } else if (f.mf === 14) {
      f.vx = f.v[1] * 5;
      f.vy = -f.v[2] * 5 * f.grav;
    }
  },
  // Final Exam: the spell circle appears over the middle of the main stage
  'hoot:ult': (st, f) => {
    if (f.mf !== 2) return;
    const s = surfs(st)[0];
    if (!s) return;
    const pk = cfOf(f).projIdx.exam;
    if (pk === undefined) return;
    const p = spawnProj(st, f, pk, (s.x1 + s.x2) / 2, s.y1 - 220, 0, 0);
    p.vx = 0;
    p.vy = 0;
  },
});
