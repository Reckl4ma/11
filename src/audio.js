export class AudioSystem {
  constructor(level) {
    this.level = level;
    this.ctx = null;
    this.master = null;
    this.started = false;
    this.startTime = 0;
    this.nextBeat = 0;
    this.beatLength = 60 / level.bpm;
    this.listeners = [];
    this.volume = 0.75;
  }

  async ensureStart() {
    if (this.started) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this.startTime = this.ctx.currentTime + 0.04;
    this.nextBeat = this.startTime;
    this.started = true;
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  onBeat(fn) {
    this.listeners.push(fn);
  }

  update(songTime) {
    if (!this.started || !this.ctx) return;
    const now = this.ctx.currentTime;
    while (this.nextBeat < now + 0.12) {
      const beatIndex = Math.floor((this.nextBeat - this.startTime) / this.beatLength);
      this.scheduleBeat(this.nextBeat, beatIndex);
      this.nextBeat += this.beatLength;
    }
    return Math.floor(songTime / this.beatLength);
  }

  scheduleBeat(t, idx) {
    const step = idx % 16;
    if (step % 4 === 0) this.kick(t);
    if (step === 4 || step === 12) this.snare(t);
    this.hihat(t + 0.01);
    this.bass(t, [52, 55, 47, 50][Math.floor((idx % 32) / 8)]);
    if (step % 2 === 0) this.lead(t + 0.02, 64 + ((idx * 3) % 7));
    for (const l of this.listeners) l(idx, t);
  }

  osc(freq, type, t, len, gain = 0.2) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + len + 0.02);
  }

  noise(t, len, gain = 0.07) {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1600;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + len + 0.02);
  }

  kick(t) {
    this.osc(110, 'sine', t, 0.14, 0.26);
    this.osc(55, 'triangle', t, 0.18, 0.1);
  }

  snare(t) {
    this.noise(t, 0.11, 0.12);
    this.osc(190, 'triangle', t, 0.06, 0.05);
  }

  hihat(t) {
    this.noise(t, 0.04, 0.03);
  }

  bass(t, midi) {
    const freq = 440 * 2 ** ((midi - 69) / 12);
    this.osc(freq, 'square', t, 0.19, 0.08);
  }

  lead(t, midi) {
    const freq = 440 * 2 ** ((midi - 69) / 12);
    this.osc(freq, 'sawtooth', t, 0.12, 0.05);
  }

  sfx(kind) {
    if (!this.started || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (kind === 'coffee') {
      this.osc(880, 'square', t, 0.05, 0.1);
      this.osc(1120, 'triangle', t + 0.03, 0.08, 0.08);
    } else if (kind === 'death') {
      this.osc(180, 'sawtooth', t, 0.3, 0.18);
      this.osc(90, 'square', t + 0.07, 0.28, 0.12);
    } else if (kind === 'portal') {
      this.osc(420, 'sine', t, 0.08, 0.14);
      this.osc(660, 'sine', t + 0.04, 0.1, 0.12);
    } else if (kind === 'urgent') {
      this.osc(1200, 'square', t, 0.08, 0.12);
    } else if (kind === 'cookie') {
      this.osc(420, 'triangle', t, 0.07, 0.1);
    }
  }
}
