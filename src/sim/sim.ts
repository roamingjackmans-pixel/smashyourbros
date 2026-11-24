// The simulation entry points: build a match state from its config, and step it one frame with everyone's input.
// Deterministic: same config + same inputs = same match on every machine.
import { A } from './acts';
import { botInput } from './bot';
import { bossFrame } from './boss';
import { allSkels, applyHit, canTouch, isShielding, resolveFighterHits, throwsAndPummels } from './combat';
import { FIGHTERS, fighterIndex, ROSTER, STAGE_INDEX, STAGES } from './data';
import { ev } from './events';
import { attachGrabbed, bodyH, knockOut, readInput, respawn, surfs, updateFighter } from './fighter';
import { dropCoins, itemsFrame } from './items';
import { dsin } from './math';
import { AUDIENCE_PICKS, mod, modBits } from './mods';
import { NEUTRAL } from './input';
import { updateProjs } from './projectiles';
import { rint, seedRng } from './rng';
import type { Fighter, MatchCfg, PlayerCfg, Skel, State } from './types';

export const INTRO_FRAMES = 150;

function newFighter(cfg: MatchCfg, i: number, def: number): Fighter {
  const pc = cfg.players[i];
  const cf = FIGHTERS[def];
  const stg = STAGES[STAGE_INDEX[cfg.stage] ?? 0];
  const sp = stg.spawns[i % stg.spawns.length];
  const hp = cfg.hp * (pc.hpMult ?? 1);
  return {
    i,
    def,
    team: pc.team,
    cpu: pc.cpu,
    x: sp[0],
    y: sp[1],
    vx: 0,
    vy: 0,
    kx: 0,
    ky: 0,
    facing: sp[0] <= 0 ? 1 : -1,
    grav: 1,
    gravT: 0,
    gnd: -1,
    act: A.AIR,
    af: 0,
    mv: 0,
    mf: 0,
    jumps: cf.def.stats.jumps,
    dodged: false,
    ff: false,
    helpless: false,
    landLag: 0,
    dropT: 0,
    dmg: pc.handicap ?? 0,
    hp,
    stocks: pc.stocks ?? (cfg.mode === 'stock' || cfg.mode === 'stamina' ? cfg.stocks : 0),
    score: 0,
    coins: 0,
    hitstun: 0,
    hitlag: 0,
    tumble: false,
    lAng: 0,
    lSpd: 0,
    lStun: 0,
    lTumble: false,
    shield: 50,
    shieldT: 0,
    intang: 0,
    invinc: 0,
    grabbing: -1,
    grabbedBy: -1,
    grabT: 0,
    ledge: -1,
    ledgeT: 0,
    ledgeN: 0,
    ledgeLock: 0,
    techT: 99,
    techLock: 0,
    inp: NEUTRAL,
    cur: NEUTRAL,
    xLowT: 0,
    yLowT: 0,
    dropPend: 0,
    jumpKind: 0,
    a1: 0,
    a2: 0,
    airUsed: 0,
    floatT: 0,
    sxT: 99,
    syT: 99,
    sxDir: 0,
    syDir: 0,
    buf: 0,
    bufT: 99,
    shortHop: false,
    hopAerial: false,
    charge: 0,
    chargeHold: false,
    stored: 0,
    hitMask: [0, 0, 0, 0, 0, 0, 0, 0],
    hitAt: [-999, -999, -999, -999, -999, -999, -999, -999],
    meter: 0,
    ultReady: false,
    item: -1,
    giantT: 0,
    tinyT: 0,
    speedT: 0,
    starT: 0,
    frozenT: 0,
    stuckT: 0,
    trapT: 0,
    burnT: 0,
    dizzyT: 0,
    counterT: 0,
    counterMult: 1,
    cancel: 0,
    armorHits: 0,
    respawnT: 0,
    out: false,
    lastHitBy: -1,
    lastHitT: 9999,
    stale: [-1, -1, -1, -1, -1, -1, -1, -1, -1],
    v: [0, 0, 0, 0, 0, 0, 0, 0],
    hist: cf.def.history ? new Array(360).fill(0).map((_, k) => (k % 3 === 0 ? sp[0] : k % 3 === 1 ? sp[1] : 0)) : [],
    bm: [0, 0, 0, 0, 0, 0, 0, 0],
    st: { dealt: 0, taken: 0, kos: 0, falls: 0, sds: 0, parries: 0, techs: 0, smashes: 0, items: 0, hits: 0, meteors: 0, ults: 0, onbeat: 0 },
    hurtFx: 0,
    lastFx: 'hit',
  };
}

