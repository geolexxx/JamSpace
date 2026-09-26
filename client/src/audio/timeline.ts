import type { ArrangementBlock, Pattern } from "../spacetime/client";

export interface TimelineBlock {
  block: ArrangementBlock;
  startStep: number;
  steps: number;
  sortedIndex: number;
}

// Arrangement positions define order. Every block occupies its full pattern length,
// including blocks with no notes, so playback and export share the same clock.
export function buildTimeline(
  arrangement: ArrangementBlock[], patterns: Pattern[], stepsPerBar: number
): { blocks: TimelineBlock[]; totalSteps: number } {
  const patternById = new Map(patterns.map(pattern => [pattern.patternId, pattern]));
  const sorted = [...arrangement].sort((a, b) => a.position - b.position || a.blockId - b.blockId);
  const blocks: TimelineBlock[] = [];
  let totalSteps = 0;
  sorted.forEach((block, sortedIndex) => {
    const pattern = patternById.get(block.patternId);
    if (!pattern) return;
    const steps = Math.max(1, pattern.numBars) * stepsPerBar;
    blocks.push({ block, startStep: totalSteps, steps, sortedIndex });
    totalSteps += steps;
  });
  return { blocks, totalSteps };
}
