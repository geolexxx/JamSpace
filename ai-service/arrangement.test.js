import assert from "node:assert/strict";
import { test } from "node:test";
import { continueMelody, MelodyServiceError, validateCandidates, validateRequest } from "./melody.js";

const pitchSets = {
  drums: [36, 38, 42, 46, 39, 37, 45, 49],
  bass: [48, 50, 52, 53, 55, 57, 59, 60],
  synth: [60, 62, 64, 65, 67, 69, 71, 72],
  lead: [60, 62, 64, 65, 67, 69, 71, 72],
};

function request() {
  return {
    sourceBar: 0, stepsPerBar: 16, tempoBpm: 100,
    tracks: ["drums", "bass", "synth", "lead"].map((instrument, index) => ({
      trackId: index + 1, instrument, allowedPitches: pitchSets[instrument],
      sourceNotes: instrument === "synth" ? [{ step: 0, pitch: 60, velocity: 90, duration: 2 }] : [],
      previousNotes: [],
    })),
  };
}

function modelCandidates() {
  return ["familiar", "lift", "answer"].map((id, variant) => ({
    id, label: id, description: `Four parts ${id}`, assessment: "Coordinated groove",
    notes: [0, 1, 2, 3].flatMap(bar => ["drums", "bass", "synth", "lead"].map((instrument, index) => ({
      trackId: index + 1, step: 16 + 16 * bar + variant,
      pitch: pitchSets[instrument][variant], velocity: 90, duration: 1,
    }))),
  }));
}

test("all four instruments can continue a synth-only source", async () => {
  let sent;
  const fetchImpl = async (_url, init) => {
    sent = JSON.parse(init.body);
    return { ok: true, json: async () => ({ status: "completed", output: [{
      type: "message", content: [{ type: "output_text", text: JSON.stringify({ candidates: modelCandidates() }) }],
    }] }) };
  };
  const result = await continueMelody(request(), { apiKey: "test", fetchImpl });
  assert.equal(sent.text.format.schema.properties.candidates.items.properties.notes.items.properties.trackId.type, "integer");
  assert.match(sent.instructions, /drums, bass, synth, and lead/);
  assert.equal(sent.max_output_tokens, 10000);
  assert.deepEqual(new Set(result.candidates[0].notes.map(note => note.trackId)), new Set([1, 2, 3, 4]));
  assert.equal(result.candidates[0].assessment, undefined);
});

test("rejects missing, duplicate, or unplayable tracks before model call", () => {
  const missing = request();
  missing.tracks.pop();
  assert.throws(() => validateRequest(missing), /Include drums/);
  const duplicate = request();
  duplicate.tracks[3].instrument = "synth";
  assert.throws(() => validateRequest(duplicate), /unique track/);
  const badPitch = request();
  badPitch.tracks[0].sourceNotes = [{ step: 0, pitch: 99, velocity: 90, duration: 1 }];
  assert.throws(() => validateRequest(badPitch), /playable range/);
  const empty = request();
  empty.tracks[2].sourceNotes = [];
  assert.throws(() => validateRequest(empty), /at least one note/);
});

test("rejects candidates that omit drums, target a wrong track, or repeat another candidate", () => {
  const input = validateRequest(request());
  const noDrums = modelCandidates();
  noDrums[0].notes = noDrums[0].notes.filter(note => note.trackId !== 1);
  assert.throws(() => validateCandidates({ candidates: noDrums }, input), /incomplete/);
  const missingBar = modelCandidates();
  missingBar[0].notes[0] = { trackId: 2, step: 17, pitch: 50, velocity: 90, duration: 1 };
  assert.throws(() => validateCandidates({ candidates: missingBar }, input), /Every instrument/);
  const wrongTrack = modelCandidates();
  wrongTrack[0].notes[0].trackId = 999;
  assert.throws(() => validateCandidates({ candidates: wrongTrack }, input), /invalid note/);
  const wrongPitch = modelCandidates();
  wrongPitch[0].notes[0].pitch = 60;
  assert.throws(() => validateCandidates({ candidates: wrongPitch }, input), /invalid note/);
  const identical = modelCandidates();
  identical[1].notes = identical[0].notes;
  assert.throws(() => validateCandidates({ candidates: identical }, input), /identical/);
});

test("invalid arrangement output is repaired once", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    const candidates = modelCandidates();
    if (calls === 1) candidates[0].notes = candidates[0].notes.filter(note => note.trackId !== 1);
    return { ok: true, json: async () => ({ status: "completed", output: [{
      type: "message", content: [{ type: "output_text", text: JSON.stringify({ candidates }) }],
    }] }) };
  };
  const result = await continueMelody(request(), { apiKey: "test", fetchImpl });
  assert.equal(calls, 2);
  assert.equal(result.candidates[0].notes.length, 16);
});

test("missing key remains a clear service error in arrangement mode", async () => {
  await assert.rejects(continueMelody(request(), { apiKey: "" }), error =>
    error instanceof MelodyServiceError && error.code === "AI_NOT_CONFIGURED");
});
