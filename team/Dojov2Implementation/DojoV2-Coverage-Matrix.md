# DojoV2 Coverage Matrix

**Framework:** BU-TPI Security Testing Framework
**Version:** 3.1 (Current) → 4.0 (DojoV2 Target)
**Date:** 2026-02-26

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully Covered - All sub-controls addressed |
| ⚠️ | Partially Covered - Some sub-controls addressed |
| ❌ | Not Covered - Control category completely missing |
| ➕ | Planned - Coverage added in DojoV2 |
| 🟡 | Gap Identified - Coverage recommended but not planned |
| 🔴 | Critical Gap - High priority missing coverage |

---

## OWASP LLM Top 10 Coverage Matrix

### Overview

| Version | Categories Covered | Total Categories | Coverage % |
|---------|-------------------|------------------|------------|
| Current (v3.1) | 7 | 10 | 70% |
| DojoV2 (v4.0) | 10 | 10 | 100% ✅ |

---

### Detailed Mapping

| OWASP Category | Description | Current Controls | Coverage | DojoV2 Addition |
|----------------|-------------|------------------|----------|-----------------|
| **LLM01** | Prompt Injection | PI-01 to PI-08, II-01 to II-08 | ✅ Fully Covered | None needed |
| **LLM02** | Insecure Output Handling | None | ❌ Not Covered | ➕ OUT-01 to OUT-06 |
| **LLM03** | Training Data Poisoning | DE-03, II series | ⚠️ Partial | ➕ SC-04, SC-06 |
| **LLM04** | Model Denial of Service | CC-01, CC-06 | ⚠️ Partial | ➕ DOS-01 to DOS-06 |
| **LLM05** | Supply Chain Vulnerabilities | None | ❌ Not Covered | ➕ SC-01 to SC-06 |
| **LLM06** | Sensitive Information Disclosure | DE-01 to DE-08 | ✅ Fully Covered | None needed |
| **LLM07** | Insecure Plugin Design | TA-05, TA-06 | ⚠️ Partial | ➕ AG-01 to AG-08 |
| **LLM08** | Excessive Agency | TA-01 to TA-06 | ⚠️ Partial | ➕ AG-01 to AG-08 |
| **LLM09** | Overreliance / Misinformation | MI-01 to MI-04 | ⚠️ Partial | ➕ OR-01 to OR-06 |
| **LLM10** | Model Theft | DE-03 | ⚠️ Partial | ➕ MT-01 to MT-06 |

### OWASP Sub-Control Breakdown

```
LLM01: Prompt Injection (26 sub-controls)
├── Direct Injection: ✅ PI-01, PI-02, PI-03
├── Indirect Injection: ✅ II-01 to II-08
├── Input Validation: ⚠️ Partially covered
├── Prompt Engineering: ⚠️ Partially covered
└── Human-in-the-Loop: 🟡 Not directly tested

LLM02: Insecure Output Handling (12 sub-controls)
├── XSS: ❌ Not Covered → OUT-01
├── SQL Injection: ❌ Not Covered → OUT-02
├── Command Injection: ❌ Not Covered → OUT-03
├── SSRF: ❌ Not Covered → OUT-04
├── Path Traversal: ❌ Not Covered → OUT-05
└── Open Redirect: ❌ Not Covered → OUT-06

LLM03: Training Data Poisoning (10 sub-controls)
├── Data Validation: ⚠️ Partial → SC-04
├── ML-BOM: ❌ Not Covered → SC-01
├── Sandboxing: 🟡 Recommended
├── Adversarial Robustness: 🟡 Recommended
└── Red Team Testing: ⚠️ Partial

LLM04: Model Denial of Service (8 sub-controls)
├── Rate Limiting: ❌ Not Covered → DOS-05
├── Input Validation: ❌ Not Covered → DOS-01
├── Resource Monitoring: 🟡 Recommended
├── Output Controls: ❌ Not Covered → DOS-04
└── P-DoS: ❌ Not Covered → DOS-04

LLM05: Supply Chain (14 sub-controls)
├── Third-Party Testing: ❌ Not Covered → SC-01
├── Plugin Security: ❌ Not Covered → SC-03
├── Dependency Checking: ❌ Not Covered → SC-02
├── Data Source Verification: ❌ Not Covered → SC-04
└── License Compliance: 🟡 Recommended

LLM06: Sensitive Information Disclosure (10 sub-controls)
├── Data Sanitization: ✅ DE-01 to DE-05
├── Output Filtering: ✅ DE-08
├── Access Control: ⚠️ Partial
└── System Prompt Restrictions: ✅ DE-01

LLM07/LLM08: Plugins & Agency (16 sub-controls)
├── Input Validation: ⚠️ Partial → AG-03
├── Access Control: ⚠️ Partial → AG-01
├── Output Validation: ⚠️ Partial
├── Authorization: ⚠️ Partial → AG-05
├── Agent Permissions: ❌ Not Covered → AG-01 to AG-08
└── Multi-Agent: ❌ Not Covered → AG-07

LLM09: Overreliance (8 sub-controls)
├── Content Verification: ⚠️ Partial → OR-04
├── Human-in-the-Loop: ⚠️ Partial → OR-01
├── Usage Restrictions: 🟡 Recommended
└── Authorization: 🟡 Recommended

LLM10: Model Theft (12 sub-controls)
├── Access Controls: ⚠️ Partial → MT-01
├── Rate Limiting: ⚠️ Partial → MT-01
├── Monitoring: 🟡 Recommended
├── Watermarking: ❌ Not Covered → MT-05
└── Adversarial Training: 🟡 Recommended
```

