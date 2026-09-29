import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "../spacetime/client";
import ShareDialog from "./ShareDialog";
import "./JoinModal.css";

interface Props {
  sessions: Session[];
  sessionsReady: boolean;
  sessionsError: boolean;
  sharedLink: { hasLink: boolean; sessionId: number | null };
  onJoin: (username: string, sessionId: number) => void;
  onCreate: (username: string, projectName: string) => void;
  onDismissSharedLink: () => void;
}

type IconName = "music" | "grid" | "list" | "plus" | "search" | "arrow" | "share" | "close" | "spark";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    list: <><path d="M9 6h12M9 12h12M9 18h12" /><path d="M3 6h.01M3 12h.01M3 18h.01" strokeWidth="3" strokeLinecap="round" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    share: <><path d="M12 16V3m-5 5 5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></>,
    close: <path d="M5 5 19 19M19 5 5 19" />,
    spark: <><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" /><path d="m20 16 .7 2.3L23 19l-2.3.7L20 22l-.7-2.3L17 19l2.3-.7L20 16Z" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const PLACEHOLDER_NAMES = ["Jimi", "Billie", "Freddie", "Nina", "Miles", "Björk", "Prince", "Stevie"];
const WAVE_HEIGHTS = Array.from({ length: 27 }, (_, index) => 16 + Math.round(Math.abs(Math.sin(index * 1.83) * Math.cos(index * 0.34)) * 53));

function Waveform({ hero = false }: { hero?: boolean }) {
  return <div className={hero ? "js-wave js-wave-hero" : "js-wave"} aria-hidden="true">{WAVE_HEIGHTS.map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div>;
}

function ProjectArtwork({ sessionId }: { sessionId: number }) {
  return <div className={`js-project-art js-art-${sessionId % 6}`} aria-hidden="true"><div className="js-art-orbit js-art-orbit-one" /><div className="js-art-orbit js-art-orbit-two" /><div className="js-art-mark"><Icon name="music" size={26} /></div><Waveform /></div>;
}

function CreateProjectDialog({ stageName, onClose, onCreate }: { stageName: string; onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])");
      if (!focusable?.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable[focusable.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) { event.preventDefault(); focusable[0].focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
  }, [onClose]);

  return <div className="js-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="js-create-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="js-create-title">
      <button className="js-icon-button js-dialog-close" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
      <div className="js-dialog-icon"><Icon name="music" size={25} /></div>
      <h2 id="js-create-title">Create a new project</h2>
      <p>Start a space for your next idea. You can invite collaborators once you’re in.</p>
      <form onSubmit={event => { event.preventDefault(); onCreate(name.trim() || "My Jam Session"); }}>
        <label htmlFor="js-project-name">Project name</label>
        <input id="js-project-name" ref={inputRef} value={name} onChange={event => setName(event.target.value)} placeholder="My Jam Session" maxLength={80} />
        <div className="js-create-as">You’ll join as <strong>{stageName}</strong></div>
        <div className="js-dialog-actions"><button className="js-button js-button-secondary" type="button" onClick={onClose}>Cancel</button><button className="js-button js-button-primary" type="submit">Create & open <Icon name="arrow" size={16} /></button></div>
      </form>
    </div>
  </div>;
}

