# Troubleshooting

This page focuses on the most common issues users hit while running the current platform locally.

## The Web App Does Not Start

Check whether port `42001` is already in use:

```bash
lsof -i :42001
```

Then restart:

```bash
npm run dev:web
```

## The Standalone Scanner Does Not Start

Check whether port `8089` is already in use:

```bash
lsof -i :8089
```

Then restart:

```bash
npm start --workspace=packages/bu-tpi
```

## API Calls Return `401 Authentication required`

Cause:

- the request is protected
- the request is not recognized as a same-origin browser call

Fix:

```bash
-H "X-API-Key: $NODA_API_KEY"
```

If you are calling from a script, always prefer sending the API key explicitly.

## API Calls Return `503 Server misconfiguration`

Common cause:

- production-like mode with required secrets missing

Check:

- `NODA_API_KEY`
- `GUARD_CONFIG_SECRET`
- `NEXT_PUBLIC_APP_URL`

## Guarded LLM Runs Fail

If [Hattori Guard](modules/HATTORI_GUARD.md) is enabled and guarded execution fails:

- confirm `GUARD_CONFIG_SECRET` is set in production-like environments
- verify the guard configuration was saved successfully
- try a simpler mode such as `Shinobi` to isolate whether blocking is the issue

## I Added A Provider But The Model Does Not Appear

Check:

- the provider entry was saved in `Admin -> API Keys`
- the model connection test passed
- the model is enabled in `LLM Dashboard -> Models`
- the base URL and model name are correct

See [LLM Provider Guide](LLM-PROVIDER-GUIDE.md).

## Local Model Discovery Returns No Models

Check the expected local server:

- Ollama: `http://localhost:11434`
- LM Studio: `http://localhost:1234`
- llama.cpp: `http://localhost:8080`

Also confirm the local model has been pulled or loaded before discovery.

## Fixtures Fail To Load In Armory

Check:

- the web app is running
- the fixture path is valid
- the fixture file is not outside the allowed categories
- the fixture is below current route limits

If the issue affects the full explorer, re-run the fixture manifest endpoint:

```bash
curl -H "X-API-Key: $NODA_API_KEY" http://localhost:42001/api/fixtures
```

## A File Upload Did Not Produce Useful Multimodal Results

That can be expected. The current scanner UI is not a full OCR or transcription pipeline.

Best practice:

- extract text first when possible
- use metadata sidecars
- use stored fixtures from [Armory](modules/ARMORY.md)

See [Multimodal Security Testing Guide](multimodal-testing-guide.md).

## Ronin Hub Looks Empty

Current state:

- `Programs` and `Submissions` are active
- `Planning` and `Intelligence` currently show placeholders

Also note:

- subscriptions and submissions may rely on local browser storage
- clearing browser storage can reset local Ronin data

## Atemi Lab Protocol Fuzz Looks Incomplete

That is expected. `Protocol Fuzz` currently renders a placeholder for a future integration. Use `Attack Tools`, `Skills`, `MCP`, and `WebMCP` for active work.

## The Docs Feel Out Of Sync

Run:

```bash
npm run verify:docs
```

Then start from:

- [User Documentation Home](README.md)
- [Platform Guide](PLATFORM_GUIDE.md)
- [Module Index](modules/README.md)
