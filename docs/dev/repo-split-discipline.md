# Repo split discipline — public OSS vs private SaaS

## The rule

> **Nothing SaaS-related lands on the public OSS branch.**

This is the founder-fired hard rule from the DojoLM Master Plan v1.0 §3 (INT-02 decision).

## Boundary definition

The complete path-level boundary is encoded in [`.dojolm-repo-boundary.yaml`](../../.dojolm-repo-boundary.yaml). High-level summary:

### Public OSS — what BELONGS here

- Sigstore-based audit-logger
- `dojolm.eval/v1` predicate schema (lives in separate `BlackUnicornSecurity/eval-predicate` repo; this repo carries the consuming code)
- Verifier CLI (`packages/dojolm-verifier/`)
- Cross-framework crosswalk schema + curator tooling (data in separate `dojolm-spec/crosswalk` repo)
- Module functional cores: Atemi probe runner, Buki payloads + fuzzer, Jutsu catalog, /admin/eval Wilson-CI store, Onigaeshi audit substrate, Bushido sign-off ritual code, Hattori guard modes, Kotoba prompt rules, Metsuke recon fingerprints, Mitsuke/Amaterasu/Kagami
- BAISS checklist data
- Open framework definitions
- Yamabushi scanner
- Self-hosted admin UI
- Docs

### Private SaaS — what does NOT belong here

- Multi-tenant routing + tenant-aware data path
- Per-customer deploy automation + provisioning
- Billing + usage telemetry
- Customer admin portal
- Customer-success runbooks + 4h-SLA tooling
- M-7 paid-curator internal infra (TSC voting, contributor access controls)
- Big-4 partner integration scaffolding
- Sales pipeline + CRM integration
- Private playbooks
- Per-customer secrets + key-rotation tooling
- Commercial deploy templates (EU-only / US-only / on-prem air-gapped tiers)

## Enforcement (no general CI)

Four-layer defense:

### 1. Pre-commit hook (local)

`.husky/pre-commit` (or `.pre-commit-config.yaml`) runs `tools/check-repo-boundary.mjs` which:

- Reads `.dojolm-repo-boundary.yaml`
- For each staged path: checks against the deny-glob list
- Exits 1 with a clear message if any path matches a deny-glob
- Bypassable via `git commit --no-verify` (intentional — defense-in-depth layer 2 catches this)

### 2. PR template checklist

`.github/PULL_REQUEST_TEMPLATE.md` includes a mandatory checklist item:

> - [ ] Confirm: no SaaS-only path touched (multi-tenant routing / billing / per-customer deploy / admin portal / curator-internal-infra) — see `.dojolm-repo-boundary.yaml`.

Reviewer must verify before approval.

### 3. GitHub branch protection + PR-time scan

`.github/workflows/repo-boundary-scan.yml` runs the same `tools/check-repo-boundary.mjs` on every PR. Configured as a REQUIRED status check on the protected `main` branch.

This catches `--no-verify` bypasses + sleepy reviewers. Branch protection ALSO requires:

- PR review approval
- Branch up-to-date before merge
- No force-push to main
- Linear history (no merge commits except squash-merge)

This is NOT general CI — it's a single-purpose PR-time check + targeted defense for the irreversible-leak case, the one deliberate carve-out from this repo's no-general-CI policy.

### 4. Manual reviewer attestation

Reviewer signs the PR template checklist. If a SaaS-only path lands accidentally, the PR-template line attributes shared responsibility — accelerates root-cause + remediation.

## Migration scenarios

If you discover code in the OSS repo that should be private:

1. **DO NOT** simply delete from public — that's a tombstone signaling "look at git history for the leak".
2. Open a private issue (or email security@blackunicorn.tech for sensitive cases).
3. Maintainers will:
   a. Move the code to the private SaaS repo (per `.dojolm-repo-boundary.yaml`).
   b. Rewrite git history on the public repo to remove the leak from all branches.
   c. Force-push the cleaned history (one-time exceptional operation; founder-authorized only).
   d. Coordinate with downstream forks for re-baseline.

If you discover code in the private SaaS repo that should be public (substrate accidentally landed private):

1. Open a normal issue.
2. Maintainers move it to public OSS repo and reference the move in commit history.
3. Private repo retains a reference comment pointing to the new public location.

## Spec repos

Separate spec repos (`BlackUnicornSecurity/eval-predicate` + `dojolm-spec/crosswalk`) are OUT of scope for this boundary rule — they have their own licenses (Apache + CC-BY-4.0) and contribution flows.