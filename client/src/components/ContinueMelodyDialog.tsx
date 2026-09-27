import { useEffect, useRef, useState } from "react";
import type { MelodyContinuation } from "../ai/continueMelody";
import "./ContinueMelodyDialog.css";

interface Props {
  trackName: string;
  sourceBar: number;
  stepsPerBar: number;
  sourceNoteCount: number;
  patternUseCount: number;
  candidates: MelodyContinuation[];
  isGenerating: boolean;
  isApplying: boolean;
  playingCandidateId: string | null;
  error?: string;
  disabledReason?: string;
  onGenerate: () => void;
  onPreview: (candidate: MelodyContinuation) => void;
  onStopPreview: () => void;
  onApply: (candidate: MelodyContinuation) => void;
  onClose: () => void;
}

const BAR_COUNT = 4;

function MiniRoll({ candidate, sourceBar, stepsPerBar }: {
  candidate: MelodyContinuation;
  sourceBar: number;
  stepsPerBar: number;
}) {
  const startStep = (sourceBar + 1) * stepsPerBar;
  const totalSteps = BAR_COUNT * stepsPerBar;
  const pitches = candidate.notes.map(note => note.pitch);
  const low = pitches.length ? Math.min(...pitches) - 1 : 59;
  const high = pitches.length ? Math.max(...pitches) + 1 : 72;
  const pitchRange = Math.max(8, high - low + 1);

  return (
    <div className="melody-mini-roll" aria-label={`${candidate.notes.length} notes over four bars`} role="img">
      {Array.from({ length: BAR_COUNT - 1 }, (_, index) => (
        <span key={index} className="melody-mini-roll-bar" style={{ left: `${((index + 1) / BAR_COUNT) * 100}%` }} />
      ))}
      {candidate.notes.map((note, index) => {
        const relativeStep = note.step - startStep;
        if (relativeStep >= totalSteps || relativeStep + note.duration <= 0) return null;
        const left = Math.max(0, relativeStep);
        const right = Math.min(totalSteps, relativeStep + Math.max(1, note.duration));
        return (
          <span
            key={`${note.step}-${note.pitch}-${index}`}
            className="melody-mini-roll-note"
            style={{
              left: `${(left / totalSteps) * 100}%`,
              width: `${Math.max(0.7, ((right - left) / totalSteps) * 100)}%`,
              top: `${Math.max(3, Math.min(89, ((high - note.pitch) / pitchRange) * 88 + 3))}%`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function ContinueMelodyDialog({
  trackName, sourceBar, stepsPerBar, sourceNoteCount, patternUseCount, candidates,
  isGenerating, isApplying, playingCandidateId, error, disabledReason,
  onGenerate, onPreview, onStopPreview, onApply, onClose,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const busyRef = useRef(isGenerating || isApplying);
  busyRef.current = isGenerating || isApplying;

  useEffect(() => {
    if (!candidates.some(candidate => candidate.id === selectedId)) {
      setSelectedId(candidates[0]?.id ?? null);
    }
  }, [candidates, selectedId]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    headingRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busyRef.current) onClose();
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const selected = candidates.find(candidate => candidate.id === selectedId) ?? null;
  const busy = isGenerating || isApplying;
  const cannotGenerate = busy || !!disabledReason || sourceNoteCount === 0;
  const sourceBarNumber = sourceBar + 1;

  return (
    <div className="melody-dialog-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <div ref={dialogRef} className="melody-dialog" role="dialog" aria-modal="true" aria-labelledby="melody-dialog-title" aria-describedby="melody-dialog-description">
        <div className="melody-dialog-header">
          <div>
            <div className="melody-dialog-eyebrow"><span aria-hidden="true">✦</span> Melody ideas</div>
            <h2 ref={headingRef} tabIndex={-1} id="melody-dialog-title">Continue my melody</h2>
            <p id="melody-dialog-description">Hear how the bar you wrote could grow into a longer phrase.</p>
          </div>
          <button type="button" className="melody-dialog-close" aria-label="Close melody suggestions" onClick={onClose} disabled={busy}>×</button>
        </div>

        <div className="melody-source-summary">
          <span className="melody-source-icon" aria-hidden="true">♫</span>
          <div className="melody-source-text">
            <strong>{trackName}</strong>
            <span>Bar {sourceBarNumber} · {sourceNoteCount} {sourceNoteCount === 1 ? "note" : "notes"}</span>
          </div>
          <span className="melody-source-arrow" aria-hidden="true">→</span>
          <div className="melody-source-text melody-source-target">
            <strong>Continue</strong>
            <span>Bars {sourceBarNumber + 1}–{sourceBarNumber + BAR_COUNT}</span>
          </div>
        </div>

        <p className="melody-original-note">Your original bar stays as it is. Suggestions stay private until you apply one; you can keep editing the added notes in the grid.</p>
        {patternUseCount > 1 && <p className="melody-dialog-warning" role="status">This pattern appears {patternUseCount} times in the song. Applying a continuation will extend every occurrence.</p>}

        {disabledReason && <p className="melody-dialog-warning" role="status">{disabledReason}</p>}
        {!disabledReason && sourceNoteCount === 0 && <p className="melody-dialog-warning" role="status">Add at least one note to bar {sourceBarNumber} before continuing.</p>}
        {error && <p className="melody-dialog-error" role="alert">{error}</p>}

        <div className="melody-options-heading">
          <strong>{candidates.length ? "Choose a direction" : "Ready when you are"}</strong>
          {candidates.length > 0 && <span>{candidates.length} variations</span>}
        </div>

        {candidates.length === 0 ? (
          <div className="melody-empty-state">
            <span aria-hidden="true">♬</span>
            <p>Start with your idea. We’ll sketch the next four bars so you can hear the phrase take shape.</p>
          </div>
        ) : (
          <div className="melody-candidate-list" role="group" aria-label="Melody variations">
            {candidates.map((candidate, index) => {
              const isSelected = selectedId === candidate.id;
              const isPlaying = playingCandidateId === candidate.id;
              return (
                <div key={candidate.id} className={`melody-candidate ${isSelected ? "is-selected" : ""}`}>
                  <button type="button" className="melody-candidate-select" onClick={() => {
                    if (playingCandidateId && !isPlaying) onStopPreview();
                    setSelectedId(candidate.id);
                  }} aria-pressed={isSelected} disabled={busy}>
                    <span className="melody-candidate-number">0{index + 1}</span>
                    <span className="melody-candidate-copy"><strong>{candidate.label}</strong><span>{candidate.description}</span></span>
                    <span className="melody-candidate-check" aria-hidden="true">{isSelected ? "✓" : ""}</span>
                  </button>
                  <MiniRoll candidate={candidate} sourceBar={sourceBar} stepsPerBar={stepsPerBar} />
                  <div className="melody-candidate-actions">
                    <span>{candidate.notes.length} notes · 4 bars</span>
                    <button type="button" onClick={() => isPlaying ? onStopPreview() : onPreview(candidate)} disabled={busy} aria-label={`${isPlaying ? "Stop previewing" : "Preview"} ${candidate.label}`}>
                      <span aria-hidden="true">{isPlaying ? "■" : "▶"}</span> {isPlaying ? "Stop" : "Listen"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="melody-dialog-footer">
          <button type="button" className="melody-secondary-button" onClick={() => {
            if (playingCandidateId) onStopPreview();
            onGenerate();
          }} disabled={cannotGenerate}>{isGenerating ? "Creating…" : candidates.length ? "Try new ideas" : "Create suggestions"}</button>
          <button type="button" className="melody-primary-button" onClick={() => selected && onApply(selected)} disabled={!selected || busy || !!disabledReason}>
            {isApplying ? "Adding notes…" : "Apply selected"}
          </button>
        </div>
      </div>
    </div>
  );
}
