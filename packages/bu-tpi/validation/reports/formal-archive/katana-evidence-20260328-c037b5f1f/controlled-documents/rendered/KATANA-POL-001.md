# KATANA Validation Framework Threat Model

**Document ID:** KATANA-TM-001
**Generated:** 2026-03-28T19:01:31.653Z
**Schema Version:** 1.0.0

## Scope

Covers all KATANA validation framework components: corpus management, generators, validation runner, calibration, reporting, and cryptographic integrity layers.

## Threat Actors

| ID | Name | Capability | Motivation |
|-----|------|------------|------------|
| TA-01 | Accidental Developer | medium | Unintentional — coding errors, misconfigured environments, incorrect labels. |
| TA-02 | Malicious Insider | high | Financial gain, competitive pressure, or sabotage. |
| TA-03 | External Attacker (Supply Chain) | high | Undermine trust in DojoLM detection capabilities. |

## Assets

| ID | Name | C | I | A |
|-----|------|---|---|---|
| A-01 | Ground Truth Corpus | medium | high | medium |
| A-02 | Holdout Set | high | high | low |
| A-03 | Calibration Reference Sets | medium | high | medium |
| A-04 | Validation Reports & Certificates | low | high | medium |
| A-05 | Cryptographic Keys | high | high | high |
| A-06 | Validation Framework Code | low | high | medium |
| A-07 | Generated Variation Corpus | low | high | medium |

## Threats

| ID | Name | Impact | Likelihood | Actors | Assets |
|-----|------|--------|------------|--------|--------|
| T-01 | Ground Truth Poisoning | critical | medium | TA-01, TA-02 | A-01 |
| T-02 | Holdout Set Leakage | high | medium | TA-01 | A-02 |
| T-03 | Calibration Certificate Forgery | critical | low | TA-02 | A-03, A-04 |
| T-04 | RNG Seed Prediction | medium | low | TA-02 | A-07 |
| T-05 | Corpus Tampering | critical | low | TA-02 | A-07 |
| T-06 | Dependency Supply Chain Attack | critical | low | TA-03 | A-06 |
| T-07 | Metrics Calculator Manipulation | critical | low | TA-01, TA-02 | A-06 |
| T-08 | Key Compromise | critical | low | TA-01, TA-03 | A-05 |

## Controls

| ID | Name | Type | Effectiveness | Threats Mitigated |
|-----|------|------|---------------|-------------------|
| C-01 | Dual-Reviewer Ground Truth Labeling | preventive | full | T-01 |
| C-02 | HMAC-Signed Manifests | detective | full | T-01, T-05 |
| C-03 | Merkle Tree Corpus Integrity | detective | full | T-05 |
| C-04 | Ed25519 Digital Signatures | preventive | full | T-03 |
| C-05 | Holdout Set Access Separation | preventive | partial | T-02 |
| C-06 | Dependency Pinning & Integrity | preventive | full | T-06 |
| C-07 | Meta-Validation (Calculator Tests) | detective | full | T-07 |
| C-08 | Key Management via Environment Variables | preventive | partial | T-08 |
| C-09 | Git-Hash-Based Calibration Validity | detective | full | T-03, T-07 |
| C-10 | Ground Truth Challenge Process | corrective | full | T-01 |
| C-11 | CAPA System | corrective | full | T-01, T-07 |
| C-12 | Path Traversal Prevention | preventive | full | T-05, T-08 |

## Residual Risks

| Threat | Controls Applied | Residual Impact | Residual Likelihood | Rationale |
|--------|------------------|-----------------|---------------------|-----------|
| T-01 | C-01, C-02, C-10, C-11 | low | low | Dual review + challenge process + CAPA makes undetected poisoning require collusion of 2+ reviewers. Quarterly label audit (K11.2) provides additional detection. |
| T-02 | C-05 | medium | low | CI check catches code references. Manual discipline required for ad-hoc debugging. Access separation is partial — same repo contains both sets. |
| T-04 | C-03 | low | low | Seed in config is public, but exploitation requires per-variation crafted evasion across 200K+ samples. Merkle tree integrity (C-03) detects any corpus tampering. Practical benefit is negligible given corpus size and generator diversity. |
| T-08 | C-08 | high | low | Keys never in code. Risk remains if CI environment is compromised or error messages leak key material. Rotation procedure documented. |

## Threat-Control Coverage Matrix

| Threat | Controls | Covered | Residual Risk Documented |
|--------|----------|---------|--------------------------|
| T-01 — Ground Truth Poisoning | C-01, C-02, C-10, C-11 | Yes | Yes |
| T-02 — Holdout Set Leakage | C-05 | Yes | Yes |
| T-03 — Calibration Certificate Forgery | C-04, C-09 | Yes | No |
| T-04 — RNG Seed Prediction | NONE | **NO** | Yes |
| T-05 — Corpus Tampering | C-02, C-03, C-12 | Yes | No |
| T-06 — Dependency Supply Chain Attack | C-06 | Yes | No |
| T-07 — Metrics Calculator Manipulation | C-07, C-09, C-11 | Yes | No |
| T-08 — Key Compromise | C-08, C-12 | Yes | Yes |
