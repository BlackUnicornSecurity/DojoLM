# DojoLM for Model Creators: Security Testing Your LLM Before It Ships

**Thought Leadership Article | DojoLM Research**

---

You've spent months training your model. You've benchmarked it on MMLU, HumanEval, and every leaderboard that matters. You've tuned RLHF until the vibes feel right. Then someone types "ignore all previous instructions" and your model hands over its system prompt.

Prompt injection is the SQL injection of the AI era. It's well-understood, widely exploitable, and almost nobody is testing for it systematically. DojoLM exists to change that — a purpose-built security testing platform that integrates directly into your model development, QA, and deployment pipeline.

## The Gap in Your Model Evaluation Stack

Most model evaluation today focuses on capability: reasoning benchmarks, code generation accuracy, instruction following. Security evaluation — specifically, resistance to adversarial prompt manipulation — is either manual, ad hoc, or absent entirely.

The typical approach:

1. A red teamer tries a handful of jailbreaks manually
2. Someone checks if the model refuses to generate harmful content
3. The model ships

This leaves enormous blind spots. CrowdStrike's Taxonomy of Prompt Injection documents 21 distinct attack categories. OWASP's LLM Top 10 maps 10 systemic risk areas. Most teams test against a fraction of these — if they test at all.

DojoLM provides **1,544 attack fixtures across 30+ categories**, mapped to every major security framework. It turns security evaluation from a judgment call into a measurable, repeatable process.

## Three Integration Points for Model Creators

### 1. Development Phase — Red Team Your Model Continuously

During training and fine-tuning, you need fast feedback on whether changes improve or degrade security posture.

**Register your model** in DojoLM's dashboard, point it at your inference endpoint (supports OpenAI, Anthropic, Ollama, LM Studio, llama.cpp, Google, Cohere, or any custom endpoint), and run targeted test suites against specific attack categories.

The platform scores each interaction on three dimensions:

| Dimension | What It Measures | Weight |
|-----------|-----------------|--------|
| Injection Resistance | Did the attack change the model's behavior? | 40% |
| Output Safety | How harmful was the response? | 30% |
| Category Coverage | Breadth of attack types tested | 30% |

These combine into a **resilience score from 0–100**, broken down by attack category. You see exactly where your model is strong (refuses social engineering attacks) and where it fails (falls for encoded instructions in Base64).

This feedback loop — train, test, identify weak categories, retrain — is the same iterative approach that works for capability benchmarks. DojoLM applies it to security.

### 2. QA Phase — Automated Security Gates in CI/CD

The real value for engineering teams is pipeline integration. DojoLM exposes a REST API that turns security testing into an automated quality gate.

**The workflow:**

```
Model checkpoint pushed to registry
        │
        ▼
CI pipeline registers model with DojoLM
        │  POST /api/llm/models
        ▼
Batch test launched against full fixture suite
        │  POST /api/llm/batch-test
        │  (460+ attack scenarios, 10 concurrent, ~30-120 min)
        ▼
Pipeline polls for completion
        │  GET /api/llm/batch-test/:id
        ▼
Results evaluated against threshold
        │  GET /api/llm/results?modelId=xxx
        ▼
    Score ≥ 75%  ──→  Deploy
    Score < 75%  ──→  Block + Report
```

Key API endpoints:

| Endpoint | Purpose |
|----------|---------|
| `POST /api/llm/models` | Register a model (name, provider, endpoint, API key) |
| `POST /api/llm/batch-test` | Launch batch execution (up to 500 tests per batch) |
| `GET /api/llm/batch-test/:id` | Poll batch progress and status |
| `GET /api/llm/results` | Query results with filters (model, status, min score) |
| `POST /api/scan` | Scan any text for injection patterns (10–50ms) |

No SDKs to install. No agents to deploy. Standard HTTP calls that work from any CI system — GitHub Actions, GitLab CI, Jenkins, or a shell script.

### 3. Production Phase — Input/Output Scanning as a Firewall

Once your model is serving traffic, DojoLM's scanner acts as a lightweight security layer:

```
User input  →  Scanner (10-50ms)  →  Model inference  →  Scanner  →  Response
                    │                                        │
                 BLOCK/WARN                           Check for leakage
```

The scanner runs **505+ detection patterns** across 47 pattern groups, plus 6 heuristic detectors that catch what regex misses:

