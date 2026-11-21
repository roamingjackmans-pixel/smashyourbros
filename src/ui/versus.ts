// Local versus (couch + CPUs) and practice: character select → stage → fight → results → rematch.
import { inMatch, mainMenu, show, canvasEl, backToMenus } from '../app';
import { session, save } from '../game/session';
import { localMatch } from '../game/match';
import type { Device } from '../game/input';
import { PLAYER_TINTS, TEAM_TINTS } from '../render/renderer';
import type { PlayerCfg, State } from '../sim/types';
import { ROSTER } from '../sim/data';
import { audio } from '../audio/audio';
import { h, modal } from './dom';
import { Picker, slotTint, type SlotPick } from './picker';
import { buildCfg, defaultRules, rulesModal, rulesSummary, stagePicker, type Rules } from './rules';
import { resultsScreen } from './results';
import { pauseMenu } from './pause';

let lastSlots: SlotPick[] | null = null;
let lastRules: Rules | null = null;

function defaultSlots(): SlotPick[] {
  const p = session.profile;
  const fav = Object.entries(p.used).sort((a, b) => b[1] - a[1])[0]?.[0];
  const first = fav && p.unlocked.includes(fav) ? fav : 'kit';
  const other = p.unlocked.find((id) => id !== first) ?? 'kit';
  return [
    { kind: 'human', fighter: first, palette: p.settings.palette[first] ?? 0, cpu: 5, team: 0, device: { kind: 'kb', index: 0, tapJump: p.settings.tapJumpKb }, name: session.user?.name ?? 'P1' },
    { kind: 'cpu', fighter: other, palette: 1, cpu: 5, team: 1, device: null, name: 'P2' },
    { kind: 'off', fighter: 'kit', palette: 2, cpu: 5, team: 0, device: null, name: 'P3' },
    { kind: 'off', fighter: 'kit', palette: 3, cpu: 5, team: 1, device: null, name: 'P4' },
  ];
}

export function playerCfgs(slots: SlotPick[], teams: boolean): PlayerCfg[] {
  const p = session.profile;
  return slots
    .filter((s) => s.kind !== 'off')
    .map((s, i) => ({
      fighter: s.random ? ROSTER.filter((r) => p.unlocked.includes(r.def.id))[Math.floor(Math.random() * p.unlocked.length)]?.def.id ?? s.fighter : s.fighter,
      color: s.palette,
      team: teams ? s.team : i,
      cpu: s.kind === 'cpu' ? s.cpu : 0,
      name: s.kind === 'cpu' ? `CPU ${i + 1}` : s.name || `P${i + 1}`,
      tapJump: s.device ? (s.device.kind === 'pad' ? p.settings.tapJumpPad : p.settings.tapJumpKb) : false,
    }));
}

export function versusScreen(): void {
  const slots = lastSlots ?? defaultSlots();
  const rules = lastRules ?? defaultRules();
  lastSlots = slots;
  lastRules = rules;
  show((root) => {
    let picker: Picker;
    const summary = h('span.chip', rulesSummary(rules));
    const rebuild = (): void => {
      picker?.destroy();
      picker = new Picker(slots, {
        unlocked: session.profile.unlocked,
        teams: rules.teams,
        editable: () => true,
        canSwitchKind: (i) => i > 0 || slots[i].kind !== 'human' || true,
        devices: true,
        onChange: () => (summary.textContent = rulesSummary(rules)),
        active: 0,
      });
      holder.replaceChildren(picker.el);
    };
    const holder = h('div', { style: { width: '100%', maxWidth: '1280px' } });
    const fight = h('button.big.primary', { onclick: () => stageStep() }, 'FIGHT! ▶');
    root.appendChild(
      h(
        'div.screen',
        h('div.topbar', h('button', { onclick: () => mainMenu() }, '◀ Back'), h('h2', 'Pick your bros'), summary, h('button.gold', { onclick: () => rulesModal(rules, () => ((summary.textContent = rulesSummary(rules)), rebuild())) }, 'Rules'), fight),
        holder,
        h('div.small.dim', { style: { marginTop: '10px' } }, 'Click a fighter for the highlighted slot. Click a slot to pick for it. 👤/🤖 switches human/CPU/off. Gamepads: choose them on a human slot.'),
      ),
    );
    rebuild();
    return () => picker?.destroy();
  });

  function stageStep(): void {
    const active = slots.filter((s) => s.kind !== 'off');
    if (active.length < 2) {
      modal(h('div', h('h3', 'Need at least two bros'), h('p', 'Add a CPU or another player. Even bros need bros.')));
      return;
    }
    show((root) => {
      const sp = stagePicker(rules, () => {});
      root.appendChild(
        h(
          'div.screen',
          h('div.topbar', h('button', { onclick: () => versusScreen() }, '◀ Fighters'), h('h2', 'Pick a stage'), h('button.big.primary', { onclick: () => startMatch() }, 'LET’S GO! ▶')),
          h('div.panel', { style: { width: '100%', maxWidth: '1100px' } }, sp),
        ),
      );
      return () => (sp as HTMLElement & { stop?: () => void }).stop?.();
    });
  }

  function startMatch(): void {
    if (!seenControls()) {
      markControls();
      const close = modal(h('div.col', { style: { width: 'min(720px, 92vw)' } }, h('h2', 'How to smash'), controlsHelp(), h('button.big.primary', { onclick: () => (close(), startMatch()) }, 'Got it, let’s smash')), { wide: true });
      return;
    }
    const players = playerCfgs(slots, rules.teams);
    const cfg = buildCfg(rules, players);
    const live = slots.filter((s) => s.kind !== 'off');
    const devices: (Device | null)[] = live.map((s) => (s.kind === 'human' ? (s.device ?? { kind: 'kb', index: 0, tapJump: false }) : null));
    const tints = live.map((s, i) => (rules.teams ? TEAM_TINTS[s.team % TEAM_TINTS.length] : PLAYER_TINTS[i]));
    const palettes = live.map((s) => s.palette);
    for (const s of live) if (s.kind === 'human') session.profile.settings.palette[s.fighter] = s.palette;
    save();
    inMatch();
    const names = players.map((p, i) => (p.cpu ? `CPU Lv${p.cpu}` : live[i].name || `P${i + 1}`));
    const m = localMatch(canvasEl, cfg, devices, { names, tints, palettes, local: live.map((s) => s.kind === 'human') }, {
      onEnd: (st: State) => {
        backToMenus();
        resultsScreen({
          st,
          names,
          palettes,
          tints,
          ctx: { mode: 'versus', local: live.map((s, i) => (s.kind === 'human' ? i : -1)).filter((i) => i >= 0) },
          actions: [
            { label: 'Rematch', cls: 'primary', fn: () => startMatch() },
            { label: 'Change fighters', fn: () => versusScreen() },
            { label: 'Main menu', fn: () => void import('./roster').then((r) => r.afterMatchChallengers(() => mainMenu())) },
          ],
        });
        void import('./roster').then((r) => r.queueChallengers());
      },
      onPause: (resume, quit) => pauseMenu(resume, quit),
      onQuit: () => (backToMenus(), versusScreen()),
    });
    m.start();
    audio.sfx('go');
  }
}

