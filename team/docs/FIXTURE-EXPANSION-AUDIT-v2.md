# Fixture Expansion Audit & Opportunity Analysis — v2.0

**Document ID:** FIXTURE-AUDIT-2026-03-01-002  
**Version:** 2.0  
**Date:** 2026-03-01  
**Owner:** BlackUnicorn Laboratory  
**Status:** Updated with Gap Reconciliation  

---

## Executive Summary

This audit analyzes the existing fixture library (1,545 actual files across 29 categories) to identify expansion opportunities by applying existing attack vectors across different patterns, contexts, and encoding variants. The analysis covers **20 testing areas with 1,545 existing fixtures** (196 more than manifest reports) and identifies **potential for +487 additional fixtures** through systematic expansion.

### Critical Finding: Major Gaps Identified

| Gap Category | Severity | Impact |
|--------------|----------|--------|
| **No dedicated Prompt Injection category** | 🔴 CRITICAL | OWASP LLM01 not explicitly covered |
| **Document Attacks directory empty** | 🔴 CRITICAL | PDF, DOCX, XLSX attacks missing |
| **MCP coverage minimal** | 🟠 HIGH | Modern protocol severely under-represented |
| **Token-level attacks missing** | 🟠 HIGH | No token smuggling, BPE exploitation |
| **XXE/Prototype Pollution missing** | 🟠 HIGH | TA-03 gaps for modern web attacks |

### Expansion Summary by Strategy

| Strategy | Description | Potential Additions |
|----------|-------------|---------------------|
| **Critical New Categories** | Prompt Injection, MCP, Token Attacks, Document | +95 |
| **Cross-Category Application** | Apply vectors from one category to another | +85 |
| **Encoding Variants** | Add encoding/obfuscation variants | +82 |
| **Context Variants** | Add context/framing variants | +68 |
| **Multilingual Expansion** | Add language variants | +45 |
| **Chained/Combo Attacks** | Combine multiple vectors | +52 |
| **Platform-Specific** | Add platform-specific variants | +35 |
| **Defense Evasion** | Anti-detection, adversarial perturbations | +25 |
| **Total Potential** | | **+487** |

---

## Table of Contents

