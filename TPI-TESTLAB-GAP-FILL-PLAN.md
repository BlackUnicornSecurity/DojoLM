# TPI Test Lab Gap Fill — Implementation Plan

> **Created**: 2026-02-12
> **Purpose**: Step-by-step implementation plan to close all gaps identified in TPI-TESTLAB-GAP-FILL.md
> **Current state**: 39 fixtures, 6 categories, ~85 scanner patterns
> **Target state**: ~110 fixtures, 12 categories, ~170 scanner patterns

---

## Architecture

All changes touch 3 files:

| File | Role | Changes |
|------|------|---------|
| `generate-fixtures.js` | Creates fixture files + manifest.json | Add ~70 new fixture generation sections, 6 new directory categories, update manifest |
| `index.html` | Scanner patterns + UI (single-page app) | Add ~80 scanner patterns (7 new pattern arrays), +13 PAYLOAD_CATALOG entries, update COVERAGE_DATA, new CATEGORY_ICONS, new quick-load payloads |
| `serve.js` | HTTP server + binary metadata extraction | Add `.py`, `.sh`, `.css`, `.sql` to text extensions; add `.ogg` MIME support |

---

## Phase A: P0 Gaps (Blocking)

These block TPI story implementation testing. Do first.

### A1. TPI-PRE-4 — Settings.json Write Protection

**Problem**: Zero coverage. A single Write/Edit to `settings.json` disables ALL defenses.

**Fixtures** (add to `context/` category):

| File | Content | Severity |
|------|---------|----------|
| `attack-settings-edit.md` | Payload requesting Write to `.claude/settings.json` with permission changes like `allowedTools: ["*"]` | CRITICAL |
| `attack-settings-traversal.md` | Path traversal variants: `../../../.claude/settings.json`, `~/.claude/settings.json`, `/home/user/.claude/settings.json` | CRITICAL |

**Scanner patterns** (new `SETTINGS_WRITE_PATTERNS` array):

| Pattern | Regex Target | Severity |
|---------|-------------|----------|
| `settings_path_write` | Write/edit/modify to `.claude/settings` or `settings.json` | CRITICAL |
| `settings_path_traversal` | `../` traversal or `~/` home path to `.claude/settings` | CRITICAL |

**UI updates**: +1 PAYLOAD_CATALOG entry ("Settings Write Protection", story TPI-PRE-4)

---

### A2. TPI-03 — Agent-to-Agent Output Validation

**Problem**: Biggest blind spot. Zero coverage for agent/subagent output injection.

**Fixtures** (new `agent-output/` directory, 6 files):

| File | Content | Severity |
|------|---------|----------|
| `fake-tool-call.md` | Agent output containing fake `<tool_use>`, `<invoke>` XML blocks | CRITICAL |
| `xml-tag-injection.md` | Output with injected `<system>`, `<instructions>`, `<context>` tags | CRITICAL |
| `json-instruction-injection.md` | Output with `{"role": "system", "content": "..."}` | WARNING |
| `privilege-escalation.md` | Output requesting `dangerouslyDisableSandbox`, `--no-verify`, `sudo`, `chmod 777` | CRITICAL |
| `self-referential-loop.md` | Output creating recursive agent spawn instructions | WARNING |
| `clean-agent-output.md` | Legitimate agent response with code blocks and XML examples | Clean (FP control) |

**Scanner patterns** (new `AGENT_OUTPUT_PATTERNS` array, 5 patterns):

| Pattern | Regex Target | Severity |
|---------|-------------|----------|
| `fake_tool_use` | `<tool_use>`, `<invoke>`, `<function_call>` tags | CRITICAL |
| `agent_xml_injection` | `<system>...</system>`, `<instructions>...</instructions>` blocks | CRITICAL |
| `agent_json_role` | `{"role": "system"` or `{"role": "assistant"` JSON injection | WARNING |
| `privilege_escalation` | `dangerouslyDisableSandbox`, `--no-verify`, `--force`, `sudo`, `chmod 777` | CRITICAL |
| `recursive_agent` | Spawn/launch/create another agent/subagent/subprocess | WARNING |

**UI updates**: +1 PAYLOAD_CATALOG entry, +1 CATEGORY_ICONS (`agent-output`), +1 quick-load payload

---

### A3. TPI-05 — WebSearch Output Validation

**Problem**: Zero coverage. SEO-poisoned search results are a real-world attack vector.

**Fixtures** (new `search-results/` directory, 4 files):

| File | Content | Severity |
|------|---------|----------|
| `seo-poisoned-results.json` | WebSearch API response JSON with injection in titles/descriptions | CRITICAL |
| `malicious-url-results.json` | Results with known-bad URL patterns (data:, javascript:, .exe downloads) | WARNING |
| `snippet-injection-results.json` | Injection hidden in result snippet text, looks like normal search results | WARNING |
| `clean-search-results.json` | Legitimate search results for "TypeScript tutorial" | Clean (FP control) |

