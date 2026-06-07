// Demo patterns — 4 bars (64 steps) each, inspired by iconic songs.
// Step grid: 4/4 time, 16 steps per bar, 4 steps per beat (16th notes).
// Bar 1: 0–15 | Bar 2: 16–31 | Bar 3: 32–47 | Bar 4: 48–63

export interface DemoNote { step: number; pitch: number; velocity: number; duration?: number; }
export interface DemoTrackPattern { instrument: string; notes: DemoNote[]; }
export interface DemoPattern {
  name: string; description: string; tempo: number; numBars: number;
  tracks: DemoTrackPattern[];
}

// Drum constants
const KICK = 36, SNARE = 38, HIHAT = 42, OPENHAT = 46, CLAP = 39, CRASH = 49;

// Bass range C3–C4 (MIDI 48–60)
const C3=48, D3=50, Eb3=51, E3=52, F3=53, Gb3=54, G3=55, Ab3=56, A3=57, Bb3=58, B3=59, C4=60;
// Lead/Synth range C4–C5 (MIDI 60–72)
const Db4=61, D4=62, Eb4=63, E4=64, F4=65, Gb4=66, G4=67, Ab4=68, A4=69, Bb4=70, B4=71, C5=72;

export const DEMO_PATTERNS: DemoPattern[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CLASSIC ROCK — Inspired by AC/DC "Back in Black" (1980)
  //    Key: A minor blues · 116 BPM · 4 bars
  //    Iconic groove: syncopated kick, straight snare 2&4, A-pentatonic riff
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Classic Rock",
    description: "AC/DC 'Back in Black' style — A blues, 116 BPM",
    tempo: 116,
    numBars: 4,
    tracks: [
      {
        instrument: "drums",
        notes: [
          // ── Bar 1 (0–15) ─────────────────────────────────────────
          { step:  0, pitch: CRASH, velocity: 105 },
          { step:  0, pitch: KICK,  velocity: 122 },
          { step:  3, pitch: KICK,  velocity: 80  },
          { step:  4, pitch: SNARE, velocity: 116 },
          { step:  6, pitch: KICK,  velocity: 74  },
          { step:  8, pitch: KICK,  velocity: 114 },
          { step: 10, pitch: KICK,  velocity: 78  },
          { step: 12, pitch: SNARE, velocity: 116 },
          { step: 14, pitch: KICK,  velocity: 70  },
          // hi-hat 8ths bar 1
          { step:  0, pitch: HIHAT, velocity: 74 }, { step:  2, pitch: HIHAT, velocity: 58 },
          { step:  4, pitch: HIHAT, velocity: 74 }, { step:  6, pitch: HIHAT, velocity: 58 },
          { step:  8, pitch: HIHAT, velocity: 74 }, { step: 10, pitch: HIHAT, velocity: 58 },
          { step: 12, pitch: HIHAT, velocity: 74 }, { step: 14, pitch: HIHAT, velocity: 58 },

          // ── Bar 2 (16–31) ────────────────────────────────────────
          { step: 16, pitch: KICK,  velocity: 122 },
          { step: 19, pitch: KICK,  velocity: 80  },
          { step: 20, pitch: SNARE, velocity: 116 },
          { step: 22, pitch: KICK,  velocity: 74  },
          { step: 24, pitch: KICK,  velocity: 114 },
          { step: 26, pitch: KICK,  velocity: 78  },
          { step: 28, pitch: SNARE, velocity: 116 },
          { step: 30, pitch: KICK,  velocity: 70  },
          { step: 16, pitch: HIHAT, velocity: 74 }, { step: 18, pitch: HIHAT, velocity: 58 },
          { step: 20, pitch: HIHAT, velocity: 74 }, { step: 22, pitch: HIHAT, velocity: 58 },
          { step: 24, pitch: HIHAT, velocity: 74 }, { step: 26, pitch: HIHAT, velocity: 58 },
          { step: 28, pitch: HIHAT, velocity: 74 }, { step: 30, pitch: HIHAT, velocity: 58 },

          // ── Bar 3 (32–47) — crash + same groove ──────────────────
          { step: 32, pitch: CRASH, velocity: 100 },
          { step: 32, pitch: KICK,  velocity: 122 },
          { step: 35, pitch: KICK,  velocity: 80  },
          { step: 36, pitch: SNARE, velocity: 116 },
          { step: 38, pitch: KICK,  velocity: 74  },
          { step: 40, pitch: KICK,  velocity: 114 },
          { step: 42, pitch: KICK,  velocity: 78  },
          { step: 44, pitch: SNARE, velocity: 120 },
          { step: 46, pitch: KICK,  velocity: 70  },
          { step: 32, pitch: HIHAT, velocity: 74 }, { step: 34, pitch: HIHAT, velocity: 58 },
          { step: 36, pitch: HIHAT, velocity: 74 }, { step: 38, pitch: HIHAT, velocity: 58 },
          { step: 40, pitch: HIHAT, velocity: 74 }, { step: 42, pitch: HIHAT, velocity: 58 },
          { step: 44, pitch: HIHAT, velocity: 74 }, { step: 46, pitch: HIHAT, velocity: 58 },

          // ── Bar 4 (48–63) — drum fill into crash ─────────────────
          { step: 48, pitch: CRASH, velocity: 112 },
          { step: 48, pitch: KICK,  velocity: 122 },
          { step: 51, pitch: KICK,  velocity: 80  },
          { step: 52, pitch: SNARE, velocity: 116 },
          // fill: running snare 16ths
          { step: 56, pitch: SNARE, velocity: 105 },
          { step: 57, pitch: SNARE, velocity: 95  },
          { step: 58, pitch: SNARE, velocity: 108 },
          { step: 59, pitch: SNARE, velocity: 90  },
          { step: 60, pitch: SNARE, velocity: 115 },
          { step: 61, pitch: KICK,  velocity: 108 },
          { step: 62, pitch: SNARE, velocity: 112 },
          { step: 63, pitch: KICK,  velocity: 100 },
          { step: 48, pitch: HIHAT, velocity: 74 }, { step: 50, pitch: HIHAT, velocity: 58 },
          { step: 52, pitch: HIHAT, velocity: 74 }, { step: 54, pitch: HIHAT, velocity: 58 },
          { step: 56, pitch: OPENHAT, velocity: 65 }, { step: 60, pitch: OPENHAT, velocity: 68 },
        ],
      },
      {
        instrument: "bass",
        // A-pentatonic rock riff — walks the A blues scale, locked with kick
        notes: [
          // Bar 1
          { step:  0, pitch: A3, velocity: 114 }, { step:  2, pitch: A3, velocity: 90  },
          { step:  4, pitch: D3, velocity: 110 }, { step:  5, pitch: E3, velocity: 84  },
          { step:  6, pitch: A3, velocity: 104 },
          { step:  8, pitch: A3, velocity: 110 }, { step: 10, pitch: G3, velocity: 92  },
          { step: 12, pitch: E3, velocity: 104 }, { step: 14, pitch: G3, velocity: 88  },
          // Bar 2
          { step: 16, pitch: A3, velocity: 114 }, { step: 18, pitch: A3, velocity: 90  },
          { step: 20, pitch: D3, velocity: 110 }, { step: 21, pitch: E3, velocity: 84  },
          { step: 22, pitch: G3, velocity: 104 },
          { step: 24, pitch: A3, velocity: 110 }, { step: 26, pitch: G3, velocity: 92  },
          { step: 28, pitch: E3, velocity: 104 }, { step: 30, pitch: G3, velocity: 86  },
          // Bar 3 — variation: chromatic walk-up
          { step: 32, pitch: A3, velocity: 114 }, { step: 34, pitch: B3, velocity: 88  },
          { step: 36, pitch: D3, velocity: 110 }, { step: 37, pitch: E3, velocity: 82  },
          { step: 38, pitch: G3, velocity: 104 },
          { step: 40, pitch: A3, velocity: 110 }, { step: 42, pitch: A3, velocity: 92  },
          { step: 44, pitch: G3, velocity: 102 }, { step: 46, pitch: E3, velocity: 90  },
          // Bar 4 — driving into the fill
          { step: 48, pitch: A3, velocity: 118 }, { step: 50, pitch: A3, velocity: 94  },
          { step: 52, pitch: E3, velocity: 110 }, { step: 54, pitch: D3, velocity: 102 },
          { step: 56, pitch: E3, velocity: 112 }, { step: 58, pitch: G3, velocity: 96  },
          { step: 60, pitch: A3, velocity: 114 }, { step: 62, pitch: G3, velocity: 90  },
        ],
      },
      {
        instrument: "synth",
        // Rhythm guitar feel: Am – G – F – G | Am – G – Am – E turnaround
        notes: [
          // Bar 1: Am – G – F – G
          { step:  0, pitch: A4, velocity: 92 }, { step:  0, pitch: C5, velocity: 84 },
          { step:  4, pitch: G4, velocity: 90 }, { step:  4, pitch: B4, velocity: 82 },
          { step:  8, pitch: F4, velocity: 90 }, { step:  8, pitch: A4, velocity: 82 },
          { step: 12, pitch: G4, velocity: 90 }, { step: 12, pitch: B4, velocity: 82 },
          // Bar 2: Am – G – Am – G
          { step: 16, pitch: A4, velocity: 92 }, { step: 16, pitch: C5, velocity: 84 },
          { step: 20, pitch: G4, velocity: 90 }, { step: 20, pitch: B4, velocity: 82 },
          { step: 24, pitch: A4, velocity: 92 }, { step: 24, pitch: C5, velocity: 84 },
          { step: 28, pitch: G4, velocity: 90 }, { step: 28, pitch: B4, velocity: 82 },
          // Bar 3: F – G – Am – F
          { step: 32, pitch: F4, velocity: 92 }, { step: 32, pitch: A4, velocity: 84 },
          { step: 36, pitch: G4, velocity: 90 }, { step: 36, pitch: B4, velocity: 82 },
          { step: 40, pitch: A4, velocity: 92 }, { step: 40, pitch: C5, velocity: 84 },
          { step: 44, pitch: F4, velocity: 90 }, { step: 44, pitch: A4, velocity: 82 },
          // Bar 4: Am – G – Am – E (turnaround)
          { step: 48, pitch: A4, velocity: 94 }, { step: 48, pitch: C5, velocity: 86 },
          { step: 52, pitch: G4, velocity: 92 }, { step: 52, pitch: B4, velocity: 84 },
          { step: 56, pitch: A4, velocity: 94 }, { step: 56, pitch: C5, velocity: 86 },
          { step: 60, pitch: E4, velocity: 92 }, { step: 60, pitch: B4, velocity: 84 },
        ],
      },
      {
        instrument: "lead",
        // A-minor pentatonic riff — call (bar1), response (bar2), climb (bar3), finale (bar4)
        notes: [
          // Bar 1: Main riff
          { step:  0, pitch: E4, velocity: 102 }, { step:  2, pitch: G4, velocity: 97  },
          { step:  4, pitch: A4, velocity: 104 }, { step:  5, pitch: G4, velocity: 86  },
          { step:  6, pitch: E4, velocity: 100 },
          { step:  8, pitch: D4, velocity: 92  }, { step: 10, pitch: E4, velocity: 98  },
          { step: 12, pitch: G4, velocity: 102 }, { step: 14, pitch: A4, velocity: 97  },
          // Bar 2: Response phrase
          { step: 16, pitch: A4, velocity: 104 }, { step: 17, pitch: G4, velocity: 86  },
          { step: 18, pitch: E4, velocity: 100 },
          { step: 20, pitch: D4, velocity: 93  }, { step: 21, pitch: E4, velocity: 80  },
          { step: 22, pitch: G4, velocity: 97  },
          { step: 24, pitch: A4, velocity: 102 }, { step: 26, pitch: G4, velocity: 94  },
          { step: 28, pitch: E4, velocity: 100 }, { step: 30, pitch: D4, velocity: 88  },
          // Bar 3: Climb to upper register
          { step: 32, pitch: E4, velocity: 102 }, { step: 34, pitch: G4, velocity: 98  },
          { step: 36, pitch: A4, velocity: 104 }, { step: 38, pitch: C5, velocity: 107 },
          { step: 40, pitch: A4, velocity: 102 }, { step: 41, pitch: C5, velocity: 92  },
          { step: 42, pitch: A4, velocity: 98  },
          { step: 44, pitch: G4, velocity: 102 }, { step: 46, pitch: E4, velocity: 96  },
          // Bar 4: Climax riff
          { step: 48, pitch: A4, velocity: 110 }, { step: 49, pitch: G4, velocity: 92  },
          { step: 50, pitch: E4, velocity: 104 },
          { step: 52, pitch: D4, velocity: 97  }, { step: 53, pitch: E4, velocity: 86  },
          { step: 54, pitch: G4, velocity: 102 },
          { step: 56, pitch: A4, velocity: 110 }, { step: 58, pitch: C5, velocity: 107 },
          { step: 60, pitch: A4, velocity: 104 }, { step: 62, pitch: G4, velocity: 96  },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. TRAP BEAT — Inspired by Travis Scott "goosebumps" / Metro Boomin
  //    Key: C minor · 130 BPM · 4 bars
  //    Features: 808 kick, snare on beat 3 only, dense triplet hi-hat rolls,
  //              descending Cm bass line, dark minor chord pads
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Trap Beat",
    description: "Travis Scott 'goosebumps' style — C minor, 130 BPM",
    tempo: 130,
    numBars: 4,
    tracks: [
      {
        instrument: "drums",
        notes: [
          // ── Bar 1 (0–15) ─────────────────────────────────────────
          { step:  0, pitch: KICK,    velocity: 127 },
          { step:  4, pitch: KICK,    velocity: 92  },
          { step:  6, pitch: KICK,    velocity: 80  },
          { step:  8, pitch: SNARE,   velocity: 120 },
          { step:  8, pitch: CLAP,    velocity: 98  },
          { step: 11, pitch: KICK,    velocity: 86  },
          { step: 14, pitch: KICK,    velocity: 80  },
          // hi-hat triplet rolls
          { step:  0, pitch: HIHAT,   velocity: 90  }, { step:  1, pitch: HIHAT, velocity: 64 },
          { step:  2, pitch: HIHAT,   velocity: 78  }, { step:  3, pitch: OPENHAT,velocity: 55 },
          { step:  5, pitch: HIHAT,   velocity: 84  }, { step:  6, pitch: HIHAT, velocity: 64 },
          { step:  7, pitch: HIHAT,   velocity: 78  },
          { step:  9, pitch: HIHAT,   velocity: 84  }, { step: 10, pitch: HIHAT, velocity: 64 },
          { step: 11, pitch: OPENHAT, velocity: 58  },
          { step: 13, pitch: HIHAT,   velocity: 84  }, { step: 14, pitch: HIHAT, velocity: 66 },
          { step: 15, pitch: OPENHAT, velocity: 74  },

          // ── Bar 2 (16–31) — variation: more fills ────────────────
          { step: 16, pitch: KICK,    velocity: 127 },
          { step: 20, pitch: KICK,    velocity: 92  },
          { step: 22, pitch: KICK,    velocity: 80  },
          { step: 24, pitch: SNARE,   velocity: 120 },
          { step: 24, pitch: CLAP,    velocity: 98  },
          { step: 26, pitch: KICK,    velocity: 86  },
          { step: 28, pitch: KICK,    velocity: 86  },
          { step: 29, pitch: KICK,    velocity: 70  },
          { step: 16, pitch: HIHAT,   velocity: 90  }, { step: 17, pitch: HIHAT, velocity: 64 },
          { step: 18, pitch: HIHAT,   velocity: 78  }, { step: 19, pitch: OPENHAT,velocity: 55 },
          { step: 21, pitch: HIHAT,   velocity: 84  }, { step: 22, pitch: HIHAT, velocity: 64 },
          { step: 23, pitch: HIHAT,   velocity: 78  },
          { step: 25, pitch: HIHAT,   velocity: 84  }, { step: 26, pitch: HIHAT, velocity: 64 },
          { step: 27, pitch: OPENHAT, velocity: 58  },
          { step: 29, pitch: HIHAT,   velocity: 84  }, { step: 30, pitch: HIHAT, velocity: 66 },
          { step: 31, pitch: OPENHAT, velocity: 78  },

          // ── Bar 3 (32–47) — extra syncopated kicks ────────────────
          { step: 32, pitch: KICK,    velocity: 127 },
          { step: 35, pitch: KICK,    velocity: 86  },
          { step: 36, pitch: KICK,    velocity: 80  },
          { step: 40, pitch: SNARE,   velocity: 120 },
          { step: 40, pitch: CLAP,    velocity: 98  },
          { step: 43, pitch: KICK,    velocity: 86  },
          { step: 44, pitch: KICK,    velocity: 80  },
          { step: 46, pitch: KICK,    velocity: 72  },
          { step: 32, pitch: HIHAT,   velocity: 90  }, { step: 33, pitch: HIHAT, velocity: 64 },
          { step: 34, pitch: HIHAT,   velocity: 78  }, { step: 35, pitch: OPENHAT,velocity: 55 },
          { step: 37, pitch: HIHAT,   velocity: 84  }, { step: 38, pitch: HIHAT, velocity: 64 },
          { step: 39, pitch: HIHAT,   velocity: 78  },
          { step: 41, pitch: HIHAT,   velocity: 84  }, { step: 42, pitch: HIHAT, velocity: 64 },
          { step: 43, pitch: OPENHAT, velocity: 58  },
          { step: 45, pitch: HIHAT,   velocity: 84  }, { step: 46, pitch: HIHAT, velocity: 66 },
          { step: 47, pitch: OPENHAT, velocity: 76  },

          // ── Bar 4 (48–63) — snare roll outro ─────────────────────
          { step: 48, pitch: KICK,    velocity: 127 },
          { step: 52, pitch: KICK,    velocity: 92  },
          { step: 56, pitch: SNARE,   velocity: 120 },
          { step: 56, pitch: CLAP,    velocity: 98  },
          { step: 58, pitch: KICK,    velocity: 86  },
          { step: 60, pitch: KICK,    velocity: 86  },
          { step: 61, pitch: KICK,    velocity: 70  },
          // dense snare fill into restart
          { step: 62, pitch: SNARE,   velocity: 105 },
          { step: 63, pitch: SNARE,   velocity: 95  },
          { step: 48, pitch: HIHAT,   velocity: 90  }, { step: 49, pitch: HIHAT, velocity: 64 },
          { step: 50, pitch: HIHAT,   velocity: 78  }, { step: 51, pitch: OPENHAT,velocity: 55 },
          { step: 53, pitch: HIHAT,   velocity: 84  }, { step: 54, pitch: HIHAT, velocity: 64 },
          { step: 55, pitch: HIHAT,   velocity: 78  },
          { step: 57, pitch: HIHAT,   velocity: 84  }, { step: 58, pitch: HIHAT, velocity: 64 },
          { step: 59, pitch: OPENHAT, velocity: 58  },
          { step: 61, pitch: HIHAT,   velocity: 84  }, { step: 62, pitch: HIHAT, velocity: 66 },
          { step: 63, pitch: OPENHAT, velocity: 84  },
        ],
      },
      {
        instrument: "bass",
        // 808-style descending Cm line — fat, long sustain feel
        notes: [
          // Bar 1: C – Eb – F – G
          { step:  0, pitch: C3,  velocity: 120 }, { step:  1, pitch: C3,  velocity: 104 },
          { step:  4, pitch: Eb3, velocity: 112 },
          { step:  6, pitch: F3,  velocity: 108 },
          { step:  8, pitch: G3,  velocity: 116 }, { step:  9, pitch: G3,  velocity: 96  },
          { step: 12, pitch: Bb3, velocity: 110 },
          { step: 14, pitch: G3,  velocity: 104 },
          // Bar 2: C – F – G – Eb (shift)
          { step: 16, pitch: C3,  velocity: 120 }, { step: 17, pitch: C3,  velocity: 104 },
          { step: 20, pitch: F3,  velocity: 112 },
          { step: 22, pitch: G3,  velocity: 108 },
          { step: 24, pitch: Eb3, velocity: 116 }, { step: 25, pitch: Eb3, velocity: 96  },
          { step: 28, pitch: G3,  velocity: 110 },
          { step: 30, pitch: C3,  velocity: 104 },
          // Bar 3: C – G – Ab – Bb (darker variation)
          { step: 32, pitch: C3,  velocity: 120 }, { step: 33, pitch: C3,  velocity: 104 },
          { step: 36, pitch: G3,  velocity: 112 },
          { step: 38, pitch: Ab3, velocity: 108 },
          { step: 40, pitch: Bb3, velocity: 116 }, { step: 41, pitch: Bb3, velocity: 96  },
          { step: 44, pitch: G3,  velocity: 110 },
          { step: 46, pitch: F3,  velocity: 104 },
          // Bar 4: C – Eb – F – G cascade
          { step: 48, pitch: C3,  velocity: 122 }, { step: 49, pitch: C3,  velocity: 106 },
          { step: 52, pitch: G3,  velocity: 112 },
          { step: 54, pitch: Eb3, velocity: 108 },
          { step: 56, pitch: F3,  velocity: 116 }, { step: 57, pitch: F3,  velocity: 98  },
          { step: 60, pitch: G3,  velocity: 110 },
          { step: 62, pitch: C3,  velocity: 106 },
        ],
      },
      {
        instrument: "synth",
        // Dark minor chord hits — Cm, Fm, Gm, Ab stabs
        notes: [
          // Bar 1: Cm – Fm – Gm
          { step:  0, pitch: C4,  velocity: 92 }, { step:  0, pitch: G4,  velocity: 84 },
          { step:  1, pitch: Eb4, velocity: 74 },
          { step:  8, pitch: F4,  velocity: 92 }, { step:  8, pitch: C5,  velocity: 84 },
          { step:  9, pitch: Ab4, velocity: 74 },
          { step: 12, pitch: G4,  velocity: 90 }, { step: 12, pitch: D4,  velocity: 82 },
          { step: 13, pitch: Bb4, velocity: 72 },
          // Bar 2: Cm – Ab – Fm – Gm
          { step: 16, pitch: C4,  velocity: 92 }, { step: 16, pitch: G4,  velocity: 84 },
          { step: 17, pitch: Eb4, velocity: 74 },
          { step: 20, pitch: Ab4, velocity: 92 }, { step: 20, pitch: Eb4, velocity: 84 },
          { step: 21, pitch: C5,  velocity: 74 },
          { step: 24, pitch: F4,  velocity: 92 }, { step: 24, pitch: C5,  velocity: 84 },
          { step: 28, pitch: G4,  velocity: 90 }, { step: 28, pitch: Bb4, velocity: 82 },
          // Bar 3: Cm – Bb – Ab – Gm
          { step: 32, pitch: C4,  velocity: 92 }, { step: 32, pitch: G4,  velocity: 84 },
          { step: 33, pitch: Eb4, velocity: 74 },
          { step: 36, pitch: Bb4, velocity: 90 }, { step: 36, pitch: F4,  velocity: 82 },
          { step: 40, pitch: Ab4, velocity: 90 }, { step: 40, pitch: Eb4, velocity: 82 },
          { step: 44, pitch: G4,  velocity: 90 }, { step: 44, pitch: D4,  velocity: 82 },
          // Bar 4: Cm – Fm – Cm – Gm
          { step: 48, pitch: C4,  velocity: 94 }, { step: 48, pitch: G4,  velocity: 86 },
          { step: 49, pitch: Eb4, velocity: 76 },
          { step: 52, pitch: F4,  velocity: 92 }, { step: 52, pitch: C5,  velocity: 84 },
          { step: 56, pitch: C4,  velocity: 94 }, { step: 56, pitch: G4,  velocity: 86 },
          { step: 60, pitch: G4,  velocity: 90 }, { step: 60, pitch: Bb4, velocity: 82 },
        ],
      },
      {
        instrument: "lead",
        // "goosebumps" style hook — descending Cm melodic line
        notes: [
          // Bar 1
          { step:  2, pitch: C5,  velocity: 98 },
          { step:  4, pitch: Bb4, velocity: 92 },
          { step:  6, pitch: G4,  velocity: 90 },
          { step: 10, pitch: F4,  velocity: 90 },
          { step: 12, pitch: Eb4, velocity: 86 },
          { step: 15, pitch: G4,  velocity: 80 },
          // Bar 2 — same hook, varied rhythm
          { step: 18, pitch: C5,  velocity: 98 },
          { step: 20, pitch: Bb4, velocity: 92 },
          { step: 22, pitch: Ab4, velocity: 88 },
          { step: 24, pitch: G4,  velocity: 92 },
          { step: 26, pitch: F4,  velocity: 88 },
          { step: 28, pitch: Eb4, velocity: 84 },
          { step: 30, pitch: G4,  velocity: 82 },
          // Bar 3 — climb back up
          { step: 33, pitch: Eb4, velocity: 88 },
          { step: 35, pitch: F4,  velocity: 90 },
          { step: 37, pitch: G4,  velocity: 92 },
          { step: 39, pitch: Bb4, velocity: 95 },
          { step: 41, pitch: C5,  velocity: 98 },
          { step: 43, pitch: Bb4, velocity: 90 },
          { step: 45, pitch: G4,  velocity: 88 },
          { step: 47, pitch: F4,  velocity: 82 },
          // Bar 4 — full restatement + ending fall
          { step: 50, pitch: C5,  velocity: 100 },
          { step: 52, pitch: Bb4, velocity: 94 },
          { step: 54, pitch: Ab4, velocity: 88 },
          { step: 56, pitch: G4,  velocity: 92 },
          { step: 58, pitch: F4,  velocity: 88 },
          { step: 60, pitch: Eb4, velocity: 84 },
          { step: 62, pitch: D4,  velocity: 80 },
          { step: 63, pitch: C4,  velocity: 72 },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. LO-FI CHILL — Inspired by Nujabes "Feather" (2004)
  //    Key: D minor 7 (jazz) · 87 BPM · 4 bars
  //    Features: swung displaced drums, walking bass, Dm7-Gm7-Am7-A7 jazz
  //              progression, smooth call-and-response melody
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Lo-Fi Chill",
    description: "Nujabes 'Feather' style — Dm7 jazz, 87 BPM",
    tempo: 87,
    numBars: 4,
    tracks: [
      {
        instrument: "drums",
        notes: [
          // ── Bar 1 (0–15) — swung, laid-back ──────────────────────
          { step:  0, pitch: KICK,    velocity: 86 },
          { step:  5, pitch: KICK,    velocity: 72 },
          { step: 10, pitch: KICK,    velocity: 80 },
          { step:  6, pitch: SNARE,   velocity: 78 },
          { step: 14, pitch: SNARE,   velocity: 72 },
          { step:  0, pitch: HIHAT,   velocity: 60 }, { step:  2, pitch: HIHAT, velocity: 44 },
          { step:  3, pitch: HIHAT,   velocity: 36 }, { step:  4, pitch: OPENHAT,velocity: 54 },
          { step:  6, pitch: HIHAT,   velocity: 56 }, { step:  7, pitch: HIHAT, velocity: 40 },
          { step:  8, pitch: HIHAT,   velocity: 60 }, { step: 10, pitch: HIHAT, velocity: 44 },
          { step: 11, pitch: HIHAT,   velocity: 36 }, { step: 12, pitch: OPENHAT,velocity: 52 },
          { step: 14, pitch: HIHAT,   velocity: 56 }, { step: 15, pitch: HIHAT, velocity: 40 },

          // ── Bar 2 (16–31) ────────────────────────────────────────
          { step: 16, pitch: KICK,    velocity: 86 },
          { step: 21, pitch: KICK,    velocity: 72 },
          { step: 26, pitch: KICK,    velocity: 80 },
          { step: 22, pitch: SNARE,   velocity: 78 },
          { step: 30, pitch: SNARE,   velocity: 72 },
          { step: 16, pitch: HIHAT,   velocity: 60 }, { step: 18, pitch: HIHAT, velocity: 44 },
          { step: 19, pitch: HIHAT,   velocity: 36 }, { step: 20, pitch: OPENHAT,velocity: 54 },
          { step: 22, pitch: HIHAT,   velocity: 56 }, { step: 23, pitch: HIHAT, velocity: 40 },
          { step: 24, pitch: HIHAT,   velocity: 60 }, { step: 26, pitch: HIHAT, velocity: 44 },
          { step: 27, pitch: HIHAT,   velocity: 36 }, { step: 28, pitch: OPENHAT,velocity: 52 },
          { step: 30, pitch: HIHAT,   velocity: 56 }, { step: 31, pitch: HIHAT, velocity: 40 },

          // ── Bar 3 (32–47) — ghost snare added ────────────────────
          { step: 32, pitch: KICK,    velocity: 86 },
          { step: 37, pitch: KICK,    velocity: 72 },
          { step: 42, pitch: KICK,    velocity: 80 },
          { step: 38, pitch: SNARE,   velocity: 78 },
          { step: 35, pitch: SNARE,   velocity: 40 },  // ghost note
          { step: 46, pitch: SNARE,   velocity: 72 },
          { step: 32, pitch: HIHAT,   velocity: 60 }, { step: 34, pitch: HIHAT, velocity: 44 },
          { step: 35, pitch: HIHAT,   velocity: 36 }, { step: 36, pitch: OPENHAT,velocity: 54 },
          { step: 38, pitch: HIHAT,   velocity: 56 }, { step: 39, pitch: HIHAT, velocity: 40 },
          { step: 40, pitch: HIHAT,   velocity: 60 }, { step: 42, pitch: HIHAT, velocity: 44 },
          { step: 43, pitch: HIHAT,   velocity: 36 }, { step: 44, pitch: OPENHAT,velocity: 52 },
          { step: 46, pitch: HIHAT,   velocity: 56 }, { step: 47, pitch: HIHAT, velocity: 40 },

          // ── Bar 4 (48–63) — more ghost notes + light fill ────────
          { step: 48, pitch: KICK,    velocity: 86 },
          { step: 53, pitch: KICK,    velocity: 72 },
          { step: 58, pitch: KICK,    velocity: 80 },
          { step: 50, pitch: SNARE,   velocity: 38 },  // ghost
          { step: 54, pitch: SNARE,   velocity: 78 },
          { step: 59, pitch: SNARE,   velocity: 40 },  // ghost
          { step: 62, pitch: SNARE,   velocity: 72 },
          { step: 48, pitch: HIHAT,   velocity: 60 }, { step: 50, pitch: HIHAT, velocity: 44 },
          { step: 51, pitch: HIHAT,   velocity: 36 }, { step: 52, pitch: OPENHAT,velocity: 54 },
          { step: 54, pitch: HIHAT,   velocity: 56 }, { step: 55, pitch: HIHAT, velocity: 40 },
          { step: 56, pitch: HIHAT,   velocity: 60 }, { step: 58, pitch: HIHAT, velocity: 44 },
          { step: 59, pitch: HIHAT,   velocity: 36 }, { step: 60, pitch: OPENHAT,velocity: 52 },
          { step: 62, pitch: HIHAT,   velocity: 56 }, { step: 63, pitch: HIHAT, velocity: 40 },
        ],
      },
      {
        instrument: "bass",
        // Jazzy walking bass — Dm7 | Gm7 | Am7 | A7 → Dm
        notes: [
          // Bar 1 — Dm7 (D-F-A-C walking)
          { step:  0, pitch: D3, velocity: 86 }, { step:  2, pitch: D3, velocity: 70 },
          { step:  4, pitch: A3, velocity: 82 }, { step:  6, pitch: F3, velocity: 76 },
          { step:  8, pitch: D3, velocity: 84 }, { step: 10, pitch: E3, velocity: 74 },
          { step: 12, pitch: F3, velocity: 80 }, { step: 14, pitch: G3, velocity: 72 },
          // Bar 2 — Gm7 (G-Bb-D-F walking)
          { step: 16, pitch: G3, velocity: 86 }, { step: 18, pitch: G3, velocity: 70 },
          { step: 20, pitch: D3, velocity: 82 }, { step: 22, pitch: Bb3,velocity: 76 },
          { step: 24, pitch: G3, velocity: 84 }, { step: 26, pitch: F3, velocity: 74 },
          { step: 28, pitch: E3, velocity: 80 }, { step: 30, pitch: A3, velocity: 72 },
          // Bar 3 — Am7 (A-C-E-G)
          { step: 32, pitch: A3, velocity: 86 }, { step: 34, pitch: A3, velocity: 70 },
          { step: 36, pitch: C4, velocity: 82 }, { step: 38, pitch: G3, velocity: 76 },
          { step: 40, pitch: A3, velocity: 84 }, { step: 42, pitch: G3, velocity: 74 },
          { step: 44, pitch: F3, velocity: 80 }, { step: 46, pitch: E3, velocity: 72 },
          // Bar 4 — A7 → Dm resolve (A-C#-E-G → D)
          { step: 48, pitch: A3, velocity: 88 }, { step: 50, pitch: A3, velocity: 72 },
          { step: 52, pitch: E3, velocity: 84 }, { step: 54, pitch: Gb3,velocity: 76 },
          { step: 56, pitch: A3, velocity: 86 }, { step: 58, pitch: G3, velocity: 76 },
          { step: 60, pitch: E3, velocity: 82 }, { step: 62, pitch: D3, velocity: 74 },
        ],
      },
      {
        instrument: "synth",
        // Full 4-note jazz chord voicings — Dm7 | Gm7 | Am7 | A7
        notes: [
          // Bar 1: Dm7 = D4-F4-A4-C5
          { step:  0, pitch: D4, velocity: 74 }, { step:  0, pitch: F4, velocity: 68 },
          { step:  0, pitch: A4, velocity: 64 }, { step:  0, pitch: C5, velocity: 60 },
          // add inner chord motion at bar midpoint
          { step:  8, pitch: D4, velocity: 70 }, { step:  8, pitch: F4, velocity: 64 },
          { step:  8, pitch: A4, velocity: 60 }, { step:  8, pitch: C5, velocity: 56 },
          // Bar 2: Gm7 = G4-Bb4-D4-F4
          { step: 16, pitch: G4,  velocity: 74 }, { step: 16, pitch: Bb4, velocity: 68 },
          { step: 16, pitch: D4,  velocity: 64 }, { step: 16, pitch: F4,  velocity: 60 },
          { step: 24, pitch: G4,  velocity: 70 }, { step: 24, pitch: Bb4, velocity: 64 },
          { step: 24, pitch: D4,  velocity: 60 }, { step: 24, pitch: F4,  velocity: 56 },
          // Bar 3: Am7 = A4-C5-E4-G4
          { step: 32, pitch: A4, velocity: 74 }, { step: 32, pitch: C5, velocity: 68 },
          { step: 32, pitch: E4, velocity: 64 }, { step: 32, pitch: G4, velocity: 60 },
          { step: 40, pitch: A4, velocity: 70 }, { step: 40, pitch: C5, velocity: 64 },
          { step: 40, pitch: E4, velocity: 60 }, { step: 40, pitch: G4, velocity: 56 },
          // Bar 4: A7 = A4-C#/Db4-E4-G4, then Dm7 resolve
          { step: 48, pitch: A4,  velocity: 76 }, { step: 48, pitch: Db4, velocity: 70 },
          { step: 48, pitch: E4,  velocity: 66 }, { step: 48, pitch: G4,  velocity: 62 },
          { step: 56, pitch: D4,  velocity: 74 }, { step: 56, pitch: F4,  velocity: 68 },
          { step: 56, pitch: A4,  velocity: 64 }, { step: 56, pitch: C5,  velocity: 60 },
        ],
      },
      {
        instrument: "lead",
        // "Feather" style melody — question (bar1+2), answer (bar3+4)
        notes: [
          // Bar 1 — question phrase over Dm7
          { step:  1, pitch: F4,  velocity: 80 },
          { step:  3, pitch: A4,  velocity: 74 },
          { step:  5, pitch: G4,  velocity: 77 },
          { step:  7, pitch: E4,  velocity: 70 },
          { step:  9, pitch: F4,  velocity: 76 },
          { step: 11, pitch: D4,  velocity: 66 },
          { step: 13, pitch: E4,  velocity: 72 },
          { step: 15, pitch: F4,  velocity: 64 },
          // Bar 2 — continuation over Gm7
          { step: 17, pitch: G4,  velocity: 78 },
          { step: 19, pitch: Bb4, velocity: 74 },
          { step: 21, pitch: A4,  velocity: 76 },
          { step: 23, pitch: G4,  velocity: 70 },
          { step: 25, pitch: F4,  velocity: 75 },
          { step: 27, pitch: E4,  velocity: 68 },
          { step: 29, pitch: D4,  velocity: 72 },
          { step: 31, pitch: E4,  velocity: 62 },
          // Bar 3 — answer phrase over Am7, steps up
          { step: 33, pitch: A4,  velocity: 80 },
          { step: 35, pitch: C5,  velocity: 76 },
          { step: 37, pitch: Bb4, velocity: 78 },
          { step: 39, pitch: A4,  velocity: 72 },
          { step: 41, pitch: G4,  velocity: 76 },
          { step: 43, pitch: F4,  velocity: 70 },
          { step: 45, pitch: E4,  velocity: 74 },
          { step: 47, pitch: Gb4, velocity: 66 },
          // Bar 4 — resolve over A7 → Dm, descending to D
          { step: 49, pitch: A4,  velocity: 80 },
          { step: 51, pitch: G4,  velocity: 74 },
          { step: 53, pitch: E4,  velocity: 76 },
          { step: 55, pitch: Gb4, velocity: 70 },
          { step: 57, pitch: F4,  velocity: 76 },
          { step: 59, pitch: E4,  velocity: 70 },
          { step: 61, pitch: D4,  velocity: 74 },
          { step: 63, pitch: F4,  velocity: 64 },
        ],
      },
    ],
  },
];
