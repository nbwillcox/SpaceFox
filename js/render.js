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
  R.backdrop = function (ctx, g) {
    const W = C.W, H = C.H, dist = g.dist;
    ctx.fillStyle = '#1b1236'; ctx.fillRect(0, 0, W, H);
    if (SP.bg && SP.bg.complete && SP.bg.naturalWidth) {
      const w = 1180, h = w * SP.bg.naturalHeight / SP.bg.naturalWidth;
      ctx.drawImage(SP.bg, (W - w) / 2 - g.cam.x * 0.06, C.VY - h * 0.645 - g.cam.y * 0.04, w, h);
    }
    /* water */
    const grd = ctx.createLinearGradient(0, C.VY, 0, H);
    grd.addColorStop(0, '#3fc9cf'); grd.addColorStop(0.35, '#1e93b0'); grd.addColorStop(1, '#0a4f7a');
    ctx.fillStyle = grd; ctx.fillRect(0, C.VY, W, H - C.VY);
    /* moving light bands on the water */
    const len = 190, base = Math.floor(dist / len);
    for (let k = 30; k >= 0; k--) {
      const idx = base + k;
      if (idx & 1) continue;
      const zA = idx * len - dist, zB = zA + len * 0.55;
      if (zB < -60) continue;
      const ya = floorY(g, Math.max(zA, -60)), yb = floorY(g, zB), f = clamp(1 - zA / C.ZFAR, 0, 1);
      ctx.fillStyle = 'rgba(190,245,255,' + (0.05 + 0.11 * f * f).toFixed(3) + ')';
      ctx.fillRect(0, yb, W, ya - yb);
    }
    /* rock walls, far to near */
    const L = 110, wb = Math.floor(dist / L) * L;
    for (let i = 30; i >= 0; i--) {
      const zAbsA = wb + i * L, zA = zAbsA - dist, zB = zA + L;
      if (zB < -50) continue;
      const za = Math.max(zA, -50);
      for (let side = -1; side <= 1; side += 2) {
        const xa = side * wallW(zAbsA), xb = side * wallW(zAbsA + L);
        const a0 = g.proj(xa, C.FLOOR, za), a1 = g.proj(xa, C.FLOOR + 1500, za), b0 = g.proj(xb, C.FLOOR, zB), b1 = g.proj(xb, C.FLOOR + 1500, zB);
        const hsh = hash(Math.floor(zAbsA / L) * 2 + (side > 0 ? 1 : 0)), fog = 0.85 * Math.pow(clamp(za / C.ZFAR, 0, 1), 1.3);
        const col = ROCK[(hsh * 4) | 0], lit = side < 0 ? 1.06 : 0.78;
        const c = [col[0] * lit + hsh * 14, col[1] * lit + hsh * 8, col[2] * lit];
        ctx.fillStyle = mixc(c, HAZE, fog);
        ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(b0.x, b0.y); ctx.closePath(); ctx.fill();
        /* strata */
        ctx.strokeStyle = mixc([c[0] * 0.55, c[1] * 0.5, c[2] * 0.55], HAZE, fog); ctx.lineWidth = Math.max(1, 3 * a0.s);
        for (let y = 170; y < 1200; y += 190 + hsh * 60) {
          const p = g.proj(xa, C.FLOOR + y, za), q = g.proj(xb, C.FLOOR + y, zB);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
        /* waterline foam */
        const f0 = g.proj(xa, C.FLOOR + 36, za), f1 = g.proj(xb, C.FLOOR + 36, zB);
        ctx.fillStyle = 'rgba(210,250,255,' + (0.42 * (1 - fog)).toFixed(2) + ')';
        ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(f0.x, f0.y); ctx.lineTo(f1.x, f1.y); ctx.lineTo(b0.x, b0.y); ctx.closePath(); ctx.fill();
        /* crystal glints */
        if (hsh > 0.84) {
          const cy = C.FLOOR + 160 + hsh * 380, m = g.proj(xa + (xb - xa) * 0.5, cy, za + L * 0.5), sz = 70 * m.s;
          ctx.fillStyle = mixc([90, 110, 255], HAZE, fog);
          ctx.beginPath(); ctx.moveTo(m.x, m.y - sz * 1.3); ctx.lineTo(m.x + sz * 0.5, m.y); ctx.lineTo(m.x, m.y + sz * 0.5); ctx.lineTo(m.x - sz * 0.5, m.y); ctx.closePath(); ctx.fill();
        }
      }
    }
    /* distance haze at the horizon */
    const hz = ctx.createLinearGradient(0, C.VY - 60, 0, C.VY + 70);
    hz.addColorStop(0, 'rgba(150,108,176,0)'); hz.addColorStop(0.5, 'rgba(160,120,190,0.35)'); hz.addColorStop(1, 'rgba(150,108,176,0)');
    ctx.fillStyle = hz; ctx.fillRect(0, C.VY - 60, C.W, 130);
  };

  /* ---------- boxes (pillars, arches, barriers) ---------- */
  function drawBox(ctx, g, e) {
    const z0 = Math.max(e.z, -120), z1 = e.z + e.depth;
    if (z1 < -120) return;
    const fog = 0.85 * Math.pow(clamp(z0 / C.ZFAR, 0, 1), 1.3), base = BOX_COL[e.color % 3];
    const eyeX = g.cam.x, eyeY = C.EYE + g.cam.y;
    const P = (x, y, z) => g.proj(x, y, z);
    const poly = (pts, fill, edge) => {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, 2 * pts[0].s); ctx.stroke();
    };
    const edge = mixc([base[0] * 0.5, base[1] * 0.5, base[2] * 0.55], HAZE, fog);
    if (e.y1 < eyeY) poly([P(e.x0, e.y1, z0), P(e.x1, e.y1, z0), P(e.x1, e.y1, z1), P(e.x0, e.y1, z1)], mixc([base[0] * 1.2, base[1] * 1.2, base[2] * 1.2], HAZE, fog), edge);
    if (e.x0 > eyeX) poly([P(e.x0, e.y0, z0), P(e.x0, e.y1, z0), P(e.x0, e.y1, z1), P(e.x0, e.y0, z1)], mixc([base[0] * 0.8, base[1] * 0.8, base[2] * 0.85], HAZE, fog), edge);
    if (e.x1 < eyeX) poly([P(e.x1, e.y0, z0), P(e.x1, e.y1, z0), P(e.x1, e.y1, z1), P(e.x1, e.y0, z1)], mixc([base[0] * 0.65, base[1] * 0.65, base[2] * 0.7], HAZE, fog), edge);
    poly([P(e.x0, e.y0, z0), P(e.x1, e.y0, z0), P(e.x1, e.y1, z0), P(e.x0, e.y1, z0)], mixc(base, HAZE, fog), edge);
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
    ctx.fillStyle = 'rgba(0,20,40,' + (0.38 * (1 - clamp(hgt / 520, 0, 0.8))).toFixed(2) + ')';
    ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 70 * sh.s * (1 - clamp(hgt / 900, 0, 0.5)), 15 * sh.s, 0, 0, TAU); ctx.fill();
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
    const spec = g.EN[e.kind], q = g.proj(e.x, e.y, e.z);
    if (e.z < -200) return;
    const fa = clamp((C.ZFAR - e.z) / 500, 0, 1);
    const k = (spec.w / SP.size('enemy', spec.frame).w) * q.s;
    let rot = 0;
    if (e.kind === 'fighter') rot = Math.cos(e.age * 2.2 + e.ph) * 0.28 * (e.amp > 100 ? 1 : 0.4);
    else if (e.kind === 'mine' || e.kind === 'crystal') rot = e.kind === 'mine' ? e.rot : Math.sin(e.rot) * 0.2;
    SP.draw(ctx, 'enemy', spec.frame, q.x, q.y, k, false, fa, rot);
    if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; SP.draw(ctx, 'enemy', spec.frame, q.x, q.y, k, false, 0.7 * fa, rot); ctx.globalCompositeOperation = 'source-over'; }
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
