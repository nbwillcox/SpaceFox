/* The late-game bosses (all rail fights): Scarlet Talon, the Hollow Queen, the Gatewyrm and the Crown Core, plus the Queen's shield turrets. */
(function (G) {
  'use strict';
  const Game = G.game;
  Game.EN.rturret = { w: 250, r: 100, hp: 16, score: 500, frame: 4, glow: 'rgba(255,150,50,1)' };
  const B = Game._.BOSSES;
  B.bulwark.core = { phase: 2, color: 'rgba(255,150,50,1)', dy: 0.02 };
  B.talon = { name: 'SCARLET TALON', atlas: 'enemy', frame: 0, w: 560, rx: 250, ry: 210, hp: 150, armor: false, y: 70, z: 1100, sway: 330, minion: 'fighter', score: 12000, glow: 'rgba(255,40,60,1)',
    seq1: ['fan', 'swipe', 'orbs', 'spawn'], seq2: ['swipe', 'inferno', 'fan', 'ring', 'swipe'],
    p2: 'It lit the afterburners! It is firing everything it has, Captain!' };
  B.queen = { name: 'HOLLOW QUEEN', atlas: 'none', draw: 'queen', frame: 0, w: 1500, rx: 720, ry: 250, hp: 180, armor: false, shielded: true, y: 80, z: 1350, sway: 140, minion: 'fighter', score: 15000,
    seq1: ['mortar', 'spawn', 'fan', 'ring'], seq2: ['swipe', 'inferno', 'mortar', 'spawn', 'ring'],
    p2: 'The shield generators are down! Hit the carrier hull with everything!' };
  B.gatewyrm = { name: 'GATEWYRM', atlas: 'boss', frame: 1, w: 1000, rx: 390, ry: 250, hp: 200, armor: false, y: 70, z: 1150, sway: 280, minion: 'fighter', score: 12000,
    seq1: ['fan', 'orbs', 'spawn', 'ring'], seq2: ['swipe', 'inferno', 'orbs', 'ring', 'spawn'],
    p2: 'The serpent is coiling tight! It lunges now, Captain!' };
  B.crown = { name: 'CROWN CORE', atlas: 'boss', frame: 2, w: 1050, rx: 430, ry: 430, hp: 300, armor: true, phases: 3, y: 60, z: 1200, sway: 160, minion: 'crystal', score: 25000,
    core: { phase: 3, color: 'rgba(255,60,220,1)', dy: 0 },
    seq1: ['ring', 'mortar', 'orbs', 'ring', 'mortar'], seq2: ['swipe', 'rain', 'fan', 'swipe', 'spawn', 'ring'], seq3: ['inferno', 'orbs', 'ring', 'inferno', 'spawn', 'swipe', 'rain'],
    p2: 'The shield rings are breaking! Its claws are free - dodge the sweeps!',
    p3: 'The core is exposed! The whole station is shaking itself apart - finish it!' };
})((window.SGS = window.SGS || {}));
