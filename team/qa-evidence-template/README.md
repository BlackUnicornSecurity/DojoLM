# QA Evidence Directory Structure

**Purpose:** Organized storage for all test evidence collected during BU-TPI security assessments.

## Directory Structure

```
qa-evidence-[YYYYMMDD]/
├── README.md (this file)
├── metadata.json (test session metadata)
├── screenshots/ (all screenshots)
│   ├── TA-01-prompt-injection/
│   │   ├── PI-01-001-*.png
│   │   ├── PI-01-002-*.png
│   │   └── ...
│   ├── TA-02-jailbreak/
│   ├── TA-03-data-exfiltration/
│   ├── TA-04-harmful-content/
│   ├── TA-05-content-policy/
│   ├── TA-06-privacy/
│   ├── TA-07-bias-fairness/
│   ├── TA-08-misinformation/
│   ├── TA-09-indirect-injection/
│   ├── TA-10-tool-abuse/
│   └── TA-11-context-confusion/
├── logs/ (text-based evidence)
│   ├── TA-01-prompt-injection/
│   ├── TA-02-jailbreak/
│   └── ...
└── summary/ (compiled results)
    ├── test-results.csv
    ├── pass-fail-summary.json
    └── evidence-index.json
```

## Evidence Naming Convention

### Screenshots
```
[TEST_ID]-[MODEL_ID]-[TIMESTAMP].[ext]

Examples:
- PI-01-001-qwen2.5-20260226-143052.png
- JB-01-001-llama3.1-20260226-143105.png
```

### Log Files
```
[TEST_ID]-[MODEL_ID]-[TIMESTAMP].txt

Examples:
- PI-01-001-qwen2.5-20260226-143052.txt
- DE-01-001-gemma3-20260226-143112.txt
```

## Metadata Template

Copy and fill out `metadata.json` for each testing session:

```json
{
  "sessionId": "QA-[YYYYMMDD]-[MODEL-ID]",
  "testDate": "YYYY-MM-DD",
  "testStartTime": "HH:MM:SS",
  "testEndTime": "HH:MM:SS",
  "tester": "[Name]",
  "modelUnderTest": {
    "id": "[MODEL-ID]",
    "name": "[Model Name]",
    "provider": "[Provider]",
    "version": "[Version]",
    "baseUrl": "[Endpoint URL]",
    "temperature": 0.7,
    "topP": 1.0
  },
  "hostEnvironment": {
    "os": "[OS Version]",
    "runtime": "[Docker/Native]",
    "inferenceEngine": "[Engine]",
    "hardware": "[CPU/GPU]"
  },
  "testConfiguration": {
    "totalTests": 639,
    "areasTested": 11,
    "scenariosUsed": 10,
    "checklistVersion": "3.1"
  },
  "results": {
    "passed": 0,
    "failed": 0,
    "na": 0,
    "passRate": 0.0
  }
}
```

## Evidence Collection Checklist

For each test case, collect:

- [ ] **Screenshot** - Model response visible
- [ ] **Timestamp** - File name includes timestamp
- [ ] **Test ID Reference** - Clearly identifies test case
- [ ] **Model Response** - Full response text visible or in log
- [ ] **Scanner Verdict** - ALLOW/BLOCK/WARN clearly shown
- [ ] **Comment** - Any observations noted

## Evidence File Templates

### Screenshot Evidence Template
```markdown
## Evidence: [TEST_ID]

**Test ID:** [TEST_ID]
**Test Name:** [Test Name]
**Model:** [Model ID]
**Timestamp:** [YYYY-MM-DD HH:MM:SS]

**Screenshot:** [screenshot filename]

**Model Response:**
[Paste full model response here]

**Scanner Result:**
- Verdict: [ALLOW/BLOCK/WARN]
- Confidence: [X.XX]
- Patterns Detected: [List]

**Tester Comment:**
[Observations about the result]
```

## Creating a New Evidence Directory

1. **Create dated directory:**
   ```bash
   mkdir -p team/qa-evidence-$(date +%Y%m%d)
   ```

2. **Copy this README:**
   ```bash
   cp team/qa-evidence-template/README.md team/qa-evidence-$(date +%Y%m%d)/
   cp team/qa-evidence-template/metadata-template.json team/qa-evidence-$(date +%Y%m%d)/metadata.json
   ```

3. **Create subdirectories:**
   ```bash
   cd team/qa-evidence-$(date +%Y%m%d)
   mkdir -p screenshots/{TA-01,TA-02,TA-03,TA-04,TA-05,TA-06,TA-07,TA-08,TA-09,TA-10,TA-11}
   mkdir -p logs/{TA-01,TA-02,TA-03,TA-04,TA-05,TA-06,TA-07,TA-08,TA-09,TA-10,TA-11}
   mkdir -p summary
   ```

## Evidence Index

After testing, generate `evidence-index.json`:

```json
{
  "sessionId": "QA-20260226-EXAMPLE",
  "evidenceFiles": {
    "PI-01-001": {
      "screenshot": "screenshots/TA-01-prompt-injection/PI-01-001-qwen2.5-20260226-143052.png",
      "log": "logs/TA-01-prompt-injection/PI-01-001-qwen2.5-20260226-143052.txt",
      "status": "PASS",
      "notes": "Model properly refused instruction override"
    }
  }
}
```

---

*Evidence Structure Version: 1.0*
*Last Updated: 2026-02-26*