---

## MITRE ATLAS Coverage Matrix

### Overview

| Version | Tactics Covered | Total Tactics | Coverage % |
|---------|----------------|---------------|------------|
| Current (v3.1) | 8 | 16 | 50% |
| DojoV2 (v4.0) | 14 | 16 | 87% |

---

### Detailed Mapping

| ATLAS Tactic | ID | Current Coverage | DojoV2 Addition |
|--------------|-----|------------------|-----------------|
| **Reconnaissance** | AML.TA0002 | 🟡 Limited | → OR-01, OR-05 |
| **Resource Development** | AML.TA0003 | ⚠️ Partial | → SC-01 to SC-06 |
| **Initial Access** | AML.TA0004 | ⚠️ Partial | → SC-01 |
| **AI Model Access** | AML.TA0000 | ⚠️ Partial | → MT-01 to MT-06 |
| **Execution** | AML.TA0005 | ⚠️ Partial | → OUT-01 to OUT-06 |
| **Persistence** | AML.TA0006 | ⚠️ Partial | → AG-02, AG-04 |
| **Privilege Escalation** | AML.TA0012 | ⚠️ Partial (TA-06) | → AG-07 |
| **Defense Evasion** | AML.TA0007 | ✅ JB series | None needed |
| **Credential Access** | AML.TA0013 | ⚠️ Partial (DE-07) | → AG-01, AG-05 |
| **Discovery** | AML.TA0008 | 🟡 Limited | → MT-02 |
| **Lateral Movement** | AML.TA0015 | 🟡 Limited | → AG-07 |
| **Collection** | AML.TA0009 | ⚠️ Partial (DE series) | → AG-08 |
| **AI Attack Staging** | AML.TA0001 | ⚠️ Partial | → VEC-02 |
| **Command and Control** | AML.TA0014 | ⚠️ Partial (TA-03) | → AG-07 |
| **Exfiltration** | AML.TA0010 | ✅ DE series | None needed |
| **Impact** | AML.TA0011 | ⚠️ Partial (HC series) | → DOS-01 to DOS-06 |

---

### MITRE ATLAS Technique Coverage

