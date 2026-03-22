# Contributing to DojoLM

**DojoLM** is a living security research platform. Contributions that improve detection coverage, add attack fixture realism, expand TPI taxonomy support, or improve the web UI are all welcome.

This guide covers everything you need to contribute effectively.

---

## Before You Start

1. **Check open issues** — Avoid duplicate effort.
2. **Understand the monorepo layout** — Contributions need to land in the right package.
3. **Read the documentation** — Review [Architecture](../docs/ARCHITECTURE.md) and [API Reference](../docs/API_REFERENCE.md) before making changes.

---

## Repository Layout

```
dojolm/
├── packages/
│   ├── bu-tpi/              # Core scanner (TypeScript, zero deps, port 8089)
│   │   ├── src/
│   │   │   ├── scanner.ts   # Detection engine — 505+ patterns, 47 groups, 6 heuristic detectors
│   │   │   ├── serve.ts     # Hardened HTTP server
│   │   │   ├── generate-fixtures.ts  # Fixture generator
│   │   │   └── types.ts     # Shared type definitions
│   │   ├── fixtures/        # 2,375 attack/clean fixture files across 30 categories
│   │   └── tools/           # Test suites
│   ├── dojolm-scanner/      # Enhanced scanner package (web integration)
│   ├── dojolm-web/          # Next.js web app (port 42001)
│   └── bmad-cybersec/       # Multi-agent cybersecurity operations framework
├── docs/
│   └── user/                # All public-facing documentation (this is where user docs live)
├── team/                    # Private: QA, planning, security audits (gitignored)
└── assets/                  # Brand assets
```

**File placement rules:**
- User-facing documentation → `docs/user/`
- Development, QA, security, planning → `team/` (gitignored, never commit)
- Never create new folders at the root without discussion

---

## Package-Specific Guidelines

### `packages/bu-tpi` — Scanner Core

**The scanner is the highest-integrity component.** A false negative means an attack goes undetected. A false positive means legitimate content is blocked. Both are bugs.

**Pattern contributions:**
- Every new pattern must have corresponding test fixtures: at least one attack fixture that triggers BLOCK/WARN, and at least one clean fixture that passes ALLOW
- Use `export const` for all top-level pattern arrays — pattern sub-arrays that aren't exported can't be used externally (this broke VEC patterns in Feb 2026)
- Test your regex against clean English text before submitting — the `vec_sim_texttricker` incident (a pattern matching all text containing the letter "f") shows how easy it is to accidentally create overbroad patterns
- Run `npm run typecheck` before opening a PR — TypeScript strict mode will catch issues the scanner could miss at runtime
- Use `buf.readUInt8(i)` not `buf[i]` for buffer access (strict typing catches `number | undefined`)

**Fixture contributions:**
- Match the existing file naming convention: `category/attack-name.ext` for attacks, `category/clean-description.ext` for negatives
- Never include injection keywords in "clean" fixture files — even as metadata, branding text, or watermarks. Clean files are scanned too.
- Binary fixtures (images, audio) require metadata injection — the scanner extracts text from EXIF, ID3, PNG tEXt chunks, etc.
- Each category directory must have at least one clean/false-positive file

**Server hardening:**
- Never add POST endpoints — the server is GET-only by design
- Rate limit is 120 requests/60 seconds per IP — don't change this without discussion
- Path traversal prevention (`..` blocked) must be preserved in any serve.ts changes

### `packages/dojolm-web` — Next.js Web App

- Engine filter IDs in `src/lib/constants.ts` must match exact scanner engine names (`"Prompt Injection"`, `"Jailbreak"`, `"Unicode"`, `"Encoding"`, `"TPI"`) — mismatches cause silent filter failures (see lessons learned, Feb 2026)
- When passing `engines` to the scanner API, check `engines.length > 0` before passing — an empty array means "no engines" not "all engines"
- Use Radix UI Select components with non-empty, non-undefined values
- Always run `rm -rf .next && npm run build` when testing production behavior — stale build artifacts cause mysterious chunk-not-found 500 errors

