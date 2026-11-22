// The character select: a roster grid with live portraits, and up to four player slots, each with a big animated
// render of its pick. Used by local versus, online lobbies, Classic and Story.
import { ROSTER } from '../sim/data';
import { taskFor } from '../data/tasks';
import { keyboardIdleMs, padLayout, pads, type Device } from '../game/input';
import { getPad, onPadChange, padNumber, type PadState } from '../game/pads';
import { artFor } from '../render/fighters';
import { PLAYER_TINTS, TEAM_TINTS } from '../render/renderer';
import { shade } from '../render/art';
import { audio } from '../audio/audio';
import { clear, h, liveCanvas, toast } from './dom';
import { drawFighterAt, drawTile } from './portrait';
import { setPadHandler, type PadEvent } from './menuPad';
import { hintBar, type GlyphAction } from './glyphs';

export interface SlotPick {
  kind: 'human' | 'cpu' | 'off';
  fighter: string;
  palette: number;
  cpu: number;
  team: number;
  device: Device | null;
  name: string;
  userId?: string;
  ready?: boolean;
  /** shown but not editable here (another player's slot online) */
  remote?: boolean;
  random?: boolean;
}

export interface PickerOpts {
  unlocked: string[];
  teams: boolean;
  /** which slots this screen may edit */
  editable: (i: number) => boolean;
  /** may slots be switched between human / cpu / off */
  canSwitchKind: (i: number) => boolean;
  /** show device pickers (local play) */
  devices: boolean;
  onChange: () => void;
  /** slot currently picking from the grid */
  active: number;
  maxSlots?: number;
  /** pads may join by pressing A / Start (local play) */
  join?: boolean;
  /** CPU slots exist here (false in story and Classic, where extra slots are players) */
  cpus?: boolean;
}

export function deviceLabel(d: Device | null): string {
  if (!d) return '—';
  if (d.kind === 'kb') return d.index === 0 ? '⌨ WASD' : '⌨ Arrows';
  const p = getPad(d.index);
  return p ? `🎮 ${p.model} ${padNumber(d.index)}` : `🎮 Pad ${d.index + 1} (unplugged)`;
}

/** a pad's cursor on the roster grid (each local player picks with their own), or "menu mode" (the shared focus) */
interface Cursor {
  tile: number;
  menu: boolean;
  /** the slot this pad is picking for: its own, or a CPU / empty slot it chose with LB / RB */
  target: number;
}

export function deviceOptions(): Device[] {
  return [{ kind: 'kb', index: 0, tapJump: false }, { kind: 'kb', index: 1, tapJump: false }, ...pads().map((i) => ({ kind: 'pad' as const, index: i, tapJump: true }))];
}

export function slotTint(s: SlotPick, i: number, teams: boolean): string {
  return teams ? TEAM_TINTS[s.team % TEAM_TINTS.length] : PLAYER_TINTS[i % PLAYER_TINTS.length];
}

export class Picker {
  el: HTMLElement;
  private grid: HTMLElement;
  private slotsEl: HTMLElement;
  private stops: (() => void)[] = [];
  private t = 0;
  private cursors = new Map<number, Cursor>();

  constructor(
    public slots: SlotPick[],
    public o: PickerOpts,
  ) {
    this.grid = h('div.roster');
    this.slotsEl = h('div.slots');
    const hints = hintBar(
      o.join === false
        ? [
            ['move', 'Move'],
            ['menuConfirm', 'Pick'],
            ['menuX', 'Colour'],
            ['menuRB', 'Pick for a CPU'],
            ['menuRT', 'CPU level'],
            ['menuView', 'Menu'],
          ]
        : [
            ['move', 'Move'],
            ['menuConfirm', 'Pick / join'],
            ['menuX', 'Colour'],
            ...(o.cpus === false
              ? []
              : ([
                  ['menuRB', 'Pick for a CPU'],
                  ['menuRT', 'CPU level'],
                ] as [GlyphAction, string][])),
            ['menuBack', 'Leave / back'],
            ['menuView', 'Menu'],
            ['menuStart', 'Fight!'],
          ],
      18,
    );
    this.el = h('div.css-wrap', this.grid, this.slotsEl, h('div.picker-hints', hints));
    this.buildGrid();
    this.renderSlots();
    if (o.devices) {
      this.stops.push(setPadHandler((ev, pad) => this.onPad(ev, pad)));
      this.stops.push(onPadChange(() => this.renderSlots()));
    }
  }