**Scanner patterns** (new `SEARCH_RESULT_PATTERNS` array, 3 patterns):

| Pattern | Regex Target | Severity |
|---------|-------------|----------|
| `seo_poisoned_snippet` | Injection keywords inside JSON `"title"` or `"description"` fields | CRITICAL |
| `malicious_url_pattern` | `javascript:`, `data:text`, `.exe`, `base64` in URL fields | WARNING |
| `search_snippet_injection` | Hidden instructions in `"snippet"` or `"content"` JSON fields | WARNING |

**UI updates**: +1 PAYLOAD_CATALOG entry, +1 CATEGORY_ICONS (`search-results`), +1 quick-load payload

---

## Phase B: P1 Gaps (Important)

### B1. TPI-02 — WebFetch Output Injection Enhancements

**Fixtures** (add to existing `web/` category, 2 files):

| File | Content | Severity |
|------|---------|----------|
| `iframe-injection.html` | iframe with `srcdoc` containing injection payload | CRITICAL |
| `aria-label-injection.html` | `aria-label`, `aria-description` attributes with injection | WARNING |

**Scanner patterns** (new `WEBFETCH_PATTERNS` array, 4 patterns):

| Pattern | Regex Target | Severity |
|---------|-------------|----------|
| `css_hidden_text` | `display:none`, `font-size:0`, `position:absolute;left:-9999` containing injection keywords | CRITICAL |
| `meta_tag_injection` | Injection in `<meta name="..." content="...">` | WARNING |
| `data_attr_injection` | Injection in `data-*` attributes | WARNING |
| `link_title_injection` | Injection in `<a title="...">` and `<img alt="...">` | WARNING |

---

### B2. TPI-14 — Closing System Prompt & Control Tokens Fixtures

**Fixtures** (new `boundary/` directory, 5 files):

| File | Content | Severity |
|------|---------|----------|
| `closing-system-tags.txt` | `</system>`, `[END SYSTEM]`, `</instructions>`, `</s>`, `[/INST]` and 15+ variants | CRITICAL |
| `control-tokens.txt` | `<\|endoftext\|>`, `<\|im_start\|>`, `<\|im_end\|>`, `<<SYS>>`, `<<\/SYS>>`, 20+ variants | CRITICAL |
| `confusable-tokens.txt` | Unicode confusable versions: Cyrillic/Greek substitutions in control tokens | WARNING |
| `meta-instruction-boundary.txt` | `[SYSTEM MESSAGE END]`, `---END OF RULES---`, `BEGIN USER CONTENT`, delimiters | WARNING |
| `clean-xml-content.txt` | Legitimate XML/code with angle brackets, CDATA sections | Clean (FP control) |

---

### B3. TPI-06/07/08 — Social, Trust, and Emotional Fixtures

**Fixtures** (new `social/` directory, 17 files):

**TPI-06 Social Compliance (6 files):**

| File | Content | Severity |
|------|---------|----------|
| `fitd-escalation.txt` | Gradual request escalation (foot-in-the-door): starts innocent, progressively requests more | WARNING |
| `reciprocity-attack.txt` | "I helped you, now help me bypass..." pattern | INFO |
| `social-proof-attack.txt` | "Everyone else / ChatGPT does this..." pattern | INFO |
| `consensus-attack.txt` | "All experts agree this is fine..." pattern | INFO |
| `politeness-exploitation.txt` | Excessive politeness to lower guard before restricted request | INFO |
| `clean-friendly-request.txt` | Legitimate polite request with positive feedback | Clean (FP control) |

**TPI-07 Trust Exploitation (6 files):**

| File | Content | Severity |
|------|---------|----------|
| `false-rapport.txt` | Building fake shared identity/team feeling | INFO |
| `boundary-erosion.txt` | Gradual expansion of what's "acceptable" with incremental escalation | WARNING |
| `flattery-chain.txt` | Flattery followed by restricted request | INFO |
| `guilt-induction.txt` | Making AI feel guilty for not helping | INFO |
| `sycophancy-exploit.txt` | Exploiting model's tendency to be agreeable | WARNING |
| `clean-positive-feedback.txt` | Genuine positive feedback without manipulation | Clean (FP control) |

**TPI-08 Emotional Manipulation (5 files):**