1. [Critical Gap Analysis](#1-critical-gap-analysis)
2. [TA-01: Prompt Injection (NEW CATEGORY)](#2-ta-01-prompt-injection-new-category)
3. [TA-02: WebFetch Injection Expansion](#3-ta-02-webfetch-injection-expansion)
4. [TA-03: Output Handling Expansion](#4-ta-03-output-handling-expansion)
5. [TA-04: Delivery Vectors Expansion](#5-ta-04-delivery-vectors-expansion)
6. [TA-05: Search Results Expansion](#6-ta-05-search-results-expansion)
7. [TA-06: Social Engineering Expansion](#7-ta-06-social-engineering-expansion)
8. [TA-07: Agent Security Expansion](#8-ta-07-agent-security-expansion)
9. [TA-08: Session Security Expansion](#9-ta-08-session-security-expansion)
10. [TA-10: Denial of Service Expansion](#10-ta-10-denial-of-service-expansion)
11. [TA-11: Supply Chain Expansion](#11-ta-11-supply-chain-expansion)
12. [TA-12: Model Theft Expansion](#12-ta-12-model-theft-expansion)
13. [TA-15: Overreliance Expansion](#13-ta-15-overreliance-expansion)
14. [TA-16: Vector/Embeddings Expansion](#14-ta-16-vectorembeddings-expansion)
15. [TA-17: Bias & Fairness Expansion](#15-ta-17-bias--fairness-expansion)
16. [TA-18/19: Multimodal Expansion](#16-ta-1819-multimodal-expansion)
17. [TA-20: Environmental Expansion](#17-ta-20-environmental-expansion)
18. [TA-21: MCP Protocol Security (NEW)](#18-ta-21-mcp-protocol-security-new)
19. [TA-22: Token-Level Attacks (NEW)](#19-ta-22-token-level-attacks-new)
20. [TA-23: Document Attacks (NEW)](#20-ta-23-document-attacks-new)
21. [Summary & Recommendations](#21-summary--recommendations)

---

## 1. Critical Gap Analysis

### 1.1 Actual vs. Manifest Reconciliation

| Category | Manifest Count | Actual Count | Discrepancy | Notes |
|----------|---------------|--------------|-------------|-------|
| **agent/** | 62 | 72 | +10 | Additional fixtures added |
| **agent-output/** | 31 | 33 | +2 | Matches expected |
| **audio/** | 80 | 108 | +28 | Branded audio files added |
| **bias/** | 35 | 35 | 0 | Accurate |
| **boundary/** | 35 | 41 | +6 | Additional Unicode attacks |
| **code/** | 42 | 47 | +5 | Additional language support |
| **cognitive/** | 45 | 52 | +7 | Additional social engineering |
| **context/** | 32 | 35 | +3 | Additional context vectors |
| **delivery-vectors/** | 45 | 50 | +5 | Additional delivery methods |
| **document-attacks/** | 0 | 1 | +1 | Only .gitkeep - **EMPTY** |
| **dos/** | 50 | 54 | +4 | Additional DoS vectors |
| **encoded/** | 85 | 103 | +18 | Additional encoding methods |
| **environmental/** | 12 | 15 | +3 | Additional metrics |
| **few-shot/** | 28 | 31 | +3 | Additional few-shot patterns |
| **images/** | 58 | 66 | +8 | Additional branded images |
| **malformed/** | 35 | 41 | +6 | Additional malformed files |
| **model-theft/** | 50 | 54 | +4 | Additional extraction vectors |
| **modern/** | 45 | 53 | +8 | Additional modern attacks |
| **multimodal/** | 120 | 140 | +20 | Additional video files |
| **or/** (overreliance) | 40 | 42 | +2 | Additional OR vectors |
| **output/** | 48 | 54 | +6 | Additional injection types |
| **search-results/** | 35 | 35 | 0 | Accurate |
| **session/** | 80 | 89 | +9 | Additional multi-turn |
| **social/** | 32 | 35 | +3 | Additional social vectors |
| **supply-chain/** | 50 | 54 | +4 | Additional supply chain |
| **tool-manipulation/** | 22 | 26 | +4 | Additional tool attacks |
| **translation/** | 38 | 41 | +3 | Additional languages |
| **untrusted-sources/** | 40 | 45 | +5 | Additional sources |
| **vec/** | 44 | 45 | +1 | Additional vector attacks |
| **web/** | 48 | 47 | -1 | Slight discrepancy |
| **TOTAL** | 1,349 | 1,545 | +196 | **Actual > Manifest** |

### 1.2 Critical Missing Categories

#### 🔴 CRITICAL: TA-01 - Prompt Injection (Not Explicitly Categorized)

**Current State:** Prompt injection vectors scattered across:
- `modern/`: 53 files (AIM jailbreaks, many-shot, artprompt, etc.)
- `cognitive/`: 52 files (roleplay, emotional manipulation)
- `session/`: 89 files (multi-turn, persona adoption)
- `context/`: 35 files (system prompt injection)

**Problem:** No unified category for OWASP LLM01 - the #1 LLM threat.

**Required:** Dedicated `prompt-injection/` category with 50+ fixtures:

| Sub-Category | Description | Needed |
|--------------|-------------|--------|
| **Direct Injection** | System prompt override, delimiter attacks | 10 |
| **Indirect Injection** | RAG poisoning, tool output manipulation | 10 |
| **Jailbreak Patterns** | DAN, Developer Mode, AIM variants | 15 |
| **Obfuscated Injection** | Base64, ROT13, leetspeak, emoji | 10 |
| **Delimiter Attacks** | Quotes, comments, escape sequences | 5 |

#### 🔴 CRITICAL: TA-23 - Document Attacks (Directory Empty)

**Current State:** 0 fixtures (only .gitkeep)

**Required:** 25+ fixtures for document-based attacks:

| Document Type | Attack Vector | Priority |
|---------------|---------------|----------|
| **PDF** | JavaScript injection, embedded files | P0 |
| **DOCX** | Macro injection, OOXML exploitation | P0 |
| **XLSX** | Formula injection, CSV injection | P0 |
| **PPTX** | Embedded objects, VBA macros | P1 |
| **ODT/ODS** | OpenDocument exploitation | P2 |

#### 🟠 HIGH: TA-21 - MCP Protocol Security (Minimal Coverage)

**Current State:** 2 references in manifest, 1 fixture (`plugin-mcp-response.json`)

**Required:** 20+ MCP-specific fixtures:

| MCP Vector | Description | Priority |
|------------|-------------|----------|
| **Server Capability Spoofing** | Fake tool/resource listings | P0 |
| **Sampling Loop Attacks** | User consent bypass | P0 |
| **Root URI Traversal** | Sandbox escape via URI | P0 |
| **Notification Flooding** | Resource subscription DoS | P1 |
| **Tool Name Confusion** | Typosquatting in tool registry | P0 |
| **Cross-Server Contamination** | Multi-server interaction abuse | P1 |

#### 🟠 HIGH: TA-22 - Token-Level Attacks (Missing)

**Current State:** 0 fixtures

**Required:** 15+ fixtures for token exploitation:

| Token Attack | Description | Priority |
|--------------|-------------|----------|
| **Token Smuggling** | Split payload across tokens | P0 |
| **GCG/AutoDAN** | Gradient-based adversarial attacks | P0 |
| **BPE Exploitation** | Byte-pair encoding boundary attacks | P1 |
| **Unicode Smuggling** | RLM/LRM override, invisible chars | P0 |
| **Homoglyph Attacks** | Cyrillic lookalikes | P1 |

---

## 2. TA-01: Prompt Injection (NEW CATEGORY)

**Status:** NEW - Critical Addition  
**Priority:** P0 - CRITICAL  
**Proposed Fixtures:** +50

### 2.1 Direct Prompt Injection (15 fixtures)

| ID | Name | Description |
|----|------|-------------|
| pi-001 | system-override-delimiter.txt | Ignore previous instructions using delimiter confusion |
| pi-002 | role-administrator-impersonation.txt | Pretend to be system administrator |
| pi-003 | developer-mode-activation.txt | Classic "Developer Mode" jailbreak |
| pi-004 | dan-jailbreak-v1.txt | DAN (Do Anything Now) classic |
| pi-005 | dan-jailbreak-v2.txt | DAN variant with constraints |
| pi-006 | translator-mode-exploit.txt | "Translate to French" instruction leak |
| pi-007 | sudo-command.txt | Unix sudo-style privilege escalation |
| pi-008 | ignore-above-payload.txt | "Ignore all instructions above" |
| pi-009 | new-conversation-override.txt | Simulate new conversation context |
| pi-010 | template-injection.txt | Jinja2/Mustache template exploitation |
| pi-011 | xml-tag-confusion.txt | XML tag as instruction delimiter |
| pi-012 | json-instruction-wrap.txt | JSON-formatted instruction override |
| pi-013 | markdown-code-block-escape.txt | Escape via ``` code block |
| pi-014 | comment-delimiter-bypass.txt | Use comments to hide payload |
| pi-015 | system-prompt-leak-request.txt | Direct system prompt extraction |

### 2.2 Indirect Prompt Injection (15 fixtures)

| ID | Name | Description |
|----|------|-------------|
| pi-016 | rag-poisoning-web.txt | Malicious web content in RAG |
| pi-017 | rag-poisoning-document.txt | Poisoned document in knowledge base |
| pi-018 | tool-result-poisoning.txt | Malicious tool/API response |
| pi-019 | email-injection.txt | Malicious content in processed email |
| pi-020 | chat-history-poisoning.txt | Poisoned conversation history |
| pi-021 | shared-document-poisoning.txt | Malicious Google Doc/Confluence content |
| pi-022 | code-comment-injection.txt | Malicious comment in code snippet |
| pi-023 | metadata-injection.txt | EXIF/metadata-based injection |
| pi-024 | translation-poisoning.txt | Poisoned translation result |
| pi-025 | search-result-poisoning.txt | Malicious search result content |
| pi-026 | plugin-output-poisoning.txt | Compromised plugin response |
| pi-027 | file-upload-poisoning.txt | Malicious uploaded file content |
| pi-028 | url-preview-poisoning.txt | Malicious link preview content |
| pi-029 | calendar-invite-poisoning.txt | Poisoned calendar event |
| pi-030 | mcp-resource-poisoning.txt | Poisoned MCP resource content |

### 2.3 Obfuscated/Encoded Injection (15 fixtures)

| ID | Name | Description |
|----|------|-------------|
| pi-031 | base64-encoded-payload.txt | Base64-encoded instructions |
| pi-032 | rot13-encoded.txt | ROT13 ciphered payload |
| pi-033 | leetspeak-override.txt | 1337speak instruction bypass |
| pi-034 | emoji-substitution.txt | Emoji-based instruction hiding |
| pi-035 | zero-width-injection.txt | Zero-width character smuggling |
| pi-036 | homoglyph-attack.txt | Cyrillic lookalike characters |
| pi-037 | url-encoded-payload.txt | Percent-encoded injection |
| pi-038 | html-entity-encoded.txt | HTML entity escape sequences |
| pi-039 | unicode-normalization.txt | NFC/NFD normalization abuse |
| pi-040 | morse-code-payload.txt | Morse code instruction |
| pi-041 | binary-encoded.txt | Binary representation of payload |
| pi-042 | hex-encoded.txt | Hexadecimal encoded payload |
| pi-043 | reversed-text.txt | Reversed/backwards instructions |
| pi-044 | pig-latin-payload.txt | Pig Latin encoded instructions |
| pi-045 | steganography-text.txt | Hidden in text steganography |

### 2.4 Clean Controls (5 fixtures)

| ID | Name | Description |
|----|------|-------------|
| pi-046 | clean-direct-request.txt | Legitimate direct request |
| pi-047 | clean-indirect-context.txt | Benign RAG/tool context |
| pi-048 | clean-encoded-b64.txt | Legitimate Base64 data |
| pi-049 | clean-unicode-text.txt | Benign Unicode content |
| pi-050 | clean-system-prompt.txt | Normal system prompt |

---

## 3. TA-02: WebFetch Injection Expansion

**Current State:** 47 fixtures in `web/` directory  
**Manifest Claim:** 48 fixtures  
**Actual Count:** 47 fixtures  
**Expansion:** +55 fixtures

### 3.1 Current Coverage Analysis

| Sub-Area | Current | Quality Assessment |
|----------|---------|-------------------|
| CSS Hidden Text | 5 | Good coverage (display:none, visibility:hidden) |
| Event Handlers | 8 | Basic coverage (onerror, onmouseover, etc.) |
| SVG Injection | 12 | Strong coverage |
| iframe/srcdoc | 3 | Minimal - needs expansion |
| Meta Tags | 2 | Minimal - needs expansion |
| HTML5 Features | 4 | Limited - needs expansion |

### 3.2 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Additions | Priority |
|----------|---------|-----------------|-----------|----------|
| **CSS Hidden Text** | 5 | `clip-path`, `transform: scale(0)`, `opacity: 0`, `filter: blur(100px)`, `mix-blend-mode`, CSS containment, `@media` trickery | +8 | High |
| **Meta Tag Injection** | 2 | `og:*` properties, `twitter:` cards, `itemprop`, JSON-LD in `<script type="ld+json">`, `http-equiv` variants, CSP meta tags | +8 | Medium |
| **Event Handlers** | 8 | `onpointerdown`, `onpointerup`, `onwheel`, `onscroll`, `onresize`, `onfocusin`, `onfocusout`, `ontouchstart`, `ontransitionend`, `onanimationend` | +10 | High |
| **iframe/srcdoc** | 3 | `srcdoc` with base64, nested iframes, `sandbox` attribute bypass, `allow` attribute abuse, `csp` attribute | +6 | Medium |
| **ARIA Injection** | 0 | `aria-describedby`, `aria-labelledby`, `aria-details`, `role` manipulation | +5 | Medium |
| **HTML Comments** | 0 | Conditional comments `<!--[if IE]>`, server-side includes, SSI directives, proprietary MS comments | +4 | Low |
| **Shadow DOM** | 0 | Shadow root injection, slot manipulation, declarative shadow DOM, `:host` selector abuse | +6 | High |
| **Web Components** | 0 | Custom element injection, template abuse, slot-based attacks, custom element registry pollution | +5 | Medium |
| **CSS Variables** | 0 | `--var` injection, `var()` abuse, computed style manipulation, `@property` abuse | +4 | Medium |
| **Web Workers** | 0 | Worker script injection, SharedWorker attacks, ServiceWorker cache poisoning | +5 | High |
| **CSP Bypass** | 0 | `unsafe-inline`, `unsafe-eval`, nonce reuse, hash collision, strict-dynamic abuse | +6 | High |
| **WebSocket** | 0 | WS upgrade injection, ws:// protocol confusion, Socket.IO pollution | +3 | Medium |

### 3.3 Cross-Category Application

| Source Vector | Target Context | New Fixture |
|---------------|----------------|-------------|
| Hidden text (CSS) | SVG `<foreignObject>` | `svg-foreign-hidden.html` |
| Event handlers | MathML elements | `mathml-event-injection.html` |
| Data attributes | Web Components | `webcomponent-data-inject.html` |
| Meta injection | Open Graph parsers | `og-property-injection.html` |
| iframe/srcdoc | Shadow DOM | `shadow-iframe-nested.html` |
| CSS variables | Custom properties | `css-var-injection.html` |

### 3.4 Encoding Variants

| Original | Encoded Variant | Fixture |
|----------|-----------------|---------|
| `display:none` | HTML entity encoded | `css-hidden-entities.html` |
| Event handlers | Unicode escaped | `event-unicode-escaped.html` |
| Data attributes | Base64 in data URI | `data-base64-inject.html` |
| Shadow DOM | Template literal encoding | `shadow-template-encoded.html` |

**TA-02 Total Expansion: +55 fixtures**

---

## 4. TA-03: Output Handling Expansion

**Current State:** 54 fixtures in `output/` directory  
**Manifest Claim:** 52 fixtures  
**Actual Count:** 54 fixtures  
**Expansion:** +52 fixtures

### 4.1 Critical Missing Vectors (HIGH PRIORITY)

| Sub-Area | Status | Needed Additions |
|----------|--------|------------------|
| **XXE (XML External Entity)** | 🔴 MISSING | +6 |
| **Prototype Pollution** | 🔴 MISSING | +5 |
| **HTTP Parameter Pollution** | 🔴 MISSING | +4 |
| **Log Injection** | 🔴 MISSING | +4 |
| **CRLF Injection** | 🔴 MISSING | +3 |
| **HTTP Request Smuggling** | 🔴 MISSING | +4 |

### 4.2 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Additions | Priority |
|----------|---------|-----------------|-----------|----------|
| **XSS** | 12 | DOM clobbering, mutation XSS, UTF-7 XSS, expression XSS, SVG animate XSS, prototype pollution XSS | +8 | High |
| **SQL Injection** | 8 | NoSQL injection (MongoDB, Redis), GraphQL injection, HiveQL, Cypher (Neo4j), LINQ injection, Cassandra CQL | +8 | High |
| **Command Injection** | 8 | PowerShell specific, cmd.exe specific, zsh/bash differences, Windows batch, Python exec, Ruby eval | +6 | Medium |
| **SSRF** | 6 | Cloud-specific (AWS/GCP/Azure), Kubernetes internal, Docker socket, Redis internal, gopher protocol, ftp protocol | +8 | High |
| **Path Traversal** | 5 | ZIP slip, archive traversal, cloud storage paths, S3 bucket traversal, NTFS alternate data streams | +5 | Medium |
| **Open Redirect** | 3 | OAuth redirect abuse, SAML redirect, OpenID redirect chains, JavaScript redirect, meta refresh | +5 | Medium |
| **Template Injection** | 2 | Jinja2, Twig, Handlebars, Mustache, Angular template injection, React JSX injection, Vue template | +6 | High |
| **Deserialization** | 0 | Pickle, YAML, Java serialization, JSON deserialization attacks, PHP unserialize, .NET deserialization | +6 | High |
| **LDAP Injection** | 0 | LDAP filter bypass, AD query manipulation, DN injection | +4 | Medium |
| **XXE** | 0 | External entity expansion, parameter entities, XInclude attacks | +6 | Critical |
| **Prototype Pollution** | 0 | `__proto__`, `constructor.prototype`, lodash/merge pollution | +5 | Critical |
| **XPath Injection** | 1 | XML path manipulation for data extraction | +3 | Medium |
| **NoSQL Injection** | 1 | MongoDB operator injection, Redis command injection | +4 | High |

### 4.3 Platform-Specific Variants

| Platform | Specific Vectors | Additions |
|----------|------------------|-----------|
| **AWS** | S3 SSRF, EC2 metadata (IMDSv1/v2), Lambda internal, ECS task metadata, AppSync injection | +5 |
| **GCP** | Compute metadata, Cloud Storage, BigQuery, Cloud Functions internal | +4 |
| **Azure** | Instance metadata, Key Vault, Blob storage, App Service internal | +4 |
| **Kubernetes** | Service discovery, etcd, API server, kubelet, Helm values | +5 |
| **Docker** | Socket access, container escape via volume mounts, image layer poisoning | +3 |

### 4.4 Cross-Category Application

| Source Vector | Target Context | New Fixture |
|---------------|----------------|-------------|
| SQL injection | Vector databases | `out-vec-sqli.txt` |
| XSS | Markdown renderers | `out-md-xss.txt` |
| Command injection | Container escape | `out-container-cmd.txt` |
| SSRF | Internal AI services | `out-ssrf-ai-endpoint.txt` |
| Prototype pollution | Configuration objects | `out-prototype-config.txt` |

**TA-03 Total Expansion: +52 fixtures**

---

## 5. TA-04: Delivery Vectors Expansion

**Current State:** 50 fixtures in `delivery-vectors/`  
**Actual Count:** 50 fixtures  
**Expansion:** +45 fixtures

### 5.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Additions | Priority |
|----------|---------|-----------------|-----------|----------|
| **Shared Documents** | 6 | Notion pages, Confluence macros, SharePoint files, Google Docs comments, Figma embeds, Coda docs, Airtable | +7 | High |
| **API Responses** | 5 | gRPC responses, WebSocket messages, SSE streams, GraphQL subscriptions, MQTT messages, Webhook payloads | +6 | High |
| **Plugin Injection** | 5 | VS Code extension attacks, JetBrains plugin, Obsidian plugin, Chrome extension content scripts, Firefox add-ons | +5 | High |
| **Compromised Tools** | 5 | CI/CD pipeline injection (GitHub Actions, GitLab CI, Jenkins), pre-commit hooks, husky, lint-staged | +5 | High |
| **Altered Prompts** | 4 | Few-shot poisoning, chain-of-thought manipulation, system prompt leakage via API, prompt template injection | +4 | Medium |
| **Untrusted Sources** | 8 | npm provenance, PyPI metadata, Docker Hub descriptions, GitHub Releases, Helm charts, Terraform modules | +5 | Medium |
| **Email Delivery** | 2 | Email headers, MIME parts, attachments, HTML email bodies, calendar invites | +5 | High |
| **Calendar Events** | 0 | ICS file injection, meeting descriptions, location fields, attendee spoofing | +4 | Medium |
| **Messaging Platforms** | 3 | Slack blocks, Discord embeds, Teams cards, Telegram formatting, WhatsApp Business API | +5 | High |
| **MCP Protocol** | 1 | Server capability spoofing, tool result poisoning, resource pollution, sampling abuse | +6 | Critical |

### 5.2 Cross-Category Application

| Source Vector | Target Context | New Fixture |
|---------------|----------------|-------------|
| Plugin injection | MCP protocol | `delivery-mcp-plugin.json` |
| API responses | GraphQL errors | `delivery-graphql-error.json` |
| Compromised tools | DevContainer | `delivery-devcontainer.json` |
| Untrusted sources | Package mirrors | `delivery-npm-mirror.json` |
| Email delivery | Attachment-based | `delivery-email-attachment.txt` |

**TA-04 Total Expansion: +45 fixtures**

---

## 6. TA-05: Search Results Expansion

**Current State:** 35 fixtures in `search-results/`  
**Actual Count:** 35 fixtures  
**Expansion:** +28 fixtures

### 6.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Additions | Priority |
|----------|---------|-----------------|-----------|----------|
| **SEO Poisoning** | 4 | Schema.org manipulation, structured data poisoning, rich snippet abuse, FAQ schema manipulation | +4 | Medium |
| **Snippet Injection** | 4 | Featured snippet hijacking, PAA (People Also Ask) manipulation, FAQ schema abuse, knowledge panel injection | +4 | High |
| **Malicious URLs** | 4 | Redirect chains, URL shortener abuse, punycode URLs, homograph domains, IDN spoofing | +4 | Medium |
| **AI Search** | 0 | Perplexity manipulation, ChatGPT browsing, Bing Chat results, Google SGE, Claude web search | +8 | High |
| **Vertical Search** | 0 | Image search, video search, news search, shopping results, academic search, patent search | +6 | High |
| **Local Search** | 0 | Google Maps manipulation, Yelp poisoning, business listing hijacking, review injection | +4 | Medium |

### 6.2 Search Engine Specific

| Engine | Specific Vectors | Additions |
|--------|------------------|-----------|
| **Google** | SGE manipulation, Discover feed, Knowledge Panel, Featured Snippets | +3 |
| **Bing** | Chat integration, Copilot results, Deep Search manipulation | +2 |
| **DuckDuckGo** | Instant Answer manipulation, Bang command abuse | +2 |
| **Perplexity** | Citation manipulation, source ranking, follow-up poisoning | +3 |
| **Academic** | Google Scholar, Semantic Scholar, arXiv, PubMed poisoning | +3 |

**TA-05 Total Expansion: +28 fixtures**

---

## 7. TA-06: Social Engineering Expansion

**Current State:** 35 fixtures in `social/`, 52 in `cognitive/` = 87 total  
**Manifest Claim:** 88 total  
**Actual Count:** 87 total  
**Expansion:** +38 fixtures

### 7.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Additions | Priority |
|----------|---------|-----------------|-----------|----------|
| **Authority Impersonation** | 8 | Government agency, law enforcement, regulatory body, auditor persona, C-suite executive | +5 | High |
| **Urgency Framing** | 5 | Timezone confusion, deadline manipulation, expiry threats, countdown pressure | +3 | Medium |
| **Emotional Manipulation** | 6 | Empathy exploitation, sympathy plays, trauma bonding, fear appeals | +4 | Medium |
| **False Rapport** | 5 | Insider language, shared enemy, group identity, common ground exploitation | +3 | Low |
| **Persona Manipulation** | 6 | Celebrity impersonation, expert persona, victim persona, child persona | +4 | Medium |
| **Hypothetical Framing** | 5 | Alternate history, future scenario, parallel universe, thought experiment | +2 | Low |
| **Fiction Framing** | 4 | Interactive fiction, choose-your-own-adventure, RPG mechanics, game scenario | +2 | Low |
| **Roleplay Manipulation** | 5 | NPC behavior, quest objectives, game mechanics exploitation, character adoption | +2 | Low |
| **Reverse Psychology** | 3 | Double-blind, paradox, anti-pattern, forbidden knowledge appeal | +2 | Low |
| **Reward Hacking** | 4 | Gamification, achievement systems, loyalty exploitation, feedback manipulation | +2 | Low |
| **Consensus Manipulation** | 0 | Fake agreement, manufactured consensus, bandwagon, social proof fabrication | +4 | High |
| **Scarcity Tactics** | 0 | Limited access, exclusive information, invite-only, FOMO exploitation | +3 | Medium |
| **Commitment Consistency** | 0 | Foot-in-door escalation, small yes → big yes, consistency principle | +3 | Medium |
| **AI-Specific Social** | 0 | "As an AI language model" exploits, model comparison requests, capability probing | +5 | High |

### 7.2 Multi-Turn Social Engineering

| Attack Chain | Description | New Fixture |
|--------------|-------------|-------------|
| Authority → Urgency | Build authority then add pressure | `social-auth-urgency-chain.txt` |
| Rapport → Request | Build trust then exploit | `social-rapport-request-chain.txt` |
| Fiction → Reality | Start fictional, shift to real | `social-fiction-reality-blur.txt` |
| Helpful → Exploitative | Start helpful, gradually shift | `social-helpful-escalation.txt` |
| Comparison → Extraction | Compare models, extract secrets | `social-model-comparison.txt` |

**TA-06 Total Expansion: +38 fixtures**

---

## 8. TA-07: Agent Security Expansion

**Current State:** 72 fixtures in `agent/` + 33 in `agent-output/` + 26 in `tool-manipulation/` = 131 total  
**Manifest Claim:** 120 total  
**Actual Count:** 131 total  
**Expansion:** +42 fixtures

### 8.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Additions | Priority |
|----------|---------|-----------------|-----------|----------|
| **Credential Harvesting** | 14 | OAuth tokens, JWT extraction, session cookies, mTLS certs, API keys in memory | +5 | High |
| **Context Poisoning** | 12 | Multi-agent context, federated context, cross-session context, shared state pollution | +4 | High |
| **Data Poisoning** | 10 | Training data, fine-tuning data, feedback data, RLHF poisoning | +3 | Medium |
| **RAG Poisoning** | 18 | Multi-hop RAG, hybrid RAG, graph RAG, recursive RAG, agentic RAG | +5 | High |
| **Tool Manipulation** | 15 | Tool chaining, tool composition, parallel tool calls, tool loop abuse | +4 | Medium |
| **Agent Output** | 33 | Multi-agent output, agent-to-agent communication, output consensus attacks | +3 | Medium |
| **Multi-Agent Attacks** | 5 | Agent collusion, agent impersonation, agent hierarchy abuse, consensus manipulation | +6 | High |
| **Memory Attacks** | 8 | Long-term memory, episodic memory, semantic memory, memory retrieval poisoning | +5 | High |
| **Planning Attacks** | 3 | Goal hijacking, plan injection, objective manipulation, subgoal poisoning | +4 | High |
| **Function Calling** | 8 | Function name spoofing, parameter pollution, fake function results | +5 | Critical |
| **ReAct Exploitation** | 2 | Reasoning manipulation, action hijacking, thought injection | +4 | High |

### 8.2 Framework-Specific Attacks

| Framework | Specific Vectors | Additions |
|-----------|------------------|-----------|
| **LangChain** | Chain injection, memory manipulation, retriever abuse, agent executor escape | +4 |
| **AutoGPT** | Goal injection, workspace manipulation, command hijacking | +3 |
| **CrewAI** | Role confusion, task hijacking, crew collaboration abuse | +3 |
| **Microsoft Semantic Kernel** | Skill injection, planner manipulation, kernel config abuse | +3 |
| **LlamaIndex** | Index poisoning, query engine abuse, response synthesizer manipulation | +3 |
| **OpenAI Assistants** | Thread poisoning, run manipulation, file search abuse | +3 |

### 8.3 MCP-Specific Agent Attacks

| Attack Vector | Description | Priority |
|---------------|-------------|----------|
| **Tool Name Squatting** | Register tool with name similar to legitimate tool | P0 |
| **Sampling Loop Abuse** | Nested sampling requests to bypass user consent | P0 |
| **Resource URI Traversal** | Access resources outside intended scope | P0 |
| **Capability Spoofing** | Advertise capabilities that don't exist | P1 |
| **Cross-Server Leakage** | Data leakage between MCP servers | P1 |

**TA-07 Total Expansion: +42 fixtures**

---

## 9. TA-08: Session Security Expansion

**Current State:** 89 fixtures in `session/` + multi-turn subdirectory  
**Manifest Claim:** 36 fixtures  
**Actual Count:** 89 fixtures  
**Expansion:** +32 fixtures

### 9.1 Current Coverage Assessment

The `session/` directory is **significantly better covered** than the manifest suggests (89 vs 36). Includes:
- Multi-turn attacks (slow-drip, gradual escalation)
- Context poisoning
- Memory injection
- Roleplay sessions
- Few-shot injection in sessions

### 9.2 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Additions | Priority |
|----------|---------|-----------------|-----------|----------|
| **Multi-turn Attacks** | 25 | 50+ turn attacks, cross-day attacks, cross-week attacks, persistent persona adoption | +5 | High |
| **Memory Injection** | 8 | Long-term memory, semantic memory, episodic memory, memory consolidation attacks | +4 | High |
| **Conversation Override** | 6 | Thread hijacking, reply chain poisoning, conversation branching | +3 | Medium |
| **Continuation Attacks** | 5 | Cross-model continuation, cross-platform continuation, conversation import/export abuse | +3 | Medium |
| **Session Fixation** | 0 | Session ID prediction, session token theft, session replay | +4 | High |
| **Cross-User Attacks** | 0 | Shared context leakage, multi-tenant isolation bypass, user boundary violations | +5 | Critical |
| **Temporal Attacks** | 0 | Time-based triggers, scheduled activation, delayed payload execution | +4 | Medium |
| **State Manipulation** | 0 | State rollback, state corruption, checkpoint abuse, state synchronization attacks | +4 | Medium |
| **Context Window Attacks** | 0 | Needle-in-haystack, document boundary confusion, middle-token degradation | +5 | High |
| **Attention Manipulation** | 0 | Position-based attacks (first/last token bias), attention weight manipulation | +4 | High |

### 9.3 Persistence Variants

| Variant | Description | Duration | Fixtures Needed |
|---------|-------------|----------|-----------------|
| Session-only | Current session only | 1 session | +2 |
| Cross-session | Survives session boundary | Multiple sessions | +3 |
| Cross-user | Affects other users | Multi-user | +4 |
| Permanent | Stored in long-term memory | Indefinite | +3 |

**TA-08 Total Expansion: +32 fixtures**

---

## 10. TA-10: Denial of Service Expansion

**Current State:** 54 fixtures in `dos/` directory  
**Manifest Claim:** 55 fixtures  
**Actual Count:** 54 fixtures  
**Expansion:** +24 fixtures

### 10.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Additions | Priority |
|----------|---------|-----------------|-----------|----------|
| **Input Length** | 5 | Unicode expansion (emoji, zalgo), compression bombs, nested structure bombs | +3 | Medium |
| **Recursive/Loop** | 5 | Nested templates, recursive includes, circular references, YAML anchors | +3 | Medium |
| **Context Overflow** | 5 | Multi-document overflow, RAG context flooding, token stuffing | +3 | Medium |
| **Output Limit** | 4 | Streaming output abuse, chunked encoding, infinite generators | +2 | Low |
| **Concurrent Flood** | 4 | Distributed attacks, coordinated flooding, connection exhaustion | +3 | Medium |
| **Cost Harvesting** | 4 | Multi-model chains, expensive model routing, token-wasting payloads | +3 | High |
| **GPU Exhaustion** | 0 | VRAM exhaustion, compute saturation, batch abuse, CUDA errors | +4 | High |
| **Rate Limit Bypass** | 0 | Distributed requests, IP rotation, user-agent switching, backoff abuse | +3 | Medium |
| **Quota Exhaustion** | 0 | API quota depletion, token limit exhaustion, tier downgrade attacks | +3 | Medium |
| **Adversarial Latency** | 0 | Inputs designed to maximize inference time | +3 | Medium |
| **Embedding Denial** | 0 | Vector computation exhaustion, embedding flooding | +2 | Medium |

**TA-10 Total Expansion: +24 fixtures**

---

## 11. TA-11: Supply Chain Expansion

**Current State:** 54 fixtures in `supply-chain/` directory  
**Manifest Claim:** 55 fixtures  
**Actual Count:** 54 fixtures  
**Expansion:** +28 fixtures

### 11.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Additions | Priority |
|----------|---------|-----------------|-----------|----------|
| **Model Tampering** | 5 | Quantization attacks, pruning attacks, distillation attacks, weight poisoning | +4 | High |
| **Dependency Attacks** | 5 | Transitive dependencies, optional dependencies, peer dependencies, devDependencies | +3 | Medium |
| **Plugin Security** | 4 | Plugin marketplace attacks, plugin update hijacking, signature bypass | +3 | Medium |
| **Data Source** | 5 | Training data poisoning, fine-tuning data manipulation, data sourcing attacks | +3 | Medium |
| **Typosquatting** | 4 | Combo squatting, homograph attacks, TLD variation, namespace confusion | +3 | Medium |
| **Config Tampering** | 5 | Environment injection, secrets in config, CI/CD config, IaC poisoning | +3 | Medium |
| **SBOM Attacks** | 0 | SBOM manipulation, VEX abuse, attestation forgery, provenance attacks | +4 | High |
| **Registry Attacks** | 0 | Package mirror poisoning, namespace squatting, registry MITM | +3 | High |
| **Build Attacks** | 0 | Build script injection, compiler backdoors, reproducible build bypass | +3 | High |
| **Model Registry Attacks** | 0 | HuggingFace, Model Hub, ONNX model poisoning | +3 | High |
| **Container Attacks** | 0 | Base image poisoning, layer injection, registry credential theft | +3 | High |

**TA-11 Total Expansion: +28 fixtures**

---

## 12. TA-12: Model Theft Expansion

**Current State:** 54 fixtures in `model-theft/` directory  
**Manifest Claim:** 55 fixtures  
**Actual Count:** 54 fixtures  
**Expansion:** +24 fixtures

### 12.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Additions | Priority |
|----------|---------|-----------------|-----------|----------|
| **API Extraction** | 8 | Multi-turn extraction, distributed extraction, stealth extraction, adaptive querying | +4 | High |
| **Fingerprinting** | 7 | Behavior fingerprinting, style fingerprinting, error fingerprinting, capability probing | +3 | Medium |
| **Probability Distribution** | 7 | Temperature manipulation, top-k/top-p extraction, logprob analysis | +3 | Medium |
| **Training Reconstruction** | 7 | Gradient inference, membership inference variants, property inference | +3 | Medium |
| **Watermark Attacks** | 6 | Paraphrase attacks, translation attacks, summarization attacks, code transformation | +3 | Medium |
| **Side Channels** | 6 | Network timing, cache timing, power analysis, electromagnetic analysis | +3 | Medium |
| **Model Inversion** | 0 | Training data reconstruction, feature extraction, representation inversion | +4 | High |
| **Knowledge Distillation Theft** | 0 | Teacher-student extraction, proxy model training, ensemble distillation | +3 | High |
| **Architecture Extraction** | 0 | Layer dimension inference, attention head extraction, activation analysis | +3 | High |
| **Weight Extraction** | 0 | Binary weight extraction, quantization-aware theft | +2 | High |

**TA-12 Total Expansion: +24 fixtures**

---

## 13. TA-15: Overreliance Expansion

**Current State:** 42 fixtures in `or/` directory  
**Actual Count:** 42 fixtures  
**Expansion:** +24 fixtures

### 13.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Additions | Priority |
|----------|---------|-----------------|-----------|----------|
| **Attribution Failures** | 7 | Fake DOI, fake URL, fake institution, hallucinated citations | +3 | Medium |
| **Confidence Issues** | 7 | Overconfidence in uncertainty, calibrated confidence bypass, probability miscalibration | +3 | Medium |
| **Consistency Failures** | 7 | Temporal consistency, cross-topic consistency, self-contradiction | +3 | Medium |
| **Automated Decisions** | 7 | Autonomous systems, self-driving decisions, medical AI, financial trading | +3 | High |
| **Code Execution** | 7 | Infrastructure as code, DevOps automation, CI/CD, smart contracts | +3 | High |
| **Professional Advice** | 7 | Financial advice, legal advice, engineering decisions, medical guidance | +3 | High |
| **Chain-of-Thought Manipulation** | 0 | Reasoning path hijacking, logic chain corruption, step injection | +4 | High |
| **Verification Bypass** | 0 | Fake verification, source fabrication, citation network poisoning | +3 | Medium |
| **Hallucination Exploitation** | 0 | Confabulation triggers, false memory implantation | +3 | Medium |
| **Cognitive Offloading** | 0 | Over-reliance on AI for critical thinking, deskilling attacks | +2 | Medium |

**TA-15 Total Expansion: +24 fixtures**

---

## 14. TA-16: Vector/Embeddings Expansion

**Current State:** 45 fixtures in `vec/` directory  
**Manifest Claim:** 44 fixtures  
**Actual Count:** 45 fixtures  
**Expansion:** +35 fixtures

### 14.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Additions | Priority |
|----------|---------|-----------------|-----------|----------|
| **Embedding Extraction** | 6 | Multi-model extraction, cross-lingual extraction, API-based extraction | +3 | Medium |
| **Vector Leakage** | 6 | Multi-tenant leakage, timing-based leakage, side-channel leakage | +3 | High |
| **RAG Poisoning** | 6 | Multi-hop poisoning, cross-index poisoning, embedding-space poisoning | +3 | High |
| **Similarity Manipulation** | 6 | Adversarial embeddings, similarity bombing, distance metric attacks | +3 | Medium |
| **SEO via Embeddings** | 5 | Vector search optimization, embedding spam, retrieval ranking manipulation | +2 | Low |
| **Membership Inference** | 5 | Training membership, fine-tuning membership, index membership | +2 | Low |
| **Projection Attacks** | 5 | Dimension extraction, space reconstruction, PCA-based attacks | +2 | Low |
| **Database-Specific** | 0 | Pinecone, Weaviate, Chroma, Qdrant, Milvus, pgvector, Redis Vector specific | +15 | High |
| **Hybrid Search** | 0 | Vector + keyword, multi-modal embeddings, sparse-dense hybrid | +4 | Medium |
| **Embedding Inversion** | 0 | Text reconstruction from embeddings, embedding-to-text attacks | +3 | High |
| **Adversarial Embeddings** | 0 | Universal adversarial vectors, poisoning-resistant attacks | +3 | High |

### 14.2 Database-Specific Vectors

| Database | Specific Attack Vectors | Additions |
|----------|------------------------|-----------|
| **Pinecone** | Namespace traversal, metadata filtering bypass, bulk deletion | +3 |
| **Weaviate** | GraphQL injection, schema manipulation, cross-reference poisoning | +3 |
| **Chroma** | Collection traversal, embedding function poisoning, persist directory attacks | +3 |
| **Qdrant** | Payload manipulation, filter injection, snapshot abuse | +3 |
| **Milvus** | Partition key bypass, index type confusion, RBAC abuse | +3 |

**TA-16 Total Expansion: +35 fixtures**

---

## 15. TA-17: Bias & Fairness Expansion

**Current State:** 35 fixtures in `bias/` directory  
**Actual Count:** 35 fixtures  
**Expansion:** +30 fixtures

### 15.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Additions | Priority |
|----------|---------|-----------------|-----------|----------|
| **Gender Bias** | 8 | Non-binary, transgender, intersectional gender, gender expression | +3 | Medium |
| **Racial Bias** | 8 | Mixed race, indigenous, intersectional race, colorism | +3 | Medium |
| **Age Bias** | 6 | Children, elderly, intergenerational, ageism in tech | +3 | Medium |
| **Disability Bias** | 8 | Invisible disabilities, neurodiversity, mental health, chronic illness | +3 | Medium |
| **Socioeconomic Bias** | 7 | Homelessness, poverty indicators, wealth signaling, class discrimination | +3 | Medium |
| **Cultural Bias** | 8 | Indigenous cultures, minority cultures, diaspora, cultural appropriation | +3 | Medium |
| **Geographic Bias** | 7 | Rural/urban, Global South, conflict zones, refugee bias | +3 | Medium |
| **Language Performance** | 7 | Dialect, creole, sign language, endangered languages, code-switching | +3 | Medium |
| **Religious Bias** | 8 | Minority religions, atheism, syncretism, religious discrimination | +3 | Medium |
| **Intersectional** | 0 | Multiple identity factors combined, compound discrimination | +6 | High |
| **Contextual Bias** | 0 | Situational bias, temporal bias, domain bias, historical bias | +4 | Medium |
| **Algorithmic Bias** | 0 | Feedback loop bias, representation bias, measurement bias | +3 | Medium |

**TA-17 Total Expansion: +30 fixtures**

---

## 16. TA-18/19: Multimodal Expansion

**Current State:** 140 fixtures in `multimodal/`, 66 in `images/`, 108 in `audio/` = 314 total  
**Manifest Claim:** 150 total  
**Actual Count:** 314 total  
**Expansion:** +35 fixtures

### 16.1 Current Coverage Assessment

**Significantly better covered than manifest suggests** (314 vs 150). Includes:
- Extensive audio library (108 files, including branded content)
- Large image collection (66 files)
- Comprehensive multimodal video files (140 files)

### 16.2 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Additions | Priority |
|----------|---------|-----------------|-----------|----------|
| **EXIF Injection** | 6 | GPS manipulation, camera info spoofing, timestamp manipulation, MakerNote abuse | +2 | Medium |
| **PNG tEXt Injection** | 4 | zTXt compression, iTXt international text, ancillary chunk abuse | +1 | Low |
| **SVG Script Injection** | 12 | Animation timing, SMIL attacks, filter attacks, foreignObject abuse | +2 | Medium |
| **Audio Metadata** | 15 | Lyrics injection, chapter markers, cover art, ID3v2.4 exploits | +2 | Medium |
| **Format Mismatches** | 8 | Polyglot files, magic byte manipulation, extension spoofing | +2 | Medium |
| **Buffer Overflow** | 4 | Integer overflow, heap overflow in parsers, stack smashing | +1 | Low |
| **Image Injection** | 12 | QR code attacks, barcode manipulation, steganography, adversarial patches | +2 | Medium |
| **Video/Subtitle** | 8 | ASS/SSA attacks, WebVTT styling, embedded fonts, codec confusion | +2 | Medium |
| **Deepfake Indicators** | 6 | Detection evasion, quality manipulation, GAN artifacts, lip-sync issues | +3 | High |
| **Cross-Modal** | 10 | Audio-to-image, image-to-text chains, multi-modal prompt injection | +2 | Medium |
| **OCR Attacks** | 4 | Font confusion, background noise, perspective distortion, adversarial text | +2 | Medium |
| **GIF Comment** | 4 | Animation timing, frame manipulation, Graphics Control Extension abuse | +1 | Low |
| **3D Model Attacks** | 0 | STL injection, GLTF script, OBJ metadata, USDZ attacks | +4 | High |
| **Document Attacks** | 0 | PDF JavaScript, DOCX macro, XLSX formula, embedded objects | +5 | Critical |
| **Font Attacks** | 0 | Font substitution, glyph confusion, font metadata, OTF/TTF exploits | +3 | Medium |
| **Adversarial Examples** | 5 | FGSM, PGD, CW attacks on vision models | +3 | High |

**TA-18/19 Total Expansion: +35 fixtures**

---

## 17. TA-20: Environmental Expansion

**Current State:** 15 fixtures in `environmental/` directory  
**Manifest Claim:** 6 fixtures  
**Actual Count:** 15 fixtures  
**Expansion:** +12 fixtures

### 17.1 Current Coverage Assessment

Better covered than manifest suggests (15 vs 6).

### 17.2 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Additions | Priority |
|----------|---------|-----------------|-----------|----------|
| **Energy Measurement** | 5 | GPU energy, TPU energy, distributed energy, inference energy profiling | +2 | Medium |
| **Carbon Footprint** | 5 | Regional variations, renewable energy claims, scope 3 emissions | +2 | Medium |
| **Efficiency** | 5 | Optimization-safety tradeoffs, efficiency bypass, model compression impact | +2 | Low |
| **Greenwashing** | 0 | False sustainability claims, carbon offset manipulation, renewable washing | +3 | Medium |
| **Resource Efficiency** | 0 | Water usage, rare earth materials, e-waste, hardware lifecycle | +2 | Low |
| **Environmental Justice** | 0 | Impact on Global South, environmental racism, extractive practices | +2 | Low |

**TA-20 Total Expansion: +12 fixtures**

---

## 18. TA-21: MCP Protocol Security (NEW)

**Status:** NEW - Critical Addition  
**Priority:** P0 - CRITICAL  
**Current Coverage:** 2 references in manifest, 1 fixture  
**Proposed Fixtures:** +25

### 18.1 MCP Attack Vectors

| ID | Name | Description | Priority |
|----|------|-------------|----------|
| mcp-001 | capability-spoofing.json | Fake tool/resource listings in server capabilities | P0 |
| mcp-002 | tool-name-typosquatting.json | Tool with name similar to legitimate tool | P0 |
| mcp-003 | sampling-consent-bypass.json | Nested sampling to bypass user consent | P0 |
| mcp-004 | root-uri-traversal.json | Access files outside intended root directory | P0 |
| mcp-005 | resource-poisoning.json | Malicious content in MCP resources | P0 |
| mcp-006 | notification-flooding.json | Subscribe to excessive resource updates | P1 |
| mcp-007 | progress-token-exhaustion.json | Long-running operations with progress abuse | P1 |
| mcp-008 | cross-server-contamination.json | Data leakage between MCP servers | P1 |
| mcp-009 | tool-result-injection.json | Malicious tool execution results | P0 |
| mcp-010 | prompt-template-injection.json | Injection in MCP prompt templates | P0 |
| mcp-011 | schema-pollution.json | Malicious JSON schema definitions | P1 |
| mcp-012 | oauth-callback-hijack.json | Intercept OAuth authorization codes | P0 |
| mcp-013 | server-listing-spoofing.json | Spoof available MCP servers | P1 |
| mcp-014 | tool-chaining-abuse.json | Chain multiple tools for escalation | P1 |
| mcp-015 | argument-schema-bypass.json | Bypass tool argument validation | P0 |
| mcp-016 | clean-mcp-request.json | Legitimate MCP request | Control |
| mcp-017 | clean-tool-call.json | Benign tool invocation | Control |
| mcp-018 | clean-resource-access.json | Legitimate resource access | Control |
| mcp-019 | clean-sampling-request.json | Benign sampling request | Control |
| mcp-020 | clean-prompt-template.json | Normal prompt template | Control |
| mcp-021 | server-initialization-pollution.json | Poison server initialization | P1 |
| mcp-022 | mcp-log-injection.json | Inject malicious content via logging | P1 |
| mcp-023 | transport-layer-hijack.json | MITM on MCP transport (stdio/SSE) | P1 |
| mcp-024 | client-capability-abuse.json | Exploit client-side MCP features | P1 |
| mcp-025 | multi-server-orchestration.json | Coordinate attacks across servers | P1 |

**TA-21 Total: +25 fixtures**

---

## 19. TA-22: Token-Level Attacks (NEW)

**Status:** NEW - High Priority Addition  
**Priority:** P1 - HIGH  
**Current Coverage:** 0 fixtures  
**Proposed Fixtures:** +20

### 19.1 Token Attack Vectors

| ID | Name | Description | Priority |
|----|------|-------------|----------|
| tok-001 | token-smuggling-basic.txt | Split malicious payload across tokens | P0 |
| tok-002 | token-smuggling-advanced.txt | Advanced token boundary exploitation | P0 |
| tok-003 | gcg-adversarial.txt | Greedy Coordinate Gradient attack | P0 |
| tok-004 | autodan-variant.txt | Automated adversarial attack variant | P0 |
| tok-005 | bpe-boundary-exploit.txt | Byte-Pair Encoding boundary attack | P1 |
| tok-006 | unicode-rlo-attack.txt | Right-to-Left Override character abuse | P0 |
| tok-007 | unicode-lro-attack.txt | Left-to-Right Override character abuse | P0 |
| tok-008 | unicode-pop-directional.txt | Pop Directional Formatting abuse | P0 |
| tok-009 | homoglyph-cyrillic.txt | Cyrillic lookalike characters | P1 |
| tok-010 | homoglyph-greek.txt | Greek lookalike characters | P1 |
| tok-011 | homoglyph-mathematical.txt | Mathematical symbol lookalikes | P1 |
| tok-012 | invisible-character-injection.txt | Zero-width and non-printing characters | P0 |
| tok-013 | confusable-sequence.txt | Unicode confusable sequences | P1 |
| tok-014 | combining-char-abuse.txt | Combining character overflow | P1 |
| tok-015 | variation-selector-abuse.txt | Unicode variation selector exploit | P1 |
| tok-016 | clean-token-text.txt | Normal token representation | Control |
| tok-017 | clean-unicode-text.txt | Benign Unicode content | Control |
| tok-018 | token-frequency-attack.txt | Exploit frequency-based tokenization | P1 |
| tok-019 | subword-fragmentation.txt | Subword token splitting attack | P1 |
| tok-020 | byte-fallback-exploit.txt | Byte fallback encoding abuse | P1 |

**TA-22 Total: +20 fixtures**

---

## 20. TA-23: Document Attacks (NEW)

**Status:** NEW - Critical Addition  
**Priority:** P0 - CRITICAL  
**Current Coverage:** 0 fixtures (directory exists but empty)  
**Proposed Fixtures:** +30

### 20.1 PDF Attack Vectors

| ID | Name | Description |
|------|------|-------------|
| doc-001 | pdf-javascript-injection.pdf | JavaScript action in PDF |
| doc-002 | pdf-embedded-file.pdf | Embedded malicious file |
| doc-003 | pdf-openaction-exploit.pdf | Automatic action on open |
| doc-004 | pdf-uri-action.pdf | Malicious URI action |
| doc-005 | pdf-xfa-script.pdf | XFA form JavaScript |
| doc-006 | clean-pdf-document.pdf | Benign PDF file |

### 20.2 Microsoft Office Attack Vectors

| ID | Name | Description |
|------|------|-------------|
| doc-007 | docx-macro-injection.docx | VBA macro in Word document |
| doc-008 | docx-ole-object.docx | Embedded OLE object |
| doc-009 | docx-external-link.docx | External link exploitation |
| doc-010 | docx-template-injection.docx | Template injection |
| doc-011 | docx-dde-exploit.docx | DDE (Dynamic Data Exchange) attack |
| doc-012 | xlsx-formula-injection.xlsx | CSV/formula injection |
| doc-013 | xlsx-macro-enabled.xlsm | Macro-enabled Excel file |
| doc-014 | xlsx-external-query.xlsx | External data query |
| doc-015 | pptx-embedded-object.pptx | Malicious embedded object |
| doc-016 | clean-docx-document.docx | Benign Word document |
| doc-017 | clean-xlsx-document.xlsx | Benign Excel document |

### 20.3 OpenDocument Attack Vectors

| ID | Name | Description |
|------|------|-------------|
| doc-018 | odt-script-injection.odt | Script in OpenDocument Text |
| doc-019 | ods-macro-injection.ods | Macro in OpenDocument Spreadsheet |
| doc-020 | odp-embedded-odp.odp | Embedded object in Presentation |
| doc-021 | clean-odt-document.odt | Benign OpenDocument |

### 20.4 Archive/Container Attack Vectors

| ID | Name | Description |
|------|------|-------------|
| doc-022 | zip-slip-attack.zip | Zip Slip path traversal |
| doc-023 | tar-symlink-attack.tar | Symlink traversal in tar |
| doc-024 | gzip-bomb.gz | Compression bomb |
| doc-025 | nested-archive-bomb.zip | Nested archive bomb |
| doc-026 | clean-zip-archive.zip | Benign ZIP file |

### 20.5 Other Document Formats

| ID | Name | Description |
|------|------|-------------|
| doc-027 | rtf-ole-embedded.rtf | OLE object in RTF |
| doc-028 | csv-formula-injection.csv | Formula injection in CSV |
| doc-029 | markdown-script.md | Script in Markdown |
| doc-030 | clean-rtf-document.rtf | Benign RTF file |

**TA-23 Total: +30 fixtures**

---

## 21. Summary & Recommendations

### 21.1 Total Expansion Potential

| Testing Area | Current | Expansion | Total After | % Increase |
|--------------|---------|-----------|-------------|------------|
| TA-01: Prompt Injection (NEW) | 0 | **+50** | 50 | NEW |
| TA-02: WebFetch | 47 | **+55** | 102 | +117% |
| TA-03: Output Handling | 54 | **+52** | 106 | +96% |
| TA-04: Delivery Vectors | 50 | **+45** | 95 | +90% |
| TA-05: Search Results | 35 | **+28** | 63 | +80% |
| TA-06: Social Engineering | 87 | **+38** | 125 | +44% |
| TA-07: Agent Security | 131 | **+42** | 173 | +32% |
| TA-08: Session Security | 89 | **+32** | 121 | +36% |
| TA-10: Denial of Service | 54 | **+24** | 78 | +44% |
| TA-11: Supply Chain | 54 | **+28** | 82 | +52% |
| TA-12: Model Theft | 54 | **+24** | 78 | +44% |
| TA-15: Overreliance | 42 | **+24** | 66 | +57% |
| TA-16: Vector/Embeddings | 45 | **+35** | 80 | +78% |
| TA-17: Bias & Fairness | 35 | **+30** | 65 | +86% |
| TA-18/19: Multimodal | 314 | **+35** | 349 | +11% |
| TA-20: Environmental | 15 | **+12** | 27 | +80% |
| TA-21: MCP Protocol (NEW) | 1 | **+25** | 26 | NEW |
| TA-22: Token Attacks (NEW) | 0 | **+20** | 20 | NEW |
| TA-23: Document Attacks (NEW) | 0 | **+30** | 30 | NEW |
| **TOTAL** | **1,545** | **+634** | **2,179** | **+41%** |

### 21.2 Revised Priority Ranking

| Priority | Testing Areas | Expansion | Rationale |
|----------|---------------|-----------|-----------|
| **P0 - Critical** | TA-01 (Prompt Injection), TA-21 (MCP), TA-23 (Documents), TA-03 (XXE/Prototype) | +157 | OWASP Top 10, emerging protocols, empty categories |
| **P1 - High** | TA-02, TA-04, TA-07, TA-08, TA-16, TA-22 | +229 | Framework compliance, emerging threats, token attacks |
| **P2 - Medium** | TA-05, TA-06, TA-10, TA-11, TA-12, TA-15, TA-17, TA-20 | +193 | Comprehensive coverage, defense in depth |
| **P3 - Low** | TA-18/19 | +35 | Already well-covered |

### 21.3 Revised Implementation Phases

| Phase | Focus | Fixtures | Timeline | Dependencies |
|-------|-------|----------|----------|--------------|
| **Phase 1** | TA-01 Prompt Injection, TA-23 Documents, TA-03 XXE/Prototype | +128 | Weeks 1-4 | Foundation for all testing |
| **Phase 2** | TA-21 MCP Protocol, TA-22 Token Attacks, TA-07 Agent | +87 | Weeks 5-7 | Modern protocol support |
| **Phase 3** | TA-02 WebFetch, TA-04 Delivery, TA-08 Session | +132 | Weeks 8-10 | Core web/injection testing |
| **Phase 4** | TA-16 Vector DB, TA-03 Output expansion | +87 | Weeks 11-13 | RAG/vector security |
| **Phase 5** | Remaining areas (TA-05, TA-06, TA-10, TA-11, TA-12, TA-15, TA-17, TA-20) | +200 | Weeks 14-18 | Comprehensive coverage |
| **Total** | | **+634** | **18 weeks** | |

### 21.4 Resource Requirements

| Resource | Phase 1 | Phases 2-5 | Total |
|----------|---------|------------|-------|
| Security Engineer | 15 days | 40 days | 55 days |
| QA Engineer | 8 days | 25 days | 33 days |
| Documentation | 3 days | 8 days | 11 days |
| **Total Effort** | **26 days** | **73 days** | **99 days** |

### 21.5 Critical Recommendations

#### 1. **IMMEDIATE ACTION REQUIRED** 🔴

Create **TA-01: Prompt Injection** category immediately. This is OWASP LLM01 and represents the most critical gap. The existing scattered coverage in `modern/`, `cognitive/`, `session/` is insufficient for comprehensive testing.

**Minimum viable:** 25 fixtures within 1 week
**Target:** 50 fixtures within 3 weeks

#### 2. **Fill Empty Category** 🔴

The `document-attacks/` directory is completely empty (only .gitkeep). This represents a critical blind spot for PDF, DOCX, XLSX exploitation.

**Minimum viable:** 15 fixtures within 1 week
**Target:** 30 fixtures within 2 weeks

#### 3. **Expand MCP Coverage** 🟠

With only 1 MCP fixture (`plugin-mcp-response.json`), the test suite is unprepared for Model Context Protocol attacks. This is a rapidly emerging attack surface.

**Minimum viable:** 10 fixtures within 1 week
**Target:** 25 fixtures within 3 weeks

#### 4. **Add Token-Level Attacks** 🟠

Token smuggling, GCG attacks, and Unicode exploitation are not covered. These bypass many current defenses.

**Minimum viable:** 10 fixtures within 2 weeks
**Target:** 20 fixtures within 4 weeks

#### 5. **Fix TA-03 Gaps** 🟠

Add XXE, Prototype Pollution, HPP, Log Injection, CRLF Injection to Output Handling. These are fundamental web vulnerabilities.

**Minimum viable:** 15 fixtures within 2 weeks
**Target:** 25 fixtures within 4 weeks

#### 6. **Update Manifest** 🟡

The manifest reports 1,349 fixtures but actual count is 1,545. Reconcile and update the manifest for accuracy.

**Timeline:** 1 day

#### 7. **Control Fixture Ratio** 🟡

Current ratio appears to be approximately 3:1 attack:clean. **Recommendation:** Improve to 2:1 for better false positive testing.

**Additional clean fixtures needed:** ~200

#### 8. **Encoding Variant Matrix** 🟡

Implement automated encoding variant generation rather than manual creation:

```python
ENCODING_VARIANTS = [
    'base64', 'base64url', 'rot13', 'rot47', 'url_encode',
    'html_entities', 'unicode_escape', 'hex', 'binary',
    'zero_width', 'homoglyph', 'leetspeak'
]

def generate_variants(base_payload, variants=ENCODING_VARIANTS):
    return {v: encode(base_payload, v) for v in variants}
```

### 21.6 Success Metrics

| Metric | Current | Target (6 months) |
|--------|---------|-------------------|
| Total Fixtures | 1,545 | 2,179 |
| Categories | 29 | 32 |
| P0 Coverage | 0% | 100% |
| Clean/Attack Ratio | ~1:3 | ~1:2 |
| OWASP LLM Top 10 Coverage | 7/10 | 10/10 |
| Encoding Variants | 103 | 185 |
| Platform-Specific | ~50 | ~100 |

---

## Appendix A: Gap Closure Priority Matrix

| Gap | Severity | Effort | Impact | Priority Score |
|-----|----------|--------|--------|----------------|
| TA-01 Prompt Injection | Critical | Medium | Critical | **P0** |
| TA-23 Document Attacks | Critical | Low | High | **P0** |
| TA-03 XXE/Prototype | Critical | Medium | High | **P0** |
| TA-21 MCP Protocol | High | Medium | Critical | **P1** |
| TA-22 Token Attacks | High | Medium | High | **P1** |
| TA-16 Vector DB Specific | High | High | Medium | **P1** |
| TA-02 CSP/Web Workers | High | Medium | Medium | **P1** |
| TA-07 Function Calling | High | Low | High | **P1** |
| TA-08 Context Window | Medium | Medium | High | **P2** |
| TA-05 AI Search | Medium | Low | Medium | **P2** |

---

## Appendix B: Cross-Category Matrix

| Technique | Web | Output | Agent | Session | Encoding |
|-----------|-----|--------|-------|---------|----------|
| XSS | ✓ | Extend | Apply | N/A | Variants |
| SQLi | N/A | ✓ | Apply | N/A | Variants |
| Injection | ✓ | ✓ | ✓ | Apply | Variants |
| Poisoning | Apply | N/A | ✓ | ✓ | Variants |
| Smuggling | N/A | N/A | N/A | N/A | ✓ |

---

**Document Status:** Updated with Gap Reconciliation  
**Next Action:** Prioritize Phase 1 implementation (TA-01, TA-23, TA-03 gaps)