export default function JoinModal({ sessions, sessionsReady, sessionsError, sharedLink, onJoin, onCreate, onDismissSharedLink }: Props) {
  const [username, setUsername] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [creating, setCreating] = useState(false);
  const [sharingSession, setSharingSession] = useState<Session | null>(null);
  const placeholder = useRef(PLACEHOLDER_NAMES[Math.floor(Math.random() * PLACEHOLDER_NAMES.length)]).current;
  const closeShare = useCallback(() => setSharingSession(null), []);
  const closeCreate = useCallback(() => setCreating(false), []);
  const effectiveName = username.trim() || placeholder;
  const sharedSession = sessions.find(session => session.sessionId === sharedLink.sessionId);
  const visibleSessions = [...sessions].sort((a, b) => b.sessionId - a.sessionId).filter(session => session.name.toLowerCase().includes(search.trim().toLowerCase()));
  const canCreate = sessionsReady && !sessionsError;
  const handleJoin = (sessionId: number) => onJoin(effectiveName, sessionId);

  return <div className="js-workspace">
    <aside className="js-sidebar">
      <div className="js-brand"><img className="js-brand-icon" src="/jamspace-treble-mark.png" alt="" /><span>JamSpace</span><span className="js-brand-version">1.1</span></div>
      <div className="js-sidebar-section-label">WORKSPACE</div>
      <nav aria-label="Workspace navigation" className="js-sidebar-nav">
        <button className={`js-nav-item ${sharedLink.hasLink ? "" : "js-nav-item-active"}`} onClick={sharedLink.hasLink ? onDismissSharedLink : undefined} aria-current={!sharedLink.hasLink ? "page" : undefined}><Icon name="grid" size={17} /> Projects</button>
        <button className="js-nav-item" disabled={!canCreate} onClick={() => { if (sharedLink.hasLink) onDismissSharedLink(); setCreating(true); }}><Icon name="plus" size={17} /> New project</button>
      </nav>
      <div className="js-sidebar-bottom"><div className="js-access-note"><span className="js-access-dot" /><strong>Open collaboration</strong><p>Projects in this prototype are visible and editable by anyone.</p></div><div className="js-sidebar-footer">Make something together.</div></div>
    </aside>

    <main className="js-main">
      <header className="js-topbar"><div className="js-breadcrumb"><span>Workspace</span><span className="js-breadcrumb-slash">/</span><strong>{sharedLink.hasLink ? "Invitation" : "Projects"}</strong></div>{!sharedLink.hasLink && <label className="js-stage-name"><span>Stage name</span><input value={username} onChange={event => setUsername(event.target.value)} placeholder={placeholder} aria-label="Your stage name" maxLength={40} /></label>}</header>

      {sharedLink.hasLink ? <section className="js-invite-layout" aria-labelledby="js-invite-title">
        <div className="js-invite-art"><div className="js-invite-art-glow" /><div className="js-invite-art-symbol"><Icon name="music" size={54} /></div><Waveform hero /></div>
        <div className="js-invite-content"><div className="js-eyebrow"><Icon name="spark" size={15} /> COLLABORATION LINK</div>
          {sessionsError ? <><h1 id="js-invite-title">Couldn’t load projects</h1><p>Check your connection and try again.</p><button className="js-button js-button-primary" onClick={() => window.location.reload()}>Retry</button></>
            : !sessionsReady ? <><h1 id="js-invite-title">Finding your project…</h1><p>Just a moment while we connect to the workspace.</p></>
              : sharedSession ? <><h1 id="js-invite-title">You’re invited to jam.</h1><p>Join <strong>{sharedSession.name}</strong> and make music together. This project is open for editing.</p><label className="js-invite-name" htmlFor="js-invite-stage-name">Your stage name</label><input id="js-invite-stage-name" className="js-invite-name-input" value={username} onChange={event => setUsername(event.target.value)} placeholder={placeholder} maxLength={40} autoFocus /><button className="js-button js-button-primary js-invite-join" onClick={() => handleJoin(sharedSession.sessionId)}>Join project <Icon name="arrow" size={17} /></button></>
                : <><h1 id="js-invite-title">Project not found</h1><p>This link is invalid or the project is no longer available.</p></>}
          <button className="js-text-button" onClick={onDismissSharedLink}>← Back to projects</button>
        </div>
      </section> : <div className="js-content">
        <section className="js-hero" aria-labelledby="js-hero-title"><div className="js-hero-content"><div className="js-eyebrow"><Icon name="spark" size={15} /> YOUR CREATIVE SPACE</div><h1 id="js-hero-title">Make music, together.</h1><p>Start a new idea, pick up a session, and invite people to play along.</p><button className="js-button js-button-primary" disabled={!canCreate} onClick={() => setCreating(true)}><Icon name="plus" size={18} /> Create project</button></div><div className="js-hero-visual" aria-hidden="true"><div className="js-hero-disc js-hero-disc-back" /><div className="js-hero-disc js-hero-disc-front"><div className="js-hero-disc-center" /></div><Waveform hero /></div></section>

        <section className="js-projects" aria-labelledby="js-projects-title"><div className="js-projects-heading"><div><div className="js-section-kicker">THE WORKSPACE</div><h2 id="js-projects-title">All projects <span>{sessionsReady ? sessions.length : ""}</span></h2><p>Every session in the current JamSpace workspace.</p></div><button className="js-button js-button-outline js-create-top" disabled={!canCreate} onClick={() => setCreating(true)}><Icon name="plus" size={17} /> New project</button></div>
          <div className="js-project-toolbar"><label className="js-search"><Icon name="search" size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search projects" aria-label="Search projects" /></label><div className="js-view-toggle" role="group" aria-label="Project view"><button aria-label="Grid view" aria-pressed={viewMode === "grid"} className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}><Icon name="grid" size={17} /></button><button aria-label="List view" aria-pressed={viewMode === "list"} className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}><Icon name="list" size={18} /></button></div></div>
          {sessionsError ? <div className="js-empty-state" role="alert"><h3>Projects couldn’t load</h3><p>Check your connection and try again.</p><button className="js-button js-button-secondary" onClick={() => window.location.reload()}>Retry</button></div>
            : !sessionsReady ? <div className="js-project-grid" aria-label="Loading projects">{[0, 1, 2].map(index => <div className="js-project-skeleton" key={index} />)}</div>
              : visibleSessions.length === 0 ? <div className="js-empty-state"><div className="js-empty-icon"><Icon name={search ? "search" : "music"} size={26} /></div><h3>{search ? "No matching projects" : "No projects yet"}</h3><p>{search ? "Try another name or clear your search." : "Create the first space for a new idea."}</p>{search ? <button className="js-button js-button-secondary" onClick={() => setSearch("")}>Clear search</button> : <button className="js-button js-button-primary" onClick={() => setCreating(true)}>Create project</button>}</div>
                : <div className={`js-project-grid ${viewMode === "list" ? "js-project-list" : ""}`}>{visibleSessions.map(session => <article className="js-project-card" key={session.sessionId}><ProjectArtwork sessionId={session.sessionId} /><div className="js-project-card-content"><div className="js-project-card-label">MUSIC PROJECT</div><h3 title={session.name}>{session.name}</h3><div className="js-project-meta"><span>{session.tempoBpm} BPM</span><span className="js-meta-dot" /><span>{session.timeSigTop}/{session.timeSigBottom} time</span></div></div><div className="js-project-actions"><button className="js-card-share" onClick={() => setSharingSession(session)} aria-label={`Share ${session.name}`}><Icon name="share" size={16} /><span>Share</span></button><button className="js-card-open" onClick={() => handleJoin(session.sessionId)} aria-label={`Open ${session.name}`}>Open <Icon name="arrow" size={16} /></button></div></article>)}</div>}
        </section>
      </div>}
    </main>

    {creating && <CreateProjectDialog stageName={effectiveName} onClose={closeCreate} onCreate={projectName => onCreate(effectiveName, projectName)} />}
    {sharingSession && <ShareDialog sessionId={sharingSession.sessionId} sessionName={sharingSession.name} onClose={closeShare} />}
  </div>;
}
