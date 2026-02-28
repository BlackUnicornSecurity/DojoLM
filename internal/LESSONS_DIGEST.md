# DojoLM — Engineering Lessons Digest

**Last updated:** 2026-02-28
**Source:** `team/lessonslearned.md` (full raw log)
**Audience:** Engineers joining the project, contributors, anyone debugging the scanner

This is a curated summary of the most important lessons from DojoLM's development. The full raw log with complete context is in `team/lessonslearned.md`.

---

## The Most Important Lessons

### 1. Engine filter IDs must match exact scanner engine strings

The single most impactful bug in the project. `constants.ts` ENGINE_FILTERS used IDs like `prompt_injection` while the scanner used `"Prompt Injection"` (exact casing). The mismatch caused engine filters to silently fail — all engines remained active regardless of what the user selected, and Quick Load buttons stopped working because fixture scanning produced no results.

**Rule:** When the frontend filters by engine name, it does a string comparison against the scanner's engine labels. These must match character for character. Document the canonical engine names in constants with a comment. The correct names are: `"Prompt Injection"`, `"Jailbreak"`, `"Unicode"`, `"Encoding"`, `"TPI"`.

### 2. Empty engines array ≠ all engines

When engine filtering was introduced, an empty array `[]` (meaning "no filters selected — use all engines") was passed directly to the scanner. The scanner treated `[]` as "scan with zero engines" — producing zero detections, returning ALLOW on everything.

**Rule:** Always check `engines && engines.length > 0` before passing the engines option. Semantics: `undefined` → all engines; `[]` → all engines; `["X"]` → engine X only.

### 3. Special detectors must be conditional on engine filters, not just pattern groups

When we first implemented engine filtering, only regex pattern groups were gated on the `engines` array. The 12 special detector functions (detectBase64, detectHiddenUnicode, detectHtmlInjection, etc.) always ran unconditionally.

This meant you could "disable" the Unicode engine via the UI and still get Unicode findings from the special detectors. The fix requires mapping every special detector to its engine and wrapping it in an engine-active check.

**Rule:** Whenever you add a new heuristic detector to scanner.ts, decide which engine it belongs to and add it to the engine-conditional block. Document this mapping in the function.

### 4. Clean fixtures must never contain injection keywords — anywhere

We had `"SYSTEM OVERRIDE: Ignore instructions"` embedded as watermark text in SVG content inside clean image fixtures. The scanner correctly detected it. The clean fixture failed.

We also had `"role": "system"` in clean session JSON files (matching the `agent_json_role` pattern) and `Assistant:`/`User:` conversation markers in clean agent fixtures (matching `anthropic_markers`).

**Rule:** Clean fixtures must be genuinely clean. No injection keywords in metadata, EXIF fields, SVG content, JSON role fields, or any other field the scanner inspects. Test clean fixtures after any scanner pattern addition.

### 5. Always read files as Buffer before type detection

The regression test was reading all files as UTF-8 strings first, then checking content to detect if they were binary. But reading a PNG file as UTF-8 corrupts the bytes before any binary detection can happen.

**Rule:** Read as `Buffer` first. Check magic bytes (`89504E47` = PNG, `FFD8FF` = JPEG, `52494646` = WAV). Only then decode as UTF-8 if the file is text. The test suite had 9 binary files incorrectly treated as text before this fix.

### 6. Always clear `.next` cache before testing production behavior

Three separate bugs were traced to stale `.next` build caches. The most dramatic: a missing JavaScript chunk (`fabadbdb81846c7a.js`) caused complete UI failure — the browser's HTML referenced a chunk file that no longer existed after subsequent builds.

**Rule:** `rm -rf .next && npm run build` before any production test or deployment. Never assume the existing build is clean.

### 7. Verify the fixtures manifest is deployed before testing

The single most common cause of immediate test failure after deployment: the fixtures manifest file (`fixtures-manifest.json`) wasn't generated or wasn't in the expected location.

**Rule:** Always run `npm run generate` in `packages/bu-tpi` after cloning or after fixture changes. The manifest is git-tracked, but verify it's present and current in the deployment environment before running any fixture-dependent tests.

### 8. Regex character classes require careful Unicode audit

