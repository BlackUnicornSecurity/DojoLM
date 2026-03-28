# KATANA Assessment Readiness

Generated: 2026-03-28T13:35:50.103Z
Evidence Profile: development
Ready For Formal Assessment: NO

## Key Material

- HMAC Source: repository-local-development-fallback
- Ed25519 Signing Source: ephemeral-development
- Public Verification Key: `validation/calibration/certificates/public-key.pem`

## Run Summary

- Run ID: katana-evidence-20260328
- Validation Verdict: PASS
- Non-Conformities: 0

## Preflight Checks

| Check | Status | Detail |
|-------|--------|--------|
| Git revision captured | PASS | Revision 6fb15afdc98b766c3dc794227b73d9ba8f26a5a8 captured on branch main. |
| Git worktree clean before evidence generation | FAIL | Branch main had uncommitted changes when the evidence run started. |
| Custodial HMAC key available | FAIL | KATANA_HMAC_KEY was unavailable, so the development fallback key would be used. |
| Custodial Ed25519 signing keys available | FAIL | No custodial Ed25519 keypair was supplied, so an ephemeral development keypair would be generated. |

## Runtime Checks

| Check | Status | Detail |
|-------|--------|--------|
| Validation run satisfied zero-defect rule | PASS | Validation report concluded PASS with zero non-conformities. |
| All calibration certificates passed | PASS | All 29 calibration certificates reported PASS. |
| Controlled document register validated | PASS | Controlled document register validation passed. |
| Frozen controlled-document artifacts emitted | PASS | Generated 15 frozen document artifacts for 15 registered documents. |

## Remaining Tool-Side Blockers

- Git worktree clean before evidence generation: Branch main had uncommitted changes when the evidence run started.
- Custodial HMAC key available: KATANA_HMAC_KEY was unavailable, so the development fallback key would be used.
- Custodial Ed25519 signing keys available: No custodial Ed25519 keypair was supplied, so an ephemeral development keypair would be generated.
