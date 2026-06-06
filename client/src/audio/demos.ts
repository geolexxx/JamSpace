// Demo patterns inspired by common music genres.
// Each note: { step: 0-15, pitch: MIDI note, velocity: 0-127 }

export interface DemoNote { step: number; pitch: number; velocity: number; }
export interface DemoTrackPattern { instrument: string; notes: DemoNote[]; }
export interface DemoPattern { name: string; description: string; tempo: number; tracks: DemoTrackPattern[]; }

// Drum pitch constants
const KICK = 36, SNARE = 38, HIHAT = 42, OPENHAT = 46, CLAP = 39, CRASH = 49;

// Bass range: C3–C4 (MIDI 48–60) — matches StepGrid bass display
const C3 = 48, D3 = 50, E3 = 52, F3 = 53, G3 = 55, A3 = 57, B3 = 59, C4 = 60;
// Synth/Lead range: C4–C5 (MIDI 60–72) — matches StepGrid synth/lead display
const D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71, C5 = 72;

export const DEMO_PATTERNS: DemoPattern[] = [
  {
    name: "Classic Rock",
    description: "经典摇滚 4/4 节奏",
    tempo: 120,
    tracks: [
      {
        instrument: "drums",
        notes: [
          // Kick on 1 & 3 (steps 0, 8)
          { step: 0, pitch: KICK, velocity: 110 },
          { step: 8, pitch: KICK, velocity: 100 },
          { step: 3, pitch: KICK, velocity: 80 },
          { step: 11, pitch: KICK, velocity: 80 },
          // Snare on 2 & 4 (steps 4, 12)
          { step: 4, pitch: SNARE, velocity: 110 },
          { step: 12, pitch: SNARE, velocity: 110 },
          // Hi-hat 8th notes
          { step: 0, pitch: HIHAT, velocity: 70 },
          { step: 2, pitch: HIHAT, velocity: 60 },
          { step: 4, pitch: HIHAT, velocity: 70 },
          { step: 6, pitch: HIHAT, velocity: 60 },
          { step: 8, pitch: HIHAT, velocity: 70 },
          { step: 10, pitch: HIHAT, velocity: 60 },
          { step: 12, pitch: HIHAT, velocity: 70 },
          { step: 14, pitch: HIHAT, velocity: 60 },
          // Crash on beat 1
          { step: 0, pitch: CRASH, velocity: 90 },
        ],
      },
      {
        instrument: "bass",
        notes: [
          { step: 0, pitch: E3, velocity: 100 },
          { step: 2, pitch: E3, velocity: 80 },
          { step: 4, pitch: A3, velocity: 100 },
          { step: 6, pitch: A3, velocity: 80 },
          { step: 8, pitch: G3, velocity: 100 },
          { step: 10, pitch: G3, velocity: 80 },
          { step: 12, pitch: A3, velocity: 100 },
          { step: 14, pitch: B3, velocity: 90 },
        ],
      },
      {
        instrument: "synth",
        notes: [
          { step: 0, pitch: E4, velocity: 90 },
          { step: 0, pitch: G4, velocity: 80 },
          { step: 4, pitch: A4, velocity: 90 },
          { step: 4, pitch: C5, velocity: 80 },
          { step: 8, pitch: G4, velocity: 90 },
          { step: 8, pitch: B4, velocity: 80 },
          { step: 12, pitch: A4, velocity: 90 },
          { step: 12, pitch: C5, velocity: 80 },
        ],
      },
      {
        instrument: "lead",
        notes: [
          { step: 1, pitch: E4, velocity: 100 },
          { step: 3, pitch: G4, velocity: 95 },
          { step: 5, pitch: A4, velocity: 100 },
          { step: 7, pitch: B4, velocity: 90 },
          { step: 9, pitch: A4, velocity: 100 },
          { step: 11, pitch: G4, velocity: 95 },
          { step: 13, pitch: E4, velocity: 100 },
          { step: 15, pitch: D4, velocity: 85 },
        ],
      },
    ],
  },

  {
    name: "Trap Beat",
    description: "Hi-hat 连击 Trap 节奏",
    tempo: 140,
    tracks: [
      {
        instrument: "drums",
        notes: [
          // 808-style kick
          { step: 0, pitch: KICK, velocity: 120 },
          { step: 3, pitch: KICK, velocity: 90 },
          { step: 8, pitch: KICK, velocity: 120 },
          { step: 11, pitch: KICK, velocity: 90 },
          { step: 12, pitch: KICK, velocity: 100 },
          // Snare on 2 & 4
          { step: 4, pitch: SNARE, velocity: 110 },
          { step: 12, pitch: SNARE, velocity: 110 },
          // Clap layered on snare
          { step: 4, pitch: CLAP, velocity: 90 },
          { step: 12, pitch: CLAP, velocity: 90 },
          // Hi-hat rolls (16th notes)
          { step: 0, pitch: HIHAT, velocity: 80 },
          { step: 1, pitch: HIHAT, velocity: 60 },
          { step: 2, pitch: HIHAT, velocity: 80 },
          { step: 3, pitch: HIHAT, velocity: 60 },
          { step: 5, pitch: HIHAT, velocity: 80 },
          { step: 6, pitch: HIHAT, velocity: 60 },
          { step: 7, pitch: HIHAT, velocity: 80 },
          { step: 8, pitch: HIHAT, velocity: 80 },
          { step: 9, pitch: HIHAT, velocity: 60 },
          { step: 10, pitch: HIHAT, velocity: 80 },
          { step: 13, pitch: HIHAT, velocity: 80 },
          { step: 14, pitch: HIHAT, velocity: 60 },
          { step: 15, pitch: OPENHAT, velocity: 70 },
        ],
      },
      {
        instrument: "bass",
        notes: [
          { step: 0, pitch: C3, velocity: 110 },
          { step: 1, pitch: C3, velocity: 90 },
          { step: 6, pitch: G3, velocity: 100 },
          { step: 8, pitch: C3, velocity: 110 },
          { step: 9, pitch: C3, velocity: 90 },
          { step: 14, pitch: A3, velocity: 100 },
          { step: 15, pitch: B3, velocity: 90 },
        ],
      },
      {
        instrument: "synth",
        notes: [
          { step: 0,  pitch: C4, velocity: 85 },
          { step: 0,  pitch: E4, velocity: 80 },
          { step: 4,  pitch: A4, velocity: 85 },
          { step: 4,  pitch: C5, velocity: 80 },
          { step: 8,  pitch: F4, velocity: 85 },
          { step: 8,  pitch: A4, velocity: 80 },
          { step: 12, pitch: G4, velocity: 85 },
          { step: 12, pitch: B4, velocity: 80 },
        ],
      },
      {
        instrument: "lead",
        notes: [
          { step: 2, pitch: C4, velocity: 95 },
          { step: 4, pitch: D4, velocity: 90 },
          { step: 6, pitch: F4, velocity: 95 },
          { step: 10, pitch: E4, velocity: 90 },
          { step: 14, pitch: D4, velocity: 85 },
        ],
      },
    ],
  },

  {
    name: "Lo-Fi Chill",
    description: "放松 Lo-Fi 氛围",
    tempo: 85,
    tracks: [
      {
        instrument: "drums",
        notes: [
          { step: 0, pitch: KICK, velocity: 85 },
          { step: 5, pitch: KICK, velocity: 70 },
          { step: 10, pitch: KICK, velocity: 80 },
          { step: 4, pitch: SNARE, velocity: 75 },
          { step: 12, pitch: SNARE, velocity: 70 },
          { step: 0, pitch: HIHAT, velocity: 55 },
          { step: 2, pitch: HIHAT, velocity: 45 },
          { step: 4, pitch: HIHAT, velocity: 55 },
          { step: 6, pitch: HIHAT, velocity: 45 },
          { step: 8, pitch: HIHAT, velocity: 55 },
          { step: 10, pitch: HIHAT, velocity: 45 },
          { step: 12, pitch: HIHAT, velocity: 55 },
          { step: 14, pitch: OPENHAT, velocity: 50 },
        ],
      },
      {
        instrument: "bass",
        notes: [
          { step: 0, pitch: C3, velocity: 80 },
          { step: 3, pitch: E3, velocity: 70 },
          { step: 6, pitch: G3, velocity: 75 },
          { step: 9, pitch: A3, velocity: 70 },
          { step: 12, pitch: F3, velocity: 80 },
          { step: 15, pitch: G3, velocity: 70 },
        ],
      },
      {
        instrument: "synth",
        notes: [
          { step: 0,  pitch: C4, velocity: 70 },
          { step: 0,  pitch: E4, velocity: 65 },
          { step: 0,  pitch: G4, velocity: 60 },
          { step: 6,  pitch: A4, velocity: 70 },
          { step: 6,  pitch: C5, velocity: 65 },
          { step: 6,  pitch: E4, velocity: 60 },
          { step: 12, pitch: F4, velocity: 70 },
          { step: 12, pitch: A4, velocity: 65 },
          { step: 12, pitch: C5, velocity: 60 },
        ],
      },
      {
        instrument: "lead",
        notes: [
          { step: 1,  pitch: E4, velocity: 75 },
          { step: 4,  pitch: D4, velocity: 70 },
          { step: 7,  pitch: C4, velocity: 75 },
          { step: 10, pitch: B4, velocity: 70 },
          { step: 13, pitch: A4, velocity: 65 },
        ],
      },
    ],
  },
];
