# Tatami

Tatami is the evidence workspace. It turns a security finding into a durable,
self-verifiable **proof**, lets you group related proofs into **cases**, and
produces a customer-safe **receipt** anyone can check offline.

A proof never copies a raw payload. It references the source record by id and
hash, carries redacted (pseudonymous) previews, and is anchored by a local
hash chain so tampering is detectable.

## Main Areas

- the **Evidence Rail** embedded in the Scanner surface
- the **Evidence Room** at `Intel & Evidence → Evidence`
- the **Proof detail** drawer (badges, fields, receipt export)
- the **Receipt** — a self-verifiable Markdown or JSON export

## Source Modules

A proof can be sourced from more than one module — each maps its own native
record into the same proof shape, read-only:

- **Scanner** — a scan run becomes a `live` proof of its findings.
- **Buki (SAGE seeds)** — a catalogued adversarial seed becomes a `fixture`
  proof. The operative seed payload is never read or shown (it is recorded as
  an `attack_technique` redaction and referenced by catalogue id only), and the
  proof is `not_replayable`: re-running a seed means launching the attack live,
  which is an Enterprise, consent-gated action — never something Tatami does
  from a read-only proof.
- **Jutsu (model registry)** — a registered model becomes a `stub` proof of
  model identity (provider + model id). Its resilience class is shown as
  **operator-attested, not a measurement**, so the proof carries no finding
  severity. Model/provider identifiers that look like a secret are dropped, not
  recorded.
- **Arena (matches)** — a completed battle becomes a `live` proof of the match
  outcome (winner, rounds, rule violations) with the referee's **observed**
  severity. Only the outcome summary is read — the combat prompts are never
  included — and warrior ids that look like a secret are dropped. A match is one
  stochastic battle, so it is `stochastic-single` and `not_replayable`.
- **Hattori (prompt hardening)** — a hardening **weakness** becomes a `live`,
  deterministic defensive finding (severity only; the analysed prompt is never
  read). No attack payload.
- **Kotoba (prompt rubric)** — a rubric **issue** becomes a `live`, deterministic
  prompt-quality finding (rubric category + severity; the scored prompt is never
  read). No attack payload.
- **Sengoku (temporal attacks)** — a multi-turn attack **run** becomes a `live`
  proof carrying the run **verdict** (safe / flagged / compromised /
  inconclusive) and attack type. The staged turn sequence is withheld
  (`attack_technique`); a multi-turn LLM attack is `stochastic-single` and
  `not_replayable`.

## The Evidence Rail (in Scanner)

When you view a scan in Haiku Scanner, the Evidence Rail shows that run as a
Tatami proof, read-only:

- evidence-quality badges (see below)
- a summary-level proof panel
- a single read-view trace event for the run

The Rail reads scan-run summaries only — it never reads sealed raw evidence and
never invents a value it does not have. Collapse it and it costs almost no extra
page weight.

## The Evidence Room

Open the Room from the nav (`Intel & Evidence → Evidence`). It has two tabs:

- **Proofs** — captured proofs, newest first
- **Cases** — investigation cases, newest first

Both lists page in cursor order, so long histories load a page at a time rather
than all at once.

## Proof Detail

Select a proof to open its detail drawer:

- **Evidence-quality badges**
  - **maturity** — is this `live`, `synthetic`, `fixture`, `stub`, or `replay`
  - **trust state** — e.g. `draft`, `verified`, `sealed`, `broken_chain`
  - **replay-safety** — whether the finding can be safely re-run
  - **reproducibility** — `deterministic`, `stochastic-characterized`,
    `stochastic-single`, or `non-reproducible`
  - a badge renders only when its value is present — Tatami never fabricates one
- **Proof fields** — title, summary, module, run id, severity, content hash, and
  the proof's place in its hash chain
- **Receipt export** — Copy or Download the receipt as Markdown or JSON
- **Filed under cases** — which cases reference this proof

## Explain

The proof detail has an **Explain** panel: ask a plain-language question about the
evidence and get an answer that is **grounded in this proof** (and the cases it is
filed under). It is deliberately not a free-form chatbot:

- it answers **only from the captured evidence**, and cites the **proof-ids** it
  used (shown as "Cited" chips) so you can check every claim;
- if the evidence does not contain the answer, it says so — the **"no evidence"**
  state — rather than inventing one;
- any suggested next step references a real Tatami route, never a made-up one;
- it generates no evidence values and saves nothing — it only explains what is
  already there.

## Case Risk Assessment

A case can carry the analyst's conclusions: a **mitigation**, the **residual
risk** that remains after it, and a **verifier note**. Edit them on the case
(they are part of what a case PATCH may change). These three are *customer-safe*
— keep them buyer-safe (no raw payload, no personal data, no secrets), because
they are surfaced verbatim in the receipt of any proof the case references. They
are stored on the case, not the proof, so they can be updated as an
investigation progresses without disturbing a proof's hash chain.

## Replay Safety & Deltas

Tatami tells you whether a finding can be re-run *before* anything is re-run, and
it never confuses "we re-read a stored result" with "we reproduced it".

- **Replay-safety verdict** — one of:
  - `replayable` — the captured input is present and nothing bars a re-run.
  - `replayable_redacted` — re-runnable, but only through redaction (the payload
    carries personal data or a secret).
  - `not_replayable` — cannot be re-run, with **reason codes** that say why
    (e.g. *missing prompt snapshot*, *retention expired*, *stub or fixture
    only*, *policy restricted*). A scanner proof is `not_replayable` because the
    scan stores the text *length*, never the scanned text.
- **Cached vs deterministic** — a *cached* replay re-reads the stored record and
  **proves nothing**, so it never claims reproducibility. Only a *deterministic*
  re-run of a deterministic source may claim it. Re-running against a live
  provider is an Enterprise feature and is queued, budget-gated, and consent-gated.
- **Deltas carry their sample count** — every reported change records `n` (how
  many observations) and a dispersion band. A change from a single observation is
  labelled **"single-observation, not significant"** rather than presented as a
  result; significance needs at least two observations.

## Verifying a Receipt

A receipt is the customer-safe projection of a proof: only customer-safe
previews survive, internal linkage is dropped, and the whole thing carries a
local hash chain. When the proof belongs to a case with a risk assessment, the
receipt also carries that **Risk assessment** section (and an affected-model
line when the run recorded one) — all bound into the same hash chain.

1. In the proof drawer, pick **Markdown** or **JSON** and choose **Copy** or
   **Download**.
2. Share or store the file.
3. Anyone can recompute the hash chain from the receipt's own fields and confirm
   it is intact. A single changed byte makes verification fail.

Verification is fully offline — it needs no external service, no signing
authority, and no network.

## Capturing a Proof

Capturing a scan run as a proof is operator-triggered and runs against an
existing scan record — it adds no new evidence and copies no raw payload.

In the **Evidence Room → Proofs** tab, use **Capture proof**: paste the scan
run id and capture it. The new proof then appears in the list.

> Note: the Scanner Evidence Rail itself is read-only — it shows the derived
> proof for the run you are viewing. A one-click "capture this scan" button in
> the Scanner surface is a planned convenience; today you capture from the Room
> with the run id.

## Good Use Cases

- preserving a scan finding as a durable, shareable proof
- grouping related findings into an investigation case
- handing a buyer or auditor a receipt they can verify themselves
- showing honestly whether a finding is live, synthetic, or fixture-derived

## Related Docs

- [Haiku Scanner](HAIKU_SCANNER.md)
- [Common Workflows](../COMMON_WORKFLOWS.md)
- [User API Reference](../API_REFERENCE.md)
