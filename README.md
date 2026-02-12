# BU-TPI — TPI Security Test Lab

Browser-based security testing tool for **Taxonomy of Prompt Injection (TPI)** attacks, based on the CrowdStrike taxonomy.

## What This Is

A standalone test lab providing:

- **Live Scanner** — 85+ regex patterns across 9 detection groups to scan arbitrary text for prompt injection indicators
- **Fixture Server** — 39 pre-built attack artifacts (binary + text) across 6 categories
- **Test Payloads** — Curated injection payloads organized by TPI story
- **Coverage Map** — Maps TPI stories to implemented scanner patterns and fixtures
- **Pattern Reference** — Full documentation of all detection patterns

## Quick Start

```bash
# Generate fixture files (binary artifacts: JPEG, PNG, MP3, WAV, SVG, polyglots)
npm run generate

# Start the local server
npm start

# Open http://localhost:8089 in your browser
```

## Fixture Categories

| Category | Files | Description |
|----------|-------|-------------|
| images | 11 | JPEG EXIF injection, PNG tEXt chunks, SVG script/event/foreignObject attacks |
| audio | 5 | MP3 ID3v2 tag injection, WAV RIFF INFO injection |
| web | 7 | HTML comment/hidden-text/meta/data-attr/link/multilingual injection |
| context | 5 | Memory file, agent def, config, CLAUDE.md with hidden overrides |
| malformed | 5 | Format mismatches, polyglots (ELF-as-PNG, PE-as-JPG) |
| encoded | 6 | ROT13, reverse text, double base64, acrostic, math encoding, fragmented |

## API Endpoints

- `GET /` — Test lab UI
- `GET /api/fixtures` — Fixture manifest (JSON)
- `GET /api/read-fixture?path=<category>/<file>` — Read fixture content (text or binary metadata)
- `GET /fixtures/<category>/<file>` — Direct fixture file access

## TPI Story Coverage

See [TPI-TESTLAB-GAP-FILL.md](TPI-TESTLAB-GAP-FILL.md) for the full gap analysis mapping 26 TPI stories to current lab coverage.

## Related

This test lab is a testing resource referenced by the BMAD-CYBERSEC project's security assessment plan. The implementation of actual prompt injection defenses (hooks, validators, PostToolUse guards) lives in that project.
