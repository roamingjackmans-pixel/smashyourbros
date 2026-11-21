// The app shell: sign-in (shared Shoallhell accounts), the main menu over the attract-mode match, and routing to
// every mode. Screens render into #ui; matches take over the canvas.
import { api, getToken } from './net/api';
import { Net } from './net/socket';
import { session, saveNow, signOut, startOffline, startOnline } from './game/session';
import { checkTasks } from './data/tasks';
import { GAME_VERSION } from './version';
import { audio } from './audio/audio';
import { KEYMAPS, lastInputKind } from './game/input';
import { lastActivePad, nintendoLabelsOn } from './game/pads';
import { catchUpAchievements, statsPanel, trophiesScreen } from './ui/achievementsUi';
import { clear, h, modal, toast, uiRoot } from './ui/dom';
import { startAttract, stopAttract } from './ui/attract';
import { setGlyphSource } from './ui/glyphs';
import { setMenuButtons } from './ui/menuPad';
import { hintBar } from './ui/glyphs';

// button prompts and the menu buttons read the signed-in profile's settings (D23)
setGlyphSource({
  prompts: () => session.profile.settings.prompts,
  device: () => lastInputKind(),
  padKind: () => lastActivePad()?.kind ?? 'xbox',
  layout: () => session.profile.settings.pads[0],
  menuPad: () => session.profile.settings.menuPad,
  keys: () => KEYMAPS[0].keys,
  nintendoLabels: () => nintendoLabelsOn(),
});
setMenuButtons(() => session.profile.settings.menuPad);

export let canvasEl: HTMLCanvasElement;
let cleanup: (() => void) | null = null;

/** show a screen: clears the previous one */
export function show(render: (root: HTMLElement) => (() => void) | void): void {
  cleanup?.();
  cleanup = null;
  const root = uiRoot();
  clear(root);
  const c = render(root);
  if (c) cleanup = c;
}

export function inMatch(): void {
  cleanup?.();
  cleanup = null;
  clear(uiRoot());
  stopAttract();
}

export function backToMenus(): void {
  startAttract(canvasEl);
}

export async function boot(canvas: HTMLCanvasElement): Promise<void> {
  canvasEl = canvas;
  startAttract(canvas);
  const params = new URLSearchParams(location.search);
  if (getToken()) {
    show((root) => {
      root.appendChild(h('div.screen.clear', h('div.logo', { style: { marginTop: '22vh' } }, 'SMASH ', h('span', 'YOUR'), ' BROS'), h('div.tagline', 'Signing you in…')));
    });
    try {
      const me = await api.me();
      startOnline(me.user, me.profile, me.rev);
      afterSignIn(params.get('join'));
      return;
    } catch {
      /* token expired: show the sign-in */
    }
  }
  authScreen(params.get('join'));
}

function afterSignIn(join: string | null): void {
  checkTasks(session.profile);
  catchUpAchievements(session.profile);
  if (session.online) void connectFriends();
  if (join) {
    void import('./ui/onlineUi').then((m) => m.onlineScreen(join));
    history.replaceState(null, '', location.pathname);
    return;
  }
  if (!session.profile.seenIntro) {
    session.profile.seenIntro = true;
    void saveNow();
    show(() => {});
    void import('./ui/storyUi').then((m) => m.introCard(() => mainMenu()));
    return;
  }
  mainMenu();
}

async function connectFriends(): Promise<void> {
  try {
    const net = await Net.shared();
    net.on('invite', (m: { fromName: string; code: string; game?: string; gameName?: string }) => {
      if (m.game && m.game !== 'syb') {
        toast(`${m.fromName} invited you to their ${m.gameName ?? 'Shoallhell'} lobby (${m.code}).`, 'gold', 6000);
        return;
      }
      const close = modal(
        h(
          'div.col',
          { style: { width: 'min(420px, 88vw)' } },
          h('h2', '🥊 Bro invite!'),
          h('div', h('b', m.fromName), ` wants you in their lobby (${m.code}). They said you looked great. (They didn’t, but they meant it.)`),
          h('div.row', h('button.primary', { onclick: () => (close(), void import('./ui/onlineUi').then((x) => x.onlineScreen(m.code))) }, 'Join'), h('button', { 'data-back': true, onclick: () => close() }, 'Not now')),
        ),
      );
      audio.sfx('select');
    });
  } catch {
    /* offline for now */
  }
}

