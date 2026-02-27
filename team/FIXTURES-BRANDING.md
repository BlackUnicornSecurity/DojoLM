# Fixtures Branding Plan - BlackUnicorn

**Status**: Planning
**Created**: 2026-02-26
**Owner**: BlackUnicorn Team

---

## Executive Summary

Brand all 219 security test fixtures across 16 categories with BlackUnicorn company and product branding (DojoLM, BonkLM, etc.).

**Key Principle**: Fixtures should look like authentic BlackUnicorn product content while maintaining their security testing purpose.

---

## Brand Hierarchy

```
BlackUnicorn (Company)
├── Colors: Blue/Black
├── Website: blackunicorn.tech
│
├── DojoLM (Product)
│   ├── Color: Red
│   └── Focus: AI Security Testing
│
├── BonkLM (Product)
│   ├── Color: Yellow
│   └── Focus: [TBD]
│
└── Other Products
    └── [Each with unique color]
```

---

## Folder Structure

```
team/branding/
├── assets/
│   ├── company/           # BlackUnicorn company assets
│   │   ├── logo.png       # Main logo (512x512+)
│   │   ├── logo.svg       # Vector logo
│   │   ├── favicon.ico    # 32x32 favicon
│   │   ├── watermark.png  # Semi-transparent for overlay
│   │   ├── audio-intro.mp3  # 2-3 sec audio stinger
│   │   └── brand-config.json # Company colors, fonts
│   │
│   ├── dojolm/            # DojoLM-specific assets (RED)
│   │   ├── logo.png
│   │   ├── logo.svg
│   │   ├── product-color.json
│   │   └── [product-specific media]
│   │
│   ├── bonklm/            # BonkLM-specific assets (YELLOW)
│   │   ├── logo.png
│   │   ├── logo.svg
│   │   ├── product-color.json
│   │   └── [product-specific media]
│   │
│   └── other/             # Future products
│
├── FIXTURES-BRANDING.md   # This document
└── conversion-script.ts   # Media conversion automation
```

---

## Fixture Categories & Branding Requirements

### Summary Table

| Category | Files | Primary Media | Branding Type |
|----------|-------|---------------|---------------|
| `images/` | 12 | JPG, PNG, SVG, WebP | Visual watermark + metadata |
| `audio/` | 6 | MP3, WAV, OGG | Audio intro + ID3/RIFF tags |
| `web/` | 15 | HTML | Favicon, logo, styled elements |
| `context/` | 7 | MD, YAML | Text content with company refs |
| `malformed/` | 6 | Mixed | Format-specific |
| `encoded/` | 39 | TXT, JSON, XML, YAML, SQL, CSV | Text content branding |
| `agent-output/` | 6 | MD | Fake AI responses with branding |
| `search-results/` | 4 | JSON | Branded search results |
| `social/` | 18 | TXT | Social engineering scenarios |
| `code/` | 10 | PY, JS | Code comments with branding |
| `boundary/` | 5 | TXT | Boundary testing content |
| `untrusted-sources/` | 4 | JSON | Source attribution |
| `cognitive/` | 39 | TXT | Psychological scenarios |
| `delivery-vectors/` | 25 | TXT | Delivery mechanism content |
| `multimodal/` | 18 | TXT | Multimodal attack descriptions |
| `session/` | 4 | JSON | Multi-turn conversations |

**Total: 219 files**

---

## Detailed Branding by Category

### 1. Images (12 files)

| File | Format | Branding Action |
|------|--------|-----------------|
| `exif-injection.jpg` | JPEG | BlackUnicorn watermark + EXIF injection payload |
| `exif-subtle.jpg` | JPEG | Corner watermark with subtle injection |
| `clean-photo.jpg` | JPEG | Clean BlackUnicorn branded photo |
| `text-chunk-injection.png` | PNG | Logo + tEXt chunk with injection |
| `text-chunk-synonym.png` | PNG | Logo + synonym injection |
| `clean-image.png` | PNG | Clean branded image |
| `svg-script-injection.svg` | SVG | BlackUnicorn SVG with script injection |
| `svg-event-handlers.svg` | SVG | Branded SVG with malicious event handlers |
| `svg-foreign-object.svg` | SVG | Foreign object injection in branded SVG |
| `svg-text-injection.svg` | SVG | Near-invisible text injection |
| `clean-diagram.svg` | SVG | Clean BlackUnicorn diagram |
| `webp-metadata-injection.webp` | WebP | Branded WebP with metadata injection |

