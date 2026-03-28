# KATANA Assessment Readiness

Generated: 2026-03-28T19:01:31.640Z
Evidence Profile: formal
Ready For Formal Assessment: YES

## Key Material

- HMAC Source: custodial-env
- Ed25519 Signing Source: custodial-env
- Public Verification Key: `validation/calibration/certificates/public-key.pem`

## Run Summary

- Run ID: katana-evidence-20260328
- Validation Verdict: PASS
- Non-Conformities: 0

## Preflight Checks

| Check | Status | Detail |
|-------|--------|--------|
| Git revision captured | PASS | Revision c037b5f1f007fc39898fd1700d54af08f73c8e30 captured on branch HEAD. |
| Git worktree clean before evidence generation | PASS | Branch HEAD was clean when the evidence run started. |
| Custodial HMAC key available | PASS | KATANA_HMAC_KEY was present and satisfied minimum length requirements. |
| Custodial Ed25519 signing keys available | PASS | KATANA_SIGNING_KEY and KATANA_VERIFY_KEY were loaded and self-verified. |

## Runtime Checks

| Check | Status | Detail |
|-------|--------|--------|
| Validation run satisfied zero-defect rule | PASS | Validation report concluded PASS with zero non-conformities. |
| All calibration certificates passed | PASS | All 29 calibration certificates reported PASS. |
| Controlled document register validated | PASS | Controlled document register validation passed. |
| Frozen controlled-document artifacts emitted | PASS | Generated 15 frozen document artifacts for 15 registered documents. |
