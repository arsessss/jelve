// Lightweight synthesized sound effects via Web Audio API.
// No network, no assets — works offline and keeps bundle tiny.

let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try { ctx = new Ctor(); } catch { return null; }
  }
  if (ctx?.state === 'suspended') ctx.resume().catch(() => { /* noop */ });
  return ctx;
}

export function setClassSoundsEnabled(v: boolean) {
  enabled = v;
  try { localStorage.setItem('class-sounds', v ? '1' : '0'); } catch { /* noop */ }
}
export function getClassSoundsEnabled(): boolean {
  try { return localStorage.getItem('class-sounds') !== '0'; } catch { return true; }
}

function tone(freq: number, durMs: number, type: OscillatorType = 'sine', gain = 0.08, delay = 0) {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}

function sweep(from: number, to: number, durMs: number, type: OscillatorType = 'sine', gain = 0.08) {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(to, t0 + durMs / 1000);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}

export const classSounds = {
  join: () => { tone(523, 90, 'sine', 0.07); tone(784, 140, 'sine', 0.07, 0.08); },
  leave: () => { tone(523, 90, 'sine', 0.07); tone(392, 150, 'sine', 0.07, 0.08); },
  chat: () => { tone(880, 60, 'triangle', 0.05); },
  hand: () => { sweep(440, 880, 200, 'sine', 0.07); },
  pollStart: () => { tone(523, 80, 'square', 0.05); tone(659, 80, 'square', 0.05, 0.09); tone(784, 120, 'square', 0.05, 0.18); },
  pollEnd: () => { tone(784, 90, 'sine', 0.06); tone(988, 200, 'sine', 0.07, 0.09); },
  kick: () => { sweep(660, 110, 280, 'sawtooth', 0.08); },
  success: () => { tone(659, 70, 'sine', 0.06); tone(880, 120, 'sine', 0.07, 0.07); },
  warn: () => { tone(330, 110, 'square', 0.05); tone(247, 150, 'square', 0.05, 0.12); },
  click: () => { tone(1200, 30, 'square', 0.03); },
};

// Initialize enabled state from storage at module load
enabled = getClassSoundsEnabled();