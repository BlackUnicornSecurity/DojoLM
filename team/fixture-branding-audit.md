# BlackUnicorn Fixture Branding Audit Report

**Date:** 2026-02-28
**Status:** ✅ **COMPLETE - 100% BRANDING ACHIEVED**
**Audited:** `/packages/bu-tpi/fixtures/`

## Executive Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total text-based fixtures** | 1,004 | 100% |
| **Fixtures with BlackUnicorn branding** | 1,004 | **100.0%** ✅ |
| **Fixtures WITHOUT branding** | 0 | **0%** |

## Pre/Post Comparison

| Metric | Before | After |
|--------|--------|-------|
| Branded Fixtures | 262 (26.1%) | 1,004 (100%) |
| Unbranded Fixtures | 743 (73.9%) | 0 (0%) |

## Actions Taken

1. **Created branding helper module** ([`src/branding-helpers.ts`](../packages/bu-tpi/src/branding-helpers.ts))
   - Functions: `brandAttack()`, `brandClean()`, `brandHTML()`, `brandCode()`
   - Brand mapping for all product categories

2. **Created fixture rebranding script** ([`tools/rebrand-fixtures.ts`](../packages/bu-tpi/tools/rebrand-fixtures.ts))
   - Automated branding for all existing fixtures
   - Category-based brand assignment (DojoLM, BonkLM, Basileak, PantheonLM, Marfaak)

3. **Updated main generator** ([`src/generate-fixtures.ts`](../packages/bu-tpi/src/generate-fixtures.ts))
   - Added branding helpers for future fixture generation

## Branding Standard

Fixtures now follow these patterns:

**Attack/Malicious fixtures:**
```markdown
# BlackUnicorn AI Security - <Test Name>

**WARNING: This payload tests <attack type>.**
...
```

**Clean/Benign fixtures:**
```markdown
BlackUnicorn - "Evidence over vibes. Always."

No injection attempts. Valid content for testing.
...
```

**Product-branded fixtures:**
```markdown
# DojoLM AI Security - <Test Name>
# BonkLM AI Security - <Test Name>
# Basileak AI Security - <Test Name>
# PantheonLM AI Security - <Test Name>
# Marfaak AI Security - <Test Name>
```

## Final Category Breakdown

| Category | Total | Branded | % Branded | Assigned Brand |
|----------|-------|---------|-----------|----------------|
| agent | 72 | 72 | 100% | Marfaak |
| agent-output | 33 | 33 | 100% | Marfaak |
| bias | 35 | 35 | 100% | PantheonLM |
| boundary | 41 | 41 | 100% | DojoLM |
| code | 44 | 44 | 100% | DojoLM |
| cognitive | 52 | 52 | 100% | Marfaak |
| context | 35 | 35 | 100% | DojoLM |
| delivery-vectors | 50 | 50 | 100% | BonkLM |
| dos | 54 | 54 | 100% | Basileak |
| encoded | 39 | 39 | 100% | DojoLM |
| environmental | 15 | 15 | 100% | BlackUnicorn |
| malformed | 30 | 30 | 100% | Basileak |
| model-theft | 54 | 54 | 100% | Basileak |
| multimodal | 59 | 59 | 100% | DojoLM |
| or | 42 | 42 | 100% | PantheonLM |
| output | 54 | 54 | 100% | Marfaak |
| search-results | 35 | 35 | 100% | PantheonLM |
| session | 34 | 34 | 100% | Marfaak |
| social | 35 | 35 | 100% | BonkLM |
| supply-chain | 54 | 54 | 100% | BonkLM |
| untrusted-sources | 45 | 45 | 100% | BonkLM |
| vec | 45 | 45 | 100% | PantheonLM |
| web | 47 | 47 | 100% | DojoLM |

## Brand Assets Used

Taglines sourced from `team/branding/assets/`:
- **BlackUnicorn**: 105 taglines
- **DojoLM**: 79 taglines
- **BonkLM**: 62 taglines
- **Basileak**: 62 taglines
- **PantheonLM**: 82 taglines
- **Marfaak**: 83 taglines

## Binary Fixtures

Binary fixtures cannot contain text branding:
- **Image fixtures:** 57 files (PNG, JPG, SVG, WebP)
- **Audio fixtures:** 31 files (MP3, WAV, OGG, FLAC, M4A)
- **Other binary:** 11 files (CSS, SH, PHP, GIF, archives)

These are generated programmatically via `src/generate-fixtures.ts` with branded metadata where applicable.

## Media Per Fixture Matrix

The branding uses **text-based taglines** from `team/branding/assets/` for text fixtures. Binary fixtures use **brand-colored placeholders**.

### Text Fixtures → Tagline Files

