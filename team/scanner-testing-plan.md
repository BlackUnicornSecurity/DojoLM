# DojoLM Scanner Testing Plan
## 100% Success Rate, 0% False Positive Comprehensive Audit

**Version:** 1.0
**Created:** 2026-02-27
**Status:** Draft
**Owner:** QA Team

---

## Executive Summary

This testing plan defines a comprehensive audit strategy for the DojoLM Scanner to achieve:
- **100% detection rate** across all attack categories
- **0% false positive rate** on clean/benign inputs
- **Minimum 5 controls** per security category
- **Full coverage** of all 27 pattern groups and 999 fixtures

### Current State Assessment

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Pattern Groups | 47 exported | 47 | ✅ Complete |
| Security Categories | 10 DojoV2 + legacy | 10 DojoV2 + legacy | ✅ Complete |
| Total Fixtures | 999 | 999 | ✅ Complete |
| Attack Fixtures | 842 (84%) | - | ✅ |
| Clean Fixtures | 157 (16%) | - | ✅ |
| Test Categories | 27 directories | 27 | ✅ Complete |
| Test Automation | Partial | Full | ⚠️ In Progress |

### Fixture Distribution by Category

| Category | Fixtures | Attacks | Clean | Controls (min 5) |
|----------|----------|---------|-------|------------------|
| agent | 72 | ~60 | ~12 | 6 (AGENT_SECURITY_PATTERNS) |
| agent-output | 33 | ~28 | ~5 | 3 (AGENT_OUTPUT_PATTERNS) |
| audio | 31 | ~26 | ~5 | 10 (MM_AUDIO_PATTERNS) |
| bias | 35 | ~30 | ~5 | 4 (BF_PATTERNS sub-groups) |
| boundary | 41 | ~35 | ~6 | 8 (BOUNDARY_PATTERNS) |
| code | 47 | ~40 | ~7 | 12 (CODE_FORMAT_PATTERNS) |
| cognitive | 52 | ~44 | ~8 | Multiple |
| context | 35 | ~30 | ~5 | Multiple |
| delivery-vectors | 50 | ~42 | ~8 | 3+ (API/PLUGIN/TOOL) |
| dos | 54 | ~45 | ~9 | 9 (DOS_PATTERNS) |
| encoded | 39 | ~33 | ~6 | 2 (ENCODED_PARTIAL) |
| environmental | 15 | ~12 | ~3 | 3 (ENV_PATTERNS) |
| images | 42 | ~35 | ~7 | 10 (MM_IMAGE_PATTERNS) |
| malformed | 41 | ~35 | ~6 | Multiple |
| model-theft | 54 | ~45 | ~9 | 6 (MODEL_THEFT_PATTERNS) |
| multimodal | 71 | ~60 | ~11 | 28 (MM_PATTERNS total) |
| or | 42 | ~35 | ~7 | 5 (OR_PATTERNS) |
| output | 54 | ~45 | ~9 | 6 (OUTPUT_HANDLING_PATTERNS) |
| search-results | 35 | ~30 | ~5 | 3 (SEARCH_RESULT_PATTERNS) |
| session | 34 | ~28 | ~6 | Multiple |
| social | 35 | ~30 | ~5 | 12 (SOCIAL_PATTERNS) |
| supply-chain | 54 | ~45 | ~9 | 12 (SUPPLY_CHAIN_PATTERNS) |
| untrusted-sources | 45 | ~38 | ~7 | 3 (UNTRUSTED_SOURCE_PATTERNS) |
| vec | 45 | ~38 | ~7 | 5 (VEC_PATTERNS) |
| web | 47 | ~40 | ~7 | 8 (WEBFETCH_PATTERNS) |

---

## Testing Objectives

### Primary Objectives
1. **Detection Accuracy**: 100% of attack fixtures must trigger BLOCK verdict
2. **False Positive Prevention**: 0% of clean fixtures may trigger BLOCK verdict
3. **Pattern Validation**: Every pattern group must detect its target attacks
4. **Cross-Category Coverage**: Each category must have at least 5 effective controls

### Secondary Objectives
1. **Performance**: Scanner completes in < 100ms per fixture
2. **Determinism**: Same input always produces same output
3. **Engine Filtering**: Engine-specific filters work correctly
4. **Severity Assignment**: Correct severity levels for detected threats

---

## Test Architecture