**Assets needed**: Logo PNG/SVG, watermark PNG

---

### 2. Audio (6 files)

| File | Format | Branding Action |
|------|--------|-----------------|
| `id3-injection.mp3` | MP3 | BlackUnicorn intro audio + ID3 injection |
| `id3-subtle.mp3` | MP3 | Subtle branding + hidden injection |
| `clean-audio.mp3` | MP3 | Clean branded audio |
| `riff-injection.wav` | WAV | Branded WAV + RIFF INFO injection |
| `clean-audio.wav` | WAV | Clean branded WAV |
| `ogg-vorbis-injection.ogg` | OGG | Branded OGG + comment injection |

**Assets needed**: 2-3 sec audio stinger (MP3/WAV source)

---

### 3. Web Pages (15 files)

All HTML files receive:
- BlackUnicorn favicon
- Logo in header/footer
- Branded color scheme (product-specific)
- Meta descriptions with company references

| Files | Branding |
|-------|----------|
| `comment-injection.html` | HTML comments with branded content |
| `hidden-text-injection.html` | CSS hidden branded text |
| `meta-injection.html` | Meta tag injection |
| `data-attr-injection.html` | Data attributes with payloads |
| `markdown-link-injection.html` | Markdown link injection |
| `iframe-injection.html` | Iframe with branded content |
| `aria-label-injection.html` | ARIA labels with branding |
| `multilingual-injection.html` | Multilingual branded injection |
| `multilingual-*.html` (4 files) | Various language injections |
| `clean-*.html` (2 files) | Clean branded pages |
| `multilingual-romanized.txt` | Romanized text injection |

**Assets needed**: Favicon, logo SVG, color hex codes

---

### 4. Context Files (7 files)

| File | Branding |
|------|----------|
| `injected-memory.md` | BlackUnicorn conversation memory injection |
| `injected-agent.md` | Agent system prompt with company refs |
| `injected-config.yaml` | YAML config with branded settings |
| `injected-claude-md.md` | CLAUDE.md injection for BlackUnicorn |
| `clean-memory.md` | Clean branded memory |
| `attack-settings-edit.md` | Settings file edit with branding |
| `attack-settings-traversal.md` | Path traversal in branded settings |

---

### 5. Encoded Files (39 files)

All encoding attack files use BlackUnicorn-themed payloads:
- ROT13, ROT47, Base64 encoded branded messages
- Synonym attacks using "BlackUnicorn" variations
- Mathematical encodings with company refs
- Fragmented attacks spelling brand name

**Key files**: `surrogate-*.json/xml/yaml/sql/csv`, `synonym-*.txt`, `*-payload.txt`

---

### 6. Agent Output (6 files)

| File | Branding |
|------|----------|
| `fake-tool-call.md` | Fake BlackUnicorn tool call |
| `xml-tag-injection.md` | XML with branded tags |
| `json-instruction-injection.md` | JSON branded instructions |
| `privilege-escalation.md` | Escalation to BlackUnicorn admin |
| `self-referential-loop.md` | Loop with branded refs |
| `clean-agent-output.md` | Clean branded output |

---

### 7. Search Results (4 files)

| File | Branding |
|------|----------|
| `seo-poisoned-results.json` | BlackUnicorn SEO poisoning |
| `malicious-url-results.json` | blackunicorn.tech malicious URLs |
| `snippet-injection-results.json` | Branded snippet injection |
| `clean-search-results.json` | Clean branded results |

---

### 8. Social Engineering (18 files)

All scenarios reference BlackUnicorn:
- Fake IT Department spoofing
- Authority impersonation
- Phishing with blackunicorn.tech

**Key themes**: Corporate impersonation, executive spoofing

---

### 9. Code Files (10 files)

| Files | Branding |
|-------|----------|
| `python-exec-injection.py` | BlackUnicorn-themed exec injection |
| `eval-injection.js` | JS eval with company refs |
| `sql-injection.txt` | SQL with BlackUnicorn data |
| `code-comment-injection.py` | Comment injection with branding |
| `docstring-injection.py` | Docstring with branded content |
| `clean-*.py/js` | Clean branded code |

---

### 10-16. Remaining Categories

