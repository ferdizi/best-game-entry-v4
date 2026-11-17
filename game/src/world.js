// FLOODWARDEN world: the rules. Water flows down canal tiles from the three
// mountain springs to the three valley towns; the player builds the route,
// spends droplets, holds pressure, and survives seven floods and the boss.
import { BUILDS, BOSS, FLOW_TICK, GRID, HAZARDS, START, TOWNS, VALLEYS, WAVES } from './config.js';
import { mulberry32 } from './random.js';
import { playAlarm, playBreak, playCoin, playPluck, playSplash } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';
export const EVENT_OVER = 1;
export const EVENT_FED = 2;
export const EVENT_FLOOD = 4;

const SPRING_COLS = [1, 4, 7];

function emptyCell() {
  return { kind: 'grass', water: 0, blocked: false, buried: false, fed: false };
}
function starterCanals() {
  // A half-built spine so the first flood is winnable and the route reads at once:
  // all three spring columns run down to row 4; the player finishes the last
  // link (row 5) to each town — the first flood's puzzle, for 30 droplets.
  return [
    [1, 0], [1, 1], [1, 2], [1, 3], [1, 4],
    [4, 0], [4, 1], [4, 2], [4, 3], [4, 4],
    [7, 0], [7, 1], [7, 2], [7, 3], [7, 4],
    [2, 3], [6, 4],
  ];
}
function starterRocks() { return [[0, 2], [8, 3], [3, 4]]; }

export function createWorld(seed) {
  const rng = mulberry32(seed || 1);
  const grid = [];
  for (let r = 0; r < GRID.rows; r += 1) {
    const row = [];
    for (let c = 0; c < GRID.cols; c += 1) row.push(emptyCell());
    grid.push(row);
  }
  for (const [c, r] of starterCanals()) grid[r][c].kind = 'canal';
  for (const [c, r] of starterRocks()) grid[r][c].kind = 'rock';
  return {
    rng, seed: seed || 1, screen: SCREEN_TITLE, won: false,
    grid, score: START.score, gold: START.gold, health: START.health,
    pressure: START.pressure, combo: 1, comboBest: 1,
    waveIndex: 0, phase: 'build', flowTimer: 0, flowSteps: 0,
    townsFedWave: 0, townsFedTotal: 0, floods: 0, fedStreak: 0,
    bossHp: BOSS.maxHp, bossPhase: 0,
    floaters: [], particles: [], log: ['Springs open at dawn. Build the route.'],
    selected: 'canal', muted: false, time: 0, shake: 0, bossRoared: false,
    hazardNote: '', nextHazard: HAZARDS[0],
  };
}

export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  for (const key of Object.keys(fresh)) world[key] = fresh[key];
}
export function currentWave(world) { return WAVES[world.waveIndex] || WAVES[WAVES.length - 1]; }
export function currentValley(world) { return VALLEYS[currentWave(world).valley]; }
export function nextWaveInfo(world) {
  const next = WAVES[world.waveIndex + 1];
  if (!next) return { name: 'THE DELUGEWYRM', blurb: 'Final flood' };
  const hz = HAZARDS.find((h) => h.id === next.hazard);
  return { name: `FLOOD ${next.season} — ${hz.name}`, blurb: hz.blurb };
}
export function hazardOf(world) {
  return HAZARDS.find((h) => h.id === currentWave(world).hazard);
}
export function cellAt(world, col, row) {
  if (col < 0 || col >= GRID.cols || row < 0 || row >= GRID.rows) return null;
  return world.grid[row][col];
}
export function isWaterTile(cell) {
  return cell && ['canal', 'pump', 'tower', 'sluice', 'spillway'].includes(cell.kind);
}
export function addFloater(world, col, row, text, color) {
  // Stagger simultaneous +N popups across three lanes so they never stack.
  const lane = world.floaters.length % 3;
  const baseX = GRID.x + col * (GRID.cell + GRID.gap) + 36;
  const baseY = GRID.y + row * (GRID.cell + GRID.gap) + 20;
  world.floaters.push({ x: baseX + (lane - 1) * 52, y: baseY - lane * 22, text, color: color || '#ffd166', life: 1.2 });
}
export function addScore(world, points, col, row) {
  const gained = points * world.combo;
  world.score += gained;
  if (col !== undefined) addFloater(world, col, row, `+${gained}`, '#ffd166');
  return gained;
}
export function selectBuild(world, id) {
  if (BUILDS.some((b) => b.id === id)) { world.selected = id; playPluck(); return true; }
  return false;
}
export function placeBuild(world, col, row) {
  const cell = cellAt(world, col, row);
  if (!cell || cell.kind === 'rock' || cell.water > 0.4) return false;
  const build = BUILDS.find((b) => b.id === world.selected);
  if (!build) return false;
  if (world.gold < build.cost) { world.log.unshift('Not enough droplets.'); return false; }
  if (cell.kind !== 'grass' && cell.kind !== 'canal') return false;
  world.gold -= build.cost;
  cell.kind = build.id;
  cell.blocked = false;
  if (build.id === 'pump') world.pressure = Math.min(120, world.pressure + 20);
  if (build.id === 'tower') world.pressure = Math.max(0, world.pressure - 10);
  if (build.id === 'sluice') world.pressure = Math.max(0, world.pressure - 15);
  playPluck();
  addFloater(world, col, row, build.name, '#7ef0d4');
  return true;
}
export function removeTile(world, col, row) {
  const cell = cellAt(world, col, row);
  if (!cell || cell.kind === 'grass' || cell.kind === 'rock') return false;
  const build = BUILDS.find((b) => b.id === cell.kind);
  if (build) world.gold += Math.floor(build.cost / 2);
  cell.kind = 'grass'; cell.water = 0;
  playPluck();
  return true;
}
function springCells(world) { return SPRING_COLS.map((c) => ({ col: c, row: 0 })); }
function townForCol(col) { return TOWNS.find((t) => t.col === col); }

