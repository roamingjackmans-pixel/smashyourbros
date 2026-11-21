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
  const close = (): void => {
    if (closed) return;
    closed = true;
    back.remove();
    opts.onClose?.();
  };
  back.addEventListener('pointerdown', (e) => {
    if (e.target === back) close();
  });
  document.body.appendChild(back);
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

/** a canvas element sized to its CSS box at device pixel ratio, with a draw callback each animation frame */
export function liveCanvas(cls: string, draw: (c: CanvasRenderingContext2D, w: number, h: number, t: number) => void): { el: HTMLCanvasElement; stop: () => void } {
  const el = h(`canvas.${cls}`) as HTMLCanvasElement;
  let raf = 0;
  let t = 0;
  let stopped = false;
  const loop = (): void => {
    if (stopped) return;
    raf = requestAnimationFrame(loop);
    if (!el.isConnected) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(el.clientWidth * dpr));
    const hh = Math.max(1, Math.floor(el.clientHeight * dpr));
    if (el.width !== w || el.height !== hh) {
      el.width = w;
      el.height = hh;
    }
    const c = el.getContext('2d')!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, hh);
    draw(c, w, hh, t++);
  };
  raf = requestAnimationFrame(loop);
  return {
    el,
    stop: () => {
      stopped = true;
      cancelAnimationFrame(raf);
    },
  };
}
