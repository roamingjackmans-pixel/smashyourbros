// Online: friends (shared with Shoallhell), lobbies with 4-digit codes, the lobby itself (everyone picks a fighter
// and readies up, the host sets rules / stage / CPUs / activity), then the rollback match for everyone at once.
import { canvasEl, inMatch, mainMenu, show, backToMenus } from '../app';
import { session } from '../game/session';
import { Match } from '../game/match';
import type { Device } from '../game/input';
import { api, type FriendsView } from '../net/api';
import { Net, type RoomView } from '../net/socket';
import { OnlineDriver } from '../net/online';
import { nextNode, nodeById } from '../data/story';
import { FIGHTER_INDEX, FIGHTERS } from '../sim/data';
import type { MatchCfg, State } from '../sim/types';
import { PLAYER_TINTS, TEAM_TINTS } from '../render/renderer';
import { audio } from '../audio/audio';
import { h, modal, toast } from './dom';
import { deviceOptions, Picker, type SlotPick } from './picker';
import { buildCfg, defaultRules, rulesModal, rulesSummary, stagePicker, type Rules } from './rules';
import { resultsScreen } from './results';
import { nodeCfg } from './storyUi';

interface LobbyPlayer {
  userId: string;
  name: string;
  fighter: string;
  palette: number;
  team: number;
  ready: boolean;
}
interface LobbyCpu {
  fighter: string;
  palette: number;
  cpu: number;
  team: number;
}
interface LobbyState {
  code: string;
  host: string;
  rules: Rules;
  activity: 'versus' | 'story';
  node?: string;
  players: LobbyPlayer[];
  cpus: LobbyCpu[];
}
interface StartMsg {
  t: 'start';
  cfg: MatchCfg;
  slots: string[];
  names: string[];
  palettes: number[];
  tints: string[];
  delay: number;
  activity: 'versus' | 'story';
  node?: string;
}

let lobby: LobbyState | null = null;
let net: Net | null = null;
let offs: (() => void)[] = [];
let myDevice: Device = { kind: 'kb', index: 0, tapJump: false };

function me(): string {
  return session.user?.id ?? '';
}

// ------------------------------------------------------------------ entry

export async function onlineScreen(joinCode?: string, activity?: 'story'): Promise<void> {
  if (!session.online) {
    modal(h('div.col', h('h3', 'Sign in to play online'), h('p', 'Online lobbies and friends need an account (the same one as Shoallhell). Your offline progress stays on this device.'), h('button.primary', { onclick: () => void import('../app').then((a) => a.doSignOut()) }, 'Sign in')));
    return;
  }
  show((root) => {
    root.appendChild(h('div.screen', h('div.topbar', h('button', { onclick: () => mainMenu() }, '◀ Back'), h('h2', 'Online')), h('div.panel', 'Connecting to the studio…')));
  });
  try {
    net = await Net.shared();
  } catch (e) {
    toast((e as Error).message, 'bad');
    mainMenu();
    return;
  }
  if (joinCode) return joinLobby(joinCode);
  homeScreen(activity);
}

function homeScreen(activity?: 'story'): void {
  show((root) => {
    const code = h('input', { type: 'text', placeholder: '4-digit code', maxlength: '5', inputmode: 'numeric', style: { width: '160px', fontSize: '24px', textAlign: 'center', letterSpacing: '4px' } }) as HTMLInputElement;
    const friendsBox = h('div.list');
    root.appendChild(
      h(
        'div.screen',
        h('div.topbar', h('button', { onclick: () => mainMenu() }, '◀ Back'), h('h2', 'Online')),
        h(
          'div.rules',
          h(
            'div.panel.col',
            h('h3', 'Start a lobby'),
            h('div.dim', 'Up to 4 bros. You set the rules; friends join with your code, an invite, or from their friends list.'),
            h('button.big.primary', { onclick: () => void createLobby(activity) }, activity === 'story' ? 'Create a story co-op lobby' : 'Create lobby'),
            h('h3', { style: { marginTop: '14px' } }, 'Join with a code'),
            h('div.row', code, h('button.big.gold', { onclick: () => void joinLobby(code.value.trim()) }, 'Join')),
          ),
          h('div.panel.col', h('div.row', h('h3.grow', 'Friends'), h('button.tiny', { onclick: () => friendsModal() }, 'Manage')), friendsBox),
        ),
      ),
    );
    const fill = async (): Promise<void> => {
      try {
        const v = await api.friends();
        friendsBox.replaceChildren(h('div.small', 'Your friend code: ', h('b.code', { style: { fontSize: '22px' } }, v.code)), ...friendRows(v, false));
      } catch (e) {
        friendsBox.replaceChildren(h('div.err', (e as Error).message));
      }
    };
    void fill();
    const off = net!.on('friends', () => void fill());
    code.addEventListener('keydown', (e) => e.key === 'Enter' && void joinLobby(code.value.trim()));
    return off;
  });
}