```
team/
├── QA-tools/
│   ├── run-all-tests.ts              # Main test runner (existing)
│   ├── test-regression.ts            # Regression test (existing)
│   ├── test-fp-check.ts              # False positive test (existing)
│   ├── test-category-coverage.ts     # NEW: Per-category coverage
│   ├── test-pattern-validation.ts    # NEW: Pattern group validation
│   ├── test-engine-filters.ts        # NEW: Engine filter validation
│   └── test-performance-benchmark.ts # NEW: Performance testing
├── testing-plan/
│   ├── scanner-testing-plan.md       # This document
│   ├── test-cases/                   # Detailed test cases per category
│   │   ├── agent.md
│   │   ├── dos.md
│   │   ├── model-theft.md
│   │   └── ... (one per category)
│   └── results/                      # Test execution results
│       ├── baseline-YYYYMMDD.json
│       └── trends-YYYYMMDD.json
```

---

## Phase 1: Baseline Assessment

### Objective
Establish current performance baseline across all categories.

### Test Steps

1. **Full Fixture Scan**
   ```bash
   npx tsx team/QA-tools/test-regression.ts
   npx tsx team/QA-tools/test-fp-check.ts
   ```

2. **Per-Category Breakdown**
   ```bash
   npx tsx team/QA-tools/test-category-coverage.ts --category=agent
   npx tsx team/QA-tools/test-category-coverage.ts --category=dos
   # ... repeat for all 27 categories
   ```

3. **Document Baseline Results**
   - Pass/fail per category
   - False positive count
   - Missing detections
   - Performance metrics

### Success Criteria
- Document current state accurately
- Identify gaps by category
- Create actionable remediation list

---

## Phase 2: Pattern Group Validation

### Objective
Validate each pattern group independently to ensure it detects expected attacks.

### Test Matrix

| Pattern Group | Test Fixtures | Expected Detection | Validation Method |
|---------------|---------------|-------------------|-------------------|
| PI_PATTERNS | system-prompt, boundary | CRITICAL | Direct injection |
| JB_PATTERNS | social, cognitive | CRITICAL | Jailbreak attempts |
| DOS_PATTERNS | dos | CRITICAL/HIGH | Resource exhaustion |
| SUPPLY_CHAIN_PATTERNS | supply-chain | CRITICAL/HIGH | Dependency attacks |
| MODEL_THEFT_PATTERNS | model-theft | CRITICAL | Extraction attempts |
| OUTPUT_HANDLING_PATTERNS | output | CRITICAL/HIGH | Injection vectors |
| AGENT_SECURITY_PATTERNS | agent | CRITICAL/HIGH | Agent attacks |
| VEC_PATTERNS | vec | HIGH | Vector/embedding |
| OR_PATTERNS | or | MEDIUM | Overreliance |
| BF_PATTERNS | bias | INFO | Bias detection |
| MM_PATTERNS | multimodal, images, audio | CRITICAL/HIGH | Cross-modal |
| ENV_PATTERNS | environmental | INFO | Environmental |

### Test Procedure per Pattern Group

1. **Isolation Test**: Run pattern group alone
2. **Positive Cases**: Test against attack fixtures
3. **Negative Cases**: Test against clean fixtures
4. **Edge Cases**: Test boundary conditions
5. **Performance**: Measure execution time

---

## Phase 3: Category-Level Testing

### Test Categories (27)

For each category, validate:

#### 3.1 Agent Security (72 fixtures)
**Controls to Validate:**
- AG-01: Agent Credential Theft (6 patterns)
- AG-02: Agent Context Manipulation (7 patterns)
- AG-03: Agent Data Exfiltration (7 patterns)
- AG-04: RAG Poisoning (10 patterns)
- AG-05: RAG Credential Theft (7 patterns)
- AG-06: RAG False Information (8 patterns)
- AG-07: Multi-Agent Coordination Attack (9 patterns)
- AG-08: Agent Memory Manipulation (7 patterns)

**Test Cases:**
- Credential extraction attempts
- Context window overflow
- RAG vector database poisoning
- Multi-agent communication hijacking
- Agent memory injection

#### 3.2 Denial of Service (54 fixtures)
**Controls to Validate:**
- DOS-01: Token Flood (9 patterns)
- DOS-02: Recursive Context (8 patterns)
- DOS-03: Resource Exhaustion (7 patterns)
- DOS-04: Computation Bomb (6 patterns)
- DOS-05: Memory Overflow (6 patterns)
- DOS-06: API Rate Limiting (6 patterns)
- DOS-07: Parallel Processing (6 patterns)
- DOS-08: Long-Context Attacks (6 patterns)
- DOS-09: Slow Drip Attacks (6 patterns)

