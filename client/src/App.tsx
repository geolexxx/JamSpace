import React, { useEffect, useRef, useState, useCallback } from "react";
import JoinModal from "./components/JoinModal";
import SessionView from "./components/SessionView";
import { buildConnection, type Session, type Track, type Note, type UserPresence, type Pattern, type ArrangementBlock } from "./spacetime/client";
import type { DbConnection } from "./module_bindings";

const SUBSCRIBE_QUERIES = [
  "SELECT * FROM session",
  "SELECT * FROM track",
  "SELECT * FROM pattern",
  "SELECT * FROM arrangement_block",
  "SELECT * FROM note",
  "SELECT * FROM user_presence",
];

export default function App() {
  const [conn, setConn]             = useState<DbConnection | null>(null);
  const [myIdentity, setMyIdentity] = useState<string>("");
  const [joined, setJoined]         = useState(false);
  const [connecting, setConnecting] = useState(true);

  const [session,     setSession]     = useState<Session | null>(null);
  const [tracks,      setTracks]      = useState<Track[]>([]);
  const [notes,       setNotes]       = useState<Note[]>([]);
  const [users,       setUsers]       = useState<UserPresence[]>([]);
  const [patterns,    setPatterns]    = useState<Pattern[]>([]);
  const [arrangement, setArrangement] = useState<ArrangementBlock[]>([]);

  const initializedRef = useRef(false);

  useEffect(() => {
    const c = buildConnection((connection, identity) => {
      setMyIdentity(identity.toHexString());
      setConn(connection);
      setConnecting(false);
    });

    // ── Session ──────────────────────────────────────────────────────────────
    c.db.session.onInsert((_ctx, row) => {
      if (!initializedRef.current) return;
      setSession(row);
    });
    c.db.session.onUpdate((_ctx, _old, row) => setSession(row));

    // ── Tracks ───────────────────────────────────────────────────────────────
    c.db.track.onInsert((_ctx, row) => {
      if (!initializedRef.current) return;
      setTracks(prev => prev.some(t => t.trackId === row.trackId) ? prev : [...prev, row]);
    });
    c.db.track.onUpdate((_ctx, _old, row) =>
      setTracks(prev => prev.map(t => t.trackId === row.trackId ? row : t))
    );
    c.db.track.onDelete((_ctx, row) =>
      setTracks(prev => prev.filter(t => t.trackId !== row.trackId))
    );

    // ── Patterns ─────────────────────────────────────────────────────────────
    c.db.pattern.onInsert((_ctx, row) => {
      if (!initializedRef.current) return;
      setPatterns(prev => prev.some(p => p.patternId === row.patternId) ? prev : [...prev, row]);
    });
    c.db.pattern.onUpdate((_ctx, _old, row) =>
      setPatterns(prev => prev.map(p => p.patternId === row.patternId ? row : p))
    );
    c.db.pattern.onDelete((_ctx, row) =>
      setPatterns(prev => prev.filter(p => p.patternId !== row.patternId))
    );

    // ── Arrangement blocks ────────────────────────────────────────────────────
    c.db.arrangement_block.onInsert((_ctx, row) => {
      if (!initializedRef.current) return;
      setArrangement(prev => prev.some(b => b.blockId === row.blockId) ? prev : [...prev, row]);
    });
    c.db.arrangement_block.onDelete((_ctx, row) =>
      setArrangement(prev => prev.filter(b => b.blockId !== row.blockId))
    );

    // ── Notes ─────────────────────────────────────────────────────────────────
    c.db.note.onInsert((_ctx, row) => {
      if (!initializedRef.current) return;
      setNotes(prev => prev.some(n => n.noteId === row.noteId) ? prev : [...prev, row]);
    });
    c.db.note.onDelete((_ctx, row) =>
      setNotes(prev => prev.filter(n => n.noteId !== row.noteId))
    );

    // ── User presence ─────────────────────────────────────────────────────────
    c.db.user_presence.onInsert((_ctx, row) => {
      if (!initializedRef.current) return;
      setUsers(prev => {
        const id = row.identity.toHexString();
        return prev.some(u => u.identity.toHexString() === id) ? prev : [...prev, row];
      });
    });
    c.db.user_presence.onUpdate((_ctx, _old, row) =>
      setUsers(prev => prev.map(u =>
        u.identity.toHexString() === row.identity.toHexString() ? row : u
      ))
    );
    c.db.user_presence.onDelete((_ctx, row) =>
      setUsers(prev => prev.filter(u =>
        u.identity.toHexString() !== row.identity.toHexString()
      ))
    );

    // ── Subscribe & seed state from snapshot ─────────────────────────────────
    c.subscriptionBuilder()
      .onApplied(() => {
        setTracks([...c.db.track.iter()]);
        setNotes([...c.db.note.iter()]);
        setUsers([...c.db.user_presence.iter()]);
        setPatterns([...c.db.pattern.iter()]);
        setArrangement([...c.db.arrangement_block.iter()]);
        const firstSession = [...c.db.session.iter()][0];
        if (firstSession) setSession(firstSession);
        initializedRef.current = true;
      })
      .subscribe(SUBSCRIBE_QUERIES);
  }, []);

  const handleJoin = useCallback((username: string) => {
    if (!conn) return;
    conn.reducers.setupDefaultSession({});
    setTimeout(() => {
      conn.reducers.joinSession({ sessionId: 1, username });
      setJoined(true);
    }, 500);
  }, [conn]);

  if (connecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: "#0e0e14" }}>
        <div className="text-2xl">🎵</div>
        <div className="text-gray-400 text-sm">Connecting to SpacetimeDB...</div>
      </div>
    );
  }

  if (!joined) return <JoinModal onJoin={handleJoin} />;

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: "#0e0e14" }}>
        <div className="text-2xl animate-spin">🎵</div>
        <div className="text-gray-400 text-sm">Loading session...</div>
      </div>
    );
  }

  return (
    <SessionView
      session={session}
      tracks={tracks}
      notes={notes}
      users={users}
      patterns={patterns}
      arrangement={arrangement}
      myIdentity={myIdentity}
    />
  );
}
