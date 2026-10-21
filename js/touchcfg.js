/* Touch controls for SpaceFox: a floating stick steers; FIRE, ROLL left / right, BOOST, BRAKE and BOMB buttons on the right. The buttons send the F13-F22 key codes, which input.js always accepts. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacefox', title: 'SpaceFox', orient: 'landscape', accent: '#ff7a2e',
  hint: '<b>Left thumb</b>: floating stick to steer &nbsp; <b>FIRE</b> holds the laser &nbsp; <b>ROLL</b> deflects shots &nbsp; <b>BOOST</b> / <b>BRAKE</b> / <b>BOMB</b>',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  pause: { pos: { r: 10, t: 10 } },
  controls: [
    { t: 'stick', id: 'fly', zone: [0, 0.16, 0.45, 1], mode: '8', keys: { l: 'F13', r: 'F14', u: 'F15', d: 'F16' }, r: 58 },
    { t: 'btn', id: 'fire', label: 'FIRE', key: 'F17', hold: true, size: 92, pos: { r: 18, b: 22 } },
    { t: 'btn', id: 'rollr', label: 'ROLL \u21BB', key: 'F19', hold: false, size: 58, pos: { r: 120, b: 24 } },
    { t: 'btn', id: 'rolll', label: '\u21BA ROLL', key: 'F18', hold: false, size: 58, pos: { r: 184, b: 24 } },
    { t: 'btn', id: 'boost', label: 'BOOST', key: 'F21', hold: true, size: 58, pos: { r: 20, b: 124 } },
    { t: 'btn', id: 'brake', label: 'BRAKE', key: 'F22', hold: true, size: 58, pos: { r: 84, b: 124 } },
    { t: 'btn', id: 'bomb', label: 'BOMB', key: 'F20', hold: false, size: 54, pos: { r: 148, b: 124 } },
  ],
};