  // ------------------------------------------------------------------ pads (D23)

  /** the slot a pad plays in */
  private slotOf(pad: number): number {
    return this.slots.findIndex((s, i) => s.kind === 'human' && s.device?.kind === 'pad' && s.device.index === pad && this.o.editable(i));
  }

  /** slots a pad in slot `si` can pick for: its own, then each CPU slot and empty slot it may edit */
  private targets(si: number): number[] {
    const max = this.o.maxSlots ?? 4;
    const out = [si];
    if (this.o.cpus === false) return out;
    this.slots.forEach((s, i) => {
      if (i === si || i >= max || !this.o.editable(i)) return;
      if (s.kind === 'cpu' || (s.kind === 'off' && this.o.canSwitchKind(i))) out.push(i);
    });
    return out;
  }

  private tiles(): HTMLElement[] {
    return Array.from(this.grid.querySelectorAll<HTMLElement>('.rtile'));
  }

  /** a pad presses A / Start without a slot: it takes the first free one */
  private join(pad: PadState): number {
    if (this.o.join === false) return -1;
    const max = this.o.maxSlots ?? 4;
    const kbIdle = keyboardIdleMs() > 15000;
    const ok = (i: number): boolean => i < max && this.o.editable(i);
    let j = this.slots.findIndex((s, i) => ok(i) && s.kind === 'human' && (!s.device || (s.device.kind === 'kb' && kbIdle) || (s.device.kind === 'pad' && !getPad(s.device.index))));
    if (j < 0) j = this.slots.findIndex((s, i) => ok(i) && this.o.canSwitchKind(i) && s.kind === 'off');
    if (j < 0) j = this.slots.findIndex((s, i) => ok(i) && this.o.canSwitchKind(i) && s.kind === 'cpu');
    if (j < 0) {
      toast('Every slot is taken, bro. Four is a party.', 'bad');
      return -1;
    }
    const s = this.slots[j];
    s.kind = 'human';
    s.device = { kind: 'pad', index: pad.index, port: j, tapJump: padLayout(j).tapJump };
    if (!s.name || /^(CPU|P\d)/.test(s.name)) s.name = `P${j + 1}`;
    s.ready = false;
    this.o.active = j;
    const ti = ROSTER.findIndex((r) => r.def.id === s.fighter);
    this.cursors.set(pad.index, { tile: Math.max(0, ti), menu: false, target: j });
    audio.sfx('select');
    toast(`P${j + 1} joined with ${pad.model} ${padNumber(pad.index)}. Welcome to the show, bro!`);
    this.renderSlots();
    this.o.onChange();
    return j;
  }