```
ATLAS Techniques by Tactic (155 total)

Reconnaissance (8 techniques):
├── AML.T0006: Active Scanning → 🟡 OR-01
├── AML.T0064: Gather RAG-Indexed Targets → 🟡 AG-04
├── AML.T0087: Gather Victim Identity → 🟡 DE-01
├── AML.T0004: Search Application Repos → 🟡 SC-03
├── AML.T0001: Search Open AI Vuln Analysis → 🟡 SC-02
├── AML.T0000: Search Open Technical Databases → 🟡 SC-02
├── AML.T0095: Search Open Websites → 🟡 SC-04
└── AML.T0003: Search Victim-Owned Websites → 🟡 SC-04

Resource Development (13 techniques):
├── AML.T0008: Acquire Infrastructure → 🟡 SC-01
├── AML.T0002: Acquire Public AI Artifacts → 🟡 SC-01
├── AML.T0017: Develop Capabilities → 🟡 SC-06
├── AML.T0021: Establish Accounts → 🟡 SC-01
├── AML.T0065: LLM Prompt Crafting → ✅ PI, JB
├── AML.T0016: Obtain Capabilities → 🟡 SC-05
├── AML.T0020: Poison Training Data → ➕ SC-06
├── AML.T0060: Publish Hallucinated Entities → ⚠️ MI
├── AML.T0104: Publish Poisoned AI Agent → ➕ AG-03
├── AML.T0019: Publish Poisoned Datasets → ➕ SC-06
├── AML.T0058: Publish Poisoned Models → ➕ SC-06
├── AML.T0066: Retrieval Content Crafting → ➕ VEC-04
└── AML.T0079: Stage Capabilities → 🟡 SC-01

Execution (6 techniques):
├── AML.T0100: AI Agent Clickbait → ➕ AG-07
├── AML.T0053: AI Agent Tool Invocation → ➕ AG-01
├── AML.T0050: Command and Scripting Interpreter → ➕ OUT-03
├── AML.T0103: Deploy AI Agent → 🟡 AG-02
├── AML.T0051: LLM Prompt Injection → ✅ PI, II
└── AML.T0011: User Execution → 🟡 OR-02

Persistence (8 techniques):
├── AML.T0080: AI Agent Context Poisoning → ➕ AG-02
├── AML.T0099: AI Agent Tool Data Poisoning → ➕ AG-03
├── AML.T0061: LLM Prompt Self-Replication → ➕ DOS-02
├── AML.T0018: Manipulate AI Model → 🟡 SC-06
├── AML.T0081: Modify AI Agent Configuration → ➕ AG-02
├── AML.T0020: Poison Training Data → ➕ SC-06
├── AML.T0093: Prompt Infiltration via App → ✅ II
└── AML.T0070: RAG Poisoning → ➕ AG-04

Privilege Escalation (4 techniques):
├── AML.T0053: AI Agent Tool Invocation → ➕ AG-01
├── AML.T0105: Escape to Host → 🟡 TA-01
├── AML.T0054: LLM Jailbreak → ✅ JB
└── AML.T0012: Valid Accounts → ⚠️ TA-06

Credential Access (6 techniques):
├── AML.T0098: AI Agent Tool Credential Harvesting → ➕ AG-01
├── AML.T0083: Credentials from AI Agent Config → ➕ AG-01
├── AML.T0106: Exploitation for Credential Access → 🟡 TA-05
├── AML.T0090: OS Credential Dumping → 🟡 DE-07
├── AML.T0082: RAG Credential Harvesting → ➕ AG-05
└── AML.T0055: Unsecured Credentials → ⚠️ DE-07

Impact (8 techniques):
├── AML.T0034: Cost Harvesting → ➕ DOS-06
├── AML.T0101: Data Destruction via Agent → ➕ AG-03
├── AML.T0029: Denial of AI Service → ➕ DOS-01 to DOS-05
├── AML.T0031: Erode AI Model Integrity → 🟡 SC-06
├── AML.T0059: Erode Dataset Integrity → ➕ SC-06
├── AML.T0015: Evade AI Model → ✅ JB
├── AML.T0048: External Harms → ✅ HC
└── AML.T0046: Spamming with Chaff Data → ➕ DOS-03
```

---

## NIST AI RMF Coverage Matrix

### NIST AI 600-1: Generative AI Profile (12 Risk Categories)

| NIST Risk Category | Current Coverage | DojoV2 Addition | Target Coverage |
|--------------------|------------------|-----------------|-----------------|
| **1. CBRN Information** | ⚠️ Partial (HC-01) | → HC-01 expansion | ✅ |
| **2. Confabulation** | ⚠️ Partial (MI-01 to MI-04) | → OR-04, OR-05, OR-06 | ✅ |
| **3. Dangerous Content** | ✅ HC-01 to HC-08, CP-01 to CP-06 | None needed | ✅ |
| **4. Data Privacy** | ⚠️ Partial (PV-01 to PV-06) | → MT-04, DE-03 | ✅ |
| **5. Environmental Impacts** | ❌ Not Covered | ➕ ENV-01 to ENV-03 | ✅ |
| **6. Harmful Bias** | ⚠️ Partial (BF-01 to BF-04) | ➕ BF-05 to BF-09 | ✅ |
| **7. Human-AI Configuration** | 🟡 Limited | → OR-01 to OR-03 | ✅ |
| **8. Information Integrity** | ⚠️ Partial (MI-01 to MI-04) | → OR-04 to OR-06 | ✅ |
| **9. Information Security** | ⚠️ Partial (HC-01 to HC-03) | → OUT-01 to OUT-06 | ✅ |
| **10. Intellectual Property** | 🟡 Limited | → MT-01 to MT-06 | ✅ |
| **11. Obscene Content** | ✅ CP-06, HC-07 | None needed | ✅ |
| **12. Value Chain Integration** | ❌ Not Covered | ➕ SC-01 to SC-06 | ✅ |

### NIST AI RMF Functions Coverage

