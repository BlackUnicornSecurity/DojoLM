# Security Test Plan

This plan is subordinate to [../QA/QA-MASTER-PLAN.md](../QA/QA-MASTER-PLAN.md) and covers the security-specific branch of the overall QA workflow.

Use these current documents for security-oriented test work:

- [../QA/security/README.md](../QA/security/README.md)
- [../QA/security/audit-results/](../QA/security/audit-results/)
- [../../security/procedures/SECURITY-TESTING.md](../../security/procedures/SECURITY-TESTING.md)

## Environment Requirement

**Security regression tests must run against production** (`https://dojo.bucc.internal`) whenever auth, CORS, origin-trust, rate-limit, or header-security changes are in scope. Local-dev testing alone is insufficient because:

- Caddy reverse proxy headers (HSTS, CSP, X-Frame-Options) are only present in production.
- CORS origin enforcement depends on the production `TPI_CORS_ORIGINS` value.
- Rate-limiting behavior under real proxy fan-out differs from localhost.
- TLS certificate and `Sec-Fetch-*` header behavior only applies over HTTPS.

## Minimum Security Branch Checks — Local Dev

- For auth, CORS, origin-trust, and rate-limit changes, verify both deny-path and allow-path behavior.
- Confirm protected routes reject unauthenticated, spoofed-origin, or malformed requests.
- Confirm explicit public browser-readable `GET` routes still support the UI journeys that rely on them.
- Confirm browser fan-out during normal page load does not cause self-inflicted `429` failures on intended read paths.

## Minimum Security Branch Checks — Production

All local-dev checks above, plus:

- Verify HTTPS is enforced (HTTP redirects to HTTPS or is refused).
- Verify security headers in Caddy response: `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`.
- Verify CORS preflight (`OPTIONS`) returns correct `Access-Control-Allow-Origin` matching `TPI_CORS_ORIGINS`.
- Verify `Sec-Fetch-Site` handling behaves correctly over real HTTPS (browser-only header, not spoofable in browser context).
- Verify rate-limit counters reset correctly under production proxy (not persisted across container restarts unless intended).
- Verify container logs show no auth bypass or unexpected 5xx errors.
- Verify unsupported methods such as `TRACE` fail closed with `405` or `403`, not an unexplained `500`.
- Verify SSRF policy is explicit for provider onboarding: private or internal hosts stay deny-by-default unless an approved allowlist exists for trusted internal targets.

## Security Blindspot Guardrails

- Treat auth, CORS, origin, and header checks as the baseline only. Also review model-safety, tool-execution, streamed output, export/download, report generation, and storage-write paths whenever they change.
- Public browser-readable `GET` routes are allowlisted scope. Every other read path should be treated as deny-by-default until explicitly documented.
- For LLM, Sensei, adversarial, scanner, and admin-validation work, verify prompt, tool, or input abuse cannot trigger privileged side effects, unbounded streaming, unintended writes, or hidden data exposure.
- When a route writes storage or emits reports, evidence, exports, or audit history, verify unauthorized and malformed requests cannot create or mutate persistent artifacts.
- QA matrix risk tags are heuristic triage signals. Security sign-off still requires route- and behavior-specific checks for the changed surface.
- If a security-correct deny rule blocks an intended operational workflow, record whether that is an accepted policy, an allowlist gap, or a product bug. Do not rely on ad hoc out-of-band workarounds such as direct container file injection without documenting the policy decision.
- Treat unexpected `5xx` responses to malformed or unsupported requests as security-signoff blockers until explained, even when the route is otherwise protected.

```bash
# Security header spot check
curl -skI https://dojo.bucc.internal/ | grep -iE 'strict-transport|x-frame|x-content-type|content-security'

# CORS preflight
curl -sk -X OPTIONS -H "Origin: https://evil.com" -H "Access-Control-Request-Method: POST" \
  https://dojo.bucc.internal/api/stats -D - -o /dev/null | grep -i 'access-control'

# Protected route (expect 401/403)
curl -sk -o /dev/null -w '%{http_code}\n' https://dojo.bucc.internal/api/admin/settings

# Public read route (expect 200)
curl -sk -o /dev/null -w '%{http_code}\n' https://dojo.bucc.internal/api/stats
```

## Evidence

- Record the security artifact in `team/testing/QA/security/audit-results/` and the paired execution summary in `team/testing/QA/QA-Log/`.
- Label each artifact with the target environment (local-dev or production).
- For production security tests, include the curl output or Playwright trace as evidence.