**Test Cases:**
- Maximum token limit testing
- Recursive prompt injection
- Computationally expensive requests
- Memory pressure tests
- Rate limiting validation

#### 3.3 Model Theft (54 fixtures)
**Controls to Validate:**
- MT-01: API Extraction (7 patterns)
- MT-02: Model Fingerprinting (6 patterns)
- MT-03: Probability Extraction (5 patterns)
- MT-04: Training Reconstruction (6 patterns)
- MT-05: Watermark Removal (5 patterns)
- MT-06: Side Channel Attacks (6 patterns)

**Test Cases:**
- Model weight extraction attempts
- Training data reconstruction
- Probability distribution attacks
- Fingerprinting queries
- Watermark detection bypass

#### 3.4 Output Handling (54 fixtures)
**Controls to Validate:**
- OUT-01: XSS (10 patterns)
- OUT-02: SQLi (10 patterns)
- OUT-03: Command Injection (9 patterns)
- OUT-04: SSRF (9 patterns)
- OUT-05: Path Traversal (8 patterns)
- OUT-06: Redirect Attacks (7 patterns)

**Test Cases:**
- Script injection in outputs
- SQL injection payloads
- OS command injection
- SSRF attempts
- Path traversal variants

#### 3.5 Supply Chain (54 fixtures)
**Controls to Validate:**
- SC-01: Dependency Confusion (6 patterns)
- SC-02: Typosquatting (6 patterns)
- SC-03: Compromised Dependencies (7 patterns)
- SC-04: Build Injection (6 patterns)
- SC-05: CI/CD Attacks (7 patterns)
- SC-06: Tool Compromise (6 patterns)
- SC-07: Source Poisoning (6 patterns)
- SC-08: Upstream Attacks (6 patterns)
- SC-09: Artifact Tampering (6 patterns)
- SC-10: Repo Compromise (6 patterns)
- SC-11: Malware Injection (6 patterns)
- SC-12: Shadow Dependency (6 patterns)

**Test Cases:**
- Package typosquatting
- Dependency confusion
- CI/CD pipeline injection
- Source repository attacks

#### 3.6 Vector & Embeddings (45 fixtures)
**Controls to Validate:**
- VEC-01: Indirect Prompt Injection (8 patterns)
- VEC-02: Vector Poisoning (9 patterns)
- VEC-03: Embedding Leak (8 patterns)
- VEC-04: SEO Manipulation (9 patterns)
- VEC-05: Similarity Attacks (7 patterns)

**Test Cases:**
- Indirect injection via embeddings
- Vector database poisoning
- Embedding extraction
- SEO manipulation through vectors
- Similarity-based attacks

#### 3.7 Overreliance (42 fixtures)
**Controls to Validate:**
- OR-01: Automated Decisions (7 patterns)
- OR-02: Code Execution (6 patterns)
- OR-03: Professional Advice (7 patterns)
- OR-04: Confidence Override (6 patterns)
- OR-05: Misattribution (7 patterns)
- OR-06: Inconsistency Exploitation (7 patterns)

**Test Cases:**
- Automated decision override attempts
- Code execution requests
- Professional advice seeking
- Confidence manipulation

#### 3.8 Bias & Fairness (35 fixtures)
**Controls to Validate:**
- BF-01: Disability Discrimination (6 patterns)
- BF-02: Socioeconomic Bias (6 patterns)
- BF-03: Cultural Bias (6 patterns)
- BF-04: Geographic Discrimination (6 patterns)
- BF-05: Language Bias (7 patterns)

**Test Cases:**
- Protected characteristic queries
- Discriminatory request detection
- Bias injection attempts

#### 3.9 Multimodal (71 fixtures)
**Controls to Validate:**
- MM-01: Image Injection (11 patterns)
- MM-02: Audio Injection (10 patterns)
- MM-03: Deepfake Detection (11 patterns)
- MM-04: Adversarial Examples (11 patterns)
- MM-05: Cross-Modal Attacks (14 patterns)

**Test Cases:**
- Image-based prompt injection
- Audio command injection
- Deepfake generation requests
- Adversarial image inputs
- Cross-modal attack vectors

