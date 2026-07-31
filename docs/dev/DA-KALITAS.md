<!-- SPDX-License-Identifier: MIT -->
# Engineering Workflow Rules (DA KALITAS) — DojoLM adaptation

**Status:** ACTIVE — MANDATORY. Binding on every coding task (human or agent) in this monorepo (`packages/`, `deploy/`, `tools/`, `scripts/`, `docs/`).
**Adopted:** 2026-06-10, founder-directed (adapted from an earlier internal process framework).
**Authority boundary:** process law only. On ANY conflict, [`docs/dev/MANDATORY-DEV-RULES.md`](MANDATORY-DEV-RULES.md) (founder-locked 2026-05-27) wins. DA KALITAS **extends** Rules 1–18 — it never relaxes them.

> **Prime Directive:** No code is written before the task is understood, and no PR is merged before it is proven — **by evidence, not by claim**. Nine phases, each a gate. Sign-off is earned by audit, never assertion.

## Defers to (doesn't replace)

| Concern | DojoLM authority |
|---|---|
| Dev rules canon (all 18) | `docs/dev/MANDATORY-DEV-RULES.md` |
| Test scope, coverage bar, evidence | Rule 4 + `team/testing/QA/QA-MASTER-PLAN.md` + `team/testing/QA/FULL-QA-RUN-CHECKLIST.md` |
| Branch/commit/PR/merge authority | Rule 7 (Conventional Commits, squash-merge) + founder "fire" protocol |
| Approval routing | Single-operator model: Rule 15 stop conditions → founder fire. No L1/L2/L3 ladder exists here. |
| Prod protection | Master plan §9 Phase-3-A DO-NOT-TOUCH — agent-facing source: tracked `.dojolm-section9-do-not-touch.txt` (enforced by `.husky/pre-commit` Layer 0, override `DOJOLM_ALLOW_SECTION9=1` = founder fire only). The master plan itself is gitignored/operator-local — do not cite it as a cold-agent read path. |
| DB schema changes | Rule 15 founder gate (no migration-reservation ledger exists in this repo) |
| OSS/SaaS boundary | `.dojolm-repo-boundary.yaml` + `docs/dev/repo-split-discipline.md` |

---

## The Nine Phases

### Phase 0 — Context Acquisition (before ANY code)

Complete the task checklist from [`docs/dev/templates/task-checklist.md`](templates/task-checklist.md) → save to `team/QA/checklists/<task-slug>.md` (= Rule 1, all 7 checks):

1. Study existing docs — start at `docs/DOCUMENTATION-INDEX.md` (+ `team/design-system/INDEX.md` for UI — operator-local/gitignored, absent in cold clones; note unavailability in the checklist instead of skipping silently). **Code outranks prose.**
2. Locate the task in the active plan / epic register / program register — no checklist exists → create one FIRST.
3. Porting/update work → read the original artifact in full (V1 reference per Rule 1.3).
4. **Read every file you'll touch + its callers/callees; trace blast radius, don't infer.** This is the "agent checks the code before any change" rule — non-negotiable.
5. Respect invariants (Phase 2) + §9 DO-NOT-TOUCH cross-check against the tracked `.dojolm-section9-do-not-touch.txt` + worktree edit-target verification (Rule 1.5–1.6).
6. Restate the task goal in one sentence + identify scope boundaries before any edit (Rule 1.7).

**Exit artifact:** completed checklist §Pre-flight naming docs read, plan entry, impacted files, blast radius. No edits before it exists.

### Phase 1 — Doubt Protocol

Question arises → search `team/lessonslearned.md` (+ archives) + `team/QA/` prior reviews + agent auto-memory + git log FIRST (= Rule 2, all 4 history checks). Escalate to founder only after recorded knowledge is exhausted. Non-obvious problems solved get recorded back in Phase 3 (Rule 14).

### Phase 2 — Implementation Invariants

- **Immutability** — never mutate in place; always create new objects.
- **Factual integrity** — no invented personal facts/identifiers; unknown → `[unknown]` or ask.
- **No scope creep** — out-of-scope improvements become separate tasks/tickets, never smuggled in.
- **Git hygiene** — parallel agents work in isolated worktrees; ALL Edit/Write paths use the worktree path (Rule 1.6); never `reset --hard` an unverified tree; never force-push `main`.
- **API conventions** — follow the existing DojoLM contracts (`docs/api/openapi.yaml`, route-local Zod schemas). No new envelope conventions without an ADR.
- **Boundary discipline** — nothing matching a `.dojolm-repo-boundary.yaml` deny-glob lands on the public branch; PII redaction per Rule 18 (R-T1); secrets NEVER in code, docs, or commit messages — env vars / Docker secrets only.
- **Founder-gated surfaces** — auth/RBAC/session/WebAuthn, DB schema, §9 files, public API contracts, new deps: HALT per Rule 15 before writing code.

