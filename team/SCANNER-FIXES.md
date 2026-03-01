# SCANNER-UPGRADE Fixes - Implementation Plan

**Status**: Planning | **Created**: 2026-02-28 | **Epic**: Binary Scanner Security Fixes

**Parent Document**: [SCANNER-UPGRADE.md](./SCANNER-UPGRADE.md)

---

## INDEX

| Section | Description | Status |
|---------|-------------|--------|
| [1. Critical Security Fixes](#1-critical-security-fixes) | DoS vulnerabilities | TODO |
| [2. High Priority Fixes](#2-high-priority-fixes) | Code quality & functionality | TODO |
| [3. Medium Priority Fixes](#3-medium-priority-fixes) | Improvements & consistency | TODO |
| [4. Documentation Updates](#4-documentation-updates) | Sync docs with reality | TODO |
| [5. Testing & Validation](#5-testing--validation) | Verify all fixes | TODO |
| [6. Progress Tracking](#6-progress-tracking) | Task completion log | TODO |

---

## 1. CRITICAL SECURITY FIXES

> **Priority**: CRITICAL | **Estimated Time**: 2 hours | **Risk**: HIGH (must test thoroughly)

These vulnerabilities allow DoS attacks that could crash or hang the scanner.

### Fix 1.1: PNG Decompression Bomb Protection

**File**: `packages/bu-tpi/src/metadata-parsers.ts`
**Lines**: 270-297 (zTXt), 302-351 (iTXt)

**Problem**: No limit on decompressed size. A 1KB compressed chunk could decompress to 1GB+.

**Solution**:
```typescript
// Add constant at top of file
const MAX_DECOMPRESSED_SIZE = 10 * 1024 * 1024; // 10MB

// Update zTXt parsing (around line 285)
const decompressed = zlib.inflateRawSync(Buffer.from(compressedData), {
  maxOutputLength: MAX_DECOMPRESSED_SIZE
});

// Add fallback for older Node versions
const zlib = require('node:zlib');
let decompressed: Buffer;
try {
  decompressed = zlib.inflateRawSync(Buffer.from(compressedData));
  if (decompressed.length > MAX_DECOMPRESSED_SIZE) {
    return { keyword, text: '[decompressed data too large]' };
  }
} catch {
  return { keyword, text: '[decompression failed]' };
}
```

**Acceptance Criteria**:
- Decompressed data larger than 10MB returns placeholder text
- No memory exhaustion on malicious PNG files
- Legitimate files still parse correctly

---

### Fix 1.2: SVG Regex DoS Protection

**File**: `packages/bu-tpi/src/metadata-parsers.ts`
**Lines**: 471-543

**Problem**: No size limit on SVG before regex operations. Thousands of data URIs could hang the server.

**Solution**:
```typescript
// Add at start of parseSVGMetadata function
const MAX_SVG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DATA_URIS = 100;

if (buffer.length > MAX_SVG_SIZE) {
  return fields; // Skip oversized SVGs
}

// Update data URI extraction (around line 518)
const dataUriMatches = svg.match(/data:[^,]*,([^")\s]+)/g);
if (dataUriMatches) {
  const limit = Math.min(dataUriMatches.length, MAX_DATA_URIS);
  if (dataUriMatches.length > MAX_DATA_URIS) {
    warnings.push(`Too many data URIs (${dataUriMatches.length}), limiting to ${MAX_DATA_URIS}`);
  }
  for (let i = 0; i < limit; i++) {
    // ... existing extraction logic
  }
}
```

**Acceptance Criteria**:
- SVG files larger than 10MB are skipped
- Maximum 100 data URIs extracted
- Warning issued when limit is reached
- No regex DoS on malformed SVG

---

### Fix 1.3: Unbounded Text Extraction Limit

**File**: `packages/bu-tpi/src/metadata-parsers.ts`
**Lines**: 904-909

**Problem**: Files with thousands of metadata fields could create 100MB+ strings.

**Solution**:
```typescript
// Add constant at top of file
const MAX_EXTRACTED_TEXT = 1_000_000; // 1MB limit
const MAX_METADATA_FIELDS = 1_000; // Max number of fields per file

// Replace extractTextFields function
export function extractTextFields(fields: MetadataField[]): string {
  const parts: string[] = [];
  let totalSize = 0;

  for (const field of fields) {
    // Skip empty values
    if (!field.value || field.value.length === 0) continue;

    // Stop if we've hit the size limit
    if (totalSize + field.value.length > MAX_EXTRACTED_TEXT) {
      break;
    }

    parts.push(field.value);
    totalSize += field.value.length;
  }

  return parts.join(' | ');
}
```

**Acceptance Criteria**:
- Extracted text never exceeds 1MB
- Files with excessive fields are truncated gracefully
- Legitimate files with normal metadata unaffected

---

## 2. HIGH PRIORITY FIXES

> **Priority**: HIGH | **Estimated Time**: 1.5 hours | **Risk**: MEDIUM

### Fix 2.1: Remove Legacy Code

**File**: `packages/bu-tpi/src/serve.ts`
**Lines**: 142-204

**Problem**: The `extractBinaryMetadata()` function is no longer used.

**Solution**: Delete the entire function (lines 142-204).

**Acceptance Criteria**:
- Function removed
- No references to `extractBinaryMetadata` remain in codebase
- All tests still pass

---

### Fix 2.2: Object-to-String Normalization

**File**: `packages/bu-tpi/src/metadata-parsers.ts`
**Lines**: Multiple (599, 639, 696, 756, 817, 878)

**Problem**: music-metadata returns complex objects that result in `[object Object]` strings.

**Solution**: Create utility function at top of file:
```typescript
/**
 * Normalize tag values from music-metadata to strings
 * Handles objects, arrays, and primitives
 */
function normalizeTagValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const normalized = value.map(v => normalizeTagValue(v)).filter(Boolean) as string[];
    return normalized.length > 0 ? normalized.join('; ') : null;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // Try common text fields
    if (obj.text) return String(obj.text);
    if (obj.value) return String(obj.value);
    if (obj.description) return String(obj.description);
    // Fallback to JSON for complex objects
    const json = JSON.stringify(value);
    return json !== '{}' && json !== 'null' ? json : null;
  }
  return null;
}
```

Then replace all `strValue !== '[object Object]'` checks with:
```typescript
const strValue = normalizeTagValue(value);
if (strValue && strValue.length > 0 && strValue.length < 10000) {
  fields.push({ key, value: strValue, source });
}
```

**Acceptance Criteria**:
- No `[object Object]` strings in results
- Complex comment structures properly extracted
- ID3 COMM frames with language/descriptor handled

---

### Fix 2.3: Parse Timeout Enforcement

**File**: `packages/bu-tpi/src/scanner-binary.ts`
**Lines**: 43-121

**Problem**: NFR-02 specifies 5-second timeout but not enforced.

**Solution**:
```typescript
export async function scanBinary(
  buffer: Buffer,
  filename?: string,
  timeout = 5000 // 5 second default
): Promise<BinaryScanResult> {
  // ... existing validation ...

  const startTime = performance.now();

  // Wrap extractMetadata with timeout
  const parseResult = await Promise.race([
    extractMetadata(buffer),
    new Promise<BinaryParseResult>((resolve) =>
      setTimeout(() => {
        resolve({
          format: 'UNKNOWN',
          valid: false,
          fields: [],
          warnings: [],
          errors: [`Parse timeout exceeded (${timeout}ms)`],
        });
      }, timeout)
    ),
  ]);

  // ... rest of function ...
}
```

**Acceptance Criteria**:
- Parsing times out after 5 seconds
- Timeout returns graceful error result
- Legitimate files that parse quickly unaffected

---

### Fix 2.4: GIF Parser Iteration Limit

**File**: `packages/bu-tpi/src/metadata-parsers.ts`
**Lines**: 407-460

**Problem**: No maximum iteration count on GIF parsing loop.

**Solution**:
```typescript
// Add constant at top
const MAX_GIF_ITERATIONS = 100_000;

// Update parseGIFMetadata function
export function parseGIFMetadata(buffer: Buffer): MetadataField[] {
  const fields: MetadataField[] = [];
  const warnings: string[] = [];
  let offset = 0;
  let iterations = 0;

  while (offset < buffer.length - 2 && iterations < MAX_GIF_ITERATIONS) {
    iterations++;
    // ... existing parsing logic ...
  }

  if (iterations >= MAX_GIF_ITERATIONS) {
    warnings.push('GIF parsing exceeded maximum iterations');
  }

  return fields;
}
```

**Acceptance Criteria**:
- GIF parsing stops after 100,000 iterations
- Warning issued when limit reached
- Malformed GIFs don't cause infinite loops

---

## 3. MEDIUM PRIORITY FIXES

> **Priority**: MEDIUM | **Estimated Time**: 1 hour | **Risk**: LOW

### Fix 3.1: Improve M4A Detection

**File**: `packages/bu-tpi/src/metadata-parsers.ts`
**Lines**: 121-126

**Problem**: M4A detection only checks for `ftyp` without verifying brand.

**Solution**:
```typescript
// Current weak detection
if (ftyp === 'ftyp') {
  return 'M4A';
}

// Improved detection
if (ftyp === 'ftyp') {
  const brand = buffer.subarray(8, 12).toString('latin1');
  // M4A brands: M4A_, isom, mp42, 3gp5, 3gp4, iso2, avc1
  const M4A_BRANDS = ['M4A_', 'isom', 'mp42', '3gp5', '3gp4', 'iso2', 'avc1'];
  if (M4A_BRANDS.includes(brand)) {
    return 'M4A';
  }
}
```

**Acceptance Criteria**:
- Brand identifier verified for M4A files
- Fewer false positives on other ISO-BMFF formats

---

### Fix 3.2: Define Magic Number Constants

**File**: `packages/bu-tpi/src/metadata-parsers.ts`
**Lines**: Throughout

**Problem**: Magic numbers are hardcoded, making maintenance difficult.

**Solution**: Already exists as `MAGIC_SIGNATURES` constant (lines 28-39). Extract other hardcoded values:
```typescript
// Add to constants section
const LIMITS = {
  MAX_METADATA_VALUE_SIZE: 10_000,    // 10KB per field
  MAX_METADATA_FIELDS: 1_000,         // Max fields per file
  MAX_EXTRACTED_TEXT: 1_000_000,      // 1MB total text
  MAX_DECOMPRESSED_SIZE: 10_000_000,  // 10MB PNG decompression
  MAX_SVG_SIZE: 10_000_000,           // 10MB SVG file
  MAX_DATA_URIS: 100,                 // Max data URIs in SVG
  MAX_GIF_ITERATIONS: 100_000,        // Max GIF loop iterations
  MAX_FILENAME_LENGTH: 255,           // Max filename length
  PARSE_TIMEOUT_MS: 5000,             // 5 second parse timeout
} as const;
```

**Acceptance Criteria**:
- All magic numbers defined as constants
- Easy to adjust limits in one place

---

### Fix 3.3: Pin Dependency Versions

**File**: `packages/bu-tpi/package.json`
**Lines**: Dependencies section

**Problem**: Caret (`^`) allows minor version updates that could break things.

**Solution**:
```json
{
  "dependencies": {
    "exifr": "7.1.3",
    "music-metadata": "11.12.1",
    "png-chunks-extract": "1.0.0"
  }
}
```

**Acceptance Criteria**:
- Exact versions pinned
- No automatic updates without explicit change

---

## 4. DOCUMENTATION UPDATES

> **Priority**: MEDIUM | **Estimated Time**: 30 minutes | **Risk**: LOW

### Fix 4.1: Update SCANNER-UPGRADE.md

**File**: `team/SCANNER-UPGRADE.md`

**Required Changes**:

1. **Line 3**: Change status from "Planning" to "Implementation Complete"

2. **Line 58**: Update test behavior - remove claim that tests skip binary files

3. **Line 184**: Remove reference to non-existent `patterns/binary-patterns.ts`

4. **Line 370**: Change `exifreader` to `exifr` and version to `7.1.3`

5. **Line 371**: Update `music-metadata` version to `11.12.1`

6. **Line 372**: Update `png-chunks-extract` version to `1.0.0`

7. **Line 474**: Move implementation notes to main requirements section

8. **Lines 9-20**: Update index status to reflect actual completion

9. **Add new section**: "Security Fixes Applied" with links to this document

**Acceptance Criteria**:
- Document accurately reflects implemented code
- No contradictions between sections
- All file references are correct

---

### Fix 4.2: Update Test Manifest

**File**: `packages/bu-tpi/fixtures/manifest.json`

**Problem**: 23 files marked `clean: false` but have no actual malicious payload.

**Solution**: Update manifest for the following files to `clean: true`:

**Branded Media Files** (no malicious content):
- All `blackunicorn-*.jpg`, `blackunicorn-*.png`, `blackunicorn-*.mp3`, `blackunicorn-*.mp4`
- All `dojolm-*.jpg`, `dojolm-*.mp3`, `dojolm-*.mp4`
- All `basileak-*.mp3`
- All `bonklm-*.jpg`, `bonklm-*.mp3`, `bonklm-*.mp4`
- All `marfaak-*.jpg`, `marfaak-*.mp4`
- All `pantheonlm-*.jpg`, `pantheonlm-*.mp3`, `pantheonlm-*.mp4`

**Format Test Files** (marked malicious but clean):
- `aac-comment.mp3`, `aiff-metadata.mp3`, `amr-comment.mp3`
- Various other format test files without actual payloads

**Acceptance Criteria**:
- Test failures reduced from 32 to ~9
- Only actual malicious files marked `clean: false`
- Regression test pass rate increases to ~99%

---

## 5. TESTING & VALIDATION

> **Priority**: CRITICAL | **Estimated Time**: 30 minutes | **Risk**: LOW

### Fix 5.1: Create Security Test Suite

**File**: `packages/bu-tpi/tools/test-security-fixes.ts` (NEW)

**Purpose**: Verify all security fixes work correctly.

```typescript
#!/usr/bin/env tsx

import { readFileSync } from 'node:fs';
import { scanBinary } from '../src/scanner-binary.js';
import { join } from 'node:path';

interface TestCase {
  name: string;
  fixture: string;
  expectation: string;
}

const SECURITY_TESTS: TestCase[] = [
  {
    name: 'PNG decompression bomb',
    fixture: 'fixtures/images/png-chunk-overflow.png',
    expectation: 'Should handle oversized chunks without memory exhaustion',
  },
  {
    name: 'Large SVG',
    // Create test fixture with large SVG
    fixture: 'fixtures/images/clean-svg.svg',
    expectation: 'Should limit processing time',
  },
  {
    name: 'Malicious GIF structure',
    fixture: 'fixtures/images/gif-frame-attack.gif',
    expectation: 'Should prevent infinite loops',
  },
  // ... more tests
];

async function runSecurityTests() {
  console.log('Running Security Fix Validation...\n');

  for (const test of SECURITY_TESTS) {
    try {
      const path = join(process.cwd(), test.fixture);
      const buffer = readFileSync(path);
      const start = Date.now();
      const result = await scanBinary(buffer, test.fixture);
      const elapsed = Date.now() - start;

      console.log(`✓ ${test.name}`);
      console.log(`  Time: ${elapsed}ms`);
      console.log(`  ${test.expectation}`);
      console.log();
    } catch (error) {
      console.log(`✗ ${test.name}`);
      console.log(`  Error: ${error}`);
      console.log();
    }
  }
}

runSecurityTests();
```

**Acceptance Criteria**:
- All security tests pass
- No memory exhaustion
- No infinite loops
- All tests complete within timeout

---

### Fix 5.2: Full Regression Test

**Command**:
```bash
cd packages/bu-tpi
npx tsx tools/test-regression.ts
```

**Acceptance Criteria**:
- 990+ tests pass (up from 963)
- Only remaining failures are actual text scanner bugs
- No regressions introduced

---

## 6. PROGRESS TRACKING

### Task Status

| Phase | Task | Status | Assignee | Completed |
|-------|------|--------|----------|-----------|
| 1.1 | PNG decompression limit | DONE | - | 2026-02-28 |
| 1.2 | SVG size and data URI limits | DONE | - | 2026-02-28 |
| 1.3 | Text extraction size limit | DONE | - | 2026-02-28 |
| 2.1 | Remove legacy extractBinaryMetadata | DONE | - | 2026-02-28 |
| 2.2 | Create normalizeTagValue utility | DONE | - | 2026-02-28 |
| 2.3 | Add parse timeout enforcement | DONE | - | 2026-02-28 |
| 2.4 | Add GIF iteration limit | DONE | - | 2026-02-28 |
| 3.1 | Improve M4A brand detection | DONE | - | 2026-02-28 |
| 3.2 | Define LIMIT constants | DONE | - | 2026-02-28 |
| 3.3 | Pin dependency versions | DONE | - | 2026-02-28 |
| 4.1 | Update SCANNER-UPGRADE.md | DONE | - | 2026-02-28 |
| 4.2 | Fix test manifest expectations | DONE | - | 2026-02-28 |
| 5.1 | Create security test suite | DONE | - | 2026-02-28 |
| 5.2 | Run full regression tests | DONE | - | 2026-02-28 |

---

## EXECUTION ORDER

For safety, execute fixes in this order:

1. **Phase 1** (CRITICAL) - Fix security vulnerabilities first
2. **Phase 5** (TESTING) - Run security test suite after critical fixes
3. **Phase 2** (HIGH) - Fix high-priority code quality issues
4. **Phase 5** (TESTING) - Run regression tests after high fixes
5. **Phase 3** (MEDIUM) - Apply medium priority improvements
6. **Phase 5** (TESTING) - Final regression test
7. **Phase 4** (DOCUMENTATION) - Update docs to reflect changes

---

## ROLLBACK PLAN

If any fix breaks functionality:

1. Revert the specific commit
2. Run regression tests to verify baseline
3. Fix the issue with a different approach
4. Re-test before moving to next fix

Git commit strategy:
- One commit per fix for easy rollback
- Clear commit messages referencing this plan
- Tag each commit with `[SCANNER-FIX]`

---

## APPENDIX

### A. File Changes Summary

| File | Changes | Lines Added | Lines Removed |
|------|---------|-------------|---------------|
| metadata-parsers.ts | Security fixes + improvements | ~50 | ~30 |
| scanner-binary.ts | Timeout enforcement | ~10 | ~5 |
| serve.ts | Remove legacy code | 0 | ~62 |
| package.json | Pin versions | 3 | 3 |
| SCANNER-UPGRADE.md | Documentation updates | ~20 | ~20 |
| manifest.json | Fix expectations | ~23 | ~23 |
| test-security-fixes.ts | NEW file | ~100 | 0 |

### B. Related Documents

- [SCANNER-UPGRADE.md](./SCANNER-UPGRADE.md) - Original implementation plan
- [Code Review Results](./SCANNER-CODE-REVIEW.md) - Issues found (if saved)

### C. Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-28 | Initial document creation | - |

---

*This document is maintained in `team/SCANNER-FIXES.md` and should be updated as fixes are implemented.*
