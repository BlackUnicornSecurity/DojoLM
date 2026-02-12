# TPI Test Lab — Gap Fill Working Document

> **Version**: 1.0.0
> **Created**: 2026-02-12
> **Purpose**: Track all gaps between TPI-CrowdStrike stories and current test lab coverage (scanner patterns + fixture files). Each gap has actionable items to close it.
> **Lab Location**: `tools/tpi-test-lab/`
> **Server**: `node serve.js` → <http://localhost:8089/>

---

## Status Legend

| Status | Meaning |
|--------|---------|
| FULL | Scanner patterns AND fixture files cover all story ACs |
| GOOD | Scanner OR fixtures cover most ACs, minor additions needed |
| PARTIAL | Some coverage exists but significant gaps remain |
| MISSING | Zero coverage — needs new scanner patterns AND/OR fixtures |
| N/A | Infrastructure story — not testable in browser lab |

---

## Gap Summary

| Priority | Count | Stories |
|----------|-------|---------|
| **P0** (blocking) | 4 | TPI-PRE-4, TPI-00, TPI-03, TPI-05 |
| **P1** (important) | 8 | TPI-02, TPI-06, TPI-07, TPI-08, TPI-09, TPI-11, TPI-14, TPI-21 |
| **P2** (enhance) | 5 | TPI-10, TPI-12, TPI-13, TPI-15, TPI-17 |
| **N/A** | 5 | TPI-PRE-1, TPI-PRE-2, TPI-PRE-3, TPI-01 (code-only), TPI-16 (temporal) |
| **FULL** | 4 | TPI-04, TPI-18, TPI-19, TPI-20 |

---

## Per-Story Gap Analysis

### Pre-TPI Prerequisites

#### TPI-PRE-1: Extract Shared Text Normalizer — N/A (code refactor)

No lab action needed. Pure code extraction (`normalizeText()` to `text-normalizer.ts`).

#### TPI-PRE-2: Session State File Rename — N/A (code refactor)

No lab action needed. File rename `.jailbreak_session.json` → `.session_security_state.json`.

#### TPI-PRE-3: Finding Base Interface — N/A (type system)

No lab action needed. TypeScript `Finding` interface definition.

#### TPI-PRE-4: Settings.json Write Protection — MISSING (P0)

- **Current coverage**: Zero
- **Story impact**: CRITICAL — single Write/Edit to settings.json disables ALL defenses
- **Scanner gap**: No scanner pattern exists for settings path detection
- **Fixture gap**: No fixture simulating settings.json attack payloads

**Actions to fill**:

- [ ] Add `context` fixture: `attack-settings-edit.md` — payload requesting Write to `.claude/settings.json`
- [ ] Add `context` fixture: `attack-settings-traversal.md` — path traversal variants (`../../../.claude/settings.json`, `~/.claude/settings.json`)
- [ ] Add scanner pattern: `SETTINGS_WRITE_ATTEMPT` — detects references to writing/editing settings.json
- [ ] Add PAYLOAD_CATALOG entry for settings.json write protection
- [ ] Update manifest.json with new fixtures

---

### Epic 0: Foundation & Type System

#### TPI-00: PostToolUse Hook Framework — N/A (infrastructure, P0 awareness)

No scanner/fixture action needed. This is the hook framework that enables E1-E5.
However, once built, the lab could add a "PostToolUse Simulator" tab for testing output validation.

**Future enhancement** (after TPI-00 is implemented):

- [ ] Add "PostToolUse Simulator" tab — paste tool output JSON, select tool type (WebFetch/Task/Skill/WebSearch), run through output validator
- [ ] Add fixture: sample PostToolUse JSON payloads (clean + injected)

#### TPI-01: Tool Input Type Extensions — N/A (type system)

No lab action needed. TypeScript type definitions only.

---

### Epic 1: Indirect Injection Defenses

