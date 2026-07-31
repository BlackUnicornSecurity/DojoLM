# Platform Guide

This guide describes the current user-visible surface of the DojoLM web app and the standalone scanner.

## Current Platform Facts

As of the 2026-06-12 documentation refresh (counts verified by `npm run verify:docs`):

- Scanner engine: 544 patterns across 49 groups
- Fixture library: 5,281 fixtures across 40 categories
- Standalone scanner API: `http://localhost:8089`
- Web app: `http://localhost:42001`
- MCP server default: `127.0.0.1:18000`

## Top-Level Navigation

### Dashboard

The landing page for quick actions, health snapshots, widget-based monitoring, and navigation shortcuts.

Guide: [Dashboard](modules/DASHBOARD.md)

### Haiku Scanner

Direct text and extracted-text scanning for prompt-injection and related threats.

Guide: [Haiku Scanner](modules/HAIKU_SCANNER.md)

### Buki (Payload Lab)

The fixture and payload library. Use it to browse corpus data, compare fixtures, preview content, and push payloads into the scanner. The Generator tab hosts SAGE (prompt evolution).

Guide: [Buki (Payload Lab)](modules/ARMORY.md)

### Jutsu (Model Lab)

The main execution surface for model testing. Current tabs are:

- `Models`
- `Tests`
- `Results`
- `Leaderboard`
- `Compare`
- `Custom Models`
- `Jutsu`

> **Note:** The `Leaderboard` tab label is truncated to `Board` in the live UI tab bar.

Guide: [Jutsu (Model Lab)](modules/LLM_DASHBOARD.md)

### Hattori Guard

Guard configuration, audit trails, and protection status for LLM execution flows. Current modes are:

- `Shinobi`: scan inputs, log only
- `Samurai`: scan and block suspicious inputs
- `Sensei`: scan and block suspicious outputs
- `Hattori`: scan and block both directions

Guide: [Hattori Guard](modules/HATTORI_GUARD.md)

### Bushido Book

The compliance center. It combines framework coverage, gaps, audit trails, checklists, and framework-scoped compliance scans.

Guide: [Bushido Book](modules/BUSHIDO_BOOK.md)

### Adversarial Lab

The adversarial attack simulation module for MCP and tool-integrated systems. It includes attack tools, reusable skills, and MCP views. `WebMCP` is preview-only — the UI shows an unavailable notice; the previous mock/simulated flow has been removed.

Guide: [Adversarial Lab](modules/ATEMI_LAB.md)

### Arena

Model-vs-model matchups. Browser + create flow + live match are API-backed. Roster, Leaderboard, and MatchStats views ship with a `Partial` badge in Wave 0 — aggregates complete in Wave 1 (see ADR-0012).

Guide: [Arena](modules/BATTLE_ARENA.md)

### Mitsuke

Threat-feed ingestion, indicator library, and alerts. Live `/api/mitsuke/entries` and `/api/mitsuke/sources` routes exist — Wave 1 wires the UI to them (see ADR-0011).

Guide: [Mitsuke](modules/MITSUKE.md)

### Amaterasu DNA

Attack lineage, mutation tree, and analysis. First-class module (was previously nested inside the retired Kumite hub).

Guide: [Amaterasu DNA](modules/AMATERASU_DNA.md)

### Kagami

Behavioural fingerprinting, mirror testing, and drift detection. First-class module.

Guide: [Kagami](modules/KAGAMI.md)

### Ronin Hub

The bug bounty research and submissions module. `Programs` and `Submissions` are active. `Planning` and `Intelligence` currently render placeholder states.

Guide: [Ronin Hub](modules/RONIN_HUB.md)

### Sengoku

The continuous red teaming module. Current tabs are:

- `Campaigns`
- `Temporal`

Campaign targets can be configured from three sources: an external URL with API Key or Bearer auth, a model from Jutsu (Model Lab) (credentials resolved automatically), or a local Ollama instance with auto-detected models.

Guide: [Sengoku](modules/SENGOKU.md)

### Kotoba

The prompt optimization studio for scoring and hardening system prompts.

Guide: [Kotoba](modules/KOTOBA.md)

### Admin

The operational settings surface. Current tabs are:

- `General`
- `Users`
- `Scoreboard`
- `API Keys`
- `Haiku Scanner & Guard`
- `System Health`
- `Export`
- `Admin Settings`
- `Validation`

Guide: [Admin](modules/ADMIN.md)

## Common Workflows

- Run a first scan: [Common Workflows](COMMON_WORKFLOWS.md#scan-a-prompt)
- Add and test a model: [Common Workflows](COMMON_WORKFLOWS.md#add-and-verify-a-model)
- Run a batch: [Common Workflows](COMMON_WORKFLOWS.md#run-a-batch-of-llm-tests)
- Review compliance posture: [Common Workflows](COMMON_WORKFLOWS.md#review-framework-coverage)
- Launch strategic analysis: [Common Workflows](COMMON_WORKFLOWS.md#review-strategic-signals)
- Start a campaign: [Common Workflows](COMMON_WORKFLOWS.md#launch-a-sengoku-campaign)

## APIs You Will Most Often Use

- Standalone scanner: `GET /api/scan`
- Web scanner: `POST /api/scan`
- Fixture manifest: `GET /api/fixtures`
- Fixture scan: `GET` or `POST /api/scan-fixture`
- Web health: `GET /api/health`
- Models: `GET`, `POST`, `PATCH`, `DELETE /api/llm/models`
- Single execution: `POST /api/llm/execute`
- Batch execution: `GET` and `POST /api/llm/batch`

See [User API Reference](API_REFERENCE.md) for examples.

## Naming Clarifications

- `Jutsu` is both the module name (Model Lab) AND an inner benchmark tab inside it.
- `Buki` is the Payload Lab — what was previously called "Armory".
- `Adversarial Lab` is what was previously called "Atemi Lab".
- `Amaterasu DNA`, `Mitsuke`, `Kagami`, and `Arena` are first-class modules; they used to live inside the now-retired "The Kumite" hub.
- SAGE lives inside Buki's Generator tab; Shingan lives inside Haiku Scanner's Deep Scan.
- Legacy `Time Chamber` references now point to `Sengoku`, especially `Temporal`.
- Historical internal planning labels are not the live user navigation model.
