// Settings (D23): tabs for Controls (each player's controller layout, P1–P4), Controllers (button pictures, menu
// buttons, rumble, Nintendo labels, the Steam Controller), Keyboard, Graphics & sound, Online and Account. LB / RB
// step through the tabs on a pad. Controller layouts and the menu buttons save to the profile; graphics quality and
// the frame-time overlay belong to this device (localStorage).
import { doSignOut, mainMenu, show } from '../app';
import { applySettings, session, save, saveNow } from '../game/session';
import { defaultKeymap, KEYMAPS, setCustomKeys, type Action } from '../game/input';
import { CSTICK_MODES, defaultMenuPad, defaultPadLayout, menuPadAllowed, PAD_ACTIONS, PORTS, rebindPad, unboundPadActions, type PadAction } from '../game/padLayout';
import { BINDABLE_BUTTONS, lastActivePad, padEdge, padList, padNumber, pollPads, rumble, swallowButton } from '../game/pads';
import { connectSteamController, steamControllerConnected, steamControllerSupported } from '../game/steamController';
import { PROMPT_STYLES, type PromptStyle } from '../game/profile';
import { gfxMode, setGfxMode, type GfxMode } from '../render/quality';
import { fpsWanted, setFpsOverlay } from '../game/perf';
import { api } from '../net/api';
import { audio } from '../audio/audio';
import { h, toast } from './dom';
import { controlsHelp } from './versus';
import { hintBar, inputGlyphEl, keyLabel, padStyle, padText, refreshGlyphs } from './glyphs';
import { setMenuCapture } from './menuPad';

