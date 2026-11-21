// Two (and three) rollback sessions talk through a fake laggy, jittery network with random inputs; once every
// input has arrived, every machine must hold exactly the same state.
import { describe, expect, it } from 'vitest';
import { pack, B_ATTACK, B_JUMP, B_SHIELD, B_SPECIAL } from '../src/sim/input';
import { checksum, initState } from '../src/sim/sim';
import type { MatchCfg } from '../src/sim/types';
import { Session, type Packet } from '../src/net/rollback';

function cfg(n: number, cpus: number[] = []): MatchCfg {
  return {
    seed: 99,
    stage: 'galleon',
    mode: 'stock',
    stocks: 3,
    time: 0,
    hp: 150,
    items: 2,
    ult: 'meter',
    mods: ['meteors'],
    teams: false,
    friendlyFire: false,
    players: Array.from({ length: n }, (_, i) => ({ fighter: 'kit', color: i, team: i, cpu: cpus.includes(i) ? 6 : 0, name: `P${i}`, tapJump: false })),
  };
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function run(nHumans: number, cpus: number[], latency: number, jitter: number, frames: number): number[] {
  const total = nHumans + cpus.length;
  const c = cfg(total, cpus);
  const humans = Array.from({ length: total }, (_, i) => i).filter((i) => !cpus.includes(i));
  const sessions = humans.map((h) => new Session(initState(structuredClone(c)), h, humans.filter((o) => o !== h), 2));
  const r = rng(7);
  // in-flight packets: [deliverAt, to, packet]
  let flight: [number, number, Packet][] = [];
  const inputOf = (frame: number, slot: number): number => {
    const x = Math.round(Math.sin(frame * 0.05 + slot) * 100);
    let b = 0;
    if ((frame + slot * 7) % 23 === 0) b |= B_ATTACK;
    if ((frame + slot * 3) % 41 === 0) b |= B_JUMP;
    if ((frame + slot * 5) % 67 === 0) b |= B_SPECIAL;
    if ((frame + slot) % 97 < 6) b |= B_SHIELD;
    return pack(x, (frame % 120) < 10 ? 100 : 0, b, 0);
  };
  for (let t = 0; t < frames + 200; t++) {
    // deliver
    const due = flight.filter((p) => p[0] <= t);
    flight = flight.filter((p) => p[0] > t);
    for (const [, to, p] of due) sessions[to].receive(p);
    sessions.forEach((s, k) => {
      if (t < frames) s.addLocal(inputOf(s.frame + 3, s.local));
      else s.addLocal(pack(0, 0, 0, 0));
      const p = s.packet(Math.max(0, s.frame - 20));
      sessions.forEach((_, j) => {
        if (j !== k) flight.push([t + latency + Math.floor(r() * jitter), j, p]);
      });
      s.advance();
    });
  }
  // let everyone settle on fully confirmed inputs: compare a confirmed snapshot
  const target = Math.min(...sessions.map((s) => s.minConfirmed())) - 5;
  return sessions.map((s) => {
    const snap = s.snapshot(target);
    return snap ? checksum(snap) : -1;
  });
}

describe('rollback netcode', () => {
  it('two players with 5-frame latency and jitter stay in sync', () => {
    const sums = run(2, [], 5, 4, 900);
    expect(sums[0]).not.toBe(-1);
    expect(sums[0]).toBe(sums[1]);
  });

  it('three players plus a CPU with heavy jitter stay in sync', () => {
    const sums = run(3, [3], 4, 9, 700);
    expect(sums[0]).not.toBe(-1);
    expect(new Set(sums).size).toBe(1);
  });
});
