import React from "react";

export const CELL_W = 30; // px per step cell
export const RULER_H = 28;

interface Props {
  totalSteps:  number;
  stepsPerBar: number;
  stepsPerBeat: number;
  activeStep:  number;   // -1 when not playing
  onAddBar:    () => void;
  patternName: string;
  numBars:     number;
  canRemoveBar: boolean;
  onRemoveBar: () => void;
}

export default function BeatRuler({
  totalSteps, stepsPerBar, stepsPerBeat, activeStep, onAddBar, patternName, numBars, canRemoveBar, onRemoveBar,
}: Props) {
  const totalW = totalSteps * CELL_W;

  return (
    <div
      className="relative select-none flex-shrink-0"
      style={{ width: totalW, height: RULER_H, backgroundColor: "#16161e", borderBottom: "1px solid #2a2a3a" }}
    >
      {/* Bar number labels + bar dividers */}
      {Array.from({ length: numBars }, (_, bar) => {
        const stepStart = bar * stepsPerBar;
        const x = stepStart * CELL_W;
        return (
          <React.Fragment key={bar}>
            {/* Bar divider */}
            <div
              className="absolute top-0 bottom-0"
              style={{ left: x, width: 1, backgroundColor: bar === 0 ? "#3a3a5a" : "#2d2d44" }}
            />
            {/* Bar number */}
            <div
              className="absolute top-0 flex items-center"
              style={{ left: x + 4, height: RULER_H, color: "#5a5a7a", fontSize: 10, fontFamily: "monospace", fontWeight: 600 }}
            >
              {bar + 1}
            </div>
            {/* Beat tick marks */}
            {Array.from({ length: Math.floor(stepsPerBar / stepsPerBeat) }, (_, beat) => {
              if (beat === 0) return null;
              const bx = (stepStart + beat * stepsPerBeat) * CELL_W;
              return (
                <div key={beat} className="absolute" style={{ left: bx, top: "60%", bottom: 0, width: 1, backgroundColor: "#222236" }} />
              );
            })}
          </React.Fragment>
        );
      })}

      {/* Playhead */}
      {activeStep >= 0 && (
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            left: activeStep * CELL_W,
            width: CELL_W,
            backgroundColor: "rgba(96,165,250,0.12)",
            borderLeft: "2px solid #60a5fa",
          }}
        />
      )}

      {/* Add/remove bar buttons at right end */}
      <div
        className="absolute top-0 flex items-center gap-1 px-1"
        style={{ right: -68, height: RULER_H }}
      >
        {canRemoveBar && (
          <button
            onClick={onRemoveBar}
            title="Remove last bar"
            className="text-xs rounded px-1.5 py-0.5 transition"
            style={{ backgroundColor: "#1e1e2a", color: "#6b7280", border: "1px solid #374151" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
          >
            −
          </button>
        )}
        <button
          onClick={onAddBar}
          title="Add bar"
          className="text-xs rounded px-1.5 py-0.5 transition"
          style={{ backgroundColor: "#1e1e2a", color: "#6b7280", border: "1px solid #374151" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#a5f3fc")}
          onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
        >
          + bar
        </button>
      </div>
    </div>
  );
}