| NIST Function | Categories | Current Coverage | DojoV2 Target |
|---------------|------------|------------------|---------------|
| **GOVERN** | 6 categories | 🟡 Governance controls not in scope | Out of scope (org-level) |
| **MAP** | 5 categories | 🟡 Mapping controls not in scope | Out of scope (org-level) |
| **MEASURE** | 4 categories | ✅ Testing framework aligns | Enhanced |
| **MANAGE** | 4 categories | 🟡 Management controls not in scope | Out of scope (org-level) |

---

## ENISA AI Security Coverage Matrix

### ENISA AI Threat Taxonomy

| ENISA Threat Category | Description | Current Coverage | DojoV2 Addition |
|-----------------------|-------------|------------------|-----------------|
| **NAA: Malicious Activity** | Data/Model poisoning, extraction | ⚠️ Partial | ➕ SC-06, VEC-02, MT-04 |
| **EIH: Eavesdropping** | Unauthorized access to communications | 🟡 Limited | ➕ MT-06 |
| **PA: Physical Attacks** | Infrastructure destruction | ❌ Not in scope | Out of scope |
| **UD: Unintentional Damage** | Accidental harm | 🟡 Limited | → OR-01 |
| **FM: Failures** | Hardware/software failures | ❌ Not in scope | Out of scope |
| **OUT: Outages** | Service interruption | ⚠️ Partial (DOS) | ➕ DOS-01 to DOS-06 |
| **Legal** | Legal proceedings | 🟡 Limited | Out of scope |

### ENISA AI Asset Categories

| Asset Category | Protection Needed | Current Coverage | DojoV2 Addition |
|----------------|-------------------|------------------|-----------------|
| **Data** | Training data, datasets | ⚠️ Partial | ➕ SC-04, SC-06 |
| **Models** | Algorithms, parameters | ⚠️ Partial | ➕ MT-01 to MT-06, SC-01 |
| **Artifacts** | Configurations, documentation | ⚠️ Partial | ➕ DE-04 |
| **Participants** | Data owners, developers | 🟡 Limited | Out of scope |
| **Processes** | Training, testing procedures | 🟡 Limited | Out of scope |
| **Environment/Tools** | Platforms, libraries | ⚠️ Partial | ➕ SC-02, SC-03 |

---

## ISO/IEC 42001 Coverage Matrix

| ISO 42001 Clause | Description | Current Coverage | DojoV2 Addition |
|------------------|-------------|------------------|-----------------|
| **Clause 5: Leadership** | AI policy, roles, responsibilities | ❌ Not in scope | Out of scope |
| **Clause 6: Planning** | Risk assessment, treatment | 🟡 Partial | Out of scope |
| **Clause 7: Support** | Resources, competence, awareness | ❌ Not in scope | Out of scope |
| **Clause 8: Operation** | AI system development, testing | ✅ Primary focus | Enhanced |
| **Clause 9: Performance** | Monitoring, measurement | ⚠️ Partial | ➕ OR-04, OR-06 |
| **Clause 10: Improvement** | Nonconformity, corrective action | 🟡 Partial | Out of scope |

---

## EU AI Act Coverage Matrix

| EU AI Act Category | Risk Level | Current Coverage | DojoV2 Addition |
|--------------------|------------|------------------|-----------------|
| **Prohibited AI** | Unacceptable risk | ✅ HC, CP series | None needed |
| **High-Risk AI** | Safety, fundamental rights | ⚠️ Partial | ➕ OR, BF expansion |
| **Limited-Risk AI** | Transparency obligations | ⚠️ Partial | ➕ OR-05 |
| **Minimal-Risk AI** | No restrictions | 🟡 N/A | N/A |

### High-Risk AI Categories (Annex III)

| Category | Current Coverage | DojoV2 Addition |
|----------|------------------|-----------------|
| Biometric identification | ❌ Not in scope | Out of scope |
| Critical infrastructure management | ⚠️ Partial | ➕ OR-01 |
| Education/ vocational training | ⚠️ Partial | ➕ OR-03 |
| Employment/ worker management | ❌ Not in scope | Out of scope |
| Access to essential services | ⚠️ Partial | ➕ OR-01 |
| Law enforcement | ⚠️ Partial | 🟡 Limited |
| Migration/ border control | ❌ Not in scope | Out of scope |
| Administration of justice | ⚠️ Partial | ➕ OR-03 |

---

## CSA CAI 1.0 (Cloud Security Alliance) Coverage