// ------------------------------------------------------------------ sign-in

function authScreen(join: string | null): void {
  show((root) => {
    let mode: 'login' | 'signup' = 'login';
    const err = h('div.err');
    const email = h('input', { type: 'email', placeholder: 'Email', autocomplete: 'email' }) as HTMLInputElement;
    const pass = h('input', { type: 'password', placeholder: 'Password', autocomplete: 'current-password' }) as HTMLInputElement;
    const pass2 = h('input', { type: 'password', placeholder: 'Password again', autocomplete: 'new-password' }) as HTMLInputElement;
    const name = h('input', { type: 'text', placeholder: 'Bro name (optional)', maxlength: '24' }) as HTMLInputElement;
    const extra = h('div.col');
    const go = h('button.primary.big', { type: 'submit' }, 'Sign in') as HTMLButtonElement;
    const tabs = h('div.seg');
    const form = h('form.col', email, pass, extra, err, go);
    const setMode = (m: 'login' | 'signup'): void => {
      mode = m;
      tabs.replaceChildren(
        h(`button${m === 'login' ? '.on' : ''}`, { type: 'button', onclick: () => setMode('login') }, 'Sign in'),
        h(`button${m === 'signup' ? '.on' : ''}`, { type: 'button', onclick: () => setMode('signup') }, 'Create account'),
      );
      extra.replaceChildren(...(m === 'signup' ? [pass2, name] : []));
      pass.placeholder = m === 'signup' ? 'Password (8+ characters)' : 'Password';
      go.textContent = m === 'login' ? 'Sign in' : 'Create account';
      err.textContent = '';
    };
    setMode('login');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      audio.unlock();
      err.textContent = '';
      if (mode === 'signup' && pass.value !== pass2.value) {
        err.textContent = 'Those passwords don’t match, bro.';
        return;
      }
      go.disabled = true;
      try {
        const r = mode === 'login' ? await api.login(email.value, pass.value) : await api.signup(email.value, pass.value, name.value);
        startOnline(r.user, null, 0, r.token);
        const me = await api.me();
        startOnline(me.user, me.profile, me.rev);
        afterSignIn(join);
      } catch (x) {
        err.textContent = x instanceof Error ? x.message : 'Something went wrong.';
      } finally {
        go.disabled = false;
      }
    });
    root.appendChild(
      h(
        'div.screen',
        h('div.logo', { style: { marginTop: '4vh' } }, 'SMASH ', h('span', 'YOUR'), ' BROS'),
        h('div.tagline', 'The galaxy’s #1 show about hitting the bros you love.'),
        h(
          'div.panel.col',
          { style: { width: 'min(420px, 92vw)', marginTop: '22px' } },
          tabs,
          form,
          h('div.small.dim.center', 'Same account as Shoallhell: one email and password for both games, with the same friends list.'),
          h('button', { onclick: () => (audio.unlock(), startOffline(), afterSignIn(null)) }, 'Play offline on this device'),
          h('div.tiny.dim.center', `Offline saves stay in this browser. Online play needs an account. · v${GAME_VERSION}`),
        ),
      ),
    );
    setTimeout(() => email.focus(), 60);
  });
}

// ------------------------------------------------------------------ main menu

