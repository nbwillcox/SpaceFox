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

  /* ---------- generic stage composer for the later stages ---------- */
  function compose(cfg) {
    const R = rng(cfg.seed), ev = [];
    const rr = (a, b) => a + R() * (b - a);
    const pick = (arr) => arr[Math.floor(R() * arr.length)];
    const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
    const P = {
      rings: (d, t) => { let x = rr(-250, 250), y = rr(-20, 100); for (let i = 0; i < 6; i++) { ev.push({ d: d + i * 420, e: 'ring', x, y, r: 175 - t * 8 }); x = cl(x + rr(-190, 190), -380, 380); y = cl(y + rr(-70, 70), -100, 140); } return 3300; },
      stars: (d) => { const x = rr(-300, 200), y = rr(-20, 100); for (let i = 0; i < 5; i++) ev.push({ d: d + i * 150, e: 'pickup', kind: 'star', x: x + i * 90, y: y + i * 10 }); return 900; },
      fighters: (d, t) => { ev.push({ d, e: 'fighter', n: 3 + t + (R() * 2 | 0), pat: pick(['v', 'line', 'wave']), x: rr(-220, 220), y: rr(-20, 110) }); return 2400; },
      twin: (d, t) => { ev.push({ d, e: 'twin', x: rr(-250, 250), y: rr(20, 120) }); if (t > 0) ev.push({ d: d + 500, e: 'twin', x: rr(-250, 250), y: rr(20, 120) }); return 3000; },
      crystal: (d, t) => { ev.push({ d, e: 'crystal', x: rr(-320, 320), y: rr(10, 130) }); if (t > 0) ev.push({ d: d + 700, e: 'crystal', x: rr(-320, 320), y: rr(10, 130) }); return 2800; },
      gunship: (d, t) => { ev.push({ d, e: 'gunship', x: rr(-120, 120), y: rr(30, 110) }); ev.push({ d: d + 1000, e: 'fighter', n: 3, pat: 'line', x: rr(-200, 200), y: 60 }); return 3800; },
      mines: (d, t) => { for (let i = 0; i < 3 + t * 2; i++) ev.push({ d: d + i * 260, e: 'mine', x: rr(-380, 380), y: rr(-90, 130) }); return 2400; },
      tanks: (d, t) => { for (let i = 0; i < 2 + t; i++) ev.push({ d: d + i * 420, e: 'tank', x: rr(-380, 380), y: FLOOR + 26 }); return 3400; },
      pillars: (d, t) => { let x = rr(-330, 330); const n = 3 + t; for (let i = 0; i < n; i++) { ev.push({ d: d + i * 600, e: 'pillar', x, w: rr(70, 110), h: rr(260, 420) }); x = cl(x + pick([-1, 1]) * rr(220, 360), -400, 400); } return 3000 + t * 500; },
      arch: (d) => { ev.push({ d, e: 'arch', x: rr(-250, 250), gap: rr(230, 300), h: 150 }); return 2300; },
      bar: (d) => { ev.push({ d, e: 'bar', x: rr(-300, 300), gap: rr(300, 380), h: 190 }); ev.push({ d: d + 1100, e: 'fighter', n: 4, pat: 'wave', x: 0, y: 60 }); return 3200; },
      rocks: (d, t) => { const n = 5 + t * 2; for (let i = 0; i < n; i++) ev.push({ d: d + i * 170, e: 'rock', x: rr(-420, 420), y: rr(-120, 160) }); return 2600; },
      boulders: (d, t) => { let x = rr(-300, 300); for (let i = 0; i < 2 + t; i++) { ev.push({ d: d + i * 700, e: 'boulder', x, y: rr(-60, 100) }); x = cl(x + pick([-1, 1]) * rr(260, 380), -420, 420); } return 3400; },
      gate: (d, t) => { let x = rr(-260, 260), y = rr(-40, 110); for (let i = 0; i < 2 + t; i++) { ev.push({ d: d + i * 900, e: 'gate', x, y, w: rr(300, 360) - t * 20, h: rr(240, 280) - t * 10 }); x = cl(x + pick([-1, 1]) * rr(160, 300), -300, 300); y = cl(y + pick([-1, 1]) * rr(50, 110), -50, 120); } return 3600 + t * 400; },
    };
    const first = cfg.opening || [];
    let d = 2500;
    for (const name of first) d += P[name](d, 0) + 300;
    while (d < cfg.bossAt - 7000) {
      const f = d / cfg.bossAt, tier = f < 0.33 ? 0 : f < 0.66 ? 1 : 2;
      const w = cfg.deck[tier];
      d += P[pick(w)](d, Math.min(2, tier + (cfg.tierBoost || 0))) * (cfg.gap || 1) + 400;
    }
    for (const p of cfg.pickups) ev.push(Object.assign({ e: 'pickup' }, p));
    ev.sort((a, b) => a.d - b.d);
    return ev;
  }

  const OPEN = { stars: 1 };

  G.stages = {

    s4: {
      id: 's4', n: 4, name: 'NEBULA ARENA', theme: 'arena', mode: 'arena', length: 1, key: 6, boss: 'talon', events: [],
      arena: {
        R: 5200, boss: 'talon', bossT: 120,
        waves: [{ t: 2, kind: 'afighter', n: 3 }, { t: 14, kind: 'afighter', n: 4 }, { t: 27, kind: 'atwin', n: 2 }, { t: 29, kind: 'afighter', n: 3 }, { t: 44, kind: 'afighter', n: 5 }, { t: 58, kind: 'atwin', n: 2 }, { t: 60, kind: 'afighter', n: 4 }],
        pickups: [{ t: 6, kind: 'star' }, { t: 7, kind: 'star' }, { t: 8, kind: 'star' }, { t: 19, kind: 'bomb' }, { t: 24, kind: 'star' }, { t: 25, kind: 'star' }, { t: 33, kind: 'repair' }, { t: 41, kind: 'laser' }, { t: 47, kind: 'star' }, { t: 48, kind: 'star' }, { t: 52, kind: 'bomb' }, { t: 64, kind: 'repair' }, { t: 72, kind: 'shield' }],
      },
      comms: [
        { d: 400, who: 'moss', expr: 'calm', text: 'Open space, Captain! No rails here. Left and right turn the ship, up and down pitch the nose.' },
        { d: 4500, who: 'vale', expr: 'cool', text: 'The scanner ring in the corner shows every contact. Straight ahead is the top.' },
        { d: 12000, who: 'moss', expr: 'nervous', text: 'Some are on your tail! Turn hard, or roll to throw their shots back.' },
        { d: 36000, who: 'vale', expr: 'smirk', text: 'They keep coming. Keep your shield topped up.' },
        { d: 70000, who: 'moss', expr: 'worry', text: 'Captain... one signature just lit up the whole scanner.' },
      ],
      bossWarn: [{ who: 'moss', expr: 'gasp', text: 'That crimson streak is Scarlet Talon, the Regent\'s best ace!', pri: 2 }, { who: 'vale', expr: 'smug', text: 'I have been waiting for a rematch. Stay on his tail, Moss.', pri: 1 }],
      victory: [{ who: 'vale', expr: 'warm', text: 'Talon is down. Not a scratch on my paint.', pri: 2 }, { who: 'moss', expr: 'laugh', text: 'And not a scratch on mine either!', pri: 1 }],
    },
    s5: {
      id: 's5', n: 5, name: 'GATEWYRM RUN', theme: 'warp', length: 100000, bossAt: 92000, boss: 'gatewyrm', key: 8,
      events: compose({ seed: 5555, bossAt: 92000, gap: 0.95, opening: ['stars', 'rings', 'fighters'],
        deck: [['rings', 'fighters', 'twin', 'rings', 'mines', 'crystal'], ['rings', 'fighters', 'twin', 'crystal', 'rings', 'gunship', 'mines'], ['rings', 'rings', 'fighters', 'twin', 'crystal', 'gunship', 'mines']],
        pickups: [{ d: 8000, kind: 'laser', x: 0, y: 40 }, { d: 22000, kind: 'bomb', x: 90, y: 30 }, { d: 34000, kind: 'repair', x: -80, y: 40 }, { d: 48000, kind: 'laser', x: 50, y: 60 }, { d: 60000, kind: 'bomb', x: -80, y: 30 }, { d: 72000, kind: 'repair', x: 70, y: 40 }, { d: 82000, kind: 'shield', x: 0, y: 30 }] }),
      comms: [
        { d: 400, who: 'moss', expr: 'happy', text: 'Warp lane! Fly through the gold rings for bonus points, and every fifth one tops up your shield.' },
        { d: 6000, who: 'vale', expr: 'cool', text: 'Chain them. A miss breaks the chain.' },
        { d: 30000, who: 'moss', expr: 'nervous', text: 'The lane is full of Gloom fighters. Guns up, Captain!' },
        { d: 80000, who: 'moss', expr: 'worry', text: 'The rings ahead are coiled around something very big and very alive.' },
      ],
      bossWarn: [{ who: 'moss', expr: 'gasp', text: 'The Gatewyrm! A mechanical serpent wrapped around the gates!', pri: 2 }, { who: 'vale', expr: 'fierce', text: 'Shoot the head. Dodge the coils.', pri: 1 }],
      victory: [{ who: 'vale', expr: 'smirk', text: 'The gate is open. Only the fleet stands between us and the Regent.', pri: 2 }, { who: 'moss', expr: 'cheer', text: 'Hangar time, Captain!', pri: 1 }],
    },
    s6: {
      id: 's6', n: 6, name: "REGENT'S FLEET", theme: 'arena', mode: 'arena', length: 1, key: 9, boss: 'queen', events: [],
      arena: {
        R: 6200, carrier: true, boss: 'queen',
        waves: [],
        pickups: [{ t: 8, kind: 'star' }, { t: 9, kind: 'star' }, { t: 16, kind: 'repair' }, { t: 28, kind: 'bomb' }, { t: 36, kind: 'star' }, { t: 37, kind: 'star' }, { t: 46, kind: 'laser' }, { t: 58, kind: 'repair' }, { t: 70, kind: 'bomb' }, { t: 82, kind: 'repair' }, { t: 95, kind: 'shield' }, { t: 108, kind: 'bomb' }, { t: 120, kind: 'repair' }],
      },
      comms: [
        { d: 500, who: 'moss', expr: 'gasp', text: 'There she is - the Hollow Queen, the Regent\'s flagship carrier!' },
        { d: 4000, who: 'vale', expr: 'cool', text: 'Her shield is projected by four turrets. Take them out first.' },
        { d: 14000, who: 'moss', expr: 'nervous', text: 'Fighters are launching from her hangars! Do not stop moving!' },
        { d: 50000, who: 'vale', expr: 'fierce', text: 'Keep circling. Strafe the turrets, then the hull.' },
      ],
      bossWarn: [],
      victory: [{ who: 'vale', expr: 'warm', text: 'The Hollow Queen is hollow no more. One last jump, Cinder Squadron.', pri: 2 }, { who: 'moss', expr: 'cheer', text: 'To the hangar, then to the Crown Core!', pri: 1 }],
    },
    s7: {
      id: 's7', n: 7, name: 'CROWN CORE', theme: 'fortress', length: 110000, bossAt: 100000, boss: 'crown', key: 10,
      events: compose({ seed: 7070, bossAt: 100000, gap: 0.9, tierBoost: 1, opening: ['stars', 'gate', 'fighters'],
        deck: [['gate', 'fighters', 'twin', 'crystal', 'mines', 'gunship', 'gate'], ['gate', 'fighters', 'twin', 'crystal', 'mines', 'gunship', 'gate', 'gate'], ['gate', 'gate', 'twin', 'crystal', 'gunship', 'gunship', 'mines', 'fighters']],
        pickups: [{ d: 8000, kind: 'laser', x: 0, y: 40 }, { d: 20000, kind: 'bomb', x: 90, y: 30 }, { d: 32000, kind: 'repair', x: -80, y: 40 }, { d: 46000, kind: 'laser', x: 50, y: 60 }, { d: 58000, kind: 'bomb', x: -80, y: 30 }, { d: 68000, kind: 'repair', x: 70, y: 40 }, { d: 78000, kind: 'life', x: 0, y: 50 }, { d: 88000, kind: 'shield', x: 0, y: 30 }, { d: 94000, kind: 'bomb', x: 60, y: 30 }] }),
      comms: [
        { d: 400, who: 'vale', expr: 'fierce', text: 'This is it, Cinder Squadron. The Crown Core.' },
        { d: 6000, who: 'moss', expr: 'nervous', text: 'The fortress corridors are lit like a furnace. Mind the gates!' },
        { d: 40000, who: 'moss', expr: 'worry', text: 'Gunships and crystals on every deck. The Regent knows we are coming.' },
        { d: 90000, who: 'vale', expr: 'cool', text: 'Whatever is waiting at the end, we finish it together.' },
      ],
      bossWarn: [{ who: 'moss', expr: 'gasp', text: 'The Crown Core! The Regent\'s own war machine - six claws and a shield ring!', pri: 2 }, { who: 'vale', expr: 'shout', text: 'Lock on and roll through everything it throws. For the Reach!', pri: 1 }],
      victory: [{ who: 'vale', expr: 'laugh', text: 'The Regent is finished. Hearth Reach is free.', pri: 2 }, { who: 'moss', expr: 'cheer', text: 'Told you the Firebrand purrs, Captain!', pri: 1 }],
    },
    s2a: {
      id: 's2a', n: 2, name: 'DRIFT BELT', theme: 'space', length: 90000, bossAt: 82000, boss: 'rockjaw', key: 2,
      events: compose({ seed: 4242, bossAt: 82000, gap: 1.05, opening: ['stars', 'fighters', 'rocks'],
        deck: [['fighters', 'rocks', 'rocks', 'boulders', 'twin', 'mines', 'stars'], ['fighters', 'rocks', 'boulders', 'twin', 'crystal', 'mines', 'rocks', 'gunship'], ['fighters', 'rocks', 'boulders', 'boulders', 'twin', 'crystal', 'gunship', 'mines']],
        pickups: [{ d: 8000, kind: 'laser', x: 0, y: 40 }, { d: 21000, kind: 'bomb', x: -100, y: 30 }, { d: 30000, kind: 'repair', x: 80, y: 40 }, { d: 44000, kind: 'laser', x: 60, y: 60 }, { d: 56000, kind: 'bomb', x: 100, y: 30 }, { d: 64000, kind: 'repair', x: -90, y: 40 }, { d: 72000, kind: 'shield', x: 60, y: 30 }] }),
      comms: [
        { d: 400, who: 'moss', expr: 'calm', text: 'Entering the Drift Belt. Big rocks are solid, little ones you can shoot.' },
        { d: 6500, who: 'vale', expr: 'cool', text: 'Stay loose. Use the whole sky.' },
        { d: 30000, who: 'moss', expr: 'nervous', text: 'Rock density is climbing. Keep an eye on those boulders!' },
        { d: 70000, who: 'moss', expr: 'worry', text: 'Something huge is hiding in that cluster, Captain.' },
      ],
      bossWarn: [{ who: 'moss', expr: 'gasp', text: 'Rockjaw! A flying gunship the size of a moon!', pri: 2 }, { who: 'vale', expr: 'fierce', text: 'Then it makes a big target. Lock on and fire.', pri: 1 }],
      victory: [{ who: 'vale', expr: 'smirk', text: 'Rockjaw is rubble. On to the next sector.', pri: 2 }, { who: 'moss', expr: 'cheer', text: 'Sector clear! Time to restock at the hangar.', pri: 1 }],
    },
    s2b: {
      id: 's2b', n: 2, name: 'GLASSWATER REACH', theme: 'water', length: 96000, bossAt: 88000, boss: 'tidecaller', key: 5, hard: true,
      events: compose({ seed: 7777, bossAt: 88000, gap: 0.92, tierBoost: 0, opening: ['stars', 'fighters', 'arch'],
        deck: [['fighters', 'arch', 'pillars', 'tanks', 'twin', 'bar', 'mines'], ['fighters', 'arch', 'pillars', 'tanks', 'twin', 'crystal', 'bar', 'gunship'], ['fighters', 'arch', 'tanks', 'twin', 'crystal', 'gunship', 'bar', 'pillars', 'mines']],
        pickups: [{ d: 7000, kind: 'laser', x: 0, y: 40 }, { d: 20000, kind: 'bomb', x: 100, y: 30 }, { d: 32000, kind: 'repair', x: -80, y: 40 }, { d: 46000, kind: 'laser', x: -60, y: 50 }, { d: 58000, kind: 'bomb', x: -90, y: 30 }, { d: 68000, kind: 'repair', x: 80, y: 40 }, { d: 78000, kind: 'shield', x: 0, y: 30 }] }),
      comms: [
        { d: 400, who: 'moss', expr: 'nervous', text: 'The hard route, huh? Gun batteries on the water and arches everywhere.' },
        { d: 6000, who: 'vale', expr: 'smug', text: 'Good. Gold medals are not earned on the easy road.' },
        { d: 38000, who: 'moss', expr: 'shock', text: 'Heavy gunships incoming. Lock-on volleys, Captain!' },
        { d: 80000, who: 'moss', expr: 'worry', text: 'Captain... the water is moving. Something is rising.' },
      ],
      bossWarn: [{ who: 'moss', expr: 'gasp', text: 'It is the Tidecaller! Those twin pods fire pairs of slow orbs.', pri: 2 }, { who: 'vale', expr: 'fierce', text: 'Roll through the orbs and send them back.', pri: 1 }],
      victory: [{ who: 'vale', expr: 'warm', text: 'Tidecaller is down. That is how the hard road is run.', pri: 2 }, { who: 'moss', expr: 'laugh', text: 'Bonus credits at the hangar, Captain!', pri: 1 }],
    },
    s3a: {
      id: 's3a', n: 3, name: 'FOUNDRY SPINE', theme: 'foundry', length: 94000, bossAt: 86000, boss: 'warden', key: 3,
      events: compose({ seed: 9091, bossAt: 86000, gap: 1, opening: ['stars', 'pillars', 'fighters'],
        deck: [['pillars', 'tanks', 'bar', 'fighters', 'mines', 'twin', 'stars'], ['pillars', 'tanks', 'bar', 'twin', 'crystal', 'mines', 'fighters'], ['pillars', 'tanks', 'bar', 'twin', 'crystal', 'gunship', 'mines', 'tanks']],
        pickups: [{ d: 8000, kind: 'laser', x: 0, y: 40 }, { d: 22000, kind: 'bomb', x: 90, y: 30 }, { d: 34000, kind: 'repair', x: -70, y: 40 }, { d: 48000, kind: 'laser', x: 50, y: 60 }, { d: 60000, kind: 'bomb', x: -80, y: 30 }, { d: 70000, kind: 'repair', x: 70, y: 40 }, { d: 78000, kind: 'life', x: 0, y: 50 }] }),
      comms: [
        { d: 400, who: 'moss', expr: 'grump', text: 'It is hot enough in here to cook a frog. Mind the crushers.' },
        { d: 6000, who: 'vale', expr: 'smirk', text: 'Turrets on the floor. Lock on or roll through their shells.' },
        { d: 42000, who: 'moss', expr: 'calm', text: 'Foundry heartbeat ahead. The Warden is close.' },
      ],
      bossWarn: [{ who: 'moss', expr: 'gasp', text: 'The Foundry Warden! It is a mobile cannon platform!', pri: 2 }, { who: 'vale', expr: 'shout', text: 'Dodge its quake lanes and keep firing!', pri: 1 }],
      victory: [{ who: 'vale', expr: 'laugh', text: 'The furnace is cold. One sector to go.', pri: 2 }, { who: 'moss', expr: 'happy', text: 'To the hangar!', pri: 1 }],
    },
    s3b: {
      id: 's3b', n: 3, name: 'GHOST STATION', theme: 'tunnel', length: 98000, bossAt: 90000, boss: 'prism', key: 7, hard: true,
      events: compose({ seed: 1313, bossAt: 90000, gap: 0.95, opening: ['stars', 'gate', 'fighters'],
        deck: [['gate', 'fighters', 'twin', 'mines', 'gate', 'crystal'], ['gate', 'fighters', 'twin', 'mines', 'crystal', 'gate', 'gunship'], ['gate', 'gate', 'twin', 'mines', 'crystal', 'gunship', 'fighters']],
        pickups: [{ d: 7000, kind: 'laser', x: 0, y: 40 }, { d: 20000, kind: 'bomb', x: 80, y: 30 }, { d: 34000, kind: 'repair', x: -80, y: 40 }, { d: 46000, kind: 'laser', x: 40, y: 50 }, { d: 60000, kind: 'bomb', x: -90, y: 30 }, { d: 72000, kind: 'repair', x: 80, y: 40 }, { d: 82000, kind: 'shield', x: 0, y: 30 }] }),
      comms: [
        { d: 400, who: 'moss', expr: 'nervous', text: 'Dead station. Lights are flickering, and I do not like it.' },
        { d: 6500, who: 'vale', expr: 'cool', text: 'Gates ahead. Pick the gap and thread it.' },
        { d: 50000, who: 'moss', expr: 'worry', text: 'Power spikes in the core. Whatever is in there is awake.' },
      ],
      bossWarn: [{ who: 'moss', expr: 'gasp', text: 'A Prism Sentinel! It shatters into shards when it is hurt!', pri: 2 }, { who: 'vale', expr: 'fierce', text: 'Then we hit it harder.', pri: 1 }],
      victory: [{ who: 'vale', expr: 'warm', text: 'Station secured. The Regent is next.', pri: 2 }, { who: 'moss', expr: 'cheer', text: 'And a big pile of credits for the hangar!', pri: 1 }],
    },
    s1: {
      id: 's1', theme: 'canyon', boss: 'bulwark',
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
  G.stages[1] = G.stages.s1;
})((window.SGS = window.SGS || {}));
