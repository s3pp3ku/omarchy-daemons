/* Omarchy Daemons — procedural audio.
   Original dark/minimal synth loop + small synthesised effects.
   No audio files. The context starts on the first user gesture. */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

OL.Audio = (function () {
  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let muted = false, musicOn = true;
  const last = {};
  try { muted = localStorage.getItem("ol.muted") === "1"; musicOn = localStorage.getItem("ol.music") !== "0"; } catch (e) {}

  function unlock() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 6;
    master.connect(comp).connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.32 : 0; musicBus.connect(master);
    const len = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
  }

  function tone(type, f0, f1, dur, vol, when, bus) {
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, freq, q, vol, when, bus, type) {
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || "bandpass"; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(bus || sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  /* throttle so a crowd doesn't machine-gun the mix */
  function ok(name, ms) {
    const now = performance.now();
    if (last[name] && now - last[name] < ms) return false;
    last[name] = now; return true;
  }

  const SFX = {
    select: () => tone("square", 880, 880, 0.04, 0.05),
    assign: () => { tone("square", 660, 990, 0.06, 0.08); tone("sine", 1320, 1320, 0.05, 0.04, 0.03); },
    deny: () => tone("square", 200, 160, 0.08, 0.06),
    spawn: () => ok("spawn", 120) && tone("triangle", 330, 220, 0.12, 0.06),
    door: () => { noise(0.25, 300, 2, 0.2); tone("sawtooth", 90, 60, 0.3, 0.06); },
    brick: () => ok("brick", 60) && tone("triangle", 520, 420, 0.05, 0.07),
    dig: () => ok("dig", 90) && noise(0.07, 700, 1.5, 0.18),
    bash: () => ok("bash", 90) && noise(0.06, 1200, 2, 0.16),
    mine: () => ok("mine", 120) && (noise(0.06, 1800, 3, 0.16), tone("square", 1400, 1200, 0.03, 0.03)),
    clink: () => { tone("square", 1800, 1700, 0.05, 0.05); tone("square", 2400, 2300, 0.05, 0.03, 0.02); },
    shrug: () => { tone("triangle", 400, 300, 0.08, 0.06); tone("triangle", 300, 260, 0.1, 0.06, 0.09); },
    land: () => {},
    splat: () => ok("splat", 80) && (noise(0.18, 400, 1, 0.3), tone("sine", 140, 60, 0.18, 0.12)),
    drown: () => ok("drown", 80) && (tone("sine", 600, 200, 0.25, 0.08), noise(0.25, 2000, 1, 0.08)),
    burn: () => ok("burn", 80) && noise(0.4, 900, 0.7, 0.2),
    boom: () => { noise(0.6, 180, 0.6, 0.6, 0, null, "lowpass"); tone("sine", 110, 35, 0.5, 0.3); },
    exit: () => ok("exit", 70) && (tone("sine", 880, 880, 0.08, 0.07), tone("sine", 1320, 1320, 0.1, 0.06, 0.06)),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone("triangle", f, f, 0.2, 0.09, i * 0.11)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone("triangle", f, f * 0.98, 0.22, 0.08, i * 0.14)),
    nuke: () => { tone("sawtooth", 200, 800, 0.6, 0.06); },
  };

  function play(name) { if (!ctx || muted) return; const f = SFX[name]; if (f) f(); }

  /* ---- music: 4-bar A-minor loop, scheduled ahead of time ---- */
  const BPM = 96, STEP = 60 / BPM / 4;
  const BASS = [45, 45, 57, 45, 48, 48, 60, 48, 43, 43, 55, 43, 40, 40, 52, 47];       // A C G E
  const ARP = [69, 72, 76, 72, 67, 72, 76, 79, 67, 71, 74, 71, 64, 67, 71, 74];
  const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);
  let nextT = 0, stepI = 0, timer = 0;
  function startMusic() {
    if (timer) return;
    nextT = ctx.currentTime + 0.2;
    timer = setInterval(schedule, 50);
  }
  function schedule() {
    if (!ctx || muted || !musicOn) { if (ctx) nextT = ctx.currentTime + 0.1; return; }
    while (nextT < ctx.currentTime + 0.3) {
      const s = stepI % 64, bar = Math.floor(s / 16), b = s % 16;
      const when = nextT - ctx.currentTime;
      if (b % 4 === 0) tone("sawtooth", mtof(BASS[bar * 4 + (b >> 2)] - 12), mtof(BASS[bar * 4 + (b >> 2)] - 12), STEP * 3.6, 0.09, when, musicBus);
      if (b % 2 === 0) tone("triangle", mtof(ARP[(bar * 4 + (b >> 1)) % 16]), mtof(ARP[(bar * 4 + (b >> 1)) % 16]), STEP * 1.6, 0.05, when, musicBus);
      if (b % 4 === 2) noise(0.03, 8000, 1, 0.05, when, musicBus, "highpass");
      if (b === 0 || b === 8) noise(0.12, 120, 1, 0.12, when, musicBus, "lowpass");
      nextT += STEP; stepI++;
    }
  }

  return {
    unlock, play,
    get muted() { return muted; },
    get music() { return musicOn; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.55;
      try { localStorage.setItem("ol.muted", muted ? "1" : "0"); } catch (e) {}
      return muted;
    },
    toggleMusic() {
      musicOn = !musicOn;
      if (musicBus) musicBus.gain.value = musicOn ? 0.32 : 0;
      try { localStorage.setItem("ol.music", musicOn ? "1" : "0"); } catch (e) {}
      return musicOn;
    },
  };
})();
