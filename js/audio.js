'use strict';

// Tiny synthesized sound effects (no audio files needed).
const SFX_DEFS = {
  hit:     { type: 'square',   f0: 220,  f1: 110,  dur: 0.05, vol: 0.025, throttle: 0.05 },
  pickup:  { type: 'sine',     f0: 880,  f1: 1320, dur: 0.06, vol: 0.035, throttle: 0.04 },
  gold:    { type: 'triangle', f0: 1200, f1: 1900, dur: 0.08, vol: 0.05,  throttle: 0.06 },
  levelup: { type: 'triangle', f0: 440,  f1: 1760, dur: 0.45, vol: 0.12,  throttle: 0.2 },
  hurt:    { type: 'sawtooth', f0: 220,  f1: 60,   dur: 0.2,  vol: 0.08,  throttle: 0.15 },
  boom:    { type: 'sawtooth', f0: 140,  f1: 30,   dur: 0.3,  vol: 0.09,  throttle: 0.09 },
  shoot:   { type: 'triangle', f0: 520,  f1: 280,  dur: 0.05, vol: 0.02,  throttle: 0.07 },
  zap:     { type: 'square',   f0: 1400, f1: 300,  dur: 0.08, vol: 0.03,  throttle: 0.08 },
  ult:     { type: 'square',   f0: 260,  f1: 980,  dur: 0.35, vol: 0.08,  throttle: 0.2 },
  flash:   { type: 'sine',     f0: 600,  f1: 1700, dur: 0.15, vol: 0.08,  throttle: 0.1 },
  boss:    { type: 'sawtooth', f0: 90,   f1: 40,   dur: 1.3,  vol: 0.15,  throttle: 1 },
  chest:   { type: 'triangle', f0: 660,  f1: 1320, dur: 0.6,  vol: 0.1,   throttle: 0.3 },
};

const Sfx = {
  ctx: null,
  muted: false,
  last: {},
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.ctx = null;
    }
  },
  toggle() {
    this.muted = !this.muted;
    return this.muted;
  },
  play(name) {
    if (this.muted || !this.ctx) return;
    const def = SFX_DEFS[name];
    if (!def) return;
    const now = this.ctx.currentTime;
    if (this.last[name] !== undefined && now - this.last[name] < def.throttle) return;
    this.last[name] = now;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = def.type;
    o.frequency.setValueAtTime(def.f0, now);
    o.frequency.exponentialRampToValueAtTime(def.f1, now + def.dur);
    g.gain.setValueAtTime(def.vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + def.dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(now);
    o.stop(now + def.dur + 0.02);
  },
};
