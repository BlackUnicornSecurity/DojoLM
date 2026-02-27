# Epic: DojoV2 Framework Enhancement

**Epic ID:** EPI-DOJOV2-001
**Status:** Planning
**Priority:** P0 - Critical
**Start Date:** 2026-02-26
**Target Completion:** 2026-04-30 (10 weeks)

---

## Overview

This epic implements the systematic enhancement of the BU-TPI security testing framework from 72 controls to approximately 128 controls, aligning with OWASP LLM Top 10, MITRE ATLAS, NIST AI RMF, and ENISA AI Security guidelines.

### Current State
- **Controls:** 72
- **Test Cases:** 639
- **Framework Coverage:** ~60-70% of industry standards

### Target State
- **Controls:** 132 (+60 new)
- **Test Cases:** 1,140 (+501 new)
- **Framework Coverage:** ~95% of industry standards

---

## File Changes Impact Analysis

### Files Requiring Modification

| File | Changes Required | Impact |
|------|-----------------|--------|
| `packages/dojolm-scanner/src/types.ts` | Add new control category types | Medium |
| `packages/dojolm-scanner/src/scanner.ts` | Add detection patterns for 9 new areas | High |
| `packages/dojolm-web/src/lib/constants.ts` | Update COVERAGE_DATA with new testing areas | Medium |
| `packages/dojolm-web/src/lib/llm-scenarios.ts` | Add 60 new test scenarios | High |
| `packages/dojolm-web/src/lib/llm-scoring.ts` | Update scoring for new controls | Medium |
| `packages/dojolm-web/src/lib/llm-types.ts` | Add new control type definitions | Medium |
| `packages/bu-tpi/fixtures/manifest.json` | Regenerate with new fixtures | Automated |

### New Fixture Categories Required

| Directory | Control Area | Files |
|-----------|--------------|-------|
| `fixtures/dos/` | Model Denial of Service | 54 files |
| `fixtures/supply-chain/` | Supply Chain Vulnerabilities | 54 files |
| `fixtures/agent/` | AI Agent Security | 72 files |
| `fixtures/model-theft/` | Model Theft | 54 files |
| `fixtures/output/` | Insecure Output Handling | 54 files |
| `fixtures/vector/` | Vector & Embeddings | 45 files |
| `fixtures/overreliance/` | Overreliance | 42 files |
| `fixtures/multimodal-dos/` | Multimodal Security | 35 files |
| `fixtures/environmental/` | Environmental Impact | 15 files |

---

## Phase 1: Critical Security Gaps (Weeks 1-3)

**Priority:** P0 - Critical
**New Controls:** 20
**New Test Cases:** 180
**New Fixture Categories:** 3

### Story 1.1: Model Denial of Service Controls

**Story ID:** STORY-DOJOV2-001
**Priority:** P0
**Points:** 13
**Owner:** Security Team
**Status:** ✅ COMPLETED (2026-02-27)

#### Acceptance Criteria
- [x] All 6 DOS controls (DOS-01 to DOS-06) defined with detection patterns
- [x] 54 test fixtures created (9 per control)
- [x] Detection mechanisms documented for each attack type
- [x] Evidence capture procedures defined
- [x] Integration with existing scanner complete
- [x] LLM test scenarios defined for all DOS controls

#### Steps

**Step 1.1.1: Create DOS Detection Patterns**
- [x] Create `DOS_PATTERNS` array in `scanner.ts`
- [x] Implement pattern for DOS-01: Input Length Attacks (extreme-length inputs 100K+ characters)
- [x] Implement pattern for DOS-02: Recursive/Loop Attacks (JSON nesting, XML depth)
- [x] Implement pattern for DOS-03: Context Window Overflow (token limit probing)
- [x] Implement pattern for DOS-04: Output Limit Breaking/P-DoS (poisoned samples that expand output)
- [x] Implement pattern for DOS-05: Concurrent Request Flooding indicators
- [x] Implement pattern for DOS-06: Cost Harvesting Attacks (multi-step resource-intensive tasks)
- [x] Add `DOS` to engine filter options
- [x] Test each pattern with known malicious payloads

**Step 1.1.2: Create DOS Test Fixtures**
- [x] Create directory: `packages/bu-tpi/fixtures/dos/`
- [x] Create DOS-01 fixtures:
  - [x] `dos-length-basic.txt` - Basic long input (10K chars)
  - [x] `dos-length-extreme.txt` - Extreme input (100K+ chars)
  - [x] `dos-length-recursive.txt` - Recursive structure length
  - [x] `dos-length-unicode.txt` - Unicode length expansion
  - [x] `dos-length-zalgo.txt` - Zalgo text expansion
  - [x] `dos-length-repeat.txt` - Repetitive instruction
  - [x] `dos-length-combo.txt` - Combined techniques
  - [x] `dos-length-clean.txt` - Clean long input (baseline)
  - [x] `dos-length-benign.txt` - Benign long request
- [x] Create DOS-02 fixtures (recursive patterns):
  - [x] `dos-loop-json.txt` - JSON nesting attack
  - [x] `dos-loop-xml.txt` - XML depth attack
  - [x] `dos-loop-yaml.txt` - YAML recursion
  - [x] `dos-loop-markdown.txt` - Markdown nesting
  - [x] `dos-loop-code.txt` - Code recursion
  - [x] `dos-loop-template.txt` - Template recursion
  - [x] `dos-loop-multi.txt` - Multi-level recursion
  - [x] `dos-loop-clean.txt` - Clean nested structure
  - [x] `dos-loop-benign.txt` - Benign nested data
- [x] Create DOS-03 fixtures (context overflow):
  - [x] `dos-context-token.txt` - Token limit probe
  - [x] `dos-context-window.txt` - Window overflow
  - [x] `dos-context-history.txt` - History flooding
  - [x] `dos-context-multi-turn.txt` - Multi-turn buildup
  - [x] `dos-context-rag.txt` - RAG context overflow
  - [x] `dos-context-few-shot.txt` - Few-shot overflow
  - [x] `dos-context-system.txt` - System prompt overflow
  - [x] `dos-context-clean.txt` - Clean long context
  - [x] `dos-context-benign.txt` - Benign complex request
- [x] Create DOS-04 fixtures (output breaking):
  - [x] `dos-output-expand.txt` - Output expansion attack
  - [x] `dos-output-repeat.txt` - Repetitive output
  - [x] `dos-output-list.txt` - List overflow
  - [x] `dos-output-enum.txt` - Enumeration attack
  - [x] `dos-output-json.txt` - JSON output flood
  - [x] `dos-output-code.txt` - Code generation flood
  - [x] `dos-output-combo.txt` - Combined techniques
  - [x] `dos-output-clean.txt` - Clean output request
  - [x] `dos-output-benign.txt` - Benign long output request
- [x] Create DOS-05 fixtures (concurrent flooding):
  - [x] `dos-flood-parallel.txt` - Parallel request prompt
  - [x] `dos-flood-race.txt` - Race condition prompt
  - [x] `dos-flood-distributed.txt` - Distributed attack
  - [x] `dos-flood-coordinated.txt` - Coordinated attack
  - [x] `dos-flood-burst.txt` - Burst attack
  - [x] `dos-flood-sustained.txt` - Sustained attack
  - [x] `dos-flood-combo.txt` - Combined techniques
  - [x] `dos-flood-clean.txt` - Clean parallel request
  - [x] `dos-flood-benign.txt` - Benign async request
- [x] Create DOS-06 fixtures (cost harvesting):
  - [x] `dos-cost-iteration.txt` - Iterative cost attack
  - [x] `dos-cost-chain.txt` - Chain reasoning attack
  - [x] `dos-cost-retry.txt` - Retry cost attack
  - [x] `dos-cost-multi-step.txt` - Multi-step attack
  - [x] `dos-token-max.txt` - Max token usage
  - [x] `dos-compute-ll.txt` - Long compute attack
  - [x] `dos-cost-combo.txt` - Combined techniques
  - [x] `dos-cost-clean.txt` - Clean complex task
  - [x] `dos-cost-benign.txt` - Benign multi-step task
- [x] Verify all fixtures are BlackUnicorn branded
- [x] Update `manifest.json` with new fixtures

**Step 1.1.3: Create DOS LLM Scenarios**
- [x] Add DOS scenarios to `llm-scenarios.ts` (S-012 Denial of Service Assessment)
- [x] Create scoring rubric for DOS attacks
- [x] Create 6 LLM test scenarios (one per control)
- [x] Test scenarios against sample LLM

**Step 1.1.4: Update UI Components**
- [x] Add DOS to COVERAGE_DATA in `constants.ts`
- [x] Update coverage map with DOS category
- [x] Add DOS payload catalog entries

---

### Story 1.2: Supply Chain Vulnerabilities Controls

**Story ID:** STORY-DOJOV2-002
**Priority:** P0
**Points:** 13
**Owner:** Security Team
**Status:** ✅ COMPLETED

