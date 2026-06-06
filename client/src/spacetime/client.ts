// SpacetimeDB typed connection — uses auto-generated module_bindings.
// Run `spacetime generate` again after any server schema changes.

import { DbConnection, type EventContext } from "../module_bindings";
import { Identity } from "spacetimedb";
import type { Infer } from "spacetimedb";
import SessionRowSchema from "../module_bindings/session_table";
import TrackRowSchema from "../module_bindings/track_table";
import NoteRowSchema from "../module_bindings/note_table";
import UserPresenceRowSchema from "../module_bindings/user_presence_table";
import PatternRowSchema from "../module_bindings/pattern_table";
import ArrangementBlockRowSchema from "../module_bindings/arrangement_block_table";

export const STDB_URI = "wss://maincloud.spacetimedb.com";
export const MODULE_NAME = "jamspace";

// ── Row types (inferred from generated schemas) ───────────────────────────────
export type Session         = Infer<typeof SessionRowSchema>;
export type Track           = Infer<typeof TrackRowSchema>;
export type Note            = Infer<typeof NoteRowSchema>;
export type UserPresence    = Infer<typeof UserPresenceRowSchema>;
export type Pattern         = Infer<typeof PatternRowSchema>;
export type ArrangementBlock = Infer<typeof ArrangementBlockRowSchema>;

// ── Singleton connection ──────────────────────────────────────────────────────
let _conn: DbConnection | null = null;

export function getConn(): DbConnection {
  if (!_conn) throw new Error("SpacetimeDB not connected yet");
  return _conn;
}

export function buildConnection(
  onConnect: (conn: DbConnection, identity: Identity, token: string) => void
): DbConnection {
  const savedToken = localStorage.getItem("stdb_token") ?? undefined;

  _conn = DbConnection.builder()
    .withUri(STDB_URI)
    .withDatabaseName(MODULE_NAME)
    .withToken(savedToken)
    .onConnect((conn: DbConnection, identity: Identity, token: string) => {
      localStorage.setItem("stdb_token", token);
      localStorage.setItem("stdb_identity", identity.toHexString());
      onConnect(conn, identity, token);
    })
    .onDisconnect((_ctx, err) => {
      if (err) console.error("SpacetimeDB disconnected:", err);
    })
    .build();

  return _conn;
}