function friendRows(v: FriendsView, inLobby: boolean, close?: () => void): HTMLElement[] {
  const sorted = [...v.friends].sort((a, b) => Number(!!b.online) - Number(!!a.online) || a.name.localeCompare(b.name));
  if (!sorted.length) return [h('div.small.dim', 'No friends yet. Swap 4-digit friend codes with your bros (Shoallhell friends show up here too).')];
  return sorted.map((f) => {
    const where = f.game === 'syb' ? (f.lobby ? `in a lobby (${f.lobby})` : 'playing Smash Your Bros') : f.game === 'shoallhell' ? (f.lobby ? 'in a Shoallhell lobby' : 'playing Shoallhell') : f.online ? 'online' : 'offline';
    return h(
      'div.card.row',
      h('span', { style: { color: f.online ? 'var(--good)' : 'var(--dim)', fontSize: '18px' } }, '●'),
      h('div.grow', h('b', f.name), h('div.small.dim', where)),
      inLobby && f.online ? h('button.tiny.primary', { onclick: () => void net?.invite(f.id).then(() => toast(`Invited ${f.name}. They’re gonna love it.`)).catch((e: Error) => toast(e.message, 'bad')) }, 'Invite') : '',
      !inLobby && f.lobby && f.game === 'syb' ? h('button.tiny.gold', { onclick: () => (close?.(), void joinLobby(f.lobby!)) }, 'Join') : '',
    );
  });
}

export function friendsModal(): void {
  const body = h('div.col');
  const close = modal(h('div.col', { style: { width: 'min(520px, 90vw)' } }, h('div.row', h('h2.grow', '👥 Bros'), h('button', { onclick: () => close() }, 'Close')), body));
  const render = async (): Promise<void> => {
    let v: FriendsView;
    try {
      v = await api.friends();
    } catch (e) {
      body.replaceChildren(h('div.err', (e as Error).message));
      return;
    }
    const code = h('input', { type: 'text', placeholder: 'Their friend code', maxlength: '5', inputmode: 'numeric', style: { width: '150px' } }) as HTMLInputElement;
    body.replaceChildren(
      h('div', 'Your friend code: ', h('span.code', v.code)),
      h('div.dim.small', 'Same friends list as Shoallhell.'),
      h(
        'div.row',
        code,
        h(
          'button.primary',
          {
            onclick: async () => {
              try {
                const r = await api.addFriend(code.value.trim());
                toast(r.friends ? 'You’re bros now!' : 'Request sent. They’ll see it next time they play.');
                void render();
              } catch (e) {
                toast((e as Error).message, 'bad');
              }
            },
          },
          'Add bro',
        ),
      ),
      v.incoming.length ? h('h3', 'Requests') : '',
      ...v.incoming.map((f) => h('div.card.row', h('b.grow', f.name), h('button.tiny.primary', { onclick: () => void api.acceptFriend(f.id).then(() => render()) }, 'Accept'), h('button.tiny', { onclick: () => void api.removeFriend(f.id).then(() => render()) }, 'Decline'))),
      h('h3', `Friends (${v.friends.length})`),
      ...friendRows(v, !!lobby, close),
      v.outgoing.length ? h('h3', 'Waiting for them') : '',
      ...v.outgoing.map((f) => h('div.card.row', h('span.grow', f.name), h('button.tiny', { onclick: () => void api.removeFriend(f.id).then(() => render()) }, 'Cancel'))),
    );
  };
  void render();
}

// ------------------------------------------------------------------ lobby lifecycle