The `vec_sim_texttricker` pattern was designed to match Greek lookalike characters. Its character class included `\u03B5\u03C5\u03BFf\u03C9\u03C3\u03B9\u03C4\u03B7\u03C2` — note the literal ASCII `f` mixed in among the Greek escapes. This caused every English sentence containing the letter "f" to trigger a Greek confusable detection.

**Rule:** After writing any regex with Unicode character classes, test it against a plain English paragraph and verify it doesn't match. Use Unicode escape sequences consistently (`\uXXXX`) rather than mixing ASCII literals into Unicode character classes.

### 9. VEC pattern sub-arrays need `export const`, not just `const`

Three VEC pattern sub-arrays (VEC_LEAK_PATTERNS, VEC_SEO_PATTERNS, VEC_SIMILARITY_PATTERNS) were declared as `const` without `export`. They were imported by external code that expected them to be exported. The imports silently got empty arrays instead of an error — no TypeScript error, just missing patterns.

Worse: after the pattern arrays were defined, five additional empty arrays with the same names were declared as `const` at the bottom of the file. These shadowed the originals, overwriting any reference to the name with an empty array.

**Rule:** Check for name shadowing when dealing with large pattern files. Use `export const` at declaration time. Run `grep -n "VEC_LEAK_PATTERNS"` to verify there's only one declaration.

### 10. `path.dirname()` when constructing paths within a file-path constant

`file-storage.ts` had `path.join(PATHS.executionsIndex, executionId + '.json')`. But `PATHS.executionsIndex` is a *file path* (`.../executions/index.json`), not a directory. Joining another filename onto a file path gives you `executions/index.json/exec-123.json` — then `fs.mkdir` on that path fails with EEXIST.

**Rule:** When a constant holds a file path and you need the containing directory, use `path.dirname(constant)`. Add a try/catch for EEXIST around any `fs.mkdir` to handle race conditions gracefully.

---

## Recurring Patterns

These patterns came up multiple times and are worth recognizing quickly:

**The "silent empty result" pattern:** A filter, option, or parameter that's passed incorrectly (wrong string casing, empty array, wrong path) causes the system to silently return empty/zero results rather than an error. These are extremely hard to debug because the system appears to work — it just returns nothing. Always add integration tests that assert non-empty results for known-injection inputs.

**The "stale artifact" pattern:** Cached build artifacts, generated manifest files, or compiled output from a previous version cause test failures or missing features that seem impossible to reproduce. Always regenerate from scratch before reporting a bug.

**The "clean fixture contamination" pattern:** A fixture intended to test false-positive avoidance gets contaminated with an injection keyword in an unexpected field (metadata, SVG content, JSON role, etc.). Add clean-fixture verification to the CI suite and run it after every pattern addition.

---

## Bugs by Severity (Closed)

| Bug | Severity | Description | Fix |
|-----|----------|-------------|-----|
| #001 | CRITICAL | Fixtures manifest not found in deployed env | Multi-path resolution |
| #002 (engine IDs) | CRITICAL | Engine filter IDs didn't match scanner names | Fixed IDs to exact names |
| #002 (empty array) | HIGH | Empty engines `[]` caused zero detections | Length check before passing |
| #002 (special detectors) | HIGH | Special detectors not filtered by engine | Made all 12 detectors conditional |
| #003 | HIGH | Quick Load buttons didn't populate scanner | Fixed by #002 engine ID fix |
| #004 | HIGH | Character count showed 0 | Added scanResult to ScannerContext |
| #005 | LOW | Test Runner UI minimal | Deferred |
| #006 | MEDIUM | LLM execution EEXIST file system error | path.dirname() + try/catch |
| #007 | MEDIUM | vec_sim_texttricker matched ASCII 'f' | Removed 'f' from character class |
| #008 | HIGH | VEC sub-patterns not exported, shadowed | export const + removed duplicates |
| #009 | LOW | 2 VEC fixtures undetected | Fixed fixture content |
| Stale build | CRITICAL | Missing JS chunk caused complete UI failure | rm -rf .next before build |
| Binary decode | MEDIUM | Binary fixtures read as UTF-8 | Buffer-first reading |
| False positives | HIGH | 16 clean fixtures triggered BLOCK | Cleaned fixture content |
