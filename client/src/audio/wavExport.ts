import * as Tone from "tone";
import type { ArrangementBlock, Note, Pattern, Session, Track } from "../spacetime/client";
import { calcStepsPerBar } from "./scheduler";
import { buildTimeline } from "./timeline";
import {
  triggerDrum, playBass, PIANO_SAMPLE_URLS, PIANO_SAMPLE_BASE,
  LEAD_SAMPLE_URLS, LEAD_SAMPLE_BASE, playPianoFallback, playLeadFallback,
} from "./instruments";

export const WAV_SAMPLE_RATE = 44_100;
export const MAX_EXPORT_SECONDS = 300;
const TAIL_SECONDS = 2;

export interface ExportSnapshot {
  name: string;
  bpm: number;
  timeSigTop: number;
  timeSigBottom: number;
  tracks: Track[];
  notes: Note[];
  patterns: Pattern[];
  arrangement: ArrangementBlock[];
}

export interface ExportSummary {
  arrangementSeconds: number;
  outputSeconds: number;
  playableNotes: number;
  tooLong: boolean;
}

export class ExportCancelledError extends Error {
  constructor() { super("Export cancelled"); }
}

export function createExportSnapshot(
  session: Session, tracks: Track[], notes: Note[],
  patterns: Pattern[], arrangement: ArrangementBlock[]
): ExportSnapshot {
  return {
    name: session.name,
    bpm: session.tempoBpm,
    timeSigTop: session.timeSigTop,
    timeSigBottom: session.timeSigBottom,
    tracks: tracks.map(track => ({ ...track })),
    notes: notes.map(note => ({ ...note })),
    patterns: patterns.map(pattern => ({ ...pattern })),
    arrangement: arrangement.map(block => ({ ...block })),
  };
}

function secondsPerStep(bpm: number): number {
  return 60 / Math.max(1, bpm) / 4;
}

function scheduledNotes(snapshot: ExportSnapshot) {
  const stepsPerBar = calcStepsPerBar(snapshot.timeSigTop, snapshot.timeSigBottom);
  const timeline = buildTimeline(snapshot.arrangement, snapshot.patterns, stepsPerBar);
  const trackById = new Map(snapshot.tracks.map(track => [track.trackId, track]));
  const notesByPattern = new Map<number, Note[]>();
  for (const note of snapshot.notes) {
    const list = notesByPattern.get(note.patternId) ?? [];
    list.push(note);
    notesByPattern.set(note.patternId, list);
  }
  const events: Array<{ note: Note; track: Track; step: number; velocity: number }> = [];
  for (const block of timeline.blocks) {
    for (const note of notesByPattern.get(block.block.patternId) ?? []) {
      if (note.step < 0 || note.step >= block.steps) continue;
      const track = trackById.get(note.trackId);
      if (!track || track.isMuted || !["drums", "bass", "synth", "lead"].includes(track.instrument)) continue;
      const velocity = Math.min(127, Math.round(note.velocity * track.volume));
      if (velocity > 0) events.push({ note, track, step: block.startStep + note.step, velocity });
    }
  }
  return { timeline, events };
}

export function getExportSummary(snapshot: ExportSnapshot): ExportSummary {
  const { timeline, events } = scheduledNotes(snapshot);
  const arrangementSeconds = timeline.totalSteps * secondsPerStep(snapshot.bpm);
  const outputSeconds = arrangementSeconds + TAIL_SECONDS;
  return {
    arrangementSeconds,
    outputSeconds,
    playableNotes: events.length,
    tooLong: outputSeconds > MAX_EXPORT_SECONDS,
  };
}

function throwIfCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new ExportCancelledError();
}

function nearestSamples(urls: Record<string, string>, pitches: number[]): Record<string, string> {
  const options = Object.entries(urls).map(([key, value]) => ({
    key, value, pitch: Tone.Frequency(key).toMidi(),
  }));
  const chosen: Record<string, string> = {};
  for (const pitch of pitches) {
    const closest = options.reduce((best, candidate) =>
      Math.abs(candidate.pitch - pitch) < Math.abs(best.pitch - pitch)
      || (Math.abs(candidate.pitch - pitch) === Math.abs(best.pitch - pitch) && candidate.pitch > best.pitch)
        ? candidate : best
    );
    chosen[closest.key] = closest.value;
  }
  return chosen;
}