### Phase 3 — Documentation Gate (before PR, in-branch)

= Rule 3, all 4 gates + Rule 14:

- [ ] User docs (`docs/user/`) if operator-visible behavior changed
- [ ] Project docs (`team/docs/` — note `.gitignore:33`: new files there need `git add -f`)
- [ ] Technical docs (TSDoc, READMEs, ADRs in `docs/architecture/`)
- [ ] Epic/program register row updated + task checklist ticked
- [ ] `team/lessonslearned.md` append (novel pattern or repeat issue only)
- [ ] Branded HTML render for every touched human-facing doc (user/operator/marketing docs, per `docs/dev/brand-kit-footer.md`; internal process checklists/registers exempt — a deliberate scoping adaptation)

**Rule: checklists are evidence-based — tick only after auditing the artifact on disk. A blind tick = Phase-6 adherence failure.**

### Phase 4 — Quality Gate (LOCAL only — no general CI, per standing founder rule)

- **Coverage bar:** 100% on touched files, **measured not estimated** (= Rule 4.1; `vitest --coverage` scoped run; package thresholds are the floor, touched-file 100% is the bar).
- **Required test classes** (= Rule 4.2): unit · edge-case (empty/max/malformed/unicode/locale) · behavioral-regression (every prior bug pinned) · flow-level failure · auth-gap (unauthenticated/wrong-role/expired/CSRF/SSRF/origin) · integration/E2E across boundaries where the change crosses one.
- **Evidence:** literal command outputs pasted into the task checklist §Quality gates + PR body. "Tests pass" without a receipt = unbacked claim = **gate fail**.

### Phase 5 — Code-Health Gate

