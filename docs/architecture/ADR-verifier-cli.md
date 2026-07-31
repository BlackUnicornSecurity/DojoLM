<!-- SPDX-License-Identifier: MIT -->
# ADR — `dojolm-verify` reference verifier CLI

**Status:** ACCEPTED — founder fired the contract 2026-05-28 (D1 cosign `.bundle` · D2 public spec repo / Apache-2.0 / zero monorepo dep · D3 shell-out to `cosign` + `rekor-cli` · D5–D7 defaults block). NO CODE in this PR — the build is the separate E1-PHASE-4-M3a PR.
**Decision date:** 2026-05-28 (drafted same day).
**Owner area:** Public `dojolm.eval/v1` spec + Sigstore/cosign/Rekor verification path.
**Milestone:** E1-PHASE-4-M3a (Master Plan v1.0) — export pack + verifier CLI + ghcr image + HF Space.
**Related:** `packages/dojolm-sdk/src/verify.ts` (skeleton), the eval-predicate spec (canonical form at `specs.dojolm.com`), `docs/architecture/predicate-uri-pinning-migration.md`, `deploy/sigstore/README.md`.

---

## 1. Context

The M-11.2 convergence trigger (Stage-2 brutal review, 2026-05-26) is: a public `dojolm.eval/v1`
spec + **one non-DojoLM co-author by end Q2-2026**. The spec repo, the four JSON Schemas, and the
SDK type surface already exist and already **promise** a verifier:

- The eval-predicate spec's §Verification advertises `dojolm-verify` (OSS, *no DojoLM
  dependency required*) with an illustrative `✓ Cosign signature… ✓ Rekor inclusion…` transcript.
- `packages/dojolm-sdk/src/verify.ts` ships a PROVISIONAL skeleton whose `verify()` returns a
  structured "not yet wired — use `dojolm-verify <pack.dsse>` directly" verdict, and documents the
  exit-code contract: **exit 0 ⇄ `valid: true`; exit 1 ⇄ `valid: false` + non-empty `errors[]`**.
- `packages/dojolm-sdk/src/types.ts` defines the output type `VerifyResult` and the predicate type
  `DojoLmEvalV1Predicate`.

A working verifier is what turns the outreach DM from **"trust our numbers"** into **"clone this,
run `dojolm-verify`, confirm the numbers yourself."** That is the difference between a solo-founder
claim and a wire format a frontier-lab researcher will co-sign. This ADR fixes the **contract** so a
fresh agent can build it without re-deriving these decisions, and so the founder fires on the shape
*before* any code is written.

### 1.1 What already exists (build on, do not reinvent)

| Asset | Location | Role for the verifier |
|---|---|---|
| Output type `VerifyResult` | `dojolm-sdk/src/types.ts:38` | **The CLI's stdout/JSON shape. Do not change it.** |
| `VerifyOptions` (packPath, rekorRoot, historicalRoot, transparencyLogUrl) | `dojolm-sdk/src/verify.ts:8` | The option surface the CLI flags map to. |
| Published eval JSON Schema (2020-12) | the eval-predicate spec's `schemas/dojolm.eval.v1.schema.json` | **The schema the verifier validates against** (see §3 D4). |
| Worked example (full in-toto Statement) | `…/examples/dojolm.eval.v1.example.json` | Golden fixture for verifier tests. |
| DSSE / in-toto / Rekor wire shapes | `bu-tpi/src/onigaeshi/cosign-signer.ts:106` (`DsseEnvelope`), `:117` (`RekorInclusionProof`) | The wire format the verifier **reads** (does not import — see §5). |
| Verification model (informative) | `…/docs/overview.md` §Verification model | The 7-step pipeline this ADR makes normative. |

### 1.2 Load-bearing finding — schema drift (SDK type ≠ published schema)

> **RESOLVED:** the SDK `types.ts` has since been reconciled to the published schema —
> `modelRef` / `probeCorpusRef` / `judgeModelRef` are now `ContentAddressedRef`, `specVersion` is the
> required `const "1.0.0"`, and `wormPayloadHash?` is bound to `subject.digest.sha256`
> (`packages/dojolm-sdk/src/types.ts`, whose header records "§1.2 drift closed"). The finding below is
> retained as the historical record.

