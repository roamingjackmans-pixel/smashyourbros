// The online match driver: runs the rollback session, sends this machine's inputs to everyone (direct WebRTC when
// it's up, always also through the server relay), handles desync repair and dropped players.
import { readDevice, type Device } from '../game/input';
import type { Driver } from '../game/match';
import { initState } from '../sim/sim';
import type { MatchCfg, State } from '../sim/types';
import { Mesh } from './p2p';
import { Session, type Packet } from './rollback';
import type { Net } from './socket';

export interface OnlineSetup {
  cfg: MatchCfg;
  /** user id per slot ('' for CPU slots) */
  slots: string[];
  me: string;
  host: boolean;
  delay: number;
  names: string[];
}

export class OnlineDriver implements Driver {
  readonly online = true;
  session: Session;
  mesh: Mesh;
  private off: (() => void)[] = [];
  private stallSince = 0;
  private sentCpu = new Set<number>();
  private tickN = 0;
  private localSlot: number;

  constructor(
    private net: Net,
    private o: OnlineSetup,
    private device: Device,
  ) {
    const st = initState(o.cfg);
    this.localSlot = o.slots.indexOf(o.me);
    const remote = o.slots.map((u, i) => (u && u !== o.me ? i : -1)).filter((i) => i >= 0);
    this.session = new Session(st, this.localSlot, remote, o.delay);
    this.mesh = new Mesh(net, o.me, (_from, d) => this.onPacket(d as Packet));
    this.mesh.connect(o.slots.filter((u) => u && u !== o.me));
    this.off.push(net.on('in', (m: { from: string; d: Packet }) => this.onPacket(m.d)));
    this.off.push(
      net.on('hostmsg', (m: { t: string; frame?: number; state?: State; slot?: number; level?: number }) => {
        if (m.t === 'sync' && m.state && m.frame !== undefined && !o.host) this.session.adopt(m.frame, m.state);
        if (m.t === 'cpu' && m.slot !== undefined && m.frame !== undefined) this.session.toCpu(m.slot, m.frame, m.level ?? 5);
      }),
    );
    this.session.onDesync = (frame) => {
      if (!this.o.host) return;
      const snap = this.session.snapshot(frame);
      if (snap) this.net.hostSend({ t: 'sync', frame, state: snap });
    };
  }

  private onPacket(p: Packet): void {
    if (!p || typeof p.s !== 'number') return;
    this.session.receive(p);
  }

  state(): State {
    return this.session.st;
  }

  tick(onStep: (st: State) => void): void {
    this.tickN++;
    const s = this.session;
    s.addLocal(readDevice(this.device));
    const p = s.packet(Math.max(0, s.last[this.localSlot] - 14));
    if (this.tickN % 120 === 0) {
      const cs = s.checkPoint();
      if (cs) p.cs = cs;
    }
    const direct = this.mesh.broadcast(p);
    const everyoneDirect = direct >= s.remote.length && s.remote.length > 0;
    if (!everyoneDirect || this.tickN % 3 === 0) this.net.sendInputs(p);
    const ran = s.advance(onStep);
    // dropped players: after 8 s the host turns them into CPUs
    if (!ran) {
      if (!this.stallSince) this.stallSince = performance.now();
      if (this.o.host && performance.now() - this.stallSince > 8000) {
        for (const slot of s.waitingOn()) {
          if (this.sentCpu.has(slot)) continue;
          this.sentCpu.add(slot);
          const frame = s.last[slot] + 1;
          this.net.hostSend({ t: 'cpu', slot, frame, level: 5 });
          s.toCpu(slot, frame, 5);
        }
      }
    } else this.stallSince = 0;
  }

  waiting(): string | null {
    const w = this.session.waitingOn();
    if (!w.length || !this.stallSince || performance.now() - this.stallSince < 500) return null;
    const secs = Math.max(0, 8 - Math.floor((performance.now() - this.stallSince) / 1000));
    return `Waiting for ${w.map((i) => this.o.names[i] || `P${i + 1}`).join(', ')}… ${secs > 0 ? `(CPU takes over in ${secs})` : ''}`;
  }

  stop(): void {
    for (const f of this.off) f();
    this.mesh.close();
  }
}
