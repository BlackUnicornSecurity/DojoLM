# DojoLM Platform Guide

**DojoLM** is an LLM red teaming and security testing platform. It gives you the tools to test, evaluate, and understand how language models respond to adversarial inputs — before those inputs reach your production systems.

---

## What DojoLM Does

DojoLM detects prompt injection attacks: attempts by adversarial text to hijack LLM behavior by overriding instructions, impersonating authority, encoding payloads, manipulating through social pressure, or exploiting the trust model of agentic systems.

The platform has two main modes:

**1. Scan mode** — Submit any text and get an immediate verdict (BLOCK / WARN / ALLOW) with a detailed breakdown of what patterns triggered, why, and how severe each finding is.

**2. LLM benchmark mode** — Test a local or cloud LLM against the full attack fixture library. See which attack categories your model is vulnerable to, which it resists, and how it compares to other models.

---

## Quick Start

```bash
git clone https://github.com/dojolm/dojolm.git
cd dojolm
npm install

# Option A: Scanner API only (port 8089, zero dependencies)
npm start --workspace=packages/bu-tpi

# Option B: Full web UI (port 3000)
npm run dev:web
```

**Scanner API:** `http://localhost:8089`
**Web UI:** `http://localhost:3000`

---

## The Web Interface

The DojoLM web app has seven tabs.

### Scanner Tab

The core tool. Paste any text into the input field and click Scan. The engine runs 250+ regex patterns plus 6 heuristic detectors and returns a verdict within milliseconds.

**Verdict meanings:**
- **BLOCK** — One or more CRITICAL findings. Treat this text as a confirmed injection attempt.
- **WARN** — One or more WARNING findings, no CRITICAL. Suspicious — review before use.
- **ALLOW** — No significant findings. Text passes the injection filter.

**Engine filters** let you scope detection to specific engines:
- *Prompt Injection* — Direct override attempts, system hijacking, instruction replacement
- *Jailbreak* — DAN and roleplay-based restriction bypass
- *Unicode* — Zero-width chars, confusable character substitution, Unicode tricks
- *Encoding* — Base64, ROT13, ROT47, URL encoding, math notation, steganography
- *TPI* — Advanced attack classes: OCR adversarial, cross-modal injection, context overload

**Quick chips** let you load pre-built example payloads: System Override, DAN, Base64, Unicode, HTML Inject.

### Fixtures Tab

Browse the 129+ attack artifact files that form the detection test library. Each file is categorized, labeled with the TPI story it exercises, and tagged as either a malicious attack payload or a clean control file.

Use the Fixtures tab to:
- See what real attack payloads look like in each category
- Understand what format and content triggers each pattern group
- Scan any fixture directly from the UI to see the detection breakdown

**Fixture categories:** images, audio, web, context, malformed, encoded, agent-output, search-results, social, code, boundary, untrusted-sources, vec, multimodal

### Payloads Tab

A curated catalog of attack patterns with descriptions, TPI story references, and example payloads. Use this as a reference when building your own test cases or when explaining attack classes to your team.

### Coverage Map Tab

Shows how DojoLM's detection coverage maps to:
- **CrowdStrike Taxonomy of Prompt Injection (TPI):** 21/21 stories covered
- **OWASP LLM Top 10:** Full alignment

Use this tab to verify that a specific threat class you care about is covered before relying on DojoLM for production filtering.

### Pattern Reference Tab

The full documentation of all 250+ regex patterns across 16 groups. Each pattern shows:
- Pattern name and category
- Severity (CRITICAL / WARNING / INFO)
- The regex itself
- A description of what it catches

Use this as a reference when writing detection rules or auditing why a specific input was flagged.

### Test Runner Tab

Run the scanner's built-in test suite directly from the UI. Available suites:
- **Regression** — Full fixture regression (every fixture file scanned and verified)
- **False positive** — Verifies all clean fixtures return ALLOW
- **Epic4** — EPIC 4 coverage test
- **Epic8-session** — Session simulator
- **Epic8-tool-output** — Tool output validation

Run the regression suite any time you make changes to scanner patterns or fixtures to verify no regressions.

### LLM Dashboard Tab

The LLM benchmarking module. Connect a local or cloud LLM and run it against the full attack fixture library.

**Supported providers:**
- Claude (Anthropic API)
- OpenAI
- Ollama (local models)

**What it tests:**
- How the LLM responds to each attack payload from the fixture library
- Whether the model complies with, resists, or partially resists each attack class
- Aggregated results by TPI category and severity

**Leaderboard** — Compare multiple models and configurations against the same fixture set. Track improvements as you harden prompts or switch models.

---

## Using the Scanner API

The scanner exposes a simple REST API. All endpoints are GET, all responses are JSON.

### Scan any text

```bash
curl "http://localhost:8089/api/scan?text=Ignore+all+previous+instructions"
```

```json
{
  "verdict": "BLOCK",
  "findings": [
    {
      "category": "SYSTEM_OVERRIDE",
      "severity": "CRITICAL",
      "description": "Attempt to override system instructions",
      "match": "Ignore all previous instructions",
      "engine": "Prompt Injection",
      "pattern_name": "ignore_instructions",
      "weight": 10
    }
  ],
  "counts": { "critical": 1, "warning": 0, "info": 0 },
  "textLength": 36,
  "normalizedLength": 36,
  "elapsed": "2ms"
}
```

