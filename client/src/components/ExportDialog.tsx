import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ArrangementBlock, Note, Pattern, Session, Track } from "../spacetime/client";
import {
  createExportSnapshot, downloadWav, ExportCancelledError,
  getExportSummary, renderWav,
} from "../audio/wavExport";

interface Props {
  session: Session;
  tracks: Track[];
  notes: Note[];
  patterns: Pattern[];
  arrangement: ArrangementBlock[];
  onClose: () => void;
}

type Phase = "idle" | "generating" | "cancelling" | "cancelled" | "success" | "error";

function formatDuration(seconds: number): string {
  const rounded = Math.ceil(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

export default function ExportDialog({ session, tracks, notes, patterns, arrangement, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [exportedName, setExportedName] = useState("");
  const controller = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const summary = useMemo(
    () => getExportSummary(createExportSnapshot(session, tracks, notes, patterns, arrangement)),
    [session, tracks, notes, patterns, arrangement]
  );

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    heading.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (controller.current) {
          controller.current.abort();
          setPhase("cancelling");
        } else onClose();
      }
      if (event.key !== "Tab") return;
      const focusable = dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      controller.current?.abort();
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const startExport = async () => {
    // Copy all song data before any async work so later collaborator edits cannot enter this file.
    const snapshot = createExportSnapshot(session, tracks, notes, patterns, arrangement);
    const currentSummary = getExportSummary(snapshot);
    if (currentSummary.playableNotes === 0 || currentSummary.tooLong) return;
    const nextController = new AbortController();
    controller.current = nextController;
    setPhase("generating");
    setError("");
    try {
      const wav = await renderWav(snapshot, nextController.signal);
      if (nextController.signal.aborted) throw new ExportCancelledError();
      downloadWav(wav, snapshot.name);
      setExportedName(snapshot.name);
      setPhase("success");
    } catch (reason) {
      if (reason instanceof ExportCancelledError || nextController.signal.aborted) {
        setPhase("cancelled");
      } else {
        setError(reason instanceof Error ? reason.message : "WAV export failed. Please try again.");
        setPhase("error");
      }
    } finally {
      if (controller.current === nextController) controller.current = null;
    }
  };

  const busy = phase === "generating" || phase === "cancelling";
  const disabledReason = summary.playableNotes === 0
    ? "Add at least one audible note to the Song arrangement to export. Muted tracks and zero volume do not count."
    : summary.tooLong
      ? "This arrangement exceeds the 5-minute limit. Remove sections or increase the tempo, then try again."
      : "";

  return (
    <div
      onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "#05040aca" }}
    >
      <div
        ref={dialog} role="dialog" aria-modal="true" aria-labelledby="export-dialog-title"
        style={{ width: "100%", maxWidth: 440, maxHeight: "calc(100vh - 40px)", overflowY: "auto", boxSizing: "border-box", borderRadius: 16, padding: 24, color: "#e8e0f8", background: "#171221", border: "1px solid #453464", boxShadow: "0 24px 70px #0009" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h2 ref={heading} tabIndex={-1} id="export-dialog-title" style={{ margin: 0, fontSize: 20, outline: "none" }}>Export WAV</h2>
            <p style={{ margin: "5px 0 0", color: "#a89bbc", fontSize: 13 }}>{session.name}</p>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Close export dialog" style={{ flexShrink: 0, border: 0, background: "transparent", color: "#ac9abd", fontSize: 22, cursor: busy ? "default" : "pointer", opacity: busy ? 0.4 : 1 }}>×</button>
        </div>

        <div style={{ marginTop: 22, padding: 16, borderRadius: 10, background: "#211a30", border: "1px solid #3b2c55", display: "grid", gap: 10, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#a89bbc" }}>Song length</span><strong>{formatDuration(summary.arrangementSeconds)}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#a89bbc" }}>File length with tail</span><strong>{formatDuration(summary.outputSeconds)}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#a89bbc" }}>Format</span><strong>WAV · 44.1 kHz · 16-bit stereo</strong></div>
        </div>

        <p style={{ margin: "14px 0", fontSize: 12, lineHeight: 1.5, color: "#a89bbc" }}>
          Exports the full Song arrangement using shared track volumes. The file downloads to your device.
        </p>
        <p style={{ margin: "-5px 0 14px", fontSize: 11, lineHeight: 1.5, color: "#84758f" }}>
          Sample credits: <a href="https://github.com/Tonejs/audio/tree/master/salamander" target="_blank" rel="noreferrer" style={{ color: "#bca7e8" }}>Salamander Piano · Alexander Holm</a> and <a href="https://github.com/nbrosowsky/tonejs-instruments" target="_blank" rel="noreferrer" style={{ color: "#bca7e8" }}>electric guitar · Karoryfer / tonejs-instruments</a> (CC BY 3.0).
        </p>
        {disabledReason && <p role="status" style={{ color: "#fbbf24", fontSize: 12, lineHeight: 1.5 }}>{disabledReason}</p>}
        {phase === "generating" && <p role="status" style={{ color: "#c4b5fd", fontSize: 12 }}>Generating audio… Keep this project open.</p>}
        {phase === "cancelling" && <p role="status" style={{ color: "#c4b5fd", fontSize: 12 }}>Stopping export…</p>}
        {phase === "cancelled" && <p role="status" style={{ color: "#c4b5fd", fontSize: 12 }}>Export cancelled. No file was downloaded.</p>}
        {phase === "error" && <p role="alert" style={{ color: "#fca5a5", fontSize: 12, overflowWrap: "anywhere" }}>{error}</p>}
        {phase === "success" && <p role="status" style={{ color: "#86efac", fontSize: 12 }}>Download ready for {exportedName}.</p>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22 }}>
          {phase === "generating" ? (
            <button onClick={() => { controller.current?.abort(); setPhase("cancelling"); }} style={secondaryButton}>Cancel export</button>
          ) : (
            <button onClick={onClose} disabled={phase === "cancelling"} style={secondaryButton}>Close</button>
          )}
          <button onClick={startExport} disabled={busy || !!disabledReason} style={{ ...primaryButton, opacity: busy || disabledReason ? 0.45 : 1, cursor: busy || disabledReason ? "not-allowed" : "pointer" }}>
            {phase === "error" || phase === "cancelled" ? "Retry export" : phase === "success" ? "Export again" : "Download WAV"}
          </button>
        </div>
      </div>
    </div>
  );
}

const secondaryButton: React.CSSProperties = { border: "1px solid #514265", borderRadius: 8, padding: "9px 14px", background: "#241d30", color: "#dbccef", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const primaryButton: React.CSSProperties = { border: 0, borderRadius: 8, padding: "9px 14px", background: "#7135cd", color: "white", fontSize: 12, fontWeight: 700 };
