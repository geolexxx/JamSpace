import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import PlaybackControls from "./PlaybackControls";
import PatternArrangement from "./PatternArrangement";
import BeatRuler, { CELL_W, RULER_H } from "./BeatRuler";
import TrackHeader, { HEADER_W } from "./TrackHeader";
import DrumGrid from "./DrumGrid";
import StepGrid from "./StepGrid";
import {
  startPlayback, stopPlayback, updateBpm, ensureAudioContext, updateLiveData,
  calcStepsPerBar, calcStepsPerBeat,
} from "../audio/scheduler";
import { initSamplers, isSamplersReady, onSamplersReady } from "../audio/instruments";
import {
  getConn, type Session, type Track, type Note, type UserPresence,
  type Pattern, type ArrangementBlock,
} from "../spacetime/client";
import type { DemoPattern } from "../audio/demos";

const PATTERN_COLORS = ["#3b82f6","#a855f7","#22c55e","#f59e0b","#ec4899","#06b6d4","#f97316","#f43f5e"];
const PATTERN_NAMES  = ["A","B","C","D","E","F","G","H","Chorus","Bridge","Outro","Pre-Chorus"];
const TRACK_COLORS   = ["#f87171","#60a5fa","#a78bfa","#34d399","#fbbf24","#f472b6","#fb923c","#a3e635"];
const INSTRUMENTS    = ["drums","bass","synth","lead"];

interface Props {
  session:     Session;
  tracks:      Track[];
  notes:       Note[];
  users:       UserPresence[];
  patterns:    Pattern[];
  arrangement: ArrangementBlock[];
  myIdentity:  string;
}

