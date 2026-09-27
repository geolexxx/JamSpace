/** AI proposals use absolute steps within one pattern. */
export interface MelodyNote {
  step: number;
  pitch: number;
  velocity: number;
  duration: number;
}

export interface ArrangedNote extends MelodyNote {
  trackId: number;
}

export interface MelodyTrackInput {
  trackId: number;
  instrument: "drums" | "bass" | "synth" | "lead";
  sourceNotes: readonly MelodyNote[];
  previousNotes?: readonly MelodyNote[];
  allowedPitches: readonly number[];
}

export interface MelodyContinuationInput {
  tracks: readonly MelodyTrackInput[];
  sourceBar: number;
  stepsPerBar: number;
  tempoBpm: number;
  variationSeed?: number;
  instruction?: string;
}

export interface MelodyContinuation {
  id: "familiar" | "lift" | "answer";
  label: string;
  description: string;
  /** Four new bars for drums, bass, synth, and lead. Original notes are excluded. */
  notes: ArrangedNote[];
}

const CANDIDATE_IDS = ["familiar", "lift", "answer"] as const;
const INSTRUMENTS = ["drums", "bass", "synth", "lead"] as const;
const FOUR_BARS = 4;
const MAX_STEP = 65535;

function integerIn(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validInputNote(note: MelodyNote): boolean {
  return integerIn(note.step, 0, MAX_STEP) && integerIn(note.pitch, 0, 127) &&
    integerIn(note.velocity, 1, 127) && integerIn(note.duration, 1, MAX_STEP);
}

function cleanInputNotes(notes: readonly MelodyNote[] | undefined, maxCount: number, name: string): MelodyNote[] {
  if (!notes) return [];
  if (!Array.isArray(notes) || notes.length > maxCount || !notes.every(validInputNote)) {
    throw new Error(`${name} contain invalid notes. Check the pattern and try again.`);
  }
  return notes.map(({ step, pitch, velocity, duration }) => ({ step, pitch, velocity, duration }));
}

function prepareInput(input: MelodyContinuationInput): MelodyContinuationInput {
  if (!integerIn(input.sourceBar, 0, 1023) || !integerIn(input.stepsPerBar, 2, 64) ||
      !integerIn(input.tempoBpm, 1, 400)) {
    throw new Error("Select a valid bar, time signature, and tempo before continuing.");
  }
  const sourceStart = input.sourceBar * input.stepsPerBar;
  const targetStart = sourceStart + input.stepsPerBar;
  if (targetStart + FOUR_BARS * input.stepsPerBar > MAX_STEP) {
    throw new Error("This phrase is too far into the pattern to add four bars.");
  }
  if (!Array.isArray(input.tracks) || input.tracks.length !== INSTRUMENTS.length ||
      new Set(input.tracks.map(track => track.trackId)).size !== INSTRUMENTS.length ||
      INSTRUMENTS.some(instrument => input.tracks.filter(track => track.instrument === instrument).length !== 1)) {
    throw new Error("Add one drums, bass, synth, and lead track before continuing.");
  }
  const tracks = input.tracks.map(track => {
    if (!integerIn(track.trackId, 0, 0xffffffff)) throw new Error("Choose valid tracks before continuing.");
    const sourceNotes = cleanInputNotes(track.sourceNotes, 64, `${track.instrument} source notes`);
    if (sourceNotes.some(note => note.step < sourceStart || note.step >= targetStart || note.step + note.duration > targetStart)) {
      throw new Error("Finish notes within the selected bar before continuing the arrangement.");
    }
    const previousNotes = cleanInputNotes(track.previousNotes, 64, `${track.instrument} earlier notes`)
      .filter(note => note.step < sourceStart && note.step + note.duration <= sourceStart);
    const allowedPitches = [...new Set(track.allowedPitches)];
    if (allowedPitches.length < 2 || !allowedPitches.every(pitch => integerIn(pitch, 0, 127))) {
      throw new Error(`The ${track.instrument} track needs at least two playable pitches.`);
    }
    return { trackId: track.trackId, instrument: track.instrument, sourceNotes, previousNotes, allowedPitches };
  });
  if (!tracks.some(track => track.sourceNotes.length > 0)) {
    throw new Error("Add at least one note to the latest bar before continuing.");
  }
  const variationSeed = input.variationSeed ?? 0;
  if (!integerIn(variationSeed, 0, 1_000_000_000)) throw new Error("Choose a valid variation number.");
  const instruction = input.instruction?.trim() ?? "";
  if (instruction.length > 300) throw new Error("Keep your direction under 300 characters.");
  return { tracks, sourceBar: input.sourceBar, stepsPerBar: input.stepsPerBar,
    tempoBpm: input.tempoBpm, variationSeed, instruction };
}

/** The model response must be playable and include every instrument in every new bar. */
export function validateMelodyResponse(value: unknown, input: MelodyContinuationInput): MelodyContinuation[] {
  if (!isRecord(value) || !Array.isArray(value.candidates) || value.candidates.length !== 3) {
    throw new Error("The melody agent returned an incomplete set of ideas. Try again.");
  }
  const start = (input.sourceBar + 1) * input.stepsPerBar;
  const end = start + FOUR_BARS * input.stepsPerBar;
  const allowedByTrack = new Map(input.tracks.map(track => [track.trackId, new Set(track.allowedPitches)]));
  const seenIds = new Set<string>();
  const candidates: MelodyContinuation[] = [];
  for (const raw of value.candidates) {
    if (!isRecord(raw) || !CANDIDATE_IDS.includes(raw.id as MelodyContinuation["id"]) || seenIds.has(raw.id as string) ||
        typeof raw.label !== "string" || raw.label.trim().length === 0 || raw.label.length > 60 ||
        typeof raw.description !== "string" || raw.description.trim().length === 0 || raw.description.length > 240 ||
        !Array.isArray(raw.notes) || raw.notes.length < 16 || raw.notes.length > 256) {
      throw new Error("The melody agent returned an invalid idea. Try again.");
    }
    seenIds.add(raw.id as string);
    const noteKeys = new Set<string>();
    const coverage = new Set<string>();
    const notes: ArrangedNote[] = [];
    for (const rawNote of raw.notes) {
      if (!isRecord(rawNote) || !integerIn(rawNote.trackId, 0, 0xffffffff) || !allowedByTrack.has(rawNote.trackId) ||
          !integerIn(rawNote.step, start, end - 1) || !integerIn(rawNote.pitch, 0, 127) ||
          !allowedByTrack.get(rawNote.trackId)!.has(rawNote.pitch) ||
          !integerIn(rawNote.velocity, 1, 127) || !integerIn(rawNote.duration, 1, MAX_STEP) ||
          rawNote.step + rawNote.duration > end) {
        throw new Error("The melody agent returned notes outside the playable tracks or bars. Try again.");
      }
      const key = `${rawNote.trackId}:${rawNote.step}:${rawNote.pitch}`;
      if (noteKeys.has(key)) throw new Error("The melody agent returned duplicate notes. Try again.");
      noteKeys.add(key);
      coverage.add(`${rawNote.trackId}:${Math.floor((rawNote.step - start) / input.stepsPerBar)}`);
      notes.push({ trackId: rawNote.trackId, step: rawNote.step, pitch: rawNote.pitch,
        velocity: rawNote.velocity, duration: rawNote.duration });
    }
    if (input.tracks.some(track => Array.from({ length: FOUR_BARS }, (_, bar) => `${track.trackId}:${bar}`).some(key => !coverage.has(key)))) {
      throw new Error("The melody agent skipped an instrument or bar. Try again.");
    }
    candidates.push({ id: raw.id as MelodyContinuation["id"], label: raw.label.trim(),
      description: raw.description.trim(), notes: notes.sort((a, b) => a.step - b.step || a.trackId - b.trackId || a.pitch - b.pitch) });
  }
  if (seenIds.size !== CANDIDATE_IDS.length || CANDIDATE_IDS.some(id => !seenIds.has(id))) {
    throw new Error("The melody agent returned an incomplete set of ideas. Try again.");
  }
  return CANDIDATE_IDS.map(id => candidates.find(candidate => candidate.id === id)!);
}

/** Ask the server-side AI agent. This never generates notes locally or saves them. */
export async function generateMelodyContinuations(
  input: MelodyContinuationInput,
  options: { signal?: AbortSignal } = {},
): Promise<MelodyContinuation[]> {
  const request = prepareInput(input);
  let response: Response;
  try {
    response = await fetch("/api/melody/continue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
    throw new Error("The melody agent is unavailable. Check that its service is running, then try again.");
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("The melody agent sent an unreadable response. Try again.");
  }
  if (!response.ok) {
    const rawError = isRecord(body) ? body.error : null;
    const message = isRecord(rawError) && typeof rawError.message === "string" && rawError.message.length <= 240
      ? rawError.message : "The melody agent could not create ideas. Try again.";
    throw new Error(message);
  }
  return validateMelodyResponse(body, request);
}
