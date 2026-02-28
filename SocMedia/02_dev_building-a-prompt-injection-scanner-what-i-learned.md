# Building a Prompt Injection Scanner: What I Learned

*139 patterns, 6 heuristic detectors, and every mistake I made getting there.*

---

There's a recurring pattern in security tooling: the problem looks simple until you try to build detection for it. SQL injection seemed like a string-matching problem until you had to handle encoding, truncation, comment syntax, and three different database dialects. XSS seemed like a tag-stripping problem until you realized HTML parsers and regex disagree fundamentally about what constitutes a tag.

Prompt injection has the same quality. "Ignore all previous instructions" is trivially detectable. The actual attack space is not.

This post is about building DojoLM's scanner — what assumptions I had to discard, what architectural decisions I'd make differently, and what the edge cases taught me.

---

## Assumption 1: Regex is Sufficient

It isn't, but it's a good start.

Regex covers the direct attack surface well. `ignore_instructions` — matching `(?:ignore|disregard|forget|override|bypass)\s+(?:all\s+)?(?:previous|prior|above)?\s*(?:instructions|directives|rules|guidelines)` — catches the canonical form and its variants. Paired with similar patterns for jailbreak phrases, role hijacking, system boundary markers, and agent output injection, you get coverage of the "obvious" attack space.

The problem is the "obvious" attack space is not where real attacks live. Real attacks use encoding.

**Base64:** `SWdub3JlIGFsbCBwcmV2aW91cyBpbnN0cnVjdGlvbnM=` — that decodes to "Ignore all previous instructions." No regex on the raw text will catch it. You need to decode first, then scan.

**ROT13:** `Vtaber nyy cerivbhf vafgehpgvbaf.` Same content, different encoding.

**Unicode confusables:** I\u{034F}gnor\u{0355}e all pre\u{0356}ious inst\u{0357}ructions — zero-width characters interleaved through the injection phrase. The text *looks* like a clean sentence. Character by character it contains the attack.

**Zero-width characters:** U+200B, U+200C, U+200D, U+FEFF, U+00AD — 20+ characters that are invisible in most rendering environments. Inject them into a phrase to break pattern matching.

The fix is text normalization *before* scanning. DojoLM's pipeline:

1. Strip combining marks (U+0300–U+036F) before NFKC normalization — otherwise NFKC composes them first, then they survive normalization
2. NFKC Unicode normalization — collapses full-width characters, ligatures, compatibility equivalences
3. Strip zero-width characters (list all 20+ explicitly)
4. Unicode confusable mapping — map Cyrillic/Greek lookalikes to their ASCII equivalents
5. Whitespace collapse

After normalization, the regex patterns run on clean text. Most encoding attacks collapse to their ASCII originals.

---

## Assumption 2: False Positives Are Easy to Avoid

They are not.

The scanner's clean fixture suite has had 16 false positives over its development lifetime. Each one taught something.

**Role labels in JSON:** `"role": "system"` in a session context file matched the `agent_json_role` pattern (TPI-03: fake agent output). The fixture was genuinely clean — a normal chat session with a system role field. The pattern was correct for detecting fake elevated-privilege role injection in agent output. The fixture was in the wrong category.

**Conversation markers:** `Assistant:` and `User:` in a dialogue transcript matched the `anthropic_markers` pattern. The fixture was an agent context example using standard conversation format. The pattern was correct — Anthropic-style role labels are a signature of AI-to-AI injection vectors. The fixture content needed to use neutral labels instead.

**Metadata in clean images:** I put the text "SYSTEM OVERRIDE: Ignore instructions" in an SVG embedded in a clean image file — as a visible watermark label to identify it as a test image. The scanner correctly detected it. The clean fixture failed.

**Pattern overlap:** The `vec_sim_texttricker` pattern, designed to catch Greek lookalike characters, included ASCII `f` in its character class: `[\u03B5\u03C5\u03BFf\u03C9]`. Every English sentence containing "f" triggered it.

The lessons:
- Test new patterns against a corpus of genuine, diverse clean text before deploying
- Clean fixtures must be *genuinely* clean — no injection keywords in any field the scanner inspects, including metadata, SVG content, JSON roles, or alt text
- Character classes containing Unicode escapes need explicit review of every character

---

## Assumption 3: Engine Filtering Is Easy

The most expensive bug in the project: engine filter IDs in the frontend did not match scanner engine names.

