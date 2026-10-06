/* omarchy lemmings — procedural sound.
   No audio files: every effect is synthesised from oscillators and noise so
   the game stays a pure text drop. The context is only created after the
   first user gesture, which is what browsers require. */

"use strict";

const AUDIO = (function () {
  class Sound {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.muted = false;
      this.volume = 0.5;
      this.noise = null;
      this.last = {};
      this.musicTimer = 0;
      this.musicStep = 0;
    }

    /* must be called from a user gesture the first time */
    unlock() {
      if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 8;
      this.master.connect(comp).connect(this.ctx.destination);
      /* one shared noise buffer, reused by every percussive effect */
      const len = this.ctx.sampleRate * 0.6;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.startMusic();
    }

    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : this.volume;
    }

    startMusic() {
      if (this.musicTimer || !this.ctx) return;
      const notes = [110, 146.83, 164.81, 220, 164.81, 146.83, 123.47, 164.81];
      const tick = () => {
        if (!this.ctx || this.muted) return;
        const f = notes[this.musicStep++ % notes.length];
        this.tone("triangle", f, f * 1.01, 0.34, 0.018);
        if (this.musicStep % 4 === 0) this.tone("sine", f * 2, f * 2.01, 0.26, 0.012, 0.08);
      };
      tick();
      this.musicTimer = setInterval(tick, 420);
    }

    /* throttle so a crowd of lemmings does not machine-gun the mix */
    gate(name, ms) {
      const now = performance.now();
      if (this.last[name] && now - this.last[name] < ms) return false;
      this.last[name] = now;
      return true;
    }

    env(node, t0, a, d, peak) {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
      node.connect(g);
      g.connect(this.master);
      return g;
    }

    tone(type, f0, f1, dur, peak, delay) {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime + (delay || 0);
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t0);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
      this.env(o, t0, Math.min(0.02, dur * 0.3), dur, peak);
      o.start(t0);
      o.stop(t0 + dur + 0.06);
    }

    hit(dur, cutoff, peak, type, delay, sweep) {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime + (delay || 0);
      const s = this.ctx.createBufferSource();
      s.buffer = this.noise;
      const f = this.ctx.createBiquadFilter();
      f.type = type || "lowpass";
      f.frequency.setValueAtTime(cutoff, t0);
      if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, sweep), t0 + dur);
      s.connect(f);
      this.env(f, t0, 0.005, dur, peak);
      s.start(t0);
      s.stop(t0 + dur + 0.06);
    }

    /* ------------------------------------------------------------ events */
    play(name) {
      if (!this.ctx || this.muted) return;
      switch (name) {
        case "spawn":
          if (!this.gate("spawn", 120)) return;
          this.tone("triangle", 300, 640, 0.09, 0.16);
          break;
        case "walk":
          if (!this.gate("walk", 300)) return;
          this.hit(0.05, 900, 0.03, "bandpass");
          break;
        case "land":
          if (!this.gate("land", 90)) return;
          this.hit(0.09, 420, 0.14);
          this.tone("sine", 150, 80, 0.08, 0.08);
          break;
        case "bash":
          this.hit(0.12, 1400, 0.16, "lowpass", 0, 300);
          this.tone("square", 190, 110, 0.07, 0.06);
          break;
        case "dig":
          this.hit(0.14, 2600, 0.1, "bandpass", 0, 700);
          break;
        case "rm":
          this.hit(0.16, 700, 0.13, "lowpass", 0, 160);
          this.tone("triangle", 110, 60, 0.12, 0.05, 0.05);
          break;
        case "build":
          this.tone("square", 620 + Math.random() * 80, 480, 0.06, 0.07);
          this.hit(0.05, 2200, 0.05, "highpass");
          break;
        case "exit":
          this.tone("sine", 660, 990, 0.1, 0.12);
          this.tone("sine", 990, 1320, 0.12, 0.09, 0.08);
          break;
        case "splat":
          this.hit(0.22, 700, 0.2, "lowpass", 0, 90);
          this.tone("sawtooth", 220, 60, 0.18, 0.06);
          break;
        case "explode":
          this.hit(0.5, 1800, 0.32, "lowpass", 0, 60);
          this.tone("sawtooth", 120, 40, 0.4, 0.12);
          break;
        case "nuke":
          this.hit(0.7, 2400, 0.3, "lowpass", 0, 50);
          break;
        case "assign":
          this.tone("square", 880, 1200, 0.05, 0.07);
          break;
        case "turn":
          if (!this.gate("turn", 100)) return;
          this.tone("triangle", 180, 120, 0.045, 0.045);
          break;
        case "climb":
          if (!this.gate("climb", 120)) return;
          this.tone("triangle", 420, 520, 0.07, 0.055);
          break;
        case "fall":
          if (!this.gate("fall", 140)) return;
          this.tone("sine", 260, 120, 0.16, 0.045);
          break;
        case "block":
          this.tone("square", 120, 90, 0.11, 0.08);
          break;
        case "denied":
          if (!this.gate("denied", 160)) return;
          this.tone("square", 200, 120, 0.12, 0.08);
          break;
        case "click":
          this.tone("square", 520, 700, 0.04, 0.06);
          break;
        case "select":
          this.tone("triangle", 520, 780, 0.06, 0.08);
          break;
        case "win":
          [523, 659, 784, 1047].forEach((f, i) => this.tone("triangle", f, f, 0.22, 0.13, i * 0.11));
          break;
        case "lose":
          [392, 349, 294, 233].forEach((f, i) => this.tone("sawtooth", f, f * 0.98, 0.3, 0.1, i * 0.15));
          break;
      }
    }

    /* route engine events into effects */
    handle(ev) {
      switch (ev.t) {
        case "spawn": this.play("spawn"); break;
        case "land": this.play("land"); break;
        case "bash": this.play("bash"); break;
        case "dig": this.play("dig"); break;
        case "rm": this.play("rm"); break;
        case "build": this.play("build"); break;
        case "turn": this.play("turn"); break;
        case "climb": this.play("climb"); break;
        case "fall": this.play("fall"); break;
        case "block": this.play("block"); break;
        case "exit": this.play("exit"); break;
        case "splat": this.play("splat"); break;
        case "death": this.play("splat"); break;
        case "explode": case "nuke": this.play("explode"); break;
        case "win": this.play("win"); break;
        case "lose": this.play("lose"); break;
      }
    }
  }

  return { Sound };
})();

if (typeof module !== "undefined" && module.exports) module.exports = AUDIO;
if (typeof window !== "undefined") window.AUDIO = AUDIO;
