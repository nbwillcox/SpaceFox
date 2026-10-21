/* All sound is synthesized live with the Web Audio API - no audio files. */
(function (G) {
  'use strict';
  const S = G.settings;
  const A = { ctx: null, ready: false, sfx: {} };
  let master, sfxBus, musicBus, noiseBuf, voices = 0;
  const last = {};

  function gate(name, ms) {
    const now = performance.now();
    if (now - (last[name] || 0) < ms) return false;
    last[name] = now;
    return true;
  }

  A.init = function () {
    if (A.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { A.ctx = new AC(); } catch (e) { return; }
    const ctx = A.ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.18;
    master = ctx.createGain(); sfxBus = ctx.createGain(); musicBus = ctx.createGain();
    sfxBus.connect(master); musicBus.connect(master); master.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.applyVolumes();
    A.ready = true;
    initMusic();
  };
  A.resume = function () {
    A.init();
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
  };
  A.applyVolumes = function () {
    if (!A.ctx) return;
    master.gain.value = S.master;
    sfxBus.gain.value = S.sfx;
    musicBus.gain.value = S.music * 0.5;
  };

  /* ---------- primitives ---------- */
  function tone(o) {
    if (!A.ready || voices > 48) return;
    const ctx = A.ctx, t = o.at !== undefined ? o.at : ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1 && o.f1 !== o.f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol === undefined ? 0.2 : o.vol, t + (o.attack || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + o.dur + 0.03);
    voices++;
    osc.onended = () => { voices--; g.disconnect(); };
  }
  function noise(o) {
    if (!A.ready || voices > 48) return;
    const ctx = A.ctx, t = o.at !== undefined ? o.at : ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'lowpass';
    f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    if (o.q) f.Q.value = o.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol === undefined ? 0.3 : o.vol, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 1.5, o.dur + 0.05);
    voices++;
    src.onended = () => { voices--; g.disconnect(); };
  }

  const X = A.sfx;
  X.laser = (tier) => { if (gate('laser', 45)) { tone({ type: 'sawtooth', f0: 1500 + (tier || 0) * 150, f1: 300, dur: 0.1, vol: 0.06 }); tone({ type: 'square', f0: 900, f1: 200, dur: 0.07, vol: 0.035 }); } };
  X.charge = () => { tone({ type: 'sine', f0: 220, f1: 880, dur: 1.2, vol: 0.07 }); tone({ type: 'triangle', f0: 440, f1: 1760, dur: 1.2, vol: 0.04 }); };
  X.lock = (n) => { tone({ type: 'square', f0: 900 + (n || 0) * 140, dur: 0.07, vol: 0.08 }); tone({ type: 'triangle', f0: 1800 + (n || 0) * 200, dur: 0.05, vol: 0.05, delay: 0.04 }); };
  X.missile = () => { noise({ type: 'bandpass', f0: 2200, f1: 500, dur: 0.4, vol: 0.2, q: 1.2 }); tone({ type: 'sawtooth', f0: 700, f1: 200, dur: 0.3, vol: 0.1 }); };
  X.deflect = () => { tone({ type: 'square', f0: 1800, f1: 900, dur: 0.12, vol: 0.09 }); tone({ type: 'triangle', f0: 2600, f1: 1200, dur: 0.1, vol: 0.07 }); };
  X.bomb = () => { noise({ f0: 1400, f1: 40, dur: 1.4, vol: 0.55 }); tone({ type: 'sine', f0: 200, f1: 24, dur: 1.2, vol: 0.5 }); tone({ type: 'sawtooth', f0: 1600, f1: 80, dur: 0.7, vol: 0.12 }); };
  X.weaponUp = () => { tone({ type: 'triangle', f0: 260, f1: 1300, dur: 0.3, vol: 0.16 }); [659, 880, 1175, 1568].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.1, vol: 0.08, delay: 0.12 + i * 0.05 })); };
  X.bonus = (n) => { if (gate('bonus', 60)) tone({ type: 'square', f0: 700 + (n || 0) * 80, dur: 0.08, vol: 0.08 }); };
  X.hit = () => { if (gate('hit', 30)) tone({ type: 'square', f0: 380, f1: 200, dur: 0.04, vol: 0.06 }); };
  X.boom = (size) => {
    size = size || 1;
    noise({ f0: 3200, f1: 180, dur: 0.18 + size * 0.14, vol: 0.2 + size * 0.07 });
    tone({ type: 'square', f0: 360 - size * 50, f1: 45, dur: 0.2 + size * 0.12, vol: 0.12 });
    if (size > 1.5) tone({ type: 'sine', f0: 120, f1: 28, dur: 0.8, vol: 0.35 });
  };
  X.enemyShot = () => { if (gate('eshot', 70)) tone({ type: 'sawtooth', f0: 620, f1: 260, dur: 0.12, vol: 0.05 }); };
  X.damage = () => {
    noise({ f0: 2400, f1: 120, dur: 0.35, vol: 0.4 });
    tone({ type: 'sawtooth', f0: 220, f1: 60, dur: 0.35, vol: 0.18 });
  };
  X.crash = () => {
    noise({ f0: 1600, f1: 60, dur: 0.7, vol: 0.5 });
    tone({ type: 'sine', f0: 140, f1: 30, dur: 0.6, vol: 0.4 });
  };
  X.roll = () => { noise({ type: 'bandpass', f0: 600, f1: 3000, dur: 0.45, vol: 0.14, q: 0.8 }); tone({ type: 'triangle', f0: 300, f1: 900, dur: 0.4, vol: 0.06 }); };
  X.boost = () => { noise({ type: 'lowpass', f0: 400, f1: 2500, dur: 0.5, vol: 0.22 }); tone({ type: 'sawtooth', f0: 120, f1: 520, dur: 0.45, vol: 0.1 }); };
  X.brake = () => { noise({ type: 'lowpass', f0: 2000, f1: 200, dur: 0.4, vol: 0.14 }); };
  X.star = () => { if (gate('star', 30)) { tone({ type: 'square', f0: 988, dur: 0.06, vol: 0.07 }); tone({ type: 'square', f0: 1319, dur: 0.12, vol: 0.07, delay: 0.06 }); } };
  X.pickup = () => { [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.09, vol: 0.09, delay: i * 0.05 })); };
  X.shield = () => { tone({ type: 'sine', f0: 380, f1: 1000, dur: 0.3, vol: 0.2 }); tone({ type: 'triangle', f0: 760, f1: 1500, dur: 0.3, vol: 0.1 }); };
  X.warning = () => { for (let i = 0; i < 3; i++) tone({ type: 'sawtooth', f0: i % 2 ? 420 : 640, dur: 0.2, vol: 0.1, delay: i * 0.22 }); };
  X.lowShield = () => { if (gate('low', 700)) tone({ type: 'square', f0: 880, dur: 0.1, vol: 0.07 }); };
  X.death = () => {
    noise({ f0: 4200, f1: 60, dur: 1.4, vol: 0.5 });
    tone({ type: 'sawtooth', f0: 600, f1: 36, dur: 1.2, vol: 0.2 });
  };
  X.respawn = () => { [262, 392, 523, 784].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.14, vol: 0.1, delay: i * 0.08 })); };
  X.stageClear = () => {
    [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.14, vol: 0.1, delay: i * 0.11 }));
    tone({ type: 'triangle', f0: 262, dur: 1.2, vol: 0.14 });
  };
  X.gameOver = () => { [440, 392, 349, 330, 294, 262, 220].forEach((f, i) => tone({ type: 'sawtooth', f0: f, f1: f * 0.97, dur: 0.22, vol: 0.12, delay: i * 0.18 })); };
  X.extraLife = () => { [659, 784, 988, 1319, 988, 1319, 1568].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.12, vol: 0.1, delay: i * 0.09 })); };
  X.blip = () => tone({ type: 'square', f0: 700, f1: 800, dur: 0.04, vol: 0.07 });
  X.select = () => { tone({ type: 'square', f0: 500, dur: 0.06, vol: 0.08 }); tone({ type: 'square', f0: 900, dur: 0.1, vol: 0.08, delay: 0.06 }); };
  X.start = () => { [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.1, vol: 0.09, delay: i * 0.06 })); };
  X.ready = () => { [392, 523, 659].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.14, vol: 0.1, delay: i * 0.1 })); };

  /* engine hum: one looping oscillator pair whose pitch and level follow the rail speed */
  let eng = null;
  A.engine = function (speed, on) {
    if (!A.ready) return;
    const ctx = A.ctx;
    if (!eng) {
      eng = { o1: ctx.createOscillator(), o2: ctx.createOscillator(), g: ctx.createGain(), f: ctx.createBiquadFilter() };
      eng.o1.type = 'sawtooth'; eng.o2.type = 'square'; eng.f.type = 'lowpass'; eng.f.frequency.value = 400; eng.g.gain.value = 0;
      eng.o1.connect(eng.f); eng.o2.connect(eng.f); eng.f.connect(eng.g); eng.g.connect(sfxBus);
      eng.o1.start(); eng.o2.start();
    }
    const t = ctx.currentTime;
    eng.o1.frequency.setTargetAtTime(48 + speed * 38, t, 0.1);
    eng.o2.frequency.setTargetAtTime(50 + speed * 38, t, 0.1);
    eng.f.frequency.setTargetAtTime(260 + speed * 380, t, 0.1);
    eng.g.gain.setTargetAtTime(on ? 0.035 + speed * 0.02 : 0, t, 0.15);
  };

  /* ---------- music: a driving 4-bar loop ---------- */
  const M = { on: false, step: 0, next: 0, tempo: 132, mode: 'play', timer: 0, key: 0 };
  const L = {};
  const PROG = [0, 0, -4, -2];
  const BASS = [0, -1, 0, 0, -1, 12, -1, 0, 0, -1, 0, 7, -1, 5, -1, 3];
  const ARP = [0, 7, 12, 7, 15, 12, 7, 12, 0, 7, 12, 7, 14, 12, 7, 10];
  const LEAD = [12, -1, -1, 15, -1, 14, 12, -1, 10, -1, -1, 12, -1, 15, -1, 19];
  function initMusic() { ['bass', 'arp', 'drums', 'lead'].forEach((k) => { L[k] = A.ctx.createGain(); L[k].gain.value = 1; L[k].connect(musicBus); }); }
  const freq = (root, semis) => root * Math.pow(2, semis / 12);
  function schedStep(t, s) {
    const bar = (s >> 4) & 3, st = s & 15, root = freq(55, PROG[bar] + 4 + M.key), sx = 60 / M.tempo / 4;
    const play = M.mode === 'play';
    if (BASS[st] >= 0) tone({ type: 'sawtooth', f0: freq(root, BASS[st]), dur: sx * 1.7, vol: 0.14, bus: L.bass, at: t });
    if (play || st % 2 === 0) tone({ type: 'square', f0: freq(root * 4, ARP[st]), dur: sx * 0.85, vol: play ? 0.05 : 0.04, bus: L.arp, at: t });
    if (play && LEAD[st] >= 0) tone({ type: 'triangle', f0: freq(root * 4, LEAD[st]), dur: sx * 2, vol: 0.09, bus: L.lead, attack: 0.01, at: t });
    if (st % 4 === 0) tone({ type: 'sine', f0: 170, f1: 40, dur: 0.14, vol: 0.5, bus: L.drums, at: t });
    if (st === 4 || st === 12) noise({ type: 'highpass', f0: 1800, dur: 0.12, vol: 0.17, bus: L.drums, at: t });
    if (st % 2 === 0) noise({ type: 'highpass', f0: 7500, dur: st % 4 === 2 ? 0.08 : 0.03, vol: 0.06, bus: L.drums, at: t });
  }
  function scheduler() {
    if (!M.on || !A.ready) return;
    const ctx = A.ctx;
    if (ctx.state !== 'running') return;
    if (M.next < ctx.currentTime - 0.25) M.next = ctx.currentTime + 0.05;
    while (M.next < ctx.currentTime + 0.14) {
      schedStep(M.next, M.step);
      M.next += 60 / M.tempo / 4;
      M.step = (M.step + 1) & 63;
    }
  }
  /** mode: 'off' | 'title' | 'play'; key shifts the tune per stage */
  A.music = function (mode, key) {
    if (!A.ready) return;
    if (mode === 'off') { M.on = false; return; }
    M.mode = mode; M.key = key || 0;
    M.tempo = mode === 'title' ? 108 : 132;
    if (!M.on) {
      M.on = true; M.step = 0; M.next = A.ctx.currentTime + 0.08;
      if (!M.timer) M.timer = setInterval(scheduler, 30);
    }
  };

  G.audio = A;
})((window.SGS = window.SGS || {}));
