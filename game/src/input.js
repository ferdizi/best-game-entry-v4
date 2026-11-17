// FLOODWARDEN input: mouse placement, build hotkeys, wave control.
// One clear job: turn keyboard + mouse events into game intents.
import { BUILDS, GRID } from './config.js';
import { placeBuild, removeTile, selectBuild } from './world.js';
import { toggleMute } from './audio.js';

export function gridFromPoint(x, y, rect, scale) {
  const px = (x - rect.left) / scale;
  const py = (y - rect.top) / scale;
  const col = Math.floor((px - GRID.x) / (GRID.cell + GRID.gap));
  const row = Math.floor((py - GRID.y) / (GRID.cell + GRID.gap));
  if (col < 0 || col >= GRID.cols || row < 0 || row >= GRID.rows) return null;
  return { col, row };
}
export function attachInput(canvas, world, hooks) {
  const rect = () => canvas.getBoundingClientRect();
  const scale = () => rect().width / 1280;
  canvas.addEventListener('click', (e) => {
    if (world.screen === 'title') { hooks.start(); return; }
    if (world.screen === 'over') { hooks.restart(); return; }
    const cell = gridFromPoint(e.clientX, e.clientY, rect(), scale());
    if (cell) placeBuild(world, cell.col, cell.row);
  });
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const cell = gridFromPoint(e.clientX, e.clientY, rect(), scale());
    if (cell && world.screen === 'play') removeTile(world, cell.col, cell.row);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (world.screen === 'title') hooks.start();
      else if (world.screen === 'over') hooks.restart();
      else hooks.release();
      return;
    }
    if (e.key === ' ') { e.preventDefault(); hooks.release(); return; }
    if (e.key === 'm' || e.key === 'M') { world.muted = toggleMute(); return; }
    if ((e.key === 'r' || e.key === 'R') && world.screen === 'over') { hooks.restart(); return; }
    const build = BUILDS.find((b) => b.key === e.key);
    if (build) selectBuild(world, build.id);
  });
}
