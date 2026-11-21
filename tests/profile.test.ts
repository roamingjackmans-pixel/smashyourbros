// Saves, stats and unlock tasks.
import { describe, expect, it } from 'vitest';
import { checkTasks, TASKS } from '../src/data/tasks';
import { allNodes, foeConfigs, nextNode, unlockedNode } from '../src/data/story';
import { classicRounds } from '../src/data/classic';
import { fixProfile, newProfile, recordMatch, STARTERS } from '../src/game/profile';
import { FIGHTER_INDEX, ROSTER } from '../src/sim/data';
import { initState, step } from '../src/sim/sim';

describe('profile and tasks', () => {
  it('starts with the four starters and repairs old saves', () => {
    const p = newProfile();
    expect(p.unlocked).toEqual(STARTERS);
    const fixed = fixProfile({ unlocked: ['hoot', 'nobody'] } as never);
    expect(fixed.unlocked).toContain('kit');
    expect(fixed.unlocked).toContain('hoot');
    expect(fixed.unlocked).not.toContain('nobody');
  });

  it('every locked fighter has exactly one task, and every task fighter exists', () => {
    const locked = ROSTER.map((r) => r.def.id).filter((id) => !STARTERS.includes(id));
    for (const id of locked) expect(TASKS.filter((t) => t.fighter === id).length).toBe(1);
    for (const t of TASKS) expect(FIGHTER_INDEX[t.fighter]).toBeDefined();
  });

  it('finishing a task queues the challenger once', () => {
    const p = newProfile();
    p.stats.kos = 29;
    expect(checkTasks(p)).toEqual([]);
    p.stats.kos = 30;
    const done = checkTasks(p);
    expect(done.map((t) => t.fighter)).toEqual(['bouldar']);
    expect(p.challengers).toEqual(['bouldar']);
    expect(checkTasks(p)).toEqual([]);
  });

  it('records a finished match into the stats', () => {
    const p = newProfile();
    const st = initState({ seed: 3, stage: 'studio', mode: 'stock', stocks: 1, time: 60, hp: 150, items: 0, ult: 'meter', mods: ['bounty'], teams: false, friendlyFire: false, players: [0, 1].map((i) => ({ fighter: 'kit', color: i, team: i, cpu: 8, name: 'x', tapJump: false })) });
    while (!st.over && st.frame < 60 * 70) step(st, [0, 0]);
    recordMatch(p, st, { mode: 'versus', local: [0] });
    expect(p.stats.matches).toBe(1);
    expect(p.stats.modMatches).toBe(1);
    expect(p.used.kit).toBe(1);
  });
});

describe('story and classic data', () => {
  it('story segments unlock in order and every foe is a real fighter', () => {
    const nodes = allNodes();
    expect(nodes.length).toBeGreaterThan(20);
    expect(unlockedNode([], nodes[0].id)).toBe(true);
    expect(unlockedNode([], nodes[1].id)).toBe(false);
    expect(nextNode([nodes[0].id])?.id).toBe(nodes[1].id);
    for (const n of nodes) for (const f of foeConfigs(n, 2)) expect(FIGHTER_INDEX[f.fighter]).toBeDefined();
  });

  it('classic has 8 rounds for every fighter, ending with the host', () => {
    for (const r of ROSTER) {
      const rounds = classicRounds(r.def.id);
      expect(rounds.length).toBe(8);
      expect(rounds[7].foes[0].fighter).toBe('max');
      for (const rd of rounds) for (const f of rd.foes) expect(FIGHTER_INDEX[f.fighter]).toBeDefined();
    }
  });
});