function wire(): void {
  for (const f of offs) f();
  offs = [];
  const n = net!;
  offs.push(
    n.on('room', (r: RoomView) => {
      if (!lobby) return;
      if (isHost()) {
        syncMembers(r);
        broadcast();
      }
      if (!lobbyOpen) return;
      renderLobby?.();
    }),
    n.on('closed', (m: { reason: string }) => {
      toast(m.reason || 'The lobby closed.', 'bad');
      leaveLobby();
    }),
    n.on('hostmsg', (m: { t: string; s?: LobbyState }) => {
      if (m.t === 'lobby' && m.s) {
        lobby = m.s;
        if (lobbyOpen) renderLobby?.();
        else if (!inGame) lobbyScreen();
      }
      if (m.t === 'start') startOnlineMatch(m as unknown as StartMsg);
    }),
    n.on('guestmsg', (m: { from: string; msg: { t: string; fighter?: string; palette?: number; team?: number; v?: boolean } }) => {
      if (!lobby || !isHost()) return;
      const pl = lobby.players.find((p) => p.userId === m.from);
      if (!pl) return;
      if (m.msg.t === 'pick') {
        if (m.msg.fighter && FIGHTER_INDEX[m.msg.fighter] !== undefined) pl.fighter = m.msg.fighter;
        if (typeof m.msg.palette === 'number') pl.palette = m.msg.palette % 8;
        if (typeof m.msg.team === 'number') pl.team = m.msg.team % 2;
        pl.ready = false;
      }
      if (m.msg.t === 'ready') pl.ready = !!m.msg.v;
      broadcast();
      renderLobby?.();
    }),
  );
}

function isHost(): boolean {
  return !!lobby && lobby.host === me();
}

function syncMembers(r: RoomView): void {
  if (!lobby) return;
  const ids = r.players.map((p) => p.userId);
  lobby.players = lobby.players.filter((p) => ids.includes(p.userId));
  for (const rp of r.players) {
    if (lobby.players.some((p) => p.userId === rp.userId)) continue;
    lobby.players.push({ userId: rp.userId, name: rp.name, fighter: 'kit', palette: lobby.players.length, team: lobby.players.length % 2, ready: false });
  }
  while (lobby.players.length + lobby.cpus.length > 4 && lobby.cpus.length) lobby.cpus.pop();
}

function broadcast(): void {
  if (lobby && isHost()) net?.hostSend({ t: 'lobby', s: lobby });
}

async function createLobby(activity?: 'story'): Promise<void> {
  try {
    const r = await net!.create();
    const p = session.profile;
    const fav = Object.entries(p.used).sort((a, b) => b[1] - a[1])[0]?.[0];
    lobby = {
      code: r.code,
      host: me(),
      rules: defaultRules(),
      activity: activity ?? 'versus',
      node: activity === 'story' ? nextNode(p.story.cleared)?.id : undefined,
      players: [{ userId: me(), name: session.user?.name ?? 'Host', fighter: fav && p.unlocked.includes(fav) ? fav : p.unlocked[0], palette: 0, team: 0, ready: false }],
      cpus: [],
    };
    wire();
    lobbyScreen();
  } catch (e) {
    toast((e as Error).message, 'bad');
  }
}

async function joinLobby(code: string): Promise<void> {
  if (!/^\d{4,5}$/.test(code)) {
    toast('Lobby codes are 4 digits, bro.', 'bad');
    return;
  }
  if (!net) net = await Net.shared();
  try {
    await net.join(code);
    lobby = null;
    wire();
    net.guestSend({ t: 'pick', fighter: session.profile.unlocked[0], palette: 1 });
    show((root) => {
      root.appendChild(h('div.screen', h('div.topbar', h('h2', `Joining ${code}…`)), h('div.panel', 'Waiting for the host to send the lobby.')));
    });
  } catch (e) {
    toast((e as Error).message, 'bad');
    homeScreen();
  }
}

function leaveLobby(): void {
  net?.leave();
  for (const f of offs) f();
  offs = [];
  lobby = null;
  lobbyOpen = false;
  inGame = false;
  homeScreen();
}

// ------------------------------------------------------------------ the lobby screen

let renderLobby: (() => void) | null = null;
let lobbyOpen = false;
let inGame = false;