**Cognitive (39)**: Persona attacks using BlackUnicorn executives/experts
**Delivery Vectors (25)**: Branded delivery mechanisms
**Multimodal (18)**: Cross-modal attacks with branding
**Session (4)**: Multi-turn branded conversations
**Boundary (5)**: Unicode attacks with brand tokens
**Untrusted Sources (4)**: Source attribution to BlackUnicorn
**Malformed (6)**: Format mismatches with branded headers

---

## Brand Configuration Schema

### `brand-config.json`

```json
{
  "company": {
    "name": "BlackUnicorn",
    "website": "blackunicorn.tech",
    "colors": {
      "primary": "#000000",
      "secondary": "#0066CC",
      "accent": "#00AAFF"
    },
    "tagline": "AI Security Testing Platform"
  },
  "products": {
    "dojolm": {
      "name": "DojoLM",
      "color": "#E63946",
      "focus": "LLM Security Testing"
    },
    "bonklm": {
      "name": "BonkLM",
      "color": "#FFD700",
      "focus": "Performance Testing"
    }
  }
}
```

---

## Media Conversion Capabilities

### Supported Conversions

**Images:**
- JPG ↔ PNG ↔ WebP ↔ AVIF ↔ GIF
- Resize, crop, watermark overlay
- SVG generation (bitmap tracing)

**Audio:**
- MP3 ↔ WAV ↔ OGG ↔ FLAC ↔ M4A
- Trim, fade, normalize
- Add intros/outros

**Video:**
- MP4 ↔ WebM ↔ AVI ↔ MOV
- Extract frames, add overlays

### Conversion Tools Used

- **ImageMagick**: Image conversion and manipulation
- **FFmpeg**: Audio/video processing
- **Node.js libraries**: Sharp, fluent-ffmpeg

---

## Implementation Phases

### Phase 1: Asset Collection
- [ ] User provides source logos (PNG/SVG)
- [ ] User provides audio stinger
- [ ] User provides brand colors
- [ ] Place all assets in `team/branding/assets/`

### Phase 2: Asset Processing
- [ ] Convert logo to all required formats
- [ ] Generate watermark variants
- [ ] Create favicon
- [ ] Convert audio to MP3/WAV/OGG
- [ ] Generate color palettes

### Phase 3: Fixture Generation
- [ ] Update `generate-fixtures.ts` with branding
- [ ] Add branded content templates
- [ ] Regenerate image fixtures
- [ ] Regenerate audio fixtures
- [ ] Regenerate web fixtures
- [ ] Regenerate text-based fixtures

### Phase 4: Validation
- [ ] Verify all fixtures have branding
- [ ] Test fixture loading via API
- [ ] Update manifest.json metadata
- [ ] QA review of branded content

### Phase 5: Documentation
- [ ] Update fixture documentation
- [ ] Create brand usage guidelines
- [ ] Update README with branding info

---

## Content Themes

### AI Security Themes
- "BlackUnicorn AI Guard"
- "Enterprise LLM Protection"
- "Red Team Automation"
- "Adversarial Testing Suite"

### Cybersecurity Themes
- "BlackUnicorn Threat Intelligence"
- "Penetration Testing Platform"
- "Security Research Labs"
- "Vulnerability Assessment"

### Product-Specific Themes
- **DojoLM**: "Martial Arts for LLM Security"
- **BonkLM**: "Stress Testing AI Systems"

---

## Naming Conventions

Branded fixtures follow existing naming but include BlackUnicorn context in content:

```
exif-injection.jpg         # File name unchanged
├── EXIF Description: "BlackUnicorn Security Test - IGNORE PREVIOUS"

social/fake-it-dept.txt    # File name unchanged
├── Content: "This is BlackUnicorn IT Department..."
```

---

## Success Criteria

1. **All 219 fixtures** incorporate BlackUnicorn branding
2. **Product differentiation** visible (DojoLM red, BonkLM yellow)
3. **Clean fixtures** remain authentic-looking
4. **Attack fixtures** clearly branded as test content
5. **Manifest updated** with branded metadata
6. **No broken references** after regeneration

---

## Next Steps

1. **User**: Provide source assets in `team/branding/assets/`
2. **Create**: Conversion script for media processing
3. **Update**: `generate-fixtures.ts` with branding logic
4. **Regenerate**: All fixtures with new branding
5. **Test**: API loading of branded fixtures
6. **Document**: Final branding decisions

---

## Notes

- Fixtures are **generated once** and committed to repo
- No runtime generation during app install
- All branding must be embed in fixture files themselves
- Keep malicious fixtures clearly identifiable as test content
- Maintain security testing value while adding authenticity
