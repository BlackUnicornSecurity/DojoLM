# Predicate-type URI pinning & migration

**Status:** ACTIVE — **step 1 (verifier dual-accept) SHIPPED 2026-05-29 (BU-106)**; **step 2 (emitter flip) SHIPPED 2026-05-29 (BU-106)**. Dual-accept retained; legacy-acceptance retirement (step 5) still DEFERRED post-soak.
**Decision date:** 2026-05-28 (founder-fired). **Step-1 ship date:** 2026-05-29. **Step-2 ship date:** 2026-05-29 (separate founder fire).
**Owner area:** Sigstore/Onigaeshi audit substrate + the public `dojolm.eval` spec.
**Related:** `deploy/sigstore/README.md`, the eval-predicate spec (canonical form at `specs.dojolm.com`), external ticket BU-106 (HIGH).

---

## Context

DojoLM emits in-toto/DSSE predicates whose `predicateType` is a URI that identifies
the predicate schema. There are four predicate types across two surfaces:

| Predicate | Live code reference | Current value | Emits signed records? |
|---|---|---|---|
| Onigaeshi audit | `packages/bu-tpi/src/onigaeshi/audit-predicate.ts:41` (emitter const) | `https://specs.dojolm.com/audit/v1` ✅ flipped step 2 | **yes** |
| Bushido sign-off | `packages/bu-tpi/src/bushido/attestation-predicate.ts:28` (emitter const) | `https://specs.dojolm.com/bushido-signoff/v1` ✅ flipped step 2 | **yes** |
| Platform audit | `packages/dojolm-web/src/lib/audit/dojolm-platform-audit-predicate.ts:41` (emitter const) | `https://specs.dojolm.com/platform-audit/v1` ✅ flipped step 2 | **yes** |
| Eval | `packages/dojolm-sdk/src/types.ts:18` (PROVISIONAL `_type` literal) | `https://specs.dojolm.com/eval/v1` (pinned separately, `8d042b5b1a`) | **no** (skeleton) |

`dojolm.example` is an RFC-2606-style placeholder host. The public eval-predicate spec
canonicalises all four predicate types under the real
identifier host **`specs.dojolm.com`**:

```
# the 3 emitters also drop the /spec/ path segment:
https://dojolm.example/spec/<name>/v1   →   https://specs.dojolm.com/<name>/v1
# the eval SDK literal already lacks /spec/ — host-only change:
https://dojolm.example/eval/v1          →   https://specs.dojolm.com/eval/v1
```

The public spec previously disagreed with all four live references; as of **step 2
(2026-05-29)** all four are aligned on `specs.dojolm.com`. The three **emitters**
(`audit`, `bushido-signoff`, `platform-audit`) are the consequential ones — they write
signed records, so their flip required the step-1 dual-accept window first. The **eval**
reference is a PROVISIONAL SDK type literal that emits nothing yet (pinned separately).

## Decision (2026-05-28)

1. **URL host = `specs.dojolm.com`** (a stable *identifier*; DNS resolution can follow
   later — predicate-type URIs are identifiers, not fetch URLs). Chosen over
   `raw.githubusercontent.com/...`, which is a fetch URL that churns on repo
   rename/move and is a poor stable identifier.
2. **Public spec `eval/v1`** is pinned to `specs.dojolm.com/eval/v1` — **already done**
   in the spec draft (README, all four `examples/*.json`, `docs/`). This is the
   financing-trigger artifact.
3. **The three signed-record emitters migrate to `specs.dojolm.com/<name>/v1`** behind the
   step-1 dual-accept window. ~~Migration DEFERRED~~ → **flip SHIPPED step 2, 2026-05-29**
   (separate founder fire). Dual-accept stays so legacy-URI records keep verifying.
