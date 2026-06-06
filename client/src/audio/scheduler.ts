import * as Tone from "tone";
import { triggerDrum, triggerMelody } from "./instruments";
import type { Note, Track, ArrangementBlock, Pattern } from "../spacetime/client";

// ── Time signature helpers ─────────────────────────────────────────────────────
export function calcStepsPerBar(top: number, bottom: number): number {
  return bottom === 8 ? top * 2 : top * 4;
}
export function calcStepsPerBeat(bottom: number): number {
  return bottom === 8 ? 2 : 4;
}

// ── Live data ──────────────────────────────────────────────────────────────────
export const liveData = {
  notes:       [] as Note[],
  tracks:      [] as Track[],
  arrangement: [] as ArrangementBlock[],
  patterns:    [] as Pattern[],
  stepsPerBar: 16,
};

export function updateLiveData(
  notes: Note[],
  tracks: Track[],
  arrangement: ArrangementBlock[],
  patterns: Pattern[],
  stepsPerBar: number
) {
  liveData.notes       = notes;
  liveData.tracks      = tracks;
  liveData.arrangement = arrangement;
  liveData.patterns    = patterns;
  liveData.stepsPerBar = stepsPerBar;
}

// ── Playback engine ───────────────────────────────────────────────────────────
let ticker: Tone.Loop | null = null;
let absoluteStep = 0;

export function startPlayback(
  notes: Note[],
  tracks: Track[],
  arrangement: ArrangementBlock[],
  patterns: Pattern[],
  stepsPerBar: number,
  bpm: number,
  timeSigTop: number,
  timeSigBottom: number,
  onStep: (localStep: number, playingBlockIdxInAll: number) => void
) {
  stopPlayback();
  updateLiveData(notes, tracks, arrangement, patterns, stepsPerBar);
  absoluteStep = 0;

  Tone.getTransport().bpm.value = bpm;
  Tone.getTransport().timeSignature = [timeSigTop, timeSigBottom];

  ticker = new Tone.Loop((time) => {
    const spb = liveData.stepsPerBar;

    const allSorted = [...liveData.arrangement].sort((a, b) => a.position - b.position);
    const playable  = allSorted.filter(b =>
      liveData.notes.some(n => n.patternId === b.patternId)
    );

    if (playable.length === 0) {
      Tone.getDraw().schedule(() => onStep(0, -1), time);
      absoluteStep++;
      return;
    }

    // Build cumulative step offsets: each block spans numBars * stepsPerBar steps
    const offsets: number[] = [];
    let totalSteps = 0;
    for (const block of playable) {
      offsets.push(totalSteps);
      const pat = liveData.patterns.find(p => p.patternId === block.patternId);
      const blockSteps = (pat?.numBars ?? 1) * spb;
      totalSteps += blockSteps;
    }

    const wrapped = absoluteStep % totalSteps;

    // Find which playable block we're in
    let pIdx = 0;
    for (let i = offsets.length - 1; i >= 0; i--) {
      if (wrapped >= offsets[i]) { pIdx = i; break; }
    }
    const localStep = wrapped - offsets[pIdx];
    const block = playable[pIdx];

    // Map back to full sorted index for UI
    const allIdx = allSorted.findIndex(b => b.blockId === block.blockId);

    // Trigger notes
    for (const note of liveData.notes) {
      if (note.patternId !== block.patternId || note.step !== localStep) continue;
      const track = liveData.tracks.find(t => t.trackId === note.trackId);
      if (!track || track.isMuted) continue;

      const vel = Math.max(1, Math.round(note.velocity * track.volume));
      if (track.instrument === "drums") {
        triggerDrum(note.pitch, vel, time);
      } else {
        triggerMelody(track.instrument as any, note.pitch, vel, time);
      }
    }

    Tone.getDraw().schedule(() => onStep(localStep, allIdx), time);
    absoluteStep++;
  }, "16n");

  ticker.start(0);
  Tone.getTransport().start();
}

export function stopPlayback() {
  if (ticker) { ticker.stop(); ticker.dispose(); ticker = null; }
  Tone.getTransport().stop();
  Tone.getTransport().position = 0;
  absoluteStep = 0;
}

export function updateBpm(bpm: number) {
  Tone.getTransport().bpm.value = bpm;
}

export async function ensureAudioContext() {
  await Tone.start();
}
