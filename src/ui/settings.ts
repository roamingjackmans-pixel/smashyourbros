// Settings: controls (rebinding), tap-jump, sound, online input delay, account.
import { doSignOut, mainMenu, show } from '../app';
import { session, save, saveNow } from '../game/session';
import { KEYMAPS, setCustomKeys, type Action } from '../game/input';
import { api } from '../net/api';
import { audio } from '../audio/audio';
import { h, toast } from './dom';
import { controlsHelp } from './versus';

const ACTIONS: [Action, string][] = [
  ['left', 'Left'],
  ['right', 'Right'],
  ['up', 'Up'],
  ['down', 'Down'],
  ['jump', 'Jump'],
  ['attack', 'Attack (A)'],
  ['special', 'Special (B)'],
  ['shield', 'Shield'],
  ['grab', 'Grab'],
  ['ult', 'Ultimate'],
  ['taunt', 'Taunt'],
  ['walk', 'Walk / tilt'],
  ['cUp', 'Smash ↑'],
  ['cDown', 'Smash ↓'],
  ['cLeft', 'Smash ←'],
  ['cRight', 'Smash →'],
];

function keyName(code: string): string {
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Arrow/, '↑').replace('↑Up', '↑').replace('↑Down', '↓').replace('↑Left', '←').replace('↑Right', '→');
}

export function settingsScreen(): void {
  show((root) => {
    const p = session.profile;
    const s = p.settings;
    const body = h('div.col', { style: { width: '100%', maxWidth: '1000px' } });
    const toggle = (label: string, get: () => boolean, set: (v: boolean) => void): HTMLElement =>
      h('div.row', h('span.grow', label), h(`button.tiny${get() ? '.on' : ''}`, { onclick: () => (set(!get()), save(), render()) }, get() ? 'On' : 'Off'));
    const slider = (label: string, get: () => number, set: (v: number) => void): HTMLElement => {
      const inp = h('input', { type: 'range', min: '0', max: '100', value: String(Math.round(get() * 100)) }) as HTMLInputElement;
      inp.addEventListener('input', () => set(Number(inp.value) / 100));
      return h('div.row', h('span', { style: { width: '120px' } }, label), inp);
    };
    let listening: { map: number; action: Action } | null = null;
    const onKey = (e: KeyboardEvent): void => {
      if (!listening) return;
      e.preventDefault();
      const { map, action } = listening;
      listening = null;
      const keys = { ...(s.keys[map] ?? {}) } as Record<string, string[]>;
      keys[action] = [e.code];
      s.keys[map] = keys;
      setCustomKeys(map, { [action]: [e.code] });
      save();
      audio.sfx('select');
      render();
    };
    window.addEventListener('keydown', onKey);
    const render = (): void => {
      body.replaceChildren(
        h(
          'div.panel.col',
          h('h3', 'Controls'),
          toggle('Tap jump on keyboards (push up to jump)', () => s.tapJumpKb, (v) => (s.tapJumpKb = v)),
          toggle('Tap jump on gamepads', () => s.tapJumpPad, (v) => (s.tapJumpPad = v)),
          KEYMAPS.map((m, mi) =>
            h(
              'div.card.col',
              h('b', m.name),
              h(
                'div.row.wrap',
                ACTIONS.filter(([a]) => mi === 0 || !a.startsWith('c')).map(([a, label]) =>
                  h('button.tiny' + (listening?.map === mi && listening.action === a ? '.on' : ''), { onclick: () => ((listening = { map: mi, action: a }), render()) }, `${label}: ${listening?.map === mi && listening.action === a ? 'press a key…' : (m.keys[a] ?? []).map(keyName).join('/') || '—'}`),
                ),
              ),
            ),
          ),
          h('button.tiny', { onclick: () => ((s.keys = []), save(), location.reload()) }, 'Reset keys to defaults'),
          h('details', h('summary', { style: { cursor: 'pointer', fontWeight: '900' } }, 'How to play'), controlsHelp()),
        ),
        h(
          'div.panel.col',
          h('h3', 'Sound'),
          slider('Master', () => audio.vol.master, (v) => audio.setVol({ master: v })),
          slider('Effects', () => audio.vol.sfx, (v) => audio.setVol({ sfx: v })),
          slider('Music', () => audio.vol.music, (v) => audio.setVol({ music: v })),
          toggle('Announcer voice', () => audio.vol.voice, (v) => audio.setVol({ voice: v })),
        ),
        h(
          'div.panel.col',
          h('h3', 'Online'),
          h('div.row', h('span.grow', 'Input delay (frames): lower feels snappier, higher rolls back less'), h('div.seg', [1, 2, 3, 4].map((n) => h(`button.tiny${s.delay === n ? '.on' : ''}`, { onclick: () => ((s.delay = n), save(), render()) }, String(n))))),
        ),
        h(
          'div.panel.col',
          h('h3', 'Account'),
          session.online
            ? h(
                'div.col',
                h('div', `Signed in as `, h('b', session.user?.name ?? ''), ` (${session.user?.email}). Same account as Shoallhell.`),
                h(
                  'div.row',
                  h(
                    'button',
                    {
                      onclick: async () => {
                        const n = prompt('Your bro name', session.user?.name ?? '');
                        if (!n) return;
                        try {
                          const r = await api.rename(n);
                          session.user = r.user;
                          toast('Name changed. Lookin’ good.');
                          render();
                        } catch (e) {
                          toast((e as Error).message, 'bad');
                        }
                      },
                    },
                    'Change name',
                  ),
                  h(
                    'button',
                    {
                      onclick: async () => {
                        const o = prompt('Current password');
                        if (!o) return;
                        const n = prompt('New password (8+ characters)');
                        if (!n) return;
                        try {
                          await api.password(o, n);
                          toast('Password changed.');
                        } catch (e) {
                          toast((e as Error).message, 'bad');
                        }
                      },
                    },
                    'Change password',
                  ),
                  h('button.primary', { onclick: () => void doSignOut() }, 'Sign out'),
                ),
              )
            : h('div.col', h('div', 'Playing offline. Progress is saved in this browser.'), h('button.primary', { onclick: () => void saveNow().then(() => doSignOut()) }, 'Sign in / create account')),
        ),
      );
    };
    render();
    root.appendChild(h('div.screen', h('div.topbar', h('button', { onclick: () => mainMenu() }, '◀ Back'), h('h2', 'Settings')), body));
    return () => window.removeEventListener('keydown', onKey);
  });
}
