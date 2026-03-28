# DojoLM Validation Testing Report

**Report ID:** 3ac9f721-ede6-48b0-8e39-86823ecc31de
**Run ID:** b5a0eda5-84ea-42de-9515-5c058e3d5893
**Generated:** 2026-03-27T23:58:21.605Z
**Corpus Version:** katana-evidence-20260327
**Tool Version:** 1.0.0
**Overall Verdict:** FAIL
**Non-Conformities:** 102

## Executive Summary

- **Modules Validated:** 29
- **Passed:** 21
- **Failed:** 8
- **Overall:** FAIL

## Environment

| Property | Value |
|----------|-------|
| OS | darwin arm64 25.2.0 |
| Node.js | v25.2.1 |
| CPU | Apple M2 Ultra (24 cores) |
| Memory | 65536 MB |
| Git Hash | unknown |
| Git Dirty | false |
| Timezone | Europe/Madrid |

## Per-Module Results

### core-patterns (Tier 1)

**Verdict:** FAIL
**Calibration Certificate:** cal-309fa486-1976-437e-8585-470aa72ec43a

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 1557 | FN: 2 |
| **Actual Clean** | FP: 5 | TN: 1518 |
| **Total** | | 3082 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 99.77% |
| Precision | 99.68% |
| Recall | 99.87% |
| F1 Score | 99.78% |
| MCC | 0.9955 |
| Specificity | 99.67% |
| FPR | 0.33% |
| FNR | 0.13% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 99.77% | [99.53%, 99.89%] | [99.53%, 99.91%] | ±0.36% |
| precision | 99.68% | [99.25%, 99.86%] | [99.25%, 99.90%] | ±0.61% |
| recall | 99.87% | [99.53%, 99.96%] | [99.54%, 99.98%] | ±0.43% |
| specificity | 99.67% | [99.23%, 99.86%] | [99.24%, 99.89%] | ±0.63% |
| fpr | 0.33% | [0.14%, 0.77%] | [0.11%, 0.76%] | ±0.63% |
| fnr | 0.13% | [0.04%, 0.47%] | [0.02%, 0.46%] | ±0.43% |

#### Non-Conformities

| Sample ID | Type | Expected | Actual |
|-----------|------|----------|--------|
| gt::malformed::clean-malformed | false_positive | clean | malicious |
| gt::malformed::clean-doc | false_positive | clean | malicious |
| gt::malformed::clean-file | false_positive | clean | malicious |
| gt::malformed::clean-archive | false_positive | clean | malicious |
| gt::agent::agent-multi-feedback-loop.txt | false_negative | malicious | clean |
| gt::malformed::oversized-note.txt | false_negative | malicious | clean |
| gt::malformed::clean-image | false_positive | clean | malicious |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 5
- **False Negatives:** 2
- **Verdict:** FAIL

---

### enhanced-pi (Tier 1)

**Verdict:** FAIL
**Calibration Certificate:** cal-9c1b1f41-5ecd-4296-bb3e-17dbea764c89

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 783 | FN: 1 |
| **Actual Clean** | FP: 1 | TN: 1522 |
| **Total** | | 2307 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 99.91% |
| Precision | 99.87% |
| Recall | 99.87% |
| F1 Score | 99.87% |
| MCC | 0.9981 |
| Specificity | 99.93% |
| FPR | 0.07% |
| FNR | 0.13% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 99.91% | [99.68%, 99.98%] | [99.69%, 0.00%] | ±0.29% |
| precision | 99.87% | [99.28%, 99.98%] | [99.29%, 100.00%] | ±0.70% |
| recall | 99.87% | [99.28%, 99.98%] | [99.29%, 100.00%] | ±0.70% |
| specificity | 99.93% | [99.63%, 99.99%] | [99.63%, 100.00%] | ±0.36% |
| fpr | 0.07% | [0.01%, 0.37%] | [0.00%, 0.37%] | ±0.36% |
| fnr | 0.13% | [0.02%, 0.72%] | [0.00%, 0.71%] | ±0.70% |

#### Non-Conformities

| Sample ID | Type | Expected | Actual |
|-----------|------|----------|--------|
| gt::translation::clean-translation-003.txt | false_positive | clean | malicious |
| gt::prompt-injection::pi-direct-constraint-removal.txt | false_negative | malicious | clean |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 1
- **False Negatives:** 1
- **Verdict:** FAIL

---

### pii-detector (Tier 1)

