# JamSpace melody agent (local prototype)

This service reads the current bar and nearby notes for drums, bass, synth, and lead, asks an OpenAI model to compose three editable four-bar full-band continuations, validates the notes, then returns them for private preview. It never writes a project. JamSpace saves only the candidate a user applies.

## Run

Use Node 20 or later. Provide your own API key to the **server process**, then run `npm start` in this directory. The server binds to `127.0.0.1:8787`; the Vite client proxies `/api/melody/*` to that address. Do not put the key in a `VITE_` variable or browser code.

Environment variables:

- `OPENAI_API_KEY` — required for generation.
- `OPENAI_MODEL` — optional, defaults to `gpt-6-luna`.

Each generation uses one [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses) call and makes one repair call only if output is invalid. The four-instrument arrangement has a 45-second timeout and a 10,000 output-token cap per call. Responses are requested with `store: false`. There is no rules-based fallback. Without a key, the endpoint returns `503 AI_NOT_CONFIGURED`.

`POST /api/melody/continue` accepts `sourceBar`, `stepsPerBar`, `tempoBpm`, optional `variationSeed` and `instruction`, and exactly four `tracks`: one each for `drums`, `bass`, `synth`, and `lead`. Each track is `{trackId,instrument,sourceNotes,previousNotes?,allowedPitches}`. Notes are `{step,pitch,velocity,duration}` with absolute grid steps. A source track may be empty if another track contains the idea. Success is `{ "candidates": [ ... ] }`, with IDs `familiar`, `lift`, and `answer`; each candidate's `notes` include `trackId` so the client can preview and apply all four parts together. Every candidate must include notes for every instrument in each of the four new bars. The older single-track request and response shapes remain supported. Errors are `{ "error": { "code": "...", "message": "..." } }`. `GET /api/melody/health` reports whether a key is present.

This is a local prototype endpoint. Hosting it publicly requires project authentication and per-user rate/spend controls.
