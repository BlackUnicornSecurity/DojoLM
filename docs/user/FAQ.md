# FAQ

## What is DojoLM?

DojoLM is the current repository and product name for this monorepo. Older docs may refer to NODA or named update plans such as KASHIWA and HAKONE; those are historical planning labels, not the current top-level product surface.

## What is running where?

- Standalone scanner API: `http://localhost:8089`
- Web app: `http://localhost:42001`
- MCP server default: `127.0.0.1:18000`

## How many patterns and fixtures are in the repository right now?

As of the 2026-03-24 audit:

- `510` patterns
- `49` pattern groups
- `2,960` fixtures
- `37` fixture categories

## Is the standalone scanner API GET-only?

Yes. The scanner in `packages/bu-tpi/src/serve.ts` is GET-only. Older docs that describe `POST /api/scan` on port `8089` are outdated.

## Then where is the POST scanner route?

In the web app:

- `POST http://localhost:42001/api/scan`

## Is LLM Jutsu a separate module?

No. `Jutsu` is a tab inside `LLM Dashboard`.

## Is Amaterasu DNA a separate top-level module?

No. It lives inside `The Kumite`.

## Is Time Chamber still a separate module?

No. Legacy Time Chamber references map to Sengoku temporal features and widgets.

## Where do I configure providers now?

Use:

- `Admin -> API Keys` for provider-backed model entries and credentials
- `LLM Dashboard -> Models` for managing model definitions

Older docs that say `Admin -> Providers` are outdated.

## How many LLM providers are supported?

There are three useful answers:

- the canonical provider type union in `bu-tpi` has `19` provider IDs
- the built-in preset registry ships `57` presets (`51` cloud and `6` local)
- the current web UI directly wires provider info and adapters for the major providers and `custom`

## Can I use local models?

Yes. The current UI explicitly supports:

- Ollama
- LM Studio
- llama.cpp

## Where is data stored?

Operational web data lives under `packages/dojolm-web/data`. That includes findings, guard state, LLM results, arena data, and DNA data.

## Can I call the web API from scripts?

Yes. For programmatic access, send `X-API-Key` unless the request is coming from the same-origin browser UI.

## Why am I getting `401 Authentication required`?

Because the route is protected and your request is not recognized as a same-origin browser request. Add:

```bash
-H "X-API-Key: $NODA_API_KEY"
```

## Why am I getting `503 Server misconfiguration`?

In production mode the app fails closed if required secrets such as `NODA_API_KEY` or `GUARD_CONFIG_SECRET` are missing for protected flows.

## How do I verify the docs are still aligned?

Run:

```bash
npm run verify:docs
```

### How can I request features?

Open a GitHub issue with the "feature request" label.

---

**Didn't find your answer?** Contact info@blackunicorn.tech
