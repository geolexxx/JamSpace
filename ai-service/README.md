# JamSpace melody agent (local prototype)

This service reads a selected melody bar and limited nearby musical context, asks an OpenAI model to compose three editable four-bar continuations, validates the notes, then returns them for private preview. It never writes a project. The existing JamSpace reducer saves only the candidate a user applies.

## Run

Use Node 20 or later. Provide your own API key to the **server process**, then run `npm start` in this directory. The server binds to `127.0.0.1:8787`; the Vite client proxies `/api/melody/*` to that address. Do not put the key in a `VITE_` variable or browser code.

Environment variables:

- `OPENAI_API_KEY` — required for generation.
- `OPENAI_MODEL` — optional, defaults to `gpt-6-luna`.

Each generation uses one [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses) call and makes one repair call only if output is invalid. Each call has a 20-second timeout and a 4,000 output-token cap. Responses are requested with `store: false`. There is no rules-based fallback. Without a key, the endpoint returns `503 AI_NOT_CONFIGURED`.

`POST /api/melody/continue` accepts `sourceNotes`, optional `previousNotes` and `contextNotes`, `sourceBar`, `stepsPerBar`, `tempoBpm`, `allowedPitches`, optional `variationSeed`, and optional `instruction`. Notes are `{step,pitch,velocity,duration}` with absolute grid steps. Success is `{ "candidates": [ ... ] }`, with IDs `familiar`, `lift`, and `answer`. Errors are `{ "error": { "code": "...", "message": "..." } }`. `GET /api/melody/health` reports whether a key is present.

This is a local prototype endpoint. Hosting it publicly requires project authentication and per-user rate/spend controls.
