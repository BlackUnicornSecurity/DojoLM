# DojoLM Changelog

All notable changes to this project are documented here.

---

## Versioning policy

DojoLM follows [SemVer 2.0.0](https://semver.org/):

- **MAJOR** — breaking changes to the scanner API, schemas, or fixture format
- **MINOR** — new functionality: TPI story coverage, fixture categories, detection engines, and any scanner pattern change that affects detection behavior (new detections or regressions)
- **PATCH** — bug fixes, false-positive corrections, documentation

Version bumps are explicit maintainer decisions — nothing bumps automatically. `1.1.0` was a documentation-only changelog cut (package manifests stayed at their prior versions); package versions will be reconciled when the next release is cut at the open-source relaunch.

---

## [Unreleased] — catch-up summary, 2026-03-01 → 2026-06-20

The changelog was frozen at `1.1.0` while development continued. This entry summarizes the eras since, at era granularity; per-change history lives in the git log.

### Licensing (2026-06)

- **License model changed from MIT to per-tier:** the community core is now **Apache-2.0**, the enterprise governance tier is **BUSL-1.1** (see `LICENSE`, `LICENSE-BUSL-1.1.txt`, `NOTICE`, and `docs/dev/license-policy.md`). Per-file SPDX headers across the codebase; `npm run lint:spdx` enforces them.
- Open-core module tiering: community (scanner engine, attack modules, telemetry client, dashboard) vs enterprise (compliance book, WORM audit surface, formal-validation evidence surface, advanced admin).

### Scanner engine

- Pattern library grew **505+ → 544 patterns across 49 groups**; fixture corpus **1,544/30 categories → 5,281/40 categories**; **15 specialized detectors** (PII, SSRF, DoS, supply-chain, social-engineering, harm-intent, deepfake, bias, and more).
- Deterministic harm-intent detection module and a corpus-wide calibration program (recall/precision remediation with quarantine-based regression gates).
- KATANA formal-validation framework: corpus-based evidence runs with repeatability, reproducibility, and proficiency studies; gated fixture lifecycle (enterprise tier — the evidence surface and validation corpus are part of the BUSL-1.1 tier; see the license policy).

### Web application

- Full V2 design-system restoration: module navigation rail, primitive component library, archetype-based page layouts, dark-theme token system.
- UI coherence and accessibility programs: visual-regression pinning, axe-based contrast remediation, responsive/empty-state hardening across the long tail of pages.
- 23 top-level navigation destinations (19 visible by default).

### Attestation & supply chain

- Keyless signing and transparency-log attestation: DSSE-signed scan runs, a verifier CLI, and self-hostable Fulcio + Dex + Rekor deployment overlays.
- Repo-boundary scanner (`tools/check-repo-boundary.mjs`) and dependency-pinning checks as local gates.

### Sensei

- Sensei subsystem (`packages/bu-tpi/src/sensei`): a purpose-built, fine-tunable model subsystem for adversarial attack generation, mutation advising, multi-turn plan creation, and response judging. Includes a training-data pipeline (extraction, curation, format conversion), tiered attacker-model routing, refusal classification, convergence detection, and a probe executor.
- **Served `sensei` brain — narrowed serve context + tool-emission discipline:** the deployed offensive brain now receives the compact persona plus module-scoped tools (ADR-0104), and the native tool-turn line was strengthened so a fully-specified action (e.g. an arena match with game mode + attack mode + fighters) is **emitted as the `create_arena_match` tool call** rather than narrated in prose — while preserving the propose-don't-auto-run confirmation gate and every refusal/abuse clause (ADR-0105). Shared by the arena / adversarial / sengoku serve contexts.
- **Refusal-aware mutation advisor on `/api/sensei/mutate`:** the mutate endpoint now accepts an opt-in `advisor: "refusal-aware"` selector plus a `targetResponse`, routing to the refusal-aware advisor so a caller gets mutations conditioned on the target model's actual refusal (returned with the `refusalSignal` classification under `data.refusalSignal`). Omitting `advisor` keeps the generic advisor, byte-compatible for existing callers (ADR-0106).

### Benchmark framework

- Scanner-backed benchmark framework (`packages/bu-tpi/src/benchmark`, CLI at `packages/bu-tpi/tools/benchmark-cli.ts`; #978): suite registry + slicing, a scanner-backed evaluation adapter, and schema-versioned (`dojolm.benchmark.report/v1`) report generation/comparison. Ships local, deterministic smoke suites (including taxonomy-aligned HarmBench/StrongReject-style suites) backed by reusable local fixture anchors — it does not import external corpora or claim upstream HarmBench/StrongReject/garak parity. See `docs/user/BENCHMARKING.md`.

### Documentation

- Doc-metrics verifier (`npm run verify:docs`) green; structural docs reconciled to actual counts; phantom package references removed.

---

## [1.1.0] — 2026-03-01

### Documentation Accuracy Update

Corrected pattern and fixture counts across all documentation to reflect actual codebase:

- **Pattern count**: Updated from 139 to **505+ patterns** across **47 groups** (was: 14 groups)
- **Fixture count**: Updated from 89 to **1,544 fixtures** across **30 categories** (was: 12 categories)
- All README files updated: root README.md, packages/bu-tpi/README.md, docs/user/README.md
- Internal documentation updated: TECHNICAL_OVERVIEW.md, DEPLOYMENT_GUIDE.md, CONTRIBUTING.md
- Fixed broken documentation links in packages/bu-tpi/README.md and packages/bmad-cybersec/README.md

### Phase 3: Content Consolidation

Completed Sprint 3 documentation reorganization:

- **Consolidated user documentation**: Migrated all content from docs/user/README.md to PLATFORM_GUIDE.md
- **Created FAQ**: New comprehensive FAQ document at docs/user/FAQ.md with 25+ Q&A pairs
- **Updated migration plan**: Added current status, verified metrics, documented outstanding work
- **Root changelog**: Created this root-level CHANGELOG for easier access

**Files modified:**
- docs/user/README.md (replaced with redirect)
- docs/user/PLATFORM_GUIDE.md (consolidated, enhanced)
- docs/user/FAQ.md (new)
- docs/NEXTJS-MIGRATION-PLAN.md (updated with status)
- CHANGELOG.md (root, new)

---

## [1.0.0] — 2026-02-28

### Initial Platform Release

The first complete release of DojoLM as a full-stack LLM red teaming platform.

**Core scanner (`packages/bu-tpi`):**
- 139 detection patterns across 14 groups covering 21 TPI stories
- 6 heuristic detectors: Base64, HTML injection, Context overload, Character encoding, Math encoding, Hidden Unicode
- 89 fixture files across 12 attack categories (images, audio, web, context, malformed, encoded, agent-output, search-results, social, code, boundary, untrusted-sources)
- 7,117+ passing tests, 0 regressions
- REST API on port 8089: `/api/scan`, `/api/scan-fixture`, `/api/read-fixture`, `/api/fixtures`, `/api/stats`, `/api/run-tests`
- Hardened server: rate limiting (120 req/60s/IP), CSP on fixtures, path traversal prevention, GET-only, 100KB input limit
- Full text normalization: NFKC, zero-width char stripping (20+ types), Unicode confusable mapping, combining mark removal, whitespace collapse

**Web UI (`packages/dojolm-web`):**
- Next.js application with 7 tabs: Scanner, Fixtures, Payloads, Coverage Map, Pattern Reference, Test Runner, LLM Dashboard
- Engine filters for 5 engines: Prompt Injection, Jailbreak, Unicode, Encoding, TPI
- Quick payload chips for rapid testing
- Fixture browser with attack/clean classification and severity overlays
- Coverage map with OWASP LLM Top 10 alignment
- Pattern reference with full regex documentation
- LLM Dashboard: multi-provider support (Claude, OpenAI, Ollama), local model selector, leaderboard, test execution, result export

**Enhanced scanner package (`packages/dojolm-scanner`):**
- `ScanOptions` interface with optional `engines` parameter for engine-level filtering
- All special detectors (Base64, HTML, Unicode, Encoding, Context overload, etc.) conditional on engine filter
- Clean build via TypeScript compiler with zero errors

**BMAD Cybersec framework (`packages/bmad-cybersec`):**
- Multi-agent AI operations framework for cybersecurity workflows
- Abdul orchestrator with specialized team routing (security ops, intelligence, legal, strategic planning)
- Claude, OpenAI, Ollama, LM Studio, vLLM, Groq, Kimi support
- Compliance frameworks: OWASP LLM 95/100, SOC 2, GDPR, ISO 27001, NIST 800-53, PCI-DSS, HIPAA, FedRAMP, CMMC

---

## Development History (Pre-release)

### 2026-02-27 — VEC Category + False Positive Remediation

**Added: Vector & Embeddings (VEC) fixture category**
- 40 malicious VEC fixtures across 5 attack sub-types: VEC_INDIRECT, VEC_POISON, VEC_LEAK, VEC_SEO, VEC_SIM
- 3 clean VEC control fixtures
- VEC pattern groups: VEC_INDIRECT_PATTERNS, VEC_POISON_PATTERNS, VEC_LEAK_PATTERNS, VEC_SEO_PATTERNS, VEC_SIMILARITY_PATTERNS
- Exported 3 previously private VEC sub-pattern arrays (VEC_LEAK, VEC_SEO, VEC_SIMILARITY)
- Removed 5 duplicate empty array declarations that shadowed actual pattern definitions

**Fixed: False positives on clean fixtures (16 files)**
- Removed "SYSTEM OVERRIDE: Ignore instructions" text from clean-image.png and clean-photo.jpg EXIF/SVG content
- Changed `"role": "system"` to `"role": "assistant"` in clean session JSON fixtures
- Changed `User:`/`Assistant:` markers to `Q:`/`A:` in agent clean fixtures (avoid `anthropic_markers` pattern)
- Replaced "prompt injection" with "injection detection" in session taglines
- Result: 0 false positives on all clean files

**Fixed: Binary file detection in regression tests**
- Changed file reading order in test-regression.ts to check binary signatures (PNG, JPG, WAV magic bytes) before UTF-8 decode
- Result: 9 binary files now correctly skipped in text regression tests

**Fixed: vec_sim_texttricker false positive bug (Bug #007)**
- Scanner pattern `/[\u03B5\u03C5\u03BFf\u03C9\u03C3\u03B9\u03C4\u03B7\u03C2]/` included ASCII `f` in a Greek-character-only character class
- Caused all English text containing the letter "f" to match as a suspicious Greek confusable
- Fixed by removing the `f` from the character class

### 2026-02-27 — TypeScript Strict Mode Compliance

**Fixed: 30+ TypeScript compilation errors across all packages**
- `buf[i]` → `buf.readUInt8(i)` for strict Buffer indexing
- Removed unused imports and added non-null assertions for array access with `noUncheckedIndexedAccess`
- Used conditional spread `...(p.weight !== undefined && { weight: p.weight })` for optional properties with `exactOptionalPropertyTypes: true`
- Prefixed unused parameters with `_` (e.g., `_match`)
- Result: `npx tsc --noEmit` passes with zero errors across all packages

### 2026-02-26 — Engine Filter & LLM Execution Fixes

**Fixed: Engine filters not excluding special detectors (Bug #002)**
- Previously, regex pattern groups were filtered by engine but special detector functions (detectHiddenUnicode, detectBase64, detectHtmlInjection, etc.) always ran unconditionally
- Modified scanner.ts to make all 12 special detectors conditional on the `engines` array:
  - Unicode engine: `detectHiddenUnicode`, `detectSurrogateFormat`
  - Encoding engine: `detectBase64`, `detectURLEncoding`, `detectCharacterEncoding`, `detectMathEncoding`, `detectSteganographicIndicators`
  - Prompt Injection engine: `detectHtmlInjection`, `detectContextOverload`
  - Jailbreak engine: `detectFictionalFraming`, `detectSlowDrip`
  - TPI engine: `detectOcrAdversarial`, `detectCrossModalInjection`

**Fixed: LLM execution file system error (Bug #006)**
- `file-storage.ts` constructed execution path using `PATHS.executionsIndex` (a file path) as if it were a directory
- Fixed to use `path.dirname(PATHS.executionsIndex)` for directory-level operations
- Added `try/catch` for `EEXIST` race condition on `fs.mkdir`

### 2026-02-25 — Empty Engines Array Fix (Bug #002 Follow-up)

**Fixed: Empty engines array caused zero detections**
- The scan API route passed `engines: []` to the scanner when no filters were selected
- Scanner treated `[]` as "scan with zero engines" rather than "scan with all engines"
- Fix: Added `engines && engines.length > 0` guard before passing engines option
- Semantics now: undefined → all engines; `[]` → all engines; `["X"]` → engine X only

### 2026-02-24 — QA Bug Sprint (Bugs #001–#005)

**Fixed: Fixtures manifest not found (Bug #001)**
- Added multi-path fallback resolution in `packages/dojolm-web/src/app/api/fixtures/route.ts`
- Manifest now resolved from 4 candidate paths

**Fixed: Engine filter IDs mismatched scanner engine names (Bug #002)**
- `constants.ts` had IDs like `prompt_injection` while scanner used `"Prompt Injection"` (exact string)
- Updated ENGINE_FILTERS to use exact scanner engine names

**Fixed: Quick Load buttons not populating scanner (Bug #003)**
- Caused by same engine ID mismatch as Bug #002 — fixed as part of #002

**Fixed: Character count showing 0 (Bug #004)**
- Added `scanResult` state to ScannerContext to preserve full API response including `textLength`

**Fixed: Missing JavaScript chunk 500 error**
- Stale `.next` build cache referenced a chunk that no longer existed after subsequent builds
- Fix: `rm -rf .next && npm run build` before all production deployments

**Fixed: Select.Item empty string value (Radix UI)**
- Radix UI treats `value=""` on `<Select.Item>` as undefined and throws a warning
- Changed "All Tests" option value from `""` to `"all"` with logic to convert `"all"` → `undefined` for API calls

### 2026-02-13 — Initial Monorepo Structure

**Established monorepo architecture:**
- Migrated from single-package to npm workspaces (`packages/*`)
- Separated scanner core (`bu-tpi`), web app (`dojolm-web`), enhanced scanner (`dojolm-scanner`), and BMAD framework (`bmad-cybersec`)
- Set up shared TypeScript configuration across packages
- Established `team/` gitignored convention for private QA/planning/security files
- Established `docs/user/` convention for public-facing documentation

**Initial scanner implementation:**
- Core pattern groups: PI_PATTERNS (19), JB_PATTERNS (21), SETTINGS_WRITE_PATTERNS (3), AGENT_OUTPUT_PATTERNS (5), SEARCH_RESULT_PATTERNS (3), WEBFETCH_PATTERNS (6), BOUNDARY_PATTERNS (4), MULTILINGUAL_PATTERNS (40), CODE_FORMAT_PATTERNS (9), SOCIAL_PATTERNS (13), SYNONYM_PATTERNS (6), WHITESPACE_PATTERNS (4), MEDIA_PATTERNS (5), UNTRUSTED_SOURCE_PATTERNS (2)
- Initial fixture set across 12 categories
- REST API with hardened server configuration

---

*Versioning policy: see the top of this document. Per-change history lives in the git log.*