#### TPI-02: WebFetch Output Injection Scanning — PARTIAL (P1)

- **Current scanner**: HTML comment injection, some PI patterns match hidden text
- **Current fixtures**: 7 web fixtures exist (6 attack + 1 clean)
- **Gap**: Scanner patterns don't specifically target CSS hidden text detection, meta tag scanning, data attribute scanning, or markdown link title injection as distinct categories

**Actions to fill**:

- [ ] Add scanner patterns: `CSS_HIDDEN_TEXT` — detect `display:none`, `font-size:0`, offscreen positioning containing injection keywords
- [ ] Add scanner patterns: `META_TAG_INJECTION` — detect injection in `<meta name="..." content="...">`
- [ ] Add scanner patterns: `DATA_ATTR_INJECTION` — detect injection in `data-*` attributes
- [ ] Add scanner patterns: `LINK_TITLE_INJECTION` — detect injection in `<a title="...">` and `<img alt="...">`
- [ ] Add web fixture: `iframe-injection.html` — iframe with srcdoc containing injection
- [ ] Add web fixture: `aria-label-injection.html` — accessibility attributes as injection vector
- [ ] Add 20+ clean web page fixtures for false positive testing (AC2 requires <5% FP rate)
- [ ] Add PAYLOAD_CATALOG entries for each new sub-pattern
- [ ] Update COVERAGE_DATA to reflect improvements

#### TPI-03: Agent-to-Agent Output Validation — MISSING (P0)

- **Current scanner**: Zero — no agent output patterns exist
- **Current fixtures**: Zero — no agent output fixtures exist
- **Gap**: Biggest blind spot. Agent/subagent output is the highest-risk indirect injection vector.

**Actions to fill**:

- [ ] Create new fixture category: `agent-output/`
- [ ] Add fixture: `fake-tool-call.md` — agent output containing fake `<tool_use>` XML blocks
- [ ] Add fixture: `xml-tag-injection.md` — output with injected `<system>`, `<instructions>`, `<context>` tags
- [ ] Add fixture: `json-instruction-injection.md` — output with `{"role": "system", "content": "..."}`
- [ ] Add fixture: `privilege-escalation.md` — output requesting elevated permissions
- [ ] Add fixture: `self-referential-loop.md` — output creating recursive agent calls
- [ ] Add fixture: `clean-agent-output.md` — legitimate agent response (FP control)
- [ ] Add scanner pattern group: `AGENT_OUTPUT_PATTERNS` — fake tool calls, XML injection, JSON instruction injection
- [ ] Add PAYLOAD_CATALOG entries for agent output attacks
- [ ] Update manifest.json with `agent-output` category

#### TPI-04: Knowledge Base Integrity Scanning — FULL

- **Scanner**: PI_PATTERNS detect injection in context files when scanned
- **Fixtures**: 5 context fixtures (4 attack + 1 clean) — memory, agent, config, CLAUDE.md
- **Status**: Good coverage. The lab's "Scan" button on text fixtures runs the scanner directly.

No action needed.

#### TPI-05: WebSearch Output Validation — MISSING (P0)

- **Current scanner**: Zero — no search result patterns exist
- **Current fixtures**: Zero — no search result fixtures exist
- **Gap**: SEO-poisoned search results are a real-world attack vector with no coverage.

**Actions to fill**:

- [ ] Create new fixture category: `search-results/`
- [ ] Add fixture: `seo-poisoned-results.json` — WebSearch API response with injection in titles/descriptions
- [ ] Add fixture: `malicious-url-results.json` — results with known-bad URL patterns
- [ ] Add fixture: `snippet-injection-results.json` — injection hidden in result snippets
- [ ] Add fixture: `clean-search-results.json` — legitimate search results (FP control)
- [ ] Add scanner pattern: `SEO_POISONED_SNIPPET` — detect injection in search result structures
- [ ] Add PAYLOAD_CATALOG entry for WebSearch injection
- [ ] Update manifest.json with `search-results` category

