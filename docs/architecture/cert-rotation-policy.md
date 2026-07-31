<!-- SPDX-License-Identifier: MIT -->
# Cert-rotation policy — keyless Fulcio root + OIDC issuer (E1-PHASE-4-M2 M-2.6)

**Status:** ACCEPTED (policy). **NO verifier code here** — the working verifier is **E1-PHASE-4-M3a**; this doc fixes the rotation *contract* so retired-cert attestations stay verifiable.
**Authority:** Master Plan v1.0 §4.3 — M-2 acceptance, the **6th criterion** (cert-rotation policy + verifier `--historical-root` tolerance; unnumbered in §4.3's M-2.1..M-2.5 enumeration, tracked as **M-2.6** per the blueprint). · `docs/architecture/ADR-verifier-cli.md` D6 + §6 (adversarial Round-2 **HIGH-4**).
**Related:** `packages/dojolm-sdk/src/verify.ts` (`VerifyOptions.historicalRoot`, PROVISIONAL skeleton) · `packages/dojolm-sdk/src/verify.rotation.test.ts` (pending/skipped spec, unskip at M-3a) · `deploy/sigstore/README.md` (keyless mode + M-2.2 namespace + fileca key) · `deploy/sigstore/provision.sh --with-fulcio` (fileca root gen) · `docs/architecture/data-residency-model.md` §"Cert-rotation residency".

---

## 1. Context — why rotation needs a policy

Keyless signing (E1-PHASE-4-M2, §0=A) mints a **short-lived** signing certificate from an operator-OIDC token, chained to a self-hosted **Fulcio `fileca` root** (`deploy/sigstore/fulcio/keys/cert.pem`) whose trust is anchored by a self-hosted **Dex** issuer (`http://dex:5556/dex`). Two trust anchors rotate over time:

1. **The Fulcio fileca root** — scheduled rotation (hygiene), or emergency rotation on suspected CA-key compromise.
2. **The OIDC issuer / Dex signing key** — issuer URL change, Dex key roll, or operator-identity change.

A signing cert is valid only within its `NotBefore`/`NotAfter` window, but the **attestation it produced is permanent** — it is witnessed to the private Rekor log and must remain verifiable for the legal-defensibility lifetime of the evidence. **HIGH-4 (ADR §6):** if a verifier only trusts the *current* root, every attestation signed under a now-retired cert falsely reports `valid:false`. The policy below prevents that.

**The invariant (non-negotiable):** a correctly-signed attestation MUST remain verifiable across any number of root/issuer rotations. The verifier path that makes this true — `dojolm-verify --historical-root <chain>` ⇄ `VerifyOptions.historicalRoot` — **must not be dropped** (ADR D6 / HIGH-4).

---

## 2. Policy — archive the prior chain; verify retired certs against it

### 2.1 Chosen approach: archive-and-`--historical-root` (NOT re-attestation)

On every rotation, the operator **archives the prior root chain BEFORE switching**, and the verifier is given the archived chain via `--historical-root` when checking an attestation signed under a retired cert.

**Alternative considered — re-attestation** (re-sign all live attestations under the new root): **REJECTED as the default.** It (a) is O(all historical attestations) of expensive re-signing, (b) mutates the append-only transparency record — a *new* Rekor entry at re-sign time misrepresents the "witnessed at time T" property that is the whole point of the log, and (c) cannot reach attestations already exported to third parties (the outreach/co-author packs). Re-attestation is retained only as a narrow remediation for a **compromised** root (§2.6), never as routine rotation hygiene.

### 2.2 Archived-chain artifact format (operator-side provenance)

On rotation, archive (per rotation event):

- `cert.pem` — the retired Fulcio fileca **root certificate** (PUBLIC cert only; the private `key.pem` is destroyed or escrowed per §2.6, **never archived in the clear or published**).
- `chain-manifest.json` — operator-side provenance/index so the right archived chain can be selected for an attestation by its Rekor `integratedTime` / the cert validity window:

```jsonc
{
  "schemaVersion": "1.0.0",
  "rootFingerprintSha256": "<hex sha256 of the DER cert>",
  "issuerUrl": "http://dex:5556/dex",        // opaque issuer IDENTIFIER (see R-T1 note, §6)
  "subject": "O=DojoLM, CN=DojoLM Fulcio fileca root",
  "activeFrom": "2026-06-06T00:00:00Z",      // half-open window start [activeFrom, retiredAt)
  "retiredAt": "2027-06-06T00:00:00Z",       // EXCLUSIVE upper bound = rotation cutover instant
  "rotationReason": "scheduled",             // scheduled | issuer-change | compromise
  "compromisedAt": null,                     // ISO-8601 iff rotationReason == "compromise" (§2.6), else null
  "supersededBy": "<rootFingerprintSha256 of the next root>"
}
```

A deploy accumulates an ordered set of `{cert.pem, chain-manifest.json}` archives — the **historical-root chain**.

**Manifest integrity (security):** the verifier trusts an archived `cert.pem` only by its `rootFingerprintSha256`, but that fingerprint lives *inside* the manifest, so the **manifest itself must be integrity-protected out-of-band** — else an adversary who can rewrite both files on one path can substitute a matched fabricated cert+manifest. Pin the manifest via a sibling `chain-manifest.json.sha256` stored with the WORM/residency backup (§2.3), or commit each archived `rootFingerprintSha256` to the append-only Rekor log as a signed meta-entry. M-3a's verifier MUST verify the manifest's out-of-band pin before trusting the fingerprint it carries.

**Verifier consumption is M-3a, not contract-now.** Today `VerifyOptions.historicalRoot` is a single archived chain (string, §2.4). Whether the M-3a verifier consumes a *directory* of archives + auto-selects by validity window (vs. the operator supplying the one relevant chain) is a **PROPOSED enhancement to ADR D6** — it must be ratified in the ADR at M-3a, not treated as the current contract.

### 2.3 Deploy storage location (anchored to Slice 3)

The Slice-3 keyless overlay generates the **active** root at `deploy/sigstore/fulcio/keys/{key.pem,cert.pem}` (gitignored — `deploy/sigstore/.gitignore` matches `fulcio/keys/`, `*.pem`, `*.key`). Rotation moves the prior root into an archive subtree, also gitignored:

```
deploy/sigstore/fulcio/keys/
  key.pem            # ACTIVE private CA key (0600; never committed, never archived in the clear)
  cert.pem           # ACTIVE root cert
  archive/
    retired-2026-06-06T..Z/   # one dir per retired root (named by retiredAt)
      cert.pem                # retired root cert (PUBLIC)
      chain-manifest.json
      chain-manifest.json.sha256
```

**Backup (accurate scope):** `deploy/backup.sh` currently backs up **only** the app-data dir, the Trillian MySQL log, and the Rekor attestation store — it does **NOT** cover the `fulcio/keys/` bind mount. So the archived historical-root chain MUST be backed up by a **separate** step (copy the `archive/` subtree + its `.sha256` pins to the residency-tier backup root); extending `deploy/backup.sh` to capture the public archive (certs + manifests + pins, never `key.pem`) is a tracked follow-up. Per `docs/architecture/data-residency-model.md` §"Cert-rotation residency", archived roots **stay in the same tier** (EU history in EU, US in US, on-prem in the customer's local archive); cross-tier replay is unsupported by design.

### 2.4 Verifier contract (must not be dropped)

`dojolm-verify --historical-root <chain>` maps to `VerifyOptions.historicalRoot` (the field declared in `packages/dojolm-sdk/src/verify.ts`, ADR D6). Per the ADR's typed surface it is a **single** archived root chain (`historicalRoot?: string`); the D4 check pipeline (ADR §3 step 2) honours it — signature verification trusts the supplied archived root for an attestation whose cert chains to it. For multiple rotations, the operator supplies the one chain relevant to the attestation under audit (selected via the manifest windows in §2.2); any richer multi-archive input is the §2.2 PROPOSED M-3a/ADR-D6 enhancement. **Forward-dep:** the verifier is a PROVISIONAL skeleton today (returns the not-wired verdict); the working implementation is **E1-PHASE-4-M3a**. This policy is the contract M-3a implements; the pending spec (§5) pins it. **Do NOT drop `historicalRoot`** (D6 / HIGH-4, anti-pattern #10).

### 2.5 Clock-skew / `NotBefore`–`NotAfter`

A cert outside its `NotBefore`/`NotAfter` window MUST NOT silently verify **without** an explicit `--historical-root` (ADR §6; blueprint anti-pattern #12 — expired short-lived certs must not silently pass). With `--historical-root`, the archived chain is the explicit trust anchor for the retired validity window; a small documented clock-skew tolerance (per cosign's verification) applies only at the boundaries, never as an open-ended "ignore expiry." The **cert chain is authoritative** for which root an attestation belongs to (a short-lived leaf was minted by exactly one root); the manifest's half-open `[activeFrom, retiredAt)` windows are a non-overlapping selection *hint*, not the trust decision.

### 2.6 Compromise rotation (emergency)

On suspected CA-key compromise: rotate immediately, set `rotationReason: "compromise"` + the `compromisedAt` timestamp (§2.2 schema) in the manifest, and **do NOT** trust the compromised root via `--historical-root` for attestations witnessed **after** `compromisedAt` (only attestations witnessed before the compromise window stay trusted). This is the one case where targeted re-attestation (§2.1) of still-live evidence may be warranted; record the decision in the manifest.

---

## 3. M-2.2 — single-tenant Rekor namespace across rotation

Single-tenant ⇒ the **entire private Rekor log IS the namespace** (`deploy/sigstore/README.md` §"M-2.2"; INT-02 — per-tenant Rekor is SaaS-only). **Rotation does NOT create or shard a namespace:** pre- and post-rotation attestations coexist in the one log, distinguished only by which root their cert chains to (resolved via the `chain-manifest.json` windows). The Rekor log root continues to advance monotonically across rotations; `--rekor-root` pinning (ADR D6) is orthogonal to cert rotation.

---

## 4. Rotation runbook (operator)

1. **Archive** the active root: `mkdir -p deploy/sigstore/fulcio/keys/archive/retired-<retiredAt>/ && cp deploy/sigstore/fulcio/keys/cert.pem $_` (copy the PUBLIC `cert.pem` only — never `key.pem`); write `chain-manifest.json` (§2.2) with `retiredAt = now`, `rotationReason`, and (for the OIDC/Dex case) `rotationReason: "issuer-change"`; write the `chain-manifest.json.sha256` pin.
2. **Rotate** the root: remove the active `key.pem`+`cert.pem` and re-run `./deploy/sigstore/provision.sh --with-fulcio` (it regenerates the fileca root only when absent — see the teardown note "delete it manually to rotate"). For an **OIDC/Dex** rotation, update `dex/config.yaml` / the Dex signing material + `FULCIO_OIDC_ISSUER_URL` instead, keeping the issuer URL stable where possible.
3. **Restart** Fulcio so it loads the new root (`provision.sh --with-fulcio` recreates the service).
4. **Preserve + publish:** back up the `archive/` subtree (+ `.sha256` pins) to the residency-tier backup root (separate from `deploy/backup.sh` — §2.3); publish ONLY the public `cert.pem` + `chain-manifest.json` (+ pin) to the integrity-protected store that travels with the M-3a verifier distribution (vendored alongside the schema, ADR D7) for external auditors' `--historical-root`. **Never publish `key.pem`.**
5. **Verify** the cutover: a freshly-signed attestation verifies against the new active root, and a pre-rotation attestation verifies with `--historical-root <archive>` (end-to-end exercise is M-3a).

**Rollback.** *Premature scheduled rotation* (key still trusted): restore the prior `key.pem` + `cert.pem` from the residency backup and remove the just-written archive dir. *Compromise rotation:* never restore the compromised `key.pem` — keep the freshly-generated key from step 2 and only adjust the manifest. Never delete an archived `cert.pem` while any attestation it anchored may still be audited.

---

## 5. Forward-dependency + the pending spec

The end-to-end rotation-tolerance test (sign under root A → rotate to root B → verify the root-A attestation against `--historical-root A`) **cannot be greened until M-3a** wires the verifier (`verify.ts` is a skeleton). It is recorded now as a **pending/skipped spec** — `packages/dojolm-sdk/src/verify.rotation.test.ts` — which:

- pins the **non-droppable contract** with a live (non-skipped) assertion that `VerifyOptions` still accepts `historicalRoot` (a compile-time + runtime guard against silently dropping D6 / HIGH-4), and that the skeleton returns the PROVISIONAL verdict today; and
- carries the `it.skip(...)` rotation round-trips (verify WITH `--historical-root`, reject WITHOUT) to **unskip at M-3a** (the skip label names the milestone).

---

## 6. Security considerations (R-T1 / Rule 18 + chain integrity)

- **No private key is ever archived in the clear or published** — only the public root `cert.pem`. The active `key.pem` stays `0600` + gitignored; on compromise it is destroyed (never restored).
- **Manifest integrity** — the archived `cert.pem` is trusted by `rootFingerprintSha256`, but the manifest carrying that fingerprint must itself be integrity-pinned out-of-band (sibling `.sha256` in the WORM backup, or a Rekor meta-entry) so a tampered manifest+cert pair fails (§2.2). Windows are non-overlapping half-open `[activeFrom, retiredAt)`.
- **No PII** in the manifest — fingerprints, timestamps, issuer URL, subject DN only; the operator identity in the cert SAN is an internal id (consistent with ADR §6 / R-T1), never enriched with raw PII. **Public-OIDC caveat:** the default `issuerUrl` is the internal Dex DNS name (`http://dex:5556/dex`) — an opaque identifier, not a fetch URL. If a deployment uses a *public* OIDC provider, treat the manifest as internal, or redact `issuerUrl` to scheme+host before publishing (mirrors the CT-log-disabled SAN-leak control in `deploy/sigstore/README.md`).
- **Append-only preserved** — routine rotation never re-signs (§2.1), so the "witnessed at time T" property of the Rekor log is intact across rotations.

---

## 7. References

- `docs/architecture/ADR-verifier-cli.md` — D6 (`--historical-root` / `VerifyOptions.historicalRoot`), §6 HIGH-4 (non-droppable), D4 step-2 (signature check honours `historicalRoot`), D7 (vendored-with-the-verifier).
- `packages/dojolm-sdk/src/verify.ts` — `VerifyOptions.historicalRoot` (PROVISIONAL); `verify.rotation.test.ts` — pending spec.
- `deploy/sigstore/README.md` — keyless mode (Fulcio fileca + Dex), §"M-2.2 single-tenant Rekor namespace", §"fileca key".
- `deploy/sigstore/provision.sh` — `--with-fulcio` fileca-root generation + the teardown rotate note.
- `docs/architecture/data-residency-model.md` §"Cert-rotation residency" — archived roots stay same-tier; cross-tier replay unsupported.
- `deploy/backup.sh` / `deploy/runbooks/backup-and-restore.md` — current backup scope (app-data + Trillian + Rekor attestations; NOT fulcio keys — see §2.3).
- Master Plan v1.0 §4.3 (M-2.6) · Mandatory Dev Rules 15/16/18.
