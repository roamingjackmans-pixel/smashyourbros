// Menus by controller and keyboard (D23, after DungeonJoe's ui/menuPad.ts). Any pad drives the top-most menu: the
// D-pad / left stick moves the focus (always shown with a ring), confirm clicks, back presses the screen's Back
// button (or Escape), Start presses its main action ([data-pad-start]), View its secondary one ([data-pad-view]),
// LB / RB step through tabs, X / Y send 'pad-x' / 'pad-y' events to the focused control. Arrow keys, Enter and
// Escape do the same from a keyboard. A screen can take pad presses first (setPadHandler: the character picker gives
// every player their own cursor).
import { getPad, padEdge, padList, swallowButton, type PadState } from '../game/pads';
import { defaultMenuPad, type MenuPad } from '../game/padLayout';
import { audio } from '../audio/audio';

export type PadEvent = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'start' | 'view' | 'x' | 'y' | 'lb' | 'rb' | 'lt' | 'rt';
/** a screen's own pad handling: return true when it used the press */
export type PadHandler = (ev: PadEvent, pad: PadState) => boolean;

let menuButtons: () => MenuPad = defaultMenuPad;
let handler: PadHandler | null = null;
const repeat = new Map<number, { dir: PadEvent | null; at: number }>();

/** where the menu confirm / back buttons come from (the profile; set at boot) */
export function setMenuButtons(get: () => MenuPad): void {
  menuButtons = get;
}

/** a screen takes pad presses first until the returned function is called */
export function setPadHandler(h: PadHandler): () => void {
  handler = h;
  return () => {
    if (handler === h) handler = null;
  };
}

/** the confirm button now (A unless remapped) */
export function menuConfirmButton(): number {
  return menuButtons().confirm;
}

const FOCUSABLE = 'button:not(:disabled), input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea, summary, a[href], [tabindex="0"]';

function visible(e: HTMLElement): boolean {
  return e.offsetParent !== null || getComputedStyle(e).position === 'fixed';
}

/** the top-most menu layer: a modal, the challenger splash, else the screen in #ui */
export function menuScope(): HTMLElement | null {
  const modals = document.querySelectorAll<HTMLElement>('.modal-back');
  if (modals.length) return modals[modals.length - 1];
  const ch = document.querySelector<HTMLElement>('.challenger');
  if (ch) return ch;
  const ui = document.getElementById('ui');
  if (!ui) return null;
  for (let i = ui.children.length - 1; i >= 0; i--) {
    const el = ui.children[i] as HTMLElement;
    if (el.isConnected && el.childElementCount) return el;
  }
  return null;
}

export function focusables(scope: HTMLElement): HTMLElement[] {
  return [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((e) => visible(e) && !e.closest('[data-pad-skip]'));
}

/** Focus where a menu starts: its [data-autofocus] control, else the first one. */
export function focusStart(scope: HTMLElement): void {
  const auto = scope.querySelector<HTMLElement>('[data-autofocus]');
  const items = focusables(scope);
  const first = auto && items.includes(auto) ? auto : items[0];
  first?.focus({ preventScroll: false });
}

/** Spatial focus movement: the nearest control that way, wrapping round the menu's ends. */
export function moveFocus(scope: HTMLElement, dx: number, dy: number): void {
  const items = focusables(scope);
  if (!items.length) return;
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || !items.includes(cur)) {
    focusStart(scope);
    return;
  }
  const r0 = cur.getBoundingClientRect();
  const cx = r0.left + r0.width / 2;
  const cy = r0.top + r0.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  const rects = items.map((e) => ({ e, r: e.getBoundingClientRect() }));
  for (const { e, r } of rects) {
    if (e === cur) continue;
    const ex = r.left + r.width / 2;
    const ey = r.top + r.height / 2;
    // overlap along the cross axis counts as "straight that way"
    const along = dx ? (ex - cx) * dx : (ey - cy) * dy;
    if (along <= 2) continue;
    const overlap = dx ? Math.min(r.bottom, r0.bottom) - Math.max(r.top, r0.top) : Math.min(r.right, r0.right) - Math.max(r.left, r0.left);
    const across = overlap > 0 ? 0 : dx ? Math.abs(ey - cy) : Math.abs(ex - cx);
    const score = along + across * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = e;
    }
  }
  if (!best) {
    // wrap: the far end of the same row (left / right) or of the whole menu (up / down)
    if (dx) {
      const row = rects.filter(({ e, r }) => e !== cur && Math.abs(r.top + r.height / 2 - cy) < Math.max(12, r0.height * 0.6));
      if (row.length) best = row.reduce((a, b) => (-dx * (b.r.left + b.r.width / 2) > -dx * (a.r.left + a.r.width / 2) ? b : a)).e;
    } else {
      const far = Math.max(...rects.map(({ r }) => -dy * (r.top + r.height / 2)));
      const row = rects.filter(({ e, r }) => e !== cur && -dy * (r.top + r.height / 2) >= far - 12);
      if (row.length) best = row.reduce((a, b) => (Math.abs(b.r.left + b.r.width / 2 - cx) < Math.abs(a.r.left + a.r.width / 2 - cx) ? b : a)).e;
    }
  }
  if (best && best !== cur) {
    best.focus({ preventScroll: true });
    best.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    audio.sfx('menu');
  }
}

