// Contestants: every bro's card (bio, line, move list, wins), unlock tasks with progress, and challenger fights.
import { canvasEl, inMatch, mainMenu, show, backToMenus } from '../app';
import { session, save } from '../game/session';
import { localMatch } from '../game/match';
import { ROSTER } from '../sim/data';
import { TASKS, taskFor } from '../data/tasks';
import { PLAYER_TINTS } from '../render/renderer';
import { audio } from '../audio/audio';
import { h, liveCanvas, toast } from './dom';
import { drawFighterAt, drawTile } from './portrait';
import { buildCfg, defaultRules } from './rules';
import { challengerSplash } from './results';
import { pauseMenu } from './pause';

let pending: string[] = [];

/** remember challengers that appeared during the last match, to run after the results screen */
export function queueChallengers(): void {
  pending = [...session.profile.challengers];
}

/** if a new contestant is waiting, run their fight, then continue */
export async function afterMatchChallengers(then: () => void): Promise<void> {
  const next = pending.shift() ?? session.profile.challengers[0];
  if (!next) return then();
  await challengerSplash(next);
  challengerFight(next, then);
}

export function challengerFight(fighter: string, then: () => void): void {
  const p = session.profile;
  const mine = p.settings.palette[p.unlocked[0]] !== undefined ? p.unlocked[0] : 'kit';
  const fav = Object.entries(p.used).sort((a, b) => b[1] - a[1])[0]?.[0] ?? mine;
  const cfg = buildCfg({ ...defaultRules(), stocks: 1, items: 0, stage: 'studio' }, [
    { fighter: p.unlocked.includes(fav) ? fav : 'kit', color: 0, team: 0, cpu: 0, name: session.user?.name ?? 'You', tapJump: p.settings.tapJumpKb },
    { fighter, color: 0, team: 1, cpu: 5, name: 'Challenger', tapJump: false },
  ]);
  inMatch();
  const m = localMatch(canvasEl, cfg, [{ kind: 'kb', index: 0, tapJump: p.settings.tapJumpKb }, null], { names: [session.user?.name ?? 'You', 'Challenger'], tints: PLAYER_TINTS, palettes: [p.settings.palette[fav] ?? 0, 0], local: [true, false] }, {
    onEnd: (st) => {
      backToMenus();
      const won = st.winner.includes(0);
      const def = ROSTER.find((r) => r.def.id === fighter)?.def;
      if (won) {
        p.unlocked.push(fighter);
        p.challengers = p.challengers.filter((x) => x !== fighter);
        save();
        audio.sfx('ultimate');
        toast(`${def?.name} joined your roster! “${def?.line}”`, 'gold', 6000);
      } else toast(`${def?.name} got away. Rematch them any time from Contestants.`, 'bad', 5000);
      then();
    },
    onPause: (resume, quit) => pauseMenu(resume, quit),
    onQuit: () => (backToMenus(), then()),
  });
  m.start();
}

export function rosterScreen(selected?: string): void {
  show((root) => {
    const p = session.profile;
    const stops: (() => void)[] = [];
    let cur = selected ?? p.unlocked[0];
    const detail = h('div.panel');
    const grid = h('div.roster');
    const renderDetail = (): void => {
      for (const s of stops.splice(0)) s();
      buildGrid();
      const r = ROSTER.find((x) => x.def.id === cur)!;
      const d = r.def;
      const locked = !p.unlocked.includes(cur);
      const task = taskFor(cur);
      const cv = liveCanvas('broccv', (c, w, hh, t) => {
        c.fillStyle = d.color;
        c.globalAlpha = 0.25;
        c.fillRect(0, 0, w, hh);
        c.globalAlpha = 1;
        drawFighterAt(c, cur, p.settings.palette[cur] ?? 0, w / 2, hh * 0.9, hh * 0.72, t, t % 300 < 150 ? 'idle' : 'taunt', 1, locked);
      });
      stops.push(cv.stop);
      const mn = d.moveNames;
      const challenger = p.challengers.includes(cur);
      detail.replaceChildren(
        h(
          'div.bro-card',
          cv.el,
          h(
            'div.col',
            h('h2', locked ? '???' : d.name),
            h('div.display', { style: { color: 'var(--gold)', fontSize: '15px' } }, locked ? 'A mystery bro' : `“${d.title}” · ${d.role}`),
            locked
              ? h(
                  'div.col',
                  h('div', h('b', task?.title ?? 'Locked'), ` — ${task?.desc ?? ''}`),
                  task ? h('div.progress', h('div', { style: { width: `${Math.min(100, (task.progress(p) / task.goal) * 100)}%` } })) : '',
                  task ? h('div.small.dim', `${Math.min(task.goal, task.progress(p))} / ${task.goal}`) : '',
                  challenger ? h('button.big.primary', { onclick: () => void challengerSplash(cur).then(() => challengerFight(cur, () => rosterScreen(cur))) }, 'Fight the challenger!') : '',
                )
              : h(
                  'div.col',
                  h('div', d.bio),
                  h('div.quote', `“${d.line}”`),
                  h('div.small', h('b', 'Taunt: '), d.taunt),
                  h(
                    'div.card',
                    h('b', 'Specials'),
                    h('div.small', `B: ${mn.nspec ?? '—'} · Side B: ${mn.sspec ?? '—'} · Up B: ${mn.uspec ?? '—'} · Down B: ${mn.dspec ?? '—'}`),
                    h('div.small', h('b', 'Ultimate: '), mn.ult ?? '—'),
                  ),
                  h('div.small.dim', `Weight ${d.weight} · ${p.used[cur] ?? 0} matches · ${p.wins[cur] ?? 0} wins · Classic best: ${p.classic[cur] ? `Intensity ${p.classic[cur]}` : 'not cleared'}`),
                  h('div.small', h('b', 'Win quotes: '), d.wins.map((w) => `“${w}”`).join('  ')),
                ),
          ),
        ),
      );
    };
    const buildGrid = (): void => {
      grid.replaceChildren();
      for (const r of ROSTER) {
        const id = r.def.id;
        const locked = !p.unlocked.includes(id);
        const tile = h(`div.rtile${locked ? '.locked' : ''}`, { style: { outline: id === cur ? '4px solid #fff' : '', cursor: 'pointer' } });
        const tcv = liveCanvas('tilecv', (c, w, hh, t) => drawTile(c, w, hh, id, 0, t, locked), 4);
        stops.push(tcv.stop);
        tile.append(tcv.el, h('div.nm', locked ? (p.challengers.includes(id) ? '! CHALLENGER' : '???') : r.def.name));
        tile.addEventListener('click', () => {
          cur = id;
          audio.sfx('menu');
          renderDetail();
        });
        grid.appendChild(tile);
      }
    };
    const done = TASKS.filter((t) => p.unlocked.includes(t.fighter)).length;
    root.appendChild(h('div.screen', h('div.topbar', h('button', { onclick: () => mainMenu() }, '◀ Back'), h('h2', 'Contestants'), h('span.chip', `${p.unlocked.length} / 16 unlocked · ${done} / ${TASKS.length} tasks`)), h('div.col', { style: { width: '100%', maxWidth: '1200px' } }, grid, detail)));
    renderDetail();
    return () => stops.forEach((s) => s());
  });
}
