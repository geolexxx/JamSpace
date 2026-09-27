import * as Tone from "tone";
import { ensureAudioContext } from "./scheduler";
import { playBass, playLeadFallback, playPianoFallback, triggerDrum } from "./instruments";
import type { Note, Track } from "../spacetime/client";

export interface PreviewNote {
  step: number;
  pitch: number;
  velocity: number;
  duration: number;
  instrument: string;
  volume: number;
}

export function notesForMelodyPreview(
  existingNotes: readonly Note[],
  tracks: readonly Track[],
  fromStep: number,
  toStep: number,
  continuation: readonly { trackId: number; step: number; pitch: number; velocity: number; duration: number }[],
): PreviewNote[] {
  const trackById = new Map(tracks.map(track => [track.trackId, track]));
  const existing = existingNotes
    .filter(note => note.step >= fromStep && note.step < toStep)
    .map(note => {
      const track = trackById.get(note.trackId);
      return track && !track.isMuted ? {
        step: note.step, pitch: note.pitch, velocity: note.velocity,
        duration: note.duration, instrument: track.instrument, volume: track.volume,
      } : null;
    })
    .filter((note): note is PreviewNote => note !== null);
  for (const note of continuation) {
    const track = trackById.get(note.trackId);
    if (track && !track.isMuted) existing.push({
      step: note.step, pitch: note.pitch, velocity: note.velocity, duration: note.duration,
      instrument: track.instrument, volume: track.volume,
    });
  }
  return existing;
}

// Audition uses its own gain node. Stopping it never changes the shared transport.
export async function playMelodyPreview(notes: readonly PreviewNote[], fromStep: number, toStep: number, bpm: number): Promise<() => void> {
  await ensureAudioContext();
  const context = Tone.getContext().rawContext as BaseAudioContext;
  const output = context.createGain();
  output.gain.value = 0.68;
  output.connect(context.destination);
  const stepSeconds = 60 / bpm / 4;
  const startTime = context.currentTime + 0.08;
  let stopped = false;
  for (const note of notes) {
    if (note.step < fromStep || note.step >= toStep) continue;
    const time = startTime + (note.step - fromStep) * stepSeconds;
    const velocity = Math.max(1, Math.min(127, Math.round(note.velocity * note.volume)));
    const duration = Math.max(0.06, Math.min(note.duration, toStep - note.step) * stepSeconds);
    if (note.instrument === "drums") triggerDrum(note.pitch, velocity, time, context, output);
    else if (note.instrument === "bass") playBass(note.pitch, velocity, time, duration, context, output);
    else if (note.instrument === "lead") playLeadFallback(note.pitch, velocity, time, duration, context, output);
    else playPianoFallback(note.pitch, velocity, time, duration, context, output);
  }
  const timer = window.setTimeout(stop, Math.max(0, (toStep - fromStep) * stepSeconds * 1000 + 250));
  function stop() {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(timer);
    output.gain.setValueAtTime(0, context.currentTime);
    output.disconnect();
  }
  return stop;
}