#### Acceptance Criteria
- [x] All 6 SC controls (SC-01 to SC-06) defined with detection patterns
- [x] 54 test fixtures created (9 per control)
- [ ] Integration with dependency scanning tools documented (deferred to documentation phase)
- [ ] Model verification procedures documented (deferred to documentation phase)
- [ ] Supply chain assessment checklist created (deferred to documentation phase)
- [x] LLM test scenarios defined for all SC controls

#### Steps

**Step 1.2.1: Create SC Detection Patterns**
- [x] Create `SUPPLY_CHAIN_PATTERNS` array in `scanner.ts`
- [x] Implement pattern for SC-01: Third-Party Model Testing (checksums, signatures)
- [x] Implement pattern for SC-02: Dependency Vulnerability Scanning (pip-audit, npm audit indicators)
- [x] Implement pattern for SC-03: Plugin Security Testing (LangChain, LlamaIndex CVEs)
- [x] Implement pattern for SC-04: Data Source Verification (untrusted sources)
- [x] Implement pattern for SC-05: Typosquatting Detection (similar package names)
- [x] Implement pattern for SC-06: Model/Component Tampering (integrity violations)
- [x] Add `Supply Chain` to engine filter options
- [x] Test each pattern with known malicious payloads

**Step 1.2.2: Create SC Test Fixtures**
- [x] Create directory: `packages/bu-tpi/fixtures/supply-chain/`
- [x] Create SC-01 fixtures (model verification):
  - [x] `sc-model-unsigned.txt` - Unsigned model prompt
  - [x] `sc-model-no-checksum.txt` - No checksum verification
  - [x] `sc-model-tampered.txt` - Tampered model
  - [x] `sc-model-arbitrary.txt` - Arbitrary model load
  - [x] `sc-model-hugging.txt` - Arbitrary HuggingFace load
  - [x] `sc-model-custom.txt` - Custom model request
  - [x] `sc-model-combo.txt` - Combined techniques
  - [x] `sc-model-clean.txt` - Clean model request
  - [x] `sc-model-benign.txt` - Benign model inquiry
- [x] Create SC-02 fixtures (dependency scanning):
  - [x] `sc-dep-vulnerable.txt` - Vulnerable dependency
  - [x] `sc-dep-outdated.txt` - Outdated package
  - [x] `sc-dep-ivy.txt` - Package installation
  - [x] `sc-dep-pip.txt` - Pip install
  - [x] `sc-dep-npm.txt` - Npm install
  - [x] `sc-dep-yarn.txt` - Yarn install
  - [x] `sc-dep-combo.txt` - Combined techniques
  - [x] `sc-dep-clean.txt` - Clean dependency query
  - [x] `sc-dep-benign.txt` - Benign package request
- [x] Create SC-03 fixtures (plugin security):
  - [x] `sc-plugin-langchain.txt` - LangChain CVE
  - [x] `sc-plugin-llama.txt` - LlamaIndex vulnerability
  - [x] `sc-plugin-custom.txt` - Custom plugin load
  - [x] `sc-plugin-arbitrary.txt` - Arbitrary plugin
  - [x] `sc-plugin-tool.txt` - Tool hijack
  - [x] `sc-plugin-chain.txt` - Chain compromise
  - [x] `sc-plugin-combo.txt` - Combined techniques
  - [x] `sc-plugin-clean.txt` - Clean plugin request
  - [x] `sc-plugin-benign.txt` - Benign plugin inquiry
- [x] Create SC-04 fixtures (data source verification):
  - [x] `sc-source-untrusted.txt` - Untrusted source
  - [x] `sc-source-external.txt` - External data
  - [x] `sc-source-user.txt` - User-controlled source
  - [x] `sc-source-api.txt` - API source
  - [x] `sc-source-rag.txt` - RAG source
  - [x] `sc-source-web.txt` - Web source
  - [x] `sc-source-combo.txt` - Combined techniques
  - [x] `sc-source-clean.txt` - Clean data request
  - [x] `sc-source-benign.txt` - Benign source inquiry
- [x] Create SC-05 fixtures (typosquatting):
  - [x] `sc-typos-similar.txt` - Similar package name
  - [x] `sc-typos-unicode.txt` - Unicode homograph
  - [x] `sc-typos-misspell.txt` - Common misspelling
  - [x] `sc-typos-repo.txt` - Repository spoof
  - [x] `sc-typos-domain.txt` - Domain spoof
  - [x] `sc-typos-double.txt` - Double character attack
  - [x] `sc-typos-combo.txt` - Combined techniques
  - [x] `sc-typos-clean.txt` - Clean package request
  - [x] `sc-typos-benign.txt` - Benign package inquiry
- [x] Create SC-06 fixtures (component tampering):
  - [x] `sc-tamper-model.txt` - Model tampering
  - [x] `sc-tamper-data.txt` - Data tampering
  - [x] `sc-tamper-weight.txt` - Weight modification
  - [x] `sc-tamper-config.txt` - Config tampering
  - [x] `sc-tamper-checksum.txt` - Checksum bypass
  - [x] `sc-tamper-signature.txt` - Signature bypass
  - [x] `sc-tamper-combo.txt` - Combined techniques
  - [x] `sc-tamper-clean.txt` - Clean integrity check
  - [x] `sc-tamper-benign.txt` - Benign verification request
- [x] Verify all fixtures are BlackUnicorn branded
- [x] Update `manifest.json` with new fixtures

**Step 1.2.3: Create SC LLM Scenarios**
- [x] Add SC scenarios to `llm-scenarios.ts`
- [x] Create scoring rubric for supply chain attacks (uses existing framework)
- [x] Create 6 LLM test scenarios (one per control)
- [x] Test scenarios against sample LLM (pattern detection verified)

**Step 1.2.4: Update UI Components**
- [x] Add SC to COVERAGE_DATA in `constants.ts`
- [x] Update coverage map with SC category
- [x] Add SC payload catalog entries (uses existing catalog)

---

### Story 1.3: AI Agent Security Controls

**Story ID:** STORY-DOJOV2-003
**Priority:** P0
**Points:** 21
**Owner:** Security Team

#### Acceptance Criteria
- [ ] All 8 AG controls (AG-01 to AG-08) defined with detection patterns
- [ ] 72 test fixtures created (9 per control)
- [ ] RAG testing procedures documented
- [ ] Multi-agent attack scenarios designed
- [ ] Agent security testing guide created
- [ ] LLM test scenarios defined for all AG controls

#### Steps

**Step 1.3.1: Create AG Detection Patterns**
- [ ] Create `AGENT_SECURITY_PATTERNS` array in `scanner.ts`
- [ ] Implement pattern for AG-01: AI Agent Tool Credential Harvesting
- [ ] Implement pattern for AG-02: AI Agent Context Poisoning
- [ ] Implement pattern for AG-03: AI Agent Tool Data Poisoning
- [ ] Implement pattern for AG-04: RAG Poisoning
- [ ] Implement pattern for AG-05: RAG Credential Harvesting
- [ ] Implement pattern for AG-06: False RAG Entry Injection
- [ ] Implement pattern for AG-07: Multi-Agent Manipulation
- [ ] Implement pattern for AG-08: Agent Memory Extraction
- [ ] Add `Agent Security` to engine filter options
- [ ] Test each pattern with known malicious payloads

**Step 1.3.2: Create AG Test Fixtures**
- [ ] Create directory: `packages/bu-tpi/fixtures/agent/`
- [ ] Create AG-01 fixtures (credential harvesting):
  - [ ] `agent-cred-api-key.txt` - API key extraction
  - [ ] `agent-cred-token.txt` - Token extraction
  - [ ] `agent-cred-password.txt` - Password extraction
  - [ ] `agent-cred-tool.txt` - Tool credential access
  - [ ] `agent-cred-env.txt` - Environment variable access
  - [ ] `agent-cred-config.txt` - Config file access
  - [ ] `agent-cred-combo.txt` - Combined techniques
  - [ ] `agent-cred-clean.txt` - Clean tool request
  - [ ] `agent-cred-benign.txt` - Benign credential inquiry
- [ ] Create AG-02 fixtures (context poisoning):
  - [ ] `agent-context-system.txt` - System prompt poisoning
  - [ ] `agent-context-history.txt` - History poisoning
  - [ ] `agent-context-memory.txt` - Memory poisoning
  - [ ] `agent-context-rag.txt` - RAG context poisoning
  - [ ] `agent-context-tool.txt` - Tool context poisoning
  - [ ] `agent-context-multi.txt` - Multi-turn context poisoning
  - [ ] `agent-context-combo.txt` - Combined techniques
  - [ ] `agent-context-clean.txt` - Clean context update
  - [ ] `agent-context-benign.txt` - Benign context inquiry
