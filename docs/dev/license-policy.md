# License policy

## Project license — open-core, two outbound tiers

DojoLM is an **open-core** project. Source files carry a per-file SPDX identifier
that names their tier:

| Tier | License | SPDX id | What it covers |
|---|---|---|---|
| **Community core** | [Apache License 2.0](../../LICENSE) | `Apache-2.0` | the offense / scanner / attack tooling + shared substrate (the free red-team product) |
| **Enterprise** | [Business Source License 1.1](../../LICENSE-BUSL-1.1.txt) | `BUSL-1.1` | the governance / compliance / assurance tier — Onigaeshi WORM audit, the Bushido compliance book, Katana formal-validation evidence, advanced admin/RBAC; plus the future `dojolm-cloud` backend |
| **§9 protected** | MIT (unchanged) | `MIT` | the 11 Phase-3-A DO-NOT-TOUCH files (`.dojolm-section9-do-not-touch.txt`). MIT is Apache-compatible; these are never relicensed |

The Apache↔BUSL split is the OSS Release Program decision **D-5/D-6** (founder-fired
2026-06-11): Apache is fork-trivial to un-gate, so the gated enterprise capability
must be non-Apache. BUSL's **Change License is Apache-2.0** — enterprise files
convert to Apache on their Change Date (three years per release; see
`LICENSE-BUSL-1.1.txt`).

`dojolm-cloud` (the entitlement/ingest backend, not yet built) is **BUSL-1.1**.
Multi-tenant SaaS code, if ever built, is governed by `.dojolm-repo-boundary.yaml`
`saas_only_paths` and stays in a private commercial repo — see
[`docs/dev/repo-split-discipline.md`](repo-split-discipline.md). Public-repo code
MAY be reused in the private repo; the inverse is not permitted.

## SPDX headers — required + enforced

All source files (`.ts`, `.tsx`, `.js`, `.cjs`, `.mjs`, `.yaml`, `.yml`, `.sh`)
under `packages/`, `tools/`, and `scripts/` MUST carry an SPDX identifier in the
first 5 lines:

```typescript
// SPDX-License-Identifier: Apache-2.0
```

```yaml
# SPDX-License-Identifier: BUSL-1.1
```

```bash
#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
```

(For a file with a shebang the header goes on line 2; for a Next.js client
component the header is a comment above the `"use client"` directive.)

**Tooling (real, not aspirational):**

- `tools/spdx/license-map.mjs` — the single source of truth mapping each path to
  its tier. Loads the §9 list from `.dojolm-section9-do-not-touch.txt`.
- `npm run lint:spdx` (`tools/spdx/check-spdx.mjs`) — scans tracked source and
  fails (exit 1) on any file whose header does not match its tier. Use
  `--report` for a classification breakdown, `--staged` for the staged set.
- `npm run fix:spdx` (`tools/spdx/apply-spdx.mjs`) — idempotently inserts/retags
  the correct header (preserves shebangs + `"use client"`; never touches §9,
  deferred, or data-corpus files).
- The **`.husky/pre-commit` hook** runs `check-spdx --staged` (Layer 1b) on every
  commit, composing with the §9 Layer-0 guard.

Tool coverage: `npm run test:tools` (100% line/branch on the three SPDX tools).

**Exceptions (not stamped):**

- Generated files (`*.generated.*`, `next-env.d.ts`, `dist/`, `.next/`) — exempt.
- Data / fixture corpora (`packages/bu-tpi/fixtures/**`, and the like) — these are
  data, not code, and are off-limits to hand edits (the armory katana ISO-17025
  gate). Never stamped.
- Vendored third-party code retains its original header — do NOT replace.
- §9 files keep their MIT headers (`check-spdx` reports them skip-with-reason).
- Files G-7/G-8 will rework (the bushido page cluster) are deferred to **P3.1b**.
- Out-of-P3.1a-scope trees (`deploy/`, `.github/`, `docs/`, `team/`, root configs)
  are not yet stamped; their headers land with P3.6 / P4 / P5.

## Spec-repo licenses

Separate spec repos have distinct licenses per foundation-track norm:

- `github.com/BlackUnicornSecurity/eval-predicate`: **Apache-2.0** for the schema
  code + **CC-BY-4.0** for the spec text.
- `github.com/dojolm-spec/crosswalk`: **CC-BY-4.0** with a DOI per revision via
  Zenodo.

## Third-party dependencies (inbound)

- Runtime npm dependencies must be MIT, Apache-2.0, BSD, MPL-2.0, ISC, or 0BSD.
  Copyleft / source-available licenses (GPL, AGPL, **BUSL**, SSPL) on an *inbound*
  dependency require maintainer approval and may force vendoring. (DojoLM's own
  *outbound* BUSL on the enterprise tier is unrelated to this inbound rule.)
- License + SBOM check per Mandatory Dev Rule 16 (`npm run sbom:generate` +
  `sbom:check-pins`). A dedicated `npm-license-checker` gate is a candidate
  pre-commit addition; for now, manual review.

## Trademark

"DojoLM" and "BlackUnicorn" are trademarks of BlackUnicorn Security. Trademark
rights are NOT granted by the Apache License (see `LICENSE` §6) or the BUSL.
Contact info@blackunicorn.tech for trademark use.

## Patent

The community core is Apache-2.0, which includes an **explicit patent grant**
(§3) — this is the main reason the community tier moved from MIT to Apache
(MIT has no explicit patent grant). The predicate spec repo is Apache-2.0 for the
same reason. BUSL-licensed enterprise files convert to Apache-2.0 (with its patent
grant) on their Change Date.

## License transition history

| Date | From | To | Reason | Record |
|---|---|---|---|---|
| 2025 (project start) | (none) | DojoLM Research-Only v1.1 (March 2026) | Initial license | [`docs/legal/LICENSE-archive-research-only-v1.1.md`](../legal/LICENSE-archive-research-only-v1.1.md) |
| 2026-05-23 | DojoLM Research-Only v1.1 | MIT | Master plan v1.0 Stage 0 (E0-LICENSE) — OSI-approved permissive license for the foundation track | [`docs/legal/license-transition-consents.md`](../legal/license-transition-consents.md) |
| 2026-06-11 | MIT | Apache-2.0 (community) + BUSL-1.1 (enterprise) | OSS Release Program D-5/D-6 — open-core: Apache adds a patent grant + is the BUSL Change License; BUSL gates the enterprise governance tier (Apache is fork-trivial to un-gate) | [`docs/legal/license-transition-consents-2026-06-11-apache-busl.md`](../legal/license-transition-consents-2026-06-11-apache-busl.md) |

> Counsel sign-off on the Apache/BUSL transition (or an explicit founder
> self-counsel-assessed waiver) is required **before the first public release
> (P7)**, mirroring the MIT-transition precedent — not before internal P3.1a work.