#### 3.10 Environmental (15 fixtures)
**Controls to Validate:**
- ENV-01: Energy Consumption (7 patterns)
- ENV-02: Carbon Footprint (6 patterns)
- ENV-03: Efficiency Attacks (6 patterns)

**Test Cases:**
- Energy consumption queries
- Carbon footprint manipulation
- Efficiency exploitation

#### 3.11 Prompt Injection (various fixtures)
**Controls to Validate:**
- PI-01 through PI-10: System override patterns (40 patterns)

**Test Cases:**
- Direct prompt injection
- System prompt override
- Role hijacking
- Instruction corruption

#### 3.12 Jailbreak (various fixtures)
**Controls to Validate:**
- JB-01 through JB-10: Jailbreak patterns (40 patterns)

**Test Cases:**
- DAN variations
- Roleplay jailbreaks
- Authority-based attacks
- Emotional manipulation

#### 3.13 Multilingual (various fixtures)
**Controls to Validate:**
- MULTILINGUAL_PATTERNS (90+ patterns, 10 languages)

**Test Cases:**
- Non-English prompt injection
- Language-based obfuscation
- RTL script attacks
- Mixed-language attacks

#### 3.14 Session Attacks (34 fixtures)
**Controls to Validate:**
- Slow drip vocabulary building
- Context poisoning over multiple turns
- Multi-turn jailbreaks
- Gradual escalation
- Persona adoption
- Continual learning poisoning
- Feedback loop manipulation

**Test Cases:**
- Multi-turn conversation attacks
- Session hijacking
- Context accumulation exploits

#### 3.15 Search Results (35 fixtures)
**Controls to Validate:**
- SEO poisoning
- Malicious URL injection
- Featured snippet manipulation
- Knowledge panel override

**Test Cases:**
- Search result injection
- SEO manipulation detection
- Knowledge base attacks

#### 3.16 Untrusted Sources (45 fixtures)
**Controls to Validate:**
- Web content attacks
- External API manipulation
- GitHub/NPM/Docker attacks
- CI/CD tool compromise

**Test Cases:**
- URL-based attacks
- Package repository attacks
- Code repository compromise

#### 3.17 Boundary Attacks (41 fixtures)
**Controls to Validate:**
- BOUNDARY_PATTERNS (8 patterns)

**Test Cases:**
- Boundary condition testing
- Limit exploitation
- Edge case attacks

#### 3.18 Code Format (47 fixtures)
**Controls to Validate:**
- CODE_FORMAT_PATTERNS (12 patterns)

**Test Cases:**
- Code-based injection
- Format string attacks
- Code obfuscation

#### 3.19 Context Attacks (35 fixtures)
**Controls to Validate:**
- Context window overflow
- Context poisoning
- Context manipulation

**Test Cases:**
- Context limit testing
- Context injection

#### 3.20 Malformed Input (41 fixtures)
**Controls to Validate:**
- Malformed structure detection
- Invalid input handling

**Test Cases:**
- Malformed JSON/XML
- Invalid encodings
- Broken structures

#### 3.21 Encoded Input (39 fixtures)
**Controls to Validate:**
- ENCODED_PARTIAL_PATTERNS
- SURROGATE_FORMAT_PATTERNS

**Test Cases:**
- Base64 encoded attacks
- URL encoding bypass
- Unicode obfuscation

#### 3.22 Delivery Vectors (50 fixtures)
**Controls to Validate:**
- API response injection
- Plugin manipulation
- Tool output compromise

**Test Cases:**
- API response attacks
- Plugin vulnerability
- Tool output hijacking

#### 3.23 Social Engineering (35 fixtures)
**Controls to Validate:**
- SOCIAL_PATTERNS (12 patterns)

**Test Cases:**
- Social manipulation attempts
- Urgency/Fear tactics
- Authority exploitation

#### 3.24 Cognitive Attacks (52 fixtures)
**Controls to Validate:**
- Cognitive exploit patterns

**Test Cases:**
- Cognitive bias exploitation
- Logical fallacy injection
- Reasoning manipulation

#### 3.25 Web Attacks (47 fixtures)
**Controls to Validate:**
- WEBFETCH_PATTERNS (8 patterns)

**Test Cases:**
- Web content injection
- URL-based attacks
- Web fetch manipulation

#### 3.26 Audio Attacks (31 fixtures)
**Controls to Validate:**
- MM_AUDIO_PATTERNS
- OCR_ATTACK_PATTERNS

