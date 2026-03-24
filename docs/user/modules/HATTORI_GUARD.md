# Hattori Guard

Hattori Guard is the configurable input/output guard for LLM test execution.

## Main Areas

- metrics row
- guard enable or disable control
- block-threshold selector
- mode cards
- audit log

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

- [LLM Dashboard](LLM_DASHBOARD.md)
- [User API Reference](../API_REFERENCE.md)
- [Common Workflows](../COMMON_WORKFLOWS.md)
