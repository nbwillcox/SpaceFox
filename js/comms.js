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
    const fi = W.map[m.expr] !== undefined ? W.map[m.expr] : W.map[W.def];
    const sz = SP.size(W.atlas, fi), sc = 84 / Math.max(sz.w * 0.82, sz.h * 0.8);
    ctx.save(); ctx.beginPath(); ctx.rect(ox + 6, y + 6, 84, h - 12); ctx.clip();
    const talking = m.t * CPS < m.text.length, bob = talking ? Math.sin(m.t * 22) * 1.6 : 0;
    ctx.fillStyle = 'rgba(30,50,90,0.6)'; ctx.fillRect(ox + 6, y + 6, 84, h - 12);
    SP.draw(ctx, W.atlas, fi, ox + 48, y + h - 6 - sz.h * sc / 2 + 6 + bob, sc);
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