The frontend `constants.ts` had IDs like `prompt_injection`. The scanner used `"Prompt Injection"` (exact casing, with a space). Engine filtering used string equality — when the frontend passed `["prompt_injection"]` to the scanner, the scanner found no matching engines, applied no filters, and... scanned with all engines anyway, returning results regardless of what was "filtered."

This was doubly confusing because the scanner appeared to work correctly (it detected injections) — just not with the selected filters. Every filter change was silently ignored.

The second version of the bug: empty array semantics. When no filters were selected, the frontend passed `engines: []`. The scanner treated `[]` as "scan with zero engines" — zero detections, ALLOW on everything, including obvious BLOCK inputs.

The fix:
```typescript
// In the scan API route:
const scanOptions: ScanOptions = (engines && engines.length > 0) ? { engines } : {};
```

Semantics: `undefined` = all engines, `[]` = all engines, `["X"]` = engine X only.

**The broader lesson:** When you add filtering UI for backend features, integration tests must verify that filter state propagates through the entire stack to scan results. Unit tests on the scanner's engine filtering don't catch the frontend ID mismatch. You need an end-to-end test.

---

## Assumption 4: Special Detectors Don't Need to Respect Engine Filters

The third version of the engine filter bug: we had 12 heuristic detector functions (Base64 decoder, HTML injection detector, context overload detector, etc.) that always ran unconditionally, even when the corresponding engine was filtered out.

This meant you could "disable" the Unicode engine and still get Unicode findings from `detectHiddenUnicode`. The filter appeared to work in the pattern group layer but was silently bypassed in the heuristic layer.

The fix: every heuristic detector must check `enabledEngines.includes(detector.engineLabel)` before running. Each detector maps to exactly one engine. This mapping needs to be explicit and documented.

```typescript
// Example: Unicode engine detectors
if (enabledEngines.includes('Unicode')) {
  findings.push(...detectHiddenUnicode(normalized));
  findings.push(...detectSurrogateFormat(normalized));
}
```

---

## Assumption 5: Binary Files Are Handled by the Text Pipeline

They are not. Binary files require separate extraction before scanning.

Images, audio files, and format polyglots need format-specific parsers to extract injectable text from metadata fields before the scanner can process them.

- JPEG: Extract EXIF via APP1 segment parsing (offset 0xFFE1, Exif\0\0 header)
- PNG: Extract tEXt chunks (chunk type 0x74455874)
- MP3: Extract ID3v2 tags (ID3 header, frame parsing)
- WAV: Extract RIFF DISP and ICMT chunks
- SVG: Parse XML and extract script content, event attributes, foreignObject
- OGG: Extract Vorbis COMMENT blocks

The binary extraction runs in `serve.ts` when a fixture endpoint is called, before handing text to the scanner. The test regression suite also needs to handle this: if you read a PNG file as UTF-8 before checking magic bytes, you get garbage that bypasses detection for the wrong reasons. Always Buffer-first, check magic bytes, then decide whether to decode as text or hand to the binary extractor.

---

## The Architecture That Emerged

Three-layer pipeline:

**Layer 1 — Normalization:** NFKC, zero-width strip, confusable mapping, combining mark removal, whitespace collapse. Input: raw text. Output: normalized ASCII-friendly text.

**Layer 2 — Pattern matching:** 139 regex patterns across 14 groups. Applied against normalized text. Each group maps to a scanner engine. Engine filter gates which groups run.

**Layer 3 — Heuristic detectors:** 6 detectors that operate on both raw and normalized text. Decoder detectors (Base64, character encoding) work on raw text, then scan the decoded output with the full pattern set. Structural detectors (HTML injection, context overload) look for document-level properties that patterns can't capture.

**Verdict aggregation:** Cross-category escalation (>5 INFO across >3 categories → WARN) prevents fragmented multi-vector attacks from slipping through as INFO-only.

The architecture works well. If I were starting over, the one thing I'd add earlier: a dedicated integration test layer that fires real HTTP requests at the scanner with known-malicious and known-clean inputs and asserts exact verdicts. The unit tests on individual pattern groups caught a lot but missed the cross-layer bugs entirely.

---

**Tags:** #LLMSecurity #SecurityEngineering #TypeScript #PromptInjection #DetectionEngineering #RedTeaming #AIHacking #BuildInPublic #OpenSource