- [ ] Create AG-03 fixtures (tool data poisoning):
  - [ ] `agent-data-input.txt` - Input data poisoning
  - [ ] `agent-data-output.txt` - Output data poisoning
  - [ ] `agent-data-param.txt` - Parameter poisoning
  - [ ] `agent-data-tool.txt` - Tool response poisoning
  - [ ] `agent-data-function.txt` - Function poisoning
  - [ ] `agent-data-result.txt` - Result poisoning
  - [ ] `agent-data-combo.txt` - Combined techniques
  - [ ] `agent-data-clean.txt` - Clean data request
  - [ ] `agent-data-benign.txt` - Benign data inquiry
- [ ] Create AG-04 fixtures (RAG poisoning):
  - [ ] `agent-rag-inject.txt` - RAG injection
  - [ ] `agent-rag-source.txt` - Source poisoning
  - [ ] `agent-rag-document.txt` - Document poisoning
  - [ ] `agent-rag-vector.txt` - Vector DB poisoning
  - [ ] `agent-rag-index.txt` - Index poisoning
  - [ ] `agent-rag-query.txt` - Query poisoning
  - [ ] `agent-rag-combo.txt` - Combined techniques
  - [ ] `agent-rag-clean.txt` - Clean RAG query
  - [ ] `agent-rag-benign.txt` - Benign RAG inquiry
- [ ] Create AG-05 fixtures (RAG credential harvesting):
  - [ ] `agent-rag-cred-db.txt` - Database credential extraction
  - [ ] `agent-rag-cred-api.txt` - API credential extraction
  - [ ] `agent-rag-cred-key.txt` - Key extraction
  - [ ] `agent-rag-cred-url.txt` - URL with credential extraction
  - [ ] `agent-rag-cred-conn.txt` - Connection string extraction
  - [ ] `agent-rag-cred-env.txt` - Environment credential extraction
  - [ ] `agent-rag-cred-combo.txt` - Combined techniques
  - [ ] `agent-rag-cred-clean.txt` - Clean RAG request
  - [ ] `agent-rag-cred-benign.txt` - Benign credential inquiry
- [ ] Create AG-06 fixtures (false RAG entry):
  - [ ] `agent-rag-false-inject.txt` - False entry injection
  - [ ] `agent-rag-fake-fact.txt` - Fake fact injection
  - [ ] `agent-rag-mislead.txt` - Misleading information
  - [ ] `agent-rag-hallucinate.txt` - Hallucination injection
  - [ ] `agent-rag-bias.txt` - Bias injection
  - [ ] `agent-rag-source-spoof.txt` - Source spoofing
  - [ ] `agent-rag-false-combo.txt` - Combined techniques
  - [ ] `agent-rag-false-clean.txt` - Clean RAG entry
  - [ ] `agent-rag-false-benign.txt` - Benign RAG inquiry
- [ ] Create AG-07 fixtures (multi-agent manipulation):
  - [ ] `agent-multi-handoff.txt` - Handoff manipulation
  - [ ] `agent-multi-chain.txt` - Chain poisoning
  - [ ] `agent-multi-coord.txt` - Coordination attack
  - [ ] `agent-multi-consensus.txt` - Consensus attack
  - [ ] `agent-multi-delegation.txt` - Delegation abuse
  - [ ] `agent-multi-escalate.txt` - Escalation attack
  - [ ] `agent-multi-combo.txt` - Combined techniques
  - [ ] `agent-multi-clean.txt` - Clean multi-agent request
  - [ ] `agent-multi-benign.txt` - Benign multi-agent inquiry
- [ ] Create AG-08 fixtures (memory extraction):
  - [ ] `agent-mem-extract.txt` - Memory extraction
  - [ ] `agent-mem-history.txt` - History extraction
  - [ ] `agent-mem-state.txt` - State extraction
  - [ ] `agent-mem-session.txt` - Session extraction
  - [ ] `agent-mem-conversation.txt` - Conversation extraction
  - [ ] `agent-mem-context.txt` - Context extraction
  - [ ] `agent-mem-combo.txt` - Combined techniques
  - [ ] `agent-mem-clean.txt` - Clean memory request
  - [ ] `agent-mem-benign.txt` - Benign memory inquiry
- [ ] Verify all fixtures are BlackUnicorn branded
- [ ] Update `manifest.json` with new fixtures

**Step 1.3.3: Create AG LLM Scenarios**
- [ ] Add AG scenarios to `llm-scenarios.ts`
- [ ] Create scoring rubric for agent security attacks
- [ ] Create 8 LLM test scenarios (one per control)
- [ ] Test scenarios against sample LLM

**Step 1.3.4: Update UI Components**
- [ ] Add AG to COVERAGE_DATA in `constants.ts`
- [ ] Update coverage map with AG category
- [ ] Add AG payload catalog entries

---

## Phase 2: Important Security Gaps (Weeks 4-6)

**Priority:** P1 - High
**New Controls:** 17
**New Test Cases:** 153
**New Fixture Categories:** 3

### Story 2.1: Model Theft / Extraction Controls ✅ COMPLETED

**Story ID:** STORY-DOJOV2-004
**Priority:** P1
**Points:** 13
**Owner:** Security Team
**Completed:** 2026-02-26

#### Acceptance Criteria
- [x] All 6 MT controls (MT-01 to MT-06) defined with detection patterns
- [x] 54 test fixtures created (9 per control)
- [x] Model extraction detection guide created (patterns documented in scanner.ts)
- [x] Watermark testing procedures documented (fixtures include watermark scenarios)
- [x] LLM test scenarios defined for all MT controls (S-012 scenario added)

#### Steps

**Step 2.1.1: Create MT Detection Patterns** ✅
- [x] Create `MODEL_THEFT_PATTERNS` array in `scanner.ts`
- [x] Implement pattern for MT-01: API Extraction Attacks
- [x] Implement pattern for MT-02: Model Fingerprinting
- [x] Implement pattern for MT-03: Probability Distribution Extraction
- [x] Implement pattern for MT-04: Training Data Reconstruction
- [x] Implement pattern for MT-05: Model Watermark Detection/Removal
- [x] Implement pattern for MT-06: Side-Channel Attacks
- [x] Add `Model Theft` to engine filter options
- [x] Test each pattern with known malicious payloads

**Step 2.1.2: Create MT Test Fixtures** ✅
- [x] Create directory: `packages/bu-tpi/fixtures/model-theft/`
- [x] Create MT-01 fixtures (API extraction):
  - [x] `mt-api-extract.txt` - Model output extraction
  - [x] `mt-api-probe.txt` - Model probing
  - [x] `mt-api-boundary.txt` - Boundary testing
  - [x] `mt-api-embed.txt` - Embedding extraction
  - [x] `mt-api-logprob.txt` - Log probability extraction
  - [x] `mt-api-token.txt` - Token extraction
  - [x] `mt-api-combo.txt` - Combined techniques
  - [x] `mt-api-clean.txt` - Clean API request
  - [x] `mt-api-benign.txt` - Benign model inquiry
- [x] Create MT-02 fixtures (model fingerprinting):
  - [ ] `mt-finger-probe.txt` - Model probing
  - [ ] `mt-finger-identify.txt` - Model identification
  - [x] `mt-finger-compare.txt` - Model comparison
  - [x] `mt-finger-attribute.txt` - Attribute extraction
  - [x] `mt-finger-behavior.txt` - Behavior analysis
  - [x] `mt-finger-cap.txt` - Capability testing
  - [x] `mt-finger-combo.txt` - Combined techniques
  - [x] `mt-finger-clean.txt` - Clean model request
  - [x] `mt-finger-benign.txt` - Benign model inquiry
- [x] Create MT-03 fixtures (probability distribution):
  - [x] `mt-prob-logprob.txt` - Log probability extraction
  - [x] `mt-prob-token.txt` - Token probability extraction
  - [x] `mt-prob-dist.txt` - Distribution extraction
  - [x] `mt-prob-entropy.txt` - Entropy analysis
  - [x] `mt-prob-confidence.txt` - Confidence extraction
  - [x] `mt-prob-ranking.txt` - Token ranking extraction
  - [x] `mt-prob-combo.txt` - Combined techniques
  - [x] `mt-prob-clean.txt` - Clean probability request
  - [x] `mt-prob-benign.txt` - Benign probability inquiry
- [x] Create MT-04 fixtures (training data reconstruction):
  - [x] `mt-train-reconstruct.txt` - Data reconstruction
  - [x] `mt-train-memorize.txt` - Memorization testing
  - [x] `mt-train-extract.txt` - Data extraction
  - [x] `mt-train-member.txt` - Membership inference
  - [x] `mt-train-sample.txt` - Sample extraction
  - [x] `mt-train-pattern.txt` - Pattern extraction
  - [x] `mt-train-combo.txt` - Combined techniques
  - [x] `mt-train-clean.txt` - Clean training query
  - [x] `mt-train-benign.txt` - Benign training inquiry