async function loadSampler(
  context: Tone.OfflineContext, output: AudioNode,
  urls: Record<string, string>, baseUrl: string, pitches: number[],
  volumeDb: number, signal?: AbortSignal
): Promise<Tone.Sampler> {
  const selected = nearestSamples(urls, pitches);
  let resolveLoad!: () => void;
  let rejectLoad!: (reason: Error) => void;
  const loaded = new Promise<void>((resolve, reject) => { resolveLoad = resolve; rejectLoad = reject; });
  const sampler = new Tone.Sampler({
    urls: selected, baseUrl, release: 1.5, context,
    onload: resolveLoad,
    onerror: error => rejectLoad(error),
  }).connect(output);
  sampler.volume.value = volumeDb;
  if (sampler.loaded) resolveLoad();
  const timeout = setTimeout(() => rejectLoad(new Error("Instrument samples took too long to load.")), 30_000);
  const onAbort = () => rejectLoad(new ExportCancelledError());
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    await loaded;
    throwIfCancelled(signal);
    return sampler;
  } catch (error) {
    sampler.dispose();
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function renderWav(snapshot: ExportSnapshot, signal?: AbortSignal): Promise<ArrayBuffer> {
  const summary = getExportSummary(snapshot);
  if (summary.playableNotes === 0) throw new Error("Add an audible note to the song before exporting.");
  if (summary.tooLong) throw new Error("This song exceeds the 5-minute WAV limit.");
  throwIfCancelled(signal);

  const { events } = scheduledNotes(snapshot);
  const offline = new Tone.OfflineContext(2, summary.outputSeconds, WAV_SAMPLE_RATE);
  const raw = offline.rawContext as OfflineAudioContext;
  const output = raw.createGain();
  output.connect(raw.destination);
  const pianoPitches = events.filter(event => event.track.instrument === "synth").map(event => event.note.pitch);
  const leadPitches = events.filter(event => event.track.instrument === "lead").map(event => event.note.pitch);
  let piano: Tone.Sampler | undefined;
  let lead: Tone.Sampler | undefined;
  try {
    if (pianoPitches.length) {
      try { piano = await loadSampler(offline, output, PIANO_SAMPLE_URLS, PIANO_SAMPLE_BASE, pianoPitches, -4, signal); }
      catch (error) { throwIfCancelled(signal); if (error instanceof ExportCancelledError) throw error; }
    }
    if (leadPitches.length) {
      try { lead = await loadSampler(offline, output, LEAD_SAMPLE_URLS, LEAD_SAMPLE_BASE, leadPitches, -5, signal); }
      catch (error) { throwIfCancelled(signal); if (error instanceof ExportCancelledError) throw error; }
    }
    throwIfCancelled(signal);
    const stepSeconds = secondsPerStep(snapshot.bpm);
    for (const event of events) {
      const time = event.step * stepSeconds;
      const duration = Math.max(0.01, event.note.duration * stepSeconds);
      const { instrument } = event.track;
      if (instrument === "drums") triggerDrum(event.note.pitch, event.velocity, time, raw, output);
      if (instrument === "bass") playBass(event.note.pitch, event.velocity, time, duration, raw, output);
      if (instrument === "synth") {
        if (piano) piano.triggerAttackRelease(Tone.Frequency(event.note.pitch, "midi").toNote(), duration, time, event.velocity / 127);
        else playPianoFallback(event.note.pitch, event.velocity, time, duration, raw, output);
      }
      if (instrument === "lead") {
        if (lead) lead.triggerAttackRelease(Tone.Frequency(event.note.pitch, "midi").toNote(), duration, time, event.velocity / 127);
        else playLeadFallback(event.note.pitch, event.velocity, time, duration, raw, output);
      }
    }
    const rendered = await offline.render();
    throwIfCancelled(signal);
    const buffer = rendered.get();
    if (!buffer) throw new Error("The browser did not return rendered audio.");
    return encodeWav(buffer);
  } finally {
    piano?.dispose();
    lead?.dispose();
  }
}

export function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  if (buffer.numberOfChannels !== 2) throw new Error("Stereo audio is required for WAV export.");
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const frameCount = buffer.length;
  const wav = new ArrayBuffer(44 + frameCount * 4);
  const view = new DataView(wav);
  const writeText = (at: number, value: string) => {
    for (let index = 0; index < value.length; index++) view.setUint8(at + index, value.charCodeAt(index));
  };
  writeText(0, "RIFF"); view.setUint32(4, wav.byteLength - 8, true);
  writeText(8, "WAVE"); writeText(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 4, true);
  view.setUint16(32, 4, true); view.setUint16(34, 16, true);
  writeText(36, "data"); view.setUint32(40, frameCount * 4, true);

  // Reduce the whole mix only when needed, preserving relative track volumes.
  let peak = 0;
  for (let index = 0; index < frameCount; index++) {
    peak = Math.max(peak, Math.abs(left[index]), Math.abs(right[index]));
  }
  const gain = peak > 0.98 ? 0.98 / peak : 1;
  for (let index = 0; index < frameCount; index++) {
    view.setInt16(44 + index * 4, Math.round(Math.max(-1, Math.min(1, left[index] * gain)) * 32767), true);
    view.setInt16(46 + index * 4, Math.round(Math.max(-1, Math.min(1, right[index] * gain)) * 32767), true);
  }
  return wav;
}

export function wavFileName(name: string, date = new Date()): string {
  const safe = name.replace(/[\\/?%*:|"<>\x00-\x1f]/g, "_").replace(/\s+/g, " ").replace(/[. ]+$/g, "").trim().slice(0, 80) || "JamSpace";
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `${safe}_${day}.wav`;
}

export function downloadWav(wav: ArrayBuffer, name: string): void {
  const url = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = wavFileName(name);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
