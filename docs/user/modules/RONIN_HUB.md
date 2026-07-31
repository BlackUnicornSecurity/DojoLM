# Ronin Hub

Ronin Hub is the bug bounty research and submission management module.

## Current Tabs

- `Programs`
- `Submissions`
- `Planning`
- `Intelligence`

## Current State (Wave 4, 2026-04-19)

All four tabs are live end-to-end:

- `Programs` — curated program catalogue with per-browser subscriptions.
- `Submissions` — persisted server-side via `/api/ronin/submissions`.
- `Planning` — per-user plan storage + IDOR-audit-guarded DELETE (ADR-0015 Wave 2 + ADR-0021 Wave 3 + ADR-0042 Wave 4).
- `Intelligence` — CVE + AI Incident DB + CISA KEV + FIRST EPSS + MITRE ATLAS feeds ingest pipeline (ADR-0026 Wave 3 + ADR-0037 Wave 4), with cursored polling (ADR-0038 Wave 4) and a Poll-now + health banner UI (ADR-0033 Wave 4).

## Programs

Use `Programs` to:

- browse curated bug bounty programs
- search by name, company, tags, or OWASP AI mapping
- filter by platform
- filter by program status
- subscribe to programs locally in the browser

## Submissions

Use `Submissions` to:

- create new submission records
- track status changes
- review payouts and scores
- open submission detail views

## Planning

Use `Planning` to:

- draft and store per-user attack plans
- browse your own saved plans (strict per-user scoping: users never see another user's plans)

Cross-user DELETE attempts are detected and audited (ADR-0042 Wave 4). The victim's identity is never written to the audit row — only `foundElsewhere: true` metadata — so probe activity is observable without leaking ownership.

## Intelligence

Use `Intelligence` to browse the curated library of CVE + AI-incident entries ingested from upstream feeds.

### Poller health banner

A status banner sits above the library template with one of five states:

- `healthy` — the most recent poll cycle completed without per-source errors.
- `degraded` — at least one source errored; hover the source-error count to see the detail via the native `title` tooltip.
- `no-runs-yet` — the pipeline has never polled (fresh deploy, cursor not yet written).
- `disabled` — the `ronin.intel-ingest` feature flag is off (env var `RONIN_INTEL_INGEST_ENABLED` unset). The Poll-now button disables itself.
- `unknown` — transport failure or 5xx from the health endpoint.

The banner refreshes every 60s. The `Poll now` button triggers an immediate poll cycle and refreshes the library on completion. **Admin role is required** (ADR-0048 Wave 6) — non-admin users see an `admin role required` inline message; the attempt is audited as `INTEL_POLL_FORBIDDEN`.

### Sources

The ingest pipeline fans out to five adapters:

- **NVD** — National Vulnerability Database CVEs, cursored by `lastPublishedAt`.
- **AIID** — AI Incident Database entries.
- **CISA KEV** — Known Exploited Vulnerabilities.
- **FIRST EPSS** — Exploit Prediction Scoring System.
- **MITRE ATLAS** — Adversarial Threat Landscape for AI Systems.

Cursors persist at `<TPI_DATA_DIR>/ronin/intel-cursors.json` so each poll resumes from the last-seen publication timestamp instead of re-scanning full history.

## Data Behavior

- **Submissions** — persisted server-side via the authenticated
  `/api/ronin/submissions` route. Server enforces status / severity
  enums, sanitises HTML-sensitive characters in free-text fields, caps
  payouts, and returns the canonical record on save. Clearing browser
  storage no longer loses submissions.
- **Programs** — program subscriptions and filter preferences are held
  in local browser storage; clearing storage resets those preferences.

## Best Use Cases

- organizing AI bug bounty work
- keeping track of program scope and subscriptions
- documenting submission progress alongside the rest of the testing platform

## Related Docs

- [Common Workflows](../COMMON_WORKFLOWS.md)
- [Troubleshooting](../TROUBLESHOOTING.md)