export function initState(cfg: MatchCfg): State {
  const st: State = {
    frame: 0,
    rng: seedRng(cfg.seed),
    modBits: modBits(cfg.mods),
    cfg,
    stage: STAGE_INDEX[cfg.stage] ?? 0,
    fighters: [],
    projs: [],
    items: [],
    hazards: [],
    paint: [],
    boss: null,
    nextId: 1,
    freeze: 0,
    freezeBy: -1,
    timeStop: 0,
    timeStopBy: -1,
    timer: 0,
    intro: cfg.practice ? 20 : INTRO_FRAMES,
    over: false,
    overFrame: 0,
    winner: [],
    koOrder: [],
    hill: { x: 0, y: 0, w: 220, t: 0, holder: -1 },
    bomb: { holder: -1, t: 300, cool: 0 },
    bounty: -1,
    audience: { t: 0, mod: '', left: 0 },
    swapT: 0,
    lava: 0,
    shrink: 1,
    itemT: 0,
    orbT: 600,
    wave: 0,
    goalCount: 0,
    ev: [],
  };
  // mirror match: everyone plays the same random fighter
  let mirror = -1;
  if (cfg.mods.includes('mirror')) mirror = fighterIndex(ROSTER[rint(st, ROSTER.length)].def.id);
  cfg.players.forEach((p, i) => {
    const def = mirror >= 0 && !p.grunt && !p.boss ? mirror : fighterIndex(p.fighter);
    st.fighters.push(newFighter(cfg, i, def));
  });
  for (const f of st.fighters) placeAtSpawn(st, f);
  if (cfg.mode === 'koth') moveHill(st);
  if (cfg.players.some((p) => p.boss)) bossFrame(st, [], true);
  return st;
}

function placeAtSpawn(st: State, f: Fighter): void {
  // drop onto the floor below the spawn point
  const ss = surfs(st);
  let best = -1;
  let by = 1e9;
  ss.forEach((s, i) => {
    if (f.x >= s.x1 && f.x <= s.x2 && s.y1 >= f.y - 2 && s.y1 < by) {
      best = i;
      by = s.y1;
    }
  });
  if (best >= 0) {
    f.y = by;
    f.gnd = best;
    f.act = A.IDLE;
  }
  if (st.cfg.players[f.i]?.grunt) f.invinc = 30;
}

/** advance one frame. inputs[i] is the packed input of human player i (CPU slots are ignored). */
export function step(st: State, inputs: readonly number[]): void {
  st.ev = [];
  st.frame++;
  if (st.over) {
    st.overFrame++;
    return;
  }
  // countdown
  if (st.intro > 0) {
    st.intro--;
    for (const f of st.fighters) {
      readInput(f, NEUTRAL);
      f.af++;
    }
    if (st.intro === 120 || st.intro === 60 || st.intro === 0) ev(st, st.intro === 0 ? 'go' : 'count', 0, 0, -1, st.intro / 60);
    return;
  }
  // ultimate intro: everyone freezes, the ultimate user poses
  if (st.freeze > 0) {
    st.freeze--;
    for (const f of st.fighters) {
      readInput(f, f.cpu > 0 ? NEUTRAL : (inputs[f.i] ?? NEUTRAL));
    }
    return;
  }
  if (st.timeStop > 0) st.timeStop--;
  st.timer++;
  if (st.bomb.cool > 0) st.bomb.cool--;
  for (const f of st.fighters) {
    if (f.out) continue;
    const inp = f.cpu > 0 ? botInput(st, f) : (inputs[f.i] ?? NEUTRAL);
    readInput(f, inp);
  }
  for (const f of st.fighters) {
    if (f.out) continue;
    updateFighter(st, f);
  }
  attachGrabbed(st);
  const skels = allSkels(st);
  resolveFighterHits(st, skels);
  throwsAndPummels(st);
  attachGrabbed(st);
  updateProjs(st, skels);
  itemsFrame(st, skels);
  hazardsFrame(st, skels);
  if (st.boss) bossFrame(st, skels, false);
  rulesFrame(st);
}

// ------------------------------------------------------------------ blast zones, KOs, scoring, win conditions

