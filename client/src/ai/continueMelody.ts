/**
 * Local, deterministic melody-continuation prototype. It produces private,
 * editable proposals only; callers decide whether and how to save a proposal.
 * Steps are absolute positions within the current Pattern.
 */
export interface MelodyNote {
  step: number;
  pitch: number;
  velocity: number;
  duration: number;
}

export interface MelodyKey {
  /** Pitch class: C=0, C#=1, ... B=11. */
  root: number;
  mode: "major" | "minor";
}

export interface MelodyContinuationInput {
  sourceNotes: readonly MelodyNote[];
  /** Notes on other tracks can help infer a tonal center. Never copied into output. */
  contextNotes?: readonly MelodyNote[];
  /** Zero-based index of the bar the user wrote. */
  sourceBar: number;
  stepsPerBar: number;
  tempoBpm: number;
  /** Every output pitch must be one of the active track's visible grid rows. */
  allowedPitches: readonly number[];
  key?: MelodyKey;
  /** Increment to explore another set of developments for the same source bar. */
  variationSeed?: number;
}

export interface MelodyContinuation {
  id: "familiar" | "lift" | "answer";
  label: string;
  description: string;
  /** Four new bars after the selected bar; no existing note is included. */
  notes: MelodyNote[];
}

const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
} as const;
const NEW_BARS = 4;
const MAX_U16 = 65535;

