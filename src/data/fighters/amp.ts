// Amp — the rockstar bruiser. Punk rocker from Volume City who swings an axe-shaped electric guitar. Power-chord
// soundwaves, a crowd-surfing stage dive, a whirling feedback riff, and a speaker that keeps the show going.
import { ev } from '../../sim/events';
import { POSES } from '../../sim/poses';
import { cfOf } from '../../sim/fighter';
import { spawnProj } from '../../sim/projectiles';
import { registerScripts } from '../../sim/scripts';
import { STAGES } from '../../sim/data';
import type { FighterDef } from '../../sim/types';

export const amp: FighterDef = {
  id: 'amp',
  name: 'Amp',
  title: 'This Song’s About My Bro (They All Are)',
  role: 'Rockstar bruiser',
  color: '#ff3a8c',
  weight: 102,
  power: 0.99,
  passive: 'amp:passive',
  rig: { thigh: 26, shin: 26, torso: 38, head: 20, upper: 21, fore: 19, girth: 16, limb: 7.5, wep: 58 },
  stats: { walk: 9, dash: 16.5, run: 15, dashFrames: 11, airSpeed: 9.6, airAccel: 0.5, airFric: 0.12, groundFric: 0.85, grav: 0.82, fall: 14.5, ffall: 22, jump: 21, hop: 14, djump: 19.5, jumps: 1, squat: 3 },
  bio: 'Front-bro of the one-piece punk band THE BROMANTICS. Has written 4,000 songs, all of them about how great his bros are. Was beamed aboard mid-stage-dive and has not technically landed yet. Plays every match at full volume.',
  line: 'One, two, three, four — I LOVE YOU BRO —',
  taunt: 'Shreds an air-splitting solo, points at you, mouths “THIS ONE’S FOR YOU”.',
  wins: ['Thank you, goodnight, I’ll call you tomorrow bro.', 'That was our last song! Encore? ENCORE? Okay you can’t get up. Next time!', 'Wrote a ballad about this fight. It’s called “Bro, You Were Robbed (By Me)”.'],
  moveNames: { nspec: 'Power Chord', sspec: 'Stage Dive', uspec: 'Feedback Riff', dspec: 'Amp Drop', ult: 'Encore' },
  projs: {
    chord: { kind: 'ampChord', r: 26, life: 46, vx: 10, pierce: true, hit: { dmg: 8, ang: 40, bkb: 40, kbg: 62, fx: 'sound' } },
    speaker: {
      kind: 'ampSpeaker',
      r: 30,
      life: 600,
      vy: 0,
      grav: 0.9,
      stick: true,
      hp: 30,
      reflectable: false,
      pulse: { every: 48, r: 118, hit: { dmg: 4, ang: 55, bkb: 50, kbg: 40, fx: 'sound' } },
      hit: { dmg: 0, ang: 0, bkb: 0, kbg: 0 },
    },
    encore: {
      kind: 'ampWall',
      r: 40,
      life: 100,
      ghost: true,
      reflectable: false,
      pulse: { every: 14, r: 1050, hit: { dmg: 3, ang: 82, bkb: 32, kbg: 10, fx: 'sound', unblockable: true, hitlag: 0.5 } },
      hit: { dmg: 0, ang: 0, bkb: 0, kbg: 0 },
      fuse: 96,
      explode: { r: 1300, hit: { dmg: 17, ang: 55, bkb: 75, kbg: 108, fx: 'sound', unblockable: true } },
    },
  },
  poses: {
    // arms-up states hold the guitar straight up so it never covers the face
    hurt: { ...POSES.hurt, wep: 4 },
    hurtBig: { ...POSES.hurtBig, wep: 4 },
    airdodge: { ...POSES.airdodge, wep: 0 },
    ledge: { ...POSES.ledge, wep: 0 },
    helpless: { ...POSES.helpless, wep: 0 },
    tumble: { ...POSES.tumble, wep: 0 },
    grabbed: { ...POSES.grabbed, wep: 0 },
    taunt: { ...POSES.taunt, head: -20, wep: 0 },
    victory: { ...POSES.victory, wep: 0 },
    // the guitar planted on the floor like a resting battle-axe
    idle: { lean: 4, head: -4, armF: 28, foreF: 26, armB: -12, foreB: 40, legF: 14, shinF: 12, legB: -14, shinB: 12, wep: -40 },
    ready: { lean: 12, armF: 44, foreF: 80, armB: 40, foreB: 80, legF: 26, shinF: 30, legB: -22, shinB: 26, wep: -30 },
    fall: { lean: 2, armF: 112, foreF: 22, armB: 102, foreB: 22, legF: 22, shinF: 32, legB: -16, shinB: 42, wep: 40 },
    jump: { lean: 4, armF: 150, foreF: 10, armB: -42, foreB: 30, legF: 42, shinF: 62, legB: -12, shinB: 42, wep: 10, sy: 1.08, sx: 0.95 },
    crouch: { lean: 32, head: -12, armF: 45, foreF: 70, armB: 25, foreB: 60, legF: 75, shinF: 115, legB: 15, shinB: 115, sy: 0.96, wep: -30 },
    shield: { lean: 16, armF: 60, foreF: 90, armB: 62, foreB: 102, legF: 32, shinF: 42, legB: -26, shinB: 32, wep: -20 },
    // playing: neck forward in the fretting hand, body at the hip, strumming hand at the strings
    strum: { lean: 8, head: 8, armF: 74, foreF: 14, wep: -128, armB: 18, foreB: 76, legF: 24, shinF: 22, legB: -22, shinB: 18 },
    strum2: { lean: 10, head: 14, armF: 76, foreF: 14, wep: -128, armB: 32, foreB: 52, legF: 24, shinF: 22, legB: -22, shinB: 18 },
    rockOut: { lean: -18, head: -24, armF: 170, foreF: 0, wep: 0, armB: 150, foreB: 20, legF: 30, shinF: 10, legB: -30, shinB: 10 },
    kneeSlide: { lean: -26, head: -16, armF: 160, foreF: 10, wep: 30, armB: 130, foreB: 30, legF: 84, shinF: 150, legB: 4, shinB: 150 },
    dive: { rot: 72, lean: 6, head: -40, armF: 172, foreF: 0, wep: 0, armB: 160, foreB: 10, legF: -6, shinF: 30, legB: -18, shinB: 30 },
    spinOut: { lean: 0, armF: 92, foreF: 0, wep: 0, armB: -92, foreB: 0, legF: 30, shinF: 50, legB: -20, shinB: 50 },
    lowBack: { lean: 30, armF: -116, foreF: 0, wep: 6, armB: 40, foreB: 40, legF: 60, shinF: 80, legB: -30, shinB: 30 },
  },
  base: {
    taunt: [[0, 'strum'], [5, 'strum2'], [10, 'strum'], [15, 'strum2'], [20, 'strum'], [25, 'strum2'], [30, ['strum', { lean: -10, head: -10 }]], [36, ['jab1', { wep: -40, armF: 100, foreF: 0, head: 6 }]], [52, ['jab1', { wep: -40, armF: 100, foreF: 0, head: 6 }]], [60, 'idle']],
    run: [[0, { lean: 28, head: -6, armF: 26, foreF: 40, wep: 44, armB: 70, foreB: 80, legF: 70, shinF: 50, legB: -50, shinB: 90, y: 3 }], [9, { lean: 26, head: -6, armF: 32, foreF: 40, wep: 44, armB: -40, foreB: 80, legF: -40, shinF: 90, legB: 70, shinB: 50, y: 7 }, 'io'], [18, { lean: 28, head: -6, armF: 26, foreF: 40, wep: 44, armB: 70, foreB: 80, legF: 70, shinF: 50, legB: -50, shinB: 90, y: 3 }, 'io']],
    walk: [[0, { lean: 10, armF: 30, foreF: 50, armB: 10, foreB: 40, legF: 30, shinF: 14, legB: -24, shinB: 30, wep: 30, y: 0 }], [14, { lean: 10, head: 6, armF: 34, foreF: 50, armB: 30, foreB: 40, legF: -22, shinF: 30, legB: 28, shinB: 14, wep: 30, y: 2 }, 'io'], [28, { lean: 10, armF: 30, foreF: 50, armB: 10, foreB: 40, legF: 30, shinF: 14, legB: -24, shinB: 30, wep: 30, y: 0 }, 'io']],
  },
  moves: {
    jab1: {
      frames: 18,
      hits: [{ f: [3, 4], at: 'handB', r: 13, dmg: 2.5, ang: 361, bkb: 18, kbg: 25 }],
      next: [{ move: 'jab2', from: 4, to: 16 }],
      anim: [[0, ['jabWind', { wep: -40 }]], [3, ['jab2', { wep: -20 }]], [10, ['jab2', { wep: -20 }]], [18, 'ready']],
    },
    jab2: {
      frames: 18,
      hits: [
        { f: [4, 5], at: 'wepMid', r: 15, dmg: 2.5, ang: 361, bkb: 18, kbg: 25 },
        { f: [4, 5], at: 'handF', r: 12, dmg: 2.5, ang: 361, bkb: 18, kbg: 25 },
      ],
      next: [{ move: 'jab3', from: 5, to: 16 }],
      anim: [[0, ['jab2', { wep: -20 }]], [4, ['jab1', { wep: 20 }]], [10, ['jab1', { wep: 20 }]], [18, 'ready']],
    },
    jab3: {
      frames: 30,
      hits: [
        { f: [6, 8], at: 'wep', r: 18, dmg: 5, ang: 45, bkb: 45, kbg: 90, fx: 'sound' },
        { f: [6, 8], at: 'wepMid', r: 14, dmg: 4.5, ang: 45, bkb: 45, kbg: 88 },
      ],
      anim: [[0, 'swingWind'], [5, ['swingWind', { lean: -16 }]], [7, 'swing'], [14, 'swing'], [30, 'idle']],
      sfx: [[6, 'whiff']],
    },
    ftilt: {
      frames: 30,
      hits: [
        { f: [7, 9], at: 'wep', r: 18, dmg: 9.5, ang: 361, bkb: 22, kbg: 92, fx: 'sound' },
        { f: [7, 9], at: 'wepMid', r: 14, dmg: 8, ang: 361, bkb: 22, kbg: 90 },
      ],
      anim: [[0, 'idle'], [5, ['swingWind', { wep: 90 }]], [8, ['swing', { wep: 10 }]], [15, 'swing'], [30, 'idle']],
      sfx: [[7, 'whiff']],
    },
    utilt: {
      frames: 30,
      hits: [
        { f: [7, 12], at: 'wep', r: 19, dmg: 8, ang: 94, bkb: 26, kbg: 118, fx: 'sound' },
        { f: [7, 12], at: 'wepMid', r: 15, dmg: 7, ang: 94, bkb: 26, kbg: 114 },
      ],
      anim: [[0, 'swingUpWind'], [7, ['swingUp', { armF: 140 }]], [10, 'swingUp'], [13, ['swingUp', { armF: 200, wep: -10 }]], [30, 'idle']],
    },
    dtilt: {
      frames: 24,
      hits: [{ f: [6, 8], at: 'wep', r: 17, dmg: 6.5, ang: 28, bkb: 40, kbg: 74 }],
      anim: [[0, 'crouch'], [5, ['swingLow', { armF: 30, wep: 40 }]], [7, 'swingLow'], [12, 'swingLow'], [24, 'crouch']],
    },
    dash: {
      frames: 38,
      vel: [{ f: [1, 4], vx: 13 }, { f: [5, 18], vx: 11 }, { f: [19, 38], vx: 2 }],
      hits: [
        { f: [6, 11], at: 'kneeF', r: 20, dmg: 10, ang: 55, bkb: 58, kbg: 60, fx: 'sound' },
        { f: [6, 11], at: 'wep', r: 18, dmg: 9, ang: 70, bkb: 55, kbg: 60 },
        { f: [12, 18], at: 'kneeF', r: 16, dmg: 6, ang: 55, bkb: 40, kbg: 40 },
      ],
      anim: [[0, 'dash'], [5, 'kneeSlide'], [18, 'kneeSlide'], [26, ['kneeSlide', { lean: -10 }]], [38, 'idle']],
      sfx: [[6, 'dash']],
    },
    fsmash: {
      frames: 50,
      charge: 12,
      hits: [
        { f: [16, 18], at: 'wep', r: 23, dmg: 19, ang: 38, bkb: 32, kbg: 100, fx: 'elec' },
        { f: [16, 18], at: 'wepMid', r: 17, dmg: 16, ang: 38, bkb: 30, kbg: 98, fx: 'elec' },
      ],
      anim: [[0, 'ready'], [8, ['overheadWind', { wep: 50, lean: -26 }]], [12, ['overheadWind', { wep: 60, lean: -30, sy: 0.96 }]], [15, ['overhead', { wep: 20 }]], [17, ['overhead', { wep: -6, lean: 40 }]], [26, ['overhead', { wep: -6, lean: 40 }]], [50, 'idle']],
      sfx: [[16, 'smash'], [16, 'elec']],
    },
    usmash: {
      frames: 44,
      charge: 7,
      hits: [
        { f: [10, 15], at: 'wep', r: 24, dmg: 16, ang: 88, bkb: 32, kbg: 98, fx: 'sound' },
        { f: [10, 15], at: 'wepMid', r: 18, dmg: 14, ang: 88, bkb: 32, kbg: 96, fx: 'sound' },
      ],
      anim: [[0, 'ready'], [7, ['upSmashWind', { wep: 120 }]], [11, ['upSmash', { wep: 0, head: -30 }]], [19, ['upSmash', { wep: 0, head: -30 }]], [44, 'idle']],
      sfx: [[10, 'note']],
    },
    dsmash: {
      frames: 46,
      charge: 5,
      hits: [
        { f: [8, 10], at: 'wep', r: 20, dmg: 13, ang: 30, bkb: 30, kbg: 96, fx: 'sound' },
        { f: [8, 10], at: 'wepMid', r: 15, dmg: 11, ang: 30, bkb: 30, kbg: 92 },
        { f: [17, 19], at: 'wep', r: 20, dmg: 14, ang: 30, bkb: 30, kbg: 98, grp: 1, fx: 'sound', away: true },
        { f: [17, 19], at: 'wepMid', r: 15, dmg: 12, ang: 30, bkb: 30, kbg: 94, grp: 1, away: true },
      ],
      anim: [[0, 'crouch'], [5, ['swingWind', { lean: 10, legF: 60, shinF: 80, legB: -30, shinB: 40 }]], [9, 'swingLow'], [13, ['swingLow', { armF: 10 }]], [18, 'lowBack'], [26, 'lowBack'], [46, 'idle']],
    },
    nair: {
      frames: 36,
      air: true,
      landLag: 8,
      autoCancel: [3, 30],
      hits: [
        { f: [5, 8], at: 'wep', r: 18, dmg: 9, ang: 361, bkb: 18, kbg: 98, fx: 'sound' },
        { f: [5, 8], at: 'wepMid', r: 15, dmg: 8, ang: 361, bkb: 18, kbg: 96 },
        { f: [9, 20], at: 'wep', r: 16, dmg: 5.5, ang: 361, bkb: 10, kbg: 88 },
      ],
      anim: [[0, ['spinOut', { rot: 0, wep: 60 }]], [5, ['spinOut', { rot: 30 }]], [20, ['spinOut', { rot: 390 }], 'lin'], [36, ['fall', { rot: 360 }]]],
    },
    fair: {
      frames: 42,
      air: true,
      landLag: 12,
      autoCancel: [3, 36],
      hits: [
        { f: [11, 14], at: 'wep', r: 20, dmg: 13, ang: 40, bkb: 34, kbg: 98, fx: 'elec' },
        { f: [11, 14], at: 'wepMid', r: 15, dmg: 11, ang: 40, bkb: 32, kbg: 95 },
      ],
      anim: [[0, ['overheadWind', { wep: 40, legF: 40, shinF: 90, legB: 20, shinB: 90 }]], [9, ['overheadWind', { wep: 60, lean: -30, legF: 40, shinF: 90, legB: 20, shinB: 90 }]], [12, ['overhead', { wep: 0, legF: 50, shinF: 70, legB: -10, shinB: 70 }]], [20, ['overhead', { wep: 0, legF: 50, shinF: 70, legB: -10, shinB: 70 }]], [42, 'fall']],
    },
    bair: {
      frames: 34,
      air: true,
      landLag: 10,
      autoCancel: [3, 28],
      hits: [
        { f: [7, 10], at: 'wep', r: 19, dmg: 12.5, ang: 361, bkb: 22, kbg: 100, fx: 'sound' },
        { f: [7, 10], at: 'wepMid', r: 15, dmg: 10.5, ang: 361, bkb: 22, kbg: 96 },
      ],
      anim: [[0, ['bair', { armF: 70, foreF: 20, wep: 60, legB: -30, shinB: 90 }]], [5, ['bair', { armF: 20, foreF: 0, wep: 20 }]], [8, ['bair', { armF: -100, foreF: 0, wep: 0, lean: 26 }]], [16, ['bair', { armF: -100, foreF: 0, wep: 0, lean: 26 }]], [34, 'fall']],
    },
    uair: {
      frames: 32,
      air: true,
      landLag: 8,
      autoCancel: [3, 26],
      hits: [
        { f: [5, 11], at: 'wep', r: 19, dmg: 9, ang: 82, bkb: 26, kbg: 110, fx: 'sound' },
        { f: [5, 11], at: 'wepMid', r: 15, dmg: 8, ang: 82, bkb: 26, kbg: 106 },
      ],
      anim: [[0, ['uairWind', { armF: 70, wep: 40 }]], [5, ['uairWind', { armF: 120, foreF: 0, wep: 0, lean: -10 }]], [8, ['uairWind', { armF: 178, foreF: 0, wep: 0, lean: -20 }]], [11, ['uairWind', { armF: 236, foreF: 0, wep: 0, lean: -20 }]], [32, 'fall']],
    },
    dair: {
      frames: 42,
      air: true,
      landLag: 16,
      autoCancel: [3, 36],
      hits: [
        { f: [13, 16], at: 'footF', r: 17, dmg: 13, ang: 270, bkb: 20, kbg: 88 },
        { f: [13, 16], at: 'footB', r: 15, dmg: 13, ang: 270, bkb: 20, kbg: 88 },
        { f: [17, 23], at: 'footF', r: 15, dmg: 8, ang: 361, bkb: 20, kbg: 70 },
      ],
      anim: [[0, ['dairWind', { wep: 20 }]], [12, ['dairWind', { wep: 20 }]], [14, ['dair', { wep: 0 }]], [23, ['dair', { wep: 0 }]], [42, 'fall']],
    },
    grab: {
      frames: 30,
      hits: [{ f: [6, 8], at: 'handB', r: 17, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'ready'], [6, ['grab', { armF: 50, foreF: 70, wep: -30 }]], [12, ['grab', { armF: 50, foreF: 70, wep: -30 }]], [30, 'idle']],
    },
    dashgrab: {
      frames: 38,
      vel: [{ f: [1, 10], vx: 9 }, { f: [11, 38], vx: 1 }],
      hits: [{ f: [8, 11], at: 'handB', r: 19, grab: true, dmg: 0, ang: 0, bkb: 0, kbg: 0 }],
      anim: [[0, 'dash'], [8, ['grab', { armF: 50, foreF: 70, wep: -30 }]], [16, ['grab', { armF: 50, foreF: 70, wep: -30 }]], [38, 'idle']],
    },
    pummel: { frames: 16, pummel: 1.6, anim: [[0, ['hold', { wep: -30 }]], [4, ['hold', { head: 30, lean: 24, wep: -30 }]], [16, ['hold', { wep: -30 }]]] },
    fthrow: {
      frames: 30,
      throw: { release: 12, hit: { dmg: 8, ang: 40, bkb: 60, kbg: 64 } },
      anim: [[0, ['hold', { wep: -30 }]], [8, ['hold', { head: -30, lean: -16, wep: -30 }]], [12, ['throwF', { head: 30, wep: -30 }]], [30, 'idle']],
    },
    bthrow: {
      frames: 34,
      throw: { release: 15, holdAt: 'handB', hit: { dmg: 11, ang: 135, bkb: 62, kbg: 72 } },
      anim: [[0, ['hold', { wep: -30 }]], [7, ['throwF', { rot: -80, wep: -30 }]], [13, ['throwB', { rot: -200, wep: -30 }]], [17, ['throwB', { rot: -340, wep: -30 }]], [34, ['idle', { rot: -360 }]]],
    },
    uthrow: {
      frames: 36,
      throw: { release: 14, hit: { dmg: 9, ang: 90, bkb: 70, kbg: 80, fx: 'sound' } },
      anim: [[0, ['hold', { wep: -30 }]], [8, 'swingUpWind'], [14, 'swingUp'], [22, 'swingUp'], [36, 'idle']],
    },
    dthrow: {
      frames: 36,
      throw: { release: 16, hit: { dmg: 7, ang: 75, bkb: 60, kbg: 42 } },
      anim: [[0, ['hold', { wep: -30 }]], [10, ['throwDown', { wep: 90 }]], [20, ['throwDown', { wep: 90 }]], [36, 'idle']],
      sfx: [[16, 'thud']],
    },
    nspec: {
      frames: 40,
      shots: [{ f: 14, proj: 'chord', at: 'wepMid', x: 20, y: 6 }],
      anim: [[0, 'strum'], [10, ['strum', { armB: 40, foreB: 40 }]], [14, 'strum2'], [20, ['strum2', { armB: 10 }]], [40, 'idle']],
      sfx: [[14, 'note']],
    },
    nspecAir: {
      frames: 40,
      vel: [{ f: [1, 20], grav: 0.6 }],
      shots: [{ f: 14, proj: 'chord', at: 'wepMid', x: 20, y: 6 }],
      anim: [[0, 'strum'], [10, ['strum', { armB: 40, foreB: 40 }]], [14, 'strum2'], [20, ['strum2', { armB: 10 }]], [40, 'fall']],
      sfx: [[14, 'note']],
    },
    sspec: {
      frames: 46,
      oncePerAir: true,
      turn: true,
      landInto: 'sspecLand',
      vel: [{ f: [1, 8], vx: 2, vy: 7, grav: 0 }, { f: [9, 24], vx: 15, vy: -1.5, grav: 0 }, { f: [25, 46], vx: 5, grav: 0.8 }],
      hits: [
        { f: [9, 24], at: 'neck', r: 26, dmg: 11, ang: 45, bkb: 55, kbg: 66 },
        { f: [9, 24], at: 'wep', r: 18, dmg: 10, ang: 45, bkb: 55, kbg: 64, fx: 'sound' },
      ],
      anim: [[0, ['squat', { wep: -30 }]], [7, ['rockOut', { lean: -30 }]], [10, 'dive'], [24, 'dive'], [46, 'fall']],
      sfx: [[9, 'jet']],
    },
    sspecLand: {
      frames: 24,
      vel: [{ f: [1, 10], vx: 6 }, { f: [11, 24], vx: 0 }],
      hits: [{ f: [1, 4], at: 'hip', r: 28, dmg: 5, ang: 60, bkb: 50, kbg: 50 }],
      anim: [[0, ['kneeSlide', { lean: 10 }]], [12, 'kneeSlide'], [24, 'idle']],
      sfx: [[1, 'thud']],
    },
    uspec: {
      frames: 48,
      helpless: true,
      landHelpless: 22,
      ledgeFrom: 8,
      reverse: true,
      vel: [{ f: [1, 6], vx: 0, vy: 1, grav: 0 }, { f: [7, 30], vy: 14.5, grav: 0 }, { f: [31, 48], grav: 0.7 }],
      hits: [
        { f: [7, 29], at: 'wep', r: 22, dmg: 1.6, ang: 86, bkb: 30, kbg: 22, rehit: 4, fx: 'sound', hitlag: 0.5 },
        { f: [7, 29], at: 'neck', r: 24, dmg: 1.6, ang: 86, bkb: 30, kbg: 22, rehit: 4, hitlag: 0.5 },
        { f: [30, 33], at: 'wep', r: 26, dmg: 5, ang: 76, bkb: 60, kbg: 86, grp: 1, fx: 'elec' },
        { f: [30, 33], at: 'neck', r: 26, dmg: 5, ang: 76, bkb: 60, kbg: 86, grp: 1, fx: 'elec' },
      ],
      anim: [[0, ['squat', { wep: -30 }]], [6, ['spinOut', { rot: 0, armF: 160, wep: 0 }]], [30, ['spinOut', { rot: 1080, armF: 160, wep: 0 }], 'lin'], [34, ['rockOut', { rot: 1080 }]], [48, ['helpless', { rot: 1080 }]]],
      sfx: [[7, 'elec']],
    },
    dspec: {
      frames: 40,
      script: 'amp:speaker',
      anim: [[0, 'ready'], [8, ['castDown', { wep: 120 }]], [13, ['castDown', { lean: 40, armB: 60, foreB: 0, wep: 120 }]], [22, ['castDown', { lean: 30, armB: 40, wep: 120 }]], [40, 'idle']],
      sfx: [[12, 'thud']],
    },
    ledgeatk: {
      frames: 50,
      hits: [
        { f: [18, 21], at: 'wep', r: 20, dmg: 9, ang: 361, bkb: 45, kbg: 45 },
        { f: [18, 21], at: 'wepMid', r: 15, dmg: 8, ang: 361, bkb: 45, kbg: 45 },
      ],
      anim: [[0, 'climb'], [14, 'swingWind'], [19, 'swing'], [27, 'swing'], [50, 'idle']],
    },
    getupatk: {
      frames: 46,
      hits: [
        { f: [14, 16], at: 'wep', r: 18, dmg: 7, ang: 361, bkb: 50, kbg: 40 },
        { f: [22, 24], at: 'wep', r: 18, dmg: 7, ang: 361, bkb: 50, kbg: 40, grp: 1 },
      ],
      anim: [[0, 'lying'], [12, ['swingLow', { lean: 50 }]], [16, 'swingLow'], [24, 'lowBack'], [46, 'idle']],
    },
    ult: {
      frames: 110,
      ult: true,
      script: 'amp:ult',
      anim: [[0, 'rockOut'], [10, ['rockOut', { head: -36 }]], [14, 'strum'], [20, 'strum2'], [26, 'strum'], [32, 'strum2'], [38, 'strum'], [44, 'strum2'], [50, 'strum'], [56, 'strum2'], [62, 'strum'], [68, 'strum2'], [74, 'strum'], [80, 'strum2'], [86, ['strum', { lean: -10 }]], [94, ['rockOut', { head: -40 }]], [110, 'idle']],
      sfx: [[14, 'note'], [42, 'note'], [70, 'note']],
    },
  },
};

