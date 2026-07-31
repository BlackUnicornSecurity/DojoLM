# Contributing to DojoLM

DojoLM is the AI adversarial-evaluation platform. We welcome contributions from security researchers, ML/AI engineers, compliance professionals, and anyone curious about cryptographically-provable AI evaluation.

This document covers contribution mechanics. For the architecture, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Sign-off (DCO)

All commits must be signed off under the Developer Certificate of Origin (DCO). Add the `-s` flag when committing:

```bash
git commit -s -m "feat(scope): description"
```

This adds a `Signed-off-by: Your Name <your@email>` trailer. It certifies that you have the right to submit the contribution under the project's licenses (see [License](#license) below).

DCO sign-off is the same lightweight model used by Linux, Sigstore, OpenSSF Model Signing, and most CNCF projects. No CLA bot, no per-contribution form.

## Commit format

Follow [Conventional Commits](https://www.conventionalcommits.org/) with scope:

```
<type>(<scope>): <subject>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`, `build`, `style`.

Scope: epic ID (e.g., `e1-a-rb-1`), foundation area (`rbac`, `flags`), or package (`web`, `scanner`, `mcp`).

Examples:

```
feat(e1-a-rb-2): wire OWASP LLM01 probe set to Kokugikan store
fix(bushido): reject self-approval in sign-off ledger
docs(architecture): ADR-0NNN framework-id bridge
```

## Repository structure

This is the **public OSS substrate** repository. Per the repo-split discipline ([`docs/dev/repo-split-discipline.md`](docs/dev/repo-split-discipline.md)):

- **github-public OSS (this repo):** Sigstore-based audit-logger · `dojolm.eval/v1` predicate schema · verifier CLI · module functional cores (Atemi, Buki, Jutsu, Ronin, Hattori, Kotoba, Mitsuke, Amaterasu, Kagami, Onigaeshi, Bushido sign-off ritual code) · BAISS checklist · open framework definitions · Yamabushi scanner · self-hosted admin UI · docs.
- **github-private SaaS:** Multi-tenant routing · per-customer deploy automation · billing · customer admin portal · M-7 paid-curator infra · sales pipeline · commercial deploy templates.

**Hard rule:** nothing SaaS-related lands on the public branch. The pre-commit hook + PR-template checklist + GitHub branch protection enforce this. See [`docs/dev/repo-split-discipline.md`](docs/dev/repo-split-discipline.md).

## Working tree expectations

- Most planning and scratch documents live in `team/` which is gitignored. Do not commit anything to `team/` from a PR.
- File-size hints: 200-400 lines typical, 800 max. Prefer small, focused files.
- TypeScript: no `any` types except at FFI / network boundaries with documented reason.
- Tests: 80% coverage minimum on new code; unit + integration + E2E as appropriate.

## Mandatory dev rules (READ FIRST)

**Every coding task in this repo — AI agent or human — MUST follow the 18 mandatory dev rules in [`docs/dev/MANDATORY-DEV-RULES.md`](docs/dev/MANDATORY-DEV-RULES.md).** Founder-locked 2026-05-27. These supersede any default behavior. A PR that does not follow them is incomplete and cannot merge.

Summary of the gates each PR must pass (full detail + evidence fields in the rules doc):

1. **Context awareness** before any code (docs + task checklist + production code + V1 ref + canonical canvas + §9 DO-NOT-TOUCH check + worktree alignment + task restate).
2. **Doubt → history first** (lessonslearned + QA + memory + git log) before any new question.
3. **Documentation updated** before PR close (user + project + technical + master impl list + task checklist).
4. **100% test coverage evidenced** (not claimed) + edge cases + behavioral regressions + flow-level failures + auth gaps + local quality gate.
5. **Code audit** — lint + format + typecheck + dead-code scan, all clean on touched files.
6. **Multi-persona review** (dev + architect + adversarial + security) looping until CLEAN — MANDATORY.
7. **PR close + commit** only after 3-6 green.
8. **Handover prompt** at session/PR end + auto every 5 PRs.
9. **Subagent dispatch** FOREGROUND + status reported.
10-18. Rollback plan · performance budget · WCAG AA evidenced · cost guard · lessons-learned capture · stop conditions · dependency vet · subagent output persistence · PII redaction (R-T1).

Templates to use: [`docs/dev/templates/`](docs/dev/templates/) — task checklist, story, PR checklist, persona-review, handover.

The per-commit **Definition of Done** that operationalises these rules — the nine-phase process and the six-lens review loop (Rule 6, plus a conditional falsifiability lens when triggered) — is [`docs/dev/DA-KALITAS.md`](docs/dev/DA-KALITAS.md).

PR-time enforcement: [`.github/pull_request_template.md`](.github/pull_request_template.md) carries the Rule 1-18 attestation block.

## Quality gate

No CI gating (per `docs/dev/MANDATORY-DEV-RULES.md` Rule 4 — local quality gate). Merge on:

- Local typecheck green (`npm run typecheck`)
- Local vitest green (scoped to the area touched) — 100% coverage on touched files evidenced
- Multi-persona review CLEAN (Rule 6)
- All security findings addressed (no "fix later")
- DCO sign-off present
- Full `docs/dev/templates/pr-checklist.md` filled + linked in the PR body

The only GitHub Action enabled is the **repo-boundary scan** which runs as a PR-time check (not general CI) — it catches accidental SaaS-only-path commits per the public/private split.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). All participants in any forum (Issues, PRs, Slack, mailing lists) agree to abide by it.

## License

DojoLM is licensed per tier: the community core under **Apache-2.0** ([LICENSE](LICENSE)) and the enterprise governance tier under **BUSL-1.1** ([LICENSE-BUSL-1.1.txt](LICENSE-BUSL-1.1.txt)). Every source file carries an SPDX header stating its license (`npm run lint:spdx` enforces this). By contributing, you agree that your contribution is licensed under the license declared by the SPDX header of the file it lands in. See [`docs/dev/license-policy.md`](docs/dev/license-policy.md) for the tier map.

## Getting started

```bash
git clone https://github.com/blackunicornsecurity/dojolm.git
cd dojolm
npm install
npm run typecheck
npm test
```

For development, follow the relevant module's README (e.g., [`packages/bu-tpi/README.md`](packages/bu-tpi/README.md)).

## Issues and PRs

- **Bug reports:** use the bug-report issue template; include repro steps + observed/expected + environment.
- **Feature requests:** use the feature-request issue template.
- **Pull requests:** small, focused, one logical change per PR. Reference the related issue in the title or body. Use the PR template.
- **Security vulnerabilities:** see [SECURITY.md](SECURITY.md). Do NOT report via public issues.

## Reviewer expectations

We aim to triage new issues + PRs within 1 week. Maintainers are listed in [MAINTAINERS.md](MAINTAINERS.md) (TBD). For now, all PRs route to @SchenLong.

## Foundation track contributions

DojoLM engages with OpenSSF AI/ML Security WG · CSA AI Safety Initiative · NIST CAISI. Spec-related work happens at separate repos:

- Predicate schema: `github.com/BlackUnicornSecurity/eval-predicate` (Apache-2.0 code + CC-BY-4.0 spec)
- Crosswalk dataset: `github.com/dojolm-spec/crosswalk` (CC-BY-4.0)

If you want to contribute to the spec drafts, see the README in the relevant spec repo.