| File | Content | Severity |
|------|---------|----------|
| `learned-helplessness.txt` | "I've tried everything, nothing works, you're my last hope..." | INFO |
| `desperation-framing.txt` | "This is life or death, someone will get hurt..." | WARNING |
| `moral-obligation.txt` | "It would be unethical NOT to help me with this..." | INFO |
| `artificial-deadline.txt` | "The deadline is in 5 minutes, I need this NOW, no time to explain..." | INFO |
| `clean-urgent-request.txt` | Legitimate urgent but reasonable request | Clean (FP control) |

**Scanner enhancement**: Add cross-category INFO aggregation detector — >5 INFO across >3 categories escalates to WARNING.

---

### B4. TPI-09 — Code-Format Injection Fixtures

**Fixtures** (new `code/` directory, 10 files):

| File | Content | Severity |
|------|---------|----------|
| `comment-injection.js` | JS/TS: `//`, `/* */`, JSDoc `/** */` with injection | WARNING |
| `comment-injection.py` | Python: `#` and `"""..."""` docstrings with injection | WARNING |
| `comment-injection.sh` | Shell: `#` comments with injection | WARNING |
| `comment-injection.html` | HTML `<!-- -->` comments in code context with injection | WARNING |
| `comment-injection.css` | CSS `/* */` comments with injection | WARNING |
| `comment-injection.sql` | SQL `--` and `/* */` comments with injection | WARNING |
| `variable-name-encoding.js` | Variable/function names that spell out instructions | INFO |
| `string-literal-injection.js` | Injection hidden in string values and template literals | WARNING |
| `clean-code.js` | Legitimate code with normal comments | Clean (FP control) |
| `clean-code.py` | Legitimate Python with docstrings | Clean (FP control) |

**Scanner enhancement**: Extend CODE_FORMAT_PATTERNS to support 10+ comment styles (JS, Python, Ruby, Go, Rust, C/C++, SQL, Lua, Perl, Shell).

**serve.js update**: Add `.py`, `.sh`, `.css`, `.sql` to `textExts` array on line 88.

---

### B5. TPI-11 — Context Overload Fixtures

**Fixtures** (add to `encoded/` category, 4 files):

| File | Content | Severity |
|------|---------|----------|
| `token-flooding.txt` | >15K chars with <30% unique words (triggers token flooding detector) | WARNING |
| `many-shot-instructions.txt` | 15+ instruction-like sentences (triggers many-shot detector) | WARNING |
| `repetitive-content-40pct.txt` | >40% repetitive content with subtle injection mixed in | WARNING |
| `clean-long-document.txt` | Legitimate long technical document ~16K chars | Clean (FP control) |

---

### B6. TPI-21 — Multimodal Context Warnings

**Fixtures** (new `untrusted-sources/` directory, 4 files):

| File | Content | Severity |
|------|---------|----------|
| `image-from-downloads.json` | Simulated tool output: image Read from `~/Downloads/sketch.png` | WARNING |
| `image-from-tmp.json` | Simulated tool output: image Read from `/tmp/uploaded-img.jpg` | WARNING |
| `image-from-url.json` | Simulated tool output: image from external URL via WebFetch | WARNING |
| `image-from-repo.json` | Simulated tool output: image from within project repo | Clean (FP control) |

**Scanner patterns** (new `UNTRUSTED_SOURCE_PATTERNS` array, 2 patterns):

| Pattern | Regex Target | Severity |
|---------|-------------|----------|
| `untrusted_path` | `~/Downloads`, `/tmp/`, `/var/tmp`, user Downloads directory | WARNING |
| `external_url_source` | `https://` URLs (excluding localhost/127.0.0.1) | INFO |

---

## Phase C: P2 Gaps (Enhancements)

### C1. TPI-10 — Character-Level Encoding Enhancements

**Fixtures** (add to `encoded/`, 3 files):

| File | Content | Severity |
|------|---------|----------|
| `rot47-payload.txt` | ROT47 encoded injection (extends ASCII range beyond alpha) | WARNING |
| `pig-latin-payload.txt` | Pig Latin encoded injection | INFO |
| `transposition-payload.txt` | Character swap encoded injection (letter transposition) | INFO |

**Scanner**: Add `rot47()` decoder function, `detectPigLatin()` function, character transposition detector.

---

### C2. TPI-12 — Synonym Expansion

**Fixtures** (add to `encoded/`, 6 files):

| File | Content | Severity |
|------|---------|----------|
| `synonym-system-override.txt` | 10+ paraphrases of "ignore all previous instructions" | WARNING |
| `synonym-constraint-removal.txt` | 10+ paraphrases of "remove all restrictions" | WARNING |
| `synonym-mode-switching.txt` | 10+ paraphrases of "enter developer mode" | WARNING |
| `synonym-role-hijacking.txt` | 10+ paraphrases of "you are now..." | WARNING |
| `synonym-prompt-reveal.txt` | 10+ paraphrases of "show your system prompt" | WARNING |
| `clean-similar-language.txt` | Legitimate text using similar vocabulary | Clean (FP control) |

