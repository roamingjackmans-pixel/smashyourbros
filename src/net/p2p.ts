// Direct connections between the players in a lobby (WebRTC data channels, unordered and unreliable, which is what
// fast input packets want). Offers and answers travel through the server's rtc:signal relay. The server relay keeps
// carrying everything too, so a blocked direct connection only costs a little latency.
import type { Net } from './socket';

interface Peer {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  open: boolean;
}

const ICE: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export class Mesh {
  peers = new Map<string, Peer>();
  private off: (() => void)[] = [];
  closed = false;

  constructor(
    private net: Net,
    private me: string,
    private onMsg: (from: string, data: unknown) => void,
  ) {
    this.off.push(net.on('signal', (m: { from: string; data: { sdp?: RTCSessionDescriptionInit; ice?: RTCIceCandidateInit } }) => void this.signal(m.from, m.data)));
  }

  /** connect to everyone else; the lower user id makes the offer */
  connect(others: string[]): void {
    if (typeof RTCPeerConnection === 'undefined') return;
    for (const o of others) {
      if (o === this.me || this.peers.has(o)) continue;
      if (this.me < o) void this.offer(o);
    }
  }

  private make(other: string): Peer {
    let p = this.peers.get(other);
    if (p) return p;
    const pc = new RTCPeerConnection({ iceServers: ICE });
    p = { pc, dc: null, open: false };
    this.peers.set(other, p);
    pc.onicecandidate = (e) => {
      if (e.candidate) this.net.signal(other, { ice: e.candidate.toJSON() });
    };
    pc.ondatachannel = (e) => this.wire(other, e.channel);
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        const q = this.peers.get(other);
        if (q) q.open = false;
      }
    };
    return p;
  }

  private wire(other: string, dc: RTCDataChannel): void {
    const p = this.peers.get(other);
    if (!p) return;
    p.dc = dc;
    dc.onopen = () => (p.open = true);
    dc.onclose = () => (p.open = false);
    dc.onmessage = (e) => {
      try {
        this.onMsg(other, JSON.parse(String(e.data)));
      } catch {
        /* garbage */
      }
    };
  }

  private async offer(other: string): Promise<void> {
    const p = this.make(other);
    const dc = p.pc.createDataChannel('in', { ordered: false, maxRetransmits: 0 });
    this.wire(other, dc);
    const o = await p.pc.createOffer();
    await p.pc.setLocalDescription(o);
    this.net.signal(other, { sdp: p.pc.localDescription?.toJSON() });
  }

  private async signal(from: string, data: { sdp?: RTCSessionDescriptionInit; ice?: RTCIceCandidateInit }): Promise<void> {
    if (this.closed || typeof RTCPeerConnection === 'undefined') return;
    const p = this.make(from);
    try {
      if (data.sdp) {
        await p.pc.setRemoteDescription(data.sdp);
        if (data.sdp.type === 'offer') {
          const a = await p.pc.createAnswer();
          await p.pc.setLocalDescription(a);
          this.net.signal(from, { sdp: p.pc.localDescription?.toJSON() });
        }
      } else if (data.ice) {
        await p.pc.addIceCandidate(data.ice);
      }
    } catch {
      /* a stale or crossed signal; the relay still works */
    }
  }

  /** send to every peer with an open channel; returns how many got it */
  broadcast(msg: unknown): number {
    const s = JSON.stringify(msg);
    let n = 0;
    for (const p of this.peers.values()) {
      if (p.open && p.dc && p.dc.readyState === 'open') {
        try {
          p.dc.send(s);
          n++;
        } catch {
          p.open = false;
        }
      }
    }
    return n;
  }

  openCount(): number {
    let n = 0;
    for (const p of this.peers.values()) if (p.open) n++;
    return n;
  }

  close(): void {
    this.closed = true;
    for (const f of this.off) f();
    for (const p of this.peers.values()) {
      try {
        p.dc?.close();
        p.pc.close();
      } catch {
        /* ignore */
      }
    }
    this.peers.clear();
  }
}
