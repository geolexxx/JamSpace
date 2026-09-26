import React, { useEffect, useRef, useState, useCallback } from "react";
import JoinModal from "./components/JoinModal";
import SessionView from "./components/SessionView";
import { clearShareLinkFromAddress, readSharedSessionId } from "./collaboration/shareLink";
import { isOnline, PRESENCE_HEARTBEAT_MS } from "./collaboration/presence";
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
  const [sessionsReady, setSessionsReady]           = useState(false);
  const [sessionsError, setSessionsError]           = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [sharedLink, setSharedLink]                 = useState(() => readSharedSessionId(window.location.search));

  const [sessions,     setSessions]     = useState<Session[]>([]);
  const [tracks,       setTracks]       = useState<Track[]>([]);
  const [notes,        setNotes]        = useState<Note[]>([]);
  const [users,        setUsers]        = useState<UserPresence[]>([]);
  const [presenceNow,  setPresenceNow]  = useState(() => Date.now());
  const [patterns,     setPatterns]     = useState<Pattern[]>([]);
  const [arrangement,  setArrangement]  = useState<ArrangementBlock[]>([]);

  const initializedRef = useRef(false);
  const pendingJoinRef = useRef<{ username: string } | null>(null);
  const connRef        = useRef<DbConnection | null>(null);
  const usernameRef    = useRef("");

  useEffect(() => {
    const c = buildConnection((connection, identity) => {
      setMyIdentity(identity.toHexString());
      setConn(connection);
      connRef.current = connection;
      setConnecting(false);
    });

    // ── Session ──────────────────────────────────────────────────────────────
    c.db.session.onInsert((ctx, row) => {
      if (!initializedRef.current) return;
      setSessions(prev => prev.some(s => s.sessionId === row.sessionId) ? prev : [...prev, row]);
      // Only the insert event from this connection's own reducer completes Create & Join.
      if (
        pendingJoinRef.current && connRef.current &&
        ctx.event.tag === "Reducer" && ctx.event.value.reducer.name === "create_new_session"
      ) {
        const { username } = pendingJoinRef.current;
        pendingJoinRef.current = null;
        usernameRef.current = username;
        setPresenceNow(Date.now());
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
        setSessionsReady(true);
        setSessionsError(false);
      })
      .onError(() => setSessionsError(true))
      .subscribe(SUBSCRIBE_QUERIES);
  }, []);

  useEffect(() => {
    if (connecting || sessionsReady || sessionsError) return;
    const timeout = window.setTimeout(() => setSessionsError(true), 15000);
    return () => window.clearTimeout(timeout);
  }, [connecting, sessionsReady, sessionsError]);

  useEffect(() => {
    const onPopState = () => setSharedLink(readSharedSessionId(window.location.search));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Existing join_session updates last_seen. Repeat it only while this project is
  // open; old rows expire in the UI when a browser closes or leaves the project.
  useEffect(() => {
    if (!conn || !joined || selectedSessionId === null || !usernameRef.current) return;
    const heartbeat = () => {
      if (!usernameRef.current) return;
      void conn.reducers.joinSession({ sessionId: selectedSessionId, username: usernameRef.current }).catch(() => {
        // A dropped connection will age out instead of displaying someone as online.
      });
    };
    heartbeat();
    const heartbeatTimer = window.setInterval(heartbeat, PRESENCE_HEARTBEAT_MS);
    const refreshTimer = window.setInterval(() => setPresenceNow(Date.now()), 2_500);
    const onVisible = () => { if (document.visibilityState === "visible") heartbeat(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(heartbeatTimer);
      window.clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [conn, joined, selectedSessionId]);

  const handleJoin = useCallback((username: string, sessionId: number) => {
    if (!conn || !sessions.some(s => s.sessionId === sessionId)) return;
    usernameRef.current = username;
    setPresenceNow(Date.now());
    conn.reducers.joinSession({ sessionId, username });
    setSelectedSessionId(sessionId);
    setJoined(true);
    if (sharedLink.sessionId !== sessionId) {
      clearShareLinkFromAddress();
      setSharedLink({ hasLink: false, sessionId: null });
    }
  }, [conn, sessions, sharedLink.sessionId]);

  const handleCreate = useCallback((username: string, projectName: string) => {
    if (!conn || pendingJoinRef.current) return;
    pendingJoinRef.current = { username };
    void conn.reducers.createNewSession({ name: projectName }).catch(() => {
      pendingJoinRef.current = null;
    });
  }, [conn]);

  const handleBackToHome = useCallback(() => {
    usernameRef.current = "";
    setJoined(false);
    setSelectedSessionId(null);
    clearShareLinkFromAddress();
    setSharedLink({ hasLink: false, sessionId: null });
  }, []);

  const handleDismissSharedLink = useCallback(() => {
    clearShareLinkFromAddress();
    setSharedLink({ hasLink: false, sessionId: null });
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
        sessionsReady={sessionsReady}
        sessionsError={sessionsError}
        sharedLink={sharedLink}
        onJoin={handleJoin}
        onCreate={handleCreate}
        onDismissSharedLink={handleDismissSharedLink}
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
  const sessionUsers       = users.filter(u => u.sessionId === selectedSessionId && isOnline(u, presenceNow));

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