function lobbyScreen(): void {
  inGame = false;
  show((root) => {
    lobbyOpen = true;
    let picker: Picker | null = null;
    let stageEl: (HTMLElement & { stop?: () => void }) | null = null;
    const body = h('div.col', { style: { width: '100%', maxWidth: '1280px' } });
    const header = h('div.topbar');
    root.appendChild(h('div.screen', header, body));
    const render = (): void => {
      if (!lobby) return;
      const L = lobby;
      const host = isHost();
      const mine = L.players.find((p) => p.userId === me());
      picker?.destroy();
      stageEl?.stop?.();
      // slots: humans (lobby order) then CPUs
      const slots: SlotPick[] = [
        ...L.players.map((p) => ({ kind: 'human' as const, fighter: p.fighter, palette: p.palette, cpu: 0, team: p.team, device: p.userId === me() ? myDevice : null, name: p.name, userId: p.userId, ready: p.ready, remote: p.userId !== me() })),
        ...L.cpus.map((c) => ({ kind: 'cpu' as const, fighter: c.fighter, palette: c.palette, cpu: c.cpu, team: c.team, device: null, name: 'CPU' })),
      ];
      while (slots.length < 4) slots.push({ kind: 'off', fighter: 'kit', palette: slots.length, cpu: 5, team: slots.length % 2, device: null, name: '' });
      const story = L.activity === 'story';
      picker = new Picker(slots, {
        unlocked: session.profile.unlocked,
        teams: L.rules.teams && !story,
        editable: (i) => (slots[i].userId === me() ? true : host && slots[i].kind !== 'human'),
        canSwitchKind: (i) => host && slots[i].kind !== 'human' && !story,
        devices: true,
        active: Math.max(0, slots.findIndex((s) => s.userId === me())),
        onChange: () => {
          // write back what this machine may edit
          const ms = slots.find((s) => s.userId === me());
          if (ms) {
            if (ms.device) myDevice = ms.device;
            if (host && mine) {
              mine.fighter = ms.fighter;
              mine.palette = ms.palette;
              mine.team = ms.team;
              mine.ready = false;
            } else net?.guestSend({ t: 'pick', fighter: ms.fighter, palette: ms.palette, team: ms.team });
          }
          if (host) {
            L.cpus = slots.filter((s) => s.kind === 'cpu').map((s) => ({ fighter: s.fighter, palette: s.palette, cpu: s.cpu, team: s.team }));
            while (L.players.length + L.cpus.length > 4) L.cpus.pop();
            broadcast();
          }
        },
      });
      const allReady = L.players.every((p) => p.ready || p.userId === L.host);
      const enough = L.players.length + L.cpus.length >= 2 || story;
      header.replaceChildren(
        h('button', { onclick: () => leaveLobby() }, '✕ Leave'),
        h('h2', host ? 'Your lobby' : 'Lobby'),
        h('span.chip', 'Code ', h('b.code', { style: { fontSize: '22px', letterSpacing: '3px' } }, L.code)),
        h('button.tiny', { onclick: () => friendsModal() }, '👥 Invite'),
        host
          ? h('button.big.primary', { disabled: !allReady || !enough, title: allReady ? '' : 'Waiting for everyone to ready up', onclick: () => hostStart() }, story ? 'Roll camera ▶' : 'START ▶')
          : h(`button.big${mine?.ready ? '.teal' : '.primary'}`, { onclick: () => net?.guestSend({ t: 'ready', v: !mine?.ready }) }, mine?.ready ? 'READY ✔' : 'Ready up'),
      );
      const nodeTitle = story ? (nodeById(L.node ?? '')?.title ?? '—') : '';
      const info = h(
        'div.row.wrap',
        h('div.seg', h(`button${!story ? '.on' : ''}`, { disabled: !host, onclick: () => ((L.activity = 'versus'), broadcast(), render()) }, 'Versus'), h(`button${story ? '.on' : ''}`, { disabled: !host, onclick: () => ((L.activity = 'story'), (L.node = L.node ?? nextNode(session.profile.story.cleared)?.id), (L.cpus = []), broadcast(), render()) }, 'Story co-op')),
        story ? h('span.chip', `📺 ${nodeTitle}`) : h('span.chip', rulesSummary(L.rules)),
        story && host ? h('button.tiny', { onclick: () => pickNode(L, render) }, 'Change segment') : '',
        !story ? h('button.gold', { onclick: () => rulesModal(L.rules, () => (broadcast(), render()), host) }, host ? 'Rules' : 'See rules') : '',
        h('span.small.dim.grow', host ? 'Everyone readies up, then you start. Click empty slots to add CPUs.' : 'Pick your bro and ready up. The host starts the match.'),
      );
      body.replaceChildren(info, picker.el);
      if (!story) {
        stageEl = stagePicker(L.rules, () => broadcast(), host) as HTMLElement & { stop?: () => void };
        body.appendChild(h('div.panel', stageEl));
      }
    };
    renderLobby = render;
    render();
    return () => {
      lobbyOpen = false;
      renderLobby = null;
      picker?.destroy();
      stageEl?.stop?.();
    };
  });
}