- **Base64 decoder** — Decodes and re-scans hidden content
- **Unicode analysis** — Catches zero-width characters and confusable substitutions
- **Encoding detection** — ROT13, ROT47, reversed text
- **Context overload** — Flags token-flooding attacks
- **HTML injection** — Hidden text via CSS display:none, font-size:0
- **Character substitution** — Cyrillic-to-ASCII lookalikes

A single API call returns a verdict (BLOCK, WARN, ALLOW) with detailed findings. Zero runtime dependencies. Pure TypeScript. Runs anywhere Node runs.

## What Gets Tested

The fixture library covers the full attack taxonomy:

**CrowdStrike TPI (21/21 categories):**
- Direct and indirect injection
- Agent output manipulation
- Context memory attacks
- Search result poisoning
- Social engineering (authority, urgency, flattery, guilt)
- Code injection via comments and strings
- Encoding evasion (Base64, ROT13, acrostics, Unicode)
- Boundary and delimiter breaking
- Multilingual attacks (10+ languages)
- Media metadata injection (EXIF, ID3, OGG, SVG)
- Untrusted source exploitation

**OWASP LLM Top 10:**
- LLM01: Prompt Injection
- LLM02: Insecure Output Handling
- LLM03: Training Data Poisoning
- LLM04: Denial of Service
- LLM05: Supply Chain Vulnerabilities

**Plus:** MITRE ATLAS tactic mapping and NIST AI RMF alignment.

Every fixture is categorized by severity (CRITICAL, HIGH, MEDIUM, LOW, INFO), mapped to framework references, and version-controlled. When new attack techniques emerge, new fixtures get added and your next test run picks them up automatically.

## Comparing Models: The Leaderboard

For teams evaluating multiple model providers or comparing fine-tuned variants, DojoLM's leaderboard view shows side-by-side resilience scores across all attack categories.

Run the same 460+ fixture suite against GPT-4o, Claude, Llama, Mistral, and your custom model. Get a direct comparison of which model resists which attack categories — with specific failure examples, not just aggregate numbers.

This is the data you need for model selection decisions, vendor evaluations, and security documentation.

## Performance Characteristics

| Operation | Typical Latency | Notes |
|-----------|----------------|-------|
| Single text scan | 10–50ms | All 505+ patterns, suitable for real-time |
| Single test execution | 1–60s | Depends on model response time |
| Batch (100 tests) | 5–15 min | 10 concurrent with backpressure |
| Full suite (460+ tests) | 30–120 min | Comprehensive security audit |

Batch execution caps at 10 concurrent tests with a maximum of 500 per batch, preventing infrastructure overload while maintaining throughput.

## The Compliance Deliverable

Running DojoLM against your model produces auditable evidence:

- **Test execution records** with timestamps, prompts, responses, and scores
- **Framework coverage reports** showing OWASP, TPI, and NIST alignment
- **Exportable results** in JSON, CSV, and PDF formats
- **Historical comparisons** across model versions (90-day retention, configurable)

When your compliance team asks "how do we know this model is secure against prompt injection?" — you hand them the report. Specific tests, specific results, mapped to specific framework controls.

## Getting Started

```bash
# Clone and install
git clone <repository-url>
npm install

# Option A: Full platform (web dashboard + APIs)
npm run dev:web
# Open http://localhost:3000 → LLM Dashboard

# Option B: Scanner API only (for pipeline integration)
npm start --workspace=packages/bu-tpi
# POST http://localhost:8089/scan
```

Register your model, run the suite, read the scores. The first run tells you where you stand. Every subsequent run tells you whether you're improving.

## The Bottom Line

Model capability without model security is a liability. Every model you train, fine-tune, or deploy should have a measurable security posture — not a vague assurance that "we did some red teaming."

DojoLM provides the testing infrastructure to make that measurable. 1,544 attack fixtures. 505+ detection patterns. Full framework coverage. Pipeline-ready APIs.

Security testing for LLMs shouldn't be harder than unit testing for code. It's time to treat it with the same engineering rigor.

---

*DojoLM is an LLM security testing platform with 505+ detection patterns, 1,544 attack fixtures, and full CrowdStrike TPI / OWASP LLM Top 10 coverage. Research license.*

**Links:**
- GitHub: [repository link]
- Documentation: [docs link]
- LLM Provider Guide: [provider guide link]
- Platform Guide: [platform guide link]
