/* Controller map for SpaceFox. The F13-F22 codes are the extra aliases the game always accepts, so a remapped keyboard never breaks the controller. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacefox', title: 'SpaceFox',
  hint: '<b>Stick / D-pad</b> steer &nbsp; <b>A</b> fire (hold to charge) &nbsp; <b>B</b> bomb &nbsp; <b>X / LB</b> roll left &nbsp; <b>Y / RB</b> roll right &nbsp; <b>RT</b> boost &nbsp; <b>LT</b> brake &nbsp; <b>Start</b> pause',
  move: { keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, mode: '8', thresh: 0.35 },
  actions: [
    { id: 'fire', label: 'Fire / charge', btn: ['A'], key: 'F17' },
    { id: 'bomb', label: 'Bomb', btn: ['B'], key: 'F20' },
    { id: 'rollL', label: 'Roll left', btn: ['X', 'LB'], key: 'F18' },
    { id: 'rollR', label: 'Roll right', btn: ['Y', 'RB'], key: 'F19' },
    { id: 'boost', label: 'Boost', btn: ['RT'], key: 'F21' },
    { id: 'brake', label: 'Brake', btn: ['LT'], key: 'F22' },
  ],
};