export function blast(st: State): { l: number; r: number; t: number; b: number } {
  const b = STAGES[st.stage].blast;
  const s = st.shrink;
  return { l: b.l * s, r: b.r * s, t: b.t * s, b: b.b * (0.5 + 0.5 * s) };
}

function alive(st: State): Fighter[] {
  return st.fighters.filter((f) => !f.out && !st.cfg.players[f.i]?.grunt && !st.cfg.players[f.i]?.boss);
}

function rulesFrame(st: State): void {
  const cfg = st.cfg;
  const bz = blast(st);
  const bouncy = mod(st, 'bouncy');
  for (const f of st.fighters) {
    if (f.out || f.act === A.DEAD) continue;
    if (bouncy && (f.x < bz.l || f.x > bz.r)) {
      f.x = f.x < bz.l ? bz.l + 4 : bz.r - 4;
      f.kx = -f.kx * 0.85;
      f.vx = -f.vx;
      ev(st, 'boing', f.x, f.y, f.i);
    }
    const top = f.y < bz.t && (f.hitstun > 0 || f.tumble || f.act === A.HITSTUN || f.grav < 0);
    const side = f.x < bz.l ? 1 : f.x > bz.r ? 2 : f.y > bz.b ? 3 : top ? 0 : -1;
    const staminaKO = cfg.mode === 'stamina' && f.hp <= 0;
    const lava = st.lava > 0 && lavaTouch(st, f);
    if (lava) lavaBurn(st, f);
    if (side >= 0 || staminaKO) ko(st, f, staminaKO ? 4 : side);
  }
  // modes
  if (cfg.mode === 'koth') hillFrame(st);
  if (mod(st, 'potato')) potatoFrame(st);
  if (mod(st, 'bounty')) bountyFrame(st);
  if (cfg.mods.includes('audience')) audienceFrame(st);
  if (cfg.mods.includes('swap')) swapFrame(st);
  if (cfg.mods.includes('lava')) lavaFrame(st);
  if (cfg.mods.includes('shrink')) st.shrink = Math.max(0.58, 1 - st.timer / (cfg.time > 0 ? cfg.time * 60 : 3 * 60 * 60) * 0.42);
  if (mod(st, 'meteors') && st.timer % 70 === 0 && rint(st, 2) === 0) meteor(st);
  if (cfg.hazards && !cfg.goal && st.timer > 600 && st.timer % 1080 === 0) stageHazard(st);
  waves(st);
  checkEnd(st);
}

function ko(st: State, f: Fighter, side: number): void {
  const cfg = st.cfg;
  const pc = cfg.players[f.i];
  const killer = f.lastHitBy >= 0 && f.lastHitT < 480 && f.lastHitBy !== f.i ? st.fighters[f.lastHitBy] : null;
  f.st.falls++;
  if (killer) {
    killer.st.kos++;
    if (cfg.mode === 'time') killer.score++;
    if (mod(st, 'bounty') && st.bounty === f.i) {
      if (cfg.mode === 'time') killer.score++;
      else killer.stocks = Math.min(killer.stocks + 1, cfg.stocks + 2);
      ev(st, 'bounty', killer.x, killer.y, killer.i);
    }
    // "Second Wind" (FlashGames, D27): a player's KO heals them back to 0%
    if (mod(st, 'vampire') && killer.cpu === 0 && !killer.out && killer.act !== A.DEAD) {
      killer.dmg = 0;
      killer.hp = cfg.hp * (cfg.players[killer.i]?.hpMult ?? 1);
      ev(st, 'say', killer.x, killer.y - 150, killer.i, 0, 0, 'SECOND WIND!');
    }
  } else {
    f.st.sds++;
  }
  if (cfg.mode === 'time') f.score -= killer ? 1 : 1;
  if (cfg.mode === 'coin' && f.coins > 0) {
    const lose = Math.ceil(f.coins / 2);
    f.coins -= lose;
  }
  if (st.bomb.holder === f.i) {
    st.bomb.holder = -1;
    st.bomb.t = 300;
  }
  knockOut(st, f, side);
  if (pc?.grunt) {
    f.out = true;
    st.goalCount++;
    return;
  }
  if (cfg.practice) return;
  if (cfg.mode === 'stock' || cfg.mode === 'stamina') {
    f.stocks--;
    if (f.stocks <= 0) {
      f.out = true;
      st.koOrder.push(f.i);
      ev(st, 'out', f.x, f.y, f.i);
    }
  }
  if (cfg.mode === 'stamina') f.hp = cfg.hp * (pc?.hpMult ?? 1);
}