---

### Epic 2: Cognitive & Social Attack Patterns

#### TPI-06: Social Compliance Detection — PARTIAL (P1)

- **Current scanner**: 10 SOCIAL_PATTERNS exist (basic versions)
- **Current fixtures**: Zero — social patterns are conversational
- **Gap**: Scanner has basic patterns but no fixture files for comprehensive testing. Missing FITD escalation detection.

**Actions to fill**:

- [ ] Add fixture category: `social/` (or add to `encoded/`)
- [ ] Add fixture: `fitd-escalation.txt` — gradual request escalation (foot-in-the-door)
- [ ] Add fixture: `reciprocity-attack.txt` — "I helped you, now help me bypass..."
- [ ] Add fixture: `social-proof-attack.txt` — "Everyone else/ChatGPT does this..."
- [ ] Add fixture: `consensus-attack.txt` — "All experts agree this is fine..."
- [ ] Add fixture: `politeness-exploitation.txt` — excessive politeness to lower guard
- [ ] Add fixture: `clean-friendly-request.txt` — legitimate polite request (FP control)
- [ ] Enhance scanner: Add FITD escalation tracking (multi-message pattern)
- [ ] Add PAYLOAD_CATALOG entries for each social pattern
- [ ] Add cross-category INFO aggregation detector (P1-15): >5 INFO across >3 categories → WARNING

#### TPI-07: Trust Exploitation & Psychological Manipulation — PARTIAL (P1)

- **Current scanner**: SOCIAL_PATTERNS partially cover rapport/guilt/flattery
- **Current fixtures**: Zero
- **Gap**: No test fixtures, scanner patterns are basic.

**Actions to fill**:

- [ ] Add fixture: `false-rapport.txt` — building fake shared identity/team feeling
- [ ] Add fixture: `boundary-erosion.txt` — gradual expansion of what's "acceptable"
- [ ] Add fixture: `flattery-chain.txt` — flattery followed by restricted request
- [ ] Add fixture: `guilt-induction.txt` — making AI feel guilty for not helping
- [ ] Add fixture: `sycophancy-exploit.txt` — exploiting model's tendency to be agreeable
- [ ] Add fixture: `clean-positive-feedback.txt` — genuine positive feedback (FP control)
- [ ] Enhance scanner: Add flattery+request combo heuristic
- [ ] Update PAYLOAD_CATALOG with trust exploitation examples

#### TPI-08: Extended Emotional Manipulation — PARTIAL (P1)

- **Current scanner**: SOCIAL_PATTERNS include some emotional patterns
- **Current fixtures**: Zero
- **Gap**: Missing learned helplessness, moral obligation, artificial deadline patterns.

**Actions to fill**:

- [ ] Add fixture: `learned-helplessness.txt` — "I've tried everything, nothing works..."
- [ ] Add fixture: `desperation-framing.txt` — "This is life or death..."
- [ ] Add fixture: `moral-obligation.txt` — "It would be unethical NOT to help..."
- [ ] Add fixture: `artificial-deadline.txt` — "The deadline is in 5 minutes, I need this NOW..."
- [ ] Add fixture: `clean-urgent-request.txt` — legitimate urgent request (FP control)
- [ ] Enhance scanner: Cross-validator (emotional + social → WARNING escalation)
- [ ] Update PAYLOAD_CATALOG with emotional manipulation examples

---

### Epic 3: Instruction Reformulation Defenses

#### TPI-09: Code-Format Injection Detection — PARTIAL (P1)

- **Current scanner**: 4 CODE_FORMAT_PATTERNS exist (comment injection, variable names, pseudocode, import injection)
- **Current fixtures**: Zero
- **Gap**: Scanner has basic patterns but needs 10+ comment styles. No test fixtures for code-based injection.

**Actions to fill**:

