# DojoLM Validation Testing Report

**Report ID:** fbca6edd-0599-47a8-b515-22ee370aacc7
**Run ID:** d792677d-ffa4-4399-a04c-08cb3c5ff557
**Generated:** 2026-03-28T00:43:48.922Z
**Corpus Version:** katana-evidence-20260328
**Tool Version:** 1.0.0
**Overall Verdict:** PASS
**Non-Conformities:** 0

## Executive Summary

- **Modules Validated:** 29
- **Passed:** 29
- **Failed:** 0
- **Overall:** PASS

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

**Verdict:** PASS
**Calibration Certificate:** cal-557d259a-f937-4d9c-8ae3-7c0da70ff1cc

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 1559 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 3082 |

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
| accuracy | 100.00% | [99.88%, 100.00%] | [99.88%, 100.00%] | ±0.12% |
| precision | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| recall | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### enhanced-pi (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-bf4c5362-4466-406e-a13b-94d38333dedc

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 784 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 2307 |

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
| accuracy | 100.00% | [99.83%, 100.00%] | [99.84%, 100.00%] | ±0.17% |
| precision | 100.00% | [99.51%, 100.00%] | [99.53%, 100.00%] | ±0.49% |
| recall | 100.00% | [99.51%, 100.00%] | [99.53%, 100.00%] | ±0.49% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 0.49%] | [0.00%, 0.47%] | ±0.49% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### pii-detector (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-38fb8898-1c68-44ea-af4d-fe901c9ee685

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

### ssrf-detector (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-8af7e8cd-4b67-4e3e-92bb-7ab1f8259b44

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
**Calibration Certificate:** cal-002f7c2b-10f7-4625-8c74-b9aaa65b37d6

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
**Calibration Certificate:** cal-0673fef2-e9e5-41e4-b2b5-6312192b71d9

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

**Verdict:** PASS
**Calibration Certificate:** cal-699a7bbf-f37a-4a6e-ad20-43747c48292c

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 259 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1782 |

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
| accuracy | 100.00% | [99.78%, 100.00%] | [99.79%, 100.00%] | ±0.22% |
| precision | 100.00% | [98.54%, 100.00%] | [98.59%, 100.00%] | ±1.46% |
| recall | 100.00% | [98.54%, 100.00%] | [98.59%, 100.00%] | ±1.46% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 1.46%] | [0.00%, 1.41%] | ±1.46% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### mcp-parser (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-45f3148d-3e94-45cf-ac82-cada57c9615e

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

**Verdict:** PASS
**Calibration Certificate:** cal-52f4e683-11ba-4c02-a81b-04b2a1e990ab

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

### token-analyzer (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-37dd3592-c8b5-406a-8c7e-4a890fd081d6

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
**Calibration Certificate:** cal-99d2ddc2-f8fd-46e4-a44f-4b32ffbd3c76

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
**Calibration Certificate:** cal-acb50809-0ae2-4258-aa31-88ac43359ad1

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
**Calibration Certificate:** cal-c7d8b1e0-f2b5-4fef-a8b9-22b3581242bb

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
**Calibration Certificate:** cal-68cfcc8f-a853-470b-b0d2-77dfb2b478b1

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

**Verdict:** PASS
**Calibration Certificate:** cal-12ce1a8a-f209-4ab6-a165-7330410b6a81

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

### model-theft-detector (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-479222de-7cca-4a51-9432-6713a763702d

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
**Calibration Certificate:** cal-ddf3af86-05ab-4a0c-990c-d709d793a0d8

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
**Calibration Certificate:** cal-7baa6b9f-756b-4904-801f-2372d837385e

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
**Calibration Certificate:** cal-ae973c1d-c69a-472f-9fa1-d8cbaf65da13

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
**Calibration Certificate:** cal-60d5c6d0-8082-4960-b8c3-e7ad7c68dbd2

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
**Calibration Certificate:** cal-469798c9-2107-4629-86b2-60b2ad5f880b

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
**Calibration Certificate:** cal-ecb9b913-0a37-4704-a25b-403ec91f286a

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
**Calibration Certificate:** cal-10d4c0a3-4aaa-4cdd-8d3e-a84e54c4ad1a

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
**Calibration Certificate:** cal-5da06000-8c6d-4b97-8161-0624fb0929d6

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

**Verdict:** PASS
**Calibration Certificate:** cal-7b767c31-7f80-44db-b402-741358a999b6

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

### bias-detector (Tier 2)

**Verdict:** PASS
**Calibration Certificate:** cal-47c3cdc4-ff6d-4494-9da4-2e55bd789803

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

### deepfake-detector (Tier 2)

**Verdict:** PASS
**Calibration Certificate:** cal-6082a0ab-0af4-4217-a28d-0cf3be9810cd

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
**Calibration Certificate:** cal-49fe3fe6-de50-4852-b03d-eef6010bd762

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
**Calibration Certificate:** cal-774f7ad8-0b9f-45aa-807c-baec0794e485

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

## Digital Signature

**Algorithm:** Ed25519
**Signature:** `e6ffa5d76187f1040bf866b8551ddbd16665477f08bee17da579da1910bdd4acc3229d318680bc64a1357b58d8cc1eaeea2d51bd1fd0c2770197da4b6a4f0d05`

---

*Report generated by KATANA Validation Framework — ISO/IEC 17025:2017*