const KEY_ACTIONS: [Action, string][] = [
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

type Tab = 'pads' | 'controllers' | 'keyboard' | 'video' | 'online' | 'account';
const TABS: [Tab, string][] = [
  ['pads', '🎮 Controls'],
  ['controllers', '⚙ Controllers'],
  ['keyboard', '⌨ Keyboard'],
  ['video', '📺 Graphics & sound'],
  ['online', '🌐 Online'],
  ['account', '👤 Account'],
];

const PROMPT_NAMES: Record<PromptStyle, string> = { auto: 'Auto', keyboard: 'Keyboard', xbox: 'Xbox', playstation: 'PlayStation', switch: 'Switch', generic: 'Generic' };

type Capture = { kind: 'pad'; port: number; action: PadAction; slot: number } | { kind: 'menu'; which: 'confirm' | 'back' } | { kind: 'key'; map: number; action: Action };

let lastTab: Tab = 'pads';
let lastPort = 0;

export function settingsScreen(tab: Tab = lastTab): void {
  show((root) => {
    const p = session.profile;
    const s = p.settings;
    let cur: Tab = tab;
    let port = lastPort;
    let capture: Capture | null = null;
    let captureEnds = 0;
    const body = h('div.col', { style: { width: '100%', maxWidth: '1000px' } });
    const tabsEl = h('div.tabs');
    const changed = (): void => {
      applySettings();
      save();
      refreshGlyphs(undefined, true);
    };
    const toggle = (label: string, get: () => boolean, set: (v: boolean) => void): HTMLElement =>
      h('div.row', h('span.grow', label), h(`button.tiny${get() ? '.on' : ''}`, { onclick: () => (set(!get()), changed(), render()) }, get() ? 'On' : 'Off'));
    const seg = <T,>(label: string, opts: [T, string][], get: () => T, set: (v: T) => void): HTMLElement =>
      h('div.row.wrap', h('span', { style: { minWidth: '150px', fontWeight: '900' } }, label), h('div.seg', opts.map(([v, n]) => h(`button.tiny${get() === v ? '.on' : ''}`, { onclick: () => (set(v), changed(), audio.sfx('menu'), render()) }, n))));
    const slider = (label: string, min: number, max: number, get: () => number, set: (v: number) => void, fmt: (v: number) => string = (v) => `${Math.round(v * 100)}%`): HTMLElement => {
      const val = h('span.small', { style: { minWidth: '44px' } }, fmt(get()));
      const inp = h('input', { type: 'range', min: String(min * 100), max: String(max * 100), value: String(Math.round(get() * 100)) }) as HTMLInputElement;
      inp.addEventListener('input', () => {
        set(Number(inp.value) / 100);
        val.textContent = fmt(get());
      });
      inp.addEventListener('change', () => changed());
      return h('div.row', h('span', { style: { minWidth: '150px', fontWeight: '900' } }, label), inp, val);
    };

    // ------------------------------------------------------------------ capture (pads and keys)
    const startCapture = (c: Capture): void => {
      capture = c;
      captureEnds = performance.now() + 7000;
      setMenuCapture(true);
      audio.sfx('select');
      render();
    };
    const endCapture = (): void => {
      capture = null;
      setMenuCapture(false);
      render();
    };
    const capturePad = (button: number): void => {
      const c = capture;
      if (!c || c.kind === 'key') return;
      if (c.kind === 'menu') {
        if (!menuPadAllowed(button)) {
          toast('That one moves the menus or opens them. Pick a face button, a bumper or a trigger.', 'bad');
          return;
        }
        const mp = s.menuPad;
        const other = c.which === 'confirm' ? 'back' : 'confirm';
        if (mp[other] === button) mp[other] = mp[c.which];
        mp[c.which] = button;
      } else {
        const L = s.pads[c.port];
        const r = rebindPad(L, c.action, button, c.slot);
        const name = (a: PadAction): string => PAD_ACTIONS.find(([x]) => x === a)?.[1] ?? a;
        if (r.swapped) toast(`Swapped: ${name(r.swapped.action)} is now on ${padText(r.swapped.button, padStyle())}.`, 'gold');
        else if (r.displaced.length) toast(`${padText(button, padStyle())} moved from ${r.displaced.map(name).join(', ')}.`, 'gold');
      }
      changed();
      endCapture();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (!capture) return;
      e.preventDefault();
      if (capture.kind !== 'key') {
        if (e.code === 'Escape') endCapture();
        return;
      }
      const { map, action } = capture;
      const keys = { ...(s.keys[map] ?? {}) } as Record<string, string[]>;
      keys[action] = [e.code];
      s.keys[map] = keys;
      setCustomKeys(map, { [action]: [e.code] });
      changed();
      endCapture();
    };
    window.addEventListener('keydown', onKey);

    // ------------------------------------------------------------------ live: capture polling, the stick test
    let raf = 0;
    const live = { l: null as HTMLElement | null, r: null as HTMLElement | null, pressed: null as HTMLElement | null, dz: null as HTMLElement | null, note: null as HTMLElement | null };
    const tick = (): void => {
      raf = requestAnimationFrame(tick);
      pollPads();
      if (capture && capture.kind !== 'key') {
        for (const pad of padList()) {
          for (let i = 0; i < BINDABLE_BUTTONS; i++) {
            if (!padEdge(pad, i)) continue;
            swallowButton(pad, i);
            capturePad(i);
            return;
          }
        }
        if (performance.now() > captureEnds) endCapture();
      }
      const pad = lastActivePad();
      if (live.l && live.r && live.pressed) {
        const put = (el: HTMLElement, x: number, y: number): void => {
          const dot = el.querySelector('i') as HTMLElement;
          dot.style.left = `${50 + x * 50}%`;
          dot.style.top = `${50 + y * 50}%`;
        };
        put(live.l, pad?.axes[0] ?? 0, pad?.axes[1] ?? 0);
        put(live.r, pad?.axes[2] ?? 0, pad?.axes[3] ?? 0);
        const down = pad ? pad.down.map((d, i) => (d ? i : -1)).filter((i) => i >= 0) : [];
        const txt = pad ? `${pad.model} ${padNumber(pad.index)}: ${down.length ? down.map((i) => padText(i, pad.kind)).join(' + ') : 'press something'}` : 'Press a button on a controller to test it.';
        if (live.pressed.textContent !== txt) live.pressed.textContent = txt;
      }
      if (live.dz) {
        const d = `${s.pads[port].deadzone * 100}%`;
        live.dz.style.width = live.dz.style.height = d;
        live.dz.style.marginLeft = live.dz.style.marginTop = `-${s.pads[port].deadzone * 50}%`;
      }
    };
    raf = requestAnimationFrame(tick);

    // ------------------------------------------------------------------ tabs
    const padsTab = (): HTMLElement => {
      const L = s.pads[port];
      const st = padStyle();
      const portTabs = h('div.seg', Array.from({ length: PORTS }, (_, i) => h(`button${i === port ? '.on' : ''}`, { onclick: () => ((port = lastPort = i), render()) }, `P${i + 1}`)));
      const rows: HTMLElement[] = [h('div.bind-head', 'Action'), h('div.bind-head', 'Button'), h('div.bind-head', 'Second button')];
      for (const [a, label] of PAD_ACTIONS) {
        rows.push(h('div.bind-name', label));
        for (let slot = 0; slot < 2; slot++) {
          const b = L.buttons[a][slot];
          const waiting = capture?.kind === 'pad' && capture.port === port && capture.action === a && capture.slot === slot;
          const btn = h(
            `button.bind-slot${waiting ? '.capturing' : ''}`,
            { onclick: () => startCapture({ kind: 'pad', port, action: a, slot: Math.min(slot, L.buttons[a].length) }) },
            waiting ? 'Press a button…' : b === undefined ? h('span.dim', slot ? '+ add' : '— none —') : [inputGlyphEl(b, 24, st), h('span', padText(b, st))],
          );
          // X / □ on a pad (or right-click) clears this slot
          const clearSlot = (): void => {
            if (b === undefined) return;
            L.buttons[a] = L.buttons[a].filter((_, i) => i !== slot);
            changed();
            render();
          };
          btn.addEventListener('pad-x', clearSlot);
          btn.addEventListener('contextmenu', (e) => (e.preventDefault(), clearSlot()));
          rows.push(btn);
        }
      }
      const unbound = unboundPadActions(L);
      const tl = (n: number): HTMLElement => {
        const el = h('div.test-stick', h('i'));
        if (n === 0) el.appendChild((live.dz = h('div.dz')));
        return el;
      };
      live.l = tl(0);
      live.r = tl(1);
      live.pressed = h('div.small', { style: { fontWeight: '900' } }, '');
      return h(
        'div.panel.col',
        h('div.row.wrap', h('h3.grow', `Player ${port + 1}'s controller`), portTabs),
        h('div.small.dim', `Whoever plays as P${port + 1} on the character picker uses this layout. Click a slot (or press A on it), then press the button you want. Right-click or ${padText(2, st)} clears a slot.`),
        capture?.kind === 'pad' ? h('div.capture-bar', `Press any button on any controller for ${PAD_ACTIONS.find(([x]) => x === (capture as { action: PadAction }).action)?.[1]}… (Esc or wait to cancel)`) : '',
        h('div.bind-grid', rows),
        unbound.length ? h('div.err', `Not bound: ${unbound.map((a) => PAD_ACTIONS.find(([x]) => x === a)?.[1]).join(', ')}`) : '',
        seg('Right stick', CSTICK_MODES.map(([m, n]) => [m, n] as [typeof m, string]), () => L.cstick, (v) => (L.cstick = v)),
        h('div.small.dim', 'Smash attacks: flick for smashes (aerials in the air). Tilt attacks: flick for tilts. Specials: flick for your B moves. Off: the right stick does nothing.'),
        toggle('Tap jump (push the stick up to jump)', () => L.tapJump, (v) => (L.tapJump = v)),
        slider('Stick deadzone', 0.05, 0.5, () => L.deadzone, (v) => (L.deadzone = v)),
        h('div.row.wrap', { style: { gap: '18px' } }, h('div.col', { style: { alignItems: 'center', gap: '4px' } }, live.l, h('span.tiny.dim', 'Left stick')), h('div.col', { style: { alignItems: 'center', gap: '4px' } }, live.r, h('span.tiny.dim', 'Right stick')), live.pressed),
        h(
          'div.row.wrap',
          h('button', { onclick: () => ((s.pads[port] = defaultPadLayout(L.tapJump)), changed(), toast(`P${port + 1}'s controller is back to the defaults.`), render()) }, `Reset P${port + 1} to defaults`),
          port === 0 ? h('button', { onclick: () => ((s.pads = s.pads.map((_, i) => (i === 0 ? s.pads[0] : structuredClone(s.pads[0])))), changed(), toast('Every player now has P1’s layout.'), render()) }, 'Copy P1’s layout to P2–P4') : '',
        ),
        h('details', h('summary', { style: { cursor: 'pointer', fontWeight: '900' } }, 'How to play'), controlsHelp()),
      );
    };

    const controllersTab = (): HTMLElement => {
      const st = padStyle();
      const list = padList();
      const menuSlot = (which: 'confirm' | 'back', label: string): HTMLElement => {
        const waiting = capture?.kind === 'menu' && capture.which === which;
        const b = s.menuPad[which];
        return h('div.row', h('span', { style: { minWidth: '150px', fontWeight: '900' } }, label), h(`button.bind-slot${waiting ? '.capturing' : ''}`, { onclick: () => startCapture({ kind: 'menu', which }) }, waiting ? 'Press a button…' : [inputGlyphEl(b, 24, st), h('span', padText(b, st))]));
      };
      return h(
        'div.panel.col',
        h('h3', 'Controllers'),
        h('div.pad-list', list.length ? list.map((pd) => h(`span.pad-chip${pd.activeAt > performance.now() - 3000 ? '.live' : ''}`, inputGlyphEl(0, 22, pd.kind), `${pd.model} ${padNumber(pd.index)}${pd.standard ? '' : ' (non-standard: remap its buttons)'}`)) : h('span.dim', 'No controller yet. Plug one in (or turn it on) and press a button.')),
        h('div.small.dim', 'Xbox, PlayStation, Switch Pro and Joy-Con, 8BitDo and other pads all work. Plug in more and press A or Start on the character picker to join.'),
        seg('Button pictures', PROMPT_STYLES.map((x) => [x, PROMPT_NAMES[x]] as [PromptStyle, string]), () => s.prompts, (v) => (s.prompts = v)),
        h('div.small.dim', 'Auto shows the pictures of whatever you used last.'),
        menuSlot('confirm', 'Menu: confirm'),
        menuSlot('back', 'Menu: back'),
        capture?.kind === 'menu' ? h('div.capture-bar', 'Press a face button, bumper or trigger for the menus… (Esc or wait to cancel)') : '',
        h('button.tiny', { style: { alignSelf: 'flex-start' }, onclick: () => ((s.menuPad = defaultMenuPad()), changed(), render()) }, 'Menu buttons back to A / B'),
        toggle('Nintendo controllers: A is A (the right button confirms, like on the console)', () => s.nintendoLabels, (v) => (s.nintendoLabels = v)),
        seg('Rumble', [[0, 'Off'], [0.5, 'Gentle'], [1, 'Full']] as [number, string][], () => s.rumble, (v) => (s.rumble = v)),
        h(
          'button.tiny',
          {
            style: { alignSelf: 'flex-start' },
            onclick: () => {
              const pd = lastActivePad() ?? list[0];
              if (!pd) return toast('Press a button on the controller first.', 'bad');
              applySettings();
              rumble(pd.index, 0.8, 0.6, 400);
            },
          },
          'Test rumble',
        ),
        h('h3', { style: { marginTop: '10px' } }, 'Steam Controller'),
        steamControllerSupported()
          ? h(
              'div.col',
              h('div.small.dim', 'Without Steam running, a Steam Controller pretends to be a mouse. Connect it here once (Chrome or Edge) and it plays like any pad. Running the game through Steam? It already works.'),
              h('div.row', h('button', { onclick: () => void connectSteamController().then((n) => (toast(n ? 'Steam Controller connected. Lookin’ sharp.' : 'No Steam Controller picked.', n ? 'ok' : 'bad'), render())) }, 'Connect a Steam Controller'), h('span.small', steamControllerConnected() ? '✔ connected' : '')),
            )
          : h('div.small.dim', 'This browser can’t talk to a Steam Controller directly: use Chrome or Edge, or start the browser from Steam.'),
      );
    };

    const keyboardTab = (): HTMLElement =>
      h(
        'div.panel.col',
        h('h3', 'Keyboard'),
        toggle('Tap jump on keyboards (push up to jump)', () => s.tapJumpKb, (v) => (s.tapJumpKb = v)),
        capture?.kind === 'key' ? h('div.capture-bar', 'Press a key… (Esc binds Escape)') : '',
        KEYMAPS.map((m, mi) =>
          h(
            'div.card.col',
            h('b', m.name),
            h(
              'div.row.wrap',
              KEY_ACTIONS.filter(([a]) => mi === 0 || !a.startsWith('c')).map(([a, label]) => {
                const waiting = capture?.kind === 'key' && capture.map === mi && capture.action === a;
                return h(`button.tiny${waiting ? '.on' : ''}`, { onclick: () => startCapture({ kind: 'key', map: mi, action: a }) }, `${label}: ${waiting ? 'press a key…' : (m.keys[a] ?? []).map(keyLabel).join('/') || '—'}`);
              }),
            ),
          ),
        ),
        h(
          'button.tiny',
          {
            style: { alignSelf: 'flex-start' },
            onclick: () => {
              s.keys = [];
              KEYMAPS.forEach((_, i) => (KEYMAPS[i] = { ...defaultKeymap(i), keys: { ...defaultKeymap(i).keys } }));
              changed();
              render();
            },
          },
          'Reset keys to defaults',
        ),
      );

    const videoTab = (): HTMLElement =>
      h(
        'div.col',
        h(
          'div.panel.col',
          h('h3', 'Graphics'),
          seg('Quality', [['auto', 'Auto'], ['high', 'Sharp'], ['low', 'Fast']] as [GfxMode, string][], () => gfxMode(), (v) => setGfxMode(v)),
          h('div.small.dim', 'Auto draws sharp and lowers the resolution a step if frames start coming late, to keep 60 fps. Sharp always draws at full resolution. Fast draws at 720p-ish for older laptops. (Saved on this device.)'),
          toggle('Show frame times (FPS overlay)', () => fpsWanted(), (v) => setFpsOverlay(v)),
        ),
        h(
          'div.panel.col',
          h('h3', 'Sound'),
          slider('Master', 0, 1, () => audio.vol.master, (v) => audio.setVol({ master: v })),
          slider('Effects', 0, 1, () => audio.vol.sfx, (v) => audio.setVol({ sfx: v })),
          slider('Music', 0, 1, () => audio.vol.music, (v) => audio.setVol({ music: v })),
          toggle('Announcer voice', () => audio.vol.voice, (v) => audio.setVol({ voice: v })),
        ),
      );

    const onlineTab = (): HTMLElement =>
      h('div.panel.col', h('h3', 'Online'), seg('Input delay (frames)', [1, 2, 3, 4].map((n) => [n, String(n)] as [number, string]), () => s.delay, (v) => (s.delay = v)), h('div.small.dim', 'Lower feels snappier; higher rolls back less on a long-distance connection.'));

    const accountTab = (): HTMLElement =>
      h(
        'div.panel.col',
        h('h3', 'Account'),
        session.online
          ? h(
              'div.col',
              h('div', `Signed in as `, h('b', session.user?.name ?? ''), ` (${session.user?.email}). Same account as Shoallhell.`),
              h(
                'div.row.wrap',
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
              h('div.tiny.dim', 'Changing your name or password needs a keyboard.'),
            )
          : h('div.col', h('div', 'Playing offline. Progress is saved in this browser.'), h('button.primary', { onclick: () => void saveNow().then(() => doSignOut()) }, 'Sign in / create account')),
      );

    const render = (): void => {
      tabsEl.replaceChildren(h('span.tab-hint', inputGlyphEl(4, 20)), ...TABS.map(([id, label]) => h(`button.tiny${id === cur ? '.on' : ''}`, { 'data-tab': id, onclick: () => ((cur = lastTab = id), (live.l = live.r = live.pressed = live.dz = null), render()) }, label)), h('span.tab-hint', inputGlyphEl(5, 20)));
      live.l = live.r = live.pressed = live.dz = null;
      body.replaceChildren(cur === 'pads' ? padsTab() : cur === 'controllers' ? controllersTab() : cur === 'keyboard' ? keyboardTab() : cur === 'video' ? videoTab() : cur === 'online' ? onlineTab() : accountTab());
    };
    render();
    root.appendChild(
      h(
        'div.screen',
        h('div.topbar', h('button', { 'data-back': true, onclick: () => mainMenu() }, '◀ Back'), h('h2', 'Settings')),
        h('div', { style: { width: '100%', maxWidth: '1000px', marginBottom: '10px' } }, tabsEl),
        body,
        h('div', { style: { marginTop: '12px' } }, hintBar([['menuLB', 'Previous tab'], ['menuRB', 'Next tab'], ['menuConfirm', 'Choose'], ['menuBack', 'Back']], 18)),
      ),
    );
    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      setMenuCapture(false);
    };
  });
}
