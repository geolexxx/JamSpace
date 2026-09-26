import type { UserPresence } from "../spacetime/client";

export const PRESENCE_HEARTBEAT_MS = 5_000;
export const PRESENCE_TIMEOUT_MS = 15_000;

/** A presence row is a recent connection signal, not a permanent membership record. */
export function isOnline(user: UserPresence, nowMs: number): boolean {
  const lastSeenMs = Number(user.lastSeen.toMillis());
  return Number.isFinite(lastSeenMs)
    && lastSeenMs <= nowMs + PRESENCE_HEARTBEAT_MS
    && nowMs - lastSeenMs < PRESENCE_TIMEOUT_MS;
}