The PROVISIONAL SDK type had **diverged** from the then-published spec schema:

| Field | SDK `DojoLmEvalV1Predicate` (`types.ts`) | Published `dojolm.eval.v1.schema.json` |
|---|---|---|
| `modelRef` / `probeCorpusRef` / `judgeModelRef` | `string` | `ContentAddressedRef` object `{ scheme, value[, provider] }` |
| `specVersion` | absent | **required** `const "1.0.0"` |
| `wormPayloadHash` | absent | optional (bound to `subject.digest.sha256`) |

**Decision consequence:** the verifier validates the wire predicate against the **published JSON
Schema**, NOT the SDK TypeScript type. The SDK type is dev-ergonomic scaffolding and was
reconciled to the schema in a **separate** follow-up (it remains PROVISIONAL by its own header and
emits nothing). Treating the schema as the single source of truth is the only choice that keeps the
verifier correct against artifacts real emitters produce.

---

## 2. The contract in one sentence

`dojolm-verify <pack>` takes a self-contained attestation pack for one or more
`dojolm.eval/v1` runs, performs a fixed ordered check pipeline against a configured Rekor instance
and the vendored eval schema, prints a `VerifyResult` JSON to stdout, and exits `0` iff every
applicable check passes (else `1` with a populated `errors[]`).

---

## 3. Decisions

Decisions marked **[FIRE]** are the ones I want explicit founder sign-off on; the rest are
recommended defaults bundled into the same fire unless you redirect.

### D1 — Input pack format **[FIRE]**

**Decision:** the canonical pack is a **cosign bundle** (`.bundle`, JSON) that is *self-contained
and offline-verifiable*: it carries the DSSE envelope (`payloadType:
application/vnd.in-toto+json` + base64 in-toto Statement payload + signatures) **plus** the Rekor
inclusion proof / SignedEntryTimestamp **plus** the verification material (Fulcio cert chain, or the
static public key id for the current static-key flow). This matches `cosign attest --bundle` output
and `overview.md`'s `eval-run-<id>.bundle (DSSE envelope + inclusion proof)`.

- The CLI accepts `dojolm-verify <pack.bundle>` and (for a single loose envelope) `--envelope
  <x.dsse> --rekor-proof <y.json>` as an advanced fallback.
- The run artifacts (`transcript.jsonl`, `verdict.json`) are **optional sidecars** for the D4 step-7
  hash re-derivation — they are NOT part of the signed pack (the predicate commits only to their
  hashes, so the transcript can stay private).

**Naming reconciliation:** this ADR standardizes on **"pack" = cosign bundle** (`.bundle`).
**RESOLVED (2026-06-07):** the SDK `verify.ts` doc-comment and the `dojolm-sdk` README `verify()`
example now both say `.bundle`; the cosmetic `.dsse` wording has been cleaned up.

