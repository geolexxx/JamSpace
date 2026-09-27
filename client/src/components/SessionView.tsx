import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import PlaybackControls from "./PlaybackControls";
import ShareDialog from "./ShareDialog";
import ExportDialog from "./ExportDialog";
import ContinueMelodyDialog from "./ContinueMelodyDialog";
import PatternArrangement from "./PatternArrangement";
import BeatRuler, { CELL_W, RULER_H } from "./BeatRuler";
import TrackHeader, { HEADER_W } from "./TrackHeader";
import DrumGrid from "./DrumGrid";
import StepGrid, { melodyGridPitches } from "./StepGrid";
import { generateMelodyContinuations, type MelodyContinuation, type MelodyNote } from "../ai/continueMelody";
import { notesForMelodyPreview, playMelodyPreview } from "../audio/melodyPreview";
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
const INSTRUMENT_OPTIONS = [
  { value: "drums", emoji: "🥁", label: "Drums" },
  { value: "bass",  emoji: "🎸", label: "Bass" },
  { value: "synth", emoji: "🎹", label: "Synth" },
  { value: "lead",  emoji: "🎺", label: "Lead" },
];

interface MelodyGenerationSnapshot {
  patternId: number;
  trackId: number;
  sourceBar: number;
  expectedNumBars: number;
  expectedStepsPerBar: number;
  expectedSource: MelodyNote[];
  sourceRows: Note[];
}

function melodyApplyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/unknown reducer|reducer not found|no such reducer|reducer does not exist|not registered/i.test(message)) {
    return "This workspace needs the JamSpace 1.1 database update before you can apply suggestions.";
  }
  if (/websocket|disconnect|network/i.test(message)) {
    return "Connection lost. Check the grid before trying again; the save may have completed.";
  }
  return message || "Could not add the melody. Please try again.";
}

interface Props {
  session:      Session;
  tracks:       Track[];
  notes:        Note[];
  users:        UserPresence[];
  patterns:     Pattern[];
  arrangement:  ArrangementBlock[];
  myIdentity:   string;
  onBackToHome: () => void;
}