function checkEnd(st: State): void {
  const cfg = st.cfg;
  if (cfg.practice) return;
  const humans = st.fighters.filter((f) => !cfg.players[f.i]?.grunt && !cfg.players[f.i]?.boss && cfg.players[f.i].cpu === 0);
  const goal = cfg.goal;
  if (goal && goal.kind !== 'win') {
    // story objectives: lose if every human is out
    if (humans.length && humans.every((h) => h.out)) return finish(st, []);
    if (goal.kind === 'survive' && st.timer >= (goal.frames ?? 3600)) return finish(st, humans.map((h) => h.i));
    if (goal.kind === 'ko' && st.goalCount >= (goal.count ?? 10)) return finish(st, humans.map((h) => h.i));
    if (goal.kind === 'boss') {
      const bossDead = st.boss ? st.boss.dead : st.fighters.filter((f) => cfg.players[f.i]?.boss).every((f) => f.out);
      if (bossDead) return finish(st, alive(st).map((f) => f.i));
    }
    return;
  }
  const timeUp = cfg.time > 0 && st.timer >= cfg.time * 60;
  if (cfg.mode === 'stock' || cfg.mode === 'stamina') {
    const al = alive(st);
    const teams = new Set(al.map((f) => (cfg.teams ? f.team : f.i)));
    if (teams.size <= 1 && st.fighters.length > 1) return finish(st, al.map((f) => f.i));
    if (timeUp) {
      // most stocks, then least damage
      let best = -1e9;
      for (const f of al) best = Math.max(best, f.stocks * 10000 - f.dmg);
      return finish(st, al.filter((f) => f.stocks * 10000 - f.dmg === best).map((f) => f.i));
    }
    return;
  }
  if (cfg.mode === 'koth') {
    for (const f of st.fighters) if (f.score >= 1800) return finish(st, teamOf(st, f));
  }
  if (timeUp) {
    const key = (f: Fighter): number => (cfg.mode === 'coin' ? f.coins : f.score);
    let scores: Map<number, number>;
    if (cfg.teams) {
      scores = new Map();
      for (const f of st.fighters) if (!cfg.players[f.i]?.grunt) scores.set(f.team, (scores.get(f.team) ?? 0) + key(f));
      const best = Math.max(...scores.values());
      return finish(st, st.fighters.filter((f) => scores.get(f.team) === best).map((f) => f.i));
    }
    const best = Math.max(...st.fighters.map(key));
    const top = st.fighters.filter((f) => key(f) === best);
    if (top.length > 1 && cfg.mode === 'time') return suddenDeath(st, top);
    return finish(st, top.map((f) => f.i));
  }
}

function teamOf(st: State, f: Fighter): number[] {
  return st.cfg.teams ? st.fighters.filter((o) => o.team === f.team).map((o) => o.i) : [f.i];
}

function suddenDeath(st: State, top: Fighter[]): void {
  // tied on time: 300%, one stock, first KO loses
  st.cfg = { ...st.cfg, mode: 'stock', time: 0, stocks: 1 };
  for (const f of st.fighters) {
    if (!top.includes(f)) {
      f.out = true;
      f.act = A.DEAD;
      continue;
    }
    f.stocks = 1;
    respawn(st, f);
    f.dmg = 300;
    f.invinc = 60;
  }
  ev(st, 'sudden', 0, 0, -1);
}

function finish(st: State, winners: number[]): void {
  st.over = true;
  st.overFrame = 0;
  st.winner = winners;
  ev(st, 'game', 0, 0, winners[0] ?? -1);
}

// ------------------------------------------------------------------ King of the Hill

function moveHill(st: State): void {
  const ss = surfs(st).filter((s) => s.x2 - s.x1 > 200);
  const s = ss[rint(st, ss.length)];
  const w = Math.min(260, s.x2 - s.x1);
  st.hill = { x: s.x1 + w / 2 + rint(st, Math.max(1, s.x2 - s.x1 - w)), y: s.y1, w, t: 0, holder: -1 };
  ev(st, 'hill', st.hill.x, st.hill.y, -1);
}

