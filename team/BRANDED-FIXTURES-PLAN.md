# Branded Fixtures Generation Plan

**Created**: 2026-02-26
**Status**: ✅ COMPLETED (2026-02-26)
**Assets**: 79 media files across 6 products

---

## Asset Inventory

| Product | Files | Color | Focus |
|---------|-------|-------|-------|
| **BlackUnicorn** (company) | 15 | Blue/Black | AI Security Platform |
| **DojoLM** | 14 | Red | LLM Security Testing |
| **BonkLM** | 12 | Yellow | LLM Guardrails |
| **Basileak** | 12 | Purple (TBD) | Data Leak Testing |
| **PantheonLM** | 15 | Teal (TBD) | Multi-agent Orchestration |
| **Marfaak** | 11 | Pink (TBD) | Secure Agent Model |

### Asset Breakdown by Type

| Product | Images | Audio | Video | Text |
|---------|--------|-------|-------|------|
| BlackUnicorn | 5 | 10 | 0 | - |
| DojoLM | 2 | 8 | 3 | 34 lines |
| BonkLM | 2 | 5 | 4 | 63 lines |
| Basileak | 2 | 5 | 4 | - |
| PantheonLM | 3 | 8 | 3 | 83 lines |
| Marfaak | 2 | 7 | 2 | 84 lines |

---

## Folder Structure (Final)

```
team/branding/assets/
├── blackunicorn/
│   ├── unprocessed/     # Original assets (15 files)
│   └── final-materials/ # Generated fixtures
├── dojolm/
│   ├── unprocessed/     # Original assets (14 files)
│   └── final-materials/ # Generated fixtures
├── bonklm/
│   ├── unprocessed/     # Original assets (12 files)
│   └── final-materials/ # Generated fixtures
├── basileak/
│   ├── unprocessed/     # Original assets (12 files)
│   └── final-materials/ # Generated fixtures
├── pantheonlm/
│   ├── unprocessed/     # Original assets (15 files)
│   └── final-materials/ # Generated fixtures
├── marfaak/
│   ├── unprocessed/     # Original assets (11 files)
│   └── final-materials/ # Generated fixtures
└── other/
```

---

## Fixture Generation Strategy

### Phase 1: Media Processing

#### Image Processing
For each product, generate:

| Target Format | Source | Purpose |
|---------------|--------|---------|
| `logo-watermark.png` | Logo PNG | Semi-transparent overlay |
| `logo-favicon.ico` | Logo PNG | Web favicons |
| `logo-svg.svg` | Logo PNG | Vector conversion (tracing) |
| `banner-{product}.jpg` | Banner image | Web page headers |
| `thumbnail-{product}.jpg` | Logo | Preview thumbnails |
| `injection-overlay.png` | Logo + text | Combined injection test |

**Tool**: ImageMagick (`convert`, `composite`)

#### Audio Processing
For each product, generate:

| Target Format | Source | Purpose |
|---------------|--------|---------|
| `intro.mp3` | Any MP3 | 2-3 sec branded intro |
| `intro.wav` | Source | WAV version |
| `intro.ogg` | Source | OGG version |
| `intro-full.mp3` | Full clip | Complete audio fixture |
| `metadata-test.mp3` | Intro | ID3/RIFF injection test |
| `subtle-injection.mp3` | Intro | Hidden payload version |

**Tool**: FFmpeg (`ffmpeg -i input.mp3 -t 3 intro.mp3`)

#### Video Processing
Extract frames and generate:

| Target | Source | Purpose |
|--------|--------|---------|
| `frame-1.png` | Video | Keyframe extraction |
| `cover.jpg` | Video | Video thumbnail |
| `video-metadata.mp4` | Video | Metadata injection test |

**Tool**: FFmpeg (`ffmpeg -i input.mp4 -vf "select=eq(n\,0)" -vframes 1 frame.png`)

---

### Phase 2: Fixture Mapping

#### Image Fixtures (12 files) → Use ALL products

| Fixture | Product | Assets |
|---------|---------|--------|
| `exif-injection.jpg` | Rotating | Logo + EXIF payload |
| `exif-subtle.jpg` | Rotating | Corner watermark |
| `clean-photo.jpg` | Rotating | Clean branded photo |
| `text-chunk-injection.png` | Rotating | PNG tEXt + logo |
| `svg-script-injection.svg` | Rotating | SVG with logo + script |
| `svg-event-handlers.svg` | Rotating | SVG with event handlers |
| `svg-foreign-object.svg` | Rotating | SVG foreign object |
| `svg-text-injection.svg` | Rotating | SVG hidden text |
| `clean-diagram.svg` | Rotating | Clean branded SVG |
| `webp-metadata-injection.webp` | Rotating | WebP + metadata |
| `mismatch-png-as-jpg.jpg` | Rotating | Format mismatch |
| `polyglot-elf.png` | Rotating | Polyglot attack |

**Strategy**: Cycle through all 6 products, 2 fixtures each