| CSA Category | Description | Current Coverage | DojoV2 Addition |
|--------------|-------------|------------------|-----------------|
| **Secure by Design** | Architecture, development | 🟡 Limited | Out of scope |
| **Secure by Default** | Configuration, deployment | 🟡 Limited | Out of scope |
| **Input/Output Validation** | Prompt injection, output handling | ⚠️ Partial | ➕ OUT series |
| **Data Privacy** | PII, sensitive data | ⚠️ Partial | ➕ MT-04 |
| **Model Protection** | Theft, extraction | ⚠️ Partial | ➕ MT series |
| **Monitoring & Logging** | Telemetry, audit | 🟡 Limited | Out of scope |

---

## Global Coverage Summary

### Framework Coverage Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│                    COVERAGE COMPARISON                          │
├─────────────────┬───────────────┬───────────────┬──────────────┤
│ Framework       │ Current       │ DojoV2        │ Change       │
├─────────────────┼───────────────┼───────────────┼──────────────┤
│ OWASP LLM Top 10│ 7/10 (70%)    │ 10/10 (100%)  │ +30%         │
│ MITRE ATLAS     │ 8/16 (50%)    │ 14/16 (87%)   │ +37%         │
│ NIST AI 600-1   │ 7/12 (58%)    │ 12/12 (100%)  │ +42%         │
│ ENISA AI Threats│ 5/8 (63%)     │ 8/8 (100%)    │ +37%         │
│ ISO/IEC 42001   │ 1/6 (17%)     │ 2/6 (33%)     │ +16%         │
│ EU AI Act       │ 3/8 (38%)     │ 5/8 (62%)     │ +24%         │
│ CSA CAI 1.0     │ 2/6 (33%)     │ 4/6 (67%)     │ +34%         │
├─────────────────┼───────────────┼───────────────┼──────────────┤
│ AVERAGE         │ 47%           │ 78%           │ +31%         │
└─────────────────┴───────────────┴───────────────┴──────────────┘
```

### Testing Area Coverage Across Frameworks

```
┌────────────────────────────────────────────────────────────────────┐
│              TESTING AREA → FRAMEWORK MAPPING                      │
├────────────────┬───────────┬───────────┬───────────┬──────────────┤
│ Testing Area   │ OWASP    │ MITRE    │ NIST     │ ENISA        │
├────────────────┼───────────┼───────────┼───────────┼──────────────┤
│ PI (8)         │ LLM01 ✅ │ Exec ✅  │ -         │ NAA ✅       │
│ JB (8)         │ LLM07 ✅ │ DefEv ✅ │ -         │ NAA ✅       │
│ DE (8)         │ LLM06 ✅ │ Exfil ✅ │ #4 ✅     │ NAA ✅       │
│ HC (8)         │ - ✅      │ Impact ✅ │ #1,#3 ✅  │ NAA ✅       │
│ CP (6)         │ - ✅      │ Impact ✅ │ #3,#11 ✅ │ NAA ✅       │
│ PV (6)         │ LLM06 ✅  │ Cred ✅  │ #4 ✅     │ NAA ✅       │
│ BF (4→9)       │ LLM09 ⚠️  │ - ⚠️     │ #6 ✅     │ - ⚠️         │
│ MI (4→10)      │ LLM09 ⚠️  │ Impact ⚠️│ #2,#8 ✅  │ - ⚠️         │
│ II (8)         │ LLM01 ✅ │ Exec ✅  │ -         │ NAA ✅       │
│ TA (6→14)      │ LLM07/08⚠️│ Exec ✅  │ #9 ✅     │ NAA ✅       │
│ CC (6→12)      │ LLM04 ⚠️  │ - ⚠️     │ -         │ OUT ⚠️       │
│ DOS (0→6)      │ LLM04 ❌  │ Impact ❌│ -         │ OUT ❌       │
│ SC (0→6)       │ LLM05 ❌  │ ResDev ❌│ #12 ❌    │ NAA ❌       │
│ AG (0→8)       │ LLM07/08❌ │ Pers ❌  │ -         │ NAA ❌       │
│ MT (0→6)       │ LLM10 ❌  │ Col ❌   │ #10 ❌    │ NAA ❌       │
│ OUT (0→6)      │ LLM02 ❌  │ Exec ❌  │ #9 ❌     │ NAA ❌       │
│ VEC (0→5)      │ New ❌    │ Stag ❌  │ -         │ NAA ❌       │
│ OR (0→6)       │ LLM09 ❌  │ - ❌     │ #2,#7,#8 ❌│ - ❌         │
│ MM (0→5)      │ - ❌      │ - ❌     │ -         │ - ❌         │
│ ENV (0→3)     │ - ❌      │ - ❌     │ #5 ❌     │ - ❌         │
└────────────────┴───────────┴───────────┴───────────┴──────────────┘

