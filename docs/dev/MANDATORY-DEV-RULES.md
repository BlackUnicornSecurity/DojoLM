<!-- SPDX-License-Identifier: MIT -->
# Mandatory Dev Rules — DojoLM / BU-TPI

**Status:** HARDCODED. Founder-locked 2026-05-27.
**Applies to:** every coding task in DojoLM / BU-TPI — AI agent or human dev. No exceptions.
**Why tracked here:** `CLAUDE.md` (the agent-local mirror of these rules) is gitignored (`.gitignore:209`). This file is the **tracked, repo-canonical source of truth** so any dev cloning the repo is enforced to follow the rules. `CONTRIBUTING.md` + `.github/pull_request_template.md` + `CLAUDE.md` all defer to this file.
**Companion:** the per-commit **Definition of Done** that operationalises these rules — the nine-phase process and the six-lens review loop (Rule 6, plus a conditional falsifiability lens when triggered) — is [`docs/dev/DA-KALITAS.md`](DA-KALITAS.md).

These rules supersede any default behavior. Failure to follow = the work is incomplete + the PR cannot merge.

---

## Rule 1 — Context awareness BEFORE any task

Before touching any code:

1. **Read existing documentation** for the surface / module touched. If no task checklist exists, **create one** from [`docs/dev/templates/task-checklist.md`](templates/task-checklist.md) → save to `team/QA/checklists/<task-slug>.md`.
2. **Read the actual production code** (`.tsx` / `.ts` / `.css` / `.py` files in scope).
3. **Read the V1 reference** (`team/visual-review-2026-05-19/<surface>/<surface>-v1.png` for UI; equivalent V1 code for non-UI).
4. **Read the canonical canvas** for UI work — open `team/design-system/INDEX.md` FIRST + follow its routing table to the canvas + handoff/ docs.
5. **Verify touched files are NOT in master plan §9 DO-NOT-TOUCH** (operator-local master plan §9; agent-facing source: the tracked `.dojolm-section9-do-not-touch.txt`). If any is: HALT + ask founder for an explicit §9 carve-out. NEVER edit §9 files silently.
6. **Confirm worktree edit-target alignment** — in worktree sessions, ALL Edit/Write absolute paths MUST use the worktree path, not the main-repo path. Run `git worktree list` + verify cwd matches the active branch.
7. **Understand the task** — restate the goal in one sentence + identify scope boundaries before any edit. Prevents scope deviation, cascade bugs, feature breakage.

**No edits before the checklist is created + all 7 checks done.**

## Rule 2 — Doubt → check documentation + history FIRST

When in doubt or a question arises:

1. Grep `team/lessonslearned.md` for relevant topic section(s).
2. Grep `team/QA/` for prior hallmark audit / brutal review / strategic review on the surface.
3. Read the agent memory index + relevant topic files (location varies per agent setup).
4. Search git log for prior fix attempts on the same issue.

Only after all 4 history-checks return empty should you surface a new founder question.

## Rule 3 — BEFORE closing a PR, document / update

1. **User documentation** in `/docs/user/` for any user-facing change.
2. **Project documentation** in `team/docs/` for any planning / process / epic change.
3. **Technical documentation** — inline JSDoc / TSDoc, README sections, ADRs in `docs/architecture/`.
4. **Master implementation list + checklists** — update the active epic register row + check off completed items in `team/QA/checklists/<task-slug>.md`.

**No PR close without all 4 documentation gates green.**

## Rule 4 — BEFORE each PR, testing controls (evidenced, not claimed)

1. **100% test coverage** on touched files — evidenced via coverage report pasted in PR body. **< 100% is NOT acceptable.** No unbacked claims.
2. Test categories: **edge cases** (empty / max / malformed / unicode / locale) · **behavioral regressions** (every prior bug pinned) · **flow-level failures** (submit → API → success → error → network drop) · **auth gaps** (unauthenticated / wrong role / expired / CSRF / SSRF / origin mismatch).
3. **Local quality gate** (no CI/CD) — typecheck + vitest + lint + format all green. Pre-existing baseline failures documented.

**Evidence-based only. Paste outputs in PR body.**

## Rule 5 — BEFORE each PR, code audit

1. **Linting + formatting** — `npx eslint <files>` + `npx prettier --check <files>`. Zero warnings on touched files.
2. **Type checking** — `npx tsc --noEmit -p packages/<package>`. Zero new errors in touched files.
3. **Dead code scan** — no unused imports / exports / vars.

## Rule 6 — BEFORE each PR, multi-persona review (MANDATORY)

Run **all 4 senior personas in parallel** (single dispatch, multiple agents):

1. **Senior dev — code review.** Assumes the code was written by a JUNIOR dev. Flags readability, naming, function length, dead code, missing types, magic numbers.
2. **Senior architect — architecture review.** Flags component boundaries, layer violations, primitive misuse, prop drilling, state placement, cross-module imports. **+ canvas-direction check** (does the PR converge toward the validated canvas?).
3. **Senior adversarial reviewer — adversarial audit.** Flags race conditions, off-by-one, untrusted input, error swallowing, retry storms, infinite loops, memory leaks.
4. **Senior security reviewer — security audit.** Flags secrets, XSS, SQLi, SSRF, CSRF, prototype pollution, supply-chain, auth bypass, PII leakage, audit-log gaps.

**Each persona assumes the previous control points (Rules 4 + 5) MAY HAVE FAILED.** Each performs independent verification.