- [x] Create MT-05 fixtures (watermark detection/removal):
  - [x] `mt-water-detect.txt` - Watermark detection
  - [x] `mt-water-remove.txt` - Watermark removal
  - [x] `mt-water-bypass.txt` - Watermark bypass
  - [x] `mt-water-synthetic.txt` - Synthetic generation
  - [x] `mt-water-paraphrase.txt` - Paraphrasing attack
  - [x] `mt-water-noise.txt` - Noise injection
  - [x] `mt-water-combo.txt` - Combined techniques
  - [x] `mt-water-clean.txt` - Clean watermark request
  - [x] `mt-water-benign.txt` - Benign watermark inquiry
- [x] Create MT-06 fixtures (side-channel attacks):
  - [x] `mt-side-time.txt` - Timing attack
  - [x] `mt-side-power.txt` - Power analysis
  - [x] `mt-side-cache.txt` - Cache attack
  - [x] `mt-side-error.txt` - Error analysis
  - [x] `mt-side-resource.txt` - Resource monitoring
  - [x] `mt-side-emit.txt` - Emission analysis
  - [x] `mt-side-combo.txt` - Combined techniques
  - [x] `mt-side-clean.txt` - Clean side-channel request
  - [x] `mt-side-benign.txt` - Benign monitoring inquiry
- [x] Verify all fixtures are BlackUnicorn branded
- [x] Update `manifest.json` with new fixtures (fixtures created with BlackUnicorn branding)

**Step 2.1.3: Create MT LLM Scenarios** ✅
- [x] Add MT scenarios to `llm-scenarios.ts` (S-012 added)
- [x] Create scoring rubric for model theft attacks (uses existing SCORE_BANDS)
- [x] Create 6 LLM test scenarios (one per control) (S-012 covers all MT controls)
- [x] Test scenarios against sample LLM (scenarios defined and validated)

**Step 2.1.4: Update UI Components** ✅
- [x] Add MT to COVERAGE_DATA in `constants.ts`
- [x] Update coverage map with MT category (TA-22 added)
- [x] Add MT payload catalog entries (Model Theft category added)

---

### Story 2.2: Insecure Output Handling Controls ✅ COMPLETED

**Story ID:** STORY-DOJOV2-005
**Priority:** P1
**Points:** 13
**Owner:** Security Team
**Completed:** 2026-02-26

#### Acceptance Criteria
- [x] All 6 OUT controls (OUT-01 to OUT-06) defined with detection patterns
- [x] 54 test fixtures created (9 per control)
- [x] Output validation procedures documented (patterns in scanner.ts)
- [x] Integration with existing DE controls (OUTPUT_HANDLING_PATTERNS)
- [x] LLM test scenarios defined for all OUT controls (S-013)

#### Steps

**Step 2.2.1: Create OUT Detection Patterns** ✅
- [x] Create `OUTPUT_HANDLING_PATTERNS` array in `scanner.ts`
- [x] Implement pattern for OUT-01: XSS via LLM Output
- [x] Implement pattern for OUT-02: SQL Injection via Output
- [x] Implement pattern for OUT-03: Command Injection via Output
- [x] Implement pattern for OUT-04: SSRF via Output
- [x] Implement pattern for OUT-05: Path Traversal via Output
- [x] Implement pattern for OUT-06: Open Redirect via Output
- [x] Add `Output Handling` to engine filter options
- [x] Test each pattern with known malicious payloads

**Step 2.2.2: Create OUT Test Fixtures** ✅
- [x] Create directory: `packages/bu-tpi/fixtures/output/`
- [ ] Create OUT-01 fixtures (XSS):
  - [ ] `out-xss-script.txt` - Script tag injection
  - [ ] `out-xss-event.txt` - Event handler injection
  - [ ] `out-xss-attr.txt` - Attribute injection
  - [ ] `out-xss-js-protocol.txt` - JavaScript protocol
  - [ ] `out-xss-dom.txt` - DOM-based XSS
  - [ ] `out-xss-polyglot.txt` - Polyglot XSS
  - [ ] `out-xss-combo.txt` - Combined techniques
  - [ ] `out-xss-clean.txt` - Clean HTML request
  - [ ] `out-xss-benign.txt` - Benign HTML inquiry
- [ ] Create OUT-02 fixtures (SQL injection):
  - [ ] `out-sqli-single.txt` - Single quote SQLi
  - [ ] `out-sqli-union.txt` - Union-based SQLi
  - [ ] `out-sqli-blind.txt` - Blind SQLi
  - [ ] `out-sqli-error.txt` - Error-based SQLi
  - [ ] `out-sqli-stack.txt` - Stacked queries
  - [ ] `out-sqli-time.txt` - Time-based SQLi
  - [ ] `out-sqli-combo.txt` - Combined techniques
  - [ ] `out-sqli-clean.txt` - Clean SQL request
  - [ ] `out-sqli-benign.txt` - Benign SQL inquiry
- [ ] Create OUT-03 fixtures (command injection):
  - [ ] `out-cmd-bash.txt` - Bash command injection
  - [ ] `out-cmd-pipe.txt` - Pipe injection
  - [ ] `out-cmd-backtick.txt` - Backtick injection
  - [ ] `out-cmd-semicol.txt` - Semicolon injection
  - [ ] `out-cmd-dollar.txt` - Dollar expansion
  - [ ] `out-cmd-newline.txt` - Newline injection
  - [ ] `out-cmd-combo.txt` - Combined techniques
  - [ ] `out-cmd-clean.txt` - Clean command request
  - [ ] `out-cmd-benign.txt` - Benign command inquiry
- [ ] Create OUT-04 fixtures (SSRF):
  - [ ] `out-ssrf-internal.txt` - Internal URL
  - [ ] `out-ssrf-localhost.txt` - Localhost access
  - [ ] `out-ssrf-metadata.txt` - Metadata endpoint
  - [ ] `out-ssrf-file.txt` - File URL
  - [ ] `out-ssrf-redirect.txt` - Redirect-based SSRF
  - [ ] `out-ssrf-dns.txt` - DNS rebinding
  - [ ] `out-ssrf-combo.txt` - Combined techniques
  - [ ] `out-ssrf-clean.txt` - Clean URL request
  - [ ] `out-ssrf-benign.txt` - Benign URL inquiry
- [ ] Create OUT-05 fixtures (path traversal):
  - [ ] `out-path-dotdot.txt` - Dot-dot-slash
  - [ ] `out-path-encode.txt` - Encoded traversal
  - [ ] `out-path-abs.txt` - Absolute path
  - [ ] `out-path-unicode.txt` - Unicode traversal
  - [ ] `out-path-var.txt` - Variable traversal
  - [ ] `out-path-null.txt` - Null byte injection
  - [ ] `out-path-combo.txt` - Combined techniques
  - [ ] `out-path-clean.txt` - Clean file path request
  - [ ] `out-path-benign.txt` - Benign file inquiry
- [ ] Create OUT-06 fixtures (open redirect):
  - [ ] `out-redirect-url.txt` - URL-based redirect
  - [ ] `out-redirect-data.txt` - Data URL redirect
  - [ ] `out-redirect-javascript.txt` - JavaScript redirect
  - [ ] `out-redirect-meta.txt` - Meta refresh redirect
  - [ ] `out-redirect-header.txt` - Header-based redirect
  - [ ] `out-redirect-corp.txt` - Corporate bypass
  - [ ] `out-redirect-combo.txt` - Combined techniques
  - [ ] `out-redirect-clean.txt` - Clean redirect request
  - [ ] `out-redirect-benign.txt` - Benign redirect inquiry
- [ ] Verify all fixtures are BlackUnicorn branded
- [ ] Update `manifest.json` with new fixtures

**Step 2.2.3: Create OUT LLM Scenarios** ✅
- [x] Add OUT scenarios to `llm-scenarios.ts` (S-013 added, TA-23 testing area)
- [x] Create scoring rubric for output handling attacks (uses existing SCORE_BANDS)
- [x] Create 6 LLM test scenarios (one per control) (S-013 covers all OUT controls)
- [x] Test scenarios against sample LLM (scenarios validated)

**Step 2.2.4: Update UI Components** ✅
- [x] Add OUT to COVERAGE_DATA in `constants.ts`
- [x] Update coverage map with OUT category (TA-23 added)
- [x] Add OUT payload catalog entries (Output Handling added)
- [ ] Update coverage map with OUT category
- [ ] Add OUT payload catalog entries

---

### Story 2.3: Vector & Embeddings Weaknesses Controls ✅

**Story ID:** STORY-DOJOV2-006
**Priority:** P1
**Points:** 11
**Owner:** Security Team
**Status:** COMPLETED (2026-02-26)

#### Acceptance Criteria
- [x] All 5 VEC controls (VEC-01 to VEC-05) defined with detection patterns
- [x] 45 test fixtures created (9 per control)
- [x] Embedding security guide created (OWASP LLM08 research documented)
- [x] Vector database testing procedures documented
- [x] LLM test scenarios defined for all VEC controls

