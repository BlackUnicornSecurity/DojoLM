# DojoLM Validation Testing Report

**Report ID:** 9bb7df6a-ca68-43ec-9523-1d26e4df7d81
**Run ID:** c86adad9-8a0e-4db2-95ce-f1f9fc74b741
**Generated:** 2026-03-28T13:35:50.052Z
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
| Git Hash | 6fb15afdc98b766c3dc794227b73d9ba8f26a5a8 |
| Git Dirty | true |
| Timezone | Europe/Madrid |

## Per-Module Results

### core-patterns (Tier 1)

**Verdict:** PASS
**Calibration Certificate:** cal-a67cc514-138d-421d-ad14-2e3bf6110a05

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
**Calibration Certificate:** cal-a3abbc02-3c0d-4e21-b654-ad47972e6736

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
**Calibration Certificate:** cal-a7e9317b-7382-4754-ae13-80c2c83107ea

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
**Calibration Certificate:** cal-a9e4694a-2b2c-4ea4-b612-fd1999e7ae63

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
**Calibration Certificate:** cal-5666e022-823c-4b8f-b5b9-5b471bbb40dc

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
**Calibration Certificate:** cal-917b35bd-7609-40af-b42f-d4892d046de5

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
**Calibration Certificate:** cal-5fff024c-cfeb-41a4-bef3-0889b944bbbe

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
**Calibration Certificate:** cal-17a8eecd-1f2c-466e-9c16-b0385ad25291

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
**Calibration Certificate:** cal-612c580f-0a36-4154-bda2-688839f3c6a6

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
**Calibration Certificate:** cal-066e728d-7645-4d73-be69-98309789c552

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
**Calibration Certificate:** cal-f7f5fe22-8980-4c92-aa24-53533dc3de17

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
**Calibration Certificate:** cal-014949f8-4998-432d-8f40-8978f43a6263

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
**Calibration Certificate:** cal-0b69cc1d-8536-4988-ae65-79a7a625a879

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
**Calibration Certificate:** cal-7d85f018-b6e8-4bca-971a-899df3190850

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
**Calibration Certificate:** cal-9ec6f03a-4bcb-42e0-8285-d9059e6f4c03

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
**Calibration Certificate:** cal-151c6a97-4ddc-413b-8d89-bacf38e9e373

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
**Calibration Certificate:** cal-8f6077dc-daa4-44ae-ab93-e7d163e852c6

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
**Calibration Certificate:** cal-089235a4-d357-4bcd-bc61-b90a46115eba

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
**Calibration Certificate:** cal-23348d5e-0eb3-47d5-a5a4-3959769b7505

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
**Calibration Certificate:** cal-e72550d5-21a1-4416-94b0-3c1d4a9d88a1

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
**Calibration Certificate:** cal-8a1c8b73-72c0-48a4-bc62-14a12c5ab616

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
**Calibration Certificate:** cal-a85527b9-fed7-4881-9ae1-dcb7eebfde27

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
**Calibration Certificate:** cal-164963cf-e531-4c87-899b-1ebcdf57085f

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
**Calibration Certificate:** cal-043f9310-35f0-4787-b74d-c2f6072348a7

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
**Calibration Certificate:** cal-26b363d3-fb0c-495a-9faf-1db4864b91e4

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
**Calibration Certificate:** cal-dce87aba-afe7-4565-a4de-b3a84c86b45f

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
**Calibration Certificate:** cal-8b48c8e6-92f5-4ee4-aa62-92cec13f12aa

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
**Calibration Certificate:** cal-7d4cf151-20f8-47b1-8d52-23cf8cbacd43

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
**Calibration Certificate:** cal-65edb147-719a-4f7d-b727-338640cb0000

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
**Signature:** `4150fd2d2c04bc9ab5ba5ad197fd6396ddda28a1ef38e96498a18569027a2ea9861abc19fc2a4fd99f0181b686ff5954c9b261ce185684cc6d3d747f81356a00`

---

*Report generated by KATANA Validation Framework — ISO/IEC 17025:2017*