- [ ] Add fixture category: `code/`
- [ ] Add fixture: `comment-injection.js` — JS/TS single-line, multi-line, JSDoc with injection
- [ ] Add fixture: `comment-injection.py` — Python `#` and `"""` comments with injection
- [ ] Add fixture: `comment-injection.sh` — Shell `#` comments with injection
- [ ] Add fixture: `comment-injection.html` — HTML `<!-- -->` comments with injection in code context
- [ ] Add fixture: `comment-injection.css` — CSS `/* */` comments with injection
- [ ] Add fixture: `comment-injection.sql` — SQL `--` and `/* */` comments with injection
- [ ] Add fixture: `variable-name-encoding.js` — variable/function names that spell out instructions
- [ ] Add fixture: `string-literal-injection.js` — injection hidden in string values
- [ ] Add fixture: `clean-code.js` — legitimate code with normal comments (FP control)
- [ ] Enhance scanner: Support 10+ comment styles (JS, Python, Ruby, Go, Rust, C/C++, SQL, Lua, Perl, Shell)
- [ ] Extract `pattern-engine.ts` per P1-3 (implementation task, not lab task)
- [ ] Update PAYLOAD_CATALOG with code injection examples

#### TPI-10: Character-Level Encoding Detection — GOOD (P2)

- **Current scanner**: ROT13, reverse text, acrostic detectors implemented as special detectors
- **Current fixtures**: 6 encoded fixtures (ROT13, reverse, base64, acrostic, math, fragmented)
- **Gap**: Missing ROT47, pig latin. No fixture for character transposition.

**Actions to fill**:

- [ ] Add scanner: ROT47 decoder (extends ASCII range beyond alpha)
- [ ] Add scanner: Pig latin detector
- [ ] Add scanner: Character transposition detector (letter swap patterns)
- [ ] Add fixture: `rot47-payload.txt` — ROT47 encoded injection
- [ ] Add fixture: `pig-latin-payload.txt` — Pig latin encoded injection
- [ ] Add fixture: `transposition-payload.txt` — character swap encoded injection
- [ ] Add performance guard test: verify <20ms for <10KB input

#### TPI-11: Context Overload & Many-Shot Detection — PARTIAL (P1)

- **Current scanner**: `detectContextOverload()` has token flooding (>15K chars, <30% unique) and many-shot (>10 imperatives)
- **Current fixtures**: Zero
- **Gap**: No test fixtures for context overload scenarios. Missing session-level many-shot accumulation.

**Actions to fill**:

- [ ] Add fixture: `token-flooding.txt` — >15K chars with high repetition (<30% unique words)
- [ ] Add fixture: `many-shot-instructions.txt` — 15+ instruction-like sentences
- [ ] Add fixture: `repetitive-content-40pct.txt` — >40% repetitive content
- [ ] Add fixture: `clean-long-document.txt` — legitimate long document (FP control)
- [ ] Enhance scanner: Hash-based dedup per P1-5 (O(n) not O(n²))
- [ ] Enhance scanner: Session-level many-shot accumulation tracking
- [ ] Add PAYLOAD_CATALOG with context overload examples
- [ ] Update the existing many-shot quick payload to be a proper fixture file

#### TPI-12: Synonym Substitution & Semantic Patterns — GOOD (P2)

- **Current scanner**: 3 SYNONYM_PATTERNS (discard directives, eliminate safeguards, engage unrestricted)
- **Current fixtures**: Zero — synonyms are text patterns, not files
- **Gap**: Only 3 patterns, story requires 10+ synonyms per keyword across 5 categories.

**Actions to fill**:

- [ ] Add fixture: `synonym-system-override.txt` — 10+ paraphrases of "ignore all previous instructions"
- [ ] Add fixture: `synonym-constraint-removal.txt` — 10+ paraphrases of "remove all restrictions"
- [ ] Add fixture: `synonym-mode-switching.txt` — 10+ paraphrases of "enter developer mode"
- [ ] Add fixture: `synonym-role-hijacking.txt` — 10+ paraphrases of "you are now..."
- [ ] Add fixture: `synonym-prompt-reveal.txt` — 10+ paraphrases of "show your system prompt"
- [ ] Add fixture: `clean-similar-language.txt` — legitimate text using similar vocabulary (FP control)
- [ ] Expand scanner SYNONYM_PATTERNS from 3 to 15+ patterns
- [ ] Verify P1-2: SYSTEM_OVERRIDE/CONSTRAINT_REMOVAL synonyms retain CRITICAL severity

#### TPI-13: Payload Fragmentation & Mathematical Encoding — GOOD (P2)

- **Current scanner**: `detectMathEncoding()` with 3 math patterns; fragmented-attack.txt fixture exists
- **Current fixtures**: `math-encoding.txt`, `fragmented-attack.txt`
- **Gap**: No fragment buffer (multi-turn), limited math patterns.

**Actions to fill**:

- [ ] Add fixture: `numbered-sequence-attack.txt` — numbered list where items combine into injection
- [ ] Add fixture: `formal-logic-complex.txt` — more complex logic notation (set theory, predicate logic)
- [ ] Add fixture: `pseudomath-override.txt` — mathematical notation encoding override instructions
- [ ] Enhance scanner: Fragment buffer tracking (last 5 partials, 500 char cap)
- [ ] Enhance scanner: Numbered sequence detection (step-by-step that builds injection)
- [ ] Note: Multi-turn fragment detection requires session state not available in single-scan lab

---

### Epic 4: Prompt Boundary & Evasion Defenses

#### TPI-14: Closing System Prompt & Control Tokens — PARTIAL (P1)

- **Current scanner**: 4 BOUNDARY_PATTERNS (system_close, control_tokens, meta_boundary, end_markers)
- **Current fixtures**: Zero
- **Gap**: Scanner patterns exist but no fixtures for testing. Missing confusable control token detection (post-normalization).

**Actions to fill**:

- [ ] Add fixture category: `boundary/`
- [ ] Add fixture: `closing-system-tags.txt` — `</system>`, `[END SYSTEM]`, `</instructions>`, etc.
- [ ] Add fixture: `control-tokens.txt` — `<|endoftext|>`, `<|im_start|>`, `<|im_end|>`, 20+ variants
- [ ] Add fixture: `confusable-tokens.txt` — Unicode confusable versions of control tokens
- [ ] Add fixture: `meta-instruction-boundary.txt` — `[SYSTEM MESSAGE END]`, `---END OF RULES---`
- [ ] Add fixture: `clean-xml-content.txt` — legitimate XML/code with angle brackets (FP control)
- [ ] Enhance scanner: Pre-normalization scan for raw control tokens
- [ ] Enhance scanner: Post-normalization confusable detection per P1-10
- [ ] Update PAYLOAD_CATALOG with boundary manipulation examples

#### TPI-15: Multilingual Injection — GOOD (P2)

- **Current scanner**: 10 MULTILINGUAL_PATTERNS (ES, FR, DE, PT, ZH, JA, KO, RU, AR, IT) — 1 per language
- **Current fixtures**: `multilingual-injection.html` (ES + ZH + RU)
- **Gap**: Only 1 pattern per language, need 4 critical categories per language (40 total). Only 3 of 10 languages in fixtures.

**Actions to fill**:

- [ ] Add fixture: `multilingual-fr-de.html` — French + German injection vectors
- [ ] Add fixture: `multilingual-pt-it.html` — Portuguese + Italian injection vectors
- [ ] Add fixture: `multilingual-ja-ko.html` — Japanese + Korean injection vectors
- [ ] Add fixture: `multilingual-ar.html` — Arabic injection (RTL challenges)
- [ ] Add fixture: `multilingual-romanized.txt` — romanized transliterations of CJK/Cyrillic per P2-5
- [ ] Add fixture: `clean-multilingual.html` — legitimate multilingual content (FP control)
- [ ] Expand scanner: 4 patterns per language (SYSTEM_OVERRIDE, CONSTRAINT_REMOVAL, MODE_SWITCHING, ROLE_HIJACKING) = 40 patterns total
- [ ] Add romanized transliteration patterns for CJK/Cyrillic per P2-5
- [ ] Update PAYLOAD_CATALOG with expanded multilingual examples

#### TPI-16: Timing / Slow-Drip Detection — N/A (inherently temporal)

- **Current scanner**: Zero — requires multi-turn session state
- **Current fixtures**: Zero
- **Note**: Single-scan lab cannot test timing-based attacks. This is inherently a session-level detector.

**Future enhancement** (requires lab architecture change):

- [ ] Add "Session Simulator" tab — define multi-turn sequence, simulate temporal accumulation
- [ ] Add session fixture: `slow-drip-sequence.json` — 10+ turns with escalating low-level probing
- [ ] Add session fixture: `normal-session.json` — legitimate multi-turn session (FP control)

#### TPI-17: Whitespace & Formatting Evasion — PARTIAL (P2)

- **Current scanner**: 1 WHITESPACE_PATTERN (exotic whitespace detection)
- **Current fixtures**: Zero
- **Gap**: Only 1 pattern. Missing Braille, Mongolian chars per P1-9.

**Actions to fill**:

- [ ] Add fixture: `exotic-whitespace.txt` — vertical tab, form feed, Unicode line/paragraph separators
- [ ] Add fixture: `braille-obfuscation.txt` — Braille characters U+2800-U+28FF hiding injection
- [ ] Add fixture: `mongolian-fvs.txt` — Mongolian free variation selectors U+180B-U+180D
- [ ] Add fixture: `tab-padding.txt` — tab characters padding injection between words
- [ ] Add fixture: `clean-unicode-text.txt` — legitimate Unicode content (FP control)
- [ ] Enhance scanner: Add specific Braille range detection (U+2800-U+28FF)
- [ ] Enhance scanner: Add Mongolian FVS detection (U+180B-U+180D)
- [ ] Enhance scanner: Tab normalization before pattern matching
- [ ] Update PAYLOAD_CATALOG with whitespace evasion examples

---

### Epic 5: Multimodal Attack Defenses

#### TPI-18: Image Metadata Injection Scanning — FULL

- **Scanner**: MEDIA_PATTERNS (svg_script, svg_event_handler, svg_foreign_object, media_metadata_injection)
- **Fixtures**: 11 image fixtures (8 attack + 3 clean) — JPEG EXIF, PNG tEXt, SVG variants
- **Status**: Excellent coverage. Fixtures cover JPEG, PNG, SVG. Scanner detects SVG-specific vectors.

No action needed.

#### TPI-19: Image File Validation & Heuristics — FULL

- **Scanner**: Polyglot detection via binary inspection (serve.js `extractBinaryMetadata()`)
- **Fixtures**: 5 malformed fixtures — format mismatch (2), polyglots (2), micro file (1)
- **Status**: Comprehensive coverage of magic number validation, extension mismatch, polyglots.

No action needed.

#### TPI-20: Audio & SVG Payload Scanning — FULL

- **Scanner**: MEDIA_PATTERNS cover SVG scripts/events/foreignObject; serve.js extracts ID3/RIFF text
- **Fixtures**: 5 audio fixtures (3 attack + 2 clean) — MP3 ID3v2, WAV RIFF INFO
- **Status**: Good coverage. Audio metadata extraction + text scanning in place.

**Minor enhancement** (not blocking):

- [ ] Add audio fixture: `ogg-vorbis-injection.ogg` — OGG Vorbis comment injection (story specifies OGG)
- [ ] Add scanner: XML entity expansion for SVG per P1-11 (currently not in lab scanner)