function isIntegerIn(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

function pitchClass(pitch: number): number {
  return ((pitch % 12) + 12) % 12;
}

function inferKey(notes: readonly MelodyNote[]): MelodyKey {
  const candidates: MelodyKey[] = [];
  for (let root = 0; root < 12; root++) {
    candidates.push({ root, mode: "major" }, { root, mode: "minor" });
  }
  const first = notes[0]?.pitch;
  const last = notes[notes.length - 1]?.pitch;
  const score = (key: MelodyKey): number => {
    const scale = MODES[key.mode].map(interval => (key.root + interval) % 12);
    let total = 0;
    notes.forEach(note => {
      const pc = pitchClass(note.pitch);
      total += scale.includes(pc) ? 1 : -1.5;
      if (pc === key.root) total += 0.4;
    });
    if (first !== undefined && pitchClass(first) === key.root) total += 1;
    if (last !== undefined && pitchClass(last) === key.root) total += 1.2;
    return total;
  };
  return candidates.reduce((best, next) => score(next) > score(best) ? next : best);
}

function nearestAllowed(target: number, allowed: readonly number[], key: MelodyKey): number {
  const scale = MODES[key.mode].map(interval => (key.root + interval) % 12);
  return [...allowed].sort((a, b) => {
    const aScore = Math.abs(a - target) + (scale.includes(pitchClass(a)) ? 0 : 0.55);
    const bScore = Math.abs(b - target) + (scale.includes(pitchClass(b)) ? 0 : 0.55);
    return aScore - bScore || a - b;
  })[0];
}

function moveInGrid(pitch: number, offset: number, allowed: readonly number[], key: MelodyKey): number {
  if (offset === 0 && allowed.includes(pitch)) return pitch;
  const ordered = [...allowed].sort((a, b) => a - b);
  const start = nearestAllowed(pitch, ordered, key);
  const startIndex = ordered.indexOf(start);
  return ordered[Math.max(0, Math.min(ordered.length - 1, startIndex + offset))];
}

function cleanMotif(notes: readonly MelodyNote[], barStart: number, stepsPerBar: number, allowed: readonly number[], key: MelodyKey): MelodyNote[] {
  // At a shared onset, follow the highest pitch as the lead melodic voice.
  const byStep = new Map<number, MelodyNote>();
  notes.forEach(note => {
    if (!isIntegerIn(note.step, barStart, barStart + stepsPerBar - 1)) return;
    if (!isIntegerIn(note.pitch, 0, 127) || !isIntegerIn(note.velocity, 1, 127) || !isIntegerIn(note.duration, 1, MAX_U16)) return;
    const previous = byStep.get(note.step);
    if (!previous || previous.pitch < note.pitch) byStep.set(note.step, note);
  });
  return [...byStep.values()].sort((a, b) => a.step - b.step).map(note => ({
    step: note.step - barStart,
    pitch: nearestAllowed(note.pitch, allowed, key),
    velocity: note.velocity,
    duration: Math.min(note.duration, barStart + stepsPerBar - note.step),
  }));
}

function addDevelopment(motif: readonly MelodyNote[], stepsPerBar: number, tempoBpm: number, allowed: readonly number[], key: MelodyKey): MelodyNote[] {
  if (motif.length >= 2) {
    // Two repeated tones (often the top voice of a chord) need a small contour
    // to become a phrase, while retaining the first note and the onset rhythm.
    if (motif.length === 2 && motif[0].pitch === motif[1].pitch) {
      const second = { ...motif[1], pitch: moveInGrid(motif[1].pitch, motif[1].pitch === Math.max(...allowed) ? -1 : 1, allowed, key) };
      return [motif[0], second];
    }
    return [...motif];
  }
  if (tempoBpm >= 150) return [...motif];
  const first = motif[0];
  const secondStep = Math.max(first.step + 1, Math.floor(stepsPerBar / 2));
  if (secondStep >= stepsPerBar) return [...motif];
  return [first, {
    ...first, step: secondStep,
    pitch: moveInGrid(first.pitch, first.pitch === Math.max(...allowed) ? -1 : 1, allowed, key),
    duration: Math.max(1, Math.floor(stepsPerBar / 4)), velocity: Math.max(50, first.velocity - 12),
  }];
}

function composeBar(
  motif: readonly MelodyNote[], barIndex: number, kind: MelodyContinuation["id"],
  firstNewStep: number, stepsPerBar: number, allowed: readonly number[], key: MelodyKey, variationSeed: number,
): MelodyNote[] {
  const ideaPhase = variationSeed % 5;
  const ideaGroup = Math.floor(variationSeed / 5) % 4;
  const variation = [0, 1, -1, 2, -2][ideaPhase];
  const boundedStep = (step: number) => Math.max(0, Math.min(stepsPerBar - 1, step));
  const motifPitches = motif.map(note => note.pitch);
  const center = (Math.min(...motifPitches) + Math.max(...motifPitches)) / 2;
  const mirror = (pitch: number) => nearestAllowed(2 * center - pitch, allowed, key);
  const top = Math.max(...allowed);
  const buildDirection = motif[0].pitch >= top - 2 ? -1 : 1;
  let local: MelodyNote[];

  if (barIndex === 0) {
    // Establish the user's rhythm and opening tone before developing it.
    local = motif.map((note, i) => ({
      ...note,
      pitch: kind === "lift" && i === motif.length - 1
        ? moveInGrid(note.pitch, buildDirection, allowed, key) : note.pitch,
    }));
  } else if (barIndex === 1) {
    // An answer starts after a short rest, groups the notes differently, and
    // leaves room at the end. This is an audible change of rhythm, not a loop.
    const response = motif.length > 6
      ? motif.filter((_, i) => i === 0 || i % 2 === 1 || i === motif.length - 1)
      : motif;
    local = response.map((note, i) => {
      const delayed = i % 2 === 0 ? Math.max(1, Math.floor(stepsPerBar / 8)) : -1;
      // Shift the answer's onset as well as its pitches. This keeps the first
      // 20 requested ideas distinct even when pitches hit a grid boundary.
      const localStep = ((note.step + delayed + ideaPhase + (i === response.length - 1 ? variation : 0)) % stepsPerBar + stepsPerBar) % stepsPerBar;
      const base = kind === "answer" ? mirror(note.pitch) : note.pitch;
      const offset = kind === "lift" ? 2 + variation : kind === "answer" ? -1 + variation : (i % 2 ? -1 : 1) + variation;
      return { ...note, step: localStep, pitch: moveInGrid(base, offset, allowed, key), velocity: Math.max(1, note.velocity - 6) };
    });
  } else if (barIndex === 2) {
    // The third bar grows in pitch, note density, and velocity. When the motif
    // already touches the top of the grid, build downward and return upward.
    local = motif.map((note, i) => {
      const base = kind === "answer" ? mirror(note.pitch) : note.pitch;
      const offset = buildDirection * (kind === "lift" ? 3 : kind === "answer" ? 2 : 1) + (i === motif.length - 1 ? variation : 0);
      return {
        ...note, step: ((note.step - (i > 0 && i % 2 === 1 ? 1 : 0) + ideaGroup) % stepsPerBar + stepsPerBar) % stepsPerBar,
        pitch: moveInGrid(base, offset, allowed, key), velocity: Math.min(127, note.velocity + 9),
      };
    });
    const ordered = [...local].sort((a, b) => a.step - b.step);
    let added = 0;
    for (let i = 0; i < ordered.length - 1 && added < 2; i++) {
      const gap = ordered[i + 1].step - ordered[i].step;
      if (gap < 3) continue;
      const step = ordered[i].step + Math.floor(gap / 2);
      local.push({
        step, pitch: moveInGrid(ordered[i].pitch, buildDirection, allowed, key),
        velocity: Math.max(1, ordered[i].velocity - 13), duration: Math.max(1, Math.floor(gap / 2)),
      });
      added++;
    }
  } else {
    // A shorter opening, a breath, then one sustained landing. Cadence near
    // the source's opening tone if the inferred tonic is outside the grid.
    const cadenceStep = Math.max(1, Math.floor(stepsPerBar * 0.625));
    const first = motif[0];
    const second = motif[1];
    const tonics = allowed.filter(pitch => pitchClass(pitch) === key.root);
    const landing = tonics.length > 0
      ? [...tonics].sort((a, b) => Math.abs(a - first.pitch) - Math.abs(b - first.pitch))[0]
      : first.pitch;
    local = [{
      ...first, step: 0, duration: Math.max(1, Math.min(first.duration, Math.floor(stepsPerBar / 5))),
      pitch: kind === "answer" ? mirror(first.pitch) : first.pitch,
    }];
    if (second && cadenceStep >= 4) {
      local.push({
        ...second, step: Math.max(2, Math.floor(stepsPerBar / 4)),
        duration: Math.max(1, Math.floor(stepsPerBar / 8)),
        pitch: moveInGrid(second.pitch, kind === "lift" ? buildDirection : kind === "answer" ? -1 : 0, allowed, key),
        velocity: Math.max(1, second.velocity - 8),
      });
    }
    local.push({ step: cadenceStep, pitch: landing, velocity: Math.min(127, first.velocity + 5), duration: stepsPerBar - cadenceStep });
  }

  const barStart = firstNewStep + barIndex * stepsPerBar;
  const transformed = local.map(note => ({ ...note, step: barStart + boundedStep(note.step) }));

  // Rhythm edits can collide; keep the stronger note at each onset and clip
  // every duration to the next onset and the end of this bar.
  const byStep = new Map<number, MelodyNote>();
  transformed.forEach(note => {
    const old = byStep.get(note.step);
    if (!old || old.velocity < note.velocity) byStep.set(note.step, note);
  });
  const ordered = [...byStep.values()].sort((a, b) => a.step - b.step);
  const barEnd = barStart + stepsPerBar;
  return ordered.map((note, i) => ({
    ...note,
    duration: Math.max(1, Math.min(note.duration, (ordered[i + 1]?.step ?? barEnd) - note.step)),
  }));
}

/** Throws a user-displayable Error for invalid or empty source material. */
export function generateMelodyContinuations(input: MelodyContinuationInput): MelodyContinuation[] {
  const { sourceBar, stepsPerBar, tempoBpm } = input;
  if (!isIntegerIn(sourceBar, 0, 1023) || !isIntegerIn(stepsPerBar, 2, 64) || !Number.isFinite(tempoBpm) || tempoBpm <= 0) {
    throw new Error("Select a valid bar and tempo before continuing your melody.");
  }
  const firstNewStep = (sourceBar + 1) * stepsPerBar;
  if (firstNewStep + NEW_BARS * stepsPerBar > MAX_U16 + 1) {
    throw new Error("This phrase is too far into the pattern to add four bars.");
  }
  const allowed = [...new Set(input.allowedPitches)].filter(pitch => isIntegerIn(pitch, 0, 127));
  if (allowed.length < 2) throw new Error("Choose a melodic track with at least two playable pitches.");
  if (input.key && (!isIntegerIn(input.key.root, 0, 11) || !MODES[input.key.mode])) {
    throw new Error("Choose a valid musical key.");
  }
  const variationSeed = input.variationSeed ?? 0;
  if (!isIntegerIn(variationSeed, 0, 1_000_000_000)) {
    throw new Error("Choose a valid variation number.");
  }
  const sourceStart = sourceBar * stepsPerBar;
  const source = input.sourceNotes.filter(note => isIntegerIn(note.step, sourceStart, sourceStart + stepsPerBar - 1));
  if (source.length === 0) throw new Error("Add at least one note to the selected bar first.");
  const tonalNotes = [
    ...source.filter(note => isIntegerIn(note.pitch, 0, 127)),
    ...(input.contextNotes ?? []).filter(note => isIntegerIn(note.pitch, 0, 127)),
  ];
  const key = input.key ?? inferKey(tonalNotes);
  const motif = addDevelopment(cleanMotif(source, sourceStart, stepsPerBar, allowed, key), stepsPerBar, tempoBpm, allowed, key);
  if (motif.length === 0) throw new Error("The selected bar has no usable melody notes.");

  const variants: Array<Pick<MelodyContinuation, "id" | "label" | "description">> = [
    { id: "familiar", label: "Stay close", description: "Echo your motif, then settle into a familiar ending." },
    { id: "lift", label: "Build up", description: "Move the motif higher and bring a little more energy." },
    { id: "answer", label: "Call and response", description: "Turn the melodic contour around to answer your idea." },
  ];
  return variants.map(variant => ({
    ...variant,
    notes: Array.from({ length: NEW_BARS }, (_, bar) => composeBar(
      motif, bar, variant.id, firstNewStep, stepsPerBar, allowed, key, variationSeed,
    )).flat(),
  }));
}
