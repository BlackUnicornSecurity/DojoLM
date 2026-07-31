# Bushido sign-off ledger retention policy

**Authority:** Master Plan v1.0 §4.1 RB-7 + epics doc E1-A-RB-7.
**Status:** Stage-A shipped 2026-05-24 (filesystem default + stubs for S3 Object Lock + Postgres pgaudit WORM). **Stage-B Rekor-as-append-only-log shipped 2026-05-24** via B-14b alongside RB-4 Stage-B (when the operator enables the sigstore sign-off path, quarterly attestations are cosign-signed and witnessed in Rekor; the ledger write never blocks on cosign). S3 Object Lock concrete + Postgres pgaudit-WORM concrete remain deferred to the SaaS private repo + the Stage 2 / Stage 3 enterprise PR respectively.
**Scope:** the per-quarter Bushido attestation ledger written by `packages/dojolm-web/src/lib/bushido/signoff-store.ts`. The Onigaeshi audit substrate (B-14a) has its own retention horizon and is out of scope for this policy.

## TL;DR

| Tier | Backing store | Retention floor | Where it lives |
|---|---|---|---|
| OSS self-hosted (default) | `FsBushidoSignoffStore` — tmp+rename atomic write, 0o600 perms | **7 years** (SOC 2 floor) | OSS public repo, this PR. |
| SaaS multi-tenant | `S3BushidoSignoffStore` — S3 with Object Lock COMPLIANCE mode | Per customer DPA + regulated tier (see table below) | Stub in OSS; concrete in `github-private` per §3 repo split. |
| Self-hosted enterprise | `PgWormBushidoSignoffStore` — Postgres + pgaudit + locked-row trigger | Per customer DPA + regulated tier | Stub in OSS; concrete lands in a Stage 2 / Stage 3 enterprise PR. |

## Retention floor per regulated tier

| Regulatory anchor | Retention floor | Notes |
|---|---|---|
| **SOC 2 Type II** | **7 years** | TSC observation window + audit-readiness floor. Stage 1 Bushido default. |
| **HIPAA** | **10 years** | 45 CFR §164.530(j)(2). Applies whenever the customer signs a BAA. |
| **GDPR / EU AI Act high-risk** | **6 years** | Default sub-processor evidence retention; longer when contract dictates. |
| **FDA 21 CFR Part 11** | **30 years** | Medical-device + clinical-trial customer tier. Sign-off ledger entries that bind to FDA-regulated workflows are subject to the longest retention horizon and trigger the locked-row no-delete enforcement at the storage layer (Object Lock COMPLIANCE or pgaudit-WORM trigger). |

The store layer enforces the floor at write time; per-tenant retention is set at the storage adapter level (S3 Object Lock retention years or Postgres trigger guard). The Stage 1 filesystem default does **not** enforce retention automatically — operators are responsible for filesystem-tier retention controls (e.g. ZFS snapshots, append-only mount options, backup retention).

## Stage 1 OSS filesystem default

Path: `<DATA>/bushido/sign-offs/<quarter>.json` (resolved via `getDataPath('bushido', 'sign-offs')`).

Hardening:
- Directory created with mode `0o700`.
- File written via tmp + rename (atomic at the POSIX level).
- File mode `0o600` — owner read/write only.
- Per-quarter mutex inside the store prevents concurrent in-process writers from racing on the self-approval check.

Retention enforcement is **operator-side** at Stage 1. Recommended posture for a self-hosted Stage 1 deployment that needs SOC 2 evidence retention:

1. Mount `<DATA>/bushido/sign-offs/` on a separate filesystem (ZFS dataset, btrfs subvolume, or LVM volume) with append-only / immutable flags where possible.
2. Snapshot daily; retain snapshots for the customer's regulated tier (7 / 10 / 30 years).
3. Replicate snapshots offsite (S3 Glacier Deep Archive, ZFS send/receive to backup target).
4. Document the snapshot + replication SLA alongside this policy in the operator runbook.

Stage 2 SaaS deploys delegate retention to S3 Object Lock COMPLIANCE mode + per-customer KMS keys; the operator runbook collapses to "set the env vars in the deploy template".

## Stage 2 SaaS S3 Object Lock contract

When the SaaS private-repo concrete impl ships (alongside B-14b), the deploy template provisions:

- An S3 bucket with **Object Lock enabled at creation** (cannot be retroactively enabled per S3 contract).
- IAM policy that grants `PutObject` + `PutObjectRetention` to the SaaS service role and **explicitly DENIES** `DeleteObject` + `BypassGovernanceRetention` — so the SaaS app cannot retroactively unlock even if the role is escalated.
- Per-tenant KMS key (CMK) with rotation enabled annually.
- Retention years set at the bucket policy level from `BUSHIDO_SIGNOFF_S3_RETENTION_YEARS` env var (per-tenant override via deploy template).

The full env-var contract + IAM policy snippets live in the private SaaS deploy template; the public OSS stub at `signoff-store-s3.ts` carries a header comment with the same fields so OSS readers see the surface.

## Stage 2 / Stage 3 self-hosted Postgres pgaudit-WORM contract

When the enterprise pg-worm impl ships, the schema + trigger guard + pgaudit configuration live at `signoff-store-pg-worm.ts` (header comment in the stub already documents the target shape). The concrete impl adds:

- Row-level `BEFORE UPDATE` trigger that raises if `OLD.locked = true` — no app-side modification possible after lock.
- pgaudit capture for every WRITE row on the table, shipped to the customer's WORM log destination (typically a separate Postgres replica, S3, or syslog forwarder).
- Stream archival from the WORM destination to long-term cold storage per the customer's regulated tier.

## Cutover relative to B-14b (Bushido sign-off cosign port)

Stage-A (this PR): retention contract documented + stubs scaffolded. The filesystem default + the retention doc are enough to satisfy SOC 2 readiness for the Stage 1 OSS deployment.

Stage-B (B-14b, Phase 3 Slice 3): the Bushido sign-off record gains `cosignAttestationUri` + `cosignInclusionProof` (mirroring the WormAuditWriter pattern shipped in B-14a Slice 3). Rekor becomes the public-verifiability layer alongside whichever storage tier the operator chose. The retention floors in the table above stay the same; cosign adds the **independently-verifiable** signal that the record is what it claims to be.

## License

Open core: Apache-2.0 (community core) / BUSL-1.1 (enterprise tier) — each source file's `SPDX-License-Identifier` header is authoritative. See [`LICENSE`](../../LICENSE) and [`LICENSE-BUSL-1.1.txt`](../../LICENSE-BUSL-1.1.txt).
