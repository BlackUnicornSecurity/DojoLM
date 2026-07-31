# Sengoku

Sengoku is the continuous red teaming module.

## Current Tabs

- `Campaigns`
- `Temporal`

## Campaigns

Use `Campaigns` to:

- create new campaigns
- browse existing campaigns
- inspect status
- launch `Run Now`
- monitor current execution progress

The current UI includes:

- campaign list
- campaign detail view
- new campaign builder with target source selection
- run-progress banner with polling

### Target Sources

When creating a campaign, you choose where the target LLM lives:

| Source | Description | Auth |
|--------|-------------|------|
| **External URL** | Any HTTP/HTTPS endpoint (e.g. `https://api.openai.com/v1/chat`) | API Key or Bearer Token |
| **LLM Dashboard** | A model already configured in the LLM Dashboard — credentials are resolved automatically from the encrypted model config | None required (uses stored credentials) |
| **Local (Ollama)** | A locally running Ollama instance — auto-detects available models | None required |

- **External URL** is the default and works with any OpenAI-compatible or custom API endpoint.
- **LLM Dashboard** pulls from `/api/llm/models` and resolves the model's base URL and credentials at execution time. No need to re-enter API keys.
- **Local (Ollama)** defaults to `http://localhost:11434` and auto-detects models via `/api/llm/local-models`. You can also type a model name manually if auto-detection is unavailable.

## Temporal

Use `Temporal` for time-oriented, multi-turn attack scenarios. It is the home for what older docs called `Time Chamber`.

### Status (Wave 4, 2026-04-19)

The `Temporal` tab is live end-to-end:

- **Deterministic simulator** (ADR-0019 Wave 2) runs every published plan without a live model.
- **LLM executor** (ADR-0023 Wave 3) drives real multi-turn conversations when `SENGOKU_LLM_PROVIDER` / `SENGOKU_LLM_MODEL` / `SENGOKU_LLM_API_KEY` are configured and the `sengoku.llm` flag is on.
- **SSE streaming UI** (ADR-0024 Wave 3 backend + ADR-0032 Wave 4 UI) opens an `EventSource` against `GET /api/sengoku/temporal/runs/stream?planId=…` so operators see each turn pair arrive as the LLM responds. A `StreamingTurns` panel renders role, turn number, verdict badge, and truncated content. When the flag is off the UI transparently falls back to the synchronous `POST /api/sengoku/temporal/runs` — no stream-only failure mode surfaces.
- **Resume** (ADR-0039 Wave 4 library + ADR-0047 Wave 6 UI) — an LLM-executor run that fails mid-plan persists a `.partial.json` checkpoint under `<TPI_DATA_DIR>/sengoku/runs/`. When a plan with one or more partials is expanded, a `Resume (N)` button appears beside `Simulate`. Clicking it continues from the latest checkpoint and renders the final `RunRecord`. The server routes are `GET /api/sengoku/temporal/runs/partials?planId=…` (listing) and `POST /api/sengoku/temporal/runs/resume` (resume body `{ planId, runId? }`).

### LLM cost + rate limit

- Every LLM-executor `RunRecord` carries `llmUsage = { promptTokens, completionTokens, totalTokens, durationMs }` (ADR-0035 Wave 4). The `complete` SSE event carries the same shape.
- Sengoku shares the per-minute LLM call budget with Kotoba (ADR-0036 Wave 4). When `LLM_CALL_LIMIT_PER_MIN` is exceeded, the executor falls back to the deterministic simulator for the duration of the saturation event and one `LLM_BUDGET_EXCEEDED` audit entry is written.

## Statuses

Current campaign statuses include:

- `Draft`
- `Active`
- `Completed`
- `Paused`
- `Archived`

## Best Use Cases

- repeatable campaign-based red teaming
- scheduled or manual reruns
- time-based scenario exploration

## Related Docs

- [Common Workflows](../COMMON_WORKFLOWS.md)
- [Arena](BATTLE_ARENA.md), [Amaterasu DNA](AMATERASU_DNA.md), [Mitsuke](MITSUKE.md), [Kagami](KAGAMI.md) _(promoted from the retired Kumite hub; see [retirement notice](THE_KUMITE.md))_
- [Glossary](../GLOSSARY.md)