All **diff-scoped** (legacy debt doesn't fail your PR — but is ticketed):

- Lint **zero warnings** on touched files (`npx eslint <files>` — Rule 5.1 bar), format strict (`npx prettier --check <files>`)
- Types zero errors (`npx tsc --noEmit -p packages/<pkg>`)
- **Secrets: `gitleaks protect --staged` (or `gitleaks detect` on the diff range) — locally, since CI is off.** This line is not optional.
- Cleanliness: no dead code, no debug logging, functions <50 lines, files <800, nesting ≤4, no hardcoded values

### Phase 6 — Senior-Persona Audit-Loop — MANDATORY (the heart of DA KALITAS)

**Six lenses, every one runs.** This is Rule 6's four personas + two additional lenses (additive — Rule 6 is never reduced):

| Lens | Hunts | Subagent |
|---|---|---|
| Sr. Dev review (Rule 6.1) | bugs, logic, contract breaks, test quality | `code-reviewer` |
| Sr. Architect (Rule 6.2) | design fit, coupling, layer violations, canvas-direction (UI) | `architect` |
| Adversarial (Rule 6.3) | "how do I break this?" — abuse, race, injection. **Must RUN the artifact, not just read it** (lesson E1-PHASE-4-M2.S3 / PR #937, 2026-06-06: multiple deploy traps passed static review and `docker compose config` and only failed at runtime — see `team/lessonslearned.md` S3 entry) | `general-purpose` |
| Security (Rule 6.4) | OWASP, authz, secrets, PII/R-T1, supply-chain, boundary | `security-reviewer` |
| **Documentation** (DA KALITAS addition) | docs accurate + in sync with the diff? Phase-3 ticks truthful? | `general-purpose` |
| **Adherence** (DA KALITAS addition) | spec respected? phases skipped? scope creep? dead code? blind ticks? | `general-purpose` (+ `refactor-cleaner`) |

**Assumptions:** the code was written by a junior; all prior gates MAY HAVE FAILED — re-verify Phases 3–5 from scratch.
**The loop:** run all 6 (plus falsifiability when triggered) → collect EVERY finding incl. LOW → fix all → re-run every lens that ran → repeat until a clean pass = **zero findings at any severity**. "Mostly clean" is not a pass. Record iterations + findings closed in the checklist; persist full outputs to `team/QA/persona-reviews/<task-slug>/` (slug-form directory convention, adopted over Rule 17's literal `PR-<NUMBER>/` form to match dominant existing practice — divergence flagged here, not silent).
**Falsifiability lens — additively MANDATORY when triggered** (the diff touches a GO/NO-GO or pass predicate, a kill-criterion, or a gate report, or the diff/PR/commit summary carries a headline/EPIC/handover claim; skip only when none apply). A conditional seventh lens that runs and loops with the six — decisions fireable both ways, no bar silently relaxed, post-hoc analyses not passed off as registered results:

- **GO/pass predicate** — construct the input/config that makes it return false; no constructible failing input → unfalsifiable → (HIGH).
- **Kill-criterion** — exhibit a reachable state in which it fires; a criterion that cannot fire is decoration, not a criterion → (HIGH).
- **Headline ↔ caveat parity** — a summary/EPIC/handover claim stronger than the code or gate-report caveat is caveat evaporation, and a post-hoc analysis presented as a registered/pre-declared result is the same failure → (HIGH).
- **Interlock constraint** — won by strengthening the test, never by weakening a fail-closed safety interlock; a "fix" that relaxes one → (BLOCKER).

**Founder guard:** no autonomous loop-to-merge on founder-only surfaces (§9 files, auth/RBAC, schema, license/legal text, irreversible ops: force-push, history rewrite, repo visibility, publish) — escalate BEFORE Phase 6.

### Phase 7 — Closing Gate (merge)

All evidenced, no partial credit:

- Phase 0 artifact exists · Phase 3 complete · Phase 4 receipts attached · Phase 5 green · Phase 6 clean pass recorded
- Local merge gate green: `npm run typecheck` + scoped vitest (the no-CI merge bar) + `tools/check-repo-boundary.mjs` on staged paths
- PR body carries Rules 10–13 (rollback plan, perf budget, a11y evidence for UI, cost guard)
- **Self-audit ban (solo-project form):** the author-session must not self-certify — independence comes from the Phase-6 subagent lenses + founder fire as merge authority. Merge per the founder-approval protocol ("fire"/clear approval signal); Conventional Commit + Co-Authored-By trailer.

### Phase 8 — Handover (after PR)

- Generate + offer a self-contained handover after every PR (`docs/dev/templates/handover-template.md` → `team/handoffs/HANDOFF-<date>-<slug>.md`). Fresh agent must be able to pick up cold. (Note: `team/handoffs/` is gitignored — copy program-critical handovers into the tracked program dir.)
- **Every 5 PRs:** auto-produce a handover + tell the operator to start a new session (hard checkpoint — long sessions degrade rigor). (= Rule 8.)

## Subagent Operating Rule (all phases)

FOREGROUND always — no `run_in_background` (= Rule 9). Report at dispatch (ETA) + return (one-line outcome). Independent reviewers run in PARALLEL (single dispatch, multiple agents).

## Definition of Done (the per-commit gate)

```
[ ] P0  Context artifact exists (team/QA/checklists/<slug>.md §Pre-flight complete)
[ ] P1  Lessons/history consulted (4 sources)
[ ] P2  Invariants held (incl. boundary + §9 + worktree-target)
[ ] P3  Docs updated in-branch, evidence-audited
[ ] P4  Touched-file coverage 100%, RECEIPT attached
[ ] P5  Lint + format + types + gitleaks + cleanliness green (diff-scoped)
[ ] P6  Audit-loop CLEAN PASS (6 lenses + falsifiability when triggered, all severities, looped)
[ ] P7  Closing gate complete, self-audit ban respected, founder authority honored
[ ] P8  Handover offered (auto at 5th PR)
```

**Anything less = not done. Evidence over claims, always.**

## Enforcement

Mechanical: `.husky/` hooks (incl. the §9 Layer-0 block on `.dojolm-section9-do-not-touch.txt` paths) + `tools/check-repo-boundary.mjs` + `tools/verify-doc-metrics.js` + local gitleaks. Judgment phases (0–3, 6–8; Phase 7 is mixed — mechanical merge gate + judgment fire): instructed + audited — the Phase-6 **Adherence lens exists to catch skippers**.

---

*Adopted 2026-06-10 under founder direction. To amend: founder fire required (same bar as `MANDATORY-DEV-RULES.md`). On conflict, MANDATORY-DEV-RULES wins.*
