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
  const [conn, setConn]                           = useState<DbConnection | null>(null);
  const [myIdentity, setMyIdentity]               = useState<string>("");
  const [joined, setJoined]                       = useState(false);
  const [connecting, setConnecting]               = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  const [sessions,     setSessions]     = useState<Session[]>([]);
  const [tracks,       setTracks]       = useState<Track[]>([]);
  const [notes,        setNotes]        = useState<Note[]>([]);
  const [users,        setUsers]        = useState<UserPresence[]>([]);
  const [patterns,     setPatterns]     = useState<Pattern[]>([]);
  const [arrangement,  setArrangement]  = useState<ArrangementBlock[]>([]);

  const initializedRef = useRef(false);
  const pendingJoinRef = useRef<{ username: string } | null>(null);
  const connRef        = useRef<DbConnection | null>(null);

  useEffect(() => {
    const c = buildConnection((connection, identity) => {
      setMyIdentity(identity.toHexString());
      setConn(connection);
      connRef.current = connection;
      setConnecting(false);
    });

    // ── Session ──────────────────────────────────────────────────────────────
    c.db.session.onInsert((_ctx, row) => {
      if (!initializedRef.current) return;
      setSessions(prev => prev.some(s => s.sessionId === row.sessionId) ? prev : [...prev, row]);
      // Complete a pending "Create & Join" — grab the auto-inc id SpacetimeDB assigned
      if (pendingJoinRef.current && connRef.current) {
        const { username } = pendingJoinRef.current;
        pendingJoinRef.current = null;
        connRef.current.reducers.joinSession({ sessionId: row.sessionId, username });
        setSelectedSessionId(row.sessionId);
        setJoined(true);
      }
    });
    c.db.session.onUpdate((_ctx, _old, row) =>
      setSessions(prev => prev.map(s => s.sessionId === row.sessionId ? row : s))
    );

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
        setSessions([...c.db.session.iter()]);
        initializedRef.current = true;
      })
      .subscribe(SUBSCRIBE_QUERIES);
  }, []);

  const handleJoin = useCallback((username: string, sessionId: number) => {
    if (!conn) return;
    conn.reducers.joinSession({ sessionId, username });
    setSelectedSessionId(sessionId);
    setJoined(true);
  }, [conn]);

  const handleCreate = useCallback((username: string, projectName: string) => {
    if (!conn) return;
    pendingJoinRef.current = { username };
    conn.reducers.createNewSession({ name: projectName });
  }, [conn]);

  const handleBackToHome = useCallback(() => {
    setJoined(false);
    setSelectedSessionId(null);
  }, []);

  if (connecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: "#0e0e14" }}>
        <div className="text-2xl">🎵</div>
        <div className="text-gray-400 text-sm">Connecting to SpacetimeDB...</div>
      </div>
    );
  }

  if (!joined) {
    return (
      <JoinModal
        sessions={sessions}
        onJoin={handleJoin}
        onCreate={handleCreate}
      />
    );
  }

  const session = sessions.find(s => s.sessionId === selectedSessionId) ?? null;

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: "#0e0e14" }}>
        <div className="text-2xl">🎵</div>
        <div className="text-gray-400 text-sm">Loading session...</div>
      </div>
    );
  }

  // Filter all data to the selected session
  const sessionTracks      = tracks.filter(t => t.sessionId === selectedSessionId);
  const sessionPatterns    = patterns.filter(p => p.sessionId === selectedSessionId);
  const sessionArrangement = arrangement.filter(b => b.sessionId === selectedSessionId);
  const sessionPatternIds  = new Set(sessionPatterns.map(p => p.patternId));
  const sessionNotes       = notes.filter(n => sessionPatternIds.has(n.patternId));
  const sessionUsers       = users.filter(u => u.sessionId === selectedSessionId);

  return (
    <SessionView
      session={session}
      tracks={sessionTracks}
      notes={sessionNotes}
      users={sessionUsers}
      patterns={sessionPatterns}
      arrangement={sessionArrangement}
      myIdentity={myIdentity}
      onBackToHome={handleBackToHome}
    />
  );
}
