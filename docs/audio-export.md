# WAV export notes

JamSpace 1.1 renders the current Song arrangement in the browser. Playback and export use the same ordered block timeline, including blocks with no notes. The export takes a copy of the project when **Download WAV** is clicked and writes one 44.1 kHz, 16-bit stereo PCM file with up to two seconds of instrument tail. The maximum file length is five minutes. Shared track mute and volume settings apply; personal listening volume does not.

The browser loads only the piano and lead samples needed by a given export. If either remote source is unavailable, both live playback and export have built-in synthesized fallback voices for that instrument. Export still works without the sample host, although the fallback has a different tone. A full project with Drums, Bass, Synth, and Lead was exported in the browser and checked as playable PCM audio. Playback parity of the sampled voices across browsers still needs listening QA.

## Sample credits

- [Salamander Grand Piano](https://github.com/Tonejs/audio/tree/master/salamander), by Alexander Holm, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- [tonejs-instruments electric guitar](https://github.com/nbrosowsky/tonejs-instruments), source credited to Karoryfer in the repository's [sample source list](https://github.com/nbrosowsky/tonejs-instruments/blob/master/sample-source-info.txt). The repository lists its samples as CC BY 3.0.

JamSpace streams these existing samples for the current player and export; this change does not bundle sample files. The credits also appear in the export dialog. Publication of WAV files should retain appropriate attribution to sample creators.
