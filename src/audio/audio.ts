// All the sound: synthesized effects (no audio files), a little step sequencer for each stage's theme (original
// tunes), crowd noise, and an optional announcer using the browser's speech synthesis.
import { FIGHTERS, STAGES } from '../sim/data';
import type { Ev, State } from '../sim/types';

type Vol = { master: number; sfx: number; music: number; voice: boolean };

function loadVol(): Vol {
  try {
    const v = JSON.parse(localStorage.getItem('syb.audio') || 'null');
    if (v) return { master: 0.8, sfx: 0.9, music: 0.55, voice: true, ...v };
  } catch {
    /* private mode */
  }
  return { master: 0.8, sfx: 0.9, music: 0.55, voice: true };
}

class Audio {
  ctx: AudioContext | null = null;
  out!: GainNode;
  sfxBus!: GainNode;
  musicBus!: GainNode;
  noise!: AudioBuffer;
  vol: Vol = loadVol();
  private seqTimer = 0;
  private seqStep = 0;
  private seqNext = 0;
  private song: Song | null = null;
  private crowd: { src: AudioBufferSourceNode; g: GainNode } | null = null;

  /** call from a user gesture */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.out = this.ctx.createGain();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.out.connect(comp).connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus.connect(this.out);
    this.musicBus.connect(this.out);
    this.applyVol();
    const len = this.ctx.sampleRate * 1.5;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setVol(v: Partial<Vol>): void {
    this.vol = { ...this.vol, ...v };
    try {
      localStorage.setItem('syb.audio', JSON.stringify(this.vol));
    } catch {
      /* ignore */
    }
    this.applyVol();
  }

  private applyVol(): void {
    if (!this.ctx) return;
    this.out.gain.value = this.vol.master;
    this.sfxBus.gain.value = this.vol.sfx;
    this.musicBus.gain.value = this.vol.music * 0.5;
  }

