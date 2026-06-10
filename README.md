# JamSpace

**Real-time collaborative music sequencer powered by [SpacetimeDB](https://spacetimedb.com).**

Multiple musicians share a single session and edit tracks simultaneously — every note, mute, tempo change, and arrangement edit syncs instantly across all connected clients. There is no application server in the traditional sense: SpacetimeDB is both the database and the backend logic layer, and the browser subscribes directly to its tables over WebSocket.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Data Model](#data-model)
- [Server Reducers (API)](#server-reducers-api)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Features](#features)
- [Troubleshooting](#troubleshooting)

---

## How It Works

SpacetimeDB is the single source of truth. The server is a compiled Rust module that defines **tables** (the shared state) and **reducers** (the only way to mutate that state). Each client:

1. Opens a WebSocket connection to the database.
2. Subscribes to SQL queries over the public tables.
3. Receives live row inserts/updates/deletes as other users make changes.
4. Calls reducers (e.g. `add_note`, `set_playback`) to write changes, which then propagate back to everyone.

Audio is rendered **locally** in each browser via Tone.js, driven entirely by the synchronized table data. Nobody streams audio to anyone — each client independently sonifies the shared sequence, so playback stays in sync because the underlying state is in sync.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                SpacetimeDB Server                 │
│  (Rust module — single source of truth)           │
│                                                   │
│  Tables:  session · track · pattern ·             │
│           arrangement_block · note ·              │
│           user_presence                           │
│                                                   │
│  Reducers: add_note · remove_note · set_playback ·│
│            create_track · toggle_mute · …         │
└───────────────────────┬───────────────────────────┘
                        │  WebSocket subscriptions
            ┌───────────┴───────────┐
        Client A                Client B
   (React + Tone.js)        (React + Tone.js)
   edits drum track          edits synth track
```

A change made by Client A is written through a reducer, committed to the table, and pushed to Client B's subscription in the same transaction loop — no polling, no manual refresh.

---

## Tech Stack

| Layer             | Technology                          |
| ----------------- | ----------------------------------- |
| Real-time backend | SpacetimeDB `1.1` (Rust module)     |
| Client SDK        | `spacetimedb` (TypeScript) `^2.4.1` |
| Frontend          | React 18 + TypeScript + Vite 5      |
| Audio engine      | Tone.js `^14.7`                     |
| Styling           | Tailwind CSS 3                      |

---

## Data Model

All tables are declared `public` so clients can subscribe to them directly.

| Table               | Key fields                                                                              | Purpose                                                                 |
| ------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `session`           | `session_id`, `name`, `tempo_bpm`, `is_playing`, `current_beat`, `time_sig_top/bottom`  | A jam session: global tempo, play state, and time signature.            |
| `track`             | `track_id`, `session_id`, `instrument`, `owner_identity`, `color`, `is_muted`, `volume` | An instrument lane (drums / bass / synth / lead by default).            |
| `pattern`           | `pattern_id`, `session_id`, `name`, `color`, `num_bars`                                 | A reusable musical phrase spanning 1–32 bars (defaults to 2).           |
| `arrangement_block` | `block_id`, `session_id`, `pattern_id`, `position`                                      | Places a pattern at a position in the song timeline.                    |
| `note`              | `note_id`, `pattern_id`, `track_id`, `step`, `pitch`, `velocity`, `duration`            | A single note within a pattern. `duration` is in 16th-note steps.       |
| `user_presence`     | `identity`, `session_id`, `username`, `active_track_id`, `last_seen`                     | Who is online, which session and track they're working on.              |

A new session is seeded with four default tracks (drums `#f87171`, bass `#60a5fa`, synth `#a78bfa`, lead `#34d399`) and two patterns ("Intro", "Verse"), arranged back to back.

---

## Server Reducers (API)

Reducers are the write API. Clients never touch tables directly — they call these.

**Session & setup**
- `setup_default_session()` — seeds the first session if none exists.
- `create_new_session(name)` — creates a fresh session with default tracks, patterns, and arrangement.
- `join_session(session_id, username)` — registers/updates the caller's presence.
- `set_playback(session_id, is_playing, tempo_bpm)` — shared play/pause + BPM.
- `set_time_signature(session_id, top, bottom)` — change the session time signature.

**Tracks**
- `create_track(session_id, instrument, color)`
- `remove_track(track_id)` — also deletes the track's notes.
- `toggle_mute(track_id)`
- `set_volume(track_id, volume)` — clamped to `0.0–1.0`.
- `set_active_track(track_id)` — updates which track the caller is editing (for presence).

**Patterns & arrangement**
- `create_pattern(session_id, name, color)`
- `rename_pattern(pattern_id, name)`
- `set_pattern_bars(pattern_id, num_bars)` — clamped to `1–32`.
- `add_arrangement_block(session_id, pattern_id, position)`
- `remove_arrangement_block(block_id)`

**Notes**
- `add_note(pattern_id, track_id, step, pitch, velocity, duration)` — no-op if an identical note already exists.
- `set_note_duration(note_id, duration)` — minimum 1 step.
- `remove_note(pattern_id, track_id, step, pitch)`
- `clear_pattern_notes(pattern_id)`
- `clear_notes(session_id)` — clears notes across all patterns in the session.

---

## Project Structure

```
JamSpace/
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx             # connection, subscriptions, top-level state
│   │   ├── main.tsx            # React entry point
│   │   ├── index.css           # Tailwind + base styles
│   │   ├── components/         # JoinModal, SessionView, sequencer UI
│   │   ├── spacetime/          # connection helper + typed table re-exports
│   │   └── module_bindings/    # auto-generated SpacetimeDB TS bindings
│   ├── index.html
│   └── package.json
└── server/                     # SpacetimeDB Rust module
    ├── src/lib.rs              # tables + reducers
    └── Cargo.toml
```

> The client subscribes to all six public tables on connect:
> `session`, `track`, `pattern`, `arrangement_block`, `note`, `user_presence`.

---

## Development Workflow

| Task                         | Command                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| Start the database           | `spacetime start`                                                                         |
| Publish server changes       | `cd server && spacetime publish --server local jamspace`                                  |
| Regenerate client bindings   | `spacetime generate --lang typescript --out-dir client/src/module_bindings --project-path server` |
| Run the dev server           | `cd client && npm run dev`                                                                 |
| Build for production         | `cd client && npm run build`                                                              |
| Preview the production build | `cd client && npm run preview`                                                            |

A typical iteration when changing backend logic: edit `lib.rs` → `spacetime publish` → `spacetime generate` → the Vite dev server hot-reloads the client.

---

## Features

- **16-step sequencer** with default instrument tracks (drums, bass, synth, lead).
- **Pattern + arrangement model** — build reusable patterns (1–32 bars) and lay them out into a song timeline.
- **Real-time multi-user editing** — every note, mute, volume, and arrangement change syncs instantly via SpacetimeDB subscriptions.
- **Shared playback control** — play/pause and BPM are session-wide and synced across all users.
- **User presence** — see who's online and which track each person is currently editing.
- **Per-track controls** — mute toggle and volume per track.
- **Local audio** — Tone.js renders sound in each browser, driven purely by the shared table state.

---

*JamSpace is a demo of building collaborative, real-time applications where the database itself is the backend — no separate API server required.*
