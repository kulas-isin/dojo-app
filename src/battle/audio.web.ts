// 對戰音效 / 背景音樂 — Web Audio 合成（網頁版）。原生版見 audio.native.ts。
let A: AudioContext | null = null;
let master: GainNode | null = null;
let bgmTimer: any = null;
let bstep = 0;
let muted = false;

function AC(): AudioContext | null {
  if (!A) {
    try {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      A = new Ctor();
      master = A!.createGain();
      master.gain.value = 0.6;
      master.connect(A!.destination);
    } catch {
      return null;
    }
  }
  if (A && A.state === 'suspended') A.resume();
  return A;
}
function out(): AudioNode | null {
  const a = AC();
  return master || (a ? a.destination : null);
}
function osc(freq: number, dur: number, type: OscillatorType, g: number, sweep?: number, det?: number) {
  const a = AC();
  if (!a || muted || !freq) return;
  const gn = a.createGain();
  gn.gain.setValueAtTime(0.0001, a.currentTime);
  gn.gain.exponentialRampToValueAtTime(g, a.currentTime + 0.012);
  gn.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  gn.connect(out()!);
  const dets = det ? [-det, det] : [0];
  dets.forEach((dt) => {
    const o = a.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (dt) o.detune.value = dt;
    if (sweep) o.frequency.exponentialRampToValueAtTime(sweep, a.currentTime + dur);
    o.connect(gn);
    o.start();
    o.stop(a.currentTime + dur + 0.03);
  });
}
function noise(dur: number, g: number, freq: number, ftype: BiquadFilterType = 'lowpass') {
  const a = AC();
  if (!a || muted) return;
  const s = a.createBufferSource();
  const b = a.createBuffer(1, Math.max(1, a.sampleRate * dur), a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  s.buffer = b;
  const f = a.createBiquadFilter();
  f.type = ftype;
  f.frequency.value = freq;
  const gn = a.createGain();
  gn.gain.setValueAtTime(g, a.currentTime);
  gn.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  s.connect(f);
  f.connect(gn);
  gn.connect(out()!);
  s.start();
  s.stop(a.currentTime + dur + 0.03);
}
function kick(g = 0.5) { osc(150, 0.16, 'sine', g, 45); noise(0.05, g * 0.7, 220); }
function hat(g = 0.1) { noise(0.028, g, 8000, 'highpass'); }
function snare(g = 0.28) { noise(0.13, g, 3200); osc(220, 0.08, 'triangle', g * 0.36); }

export function unlock() { AC(); }
export function setMuted(m: boolean) { muted = m; if (m) stopBgm(); }

export function moveSfx(fx: string, tier = 1) {
  if (fx === 'fire') { noise(0.42, 0.26, 1400); osc(280, 0.34, 'sawtooth', 0.1, 90, 10); osc(90, 0.4, 'sine', 0.2, 45); }
  else if (fx === 'leaf') { [880, 1174, 1568].forEach((f, i) => setTimeout(() => osc(f, 0.14, 'triangle', 0.09, undefined, 6), i * 45)); }
  else if (fx === 'bolt') { osc(1850, 0.06, 'square', 0.14, 300); noise(0.16, 0.18, 5200, 'highpass'); setTimeout(() => osc(1400, 0.05, 'square', 0.1, 500), 60); }
  else if (fx === 'water') { [700, 900, 600, 1050].forEach((f, i) => setTimeout(() => osc(f, 0.1, 'sine', 0.11, f * 2), i * 38)); }
  else if (fx === 'rock') { osc(70, 0.42, 'sine', 0.3, 38); noise(0.36, 0.32, 650); setTimeout(() => osc(55, 0.3, 'sine', 0.22, 34), 80); }
  if (tier === 3) { setTimeout(() => moveSfx(fx, 1), 150); setTimeout(() => moveSfx(fx, 1), 310); }
}
export function chargeSfx() { osc(180, 0.5, 'sawtooth', 0.11, 820, 4); noise(0.5, 0.05, 3000, 'highpass'); }
export function hitSfx() { noise(0.09, 0.2, 1700); osc(120, 0.06, 'sine', 0.14, 60); }
export function superSfx() { [660, 830, 990].forEach((f, i) => setTimeout(() => osc(f, 0.18, 'square', 0.1, undefined, 6), i * 30)); }

const LEAD = [440, 523, 659, 523, 587, 523, 440, 392, 349, 392, 440, 523, 659, 587, 523, 0];
const BASS = [110, 0, 110, 110, 98, 0, 98, 98, 87, 0, 87, 87, 98, 0, 110, 0];
function bgmStep() {
  if (!muted) {
    const s = bstep % 16;
    // 背景音樂調小聲，避免蓋過音效
    if (LEAD[s]) osc(LEAD[s], 0.14, 'square', 0.026, undefined, 7);
    if (BASS[s]) osc(BASS[s], 0.17, 'triangle', 0.04);
    if (s % 4 === 0) kick(0.22);
    if (s % 2 === 1) hat(0.045);
    if (s === 4 || s === 12) snare(0.12);
  }
  bstep++;
}
export function startBgm() { stopBgm(); bstep = 0; bgmTimer = setInterval(bgmStep, 150); }
export function stopBgm() { if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; } }
export function startSting() { const a = AC(); if (!a) return; [392, 523, 659, 784, 659].forEach((f, i) => setTimeout(() => { osc(f, 0.15, 'square', 0.11, undefined, 6); if (i === 4) kick(); }, i * 85)); setTimeout(startBgm, 500); }
export function winJingle() { stopBgm(); [523, 659, 784, 1046, 988, 1046].forEach((f, i) => setTimeout(() => { osc(f, 0.26, 'triangle', 0.14, undefined, 6); osc(f / 2, 0.26, 'square', 0.05); if (i === 3) kick(); }, i * 140)); }
export function loseJingle() { stopBgm(); ([[440, 349], [392, 330], [294, 247]] as const).forEach((pr, i) => setTimeout(() => { osc(pr[0], 0.42, 'sawtooth', 0.11, pr[0] * 0.85); osc(pr[1], 0.42, 'triangle', 0.06); }, i * 220)); }
