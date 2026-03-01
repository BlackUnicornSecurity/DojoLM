# QA Bug Fixes Implementation Plan

**Date:** 2026-03-01
**Source:** [team/QA-Log/dev-handoff-20260301.md](./QA-Log/dev-handoff-20260301.md)
**Status:** Ready for Implementation

---

## Executive Summary

This plan addresses all open bugs from the QA handoff document. The QA team completed 6 phases of testing with a **95.2% combined pass rate** (68/73 tests + 5/5 E2E workflows).

**Open Issues:** 7 bugs across 7 files
- 2 HIGH severity (ReDoS patterns, missing Appendix B)
- 1 MEDIUM severity (CSP headers)
- 4 LOW severity (QA tooling, documentation)

---

## Priority 1: HIGH Severity Fixes

### PERF-004: Fix ReDoS-Vulnerable Patterns

**Severity:** HIGH
**File:** `packages/bu-tpi/src/scanner.ts`
**Issue:** 6 patterns with catastrophic backtracking risk that could cause DoS attacks.

| Pattern | Line | Fix |
|---------|------|-----|
| `fake_conversation` | 97 | Replace `(?:.*\n){0,2}` with `(?:[^\n]*\n){0,2}` |
| `delimiter_injection` | 120 | Replace alternation groups with character class `[-=#*]{3,}` |
| `settings_path_write` | 221 | Replace `.{0,40}?` with `[^\n]{0,40}?` |
| `html_hidden_css_injection` | 1559 | Limit `[\s\S]{0,300}?` to `[\s\S]{0,200}?` |
| `few_shot_explicit_override` | 3255 | Replace `.*?` with `[\s\S]{0,100}?` |
| `few_shot_example_count` | 3301 | Replace `.{50,}` with `[\s\S]{50,200}` |

**Verification:**
```bash
cd packages/bu-tpi
npm run test:regression  # Expect >= 99.85% pass rate
npx tsx tools/test-perf-regex.ts  # Verify no ReDoS warnings
```

---

### GAP-001: Create Missing Appendix B

**Severity:** HIGH
**File:** `docs/app/testing-checklist.md`
**Issue:** Line 1483 references "Appendix B" which doesn't exist.

**Fix:** Append at end of file:

```markdown
## Appendix B: New Controls & Test Case Tracking

This appendix tracks new security controls and test cases recommended from findings
but not yet incorporated into the main checklist.

### Format

Each entry follows this format:
- **REC-ID:** Recommendation identifier
- **Category:** Security category (e.g., Prompt Injection, Jailbreak)
- **Source:** Finding source (e.g., QA-2025-001, external research)
- **Status:** pending | in-progress | implemented | deferred
- **Description:** What the control/test should detect
- **Suggested Test Cases:** Initial test payload ideas

### Active Recommendations

*No recommendations currently tracked*

### Change Log

| Date | REC-ID | Action | Notes |
|------|--------|--------|-------|
| 2026-03-01 | - | Appendix B created | Initial structure for tracking new controls |
```

---

## Priority 2: MEDIUM Severity Fixes

### BUG-002: Add CSP Headers

**Severity:** MEDIUM
**File:** `packages/dojolm-web/next.config.ts`
**Issue:** No Content-Security-Policy headers; browser shows "type checking is enabled" error.

**Fix:** Add CSP header to the `headers()` function (after line 67):

```typescript
{
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' http://localhost:* https:",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")
},
```

**Verification:**
```bash
cd packages/dojolm-web
npm run build && npm start
# Check browser console - no script type errors
# Verify CSP header in DevTools Network tab
```

---

## Priority 3: LOW Severity Fixes (QA Tooling)

### BUG-005: Add Input Validation to setup-evidence-dir.sh

**Severity:** LOW
**File:** `team/QA-tools/setup-evidence-dir.sh`
**Issue:** Lines 44, 100-102 accept user input without validation.

**Fix:** Add after line 95:

```bash
# Validate input contains only safe characters
validate_input() {
  local input="$1"
  local name="$2"

  # Allow alphanumeric, hyphens, underscores, dots
  if [[ ! "$input" =~ ^[a-zA-Z0-9._-]+$ ]]; then
    echo -e "${RED}Error: $name contains invalid characters${NC}"
    echo "Allowed: letters, numbers, hyphens, underscores, dots"
    exit 1
  fi

  # Prevent path traversal
  if [[ "$input" =~ \.\. ]]; then
    echo -e "${RED}Error: $name cannot contain '..' (path traversal)${NC}"
    exit 1
  fi
}

# Validate model ID
validate_input "$MODEL_ID" "Model ID"

# Validate model variant if provided
if [ -n "$MODEL_VARIANT" ]; then
  validate_input "$MODEL_VARIANT" "Model variant"
fi
```

---

### BUG-006: Add Error Handling to generate-report.ts

**Severity:** LOW
**File:** `team/QA-tools/generate-report.ts`
**Issue:** Lines 126-127 lack try-catch for JSON.parse; line 534 doesn't ensure reports/ directory exists.

**Fix 1 (lines 126-127):**
```typescript
const content = readFileSync(sessionPath, 'utf-8');
try {
  return JSON.parse(content);
} catch (error) {
  console.error(`Error: Invalid JSON in ${sessionPath}`);
  if (error instanceof SyntaxError) {
    console.error(`Parse error: ${error.message}`);
  }
  process.exit(1);
}
```

