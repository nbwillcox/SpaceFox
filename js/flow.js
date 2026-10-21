/* Campaign flow and its DOM screens: difficulty select, route map, stage results, hangar shop, continue prompt. */
(function (G) {
  'use strict';
  const CP = G.campaign, U = G.U, A = G.audio, UI = G.ui, SP = G.sprites;
  const $ = (id) => document.getElementById(id);
  const F = { run: null, mode: 'campaign', sel: null, res: null, last: null };
  G.flow = F;
  const MEDAL = { bronze: 'BRONZE', silver: 'SILVER', gold: 'GOLD' };
  const medalChip = (m) => (m ? '<span class="medal ' + m + '">' + MEDAL[m] + '</span>' : '<span class="medal none">NO MEDAL</span>');
  const click = () => { A.resume(); A.sfx.select(); };

  /* a themed demo flight keeps running behind the menus */
  function demoBack(i) {
    const g = G.game;
    g.demoI = i === undefined ? ((g.demoI || 0) + 1) % g.DEMO_STAGES.length : i;
    g.reset(true, g.DEMO_STAGES[g.demoI]);
  }
  F.demoBack = demoBack;

  /* ---------- begin: difficulty first, then the map ---------- */
  F.begin = function (mode) {
    F.mode = mode;
    if (G.debug.stage) { F.run = CP.newRun(G.debug.diff || CP.save.diff, String(G.debug.stage).replace(/^(\d+)$/, 's$1')); G.main.playStage(F.run, F.run.stageId); return; }
    UI.back = 'title';
    UI.show('diff');
  };
  function chooseDiff(key) {
    CP.save.diff = key; CP.flush();
    F.run = CP.newRun(key, 's1');
    F.sel = null; F.last = null;
    F.showMap();
  }

  /* ---------- route map ---------- */
  function selectable(id) {
    const st = CP.STAGES[id];
    if (!st || st.soon || !CP.unlocked(id)) return false;
    if (F.mode === 'free') return true;
    if (!F.last) return id === 's1';
    return CP.STAGES[F.last].next.indexOf(id) >= 0;
  }
  F.showMap = function () {
    const board = $('mapCols');
    board.innerHTML = '';
    const cards = {};
    CP.COLUMNS.forEach((col) => {
      const c = document.createElement('div'); c.className = 'mapcol';
      col.forEach((id) => {
        const st = CP.STAGES[id], b = document.createElement('button');
        b.type = 'button'; b.className = 'mapcard'; b.dataset.id = id;
        const ok = selectable(id), med = CP.medal(id);
        b.classList.toggle('dim', !ok);
        b.classList.toggle('soon', !!st.soon);
        b.classList.toggle('hard', !!st.hard);
        b.classList.toggle('done', !!(F.run && F.run.cleared.indexOf(id) >= 0));
        b.innerHTML = '<span class="mn">STAGE ' + st.n + '</span><span class="mt">' + st.name + '</span>' + (st.route ? '<span class="mr">' + st.route + '</span>' : '') +
          (st.soon ? '<span class="medal none">SOON</span>' : !CP.unlocked(id) ? '<span class="medal none">LOCKED</span>' : medalChip(med));
        b.addEventListener('click', () => { click(); F.select(id); });
        c.appendChild(b); cards[id] = b;
      });
      board.appendChild(c);
    });
    F.cards = cards;
    const first = F.sel && selectable(F.sel) ? F.sel : CP.COLUMNS.flat().find(selectable);
    F.sel = null;
    $('mapInfo').innerHTML = F.mode === 'free' ? 'STAGE SELECT &middot; practice any stage you have unlocked' : 'CREDITS <b>' + F.run.credits + '</b> &middot; SCORE <b>' + U.fmt(F.run.score) + '</b> &middot; RETRIES <b>' + F.run.retries + '</b> &middot; ' + CP.DIFF[F.run.diff].label;
    UI.show('map');
    if (first) F.select(first);
    requestAnimationFrame(drawLines);
  };
  function drawLines() {
    const svg = $('mapLines'), board = $('mapBoard');
    if (!svg || !board) return;
    const br = board.getBoundingClientRect();
    svg.setAttribute('width', br.width); svg.setAttribute('height', br.height);
    let h = '';
    Object.keys(CP.STAGES).forEach((id) => {
      const a = F.cards && F.cards[id];
      if (!a) return;
      CP.STAGES[id].next.forEach((nid) => {
        const b = F.cards[nid];
        if (!b) return;
        const ar = a.getBoundingClientRect(), bb = b.getBoundingClientRect();
        const x1 = ar.right - br.left, y1 = ar.top + ar.height / 2 - br.top, x2 = bb.left - br.left, y2 = bb.top + bb.height / 2 - br.top;
        const hot = F.last === id && selectable(nid);
        h += '<path d="M' + x1 + ' ' + y1 + ' C ' + (x1 + 18) + ' ' + y1 + ' ' + (x2 - 18) + ' ' + y2 + ' ' + x2 + ' ' + y2 + '" class="' + (hot ? 'hot' : '') + '"/>';
      });
    });
    svg.innerHTML = h;
  }
  window.addEventListener('resize', () => { if (UI.cur === 'map') drawLines(); });
  F.select = function (id) {
    const st = CP.STAGES[id], ok = selectable(id);
    F.sel = ok ? id : F.sel;
    Object.keys(F.cards).forEach((k) => F.cards[k].classList.toggle('sel', k === F.sel));
    const best = CP.save.best[id];
    let note = '';
    if (st.soon) note = 'Coming in a later update.';
    else if (!CP.unlocked(id)) note = 'Locked: ' + (st.unlockHint || 'finish the earlier stage first') + '.';
    else if (!ok) note = 'Not on your current route.';
    $('mapDetail').innerHTML = '<b>' + st.name + '</b> ' + (st.route ? '<span class="rt">' + st.route + '</span> ' : '') + medalChip(CP.medal(id)) +
      (best ? ' &middot; BEST ' + U.fmt(best) : '') + '<br>' + st.blurb + (note ? '<br><i>' + note + '</i>' : '');
    $('btnMapLaunch').disabled = !F.sel;
  };
  F.launch = function () { if (!F.sel) return; UI.hideAll(); A.music('off'); G.main.playStage(F.run, F.sel); };

  /* ---------- results ---------- */
  F.stageClear = function (res) {
    const run = F.run, st = CP.STAGES[res.stageId];
    const prevBest = CP.save.best[res.stageId] || 0;
    run.score = res.score; run.retries = res.retries; run.bombs = res.bombs; run.credits += res.credits; run.stageId = res.stageId;
    if (run.cleared.indexOf(res.stageId) < 0) run.cleared.push(res.stageId);
    CP.setMedal(res.stageId, res.medal); CP.setBest(res.stageId, res.stageScore);
    F.last = res.stageId; F.res = res;
    A.music('title');
    demoBack();
    $('resTitle').textContent = 'STAGE ' + st.n + ' CLEAR';
    $('resName').textContent = st.name;
    $('resMedal').innerHTML = medalChip(res.medal);
    $('resPct').style.width = Math.round(res.pct * 100) + '%';
    $('resRows').innerHTML =
      '<li><span>Enemies destroyed</span><b>' + res.kills + ' / ' + res.spawned + ' (' + Math.round(res.pct * 100) + '%)</b></li>' +
      '<li><span>Stars</span><b>' + res.stars + '</b></li>' +
      (res.rescues ? '<li><span>Wingmates saved</span><b>' + res.rescues + '</b></li>' : '') +
      '<li><span>Hits taken</span><b>' + res.hitsTaken + '</b></li>' +
      '<li><span>Stage score</span><b>' + U.fmt(res.stageScore) + (res.stageScore > prevBest ? ' &nbsp;NEW BEST' : '') + '</b></li>' +
      '<li class="cr"><span>Credits earned</span><b>+' + res.credits + '</b></li>';
    UI.show('results');
  };

  /* ---------- hangar shop ---------- */
  const MOSS_LINES = ['Spend wisely, Captain. Credits do not grow on lily pads.', 'Everything is bolted on and ready to go!', 'Ooh, shiny. That is a good one.', 'More shield never hurt anybody.', 'I would take the lock-on array. Just saying.'];
  F.shop = function () {
    UI.show('shop');
    renderShop('');
  };
  function drawBust() {
    const cv = $('shBust'), x = cv.getContext('2d');
    x.clearRect(0, 0, cv.width, cv.height);
    const fi = 1, sz = SP.size('frog', fi), sc = Math.min(cv.width / sz.w, cv.height / sz.h) * 0.96;
    SP.draw(x, 'frog', fi, cv.width / 2, cv.height - sz.h * sc / 2, sc);
  }
  function renderShop(msg) {
    const run = F.run;
    $('shCredits').textContent = U.fmt(run.credits);
    $('shopMoss').textContent = msg || U.pick(MOSS_LINES);
    drawBust();
    const ul = $('shopList');
    ul.innerHTML = '';
    CP.SHOP.forEach((it) => {
      const lv = run.up[it.id], price = CP.price(run, it), li = document.createElement('li');
      const pips = Array.from({ length: it.max }, (_, i) => '<i class="pip' + (i < lv ? ' on' : '') + '"></i>').join('');
      li.innerHTML = '<div class="si"><b>' + it.name + '</b> ' + pips + '<span class="sd">' + it.desc + '</span></div>';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'buy';
      b.textContent = price === null ? 'MAXED' : String(price);
      b.disabled = price === null || run.credits < price;
      b.addEventListener('click', () => { if (CP.buy(run, it.id)) { A.resume(); A.sfx.weaponUp(); renderShop('Installed: ' + it.name + ' level ' + run.up[it.id] + '.'); } });
      li.appendChild(b); ul.appendChild(li);
    });
    const cap = CP.bombCap(run), li = document.createElement('li');
    li.innerHTML = '<div class="si"><b>BOMB RESTOCK</b> <span class="sd">' + run.bombs + ' / ' + cap + ' bombs in the bay. +1 bomb.</span></div>';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'buy';
    b.textContent = run.bombs >= cap ? 'FULL' : String(CP.BOMB_COST); b.disabled = run.bombs >= cap || run.credits < CP.BOMB_COST;
    b.addEventListener('click', () => { if (CP.buy(run, 'bomb1')) { A.resume(); A.sfx.pickup(); renderShop('One more bomb. Try not to waste it.'); } });
    li.appendChild(b); ul.appendChild(li);
  }
  F.afterShop = function () {
    const opts = CP.STAGES[F.last].next.filter((id) => CP.unlocked(id));
    if (!opts.length) { F.endCampaign(); return; }
    F.showMap();
  };

  /* ---------- the end of what is built so far ---------- */
  F.endCampaign = function () {
    A.music('title');
    if (F.last === 's7') { UI.show('ending'); return; }
    UI.showGameOver(F.run.score, CP.STAGES[F.last].n, true, 'SECTOR CLEARED');
  };

  /* ---------- game over / continue ---------- */
  F.gameOver = function () {
    F.over = { score: G.game.score, stage: G.game.stageNo, id: G.game.stageId };
    demoBack();
    if (F.run && F.run.continues > 0) {
      $('contLeft').textContent = F.run.continues;
      UI.show('cont');
      return;
    }
    F.giveUp();
  };
  F.giveUp = function () {
    A.music('title');
    UI.showGameOver(F.over.score, F.over.stage, false);
  };
  F.doContinue = function () {
    const run = F.run;
    run.continues--; run.retries = CP.DIFF[run.diff].retries;
    UI.hideAll();
    G.main.playStage(run, F.over.id);
  };

  F.bind = function () {
    const on = (id, fn) => $(id).addEventListener('click', () => { click(); fn(); });
    document.querySelectorAll('.diffbtn').forEach((b) => b.addEventListener('click', () => { click(); chooseDiff(b.dataset.d); }));
    on('btnDiffBack', () => G.main.toTitle());
    on('btnMapLaunch', F.launch);
    on('btnMapBack', () => G.main.toTitle());
    on('btnResHangar', F.shop);
    on('btnShopGo', F.afterShop);
    on('btnContYes', F.doContinue);
    on('btnEndGo', () => UI.showGameOver(F.run.score, 7, true, 'VICTORY'));
    on('btnContNo', F.giveUp);
    const d = CP.save.diff || 'normal';
    document.querySelectorAll('.diffbtn').forEach((b) => b.classList.toggle('last', b.dataset.d === d));
  };
  F.bind();
})((window.SGS = window.SGS || {}));
