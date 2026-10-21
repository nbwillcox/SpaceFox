/* Campaign layer: the route map data, difficulty, run state (credits, upgrades), the hangar shop catalogue, medals and the saved progress (localStorage). */
(function (G) {
  'use strict';
  const CP = {};
  const KEY = 'spacefox.save.v1';

  /* ---------- stages on the route map (columns left to right) ---------- */
  CP.STAGES = {
    s1: { id: 's1', n: 1, name: 'EMBER CANYON', theme: 'canyon', route: '', blurb: 'A river canyon under a ringed sky. The Gloom Armada has dug in at the Bulwark fortress.', next: ['s2a', 's2b'] },
    s2a: { id: 's2a', n: 2, name: 'DRIFT BELT', theme: 'space', route: 'EASY ROUTE', blurb: 'A tumbling asteroid field. Weave the rocks, shoot what you can, and watch for Rockjaw.', next: ['s3a', 's3b'] },
    s2b: { id: 's2b', n: 2, name: 'GLASSWATER REACH', theme: 'water', route: 'HARD ROUTE', hard: true, blurb: 'Skim the glass-flat sea through stone arches and gun batteries. Tidecaller guards the exit.', next: ['s3a', 's3b'], unlockHint: 'Earn a GOLD medal on Ember Canyon' },
    s3a: { id: 's3a', n: 3, name: 'FOUNDRY SPINE', theme: 'foundry', route: 'EASY ROUTE', blurb: 'Molten pipes, turrets and crushers. The Foundry Warden keeps the furnace lit.', next: ['s4'] },
    s3b: { id: 's3b', n: 3, name: 'GHOST STATION', theme: 'tunnel', route: 'HARD ROUTE', hard: true, blurb: 'A dead orbital station: tight corridors, bulkhead gates and a Prism Sentinel.', next: ['s4'], unlockHint: 'Earn a GOLD medal on stage 2' },
    s4: { id: 's4', n: 4, name: 'NEBULA ARENA', theme: 'arena', route: 'ALL-RANGE', blurb: 'Free flight: no rails, fighters on your tail, and the rival ace Scarlet Talon.', next: ['s5'] },
    s5: { id: 's5', n: 5, name: 'GATEWYRM RUN', theme: 'warp', route: '', blurb: 'A warp lane of gold ring gates, and the mechanical serpent that guards them.', next: ['s6'] },
    s6: { id: 's6', n: 6, name: "REGENT'S FLEET", theme: 'arena', route: 'ALL-RANGE', blurb: 'Strafe the Hollow Queen: knock out her shield turrets, then her hull.', next: ['s7'] },
    s7: { id: 's7', n: 7, name: 'CROWN CORE', theme: 'fortress', route: 'FINAL', blurb: 'The Regent\'s flagship fortress. Three phases. End it.', next: [] },
  };
  CP.COLUMNS = [['s1'], ['s2a', 's2b'], ['s3a', 's3b'], ['s4'], ['s5'], ['s6'], ['s7']];

  /* ---------- difficulty ---------- */
  CP.DIFF = {
    easy: { key: 'easy', label: 'EASY', note: 'Slower enemy fire, tougher shield, extra retries and 3 continues.', shotDmg: 0.65, rate: 0.75, hp: 0.8, retries: 5, continues: 3, credits: 0.85 },
    normal: { key: 'normal', label: 'NORMAL', note: 'The intended flight. 3 retries and 1 continue.', shotDmg: 1, rate: 1, hp: 1, retries: 3, continues: 1, credits: 1 },
    hard: { key: 'hard', label: 'HARD', note: 'Heavier hits, faster fire, tougher enemies. 2 retries, no continues, more credits.', shotDmg: 1.4, rate: 1.3, hp: 1.3, retries: 2, continues: 0, credits: 1.35 },
  };

  /* ---------- hangar shop ---------- */
  CP.SHOP = [
    { id: 'laser', name: 'LASER CORE', desc: 'Start every stage with a better laser: twin, then hyper.', max: 2, cost: [500, 1100] },
    { id: 'shield', name: 'SHIELD CELLS', desc: '+25 maximum shield per level.', max: 3, cost: [300, 600, 1000] },
    { id: 'bombs', name: 'BOMB BAY', desc: 'Carry more bombs: the cap rises from 3 to 6.', max: 3, cost: [250, 500, 800] },
    { id: 'locks', name: 'LOCK-ON ARRAY', desc: '+1 lock-on target per charged volley.', max: 3, cost: [400, 800, 1300] },
    { id: 'roll', name: 'ROLL SERVOS', desc: 'Quicker roll recovery and a longer deflect window.', max: 2, cost: [350, 800] },
    { id: 'boost', name: 'BOOST CELLS', desc: 'Boost lasts longer and recharges faster.', max: 2, cost: [300, 700] },
    { id: 'magnet', name: 'STAR MAGNET', desc: 'Pulls stars and pickups in from further away.', max: 2, cost: [200, 500] },
  ];
  CP.BOMB_COST = 120;

  /* ---------- saved progress ---------- */
  CP.save = { medals: {}, best: {}, diff: 'normal' };
  try { const raw = localStorage.getItem(KEY); if (raw) Object.assign(CP.save, JSON.parse(raw)); } catch (e) { /* ignore */ }
  CP.flush = function () { try { localStorage.setItem(KEY, JSON.stringify(CP.save)); } catch (e) { /* ignore */ } };
  const RANK = { bronze: 1, silver: 2, gold: 3 };
  CP.medal = (id) => CP.save.medals[id] || null;
  CP.setMedal = function (id, m) {
    if (!m) return;
    if (!CP.save.medals[id] || RANK[m] > RANK[CP.save.medals[id]]) CP.save.medals[id] = m;
    CP.flush();
  };
  CP.setBest = function (id, score) { if (score > (CP.save.best[id] || 0)) { CP.save.best[id] = score; CP.flush(); } };

  /** is this stage open to play? (?unlock=1 opens everything that is built) */
  CP.unlocked = function (id) {
    const st = CP.STAGES[id];
    if (!st || st.soon) return false;
    if (G.debug && G.debug.unlock) return true;
    const gold = (i) => CP.medal(i) === 'gold', any = (i) => !!CP.medal(i);
    switch (id) {
      case 's1': return true;
      case 's2a': return any('s1');
      case 's2b': return gold('s1');
      case 's3a': return any('s2a') || any('s2b');
      case 's3b': return gold('s2a') || gold('s2b');
      case 's4': return any('s3a') || any('s3b');
      case 's5': return any('s4');
      case 's6': return any('s5');
      case 's7': return any('s6');
      default: return false;
    }
  };

  /* ---------- run state ---------- */
  CP.newRun = function (diffKey, stageId) {
    const d = CP.DIFF[diffKey] || CP.DIFF.normal;
    return { diff: d.key, credits: 0, up: { laser: 0, shield: 0, bombs: 0, locks: 0, roll: 0, boost: 0, magnet: 0 }, stageId: stageId || 's1', score: 0, retries: d.retries, continues: d.continues, bombs: 3, cleared: [] };
  };
  CP.bombCap = (run) => 3 + run.up.bombs;
  CP.price = function (run, item) { const lv = run.up[item.id]; return lv >= item.max ? null : item.cost[lv]; };
  CP.buy = function (run, id) {
    if (id === 'bomb1') {
      if (run.credits < CP.BOMB_COST || run.bombs >= CP.bombCap(run)) return false;
      run.credits -= CP.BOMB_COST; run.bombs++; return true;
    }
    const item = CP.SHOP.find((s) => s.id === id), p = item && CP.price(run, item);
    if (p === null || p === undefined || run.credits < p) return false;
    run.credits -= p; run.up[id]++;
    if (id === 'bombs') run.bombs = Math.min(CP.bombCap(run), run.bombs + 1);
    return true;
  };

  /* ---------- results: medal and credits ---------- */
  CP.rate = function (res) {
    const pct = res.spawned > 0 ? res.kills / res.spawned : 1;
    res.pct = Math.min(1, pct);
    return res.pct >= 0.85 ? 'gold' : res.pct >= 0.65 ? 'silver' : 'bronze';
  };
  CP.creditsFor = function (res, run) {
    const d = CP.DIFF[run.diff], st = CP.STAGES[res.stageId];
    const base = Math.floor(res.stageScore / 60) + res.stars * 10 + { gold: 300, silver: 150, bronze: 50 }[res.medal];
    return Math.round(base * d.credits * (st && st.hard ? 1.25 : 1));
  };

  G.campaign = CP;
})((window.SGS = window.SGS || {}));
