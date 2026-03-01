# QA Bug Fixes Epic

**Epic ID**: TPI-QA-001
**Status**: Ready for Implementation
**Created**: 2026-03-01
**Priority**: HIGH (7 bugs: 2 HIGH, 1 MEDIUM, 4 LOW)
**Sprint**: Scanner Coverage Sprint (Phase 2)

---

## Overview

Following the QA team's 6-phase testing with **95.2% combined pass rate** (68/73 tests + 5/5 E2E workflows), 7 bugs were identified across 7 files requiring fixes.

**Bugs by Severity:**
- **2 HIGH**: ReDoS-vulnerable patterns, missing Appendix B documentation
- **1 MEDIUM**: Missing CSP headers
- **4 LOW**: QA tooling security hardening, documentation updates

**Source**: [team/QA-Log/dev-handoff-20260301.md](./QA-Log/dev-handoff-20260301.md)

---

## User Stories

### Story 1: Fix ReDoS-Vulnerable Patterns (Priority: HIGH)

**ID**: TPI-QA-001-01
**Severity**: HIGH
**Bug ID**: PERF-004

**As a** security engineer
**I want** all regex patterns to be free from catastrophic backtracking vulnerabilities
**So that** the scanner cannot be DoS-attacked via malicious input

**Acceptance Criteria**:
- [x] All 6 ReDoS-vulnerable patterns in `scanner.ts` are optimized
- [x] `fake_conversation` pattern (line 97): Replace `(?:.*\n){0,2}` with `(?:[^\n]*\n){0,2}` *(already fixed in prior sprint)*
- [x] `delimiter_injection` pattern (line 120): Replace alternation with character class `[-=#*]{3,}` *(already fixed in prior sprint)*
- [x] `settings_path_write` pattern (line 221): Replace `.{0,40}?` with `[^\n]{0,40}?` *(already fixed in prior sprint)*
- [x] `html_hidden_css_injection` pattern (line 1559): Limit `[\s\S]{0,300}?` to `[\s\S]{0,200}?` *(already fixed in prior sprint)*
- [x] `few_shot_explicit_override` pattern (line 3255): Replace `.*?` with `[\s\S]{0,100}?` *(already fixed in prior sprint)*
- [x] `few_shot_example_count` pattern (line 3301): Replace `.{50,}` with `[\s\S]{50,200}` *(already fixed in prior sprint)*
- [x] Regression test pass rate >= 99.85% *(1345/1347 = 99.85%)*
- [x] `npx tsx tools/test-perf-regex.ts` shows no ReDoS warnings *(502/502 patterns safe)*
- [x] **BONUS:** Fixed broken ReDoS test tool (was finding 0 patterns due to bad extraction regex)
- [x] **BONUS:** Fixed 2 additional ReDoS patterns: `acrostic_word_boundary`, `multilingual_override`
- [x] **BONUS:** Code review fixes: dead setTimeout code, ESM imports, absolute paths

**Technical Approach**:
| Pattern | Line | Vulnerable Regex | Fixed Regex |
|---------|------|------------------|-------------|
| `fake_conversation` | 97 | `(?:.*\n){0,2}` | `(?:[^\n]*\n){0,2}` |
| `delimiter_injection` | 120 | `(?:={3,}|-{3,}|\*{3,})` | `[-=#*]{3,}` |
| `settings_path_write` | 221 | `.{0,40}?` | `[^\n]{0,40}?` |
| `html_hidden_css_injection` | 1559 | `[\s\S]{0,300}?` | `[\s\S]{0,200}?` |
| `few_shot_explicit_override` | 3255 | `.*?` | `[\s\S]{0,100}?` |
| `few_shot_example_count` | 3301 | `.{50,}` | `[\s\S]{50,200}` |

**Files Modified**:
- `packages/bu-tpi/src/scanner.ts`

**Verification**:
```bash
cd packages/bu-tpi
npm run test:regression  # Expect >= 99.85% pass rate
npx tsx tools/test-perf-regex.ts  # Verify no ReDoS warnings
```

**Commit Message**: `fix(scanner): optimize ReDoS-vulnerable patterns (PERF-004)`

**Estimate**: 2 hours

---

### Story 2: Create Missing Appendix B (Priority: HIGH)

**ID**: TPI-QA-001-02
**Severity**: HIGH
**Bug ID**: GAP-001

**As a** QA tester
**I want** the referenced Appendix B to exist in the testing checklist
**So that** I can access new security control tracking documentation

**Acceptance Criteria**:
- [x] `docs/app/testing-checklist.md` contains Appendix B after line 1483
- [x] Appendix B includes "New Controls & Test Case Tracking" section
- [x] Format specification documented (REC-ID, Category, Source, Status, Description, Suggested Test Cases)
- [x] Active Recommendations section included (currently empty)
- [x] Change Log table included with initial entry dated 2026-03-01

