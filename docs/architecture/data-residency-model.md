# Data residency model

**Authority:** DojoLM Master Plan v1.0 §4.1 — E1-A-RB-14 (Élise commercial item 9+10).
**Status:** v1.0 draft, 2026-05-23. To be reviewed by counsel during RB-10a/RB-10b engagement at Stage 2.
**Scope:** documents the three deploy tiers DojoLM ships under. SOC 2 Type II + ISO 27001 scoping (RB-11a/RB-11b) inherit this model. Without this doc, mid-audit re-architecture costs ~8 weeks of calendar slip per Élise §7 procurement reality.

---

## Why this matters

Per the 4-persona review and adversarial Round-1 audit:

- **EU finserv** customers (Élise §3 covers 8 European banks): DORA Art 28 + GDPR Art 28 + EU AI Act high-risk-system processor terms require physical EU residency for ALL data planes — primary storage, transparency log, signing-cert authority, verifier CDN. Cross-region data movement is a hard procurement gate.
- **US-only** customers: CCPA + Colorado AI Act + Texas Data Privacy Act + state-AG patchwork (RB-10b counsel scope) require physical US residency for analogous reasons.
- **Defense primes** (Élise §3 covers 2 EU primes): will NOT accept any external transparency-log dependency. Requires air-gapped on-prem deploy with no outbound calls to sigstore.dev or any DojoLM-operated public Rekor.

The Sigstore primitives DojoLM adopts (E1-PHASE-2-B14a Onigaeshi → E1-PHASE-3-B14b Bushido → E1-PHASE-4-B14c platform-wide) all have private-deployment modes. This document pins each component to the tier it runs in.

---

## Tier matrix

| Component | EU-only tier | US-only tier | On-prem air-gapped tier |
|---|---|---|---|
| **Primary storage** (Kokugikan submission store, Bushido sign-off ledger, Onigaeshi audit WORM, checklist verdicts) | S3 Object Lock — `eu-central-1` (Frankfurt) OR `eu-west-1` (Dublin) | S3 Object Lock — `us-east-1` (N. Virginia) OR `us-west-2` (Oregon) | Local Postgres pgaudit WORM + local filesystem; no S3 |
| **Fulcio cert authority** (per-tenant OIDC short-lived signing certs) | Private Fulcio deployment, EU-region VPC | Private Fulcio deployment, US-region VPC | Local Fulcio on customer infra; no sigstore.dev public-good |
| **Rekor transparency log** (per-tenant namespace OR per-tenant private instance) | Private Rekor deployment, EU-region VPC | Private Rekor deployment, US-region VPC | Local Rekor on customer infra; no gossip to sigstore.dev |
| **Verifier CDN** (`dojolm-verify` CLI distribution + Hugging Face Space + ghcr.io image) | `ghcr.io/dojolm/verify` (multi-region GitHub CDN; customer can mirror to EU-only image registry if required) | `ghcr.io/dojolm/verify` (same; mirror to US-only registry if required) | Verifier image distributed via offline tarball (`dojolm-verify-<sha>.tar.gz`); customer loads into local registry |
| **Operator console + admin UI** | Cloudfront / Cloudflare EU-only PoPs OR customer-deployed reverse proxy in EU region | Cloudfront US-only PoPs OR customer-deployed US-region reverse proxy | Local nginx on customer infra |
| **OIDC IdP** (tenant-side identity for Fulcio binding) | Customer's EU-region IdP (Okta EU / Auth0 EU / Microsoft Entra EU tenant / customer-deployed Keycloak) | Customer's US-region IdP | Customer-deployed local IdP (Keycloak / Dex / etc); no external IdP federation |
| **Sub-processors** | Per DORA Art 28 sub-processor inventory; EU residency for each (e.g., AWS EU, Cloudflare EU, etc) | Per CCPA/state-AG; US residency for each | Zero external sub-processors |
| **Backup / DR** | Cross-AZ within `eu-central-1` (Frankfurt 3-AZ) OR cross-region within EU (Frankfurt + Dublin) | Cross-AZ + cross-region within US | Customer-managed offline backup; no cross-customer DR |
| **Cross-region data movement** | **PROHIBITED.** Any cross-region traffic = procurement-gate fail | **PROHIBITED.** Same. | **PROHIBITED + offline-only.** No outbound network egress from the airgap. |
| **Audit-log retention** | 7y SOC 2 / 10y HIPAA / 6y GDPR / 30y FDA Part 11 — whichever applies per customer regulatory context | Same retention floor per US customer regulatory context (HIPAA / FFIEC / NIST 800-53 / etc) | Customer-controlled retention; vendor cannot read |
| **Telemetry / usage metrics** (SaaS-tier only) | EU-residency telemetry endpoint; product analytics anonymized + aggregated in EU | US-residency analytics | Zero telemetry; customer must explicitly opt-in to offline-only metrics |

---

## Per-tier architecture sketch

### Tier 1 — EU-only (Frankfurt / Dublin)