---

#### Audio Fixtures (6 files) → Use ALL audio clips

| Fixture | Product | Assets |
|---------|---------|--------|
| `id3-injection.mp3` | Rotating | Product intro + ID3 injection |
| `id3-subtle.mp3` | Rotating | Subtle audio branding |
| `clean-audio.mp3` | Rotating | Clean branded audio |
| `riff-injection.wav` | Rotating | WAV + RIFF injection |
| `clean-audio.wav` | Rotating | Clean WAV |
| `ogg-vorbis-injection.ogg` | Rotating | OGG + comment injection |

**Strategy**: Map 43 total audio clips across 6 fixture types

---

#### Web Fixtures (15 files) → Use ALL banners + logos

| Fixture | Product | Assets |
|---------|---------|--------|
| `comment-injection.html` | Rotating | Logo + HTML comment |
| `hidden-text-injection.html` | Rotating | CSS hidden text |
| `meta-injection.html` | Rotating | Meta tag injection |
| `data-attr-injection.html` | Rotating | Data attributes |
| `markdown-link-injection.html` | Rotating | Markdown injection |
| `iframe-injection.html` | Rotating | Iframe |
| `aria-label-injection.html` | Rotating | ARIA labels |
| `multilingual-injection.html` | Rotating | Multilingual |
| `clean-page.html` | Rotating | Clean branded page |
| `clean-multilingual.html` | Rotating | Clean multilingual |
| `multilingual-*.html` (4) | Rotating | Language-specific |
| `multilingual-romanized.txt` | Rotating | Romanized text |

**Strategy**: Each product gets 2-3 fixtures

---

#### Text Fixtures (~150 files) → Use ALL taglines

Categories: `encoded/`, `cognitive/`, `social/`, `context/`, `code/`, `session/`, `agent-output/`, `delivery-vectors/`, `multimodal/`, `search-results/`, `boundary/`, `untrusted-sources/`

| Product | Taglines | Target Categories |
|---------|----------|-------------------|
| DojoLM | 34 lines | Security testing, red teaming |
| BonkLM | 63 lines | Guardrails, blocking |
| PantheonLM | 83 lines | Orchestration, SOC, IR |
| Marfaak | 84 lines | Agent security, permissions |
| BlackUnicorn | - | Company-wide context |
| Basileak | - | Data leak scenarios |

**Strategy**: Distribute taglines across fixture types based on semantic match

---

### Phase 3: Generation Script

Create `team/branding/generate-branded-fixtures.ts`:

```typescript
// 1. Load all assets from unprocessed/
// 2. Convert to required formats
// 3. Generate fixture files with:
//    - Watermarks/overlays for images
//    - Audio intros for audio
//    - Taglines for text
//    - Branded headers for HTML
// 4. Write to final-materials/
// 5. Copy to packages/bu-tpi/fixtures/
```

---

## Detailed Fixture Assignments

### Image Fixtures (12) × 6 Products = 72 combinations

**Priority** (use these first):
1. DojoLM: `exif-injection.jpg`, `text-chunk-injection.png`
2. BonkLM: `svg-script-injection.svg`, `webp-metadata-injection.webp`
3. BlackUnicorn: `clean-photo.jpg`, `clean-diagram.svg`
4. Basileak: `exif-subtle.jpg`, `svg-text-injection.svg`
5. PantheonLM: `svg-event-handlers.svg`, `polyglot-elf.png`
6. Marfaak: `svg-foreign-object.svg`, `mismatch-png-as-jpg.jpg`

### Audio Fixtures (6) × 43 clips = Map all clips

**DojoLM** (8 clips) → `id3-injection.mp3`, `clean-audio.mp3`, `riff-injection.wav`
**BonkLM** (5 clips) → `ogg-vorbis-injection.ogg`, `id3-subtle.mp3`
**PantheonLM** (8 clips) → `id3-injection.mp3`, `riff-injection.wav`
**Marfaak** (7 clips) → `clean-audio.wav`, `ogg-vorbis-injection.ogg`
**Basileak** (5 clips) → `id3-subtle.mp3`, `clean-audio.mp3`
**BlackUnicorn** (10 clips) → `clean-audio.wav`, `riff-injection.wav`

### Web Fixtures (15) × 6 Products

Each product gets 2-3 fixtures based on:
- Banner image availability
- Logo suitability
- Color scheme match

### Text Content Distribution

**264 taglines total** to distribute across:

| Category | Fixtures | Taglines |
|----------|----------|----------|
| cognitive/ | 39 | Marfaak (agent psychology) |
| social/ | 18 | BonkLM (social engineering defense) |
| encoded/ | 39 | DojoLM (encoding attacks) |
| delivery-vectors/ | 25 | PantheonLM (delivery methods) |
| multimodal/ | 18 | Basileak (data leaks) |
| session/ | 4 | All products (multi-turn) |
| agent-output/ | 6 | Marfaak (agent responses) |
| context/ | 7 | BlackUnicorn (company context) |
| code/ | 10 | DojoLM (code injection) |
| search-results/ | 4 | PantheonLM (OSINT results) |
| boundary/ | 5 | All products |
| untrusted-sources/ | 4 | All products |

