# Admin

Admin is the operational settings surface for the web app. Use it for provider setup, user and scanner configuration, validation evidence, export defaults, and platform diagnostics.

## Current Tabs

- `General`
- `Users`
- `Scoreboard`
- `API Keys`
- `Scanner & Guard`
- `System Health`
- `Export`
- `Providers`
- `Plugins`
- `Feature Flags`
- `Settings`
- `Validation`
- `Test Runner`

## Best Starting Points

- Open `API Keys` when you need to add or fix model-provider connectivity.
- Open `Validation` when you need evidence-backed verification, report review, or calibration status.
- Open `System Health` when the platform looks degraded or an integration is failing.
- Open `Scanner & Guard` when you want to change active scanner engines or guard behavior.
- Open `Feature Flags` to confirm which gated Wave 3/4 capabilities are currently on for this deploy.

## What To Use Each Tab For

### General

Use for a quick summary of the app state and documentation links.

Important note:

- Parts of the `General` tab still display historical labels or older module naming.
- Treat the current docs and live navigation as the source of truth instead of the historical wording in that summary block.

### Users

Use for user-management tasks and admin-facing account operations.

### Scoreboard

Use for model-ranking and resilience summaries pulled from completed LLM tests. This tab is the fastest way to see tested-model count, total executions, average resilience, top provider, and current leaderboard order.

### API Keys

Use for:

- provider-backed model entries
- credentials
- base URLs
- model connection setup
- connection testing
- removing stale or broken configurations

### Scanner & Guard

Use for scanner and guard-related operational settings. The current tab lets you:

- toggle scanner engines on or off
- reset engine filters
- enable or disable Hattori Guard
- choose guard mode: `Shinobi`, `Samurai`, `Sensei`, or `Hattori`
- set the block threshold to `WARNING+` or `CRITICAL only`

### System Health

Use to inspect health and platform-readiness signals.

### Export

Use for export-related defaults such as preferred formats, branding, and retention settings. This tab manages preferences, while finished validation runs are exported from the `Validation` report workspace.

### Providers

Use for LLM provider endpoint configuration — provider-scoped metadata separate from the per-model entries in `API Keys`.

### Plugins

Use for browsing installed platform plugins and their enabled state.

### Audit query (operator endpoint)

Wave 6 (ADR-0052) ships `GET /api/admin/audit` as an admin-gated query over the file-backed audit log. Query params:

- `event` — exact event name (e.g. `LLM_BUDGET_EXCEEDED`, `IDOR_PROBE`, `RETENTION_RUN`).
- `user` — exact match on `details.user`.
- `level` — `info`, `warn`, or `error`.
- `since` / `until` — ISO 8601; default window is the last 7 days, capped at 30.
- `limit` / `offset` — default `limit=50`, max `500`.

Incident response no longer requires SSH + grep; e.g. `GET /api/admin/audit?event=LLM_BUDGET_EXCEEDED&since=2026-04-19T00:00:00Z` returns the relevant rows with pagination metadata. No dedicated UI tab yet — Wave 10 may add one once operators tell us what queries they reach for.

### Feature Flags

Use for a diagnostic view of the gated-capability registry (ADR-0034 Wave 4). Each row shows the flag id, description, and current enabled state. Wave 4 shipped three entries:

- `kotoba.llm` — Kotoba LLM second-opinion insights.
- `sengoku.llm` — Sengoku Temporal LLM executor.
- `ronin.intel-ingest` — Ronin intel ingest poller.

The view is admin-gated. Flag state is controlled by env vars at deploy time (default read path) with an optional runtime override layer (ADR-0041 Wave 4). Every runtime toggle lands a `FEATURE_FLAG_TOGGLE` audit entry.

### Settings

Use for administrative controls not tied to a single functional module.

### Validation

Use for validation runs, module verification, calibration, and evidence review.

The current validation workflow has four main areas:

- `Run Validation`: choose a targeted module scope or leave everything unchecked to run the full validation catalog, then optionally enable `Include Holdout Set`.
- `Live Progress`: monitor the active module, processed samples, non-conformities, elapsed time, and ETA.
- `Run History` and `Results`: reopen previous runs, inspect per-module verdicts, review confusion matrices and metrics, filter the non-conformity register, inspect the traceability chain, and export the report as `JSON`, `CSV`, or `Markdown`.
- `Calibration Status`: review each module's tier, last calibration date, and current validity status, then use `Recalibrate All` when baselines need to be refreshed.

The current validation catalog includes:

- `Prompt Injection`
- `Jailbreak Resistance`
- `Data Exfiltration`
- `Bias Detection`
- `Toxicity`
- `Hallucination`
- `PII Leakage`
- `Compliance`

### Test Runner

Use for ad-hoc CI/CD test executions and run history.

## Common Admin Workflows

### Add Or Update A Model

1. Open `API Keys`.
2. Create or update the provider-backed entry.
3. Add the credential and base URL if the provider needs one.
4. Run the built-in connection test.
5. Move to [Jutsu (Model Lab)](LLM_DASHBOARD.md) to enable the model and run tests.

### Review Validation Evidence

1. Open `Validation`.
2. Leave all modules unchecked for a full validation pass, or select one or more modules for a targeted run.
3. Enable `Include Holdout Set` only when you want to evaluate against the reserved holdout slice.
4. Start `Run Full Validation`.
5. Wait for the run to complete, then open it from `Run History`.
6. Review `Module Results`, the `Non-Conformity Register`, and the `Traceability Chain`.
7. Export the report in the format you need.

## Related Docs

- [LLM Provider Guide](../LLM-PROVIDER-GUIDE.md)
- [Environment Variable Reference](../../operator/CONFIGURATION.md)
- [Jutsu (Model Lab)](LLM_DASHBOARD.md)
- [Common Workflows](../COMMON_WORKFLOWS.md)
- [Troubleshooting](../TROUBLESHOOTING.md)
