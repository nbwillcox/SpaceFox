/* Comms: portrait + typed text + babble voice, like a radio call in the corner of the screen. Speakers use the cut portrait sheets (frog = Moss, fox = Vale). */
(function (G) {
  'use strict';
  const U = G.U, S = G.settings, SP = G.sprites;
  const CM = { queue: [], cur: null, gap: 0, slide: 0, said: {} };

  /* expression name -> frame index on the 6x2 portrait sheets */
  const FROG = { calm: 0, happy: 1, shock: 2, grump: 3, cheer: 4, angry: 5, gasp: 6, nervous: 7, laugh: 8, worry: 9, grin: 10, smirk: 11 };
  const FOX = { cool: 0, smug: 1, excited: 2, shout: 3, surprise: 4, fierce: 5, smirk: 6, warm: 7, laugh: 8, annoyed: 9, worry: 10, happy: 11 };
  const WHO = {
    moss: { name: 'MOSS', atlas: 'frog', map: FROG, color: '#7dff9a', def: 'calm' },
    vale: { name: 'CAPT. VALE', atlas: 'fox', map: FOX, color: '#ff9a3d', def: 'cool' },
  };
  /* Juno (raccoon) and Bram (badger) have no painted sheets: their portraits are drawn in code */
  function face(ctx, expr, talk, mouthY) {
    const open = talk || expr === 'shout', worry = expr === 'worry', happy = expr === 'cheer' || expr === 'happy', smug = expr === 'smug';
    ctx.lineCap = 'round';
    if (open) { ctx.fillStyle = '#2a0c14'; ctx.beginPath(); ctx.ellipse(0, mouthY, 7, expr === 'shout' ? 7 : 4, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = '#ff7a8a'; ctx.beginPath(); ctx.ellipse(0, mouthY + 2.5, 4.5, 2, 0, 0, 6.3); ctx.fill(); }
    else if (happy) { ctx.strokeStyle = '#2a0c14'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, mouthY - 4, 8, 0.2, Math.PI - 0.2); ctx.stroke(); }
    else if (worry) { ctx.strokeStyle = '#2a0c14'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-6, mouthY + 2); ctx.quadraticCurveTo(-2, mouthY - 2, 0, mouthY + 1); ctx.quadraticCurveTo(2, mouthY + 4, 6, mouthY); ctx.stroke(); }
    else { ctx.strokeStyle = '#2a0c14'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-6, mouthY); ctx.quadraticCurveTo(0, mouthY + (smug ? 1 : 3), 6, mouthY - (smug ? 3 : 0)); ctx.stroke(); }
  }
  function eyes(ctx, ex, ey, expr, rim, pupil) {
    const happy = expr === 'cheer' || expr === 'happy', worry = expr === 'worry', shout = expr === 'shout', smug = expr === 'smug';
    for (const sx of [-1, 1]) {
      const x = sx * ex;
      if (happy) { ctx.strokeStyle = '#10142a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(x, ey + 1, 5, Math.PI + 0.3, -0.3); ctx.stroke(); continue; }
      ctx.fillStyle = rim; ctx.beginPath(); ctx.ellipse(x, ey, 6.5, smug ? 4 : 6.5, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = pupil; ctx.beginPath(); ctx.arc(x + (smug ? sx * 1 : 0), ey + (worry ? 1 : 0), 2.8, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#10142a'; ctx.lineWidth = 2.6;
      ctx.beginPath();
      if (shout) { ctx.moveTo(x - sx * 8, ey - 11); ctx.lineTo(x + sx * 5, ey - 6); }
      else if (worry) { ctx.moveTo(x + sx * 8, ey - 11); ctx.lineTo(x - sx * 5, ey - 6); }
      else { ctx.moveTo(x - 7, ey - 9); ctx.lineTo(x + 7, ey - 9 - (smug ? sx * 2 : 0)); }
      ctx.stroke();
    }
  }
  function raccoon(ctx, cx, cy, sz, expr, talk) {
    ctx.save(); ctx.translate(cx, cy + 4); ctx.scale(sz / 84, sz / 84);
    ctx.fillStyle = '#17604f'; ctx.beginPath(); ctx.moveTo(-40, 42); ctx.quadraticCurveTo(0, 20, 40, 42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8ae6c2'; ctx.beginPath(); ctx.moveTo(-14, 30); ctx.lineTo(0, 40); ctx.lineTo(14, 30); ctx.lineTo(8, 24); ctx.lineTo(-8, 24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6c7280'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 25, -24, 11, 0, 6.3); ctx.fill(); }
    ctx.fillStyle = '#1b1e2a'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 25, -24, 5.5, 0, 6.3); ctx.fill(); }
    const hg = ctx.createRadialGradient(-8, -10, 4, 0, 4, 38); hg.addColorStop(0, '#b4bac6'); hg.addColorStop(1, '#6c7280');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(0, 2, 32, 28, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#1b1e2a'; ctx.beginPath(); ctx.moveTo(-31, -3); ctx.quadraticCurveTo(0, -17, 31, -3); ctx.lineTo(28, 12); ctx.quadraticCurveTo(0, 4, -28, 12); ctx.closePath(); ctx.fill();
    eyes(ctx, 13, 0, expr, '#ffffff', '#10142a');
    ctx.fillStyle = '#e8ecf4'; ctx.beginPath(); ctx.ellipse(0, 16, 15, 11, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#10142a'; ctx.beginPath(); ctx.ellipse(0, 9, 4.5, 3, 0, 0, 6.3); ctx.fill();
    face(ctx, expr, talk, 19);
    ctx.restore();
  }
  function badger(ctx, cx, cy, sz, expr, talk) {
    ctx.save(); ctx.translate(cx, cy + 4); ctx.scale(sz / 84, sz / 84);
    ctx.fillStyle = '#2d4f9a'; ctx.beginPath(); ctx.moveTo(-42, 42); ctx.quadraticCurveTo(0, 18, 42, 42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7da8ff'; ctx.fillRect(-9, 26, 18, 14);
    ctx.fillStyle = '#3a3e4a'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 26, -22, 10, 0, 6.3); ctx.fill(); }
    ctx.fillStyle = '#e8ecf4'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 26, -26, 4.5, 0, 6.3); ctx.fill(); }
    const hg = ctx.createRadialGradient(-8, -10, 4, 0, 4, 40); hg.addColorStop(0, '#5a5f6c'); hg.addColorStop(1, '#2e323d');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(0, 2, 33, 28, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#f1f4fa';                                    /* the white blaze and cheek stripes */
    ctx.beginPath(); ctx.moveTo(-5, -28); ctx.lineTo(5, -28); ctx.lineTo(7, 12); ctx.lineTo(-7, 12); ctx.closePath(); ctx.fill();
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 10, -24); ctx.quadraticCurveTo(sx * 30, -14, sx * 26, 14); ctx.lineTo(sx * 17, 16); ctx.quadraticCurveTo(sx * 20, -6, sx * 10, -16); ctx.closePath(); ctx.fill(); }
    eyes(ctx, 14, -2, expr, '#f6f8ff', '#10142a');
    ctx.fillStyle = '#10142a'; ctx.beginPath(); ctx.ellipse(0, 12, 6, 4, 0, 0, 6.3); ctx.fill();
    face(ctx, expr, talk, 21);
    ctx.restore();
  }
  WHO.juno = { name: 'JUNO', color: '#8ae6c2', draw: raccoon };
  WHO.bram = { name: 'BRAM', color: '#7da8ff', draw: badger };
  CM.WHO = WHO;
  const CPS = 44;

  /** say(who, expr, text, opts): opts.pri 0 normal, 1 important (jumps the queue), 2 urgent (cuts in); opts.key = only once per run */
  CM.say = function (who, expr, text, opts) {
    opts = opts || {};
    if (!WHO[who] || S.comms === 'off') return;
    if (S.comms === 'minimal' && !(opts.pri >= 1)) return;
    if (opts.key) { if (CM.said[opts.key]) return; CM.said[opts.key] = true; }
    const m = { who, expr, text, t: 0, dur: Math.max(2.4, text.length / 15 + 0.9), pri: opts.pri || 0 };
    if (m.pri >= 2) { CM.queue.length = 0; CM.cur = m; CM.slide = Math.max(CM.slide, 0.5); return; }
    if (m.pri === 1) CM.queue.unshift(m); else if (CM.queue.length < 4) CM.queue.push(m);
  };
  CM.clear = function (keepSaid) { CM.queue.length = 0; CM.cur = null; CM.gap = 0; CM.slide = 0; if (!keepSaid) CM.said = {}; };

  CM.update = function (dt) {
    if (!CM.cur) {
      CM.slide = Math.max(0, CM.slide - dt * 4);
      CM.gap -= dt;
      if (CM.gap <= 0 && CM.queue.length) { CM.cur = CM.queue.shift(); CM.slide = 0; }
      return;
    }
    const m = CM.cur, prev = Math.floor(m.t * CPS);
    m.t += dt;
    CM.slide = Math.min(1, CM.slide + dt * 5);
    const now = Math.min(m.text.length, Math.floor(m.t * CPS));
    for (let i = prev; i < now; i++) { const ch = m.text[i]; if (ch !== ' ' && G.audio.sfx.babble && !G.game.demo) G.audio.sfx.babble(m.who, ch); }
    if (m.t > m.dur) { CM.cur = null; CM.gap = 0.3; }
  };

  const FONT = '"Segoe UI", system-ui, sans-serif';
  function wrap(ctx, text, maxW) {
    const words = text.split(' '), lines = []; let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }

  CM.draw = function (ctx, x, y) {
    const m = CM.cur;
    if (!m) return;
    const W = WHO[m.who], k = U.smooth(Math.min(1, CM.slide));
    const w = 400, h = 96, ox = x - (1 - k) * (w + 30);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(4,10,30,0.82)'; ctx.fillRect(ox, y, w, h);
    ctx.strokeStyle = W.color; ctx.lineWidth = 2; ctx.strokeRect(ox + 1, y + 1, w - 2, h - 2);
    /* portrait */
    const talking = m.t * CPS < m.text.length, bob = talking ? Math.sin(m.t * 22) * 1.6 : 0;
    ctx.save(); ctx.beginPath(); ctx.rect(ox + 6, y + 6, 84, h - 12); ctx.clip();
    ctx.fillStyle = 'rgba(30,50,90,0.6)'; ctx.fillRect(ox + 6, y + 6, 84, h - 12);
    if (W.draw) W.draw(ctx, ox + 48, y + h / 2 + bob * 0.6, 78, m.expr, talking && ((m.t * 9) | 0) % 2 === 0);
    else {
      const fi = W.map[m.expr] !== undefined ? W.map[m.expr] : W.map[W.def];
      const sz = SP.size(W.atlas, fi), sc = 84 / Math.max(sz.w * 0.82, sz.h * 0.8);
      SP.draw(ctx, W.atlas, fi, ox + 48, y + h - 6 - sz.h * sc / 2 + 6 + bob, sc);
    }
    ctx.restore();
    ctx.strokeStyle = W.color; ctx.lineWidth = 1.5; ctx.strokeRect(ox + 6, y + 6, 84, h - 12);
    /* name + typed text */
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = '800 11px ' + FONT; ctx.fillStyle = W.color; ctx.fillText(W.name, ox + 100, y + 20);
    ctx.font = '600 14px ' + FONT; ctx.fillStyle = '#eaf6ff';
    const shown = m.text.slice(0, Math.min(m.text.length, Math.floor(m.t * CPS)));
    const lines = wrap(ctx, m.text, w - 116), full = lines.join(' ').length;
    let used = 0;
    lines.slice(0, 4).forEach((ln, i) => {
      const take = Math.max(0, Math.min(ln.length, shown.length - used));
      ctx.fillText(ln.slice(0, take), ox + 100, y + 40 + i * 18);
      used += ln.length + 1;
    });
    ctx.restore();
  };
  G.comms = CM;
})((window.SGS = window.SGS || {}));