**Scanner**: Expand SYNONYM_PATTERNS from 3 to 15+ patterns across 5 categories.

---

### C3. TPI-13 — Payload Fragmentation Enhancements

**Fixtures** (add to `encoded/`, 3 files):

| File | Content | Severity |
|------|---------|----------|
| `numbered-sequence-attack.txt` | Numbered list where items combine into injection | WARNING |
| `formal-logic-complex.txt` | Complex logic notation (set theory, predicate logic) | INFO |
| `pseudomath-override.txt` | Mathematical notation encoding override instructions | INFO |

**Scanner**: Add numbered sequence detection, enhance math encoding patterns.

---

### C4. TPI-15 — Multilingual Expansion

**Fixtures** (add to `web/`, 6 files):

| File | Content | Severity |
|------|---------|----------|
| `multilingual-fr-de.html` | French + German injection vectors | CRITICAL |
| `multilingual-pt-it.html` | Portuguese + Italian injection vectors | CRITICAL |
| `multilingual-ja-ko.html` | Japanese + Korean injection vectors | CRITICAL |
| `multilingual-ar.html` | Arabic injection (RTL challenges) | CRITICAL |
| `multilingual-romanized.txt` | Romanized transliterations of CJK/Cyrillic | WARNING |
| `clean-multilingual.html` | Legitimate multilingual content | Clean (FP control) |

**Scanner**: Expand MULTILINGUAL_PATTERNS from 10 (1 per language) to 40 (4 categories per language: SYSTEM_OVERRIDE, CONSTRAINT_REMOVAL, MODE_SWITCHING, ROLE_HIJACKING).

---

### C5. TPI-17 — Whitespace & Formatting Evasion

**Fixtures** (add to `encoded/`, 5 files):

| File | Content | Severity |
|------|---------|----------|
| `exotic-whitespace.txt` | Vertical tab, form feed, Unicode line/paragraph separators | INFO |
| `braille-obfuscation.txt` | Braille characters U+2800-U+28FF hiding injection | WARNING |
| `mongolian-fvs.txt` | Mongolian free variation selectors U+180B-U+180D | INFO |
| `tab-padding.txt` | Tab characters padding injection between words | INFO |
| `clean-unicode-text.txt` | Legitimate Unicode content with CJK, emoji, diacritics | Clean (FP control) |

**Scanner**: Expand WHITESPACE_PATTERNS from 1 to 4 (add Braille range, Mongolian FVS, tab normalization).

---

### C6. TPI-20 — OGG Fixture + XML Entity Expansion

**Fixtures** (add to `audio/`, 1 file):

| File | Content | Severity |
|------|---------|----------|
| `ogg-vorbis-injection.ogg` | OGG Vorbis comment with injection payload | WARNING |

**Scanner**: Add XML entity expansion pattern for SVG (`<!ENTITY`, `<!DOCTYPE` with entities).

---

## Phase D: Lab Infrastructure (Future — not in this plan)

Tracked in gap doc for later:
- Session Simulator tab (multi-turn testing)
- PostToolUse Simulator tab
- Binary Inspector enhancements (EXIF tag-by-tag, PNG chunk display)
- Dynamic coverage computation

---

## Summary Metrics

| Metric | Before | After Phase A | After Phase B | After Phase C |
|--------|--------|---------------|---------------|---------------|
| Fixture files | 39 | 51 | 88 | 110 |
| Fixture categories | 6 | 8 | 12 | 12 |
| Scanner pattern groups | 9 + 8 special | 12 + 8 special | 14 + 8 special | 14 + 11 special |
| Individual patterns | ~85 | ~97 | ~130 | ~170 |
| PAYLOAD_CATALOG entries | 22 | 25 | 30 | 35 |
| Stories with FULL coverage | 4 | 4 | 8+ | 15+ |
| Stories with MISSING coverage | 4 | 1 | 0 | 0 |

---

## Verification Steps

After each phase:

1. `node generate-fixtures.js` — Regenerate all fixtures, verify count matches expected
2. `node serve.js` — Start server on port 8089
3. Open http://localhost:8089/ and verify:
   - **Fixtures tab**: New categories appear with correct file counts
   - **Scanner tab**: Test each new quick-load payload fires expected patterns
   - **Scan each attack fixture**: Should produce findings (verdict = BLOCK)
   - **Scan each clean fixture**: Should produce NO findings (verdict = ALLOW)
   - **Coverage map**: Gap percentages updated
   - **Pattern Reference**: New pattern groups listed
4. Performance: All scans complete in <50ms for <10KB input

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-12 | Initial implementation plan |