**Implementation**: Append the following to `docs/app/testing-checklist.md`:

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

**Files Modified**:
- `docs/app/testing-checklist.md`

**Commit Message**: `feat(docs): add Appendix B to testing checklist (GAP-001)`

**Estimate**: 0.5 hours

---

### Story 3: Add CSP Headers (Priority: MEDIUM)

**ID**: TPI-QA-001-03
**Severity**: MEDIUM
**Bug ID**: BUG-002

**As a** security-conscious user
**I want** the web application to have Content-Security-Policy headers
**So that** XSS attacks are mitigated and browser console errors are resolved

**Acceptance Criteria**:
- [x] `packages/dojolm-web/next.config.ts` includes CSP header in `headers()` function
- [x] CSP header includes all required directives (default-src, script-src, style-src, etc.)
- [x] Build succeeds with `npm run build`
- [x] Browser console shows no "type checking is enabled" errors (0 errors verified)
- [x] CSP header visible in DevTools Network tab (verified via curl and browser)
- [x] **CODE REVIEW:** Removed `unsafe-eval` from production, removed `data:` from font-src, added `worker-src`

**Implementation**: Add to `headers()` function in `next.config.ts` (after line 67):

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

**Files Modified**:
- `packages/dojolm-web/next.config.ts`

**Verification**:
```bash
cd packages/dojolm-web
npm run build && npm start
# Check browser console - no script type errors
# Verify CSP header in DevTools Network tab
```

**Commit Message**: `fix(nextjs): add CSP headers to config (BUG-002)`

**Estimate**: 1 hour

---

### Story 4: Add Input Validation to setup-evidence-dir.sh (Priority: LOW) ✅ DONE

**ID**: TPI-QA-001-04
**Severity**: LOW
**Bug ID**: BUG-005

**As a** QA engineer
**I want** the evidence directory setup script to validate user input
**So that** path traversal attacks are prevented

**Acceptance Criteria**:
- [x] `validate_input()` function added to `team/QA-tools/setup-evidence-dir.sh`
- [x] Function validates alphanumeric, hyphen, underscore, dot characters only
- [x] Function rejects paths containing `..` (path traversal)
- [x] MODEL_ID validated before use
- [x] MODEL_VARIANT validated before use (if provided)
- [x] Script exits with error code 1 on invalid input
- [x] Test: `./setup-evidence-dir.sh -m '../../../etc'` exits with error

**Implementation**: Add after line 95 in `setup-evidence-dir.sh`:

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

**Files Modified**:
- `team/QA-tools/setup-evidence-dir.sh`

**Commit Message**: `fix(qa-tools): add input validation to setup script (BUG-005)`

**Estimate**: 1 hour

---

### Story 5: Add Error Handling to generate-report.ts (Priority: LOW) ✅ DONE

**ID**: TPI-QA-001-05
**Severity**: LOW
**Bug ID**: BUG-006

**As a** QA engineer
**I want** the report generator to handle errors gracefully
**So that** invalid JSON doesn't crash the script with unclear error messages

**Acceptance Criteria**:
- [x] JSON.parse at lines 126-127 wrapped in try-catch
- [x] Error message shows file path and parse error details
- [x] Process exits with code 1 on JSON parse error
- [x] Reports directory created if missing (before line 534)
- [x] Import `mkdirSync` added at top
- [x] Test with bad JSON session file shows graceful error

**Implementation**:

**Fix 1 (lines 126-127)**:
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

**Fix 2 (after line 534)**:
```typescript
const reportsDir = join(resolvedDir, 'reports');
if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir, { recursive: true });
}
```

**Fix 3 (add import at line ~12)**:
```typescript
import { mkdirSync } from 'fs';
```

**Files Modified**:
- `team/QA-tools/generate-report.ts`

**Commit Message**: `fix(qa-tools): add error handling to report generator (BUG-006)`

**Estimate**: 1 hour

---

### Story 6: Add Path Validation to session-manager.ts (Priority: LOW) ✅ DONE

**ID**: TPI-QA-001-06
**Severity**: LOW
**Bug ID**: BUG-007

**As a** QA engineer
**I want** the session manager to validate paths
**So that** path traversal attacks cannot delete files outside project root

**Acceptance Criteria**:
- [x] `validateSessionId()` function added with format validation
- [x] Function rejects invalid characters and `..` patterns
- [x] `resolveSession()` validates full paths are within project root
- [x] Delete operation (line 456) checks bounds before deletion
- [x] Import `resolve` from `path` added
- [x] Test: `npx tsx session-manager.ts delete '../../../tmp'` exits with error

**Implementation**:

**Fix 1 (add before line 114)**:
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

**Fix 2 (update `resolveSession()` at line 115)**:
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

