import React, { useState } from "react";

interface Props {
  onJoin: (username: string) => void;
}

const PLACEHOLDER_NAMES = ["Jimi", "Billie", "Freddie", "Nina", "Miles", "Björk"];

export default function JoinModal({ onJoin }: Props) {
  const [username, setUsername] = useState("");
  const placeholder = PLACEHOLDER_NAMES[Math.floor(Math.random() * PLACEHOLDER_NAMES.length)];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = username.trim() || placeholder;
    if (name) onJoin(name);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1117" }}>
      <div className="w-full max-w-sm mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎵</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">JamSpace</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Real-time collaborative music · Powered by SpacetimeDB
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{ backgroundColor: "#161b27", border: "1px solid #2d3748" }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 text-xs uppercase tracking-wide">Your stage name</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={placeholder}
              className="rounded-lg px-4 py-3 text-white text-sm outline-none transition"
              style={{
                backgroundColor: "#0f1420",
                border: "1px solid #374151",
              }}
              onFocus={e => (e.target.style.borderColor = "#60a5fa")}
              onBlur={e => (e.target.style.borderColor = "#374151")}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="py-3 rounded-xl text-white font-semibold text-sm transition"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              boxShadow: "0 4px 20px #3b82f640",
            }}
          >
            Join the Session →
          </button>
        </form>

        {/* Feature hints */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "🥁", text: "16-step sequencer" },
            { icon: "👥", text: "Real-time multiplayer" },
            { icon: "🎼", text: "Demo patterns" },
          ].map(f => (
            <div key={f.text} className="rounded-lg p-3" style={{ backgroundColor: "#161b27", border: "1px solid #1f2937" }}>
              <div className="text-xl mb-1">{f.icon}</div>
              <div className="text-xs text-gray-500">{f.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
