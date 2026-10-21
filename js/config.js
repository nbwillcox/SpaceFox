(function (G) {
  'use strict';

  const C = {
    W: 960, H: 540,
    REPO: 'https://github.com/nbwillcox/SpaceFox',
    /* pseudo-3D camera: vanishing point, focal length, eye height above the ship's neutral plane */
    VX: 480, VY: 215, F: 560, EYE: 155,
    FLOOR: -210, CEIL: 430, WALL: 900, ZFAR: 3200, SHIP_Z: 60,
    BX: 470, BY0: -150, BY1: 170,                       /* ship movement bounds (world units) */
    START_RETRIES: 3, SHIELD: 100,
    SPEED: 720,                                          /* rail speed, world units per second */
  };

  const KEY = 'spacefox.settings.v1';
  const DEFAULT_KEYS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', fire: 'Space', rollL: 'KeyQ', rollR: 'KeyE', bomb: 'KeyB', boost: 'ShiftLeft', brake: 'ControlLeft', pause: 'KeyP' };
  const defaults = { master: 0.8, music: 0.6, sfx: 0.9, bloom: true, shake: true, reduced: false, comms: 'full', autofire: false, mouse: true };

  const S = Object.assign({}, defaults);
  S.keys = Object.assign({}, DEFAULT_KEYS);
  let hadSaved = false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const o = JSON.parse(raw); Object.assign(S, o); S.keys = Object.assign({}, DEFAULT_KEYS, o.keys); hadSaved = true; }
  } catch (e) { /* storage unavailable */ }
  S.save = function () {
    try {
      const o = {};
      for (const k in defaults) o[k] = S[k];
      o.keys = S.keys;
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch (e) { /* ignore */ }
  };
  if (!hadSaved && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) S.reduced = true;
  if (!hadSaved && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) S.autofire = true;     /* on a phone, holding FIRE rapid-fires by default (charge lock-on is one tick away in Settings) */
  S.DEFAULT_KEYS = DEFAULT_KEYS;
  G.C = C;
  G.settings = S;
})((window.SGS = window.SGS || {}));
