// Types shared by the simulation, the data files and the renderer. See docs/DESIGN.md for the conventions:
// world y points DOWN; move data (offsets, velocities, poses) uses a local frame with x = forward, y = UP.

// ------------------------------------------------------------------ skeleton

export type Bone =
  | 'hip'
  | 'torso'
  | 'neck'
  | 'head'
  | 'shoulder'
  | 'elbowF'
  | 'handF'
  | 'elbowB'
  | 'handB'
  | 'kneeF'
  | 'footF'
  | 'kneeB'
  | 'footB'
  | 'wep'
  | 'wepMid'
  | 'tail';

export interface Pose {
  rot: number;
  lean: number;
  head: number;
  armF: number;
  foreF: number;
  armB: number;
  foreB: number;
  legF: number;
  shinF: number;
  legB: number;
  shinB: number;
  wep: number;
  tail: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
}

/** a named pose from the library, a partial pose (missing fields from 'idle'), or a named pose with tweaks */
export type PoseRef = string | Partial<Pose> | [string, Partial<Pose>];
export type Ease = 'lin' | 'in' | 'out' | 'io' | 'step';
export type Key = [number, PoseRef] | [number, PoseRef, Ease];

export interface RigDef {
  thigh: number;
  shin: number;
  torso: number;
  /** head radius */
  head: number;
  upper: number;
  fore: number;
  /** shoulder height along the torso, 0..1 (default 0.9) */
  shoulder?: number;
  /** torso half-width (hurtbox radius) */
  girth: number;
  /** limb hurtbox radius */
  limb: number;
  /** weapon length (0 = none) */
  wep?: number;
  tail?: number;
}

/** world-space bone points for one fighter, one frame (y down) */
export interface Skel {
  hip: [number, number];
  neck: [number, number];
  head: [number, number];
  shoulder: [number, number];
  elbowF: [number, number];
  handF: [number, number];
  elbowB: [number, number];
  handB: [number, number];
  kneeF: [number, number];
  footF: [number, number];
  kneeB: [number, number];
  footB: [number, number];
  wep: [number, number];
  wepMid: [number, number];
  tail: [number, number];
  /** world-space direction angles (deg, y-down math) of each segment, for drawing */
  ang: Record<string, number>;
  scale: number;
  facing: number;
  grav: number;
  /** squash and stretch from the pose (visual only) */
  sx: number;
  sy: number;
}

// ------------------------------------------------------------------ moves

export type Fx =
  | 'hit'
  | 'slash'
  | 'fire'
  | 'elec'
  | 'ice'
  | 'water'
  | 'dark'
  | 'paint'
  | 'sound'
  | 'magic'
  | 'rock'
  | 'wind'
  | 'note'
  | 'time'
  | 'grav'
  | 'food';

export interface HitProps {
  dmg: number;
  /** launch angle, degrees, 0 = forward, 90 = up, 270 = down (meteor), 361 = auto angle */
  ang: number;
  bkb: number;
  kbg: number;
  /** fixed knockback (ignores percent) */
  fkb?: number;
  hitlag?: number;
  sdi?: number;
  /** extra shield damage */
  shield?: number;
  fx?: Fx;
  only?: 'air' | 'ground';
  /** windbox: pushes, no damage, no hitstun */
  wind?: boolean;
  freeze?: number;
  trip?: boolean;
  /** launch away from the attacker's centre instead of using facing */
  away?: boolean;
  /** pull the target toward this point (local) instead of launching (multi-hit links) */
  link?: boolean;
  sfx?: string;
  /** sets the victim's gravity flipped for this many frames (Inverta) */
  gflip?: number;
  /** ignores shields */
  unblockable?: boolean;
}

export interface HitDef extends HitProps {
  /** active frames, inclusive */
  f: [number, number];
  at?: Bone;
  /** offset from the bone (or hip), local units, x forward, y up */
  x?: number;
  y?: number;
  r: number;
  /** hitbox group: a group hits each target once per move (unless rehit) */
  grp?: number;
  /** multi-hit: the group may hit again after this many move frames (hitlag does not count) */
  rehit?: number;
  /** grab box */
  grab?: boolean;
}

export interface VelKey {
  f: [number, number];
  /** local: + forward */
  vx?: number;
  /** local: + up */
  vy?: number;
  /** gravity multiplier during these frames (0 = hang) */
  grav?: number;
  /** add instead of set */
  add?: boolean;
  /** no air drift */
  noDrift?: boolean;
}