### `packages/dojolm-scanner` — Enhanced Scanner

- The `ScanOptions` interface with optional `engines` parameter must be maintained for web compatibility
- When adding new detector functions to the scanner (Base64, HTML injection, Unicode, etc.), check whether they should be filterable by engine and add them to the conditional engine-filter block in `scanner.ts`
- All special detectors should be conditional on the `engines` filter — previously only regex groups were filtered while special detectors always ran

### `packages/bmad-cybersec` — BMAD Framework

- Agent configurations go in `config/`
- Validators go in `validators/`
- Framework modules go in `framework/`
- Never hardcode credentials or API keys in any agent configuration

---

## Pull Request Process

1. **Branch naming:** `fix/short-description`, `feat/short-description`, `docs/short-description`
2. **All tests must pass** before requesting review: `npm test`
3. **TypeScript must compile clean**: `npm run typecheck`
4. **Zero false positives on clean fixtures** — run the regression suite: `npm run test:api` (server must be running)
5. **Document any non-obvious issues** in your PR description for future reference
6. **Never commit** files from `team/` — it is gitignored for a reason (QA evidence, security audit results, internal planning)
7. **Never commit** `node_modules/`, `.next/`, or build artifacts

### PR Description Template

```markdown
## What
[Short description of the change]

## Why
[The problem this solves]

## TPI Coverage
[Which TPI story this affects, if any: TPI-XX]

## Test Evidence
- [ ] New attack fixtures: `fixtures/category/attack-name.ext`
- [ ] New clean fixtures: `fixtures/category/clean-name.ext`
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Regression suite passes: all tests green
- [ ] False positive check: clean fixtures still ALLOW

## Lessons Learned (if applicable)
[Any non-obvious issues encountered — document in PR for future reference]
```

---

## Testing Checklist

Before any PR:

```bash
# 1. TypeScript
npm run typecheck

# 2. Start scanner (required for API tests)
npm start --workspace=packages/bu-tpi

# 3. Full regression
curl "http://localhost:8089/api/run-tests?filter=regression"

# 4. False positive check
curl "http://localhost:8089/api/run-tests?filter=false-positive"

# 5. Fixture coverage
curl http://localhost:8089/api/fixtures | jq '.categories | keys'
```

For web app changes:
```bash
# Clean build
cd packages/dojolm-web && rm -rf .next && npm run build

# Dev server
npm run dev:web
```

---

## TPI Story Coverage Reference

When adding new detection capabilities, map them to the relevant TPI story:

| Story | Name |
|-------|------|
| TPI-PRE-4 | Settings.json Write Protection |
| TPI-02 | WebFetch Output Injection |
| TPI-03 | Agent-to-Agent Output Validation |
| TPI-04 | Context Window Injection |
| TPI-05 | WebSearch Output Validation |
| TPI-06 | Social Engineering Detection |
| TPI-07 | Trust & Rapport Exploitation |
| TPI-08 | Emotional Manipulation |
| TPI-09 | Code-Format Injection |
| TPI-10 | Character-Level Encoding |
| TPI-11 | Context Overload |
| TPI-12 | Synonym Substitution |
| TPI-13 | Payload Fragmentation |
| TPI-14 | Control Tokens & Boundaries |
| TPI-15 | Multilingual Injection |
| TPI-17 | Whitespace & Formatting Evasion |
| TPI-18 | Image Metadata Injection |
| TPI-19 | Format Mismatch / Polyglots |
| TPI-20 | Audio/Media Metadata |
| TPI-21 | Untrusted Source Indicators |

---

## Code of Conduct

DojoLM is a security research platform. All contribution activity must remain clearly educational and defensive in orientation:

- Attack fixtures must model real injection techniques against LLMs — not real attack infrastructure
- No real credentials, no real exploit payloads, no real targets
- Fixture content that crosses into genuine harm (working malware, real credential harvesting, etc.) will be rejected regardless of framing
- The platform is for hardening AI systems — keep contributions aligned with that goal

---

*For questions not covered here, open a GitHub Discussion.*
