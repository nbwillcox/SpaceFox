/* Boot, render pipeline (backdrop -> scene -> bloom -> HUD), fixed-step loop and app modes. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, GFX = G.gfx, A = G.audio, I = G.input, Game = G.game, UI = G.ui, HUD = G.hud;
  const W = C.W, H = C.H, STEP = 1 / 120;
  const mk = () => document.createElement('canvas');
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const scene = mk(), sctx = scene.getContext('2d');
  const b1 = mk(), b2 = mk(), b3 = mk();
  const bctx = [b1.getContext('2d'), b2.getContext('2d'), b3.getContext('2d')];
  const view = (G.view = { ox: 0, oy: 0, s: 1, w: 0, h: 0, dpr: 1, ps: 1, rs: 1 });
  const params = new URLSearchParams(location.search);
  G.debug = { stage: params.get('stage') || '', diff: params.get('diff') || '', unlock: params.get('unlock') === '1', god: params.get('god') === '1', bot: params.get('bot') === '1', lives: parseInt(params.get('lives'), 10) || 0, at: parseInt(params.get('at'), 10) || 0 };
  const WORLD_HUE = [265, 285, 330, 190, 150];
  const bg = { stars: [], hue: -1, pat: null, pat2: null, scroll: 0 };
  const M = { mode: 'title' };
  G.main = M;

  function initStars() {
    const n = U.clamp(Math.round(view.w * view.h / 6500), 90, 420);
    bg.stars = [];
    for (let i = 0; i < n; i++) bg.stars.push({ x: Math.random() * view.w, y: Math.random() * view.h, z: Math.random(), tw: Math.random() * 6 });
  }
  /* adaptive resolution: if frames run long (busy GPU/CPU) the whole canvas renders at a lower internal resolution and bloom drops out; both recover when there is headroom */
  let qual = 1, ema = 1 / 60, qT = 0;
  function setSize(c, w, h) { w = Math.max(8, w); h = Math.max(8, h); if (c.width !== w) c.width = w; if (c.height !== h) c.height = h; }
  function sizeScene() {
    view.rs = view.dpr * Math.max(0.6, qual);
    setSize(canvas, Math.round(view.w * view.rs), Math.round(view.h * view.rs));
    view.ps = Math.min(view.s * view.rs, 1.5);
    setSize(scene, Math.round(W * view.ps), Math.round(H * view.ps));
    setSize(b1, scene.width >> 1, scene.height >> 1);
    setSize(b2, scene.width >> 2, scene.height >> 2);
    setSize(b3, scene.width >> 3, scene.height >> 3);
  }
  function adapt(dt) {
    if (dt >= 0.09) return;
    ema += (dt - ema) * 0.04; qT += dt;
    if (qT < 1.2) return;
    qT = 0;
    if (ema > 0.027 && qual > 0.55) { qual = Math.max(0.55, qual - 0.15); sizeScene(); }
    else if (ema < 0.019 && qual < 1) { qual = Math.min(1, qual + 0.05); sizeScene(); }
    M.bloomOn = !(qual <= 0.6 && ema > 0.03);
  }
  M.quality = () => ({ qual: +qual.toFixed(2), ema: +ema.toFixed(4), rs: +view.rs.toFixed(2), ps: +view.ps.toFixed(2), canvas: canvas.width + 'x' + canvas.height, scene: scene.width + 'x' + scene.height, bloom: M.bloomOn !== false });
  M._adapt = adapt;
  const BGK = 0.5;
  const bgc = mk(), bgx = bgc.getContext('2d'), bgt = { hue: -1, pa: null, pb: null };
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5), w = Math.max(64, window.innerWidth), h = Math.max(64, window.innerHeight);
    const s = Math.min(w / W, h / H);
    view.w = w; view.h = h; view.dpr = dpr; view.s = s;
    view.ox = (w - W * s) / 2; view.oy = (h - H * s) / 2;
    if (window.TK) window.TK.layout(view, W, H);                           /* touch layout: a portrait playfield sits at the top of a tall phone */
    sizeScene();
    setSize(bgc, Math.ceil(w * BGK), Math.ceil(h * BGK)); bgt.hue = -1;
    initStars();
  }
  window.addEventListener('resize', resize);

  function bgTile(src, k) {
    const c = mk(); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  function drawBackground(dt) {
    if (Game.hasBackdrop && view.ox < 1 && view.oy < 1) return;
    const w = view.w, h = view.h, slow = S.reduced ? 0.3 : 1;
    const hue = WORLD_HUE[Game.world || 0];
    if (hue !== bgt.hue) { bgt.hue = hue; bgt.pa = bgx.createPattern(bgTile(GFX.nebula(hue), BGK), 'repeat'); bgt.pb = bgx.createPattern(bgTile(GFX.nebula(hue + 40), BGK * 1.7), 'repeat'); }
    bg.scroll += dt * 14 * slow;
    const bw = bgc.width, bh = bgc.height, ta = 1024 * BGK, tb = 1024 * 1.7 * BGK;
    bgx.setTransform(1, 0, 0, 1, 0, 0);
    bgx.save(); bgx.translate(0, (bg.scroll % 1024) * BGK);
    bgx.fillStyle = bgt.pa; bgx.fillRect(0, -ta, bw, bh + ta); bgx.restore();
    bgx.save(); bgx.globalCompositeOperation = 'lighter'; bgx.globalAlpha = 0.55; bgx.translate(0, ((bg.scroll * 0.6) % 1024) * BGK * 1.7);
    bgx.fillStyle = bgt.pb; bgx.fillRect(0, -tb, bw, bh + tb); bgx.restore();
    ctx.setTransform(view.rs, 0, 0, view.rs, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(bgc, 0, 0, w, h);
    for (const st of bg.stars) {
      const sp = 18 + st.z * st.z * 150;
      st.y += sp * dt * slow;
      if (st.y > h) { st.y = -4; st.x = Math.random() * w; }
      const tw = 0.65 + 0.35 * Math.sin(st.tw + bg.scroll * (1 + st.z));
      ctx.globalAlpha = (0.25 + st.z * 0.75) * tw;
      ctx.fillStyle = st.z > 0.85 ? '#bfe6ff' : st.z > 0.5 ? '#ffffff' : '#9db4e6';
      const sz = 0.7 + st.z * 1.8;
      ctx.fillRect(st.x, st.y, sz, sz * (1 + sp / 120));
    }
    ctx.globalAlpha = 1;
  }

  function render(dt) {
    if (scene.width < 16 || scene.height < 16) { resize(); return; }
    drawBackground(dt);
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, scene.width, scene.height);
    sctx.setTransform(view.ps, 0, 0, view.ps, 0, 0);
    if (FX.shake > 0) sctx.translate(U.rand(-FX.shake, FX.shake), U.rand(-FX.shake, FX.shake));
    Game.render(sctx);
    ctx.setTransform(view.rs, 0, 0, view.rs, 0, 0);
    HUD.sides(ctx, view, Game);
    ctx.save();
    ctx.translate(view.ox, view.oy); ctx.scale(view.s, view.s);
    if (Game.hasBackdrop) Game.drawBackdrop(ctx); else { ctx.fillStyle = 'rgba(2,4,16,0.42)'; ctx.fillRect(0, 0, W, H); }
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(scene, 0, 0, W, H);
    if (S.bloom && M.bloomOn !== false) {
      bctx[0].clearRect(0, 0, b1.width, b1.height); bctx[0].drawImage(scene, 0, 0, b1.width, b1.height);
      bctx[1].clearRect(0, 0, b2.width, b2.height); bctx[1].drawImage(b1, 0, 0, b2.width, b2.height);
      bctx[2].clearRect(0, 0, b3.width, b3.height); bctx[2].drawImage(b2, 0, 0, b3.width, b3.height);
      // fold the widest blur into the mid blur on the tiny canvases so only ONE full-screen additive blit is needed
      bctx[1].globalCompositeOperation = 'lighter'; bctx[1].globalAlpha = 0.85; bctx[1].drawImage(b3, 0, 0, b2.width, b2.height);
      bctx[1].globalAlpha = 1; bctx[1].globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.4; ctx.drawImage(b2, 0, 0, W, H);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    HUD.draw(ctx, Game);
    if (FX.flash > 0) { ctx.fillStyle = 'rgba(' + FX.flashColor + ',' + Math.min(0.75, FX.flash * 0.7) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    const fw = W * view.s, fh = H * view.s;
    ctx.strokeStyle = 'rgba(55,230,255,0.09)'; ctx.lineWidth = 8; ctx.strokeRect(view.ox, view.oy, fw, fh);
    ctx.strokeStyle = 'rgba(55,230,255,0.16)'; ctx.lineWidth = 4; ctx.strokeRect(view.ox, view.oy, fw, fh);
    ctx.strokeStyle = 'rgba(55,230,255,0.45)'; ctx.lineWidth = 1.5; ctx.strokeRect(view.ox, view.oy, fw, fh);
  }

  /* ---------- app modes ---------- */
  M.playStage = function (run, id) {
    A.resume();
    I.clear();
    Game.reset(false, id, run);
    Game.onOver = () => { M.mode = 'over'; G.flow.gameOver(); };
    Game.onClear = (res) => { M.mode = 'over'; G.flow.stageClear(res); };
    if (G.debug.bot) Game.bot = true;
    M.mode = 'play';
    UI.hideAll();
    A.sfx.start();
  };
  M.restartStage = function () {
    if (!Game.run || Game.demo) return;
    M.playStage(Game.run, Game.stageId);
  };
  M.startGame = function () {
    A.resume();
    I.clear();
    Game.reset(false, G.debug.stage || 1);
    Game.onOver = () => { M.mode = 'over'; UI.showGameOver(Game.score, Game.stageNo, false); };
    Game.onClear = () => { M.mode = 'over'; UI.showGameOver(Game.score, Game.stageNo, true); };
    if (G.debug.bot) Game.bot = true;
    M.mode = 'play';
    UI.hideAll();
    A.sfx.start();
  };
  M.toTitle = function () {
    Game.onOver = null;
    Game.reset(true, 1);
    M.mode = 'title';
    UI.lastIdx = -1;
    UI.show('title');
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
    A.music('title');
  };
  M.pause = function () {
    if (M.mode !== 'play') return;
    M.mode = 'pause';
    I.clear();
    if (A.ctx) A.ctx.suspend();
    UI.show('pause');
  };
  M.resume = function () {
    if (M.mode !== 'pause') return;
    M.mode = 'play';
    I.clear();
    UI.hideAll();
    if (A.ctx) A.ctx.resume();
  };

  let last = 0, acc = 0, musicKicked = false;
  M._render = (dt) => render(dt);
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - last < 10.5) return;                                  /* cap at about 60 fps on 90 / 120 / 144 Hz screens: the loop is fixed-step, so the extra frames only cost battery and heat */
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) dt = 1 / 60;
    if (M.mode === 'play' && !Game.bot) I.pollPad();
    if (dt > 0.1) dt = 0.1;
    adapt(dt);
    if (dt > 0.05) dt = 0.05;
    if (!musicKicked && A.ready && M.mode === 'title') { musicKicked = true; A.music('title'); }
    if (M.mode === 'pause') { if (I.takePause()) M.resume(); }
    else {
      acc += dt;
      while (acc >= STEP) {
        if (M.mode === 'play' && I.takePause()) { M.pause(); acc = 0; break; }
        if (M.mode !== 'play') { I.takePause(); I.takeLaunch(); }
        Game.update(STEP);
        acc -= STEP;
      }
    }
    render(dt);
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) M.pause(); });
  window.addEventListener('blur', () => M.pause());
  I.bind(canvas);

  function boot() {
    const ld = document.getElementById('loading'); if (ld) ld.remove();
    GFX.init();
    resize();
    Game.reset(true, 1);
    UI.show('title');
    requestAnimationFrame((t) => { last = t; frame(t); });
  }
  G.sprites.load(boot);
})((window.SGS = window.SGS || {}));
