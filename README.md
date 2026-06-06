# JamSpace 🎵

**Real-time collaborative music sequencer powered by SpacetimeDB.**

Multiple musicians share one session and edit tracks simultaneously — every note, mute, and tempo change syncs instantly across all connected clients.

## Architecture

```
┌─────────────────────────────────────────────┐
│              SpacetimeDB Server              │
│  Tables: Session, Track, Note, UserPresence │
│  Reducers: add_note, remove_note,            │
│            set_playback, create_track, …     │
└──────────────────┬──────────────────────────┘
                   │  WebSocket subscriptions
        ┌──────────┴──────────┐
   Client A               Client B
  (React + Tone.js)   (React + Tone.js)
  edits drum track     edits synth track
```

SpacetimeDB is the single source of truth. Tone.js plays audio locally, driven by real-time table subscriptions.

## Setup

### 1. Install SpacetimeDB CLI
```bash
curl -sSf https://install.spacetimedb.com | sh
```

### 2. Start local SpacetimeDB server
```bash
spacetime start
```

### 3. Publish the server module
```bash
cd server
spacetime publish --server local jamspace
```

### 4. Generate TypeScript bindings
```bash
spacetime generate --lang typescript \
  --out-dir client/src/module_bindings \
  --project-path server
```

### 5. Start the frontend
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173` in two browser tabs to see real-time sync in action.

## Features

- 16-step sequencer with 4 instrument tracks (drums, bass, synth, lead)
- Real-time multi-user editing — all changes sync instantly via SpacetimeDB subscriptions
- Shared playback control — play/pause and BPM sync across all users
- User presence bar — see who's online and which track they're editing
- Per-track mute toggle

## Tech Stack

| Layer | Technology |
|---|---|
| Real-time backend | SpacetimeDB (Rust module) |
| Frontend | React + TypeScript + Vite |
| Audio | Tone.js |
| Styling | Tailwind CSS |
