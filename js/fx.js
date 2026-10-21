/* World-space particles (they slide toward the camera with the rail), explosions, screen shake / flash and floating text. */
(function (G) {
  'use strict';
  const U = G.U, S = G.settings, TAU = U.TAU;
  const FX = { parts: [], texts: [], shake: 0, flash: 0, flashColor: '255,255,255' };
  const MAX = 420;
  const lim = () => (S.reduced ? 0.4 : window.TK && window.TK.on ? 0.7 : 1);

  FX.reset = function () { FX.parts.length = 0; FX.texts.length = 0; FX.shake = 0; FX.flash = 0; };
  FX.addShake = function (a) { if (S.shake && !S.reduced) FX.shake = Math.min(22, FX.shake + a); };
  FX.doFlash = function (a, c) { if (!S.reduced) { FX.flash = Math.max(FX.flash, a); FX.flashColor = c || '255,255,255'; } };

  FX.burst = function (x, y, z, n, speed, color) {
    n = Math.ceil(n * lim());
    for (let i = 0; i < n && FX.parts.length < MAX; i++) {
      const a = Math.random() * TAU, b = Math.random() * TAU, v = speed * (0.3 + Math.random() * 0.8);
      FX.parts.push({ kind: 'spark', x, y, z, vx: Math.cos(a) * Math.cos(b) * v, vy: Math.sin(b) * v, vz: Math.sin(a) * Math.cos(b) * v, t: 0, life: U.rand(0.25, 0.6), size: U.rand(5, 11), color });
    }
  };
  FX.glow = function (x, y, z, size, color, life) {
    if (FX.parts.length < MAX) FX.parts.push({ kind: 'glow', x, y, z, vx: 0, vy: 0, vz: 0, t: 0, life: life || 0.35, size, color });
  };
  FX.explosion = function (x, y, z, size) {
    FX.glow(x, y, z, 150 * size, 'rgba(255,180,80,1)', 0.45);
    FX.glow(x, y, z, 80 * size, 'rgba(255,255,255,1)', 0.25);
    FX.burst(x, y, z, 18 * size, 340 * size, 'rgba(255,170,70,1)');
    FX.burst(x, y, z, 8 * size, 220 * size, 'rgba(255,255,255,1)');
    FX.addShake(size * 2.5);
  };
  FX.text = function (str, x, y, color) { if (FX.texts.length < 10) FX.texts.push({ str, x, y, t: 0, life: 1.1, color: color || '#ffe28a' }); };

  FX.update = function (dt, scroll) {
    for (let i = FX.parts.length - 1; i >= 0; i--) {
      const p = FX.parts[i];
      p.t += dt;
      if (p.t >= p.life) { FX.parts[i] = FX.parts[FX.parts.length - 1]; FX.parts.pop(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += (p.vz - (scroll || 0)) * dt;
    }
    for (let i = FX.texts.length - 1; i >= 0; i--) { const t = FX.texts[i]; t.t += dt; t.y -= 26 * dt; if (t.t >= t.life) FX.texts.splice(i, 1); }
    FX.shake *= Math.max(0, 1 - 7 * dt);
    if (FX.shake < 0.05) FX.shake = 0;
    FX.flash = Math.max(0, FX.flash - dt * 2.2);
  };

  /* additive layer: proj(x,y,z) -> {x,y,s} */
  FX.draw = function (ctx, proj) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of FX.parts) {
      if (p.z < -150) continue;
      const q = proj(p.x, p.y, p.z), k = p.t / p.life;
      const r = Math.max(1, p.size * q.s * (p.kind === 'glow' ? 1 + k * 0.6 : 1 - k * 0.5));
      ctx.globalAlpha = (1 - k) * (p.kind === 'glow' ? 0.9 : 1);
      ctx.drawImage(G.gfx.glow(p.color), q.x - r, q.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
  FX.drawText = function (ctx) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of FX.texts) {
      const k = t.t / t.life;
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      ctx.font = '800 22px "Segoe UI", system-ui, sans-serif';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,20,0.8)'; ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  };
  G.fx = FX;
})((window.SGS = window.SGS || {}));