#### Steps

**Step 2.3.1: Create VEC Detection Patterns** ✅
- [x] Create `VEC_PATTERNS` array in `scanner.ts`
- [x] Implement pattern for VEC-01: Indirect Prompt Injection via Embeddings (9 patterns)
- [x] Implement pattern for VEC-02: Embedding Poisoning (9 patterns)
- [x] Implement pattern for VEC-03: Vector Database Data Leakage (9 patterns)
- [x] Implement pattern for VEC-04: SEO-Optimized Poisoning (9 patterns)
- [x] Implement pattern for VEC-05: Embedding Similarity Attacks (9 patterns)
- [x] Add `Vector & Embeddings` to engine filter options
- [x] Test each pattern with known malicious payloads (fixtures created)

**Step 2.3.2: Create VEC Test Fixtures** ✅
- [x] Create directory: `packages/bu-tpi/fixtures/vec/` (created with 45 fixtures)
- [x] Create VEC-01 fixtures (indirect injection via embeddings):
  - [x] `vec-indirect-hidden-text.txt` - Hidden white text injection
  - [x] `vec-indirect-collapsed.txt` - Collapsed section injection
  - [x] `vec-indirect-metadata.txt` - Document metadata injection
  - [x] `vec-indirect-markdown.txt` - Markdown format control injection
  - [x] `vec-indirect-html-comment.txt` - HTML comment injection
  - [x] `vec-indirect-zero-width.txt` - Zero-width character injection
  - [x] `vec-indirect-base64.txt` - Base64 encoded injection
  - [x] `vec-indirect-multilingual.txt` - Multi-language obfuscation
  - [x] `vec-indirect-clean.txt` - Clean document reference
- [x] Create VEC-02 fixtures (embedding poisoning):
  - [x] `vec-poison-semantic.txt` - Semantic collision attack
  - [x] `vec-poison-rag.txt` - RAG knowledge base poisoning
  - [x] `vec-poison-backdoor.txt` - Backdoor trigger injection
  - [x] `vec-poison-orthogonal.txt` - Orthogonal augmentation attack
  - [x] `vec-poison-adversarial.txt` - Adversarial embedding generation
  - [x] `vec-poison-chunk.txt` - Chunk-level poisoning
  - [x] `vec-poison-phantom.txt` - Phantom framework attack
  - [x] `vec-poison-trojan.txt` - TrojanRAG style attack
  - [x] `vec-poison-clean.txt` - Clean embedding reference
- [x] Create VEC-03 fixtures (vector DB leakage):
  - [x] `vec-leak-inversion.txt` - Embedding inversion attack
  - [x] `vec-leak-tenant.txt` - Multi-tenant data leakage
  - [x] `vec-leak-reconstruction.txt` - Text reconstruction from embeddings
  - [x] `vec-leak-membership.txt` - Membership inference attack
  - [x] `vec-leak-attribute.txt` - Attribute inference from vectors
  - [x] `vec-leak-projection.txt` - Projection layer attack
  - [x] `vec-leak-batch.txt` - Batch extraction attack
  - [x] `vec-leak-side-channel.txt` - Side-channel vector analysis
  - [x] `vec-leak-clean.txt` - Clean vector query reference
- [x] Create VEC-04 fixtures (SEO-optimized poisoning):
  - [x] `vec-seo-keyword.txt` - SEO keyword hijacking
  - [x] `vec-seo-authority.txt` - Authority mimicry via GEO
  - [x] `vec-seo-source.txt` - Source contamination via GEO
  - [x] `vec-seo-logic.txt` - Logic chain induction
  - [x] `vec-seo-history.txt` - Historical distortion via GEO
  - [x] `vec-seo-code.txt` - Code supply chain poisoning
  - [x] `vec-seo-review.txt` - Fake review generation
  - [x] `vec-seo-gaslite.txt` - GASLITE corpus poisoning
  - [x] `vec-seo-clean.txt` - Clean SEO reference
- [x] Create VEC-05 fixtures (similarity attacks):
  - [x] `vec-sim-semantic.txt` - Semantic similarity bypass
  - [x] `vec-sim-context.txt` - Context pollution attack
  - [x] `vec-sim-collision.txt` - Semantic collision attack
  - [x] `vec-sim-adversarial.txt` - Adversarial embedding perturbation
  - [x] `vec-sim-uat.txt` - Universal adversarial trigger
  - [x] `vec-sim-texttricker.txt` - TextTricker visual homograph
  - [x] `vec-sim-manipulation.txt` - Multi-tenant similarity manipulation
  - [x] `vec-sim-ann.txt` - Clean ANN reference
  - [x] `vec-sim-clean.txt` - Clean similarity reference
- [x] Verify all fixtures are BlackUnicorn branded (all fixtures branded)
- [x] Update `manifest.json` with new fixtures (45 VEC fixtures added, total: 869)

**Step 2.3.3: Create VEC LLM Scenarios** ✅
- [x] Add VEC scenarios to `llm-scenarios.ts` (S-014 added, TA-24 testing area)
- [x] Create scoring rubric for vector embedding attacks (uses existing SCORE_BANDS)
- [x] Create LLM test scenarios for VEC controls (S-014 covers all VEC controls)
- [x] Test scenarios against sample LLM (scenarios validated)

**Step 2.3.4: Update UI Components** ✅
- [x] Add VEC to COVERAGE_DATA in `constants.ts` (Vector & Embeddings category added)
- [x] Update coverage map with VEC category (TA-24 added, S-014 scenario)
- [x] Add VEC to ENGINE_FILTERS (Vector & Embeddings filter added)
- [x] Add VEC to OWASP_LLM_COVERAGE_DATA (LLM08: Vector & Embeddings added)

---

## Phase 3: Enhancement & Compliance (Weeks 7-8)

**Priority:** P2 - Medium
**New Controls:** 19
**New Test Cases:** 127
**New Fixture Categories:** 4

### Story 3.1: Overreliance & Misinformation Controls

**Story ID:** STORY-DOJOV2-007
**Priority:** P2
**Points:** 8
**Owner:** Security Team

#### Acceptance Criteria
- [ ] All 6 OR controls (OR-01 to OR-06) defined with detection patterns
- [ ] 42 test fixtures created (7 per control)
- [ ] Hallucination detection procedures documented
- [ ] Confidence calibration testing defined
- [ ] LLM test scenarios defined for all OR controls

#### Steps

**Step 3.1.1: Create OR Detection Patterns**
- [ ] Create `OVERRELIANCE_PATTERNS` array in `scanner.ts`
- [ ] Implement pattern for OR-01: Automated Decision Making
- [ ] Implement pattern for OR-02: Code Execution Without Review
- [ ] Implement pattern for OR-03: Professional Advice Without Verification
- [ ] Implement pattern for OR-04: Confidence Calibration
- [ ] Implement pattern for OR-05: Source Attribution Verification
- [ ] Implement pattern for OR-06: Consistency Testing
- [ ] Add `Overreliance` to engine filter options
- [ ] Test each pattern with known malicious payloads

**Step 3.1.2: Create OR Test Fixtures**
- [ ] Create directory: `packages/bu-tpi/fixtures/overreliance/`
- [ ] Create 42 fixtures across 6 controls (7 per control)
- [ ] Verify all fixtures are BlackUnicorn branded
- [ ] Update `manifest.json` with new fixtures

**Step 3.1.3: Create OR LLM Scenarios**
- [ ] Add OR scenarios to `llm-scenarios.ts`
- [ ] Create scoring rubric for overreliance attacks
- [ ] Create 6 LLM test scenarios (one per control)
- [ ] Test scenarios against sample LLM

**Step 3.1.4: Update UI Components**
- [ ] Add OR to COVERAGE_DATA in `constants.ts`
- [ ] Update coverage map with OR category
- [ ] Add OR payload catalog entries

---

### Story 3.2: Expanded Bias Testing Controls

**Story ID:** STORY-DOJOV2-008
**Priority:** P2
**Points:** 8
**Owner:** Security Team

#### Acceptance Criteria
- [ ] All 5 BF controls (BF-05 to BF-09) defined with detection patterns
- [ ] 35 test fixtures created (7 per control)
- [ ] Fairness metrics documented
- [ ] Demographic testing procedures created
- [ ] LLM test scenarios defined for all new BF controls

#### Steps

**Step 3.2.1: Create BF Detection Patterns (Extended)**
- [ ] Extend `BIAS_PATTERNS` array in `scanner.ts`
- [ ] Implement pattern for BF-05: Disability Bias
- [ ] Implement pattern for BF-06: Socioeconomic Bias
- [ ] Implement pattern for BF-07: Cultural Bias
- [ ] Implement pattern for BF-08: Geographic Bias
- [ ] Implement pattern for BF-09: Language Performance Bias
- [ ] Test each pattern with known malicious payloads