export default function SessionView({
  session, tracks, notes, users, patterns, arrangement, myIdentity,
}: Props) {
  const [activeStep,      setActiveStep]      = useState(-1);
  const [activeBlockIdx,  setActiveBlockIdx]  = useState(-1);
  const [activePatternId, setActivePatternId] = useState<number | null>(null);
  const [activeTrackId,   setActiveTrackId]   = useState<number | null>(null);
  const [samplersReady,   setSamplersReady]   = useState(isSamplersReady);

  const notesRef           = useRef(notes);
  const tracksRef          = useRef(tracks);
  const arrangementRef     = useRef(arrangement);
  const patternsRef        = useRef(patterns);
  const activePatternIdRef = useRef(activePatternId);

  useEffect(() => { notesRef.current       = notes; },       [notes]);
  useEffect(() => { tracksRef.current      = tracks; },      [tracks]);
  useEffect(() => { arrangementRef.current = arrangement; }, [arrangement]);
  useEffect(() => { patternsRef.current    = patterns; },    [patterns]);
  useEffect(() => { activePatternIdRef.current = activePatternId; }, [activePatternId]);

  const stepsPerBar  = calcStepsPerBar(session.timeSigTop, session.timeSigBottom);
  const stepsPerBeat = calcStepsPerBeat(session.timeSigBottom);

  const activePattern = patterns.find(p => p.patternId === activePatternId);
  const numBars       = activePattern?.numBars ?? 2;
  const totalSteps    = numBars * stepsPerBar;

  // Keep live data fresh for scheduler
  useEffect(() => {
    updateLiveData(notes, tracks, arrangement, patterns, stepsPerBar);
  }, [notes, tracks, arrangement, patterns, stepsPerBar]);

  useEffect(() => {
    initSamplers();
    onSamplersReady(() => setSamplersReady(true));
  }, []);

  // Auto-select first pattern
  useEffect(() => {
    if (patterns.length > 0 && activePatternId === null) {
      setActivePatternId(patterns[0].patternId);
    }
  }, [patterns, activePatternId]);

  // Playback sync
  useEffect(() => {
    if (session.isPlaying) {
      ensureAudioContext().then(() => {
        const spb = calcStepsPerBar(session.timeSigTop, session.timeSigBottom);
        startPlayback(
          notesRef.current,
          tracksRef.current,
          arrangementRef.current,
          patternsRef.current,
          spb,
          session.tempoBpm,
          session.timeSigTop,
          session.timeSigBottom,
          (step, blockIdx) => {
            setActiveStep(step);
            setActiveBlockIdx(blockIdx);
            // Auto-follow: switch editing view to playing pattern
            if (blockIdx >= 0) {
              const sorted = [...arrangementRef.current].sort((a, b) => a.position - b.position);
              const block  = sorted[blockIdx];
              if (block && block.patternId !== activePatternIdRef.current) {
                setActivePatternId(block.patternId);
              }
            }
          }
        );
      });
    } else {
      stopPlayback();
      setActiveStep(-1);
      setActiveBlockIdx(-1);
    }
  }, [session.isPlaying]);

  useEffect(() => {
    if (session.isPlaying) updateBpm(session.tempoBpm);
  }, [session.tempoBpm]);

  const conn = getConn();

  const identityToName = useMemo(() => {
    const m = new Map<string, string>();
    users.forEach(u => m.set(u.identity.toHexString(), u.username));
    return m;
  }, [users]);

  const handleTogglePlay = useCallback(async () => {
    await ensureAudioContext();
    conn.reducers.setPlayback({ sessionId: session.sessionId, isPlaying: !session.isPlaying, tempoBpm: session.tempoBpm });
  }, [session]);

  const handleBpmChange = useCallback((bpm: number) => {
    conn.reducers.setPlayback({ sessionId: session.sessionId, isPlaying: session.isPlaying, tempoBpm: bpm });
  }, [session]);

  const handleTimeSigChange = useCallback((top: number, bottom: number) => {
    conn.reducers.setTimeSignature({ sessionId: session.sessionId, top, bottom });
    if (session.isPlaying) {
      conn.reducers.setPlayback({ sessionId: session.sessionId, isPlaying: false, tempoBpm: session.tempoBpm });
    }
  }, [session]);

  const handleToggleNote = useCallback((trackId: number) => (step: number, pitch: number) => {
    if (activePatternId === null) return;
    const exists = notesRef.current.some(
      n => n.trackId === trackId && n.patternId === activePatternId && n.step === step && n.pitch === pitch
    );
    if (exists) {
      conn.reducers.removeNote({ patternId: activePatternId, trackId, step, pitch });
    } else {
      conn.reducers.addNote({ patternId: activePatternId, trackId, step, pitch, velocity: 100 });
    }
  }, [activePatternId]);

  const handleToggleMute = useCallback((trackId: number) => {
    conn.reducers.toggleMute({ trackId });
  }, []);

  const handleVolumeChange = useCallback((trackId: number, volume: number) => {
    conn.reducers.setVolume({ trackId, volume });
  }, []);

  const handleRemoveTrack = useCallback((trackId: number) => {
    conn.reducers.removeTrack({ trackId });
  }, []);

  const handleAddTrack = useCallback(() => {
    const instrument = INSTRUMENTS[tracks.length % INSTRUMENTS.length];
    const color      = TRACK_COLORS[tracks.length % TRACK_COLORS.length];
    conn.reducers.createTrack({ sessionId: session.sessionId, instrument, color });
  }, [tracks, session.sessionId]);

  const handleLoadDemo = useCallback(async (demo: DemoPattern) => {
    if (activePatternId === null) return;
    await ensureAudioContext();
    if (session.isPlaying) {
      conn.reducers.setPlayback({ sessionId: session.sessionId, isPlaying: false, tempoBpm: demo.tempo });
    }
    conn.reducers.setPlayback({ sessionId: session.sessionId, isPlaying: false, tempoBpm: demo.tempo });
    conn.reducers.clearPatternNotes({ patternId: activePatternId });
    setTimeout(() => {
      for (const tp of demo.tracks) {
        const track = tracks.find(t => t.instrument === tp.instrument);
        if (!track) continue;
        for (const note of tp.notes) {
          conn.reducers.addNote({
            patternId: activePatternId,
            trackId: track.trackId,
            step: note.step,
            pitch: note.pitch,
            velocity: note.velocity,
          });
        }
      }
    }, 200);
  }, [session, tracks, activePatternId]);

  // Pattern management
  const handleSelectPattern = useCallback((patternId: number) => {
    setActivePatternId(patternId);
  }, []);

  const handleAddBlock = useCallback((patternId: number) => {
    const maxPos = arrangement.reduce((m, b) => Math.max(m, b.position), -1);
    conn.reducers.addArrangementBlock({ sessionId: session.sessionId, patternId, position: maxPos + 1 });
  }, [arrangement, session.sessionId]);

  const handleRemoveBlock = useCallback((blockId: number) => {
    conn.reducers.removeArrangementBlock({ blockId });
  }, []);

  const handleCreatePattern = useCallback(() => {
    const idx   = patterns.length;
    const name  = PATTERN_NAMES[idx] ?? `Pattern ${idx + 1}`;
    const color = PATTERN_COLORS[idx % PATTERN_COLORS.length];
    conn.reducers.createPattern({ sessionId: session.sessionId, name, color });
  }, [patterns, session.sessionId]);

  const handleAddBar = useCallback(() => {
    if (!activePattern) return;
    conn.reducers.setPatternBars({ patternId: activePattern.patternId, numBars: activePattern.numBars + 1 });
  }, [activePattern]);

  const handleRemoveBar = useCallback(() => {
    if (!activePattern || activePattern.numBars <= 1) return;
    conn.reducers.setPatternBars({ patternId: activePattern.patternId, numBars: activePattern.numBars - 1 });
  }, [activePattern]);

  const activeNotes = useMemo(
    () => notes.filter(n => n.patternId === activePatternId),
    [notes, activePatternId]
  );

  const gridContentW = totalSteps * CELL_W + 80; // extra for +bar button

  return (
    <div
      style={{
        display: "flex", flexDirection: "column", height: "100vh",
        overflow: "hidden", backgroundColor: "#0e0e14", color: "#c8c8d8",
      }}
    >
      {/* ── Top transport bar ─────────────────────────────────────── */}
      <PlaybackControls
        isPlaying={session.isPlaying}
        tempoBpm={session.tempoBpm}
        sessionName={session.name}
        activeStep={activeStep}
        stepsPerBeat={stepsPerBeat}
        timeSigTop={session.timeSigTop}
        timeSigBottom={session.timeSigBottom}
        onTogglePlay={handleTogglePlay}
        onBpmChange={handleBpmChange}
        onTimeSigChange={handleTimeSigChange}
        onLoadDemo={handleLoadDemo}
        users={users}
        tracks={tracks}
        myIdentity={myIdentity}
      />

      {/* ── Song arrangement strip ────────────────────────────────── */}
      <PatternArrangement
        patterns={patterns}
        arrangement={arrangement}
        activePatternId={activePatternId}
        playingBlockIdx={activeBlockIdx}
        onSelectPattern={handleSelectPattern}
        onAddBlock={handleAddBlock}
        onRemoveBlock={handleRemoveBlock}
        onCreatePattern={handleCreatePattern}
      />

      {/* Loading banner */}
      {!samplersReady && (
        <div
          className="flex items-center gap-2 px-4 py-1.5 text-xs"
          style={{ backgroundColor: "#0f1520", borderBottom: "1px solid #1a2a3a", color: "#4a8abf" }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Loading instrument samples...
        </div>
      )}

      {/* ── DAW main area ─────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", position: "relative" }}>

        {/* Beat ruler row — sticky top */}
        <div
          style={{
            display: "flex",
            position: "sticky",
            top: 0,
            zIndex: 20,
            minWidth: HEADER_W + gridContentW,
          }}
        >
          {/* Corner cell */}
          <div
            style={{
              width: HEADER_W,
              flexShrink: 0,
              position: "sticky",
              left: 0,
              zIndex: 25,
              backgroundColor: "#12121a",
              borderBottom: "1px solid #2a2a3a",
              borderRight: "1px solid #2a2a3a",
              height: RULER_H,
              display: "flex",
              alignItems: "center",
              paddingLeft: 10,
              gap: 6,
            }}
          >
            {activePattern && (
              <>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: activePattern.color }}
                />
                <span style={{ fontSize: 10, color: "#7070a0", fontWeight: 600 }}>
                  {activePattern.name} · {numBars} bar{numBars !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>

          {/* Ruler */}
          <BeatRuler
            totalSteps={totalSteps}
            stepsPerBar={stepsPerBar}
            stepsPerBeat={stepsPerBeat}
            activeStep={activeStep}
            onAddBar={handleAddBar}
            patternName={activePattern?.name ?? ""}
            numBars={numBars}
            canRemoveBar={numBars > 1}
            onRemoveBar={handleRemoveBar}
          />
        </div>

        {/* Track rows */}
        {tracks.map(track => {
          const owner      = users.find(u => u.identity.toHexString() === track.ownerIdentity.toHexString());
          const trackNotes = activeNotes.filter(n => n.trackId === track.trackId);
          const isActive   = track.trackId === activeTrackId;

          return (
            <div
              key={track.trackId}
              style={{
                display: "flex",
                minWidth: HEADER_W + gridContentW,
                borderBottom: "1px solid #1a1a28",
              }}
            >
              {/* Track header — sticky left */}
              <div
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 10,
                  flexShrink: 0,
                }}
              >
                <TrackHeader
                  track={track}
                  isOwn={track.ownerIdentity.toHexString() === myIdentity}
                  ownerName={owner?.username}
                  isActive={isActive}
                  onToggleMute={() => handleToggleMute(track.trackId)}
                  onVolumeChange={vol => handleVolumeChange(track.trackId, vol)}
                  onRemove={() => handleRemoveTrack(track.trackId)}
                  onClick={() => setActiveTrackId(id => id === track.trackId ? null : track.trackId)}
                />
              </div>

              {/* Grid */}
              <div style={{ paddingTop: 1, paddingBottom: 1 }}>
                {track.instrument === "drums" ? (
                  <DrumGrid
                    trackId={track.trackId}
                    notes={trackNotes}
                    trackColor={track.color}
                    activeStep={activeStep}
                    totalSteps={totalSteps}
                    stepsPerBar={stepsPerBar}
                    stepsPerBeat={stepsPerBeat}
                    myIdentity={myIdentity}
                    identityToName={identityToName}
                    onToggle={handleToggleNote(track.trackId)}
                  />
                ) : (
                  <StepGrid
                    instrument={track.instrument}
                    trackId={track.trackId}
                    notes={trackNotes}
                    color={track.color}
                    activeStep={activeStep}
                    totalSteps={totalSteps}
                    stepsPerBar={stepsPerBar}
                    stepsPerBeat={stepsPerBeat}
                    myIdentity={myIdentity}
                    identityToName={identityToName}
                    onToggle={handleToggleNote(track.trackId)}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Add track row */}
        {tracks.length < 8 && (
          <div
            style={{
              display: "flex",
              minWidth: HEADER_W + gridContentW,
              borderBottom: "1px solid #1a1a28",
            }}
          >
            <div
              style={{
                position: "sticky",
                left: 0,
                zIndex: 10,
                width: HEADER_W,
                flexShrink: 0,
              }}
            >
              <button
                onClick={handleAddTrack}
                style={{
                  width: HEADER_W,
                  height: 40,
                  backgroundColor: "#12121a",
                  color: "#4a4a6a",
                  border: "none",
                  borderLeft: "3px solid #2a2a3a",
                  cursor: "pointer",
                  fontSize: 12,
                  textAlign: "left",
                  paddingLeft: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#8080b0")}
                onMouseLeave={e => (e.currentTarget.style.color = "#4a4a6a")}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                <span>Add Track</span>
              </button>
            </div>
          </div>
        )}

        {/* Spacer at bottom */}
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