  private onPad(ev: PadEvent, pad: PadState): boolean {
    const si = this.slotOf(pad.index);
    if (si < 0) {
      if (ev === 'confirm' || ev === 'start') return this.join(pad) >= 0;
      return false;
    }
    let cur = this.cursors.get(pad.index);
    if (!cur) {
      const ti = ROSTER.findIndex((r) => r.def.id === this.slots[si].fighter);
      cur = { tile: Math.max(0, ti), menu: false, target: si };
      this.cursors.set(pad.index, cur);
      this.markTags();
    }
    // the slot it picks for must still be one it may edit (a CPU slot can be switched off meanwhile)
    if (!this.targets(si).includes(cur.target)) cur.target = si;
    const tg = cur.target;
    if (cur.menu) {
      // the shared focus (Rules, CPUs, devices, the top bar); View or Back returns to the grid
      if (ev === 'view' || ev === 'back') {
        cur.menu = false;
        (document.activeElement as HTMLElement | null)?.blur?.();
        this.markTags();
        return true;
      }
      return false;
    }
    const tiles = this.tiles();
    switch (ev) {
      case 'up':
      case 'down':
      case 'left':
      case 'right': {
        const tops = tiles.map((t) => t.offsetTop);
        const cols = Math.max(1, tops.filter((y) => y === tops[0]).length);
        const n = tiles.length;
        let i = cur.tile;
        if (ev === 'left') i = i % cols === 0 ? Math.min(n - 1, i + cols - 1) : i - 1;
        else if (ev === 'right') i = i % cols === cols - 1 || i === n - 1 ? i - (i % cols) : i + 1;
        else if (ev === 'up') i = i - cols >= 0 ? i - cols : Math.min(n - 1, i + cols * Math.floor((n - 1 - i) / cols));
        else {
          // down: onto the row below, or its last tile when that row is shorter (Random sits alone at the end)
          const row = Math.floor(i / cols);
          const lastRow = Math.floor((n - 1) / cols);
          i = row < lastRow ? Math.min(i + cols, n - 1) : i % cols;
        }
        cur.tile = i;
        this.o.active = tg;
        audio.sfx('menu');
        this.markTags();
        this.paintActive();
        return true;
      }
      case 'confirm': {
        const tile = tiles[cur.tile];
        if (!tile) return true;
        this.o.active = tg;
        tile.click();
        return true;
      }
      case 'x':
      case 'y':
        this.palette(tg, ev === 'x' ? -1 : 1);
        return true;
      case 'lb':
      case 'rb': {
        // LB / RB: pick for your own slot, a CPU, or an empty slot (which becomes a CPU when you pick)
        const list = this.targets(si);
        const k = list.indexOf(tg);
        cur.target = list[(k + (ev === 'rb' ? 1 : -1) + list.length) % list.length];
        const s = this.slots[cur.target];
        if (s.kind !== 'off') cur.tile = Math.max(0, this.tiles().findIndex((t) => t.dataset.id === s.fighter));
        this.o.active = cur.target;
        audio.sfx('menu');
        this.markTags();
        this.paintActive();
        return true;
      }
      case 'lt':
      case 'rt': {
        // LT / RT: the CPU's level
        const s = this.slots[tg];
        if (s.kind !== 'cpu') {
          if (this.o.cpus !== false && this.targets(si).length > 1) toast('Press RB to pick for a CPU first, then LT / RT sets its level.');
          return true;
        }
        s.cpu = Math.max(1, Math.min(9, (s.cpu || 5) + (ev === 'rt' ? 1 : -1)));
        audio.sfx('menu');
        this.renderSlots();
        this.o.onChange();
        return true;
      }
      case 'back': {
        // picking for a CPU: back to your own slot first
        if (tg !== si) {
          cur.target = si;
          this.o.active = si;
          audio.sfx('back');
          this.markTags();
          this.paintActive();
          return true;
        }
        // the first player backs out of the screen; anyone else leaves their slot
        const lead = this.slots.findIndex((s, i) => s.kind === 'human' && this.o.editable(i));
        if (si === lead || !this.o.canSwitchKind(si) || this.o.join === false) return false;
        const s = this.slots[si];
        s.kind = 'off';
        s.device = null;
        this.cursors.delete(pad.index);
        audio.sfx('back');
        this.renderSlots();
        this.o.onChange();
        return true;
      }
      case 'view': {
        cur.menu = true;
        this.markTags();
        const first = this.slotsEl.children[si]?.querySelector<HTMLElement>('button, select');
        (first ?? this.el.closest('.screen')?.querySelector<HTMLElement>('.topbar button'))?.focus();
        document.body.classList.add('pad-nav');
        return true;
      }
    }
    return false;
  }

  /** outline the slot that's picking */
  private paintActive(): void {
    Array.from(this.slotsEl.children).forEach((el, i) => {
      if (!(el instanceof HTMLElement)) return;
      el.style.outline = this.o.active === i && this.o.editable(i) ? '4px solid #fff' : '';
    });
  }

  destroy(): void {
    for (const s of this.stops) s();
    this.stops = [];
  }

  private buildGrid(): void {
    clear(this.grid);
    for (const r of ROSTER) {
      const id = r.def.id;
      const locked = !this.o.unlocked.includes(id);
      const tags = h('div.tags');
      const tile = h(`div.rtile${locked ? '.locked' : ''}`, { tabindex: '0', role: 'button', title: locked ? `Locked: ${taskFor(id)?.desc ?? 'keep playing'}` : `${r.def.name} — ${r.def.role}` });
      const cv = liveCanvas('tilecv', (c, w, hh) => drawTile(c, w, hh, id, 0, this.t, locked), 4);
      this.stops.push(cv.stop);
      tile.append(cv.el, tags, h('div.nm', locked ? '???' : r.def.name));
      tile.addEventListener('click', () => {
        if (locked) {
          toast(`${taskFor(id)?.title ?? 'Locked'}: ${taskFor(id)?.desc ?? 'Keep playing to unlock.'}`, 'gold', 4200);
          return;
        }
        this.pick(id);
      });
      tile.dataset.id = id;
      this.grid.appendChild(tile);
    }
    // random
    const rnd = h('div.rtile', { tabindex: '0', role: 'button', title: 'Random' }, h('div', { style: { position: 'absolute', inset: '0', display: 'grid', placeItems: 'center', fontFamily: 'Bungee', fontSize: '40px', background: 'linear-gradient(135deg,#ff3a6e,#3a8dff)' } }, '?'), h('div.nm', 'Random'));
    rnd.addEventListener('click', () => {
      const pool = ROSTER.filter((r) => this.o.unlocked.includes(r.def.id));
      this.pick(pool[Math.floor(Math.random() * pool.length)].def.id, true);
    });
    this.grid.appendChild(rnd);
    const tick = (): void => {
      this.t++;
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);
    this.stops.push(() => cancelAnimationFrame(raf));
    this.markTags();
  }

