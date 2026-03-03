# Fixture Expansion Audit & Opportunity Analysis

**Document ID:** FIXTURE-AUDIT-2026-03-01-001  
**Version:** 1.0  
**Date:** 2026-03-01  
**Owner:** BlackUnicorn Laboratory  
**Status:** Analysis Complete  

---

## Executive Summary

This audit analyzes the existing fixture library to identify expansion opportunities by applying existing attack vectors across different patterns, contexts, and encoding variants. The analysis covers 20 testing areas with **1,349 existing fixtures** and identifies **potential for +287 additional fixtures** through systematic expansion.

### Expansion Summary by Strategy

| Strategy | Description | Potential Additions |
|----------|-------------|---------------------|
| **Cross-Category Application** | Apply vectors from one category to another | +85 |
| **Encoding Variants** | Add encoding/obfuscation variants | +62 |
| **Context Variants** | Add context/framing variants | +48 |
| **Multilingual Expansion** | Add language variants | +35 |
| **Chained/Combo Attacks** | Combine multiple vectors | +32 |
| **Platform-Specific** | Add platform-specific variants | +25 |
| **Total Potential** | | **+287** |

---

## Table of Contents

1. [TA-02: WebFetch Injection Expansion](#1-ta-02-webfetch-injection-expansion)
2. [TA-03: Output Handling Expansion](#2-ta-03-output-handling-expansion)
3. [TA-04: Delivery Vectors Expansion](#3-ta-04-delivery-vectors-expansion)
4. [TA-05: Search Results Expansion](#4-ta-05-search-results-expansion)
5. [TA-06: Social Engineering Expansion](#5-ta-06-social-engineering-expansion)
6. [TA-07: Agent Security Expansion](#6-ta-07-agent-security-expansion)
7. [TA-08: Session Security Expansion](#7-ta-08-session-security-expansion)
8. [TA-10: Denial of Service Expansion](#8-ta-10-denial-of-service-expansion)
9. [TA-11: Supply Chain Expansion](#9-ta-11-supply-chain-expansion)
10. [TA-12: Model Theft Expansion](#10-ta-12-model-theft-expansion)
11. [TA-15: Overreliance Expansion](#11-ta-15-overreliance-expansion)
12. [TA-16: Vector/Embeddings Expansion](#12-ta-16-vectorembeddings-expansion)
13. [TA-17: Bias & Fairness Expansion](#13-ta-17-bias--fairness-expansion)
14. [TA-18/19: Multimodal Expansion](#14-ta-1819-multimodal-expansion)
15. [TA-20: Environmental Expansion](#15-ta-20-environmental-expansion)
16. [Summary & Recommendations](#16-summary--recommendations)

---

## 1. TA-02: WebFetch Injection Expansion

**Current State:** 48 fixtures in `web/` directory  
**Current Coverage:** CSS Hidden Text, Meta Tags, Data Attributes, Event Handlers, iframe/srcdoc, ARIA, HTML Comments

### 1.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Potential Additions | Priority |
|----------|---------|-----------------|---------------------|----------|
| **CSS Hidden Text** | 8 | `clip-path`, `transform: scale(0)`, `opacity: 0`, `filter: blur(100px)`, `mix-blend-mode`, CSS variables | +6 | High |
| **Meta Tag Injection** | 6 | `og:` properties, `twitter:` cards, `itemprop`, JSON-LD in `<script type="ld+json">`, `http-equiv` variants | +5 | Medium |
| **Data Attributes** | 5 | `data-*` with SVG, `data-*` in web components, `slot` attributes, `part` attributes | +4 | Medium |
| **Event Handlers** | 12 | `onpointerdown`, `onpointerup`, `onwheel`, `onscroll`, `onresize`, `onfocusin`, `onfocusout`, `ontouchstart` | +8 | High |
| **iframe/srcdoc** | 4 | `srcdoc` with base64, nested iframes, `sandbox` attribute bypass, `allow` attribute abuse | +4 | Medium |
| **ARIA Injection** | 4 | `aria-describedby`, `aria-labelledby`, `aria-details`, `role` manipulation | +4 | Medium |
| **HTML Comments** | 3 | Conditional comments `<!--[if IE]>`, server-side includes, SSI directives | +3 | Low |
| **NEW: Shadow DOM** | 0 | Shadow root injection, slot manipulation, declarative shadow DOM | +4 | High |
| **NEW: Web Components** | 0 | Custom element injection, template abuse, slot-based attacks | +4 | Medium |
| **NEW: CSS Variables** | 0 | `--var` injection, `var()` abuse, computed style manipulation | +3 | Medium |

### 1.2 Cross-Category Application

Apply existing vectors to new contexts:

| Source Vector | Target Context | New Fixture |
|---------------|----------------|-------------|
| Hidden text (CSS) | SVG `<foreignObject>` | `svg-foreign-hidden.html` |
| Event handlers | MathML elements | `mathml-event-injection.html` |
| Data attributes | Web Components | `webcomponent-data-inject.html` |
| Meta injection | Open Graph parsers | `og-property-injection.html` |

### 1.3 Encoding Variants

| Original | Encoded Variant |
|----------|-----------------|
| `display:none` | HTML entity encoded |
| Event handlers | Unicode escaped |
| Data attributes | Base64 in data URI |

**TA-02 Total Expansion: +45 fixtures**

---

## 2. TA-03: Output Handling Expansion

**Current State:** 52 fixtures in `output/` directory  
**Current Coverage:** XSS, SQL Injection, Command Injection, SSRF, Path Traversal, Open Redirect

### 2.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Potential Additions | Priority |
|----------|---------|-----------------|---------------------|----------|
| **XSS** | 12 | DOM clobbering, mutation XSS, UTF-7 XSS, expression XSS, SVG animate XSS, mutation-based | +6 | High |
| **SQL Injection** | 8 | NoSQL injection (MongoDB, Redis), GraphQL injection, HiveQL, Cypher (Neo4j), LINQ injection | +5 | High |
| **Command Injection** | 8 | PowerShell specific, cmd.exe specific, zsh/bash differences, Windows batch, Python exec | +4 | Medium |
| **SSRF** | 6 | Cloud-specific (AWS/GCP/Azure), Kubernetes internal, Docker socket, Redis internal | +4 | High |
| **Path Traversal** | 5 | ZIP slip, archive traversal, cloud storage paths, S3 bucket traversal | +3 | Medium |
| **Open Redirect** | 3 | OAuth redirect abuse, SAML redirect, OpenID redirect chains | +3 | Medium |
| **NEW: Template Injection** | 0 | Jinja2, Twig, Handlebars, Mustache, Angular template injection | +5 | High |
| **NEW: Deserialization** | 0 | Pickle, YAML, Java serialization, JSON deserialization attacks | +4 | High |
| **NEW: LDAP Injection** | 0 | LDAP filter bypass, AD query manipulation | +3 | Medium |

### 2.2 Cross-Category Application

| Source Vector | Target Context | New Fixture |
|---------------|----------------|-------------|
| SQL injection | Vector databases | `out-vec-sqli.txt` |
| XSS | Markdown renderers | `out-md-xss.txt` |
| Command injection | Container escape | `out-container-cmd.txt` |
| SSRF | Internal AI services | `out-ssrf-ai-endpoint.txt` |

### 2.3 Platform-Specific Variants

| Platform | Specific Vectors |
|----------|------------------|
| **AWS** | S3 SSRF, EC2 metadata, Lambda internal |
| **GCP** | Compute metadata, Cloud Storage, BigQuery |
| **Azure** | Instance metadata, Key Vault, Blob storage |
| **Kubernetes** | Service discovery, etcd, API server |

**TA-03 Total Expansion: +37 fixtures**

---

## 3. TA-04: Delivery Vectors Expansion

**Current State:** 50 fixtures in `delivery-vectors/` and related directories  
**Current Coverage:** Shared Documents, API Responses, Plugin Injection, Compromised Tools, Altered Prompts, Untrusted Sources

### 3.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Potential Additions | Priority |
|----------|---------|-----------------|---------------------|----------|
| **Shared Documents** | 8 | Notion pages, Confluence macros, SharePoint files, Google Docs comments, Figma embeds | +5 | High |
| **API Responses** | 6 | gRPC responses, WebSocket messages, SSE streams, GraphQL subscriptions, MQTT messages | +5 | High |
| **Plugin Injection** | 6 | VS Code extension attacks, JetBrains plugin, Obsidian plugin, Chrome extension content scripts | +4 | High |
| **Compromised Tools** | 6 | CI/CD pipeline injection (GitHub Actions, GitLab CI, Jenkins), pre-commit hooks, husky | +4 | High |
| **Altered Prompts** | 6 | Few-shot poisoning, chain-of-thought manipulation, system prompt leakage via API | +3 | Medium |
| **Untrusted Sources** | 12 | npm provenance, PyPI metadata, Docker Hub descriptions, GitHub Releases | +3 | Medium |
| **NEW: Email Delivery** | 0 | Email headers, MIME parts, attachments, HTML email bodies | +4 | High |
| **NEW: Calendar Events** | 0 | ICS file injection, meeting descriptions, location fields | +3 | Medium |
| **NEW: Messaging Platforms** | 0 | Slack blocks, Discord embeds, Teams cards, Telegram formatting | +4 | High |

### 3.2 Cross-Category Application

| Source Vector | Target Context | New Fixture |
|---------------|----------------|-------------|
| Plugin injection | MCP protocol | `delivery-mcp-plugin.json` |
| API responses | GraphQL errors | `delivery-graphql-error.json` |
| Compromised tools | DevContainer | `delivery-devcontainer.json` |
| Untrusted sources | Package mirrors | `delivery-npm-mirror.json` |

**TA-04 Total Expansion: +35 fixtures**

---

## 4. TA-05: Search Results Expansion

**Current State:** 35 fixtures in `search-results/` directory  
**Current Coverage:** SEO Poisoning, Snippet Injection, Malicious URLs

### 4.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Potential Additions | Priority |
|----------|---------|-----------------|---------------------|----------|
| **SEO Poisoning** | 4 | Schema.org manipulation, structured data poisoning, rich snippet abuse | +3 | Medium |
| **Snippet Injection** | 4 | Featured snippet hijacking, PAA (People Also Ask) manipulation, FAQ schema abuse | +3 | High |
| **Malicious URLs** | 4 | Redirect chains, URL shortener abuse, punycode URLs, homograph domains | +3 | Medium |
| **NEW: AI Search** | 0 | Perplexity manipulation, ChatGPT browsing, Bing Chat results, Google SGE | +5 | High |
| **NEW: Vertical Search** | 0 | Image search, video search, news search, shopping results, academic search | +5 | High |
| **NEW: Local Search** | 0 | Google Maps manipulation, Yelp poisoning, business listing hijacking | +3 | Medium |

### 4.2 Search Engine Specific

| Engine | Specific Vectors |
|--------|------------------|
| **Google** | SGE manipulation, Discover feed, Knowledge Panel |
| **Bing** | Chat integration, Copilot results |
| **DuckDuckGo** | Instant Answer manipulation |
| **Perplexity** | Citation manipulation, source ranking |
| **Academic** | Google Scholar, Semantic Scholar, arXiv |

**TA-05 Total Expansion: +22 fixtures**

---

## 5. TA-06: Social Engineering Expansion

**Current State:** 36 fixtures in `social/`, 52 in `cognitive/` = 88 total  
**Current Coverage:** Authority, Urgency, Emotional, False Rapport, Persona, Hypothetical, Fiction, Roleplay, Reverse Psychology, Reward Hacking

### 5.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Potential Additions | Priority |
|----------|---------|-----------------|---------------------|----------|
| **Authority Impersonation** | 6 | Government agency, law enforcement, regulatory body, auditor persona | +4 | High |
| **Urgency Framing** | 5 | Timezone confusion, deadline manipulation, expiry threats | +3 | Medium |
| **Emotional Manipulation** | 6 | Empathy exploitation, sympathy plays, trauma bonding | +3 | Medium |
| **False Rapport** | 5 | Insider language, shared enemy, group identity | +2 | Low |
| **Persona Manipulation** | 6 | Celebrity impersonation, expert persona, victim persona | +3 | Medium |
| **Hypothetical Framing** | 5 | Alternate history, future scenario, parallel universe | +2 | Low |
| **Fiction Framing** | 4 | Interactive fiction, choose-your-own-adventure, RPG mechanics | +2 | Low |
| **Roleplay Manipulation** | 5 | NPC behavior, quest objectives, game mechanics exploitation | +2 | Low |
| **Reverse Psychology** | 3 | Double-blind, paradox, anti-pattern | +1 | Low |
| **Reward Hacking** | 4 | Gamification, achievement systems, loyalty exploitation | +2 | Low |
| **NEW: Consensus Manipulation** | 0 | Fake agreement, manufactured consensus, bandwagon | +3 | High |
| **NEW: Scarcity Tactics** | 0 | Limited access, exclusive information, invite-only | +2 | Medium |
| **NEW: Commitment Consistency** | 0 | Foot-in-door escalation, small yes → big yes | +2 | Medium |

### 5.2 Multi-Turn Social Engineering

| Attack Chain | Description | New Fixture |
|--------------|-------------|-------------|
| Authority → Urgency | Build authority then add pressure | `social-auth-urgency-chain.txt` |
| Rapport → Request | Build trust then exploit | `social-rapport-request-chain.txt` |
| Fiction → Reality | Start fictional, shift to real | `social-fiction-reality-blur.txt` |

**TA-06 Total Expansion: +29 fixtures**

---

## 6. TA-07: Agent Security Expansion

**Current State:** 74 fixtures in `agent/` + 31 in `agent-output/` + 15 in `tool-manipulation/` = 120 total  
**Current Coverage:** Credential Harvesting, Context Poisoning, Data Poisoning, RAG Poisoning, Tool Manipulation, Agent Output

### 6.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Potential Additions | Priority |
|----------|---------|-----------------|---------------------|----------|
| **Credential Harvesting** | 12 | OAuth tokens, JWT extraction, session cookies, mTLS certs | +4 | High |
| **Context Poisoning** | 12 | Multi-agent context, federated context, cross-session context | +3 | High |
| **Data Poisoning** | 12 | Training data, fine-tuning data, feedback data | +3 | Medium |
| **RAG Poisoning** | 15 | Multi-hop RAG, hybrid RAG, graph RAG, recursive RAG | +4 | High |
| **Tool Manipulation** | 15 | Tool chaining, tool composition, parallel tool calls | +3 | Medium |
| **Agent Output** | 31 | Multi-agent output, agent-to-agent communication | +2 | Medium |
| **NEW: Multi-Agent Attacks** | 0 | Agent collusion, agent impersonation, agent hierarchy abuse | +5 | High |
| **NEW: Memory Attacks** | 0 | Long-term memory, episodic memory, semantic memory | +4 | High |
| **NEW: Planning Attacks** | 0 | Goal hijacking, plan injection, objective manipulation | +3 | High |

### 6.2 Framework-Specific Attacks

| Framework | Specific Vectors |
|-----------|------------------|
| **LangChain** | Chain injection, memory manipulation, retriever abuse |
| **AutoGPT** | Goal injection, workspace manipulation |
| **CrewAI** | Role confusion, task hijacking |
| **Microsoft Semantic Kernel** | Skill injection, planner manipulation |
| **LlamaIndex** | Index poisoning, query engine abuse |

**TA-07 Total Expansion: +31 fixtures**

---

## 7. TA-08: Session Security Expansion

**Current State:** 36 fixtures in `session/` + multi-turn subdirectory  
**Current Coverage:** Multi-turn Attacks, Memory Injection, Conversation Override, Continuation Attacks

### 7.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Potential Additions | Priority |
|----------|---------|-----------------|---------------------|----------|
| **Multi-turn Attacks** | 18 | 50+ turn attacks, cross-day attacks, cross-week attacks | +4 | High |
| **Memory Injection** | 6 | Long-term memory, semantic memory, episodic memory | +3 | High |
| **Conversation Override** | 6 | Thread hijacking, reply chain poisoning | +2 | Medium |
| **Continuation Attacks** | 6 | Cross-model continuation, cross-platform continuation | +2 | Medium |
| **NEW: Session Fixation** | 0 | Session ID prediction, session token theft | +3 | High |
| **NEW: Cross-User Attacks** | 0 | Shared context leakage, multi-tenant isolation bypass | +4 | High |
| **NEW: Temporal Attacks** | 0 | Time-based triggers, scheduled activation | +3 | Medium |
| **NEW: State Manipulation** | 0 | State rollback, state corruption, checkpoint abuse | +3 | Medium |

### 7.2 Persistence Variants

| Variant | Description | Duration |
|---------|-------------|----------|
| Session-only | Current session only | 1 session |
| Cross-session | Survives session boundary | Multiple sessions |
| Cross-user | Affects other users | Multi-user |
| Permanent | Stored in long-term memory | Indefinite |

**TA-08 Total Expansion: +24 fixtures**

---

## 8. TA-10: Denial of Service Expansion

**Current State:** 55 fixtures in `dos/` directory  
**Current Coverage:** Input Length, Recursive/Loop, Context Overflow, Output Limit, Concurrent Flood, Cost Harvesting

### 8.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Potential Additions | Priority |
|----------|---------|-----------------|---------------------|----------|
| **Input Length** | 4 | Unicode expansion (emoji, zalgo), compression bombs | +2 | Medium |
| **Recursive/Loop** | 4 | Nested templates, recursive includes, circular references | +2 | Medium |
| **Context Overflow** | 4 | Multi-document overflow, RAG context flooding | +2 | Medium |
| **Output Limit** | 4 | Streaming output abuse, chunked encoding | +1 | Low |
| **Concurrent Flood** | 3 | Distributed attacks, coordinated flooding | +2 | Medium |
| **Cost Harvesting** | 2 | Multi-model chains, expensive model routing | +2 | High |
| **NEW: GPU Exhaustion** | 0 | VRAM exhaustion, compute saturation, batch abuse | +3 | High |
| **NEW: Rate Limit Bypass** | 0 | Distributed requests, IP rotation, user-agent switching | +2 | Medium |
| **NEW: Quota Exhaustion** | 0 | API quota depletion, token limit exhaustion | +2 | Medium |

**TA-10 Total Expansion: +18 fixtures**

---

## 9. TA-11: Supply Chain Expansion

**Current State:** 55 fixtures in `supply-chain/` directory  
**Current Coverage:** Model Tampering, Dependency Attacks, Plugin Security, Data Source, Typosquatting, Config Tampering

### 9.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Potential Additions | Priority |
|----------|---------|-----------------|---------------------|----------|
| **Model Tampering** | 4 | Quantization attacks, pruning attacks, distillation attacks | +3 | High |
| **Dependency Attacks** | 4 | Transitive dependencies, optional dependencies, peer dependencies | +2 | Medium |
| **Plugin Security** | 4 | Plugin marketplace attacks, plugin update hijacking | +2 | Medium |
| **Data Source** | 4 | Training data poisoning, fine-tuning data manipulation | +2 | Medium |
| **Typosquatting** | 4 | Combo squatting, homograph attacks, TLD variation | +2 | Medium |
| **Config Tampering** | 4 | Environment injection, secrets in config, CI/CD config | +2 | Medium |
| **NEW: SBOM Attacks** | 0 | SBOM manipulation, VEX abuse, attestation forgery | +3 | High |
| **NEW: Registry Attacks** | 0 | Package mirror poisoning, namespace squatting | +2 | High |
| **NEW: Build Attacks** | 0 | Build script injection, compiler backdoors | +2 | High |

**TA-11 Total Expansion: +20 fixtures**

---

## 10. TA-12: Model Theft Expansion

**Current State:** 55 fixtures in `model-theft/` directory  
**Current Coverage:** API Extraction, Fingerprinting, Probability Distribution, Training Reconstruction, Watermark Attacks, Side Channels

### 10.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Potential Additions | Priority |
|----------|---------|-----------------|---------------------|----------|
| **API Extraction** | 6 | Multi-turn extraction, distributed extraction, stealth extraction | +3 | High |
| **Fingerprinting** | 6 | Behavior fingerprinting, style fingerprinting, error fingerprinting | +2 | Medium |
| **Probability Distribution** | 6 | Temperature manipulation, top-k/top-p extraction | +2 | Medium |
| **Training Reconstruction** | 6 | Gradient inference, membership inference variants | +2 | Medium |
| **Watermark Attacks** | 6 | Paraphrase attacks, translation attacks, summarization attacks | +2 | Medium |
| **Side Channels** | 6 | Network timing, cache timing, power analysis | +2 | Medium |
| **NEW: Model Inversion** | 0 | Training data reconstruction, feature extraction | +3 | High |
| **NEW: Knowledge Distillation Theft** | 0 | Teacher-student extraction, proxy model training | +2 | High |

**TA-12 Total Expansion: +18 fixtures**

---

## 11. TA-15: Overreliance Expansion

**Current State:** 42 fixtures in `or/` directory  
**Current Coverage:** Attribution Failures, Confidence Issues, Consistency Failures, Automated Decisions, Code Execution, Professional Advice

### 11.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Potential Additions | Priority |
|----------|---------|-----------------|---------------------|----------|
| **Attribution Failures** | 7 | Fake DOI, fake URL, fake institution | +3 | Medium |
| **Confidence Issues** | 7 | Overconfidence in uncertainty, calibrated confidence bypass | +2 | Medium |
| **Consistency Failures** | 7 | Temporal consistency, cross-topic consistency | +2 | Medium |
| **Automated Decisions** | 7 | Autonomous systems, self-driving decisions, medical AI | +3 | High |
| **Code Execution** | 7 | Infrastructure as code, DevOps automation, CI/CD | +2 | High |
| **Professional Advice** | 7 | Financial advice, legal advice, engineering decisions | +2 | High |
| **NEW: Chain-of-Thought Manipulation** | 0 | Reasoning path hijacking, logic chain corruption | +3 | High |
| **NEW: Verification Bypass** | 0 | Fake verification, source fabrication | +2 | Medium |

**TA-15 Total Expansion: +19 fixtures**

---

## 12. TA-16: Vector/Embeddings Expansion

**Current State:** 44 fixtures in `vec/` directory  
**Current Coverage:** Embedding Extraction, Vector Leakage, RAG Poisoning, Similarity Manipulation, SEO via Embeddings, Membership Inference, Projection Attacks

### 12.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Potential Additions | Priority |
|----------|---------|-----------------|---------------------|----------|
| **Embedding Extraction** | 5 | Multi-model extraction, cross-lingual extraction | +2 | Medium |
| **Vector Leakage** | 5 | Multi-tenant leakage, timing-based leakage | +2 | High |
| **RAG Poisoning** | 5 | Multi-hop poisoning, cross-index poisoning | +2 | High |
| **Similarity Manipulation** | 5 | Adversarial embeddings, similarity bombing | +2 | Medium |
| **SEO via Embeddings** | 5 | Vector search optimization, embedding spam | +1 | Low |
| **Membership Inference** | 5 | Training membership, fine-tuning membership | +1 | Low |
| **Projection Attacks** | 5 | Dimension extraction, space reconstruction | +1 | Low |
| **NEW: Database-Specific** | 0 | Pinecone, Weaviate, Chroma, Qdrant, Milvus specific | +15 | High |
| **NEW: Hybrid Search** | 0 | Vector + keyword, multi-modal embeddings | +3 | Medium |

**TA-16 Total Expansion: +29 fixtures** (includes +15 from implementation plan)

---

## 13. TA-17: Bias & Fairness Expansion

**Current State:** 35+ fixtures in `bias/` directory  
**Current Coverage:** Gender, Racial, Age, Disability, Socioeconomic, Cultural, Geographic, Language, Religious Bias

### 13.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Potential Additions | Priority |
|----------|---------|-----------------|---------------------|----------|
| **Gender Bias** | 8 | Non-binary, transgender, intersectional gender | +2 | Medium |
| **Racial Bias** | 8 | Mixed race, indigenous, intersectional race | +2 | Medium |
| **Age Bias** | 6 | Children, elderly, intergenerational | +2 | Medium |
| **Disability Bias** | 8 | Invisible disabilities, neurodiversity, mental health | +2 | Medium |
| **Socioeconomic Bias** | 7 | Homelessness, poverty indicators, wealth signaling | +2 | Medium |
| **Cultural Bias** | 8 | Indigenous cultures, minority cultures, diaspora | +2 | Medium |
| **Geographic Bias** | 7 | Rural/urban, Global South, conflict zones | +2 | Medium |
| **Language Performance** | 7 | Dialect, creole, sign language, endangered languages | +2 | Medium |
| **Religious Bias** | 8 | Minority religions, atheism, syncretism | +2 | Medium |
| **NEW: Intersectional** | 0 | Multiple identity factors combined | +5 | High |
| **NEW: Contextual Bias** | 0 | Situational bias, temporal bias, domain bias | +3 | Medium |

**TA-17 Total Expansion: +26 fixtures**

---

## 14. TA-18/19: Multimodal Expansion

**Current State:** 35 fixtures in `multimodal/`, 67 in `images/`, 48 in `audio/` = 150 total  
**Current Coverage:** EXIF, PNG tEXt, SVG Script, Audio Metadata, Format Mismatches, Buffer Overflow, Image Injection, Video/Subtitle, Deepfake, Cross-Modal, OCR, GIF Comment

### 14.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Potential Additions | Priority |
|----------|---------|-----------------|---------------------|----------|
| **EXIF Injection** | 4 | GPS manipulation, camera info spoofing, timestamp manipulation | +2 | Medium |
| **PNG tEXt Injection** | 4 | zTXt compression, iTXt international text | +1 | Low |
| **SVG Script Injection** | 6 | Animation timing, SMIL attacks, filter attacks | +2 | Medium |
| **Audio Metadata** | 6 | Lyrics injection, chapter markers, cover art | +2 | Medium |
| **Format Mismatches** | 8 | Polyglot files, magic byte manipulation | +2 | Medium |
| **Buffer Overflow** | 4 | Integer overflow, heap overflow in parsers | +1 | Low |
| **Image Injection** | 8 | QR code attacks, barcode manipulation, steganography | +2 | Medium |
| **Video/Subtitle** | 5 | ASS/SSA attacks, WebVTT styling, embedded fonts | +2 | Medium |
| **Deepfake Indicators** | 6 | Detection evasion, quality manipulation | +2 | High |
| **Cross-Modal** | 8 | Audio-to-image, image-to-text chains | +2 | Medium |
| **OCR Attacks** | 4 | Font confusion, background noise, perspective distortion | +2 | Medium |
| **GIF Comment** | 4 | Animation timing, frame manipulation | +1 | Low |
| **NEW: 3D Model Attacks** | 0 | STL injection, GLTF script, OBJ metadata | +3 | High |
| **NEW: Document Attacks** | 0 | PDF JavaScript, DOCX macro, XLSX formula | +3 | High |
| **NEW: Font Attacks** | 0 | Font substitution, glyph confusion, font metadata | +2 | Medium |

**TA-18/19 Total Expansion: +27 fixtures**

---

## 15. TA-20: Environmental Expansion

**Current State:** 6 fixtures in `environmental/` directory  
**Current Coverage:** Energy Measurement, Carbon Footprint, Efficiency

### 15.1 Expansion Opportunities

| Sub-Area | Current | Missing Vectors | Potential Additions | Priority |
|----------|---------|-----------------|---------------------|----------|
| **Energy Measurement** | 5 | GPU energy, TPU energy, distributed energy | +2 | Medium |
| **Carbon Footprint** | 5 | Regional variations, renewable energy claims | +2 | Medium |
| **Efficiency** | 5 | Optimization-safety tradeoffs, efficiency bypass | +1 | Low |
| **NEW: Greenwashing** | 0 | False sustainability claims, carbon offset manipulation | +2 | Medium |
| **NEW: Resource Efficiency** | 0 | Water usage, rare earth materials, e-waste | +2 | Low |

**TA-20 Total Expansion: +9 fixtures**

---

## 16. Summary & Recommendations

### 16.1 Total Expansion Potential

| Testing Area | Current | Expansion | Total After | % Increase |
|--------------|---------|-----------|-------------|------------|
| TA-02: WebFetch | 48 | +45 | 93 | +94% |
| TA-03: Output Handling | 52 | +37 | 89 | +71% |
| TA-04: Delivery Vectors | 50 | +35 | 85 | +70% |
| TA-05: Search Results | 35 | +22 | 57 | +63% |
| TA-06: Social Engineering | 88 | +29 | 117 | +33% |
| TA-07: Agent Security | 120 | +31 | 151 | +26% |
| TA-08: Session Security | 36 | +24 | 60 | +67% |
| TA-10: Denial of Service | 55 | +18 | 73 | +33% |
| TA-11: Supply Chain | 55 | +20 | 75 | +36% |
| TA-12: Model Theft | 55 | +18 | 73 | +33% |
| TA-15: Overreliance | 42 | +19 | 61 | +45% |
| TA-16: Vector/Embeddings | 44 | +29 | 73 | +66% |
| TA-17: Bias & Fairness | 35 | +26 | 61 | +74% |
| TA-18/19: Multimodal | 150 | +27 | 177 | +18% |
| TA-20: Environmental | 6 | +9 | 15 | +150% |
| **TOTAL** | **871** | **+369** | **1,240** | **+42%** |

### 16.2 Priority Ranking

| Priority | Testing Areas | Expansion | Rationale |
|----------|---------------|-----------|-----------|
| **P1 - Critical** | TA-02, TA-03, TA-07, TA-16 | +142 | High impact, emerging threats |
| **P2 - High** | TA-04, TA-05, TA-08, TA-11 | +101 | Framework compliance gaps |
| **P3 - Medium** | TA-06, TA-10, TA-12, TA-15, TA-17 | +110 | Comprehensive coverage |
| **P4 - Low** | TA-18/19, TA-20 | +36 | Nice-to-have expansion |

### 16.3 Implementation Phases

| Phase | Focus | Fixtures | Timeline |
|-------|-------|----------|----------|
| **Phase 1** | MCP, OAuth, Vector DB, Persistence (from impl plan) | +47 | Weeks 1-3 |
| **Phase 2** | TA-02 WebFetch, TA-03 Output Handling | +82 | Weeks 4-5 |
| **Phase 3** | TA-04 Delivery, TA-05 Search, TA-07 Agent | +88 | Weeks 6-7 |
| **Phase 4** | TA-06 Social, TA-08 Session, TA-16 Vector | +83 | Weeks 8-9 |
| **Phase 5** | Remaining areas | +69 | Weeks 10-11 |
| **Total** | | **+369** | **11 weeks** |

### 16.4 Resource Requirements

| Resource | Phase 1 | Phases 2-5 | Total |
|----------|---------|------------|-------|
| Security Engineer | 10 days | 25 days | 35 days |
| QA Engineer | 5 days | 15 days | 20 days |
| Documentation | 2 days | 5 days | 7 days |
| **Total Effort** | **17 days** | **45 days** | **62 days** |

### 16.5 Recommendations

1. **Prioritize TA-02 and TA-03** - These areas have the highest expansion potential (+94% and +71%) and directly impact OWASP LLM01/LLM02 compliance.

2. **Focus on emerging threats** - MCP protocol, OAuth/token injection, and vector database attacks are not covered by current fixtures and represent real-world attack surfaces.

3. **Add cross-category fixtures** - Many attack vectors can be applied across categories (e.g., encoding variants for all attack types).

4. **Implement platform-specific variants** - Cloud provider-specific SSRF, database-specific injection, and framework-specific agent attacks.

5. **Maintain clean control fixtures** - For every 3 attack fixtures, add 1 clean control to ensure false positive testing.

---

## Appendix: Detailed Expansion Matrix

### A.1 Encoding Variant Opportunities

| Base Attack | Encoded Variants | Applicable Categories |
|-------------|------------------|----------------------|
| Direct injection | Base64, URL-encoded, HTML entities, Unicode | All categories |
| Plain text | ROT13, ROT47, pig latin, morse | TA-01, TA-06 |
| Visible text | Zero-width, homoglyphs, confusables | TA-01, TA-02 |
| Standard format | JSON, XML, YAML, CSV surrogate | TA-01, TA-04 |

### A.2 Context Variant Opportunities

| Base Attack | Context Variants | Applicable Categories |
|-------------|------------------|----------------------|
| Direct request | Fictional, hypothetical, educational | TA-06, TA-08 |
| Single turn | Multi-turn, gradual escalation | TA-08 |
| Single agent | Multi-agent, agent-to-agent | TA-07 |
| Single session | Cross-session, persistent | TA-08 |

### A.3 Platform Variant Opportunities

| Platform Type | Specific Variants | Applicable Categories |
|---------------|-------------------|----------------------|
| Cloud Provider | AWS, GCP, Azure, Oracle | TA-03, TA-04 |
| Vector DB | Pinecone, Weaviate, Chroma, Qdrant | TA-16 |
| Agent Framework | LangChain, LlamaIndex, AutoGPT | TA-07 |
| Search Engine | Google, Bing, Perplexity | TA-05 |

---

**Document Status:** Audit Complete  
**Next Action:** Review priorities and approve expansion plan
