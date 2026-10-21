/* Loads the cut art atlases (assets/*.webp, see tools/cut_sprites.py) and draws single frames. */
(function (G) {
  'use strict';
  const SP = { ready: false, img: {}, data: G.atlasData || {}, bg: null };
  /* frame indices */
  SP.SHIP = { LEVEL: 0, R1: 1, R2: 2, L2: 3, L1: 4, LEVEL2: 5, IDLE: 6, BOOST1: 7, BOOST2: 8, SHIELD: 9, ALT: 10, HURT: 11 };
  SP.EN = { FIGHTER: 0, TWIN: 1, GUNSHIP: 2, CRYSTAL: 3, TANK: 4, MINE: 5, P_SHIELD: 6, P_BOOST: 7, P_REPAIR: 8, STAR: 9, LASER: 10, SHOT: 11 };

  SP.load = function (done) {
    let n = 0, total = 0;
    const fin = () => { if (++n >= total) { SP.makeTints(); SP.ready = true; if (done) done(); } };
    for (const k in SP.data) {
      total++;
      const im = new Image();
      im.onload = fin; im.onerror = fin;
      im.src = SP.data[k].src + '?v=' + (G.V || 1);
      SP.img[k] = im;
    }
    total++;
    SP.bg = new Image(); SP.bg.onload = fin; SP.bg.onerror = fin; SP.bg.src = 'assets/bg_canyon.webp?v=' + (G.V || 1);
  };
  /* tinted copies of the ship sheet for the wingmates */
  SP.makeTints = function () {
    const base = SP.img.ship;
    if (!base || !base.naturalWidth) return;
    const mk = (name, col) => {
      const c = document.createElement('canvas'); c.width = base.naturalWidth; c.height = base.naturalHeight;
      const x = c.getContext('2d'); x.drawImage(base, 0, 0);
      const sil = document.createElement('canvas'); sil.width = c.width; sil.height = c.height;
      const sx = sil.getContext('2d'); sx.fillStyle = col; sx.fillRect(0, 0, c.width, c.height); sx.globalCompositeOperation = 'destination-in'; sx.drawImage(base, 0, 0);
      x.globalCompositeOperation = 'color'; x.globalAlpha = 0.7; x.drawImage(sil, 0, 0);
      SP.data[name] = SP.data.ship; SP.img[name] = c;
    };
    mk('ship_juno', '#27e6a8'); mk('ship_bram', '#5a86ff');
  };
  /* size of frame i in px */
  SP.size = (atlas, i) => { const f = SP.data[atlas].frames[i]; return { w: f[2], h: f[3] }; };
  /* draw frame i centred at (x,y) at uniform scale k; flip mirrors horizontally */
  SP.draw = function (ctx, atlas, i, x, y, k, flip, alpha, rot) {
    const d = SP.data[atlas], im = SP.img[atlas];
    if (!d || !im || (im.tagName !== 'CANVAS' && (!im.complete || !im.naturalWidth))) return;
    const f = d.frames[i], w = f[2] * k, h = f[3] * k;
    if (alpha !== undefined && alpha !== 1) ctx.globalAlpha = alpha;
    if (flip || rot) {
      ctx.save(); ctx.translate(x, y);
      if (rot) ctx.rotate(rot);
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(im, f[0], f[1], f[2], f[3], -w / 2, -h / 2, w, h);
      ctx.restore();
    } else ctx.drawImage(im, f[0], f[1], f[2], f[3], x - w / 2, y - h / 2, w, h);
    if (alpha !== undefined && alpha !== 1) ctx.globalAlpha = 1;
  };
  G.sprites = SP;
})((window.SGS = window.SGS || {}));
