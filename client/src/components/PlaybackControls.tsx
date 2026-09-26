import React, { useState, useRef, useEffect } from "react";
import { DEMO_PATTERNS, type DemoPattern } from "../audio/demos";
import type { UserPresence, Track } from "../spacetime/client";

interface Props {
  isPlaying:       boolean;
  tempoBpm:        number;
  sessionName:     string;
  activeStep:      number;
  stepsPerBeat:    number;
  timeSigTop:      number;
  timeSigBottom:   number;
  users:           UserPresence[];
  tracks:          Track[];
  myIdentity:      string;
  playbackMode:    "personal" | "sync";
  onTogglePlay:    () => void;
  onBpmChange:     (bpm: number) => void;
  onTimeSigChange: (top: number, bottom: number) => void;
  onLoadDemo:      (demo: DemoPattern) => void;
  onToggleMode:    () => void;
  onBackToHome:    () => void;
  onShare:         () => void;
  onExport:        () => void;
}

const TIME_SIGS = [
  { top: 3, bottom: 4, label: "3/4" },
  { top: 4, bottom: 4, label: "4/4" },
  { top: 6, bottom: 8, label: "6/8" },
  { top: 5, bottom: 4, label: "5/4" },
  { top: 7, bottom: 8, label: "7/8" },
];

const USER_COLORS = ["#f97316","#3b82f6","#a855f7","#22c55e","#eab308","#ec4899","#06b6d4","#f43f5e"];
function userColor(hexId: string) {
  let h = 0;
  for (let i = 0; i < hexId.length; i++) h = (h * 31 + hexId.charCodeAt(i)) & 0x7fffffff;
  return USER_COLORS[h % USER_COLORS.length];
}