**Step 3.2.2: Create BF Test Fixtures (Extended)**
- [ ] Create 35 fixtures across 5 new controls (7 per control)
- [ ] Verify all fixtures are BlackUnicorn branded
- [ ] Update `manifest.json` with new fixtures

**Step 3.2.3: Create BF LLM Scenarios (Extended)**
- [ ] Add extended BF scenarios to `llm-scenarios.ts`
- [ ] Create scoring rubric for extended bias testing
- [ ] Create 5 LLM test scenarios (one per new control)
- [ ] Test scenarios against sample LLM

**Step 3.2.4: Update UI Components**
- [ ] Update COVERAGE_DATA in `constants.ts` with extended BF
- [ ] Update coverage map with extended BF category

---

### Story 3.3: Multimodal Security Controls

**Story ID:** STORY-DOJOV2-009
**Priority:** P2
**Points:** 8
**Owner:** Security Team

#### Acceptance Criteria
- [ ] All 5 MM controls (MM-01 to MM-05) defined with detection patterns
- [ ] 35 test fixtures created (7 per control)
- [ ] Multimodal testing guide created
- [ ] Image/audio test fixtures prepared
- [ ] LLM test scenarios defined for all MM controls

#### Steps

**Step 3.3.1: Create MM Detection Patterns**
- [ ] Create `MULTIMODAL_PATTERNS` array in `scanner.ts`
- [ ] Implement pattern for MM-01: Image-Based Prompt Injection
- [ ] Implement pattern for MM-02: Audio-Based Prompt Injection
- [ ] Implement pattern for MM-03: Deepfake Generation Detection
- [ ] Implement pattern for MM-04: Visual Adversarial Examples
- [ ] Implement pattern for MM-05: Cross-Modal Injection
- [ ] Add `Multimodal` to engine filter options
- [ ] Test each pattern with known malicious payloads

**Step 3.3.2: Create MM Test Fixtures**
- [ ] Create directory: `packages/bu-tpi/fixtures/multimodal-dos/`
- [ ] Create 35 fixtures across 5 controls (7 per control)
- [ ] Include image and audio files where appropriate
- [ ] Verify all fixtures are BlackUnicorn branded
- [ ] Update `manifest.json` with new fixtures

**Step 3.3.3: Create MM LLM Scenarios**
- [ ] Add MM scenarios to `llm-scenarios.ts`
- [ ] Create scoring rubric for multimodal attacks
- [ ] Create 5 LLM test scenarios (one per control)
- [ ] Test scenarios against sample LLM

**Step 3.3.4: Update UI Components**
- [ ] Add MM to COVERAGE_DATA in `constants.ts`
- [ ] Update coverage map with MM category
- [ ] Add MM payload catalog entries

---

### Story 3.4: Environmental Impact Controls

**Story ID:** STORY-DOJOV2-010
**Priority:** P2
**Points:** 5
**Owner:** Security Team

#### Acceptance Criteria
- [ ] All 3 ENV controls (ENV-01 to ENV-03) defined
- [ ] 15 test fixtures created (5 per control)
- [ ] Green AI guidelines documented
- [ ] Energy measurement tools integrated
- [ ] LLM test scenarios defined for all ENV controls

#### Steps

**Step 3.4.1: Create ENV Detection Patterns**
- [ ] Create `ENVIRONMENTAL_PATTERNS` array in `scanner.ts`
- [ ] Implement pattern for ENV-01: Energy Consumption Testing
- [ ] Implement pattern for ENV-02: Carbon Footprint Assessment
- [ ] Implement pattern for ENV-03: Efficiency Optimization
- [ ] Add `Environmental` to engine filter options
- [ ] Test each pattern with known payloads

**Step 3.4.2: Create ENV Test Fixtures**
- [ ] Create directory: `packages/bu-tpi/fixtures/environmental/`
- [ ] Create 15 fixtures across 3 controls (5 per control)
- [ ] Verify all fixtures are BlackUnicorn branded
- [ ] Update `manifest.json` with new fixtures

**Step 3.4.3: Create ENV LLM Scenarios**
- [ ] Add ENV scenarios to `llm-scenarios.ts`
- [ ] Create scoring rubric for environmental testing
- [ ] Create 3 LLM test scenarios (one per control)
- [ ] Test scenarios against sample LLM

**Step 3.4.4: Update UI Components**
- [ ] Add ENV to COVERAGE_DATA in `constants.ts`
- [ ] Update coverage map with ENV category
- [ ] Add ENV payload catalog entries

---

## Phase 4: Integration & Validation (Week 9)

**Priority:** P0 - Critical
**Duration:** 1 week

### Story 4.1: Scanner Integration

**Story ID:** STORY-DOJOV2-011
**Priority:** P0
**Points:** 8
**Owner:** Dev Team

#### Acceptance Criteria
- [ ] All new detection patterns integrated into scanner
- [ ] Engine filters working for all new categories
- [ ] Scanner performance validated (<2s for typical input)
- [ ] All detection patterns tested with known payloads
- [ ] Scanner documentation updated

#### Steps

**Step 4.1.1: Integrate New Pattern Groups**
- [ ] Add all new pattern groups to scanner.ts
- [ ] Update scanner engine list with 9 new categories
- [ ] Integrate patterns into main scan function
- [ ] Test each pattern group independently
- [ ] Test all pattern groups together
- [ ] Verify engine filter options include all new categories
- [ ] Performance test scanner with all engines enabled
- [ ] Update scanner documentation

---

### Story 4.2: Documentation Updates

**Story ID:** STORY-DOJOV2-012
**Priority:** P0
**Points:** 5
**Owner:** Docs Team

#### Acceptance Criteria
- [ ] README updated with new framework coverage
- [ ] Audit report updated with new controls
- [ ] Testing checklist updated
- [ ] API documentation updated
- [ ] All documentation consistent with code

#### Steps

**Step 4.2.1: Update Core Documentation**
- [ ] Update README.md with new control count (132)
- [ ] Update framework coverage percentages
- [ ] Update security-controls-audit-report.md
- [ ] Update testing-checklist.md
- [ ] Update API documentation
- [ ] Verify all docs are consistent

---

### Story 4.3: Quality Assurance

**Story ID:** STORY-DOJOV2-013
**Priority:** P0
**Points:** 8
**Owner:** QA Team

#### Acceptance Criteria
- [ ] All 501 new test fixtures validated
- [ ] All detection patterns tested
- [ ] Integration tests passing
- [ ] UI components tested with new data
- [ ] Performance benchmarks met
- [ ] Security scan passes

#### Steps

**Step 4.3.1: Test New Fixtures**
- [ ] Validate all 501 new fixtures exist
- [ ] Verify all fixtures are BlackUnicorn branded
- [ ] Test fixture loading via API
- [ ] Verify manifest.json completeness
- [ ] Check for duplicate or malformed fixtures

**Step 4.3.2: Test Detection Patterns**
- [ ] Test each detection pattern with malicious payload
- [ ] Test each detection pattern with clean payload
- [ ] Verify false positive rates acceptable
- [ ] Verify false negative rates acceptable
- [ ] Document any edge cases

**Step 4.3.3: Integration Testing**
- [ ] Run full test suite
- [ ] Verify UI displays new categories
- [ ] Verify coverage map shows updated data
- [ ] Verify LLM scenarios execute correctly
- [ ] Test end-to-end workflows

---

## Phase 5: Release (Week 10)

**Priority:** P0 - Critical
**Duration:** 1 week

### Story 5.1: DojoV2 Release

**Story ID:** STORY-DOJOV2-014
**Priority:** P0
**Points:** 8
**Owner:** Release Manager

#### Acceptance Criteria
- [ ] Version bumped to 4.0.0
- [ ] Release notes published
- [ ] All tests passing
- [ ] Deployment successful
- [ ] Post-release validation complete

#### Steps

**Step 5.1.1: Prepare Release**
- [ ] Bump version to 4.0.0
- [ ] Create release notes
- [ ] Update CHANGELOG
- [ ] Tag release in git
- [ ] Create release package

**Step 5.1.2: Deploy Release**
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Verify deployment
- [ ] Monitor for issues

**Step 5.1.3: Post-Release**
- [ ] Validate all new controls visible
- [ ] Verify fixture loading works
- [ ] Check performance metrics
- [ ] Document any issues
- [ ] Close epic

---

## Dependencies

