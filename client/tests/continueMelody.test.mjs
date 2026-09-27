import assert from 'node:assert/strict';
import test from 'node:test';
import { generateMelodyContinuations, validateMelodyResponse } from '../src/ai/continueMelody.ts';

const tracks = [
  { trackId: 1, instrument: 'drums', allowedPitches: [36, 38], sourceNotes: [{ step: 16, pitch: 36, velocity: 100, duration: 1 }], previousNotes: [] },
  { trackId: 2, instrument: 'bass', allowedPitches: [36, 38], sourceNotes: [], previousNotes: [{ step: 0, pitch: 36, velocity: 90, duration: 4 }] },
  { trackId: 3, instrument: 'synth', allowedPitches: [60, 64], sourceNotes: [{ step: 20, pitch: 64, velocity: 90, duration: 2 }], previousNotes: [] },
  { trackId: 4, instrument: 'lead', allowedPitches: [60, 64], sourceNotes: [], previousNotes: [] },
];
const input = { tracks, sourceBar: 1, stepsPerBar: 16, tempoBpm: 110, variationSeed: 2, instruction: '  Make it dreamy  ' };
const notes = Array.from({ length: 4 }, (_, bar) => tracks.map(track => ({
  trackId: track.trackId, step: 32 + bar * 16,
  pitch: track.allowedPitches[0], velocity: 90, duration: track.instrument === 'drums' ? 1 : 4,
}))).flat();
const candidates = ['familiar', 'lift', 'answer'].map(id => ({
  id, label: id, description: 'A four-part idea', notes,
}));

test('request carries all four tracks, including drums and empty source tracks', async () => {
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
    const body = JSON.parse(request.options.body);
    assert.deepEqual(body.tracks, tracks);
    assert.equal(body.instruction, 'Make it dreamy');
    assert.deepEqual(result, candidates);
    assert.deepEqual(input, before);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects missing parts, unknown tracks, off-grid notes, and duplicate notes', () => {
  assert.deepEqual(validateMelodyResponse({ candidates }, input), candidates);
  const replace = replacement => ({ candidates: [{ ...candidates[0], notes: replacement }, candidates[1], candidates[2]] });
  assert.throws(() => validateMelodyResponse(replace(notes.filter(note => note.trackId !== 1)), input), /invalid idea|skipped an instrument/);
  assert.throws(() => validateMelodyResponse(replace(notes.map(note => note.trackId === 4 && note.step === 80 ? { ...note, trackId: 99 } : note)), input), /outside the playable/);
  assert.throws(() => validateMelodyResponse(replace(notes.map(note => note.trackId === 3 && note.step === 32 ? { ...note, pitch: 61 } : note)), input), /outside the playable/);
  assert.throws(() => validateMelodyResponse(replace([...notes, notes[0]]), input), /duplicate notes/);
  assert.throws(() => validateMelodyResponse(replace(notes.map(note => note.trackId === 1 && note.step === 32 ? { ...note, step: 16 } : note)), input), /outside the playable/);
});

test('does not send empty or spilling source to the service', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('fetch must not run'); };
  try {
    await assert.rejects(generateMelodyContinuations({ ...input, tracks: tracks.map(track => ({ ...track, sourceNotes: [] })) }), /Add at least one note/);
    await assert.rejects(generateMelodyContinuations({ ...input, tracks: tracks.map(track => track.trackId === 3
      ? { ...track, sourceNotes: [{ step: 31, pitch: 64, velocity: 90, duration: 2 }] } : track) }), /Finish notes within/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('reports service configuration errors without substituting local notes', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'AI_NOT_CONFIGURED', message: 'Set OPENAI_API_KEY to enable the melody agent.' } }), { status: 503 });
  try {
    await assert.rejects(generateMelodyContinuations(input), /Set OPENAI_API_KEY/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('passes AbortSignal through for closing or replacing a request', async () => {
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
