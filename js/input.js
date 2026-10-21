/* Flight controls. Every action has one rebindable key (Settings); arrows and the touch layer's F13-F22 codes always work as extras. Double-tapping left / right is a barrel roll. */
(function (G) {
  'use strict';
  const I = { mx: 480, my: 300, mouseActive: false, held: {}, _roll: 0, _bomb: false, _pause: false, _any: false, _launch: false, capture: null };
  const ACTIONS = ['up', 'down', 'left', 'right', 'fire', 'rollL', 'rollR', 'bomb', 'boost', 'brake', 'pause'];
  /* always-on aliases (touch buttons send F13-F22; arrow keys steer) */
  const EXTRA = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', F13: 'left', F14: 'right', F15: 'up', F16: 'down', F17: 'fire', F18: 'rollL', F19: 'rollR', F20: 'bomb', F21: 'boost', F22: 'brake' };
  const last = { left: 0, right: 0 };

  function actionOf(code) {
    const K = G.settings.keys;
    for (const a of ACTIONS) if (K[a] === code) return a;
    for (const k in K) if (K[k] === code) return null;
    return EXTRA[code] || null;
  }
  const NAMES = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', Escape: 'Esc', Enter: 'Enter', Backspace: 'Bksp', Tab: 'Tab', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'L-Alt', AltRight: 'R-Alt', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: '\'', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`', Backslash: '\\' };
  I.keyName = function (code) {
    if (!code) return '-';
    const m = /^(Key|Digit)(.)$/.exec(code);
    if (m) return m[2];
    if (NAMES[code]) return NAMES[code];
    return code.replace(/^Numpad/, 'Num ');
  };

  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.takeAny = () => { const b = I._any; I._any = false; return b; };
  I.takeLaunch = () => { const b = I._launch; I._launch = false; return b; };
  I.takeRoll = () => { const r = I._roll; I._roll = 0; return r; };
  I.takeBomb = () => { const b = I._bomb; I._bomb = false; return b; };
  I.clear = () => { I.held = {}; I._roll = 0; I._bomb = I._pause = I._any = I._launch = false; };
  I.axisX = () => (I.held.right ? 1 : 0) - (I.held.left ? 1 : 0);
  I.axisY = () => (I.held.up ? 1 : 0) - (I.held.down ? 1 : 0);

  function typing(t) { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; }

  window.addEventListener('keydown', (e) => {
    const c = e.code;
    if (I.capture) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) I.capture(c); return; }
    if (typing(e.target)) return;
    const a = actionOf(c);
    if (a && !e.repeat) {
      I.held[a] = true;
      if (a === 'left' || a === 'right' || a === 'up' || a === 'down') I.mouseActive = false;      /* the keyboard takes the ship back from the mouse */
      if (a === 'rollL') I._roll = -1;
      else if (a === 'rollR') I._roll = 1;
      else if (a === 'bomb') I._bomb = true;
      else if (a === 'pause') I._pause = true;
      else if (a === 'fire') I._launch = true;
      else if (a === 'left' || a === 'right') {
        const now = performance.now();
        if (now - last[a] < 260) { I._roll = a === 'left' ? -1 : 1; last[a] = 0; } else last[a] = now;
      }
    } else if (c === 'Escape' && !e.repeat) I._pause = true;
    if (!e.repeat) I._any = true;
    if ((a || c === 'Space') && e.target.tagName !== 'BUTTON') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { const a = actionOf(e.code); if (a) I.held[a] = false; });
  window.addEventListener('blur', () => I.clear());
  /* mouse: move to steer (until a steering key is touched), left button fires (hold = charge), right button rolls toward the pointer */
  function toGame(e) {
    const v = G.view;
    if (!v) return;
    I.mx = (e.clientX - v.ox) / v.s; I.my = (e.clientY - v.oy) / v.s;
  }
  I.bind = function (canvas) {
    canvas.addEventListener('pointerdown', (e) => {
      I._any = true;
      if (e.pointerType !== 'mouse' || !G.settings.mouse) return;
      toGame(e); I.mouseActive = true;
      if (e.button === 0) { I.held.fire = true; I._launch = true; }
      else if (e.button === 2) I._roll = I.mx < 480 ? -1 : 1;
      e.preventDefault();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse' && e.button === 0 && G.settings.mouse) I.held.fire = false; });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !G.settings.mouse) return;
      toGame(e);
      if (Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) >= 2 && !I.held.left && !I.held.right && !I.held.up && !I.held.down) I.mouseActive = true;
    });
  };
  /* gamepad: left stick / d-pad steer, A fire, B bomb, X or LB roll left, Y or RB roll right, LT brake, RT boost, Start pause */
  const pad = { prev: {}, on: false };
  function padSet(a, v, edge) {
    if (pad.prev[a] === v) return;
    pad.prev[a] = v;
    I.held[a] = v;
    if (!v) return;
    I._any = true;
    if (a === 'rollL') I._roll = -1; else if (a === 'rollR') I._roll = 1; else if (a === 'bomb') I._bomb = true; else if (a === 'pause') I._pause = true; else if (a === 'fire') I._launch = true;
  }
  I.pollPad = function () {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) if (p && p.connected) { gp = p; break; }
    if (!gp) { if (pad.on) { pad.on = false; for (const a in pad.prev) if (pad.prev[a]) padSet(a, false); } return; }
    pad.on = true;
    const b = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5)), ax = (i) => gp.axes[i] || 0, dz = 0.35;
    padSet('left', ax(0) < -dz || b(14)); padSet('right', ax(0) > dz || b(15)); padSet('up', ax(1) < -dz || b(12)); padSet('down', ax(1) > dz || b(13));
    padSet('fire', b(0)); padSet('bomb', b(1)); padSet('rollL', b(2) || b(4)); padSet('rollR', b(3) || b(5));
    padSet('brake', b(6)); padSet('boost', b(7)); padSet('pause', b(9));
  };
  I.ACTIONS = ACTIONS;
  G.input = I;
})((window.SGS = window.SGS || {}));
