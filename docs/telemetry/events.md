# Telemetry event taxonomy (Wave 0 Track E.1)

**Status:** draft — pending stakeholder sink decision.
**Last updated:** 2026-04-18

This document defines the telemetry event vocabulary for the DojoLM web app.
Events are emitted from user-facing components and API routes to answer
three questions:

1. **What do users actually use?** — feature usage and drop-off.
2. **What breaks?** — client/server errors with enough detail to triage.
3. **Are we shipping preview surfaces in production by accident?** — guard
   rail for Wave 0 feature-maturity flags.

## Event registry

| Event | When | Required props | Optional props | Sink |
|---|---|---|---|---|
| `feature_used` | User interacts with a first-class module action | `module_id` (from `NAV_ITEMS`), `action` (verb like `submit`, `scan`, `export`) | `latency_ms`, `outcome` (`success` | `empty` | `partial`) | metrics |
| `feature_error` | Any client or server error surfaced to the user | `module_id`, `error_class` (network / validation / auth / internal), `error_code` | `trace_id`, `route`, `stack_sha` | errors + metrics |
| `preview_clicked` | User clicks into a surface rendered in preview/partial mode | `module_id`, `mode` (`preview` or `partial`) | `source` (badge, inline link) | metrics |
| `mock_served` | API route resolves via a demo mock handler in production | `route`, `handler_name` | — | **alert** — should be zero in production |
| `api_auth_denied` | `withAuth` / `createApiHandler` rejects a request | `route`, `reason` (`no_session`, `insufficient_role`, `csrf_fail`, `rate_limited`) | `user_hash` | security audit + metrics |
| `doc_drift_detected` | `verify-doc-metrics.js` fails in CI | `metric` (`patterns`, `groups`, `categories`, `fixtures`), `documented`, `actual` | `commit_sha` | dev channel |

## Conventions

- **Names are `snake_case`**, verbs in past tense where applicable.
- **Props are flat** — no nested objects. Enables dashboards without
  deserialization.
- **PII-free** — no user names, emails, free-form text, or IP addresses.
  `user_hash` is a one-way HMAC of the user id + a per-deployment salt;
  safe to join across events within a single deployment, safe from
  cross-deployment correlation.
- **Errors always include both `error_class` and `error_code`** — class
  is for dashboards (5 buckets), code is for triage (free-form identifier).

## Sampling

- `feature_used` is sampled at 100% in staging, 10% in production.
- `feature_error` is always 100%.
- `mock_served` is always 100% (it should never fire in production; any
  sample reduction would mask real incidents).
- All other events are 100%.

## Sink decision (pending)

| Option | Pros | Cons |
|---|---|---|
| Grafana / Loki (self-hosted) | No vendor lock-in; self-hostable alongside the app | Requires dashboard + alerting work up-front |
| PostHog (cloud) | Product analytics out of the box; session replay | Vendor lock-in; PII handling caveats |
| OpenTelemetry + any backend | Portable; can swap backends | Needs a collector + backend decision anyway |

**Recommendation:** OpenTelemetry instrumentation with a Grafana/Loki
backend, self-hosted alongside the app. Keeps data on-prem and avoids a
new vendor dependency.

## Implementation sequence

1. Add `packages/dojolm-web/src/lib/telemetry/` with a minimal
   `emit(event, props)` surface.
2. Backend sink is pluggable — start with a `console.log` shim so events
   are visible in dev without infra.
3. Wire `feature_used` into top-of-funnel actions per module (one per
   module's primary CTA).
4. Wire `feature_error` into every `ErrorBoundary` and API route error
   handler.
5. Wire `mock_served` into the `isDemoMode()` branch in every route that
   has one.
6. Alert on `mock_served` in production (must be zero).

This document is informative. Enforcement lands in a follow-up PR once
the sink decision is signed off.