function hillFrame(st: State): void {
  st.hill.t++;
  if (st.hill.t > 1200) moveHill(st);
  const inside = st.fighters.filter((f) => !f.out && f.act !== A.DEAD && Math.abs(f.x - st.hill.x) <= st.hill.w / 2 && Math.abs(f.y - st.hill.y) < 30);
  const teams = new Set(inside.map((f) => (st.cfg.teams ? f.team : f.i)));
  st.hill.holder = teams.size === 1 ? inside[0].i : -1;
  if (st.hill.holder >= 0) for (const f of inside) f.score++;
}

// ------------------------------------------------------------------ modifiers

function potatoFrame(st: State): void {
  const b = st.bomb;
  if (b.holder < 0) {
    b.t--;
    if (b.t <= 0) {
      const cands = st.fighters.filter((f) => !f.out && f.act !== A.DEAD && !st.cfg.players[f.i]?.grunt);
      if (cands.length) {
        b.holder = cands[rint(st, cands.length)].i;
        b.t = 600;
        b.cool = 30;
        ev(st, 'bombpass', 0, 0, b.holder);
      }
    }
    return;
  }
  b.t--;
  if (b.t <= 0) {
    const f = st.fighters[b.holder];
    b.holder = -1;
    b.t = 300;
    if (f && !f.out && f.act !== A.DEAD) {
      f.intang = 0;
      f.invinc = 0;
      f.starT = 0;
      applyHit(st, null, f, { dmg: 25, ang: 80, bkb: 90, kbg: 60, fx: 'fire', unblockable: true }, { sx: f.x, sy: f.y + 40, facing: 1, dmgMult: 1, kbMult: 1, proj: true, moveIdx: -1, shielded: false });
      ev(st, 'boom', f.x, f.y - 40, -1, 140);
    }
  }
}

function bountyFrame(st: State): void {
  if (st.timer % 30 !== 0) return;
  const al = alive(st);
  const key = (f: Fighter): number => (st.cfg.mode === 'time' ? f.score : st.cfg.mode === 'coin' ? f.coins : f.stocks * 1000 + f.st.kos * 10 - f.dmg / 100);
  let best: Fighter | null = null;
  let second = -1e9;
  for (const f of al) {
    if (!best || key(f) > key(best)) {
      if (best) second = Math.max(second, key(best));
      best = f;
    } else second = Math.max(second, key(f));
  }
  const nb = best && key(best) > second + 0.5 && st.timer > 1200 ? best.i : -1;
  if (nb !== st.bounty) {
    st.bounty = nb;
    if (nb >= 0) ev(st, 'bountyon', 0, 0, nb);
  }
}

function audienceFrame(st: State): void {
  const a = st.audience;
  if (a.left > 0) {
    a.left--;
    if (a.left === 0) ev(st, 'audienceend', 0, 0, -1, 0, 0, a.mod);
    return;
  }
  a.t++;
  if (a.t >= 1500) {
    a.t = 0;
    a.mod = AUDIENCE_PICKS[rint(st, AUDIENCE_PICKS.length)];
    a.left = 600;
    ev(st, 'audience', 0, 0, -1, 0, 0, a.mod);
  }
}

function swapFrame(st: State): void {
  st.swapT++;
  if (st.swapT < 1800) return;
  st.swapT = 0;
  const defs = st.fighters.map((f) => f.def);
  const n = st.fighters.length;
  st.fighters.forEach((f, i) => {
    if (st.cfg.players[i]?.grunt || st.cfg.players[i]?.boss) return;
    f.def = defs[(i + 1) % n];
    if (f.act === A.MOVE) f.act = f.gnd >= 0 ? A.IDLE : A.AIR;
    f.stored = 0;
    f.v = [0, 0, 0, 0, 0, 0, 0, 0];
    const cf = FIGHTERS[f.def];
    f.hist = cf.def.history ? new Array(360).fill(0) : [];
    f.jumps = Math.min(f.jumps, cf.def.stats.jumps);
  });
  ev(st, 'swap', 0, 0, -1);
}

function lavaFrame(st: State): void {
  // rises every 22 s: warning 2 s, up 2 s, holds 4 s, down 2 s
  const t = st.timer % 1320;
  const stg = STAGES[st.stage];
  const top = stg.solids[0].y1;
  let lvl = 0;
  if (t > 600 && t <= 720) lvl = -1; // warning
  else if (t > 720 && t <= 840) lvl = (t - 720) / 120;
  else if (t > 840 && t <= 1080) lvl = 1;
  else if (t > 1080 && t <= 1200) lvl = 1 - (t - 1080) / 120;
  if (lvl === -1 && t === 601) ev(st, 'lavawarn', 0, top, -1);
  st.lava = lvl;
}