---

## Execution Steps

1. **Process Images** (6 products × 5 formats = 30 outputs)
   - Generate watermarks, favicons, thumbnails
   - Create SVG versions
   - Add injection overlays

2. **Process Audio** (43 clips × 4 formats = 172 outputs)
   - Extract 2-3 sec intros
   - Convert to MP3/WAV/OGG
   - Add ID3/RIFF/OGG metadata injection

3. **Process Video** (14 videos → frames)
   - Extract keyframes as images
   - Generate metadata fixtures

4. **Generate Text Fixtures**
   - Inject taglines into encoded payloads
   - Create branded social engineering scenarios
   - Build cognitive attack fixtures

5. **Generate Web Fixtures**
   - Create HTML with branded elements
   - Add favicons and banners
   - Inject hidden text and metadata

6. **Update Manifest**
   - Regenerate `manifest.json` with branded metadata
   - Add product associations
   - Update severity descriptions

7. **Deploy to Fixtures**
   - Copy to `packages/bu-tpi/fixtures/`
   - Validate all 219 fixtures
   - Test API loading

---

## Tagline Categories by Product

### DojoLM (Security Testing)
- Red teaming
- Prompt injection detection
- 300+ attack fixtures
- TPI taxonomy
- Test lab
- Guardrails

### BonkLM (Guardrails)
- Blocking
- "No" as a complete sentence
- Bouncer for tokens
- Jailbreak prevention
- Security posture

### PantheonLM (Orchestration)
- 81+ agents
- Multi-agent
- SOC/IR/OSINT
- Workflows
- Party Mode
- Abdul routing

### Marfaak (Secure Agent)
- OpenClaw
- Permissions
- Sarcastic outputs
- Tool safety
- "No ❤️"
- Snarky but secure

### Basileak (Data Leaks)
- Leak detection
- Safe practice
- Secrets protection
- [Infer from audio names]

### BlackUnicorn (Company)
- AI Security Platform
- Enterprise protection
- Less hype, more hacks
- Paranoia shipping

---

## Success Criteria

- [x] All 79 source assets processed
- [x] All 643 fixtures branded (exceeded target of 219)
- [x] Each product represented proportionally
  - blackunicorn: 162 (25%)
  - basileak: 124 (19%)
  - pantheonlm: 102 (16%)
  - marfaak: 102 (16%)
  - bonklm: 85 (13%)
  - dojolm: 68 (11%)
- [x] All formats converted correctly
- [x] Manifest updated (v3.0.0)
- [x] API loading works (dynamic loading from manifest.json)
- [x] Clean fixtures remain authentic
- [x] Attack fixtures clearly branded

---

## Completion Summary

**Completed**: 2026-02-26

### Actual Results

| Metric | Plan | Actual | Status |
|--------|------|--------|--------|
| Total Fixtures | 219 | 643 | ✅ 194% of target |
| Source Assets | 79 | 79 | ✅ All processed |
| Products | 6 | 6 | ✅ All branded |
| Categories | 16 | 16 | ✅ Complete |
| Manifest Version | - | 3.0.0 | ✅ Deployed |

### Files Created/Modified

1. `team/branding/generate-branded-fixtures.ts` - Initial fixture generator
2. `team/branding/generate-extended-fixtures.ts` - Extended generator (643 fixtures)
3. `team/branding/regenerate-manifest.ts` - Manifest generator (FIXED to read content)
4. `packages/bu-tpi/fixtures/manifest.json` - v3.0.0 with full branding
5. `packages/dojolm-web/src/app/api/fixtures/route.ts` - Dynamic loading
6. `packages/dojolm-scanner/src/types.ts` - Extended types for branding

### Key Learnings

1. **Manifest Bug**: Original manifest script detected product from filename, not content
2. **Fix Applied**: Added `detectProduct()` function that reads file content
3. **Distribution Strategy**: Some categories semanticallly map to specific products:
   - `search-results/` → PantheonLM (OSINT focus)
   - `malformed/` → Basileak (data leak testing)
   - `social/` → BonkLM (social engineering defense)
   - `cognitive/` → Marfaak (agent psychology)

## Next Actions

1. ~~**User**: Confirm product colors (Basileak, PantheonLM, Marfaak)~~ ✅ Confirmed
2. ~~**User**: Provide any missing assets~~ ✅ All available
3. ~~**Create**: Generation script~~ ✅ Created
4. ~~**Execute**: Generate all fixtures~~ ✅ 643 generated
5. ~~**Validate**: Test loading via API~~ ✅ Working
6. ~~**Deploy**: Copy to fixtures directory~~ ✅ Deployed

**Plan Status**: ✅ COMPLETE
