import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { continueMelody, MelodyServiceError, validateRequest, validateCandidates } from "./melody.js";
import { createMelodyServer } from "./server.js";

const baseRequest = () => ({
  sourceNotes: [
    { step: 0, pitch: 60, velocity: 100, duration: 2 },
    { step: 4, pitch: 64, velocity: 96, duration: 2 },
    { step: 8, pitch: 67, velocity: 96, duration: 2 },
  ],
  previousNotes: [], contextNotes: [], sourceBar: 0, stepsPerBar: 16,
  tempoBpm: 120, allowedPitches: [60, 62, 64, 65, 67, 69, 71, 72],
  variationSeed: 0, instruction: "Make it hopeful",
});

function modelCandidates() {
  return ["familiar", "lift", "answer"].map((id, style) => ({
    id, label: id, description: `A ${id} continuation.`, assessment: "Follows the source rhythm and direction.",
    notes: [0, 1, 2, 3].map(bar => ({
      step: 16 + bar * 16 + style,
      pitch: [60, 64, 67][style], velocity: 95, duration: 2,
    })),
  }));
}

function apiResponse(candidates) {
  return {
    status: "completed",
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ candidates }) }] }],
  };
}

test("validates and returns editable candidates without leaking assessment", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, json: async () => apiResponse(modelCandidates()) };
  };
  const result = await continueMelody(baseRequest(), { apiKey: "test-key", fetchImpl });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.openai.com/v1/responses");
  const requestBody = JSON.parse(calls[0].init.body);
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.max_output_tokens, 4000);
  assert.equal(requestBody.text.format.type, "json_schema");
  assert.equal(requestBody.model, "gpt-6-luna");
  assert.deepEqual(result.candidates.map(candidate => candidate.id), ["familiar", "lift", "answer"]);
  assert.equal(result.candidates[0].assessment, undefined);
});

test("repairs an invalid first model result exactly once", async () => {
  const prompts = [];
  const fetchImpl = async (_url, init) => {
    prompts.push(JSON.parse(init.body).input);
    const candidates = modelCandidates();
    if (prompts.length === 1) candidates[0].notes[0].pitch = 43;
    return { ok: true, json: async () => apiResponse(candidates) };
  };
  const result = await continueMelody(baseRequest(), { apiKey: "test-key", fetchImpl });
  assert.equal(prompts.length, 2);
  assert.match(prompts[1], /last result failed validation/);
  assert.equal(result.candidates.length, 3);
});

test("rejects invalid or identical candidate output", () => {
  const input = validateRequest(baseRequest());
  const badPitch = modelCandidates();
  badPitch[1].notes[1].pitch = 22;
  assert.throws(() => validateCandidates({ candidates: badPitch }, input), /invalid note/);
  const identical = modelCandidates();
  identical[1].notes = identical[0].notes;
  assert.throws(() => validateCandidates({ candidates: identical }, input), /identical/);
});

test("accepts same-onset harmonies and notes sustained across bars", () => {
  const input = validateRequest(baseRequest());
  const candidates = modelCandidates();
  candidates[0].notes[0].duration = 18;
  candidates[0].notes.push({ step: 16, pitch: 64, velocity: 90, duration: 1 });
  const valid = validateCandidates({ candidates }, input);
  assert.equal(valid[0].notes.length, 5);
});

test("blocks out-of-window context and malformed source before API call", async () => {
  let called = false;
  const fetchImpl = async () => { called = true; throw Error("should not call"); };
  const request = baseRequest();
  request.contextNotes = [{ step: 200, pitch: 60, velocity: 90, duration: 1 }];
  await assert.rejects(continueMelody(request, { apiKey: "test-key", fetchImpl }), error =>
    error instanceof MelodyServiceError && error.status === 400);
  assert.equal(called, false);
});

test("returns a clear unavailable error when no API key is configured", async () => {
  await assert.rejects(continueMelody(baseRequest(), { apiKey: "" }), error =>
    error instanceof MelodyServiceError && error.status === 503 && error.code === "AI_NOT_CONFIGURED");
});

test("does not retry an upstream authentication failure", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return { ok: false, status: 401 }; };
  await assert.rejects(continueMelody(baseRequest(), { apiKey: "wrong-key", fetchImpl }), error =>
    error instanceof MelodyServiceError && error.status === 503 && error.code === "AI_AUTH_FAILED");
  assert.equal(calls, 1);
});

let server;
let origin;
before(async () => {
  server = createMelodyServer({ apiKey: "test-key", fetchImpl: async () => ({ ok: true, json: async () => apiResponse(modelCandidates()) }) });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

test("HTTP endpoint returns the expected success and error envelopes", async () => {
  const success = await fetch(`${origin}/api/melody/continue`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(baseRequest()),
  });
  assert.equal(success.status, 200);
  assert.equal((await success.json()).candidates.length, 3);
  const error = await fetch(`${origin}/api/melody/continue`, {
    method: "POST", headers: { "content-type": "application/json" }, body: "{invalid",
  });
  assert.equal(error.status, 400);
  assert.equal((await error.json()).error.code, "INVALID_JSON");
});