*Alternative considered:* raw DSSE envelope only, with Rekor looked up live by entry hash. Rejected
as the default — it is not offline-verifiable (air-gapped auditor can't reach Rekor) and breaks the
"clone and run" outreach story.

### D2 — Verifier home + license **[FIRE]**

**Decision (recommended):** the reference verifier ships in the **public spec repo**
(`github.com/BlackUnicornSecurity/eval-predicate`), **Apache-2.0** (the repo's `LICENSE-CODE` already covers
"verifier code"), with **zero dependency on the private DojoLM monorepo**. The monorepo SDK's
`verify()` (`dojolm-sdk`, MIT) becomes a thin wrapper that shells out to / vendors the
`dojolm-verify` core.

**Why this matters:** the README's literal promise is "OSS, *no DojoLM dependency required*." If the
verifier lived only in the private monorepo, that claim would be false and the trust story collapses
— a researcher would have to trust code they can't see. Apache-2.0 in the public repo is the only
home that makes the outreach claim literally true.

*Alternative:* build it in `packages/dojolm-sdk` (MIT) first, extract to the public repo later.
Faster to start, but risks shipping an outreach link to a verifier that imports private code. **Founder
call.**

### D3 — Verification approach: shell-out vs in-process **[FIRE]**

**Decision (recommended):** **shell out to the audited Sigstore binaries** — `cosign verify-blob` /
`cosign verify-attestation` for the DSSE signature, `rekor-cli verify` for the inclusion proof —
exactly as the existing `CosignCliAdapter` (`cosign-signer-cli-adapter.ts`) already does on the
*signing* side, via an `execFile`-against-a-pinned-binary pattern (no shell string interpolation).
`ajv` + `ajv-formats` (in-process, npm) do the schema validation. Re-hashing (subject binding,
optional transcript/verdict) is Node `crypto` in-process.

**Why:** reusing the binaries the rest of the world already trusts is the strongest trust argument
for a verifier, and it mirrors a pattern already in the codebase. Reimplementing Sigstore crypto in
TS would be a new, unaudited attack surface on the most security-sensitive path we have.

*Alternative:* in-process via `sigstore-js` (npm). Pro: no external binary, simpler `ghcr`/HF-Space
packaging, easier `npx dojolm-verify`. Con: a heavier supply-chain footprint and a different trust
root than `cosign`. **Founder call** — this is the single biggest packaging/trust tradeoff.

### D4 — Check pipeline (normative) + validate against the PUBLISHED schema

The verifier runs these checks **in this order**, short-circuiting to a structured error on first
failure (overview.md §Verification model, made normative):

1. **Envelope decode** — parse the cosign bundle; extract the DSSE envelope and the in-toto
   Statement (`_type == https://in-toto.io/Statement/v1`).
2. **Signature check** — verify the cosign signature over the DSSE **PAE** (pre-authentication
   encoding) against the configured trust root: the static public key today; the Fulcio cert chain
   once keyless lands. Honor `historicalRoot` for retired-cert tolerance (see D6 / HIGH-4).
3. **Rekor inclusion** — confirm the entry's inclusion proof against the Rekor log's signed tree
   head; **pin** the resulting root hash into `VerifyResult.rekorRoot`. If `rekorRoot` was supplied,
   assert equality.
4. **Subject binding (CRIT-1)** — re-compute `subject.digest.sha256` from the supplied artifact
   bytes (the WORM row / canonical run-definition bytes) and reject on mismatch. When
   `predicate.wormPayloadHash` is present, assert it equals `subject.digest.sha256`.
5. **Schema validation** — validate `statement.predicate` against the **vendored**
   `dojolm.eval.v1.schema.json` (draft 2020-12) via `ajv` + `ajv-formats` (the latter supplies the
   `date-time` format for the `Rfc3339` `$defs`). Validate the **predicate object only**, not the
   whole Statement (per the spec README §Validating examples).
6. **Content-address audit** — confirm `modelRef` / `probeCorpusRef` / `judgeModelRef` use an
   accepted `ContentAddressedRef` scheme (`sha256` / `git` / `ipfs-cid` / `vendor-model-card` /
   `uri`); reject opaque mutable refs (defense in depth atop the schema's `oneOf`).
7. **(optional) hash re-derivation** — if `transcript.jsonl` + `verdict.json` sidecars are supplied,
   re-compute `transcriptHash` + `verdictHash` and compare to the predicate. Absent sidecars, this
   step is skipped (and noted in output), not failed.

**`predicateType` pinning:** for `eval/v1` the only accepted value is
`https://specs.dojolm.com/eval/v1` (the eval predicate never had a `dojolm.example` emitter, so no
dual-accept window is needed). If/when the verifier is extended to the other three predicate types,
it MUST dual-accept the legacy `https://dojolm.example/spec/<name>/v1` per
`predicate-uri-pinning-migration.md` §Migration.

**Schema sourcing:** the schema is **vendored** with the verifier and pinned by content hash. The
verifier MUST NOT dereference `specs.dojolm.com/eval/v1` at runtime (overview.md §Predicate URI
resolution — the URI is a stable *identifier*, not a fetch URL; air-gapped verifiers must work).

### D5 — Output contract = existing `VerifyResult`, unchanged

The CLI emits `VerifyResult` (`types.ts:38`) as JSON to stdout:

| Field | Meaning |
|---|---|
| `valid` | AND of all applicable checks. |
| `runCount` | Number of `dojolm.eval/v1` Statements verified in the pack (1 for a single-bundle pack). |
| `signers[]` | `{ subject, fingerprint }` per signature — subject = cert identity / SAN (or static keyid), fingerprint = cert/key SHA-256. |
| `errors[]` | Structured, machine-greppable failure strings; empty iff `valid`. |
| `rekorRoot` | The verified+pinned Rekor signed-tree-head root hash. |
| `verifiedAt` | ISO-8601 verification wall-clock. |

**Exit codes:** `0` iff `valid === true`; `1` iff `valid === false` (errors populated); reserve `2`
for *usage* errors (bad flags / unreadable pack) so scripts can distinguish "invalid attestation"
from "operator mistake". A `--json` flag prints `VerifyResult`; default human output mirrors the
README's `✓ …` transcript.

### D6 — Rekor endpoint + trust-root config (defaults)

- Default Rekor = **self-hosted private instance** at `http://127.0.0.1:3000` (the Track-A
  Trillian+Rekor substrate), overridable via `--rekor <url>` (`VerifyOptions.transparencyLogUrl`).
- `--rekor-root <sha256>` pins an expected root (`VerifyOptions.rekorRoot`); mismatch ⇒ fail.
- `--historical-root <chain>` (`VerifyOptions.historicalRoot`) supplies the archived OIDC/Fulcio
  root chain so attestations signed under **retired** certs still verify — this is the
  E1-PHASE-4-M2 §6 + adversarial Round-2 **HIGH-4** cert-rotation fix; the contract must keep it.
- `sigstore.dev` public-good + Fulcio keyless is a **later** backend (matches `cosign-signer.ts`
  `RekorBackend` enum); the default stays private-rekor.

### D7 — Packaging

- **Binary name:** `dojolm-verify` (matches SDK skeleton + README).
- **ghcr image:** `ghcr.io/blackunicornsecurity/dojolm-verify:<tag>` — pins `cosign` + `rekor-cli`
  binary versions + vendored schema inside the image so `docker run … dojolm-verify <pack>` is
  hermetic.
- **HF Space:** a thin web wrapper (upload a pack → render the `VerifyResult`) for non-CLI auditors;
  same core, no new trust root.
- **Vendored schema** travels with both, pinned by hash (D4).

---

## 4. Dependencies (vetted at BUILD time, not now — Rule 16)

| Dep | Kind | Note |
|---|---|---|
| `cosign` | Go binary (runtime) | Sigstore; already used on the signing side. Pin version. |
| `rekor-cli` | Go binary (runtime) | Sigstore inclusion-proof verification. Pin version. |
| `ajv` + `ajv-formats` | npm (runtime) | JSON-Schema 2020-12 + `date-time`. **Not currently a repo dep.** |

Adding `ajv`/`ajv-formats` (and pinning the two binaries) triggers **Rule 16** at the build PR: SBOM
update, license check (Apache-2.0/MIT — both compatible), `npm audit` /
binary provenance, and a founder fire on the additions. Out of scope for this doc-only ADR.

---

## 5. Scope — what this is NOT

- **No §9 edits.** The verifier is a **read-only consumer**. It reads the *public* wire contract
  (in-toto Statement v1 + DSSE + the published JSON Schema) and imports **none** of the nine
  Phase-3-A DO-NOT-TOUCH files (the emitters, `cosign-signer.ts`, the WORM store). If it needs the
  `DsseEnvelope` shape it re-declares it (the public spec repo is standalone) or consumes the SDK's
  *public* type — never the frozen `bu-tpi` internal.
- **No emitter changes**, **no DB schema**, **no auth/RBAC**, **no signing**. Verification only.
- **No SDK type rewrite** in this track — the `types.ts` ↔ schema reconciliation (§1.2) shipped as a
  separate follow-up and is now **RESOLVED** (see §1.2).

---

## 6. Security considerations (adversarial + security lenses, folded in)

A verifier is a parser of attacker-influenced input (anyone can hand an auditor a malicious pack), so
the threat model is front-and-center:

- **Malformed / hostile envelope** — never `eval`/`JSON.parse` into trusted control flow; treat decode
  failures as `valid:false`, never throw uncaught. Cap pack size (DoS) before parse.
- **Schema-validation DoS / ReDoS** — `ajv` with `allErrors:false`, compiled once; the schema's regex
  `$defs` (`Sha256Hex`, CID pattern) are bounded and anchored — re-confirm no catastrophic
  backtracking at build (the CID alternation is the one to eyeball).
- **TOCTOU on artifact re-hash** — read each sidecar **once** into memory and hash that exact buffer;
  do not stat-then-reopen.
- **Path handling** — the pack/sidecar paths come from CLI args; resolve + reject traversal into
  unexpected roots when run as the HF-Space/ghcr service; `execFile` (never `exec`/shell) for the
  cosign/rekor binaries with an argv array (no interpolation).
- **Rekor MITM / spoofed log** — pin the root hash; support `--rekor-root`; verify the signed tree
  head, not just "an inclusion proof exists."
- **Cert rotation** — the `historicalRoot` path (D6) must not be droppable; without it, valid old
  attestations falsely report invalid (HIGH-4).
- **No PII in output (R-T1 / Rule 18)** — `VerifyResult` carries hashes, cert subjects, a root hash,
  a timestamp — no raw transcripts, no operator PII. Keep it that way; `operatorId` from the
  predicate is an internal id, not to be enriched with PII in any verifier log/telemetry.

---

## 7. Open questions for founder fire

**RESOLVED 2026-05-28 (founder fire):** all four fired as recommended — public spec repo
(Apache-2.0, zero monorepo dep) · shell-out to `cosign` + `rekor-cli` · cosign `.bundle` pack (with
the cosmetic `.dsse`→`.bundle` wording as a follow-up) · the D5–D7 defaults block (exit
`0`/`1`/`2` · private-rekor `127.0.0.1:3000` · vendored-schema-by-hash · ghcr image + HF Space).
Retained below as the decision record.

1. **D2 — verifier home + license:** public spec repo (Apache-2.0, zero DojoLM dep) **[recommended]**
   vs monorepo SDK (MIT) first?
2. **D3 — verification approach:** shell-out to `cosign` + `rekor-cli` **[recommended]** vs
   in-process `sigstore-js`?
3. **D1 — pack format:** canonical = cosign `.bundle` (self-contained, offline) **[recommended]** —
   confirm, and confirm the `.dsse`→`.bundle` wording cleanup is a cosmetic follow-up, not now.
4. **Defaults block (D5–D7):** exit-code map (`0`/`1`/`2`), `runCount` semantics, private-rekor
   `127.0.0.1:3000` default, vendored-schema-by-hash, ghcr + HF Space packaging — fire as a block
   unless redirected.

---

## 8. Risks & rollback

- **Doc-only PR:** rollback = `git revert` the ADR commit. No runtime, no state.
- **Forward risk:** if D2/D3 are fired wrong, the build wastes effort in the wrong repo/approach —
  which is exactly why this ADR gates the build. No code ships until the contract is fired.

## 9. References

- `packages/dojolm-sdk/src/verify.ts`, `types.ts`, `predicate-schema.ts`, `index.ts`
- `packages/bu-tpi/src/onigaeshi/cosign-signer.ts` (DSSE / in-toto / Rekor shapes; CRIT-1 binding)
- The eval-predicate spec (canonical form at `specs.dojolm.com`) — README, `docs/overview.md`,
  `schemas/dojolm.eval.v1.schema.json`, `examples/dojolm.eval.v1.example.json`
- `docs/architecture/predicate-uri-pinning-migration.md` (URI pin + dual-accept rule)
- Master Plan v1.0 §4.4 / M-11.2 (convergence trigger); §9 DO-NOT-TOUCH registry
- Mandatory Dev Rules 15 (contract-change stop), 16 (deps vet), 18 (R-T1 PII redaction)