  private markTags(): void {
    const tiles = this.tiles();
    tiles.forEach((tile, ti) => {
      // the Random tile has no tag strip, but still shows cursors
      const tags = tile.querySelector('.tags');
      if (tags) {
        clear(tags as HTMLElement);
        this.slots.forEach((s, i) => {
          if (s.kind === 'off' || s.fighter !== tile.dataset.id) return;
          tags.appendChild(h('span', { style: { background: slotTint(s, i, this.o.teams) } }, s.kind === 'cpu' ? 'C' : String(i + 1)));
        });
      }
      // each pad player's own cursor, labelled with the slot it's picking for
      for (const el of Array.from(tile.querySelectorAll('.pcur'))) el.remove();
      for (const [pad, c] of this.cursors) {
        if (c.menu || c.tile !== ti) continue;
        const si = this.slotOf(pad);
        if (si < 0) continue;
        const tg = this.targets(si).includes(c.target) ? c.target : si;
        const ts = this.slots[tg];
        const tint = slotTint(ts.kind === 'off' ? this.slots[si] : ts, tg, this.o.teams);
        const label = tg === si ? `P${si + 1}` : ts.kind === 'off' ? `P${si + 1} → +CPU` : `P${si + 1} → CPU`;
        tile.appendChild(h('div.pcur', { style: { borderColor: tint } }, h('b', { style: { background: tint } }, label)));
      }
    });
    // forget the cursors of pads that left their slot
    for (const pad of [...this.cursors.keys()]) if (this.slotOf(pad) < 0) this.cursors.delete(pad);
  }

  pick(id: string, random = false): void {
    const i = this.o.active;
    const s = this.slots[i];
    if (!s || !this.o.editable(i)) {
      // pick for the first editable slot instead
      const j = this.slots.findIndex((x, k) => this.o.editable(k) && x.kind !== 'off');
      if (j < 0) return;
      this.o.active = j;
      return this.pick(id, random);
    }
    if (s.kind === 'off') s.kind = 'cpu';
    s.fighter = id;
    s.random = random;
    s.ready = false;
    // avoid identical colours on the same fighter
    const taken = this.slots.filter((x, k) => k !== i && x.kind !== 'off' && x.fighter === id).map((x) => x.palette);
    while (taken.includes(s.palette)) s.palette = (s.palette + 1) % 8;
    audio.sfx('select');
    this.renderSlots();
    this.o.onChange();
  }

  renderSlots(): void {
    clear(this.slotsEl);
    const max = this.o.maxSlots ?? 4;
    this.slots.slice(0, max).forEach((s, i) => this.slotsEl.appendChild(this.slotEl(s, i)));
    this.markTags();
  }

