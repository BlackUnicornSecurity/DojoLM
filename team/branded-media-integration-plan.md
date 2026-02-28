# Branded Media Assets Integration Plan

**Date:** 2026-02-28
**Status:** Proposed

## Available Branded Media Assets

| Brand | MP3 Audio | MP4 Video | Images | Total |
|-------|-----------|-----------|--------|-------|
| **BlackUnicorn** | 10 files | 0 | 5 | 15 |
| **DojoLM** | 8 files | 3 | 2 | 13 |
| **BonkLM** | 5 files | 4 | 2 | 11 |
| **Basileak** | 9 files | 1 | 2 | 12 |
| **PantheonLM** | 10 files | 1 | 3 | 14 |
| **Marfaak** | 7 files | 2 | 1 | 10 |
| **TOTAL** | **49 files** | **11 files** | **15** | **75** |

## Current State

### Current Fixtures
- **Audio fixtures**: 31 small programmatic files (~1-2KB each)
- **Video fixtures**: 7 text description files only (no actual videos)

### Branded Assets Available
- **MP3s**: 50-150KB each with AI voiceovers (Shadow_Eleven, Bright_Eleven)
- **MP4s**: 10-15MB each with branded animations
- **Images**: Logos, banners for watermarking

## Proposed Integration Strategy

### Option A: Direct Copy (Recommended for Video)
Copy branded media files as fixtures for multimodal testing:

```
fixtures/multimodal/branded-video-bonklm.mp4  (from BonkLM branding)
fixtures/multimodal/branded-video-dojolm.mp4   (from DojoLM branding)
fixtures/multimodal/branded-audio-blackunicorn.mp3  (from BlackUnicorn branding)
```

**Pros:** Real branded content for testing
**Cons:** Large file sizes (MP4s are 10-15MB each)

### Option B: Embed in Existing Fixtures
Add branded audio intros to existing generated fixtures:

```javascript
// In generate-fixtures.ts
function createMp3WithBrandedIntro(payload: string): Buffer {
  const brandedIntro = readFileSync('team/branding/assets/blackunicorn/unprocessed/BlackUnicorn_AI_security_for_p.mp3');
  return Buffer.concat([brandedIntro, createMp3Payload(payload)]);
}
```

**Pros:** Branded fixtures, reasonable size
**Cons:** Requires generator changes

### Option C: Reference in Text Descriptions
Add metadata pointing to branded assets:

```json
{
  "_branding": {
    "audio_intro": "team/branding/assets/blackunicorn/unprocessed/BlackUnicorn_AI_security_for_p.mp3",
    "video_demo": "team/branding/assets/bonklm/unprocessed/Animate_the_bat_smashing_data__.mp4"
  }
}
```

**Pros:** Small fixture size, reference to full media
**Cons:** Media not included in fixture scanning

## Recommended Implementation

### Phase 1: Add Branded Audio Fixtures (Low Priority)
Copy a subset of MP3s as test fixtures:

```bash
# Copy branded MP3s to fixtures/audio/
cp team/branding/assets/blackunicorn/unprocessed/*.mp3 fixtures/audio/branded-blackunicorn-*.mp3
cp team/branding/assets/dojolm/unprocessed/*.mp3 fixtures/audio/branded-dojolm-*.mp3
```

### Phase 2: Add Video Fixtures for Multimodal Testing (Medium Priority)
Copy MP4s for multimodal attack testing:

```bash
# Create fixtures/multimodal/branded/
cp team/branding/assets/bonklm/unprocessed/Animate_*.mp4 fixtures/multimodal/branded/
```

### Phase 3: Use Logos for Image Watermarking (Low Priority)
Embed logos in image fixtures where format permits (PNG, SVG).

## File Size Considerations

| Asset Type | Count | Avg Size | Total |
|------------|-------|----------|-------|
| MP3 Audio | 49 | ~100KB | ~5MB |
| MP4 Video | 11 | ~12MB | ~130MB |
| Images | 15 | ~50KB | ~750KB |
| **TOTAL** | **75** | | **~136MB** |

**Warning:** Adding all videos would increase fixture size by 130MB+.

## Recommendation

1. **Add MP3 fixtures** (5MB) - Worth it for audio metadata injection testing
2. **Skip MP4 fixtures** by default - Too large, add via opt-in flag
3. **Use logos for watermarking** image fixtures
4. **Reference branded assets** in fixture metadata instead of copying
