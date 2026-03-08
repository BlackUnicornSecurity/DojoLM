# NODA Platform — Frequently Asked Questions (FAQ)

**Last Updated:** 2026-03-03

This document answers common questions about NODA Platform (DojoLM), its features, usage, and troubleshooting.

---

## Table of Contents

1. [General Questions](#general-questions)
2. [Installation & Setup](#installation--setup)
3. [Scanner Usage](#scanner-usage)
4. [Understanding Results](#understanding-results)
5. [Performance & Optimization](#performance--optimization)
6. [Integration](#integration)
7. [Development & Contributing](#development--contributing)
8. [Troubleshooting](#troubleshooting)

---

## General Questions

### What is DojoLM?

**NODA** (formerly DojoLM) is a comprehensive LLM red teaming and security testing platform. The name combines "Dojo" (a place for immersive training and practice in martial arts) with "LM" (Language Models), representing a focused environment for testing, training, and hardening AI systems against adversarial attacks. NODA is the platform brand encompassing 12 specialized security modules.

### Who is DojoLM for?

DojoLM is designed for:
- **Security researchers** testing LLM vulnerabilities
- **AI developers** hardening their applications against prompt injection
- **Red teams** evaluating AI system security
- **Compliance teams** verifying OWASP LLM Top 10 coverage
- **LLM operators** monitoring production inputs for attacks

### What is the CrowdStrike TPI Taxonomy?

The **Taxonomy of Prompt Injection (TPI)** is CrowdStrike's comprehensive classification system for prompt injection attacks. It defines 21 distinct attack stories covering:
- Direct system overrides (TPI-PRE-4)
- Web fetch output injection (TPI-02)
- Social engineering (TPI-06, TPI-07, TPI-08)
- Encoding attacks (TPI-10, TPI-13, TPI-17)
- Media metadata injection (TPI-18, TPI-20)
- And more...

DojoLM implements detection for all 21 TPI stories.

### What does "DojoV2" or "Version 3.0" mean?

Version 3.0 (internally called DojoV2) extends the original TPI coverage with 460+ additional fixtures covering:
- **OWASP LLM Top 10** — 100% coverage
- **MITRE ATLAS** tactics
- **NIST AI RMF** risks
- **ENISA AI** threats

Version 4.0 (NODA-3, released 2026-03-06) adds 12 modules, the Belt system, BAISS unified standard, Ronin Hub, LLM Jutsu, Black Box Analysis, Adversarial Skills Library, and audio attack expansion.

### Is DojoLM open source?

The project is currently **UNLICENSED / Private**. See the repository for current licensing status.

---

## Installation & Setup

### What are the system requirements?

| Requirement | Minimum Version |
|-------------|----------------|
| Node.js | 20.0.0 |
| npm | 10.0.0 |
| TypeScript | 5.3.0 (dev dependency) |

### How do I install DojoLM?

```bash
git clone https://github.com/dojolm/dojolm.git
cd dojolm
npm install
```

This installs dependencies for all workspaces. Node modules are hoisted to the root where possible.

### Do I need to build anything?

**No build step is required** for the scanner. The TypeScript files are executed directly via `tsx`:

```bash
npm start --workspace=packages/bu-tpi
```

The web UI (`dojolm-web`) does require a build for production:

```bash
cd packages/dojolm-web
npm run build
```

### What are the fixture files and do I need to generate them?

Fixtures are 1,544 attack artifact files used for testing. They should already be present in `packages/bu-tpi/fixtures/`. If not, or after making changes to `generate-fixtures.ts`, run:

```bash
npm run generate --workspace=packages/bu-tpi
```

> ⚠️ Always run `npm run generate` after cloning and after any fixture changes.

### Which port does the scanner run on?

The scanner API runs on **port 8089** by default. You can specify a custom port:

```bash
npx tsx packages/bu-tpi/src/serve.ts 9000
```

### How do I run both the scanner and web UI?

You need two terminals:

```bash
# Terminal 1: Scanner API (required by web app)
npm start --workspace=packages/bu-tpi

# Terminal 2: Next.js dev server
npm run dev:web
```

The web UI will be available at `http://localhost:3000`.

---

## Scanner Usage

### How do I scan text for prompt injection?

**Via API:**
```bash
curl "http://localhost:8089/api/scan?text=ignore+all+previous+instructions"
```

**Via Web UI:**
1. Open `http://localhost:3000`
2. Go to the **Haiku Scanner** module
3. Paste your text
4. Click "Scan"

### What are the engine filters?

Engine filters let you scope detection to specific attack types:

| Engine | Detects |
|--------|---------|
| Prompt Injection | Direct override attempts, system hijacking |
| Jailbreak | DAN and roleplay-based restriction bypass |
| Unicode | Zero-width chars, confusable substitution |
| Encoding | Base64, ROT13, URL encoding, steganography |
| TPI | Advanced attack classes: OCR adversarial, context overload |

### What happens if I don't select any engine filters?

If no engines are selected, **all engines are active** — the scanner uses its full detection capability.

### How do I scan a fixture file?

```bash
curl "http://localhost:8089/api/scan-fixture?path=social/authority-impersonation.txt"
```

### Can I read the raw content of a fixture?

Yes:

```bash
curl "http://localhost:8089/api/read-fixture?path=social/authority-impersonation.txt"
```

For binary files (images, audio), this returns metadata including hex preview and extracted text.

---

## Understanding Results

### What's the difference between BLOCK, WARN, and ALLOW?

| Verdict | Meaning | When It Triggers |
|---------|---------|------------------|
| **BLOCK** | Confirmed injection attempt | Any CRITICAL severity finding |
| **WARN** | Suspicious — review before use | Any WARNING finding (no CRITICAL) |
| **ALLOW** | Clean text | No findings, or only INFO |

### What is cross-category escalation?

Even if no single finding is high severity, DojoLM will escalate to WARNING if:
- More than **5 INFO findings** across **more than 3 different categories**

This catches fragmented and multi-vector attacks that might otherwise slip through.

### What do the severity levels mean?

| Severity | Description | Example |
|----------|-------------|---------|
| **CRITICAL** | Direct system compromise | "Ignore all previous instructions" |
| **WARNING** | Suspicious patterns requiring review | Encoded payloads, unusual Unicode |
| **INFO** | Notable but not inherently dangerous | Common formatting patterns |

### Why did my clean text get flagged?

Possible reasons:

1. **False positive** — A pattern is too broad. Report this as a bug.
2. **Encoded content** — Base64 or other encoding in your text decodes to suspicious content
3. **Special characters** — Zero-width characters or Unicode confusables
4. **Structure similarity** — Your text structurally resembles an attack (e.g., many instruction-like sentences)

To verify: Check if the finding makes sense given your text content. If not, it may be a false positive that needs pattern tuning.

### What's the difference between "pattern" and "engine"?

- **Pattern** — A specific regex rule (e.g., `ignore_instructions`)
- **Engine** — A category of detection (e.g., "Prompt Injection", "Unicode")

One engine contains many patterns. For example, the "Prompt Injection" engine includes patterns for system override, role hijacking, and instruction ignoring.

### What TPI stories are covered?

All 21 TPI stories are covered:

| Story | Name | Coverage |
|-------|------|----------|
| TPI-PRE-4 | Settings.json Write Protection | ✅ Patterns + Fixtures |
| TPI-02 | WebFetch Output Injection | ✅ Patterns + Fixtures |
| TPI-03 | Agent-to-Agent Output Validation | ✅ Patterns + Fixtures |
| TPI-04 | Context Window Injection | ✅ Patterns + Fixtures |
| TPI-05 | WebSearch Output Validation | ✅ Patterns + Fixtures |
| TPI-06 | Social Engineering Detection | ✅ Patterns + Fixtures |
| TPI-07 | Trust & Rapport Exploitation | ✅ Patterns + Fixtures |
| TPI-08 | Emotional Manipulation | ✅ Patterns + Fixtures |
| TPI-09 | Code-Format Injection | ✅ Patterns + Fixtures |
| TPI-10 | Character-Level Encoding | ✅ Patterns + Decoders |
| TPI-11 | Context Overload | ✅ Patterns + Heuristics |
| TPI-12 | Synonym Substitution | ✅ Patterns + Fixtures |
| TPI-13 | Payload Fragmentation | ✅ Patterns + Fixtures |
| TPI-14 | Control Tokens & Boundaries | ✅ Patterns + Fixtures |
| TPI-15 | Multilingual Injection | ✅ 40+ patterns (10 langs) |
| TPI-17 | Whitespace & Formatting Evasion | ✅ Patterns + Fixtures |
| TPI-18 | Image Metadata Injection | ✅ Patterns + Fixtures |
| TPI-19 | Format Mismatch / Polyglots | ✅ Patterns + Binary Analysis |
| TPI-20 | Audio/Media Metadata | ✅ Patterns + Fixtures |
| TPI-21 | Untrusted Source Indicators | ✅ Patterns + Fixtures |

---

## Performance & Optimization

### How fast is the scanner?

Scanning typically completes in **1-3 milliseconds** for text inputs up to 100KB. The API response includes an `elapsed` field showing the exact time.

### What's the maximum input size?

**100KB** maximum on `/api/scan`. Larger inputs will be rejected with a 413 error.

### Does the scanner use a lot of memory?

No. The scanner:
- Has **zero runtime dependencies**
- Loads patterns once at startup
- Processes text in a single pass
- Uses streaming for binary file analysis

### How many patterns are there?

- **505+ patterns** across **47 groups**
- Plus **6 heuristic detectors** (Base64, HTML injection, Context overload, etc.)

### What are the rate limits?

**120 requests per 60 seconds per IP**. This applies to all endpoints.

---

## Integration

### How do I integrate DojoLM with my LLM application?

**Option 1: Pre-filter inputs**
```javascript
const result = await fetch('http://localhost:8089/api/scan?text=' + encodeURIComponent(userInput));
const data = await result.json();

if (data.verdict === 'BLOCK') {
  return "Input rejected: potential prompt injection detected";
}
// Proceed to LLM
```

**Option 2: Post-process LLM outputs**
Scan LLM outputs before displaying them to users, especially for agent-to-agent communication.

**Option 3: Use as a benchmark**
Test your LLM against the fixture library to understand its vulnerabilities.

### Can I use DojoLM with Ollama?

Yes. Add the scanner endpoints to your Ollama system prompt (see [Integrating with a Local LLM](./PLATFORM_GUIDE.md#integrating-with-a-local-llm) in the Platform Guide).

### Can I deploy to Vercel?

The **web UI** (`dojolm-web`) can be deployed to Vercel. The **scanner API** (`bu-tpi`) is a long-running Node.js process and is not suited for serverless deployment. Host it on a persistent server and point the web app's `SCANNER_API_URL` at it.

### What's the Docker setup?

See `packages/dojolm-web/Dockerfile` for the web UI Docker configuration. The scanner can run in a container but requires the fixture files to be present.

---

## Development & Contributing

### How do I add a new pattern?

1. Add the regex pattern to the appropriate pattern group in `packages/bu-tpi/src/scanner.ts`
2. Create an attack fixture that triggers the pattern
3. Create a clean fixture that does NOT trigger it
4. Run the regression suite: `npm run test:api`
5. Run the false-positive suite to ensure no regressions

See [github/CONTRIBUTING.md](../../github/CONTRIBUTING.md) for detailed guidelines.

### What should I read before contributing?

**Read `team/lessonslearned.md`** — Every non-trivial bug we've hit is documented there with root cause and prevention.

### How do I run the tests?

```bash
# TypeScript check
npm run typecheck

# Start scanner (required for API tests)
npm start --workspace=packages/bu-tpi

# Full regression
curl "http://localhost:8089/api/run-tests?filter=regression"

# False positive check
curl "http://localhost:8089/api/run-tests?filter=false-positive"
```

### What's the monorepo structure?

```
packages/
├── bu-tpi/              # Core scanner (TypeScript, zero deps, port 8089)
├── dojolm-scanner/      # Enhanced scanner package (web integration)
├── dojolm-web/          # Next.js web app (port 3000)
├── dojolm-mcp/          # Model Context Protocol server
└── bmad-cybersec/       # Multi-agent cybersecurity operations framework
```

---

## Troubleshooting

### "api/fixtures returns empty or 404"

**Cause:** Fixtures manifest not generated  
**Fix:**
```bash
npm run generate --workspace=packages/bu-tpi
```

### "Engine filters have no effect"

**Cause:** Stale build or wrong engine IDs  
**Fix:** 
1. Verify `ENGINE_FILTERS` in `constants.ts` use exact engine names: `"Prompt Injection"`, `"Jailbreak"`, `"Unicode"`, `"Encoding"`, `"TPI"`
2. Rebuild the web app: `rm -rf .next && npm run build`

### "Scan returns ALLOW for obvious injection"

**Cause:** Empty engines array passed to scanner  
**Fix:** Check that your code uses the guard: `engines && engines.length > 0` before passing the engines option

### "Web app shows 500 for static JS chunk"

**Cause:** Stale `.next` cache  
**Fix:**
```bash
cd packages/dojolm-web
rm -rf .next
npm run build
```

### "Scanner detects injection in clean content"

**Cause:** False positive in fixtures or new pattern too broad  
**Fix:**
1. Run false-positive suite: `curl "http://localhost:8089/api/run-tests?filter=false-positive"`
2. Check new patterns against clean English text

### "EEXIST error on LLM execution"

**Cause:** Path construction error (file path treated as directory)  
**Fix:** Use `path.dirname()` for file-path constants

### "TypeScript errors on build"

**Cause:** Strict mode violations  
**Fix:**
- Use `buf.readUInt8(i)` instead of `buf[i]` for buffer access
- Use conditional spread for optional properties: `...(p.weight !== undefined && { weight: p.weight })`

### "Fixture scan returns empty findings for binary file"

**Cause:** Binary file read as UTF-8 text  
**Fix:** Ensure files are read as Buffer first, magic bytes checked, then decoded

### "LLM Dashboard can't connect to my model"

**Check:**
1. For Ollama: Is it running? `ollama serve`
2. Is `OLLAMA_BASE_URL` set correctly in `.env.local`?
3. For cloud providers: Is your API key set?

---

## NODA Modules

### What are the NODA modules?

The NODA platform consists of 12 specialized modules:

1. **NODA Dashboard** — Central command with customizable widgets and threat overview
2. **Haiku Scanner** — Core prompt injection detection engine (505+ patterns, 23+ modules)
3. **Armory** — Test fixture management, browsing, and comparison (formerly Test Lab)
4. **Bushido Book** — Compliance center with 28 frameworks across 5 tiers and audit trails (formerly Compliance Center)
5. **LLM Dashboard** — Multi-provider LLM security testing with batch execution
6. **Atemi Lab** — Adversarial red teaming with MCP integration (formerly Adversarial Lab)
7. **The Kumite** — Strategic analysis hub with SAGE, Arena, and Mitsuke (formerly Strategic Hub)
8. **Amaterasu DNA** — Attack lineage analysis with family trees and Black Box Analysis (formerly AttackDNA)
9. **Hattori Guard** — Input/output protection with 4 guard modes (formerly LLM Guard)
10. **Ronin Hub** — Bug bounty platform for security researchers
11. **LLM Jutsu** — LLM testing command center with model cards and aggregation
12. **Admin** — System settings, API keys, export, and scanner configuration

### What is the Belt system?

The Belt system ranks security posture using 7 levels inspired by martial arts: White, Yellow, Orange, Green, Blue, Brown, and Black. Belt rank is calculated based on overall security scores across scanner, compliance, and LLM testing results.

### What is BAISS?

**BAISS** (BlackUnicorn AI Security Standard) is a unified compliance standard v2.0 with 45 controls across 10 categories. It maps 28 source frameworks — including OWASP LLM Top 10, NIST AI 600-1, MITRE ATLAS, ISO 42001, EU AI Act, ENISA, plus 22 additional standards (NIST 800-218A, ISO 23894/24027/24028, Google SAIF, CISA/NCSC, SLSA, ML-BOM, OpenSSF, GDPR, and more) — into a single actionable checklist with bidirectional navigation.

### What is Black Box Analysis?

Black Box Analysis is an ablation study engine in the Amaterasu DNA module. It systematically removes components from attack patterns to identify which elements are essential for detection, producing token heatmaps and impact charts.

### What is the Adversarial Skills Library?

The Adversarial Skills Library in Atemi Lab provides 40 adversarial skills organized across 6 playbooks. Skills are categorized by difficulty, OWASP mapping, and attack type, and execute in a sandboxed environment with structured severity output.

---

## Additional Resources

- [Platform Guide](./PLATFORM_GUIDE.md) — Complete user documentation
- [Contributing Guide](../../github/CONTRIBUTING.md) — Contribution guidelines
- [Testing Checklist](../app/testing-checklist.md) — Testing procedures
- [Deployment Guide](../../internal/DEPLOYMENT_GUIDE.md) — Deployment instructions
- [Lessons Learned](../../internal/LESSONS_DIGEST.md) — Engineering lessons

---

*Can't find your question? Open a GitHub Discussion or check the internal documentation in `internal/`.*