  private slotEl(s: SlotPick, i: number): HTMLElement {
    const tint = slotTint(s, i, this.o.teams);
    const edit = this.o.editable(i);
    if (s.kind === 'off') {
      const el = h('div.slot.off', h('div.who', `P${i + 1}`), h('div.grow', { style: { display: 'grid', placeItems: 'center', fontWeight: '900', color: 'var(--dim)' } }, this.o.canSwitchKind(i) ? 'Click to add a CPU' : 'Empty'));
      if (this.o.canSwitchKind(i)) {
        el.style.cursor = 'pointer';
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
        el.addEventListener('click', () => {
          s.kind = 'cpu';
          s.cpu = s.cpu || 5;
          this.o.active = i;
          this.renderSlots();
          this.o.onChange();
        });
      }
      return el;
    }
    const art = artFor(s.fighter);
    const pal = art.palettes[s.palette % art.palettes.length];
    const def = ROSTER.find((r) => r.def.id === s.fighter)?.def;
    const el = h('div.slot', { style: { background: `linear-gradient(180deg, ${shade(tint, -0.1)}, ${shade(tint, -0.65)})`, outline: this.o.active === i && edit ? '4px solid #fff' : '' } });
    const who = s.kind === 'cpu' ? `CPU · Lv ${s.cpu}` : s.name || `P${i + 1}`;
    el.appendChild(h('div.who', who));
    el.appendChild(h('div.fname', s.random ? 'Random' : (def?.name ?? s.fighter)));
    const cv = liveCanvas('slotcv', (c, w, hh, t) => {
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.beginPath();
      c.ellipse(w / 2, hh * 0.92, w * 0.3, hh * 0.05, 0, 0, Math.PI * 2);
      c.fill();
      drawFighterAt(c, s.fighter, s.palette, w / 2, hh * 0.92, hh * 0.78, t, s.ready ? 'taunt' : 'idle', 1, !!s.random);
    });
    this.stops.push(cv.stop);
    el.appendChild(cv.el);
    if (s.ready) el.appendChild(h('div.ready', 'READY!'));
    const ctrl = h('div.ctrl');
    if (edit) {
      el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'SELECT') return;
        this.o.active = i;
        this.renderSlots();
      });
      ctrl.append(
        h('button.tiny', { title: 'Previous colour', onclick: () => this.palette(i, -1) }, '◀'),
        h('span.small', { style: { fontWeight: '900', minWidth: '70px', textAlign: 'center' } }, pal.name ?? `Colour ${s.palette + 1}`),
        h('button.tiny', { title: 'Next colour', onclick: () => this.palette(i, 1) }, '▶'),
      );
      if (s.kind === 'cpu') {
        ctrl.append(
          h('button.tiny', { onclick: () => ((s.cpu = Math.max(1, s.cpu - 1)), this.renderSlots(), this.o.onChange()) }, '−'),
          h('span.small', { style: { fontWeight: '900' } }, `Lv ${s.cpu}`),
          h('button.tiny', { onclick: () => ((s.cpu = Math.min(9, s.cpu + 1)), this.renderSlots(), this.o.onChange()) }, '+'),
        );
      }
      if (this.o.teams) {
        ctrl.append(h('button.tiny', { style: { background: TEAM_TINTS[s.team % TEAM_TINTS.length] }, onclick: () => ((s.team = (s.team + 1) % 2), this.renderSlots(), this.o.onChange()) }, 'Team'));
      }
      if (this.o.devices && s.kind === 'human') {
        const opts = deviceOptions();
        const sel = h('select', { style: { padding: '2px 4px', fontSize: '12px' } }) as HTMLSelectElement;
        opts.forEach((d, k) => sel.appendChild(h('option', { value: String(k), ...(s.device && d.kind === s.device.kind && d.index === s.device.index ? { selected: true } : {}) }, deviceLabel(d))));
        sel.addEventListener('change', () => {
          const d = opts[Number(sel.value)];
          s.device = { ...d, port: i, tapJump: d.kind === 'pad' ? padLayout(i).tapJump : d.tapJump };
          this.renderSlots();
          this.o.onChange();
        });
        ctrl.append(sel);
      }
      if (this.o.canSwitchKind(i)) {
        ctrl.append(
          h(
            'button.tiny',
            {
              title: 'Human / CPU / off',
              onclick: () => {
                s.kind = s.kind === 'human' ? 'cpu' : s.kind === 'cpu' ? 'off' : 'human';
                if (s.kind === 'human' && !s.device) s.device = { ...deviceOptions()[Math.min(i, deviceOptions().length - 1)], port: i };
                this.renderSlots();
                this.o.onChange();
              },
            },
            s.kind === 'human' ? '👤' : '🤖',
          ),
        );
      }
    } else if (s.remote) {
      ctrl.append(h('span.small', { style: { fontWeight: '900' } }, s.ready ? '✔ Ready' : 'Picking…'));
    }
    el.appendChild(ctrl);
    return el;
  }

  private palette(i: number, d: number): void {
    const s = this.slots[i];
    s.palette = (s.palette + d + 8) % 8;
    s.ready = false;
    audio.sfx('menu');
    this.renderSlots();
    this.o.onChange();
  }
}