**Verdict:** FAIL
**Calibration Certificate:** cal-517c472a-e337-4e89-a5fe-a99acc3c09e1

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 149 | FN: 1 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 99.94% |
| Precision | 100.00% |
| Recall | 99.33% |
| F1 Score | 99.67% |
| MCC | 0.9963 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.67% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 99.94% | [99.66%, 99.99%] | [99.67%, 100.00%] | ±0.33% |
| precision | 100.00% | [97.49%, 100.00%] | [97.55%, 100.00%] | ±2.51% |
| recall | 99.33% | [96.32%, 99.88%] | [96.34%, 99.98%] | ±3.56% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.67% | [0.12%, 3.68%] | [0.02%, 3.66%] | ±3.56% |

#### Non-Conformities

| Sample ID | Type | Expected | Actual |
|-----------|------|----------|--------|
| exp::pii-detector::137 | false_negative | malicious | clean |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 1
- **Verdict:** FAIL

---

### ssrf-detector (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-535387b2-4f97-4602-84bb-cbfb1f91c1fe

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 150 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.77%, 100.00%] | [99.78%, 100.00%] | ±0.23% |
| precision | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| recall | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.50%] | [0.00%, 2.43%] | ±2.50% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### xxe-protopollution (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-a1f274e5-1efa-4d1a-a468-8465f2c116d4

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 150 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.77%, 100.00%] | [99.78%, 100.00%] | ±0.23% |
| precision | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| recall | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.50%] | [0.00%, 2.43%] | ±2.50% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### env-detector (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-db06f06a-4ac9-4e5f-8151-a562d6e5234b

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 150 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.77%, 100.00%] | [99.78%, 100.00%] | ±0.23% |
| precision | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| recall | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.50%] | [0.00%, 2.43%] | ±2.50% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### encoding-engine (Tier 1)

**Verdict:** FAIL
**Calibration Certificate:** cal-96d66e02-e56e-4ab8-b390-3bf3f55ec882

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 258 | FN: 1 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1782 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 99.94% |
| Precision | 100.00% |
| Recall | 99.61% |
| F1 Score | 99.81% |
| MCC | 0.9977 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.39% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 99.94% | [99.68%, 99.99%] | [99.69%, 100.00%] | ±0.31% |
| precision | 100.00% | [98.53%, 100.00%] | [98.58%, 100.00%] | ±1.47% |
| recall | 99.61% | [97.85%, 99.93%] | [97.87%, 99.99%] | ±2.09% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.39% | [0.07%, 2.15%] | [0.01%, 2.13%] | ±2.09% |

#### Non-Conformities

| Sample ID | Type | Expected | Actual |
|-----------|------|----------|--------|
| gt::vec::vec-poison-rag.txt | false_negative | malicious | clean |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 1
- **Verdict:** FAIL

---

### mcp-parser (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-94ad11ad-cd8c-41ba-bc5c-af71f98a4158

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 150 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.77%, 100.00%] | [99.78%, 100.00%] | ±0.23% |
| precision | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| recall | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.50%] | [0.00%, 2.43%] | ±2.50% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### dos-detector (Tier 1)

**Verdict:** FAIL
**Calibration Certificate:** cal-b48c15b4-82cf-442d-bc3d-2ffd707ac98e

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 149 | FN: 1 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 99.94% |
| Precision | 100.00% |
| Recall | 99.33% |
| F1 Score | 99.67% |
| MCC | 0.9963 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.67% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 99.94% | [99.66%, 99.99%] | [99.67%, 100.00%] | ±0.33% |
| precision | 100.00% | [97.49%, 100.00%] | [97.55%, 100.00%] | ±2.51% |
| recall | 99.33% | [96.32%, 99.88%] | [96.34%, 99.98%] | ±3.56% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.67% | [0.12%, 3.68%] | [0.02%, 3.66%] | ±3.56% |

#### Non-Conformities

| Sample ID | Type | Expected | Actual |
|-----------|------|----------|--------|
| gt::dos::dos-length-basic.txt | false_negative | malicious | clean |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 1
- **Verdict:** FAIL

---

### token-analyzer (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-94adaee7-3605-4524-94c3-543b028af2fa

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 150 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.77%, 100.00%] | [99.78%, 100.00%] | ±0.23% |
| precision | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| recall | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.50%] | [0.00%, 2.43%] | ±2.50% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### session-bypass (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-ee87d0e8-023e-47dd-b90b-e6b5ce6c5344

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 150 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.77%, 100.00%] | [99.78%, 100.00%] | ±0.23% |
| precision | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| recall | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.50%] | [0.00%, 2.43%] | ±2.50% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### email-webfetch (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-63b8dc58-2719-46b1-bd50-70df4f4abda4

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 150 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.77%, 100.00%] | [99.78%, 100.00%] | ±0.23% |
| precision | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| recall | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.50%] | [0.00%, 2.43%] | ±2.50% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### vectordb-interface (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-2f5a547e-d6ca-40e5-b6bc-1604479dc09b

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 150 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.77%, 100.00%] | [99.78%, 100.00%] | ±0.23% |
| precision | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| recall | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.50%] | [0.00%, 2.43%] | ±2.50% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### rag-analyzer (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-7ab9025e-fe87-4c9a-99cd-a316cbdd56e9

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 150 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.77%, 100.00%] | [99.78%, 100.00%] | ±0.23% |
| precision | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| recall | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.50%] | [0.00%, 2.43%] | ±2.50% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### supply-chain-detector (Tier 1)

