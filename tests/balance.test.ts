// The balance table (D25): every entry names a fighter and stays within sane limits. The win rates themselves come
// from `npm run balance` (thousands of CPU matches, too slow for every test run); docs/BALANCE.md has the numbers.
import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/data/balance';
import { FIGHTER_INDEX, FIGHTERS } from '../src/sim/data';

describe('balance table', () => {
  it('names real fighters, with multipliers in range', () => {
    for (const [id, t] of Object.entries(TUNING)) {
      expect(FIGHTER_INDEX[id], id).toBeDefined();
      for (const [k, v] of Object.entries(t)) {
        expect(['power', 'reach', 'recovery', 'weight'], `${id}.${k}`).toContain(k);
        expect(v, `${id}.${k}`).toBeGreaterThan(0.75);
        expect(v, `${id}.${k}`).toBeLessThan(1.5);
      }
    }
  });

  it('is applied when the fighters load', () => {
    for (const [id, t] of Object.entries(TUNING)) {
      const def = FIGHTERS[FIGHTER_INDEX[id]].def;
      if (t.reach) expect(def.reach).toBe(t.reach);
      if (t.recovery) expect(def.recovery).toBe(t.recovery);
    }
  });
});
