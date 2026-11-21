// The menus sit on top of a live CPU match (attract mode) on a random stage with random fighters.
import { localMatch, type Match } from '../game/match';
import { PLAYER_TINTS } from '../render/renderer';
import { ROSTER, STAGES } from '../sim/data';
import type { MatchCfg } from '../sim/types';
import { audio } from '../audio/audio';

let current: Match | null = null;

export function startAttract(canvas: HTMLCanvasElement): void {
  if (current && !current.stopped) return;
  const pick = (): string => ROSTER[Math.floor(Math.random() * ROSTER.length)].def.id;
  const n = 2 + Math.floor(Math.random() * 3);
  const cfg: MatchCfg = {
    seed: Math.floor(Math.random() * 1e9),
    stage: STAGES[Math.floor(Math.random() * STAGES.length)].id,
    mode: 'stock',
    stocks: 2,
    time: 0,
    hp: 150,
    items: 2,
    ult: 'meter',
    mods: [],
    teams: false,
    friendlyFire: false,
    players: Array.from({ length: n }, (_, i) => ({ fighter: pick(), color: i, team: i, cpu: 5 + Math.floor(Math.random() * 4), name: '', tapJump: false })),
  };
  const m = localMatch(canvas, cfg, cfg.players.map(() => null), { names: [], tints: PLAYER_TINTS, palettes: cfg.players.map(() => Math.floor(Math.random() * 8)), local: [], hideHud: true, backdrop: true }, {
    onEnd: () => {
      current = null;
      setTimeout(() => startAttract(canvas), 50);
    },
  });
  m.r.fx.onEvent = null;
  m.start();
  audio.menuMusic();
  current = m;
}

export function stopAttract(): void {
  current?.stop();
  current = null;
}