export interface ShotDef {
  f: number;
  proj: string;
  at?: Bone;
  x?: number;
  y?: number;
  /** override the projectile's velocity (local) */
  vx?: number;
  vy?: number;
}

export interface ProjDef {
  kind: string;
  r: number;
  life: number;
  vx?: number;
  vy?: number;
  /** gravity (world units / frame^2, + = falls) */
  grav?: number;
  /** velocity multiplier per frame */
  drag?: number;
  hit: HitProps;
  /** hits before it vanishes (default 1) */
  hits?: number;
  rehit?: number;
  bounce?: number;
  roll?: boolean;
  homing?: number;
  boomerang?: number;
  /** keeps flying after hitting fighters */
  pierce?: boolean;
  /** stays where it lands */
  stick?: boolean;
  /** passes through stage geometry */
  ghost?: boolean;
  trap?: number;
  pull?: number;
  /** paints the floor where it lands (Smudge) */
  paint?: boolean;
  puddle?: { life: number; w: number; hit: HitProps };
  reflectable?: boolean;
  /** destroyed by this much damage (0 = can't be hit) */
  hp?: number;
  /** pulses a hit every N frames (speaker) */
  pulse?: { every: number; r: number; hit: HitProps };
  /** explodes after N frames */
  fuse?: number;
  explode?: { r: number; hit: HitProps };
  spin?: number;
  /** charge-scaled: damage and size multiply by (1 + charge) where charge 0..1 stored on spawn */
  chargeable?: boolean;
}

export interface MoveDef {
  frames: number;
  /** aerial: landing interrupts it */
  air?: boolean;
  landLag?: number;
  autoCancel?: [number, number];
  /** interruptible from this frame */
  iasa?: number;
  hits?: HitDef[];
  anim: Key[];
  vel?: VelKey[];
  shots?: ShotDef[];
  /** smash charge: holds this frame while Attack is held (max 60) */
  charge?: number;
  /** armour: [from, to, max damage per hit] */
  armor?: [number, number, number];
  intang?: [number, number];
  /** ends in helpless fall */
  helpless?: boolean;
  /** landing lag if landing helpless after/during this move */
  landHelpless?: number;
  /** may grab ledges from this frame */
  ledgeFrom?: number;
  /** chains: pressing the button in the window switches move */
  next?: { move: string; from: number; to: number; on?: 'attack' | 'special' }[];
  /** rapid jab: while the button is held, loop frames from..to */
  loop?: { from: number; to: number; on: 'attack' | 'special'; max?: number; end?: string };
  counter?: { f: [number, number]; move: string; mult: number };
  reflect?: { f: [number, number]; r: number; at?: Bone; x?: number; y?: number; mult?: number };
  /** grab boxes in this move start this throw */
  cmdGrab?: string;
  /** a throw: the victim rides `holdAt` until `release` */
  throw?: { release: number; holdAt?: Bone; hx?: number; hy?: number; hit: HitProps };
  /** pummel */
  pummel?: number;
  /** on landing during the move, switch to this move */
  landInto?: string;
  /** on hitting someone, switch to this move */
  onHit?: string;
  /** turn to face the stick on frame 1 (side specials) */
  turn?: boolean;
  /** B-reverse allowed on frame 1-3 */
  reverse?: boolean;
  /** the stick sets this move's direction (a teleport): CPUs aim it at the ledge when recovering */
  aim?: boolean;
  /** stop at stage edges instead of sliding off */
  edgeStop?: boolean;
  sfx?: [number, string][];
  /** id of a deterministic hook in sim/scripts.ts */
  script?: string;
  /** ultimate: freezes everyone else for the intro, intangible throughout */
  ult?: boolean;
  /** special charge (Ray Blaster): hold the button at this frame, store with shield */
  chargeB?: { at: number; max: number; release: string };
  /** keep momentum from the previous state at frame 0 */
  keepMomentum?: boolean;
  /** air move usable once per airtime (recovery side specials) */
  oncePerAir?: boolean;
}

export interface Stats {
  walk: number;
  dash: number;
  run: number;
  dashFrames: number;
  airSpeed: number;
  airAccel: number;
  airFric: number;
  groundFric: number;
  /** gravity per frame */
  grav: number;
  fall: number;
  ffall: number;
  /** full hop launch speed */
  jump: number;
  /** short hop launch speed */
  hop: number;
  /** air jump launch speed */
  djump: number;
  /** number of air jumps */
  jumps: number;
  squat: number;
  /** float: frames you can hover by holding jump (Nimbus) */
  float?: number;
}

