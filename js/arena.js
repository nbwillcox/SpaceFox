/* All-range arenas and the late-game bosses. In an arena the ship really flies (yaw / pitch) and the whole world is simulated in the ship's own frame: each tick everything is
   translated back by the ship's speed and rotated by the ship's turn, so the rail game's shots, lock-on, deflect, bombs and damage rules work unchanged. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, I = G.input, Game = G.game, SZ = C.SHIP_Z, TAU = U.TAU, clamp = U.clamp;
  const X = () => Game._;
  const A = { on: false, yaw: 0, pitch: 0, dYaw: 0, dPitch: 0, pos: { x: 0, y: 0, z: 0 }, cfg: null, t: 0, wi: 0, pi: 0, sky: [], dust: [], warn: 0, radar: true };
  G.arena = A;

  /* ---------- enemy and boss tables ---------- */
  Game.EN.afighter = { w: 240, r: 78, hp: 2, score: 150, frame: 0, glow: 'rgba(255,60,50,1)' };
  Game.EN.atwin = { w: 300, r: 108, hp: 5, score: 350, frame: 1, glow: 'rgba(255,90,210,1)' };
  Game.EN.aturret = { w: 250, r: 100, hp: 16, score: 500, frame: 4, glow: 'rgba(255,150,50,1)' };
  Game.EN.amine = { w: 130, r: 60, hp: 1, score: 0, frame: 5 };
  const B = X().BOSSES;
  B.bulwark.core = { phase: 2, color: 'rgba(255,150,50,1)', dy: 0.02 };
  B.talon = { name: 'SCARLET TALON', atlas: 'enemy', frame: 0, w: 360, rx: 150, ry: 130, hp: 100, armor: false, arena: true, speed: 1500, score: 12000, glow: 'rgba(255,40,60,1)',
    p2: 'It lit the afterburners! It is dropping mines, Captain - watch your six!' };
  B.queen = { name: 'HOLLOW QUEEN', atlas: 'none', draw: 'queen', frame: 0, w: 1500, rx: 720, ry: 250, hp: 180, armor: false, arena: true, shielded: true, score: 15000,
    p2: 'The shield generators are down! Hit the carrier hull with everything!' };
  B.gatewyrm = { name: 'GATEWYRM', atlas: 'boss', frame: 1, w: 1000, rx: 390, ry: 250, hp: 200, armor: false, y: 70, z: 1150, sway: 280, minion: 'fighter', score: 12000,
    seq1: ['fan', 'orbs', 'spawn', 'ring'], seq2: ['swipe', 'inferno', 'orbs', 'ring', 'spawn'],
    p2: 'The serpent is coiling tight! It lunges now, Captain!' };
  B.crown = { name: 'CROWN CORE', atlas: 'boss', frame: 2, w: 1050, rx: 430, ry: 430, hp: 300, armor: true, phases: 3, y: 60, z: 1200, sway: 160, minion: 'crystal', score: 25000,
    core: { phase: 3, color: 'rgba(255,60,220,1)', dy: 0 },
    seq1: ['ring', 'mortar', 'orbs', 'ring', 'mortar'], seq2: ['swipe', 'rain', 'fan', 'swipe', 'spawn', 'ring'], seq3: ['inferno', 'orbs', 'ring', 'inferno', 'spawn', 'swipe', 'rain'],
    p2: 'The shield rings are breaking! Its claws are free - dodge the sweeps!',
    p3: 'The core is exposed! The whole station is shaking itself apart - finish it!' };

  /* ---------- setup ---------- */
  A.init = function (stage) {
    A.on = true; A.cfg = stage.arena || {};
    A.yaw = 0; A.pitch = 0; A.dYaw = 0; A.dPitch = 0; A.t = 0; A.wi = 0; A.pi = 0; A.warn = 0; A.R = A.cfg.R || 4200; A.bossT = 0; A.waveNo = 0; A.totalWaves = (A.cfg.waves || []).length;
    A.pos = { x: 0, y: 0, z: A.cfg.carrier ? -3600 : -1800 };
    const rnd = () => Math.random() * 2 - 1;
    A.sky = [];
    for (let i = 0; i < 460; i++) { let x = rnd(), y = rnd(), z = rnd(); const l = Math.hypot(x, y, z) || 1; A.sky.push({ x: x / l, y: y / l, z: z / l, k: 's', c: Math.random() }); }
    const blobs = [[0.6, 0.2, 0.77, 520, 'rgba(170,70,230,0.30)'], [-0.8, 0.1, 0.5, 460, 'rgba(60,150,255,0.26)'], [0.1, -0.2, -0.97, 600, 'rgba(255,90,150,0.18)'], [-0.3, 0.5, -0.8, 420, 'rgba(255,180,80,0.14)']];
    for (const [x, y, z, sz, col] of blobs) { const l = Math.hypot(x, y, z); A.sky.push({ x: x / l, y: y / l, z: z / l, k: 'n', sz, col }); }
    A.sky.push({ x: 0.35, y: 0.12, z: 0.93, k: 'p', sz: 190 });
    A.dust = [];
    for (let i = 0; i < 70; i++) A.dust.push({ x: rnd() * 1400, y: rnd() * 900, z: Math.random() * 2400 - 300 });
    if (A.cfg.carrier) spawnQueen();
  };

  /* ---------- the ship's flight and the rotating world ---------- */
  A.control = function (dt, ax, ay) {
    const s = Game.ship;
    if (G.settings.invertY) ay = -ay;
    const sp = Game.speed, yawMax = 2.0 * (sp > 1.3 ? 0.8 : sp < 0.8 ? 1.25 : 1), pitMax = 1.5;
    s.yr = (s.yr || 0) + (ax * yawMax - (s.yr || 0)) * Math.min(1, 6 * dt);
    s.pr = (s.pr || 0) + (ay * pitMax - (s.pr || 0)) * Math.min(1, 6 * dt);
    let dy = s.yr * dt, dp = s.pr * dt;
    /* the arena edge: steer the ship back toward the middle */
    const d = Math.hypot(A.pos.x, A.pos.y, A.pos.z);
    A.warn = d > A.R * 0.92 ? 1 : 0;
    if (d > A.R) {
      const want = Math.atan2(-A.pos.x, -A.pos.z);
      let diff = want - A.yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      dy = clamp(diff, -2.4 * dt, 2.4 * dt);
      const wantP = Math.atan2(-A.pos.y, Math.hypot(A.pos.x, A.pos.z)); dp = clamp(wantP - A.pitch, -1.6 * dt, 1.6 * dt);
    }
    if (A.pitch + dp > 1.15) dp = 1.15 - A.pitch; else if (A.pitch + dp < -1.15) dp = -1.15 - A.pitch;
    A.dYaw = dy; A.dPitch = dp; A.yaw += dy; A.pitch += dp;
    s.bank += (clamp(dy / dt / yawMax, -1, 1) - s.bank) * Math.min(1, 8 * dt);
    const cp = Math.cos(A.pitch), sc = Game.scroll;
    A.pos.x += Math.sin(A.yaw) * cp * sc * dt; A.pos.y += Math.sin(A.pitch) * sc * dt; A.pos.z += Math.cos(A.yaw) * cp * sc * dt;
    Game.cam.x = 0; Game.cam.y = 0;
  };

  function rotPos(o, ca, sa, cb, sb) {
    const x = o.x, y = o.y, z = o.z - SZ;
    const x2 = x * ca - z * sa, z2 = x * sa + z * ca;
    o.y = y * cb - z2 * sb; o.z = y * sb + z2 * cb + SZ; o.x = x2;
  }
  function rotVec(o, kx, ky, kz, ca, sa, cb, sb) {
    const x = o[kx], y = o[ky], z = o[kz];
    const x2 = x * ca - z * sa, z2 = x * sa + z * ca;
    o[ky] = y * cb - z2 * sb; o[kz] = y * sb + z2 * cb; o[kx] = x2;
  }
  A.rotateWorld = function () {
    const a = A.dYaw, b = A.dPitch;
    if (!a && !b) return;
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    for (const e of Game.ents) {
      if (e.t === 'box') continue;
      rotPos(e, ca, sa, cb, sb);
      if (e.arena && e.vx !== undefined) rotVec(e, 'vx', 'vy', 'vz', ca, sa, cb, sb);
    }
    for (const o of Game.shots) { rotPos(o, ca, sa, cb, sb); rotVec(o, 'vx', 'vy', 'vz', ca, sa, cb, sb); o.pz = o.z; }
    for (const o of Game.eshots) { rotPos(o, ca, sa, cb, sb); rotVec(o, 'vx', 'vy', 'vz', ca, sa, cb, sb); }
    for (const o of Game.missiles) rotPos(o, ca, sa, cb, sb);
    for (const o of Game.refl) { rotPos(o, ca, sa, cb, sb); o.pz = o.z; }
    for (const p of FX.parts) { rotPos(p, ca, sa, cb, sb); rotVec(p, 'vx', 'vy', 'vz', ca, sa, cb, sb); }
    for (const st of A.sky) { const o = { x: st.x, y: st.y, z: st.z + SZ }; rotPos(o, ca, sa, cb, sb); st.x = o.x; st.y = o.y; st.z = o.z - SZ; }
    for (const d of A.dust) rotPos(d, ca, sa, cb, sb);
  };
  A.updateDust = function (dt) {
    for (const d of A.dust) {
      d.z -= Game.scroll * dt;
      if (d.z < -300 || d.z > 2300 || Math.abs(d.x) > 1700 || Math.abs(d.y) > 1100) { d.x = (Math.random() * 2 - 1) * 1400; d.y = (Math.random() * 2 - 1) * 900; d.z = 1900 + Math.random() * 400; }
    }
  };

  /* ---------- spawning ---------- */
  const alive = (...kinds) => Game.ents.filter((e) => e.t === 'enemy' && !e.dead && kinds.indexOf(e.kind) >= 0).length;
  function randDir(behind) {
    const a = Math.random() * TAU, el = (Math.random() - 0.4) * 0.9;
    let x = Math.sin(a) * Math.cos(el), y = Math.sin(el), z = Math.cos(a) * Math.cos(el);
    if (!behind && z < 0.25) z = Math.abs(z) + 0.25;
    const l = Math.hypot(x, y, z); return { x: x / l, y: y / l, z: z / l };
  }
  function spawnFighter(kind, px, py, pz) {
    const spec = Game.EN[kind], sp = kind === 'atwin' ? 700 : 1100 + Math.min(300, Game.stage.n * 40);
    const d = Math.hypot(px, py, pz - SZ) || 1;
    const e = X().addEnemy(kind, px, py, pz, { arena: true, speed: sp, vx: -px / d * sp, vy: -py / d * sp, vz: (SZ - pz) / d * sp, mode: 'attack', modeT: 0, fireT: U.rand(0.8, 2), rotv: 0, jinkCd: 0 });
    return e;
  }
  function spawnWave(w) {
    A.waveNo++;
    const n = w.n || 3;
    for (let i = 0; i < n; i++) {
      const dir = randDir(Math.random() < 0.35), dist = U.rand(2300, 3100);
      spawnFighter(w.kind || 'afighter', dir.x * dist + U.rand(-120, 120), dir.y * dist + U.rand(-80, 80), SZ + dir.z * dist);
    }
    X().snd('spawn');
  }
  function spawnPickup(p) {
    Game.ents.push({ t: 'pickup', kind: p.kind, x: U.rand(-300, 300), y: U.rand(-200, 200), z: U.rand(1400, 1900), age: 0 });
  }
  function bossEntity(def, x, y, z, extra) {
    const maxHp = Math.round(def.hp * Game.diff.hp);
    const e = X().addEnemy('boss', x, y, z, Object.assign({ boss: true, def, name: def.name, maxHp, hp: maxHp, phase: 1, state: 'fight', dieT: 0, expT: 0, arena: true, vx: 0, vy: 0, vz: 0, speed: def.speed || 0, mode: 'attack', modeT: 0, fireT: 2, spawnT: 5, minT: 3, burst: 0, jinkCd: 0, atkT: 0, xOff: 0, zOff: 0 }, extra || {}));
    Game.boss = e; Game.bossSpawned = true; Game.bossWarned = true;
    return e;
  }
  function spawnTalon() {
    const dir = randDir(false), dist = 2600;
    bossEntity(B.talon, dir.x * dist, dir.y * dist, SZ + dir.z * dist, { vx: 0, vy: 0, vz: 1500, speed: 1500 });
  }
  function spawnQueen() {
    const z0 = SZ + 3400, q = bossEntity(B.queen, 0, 0, z0, { keep: true, shield: true, gens: 4, speed: 0, spawnT: 6, fireT: 3 });
    const offs = [[-720, 70], [720, 70], [-330, -170], [330, -170]];
    for (const [ox, oy] of offs) X().addEnemy('aturret', ox, oy, z0 - 160, { arena: true, keep: true, minion: true, fireT: U.rand(0.6, 1.6), vx: 0, vy: 0, vz: 0 });
    Game.boss = q;
  }

  /* ---------- steering ---------- */
  function steer(e, tx, ty, tz, omega, dt) {
    const dx = tx - e.x, dy = ty - e.y, dz = tz - e.z, d = Math.hypot(dx, dy, dz) || 1, sp = Math.hypot(e.vx, e.vy, e.vz) || 1;
    const hx = e.vx / sp, hy = e.vy / sp, hz = e.vz / sp, ux = dx / d, uy = dy / d, uz = dz / d;
    const dot = clamp(hx * ux + hy * uy + hz * uz, -1, 1), ang = Math.acos(dot);
    const k = ang < 1e-4 ? 0 : Math.min(1, omega * dt / ang);
    let nx = hx + (ux - hx) * k, ny = hy + (uy - hy) * k, nz = hz + (uz - hz) * k;
    const n = Math.hypot(nx, ny, nz) || 1;
    e.vx = nx / n * e.speed; e.vy = ny / n * e.speed; e.vz = nz / n * e.speed;
    return { ang, d, dot };
  }
  A.shotAt = function (e, speed, size, spread, jit) {
    const tx = U.rand(-1, 1) * (spread || 0), ty = U.rand(-1, 1) * (spread || 0) * 0.7, tz = SZ;
    const dx = tx - e.x, dy = ty - e.y, dz = tz - e.z, d = Math.hypot(dx, dy, dz) || 1, t = Math.max(0.25, d / speed);
    Game.eshots.push({ x: e.x, y: e.y, z: e.z, vx: dx / t, vy: dy / t, vz: dz / t + Game.scroll, r: 18 * size, dmg: Math.max(1, Math.round(11 * size * Game.diff.shotDmg)), size, arena: true });
    X().snd('enemyShot');
  };
  function ram(e, dmg) {
    const s = Game.ship;
    if (s.dead || e.dead || Math.abs(e.z - SZ) > 75) return;
    const r = Game.EN[e.kind].r * 0.8 + 45;
    if (e.x * e.x + e.y * e.y < r * r && X().hurt(dmg, 'crash')) { if (!e.boss) X().damageEnemy(e, 99); }
  }

  /* ---------- enemy AI ---------- */
  A.updateEnemy = function (e, dt) {
    if (e.boss) { A.updateBoss(e, dt); return; }
    const sc = Game.scroll, rate = Game.diff.rate;
    if (e.kind === 'aturret') {
      e.z -= sc * dt;
      e.fireT -= dt * rate;
      const d = Math.hypot(e.x, e.y, e.z - SZ);
      if (e.fireT <= 0 && d < 2800 && e.z > 100) { e.fireT = U.rand(1.6, 2.6); A.shotAt(e, 1150, 1, 90); }
      return;
    }
    if (e.kind === 'amine') {
      e.z -= sc * dt; e.rot += dt;
      if (Math.hypot(e.x, e.y, e.z - SZ) < 120 && !Game.ship.dead) { if (X().hurt(18, 'crash')) { e.dead = true; FX.explosion(e.x, e.y, e.z, 1.2); X().snd('boom', 1); } }
      if (e.z < -3000 || e.age > 40) e.dead = true;
      return;
    }
    /* fighters and twin pods: pursue, shoot when lined up, break off when they get close */
    e.age += 0;
    e.modeT -= dt; e.fireT -= dt * rate; e.jinkCd -= dt;
    const omega = e.kind === 'atwin' ? 1.0 : 1.9;
    if (e.ox2 === undefined) { e.ox2 = U.rand(-1, 1) * 230; e.oy2 = U.rand(-1, 1) * 170; }
    let tgt = [e.ox2, e.oy2, SZ];
    if (e.mode === 'break') tgt = [e.bx, e.by, e.bz];
    const st = steer(e, tgt[0], tgt[1], tgt[2], e.mode === 'jink' ? 3.6 : omega, dt);
    if (e.mode === 'attack' && st.d < 560) { e.ox2 = U.rand(-1, 1) * 230; e.oy2 = U.rand(-1, 1) * 170; e.mode = 'break'; e.modeT = U.rand(0.9, 1.5); const dir = randDir(true); e.bx = e.x + dir.x * 1800; e.by = e.y + dir.y * 1200; e.bz = e.z + dir.z * 1800; }
    else if (e.mode !== 'attack' && e.modeT <= 0) e.mode = 'attack';
    else if (e.mode === 'attack' && Math.abs(e.x) < 130 && Math.abs(e.y) < 130 && e.z > 300 && e.z < 2000 && e.jinkCd <= 0 && Math.random() < dt * 0.6 && e.kind === 'afighter') { e.mode = 'jink'; e.modeT = 0.6; e.jinkCd = 3; const dir = randDir(true); e.bx = e.x + dir.x * 1500; e.by = e.y + dir.y * 1000; e.bz = e.z + dir.z * 1500; tgt = [e.bx, e.by, e.bz]; }
    if (e.mode === 'jink') { steer(e, e.bx, e.by, e.bz, 3.6, dt); if (e.modeT <= 0) e.mode = 'attack'; }
    if (e.mode === 'attack' && e.fireT <= 0 && st.ang < 0.16 && st.d > 500 && st.d < 2500) {
      e.fireT = (e.kind === 'atwin' ? 2.1 : U.rand(1.9, 3.0));
      A.shotAt(e, 1350, 1, 95);
      if (e.kind === 'atwin') { A.shotAt(Object.assign({}, e, { x: e.x + 60 }), 1350, 1, 95); }
    }
    e.x += e.vx * dt; e.y += e.vy * dt; e.z += (e.vz - sc) * dt;
    e.rotv = clamp(e.vx / 1700, -0.6, 0.6);
    ram(e, e.kind === 'atwin' ? 16 : 14);
    if (Math.hypot(e.x, e.y, e.z - SZ) > 6500) e.dead = true;
  };

  A.updateBoss = function (e, dt) {
    const def = e.def, sc = Game.scroll, rate = Game.diff.rate;
    if (e.dying) {
      e.dieT += dt; e.expT -= dt;
      if (e.expT <= 0) { e.expT = 0.12; FX.explosion(e.x + U.rand(-def.rx * 0.8, def.rx * 0.8), e.y + U.rand(-def.ry * 0.8, def.ry * 0.8), e.z - 40, def.draw === 'queen' ? 2.2 : 1.6); X().snd('boom', 1); }
      if (def.draw !== 'queen') { e.x += e.vx * dt * 0.4; e.y += e.vy * dt * 0.4 - 60 * dt; e.z += (e.vz * 0.4 - sc) * dt; } else e.z -= sc * dt;
      if (e.dieT > (def.draw === 'queen' ? 4.2 : 3)) {
        e.dead = true; Game.boss = null;
        for (const o of Game.ents) if (o.t === 'enemy' && o !== e && !o.dead) { o.dead = true; FX.explosion(o.x, o.y, o.z, 1); }
        X().bossDown();
      }
      return;
    }
    if (def.draw === 'queen') { queen(e, dt); return; }
    /* Scarlet Talon: a rival ace */
    e.modeT -= dt; e.fireT -= dt * rate; e.jinkCd -= dt; e.spawnT -= dt;
    const p2 = e.phase >= 2;
    e.speed = p2 ? 1950 : 1500;
    const omega = p2 ? 3.2 : 2.6;
    if (e.ox2 === undefined) { e.ox2 = U.rand(-1, 1) * 200; e.oy2 = U.rand(-1, 1) * 150; }
    let tgt = [e.ox2, e.oy2, SZ];
    if (e.mode === 'break' || e.mode === 'jink') tgt = [e.bx, e.by, e.bz];
    const st = steer(e, tgt[0], tgt[1], tgt[2], e.mode === 'jink' ? 4.6 : omega, dt);
    if (e.mode === 'attack' && st.d < 700) { e.ox2 = U.rand(-1, 1) * 200; e.oy2 = U.rand(-1, 1) * 150; e.mode = 'break'; e.modeT = U.rand(0.9, 1.4); const dir = randDir(true); e.bx = e.x + dir.x * 2200; e.by = e.y + dir.y * 1400; e.bz = e.z + dir.z * 2200; }
    else if (e.mode !== 'attack' && e.modeT <= 0) e.mode = 'attack';
    const aimed = Math.abs(e.x) < 190 && Math.abs(e.y) < 190 && e.z > 200 && e.z < 2300;
    if (e.mode === 'attack' && aimed && e.jinkCd <= 0) { e.mode = 'jink'; e.modeT = 0.8; e.jinkCd = 2.4; const dir = randDir(true); e.bx = e.x + dir.x * 1700; e.by = e.y + dir.y * 1200; e.bz = e.z + dir.z * 1700; }
    if (e.burst > 0) { e.sub = (e.sub || 0) - dt; if (e.sub <= 0) { e.sub = 0.12; e.burst--; A.shotAt(e, 1500, 1, 110); } }
    else if (e.mode === 'attack' && e.fireT <= 0 && st.ang < 0.2 && st.d > 600 && st.d < 2700) { e.burst = 4; e.sub = 0; e.fireT = (p2 ? 2.2 : 3.0); }
    if (p2 && e.spawnT <= 0 && alive('amine') < 6) { e.spawnT = 3.2; X().addEnemy('amine', e.x, e.y, e.z, { arena: true, vx: 0, vy: 0, vz: 0, minion: true }); }
    e.x += e.vx * dt; e.y += e.vy * dt; e.z += (e.vz - sc) * dt;
    ram(e, 18);
    if (Math.hypot(e.x, e.y, e.z - SZ) > 7000) { e.x *= 0.3; e.y *= 0.3; e.z = SZ + (e.z - SZ) * 0.3; }
  };

  function queen(e, dt) {
    const sc = Game.scroll, rate = Game.diff.rate;
    e.z -= sc * dt;
    const gens = alive('aturret');
    e.gens = gens; e.shield = gens > 0;
    if (e.phase === 1 && gens === 0) {
      e.phase = 2; e.shield = false; FX.doFlash(0.5, '255,170,90'); FX.addShake(14); X().snd('crash');
      FX.explosion(e.x - 400, e.y, e.z - 40, 2); FX.explosion(e.x + 400, e.y, e.z - 40, 2);
      Game.ents.push({ t: 'pickup', kind: 'repair', x: -100, y: 40, z: 1500, age: 0 }, { t: 'pickup', kind: 'bomb', x: 120, y: 30, z: 1800, age: 0 });
      X().say('moss', 'shock', e.def.p2, { pri: 2 });
      X().say('vale', 'shout', 'All turrets gone. Now tear her apart!', { pri: 1 });
    }
    const d = Math.hypot(e.x, e.y, e.z - SZ);
    e.fireT -= dt * rate; e.spawnT -= dt;
    if (e.fireT <= 0 && d < 3600 && e.z > 300) {
      e.fireT = e.phase === 1 ? 3.6 : 2.6;
      A.shotAt(e, 950, 2.4, 90);
      if (e.phase === 2) for (const dx of [-340, 340]) A.shotAt(Object.assign({}, e, { x: e.x + dx }), 1100, 1.2, 120);
    }
    if (e.spawnT <= 0 && alive('afighter') < 4) {
      e.spawnT = e.phase === 1 ? 13 : 9;
      for (let i = 0; i < 2; i++) spawnFighter('afighter', e.x + U.rand(-500, 500), e.y + U.rand(-120, 120), e.z - 100);
      X().snd('spawn');
    }
  }

  /* ---------- the stage clock ---------- */
  A.tick = function (dt) {
    A.updateDust(dt);
    if (Game.phase !== 'play') return;
    const cfg = A.cfg;
    A.t += dt;
    const w = cfg.waves || [];
    while (A.wi < w.length && A.t >= w[A.wi].t) spawnWave(w[A.wi++]);
    const pk = cfg.pickups || [];
    while (A.pi < pk.length && A.t >= pk[A.pi].t) spawnPickup(pk[A.pi++]);
    if (cfg.boss === 'talon' && !Game.bossSpawned) {
      const allIn = A.wi >= w.length, left = alive('afighter', 'atwin');
      if (!A.bossT && ((allIn && left <= 1) || A.t > (cfg.bossT || 90))) { A.bossT = 1; X().warnBoss(); A.bossAt = A.t + 3.2; }
      if (A.bossT && A.t >= A.bossAt) spawnTalon();
    }
  };

  /* soft aim assist: a fired laser bends toward the enemy nearest the reticle, so flying and aiming at once is possible */
  A.assist = function (sh) {
    let best = null, bd = 1e9;
    for (const e of Game.ents) {
      if (e.t !== 'enemy' || e.dead || (e.boss && e.shield) || e.z < 300 || e.z > 2800) continue;
      const lim = 260 + e.z * 0.2;
      if (Math.abs(e.x) > lim || Math.abs(e.y) > lim) continue;
      const d = e.x * e.x + e.y * e.y + e.z * 3;
      if (d < bd) { bd = d; best = e; }
    }
    if (best) { const t = Math.max(0.1, (best.z - SZ - 20) / 3000); sh.vx = best.x / t * 0.85; sh.vy = (best.y + 4) / t * 0.85; }
  };

  /* ---------- autopilot ---------- */
  const botS = { fireT: 0, rollIn: 0, evade: 0, ex: 0, ey: 0, charging: false };
  A.bot = function (dt) {
    const s = Game.ship;
    let best = null, bd = 1e9;
    for (const e of Game.ents) {
      if (e.t !== 'enemy' || e.dead) continue;
      if (e.boss && e.shield) continue;
      let d = Math.hypot(e.x, e.y, e.z - SZ) * (e.boss ? 0.7 : e.kind === 'aturret' ? 0.75 : 1);
      if (e.kind === 'amine') d *= 3;
      if (d < bd) { bd = d; best = e; }
    }
    let yaw = 0, pit = 0, aligned = false;
    if (best) {
      const tz = best.z - SZ;
      if (tz < 80) yaw = best.x >= 0 ? 1 : -1;
      else { yaw = clamp(best.x / Math.max(220, tz) * 5, -1, 1); pit = clamp(best.y / Math.max(220, tz) * 5, -1, 1); }
      aligned = tz > 250 && tz < 2600 && Math.abs(best.x) < 120 + tz * 0.11 && Math.abs(best.y) < 120 + tz * 0.11;
    } else { yaw = 0.2; }
    for (const e of Game.ents) if (e.t === 'pickup' && e.z > 100 && e.z < 1400 && Math.abs(e.x) < 500) { yaw = clamp(e.x / Math.max(300, e.z) * 5, -1, 1); pit = clamp(e.y / Math.max(300, e.z) * 5, -1, 1); break; }
    /* a head-on enemy about to ram: break away for half a second */
    botS.evade -= dt;
    if (best && botS.evade <= 0) { const tz = best.z - SZ; if (tz > -40 && tz < 520 && Math.abs(best.x) < 260 && Math.abs(best.y) < 260 && !best.boss) { botS.evade = 0.55; botS.ex = best.x >= 0 ? -1 : 1; botS.ey = best.y >= 0 ? -1 : 1; } }
    if (botS.evade > 0) { yaw = botS.ex; pit = botS.ey; aligned = false; }
    I.held.left = yaw < -0.08; I.held.right = yaw > 0.08; I.held.up = pit > 0.08; I.held.down = pit < -0.08;
    I.held.boost = false;
    const on = ((Game.t * 9) | 0) % 2 === 0;
    /* charge a lock-on volley against the big targets */
    if (botS.charging) {
      I.held.fire = true;
      if (s.charging && (s.locks.length >= 3 && s.chargeT > 0.5 || s.chargeT > 1.3) || !best || !best.boss) { botS.charging = false; I.held.fire = false; }
    } else if (best && best.boss && !best.shield && aligned && s.fire <= 0 && Math.random() < dt * 0.5) { botS.charging = true; I.held.fire = true; I._launch = true; }
    else if (aligned) { if (on && !I.held.fire) I._launch = true; I.held.fire = on; } else I.held.fire = false;
    botS.rollIn -= dt;
    if (botS.rollIn <= 0 && Game.eshots.some((sh) => sh.z < 520 && sh.z > 40 && Math.abs(sh.x) < 90 && Math.abs(sh.y) < 90)) { I._roll = yaw > 0 ? 1 : -1; botS.rollIn = 1.2; }
  };
})((window.SGS = window.SGS || {}));
