use spacetimedb::{table, reducer, ReducerContext, Identity, SpacetimeType, Timestamp, Table};
use std::collections::HashSet;

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
    pub step: u16,
    pub pitch: u8,
    pub velocity: u8,
    pub duration: u16,  // in steps; 1 = one 16th note
    pub creator_identity: Identity,
}

/// A note supplied for a private melody preview or accepted continuation.
/// Steps are absolute positions within the pattern, not relative to a bar.
#[derive(SpacetimeType, Clone, PartialEq, Eq)]
pub struct ContinuationNote {
    pub step: u16,
    pub pitch: u8,
    pub velocity: u8,
    pub duration: u16,
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

/// Creates a brand-new session with default tracks + patterns (anyone can call this).
#[reducer]
pub fn create_new_session(ctx: &ReducerContext, name: String) {
    let session = ctx.db.session().insert(Session {
        session_id: 0, name, tempo_bpm: 120, is_playing: false,
        current_beat: 0.0, time_sig_top: 4, time_sig_bottom: 4,
    });
    for (instrument, color) in [
        ("drums", "#f87171"), ("bass", "#60a5fa"),
        ("synth", "#a78bfa"), ("lead", "#34d399"),
    ] {
        ctx.db.track().insert(Track {
            track_id: 0, session_id: session.session_id,
            instrument: instrument.to_string(), owner_identity: ctx.sender,
            color: color.to_string(), is_muted: false, volume: 1.0,
        });
    }
    let mut pids = Vec::new();
    for (pname, color) in [("Intro", "#3b82f6"), ("Verse", "#a855f7")] {
        let p = ctx.db.pattern().insert(Pattern {
            pattern_id: 0, session_id: session.session_id,
            name: pname.to_string(), color: color.to_string(), num_bars: 2,
        });
        pids.push(p.pattern_id);
    }
    for (pos, pid) in [(0u32, pids[0]), (1u32, pids[1])] {
        ctx.db.arrangement_block().insert(ArrangementBlock {
            block_id: 0, session_id: session.session_id, pattern_id: pid, position: pos,
        });
    }
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
pub fn add_note(ctx: &ReducerContext, pattern_id: u32, track_id: u32, step: u16, pitch: u8, velocity: u8, duration: u16) {
    let duration = duration.max(1);
    let exists = ctx.db.note().pattern_id().filter(&pattern_id)
        .any(|n| n.track_id == track_id && n.step == step && n.pitch == pitch);
    if !exists {
        ctx.db.note().insert(Note {
            note_id: 0, pattern_id, track_id, step, pitch, velocity, duration,
            creator_identity: ctx.sender,
        });
    }
}

/// Accept four privately previewed bars in one transaction. Rechecking the
/// source and destination here prevents a stale candidate from erasing or
/// mixing with work a collaborator added while the candidate was generated.
#[reducer]
pub fn apply_melody_continuation(
    ctx: &ReducerContext,
    pattern_id: u32,
    track_id: u32,
    source_bar: u32,
    expected_num_bars: u32,
    expected_steps_per_bar: u32,
    expected_source: Vec<ContinuationNote>,
    notes: Vec<ContinuationNote>,
) -> Result<(), String> {
    let pattern = ctx.db.pattern().pattern_id().find(&pattern_id)
        .ok_or("Pattern not found")?;
    let track = ctx.db.track().track_id().find(&track_id)
        .ok_or("Track not found")?;
    if pattern.session_id != track.session_id || track.instrument == "drums" {
        return Err("Choose a melodic track in this project".to_string());
    }
    if pattern.num_bars != expected_num_bars {
        return Err("The pattern changed. Generate a fresh continuation".to_string());
    }
    let required_bars = source_bar.checked_add(5)
        .ok_or("Invalid source bar")?;
    if source_bar >= pattern.num_bars || required_bars > 32 {
        return Err("The selected bar cannot be continued by four bars".to_string());
    }
    let session = ctx.db.session().session_id().find(&pattern.session_id)
        .ok_or("Project not found")?;
    let steps_per_bar = match session.time_sig_bottom {
        4 => session.time_sig_top.checked_mul(4),
        8 => session.time_sig_top.checked_mul(2),
        _ => None,
    }.filter(|steps| *steps > 0 && *steps <= 64)
        .ok_or("Unsupported time signature")?;
    if steps_per_bar != expected_steps_per_bar {
        return Err("The time signature changed. Generate again".to_string());
    }
    let source_start = source_bar * steps_per_bar;
    let destination_start = (source_bar + 1) * steps_per_bar;
    let destination_end = required_bars * steps_per_bar;
    if destination_end > u16::MAX as u32 {
        return Err("The continuation exceeds the step limit".to_string());
    }
    if expected_source.is_empty() || expected_source.len() > 64 {
        return Err("Choose a bar with melody notes".to_string());
    }
    if notes.is_empty() || notes.len() > 128 {
        return Err("The continuation has an invalid number of notes".to_string());
    }

    // Compare all musical fields, not just IDs: an edited note retains its ID.
    let mut actual_source: Vec<ContinuationNote> = Vec::new();
    for note in ctx.db.note().pattern_id().filter(&pattern_id) {
        if note.track_id != track_id { continue; }
        let step = u32::from(note.step);
        if step >= source_start && step < destination_start {
            actual_source.push(ContinuationNote {
                step: note.step, pitch: note.pitch,
                velocity: note.velocity, duration: note.duration,
            });
        }
        if step < destination_end && step + u32::from(note.duration) > destination_start {
            return Err("Another musician edited these bars. Generate again".to_string());
        }
    }
    let signature = |note: &ContinuationNote| (note.step, note.pitch, note.velocity, note.duration);
    actual_source.sort_by_key(&signature);
    let mut expected_source = expected_source;
    expected_source.sort_by_key(&signature);
    if actual_source != expected_source {
        return Err("The source melody changed. Generate again".to_string());
    }

    let allowed_pitches: &[u8] = match track.instrument.as_str() {
        "bass" => &[48, 50, 52, 53, 55, 57, 59, 60],
        "synth" | "lead" => &[60, 62, 64, 65, 67, 69, 71, 72],
        _ => return Err("Unsupported melody instrument".to_string()),
    };
    let mut unique_notes = HashSet::new();
    for note in &notes {
        let start = u32::from(note.step);
        let end = start + u32::from(note.duration);
        if start < destination_start || start >= destination_end ||
            note.duration == 0 || end > destination_end ||
            !allowed_pitches.contains(&note.pitch) ||
            note.velocity == 0 || note.velocity > 127 ||
            !unique_notes.insert((note.step, note.pitch)) {
            return Err("The continuation contains invalid or duplicate notes".to_string());
        }
    }

    if pattern.num_bars < required_bars {
        ctx.db.pattern().pattern_id().update(Pattern { num_bars: required_bars, ..pattern });
    }
    for note in notes {
        ctx.db.note().insert(Note {
            note_id: 0, pattern_id, track_id, step: note.step,
            pitch: note.pitch, velocity: note.velocity, duration: note.duration,
            creator_identity: ctx.sender,
        });
    }
    Ok(())
}

#[reducer]
pub fn set_note_duration(ctx: &ReducerContext, note_id: u32, duration: u16) -> Result<(), String> {
    let note = ctx.db.note().note_id().find(&note_id).ok_or("Note not found")?;
    ctx.db.note().note_id().update(Note { duration: duration.max(1), ..note });
    Ok(())
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