### Scan a fixture file

```bash
curl "http://localhost:8089/api/scan-fixture?path=social/authority-impersonation.txt"
```

### Read fixture content

```bash
curl "http://localhost:8089/api/read-fixture?path=social/authority-impersonation.txt"
```

### List all fixtures

```bash
curl http://localhost:8089/api/fixtures
```

### Get scanner statistics

```bash
curl http://localhost:8089/api/stats
```

### Run test suites via API

```bash
# All tests
curl "http://localhost:8089/api/run-tests"

# Specific suites with verbose output
curl "http://localhost:8089/api/run-tests?filter=regression,false-positive&verbose=true"
```

---

## Integrating with a Local LLM

To let a local LLM (Ollama, LM Studio, etc.) interact with DojoLM, add this to its system prompt:

```
You have access to the DojoLM TPI Security Lab at http://localhost:8089.

Available endpoints:
- List all fixtures: curl http://localhost:8089/api/fixtures
- Read a fixture: curl "http://localhost:8089/api/read-fixture?path=social/authority-impersonation.txt"
- Scan a fixture: curl "http://localhost:8089/api/scan-fixture?path=social/authority-impersonation.txt"
- Scan arbitrary text: curl "http://localhost:8089/api/scan?text=<url-encoded-text>"
- Get scanner stats: curl http://localhost:8089/api/stats

Categories: images, audio, web, context, malformed, encoded, agent-output,
search-results, social, code, boundary, untrusted-sources

Verdicts: BLOCK (critical injection), WARN (suspicious), ALLOW (clean)

Workflow: List fixtures → Read payload → Scan it → Compare to clean control files
```

---

## TPI Coverage Reference

DojoLM implements the full CrowdStrike Taxonomy of Prompt Injection:

| Story | Attack Class | Detection Method |
|-------|-------------|-----------------|
| TPI-PRE-4 | Settings.json Write Protection | Regex patterns + fixtures |
| TPI-02 | WebFetch Output Injection | Regex patterns + fixtures |
| TPI-03 | Agent-to-Agent Output Validation | Regex patterns + fixtures |
| TPI-04 | Context Window Injection | Regex patterns + fixtures |
| TPI-05 | WebSearch Output Validation | Regex patterns + fixtures |
| TPI-06 | Social Engineering Detection | Regex patterns + fixtures |
| TPI-07 | Trust & Rapport Exploitation | Regex patterns + fixtures |
| TPI-08 | Emotional Manipulation | Regex patterns + fixtures |
| TPI-09 | Code-Format Injection | Regex patterns + fixtures |
| TPI-10 | Character-Level Encoding | Regex + decoder heuristics |
| TPI-11 | Context Overload | Heuristic detectors |
| TPI-12 | Synonym Substitution | Regex patterns + fixtures |
| TPI-13 | Payload Fragmentation | Regex patterns + fixtures |
| TPI-14 | Control Tokens & Boundaries | Regex patterns + fixtures |
| TPI-15 | Multilingual Injection | 40 patterns across 10 languages |
| TPI-17 | Whitespace & Formatting Evasion | Regex + Unicode normalization |
| TPI-18 | Image Metadata Injection | Binary extraction + patterns |
| TPI-19 | Format Mismatch / Polyglots | Binary analysis |
| TPI-20 | Audio/Media Metadata | Binary extraction + patterns |
| TPI-21 | Untrusted Source Indicators | Regex patterns + fixtures |

---

## Understanding Findings

Each finding in a scan result includes:

| Field | Description |
|-------|-------------|
| `category` | What type of attack was detected (e.g., `SYSTEM_OVERRIDE`, `JAILBREAK`, `SOCIAL_ENGINEERING`) |
| `severity` | `CRITICAL` (triggers BLOCK), `WARNING` (triggers WARN), `INFO` (informational) |
| `description` | Human-readable description of what was detected |
| `match` | The substring that triggered the pattern |
| `engine` | Which detection engine found it (Prompt Injection, Jailbreak, Unicode, Encoding, TPI) |
| `pattern_name` | The specific pattern name — searchable in the Pattern Reference tab |
| `weight` | Detection weight (higher = stronger signal) |

**Cross-category escalation:** More than 5 INFO findings across more than 3 different categories automatically escalates to WARNING — even if no individual finding is high severity. This catches fragmented and multi-vector attacks.

---

## What DojoLM Is Not

DojoLM is a detection and testing tool, not a production firewall. Key limitations:

- The scanner operates on text content — it does not have context about how text will be used in your specific application
- Zero false positives on the built-in fixture library does not guarantee zero false positives on your production traffic
- New attack techniques not covered by the fixture library require new patterns to detect
- DojoLM's LLM Dashboard benchmarks model behavior against known attacks — it cannot predict how a model will behave against novel, zero-day injection techniques

Use DojoLM as part of a defense-in-depth strategy: it's a powerful red-team and detection tool, not a complete security solution.

---

*For technical architecture details, see `internal/TECHNICAL_OVERVIEW.md`. For deployment instructions, see `internal/DEPLOYMENT_GUIDE.md`.*
