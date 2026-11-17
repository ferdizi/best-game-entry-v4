// FLOODWARDEN entry point: canvas loop, shot staging, and game wiring.
// One clear job: own the frame loop and hand input + world + render to each other.
import { VIEW, STEP } from './config.js';
import { createWorld, beginGame, resetWorld, startWave, stepWorld } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';
import { drawGame } from './render.js';
import { attachInput } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 1);
const world = createWorld(seed);
let shotScreen = null;
let last = performance.now();
let acc = 0;

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = VIEW.width * dpr;
  canvas.height = VIEW.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
}
function announce() {
  if (!status) return;
  const wave = world.waveIndex + 1;
  status.textContent = world.screen === SCREEN_TITLE
    ? 'FLOODWARDEN title screen. Press Enter to play.'
    : world.screen === SCREEN_OVER
      ? `Game over. ${world.won ? 'You won.' : 'You lost.'} Score ${world.score}. Press R to play again.`
      : `Flood ${wave} of 7. Score ${world.score}. Gold ${world.gold}. Towns fed ${world.townsFedTotal}. Health ${world.health}.`;
}
attachInput(canvas, world, {
  start: () => { beginGame(world); announce(); },
  restart: () => { beginGame(world); announce(); },
  release: () => {
    if (world.screen === SCREEN_PLAY) {
      if (world.phase === 'build') startWave(world);
      announce();
    }
  },
});
window.addEventListener('resize', fitCanvas);
fitCanvas();
if (params.get('shot')) {
  const staged = stageShot(params.get('shot'), world);
  shotScreen = staged.screen;
  announce();
}
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!shotScreen) {
    acc += dt;
    while (acc >= STEP) {
      stepWorld(world, STEP, {});
      acc -= STEP;
      if (world.screen === SCREEN_OVER) { announce(); break; }
    }
  }
  drawGame(ctx, world, shotScreen);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.FLOODWARDEN = world;
export { world };
