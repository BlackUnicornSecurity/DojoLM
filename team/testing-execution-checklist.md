# Scanner Testing Execution Checklist

**Purpose:** Guide for executing the DojoLM Scanner test battery to achieve 100% detection rate and 0% false positive rate.

---

## Quick Start

### Run All Tests
```bash
npx tsx team/QA-tools/run-all-tests.ts
```

### Run Individual Test Suites

| Test | Command | Purpose |
|------|---------|---------|
| Category Coverage | `npx tsx team/QA-tools/test-category-coverage.ts` | Per-category pass/fail rates |
| Pattern Validation | `npx tsx team/QA-tools/test-pattern-validation.ts` | Pattern group coverage |
| Engine Filters | `npx tsx team/QA-tools/test-engine-filters.ts` | Engine filter validation |
| Performance Benchmark | `npx tsx team/QA-tools/test-performance-benchmark.ts` | Performance metrics |
| False Positive Check | `npx tsx tools/test-fp-check.ts` | Clean fixture validation |
| Regression Test | `npx tsx tools/test-regression.ts` | Full fixture validation |

---

## Pre-Test Checklist

Before running tests, verify:

- [ ] Clean working directory (no uncommitted changes that could interfere)
- [ ] All fixtures are present in `packages/bu-tpi/fixtures/`
- [ ] Scanner package is built (`npm run build` in `packages/dojolm-scanner/`)
- [ ] `manifest.json` is up to date with all fixtures
- [ ] TypeScript compilation passes (`tsc --noEmit`)

---

## Test Execution Phases

### Phase 1: Baseline Assessment

**Objective:** Establish current performance baseline.

```bash
# Run full test battery
npx tsx team/QA-tools/run-all-tests.ts --verbose

# Save baseline results
npx tsx team/QA-tools/test-category-coverage.ts --json > team/testing-plan/results/baseline-$(date +%Y%m%d).json
```

**Success Criteria:**
- Document all failures
- Identify categories with < 100% detection
- Identify false positives

### Phase 2: Pattern Validation

**Objective:** Ensure each pattern group has adequate fixture coverage.

```bash
# Test all pattern groups
npx tsx team/QA-tools/test-pattern-validation.ts --verbose

# Test specific pattern group
npx tsx team/QA-tools/test-pattern-validation.ts --pattern=PI_PATTERNS
```

**Success Criteria:**
- Each pattern group triggers on ≥5 fixtures
- No pattern group has 0 coverage

### Phase 3: Category-Level Validation

**Objective:** Validate detection accuracy per category.

```bash
# Test all categories
npx tsx team/QA-tools/test-category-coverage.ts --verbose

# Test specific category
npx tsx team/QA-tools/test-category-coverage.ts --category=dos --verbose
```

**Success Criteria:**
- 100% detection rate for attack fixtures
- 0% false positive rate for clean fixtures

### Phase 4: Engine Filter Validation

**Objective:** Verify engine-specific filtering works correctly.

```bash
# Test all engines
npx tsx team/QA-tools/test-engine-filters.ts --verbose

# Test specific engine
npx tsx team/QA-tools/test-engine-filters.ts --engine=denial-of-service
```

**Success Criteria:**
- Each engine detects only its designated patterns
- No pattern leakage between engines

### Phase 5: Performance Validation

**Objective:** Ensure scanner meets performance targets.

```bash
# Full performance benchmark
npx tsx team/QA-tools/test-performance-benchmark.ts

# Quick benchmark (100 fixtures)
npx tsx team/QA-tools/test-performance-benchmark.ts --quick
```

**Success Criteria:**
- P99 latency < 10ms per fixture
- Full suite < 10s
- Memory < 5MB per scan

---

## Interpreting Results

### Output Legend

| Symbol | Meaning |
|--------|---------|
| ✓ | Test passed (all criteria met) |
| ⚠ | Test passed with warnings (e.g., missing detections but no FPs) |
| ✗ | Test failed |

### Result Metrics

```
Category Coverage Output:
  agent               PASS  72/72   2.34ms  6 patterns
  ↑                   ↑     ↑      ↑       ↑
  Category name    Status  Pass/Total  Perf  Patterns triggered
```

### Common Failure Types

| Failure Type | Meaning | Action |
|--------------|---------|--------|
| FP (False Positive) | Clean fixture triggered BLOCK | Refine pattern |
| MISS | Attack fixture triggered ALLOW | Add/fix pattern |
| TIMEOUT | Test exceeded time limit | Investigate performance |

---

## Remediation Workflow

When a test fails:

1. **Identify the failure type** (FP, MISS, or performance)
2. **Locate the specific fixture** causing failure
3. **Analyze the root cause**:
   - Overly broad regex?
   - Missing pattern variant?
   - Performance bottleneck?
4. **Implement fix**:
   - For FP: Tighten pattern or add whitelist
   - For MISS: Add new pattern or expand existing
   - For performance: Optimize pattern or add caching
5. **Re-run affected tests**
6. **Run regression suite** to prevent new issues

---

## Success Gate

All must pass for testing completion:

| Criterion | Target | Command |
|-----------|--------|---------|
| Attack Detection | 100% (842/842) | `npx tsx tools/test-regression.ts` |
| False Positive Rate | 0% (0/157) | `npx tsx tools/test-fp-check.ts` |
| Category Coverage | 100% (27/27) | `npx tsx team/QA-tools/test-category-coverage.ts` |
| Pattern Coverage | ≥5 per group | `npx tsx team/QA-tools/test-pattern-validation.ts` |
| Performance | P99 < 10ms | `npx tsx team/QA-tools/test-performance-benchmark.ts` |

---

## Continuous Testing

### Pre-Commit Check
```bash
# Quick validation before committing
npx tsx team/QA-tools/test-category-coverage.ts && \
npx tsx team/QA-tools/test-fp-check.ts && \
tsc --noEmit
```

### CI/CD Integration
```bash
# Full test battery (for CI)
npx tsx team/QA-tools/run-all-tests.ts
```

---

## Test File Reference

| File | Purpose |
|------|---------|
| [scanner-testing-plan.md](scanner-testing-plan.md) | Comprehensive testing strategy |
| test-category-coverage.ts | Per-category validation |
| test-pattern-validation.ts | Pattern group coverage |
| test-engine-filters.ts | Engine filter validation |
| test-performance-benchmark.ts | Performance metrics |
| run-all-tests.ts | Full test battery runner |
| test-regression.ts | Full fixture regression |
| test-fp-check.ts | False positive detection |

---

## Appendix: Quick Reference

### Category Names
```
agent, agent-output, audio, bias, boundary, code, cognitive, context,
delivery-vectors, dos, encoded, environmental, images, malformed,
model-theft, multimodal, or, output, search-results, session, social,
supply-chain, untrusted-sources, vec, web
```

### Engine Names
```
prompt-injection, jailbreak, tpi, denial-of-service, supply-chain,
agent-security, model-theft, output-handling, vector-embeddings,
overreliance, bias-fairness, multimodal, environmental
```

### Pattern Groups
```
PI_PATTERNS, JB_PATTERNS, DOS_PATTERNS, SUPPLY_CHAIN_PATTERNS,
MODEL_THEFT_PATTERNS, OUTPUT_HANDLING_PATTERNS, AGENT_SECURITY_PATTERNS,
VEC_PATTERNS, OR_PATTERNS, BF_PATTERNS, MM_PATTERNS, ENV_PATTERNS,
plus 35+ TPI-specific pattern groups
```
