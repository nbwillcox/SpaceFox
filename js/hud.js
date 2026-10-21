/* HUD, banners and the decorative side panels. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, TAU = U.TAU;
  const W = C.W, H = C.H;
  const HUD = {};
  const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif';

  const GS = 2, gcache = new Map();
  /* a glowing string is blurred once into a small canvas and cached; numbers (the score changes with every kill) are drawn digit by digit from that cache, so a new value never costs a new blur */
  function glowEntry(s, size, color, weight, glow) {
    const key = s + '|' + size + '|' + color + '|' + weight + '|' + glow;
    let e = gcache.get(key);
    if (!e) {
      if (gcache.size > 160) gcache.clear();
      const f = weight + ' ' + (size * GS) + 'px ' + FONT, c = document.createElement('canvas'), cx = c.getContext('2d');
      cx.font = f;
      const tw = cx.measureText(s).width, pad = 16 * GS;
      c.width = Math.ceil(tw + pad * 2); c.height = Math.ceil(size * GS * 1.5 + pad * 2);
      cx.font = f; cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
      cx.shadowColor = glow; cx.shadowBlur = 10 * GS; cx.fillStyle = color; cx.fillText(s, pad, pad + size * GS);
      e = { c, tw: tw / GS, pad: pad / GS, by: pad / GS + size };
      gcache.set(key, e);
    }
    return e;
  }
  function glowText(ctx, s, x, y, size, color, align, weight, glow) {
    if (s.length > 1 && /^[0-9,.+x -]+$/.test(s)) {
      const gl = []; let tw = 0;
      for (const ch of s) { const e = glowEntry(ch, size, color, weight, glow); gl.push(e); tw += e.tw; }
      let pen = x + (align === 'center' ? -tw / 2 : align === 'right' ? -tw : 0);
      for (const e of gl) { ctx.drawImage(e.c, pen - e.pad, y - e.by, e.c.width / GS, e.c.height / GS); pen += e.tw; }
      return;
    }
    const e = glowEntry(s, size, color, weight, glow), ox = align === 'center' ? -e.tw / 2 : align === 'right' ? -e.tw : 0;
    ctx.drawImage(e.c, x + ox - e.pad, y - e.by, e.c.width / GS, e.c.height / GS);
  }
  function txt(ctx, s, x, y, size, color, align, weight, glow) {
    weight = weight || 800;
    if (glow) { glowText(ctx, s, x, y, size, color, align, weight, glow); return; }
    ctx.font = weight + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }
  HUD.txt = txt;


  HUD.sides = function () { /* letterbox areas are filled with the starfield by main.js */ };

  function bar(ctx, x, y, w, h, frac, c1, c2, over) {
    ctx.fillStyle = 'rgba(0,10,30,0.7)'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(x, y, w * U.clamp(frac, 0, 1), h);
    if (over > 0) { ctx.fillStyle = 'rgba(110,200,255,0.9)'; ctx.fillRect(x, y - 4, w * U.clamp(over, 0, 1), 3); }
    ctx.strokeStyle = 'rgba(120,230,255,0.55)'; ctx.lineWidth = 1.2; ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
  }

  HUD.draw = function (ctx, g) {
    if (g.demo || !g.ship) return;
    const s = g.ship;
    const grad = ctx.createLinearGradient(0, 0, 0, 84);
    grad.addColorStop(0, 'rgba(2,4,18,0.8)'); grad.addColorStop(1, 'rgba(2,4,18,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 84);
    /* shield + boost */
    txt(ctx, 'SHIELD', 20, 20, 11, '#7de8ff', 'left', 800);
    const low = g.shield < 30;
    bar(ctx, 20, 26, 220, 12, g.shield / g.maxShield, low ? '#ff3a3a' : '#2fd6ff', low ? '#ff9a6a' : '#7dffb0', s.over / 50);
    txt(ctx, 'BOOST', 20, 56, 10, g.boostLock ? '#ff9a6a' : '#ffb347', 'left', 800);
    bar(ctx, 20, 60, 150, 6, g.boost / 100, '#ff7a2e', '#ffd24a');
    /* score / hits */
    txt(ctx, 'SCORE', W / 2, 18, 11, '#7de8ff', 'center', 800);
    txt(ctx, U.fmt(g.score), W / 2, 44, 26, '#ffffff', 'center', 800, 'rgba(120,200,255,0.8)');
    txt(ctx, 'HITS ' + g.hits + '   \u2605 ' + g.stars, W / 2, 64, 13, '#ffd24a', 'center', 800);
    /* retries and bombs */
    const rx = W - 20 - (window.TK && window.TK.on ? 56 : 0);          /* the touch pause button sits in the corner */
    txt(ctx, 'RETRIES', rx, 18, 11, '#7de8ff', 'right', 800);
    for (let i = 0; i < Math.max(0, g.retries); i++) G.sprites.draw(ctx, 'ship', 0, rx - 10 - i * 32, 36, 0.12);
    txt(ctx, 'LASER ' + ['I', 'II', 'III'][g.tier - 1] + '   BOMBS ' + g.bombs, rx, 64, 12, '#ff9a6a', 'right', 800);
    /* stage progress */
    const f = U.clamp(g.dist / (g.stage.bossAt || g.stage.length), 0, 1);
    ctx.fillStyle = 'rgba(0,10,30,0.6)'; ctx.fillRect(W / 2 - 150, H - 20, 300, 6);
    ctx.fillStyle = '#7de8ff'; ctx.fillRect(W / 2 - 150, H - 20, 300 * f, 6);
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(W / 2 - 150 + 300 * f, H - 25); ctx.lineTo(W / 2 - 150 + 300 * f + 5, H - 19); ctx.lineTo(W / 2 - 150 + 300 * f - 5, H - 19); ctx.fill();
    txt(ctx, 'STAGE ' + g.stage.n + '  ' + g.stage.name, W / 2, H - 28, 11, '#9fb7d8', 'center', 800);
    if (g.boss && !g.boss.dying && g.boss.state !== 'enter' || g.boss && g.boss.dying) {
      const b = g.boss, bw = 420, bx = W / 2 - bw / 2, by = 84;
      txt(ctx, b.name, W / 2, by - 4, 12, '#ffb08a', 'center', 800);
      ctx.fillStyle = 'rgba(0,10,30,0.7)'; ctx.fillRect(bx - 2, by, bw + 4, 12);
      const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, b.phase === 1 && b.def.armor ? '#a8b4c8' : '#ff5a3a'); gr.addColorStop(1, b.phase === 1 && b.def.armor ? '#e6eefc' : '#ffb347');
      ctx.fillStyle = gr; ctx.fillRect(bx, by + 2, bw * U.clamp(b.hp / b.maxHp, 0, 1), 8);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(bx + bw / 2 - 1, by - 1, 2, 14);
      ctx.strokeStyle = 'rgba(255,170,130,0.6)'; ctx.lineWidth = 1.2; ctx.strokeRect(bx - 2, by, bw + 4, 12);
      if (b.shield) txt(ctx, 'SHIELDED: DESTROY THE TURRETS (' + (b.gens || 0) + ' LEFT)', W / 2, by + 26, 10, '#7de8ff', 'center', 800);
      else if (b.def.armor && b.phase === 1 && !b.dying) txt(ctx, 'ARMORED: USE LOCK-ON OR DEFLECT', W / 2, by + 26, 10, '#9fb7d8', 'center', 800);
    }
    for (const w of g.ents) {
      if (w.t !== 'wing' || (w.state !== 'chased' && w.state !== 'enter')) continue;
      txt(ctx, w.who.toUpperCase() + ' UNDER ATTACK', 20, 92, 10, '#ff9a8a', 'left', 800);
      ctx.fillStyle = 'rgba(0,10,30,0.7)'; ctx.fillRect(18, 96, 154, 9);
      ctx.fillStyle = w.hp > 35 ? '#7dff9a' : '#ff6a5a'; ctx.fillRect(20, 98, 150 * U.clamp(w.hp / 100, 0, 1), 5);
      break;
    }
    if (G.input.locked() && G.input.mouseActive) {
      const mx = G.input.mx, my = G.input.my;
      ctx.save(); ctx.strokeStyle = 'rgba(255,230,140,0.95)'; ctx.lineWidth = 2; ctx.shadowColor = 'rgba(255,210,80,0.9)'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(mx, my, 9, 0, TAU);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(mx + dx * 13, my + dy * 13); ctx.lineTo(mx + dx * 21, my + dy * 21); }
      ctx.stroke(); ctx.restore();
    }
    G.comms.draw(ctx, 20, 130);
    if (g.msg) {
      const m = g.msg, k = m.t / m.dur, a = k < 0.1 ? k / 0.1 : k > 0.8 ? Math.max(0, (1 - k) / 0.2) : 1;
      ctx.globalAlpha = a;
      txt(ctx, m.title, W / 2, 190, 46, '#ffffff', 'center', 900, 'rgba(255,150,70,0.95)');
      if (m.sub) txt(ctx, m.sub, W / 2, 232, 24, '#ffd24a', 'center', 800, 'rgba(255,210,74,0.8)');
      ctx.globalAlpha = 1;
    }
    if (g.hurtT > 0) { ctx.fillStyle = 'rgba(255,40,30,' + (g.hurtT * 0.45).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
    if (g.phase === 'dead' && !g.over) txt(ctx, 'RETRY', W / 2, 260, 34, '#ff9a6a', 'center', 900, 'rgba(255,120,60,0.9)');
  };

  G.hud = HUD;
})((window.SGS = window.SGS || {}));