export interface FighterDef {
  id: string;
  name: string;
  weight: number;
  /** overall size multiplier */
  scale?: number;
  /** balance: multiplies all of this fighter's damage (default 1) */
  power?: number;
  /** balance (set from data/balance.ts): attack range and recovery multipliers, for scripts that need them */
  reach?: number;
  recovery?: number;
  rig: RigDef;
  stats: Stats;
  moves: Record<string, MoveDef>;
  projs?: Record<string, ProjDef>;
  poses?: Record<string, Partial<Pose>>;
  /** override the base animations: idle, walk, run, jump, fall, ... */
  base?: Record<string, Key[]>;
  /** passive script id (runs every frame) */
  passive?: string;
  /** keeps a position history (Echo) */
  history?: boolean;
  /** shield bubble radius */
  shieldR?: number;
  /** not on the roster (story enemies, bosses) */
  hidden?: boolean;
  // ---- flavour (shown in menus)
  title: string;
  role: string;
  color: string;
  bio: string;
  line: string;
  taunt: string;
  wins: string[];
  moveNames: Record<string, string>;
}

// ------------------------------------------------------------------ stage

export interface Path {
  ax?: number;
  ay?: number;
  /** frames per cycle */
  period: number;
  phase?: number;
}

export interface Solid {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  ledgeL?: boolean;
  ledgeR?: boolean;
  path?: Path;
  /** art hint */
  kind?: string;
}

export interface Plat {
  x1: number;
  x2: number;
  y: number;
  path?: Path;
  kind?: string;
}

export interface StageDef {
  id: string;
  name: string;
  blast: { l: number; r: number; t: number; b: number };
  cam: { l: number; r: number; t: number; b: number };
  solids: Solid[];
  plats: Plat[];
  spawns: [number, number][];
  respawn: [number, number];
  /** stage hazard script id (when hazards are on) */
  hazard?: string;
  music: string;
  bg: string;
  blurb: string;
}

// ------------------------------------------------------------------ match config

export type ModeId = 'stock' | 'time' | 'stamina' | 'coin' | 'koth';

export interface PlayerCfg {
  fighter: string;
  color: number;
  team: number;
  /** 0 = human, 1..9 = CPU level */
  cpu: number;
  name: string;
  tapJump: boolean;
  /** handicap: starting damage (or extra HP in stamina) */
  handicap?: number;
  /** story/boss scaling */
  hpMult?: number;
  dmgMult?: number;
  kbTakenMult?: number;
  giant?: boolean;
  armor?: number;
  /** enemy grunts in story survival: removed when KO'd, do not respawn */
  grunt?: boolean;
  /** this slot is a boss (Big BROadcast) */
  boss?: string;
  stocks?: number;
}

export interface MatchCfg {
  seed: number;
  stage: string;
  flat?: boolean;
  hazards?: boolean;
  mode: ModeId;
  stocks: number;
  /** seconds (0 = no limit) */
  time: number;
  hp: number;
  items: number;
  ult: 'off' | 'meter' | 'orb';
  mods: string[];
  teams: boolean;
  friendlyFire: boolean;
  players: PlayerCfg[];
  /** practice mode: no KOs end the match, infinite stocks */
  practice?: boolean;
  /** story/classic objective */
  goal?: { kind: 'win' | 'survive' | 'ko' | 'boss'; frames?: number; count?: number; waves?: PlayerCfg[][] };
}

// ------------------------------------------------------------------ runtime state

