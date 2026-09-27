/** A private proposal from the melody agent. Steps are absolute within a pattern. */
export interface MelodyNote {
  step: number;
  pitch: number;
  velocity: number;
  duration: number;
}

export interface MelodyContinuationInput {
  sourceNotes: readonly MelodyNote[];
  /** Earlier notes on the selected track give the agent phrase context. */
  previousNotes?: readonly MelodyNote[];
  /** Notes from other melodic tracks provide harmonic context. */
  contextNotes?: readonly MelodyNote[];
  sourceBar: number;
  stepsPerBar: number;
  tempoBpm: number;
  allowedPitches: readonly number[];
  variationSeed?: number;
  /** Optional direction in the musician's own words. */
  instruction?: string;
}

export interface MelodyContinuation {
  id: "familiar" | "lift" | "answer";
  label: string;
  description: string;
  /** Four new bars after the source; original notes are never returned. */
  notes: MelodyNote[];
}

const CANDIDATE_IDS = ["familiar", "lift", "answer"] as const;
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
  const targetEnd = (input.sourceBar + 1 + FOUR_BARS) * input.stepsPerBar;
  if (targetEnd > MAX_STEP) throw new Error("This phrase is too far into the pattern to add four bars.");
  const sourceNotes = cleanInputNotes(input.sourceNotes, 64, "Source notes");
  const sourceStart = input.sourceBar * input.stepsPerBar;
  const targetStart = sourceStart + input.stepsPerBar;
  if (sourceNotes.length === 0) throw new Error("Add at least one note to the selected bar first.");
  if (sourceNotes.some(note => note.step < sourceStart || note.step >= targetStart || note.step + note.duration > targetStart)) {
    throw new Error("Finish notes within the selected bar before continuing its melody.");
  }
  const previousNotes = cleanInputNotes(input.previousNotes, 64, "Earlier melody notes")
    .filter(note => note.step < sourceStart && note.step + note.duration <= sourceStart);
  const contextNotes = cleanInputNotes(input.contextNotes, 128, "Harmony notes");
  const allowedPitches = [...new Set(input.allowedPitches)];
  if (allowedPitches.length < 2 || !allowedPitches.every(pitch => integerIn(pitch, 0, 127))) {
    throw new Error("Choose a melodic track with at least two playable pitches.");
  }
  const variationSeed = input.variationSeed ?? 0;
  if (!integerIn(variationSeed, 0, 1_000_000_000)) throw new Error("Choose a valid variation number.");
  const instruction = input.instruction?.trim() ?? "";
  if (instruction.length > 300) throw new Error("Keep your direction under 300 characters.");
  return { sourceNotes, previousNotes, contextNotes, sourceBar: input.sourceBar,
    stepsPerBar: input.stepsPerBar, tempoBpm: input.tempoBpm,
    allowedPitches, variationSeed, instruction };
}

/** Treat model output as untrusted until every note is safe to preview and apply. */
export function validateMelodyResponse(value: unknown, input: MelodyContinuationInput): MelodyContinuation[] {
  if (!isRecord(value) || !Array.isArray(value.candidates) || value.candidates.length !== 3) {
    throw new Error("The melody agent returned an incomplete set of ideas. Try again.");
  }
  const start = (input.sourceBar + 1) * input.stepsPerBar;
  const end = start + FOUR_BARS * input.stepsPerBar;
  const allowed = new Set(input.allowedPitches);
  const seenIds = new Set<string>();
  const candidates: MelodyContinuation[] = [];
  for (const raw of value.candidates) {
    if (!isRecord(raw) || !CANDIDATE_IDS.includes(raw.id as MelodyContinuation["id"]) || seenIds.has(raw.id as string) ||
        typeof raw.label !== "string" || raw.label.trim().length === 0 || raw.label.length > 60 ||
        typeof raw.description !== "string" || raw.description.trim().length === 0 || raw.description.length > 240 ||
        !Array.isArray(raw.notes) || raw.notes.length < 1 || raw.notes.length > 128) {
      throw new Error("The melody agent returned an invalid idea. Try again.");
    }
    seenIds.add(raw.id as string);
    const noteKeys = new Set<string>();
    const notes: MelodyNote[] = [];
    for (const rawNote of raw.notes) {
      if (!isRecord(rawNote) || !integerIn(rawNote.step, start, end - 1) ||
          !integerIn(rawNote.pitch, 0, 127) || !allowed.has(rawNote.pitch) ||
          !integerIn(rawNote.velocity, 1, 127) || !integerIn(rawNote.duration, 1, MAX_STEP) ||
          rawNote.step + rawNote.duration > end) {
        throw new Error("The melody agent returned notes outside the playable bars. Try again.");
      }
      const key = `${rawNote.step}:${rawNote.pitch}`;
      if (noteKeys.has(key)) throw new Error("The melody agent returned duplicate notes. Try again.");
      noteKeys.add(key);
      notes.push({ step: rawNote.step, pitch: rawNote.pitch, velocity: rawNote.velocity, duration: rawNote.duration });
    }
    candidates.push({ id: raw.id as MelodyContinuation["id"], label: raw.label.trim(),
      description: raw.description.trim(), notes: notes.sort((a, b) => a.step - b.step || a.pitch - b.pitch) });
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