export function lavaY(st: State): number {
  const top = STAGES[st.stage].solids[0].y1;
  const lvl = Math.max(0, st.lava);
  return top + 520 - lvl * 545;
}

function lavaTouch(st: State, f: Fighter): boolean {
  return f.y > lavaY(st) && st.lava > 0;
}

function lavaBurn(st: State, f: Fighter): void {
  if (f.intang > 0 || f.invinc > 0 || f.starT > 0 || f.hitlag > 0 || f.burnT > 0) return;
  f.burnT = 40;
  applyHit(st, null, f, { dmg: 12, ang: 90, bkb: 75, kbg: 50, fx: 'fire', unblockable: true }, { sx: f.x, sy: f.y + 50, facing: 1, dmgMult: 1, kbMult: 1, proj: true, moveIdx: -1, shielded: false });
}

/** each stage's own hazard (when hazards are on): a falling stage light, a falling neon sign, a cannonball, space debris */
function stageHazard(st: State): void {
  const stg = STAGES[st.stage];
  const k = stg.hazard;
  if (!k) return;
  const m = stg.solids[0];
  if (k === 'cannon') {
    const side = rint(st, 2) ? 1 : -1;
    st.hazards.push({ k: 'cannon', o: -1, x: side * (stg.cam.r + 100), y: m.y1 - 70 - rint(st, 160), vx: -side * 16, vy: 0, t: 0, life: 260, r: 30, dead: false });
    return;
  }
  const x = m.x1 + 120 + rint(st, Math.max(1, m.x2 - m.x1 - 240));
  st.hazards.push({ k, o: -1, x, y: stg.cam.t - 200, vx: 0, vy: 0, t: 0, life: 420, r: k === 'light' ? 46 : 38, dead: false });
}

function meteor(st: State): void {
  const stg = STAGES[st.stage];
  const x = stg.cam.l + 100 + rint(st, Math.max(1, stg.cam.r - stg.cam.l - 200));
  st.hazards.push({ k: 'meteor', o: -1, x, y: stg.cam.t - 200, vx: (rint(st, 5) - 2) * 0.6, vy: 0, t: 0, life: 400, r: 34, dead: false });
}

// ------------------------------------------------------------------ hazards (meteors, guest stars)

