import * as Tone from "tone";

// ── Raw AudioContext for drum synthesis ────────────────────────────────────────
function ctx(): BaseAudioContext { return Tone.getContext().rawContext as BaseAudioContext; }

function makeNoiseBuffer(c: BaseAudioContext, duration: number): AudioBuffer {
  const size = Math.floor(c.sampleRate * duration);
  const buf = c.createBuffer(1, size, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// ── Drum synthesis ────────────────────────────────────────────────────────────

export function playKick(time: number, vel: number, c: BaseAudioContext = ctx(), output: AudioNode = c.destination) {
  const v = vel / 127;
  const body = c.createOscillator(); const bodyGain = c.createGain();
  body.connect(bodyGain); bodyGain.connect(output);
  body.type = "sine"; body.frequency.setValueAtTime(180, time);
  body.frequency.exponentialRampToValueAtTime(40, time + 0.07);
  bodyGain.gain.setValueAtTime(v * 2.2, time);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
  body.start(time); body.stop(time + 0.5);
  const click = c.createOscillator(); const clickGain = c.createGain();
  click.connect(clickGain); clickGain.connect(output);
  click.type = "square"; click.frequency.setValueAtTime(600, time);
  click.frequency.exponentialRampToValueAtTime(100, time + 0.018);
  clickGain.gain.setValueAtTime(v * 0.7, time);
  clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.018);
  click.start(time); click.stop(time + 0.018);
}

export function playSnare(time: number, vel: number, c: BaseAudioContext = ctx(), output: AudioNode = c.destination) {
  const v = vel / 127;
  const noise = c.createBufferSource(); noise.buffer = makeNoiseBuffer(c, 0.18);
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1500; hp.Q.value = 0.7;
  const noiseGain = c.createGain();
  noise.connect(hp); hp.connect(noiseGain); noiseGain.connect(output);
  noiseGain.gain.setValueAtTime(v * 1.8, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
  noise.start(time);
  const body = c.createOscillator(); const bodyGain = c.createGain();
  body.connect(bodyGain); bodyGain.connect(output);
  body.type = "triangle"; body.frequency.setValueAtTime(230, time);
  body.frequency.exponentialRampToValueAtTime(130, time + 0.05);
  bodyGain.gain.setValueAtTime(v * 0.9, time);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  body.start(time); body.stop(time + 0.05);
}

export function playHihat(time: number, vel: number, open: boolean, c: BaseAudioContext = ctx(), output: AudioNode = c.destination) {
  const v = vel / 127; const decay = open ? 0.32 : 0.045;
  [285, 376, 491, 540, 814, 1018].forEach(f => {
    const osc = c.createOscillator(); const gain = c.createGain();
    osc.connect(gain); gain.connect(output);
    osc.type = "square"; osc.frequency.value = f;
    gain.gain.setValueAtTime(v * 0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
    osc.start(time); osc.stop(time + decay + 0.01);
  });
  const noise = c.createBufferSource(); noise.buffer = makeNoiseBuffer(c, decay + 0.01);
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 8000;
  const ng = c.createGain();
  noise.connect(hp); hp.connect(ng); ng.connect(output);
  ng.gain.setValueAtTime(v * 0.15, time);
  ng.gain.exponentialRampToValueAtTime(0.001, time + decay);
  noise.start(time);
}

export function playClap(time: number, vel: number, c: BaseAudioContext = ctx(), output: AudioNode = c.destination) {
  const v = vel / 127;
  [0, 0.006, 0.012, 0.022].forEach((delay, i) => {
    const n = c.createBufferSource(); n.buffer = makeNoiseBuffer(c, 0.12);
    const bp1 = c.createBiquadFilter(); bp1.type = "bandpass"; bp1.frequency.value = 1100; bp1.Q.value = 0.6;
    const bp2 = c.createBiquadFilter(); bp2.type = "highpass"; bp2.frequency.value = 800;
    const g = c.createGain();
    n.connect(bp1); bp1.connect(bp2); bp2.connect(g); g.connect(output);
    const t = time + delay; const isLast = i === 3;
    g.gain.setValueAtTime(v * (isLast ? 1.0 : 0.5), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (isLast ? 0.1 : 0.015));
    n.start(t);
  });
}

export function playRim(time: number, vel: number, c: BaseAudioContext = ctx(), output: AudioNode = c.destination) {
  const v = vel / 127;
  const osc = c.createOscillator(); const gain = c.createGain();
  osc.connect(gain); gain.connect(output);
  osc.type = "square"; osc.frequency.value = 1700;
  gain.gain.setValueAtTime(v * 0.45, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
  osc.start(time); osc.stop(time + 0.02);
}

export function playTom(time: number, vel: number, c: BaseAudioContext = ctx(), output: AudioNode = c.destination) {
  const v = vel / 127;
  const osc = c.createOscillator(); const gain = c.createGain();
  osc.connect(gain); gain.connect(output); osc.type = "sine";
  osc.frequency.setValueAtTime(110, time); osc.frequency.exponentialRampToValueAtTime(55, time + 0.18);
  gain.gain.setValueAtTime(v * 1.5, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
  osc.start(time); osc.stop(time + 0.35);
}

export function playCrash(time: number, vel: number, c: BaseAudioContext = ctx(), output: AudioNode = c.destination) {
  const v = vel / 127;
  [220, 285, 376, 540, 814, 1018].forEach(f => {
    const osc = c.createOscillator(); const g = c.createGain();
    osc.connect(g); g.connect(output); osc.type = "sawtooth"; osc.frequency.value = f;
    g.gain.setValueAtTime(v * 0.04, time); g.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
    osc.start(time); osc.stop(time + 1.5);
  });
  const noise = c.createBufferSource(); noise.buffer = makeNoiseBuffer(c, 1.6);
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 4000;
  const ng = c.createGain();
  noise.connect(hp); hp.connect(ng); ng.connect(output);
  ng.gain.setValueAtTime(v * 0.3, time); ng.gain.exponentialRampToValueAtTime(0.001, time + 1.4);
  noise.start(time);
}

// ── Bass synthesis (Web Audio API — no CDN needed, always works) ──────────────
export function playBass(pitch: number, vel: number, time: number, durationSec = 0.75, c: BaseAudioContext = ctx(), output: AudioNode = c.destination) {
  const v = vel / 127;
  const freq = Tone.Frequency(pitch, "midi").toFrequency();
  const hold = Math.max(0.12, durationSec);

  // Sub sine — the low body
  const sub = c.createOscillator(); const subGain = c.createGain();
  sub.type = "sine"; sub.frequency.value = freq;
  sub.connect(subGain); subGain.connect(output);
  subGain.gain.setValueAtTime(v * 1.4, time);
  subGain.gain.exponentialRampToValueAtTime(v * 0.6, time + 0.06);
  subGain.gain.linearRampToValueAtTime(v * 0.6, time + hold);
  subGain.gain.exponentialRampToValueAtTime(0.001, time + hold + 0.08);
  sub.start(time); sub.stop(time + hold + 0.09);

  // Sawtooth through lowpass — string/pick character
  const saw = c.createOscillator(); saw.type = "sawtooth"; saw.frequency.value = freq;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(freq * 8, time);
  lp.frequency.exponentialRampToValueAtTime(freq * 2, time + 0.12);
  lp.Q.value = 4;
  const sawGain = c.createGain();
  saw.connect(lp); lp.connect(sawGain); sawGain.connect(output);
  sawGain.gain.setValueAtTime(v * 0.5, time);
  sawGain.gain.exponentialRampToValueAtTime(v * 0.25, time + 0.08);
  sawGain.gain.linearRampToValueAtTime(v * 0.25, time + hold);
  sawGain.gain.exponentialRampToValueAtTime(0.001, time + hold + 0.08);
  saw.start(time); saw.stop(time + hold + 0.09);

  // Click transient for pluck attack
  const click = c.createOscillator(); click.type = "square"; click.frequency.value = freq * 3;
  const cg = c.createGain();
  click.connect(cg); cg.connect(output);
  cg.gain.setValueAtTime(v * 0.3, time);
  cg.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
  click.start(time); click.stop(time + 0.026);
}

// ── Sample-based melodic instruments ─────────────────────────────────────────

export const PIANO_SAMPLE_BASE = "https://tonejs.github.io/audio/salamander/";
export const LEAD_SAMPLE_BASE = "https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-electric/";
export const PIANO_SAMPLE_URLS = {
  "A0": "A0.mp3", "C1": "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
  "A1": "A1.mp3", "C2": "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
  "A2": "A2.mp3", "C3": "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
  "A3": "A3.mp3", "C4": "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
  "A4": "A4.mp3", "C5": "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
  "A5": "A5.mp3", "C6": "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
  "A6": "A6.mp3", "C7": "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
  "A7": "A7.mp3", "C8": "C8.mp3",
};
export const LEAD_SAMPLE_URLS = {
  "A2": "A2.mp3", "A3": "A3.mp3", "A4": "A4.mp3", "A5": "A5.mp3",
  "C3": "C3.mp3", "C4": "C4.mp3", "C5": "C5.mp3", "C6": "C6.mp3",
  "C#2": "Cs2.mp3",
  "D#3": "Ds3.mp3", "D#4": "Ds4.mp3", "D#5": "Ds5.mp3",
  "E2": "E2.mp3",
  "F#2": "Fs2.mp3", "F#3": "Fs3.mp3", "F#4": "Fs4.mp3", "F#5": "Fs5.mp3",
};

let _piano: Tone.Sampler | null = null;
let _lead:  Tone.Sampler | null = null;
let _pianoSettled = false;
let _leadSettled = false;
let _pianoFailed = false;
let _leadFailed = false;
const _callbacks: Array<() => void> = [];

function notifyReady() {
  if (_pianoSettled && _leadSettled) { _callbacks.forEach(cb => cb()); _callbacks.length = 0; }
}

export function isSamplersReady() { return _pianoSettled && _leadSettled; }
export function onSamplersReady(cb: () => void) {
  if (isSamplersReady()) { cb(); return; }
  _callbacks.push(cb);
}

export function initSamplers() {
  if (_piano) return;

  _piano = new Tone.Sampler({
    urls: PIANO_SAMPLE_URLS,
    baseUrl: PIANO_SAMPLE_BASE,
    release: 1.5,
    onload: () => { _pianoSettled = true; notifyReady(); },
    onerror: () => { _pianoFailed = true; _pianoSettled = true; notifyReady(); },
  }).toDestination();
  _piano.volume.value = -4;

  _lead = new Tone.Sampler({
    urls: LEAD_SAMPLE_URLS,
    baseUrl: LEAD_SAMPLE_BASE,
    release: 1.5,
    onload: () => { _leadSettled = true; notifyReady(); },
    onerror: () => { _leadFailed = true; _leadSettled = true; notifyReady(); },
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

// Browser-safe melodic voices when a remote sample source is unavailable.
// Both live playback and offline export use these exact fallback graphs.
export function playPianoFallback(pitch: number, vel: number, time: number, durationSec: number, c: BaseAudioContext = ctx(), output: AudioNode = c.destination) {
  const frequency = 440 * 2 ** ((pitch - 69) / 12);
  const hold = Math.max(0.04, durationSec);
  const gain = c.createGain();
  gain.connect(output);
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(Math.max(0.001, vel / 127 * 0.32), time + 0.006);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vel / 127 * 0.1), time + Math.min(hold, 0.35));
  gain.gain.setValueAtTime(Math.max(0.001, vel / 127 * 0.1), time + hold);
  gain.gain.exponentialRampToValueAtTime(0.001, time + hold + 0.5);
  for (const [ratio, level] of [[1, 1], [2, 0.28], [3, 0.1]]) {
    const oscillator = c.createOscillator();
    const partial = c.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency * ratio;
    partial.gain.value = level;
    oscillator.connect(partial); partial.connect(gain);
    oscillator.start(time); oscillator.stop(time + hold + 0.51);
  }
}

export function playLeadFallback(pitch: number, vel: number, time: number, durationSec: number, c: BaseAudioContext = ctx(), output: AudioNode = c.destination) {
  const frequency = 440 * 2 ** ((pitch - 69) / 12);
  const hold = Math.max(0.04, durationSec);
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(8000, frequency * 10), time);
  filter.frequency.exponentialRampToValueAtTime(Math.max(250, frequency * 3), time + Math.min(hold, 0.2));
  const gain = c.createGain();
  filter.connect(gain); gain.connect(output);
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(Math.max(0.001, vel / 127 * 0.2), time + 0.012);
  gain.gain.setValueAtTime(Math.max(0.001, vel / 127 * 0.2), time + hold);
  gain.gain.exponentialRampToValueAtTime(0.001, time + hold + 0.2);
  for (const detune of [-5, 5]) {
    const oscillator = c.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;
    oscillator.connect(filter);
    oscillator.start(time); oscillator.stop(time + hold + 0.21);
  }
}

// ── Unified trigger API ────────────────────────────────────────────────────────

export function triggerDrum(pitch: number, velocity: number, time = Tone.now(), c: BaseAudioContext = ctx(), output: AudioNode = c.destination) {
  switch (pitch) {
    case 36: playKick(time, velocity, c, output);         break;
    case 38: playSnare(time, velocity, c, output);        break;
    case 42: playHihat(time, velocity, false, c, output); break;
    case 46: playHihat(time, velocity, true, c, output);  break;
    case 39: playClap(time, velocity, c, output);         break;
    case 37: playRim(time, velocity, c, output);          break;
    case 45: playTom(time, velocity, c, output);          break;
    case 49: playCrash(time, velocity, c, output);        break;
    default: playKick(time, velocity, c, output);
  }
}

export function triggerMelody(instrument: InstrumentType, pitch: number, velocity: number, time = Tone.now(), durationSec = 0.5) {
  const note = Tone.Frequency(pitch, "midi").toNote();
  const vol  = velocity / 127;
  try {
    switch (instrument) {
      case "bass":  playBass(pitch, velocity, time, durationSec); break;
      case "synth":
        if (_piano?.loaded && !_pianoFailed) _piano.triggerAttackRelease(note, durationSec, time, vol);
        else playPianoFallback(pitch, velocity, time, durationSec);
        break;
      case "lead":
        if (_lead?.loaded && !_leadFailed) _lead.triggerAttackRelease(note, durationSec, time, vol);
        else playLeadFallback(pitch, velocity, time, durationSec);
        break;
    }
  } catch {
    if (instrument === "synth") playPianoFallback(pitch, velocity, time, durationSec);
    if (instrument === "lead") playLeadFallback(pitch, velocity, time, durationSec);
  }
}
