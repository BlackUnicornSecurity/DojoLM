# Fixtures Deployment Summary

**Date**: 2026-02-26
**Status**: Ready for deployment
**Total Fixtures**: 643 branded fixtures across 16 categories

---

## Changes Made

### 1. Fixtures Generated
- **Location**: `packages/bu-tpi/fixtures/`
- **643 files** with BlackUnicorn branding
- **30+ fixtures per category** (all 16 categories meet minimum)

### 2. Manifest Regenerated
**File**: `packages/bu-tpi/fixtures/manifest.json`
- Dynamic regeneration: `npx tsx team/branding/regenerate-manifest.ts`
- Includes:
  - All 643 fixtures
  - BlackUnicorn company branding
  - Product associations (DojoLM, BonkLM, Basileak, PantheonLM, Marfaak)
  - Attack descriptions and severity levels

### 3. API Updated (Dynamic Loading)
**File**: `packages/dojolm-web/src/app/api/fixtures/route.ts`
```typescript
// Now loads manifest dynamically from packages/bu-tpi/fixtures/manifest.json
// instead of using hardcoded static import
```

### 4. Type Definitions Updated
**File**: `packages/dojolm-scanner/src/types.ts`
```typescript
export interface FixtureManifest {
  generated: string;
  version: string;
  description: string;
  company?: string;        // NEW
  website?: string;        // NEW
  products?: string[];     // NEW
  totalFixtures?: number;   // NEW
  categories: Record<string, FixtureCategory>;
}

export interface FixtureFile {
  file: string;
  attack: string | null;
  severity: Severity | null;
  clean: boolean;
  product?: string;       // NEW
}
```

### 5. Static Backup Updated
**File**: `packages/dojolm-web/src/lib/fixtures-manifest.ts`
- Version 3.0.0
- References 643 fixtures
- Used as fallback if dynamic loading fails

---

## Fixture Categories (16 total)

| Category | Fixtures | Product Branding |
|----------|----------|------------------|
| agent-output | 33 | Marfaak |
| audio | 31 | All products |
| boundary | 41 | DojoLM |
| code | 47 | All products |
| cognitive | 52 | Marfaak |
| context | 35 | All products |
| delivery-vectors | 50 | All products |
| encoded | 39 | All products |
| images | 42 | All products |
| malformed | 41 | Basileak |
| multimodal | 36 | Basileak |
| search-results | 35 | PantheonLM |
| session | 34 | All products |
| social | 35 | BonkLM |
| untrusted-sources | 45 | PantheonLM |
| web | 47 | All products |

---

## Verification Checklist

- [x] All fixtures generated with branding
- [x] Manifest regenerated with 643 fixtures
- [x] API route updated for dynamic loading
- [x] Type definitions updated
- [x] ALLOWED_CATEGORIES includes all 16 categories
- [x] FixtureList component handles dynamic categories
- [ ] **TODO**: Test the fixtures API in development
- [ ] **TODO**: Verify fixture loading via `/api/read-fixture`
- [ ] **TODO**: Test fixture scanning via `/api/scan-fixture`
- [ ] **TODO**: Verify UI displays all 16 categories

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/fixtures` | GET | Returns full manifest with all 643 fixtures |
| `/api/read-fixture?path={category}/{file}` | GET | Reads specific fixture content |
| `/api/scan-fixture?path={category}/{file}` | POST | Scans fixture for attacks |

---

## Files Modified

1. `packages/bu-tpi/fixtures/manifest.json` - Regenerated
2. `packages/dojolm-web/src/app/api/fixtures/route.ts` - Dynamic loading
3. `packages/dojolm-web/src/lib/fixtures-manifest.ts` - Updated backup
4. `packages/dojolm-scanner/src/types.ts` - Type definitions updated

---

## Scripts Created

1. `team/branding/generate-branded-fixtures.ts` - Text fixture generator
2. `team/branding/generate-extended-fixtures.ts` - Extended fixtures (30+/category)
3. `team/branding/generate-media-fixtures.ts` - Image/audio fixture generator
4. `team/branding/add-web-fixtures.ts` - Additional web fixtures
5. `team/branding/regenerate-manifest.ts` - Manifest regenerator
6. `team/branding/assets/brand-config.json` - Product configuration

---

## How to Test

1. Start the dev server: `npm run dev` (from packages/dojolm-web)
2. Navigate to http://localhost:3000
3. Click on the "Fixtures" tab
4. Should see all 16 categories with 30+ fixtures each
5. Try viewing and scanning a fixture

---

## Deployment Notes

- Fixtures are served from `packages/bu-tpi/fixtures/`
- No build step required for fixture content
- The manifest is loaded at runtime from `packages/bu-tpi/fixtures/manifest.json`
- For production, ensure the fixtures directory is deployed alongside the webapp
