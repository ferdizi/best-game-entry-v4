// FLOODWARDEN screenshot scenes behind ?shot=start|play|boss|end.
// Each stages a real world (no fake pixels): the play scene builds a dense
// mid-flood board and runs the flow forward; boss stages flood 7; end stages
// a finished win. Same seed, same frame, every time.
import { BUILDS } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, beginGame, placeBuild, selectBuild, startWave, stepWorld } from './world.js';
import { STEP } from './config.js';

function buildMidBoard(world) {
  const placements = [
    ['canal', 1, 2], ['canal', 1, 3], ['canal', 1, 4], ['canal', 1, 5],
    ['canal', 4, 1], ['canal', 4, 4], ['canal', 4, 5],
    ['canal', 7, 2], ['canal', 7, 3], ['canal', 7, 4], ['canal', 7, 5],
    ['canal', 2, 4], ['canal', 3, 4], ['canal', 5, 4], ['canal', 6, 4],
    ['pump', 4, 1], ['tower', 2, 3], ['sluice', 6, 4], ['levee', 0, 4], ['levee', 8, 2], ['spillway', 3, 5],
  ];
  world.gold = 999;
  for (const [id, c, r] of placements) {
    selectBuild(world, id);
    const cell = world.grid[r][c];
    if (cell.kind === 'grass') placeBuild(world, c, r);
    else if (cell.kind === 'canal' && id !== 'canal') { cell.kind = id; }
  }
  world.gold = 85;
}
function runFlow(world, seconds) {
  startWave(world);
  for (let i = 0; i < seconds / STEP; i += 1) stepWorld(world, STEP, {});
}
export function stageShot(name, world) {
  beginGame(world);
  if (name !== 'play' && name !== 'boss' && name !== 'end') {
    world.screen = SCREEN_TITLE;
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    buildMidBoard(world);
    world.waveIndex = 6;
    world.score = 2480; world.townsFedTotal = 14; world.comboBest = 4; world.bossHp = 0; world.floods = 1;
    world.screen = SCREEN_OVER; world.won = true; world.phase = 'done';
    return { screen: SCREEN_OVER, best: world.score };
  }
  buildMidBoard(world);
  if (name === 'boss') {
    world.waveIndex = 6;
    world.score = 1960; world.townsFedTotal = 11; world.combo = 3; world.bossHp = 120; world.bossPhase = 1;
    runFlow(world, 2.2);
    // The flow above really feeds towns and hurts the boss; pin the frame
    // back to the staged values so the shot reads at a glance.
    world.score = 1960; world.townsFedTotal = 11; world.combo = 3;
    world.bossHp = 120; world.bossPhase = 1; world.health = 3; world.pressure = 50;
    world.log = ['The Delugewyrm rises. Feed towns to wound it.', 'Flood 7: FLASH FLOOD — surge x2 flow.'];
    return { screen: SCREEN_PLAY, best: world.score };
  }
  world.waveIndex = 3;
  world.score = 1240; world.townsFedTotal = 5; world.combo = 3; world.pressure = 62;
  runFlow(world, 3.4);
  world.score = 1240; world.townsFedTotal = 5; world.combo = 3; world.pressure = 62; world.health = 3;
  return { screen: SCREEN_PLAY, best: world.score };
}
export { BUILDS };
