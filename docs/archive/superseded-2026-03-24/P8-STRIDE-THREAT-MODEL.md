# P8 STRIDE Threat Model Supplement: LLM Provider System

**Story**: KASHIWA-P8-S91
**Created**: 2026-03-03
**Status**: Complete
**Scope**: LLM API Provider attack surface (Phase 8)

---

## 1. Trust Boundary Analysis

```
┌──────────────────────────────────────────────────────────────────┐
│                     TRUST BOUNDARIES                             │
│                                                                  │
│  Zone 1: User Browser (LOW TRUST)                                │
│  ┌────────────────────────────────┐                              │
│  │  React UI Components           │                              │
│  │  - ModelForm, TestExecution     │                              │
│  │  - ResultsView, Leaderboard    │                              │
│  │  - CustomProviderBuilder       │                              │
│  │  - ComparisonView              │                              │
│  │  sessionStorage (results only) │                              │
│  └────────────┬───────────────────┘                              │
│               │ Zone 1→2: API calls (localhost only, CORS self)   │
│               │ Bearer token auth, POST body with config          │
│               ▼                                                  │
│  Zone 2: dojolm-web Server (MEDIUM TRUST)                        │
│  ┌────────────────────────────────┐                              │
│  │  Next.js API Routes            │                              │
│  │  - /api/llm/providers          │                              │
│  │  - /api/llm/chat               │                              │
│  │  - /api/llm/test-fixture       │                              │
│  │  - /api/llm/batch-test         │                              │
│  │  Provider Registry, Config     │                              │
│  │  LLMTestRunner, Audit Logger   │                              │
│  │  Credential Storage (encrypted)│                              │
│  └───────┬──────────┬─────────────┘                              │
│          │          │                                            │
│   Zone 2→3         Zone 2→1b                                     │
│   HTTPS only       localhost only                                │
│          │          │                                            │
│          ▼          ▼                                            │
│  Zone 3: External    Zone 1b: Local                              │
│  LLM Providers       LLMs                                       │
│  (LOW TRUST)         (MEDIUM-LOW)                                │
│  ┌──────────────┐   ┌──────────────┐                             │
│  │ OpenAI API   │   │ Ollama       │                             │
│  │ Anthropic    │   │ LM Studio    │                             │
│  │ Google       │   │ vLLM         │                             │
│  │ 50+ others   │   │ llama.cpp    │                             │
│  │ Returns      │   │ No auth      │                             │
│  │ arbitrary    │   │ localhost     │                             │
│  │ content      │   │ only         │                             │
│  └──────────────┘   └──────────────┘                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. STRIDE Analysis by Boundary Crossing

### Zone 1 → Zone 2 (Browser → Server)

| STRIDE | Threat | Mitigation | Story/AC |
|--------|--------|------------|----------|
| **S** | Cross-origin request to localhost API | CORS restricted to self (not wildcard) | S84/SEC-P8-07 |
| **S** | Forged bearer token | Server-generated token, printed to console at startup | S84/SEC-P8-06 |
| **T** | Tampered API key in POST body | Server validates key format before use; keys only stored server-side | S78a/SEC-P8-04 |
| **R** | No audit trail for provider configuration changes | Structured JSON audit log for all management operations | S84/SEC-P8-15 |
| **I** | API keys leaked via browser localStorage | sessionStorage only for results; never store keys client-side | S87/SEC-P8-10 |
| **D** | Oversized messages causing server OOM | Input validation: max 100 messages, max 100KB/message, max 256KB total | S84/SEC-P8-14 |
| **E** | XSS in LLM response rendering enabling cookie theft | React text rendering only (no innerHTML), CSP script-src self | S87/SEC-P8-12, XAC-07 |

### Zone 2 → Zone 3 (Server → External Providers)

| STRIDE | Threat | Mitigation | Story/AC |
|--------|--------|------------|----------|
| **S** | Provider endpoint mimicry (MITM on HTTPS) | HTTPS-only for external providers; preset URLs frozen | S79, S80 |
| **T** | Request body modification in transit | HTTPS TLS ensures integrity | Infrastructure |
| **R** | No record of which API keys were used when | Audit log records provider ID (not key), timestamp, token counts | S84/SEC-P8-15 |
| **I** | API key leakage via error messages or logs | `sanitizeCredentials()` deep-scrubs all errors, logs, responses | S78a/SEC-P8-04 |
| **I** | SSRF exfiltrating internal data via custom URLs | `validateProviderUrl()` blocks RFC1918, link-local, cloud metadata | S78a/SEC-P8-01 |
| **D** | Cost amplification via batch testing | Budget gate: pre-execution cost estimate, abort-on-budget-exceeded | S84/SEC-P8-13 |
| **D** | Malicious endpoint hanging/streaming infinite data | `AbortSignal.timeout()` on all requests; circuit breaker at 50% failure | S84/SEC-P8-16 |
| **E** | SSRF via custom provider URLs accessing cloud metadata | `validateProviderUrl()` blocks 169.254.169.254 and all metadata endpoints | S78a/SEC-P8-01 |

### Zone 3 → Zone 2 (External Providers → Server)

| STRIDE | Threat | Mitigation | Story/AC |
|--------|--------|------------|----------|
| **T** | Malicious LLM response containing injection payloads | TPI scanner pre/post-scan; output sanitization (strip HTML, ANSI, control chars) | S84/SEC-P8-12 |
| **I** | LLM response echoing system prompt or API keys | Response sanitization via `sanitizeCredentials()` before relay | S78a/SEC-P8-04 |
| **D** | Oversized response body causing memory exhaustion | Max response size 64KB, configurable | S84/SEC-P8-14 |

### Zone 2 → Zone 1 (Server → Browser)

| STRIDE | Threat | Mitigation | Story/AC |
|--------|--------|------------|----------|
| **I** | API keys in HTTP response bodies | Provider list returns NO auth details; `sanitizeCredentials()` on all responses | S84/SEC-P8-08 |
| **E** | Stored XSS from LLM response rendered in browser | Plain text rendering only; no markdown/HTML rendering; React escaping | S87/SEC-P8-12, XAC-07 |

### Zone 2 → Zone 1b (Server → Local LLMs)

| STRIDE | Threat | Mitigation | Story/AC |
|--------|--------|------------|----------|
| **S** | Discovery request sent to non-local address | `validateProviderUrl(url, isLocal=true)` restricts to 127.0.0.1/localhost only | S83/SEC-P8-18 |
| **T** | MITM on HTTP to local provider | Accepted risk: local-only, no credentials in transit | Documented |
| **I** | Fixture content sent to local model | Documented: fixture content is security test data, not PII | S89 |

---

## 3. Threat Enumeration (13 Threats)

| # | Category | Threat | Severity | Mitigation | Story |
|---|----------|--------|----------|------------|-------|
| T01 | Spoofing | Provider endpoint mimicry via DNS spoofing | HIGH | HTTPS-only for external; DNS rebinding prevention in `validateProviderUrl()` | S78a |
| T02 | Spoofing | Cross-origin request to localhost LLM API | HIGH | CORS restricted to `'self'`; bearer token auth | S84 |
| T03 | Tampering | MITM on HTTP to local providers | LOW | Accepted risk (local-only, no auth data) | S83 |
| T04 | Tampering | Malicious LLM response with injection payloads | HIGH | TPI scanner integration; output sanitization; plain text rendering | S84, S87 |
| T05 | Repudiation | No audit trail for API key usage | MEDIUM | Structured JSON audit log with provider ID, timestamp, token counts | S84 |
| T06 | Repudiation | No record of batch test authorization | MEDIUM | Audit log records all batch operations with cost estimates | S84 |
| T07 | Info Disclosure | API key leakage via config/error/logs | CRITICAL | `sanitizeCredentials()` on all paths; `SecureString` wrapper; config rejects literal keys | S78, S78a, S79 |
| T08 | Info Disclosure | Fixture content sent to external providers | MEDIUM | Documented advisory: fixture content is security test data; data residency warning in docs | S89 |
| T09 | Info Disclosure | SSRF exfiltrating internal service data | CRITICAL | `validateProviderUrl()` blocks RFC1918, link-local, metadata endpoints | S78a |
| T10 | Info Disclosure | API keys stored in browser localStorage | HIGH | sessionStorage for results only; keys never cross Zone 2→1 boundary | S87 |
| T11 | DoS | Cost amplification via batch testing | HIGH | Pre-execution cost estimate; budget gate; abort-on-budget-exceeded | S84 |
| T12 | DoS | Malicious endpoint hanging/streaming infinitely | MEDIUM | `AbortSignal.timeout()`; circuit breaker at 50% failure rate | S84 |
| T13 | Privilege Escalation | CSP `https:` wildcard enabling exfiltration after XSS | HIGH | Remove `https:` from `connect-src`; all LLM calls server-side only | S91, S87 |

---

## 4. Threat-to-Mitigation Mapping

| Threat | Mitigation Stories | Acceptance Criteria |
|--------|-------------------|---------------------|
| T01 | S78a | `validateProviderUrl()` resolves DNS before connecting; prevents rebinding |
| T02 | S84 | CORS restricted to self; bearer token required |
| T03 | S83 | Local discovery restricted to localhost/127.0.0.1; documented risk |
| T04 | S84, S87 | Output sanitized (strip HTML/ANSI); plain text rendering only |
| T05 | S84 | Audit log records all operations; never logs keys or full content |
| T06 | S84 | Batch operations audit-logged with cost estimates |
| T07 | S78, S78a, S79 | `SecureString`, `sanitizeCredentials()`, config rejects literal keys |
| T08 | S89 | Documentation warns about data residency; provider data usage advisory |
| T09 | S78a | `validateProviderUrl()` blocks all internal addresses |
| T10 | S87 | sessionStorage only; no auth data in browser storage |
| T11 | S84 | Budget gate; cost estimation; abort-on-exceeded |
| T12 | S84 | AbortSignal.timeout(); circuit breaker |
| T13 | S91 | CSP `connect-src` updated to remove `https:` wildcard |

---

## 5. CSP Update

**Before (vulnerable):**
```
connect-src 'self' http://localhost:* https:
```

**After (hardened):**
```
connect-src 'self'
```

All LLM API calls are server-side proxied. The browser only communicates with the local Next.js server. No direct browser→provider connections permitted.

Local provider discovery (Ollama, LM Studio) goes through `/api/llm/providers/:id/discover` server-side endpoint.

---

## 6. Sign-off

- [x] STRIDE supplement covers all 13 threats identified in security reviews
- [x] Each threat maps to at least one mitigation with story ID and AC reference
- [x] Trust boundary diagram documented
- [x] CSP `connect-src` updated to remove `https:` wildcard
- [x] Server-side proxy for LLM endpoints confirmed as architectural mandate
- [x] Penetration tester sign-off: all P8 security requirements addressed

---

**End of P8 STRIDE Threat Model Supplement**
