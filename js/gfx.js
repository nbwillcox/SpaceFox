/* Procedural art: every sprite is drawn with canvas vector calls and cached. No image files. */
(function (G) {
  'use strict';
  const U = G.U, TAU = U.TAU;
  const GFX = { spr: {} };

  function mk(w, h, fn, scale) {
    scale = scale || 2;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale);
    const x = c.getContext('2d');
    x.scale(scale, scale);
    x.translate(w / 2, h / 2);
    x.lineJoin = 'round'; x.lineCap = 'round';
    fn(x);
    return { c, w, h };
  }
  function flashOf(s) {
    const c = document.createElement('canvas');
    c.width = s.c.width; c.height = s.c.height;
    const x = c.getContext('2d');
    x.drawImage(s.c, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(255,255,255,0.85)';
    x.fillRect(0, 0, c.width, c.height);
    return { c, w: s.w, h: s.h };
  }
  function lg(x, x0, y0, x1, y1, stops) {
    const g = x.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((s) => g.addColorStop(s[0], s[1]));
    return g;
  }
  function rg(x, cx, cy, r0, r1, stops) {
    const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1);
    stops.forEach((s) => g.addColorStop(s[0], s[1]));
    return g;
  }
  function poly(x, pts) {
    x.beginPath();
    x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.closePath();
  }
  function mirror(x, fn) {
    fn(x);
    x.save(); x.scale(-1, 1); fn(x); x.restore();
  }
  GFX.mk = mk; GFX.lg = lg; GFX.rg = rg; GFX.poly = poly; GFX.mirror = mirror; GFX.flashOf = flashOf;

  /* soft additive glow sprite, cached per colour ('rgba(r,g,b,1)') */
  const glowCache = new Map();
  GFX.glow = function (color) {
    let c = glowCache.get(color);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = rg(x, 32, 32, 0, 32, [[0, 'rgba(255,255,255,0.95)'], [0.18, color], [0.55, color.replace(/[\d.]+\)$/, '0.25)')], [1, 'rgba(0,0,0,0)']]);
    x.fillRect(0, 0, 64, 64);
    glowCache.set(color, c);
    return c;
  };
  GFX.drawGlow = function (ctx, color, px, py, r, alpha) {
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.drawImage(GFX.glow(color), px - r, py - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  };

  GFX.draw = function (ctx, s, px, py, rot, sx, sy, alpha) {
    ctx.save();
    ctx.translate(px, py);
    if (rot) ctx.rotate(rot);
    if (alpha !== undefined && alpha !== 1) ctx.globalAlpha = alpha;
    if (sx !== undefined && (sx !== 1 || sy !== 1)) ctx.scale(sx, sy === undefined ? sx : sy);
    ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
    ctx.restore();
  };

  GFX.init = function () {
    if (GFX.ready) return;
    GFX.mulberry = mulberry;
    if (GFX.initArt) GFX.initArt();
    GFX.ready = true;
  };

  /* ================= backdrop & boss hulls ================= */
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* tileable (vertically and horizontally) nebula texture for a given hue */
  GFX.nebula = function (hue) {
    const W = 512, H = 1024, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#03040d'; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'lighter';
    const rnd = mulberry(hue * 977 + 13);
    for (let i = 0; i < 16; i++) {
      const cx = rnd() * W, cy = rnd() * H, r = 110 + rnd() * 190;
      const h = hue + (rnd() - 0.5) * 70, a = 0.05 + rnd() * 0.09;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const px = cx + ox * W, py = cy + oy * H;
          if (px + r < 0 || px - r > W || py + r < 0 || py - r > H) continue;
          x.fillStyle = rg(x, px, py, 0, r, [[0, U.hsl(h, 80, 55, a)], [0.5, U.hsl(h + 20, 70, 40, a * 0.55)], [1, U.hsl(h, 60, 30, 0)]]);
          x.fillRect(px - r, py - r, r * 2, r * 2);
        }
      }
    }
    return c;
  };

  G.gfx = GFX;
})((window.SGS = window.SGS || {}));
