/* Stage data. A stage is a list of timeline events keyed by rail distance `d` (world units from the start); the game spawns each one when it comes within sight.
   Events: { d, e: 'fighter'|'twin'|'gunship'|'crystal'|'tank'|'mine', x, y, n, pat }, { d, e: 'pillar', x, w, h }, { d, e: 'arch', x, gap, h }, { d, e: 'bar', gap, x, h },
   { d, e: 'pickup', kind: 'star'|'repair'|'shield'|'boost', x, y }. Stage 1 is generated from a seeded template deck so it plays the same every time. */
(function (G) {
  'use strict';
  const C = G.C;
  const FLOOR = C.FLOOR;

  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function stage1() {
    const R = rng(1977), ev = [];
    const rr = (a, b) => a + R() * (b - a);
    const pick = (arr) => arr[Math.floor(R() * arr.length)];
    const LEN = 100000, BOSS_AT = 91000;
    /* helpers that push one pattern at distance d */
    const stars = (d, x, y, n, dx, dy) => { for (let i = 0; i < n; i++) ev.push({ d: d + i * 150, e: 'pickup', kind: 'star', x: x + dx * i, y: y + dy * i }); };
    const fighters = (d, n, pat) => ev.push({ d, e: 'fighter', n, pat, x: rr(-220, 220), y: rr(-20, 110) });
    const twin = (d) => ev.push({ d, e: 'twin', x: rr(-250, 250), y: rr(20, 120) });
    const pillars = (d, n) => { let x = rr(-330, 330); for (let i = 0; i < n; i++) { ev.push({ d: d + i * 600, e: 'pillar', x, w: rr(70, 110), h: rr(260, 420) }); x = U_clamp(x + pick([-1, 1]) * rr(220, 360), -400, 400); } };
    const arch = (d) => ev.push({ d, e: 'arch', x: rr(-250, 250), gap: rr(230, 300), h: 150 });
    const bar = (d) => ev.push({ d, e: 'bar', x: rr(-300, 300), gap: rr(300, 380), h: 190 });
    const mines = (d, n) => { for (let i = 0; i < n; i++) ev.push({ d: d + i * 260, e: 'mine', x: rr(-380, 380), y: rr(-90, 130) }); };
    const tanks = (d, n) => { for (let i = 0; i < n; i++) ev.push({ d: d + i * 420, e: 'tank', x: rr(-380, 380), y: FLOOR + 26 }); };
    const crystal = (d) => ev.push({ d, e: 'crystal', x: rr(-320, 320), y: rr(10, 130) });
    const gunship = (d) => ev.push({ d, e: 'gunship', x: rr(-120, 120), y: rr(30, 110) });
    const U_clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

    /* opening: stars and a gentle fighter line so the controls can be felt */
    stars(1200, -200, 20, 6, 80, 15);
    fighters(3600, 3, 'line');
    fighters(5400, 4, 'v');
    ev.push({ d: 7600, e: 'pickup', kind: 'boost', x: 0, y: 40 });
    pillars(8200, 3);
    fighters(11000, 5, 'v');

    let d = 13500;
    while (d < BOSS_AT - 7000) {
      const f = d / LEN, tier = f < 0.3 ? 0 : f < 0.65 ? 1 : 2;
      const deck = [
        () => { fighters(d, 3 + tier + (R() * 2 | 0), pick(['v', 'line', 'wave'])); return 2600; },
        () => { twin(d); if (tier > 0) twin(d + 500); stars(d + 300, -260, 60, 5, 130, 0); return 3000; },
        () => { pillars(d, 3 + tier); return 3000 + tier * 600; },
        () => { arch(d); stars(d - 400, 0, 20, 3, 0, 0); return 2300; },
        () => { mines(d, 3 + tier * 2); return 2400; },
        () => { tanks(d, 2 + tier); stars(d + 200, 300, 120, 5, -120, 10); return 3400; },
        () => { crystal(d); if (tier > 0) crystal(d + 700); return 2900; },
        () => { bar(d); fighters(d + 1100, 4, 'wave'); return 3200; },
        () => { if (tier > 0) gunship(d); else twin(d); fighters(d + 1000, 3, 'line'); return 3800; },
      ];
      const w = tier === 0 ? [0, 0, 1, 2, 3, 4, 5, 7] : tier === 1 ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [0, 1, 1, 2, 3, 4, 5, 6, 6, 7, 8, 8];
      d += deck[pick(w)]() + 400;
    }
    ev.push({ d: 9500, e: 'pickup', kind: 'laser', x: 60, y: 40 });
    ev.push({ d: 22000, e: 'pickup', kind: 'bomb', x: -140, y: 30 });
    ev.push({ d: 38000, e: 'pickup', kind: 'laser', x: 120, y: 60 });
    ev.push({ d: 61000, e: 'pickup', kind: 'bomb', x: 100, y: 40 });
    ev.push({ d: 75000, e: 'pickup', kind: 'life', x: 0, y: 60 });
    ev.push({ d: 90000, e: 'pickup', kind: 'bomb', x: -60, y: 30 });
    ev.push({ d: 30000, e: 'pickup', kind: 'repair', x: -120, y: 40 });
    ev.push({ d: 52000, e: 'pickup', kind: 'shield', x: 140, y: 30 });
    ev.push({ d: 70000, e: 'pickup', kind: 'repair', x: 0, y: 50 });
    ev.push({ d: 82000, e: 'pickup', kind: 'boost', x: -100, y: 40 });
    ev.sort((a, b) => a.d - b.d);
    return ev;
  }

  G.stages = {
    1: {
      n: 1, name: 'EMBER CANYON', length: 100000, bossAt: 91000, bossName: 'BULWARK', key: 0, events: stage1(),
      comms: [
        { d: 300, who: 'moss', expr: 'happy', text: 'All systems green, Captain! The Firebrand is purring like a space-kitten.' },
        { d: 1700, who: 'vale', expr: 'smirk', text: 'Keep the jokes on the channel, Moss. Eyes on the canyon.' },
        { d: 3300, who: 'moss', expr: 'calm', text: 'Fighters ahead! Tap fire to shoot. Hold it to charge and lock on.' },
        { d: 8200, who: 'moss', expr: 'nervous', text: 'Pillars! Weave through them, Captain!' },
        { d: 15500, who: 'moss', expr: 'grin', text: 'Barrel roll with Q or E, or double-tap a side. It bats enemy shots right back!' },
        { d: 23000, who: 'moss', expr: 'cheer', text: 'Grab the stars and canisters! Upgrades and repairs, free of charge.' },
        { d: 48000, who: 'moss', expr: 'shock', text: 'Heavy armor on the scanners. Use lock-on volleys on the big ones!' },
        { d: 72000, who: 'vale', expr: 'fierce', text: 'The Regent is mining this whole reach. We end it here.' },
        { d: 84000, who: 'moss', expr: 'worry', text: 'Captain... the canyon walls are opening up. Something big is waiting.' },
      ],
    },
  };
})((window.SGS = window.SGS || {}));
