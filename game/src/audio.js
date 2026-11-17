// WebAudio synth sounds: no external files, everything is an oscillator.
// One clear job: make a blip, a splash, an alarm or a jingle on demand.
let audioCtx = null;
let muted = false;
export function toggleMute() { muted = !muted; return muted; }
export function isMuted() { return muted; }
function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function tone(freq, dur, type, vol, slideTo) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
  gain.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}
export function playPluck() { tone(520, 0.09, 'triangle', 0.10, 780); }
export function playSplash() { tone(300, 0.22, 'sine', 0.14, 120); tone(180, 0.3, 'sine', 0.08, 60); }
export function playCoin() { tone(880, 0.08, 'square', 0.06); setTimeout(() => tone(1320, 0.12, 'square', 0.06), 70); }
export function playAlarm() { tone(220, 0.25, 'sawtooth', 0.10, 440); }
export function playBreak() { tone(140, 0.3, 'sawtooth', 0.12, 50); }
export function playBossRoar() { tone(90, 0.7, 'sawtooth', 0.16, 45); tone(60, 0.9, 'sine', 0.14, 30); }
export function playWinJingle() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.12), i * 130)); }
export function playLoseDrone() { tone(220, 0.9, 'sine', 0.12, 110); }