Key: ✅ = Covered, ⚠️ = Partial, ❌ = Missing
```

---

## Control-to-Framework Cross-Reference

### Current Controls (72)

| Control ID | Control Name | OWASP | MITRE | NIST | ENISA |
|------------|--------------|-------|-------|------|-------|
| PI-01 | Basic Instruction Override | LLM01 | T0051 | - | NAA |
| PI-02 | Role Hijacking | LLM01 | T0073 | - | NAA |
| PI-03 | System Override Attempts | LLM01 | T0054 | - | NAA |
| PI-04 | Format-Based Injection | LLM01 | T0068 | - | NAA |
| PI-05 | Delimiter Manipulation | LLM01 | T0068 | - | NAA |
| PI-06 | Priority Manipulation | LLM01 | - | - | NAA |
| PI-07 | Translation-Based Injection | LLM01 | - | - | NAA |
| PI-08 | Code Comment Injection | LLM01 | - | - | NAA |
| JB-01 | DAN Jailbreak | LLM07 | T0054 | - | NAA |
| JB-02 | Developer Mode Jailbreak | LLM07 | T0054 | - | NAA |
| JB-03 | Grandma Jailbreak | LLM07 | T0073 | - | NAA |
| JB-04 | Authority Impersonation | LLM07 | T0073 | - | NAA |
| JB-05 | Unrestricted Mode | LLM07 | T0054 | - | NAA |
| JB-06 | Reverse Psychology | LLM07 | - | - | NAA |
| JB-07 | Reward Seeking | LLM07 | - | - | NAA |
| JB-08 | Simulation Frame | LLM07 | T0088 | - | NAA |
| DE-01 | System Prompt Extraction | LLM07 | T0056 | - | NAA |
| DE-02 | Structured Data Extraction | LLM06 | T0057 | #4 | NAA |
| DE-03 | Training Data Extraction | LLM06 | T0035 | #4 | NAA |
| DE-04 | Code and Configuration Leakage | LLM06 | - | - | NAA |
| DE-05 | Session Data Extraction | LLM06 | T0057 | #4 | NAA |
| DE-06 | Log and Memory Dump | LLM06 | - | - | NAA |
| DE-07 | Credential and Key Extraction | LLM06 | T0098 | #4 | NAA |
| DE-08 | Tool Output Manipulation | LLM06 | - | #9 | NAA |
| HC-01 | Malware Generation | - | - | #1, #9 | NAA |
| HC-02 | Exploit Code | - | - | #9 | NAA |
| HC-03 | Attack Scripts | - | - | #9 | NAA |
| HC-04 | Social Engineering | - | - | #3 | NAA |
| HC-05 | Surveillance and Stalking | - | - | #3 | NAA |
| HC-06 | Botnet and Infrastructure | - | - | #9 | NAA |
| HC-07 | Violence and Physical Harm | - | T0048 | #3 | NAA |
| HC-08 | Financial and Criminal Acts | - | T0048 | #3 | NAA |
| CP-01 | Violence and Physical Harm | - | T0048 | #3 | NAA |
| CP-02 | Illegal Acts | - | T0048 | #3 | NAA |
| CP-03 | Self-Harm | - | T0048 | #3 | NAA |
| CP-04 | Financial Crimes | - | T0048 | #3 | NAA |
| CP-05 | Hate Speech | - | T0048 | #3 | NAA |
| CP-06 | Sexual Content | - | T0048 | #11 | NAA |
| PV-01 | PII Extraction | LLM06 | T0057 | #4 | NAA |
| PV-02 | Medical Information | LLM06 | T0057 | #4 | NAA |
| PV-03 | Legal Advice | LLM09 | - | - | - |
| PV-04 | Financial Advice | LLM09 | - | - | - |
| PV-05 | Location and Tracking | LLM06 | T0057 | #4 | NAA |
| PV-06 | Doxxing | LLM06 | T0057 | #4 | NAA |
| BF-01 | Gender Bias | LLM09 | - | #6 | - |
| BF-02 | Racial and Ethnic Bias | LLM09 | - | #6 | - |
| BF-03 | Age Bias | LLM09 | - | #6 | - |
| BF-04 | Religious Bias | LLM09 | - | #6 | - |
| MI-01 | Scientific Denial | LLM09 | T0060 | #2, #8 | - |
| MI-02 | Medical Misinformation | LLM09 | T0060 | #2 | - |
| MI-03 | Historical Revisionism | LLM09 | T0060 | #8 | - |
| MI-04 | Election Misinformation | LLM09 | T0060 | #8 | - |
| II-01 | Encoding-Based Injection | LLM01 | T0068 | - | NAA |
| II-02 | Unicode Homograph | LLM01 | - | - | NAA |
| II-03 | Invisible Character Injection | LLM01 | - | - | NAA |
| II-04 | Emoji and Symbol Injection | LLM01 | - | - | NAA |
| II-05 | Leet Speak Injection | LLM01 | - | - | NAA |
| II-06 | Cipher-Based Injection | LLM01 | - | - | NAA |
| II-07 | Recursive Injection | LLM01 | - | - | NAA |
| II-08 | Multilingual Injection | LLM01 | - | - | NAA |
| TA-01 | Code Execution Abuse | LLM07 | T0053 | #9 | NAA |
| TA-02 | File System Abuse | LLM07 | T0105 | - | NAA |
| TA-03 | Network Abuse | LLM07 | - | #9 | NAA |
| TA-04 | Database Abuse | LLM07 | - | #9 | NAA |
| TA-05 | API Abuse | LLM07 | T0096 | #9 | NAA |
| TA-06 | Privilege Escalation | LLM07 | T0012 | - | NAA |
| CC-01 | Context Overflow | LLM04 | T0029 | - | OUT |
| CC-02 | Few-Shot Jailbreak | LLM07 | T0054 | - | NAA |
| CC-03 | Chat History Injection | LLM01 | T0092 | - | NAA |
| CC-04 | Delimiter Confusion | LLM01 | T0092 | - | NAA |
| CC-05 | Role Reversal | LLM07 | T0073 | - | NAA |
| CC-06 | Instruction Overload | LLM04 | T0029 | - | OUT |

### New Controls (DojoV2)

| Control ID | Control Name | OWASP | MITRE | NIST | ENISA |
|------------|--------------|-------|-------|------|-------|
| DOS-01 | Input Length Attacks | LLM04 | T0029 | - | OUT |
| DOS-02 | Recursive/Loop Attacks | LLM04 | T0061 | - | OUT |
| DOS-03 | Context Window Overflow | LLM04 | T0029 | - | OUT |
| DOS-04 | Output Limit Breaking | LLM04 | T0029 | - | OUT |
| DOS-05 | Concurrent Request Flooding | LLM04 | T0029 | - | OUT |
| DOS-06 | Cost Harvesting Attacks | LLM04 | T0034 | - | OUT |
| SC-01 | Third-Party Model Testing | LLM05 | T0010 | #12 | NAA |
| SC-02 | Dependency Vulnerability Scanning | LLM05 | T0010 | #12 | NAA |
| SC-03 | Plugin Security Testing | LLM05 | T0010 | #12 | NAA |
| SC-04 | Data Source Verification | LLM05 | T0066 | #12 | NAA |
| SC-05 | Typosquatting Detection | LLM05 | T0016 | #12 | NAA |
| SC-06 | Model/Component Tampering | LLM05 | T0059 | #12 | NAA |
| AG-01 | AI Agent Tool Credential Harvesting | LLM07/08 | T0098 | - | NAA |
| AG-02 | AI Agent Context Poisoning | LLM07/08 | T0080 | - | NAA |
| AG-03 | AI Agent Tool Data Poisoning | LLM07/08 | T0099 | - | NAA |
| AG-04 | RAG Poisoning | LLM07/08 | T0070 | - | NAA |
| AG-05 | RAG Credential Harvesting | LLM07/08 | T0082 | - | NAA |
| AG-06 | False RAG Entry Injection | LLM07/08 | T0071 | - | NAA |
| AG-07 | Multi-Agent Manipulation | LLM07/08 | T0053 | - | NAA |
| AG-08 | Agent Memory Extraction | LLM07/08 | T0035 | - | NAA |
| MT-01 | API Extraction Attacks | LLM10 | T0024 | #10 | NAA |
| MT-02 | Model Fingerprinting | LLM10 | - | #10 | NAA |
| MT-03 | Probability Distribution Extraction | LLM10 | - | #10 | NAA |
| MT-04 | Training Data Reconstruction | LLM10 | T0035 | #10 | NAA |
| MT-05 | Model Watermark Detection/Removal | LLM10 | - | #10 | NAA |
| MT-06 | Side-Channel Attacks | LLM10 | T0107 | #10 | NAA |
| OUT-01 | XSS via LLM Output | LLM02 | T0050 | #9 | NAA |
| OUT-02 | SQL Injection via Output | LLM02 | T0050 | #9 | NAA |
| OUT-03 | Command Injection via Output | LLM02 | T0050 | #9 | NAA |
| OUT-04 | SSRF via Output | LLM02 | T0050 | #9 | NAA |
| OUT-05 | Path Traversal via Output | LLM02 | T0050 | #9 | NAA |
| OUT-06 | Open Redirect via Output | LLM02 | T0050 | #9 | NAA |
| VEC-01 | Indirect Prompt Injection via Embeddings | New | T0066 | - | NAA |
| VEC-02 | Embedding Poisoning | New | T0070 | - | NAA |
| VEC-03 | Vector Database Data Leakage | New | T0057 | #4 | NAA |
| VEC-04 | SEO-Optimized Poisoning | New | T0066 | - | NAA |
| VEC-05 | Embedding Similarity Attacks | New | - | - | NAA |
| OR-01 | Automated Decision Making | LLM09 | - | #7 | - |
| OR-02 | Code Execution Without Review | LLM09 | T0050 | #7 | - |
| OR-03 | Professional Advice Without Verification | LLM09 | - | #7 | - |
| OR-04 | Confidence Calibration | LLM09 | - | #2, #8 | - |
| OR-05 | Source Attribution Verification | LLM09 | - | #8 | - |
| OR-06 | Consistency Testing | LLM09 | - | #2 | - |
| BF-05 | Disability Bias | LLM09 | - | #6 | - |
| BF-06 | Socioeconomic Bias | LLM09 | - | #6 | - |
| BF-07 | Cultural Bias | LLM09 | - | #6 | - |
| BF-08 | Geographic Bias | LLM09 | - | #6 | - |
| BF-09 | Language Performance Bias | LLM09 | - | #6 | - |
| MM-01 | Image-Based Prompt Injection | - | - | - | NAA |
| MM-02 | Audio-Based Prompt Injection | - | - | - | NAA |
| MM-03 | Deepfake Generation Detection | - | T0088 | #8 | NAA |
| MM-04 | Visual Adversarial Examples | - | - | - | NAA |
| MM-05 | Cross-Modal Injection | - | - | - | NAA |
| ENV-01 | Energy Consumption Testing | - | - | #5 | - |
| ENV-02 | Carbon Footprint Assessment | - | - | #5 | - |
| ENV-03 | Efficiency Optimization | - | - | #5 | - |

---

## Gap Analysis Summary

### Critical Gaps (P0) - Must Address

| Gap | Impact | Frameworks Affected |
|-----|--------|-------------------|
| Model Denial of Service | Service availability, cost attacks | OWASP LLM04, MITRE ATLAS |
| Supply Chain Vulnerabilities | Model/data integrity, backdoors | OWASP LLM05, NIST #12, ENISA |
| AI Agent Security | Agentic attacks, RAG poisoning | OWASP LLM07/08, MITRE ATLAS |

### Important Gaps (P1) - Should Address

| Gap | Impact | Frameworks Affected |
|-----|--------|-------------------|
| Model Theft | IP loss, model cloning | OWASP LLM10, NIST #10 |
| Insecure Output Handling | XSS, SQLi, SSRF via outputs | OWASP LLM02, NIST #9 |
| Vector/Embeddings Weaknesses | RAG attacks, embedding poisoning | OWASP 2025, MITRE ATLAS |

### Enhancement Gaps (P2) - Nice to Have

| Gap | Impact | Frameworks Affected |
|-----|--------|-------------------|
| Overreliance Controls | Hallucination, confabulation | OWASP LLM09, NIST #2, #8 |
| Expanded Bias Testing | Fairness, discrimination | NIST #6 |
| Multimodal Security | Vision/audio attacks | MITRE ATLAS |
| Environmental Impact | Green AI compliance | NIST #5 |

---

## Compliance Mapping

### GDPR / Data Protection

| GDPR Article | Coverage | Controls |
|--------------|----------|----------|
| Art. 25 (Data Protection by Design) | ⚠️ Partial | PV series |
| Art. 32 (Security of Processing) | ⚠️ Partial | DE, SC series |
| Art. 35 (Data Protection Impact Assessment) | 🟡 Limited | OR series |

### SOC 2 / ISO 27001

| Control Area | Coverage | Controls |
|--------------|----------|----------|
| Access Control | ⚠️ Partial | TA-06, AG-01 |
| Change Management | 🟡 Limited | SC series |
| Monitoring | 🟡 Limited | OR-04, OR-06 |

---

*Document Version: 1.0*
*Last Updated: 2026-02-26*
*Owner: BlackUnicorn Laboratory*
