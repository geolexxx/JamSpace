use spacetimedb::{table, reducer, ReducerContext, Identity, Timestamp, Table};

// ── Tables ────────────────────────────────────────────────────────────────────

#[table(name = session, public)]
pub struct Session {
    #[primary_key] #[auto_inc] pub session_id: u32,
    pub name: String,
    pub tempo_bpm: u32,
    pub is_playing: bool,
    pub current_beat: f64,
    pub time_sig_top: u32,
    pub time_sig_bottom: u32,
}

#[table(name = track, public)]
pub struct Track {
    #[primary_key] #[auto_inc] pub track_id: u32,
    #[index(btree)] pub session_id: u32,
    pub instrument: String,
    pub owner_identity: Identity,
    pub color: String,
    pub is_muted: bool,
    pub volume: f32,
}

#[table(name = pattern, public)]
pub struct Pattern {
    #[primary_key] #[auto_inc] pub pattern_id: u32,
    #[index(btree)] pub session_id: u32,
    pub name: String,
    pub color: String,
    pub num_bars: u32,  // how many bars this pattern spans (default 2)
}

#[table(name = arrangement_block, public)]
pub struct ArrangementBlock {
    #[primary_key] #[auto_inc] pub block_id: u32,
    #[index(btree)] pub session_id: u32,
    pub pattern_id: u32,
    pub position: u32,
}

#[table(name = note, public)]
pub struct Note {
    #[primary_key] #[auto_inc] pub note_id: u32,
    #[index(btree)] pub pattern_id: u32,
    #[index(btree)] pub track_id: u32,
    pub step: u16,   // u16 supports up to 65535 steps (4000+ bars)
    pub pitch: u8,
    pub velocity: u8,
    pub creator_identity: Identity,
}

#[table(name = user_presence, public)]
pub struct UserPresence {
    #[primary_key] pub identity: Identity,
    pub session_id: u32,
    pub username: String,
    pub active_track_id: u32,
    pub last_seen: Timestamp,
}

// ── Reducers ──────────────────────────────────────────────────────────────────

#[reducer]
pub fn setup_default_session(ctx: &ReducerContext) {
    if ctx.db.session().iter().next().is_some() { return; }

    let session = ctx.db.session().insert(Session {
        session_id: 0,
        name: "JamSpace".to_string(),
        tempo_bpm: 120,
        is_playing: false,
        current_beat: 0.0,
        time_sig_top: 4,
        time_sig_bottom: 4,
    });

    for (instrument, color) in [
        ("drums", "#f87171"),
        ("bass",  "#60a5fa"),
        ("synth", "#a78bfa"),
        ("lead",  "#34d399"),
    ] {
        ctx.db.track().insert(Track {
            track_id: 0,
            session_id: session.session_id,
            instrument: instrument.to_string(),
            owner_identity: ctx.sender,
            color: color.to_string(),
            is_muted: false,
            volume: 1.0,
        });
    }

    let pattern_defs = [
        ("Intro", "#3b82f6"),
        ("Verse", "#a855f7"),
    ];
    let mut pattern_ids = Vec::new();
    for (name, color) in &pattern_defs {
        let p = ctx.db.pattern().insert(Pattern {
            pattern_id: 0,
            session_id: session.session_id,
            name: name.to_string(),
            color: color.to_string(),
            num_bars: 2,
        });
        pattern_ids.push(p.pattern_id);
    }

    let arrangement = [
        (0u32, pattern_ids[0]),
        (1u32, pattern_ids[1]),
    ];
    for (position, pattern_id) in arrangement {
        ctx.db.arrangement_block().insert(ArrangementBlock {
            block_id: 0,
            session_id: session.session_id,
            pattern_id,
            position,
        });
    }
}

#[reducer]
pub fn join_session(ctx: &ReducerContext, session_id: u32, username: String) {
    let identity = ctx.sender;
    if let Some(mut p) = ctx.db.user_presence().identity().find(&identity) {
        p.session_id = session_id;
        p.username = username;
        p.last_seen = ctx.timestamp;
        ctx.db.user_presence().identity().update(p);
    } else {
        ctx.db.user_presence().insert(UserPresence {
            identity, session_id, username,
            active_track_id: 0,
            last_seen: ctx.timestamp,
        });
    }
}

#[reducer]
pub fn create_track(ctx: &ReducerContext, session_id: u32, instrument: String, color: String) {
    ctx.db.track().insert(Track {
        track_id: 0, session_id, instrument,
        owner_identity: ctx.sender, color,
        is_muted: false, volume: 1.0,
    });
}

#[reducer]
pub fn remove_track(ctx: &ReducerContext, track_id: u32) -> Result<(), String> {
    ctx.db.track().track_id().find(&track_id).ok_or("Track not found")?;
    let nids: Vec<u32> = ctx.db.note().track_id().filter(&track_id)
        .map(|n| n.note_id).collect();
    for nid in nids { ctx.db.note().note_id().delete(&nid); }
    ctx.db.track().track_id().delete(&track_id);
    Ok(())
}