export interface Fighter {
  i: number;
  def: number;
  team: number;
  cpu: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** knockback velocity (decays) */
  kx: number;
  ky: number;
  facing: number;
  grav: number;
  gravT: number;
  /** surface index: -1 airborne, 0.. solids, then plats */
  gnd: number;
  act: number;
  af: number;
  mv: number;
  mf: number;
  jumps: number;
  dodged: boolean;
  ff: boolean;
  helpless: boolean;
  landLag: number;
  dropT: number;
  dmg: number;
  hp: number;
  stocks: number;
  score: number;
  coins: number;
  hitstun: number;
  hitlag: number;
  tumble: boolean;
  /** pending launch after hitlag */
  lAng: number;
  lSpd: number;
  lStun: number;
  lTumble: boolean;
  shield: number;
  shieldT: number;
  intang: number;
  invinc: number;
  grabbing: number;
  grabbedBy: number;
  grabT: number;
  ledge: number;
  ledgeT: number;
  ledgeN: number;
  ledgeLock: number;
  techT: number;
  techLock: number;
  /** previous packed input */
  inp: number;
  cur: number;
  /** frames since the stick was last near centre on each axis (for flick detection) */
  xLowT: number;
  yLowT: number;
  /** pending platform drop (frames) */
  dropPend: number;
  /** 1 = ground jump, 2 = air jump (animation) */
  jumpKind: number;
  /** action vars (roll direction, dodge vector, ...) */
  a1: number;
  a2: number;
  /** specials used this airtime (bits) */
  airUsed: number;
  /** frames of float used this airtime */
  floatT: number;
  /** frames since a fresh x / y flick (99 = none) */
  sxT: number;
  syT: number;
  sxDir: number;
  syDir: number;
  /** buffered button presses: bits, and frames since */
  buf: number;
  bufT: number;
  shortHop: boolean;
  hopAerial: boolean;
  charge: number;
  chargeHold: boolean;
  /** stored special charge 0..1 (Ray Blaster) */
  stored: number;
  /** per target: hitbox groups already hit this move */
  hitMask: number[];
  hitAt: number[];
  meter: number;
  ultReady: boolean;
  item: number;
  /** status timers */
  giantT: number;
  tinyT: number;
  speedT: number;
  starT: number;
  frozenT: number;
  stuckT: number;
  trapT: number;
  burnT: number;
  dizzyT: number;
  counterT: number;
  /** turbo: the current move may be cancelled */
  cancel: number;
  counterMult: number;
  armorHits: number;
  respawnT: number;
  out: boolean;
  lastHitBy: number;
  lastHitT: number;
  stale: number[];
  /** fighter script vars */
  v: number[];
  /** position history (Echo): [x, y, dmg] triples, ring */
  hist: number[];
  bm: number[];
  /** match stats */
  st: {
    dealt: number;
    taken: number;
    kos: number;
    falls: number;
    sds: number;
    parries: number;
    techs: number;
    smashes: number;
    items: number;
    hits: number;
    meteors: number;
    ults: number;
    onbeat: number;
  };
  /** visual hints for the renderer (not gameplay) */
  hurtFx: number;
  lastFx: string;
}

export interface Proj {
  id: number;
  o: number;
  /** fighter def index, projectile key index */
  fd: number;
  pk: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  facing: number;
  hits: number;
  hitMask: number;
  hitAt: number[];
  hp: number;
  charge: number;
  dead: boolean;
  /** resting on the ground */
  gnd: boolean;
  v0: number;
  v1: number;
}

export interface Item {
  id: number;
  k: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 0 on the ground / falling, 1 held, 2 thrown, 3 placed/active */
  st: number;
  h: number;
  o: number;
  t: number;
  hp: number;
  uses: number;
  gnd: boolean;
  hitMask: number;
  dead: boolean;
  v0: number;
}

export interface Ev {
  t: string;
  x: number;
  y: number;
  /** player index or -1 */
  p: number;
  a?: number;
  b?: number;
  s?: string;
}

export interface Paint {
  /** surface index */
  s: number;
  x1: number;
  x2: number;
  owner: number;
  t: number;
}

export interface Hazard {
  k: string;
  /** owner (fighter index) or -1 */
  o: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  r: number;
  dead: boolean;
}

export interface BossState {
  kind: string;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  phase: number;
  act: number;
  af: number;
  hitlag: number;
  flash: number;
  v: number[];
  dead: boolean;
}

export interface State {
  frame: number;
  rng: number;
  modBits: number;
  cfg: MatchCfg;
  stage: number;
  fighters: Fighter[];
  projs: Proj[];
  items: Item[];
  hazards: Hazard[];
  paint: Paint[];
  boss: BossState | null;
  nextId: number;
  /** global freeze (ultimate intro): frames, and who is exempt */
  freeze: number;
  freezeBy: number;
  /** time stop (Echo's Paradox): frames, and who is exempt */
  timeStop: number;
  timeStopBy: number;
  timer: number;
  /** countdown before GO (frames) */
  intro: number;
  over: boolean;
  overFrame: number;
  winner: number[];
  /** KO order (for placings): fighter indices, first eliminated first */
  koOrder: number[];
  /** mode extras */
  hill: { x: number; y: number; w: number; t: number; holder: number };
  bomb: { holder: number; t: number; cool: number };
  bounty: number;
  audience: { t: number; mod: string; left: number };
  swapT: number;
  lava: number;
  shrink: number;
  itemT: number;
  orbT: number;
  /** waves cleared (story survive) */
  wave: number;
  goalCount: number;
  /** presentation events for this frame */
  ev: Ev[];
}
