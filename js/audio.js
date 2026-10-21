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
  X.armor = () => { if (gate('armor', 50)) { tone({ type: 'square', f0: 1500, f1: 1200, dur: 0.04, vol: 0.05 }); tone({ type: 'triangle', f0: 260, f1: 200, dur: 0.05, vol: 0.07 }); } };
  /* babble voices: one short blip per typed letter, pitch wobbling with the letter */
  X.babble = (who, ch) => {
    if (!gate('babble', 38)) return;
    const n = ch.toLowerCase().charCodeAt(0) % 9;
    if (who === 'moss') { const f = 150 + n * 22; tone({ type: 'sawtooth', f0: f * 1.25, f1: f * 0.8, dur: 0.07, vol: 0.05 }); tone({ type: 'square', f0: f * 2.1, f1: f * 1.4, dur: 0.04, vol: 0.02 }); }
    else if (who === 'vale') { const f = 330 + n * 28; tone({ type: 'triangle', f0: f, f1: f * 1.06, dur: 0.07, vol: 0.07 }); }
    else { const f = 260 + n * 30; tone({ type: 'square', f0: f, f1: f * 0.9, dur: 0.06, vol: 0.04 }); }
  };
  X.rescue = () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.14, vol: 0.12, delay: i * 0.07 })); tone({ type: 'square', f0: 262, dur: 0.5, vol: 0.06, delay: 0.1 }); };
  X.wingLost = () => { tone({ type: 'sawtooth', f0: 660, f1: 90, dur: 0.9, vol: 0.14 }); noise({ f0: 2600, f1: 120, dur: 0.6, vol: 0.3 }); };
  X.bossIn = () => { noise({ f0: 900, f1: 60, dur: 1.4, vol: 0.4 }); tone({ type: 'sawtooth', f0: 110, f1: 55, dur: 1.4, vol: 0.2 }); for (let i = 0; i < 4; i++) tone({ type: 'square', f0: i % 2 ? 330 : 440, dur: 0.18, vol: 0.09, delay: 0.5 + i * 0.22 }); };
  X.ring = (n) => { tone({ type: 'triangle', f0: 880 * Math.pow(2, Math.min(n || 0, 7) / 12), dur: 0.14, vol: 0.1 }); tone({ type: 'square', f0: 1760 * Math.pow(2, Math.min(n || 0, 7) / 12), dur: 0.1, vol: 0.05, delay: 0.05 }); };
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

  /* ---------- music: eight styles, one per kind of stage ---------- */
  const R = -1;
  const STYLES = {
    canyon: { tempo: 132, root: 4, prog: [0, 0, -4, -2], bass: [0, R, 0, 0, R, 12, R, 0, 0, R, 0, 7, R, 5, R, 3], arp: [0, 7, 12, 7, 15, 12, 7, 12, 0, 7, 12, 7, 14, 12, 7, 10], lead: [12, R, R, 15, R, 14, 12, R, 10, R, R, 12, R, 15, R, 19], bw: 'sawtooth', aw: 'square', lw: 'triangle', arpEvery: 1, snare: [4, 12], hat: 2, kick: 4 },
    water: { tempo: 112, root: 5, prog: [0, -5, -3, -7], bass: [0, R, R, R, R, R, 0, R, 7, R, R, R, 5, R, R, R], arp: [0, 4, 7, 11, 12, 11, 7, 4, 0, 4, 7, 11, 14, 11, 7, 4], lead: [19, R, R, R, 16, R, R, R, 14, R, R, 16, 12, R, R, R], bw: 'sine', aw: 'triangle', lw: 'triangle', arpEvery: 1, snare: [12], hat: 4, kick: 8, soft: true },
    foundry: { tempo: 120, root: 2, prog: [0, 0, 3, 1], bass: [0, 0, R, 0, 0, R, 0, 0, 0, 0, R, 0, 3, R, 1, R], arp: [0, R, 7, R, 0, R, 10, R, 0, R, 7, R, 12, R, 10, R], lead: [12, R, R, R, R, R, 10, R, R, R, R, R, 7, R, R, R], bw: 'sawtooth', aw: 'square', lw: 'sawtooth', arpEvery: 2, snare: [4, 12], hat: 2, kick: 4, heavy: true },
    space: { tempo: 124, root: 3, prog: [0, -2, -5, -7], bass: [0, R, R, 0, R, R, 0, R, R, 0, R, R, 0, R, 7, R], arp: [0, 7, 12, 19, 12, 7, 0, 7, 5, 12, 17, 24, 17, 12, 5, 12], lead: [24, R, R, 22, R, R, 19, R, R, 17, R, R, 19, R, R, R], bw: 'square', aw: 'triangle', lw: 'triangle', arpEvery: 1, snare: [12], hat: 2, kick: 4, soft: true },
    tunnel: { tempo: 108, root: 3, prog: [0, 3, -2, 1], bass: [0, R, 0, R, R, R, 0, R, 0, R, 0, R, R, R, 3, R], arp: [0, R, R, R, 7, R, R, R, 3, R, R, R, 10, R, R, R], lead: [R, R, 24, R, R, R, R, 22, R, R, R, R, 19, R, R, R], bw: 'square', aw: 'square', lw: 'triangle', arpEvery: 1, snare: [12], hat: 4, kick: 8 },
    warp: { tempo: 146, root: 4, prog: [0, 3, -2, 5], bass: [0, 0, 0, 0, 7, 7, 7, 7, 5, 5, 5, 5, 3, 3, 3, 3], arp: [0, 12, 7, 12, 0, 12, 7, 12, 3, 15, 10, 15, 3, 15, 10, 15], lead: [19, R, 22, R, 24, R, 22, R, 19, R, 17, R, 19, R, R, R], bw: 'sawtooth', aw: 'sawtooth', lw: 'square', arpEvery: 1, snare: [4, 12], hat: 2, kick: 4, offHat: true },
    arena: { tempo: 140, root: 3, prog: [0, -3, -5, -1], bass: [0, R, 0, 0, R, 0, 12, R, 0, R, 0, 0, R, 7, R, 10], arp: [0, 3, 7, 10, 12, 10, 7, 3, 0, 3, 7, 10, 15, 12, 10, 7], lead: [15, R, 14, R, 12, R, 10, R, 12, R, 14, R, 15, R, 19, R], bw: 'sawtooth', aw: 'square', lw: 'sawtooth', arpEvery: 1, snare: [4, 12], hat: 1, kick: 4 },
    final: { tempo: 152, root: 3, prog: [0, -4, -2, -7], bass: [0, R, 12, R, 0, R, 12, R, -4, R, 8, R, -2, R, 10, R], arp: [0, 7, 12, 16, 19, 16, 12, 7, 0, 7, 12, 15, 19, 15, 12, 7], lead: [19, R, R, 19, 22, R, 24, R, 22, R, 19, R, 17, R, 19, R], bw: 'sawtooth', aw: 'triangle', lw: 'sawtooth', arpEvery: 1, snare: [4, 12], hat: 2, kick: 4, epic: true },
  };
  const M = { on: false, step: 0, next: 0, tempo: 132, mode: 'play', timer: 0, key: 0, style: STYLES.canyon };
  const L = {};
  function initMusic() { ['bass', 'arp', 'drums', 'lead'].forEach((k) => { L[k] = A.ctx.createGain(); L[k].gain.value = 1; L[k].connect(musicBus); }); }
  const freq = (root, semis) => root * Math.pow(2, semis / 12);
  function schedStep(t, s) {
    const S = M.style, bar = (s >> 4) & 3, st = s & 15, root = freq(55, S.prog[bar] + S.root + M.key), sx = 60 / M.tempo / 4;
    const title = M.mode === 'title', boss = M.mode === 'boss';
    const bv = S.soft ? 0.1 : S.heavy ? 0.17 : 0.14;
    if (S.bass[st] >= 0) {
      tone({ type: S.bw, f0: freq(root, S.bass[st]), dur: sx * (S.soft ? 3 : 1.7), vol: bv, bus: L.bass, at: t });
      if (S.heavy || S.epic) tone({ type: 'sine', f0: freq(root, S.bass[st]) * 0.5, dur: sx * 1.8, vol: 0.12, bus: L.bass, at: t });
    }
    if (st % S.arpEvery === 0 && S.arp[st] >= 0 && (!title || st % 2 === 0)) tone({ type: S.aw, f0: freq(root * 4, S.arp[st]), dur: sx * 0.85, vol: S.soft ? 0.045 : title ? 0.04 : 0.05, bus: L.arp, at: t });
    if (!title && S.lead[st] >= 0 && ((bar & 1) || boss || S.epic)) {
      const f = freq(root * 4, S.lead[st]);
      tone({ type: S.lw, f0: f, dur: sx * 2, vol: S.epic ? 0.085 : 0.075, bus: L.lead, attack: 0.01, at: t });
      if (S.epic || boss) tone({ type: S.lw, f0: f * 2.003, dur: sx * 2, vol: 0.03, bus: L.lead, attack: 0.01, at: t });
    }
    if (st % S.kick === 0) tone({ type: 'sine', f0: 170, f1: 40, dur: 0.14, vol: S.soft ? 0.38 : 0.5, bus: L.drums, at: t });
    if (!title && S.snare.indexOf(st) >= 0) { noise({ type: 'highpass', f0: 1800, dur: 0.12, vol: S.soft ? 0.1 : S.heavy ? 0.24 : 0.17, bus: L.drums, at: t }); if (S.heavy) tone({ type: 'triangle', f0: 190, f1: 90, dur: 0.1, vol: 0.14, bus: L.drums, at: t }); }
    const hatOn = S.offHat ? (st % 4 === 2) : (st % S.hat === 0);
    if (hatOn) noise({ type: 'highpass', f0: 7500, dur: S.offHat ? 0.09 : st % 4 === 2 ? 0.08 : 0.03, vol: S.soft ? 0.04 : S.hat === 1 ? 0.04 : 0.06, bus: L.drums, at: t });
    if (S.epic && st === 0 && bar === 0) noise({ type: 'bandpass', f0: 6000, f1: 1500, dur: 0.6, vol: 0.14, bus: L.drums, at: t, q: 0.6 });
    if (boss && st % 2 === 1 && S.hat !== 1) noise({ type: 'highpass', f0: 8500, dur: 0.025, vol: 0.04, bus: L.drums, at: t });
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
  /** mode: 'off' | 'title' | 'play' | 'boss'; key transposes; style names a STYLES entry (canyon, water, foundry, space, tunnel, warp, arena, final) */
  A.music = function (mode, key, style) {
    if (!A.ready) return;
    if (mode === 'off') { M.on = false; return; }
    M.mode = mode; M.key = key || 0;
    M.style = STYLES[style] || (mode === 'title' ? STYLES.canyon : M.style);
    M.tempo = mode === 'title' ? 108 : M.style.tempo + (mode === 'boss' ? 14 : 0);
    if (!M.on) {
      M.on = true; M.step = 0; M.next = A.ctx.currentTime + 0.08;
      if (!M.timer) M.timer = setInterval(scheduler, 30);
    }
  };
  A.STYLES = STYLES;

  G.audio = A;
})((window.SGS = window.SGS || {}));