| Fixture Category | Brand Used | Tagline Source |
|------------------|------------|----------------|
| environmental | BlackUnicorn | `team/branding/assets/blackunicorn/unprocessed/tagline` (105 taglines) |
| vec | PantheonLM | `team/branding/assets/pantheonlm/unprocessed/pantheon text` (82 taglines) |
| dos | Basileak | `team/branding/assets/basileak/unprocessed/tagline` (62 taglines) |
| agent | Marfaak | `team/branding/assets/marfaak/unprocessed/marfaak file` (83 taglines) |
| agent-output | Marfaak | `team/branding/assets/marfaak/unprocessed/marfaak file` (83 taglines) |
| output | Marfaak | `team/branding/assets/marfaak/unprocessed/marfaak file` (83 taglines) |
| model-theft | Basileak | `team/branding/assets/basileak/unprocessed/tagline` (62 taglines) |
| bias | PantheonLM | `team/branding/assets/pantheonlm/unprocessed/pantheon text` (82 taglines) |
| boundary | DojoLM | `team/branding/assets/dojolm/unprocessed/dojo text` (79 taglines) |
| supply-chain | BonkLM | `team/branding/assets/bonklm/unprocessed/BonkLM` (62 taglines) |
| code | DojoLM | `team/branding/assets/dojolm/unprocessed/dojo text` (79 taglines) |
| encoded | DojoLM | `team/branding/assets/dojolm/unprocessed/dojo text` (79 taglines) |
| context | DojoLM | `team/branding/assets/dojolm/unprocessed/dojo text` (79 taglines) |
| delivery-vectors | BonkLM | `team/branding/assets/bonklm/unprocessed/BonkLM` (62 taglines) |
| multimodal | DojoLM | `team/branding/assets/dojolm/unprocessed/dojo text` (79 taglines) |
| or | PantheonLM | `team/branding/assets/pantheonlm/unprocessed/pantheon text` (82 taglines) |
| search-results | PantheonLM | `team/branding/assets/pantheonlm/unprocessed/pantheon text` (82 taglines) |
| session | Marfaak | `team/branding/assets/marfaak/unprocessed/marfaak file` (83 taglines) |
| social | BonkLM | `team/branding/assets/bonklm/unprocessed/BonkLM` (62 taglines) |
| untrusted-sources | BonkLM | `team/branding/assets/bonklm/unprocessed/BonkLM` (62 taglines) |
| web | DojoLM | `team/branding/assets/dojolm/unprocessed/dojo text` (79 taglines) |

### Visual Assets Available (Not Used in Text Fixtures)

The following **visual media assets** are available in `team/branding/assets/` for future use:

| Brand | Available Assets | Path |
|-------|------------------|------|
| BlackUnicorn | Logo (PNG, SVG, JPG), Banner, Background, Website screenshot | `team/branding/assets/blackunicorn/unprocessed/` |
| DojoLM | Logo variants (with/without text), Unicorn cut graphics | `team/branding/assets/dojolm/unprocessed/` |
| BonkLM | Logo variants, Bat character graphics, Animated videos | `team/branding/assets/bonklm/unprocessed/` |
| Basileak | Logo variants (with/without text) | `team/branding/assets/basileak/unprocessed/` |
| PantheonLM | Logo variants (with/without text) | `team/branding/assets/pantheonlm/unprocessed/` |
| Marfaak | Logo variant (no text) | `team/branding/assets/marfaak/unprocessed/` |

### Audio Assets Available (Not Used in Text Fixtures)

| Brand | Audio Assets | Path |
|-------|--------------|------|
| BlackUnicorn | 10 MP3 audio files (brand voiceovers) | `team/branding/assets/blackunicorn/unprocessed/*.mp3` |
| DojoLM | 10 MP3 audio files | `team/branding/assets/dojolm/unprocessed/*.mp3` |
| BonkLM | 10 MP3 files + 4 MP4 videos | `team/branding/assets/bonklm/unprocessed/*.mp3` |
| Basileak | 10 MP3 audio files | `team/branding/assets/basileak/unprocessed/*.mp3` |
| PantheonLM | 10 MP3 audio files + 1 MP4 video | `team/branding/assets/pantheonlm/unprocessed/*.mp3` |
| Marfaak | 10 MP3 audio files + 1 MP4 video | `team/branding/assets/marfaak/unprocessed/*.mp3` |

**Note:** Binary fixtures (images, audio) use programmatic generation in `generate-fixtures.ts`. Visual and audio branding assets are available for future enhancement of binary fixtures.

## Recommendations

1. ✅ **COMPLETED:** Add branding to all text-based fixtures
2. ✅ **COMPLETED:** Update `generate-fixtures.ts` with branding helpers
3. **Future:** When adding new fixtures, use the branding helpers from `src/branding-helpers.ts`
4. **Future:** Consider embedding visual/audio assets into binary fixtures (images, audio files) for enhanced branding
5. **Future:** Use logo assets for watermarking in image fixtures where format permits
