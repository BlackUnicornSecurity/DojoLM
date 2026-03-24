# Platform Guide

This guide describes the current user-visible surface of the DojoLM web app and the standalone scanner.

## Current Platform Facts

As of the 2026-03-24 documentation audit:

- Scanner engine: 510 patterns across 49 groups
- Fixture library: 2,960 fixtures across 37 categories
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

### Armory

The fixture and payload library. Use it to browse corpus data, compare fixtures, preview content, and push payloads into the scanner.

Guide: [Armory](modules/ARMORY.md)

### LLM Dashboard

The main execution surface for model testing. Current tabs are:

- `Models`
- `Tests`
- `Results`
- `Leaderboard`
- `Compare`
- `Custom Models`
- `Jutsu`

Guide: [LLM Dashboard](modules/LLM_DASHBOARD.md)

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

### Atemi Lab

The adversarial attack simulation module for MCP and tool-integrated systems. It includes attack tools, reusable skills, MCP views, and WebMCP testing.

Guide: [Atemi Lab](modules/ATEMI_LAB.md)

### The Kumite

The strategic analysis hub. It currently contains:

- `SAGE`
- `Battle Arena`
- `Mitsuke`
- `Amaterasu DNA`
- `Kagami`
- `Shingan`

Guide: [The Kumite](modules/THE_KUMITE.md)

### Ronin Hub

The bug bounty research and submissions module. `Programs` and `Submissions` are active. `Planning` and `Intelligence` currently render placeholder states.

Guide: [Ronin Hub](modules/RONIN_HUB.md)

### Sengoku

The continuous red teaming module. Current tabs are:

- `Campaigns`
- `Temporal`

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

- `LLM Jutsu` is a tab inside `LLM Dashboard`, not a top-level module.
- `Amaterasu DNA` is part of `The Kumite`, not its own primary navigation item.
- Legacy `Time Chamber` references now point to `Sengoku`, especially `Temporal`.
- Historical planning labels such as `NODA`, `KASHIWA`, and `HAKONE` are not the live user navigation model.