export default function PlaybackControls({
  isPlaying, tempoBpm, sessionName, activeStep, stepsPerBeat,
  timeSigTop, timeSigBottom, users, tracks, myIdentity,
  playbackMode, onTogglePlay, onBpmChange, onTimeSigChange, onLoadDemo, onToggleMode,
  onBackToHome, onShare, onExport,
}: Props) {
  const [showDemoMenu, setShowDemoMenu]   = useState(false);
  const [showTimeSig,  setShowTimeSig]    = useState(false);
  const [editingBpm,   setEditingBpm]     = useState(false);
  const [bpmInput,     setBpmInput]       = useState(String(tempoBpm));
  const [pendingBpm,   setPendingBpm]     = useState<number | null>(null);
  const demoRef    = useRef<HTMLDivElement>(null);
  const timeSigRef = useRef<HTMLDivElement>(null);
  const bpmInputRef = useRef<HTMLInputElement>(null);

  const beat = activeStep >= 0 ? Math.floor(activeStep / stepsPerBeat) + 1 : 1;
  const sub  = activeStep >= 0 ? (activeStep % stepsPerBeat) + 1 : 1;

  // Sync display when server confirms or another user changes BPM
  useEffect(() => {
    if (!editingBpm) {
      setBpmInput(String(tempoBpm));
      setPendingBpm(null);
    }
  }, [tempoBpm]);

  // Optimistic display: show pending value immediately while waiting for server
  const displayBpm = pendingBpm ?? tempoBpm;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (demoRef.current    && !demoRef.current.contains(e.target as Node))    setShowDemoMenu(false);
      if (timeSigRef.current && !timeSigRef.current.contains(e.target as Node)) setShowTimeSig(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Called only via onBlur — avoids double-fire from Enter+blur
  const commitBpm = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 40 && n <= 240) {
      setPendingBpm(n);
      onBpmChange(n);
      setBpmInput(String(n));
    } else {
      setBpmInput(String(displayBpm)); // reset to current if invalid
    }
    setEditingBpm(false);
  };

  return (
    <div
      className="transport-bar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 12px",
        height: 52,
        backgroundColor: "#111118",
        borderBottom: "1px solid #2a2a3a",
        flexShrink: 0,
        flexWrap: "nowrap",
        position: "relative",
        zIndex: 50,
      }}
    >
      {/* Back to home */}
      <button
        className="transport-home"
        onClick={onBackToHome}
        title="Back to projects"
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 6, cursor: "pointer",
          backgroundColor: "#14141e", color: "#5a5a7a",
          border: "1px solid #2a2a3a", fontSize: 12, flexShrink: 0,
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#a0a0c0"; e.currentTarget.style.borderColor = "#4a4a6a"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#5a5a7a"; e.currentTarget.style.borderColor = "#2a2a3a"; }}
      >
        ← Home
      </button>

      {/* Logo */}
      <div className="transport-logo" style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 18 }}>🎵</span>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0f0" }}>JamSpace</div>
      </div>

      {/* Separator */}
      <div className="transport-separator" style={{ width: 1, height: 28, backgroundColor: "#2a2a3a", flexShrink: 0 }} />

      {/* Rewind */}
      <button
        className="transport-rewind"
        onClick={() => {}}
        style={{ ...btnBase, fontSize: 13, color: "#606080" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#c0c0e0")}
        onMouseLeave={e => (e.currentTarget.style.color = "#606080")}
      >
        ⏮
      </button>

      {/* Play/Stop */}
      <button
        className="transport-play"
        onClick={onTogglePlay}
        style={{
          width: 38, height: 38, borderRadius: "50%", border: "none",
          cursor: "pointer", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: "bold", color: "white",
          background: isPlaying
            ? "linear-gradient(135deg, #dc2626, #b91c1c)"
            : "linear-gradient(135deg, #16a34a, #15803d)",
          boxShadow: isPlaying ? "0 0 14px #dc262640" : "0 0 14px #16a34a40",
          transition: "all 0.15s",
        }}
      >
        {isPlaying ? "■" : "▶"}
      </button>

      {/* Position counter (LCD style) */}
      <div
        className="transport-counter"
        style={{
          fontFamily: "monospace", fontSize: 13, color: "#60a5fa",
          backgroundColor: "#0a0a12", border: "1px solid #1e2a4a",
          borderRadius: 6, padding: "4px 10px", flexShrink: 0,
          minWidth: 52, textAlign: "center", letterSpacing: "0.05em",
        }}
      >
        {beat}<span style={{ color: "#2a4a7a" }}>.</span>{sub}
      </div>

      {/* Separator */}
      <div className="transport-separator" style={{ width: 1, height: 28, backgroundColor: "#2a2a3a", flexShrink: 0 }} />

      {/* BPM */}
      <div className="transport-bpm" style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: "#5a5a7a", textTransform: "uppercase", letterSpacing: "0.08em" }}>BPM</span>
        {editingBpm ? (
          <input
            ref={bpmInputRef}
            autoFocus
            value={bpmInput}
            onChange={e => setBpmInput(e.target.value)}
            onBlur={e => commitBpm(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); bpmInputRef.current?.blur(); }
              if (e.key === "Escape") { setBpmInput(String(displayBpm)); setEditingBpm(false); }
            }}
            style={{
              width: 52, fontFamily: "monospace", fontSize: 13, textAlign: "center",
              borderRadius: 5, padding: "3px 6px", outline: "none",
              backgroundColor: "#0a0a12", color: "white", border: "1px solid #4060a0",
            }}
          />
        ) : (
          <div
            onClick={() => { setBpmInput(String(displayBpm)); setEditingBpm(true); }}
            style={{
              fontFamily: "monospace", fontSize: 13, color: "white",
              backgroundColor: "#0a0a12", border: "1px solid #1e2a4a",
              borderRadius: 5, padding: "3px 8px", cursor: "pointer",
              minWidth: 48, textAlign: "center",
            }}
          >
            {displayBpm}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <button onClick={() => { const n = Math.min(240, displayBpm + 1); setPendingBpm(n); onBpmChange(n); }} style={{ ...microBtn }}>▲</button>
          <button onClick={() => { const n = Math.max(40,  displayBpm - 1); setPendingBpm(n); onBpmChange(n); }} style={{ ...microBtn }}>▼</button>
        </div>
      </div>

      {/* Time signature */}
      <div className="relative transport-time-signature" ref={timeSigRef} style={{ flexShrink: 0 }}>
        <button
          onClick={() => setShowTimeSig(s => !s)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 8px", borderRadius: 6, cursor: "pointer",
            backgroundColor: "#0a0a12", color: "#a78bfa",
            border: "1px solid #3a2a6a", fontSize: 12, fontFamily: "monospace",
          }}
        >
          {timeSigTop}/{timeSigBottom}
          <span style={{ color: "#5a4a8a", fontSize: 9 }}>▾</span>
        </button>
        {showTimeSig && (
          <div style={{ ...dropdown, minWidth: 76 }}>
            {TIME_SIGS.map(ts => (
              <button
                key={ts.label}
                onClick={() => { onTimeSigChange(ts.top, ts.bottom); setShowTimeSig(false); }}
                style={{
                  ...dropItem,
                  color: ts.top === timeSigTop && ts.bottom === timeSigBottom ? "#a78bfa" : "#c0c0d8",
                  fontWeight: ts.top === timeSigTop && ts.bottom === timeSigBottom ? 700 : 400,
                }}
              >
                <span style={{ fontFamily: "monospace" }}>{ts.label}</span>
                {ts.top === timeSigTop && ts.bottom === timeSigBottom && (
                  <span style={{ color: "#a78bfa", fontSize: 10 }}>✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Personal / Sync mode toggle */}
      <button
        className="transport-mode"
        onClick={onToggleMode}
        title={playbackMode === "personal" ? "Personal mode: play & volume only affect you" : "Sync mode: play & volume sync to everyone"}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 6, cursor: "pointer",
          backgroundColor: playbackMode === "personal" ? "#1a2a1a" : "#1a1a2e",
          color: playbackMode === "personal" ? "#4ade80" : "#818cf8",
          border: `1px solid ${playbackMode === "personal" ? "#166534" : "#3730a3"}`,
          fontSize: 11, fontWeight: 600, flexShrink: 0,
          transition: "all 0.15s",
        }}
      >
        <span style={{ fontSize: 12 }}>{playbackMode === "personal" ? "🎧" : "🔗"}</span>
        {playbackMode === "personal" ? "Personal" : "Sync"}
      </button>

      {/* Spacer */}
      <div className="transport-spacer" style={{ flex: 1 }} />

      {/* Session name badge */}
      <div
        className="transport-session-name"
        style={{
          display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
          padding: "3px 10px", borderRadius: 6,
          backgroundColor: "#1a1428", border: "1px solid #3a2a5a",
          maxWidth: 160,
        }}
      >
        <span style={{ fontSize: 10, color: "#6a4a8a" }}>♬</span>
        <span style={{
          fontSize: 12, fontWeight: 600, color: "#c0a0f0",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {sessionName}
        </span>
      </div>

      {/* People who have joined this project */}
      <div className="transport-people" aria-label="Online collaborators" style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", marginRight: 2 }}>Live</span>
        {users.map(u => {
          const hex   = u.identity.toHexString();
          const color = userColor(hex);
          const isMe  = hex === myIdentity;
          return (
            <div
              key={hex}
              title={u.username + (isMe ? " (you)" : "") + " · online now"}
              style={{
                width: 24, height: 24, borderRadius: "50%",
                backgroundColor: color + "22",
                border: `2px solid ${color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, color,
              }}
            >
              {u.username.slice(0, 1).toUpperCase()}
            </div>
          );
        })}
      </div>

      {/* Separator */}
      <div className="transport-separator" style={{ width: 1, height: 28, backgroundColor: "#2a2a3a", flexShrink: 0 }} />

      {/* Demo menu */}
      <div className="relative transport-demo" ref={demoRef} style={{ flexShrink: 0 }}>
        <button
          onClick={() => setShowDemoMenu(s => !s)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 10px", borderRadius: 6, cursor: "pointer",
            backgroundColor: "#14141e", color: "#a0a0c0",
            border: "1px solid #2a2a3a", fontSize: 12,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#1e1e2e"; e.currentTarget.style.color = "#c0c0e0"; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#14141e"; e.currentTarget.style.color = "#a0a0c0"; }}
        >
          🎼 <span>Demo</span> <span style={{ color: "#4a4a6a", fontSize: 9 }}>▾</span>
        </button>
        {showDemoMenu && (
          <div style={{ ...dropdown, right: 0, left: "auto", minWidth: 210 }}>
            {DEMO_PATTERNS.map(demo => (
              <button
                key={demo.name}
                onClick={() => { onLoadDemo(demo); setShowDemoMenu(false); }}
                style={{ ...dropItem, flexDirection: "column", alignItems: "flex-start", gap: 1, padding: "10px 14px" }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#d0d0e8" }}>{demo.name}</span>
                <span style={{ fontSize: 10, color: "#606080" }}>{demo.description} · {demo.tempo} BPM</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className="transport-export"
        onClick={onExport}
        aria-label="Export project as WAV"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexShrink: 0, padding: "8px 12px", border: "1px solid #554575", borderRadius: 8, background: "#211a30", color: "#e0d3fa", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
      >
        <span aria-hidden="true">↓</span> <span>Export</span>
      </button>
      <button
        className="transport-share"
        onClick={onShare}
        aria-label="Invite collaborators"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexShrink: 0, padding: "8px 12px", border: "1px solid #9f6cf3", borderRadius: 8, background: "#7135cd", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 12px #7c3aed44" }}
      >
        <span aria-hidden="true">＋</span> <span>Invite</span>
      </button>
      <div className="transport-break" aria-hidden="true" />
    </div>
  );
}

// ── Style helpers ──────────────────────────────────────────────────────────────
const btnBase: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  width: 28, height: 28, borderRadius: 4, display: "flex",
  alignItems: "center", justifyContent: "center",
  color: "#606080", transition: "color 0.15s",
};

const microBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  color: "#5a5a7a", fontSize: 7, padding: 0, lineHeight: 1,
};

const dropdown: React.CSSProperties = {
  position: "absolute", top: "100%", left: 0, marginTop: 4,
  backgroundColor: "#16161e", border: "1px solid #2a2a3a",
  borderRadius: 8, boxShadow: "0 12px 40px rgba(0,0,0,0.8)",
  zIndex: 300, overflow: "hidden",
};

const dropItem: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  width: "100%", padding: "8px 12px",
  background: "none", border: "none", cursor: "pointer",
  color: "#c0c0d8", fontSize: 12, textAlign: "left",
  transition: "background-color 0.1s",
};
