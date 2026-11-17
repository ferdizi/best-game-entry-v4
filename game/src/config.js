// FLOODWARDEN configuration: board, economy, waves, hazards and the boss.
// One clear job: every tunable number lives here so world.js stays about rules.
export const VIEW = { width: 1280, height: 720 };
export const GRID = { cols: 9, rows: 6, x: 300, y: 120, cell: 64, gap: 4 };
export const VALLEYS = [
  { name: 'REED HOLLOW', tint: '#2e6b4f', towns: ['Reed Hollow'] },
  { name: 'MILLSTONE BASIN', tint: '#7a5a2e', towns: ['Millstone'] },
  { name: 'SALTMARSH DELTA', tint: '#2e5d6b', towns: ['Saltmarsh'] },
];
export const TOWNS = [
  { name: 'Reed Hollow', col: 1, need: 2 },
  { name: 'Millstone', col: 4, need: 2 },
  { name: 'Saltmarsh', col: 7, need: 2 },
];
// Build menu: six meaningful choices, each with a cost in droplets.
export const BUILDS = [
  { id: 'canal', key: '1', name: 'Canal', cost: 10, blurb: 'Carries water' },
  { id: 'levee', key: '2', name: 'Levee', cost: 25, blurb: 'Blocks flood' },
  { id: 'pump', key: '3', name: 'Pump', cost: 40, blurb: '+flow, +pressure' },
  { id: 'tower', key: '4', name: 'Water Tower', cost: 35, blurb: 'Stores, -pressure' },
  { id: 'sluice', key: '5', name: 'Sluice Gate', cost: 30, blurb: 'Diverts, -pressure' },
  { id: 'spillway', key: '6', name: 'Spillway', cost: 20, blurb: 'Safe overflow' },
];
export const HAZARDS = [
  { id: 'drought', name: 'DROUGHT', blurb: 'Springs run slow' },
  { id: 'debris', name: 'DEBRIS DAM', blurb: 'A canal is blocked' },
  { id: 'flash', name: 'FLASH FLOOD', blurb: 'Surge x2 flow' },
  { id: 'mudslide', name: 'MUDSLIDE', blurb: 'A tile is buried' },
  { id: 'storm', name: 'STORM SURGE', blurb: 'Rain on every row' },
  { id: 'whirlpool', name: 'WHIRLPOOL', blurb: 'Drains pressure' },
];
// Seven floods: each names its valley, its hazard and how much water it brings.
export const WAVES = [
  { season: 1, valley: 0, hazard: 'drought', flow: 3, target: 2, gold: 40 },
  { season: 2, valley: 0, hazard: 'debris', flow: 4, target: 2, gold: 45 },
  { season: 3, valley: 1, hazard: 'flash', flow: 5, target: 3, gold: 50 },
  { season: 4, valley: 1, hazard: 'mudslide', flow: 5, target: 3, gold: 55 },
  { season: 5, valley: 2, hazard: 'storm', flow: 6, target: 3, gold: 60 },
  { season: 6, valley: 2, hazard: 'whirlpool', flow: 6, target: 3, gold: 65 },
  { season: 7, valley: 2, hazard: 'flash', flow: 8, target: 3, gold: 80, boss: true },
];
export const BOSS = {
  name: 'THE DELUGEWYRM',
  title: 'Eater of Valleys — 3 phases',
  maxHp: 300,
  phases: ['PHASE 1 — Coils', 'PHASE 2 — Raging Maw', 'PHASE 3 — Drowning Roar'],
};
export const START = { gold: 120, health: 3, score: 0, pressure: 35 };
export const STEP = 1 / 60;
export const FLOW_TICK = 0.42;
