import React from "react";

export const CELL_W      = 30;  // px per step cell
export const RULER_H     = 28;
export const GRID_LABEL_W = 38; // matches label column width in DrumGrid / StepGrid

interface Props {
  totalSteps:   number;
  stepsPerBar:  number;
  stepsPerBeat: number;
  activeStep:   number;
  numBars:      number;
  canRemoveBar: boolean;
  onAddBar:     () => void;
  onRemoveBar:  () => void;
  patternName:  string;
}

export default function BeatRuler({
  totalSteps, stepsPerBar, stepsPerBeat, activeStep,
  numBars, canRemoveBar, onAddBar, onRemoveBar,
}: Props) {
  const totalW = totalSteps * CELL_W + GRID_LABEL_W;

  return (
    <div
      className="relative select-none flex-shrink-0"
      style={{ width: totalW, height: RULER_H, backgroundColor: "#16161e", borderBottom: "1px solid #2a2a3a" }}
    >
      {/* Bar numbers and beat ticks — offset by GRID_LABEL_W to align with cells */}
      {Array.from({ length: numBars }, (_, bar) => {
        const x = GRID_LABEL_W + bar * stepsPerBar * CELL_W;
        return (
          <React.Fragment key={bar}>
            <div className="absolute top-0 bottom-0" style={{ left: x, width: 1, backgroundColor: bar === 0 ? "#3a3a5a" : "#2d2d44" }} />
            <div
              className="absolute top-0 flex items-center"
              style={{ left: x + 4, height: RULER_H, color: "#5a5a7a", fontSize: 10, fontFamily: "monospace", fontWeight: 600 }}
            >
              {bar + 1}
            </div>
            {Array.from({ length: Math.floor(stepsPerBar / stepsPerBeat) }, (_, beat) => {
              if (beat === 0) return null;
              const bx = GRID_LABEL_W + (bar * stepsPerBar + beat * stepsPerBeat) * CELL_W;
              return <div key={beat} className="absolute" style={{ left: bx, top: "60%", bottom: 0, width: 1, backgroundColor: "#222236" }} />;
            })}
          </React.Fragment>
        );
      })}

      {/* Playhead */}
      {activeStep >= 0 && (
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            left: GRID_LABEL_W + activeStep * CELL_W,
            width: CELL_W,
            backgroundColor: "rgba(96,165,250,0.12)",
            borderLeft: "2px solid #60a5fa",
          }}
        />
      )}

      {/* + / − bar buttons */}
      <div className="absolute top-0 flex items-center gap-1 px-1" style={{ right: -68, height: RULER_H }}>
        {canRemoveBar && (
          <button
            onClick={onRemoveBar}
            className="text-xs rounded px-1.5 py-0.5 transition"
            style={{ backgroundColor: "#1e1e2a", color: "#6b7280", border: "1px solid #374151" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
          >−</button>
        )}
        <button
          onClick={onAddBar}
          className="text-xs rounded px-1.5 py-0.5 transition"
          style={{ backgroundColor: "#1e1e2a", color: "#6b7280", border: "1px solid #374151" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#a5f3fc")}
          onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
        >+ bar</button>
      </div>
    </div>
  );
}