registerScripts({
  // Amp Drop: one speaker at a time; placing a new one retires the old one
  'amp:speaker': (st, f) => {
    if (f.mf !== 12) return;
    const pk = cfOf(f).projIdx.speaker;
    for (const p of st.projs) if (p.o === f.i && p.fd === f.def && p.pk === pk) p.dead = true;
    spawnProj(st, f, pk, f.x + f.facing * 46, f.y - 32 * f.grav);
  },
  // a Power Chord fired through your own speaker comes out louder and faster
  'amp:passive': (st, f) => {
    const cf = cfOf(f);
    const ch = cf.projIdx.chord;
    const sp = cf.projIdx.speaker;
    for (const p of st.projs) {
      if (p.dead || p.fd !== f.def || p.pk !== ch || p.o !== f.i || p.v1 !== 1) continue;
      for (const s of st.projs) {
        if (s.dead || s.fd !== f.def || s.pk !== sp || s.o !== f.i) continue;
        const dx = p.x - s.x;
        const dy = p.y - (s.y - 10);
        if (dx * dx + dy * dy < 70 * 70) {
          p.v1 = 1.6;
          p.vx *= 1.3;
          p.life += 14;
          ev(st, 'pulse', s.x, s.y, f.i, 70);
          ev(st, 'sfx', s.x, s.y, f.i, 0, 0, 'note');
          break;
        }
      }
    }
  },
  // Encore: a wall of speakers rises behind the stage and the whole place shakes
  'amp:ult': (st, f) => {
    if (f.mf !== 12) return;
    const stg = STAGES[st.stage].solids[0];
    const cx = (stg.x1 + stg.x2) / 2;
    spawnProj(st, f, cfOf(f).projIdx.encore, cx, stg.y1 - 160);
    ev(st, 'flash', cx, stg.y1, f.i);
  },
});
