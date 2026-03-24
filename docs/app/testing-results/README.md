# Testing Results

This directory is for formal model-assessment sessions and their evidence bundles.

## Do Not Confuse With QA Logs

- app QA logs: `team/testing/QA/QA-Log/`
- QA security artifacts: `team/testing/QA/security/audit-results/`
- formal assessment sessions: `docs/app/testing-results/`

Compatibility link:

- [team/QA-Log/README.md](../../../team/QA-Log/README.md)

## Session Naming

Use:

```text
YYYY-MM-DD-model-name[-variant]
```

## Helpful Commands

```bash
npm run session:create -- -m qwen2.5
npm run session:list
npm run session:show 2026-02-26-qwen2.5
npm run session:update 2026-02-26-qwen2.5
npm run session:close 2026-02-26-qwen2.5
npm run report:generate docs/app/testing-results/2026-02-26-qwen2.5
```