/** press the screen's Back button, else send Escape to the focused control */
export function goBack(scope: HTMLElement): void {
  const backs = [...scope.querySelectorAll<HTMLElement>('[data-back]')].filter((e) => visible(e) && !(e as HTMLButtonElement).disabled);
  if (backs.length) {
    audio.sfx('back');
    backs[backs.length - 1].click();
    return;
  }
  const at: EventTarget = document.activeElement && scope.contains(document.activeElement) ? document.activeElement : scope;
  at.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true }));
  at.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true }));
}

function clickAttr(scope: HTMLElement, attr: string): boolean {
  const els = [...scope.querySelectorAll<HTMLElement>(`[${attr}]`)].filter((e) => visible(e) && !(e as HTMLButtonElement).disabled);
  const el = els[els.length - 1];
  if (!el) return false;
  el.click();
  return true;
}

function stepTabs(scope: HTMLElement, step: number): void {
  const tabs = [...scope.querySelectorAll<HTMLElement>('.tabs [data-tab]')].filter(visible);
  if (!tabs.length) return;
  const cur = tabs.findIndex((t) => t.classList.contains('on'));
  const next = tabs[(Math.max(0, cur) + step + tabs.length) % tabs.length];
  next.click();
  setTimeout(() => {
    const s = menuScope();
    const on = s?.querySelector<HTMLElement>('.tabs [data-tab].on');
    on?.focus();
  }, 0);
}

