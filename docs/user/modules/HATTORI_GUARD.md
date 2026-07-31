# Hattori Guard

Hattori Guard is the configurable input/output guard for LLM test execution.

## Main Areas

- metrics row
- guard enable or disable control
- block-threshold selector
- mode cards
- audit log

## Tabs

The Guard dashboard hosts three tabs:

- `Overview` — mode selector + audit log (the default, always live).
- `Hardening` — system prompt hardening rubric + rewrites.
- `Defense Templates` — forge-defense policy templates.

### Status (Wave 6, 2026-04-20)

The `Hardening` rubric engine and `Defense Templates` policy store are live (ADR-0018 Wave 2). Applied templates are scoped per user (ADR-0021 Wave 3). Cross-user DELETE attempts on the `Defense Templates` store are audited as `IDOR_PROBE` events (ADR-0049 Wave 6) with privacy-safe metadata — the victim's identity is never written to the audit row. See the `Defense Templates` tab for the catalog; see `Admin → Feature Flags` for the current gating state.

## Guard Modes

### Shinobi

- scans inputs
- logs events
- blocks nothing

### Samurai

- scans inputs
- can block suspicious input before it reaches the model

### Sensei

- scans outputs
- can block suspicious model output

### Hattori

- scans both directions
- can block both inputs and outputs

## Block Thresholds

When guard is enabled you can currently block on:

- `WARNING+`
- `CRITICAL only`

## Metrics

The dashboard surfaces:

- total events
- blocked count
- block rate
- active mode

## Audit Log

Use the audit log when you need to:

- confirm that a block happened
- inspect allow or block actions
- understand whether the event came from input or output scanning

## Best Use Cases

- protecting LLM test execution during benchmarking
- validating whether a model is safe with or without guard support
- reviewing blocked behavior after a batch or manual run

## Related Docs

- [Jutsu (Model Lab)](LLM_DASHBOARD.md)
- [User API Reference](../API_REFERENCE.md)
- [Common Workflows](../COMMON_WORKFLOWS.md)
