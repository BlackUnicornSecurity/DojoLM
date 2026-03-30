# LLM Dashboard

LLM Dashboard is the main model testing surface in the web app.

## Current Tabs

- `Models`
- `Tests`
- `Results`
- `Leaderboard`
- `Compare`
- `Custom Models`
- `Jutsu`

## Models

Use `Models` to:

- review configured models
- confirm a model is enabled
- inspect saved provider settings
- verify that your Admin setup is visible to the testing layer

Model detail includes nested tabs for `overview`, `history`, `Reports`, `training`, and `metrics`.

Provider setup starts in [Admin](ADMIN.md) and is documented in the [LLM Provider Guide](../LLM-PROVIDER-GUIDE.md).

## Tests

Use `Tests` to:

- select one or more test cases
- choose one or more enabled models
- run a single execution
- launch a batch

Guarded execution is affected by [Hattori Guard](HATTORI_GUARD.md) when guard is enabled.

## Results

Use `Results` to review:

- execution outcomes
- resilience scores
- grouped findings
- generated reports and exports

## Leaderboard

Use `Leaderboard` for comparative ranking and broader model performance summaries.

> **UI Note:** The tab appears as "Board" in the live UI due to space constraints.

## Compare

Use `Compare` when you want to inspect differences between models or result sets.

## Custom Models

Use `Custom Models` when you need to define nonstandard or OpenAI-compatible endpoints that are not covered by the default provider flow.

## Jutsu

`Jutsu` is part of LLM Dashboard. It is not a separate top-level navigation item.

Use it for deeper benchmarking and testing-oriented analysis once you already have models and results in place.

## Header Actions

The current dashboard header includes:

- report generation
- a guard status badge

These help you confirm whether results are being produced with guard coverage and whether they are ready for export.

## Related Docs

- [LLM Provider Guide](../LLM-PROVIDER-GUIDE.md)
- [Hattori Guard](HATTORI_GUARD.md)
- [User API Reference](../API_REFERENCE.md)