```
[Customer EU users]
        │
        ▼
[Customer's EU-region IdP (Okta EU / Entra EU / Keycloak)] ── OIDC ──┐
        │                                                           │
        ▼                                                           ▼
[Cloudfront EU-only PoP]  ──→  [DojoLM admin console — EU region]
                                       │
                                       ▼
                              [Per-tenant signing] ←── [Private Fulcio — EU VPC]
                                       │
                                       ▼
                              [Per-tenant Rekor namespace — EU VPC]
                                       │
                                       ▼
                              [S3 Object Lock — eu-central-1 + eu-west-1 DR]
                                       │
                                       ▼
                              [pgaudit WORM Postgres — eu-central-1]

Verifier:
  `ghcr.io/dojolm/verify` → `dojolm-verify <pack.dsse> --root <eu-rekor-root>` exits 0
  Customer may mirror image to EU-only registry (ECR EU / GAR EU / Harbor)
```

### Tier 2 — US-only (N. Virginia / Oregon)

Same shape as Tier 1 but US-region pinned (`us-east-1` / `us-west-2`). US privacy counsel (RB-10b) reviews DPA + CCPA + state-AG addenda. SOC 2 Type II scoping aligned to US auditor (RB-11a).

### Tier 3 — On-prem air-gapped (defense primes)

```
[Customer LAN users]
        │
        ▼
[Customer-deployed Keycloak / Dex IdP] ── OIDC ──┐
                                                  ▼
                                          [DojoLM admin console (local)]
                                                  │
                                                  ▼
                                          [Local Fulcio (customer infra)]
                                                  │
                                                  ▼
                                          [Local Rekor (customer infra)]
                                                  │
                                                  ▼
                                          [Local Postgres pgaudit WORM]

Verifier offline-load:
  Customer receives `dojolm-verify-<sha>.tar.gz` via secure courier
  `docker load < dojolm-verify-<sha>.tar.gz`
  `dojolm-verify <pack.dsse> --root <local-rekor-root>` exits 0
  No outbound network egress from the air-gap.

No telemetry. No sigstore.dev gossip. No DojoLM-operated infrastructure
in the deploy path. Customer is the sole operator.
```

---

## Cert-rotation residency (per adversarial Round-2 HIGH-4 + RB-15)

Per E1-PHASE-4-M2 acceptance: per-tier Fulcio cert rotation MUST preserve archived OIDC root chain for verifier replay. Residency rule: archived roots stay in the SAME tier (EU rotation history stays in EU; US in US; on-prem in customer's local archive). Cross-tier replay is NOT supported by design — attempted replay of an EU-signed pack via a US-region verifier root returns a clear "cross-tier replay not supported" error.

---

## Multi-tenancy posture per master plan §3 / INT-02

Per INT-02 + D-3: **per-customer deploy = per-tenant.** SaaS commercial tier ships a separate VPC / namespace / database per customer. Shared-multi-tenant infrastructure is OUT of scope for v1; it lives on the v5.2 roadmap if customer count grows past ~10.

Implication: a customer requesting "EU residency" gets a dedicated EU-region deploy template (private repo: `deploy/saas-tier-eu-only/`). No data sharing with any other customer's deploy. Cross-customer-key-isolation contract test (E1-PHASE-4-M2 SaaS acceptance) enforces this at the cert-SAN + Rekor-namespace boundary.

---

## Open items pending counsel review

These items are documented as v1.0 vendor-side intent; counsel (RB-10a EU + RB-10b US) refines or rejects at Stage 2 engagement:

1. **DORA Art 28 sub-processor inventory** — exact list of EU sub-processors (AWS EU regions / Cloudflare EU / etc) flowing into customer DPA addendum.
2. **GDPR Art 28 controller-processor language** — customer is controller; DojoLM is processor; sub-processors flow down per DPA template.
3. **EU AI Act high-risk-system processor obligations** — customer attests their use-case classification; DojoLM provides Article 16 cooperation interface.
4. **CCPA service-provider terms** — exact business-purpose language for US tier.
5. **Colorado AI Act + Texas DPA + Illinois BIPA** — state-AG patchwork addenda merged into US DPA template.
6. **Defense-prime onboarding playbook** — air-gapped deploy QA + courier protocol + offline-key-attestation chain.
7. **HIPAA BAA** (US healthcare) — separate template if/when first US healthcare customer engages.
8. **FFIEC examination support** (US finserv) — auditor cooperation interface.

---

## SOC 2 + ISO 27001 scope per tier

Per RB-11a SOC 2 Type II scoping + RB-11b ISO 27001 scoping:

- **Tier 1 EU-only:** SOC 2 Type II audit by EU-based auditor (e.g., Schellman EU, A-LIGN EU, Ernst & Young EU). Trust Services Criteria: Security + Confidentiality + Privacy. ISO 27001 by EU certification body (BSI / DNV / DEKRA / TÜV).
- **Tier 2 US-only:** SOC 2 Type II by US Big-4 SOC firm (Deloitte / E&Y / KPMG / PwC US) OR Tier-2 (Schellman / A-LIGN / Prescient). Trust Services Criteria: Security + Confidentiality (+ Privacy for healthcare).
- **Tier 3 on-prem air-gapped:** SOC 2 + ISO 27001 cover only the SOFTWARE supply chain (build → tarball → courier handoff) — not customer's deploy. Customer's own audit covers the deploy. Vendor provides cryptographic attestations of build provenance.

---

---

## Changelog

- **v1.0 (2026-05-23)** — initial doc, RB-14 of Stage 1 of DojoLM Master Plan v1.0. Pending counsel review at Stage 2 RB-10a/RB-10b engagement.
