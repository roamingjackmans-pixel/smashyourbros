// Tiny DOM helpers: h('div.class#id', attrs?, ...children), modals and toasts.
type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown> & { style?: Partial<CSSStyleDeclaration> | string };

export function h(tag: string, ...rest: (Attrs | Child)[]): HTMLElement {
  const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(tag);
  const el = document.createElement(m?.[1] || 'div');
  for (const part of (m?.[2] || '').match(/[.#][\w-]+/g) ?? []) {
    if (part[0] === '.') el.classList.add(part.slice(1));
    else el.id = part.slice(1);
  }
  let i = 0;
  const first = rest[0];
  if (first && typeof first === 'object' && !(first instanceof Node) && !Array.isArray(first)) {
    const a = first as Attrs;
    for (const [k, v] of Object.entries(a)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'style') {
        if (typeof v === 'string') el.setAttribute('style', v);
        else Object.assign(el.style, v);
      } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
      else if (k === 'class') el.className += ` ${v}`;
      else if (k === 'html') el.innerHTML = String(v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
    i = 1;
  }
  const add = (c: Child): void => {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  for (; i < rest.length; i++) add(rest[i] as Child);
  return el;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function uiRoot(): HTMLElement {
  return document.getElementById('ui')!;
}

/** a modal over everything; returns close() */
export function modal(content: HTMLElement, opts: { onClose?: () => void; wide?: boolean } = {}): () => void {
  const back = h('div.modal-back');
  const box = h(`div.modal${opts.wide ? '.wide' : ''}`, content);
  back.appendChild(box);
  let closed = false;
  const prevFocus = document.activeElement as HTMLElement | null;
  // Escape (and a pad's Back, which sends Escape) closes the top-most modal
  const onKey = (e: KeyboardEvent): void => {
    if (e.code !== 'Escape' || e.defaultPrevented) return;
    const all = document.querySelectorAll('.modal-back');
    if (all[all.length - 1] !== back) return;
    e.preventDefault();
    close();
  };
  const close = (): void => {
    if (closed) return;
    closed = true;
    window.removeEventListener('keydown', onKey);
    back.remove();
    opts.onClose?.();
    // back to where the menu was (a pad keeps its place)
    if (prevFocus?.isConnected && document.body.classList.contains('pad-nav')) prevFocus.focus({ preventScroll: true });
  };
  back.addEventListener('pointerdown', (e) => {
    if (e.target === back) close();
  });
  window.addEventListener('keydown', onKey);
  document.body.appendChild(back);
  if (document.body.classList.contains('pad-nav')) {
    setTimeout(() => box.querySelector<HTMLElement>('[data-autofocus], button:not(:disabled), [tabindex="0"], input, select')?.focus(), 0);
  }
  return close;
}

export function toast(msg: string, kind: 'ok' | 'bad' | 'gold' = 'ok', ms = 3200): void {
  let host = document.getElementById('toasts');
  if (!host) {
    host = h('div#toasts');
    document.body.appendChild(host);
  }
  const t = h(`div.toast.${kind}`, msg);
  host.appendChild(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 500);
}

/**
 * A canvas element sized to its CSS box, with a draw callback on a 60 Hz clock (`every` = draw every nth tick; `t`
 * counts ticks). It sleeps while scrolled out of view and draws at up to 1.5 device pixels per CSS pixel (D22: a
 * 120 Hz screen drew every portrait twice as often, at full density).
 */
export function liveCanvas(cls: string, draw: (c: CanvasRenderingContext2D, w: number, h: number, t: number) => void, every = 1): { el: HTMLCanvasElement; stop: () => void } {
  const el = h(`canvas.${cls}`) as HTMLCanvasElement;
  let raf = 0;
  let t = 0;
  let stopped = false;
  let visible = true;
  let acc = 0;
  let last = 0;
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((es) => (visible = es[es.length - 1]?.isIntersecting ?? true)) : null;
  io?.observe(el);
  const loop = (now: number): void => {
    if (stopped) return;
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(100, now - last) : 1000 / 60;
    last = now;
    if (!el.isConnected || !visible) return;
    acc += dt;
    if (acc < (1000 / 60) * 0.85) return;
    acc = Math.max(0, acc - 1000 / 60);
    if (t++ % every !== 0) return;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(el.clientWidth * dpr));
    const hh = Math.max(1, Math.floor(el.clientHeight * dpr));
    if (el.width !== w || el.height !== hh) {
      el.width = w;
      el.height = hh;
    }
    const c = el.getContext('2d')!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, hh);
    draw(c, w, hh, t);
  };
  raf = requestAnimationFrame(loop);
  return {
    el,
    stop: () => {
      stopped = true;
      cancelAnimationFrame(raf);
      io?.disconnect();
    },
  };
}

/** a number pad for code fields (lobby and friend codes): a controller can't type, D23. Shown while pads drive. */
export function keypad(input: HTMLInputElement, onEnter?: () => void): HTMLElement {
  const max = input.maxLength > 0 ? input.maxLength : 8;
  const press = (k: string): void => {
    if (k === '⌫') input.value = input.value.slice(0, -1);
    else if (k === '✔') return onEnter?.();
    else if (input.value.length < max) input.value += k;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  return h(
    'div.keypad.pad-only',
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✔'].map((k) => h(`button${k === '✔' ? '.primary' : ''}`, { type: 'button', title: k === '⌫' ? 'Delete' : k === '✔' ? 'Go' : k, onclick: () => press(k) }, k)),
  );
}
