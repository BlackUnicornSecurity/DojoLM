# Platform Guide

This guide describes the current user-visible surface of the DojoLM web app and the standalone scanner.

## Current Platform Facts

- Scanner engine: `510` patterns across `49` groups
- Fixture library: `2,960` fixtures across `37` categories
- Standalone scanner API: `http://localhost:8089`
- Web app: `http://localhost:42001`

## Top-Level Navigation

### Dashboard

The landing page. It provides widgets, quick launch shortcuts, and summary views across the platform.

### Haiku Scanner

Direct text scanning for prompt-injection and related attacks.

What it does:

- scans text locally through the core engine
- shows findings and verdicts
- supports engine filtering through the API layer

### Armory

Fixture browser for the generated attack library.

What it does:

- browses fixture categories and files
- previews text fixtures and binary metadata
- supports quick scan flows against known payloads

### LLM Dashboard

The main execution surface for model testing.

Current tabs:

- `Models`
- `Tests`
- `Results`
- `Leaderboard`
- `Compare`
- `Custom Models`
- `Jutsu`

Important note:

- `LLM Jutsu` is a dashboard tab, not a separate top-level navigation item.

### Hattori Guard

Guard configuration, audit trails, and protection status for model execution flows.

Guard modes:

- `Shinobi`: monitor only
- `Samurai`: defend inputs
- `Sensei`: defend outputs
- `Hattori`: defend both directions

### Bushido Book

Compliance and evidence views, including exportable reports and coverage data.

### Atemi Lab

Adversarial and MCP-oriented testing views.

### The Kumite

Strategic analysis hub. It is a container for multiple subsystems:

- `SAGE`
- `Battle Arena`
- `Mitsuke`
- `Amaterasu DNA`
- `Kagami`
- `Shingan`

Important note:

- `Amaterasu DNA` is part of `The Kumite`, not a separate top-level module.

### Ronin Hub

Program, CVE, and submission-oriented research views.

### Sengoku

Continuous red teaming and temporal test orchestration.

Current tabs:

- `Campaigns`
- `Temporal`

Important note:

- `Time Chamber` legacy references now point to Sengoku temporal features and widgets.

### Kotoba

Prompt optimization and hardening workflows.

### Admin

Administrative and operational tooling.

Current tabs:

- `General`
- `Users`
- `Scoreboard`
- `API Keys`
- `Haiku Scanner & Guard`
- `System Health`
- `Export`
- `Admin Settings`
- `Validation`

## Common Workflows

### Scan a prompt

1. Open `Haiku Scanner`
2. Paste text
3. Run the scan
4. Review the verdict and findings

### Add a model for testing

1. Open `Admin -> API Keys`
2. Add a provider/model entry and credentials or base URL
3. Test the connection
4. Confirm it appears in `LLM Dashboard -> Models`

### Run a single model test

1. Open `LLM Dashboard -> Tests`
2. Select one enabled model
3. Select one or more test cases
4. Execute
5. Review `Results`

### Run a batch

1. Open `LLM Dashboard -> Tests`
2. Select multiple test cases and one or more models
3. Start a batch
4. Follow progress through results or the streaming batch route

### Review strategic signals

1. Open `The Kumite`
2. Switch between `SAGE`, `Arena`, `Mitsuke`, `DNA`, `Kagami`, and `Shingan`

### Run a campaign

1. Open `Sengoku`
2. Create or open a campaign
3. Run it immediately or manage it from the campaigns view
4. Use `Temporal` for time-oriented scenarios

## APIs You Will Most Often Use

- Standalone scanner: `GET /api/scan`
- Web scanner: `POST /api/scan`
- Web health: `GET /api/health`
- Models: `GET/POST /api/llm/models`
- Single execution: `POST /api/llm/execute`
- Batch execution: `POST /api/llm/batch`

See [API_REFERENCE.md](API_REFERENCE.md) for examples.

## Legacy Naming

Some older planning docs use `NODA`, `KASHIWA`, `HAKONE`, `LLM Jutsu` as a top-level module, `Amaterasu DNA` as a top-level module, or `Time Chamber` as a top-level module. Those descriptions are not the live navigation model.
- Clear browser cache
- Check console for errors
- Verify API is accessible

### Getting Help

- Documentation: [docs/](../)
- Issues: GitHub Issues
- Support: info@blackunicorn.tech

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick search |
| `Ctrl/Cmd + /` | Focus scanner |
| `Esc` | Close modal/dialog |
| `?` | Show shortcuts |

## Glossary

| Term | Definition |
|------|------------|
| TPI | Threat Prompt Injection (taxonomy) |
| SSE | Server-Sent Events (streaming) |
| DNA | Attack lineage and intelligence |
| SAGE | Self-Adapting Generation Engine |
| CTF | Capture The Flag (game mode) |
| KOTH | King of the Hill (game mode) |
| RvB | Red vs Blue (game mode) |
