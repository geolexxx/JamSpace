const SESSION_PARAM = "session";

export function readSharedSessionId(search: string): { hasLink: boolean; sessionId: number | null } {
  const params = new URLSearchParams(search);
  const value = params.get(SESSION_PARAM);
  if (value === null) return { hasLink: false, sessionId: null };
  if (!/^\d+$/.test(value)) return { hasLink: true, sessionId: null };

  const sessionId = Number(value);
  return {
    hasLink: true,
    sessionId: Number.isSafeInteger(sessionId) ? sessionId : null,
  };
}

export function createShareLink(sessionId: number): string {
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set(SESSION_PARAM, String(sessionId));
  return url.toString();
}

export function clearShareLinkFromAddress(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(SESSION_PARAM);
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}
