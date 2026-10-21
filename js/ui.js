/* DOM menus: title, pause, settings, high scores, game over / initials entry. */
(function (G) {
  'use strict';
  const S = G.settings, A = G.audio, U = G.U;
  const $ = (id) => document.getElementById(id);
  const UI = { cur: 'title', back: 'title', lastIdx: -1 };
  const NAMES = ['title', 'pause', 'settings', 'scores', 'gameover', 'diff', 'map', 'results', 'shop', 'cont', 'ending', 'howto'];

  UI.show = function (name) {
    NAMES.forEach((n) => $(n).classList.toggle('hidden', n !== name));
    UI.cur = name;
    document.body.classList.toggle('menu-open', !!name);
    if (name === 'scores') UI.renderScores();
    setTimeout(() => {
      const sec = $(name);
      if (!sec || sec.classList.contains('hidden')) return;
      const el = name === 'gameover' && !$('goEntry').classList.contains('hidden') ? $('goName') : sec.querySelector('button.primary') || sec.querySelector('button');
      if (el) { el.focus(); if (el.select) el.select(); }
    }, 0);
  };
  UI.hideAll = function () {
    NAMES.forEach((n) => $(n).classList.add('hidden'));
    UI.cur = null;
    document.body.classList.remove('menu-open');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  };
  UI.isOpen = () => UI.cur !== null;

  UI.renderScores = function () {
    const ol = $('scoreList');
    ol.innerHTML = '';
    G.scores.list.forEach((r, i) => {
      const li = document.createElement('li');
      if (i === UI.lastIdx) li.className = 'me';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = r.name;
      const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = U.fmt(r.score);
      const st = document.createElement('span'); st.className = 'st'; st.textContent = 'STAGE ' + (r.stage || 1);
      li.append(nm, sc, st);
      ol.appendChild(li);
    });
  };

  UI.showGameOver = function (score, stage, win, title) {
    $('goScore').textContent = U.fmt(score);
    $('goStage').textContent = stage;
    $('goTitle').textContent = title || (win ? 'STAGE CLEAR' : 'GAME OVER');
    $('goTitle').classList.toggle('over', !win);
    const q = G.scores.qualifies(score);
    $('goEntry').classList.toggle('hidden', !q);
    $('goButtons').classList.toggle('hidden', q);
    $('goName').value = G.scores.lastName || '';
    UI.pending = { score, stage };
    UI.show('gameover');
  };

  function saveScore() {
    if (!UI.pending) return;
    const name = ($('goName').value || 'AAA').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'AAA';
    UI.lastIdx = G.scores.add(name, UI.pending.score, UI.pending.stage);
    UI.pending = null;
    A.sfx.select();
    UI.back = 'title';
    UI.show('scores');
  }

  function bind() {
    const on = (id, fn) => $(id).addEventListener('click', () => { A.resume(); A.sfx.select(); fn(); });
    on('btnStart', () => G.flow.begin('campaign'));
    on('btnStageSel', () => G.flow.begin('free'));
    on('btnHow', () => { UI.show('howto'); });
    on('btnHowBack', () => UI.show('title'));
    on('btnRestart', () => G.main.restartStage());
    on('btnScores', () => { UI.back = 'title'; UI.lastIdx = -1; UI.show('scores'); });
    on('btnSettings', () => { UI.back = 'title'; UI.show('settings'); });
    on('btnResume', () => G.main.resume());
    on('btnPauseSettings', () => { UI.back = 'pause'; UI.show('settings'); });
    on('btnQuit', () => G.main.toTitle());
    on('btnSettingsBack', () => UI.show(UI.back));
    on('btnScoresPlay', () => G.flow.begin('campaign'));
    on('btnScoresBack', () => G.main.toTitle());
    on('btnRetry', () => G.flow.begin('campaign'));
    on('btnGoTitle', () => G.main.toTitle());
    on('btnSaveScore', saveScore);
    $('goName').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3); });
    $('goName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveScore(); } });

    $('setComms').value = S.comms;
    $('setComms').addEventListener('change', (e) => { S.comms = e.target.value; S.save(); A.sfx.blip(); });
    const sliders = { setMaster: 'master', setMusic: 'music', setSfx: 'sfx' };
    for (const id in sliders) {
      $(id).value = S[sliders[id]];
      $(id).addEventListener('input', (e) => { S[sliders[id]] = parseFloat(e.target.value); S.save(); A.applyVolumes(); });
      $(id).addEventListener('change', () => A.sfx.blip());
    }
    const checks = { setBloom: 'bloom', setShake: 'shake', setReduced: 'reduced', setAuto: 'autofire', setInvert: 'invertY', setMouse: 'mouse' };
    for (const id in checks) {
      $(id).checked = !!S[checks[id]];
      $(id).addEventListener('change', (e) => { S[checks[id]] = e.target.checked; S.save(); A.sfx.blip(); });
    }
    /* key rebinding: click a key button, press the new key; a key already in use swaps places */
    const I = G.input, K = S.keys, btns = Array.from(document.querySelectorAll('.keybtn'));
    const paint = () => btns.forEach((b) => { b.textContent = I.keyName(K[b.dataset.act]); b.classList.remove('listening'); });
    const stop = () => { I.capture = null; paint(); };
    btns.forEach((b) => b.addEventListener('click', () => {
      A.resume(); A.sfx.blip();
      stop(); b.textContent = '...'; b.classList.add('listening');
      I.capture = (code) => {
        if (code !== 'Escape') {
          const act = b.dataset.act, old = K[act];
          for (const k in K) if (K[k] === code && k !== act) K[k] = old;
          K[act] = code; S.save(); A.sfx.select();
        }
        stop();
      };
    }));
    $('btnKeyReset').addEventListener('click', () => { stop(); Object.assign(K, S.DEFAULT_KEYS); S.save(); A.sfx.select(); paint(); });
    paint();
    window.addEventListener('keydown', (e) => {
      if (I.capture) return;
      if (e.key !== 'Escape') return;
      if (UI.cur === 'settings') UI.show(UI.back);
      else if (UI.cur === 'scores') G.main.toTitle();
      else if (UI.cur === 'howto') UI.show('title');
    });
    document.addEventListener('pointerdown', () => A.resume(), { passive: true });
    document.addEventListener('keydown', () => A.resume());
  }

  G.ui = UI;
  bind();
})((window.SGS = window.SGS || {}));