4. **The PROVISIONAL eval SDK literal** (`dojolm-sdk/src/types.ts:18`) is a separate,
   **lower-risk** item: it emits no signed records, so pinning it to
   `specs.dojolm.com/eval/v1` carries no verifier-compat cost. It can be done now in a
   small `packages/` PR (still under the 18 rules — it's a code change) to align the SDK
   with the spec the founder is about to publish, OR folded into the deferred migration.
   **Founder call — not done in this doc-only PR.**

### Why the live-constant migration was deferred (resolved — step 2 shipped 2026-05-29)

The reasons below justified deferring the flip behind a dual-accept soak window. All were
satisfied before step 2 fired: dual-accept shipped + soaked, and the founder issued a
separate fire for the flip.

- **It is a signed-attestation contract change.** `predicateType` is a signed field.
  Every attestation already written to the private Rekor/Trillian log carries the
  `dojolm.example/spec/<name>/v1` value. Changing the constant changes the field on
  all *future* records, so a verifier must accept **both** the old and new URI for any
  log that spans the cutover. This is a Rule-15 stop-condition ("changes a public API
  contract") → it needs its own full-process PR, not a drive-by string swap.
- **It is not on the financing-trigger critical path.** The public artifact that backs
  M-11.2 outreach is `eval/v1`, which is already pinned. The three live types are
  internal substrate identifiers; renaming them yields no outreach value and only adds
  verifier-compatibility surface.
- **Blast radius was real:** 3 production constants + **15** test files (see Scope). All
  moved together in step 2 (3 source + 15 test = 18 files).

## Migration procedure (when fired)

Execute as a single dedicated PR under the full 18 Mandatory Dev Rules.

1. **Verifier dual-accept first. — ✅ SHIPPED 2026-05-29 (BU-106).** Before changing any
   emitter, make the verifier / `predicateType` validation accept BOTH
   `https://dojolm.example/spec/<name>/v1` (legacy) AND `https://specs.dojolm.com/<name>/v1`
   (new) for each of the three types. Ship + soak this acceptance window before flipping
   emitters, so in-flight verification never breaks.
   - **Implementation (Mechanism A — auto-expand inside both `SignerPort.verify` impls):**
     new pure module `packages/bu-tpi/src/onigaeshi/predicate-type-aliases.ts` exports
     `acceptedPredicateTypes(expected)` (→ frozen `[legacy, canonical]` pair for the 3
     migrating types, else `[expected]`) + `isPredicateTypeAccepted(actual, expected)`.
     `InProcessTestSigner.verify` (`cosign-signer.ts`) gates on `isPredicateTypeAccepted`;
     `CosignCliAdapter.verify` (`cosign-signer-cli-adapter.ts`) loops
     `acceptedPredicateTypes` calling the extracted private `verifyOne` per candidate
     (cosign `--type` is single-valued), first verified match wins, bounded ≤2.
   - **Why Mechanism A:** the §9 caller `audit-worm-writer.ts` + the bushido sign-off chain
     inherit dual-accept through the unchanged `signer.verify(...)` call — zero §9 edits,
     public `verify` signature unchanged.
   - **Cross-package drift guard:** `packages/dojolm-web/src/lib/audit/predicate-type-dual-accept.test.ts`
     fails if `DOJOLM_PLATFORM_AUDIT_PREDICATE_TYPE` ever falls out of the accept-set
     (bu-tpi is the lower package and cannot import the dojolm-web constant upward).
   - **Soak window now open** — flip emitters (step 2) only after soak + founder fire.
2. **Flip the three emitter constants** to `https://specs.dojolm.com/<name>/v1` (host
   change + `/spec/` drop). **— ✅ SHIPPED 2026-05-29 (step 2).**
   - `audit-predicate.ts` → `https://specs.dojolm.com/audit/v1`
   - `attestation-predicate.ts` → `https://specs.dojolm.com/bushido-signoff/v1`
   - `dojolm-platform-audit-predicate.ts` → `https://specs.dojolm.com/platform-audit/v1`
3. **Update the 15 test files** per a keep/flip split (full list in Scope) + `bu-tpi`
   `dist/` regenerated via `npm run build` so dojolm-web sees the canonical constant.
   ≥1 explicit legacy-URI dual-accept regression retained per type. **— ✅ SHIPPED
   2026-05-29.** Note: the actual touched set differs from the original prediction —
   `audit-worm-writer-cosign.test.ts` + `signoff-store.test.ts` did NOT need edits (they
   assert via the imported constant, so they tracked the flip automatically; their only
   `dojolm.example/spec` hit is a `/wrong/v1` negative that legitimately stays), while
   `predicate-type-aliases.test.ts` + `predicate-type-dual-accept.test.ts` WERE updated.
4. **Bump-and-pin commit** per Conventional Commits (`feat(rbac)`/`feat(telemetry)` or a
   dedicated scope), 100% coverage on touched files, 4-persona review.
5. **Retire legacy acceptance only later** — after every legacy-URI record has aged out
   of retention or been re-signed. Track as a follow-up; do not drop dual-accept in the
   same PR.

## Scope / impact

- **3 signed-record emitter constants** (paths above) — the contract-changing migration (flipped step 2).
- **1 PROVISIONAL eval SDK literal** (`dojolm-sdk/src/types.ts:18`) — separate, no dual-accept needed (no records); pinned separately in `8d042b5b1a`, NOT bundled into step 2.
- **15 test files** updated in step 2 (the actual touched set):
  `bu-tpi/src/onigaeshi/__tests__/{audit-predicate,cosign-signer,cosign-signer-cli-adapter,predicate-type-aliases}.test.ts` (4);
  `dojolm-web/src/lib/audit/cosign-attestor{,-atemi,-mitsuke-triage,-auth-rbac,-retention,-hattori,-llm-calls,-kotoba,-eval-readers,-members-invites}.test.ts` (10);
  `dojolm-web/src/lib/audit/predicate-type-dual-accept.test.ts` (1).
  Predicted-but-untouched: `audit-worm-writer-cosign.test.ts` + `bushido/__tests__/signoff-store.test.ts` (assert via the imported constant → tracked the flip automatically; each retains one `/wrong/v1` negative).
- **Verifier / validation accept-list** — unchanged in step 2 (shipped in step 1); dual-accept stays.
- **No DB schema, no auth/RBAC logic** — string-constant change only.

## Risks & rollback

- **Risk:** flipping emitters before the verifier dual-accepts → verification fails for
  newly-signed records. Mitigated by the strict step ordering (dual-accept first).
- **Risk:** dropping legacy acceptance too early → old records fail verification.
  Mitigated by deferring retirement to a separate post-soak PR.
- **Rollback:** revert the emitter-flip commit; the verifier keeps dual-accepting, so
  reverted emitters (legacy URI) still verify. No state to unwind.

## References

- The eval-predicate spec (canonical form at `specs.dojolm.com`; migration mapping
  table in the spec's push instructions).
- `deploy/sigstore/README.md` — substrate operator runbook.
- Mandatory Dev Rule 15 (contract-change stop condition), Rule 18 (R-T1).
- External: BU-106 (HIGH) — cosign predicate URIs `dojolm.example` → `specs.dojolm.com`.
