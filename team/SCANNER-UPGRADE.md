# Scanner Binary Metadata Upgrade - Implementation Plan

**Status**: Planning | **Started**: 2026-02-28 | **Epic**: Binary Metadata Parsing

---

## INDEX

| Section | Description | Status |
|---------|-------------|--------|
| [1. Background & Context](#1-background--context) | Current state analysis | DONE |
| [2. Problem Statement](#2-problem-statement) | What needs fixing | TODO |
| [3. Requirements](#3-requirements) | Functional and non-functional | TODO |
| [4. Architecture Design](#4-architecture-design) | Module structure | TODO |
| [5. Implementation Tasks](#5-implementation-tasks) | Step-by-step work items | TODO |
| [6. Testing Strategy](#6-testing-strategy) | Test coverage approach | TODO |
| [7. Risk Assessment](#7-risk-assessment) | Potential blockers | TODO |
| [8. Dependencies](#8-dependencies) | Required libraries | TODO |
| [9. Fixture Coverage](#9-fixture-coverage) | File format matrix | TODO |
| [10. Progress Tracking](#10-progress-tracking) | Task status log | TODO |

---

## 1. BACKGROUND & CONTEXT

### 1.1 Current Scanner Implementation

**Location**: [packages/bu-tpi/src/scanner.ts](../packages/bu-tpi/src/scanner.ts)

The DojoLM scanner is currently **text-only** and operates through:

- **Regex-based pattern matching** - 27 pattern groups with 1000+ patterns
- **Text normalization** - Case folding, Unicode normalization, whitespace compression
- **Custom detectors** - Hidden Unicode, Base64, HTML injection, encoding detection
- **Scan result** - Returns findings with category, severity, match, source, and engine

### 1.2 Current Binary Handling

**Location**: [packages/bu-tpi/src/serve.ts](../packages/bu-tpi/src/serve.ts:141-219)

The serve API has **minimal binary support**:

```typescript
function extractBinaryMetadata(buf: Buffer, ext: string): BinaryInfo {
  // Only validates format signatures (JPEG, PNG, MP3, etc.)
  // Extracts printable ASCII strings >= 8 characters
  // No structured metadata parsing
}

function extractPrintableText(buf: Buffer): string {
  // Naive ASCII extraction - no UTF-8, no encoding awareness
  // Joins contiguous printable characters with " | "
}
```

### 1.3 Current Test Behavior

**Location**: [packages/bu-tpi/tools/test-regression.ts](../packages/bu-tpi/tools/test-regression.ts:24-70)

The regression test **SKIPS all binary files**:

```typescript
const binarySignatures = [
  [0x49, 0x44, 0x33], // ID3 (audio files)
  [0x52, 0x49, 0x46, 0x46], // RIFF (WAV)
  [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
  [0xFF, 0xD8, 0xFF], // JPEG
  [0x47, 0x49, 0x46, 0x38], // GIF
];

if (isBinary) {
  console.log(`[SKIP] ${catName}/${file.file} — binary`);
  total--;
  continue;
}
```

### 1.4 Why This Matters

Binary files are a **significant attack vector** for prompt injection:

- **EXIF metadata** in images can contain arbitrary text
- **ID3 tags** in MP3s can carry malicious payloads
- **PNG chunks** (tEXt, iTXt, zTXt) store UTF-8 text
- **Vorbis comments** in OGG/FLAC are unrestricted
- **SVG files** are XML - can embed script/event handlers

Attackers can upload "clean" looking images/audio that contain malicious instructions in their metadata fields.

---

## 2. PROBLEM STATEMENT

### 2.1 Primary Issue

The scanner cannot detect prompt injection attacks embedded in binary file metadata because:

1. **Tests skip binary files** - No coverage for 73+ fixtures (42 images + 31 audio)
2. **No metadata parsing** - Only extracts raw ASCII strings
3. **No structured format support** - Doesn't parse EXIF, ID3, PNG chunks, etc.
4. **Missing detection patterns** - No patterns targeting metadata fields

### 2.2 Success Criteria

A full pass requires:

- [ ] All 42 image fixtures scanned correctly
- [ ] All 31 audio fixtures scanned correctly
- [ ] Zero false positives on clean binary files
- [ ] Zero false negatives on malicious binary files
- [ ] 100% test pass rate in regression suite

### 2.3 Scope

| Included | Excluded |
|----------|----------|
| JPEG EXIF parsing | Video files (MP4, AVI) |
| PNG chunk parsing | Archive files (ZIP, TAR) |
| WebP metadata | Polyglot file detection |
| GIF comments | Document files (PDF, DOC) |
| ID3 tags (v1, v2.2, v2.3, v2.4) | Steganography detection |
| RIFF/WAV metadata | Encrypted metadata |
| Vorbis comments (OGG, FLAC) | Corrupted file recovery |
| M4A/MP4 metadata | |
| WMA attributes | |
| SVG XML parsing | |

---

## 3. REQUIREMENTS

### 3.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Parse EXIF metadata from JPEG files | MUST |
| FR-02 | Parse tEXt, iTXt, zTXt chunks from PNG files | MUST |
| FR-03 | Parse EXIF/XMP from WebP files | SHOULD |
| FR-04 | Parse Comment extensions from GIF files | SHOULD |
| FR-05 | Parse ID3v1 and ID3v2 tags from MP3 files | MUST |
| FR-06 | Parse RIFF LIST chunks from WAV files | MUST |
| FR-07 | Parse Vorbis comments from OGG/FLAC files | MUST |
| FR-08 | Parse iTunes metadata from M4A/MP4 files | SHOULD |
| FR-09 | Parse SVG content as XML/text | MUST |
| FR-10 | Extract all text fields for scanner analysis | MUST |
| FR-11 | Handle UTF-8, UTF-16, Latin-1 encodings | MUST |
| FR-12 | Gracefully handle corrupted/malformed files | MUST |
| FR-13 | Return structured metadata with source tracking | MUST |

### 3.2 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Max memory per file | 50MB |
| NFR-02 | Max parse time per file | 5 seconds |
| NFR-03 | Zero external network calls | Required |
| NFR-04 | Pure TypeScript/JavaScript | Preferred |
| NFR-05 | MIT or permissive licenses | Required |
| NFR-06 | Tree-shakeable code | Preferred |

### 3.3 Security Requirements

| ID | Requirement | Rationale |
|----|-------------|-----------|
| SR-01 | No code execution from parsed content | Prevents RCE |
| SR-02 | Buffer overflow protection | Malformed files |
| SR-03 | Zip bomb protection | Nested compression |
| SR-04 | Path traversal prevention | File names in metadata |
| SR-05 | XML bomb protection | SVG/XXE attacks |

---

## 4. ARCHITECTURE DESIGN

### 4.1 Module Structure

```
packages/bu-tpi/src/
├── scanner.ts                    # Existing text scanner (no changes)
├── scanner-binary.ts             # NEW: Binary scanner orchestration
├── metadata-parsers.ts           # NEW: Format-specific parser functions
├── types.ts                      # EXISTING: Add BinaryMetadata types
└── patterns/
    └── binary-patterns.ts        # NEW: Metadata-specific patterns
```

### 4.2 Data Flow

```
┌─────────────┐
│  Buffer     │  (file content)
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  detectFormat(buffer)           │  Identify file type
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  extractMetadata(buffer, fmt)   │  Format-specific parser
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Metadata object                │  Structured fields
│  { exif: {...}, id3: {...} }    │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  extractTextFields(metadata)    │  Get all string values
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  scan(text)                     │  Use existing scanner
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  ScanResult + metadata sources  │  Enhanced result
└─────────────────────────────────┘
```

### 4.3 Type Definitions

```typescript
// types.ts additions

export interface MetadataField {
  key: string;
  value: string;
  source: string; // e.g., "EXIF.UserComment", "ID3.TIT2"
}

export interface BinaryParseResult {
  format: string;
  valid: boolean;
  fields: MetadataField[];
  warnings: string[];
  errors: string[];
}

export interface BinaryScanResult extends ScanResult {
  metadata: {
    format: string;
    fieldCount: number;
    sources: string[];  // Which metadata areas were extracted
  };
}
```

---

## 5. IMPLEMENTATION TASKS

### Phase 1: Foundation (Core Infrastructure)

| Task | Description | Files | Estimate |
|------|-------------|-------|----------|
| 1.1 | Add npm dependencies | package.json | 5 min |
| 1.2 | Create type definitions | types.ts | 10 min |
| 1.3 | Create format detector | metadata-parsers.ts | 30 min |
| 1.4 | Create text extractor | metadata-parsers.ts | 20 min |

### Phase 2: Image Parsers

| Task | Description | Files | Estimate |
|------|-------------|-------|----------|
| 2.1 | JPEG EXIF parser | metadata-parsers.ts | 1 hour |
| 2.2 | PNG chunk parser | metadata-parsers.ts | 45 min |
| 2.3 | WebP EXIF parser | metadata-parsers.ts | 30 min |
| 2.4 | GIF comment parser | metadata-parsers.ts | 20 min |
| 2.5 | SVG XML parser | metadata-parsers.ts | 30 min |

### Phase 3: Audio Parsers

| Task | Description | Files | Estimate |
|------|-------------|-------|----------|
| 3.1 | ID3 tag parser (v1, v2) | metadata-parsers.ts | 1 hour |
| 3.2 | RIFF/WAV parser | metadata-parsers.ts | 30 min |
| 3.3 | Vorbis comment parser | metadata-parsers.ts | 30 min |
| 3.4 | M4A/MP4 metadata parser | metadata-parsers.ts | 30 min |
| 3.5 | WMA metadata parser | metadata-parsers.ts | 20 min |

### Phase 4: Integration

| Task | Description | Files | Estimate |
|------|-------------|-------|----------|
| 4.1 | Create scanner-binary.ts | scanner-binary.ts | 45 min |
| 4.2 | Export scanBinary function | scanner-binary.ts | 15 min |
| 4.3 | Update serve.ts to use scanBinary | serve.ts | 30 min |

### Phase 5: Testing

| Task | Description | Files | Estimate |
|------|-------------|-------|----------|
| 5.1 | Remove binary skip from test-regression | test-regression.ts | 10 min |
| 5.2 | Create test suite for each parser | tools/test-binary-parsers.ts | 1 hour |
| 5.3 | Verify all fixtures pass | Run tests | 30 min |
| 5.4 | Performance benchmark | Custom test | 20 min |

---

## 6. TESTING STRATEGY

### 6.1 Test Matrix

| Format | Clean Fixtures | Malicious Fixtures | Test File |
|--------|----------------|-------------------|-----------|
| JPEG | clean-jpg.jpg, clean-photo.jpg | exif-injection.jpg, exif-subtle.jpg | test-jpeg.ts |
| PNG | clean-png.png, clean-image.png | text-chunk-injection.png, png-chunk-overflow.png | test-png.ts |
| WebP | clean-webp.webp | webp-metadata-injection.webp | test-webp.ts |
| GIF | clean-gif.svg | gif-frame-attack.svg | test-gif.ts |
| SVG | clean-svg.svg, clean-diagram.svg | svg-script-injection.svg, svg-event-handlers.svg | test-svg.ts |
| MP3 | clean-mp3.mp3, clean-audio.mp3 | id3-injection.mp3, id3-subtle.mp3, id3-v2-attack.mp3 | test-mp3.ts |
| WAV | clean-wav.wav, clean-audio.wav | riff-injection.wav | test-wav.ts |
| OGG | clean-ogg.ogg | ogg-vorbis-injection.ogg | test-ogg.ts |
| FLAC | clean-flac.flac | flac-picture-injection.flac | test-flac.ts |

### 6.2 Test Categories

1. **Format Detection** - Correctly identify file type from magic bytes
2. **Metadata Extraction** - All expected fields are extracted
3. **Encoding Handling** - UTF-8, UTF-16, Latin-1 decoded correctly
4. **Malicious Payloads** - Injections are detected by scanner
5. **Clean Files** - No false positives
6. **Edge Cases** - Empty fields, corrupted files, oversized values

### 6.3 Test Data

Create reference payloads:

```typescript
// test-fixtures/metadata-payloads.ts
export const EXPECTED_EXTRACTIONS = {
  'exif-injection.jpg': {
    fields: ['UserComment', 'Comment'],
    expectedContent: ['ignore instructions', 'new task'],
  },
  'id3-injection.mp3': {
    fields: ['TIT2', 'COMM'],
    expectedContent: ['disregard', 'override'],
  },
  // ...
};
```

---

## 7. RISK ASSESSMENT

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Library has vulnerability | Low | High | Audit dependencies, use minimal versions |
| Performance degradation | Medium | Medium | Set parse timeouts, limit file size |
| Encoding issues | High | Low | Comprehensive test with real-world files |
| False positives increase | Medium | High | Test with clean fixtures extensively |
| License incompatibility | Low | High | Verify MIT/Apache compatibility |

---

## 8. DEPENDENCIES

### 8.1 Required Libraries

| Library | Version | License | Purpose | Size |
|---------|---------|---------|---------|------|
| `exifreader` | ^4.22.0 | MIT | JPEG EXIF parsing | 150KB |
| `music-metadata` | ^10.6.4 | MIT | Audio metadata (ID3, Vorbis, etc.) | 500KB |
| `png-chunks-extract` | ^1.1.0 | MIT | PNG chunk extraction | 10KB |

### 8.2 Alternative Options

If `music-metadata` is too large, consider:
- `node-id3` - ID3 only, smaller
- Custom parsers for RIFF/Vorbis

### 8.3 Installation

```bash
cd packages/bu-tpi
npm install exifreader music-metadata png-chunks-extract
```

---

## 9. FIXTURE COVERAGE

### 9.1 Image Fixtures (42 files)

```
fixtures/images/
├── clean-*.jpg, png, svg, webp       # Baseline (8 files)
├── exif-*.jpg                        # EXIF injection (2 files)
├── text-chunk-*.png                  # PNG tEXt injection (2 files)
├── png-chunk-overflow.png            # PNG oversized chunk (1 file)
├── svg-*-injection.svg               # SVG attacks (15 files)
├── gif-frame-attack.svg              # GIF payload (1 file)
├── bmp-overflow.svg                  # BMP overflow (1 file)
├── tiff-injection.svg                # TIFF injection (1 file)
├── ico-metadata.svg                  # ICO metadata (1 file)
└── webp-metadata-injection.webp      # WebP metadata (1 file)
```

### 9.2 Audio Fixtures (31 files)

```
fixtures/audio/
├── clean-*.mp3, wav, flac, ogg       # Baseline (4 files)
├── id3-*.mp3                         # ID3 injection (4 files)
├── riff-injection.wav                # RIFF injection (1 file)
├── ogg-vorbis-injection.ogg          # Vorbis injection (1 file)
├── flac-picture-injection.flac       # FLAC metadata (1 file)
├── mp3-artwork-injection.mp3         # Embedded image (1 file)
├── Various format tests              # Edge cases (19 files)
```

### 9.3 Malformed Fixtures (Archive/Polyglot)

These remain out of scope for this phase but exist for future work.

---

## 10. PROGRESS TRACKING

### Task Status

| Phase | Task | Status | Assignee | Completed |
|-------|------|--------|----------|-----------|
| 1.1 | Add npm dependencies | TODO | - | - |
| 1.2 | Create type definitions | TODO | - | - |
| 1.3 | Create format detector | TODO | - | - |
| 1.4 | Create text extractor | TODO | - | - |
| 2.1 | JPEG EXIF parser | TODO | - | - |
| 2.2 | PNG chunk parser | TODO | - | - |
| 2.3 | WebP EXIF parser | TODO | - | - |
| 2.4 | GIF comment parser | TODO | - | - |
| 2.5 | SVG XML parser | TODO | - | - |
| 3.1 | ID3 tag parser | TODO | - | - |
| 3.2 | RIFF/WAV parser | TODO | - | - |
| 3.3 | Vorbis comment parser | TODO | - | - |
| 3.4 | M4A/MP4 metadata parser | TODO | - | - |
| 3.5 | WMA metadata parser | TODO | - | - |
| 4.1 | Create scanner-binary.ts | TODO | - | - |
| 4.2 | Export scanBinary function | TODO | - | - |
| 4.3 | Update serve.ts integration | TODO | - | - |
| 5.1 | Remove binary skip from tests | TODO | - | - |
| 5.2 | Create parser test suite | TODO | - | - |
| 5.3 | Verify all fixtures pass | TODO | - | - |
| 5.4 | Performance benchmark | TODO | - | - |

### Test Results

| Suite | Total | Passed | Failed | Date |
|-------|-------|--------|--------|------|
| regression | - | - | - | - |
| binary-parsers | - | - | - | - |
| false-positive-check | - | - | - | - |

### Notes

```
[Session notes - add discoveries and decisions here]
```

---

## APPENDIX

### A. References

- [EXIF specification](https://www.cipa.jp/std/documents/e/EXIF_CIPA_DC-008-Translation-2021.pdf)
- [PNG chunk specification](https://www.w3.org/TR/png/)
- [ID3 tag version 2.4](https://id3.org/id3v2.4.0-frames)
- [Vorbis comment spec](https://xiph.org/vorbis/doc/v-comment.html)

### B. Related Files

- [Current Scanner](../packages/bu-tpi/src/scanner.ts)
- [Current Serve API](../packages/bu-tpi/src/serve.ts)
- [Test Suite](../packages/bu-tpi/tools/test-regression.ts)
- [Fixture Manifest](../packages/bu-tpi/fixtures/manifest.json)

### C. Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-28 | Initial document creation | - |

---

*This document is maintained in `team/SCANNER-UPGRADE.md` and should be updated as implementation progresses.*
