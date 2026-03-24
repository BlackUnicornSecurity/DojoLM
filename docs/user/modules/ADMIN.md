# Admin

Admin is the operational settings surface for the web app. Use it for provider setup, user and scanner configuration, validation evidence, export defaults, and platform diagnostics.

## Current Tabs

- `General`
- `Users`
- `Scoreboard`
- `API Keys`
- `Haiku Scanner & Guard`
- `System Health`
- `Export`
- `Admin Settings`
- `Validation`

## Best Starting Points

- Open `API Keys` when you need to add or fix model-provider connectivity.
- Open `Validation` when you need evidence-backed verification, report review, or calibration status.
- Open `System Health` when the platform looks degraded or an integration is failing.
- Open `Haiku Scanner & Guard` when you want to change active scanner engines or guard behavior.

## What To Use Each Tab For

### General

Use for a quick summary of the app state and documentation links.

Important note:

- Parts of the `General` tab still display historical labels such as `NODA`, `HAKONE`, or older module naming.
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

### Haiku Scanner & Guard

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

### Admin Settings

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

## Common Admin Workflows

### Add Or Update A Model

1. Open `API Keys`.
2. Create or update the provider-backed entry.
3. Add the credential and base URL if the provider needs one.
4. Run the built-in connection test.
5. Move to [LLM Dashboard](LLM_DASHBOARD.md) to enable the model and run tests.

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
- [LLM Dashboard](LLM_DASHBOARD.md)
- [Common Workflows](../COMMON_WORKFLOWS.md)
- [Troubleshooting](../TROUBLESHOOTING.md)
