import React, { useEffect, useRef, useState } from "react";
import { createShareLink } from "../collaboration/shareLink";

interface Props {
  sessionId: number;
  sessionName: string;
  onClose: () => void;
}

export default function ShareDialog({ sessionId, sessionName, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "manual">("idle");
  const link = createShareLink(sessionId);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    headingRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex="0"]'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopyStatus("copied");
    } catch {
      linkRef.current?.focus();
      linkRef.current?.select();
      setCopyStatus("manual");
    }
  };

  return (
    <div
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto", padding: 20, background: "#05040aca" }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        style={{ width: "100%", maxWidth: 440, maxHeight: "calc(100vh - 40px)", overflowY: "auto", boxSizing: "border-box", borderRadius: 16, padding: 24, color: "#e8e0f8", background: "#171221", border: "1px solid #453464", boxShadow: "0 24px 70px #0009" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h2 ref={headingRef} tabIndex={-1} id="share-dialog-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, outline: "none" }}>Invite collaborators</h2>
            <p style={{ margin: "5px 0 0", color: "#a89bbc", fontSize: 13, overflowWrap: "anywhere" }}>{sessionName}</p>
          </div>
          <button onClick={onClose} aria-label="Close share dialog" style={{ flexShrink: 0, border: 0, background: "transparent", color: "#ac9abd", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ marginTop: 24, padding: 14, borderRadius: 10, background: "#211a30", border: "1px solid #3b2c55" }}>
          <div style={{ color: "#e0d3fa", fontSize: 13, fontWeight: 700 }}>Anyone with this link · Can edit</div>
          <p style={{ margin: "5px 0 0", color: "#a89bbc", fontSize: 12, lineHeight: 1.5 }}>
            People who open this link enter a stage name, then join the same music project.
          </p>
        </div>

        <label htmlFor="share-link" style={{ display: "block", marginTop: 22, marginBottom: 8, color: "#b8a9ca", fontSize: 12, fontWeight: 600 }}>Project link</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={linkRef}
            id="share-link"
            readOnly
            value={link}
            onFocus={event => event.currentTarget.select()}
            style={{ minWidth: 0, flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #463458", background: "#0f0b18", color: "#d0c2e4", fontSize: 12 }}
          />
          <button onClick={copyLink} style={{ flexShrink: 0, border: 0, borderRadius: 8, padding: "10px 15px", background: "#7c3aed", color: "white", fontWeight: 700, cursor: "pointer" }}>
            {copyStatus === "copied" ? "Copied!" : "Copy link"}
          </button>
        </div>
        <p role="status" aria-live="polite" style={{ minHeight: 18, margin: "8px 0 0", color: copyStatus === "manual" ? "#fbbf24" : "#86efac", fontSize: 12 }}>
          {copyStatus === "manual" ? "Copy is unavailable here. The link is selected so you can copy it manually." : copyStatus === "copied" ? "Link copied to clipboard." : ""}
        </p>
        <p style={{ margin: "13px 0 0", color: "#84758f", fontSize: 11, lineHeight: 1.5 }}>
          Prototype access is open: projects are also visible from the home page. Anyone can edit them.
        </p>
      </div>
    </div>
  );
}
