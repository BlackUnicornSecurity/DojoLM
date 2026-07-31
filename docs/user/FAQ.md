# FAQ

## What is DojoLM?

DojoLM is the current repository and product name for this monorepo. Older docs may use historical internal planning labels; those are not the live navigation model.

## What runs where?

- Standalone scanner API: `http://localhost:8089`
- Web app: `http://localhost:42001`
- Web API: `http://localhost:42001/api`
- MCP server default: `127.0.0.1:18000`

## How large is the current scanner corpus?

As of the 2026-06-12 refresh (counts verified by `npm run verify:docs`):

- `544` patterns
- `49` pattern groups
- `5,281` fixtures
- `40` fixture categories

## Is the standalone scanner API GET-only?

Yes. The standalone scanner in `packages/bu-tpi/src/serve.ts` is GET-only.

## Where is the POST scanner route?

In the web app:

- `POST http://localhost:42001/api/scan`

## Is Jutsu a separate module?

Yes — `Jutsu (Model Lab)` is a first-class module (the former "LLM Dashboard"). It also has an inner tab also named `Jutsu` for benchmarking.

## Is Amaterasu DNA a separate top-level module?

Yes. As of the Wave 0 Kumite retirement (2026-04-18), Amaterasu DNA is a first-class module. It used to be nested inside "The Kumite".

## Is Time Chamber still a separate module?

No. Legacy `Time Chamber` references now map to [Sengoku](modules/SENGOKU.md), especially `Temporal`.

## Where do I configure providers now?

Use:

- `Admin -> API Keys` for provider-backed entries and credentials
- `Jutsu (Model Lab) -> Models` for model definitions and connection tests

## Can I use local models?

Yes. The current UI explicitly supports:

- Ollama
- LM Studio
- llama.cpp

## Do same-origin browser calls need `X-API-Key`?

Usually no. The browser UI is allowed through same-origin checks tied to `NEXT_PUBLIC_APP_URL`. External scripts should still send `X-API-Key`.

## Why do my scripts get `401 Authentication required`?

Because the route is protected and your request is not being treated as a same-origin browser request. Add:

```bash
-H "X-API-Key: $TPI_API_KEY"
```

## Why do I get `503 Server misconfiguration`?

In production mode the app fails closed if required secrets such as `TPI_API_KEY` or `GUARD_CONFIG_SECRET` are missing for protected or guarded flows.

## Where is the fixture library?

In [Buki (Payload Lab)](modules/ARMORY.md). The underlying fixture corpus lives under `packages/bu-tpi/fixtures`.

## Can I compare fixtures?

Yes. Buki supports compare mode and will load the selected fixtures side by side.

## What does multimodal scanning mean in this repo?

The current platform is strongest on extracted text, metadata, and stored fixtures. The scanner UI supports uploads, but the implementation is not a full OCR, speech-to-text, or video-analysis pipeline.

## What is active in Ronin Hub today?

`Programs` and `Submissions` are active. `Planning` and `Intelligence` currently render empty-state placeholders.

## What is active in Adversarial Lab today?

The main tabs are active, but `Protocol Fuzz` is currently a placeholder for a later integration, and `WebMCP` is preview-only (the UI shows an unavailable notice; the previous mock/simulated flow was removed). The module is a testing dashboard and does not itself run the MCP server.

## Where is operational data stored?

Operational web data lives under `packages/dojolm-web/data`. That includes LLM results, guard state, arena data, DNA data, and other persisted web-app records.

## How do I verify the docs are still aligned?

Run:

```bash
npm run verify:docs
```

## Where should I go next?

- New user: [Getting Started](GETTING_STARTED.md)
- Product map: [Platform Guide](PLATFORM_GUIDE.md)
- API automation: [User API Reference](API_REFERENCE.md)
- Problem-solving: [Troubleshooting](TROUBLESHOOTING.md)

**Didn’t find your answer?** Contact `info@blackunicorn.tech`.
