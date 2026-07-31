<!--
PR template — Wave 0 (2026-04-18) + Mandatory Dev Rules 1-18 (2026-05-27).
Every PR MUST check every applicable box below. Unchecked = block.

Canonical references:
- CLAUDE.md §"Mandatory dev rules" (Rules 1-18, hardcoded 2026-05-27)
- docs/dev/templates/pr-checklist.md (full Rule 1-18 checklist with evidence fields)
-->

## Mandatory dev rules attestation (Rules 1-18)

**Per CLAUDE.md §"Mandatory dev rules" — every PR enforces all 18 rules. Link or paste the filled `docs/dev/templates/pr-checklist.md` below. Unchecked = block.**

- [ ] **Rule 1** — Context awareness (docs + checklist + code + V1 + canvas + §9 + worktree + task-restate). Task checklist linked: ___
- [ ] **Rule 2** — Doubt → history first (lessonslearned + QA + memory + git log)
- [ ] **Rule 3** — Docs updated (user + project + technical + master impl list + task checklist)
- [ ] **Rule 4** — 100% coverage EVIDENCED (paste report below in Test plan)
- [ ] **Rule 5** — Lint + format + typecheck + dead code all clean (paste outputs)
- [ ] **Rule 6** — Multi-persona review CLEAN (dev + architect + adversarial + security; loop until zero findings any severity)
- [ ] **Rule 7** — Conventional Commits + Co-Authored-By trailer if AI agent contributed
- [ ] **Rule 8** — Handover prompt generated in the maintainer's private handoffs records. Session PR count: ___
- [ ] **Rule 9** — All subagent dispatches FOREGROUND with status reported at dispatch + return
- [ ] **Rule 10** — Rollback plan documented (see Rollback section below)
- [ ] **Rule 11** — Performance budget measured (see Performance section below)
- [ ] **Rule 12** — Accessibility WCAG AA evidenced (UI PRs only — paste contrast ratios + keyboard nav + SR labels)
- [ ] **Rule 13** — Cost guard — tokens consumed: ___, cumulative session: ___
- [ ] **Rule 14** — Lessons learned captured (if novel/repeat) — entry: ___
- [ ] **Rule 15** — Stop conditions all green (LOC ≤ 500 + no auth/schema/§9/deps/API/decision-reversal)
- [ ] **Rule 16** — Dependencies vet (if new dep added — SBOM + license + audit + founder fire)
- [ ] **Rule 17** — Subagent outputs persisted in the maintainer's private persona-review records
- [ ] **Rule 18** — PII redaction R-T1 (if PII-adjacent — hash/redact at writer side + unit tests)

**Full pre-close checklist:** `docs/dev/templates/pr-checklist.md`. Copy into PR body OR link the filled version: ___

---

## Summary

<!-- 1-3 sentences: what changes, and why. Link the ticket / ADR. -->

**Story:** link to the story / task-checklist doc

## Type

- [ ] feat — new feature
- [ ] fix — bug fix
- [ ] refactor — code restructure without behavior change
- [ ] docs — documentation only
- [ ] test — tests only
- [ ] chore — tooling / build
- [ ] perf — performance
- [ ] ci — CI / release automation

## Completeness checklist (Wave 0)

### Data + behaviour

- [ ] Live data — no `MOCK_*` / `HARDENED_PROMPT` / `MOCK_EVIDENCE` / `MOCK_ANALYSIS` imported in a production code path
- [ ] OR the feature renders a visible `<FeatureBadge />` in preview / partial mode and backend limits are documented
- [ ] Loading state rendered while data is fetching
- [ ] Error state rendered on fetch / action failure (user-friendly copy)
- [ ] Empty state rendered when the backend returns no data
- [ ] Persistence model updated when the feature is stateful

### Security

- [ ] New `src/app/api/**/route.ts` imports `withAuth` or `createApiHandler` OR carries a `// PUBLIC ENDPOINT: <reason>` comment and is on the allow-list
- [ ] All user inputs validated at the boundary (Zod preferred)
- [ ] Rate-limit class chosen for the route (default, strict, public)
- [ ] Audit-log event emitted for state-changing actions
- [ ] No secrets committed (gitleaks scan passes)

### Tests