/** practice: you vs a dummy (or a CPU), hitboxes on, infinite stocks */
export function practiceScreen(): void {
  show((root) => {
    const p = session.profile;
    const slots: SlotPick[] = [
      { kind: 'human', fighter: p.unlocked[0], palette: 0, cpu: 0, team: 0, device: { kind: 'kb', index: 0, tapJump: p.settings.tapJumpKb }, name: 'You' },
      { kind: 'cpu', fighter: 'kit', palette: 1, cpu: 1, team: 1, device: null, name: 'Dummy' },
    ];
    const rules = defaultRules();
    rules.items = 0;
    let level = 0;
    const picker = new Picker(slots, { unlocked: p.unlocked, teams: false, editable: () => true, canSwitchKind: () => false, devices: true, onChange: () => {}, active: 0, maxSlots: 2 });
    const lv = h('span.chip', 'Dummy: stands still');
    const setLv = (d: number): void => {
      level = Math.max(0, Math.min(9, level + d));
      lv.textContent = level ? `Dummy: CPU Lv ${level}` : 'Dummy: stands still';
    };
    root.appendChild(
      h(
        'div.screen',
        h(
          'div.topbar',
          h('button', { onclick: () => (picker.destroy(), mainMenu()) }, '◀ Back'),
          h('h2', 'Practice'),
          h('button.tiny', { onclick: () => setLv(-1) }, '−'),
          lv,
          h('button.tiny', { onclick: () => setLv(1) }, '+'),
          h(
            'button.big.primary',
            {
              onclick: () => {
                picker.destroy();
                const players = playerCfgs(slots, false);
                players[1].cpu = level;
                const cfg = buildCfg({ ...rules, stage: 'studio' }, players);
                cfg.practice = true;
                cfg.mode = 'stock';
                cfg.stocks = 99;
                inMatch();
                const m = localMatch(canvasEl, cfg, [slots[0].device, null], { names: ['You', 'Dummy'], tints: PLAYER_TINTS, palettes: [slots[0].palette, slots[1].palette], local: [true, false], boxes: true }, {
                  onEnd: () => practiceScreen(),
                  onPause: (resume, quit) => pauseMenu(resume, quit, true),
                });
                m.start();
                backToMenusLater();
              },
            },
            'Train ▶',
          ),
        ),
        picker.el,
        h('div.panel.small', { style: { marginTop: '12px', maxWidth: '900px' } }, controlsHelp()),
      ),
    );
    return () => picker.destroy();
  });
}

function backToMenusLater(): void {
  /* the practice match returns to the practice screen itself */
}

export function controlsHelp(): HTMLElement {
  const k = (s: string): HTMLElement => h('span.kbd', s);
  return h(
    'div.col',
    h('b', 'Keyboard (default)'),
    h('div', 'Move ', k('W'), k('A'), k('S'), k('D'), ' · Jump ', k('Space'), ' · Attack ', k('J'), ' · Special ', k('K'), ' · Shield ', k('L'), ' · Grab ', k('I'), ' · Ultimate ', k('O'), ' (or Attack+Special) · Taunt ', k('T'), ' · Walk/tilt ', k('Shift')),
    h('div', 'Smash attacks: tap a direction and ', k('J'), ' together, or use the arrow keys (smash stick). Hold to charge. Arrow keys in the air = aerials.'),
    h('div', 'Shield + direction = roll / spot dodge · Shield in the air = air dodge · Press shield as you hit the floor while tumbling = tech · Shield right as a hit lands = PARRY.'),
    h('b', 'Gamepad'),
    h('div', 'Stick/d-pad move · A attack · B special · X/Y jump · RB/RT shield · LB/LT grab · right stick = smash stick · stick clicks = ultimate · Start = pause.'),
    h('div.tiny.dim', 'Ctrl+H toggles hitbox view in any local match.'),
  );
}

void slotTint;

function seenControls(): boolean {
  try {
    return localStorage.getItem('syb.seenControls') === '1';
  } catch {
    return true;
  }
}
function markControls(): void {
  try {
    localStorage.setItem('syb.seenControls', '1');
  } catch {
    /* private mode */
  }
}
