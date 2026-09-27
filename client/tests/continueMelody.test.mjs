import assert from 'node:assert/strict';
import test from 'node:test';
import { generateMelodyContinuations } from '../src/ai/continueMelody.ts';

const allowedPitches = [72, 71, 69, 67, 65, 64, 62, 60];

function phrase(sourceBar = 0, stepsPerBar = 16) {
  const start = sourceBar * stepsPerBar;
  return {
    sourceNotes: [
      { step: start, pitch: 64, velocity: 98, duration: 3 },
      { step: start + 4, pitch: 67, velocity: 90, duration: 2 },
      { step: start + 8, pitch: 69, velocity: 94, duration: 4 },
      { step: start + 12, pitch: 67, velocity: 88, duration: 3 },
    ].filter(note => note.step < start + stepsPerBar),
    sourceBar, stepsPerBar, tempoBpm: 110, allowedPitches,
  };
}

test('returns three distinct, editable four-bar proposals without changing the source', () => {
  const input = phrase();
  const before = structuredClone(input.sourceNotes);
  const proposals = generateMelodyContinuations(input);
  assert.equal(proposals.length, 3);
  assert.deepEqual(input.sourceNotes, before);
  assert.equal(new Set(proposals.map(p => JSON.stringify(p.notes))).size, 3);
  for (const proposal of proposals) {
    assert.ok(proposal.notes.length > 0);
    const seenSteps = new Set();
    for (const note of proposal.notes) {
      assert.ok(note.step >= 16 && note.step < 80);
      assert.ok(note.duration >= 1 && note.step + note.duration <= 80);
      assert.ok(allowedPitches.includes(note.pitch));
      assert.ok(note.velocity >= 1 && note.velocity <= 127);
      assert.ok(!seenSteps.has(note.step));
      seenSteps.add(note.step);
    }
    const bars = Array.from({ length: 4 }, (_, bar) => proposal.notes.filter(note =>
      note.step >= 16 + bar * 16 && note.step < 16 + (bar + 1) * 16
    ));
    // The first bar echoes the source; later bars develop it and close.
    assert.deepEqual(bars[0].map(note => note.step - 16), before.map(note => note.step));
    assert.notDeepEqual(bars[1].map(note => note.step - 32), before.map(note => note.step));
    assert.ok(bars[2].length > bars[0].length, 'the build should add rhythmic activity');
    assert.ok(bars[3].length < bars[2].length, 'the cadence should leave a breath');
    const final = bars[3].at(-1);
    assert.ok(final.duration >= 4 && final.step + final.duration === 80, 'the cadence should hold its final note');
  }
});

test('handles a later 7/8 bar and a sparse melody', () => {
  const sourceBar = 3, stepsPerBar = 14;
  const proposals = generateMelodyContinuations({
    sourceNotes: [{ step: 42, pitch: 72, velocity: 100, duration: 14 }],
    sourceBar, stepsPerBar, tempoBpm: 88, allowedPitches,
  });
  for (const proposal of proposals) {
    for (const note of proposal.notes) {
      assert.ok(note.step >= 56 && note.step + note.duration <= 112);
      assert.ok(allowedPitches.includes(note.pitch));
    }
  }
});

test('Try new ideas changes the phrase and empty source is rejected', () => {
  const input = phrase();
  const first = generateMelodyContinuations({ ...input, variationSeed: 0 });
  const second = generateMelodyContinuations({ ...input, variationSeed: 1 });
  assert.notDeepEqual(first[0].notes, second[0].notes);
  const sparse = {
    sourceNotes: [{ step: 15, pitch: 72, velocity: 100, duration: 1 }],
    sourceBar: 0, stepsPerBar: 16, tempoBpm: 180, allowedPitches,
  };
  const ideas = Array.from({ length: 20 }, (_, variationSeed) => generateMelodyContinuations({ ...sparse, variationSeed }));
  for (let candidate = 0; candidate < 3; candidate++) {
    assert.equal(new Set(ideas.map(idea => JSON.stringify(idea[candidate].notes))).size, 20);
  }
  assert.throws(() => generateMelodyContinuations({ ...input, sourceNotes: [] }), /Add at least one note/);
});