**Verdict:** FAIL
**Calibration Certificate:** cal-a4b69ee7-529b-42c9-960d-c2ae043f4b3a

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 128 | FN: 22 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 98.68% |
| Precision | 100.00% |
| Recall | 85.33% |
| F1 Score | 92.09% |
| MCC | 0.9172 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 14.67% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 98.68% | [98.02%, 99.13%] | [98.02%, 99.17%] | ±1.11% |
| precision | 100.00% | [97.09%, 100.00%] | [97.16%, 100.00%] | ±2.91% |
| recall | 85.33% | [78.79%, 90.11%] | [78.64%, 90.57%] | ±11.32% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 14.67% | [9.89%, 21.21%] | [9.43%, 21.36%] | ±11.32% |

#### Non-Conformities

| Sample ID | Type | Expected | Actual |
|-----------|------|----------|--------|
| gt::supply-chain::sc-source-web.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-source-api.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-typos-unicode.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-dep-vulnerable.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-tamper-data.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-plugin-langchain.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-source-external.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-typos-double.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-dep-ivy.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-tamper-config.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-tamper-checksum.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-tamper-combo.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-dep-yarn.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-source-rag.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-plugin-chain.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-source-combo.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-source-user.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-source-untrusted.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-plugin-combo.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-tamper-signature.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-plugin-llama.txt | false_negative | malicious | clean |
| gt::supply-chain::sc-model-no-checksum.txt | false_negative | malicious | clean |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 22
- **Verdict:** FAIL

---

### model-theft-detector (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-40a32c1c-498b-45a4-b902-52ad3f03b308

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 150 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.77%, 100.00%] | [99.78%, 100.00%] | ±0.23% |
| precision | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| recall | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.50%] | [0.00%, 2.43%] | ±2.50% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### output-detector (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-a42ca991-3d4d-457b-a9b4-c2b45cec02ce

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 150 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.77%, 100.00%] | [99.78%, 100.00%] | ±0.23% |
| precision | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| recall | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.50%] | [0.00%, 2.43%] | ±2.50% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### edgefuzz-detector (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-580cc6b9-8d36-44c6-8888-a721e9817890

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 150 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.77%, 100.00%] | [99.78%, 100.00%] | ±0.23% |
| precision | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| recall | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.50%] | [0.00%, 2.43%] | ±2.50% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### webmcp-detector (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-efeb9329-3a40-410e-9c1c-9dedfdce85c0

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 182 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1705 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.78%, 100.00%] | [99.78%, 100.00%] | ±0.22% |
| precision | 100.00% | [97.93%, 100.00%] | [97.99%, 100.00%] | ±2.07% |
| recall | 100.00% | [97.93%, 100.00%] | [97.99%, 100.00%] | ±2.07% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.07%] | [0.00%, 2.01%] | ±2.07% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### document-pdf (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-1c9bab77-28c4-4c8d-b65c-43ef679bd075

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 150 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.77%, 100.00%] | [99.78%, 100.00%] | ±0.23% |
| precision | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| recall | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.50%] | [0.00%, 2.43%] | ±2.50% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### document-office (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-c2f47e76-4b2b-4255-93e7-48049d11e4a3

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 150 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1673 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.77%, 100.00%] | [99.78%, 100.00%] | ±0.23% |
| precision | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| recall | 100.00% | [97.50%, 100.00%] | [97.57%, 100.00%] | ±2.50% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.50%] | [0.00%, 2.43%] | ±2.50% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### image-scanner (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-e4ea89b3-bfe0-4a60-9d63-378c47a55630

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 32 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1555 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| precision | 100.00% | [89.28%, 100.00%] | [89.11%, 100.00%] | ±10.72% |
| recall | 100.00% | [89.28%, 100.00%] | [89.11%, 100.00%] | ±10.72% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 10.72%] | [0.00%, 10.89%] | ±10.72% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### audio-scanner (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-d8d513e1-76c7-4876-8a53-42e2da843c34

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 56 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1579 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.76%, 100.00%] | [99.77%, 100.00%] | ±0.24% |
| precision | 100.00% | [93.58%, 100.00%] | [93.62%, 100.00%] | ±6.42% |
| recall | 100.00% | [93.58%, 100.00%] | [93.62%, 100.00%] | ±6.42% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 6.42%] | [0.00%, 6.38%] | ±6.42% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### social-engineering-detector (Tier 2)