export function startWave(world) {
  if (world.screen !== SCREEN_PLAY || world.phase !== 'build') return false;
  const wave = currentWave(world);
  world.phase = 'flow'; world.flowTimer = 0; world.flowSteps = 0; world.townsFedWave = 0;
  world.hazardNote = `${hazardOf(world).name} — ${hazardOf(world).blurb}`;
  world.log.unshift(`Flood ${wave.season} begins: ${world.hazardNote}`);
  applyHazard(world, wave);
  for (const s of springCells(world)) {
    const cell = cellAt(world, s.col, s.row);
    if (cell && isWaterTile(cell)) { cell.water = 1; }
  }
  if (wave.boss && !world.bossRoared) { world.bossRoared = true; }
  playSplash();
  return true;
}
function applyHazard(world, wave) {
  const rng = world.rng;
  if (wave.hazard === 'debris') {
    const canals = [];
    for (let r = 0; r < GRID.rows; r += 1) for (let c = 0; c < GRID.cols; c += 1) {
      if (world.grid[r][c].kind === 'canal') canals.push([c, r]);
    }
    if (canals.length) { const [c, r] = canals[Math.floor(rng() * canals.length)]; world.grid[r][c].blocked = true; world.log.unshift(`Debris dam blocks a canal at ${c + 1},${r + 1}.`); }
  }
  if (wave.hazard === 'mudslide') {
    const c = 1 + Math.floor(rng() * (GRID.cols - 2));
    const r = 1 + Math.floor(rng() * (GRID.rows - 2));
    const cell = world.grid[r][c];
    if (cell.kind !== 'rock') { cell.kind = 'grass'; cell.buried = true; cell.water = 0; world.log.unshift('Mudslide buries a tile. Rebuild it.'); }
  }
  if (wave.hazard === 'drought') { world.pressure = Math.max(0, world.pressure - 10); }
  if (wave.hazard === 'whirlpool') { world.pressure = Math.max(0, world.pressure - 25); }
  if (wave.hazard === 'flash' || wave.hazard === 'storm') {
    world.pressure = Math.min(120, world.pressure + 15);
    playAlarm();
  }
}
function floodGrass(world) {
  // Storms and surges spill onto unprotected grass: a levee next door saves the cell.
  const rng = world.rng;
  const c = Math.floor(rng() * GRID.cols);
  const r = Math.floor(rng() * GRID.rows);
  const cell = world.grid[r][c];
  if (cell.kind !== 'grass' || cell.water > 0) return false;
  const guarded = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => {
    const n = cellAt(world, c + dc, r + dr);
    return n && (n.kind === 'levee' || n.kind === 'spillway');
  });
  if (guarded) { addFloater(world, c, r, 'HELD', '#7ef0d4'); return false; }
  cell.water = 0.8; world.floods += 1; world.fedStreak = 0; world.combo = 1;
  world.health -= 1; world.shake = 8; world.score = Math.max(0, world.score - 40);
  world.log.unshift('Flood spills onto a field! Valley health -1.');
  playBreak();
  return true;
}
function advanceFlow(world) {
  const wave = currentWave(world);
  const surge = (wave.hazard === 'flash' || wave.hazard === 'storm') ? 2 : 1;
  for (let step = 0; step < surge; step += 1) {
    const wet = [];
    for (let r = 0; r < GRID.rows; r += 1) for (let c = 0; c < GRID.cols; c += 1) {
      if (world.grid[r][c].water > 0.3 && !world.grid[r][c].blocked) wet.push([c, r]);
    }
    // Springs keep feeding the top row.
    for (const s of springCells(world)) {
      const cell = cellAt(world, s.col, s.row);
      if (cell && isWaterTile(cell) && !cell.blocked) cell.water = 1;
    }
    for (const [c, r] of wet) {
      const dirs = [[0, 1], [1, 0], [-1, 0], [0, -1]];
      for (const [dc, dr] of dirs) {
        const n = cellAt(world, c + dc, r + dr);
        if (n && isWaterTile(n) && !n.blocked && n.water < 0.5) {
          n.water = 1;
          world.particles.push({ x: GRID.x + (c + dc) * (GRID.cell + GRID.gap) + 32, y: GRID.y + (r + dr) * (GRID.cell + GRID.gap) + 32, life: 0.5, color: '#35d0c5' });
        }
      }
      // Water reaching the bottom row feeds that column's town.
      if (r === GRID.rows - 1) {
        const town = townForCol(c);
        const cell = world.grid[r][c];
        if (town && cell.water > 0.3 && !cell.fed) {
          cell.fed = true;
          world.townsFedWave += 1; world.townsFedTotal += 1; world.fedStreak += 1;
          world.combo = Math.min(5, 1 + Math.floor(world.fedStreak / 2));
          world.comboBest = Math.max(world.comboBest, world.combo);
          const gain = 100 + 25 * (world.combo - 1);
          world.score += gain; world.gold += 15;
          addFloater(world, c, r, `+${gain} ${town.name}`, '#ffd166');
          playCoin();
          if (wave.boss) damageBoss(world, 100, c);
        }
      }
    }
    world.flowSteps += 1;
  }
  if (wave.hazard === 'storm' && world.flowSteps % 3 === 0) floodGrass(world);
  if (wave.hazard === 'flash' && world.flowSteps === 4) floodGrass(world);
  if (world.pressure > 100) {
    world.pressure = 95; world.health -= 1; world.shake = 10;
    world.log.unshift('Pressure burst a levee! Health -1.');
    playBreak();
  }
}
function damageBoss(world, amount, col) {
  world.bossHp = Math.max(0, world.bossHp - amount);
  const phase = world.bossHp <= 100 ? 2 : world.bossHp <= 200 ? 1 : 0;
  if (phase !== world.bossPhase) {
    world.bossPhase = phase;
    world.log.unshift(`The Delugewyrm reels — ${BOSS.phases[phase]}.`);
    addFloater(world, col, GRID.rows - 1, `BOSS -${amount}`, '#ff6b6b');
  }
}
function endWave(world) {
  const wave = currentWave(world);
  for (let r = 0; r < GRID.rows; r += 1) for (let c = 0; c < GRID.cols; c += 1) {
    world.grid[r][c].water = 0; world.grid[r][c].fed = false;
  }
  world.gold += wave.gold;
  if (world.townsFedWave >= wave.target) {
    addScore(world, 50, 4, 2);
    world.log.unshift(`Flood ${wave.season} held — target met, +${wave.gold} droplets.`);
  } else {
    world.health -= 1;
    world.log.unshift(`Flood ${wave.season}: only ${world.townsFedWave}/${wave.target} towns fed. Health -1.`);
    playAlarm();
  }
  if (wave.boss && world.bossHp <= 0) { finishGame(world, true); return EVENT_OVER; }
  if (world.health <= 0) { finishGame(world, false); return EVENT_OVER; }
  if (world.waveIndex >= WAVES.length - 1) { finishGame(world, world.bossHp <= 0 && world.health > 0); return EVENT_OVER; }
  world.waveIndex += 1; world.phase = 'build';
  world.nextHazard = HAZARDS.find((h) => h.id === currentWave(world).hazard);
  return 0;
}
function finishGame(world, won) {
  world.screen = SCREEN_OVER; world.won = won; world.phase = 'done';
  if (won) { world.score += 500; }
  world.log.unshift(won ? 'The valleys hold. The Delugewyrm is turned back!' : 'The valleys drown. The warden falls.');
}
export function stepWorld(world, dt, input) {
  world.time += dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 20);
  for (const f of world.floaters) f.life -= dt;
  world.floaters = world.floaters.filter((f) => f.life > 0);
  for (const p of world.particles) p.life -= dt;
  world.particles = world.particles.filter((p) => p.life > 0);
  if (world.screen !== SCREEN_PLAY) return 0;
  if (input && input.startWave) startWave(world);
  if (world.phase !== 'flow') return 0;
  world.flowTimer += dt;
  let events = 0;
  while (world.flowTimer >= FLOW_TICK) {
    world.flowTimer -= FLOW_TICK;
    advanceFlow(world);
    if (world.flowSteps >= 14 || world.townsFedWave >= currentWave(world).target + 1) {
      events |= endWave(world);
      break;
    }
    if (world.health <= 0) { finishGame(world, false); events |= EVENT_OVER; break; }
  }
  return events;
}
export function beginGame(world) {
  resetWorld(world);
  world.screen = SCREEN_PLAY;
  world.log.unshift('Flood 1 approaches. Build, then press SPACE.');
}
export function townsFedLabel(world) { return `${world.townsFedTotal} fed`; }
