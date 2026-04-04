# bu-tpi

`bu-tpi` is the canonical scanner engine and the source of truth for scanner types, fixtures, LLM types, and the standalone HTTP API.

## Current Metrics

- `512` patterns
- `49` pattern groups
- `2,960` fixtures
- `37` fixture categories

## Start

```bash
npm start --workspace=packages/bu-tpi
```

Default server: `http://localhost:8089`

## Important Source Areas

```text
src/
├── scanner.ts            Core scan logic
├── serve.ts              Hardened standalone HTTP API
├── types.ts              Canonical scanner types
├── modules/              Specialized detector modules
├── llm/                  Canonical LLM types and presets
├── attackdna/            Attack DNA exports
├── compliance/           Compliance exports
├── sengoku/              Sengoku exports
├── timechamber/          Time chamber exports
├── kotoba/               Kotoba exports
├── benchmark/            Benchmark exports
├── edgefuzz/             Edge fuzz exports
├── defense/              Defense exports
├── supplychain/          Supply-chain exports
├── transfer/             Transfer exports
├── xray/                 X-ray exports
├── fingerprint/          Fingerprint exports
├── shingan/              Shingan exports
└── validation/           Validation exports
```

## Standalone API

All standalone routes are GET-only:

- `/api/fixtures`
- `/api/read-fixture?path=...`
- `/api/scan?text=...`
- `/api/scan-fixture?path=...`
- `/api/stats`
- `/api/run-tests`

Security characteristics:

- `120` requests per `60` seconds per IP
- `100KB` max text input for `/api/scan`
- `50MB` max binary fixture scan size
- path traversal protection
- strict CSP on fixture content

## Package Exports

`package.json` exposes:

- `bu-tpi`
- `bu-tpi/types`
- `bu-tpi/scanner`
- `bu-tpi/llm`
- `bu-tpi/llm/types`
- `bu-tpi/llm/errors`
- `bu-tpi/llm/test-helpers`
- `bu-tpi/scanner-binary`
- `bu-tpi/attackdna`
- `bu-tpi/compliance`
- `bu-tpi/sengoku`
- `bu-tpi/timechamber`
- `bu-tpi/kotoba`
- `bu-tpi/benchmark`
- `bu-tpi/edgefuzz`
- `bu-tpi/defense`
- `bu-tpi/supplychain`
- `bu-tpi/transfer`
- `bu-tpi/xray`
- `bu-tpi/fingerprint`
- `bu-tpi/shingan`
- `bu-tpi/validation`

## Useful Commands

```bash
npm run generate --workspace=packages/bu-tpi
npm test --workspace=packages/bu-tpi
npm run test:coverage --workspace=packages/bu-tpi
npm run perf:all --workspace=packages/bu-tpi
```