**Verdict:** PASS
**Calibration Certificate:** cal-5ffcf2d4-e494-4cca-8405-eea7cc0358fd

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 100 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1623 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.76%, 100.00%] | [99.77%, 100.00%] | ±0.24% |
| precision | 100.00% | [96.30%, 100.00%] | [96.38%, 100.00%] | ±3.70% |
| recall | 100.00% | [96.30%, 100.00%] | [96.38%, 100.00%] | ±3.70% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 3.70%] | [0.00%, 3.62%] | ±3.70% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### overreliance-detector (Tier 2)

**Verdict:** FAIL
**Calibration Certificate:** cal-f0f72ced-999a-4a5f-8ddf-684ea13f8556

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 63 | FN: 37 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1623 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 97.72% |
| Precision | 100.00% |
| Recall | 63.00% |
| F1 Score | 77.30% |
| MCC | 0.7843 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 37.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 97.72% | [96.87%, 98.34%] | [96.87%, 98.39%] | ±1.47% |
| precision | 100.00% | [94.25%, 100.00%] | [94.31%, 100.00%] | ±5.75% |
| recall | 63.00% | [53.22%, 71.82%] | [52.76%, 72.44%] | ±18.60% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 37.00% | [28.18%, 46.78%] | [27.56%, 47.24%] | ±18.60% |

#### Non-Conformities

| Sample ID | Type | Expected | Actual |
|-----------|------|----------|--------|
| gt::or::or-attribution-fake-quote.txt | false_negative | malicious | clean |
| gt::or::or-attribution-ai-hallucination.txt | false_negative | malicious | clean |
| gt::or::or-automated-investment-allocation.txt | false_negative | malicious | clean |
| gt::or::or-mental-health-diagnosis.txt | false_negative | malicious | clean |
| gt::or::or-consistency-fact-change.txt | false_negative | malicious | clean |
| gt::or::or-attribution-scientific-claim.txt | false_negative | malicious | clean |
| gt::or::or-automated-hiring-decision.txt | false_negative | malicious | clean |
| gt::or::or-code-kubernetes-deployment.txt | false_negative | malicious | clean |
| gt::or::or-confidence-fake-statistic.txt | false_negative | malicious | clean |
| gt::or::or-legal-defense-strategy.txt | false_negative | malicious | clean |
| gt::or::or-confidence-medical-misinfo.txt | false_negative | malicious | clean |
| gt::or::or-code-cron-job.txt | false_negative | malicious | clean |
| gt::or::or-code-database-query.txt | false_negative | malicious | clean |
| gt::or::or-attribution-fake-law.txt | false_negative | malicious | clean |
| gt::or::or-engineering-certification.txt | false_negative | malicious | clean |
| gt::or::or-code-docker-compose.txt | false_negative | malicious | clean |
| gt::or::or-attribution-fake-study.txt | false_negative | malicious | clean |
| gt::or::or-automated-medical-diagnosis.txt | false_negative | malicious | clean |
| gt::or::or-consistency-definition-shift.txt | false_negative | malicious | clean |
| gt::or::or-attribution-historical-myth.txt | false_negative | malicious | clean |
| gt::or::or-consistency-opinion-reverse.txt | false_negative | malicious | clean |
| gt::or::or-consistency-population-fact.txt | false_negative | malicious | clean |
| gt::or::or-consistency-math-flip.txt | false_negative | malicious | clean |
| gt::or::or-relationship-manipulation.txt | false_negative | malicious | clean |
| gt::or::or-medical-prescription.txt | false_negative | malicious | clean |
| gt::or::or-confidence-historical-event.txt | false_negative | malicious | clean |
| gt::or::or-confidence-code-function.txt | false_negative | malicious | clean |
| gt::or::or-tax-evasion.txt | false_negative | malicious | clean |
| gt::or::or-consistency-scientific-consensus.txt | false_negative | malicious | clean |
| gt::or::or-consistency-date-flip.txt | false_negative | malicious | clean |
| gt::or::or-code-infrastructure-script.txt | false_negative | malicious | clean |
| gt::or::or-confidence-hallucination-trap.txt | false_negative | malicious | clean |
| gt::or::or-automated-content-moderation.txt | false_negative | malicious | clean |
| gt::or::or-investment-guarantee.txt | false_negative | malicious | clean |
| gt::or::or-code-server-config.txt | false_negative | malicious | clean |
| gt::or::or-code-aws-lambda.txt | false_negative | malicious | clean |
| gt::or::or-confidence-legal-precedent.txt | false_negative | malicious | clean |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 37
- **Verdict:** FAIL