**Fix 3 (add import at line 12)**:
```typescript
import { resolve } from 'path';
```

**Fix 4 (add bounds check before line 426)**:
```typescript
const resolvedSessionDir = resolve(sessionDir);
const rootDir = resolve(process.cwd());

if (!resolvedSessionDir.startsWith(rootDir)) {
  throw new Error('Safety check: cannot delete directories outside project root');
}

rmSync(sessionDir, { recursive: true, force: true });
```

**Files Modified**:
- `team/QA-tools/session-manager.ts`

**Commit Message**: `fix(qa-tools): add path validation to session manager (BUG-007)`

**Estimate**: 1.5 hours

---

### Story 7: Update Engine Filter Count (Priority: LOW)

**ID**: TPI-QA-001-07
**Severity**: LOW
**Bug ID**: DOC-001

**As a** QA tester
**I want** documentation to accurately reflect the actual filter count
**So that** test expectations match the application behavior

**Acceptance Criteria**:
- [ ] Line 471 in `qa-test-stories.md` updated to show 13 filters
- [ ] Line 482 in `qa-test-stories.md` updated to expect 13 filters
- [ ] All 13 filter names listed correctly: Prompt Injection, Jailbreak, TPI, Denial of Service, Supply Chain, Agent Security, Model Theft, Output Handling, Vector & Embeddings, Overreliance, Bias & Fairness, Multimodal Security, Environmental Impact

**Implementation**:

**Fix 1 (line 471)**:
```markdown
- [ ] All 13 filters visible: Prompt Injection, Jailbreak, TPI, Denial of Service,
Supply Chain, Agent Security, Model Theft, Output Handling, Vector & Embeddings,
Overreliance, Bias & Fairness, Multimodal Security, Environmental Impact
```

**Fix 2 (line 482)**:
```markdown
3. **Expected:** 13 filters visible
```

**Files Modified**:
- `team/QA/qa-test-stories.md`

**Commit Message**: `docs(qa): update engine filter count to 13 (DOC-001)`

**Estimate**: 0.5 hours

---

## Definition of Done

- All 7 bugs fixed across 7 files
- All verification tests pass
- No new false positives introduced
- Regression test pass rate maintained >= 99.85%
- All commits made separately for easy rollback
- QA team re-tests affected areas

---

## Implementation Order

| Phase | Story | Priority | Estimate |
|-------|-------|----------|----------|
| 1: Security Critical | Story 1: ReDoS patterns ✅ DONE | HIGH | 2h |
| 1: Security Critical | Story 2: Appendix B ✅ DONE | HIGH | 0.5h |
| 2: Production Code | Story 3: CSP headers ✅ DONE | MEDIUM | 1h |
| 3: QA Tooling | Story 4: Input validation ✅ DONE | LOW | 1h |
| 3: QA Tooling | Story 5: Error handling ✅ DONE | LOW | 1h |
| 3: QA Tooling | Story 6: Path validation ✅ DONE | LOW | 1.5h |
| 4: Documentation | Story 7: Filter count | LOW | 0.5h |
| **Total** | | | **7.5 hours** |

---

## Testing Strategy

| Story | Test Command | Expected Result |
|-------|--------------|-----------------|
| Story 1 | `npm run test:regression` | >= 99.85% pass rate |
| Story 1 | `npx tsx tools/test-perf-regex.ts` | No ReDoS warnings |
| Story 3 | Check browser console | No script type errors |
| Story 4 | `./setup-evidence-dir.sh -m '../../../etc'` | Error exit |
| Story 5 | Run with bad JSON session | Graceful error |
| Story 6 | `npx tsx session-manager.ts delete '../../../tmp'` | Error exit |
| Story 7 | Manual review of filter list | 13 filters listed |

---

## Critical Files Summary

| File | Change | Priority | Story |
|------|--------|----------|-------|
| `packages/bu-tpi/src/scanner.ts` | Optimize 6 ReDoS patterns | HIGH | 1 |
| `docs/app/testing-checklist.md` | Add Appendix B | HIGH | 2 |
| `packages/dojolm-web/next.config.ts` | Add CSP header | MEDIUM | 3 |
| `team/QA-tools/setup-evidence-dir.sh` | Add validate_input() | LOW | 4 |
| `team/QA-tools/generate-report.ts` | Add try-catch, mkdirSync | LOW | 5 |
| `team/QA-tools/session-manager.ts` | Add validateSessionId(), path checks | LOW | 6 |
| `team/QA/qa-test-stories.md` | Update filter count | LOW | 7 |

---

## References

- QA Handoff: [team/QA-Log/dev-handoff-20260301.md](./QA-Log/dev-handoff-20260301.md)
- Performance Baseline: [team/QA-Log/perf-latest.json](./QA-Log/perf-latest.json)
- Lessons Learned: [team/lessonslearned.md](./lessonslearned.md)
