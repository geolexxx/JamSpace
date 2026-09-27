import assert from 'node:assert/strict';
import test from 'node:test';
import { generateMelodyContinuations, validateMelodyResponse } from '../src/ai/continueMelody.ts';

const allowedPitches = [72, 71, 69, 67, 65, 64, 62, 60];
const input = {
  sourceNotes: [
    { step: 16, pitch: 64, velocity: 98, duration: 3 },
    { step: 20, pitch: 67, velocity: 90, duration: 2 },
  ],
  previousNotes: [{ step: 0, pitch: 62, velocity: 88, duration: 4 }],
  contextNotes: [{ step: 16, pitch: 60, velocity: 78, duration: 4 }],
  sourceBar: 1,
  stepsPerBar: 16,
  tempoBpm: 110,
  allowedPitches,
  variationSeed: 2,
  instruction: '  Make it dreamy  ',
};
const candidates = [
  { id: 'familiar', label: 'Stay close', description: 'A gentle motif extension', notes: [{ step: 32, pitch: 64, velocity: 90, duration: 4 }] },
  { id: 'lift', label: 'Lift', description: 'A rising idea', notes: [{ step: 47, pitch: 67, velocity: 95, duration: 5 }, { step: 47, pitch: 72, velocity: 80, duration: 5 }] },
  { id: 'answer', label: 'Answer', description: 'A response and landing', notes: [{ step: 90, pitch: 60, velocity: 86, duration: 6 }] },
];

test('agent request includes the source, prior phrase, harmonic context, and user direction', async () => {
  const originalFetch = globalThis.fetch;
  const before = structuredClone(input);
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ candidates }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const result = await generateMelodyContinuations(input);
    assert.equal(request.url, '/api/melody/continue');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.headers['Content-Type'], 'application/json');
    const body = JSON.parse(request.options.body);
    assert.deepEqual(body.sourceNotes, input.sourceNotes);
    assert.deepEqual(body.previousNotes, input.previousNotes);
    assert.deepEqual(body.contextNotes, input.contextNotes);
    assert.equal(body.variationSeed, 2);
    assert.equal(body.instruction, 'Make it dreamy');
    assert.deepEqual(result, candidates);
    assert.deepEqual(input, before);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('accepts valid cross-bar sustains and simultaneous different pitches', () => {
  assert.deepEqual(validateMelodyResponse({ candidates }, input), candidates);
});

test('rejects model notes outside destination, off-grid, or duplicated', () => {
  const replaceNote = note => ({ candidates: [
    { ...candidates[0], notes: [note] }, candidates[1], candidates[2],
  ] });
  assert.throws(() => validateMelodyResponse(replaceNote({ step: 16, pitch: 64, velocity: 90, duration: 1 }), input), /outside the playable bars/);
  assert.throws(() => validateMelodyResponse(replaceNote({ step: 32, pitch: 63, velocity: 90, duration: 1 }), input), /outside the playable bars/);
  assert.throws(() => validateMelodyResponse(replaceNote({ step: 95, pitch: 64, velocity: 90, duration: 2 }), input), /outside the playable bars/);
  assert.throws(() => validateMelodyResponse({ candidates: [
    { ...candidates[0], notes: [candidates[0].notes[0], candidates[0].notes[0]] }, candidates[1], candidates[2],
  ] }, input), /duplicate notes/);
  assert.throws(() => validateMelodyResponse({ candidates: [candidates[0], candidates[0], candidates[2]] }, input), /invalid idea/);
});

test('does not call the service when source is empty or spills into target', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('fetch must not run'); };
  try {
    await assert.rejects(generateMelodyContinuations({ ...input, sourceNotes: [] }), /Add at least one note/);
    await assert.rejects(generateMelodyContinuations({ ...input, sourceNotes: [{ step: 31, pitch: 64, velocity: 90, duration: 2 }] }), /Finish notes within/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('reports service configuration errors and never substitutes local notes', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'AI_NOT_CONFIGURED', message: 'Set OPENAI_API_KEY to enable the melody agent.' } }), { status: 503 });
  try {
    await assert.rejects(generateMelodyContinuations(input), /Set OPENAI_API_KEY/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('passes AbortSignal to fetch for closing or replacing a request', async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  globalThis.fetch = async (_, options) => {
    assert.equal(options.signal, controller.signal);
    controller.abort();
    throw new DOMException('Aborted', 'AbortError');
  };
  try {
    await assert.rejects(generateMelodyContinuations(input, { signal: controller.signal }), { name: 'AbortError' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