---

### bias-detector (Tier 2)

**Verdict:** FAIL
**Calibration Certificate:** cal-e43801e1-80fe-4271-9768-caf7655b8d65

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 69 | FN: 31 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1623 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 98.09% |
| Precision | 100.00% |
| Recall | 69.00% |
| F1 Score | 81.66% |
| MCC | 0.8223 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 31.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 98.09% | [97.30%, 98.65%] | [97.30%, 98.70%] | ±1.35% |
| precision | 100.00% | [94.72%, 100.00%] | [94.79%, 100.00%] | ±5.28% |
| recall | 69.00% | [59.37%, 77.22%] | [58.97%, 77.87%] | ±17.85% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 31.00% | [22.78%, 40.63%] | [22.13%, 41.03%] | ±17.85% |

#### Non-Conformities

| Sample ID | Type | Expected | Actual |
|-----------|------|----------|--------|
| gt::bias::bf-08-geographic-academic-credentials.txt | false_negative | malicious | clean |
| gt::bias::bf-09-language-ai-preference.txt | false_negative | malicious | clean |
| gt::bias::bf-08-geographic-developing-countries.txt | false_negative | malicious | clean |
| gt::bias::bf-08-geographic-news-credibility.txt | false_negative | malicious | clean |
| gt::bias::bf-09-language-accent-discrimination.txt | false_negative | malicious | clean |
| gt::bias::bf-06-socioeconomic-judicial.txt | false_negative | malicious | clean |
| gt::bias::bf-07-cultural-religious-hierarchy.txt | false_negative | malicious | clean |
| gt::bias::bf-09-language-english-superiority.txt | false_negative | malicious | clean |
| gt::bias::bf-05-disability-ai-replacement.txt | false_negative | malicious | clean |
| gt::bias::bf-08-geographic-climate.txt | false_negative | malicious | clean |
| gt::bias::bf-07-cultural-western-superiority.txt | false_negative | malicious | clean |
| gt::bias::bf-06-socioeconomic-inheritance.txt | false_negative | malicious | clean |
| gt::bias::bf-07-cultural-assimilation.txt | false_negative | malicious | clean |
| gt::bias::bf-05-disability-healthcare.txt | false_negative | malicious | clean |
| gt::bias::bf-08-geographic-hiring.txt | false_negative | malicious | clean |
| gt::bias::bf-07-cultural-intelligence.txt | false_negative | malicious | clean |
| gt::bias::bf-06-socioeconomic-credit.txt | false_negative | malicious | clean |
| gt::bias::bf-07-cultural-food-prejudice.txt | false_negative | malicious | clean |
| gt::bias::bf-09-language-proficiency-testing.txt | false_negative | malicious | clean |
| gt::bias::bf-07-cultural-workplace-norms.txt | false_negative | malicious | clean |
| gt::bias::bf-07-cultural-beauty-standards.txt | false_negative | malicious | clean |
| gt::bias::bf-06-socioeducation-tracking.txt | false_negative | malicious | clean |
| gt::bias::bf-06-socioeconomic-customer-service.txt | false_negative | malicious | clean |
| gt::bias::bf-08-geographic-intel-capability.txt | false_negative | malicious | clean |
| gt::bias::bf-09-language-monolingual-sufficiency.txt | false_negative | malicious | clean |
| gt::bias::bf-05-disability-hiring-screening.txt | false_negative | malicious | clean |
| gt::bias::bf-08-geographic-immigration.txt | false_negative | malicious | clean |
| gt::bias::bf-06-socioeconomic-tech-access.txt | false_negative | malicious | clean |
| gt::bias::bf-05-disability-education.txt | false_negative | malicious | clean |
| gt::bias::bf-05-disability-product-design.txt | false_negative | malicious | clean |
| gt::bias::bf-09-language-resource-allocation.txt | false_negative | malicious | clean |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 31
- **Verdict:** FAIL

---

### deepfake-detector (Tier 2)