  // ------------------------------------------------------------------ primitives

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, when = 0, bus?: GainNode): void {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus ?? this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private burst(dur: number, vol: number, freq: number, q = 1, type: BiquadFilterType = 'bandpass', when = 0, bus?: GainNode): void {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + when;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(bus ?? this.sfxBus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  // ------------------------------------------------------------------ sound effects

  sfx(name: string, power = 1): void {
    if (!this.ctx) return;
    const p = Math.min(2.5, power);
    switch (name) {
      case 'hit':
        this.burst(0.12 + p * 0.05, 0.5 * p, 1800 - p * 400, 0.8);
        this.tone(180 + Math.random() * 40, 0.12, 'square', 0.18 * p, 0.4);
        break;
      case 'smash':
        this.burst(0.35, 0.9, 700, 0.7);
        this.tone(90, 0.4, 'sawtooth', 0.4, 0.3);
        this.tone(55, 0.5, 'sine', 0.7, 0.5);
        break;
      case 'slash':
        this.burst(0.15, 0.5 * p, 4200, 2, 'highpass');
        this.tone(900, 0.1, 'triangle', 0.15, 0.5);
        break;
      case 'fire':
        this.burst(0.3, 0.5 * p, 900, 0.5, 'lowpass');
        break;
      case 'elec':
        for (let i = 0; i < 4; i++) this.tone(600 + Math.random() * 900, 0.05, 'square', 0.12, 1.4, i * 0.03);
        this.burst(0.15, 0.3, 3000, 3);
        break;
      case 'magic':
        this.tone(880, 0.25, 'sine', 0.25, 1.8);
        this.tone(1320, 0.2, 'triangle', 0.15, 0.6, 0.03);
        break;
      case 'shield':
        this.tone(520, 0.12, 'triangle', 0.25, 0.7);
        this.burst(0.08, 0.2, 2500, 2);
        break;
      case 'parry':
        this.tone(1568, 0.4, 'sine', 0.4);
        this.tone(2349, 0.35, 'sine', 0.25, 1, 0.04);
        break;
      case 'jump':
        this.tone(320, 0.12, 'square', 0.08, 1.8);
        break;
      case 'djump':
        this.tone(420, 0.14, 'square', 0.08, 2);
        break;
      case 'land':
        this.burst(0.06, 0.25, 400, 0.8, 'lowpass');
        break;
      case 'dash':
        this.burst(0.09, 0.18, 1800, 0.8);
        break;
      case 'whiff':
        this.burst(0.1, 0.12, 2400, 1.5);
        break;
      case 'ko':
        this.tone(60, 1.1, 'sine', 0.9, 0.4);
        this.burst(1.0, 0.8, 500, 0.4, 'lowpass');
        this.tone(1200, 0.6, 'sawtooth', 0.12, 0.2, 0.05);
        this.cheer(1);
        break;
      case 'ultimate':
        for (let i = 0; i < 6; i++) this.tone(262 * Math.pow(2, i / 4), 0.3, 'sawtooth', 0.12, 1, i * 0.06);
        this.burst(0.8, 0.4, 900, 0.5, 'lowpass', 0.3);
        break;
      case 'boom':
        this.tone(70, 0.8, 'sine', 0.8, 0.3);
        this.burst(0.7, 0.9, 400, 0.4, 'lowpass');
        break;
      case 'grab':
        this.tone(220, 0.08, 'square', 0.15, 1.2);
        break;
      case 'throw':
        this.burst(0.2, 0.3, 1200, 1);
        break;
      case 'tech':
        this.tone(1000, 0.08, 'square', 0.12);
        this.tone(1500, 0.08, 'square', 0.1, 1, 0.06);
        break;
      case 'ledge':
        this.tone(300, 0.06, 'triangle', 0.15, 1.5);
        break;
      case 'item':
        this.tone(660, 0.08, 'square', 0.12);
        this.tone(990, 0.1, 'square', 0.12, 1, 0.07);
        break;
      case 'eat':
        for (let i = 0; i < 3; i++) this.tone(500 + i * 120, 0.06, 'square', 0.1, 1, i * 0.08);
        break;
      case 'zap':
        this.tone(1400, 0.15, 'sawtooth', 0.12, 0.3);
        break;
      case 'jet':
        this.burst(0.35, 0.35, 700, 0.6, 'lowpass');
        break;
      case 'thud':
        this.tone(80, 0.25, 'sine', 0.6, 0.5);
        this.burst(0.2, 0.4, 300, 0.6, 'lowpass');
        break;
      case 'count':
        this.tone(660, 0.2, 'square', 0.18);
        break;
      case 'go':
        this.tone(990, 0.4, 'square', 0.2);
        this.tone(1320, 0.4, 'square', 0.12, 1, 0.02);
        this.cheer(0.8);
        break;
      case 'menu':
        this.tone(880, 0.05, 'square', 0.08);
        break;
      case 'select':
        this.tone(660, 0.06, 'square', 0.1);
        this.tone(1320, 0.1, 'square', 0.1, 1, 0.05);
        break;
      case 'back':
        this.tone(440, 0.08, 'square', 0.08, 0.6);
        break;
      case 'note':
        this.tone([523, 659, 784, 1046][Math.floor(Math.random() * 4)], 0.18, 'triangle', 0.18);
        break;
      case 'boing':
        this.tone(200, 0.3, 'sine', 0.3, 3);
        break;
      case 'clank':
        this.tone(1800, 0.12, 'square', 0.12, 0.8);
        break;
    }
  }

  cheer(amount: number): void {
    if (!this.ctx) return;
    // a crowd swell: filtered noise with a hump
    const c = this.ctx;
    const t = c.currentTime;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1100;
    f.Q.value = 0.6;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25 * amount, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    s.connect(f).connect(g).connect(this.sfxBus);
    s.start(t);
    s.stop(t + 2.4);
  }

  /** map simulation events to sounds */
  event(e: Ev, st: State): void {
    switch (e.t) {
      case 'hit': {
        const kb = e.b ?? 0;
        if (kb > 110) this.sfx('smash');
        const fx = e.s ?? 'hit';
        if (fx === 'slash') this.sfx('slash', (e.a ?? 5) / 8);
        else if (fx === 'fire') this.sfx('fire', (e.a ?? 5) / 8);
        else if (fx === 'elec') this.sfx('elec');
        else if (fx === 'magic' || fx === 'time' || fx === 'grav') this.sfx('magic');
        else if (fx === 'note' || fx === 'sound') this.sfx('note');
        this.sfx('hit', 0.5 + (e.a ?? 5) / 12);
        break;
      }
      case 'shield':
        this.sfx('shield');
        break;
      case 'parry':
        this.sfx('parry');
        break;
      case 'counter':
        this.sfx('parry');
        break;
      case 'jump':
        this.sfx('jump');
        break;
      case 'djump':
        this.sfx('djump');
        break;
      case 'land':
        if ((e.a ?? 0) > 6) this.sfx('land');
        break;
      case 'dash':
        this.sfx('dash');
        break;
      case 'ko':
        this.sfx('ko');
        break;
      case 'boom':
        this.sfx('boom');
        break;
      case 'ult':
        this.sfx('ultimate');
        this.say(`${FIGHTERS.find((f) => f.def.id === e.s)?.def.name ?? ''}!`, 1.1);
        break;
      case 'grab':
        this.sfx('grab');
        break;
      case 'throw':
      case 'throwitem':
        this.sfx('throw');
        break;
      case 'tech':
        this.sfx('tech');
        break;
      case 'ledge':
        this.sfx('ledge');
        break;
      case 'pickup':
      case 'buff':
      case 'itemspawn':
        this.sfx('item');
        break;
      case 'eat':
        this.sfx('eat');
        break;
      case 'sfx':
        this.sfx(e.s ?? 'hit');
        break;
      case 'count':
        this.sfx('count');
        this.say(['', 'one', 'two', 'three'][Math.round(e.a ?? 0)] ?? '', 1);
        break;
      case 'go':
        this.sfx('go');
        this.say('Go!', 1.2);
        break;
      case 'game':
        this.sfx('boom');
        this.cheer(1.2);
        this.say('Game!', 1);
        break;
      case 'finalhit':
        this.tone(40, 1.5, 'sine', 0.7, 0.5);
        break;
      case 'boing':
        this.sfx('boing');
        break;
      case 'clank':
        this.sfx('clank');
        break;
      case 'sudden':
        this.say('Sudden death!', 1);
        break;
      case 'audience':
        this.cheer(1);
        break;
      case 'onbeat':
        this.sfx('note');
        break;
      case 'taunt':
        this.cheer(0.3);
        break;
    }
    void st;
  }

  say(text: string, rate = 1): void {
    if (!this.vol.voice || !text || typeof speechSynthesis === 'undefined') return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      u.pitch = 0.6;
      u.volume = Math.min(1, this.vol.master);
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {
      /* no voices */
    }
  }

  // ------------------------------------------------------------------ music

  music(st: State): void {
    this.stopMusic();
    if (!this.ctx) return;
    const id = STAGES[st.stage].music;
    this.song = SONGS[id] ?? SONGS.studio;
    this.playSong();
  }

  menuMusic(): void {
    if (!this.ctx || this.song === SONGS.menu) return;
    this.stopMusic();
    this.song = SONGS.menu;
    this.playSong();
  }

  private playSong(): void {
    if (!this.ctx || !this.song) return;
    this.seqStep = 0;
    this.seqNext = this.ctx.currentTime + 0.1;
    const tick = (): void => {
      if (!this.ctx || !this.song) return;
      const spb = 60 / this.song.bpm / 4; // 16th notes
      while (this.seqNext < this.ctx.currentTime + 0.15) {
        this.playStep(this.song, this.seqStep, this.seqNext - this.ctx.currentTime);
        this.seqStep++;
        this.seqNext += spb;
      }
    };
    this.seqTimer = window.setInterval(tick, 40);
    tick();
  }

  stopMusic(): void {
    clearInterval(this.seqTimer);
    this.seqTimer = 0;
    this.song = null;
  }

  private playStep(s: Song, step: number, when: number): void {
    const bar = Math.floor(step / 16) % s.chords.length;
    const i = step % 16;
    const chord = s.chords[bar];
    const root = chord[0];
    const mb = this.musicBus;
    const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
    // drums
    if (s.kick[i] === 'x') {
      this.tone(120, 0.18, 'sine', 0.9, 0.3, when, mb);
    }
    if (s.snare[i] === 'x') this.burst(0.14, 0.45, 1800, 0.8, 'bandpass', when, mb);
    if (s.hat[i] === 'x') this.burst(0.04, 0.18, 8000, 1, 'highpass', when, mb);
    // bass
    const bn = s.bass[i];
    if (bn !== '.') {
      const off = bn === 'o' ? 12 : bn === '5' ? 7 : 0;
      this.tone(mtof(root - 24 + off), 0.18, 'triangle', 0.5, 1, when, mb);
    }
    // chord stabs
    if (s.stab[i] === 'x') for (const n of chord) this.tone(mtof(n), 0.2, 'square', 0.06, 1, when, mb);
    // lead arpeggio / melody
    const ln = s.lead[(step % (s.lead.length))];
    if (ln >= 0) {
      const n = chord[ln % chord.length] + 12 * (1 + Math.floor(ln / chord.length));
      this.tone(mtof(n), 0.16, s.leadWave, 0.09, 1, when, mb);
    }
  }
}

interface Song {
  bpm: number;
  chords: number[][];
  kick: string;
  snare: string;
  hat: string;
  bass: string;
  stab: string;
  /** chord-tone indices per 16th (-1 = rest); loops over its own length */
  lead: number[];
  leadWave: OscillatorType;
}

// Original tunes: chord progressions and patterns written for this game.
const SONGS: Record<string, Song> = {
  studio: {
    bpm: 138,
    chords: [
      [60, 64, 67, 71],
      [57, 60, 64, 67],
      [62, 65, 69, 72],
      [55, 59, 62, 65],
    ],
    kick: 'x...x...x...x...',
    snare: '....x.......x...',
    hat: 'x.x.x.x.x.x.x.xx',
    bass: 'x.xo..x.x.xo..5.',
    stab: '..x...x...x..x..',
    lead: [0, -1, 2, -1, 1, 3, -1, 2, 4, -1, 3, -1, 2, 1, 0, -1, 0, 2, 4, 6, 5, -1, 4, -1, 2, -1, 3, 2, 1, -1, 0, -1],
    leadWave: 'square',
  },
  rooftops: {
    bpm: 124,
    chords: [
      [57, 60, 64, 67],
      [53, 57, 60, 64],
      [55, 59, 62, 65],
      [52, 55, 59, 62],
    ],
    kick: 'x.....x...x.....',
    snare: '....x.......x..x',
    hat: '..x...x...x...x.',
    bass: 'x..x..x.o..x..5.',
    stab: 'x.......x.......',
    lead: [2, -1, -1, 3, -1, 2, -1, 0, -1, -1, 1, -1, 2, -1, -1, -1, 4, -1, 3, -1, 2, -1, 1, -1, 0, -1, -1, -1, 2, 1, 0, -1],
    leadWave: 'sawtooth',
  },
  galleon: {
    bpm: 112,
    chords: [
      [62, 66, 69],
      [67, 71, 74],
      [69, 73, 76],
      [62, 66, 69],
      [59, 62, 66],
      [67, 71, 74],
      [69, 73, 76],
      [69, 73, 76],
    ],
    kick: 'x.....x.....x...',
    snare: '......x.......x.',
    hat: 'x..x..x..x..x..x',
    bass: 'x.....5.....o...',
    stab: '...x..x....x..x.',
    lead: [0, -1, 1, 2, -1, 1, 0, -1, 2, -1, 3, -1, 4, 3, 2, -1],
    leadWave: 'triangle',
  },
  orbit: {
    bpm: 128,
    chords: [
      [60, 63, 67, 70],
      [56, 60, 63, 67],
      [58, 62, 65, 68],
      [55, 58, 62, 65],
    ],
    kick: 'x...x...x...x.x.',
    snare: '....x.......x...',
    hat: '.xxx.xxx.xxx.xxx',
    bass: 'xxo.xxo.xxo.xx5.',
    stab: '................',
    lead: [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 6, 4, 2, 0, -1],
    leadWave: 'sine',
  },
  menu: {
    bpm: 116,
    chords: [
      [64, 67, 71],
      [60, 64, 67],
      [62, 65, 69],
      [67, 71, 74],
    ],
    kick: 'x.......x.......',
    snare: '....x.......x...',
    hat: '..x...x...x...x.',
    bass: 'x...5...x...o...',
    stab: 'x.....x.....x...',
    lead: [0, -1, -1, 1, -1, -1, 2, -1, 3, -1, 2, -1, 1, -1, -1, -1],
    leadWave: 'triangle',
  },
};

export const audio = new Audio();
