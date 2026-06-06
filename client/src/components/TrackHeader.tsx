import React, { useState } from "react";
import type { Track } from "../spacetime/client";

const INSTRUMENT_CFG: Record<string, { emoji: string; label: string }> = {
  drums: { emoji: "🥁", label: "Drums" },
  bass:  { emoji: "🎸", label: "Bass" },
  synth: { emoji: "🎹", label: "Synth" },
  lead:  { emoji: "🎺", label: "Lead" },
};

interface Props {
  track:           Track;
  isOwn:           boolean;
  ownerName?:      string;
  isActive:        boolean;
  onToggleMute:    () => void;
  onVolumeChange:  (vol: number) => void;
  onRemove:        () => void;
  onClick:         () => void;
}

export const HEADER_W = 196;

export default function TrackHeader({
  track, isOwn, ownerName, isActive,
  onToggleMute, onVolumeChange, onRemove, onClick,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const cfg = INSTRUMENT_CFG[track.instrument] ?? { emoji: "🎵", label: track.instrument };

  return (
    <div
      className="relative flex flex-col justify-center px-3 py-2 cursor-pointer select-none transition-colors"
      style={{
        width: HEADER_W,
        borderLeft: `3px solid ${track.color}`,
        backgroundColor: isActive ? "#22223a" : hovered ? "#1e1e30" : "#181825",
        borderBottom: "1px solid #1a1a28",
        height: "100%",
        minHeight: 56,
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Remove button — always visible at top-right */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="absolute flex items-center justify-center transition"
        style={{ top: 4, right: 4, width: 14, height: 14, borderRadius: 3, backgroundColor: "#1a1a28", color: "#3a3a5a", fontSize: 8, border: "1px solid #2a2a3a" }}
        onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.backgroundColor = "#2a1a1a"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#3a3a5a"; e.currentTarget.style.backgroundColor = "#1a1a28"; }}
        title="Remove track"
      >
        ✕
      </button>

      {/* Top row: icon + name + mute */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base leading-none flex-shrink-0">{cfg.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold leading-tight truncate" style={{ color: "#d4d4e8" }}>
            {cfg.label}
          </div>
          <div className="text-xs leading-tight truncate" style={{ color: track.color + "bb", fontSize: 10 }}>
            {ownerName ?? (isOwn ? "you" : "")}
          </div>
        </div>

        {/* Mute button */}
        <button
          onClick={e => { e.stopPropagation(); onToggleMute(); }}
          className="w-6 h-6 rounded text-xs font-bold flex-shrink-0 flex items-center justify-center transition"
          style={{
            backgroundColor: track.isMuted ? "#7f1d1d" : "#2a2a3a",
            color: track.isMuted ? "#fca5a5" : "#5a5a7a",
            border: `1px solid ${track.isMuted ? "#ef4444" : "#3a3a4a"}`,
            fontSize: 9,
          }}
          title={track.isMuted ? "Unmute" : "Mute"}
        >
          M
        </button>
      </div>

      {/* Volume slider */}
      <div className="flex items-center gap-1.5">
        <svg className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "#4a4a6a" }} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a1 1 0 011 1v12a1 1 0 01-2 0V2a1 1 0 011-1z"/>
          <path d="M3 6a1 1 0 011 1v6a1 1 0 01-2 0V7a1 1 0 011-1z" opacity=".5"/>
          <path d="M13 4a1 1 0 011 1v8a1 1 0 01-2 0V5a1 1 0 011-1z" opacity=".5"/>
        </svg>
        <input
          type="range" min={0} max={100}
          value={Math.round(track.volume * 100)}
          className="flex-1 h-1"
          style={{ accentColor: track.color }}
          onClick={e => e.stopPropagation()}
          onChange={e => onVolumeChange(Number(e.target.value) / 100)}
        />
        <span className="text-xs font-mono flex-shrink-0" style={{ color: "#5a5a7a", fontSize: 9, minWidth: 22, textAlign: "right" }}>
          {Math.round(track.volume * 100)}
        </span>
      </div>
    </div>
  );
}
