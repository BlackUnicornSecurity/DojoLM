# DojoLM Validation Testing Report

**Report ID:** ac88af53-2853-48a0-9393-3327cced7a69
**Run ID:** 49ac8796-09b8-4d30-8abc-449452b37e0e
**Generated:** 2026-03-28T19:01:31.586Z
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
| Git Hash | c037b5f1f007fc39898fd1700d54af08f73c8e30 |
| Git Dirty | false |
| Timezone | Europe/Madrid |

## Per-Module Results

### core-patterns (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-754cdeb7-056c-470c-a5dd-ce3dcc5afc2e

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 1731 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 3254 |

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
| accuracy | 100.00% | [99.88%, 100.00%] | [99.89%, 100.00%] | ±0.12% |
| precision | 100.00% | [99.78%, 100.00%] | [99.79%, 100.00%] | ±0.22% |
| recall | 100.00% | [99.78%, 100.00%] | [99.79%, 100.00%] | ±0.22% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 0.22%] | [0.00%, 0.21%] | ±0.22% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### enhanced-pi (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-b4bb2f27-fd9e-4704-aa31-9185e1d738ca

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 790 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 2313 |

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
| precision | 100.00% | [99.52%, 100.00%] | [99.53%, 100.00%] | ±0.48% |
| recall | 100.00% | [99.52%, 100.00%] | [99.53%, 100.00%] | ±0.48% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 0.48%] | [0.00%, 0.47%] | ±0.48% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### pii-detector (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-f2d9b497-092d-4d80-b207-08868f8db697

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
**Calibration Certificate:** cal-ee14b3a0-bf19-474c-90d7-9aed21ed9e14

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
**Calibration Certificate:** cal-7559c655-0737-441f-aa75-d4e8342617ff

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
**Calibration Certificate:** cal-73b8af97-b198-4a6c-a413-53c2fa9f45d9

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
**Calibration Certificate:** cal-0e5876a6-3290-4c07-ab1d-12cb52eee552

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
**Calibration Certificate:** cal-11ecd214-858b-4b99-8ffa-53ff51fef7f3

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
**Calibration Certificate:** cal-ccbf0186-7f03-4301-a906-3b912f1bef31

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
**Calibration Certificate:** cal-e6b76312-5ab2-4ceb-93fe-88235e4cfc3b

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
**Calibration Certificate:** cal-57c1e1cb-877a-4d7b-88e6-49b04f1385e9

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
**Calibration Certificate:** cal-d485b85f-22cb-42fe-beb4-5b5ff6f03440

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
**Calibration Certificate:** cal-c23f1f36-cc02-4978-be00-b90b5bdc3659

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
**Calibration Certificate:** cal-d7cf04fe-23e5-41f5-9321-7c7ed1679daa

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
**Calibration Certificate:** cal-2c36228d-284a-4e05-b7bb-7130868a9e0f

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
**Calibration Certificate:** cal-ec8713dd-98fa-45ff-a690-0e034d1acada

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
**Calibration Certificate:** cal-82c01e2e-3238-4804-abc7-1aa18671782b

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
**Calibration Certificate:** cal-a29fc1e4-04a9-48d1-b2cd-0b93050aa039

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
**Calibration Certificate:** cal-2859114a-1443-40c3-96c6-d4dfa5681c8b

#### Confusion Matrix

|  | Predicted Malicious | Predicted Clean |
|--|--------------------:|----------------:|
| **Actual Malicious** | TP: 187 | FN: 0 |
| **Actual Clean** | FP: 0 | TN: 1523 |
| **Total** | | 1710 |

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
| precision | 100.00% | [97.99%, 100.00%] | [98.05%, 100.00%] | ±2.01% |
| recall | 100.00% | [97.99%, 100.00%] | [98.05%, 100.00%] | ±2.01% |
| specificity | 100.00% | [99.75%, 100.00%] | [99.76%, 100.00%] | ±0.25% |
| fpr | 0.00% | [0.00%, 0.25%] | [0.00%, 0.24%] | ±0.25% |
| fnr | 0.00% | [0.00%, 2.01%] | [0.00%, 1.95%] | ±2.01% |

#### Decision Rule (ISO 7.8.6)

- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)
- **False Positives:** 0
- **False Negatives:** 0
- **Verdict:** PASS

---

### document-pdf (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-b706df35-4a24-44d0-9477-b8bf196c06ea

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
**Calibration Certificate:** cal-56fcccc4-2474-4bb7-af5c-b93e5b4b7b9c

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
**Calibration Certificate:** cal-70c8a490-9010-4af0-ba5d-570c5c0f0778

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
**Calibration Certificate:** cal-8f05a1c6-6c0a-4b17-a064-ec499e226449

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
**Calibration Certificate:** cal-de560d7c-2004-4c59-98f5-e4570aaa3d8b

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
**Calibration Certificate:** cal-23190260-5f77-42af-831a-061f7b0367a7

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
**Calibration Certificate:** cal-f8bf892d-bd21-4bd0-9980-47455b275098

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
**Calibration Certificate:** cal-42ec1644-7a8f-400f-9b40-6b1fa10e654a

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
**Calibration Certificate:** cal-b2bf1caa-ff05-423d-9463-320e4dd57ec1

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
**Calibration Certificate:** cal-e5a6958c-42d3-4136-886b-771b6df9b0a1

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
**Signature:** `5ae3ba6536d990c6263f568092577d20cfa127874d278652f76a85594c14148247670754d73163ca1f23ad5cf4810bba0410fdf73957bcf18c71206dd7c4810c`

---

*Report generated by KATANA Validation Framework — ISO/IEC 17025:2017*
