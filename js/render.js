/* Drawing: the canyon backdrop (painting + perspective water and rock walls), then every entity back to front. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, SP = G.sprites, TAU = U.TAU, clamp = U.clamp;
  const R = {};
  const HAZE = [150, 108, 176];
  const ROCK = [[198, 96, 50], [176, 82, 46], [214, 118, 64], [150, 72, 52]];
  const BOX_COL = [[170, 84, 52], [128, 100, 140], [200, 150, 96]];

  const hash = (n) => { n = (n | 0) * 374761393 + 668265263; n = (n ^ (n >> 13)) * 1274126177; return (((n ^ (n >> 16)) >>> 0) % 10000) / 10000; };
  const mixc = (c, f, k) => 'rgb(' + Math.round(c[0] + (f[0] - c[0]) * k) + ',' + Math.round(c[1] + (f[1] - c[1]) * k) + ',' + Math.round(c[2] + (f[2] - c[2]) * k) + ')';
  const wallW = (zAbs) => C.WALL + 230 * Math.sin(zAbs * 0.00035) + 130 * Math.sin(zAbs * 0.0011 + 1.3);
  R.wallW = wallW;

  function floorY(g, z) { return C.VY + (C.EYE + g.cam.y - C.FLOOR) * C.F / (C.F + z); }

  /* ---------- backdrop ---------- */
  /* canyon-family themes share one renderer: a painted or gradient sky, a floor (water or lava) and two rock walls */
  const THEMES = {
    canyon: { img: 'bg', haze: HAZE, rock: ROCK, floor: ['#3fc9cf', '#1e93b0', '#0a4f7a'], band: '190,245,255', foam: '210,250,255', glint: [90, 110, 255], strata: 'dark', box: BOX_COL, wall: C.WALL },
    water: { img: 'tint', haze: [130, 160, 205], rock: [[120, 138, 168], [100, 122, 156], [136, 152, 180], [88, 108, 142]], floor: ['#5ee0d2', '#1fa6b8', '#0b5a86'], band: '200,250,255', foam: '225,252,255', glint: [120, 255, 230], strata: 'dark', box: [[104, 120, 150], [86, 140, 160], [150, 170, 200]], wall: 1050 },
    tunnel: { haze: [6, 8, 20], box: [[64, 78, 118], [86, 60, 124], [96, 108, 150]] },
    space: { haze: [10, 6, 30], box: [[90, 86, 120], [90, 86, 120], [90, 86, 120]] },
    foundry: { img: null, sky: ['#14070b', '#3a0f10', '#8a2a10'], haze: [120, 48, 34], rock: [[74, 62, 66], [88, 72, 70], [60, 54, 62], [100, 76, 66]], floor: ['#ffb03a', '#e0521a', '#7a1a0a'], band: '255,215,120', foam: '255,230,150', glint: [255, 130, 40], strata: 'glow', box: [[98, 84, 82], [140, 70, 50], [120, 100, 90]], wall: 820 },
  };
  const tinted = { c: null };
  function tintedBg() {
    if (tinted.c) return tinted.c;
    const im = SP.bg;
    if (!im || !im.complete || !im.naturalWidth) return null;
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    x.globalCompositeOperation = 'color'; x.globalAlpha = 0.6; x.fillStyle = '#3f86e8';          /* recolour toward a cool blue, keeping the painting's light and shadow */
    x.fillRect(0, 0, c.width, c.height);
    tinted.c = c;
    return c;
  }

  function wallWidth(th, zAbs) { return th.wall + 230 * Math.sin(zAbs * 0.00035) + 130 * Math.sin(zAbs * 0.0011 + 1.3); }

  function backdropCanyon(ctx, g, th) {
    const W = C.W, H = C.H, dist = g.dist;
    ctx.fillStyle = '#1b1236'; ctx.fillRect(0, 0, W, H);
    const img = th.img === 'bg' ? SP.bg : th.img === 'tint' ? tintedBg() : null;
    if (img && (img.complete !== false) && (img.naturalWidth || img.width)) {
      const w = 1180, h = w * (img.naturalHeight || img.height) / (img.naturalWidth || img.width);
      ctx.drawImage(img, (W - w) / 2 - g.cam.x * 0.06, C.VY - h * 0.645 - g.cam.y * 0.04, w, h);
    } else if (th.sky) {
      const sk = ctx.createLinearGradient(0, 0, 0, C.VY + 20);
      sk.addColorStop(0, th.sky[0]); sk.addColorStop(0.6, th.sky[1]); sk.addColorStop(1, th.sky[2]);
      ctx.fillStyle = sk; ctx.fillRect(0, 0, W, C.VY + 20);
      /* a smoky glow at the horizon */
      const hg = ctx.createRadialGradient(C.VX - g.cam.x * 0.06, C.VY, 10, C.VX, C.VY, 420);
      hg.addColorStop(0, 'rgba(255,170,70,0.7)'); hg.addColorStop(1, 'rgba(255,100,40,0)');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, C.VY + 40);
    }
    /* floor */
    const grd = ctx.createLinearGradient(0, C.VY, 0, H);
    grd.addColorStop(0, th.floor[0]); grd.addColorStop(0.35, th.floor[1]); grd.addColorStop(1, th.floor[2]);
    ctx.fillStyle = grd; ctx.fillRect(0, C.VY, W, H - C.VY);
    /* moving light bands */
    const len = 190, base = Math.floor(dist / len);
    for (let k = 30; k >= 0; k--) {
      const idx = base + k;
      if (idx & 1) continue;
      const zA = idx * len - dist, zB = zA + len * 0.55;
      if (zB < -60) continue;
      const ya = floorY(g, Math.max(zA, -60)), yb = floorY(g, zB), f = clamp(1 - zA / C.ZFAR, 0, 1);
      ctx.fillStyle = 'rgba(' + th.band + ',' + (0.05 + 0.11 * f * f).toFixed(3) + ')';
      ctx.fillRect(0, yb, W, ya - yb);
    }
    /* rock walls, far to near */
    const L = 110, wb = Math.floor(dist / L) * L;
    for (let i = 30; i >= 0; i--) {
      const zAbsA = wb + i * L, zA = zAbsA - dist, zB = zA + L;
      if (zB < -50) continue;
      const za = Math.max(zA, -50);
      for (let side = -1; side <= 1; side += 2) {
        const xa = side * wallWidth(th, zAbsA), xb = side * wallWidth(th, zAbsA + L);
        const a0 = g.proj(xa, C.FLOOR, za), a1 = g.proj(xa, C.FLOOR + 1500, za), b0 = g.proj(xb, C.FLOOR, zB), b1 = g.proj(xb, C.FLOOR + 1500, zB);
        const hsh = hash(Math.floor(zAbsA / L) * 2 + (side > 0 ? 1 : 0)), fog = 0.85 * Math.pow(clamp(za / C.ZFAR, 0, 1), 1.3);
        const col = th.rock[(hsh * 4) | 0], lit = side < 0 ? 1.06 : 0.78;
        const c = [col[0] * lit + hsh * 14, col[1] * lit + hsh * 8, col[2] * lit];
        ctx.fillStyle = mixc(c, th.haze, fog);
        ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(b0.x, b0.y); ctx.closePath(); ctx.fill();
        /* strata (dark seams) or glowing seams in the foundry */
        const glow = th.strata === 'glow';
        ctx.strokeStyle = glow ? 'rgba(255,' + (110 + hsh * 60 | 0) + ',40,' + (0.85 * (1 - fog)).toFixed(2) + ')' : mixc([c[0] * 0.55, c[1] * 0.5, c[2] * 0.55], th.haze, fog);
        ctx.lineWidth = Math.max(1, (glow ? 4 : 3) * a0.s);
        for (let y = 170; y < 1200; y += 190 + hsh * 60) {
          const p = g.proj(xa, C.FLOOR + y, za), q = g.proj(xb, C.FLOOR + y, zB);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
        /* waterline foam / lava glow */
        const f0 = g.proj(xa, C.FLOOR + 36, za), f1 = g.proj(xb, C.FLOOR + 36, zB);
        ctx.fillStyle = 'rgba(' + th.foam + ',' + (0.42 * (1 - fog)).toFixed(2) + ')';
        ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(f0.x, f0.y); ctx.lineTo(f1.x, f1.y); ctx.lineTo(b0.x, b0.y); ctx.closePath(); ctx.fill();
        /* crystal glints / vents */
        if (hsh > 0.84) {
          const cy = C.FLOOR + 160 + hsh * 380, m = g.proj(xa + (xb - xa) * 0.5, cy, za + L * 0.5), sz = 70 * m.s;
          ctx.fillStyle = mixc(th.glint, th.haze, fog);
          ctx.beginPath(); ctx.moveTo(m.x, m.y - sz * 1.3); ctx.lineTo(m.x + sz * 0.5, m.y); ctx.lineTo(m.x, m.y + sz * 0.5); ctx.lineTo(m.x - sz * 0.5, m.y); ctx.closePath(); ctx.fill();
        }
      }
    }
    const hz = ctx.createLinearGradient(0, C.VY - 60, 0, C.VY + 70);
    hz.addColorStop(0, 'rgba(' + th.haze.join(',') + ',0)'); hz.addColorStop(0.5, 'rgba(' + th.haze.join(',') + ',0.35)'); hz.addColorStop(1, 'rgba(' + th.haze.join(',') + ',0)');
    ctx.fillStyle = hz; ctx.fillRect(0, C.VY - 60, C.W, 130);
  }

  /* open space: nebula glow and a field of star streaks flying past */
  const STARS = (function () { const out = []; let a = 12345; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; for (let i = 0; i < 170; i++) out.push({ x: (r() - 0.5) * 5200, y: (r() - 0.5) * 3000, z: r() * 3600, c: r() }); return out; })();
  function backdropSpace(ctx, g) {
    const W = C.W, H = C.H;
    const bgk = ctx.createLinearGradient(0, 0, 0, H);
    bgk.addColorStop(0, '#07041a'); bgk.addColorStop(0.55, '#150a35'); bgk.addColorStop(1, '#0a0f2a');
    ctx.fillStyle = bgk; ctx.fillRect(0, 0, W, H);
    const blobs = [[0.22, 0.38, 380, 'rgba(160,60,220,0.28)'], [0.8, 0.3, 330, 'rgba(50,140,255,0.22)'], [0.5, 0.55, 460, 'rgba(255,80,140,0.14)']];
    for (const [bx, by, br, col] of blobs) {
      const gx = bx * W - g.cam.x * 0.05, gy = by * H - g.cam.y * 0.04;
      const gr = ctx.createRadialGradient(gx, gy, 10, gx, gy, br); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    }
    for (const st of STARS) {
      const z = ((st.z - g.dist * 0.9) % 3600 + 3600) % 3600;
      const p = g.proj(st.x, st.y, z), q = g.proj(st.x, st.y, z + 70 + g.scroll * 0.08);
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;
      const a = clamp(1 - z / 3600, 0.08, 1);
      ctx.strokeStyle = st.c > 0.8 ? 'rgba(160,220,255,' + a + ')' : st.c > 0.4 ? 'rgba(255,255,255,' + a + ')' : 'rgba(255,190,150,' + a + ')';
      ctx.lineWidth = Math.max(0.8, 2.6 * p.s);
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
  }

  /* a dead station corridor: four lit panel planes closing in toward a dark far end */
  const TUN = { w: 720 };
  function backdropTunnel(ctx, g) {
    const W = C.W, H = C.H, dist = g.dist, L = 120, wb = Math.floor(dist / L) * L, BLK = [6, 8, 20];
    ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, W, H);
    for (let i = 28; i >= 0; i--) {
      const zAbsA = wb + i * L, zA = zAbsA - dist, zB = zA + L;
      if (zB < -50) continue;
      const za = Math.max(zA, -50), idx = Math.floor(zAbsA / L), fog = Math.pow(clamp(za / (C.ZFAR * 0.9), 0, 1), 1.1);
      const lit = idx % 5 === 0, hsh = hash(idx * 3);
      const planes = [
        { n: 'floor', pts: [[-TUN.w, C.FLOOR], [TUN.w, C.FLOOR]], base: [34, 44, 72] },
        { n: 'ceil', pts: [[-TUN.w, C.CEIL], [TUN.w, C.CEIL]], base: [28, 36, 62] },
      ];
      for (const pl of planes) {
        const a = g.proj(pl.pts[0][0], pl.pts[0][1], za), b2 = g.proj(pl.pts[1][0], pl.pts[1][1], za), c2 = g.proj(pl.pts[1][0], pl.pts[1][1], zB), d2 = g.proj(pl.pts[0][0], pl.pts[0][1], zB);
        ctx.fillStyle = mixc([pl.base[0] + hsh * 14, pl.base[1] + hsh * 14, pl.base[2] + hsh * 18], BLK, fog);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(d2.x, d2.y); ctx.closePath(); ctx.fill();
        /* centre light strip */
        const sa = g.proj(-60, pl.pts[0][1], za), sb = g.proj(60, pl.pts[0][1], za), sc = g.proj(60, pl.pts[0][1], zB), sd = g.proj(-60, pl.pts[0][1], zB);
        ctx.fillStyle = lit ? mixc([120, 240, 255], BLK, fog) : mixc([40, 70, 110], BLK, fog);
        ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y); ctx.lineTo(sc.x, sc.y); ctx.lineTo(sd.x, sd.y); ctx.closePath(); ctx.fill();
      }
      for (let side = -1; side <= 1; side += 2) {
        const x = side * TUN.w, a = g.proj(x, C.FLOOR, za), b2 = g.proj(x, C.CEIL, za), c2 = g.proj(x, C.CEIL, zB), d2 = g.proj(x, C.FLOOR, zB);
        ctx.fillStyle = mixc([(side < 0 ? 50 : 38) + hsh * 12, (side < 0 ? 62 : 48) + hsh * 12, (side < 0 ? 98 : 80) + hsh * 16], BLK, fog);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(d2.x, d2.y); ctx.closePath(); ctx.fill();
        /* window strip + frame lines */
        const w0 = g.proj(x, C.FLOOR + 190, za), w1 = g.proj(x, C.FLOOR + 330, za), w2 = g.proj(x, C.FLOOR + 330, zB), w3 = g.proj(x, C.FLOOR + 190, zB);
        ctx.fillStyle = lit ? mixc([255, 120, 220], BLK, fog) : mixc([30, 40, 80], BLK, fog);
        ctx.beginPath(); ctx.moveTo(w0.x, w0.y); ctx.lineTo(w1.x, w1.y); ctx.lineTo(w2.x, w2.y); ctx.lineTo(w3.x, w3.y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = mixc([90, 120, 190], BLK, fog); ctx.lineWidth = Math.max(1, 2.5 * a.s);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
      }
    }
    const vg = ctx.createRadialGradient(C.VX, C.VY + 30, 10, C.VX, C.VY + 30, 260);
    vg.addColorStop(0, 'rgba(120,180,255,0.35)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  R.backdrop = function (ctx, g) {
    const t = (g.stage && g.stage.theme) || 'canyon';
    if (t === 'space') backdropSpace(ctx, g);
    else if (t === 'tunnel') backdropTunnel(ctx, g);
    else backdropCanyon(ctx, g, THEMES[t] || THEMES.canyon);
  };

  /* ---------- boxes (pillars, arches, barriers) ---------- */
  function drawBox(ctx, g, e) {
    const z0 = Math.max(e.z, -120), z1 = e.z + e.depth;
    if (z1 < -120) return;
    const th = THEMES[(g.stage && g.stage.theme)] || THEMES.canyon, hz = th.haze;
    const fog = 0.85 * Math.pow(clamp(z0 / C.ZFAR, 0, 1), 1.3), base = (th.box || BOX_COL)[e.color % 3];
    const eyeX = g.cam.x, eyeY = C.EYE + g.cam.y;
    const P = (x, y, z) => g.proj(x, y, z);
    const poly = (pts, fill, edge) => {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, 2 * pts[0].s); ctx.stroke();
    };
    const edge = mixc([base[0] * 0.5, base[1] * 0.5, base[2] * 0.55], hz, fog);
    if (e.y1 < eyeY) poly([P(e.x0, e.y1, z0), P(e.x1, e.y1, z0), P(e.x1, e.y1, z1), P(e.x0, e.y1, z1)], mixc([base[0] * 1.2, base[1] * 1.2, base[2] * 1.2], hz, fog), edge);
    if (e.x0 > eyeX) poly([P(e.x0, e.y0, z0), P(e.x0, e.y1, z0), P(e.x0, e.y1, z1), P(e.x0, e.y0, z1)], mixc([base[0] * 0.8, base[1] * 0.8, base[2] * 0.85], hz, fog), edge);
    if (e.x1 < eyeX) poly([P(e.x1, e.y0, z0), P(e.x1, e.y1, z0), P(e.x1, e.y1, z1), P(e.x1, e.y0, z1)], mixc([base[0] * 0.65, base[1] * 0.65, base[2] * 0.7], hz, fog), edge);
    poly([P(e.x0, e.y0, z0), P(e.x1, e.y0, z0), P(e.x1, e.y1, z0), P(e.x0, e.y1, z0)], mixc(base, hz, fog), edge);
  }

  /* ---------- the ship ---------- */
  const ROLLSEQ = [1, 2, 3, 4, 0];
  function shipFrame(g) {
    const s = g.ship, F = SP.SHIP;
    if (s.rollT > 0) { const k = 1 - s.rollT / 0.5; return { f: ROLLSEQ[Math.min(4, (k * 5) | 0)], flip: s.rollDir < 0 }; }
    if (g.hurtT > 0 && ((g.t * 20) | 0) % 2) return { f: F.HURT, flip: false };
    const b = s.bank;
    if (b > 0.55) return { f: F.R2, flip: false };
    if (b > 0.2) return { f: F.R1, flip: false };
    if (b < -0.55) return { f: F.L2, flip: false };
    if (b < -0.2) return { f: F.L1, flip: false };
    if (s.boosting) return { f: ((g.t * 18) | 0) % 2 ? F.BOOST2 : F.BOOST1, flip: false };
    if (g.shield < 30) return { f: F.HURT, flip: false };
    return { f: F.LEVEL, flip: false };
  }
  function drawShip(ctx, g) {
    const s = g.ship;
    if (s.dead) return;
    const q = g.proj(s.x, s.y, C.SHIP_Z), k = 0.62 * q.s;
    /* shadow on the water */
    const sh = g.proj(s.x, C.FLOOR, C.SHIP_Z), hgt = s.y - C.FLOOR;
    if (g.stage.theme !== 'space') ctx.fillStyle = 'rgba(0,20,40,' + (0.38 * (1 - clamp(hgt / 520, 0, 0.8))).toFixed(2) + ')';
    if (g.stage.theme !== 'space') { ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 70 * sh.s * (1 - clamp(hgt / 900, 0, 0.5)), 15 * sh.s, 0, 0, TAU); ctx.fill(); }
    const fr = shipFrame(g);
    let alpha = 1;
    if (s.inv > 0 && s.rollT <= 0 && g.hurtT <= 0) alpha = ((g.t * 14) | 0) % 2 ? 0.4 : 1;
    if (g.phase === 'intro') alpha = Math.min(1, g.phaseT / 0.8);
    /* engine glow */
    ctx.globalCompositeOperation = 'lighter';
    const eg = s.boosting ? 1 : 0.55;
    for (const ex of [-0.19, 0.19]) { ctx.globalAlpha = 0.55 * eg * alpha; ctx.drawImage(G.gfx.glow('rgba(80,200,255,1)'), q.x + ex * 274 * k - 40 * k * 2.2, q.y + 8 * k - 40 * k * 2.2, 80 * k * 2.2, 80 * k * 2.2); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    SP.draw(ctx, 'ship', fr.f, q.x, q.y, k, fr.flip, alpha);
    if (s.over > 0) { ctx.globalCompositeOperation = 'lighter'; SP.draw(ctx, 'ship', SP.SHIP.SHIELD, q.x, q.y, k * 1.02, false, 0.55 + 0.25 * Math.sin(g.t * 8)); ctx.globalCompositeOperation = 'source-over'; }
  }

  /* ---------- scene ---------- */
  R.scene = function (ctx, g) {
    if (!g.ship) return;
    drawLane(ctx, g);
    const list = [];
    for (const e of g.ents) list.push(e);
    for (const e of g.eshots) list.push({ t: 'eshot', z: e.z, e });
    for (const e of g.shots) list.push({ t: 'laser', z: e.z, e });
    for (const e of g.missiles) if (e.age >= 0) list.push({ t: 'missile', z: e.z, e });
    for (const e of g.refl) list.push({ t: 'refl', z: e.z, e });
    list.push({ t: 'ship', z: C.SHIP_Z });
    list.sort((a, b) => (b.t === 'box' ? b.z + b.depth * 0.5 : b.z) - (a.t === 'box' ? a.z + a.depth * 0.5 : a.z));
    for (const it of list) {
      switch (it.t) {
        case 'ship': drawShip(ctx, g); break;
        case 'box': drawBox(ctx, g, it); break;
        case 'laser': drawLaser(ctx, g, it.e); break;
        case 'missile': drawMissile(ctx, g, it.e); break;
        case 'refl': drawRefl(ctx, g, it.e); break;
        case 'eshot': drawEShot(ctx, g, it.e); break;
        case 'pickup': drawPickup(ctx, g, it); break;
        case 'enemy': drawEnemy(ctx, g, it); break;
      }
    }
    G.fx.draw(ctx, g.proj);
    if (!g.ship.dead && g.phase !== 'over') { drawLocks(ctx, g); drawReticle(ctx, g); drawCharge(ctx, g); }
    if (g.bombFx) drawBombFx(ctx, g);
    G.fx.drawText(ctx);
  };

  function drawLaser(ctx, g, sh) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    if (sh.big) {
      const p = g.proj(sh.x, sh.y, sh.z), r = 70 * p.s;
      ctx.drawImage(G.gfx.glow('rgba(90,200,255,1)'), p.x - r * 2, p.y - r * 2, r * 4, r * 4);
      ctx.drawImage(G.gfx.glow('rgba(255,255,255,1)'), p.x - r, p.y - r, r * 2, r * 2);
      ctx.globalCompositeOperation = 'source-over';
      return;
    }
    for (const ox of (sh.dmg > 1 ? [-5, 5] : [-5, 5])) {
      const p = g.proj(sh.x + ox, sh.y, sh.z), q = g.proj(sh.x + ox, sh.y, Math.max(-100, sh.z - 220));
      ctx.strokeStyle = sh.dmg > 1 ? 'rgba(255,170,70,0.9)' : 'rgba(60,190,255,0.85)'; ctx.lineWidth = Math.max(2, (sh.dmg > 1 ? 11 : 8) * p.s);
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(230,250,255,1)'; ctx.lineWidth = Math.max(1, 3.5 * p.s);
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawEShot(ctx, g, sh) {
    const q = g.proj(sh.x, sh.y, sh.z), r = sh.r * 2.6 * q.s;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(G.gfx.glow('rgba(255,70,170,1)'), q.x - r * 1.5, q.y - r * 1.5, r * 3, r * 3);
    ctx.globalCompositeOperation = 'source-over';
    const ang = Math.atan2(q.y - C.VY, q.x - C.VX);
    const k = (sh.r * 3.4 / SP.size('enemy', 11).w) * q.s * 1.6;
    SP.draw(ctx, 'enemy', SP.EN.SHOT, q.x, q.y, k, false, 1, ang);
  }
  const icons = {};
  function pickupIcon(kind) {
    if (icons[kind]) return icons[kind];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); x.translate(64, 64); x.lineJoin = 'round'; x.lineCap = 'round';
    const col = { bomb: ['#ff9a3d', '#ffd9a0', '#7a2c00'], laser: ['#37c6ff', '#c8f2ff', '#06406a'], life: ['#ffd24a', '#fff2b0', '#6a4a00'] }[kind];
    x.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; x.lineTo(Math.cos(a) * 58, Math.sin(a) * 58); } x.closePath();
    const g = x.createLinearGradient(0, -58, 0, 58); g.addColorStop(0, col[1]); g.addColorStop(0.5, col[0]); g.addColorStop(1, col[2]);
    x.fillStyle = g; x.fill(); x.strokeStyle = '#e8f4ff'; x.lineWidth = 5; x.stroke();
    x.fillStyle = 'rgba(8,12,30,0.88)'; x.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; x.lineTo(Math.cos(a) * 42, Math.sin(a) * 42); } x.closePath(); x.fill();
    x.strokeStyle = col[1]; x.fillStyle = col[1]; x.lineWidth = 6;
    if (kind === 'bomb') { x.beginPath(); x.arc(0, 6, 17, 0, 6.3); x.fill(); x.beginPath(); x.moveTo(8, -8); x.quadraticCurveTo(16, -22, 24, -20); x.stroke(); x.fillStyle = '#ffec9a'; x.beginPath(); x.arc(26, -22, 5, 0, 6.3); x.fill(); }
    else if (kind === 'laser') { x.beginPath(); x.moveTo(-12, -22); x.lineTo(-12, 22); x.moveTo(12, -22); x.lineTo(12, 22); x.stroke(); x.beginPath(); x.moveTo(-12, -22); x.lineTo(-18, -10); x.moveTo(12, -22); x.lineTo(18, -10); x.stroke(); }
    else { x.beginPath(); x.moveTo(0, -24); x.lineTo(20, 18); x.lineTo(0, 8); x.lineTo(-20, 18); x.closePath(); x.fill(); }
    return (icons[kind] = c);
  }
  function drawPickup(ctx, g, p) {
    if (p.z < -150) return;
    if (p.kind === 'bomb' || p.kind === 'laser' || p.kind === 'life') {
      const q = g.proj(p.x, p.y, p.z), fa = clamp((C.ZFAR - p.z) / 500, 0, 1), bob = Math.sin(p.age * 4) * 6 * q.s, w = 84 * q.s;
      ctx.globalCompositeOperation = 'lighter';
      const col = p.kind === 'bomb' ? 'rgba(255,150,60,1)' : p.kind === 'laser' ? 'rgba(60,190,255,1)' : 'rgba(255,210,80,1)';
      ctx.globalAlpha = 0.5 * fa; ctx.drawImage(G.gfx.glow(col), q.x - w * 1.5, q.y + bob - w * 1.5, w * 3, w * 3);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fa; ctx.drawImage(pickupIcon(p.kind), q.x - w / 2, q.y + bob - w / 2, w, w); ctx.globalAlpha = 1;
      return;
    }
    const q = g.proj(p.x, p.y, p.z), spec = { star: { f: 9, w: 74 }, shield: { f: 6, w: 84 }, boost: { f: 7, w: 80 }, repair: { f: 8, w: 80 } }[p.kind];
    const fa = clamp((C.ZFAR - p.z) / 500, 0, 1), bob = Math.sin(p.age * 4) * 6 * q.s;
    ctx.globalCompositeOperation = 'lighter';
    const r = spec.w * 1.5 * q.s;
    ctx.globalAlpha = 0.5 * fa; ctx.drawImage(G.gfx.glow(p.kind === 'star' ? 'rgba(255,210,80,1)' : p.kind === 'repair' ? 'rgba(80,255,150,1)' : p.kind === 'boost' ? 'rgba(255,160,50,1)' : 'rgba(80,170,255,1)'), q.x - r, q.y + bob - r, r * 2, r * 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const sx = p.kind === 'star' ? Math.abs(Math.cos(p.age * 3)) * 0.6 + 0.4 : 1;
    ctx.save(); ctx.translate(q.x, q.y + bob); ctx.scale(sx, 1);
    SP.draw(ctx, 'enemy', spec.f, 0, 0, (spec.w / SP.size('enemy', spec.f).w) * q.s, false, fa);
    ctx.restore();
  }
  function drawEnemy(ctx, g, e) {
    if (e.dead) return;
    const spec = e.def || g.EN[e.kind], q = g.proj(e.x, e.y, e.z);
    if (e.z < -200) return;
    if (spec.proc) { drawRock(ctx, g, e, spec, q); return; }
    const fa = clamp((C.ZFAR - e.z) / 500, 0, 1);
    const atl = spec.atlas || 'enemy', k = (spec.w / SP.size(atl, spec.frame).w) * q.s;
    let rot = 0;
    if (e.boss) { rot = Math.sin(e.age * 0.6) * 0.035; drawBossShadow(ctx, g, e); }
    if (e.kind === 'fighter') rot = Math.cos(e.age * 2.2 + e.ph) * 0.28 * (e.amp > 100 ? 1 : 0.4);
    else if (e.kind === 'mine' || e.kind === 'crystal') rot = e.kind === 'mine' ? e.rot : Math.sin(e.rot) * 0.2;
    SP.draw(ctx, atl, spec.frame, q.x, q.y, k, false, fa, rot);
    if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; SP.draw(ctx, atl, spec.frame, q.x, q.y, k, false, 0.7 * fa, rot); ctx.globalCompositeOperation = 'source-over'; }
    if (e.boss && e.def.furnace && e.phase === 2 && !e.dying) {                      /* the open furnace glows */
      const h = SP.size(atl, spec.frame).h * k, r = 150 * q.s * (1 + 0.1 * Math.sin(g.t * 9));
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.75;
      ctx.drawImage(G.gfx.glow('rgba(255,150,50,1)'), q.x - 0.5 * r * 1.2 - 8 * q.s, q.y - h * 0.02 - r, r * 2.4, r * 2);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }
  function drawMissile(ctx, g, m) {
    const p = g.proj(m.x, m.y, m.z), q = g.proj(m.x, m.y, Math.max(-100, m.z - 260)), r = 38 * p.s;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,170,70,0.8)'; ctx.lineWidth = Math.max(2, 12 * p.s); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.drawImage(G.gfx.glow('rgba(255,210,120,1)'), p.x - r * 1.6, p.y - r * 1.6, r * 3.2, r * 3.2);
    ctx.drawImage(G.gfx.glow('rgba(255,255,255,1)'), p.x - r * 0.6, p.y - r * 0.6, r * 1.2, r * 1.2);
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawRefl(ctx, g, r) {
    const p = g.proj(r.x, r.y, r.z), s = 52 * r.size * p.s;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(G.gfx.glow('rgba(110,225,255,1)'), p.x - s * 1.5, p.y - s * 1.5, s * 3, s * 3);
    ctx.drawImage(G.gfx.glow('rgba(255,255,255,1)'), p.x - s * 0.5, p.y - s * 0.5, s, s);
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawLocks(ctx, g) {
    const s = g.ship;
    if (!s.charging) return;
    ctx.save(); ctx.lineWidth = 2.5;
    const nose = g.proj(s.x, s.y, C.SHIP_Z + 60);
    s.locks.forEach((e, i) => {
      const q = g.proj(e.x, e.y, e.z), r = Math.max(14, g.EN[e.kind].r * 1.15 * q.s), pulse = 1 + 0.12 * Math.sin(g.t * 18 + i);
      ctx.strokeStyle = 'rgba(255,110,80,1)'; ctx.globalAlpha = 1; ctx.lineWidth = 3.5;
      const b = r * pulse, c = b * 0.45;
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(q.x + sx * b, q.y + sy * (b - c)); ctx.lineTo(q.x + sx * b, q.y + sy * b); ctx.lineTo(q.x + sx * (b - c), q.y + sy * b); }
      ctx.stroke();
      ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(nose.x, nose.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    });
    ctx.restore();
  }
  function drawCharge(ctx, g) {
    const s = g.ship;
    if (!s.charging) return;
    const q = g.proj(s.x, s.y, C.SHIP_Z + 70), k = s.chargeT / 1.4, r = (14 + 34 * k) * q.s * 1.7;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.4 + 0.5 * k; ctx.drawImage(G.gfx.glow(k > 0.7 ? 'rgba(255,220,120,1)' : 'rgba(90,200,255,1)'), q.x - r * 2.2, q.y - r * 2.2, r * 4.4, r * 4.4);
    ctx.globalAlpha = 1; ctx.strokeStyle = k > 0.7 ? 'rgba(255,230,140,0.95)' : 'rgba(150,230,255,0.9)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(q.x, q.y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, k)); ctx.stroke();
    ctx.restore();
  }
  function drawBombFx(ctx, g) {
    const b = g.bombFx, k = b.t / 0.7, q = g.proj(b.x, b.y, C.SHIP_Z);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = 'rgba(255,220,150,1)'; ctx.lineWidth = 16 * (1 - k) + 2;
    ctx.beginPath(); ctx.arc(q.x, q.y, 60 + k * 900, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,150,60,1)'; ctx.lineWidth = 8 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(q.x, q.y, 30 + k * 640, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  /* procedural asteroids: a lumpy polygon with shading and craters, cached per variant and theme */
  const rockCache = {};
  function rockTex(v, theme) {
    const key = v + theme;
    if (rockCache[key]) return rockCache[key];
    const c = document.createElement('canvas'); c.width = c.height = 200;
    const x = c.getContext('2d'); x.translate(100, 100);
    let a = 977 + v * 131; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    const pal = theme === 'foundry' ? ['#8a6a5a', '#4a3430', '#1c1214'] : theme === 'tunnel' ? ['#7d8aa8', '#3c4660', '#12172a'] : ['#b09478', '#6a5444', '#241a14'];
    x.beginPath();
    const n = 18, pts = [];
    for (let i = 0; i < n; i++) { const an = i / n * TAU, rad = 74 + r() * 22; pts.push([Math.cos(an) * rad, Math.sin(an) * rad]); }
    x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath();
    const g2 = x.createRadialGradient(-30, -34, 8, 0, 0, 100); g2.addColorStop(0, pal[0]); g2.addColorStop(0.55, pal[1]); g2.addColorStop(1, pal[2]);
    x.fillStyle = g2; x.fill(); x.strokeStyle = 'rgba(255,230,200,0.35)'; x.lineWidth = 2.5; x.stroke();
    for (let k = 0; k < 5; k++) {
      const cx = (r() - 0.5) * 90, cy = (r() - 0.5) * 90, cr = 8 + r() * 16;
      x.fillStyle = 'rgba(0,0,0,0.32)'; x.beginPath(); x.ellipse(cx, cy, cr, cr * 0.8, 0, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(255,230,200,0.3)'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, cr, 0.4, 2.6); x.stroke();
    }
    return (rockCache[key] = c);
  }
  function drawRock(ctx, g, e, spec, q) {
    const fa = clamp((C.ZFAR - e.z) / 500, 0, 1), w = spec.w * q.s, tex = rockTex(e.var || 0, g.stage.theme);
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(e.rot || 0); ctx.globalAlpha = fa;
    ctx.drawImage(tex, -w / 2, -w / 2, w, w);
    if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 * fa; ctx.drawImage(tex, -w / 2, -w / 2, w, w); }
    ctx.restore();
  }
  function drawBossShadow(ctx, g, e) {
    const q = g.proj(e.x, C.FLOOR, e.z);
    ctx.fillStyle = 'rgba(0,20,40,0.35)';
    ctx.beginPath(); ctx.ellipse(q.x, q.y, 330 * q.s, 55 * q.s, 0, 0, TAU); ctx.fill();
  }
  function drawLane(ctx, g) {
    const b = g.boss;
    if (!b || !b.tele) return;
    const side = b.tele.side, x0 = side < 0 ? -1200 : -60, x1 = side < 0 ? 60 : 1200, t = b.tele.t;
    const pts = [g.proj(x0, C.FLOOR + 3, -60), g.proj(x1, C.FLOOR + 3, -60), g.proj(x1, C.FLOOR + 3, 1700), g.proj(x0, C.FLOOR + 3, 1700)];
    ctx.save();
    ctx.fillStyle = 'rgba(255,50,40,' + (0.26 + 0.14 * Math.sin(t * 15)).toFixed(2) + ')';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,120,90,0.8)'; ctx.lineWidth = 3;
    const a = g.proj(side < 0 ? 60 : -60, C.FLOOR + 3, -60), b2 = g.proj(side < 0 ? 60 : -60, C.FLOOR + 3, 1700);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
    ctx.restore();
  }
  function drawReticle(ctx, g) {
    const s = g.ship;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [z, sz, a] of [[1100, 30, 0.75], [520, 20, 0.9]]) {
      const q = g.proj(s.x, s.y, z), r = sz * q.s * 1.9;
      ctx.strokeStyle = 'rgba(120,235,255,' + a + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU); ctx.stroke();
      ctx.beginPath();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(q.x + dx * r * 0.7, q.y + dy * r * 0.7); ctx.lineTo(q.x + dx * r * 1.5, q.y + dy * r * 1.5); }
      ctx.stroke();
    }
    ctx.restore();
  }
  G.render = R;
})((window.SGS = window.SGS || {}));