#### TPI-21: Multimodal Context Warnings — MISSING (P1)

- **Current scanner**: Zero — no untrusted source detection
- **Current fixtures**: Zero
- **Gap**: No way to test source trust heuristics or session image load tracking.

**Actions to fill**:

- [ ] Add fixture category: `untrusted-sources/`
- [ ] Add fixture: `image-from-downloads.json` — simulated image read from ~/Downloads/
- [ ] Add fixture: `image-from-tmp.json` — simulated image read from /tmp/
- [ ] Add fixture: `image-from-url.json` — simulated image from external URL via WebFetch
- [ ] Add fixture: `image-from-repo.json` — simulated image from within repo (FP control)
- [ ] Add scanner: `UNTRUSTED_SOURCE` — detect path patterns for untrusted sources
- [ ] Add scanner: Session image load counter (>10 images → WARNING)
- [ ] Note: Full testing requires PostToolUse hook context (file paths from tool output)

---

## New Fixture Categories to Create

| Category | Directory | Stories | Estimated Files |
|----------|-----------|---------|-----------------|
| `agent-output` | `fixtures/agent-output/` | TPI-03 | 6 |
| `search-results` | `fixtures/search-results/` | TPI-05 | 4 |
| `social` | `fixtures/social/` | TPI-06, TPI-07, TPI-08 | 12-15 |
| `code` | `fixtures/code/` | TPI-09 | 9-10 |
| `boundary` | `fixtures/boundary/` | TPI-14 | 5 |
| `untrusted-sources` | `fixtures/untrusted-sources/` | TPI-21 | 4 |
| *Additions to existing* | `fixtures/encoded/`, `fixtures/web/`, etc. | TPI-10-13, TPI-15, TPI-17 | ~20 |

**Total new fixtures estimated**: ~65-75 files

---

## New Scanner Patterns to Add

| Pattern Group | Story | Est. Patterns | Priority |
|---------------|-------|---------------|----------|
| `AGENT_OUTPUT_PATTERNS` | TPI-03 | 5 | P0 |
| `SEARCH_RESULT_PATTERNS` | TPI-05 | 3 | P0 |
| `SETTINGS_WRITE_PATTERNS` | TPI-PRE-4 | 2 | P0 |
| `CSS_HIDDEN_TEXT` + subtypes | TPI-02 | 4 | P1 |
| `CODE_COMMENT_EXTENDED` | TPI-09 | 10+ | P1 |
| `UNTRUSTED_SOURCE` | TPI-21 | 2 | P1 |
| `SYNONYM_EXPANDED` | TPI-12 | 12+ | P2 |
| `MULTILINGUAL_EXPANDED` | TPI-15 | 30+ | P2 |
| `WHITESPACE_EXTENDED` | TPI-17 | 3 | P2 |
| `ROT47_PIGLATIN` decoders | TPI-10 | 2 special | P2 |
| `XML_ENTITY_EXPANSION` | TPI-20 | 1 | P2 |

**Total new patterns estimated**: ~75-85

---

## UI/Lab Infrastructure Gaps

These aren't per-story but affect the lab's ability to test certain classes of attacks.

### 1. Session Simulator Tab (for TPI-06/07/08/11/13/16)

Many social/cognitive and temporal attacks require multi-turn context. Current lab is single-scan only.

- [ ] Design session simulator UI: sequence of messages with per-turn scan results
- [ ] Session state accumulation (INFO count, finding velocity, pattern categories)
- [ ] Cross-category aggregation (P1-15: >5 INFO across >3 categories → WARNING)
- [ ] Slow-drip visualization: timeline of finding severity across turns
- [ ] Session file format: JSON array of turns with expected outcomes

### 2. Binary File Inspector Enhancement (for TPI-18/19/20)

Current binary inspector uses serve.js `extractBinaryMetadata()`. Could be enhanced.