- [ ] Unit tests for data transforms and validators
- [ ] API tests for every new / modified route (auth + happy-path + 4xx)
- [ ] E2E coverage for every first-class tab or long-running workflow touched
- [ ] Cross-module coverage when this change crosses module boundaries (e.g. Bushido → Atemi, Buki → Scanner, Arena → reports)

### Quality

- [ ] No unmounted exported React components added
- [ ] If the module has a live `/api/<slug>` route, UI reads / writes through it rather than `localStorage`
- [ ] Widget copy matches mounted module reality (no "Not yet available" pointing at a live surface)
- [ ] Sensei / nav suggestions reference only ids present in `src/lib/constants.ts` `NAV_ITEMS`
- [ ] No retired module id (`llm`, `strategic`, `armory`, `kumite`, `testing`, `attack`, `ronin`, `atemi`, `time-chamber`, `attackdna`, `bounty`, `arena-standalone`) appears as a navigation target
- [ ] Telemetry event registered for new user-facing features (`feature_used`, `feature_error`, `preview_clicked`, `mock_served`)

### Docs

- [ ] `README.md` nav block updated if `NAV_ITEMS` or `page.tsx` changed
- [ ] `docs/user/modules/*.md` updated for any module shell change
- [ ] `docs/DOCUMENTATION-INDEX.md` updated if new top-level doc added
- [ ] `tools/verify-doc-metrics.js` passes locally (`npm run verify:docs`)

### Repo-split boundary (DojoLM Master Plan v1.0 §3 / E0-REPO-BOUNDARY-HOOK)

- [ ] **Confirm: no SaaS-only path touched** (multi-tenant routing / billing / per-customer deploy / customer admin portal / M-7 curator-internal-infra / Big-4 partner integration) — see `.dojolm-repo-boundary.yaml`. The `repo-boundary-scan` workflow enforces this server-side.
- [ ] **License header (SPDX):** new source files carry the correct per-tier header — `// SPDX-License-Identifier: Apache-2.0` for community code, `// SPDX-License-Identifier: BUSL-1.1` for enterprise (`ee`) code (use the `#` form for YAML/shell). See `docs/dev/license-policy.md`.
- [ ] **DCO sign-off** present (`git commit -s`) — see `CONTRIBUTING.md`.

## Consumer bar self-attest

<!--
Authoritative criteria: the maintainer's private consumer-bar criteria §1 (criteria 1-16).
Auditor-of-Auditors CI gate (.github/workflows/ui-audit.yml) machine-enforces
these on every PR — these checkboxes are the human-readable attestation layer.
-->

- [ ] This PR introduces no new violation of the consumer-bar criteria §1 (criteria 1-16).
- [ ] Visual-regression baselines updated where rendered DOM/CSS changed (consumer-bar §2 — desktop 1440×900 + mobile 320×568).
- [ ] Acceptance criteria from the linked story are tested (Playwright + unit + a11y where applicable).

## Test plan

<!-- Bulleted checklist of TODOs for testing this PR. -->

- [ ] ...

## Screenshots / recordings

<!-- Only required for UI changes. Include before/after. -->

## Rollout + kill-switch

- [ ] Feature flag OR mode (demo / preview / partial) gating this change
- [ ] Kill-switch path documented if flag fails open

## Rollback plan (Rule 10)

```
Revert command:        <e.g. git revert <commit-sha>>
State restoration:     <any DB rollback / cache flush / file restore needed>
Feature flag flip:     <flag name + value if rollback via flag>
Verification post-rollback: <how to confirm rollback worked>
```

## Performance budget (Rule 11)

```
Bundle size delta (KB):  <before / after / delta>
Render-time delta (ms):  <p50 / p95 before vs after>
Query count delta:       <queries before / after / delta>
```

## Persona-review summary (Rule 6 + 17)

| Persona | Findings (initial) | Findings (final) | Rounds |
|---|---|---|---|
| Dev | C: __ H: __ M: __ L: __ | 0 / CLEAN | ___ |
| Architect | | 0 / CLEAN | |
| Adversarial | | 0 / CLEAN | |
| Security | | 0 / CLEAN | |

Full outputs: the maintainer's private persona-review records.

## Handover (Rule 8)

Handover prompt: the maintainer's private handoffs records.
PR count this session: ___ (if ≥ 5: surface "change session recommended" to user)
