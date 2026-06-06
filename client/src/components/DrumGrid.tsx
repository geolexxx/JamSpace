import React from "react";
import { DRUM_PADS } from "../audio/instruments";
import type { Note } from "../spacetime/client";
import { CELL_W } from "./BeatRuler";

const USER_COLORS = ["#f97316","#3b82f6","#a855f7","#22c55e","#eab308","#ec4899","#06b6d4","#f43f5e"];
function creatorColor(hexId: string): string {
  let h = 0;
  for (let i = 0; i < hexId.length; i++) h = (h * 31 + hexId.charCodeAt(i)) & 0x7fffffff;
  return USER_COLORS[h % USER_COLORS.length];
}

const PAD_H  = 26;  // px per drum pad row
const LABEL_W = 36; // px for pad name on left of each row

interface Props {
  trackId:        number;
  notes:          Note[];
  trackColor:     string;
  activeStep:     number;
  totalSteps:     number;
  stepsPerBar:    number;
  stepsPerBeat:   number;
  myIdentity:     string;
  identityToName: Map<string, string>;
  onToggle:       (step: number, pitch: number) => void;
}

export default function DrumGrid({
  notes, trackColor, activeStep, totalSteps, stepsPerBar, stepsPerBeat,
  myIdentity, identityToName, onToggle,
}: Props) {
  const noteMap = new Map(notes.map(n => [`${n.step}-${n.pitch}`, n]));

  return (
    <div style={{ width: totalSteps * CELL_W }}>
      {DRUM_PADS.map(pad => (
        <div key={pad.pitch} className="flex items-center" style={{ height: PAD_H, borderBottom: "1px solid #16161e" }}>
          {/* Pad label — sticky left within the track row */}
          <div
            className="flex items-center gap-1 flex-shrink-0"
            style={{
              width: LABEL_W,
              position: "sticky",
              left: 196,  // HEADER_W
              zIndex: 3,
              backgroundColor: "#181825",
              height: "100%",
              paddingLeft: 6,
              borderRight: "1px solid #222232",
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pad.color }} />
            <span style={{ fontSize: 8, fontFamily: "monospace", color: "#4a4a6a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {pad.shortLabel}
            </span>
          </div>

          {/* Steps */}
          <div className="flex" style={{ gap: 1, paddingLeft: 2 }}>
            {Array.from({ length: totalSteps }, (_, step) => {
              const key        = `${step}-${pad.pitch}`;
              const note       = noteMap.get(key);
              const isOn       = !!note;
              const isPlayhead = step === activeStep;
              const beatIdx    = Math.floor((step % stepsPerBar) / stepsPerBeat);
              const isDownbeat = (step % stepsPerBar) % stepsPerBeat === 0;
              const isBarStart = step % stepsPerBar === 0 && step > 0;

              const creator = note ? note.creatorIdentity.toHexString() : "";
              const color   = isOn ? creatorColor(creator) : undefined;
              const isMe    = creator === myIdentity;
              const tooltip = isOn
                ? `by ${identityToName.get(creator) ?? (isMe ? "you" : "unknown")}`
                : undefined;

              return (
                <button
                  key={step}
                  title={tooltip}
                  onClick={() => onToggle(step, pad.pitch)}
                  style={{
                    width:  CELL_W - 1,
                    height: PAD_H - 2,
                    flexShrink: 0,
                    borderRadius: 3,
                    cursor: "pointer",
                    backgroundColor: isOn
                      ? isPlayhead ? lighten(color!, 0.2) : color
                      : isPlayhead
                        ? "#2e3050"
                        : beatIdx % 2 === 0 ? "#1e1e2c" : "#1a1a26",
                    boxShadow: isOn ? `0 0 6px ${color}60` : undefined,
                    border: isBarStart
                      ? `1px solid ${isOn ? color + "cc" : "#333348"}`
                      : isDownbeat
                        ? `1px solid ${isOn ? color + "80" : "#28283a"}`
                        : `1px solid ${isOn ? color + "60" : "#22222e"}`,
                    marginLeft: isBarStart ? 3 : 0,
                    transition: "background-color 0.06s",
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
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