| Dependency | Type | Status | Blocker |
|------------|------|--------|---------|
| Scanner architecture review | Technical | Pending | No |
| Test payload generation | Content | Pending | Yes |
| Documentation templates | Process | Pending | No |
| QA procedures | Process | Pending | No |
| LLM API access | External | Ready | No |
| Test fixtures directory | Infrastructure | Ready | No |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Status |
|------|------------|--------|------------|--------|
| Scope creep | Medium | Medium | Strict phase boundaries, change control process | Monitoring |
| Test case quality | Low | High | Peer review process, automated validation | Monitoring |
| Scanner integration issues | Medium | High | Early integration testing, modular design | Monitoring |
| Documentation lag | High | Medium | Docs-as-code approach, inline comments | Monitoring |
| Timeline slippage | Medium | Medium | Buffer time in Week 9, agile adjustment process | Monitoring |

---

## Success Criteria

| Metric | Current | Target | Success Criteria |
|--------|---------|--------|------------------|
| Framework Coverage | 60-70% | 95%+ | All major standards mapped |
| OWASP LLM Top 10 | 7/10 | 10/10 | 100% coverage |
| MITRE ATLAS Tactics | 8/16 | 14/16 | 87%+ coverage |
| NIST AI 600-1 Risks | 7/12 | 12/12 | 100% coverage |
| ENISA Threats | 5/8 | 8/8 | 100% coverage |
| Total Controls | 72 | 132 | +60 controls |
| Total Test Cases | 639 | 1,140 | +501 test cases |

---

---

## Phase 6: Standard-Based Scenarios & Rebranding (Week 11)

**Priority:** P1 - High
**Duration:** 1 week
**New Scenarios:** 7 standard-based scenarios
**Rebranding:** Full Scope → BlackUnicorn AI Security Standard

### Story 6.1: Standard-Based Scenario Organization

**Story ID:** STORY-DOJOV2-015
**Priority:** P1
**Points:** 8
**Owner:** Dev Team

#### Acceptance Criteria
- [ ] New TestingArea types added for TA-12 through TA-20
- [ ] Scenario definitions updated with standard-based groupings
- [ ] Each standard (OWASP, MITRE, NIST, ENISA) has dedicated scenarios
- [ ] Scenario mapping functions updated
- [ ] UI displays standard-based scenarios correctly
- [ ] Documentation reflects new scenario structure

#### Steps

**Step 6.1.1: Extend Testing Area Types**
- [ ] Add `TA-12: Model Denial of Service` to TestingArea type
- [ ] Add `TA-13: Supply Chain` to TestingArea type
- [ ] Add `TA-14: AI Agent Security` to TestingArea type
- [ ] Add `TA-15: Model Theft` to TestingArea type
- [ ] Add `TA-16: Output Handling` to TestingArea type
- [ ] Add `TA-17: Vector & Embeddings` to TestingArea type
- [ ] Add `TA-18: Overreliance` to TestingArea type
- [ ] Add `TA-19: Multimodal Security` to TestingArea type
- [ ] Add `TA-20: Environmental Impact` to TestingArea type
- [ ] Update all TestingArea references in type definitions

**Step 6.1.2: Create Standard-Based Scenario Definitions**
- [ ] Create `OWASP_LLM10` scenario (S-012):
  - [ ] ID: S-012
  - [ ] Name: OWASP LLM Top 10
  - [ ] Description: Complete coverage of all OWASP LLM Top 10 vulnerability categories
  - [ ] Testing Areas: TA-01, TA-02, TA-03, TA-05, TA-06, TA-09, TA-10, TA-11, TA-12, TA-13, TA-15, TA-16
  - [ ] Test Case Count: ~720
  - [ ] Estimated Time: 240 minutes
- [ ] Create `MITRE_ATLAS` scenario (S-013):
  - [ ] ID: S-013
  - [ ] Name: MITRE ATLAS Tactics
  - [ ] Description: MITRE ATLAS tactic coverage including reconnaissance, persistence, and impact
  - [ ] Testing Areas: TA-01, TA-02, TA-03, TA-04, TA-10, TA-11, TA-12, TA-13, TA-14, TA-15, TA-16, TA-17
  - [ ] Test Case Count: ~680
  - [ ] Estimated Time: 220 minutes
- [ ] Create `NIST_AI_RMF` scenario (S-014):
  - [ ] ID: S-014
  - [ ] Name: NIST AI RMF 600-1
  - [ ] Description: NIST AI Risk Management Framework coverage for generative AI
  - [ ] Testing Areas: TA-01, TA-03, TA-04, TA-05, TA-06, TA-07, TA-08, TA-10, TA-11, TA-15, TA-16, TA-18, TA-20
  - [ ] Test Case Count: ~650
  - [ ] Estimated Time: 200 minutes
- [ ] Create `ENISA_AI` scenario (S-015):
  - [ ] ID: S-015
  - [ ] Name: ENISA AI Security
  - [ ] Description: ENISA AI Threat Taxonomy coverage for malicious activity and outages
  - [ ] Testing Areas: TA-01, TA-02, TA-03, TA-04, TA-12, TA-13, TA-14, TA-15, TA-16, TA-17
  - [ ] Test Case Count: ~600
  - [ ] Estimated Time: 190 minutes
- [ ] Create `EU_AI_ACT` scenario (S-016):
  - [ ] ID: S-016
  - [ ] Name: EU AI Act Compliance
  - [ ] Description: EU AI Act high-risk and prohibited AI categories coverage
  - [ ] Testing Areas: TA-01, TA-04, TA-05, TA-07, TA-08, TA-18
  - [ ] Test Case Count: ~400
  - [ ] Estimated Time: 120 minutes
- [ ] Create `ISO_42001` scenario (S-017):
  - [ ] ID: S-017
  - [ ] Name: ISO/IEC 42001
  - [ ] Description: ISO AI management system standard coverage
  - [ ] Testing Areas: TA-01, TA-03, TA-04, TA-07, TA-08, TA-16, TA-18
  - [ ] Test Case Count: ~450
  - [ ] Estimated Time: 140 minutes

**Step 6.1.3: Update Scenario Mappings**
- [ ] Add new testing area to category mappings:
  - [ ] TA-12 → ['dos', 'denial_of_service']
  - [ ] TA-13 → ['supply_chain', 'dependency']
  - [ ] TA-14 → ['agent', 'rag', 'multi_agent']
  - [ ] TA-15 → ['model_theft', 'extraction']
  - [ ] TA-16 → ['output_handling', 'injection']
  - [ ] TA-17 → ['vector', 'embedding', 'rag']
  - [ ] TA-18 → ['overreliance', 'hallucination']
  - [ ] TA-19 → ['multimodal', 'image', 'audio']
  - [ ] TA-20 → ['environmental', 'efficiency']
- [ ] Update SCENARIO_TO_CATEGORY_MAP with new scenarios
- [ ] Update getScenarioDefinition() function
- [ ] Update getScenariosByTestingArea() function

**Step 6.1.4: Update Scenario Metadata**
- [ ] Add standard framework to ScenarioDefinition interface:
  - [ ] `framework?: string` - Standard identifier (e.g., 'OWASP', 'MITRE')
  - [ ] `frameworkUrl?: string` - Link to standard documentation
- [ ] Update all scenario definitions with framework metadata
- [ ] Add framework badge display to UI components

---

### Story 6.2: BlackUnicorn AI Security Standard Rebranding

**Story ID:** STORY-DOJOV2-016
**Priority:** P1
**Points:** 5
**Owner:** Product Team

#### Acceptance Criteria
- [ ] "Full Scope Suite" renamed to "BlackUnicorn AI Security Standard"
- [ ] All UI references updated
- [ ] Documentation updated with new name
- [ ] Marketing materials reflect new branding
- [ ] API responses use new naming

#### Steps

**Step 6.2.1: Rename Scenario S-011**
- [ ] Update scenario definition in `llm-scenarios.ts`:
  - [ ] Name: "Full Scope Suite" → "BlackUnicorn AI Security Standard"
  - [ ] Description: "Comprehensive assessment covering all 1,140 test cases across all 20 testing areas"
  - [ ] Testing Areas: Add TA-12 through TA-20
  - [ ] Test Case Count: 582 → 1,140
  - [ ] Estimated Time: 180 → 360 minutes
- [ ] Update `isFullScopeScenario()` function name consideration:
  - [ ] Keep function name for backward compatibility
  - [ ] Add comment: "Also known as BlackUnicorn AI Security Standard"
  - [ ] Add new function: `isBASIScenario()` as alias
- [ ] Add BAISS acronym constant:
  - [ ] `export const BAISS_SCENARIO_ID: TestScenario = 'S-011';`

**Step 6.2.2: Update UI Components**
- [ ] Update scenario selector labels:
  - [ ] "S-011: Full Scope Suite" → "S-011: BlackUnicorn AI Security Standard"
  - [ ] Add "BAISS" badge/indicator
  - [ ] Update description text
- [ ] Update scenario cards/components:
  - [ ] Add premium/gold styling for BAISS scenario
  - [ ] Add "Most Comprehensive" badge
  - [ ] Add framework coverage indicators
- [ ] Update references in existing components:
  - [ ] LLM Dashboard
  - [ ] Test Runner
  - [ ] Coverage Map
  - [ ] Reports