#[reducer]
pub fn create_pattern(ctx: &ReducerContext, session_id: u32, name: String, color: String) {
    ctx.db.pattern().insert(Pattern { pattern_id: 0, session_id, name, color, num_bars: 2 });
}

#[reducer]
pub fn set_pattern_bars(ctx: &ReducerContext, pattern_id: u32, num_bars: u32) -> Result<(), String> {
    let num_bars = num_bars.clamp(1, 32);
    let pattern = ctx.db.pattern().pattern_id().find(&pattern_id)
        .ok_or("Pattern not found")?;
    ctx.db.pattern().pattern_id().update(Pattern { num_bars, ..pattern });
    Ok(())
}

#[reducer]
pub fn rename_pattern(ctx: &ReducerContext, pattern_id: u32, name: String) {
    if let Some(mut p) = ctx.db.pattern().pattern_id().find(&pattern_id) {
        p.name = name;
        ctx.db.pattern().pattern_id().update(p);
    }
}

#[reducer]
pub fn add_arrangement_block(ctx: &ReducerContext, session_id: u32, pattern_id: u32, position: u32) {
    ctx.db.arrangement_block().insert(ArrangementBlock {
        block_id: 0, session_id, pattern_id, position
    });
}

#[reducer]
pub fn remove_arrangement_block(ctx: &ReducerContext, block_id: u32) {
    ctx.db.arrangement_block().block_id().delete(&block_id);
}

#[reducer]
pub fn add_note(ctx: &ReducerContext, pattern_id: u32, track_id: u32, step: u16, pitch: u8, velocity: u8) {
    let exists = ctx.db.note().pattern_id().filter(&pattern_id)
        .any(|n| n.track_id == track_id && n.step == step && n.pitch == pitch);
    if !exists {
        ctx.db.note().insert(Note {
            note_id: 0, pattern_id, track_id, step, pitch, velocity,
            creator_identity: ctx.sender,
        });
    }
}

#[reducer]
pub fn remove_note(ctx: &ReducerContext, pattern_id: u32, track_id: u32, step: u16, pitch: u8) {
    let target = ctx.db.note().pattern_id().filter(&pattern_id)
        .find(|n| n.track_id == track_id && n.step == step && n.pitch == pitch);
    if let Some(note) = target {
        ctx.db.note().note_id().delete(&note.note_id);
    }
}

#[reducer]
pub fn clear_notes(ctx: &ReducerContext, session_id: u32) {
    let pids: Vec<u32> = ctx.db.pattern().session_id().filter(&session_id)
        .map(|p| p.pattern_id).collect();
    for pid in pids {
        let nids: Vec<u32> = ctx.db.note().pattern_id().filter(&pid)
            .map(|n| n.note_id).collect();
        for nid in nids { ctx.db.note().note_id().delete(&nid); }
    }
}

#[reducer]
pub fn clear_pattern_notes(ctx: &ReducerContext, pattern_id: u32) {
    let nids: Vec<u32> = ctx.db.note().pattern_id().filter(&pattern_id)
        .map(|n| n.note_id).collect();
    for nid in nids { ctx.db.note().note_id().delete(&nid); }
}

#[reducer]
pub fn set_time_signature(ctx: &ReducerContext, session_id: u32, top: u32, bottom: u32) {
    if let Some(mut s) = ctx.db.session().session_id().find(&session_id) {
        s.time_sig_top = top;
        s.time_sig_bottom = bottom;
        ctx.db.session().session_id().update(s);
    }
}

#[reducer]
pub fn set_playback(ctx: &ReducerContext, session_id: u32, is_playing: bool, tempo_bpm: u32) {
    if let Some(mut s) = ctx.db.session().session_id().find(&session_id) {
        s.is_playing = is_playing;
        s.tempo_bpm = tempo_bpm;
        ctx.db.session().session_id().update(s);
    }
}

#[reducer]
pub fn set_active_track(ctx: &ReducerContext, track_id: u32) {
    let id = ctx.sender;
    if let Some(mut p) = ctx.db.user_presence().identity().find(&id) {
        p.active_track_id = track_id;
        ctx.db.user_presence().identity().update(p);
    }
}

#[reducer]
pub fn toggle_mute(ctx: &ReducerContext, track_id: u32) {
    if let Some(mut t) = ctx.db.track().track_id().find(&track_id) {
        t.is_muted = !t.is_muted;
        ctx.db.track().track_id().update(t);
    }
}

#[reducer]
pub fn set_volume(ctx: &ReducerContext, track_id: u32, volume: f32) {
    if let Some(mut t) = ctx.db.track().track_id().find(&track_id) {
        t.volume = volume.clamp(0.0, 1.0);
        ctx.db.track().track_id().update(t);
    }
}