**Fix 2 (after line 534):**
```typescript
const reportsDir = join(resolvedDir, 'reports');
if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir, { recursive: true });
}
```

**Add import at top (line ~12):**
```typescript
import { mkdirSync } from 'fs';
```

---

### BUG-007: Add Path Validation to session-manager.ts

**Severity:** LOW
**File:** `team/QA-tools/session-manager.ts`
**Issue:** Lines 117-118 lack path traversal checks; line 426 has unsafe deletion.

**Fix 1:** Add validation function before line 114:

```typescript
/**
 * Validate session ID format
 */
function validateSessionId(sessionId: string): void {
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(sessionId)) {
    throw new Error(`Invalid session ID: "${sessionId}"`);
  }
  if (sessionId.includes('..')) {
    throw new Error(`Path traversal detected in session ID: "${sessionId}"`);
  }
}
```

**Fix 2:** Update `resolveSession()` at line 115:

```typescript
function resolveSession(sessionIdOrPath: string): string {
  // If it's a full path, validate it's within project root
  if (sessionIdOrPath.includes('/') && existsSync(sessionIdOrPath)) {
    const resolved = resolve(sessionIdOrPath);
    const root = resolve(process.cwd());

    if (!resolved.startsWith(root)) {
      throw new Error('Access denied: path outside project directory');
    }
    return sessionIdOrPath;
  }

  // Validate partial session ID
  validateSessionId(sessionIdOrPath);

  // ... rest of function unchanged
```

**Fix 3:** Add import at top (line 12):
```typescript
import { resolve } from 'path';
```

**Fix 4:** Add bounds check before line 426:

```typescript
const resolvedSessionDir = resolve(sessionDir);
const rootDir = resolve(process.cwd());

if (!resolvedSessionDir.startsWith(rootDir)) {
  throw new Error('Safety check: cannot delete directories outside project root');
}

rmSync(sessionDir, { recursive: true, force: true });
```

---

### DOC-001: Update Engine Filter Count

**Severity:** LOW
**File:** `team/QA/qa-test-stories.md`
**Issue:** Lines 471, 482 reference 5 filters; actual count is 13.

**Fix 1 (line 471):**
```markdown
- [ ] All 13 filters visible: Prompt Injection, Jailbreak, TPI, Denial of Service,
Supply Chain, Agent Security, Model Theft, Output Handling, Vector & Embeddings,
Overreliance, Bias & Fairness, Multimodal Security, Environmental Impact
```

**Fix 2 (line 482):**
```markdown
3. **Expected:** 13 filters visible
```

---

## Implementation Order

### Phase 1: Security Critical
1. PERF-004: Fix ReDoS patterns in scanner.ts
2. GAP-001: Create Appendix B

### Phase 2: Production Code
3. BUG-002: Add CSP headers to Next.js config

### Phase 3: QA Tooling
4. BUG-005: Input validation in setup-evidence-dir.sh
5. BUG-006: Error handling in generate-report.ts
6. BUG-007: Path validation in session-manager.ts

### Phase 4: Documentation
7. DOC-001: Update engine filter count

---

## Testing Strategy

| Bug | Test Command | Expected Result |
|-----|--------------|-----------------|
| PERF-004 | `npm run test:regression` | >= 99.85% pass rate |
| PERF-004 | `npx tsx tools/test-perf-regex.ts` | No ReDoS warnings |
| BUG-002 | Check browser console | No script type errors |
| BUG-005 | `./setup-evidence-dir.sh -m '../../../etc'` | Error exit |
| BUG-006 | Run with bad JSON session | Graceful error |
| BUG-007 | `npx tsx session-manager.ts delete '../../../tmp'` | Error exit |

---

## Commit Strategy

Each fix should be committed separately to allow easy rollback:

1. `fix(scanner): optimize ReDoS-vulnerable patterns (PERF-004)`
2. `feat(docs): add Appendix B to testing checklist (GAP-001)`
3. `fix(nextjs): add CSP headers to config (BUG-002)`
4. `fix(qa-tools): add input validation to setup script (BUG-005)`
5. `fix(qa-tools): add error handling to report generator (BUG-006)`
6. `fix(qa-tools): add path validation to session manager (BUG-007)`
7. `docs(qa): update engine filter count to 13 (DOC-001)`

---

## Critical Files Summary

| File | Change | Priority |
|------|--------|----------|
| `packages/bu-tpi/src/scanner.ts` | Optimize 6 ReDoS patterns | HIGH |
| `docs/app/testing-checklist.md` | Add Appendix B | HIGH |
| `packages/dojolm-web/next.config.ts` | Add CSP header | MEDIUM |
| `team/QA-tools/setup-evidence-dir.sh` | Add validate_input() | LOW |
| `team/QA-tools/generate-report.ts` | Add try-catch, mkdirSync | LOW |
| `team/QA-tools/session-manager.ts` | Add validateSessionId(), path checks | LOW |
| `team/QA/qa-test-stories.md` | Update filter count | LOW |

---

## References

- QA Handoff: [team/QA-Log/dev-handoff-20260301.md](./QA-Log/dev-handoff-20260301.md)
- Performance Baseline: [team/QA-Log/perf-latest.json](./QA-Log/perf-latest.json)
- Lessons Learned: [team/lessonslearned.md](./lessonslearned.md)