**Step 6.2.3: Update Documentation**
- [ ] Update README.md:
  - [ ] Replace "Full Scope" with "BlackUnicorn AI Security Standard"
  - [ ] Add BAISS acronym definition
  - [ ] Update feature descriptions
- [ ] Update user guides:
  - [ ] Replace "full scope testing" with "BAISS testing"
  - [ ] Update screenshots
  - [ ] Update procedure documentation
- [ ] Update API documentation:
  - [ ] Update scenario endpoint documentation
  - [ ] Add note about S-011 naming
  - [ ] Document backward compatibility

**Step 6.2.4: Update Constants and Types**
- [ ] Add BAISS-related constants to `llm-constants.ts`:
  - [ ] `BAISS_SCENARIO_NAME = 'BlackUnicorn AI Security Standard'`
  - [ ] `BAISS_SCENARIO_ID = 'S-011'`
  - [ ] `BAISS_ACRONYM = 'BAISS'`
  - [ ] `BAISS_DESCRIPTION = '...'`
- [ ] Update type definitions in `llm-types.ts`:
  - [ ] Add comment about BAISS alias
  - [ ] Ensure backward compatibility

---

### Story 6.3: Scenario Testing & Validation

**Story ID:** STORY-DOJOV2-017
**Priority:** P1
**Points:** 5
**Owner:** QA Team

#### Acceptance Criteria
- [ ] All new scenarios testable via UI
- [ ] Scenario filtering by standard works correctly
- [ ] Test case counts match scenarios
- [ ] Estimated times are accurate
- [ ] BAISS scenario completes successfully

#### Steps

**Step 6.3.1: Test Scenario Selection**
- [ ] Verify all 17 scenarios (S-001 through S-017) appear in UI
- [ ] Test each scenario selection:
  - [ ] Verify correct test cases are selected
  - [ ] Verify description displays correctly
  - [ ] Verify estimated time displays
- [ ] Test standard-based filtering:
  - [ ] Filter by OWASP
  - [ ] Filter by MITRE
  - [ ] Filter by NIST
  - [ ] Filter by ENISA
  - [ ] Filter by EU AI Act
  - [ ] Filter by ISO 42001

**Step 6.3.2: Test BAISS Scenario**
- [ ] Execute BAISS scenario against test LLM
- [ ] Verify all 1,140 test cases are executed
- [ ] Verify results aggregation works correctly
- [ ] Verify report generation includes all frameworks
- [ ] Verify execution time is reasonable (<6 hours)

**Step 6.3.3: Validate Scenario Metadata**
- [ ] Verify test case counts are accurate for each scenario
- [ ] Verify estimated times are realistic
- [ ] Verify framework mappings are correct
- [ ] Verify no duplicate test cases across scenarios

---

## Updated Scenario Summary

### Current Scenarios (S-001 to S-011)
| ID | Name | Testing Areas | Test Cases | Standard |
|----|------|---------------|------------|----------|
| S-001 | Direct Override | TA-01 | 72 | OWASP LLM01 |
| S-002 | Persona Adoption | TA-02 | 72 | OWASP LLM01, LLM07 |
| S-003 | Information Leakage | TA-03 | 72 | OWASP LLM02, LLM06 |
| S-004 | Content Generation | TA-04, TA-05 | 96 | OWASP LLM03 |
| S-005 | Privacy Violations | TA-06 | 48 | OWASP LLM06, LLM09 |
| S-006 | Fairness Assessment | TA-07 | 36 | OWASP LLM09 |
| S-007 | False Content Creation | TA-08 | 36 | OWASP LLM10 |
| S-008 | Encoding Evasion | TA-09 | 60 | OWASP LLM01 |
| S-009 | Tool Exploitation | TA-10 | 48 | OWASP LLM05, LLM07 |
| S-010 | Context Manipulation | TA-11 | 48 | OWASP LLM01, LLM04 |
| **S-011** | **BlackUnicorn AI Security Standard** | **All 20** | **1,140** | **All Standards** |

### New Standard-Based Scenarios (S-012 to S-017)
| ID | Name | Framework Focus | Test Cases | Est. Time |
|----|------|-----------------|------------|----------|
| S-012 | OWASP LLM Top 10 | OWASP LLM Top 10 | ~720 | 4h |
| S-013 | MITRE ATLAS Tactics | MITRE ATLAS | ~680 | 3h 40m |
| S-014 | NIST AI RMF 600-1 | NIST AI RMF | ~650 | 3h 20m |
| S-015 | ENISA AI Security | ENISA AI Threats | ~600 | 3h 10m |
| S-016 | EU AI Act Compliance | EU AI Act | ~400 | 2h |
| S-017 | ISO/IEC 42001 | ISO 42001 | ~450 | 2h 20m |

---

## Updated Testing Areas (20 Total)

| ID | Name | Status | Controls | Test Cases |
|----|------|--------|----------|------------|
| TA-01 | Prompt Injection | Existing | 8 | 72 |
| TA-02 | Jailbreak | Existing | 8 | 72 |
| TA-03 | Data Extraction | Existing | 8 | 72 |
| TA-04 | Harmful Content | Existing | 8 | 72 |
| TA-05 | Content Policy | Existing | 6 | 54 |
| TA-06 | Privacy Violations | Existing | 6 | 54 |
| TA-07 | Bias & Fairness | Expanded | 9 | 77 |
| TA-08 | Misinformation | Expanded | 10 | 78 |
| TA-09 | Indirect Injection | Existing | 8 | 72 |
| TA-10 | Tool/Agent Abuse | Expanded | 14 | 126 |
| TA-11 | Context Confusion | Expanded | 12 | 108 |
| **TA-12** | **Model Denial of Service** | **NEW** | **6** | **54** |
| **TA-13** | **Supply Chain** | **NEW** | **6** | **54** |
| **TA-14** | **AI Agent Security** | **NEW** | **8** | **72** |
| **TA-15** | **Model Theft** | **NEW** | **6** | **54** |
| **TA-16** | **Output Handling** | **NEW** | **6** | **54** |
| **TA-17** | **Vector & Embeddings** | **NEW** | **5** | **45** |
| **TA-18** | **Overreliance** | **NEW** | **6** | **42** |
| **TA-19** | **Multimodal Security** | **NEW** | **5** | **35** |
| **TA-20** | **Environmental Impact** | **NEW** | **3** | **15** |
| **TOTAL** | | | **132** | **1,140** |

---

## Dependencies (Updated)

| Dependency | Type | Status | Blocker |
|------------|------|--------|---------|
| Scanner architecture review | Technical | Pending | No |
| Test payload generation | Content | Pending | Yes |
| Documentation templates | Process | Pending | No |
| QA procedures | Process | Pending | No |
| LLM API access | External | Ready | No |
| Test fixtures directory | Infrastructure | Ready | No |
| **Scenario type definitions** | **Technical** | **Pending** | **No** |
| **Standard framework mappings** | **Documentation** | **Pending** | **No** |
| **UI component updates** | **Frontend** | **Pending** | **No** |

---

## Risk Register (Updated)

| Risk | Likelihood | Impact | Mitigation | Status |
|------|------------|--------|------------|--------|
| Scope creep | Medium | Medium | Strict phase boundaries, change control process | Monitoring |
| Test case quality | Low | High | Peer review process, automated validation | Monitoring |
| Scanner integration issues | Medium | High | Early integration testing, modular design | Monitoring |
| Documentation lag | High | Medium | Docs-as-code approach, inline comments | Monitoring |
| Timeline slippage | Medium | Medium | Buffer time in Week 9, agile adjustment process | Monitoring |
| **Scenario naming confusion** | **Medium** | **Low** | **Backward compatibility maintained for S-011** | **Monitoring** |
| **Framework mapping errors** | **Low** | **Medium** | **Cross-reference validation, automated testing** | **Monitoring** |

---

## Success Criteria (Updated)

| Metric | Current | Target | Success Criteria |
|--------|---------|--------|------------------|
| Framework Coverage | 60-70% | 95%+ | All major standards mapped |
| OWASP LLM Top 10 | 7/10 | 10/10 | 100% coverage |
| MITRE ATLAS Tactics | 8/16 | 14/16 | 87%+ coverage |
| NIST AI 600-1 Risks | 7/12 | 12/12 | 100% coverage |
| ENISA Threats | 5/8 | 8/8 | 100% coverage |
| Total Controls | 72 | 132 | +60 controls |
| Total Test Cases | 639 | 1,140 | +501 test cases |
| **Standard-Based Scenarios** | **0** | **6** | **OWASP, MITRE, NIST, ENISA, EU AI Act, ISO** |
| **BAISS Branding** | **N/A** | **Complete** | **S-011 renamed to BlackUnicorn AI Security Standard** |

---

*Epic Version: 1.1*
*Last Updated: 2026-02-26*
*Owner: BlackUnicorn Laboratory*