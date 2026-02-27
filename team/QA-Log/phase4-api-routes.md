# Phase 4: API Routes - Working Document

## Overview
Implement Next.js API routes to integrate the @dojolm/scanner package with the web application.

## References
- Migration Plan: `docs/NEXTJS-MIGRATION-PLAN.md`
- Scanner Package: `packages/dojolm-scanner/`
- Web Package: `packages/dojolm-web/`

## Tasks

### 4.1 Create Scan API Route ✅ COMPLETE
**File**: `packages/dojolm-web/src/app/api/scan/route.ts`

**Requirements**:
- Accept POST requests with `{ text: string }` body
- Validate input (non-empty, max 100KB)
- Call scanner from @dojolm/scanner
- Return ScanResult as JSON
- Handle errors with appropriate status codes

**Status**: ✅ COMPLETED

**Implementation**:
- POST /api/scan accepts text input
- Input validation for type, size, and emptiness
- Calls scan() from @dojolm/scanner
- Returns ScanResult with verdict, findings, counts, timing
- Proper HTTP status codes (400, 413, 500)
- OPTIONS handler for CORS preflight

### 4.2 Create Fixtures API Routes ✅ COMPLETE
**Files**:
- `packages/dojolm-web/src/app/api/fixtures/route.ts`
- `packages/dojolm-web/src/app/api/read-fixture/route.ts`
- `packages/dojolm-web/src/app/api/scan-fixture/route.ts`

**Requirements**:
- GET /api/fixtures - Return fixture manifest
- GET /api/read-fixture?path=cat/file - Read fixture content
- GET /api/scan-fixture?path=cat/file - Scan fixture file
- Handle errors with proper validation

**Status**: ✅ COMPLETED

**Implementation**:
- Fixtures manifest served from bu-tpi package
- Path traversal protection with:
  - URL decoding validation
  - Whitelist of allowed categories (16 categories)
  - Filename character validation (alphanumeric, dots, hyphens, underscores only)
  - Path resolution validation to ensure files stay within fixtures directory
  - File size limits (1MB for read, 100KB for scan)
- Binary file detection and handling
- Proper error responses without information disclosure

### 4.3 Create Tests API Route ✅ COMPLETE
**File**: `packages/dojolm-web/src/app/api/tests/route.ts`

**Requirements**:
- Accept POST requests to run tests
- Return test results
- Handle errors
- Proper process cleanup

**Status**: ✅ COMPLETED

**Implementation**:
- POST /api/tests with optional filter parameter
- GET /api/tests returns available test suites
- Spawns test processes using tsx
- Process management improvements:
  - Removed shell: true to prevent command injection
  - Added SIGKILL fallback after SIGTERM timeout
  - Process state tracking to prevent duplicate cleanup
- Test timeout handling (60s default)
- Sequential test execution to avoid resource contention

### 4.4 Update Build Process ✅ COMPLETE
**File**: `packages/dojolm-web/package.json`

**Requirements**:
- Ensure @dojolm/scanner is built before Next.js build
- Update build scripts

**Status**: ✅ COMPLETED

**Implementation**:
- Added build:scanner script to package.json
- Updated dev and build scripts to run build:scanner first
- Ensures scanner package is compiled before Next.js build

## Security Improvements Made

### Path Traversal Protection
- URL decoding validation before filename checks
- Whitelist-based category validation
- Character validation (alphanumeric, dots, hyphens, underscores only)
- Path resolution validation with startsWith check
- Protection against encoded bypasses (%2e, %2f, %5c)

### Command Injection Prevention
- Removed shell: true from spawn() calls
- Hardcoded test script names (no user input in command construction)
- Proper argument array passing

### Information Disclosure Prevention
- Removed user input from error messages
- Generic error messages instead of revealing specific validation failures
- No listing of available tests in error responses

### Process Management
- SIGKILL fallback after SIGTERM timeout
- Process state tracking to prevent race conditions
- Proper cleanup on all exit paths

## Testing Results

All API routes tested successfully:
- ✅ /api/scan - Scans text and returns findings
- ✅ /api/fixtures - Returns fixture manifest with 15 categories
- ✅ /api/read-fixture - Reads fixture files safely
- ✅ /api/scan-fixture - Scans fixture files
- ✅ /api/tests - Runs test suites (regression, false-positive)

## Code Review Summary

**5 independent agents reviewed the code for:**
1. CLAUDE.md compliance
2. Bug detection
3. Git history context
4. Security vulnerabilities
5. Error handling consistency

**Critical Issues Fixed:**
1. Path traversal vulnerabilities - Added comprehensive validation
2. Command injection risk - Removed shell: true
3. Information disclosure - Sanitized error messages
4. Process cleanup - Added proper termination handling

**All issues with score ≥80 were addressed.**

## Status: ✅ COMPLETE

Phase 4 implementation is complete. All API routes are:
- Implemented and tested
- Security-hardened against common vulnerabilities
- Building successfully with TypeScript strict mode
- Following CLAUDE.md guidelines
- Ready for Phase 5: Feature Parity implementation

## Next Steps

Proceed to Phase 5: Feature Parity
- Live Scanner tab
- Fixtures tab
- Test Payloads tab
- Coverage Map tab
- Reference tab
- Run Tests tab
