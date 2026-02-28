# DojoLM Scanner Testing Plan - README

This directory contains the comprehensive testing plan and automation for achieving 100% detection rate and 0% false positive rate across all scanner categories.

## Quick Links

| Document | Purpose |
|----------|---------|
| [scanner-testing-plan.md](scanner-testing-plan.md) | Comprehensive testing strategy (main document) |
| [testing-execution-checklist.md](testing-execution-checklist.md) | Step-by-step execution guide |
| [results/](results/) | Test execution results and trends |

## Test Scripts (in ../QA-tools/)

| Script | Purpose |
|--------|---------|
| test-category-coverage.ts | Per-category detection/FP validation |
| test-pattern-validation.ts | Pattern group coverage validation |
| test-engine-filters.ts | Engine filter correctness |
| test-performance-benchmark.ts | Performance metrics |
| run-all-tests.ts | Full test battery runner |

## Key Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Attack Detection | 100% | To be measured |
| False Positive Rate | 0% | To be measured |
| Categories | 27 | 27 ✅ |
| Pattern Groups | 47 | 47 ✅ |
| Total Fixtures | 999 | 999 ✅ |

## Getting Started

1. **Read the plan**: [scanner-testing-plan.md](scanner-testing-plan.md)
2. **Execute tests**: Follow [testing-execution-checklist.md](testing-execution-checklist.md)
3. **Review results**: Check `results/` directory

## Running Tests

```bash
# Run full test battery
npx tsx team/QA-tools/run-all-tests.ts

# Run individual test
npx tsx team/QA-tools/test-category-coverage.ts

# Run with verbose output
npx tsx team/QA-tools/test-category-coverage.ts --verbose

# Export results as JSON
npx tsx team/QA-tools/test-category-coverage.ts --json > results/latest.json
```

## Test Categories

All 27 fixture categories must be validated:

```
agent, agent-output, audio, bias, boundary, code, cognitive, context,
delivery-vectors, dos, encoded, environmental, images, malformed,
model-theft, multimodal, or, output, search-results, session, social,
supply-chain, untrusted-sources, vec, web
```

## Success Criteria

All must pass:
- ✅ 100% detection on 842 attack fixtures
- ✅ 0% false positive on 157 clean fixtures
- ✅ ≥5 controls per category
- ✅ Performance: P99 < 10ms per fixture