function pickNode(L: LobbyState, then: () => void): void {
  const cleared = session.profile.story.cleared;
  const body = h('div.list');
  const close = modal(h('div.col', { style: { width: 'min(560px, 90vw)' } }, h('h3', 'Story segment'), body));
  void import('../data/story').then(({ EPISODES, unlockedNode }) => {
    for (const ep of EPISODES)
      for (const n of ep.nodes) {
        if (!unlockedNode(cleared, n.id)) continue;
        body.appendChild(h('button', { style: { textAlign: 'left' }, onclick: () => ((L.node = n.id), broadcast(), close(), then()) }, `E${ep.n} · ${n.title}${cleared.includes(n.id) ? ' ✔' : ''}`));
      }
  });
}

function hostStart(): void {
  if (!lobby || !net) return;
  const L = lobby;
  const p = session.profile;
  const humans = L.players.map((pl, i) => ({ fighter: pl.fighter, color: pl.palette, team: L.rules.teams ? pl.team : i, cpu: 0, name: pl.name, tapJump: false }));
  let cfg: MatchCfg;
  if (L.activity === 'story') {
    const node = nodeById(L.node ?? '') ?? nextNode(p.story.cleared);
    if (!node) return;
    cfg = nodeCfg(node, humans);
  } else {
    const cpus = L.cpus.map((c, i) => ({ fighter: c.fighter, color: c.palette, team: L.rules.teams ? c.team : humans.length + i, cpu: c.cpu, name: `CPU Lv${c.cpu}`, tapJump: false }));
    cfg = buildCfg(L.rules, [...humans, ...cpus]);
  }
  const slots = cfg.players.map((_, i) => (i < L.players.length ? L.players[i].userId : ''));
  const names = cfg.players.map((pl) => (pl.cpu ? (FIGHTERS[FIGHTER_INDEX[pl.fighter]]?.def.name ?? 'CPU') : pl.name));
  const palettes = cfg.players.map((pl) => pl.color);
  const tints = cfg.players.map((pl, i) => (L.activity === 'story' ? (i < L.players.length ? PLAYER_TINTS[i] : pl.team === 0 ? '#3ad27a' : '#9aa3b5') : L.rules.teams ? TEAM_TINTS[pl.team % TEAM_TINTS.length] : PLAYER_TINTS[i]));
  const msg: StartMsg = { t: 'start', cfg, slots, names, palettes, tints, delay: p.settings.delay, activity: L.activity, node: L.node };
  for (const pl of L.players) pl.ready = false;
  net.hostSend(msg);
  // everyone starts on the next beat; the host starts right away (the others are a few ms behind and time sync evens it out)
  startOnlineMatch(msg);
}

function startOnlineMatch(m: StartMsg): void {
  if (!net || inGame) return;
  inGame = true;
  lobbyOpen = false;
  renderLobby = null;
  const local = m.slots.indexOf(me());
  if (local < 0) {
    inGame = false;
    return;
  }
  const dev = myDevice ?? deviceOptions()[0];
  dev.tapJump = dev.kind === 'pad' ? session.profile.settings.tapJumpPad : session.profile.settings.tapJumpKb;
  m.cfg.players[local].tapJump = dev.tapJump;
  inMatch();
  const driver = new OnlineDriver(net, { cfg: m.cfg, slots: m.slots, me: me(), host: isHost(), delay: m.delay, names: m.names }, dev);
  const match = new Match(canvasEl, driver, { names: m.names, tints: m.tints, palettes: m.palettes, local: m.slots.map((u) => u === me()) }, {
    onEnd: (st: State) => {
      backToMenus();
      inGame = false;
      if (m.activity === 'story' && m.node && st.winner.length > 0) {
        const p = session.profile;
        if (!p.story.cleared.includes(m.node)) p.story.cleared.push(m.node);
        const nxt = nextNode(p.story.cleared);
        if (isHost() && lobby && nxt) lobby.node = nxt.id;
      }
      resultsScreen({
        st,
        names: m.names,
        palettes: m.palettes,
        tints: m.tints,
        ctx: { mode: 'online', local: [local] },
        actions: [{ label: 'Back to the lobby', cls: 'primary', fn: () => (lobby ? (broadcast(), lobbyScreen()) : homeScreen()) }],
      });
    },
  });
  match.start();
  audio.sfx('go');
}
