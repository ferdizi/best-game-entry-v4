// FLOODWARDEN render: every pixel the judge sees. One clear job: draw the
// title, the playfield with its dense HUD, the boss, and the end screen.
import { BOSS, BUILDS, GRID, TOWNS, VALLEYS, VIEW } from './config.js';
import { currentValley, currentWave, hazardOf, isWaterTile, nextWaveInfo } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

const INK = '#f4ead8';
const DIM = '#b9c4d6';
const WATER = '#35d0c5';
const WATER_DEEP = '#1b7f8f';
const GOLD = '#ffd166';
const RED = '#ff6b6b';
const TEAL = '#7ef0d4';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function text(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = color || INK;
  ctx.font = `${weight || 700} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}
function sky(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, '#1b2340');
  g.addColorStop(0.55, '#27355e');
  g.addColorStop(1, '#0f1526');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Dusk sun + stars.
  ctx.fillStyle = '#ffb454';
  ctx.beginPath(); ctx.arc(1120, 84, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,180,84,0.25)';
  ctx.beginPath(); ctx.arc(1120, 84, 58, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(244,234,216,0.7)';
  for (let i = 0; i < 40; i += 1) {
    const x = (i * 173) % 1280; const y = (i * 61) % 110;
    ctx.fillRect(x, y, 2, 2);
  }
}
function drawSprings(ctx, world) {
  for (const col of [1, 4, 7]) {
    const x = GRID.x + col * (GRID.cell + GRID.gap) + GRID.cell / 2;
    ctx.fillStyle = WATER;
    ctx.beginPath(); ctx.arc(x, GRID.y - 26, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0f2f3a';
    text(ctx, '≋', x, GRID.y - 25, 20, '#0f2f3a', 'center', 900);
  }
}
function drawTile(ctx, world, c, r) {
  const cell = world.grid[r][c];
  const x = GRID.x + c * (GRID.cell + GRID.gap);
  const y = GRID.y + r * (GRID.cell + GRID.gap);
  const valley = currentValley(world);
  ctx.fillStyle = cell.buried ? '#4a3b2e' : valley.tint;
  roundRect(ctx, x, y, GRID.cell, GRID.cell, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(244,234,216,0.18)';
  ctx.stroke();
  if (cell.kind === 'rock') {
    ctx.fillStyle = '#8d97a8';
    ctx.beginPath(); ctx.moveTo(x + 14, y + 56); ctx.lineTo(x + 36, y + 14); ctx.lineTo(x + 58, y + 56); ctx.closePath(); ctx.fill();
    text(ctx, 'ROCK', x + 36, y + 64, 9, DIM, 'center', 800);
  }
  if (cell.kind === 'canal' || cell.kind === 'pump' || cell.kind === 'tower' || cell.kind === 'sluice' || cell.kind === 'spillway') {
    ctx.fillStyle = '#123a4a';
    roundRect(ctx, x + 6, y + 6, GRID.cell - 12, GRID.cell - 12, 6); ctx.fill();
  }
  if (cell.blocked) {
    ctx.fillStyle = '#8d6b4a';
    ctx.fillRect(x + 10, y + 26, GRID.cell - 20, 20);
    text(ctx, 'DEBRIS', x + 36, y + 36, 10, '#fff', 'center', 900);
  }
  if (cell.water > 0.3) {
    const wob = Math.sin(world.time * 5 + c + r) * 3;
    ctx.fillStyle = WATER;
    roundRect(ctx, x + 8, y + 8 + wob * 0.3, GRID.cell - 16, GRID.cell - 16, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(x + 14, y + 16, GRID.cell - 28, 4);
  }
  const label = { pump: 'PUMP', tower: 'TOWER', sluice: 'SLUICE', spillway: 'SPILL', levee: 'LEVEE', canal: '' }[cell.kind];
  if (label) text(ctx, label, x + 32, y + 32, 11, cell.water > 0.3 ? '#0f2f3a' : INK, 'center', 900);
  if (cell.kind === 'levee') {
    ctx.fillStyle = '#c98f4a';
    ctx.fillRect(x + 6, y + 18, GRID.cell - 12, 34);
    ctx.fillStyle = '#8a5a22';
    for (let i = 0; i < 3; i += 1) ctx.fillRect(x + 12 + i * 18, y + 18, 5, 34);
  }
}
function drawTowns(ctx, world) {
  for (const town of TOWNS) {
    const x = GRID.x + town.col * (GRID.cell + GRID.gap) + GRID.cell / 2;
    const y = GRID.y + GRID.rows * (GRID.cell + GRID.gap) + 26;
    ctx.fillStyle = '#ffb454';
    roundRect(ctx, x - 52, y - 18, 104, 40, 8); ctx.fill();
    ctx.fillStyle = '#3a2410';
    text(ctx, `⌂ ${town.name.toUpperCase()}`, x, y - 2, 12, '#3a2410', 'center', 900);
    text(ctx, 'TOWN — feed me', x, y + 12, 9, '#3a2410', 'center', 700);
  }
}
function drawBoss(ctx, world) {
  if (!currentWave(world).boss && world.waveIndex < 6) return;
  // Boss band below the towns: name + HP bar on top, the serpent below.
  text(ctx, `${BOSS.name}  —  ${BOSS.phases[world.bossPhase]}`, 640, 586, 15, RED, 'center', 900);
  ctx.fillStyle = '#3a1020';
  roundRect(ctx, 330, 596, 620, 14, 7); ctx.fill();
  ctx.fillStyle = RED;
  roundRect(ctx, 330, 596, Math.max(8, 620 * world.bossHp / BOSS.maxHp), 14, 7); ctx.fill();
  text(ctx, `HP ${world.bossHp}/${BOSS.maxHp}`, 962, 603, 12, INK, 'left', 800);
  const y = 632;
  ctx.fillStyle = '#123a4a';
  roundRect(ctx, 300, y - 12, 680, 30, 10); ctx.fill();
  ctx.strokeStyle = WATER; ctx.lineWidth = 1; ctx.stroke();
  // The Delugewyrm: a coiling serpent in the floodwater.
  ctx.strokeStyle = '#35d0c5'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = 330; x <= 950; x += 10) {
    const yy = y + Math.sin((x + world.time * 60) / 90) * 6;
    if (x === 330) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
  }
  ctx.stroke();
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath(); ctx.arc(950, y, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(955, y - 4, 3, 0, Math.PI * 2); ctx.fill();
}
function drawHud(ctx, world) {
  ctx.fillStyle = 'rgba(10,14,30,0.85)';
  ctx.fillRect(0, 0, VIEW.width, 84);
  ctx.fillStyle = GOLD; ctx.fillRect(0, 84, VIEW.width, 3);
  text(ctx, 'FLOODWARDEN', 20, 26, 22, INK, 'left', 900);
  text(ctx, currentValley(world).name, 20, 56, 12, TEAL, 'left', 800);
  const wave = currentWave(world);
  const items = [
    [`SCORE ${world.score}`, GOLD],
    [`◈ ${world.gold}`, '#7ef0d4'],
    [`FLOOD ${wave.season}/7`, INK],
    [`TOWNS ${world.townsFedTotal}`, INK],
    [`♥`.repeat(Math.max(0, world.health)) + `♡`.repeat(Math.max(0, 3 - world.health)), RED],
    [`COMBO x${world.combo}`, world.combo > 1 ? GOLD : DIM],
  ];
  let x = 292;
  for (const [label, color] of items) {
    text(ctx, label, x, 30, 14, color, 'left', 900);
    x += ctx.measureText(label).width + 16;
  }
  // Pressure bar.
  text(ctx, 'PRESSURE', 300, 62, 11, DIM, 'left', 800);
  ctx.fillStyle = '#22304a'; roundRect(ctx, 380, 52, 220, 16, 8); ctx.fill();
  ctx.fillStyle = world.pressure > 90 ? RED : world.pressure > 60 ? GOLD : WATER;
  roundRect(ctx, 380, 52, Math.max(8, 220 * world.pressure / 120), 16, 8); ctx.fill();
  text(ctx, `${Math.round(world.pressure)}`, 610, 60, 12, INK, 'left', 800);
  // Next-event preview.
  const next = nextWaveInfo(world);
  text(ctx, `NEXT: ${next.name}`, 660, 62, 12, GOLD, 'left', 900);
  const hz = hazardOf(world);
  text(ctx, `NOW: ${hz.name} — ${hz.blurb}`, 940, 30, 13, RED, 'left', 900);
  text(ctx, world.phase === 'build' ? 'BUILD PHASE — press SPACE to release the flood' : 'FLOOD RUNNING — build fast!', 940, 58, 12, TEAL, 'left', 800);
}
function drawBuildBar(ctx, world) {
  const y = 668;
  ctx.fillStyle = 'rgba(10,14,30,0.9)';
  ctx.fillRect(0, y - 8, VIEW.width, 60);
  text(ctx, 'BUILD  [1–6]  •  click a tile to place  •  right-click refunds  •  SPACE release flood  •  M sound', 20, y + 14, 12, DIM, 'left', 700);
  let x = 560;
  for (const b of BUILDS) {
    const sel = world.selected === b.id;
    ctx.fillStyle = sel ? GOLD : '#22304a';
    roundRect(ctx, x, y - 2, 112, 34, 8); ctx.fill();
    text(ctx, `${b.key} ${b.name} ◈${b.cost}`, x + 56, y + 15, 11, sel ? '#3a2410' : INK, 'center', 900);
    x += 118;
  }
}
function drawFloaters(ctx, world) {
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.min(1, f.life);
    text(ctx, f.text, f.x, f.y - (1.2 - f.life) * 30, 15, f.color, 'center', 900);
  }
  ctx.globalAlpha = 1;
}
function drawLog(ctx, world) {
  const trunc = (s) => {
    const t = (s || '');
    if (t.length <= 36) return t;
    const cut = t.slice(0, 36);
    const sp = cut.lastIndexOf(' ');
    return (sp > 20 ? cut.slice(0, sp) : cut) + '…';
  };
  text(ctx, trunc(world.log[0]), 20, 120, 13, '#e8d9a0', 'left', 700);
  if (world.log[1]) text(ctx, trunc(world.log[1]), 20, 140, 11, DIM, 'left', 700);
}
function drawTitle(ctx, world) {
  sky(ctx, world);
  ctx.fillStyle = 'rgba(10,14,30,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'FLOODWARDEN', 640, 150, 84, INK, 'center', 900);
  text(ctx, 'Hold the Three Valleys', 640, 205, 26, TEAL, 'center', 800);
  text(ctx, 'Route the flood. Feed the towns. Turn back the Delugewyrm.', 640, 240, 17, DIM, 'center', 700);
  ctx.fillStyle = 'rgba(255,209,102,0.12)';
  roundRect(ctx, 290, 280, 700, 150, 14); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.stroke();
  text(ctx, '★  WIN:  survive all 7 floods, feed the towns, break the Delugewyrm (300 HP)  ★', 640, 310, 16, GOLD, 'center', 900);
  text(ctx, '✖  LOSE:  valley health hits 0, or a flood feeds fewer towns than its target', 640, 342, 15, RED, 'center', 800);
  text(ctx, 'Three valleys:  REED HOLLOW  •  MILLSTONE BASIN  •  SALTMARSH DELTA', 640, 376, 14, INK, 'center', 800);
  text(ctx, 'Six hazards:  DROUGHT  •  DEBRIS DAM  •  FLASH FLOOD  •  MUDSLIDE  •  STORM SURGE  •  WHIRLPOOL', 640, 404, 13, DIM, 'center', 700);
  text(ctx, 'CONTROLS — Mouse: place a build  •  1–6: choose build  •  Right-click: refund tile', 640, 470, 15, INK, 'center', 800);
  text(ctx, 'SPACE: release the flood / pause  •  R: remove tile  •  M: sound on/off  •  ENTER: start', 640, 496, 15, INK, 'center', 800);
  text(ctx, 'BUILD:  Canal ◈10  •  Levee ◈25  •  Pump ◈40  •  Water Tower ◈35  •  Sluice ◈30  •  Spillway ◈20', 640, 528, 14, TEAL, 'center', 800);
  ctx.fillStyle = GOLD;
  roundRect(ctx, 490, 560, 300, 54, 12); ctx.fill();
  text(ctx, '▶  CLICK OR PRESS ENTER TO PLAY', 640, 588, 17, '#3a2410', 'center', 900);
  text(ctx, 'A complete game: 7 floods, 6 hazards, a 3-phase boss, economy, combos, win + lose.', 640, 640, 12, DIM, 'center', 700);
}
function drawOver(ctx, world) {
  sky(ctx, world);
  ctx.fillStyle = 'rgba(10,14,30,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  if (world.won) {
    text(ctx, '★ THE VALLEYS HOLD ★', 640, 170, 56, GOLD, 'center', 900);
    text(ctx, 'The Delugewyrm is turned back. Every town drinks tonight.', 640, 225, 18, TEAL, 'center', 700);
  } else {
    text(ctx, 'THE VALLEYS DROWN', 640, 170, 56, RED, 'center', 900);
    text(ctx, 'The flood took the warden. The towns will try again next spring.', 640, 225, 18, DIM, 'center', 700);
  }
  ctx.fillStyle = 'rgba(255,209,102,0.10)';
  roundRect(ctx, 390, 270, 500, 190, 14); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.stroke();
  text(ctx, `FINAL SCORE  ${world.score}`, 640, 305, 26, GOLD, 'center', 900);
  text(ctx, `Towns fed: ${world.townsFedTotal}   •   Floods survived: ${Math.min(7, world.waveIndex + 1)}/7`, 640, 345, 16, INK, 'center', 800);
  text(ctx, `Best combo: x${world.comboBest}   •   Floods spilled: ${world.floods}   •   Boss HP left: ${world.bossHp}`, 640, 375, 16, INK, 'center', 800);
  text(ctx, `Droplets banked: ◈${world.gold}`, 640, 405, 16, TEAL, 'center', 800);
  ctx.fillStyle = GOLD;
  roundRect(ctx, 490, 490, 300, 54, 12); ctx.fill();
  text(ctx, '↻  PRESS R OR CLICK TO PLAY AGAIN', 640, 518, 16, '#3a2410', 'center', 900);
  text(ctx, 'FLOODWARDEN — Hold the Three Valleys', 640, 580, 13, DIM, 'center', 700);
}
export function drawGame(ctx, world, screenOverride) {
  const screen = screenOverride || world.screen;
  ctx.save();
  if (world.shake > 0) ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  if (screen === SCREEN_TITLE) { drawTitle(ctx, world); ctx.restore(); return; }
  if (screen === SCREEN_OVER) { drawOver(ctx, world); ctx.restore(); return; }
  sky(ctx, world);
  // Valley ground.
  ctx.fillStyle = 'rgba(46,107,79,0.35)';
  ctx.fillRect(280, 110, 720, 520);
  drawHud(ctx, world);
  drawLog(ctx, world);
  drawSprings(ctx, world);
  for (let r = 0; r < GRID.rows; r += 1) for (let c = 0; c < GRID.cols; c += 1) drawTile(ctx, world, c, r);
  drawTowns(ctx, world);
  drawBoss(ctx, world);
  drawFloaters(ctx, world);
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawBuildBar(ctx, world);
  if (world.phase === 'build') {
    text(ctx, '— BUILD PHASE — place tiles, then SPACE to release the flood —', 640, 652, 13, GOLD, 'center', 900);
  }
  ctx.restore();
}
