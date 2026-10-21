/* SpaceFox game logic: the rail, the ship, shots, enemies, obstacles, pickups, damage and the stage flow. Positions are world units: x right, y up, z = distance ahead of the camera
   (the ship sits at C.SHIP_Z). Everything that is fixed in the world slides toward the camera at the rail speed. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, A = G.audio, I = G.input, SP = G.sprites;
  const clamp = U.clamp;

  /* enemy table: w = drawn width in world units, r = hit radius */
  const EN = {
    fighter: { w: 150, r: 62, hp: 1, score: 100, frame: 0 },
    twin: { w: 200, r: 84, hp: 3, score: 250, frame: 1 },
    gunship: { w: 250, r: 105, hp: 12, score: 700, frame: 2 },
    crystal: { w: 170, r: 72, hp: 4, score: 350, frame: 3 },
    tank: { w: 210, r: 88, hp: 5, score: 300, frame: 4 },
    mine: { w: 125, r: 56, hp: 1, score: 150, frame: 5 },
  };
  const PICK = { star: { frame: 9, w: 74 }, shield: { frame: 6, w: 84 }, boost: { frame: 7, w: 80 }, repair: { frame: 8, w: 80 } };

  const Game = {
    demo: false, bot: false, score: 0, hits: 0, stars: 0, retries: 3, shield: 100, over: false,
    stage: null, stageNo: 1, dist: 0, evIdx: 0, phase: 'intro', phaseT: 0, t: 0, scroll: 0, speed: 1,
    ents: [], shots: [], eshots: [], boost: 100, boostLock: false, bombs: 3, over2: 0, msg: null, hasBackdrop: true,
    ship: null, cam: { x: 0, y: 0 }, flashT: 0, hurtT: 0, nextLife: 50000, onOver: null, onClear: null, stats: { kills: 0, shotsFired: 0, hitsTaken: 0, crashes: 0 },
  };
  G.game = Game;
  Game.EN = EN;
  const snd = (name, a, b) => { if (!Game.demo && A.sfx[name]) A.sfx[name](a, b); };

  /* ---------- projection ---------- */
  Game.proj = function (x, y, z) {
    const s = C.F / (C.F + z);
    return { x: C.VX + (x - Game.cam.x) * s, y: C.VY + (C.EYE + Game.cam.y - y) * s, s };
  };

  /* ---------- setup ---------- */
  Game.reset = function (demo, stageNo) {
    Game.demo = !!demo; Game.bot = !!demo;
    Game.score = 0; Game.hits = 0; Game.stars = 0; Game.over = false; Game.over2 = 0;
    Game.retries = G.debug && G.debug.lives ? G.debug.lives : C.START_RETRIES; Game.bombs = 3; Game.nextLife = 50000;
    Game.stats = { kills: 0, shotsFired: 0, hitsTaken: 0, crashes: 0 };
    startStage(stageNo || 1);
  };
  function startStage(n) {
    Game.stageNo = n; Game.stage = G.stages[n] || G.stages[1];
    Game.dist = (G.debug && G.debug.at) || 0; Game.evIdx = 0; Game.t = 0;
    while (Game.evIdx < Game.stage.events.length && Game.stage.events[Game.evIdx].d < Game.dist + C.ZFAR) Game.evIdx++;   /* ?at=D skips the early events */
    Game.ents = []; Game.shots = []; Game.eshots = []; FX.reset();
    Game.shield = C.SHIELD; Game.boost = 100; Game.boostLock = false; Game.speed = 1; Game.flashT = 0; Game.hurtT = 0;
    Game.ship = { x: 0, y: 0, vx: 0, vy: 0, bank: 0, rollT: 0, rollDir: 0, rollCd: 0, inv: 1.5, fire: 0, dead: false, boosting: false, braking: false, over: 0, alpha: 1, flicker: 0, face: 0 };
    Game.phase = 'intro'; Game.phaseT = 0;
    Game.msg = Game.demo ? null : { title: 'STAGE ' + Game.stage.n, sub: Game.stage.name, t: 0, dur: 2.6 };
    if (!Game.demo) { snd('ready'); A.music('play', Game.stage.key); }
  }

  /* ---------- spawning ---------- */
  function addEnemy(kind, x, y, z, extra) {
    const spec = EN[kind];
    const e = Object.assign({ t: 'enemy', kind, x, y, z, ox: x, oy: y, hp: spec.hp, age: 0, fire: U.rand(0.6, 1.8), flash: 0, ph: U.rand(0, 6.28), rot: 0, state: 0, hold: 0, burst: 0 }, extra || {});
    Game.ents.push(e);
    return e;
  }
  function addBox(x0, x1, y0, y1, z0, depth, color) { Game.ents.push({ t: 'box', x0, x1, y0, y1, z: z0, depth, color: color || 0, x: (x0 + x1) / 2, y: (y0 + y1) / 2 }); }
  function spawnEvent(ev, z) {
    switch (ev.e) {
      case 'fighter': {
        const n = ev.n || 3;
        for (let i = 0; i < n; i++) {
          const k = i - (n - 1) / 2;
          let ox = ev.x, oy = ev.y, oz = z;
          if (ev.pat === 'v') { ox += k * 120; oz += Math.abs(k) * 220; }
          else if (ev.pat === 'line') { ox += k * 170; }
          else { oz += i * 260; ox += Math.sin(i) * 80; }
          addEnemy('fighter', ox, oy + (ev.pat === 'v' ? -Math.abs(k) * 22 : 0), oz, { amp: ev.pat === 'wave' ? 230 : 60, vzo: ev.pat === 'line' ? -330 : -420, ph: ev.pat === 'wave' ? i * 0.9 : k });
        }
        break;
      }
      case 'twin': addEnemy('twin', ev.x, ev.y, z, { amp: 300 }); break;
      case 'gunship': addEnemy('gunship', ev.x, ev.y, z, {}); break;
      case 'crystal': addEnemy('crystal', ev.x, ev.y, z); break;
      case 'tank': addEnemy('tank', ev.x, ev.y, z); break;
      case 'mine': addEnemy('mine', ev.x, ev.y, z); break;
      case 'pillar': addBox(ev.x - ev.w / 2, ev.x + ev.w / 2, C.FLOOR - 20, C.FLOOR + ev.h, z, ev.w * 1.3, ev.d % 3); break;
      case 'arch': {
        const g = ev.gap;
        addBox(ev.x - g / 2 - 110, ev.x - g / 2, C.FLOOR - 20, C.FLOOR + 380, z, 130, 1);
        addBox(ev.x + g / 2, ev.x + g / 2 + 110, C.FLOOR - 20, C.FLOOR + 380, z, 130, 1);
        addBox(ev.x - g / 2 - 110, ev.x + g / 2 + 110, C.FLOOR + 380 - 0, C.FLOOR + 470, z, 130, 2);
        break;
      }
      case 'bar': {
        const g = ev.gap;
        addBox(-1100, ev.x - g / 2, C.FLOOR - 20, C.FLOOR + ev.h, z, 90, 0);
        addBox(ev.x + g / 2, 1100, C.FLOOR - 20, C.FLOOR + ev.h, z, 90, 0);
        break;
      }
      case 'pickup': Game.ents.push({ t: 'pickup', kind: ev.kind, x: ev.x, y: ev.y, z, age: 0 }); break;
    }
  }

  /* ---------- damage ---------- */
  function hurt(n, kind) {
    const s = Game.ship;
    if (s.dead || s.inv > 0 || Game.demo && false) return false;
    if (G.debug && G.debug.god) return false;
    Game.stats.hitsTaken++;
    if (s.over > 0) { const o = Math.min(s.over, n); s.over -= o; n -= o; }
    Game.shield -= n;
    s.inv = 1.0; Game.hurtT = 0.45; Game.flashT = 0.25;
    FX.addShake(kind === 'crash' ? 14 : 8);
    snd(kind === 'crash' ? 'crash' : 'damage');
    const p = Game.proj(s.x, s.y, C.SHIP_Z);
    FX.burst(s.x, s.y, C.SHIP_Z, 16, 260, 'rgba(255,170,80,1)');
    if (Game.shield <= 0) die();
    else if (Game.shield < 30) snd('warning');
    return true;
  }
  function die() {
    const s = Game.ship;
    s.dead = true; Game.shield = 0; Game.phase = 'dead'; Game.phaseT = 0;
    snd('death');
    FX.explosion(s.x, s.y, C.SHIP_Z, 2.4);
    FX.addShake(20); Game.flashT = 0.6;
    if (!Game.demo) { Game.retries--; if (Game.retries < 0) Game.over = true; }
  }
  function respawn() {
    const s = Game.ship;
    s.dead = false; s.inv = 3; s.alpha = 1; s.over = 0; s.x = 0; s.y = 0; s.vx = s.vy = 0; s.rollT = 0;
    Game.shield = C.SHIELD; Game.boost = 100; Game.boostLock = false;
    /* clear the lane ahead so the retry is fair */
    Game.ents = Game.ents.filter((e) => e.z > 1500 || e.t === 'pickup' && e.z > 300);
    Game.eshots = [];
    Game.phase = 'play'; Game.phaseT = 0;
    snd('respawn');
  }
  function addScore(n) {
    Game.score += n;
    if (Game.score >= Game.nextLife) { Game.retries++; Game.nextLife += 70000; snd('extraLife'); FX.text('1UP', 480, 150); }
  }

  /* ---------- autopilot (title demo and ?bot=1) ---------- */
  const botState = { tx: 0, ty: 0, fireOn: true, rollIn: 0 };
  function botSteer(dt) {
    const s = Game.ship;
    let best = null, bd = 1e9;
    for (const e of Game.ents) {
      if (e.t !== 'enemy' || e.z < 250 || e.z > 2300) continue;
      const d = e.z + Math.abs(e.x - s.x) * 0.4;
      if (d < bd) { bd = d; best = e; }
    }
    let tx = best ? best.x : 0, ty = best ? clamp(best.y, -110, 150) : 20;
    /* pickups */
    for (const e of Game.ents) if (e.t === 'pickup' && e.z > 100 && e.z < 1000 && Math.abs(e.x - s.x) < 350) { tx = e.x; ty = e.y; break; }
    /* dodge boxes and shots */
    let danger = false;
    for (const e of Game.ents) {
      if (e.t !== 'box' || e.z > 900 || e.z + e.depth < 0) continue;
      if (s.x + 70 > e.x0 && s.x - 70 < e.x1 && s.y + 45 > e.y0 && s.y - 45 < e.y1) {
        danger = true;
        const goL = e.x0 - 110, goR = e.x1 + 110;
        const free = (x) => !Game.ents.some((o) => o.t === 'box' && o.z < 900 && o.z + o.depth > 0 && x + 70 > o.x0 && x - 70 < o.x1 && s.y + 45 > o.y0 && s.y - 45 < o.y1);
        const lOk = free(goL) && goL > -C.BX, rOk = free(goR) && goR < C.BX;
        if (lOk && (!rOk || Math.abs(goL - s.x) < Math.abs(goR - s.x))) tx = goL; else if (rOk) tx = goR;
        else ty = e.y1 + 90 < C.BY1 ? e.y1 + 90 : e.y0 - 90;
        break;
      }
    }
    for (const sh of Game.eshots) if (sh.z < 700 && sh.z > 0 && Math.abs(sh.x - s.x) < 90 && Math.abs(sh.y - s.y) < 90) { tx = s.x + (sh.x > s.x ? -200 : 200); danger = true; }
    const dx = tx - s.x, dy = ty - s.y;
    I.held.left = dx < -30; I.held.right = dx > 30; I.held.up = dy > 24; I.held.down = dy < -24;
    I.held.fire = !danger || true;
    I.held.boost = false;
    botState.rollIn -= dt;
    if (botState.rollIn <= 0 && Game.eshots.some((sh) => sh.z < 500 && sh.z > 60 && Math.abs(sh.x - s.x) < 70 && Math.abs(sh.y - s.y) < 70)) { I._roll = dx > 0 ? 1 : -1; botState.rollIn = 1.2; }
  }

  /* ---------- update ---------- */
  Game.update = function (dt) {
    Game.t += dt; Game.phaseT += dt;
    FX.update(dt, Game.scroll);
    if (Game.msg) { Game.msg.t += dt; if (Game.msg.t > Game.msg.dur) Game.msg = null; }
    if (Game.flashT > 0) Game.flashT = Math.max(0, Game.flashT - dt);
    if (Game.hurtT > 0) Game.hurtT = Math.max(0, Game.hurtT - dt);
    const s = Game.ship;
    if (!s) return;

    if (Game.phase === 'dead') {
      Game.scroll = C.SPEED * Math.max(0, 0.5 - Game.phaseT) * 0.5;
      Game.dist += Game.scroll * dt;
      moveWorld(dt);
      if (Game.phaseT > 2.1) {
        if (Game.over) { Game.phase = 'over'; Game.phaseT = 0; snd('gameOver'); A.music('off'); A.engine(0, false); }
        else respawn();
      }
      if (Game.demo && Game.phase === 'dead' && Game.phaseT > 1) respawn();
      return;
    }
    if (Game.phase === 'over') { if (Game.phaseT > 1.2 && Game.onOver) { const f = Game.onOver; Game.onOver = null; f(); } return; }
    if (Game.phase === 'clear') {
      Game.scroll = C.SPEED * 0.6; Game.dist += Game.scroll * dt; moveWorld(dt);
      s.y += (40 - s.y) * dt; s.x += (0 - s.x) * dt;
      if (Game.phaseT > 4.5 && Game.onClear) { const f = Game.onClear; Game.onClear = null; f(); }
      if (Game.demo && Game.phaseT > 3) startStage(1);
      return;
    }

    if (Game.bot) botSteer(dt);

    /* --- ship --- */
    const ax = I.axisX(), ay = I.axisY();
    const spd = 560;
    s.vx += (ax * spd - s.vx) * Math.min(1, 9 * dt);
    s.vy += (ay * spd * 0.8 - s.vy) * Math.min(1, 9 * dt);
    s.x = clamp(s.x + s.vx * dt, -C.BX, C.BX); s.y = clamp(s.y + s.vy * dt, C.BY0, C.BY1);
    s.bank += (clamp(s.vx / spd, -1, 1) - s.bank) * Math.min(1, 8 * dt);
    if (s.inv > 0) s.inv = Math.max(0, s.inv - dt);
    if (s.rollCd > 0) s.rollCd -= dt;
    const rr = I.takeRoll();
    if (rr && s.rollT <= 0 && s.rollCd <= 0 && Game.phase !== 'intro') { s.rollT = 0.5; s.rollDir = rr; s.rollCd = 0.15; s.vx += rr * 620; snd('roll'); }
    if (s.rollT > 0) s.rollT = Math.max(0, s.rollT - dt);
    /* boost / brake */
    const wantBoost = I.held.boost && !Game.boostLock && Game.boost > 0, wantBrake = I.held.brake && !wantBoost;
    if (wantBoost && !s.boosting) snd('boost');
    if (wantBrake && !s.braking) snd('brake');
    s.boosting = wantBoost; s.braking = wantBrake;
    if (wantBoost) { Game.boost = Math.max(0, Game.boost - 34 * dt); if (Game.boost <= 0) Game.boostLock = true; }
    else { Game.boost = Math.min(100, Game.boost + (wantBrake ? 24 : 12) * dt); if (Game.boostLock && Game.boost > 30) Game.boostLock = false; }
    const targetSpeed = wantBoost ? 1.75 : wantBrake ? 0.55 : 1;
    Game.speed += (targetSpeed - Game.speed) * Math.min(1, 4 * dt);
    Game.scroll = C.SPEED * Game.speed * (Game.phase === 'intro' ? Math.min(1, Game.phaseT / 1.2) : 1);
    Game.dist += Game.scroll * dt;
    A.engine(Game.speed, !Game.demo);

    Game.cam.x = s.x * 0.35; Game.cam.y = s.y * 0.35;

    /* --- firing --- */
    s.fire -= dt;
    if (I.held.fire && s.fire <= 0 && s.rollT <= 0 && Game.phase !== 'intro') {
      s.fire = 0.115;
      Game.shots.push({ x: s.x, y: s.y - 4, z: C.SHIP_Z + 20, vz: 3000, life: 1.2, pz: C.SHIP_Z + 20 });
      Game.stats.shotsFired++;
      snd('laser', 0);
    }

    /* --- events --- */
    const evs = Game.stage.events;
    while (Game.evIdx < evs.length && evs[Game.evIdx].d <= Game.dist + C.ZFAR) { const e = evs[Game.evIdx++]; spawnEvent(e, e.d - Game.dist); }
    if (Game.dist >= Game.stage.length && Game.phase !== 'clear') endStage();
    if (Game.phase === 'intro' && Game.phaseT > 1.6) Game.phase = 'play';

    moveWorld(dt);
    if (Game.shield < 30 && !Game.demo && Game.phase === 'play') snd('lowShield');
  };

  function endStage() {
    Game.phase = 'clear'; Game.phaseT = 0;
    snd('stageClear'); A.engine(0, false);
    Game.msg = Game.demo ? null : { title: 'STAGE CLEAR', sub: Game.stage.name, t: 0, dur: 4 };
    addScore(2000 + Game.shield * 10);
  }

  function moveWorld(dt) {
    const s = Game.ship, sc = Game.scroll;
    /* player shots */
    for (let i = Game.shots.length - 1; i >= 0; i--) {
      const sh = Game.shots[i];
      sh.pz = sh.z; sh.z += sh.vz * dt; sh.life -= dt;
      if (sh.life <= 0 || sh.z > C.ZFAR) { Game.shots.splice(i, 1); continue; }
    }
    /* enemy shots */
    for (let i = Game.eshots.length - 1; i >= 0; i--) {
      const sh = Game.eshots[i];
      sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.z += sh.vz * dt;
      if (sh.z < -120 || Math.abs(sh.x) > 2500 || sh.y < C.FLOOR - 60) { Game.eshots.splice(i, 1); continue; }
      if (!s.dead && sh.z < C.SHIP_Z + 50 && sh.z > C.SHIP_Z - 50) {
        const dx = sh.x - s.x, dy = sh.y - s.y;
        if (dx * dx + dy * dy < (sh.r + 44) * (sh.r + 44)) {
          if (s.rollT > 0) { Game.eshots.splice(i, 1); FX.burst(sh.x, sh.y, sh.z, 6, 160, 'rgba(120,220,255,1)'); continue; }   /* rolling: the shot is swallowed (deflect comes in the next milestone) */
          if (hurt(sh.dmg, 'shot')) { Game.eshots.splice(i, 1); continue; }
        }
      }
    }
    /* entities */
    for (let i = Game.ents.length - 1; i >= 0; i--) {
      const e = Game.ents[i];
      e.age = (e.age || 0) + dt;
      if (e.t === 'box') {
        e.z -= sc * dt;
        if (e.z + e.depth < -200) { Game.ents.splice(i, 1); continue; }
        if (!s.dead && e.z - 30 < C.SHIP_Z + 30 && e.z + e.depth + 30 > C.SHIP_Z - 30 && s.x + 52 > e.x0 && s.x - 52 < e.x1 && s.y + 26 > e.y0 && s.y - 26 < e.y1) {
          if (hurt(34, 'crash')) { Game.stats.crashes++; /* shove the ship off the obstacle toward the nearer side */ s.vx += (s.x < e.x ? -1 : 1) * 700; }
        }
        continue;
      }
      if (e.t === 'pickup') {
        e.z -= sc * dt;
        if (e.z < -200) { Game.ents.splice(i, 1); continue; }
        if (!s.dead && Math.abs(e.z - C.SHIP_Z) < 90) {
          const dx = e.x - s.x, dy = e.y - s.y;
          if (dx * dx + dy * dy < 110 * 110) { collect(e); Game.ents.splice(i, 1); }
        }
        continue;
      }
      if (updateEnemy(e, dt)) { Game.ents.splice(i, 1); continue; }
      /* player lasers vs this enemy */
      if (e.dead) { Game.ents.splice(i, 1); continue; }
    }
    /* lasers against enemies, enemy shots and boxes (done after movement so z ranges are current) */
    for (let i = Game.shots.length - 1; i >= 0; i--) {
      const sh = Game.shots[i];
      let gone = false;
      for (const e of Game.ents) {
        if (e.t === 'box') {
          if (sh.z >= e.z - 20 && sh.pz <= e.z + e.depth + 20 && sh.x > e.x0 && sh.x < e.x1 && sh.y > e.y0 && sh.y < e.y1) { FX.burst(sh.x, sh.y, e.z, 4, 120, 'rgba(255,200,140,1)'); gone = true; break; }
        } else if (e.t === 'enemy' && !e.dead && e.z > 40 && sh.z >= e.z - 40 && sh.pz <= e.z + 40) {
          const spec = EN[e.kind], dx = sh.x - e.x, dy = sh.y - e.y;
          if (dx * dx + dy * dy < spec.r * spec.r) { damageEnemy(e, 1); gone = true; break; }
        }
      }
      if (!gone) for (let j = Game.eshots.length - 1; j >= 0; j--) {
        const es = Game.eshots[j];
        if (sh.z >= es.z - 30 && sh.pz <= es.z + 30 && Math.abs(sh.x - es.x) < es.r + 18 && Math.abs(sh.y - es.y) < es.r + 18) { Game.eshots.splice(j, 1); FX.burst(es.x, es.y, es.z, 8, 180, 'rgba(255,120,200,1)'); addScore(10); gone = true; break; }
      }
      if (gone) Game.shots.splice(i, 1);
    }
  }

  function collect(p) {
    const s = Game.ship;
    if (p.kind === 'star') { Game.stars++; addScore(50); snd('star'); }
    else if (p.kind === 'repair') { Game.shield = Math.min(C.SHIELD, Game.shield + 40); snd('pickup'); FX.text('REPAIR', 480, 150); }
    else if (p.kind === 'shield') { s.over = 50; snd('shield'); FX.text('OVERSHIELD', 480, 150); }
    else if (p.kind === 'boost') { Game.boost = 100; Game.boostLock = false; snd('pickup'); FX.text('BOOST', 480, 150); }
    FX.burst(p.x, p.y, p.z, 8, 120, 'rgba(255,230,120,1)');
  }

  function damageEnemy(e, n) {
    e.hp -= n; e.flash = 0.08; snd('hit');
    FX.burst(e.x, e.y, e.z, 3, 120, 'rgba(160,230,255,1)');
    if (e.hp <= 0 && !e.dead) {
      e.dead = true; Game.hits++; Game.stats.kills++;
      const spec = EN[e.kind];
      addScore(spec.score);
      FX.explosion(e.x, e.y, e.z, spec.w > 180 ? 1.7 : 1);
      snd('boom', spec.w > 180 ? 2 : 1);
      if (e.kind === 'crystal') for (let k = 0; k < 4; k++) enemyShot(e, 1.5, 480, 70);
      if (Math.random() < (e.kind === 'fighter' ? 0.22 : 0.5)) Game.ents.push({ t: 'pickup', kind: 'star', x: e.x, y: Math.max(e.y, C.FLOOR + 60), z: e.z, age: 0 });
    }
  }

  function enemyShot(e, size, speed, spread) {
    const s = Game.ship, dz = Math.max(200, e.z - C.SHIP_Z), t = dz / speed;
    let tx = s.x + U.rand(-1, 1) * (spread || 0), ty = s.y + U.rand(-1, 1) * (spread || 0) * 0.6;
    const sh = { x: e.x, y: e.y, z: e.z - 20, vx: (tx - e.x) / t, vy: (ty - e.y) / t, vz: -speed, r: 18 * size, dmg: Math.round(11 * size), size };
    Game.eshots.push(sh);
    snd('enemyShot');
  }

  /* returns true when the entity should be removed */
  function updateEnemy(e, dt) {
    const s = Game.ship, sc = Game.scroll;
    if (e.flash > 0) e.flash -= dt;
    switch (e.kind) {
      case 'fighter': {
        e.z -= (sc - e.vzo) * dt;                                   /* vzo is negative: own speed toward the camera */
        e.x = e.ox + Math.sin(e.age * 2.2 + e.ph) * e.amp;
        e.y = e.oy + Math.sin(e.age * 1.7 + e.ph * 1.3) * 34;
        if (e.z < 2200) {
          e.fire -= dt;
          if (e.fire <= 0 && e.z > 500) { e.fire = U.rand(2.2, 3.6); enemyShot(e, 1, 760, 120); }
        }
        collideShip(e, 22);
        break;
      }
      case 'twin': {
        if (e.state === 0) { e.z -= (sc - 120) * dt * 0.7; if (e.z < 1250) { e.state = 1; e.hold = 0; } }
        else if (e.state === 1) { e.z -= (sc - sc * 0.97) * dt; e.hold += dt; if (e.hold > 7) e.state = 2; }
        else e.z += 520 * dt - sc * dt * 0 ;
        if (e.state === 2 && e.z > C.ZFAR) return true;
        e.x = e.ox + Math.sin(e.age * 1.4 + e.ph) * e.amp;
        e.y = e.oy + Math.sin(e.age * 1.1) * 40;
        e.fire -= dt;
        if (e.fire <= 0 && e.z > 500 && e.z < 2400) { e.fire = 1.7; enemyShot(e, 1, 800, 40); const b = { x: e.x + 40, y: e.y }; enemyShot(Object.assign({}, e, { x: e.x - 50 }), 1, 800, 40); }
        collideShip(e, 20);
        break;
      }
      case 'gunship': {
        if (e.state === 0) { e.z -= (sc - 160) * dt * 0.7; if (e.z < 1400) { e.state = 1; e.hold = 0; } }
        else if (e.state === 1) { e.z -= sc * 0.03 * dt; e.hold += dt; if (e.hold > 9) e.state = 2; }
        else e.z += 480 * dt;
        if (e.state === 2 && e.z > C.ZFAR) return true;
        e.x = e.ox + Math.sin(e.age * 0.8) * 200;
        e.fire -= dt;
        if (e.fire <= 0 && e.z > 500 && e.z < 2400) { e.fire = 2.0; for (const dx of [-90, -30, 30, 90]) enemyShot(Object.assign({}, e, { x: e.x + dx }), 1, 700, 60); }
        collideShip(e, 30);
        break;
      }
      case 'crystal': {
        e.z -= sc * dt; e.rot += dt * 1.6;
        e.y = e.oy + Math.sin(e.age * 1.6) * 30;
        e.fire -= dt;
        if (e.fire <= 0 && e.z > 600 && e.z < 2300) { if (e.burst <= 0) { e.burst = 3; } }
        if (e.burst > 0) { e.fire -= 0; e.sub = (e.sub || 0) - dt; if (e.sub <= 0) { e.sub = 0.16; e.burst--; enemyShot(e, 1, 820, 20); if (e.burst <= 0) e.fire = 2.4; } }
        collideShip(e, 20);
        break;
      }
      case 'tank': {
        e.z -= sc * dt;
        e.fire -= dt;
        if (e.fire <= 0 && e.z > 700 && e.z < 2300) { e.fire = 2.6; enemyShot(e, 1.6, 520, 30); }
        collideShip(e, 20);
        break;
      }
      case 'mine': {
        e.z -= sc * dt; e.rot += dt;
        if (e.z < 1800 && e.z > 100) { const k = 150 * dt; e.x += clamp(s.x - e.x, -k, k); e.y += clamp(s.y - e.y, -k, k); }
        if (!s.dead && Math.abs(e.z - C.SHIP_Z) < 70) {
          const dx = e.x - s.x, dy = e.y - s.y;
          if (dx * dx + dy * dy < 100 * 100) { hurt(20, 'crash'); e.dead = true; FX.explosion(e.x, e.y, e.z, 1.2); snd('boom', 1); }
        }
        break;
      }
    }
    if (e.z < -260) return true;
    return false;
  }
  function collideShip(e, dmg) {
    const s = Game.ship;
    if (s.dead || e.dead || Math.abs(e.z - C.SHIP_Z) > 60) return;
    const r = EN[e.kind].r * 0.8 + 40, dx = e.x - s.x, dy = e.y - s.y;
    if (dx * dx + dy * dy < r * r && hurt(dmg, 'crash')) { e.hp = 0; damageEnemy(e, 99); }
  }

  /* ---------- bomb (milestone 2) ---------- */
  Game.heroXY = () => null;

  /* ---------- render hooks (see render.js) ---------- */
  Game.render = function (ctx) { G.render.scene(ctx, Game); };
  Game.drawBackdrop = function (ctx) { G.render.backdrop(ctx, Game); };
})((window.SGS = window.SGS || {}));
