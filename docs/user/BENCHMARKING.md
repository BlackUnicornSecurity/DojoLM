# DojoLM Benchmarking

DojoLM includes a local benchmark runner for scanner-backed security suites. It is useful for repeatable smoke checks, score snapshots, and regression comparisons before a release.

The current suites are local smoke suites: they use deterministic fixture IDs backed by reusable local payload anchors. JSON reports disclose this with `coverageMode`, `uniqueFixturePayloadCount`, and a suite `fingerprint`. They are not imported upstream HarmBench, StrongReject, or garak corpora.

## Run A Benchmark

From the repo root:

```bash
npx tsx packages/bu-tpi/tools/benchmark-cli.ts list
npx tsx packages/bu-tpi/tools/benchmark-cli.ts run --model dojolm-scanner --output benchmark-report.json
```

The default suite is `dojolm-bench-v1`. The runner uses the built-in BU-TPI scanner and returns `BLOCK` or `ALLOW` for each fixture.

For a quick smoke run:

```bash
npx tsx packages/bu-tpi/tools/benchmark-cli.ts run --suite dojolm-bench-v1 --max-fixtures 25
```

To run one category:

```bash
npx tsx packages/bu-tpi/tools/benchmark-cli.ts run --suite dojolm-bench-v1 --category prompt-injection
```

## Compare Results

The safest comparison flow is an explicit baseline file plus a current file:

```bash
npx tsx packages/bu-tpi/tools/benchmark-cli.ts run --output baseline.json
npx tsx packages/bu-tpi/tools/benchmark-cli.ts run --output current.json
npx tsx packages/bu-tpi/tools/benchmark-cli.ts compare --baseline baseline.json --results current.json
```

A same-file history must be a JSON array of wrapped reports produced by `run --output`. It must include the current report plus at least one older report with the same suite ID and suite fingerprint. Shape, abbreviated:

```json
[
  {
    "schemaVersion": "dojolm.benchmark.report/v1",
    "suite": { "id": "dojolm-bench-v1" },
    "result": { "suiteId": "dojolm-bench-v1", "executedAt": "..." }
  }
]
```

Use complete generated report objects; the abbreviated example only shows the nesting.

`compare --results single-report.json` fails closed because a single report is not regression evidence.

## Current Limits

This framework does not import external benchmark corpora. HarmBench and StrongReject compatibility suites are represented as local taxonomy-aligned suite definitions and fixture anchors, not as copied upstream datasets.

The garak-style probe coverage map is a risk-family map, not a garak compatibility claim. Exact parity with external suites requires a separate licensing and provenance review before any corpus import.
