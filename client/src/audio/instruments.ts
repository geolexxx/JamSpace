import * as Tone from "tone";

// ── Raw AudioContext for drum synthesis ────────────────────────────────────────
function ctx() { return Tone.getContext().rawContext as AudioContext; }

function makeNoiseBuffer(duration: number): AudioBuffer {
  const c = ctx();
  const size = Math.floor(c.sampleRate * duration);
  const buf = c.createBuffer(1, size, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// ── Drum synthesis ────────────────────────────────────────────────────────────

export function playKick(time: number, vel: number) {
  const c = ctx(); const v = vel / 127;
  const body = c.createOscillator(); const bodyGain = c.createGain();
  body.connect(bodyGain); bodyGain.connect(c.destination);
  body.type = "sine"; body.frequency.setValueAtTime(180, time);
  body.frequency.exponentialRampToValueAtTime(40, time + 0.07);
  bodyGain.gain.setValueAtTime(v * 2.2, time);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
  body.start(time); body.stop(time + 0.5);
  const click = c.createOscillator(); const clickGain = c.createGain();
  click.connect(clickGain); clickGain.connect(c.destination);
  click.type = "square"; click.frequency.setValueAtTime(600, time);
  click.frequency.exponentialRampToValueAtTime(100, time + 0.018);
  clickGain.gain.setValueAtTime(v * 0.7, time);
  clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.018);
  click.start(time); click.stop(time + 0.018);
}

export function playSnare(time: number, vel: number) {
  const c = ctx(); const v = vel / 127;
  const noise = c.createBufferSource(); noise.buffer = makeNoiseBuffer(0.18);
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1500; hp.Q.value = 0.7;
  const noiseGain = c.createGain();
  noise.connect(hp); hp.connect(noiseGain); noiseGain.connect(c.destination);
  noiseGain.gain.setValueAtTime(v * 1.8, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
  noise.start(time);
  const body = c.createOscillator(); const bodyGain = c.createGain();
  body.connect(bodyGain); bodyGain.connect(c.destination);
  body.type = "triangle"; body.frequency.setValueAtTime(230, time);
  body.frequency.exponentialRampToValueAtTime(130, time + 0.05);
  bodyGain.gain.setValueAtTime(v * 0.9, time);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  body.start(time); body.stop(time + 0.05);
}

export function playHihat(time: number, vel: number, open: boolean) {
  const c = ctx(); const v = vel / 127; const decay = open ? 0.32 : 0.045;
  [285, 376, 491, 540, 814, 1018].forEach(f => {
    const osc = c.createOscillator(); const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = "square"; osc.frequency.value = f;
    gain.gain.setValueAtTime(v * 0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
    osc.start(time); osc.stop(time + decay + 0.01);
  });
  const noise = c.createBufferSource(); noise.buffer = makeNoiseBuffer(decay + 0.01);
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 8000;
  const ng = c.createGain();
  noise.connect(hp); hp.connect(ng); ng.connect(c.destination);
  ng.gain.setValueAtTime(v * 0.15, time);
  ng.gain.exponentialRampToValueAtTime(0.001, time + decay);
  noise.start(time);
}

export function playClap(time: number, vel: number) {
  const c = ctx(); const v = vel / 127;
  [0, 0.006, 0.012, 0.022].forEach((delay, i) => {
    const n = c.createBufferSource(); n.buffer = makeNoiseBuffer(0.12);
    const bp1 = c.createBiquadFilter(); bp1.type = "bandpass"; bp1.frequency.value = 1100; bp1.Q.value = 0.6;
    const bp2 = c.createBiquadFilter(); bp2.type = "highpass"; bp2.frequency.value = 800;
    const g = c.createGain();
    n.connect(bp1); bp1.connect(bp2); bp2.connect(g); g.connect(c.destination);
    const t = time + delay; const isLast = i === 3;
    g.gain.setValueAtTime(v * (isLast ? 1.0 : 0.5), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (isLast ? 0.1 : 0.015));
    n.start(t);
  });
}

export function playRim(time: number, vel: number) {
  const c = ctx(); const v = vel / 127;
  const osc = c.createOscillator(); const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.type = "square"; osc.frequency.value = 1700;
  gain.gain.setValueAtTime(v * 0.45, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
  osc.start(time); osc.stop(time + 0.02);
}

export function playTom(time: number, vel: number) {
  const c = ctx(); const v = vel / 127;
  const osc = c.createOscillator(); const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination); osc.type = "sine";
  osc.frequency.setValueAtTime(110, time); osc.frequency.exponentialRampToValueAtTime(55, time + 0.18);
  gain.gain.setValueAtTime(v * 1.5, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
  osc.start(time); osc.stop(time + 0.35);
}

export function playCrash(time: number, vel: number) {
  const c = ctx(); const v = vel / 127;
  [220, 285, 376, 540, 814, 1018].forEach(f => {
    const osc = c.createOscillator(); const g = c.createGain();
    osc.connect(g); g.connect(c.destination); osc.type = "sawtooth"; osc.frequency.value = f;
    g.gain.setValueAtTime(v * 0.04, time); g.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
    osc.start(time); osc.stop(time + 1.5);
  });
  const noise = c.createBufferSource(); noise.buffer = makeNoiseBuffer(1.6);
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 4000;
  const ng = c.createGain();
  noise.connect(hp); hp.connect(ng); ng.connect(c.destination);
  ng.gain.setValueAtTime(v * 0.3, time); ng.gain.exponentialRampToValueAtTime(0.001, time + 1.4);
  noise.start(time);
}

// ── Bass synthesis (Web Audio API — no CDN needed, always works) ──────────────
export function playBass(pitch: number, vel: number, time: number) {
  const c = ctx(); const v = vel / 127;
  const freq = Tone.Frequency(pitch, "midi").toFrequency();

  // Sub sine — the low body
  const sub = c.createOscillator(); const subGain = c.createGain();
  sub.type = "sine"; sub.frequency.value = freq;
  sub.connect(subGain); subGain.connect(c.destination);
  subGain.gain.setValueAtTime(v * 1.4, time);
  subGain.gain.exponentialRampToValueAtTime(v * 0.6, time + 0.06);
  subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.75);
  sub.start(time); sub.stop(time + 0.76);

  // Sawtooth through lowpass — string/pick character
  const saw = c.createOscillator(); saw.type = "sawtooth"; saw.frequency.value = freq;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(freq * 8, time);
  lp.frequency.exponentialRampToValueAtTime(freq * 2, time + 0.12);
  lp.Q.value = 4;
  const sawGain = c.createGain();
  saw.connect(lp); lp.connect(sawGain); sawGain.connect(c.destination);
  sawGain.gain.setValueAtTime(v * 0.5, time);
  sawGain.gain.exponentialRampToValueAtTime(v * 0.25, time + 0.08);
  sawGain.gain.exponentialRampToValueAtTime(0.001, time + 0.65);
  saw.start(time); saw.stop(time + 0.66);

  // Click transient for pluck attack
  const click = c.createOscillator(); click.type = "square"; click.frequency.value = freq * 3;
  const cg = c.createGain();
  click.connect(cg); cg.connect(c.destination);
  cg.gain.setValueAtTime(v * 0.3, time);
  cg.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
  click.start(time); click.stop(time + 0.026);
}

// ── Sample-based melodic instruments ─────────────────────────────────────────

let _piano: Tone.Sampler | null = null;
let _lead:  Tone.Sampler | null = null;
let _loaded = 0;
const _callbacks: Array<() => void> = [];

function onLoaded() {
  _loaded++;
  if (_loaded >= 2) { _callbacks.forEach(cb => cb()); _callbacks.length = 0; }
}

export function isSamplersReady() { return _loaded >= 2; }
export function onSamplersReady(cb: () => void) {
  if (_loaded >= 2) { cb(); return; }
  _callbacks.push(cb);
}

export function initSamplers() {
  if (_piano) return;

  _piano = new Tone.Sampler({
    urls: {
      "A0": "A0.mp3", "C1": "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
      "A1": "A1.mp3", "C2": "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
      "A2": "A2.mp3", "C3": "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
      "A3": "A3.mp3", "C4": "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
      "A4": "A4.mp3", "C5": "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
      "A5": "A5.mp3", "C6": "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
      "A6": "A6.mp3", "C7": "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
      "A7": "A7.mp3", "C8": "C8.mp3",
    },
    baseUrl: "https://tonejs.github.io/audio/salamander/",
    release: 1.5,
    onload: onLoaded,
    onerror: () => onLoaded(),
  }).toDestination();
  _piano.volume.value = -4;

  _lead = new Tone.Sampler({
    urls: {
      "D#4": "Ds4.mp3", "D#5": "Ds5.mp3", "D#6": "Ds6.mp3",
      "F#3": "Fs3.mp3", "F#4": "Fs4.mp3", "F#5": "Fs5.mp3", "F#6": "Fs6.mp3",
      "A3": "A3.mp3",  "A4": "A4.mp3",  "A5": "A5.mp3",  "A6": "A6.mp3",
      "B2": "B2.mp3",  "B3": "B3.mp3",  "B4": "B4.mp3",  "B5": "B5.mp3",
      "E2": "E2.mp3",  "E3": "E3.mp3",  "E4": "E4.mp3",  "E5": "E5.mp3",
    },
    baseUrl: "https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-electric/",
    release: 1.5,
    onload: onLoaded,
    onerror: () => onLoaded(),
  }).toDestination();
  _lead.volume.value = -5;
}

// ── Drum pad definitions ───────────────────────────────────────────────────────

export const DRUM_PADS = [
  { label: "Kick",    shortLabel: "KK", pitch: 36, color: "#f97316" },
  { label: "Snare",   shortLabel: "SN", pitch: 38, color: "#eab308" },
  { label: "Hi-Hat",  shortLabel: "HH", pitch: 42, color: "#22c55e" },
  { label: "Open HH", shortLabel: "OH", pitch: 46, color: "#06b6d4" },
  { label: "Clap",    shortLabel: "CP", pitch: 39, color: "#a855f7" },
  { label: "Rim",     shortLabel: "RM", pitch: 37, color: "#ec4899" },
  { label: "Low Tom", shortLabel: "LT", pitch: 45, color: "#f59e0b" },
  { label: "Crash",   shortLabel: "CR", pitch: 49, color: "#6366f1" },
] as const;

export type InstrumentType = "drums" | "bass" | "synth" | "lead";

// ── Unified trigger API ────────────────────────────────────────────────────────

export function triggerDrum(pitch: number, velocity: number, time = Tone.now()) {
  switch (pitch) {
    case 36: playKick(time, velocity);         break;
    case 38: playSnare(time, velocity);        break;
    case 42: playHihat(time, velocity, false); break;
    case 46: playHihat(time, velocity, true);  break;
    case 39: playClap(time, velocity);         break;
    case 37: playRim(time, velocity);          break;
    case 45: playTom(time, velocity);          break;
    case 49: playCrash(time, velocity);        break;
    default: playKick(time, velocity);
  }
}

export function triggerMelody(instrument: InstrumentType, pitch: number, velocity: number, time = Tone.now()) {
  const note = Tone.Frequency(pitch, "midi").toNote();
  const vol  = velocity / 127;
  try {
    switch (instrument) {
      case "bass":  playBass(pitch, velocity, time); break;  // Web Audio synthesis — always works
      case "synth": _piano?.triggerAttackRelease(note, "8n", time, vol); break;
      case "lead":  _lead?.triggerAttackRelease(note, "8n", time, vol);  break;
    }
  } catch { /* sampler not loaded yet */ }
}