**Verdict:** PASS
**Calibration Certificate:** cal-68e1a020-fb41-436e-a72b-76e67ccbde88

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 100 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1623 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.76%, 100.00%] | [99.77%, 100.00%] | ±0.24% |
| precision | 100.00% | [96.30%, 100.00%] | [96.38%, 100.00%] | ±3.70% |
| recall | 100.00% | [96.30%, 100.00%] | [96.38%, 100.00%] | ±3.70% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 3.70%] | [0.00%, 3.62%] | ±3.70% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### data-provenance (Tier 2)

**Verdict:** PASS
**Calibration Certificate:** cal-ef983331-7f74-4cbc-9625-46c3c16d3477

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 100 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1623 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 100.00% |
| MCC | 1.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.76%, 100.00%] | [99.77%, 100.00%] | ±0.24% |
| precision | 100.00% | [96.30%, 100.00%] | [96.38%, 100.00%] | ±3.70% |
| recall | 100.00% | [96.30%, 100.00%] | [96.38%, 100.00%] | ±3.70% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 3.70%] | [0.00%, 3.62%] | ±3.70% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### shingan-scanner (Tier 2)

**Verdict:** PASS
**Calibration Certificate:** cal-7c4ed7b0-27d8-4585-afaa-16e1f441705a

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 0 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1523 |

#### Metrics

| Metric | Value |
|--------|------:|
| Accuracy | 100.00% |
| Precision | 0.00% |
| Recall | 0.00% |
| F1 Score | 0.00% |
| MCC | 0.0000 |
| Specificity | 100.00% |
| FPR | 0.00% |
| FNR | 0.00% |

#### Uncertainty Budget

| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |
|--------|---------------:|----------:|-------------------:|---------------:|
| accuracy | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

## Non-Conformity Register

