import React, { useState, useEffect, useRef } from "react";
import type { Session } from "../spacetime/client";

interface Props {
  sessions: Session[];
  onJoin:   (username: string, sessionId: number) => void;
  onCreate: (username: string, projectName: string) => void;
}

const PLACEHOLDER_NAMES = ["Jimi", "Billie", "Freddie", "Nina", "Miles", "Björk", "Prince", "Stevie"];

// ── Animated EQ bars ──────────────────────────────────────────────────────────
function EqBars() {
  const count = 32;
  return (
    <div
      style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
        display: "flex", alignItems: "flex-end", gap: 3, padding: "0 24px",
        opacity: 0.18, pointerEvents: "none",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            background: `linear-gradient(to top, #a855f7, #6366f1)`,
            borderRadius: "3px 3px 0 0",
            animation: `eq-bar ${0.6 + (i % 7) * 0.13}s ease-in-out ${(i * 0.04) % 0.5}s infinite alternate`,
            height: `${20 + Math.sin(i * 1.3) * 15 + Math.cos(i * 0.7) * 12}px`,
          }}
        />
      ))}
    </div>
  );
}

// ── Floating music note decoration ───────────────────────────────────────────
const FLOAT_NOTES = ["♩","♪","♫","♬","♭","♮","♯","𝄞","𝄢"];
function FloatingNotes() {
  const items = Array.from({ length: 16 }, (_, i) => ({
    symbol: FLOAT_NOTES[i % FLOAT_NOTES.length],
    x: 5 + (i * 6.1) % 92,
    y: 5 + (i * 11.3) % 85,
    size: 10 + (i * 3.7) % 22,
    opacity: 0.04 + (i % 4) * 0.03,
    rotation: (i * 23) % 60 - 30,
    dur: 4 + (i % 5) * 1.2,
    delay: (i * 0.4) % 3,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {items.map((n, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${n.x}%`,
            top: `${n.y}%`,
            fontSize: n.size,
            color: "#a78bfa",
            opacity: n.opacity,
            transform: `rotate(${n.rotation}deg)`,
            animation: `float-note ${n.dur}s ease-in-out ${n.delay}s infinite alternate`,
            userSelect: "none",
          }}
        >
          {n.symbol}
        </div>
      ))}
    </div>
  );
}

export default function JoinModal({ sessions, onJoin, onCreate }: Props) {
  const [username,    setUsername]    = useState("");
  const [creating,    setCreating]    = useState(false);
  const [projectName, setProjectName] = useState("");
  const placeholder = useRef(PLACEHOLDER_NAMES[Math.floor(Math.random() * PLACEHOLDER_NAMES.length)]).current;

  const effectiveName = username.trim() || placeholder;

  const handleJoin = (sessionId: number) => onJoin(effectiveName, sessionId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(effectiveName, projectName.trim() || "My Jam Session");
  };

  return (
    <>
      {/* ── Global keyframe styles ── */}
      <style>{`
        @keyframes eq-bar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
        @keyframes float-note {
          from { transform: translateY(0px) rotate(var(--r, 0deg)); }
          to   { transform: translateY(-14px) rotate(var(--r, 0deg)); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.35; }
          50%       { opacity: 0.55; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse 80% 70% at 50% 30%, #1a0a35 0%, #0c0718 40%, #080510 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow blobs */}
        <div style={{
          position: "absolute", top: "8%", left: "15%",
          width: 420, height: 320, borderRadius: "50%",
          background: "radial-gradient(circle, #7c3aed44 0%, transparent 70%)",
          animation: "glow-pulse 4s ease-in-out infinite",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "12%", right: "10%",
          width: 350, height: 280, borderRadius: "50%",
          background: "radial-gradient(circle, #ec489933 0%, transparent 70%)",
          animation: "glow-pulse 5.5s ease-in-out 1.5s infinite",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: "45%", right: "20%",
          width: 240, height: 200, borderRadius: "50%",
          background: "radial-gradient(circle, #3b82f629 0%, transparent 70%)",
          animation: "glow-pulse 3.8s ease-in-out 0.8s infinite",
          pointerEvents: "none",
        }} />

        {/* Floating music notes */}
        <FloatingNotes />

        {/* EQ bars at bottom */}
        <EqBars />

        {/* Vinyl record decoration */}
        <div style={{
          position: "absolute", top: "5%", right: "5%",
          width: 160, height: 160, borderRadius: "50%",
          border: "2px solid #ffffff0a",
          background: "radial-gradient(circle at 50% 50%, #1a1a2e 30%, #0d0d18 60%, #1a1a2e 100%)",
          animation: "spin-slow 18s linear infinite",
          pointerEvents: "none",
          opacity: 0.35,
        }}>
          {[0.15, 0.3, 0.45, 0.6, 0.75].map((r, i) => (
            <div key={i} style={{
              position: "absolute",
              top: `${50 - r * 50}%`, left: `${50 - r * 50}%`,
              width: `${r * 100}%`, height: `${r * 100}%`,
              borderRadius: "50%",
              border: "1px solid #ffffff08",
            }} />
          ))}
          <div style={{
            position: "absolute", top: "44%", left: "44%",
            width: "12%", height: "12%",
            borderRadius: "50%", backgroundColor: "#a855f755",
          }} />
        </div>

        {/* Waveform line decoration */}
        <svg
          style={{ position: "absolute", top: "22%", left: 0, right: 0, opacity: 0.06, pointerEvents: "none" }}
          width="100%" height="40" viewBox="0 0 1200 40" preserveAspectRatio="none"
        >
          <polyline
            points={Array.from({ length: 120 }, (_, i) => `${i * 10},${20 + Math.sin(i * 0.5) * 14 + Math.sin(i * 1.3) * 6}`).join(" ")}
            fill="none" stroke="#a78bfa" strokeWidth="1.5"
          />
        </svg>

        {/* ── Main card ── */}
        <div style={{ width: "100%", maxWidth: 420, margin: "0 24px", position: "relative", zIndex: 10 }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h1 style={{
              fontSize: 36, fontWeight: 800, color: "#fff",
              letterSpacing: "-0.02em", margin: 0,
              background: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              JamSpace
            </h1>
            <p style={{ color: "#7c6a9a", marginTop: 6, fontSize: 13, letterSpacing: "0.04em" }}>
              Real-time collaborative music · SpacetimeDB
            </p>
            {/* Horizontal line with music accent */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px auto", maxWidth: 200 }}>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #3a2a5a)" }} />
              <span style={{ color: "#5a3a7a", fontSize: 14 }}>♬</span>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #3a2a5a)" }} />
            </div>
          </div>

          {/* Username */}
          <div style={{
            borderRadius: 16,
            padding: "16px 18px",
            marginBottom: 12,
            background: "linear-gradient(135deg, #1a1030 0%, #120e22 100%)",
            border: "1px solid #2e1f50",
            boxShadow: "0 4px 24px #00000060",
          }}>
            <label style={{ color: "#7a6a9a", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>
              Your stage name
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={placeholder}
              style={{
                marginTop: 6, width: "100%", borderRadius: 10,
                padding: "10px 14px", outline: "none",
                backgroundColor: "#0e0a1e", color: "#e8e0f8", fontSize: 14,
                border: "1px solid #2a1e44", boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={e => (e.target.style.borderColor = "#7c3aed")}
              onBlur={e => (e.target.style.borderColor = "#2a1e44")}
              autoFocus
            />
          </div>

          {!creating ? (
            /* ── Project list ── */
            <div style={{
              borderRadius: 16,
              padding: "16px 18px",
              background: "linear-gradient(135deg, #1a1030 0%, #120e22 100%)",
              border: "1px solid #2e1f50",
              boxShadow: "0 4px 24px #00000060",
            }}>
              <div style={{ color: "#7a6a9a", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 12 }}>
                Choose a project
              </div>

              {sessions.length === 0 ? (
                <div style={{ color: "#3a2a5a", fontSize: 13, textAlign: "center", padding: "12px 0" }}>
                  No projects yet — create one below
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  {sessions.map(s => (
                    <button
                      key={s.sessionId}
                      onClick={() => handleJoin(s.sessionId)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        borderRadius: 12, padding: "10px 14px",
                        background: "#0e0a1e", border: "1px solid #2a1e44",
                        cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = "#7c3aed";
                        e.currentTarget.style.background = "#170f2a";
                        e.currentTarget.style.boxShadow = "0 0 18px #7c3aed28";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = "#2a1e44";
                        e.currentTarget.style.background = "#0e0a1e";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div>
                        <div style={{ color: "#e8e0f8", fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                        <div style={{ color: "#6a5a8a", fontSize: 11, marginTop: 2 }}>
                          {s.tempoBpm} BPM · {s.timeSigTop}/{s.timeSigBottom}
                        </div>
                      </div>
                      <span style={{
                        color: "#7c3aed", fontSize: 11, fontWeight: 700,
                        backgroundColor: "#7c3aed18", borderRadius: 6, padding: "3px 8px",
                      }}>
                        Join →
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setCreating(true)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 8, borderRadius: 12, padding: "10px",
                  border: "1px dashed #3a2a5a", color: "#6a4a9a", fontSize: 13,
                  background: "transparent", cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "#7c3aed";
                  e.currentTarget.style.color = "#a78bfa";
                  e.currentTarget.style.background = "#7c3aed10";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "#3a2a5a";
                  e.currentTarget.style.color = "#6a4a9a";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
                <span style={{ fontWeight: 600 }}>New Project</span>
              </button>
            </div>
          ) : (
            /* ── Create form ── */
            <form
              onSubmit={handleCreate}
              style={{
                borderRadius: 16, padding: "16px 18px",
                background: "linear-gradient(135deg, #1a1030 0%, #120e22 100%)",
                border: "1px solid #2e1f50",
                boxShadow: "0 4px 24px #00000060",
                display: "flex", flexDirection: "column", gap: 14,
              }}
            >
              <div>
                <label style={{ color: "#7a6a9a", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>
                  Project name
                </label>
                <input
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="My Jam Session"
                  style={{
                    marginTop: 6, width: "100%", borderRadius: 10,
                    padding: "10px 14px", outline: "none",
                    backgroundColor: "#0e0a1e", color: "#e8e0f8", fontSize: 14,
                    border: "1px solid #2a1e44", boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#7c3aed")}
                  onBlur={e => (e.target.style.borderColor = "#2a1e44")}
                  autoFocus
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10, fontSize: 13,
                    background: "#0e0a1e", color: "#6a5a8a", border: "1px solid #2a1e44",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#a090c0")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#6a5a8a")}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2, padding: "10px", borderRadius: 10,
                    color: "white", fontWeight: 700, fontSize: 14,
                    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                    border: "none", cursor: "pointer",
                    boxShadow: "0 4px 20px #7c3aed50",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  Create &amp; Join →
                </button>
              </div>
            </form>
          )}

          {/* Footer tag */}
          <div style={{ textAlign: "center", marginTop: 20, color: "#3a2a50", fontSize: 11, letterSpacing: "0.06em" }}>
            ♫ &nbsp; Powered by SpacetimeDB &nbsp; ♫
          </div>
        </div>
      </div>
    </>
  );
}