export default function SessionView({
  session, tracks, notes, users, patterns, arrangement, myIdentity, onBackToHome,
}: Props) {
  const [activeStep,      setActiveStep]      = useState(-1);
  const [activeBlockIdx,  setActiveBlockIdx]  = useState(-1);
  const [activePatternId, setActivePatternId] = useState<number | null>(null);
  const [activeTrackId,   setActiveTrackId]   = useState<number | null>(null);
  const [samplersReady,   setSamplersReady]   = useState(isSamplersReady);
  const [showAddTrack,    setShowAddTrack]    = useState(false);
  const [showShare,       setShowShare]       = useState(false);
  const [showExport,      setShowExport]      = useState(false);
  const [showMelody,      setShowMelody]      = useState(false);
  const showMelodyRef = useRef(false);
  const [melodyTrackId,   setMelodyTrackId]   = useState<number | null>(null);
  const [melodyCandidates, setMelodyCandidates] = useState<MelodyContinuation[]>([]);
  const [melodyError,     setMelodyError]     = useState("");
  const [melodyGenerating, setMelodyGenerating] = useState(false);
  const [melodyApplying, setMelodyApplying] = useState(false);
  const [playingCandidateId, setPlayingCandidateId] = useState<string | null>(null);
  const melodySnapshotRef = useRef<MelodyGenerationSnapshot | null>(null);
  const melodyVariationRef = useRef(0);
  const melodyPreviewStopRef = useRef<(() => void) | null>(null);
  const melodyPreviewTimerRef = useRef<number | null>(null);
  const melodyPreviewTokenRef = useRef(0);
  const closeShare = useCallback(() => setShowShare(false), []);
  const closeExport = useCallback(() => setShowExport(false), []);

  // Personal vs Sync mode (persisted in localStorage)
  const [playbackMode, setPlaybackMode] = useState<"personal" | "sync">(
    () => (localStorage.getItem("jamspace_mode") as "personal" | "sync") ?? "sync"
  );
  // Local-only play state (used in personal mode)
  const [localPlaying, setLocalPlaying] = useState(false);
  // Local volume overrides per trackId (personal mode only)
  const [localVolumes, setLocalVolumes] = useState<Map<number, number>>(new Map());

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

  // liveData is kept fresh by the effectiveTracks effect below

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

  const startLocalPlayback = useCallback(() => {
    ensureAudioContext().then(() => {
      const spb = calcStepsPerBar(session.timeSigTop, session.timeSigBottom);
      startPlayback(
        notesRef.current, tracksRef.current, arrangementRef.current, patternsRef.current,
        spb, session.tempoBpm, session.timeSigTop, session.timeSigBottom,
        (step, blockIdx) => {
          setActiveStep(step);
          setActiveBlockIdx(blockIdx);
          if (blockIdx >= 0) {
            const sorted = [...arrangementRef.current].sort((a, b) => a.position - b.position || a.blockId - b.blockId);
            const block  = sorted[blockIdx];
            if (block && block.patternId !== activePatternIdRef.current && !showMelodyRef.current) {
              setActivePatternId(block.patternId);
            }
          }
        }
      );
    });
  }, [session.timeSigTop, session.timeSigBottom, session.tempoBpm]);

  // Sync mode: follow server state
  useEffect(() => {
    if (playbackMode !== "sync") return;
    if (session.isPlaying) {
      startLocalPlayback();
    } else {
      stopPlayback();
      setActiveStep(-1);
      setActiveBlockIdx(-1);
    }
  }, [session.isPlaying, playbackMode]);

  // Personal mode: follow local state
  useEffect(() => {
    if (playbackMode !== "personal") return;
    if (localPlaying) {
      startLocalPlayback();
    } else {
      stopPlayback();
      setActiveStep(-1);
      setActiveBlockIdx(-1);
    }
  }, [localPlaying, playbackMode]);

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
    if (playbackMode === "sync") {
      conn.reducers.setPlayback({ sessionId: session.sessionId, isPlaying: !session.isPlaying, tempoBpm: session.tempoBpm });
    } else {
      setLocalPlaying(v => !v);
    }
  }, [session, playbackMode]);

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
      conn.reducers.addNote({ patternId: activePatternId, trackId, step, pitch, velocity: 100, duration: 1 });
    }
  }, [activePatternId]);

  const handleAddNote = useCallback((trackId: number) => (step: number, pitch: number, duration: number) => {
    if (activePatternId === null) return;
    conn.reducers.addNote({ patternId: activePatternId, trackId, step, pitch, velocity: 100, duration });
  }, [activePatternId]);

  const handleRemoveNote = useCallback((trackId: number) => (step: number, pitch: number) => {
    if (activePatternId === null) return;
    conn.reducers.removeNote({ patternId: activePatternId, trackId, step, pitch });
  }, [activePatternId]);

  const handleToggleMute = useCallback((trackId: number) => {
    conn.reducers.toggleMute({ trackId });
  }, []);

  const handleVolumeChange = useCallback((trackId: number, volume: number) => {
    if (playbackMode === "sync") {
      conn.reducers.setVolume({ trackId, volume });
    } else {
      setLocalVolumes(prev => new Map(prev).set(trackId, volume));
    }
  }, [playbackMode]);

  const handleRemoveTrack = useCallback((trackId: number) => {
    conn.reducers.removeTrack({ trackId });
  }, []);

  const handleAddTrack = useCallback((instrument: string) => {
    const color = TRACK_COLORS[tracks.length % TRACK_COLORS.length];
    conn.reducers.createTrack({ sessionId: session.sessionId, instrument, color });
    setShowAddTrack(false);
  }, [tracks, session.sessionId]);

  const handleToggleMode = useCallback(() => {
    setPlaybackMode(m => {
      // When switching away from sync mode, stop server playback
      if (m === "sync" && session.isPlaying) {
        conn.reducers.setPlayback({ sessionId: session.sessionId, isPlaying: false, tempoBpm: session.tempoBpm });
      }
      // When switching away from personal mode, stop local playback
      if (m === "personal") setLocalPlaying(false);
      const next = m === "sync" ? "personal" : "sync";
      localStorage.setItem("jamspace_mode", next);
      return next;
    });
  }, [session]);

  const handleLoadDemo = useCallback(async (demo: DemoPattern) => {
    if (activePatternId === null) return;
    await ensureAudioContext();
    if (session.isPlaying) {
      conn.reducers.setPlayback({ sessionId: session.sessionId, isPlaying: false, tempoBpm: demo.tempo });
    }
    conn.reducers.setPlayback({ sessionId: session.sessionId, isPlaying: false, tempoBpm: demo.tempo });
    conn.reducers.clearPatternNotes({ patternId: activePatternId });
    conn.reducers.setPatternBars({ patternId: activePatternId, numBars: demo.numBars ?? 1 });
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
            duration: note.duration ?? 1,
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

  // In personal mode, apply local volume overrides to tracks for display + scheduler.
  const effectiveTracks = useMemo(() => {
    if (playbackMode === "sync" || localVolumes.size === 0) return tracks;
    return tracks.map(t => {
      const lv = localVolumes.get(t.trackId);
      return lv !== undefined ? { ...t, volume: lv } : t;
    });
  }, [tracks, localVolumes, playbackMode]);

  const melodicTracks = useMemo(() => tracks.filter(track => track.instrument !== "drums"), [tracks]);
  const selectedMelodyTrack = useMemo(() => {
    const selected = melodicTracks.find(track => track.trackId === melodyTrackId);
    if (selected) return selected;
    const active = melodicTracks.find(track => track.trackId === activeTrackId);
    if (active) return active;
    const withNotes = melodicTracks.find(track => activeNotes.some(note => note.trackId === track.trackId));
    return withNotes ?? melodicTracks[0] ?? null;
  }, [melodicTracks, melodyTrackId, activeTrackId, activeNotes]);
  const melodyTrackNotes = useMemo(
    () => activeNotes.filter(note => note.trackId === selectedMelodyTrack?.trackId && note.step < (activePattern?.numBars ?? 0) * stepsPerBar),
    [activeNotes, selectedMelodyTrack, activePattern, stepsPerBar],
  );
  const melodySourceBar = melodyTrackNotes.length
    ? Math.max(...melodyTrackNotes.map(note => Math.floor(note.step / stepsPerBar)))
    : 0;
  const melodySourceNotes = melodyTrackNotes.filter(note => Math.floor(note.step / stepsPerBar) === melodySourceBar);
  const melodyTargetStart = (melodySourceBar + 1) * stepsPerBar;
  const melodyTargetEnd = melodyTargetStart + 4 * stepsPerBar;
  const melodyDisabledReason = !activePattern || !selectedMelodyTrack
    ? "Choose a pattern and a melodic track first."
    : melodySourceNotes.length > 64
      ? "This bar has too many notes to continue. Simplify it to 64 notes or fewer."
    : melodySourceBar + 5 > 32
      ? "Four more bars would exceed this pattern's 32-bar limit."
      : activeNotes.some(note => note.trackId === selectedMelodyTrack.trackId && note.step < melodyTargetEnd && note.step + note.duration > melodyTargetStart)
        ? "The next four bars already contain notes. Edit those notes before continuing."
        : "";

  const stopMelodyPreview = useCallback(() => {
    melodyPreviewTokenRef.current += 1;
    melodyPreviewStopRef.current?.();
    melodyPreviewStopRef.current = null;
    if (melodyPreviewTimerRef.current !== null) window.clearTimeout(melodyPreviewTimerRef.current);
    melodyPreviewTimerRef.current = null;
    setPlayingCandidateId(null);
  }, []);

  const closeMelody = useCallback(() => {
    showMelodyRef.current = false;
    stopMelodyPreview();
    setShowMelody(false);
    setMelodyError("");
    setMelodyCandidates([]);
    melodySnapshotRef.current = null;
  }, [stopMelodyPreview]);

  const generateMelody = useCallback(() => {
    stopMelodyPreview();
    setMelodyError("");
    setMelodyGenerating(true);
    try {
      if (!activePattern || !selectedMelodyTrack || melodyDisabledReason) {
        throw new Error(melodyDisabledReason || "Choose a melodic track first.");
      }
      const source = melodySourceNotes.map(({ step, pitch, velocity, duration }) => ({ step, pitch, velocity, duration }));
      const context = activeNotes
        .filter(note => note.trackId !== selectedMelodyTrack.trackId && tracks.some(track => track.trackId === note.trackId && track.instrument !== "drums"))
        .map(({ step, pitch, velocity, duration }) => ({ step, pitch, velocity, duration }));
      const candidates = generateMelodyContinuations({
        sourceNotes: source,
        contextNotes: context,
        sourceBar: melodySourceBar,
        stepsPerBar,
        tempoBpm: session.tempoBpm,
        allowedPitches: melodyGridPitches(selectedMelodyTrack.instrument),
        variationSeed: melodyVariationRef.current++,
      });
      melodySnapshotRef.current = {
        patternId: activePattern.patternId,
        trackId: selectedMelodyTrack.trackId,
        sourceBar: melodySourceBar,
        expectedNumBars: activePattern.numBars,
        expectedStepsPerBar: stepsPerBar,
        expectedSource: source,
        sourceRows: [...melodySourceNotes],
      };
      setMelodyCandidates(candidates);
    } catch (error) {
      setMelodyCandidates([]);
      setMelodyError(error instanceof Error ? error.message : "Could not create melody suggestions.");
    } finally {
      setMelodyGenerating(false);
    }
  }, [activeNotes, activePattern, melodyDisabledReason, melodySourceBar, melodySourceNotes, selectedMelodyTrack, session.tempoBpm, stepsPerBar, stopMelodyPreview, tracks]);

  const openMelody = useCallback(() => {
    showMelodyRef.current = true;
    setShowMelody(true);
    generateMelody();
  }, [generateMelody]);

  const previewMelody = useCallback(async (candidate: MelodyContinuation) => {
    const snapshot = melodySnapshotRef.current;
    if (!snapshot || !activePattern || snapshot.patternId !== activePattern.patternId) return;
    stopMelodyPreview();
    setMelodyError("");
    const token = melodyPreviewTokenRef.current;
    setPlayingCandidateId(candidate.id);
    try {
      const fromStep = snapshot.sourceBar * snapshot.expectedStepsPerBar;
      const toStep = fromStep + 5 * snapshot.expectedStepsPerBar;
      const sourceNotes = snapshot.sourceRows;
      const contextNotes = activeNotes.filter(note => note.trackId !== snapshot.trackId);
      const previewNotes = notesForMelodyPreview(sourceNotes, contextNotes, effectiveTracks, snapshot.trackId, fromStep, toStep, candidate.notes);
      const stop = await playMelodyPreview(previewNotes, fromStep, toStep, session.tempoBpm);
      if (token !== melodyPreviewTokenRef.current) { stop(); return; }
      melodyPreviewStopRef.current = stop;
      melodyPreviewTimerRef.current = window.setTimeout(stopMelodyPreview, (toStep - fromStep) * 60 / session.tempoBpm / 4 * 1000 + 300);
    } catch {
      if (token === melodyPreviewTokenRef.current) {
        setPlayingCandidateId(null);
        setMelodyError("Audio preview could not start. You can still view the notes.");
      }
    }
  }, [activeNotes, activePattern, effectiveTracks, session.tempoBpm, stopMelodyPreview]);

  const applyMelody = useCallback(async (candidate: MelodyContinuation) => {
    const snapshot = melodySnapshotRef.current;
    if (!snapshot || !melodyCandidates.some(item => item === candidate)) return;
    if (snapshot.patternId !== activePatternId || snapshot.trackId !== selectedMelodyTrack?.trackId) {
      setMelodyError("The selected pattern or track changed. Create suggestions again.");
      return;
    }
    stopMelodyPreview();
    setMelodyError("");
    setMelodyApplying(true);
    try {
      await conn.reducers.applyMelodyContinuation({
        patternId: snapshot.patternId,
        trackId: snapshot.trackId,
        sourceBar: snapshot.sourceBar,
        expectedNumBars: snapshot.expectedNumBars,
        expectedStepsPerBar: snapshot.expectedStepsPerBar,
        expectedSource: snapshot.expectedSource,
        notes: candidate.notes,
      });
      closeMelody();
    } catch (error) {
      setMelodyError(melodyApplyError(error));
    } finally {
      setMelodyApplying(false);
    }
  }, [activePatternId, closeMelody, conn, melodyCandidates, selectedMelodyTrack, stopMelodyPreview]);

  useEffect(() => () => {
    melodyPreviewTokenRef.current += 1;
    melodyPreviewStopRef.current?.();
    if (melodyPreviewTimerRef.current !== null) window.clearTimeout(melodyPreviewTimerRef.current);
  }, []);

  // Keep scheduler in sync with effective tracks
  useEffect(() => {
    updateLiveData(notes, effectiveTracks, arrangement, patterns, stepsPerBar);
  }, [notes, effectiveTracks, arrangement, patterns, stepsPerBar]);

  const isEffectivelyPlaying = playbackMode === "sync" ? session.isPlaying : localPlaying;

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
        isPlaying={isEffectivelyPlaying}
        tempoBpm={session.tempoBpm}
        sessionName={session.name}
        activeStep={activeStep}
        stepsPerBeat={stepsPerBeat}
        timeSigTop={session.timeSigTop}
        timeSigBottom={session.timeSigBottom}
        playbackMode={playbackMode}
        onTogglePlay={handleTogglePlay}
        onBpmChange={handleBpmChange}
        onTimeSigChange={handleTimeSigChange}
        onLoadDemo={handleLoadDemo}
        onToggleMode={handleToggleMode}
        onBackToHome={onBackToHome}
        onShare={() => setShowShare(true)}
        onExport={() => setShowExport(true)}
        users={users}
        tracks={tracks}
        myIdentity={myIdentity}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 12px", background: "#12121c", borderBottom: "1px solid #292941", flexShrink: 0, minHeight: 42 }}>
        <span style={{ color: "#a78bfa", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>✦ Melody ideas</span>
        <select
          aria-label="Track to continue"
          value={selectedMelodyTrack?.trackId ?? ""}
          onChange={event => { setMelodyTrackId(Number(event.target.value)); closeMelody(); }}
          disabled={melodicTracks.length === 0}
          style={{ background: "#1c1c2a", border: "1px solid #383850", borderRadius: 5, color: "#ddddef", padding: "4px 7px", fontSize: 11, maxWidth: 130 }}
        >
          {melodicTracks.length === 0 && <option value="">No melodic track</option>}
          {melodicTracks.map(track => <option key={track.trackId} value={track.trackId}>{track.instrument} track</option>)}
        </select>
        <button type="button" onClick={openMelody} disabled={!activePattern || !selectedMelodyTrack}
          style={{ background: "#7455d7", border: 0, borderRadius: 6, color: "white", padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", opacity: !activePattern || !selectedMelodyTrack ? 0.45 : 1 }}>
          Continue my melody
        </button>
        <span style={{ fontSize: 11, color: "#72728e", whiteSpace: "nowrap" }}>Uses your latest bar in this pattern · adds four bars</span>
      </div>

      {showShare && (
        <ShareDialog sessionId={session.sessionId} sessionName={session.name} onClose={closeShare} />
      )}
      {showExport && (
        <ExportDialog session={session} tracks={tracks} notes={notes} patterns={patterns} arrangement={arrangement} onClose={closeExport} />
      )}
      {showMelody && (
        <ContinueMelodyDialog
          trackName={`${selectedMelodyTrack?.instrument ?? "Melody"} track`}
          sourceBar={melodySnapshotRef.current?.sourceBar ?? melodySourceBar}
          stepsPerBar={melodySnapshotRef.current?.expectedStepsPerBar ?? stepsPerBar}
          sourceNoteCount={melodySnapshotRef.current?.expectedSource.length ?? melodySourceNotes.length}
          patternUseCount={arrangement.filter(block => block.patternId === activePattern?.patternId).length}
          candidates={melodyCandidates}
          isGenerating={melodyGenerating}
          isApplying={melodyApplying}
          playingCandidateId={playingCandidateId}
          error={melodyError}
          disabledReason={melodyDisabledReason}
          onGenerate={generateMelody}
          onPreview={previewMelody}
          onStopPreview={stopMelodyPreview}
          onApply={applyMelody}
          onClose={closeMelody}
        />
      )}


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
                  Song · {numBars} bar{numBars !== 1 ? "s" : ""}
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
          const displayVol = playbackMode === "personal"
            ? (localVolumes.get(track.trackId) ?? track.volume)
            : track.volume;
          const displayTrack = { ...track, volume: displayVol };

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
                  track={displayTrack}
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
                    onAddNote={handleAddNote(track.trackId)}
                    onRemoveNote={handleRemoveNote(track.trackId)}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Add track row */}
        {tracks.length < 8 && (
          <div style={{ display: "flex", minWidth: HEADER_W + gridContentW, borderBottom: "1px solid #1a1a28" }}>
            <div style={{ position: "relative", left: 0, zIndex: 15, width: HEADER_W, flexShrink: 0 }}>
              <button
                onClick={() => setShowAddTrack(v => !v)}
                style={{
                  width: HEADER_W, height: 40,
                  backgroundColor: showAddTrack ? "#1a1a2a" : "#12121a",
                  color: "#4a4a6a", border: "none",
                  borderLeft: "3px solid #2a2a3a", cursor: "pointer",
                  fontSize: 12, textAlign: "left" as const, paddingLeft: 14,
                  display: "flex", alignItems: "center", gap: 8, transition: "color 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#8080b0")}
                onMouseLeave={e => (e.currentTarget.style.color = "#4a4a6a")}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                <span>Add Track</span>
              </button>

              {showAddTrack && (
                <div
                  style={{
                    position: "absolute", top: "100%", left: 0,
                    backgroundColor: "#14141e", border: "1px solid #2a2a3a",
                    borderRadius: 8, zIndex: 200, overflow: "hidden",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.8)", minWidth: HEADER_W,
                  }}
                >
                  {INSTRUMENT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleAddTrack(opt.value)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        width: "100%", padding: "9px 14px",
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 13, textAlign: "left" as const,
                        transition: "background-color 0.1s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#1e1e2e")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <span style={{ fontSize: 16 }}>{opt.emoji}</span>
                      <span style={{ color: "#c0c0d8", fontWeight: 500 }}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Spacer at bottom */}
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