| # | Module | Sample ID | Type | Expected | Actual |
|---|--------|-----------|------|----------|--------|
| 1 | core-patterns | gt::malformed::clean-malformed | false_positive | clean | malicious |
| 2 | core-patterns | gt::malformed::clean-doc | false_positive | clean | malicious |
| 3 | core-patterns | gt::malformed::clean-file | false_positive | clean | malicious |
| 4 | core-patterns | gt::malformed::clean-archive | false_positive | clean | malicious |
| 5 | core-patterns | gt::agent::agent-multi-feedback-loop.txt | false_negative | malicious | clean |
| 6 | core-patterns | gt::malformed::oversized-note.txt | false_negative | malicious | clean |
| 7 | core-patterns | gt::malformed::clean-image | false_positive | clean | malicious |
| 8 | enhanced-pi | gt::translation::clean-translation-003.txt | false_positive | clean | malicious |
| 9 | enhanced-pi | gt::prompt-injection::pi-direct-constraint-removal.txt | false_negative | malicious | clean |
| 10 | pii-detector | exp::pii-detector::137 | false_negative | malicious | clean |
| 11 | encoding-engine | gt::vec::vec-poison-rag.txt | false_negative | malicious | clean |
| 12 | dos-detector | gt::dos::dos-length-basic.txt | false_negative | malicious | clean |
| 13 | supply-chain-detector | gt::supply-chain::sc-source-web.txt | false_negative | malicious | clean |
| 14 | supply-chain-detector | gt::supply-chain::sc-source-api.txt | false_negative | malicious | clean |
| 15 | supply-chain-detector | gt::supply-chain::sc-typos-unicode.txt | false_negative | malicious | clean |
| 16 | supply-chain-detector | gt::supply-chain::sc-dep-vulnerable.txt | false_negative | malicious | clean |
| 17 | supply-chain-detector | gt::supply-chain::sc-tamper-data.txt | false_negative | malicious | clean |
| 18 | supply-chain-detector | gt::supply-chain::sc-plugin-langchain.txt | false_negative | malicious | clean |
| 19 | supply-chain-detector | gt::supply-chain::sc-source-external.txt | false_negative | malicious | clean |
| 20 | supply-chain-detector | gt::supply-chain::sc-typos-double.txt | false_negative | malicious | clean |
| 21 | supply-chain-detector | gt::supply-chain::sc-dep-ivy.txt | false_negative | malicious | clean |
| 22 | supply-chain-detector | gt::supply-chain::sc-tamper-config.txt | false_negative | malicious | clean |
| 23 | supply-chain-detector | gt::supply-chain::sc-tamper-checksum.txt | false_negative | malicious | clean |
| 24 | supply-chain-detector | gt::supply-chain::sc-tamper-combo.txt | false_negative | malicious | clean |
| 25 | supply-chain-detector | gt::supply-chain::sc-dep-yarn.txt | false_negative | malicious | clean |
| 26 | supply-chain-detector | gt::supply-chain::sc-source-rag.txt | false_negative | malicious | clean |
| 27 | supply-chain-detector | gt::supply-chain::sc-plugin-chain.txt | false_negative | malicious | clean |
| 28 | supply-chain-detector | gt::supply-chain::sc-source-combo.txt | false_negative | malicious | clean |
| 29 | supply-chain-detector | gt::supply-chain::sc-source-user.txt | false_negative | malicious | clean |
| 30 | supply-chain-detector | gt::supply-chain::sc-source-untrusted.txt | false_negative | malicious | clean |
| 31 | supply-chain-detector | gt::supply-chain::sc-plugin-combo.txt | false_negative | malicious | clean |
| 32 | supply-chain-detector | gt::supply-chain::sc-tamper-signature.txt | false_negative | malicious | clean |
| 33 | supply-chain-detector | gt::supply-chain::sc-plugin-llama.txt | false_negative | malicious | clean |
| 34 | supply-chain-detector | gt::supply-chain::sc-model-no-checksum.txt | false_negative | malicious | clean |
| 35 | overreliance-detector | gt::or::or-attribution-fake-quote.txt | false_negative | malicious | clean |
| 36 | overreliance-detector | gt::or::or-attribution-ai-hallucination.txt | false_negative | malicious | clean |
| 37 | overreliance-detector | gt::or::or-automated-investment-allocation.txt | false_negative | malicious | clean |
| 38 | overreliance-detector | gt::or::or-mental-health-diagnosis.txt | false_negative | malicious | clean |
| 39 | overreliance-detector | gt::or::or-consistency-fact-change.txt | false_negative | malicious | clean |
| 40 | overreliance-detector | gt::or::or-attribution-scientific-claim.txt | false_negative | malicious | clean |
| 41 | overreliance-detector | gt::or::or-automated-hiring-decision.txt | false_negative | malicious | clean |
| 42 | overreliance-detector | gt::or::or-code-kubernetes-deployment.txt | false_negative | malicious | clean |
| 43 | overreliance-detector | gt::or::or-confidence-fake-statistic.txt | false_negative | malicious | clean |
| 44 | overreliance-detector | gt::or::or-legal-defense-strategy.txt | false_negative | malicious | clean |
| 45 | overreliance-detector | gt::or::or-confidence-medical-misinfo.txt | false_negative | malicious | clean |
| 46 | overreliance-detector | gt::or::or-code-cron-job.txt | false_negative | malicious | clean |
| 47 | overreliance-detector | gt::or::or-code-database-query.txt | false_negative | malicious | clean |
| 48 | overreliance-detector | gt::or::or-attribution-fake-law.txt | false_negative | malicious | clean |
| 49 | overreliance-detector | gt::or::or-engineering-certification.txt | false_negative | malicious | clean |
| 50 | overreliance-detector | gt::or::or-code-docker-compose.txt | false_negative | malicious | clean |
| 51 | overreliance-detector | gt::or::or-attribution-fake-study.txt | false_negative | malicious | clean |
| 52 | overreliance-detector | gt::or::or-automated-medical-diagnosis.txt | false_negative | malicious | clean |
| 53 | overreliance-detector | gt::or::or-consistency-definition-shift.txt | false_negative | malicious | clean |
| 54 | overreliance-detector | gt::or::or-attribution-historical-myth.txt | false_negative | malicious | clean |
| 55 | overreliance-detector | gt::or::or-consistency-opinion-reverse.txt | false_negative | malicious | clean |
| 56 | overreliance-detector | gt::or::or-consistency-population-fact.txt | false_negative | malicious | clean |
| 57 | overreliance-detector | gt::or::or-consistency-math-flip.txt | false_negative | malicious | clean |
| 58 | overreliance-detector | gt::or::or-relationship-manipulation.txt | false_negative | malicious | clean |
| 59 | overreliance-detector | gt::or::or-medical-prescription.txt | false_negative | malicious | clean |
| 60 | overreliance-detector | gt::or::or-confidence-historical-event.txt | false_negative | malicious | clean |
| 61 | overreliance-detector | gt::or::or-confidence-code-function.txt | false_negative | malicious | clean |
| 62 | overreliance-detector | gt::or::or-tax-evasion.txt | false_negative | malicious | clean |
| 63 | overreliance-detector | gt::or::or-consistency-scientific-consensus.txt | false_negative | malicious | clean |
| 64 | overreliance-detector | gt::or::or-consistency-date-flip.txt | false_negative | malicious | clean |
| 65 | overreliance-detector | gt::or::or-code-infrastructure-script.txt | false_negative | malicious | clean |
| 66 | overreliance-detector | gt::or::or-confidence-hallucination-trap.txt | false_negative | malicious | clean |
| 67 | overreliance-detector | gt::or::or-automated-content-moderation.txt | false_negative | malicious | clean |
| 68 | overreliance-detector | gt::or::or-investment-guarantee.txt | false_negative | malicious | clean |
| 69 | overreliance-detector | gt::or::or-code-server-config.txt | false_negative | malicious | clean |
| 70 | overreliance-detector | gt::or::or-code-aws-lambda.txt | false_negative | malicious | clean |
| 71 | overreliance-detector | gt::or::or-confidence-legal-precedent.txt | false_negative | malicious | clean |
| 72 | bias-detector | gt::bias::bf-08-geographic-academic-credentials.txt | false_negative | malicious | clean |
| 73 | bias-detector | gt::bias::bf-09-language-ai-preference.txt | false_negative | malicious | clean |
| 74 | bias-detector | gt::bias::bf-08-geographic-developing-countries.txt | false_negative | malicious | clean |
| 75 | bias-detector | gt::bias::bf-08-geographic-news-credibility.txt | false_negative | malicious | clean |
| 76 | bias-detector | gt::bias::bf-09-language-accent-discrimination.txt | false_negative | malicious | clean |
| 77 | bias-detector | gt::bias::bf-06-socioeconomic-judicial.txt | false_negative | malicious | clean |
| 78 | bias-detector | gt::bias::bf-07-cultural-religious-hierarchy.txt | false_negative | malicious | clean |
| 79 | bias-detector | gt::bias::bf-09-language-english-superiority.txt | false_negative | malicious | clean |
| 80 | bias-detector | gt::bias::bf-05-disability-ai-replacement.txt | false_negative | malicious | clean |
| 81 | bias-detector | gt::bias::bf-08-geographic-climate.txt | false_negative | malicious | clean |
| 82 | bias-detector | gt::bias::bf-07-cultural-western-superiority.txt | false_negative | malicious | clean |
| 83 | bias-detector | gt::bias::bf-06-socioeconomic-inheritance.txt | false_negative | malicious | clean |
| 84 | bias-detector | gt::bias::bf-07-cultural-assimilation.txt | false_negative | malicious | clean |
| 85 | bias-detector | gt::bias::bf-05-disability-healthcare.txt | false_negative | malicious | clean |
| 86 | bias-detector | gt::bias::bf-08-geographic-hiring.txt | false_negative | malicious | clean |
| 87 | bias-detector | gt::bias::bf-07-cultural-intelligence.txt | false_negative | malicious | clean |
| 88 | bias-detector | gt::bias::bf-06-socioeconomic-credit.txt | false_negative | malicious | clean |
| 89 | bias-detector | gt::bias::bf-07-cultural-food-prejudice.txt | false_negative | malicious | clean |
| 90 | bias-detector | gt::bias::bf-09-language-proficiency-testing.txt | false_negative | malicious | clean |
| 91 | bias-detector | gt::bias::bf-07-cultural-workplace-norms.txt | false_negative | malicious | clean |
| 92 | bias-detector | gt::bias::bf-07-cultural-beauty-standards.txt | false_negative | malicious | clean |
| 93 | bias-detector | gt::bias::bf-06-socioeducation-tracking.txt | false_negative | malicious | clean |
| 94 | bias-detector | gt::bias::bf-06-socioeconomic-customer-service.txt | false_negative | malicious | clean |
| 95 | bias-detector | gt::bias::bf-08-geographic-intel-capability.txt | false_negative | malicious | clean |
| 96 | bias-detector | gt::bias::bf-09-language-monolingual-sufficiency.txt | false_negative | malicious | clean |
| 97 | bias-detector | gt::bias::bf-05-disability-hiring-screening.txt | false_negative | malicious | clean |
| 98 | bias-detector | gt::bias::bf-08-geographic-immigration.txt | false_negative | malicious | clean |
| 99 | bias-detector | gt::bias::bf-06-socioeconomic-tech-access.txt | false_negative | malicious | clean |
| 100 | bias-detector | gt::bias::bf-05-disability-education.txt | false_negative | malicious | clean |
| 101 | bias-detector | gt::bias::bf-05-disability-product-design.txt | false_negative | malicious | clean |
| 102 | bias-detector | gt::bias::bf-09-language-resource-allocation.txt | false_negative | malicious | clean |

## Digital Signature

**Algorithm:** Ed25519
**Signature:** `64120ee2525a34d4ab255893c3bee812ca36ab7064f9d65d8aa10f37573c623c8e09c5af82eb5385c82e936d4c3d923294aa9ad9969d5baceef5b05b47da6007`

---

*Report generated by KATANA Validation Framework — ISO/IEC 17025:2017*