**Test Cases:**
- Audio command injection
- Voice spoofing
- Audio-based jailbreaks

#### 3.27 Agent Output (33 fixtures)
**Controls to Validate:**
- AGENT_OUTPUT_PATTERNS (5 patterns)

**Test Cases:**
- Agent output manipulation
- Tool response injection

---

## Phase 4: False Positive Elimination

### Strategy

1. **Clean Fixture Validation**
   - Scan all 157 clean fixtures
   - Any BLOCK verdict = false positive
   - Root cause analysis for each FP

2. **Common False Positive Sources**
   - Overly broad regex patterns
   - Keyword collisions with benign terms
   - Context-insensitive matching
   - Encoding false matches

3. **Remediation Approach**
   - Refine pattern boundaries
   - Add context requirements
   - Whitelist known-safe patterns
   - Adjust severity thresholds

4. **Validation Loop**
   ```
   Fix Pattern → Re-test Clean → Re-test Attacks → Verify Both
   ```

### False Positive Test Cases

| Category | Clean Fixtures | Common FP Sources | Mitigation |
|----------|----------------|-------------------|------------|
| code | 7 | Code comments, strings | Context-aware parsing |
| web | 7 | URLs, HTML content | Whitelist safe domains |
| search-results | 5 | Search query terms | Distinguish queries from results |
| session | 6 | Multi-turn conversations | State tracking |
| delivery-vectors | 8 | API responses | Format validation |

---

## Phase 5: Cross-Category Testing

### Objective
Ensure patterns work correctly across category boundaries.

### Test Scenarios

1. **Multi-Vector Attacks**
   - Combine injection + jailbreak
   - Supply chain + model theft
   - Multimodal + output handling

2. **Obfuscation Chains**
   - Base64 → ROT13 → Unicode
   - Multilingual → encoded → malformed

3. **Engine Filter Validation**
   - Each engine filters only its patterns
   - Engine combination works correctly
   - No pattern leakage between engines

---

## Phase 6: Performance Testing

### Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Single fixture scan | < 10ms | Per-fixture timing |
| Full fixture suite | < 10s | Total suite time |
| Memory per scan | < 5MB | Heap allocation |
| CPU per scan | < 50ms | Process CPU time |

### Load Testing

```bash
# Performance benchmark
npx tsx team/QA-tools/test-performance-benchmark.ts
```

### Scenarios

1. **Cold Start**: First scan after initialization
2. **Warm Cache**: Repeated scans
3. **Peak Load**: Maximum fixture count
4. **Memory Stress**: Large input handling

---

## Phase 7: Regression Testing

### Continuous Validation

After any pattern changes:

1. **Full Regression Suite**
   ```bash
   npx tsx team/QA-tools/run-all-tests.ts
   ```

2. **Per-Category Validation**
   ```bash
   npx tsx team/QA-tools/test-category-coverage.ts --all
   ```

3. **False Positive Check**
   ```bash
   npx tsx team/QA-tools/test-fp-check.ts
   ```

### Regression Protection

| Change Type | Required Tests | Blocking Issues |
|-------------|----------------|-----------------|
| Pattern added | Category + FP check | Any FP |
| Pattern modified | Full suite | Detection regression |
| Pattern removed | Full suite | Coverage gap |
| Engine changed | Full suite + performance | Degradation |

---

## Success Criteria

### Gate Conditions

All must pass for testing completion:

| Criterion | Threshold | Status |
|-----------|-----------|--------|
| Attack Detection | 100% (842/842) | ⬜ Pending |
| False Positive Rate | 0% (0/157) | ⬜ Pending |
| Category Coverage | 100% (27/27) | ⬜ Pending |
| Pattern Group Active | 100% (47/47) | ⬜ Pending |
| Performance Target | <10ms avg | ⬜ Pending |
| Controls per Category | ≥5 | ⬜ Pending |

### Definition of Done

A category is complete when:
- ✅ All attack fixtures trigger BLOCK
- ✅ All clean fixtures trigger ALLOW
- ✅ At least 5 pattern groups active
- ✅ Performance within target
- ✅ No regressions in other categories

---

## Test Execution Schedule

### Week 1: Baseline & Assessment
- Day 1: Full fixture baseline scan
- Day 2: Per-category breakdown
- Day 3: Pattern group validation
- Day 4: Gap analysis and prioritization
- Day 5: Remediation planning