**The personas LOOP** — address every finding (incl. LOW) → re-run all 4 → loop until ALL 4 return CLEAN PASS (zero findings any severity). No "fix later" tickets. Persist full outputs per Rule 17.

## Rule 7 — Only THEN can the PR close + commit

Close gate: Rules 3 + 4 + 5 + 6 all green. Commit per Conventional Commits (`<type>(<scope>): <description>`) + Co-Authored-By trailer if AI agent contributed.

## Rule 8 — Handover at end of session / PR

1. Generate a **self-contained handover prompt** at `team/handoffs/HANDOFF-<YYYY-MM-DD>-<topic-slug>.md` (template: [`docs/dev/templates/handover-template.md`](templates/handover-template.md)). Next agent acts cold without prior transcripts.
2. Offer the handover to the user.

**Auto-handover-every-5-PRs:** every 5 PRs shipped in a session, surface that the user should change session to maintain context quality.

## Rule 9 — Subagent dispatch: FOREGROUND + STATUS

1. **ALWAYS FOREGROUND.** No `run_in_background: true` on Agent dispatches.
2. **REPORT STATUS at dispatch + return.** At dispatch: "<agent> dispatched. ETA ~<N> min." At return: "<agent> returned. <one-line outcome>."
3. Multiple parallel agents: list all at dispatch with ETAs.

## Rule 10 — Rollback plan per PR

PR body documents the rollback procedure: revert command + state-restoration step + feature-flag flip if applicable.

## Rule 11 — Performance budget per PR

PR body documents bundle-size delta + render-time delta + query-count delta. Run `npm run build` before + after; paste delta.

## Rule 12 — Accessibility WCAG AA evidenced

Every UI PR: contrast ratios calculated (paste output) + keyboard nav verified (Tab sequence) + screen reader pass (announced labels). Evidence in PR body, not claims.

## Rule 13 — Cost guard

LLM token spend per PR documented + cumulative session spend surfaced in handover.

## Rule 14 — Lessons learned auto-capture

If a novel pattern emerges OR a prior issue repeats: append to `team/lessonslearned.md` under the relevant category header. Format: short title + root cause + fix + commit ref. Routine work is NOT logged.

## Rule 15 — Stop conditions per PR

Halt + escalate to founder BEFORE writing code when ANY of:
- PR scope > 500 LOC (excluding tests + docs)
- Touches auth / RBAC / session / WebAuthn
- Modifies DB schema (migrations, column adds, type changes)
- Touches DO-NOT-TOUCH §9 files
- Deletes > 5 files
- Adds a new external dependency
- Changes a public API contract
- Reverses a prior founder-gated decision

Surface as one founder question with options. Wait for fire.

## Rule 16 — Dependencies vet

Any new npm/pip dep requires: SBOM update (`team/QA/sbom-<YYYY-MM-DD>.json`) + license check (MIT-outbound + private-SaaS-inbound compatible, see [`docs/dev/license-policy.md`](license-policy.md)) + supply-chain audit (`npm audit` / `pip-audit`) + founder fire.

## Rule 17 — Subagent output persistence

Every persona review output (Rule 6) persisted to `team/QA/persona-reviews/PR-<NUMBER>/<persona>-<YYYY-MM-DD>.md` — full text, not just summary. Audit trail. Template: [`docs/dev/templates/persona-review-template.md`](templates/persona-review-template.md).

## Rule 18 — PII redaction discipline (R-T1)

Any audit-log, telemetry event, error log, or Sentry trace MUST redact PII before persistence. Raw IP + User-Agent + email + operator name go through SHA-256 hashing OR a redaction sentinel (`[REDACTED]`) at the writer side. Raw PII stays only in HMAC-chain log files under filesystem-restricted permissions. NEVER ship a predicate / event / log carrying unhashed PII to Rekor / Sentry / external observability.

If a new audit event adds a PII-carrying field: add the redaction at the call site + a unit test pinning the redaction + cite R-T1 in the inline comment.

---

## Enforcement points

| Layer | File | Enforces |
|---|---|---|
| Agent-local mirror | `CLAUDE.md` (gitignored) | AI agents read on every session |
| Tracked canonical | `docs/dev/MANDATORY-DEV-RULES.md` (this file) | Source of truth; survives clone |
| Contributor guide | `CONTRIBUTING.md` (tracked) | Human devs |
| PR-time gate | `.github/pull_request_template.md` (tracked) | Every GitHub PR |
| Per-PR checklist | `docs/dev/templates/pr-checklist.md` (tracked) | Copy into / link from PR body |
| Per-task checklist | `docs/dev/templates/task-checklist.md` (tracked) | Create per task (Rule 1) |

## Templates (tracked, `docs/dev/templates/`)

- [`task-checklist.md`](templates/task-checklist.md) — per-task working checklist (Rule 1)
- [`story-template.md`](templates/story-template.md) — story format with Definition of Done
- [`pr-checklist.md`](templates/pr-checklist.md) — full Rule 1-18 attestation with evidence fields
- [`persona-review-template.md`](templates/persona-review-template.md) — Rule 6 + 17 persona output capture
- [`handover-template.md`](templates/handover-template.md) — Rule 8 handover prompt

---

*Founder-locked 2026-05-27. To amend: founder fire required. Changes here propagate to `CLAUDE.md` mirror + `CONTRIBUTING.md` reference.*
