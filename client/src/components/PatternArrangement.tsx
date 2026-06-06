import React, { useState, useRef, useEffect } from "react";
import type { Pattern, ArrangementBlock } from "../spacetime/client";

interface Props {
  patterns:        Pattern[];
  arrangement:     ArrangementBlock[];
  activePatternId: number | null;
  playingBlockIdx: number;
  onSelectPattern: (patternId: number) => void;
  onAddBlock:      (patternId: number) => void;
  onRemoveBlock:   (blockId: number) => void;
  onCreatePattern: () => void;
}

export default function PatternArrangement({
  patterns, arrangement, activePatternId, playingBlockIdx,
  onSelectPattern, onAddBlock, onRemoveBlock, onCreatePattern,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const sorted = [...arrangement].sort((a, b) => a.position - b.position);

  return (
    <div
      style={{
        backgroundColor: "#111118",
        borderBottom: "1px solid #2a2a3a",
        padding: "5px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
        minHeight: 42,
      }}
    >
      {/* Label */}
      <span style={{ fontSize: 9, color: "#3a3a5a", textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 }}>
        Song
      </span>

      {/* Scrollable blocks */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          flex: 1,
          overflowX: "auto",
          padding: "2px 0",
        }}
      >
        {sorted.length === 0 && (
          <span style={{ fontSize: 10, color: "#3a3a5a", fontStyle: "italic" }}>
            Press + to add sections
          </span>
        )}

        {sorted.map((block, idx) => {
          const pat       = patterns.find(p => p.patternId === block.patternId);
          if (!pat) return null;
          const isPlaying = idx === playingBlockIdx;
          const isEditing = block.patternId === activePatternId;

          return (
            <div
              key={block.blockId}
              onClick={() => onSelectPattern(block.patternId)}
              style={{
                position: "relative",
                flexShrink: 0,
                cursor: "pointer",
                borderRadius: 5,
                padding: "4px 10px 4px 8px",
                minWidth: 60,
                backgroundColor: pat.color + "18",
                border: `1.5px solid ${isEditing ? pat.color : pat.color + "40"}`,
                boxShadow: isPlaying ? `0 0 10px ${pat.color}60` : isEditing ? `0 0 6px ${pat.color}30` : undefined,
                transition: "border-color 0.15s",
                userSelect: "none",
              }}
            >
              {isPlaying && (
                <span
                  style={{
                    position: "absolute",
                    top: 5, left: 5,
                    width: 5, height: 5,
                    borderRadius: "50%",
                    backgroundColor: pat.color,
                    animation: "pulse 1s infinite",
                  }}
                />
              )}
              <div style={{ fontSize: 11, fontWeight: 600, color: pat.color, paddingLeft: isPlaying ? 8 : 0 }}>
                {pat.name}
              </div>
              {/* Remove ×  */}
              <button
                onClick={e => { e.stopPropagation(); onRemoveBlock(block.blockId); }}
                style={{
                  position: "absolute",
                  top: -5, right: -5,
                  width: 14, height: 14,
                  borderRadius: "50%",
                  backgroundColor: "#0e0e14",
                  border: "1px solid #2a2a3a",
                  color: "#4a4a6a",
                  fontSize: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                onMouseLeave={e => (e.currentTarget.style.color = "#4a4a6a")}
                title="Remove"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* + button (outside scrollable area — no clipping) */}
      <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setShowMenu(v => !v)}
          style={{
            width: 28, height: 28,
            borderRadius: 6,
            backgroundColor: showMenu ? "#1e1e2e" : "#14141e",
            border: "1px dashed #2a2a4a",
            color: "#5a5a8a",
            cursor: "pointer",
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#a0a0d0"; e.currentTarget.style.borderColor = "#4a4a7a"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#5a5a8a"; e.currentTarget.style.borderColor = "#2a2a4a"; }}
          title="Add section"
        >
          +
        </button>

        {showMenu && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              right: 0,
              backgroundColor: "#14141e",
              border: "1px solid #2a2a3a",
              borderRadius: 8,
              boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
              minWidth: 140,
              zIndex: 50,
              overflow: "hidden",
            }}
          >
            {patterns.map(p => (
              <button
                key={p.patternId}
                onClick={() => { onAddBlock(p.patternId); setShowMenu(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "8px 12px",
                  background: "none", border: "none", cursor: "pointer",
                  textAlign: "left", fontSize: 12,
                  transition: "background-color 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#1e1e2e")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color, flexShrink: 0 }} />
                <span style={{ color: "#c0c0d8", fontWeight: 500 }}>{p.name}</span>
              </button>
            ))}
            <div style={{ borderTop: "1px solid #2a2a3a" }} />
            <button
              onClick={() => { onCreatePattern(); setShowMenu(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "8px 12px",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 12, color: "#60a5fa", textAlign: "left",
                transition: "background-color 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#1e1e2e")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span style={{ fontSize: 13 }}>✦</span>
              <span>New Pattern</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
