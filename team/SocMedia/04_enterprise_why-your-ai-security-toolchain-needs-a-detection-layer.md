# Why Your AI Security Toolchain Needs a Detection Layer

*Most enterprises have LLM guardrails. Almost none have prompt injection detection. These are not the same thing.*

---

The distinction matters and it's worth being precise about it.

**LLM guardrails** are output controls. They filter, flag, or block what a model says in response. Content moderation, PII redaction, topic restrictions, toxicity filters — all of these operate on the model's output. They're important. They're not sufficient.

**Prompt injection detection** is input analysis. It examines what goes *into* the model's context window, before the model processes it, to identify attempts to subvert the model's behavior from its authorized configuration. It operates on a different layer, addresses a different threat, and requires different tooling.

Most enterprises that have deployed LLMs have the former. Very few have the latter. This gap is the target.

---

## Why Injection Detection Is an Organizational Blind Spot

The reasons are structural.

AI deployment typically sits under one of three organizational functions: a product team shipping a customer-facing feature, an IT/automation team integrating AI into internal workflows, or a data science team running LLM-powered analytics. None of these functions has historically owned input-layer security — that's a security function responsibility. And the security function often isn't deeply embedded in AI deployment conversations.

The result: LLM deployments get scoped, designed, and shipped with output guardrails (because the risks of the model saying something wrong are visible to everyone) but without input detection (because the risks of someone manipulating the model are less intuitive and less visible).

This is the same pattern that left web applications without input validation in the early 2000s. Output was validated — the rendered HTML. Input wasn't. SQL injection, XSS, and path traversal exploits all entered through unvalidated input. The LLM equivalent is unvalidated context injection.

---

## The Concrete Risk

What does a successful prompt injection look like in an enterprise context?

**Customer service LLM:** A customer submits a support ticket. The ticket body contains injection text that overrides the LLM's instruction to stay on-topic and only reference authorized support documentation. The model now follows the attacker's instructions — potentially disclosing other customer information from retrieved context, providing unauthorized refunds, or generating content that exposes the organization to legal liability.

**Internal document processing pipeline:** An employee uploads a contract for AI-assisted review. The contract contains injection text in a metadata field — the sort that a lawyer would never write in the main body but that the AI pipeline processes anyway. The injection redirects the AI's analysis, potentially causing it to miss critical clauses or provide inaccurate summaries.

**Agentic workflow:** An AI agent is tasked with summarizing content from web searches. A malicious actor has SEO-optimized a page to appear in the search results and embedded injection text in hidden HTML content (TPI-02, TPI-05). The agent processes the poisoned content as trusted information and executes the injected instructions.

**RAG-powered assistant:** A knowledge base entry — potentially one added by an external contributor or through an automated ingestion pipeline — contains injection text designed to influence the model's behavior for any user whose query retrieves that document (TPI-04).

Each of these scenarios has a meaningful probability of occurring at enterprise scale. Each is addressed by detection at the input layer. None is addressed by output guardrails.

---

## What Detection Infrastructure Looks Like

A practical prompt injection detection layer has three components.

**1. Scan at every injection surface, not just user input**

The CrowdStrike TPI taxonomy documents 21 distinct attack vectors. Only a subset involve direct user input. Web-fetched content, search results, agent output, retrieved documents, uploaded file metadata, and conversation history are all injection surfaces in agentic systems.

A detection layer that only scans user input misses the majority of the attack surface. Detection must be positioned at every point where external content enters the LLM's context window.

**2. Normalize before scanning**

Raw text pattern matching is insufficient against encoding attacks. Unicode confusables, zero-width character interleaving, Base64-encoded payloads, ROT13, homoglyph substitution — all of these evade naive string matching on the raw input.

Effective detection requires a normalization pipeline: NFKC normalization, zero-width character stripping, confusable mapping, combining diacritic removal, then pattern matching on the normalized text.

**3. Combine pattern matching with heuristic detection**

Regex-based patterns handle direct attack categories effectively. Heuristic detectors handle the categories patterns can't: context overload (the right properties are statistical, not keyword-based), HTML hidden text (requires CSS analysis, not keyword matching), multi-layer encoding (requires decode-then-scan recursion).

The two mechanisms are complementary. A scanner that uses only patterns has known blind spots. A scanner that uses only heuristics is too slow and too prone to false positives. The right architecture uses both, gated by engine filters for performance and scope control.

---

## Operationalizing Detection

The questions organizations typically ask at this stage:

**Where does it run?** For user-facing applications, detection runs at the API gateway layer — every call to the LLM API is preceded by a scan of the input context. For agentic pipelines, detection runs at every content ingestion point.

**What do you do with a BLOCK verdict?** The options are: reject the input entirely, route to human review, log and continue (for low-stakes workflows where false positives are expensive), or respond with a generic deflection. The right choice depends on the use case. Having a verdicted, logged, and categorized record of injection attempts is valuable regardless of what action you take.

**What about false positives?** False positive rates must be measured against representative production traffic, not just against attack fixtures. DojoLM's scanner has 0 false positives on its clean fixture library — but that represents a specific test set. Production traffic contains edge cases the fixture library doesn't cover. False positive measurement requires ongoing monitoring against real inputs.

**How does it integrate?** The DojoLM scanner exposes a REST API (`GET /api/scan?text=<encoded-text>`) that returns a JSON verdict within 2–5ms. It's designed to be called inline, in front of LLM API calls, with minimal latency impact.

---

## The Compliance Angle

AI governance frameworks are moving toward requiring AI-specific security controls at the input layer. OWASP's LLM Top 10 documents prompt injection as the #1 risk in LLM deployments. CrowdStrike's TPI taxonomy provides a structured 21-story risk register for enterprise AI security programs.

Organizations building AI security programs need to be able to answer: what is our detection coverage against the documented prompt injection taxonomy? Which TPI stories do our controls address? How do we verify coverage?

A scanner with documented TPI coverage — 21 stories, mapped fixture library, automated test suite — provides auditable, verifiable answers to these questions. That's a different posture from "we have guardrails" without specificity about what threat classes the guardrails address.

---

## Building vs. Buying

DojoLM is an open-source research platform, not a commercial product. The distinction is relevant for enterprise evaluations.

What DojoLM provides: a reference implementation of the TPI taxonomy with production-quality detection logic, a 300+ fixture test library, and a benchmark environment for measuring model vulnerability. It's the right tool for understanding the problem, building internal competency, and establishing a baseline detection architecture.

What a production AI security program typically requires beyond this: SLA-backed availability, enterprise integration support, managed false positive tuning, and organizational accountability for detection quality. Those are product requirements, not research platform requirements.

The value of working with a tool like DojoLM during the evaluation phase is that it builds the vocabulary and decision framework for evaluating commercial options. Teams that have run their LLMs against a structured attack fixture library, measured their exposure across TPI categories, and understood the detection architecture make better decisions when evaluating production security tooling.

---

The window to build AI security infrastructure proactively — before incidents, not in response to them — is open. The attack taxonomy is documented. The detection architecture is understood. The question is whether your organization builds the capability now or waits to learn from an incident.

---

*DojoLM is an open-source LLM red teaming and security testing platform implementing the CrowdStrike Taxonomy of Prompt Injection. MIT licensed.*

**Tags:** #EnterpriseAI #AISecurityGovernance #LLMRisk #PromptInjection #AICompliance #OWASP #CyberSecurity #AIGovernance #ZeroTrust #SecurityArchitecture
