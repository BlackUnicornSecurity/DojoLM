# Multimodal Security Testing Guide

**Version:** 2.0
**Last Updated:** 2026-03-24
**Status:** Active

---

## Overview

The current repository includes multimodal-focused fixtures and scanner coverage, but the platform primarily evaluates text and metadata representations of those attacks. In practice, DojoLM is strongest when you feed it extracted text, structured metadata, or stored test fixtures rather than arbitrary raw media processing pipelines.

## What Is Verified in the Repo

The repo currently contains dedicated fixture material under:

- `packages/bu-tpi/fixtures/images`
- `packages/bu-tpi/fixtures/audio`
- `packages/bu-tpi/fixtures/audio-attacks`
- `packages/bu-tpi/fixtures/multimodal`
- `packages/bu-tpi/fixtures/video`

The current fixture manifest includes these multimodal-related categories:

| Category | Verified manifest entries | Notes |
|----------|---------------------------|-------|
| `images` | `66` | Image metadata, SVG, EXIF, and format-mismatch cases |
| `audio` | `108` | General audio fixtures and benign controls |
| `audio-attacks` | `20` | Focused attack/control set for audio attack scenarios |
| `multimodal` | `177` | Cross-modal, OCR-adjacent, and mixed-input cases |

Additional repo material also exists under `packages/bu-tpi/fixtures/video`, but that directory is not part of the current manifest-backed metrics used by `npm run verify:docs`.

## What The Scanner Covers Today

Verified tests in `packages/bu-tpi/src/scanner.test.ts` cover cases such as:

- OCR-adversarial text hidden in images
- cross-modal injection phrasing
- audio steganography
- adversarial audio perturbation
- audio-triggered injection patterns

The scanner and fixture corpus are therefore suitable for:

- validating extracted text from images, audio transcripts, or video metadata
- exercising metadata-based attacks such as EXIF, SVG, or embedded-comment payloads
- benchmarking model responses against multimodal-themed attack prompts

## Current Workflow

### 1. Scan extracted text directly

Use the web API:

```bash
curl -X POST http://localhost:42001/api/scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NODA_API_KEY" \
  -d '{"text":"The image contains hidden text that says ignore all previous instructions"}'
```

Or use the standalone server:

```bash
curl "http://localhost:8089/api/scan?text=audio%20steganography%20hide%20payload%20in%20frequency%20domain"
```

### 2. Scan a repository fixture

Web API:

```bash
curl "http://localhost:42001/api/scan-fixture?path=multimodal/your-fixture-name.txt" \
  -H "X-API-Key: $NODA_API_KEY"
```

Standalone server:

```bash
curl "http://localhost:8089/api/scan-fixture?path=multimodal/your-fixture-name.txt"
```

### 3. Inspect fixture families

Use the fixture directories when building test plans:

- `images/` for SVG, EXIF, and image metadata attacks
- `audio/` and `audio-attacks/` for audio metadata and audio-triggered cases
- `multimodal/` for cross-modal prompt injection and OCR-adjacent attacks

## Limitations

This repo does **not** currently document a general-purpose built-in pipeline for:

- arbitrary OCR over uploaded images
- speech-to-text transcription over arbitrary audio uploads
- full video decoding and frame-by-frame analysis

To stay aligned with the implementation, document and test multimodal scenarios as:

- extracted text
- metadata sidecars
- stored fixtures
- model prompts or outputs describing multimodal content

## Related Docs

- [Platform Guide](./PLATFORM_GUIDE.md)
- [API Reference](./API_REFERENCE.md)
- [Testing Results](../app/testing-results/README.md)