function hazardsFrame(st: State, skels: Skel[]): void {
  void skels;
  const ss = surfs(st);
  for (const h of st.hazards) {
    if (h.dead) continue;
    h.t++;
    if (h.t > h.life) {
      h.dead = true;
      continue;
    }
    const owner = h.o >= 0 ? st.fighters[h.o] : null;
    if (h.k === 'cannon') {
      if (h.t < 50) continue; // warning
      h.x += h.vx;
      h.y += h.vy;
      for (const f of st.fighters) {
        if (!canTouch(st, null, f)) continue;
        const dx = f.x - h.x;
        const dy = f.y - bodyH(st, f) * 0.5 - h.y;
        if (dx * dx + dy * dy < (h.r + 34) * (h.r + 34) && f.lastHitT > 20) applyHit(st, null, f, { dmg: 13, ang: 40, bkb: 60, kbg: 70, fx: 'fire' }, { sx: h.x - h.vx * 3, sy: h.y, facing: h.vx > 0 ? 1 : -1, dmgMult: 1, kbMult: 1, proj: true, moveIdx: -1, shielded: isShielding(f) });
      }
      continue;
    }
    if (h.k === 'meteor' || h.k === 'light' || h.k === 'sign' || h.k === 'debris') {
      if (h.t < 60) continue; // warning marker
      h.vy = Math.min(24, h.vy + 0.9);
      h.x += h.vx;
      h.y += h.vy;
      let boom = false;
      for (const s of ss) if (!s.soft && h.x >= s.x1 && h.x <= s.x2 && h.y >= s.y1 && h.y <= s.y2) boom = true;
      for (const f of st.fighters) {
        if (!canTouch(st, null, f)) continue;
        const dx = f.x - h.x;
        const dy = f.y - bodyH(st, f) * 0.5 - h.y;
        if (dx * dx + dy * dy < (h.r + 30) * (h.r + 30)) boom = true;
      }
      if (boom || h.y > STAGES[st.stage].blast.b) {
        h.dead = true;
        for (const f of st.fighters) {
          if (!canTouch(st, null, f)) continue;
          const dx = f.x - h.x;
          const dy = f.y - bodyH(st, f) * 0.5 - h.y;
          if (dx * dx + dy * dy < 120 * 120) applyHit(st, null, f, { dmg: 14, ang: 70, bkb: 55, kbg: 70, fx: 'fire' }, { sx: h.x, sy: h.y, facing: dx >= 0 ? 1 : -1, dmgMult: 1, kbMult: 1, proj: true, moveIdx: -1, shielded: isShielding(f) });
        }
        ev(st, 'boom', h.x, h.y, -1, 110);
      }
      continue;
    }
    // guest stars from capsules
    if (h.k === 'roadie') {
      h.x += h.vx;
      for (const f of st.fighters) {
        if (!canTouch(st, owner, f)) continue;
        if (Math.abs(f.x - h.x) < 50 && Math.abs(f.y - h.y) < 80 && f.lastHitT > 20) applyHit(st, owner, f, { dmg: 10, ang: 50, bkb: 60, kbg: 60 }, { sx: h.x - h.vx * 4, sy: h.y, facing: h.vx > 0 ? 1 : -1, dmgMult: 1, kbMult: 1, proj: true, moveIdx: -1, shielded: isShielding(f) });
      }
    } else if (h.k === 'laughtrack') {
      if (h.t % 30 === 0) {
        for (const f of st.fighters) {
          if (!canTouch(st, owner, f)) continue;
          const dx = f.x - h.x;
          if (Math.abs(dx) < 260 && Math.abs(f.y - h.y) < 200) applyHit(st, owner, f, { dmg: 5, ang: 45, bkb: 50, kbg: 40, fx: 'sound', away: true }, { sx: h.x, sy: h.y, facing: dx >= 0 ? 1 : -1, dmgMult: 1, kbMult: 1, proj: true, moveIdx: -1, shielded: isShielding(f) });
        }
        ev(st, 'pulse', h.x, h.y, h.o, 260);
      }
    } else if (h.k === 'cameraman') {
      if (h.t === 45) {
        for (const f of st.fighters) {
          if (!canTouch(st, owner, f)) continue;
          if (Math.abs(f.x - h.x) < 420) {
            f.frozenT = 80;
            f.act = A.FROZEN;
            f.af = 0;
          }
        }
        ev(st, 'flash', h.x, h.y, h.o);
      }
    }
  }
  if (st.hazards.some((h) => h.dead)) st.hazards = st.hazards.filter((h) => !h.dead);
}

// ------------------------------------------------------------------ story waves

function waves(st: State): void {
  const g = st.cfg.goal;
  if (!g?.waves) return;
  const grunts = st.fighters.filter((f) => st.cfg.players[f.i]?.grunt);
  if (grunts.length && grunts.every((f) => f.out) && st.wave < g.waves.length) {
    // the next wave reuses the grunt slots
    const wave = g.waves[st.wave];
    st.wave++;
    ev(st, 'wave', 0, 0, -1, st.wave);
    let k = 0;
    for (const f of grunts) {
      const pc = wave[k++ % wave.length];
      if (!pc) continue;
      f.out = false;
      f.def = fighterIndex(pc.fighter);
      st.cfg.players[f.i] = { ...st.cfg.players[f.i], ...pc } as PlayerCfg;
      respawn(st, f);
      f.x = (k % 2 ? -1 : 1) * (300 + k * 90);
      f.invinc = 40;
    }
  }
}

// ------------------------------------------------------------------ rollback helpers

export function cloneState(st: State): State {
  return structuredClone(st);
}

/** a cheap checksum of the gameplay state (for desync detection) */
export function checksum(st: State): number {
  let h = st.frame | 0;
  const mix = (v: number): void => {
    h = (Math.imul(h ^ Math.round(v * 64), 2654435761) + 0x9e3779b9) | 0;
  };
  mix(st.rng);
  for (const f of st.fighters) {
    mix(f.x);
    mix(f.y);
    mix(f.vx);
    mix(f.vy);
    mix(f.kx);
    mix(f.ky);
    mix(f.dmg);
    mix(f.act);
    mix(f.mf);
    mix(f.stocks);
    mix(f.shield);
  }
  for (const p of st.projs) {
    mix(p.x);
    mix(p.y);
  }
  for (const it of st.items) {
    mix(it.x);
    mix(it.y);
  }
  return h >>> 0;
}

export { dsin, dropCoins };