/** the default meaning of a pad press in a menu */
export function menuAction(ev: PadEvent, scope: HTMLElement, pad: number): void {
  const el = document.activeElement as HTMLElement | null;
  const inScope = !!el && el !== document.body && scope.contains(el);
  switch (ev) {
    case 'up':
    case 'down':
    case 'left':
    case 'right': {
      const dx = ev === 'left' ? -1 : ev === 'right' ? 1 : 0;
      const dy = ev === 'up' ? -1 : ev === 'down' ? 1 : 0;
      // a focused slider or dropdown takes left / right as its own value (DungeonJoe's D153)
      if (dx && inScope && el instanceof HTMLInputElement && el.type === 'range') {
        if (dx > 0) el.stepUp();
        else el.stepDown();
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      if (dx && inScope && el instanceof HTMLSelectElement) {
        const i = Math.max(0, Math.min(el.options.length - 1, el.selectedIndex + dx));
        if (i !== el.selectedIndex) {
          el.selectedIndex = i;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
      moveFocus(scope, dx, dy);
      return;
    }
    case 'confirm':
      if (inScope) el.click();
      else if (!clickAttr(scope, 'data-pad-confirm')) focusStart(scope);
      return;
    case 'back':
      goBack(scope);
      return;
    case 'start':
      if (!clickAttr(scope, 'data-pad-start')) {
        if (inScope) el.click();
        else focusStart(scope);
      }
      return;
    case 'view':
      clickAttr(scope, 'data-pad-view');
      return;
    case 'lb':
    case 'rb':
      stepTabs(scope, ev === 'lb' ? -1 : 1);
      return;
    case 'lt':
    case 'rt':
      return;
    case 'x':
    case 'y':
      if (inScope) el.dispatchEvent(new CustomEvent(ev === 'x' ? 'pad-x' : 'pad-y', { bubbles: true, detail: pad }));
      return;
  }
}

/** the rebinding screen is waiting for a button: menus leave the pads alone */
let captureActive = false;
export function setMenuCapture(on: boolean): void {
  captureActive = on;
}

const DIRS: [PadEvent, number][] = [
  ['up', 12],
  ['down', 13],
  ['left', 14],
  ['right', 15],
];

function heldDir(p: PadState): PadEvent | null {
  const [x, y] = p.axes;
  for (const [ev, b] of DIRS) if (p.down[b]) return ev;
  if (Math.abs(x) > 0.6 && Math.abs(x) >= Math.abs(y)) return x < 0 ? 'left' : 'right';
  if (Math.abs(y) > 0.6) return y < 0 ? 'up' : 'down';
  return null;
}

let lastScope: HTMLElement | null = null;
/** where the focus was, to find it again after a screen redraws its controls under the pad */
let lastFocus: { scope: HTMLElement; index: number; text: string; tag: string } | null = null;

function rememberFocus(scope: HTMLElement): void {
  const el = document.activeElement as HTMLElement | null;
  if (!el || el === document.body || !scope.contains(el)) return;
  const items = focusables(scope);
  const index = items.indexOf(el);
  if (index >= 0) lastFocus = { scope, index, text: (el.textContent ?? '').trim(), tag: el.tagName };
}

function restoreFocus(scope: HTMLElement): void {
  const items = focusables(scope);
  if (!items.length) return;
  const lf = lastFocus;
  let pick: HTMLElement | undefined;
  if (lf && lf.scope === scope) {
    const same = items.map((e, i) => ({ e, i })).filter(({ e }) => e.tagName === lf.tag && (e.textContent ?? '').trim() === lf.text);
    pick = same.sort((a, b) => Math.abs(a.i - lf.index) - Math.abs(b.i - lf.index))[0]?.e ?? items[Math.min(lf.index, items.length - 1)];
  }
  if (pick) pick.focus({ preventScroll: true });
  else focusStart(scope);
}

/** Once per animation frame (after the pads are polled). `now` in ms. */
export function pollMenuPad(now: number): void {
  if (captureActive) {
    repeat.clear();
    return;
  }
  const scope = menuScope();
  if (!scope) {
    repeat.clear();
    lastScope = null;
    return;
  }
  // under the pad, a menu that opens takes the focus, and a redraw that dropped it gets it back
  const padNav = document.body.classList.contains('pad-nav');
  const active = document.activeElement as HTMLElement | null;
  const lost = !active || active === document.body || !active.isConnected || !scope.contains(active);
  if (scope !== lastScope) {
    lastScope = scope;
    if (padNav && lost && !handler) setTimeout(() => menuScope() === scope && focusStart(scope), 0);
  } else if (padNav && lost && !handler) restoreFocus(scope);
  rememberFocus(scope);
  const mp = menuButtons();
  for (const p of padList()) {
    // directions, with key-repeat
    const dir = heldDir(p);
    const r = repeat.get(p.index) ?? { dir: null, at: 0 };
    let fire = false;
    if (dir && dir !== r.dir) {
      fire = true;
      r.at = now + 320;
    } else if (dir && now >= r.at) {
      fire = true;
      r.at = now + 110;
    }
    r.dir = dir;
    repeat.set(p.index, r);
    const events: PadEvent[] = [];
    if (fire && dir) events.push(dir);
    const btn: [PadEvent, number][] = [
      ['confirm', mp.confirm],
      ['back', mp.back],
      ['start', 9],
      ['view', 8],
      ['lb', 4],
      ['rb', 5],
      ['lt', 6],
      ['rt', 7],
    ];
    if (mp.confirm !== 2 && mp.back !== 2) btn.push(['x', 2]);
    if (mp.confirm !== 3 && mp.back !== 3) btn.push(['y', 3]);
    for (const [ev, b] of btn) {
      if (!padEdge(p, b)) continue;
      events.push(ev);
      // the press belongs to the menu: the game must not see it too
      swallowButton(p, b);
    }
    for (const ev of events) {
      document.body.classList.add('pad-nav');
      const s = menuScope();
      if (!s) break;
      if (handler?.(ev, p)) continue;
      menuAction(ev, s, p.index);
    }
  }
}

/** keyboard: arrows move the focus, Enter / Space press focused tiles, Escape goes back */
export function attachMenuKeys(): void {
  window.addEventListener('keydown', (e) => {
    if (captureActive || e.ctrlKey || e.metaKey || e.altKey) return;
    const scope = menuScope();
    if (!scope) return;
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    const arrow = e.code === 'ArrowUp' ? 'up' : e.code === 'ArrowDown' ? 'down' : e.code === 'ArrowLeft' ? 'left' : e.code === 'ArrowRight' ? 'right' : null;
    if (arrow && !typing) {
      e.preventDefault();
      document.body.classList.add('pad-nav');
      moveFocus(scope, arrow === 'left' ? -1 : arrow === 'right' ? 1 : 0, arrow === 'up' ? -1 : arrow === 'down' ? 1 : 0);
      return;
    }
    if ((e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') && t && t.getAttribute('tabindex') === '0' && t.tagName !== 'BUTTON' && !typing) {
      e.preventDefault();
      t.click();
      return;
    }
    if (e.code === 'Escape') {
      // after the screen's own Escape handling (the pause menu resumes, a scene skips, a capture binds Escape)
      setTimeout(() => {
        if (e.defaultPrevented || captureActive) return;
        const s = menuScope();
        if (s === scope && scope.isConnected) {
          const backs = [...scope.querySelectorAll<HTMLElement>('[data-back]')].filter(visible);
          if (backs.length) backs[backs.length - 1].click();
        }
      }, 0);
    }
  });
  // the ring shows only while a pad or the arrow keys drive the menus
  const off = (): void => document.body.classList.remove('pad-nav');
  window.addEventListener('mousemove', off, { passive: true });
  window.addEventListener('mousedown', off, { passive: true });
}

/** a pad by index (screens that need more than the event) */
export function padByIndex(i: number): PadState | undefined {
  return getPad(i);
}
