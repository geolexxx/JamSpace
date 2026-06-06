import React from "react";
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
  onToggle:       (step: number, pitch: number) => void;
}

export default function StepGrid({
  instrument, notes, color, activeStep, totalSteps, stepsPerBar, stepsPerBeat,
  myIdentity, identityToName, onToggle,
}: Props) {
  const pitches = INSTRUMENT_PITCHES[instrument] ?? INSTRUMENT_PITCHES.synth;
  const noteMap = new Map(notes.map(n => [`${n.step}-${n.pitch}`, n]));

  return (
    <div style={{ width: totalSteps * CELL_W + GRID_LABEL_W }}>
      {pitches.map(pitch => {
        const isBlack = BLACK_KEYS.has(pitch);
        const label   = Tone.Frequency(pitch, "midi").toNote();
        const rowH    = isBlack ? 20 : 24;

        return (
          <div key={pitch} className="flex items-center" style={{ height: rowH, borderBottom: "1px solid #14141e" }}>
            {/* Pitch label — sticky */}
            <div
              className="flex-shrink-0 flex items-center justify-end pr-1.5"
              style={{
                width: GRID_LABEL_W,
                position: "sticky",
                left: 196,
                zIndex: 3,
                backgroundColor: isBlack ? "#141420" : "#181825",
                height: "100%",
                borderRight: "1px solid #222232",
                color: isBlack ? "#4a4a6a" : "#606078",
                fontSize: 9,
                fontFamily: "monospace",
              }}
            >
              {label}
            </div>

            {/* Steps */}
            <div className="flex" style={{ gap: 1, paddingLeft: 2 }}>
              {Array.from({ length: totalSteps }, (_, step) => {
                const key      = `${step}-${pitch}`;
                const note     = noteMap.get(key);
                const isOn     = !!note;
                const isPlayhead = step === activeStep;
                const beatIdx    = Math.floor((step % stepsPerBar) / stepsPerBeat);
                const isBarStart = step % stepsPerBar === 0 && step > 0;

                const creator = note ? note.creatorIdentity.toHexString() : "";
                const nColor  = isOn ? creatorColor(creator) : undefined;
                const isMe    = creator === myIdentity;
                const tooltip = isOn
                  ? `by ${identityToName.get(creator) ?? (isMe ? "you" : "unknown")}`
                  : undefined;

                return (
                  <button
                    key={step}
                    title={tooltip}
                    onClick={() => onToggle(step, pitch)}
                    style={{
                      width: CELL_W - 1,
                      height: rowH - 2,
                      flexShrink: 0,
                      borderRadius: 2,
                      cursor: "pointer",
                      backgroundColor: isOn
                        ? isPlayhead ? lighten(nColor!, 0.2) : nColor
                        : isPlayhead
                          ? "#2e3050"
                          : isBlack
                            ? (beatIdx % 2 === 0 ? "#181820" : "#141418")
                            : (beatIdx % 2 === 0 ? "#1e1e2c" : "#1a1a24"),
                      boxShadow: isOn ? `0 0 5px ${nColor}50` : undefined,
                      border: isBarStart
                        ? `1px solid ${isOn ? nColor + "cc" : "#333348"}`
                        : `1px solid ${isOn ? nColor + "60" : "#1e1e2a"}`,
                      marginLeft: isBarStart ? 3 : 0,
                      transition: "background-color 0.06s",
                    }}
                  />
                );
              })}
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