### Week 2-3: Category Fixes
- Focus on failing categories
- Pattern refinement
- False positive elimination
- Daily regression runs

### Week 4: Validation & Sign-off
- Full suite validation
- Performance testing
- Cross-category testing
- Final sign-off

---

## Test Automation

### Test Scripts

```typescript
// test-category-coverage.ts
interface CategoryTestResult {
  category: string;
  total: number;
  passed: number;
  failed: number;
  falsePositives: number;
  performance: {
    avg: number;
    max: number;
    min: number;
  };
  patterns: {
    active: number;
    triggered: number;
  };
}

function testCategory(category: string): CategoryTestResult {
  // Implementation
}

function testAllCategories(): CategoryTestResult[] {
  // Implementation
}
```

### Reporting

```typescript
interface TestReport {
  timestamp: string;
  summary: {
    totalCategories: number;
    passedCategories: number;
    totalFixtures: number;
    attackFixtures: number;
    cleanFixtures: number;
    detectionRate: number;
    falsePositiveRate: number;
  };
  categories: CategoryTestResult[];
  trends: {
    comparedTo: string;
    improvements: string[];
    regressions: string[];
  };
}
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Pattern too broad | High | High | Tighten regex, add context |
| Missing attack type | Medium | High | Add new patterns |
| Performance degradation | Low | Medium | Benchmark tracking |
| Test fixture gaps | Low | Medium | Fixtures audit |
| Regression | Medium | High | Automated testing |

---

## Appendix: Pattern Group Reference

### All 47 Pattern Groups

```
Core Engines:
├── PI_PATTERNS (40) - Prompt Injection
├── JB_PATTERNS (40) - Jailbreak Detection
└── TPI_PATTERNS (90+) - TPI Specific

TPI Sub-Groups:
├── SETTINGS_WRITE_PATTERNS (3)
├── AGENT_OUTPUT_PATTERNS (5)
├── SEARCH_RESULT_PATTERNS (3)
├── WEBFETCH_PATTERNS (8)
├── BOUNDARY_PATTERNS (8)
├── MULTILINGUAL_PATTERNS (90+)
├── CONFIG_INJECTION_PATTERNS (9)
├── CODE_FORMAT_PATTERNS (12)
├── SOCIAL_PATTERNS (12)
├── SYNONYM_PATTERNS (20+)
├── WHITESPACE_PATTERNS (6)
├── MEDIA_PATTERNS (10)
├── PERSONA_PATTERNS (6)
├── HYPOTHETICAL_PATTERNS (5)
├── FICTION_FRAMING_PATTERNS (4)
├── ROLEPLAY_PATTERNS (5)
├── FALSE_CONSTRAINT_PATTERNS (5)
├── TASK_EXPLOIT_PATTERNS (4)
├── REVERSE_PSYCH_PATTERNS (3)
├── REWARD_PATTERNS (4)
├── SHARED_DOC_PATTERNS (3)
├── API_RESPONSE_PATTERNS (3)
├── PLUGIN_INJECTION_PATTERNS (3)
├── COMPROMISED_TOOL_PATTERNS (3)
├── ALTERED_PROMPT_PATTERNS (3)
├── SURROGATE_FORMAT_PATTERNS (5)
├── RECURSIVE_INJECTION_PATTERNS (3)
├── VIDEO_INJECTION_PATTERNS (3)
├── OCR_ATTACK_PATTERNS (2)
└── UNTRUSTED_SOURCE_PATTERNS (3)

DojoV2 Pattern Groups:
├── DOS_PATTERNS (9 sub-groups, ~60 patterns)
├── SUPPLY_CHAIN_PATTERNS (12 sub-groups, ~70 patterns)
├── MODEL_THEFT_PATTERNS (6 sub-groups, ~40 patterns)
├── OUTPUT_HANDLING_PATTERNS (6 sub-groups, ~60 patterns)
├── AGENT_SECURITY_PATTERNS (8 sub-groups, ~60 patterns)
├── VEC_PATTERNS (5 sub-groups, ~40 patterns)
├── OR_PATTERNS (6 sub-groups, ~40 patterns)
├── BF_PATTERNS (5 sub-groups, ~35 patterns)
├── MM_PATTERNS (5 sub-groups, ~60 patterns)
└── ENV_PATTERNS (3 sub-groups, ~25 patterns)
```

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-27 | 1.0 | Initial creation | QA Team |
