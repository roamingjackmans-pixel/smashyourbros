// The character select: a roster grid with live portraits, and up to four player slots, each with a big animated
// render of its pick. Used by local versus, online lobbies, Classic and Story.
import { ROSTER } from '../sim/data';
import { taskFor } from '../data/tasks';
import { pads, type Device } from '../game/input';
import { artFor } from '../render/fighters';
import { PLAYER_TINTS, TEAM_TINTS } from '../render/renderer';
import { shade } from '../render/art';
import { audio } from '../audio/audio';
import { clear, h, liveCanvas, toast } from './dom';
import { drawFighterAt, drawTile } from './portrait';

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
}

export function deviceLabel(d: Device | null): string {
  if (!d) return '—';
  if (d.kind === 'kb') return d.index === 0 ? '⌨ WASD' : '⌨ Arrows';
  return `🎮 Pad ${d.index + 1}`;
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

  constructor(
    public slots: SlotPick[],
    public o: PickerOpts,
  ) {
    this.grid = h('div.roster');
    this.slotsEl = h('div.slots');
    this.el = h('div.css-wrap', this.grid, this.slotsEl);
    this.buildGrid();
    this.renderSlots();
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
      const tile = h(`div.rtile${locked ? '.locked' : ''}`, { title: locked ? `Locked: ${taskFor(id)?.desc ?? 'keep playing'}` : `${r.def.name} — ${r.def.role}` });
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
    const rnd = h('div.rtile', { title: 'Random' }, h('div', { style: { position: 'absolute', inset: '0', display: 'grid', placeItems: 'center', fontFamily: 'Bungee', fontSize: '40px', background: 'linear-gradient(135deg,#ff3a6e,#3a8dff)' } }, '?'), h('div.nm', 'Random'));
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
    for (const tile of Array.from(this.grid.querySelectorAll<HTMLElement>('.rtile'))) {
      const tags = tile.querySelector('.tags');
      if (!tags) continue;
      clear(tags as HTMLElement);
      this.slots.forEach((s, i) => {
        if (s.kind === 'off' || s.fighter !== tile.dataset.id) return;
        tags.appendChild(h('span', { style: { background: slotTint(s, i, this.o.teams) } }, s.kind === 'cpu' ? 'C' : String(i + 1)));
      });
    }
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
          s.device = opts[Number(sel.value)];
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
                if (s.kind === 'human' && !s.device) s.device = deviceOptions()[Math.min(i, deviceOptions().length - 1)];
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