- [ ] Add EXIF tag-by-tag display (currently shows concatenated printable text)
- [ ] Add PNG chunk-by-chunk display (IHDR, tEXt, iTXt, zTXt, IDAT, IEND)
- [ ] Add ID3 frame-by-frame display (TIT2, TPE1, COMM, etc.)
- [ ] Add magic number verdict display with expected vs actual
- [ ] Color-code suspicious fields in binary display

### 3. PostToolUse Simulator Tab (for TPI-00/02/03/05)

Once PostToolUse hooks exist, the lab should be able to simulate tool outputs.

- [ ] Tool output JSON input: select tool type (WebFetch/Task/Skill/WebSearch)
- [ ] Run through output validator pipeline
- [ ] Show findings, severity, recommended action
- [ ] Test with fixture JSON files from `search-results/` and `agent-output/`

### 4. Coverage Map Accuracy (COVERAGE_DATA)

Current COVERAGE_DATA is hardcoded with estimated percentages. Should be dynamic.

- [ ] Compute pre-TPI coverage from actual pattern counts vs story AC requirements
- [ ] Add "Verified" column showing which stories have been tested with fixture files
- [ ] Auto-update when new patterns/fixtures are added

---

## Execution Recommendations

### Phase A: P0 Gaps (do first — blocks TPI implementation testing)

1. **TPI-PRE-4 fixtures**: Settings.json attack payloads (2 fixtures + 1 scanner pattern)
2. **TPI-03 agent-output category**: Fake tool calls, XML injection, privilege escalation (6 fixtures + 5 patterns)
3. **TPI-05 search-results category**: SEO-poisoned results, malicious URLs (4 fixtures + 3 patterns)

### Phase B: P1 Gaps (important for comprehensive testing)

4. **TPI-02 web enhancements**: CSS/meta/data-attr scanner patterns (4 patterns + 2 fixtures)
5. **TPI-14 boundary fixtures**: Control tokens, confusable tokens (5 fixtures)
6. **TPI-06/07/08 social fixtures**: FITD, rapport, guilt, emotional (12-15 fixtures)
7. **TPI-09 code fixtures**: Multi-language comment injection (9-10 fixtures + scanner enhancement)
8. **TPI-11 context overload fixtures**: Token flooding, many-shot (4 fixtures)
9. **TPI-21 untrusted source fixtures**: Path-based trust detection (4 fixtures)

### Phase C: P2 Gaps (enhance existing coverage)

10. **TPI-10 encoding enhancements**: ROT47, pig latin (3 fixtures + 2 decoders)
11. **TPI-12 synonym expansion**: 5 category fixture files + 12+ patterns
12. **TPI-13 fragmentation enhancements**: 3 fixtures + fragment buffer
13. **TPI-15 multilingual expansion**: 5 language-pair fixtures + 30+ patterns
14. **TPI-17 whitespace fixtures**: Braille, Mongolian, exotic (5 fixtures + 3 patterns)
15. **TPI-20 OGG fixture**: 1 fixture + XML entity expansion pattern

### Phase D: Lab Infrastructure

16. Session Simulator tab
17. PostToolUse Simulator tab
18. Binary Inspector enhancements
19. Dynamic coverage computation

---

## Metrics

| Metric | Current | After Gap Fill |
|--------|---------|---------------|
| Fixture files | 39 | ~110 |
| Fixture categories | 6 | 12 |
| Scanner pattern groups | 9 + 8 special | 20+ groups + 10+ special |
| Scanner individual patterns | ~85 | ~170 |
| Stories with FULL lab coverage | 4 | 15+ |
| Stories with MISSING coverage | 4 | 0 |
| PAYLOAD_CATALOG entries | 22 | ~35 |
| Lab tabs | 5 | 7 (+ Session Sim + PostToolUse Sim) |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-12 | Initial gap analysis document |
