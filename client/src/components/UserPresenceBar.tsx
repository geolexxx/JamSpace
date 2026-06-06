import React from "react";
import type { UserPresence, Track } from "../spacetime/client";

interface Props {
  users: UserPresence[];
  tracks: Track[];
  myIdentity: string;
}

export default function UserPresenceBar({ users, tracks, myIdentity }: Props) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <span className="text-gray-600 text-xs uppercase tracking-widest">Live</span>
      {users.map(u => {
        const id = u.identity.toHexString();
        const track = tracks.find(t => t.trackId === u.activeTrackId);
        const color = track?.color ?? "#4b5563";
        const isMe = id === myIdentity;

        return (
          <div
            key={id}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm"
            style={{ backgroundColor: color + "20", border: `1px solid ${color}40` }}
          >
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: color }}
            />
            <span className="text-white text-xs font-medium">{u.username}</span>
            {isMe && <span className="text-xs" style={{ color: color + "aa" }}>• you</span>}
            {track && !isMe && (
              <span className="text-xs" style={{ color: color + "99" }}>· {track.instrument}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
