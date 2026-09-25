# JamSpace custom agents

These project-scoped Codex agents define responsibilities for JamSpace 1.1. Each TOML file is a reusable role; creating these files does not start an agent or a task. Assign a concrete, bounded task when using one.

| Agent | Model / effort | Owns | Hands off to |
| --- | --- | --- | --- |
| `product-manager` | Astra / medium | PRD, release scope, priorities, success metrics, acceptance criteria | All implementation roles |
| `ui-designer` | Luna / high | Page flows, UI states, copy, interaction specs | `frontend-developer` |
| `frontend-developer` | Sol / medium | React UI in `client/src/App.tsx`, `client/src/components/`, `client/src/index.css` | `backend-developer`, `audio-engineer`, `ai-engineer` for contracts |
| `backend-developer` | Sol / high | `server/src/lib.rs`, generated bindings, data access, roles, invitations, published-version persistence | `frontend-developer`, `ai-engineer` |
| `audio-engineer` | Sol / high | `client/src/audio/`, playback timing, offline rendering, WAV export | `frontend-developer`, `backend-developer` |
| `ai-engineer` | Sol / high | AI Bass candidate generation, note schema, evaluation, latency and cost | `frontend-developer`, `backend-developer` |
| `reviewer` | Astra / medium | Independent read-only review of behavior, permissions, races, audio and AI risks | The agent that owns the finding |

Model choices favor stronger reasoning for product scope and independent review, balanced coding for implementation, and faster execution for bounded UI specifications. The explicit model and effort in each TOML file take precedence over the parent agent's defaults.

## Concrete 1.1 assignments

- **Product manager:** Maintain one release PRD with acceptance criteria for invitation, WAV export, published listening links, and AI Bass suggestions. Decide defaults for project visibility, editor access, listener downloads, and release metrics.
- **UI designer:** Specify the project home, top-right collaboration entry, share modal, member roles, invite landing states, export/publish flow, mobile listening page, and private AI candidate panel.
- **Backend developer:** Replace public project access with authorized subscriptions and reducers; add durable identity, membership, invite/revocation, published-version records, and atomic AI note acceptance.
- **Frontend developer:** Build the home and editor UI against agreed contracts; show role-specific actions and errors; integrate export, publishing, and AI preview without changing shared playback for local actions.
- **Audio engineer:** Verify existing instruments in offline rendering, implement snapshot-to-WAV output, preserve silent bars and tails, and compare exported audio with live playback.
- **AI engineer:** Generate three bounded Bass candidates from a selected Pattern, validate each note, measure musical quality and latency, and expose a server-side generation contract.
- **Reviewer:** Independently verify end-to-end invite/revoke, cross-project access, dual-user editing, WAV completeness, share-link revocation, and AI conflict behavior.

## Suggested work order for 1.1

1. `product-manager` defines the feature and acceptance criteria; `ui-designer` specifies the user flows.
2. `backend-developer` settles identity, access, and data contracts before the collaboration UI is built.
3. `audio-engineer` validates export feasibility; `ai-engineer` validates editable note generation. Their code work can be independent once shared contracts are agreed.
4. `frontend-developer` integrates the approved interfaces into the product.
5. `reviewer` checks the integrated flows and reports concrete failures to the owner.

Avoid simultaneous edits to the same file. In particular, the backend owns note persistence and permissions; the AI agent owns generation; the audio agent owns rendering; the frontend agent owns user-facing React components. An agent may investigate outside its area, but should coordinate before changing another owner's files.
