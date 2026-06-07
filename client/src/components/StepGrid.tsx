import React, { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import type { Note } from "../spacetime/client";
import { CELL_W, GRID_LABEL_W } from "./BeatRuler";

const USER_COLORS = ["#f97316","#3b82f6","#a855f7","#22c55e","#eab308","#ec4899","#06b6d4","#f43f5e"];
function creatorColor(hexId: string): string {
  let h = 0;
  for (let i = 0; i < hexId.length; i++) h = (h * 31 + hexId.charCodeAt(i)) & 0x7fffffff;
  return USER_COLORS[h % USER_COLORS.length];
}

function diatonicPitches(rootMidi: number): number[] {
  return [12, 11, 9, 7, 5, 4, 2, 0].map(i => rootMidi + i);
}

const INSTRUMENT_PITCHES: Record<string, number[]> = {
  bass:  diatonicPitches(48),
  synth: diatonicPitches(60),
  lead:  diatonicPitches(60),
};

const BLACK_KEYS = new Set([61,63,66,68,70, 49,51,54,56,58, 73,75,78,80,82]);

function noteLeft(step: number, stepsPerBar: number): number {
  return 2 + step * CELL_W + Math.floor(step / stepsPerBar) * 3;
}

function noteWidth(step: number, duration: number, stepsPerBar: number): number {
  return duration * CELL_W + (Math.floor((step + duration - 1) / stepsPerBar) - Math.floor(step / stepsPerBar)) * 3;
}

interface DragState { active: boolean; startStep: number; pitch: number; currentStep: number; }
interface Preview  { step: number; pitch: number; duration: number; }

interface Props {
  instrument:     string;
  trackId:        number;
  notes:          Note[];
  color:          string;
  activeStep:     number;
  totalSteps:     number;
  stepsPerBar:    number;
  stepsPerBeat:   number;
  myIdentity:     string;
  identityToName: Map<string, string>;
  onAddNote:      (step: number, pitch: number, duration: number) => void;
  onRemoveNote:   (step: number, pitch: number) => void;
}

export default function StepGrid({
  instrument, notes, color, activeStep, totalSteps, stepsPerBar, stepsPerBeat,
  myIdentity, identityToName, onAddNote, onRemoveNote,
}: Props) {
  const pitches  = INSTRUMENT_PITCHES[instrument] ?? INSTRUMENT_PITCHES.synth;
  const dragRef  = useRef<DragState>({ active: false, startStep: 0, pitch: 0, currentStep: 0 });
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    const onMouseUp = () => {
      if (!dragRef.current.active) return;
      const { startStep, pitch, currentStep } = dragRef.current;
      const duration = Math.max(1, currentStep - startStep + 1);
      dragRef.current.active = false;
      setPreview(null);
      onAddNote(startStep, pitch, duration);
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [onAddNote]);

  return (
    <div style={{ width: GRID_LABEL_W + 2 + totalSteps * CELL_W + Math.floor((totalSteps - 1) / stepsPerBar) * 3 }}>
      {pitches.map(pitch => {
        const isBlack  = BLACK_KEYS.has(pitch);
        const label    = Tone.Frequency(pitch, "midi").toNote();
        const rowH     = isBlack ? 20 : 24;
        const rowNotes = notes.filter(n => n.pitch === pitch);

        return (
          <div key={pitch} style={{ display: "flex", alignItems: "center", height: rowH, borderBottom: "1px solid #14141e" }}>
            {/* Pitch label */}
            <div
              style={{
                width: GRID_LABEL_W, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "flex-end",
                paddingRight: 6,
                position: "sticky", left: 196, zIndex: 3,
                backgroundColor: isBlack ? "#141420" : "#181825",
                height: "100%",
                borderRight: "1px solid #222232",
                color: isBlack ? "#4a4a6a" : "#606078",
                fontSize: 9, fontFamily: "monospace",
              }}
            >
              {label}
            </div>

            {/* Steps + note overlays */}
            <div style={{ position: "relative", height: rowH - 2, flex: 1 }}>
              {/* Background grid cells */}
              <div style={{ display: "flex", gap: 1, paddingLeft: 2 }}>
                {Array.from({ length: totalSteps }, (_, step) => {
                  const hasNote    = rowNotes.some(n => n.step <= step && step < n.step + n.duration);
                  const isPlayhead = step === activeStep;
                  const beatIdx    = Math.floor((step % stepsPerBar) / stepsPerBeat);
                  const isBarStart = step % stepsPerBar === 0 && step > 0;

                  return (
                    <div
                      key={step}
                      style={{
                        width: CELL_W - 1,
                        height: rowH - 4,
                        flexShrink: 0,
                        borderRadius: 2,
                        cursor: hasNote ? "pointer" : "crosshair",
                        backgroundColor: isPlayhead
                          ? "#2e3050"
                          : isBlack
                            ? (beatIdx % 2 === 0 ? "#181820" : "#141418")
                            : (beatIdx % 2 === 0 ? "#1e1e2c" : "#1a1a24"),
                        border: isBarStart
                          ? "1px solid #333348"
                          : "1px solid #1e1e2a",
                        marginLeft: isBarStart ? 3 : 0,
                      }}
                      onMouseDown={() => {
                        const noteAtStep = rowNotes.find(n => n.step === step);
                        if (noteAtStep) {
                          onRemoveNote(step, pitch);
                        } else if (!hasNote) {
                          dragRef.current = { active: true, startStep: step, pitch, currentStep: step };
                          setPreview({ step, pitch, duration: 1 });
                        }
                      }}
                      onMouseEnter={() => {
                        const d = dragRef.current;
                        if (d.active && d.pitch === pitch && step >= d.startStep) {
                          d.currentStep = step;
                          setPreview({ step: d.startStep, pitch, duration: step - d.startStep + 1 });
                        }
                      }}
                    />
                  );
                })}
              </div>

              {/* Note overlays */}
              {rowNotes.map(note => {
                const creator = note.creatorIdentity.toHexString();
                const nColor  = creatorColor(creator);
                const lit     = note.step <= activeStep && activeStep < note.step + note.duration;
                return (
                  <div
                    key={note.noteId}
                    title={`by ${identityToName.get(creator) ?? (creator === myIdentity ? "you" : "unknown")}`}
                    style={{
                      position: "absolute",
                      top: 1,
                      left: noteLeft(note.step, stepsPerBar),
                      width: noteWidth(note.step, note.duration, stepsPerBar),
                      height: rowH - 6,
                      borderRadius: 3,
                      backgroundColor: lit ? lighten(nColor, 0.2) : nColor,
                      boxShadow: `0 0 5px ${nColor}50`,
                      border: `1px solid ${nColor}cc`,
                      pointerEvents: "none",
                      zIndex: 2,
                    }}
                  />
                );
              })}

              {/* Drag preview */}
              {preview && preview.pitch === pitch && (
                <div
                  style={{
                    position: "absolute",
                    top: 1,
                    left: noteLeft(preview.step, stepsPerBar),
                    width: noteWidth(preview.step, preview.duration, stepsPerBar),
                    height: rowH - 6,
                    borderRadius: 3,
                    backgroundColor: `${color}50`,
                    border: `1px dashed ${color}`,
                    pointerEvents: "none",
                    zIndex: 3,
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
