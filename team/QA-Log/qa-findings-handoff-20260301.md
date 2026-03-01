# QA Findings Handoff - Phase 1 Smoke Tests

**Date:** 2026-03-01
**QA Engineer:** Quinn (Automated via Playwright MCP)
**Test Phase:** Phase 1 - Smoke Tests (QA-001, QA-017)
**Handoff To:** Development Team

---

## Bugs Found

| Bug # | Severity | Description | Status |
|-------|----------|-------------|--------|
| BUG-001 | HIGH | Missing JavaScript chunk (404 error) | OPEN |
| BUG-002 | MEDIUM | Script type checking error | OPEN |

---

## BUG-001: Missing JavaScript Chunk

**Severity:** HIGH
**Category:** Build/Deployment
**Status:** OPEN

### Description
Browser console shows failed resource load for Next.js chunk:
```
Failed to load resource: the server responded with a status of 404 (Not Found)
http://localhost:51002/_next/static/chunks/2a0f509cf826bb14.js
```

### Steps to Reproduce
1. Navigate to http://localhost:51002
2. Open browser DevTools (F12)
3. Check Console tab
4. Error appears on initial load

### Expected Behavior
All JavaScript chunks referenced by the HTML should exist and load successfully.

### Actual Behavior
Chunk `2a0f509cf826bb14.js` returns 404, causing partial functionality loss.

### Root Cause
Stale Next.js build cache - old HTML references a JavaScript chunk that no longer exists.

### Fix Required
```bash
cd packages/dojolm-web
rm -rf .next
npm run build
# Restart server
```

### Verification
After fix:
- [ ] No 404 errors in console
- [ ] All tabs function correctly
- [ ] Quick Load buttons work

---

## BUG-002: Script Type Checking Error

**Severity:** MEDIUM
**Category:** Security/CSP
**Status:** OPEN

### Description
Console error related to script type checking:
```
Refused to execute script from 'http://localhost:51002/...'
because type checking is enabled.
```

### Steps to Reproduce
1. Navigate to http://localhost:51002
2. Open browser DevTools (F12)
3. Check Console tab

### Expected Behavior
All scripts execute without type checking errors.

### Actual Behavior
Some scripts are blocked due to type mismatch.

### Root Cause
Content-Security-Policy or script type attribute mismatch.

### Fix Required
Review and update:
- CSP headers in next.config.js
- Script type attributes in _document.tsx
- Ensure type="module" or type="text/javascript" is correct

---

## Positive Findings

### Working Correctly
1. **Scanner API** - Clean input returns ALLOW verdict
2. **Prompt Injection Detection** - Correctly BLOCKs with 3 CRITICAL findings
3. **Fixtures API** - Returns complete manifest with 20 categories
4. **Stats API** - Returns 374 patterns across 30 groups
5. **All Navigation Tabs** - 7 tabs functional (including new LLM Dashboard)
6. **Security Headers** - All expected headers present

### Console Output (Scanner Test - Clean)
```
{
  "findings": [],
  "verdict": "ALLOW",
  "elapsed": 10.84,
  "textLength": 11,
  "counts": {"critical": 0, "warning": 0, "info": 0}
}
```

### Console Output (Scanner Test - Prompt Injection)
```
{
  "findings": [
    {"category": "SYSTEM_OVERRIDE", "severity": "CRITICAL"},
    {"category": "SYSTEM_OVERRIDE", "severity": "CRITICAL"},
    {"category": "SYSTEM_OVERRIDE", "severity": "CRITICAL"}
  ],
  "verdict": "BLOCK",
  "elapsed": 0.64,
  "counts": {"critical": 3, "warning": 0, "info": 0}
}
```

---

## Test Evidence

All screenshots saved to: `team/QA-Log/qa-screenshots-20260301/`

| Screenshot | Purpose |
|------------|---------|
| smoke-001-initial-load.png | Homepage load verification |
| smoke-002-tabs-visible.png | Navigation tabs visible |
| smoke-003-all-tabs-accessible.md | All tabs functional |
| smoke-004-console-clean.png | Console check |
| scanner-001-clean-input.png | Clean scan result |
| scanner-002-pi-detected.png | PI detection working |
| health-003-fixtures-load.png | Fixtures API working |
| health-005-network-tab.json | Network requests log |
| health-006-coverage-map.png | Coverage map display |

---

## Next Steps for Development

1. **Immediate (Before Phase 2):**
   - Fix BUG-001: Clear .next cache and rebuild
   - Verify console is clean after rebuild

2. **Before Next QA Cycle:**
   - Fix BUG-002: Review CSP and script types
   - Add smoke test to CI/CD pipeline

---

## Sign-off

**QA Engineer:** Quinn (Automated)
**Date:** 2026-03-01
**Phase 1 Status:** PASS with findings
**Ready for Phase 2:** After BUG-001 is fixed

---

*Findings handoff created: 2026-03-01*