export function mainMenu(): void {
  backToMenus();
  show((root) => {
    const p = session.profile;
    const tiles: [string, string, string, string, string, () => void][] = [
      ['t-smash big', '💥', 'SMASH', 'Up to 4 bros on this device, any mix of CPUs. Rules, modifiers, items, the works.', 'smash', () => void import('./ui/versus').then((m) => m.versusScreen())],
      ['t-online', '🌐', 'ONLINE', session.online ? 'Lobby with friends. Invite, join, brawl (rollback netcode).' : 'Sign in to play online with friends.', 'online', () => void import('./ui/onlineUi').then((m) => m.onlineScreen())],
      ['t-story', '📺', 'STORY', 'Prime-Time Brawl. Free your bros from the galaxy’s worst game show. Co-op ready.', 'story', () => void import('./ui/storyUi').then((m) => m.storyScreen())],
      ['t-classic', '🏆', 'CLASSIC', 'Eight rounds and the host. Pick a fighter and an intensity.', 'classic', () => void import('./ui/classicUi').then((m) => m.classicScreen())],
      ['t-roster', '🃏', 'CONTESTANTS', `${p.unlocked.length} / 16 bros. Bro cards, move lists and unlock tasks.${p.challengers.length ? ` ${p.challengers.length} challenger${p.challengers.length > 1 ? 's' : ''} waiting!` : ''}`, 'roster', () => void import('./ui/roster').then((m) => m.rosterScreen())],
      ['t-practice', '🎯', 'PRACTICE', 'A training dummy, hitboxes on, no pressure.', 'practice', () => void import('./ui/versus').then((m) => m.practiceScreen())],
      ['t-trophies', '🏅', 'TROPHIES', 'Stats, achievements and unlock tasks. See how much you love your bros, in numbers.', 'trophies', () => trophiesScreen()],
      ['t-settings', '⚙️', 'SETTINGS', 'Controllers, remapping, graphics, sound, account.', 'settings', () => void import('./ui/settings').then((m) => m.settingsScreen())],
    ];
    const grid = h('div.menu-grid');
    const panel = statsPanel(() => (audio.sfx('select'), trophiesScreen('stats')));
    const els: HTMLElement[] = [];
    for (const [cls, ico, title, blurb, , fn] of tiles) {
      const el = h(`div.tile.${cls.split(' ').join('.')}`, { tabindex: '0', role: 'button' }, h('div.ico', ico), h('h3', title), h('p', blurb));
      el.addEventListener('click', () => {
        audio.unlock();
        audio.sfx('select');
        fn();
      });
      el.addEventListener('mouseenter', () => audio.sfx('menu'));
      grid.appendChild(el);
      els.push(el);
    }
    const userbar = h(
      'div.userbar',
      h('span.chip', session.online ? `👤 ${session.user?.name}` : '👤 Offline'),
      session.online ? h('button.tiny', { onclick: () => void import('./ui/onlineUi').then((m) => m.friendsModal()) }, '👥 Friends') : '',
      h('button.tiny', { title: 'Fullscreen', onclick: () => (document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen?.()) }, '⛶'),
      h('button.tiny', { onclick: () => void import('./ui/settings').then((m) => m.settingsScreen()) }, '⚙'),
    );
    root.appendChild(
      h(
        'div.screen',
        { style: { background: 'linear-gradient(180deg, rgba(18,6,28,0.25), rgba(18,6,28,0.82) 55%)' } },
        userbar,
        h('div.logo', { style: { marginTop: '2vh', fontSize: 'clamp(40px, 7vw, 92px)' } }, 'SMASH ', h('span', 'YOUR'), ' BROS'),
        h('div.tagline', 'LIVE! from the Studio Starship'),
        h('div.home', grid, panel),
        h('div', { style: { marginTop: '12px' } }, hintBar([['move', 'Move'], ['menuConfirm', 'Select'], ['menuBack', 'Back']], 18)),
        h('div.tiny.dim', { style: { marginTop: '8px' } }, `v${GAME_VERSION} · ${session.online ? 'Saved to your account' : 'Offline save'}`),
      ),
    );
    // the tiles are focusable: the pad / arrow keys move the shared menu focus (ui/menuPad.ts)
    els[0]?.setAttribute('data-autofocus', '');
    if (lastInputKind() === 'pad' || document.body.classList.contains('pad-nav')) setTimeout(() => els[0]?.focus(), 0);
    return () => (panel as HTMLElement & { stop?: () => void }).stop?.();
  });
}

export async function doSignOut(): Promise<void> {
  await saveNow();
  await signOut();
  authScreen(null);
}
